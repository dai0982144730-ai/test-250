"use client";

// ============================================================
// GIỮ SỔ HỎI–ĐÁP THEO TUỔI — hai mốc chung của cả hệ (HOP-DONG-KET-NOI 7.1,
// Mr. Đại chốt 26/09/2026). Khai ở Main; 4 agent kéo về, mỗi agent tự dọn sổ
// của mình lúc 03:30 mỗi đêm. Cửa quyền "caidat" (PM, Admin) — kiểm ở API.
// ============================================================

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import type { CaiDatBase } from "@/lib/cai-dat-base";

export function GiuSoHoiDap() {
  const [dayDu, setDayDu] = useState("");
  const [gon, setGon] = useState("");
  const [goc, setGoc] = useState<{ dayDu: number; gon: number } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [bao, setBao] = useState<{ ok: boolean; chu: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/cai-dat-base", { cache: "no-store" });
        const j = (await r.json()) as { ok: boolean; cauHinh?: CaiDatBase };
        if (j.ok && j.cauHinh?.giuSo) {
          setGoc(j.cauHinh.giuSo);
          setDayDu(String(j.cauHinh.giuSo.dayDu));
          setGon(String(j.cauHinh.giuSo.gon));
        }
      } catch {
        setBao({ ok: false, chu: "Không gọi được máy chủ" });
      }
    })();
  }, []);

  const doi = goc !== null && (dayDu !== String(goc.dayDu) || gon !== String(goc.gon));

  const luu = async () => {
    setDangLuu(true);
    setBao(null);
    try {
      const r = await fetch("/api/cai-dat-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giuSo: { dayDu: Number(dayDu), gon: Number(gon) } }),
      });
      const j = (await r.json()) as { ok: boolean; cauHinh?: CaiDatBase; message?: string };
      if (j.ok && j.cauHinh) {
        setGoc(j.cauHinh.giuSo);
        setBao({ ok: true, chu: "✓ Đã lưu — đã đẩy sang 4 agent" });
      } else {
        setBao({ ok: false, chu: j.message ?? "Lưu không được" });
      }
    } catch {
      setBao({ ok: false, chu: "Không gọi được máy chủ" });
    } finally {
      setDangLuu(false);
    }
  };

  const o = "w-16 rounded-sm border border-border bg-bg2 px-2 py-1 text-right text-[12px] text-text outline-none focus:border-accent";

  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="text-[13px] font-bold text-text">Giữ sổ hỏi–đáp giữa các agent</div>
      <p className="mt-1 max-w-[820px] text-[11.5px] leading-relaxed text-text-secondary">
        Mỗi agent tự dọn sổ của mình lúc 03:30 mỗi đêm, tính theo ngày giờ Việt Nam. Dòng cũ hơn mốc thứ hai bị
        xoá. Hai mốc này dùng chung cả hệ — 4 agent kia kéo về từ đây.
      </p>
      {goc === null ? (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang nạp…
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-[12px] text-text">
          <label className="flex flex-wrap items-center gap-2">
            <span className="w-[260px]">Giữ sổ hỏi–đáp đầy đủ:</span>
            <input type="number" min={1} max={364} step={1} value={dayDu} onChange={(e) => setDayDu(e.target.value)} className={o} />
            <span className="text-text-muted">ngày (tra ngược báo cáo tuần)</span>
          </label>
          <label className="flex flex-wrap items-center gap-2">
            <span className="w-[260px]">Giữ bản gọn tới:</span>
            <input type="number" min={2} max={365} step={1} value={gon} onChange={(e) => setGon(e.target.value)} className={o} />
            <span className="text-text-muted">ngày (tra ngược báo cáo tháng) — bỏ nội dung trả lời dài</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              disabled={dangLuu || !doi}
              onClick={() => void luu()}
              data-lenh="cai-dat-main.giu-so.luu"
              className="flex items-center gap-1.5 rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition hover:border-accent disabled:opacity-50"
            >
              {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Lưu hai mốc
            </button>
            {bao && <span className={`text-[12px] font-semibold ${bao.ok ? "text-green" : "text-red"}`}>{bao.chu}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
