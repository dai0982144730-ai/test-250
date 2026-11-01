// ============================================================
// KẾT XUẤT BÁO CÁO THÁNG — Markdown và Excel  (server-only; bản Word đã gỡ 28/10/2026)
//
// Quy ước hiển thị lấy nguyên từ DAC-TA mục 5: Navy #003366 · Blue #1F5FA0 ·
// Light Blue #D5E8F7 · font Calibri · khối chữ ký 3 cột.
//
// ⭐ BẢN 2 — 13/10/2026 (KE-HOACH/22, Mr. Đại soi bản Word thật 15 trang):
//  · Bảng nhiều dự án: HÀNG tên dự án thay cho CỘT dự án, dự án nọ nối dự án kia; số cộng của dự án nằm ngay
//    ở hàng tên dự án, có cột cộng được thì hàng TỔNG CỘNG đứng trên cùng (luật 34).
//  · Cột chưa có số nào thì KHÔNG in — gom tên về một dòng "Chưa có số liệu: …" dưới bảng (luật 22).
//  · KHÔNG in ghi chú thiết kế, cảnh báo kỹ thuật ("28/46 lượt hỏi…") — đó là chuyện của màn hình và của MD.
//  · Mức độ ghi bằng CHỮ (đỏ / vàng chỉ để nhấn); 🤖 in bằng font biểu tượng để không ra ô vuông.
//
// ⛔ Ô thiếu số liệu in "—", KHÔNG in 0. Bảng không có dòng nào vẫn in tên bảng kèm câu nói rõ vì sao.
// ⛔ Nội dung 🤖 giữ nguyên dấu — dấu nằm sẵn trong chuỗi từ `dongDauLlm`, ở đây không được cắt gọt.
//
// HẠN CHẾ ĐANG CÓ (nói thẳng để người sau không tưởng là đã xong):
//  · Bản DOCX dựng bằng thư viện `docx`, CHƯA nạp file mẫu Word của Ban làm file phong cách.
//  · Khối ◆ xu thế COD dự báo mới in thành một dòng chữ, chưa vẽ biểu đồ.
// ============================================================

import {
  CAU_GIAI_THICH_NGAY_ANH_HUONG,
  DAU_TRONG,
  hienO,
  moiBang,
  moTaNguonO,
  ngayAnhHuongNangNhat,
  nhanKyChu,
  trinhBayBang,
  type Bang,
  type BangIn,
  type BaoCaoThang,
  type CotBang,
  type HangIn,
  type KhoiThem,
} from "./model";
import { fmtSo, khoangNgay } from "@/lib/format";
import { khoangKy } from "@/lib/bao-cao-thang/model";
import { dungXlsx, type HangXlsx, type KhoiXlsx, type KieuCot as KieuCotXlsx } from "@/lib/xlsx-mau-cong-ty";

/** Biểu tượng: cặp thay thế (🤖 🔴 …) hoặc khối U+2600–27BF (⚠ ⛓ …), kèm dấu biến thể nếu có. Không dùng cờ `u` — bản đích ES5 */

function tenDuAnCua(bc: BaoCaoThang): (ma: string) => string {
  return (ma) => bc.duAn.find((d) => d.ma === ma)?.ten ?? ma;
}

/** Số cột đầu mà chữ của hàng (tên dự án / TỔNG CỘNG) chiếm: từ đầu tới hết cột khoá đầu tiên */
function soCotNhan(cot: CotBang[]): number {
  const i = cot.findIndex((c) => c.laKhoa);
  return i < 0 ? 1 : i + 1;
}

/** Chữ một ô của hàng thường (STT đánh lại theo từng dự án khi bảng in theo nhóm) */
function chuO(bay: BangIn, h: HangIn, c: CotBang): string {
  if (bay.nhom && c.tuSinh && c.khoa === "tt") return h.stt !== undefined ? String(h.stt) : "";
  const o = h.o[c.khoa];
  return o ? hienO(o) : DAU_TRONG;
}

/** Dòng "xu thế COD dự báo" của một dự án */
function chuXuThe(kt: KhoiThem): string {
  return kt.diem
    .map((p, i) => {
      const lech = i > 0 && p.giaTri !== 0 ? ` (${p.giaTri > 0 ? "lùi" : "sớm"} ${fmtSo(Math.abs(p.giaTri))} ngày so điểm đầu)` : "";
      return `${p.nhan}: ${p.chu ?? fmtSo(p.giaTri)}${lech}`;
    })
    .join("  ·  ");
}

// ─────────────────────────────────────────────────────────────
// Markdown
// ─────────────────────────────────────────────────────────────

function oMd(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function bangMd(b: Bang, tenDuAn: (ma: string) => string): string[] {
  const bay = trinhBayBang(b, tenDuAn);
  const d: string[] = [];
  d.push(`#### Bảng ${b.soHieu} — ${b.ten}`);
  d.push("");
  if (bay.hang.length > 0) {
    d.push(`| ${bay.cot.map((c) => oMd(c.nhan)).join(" | ")} |`);
    d.push(`| ${bay.cot.map(() => "---").join(" | ")} |`);
    const n = soCotNhan(bay.cot);
    for (const h of bay.hang) {
      if (h.kieu === "dem") {
        d.push(`| _${oMd(h.nhan ?? "")}_ |${" |".repeat(bay.cot.length - 1)}`);
      } else if (h.kieu === "du-an" || h.kieu === "tong-cong") {
        const sau = bay.cot.slice(n).map((c) => {
          const o = h.o[c.khoa];
          return o && o.coSo ? `**${oMd(hienO(o))}**` : "";
        });
        d.push(`| **${oMd(h.nhan ?? "")}** |${" |".repeat(n - 1)} ${sau.join(" | ")}${sau.length > 0 ? " |" : ""}`);
      } else {
        d.push(`| ${bay.cot.map((c) => oMd(chuO(bay, h, c))).join(" | ")} |`);
      }
    }
    d.push("");
  }
  if (b.lyDoTrong) d.push(`> ${DAU_TRONG} ${b.lyDoTrong}`);
  if (bay.cotAn.length > 0) d.push(`> Chưa có số liệu: ${bay.cotAn.join(" · ")}.`);
  for (const g of b.ghiChuDuoiBang) d.push(`> ${g}`);
  if (b.lyDoTrong || bay.cotAn.length > 0 || b.ghiChuDuoiBang.length > 0) d.push("");
  return d;
}

/**
 * Xuất Markdown. Dùng khi cần đọc nhanh hoặc so sánh hai bản nháp bằng `diff` —
 * DOCX là nhị phân nên không diff được, mà bản nháp báo cáo tháng thì rất hay
 * phải so "tháng này khác tháng trước chỗ nào".
 */
export function xuatMarkdown(bc: BaoCaoThang): string {
  const tenDuAn = tenDuAnCua(bc);
  const d: string[] = [];
  d.push(`# BÁO CÁO ${nhanKyChu(bc.ky).toUpperCase()} — BQLDA`);
  d.push("");
  d.push(`Kỳ: ${khoangKy(bc.ky, khoangNgay)} · ${bc.duAn.length} dự án`);
  d.push("");
  d.push("**BẢN NHÁP DO HỆ THỐNG DỰNG — người ký duyệt mới chốt.**");
  d.push("");

  if (bc.agentKhongHoiDuoc.length > 0) {
    d.push("## ⚠ Phần chưa lấy được dữ liệu");
    d.push("");
    for (const a of bc.agentKhongHoiDuoc) d.push(`- **${a.maAgent}**: ${a.lyDo}`);
    d.push("");
  }
  for (const c of bc.canhBao) d.push(`> ${c}`);
  if (bc.canhBao.length > 0) d.push("");

  d.push("## Đầu báo cáo");
  d.push("");
  for (const b of bc.dauBaoCao) d.push(...bangMd(b, tenDuAn));

  for (const m of bc.muc) {
    d.push(`## ${m.ma}. ${m.ten.toUpperCase()}`);
    d.push("");
    if (m.nhanXet) {
      d.push(m.nhanXet);
      d.push("");
    }
    for (const b of m.bang) {
      d.push(...bangMd(b, tenDuAn));
      if (b.ma === "B10") d.push(...tomTatNgayAnhHuong(b));
    }
    for (const kt of m.khoiThem ?? []) {
      d.push(`#### ${kt.ten}`);
      d.push("");
      d.push(kt.diem.length === 0 ? `${DAU_TRONG} ${kt.lyDoTrong ?? "Chưa có điểm nào."}` : `${chuXuThe(kt)} (${kt.diem.length}/6 tháng)`);
      d.push("");
    }
  }

  d.push("---");
  d.push("");
  d.push("| NGƯỜI LẬP | PHÓ GIÁM ĐỐC BAN | GIÁM ĐỐC BAN QLDA |");
  d.push("| --- | --- | --- |");
  d.push("| (Ký, ghi rõ họ tên) | (Ký, ghi rõ họ tên) | (Ký, đóng dấu) |");
  d.push("");
  d.push(`_Dựng lúc ${bc.thoiDiemDung || "(chưa ghi)"}_`);
  return d.join("\n");
}

/** Câu chốt số ngày ảnh hưởng — LẤY MAX, không cộng dồn (A.4 điều 4) */
function tomTatNgayAnhHuong(b: Bang): string[] {
  const o = ngayAnhHuongNangNhat(b);
  const cau = o
    ? `**Số ngày ảnh hưởng nặng nhất: ${hienO(o)}** (nguồn: ${moTaNguonO(o)}).`
    : `**Số ngày ảnh hưởng nặng nhất: ${DAU_TRONG}** — chưa dòng nào có số ngày dẫn được nguồn.`;
  return [cau, "", `> ${CAU_GIAI_THICH_NGAY_ANH_HUONG}`, ""];
}

/**
 * Danh sách mọi ô kèm nguồn — phụ lục truy vết cho bài nghiệm thu số 9
 * ("lấy 10 con số bất kỳ, cả 10 truy được về một lượt gọi cụ thể").
 */
export function xuatPhuLucNguon(bc: BaoCaoThang): string {
  const d: string[] = ["# Phụ lục — nguồn của từng ô", "", "| Bảng | Dòng | Cột | Giá trị | Nguồn |", "| --- | --- | --- | --- | --- |"];
  for (const b of moiBang(bc)) {
    for (const dong of b.dong) {
      for (const c of b.cot) {
        const o = dong.o[c.khoa];
        if (!o) continue;
        d.push(
          `| ${b.ma} | ${oMd(dong.khoa)} | ${oMd(c.khoa)} | ${oMd(hienO(o))} | ${oMd(moTaNguonO(o))} |`,
        );
      }
    }
  }
  return d.join("\n");
}

/** Bề rộng cột theo phần trăm: số thứ tự hẹp, cột số vừa, cột chữ khoá và cột 🤖 rộng */
function beRong(cot: CotBang[]): number[] {
  // Bảng từ 8 cột trở lên (bảng 8): cột khoá là MÃ ngắn, nhường chỗ cho cột chữ. Cột câu tiến độ của bảng 3 cần rộng.
  const nhieuCot = cot.length >= 8;
  const nang = cot.map((c) =>
    c.kieu === "stt"
      ? 4
      : c.laLlm
        ? 22
        : c.khoa === "tien_do"
          ? 34
          : c.laKhoa
            ? nhieuCot
              ? 14
              : c.khoa === "du_an"
                ? 22
                : 30
            : c.kieu === "chu"
              ? nhieuCot
                ? 18
                : 16
              : c.kieu === "ngay"
                ? // «08/10/2026» đủ chỗ đứng một dòng — đo 13/10: bề rộng 9 làm ngày dính sát chữ cột bên cạnh
                  12
                : 9,
  );
  const tong = nang.reduce((a, b) => a + b, 0);
  return nang.map((n) => Math.round((n / tong) * 1000) / 10);
}

// ─────────────────────────────────────────────────────────────
// XLSX — theo mẫu «Báo cáo hợp nhất trình TGĐ (Form 0)» (Mr. Đại 28/10/2026). Định dạng ở lib/xlsx-mau-cong-ty.ts.
// Nội dung giữ nguyên báo cáo tháng (6 mục · 11 bảng), cùng `trinhBayBang` với màn web nên đọc web thế nào thì xuất ra thế ấy.
// ─────────────────────────────────────────────────────────────

const KIEU_CAU: Record<string, KieuCotXlsx> = { stt: "stt", so: "so", tien: "tien", phan_tram: "phan_tram", ngay: "ngay" };

function bangXlsx(b: Bang, tenDuAn: (ma: string) => string): KhoiXlsx[] {
  const bay = trinhBayBang(b, tenDuAn);
  const ra: KhoiXlsx[] = [];
  const rong = beRong(bay.cot);
  const n = soCotNhan(bay.cot);
  const ghiChu: string[] = [];
  if (b.lyDoTrong) ghiChu.push(`${DAU_TRONG} ${b.lyDoTrong}`);
  if (bay.cotAn.length > 0) ghiChu.push(`Chưa có số liệu: ${bay.cotAn.join(" · ")}.`);
  for (const g of b.ghiChuDuoiBang) if (g !== CAU_GIAI_THICH_NGAY_ANH_HUONG) ghiChu.push(g);
  if (b.ma === "B10" && b.dong.some((d) => !d.laDongGiuCho)) {
    const o = ngayAnhHuongNangNhat(b);
    ghiChu.push(`Số ngày ảnh hưởng nặng nhất: ${o ? hienO(o) : DAU_TRONG}. ${CAU_GIAI_THICH_NGAY_ANH_HUONG}`);
  }
  if (bay.hang.length === 0) {
    ra.push({ loai: "chu", text: `Bảng ${b.soHieu} — ${b.ten}`, xam: false });
    for (const g of ghiChu) ra.push({ loai: "chu", text: g, xam: true });
    return ra;
  }
  ra.push({
    loai: "bang",
    tieuDe: `Bảng ${b.soHieu} — ${b.ten}`,
    cot: bay.cot.map((c, i) => ({ ten: c.laLlm ? `${c.nhan} 🤖` : c.nhan, trongSo: rong[i] ?? 10, kieu: KIEU_CAU[c.kieu] ?? "chu" })),
    hang: bay.hang.map((h): HangXlsx => {
      if (h.kieu === "dem") return { kieu: "chu", o: [h.nhan ?? ""] };
      if (h.kieu === "du-an" || h.kieu === "tong-cong") {
        const o = bay.cot.map((c, i) => (i === 0 ? (h.nhan ?? "") : i < n ? "" : h.o[c.khoa] && h.o[c.khoa]!.coSo ? hienO(h.o[c.khoa]!) : ""));
        return { kieu: h.kieu === "tong-cong" ? "tong" : "nhom", o, soCotNhan: n };
      }
      return { kieu: "thuong", o: bay.cot.map((c) => chuO(bay, h, c)) };
    }),
    ghiChu,
  });
  return ra;
}

/** Lấy giá trị một ô của bảng đầu báo cáo theo NHÃN cột (B1: Đơn vị lập · Nơi nhận …) — chưa có thì chuỗi rỗng */
function oDau(bc: BaoCaoThang, ma: string, nhan: string): string {
  const b = bc.dauBaoCao.find((x) => x.ma === ma);
  const c = b?.cot.find((x) => x.nhan === nhan);
  const o = c ? b?.dong[0]?.o[c.khoa] : undefined;
  return o && o.coSo ? String(o.giaTri) : "";
}

export async function xuatXlsx(bc: BaoCaoThang, phamVi?: string): Promise<Buffer> {
  const tenDuAn = tenDuAnCua(bc);
  const khoi: KhoiXlsx[] = [];
  if (bc.agentKhongHoiDuoc.length > 0) {
    khoi.push({ loai: "chu", text: `Phần chưa lấy được dữ liệu: ${bc.agentKhongHoiDuoc.map((a) => `${a.maAgent} — ${a.lyDo}`).join(" · ")}`, xam: true });
  }
  for (const m of bc.muc) {
    khoi.push({ loai: "muc", tieuDe: `${m.ma}. ${m.ten.toUpperCase()}` });
    if (m.nhanXet) khoi.push({ loai: "chu", text: m.nhanXet });
    for (const b of m.bang) khoi.push(...bangXlsx(b, tenDuAn));
    for (const kt of m.khoiThem ?? []) {
      khoi.push({ loai: "chu", text: kt.ten });
      khoi.push({ loai: "chu", text: kt.diem.length === 0 ? `${DAU_TRONG} ${kt.lyDoTrong ?? "Chưa có điểm nào."}` : `${chuXuThe(kt)} (${kt.diem.length}/6 tháng)`, xam: true });
    }
  }
  const nhan = oDau(bc, "B1", "Nơi nhận");
  return dungXlsx({
    tenSheet: nhanKyChu(bc.ky),
    tenBaoCao: `BÁO CÁO ${nhanKyChu(bc.ky).toUpperCase()} CỦA BQLDA`,
    tieuDePhu: nhan ? `TRÌNH ${nhan.toUpperCase()}` : "TRÌNH TỔNG GIÁM ĐỐC",
    gui: nhan || "Ban Tổng giám đốc",
    ky: `${nhanKyChu(bc.ky)} (${khoangKy(bc.ky, khoangNgay)}) · ${phamVi ?? `${bc.duAn.length} dự án`}`,
    khoi,
  });
}
