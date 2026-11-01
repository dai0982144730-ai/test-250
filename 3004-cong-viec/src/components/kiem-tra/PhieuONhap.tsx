"use client";
// Các ô nhập gắn mã đọc được từ file, đánh dấu đỏ đúng ô đang lỗi (vd Người lập còn "......").
import type { LoiKiemTra, MauWord } from "@/lib/types";

const BO_QUA = /^(mau_ma|noi_dung_\d+)$/;

export function PhieuONhap({ mau, oNhap, loi }: { mau: MauWord | null | undefined; oNhap: Record<string, string>; loi: LoiKiemTra[] }) {
  if (!mau) return null;
  const loiTheoTag = new Map<string, LoiKiemTra[]>();
  for (const l of loi) if (l.vi_tri?.tag && !l.vi_tri.bang) loiTheoTag.set(l.vi_tri.tag, [...(loiTheoTag.get(l.vi_tri.tag) ?? []), l]);
  const ds = mau.dinh_nghia.o_nhap.filter((o) => !BO_QUA.test(o.tag));
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {ds.map((o) => {
        const ls = loiTheoTag.get(o.tag) ?? [];
        const chan = ls.some((l) => l.muc === "chan");
        const canh = !chan && ls.some((l) => l.muc === "canh_bao");
        const v = oNhap[o.tag];
        const mat = !(o.tag in oNhap);
        return (
          <div
            key={o.tag}
            className={`rounded-sm border px-2.5 py-1.5 ${chan ? "border-red" : canh ? "border-yellow" : "border-border-light"}`}
            title={ls.map((l) => l.thong_diep).join("\n") || undefined}
          >
            <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
              <span>
                {o.nhan}
                {o.bat_buoc ? <span className="text-red"> *</span> : null}
              </span>
              <span className="font-mono">{o.tag}</span>
            </div>
            <div className={`truncate text-sm ${chan ? "text-red" : mat ? "italic text-text-muted" : "text-text"}`}>
              {mat ? "mất ô nhập" : v?.trim() ? v : <span className="italic text-text-muted">trống</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
