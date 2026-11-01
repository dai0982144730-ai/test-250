"use client";

// 📍 TOẠ ĐỘ CÔNG TRƯỜNG — Mr. Đại 11/09/2026: "cấu hình lại mỗi dự án có 1 toạ độ khác nhau".
// Trước: chỉ hiện/sửa toạ độ của dự án đang chọn ở top menu (dễ tưởng là một toạ độ chung).
// Nay: BẢNG mọi dự án đang hoạt động, mỗi dòng một cặp vĩ độ/kinh độ + Lưu. Chỉ Main khai
// (bản gốc), tiến độ kéo về để lấy dự báo thời tiết Open-Meteo.

import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { useSessionUser } from "@/lib/use-session";
import { duocCaiDat } from "@/lib/quyen";

interface DuAn { id: string; name: string; ma?: string; viDo?: number; kinhDo?: number; archived?: boolean }

export function ToaDoCongTruong() {
  const user = useSessionUser();
  const [ds, setDs] = useState<DuAn[]>([]);
  const [o, setO] = useState<Record<string, { vi: string; kinh: string }>>({});
  const [dangLuu, setDangLuu] = useState<string | null>(null);
  const [nhan, setNhan] = useState<{ id: string; chu: string; ok: boolean } | null>(null);

  const nap = useCallback(async () => {
    try {
      const r = await fetch("/api/projects?all=1", { cache: "no-store" });
      const j = (await r.json()) as { projects?: DuAn[] };
      const list = (j.projects ?? []).filter((p) => p.id !== "default" && !p.archived);
      setDs(list);
      const m: Record<string, { vi: string; kinh: string }> = {};
      for (const p of list) m[p.id] = { vi: p.viDo !== undefined ? String(p.viDo) : "", kinh: p.kinhDo !== undefined ? String(p.kinhDo) : "" };
      setO(m);
    } catch {
      setDs([]);
    }
  }, []);
  useEffect(() => { void nap(); }, [nap]);

  // Màn Cài đặt đã chặn ở middleware (cửa "caidat"); chốt thêm ở đây cho chắc
  if (!duocCaiDat(user?.role)) return null;

  const luu = async (id: string) => {
    setDangLuu(id);
    setNhan(null);
    try {
      const v = o[id] ?? { vi: "", kinh: "" };
      const r = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, viDo: v.vi.trim() === "" ? null : v.vi.trim(), kinhDo: v.kinh.trim() === "" ? null : v.kinh.trim() }),
      });
      const j = (await r.json()) as { ok: boolean; message?: string };
      setNhan({ id, chu: j.ok ? "Đã lưu — tiến độ nhận ngay để lấy dự báo thời tiết." : (j.message ?? "Không lưu được."), ok: j.ok });
      if (j.ok) await nap();
    } catch (e) {
      setNhan({ id, chu: e instanceof Error ? e.message : "Không lưu được.", ok: false });
    } finally {
      setDangLuu(null);
    }
  };

  const inp = "w-[120px] rounded-sm border border-border bg-bg2 px-2 py-1 text-[12px] text-text outline-none focus:border-accent";

  return (
    <SectionCard title="📍 Toạ độ công trường — mỗi dự án một toạ độ, để lấy dự báo thời tiết" subtitle="Chỉ khai ở Main; Agent tiến độ kéo về. Lấy nhanh: Google Maps → chuột phải vào công trường → số hiện ra là vĩ độ, kinh độ">
      <div className="scroll-thin overflow-x-auto">
        <table className="tbl">
          <thead><tr><th>Mã</th><th>Dự án</th><th>Vĩ độ (−90…90)</th><th>Kinh độ (−180…180)</th><th /></tr></thead>
          <tbody>
            {ds.length === 0 && <tr><td colSpan={5} className="text-[11.5px] text-text-muted">Chưa có dự án nào — khai ở bảng Dự án phía trên.</td></tr>}
            {ds.map((p) => (
              <tr key={p.id}>
                <td>{p.ma ? <b className="text-accent">{p.ma}</b> : <span className="text-[10.5px] text-red">chưa có mã</span>}</td>
                <td className="text-text">{p.name}</td>
                <td><input className={inp} inputMode="decimal" placeholder="16.75" value={o[p.id]?.vi ?? ""} onChange={(e) => setO((m) => ({ ...m, [p.id]: { vi: e.target.value, kinh: m[p.id]?.kinh ?? "" } }))} data-lenh="settings.vi-do" data-gia-tri={p.ma ?? p.id} /></td>
                <td><input className={inp} inputMode="decimal" placeholder="106.60" value={o[p.id]?.kinh ?? ""} onChange={(e) => setO((m) => ({ ...m, [p.id]: { vi: m[p.id]?.vi ?? "", kinh: e.target.value } }))} data-lenh="settings.kinh-do" data-gia-tri={p.ma ?? p.id} /></td>
                <td>
                  <button type="button" onClick={() => void luu(p.id)} disabled={dangLuu === p.id} data-lenh="settings.luu-toa-do" data-gia-tri={p.ma ?? p.id}
                    className="flex items-center gap-1.5 rounded-sm border border-accent bg-accent-soft px-2.5 py-1 text-[11.5px] font-bold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50">
                    <MapPin className="h-3.5 w-3.5" /> {dangLuu === p.id ? "Đang lưu…" : "Lưu"}
                  </button>
                  {nhan?.id === p.id && <div className={`mt-1 text-[11px] ${nhan.ok ? "text-green" : "text-red"}`}>{nhan.chu}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
