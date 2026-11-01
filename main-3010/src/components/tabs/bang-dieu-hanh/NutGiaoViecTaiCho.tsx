"use client";

// ============================================================
// NÚT "GIAO VIỆC" NGAY TRÊN BẢNG ĐIỀU HÀNH — chốt AZ "giao việc tại chỗ"
//
// Demo nguồn: demo-agent-main.html màn "bdh" khối ⑤ (Hồ sơ pháp lý đang thiếu)
// và ⑥ (Đang tắc ở bàn ai) — mỗi dòng CHƯA thành issue có một nút, bấm là mở
// ô giao việc ĐIỀN SẴN tên + mô tả (demo: hàm moGiao(ten, mota)).
//
// ⭐ 04/10/2026 (Mr. Đại chốt — CHOT LOI-DUNG-CHUNG 6g.7 mục 3): giao sang AGENT CÔNG VIỆC, bỏ Base.vn.
// ⛔ Không viết ô thứ hai: dùng lại đúng FormGiaoCongViec của màn Việc của tôi (luật 7) — ô giống "+" của agent Công việc
//    (04/10 chiều: dự án không bắt buộc, Kết quả cần có, 📎). Payload: POST /api/viec { action: "giao-tai-cho", … }.
// ============================================================

import { useState } from "react";
import { FormGiaoCongViec, type GuiGiaoCV } from "@/components/tabs/viec/FormGiaoCongViec";
import type { NguoiNhanCV } from "@/lib/chung/viec-cong-viec-kieu";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";

export function NutGiaoViecTaiCho({
  ten,
  moTa,
  maDuAn,
  nhan = "Giao việc",
}: {
  /** Tên việc điền sẵn */
  ten: string;
  /** Mô tả điền sẵn — nói rõ vì sao giao, để người nhận không phải hỏi lại */
  moTa: string;
  /** Mã ngắn dự án đang chọn trên Bảng điều hành (rỗng → ô chọn dự án hiện ra) */
  maDuAn: string;
  /** Chữ trên nút — demo dùng "Giao việc" ở khối ⑤, "Nhắc" ở khối ⑥ */
  nhan?: string;
}) {
  const [mo, setMo] = useState(false);
  // Giao việc = cửa "ghi" (quyen.ts) — Người xem thấy nút MỜ kèm lý do
  const coGhi = duocGhi(useSessionUser()?.role);
  const [dangGui, setDangGui] = useState(false);
  const [bao, setBao] = useState<{ ok: boolean; chu: string } | null>(null);
  const [ds, setDs] = useState<NguoiNhanCV | null>(null);
  const [loiDs, setLoiDs] = useState<string | null>(null);

  async function moO(): Promise<void> {
    setMo(true);
    setBao(null);
    if (ds) return;
    try {
      const j = (await (await fetch("/api/viec/nguoi-nhan", { cache: "no-store" })).json()) as {
        ok: boolean;
        ds?: NguoiNhanCV;
        message?: string;
      };
      if (j.ok && j.ds) setDs(j.ds);
      else setLoiDs(j.message ?? "Không lấy được danh sách người nhận");
    } catch {
      setLoiDs("Không gọi được máy chủ app");
    }
  }

  async function gui(x: GuiGiaoCV): Promise<void> {
    setDangGui(true);
    setBao(null);
    try {
      const r = await fetch("/api/viec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "giao-tai-cho", ...x }),
      });
      const j = (await r.json()) as { ok: boolean; maViec?: string | null; message?: string };
      if (j.ok) {
        setMo(false);
        setBao({ ok: true, chu: `✓ Đã giao cho ${x.tenNhan} — việc ${j.maViec ?? ""} ở agent Công việc` });
      } else setBao({ ok: false, chu: j.message ?? "Có lỗi, thử lại." });
    } catch {
      setBao({ ok: false, chu: "Không gọi được máy chủ app — thử lại sau vài giây." });
    } finally {
      setDangGui(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void moO()}
        disabled={!coGhi}
        title={coGhi ? "Giao sang agent Công việc" : LY_DO_CHAN.ghi}
        data-lenh="bdh.giao-viec"
        data-gia-tri={ten}
        className="shrink-0 rounded-sm border border-border bg-surface px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {nhan}
      </button>
      {bao?.ok && !mo && <span className="ml-1 text-[10.5px] font-semibold text-green">{bao.chu}</span>}
      {mo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setMo(false)}>
          <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col rounded border border-border bg-bg p-4 shadow-card" onClick={(e) => e.stopPropagation()}>
            <FormGiaoCongViec
              tieuDe="Giao việc sang agent Công việc"
              laAi={false}
              banDau={{ maDuAn, ten, ketQua: moTa }}
              ds={ds}
              loiDs={loiDs}
              duocGiao={coGhi}
              dangGui={dangGui}
              loi={bao && !bao.ok ? bao.chu : null}
              lenhGui="bdh.gui-giao"
              onDong={() => setMo(false)}
              onGui={(x: GuiGiaoCV) => void gui(x)}
            />
          </div>
        </div>
      )}
    </>
  );
}
