// ============================================================
// tra-cuu.ts — TRA ĐƠN VỊ / NGƯỜI theo tên người dùng gõ ("SCI E&C", "P.ĐT&PC", "anh Hùng").
// Dùng chung cho công cụ chat và cổng MCP (một định nghĩa — luật 7). Server-only (đọc CSDL).
// ============================================================

import type { Q } from "@/lib/db";
import type { DonVi } from "@/lib/types";

/** Bỏ dấu tiếng Việt + chữ thường + gọn ký tự — so khớp "dễ tính" */
export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Chỉ còn chữ + số (bỏ dấu cách, &, chấm) — "P.ĐT&PC" ≡ "pdtpc" ≡ "p dt pc" */
export function phang(s: string): string {
  return boDau(s).replace(/[^a-z0-9]+/g, "");
}

/** Cây đơn vị (đọc thẳng bảng nền identity.don_vi — chỉ đọc). */
export async function layCay(q: Q): Promise<DonVi[]> {
  const { rows } = await q.query<DonVi>(
    `SELECT id, ten, ten_ngan, cap, cha_id, loai, mau_ma, thu_tu, active
     FROM identity.don_vi WHERE active ORDER BY thu_tu, ten`,
  );
  return rows;
}

/** Bí danh hay gặp trong câu hỏi mà tên đơn vị không chứa sẵn */
const BI_DANH_DON_VI: Record<string, string[]> = {
  "ban-tgd": ["bantgd", "tgd", "bantonggiamdoc", "tonggiamdoc", "bgd"],
  "p-dtpc": ["dtpc", "phongdautu", "dautuvaphapche", "phongdtpc"],
  "p-ktvh": ["ktvh", "kinhtevavanhanh", "phongktvh"],
  "p-hcth": ["hcth", "hanhchinhtonghop", "phonghcth"],
  "p-tckt": ["tckt", "taichinhketoan", "ketoan", "phongtckt"],
  "sci-pmc": ["pmc", "scipmc"],
  "sci-enc": ["enc", "ec", "scienc", "sciec", "scie&c"],
  "bqlda-qt": ["bqlda", "bqldaqt", "quangtri", "bqldaquangtri", "huongviet"],
  "bqlda-lao": ["bqldalao", "lao", "vietlao", "congtyvietlao", "namkhian", "namneun", "namlan"],
  "nm-namxe": ["namxe", "nmnamxe", "nhamaynamxe", "thuydiennamxe"],
  "nm-cannan1": ["cannan1", "nmcannan1", "thuydiencannan1"],
  "nm-cannan2": ["cannan2", "nmcannan2", "thuydiencannan2"],
  "nm-namlum1": ["namlum1", "nmnamlum1", "thuydiennamlum1"],
  "nm-namlum2": ["namlum2", "nmnamlum2", "thuydiennamlum2"],
  "nm-huonglinh7": ["huonglinh7", "hl7", "nmhuonglinh7", "diengiohuonglinh7"],
  "nm-huonglinh8": ["huonglinh8", "hl8", "nmhuonglinh8", "diengiohuonglinh8"],
  // Ban điều hành tổng thầu (cấp 4): tên dự án trơn vẫn trỏ về BQLDA; "BĐH …", "tổng thầu …" mới trỏ về BĐH
  "bdh-huongviet": ["bdhhuongviet", "bandieuhanhhuongviet", "tongthauhuongviet"],
  "bdh-tanthanh": ["bdhtanthanh", "bandieuhanhtanthanh", "tongthautanthanh"],
  "bdh-batang1": ["bdhbatang1", "bandieuhanhbatang1", "tongthaubatang1"],
  "bdh-namkhian1": ["bdhnamkhian1", "bandieuhanhnamkhian1", "tongthaunamkhian1"],
  "bdh-namkhian2": ["bdhnamkhian2", "bandieuhanhnamkhian2", "tongthaunamkhian2"],
  "bdh-namkhian3": ["bdhnamkhian3", "bandieuhanhnamkhian3", "tongthaunamkhian3"],
  "bdh-namneun": ["bdhnamneunhaluu", "bandieuhanhnamneunhaluu", "tongthaunamneunhaluu"],
  "bdh-namlan1": ["bdhnamlan1", "bandieuhanhnamlan1", "tongthaunamlan1"],
  "bdh-namlan2": ["bdhnamlan2", "bandieuhanhnamlan2", "tongthaunamlan2"],
};

/** Tìm đơn vị theo mã / tên / tên ngắn / bí danh. null nếu không khớp. */
export function timDonVi(cay: DonVi[], hoi: string): DonVi | null {
  const s = hoi.trim();
  if (s === "") return null;
  const id = cay.find((d) => d.id === s.toLowerCase());
  if (id) return id;
  const p = phang(s);
  if (p === "") return null;
  const dung = cay.find((d) => phang(d.ten) === p || phang(d.ten_ngan) === p);
  if (dung) return dung;
  const bd = cay.find((d) => (BI_DANH_DON_VI[d.id] ?? []).some((b) => phang(b) === p));
  if (bd) return bd;
  // Chứa nhau: "phòng đt&pc" chứa "dtpc"
  const chua = cay.filter(
    (d) =>
      phang(d.ten).includes(p) ||
      (p.length >= 3 && (phang(d.ten_ngan).includes(p) || p.includes(phang(d.ten_ngan)))) ||
      (BI_DANH_DON_VI[d.id] ?? []).some((b) => p.includes(phang(b)) && phang(b).length >= 3),
  );
  return chua.length === 1 ? chua[0]! : null;
}

export interface NguoiGon {
  id: string;
  ten: string;
  email: string;
  don_vi_id: string | null;
}

/** Tìm người theo email / tên (bỏ dấu). Trả mọi người khớp (tối đa 10). */
export async function timNguoi(q: Q, hoi: string): Promise<NguoiGon[]> {
  const s = hoi.trim().toLowerCase();
  if (s === "") return [];
  const { rows } = await q.query<NguoiGon>(
    "SELECT id, ten, email, don_vi_id FROM identity.nguoi_dung WHERE active ORDER BY ten",
  );
  const dung = rows.filter((r) => r.id === s || r.email.toLowerCase() === s);
  if (dung.length > 0) return dung;
  const p = boDau(s).replace(/^(anh|chi|ong|ba|em|a\.|c\.)\s+/, "").trim();
  return rows
    .filter((r) => {
      const ten = boDau(r.ten);
      return ten === p || ten.includes(p) || ten.split(/\s+/).pop() === p || r.email.toLowerCase().startsWith(p);
    })
    .slice(0, 10);
}

/** Tên hiển thị của nhiều người một lần (id → tên). Không có thì giữ id. */
export async function tenNguoi(q: Q, ids: string[]): Promise<Record<string, string>> {
  const ds = Array.from(new Set(ids.filter((x) => x && !x.startsWith("agent:") && x !== "he-thong")));
  const ra: Record<string, string> = {};
  if (ds.length === 0) return ra;
  const { rows } = await q.query<{ id: string; ten: string }>(
    "SELECT id, ten FROM identity.nguoi_dung WHERE id = ANY($1)",
    [ds],
  );
  for (const r of rows) ra[r.id] = r.ten;
  return ra;
}
