// Icon người trên các nút lọc (Mr. Đại chốt 30/09/2026 theo mẫu hình khối đặc):
//   · Nhóm người — người giữa đứng trước, có khe hở tách hai người hai bên (khe là chỗ trống thật, hợp mọi màu nền).
//   · Một người — chỉ giữ người giữa, phóng to cho cân đối.
// Tô bằng màu chữ của nút (currentColor), cao bằng chữ.
"use client";
import { useId } from "react";

const DAU_GIUA = { cx: 16, cy: 9.6, r: 4.6 };
const THAN_GIUA = "M7.6 23.4c0-5 3.7-8.3 8.4-8.3s8.4 3.3 8.4 8.3v.1c0 .3-.2.5-.5.5H8.1c-.3 0-.5-.2-.5-.5z";

export function IconNhomNguoi({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={`icon-nguoi ${className ?? ""}`} viewBox="0 0 32 24" aria-hidden="true" focusable="false">
      <defs>
        {/* khe hở: đục người giữa (nét dày 2,4) khỏi hai người hai bên */}
        <mask id={`khe-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="24">
          <rect width="32" height="24" fill="#fff" />
          <circle {...DAU_GIUA} fill="#000" stroke="#000" strokeWidth="2.4" />
          <path d={THAN_GIUA} fill="#000" stroke="#000" strokeWidth="2.4" strokeLinejoin="round" />
        </mask>
      </defs>
      <g fill="currentColor" mask={`url(#khe-${id})`}>
        <circle cx="7.4" cy="6.4" r="4.1" />
        <path d="M0 19.6c0-4.5 3.2-7.4 7.4-7.4s7.4 2.9 7.4 7.4v.1c0 .3-.2.5-.5.5H.5c-.3 0-.5-.2-.5-.5z" />
        <circle cx="24.6" cy="6.4" r="4.1" />
        <path d="M17.2 19.6c0-4.5 3.2-7.4 7.4-7.4s7.4 2.9 7.4 7.4v.1c0 .3-.2.5-.5.5H17.7c-.3 0-.5-.2-.5-.5z" />
      </g>
      <g fill="currentColor">
        <circle {...DAU_GIUA} />
        <path d={THAN_GIUA} />
      </g>
    </svg>
  );
}

export function IconMotNguoi({ className }: { className?: string }) {
  return (
    <svg className={`icon-nguoi mot ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <circle cx="12" cy="6.6" r="5.6" />
        <path d="M1.6 23.2c0-6.1 4.5-10.1 10.4-10.1s10.4 4 10.4 10.1v.2c0 .3-.3.6-.6.6H2.2c-.3 0-.6-.3-.6-.6z" />
      </g>
    </svg>
  );
}

/** Icon theo nút lọc: Tôi giao / Tôi nhận = một người (chỉ chủ tài khoản); Cần phối hợp = nhóm (tôi + đơn vị tôi) */
export function IconNutLoc({ kieu }: { kieu: string }) {
  return kieu === "phoi_hop" ? <IconNhomNguoi /> : <IconMotNguoi />;
}
