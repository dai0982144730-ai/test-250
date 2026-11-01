"use client";
// Thanh lọc danh sách file của một thư mục: tìm kiếm (không dấu), khoảng ngày (nhanh hoặc từ–đến), mẫu, người tải lên.
// Lọc ngay trên máy (thư mục đã tải đủ danh sách), đổi thư mục thì tự bỏ lọc.
import { Search, X } from "lucide-react";
import ONhapNgay from "@/components/common/ONhapNgay";
import { chuanHoa, congNgay, homNayVN, lucVN } from "@/lib/so-cai/tien-ich";

export interface BoLoc {
  tu_khoa: string;
  khoang: "" | "hom_nay" | "7_ngay" | "30_ngay" | "thang_nay" | "nam_nay" | "tuy_chon";
  tu: string; // yyyy-mm-dd (khi tùy chọn)
  den: string;
  mau: string; // mã mẫu, "_khong" = không theo mẫu
  nguoi: string;
}

export const BO_LOC_TRONG: BoLoc = { tu_khoa: "", khoang: "", tu: "", den: "", mau: "", nguoi: "" };

export interface DongLoc {
  ten: string;
  ten_tep?: string;
  mau_ma: string | null;
  mau_ten?: string | null;
  tai_len_boi?: string;
  tai_len_boi_ten?: string;
  don_vi_lap_ten?: string | null;
  nhan?: string | null;
}

const KHOANG: { gia_tri: BoLoc["khoang"]; nhan: string }[] = [
  { gia_tri: "", nhan: "Mọi lúc" },
  { gia_tri: "hom_nay", nhan: "Hôm nay" },
  { gia_tri: "7_ngay", nhan: "7 ngày qua" },
  { gia_tri: "30_ngay", nhan: "30 ngày qua" },
  { gia_tri: "thang_nay", nhan: "Tháng này" },
  { gia_tri: "nam_nay", nhan: "Năm nay" },
  { gia_tri: "tuy_chon", nhan: "Từ ngày … đến ngày …" },
];

/** Khoảng ngày [tu, den] (yyyy-mm-dd, theo giờ Việt Nam) của bộ lọc; null = không giới hạn. */
function khoangNgay(l: BoLoc): { tu: string | null; den: string | null } {
  const nay = homNayVN();
  switch (l.khoang) {
    case "hom_nay":
      return { tu: nay, den: nay };
    case "7_ngay":
      return { tu: congNgay(nay, -6), den: nay };
    case "30_ngay":
      return { tu: congNgay(nay, -29), den: nay };
    case "thang_nay":
      return { tu: `${nay.slice(0, 7)}-01`, den: nay };
    case "nam_nay":
      return { tu: `${nay.slice(0, 4)}-01-01`, den: nay };
    case "tuy_chon":
      return { tu: l.tu || null, den: l.den || null };
    default:
      return { tu: null, den: null };
  }
}

export function dangLoc(l: BoLoc): boolean {
  return !!(l.tu_khoa.trim() || l.khoang || l.mau || l.nguoi);
}

/** Lọc các dòng; lucCua = thời điểm dùng để lọc ngày (lúc tải lên, hoặc lúc xóa trong Thùng rác). */
export function locDong<T extends DongLoc>(ds: T[], l: BoLoc, lucCua: (d: T) => string | null | undefined): T[] {
  const k = chuanHoa(l.tu_khoa);
  const { tu, den } = khoangNgay(l);
  return ds.filter((d) => {
    if (k && !chuanHoa([d.ten, d.ten_tep, d.tai_len_boi_ten, d.don_vi_lap_ten, d.mau_ma, d.mau_ten, d.nhan].filter(Boolean).join(" ")).includes(k)) return false;
    if (l.mau && (l.mau === "_khong" ? !!d.mau_ma : d.mau_ma !== l.mau)) return false;
    if (l.nguoi && d.tai_len_boi !== l.nguoi) return false;
    if (tu || den) {
      const ngay = lucVN(lucCua(d) ?? "").slice(0, 10);
      if (!ngay) return false;
      if (tu && ngay < tu) return false;
      if (den && ngay > den) return false;
    }
    return true;
  });
}

const O = "rounded-sm border border-border bg-surface px-2 py-1 text-[12.5px] text-text outline-none focus:border-accent";

function Nut({ chon, onClick, children, title }: { chon: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] ${chon ? "border-accent bg-accent text-white" : "border-border text-text-secondary hover:border-accent hover:text-text"}`}
    >
      {children}
    </button>
  );
}

/** Thanh lọc dạng dàn nút (không dùng danh sách thả xuống): tìm kiếm · khoảng ngày · mẫu. */
export function ThanhLoc<T extends DongLoc>({
  ds,
  loc,
  doi,
  soHien,
  nhanNgay = "Ngày tải lên",
}: {
  ds: T[];
  loc: BoLoc;
  doi: (l: BoLoc) => void;
  soHien: number;
  nhanNgay?: string;
}) {
  const mau = Array.from(new Map(ds.filter((d) => d.mau_ma).map((d) => [d.mau_ma as string, d.mau_ten ?? d.mau_ma])).entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "vi", { numeric: true }),
  );
  const coKhongMau = ds.some((d) => !d.mau_ma);
  const dat = (p: Partial<BoLoc>) => doi({ ...loc, ...p });

  return (
    <div className="mb-3 space-y-1.5">
      <label className="relative block">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={loc.tu_khoa}
          onChange={(e) => dat({ tu_khoa: e.target.value })}
          placeholder="Tìm trong thư mục: tên file, người tải lên, đơn vị, mẫu…"
          className={`${O} w-full pl-7`}
          aria-label="Tìm trong thư mục"
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{nhanNgay}</span>
        {KHOANG.map((k) => (
          <Nut key={k.gia_tri} chon={loc.khoang === k.gia_tri} onClick={() => dat({ khoang: k.gia_tri })}>
            {k.gia_tri === "tuy_chon" ? "Từ ngày … đến ngày" : k.nhan}
          </Nut>
        ))}
        {loc.khoang === "tuy_chon" && (
          <span className="flex items-center gap-1 text-[12px] text-text-muted">
            <ONhapNgay value={loc.tu} max={loc.den || undefined} onChange={(x) => dat({ tu: x })} className={O} aria-label="Từ ngày" />
            –
            <ONhapNgay value={loc.den} min={loc.tu || undefined} onChange={(x) => dat({ den: x })} className={O} aria-label="Đến ngày" />
          </span>
        )}
      </div>
      {(mau.length > 1 || (mau.length > 0 && coKhongMau)) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">Mẫu</span>
          <Nut chon={!loc.mau} onClick={() => dat({ mau: "" })}>
            Tất cả
          </Nut>
          {mau.map(([ma, ten]) => (
            <Nut key={ma} chon={loc.mau === ma} onClick={() => dat({ mau: loc.mau === ma ? "" : ma })} title={String(ten)}>
              {ma.replace(/^form-/i, "Form ")}
            </Nut>
          ))}
          {coKhongMau && (
            <Nut chon={loc.mau === "_khong"} onClick={() => dat({ mau: loc.mau === "_khong" ? "" : "_khong" })}>
              Không theo mẫu
            </Nut>
          )}
        </div>
      )}
      {dangLoc(loc) && (
        <div className="flex items-center gap-2 text-[12px] text-text-muted">
          Đang hiện <b className="text-text">{soHien}</b>/{ds.length} file
          <button type="button" onClick={() => doi(BO_LOC_TRONG)} className="inline-flex items-center gap-0.5 text-accent hover:underline">
            <X size={12} /> Xóa lọc
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------- Tuần báo cáo (thanh trên cùng, như "Hồ sơ dự án") ----------------

export interface Tuan {
  nam: number;
  so: number;
}

/** Tuần ISO (thứ Hai là ngày đầu tuần) của một ngày yyyy-mm-dd. */
export function tuanCua(ngay: string): Tuan {
  const d = new Date(`${ngay.slice(0, 10)}T00:00:00Z`);
  const thu = (d.getUTCDay() + 6) % 7; // 0 = thứ Hai
  d.setUTCDate(d.getUTCDate() - thu + 3); // thứ Năm cùng tuần quyết định năm
  const nam = d.getUTCFullYear();
  const dau = new Date(Date.UTC(nam, 0, 4));
  const so = 1 + Math.round(((d.getTime() - dau.getTime()) / 86400000 - 3 + ((dau.getUTCDay() + 6) % 7)) / 7);
  return { nam, so };
}

/** Thứ Hai → Chủ nhật của tuần (yyyy-mm-dd). */
export function khoangTuan(t: Tuan): { tu: string; den: string } {
  const dau = new Date(Date.UTC(t.nam, 0, 4));
  const thuHai = new Date(dau.getTime() - ((dau.getUTCDay() + 6) % 7) * 86400000 + (t.so - 1) * 7 * 86400000);
  const tu = thuHai.toISOString().slice(0, 10);
  return { tu, den: congNgay(tu, 6) };
}

export function doiTuan(t: Tuan, buoc: number): Tuan {
  return tuanCua(congNgay(khoangTuan(t).tu, buoc * 7));
}

export function locTheoTuan<T>(ds: T[], t: Tuan | null, lucCua: (d: T) => string | null | undefined): T[] {
  if (!t) return ds;
  const { tu, den } = khoangTuan(t);
  return ds.filter((d) => {
    const ngay = lucVN(lucCua(d) ?? "").slice(0, 10);
    return !!ngay && ngay >= tu && ngay <= den;
  });
}

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Ô chọn tuần báo cáo: ◀ Tuần 39 · 21/09–27/09/2026 ▶ · Tất cả tuần. */
export function ChonTuan({ tuan, doi }: { tuan: Tuan | null; doi: (t: Tuan | null) => void }) {
  const hienTai = tuanCua(homNayVN());
  const t = tuan ?? hienTai;
  const { tu, den } = khoangTuan(t);
  const nutMui = "inline-flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-white/5 hover:text-text";
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-1 text-[12px]" title="Chỉ hiện tài liệu tải lên trong tuần báo cáo đã chọn">
      <span className="px-1 text-text-muted">Tuần báo cáo:</span>
      <button type="button" className={nutMui} onClick={() => doi(doiTuan(t, -1))} aria-label="Tuần trước">
        ‹
      </button>
      <button
        type="button"
        onClick={() => doi(tuan ? null : hienTai)}
        className={`rounded-sm px-1.5 font-semibold ${tuan ? "text-accent" : "text-text-secondary"}`}
        title={tuan ? "Bấm để xem tất cả tuần" : "Bấm để lọc theo tuần này"}
      >
        W{t.so}
        <span className="ml-1 font-normal text-text-muted">
          · {dm(tu)}–{dm(den)}/{den.slice(0, 4)}
        </span>
      </button>
      <button type="button" className={nutMui} onClick={() => doi(doiTuan(t, 1))} aria-label="Tuần sau">
        ›
      </button>
      <button
        type="button"
        onClick={() => doi(null)}
        className={`ml-1 rounded-full border px-2 py-0.5 ${!tuan ? "border-accent bg-accent text-white" : "border-border text-text-secondary hover:text-text"}`}
      >
        Tất cả tuần
      </button>
    </div>
  );
}
