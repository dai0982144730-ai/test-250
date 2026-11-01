"use client";
// Ô nhập dùng chung trang Cài đặt: dòng công tắc, chọn nhiều, danh sách chữ, trường vẽ tự động theo mô tả.
import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { CongTac, LOP_O_NHAP } from "@/components/layout/giao-dien";
import { ONhapSo } from "@/components/common/ONhapSo";
import { BIEU_MAU, layTheoDuong, type TruongBieuMau } from "@/lib/cau-hinh/bieu-mau";

export interface DanhMucCaiDat {
  don_vi: { id: string; ten: string; ten_ngan: string; cap: number; cha_id: string | null; active: boolean }[];
  vai_tro: { id: string; ten: string }[];
  nguoi?: { id: string; ten: string; don_vi: string | null }[];
  mau: { ma: string; ten: string }[];
}

/** Props chung của mọi trình sửa nhóm. */
export interface PropsNhom<T> {
  giaTri: T;
  doi: (v: T) => void;
  tat: boolean; // chỉ xem
  danhMuc: DanhMucCaiDat;
}

export function DongCongTac({ nhan, moTa, bat, doi, tat }: { nhan: string; moTa?: string; bat: boolean; doi: (v: boolean) => void; tat?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-light py-2.5 last:border-b-0">
      <div>
        <div className="text-[12.5px] text-text">{nhan}</div>
        {moTa && <div className="text-[11px] text-text-muted">{moTa}</div>}
      </div>
      <CongTac bat={bat} doi={doi} tat={tat} nhan={nhan} />
    </div>
  );
}

/** Chọn nhiều thành "chip"; tuy_chon_sao = cho phép '*' (mọi nơi). */
export function ChonNhieu({
  giaTri,
  doi,
  luaChon,
  tat,
  goiY = "+ Thêm",
}: {
  giaTri: string[];
  doi: (v: string[]) => void;
  luaChon: { gia_tri: string; nhan: string }[];
  tat?: boolean;
  goiY?: string;
}) {
  const nhan = (v: string) => luaChon.find((l) => l.gia_tri === v)?.nhan ?? v;
  const conLai = luaChon.filter((l) => !giaTri.includes(l.gia_tri));
  return (
    <div className="flex flex-wrap items-center gap-1">
      {giaTri.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[11px] text-text-secondary">
          {nhan(v)}
          {!tat && (
            <button type="button" onClick={() => doi(giaTri.filter((x) => x !== v))} className="text-text-muted hover:text-red" aria-label={`Bỏ ${nhan(v)}`}>
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!tat && conLai.length > 0 && (
        <select
          className="rounded-sm border border-dashed border-border bg-bg px-1 py-0.5 text-[11px] text-text-muted outline-none focus:border-accent"
          value=""
          onChange={(e) => e.target.value && doi([...giaTri, e.target.value])}
        >
          <option value="">{goiY}</option>
          {conLai.map((l) => (
            <option key={l.gia_tri} value={l.gia_tri}>
              {l.nhan}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function DanhSachChu({ giaTri, doi, tat, kieu = "text", goiY }: { giaTri: string[]; doi: (v: string[]) => void; tat?: boolean; kieu?: "text" | "date"; goiY?: string }) {
  const [moi, setMoi] = useState("");
  const them = () => {
    const v = moi.trim();
    if (v && !giaTri.includes(v)) doi([...giaTri, v]);
    setMoi("");
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {giaTri.map((v, i) => (
          <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[11.5px] text-text-secondary">
            {v}
            {!tat && (
              <button type="button" onClick={() => doi(giaTri.filter((_, j) => j !== i))} className="text-text-muted hover:text-red" aria-label="Bỏ">
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {giaTri.length === 0 && <span className="text-[11px] text-text-muted">(trống)</span>}
      </div>
      {!tat && (
        <div className="mt-1.5 flex gap-1.5">
          <input
            type={kieu}
            className={`${LOP_O_NHAP} max-w-[320px]`}
            value={moi}
            placeholder={goiY}
            onChange={(e) => setMoi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                them();
              }
            }}
          />
          <button type="button" onClick={them} className="rounded-sm border border-border px-2 text-text-muted hover:border-accent hover:text-accent" aria-label="Thêm">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Danh sách model (Mr. Đại chốt 02/10: chọn theo danh sách, không gõ tay) — tải một lần cho mọi ô trên trang. */
type DongModel = { id: string; nhan: string };
let hua: Promise<DongModel[]> | null = null;
function taiModel(): Promise<DongModel[]> {
  hua ??= fetch("/api/tro-ly/model?tat_ca=1", { cache: "no-store" })
    .then((r) => r.json())
    .then((j: { danhSach?: DongModel[] }) => (j.danhSach ?? []).filter((m) => m.id))
    .catch(() => {
      hua = null;
      return [];
    });
  return hua;
}

function ChonModel({ giaTri, doi, tat, nhanTrong }: { giaTri: string; doi: (v: string) => void; tat: boolean; nhanTrong?: string }) {
  const [ds, setDs] = useState<DongModel[] | null>(null);
  useEffect(() => {
    let song = true;
    void taiModel().then((x) => song && setDs(x));
    return () => {
      song = false;
    };
  }, []);
  const coTrong = !!ds?.some((m) => m.id === giaTri);
  return (
    <select className={`${LOP_O_NHAP} max-w-[420px]`} disabled={tat || !ds} value={giaTri} onChange={(e) => doi(e.target.value)}>
      {!ds && <option value={giaTri}>Đang tải danh sách model…</option>}
      {ds && nhanTrong !== undefined && <option value="">{nhanTrong}</option>}
      {ds && giaTri && !coTrong && <option value={giaTri}>{giaTri} — không có trong danh sách</option>}
      {ds?.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nhan}
        </option>
      ))}
    </select>
  );
}

/**
 * Ô SỐ LẺ của Cài đặt — gõ theo chuẩn số Việt Nam («0,7»), Mr. Đại chốt 12/10/2026 (chốt 130). Xoá trắng = 0 như ô số cũ.
 * Rời ô thì dựng lại ô để chữ trong ô luôn là số ĐANG LƯU (xoá trắng hiện «0», gõ dở chưa thành số thì hiện lại số cũ).
 */
function OSoLe({ giaTri, doi, tat }: { giaTri: number | null; doi: (n: number) => void; tat: boolean }) {
  const [lan, setLan] = useState(0);
  return <ONhapSo key={lan} className={`${LOP_O_NHAP} max-w-[160px]`} disabled={tat} value={giaTri} onChange={(n) => doi(n ?? 0)} onBlur={() => setLan((x) => x + 1)} />;
}

/** Vẽ một trường theo mô tả trong BIEU_MAU. */
export function TruongTuDong({
  t,
  giaTri,
  doi,
  tat,
  danhMuc,
}: {
  t: TruongBieuMau;
  giaTri: unknown;
  doi: (duong: string, v: unknown) => void;
  tat: boolean;
  danhMuc: DanhMucCaiDat;
}) {
  const v = layTheoDuong(giaTri, t.duong);
  if (t.kieu === "bat_tat") {
    // Ô loại trừ nhau (vd danh sách đăng nhập ↔ bấm tên là đăng nhập): ô kia đang bật thì ô này MỜ kèm lý do
    const kiaBat = t.loai_tru_voi ? !!layTheoDuong(giaTri, t.loai_tru_voi) : false;
    const mo = kiaBat && !v;
    const nhanKia = t.loai_tru_voi ? (Object.values(BIEU_MAU) as TruongBieuMau[][]).flat().find((x) => x.duong === t.loai_tru_voi)?.nhan : undefined;
    return (
      <DongCongTac
        nhan={t.nhan}
        moTa={mo ? `Đang mờ vì «${nhanKia ?? "ô kia"}» đang bật — hai ô này không được bật cùng lúc. Tắt ô kia trước nếu muốn bật ô này.` : t.mo_ta}
        bat={!!v}
        doi={(b) => doi(t.duong, b)}
        tat={tat || mo}
      />
    );
  }
  let o: React.ReactNode;
  switch (t.kieu) {
    case "so":
      // Trường gõ SỐ LẺ (bước nhảy lẻ, vd ngưỡng 0,7) → ô chữ kiểm chuẩn số Việt Nam (chốt 130). Trường số nguyên giữ ô type="number".
      o =
        t.buoc !== undefined && !Number.isInteger(t.buoc) ? (
          <OSoLe giaTri={typeof v === "number" ? v : null} doi={(n) => doi(t.duong, n)} tat={tat} />
        ) : (
          <input
            type="number"
            className={`${LOP_O_NHAP} max-w-[160px]`}
            disabled={tat}
            min={t.toi_thieu}
            max={t.toi_da}
            step={t.buoc ?? 1}
            value={typeof v === "number" ? v : ""}
            onChange={(e) => doi(t.duong, e.target.value === "" ? 0 : Number(e.target.value))}
          />
        );
      break;
    case "gio":
      o = <input type="time" className={`${LOP_O_NHAP} max-w-[140px]`} disabled={tat} value={String(v ?? "")} onChange={(e) => doi(t.duong, e.target.value)} />;
      break;
    case "mau_sac":
      o = (
        <div className="flex items-center gap-2">
          <input type="color" disabled={tat} value={String(v ?? "#000000")} onChange={(e) => doi(t.duong, e.target.value)} className="h-7 w-10 cursor-pointer rounded-sm border border-border bg-bg" />
          <input className={`${LOP_O_NHAP} max-w-[120px] font-mono`} disabled={tat} value={String(v ?? "")} onChange={(e) => doi(t.duong, e.target.value)} />
        </div>
      );
      break;
    case "chon":
      o = (
        <select
          className={`${LOP_O_NHAP} max-w-[420px]`}
          disabled={tat}
          value={String(v ?? "")}
          onChange={(e) => {
            const l = t.lua_chon?.find((x) => String(x.gia_tri) === e.target.value);
            doi(t.duong, l ? l.gia_tri : e.target.value);
          }}
        >
          {t.lua_chon?.map((l) => (
            <option key={String(l.gia_tri)} value={String(l.gia_tri)}>
              {l.nhan}
            </option>
          ))}
        </select>
      );
      break;
    case "chon_model":
      o = <ChonModel giaTri={String(v ?? "")} doi={(x) => doi(t.duong, x)} tat={tat} nhanTrong={t.nhan_trong} />;
      break;
    case "chon_nhieu":
      o = (
        <ChonNhieu
          giaTri={(v as string[]) ?? []}
          doi={(x) => doi(t.duong, x)}
          tat={tat}
          luaChon={(t.lua_chon ?? []).map((l) => ({ gia_tri: String(l.gia_tri), nhan: l.nhan }))}
        />
      );
      break;
    case "don_vi_nhieu":
      o = (
        <ChonNhieu
          giaTri={(v as string[]) ?? []}
          doi={(x) => doi(t.duong, x)}
          tat={tat}
          luaChon={danhMuc.don_vi.filter((d) => d.active).map((d) => ({ gia_tri: d.id, nhan: d.ten_ngan || d.ten }))}
        />
      );
      break;
    case "vai_tro_nhieu":
      o = <ChonNhieu giaTri={(v as string[]) ?? []} doi={(x) => doi(t.duong, x)} tat={tat} luaChon={danhMuc.vai_tro.map((r) => ({ gia_tri: r.id, nhan: r.ten }))} />;
      break;
    case "nguoi_nhieu":
      o = <ChonNhieu giaTri={(v as string[]) ?? []} doi={(x) => doi(t.duong, x)} tat={tat} goiY="+ Thêm người" luaChon={(danhMuc.nguoi ?? []).map((n) => ({ gia_tri: n.id, nhan: n.don_vi ? `${n.ten} · ${n.don_vi}` : n.ten }))} />;
      break;
    case "danh_sach_chu":
      o = <DanhSachChu giaTri={(v as string[]) ?? []} doi={(x) => doi(t.duong, x)} tat={tat} />;
      break;
    case "danh_sach_ngay":
      o = <DanhSachChu giaTri={(v as string[]) ?? []} doi={(x) => doi(t.duong, [...x].sort())} tat={tat} kieu="date" />;
      break;
    default:
      o = <input className={LOP_O_NHAP} disabled={tat} value={String(v ?? "")} onChange={(e) => doi(t.duong, e.target.value)} />;
  }
  return (
    <div className="grid gap-1 border-b border-border-light py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,300px)_1fr] sm:items-center sm:gap-4">
      <div>
        <div className="text-[12.5px] text-text">{t.nhan}</div>
        {t.mo_ta && <div className="text-[11px] text-text-muted">{t.mo_ta}</div>}
      </div>
      <div>{o}</div>
    </div>
  );
}
