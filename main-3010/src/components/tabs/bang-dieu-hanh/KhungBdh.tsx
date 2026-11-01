// Khung + mảnh dựng chung cho các mục Bảng điều hành trình bày theo 8 nguyên tắc (KE-HOACH/37, Mr. Đại duyệt 28/10/2026):
// một độ đậm (không dùng đậm/nghiêng) · không gạch đầu dòng · số đứng trên, nhãn viết hoa nhỏ đứng dưới · danh sách là bảng
// · số ngày quá hạn vẽ thanh ngắn màu theo ngưỡng · không ghi mã · chưa có số thì một ô mờ · nguồn một dòng cuối khung.

import type { ReactNode } from "react";

export const NHAN_NHO = "text-[10.5px] uppercase tracking-[0.07em] text-text-muted";

/** Khung một mục: tiêu đề cỡ 15 một độ đậm, nguồn ở dòng cuối */
export function Khung({ tieuDe, phu, nguon, children }: { tieuDe: string; phu?: ReactNode; nguon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded border border-border bg-surface p-4" aria-label={tieuDe}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-normal text-text">{tieuDe}</h2>
        {phu ? <span className="text-[12px] text-text-muted">{phu}</span> : null}
      </div>
      <div className="mt-3">{children}</div>
      {nguon ? <div className="mt-3 text-[11.5px] text-text-muted">{nguon}</div> : null}
    </section>
  );
}

/** Số lớn đứng trên, nhãn nhỏ viết hoa đứng dưới */
export function SoLon({ so, nhan, donVi, mo }: { so: ReactNode; nhan: string; donVi?: string | null; mo?: boolean }) {
  return (
    <div className="min-w-0">
      <div className={`text-[26px] leading-tight tabular-nums ${mo ? "text-text-muted" : "text-text"}`}>
        {so}
        {donVi ? <span className="ml-1 text-[12px] text-text-muted">{donVi}</span> : null}
      </div>
      <div className={`mt-0.5 ${NHAN_NHO}`}>{nhan}</div>
    </div>
  );
}

/**
 * Thanh ngắn thể hiện số ngày quá hạn. Ngưỡng đã chốt (cùng báo cáo sáng 25/10): xanh dưới 7 ngày · vàng 7–29 · đỏ từ 30.
 * Chữ số ngày đứng cạnh thanh — màu không là kênh duy nhất (luật 18).
 */
export function ThanhQuaHan({ ngay }: { ngay: number | null }) {
  if (ngay === null || ngay <= 0) return <span className="text-text-muted">chưa quá hạn</span>;
  const mau = ngay >= 30 ? "bg-red" : ngay >= 7 ? "bg-yellow" : "bg-green";
  const rong = Math.max(6, Math.min(100, (ngay / 90) * 100));
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="inline-block h-[6px] w-24 bg-border-light">
        <span className={`block h-full ${mau}`} style={{ width: `${rong}%` }} />
      </span>
      <span className="tabular-nums text-text">{ngay.toLocaleString("vi-VN")} ngày</span>
    </span>
  );
}
