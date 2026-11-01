"use client";

// ============================================================
// CHIA TRANG DÙNG CHUNG (Mr. Đại chốt 04/10/2026 — E40):
//   "khống chế nó chỉ được phép dài tối đa tầm 2 trang màn hình, sau đó nếu còn dữ liệu thì
//    phải bấm trang kế tiếp ở cuối khu vực dữ liệu đó"
// Mỗi trang CỐ ĐỊNH 30 dòng (anh chọn 30 dòng/trang, không tự co theo màn hình).
// Thanh "← Trước · Trang x/y · N dòng · Sau →" nằm CUỐI khối; ≤ 30 dòng thì không hiện.
// Chép nguyên từ Main (4-agent-main/src/components/common/PhanTrang.tsx) — giống hệt Main · Tiến độ · Hợp đồng.
// ============================================================
import { useEffect, useRef, useState } from "react";

export const DONG_MOT_TRANG = 30;

/** Sự kiện "lật tới trang có mã X" — trợ lý AI cần cuộn tới một dòng (data-wbs) đang nằm ở trang khác */
export const SU_KIEN_LAT_TOI_MA = "phan-trang:lat-toi-ma";

/** Báo mọi khối đang chia trang: khối nào có mã này thì lật tới đúng trang chứa nó */
export function latToiMa(ma: string): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(SU_KIEN_LAT_TOI_MA, { detail: ma }));
}

/**
 * Cắt một danh sách thành trang. `khoa` đổi (vd đổi bộ lọc, đổi tab) thì quay về trang 1.
 * Danh sách co lại (xoá dòng) thì tự lùi về trang cuối còn dữ liệu.
 * `maCua` (tuỳ chọn) = mã data-wbs của mỗi dòng — có thì khối nghe được latToiMa().
 */
export function usePhanTrang<T>(ds: T[], khoa: unknown = null, maCua?: (x: T) => string | undefined) {
  const moiTrang = DONG_MOT_TRANG;
  const [trang, setTrang] = useState(0);
  const khoaTruoc = useRef(khoa);
  useEffect(() => {
    if (khoaTruoc.current !== khoa) {
      khoaTruoc.current = khoa;
      setTrang(0);
    }
  }, [khoa]);
  const dsRef = useRef(ds);
  dsRef.current = ds;
  const maRef = useRef(maCua);
  maRef.current = maCua;
  const coMa = Boolean(maCua);
  useEffect(() => {
    if (!coMa) return;
    const nghe = (e: Event) => {
      const ma = (e as CustomEvent<string>).detail;
      const i = dsRef.current.findIndex((x) => maRef.current?.(x) === ma);
      if (i >= 0) setTrang(Math.floor(i / moiTrang));
    };
    window.addEventListener(SU_KIEN_LAT_TOI_MA, nghe);
    return () => window.removeEventListener(SU_KIEN_LAT_TOI_MA, nghe);
  }, [coMa, moiTrang]);
  const soTrang = Math.max(1, Math.ceil(ds.length / moiTrang));
  const tt = Math.min(trang, soTrang - 1);
  return {
    phan: ds.slice(tt * moiTrang, (tt + 1) * moiTrang),
    trang: tt,
    soTrang,
    tong: ds.length,
    /** chỉ số dòng đầu của trang (để đánh số thứ tự liên tục) */
    batDau: tt * moiTrang,
    doiTrang: setTrang,
  };
}

const NUT =
  "rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Thanh chuyển trang ở cuối khối. Bấm sang trang thì kéo màn về đầu khối
 * (khối = phần tử cha gần nhất mang `data-khoi-trang`, không có thì phần tử ngay trên thanh).
 */
export function PhanTrang({
  trang,
  soTrang,
  tong,
  onDoi,
  donVi = "dòng",
  className = "",
}: {
  trang: number;
  soTrang: number;
  tong: number;
  onDoi: (t: number) => void;
  donVi?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (soTrang <= 1) return null;
  const sang = (t: number) => {
    onDoi(t);
    const el = ref.current;
    const khoi = (el?.closest("[data-khoi-trang]") as HTMLElement | null) ?? (el?.parentElement as HTMLElement | null);
    requestAnimationFrame(() => {
      if (khoi && khoi.getBoundingClientRect().top < 0) khoi.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };
  return (
    <div
      ref={ref}
      data-gt="Chuyển trang"
      className={`mt-2 flex items-center justify-between gap-2 border-t border-border-light pt-2 text-[11.5px] text-text-muted ${className}`}
    >
      <button type="button" className={NUT} disabled={trang <= 0} onClick={() => sang(trang - 1)}>
        ← Trước
      </button>
      <span>
        Trang {trang + 1}/{soTrang} · {tong.toLocaleString("vi-VN")} {donVi}
      </span>
      <button type="button" className={NUT} disabled={trang >= soTrang - 1} onClick={() => sang(trang + 1)}>
        Sau →
      </button>
    </div>
  );
}
