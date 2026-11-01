"use client";

// ============================================================
// Ô GÕ SỐ theo CHUẨN SỐ VIỆT NAM — Mr. Đại chốt 12/10/2026 (KE-HOACH/10 chốt 130): thập phân dấu PHẨY, nhóm ba chữ số dấu CHẤM.
// Thay cho <input type="number"> ở mọi ô gõ được SỐ LẺ hoặc số lớn: ô type="number" do trình duyệt quyết dấu — máy cài tiếng Anh
// chỉ nhận dấu chấm, và không bao giờ hiện dấu nhóm. Ô này là ô chữ: gõ «1.234,5» hay «1234,5» đều nhận; rời ô thì máy viết lại
// theo chuẩn để người thấy máy đã hiểu ra số nào. Bàn phím số trên điện thoại vẫn bật (inputMode="decimal").
// Ô chỉ gõ số NGUYÊN nhỏ (số ngày, %) không cần đổi sang ô này.
// MỘT bộ đọc: lib/chung/doc-so (cùng luật với tệp Excel nạp vào).
// ============================================================

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { docSoChu, vietSoVN } from "@/lib/chung/doc-so";

const raChu = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) ? "" : vietSoVN(n));

export function ONhapSo({
  value,
  onChange,
  className = "",
  title,
  onFocus,
  onBlur,
  ...con
}: {
  /** Số đang có; null / NaN = ô trống */
  value: number | null | undefined;
  /** Gọi mỗi khi chữ trong ô đọc ra được một số (hoặc null khi ô trống). Chữ chưa thành số thì KHÔNG gọi — giữ số cũ. */
  onChange: (n: number | null) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode">) {
  const [chu, setChu] = useState(() => raChu(value));
  const dangGo = useRef(false);
  // số đổi từ ngoài (nạp lại, máy tính lại) → viết lại theo chuẩn; đang gõ dở thì không đè chữ người đang gõ
  useEffect(() => {
    if (!dangGo.current) setChu(raChu(value));
  }, [value]);
  const sai = chu.trim() !== "" && docSoChu(chu) === null;
  return (
    <input
      {...con}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={chu}
      aria-invalid={sai || undefined}
      title={sai ? "Chưa phải số — gõ theo chuẩn Việt Nam, ví dụ 1.234,5 (dấu phẩy là thập phân)" : title ?? "Số theo chuẩn Việt Nam: dấu phẩy là thập phân, dấu chấm ngăn nhóm ba chữ số"}
      className={`${className} aria-[invalid=true]:border-red aria-[invalid=true]:text-red`}
      onFocus={(e) => {
        dangGo.current = true;
        onFocus?.(e);
      }}
      onChange={(e) => {
        const t = e.target.value;
        setChu(t);
        if (t.trim() === "") onChange(null);
        else {
          const d = docSoChu(t);
          if (d) onChange(d.so);
        }
      }}
      onBlur={(e) => {
        dangGo.current = false;
        const d = docSoChu(chu);
        if (d) setChu(vietSoVN(d.so));
        onBlur?.(e);
      }}
    />
  );
}
