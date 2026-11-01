"use client";
// Lọc theo BỘ PHẬN, gom 4 nhóm: Ban lãnh đạo · Các phòng · Đơn vị · Nhà máy (+ Khác nếu có).
// Bấm một nút là lọc bộ phận đó; bấm NHÃN NHÓM là lọc cả nhóm (vd mọi nhà máy). Giá trị: mã bộ phận, nhiều mã cách dấu phẩy.
import type { DanhMuc } from "./giao-dien";

type DonVi = DanhMuc["don_vi"][number];

/** Chia nhóm: lãnh đạo (Ban TGĐ + chức danh), phòng, đơn vị con của phòng — con toàn "Nhà máy…" thì gọi là Nhà máy. */
export function nhomBoPhan(ds: DonVi[]): { ten: string; ds: DonVi[] }[] {
  const lanhDao = ds.filter((d) => d.loai === "ban_tgd" || d.loai === "chuc_danh");
  const phong = ds.filter((d) => d.loai === "phong");
  const donVi = ds.filter((d) => d.loai === "don_vi");
  const khac = ds.filter((d) => !["ban_tgd", "chuc_danh", "phong", "don_vi"].includes(d.loai ?? ""));
  const laNhaMay = (d: DonVi) => /^nhà máy/i.test(d.ten);
  return [
    { ten: "Ban lãnh đạo", ds: lanhDao },
    { ten: "Các phòng", ds: phong },
    { ten: "Đơn vị", ds: donVi.filter((d) => !laNhaMay(d)) },
    { ten: "Nhà máy", ds: donVi.filter(laNhaMay) },
    { ten: "Khác", ds: khac },
  ].filter((n) => n.ds.length > 0);
}

const NUT = "whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] transition-colors";
const CHON = "border-accent bg-accent text-white";
const THUONG = "border-border text-text-secondary hover:border-accent hover:text-text";

export function LocBoPhan({ dm, chon, doi }: { dm: DanhMuc | null; chon: string; doi: (v: string) => void }) {
  const dangChon = new Set(chon.split(",").filter(Boolean));
  const nhom = nhomBoPhan(dm?.don_vi ?? []);
  const ngan = (d: DonVi) => (d.ten_ngan || d.ten).replace(/^NM /, "");
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="w-[92px] shrink-0 text-[11.5px] font-semibold uppercase tracking-wide text-text-muted">Bộ phận</span>
        <button type="button" onClick={() => doi("")} className={`${NUT} ${!chon ? CHON : THUONG}`}>
          Tất cả
        </button>
      </div>
      {nhom.map((n) => {
        const ids = n.ds.map((d) => d.id);
        const caNhom = ids.length > 1 && ids.every((id) => dangChon.has(id)) && dangChon.size === ids.length;
        return (
          <div key={n.ten} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => doi(caNhom ? "" : ids.join(","))}
              title={`Lọc cả nhóm ${n.ten}`}
              className={`w-[92px] shrink-0 pt-0.5 text-left text-[11.5px] font-semibold ${caNhom ? "text-accent" : "text-text-muted hover:text-accent"}`}
            >
              {n.ten} ›
            </button>
            <div className="flex flex-wrap gap-1.5">
              {n.ds.map((d) => {
                const la = dangChon.size === 1 && dangChon.has(d.id);
                return (
                  <button key={d.id} type="button" title={d.ten} onClick={() => doi(la ? "" : d.id)} className={`${NUT} ${la || (caNhom && dangChon.has(d.id)) ? CHON : THUONG}`}>
                    {ngan(d)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
