"use client";
// phong/KeoGiua.tsx — VẠCH KÉO giữa sân (trái) và khung việc (phải) — Đợt 3, Mr. Đại chốt 28/09.
// Rê chuột lên vạch thì sáng; giữ chuột kéo sang trái để khung phải rộng thêm, tối đa +50% bề rộng mặc định.
// Sân bên trái nhỏ lại bằng PHÓNG THU ĐỀU (sân tự co theo khung — xem khối ResizeObserver ở trang), không kéo méo khối.
// Bấm đúp vạch = trả về mặc định. Độ nới nhớ riêng mỗi người xem (localStorage, lỗi thì bỏ qua). Màn hẹp (< 1000 px) ẩn vạch.
import { useCallback, useEffect, useState } from "react";

import { TOI_DA, doNoiTuChuot, rongPhaiMacDinh } from "./keo-giua";

export function useKeoGiua(khoa: string) {
  // Ref dạng hàm: khung chỉ có sau khi trang tải xong dữ liệu, nên phải bắt đúng lúc nó gắn vào
  const [khung, datKhung] = useState<HTMLDivElement | null>(null);
  const khungRef = useCallback((el: HTMLDivElement | null) => datKhung(el), []);
  const [noi, setNoi] = useState(0);
  const [rong, setRong] = useState(0);
  const [dang, setDang] = useState(false);

  useEffect(() => {
    try {
      const v = Number(localStorage.getItem(`phong-keo-${khoa}`));
      if (v > 0 && v <= TOI_DA) setNoi(v);
    } catch {
      /* không có bộ nhớ trình duyệt: dùng mặc định */
    }
  }, [khoa]);

  useEffect(() => {
    if (!khung) return;
    const ro = new ResizeObserver(() => setRong(khung.clientWidth));
    ro.observe(khung);
    return () => ro.disconnect();
  }, [khung]);

  const luu = useCallback(
    (v: number) => {
      try {
        localStorage.setItem(`phong-keo-${khoa}`, String(v));
      } catch {
        /* bỏ qua */
      }
    },
    [khoa],
  );

  const batDau = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const k = khung;
      if (!k || e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDang(true);
      const r = k.getBoundingClientRect();
      const dem = parseFloat(getComputedStyle(k).paddingRight) || 0;
      let cuoi = noi;
      const di = (ev: PointerEvent) => {
        cuoi = doNoiTuChuot(r.right - dem, ev.clientX, k.clientWidth - dem * 2);
        setNoi(cuoi);
      };
      const tha = () => {
        window.removeEventListener("pointermove", di);
        window.removeEventListener("pointerup", tha);
        setDang(false);
        luu(cuoi);
      };
      window.addEventListener("pointermove", di);
      window.addEventListener("pointerup", tha);
    },
    [khung, noi, luu],
  );

  const traVe = useCallback(() => {
    setNoi(0);
    luu(0);
  }, [luu]);

  const dem = khung ? (parseFloat(getComputedStyle(khung).paddingRight) || 0) * 2 : 24;
  const rongPhai = rong ? Math.round(rongPhaiMacDinh(rong - dem) * (1 + noi)) : 0;
  return {
    khungRef,
    kieuKhung: rongPhai ? ({ ["--rong-phai" as string]: `${rongPhai}px` } as React.CSSProperties) : undefined,
    vach: (
      <div
        className={`keo-giua ${dang ? "dang" : ""}`}
        data-gt="keo-giua"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(noi * 100)}
        title={`Giữ chuột kéo sang trái để nới rộng khung bên phải (tối đa thêm 50%) · bấm đúp để trả về${noi ? ` · đang nới ${Math.round(noi * 100)}%` : ""}`}
        onPointerDown={batDau}
        onDoubleClick={traVe}
      />
    ),
  };
}
