// ============================================================
// ten-du-an-gan-trung.ts — MỘT DỰ ÁN KHÔNG HAI TÊN, chặn NGAY LÚC KHAI Ở MAIN (soát độc lập 03/10/2026 điểm 2). File THUẦN.
// ⚠ Hàm `duAnHaiTen` CHÉP Y HỆT từ 6-Agent-cong-viec/CodeSCICongViec/src/lib/cau-hinh/kiem-tra.ts — agent Công việc chạy
//   đúng luật này mỗi lượt kéo danh mục từ Main; Main lỏng hơn thì lượt kéo bị chặn mà người khai ở Main không biết.
//   Sửa một bên thì chép sang bên kia (test tests/unit/ten-du-an-gan-trung.test.ts giữ cùng bộ ví dụ).
// ============================================================

/**
 * MỘT DỰ ÁN KHÔNG ĐƯỢC CÓ HAI TÊN (Mr. Đại chốt 03/10/2026 — "Nam Khian 1" và "Nậm Khiên 1" từng là hai dòng của cùng một dự án):
 * hai dự án mà một tên (tên chính hoặc tên gọi khác) của bên này gần trùng một tên của bên kia — bỏ dấu, cùng các con số, lệch
 * không quá 2 chữ cái — thì chặn lưu, bảo gộp làm một và chuyển tên kia vào "tên gọi khác". Khác số (Nậm Mô 1 / Nậm Mô 2) không tính.
 */
export function duAnHaiTen(ds: { ten: string; ten_khac?: string[] }[]): string[] {
  const bo = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/^(du an|da|thuy dien|td|dien gio|dg|nmdg|nmtd|nha may)\s+/, "")
      .replace(/[^a-z0-9]+/g, "");
  const so = (s: string) => (s.match(/\d+/g) ?? []).join(",");
  const lech = (a: string, b: string) => {
    if (Math.abs(a.length - b.length) > 2) return 99;
    const d = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let truoc = d[0];
      d[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const t = d[j];
        d[j] = Math.min(d[j] + 1, d[j - 1] + 1, truoc + (a[i - 1] === b[j - 1] ? 0 : 1));
        truoc = t;
      }
    }
    return d[b.length];
  };
  const tenCua = ds.map((d) =>
    [d.ten, ...(d.ten_khac ?? [])].filter((x) => x?.trim()).map((x) => ({ goc: x.trim(), k: bo(x.trim()), s: so(x) })),
  );
  const loi: string[] = [];
  for (let i = 0; i < ds.length; i++)
    for (let j = i + 1; j < ds.length; j++) {
      const trung = tenCua[i].flatMap((a) => tenCua[j].filter((b) => a.k.length >= 5 && a.s === b.s && lech(a.k, b.k) <= 2).map((b) => [a.goc, b.goc]))[0];
      if (trung)
        loi.push(`Dự án "${ds[i].ten}" và "${ds[j].ten}" có tên gần trùng ("${trung[0]}" ~ "${trung[1]}") — nếu là một dự án thì gộp làm một dòng, chuyển tên kia vào "tên gọi khác"`);
    }
  return loi;
}
