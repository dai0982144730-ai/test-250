"use client";
// Chọn một hoặc nhiều nơi nhận: đơn vị (bấm để bật/tắt) hoặc gửi thẳng một người ("nguoi:<email>").
import { useEffect, useMemo, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { goiApi } from "./chung";

export interface DanhSachNoiNhan {
  don_vi: { id: string; ten: string; ten_ngan: string; cap: number; loai: string }[];
  nguoi: { id: string; ten: string; chuc_vu: string | null; don_vi_id: string }[];
  theo_luong: string[];
  toi: { id: string; ten: string; don_vi_id: string | null; cap: number; quyen_gui: boolean; chua_gan_don_vi: string | null };
}

let boNho: Promise<DanhSachNoiNhan> | null = null;
export function napNoiNhan(): Promise<DanhSachNoiNhan> {
  if (!boNho) boNho = goiApi<DanhSachNoiNhan>("/api/gui/noi-nhan").catch((e) => {
    boNho = null;
    throw e;
  });
  return boNho;
}

export function tenNoiNhan(ds: DanhSachNoiNhan | null, ma: string): string {
  if (!ds) return ma;
  if (ma.startsWith("nguoi:")) {
    const n = ds.nguoi.find((x) => x.id === ma.slice(6));
    return n ? n.ten : ma.slice(6);
  }
  return ds.don_vi.find((d) => d.id === ma)?.ten ?? ma;
}

export function ChonNoiNhan({
  chon,
  onChon,
  macDinh,
  boQua = [],
  nhan = "Nơi nhận",
}: {
  chon: string[];
  onChon: (v: string[]) => void;
  macDinh?: string[]; // theo mẫu / luồng báo cáo — đánh dấu "mặc định"
  boQua?: string[]; // đơn vị không cho chọn (vd chính mình)
  nhan?: string;
}) {
  const [ds, setDs] = useState<DanhSachNoiNhan | null>(null);
  const [themNguoi, setThemNguoi] = useState("");
  useEffect(() => {
    napNoiNhan().then(setDs).catch(() => undefined);
  }, []);
  const md = useMemo(() => new Set(macDinh ?? []), [macDinh]);
  const bat = (ma: string) => onChon(chon.includes(ma) ? chon.filter((x) => x !== ma) : [...chon, ma]);
  const nguoiDaChon = chon.filter((c) => c.startsWith("nguoi:"));

  return (
    <div>
      <div className="mb-1.5 text-xs text-text-muted">{nhan} · chọn một hoặc nhiều nơi, mỗi nơi một trạng thái riêng</div>
      <div className="flex flex-wrap gap-1.5">
        {(ds?.don_vi ?? [])
          .filter((d) => !boQua.includes(d.id))
          .map((d) => {
            const on = chon.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => bat(d.id)}
                aria-pressed={on}
                title={d.ten}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${
                  on ? "border-accent text-accent" : "border-border text-text-secondary hover:border-text-muted hover:text-text"
                }`}
              >
                {d.ten_ngan}
                {md.has(d.id) ? <span className="ml-1 text-[10px] text-text-muted">mặc định</span> : null}
              </button>
            );
          })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {nguoiDaChon.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border border-accent px-2.5 py-1 text-xs text-accent">
            {tenNoiNhan(ds, c)}
            {md.has(c) ? <span className="text-[10px] text-text-muted">mặc định</span> : null}
            <button type="button" onClick={() => bat(c)} aria-label={`Bỏ ${tenNoiNhan(ds, c)}`}>
              <X size={11} />
            </button>
          </span>
        ))}
        <label className="inline-flex items-center gap-1 text-xs text-text-muted">
          <UserPlus size={13} />
          <select
            value={themNguoi}
            onChange={(e) => {
              const v = e.target.value;
              setThemNguoi("");
              if (v && !chon.includes(`nguoi:${v}`)) onChon([...chon, `nguoi:${v}`]);
            }}
            className="max-w-[240px] rounded-sm border border-border bg-bg px-1.5 py-1 text-xs text-text"
          >
            <option value="">Gửi thẳng một người…</option>
            {(ds?.nguoi ?? []).map((n) => (
              <option key={n.id} value={n.id}>
                {n.ten}
                {n.chuc_vu ? ` · ${n.chuc_vu}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/**
 * Gửi báo cáo (Mr. Đại chốt 28/09): gọn thành HAI danh sách chọn — một đơn vị nhận + gửi thẳng một người.
 * Tối đa 1 đơn vị + 1 người; chọn xong là áp dụng, không có nút xác nhận.
 */
export function ChonNoiNhanGon({ chon, onChon, macDinh }: { chon: string[]; onChon: (v: string[]) => void; macDinh?: string[] }) {
  const [ds, setDs] = useState<DanhSachNoiNhan | null>(null);
  useEffect(() => {
    napNoiNhan().then(setDs).catch(() => undefined);
  }, []);
  const md = new Set(macDinh ?? []);
  const donVi = chon.find((c) => !c.startsWith("nguoi:")) ?? "";
  const nguoi = chon.find((c) => c.startsWith("nguoi:"))?.slice(6) ?? "";
  const dat = (dv: string, ng: string) => onChon([...(dv ? [dv] : []), ...(ng ? [`nguoi:${ng}`] : [])]);
  const lop = "w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-sm text-text";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block min-w-0">
        <span className="mb-1 block text-xs text-text-muted">Nơi nhận</span>
        <select value={donVi} onChange={(e) => dat(e.target.value, nguoi)} className={lop}>
          <option value="">— Không gửi đơn vị —</option>
          {(ds?.don_vi ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.ten_ngan}
              {md.has(d.id) ? " (mặc định)" : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 flex items-center gap-1 text-xs text-text-muted">
          <UserPlus size={12} /> Gửi thẳng một người
        </span>
        <select value={nguoi} onChange={(e) => dat(donVi, e.target.value)} className={lop}>
          <option value="">— Không gửi thẳng —</option>
          {(ds?.nguoi ?? []).map((n) => (
            <option key={n.id} value={n.id}>
              {n.ten}
              {n.chuc_vu ? ` · ${n.chuc_vu}` : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
