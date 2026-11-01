"use client";

// ============================================================
// TỪ ĐIỂN NGỮ CẢNH — "Cơ cấu tổ chức và danh mục dự án" (LOI-DUNG-CHUNG 6f)
// ⭐ 04/10/2026 (Mr. Đại chốt, CHOT 6g.7 mục 5): Main TỰ GHÉP phần dự án + sơ đồ tổ chức + chức năng nhiệm vụ từ dữ
// liệu gốc của Main (lib/tu-dien-ngu-canh.ts). Người chỉ gõ HAI ô: "Tập đoàn và các công ty thành viên" và "Chỗ bổ sung".
// Mục giải mã tiền tố Base.vn bỏ. Bản đầy đủ các agent đọc hiện ở khối "Xem bản các agent đọc" (chỉ đọc).
// Trước đây ô này gửi cả khối gõ tay lên /api/cai-dat-base và bị chặn 403 "chỉ sửa ở Agent Base" (đo 04/10) — đã gỡ.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Loader2, Save } from "lucide-react";
import type { CaiDatBase } from "@/lib/cai-dat-base";

export function TuDienNguCanh() {
  const [congTy, setCongTy] = useState("");
  const [boSung, setBoSung] = useState("");
  const [goc, setGoc] = useState({ congTy: "", boSung: "" });
  const [ghep, setGhep] = useState("");
  const [dangNap, setDangNap] = useState(true);
  const [dangLuu, setDangLuu] = useState(false);
  const [bao, setBao] = useState<{ ok: boolean; chu: string } | null>(null);
  const [xemBan, setXemBan] = useState(false);

  const nap = useCallback(async () => {
    try {
      const r = await fetch("/api/cai-dat-base", { cache: "no-store" });
      const j = (await r.json()) as { ok: boolean; cauHinh: CaiDatBase; tuDienGhep?: string };
      if (j.ok) {
        setCongTy(j.cauHinh.tuDienCongTy);
        setBoSung(j.cauHinh.tuDienBoSung);
        setGoc({ congTy: j.cauHinh.tuDienCongTy, boSung: j.cauHinh.tuDienBoSung });
        setGhep(j.tuDienGhep ?? "");
      }
    } finally {
      setDangNap(false);
    }
  }, []);

  useEffect(() => {
    void nap();
  }, [nap]);

  const luu = async () => {
    setDangLuu(true);
    setBao(null);
    try {
      const r = await fetch("/api/cai-dat-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuDienCongTy: congTy, tuDienBoSung: boSung }),
      });
      const j = (await r.json()) as { ok: boolean; message?: string };
      setBao(j.ok ? { ok: true, chu: "✓ Đã lưu — đã đẩy bản mới sang các agent" } : { ok: false, chu: j.message ?? "Lưu không được" });
      if (j.ok) await nap();
    } catch {
      setBao({ ok: false, chu: "Không gọi được máy chủ" });
    } finally {
      setDangLuu(false);
      window.setTimeout(() => setBao(null), 5000);
    }
  };

  const doiChua = congTy !== goc.congTy || boSung !== goc.boSung;
  const oGo = "mt-1 w-full resize-y rounded-sm border border-border bg-bg2 px-2.5 py-2 font-mono text-[11.5px] leading-relaxed text-text outline-none focus:border-accent";

  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div>
          <div className="text-[13px] font-bold text-text">Sơ đồ tổ chức và dự án — từ điển ngữ cảnh dùng chung</div>
          <p className="mt-1 max-w-[820px] text-[11.5px] leading-relaxed text-text-secondary">
            Các agent đọc từ điển này khi gặp tên viết tắt lạ. <strong className="text-text">Phần dự án và sơ đồ tổ chức máy tự ghép</strong> từ
            Quản lý dự án và sơ đồ tổ chức của Main — muốn đổi thì đổi ở đó. Ở đây chỉ gõ hai ô dưới.
          </p>
        </div>
      </div>

      {dangNap ? (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang nạp…
        </div>
      ) : (
        <>
          <label className="mt-3 block text-[12px] font-bold text-text">
            A. Tập đoàn và các công ty thành viên
            <span className="ml-2 font-normal text-text-muted">{congTy.length.toLocaleString("vi-VN")} ký tự</span>
          </label>
          <textarea value={congTy} onChange={(e) => setCongTy(e.target.value)} rows={6} className={oGo} placeholder="Tên công ty, viết tắt hay gặp, lĩnh vực…" />

          <label className="mt-3 block text-[12px] font-bold text-text">
            D. Chỗ bổ sung
            <span className="ml-2 font-normal text-text-muted">{boSung.length.toLocaleString("vi-VN")} ký tự</span>
          </label>
          <textarea value={boSung} onChange={(e) => setBoSung(e.target.value)} rows={6} className={oGo} placeholder="Tên gọi khác, ghi chú thêm cho AI…" />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={dangLuu || !doiChua}
              onClick={() => void luu()}
              className="flex items-center gap-1.5 rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition hover:border-accent disabled:opacity-50"
            >
              {dangLuu ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Lưu hai ô
            </button>
            {bao && <span className={`text-[12px] font-semibold ${bao.ok ? "text-green" : "text-red"}`}>{bao.chu}</span>}
            {doiChua && !bao && <span className="text-[11.5px] text-text-muted">Có thay đổi chưa lưu</span>}
          </div>

          <button
            type="button"
            onClick={() => setXemBan((x) => !x)}
            className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-text-secondary hover:text-accent"
          >
            {xemBan ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Xem bản các agent đọc ({ghep.length.toLocaleString("vi-VN")} ký tự — A, D gõ tay · B dự án, C sơ đồ tổ chức máy ghép)
          </button>
          {xemBan && (
            <pre className="mt-1 max-h-[480px] overflow-auto whitespace-pre-wrap rounded-sm border border-border-light bg-bg2 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-text-secondary">
              {ghep}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
