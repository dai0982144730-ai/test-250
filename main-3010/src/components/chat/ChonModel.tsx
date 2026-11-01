"use client";

// Nút chọn MODEL + vòng tròn NGỮ CẢNH của trợ lý (S8 tầng 2 — Mr. Đại 05/09,
// kèm ảnh mẫu "Fable 5 · Medium · ○").
// - Chip hiện model đang dùng; bấm xổ danh sách THẬT (CLI: 3 bí danh; API: hỏi
//   provider /models) — chọn MỘT PHÁT là áp dụng và đóng (nếp bớt cú bấm).
// - Vòng tròn ngữ cảnh: xanh bình thường · VÀNG ≥60% cần chú ý · ĐỎ ≥85% cảnh
//   báo (nên mở phiên mới). Số % là ƯỚC theo ký tự (÷4) trên trần 200K token —
//   tooltip nói rõ chữ "ước", không giả vờ đo được số thật.

import { useEffect, useRef, useState } from "react";

interface MotModel {
  id: string;
  nhan: string;
}

interface KqModel {
  ok: boolean;
  message?: string;
  mode?: string;
  daCauHinh?: boolean;
  dangChon?: string;
  hienTai?: string;
  danhSach?: MotModel[];
  ghiChu?: string;
}

/** Vòng tròn % ngữ cảnh — SVG 14px, đổi màu theo mức */
export function VongNguCanh({ uocToken, tran }: { uocToken: number; tran: number }) {
  const pct = Math.min(100, Math.round((uocToken / tran) * 100));
  const mau = pct >= 85 ? "var(--red)" : pct >= 60 ? "var(--yellow)" : "var(--green)";
  const r = 5.5;
  const chuVi = 2 * Math.PI * r;
  return (
    <span
      title={
        `Ngữ cảnh phiên: ~${Math.round(uocToken / 1000).toLocaleString("vi-VN")}K/${Math.round(tran / 1000).toLocaleString("vi-VN")}K token (${pct}% — ƯỚC theo ký tự).` +
        (pct >= 85
          ? " ĐỎ: phiên đã rất dài — nên mở phiên mới kẻo trợ lý quên đầu quên đuôi."
          : pct >= 60
            ? " VÀNG: phiên đang dài — sắp nên mở phiên mới."
            : "")
      }
      className="inline-flex shrink-0 items-center"
    >
      <svg width="14" height="14" viewBox="0 0 14 14">
        <circle cx="7" cy="7" r={r} fill="none" stroke="var(--border)" strokeWidth="2.5" />
        <circle
          cx="7"
          cy="7"
          r={r}
          fill="none"
          stroke={mau}
          strokeWidth="2.5"
          strokeDasharray={`${(pct / 100) * chuVi} ${chuVi}`}
          strokeLinecap="round"
          transform="rotate(-90 7 7)"
        />
      </svg>
    </span>
  );
}

export function ChonModel({ duocDoi }: { duocDoi: boolean }) {
  const [mo, setMo] = useState(false);
  const [hienTai, setHienTai] = useState<string | null>(null);
  const [dangChon, setDangChon] = useState("");
  const [danhSach, setDanhSach] = useState<MotModel[]>([]);
  const [ghiChu, setGhiChu] = useState("");
  const [dangDoi, setDangDoi] = useState(false);
  const khung = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetch("/api/tro-ly/model", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: KqModel) => {
        if (!j.ok) return;
        setHienTai(j.hienTai ?? null);
        setDangChon(j.dangChon ?? "");
        setDanhSach(j.danhSach ?? []);
        setGhiChu(j.ghiChu ?? "");
      })
      .catch(() => setHienTai(null));
  }, []);

  // bấm ra ngoài thì đóng
  useEffect(() => {
    if (!mo) return;
    const dong = (e: MouseEvent) => {
      if (khung.current && !khung.current.contains(e.target as Node)) setMo(false);
    };
    document.addEventListener("mousedown", dong);
    return () => document.removeEventListener("mousedown", dong);
  }, [mo]);

  async function chon(id: string): Promise<void> {
    setDangDoi(true);
    try {
      const r = await fetch("/api/tro-ly/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: id }),
      });
      const j = (await r.json()) as KqModel;
      if (j.ok) {
        setHienTai(j.hienTai ?? null);
        setDangChon(j.dangChon ?? "");
      }
    } catch {
      // giữ nguyên — lỗi mạng thì chip không đổi
    } finally {
      setDangDoi(false);
      setMo(false); // chọn phát là đóng
    }
  }

  if (hienTai === null) return null; // chưa đọc được cấu hình — không bày chip hỏng

  return (
    <div ref={khung} className="relative shrink-0">
      <button
        type="button"
        onClick={() => duocDoi && setMo((v) => !v)}
        data-lenh="chat.doi-model.mo"
        disabled={dangDoi}
        title={
          duocDoi
            ? "Model trợ lý đang dùng — bấm để đổi (áp dụng ngay câu chat sau)"
            : `Model trợ lý: ${hienTai} — Người xem không đổi được (cần loại Người dùng trở lên)`
        }
        className="flex items-center gap-1 rounded-[8px] border border-border px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
      >
        {dangDoi ? "…" : hienTai}
        {duocDoi && <span className="text-[8px] opacity-70">▾</span>}
      </button>
      {mo && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[240px] rounded border border-border bg-surface p-1 shadow-card">
          {danhSach.map((m) => (
            <button
              key={m.id || "(mac-dinh)"}
              type="button"
              onClick={() => void chon(m.id)}
              data-lenh="chat.doi-model"
              data-gia-tri={m.nhan}
              className={`block w-full truncate rounded-sm px-2 py-1 text-left text-[11.5px] transition-colors hover:bg-accent-soft hover:text-accent ${
                m.id === dangChon ? "font-bold text-accent" : "text-text"
              }`}
            >
              {m.id === dangChon ? "✓ " : ""}
              {m.nhan}
            </button>
          ))}
          {ghiChu !== "" && (
            <div className="border-t border-border px-2 pt-1 text-[10px] text-text-secondary">{ghiChu}</div>
          )}
        </div>
      )}
    </div>
  );
}
