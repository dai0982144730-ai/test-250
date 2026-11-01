"use client";
import type { ReactNode } from "react";
// Thanh tiến trình nộp báo cáo (Mr. Đại chốt 28/09): 5 khối dài dẹt bằng nhau nối bằng đường dòng chảy —
// 1 Nộp báo cáo → 2 Sửa lỗi → 3 Soát nội dung → 4 Duyệt vào kế hoạch → 5 Kết thúc & lưu.
// Khối đang làm PHÁT SÁNG (cùng kiểu khối 3D + vòng sáng của sơ đồ căn phòng) · đã xong: đặc, không sáng · chưa tới: mờ vừa phải.
// Khối là nút: bấm cuộn tới khung của bước đó; bước chưa tới thì mờ + không bấm được (luật 17).

export type TrangThaiBuoc = "xong" | "dang" | "cho";

export interface BuocNop {
  ten: string;
  /** Dòng phụ: tình trạng ngắn của bước (vd "2 chặn · 7 cảnh báo", "🤖 đang soát…") */
  phu: string;
  trang_thai: TrangThaiBuoc;
  /** id khung trên màn để cuộn tới */
  toi?: string;
  goiY?: string;
}

export function ThanhTienTrinhNop({ buoc, onChon }: { buoc: BuocNop[]; /** bấm khối: bung khối làm việc của bước đó */ onChon?: (i: number) => void }) {
  return (
    <nav className="tt-nop" aria-label="Tiến trình nộp báo cáo">
      {buoc.map((b, i) => (
        <div key={b.ten} className="tt-nop-o">
          {i > 0 ? <span className={`tt-nop-noi ${b.trang_thai === "cho" ? "cho" : b.trang_thai === "dang" ? "dang" : "xong"}`} aria-hidden /> : null}
          <button
            type="button"
            className={`tt-nop-buoc ${b.trang_thai}`}
            disabled={b.trang_thai === "cho"}
            aria-current={b.trang_thai === "dang" ? "step" : undefined}
            title={b.goiY}
            onClick={() => {
              onChon?.(i);
              if (b.toi) window.setTimeout(() => document.getElementById(b.toi!)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
            }}
          >
            <span className="ten">
              {b.trang_thai === "xong" ? "✓ " : ""}
              {i + 1} · {b.ten}
            </span>
            <span className="phu">{b.phu}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}

/**
 * Khối làm việc của MỘT bước (Mr. Đại chốt 29/09): tiêu đề đúng như thanh tiến trình "N · Tên" + dòng tình trạng;
 * các bước xếp dọc 1→5 trong MỘT khung (kiểu cột phải Sơ đồ tổ chức: đầu mục in hoa màu tiêu đề, dòng kẻ mảnh).
 * Bước đang làm mở sẵn, bước xong tự co — bấm tiêu đề để bung / co. Thân chỉ ẨN khi co (không gỡ) để lượt 🤖 không bị cắt.
 */
export function KhoiBuoc({
  so,
  b,
  mo,
  onBat,
  phai,
  children,
}: {
  so: number;
  b: BuocNop;
  mo: boolean;
  onBat: () => void;
  /** chữ / nút bên phải tiêu đề (tên file, "Duyệt tất cả"…) */
  phai?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={b.toi} className={`buoc-nop scroll-mt-2 ${b.trang_thai}${mo ? " mo" : ""}`}>
      <header className="buoc-dau">
        <button type="button" onClick={onBat} aria-expanded={mo}>
          <span className="mui">▸</span>
          <span className="ten">
            {b.trang_thai === "xong" ? <span className="xong">✓ </span> : null}
            {so} · {b.ten}
          </span>
          <span className="tt">{b.phu}</span>
        </button>
        {phai ? <div className="phai">{phai}</div> : null}
      </header>
      <div hidden={!mo} className="buoc-than">
        {children}
      </div>
    </section>
  );
}
