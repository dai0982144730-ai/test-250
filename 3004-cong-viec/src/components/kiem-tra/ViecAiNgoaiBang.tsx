"use client";
// "✨ Việc AI tìm thấy ngoài bảng": việc cần làm viết trong phần chữ tự do của báo cáo mà quy tắc cố định không lấy được.
// Mỗi việc kèm câu gốc; người gửi (hoặc quản trị khi rà soát) tích chọn, sửa tên / người làm / hạn, chọn gộp vào việc cũ.
// Việc được chọn vào sổ cái như một dòng việc (vẫn phải có hạn). Dùng ở khung gửi và ở Rà soát sổ cái.
import type { ViecNgoaiBang } from "@/lib/so-cai/ai-ra-viec";
import ONhapNgay from "@/components/common/ONhapNgay";

export interface ChonViecAi {
  chon: boolean;
  ten: string;
  nguoi_lam: string;
  han: string; // yyyy-mm-dd
  gop: string; // "" = tạo việc mới
}

export function chonMacDinh(v: ViecNgoaiBang): ChonViecAi {
  return { chon: false, ten: v.ten, nguoi_lam: v.nguoi_lam ?? "", han: v.han ?? "", gop: "" };
}

/** Việc đã chọn → dữ liệu gửi lên (ThemViecAi). */
export function viecDaChon(viec: ViecNgoaiBang[], chon: Record<number, ChonViecAi>) {
  return viec
    .map((v, i) => ({ v, c: chon[i] }))
    .filter((x) => x.c?.chon)
    .map(({ v, c }) => ({ ten: c.ten.trim(), nguoi_lam: c.nguoi_lam.trim() || null, han: c.han || null, trich: v.trich, gop: c.gop || null }));
}

/** Việc đã chọn mà chưa có hạn / tên (chặn gửi). */
export function viecChonThieu(chon: Record<number, ChonViecAi>): string[] {
  return Object.values(chon)
    .filter((c) => c.chon && (!c.ten.trim() || !c.han))
    .map((c) => c.ten.trim() || "(chưa có tên)");
}

const O = "rounded-sm border border-border bg-bg px-1.5 py-0.5 text-[12px] text-text focus:border-accent focus:outline-none disabled:opacity-60";

export function ViecAiNgoaiBang({
  viec,
  chon,
  onDoi,
  chiDoc,
}: {
  viec: ViecNgoaiBang[];
  chon: Record<number, ChonViecAi>;
  onDoi?: (i: number, c: ChonViecAi) => void;
  /** đã gửi / không có quyền: chỉ xem */
  chiDoc?: boolean;
}) {
  if (!viec.length) return null;
  return (
    <div className="space-y-2">
      {viec.map((v, i) => {
        const c = chon[i] ?? chonMacDinh(v);
        const doi = (x: Partial<ChonViecAi>) => onDoi?.(i, { ...c, ...x });
        const khoa = chiDoc || !onDoi;
        return (
          <div key={i} className={`rounded border px-3 py-2 ${c.chon ? "border-accent bg-accent/5" : "border-border"}`}>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" checked={c.chon} disabled={khoa} onChange={(e) => doi({ chon: e.target.checked })} />
              <div className="min-w-0 flex-1 space-y-1">
                <input className={`${O} w-full font-semibold`} value={c.ten} disabled={khoa || !c.chon} onChange={(e) => doi({ ten: e.target.value })} />
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-text-muted">
                  <span>Người làm</span>
                  <input className={`${O} w-44`} placeholder="(đơn vị lập)" value={c.nguoi_lam} disabled={khoa || !c.chon} onChange={(e) => doi({ nguoi_lam: e.target.value })} />
                  <span>Hạn</span>
                  <ONhapNgay className={`${O} ${c.chon && !c.han ? "border-red" : ""}`} value={c.han} disabled={khoa || !c.chon} onChange={(x) => doi({ han: x })} />
                  {c.chon && !c.han && <span className="text-red">cần ghi hạn</span>}
                  {v.trung.length > 0 && (
                    <select className={O} value={c.gop} disabled={khoa || !c.chon} onChange={(e) => doi({ gop: e.target.value })}>
                      <option value="">Tạo việc mới</option>
                      {v.trung.map((t) => (
                        <option key={t.ma} value={t.ma}>
                          Gộp vào {t.ma} · {t.ten.slice(0, 50)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {v.tach && (
                  <div className="text-[11.5px] text-yellow">
                    Hệ thống đã gộp dòng này (bảng {v.tach.bang.replace(/^bang_/, "").replace(/_/g, " ")}, dòng {v.tach.dong}) với “{v.tach.voi}” — AI cho là việc khác: {v.tach.ly_do}
                  </div>
                )}
                <div className="text-[11.5px] italic text-text-secondary">
                  “{v.trich}”{v.muc ? <span className="not-italic text-text-muted"> — mục {v.muc}</span> : null}
                </div>
                {v.trung.length > 0 && <div className="text-[11px] text-yellow">AI thấy có thể trùng: {v.trung.map((t) => `${t.ma} (${t.ly_do})`).join("; ")}</div>}
              </div>
            </label>
          </div>
        );
      })}
    </div>
  );
}
