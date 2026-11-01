"use client";

// Thẻ Cài đặt → KHO GOOGLE DRIVE — MỘT tài khoản duy nhất, cây SCI-AI-AGENT
// (CAU-TRUC-KHO-DU-LIEU mục 2). Giao diện theo mẫu bộ 2D-3D Mr. Đại gửi 01/09:
//  - Trạng thái kết nối: email + dung lượng + nút Kết nối / Ngắt.
//  - Khối "Dùng OAuth Client riêng": kéo credentials.json HOẶC nhập tay
//    Client ID/Secret + nút "Xem hướng dẫn từng bước" (modal 6 bước).
// Khóa + token mã hóa nằm data/drive.enc (đã chặn git) — client không bao giờ
// nhận lại secret, chỉ nhận trạng thái.

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { DriveGuide } from "./DriveGuide";
import { cauHanKhoa, tinhHanKhoa } from "@/lib/drive/han-khoa";

interface TrangThai {
  ok: boolean;
  coKhoa: boolean;
  loaiKhoa: string | null;
  nguonKhoa: string | null;
  clientIdRutGon: string | null;
  daKetNoi: boolean;
  email: string | null;
  dungLuong: string | null;
  /** Có khoá lưu nhưng gọi Google hỏng (khoá bị huỷ/hết hạn) — câu lỗi tiếng Việt */
  loiKetNoi?: string | null;
  /** epoch ms lúc Google cấp khoá làm mới — tính hạn 7 ngày */
  capLuc?: number | null;
  message?: string;
}

export function DriveConnectionCard() {
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [moHuongDan, setMoHuongDan] = useState(false);
  const [moNhapTay, setMoNhapTay] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [dangLam, setDangLam] = useState(false);
  const [thongBao, setThongBao] = useState<{ text: string; ok: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const nap = useCallback(async () => {
    try {
      const res = await fetch("/api/drive", { cache: "no-store" });
      setTt((await res.json()) as TrangThai);
    } catch {
      setTt(null);
    }
  }, []);

  useEffect(() => {
    void nap();
    // Quay về từ Google: /settings?drive=ok|<lỗi>
    const q = new URLSearchParams(window.location.search).get("drive");
    if (q === "ok") {
      setThongBao({ text: "✓ Đã kết nối Google Drive — kho SCI-AI-AGENT đã sẵn sàng", ok: true });
      window.history.replaceState(null, "", "/settings");
    } else if (q) {
      setThongBao({ text: q, ok: false });
      window.history.replaceState(null, "", "/settings");
    }
  }, [nap]);

  const bao = (text: string, ok: boolean) => {
    setThongBao({ text, ok });
    window.setTimeout(() => setThongBao(null), 6000);
  };

  const napJson = async (f: File) => {
    setDangLam(true);
    try {
      const noiDung = await f.text();
      const res = await fetch("/api/drive/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialsJson: noiDung }),
      });
      const j = (await res.json()) as { ok: boolean; message?: string; loai?: string };
      if (!j.ok) throw new Error(j.message ?? "Nạp khóa thất bại");
      bao(`✓ Đã lưu khóa (client kiểu ${j.loai === "installed" ? "Desktop" : "Ứng dụng web"}) — giờ bấm Kết nối Drive`, true);
      await nap();
    } catch (err) {
      bao(err instanceof Error ? err.message : "Nạp khóa thất bại", false);
    } finally {
      setDangLam(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const luuTay = async () => {
    setDangLam(true);
    try {
      const res = await fetch("/api/drive/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, clientSecret }),
      });
      const j = (await res.json()) as { ok: boolean; message?: string };
      if (!j.ok) throw new Error(j.message ?? "Lưu khóa thất bại");
      setClientId("");
      setClientSecret("");
      bao("✓ Đã lưu khóa — giờ bấm Kết nối Drive", true);
      await nap();
    } catch (err) {
      bao(err instanceof Error ? err.message : "Lưu khóa thất bại", false);
    } finally {
      setDangLam(false);
    }
  };

  const xoaKhoa = async () => {
    if (!window.confirm("Xóa khóa OAuth + ngắt kết nối Drive? (File trên Drive KHÔNG bị đụng tới)")) return;
    await fetch("/api/drive/config", { method: "DELETE" });
    bao("Đã xóa khóa & gỡ kết nối", true);
    await nap();
  };

  const ngat = async () => {
    await fetch("/api/drive/disconnect", { method: "POST" });
    bao("Đã ngắt kết nối (khóa vẫn giữ — bấm Kết nối để nối lại)", true);
    await nap();
  };

  const oNhap =
    "w-full rounded-sm border border-border bg-bg2 px-2 py-1.5 text-[12px] text-text outline-none focus:border-accent";

  return (
    <SectionCard
      title="Kho Google Drive"
      subtitle="MỘT tài khoản duy nhất — hệ tự dựng cây SCI-AI-AGENT theo bản chốt CAU-TRUC-KHO-DU-LIEU"
    >
      <div className="space-y-4 text-[12.5px]">
        {thongBao && (
          <div
            className={`rounded-sm border px-3 py-2 ${
              thongBao.ok
                ? "border-green/30 bg-green-soft text-green"
                : "border-red/30 bg-red-soft text-red"
            }`}
          >
            {thongBao.text}
          </div>
        )}

        {/* ===== Trạng thái kết nối ===== */}
        <div className="flex flex-wrap items-center gap-3">
          {tt?.daKetNoi && tt.loiKetNoi ? (
            // Có khoá lưu nhưng Google từ chối — KHÔNG hiện ✓, đưa thẳng nút nối lại (21/09: khoá chết mà thẻ vẫn xanh)
            <>
              <span className="font-semibold text-yellow">
                ⛔ Mất kết nối <b>{tt.email ?? ""}</b>: {tt.loiKetNoi}
              </span>
              <a
                href="/api/drive/connect"
                className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 font-bold text-accent transition hover:border-accent"
              >
                🔗 Kết nối lại
              </a>
            </>
          ) : tt?.daKetNoi ? (
            <>
              <span className="text-green">
                ✓ Đã kết nối: <b>{tt.email ?? "?"}</b>
                {tt.dungLuong ? ` · ${tt.dungLuong}` : ""}
              </span>
              {(() => {
                const h = tinhHanKhoa(tt.capLuc, Date.now());
                if (h.muc === "khong-ro") return null;
                const gap = h.muc !== "con-han";
                return (
                  <>
                    <span className={gap ? "font-semibold text-yellow" : "text-text-muted"}>
                      {gap ? "⚠ " : ""}
                      {cauHanKhoa(h)}
                    </span>
                    {gap && (
                      <a
                        href="/api/drive/connect"
                        className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 font-bold text-accent transition hover:border-accent"
                      >
                        🔗 Kết nối lại
                      </a>
                    )}
                  </>
                );
              })()}
              <button
                type="button"
                onClick={() => void ngat()}
                className="rounded-sm border border-border px-3 py-1.5 font-bold text-text-secondary transition hover:border-red hover:text-red"
              >
                Ngắt kết nối
              </button>
            </>
          ) : (
            <>
              <span className="text-text-secondary">
                {tt?.coKhoa
                  ? "Khóa đã sẵn sàng — bấm Kết nối rồi chọn tài khoản Google của kho."
                  : "Chưa có khóa OAuth — nạp credentials.json hoặc nhập tay bên dưới (làm MỘT lần)."}
              </span>
              <a
                href="/api/drive/connect"
                className={`rounded-sm border px-3 py-1.5 font-bold transition ${
                  tt?.coKhoa
                    ? "border-accent/50 bg-accent-soft text-accent hover:border-accent"
                    : "pointer-events-none border-border text-text-muted opacity-50"
                }`}
              >
                🔗 Kết nối Drive
              </a>
            </>
          )}
        </div>

        {/* ===== Dùng OAuth Client riêng ===== */}
        <div className="grid gap-4 border-t border-border-light pt-3 md:grid-cols-[240px_1fr]">
          <div>
            <div className="font-bold text-accent">Dùng OAuth Client riêng</div>
            <p className="mt-1 text-[11.5px] text-text-muted">
              Tạo một lần trên Google Cloud của công ty, dùng mãi. Khóa được mã hóa lưu trong máy,
              không bao giờ vào git.
            </p>
            <button
              type="button"
              onClick={() => setMoHuongDan(true)}
              className="mt-2 rounded-sm border border-border px-3 py-1.5 font-bold text-text-secondary transition hover:border-accent hover:text-accent"
            >
              📖 Xem hướng dẫn từng bước
            </button>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              disabled={dangLam}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void napJson(f);
              }}
              className="flex w-full flex-col items-center gap-1 rounded border-2 border-dashed border-border px-4 py-5 text-text-muted transition hover:border-accent hover:text-accent"
            >
              <span className="text-lg">⬆</span>
              <b className="text-accent">Kéo tệp credentials.json vào đây</b>
              <span className="text-[11px]">hoặc bấm để chọn tệp</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void napJson(f);
              }}
            />
            {tt?.coKhoa && (
              <div className="text-green">
                ✓ Đã có khóa · client kiểu{" "}
                <b>{tt.loaiKhoa === "installed" ? "Desktop" : "Ứng dụng web"}</b> ·{" "}
                <span className="font-mono text-[11px]">{tt.clientIdRutGon}</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMoNhapTay((v) => !v)}
              className="text-[11.5px] text-text-muted underline underline-offset-2 hover:text-accent"
            >
              {moNhapTay ? "▲ Ẩn nhập tay" : "▼ Hoặc nhập tay Client ID / Secret"}
            </button>
            {moNhapTay && (
              <div className="space-y-2">
                <input
                  className={oNhap}
                  placeholder="123456-abc.apps.googleusercontent.com"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
                <input
                  className={oNhap}
                  type="password"
                  placeholder="GOCSPX-…"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              {moNhapTay && (
                <button
                  type="button"
                  disabled={dangLam || clientId.trim() === "" || clientSecret.trim() === ""}
                  onClick={() => void luuTay()}
                  className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 font-bold text-accent transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Lưu khóa
                </button>
              )}
              {tt?.coKhoa && (
                <button
                  type="button"
                  onClick={() => void xoaKhoa()}
                  className="rounded-sm border border-border px-3 py-1.5 font-bold text-text-secondary transition hover:border-red hover:text-red"
                >
                  Xóa khóa &amp; gỡ kết nối
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {moHuongDan && <DriveGuide onClose={() => setMoHuongDan(false)} />}
    </SectionCard>
  );
}
