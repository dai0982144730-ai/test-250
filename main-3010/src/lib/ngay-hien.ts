/**
 * NGÀY HIỆN CHO NGƯỜI ĐỌC — LUÔN dd/mm/yyyy (Mr. Đại 04/10/2026: "các hiển thị ngày tháng luôn luôn phải theo cấu trúc
 * dd/mm/yyyy"; GD-8 05/09: mọi ngày đủ ngày/tháng/năm). Không dùng toLocaleString("vi-VN") cho ngày: nó ra "13:31:21 4/10/2026"
 * — giờ đứng trước, thiếu số 0. Giờ luôn tính theo giờ Việt Nam (máy chủ có thể chạy UTC).
 * Thuần — không đụng node:fs, dùng được cả máy chủ lẫn trình duyệt (luật 10). Một bản chép nguyên ở Main · Tiến độ ·
 * Hợp đồng · Pháp lý · Quan sát (bản gốc: Main — sửa ở đây rồi chép, luật 7).
 * Ngoại lệ giữ ISO: khuôn dẫn nguồn máy phải đọc ngược ("BC ngày <ISO> — …", lib/nguon/phan-tich.ts, luật 12/31).
 */

type VaoNgay = Date | string | number | null | undefined;

const KHUON = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Ho_Chi_Minh",
});

function phan(d: Date): Record<string, string> {
  const ra: Record<string, string> = {};
  for (const p of KHUON.formatToParts(d)) ra[p.type] = p.value;
  if (ra.hour === "24") ra.hour = "00";
  return ra;
}

function sangDate(v: VaoNgay): Date | null {
  if (v === null || v === undefined || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-10-04" | Date | "2026-10-04T06:31:00Z" → "04/10/2026". Chuỗi chỉ ngày (yyyy-mm-dd) giữ nguyên ngày, không đổi múi giờ. */
export function ngayVN(v: VaoNgay): string {
  if (typeof v === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = sangDate(v);
  if (!d) return "—";
  const p = phan(d);
  return `${p.day}/${p.month}/${p.year}`;
}

/** → "04/10/2026 13:31" theo giờ Việt Nam */
export function ngayGioVN(v: VaoNgay): string {
  const d = sangDate(v);
  if (!d) return "—";
  const p = phan(d);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`;
}

/**
 * Đổi mọi ngày ISO LẪN TRONG CÂU CHỮ sang dd/mm/yyyy — cho chữ đã ghi sẵn (sổ issue, lời giải thích máy ghép, chữ 🤖):
 * "Hạn: 2026-12-31" → "Hạn: 31/12/2026" · "2026-09-13 13:47" → "13/09/2026 13:47" · "2026-10-04T06:31:00Z" → giờ Việt Nam.
 * Không đụng mã dính gạch (HD-2026-09-01), tên tệp (…-2026-10-04.json), đường link (?ngay=2026-10-04), chuỗi dữ liệu
 * trong ngoặc kép ("ngay":"2026-10-04") và khuôn dẫn nguồn "BC ngày <ISO>".
 * Ngày gõ thiếu số 0 ("23/9/2026") cũng được bù thành "23/09/2026".
 */
export function ngayTrongChu(s: string | null | undefined): string {
  if (!s) return s ?? "";
  // (không dùng "nhìn ngược" (?<!…) — bản đích ES2017; nhóm 1 giữ ký tự đứng trước)
  return s.replace(
    /(^|[^\w/.\-])(\d{1,2})\/(\d{1,2})\/(\d{4})(?![\w/])/g,
    (toan: string, truoc: string, d: string, m: string, y: string) =>
      (d.length < 2 || m.length < 2) && +d >= 1 && +d <= 31 && +m >= 1 && +m <= 12
        ? `${truoc}${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`
        : toan
  ).replace(
    /(^|[^\w/.\-=&?#%"'])(\d{4})-(\d{2})-(\d{2})(?:([T ])(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?(?![\w\-])/g,
    (toan: string, truoc: string, y: string, m: string, d: string, ngan: string, gio: string, phut: string, vung: string, viTri: number, goc: string) => {
      const ngay = toan.slice(truoc.length);
      if (/BC (?:ngày|tuần) ?$/.test(goc.slice(Math.max(0, viTri - 8), viTri + truoc.length))) return toan; // khuôn dẫn nguồn — giữ
      if (vung) return truoc + ngayGioVN(ngay);
      return truoc + (ngan ? `${d}/${m}/${y} ${gio}:${phut}` : `${d}/${m}/${y}`);
    }
  );
}
