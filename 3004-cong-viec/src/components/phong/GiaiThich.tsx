"use client";
// ============================================================
// GIẢI THÍCH — thay trang "Hướng dẫn" cũ (Mr. Đại chốt 01/10/2026). Lấy khung từ agent Tiến độ 3003
// (5-Agent-tien-do/src/components/giai-thich/GiaiThich.tsx, Mr. Đại chốt 08/09): nút bật/tắt trên thanh trên —
// BÊN PHẢI nút chọn tuần; BẬT lên thì mọi thứ có giải thích hiện viền chấm, rê chuột (điện thoại: chạm) vào là hiện
// ô 4 phần: Đây là gì · Số lấy từ đâu · Cách đọc · Nên làm gì. TẮT (mặc định) thì màn sạch như thường.
// Nối: phần tử mang data-gt="<khoá>"; nội dung tra trong TU_DIEN_GIAI_THICH (lib/giai-thich/noi-dung.ts — MỘT chỗ).
// ============================================================
import { useEffect, useState } from "react";
import { TU_DIEN_GIAI_THICH } from "@/lib/giai-thich/noi-dung";

const SU_KIEN = "giai-thich-doi";
const dangBat = () => typeof document !== "undefined" && document.body.dataset.giaiThich === "1";

const IC_DEN = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
  </svg>
);

/** Nút công tắc trên thanh trên — bên phải nút chọn tuần */
export function NutGiaiThich() {
  const [bat, setBat] = useState(false);
  useEffect(() => setBat(dangBat()), []);
  const doi = () => {
    const moi = !dangBat();
    if (moi) document.body.dataset.giaiThich = "1";
    else delete document.body.dataset.giaiThich;
    setBat(moi);
    window.dispatchEvent(new CustomEvent(SU_KIEN));
  };
  return (
    <button
      data-gt="giai-thich"
      className={`nut-tren nut-giai-thich ${bat ? "dang-bat" : ""}`}
      aria-pressed={bat}
      onClick={doi}
      title="Giải thích: bật lên rồi rê chuột (điện thoại: chạm) vào chỗ có viền chấm để biết đó là gì, số lấy từ đâu, cách đọc, nên làm gì"
    >
      {IC_DEN}
      <span>Giải thích</span>
    </button>
  );
}

/** Lớp ô giải thích — gắn một lần trong khung phòng */
export function LopGiaiThich() {
  const [o, setO] = useState<{ khoa: string; x: number; yDuoi: number; yTren: number } | null>(null);
  useEffect(() => {
    const hien = (e: Event) => {
      if (!dangBat()) return;
      const goc = e.target as HTMLElement | null;
      if (goc?.closest?.(".o-giai-thich")) return; // chuột đang trên chính ô giải thích — giữ nguyên (lỗi chớp tắt 3003, 08/09)
      const el = goc?.closest?.("[data-gt]") as HTMLElement | null;
      if (!el) return setO(null);
      const r = el.getBoundingClientRect();
      setO({ khoa: el.dataset.gt ?? "", x: r.left, yDuoi: r.bottom + 8, yTren: r.top - 8 });
    };
    const tat = () => setO(null);
    document.addEventListener("mouseover", hien);
    document.addEventListener("click", hien, true); // điện thoại không rê chuột được — chạm là hiện
    window.addEventListener(SU_KIEN, tat);
    window.addEventListener("scroll", tat, true);
    return () => {
      document.removeEventListener("mouseover", hien);
      document.removeEventListener("click", hien, true);
      window.removeEventListener(SU_KIEN, tat);
      window.removeEventListener("scroll", tat, true);
    };
  }, []);
  if (!o) return null;
  const nd = TU_DIEN_GIAI_THICH[o.khoa];
  const rong = Math.min(380, window.innerWidth - 16);
  const left = Math.max(8, Math.min(o.x, window.innerWidth - rong - 8));
  // chữ ở nửa dưới màn → mở ô PHÍA TRÊN chữ để không che chính chữ đang rê
  const viTri = o.yDuoi > window.innerHeight * 0.55 ? { left, bottom: window.innerHeight - o.yTren, width: rong } : { left, top: o.yDuoi, width: rong };
  return (
    <div className="o-giai-thich" style={viTri} role="tooltip">
      <div className="gt-dau">
        {IC_DEN} {nd?.ten ?? o.khoa}
      </div>
      {!nd ? (
        <p>Chưa có nội dung giải thích cho mục này — sẽ bổ sung.</p>
      ) : (
        <>
          <p><b>Đây là gì:</b> {nd.laGi}</p>
          <p><b>Số lấy từ đâu:</b> {nd.tuDau}</p>
          <p><b>Cách đọc:</b> {nd.cachDoc}</p>
          <p><b>Nên làm gì:</b> {nd.nenLam}</p>
        </>
      )}
    </div>
  );
}
