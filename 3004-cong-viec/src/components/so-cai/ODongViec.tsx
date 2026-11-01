"use client";
// Ô "Đóng việc" (dùng chung Sổ cái + Issue): gõ báo cáo ngắn cho người giao việc rồi đóng các phần việc
// của bộ phận mình. Người giao việc và cấp trên của bộ phận nhận thông báo kèm báo cáo (so-cai/dich-vu.ts).
import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { goiApi, type DongViecUi } from "./giao-dien";

export function ODongViec({
  v,
  onXong,
  onHuy,
}: {
  v: DongViecUi;
  onXong: (thongDiep: string) => void;
  onHuy: () => void;
}) {
  const [baoCao, setBaoCao] = useState("");
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const cuaToi = v.phan_viec.filter((p) => v.co_the_ket_thuc?.includes(p.id));
  const boPhan = Array.from(new Set(cuaToi.map((p) => p.phu_trach_ten ?? p.phu_trach_id)));

  async function dong() {
    const noiDung = baoCao.trim();
    if (!noiDung) return setLoi("Gõ vài dòng báo cáo cho người giao việc trước khi đóng");
    setDang(true);
    setLoi(null);
    try {
      let r = { tien_do: v.tien_do, hoan_thanh: false };
      for (const p of cuaToi) {
        r = await goiApi(`/api/cong-viec/${encodeURIComponent(v.id)}`, { hanh_dong: "ket_thuc", phan_viec_id: p.id, ghi_chu: noiDung, tep_ket_qua: [] });
      }
      onXong(
        r.hoan_thanh
          ? `Đã đóng ${v.id}: việc hoàn thành, rời sổ cái. Người giao việc và cấp trên đã được báo.`
          : `Đã đóng phần của ${boPhan.join(", ")} trong ${v.id} (${r.tien_do}). Người giao việc và cấp trên đã được báo.`,
      );
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-start gap-2">
        <textarea
          autoFocus
          value={baoCao}
          onChange={(e) => setBaoCao(e.target.value)}
          rows={2}
          placeholder={`Báo cáo ngắn gọn cho người giao việc, vd: "Đã thay relay R21, chạy thử đạt ngày 25/09"`}
          className="min-w-[320px] flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled={dang}
            onClick={() => void dong()}
            className="inline-flex items-center gap-1 rounded-sm bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {dang ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Gửi báo cáo & xong việc
          </button>
          <button type="button" onClick={onHuy} className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
            <X size={12} /> Hủy
          </button>
        </div>
      </div>
      <div className="mt-1 text-[11px] text-text-muted">Người giao việc và cấp trên của {boPhan.join(", ")} sẽ nhận được báo cáo này.</div>
      {loi ? <div className="mt-1 text-sm text-red">{loi}</div> : null}
    </div>
  );
}
