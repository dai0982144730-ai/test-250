"use client";
// KhungChia — chia hai cột có THANH KÉO ở giữa: người dùng kéo để chỉnh độ rộng, bấm đúp về mặc định,
// trình duyệt nhớ theo `khoa`. Nguyên tắc chung: chia cột thì không bao giờ cố định cứng độ rộng.
// Màn hẹp (dưới `tu` px) thì xếp chồng hai khối như cũ.
import { useEffect, useRef, useState } from "react";

export function KhungChia({
  khoa,
  trai,
  phai,
  macDinh = 50,
  toiThieu = 280,
  tu = 1024,
  laPx = false,
  className = "",
}: {
  /** khóa nhớ độ rộng trong trình duyệt, vd "tong-quan:tren" */
  khoa: string;
  trai: React.ReactNode;
  phai: React.ReactNode;
  /** độ rộng cột trái mặc định: % của khung, hoặc px nếu laPx */
  macDinh?: number;
  /** độ rộng tối thiểu mỗi cột (px) */
  toiThieu?: number;
  /** từ độ rộng màn hình này trở lên mới chia cột */
  tu?: number;
  laPx?: boolean;
  className?: string;
}) {
  const hop = useRef<HTMLDivElement>(null);
  const [trai_, setTrai] = useState(macDinh);
  const [chia, setChia] = useState(true);

  useEffect(() => {
    const doi = () => setChia(window.innerWidth >= tu);
    doi();
    window.addEventListener("resize", doi);
    return () => window.removeEventListener("resize", doi);
  }, [tu]);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(`chia:${khoa}`));
      if (v) setTrai(v);
    } catch {
      /* không có bộ nhớ trình duyệt: dùng mặc định */
    }
  }, [khoa]);

  const datRong = (v: number) => {
    const rong = hop.current?.getBoundingClientRect().width ?? 1200;
    const px = laPx ? v : (v / 100) * rong;
    const gh = Math.max(toiThieu, Math.min(rong - toiThieu - 8, px));
    const kq = laPx ? Math.round(gh) : Math.round((gh / rong) * 1000) / 10;
    setTrai(kq);
    try {
      localStorage.setItem(`chia:${khoa}`, String(kq));
    } catch {
      /* bỏ qua */
    }
  };

  if (!chia)
    return (
      <div className={`space-y-4 ${className}`}>
        {trai}
        {phai}
      </div>
    );

  return (
    <div ref={hop} className={`flex min-w-0 items-stretch ${className}`}>
      <div className="min-w-0 shrink-0" style={{ width: laPx ? `${trai_}px` : `${trai_}%` }}>
        {trai}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        title="Kéo để chỉnh độ rộng cột · bấm đúp để về mặc định"
        onDoubleClick={() => datRong(macDinh)}
        onPointerDown={(e) => {
          e.preventDefault();
          const x0 = e.clientX;
          const rong = hop.current?.getBoundingClientRect().width ?? 1200;
          const goc = trai_;
          const el = e.currentTarget;
          el.setPointerCapture(e.pointerId);
          const di = (ev: PointerEvent) => {
            const dx = ev.clientX - x0;
            datRong(laPx ? goc + dx : goc + (dx / rong) * 100);
          };
          const tha = () => {
            el.removeEventListener("pointermove", di);
            el.removeEventListener("pointerup", tha);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
          };
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
          el.addEventListener("pointermove", di);
          el.addEventListener("pointerup", tha);
        }}
        className="group mx-1.5 flex w-2 shrink-0 cursor-col-resize justify-center"
      >
        <span className="h-full w-0.5 rounded-full bg-border transition-colors group-hover:bg-accent/70 group-active:bg-accent" />
      </div>
      <div className="min-w-0 flex-1">{phai}</div>
    </div>
  );
}
