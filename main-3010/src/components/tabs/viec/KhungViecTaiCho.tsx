"use client";

// ============================================================
// MỘT VIỆC BUNG TẠI CHỖ trong danh sách "Việc của tôi" (Mr. Đại chốt 07/10/2026 — thay popup PopupViecCV): bấm một việc → các
// việc khác tối nền đi, chi tiết việc bung NGAY TẠI CHỖ (đúng cách khu phải agent Công việc); bấm việc khác thì việc này thu lại.
// Thân chi tiết là ĐÚNG thẻ việc của agent Công việc (trang nhúng /nhung/viec/<mã>?tai_cho=1 — không viết lại thẻ ở đây, luật 7):
// trang nhúng báo chiều cao thật (sci-viec-cao) để khung cao vừa nội dung, báo "đã đổi" (sci-viec-doi) để danh sách tải lại khi
// thu, và "thu lại" (sci-viec-dong) khi người bấm vào tiêu đề việc trong khung.
// BẢN GỐC ở Main — chép nguyên sang Tiến độ · Hợp đồng.
// ============================================================

import { useEffect, useRef, useState } from "react";

export function KhungViecTaiCho({ goc, ma, onDong, onDoi }: { goc: string; ma: string; onDong: () => void; onDoi: () => void }) {
  const [cao, setCao] = useState(240);
  const daDoi = useRef(false);
  // Hàm của trang cha đổi mỗi lần vẽ — giữ trong ref để lắng nghe chỉ gắn MỘT lần cho mỗi việc (không thì dọn/gắn lại liên tục)
  const goiDoi = useRef(onDoi);
  goiDoi.current = onDoi;
  const goiDong = useRef(onDong);
  goiDong.current = onDong;

  useEffect(() => {
    const nghe = (e: MessageEvent) => {
      const d = e.data as { loai?: string; ma?: string; cao?: number } | null;
      if (!d || d.ma !== ma) return;
      if (d.loai === "sci-viec-cao" && typeof d.cao === "number" && d.cao > 0) setCao(Math.min(Math.ceil(d.cao), 2000));
      else if (d.loai === "sci-viec-doi") daDoi.current = true;
      else if (d.loai === "sci-viec-dong") goiDong.current();
    };
    window.addEventListener("message", nghe);
    return () => {
      window.removeEventListener("message", nghe);
      // Thu lại (bấm việc khác / bấm lại tiêu đề) mà việc đã đổi → danh sách tải lại
      if (daDoi.current) goiDoi.current();
    };
  }, [ma]);

  return (
    // Khung nằm trong dòng .muc-viec.mo-ra (phai-viec.css lo viền/bóng như agent Công việc) · mau=xanh: chữ cam của thẻ agent Công
    // việc đổi xanh dương (Mr. Đại chốt 07/10 — điểm khác duy nhất với khu phải agent Công việc)
    <div className="overflow-hidden" data-gt="viec:bung-tai-cho">
      <iframe
        src={`${goc}/nhung/viec/${encodeURIComponent(ma)}?tai_cho=1&mau=xanh`}
        title={`Việc ${ma}`}
        className="block w-full border-0"
        style={{ height: cao }}
      />
    </div>
  );
}
