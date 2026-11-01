"use client";

// ============================================================
// ✈ NỐI TELEGRAM — hộp của CHÍNH người đăng nhập (Mr. Đại chốt 25/09).
// Mở hộp là có mã luôn (bớt cú bấm): mã 6 số sống 10 phút + link bấm thẳng
// trên điện thoại. Người xem: nút mờ + lý do (luật 17), không lấy mã.
// API: /api/telegram-tro-ly/noi
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import { HuongDanMoThang } from "@/components/huong-dan/NutHuongDan";

interface TrangThaiNoi {
  daNoi: boolean;
  duocDung: boolean;
  lyDo?: string;
  bot: string;
}

export function NoiTelegramModal({ onClose }: { onClose: () => void }) {
  const [tt, setTt] = useState<TrangThaiNoi | null>(null);
  const [ma, setMa] = useState<{ ma: string; hetHan: string } | null>(null);
  const [dangLam, setDangLam] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [moHuongDan, setMoHuongDan] = useState(false);

  const layMa = useCallback(async () => {
    setDangLam(true);
    setLoi(null);
    try {
      const r = await fetch("/api/telegram-tro-ly/noi", { method: "POST" });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; ma?: string; hetHan?: string; message?: string } | null;
      if (j?.ok && j.ma && j.hetHan) setMa({ ma: j.ma, hetHan: j.hetHan });
      else setLoi(j?.message ?? `Không lấy được mã (HTTP ${r.status})`);
    } catch {
      setLoi("Không gọi được máy chủ Main.");
    } finally {
      setDangLam(false);
    }
  }, []);

  const nap = useCallback(async () => {
    try {
      const r = await fetch("/api/telegram-tro-ly/noi", { cache: "no-store" });
      const j = (await r.json()) as TrangThaiNoi & { ok: boolean; message?: string };
      if (!j.ok) {
        setLoi(j.message ?? "Không đọc được trạng thái nối.");
        return;
      }
      setTt(j);
      // Chưa nối + được dùng → lấy mã ngay khi mở hộp
      if (!j.daNoi && j.duocDung) void layMa();
    } catch {
      setLoi("Không gọi được máy chủ Main.");
    }
  }, [layMa]);

  useEffect(() => {
    void nap();
  }, [nap]);

  const goNoi = async () => {
    setDangLam(true);
    setLoi(null);
    try {
      const r = await fetch("/api/telegram-tro-ly/noi", { method: "DELETE" });
      const j = (await r.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!j?.ok) setLoi(j?.message ?? "Gỡ nối không được.");
      setMa(null);
      await nap();
    } finally {
      setDangLam(false);
    }
  };

  const gioHet = ma ? new Date(ma.hetHan).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "";
  const bot = tt?.bot ?? "SCI_Main_agent_bot";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <KhaiHuongDan ma="noi-telegram" uuTien={2} />
      <div
        className="w-full max-w-[360px] rounded border border-border bg-surface p-4 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <Send className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-bold text-text">Nối Telegram với trợ lý Main</span>
          <button
            type="button"
            onClick={() => setMoHuongDan(true)}
            title="Xem hướng dẫn nối Telegram từng bước, có hình"
            className="ml-auto rounded-sm border border-accent/50 bg-accent-soft px-2 py-0.5 text-[11.5px] font-bold text-accent transition-colors hover:border-accent"
          >
            ? Hướng dẫn
          </button>
        </div>

        {!tt && !loi && (
          <div className="flex items-center gap-2 text-[12px] text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang đọc…
          </div>
        )}

        {tt && !tt.duocDung && (
          <div className="space-y-2 text-[12px] text-text-secondary">
            <p>{tt.lyDo}</p>
            <button
              type="button"
              disabled
              title={tt.lyDo}
              className="rounded-sm border border-border px-3 py-1.5 text-[12px] font-bold text-text-muted opacity-50"
            >
              Lấy mã nối
            </button>
          </div>
        )}

        {tt && tt.duocDung && (
          <div className="space-y-3 text-[12px] text-text-secondary">
            <p>
              Trạng thái:{" "}
              {tt.daNoi ? (
                <b className="text-green">đã nối</b>
              ) : (
                <b className="text-text">chưa nối</b>
              )}
              . Nhắn bot <b className="text-text">@{bot}</b> là hỏi trợ lý Main bằng đúng tài khoản của bạn.
            </p>

            {ma ? (
              <div className="space-y-2 rounded-sm border border-border bg-bg2 p-3">
                <div className="text-[11px] text-text-muted">Mã nối (hết hạn lúc {gioHet})</div>
                <div className="font-mono text-[26px] font-extrabold tracking-[0.3em] text-accent">{ma.ma}</div>
                <div>
                  Trên điện thoại:{" "}
                  <a
                    href={`https://t.me/${bot}?start=noi_${ma.ma}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-accent underline"
                  >
                    bấm vào đây
                  </a>{" "}
                  rồi bấm <b>Bắt đầu</b> trong Telegram.
                </div>
                <div>
                  Hoặc nhắn cho @{bot}: <code className="text-text">/noi {ma.ma}</code>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={dangLam}
                onClick={() => void layMa()}
                className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:opacity-60"
              >
                {tt.daNoi ? "Nối sang chat Telegram khác" : "Lấy mã nối"}
              </button>
            )}

            {tt.daNoi && (
              <button
                type="button"
                disabled={dangLam}
                onClick={() => void goNoi()}
                className="ml-2 rounded-sm border border-border px-3 py-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:border-red hover:text-red disabled:opacity-60"
              >
                Gỡ nối
              </button>
            )}
          </div>
        )}

        {moHuongDan && <HuongDanMoThang ma="noi-telegram" onClose={() => setMoHuongDan(false)} />}

        {loi && <div className="mt-2 text-[11.5px] font-semibold text-red">{loi}</div>}

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border px-3 py-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
