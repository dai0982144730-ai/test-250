"use client";
// Hộp giao việc: tên việc, dự án, các phần việc (mỗi phần một người/đơn vị, ngày riêng hoặc để trống = luôn mở).
// Dùng cho giao tay trên /so-cai và cho "Quyết định, giao việc" của Form 0 (QuyetDinhGiaoViec).
import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { PhuTrach } from "@/lib/types";
import { ChonPhuTrach, goiApi, HopThoai, type DanhMuc } from "./giao-dien";
import ONhapNgay from "@/components/common/ONhapNgay";

export interface PhanViecNhap {
  phu_trach: PhuTrach | null;
  noi_dung: string;
  bat_dau: string;
  ket_thuc: string;
}

export interface NoiDungGiaoViec {
  ten: string;
  du_an: string;
  hang_muc: string;
  ket_qua_can_co: string;
  phan_viec: PhanViecNhap[];
  cong_viec_id: string; // '' = việc mới
}

export function HopGiaoViec({
  dm,
  onDong,
  onXong,
  tieuDe = "Giao việc",
  banDau,
  goiY = [],
  gui,
  nutGui = "Giao việc",
}: {
  dm: DanhMuc | null;
  onDong: () => void;
  onXong: (maViec: string) => void;
  tieuDe?: string;
  banDau?: Partial<NoiDungGiaoViec>;
  goiY?: { cong_viec_id: string; ten: string; do_giong: number }[];
  gui?: (v: ReturnType<typeof thanhDauVao>) => Promise<string>;
  nutGui?: string;
}) {
  const [v, setV] = useState<NoiDungGiaoViec>({
    ten: "",
    du_an: "",
    hang_muc: "",
    ket_qua_can_co: "",
    cong_viec_id: "",
    ...banDau,
    phan_viec: banDau?.phan_viec?.length ? banDau.phan_viec : [{ phu_trach: null, noi_dung: "", bat_dau: "", ket_thuc: "" }],
  });
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const doiPv = (i: number, p: Partial<PhanViecNhap>) => setV((x) => ({ ...x, phan_viec: x.phan_viec.map((y, j) => (j === i ? { ...y, ...p } : y)) }));

  async function nop() {
    setLoi(null);
    if (!v.ten.trim()) return setLoi("Chưa có tên việc");
    if (!v.phan_viec.some((p) => p.phu_trach)) return setLoi("Cần ít nhất một người hoặc đơn vị phụ trách");
    setDang(true);
    try {
      const dv = thanhDauVao(v);
      const ma = gui ? await gui(dv) : (await goiApi<{ ma_viec: string }>("/api/cong-viec", dv)).ma_viec;
      onXong(ma);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  const o = "w-full rounded-sm border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent";
  return (
    <HopThoai tieuDe={tieuDe} onDong={onDong}>
      <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 text-sm">
        <label className="block">
          <span className="mb-1 block text-text-secondary">Tên việc</span>
          <input value={v.ten} onChange={(e) => setV({ ...v, ten: e.target.value })} className={o} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-text-secondary">Dự án</span>
            <input value={v.du_an} onChange={(e) => setV({ ...v, du_an: e.target.value })} list="ds-du-an" className={o} />
            <datalist id="ds-du-an">{dm?.du_an.map((d) => <option key={d} value={d} />)}</datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-text-secondary">Hạng mục</span>
            <input value={v.hang_muc} onChange={(e) => setV({ ...v, hang_muc: e.target.value })} className={o} />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-text-secondary">Kết quả cần có</span>
          <input value={v.ket_qua_can_co} onChange={(e) => setV({ ...v, ket_qua_can_co: e.target.value })} className={o} />
        </label>
        {goiY.length ? (
          <label className="block">
            <span className="mb-1 block text-text-secondary">Việc đang mở có vẻ trùng</span>
            <select value={v.cong_viec_id} onChange={(e) => setV({ ...v, cong_viec_id: e.target.value })} className={o}>
              <option value="">Tạo việc mới</option>
              {goiY.map((g) => (
                <option key={g.cong_viec_id} value={g.cong_viec_id}>
                  Giao lại, đè {g.cong_viec_id} · {g.ten} ({Math.round(g.do_giong * 100)}% giống)
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div>
          <div className="mb-1 text-text-secondary">Chủ trì (ngày trống = luôn mở) · các dòng sau là phối hợp — chỉ để biết, không hạn riêng</div>
          <div className="space-y-2">
            {v.phan_viec.map((p, i) => (
              <div key={i} className="space-y-1.5 rounded-sm border border-border p-2">
                <div className="flex items-center gap-2">
                  <span className={`w-16 shrink-0 text-[11px] ${i === 0 ? "font-semibold text-text-secondary" : "text-text-muted"}`}>{i === 0 ? "Chủ trì" : "Phối hợp"}</span>
                  <ChonPhuTrach dm={dm} giaTri={p.phu_trach} onDoi={(pt) => doiPv(i, { phu_trach: pt })} className="min-w-0 flex-1" />
                  {v.phan_viec.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setV({ ...v, phan_viec: v.phan_viec.filter((_, j) => j !== i) })}
                      className="text-text-muted hover:text-red"
                      aria-label="Bỏ phần việc"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
                {i === 0 ? (
                  <input value={p.noi_dung} onChange={(e) => doiPv(i, { noi_dung: e.target.value })} placeholder="Nội dung (trống = tên việc)" className={o} />
                ) : null}
                {i === 0 ? (
                <div className="flex items-center gap-2">
                  <ONhapNgay value={p.bat_dau} onChange={(x) => doiPv(i, { bat_dau: x })} className={o} aria-label="Bắt đầu" />
                  <span className="text-text-muted">→</span>
                  <ONhapNgay value={p.ket_thuc} onChange={(x) => doiPv(i, { ket_thuc: x })} className={o} aria-label="Kết thúc" />
                </div>
                ) : null}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setV({ ...v, phan_viec: [...v.phan_viec, { phu_trach: null, noi_dung: "", bat_dau: "", ket_thuc: "" }] })}
            className="mt-2 inline-flex items-center gap-1 text-text-secondary hover:text-text"
          >
            <Plus size={14} /> Thêm phối hợp
          </button>
        </div>
        {loi ? <div className="text-red">{loi}</div> : null}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onDong} className="rounded-sm border border-border px-3 py-1.5 text-text-secondary hover:text-text">
            Hủy
          </button>
          <button type="button" disabled={dang} onClick={nop} className="inline-flex items-center gap-1 rounded-sm bg-accent px-3 py-1.5 text-white hover:bg-accent-hover disabled:opacity-60">
            {dang ? <Loader2 size={14} className="animate-spin" /> : null} {nutGui}
          </button>
        </div>
      </div>
    </HopThoai>
  );
}

export function thanhDauVao(v: NoiDungGiaoViec) {
  return {
    ten: v.ten.trim(),
    du_an: v.du_an.trim() || null,
    hang_muc: v.hang_muc.trim() || null,
    ket_qua_can_co: v.ket_qua_can_co.trim() || null,
    cong_viec_id: v.cong_viec_id || null,
    phan_viec: v.phan_viec
      .filter((p) => p.phu_trach)
      .map((p) => ({ ...(p.phu_trach as PhuTrach), noi_dung: p.noi_dung.trim() || undefined, bat_dau: p.bat_dau || null, ket_thuc: p.ket_thuc || null })),
  };
}
