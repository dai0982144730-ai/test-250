"use client";

// ============================================================
// CHỨC NĂNG GIẢI THÍCH — yêu cầu gốc Mr. Đại (tìm lại 08/09/2026):
// nút "Giải thích" cạnh nút "Giới thiệu"; BẬT lên thì rê chuột (điện thoại:
// chạm) vào từng chữ có giải thích → popup hướng dẫn ĐÚNG chữ đó tại chỗ.
// TẮT (mặc định) thì màn sạch như thường.
//
// Cách nối: phần tử nào muốn có giải thích thì mang data-gt="<đúng chữ trên
// màn>"; nội dung tra trong TU_DIEN_GIAI_THICH (một chỗ duy nhất — luật 7).
// Hai nửa nói chuyện qua data-giai-thich trên <body> + một CustomEvent,
// nên nút nằm ở Header còn lớp popup nằm ở layout gốc vẫn khớp nhau.
// ============================================================

import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import { TU_DIEN_GIAI_THICH } from "@/lib/giai-thich/noi-dung";

const SU_KIEN = "giai-thich-doi";
const RONG = 360; // bề rộng popup (px) — để né mép phải màn hình

function dangBat(): boolean {
  return typeof document !== "undefined" && document.body.dataset.giaiThich === "1";
}

/** Nút công tắc trên topmenu — cạnh nút Giới thiệu */
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
      onClick={doi}
      data-lenh="topmenu.giai-thich"
      data-gt="Giải thích"
      aria-pressed={bat}
      title="Giải thích: bật lên rồi rê chuột (hoặc chạm) vào chữ có viền chấm để xem chữ đó nghĩa là gì"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] transition ${
        bat
          ? "border-accent bg-surface font-bold text-accent"
          : "border-border bg-surface text-text-secondary hover:border-accent hover:text-accent"
      }`}
    >
      <Lightbulb className={`h-3.5 w-3.5 ${bat ? "fill-current drop-shadow-[0_0_5px_currentColor]" : ""}`} />
      <span className="nhan-gon-2">Giải thích</span>
    </button>
  );
}

/** Lớp popup toàn app — gắn một lần ở layout gốc */
export function LopGiaiThich() {
  const [popup, setPopup] = useState<{ khoa: string; x: number; yDuoi: number; yTren: number } | null>(
    null
  );

  useEffect(() => {
    const hien = (e: Event) => {
      if (!dangBat()) return;
      const goc = e.target as HTMLElement | null;
      // Chuột đang nằm TRÊN popup (popup có thể che chữ ở gần đáy màn) —
      // giữ nguyên, không đóng không mở lại (lỗi popup chớp tắt 08/09)
      if (goc?.closest?.(".o-giai-thich")) return;
      const el = goc?.closest?.("[data-gt]") as HTMLElement | null;
      if (!el) {
        setPopup(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setPopup({ khoa: el.dataset.gt ?? "", x: r.left, yDuoi: r.bottom + 8, yTren: r.top - 8 });
    };
    const tat = () => setPopup(null);
    document.addEventListener("mouseover", hien);
    document.addEventListener("click", hien); // điện thoại không có "rê chuột" — chạm là hiện
    window.addEventListener(SU_KIEN, tat);
    window.addEventListener("scroll", tat, true);
    return () => {
      document.removeEventListener("mouseover", hien);
      document.removeEventListener("click", hien);
      window.removeEventListener(SU_KIEN, tat);
      window.removeEventListener("scroll", tat, true);
    };
  }, []);

  if (!popup) return null;
  const noiDung = TU_DIEN_GIAI_THICH[popup.khoa];
  const left = Math.max(8, Math.min(popup.x, window.innerWidth - RONG - 8));
  // Chữ ở nửa dưới màn → mở popup PHÍA TRÊN chữ (neo bằng bottom) để không
  // đè lên chính chữ đang rê; nửa trên → mở phía dưới như thường
  const oDuoi = popup.yDuoi > window.innerHeight * 0.55;
  const viTri = oDuoi
    ? { left, bottom: window.innerHeight - popup.yTren, width: RONG }
    : { left, top: popup.yDuoi, width: RONG };

  return (
    // .o-giai-thich (globals.css): nền bán trong + blur — Mr. Đại chốt 08/09
    // "cho ô popup có một chút độ trong để nhìn thấy mờ mờ bên dưới, giống
    // hiệu ứng mờ của topmenu khi cuộn" (.nen-ghim, cùng công thức color-mix)
    <div
      className="o-giai-thich fixed z-[80] rounded border border-accent p-3 shadow-card"
      style={viTri}
      role="tooltip"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent">
        <Lightbulb className="h-3.5 w-3.5" /> {popup.khoa}
      </div>
      {!noiDung ? (
        <p className="text-[12px] leading-relaxed text-text-secondary">
          Chưa có nội dung giải thích cho mục này — sẽ bổ sung dần.
        </p>
      ) : (
        <div className="space-y-1.5 text-[12px] leading-relaxed text-text-secondary">
          <p>
            <b className="text-text">Đây là gì:</b> {noiDung.laGi}
          </p>
          <p>
            <b className="text-text">Số lấy từ đâu:</b> {noiDung.tuDau}
          </p>
          <p>
            <b className="text-text">Cách đọc:</b> {noiDung.cachDoc}
          </p>
          <p>
            <b className="text-text">Nên làm gì:</b> {noiDung.nenLam}
          </p>
        </div>
      )}
    </div>
  );
}
