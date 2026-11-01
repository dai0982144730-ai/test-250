"use client";
// Trang /luat-kiem-tra — BỘ LUẬT KIỂM TRA ĐỘNG. Lọc theo mẫu / nhóm / cách kiểm / mức, tìm; mỗi luật một dòng:
// tên, câu luật, huy hiệu Code / AI / Code + AI, mức, mẫu áp dụng, công tắc; menu sửa / chạy thử / lịch sử / xóa.
// Luật hệ thống: không có Xóa. Người không có quyền: chỉ xem.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Eye,
  FlaskConical,
  History,
  Info,
  Layers,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCw,
  Search,
  SearchX,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import type { CachKiem, LuatKiemTra, LuatNhap, MucLuat } from "@/lib/luat/types";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";
import { TieuDeTrang } from "@/components/layout/TieuDeTrang";
import { CongTac, HopThoai, LOP_O_NHAP, Nut, ngayGio, useThongBaoNhanh } from "@/components/layout/giao-dien";
import { luuLuat, taiDanhSachLuat, taiDinhNghiaMau, taiLoaiLuat, xoaLuat, type LoaiLuatUi } from "./api";
import { GhiChu, HuyHieuCach, HuyHieuHeThong, HuyHieuMuc, MenuNho, NHAN_MUC, Phim, ThongTinNho, XuongDong, kieuCau, tenApDung, tenMau } from "./chung";
import { CAU_GOI_Y, TrinhSuaLuat } from "./TrinhSuaLuat";
import { LichSuLuat } from "./LichSuLuat";
import { PhanTrang, usePhanTrang } from "@/components/layout/PhanTrang";

const THU_TU_NHOM = ["Luật hệ thống", "Ô chung", "Bảng Công việc", "Bảng Kiến nghị", "Số liệu", "Nội dung"];
const KHONG_NHOM = "Khác";
const bo = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
const apDungMau = (l: LuatKiemTra, ma: string) => l.ap_dung === "tat_ca" || l.ap_dung.includes(ma);

function thanhNhap(l: LuatKiemTra): LuatNhap {
  const { he_thong: _h, phien_ban: _p, tao_boi: _tb, tao_luc: _tl, sua_boi: _sb, sua_luc: _sl, da_xoa: _d, ...v } = l;
  return v;
}

type Loc = {
  mau: string;
  nhom: string;
  cach: "" | CachKiem;
  muc: "" | MucLuat;
  tu: string;
  anTat: boolean;
};
const LOC_TRONG: Loc = {
  mau: "",
  nhom: "",
  cach: "",
  muc: "",
  tu: "",
  anTat: false,
};

// ---------------- Ô số liệu đầu trang ----------------

function OSo({ so, nhan, phu, mau = "text-text", chon, bam }: { so: number; nhan: string; phu: string; mau?: string; chon?: boolean; bam?: () => void }) {
  return (
    <button
      type="button"
      onClick={bam}
      aria-pressed={chon}
      className={`group min-w-0 rounded border bg-surface px-4 py-3 text-left transition ${chon ? "border-accent" : "border-border hover:border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)]"}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{nhan}</div>
      <div className={`mt-0.5 text-[24px] font-bold leading-none tabular-nums ${mau}`}>{so}</div>
      <div className="mt-1 truncate text-[11px] text-text-muted group-hover:text-text-secondary">{phu}</div>
    </button>
  );
}

// ---------------- Một dòng luật ----------------

function DongLuat({
  l,
  suaDuoc,
  vuaLuu,
  dangDoi,
  doiBat,
  doiMuc,
  mo,
}: {
  l: LuatKiemTra;
  suaDuoc: boolean;
  vuaLuu: boolean;
  dangDoi: boolean;
  doiBat: (b: boolean) => void;
  doiMuc: (m: MucLuat) => void;
  mo: (viec: "sua" | "chay_thu" | "lich_su" | "xoa") => void;
}) {
  return (
    <li
      className={`group relative flex items-start gap-3.5 px-4 py-3 transition-colors duration-700 hover:bg-white/[0.02] ${
        vuaLuu ? "shadow-[inset_3px_0_0_var(--accent)]" : "shadow-[inset_0_0_0_transparent]"
      }`}
    >
      <div className="pt-0.5" title={suaDuoc ? (l.bat ? "Đang bật — bấm để tắt" : "Đang tắt — bấm để bật") : l.bat ? "Đang bật" : "Đang tắt"}>
        {/* Không có quyền sửa luật thì ẨN công tắc (ngoại lệ luật 17 của agent 3004): chỉ hiện chữ trạng thái */}
        {suaDuoc ? (
          <CongTac bat={l.bat} doi={doiBat} tat={dangDoi} nhan={`Bật luật ${l.ten}`} />
        ) : (
          <span className={`text-[11px] ${l.bat ? "font-semibold text-green" : "text-text-muted"}`}>{l.bat ? "Bật" : "Tắt"}</span>
        )}
      </div>
      <button type="button" onClick={() => mo("sua")} className={`min-w-0 flex-1 text-left transition-opacity ${l.bat ? "" : "opacity-55"}`}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[13px] font-semibold text-text group-hover:text-accent">{l.ten}</span>
          {l.he_thong && <HuyHieuHeThong />}
          {!l.bat && <span className="text-[10px] font-bold uppercase tracking-wide text-text-muted">đã tắt</span>}
        </div>
        {(l.cau_luat.trim() !== l.ten.trim() || l.mo_ta) && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-text-secondary">{l.cau_luat.trim() !== l.ten.trim() ? l.cau_luat : l.mo_ta}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <ThongTinNho icon={<Layers className="h-3 w-3" />} title="Mẫu áp dụng">
            {tenApDung(l.ap_dung)}
          </ThongTinNho>
          {l.phien_ban > 1 && <ThongTinNho icon={<History className="h-3 w-3" />}>phiên bản {l.phien_ban}</ThongTinNho>}
          {l.sua_boi && l.phien_ban > 1 && (
            <ThongTinNho icon={<Pencil className="h-3 w-3" />}>
              {l.sua_boi} · {ngayGio(l.sua_luc)}
            </ThongTinNho>
          )}
        </div>
      </button>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <span className="flex w-[104px] justify-end">
          <HuyHieuCach cach={l.cach_kiem} />
        </span>
        <span className="flex w-[106px] justify-start">
          {suaDuoc ? (
            <MenuNho
              nhan={`Đổi mức của ${l.ten}`}
              lopNut="inline-flex items-center gap-0.5 rounded-full transition hover:opacity-80"
              nut={
                <>
                  <HuyHieuMuc muc={l.muc} />
                  <ChevronDown className="h-3 w-3 text-text-muted" />
                </>
              }
              muc={(["chan", "canh_bao", "goi_y"] as const).map((m) => ({
                nhan: NHAN_MUC[m].nhan,
                icon: <span className={`h-2 w-2 rounded-full ${NHAN_MUC[m].cham}`} />,
                chon: l.muc === m,
                lam: () => m !== l.muc && doiMuc(m),
              }))}
            />
          ) : (
            <HuyHieuMuc muc={l.muc} />
          )}
        </span>
        <MenuNho
          nhan={`Thao tác với ${l.ten}`}
          nut={<MoreHorizontal className="h-4 w-4" />}
          muc={[
            {
              nhan: suaDuoc ? (l.he_thong ? "Bật/tắt, đổi mức" : "Sửa luật") : "Xem chi tiết",
              icon: suaDuoc ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />,
              lam: () => mo("sua"),
            },
            {
              nhan: "Chạy thử",
              icon: <FlaskConical className="h-3.5 w-3.5" />,
              lam: () => mo("chay_thu"),
            },
            {
              nhan: "Lịch sử phiên bản",
              icon: <History className="h-3.5 w-3.5" />,
              lam: () => mo("lich_su"),
            },
            {
              nhan: "Xóa luật",
              icon: <Trash2 className="h-3.5 w-3.5" />,
              lam: () => mo("xoa"),
              nguy: true,
              an: !suaDuoc || l.he_thong,
            },
          ]}
        />
      </div>
    </li>
  );
}

// ---------------- Trang ----------------

/** nhung: đặt trong Cài đặt (tab Riêng của agent) — không vẽ tiêu đề trang riêng */
export function TrangLuatKiemTra({ nhung = false }: { nhung?: boolean } = {}) {
  const [ds, setDs] = useState<LuatKiemTra[] | null>(null);
  const [suaDuoc, setSuaDuoc] = useState(false);
  const [loai, setLoai] = useState<LoaiLuatUi[]>([]);
  const [mau, setMau] = useState<DinhNghiaMauRutGon[]>([]);
  const [loi, setLoi] = useState<string | null>(null);
  const [loc, setLoc] = useState<Loc>(LOC_TRONG);
  const [sua, setSua] = useState<{
    luat: LuatKiemTra | null;
    cau?: string;
    batDau?: "chay_thu";
  } | null>(null);
  const [lichSu, setLichSu] = useState<LuatKiemTra | null>(null);
  const [xoa, setXoa] = useState<LuatKiemTra | null>(null);
  const [dangXoa, setDangXoa] = useState(false);
  const [dangDoi, setDangDoi] = useState<string | null>(null);
  const [vuaLuu, setVuaLuu] = useState<string | null>(null);
  const oTim = useRef<HTMLInputElement>(null);
  const { bao, khung } = useThongBaoNhanh();

  const tai = useCallback(async () => {
    setLoi(null);
    try {
      const [a, b, c] = await Promise.all([taiDanhSachLuat(), taiLoaiLuat(), taiDinhNghiaMau()]);
      setDs(a.luat.filter((l) => !l.da_xoa));
      setSuaDuoc(a.duoc_sua);
      setLoai(b);
      setMau(c);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tải được danh sách luật");
    }
  }, []);

  useEffect(() => {
    void tai();
    const m = new URLSearchParams(window.location.search).get("mau");
    if (m) setLoc((x) => ({ ...x, mau: m }));
  }, [tai]);

  // Phím "/" = tìm; "n" = thêm luật
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (sua || lichSu || xoa || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        oTim.current?.focus();
      } else if (e.key === "n" && suaDuoc) {
        e.preventDefault();
        setSua({ luat: null });
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [sua, lichSu, xoa, suaDuoc]);

  const tatCa = useMemo(() => ds ?? [], [ds]);
  const nhomCo = useMemo(() => {
    const s = new Set(tatCa.map((l) => l.nhom ?? KHONG_NHOM));
    return [...s].sort((a, b) => {
      const ia = THU_TU_NHOM.indexOf(a);
      const ib = THU_TU_NHOM.indexOf(b);
      if (a === KHONG_NHOM) return 1;
      if (b === KHONG_NHOM) return -1;
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, "vi");
    });
  }, [tatCa]);

  const loc1 = useMemo(() => {
    const tu = bo(loc.tu.trim());
    return tatCa.filter(
      (l) =>
        (!loc.mau || apDungMau(l, loc.mau)) &&
        (!loc.nhom || (l.nhom ?? KHONG_NHOM) === loc.nhom) &&
        (!loc.cach || (loc.cach === "ai" ? l.cach_kiem !== "code" : l.cach_kiem === loc.cach)) &&
        (!loc.muc || l.muc === loc.muc) &&
        (!loc.anTat || l.bat) &&
        (!tu || bo([l.ten, l.cau_luat, l.ma, l.nhom ?? "", l.huong_dan_ai ?? "", tenApDung(l.ap_dung)].join(" ")).includes(tu)),
    );
  }, [tatCa, loc]);

  const theoNhom = useMemo(
    () =>
      nhomCo
        .map((n) => ({
          ten: n,
          luat: loc1
            .filter((l) => (l.nhom ?? KHONG_NHOM) === n)
            .sort((a, b) => Number(b.he_thong) - Number(a.he_thong) || a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, "vi")),
        }))
        .filter((g) => g.luat.length),
    [nhomCo, loc1],
  );
  // 30 luật một trang (E40 — Mr. Đại 04/10): chia trên dãy luật đã xếp theo nhóm, mỗi trang dựng lại
  // tiêu đề nhóm của các luật nằm trong trang đó; số đếm ở tiêu đề vẫn là của CẢ nhóm.
  const dayLuat = useMemo(() => theoNhom.flatMap((g) => g.luat.map((l) => ({ g, l }))), [theoNhom]);
  const pt = usePhanTrang(dayLuat, JSON.stringify(loc));
  const nhomTrang = useMemo(() => {
    const ra: { g: (typeof theoNhom)[number]; luat: (typeof theoNhom)[number]["luat"] }[] = [];
    for (const { g, l } of pt.phan) {
      const cuoi = ra[ra.length - 1];
      if (cuoi && cuoi.g === g) cuoi.luat.push(l);
      else ra.push({ g, luat: [l] });
    }
    return ra;
  }, [pt.phan]);

  const theoMau = useMemo(() => tatCa.filter((l) => !loc.mau || apDungMau(l, loc.mau)), [tatCa, loc.mau]);
  const so = {
    tong: theoMau.length,
    heThong: theoMau.filter((l) => l.he_thong).length,
    bat: theoMau.filter((l) => l.bat).length,
    chan: theoMau.filter((l) => l.bat && l.muc === "chan").length,
    ai: theoMau.filter((l) => l.cach_kiem !== "code").length,
    aiChan: theoMau.filter((l) => l.cach_kiem !== "code" && l.muc === "chan" && l.bat).length,
  };
  const coLoc = loc.nhom || loc.cach || loc.muc || loc.tu || loc.anTat;
  const soRieng = tatCa.filter((l) => !l.he_thong).length;

  function capNhat(l: LuatKiemTra) {
    setDs((c) => {
      const cu = c ?? [];
      return cu.some((x) => x.id === l.id) ? cu.map((x) => (x.id === l.id ? l : x)) : [...cu, l];
    });
  }

  function nhayDong(id: string) {
    setVuaLuu(id);
    setTimeout(() => setVuaLuu((x) => (x === id ? null : x)), 1800);
  }

  async function doiNhanh(l: LuatKiemTra, doi: Partial<LuatNhap>, cau: string) {
    setDangDoi(l.id);
    capNhat({ ...l, ...doi } as LuatKiemTra); // hiện ngay, lỗi thì trả lại
    try {
      const r = await luuLuat({ ...thanhNhap(l), ...doi });
      capNhat(r);
      bao(`${cau} — phiên bản ${r.phien_ban}`);
    } catch (e) {
      capNhat(l);
      bao(e instanceof Error ? `Chưa lưu được: ${e.message}` : "Chưa lưu được", false);
    } finally {
      setDangDoi(null);
    }
  }

  async function xacNhanXoa() {
    if (!xoa) return;
    setDangXoa(true);
    try {
      await xoaLuat(xoa.id);
      setDs((c) => (c ?? []).filter((x) => x.id !== xoa.id));
      bao(`Đã xóa luật “${xoa.ten}”. Lịch sử phiên bản vẫn được giữ.`);
      setXoa(null);
    } catch (e) {
      bao(e instanceof Error ? `Không xóa được: ${e.message}` : "Không xóa được", false);
    } finally {
      setDangXoa(false);
    }
  }

  const nutChip = (bat: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition ${
      bat
        ? "border-accent text-accent"
        : "border-border text-text-secondary hover:border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] hover:text-text"
    }`;

  return (
    <>
      {nhung ? (
        <div className="flex justify-end px-5 pt-4">{ds &&
          (suaDuoc ? (
            <Nut kieu="chinh" onClick={() => setSua({ luat: null })} title="Thêm luật (phím N)">
              <Plus className="h-3.5 w-3.5" /> Thêm luật
            </Nut>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-muted"
              title="Bạn không có quyền sửa luật kiểm tra"
            >
              <Lock className="h-3 w-3" /> Chỉ xem
            </span>
          ))}</div>
      ) : (
        <TieuDeTrang
          tieuDe={
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" /> Luật kiểm tra
            </span>
          }
          moTa="Kiểm khi tải báo cáo lên, trước khi gửi · Code giữ cửa (được chặn gửi), AI góp ý (mặc định cảnh báo)"
          phai={
            ds &&
            (suaDuoc ? (
              <Nut kieu="chinh" onClick={() => setSua({ luat: null })} title="Thêm luật (phím N)">
                <Plus className="h-3.5 w-3.5" /> Thêm luật
              </Nut>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-muted"
                title="Bạn không có quyền sửa luật kiểm tra"
              >
                <Lock className="h-3 w-3" /> Chỉ xem
              </span>
            ))
          }
        />
      )}

      <div className="mx-auto max-w-[1440px] space-y-4 p-5 text-text">
        {loi && (
          <div
            className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[color:color-mix(in_srgb,var(--red)_40%,transparent)] px-3 py-2 text-[12px] text-red"
            role="alert"
          >
            <span>
              <b>Không tải được luật kiểm tra:</b> {loi}
            </span>
            <Nut nho onClick={() => void tai()}>
              <RotateCw className="h-3 w-3" /> Thử lại
            </Nut>
          </div>
        )}

        {/* Số liệu nhanh — bấm để lọc */}
        {ds ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <OSo
              so={so.tong}
              nhan={loc.mau ? `Luật của ${tenMau(loc.mau)}` : "Tổng số luật"}
              phu={`${so.heThong} luật hệ thống · ${so.tong - so.heThong} luật riêng`}
              chon={!coLoc}
              bam={() => setLoc((x) => ({ ...LOC_TRONG, mau: x.mau }))}
            />
            <OSo
              so={so.bat}
              nhan="Đang bật"
              mau="text-green"
              phu={`${so.tong - so.bat} luật đang tắt`}
              chon={loc.anTat && !loc.muc && !loc.cach}
              bam={() => setLoc((x) => ({ ...x, anTat: !x.anTat }))}
            />
            <OSo
              so={so.chan}
              nhan="Chặn gửi"
              mau="text-red"
              phu="Không đạt thì khóa nút Gửi"
              chon={loc.muc === "chan"}
              bam={() => setLoc((x) => ({ ...x, muc: x.muc === "chan" ? "" : "chan" }))}
            />
            <OSo
              so={so.ai}
              nhan="Có phần AI"
              mau="text-accent"
              phu={so.aiChan ? `${so.aiChan} luật AI đang chặn gửi` : "Đọc hiểu nội dung, mặc định cảnh báo"}
              chon={loc.cach === "ai"}
              bam={() => setLoc((x) => ({ ...x, cach: x.cach === "ai" ? "" : "ai" }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-[86px] animate-pulse rounded border border-border bg-surface px-4 py-3" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="h-2 w-20 rounded bg-white/[0.07]" />
                <div className="mt-2.5 h-5 w-10 rounded bg-white/[0.09]" />
                <div className="mt-2.5 h-2 w-32 rounded bg-white/[0.05]" />
              </div>
            ))}
          </div>
        )}

        {/* Bộ lọc */}
        <div className="rounded border border-border bg-surface">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2.5" role="group" aria-label="Lọc theo mẫu">
            <span className="mr-1 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Mẫu</span>
            <button type="button" className={nutChip(!loc.mau)} aria-pressed={!loc.mau} onClick={() => setLoc((x) => ({ ...x, mau: "" }))}>
              Mọi mẫu
            </button>
            {mau.map((m) => (
              <button
                key={m.ma}
                type="button"
                title={m.ten}
                aria-pressed={loc.mau === m.ma}
                className={nutChip(loc.mau === m.ma)}
                onClick={() => setLoc((x) => ({ ...x, mau: x.mau === m.ma ? "" : m.ma }))}
              >
                {tenMau(m.ma)}
                <span
                  className={`tabular-nums text-[10px] font-normal ${loc.mau === m.ma ? "text-[color:color-mix(in_srgb,var(--accent)_80%,transparent)]" : "text-text-muted"}`}
                >
                  {tatCa.filter((l) => apDungMau(l, m.ma)).length}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-sm border border-border bg-bg px-2.5 py-1.5 text-text-muted transition focus-within:border-accent">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <input
                ref={oTim}
                value={loc.tu}
                onChange={(e) => setLoc((x) => ({ ...x, tu: e.target.value }))}
                onKeyDown={(e) => e.key === "Escape" && loc.tu && (e.preventDefault(), setLoc((x) => ({ ...x, tu: "" })))}
                placeholder="Tìm theo tên, câu luật, nhóm…"
                aria-label="Tìm luật"
                className="w-full bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-muted"
              />
              {loc.tu ? (
                <button type="button" onClick={() => setLoc((x) => ({ ...x, tu: "" }))} aria-label="Xóa ô tìm" className="text-text-muted hover:text-text">
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Phim>/</Phim>
              )}
            </label>
            <select
              aria-label="Nhóm luật"
              className={`${LOP_O_NHAP} !w-auto cursor-pointer`}
              value={loc.nhom}
              onChange={(e) => setLoc((x) => ({ ...x, nhom: e.target.value }))}
            >
              <option value="">Mọi nhóm</option>
              {nhomCo.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              aria-label="Cách kiểm"
              className={`${LOP_O_NHAP} !w-auto cursor-pointer`}
              value={loc.cach}
              onChange={(e) => setLoc((x) => ({ ...x, cach: e.target.value as Loc["cach"] }))}
            >
              <option value="">Code và AI</option>
              <option value="code">Chỉ Code</option>
              <option value="ai">Có phần AI</option>
              <option value="ca_hai">Code + AI</option>
            </select>
            <select
              aria-label="Mức"
              className={`${LOP_O_NHAP} !w-auto cursor-pointer`}
              value={loc.muc}
              onChange={(e) => setLoc((x) => ({ ...x, muc: e.target.value as Loc["muc"] }))}
            >
              <option value="">Mọi mức</option>
              <option value="chan">Chặn gửi</option>
              <option value="canh_bao">Cảnh báo</option>
              <option value="goi_y">Gợi ý</option>
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 px-1 text-[12px] text-text-secondary">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={loc.anTat}
                onChange={(e) => setLoc((x) => ({ ...x, anTat: e.target.checked }))}
              />
              Chỉ luật đang bật
            </label>
            {coLoc && (
              <Nut nho kieu="nhat" onClick={() => setLoc((x) => ({ ...LOC_TRONG, mau: x.mau }))}>
                <X className="h-3 w-3" /> Bỏ lọc
              </Nut>
            )}
            <span className="ml-auto text-[11px] tabular-nums text-text-muted">{ds ? `${loc1.length} / ${tatCa.length} luật` : ""}</span>
          </div>
        </div>

        {/* Danh sách */}
        {!ds && !loi && (
          <div className="space-y-4">
            {[4, 3].map((n, i) => (
              <div key={i} className="rounded border border-border bg-surface">
                <div className="border-b border-border px-4 py-3">
                  <div className="h-3 w-32 animate-pulse rounded bg-white/[0.08]" />
                </div>
                <XuongDong so={n} />
              </div>
            ))}
          </div>
        )}

        {ds && theoNhom.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-border bg-surface px-6 py-12 text-center">
            <SearchX className="h-7 w-7 text-text-muted" />
            <div className="text-[13px] font-semibold text-text">Không có luật nào khớp bộ lọc</div>
            <p className="max-w-[420px] text-[12px] text-text-muted">
              {loc.mau ? `Chưa có luật nào áp dụng cho ${tenMau(loc.mau)} với điều kiện đang lọc.` : "Thử bỏ bớt điều kiện lọc hoặc tìm từ khác."}
            </p>
            <div className="mt-1 flex gap-2">
              <Nut onClick={() => setLoc(LOC_TRONG)}>
                <X className="h-3.5 w-3.5" /> Bỏ mọi bộ lọc
              </Nut>
              {suaDuoc && (
                <Nut kieu="chinh" onClick={() => setSua({ luat: null, cau: loc.tu || undefined })}>
                  <Plus className="h-3.5 w-3.5" /> Thêm luật
                </Nut>
              )}
            </div>
          </div>
        )}

        {nhomTrang.map(({ g, luat: luatTrang }) => {
          const chan = g.luat.filter((l) => l.bat && l.muc === "chan").length;
          const ai = g.luat.filter((l) => l.cach_kiem !== "code").length;
          return (
            <section key={g.ten} className="rounded border border-border bg-surface" aria-label={`Nhóm ${g.ten}`}>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <h2 className="text-[13px] font-bold text-text">
                  {kieuCau(g.ten)} <span className="font-normal text-text-muted">· {g.luat.length} luật</span>
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-text-muted">
                  {chan > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Lock className="h-3 w-3 text-red" /> {chan} chặn gửi
                    </span>
                  )}
                  {ai > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-accent" /> {ai} có AI
                    </span>
                  )}
                </div>
              </header>
              <ul className="divide-y divide-border-light">
                {luatTrang.map((l) => (
                  <DongLuat
                    key={l.id}
                    l={l}
                    suaDuoc={suaDuoc}
                    vuaLuu={vuaLuu === l.id}
                    dangDoi={dangDoi === l.id}
                    doiBat={(b) => void doiNhanh(l, { bat: b }, `Đã ${b ? "bật" : "tắt"} “${l.ten}”`)}
                    doiMuc={(m) => void doiNhanh(l, { muc: m }, `“${l.ten}” → ${NHAN_MUC[m].nhan}`)}
                    mo={(viec) => {
                      if (viec === "sua") setSua({ luat: l });
                      else if (viec === "chay_thu") setSua({ luat: l, batDau: "chay_thu" });
                      else if (viec === "lich_su") setLichSu(l);
                      else setXoa(l);
                    }}
                  />
                ))}
              </ul>
            </section>
          );
        })}
        <PhanTrang trang={pt.trang} soTrang={pt.soTrang} tong={pt.tong} onDoi={pt.doiTrang} donVi="luật" />

        {/* Chưa có luật riêng: hướng dẫn viết luật đầu tiên */}
        {ds && soRieng === 0 && !coLoc && (
          <div className="rounded border border-dashed border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] bg-surface px-5 py-5">
            <div className="flex items-start gap-3">
              <Wand2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-text">Chưa có luật riêng nào</div>
                <p className="mt-0.5 text-[12px] text-text-secondary">
                  {suaDuoc
                    ? "Viết luật đầu tiên bằng một câu tiếng Việt — AI đề xuất cách chạy, bạn chạy thử rồi lưu. Bấm một câu để bắt đầu:"
                    : "Người phụ trách cài đặt có thể thêm luật riêng cho từng mẫu báo cáo."}
                </p>
                {suaDuoc && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {CAU_GOI_Y.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSua({ luat: null, cau: c })}
                        className="rounded-sm border border-border-light px-2 py-1 text-[11.5px] text-text-secondary transition hover:border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] hover:text-text"
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {ds && (
          <p className="flex items-center gap-1.5 px-1 text-[11px] text-text-muted">
            <Info className="h-3 w-3" /> Luật hệ thống chỉ tắt, đổi mức hoặc mẫu áp dụng được, không xóa. Mọi thay đổi đều có phiên bản và quay lại được.
          </p>
        )}
      </div>

      {sua && (
        <TrinhSuaLuat
          key={sua.luat?.id ?? `moi-${sua.cau ?? ""}`}
          luat={sua.luat}
          cauGoiY={sua.cau}
          batDau={sua.batDau}
          loai={loai}
          mau={mau}
          nhomCo={nhomCo.filter((n) => n !== KHONG_NHOM)}
          suaDuoc={suaDuoc}
          dong={() => setSua(null)}
          daLuu={(l) => {
            capNhat(l);
            setSua(null);
            nhayDong(l.id);
            bao(`Đã lưu luật “${l.ten}” — phiên bản ${l.phien_ban}`);
          }}
        />
      )}
      {lichSu && (
        <LichSuLuat
          luat={lichSu}
          suaDuoc={suaDuoc}
          dong={() => setLichSu(null)}
          sauKhiQuayLai={(pb) => {
            setLichSu(null);
            bao(`Đã quay lại phiên bản ${pb} của “${lichSu.ten}”`);
            void tai().then(() => nhayDong(lichSu.id));
          }}
        />
      )}
      {xoa && (
        <HopThoai
          tieuDe={
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red" /> Xóa luật
            </span>
          }
          dong={() => !dangXoa && setXoa(null)}
          chan={
            <>
              <Nut kieu="nhat" onClick={() => setXoa(null)} disabled={dangXoa}>
                Hủy
              </Nut>
              <Nut kieu="nguy" onClick={() => void xacNhanXoa()} disabled={dangXoa} autoFocus>
                <Trash2 className="h-3.5 w-3.5" /> {dangXoa ? "Đang xóa…" : "Xóa luật"}
              </Nut>
            </>
          }
        >
          <p className="text-[12.5px] text-text">
            Xóa luật <b>“{xoa.ten}”</b>?
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-text-secondary">{xoa.cau_luat}</p>
          <div className="mt-2 flex items-center gap-2">
            <HuyHieuCach cach={xoa.cach_kiem} nho />
            <HuyHieuMuc muc={xoa.muc} nho />
            <span className="text-[11px] text-text-muted">{tenApDung(xoa.ap_dung)}</span>
          </div>
          <p className="mt-3 text-[11px] text-text-muted">
            Luật ngừng kiểm ngay từ báo cáo tải lên tiếp theo. Lịch sử phiên bản vẫn được giữ. Chỉ muốn tạm dừng? Hãy tắt công tắc thay vì xóa.
          </p>
        </HopThoai>
      )}
      {khung}
    </>
  );
}
