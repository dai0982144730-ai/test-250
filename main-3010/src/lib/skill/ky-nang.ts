// ============================================================
// SKILL AI CỦA TÔI — kiểu Claude Cowork
// PORT TỪ BẢN CHẠY THẬT `SCIPhaply-github/phaply/lib/ky-nang.ts` (lệnh Mr. Đại
// 03/09: "dùng nó cho dự án này"). Demo view `v-skill` · LOI-DUNG-CHUNG mục 5.
//
// File `.skill` thực chất là ZIP có cấu trúc:
//   <ten-skill>/SKILL.md          (bắt buộc — frontmatter `name` + `description`)
//   <ten-skill>/references/*.md   (tuỳ chọn — tài liệu AI đọc thêm)
//   <ten-skill>/assets/*          (tuỳ chọn — bảng biểu, mẫu…)
//
// KHÁC BẢN GỐC hai chỗ, có chủ đích:
//   1. Prisma → QUÉT THƯ MỤC. QLDA chưa có CSDL; thư mục skill tự nó là sự
//      thật (SKILL.md chứa tên + mô tả), thêm một bảng metadata là thêm một
//      chỗ để hai nguồn lệch nhau (luật 7). Mỗi skill có `_meta.json` nhỏ ghi
//      nguồn nạp — CLI không đọc file này nên vô hại.
//   2. Thêm trường `pham_vi: chung | rieng` (LOI-DUNG-CHUNG mục 5 bổ sung):
//      kho CHUNG cả 5 agent thấy, kho RIÊNG theo từng tài khoản.
//
// Giữ NGUYÊN từ bản gốc (đã chạy thật, đừng sáng tác lại):
//   chặn zip-slip · chặn zip-bomb (20 MB sau giải nén, 200 file) · giải nén
//   vào thư mục TẠM rồi mới thay chỗ thật · slug bỏ dấu tiếng Việt.
// Server-only (fs).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import crypto from "node:crypto";
import AdmZip from "adm-zip";

/** Tổng dung lượng SAU GIẢI NÉN tối đa cho 1 skill — chặn zip-bomb. */
export const DUNG_LUONG_SKILL_TOI_DA = 20 * 1024 * 1024; // 20 MB
/** Số file tối đa trong 1 skill — chặn zip có hàng vạn entry rác. */
export const SO_FILE_SKILL_TOI_DA = 200;

export type PhamViSkill = "chung" | "rieng";

/**
 * Skill HỆ THỐNG — cài sẵn cho mọi tài khoản, không ai xoá được. Nội dung đóng
 * trong repo tại `skills-he-thong/<slug>/` nên deploy là có (đúng cách phaply
 * làm). Hai skill đầu tiên đúng bảng demo v-skill.
 */
export const SKILL_HE_THONG = [
  "soat-tien-do-dien-gio",
  "viet-bao-cao-tuan",
  // Ba skill XUẤT FILE — kèm scripts/ Python (Mr. Đại 03/09: "nâng cấp
  // docx/xls/dxf tốt hơn hết sức có thể"). Đã đo cả ba: xlsx công thức sống,
  // docx đủ 7 mục, dxf audit 0 lỗi.
  "xuat-tien-do-xlsx",
  "xuat-bao-cao-docx",
  "ve-mat-bang-dxf",
] as const;

/**
 * Skill có scripts/ cần chạy — CHỈ khi người GỌI ĐÍCH DANH các skill này thì
 * lượt chat mới được mở Bash/Write trong sandbox. Tự chọn (không gõ lệnh) thì
 * vẫn chỉ Skill + Read: xuất file phải là hành động chủ ý của người.
 */
export const SKILL_CO_SCRIPT: readonly string[] = [
  "xuat-tien-do-xlsx",
  "xuat-bao-cao-docx",
  "ve-mat-bang-dxf",
];

export interface KyNangTomTat {
  slug: string;
  ten: string;
  moTa: string;
  phamVi: PhamViSkill;
  /** "he-thong" | "tai-len" | "ai-viet" | "tu-soan" */
  nguon: string;
  soByte: number;
  /** ISO — lần sửa gần nhất của SKILL.md */
  capNhatLuc: string;
}

// ===========================================================================
// Đường dẫn — kho chung + kho riêng theo người, sandbox cho CLI
// ===========================================================================

function goc(): string {
  return path.join(gocDuLieu(), "skills");
}

/** Kho skill CHUNG — cả 5 agent (sau này) cùng thấy */
export function khoChung(): string {
  return path.join(goc(), "chung");
}

/** Kho skill RIÊNG của một người (khoá = phần trước @ của email, làm sạch) */
export function khoRieng(nguoiDung: string): string {
  return path.join(goc(), "rieng", lamSachSlug(nguoiDung) || "khach");
}

/**
 * Sandbox cho Claude CLI của một người: `<sandbox>/.claude/skills/` là nơi CLI
 * TỰ DÒ skill (cùng cơ chế Claude Cowork). Trước mỗi lượt gọi có skill, kho
 * chung + kho riêng được đồng bộ vào đây.
 */
export function sandboxNguoiDung(nguoiDung: string): string {
  return path.join(gocDuLieu(), "sandbox-ai", lamSachSlug(nguoiDung) || "khach");
}

export function thuMucSkillSandbox(nguoiDung: string): string {
  return path.join(sandboxNguoiDung(nguoiDung), ".claude", "skills");
}

function thuMucSkillHeThongGoc(slug: string): string {
  return path.join(process.cwd(), "skills-he-thong", slug);
}

// ===========================================================================
// Slug + frontmatter — GIỮ NGUYÊN bản phaply đã chạy thật
// ===========================================================================

/**
 * Chuẩn hoá `name` thành tên thư mục an toàn: chỉ chữ thường/số/gạch. Vừa là
 * quy ước đặt tên skill của Claude Code, vừa là lưới chặn path traversal.
 */
export function lamSachSlug(ten: string): string {
  return ten
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu tiếng Việt sau NFD
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/** Bóc `name` + `description` khỏi frontmatter YAML của SKILL.md. */
export function docFrontmatterSkillMd(text: string): { ten: string; moTa: string } | null {
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const dong = m[1].split(/\r?\n/);

  const layKhoa = (khoa: string): string => {
    for (let i = 0; i < dong.length; i++) {
      const kq = dong[i].match(new RegExp(`^${khoa}\\s*:\\s*(.*)$`, "i"));
      if (!kq) continue;
      let giaTri = kq[1].trim();
      // Dạng khối "description: >-" → gom các dòng thụt lề tiếp theo
      if (giaTri === ">" || giaTri === ">-" || giaTri === "|" || giaTri === "|-") {
        const phan: string[] = [];
        for (let j = i + 1; j < dong.length; j++) {
          if (!/^\s+\S/.test(dong[j])) {
            if (dong[j].trim() === "") continue;
            break;
          }
          phan.push(dong[j].trim());
        }
        giaTri = phan.join(" ");
      }
      return giaTri.replace(/^["']|["']$/g, "");
    }
    return "";
  };

  const ten = layKhoa("name");
  const moTa = layKhoa("description");
  if (!ten || !moTa) return null;
  return { ten, moTa };
}

export function laSkillHeThong(slug: string): boolean {
  return (SKILL_HE_THONG as readonly string[]).includes(slug);
}

// ===========================================================================
// Giải nén .skill — GIỮ NGUYÊN các lưới chặn của bản gốc
// ===========================================================================

function tinhDungLuongThuMuc(dir: string): number {
  let tong = 0;
  for (const ten of fs.readdirSync(dir)) {
    const p = path.join(dir, ten);
    const st = fs.statSync(p);
    tong += st.isDirectory() ? tinhDungLuongThuMuc(p) : st.size;
  }
  return tong;
}

/**
 * Kiểm tra + giải nén một file .skill vào thư mục đích.
 * Giải nén vào thư mục TẠM trước, kiểm xong mới thay chỗ thật — zip lỗi giữa
 * đường thì skill cũ vẫn nguyên.
 */
export function giaiNenSkillZip(
  thuMucKho: string,
  buffer: Buffer
): { slug: string; ten: string; moTa: string; soByte: number } {
  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new Error("File không đọc được — file .skill phải là gói ZIP hợp lệ.");
  }

  const entries = zip.getEntries();
  if (entries.length === 0) throw new Error("File .skill rỗng, không có nội dung nào.");
  if (entries.length > SO_FILE_SKILL_TOI_DA) {
    throw new Error(`File .skill chứa quá ${SO_FILE_SKILL_TOI_DA} mục — nghi ngờ không hợp lệ.`);
  }

  // Chặn zip-slip + xác định thư mục gốc
  const thuMucGoc = new Set<string>();
  let tongGiaiNen = 0;
  for (const e of entries) {
    const ten = e.entryName.replace(/\\/g, "/");
    if (ten.startsWith("/") || /^[a-zA-Z]:/.test(ten)) {
      throw new Error(`File .skill không hợp lệ: chứa đường dẫn tuyệt đối (${ten}).`);
    }
    const chuanHoa = path.posix.normalize(ten);
    if (chuanHoa.startsWith("../") || chuanHoa === ".." || chuanHoa.includes("/../")) {
      throw new Error(`File .skill không hợp lệ: chứa đường dẫn thoát ra ngoài (${ten}).`);
    }
    const phan = chuanHoa.split("/").filter(Boolean);
    if (phan.length === 0) continue;
    thuMucGoc.add(phan[0]);
    tongGiaiNen += e.header.size;
    if (tongGiaiNen > DUNG_LUONG_SKILL_TOI_DA) {
      throw new Error(
        `Skill sau giải nén vượt ${Math.round(DUNG_LUONG_SKILL_TOI_DA / 1024 / 1024)} MB.`
      );
    }
  }

  if (thuMucGoc.size !== 1) {
    throw new Error(
      `File .skill phải có đúng MỘT thư mục gốc chứa SKILL.md (đang thấy ${thuMucGoc.size}).`
    );
  }
  const tenGoc = Array.from(thuMucGoc)[0]!;

  const entrySkillMd = entries.find(
    (e) => e.entryName.replace(/\\/g, "/").toLowerCase() === `${tenGoc.toLowerCase()}/skill.md`
  );
  if (!entrySkillMd) throw new Error(`Không tìm thấy ${tenGoc}/SKILL.md trong file .skill.`);

  const frontmatter = docFrontmatterSkillMd(entrySkillMd.getData().toString("utf8"));
  if (!frontmatter) {
    throw new Error(
      "SKILL.md thiếu phần khai báo đầu file (frontmatter) hợp lệ — cần có cả `name:` và `description:`."
    );
  }

  const slug = lamSachSlug(frontmatter.ten) || lamSachSlug(tenGoc);
  if (!slug) throw new Error("Không xác định được tên thư mục skill từ `name:` trong SKILL.md.");

  fs.mkdirSync(thuMucKho, { recursive: true });
  const dichThat = path.join(thuMucKho, slug);
  const dichTam = path.join(thuMucKho, `${slug}.tam-${crypto.randomBytes(4).toString("hex")}`);

  try {
    zip.extractAllTo(dichTam, true);
    const trongTam = path.join(dichTam, tenGoc);
    if (
      !fs.existsSync(path.join(trongTam, "SKILL.md")) &&
      !fs.existsSync(path.join(trongTam, "skill.md"))
    ) {
      throw new Error("Giải nén xong nhưng không thấy SKILL.md ở đúng vị trí.");
    }
    const soByte = tinhDungLuongThuMuc(trongTam);
    if (soByte > DUNG_LUONG_SKILL_TOI_DA) {
      throw new Error(
        `Skill sau giải nén vượt ${Math.round(DUNG_LUONG_SKILL_TOI_DA / 1024 / 1024)} MB.`
      );
    }
    fs.rmSync(dichThat, { recursive: true, force: true });
    fs.renameSync(trongTam, dichThat);
    return { slug, ten: frontmatter.ten, moTa: frontmatter.moTa, soByte };
  } finally {
    fs.rmSync(dichTam, { recursive: true, force: true });
  }
}

// ===========================================================================
// Ghi / đọc / xoá / xuất
// ===========================================================================

function ghiMeta(thuMucSkill: string, nguon: string): void {
  try {
    fs.writeFileSync(
      path.join(thuMucSkill, "_meta.json"),
      JSON.stringify({ nguon, luc: new Date().toISOString() }),
      "utf8"
    );
  } catch {
    /* meta hỏng không chặn skill */
  }
}

function docMotSkill(thuMucKho: string, slug: string, phamVi: PhamViSkill): KyNangTomTat | null {
  const dir = path.join(thuMucKho, slug);
  const fMd = fs.existsSync(path.join(dir, "SKILL.md"))
    ? path.join(dir, "SKILL.md")
    : path.join(dir, "skill.md");
  if (!fs.existsSync(fMd)) return null;
  const fm = docFrontmatterSkillMd(fs.readFileSync(fMd, "utf8"));
  if (!fm) return null;
  let nguon = laSkillHeThong(slug) ? "he-thong" : "tu-soan";
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, "_meta.json"), "utf8")) as {
      nguon?: string;
    };
    if (meta.nguon) nguon = meta.nguon;
  } catch {
    /* không có meta thì dùng suy đoán trên */
  }
  return {
    slug,
    ten: fm.ten,
    moTa: fm.moTa,
    phamVi,
    nguon,
    soByte: tinhDungLuongThuMuc(dir),
    capNhatLuc: fs.statSync(fMd).mtime.toISOString(),
  };
}

function quetKho(thuMucKho: string, phamVi: PhamViSkill): KyNangTomTat[] {
  if (!fs.existsSync(thuMucKho)) return [];
  const ra: KyNangTomTat[] = [];
  for (const ten of fs.readdirSync(thuMucKho)) {
    if (ten.includes(".tam-")) continue;
    if (!fs.statSync(path.join(thuMucKho, ten)).isDirectory()) continue;
    const s = docMotSkill(thuMucKho, ten, phamVi);
    if (s) ra.push(s);
  }
  return ra;
}

/**
 * Cài / cập nhật skill hệ thống vào kho CHUNG — chạy mỗi lần mở màn Skill.
 * SKILL.md của repo mới hơn bản trong kho thì thay (đúng cách phaply làm).
 */
export function capNhatSkillHeThong(): void {
  for (const slug of SKILL_HE_THONG) {
    const nguonDir = thuMucSkillHeThongGoc(slug);
    if (!fs.existsSync(path.join(nguonDir, "SKILL.md"))) continue;
    const dich = path.join(khoChung(), slug);
    const mdNguon = path.join(nguonDir, "SKILL.md");
    const mdDich = path.join(dich, "SKILL.md");
    const canCap =
      !fs.existsSync(mdDich) ||
      fs.statSync(mdNguon).mtimeMs > fs.statSync(mdDich).mtimeMs;
    if (!canCap) continue;
    fs.rmSync(dich, { recursive: true, force: true });
    fs.cpSync(nguonDir, dich, { recursive: true });
    ghiMeta(dich, "he-thong");
  }
}

/** Danh sách skill một người thấy: kho chung + kho riêng của họ */
export function layDanhSach(nguoiDung: string): KyNangTomTat[] {
  capNhatSkillHeThong();
  return [...quetKho(khoChung(), "chung"), ...quetKho(khoRieng(nguoiDung), "rieng")].sort(
    (a, b) => a.slug.localeCompare(b.slug)
  );
}

/** Nạp skill từ file .skill (ghi đè nếu cùng slug trong cùng kho) */
export function luuTuZip(
  nguoiDung: string,
  buffer: Buffer,
  phamVi: PhamViSkill
): KyNangTomTat {
  const kho = phamVi === "chung" ? khoChung() : khoRieng(nguoiDung);
  const { slug, ten, moTa, soByte } = giaiNenSkillZip(kho, buffer);
  if (laSkillHeThong(slug)) {
    // Dọn bản vừa bung rồi báo — không cho đè skill hệ thống
    fs.rmSync(path.join(kho, slug), { recursive: true, force: true });
    throw new Error(
      `"${slug}" là skill hệ thống — không nạp bản trùng tên. Đổi \`name:\` trong SKILL.md rồi nạp lại.`
    );
  }
  ghiMeta(path.join(kho, slug), "tai-len");
  return {
    slug,
    ten,
    moTa,
    phamVi,
    nguon: "tai-len",
    soByte,
    capNhatLuc: new Date().toISOString(),
  };
}

/** Lưu skill từ nội dung SKILL.md gõ/dán tay (1 file, chưa có references) */
export function luuTuNoiDung(
  nguoiDung: string,
  noiDung: string,
  phamVi: PhamViSkill,
  nguon = "tu-soan"
): KyNangTomTat {
  const fm = docFrontmatterSkillMd(noiDung);
  if (!fm) {
    throw new Error(
      "Nội dung thiếu phần khai báo đầu file — cần frontmatter có `name:` và `description:`."
    );
  }
  const slug = lamSachSlug(fm.ten);
  if (!slug) throw new Error("Không tạo được tên thư mục skill từ `name:`.");
  if (laSkillHeThong(slug)) {
    throw new Error(`"${slug}" là skill hệ thống — đặt \`name:\` khác cho skill mới.`);
  }
  const kho = phamVi === "chung" ? khoChung() : khoRieng(nguoiDung);
  const dir = path.join(kho, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), noiDung, "utf8");
  ghiMeta(dir, nguon);
  return {
    slug,
    ten: fm.ten,
    moTa: fm.moTa,
    phamVi,
    nguon,
    soByte: Buffer.byteLength(noiDung, "utf8"),
    capNhatLuc: new Date().toISOString(),
  };
}

/** Đọc nguyên văn SKILL.md — cho người xem/sửa, và cho chat nạp khi gọi đích danh */
export function docNoiDung(nguoiDung: string, slug: string): string | null {
  const s = lamSachSlug(slug);
  if (!s) return null;
  for (const kho of [khoRieng(nguoiDung), khoChung()]) {
    for (const ten of ["SKILL.md", "skill.md"]) {
      const p = path.join(kho, s, ten);
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    }
  }
  return null;
}

export function xoaSkill(nguoiDung: string, slug: string, phamVi: PhamViSkill): void {
  const s = lamSachSlug(slug);
  if (!s) throw new Error("Tên skill không hợp lệ.");
  if (laSkillHeThong(s)) throw new Error("Skill hệ thống không xoá được.");
  const kho = phamVi === "chung" ? khoChung() : khoRieng(nguoiDung);
  const dir = path.join(kho, s);
  if (!fs.existsSync(dir)) throw new Error("Không tìm thấy skill này.");
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Xuất một skill ngược ra .skill (ZIP) để mang sang agent/máy khác */
export function xuatRaZip(nguoiDung: string, slug: string): Buffer {
  const s = lamSachSlug(slug);
  for (const kho of [khoRieng(nguoiDung), khoChung()]) {
    const dir = path.join(kho, s);
    if (!fs.existsSync(path.join(dir, "SKILL.md")) && !fs.existsSync(path.join(dir, "skill.md")))
      continue;
    const zip = new AdmZip();
    zip.addLocalFolder(dir, s, (p) => !p.endsWith("_meta.json"));
    return zip.toBuffer();
  }
  throw new Error("Không tìm thấy skill này.");
}

// ===========================================================================
// Sandbox cho CLI — đồng bộ kho vào `.claude/skills/` trước lượt gọi có skill
// ===========================================================================

/**
 * Gom kho chung + kho riêng của một người vào sandbox của họ để Claude CLI tự
 * dò. Trả về đường dẫn sandbox (đưa vào `cwd` khi spawn CLI).
 * Kho riêng đè kho chung khi trùng slug — skill của mình gần mình hơn.
 */
export function dongBoSandbox(nguoiDung: string): string {
  const dich = thuMucSkillSandbox(nguoiDung);
  fs.rmSync(dich, { recursive: true, force: true });
  fs.mkdirSync(dich, { recursive: true });
  for (const kho of [khoChung(), khoRieng(nguoiDung)]) {
    if (!fs.existsSync(kho)) continue;
    for (const ten of fs.readdirSync(kho)) {
      if (ten.includes(".tam-")) continue;
      const nguonDir = path.join(kho, ten);
      if (!fs.statSync(nguonDir).isDirectory()) continue;
      fs.rmSync(path.join(dich, ten), { recursive: true, force: true });
      fs.cpSync(nguonDir, path.join(dich, ten), { recursive: true });
    }
  }
  return sandboxNguoiDung(nguoiDung);
}
