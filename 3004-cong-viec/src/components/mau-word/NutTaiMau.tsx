"use client";
// Nút tải mẫu báo cáo: MỘT nút — tệp Excel ba tờ (Mẫu trắng · Hướng dẫn · Ví dụ đã điền). Mr. Đại chốt 22/10/2026: bỏ «Tải mẫu có ví dụ»
// vì ví dụ đã nằm sẵn trong tệp. Mẫu chưa có file Word gốc vẫn tải được (máy dựng theo định nghĩa mẫu).
import { Download } from "lucide-react";

export function NutTaiMau({ ma }: { ma: string }) {
  return (
    <a
      href={`/api/mau-word/${encodeURIComponent(ma)}/tep`}
      title="Tệp Excel: tờ «Mẫu trắng» để điền, tờ «Hướng dẫn», tờ «Ví dụ đã điền». Điền xong nộp ở «Báo cáo»."
      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
    >
      <Download size={12} /> Tải mẫu
    </a>
  );
}
