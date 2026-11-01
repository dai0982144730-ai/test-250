"use client";
// Phần chỉnh THAM SỐ của luật code — dựng tự động từ `tham_so` của dạng luật (ThamSoDinhNghia).
// Ô / bảng / cột / mục chọn bằng danh sách xổ mang NHÃN THẬT lấy từ định nghĩa mẫu, người dùng không phải gõ tag.
import { useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import type { DieuKien, PhepSo, ThamChieu, ThamSoDinhNghia } from "@/lib/luat/types";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";
import { LOP_O_NHAP } from "@/components/layout/giao-dien";
import { ONhapSo } from "@/components/common/ONhapSo";
import { DINH_DANG_CO_SAN } from "@/lib/luat/loai-luat";
import { soThamSo, soVN } from "@/lib/luat/loai/chung";
import { chuanPhepTinh } from "@/lib/luat/loai/tinh-toan";
import type { LoaiLuatUi } from "./api";
import { kieuCau, tenMau } from "./chung";

/** Tham số kèm hai trường phụ mà API dạng luật trả thêm: tham chiếu có được trỏ kỳ báo cáo không, giá trị mặc định. */
export type ThamSoUi = ThamSoDinhNghia & {
  cho_ky?: boolean;
  mac_dinh?: unknown;
};

/** Tham số mặc định khi vừa chọn một dạng luật. */
export function thamSoMacDinh(loai: { tham_so: ThamSoUi[] } | undefined): Record<string, unknown> {
  const v: Record<string, unknown> = {};
  for (const t of loai?.tham_so ?? []) if (t.mac_dinh !== undefined) v[t.khoa] = t.mac_dinh;
  return v;
}

// ---------------- Danh mục chọn từ mẫu ----------------

export interface MucChon {
  tag: string;
  nhan: string;
  /** Mẫu có mục này (để ghi "chỉ có ở Form 5, 6") */
  mau: string[];
}
export interface DanhMucMau {
  o: MucChon[];
  bang: (MucChon & { cot: MucChon[] })[];
  muc: MucChon[];
  soMau: number;
  dsMa: string[];
}

const BO_O = new Set(["mau_ma"]);

function gom(ds: { tag: string; nhan: string; ma: string }[]): MucChon[] {
  const m = new Map<string, { nhan: Map<string, number>; mau: string[] }>();
  for (const x of ds) {
    const v = m.get(x.tag) ?? {
      nhan: new Map<string, number>(),
      mau: [] as string[],
    };
    const n = kieuCau(x.nhan);
    v.nhan.set(n, (v.nhan.get(n) ?? 0) + 1);
    if (!v.mau.includes(x.ma)) v.mau.push(x.ma);
    m.set(x.tag, v);
  }
  return Array.from(m, ([tag, v]) => ({
    tag,
    nhan: [...v.nhan].sort((a, b) => b[1] - a[1])[0][0],
    mau: v.mau,
  }));
}

export function lapDanhMuc(mau: DinhNghiaMauRutGon[], apDung: string[] | "tat_ca"): DanhMucMau {
  const ds = apDung === "tat_ca" || !apDung.length ? mau : mau.filter((m) => apDung.includes(m.ma));
  const bang = gom(ds.flatMap((m) => m.bang.map((b) => ({ tag: b.tag, nhan: b.nhan, ma: m.ma })))).map((b) => ({
    ...b,
    cot: gom(
      ds.flatMap((m) =>
        (m.bang.find((x) => x.tag === b.tag)?.cot ?? []).map((c) => ({
          ...c,
          ma: m.ma,
        })),
      ),
    ),
  }));
  return {
    o: gom(ds.flatMap((m) => m.o_nhap.filter((o) => !BO_O.has(o.tag)).map((o) => ({ tag: o.tag, nhan: o.nhan, ma: m.ma })))),
    bang,
    muc: gom(ds.flatMap((m) => m.muc_bat_buoc.map((x) => ({ tag: x, nhan: x, ma: m.ma })))),
    soMau: ds.length,
    dsMa: ds.map((m) => m.ma),
  };
}

function chiCo(x: MucChon, dm: DanhMucMau): string {
  if (x.mau.length >= dm.soMau) return "";
  const so = (ds: string[]) =>
    ds
      .map((m) => tenMau(m).replace(/^Form /, ""))
      .sort((a, b) => a.localeCompare(b, "vi", { numeric: true }))
      .join(", ");
  const thieu = dm.dsMa.filter((m) => !x.mau.includes(m));
  return thieu.length <= x.mau.length ? ` (không có ở Form ${so(thieu)})` : ` (chỉ có ở Form ${so(x.mau)})`;
}

/** Lỗi máy chủ (400 danh_sach_loi) nhắc tới tham số này — theo nhãn "…" hoặc (khóa). */
const loiCuaThamSo = (t: ThamSoDinhNghia, ds: string[]) =>
  ds.filter(
    (m) =>
      m.includes(`"${t.nhan}"`) ||
      m.includes(`(${t.khoa})`) ||
      // Vế tính toán: "Thiếu A: …", "B chỉ được là một…"
      (/^[ab]$/.test(t.khoa) && new RegExp(`(^|Thiếu )${t.khoa.toUpperCase()}(\\s|:)`).test(m)),
  );

/** Lỗi máy chủ không gắn được vào ô tham số nào (hiện ở đầu khung). */
export const loiKhongGan = (loai: { tham_so: ThamSoDinhNghia[] } | undefined, ds: string[]) =>
  ds.filter((m) => !(loai?.tham_so ?? []).some((t) => loiCuaThamSo(t, [m]).length));

// ---------------- Nhãn phép so sánh ----------------

const PHEP_SO: PhepSo[] = ["=", "!=", "<", "<=", ">", ">="];
const NHAN_PHEP_SO: Record<PhepSo, string> = {
  "=": "bằng",
  "!=": "khác",
  "<": "nhỏ hơn",
  "<=": "không lớn hơn",
  ">": "lớn hơn",
  ">=": "không nhỏ hơn",
};
const NHAN_PHEP_NGAY: Record<PhepSo, string> = {
  "=": "cùng ngày với",
  "!=": "khác ngày",
  "<": "trước",
  "<=": "không sau",
  ">": "sau",
  ">=": "không trước",
};
const PHEP_DK: { gt: DieuKien["phep"]; nhan: string; can_gt: boolean }[] = [
  { gt: "co_gia_tri", nhan: "có giá trị", can_gt: false },
  { gt: "trong", nhan: "để trống", can_gt: false },
  { gt: "bang", nhan: "là", can_gt: true },
  { gt: "khac", nhan: "khác", can_gt: true },
  { gt: "chua", nhan: "có chứa", can_gt: true },
  { gt: "khong_chua", nhan: "không chứa", can_gt: true },
  ...PHEP_SO.map((p) => ({
    gt: p,
    nhan: `${NHAN_PHEP_SO[p]} (số)`,
    can_gt: true,
  })),
];

export const nhanPhep = (p: string, ngay = false) => (ngay ? NHAN_PHEP_NGAY : NHAN_PHEP_SO)[p as PhepSo] ?? PHEP_DK.find((x) => x.gt === p)?.nhan ?? p;

// ---------------- Đọc tham số thành lời (dự phòng khi lib chưa có docThanhLoi) ----------------

/** Tham số là SỐ thì viết theo chuẩn số Việt Nam (0.5 → «0,5» — chốt 130), cùng hàm `soVN` với lời đọc của lib; chữ giữ nguyên */
const hienTs = (x: unknown): string => (typeof x === "number" ? soVN(x) : String(x));

export function tenThamChieu(tc: unknown, dm: DanhMucMau): string {
  const t = tc as Partial<{
    o: string;
    bang: string;
    cot: string;
    ky: string;
  }> | null;
  if (!t) return "…";
  if (t.o) return `ô "${dm.o.find((x) => x.tag === t.o)?.nhan ?? t.o}"`;
  if (t.bang) {
    const b = dm.bang.find((x) => x.tag === t.bang);
    return `cột "${b?.cot.find((c) => c.tag === t.cot)?.nhan ?? t.cot ?? "…"}" của bảng "${b?.nhan ?? t.bang}"`;
  }
  if (t.ky) return t.ky === "tu" ? "ngày đầu kỳ báo cáo" : "ngày cuối kỳ báo cáo";
  return "…";
}

export function docLoi(loai: string | null, ts: Record<string, unknown> | null, dm: DanhMucMau): string {
  const v = ts ?? {};
  const bang = dm.bang.find((b) => b.tag === v.bang);
  const cot = bang?.cot.find((c) => c.tag === v.cot)?.nhan ?? (v.cot as string) ?? "…";
  const tenBang = bang?.nhan ?? (v.bang as string) ?? "…";
  const dk = (d: unknown) => {
    const x = d as Partial<DieuKien> | null;
    if (!x) return "…";
    const can = PHEP_DK.find((p) => p.gt === x.phep)?.can_gt;
    return `${tenThamChieu(x.tham_chieu, dm)} ${nhanPhep(x.phep ?? "…")}${can ? ` "${hienTs(x.gia_tri ?? "…")}"` : ""}`;
  };
  switch (loai) {
    case "o_co_gia_tri":
      return `${tenThamChieu({ o: v.o }, dm)} phải được điền`.replace(/^ô/, "Ô");
    case "o_khop_mau":
      return `Ô "${dm.o.find((x) => x.tag === v.o)?.nhan ?? "…"}" phải đúng khuôn ${v.mau ? `/${v.mau}/` : "…"}`;
    case "so_sanh_ngay":
      return `Ngày ở ${tenThamChieu(v.a, dm)} phải ${nhanPhep((v.phep as string) ?? "…", true)} ${tenThamChieu(v.b, dm)}`;
    case "khoang_so": {
      const tu = v.tu === undefined || v.tu === null || v.tu === "" ? null : hienTs(v.tu);
      const den = v.den === undefined || v.den === null || v.den === "" ? null : hienTs(v.den);
      const k =
        tu !== null && den !== null ? `từ ${tu} đến ${den}` : tu !== null ? `không nhỏ hơn ${tu}` : den !== null ? `không lớn hơn ${den}` : "trong khoảng …";
      return `${tenThamChieu(v.tham_chieu, dm)} phải ${k}`.replace(/^(ô|cột)/, (s) => s[0].toUpperCase() + s.slice(1));
    }
    case "bang_toi_thieu":
      return `Bảng "${tenBang}" phải có ít nhất ${v.so_dong ?? "…"} dòng có nội dung`;
    case "cot_bat_buoc":
      return `Mọi dòng của bảng "${tenBang}" phải điền cột "${cot}"`;
    case "thuoc_danh_sach":
      return `${tenThamChieu(v.tham_chieu, dm)} chỉ được là: ${((v.danh_sach as string[]) ?? []).join(", ") || "…"}`.replace(
        /^(ô|cột)/,
        (s) => s[0].toUpperCase() + s.slice(1),
      );
    case "neu_thi":
      return `Nếu ${dk(v.neu)} thì ${dk(v.thi)}`;
    case "muc_co_noi_dung":
      return `Mục "${v.muc ? kieuCau(String(v.muc)) : "…"}" phải có nội dung${Number(v.so_ky_tu) > 1 ? ` (ít nhất ${v.so_ky_tu} ký tự)` : ""}`;
    case "khong_trung":
      return `Hai dòng của bảng "${tenBang}" không được trùng cột "${cot}"`;
    case "tinh_toan": {
      const ve = (k: "a" | "b") =>
        v[k] ? tenThamChieu(v[k], dm).replace(/^(ô|cột) /, "") : v[`${k}_so`] !== undefined && v[`${k}_so`] !== null ? hienTs(v[`${k}_so`]) : "…";
      const kyHieu: Record<string, string> = { hieu: "−", tong: "+", tich: "×", thuong: "÷", phan_tram: "÷" };
      const p = chuanPhepTinh(v.phep_tinh);
      const ve2 = p && p !== "chi_a" ? ` ${kyHieu[p]} ${ve("b")}${p === "phan_tram" ? " × 100" : ""}` : "";
      return `${tenThamChieu(v.ket_qua, dm)} phải ${nhanPhep((v.so_sanh as string) ?? "=")} ${ve("a")}${ve2}`.replace(
        /^(ô|cột)/,
        (x) => x[0].toUpperCase() + x.slice(1),
      );
    }
    case "dong_tong":
      return `Dòng tổng của bảng "${tenBang}" phải bằng tổng các dòng ở ${((v.cot as string[]) ?? []).length || "…"} cột đã chọn`;
    case "phu_trach_hop_le":
      return `Cột "${cot}" của bảng "${tenBang}" phải là người hoặc đơn vị có trong hệ thống`;
    default:
      return "";
  }
}

/** Tham số bắt buộc còn thiếu (kiểm nhanh ở giao diện; máy chủ kiểm kỹ khi lưu). */
export function thieuThamSo(loai: LoaiLuatUi | undefined, ts: Record<string, unknown> | null): string[] {
  if (!loai) return ["Chọn dạng luật"];
  const v = ts ?? {};
  const trong = (x: unknown): boolean => {
    if (x === undefined || x === null || x === "") return true;
    if (Array.isArray(x)) return x.length === 0;
    if (typeof x === "object") {
      const o = x as Record<string, unknown>;
      if ("tham_chieu" in o) return trong(o.tham_chieu) || !o.phep || (PHEP_DK.find((p) => p.gt === o.phep)?.can_gt === true && trong(o.gia_tri));
      if ("bang" in o) return !o.bang || !o.cot;
      if ("o" in o) return !o.o;
      if ("ky" in o) return !o.ky;
      return true;
    }
    return false;
  };
  return loai.tham_so.filter((t) => t.bat_buoc && t.kieu !== "bool" && trong(v[t.khoa])).map((t) => t.nhan);
}

// ---------------- Ô nhập con ----------------

const LOP_CHON = `${LOP_O_NHAP} cursor-pointer`;

function Chon({
  giaTri,
  doi,
  ds,
  goiY,
  tat,
  loi,
  nhan,
}: {
  giaTri: string | undefined;
  doi: (v: string) => void;
  ds: { gt: string; nhan: string }[];
  goiY: string;
  tat?: boolean;
  loi?: boolean;
  nhan: string;
}) {
  const khongCo = !!giaTri && !ds.some((d) => d.gt === giaTri);
  return (
    <select
      aria-label={nhan}
      className={`${LOP_CHON} ${loi ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""} ${giaTri ? "" : "!text-text-muted"}`}
      disabled={tat}
      value={giaTri ?? ""}
      onChange={(e) => doi(e.target.value)}
    >
      <option value="">{goiY}</option>
      {khongCo && <option value={giaTri}>{giaTri} (không có trong mẫu đã chọn)</option>}
      {ds.map((d) => (
        <option key={d.gt} value={d.gt} className="text-text">
          {d.nhan}
        </option>
      ))}
    </select>
  );
}

function ChonThamChieu({
  giaTri,
  doi,
  dm,
  tat,
  loi,
  nhan,
  choKy,
  coSo,
  bangMacDinh,
}: {
  giaTri: ThamChieu | null | undefined;
  doi: (v: ThamChieu | null) => void;
  dm: DanhMucMau;
  tat?: boolean;
  loi?: boolean;
  nhan: string;
  choKy?: boolean;
  /** Vế tính toán: cho chọn thêm "Số" (hằng số lưu ở tham số <khóa>_so) */
  coSo?: { giaTri: number | null | undefined; doi: (n: number | null) => void };
  /** Bảng chọn sẵn khi bấm "Cột" (vd bảng của ô kết quả) */
  bangMacDinh?: string;
}) {
  type Kieu = "o" | "bang" | "ky" | "so";
  const coSoNay = !!coSo && coSo.giaTri !== undefined && coSo.giaTri !== null;
  const kieu: Kieu = giaTri && "ky" in giaTri ? "ky" : giaTri && "bang" in giaTri ? "bang" : giaTri ? "o" : coSoNay ? "so" : "o";
  const [dangChon, setDangChon] = useState<Kieu>(kieu);
  const k = giaTri || coSoNay ? kieu : dangChon;
  const doiKieu = (x: Kieu) => {
    setDangChon(x);
    if (x === k) return;
    if (coSo && k === "so") coSo.doi(null);
    if (x === "bang" && bangMacDinh) doi({ bang: bangMacDinh, cot: "" });
    else doi(null);
  };
  const luaChon: [Kieu, string][] = coSo
    ? [
        ["o", "Ô"],
        ["bang", "Cột"],
        ["so", "Số"],
      ]
    : [["o", "Ô nhập"], ["bang", "Cột trong bảng"], ...(choKy ? ([["ky", "Kỳ báo cáo"]] as [Kieu, string][]) : [])];
  const bang = giaTri && "bang" in giaTri ? giaTri.bang : undefined;
  const cotDs = dm.bang.find((b) => b.tag === bang)?.cot ?? [];
  return (
    <div className="space-y-2">
      <div className="inline-flex shrink-0 overflow-hidden rounded-sm border border-border" role="radiogroup" aria-label={`${nhan}: lấy từ`}>
        {luaChon.map(([g, n]) => (
          <button
            key={g}
            type="button"
            role="radio"
            aria-checked={k === g}
            disabled={tat}
            onClick={() => doiKieu(g)}
            className={`${coSo ? "min-w-[52px] px-3" : "px-2.5"} py-1.5 text-[11.5px] font-semibold transition ${k === g ? "bg-accent text-white" : "text-text-secondary hover:bg-white/5 hover:text-text"}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className={`grid gap-2 ${k === "bang" ? "grid-cols-2" : "grid-cols-1"}`}>
        {k === "o" && (
          <Chon
            nhan={nhan}
            tat={tat}
            loi={loi && !giaTri}
            goiY="— Chọn ô —"
            giaTri={giaTri && "o" in giaTri ? giaTri.o : undefined}
            doi={(v) => doi(v ? { o: v } : null)}
            ds={dm.o.map((o) => ({ gt: o.tag, nhan: o.nhan + chiCo(o, dm) }))}
          />
        )}
        {k === "bang" && (
          <>
            <Chon
              nhan={`${nhan} — bảng`}
              tat={tat}
              loi={loi && !bang}
              goiY="— Chọn bảng —"
              giaTri={bang}
              doi={(v) => doi(v ? { bang: v, cot: "" } : null)}
              ds={dm.bang.map((b) => ({
                gt: b.tag,
                nhan: b.nhan + chiCo(b, dm),
              }))}
            />
            <Chon
              nhan={`${nhan} — cột`}
              tat={tat || !bang}
              loi={loi && !!bang && !(giaTri && "cot" in giaTri && giaTri.cot)}
              goiY={bang ? "— Chọn cột —" : "Chọn bảng trước"}
              giaTri={giaTri && "cot" in giaTri ? giaTri.cot || undefined : undefined}
              doi={(v) => bang && doi({ bang, cot: v })}
              ds={cotDs.map((c) => ({ gt: c.tag, nhan: c.nhan }))}
            />
          </>
        )}
        {/* Ô gõ SỐ LẺ → ô chữ kiểm chuẩn số Việt Nam (chốt 130): gõ «0,5» · «1.240,5»; ô type="number" do trình duyệt quyết dấu */}
        {k === "so" && coSo && (
          <ONhapSo
            aria-label={`${nhan} — số`}
            disabled={tat}
            autoFocus={!coSoNay}
            placeholder="Nhập một số, vd 100"
            className={`${LOP_O_NHAP} ${loi && !coSoNay ? "!border-red/70" : ""}`}
            value={coSoNay ? soThamSo(coSo.giaTri) : null}
            onChange={(n) => coSo.doi(n)}
          />
        )}
        {k === "ky" && (
          <Chon
            nhan={nhan}
            tat={tat}
            loi={loi && !giaTri}
            goiY="— Chọn mốc —"
            giaTri={giaTri && "ky" in giaTri ? giaTri.ky : undefined}
            doi={(v) => doi(v ? { ky: v as "tu" | "den" | "nop" } : null)}
            ds={[
              { gt: "tu", nhan: "Ngày đầu kỳ báo cáo" },
              { gt: "den", nhan: "Ngày cuối kỳ báo cáo" },
              { gt: "nop", nhan: "Ngày nộp báo cáo (máy tự ghi)" },
            ]}
          />
        )}
      </div>
    </div>
  );
}

function NhapChip({
  giaTri,
  doi,
  tat,
  loi,
  goiY = "Gõ rồi Enter để thêm…",
}: {
  giaTri: string[];
  doi: (v: string[]) => void;
  tat?: boolean;
  loi?: boolean;
  goiY?: string;
}) {
  const [chu, setChu] = useState("");
  const o = useRef<HTMLInputElement>(null);
  const them = () => {
    const moi = chu
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter((x) => x && !giaTri.includes(x));
    if (moi.length) doi([...giaTri, ...moi]);
    setChu("");
  };
  return (
    <div
      className={`flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-sm border bg-bg px-2 py-1 transition focus-within:border-accent ${loi && !giaTri.length ? "border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : "border-border"} ${tat ? "opacity-60" : "cursor-text"}`}
      onClick={() => o.current?.focus()}
    >
      {giaTri.map((g) => (
        <span
          key={g}
          className="inline-flex items-center gap-1 rounded-full border border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] py-px pl-2 pr-1 text-[11.5px] text-text"
        >
          {g}
          {!tat && (
            <button
              type="button"
              aria-label={`Bỏ ${g}`}
              onClick={() => doi(giaTri.filter((x) => x !== g))}
              className="rounded-full p-0.5 text-text-muted hover:text-red"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {!tat && (
        <input
          ref={o}
          value={chu}
          onChange={(e) => setChu(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              e.stopPropagation();
              them();
            } else if (e.key === "Backspace" && !chu && giaTri.length) doi(giaTri.slice(0, -1));
          }}
          onBlur={them}
          placeholder={giaTri.length ? "" : goiY}
          className="min-w-[140px] flex-1 bg-transparent py-0.5 text-[12.5px] text-text outline-none placeholder:text-text-muted"
        />
      )}
    </div>
  );
}

function NhapDieuKien({
  giaTri,
  doi,
  dm,
  tat,
  loi,
  nhan,
}: {
  giaTri: Partial<DieuKien> | null | undefined;
  doi: (v: Partial<DieuKien>) => void;
  dm: DanhMucMau;
  tat?: boolean;
  loi?: boolean;
  nhan: string;
}) {
  const v = giaTri ?? {};
  const phep = PHEP_DK.find((p) => p.gt === v.phep);
  const laSo = !!v.phep && PHEP_SO.includes(v.phep as PhepSo);
  return (
    <div className="space-y-2">
      <ChonThamChieu nhan={nhan} giaTri={v.tham_chieu} doi={(tc) => doi({ ...v, tham_chieu: tc ?? undefined })} dm={dm} tat={tat} loi={loi} choKy />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-[190px]">
          <Chon
            nhan={`${nhan} — phép`}
            tat={tat}
            loi={loi && !v.phep}
            goiY="— Điều kiện —"
            giaTri={v.phep}
            doi={(p) => doi({ ...v, phep: (p || undefined) as DieuKien["phep"] })}
            ds={PHEP_DK.map((p) => ({ gt: p.gt, nhan: p.nhan }))}
          />
        </div>
        {/* Phép so sánh SỐ → ô chữ kiểm chuẩn số Việt Nam (chốt 130), đọc bằng đúng bộ đọc của luật (soThamSo); phép chữ → ô chữ thường */}
        {phep?.can_gt &&
          (laSo ? (
            <ONhapSo
              aria-label={`${nhan} — giá trị`}
              className={`${LOP_O_NHAP} !w-auto min-w-[180px] flex-1 ${loi && (v.gia_tri === undefined || v.gia_tri === "") ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""}`}
              disabled={tat}
              placeholder="Số"
              value={soThamSo(v.gia_tri)}
              onChange={(n) => doi({ ...v, gia_tri: n ?? "" })}
            />
          ) : (
            <input
              aria-label={`${nhan} — giá trị`}
              className={`${LOP_O_NHAP} !w-auto min-w-[180px] flex-1 ${loi && (v.gia_tri === undefined || v.gia_tri === "") ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""}`}
              disabled={tat}
              type="text"
              placeholder="Giá trị, vd Có"
              value={v.gia_tri ?? ""}
              onChange={(e) => doi({ ...v, gia_tri: e.target.value })}
            />
          ))}
      </div>
    </div>
  );
}

// ---------------- Tính toán: phép tính, chọn nhiều cột, công thức ----------------

const PHEP_TINH: { ma: string; ky: string; ten: string }[] = [
  { ma: "hieu", ky: "A − B", ten: "Hiệu" },
  { ma: "tong", ky: "A + B", ten: "Tổng" },
  { ma: "tich", ky: "A × B", ten: "Tích" },
  { ma: "thuong", ky: "A ÷ B", ten: "Thương" },
  { ma: "phan_tram", ky: "A ÷ B × 100", ten: "Phần trăm" },
  { ma: "chi_a", ky: "= A", ten: "So thẳng với A" },
];
const KY_SO: Record<PhepSo, string> = { "=": "=", "!=": "≠", "<": "<", "<=": "≤", ">": ">", ">=": "≥" };

function ChonPhepTinh({ giaTri, doi, tat, loi }: { giaTri: unknown; doi: (ma: string) => void; tat?: boolean; loi?: boolean }) {
  const chon = chuanPhepTinh(giaTri);
  return (
    <div
      className={`grid grid-cols-3 gap-1.5 sm:grid-cols-6 ${loi && !chon ? "rounded-sm ring-1 ring-red/60 ring-offset-2 ring-offset-[var(--surface)]" : ""}`}
      role="radiogroup"
      aria-label="Phép tính"
    >
      {PHEP_TINH.map((p) => {
        const dang = chon === p.ma;
        return (
          <button
            key={p.ma}
            type="button"
            role="radio"
            aria-checked={dang}
            disabled={tat}
            onClick={() => doi(p.ma)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-sm border px-1.5 py-2 transition disabled:cursor-not-allowed ${
              dang ? "border-accent bg-accent/10" : "border-border hover:border-accent/50 hover:bg-white/[0.03]"
            }`}
          >
            <span className={`whitespace-nowrap font-mono text-[13px] font-bold ${dang ? "text-accent" : "text-text"}`}>{p.ky}</span>
            <span className="text-[10.5px] text-text-muted">{p.ten}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChonSoSanh({ giaTri, doi, tat }: { giaTri: unknown; doi: (p: PhepSo) => void; tat?: boolean }) {
  const chon = (PHEP_SO.includes(giaTri as PhepSo) ? giaTri : "=") as PhepSo;
  return (
    <div className="inline-flex overflow-hidden rounded-sm border border-border" role="radiogroup" aria-label="So sánh">
      {PHEP_SO.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={chon === p}
          title={NHAN_PHEP_SO[p]}
          disabled={tat}
          onClick={() => doi(p)}
          className={`w-10 py-1.5 font-mono text-[13px] font-bold transition ${chon === p ? "bg-accent text-white" : "text-text-secondary hover:bg-white/5 hover:text-text"}`}
        >
          {KY_SO[p]}
        </button>
      ))}
    </div>
  );
}

const boDauNho = (x: string) =>
  x
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Chọn NHIỀU cột (hoặc ô) theo nhãn thật; lưu tag. Giá trị cũ ghi bằng nhãn vẫn nhận ra. */
function ChonNhieuCot({
  ds,
  giaTri,
  doi,
  tat,
  loi,
  khiTrong,
  loaiTen = "cột",
}: {
  ds: MucChon[];
  giaTri: string[];
  doi: (v: string[]) => void;
  tat?: boolean;
  loi?: boolean;
  khiTrong?: string;
  loaiTen?: string;
}) {
  const tim = (x: string) => ds.find((c) => c.tag === x || boDauNho(c.nhan) === boDauNho(x));
  const conLai = ds.filter((c) => !giaTri.some((g) => tim(g)?.tag === c.tag));
  if (!ds.length)
    return <div className="rounded-sm border border-dashed border-border px-3 py-2 text-[11.5px] text-text-muted">{khiTrong ?? "Chưa có gì để chọn"}</div>;
  return (
    <div
      className={`flex min-h-[34px] flex-wrap items-center gap-1.5 rounded-sm border bg-bg px-2 py-1 ${loi && !giaTri.length ? "border-red/70" : "border-border"} ${tat ? "opacity-60" : ""}`}
    >
      {giaTri.map((g) => {
        const c = tim(g);
        return (
          <span
            key={g}
            title={c ? undefined : `Không có ${loaiTen} "${g}" trong mẫu đã chọn`}
            className={`inline-flex items-center gap-1 rounded-full border py-px pl-2 pr-1 text-[11.5px] ${c ? "border-accent/50 text-text" : "border-yellow/60 text-yellow"}`}
          >
            {c?.nhan ?? g}
            {!tat && (
              <button
                type="button"
                aria-label={`Bỏ ${c?.nhan ?? g}`}
                onClick={() => doi(giaTri.filter((x) => x !== g))}
                className="rounded-full p-0.5 text-text-muted hover:text-red"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        );
      })}
      {!tat && conLai.length > 0 && (
        <span className="relative inline-flex items-center">
          <Plus className="pointer-events-none absolute left-1.5 h-3 w-3 text-accent" />
          <select
            aria-label={`Thêm ${loaiTen}`}
            value=""
            onChange={(e) => e.target.value && doi([...giaTri, e.target.value])}
            className="cursor-pointer appearance-none rounded-full border border-dashed border-border bg-transparent py-0.5 pl-5 pr-2 text-[11.5px] text-text-secondary outline-none transition hover:border-accent/60 hover:text-text focus:border-accent"
          >
            <option value="">Thêm {loaiTen}…</option>
            {conLai.map((c) => (
              <option key={c.tag} value={c.tag} className="text-text">
                {c.nhan}
              </option>
            ))}
          </select>
        </span>
      )}
      {!tat && conLai.length > 1 && (
        <button type="button" onClick={() => doi([...giaTri, ...conLai.map((c) => c.tag)])} className="ml-auto text-[10.5px] text-text-muted hover:text-accent">
          Chọn hết
        </button>
      )}
    </div>
  );
}

/** Dải công thức đọc nhanh: [Lệch] = [TH lũy kế] − [KH lũy kế]. */
function CongThuc({ v, dm }: { v: Record<string, unknown>; dm: DanhMucMau }) {
  const phep = chuanPhepTinh(v.phep_tinh);
  const ten = (tc: unknown, so?: unknown): string | null => {
    const t = tc as Partial<{ o: string; bang: string; cot: string }> | null;
    if (t?.o) return dm.o.find((o) => o.tag === t.o)?.nhan ?? t.o;
    if (t?.bang && t.cot) return dm.bang.find((b) => b.tag === t.bang)?.cot.find((c) => c.tag === t.cot)?.nhan ?? t.cot;
    if (so !== undefined && so !== null && so !== "") return String(so).replace(".", ",");
    return null;
  };
  const chip = (x: string | null) =>
    x ? (
      <span className="rounded-sm border border-border bg-bg px-2 py-0.5 text-[12.5px] font-semibold text-text">{x}</span>
    ) : (
      <span className="rounded-sm border border-dashed border-border px-2 py-0.5 text-[12.5px] text-text-muted">?</span>
    );
  const op = (x: string) => <span className="font-mono text-[14px] font-bold text-accent">{x}</span>;
  const B = ten(v.b, v.b_so);
  const them = Array.isArray(v.them) ? (v.them as unknown[]).map(String) : [];
  const bangKq = (v.ket_qua as { bang?: string } | null)?.bang;
  const tenThem = (x: string) =>
    (bangKq ? dm.bang.find((b) => b.tag === bangKq)?.cot.find((c) => c.tag === x)?.nhan : dm.o.find((o) => o.tag === x)?.nhan) ?? x;
  const soSanh = KY_SO[(PHEP_SO.includes(v.so_sanh as PhepSo) ? v.so_sanh : "=") as PhepSo];
  const phai: React.ReactNode[] = [];
  if (phep === "hieu") phai.push(op("−"), chip(B));
  if (phep === "tong") {
    phai.push(op("+"), chip(B));
    for (const x of them) phai.push(op("+"), chip(tenThem(x)));
  }
  if (phep === "tich") phai.push(op("×"), chip(B));
  if (phep === "thuong" || phep === "phan_tram") phai.push(op("÷"), chip(B));
  if (phep === "phan_tram") phai.push(op("×"), chip("100"));
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-sm border border-accent/30 bg-accent/[0.05] px-3 py-2.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">Công thức</span>
      {chip(ten(v.ket_qua))}
      {op(soSanh)}
      {chip(ten(v.a, v.a_so))}
      {phai.map((x, i) => (
        <span key={i} className="inline-flex">
          {x}
        </span>
      ))}
      {!phep && <span className="text-[11.5px] text-text-muted">— chọn phép tính</span>}
      {bangKq && <span className="ml-auto text-[10.5px] text-text-muted">xét từng dòng của bảng</span>}
    </div>
  );
}

// ---------------- Khung tham số ----------------

function NhanTruong({ t, ve }: { t: ThamSoUi; ve?: boolean }) {
  if (ve)
    return (
      <span className="mb-1 flex items-center gap-2 text-[11px] font-semibold text-text-secondary">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-accent/60 font-mono text-[11px] font-bold text-accent">
          {t.khoa.toUpperCase()}
        </span>
        Vế {t.khoa.toUpperCase()} <span className="font-normal text-text-muted">— một ô, một cột hoặc một số</span>
        <span className="text-red">*</span>
      </span>
    );
  return (
    <span className="mb-1 flex items-baseline gap-1 text-[11px] font-semibold text-text-secondary">
      {t.nhan}
      {t.bat_buoc ? <span className="text-red">*</span> : <span className="font-normal text-text-muted">(không bắt buộc)</span>}
    </span>
  );
}

export function ThamSoLuat({
  loai,
  giaTri,
  doi,
  dm,
  tat,
  hienLoi,
  loiMay = [],
}: {
  loai: LoaiLuatUi & { tham_so: ThamSoUi[] };
  giaTri: Record<string, unknown> | null;
  doi: (v: Record<string, unknown>) => void;
  dm: DanhMucMau;
  tat?: boolean;
  hienLoi?: boolean;
  /** danh_sach_loi máy chủ trả khi lưu / chạy thử */
  loiMay?: string[];
}) {
  const v = useMemo(() => giaTri ?? {}, [giaTri]);
  const dat = (k: string, x: unknown) => doi({ ...v, [k]: x });
  const laNgay = loai.ma.includes("ngay");
  const laNeuThi = loai.tham_so.filter((t) => t.kieu === "dieu_kien").length >= 2;
  const laTinhToan = loai.ma === "tinh_toan";
  const phep = chuanPhepTinh(v.phep_tinh);
  /** Tham số số đi cặp với một tham chiếu: a ↔ a_so (vế tính toán) */
  const capSo = (t: ThamSoUi) => (t.kieu === "tham_chieu" ? loai.tham_so.find((c) => c.kieu === "so" && c.khoa === `${t.khoa}_so`) : undefined);
  const bangKetQua = ((v.ket_qua ?? v.a ?? v.b) as { bang?: string } | null | undefined)?.bang || undefined;
  const an = (t: ThamSoUi) =>
    (t.kieu === "so" && t.khoa.endsWith("_so") && loai.tham_so.some((c) => c.kieu === "tham_chieu" && `${c.khoa}_so` === t.khoa)) ||
    (laTinhToan && t.khoa === "b" && phep === "chi_a") ||
    (laTinhToan && t.khoa === "them" && phep !== "tong");

  function truong(t: ThamSoUi) {
    const x = v[t.khoa];
    const loi = hienLoi && t.bat_buoc;
    switch (t.kieu) {
      case "o":
        return (
          <Chon
            nhan={t.nhan}
            tat={tat}
            loi={loi && !x}
            goiY="— Chọn ô —"
            giaTri={x as string}
            doi={(g) => dat(t.khoa, g || null)}
            ds={dm.o.map((o) => ({ gt: o.tag, nhan: o.nhan + chiCo(o, dm) }))}
          />
        );
      case "bang":
        return (
          <Chon
            nhan={t.nhan}
            tat={tat}
            loi={loi && !x}
            goiY="— Chọn bảng —"
            giaTri={x as string}
            doi={(g) => {
              // Đổi bảng → bỏ các cột đang theo bảng này
              const moi: Record<string, unknown> = {
                ...v,
                [t.khoa]: g || null,
              };
              for (const c of loai.tham_so) if (c.kieu === "cot" && (c.theo_bang ?? "bang") === t.khoa) moi[c.khoa] = null;
              doi(moi);
            }}
            ds={dm.bang.map((b) => ({
              gt: b.tag,
              nhan: b.nhan + chiCo(b, dm),
            }))}
          />
        );
      case "cot": {
        const bang = v[t.theo_bang ?? "bang"] as string | undefined;
        const ds = dm.bang.find((b) => b.tag === bang)?.cot ?? [];
        return (
          <Chon
            nhan={t.nhan}
            tat={tat || !bang}
            loi={loi && !!bang && !x}
            goiY={bang ? "— Chọn cột —" : "Chọn bảng trước"}
            giaTri={x as string}
            doi={(g) => dat(t.khoa, g || null)}
            ds={ds.map((c) => ({ gt: c.tag, nhan: c.nhan }))}
          />
        );
      }
      case "muc":
        return (
          <Chon
            nhan={t.nhan}
            tat={tat}
            loi={loi && !x}
            goiY="— Chọn mục —"
            giaTri={x as string}
            doi={(g) => dat(t.khoa, g || null)}
            ds={dm.muc.map((m) => ({ gt: m.tag, nhan: m.nhan + chiCo(m, dm) }))}
          />
        );
      case "tham_chieu": {
        const cap = capSo(t);
        return (
          <ChonThamChieu
            nhan={t.nhan}
            giaTri={x as ThamChieu | null}
            doi={(g) => dat(t.khoa, g)}
            dm={dm}
            tat={tat}
            loi={loi || (hienLoi && !!cap && ["a", "b"].includes(t.khoa))}
            choKy={t.cho_ky}
            bangMacDinh={t.khoa !== "ket_qua" ? bangKetQua : undefined}
            coSo={
              cap
                ? {
                    giaTri: v[cap.khoa] as number | null | undefined,
                    doi: (n) => doi({ ...v, [cap.khoa]: n, ...(n !== null ? { [t.khoa]: null } : {}) }),
                  }
                : undefined
            }
          />
        );
      }
      case "phep_so":
        if (laTinhToan && t.khoa === "so_sanh") return <ChonSoSanh giaTri={x ?? t.mac_dinh} doi={(p) => dat(t.khoa, p)} tat={tat} />;
        return (
          <Chon
            nhan={t.nhan}
            tat={tat}
            loi={loi && !x}
            goiY="— Phép so sánh —"
            giaTri={x as string}
            doi={(g) => dat(t.khoa, g || null)}
            ds={PHEP_SO.map((p) => ({
              gt: p,
              nhan: `${laNgay ? NHAN_PHEP_NGAY[p] : NHAN_PHEP_SO[p]}  (${p === "!=" ? "≠" : p === "<=" ? "≤" : p === ">=" ? "≥" : p})`,
            }))}
          />
        );
      case "so":
        // Tham số số gõ được SỐ LẺ (sai số 0,1 · khoảng từ–đến) → ô chữ kiểm chuẩn số Việt Nam (chốt 130)
        return (
          <ONhapSo
            aria-label={t.nhan}
            className={`${LOP_O_NHAP} ${loi && (x === undefined || x === null || x === "") ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""}`}
            disabled={tat}
            placeholder={t.mac_dinh !== undefined ? `Mặc định ${hienTs(t.mac_dinh)}` : "Số"}
            value={soThamSo(x)}
            onChange={(n) => dat(t.khoa, n)}
          />
        );
      case "chu":
        if (t.khoa === "phep_tinh")
          return (
            <ChonPhepTinh
              giaTri={x}
              tat={tat}
              loi={loi}
              doi={(ma) => {
                const moi: Record<string, unknown> = { ...v, phep_tinh: ma };
                if (ma === "chi_a") Object.assign(moi, { b: null, b_so: null });
                if (ma !== "tong") moi.them = [];
                doi(moi);
              }}
            />
          );
        if (t.khoa === "dinh_dang")
          return (
            <Chon
              nhan={t.nhan}
              tat={tat}
              giaTri={x as string}
              goiY="— Không dùng định dạng có sẵn —"
              doi={(g) => dat(t.khoa, g || null)}
              ds={DINH_DANG_CO_SAN.map((d) => ({
                gt: d.ma,
                nhan: `${d.nhan.charAt(0).toUpperCase()}${d.nhan.slice(1)} — vd ${d.vi_du}`,
              }))}
            />
          );
        return (
          <input
            aria-label={t.nhan}
            className={`${LOP_O_NHAP} ${loi && !x ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""} ${t.khoa === "regex" ? "font-mono" : ""}`}
            disabled={tat}
            placeholder={t.goi_y}
            value={(x as string) ?? ""}
            onChange={(e) => dat(t.khoa, e.target.value)}
          />
        );
      case "danh_sach":
        if (t.khoa === "cot" && loai.tham_so.some((c) => c.khoa === "bang")) {
          const bang = v.bang as string | undefined;
          return (
            <ChonNhieuCot
              ds={dm.bang.find((b) => b.tag === bang)?.cot ?? []}
              giaTri={Array.isArray(x) ? (x as unknown[]).map(String) : []}
              doi={(g) => dat(t.khoa, g)}
              tat={tat}
              loi={loi}
              khiTrong="Chọn bảng trước — các cột của bảng hiện ở đây"
            />
          );
        }
        if (t.khoa === "them")
          return (
            <ChonNhieuCot
              ds={bangKetQua ? (dm.bang.find((b) => b.tag === bangKetQua)?.cot ?? []) : dm.o}
              loaiTen={bangKetQua ? "cột" : "ô"}
              giaTri={Array.isArray(x) ? (x as unknown[]).map(String) : []}
              doi={(g) => dat(t.khoa, g)}
              tat={tat}
            />
          );
        return <NhapChip giaTri={Array.isArray(x) ? (x as unknown[]).map(String) : []} doi={(g) => dat(t.khoa, g)} tat={tat} loi={loi} goiY={t.goi_y} />;
      case "dieu_kien":
        return <NhapDieuKien nhan={t.nhan} giaTri={x as Partial<DieuKien>} doi={(g) => dat(t.khoa, g)} dm={dm} tat={tat} loi={loi} />;
      case "bool":
        return (
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] text-text-secondary">
            <input type="checkbox" className="accent-[var(--accent)]" disabled={tat} checked={!!x} onChange={(e) => dat(t.khoa, e.target.checked)} />
            {t.nhan}
          </label>
        );
      default:
        return <span className="text-[11px] text-text-muted">Kiểu tham số chưa hỗ trợ: {t.kieu}</span>;
    }
  }

  const khungLoi = (t: ThamSoUi, noiDung: React.ReactNode) => {
    const ls = loiCuaThamSo(t, loiMay);
    if (!ls.length) return noiDung;
    return (
      <div className="rounded-sm ring-1 ring-[color:color-mix(in_srgb,var(--red)_50%,transparent)] ring-offset-2 ring-offset-[var(--surface)]">
        {noiDung}
        <ul className="mt-1 space-y-0.5">
          {ls.map((m, i) => (
            <li key={i} className="text-[10.5px] text-red">
              {m}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const rong = (t: ThamSoUi) =>
    ["tham_chieu", "dieu_kien", "danh_sach"].includes(t.kieu) || (t.kieu === "chu" && t.khoa !== "dinh_dang") || (t.kieu === "phep_so" && laTinhToan);

  if (laNeuThi) {
    return (
      <div className="space-y-2">
        {loai.tham_so.map((t) => (
          <div key={t.khoa} className="flex gap-3 rounded-sm border border-border-light p-3">
            <div className="w-12 shrink-0 pt-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent">{t.nhan}</div>
            <div className="min-w-0 flex-1">{khungLoi(t, truong(t))}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      {laTinhToan && (
        <div className="sm:col-span-2">
          <CongThuc v={v} dm={dm} />
        </div>
      )}
      {loai.tham_so
        .filter((t) => !an(t))
        .map((t) => (
          <div key={t.khoa} className={`${rong(t) ? "sm:col-span-2" : ""} ${t.kieu === "bool" ? "self-center" : ""}`}>
            {t.kieu !== "bool" && <NhanTruong t={t} ve={!!capSo(t)} />}
            {khungLoi(t, truong(t))}
            {t.goi_y && !capSo(t) && !["chu", "so", "danh_sach", "bool"].includes(t.kieu) && <span className="mt-0.5 block text-[10.5px] text-text-muted">{t.goi_y}</span>}
            {t.goi_y && t.kieu === "so" && <span className="mt-0.5 block text-[10.5px] text-text-muted">{t.goi_y}</span>}
          </div>
        ))}
    </div>
  );
}
