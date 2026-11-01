"use client";

// ============================================================
// KHỐI LUẬT ĐỘNG — PLAN-MAIN-AGENT mục 6.2
//
// ⭐ "Mọi luật đều XEM và XOÁ ĐƯỢC trên màn hình. Không có luật ẩn."
//    Vì vậy màn này hiện CẢ cách tính hiệu lực, cả luật đã hết hạn, và mỗi
//    dòng có nút Xoá riêng. Không có luật nào chỉ tồn tại trong file.
//
// Ô nhập nhận đúng câu tiếng Việt người dùng vẫn nhắn qua Telegram; câu được
// đọc bằng CODE ở máy chủ (docCauNhan), không tốn lượt LLM nào.
// ============================================================

import { useState } from "react";
import { SectionCard, InfoBox } from "@/components/common/SectionCard";
import { NHAN_PHAM_VI, type LuatBaoCao } from "@/lib/bao-cao-sang/luat";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export interface LuatHienThi extends LuatBaoCao {
  moTa: string;
}

const VI_DU = [
  "sáng mai báo kỹ về HP1",
  "từ nay bỏ mục nhân lực",
  "tuần này theo dõi sát nhà thầu TS",
  "đang bật những luật gì?",
];

function MauPhamVi(l: LuatBaoCao): string {
  if (l.phamVi === "khong-han") return "text-red";
  if (l.phamVi === "tuan-nay") return "text-yellow";
  return "text-text-secondary";
}

function DongLuat({
  l,
  mo,
  onXoa,
}: {
  l: LuatHienThi;
  /** false = đã hết hạn, hiện mờ */
  mo: boolean;
  onXoa: (ma: string) => void;
}) {
  // Nút gọi AI / ghi = cửa "ghi" (quyen.ts) — Người xem thấy nút MỜ kèm lý do (luật 17)
  const coGhi = duocGhi(useSessionUser()?.role);

  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-2 rounded-sm border border-border-light bg-bg2 px-3 py-2 ${
        mo ? "" : "opacity-70" /* 09/10 Q4: luật đang tắt mờ 70% như nút khoá — vẫn đọc được */
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] text-text">{l.noiDung}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
          <span className={`font-semibold ${MauPhamVi(l)}`}>
            {NHAN_PHAM_VI[l.phamVi]}
          </span>
          <span>{l.moTa}</span>
          <span>· {l.nguoiDat}</span>
          <span>· qua {l.nguon}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onXoa(l.ma)}
        disabled={!coGhi}
        title={coGhi ? undefined : LY_DO_CHAN.ghi}
        className="rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-red/50 hover:text-red disabled:cursor-not-allowed disabled:opacity-50"
      >
        Xoá
      </button>
    </li>
  );
}

export function KhoiLuat({
  conHieuLuc,
  hetHan,
  ghiChu,
  onLamMoi,
}: {
  conHieuLuc: LuatHienThi[];
  hetHan: LuatHienThi[];
  ghiChu: string;
  onLamMoi: () => void;
}) {
  // Nút gọi AI / ghi = cửa "ghi" (quyen.ts) — Người xem thấy nút MỜ kèm lý do (luật 17)
  const coGhi = duocGhi(useSessionUser()?.role);
  const [cau, setCau] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const [traLoi, setTraLoi] = useState<string | null>(null);
  const [xemHetHan, setXemHetHan] = useState(false);

  async function guiCau() {
    if (cau.trim() === "" || dangGui) return;
    setDangGui(true);
    setTraLoi(null);
    try {
      const r = await fetch("/api/bao-cao-sang/luat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cau, nguon: "khung chat" }),
      });
      const j = (await r.json()) as { message?: string };
      setTraLoi(j.message ?? "Đã xử lý.");
      setCau("");
      onLamMoi();
    } catch {
      setTraLoi("Không gọi được máy chủ — thử lại.");
    } finally {
      setDangGui(false);
    }
  }

  async function xoa(ma: string) {
    try {
      const r = await fetch(`/api/bao-cao-sang/luat?ma=${encodeURIComponent(ma)}`, {
        method: "DELETE",
      });
      const j = (await r.json()) as { message?: string };
      setTraLoi(j.message ?? "Đã xoá.");
      onLamMoi();
    } catch {
      setTraLoi("Không xoá được — thử lại.");
    }
  }

  return (
    <SectionCard
      gap
      title={`Luật động (${conHieuLuc.length} đang bật)`}
    >
      <div className="space-y-3">
        <KhaiHuongDan ma="bcs-luat" uuTien={0} />
        <InfoBox title="⭐ Cách tính hiệu lực">{ghiChu}</InfoBox>

        <div className="flex flex-wrap gap-2">
          <input
            value={cau}
            onChange={(e) => setCau(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void guiCau();
            }}
            placeholder="ví dụ: tuần này theo dõi sát nhà thầu TS"
            className="min-w-[260px] flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-[12.5px] text-text outline-none focus:border-accent/60"
          />
          <button
            type="button"
            disabled={dangGui || !coGhi}
            title={coGhi ? undefined : LY_DO_CHAN.ghi}
            onClick={() => void guiCau()}
            className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-2 text-[12px] font-semibold text-accent transition disabled:opacity-50"
          >
            {dangGui ? "Đang đọc câu…" : "Nhắn cho Main Agent"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {VI_DU.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setCau(v)}
              className="rounded-sm border border-border bg-surface px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/40 hover:text-text"
            >
              {v}
            </button>
          ))}
        </div>

        {traLoi && (
          <p className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-accent">
            {traLoi}
          </p>
        )}

        {conHieuLuc.length === 0 ? (
          <p className="text-[12.5px] text-text-secondary">
            Đang không có luật nào — báo cáo sáng chạy theo khung mặc định. Đây là trạng thái bình
            thường, không phải hỏng.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {conHieuLuc.map((l) => (
              <DongLuat key={l.ma} l={l} mo onXoa={(m) => void xoa(m)} />
            ))}
          </ul>
        )}

        {hetHan.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setXemHetHan((v) => !v)}
              className="text-[11.5px] font-semibold text-text-muted underline-offset-2 hover:text-text hover:underline"
            >
              {xemHetHan ? "Ẩn" : "Xem"} {hetHan.length} luật đã hết hạn (tự rụng, không cần dọn)
            </button>
            {xemHetHan && (
              <ul className="mt-2 space-y-1.5">
                {hetHan.map((l) => (
                  <DongLuat key={l.ma} l={l} mo={false} onXoa={(m) => void xoa(m)} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
