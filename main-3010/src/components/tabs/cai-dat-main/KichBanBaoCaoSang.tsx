"use client";

// ============================================================
// CÀI ĐẶT › 🔔 CẢNH BÁO & NGƯỠNG — phần của BÁO CÁO SÁNG (Mr. Đại chốt 25/10/2026)
//   · «Kịch bản định kỳ» (PLAN-MAIN-AGENT mục 7) — chuyển từ Báo cáo → tab Sáng sang đây
//   · «⚠️ Chưa hỏi được» — các nguồn bản báo cáo gần nhất không hỏi được (báo cáo VẪN GỬI, luật cứng 5)
// Dữ liệu lấy từ CÙNG đường /api/bao-cao-sang với màn Báo cáo, nên số hai nơi không thể lệch.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";
import { ngayGioVN, ngayTrongChu } from "@/lib/ngay-hien";
import type { BaoCaoSang, NhipDinhKy } from "@/lib/bao-cao-sang/model";

interface DuLieu {
  ok: boolean;
  ngay: string;
  baoCao: BaoCaoSang | null;
  nhip: NhipDinhKy[];
  trangThaiNhip: Record<string, string>;
  ketQuaNhip?: Record<string, { ngay: string; luc: string; loi: string | null; tomTat: string }>;
}

export function KichBanBaoCaoSang() {
  const coGhi = duocGhi(useSessionUser()?.role);
  const [d, setD] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, setDangChay] = useState<string | null>(null);
  const [bao, setBao] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const r = await fetch("/api/bao-cao-sang", { cache: "no-store" });
      const j = (await r.json()) as DuLieu & { message?: string };
      if (!j.ok) setLoi(j.message ?? "Không tải được dữ liệu báo cáo sáng.");
      else {
        setD(j);
        setLoi(null);
      }
    } catch {
      setLoi("Không gọi được máy chủ — thử tải lại trang.");
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);

  async function chayNgay(ma: string) {
    setDangChay(ma);
    setBao(null);
    try {
      const r = await fetch("/api/bao-cao-sang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hanhDong: "chay-nhip", ma }),
      });
      const j = (await r.json()) as { message?: string; tomTat?: string };
      setBao(j.tomTat ?? j.message ?? "Xong.");
      await tai();
    } catch {
      setBao("Không gọi được máy chủ — thử lại.");
    } finally {
      setDangChay(null);
    }
  }

  const thieu = d?.baoCao?.thieuSot ?? [];
  return (
    <div className="space-y-4">
      {loi && <p className="text-[12px] text-red">{loi}</p>}
      {bao && <p className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-accent">{bao}</p>}

      <SectionCard title="Kịch bản định kỳ" subtitle="Nhịp báo cáo sáng · chạy tay được để nhìn thấy nó chạy thật">
        {!d ? (
          <p className="text-[12px] text-text-muted">Đang tải…</p>
        ) : (
          <ul className="space-y-1.5">
            {d.nhip.map((n) => (
              <li key={n.ma} className="flex flex-wrap items-start justify-between gap-2 rounded-sm border border-border-light bg-bg2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-text">{n.ten}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">{n.moTa}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">
                    Lần tự chạy gần nhất: {d.trangThaiNhip[n.ma] ? ngayTrongChu(d.trangThaiNhip[n.ma]) : "chưa chạy lần nào"}
                  </div>
                  {d.ketQuaNhip?.[n.ma] && (
                    <div className={`mt-0.5 text-[11px] ${d.ketQuaNhip[n.ma].loi ? "text-red" : "text-text-muted"}`}>
                      Kết quả lần chạy {ngayGioVN(new Date(d.ketQuaNhip[n.ma].luc))}:{" "}
                      {d.ketQuaNhip[n.ma].loi ? `hỏng — ${d.ketQuaNhip[n.ma].loi}` : d.ketQuaNhip[n.ma].tomTat}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={dangChay !== null || !coGhi}
                  title={coGhi ? undefined : LY_DO_CHAN.ghi}
                  onClick={() => void chayNgay(n.ma)}
                  className="rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-text disabled:opacity-50"
                >
                  {dangChay === n.ma ? "Đang chạy…" : "Chạy ngay"}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-text-muted">
          Nhịp thứ năm — «issue đỏ mới thì nhắn ngay, không chờ sáng» — không theo giờ nên không nằm trong bảng này; bên sinh issue gọi thẳng.
        </p>
      </SectionCard>

      <SectionCard title="⚠️ Chưa hỏi được" subtitle={`Bản báo cáo sáng ${d ? ngayTrongChu(d.ngay) : ""} · ghi rõ ở đây, báo cáo VẪN GỬI (luật cứng 5)`}>
        {!d ? (
          <p className="text-[12px] text-text-muted">Đang tải…</p>
        ) : thieu.length === 0 ? (
          <p className="text-[12px] text-text-muted">✔ Bản gần nhất hỏi đủ mọi nguồn, không thiếu gì.</p>
        ) : (
          <ul className="space-y-1">
            {thieu.map((t, i) => (
              <li key={i} className="text-[12px] text-text-secondary">
                • <b className="text-text">{t.ten}</b>
                {t.tenDuAn ? ` · ${t.tenDuAn}` : " · mọi dự án"} — {t.lyDo}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
