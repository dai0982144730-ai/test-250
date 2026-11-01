"use client";

// Lời văn 🤖 sửa ngay tại chỗ (Mr. Đại 28/10/2026, KE-HOACH/38 đợt 3): bấm «✎ Sửa», gõ, rời ô là lưu; xoá hết chữ rồi rời ô = bỏ chữ sửa tay, về chữ 🤖.
// Chữ đã sửa có dấu ✎ và file Excel lấy đúng chữ này (lib/bao-cao-thang/sua-tay.ts).

import { useEffect, useState, type ReactNode } from "react";
import { LY_DO_CHAN } from "@/lib/quyen";

export function ChuSuaDuoc({
  hien,
  chuSua,
  coGhi,
  luu,
  khoiRong = false,
  chuBanDau = "",
}: {
  /** Chữ 🤖 hiện tại — điền sẵn vào ô gõ khi bấm Sửa lần đầu */
  chuBanDau?: string;
  /** Chữ đang hiện (đã áp chữ sửa tay) */
  hien: ReactNode;
  /** Chữ người đã sửa, nếu có */
  chuSua?: string;
  coGhi: boolean;
  luu: (chu: string) => void;
  /** true = khối nhận xét đầu mục (ô gõ rộng hơn) */
  khoiRong?: boolean;
}) {
  const [dangSua, setDangSua] = useState(false);
  const [ban, setBan] = useState(chuSua ?? "");
  useEffect(() => setBan(chuSua ?? ""), [chuSua]);

  if (dangSua) {
    return (
      <textarea
        autoFocus
        rows={khoiRong ? 5 : 4}
        className="w-full resize-y rounded-sm border border-accent/60 bg-surface px-2 py-1 text-[11.5px] text-text"
        value={ban}
        placeholder="Xoá hết chữ rồi rời ô để về chữ 🤖"
        onChange={(e) => setBan(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setBan(chuSua ?? "");
            setDangSua(false);
          }
        }}
        onBlur={() => {
          setDangSua(false);
          // Kiểm độc lập 27/10 BD-1: so với chữ lúc MỞ ô (chữ 🤖 nếu chưa ai sửa) — bấm Sửa rồi rời ô không gõ gì thì không chốt chữ AI thành chữ tay
          if (ban.trim() !== (chuSua ?? chuBanDau.replace(/^🤖\s*/, "")).trim()) luu(ban);
        }}
      />
    );
  }
  return (
    <span>
      {hien}
      {chuSua !== undefined && <span className="text-accent" title="Chữ do người sửa tay"> ✎</span>}
      <button
        type="button"
        disabled={!coGhi}
        title={coGhi ? "Sửa chữ tại đây, rời ô là lưu" : LY_DO_CHAN.ghi}
        className="ml-1.5 text-[11px] text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
        onClick={() => {
          setBan(chuSua ?? chuBanDau.replace(/^🤖\s*/, ""));
          setDangSua(true);
        }}
      >
        ✎ Sửa
      </button>
    </span>
  );
}
