"use client";

// Một ảnh biểu đồ của khối báo cáo sáng — tách khỏi XemBoKhoi.tsx để DienThoaiTelegram.tsx dùng chung mà không import vòng.
import { useEffect, useState } from "react";
import type { DacTaAnh } from "@/lib/bao-cao-sang/anh-kieu";

/** Một ảnh biểu đồ: gửi đặc tả, nhận PNG */
export function AnhKhoi({ dacTa, chuThich }: { dacTa: DacTaAnh; chuThich: string }) {
  const khoa = JSON.stringify(dacTa);
  const [url, setUrl] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    let huy = false;
    let tao: string | null = null;
    setUrl(null);
    setLoi(null);
    void (async () => {
      try {
        const r = await fetch("/api/bao-cao-sang/khoi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dacTa: JSON.parse(khoa) as DacTaAnh }),
        });
        if (!r.ok) {
          const j = (await r.json().catch(() => ({}))) as { message?: string };
          if (!huy) setLoi(j.message ?? "Không vẽ được ảnh.");
          return;
        }
        const blob = await r.blob();
        tao = URL.createObjectURL(blob);
        if (!huy) setUrl(tao);
      } catch {
        if (!huy) setLoi("Không gọi được máy chủ để vẽ ảnh.");
      }
    })();
    return () => {
      huy = true;
      if (tao) URL.revokeObjectURL(tao);
    };
  }, [khoa]);
  if (loi) return <p className="text-[11px] text-red">Ảnh «{chuThich}»: {loi}</p>;
  if (!url) return <p className="text-[11px] text-text-muted">Đang vẽ ảnh «{chuThich}»…</p>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={chuThich} className="w-full max-w-[720px] rounded-sm border border-border-light" />;
}
