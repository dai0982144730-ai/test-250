// Kỹ năng AI: 5 kỹ năng hệ thống, kho chung/riêng, chặn zip-slip + zip-bomb (ky-nang.ts).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import AdmZip from "adm-zip";
import * as kn from "@/lib/skill/ky-nang";

// Thư mục dữ liệu tạm (duong-dan.ts đọc biến này lúc gọi, không phải lúc nạp module)
const tam = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-ai-kn-"));
process.env.DOCFLOW_AI_DATA = tam;

function skillMd(ten: string, moTa = "Kỹ năng thử cho test") {
  return `---\nname: ${ten}\ndescription: >-\n  ${moTa}\n---\n\n# ${ten}\n\nHướng dẫn.\n`;
}

function zipSkill(tep: Record<string, string | Buffer>, doiTen?: Record<string, string>): Buffer {
  const z = new AdmZip();
  for (const [ten, noi] of Object.entries(tep)) z.addFile(ten, Buffer.isBuffer(noi) ? noi : Buffer.from(noi, "utf8"));
  // AdmZip tự chuẩn hóa tên lúc addFile → đặt lại tên độc hại sau khi thêm (giả file .skill bị sửa tay)
  if (doiTen) for (const e of z.getEntries()) if (doiTen[e.entryName]) e.entryName = doiTen[e.entryName]!;
  return z.toBuffer();
}

describe("kỹ năng AI", () => {
  beforeAll(() => {
    fs.mkdirSync(tam, { recursive: true });
  });
  afterAll(() => {
    fs.rmSync(tam, { recursive: true, force: true });
  });

  it("liệt kê đủ 6 kỹ năng hệ thống, frontmatter đọc được, không xoá được", () => {
    const ds = kn.layDanhSach("hung.tv@scigroup.vn");
    const heThong = ds.filter((s) => s.nguon === "he-thong").map((s) => s.slug).sort();
    expect(heThong).toEqual(["hoi-so-cai", "kiem-tra-mau", "lam-bao-cao", "tom-tat", "tong-hop-bao-cao", "trich-cong-viec"]);
    for (const s of ds.filter((x) => x.nguon === "he-thong")) {
      expect(s.moTa.length).toBeGreaterThan(40);
      expect(s.phamVi).toBe("chung");
    }
    expect(() => kn.xoaSkill("hung.tv@scigroup.vn", "hoi-so-cai", "chung")).toThrow(/hệ thống/);
    expect(kn.docNoiDung("ai-do", "kiem-tra-mau")).toContain("Form 0");
  });

  it("mọi file SKILL.md trong skills-he-thong có name trùng tên thư mục", () => {
    const goc = path.join(process.cwd(), "skills-he-thong");
    for (const slug of kn.SKILL_HE_THONG) {
      const fm = kn.docFrontmatterSkillMd(fs.readFileSync(path.join(goc, slug, "SKILL.md"), "utf8"));
      expect(fm?.ten).toBe(slug);
    }
  });

  it("nạp .skill vào kho riêng rồi dùng được ngay; kho riêng người khác không thấy", () => {
    const buf = zipSkill({ "bao-cao-tuan/SKILL.md": skillMd("bao-cao-tuan"), "bao-cao-tuan/references/mau.md": "BC-02" });
    const kq = kn.luuTuZip("hung.tv@scigroup.vn", buf, "rieng");
    expect(kq.slug).toBe("bao-cao-tuan");
    expect(kn.layDanhSach("hung.tv@scigroup.vn").some((s) => s.slug === "bao-cao-tuan" && s.phamVi === "rieng")).toBe(true);
    expect(kn.layDanhSach("nv.dtpc@scigroup.vn").some((s) => s.slug === "bao-cao-tuan")).toBe(false);
    expect(kn.docNoiDung("hung.tv@scigroup.vn", "bao-cao-tuan")).toContain("name: bao-cao-tuan");
    // Xuất ngược ra .skill không mang theo _meta.json
    const ra = new AdmZip(kn.xuatRaZip("hung.tv@scigroup.vn", "bao-cao-tuan")).getEntries().map((e) => e.entryName);
    expect(ra.some((n) => n.endsWith("SKILL.md"))).toBe(true);
    expect(ra.some((n) => n.endsWith("_meta.json"))).toBe(false);
  });

  it("chặn zip-slip (đường dẫn ../ và tuyệt đối) — không ghi gì ra ngoài kho", () => {
    const thoat = zipSkill({ "ky-nang/SKILL.md": skillMd("ky-nang"), "ky-nang/x.txt": "độc" }, { "ky-nang/x.txt": "../../../thoat-ra.txt" });
    expect(() => kn.luuTuZip("hung.tv@scigroup.vn", thoat, "rieng")).toThrow(/thoát ra ngoài/);
    const tuyetDoi = zipSkill({ "ky-nang/SKILL.md": skillMd("ky-nang"), "ky-nang/y.txt": "độc" }, { "ky-nang/y.txt": "/etc/thoat.txt" });
    expect(() => kn.luuTuZip("hung.tv@scigroup.vn", tuyetDoi, "rieng")).toThrow(/tuyệt đối|thoát ra ngoài/);
    expect(fs.existsSync(path.join(tam, "thoat-ra.txt"))).toBe(false);
    expect(fs.existsSync(path.join(tam, "..", "thoat-ra.txt"))).toBe(false);
  });

  it("chặn zip-bomb (quá 20 MB sau giải nén) và zip quá nhiều file", () => {
    const to = Buffer.alloc(kn.DUNG_LUONG_SKILL_TOI_DA + 1024, 0x41); // nén rất nhỏ, bung ra > 20 MB
    const bom = zipSkill({ "bom/SKILL.md": skillMd("bom"), "bom/to.bin": to });
    expect(bom.length).toBeLessThan(1024 * 1024);
    expect(() => kn.luuTuZip("hung.tv@scigroup.vn", bom, "rieng")).toThrow(/vượt/);
    const nhieu: Record<string, string> = { "nhieu/SKILL.md": skillMd("nhieu") };
    for (let i = 0; i < kn.SO_FILE_SKILL_TOI_DA + 5; i++) nhieu[`nhieu/f${i}.txt`] = "x";
    expect(() => kn.luuTuZip("hung.tv@scigroup.vn", zipSkill(nhieu), "rieng")).toThrow(/quá/);
  });

  it("không cho nạp bản trùng tên kỹ năng hệ thống, thiếu frontmatter thì báo rõ", () => {
    const trung = zipSkill({ "hoi-so-cai/SKILL.md": skillMd("hoi-so-cai") });
    expect(() => kn.luuTuZip("hung.tv@scigroup.vn", trung, "chung")).toThrow(/hệ thống/);
    expect(() => kn.luuTuNoiDung("hung.tv@scigroup.vn", "# không có khai báo", "rieng")).toThrow(/frontmatter|khai báo/);
    const hai = zipSkill({ "a/SKILL.md": skillMd("a1"), "b/SKILL.md": skillMd("b1") });
    expect(() => kn.luuTuZip("hung.tv@scigroup.vn", hai, "rieng")).toThrow(/MỘT thư mục gốc/);
  });

  it("viết hướng dẫn ngay trên web → kho chung, ai cũng thấy", () => {
    const kq = kn.luuTuNoiDung("quantri@scigroup.vn", skillMd("nhac-viec", "Soạn tin nhắc người sắp trễ hạn"), "chung");
    expect(kq.slug).toBe("nhac-viec");
    expect(kn.layDanhSach("nv.enc@scigroup.vn").some((s) => s.slug === "nhac-viec" && s.phamVi === "chung")).toBe(true);
  });
});
