"use client";
// TRÌNH THÊM / SỬA LUẬT (ngăn kéo bên phải, 5 bước rõ ràng):
//   1 · Viết câu luật + chọn mẫu áp dụng   2 · Cách chạy (AI đề xuất Code / AI, hoặc tự chọn dạng luật)
//   3 · Tham số (dựng tự động theo dạng luật) / hướng dẫn AI   4 · Mức   5 · Chạy thử   → Lưu.
// Luật hệ thống: chỉ bật/tắt và đổi mức. Người không có quyền: xem, không sửa.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Braces,
  Calculator,
  CalendarRange,
  Check,
  FileText,
  ListFilter,
  Lock,
  Pencil,
  Save,
  Sigma,
  Sparkles,
  Table2,
  TextCursorInput,
  Wand2,
} from "lucide-react";
import type { CachKiem, DeXuatLuat, LuatKiemTra, LuatNhap, MucLuat } from "@/lib/luat/types";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";
import { docThanhLoi, kiemThamSo } from "@/lib/luat/loai-luat";
import { CongTac, LOP_O_NHAP, Nut, ngayGio } from "@/components/layout/giao-dien";
import { dichCau, LoiLuatApi, luuLuat, type LoaiLuatUi } from "./api";
import { GhiChu, HuyHieuCach, HuyHieuHeThong, HuyHieuMuc, NHAN_CACH, NHAN_MUC, NganKeo, Phim, kieuCau, tenApDung, tenMau } from "./chung";
import { docLoi, lapDanhMuc, loiKhongGan, thamSoMacDinh, thieuThamSo, ThamSoLuat } from "./ThamSoLuat";
import { KhungChayThu } from "./KhungChayThu";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

export const CAU_GOI_Y = [
  "Cột Kết thúc của bảng Công việc phải có ngày",
  "Nếu Đã xong thì phải có ngày Kết thúc",
  "Báo cáo phải có ít nhất 1 việc trong bảng Công việc",
  "Ngày lập không được trước ngày đầu kỳ báo cáo",
  "Mức độ chỉ là Cao, Trung bình hoặc Thấp",
  "Người kiểm soát phải là người khác người lập",
  "Cột Lệch = TH − KH",
  "Dòng TỔNG bằng tổng các dòng",
  "Tổng doanh thu phải khớp với doanh thu từng nhà máy",
];

type Icon = React.ComponentType<{ className?: string }>;
const NHOM_LOAI: { ten: string; ma: string[]; icon: Icon }[] = [
  { ten: "Ô nhập", ma: ["o_co_gia_tri", "o_khop_mau"], icon: TextCursorInput },
  { ten: "Ngày và số", ma: ["so_sanh_ngay", "khoang_so"], icon: CalendarRange },
  { ten: "Tính toán số liệu", ma: ["tinh_toan", "dong_tong"], icon: Calculator },
  { ten: "Bảng", ma: ["bang_toi_thieu", "cot_bat_buoc", "khong_trung", "phu_trach_hop_le"], icon: Table2 },
  { ten: "Giá trị và điều kiện", ma: ["thuoc_danh_sach", "neu_thi"], icon: ListFilter },
  { ten: "Mục nội dung", ma: ["muc_co_noi_dung"], icon: FileText },
];
/** Biểu tượng riêng của một dạng (mặc định theo nhóm). */
const iconLoai = (ma: string): Icon => (ma === "dong_tong" ? Sigma : (NHOM_LOAI.find((g) => g.ma.includes(ma))?.icon ?? Braces));

const BO_DAU = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
function taoMa(ten: string): string {
  const g = BO_DAU(ten)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36)
    .replace(/-+$/, "");
  return `${g || "luat"}-${Math.random().toString(36).slice(2, 6)}`;
}

function banDau(l: LuatKiemTra | null | undefined, cau?: string): LuatNhap {
  if (l) {
    const { he_thong: _h, phien_ban: _p, tao_boi: _tb, tao_luc: _tl, sua_boi: _sb, sua_luc: _sl, da_xoa: _d, ...v } = l;
    return structuredClone(v);
  }
  return {
    id: null,
    ma: "",
    ten: "",
    cau_luat: cau ?? "",
    mo_ta: null,
    cach_kiem: "code",
    loai: null,
    tham_so: {},
    huong_dan_ai: null,
    ap_dung: "tat_ca",
    muc: "canh_bao",
    khi_ai_loi: "cho_gui",
    bat: true,
    nhom: null,
    thu_tu: 100,
  };
}

/** Thử hàm của lib (luat-loai); chưa làm / lỗi → dùng bản của giao diện. */
function thu<T>(f: () => T, duPhong: T): T {
  try {
    const r = f();
    return r ?? duPhong;
  } catch {
    return duPhong;
  }
}

// ---------------- Khung bước ----------------

function Buoc({
  so,
  tieuDe,
  moTa,
  xong,
  khoa,
  cuoi,
  id,
  phai,
  children,
}: {
  so: number;
  tieuDe: string;
  moTa?: React.ReactNode;
  xong?: boolean;
  khoa?: boolean;
  cuoi?: boolean;
  id?: string;
  phai?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tro = khoa ? ({ inert: "" } as Record<string, string>) : {};
  return (
    <section id={id} className="relative flex gap-4 scroll-mt-4">
      <div className="flex flex-col items-center">
        <span
          className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-bg text-[12px] font-bold transition-colors duration-300 ${
            xong ? "border-green text-green" : khoa ? "border-border text-text-muted" : "border-accent text-accent"
          }`}
        >
          {xong ? <Check className="h-3.5 w-3.5" /> : so}
        </span>
        {!cuoi && (
          <span
            className={`mt-1 w-px flex-1 transition-colors duration-300 ${xong ? "bg-[color:color-mix(in_srgb,var(--green)_40%,transparent)]" : "bg-border"}`}
          />
        )}
      </div>
      <div
        className={`min-w-0 flex-1 transition-opacity duration-300 ${cuoi ? "pb-2" : "pb-6"} ${khoa ? "pointer-events-none select-none opacity-35" : ""}`}
        {...tro}
      >
        <div className="mb-2 flex min-h-[28px] flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-bold leading-7 text-text">{tieuDe}</h3>
            {moTa && <p className="-mt-1 text-[11px] text-text-muted">{moTa}</p>}
          </div>
          {phai}
        </div>
        <div className="rounded border border-border bg-surface p-4">{children}</div>
      </div>
    </section>
  );
}

function ChonMau({ giaTri, doi, mau, tat }: { giaTri: LuatNhap["ap_dung"]; doi: (v: LuatNhap["ap_dung"]) => void; mau: DinhNghiaMauRutGon[]; tat?: boolean }) {
  const tatCa = giaTri === "tat_ca";
  const chip = (bat: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition disabled:cursor-not-allowed ${
      bat
        ? "border-accent text-accent"
        : "border-border text-text-secondary hover:border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] hover:text-text"
    }`;
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mẫu áp dụng">
      <button type="button" aria-pressed={tatCa} disabled={tat} className={chip(tatCa)} onClick={() => doi(tatCa ? [] : "tat_ca")}>
        {tatCa && <Check className="-ml-0.5 mr-1 inline h-3 w-3" />}Mọi mẫu
      </button>
      <span className="mx-0.5 my-1 w-px bg-border" />
      {mau.map((m) => {
        const bat = !tatCa && giaTri.includes(m.ma);
        return (
          <button
            key={m.ma}
            type="button"
            title={m.ten}
            aria-pressed={bat}
            disabled={tat}
            className={chip(bat)}
            onClick={() => {
              const cu = tatCa ? [] : giaTri;
              const moi = bat ? cu.filter((x) => x !== m.ma) : [...cu, m.ma];
              doi(moi.length === mau.length ? "tat_ca" : moi);
            }}
          >
            {tenMau(m.ma)}
          </button>
        );
      })}
    </div>
  );
}

function ChonCach({ giaTri, doi, tat }: { giaTri: CachKiem; doi: (c: CachKiem) => void; tat?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Cách chạy">
      {(["code", "ai", "ca_hai"] as const).map((c) => {
        const chon = giaTri === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={chon}
            disabled={tat}
            onClick={() => doi(c)}
            className={`flex flex-col items-start gap-1.5 rounded-sm border px-3 py-2.5 text-left transition disabled:cursor-not-allowed ${
              chon
                ? c === "code"
                  ? "border-[color:color-mix(in_srgb,var(--blue)_70%,transparent)]"
                  : "border-accent"
                : "border-border hover:border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)]"
            }`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <HuyHieuCach cach={c} />
              <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${chon ? "border-accent" : "border-border"}`}>
                {chon && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
              </span>
            </span>
            <span className="text-[11px] leading-snug text-text-muted">{NHAN_CACH[c].mo_ta}</span>
          </button>
        );
      })}
    </div>
  );
}

function ChonMuc({ giaTri, doi, tat }: { giaTri: MucLuat; doi: (m: MucLuat) => void; tat?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Mức">
      {(["chan", "canh_bao", "goi_y"] as const).map((m) => {
        const chon = giaTri === m;
        const n = NHAN_MUC[m];
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={chon}
            disabled={tat}
            onClick={() => doi(m)}
            className={`flex flex-col items-start gap-1 rounded-sm border px-3 py-2.5 text-left transition disabled:cursor-not-allowed ${
              chon ? n.vienDam : "border-border hover:border-white/20"
            }`}
          >
            <HuyHieuMuc muc={m} />
            <span className="text-[11px] leading-snug text-text-muted">{n.mo_ta}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------- Trình sửa ----------------

export function TrinhSuaLuat({
  luat,
  cauGoiY,
  batDau,
  loai,
  mau,
  nhomCo,
  suaDuoc,
  dong,
  daLuu,
}: {
  luat: LuatKiemTra | null;
  cauGoiY?: string;
  batDau?: "chay_thu";
  loai: LoaiLuatUi[];
  mau: DinhNghiaMauRutGon[];
  nhomCo: string[];
  suaDuoc: boolean;
  dong: () => void;
  daLuu: (l: LuatKiemTra) => void;
}) {
  const goc = useMemo(() => banDau(luat, cauGoiY), [luat, cauGoiY]);
  const [v, setV] = useState<LuatNhap>(goc);
  const [coCach, setCoCach] = useState(!!luat);
  const [deXuat, setDeXuat] = useState<DeXuatLuat | null>(null);
  const [dangDich, setDangDich] = useState(false);
  const [loiDich, setLoiDich] = useState<string | null>(null);
  const [hienLoi, setHienLoi] = useState(false);
  const [loiLuu, setLoiLuu] = useState<{ loi: string; ds: string[]; may?: boolean } | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [hoiDong, setHoiDong] = useState(false);
  const oCau = useRef<HTMLTextAreaElement>(null);

  const heThong = !!luat?.he_thong;
  const tat = !suaDuoc;
  const tatNoiDung = tat || heThong; // luật hệ thống: chỉ bật/tắt + mức
  const dat = <K extends keyof LuatNhap>(k: K, x: LuatNhap[K]) => setV((c) => ({ ...c, [k]: x }));
  const dm = useMemo(() => lapDanhMuc(mau, v.ap_dung), [mau, v.ap_dung]);
  const loaiChon = loai.find((l) => l.ma === v.loai);
  const coCode = v.cach_kiem !== "ai";
  const coAi = v.cach_kiem !== "code";
  const daDoi = JSON.stringify(v) !== JSON.stringify(goc);
  const mauDau = mau.find((m) => v.ap_dung === "tat_ca" || v.ap_dung.includes(m.ma)) ?? null;

  const docThanhCau = useMemo(() => {
    if (!coCode || !v.loai) return "";
    // Mẫu "gộp" từ các mẫu áp dụng → đọc được nhãn thật dù bảng/cột chỉ có ở vài mẫu
    const gop: DinhNghiaMauRutGon = {
      ma: mauDau?.ma ?? "gop",
      ten: mauDau?.ten ?? "",
      o_nhap: dm.o.map((o) => ({ tag: o.tag, nhan: o.nhan })),
      bang: dm.bang.map((b) => ({ tag: b.tag, nhan: b.nhan, cot: b.cot.map((c) => ({ tag: c.tag, nhan: c.nhan })) })),
      muc_bat_buoc: dm.muc.map((m) => m.tag),
    };
    return thu(() => docThanhLoi(v.loai!, v.tham_so ?? {}, gop), "") || docLoi(v.loai, v.tham_so, dm);
  }, [coCode, v.loai, v.tham_so, mauDau, dm]);

  // Kiểm tham số với định nghĩa mẫu chỉ khi luật dùng đúng MỘT mẫu (nhiều mẫu: máy chủ tự bỏ qua mẫu thiếu bảng/cột)
  const mauKiem = v.ap_dung !== "tat_ca" && v.ap_dung.length === 1 ? mauDau : null;
  const thieu = useMemo(() => {
    if (heThong) return v.ap_dung !== "tat_ca" && !v.ap_dung.length ? ["Mẫu áp dụng"] : [];
    const ds: string[] = [];
    if (!v.cau_luat.trim()) ds.push("Câu luật");
    if (v.ap_dung !== "tat_ca" && !v.ap_dung.length) ds.push("Mẫu áp dụng");
    if (!coCach) {
      ds.push("Cách chạy");
      return ds;
    }
    if (!v.ten.trim()) ds.push("Tên luật");
    if (coCode) {
      ds.push(...thieuThamSo(loaiChon, v.tham_so));
      if (loaiChon && !ds.length) ds.push(...thu(() => kiemThamSo(loaiChon.ma, v.tham_so ?? {}, mauKiem), [] as string[]));
    }
    if (coAi && !v.huong_dan_ai?.trim()) ds.push("Hướng dẫn cho AI");
    return ds;
  }, [heThong, v, coCach, coCode, coAi, loaiChon, mauKiem]);

  // Người dùng sửa tham số → bỏ lỗi máy chủ cũ
  const khoaThamSo = JSON.stringify([v.loai, v.tham_so, v.cach_kiem]);
  const khoaCu = useRef(khoaThamSo);
  useEffect(() => {
    if (khoaCu.current !== khoaThamSo) {
      khoaCu.current = khoaThamSo;
      setLoiLuu((x) => (x?.may ? null : x));
    }
  }, [khoaThamSo]);

  const thuDong = useCallback(() => {
    if (dangLuu) return;
    if (daDoi && suaDuoc && !hoiDong) setHoiDong(true);
    else if (hoiDong) setHoiDong(false);
    else dong();
  }, [daDoi, suaDuoc, hoiDong, dong, dangLuu]);

  // Ctrl+Enter = Lưu
  const luuRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        luuRef.current();
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  useEffect(() => {
    if (batDau === "chay_thu") setTimeout(() => document.getElementById("buoc-chay-thu")?.scrollIntoView({ behavior: "smooth", block: "start" }), 250);
    else if (!luat) setTimeout(() => oCau.current?.focus(), 120);
  }, [batDau, luat]);

  function apDeXuat(d: DeXuatLuat) {
    setDeXuat(d);
    setCoCach(true);
    setV((c) => ({
      ...c,
      cach_kiem: d.cach_kiem,
      loai: d.loai,
      tham_so: d.tham_so ?? {},
      huong_dan_ai: d.huong_dan_ai ?? (d.cach_kiem !== "code" ? c.cau_luat : null),
      ten: !c.ten.trim() || c.ten === deXuat?.ten_goi_y ? d.ten_goi_y : c.ten,
      nhom: c.nhom || d.nhom_goi_y,
      muc: d.muc_goi_y,
      khi_ai_loi: "cho_gui",
    }));
    setTimeout(() => document.getElementById("buoc-cach")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function deXuatAi() {
    const cau = v.cau_luat.trim();
    if (!cau) {
      setLoiDich("Viết câu luật trước đã — ví dụ bấm một câu gợi ý bên dưới.");
      oCau.current?.focus();
      return;
    }
    setDangDich(true);
    setLoiDich(null);
    try {
      apDeXuat(await dichCau(cau, v.ap_dung));
    } catch (e) {
      setLoiDich(e instanceof Error ? `AI chưa đề xuất được: ${e.message}. Bạn vẫn có thể tự chọn dạng luật.` : "AI chưa đề xuất được");
    } finally {
      setDangDich(false);
    }
  }

  function tuChon() {
    setCoCach(true);
    setDeXuat(null);
    setV((c) => ({
      ...c,
      ten: c.ten || (c.cau_luat.length > 48 ? c.cau_luat.slice(0, 46).trim() + "…" : c.cau_luat),
    }));
    setTimeout(() => document.getElementById("buoc-cach")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function doiCach(c: CachKiem) {
    setV((x) => ({
      ...x,
      cach_kiem: c,
      huong_dan_ai: c !== "code" && !x.huong_dan_ai?.trim() ? x.cau_luat : x.huong_dan_ai,
      tham_so: x.tham_so ?? {},
    }));
  }

  function banGui(): LuatNhap {
    if (heThong && luat)
      return {
        ...banDau(luat),
        bat: v.bat,
        muc: v.muc,
        ap_dung: v.ap_dung,
        khi_ai_loi: v.khi_ai_loi,
      };
    return {
      ...v,
      ma: v.ma || taoMa(v.ten),
      ten: v.ten.trim(),
      cau_luat: v.cau_luat.trim(),
      nhom: v.nhom?.trim() || null,
      loai: coCode ? v.loai : null,
      tham_so: coCode ? v.tham_so : null,
      huong_dan_ai: coAi ? v.huong_dan_ai?.trim() || null : null,
      khi_ai_loi: coAi && v.muc === "chan" ? v.khi_ai_loi : "cho_gui",
    };
  }

  async function luu() {
    if (tat || dangLuu) return;
    setHienLoi(true);
    if (thieu.length) {
      setLoiLuu({
        loi: "Còn thiếu thông tin — điền các ô viền đỏ:",
        ds: thieu,
      });
      return;
    }
    setDangLuu(true);
    setLoiLuu(null);
    try {
      daLuu(await luuLuat(banGui()));
    } catch (e) {
      setLoiLuu({
        loi: e instanceof Error ? `Chưa lưu được: ${e.message}` : "Chưa lưu được",
        ds: e instanceof LoiLuatApi ? e.danhSach : [],
        may: true,
      });
      setTimeout(() => document.getElementById("loi-luu")?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    } finally {
      setDangLuu(false);
    }
  }
  luuRef.current = () => void luu();

  const tieuDe = !luat ? "Thêm luật kiểm tra" : tat ? "Xem luật" : heThong ? "Luật hệ thống" : "Sửa luật";

  return (
    <NganKeo
      dong={thuDong}
      tieuDe={
        <span className="flex flex-wrap items-center gap-2">
          {!luat ? <Wand2 className="h-4 w-4 text-accent" /> : <Pencil className="h-4 w-4 text-accent" />}
          {tieuDe}
          {heThong && <HuyHieuHeThong />}
          {tat && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-normal text-text-muted">
              <Lock className="h-3 w-3" /> chỉ xem
            </span>
          )}
        </span>
      }
      phu={
        luat
          ? `${luat.ten} · phiên bản ${luat.phien_ban}${luat.sua_boi ? ` · ${luat.sua_boi} sửa ${ngayGio(luat.sua_luc)}` : ""}`
          : "Viết một câu, AI đề xuất cách chạy — bạn xem lại, chạy thử, rồi lưu"
      }
      chan={
        hoiDong ? (
          <div className="flex flex-wrap items-center justify-between gap-2" role="alertdialog" aria-label="Bỏ thay đổi?">
            <span className="text-[12px] font-semibold text-yellow">Có thay đổi chưa lưu. Đóng và bỏ các thay đổi?</span>
            <div className="flex gap-2">
              <Nut onClick={() => setHoiDong(false)} autoFocus>
                Ở lại sửa tiếp
              </Nut>
              <Nut kieu="nguy" onClick={dong}>
                Bỏ thay đổi
              </Nut>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 text-[11px] text-text-muted">
              {tat ? (
                "Bạn chỉ có quyền xem luật."
              ) : hienLoi && thieu.length ? (
                <span className="text-red">Còn thiếu: {thieu.join(", ")}</span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Phim>Ctrl</Phim>+<Phim>Enter</Phim> lưu · <Phim>Esc</Phim> đóng
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Nut kieu="nhat" onClick={thuDong}>
                {tat ? "Đóng" : "Hủy"}
              </Nut>
              {!tat && (
                <Nut
                  kieu="chinh"
                  onClick={() => void luu()}
                  disabled={dangLuu || (!!luat && !daDoi)}
                  title={!!luat && !daDoi ? "Chưa có gì thay đổi" : undefined}
                >
                  <Save className="h-3.5 w-3.5" /> {dangLuu ? "Đang lưu…" : luat ? "Lưu thay đổi" : "Lưu luật"}
                </Nut>
              )}
            </div>
          </div>
        )
      }
    >
      <div className="px-5 py-5">
        <KhaiHuongDan ma={heThong && luat ? "luat-he-thong" : "luat-trinh-sua"} uuTien={2} />
        {!heThong && coCach && coCode && <KhaiHuongDan ma="luat-tham-so" uuTien={0} />}
        <KhaiHuongDan ma="luat-chay-thu" uuTien={0} />
        {loiLuu && (
          <div
            id="loi-luu"
            className="mb-4 scroll-mt-4 rounded-sm border border-[color:color-mix(in_srgb,var(--red)_40%,transparent)] px-3 py-2 text-[12px] text-red"
            role="alert"
          >
            <div className="font-semibold">{loiLuu.loi}</div>
            {(loiLuu.may && coCode ? loiKhongGan(loaiChon, loiLuu.ds) : loiLuu.ds).length > 0 && (
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {(loiLuu.may && coCode ? loiKhongGan(loaiChon, loiLuu.ds) : loiLuu.ds).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
            {loiLuu.may && coCode && loiKhongGan(loaiChon, loiLuu.ds).length < loiLuu.ds.length && (
              <div className="mt-1 text-[11px] text-[color:color-mix(in_srgb,var(--red)_80%,transparent)]">Lỗi của từng tham số hiện ngay cạnh ô ở bước 3.</div>
            )}
          </div>
        )}

        {heThong && luat ? (
          <>
            <Buoc
              so={1}
              tieuDe="Luật gốc của hệ thống"
              moTa="Có sẵn trong code kiểm tra — chỉ tắt, đổi mức hoặc mẫu áp dụng; không xóa và không đổi cách kiểm."
              xong
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-text">{luat.ten}</span>
                  <HuyHieuCach cach={luat.cach_kiem} />
                </div>
                <p className="text-[12.5px] leading-relaxed text-text-secondary">“{luat.cau_luat}”</p>
                {luat.mo_ta && <p className="text-[11.5px] text-text-muted">{luat.mo_ta}</p>}
                <p className="text-[11px] text-text-muted">
                  Áp dụng: {tenApDung(luat.ap_dung)}
                  {luat.nhom ? ` · Nhóm ${luat.nhom}` : ""} · mã <span className="font-mono">{luat.ma}</span>
                </p>
              </div>
            </Buoc>
            <Buoc so={2} tieuDe="Bật / tắt, mức và mẫu áp dụng" xong={daDoi}>
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-[12.5px] font-semibold text-text">Đang {v.bat ? "bật" : "tắt"}</span>
                    <span className="text-[11px] text-text-muted">Tắt thì luật không được kiểm khi tải báo cáo lên.</span>
                  </span>
                  <CongTac bat={v.bat} doi={(b) => dat("bat", b)} tat={tat} nhan="Bật luật" />
                </label>
                <ChonMuc giaTri={v.muc} doi={(m) => dat("muc", m)} tat={tat} />
                <div>
                  <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Áp dụng cho mẫu</div>
                  <ChonMau giaTri={v.ap_dung} doi={(a) => dat("ap_dung", a)} mau={mau} tat={tat} />
                </div>
                {luat.cach_kiem !== "code" && v.muc === "chan" && (
                  <GhiChu loai="canh_bao">Luật này do AI kiểm. Để Chặn gửi thì người gửi phải chờ AI xong, và AI có thể kết luận sai.</GhiChu>
                )}
              </div>
            </Buoc>
          </>
        ) : (
          <>
            {/* ---------- 1 · Câu luật ---------- */}
            <Buoc
              so={1}
              tieuDe="Viết luật bằng một câu tiếng Việt"
              moTa="Viết như dặn người kiểm tra. AI sẽ đọc câu này và đề xuất cách chạy."
              xong={coCach && !!v.cau_luat.trim()}
            >
              <div className="space-y-3">
                <div>
                  <textarea
                    ref={oCau}
                    rows={2}
                    aria-label="Câu luật"
                    disabled={tatNoiDung}
                    value={v.cau_luat}
                    onChange={(e) => {
                      dat("cau_luat", e.target.value);
                      setLoiDich(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        void deXuatAi();
                      }
                    }}
                    placeholder="Ví dụ: Cột Kết thúc của bảng Công việc phải có ngày"
                    className={`${LOP_O_NHAP} resize-none !py-2 !text-[13.5px] leading-relaxed ${hienLoi && !v.cau_luat.trim() ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""}`}
                  />
                  {!tatNoiDung && (
                    <div className="mt-1 flex items-center gap-1.5 text-[10.5px] text-text-muted">
                      <Phim>Enter</Phim> để AI đề xuất · <Phim>Shift</Phim>+<Phim>Enter</Phim> xuống dòng
                    </div>
                  )}
                </div>
                {!tatNoiDung && !luat && (
                  <div>
                    <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Thử một câu</div>
                    <div className="flex flex-wrap gap-1.5">
                      {CAU_GOI_Y.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            dat("cau_luat", c);
                            setLoiDich(null);
                            oCau.current?.focus();
                          }}
                          className={`rounded-sm border px-2 py-1 text-left text-[11.5px] transition ${
                            v.cau_luat === c
                              ? "border-accent text-accent"
                              : "border-border-light text-text-secondary hover:border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] hover:text-text"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Áp dụng cho mẫu</div>
                  <ChonMau giaTri={v.ap_dung} doi={(a) => dat("ap_dung", a)} mau={mau} tat={tatNoiDung} />
                  {hienLoi && v.ap_dung !== "tat_ca" && !v.ap_dung.length && <p className="mt-1 text-[11px] text-red">Chọn ít nhất một mẫu.</p>}
                </div>
                {loiDich && <GhiChu loai="loi">{loiDich}</GhiChu>}
                {!tatNoiDung && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-border-light pt-3">
                    <Nut kieu="chinh" onClick={() => void deXuatAi()} disabled={dangDich}>
                      <Sparkles className={`h-3.5 w-3.5 ${dangDich ? "animate-pulse" : ""}`} />
                      {dangDich ? "AI đang đọc câu luật…" : coCach && deXuat ? "Đề xuất lại" : "AI đề xuất cách chạy"}
                    </Nut>
                    <span className="text-[11px] text-text-muted">hoặc</span>
                    <Nut onClick={tuChon} disabled={dangDich}>
                      <Braces className="h-3.5 w-3.5" /> Tự chọn dạng luật
                    </Nut>
                  </div>
                )}
              </div>
            </Buoc>

            {/* ---------- 2 · Cách chạy ---------- */}
            <Buoc
              id="buoc-cach"
              so={2}
              tieuDe="Cách chạy"
              moTa={
                coCach
                  ? "Code giữ cửa (được chặn gửi) · AI góp ý (mặc định cảnh báo). Bạn đổi được."
                  : "Bấm “AI đề xuất cách chạy” hoặc “Tự chọn dạng luật” ở bước 1."
              }
              khoa={!coCach}
              xong={coCach && !!v.ten.trim() && (!coCode || !!v.loai)}
            >
              <div className="space-y-4">
                {deXuat && (
                  <div className="rounded-sm border border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent">
                      <Sparkles className="h-3.5 w-3.5" /> AI đề xuất
                      <HuyHieuCach cach={deXuat.cach_kiem} nho />
                      <HuyHieuMuc muc={deXuat.muc_goi_y} nho />
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-text">{deXuat.giai_thich}</p>
                    {deXuat.canh_bao.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {deXuat.canh_bao.map((c, i) => (
                          <li key={i}>
                            <GhiChu loai="canh_bao">{c}</GhiChu>
                          </li>
                        ))}
                      </ul>
                    )}
                    {deXuat.ap_dung_goi_y !== "tat_ca" && JSON.stringify(deXuat.ap_dung_goi_y) !== JSON.stringify(v.ap_dung) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-text-secondary">
                        AI gợi ý chỉ áp dụng cho {tenApDung(deXuat.ap_dung_goi_y)}.
                        <Nut nho onClick={() => dat("ap_dung", deXuat.ap_dung_goi_y)}>
                          Dùng gợi ý
                        </Nut>
                      </div>
                    )}
                  </div>
                )}
                <ChonCach giaTri={v.cach_kiem} doi={doiCach} tat={tatNoiDung} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-text-secondary">
                      Tên luật <span className="text-red">*</span>
                    </span>
                    <input
                      className={`${LOP_O_NHAP} ${hienLoi && !v.ten.trim() ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""}`}
                      disabled={tatNoiDung}
                      value={v.ten}
                      maxLength={80}
                      placeholder="Tên ngắn hiện trong danh sách"
                      onChange={(e) => dat("ten", e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-text-secondary">Nhóm</span>
                    <input
                      className={LOP_O_NHAP}
                      disabled={tatNoiDung}
                      list="ds-nhom-luat"
                      value={v.nhom ?? ""}
                      placeholder="vd Bảng Công việc"
                      onChange={(e) => dat("nhom", e.target.value || null)}
                    />
                    <datalist id="ds-nhom-luat">
                      {nhomCo.map((n) => (
                        <option key={n} value={n} />
                      ))}
                    </datalist>
                  </label>
                </div>
                {coCode && (
                  <div>
                    <span className="mb-1 block text-[11px] font-semibold text-text-secondary">
                      Dạng luật code <span className="text-red">*</span>
                    </span>
                    <select
                      aria-label="Dạng luật code"
                      className={`${LOP_O_NHAP} cursor-pointer ${hienLoi && !v.loai ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""} ${v.loai ? "" : "!text-text-muted"}`}
                      disabled={tatNoiDung}
                      value={v.loai ?? ""}
                      onChange={(e) =>
                        setV((c) => ({
                          ...c,
                          loai: e.target.value || null,
                          tham_so: thamSoMacDinh(loai.find((l) => l.ma === e.target.value)),
                        }))
                      }
                    >
                      <option value="">— Chọn dạng luật ({loai.length} dạng) —</option>
                      {NHOM_LOAI.map((g) => {
                        const ds = loai.filter((l) => g.ma.includes(l.ma));
                        return ds.length ? (
                          <optgroup key={g.ten} label={g.ten}>
                            {ds.map((l) => (
                              <option key={l.ma} value={l.ma} className="text-text">
                                {l.ten}
                              </option>
                            ))}
                          </optgroup>
                        ) : null;
                      })}
                      {loai.some((l) => !NHOM_LOAI.some((g) => g.ma.includes(l.ma))) && (
                        <optgroup label="Khác">
                          {loai
                            .filter((l) => !NHOM_LOAI.some((g) => g.ma.includes(l.ma)))
                            .map((l) => (
                              <option key={l.ma} value={l.ma} className="text-text">
                                {l.ten}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                    {loaiChon &&
                      (() => {
                        const I = iconLoai(loaiChon.ma);
                        return (
                          <div className="mt-2 flex items-start gap-3 rounded-sm border border-border-light px-3 py-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue/50 text-blue">
                              <I className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="text-[12.5px] font-semibold text-text">{loaiChon.ten}</div>
                              <p className="text-[11.5px] leading-relaxed text-text-muted">{loaiChon.mo_ta}</p>
                              <p className="mt-0.5 text-[11.5px] text-text-secondary">Ví dụ: “{loaiChon.vi_du}”</p>
                            </div>
                          </div>
                        );
                      })()}
                  </div>
                )}
              </div>
            </Buoc>

            {/* ---------- 3 · Tham số ---------- */}
            <Buoc
              so={3}
              tieuDe={coCode && coAi ? "Tham số và hướng dẫn AI" : coCode ? "Tham số" : "Hướng dẫn cho AI"}
              moTa={
                coCode
                  ? "Chọn đúng ô, bảng, cột theo nhãn trong mẫu Word — không cần biết mã."
                  : "AI đọc báo cáo theo hướng dẫn này rồi kết luận đạt / không đạt."
              }
              khoa={!coCach || (coCode && !v.loai && !coAi)}
              xong={coCach && !thieu.some((t) => t !== "Tên luật" && t !== "Câu luật" && t !== "Mẫu áp dụng")}
            >
              <div className="space-y-4">
                {coCode &&
                  (loaiChon ? (
                    <>
                      {loaiChon.tham_so.length ? (
                        <ThamSoLuat
                          key={loaiChon.ma}
                          loai={loaiChon}
                          giaTri={v.tham_so}
                          doi={(t) => dat("tham_so", t)}
                          dm={dm}
                          tat={tatNoiDung}
                          hienLoi={hienLoi}
                          loiMay={loiLuu?.may ? loiLuu.ds : []}
                        />
                      ) : (
                        <p className="text-[12px] text-text-muted">Dạng luật này không cần tham số.</p>
                      )}
                      {docThanhCau && (
                        <div className="flex items-start gap-2 rounded-sm border border-border-light px-3 py-2">
                          <Braces className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue" />
                          <div className="min-w-0 text-[12px] text-text-secondary">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Code sẽ kiểm · </span>
                            {docThanhCau}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[12px] text-text-muted">Chọn dạng luật ở bước 2 để hiện tham số.</p>
                  ))}
                {coAi && (
                  <div>
                    <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary">
                      <Sparkles className="h-3 w-3 text-accent" /> Hướng dẫn cho AI <span className="text-red">*</span>
                    </span>
                    <textarea
                      rows={3}
                      aria-label="Hướng dẫn cho AI"
                      disabled={tatNoiDung}
                      className={`${LOP_O_NHAP} resize-y leading-relaxed ${hienLoi && !v.huong_dan_ai?.trim() ? "!border-[color:color-mix(in_srgb,var(--red)_70%,transparent)]" : ""}`}
                      value={v.huong_dan_ai ?? ""}
                      placeholder="Nói rõ AI cần đọc chỗ nào, thế nào là không đạt. vd: So ô Người lập và Người kiểm soát; cùng một người thì không đạt."
                      onChange={(e) => dat("huong_dan_ai", e.target.value)}
                    />
                    <p className="mt-1 text-[10.5px] text-text-muted">
                      Chỉ đúng mục / bảng giúp AI chính xác hơn. Mọi luật AI của một báo cáo được gửi trong một lượt để đỡ tốn.
                    </p>
                  </div>
                )}
              </div>
            </Buoc>

            {/* ---------- 4 · Mức ---------- */}
            <Buoc so={4} tieuDe="Mức khi không đạt" khoa={!coCach} xong={coCach}>
              <div className="space-y-3">
                <ChonMuc giaTri={v.muc} doi={(m) => dat("muc", m)} tat={tatNoiDung} />
                {coAi && v.muc === "chan" && (
                  <>
                    <GhiChu loai="canh_bao">
                      Luật có phần AI mà để <b>Chặn gửi</b>: người gửi phải chờ AI kiểm xong (vài giây), và AI có thể kết luận sai. Cân nhắc để Cảnh báo.
                    </GhiChu>
                    <div>
                      <div className="mb-1.5 text-[11px] font-semibold text-text-secondary">Khi AI lỗi hoặc quá thời gian chờ</div>
                      <div className="inline-flex overflow-hidden rounded-sm border border-border" role="radiogroup" aria-label="Khi AI lỗi">
                        {(
                          [
                            ["cho_gui", "Vẫn cho gửi"],
                            ["chan", "Chặn gửi"],
                          ] as const
                        ).map(([k, n]) => (
                          <button
                            key={k}
                            type="button"
                            role="radio"
                            aria-checked={v.khi_ai_loi === k}
                            disabled={tatNoiDung}
                            onClick={() => dat("khi_ai_loi", k)}
                            className={`px-4 py-1.5 text-[12px] font-semibold transition ${v.khi_ai_loi === k ? "bg-accent text-white" : "text-text-secondary hover:text-text"}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[10.5px] text-text-muted">
                        {v.khi_ai_loi === "cho_gui"
                          ? "Khuyên dùng: AI trục trặc không làm kẹt việc gửi báo cáo."
                          : "AI trục trặc thì không ai gửi được mẫu này cho tới khi AI chạy lại."}
                      </p>
                    </div>
                  </>
                )}
                <label className="flex items-center justify-between gap-3 border-t border-border-light pt-3">
                  <span>
                    <span className="block text-[12.5px] font-semibold text-text">{v.bat ? "Bật ngay khi lưu" : "Lưu ở trạng thái tắt"}</span>
                    <span className="text-[11px] text-text-muted">Tắt để lưu nháp, chạy thử kỹ rồi bật sau.</span>
                  </span>
                  <CongTac bat={v.bat} doi={(b) => dat("bat", b)} tat={tatNoiDung} nhan="Bật luật" />
                </label>
              </div>
            </Buoc>
          </>
        )}

        {/* ---------- 5 · Chạy thử ---------- (không có quyền sửa luật thì ẨN: máy chủ từ chối 403 — luật 17 riêng 3004) */}
        {!tat && (
        <Buoc
          id="buoc-chay-thu"
          so={heThong ? 3 : 5}
          tieuDe="Chạy thử trên báo cáo đã có"
          moTa="Xem luật này sẽ bắt lỗi những báo cáo nào trước khi bật thật."
          khoa={!heThong && !coCach}
          cuoi
        >
          <KhungChayThu luat={banGui()} dm={dm} lyDoKhong={thieu.length ? `Điền đủ ${thieu.join(", ")} trước khi chạy thử` : null} />
        </Buoc>
        )}

        {!heThong && coCach && (
          <div className="ml-11 mt-2 flex items-center gap-2 text-[11px] text-text-muted">
            <span>Sẽ lưu:</span>
            <HuyHieuCach cach={v.cach_kiem} nho />
            <HuyHieuMuc muc={v.muc} nho />
            <span>· {tenApDung(v.ap_dung)}</span>
            {v.nhom && <span>· {kieuCau(v.nhom)}</span>}
          </div>
        )}
      </div>
    </NganKeo>
  );
}
