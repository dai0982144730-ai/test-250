// ============================================================
// dinh-kem/khoanh.ts — KHOANH CAM đúng dòng trong bản xem tài liệu gốc. MỘT chỗ duy nhất (luật 7), dùng cho hộp báo cáo gốc
// (HopBaoCaoGoc) và cửa sổ xem file (CuaSoXemTep — mọi chỗ gọi moXemTep). Mr. Đại chốt 02/10/2026: "người xem không thể đọc
// mấy trang A4 chỉ để tìm một hai dòng" — mở tài liệu gốc từ một dòng cụ thể thì phải khoanh đúng dòng đó và cuộn tới.
// Thuần (không React): nhận khung HTML đã vẽ + các câu cần tìm.
// ============================================================

/** Chuẩn hoá để so: bỏ khoảng trắng, chữ thường, NFC (Word hay tách chữ / thêm khoảng trắng lạ). */
export const chuanKhoanh = (s: string) => (s ?? "").normalize("NFC").replace(/[\s ]+/g, "").toLowerCase();

/** Các khoá để tìm một câu: 40 rồi 20 chữ đầu (bỏ số thứ tự đầu dòng), thêm một đoạn giữa cho câu dài. */
function khoaTu(t: string): string[] {
  const c = chuanKhoanh(t.replace(/^\s*(?:[\d.]+|[-–•+*])\s*[.)\-–:]?\s*/, ""));
  if (c.length < 4) return [];
  const ds = [c.slice(0, 40), c.slice(0, 20)];
  if (c.length > 30) ds.push(c.slice(10, 30));
  return [...new Set(ds)];
}

const DOAN = "p, li, td, th, h1, h2, h3, h4, h5, h6, div.dong-chu";

/**
 * Khoanh (class "khoanh") các dòng chứa từng câu trong `tim` — ưu tiên CẢ HÀNG bảng (tr nhỏ nhất chứa câu), không có thì đoạn văn.
 * Hàng bảng quá dài (bảng khung bọc cả trang) thì lấy đoạn văn. Cuộn tới dòng đầu tiên. Trả số dòng khoanh được (0 = không thấy).
 */
export function khoanhDong(goc: HTMLElement, tim: (string | null | undefined)[]): number {
  goc.querySelectorAll(".khoanh").forEach((e) => e.classList.remove("khoanh"));
  const hang = Array.from(goc.querySelectorAll("tr"));
  const doan = Array.from(goc.querySelectorAll(DOAN));
  const chu = new Map<Element, string>();
  const c = (e: Element) => {
    let v = chu.get(e);
    if (v === undefined) chu.set(e, (v = chuanKhoanh(e.textContent ?? "")));
    return v;
  };
  const nhoNhat = (ds: Element[], k: string) => ds.filter((e) => c(e).includes(k)).reduce<Element | undefined>((a, b) => (!a || c(b).length < c(a).length ? b : a), undefined);
  const da: Element[] = [];
  for (const t of tim) {
    if (!t?.trim()) continue;
    let thay: Element | undefined;
    for (const k of khoaTu(t)) {
      const h = nhoNhat(hang, k);
      const d = nhoNhat(doan, k);
      thay = h && (!d || c(h).length < 1500) ? h : d;
      if (thay) break;
    }
    if (thay && !da.includes(thay)) da.push(thay);
  }
  for (const e of da) e.classList.add("khoanh");
  da[0]?.scrollIntoView({ block: "center" });
  return da.length;
}
