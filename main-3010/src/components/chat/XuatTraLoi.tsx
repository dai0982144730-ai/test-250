"use client";

// Dải nút XUẤT một câu trả lời trợ lý ra file (S8 tầng 2 ⑤ — Mr. Đại 05/09,
// kèm ảnh dải nút định dạng). CHỈ hiện định dạng chạy THẬT trên máy chủ:
// MD · HTML · DOCX · XLSX (khi có bảng) · DXF (mở bằng AutoCAD).
// PDF/PPTX/SVG/MMD/DOT/KML của danh mục lõi chưa có bộ chuyển — không bày nút giả.

import { useState } from "react";

const DINH_DANG: { ma: string; nhan: string; canBang?: boolean; tip: string }[] = [
  { ma: "md", nhan: "MD", tip: "Markdown — dán lại vào chat/ghi chú" },
  { ma: "html", nhan: "HTML", tip: "Trang web — mở bằng trình duyệt, in được" },
  { ma: "docx", nhan: "DOCX", tip: "Word — sửa tiếp, trình ký" },
  { ma: "xlsx", nhan: "XLSX", canBang: true, tip: "Excel — bảng số liệu trong câu trả lời" },
  { ma: "dxf", nhan: "DXF", tip: "Bản vẽ AutoCAD — chèn ghi chú/bảng vào bản vẽ" },
];

export function XuatTraLoi({ noiDung }: { noiDung: string }) {
  const [dangXuat, setDangXuat] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const coBang = /^\s*\|.+\|\s*$/m.test(noiDung);

  async function xuat(ma: string): Promise<void> {
    setDangXuat(ma);
    setLoi(null);
    try {
      const r = await fetch("/api/tro-ly/xuat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dinhDang: ma, noiDung }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { message?: string } | null;
        throw new Error(j?.message ?? `Xuất thất bại (HTTP ${r.status})`);
      }
      const blob = await r.blob();
      // tên file server đặt (tiếng Việt, ngày dd-mm-yyyy) nằm trong header
      const cd = r.headers.get("Content-Disposition") ?? "";
      const m = /filename\*=UTF-8''([^;]+)/.exec(cd);
      const ten = m ? decodeURIComponent(m[1]!) : `tra-loi.${ma}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ten;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Xuất thất bại.");
    } finally {
      setDangXuat(null);
    }
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <span className="text-[9.5px] uppercase tracking-wide text-text-muted">Xuất:</span>
      {DINH_DANG.filter((d) => !d.canBang || coBang).map((d) => (
        <button
          key={d.ma}
          type="button"
          disabled={dangXuat !== null}
          onClick={() => void xuat(d.ma)}
          data-lenh="chat.xuat-tra-loi"
          data-gia-tri={d.ma}
          title={d.tip}
          className="rounded-[6px] border border-border px-1.5 py-[1px] text-[9.5px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {dangXuat === d.ma ? "…" : d.nhan}
        </button>
      ))}
      {loi !== null && <span className="text-[9.5px] text-red">{loi}</span>}
    </div>
  );
}
