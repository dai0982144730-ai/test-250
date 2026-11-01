// ============================================================
// kiem-tra/phan-giai.ts — PHÂN GIẢI TÊN trong báo cáo thành đơn vị / người (CHỈ SERVER).
// Khớp theo tên, tên ngắn, mã đơn vị; tên, email, chức vụ của người dùng. Không phân biệt dấu, hoa thường.
// "Phòng ĐT&PC" ↔ "P.ĐT&PC", "NM" ↔ "Nhà máy"; tên rút gọn khớp nếu mọi chữ nằm trong đúng MỘT đơn vị.
// ============================================================
import type { Q } from "@/lib/db";
import type { PhuTrach } from "@/lib/types";
import { chuanHoaTen, tachTen } from "./chuan-hoa";

export interface MucDanhBa {
  loai: "nguoi" | "don_vi";
  id: string;
  ten: string;
  don_vi_id: string | null; // người: đơn vị chính; đơn vị: chính nó
  khoa: string[]; // các dạng đã chuẩn hóa
}

export interface DanhBa {
  don_vi: MucDanhBa[];
  nguoi: MucDanhBa[];
}

function bienThe(s: string): string[] {
  const c = chuanHoaTen(s);
  const kq = new Set([c]);
  const doi: [RegExp, string][] = [
    [/^p /, "phong "],
    [/^phong /, "p "],
    [/^nm /, "nha may "],
    [/^nha may /, "nm "],
    [/^nha may thuy dien /, "nm "],
    [/^nha may thuy dien /, "nha may "],
    [/^bqlda /, "ban quan ly du an "],
    [/^ban quan ly du an /, "bqlda "],
    // "NM. TĐ Nậm Xe" / "NMTĐ" / "NMĐG HL7": thủy điện, điện gió viết tắt (29/09 — đọc tên đơn vị trên mặt báo cáo)
    [/^nm td /, "nha may thuy dien "],
    [/^nmtd /, "nha may thuy dien "],
    [/^nm dg /, "nha may dien gio "],
    [/^nmdg /, "nha may dien gio "],
    [/^td /, "thuy dien "],
    [/^dg /, "dien gio "],
  ];
  // "&" viết nhiều kiểu: "Đầu tư & Pháp chế" = "Đầu tư và Pháp chế", "E&C" = "ENC", "TC&KT" = "TCKT"
  if (c.includes("&")) {
    for (const thay of [" va ", "n", ""]) kq.add(c.replace(/\s*&\s*/g, thay).replace(/\s+/g, " ").trim());
  }
  for (const x of Array.from(kq)) for (const [re, thay] of doi) if (re.test(x)) kq.add(x.replace(re, thay));
  return Array.from(kq).filter(Boolean);
}

export async function napDanhBa(q: Q): Promise<DanhBa> {
  const dv = await q.query<{ id: string; ten: string; ten_ngan: string }>(
    "SELECT id, ten, ten_ngan FROM identity.don_vi WHERE active ORDER BY thu_tu",
  );
  // Tên gọi khác khai ở Cài đặt (HL7, NMĐG HL8…) — đọc tên đơn vị trên mặt báo cáo (Mr. Đại chốt 29/09)
  const { layCauHinh } = await import("@/lib/cau-hinh/doc");
  const tenKhac = await layCauHinh(q, "ten_goi_khac_don_vi").catch(() => ({}) as Record<string, string[]>);
  const nd = await q.query<{ id: string; ten: string; email: string; chuc_vu: string | null; don_vi_id: string | null }>(
    "SELECT id, ten, email, chuc_vu, don_vi_id FROM identity.nguoi_dung WHERE active",
  );
  const demChucVu = new Map<string, number>();
  for (const n of nd.rows) if (n.chuc_vu) demChucVu.set(chuanHoaTen(n.chuc_vu), (demChucVu.get(chuanHoaTen(n.chuc_vu)) ?? 0) + 1);
  return {
    don_vi: dv.rows.map((d) => ({
      loai: "don_vi",
      id: d.id,
      ten: d.ten,
      don_vi_id: d.id,
      khoa: Array.from(new Set([...bienThe(d.ten), ...bienThe(d.ten_ngan), chuanHoaTen(d.id), ...(tenKhac[d.id] ?? []).flatMap(bienThe)])),
    })),
    nguoi: nd.rows.map((n) => ({
      loai: "nguoi",
      id: n.id,
      ten: n.ten,
      don_vi_id: n.don_vi_id,
      khoa: Array.from(
        new Set([
          chuanHoaTen(n.ten),
          chuanHoaTen(n.email),
          chuanHoaTen(n.id),
          chuanHoaTen(n.email.split("@")[0]),
          // chức vụ chỉ dùng làm khóa khi duy nhất (vd "Phó Tổng Giám đốc")
          ...(n.chuc_vu && demChucVu.get(chuanHoaTen(n.chuc_vu)) === 1 ? [chuanHoaTen(n.chuc_vu)] : []),
        ]),
      ),
    })),
  };
}

/** Tìm một tên trong danh bạ. chiDonVi = chỉ nhận đơn vị (dòng "Gửi:"). */
export function timTen(ten: string, db: DanhBa, chiDonVi = false): MucDanhBa | null {
  // "Phòng Đầu tư & Pháp chế — SCI Corp": bỏ phần đuôi sau gạch dài (tên công ty)
  const goc = ten.trim();
  const cat = goc.split(/\s+[—–]\s+|\s+-\s+/)[0].trim();
  if (cat && cat !== goc) return timTen1(goc, db, chiDonVi) ?? timTen1(cat, db, chiDonVi);
  return timTen1(goc, db, chiDonVi);
}

function timTen1(ten: string, db: DanhBa, chiDonVi: boolean): MucDanhBa | null {
  const bt = bienThe(ten);
  const khop = (ds: MucDanhBa[]) => ds.find((m) => m.khoa.some((k) => bt.includes(k)));
  const a = khop(db.don_vi) ?? (chiDonVi ? undefined : khop(db.nguoi));
  if (a) return a;
  // Rút gọn: mọi chữ của tên nằm trong khóa của đúng một mục
  const chu = chuanHoaTen(ten).split(" ").filter(Boolean);
  if (chu.length < 2) return null;
  const chua = (ds: MucDanhBa[]) =>
    ds.filter((m) => m.khoa.some((k) => {
      const tk = new Set(k.split(" "));
      return chu.every((c) => tk.has(c));
    }));
  const u = chua(db.don_vi);
  if (u.length === 1) return u[0];
  if (u.length > 1) return null;
  if (!chiDonVi) {
    const n = chua(db.nguoi);
    if (n.length === 1) return n[0];
  }
  // Ngược lại: tên có chứa trọn tên một đơn vị (vd "PGĐ Kỹ thuật SCI ENC" → SCI E&C)
  const coChu = new Set(bt.flatMap((b) => b.split(" ")));
  const chuaDv = db.don_vi.filter((m) => m.khoa.some((k) => {
    const tk = k.split(" ").filter(Boolean);
    return tk.length >= 2 && tk.every((c) => coChu.has(c));
  }));
  return chuaDv.length === 1 ? chuaDv[0] : null;
}

/** Phân giải ô "Người phụ trách" (nhiều tên cách nhau ; , +). */
export function phanGiaiPhuTrach(
  chuoi: string,
  db: DanhBa,
  noiDung?: string,
): { phu_trach: PhuTrach[]; khong_nhan_ra: string[] } {
  const phu_trach: PhuTrach[] = [];
  const khong_nhan_ra: string[] = [];
  // "BQLDA QT (P. ĐT&PC)": tên trong ngoặc cũng là người/đơn vị phụ trách
  const ten = tachTen(chuoi).flatMap((t) => {
    const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(t);
    return m ? [m[1], ...tachTen(m[2].replace(/\s*\/\s*/g, ";"))].map((x) => x.trim()).filter(Boolean) : [t];
  });
  for (const t of ten) {
    const m = timTen(t, db);
    if (!m) {
      khong_nhan_ra.push(t);
      continue;
    }
    if (phu_trach.some((p) => p.loai === m.loai && p.id === m.id)) continue;
    phu_trach.push({ loai: m.loai, id: m.id, ten: m.ten, ...(noiDung ? { noi_dung: noiDung } : {}) });
  }
  return { phu_trach, khong_nhan_ra };
}
