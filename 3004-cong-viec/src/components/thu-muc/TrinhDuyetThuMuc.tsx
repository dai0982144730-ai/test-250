"use client";
// ============================================================
// Trang Thư mục phòng ban (kế hoạch v2, mục "Thư mục phòng ban").
// TRÁI: cây thư mục của MỌI đơn vị (ai cũng thấy cấu trúc). PHẢI: tài liệu của thư mục đang chọn.
// Tải lên nhiều file, bản mới, xem trước ngay trên web, tải về, xóa vào Thùng rác theo quyền, khôi phục.
// Ô tìm tài liệu mọi đơn vị: Ctrl K.
// ============================================================
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BO_LOC_TRONG, ChonTuan, locDong, locTheoTuan, ThanhLoc, type BoLoc, type Tuan } from "./BoLocTaiLieu";
import {
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FilePlus2,
  FolderOpen,
  FolderPlus,
  History,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { goiApi, guiJson, kichThuoc, kieuTep, ngayGio, NHAN_VI_TRI } from "./tien-ich";
import { HopThoai } from "./HopThoai";
import { XemTruocTaiLieu } from "./XemTruocTaiLieu";
import { DongThoiGian } from "./DongThoiGian";

interface DonViCay {
  id: string;
  ten: string;
  ten_ngan: string;
  cap: number;
  cha_id: string | null;
  loai: string;
  truong: string[];
  duoc_tai_len: boolean;
}
interface NutThuMuc {
  id: string;
  don_vi_id: string;
  cha_id: string | null;
  ten: string;
  loai: string;
  so_tai_lieu: number;
}
interface Cay {
  don_vi: DonViCay[];
  thu_muc: NutThuMuc[];
  toi: { id: string; ten: string; don_vi_id: string | null; chuc_vu: string | null; la_quan_tri: boolean };
}
interface DongTaiLieu {
  vi_tri_id: string;
  tai_lieu_id: string;
  ten: string;
  mau_ma: string | null;
  mau_ten: string | null;
  phien_ban: number;
  ten_tep: string;
  kich_thuoc: number;
  tai_len_boi: string;
  tai_len_boi_ten: string;
  tai_len_luc: string;
  don_vi_lap_ten: string | null;
  trang_thai: string;
  vai: string;
  nhan: string | null;
  duoc_xem: boolean;
  duoc_xoa: boolean;
  duoc_khoi_phuc: boolean;
  xoa_boi_ten?: string | null;
  xoa_luc?: string | null;
  het_han_luc?: string | null;
  tu_thu_muc?: string | null;
}
interface NoiDung {
  thu_muc: { id: string; don_vi_id: string; ten: string; loai: string };
  duong_dan: { id: string; ten: string; loai: string }[];
  don_vi: { id: string; ten: string; ten_ngan: string; loai: string } | null;
  truong_don_vi: string[];
  thu_muc_con: { id: string; ten: string; loai: string; so_tai_lieu: number }[];
  tai_lieu: DongTaiLieu[];
  la_thung_rac: boolean;
  duoc_tai_len: boolean;
  duoc_tao_thu_muc: boolean;
  thung_rac_giu_ngay: number;
  xem_noi_dung_phong_khac: "tat_ca" | "theo_quyen";
}
interface KetQuaTim {
  vi_tri_id: string;
  tai_lieu_id: string;
  ten: string;
  phien_ban: number;
  mau_ma: string | null;
  thu_muc_id: string;
  thu_muc_ten: string;
  don_vi_ten: string;
  tai_len_luc: string;
}

/** "người tải lên, trưởng đơn vị hoặc quản trị viên" — không lặp chữ khi người tải lên chính là Quản trị viên. */
function nguoiDuocXoa(nguoiTaiLen: string): string {
  return /^quản trị viên$/i.test(nguoiTaiLen.trim())
    ? "trưởng đơn vị hoặc quản trị viên"
    : `${nguoiTaiLen}, trưởng đơn vị hoặc quản trị viên`;
}

const NHOM: { ma: string; ten: string; loai: string[] }[] = [
  { ma: "cty", ten: "Công ty CP SCI", loai: ["ban_tgd", "chuc_danh", "phong"] },
  { ma: "dv", ten: "Đơn vị", loai: ["don_vi"] },
  { ma: "khac", ten: "Khác", loai: ["rieng", "ca_nhan", "ben_ngoai"] },
];
const MAU_NHOM: Record<string, string> = { cty: "#F2520F", dv: "#1f6feb", khac: "#777" };

const NUT = "inline-flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[12px] text-text-secondary hover:text-text disabled:cursor-not-allowed disabled:opacity-40";
const NUT_ICON = "inline-flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:bg-bg hover:text-text disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

function viTat(ten: string): string {
  const p = ten.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[p.length - 1]?.[0] ?? "")).toUpperCase();
}

/** phai: khung đặt ở cột phải (Nạp file & gửi báo cáo) */
const RONG_MAC_DINH = { cay: 288, phai: 560 };
/** Giới hạn độ rộng: cột giữa luôn còn ít nhất ~360px, không để trang tràn ngang. */
function gioiHan(cot: "cay" | "phai", w: number, rongKhac = cot === "cay" ? RONG_MAC_DINH.phai : RONG_MAC_DINH.cay): number {
  const man = typeof window === "undefined" ? 1600 : window.innerWidth;
  // menu trái ~240px + cột bên kia + cột giữa tối thiểu 360px
  const conLai = man - 240 - rongKhac - 360;
  const toiDa = Math.min(cot === "cay" ? 560 : 1100, conLai);
  const toiThieu = cot === "cay" ? 180 : 340;
  return Math.round(Math.max(toiThieu, Math.min(toiDa, w)));
}

/** Thanh chia dọc kéo được (bấm đúp: về độ rộng mặc định). */
function ThanhKeo({ onKeo, layGoc, onDatLai }: { onKeo: (dx: number, goc: number) => void; layGoc: () => number; onDatLai: () => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title="Kéo để chỉnh độ rộng cột · bấm đúp để về mặc định"
      onDoubleClick={onDatLai}
      onPointerDown={(e) => {
        e.preventDefault();
        const x0 = e.clientX;
        const goc = layGoc();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const di = (ev: PointerEvent) => onKeo(ev.clientX - x0, goc);
        const tha = () => {
          el.removeEventListener("pointermove", di);
          el.removeEventListener("pointerup", tha);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        };
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        el.addEventListener("pointermove", di);
        el.addEventListener("pointerup", tha);
      }}
      className="group relative w-1.5 shrink-0 cursor-col-resize bg-border/60 transition-colors hover:bg-accent/70 active:bg-accent"
    >
      <span className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

export function TrinhDuyetThuMuc({ phai, moRongPhai = false }: { phai?: React.ReactNode; moRongPhai?: boolean } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const tham = useSearchParams();
  const tmUrl = tham.get("tm");

  const [cay, setCay] = useState<Cay | null>(null);
  const [loiCay, setLoiCay] = useState<string | null>(null);
  const [moDonVi, setMoDonVi] = useState<Set<string>>(new Set());
  const [dongNhom, setDongNhom] = useState<Set<string>>(new Set());
  const [moThuMuc, setMoThuMuc] = useState<Set<string>>(new Set());
  const [chon, setChon] = useState<string | null>(tmUrl);
  const [noiDung, setNoiDung] = useState<NoiDung | null>(null);
  const [dangTaiNd, setDangTaiNd] = useState(false);
  const [loiNd, setLoiNd] = useState<string | null>(null);
  const [thongBao, setThongBao] = useState<{ chu: string; loai: "ok" | "loi"; hoanTac?: () => void } | null>(null);
  const [xem, setXem] = useState<{ tai_lieu_id: string; ten: string; tab: "xem" | "lich_su" } | null>(null);
  const [dangTaiLen, setDangTaiLen] = useState(false);
  const [keoTha, setKeoTha] = useState(false);
  const [tenThuMucMoi, setTenThuMucMoi] = useState<string | null>(null);
  const [danhDau, setDanhDau] = useState<string | null>(null);
  const tepRef = useRef<HTMLInputElement>(null);
  const banMoiRef = useRef<HTMLInputElement>(null);
  const banMoiCho = useRef<string | null>(null);

  // Tìm (Ctrl K)
  const [tuKhoa, setTuKhoa] = useState("");
  const [loc, setLoc] = useState<BoLoc>(BO_LOC_TRONG); // bộ lọc danh sách file của thư mục đang mở
  // Độ rộng cột cây thư mục và cột phải (Nạp file & gửi): kéo thanh chia để chỉnh, trình duyệt nhớ lại
  const [rongCay, setRongCay] = useState(RONG_MAC_DINH.cay);
  const [rongPhai, setRongPhai] = useState(RONG_MAC_DINH.phai);
  useEffect(() => {
    try {
      const c = Number(localStorage.getItem("thu-muc:rong-cay"));
      const f = Number(localStorage.getItem("thu-muc:rong-phai"));
      const cay = c ? gioiHan("cay", c) : RONG_MAC_DINH.cay;
      if (c) setRongCay(cay);
      if (f) setRongPhai(gioiHan("phai", f, cay));
    } catch {
      /* không có bộ nhớ trình duyệt: dùng mặc định */
    }
  }, []);
  const doiRong = (cot: "cay" | "phai", w: number) => {
    const v = gioiHan(cot, w, cot === "cay" ? rongPhai : rongCay);
    (cot === "cay" ? setRongCay : setRongPhai)(v);
    try {
      localStorage.setItem(`thu-muc:rong-${cot}`, String(v));
    } catch {
      /* bỏ qua */
    }
  };
  useEffect(() => setLoc(BO_LOC_TRONG), [chon]); // đổi thư mục thì bỏ lọc
  // Tuần báo cáo (thanh trên cùng): giữ khi đổi thư mục, trình duyệt nhớ lại
  const [tuan, setTuan] = useState<Tuan | null>(null);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem("thu-muc:tuan") ?? "null") as Tuan | null;
      if (v?.nam && v?.so) setTuan(v);
    } catch {
      /* bỏ qua */
    }
  }, []);
  const doiTuanBaoCao = (t: Tuan | null) => {
    setTuan(t);
    try {
      localStorage.setItem("thu-muc:tuan", JSON.stringify(t));
    } catch {
      /* bỏ qua */
    }
  };
  const [ketQua, setKetQua] = useState<KetQuaTim[] | null>(null);
  const [moTim, setMoTim] = useState(false);
  const timRef = useRef<HTMLInputElement>(null);

  const bao = useCallback((chu: string, loai: "ok" | "loi" = "ok", hoanTac?: () => void) => {
    setThongBao({ chu, loai, hoanTac });
  }, []);
  useEffect(() => {
    if (!thongBao) return;
    const t = setTimeout(() => setThongBao(null), thongBao.hoanTac ? 8000 : 5000);
    return () => clearTimeout(t);
  }, [thongBao]);

  const taiCay = useCallback(async () => {
    try {
      const j = await goiApi<Cay>("/api/thu-muc");
      setCay(j);
      setLoiCay(null);
      return j;
    } catch (e) {
      setLoiCay((e as Error).message);
      return null;
    }
  }, []);

  // Lần đầu: mở đơn vị của mình, chọn thư mục Đến của mình
  useEffect(() => {
    void taiCay().then((j) => {
      if (!j) return;
      const cuaToi = j.toi.don_vi_id ?? j.don_vi[0]?.id;
      const chonSan = tmUrl ? j.thu_muc.find((t) => t.id === tmUrl) : undefined;
      const dvMo = chonSan?.don_vi_id ?? cuaToi;
      if (dvMo) setMoDonVi(new Set([dvMo]));
      if (!chonSan) {
        const den = j.thu_muc.find((t) => t.don_vi_id === cuaToi && t.loai === "den");
        if (den) setChon(den.id);
      } else {
        // mở các thư mục cha để thấy thư mục đang chọn
        const mo = new Set<string>();
        let cha = chonSan.cha_id;
        while (cha) {
          mo.add(cha);
          cha = j.thu_muc.find((t) => t.id === cha)?.cha_id ?? null;
        }
        setMoThuMuc(mo);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taiNoiDung = useCallback(async (id: string) => {
    setDangTaiNd(true);
    try {
      const j = await goiApi<NoiDung>(`/api/thu-muc?id=${encodeURIComponent(id)}`);
      setNoiDung(j);
      setLoiNd(null);
    } catch (e) {
      setLoiNd((e as Error).message);
      setNoiDung(null);
    } finally {
      setDangTaiNd(false);
    }
  }, []);

  useEffect(() => {
    if (!chon) return;
    void taiNoiDung(chon);
    if (chon !== tham.get("tm")) router.replace(`${pathname}?tm=${encodeURIComponent(chon)}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chon]);

  const lamMoi = useCallback(async () => {
    await taiCay();
    if (chon) await taiNoiDung(chon);
  }, [taiCay, taiNoiDung, chon]);

  // Ctrl K / Cmd K → ô tìm
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "k") {
        // Khung chat AI cũng dùng Ctrl K: chỉ giành phím khi con trỏ không ở trong ô nhập khác
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el !== timRef.current))) return;
        e.preventDefault();
        e.stopPropagation();
        timRef.current?.focus();
        setMoTim(true);
      }
    };
    window.addEventListener("keydown", f, true);
    return () => window.removeEventListener("keydown", f, true);
  }, []);

  useEffect(() => {
    const k = tuKhoa.trim();
    if (!k) {
      setKetQua(null);
      return;
    }
    const t = setTimeout(() => {
      goiApi<{ ket_qua: KetQuaTim[] }>(`/api/tai-lieu?q=${encodeURIComponent(k)}`)
        .then((j) => setKetQua(j.ket_qua))
        .catch(() => setKetQua([]));
    }, 220);
    return () => clearTimeout(t);
  }, [tuKhoa]);

  const conCua = useMemo(() => {
    const m: Record<string, NutThuMuc[]> = {};
    for (const t of cay?.thu_muc ?? []) if (t.cha_id) (m[t.cha_id] ??= []).push(t);
    return m;
  }, [cay]);
  const gocCua = useMemo(() => {
    const m: Record<string, NutThuMuc> = {};
    for (const t of cay?.thu_muc ?? []) if (t.loai === "goc") m[t.don_vi_id] = t;
    return m;
  }, [cay]);

  const chonThuMuc = (id: string) => {
    setChon(id);
    setDanhDau(null);
  };

  const denKetQua = (r: KetQuaTim) => {
    setMoTim(false);
    setTuKhoa("");
    const tm = cay?.thu_muc.find((t) => t.id === r.thu_muc_id);
    if (tm) {
      setMoDonVi((s) => new Set(s).add(tm.don_vi_id));
      const mo = new Set(moThuMuc);
      let cha = tm.cha_id;
      while (cha) {
        mo.add(cha);
        cha = cay?.thu_muc.find((t) => t.id === cha)?.cha_id ?? null;
      }
      setMoThuMuc(mo);
    }
    setChon(r.thu_muc_id);
    setDanhDau(r.vi_tri_id);
  };

  // ---------- thao tác ----------
  const taiLen = async (files: FileList | File[], taiLieuId?: string) => {
    if (!noiDung || !files.length) return;
    setDangTaiLen(true);
    try {
      const fd = new FormData();
      fd.set("thu_muc_id", noiDung.thu_muc.id);
      if (taiLieuId) fd.set("tai_lieu_id", taiLieuId);
      for (const f of Array.from(files)) fd.append("tep", f);
      const j = await goiApi<{ da_tai: { ten: string; phien_ban: number }[] }>("/api/tai-lieu", { method: "POST", body: fd });
      bao(
        taiLieuId
          ? `Đã tải bản ${j.da_tai[0]?.phien_ban} của ${j.da_tai[0]?.ten}. Bản cũ vẫn giữ trong lịch sử.`
          : `Đã tải lên ${j.da_tai.length} file vào ${noiDung.thu_muc.ten}.`,
      );
      await lamMoi();
    } catch (e) {
      bao((e as Error).message, "loi");
    } finally {
      setDangTaiLen(false);
    }
  };

  const khoiPhuc = async (viTriId: string, im = false) => {
    try {
      await guiJson("/api/tai-lieu/khoi-phuc", { vi_tri_id: viTriId });
      if (!im) bao("Đã khôi phục tài liệu về thư mục cũ.");
      await lamMoi();
    } catch (e) {
      bao((e as Error).message, "loi");
    }
  };

  const xoa = async (d: DongTaiLieu) => {
    if (!d.duoc_xoa) {
      bao(`Bạn không có quyền xóa file này. Chỉ ${nguoiDuocXoa(d.tai_len_boi_ten)} xóa được.`, "loi");
      return;
    }
    try {
      await guiJson("/api/tai-lieu/xoa", { vi_tri_id: d.vi_tri_id });
      const gio = ngayGio(new Date().toISOString()).slice(11);
      bao(`Đã chuyển "${d.ten}" vào Thùng rác. Lịch sử vẫn ghi: ${cay?.toi.ten ?? "bạn"} xóa lúc ${gio}.`, "ok", () => void khoiPhuc(d.vi_tri_id));
      await lamMoi();
    } catch (e) {
      bao((e as Error).message, "loi");
    }
  };

  const taoThuMuc = async () => {
    if (!noiDung || !tenThuMucMoi?.trim()) return;
    try {
      const j = await guiJson<{ id: string }>("/api/thu-muc", { cha_id: noiDung.thu_muc.id, ten: tenThuMucMoi });
      setTenThuMucMoi(null);
      setMoThuMuc((s) => new Set(s).add(noiDung.thu_muc.id));
      await taiCay();
      setChon(j.id);
    } catch (e) {
      bao((e as Error).message, "loi");
    }
  };

  // ---------- vẽ cây ----------
  const veThuMuc = (t: NutThuMuc, muc: number): React.ReactNode => {
    const con = conCua[t.id] ?? [];
    const mo = moThuMuc.has(t.id);
    const dang = chon === t.id;
    return (
      <div key={t.id}>
        <div
          className={`group flex items-center gap-1 rounded-sm pr-2 text-[12.5px] ${
            dang ? "bg-surface text-text" : "text-text-secondary hover:bg-surface hover:text-text"
          }`}
          style={{ paddingLeft: 8 + muc * 14 }}
        >
          <button
            type="button"
            aria-label={mo ? "Thu gọn" : "Mở rộng"}
            onClick={() => setMoThuMuc((s) => (s.has(t.id) ? (s.delete(t.id), new Set(s)) : new Set(s).add(t.id)))}
            className={`flex h-5 w-4 items-center justify-center text-text-muted ${con.length ? "" : "invisible"}`}
          >
            {mo ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <button type="button" onClick={() => chonThuMuc(t.id)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left">
            {t.loai === "thung_rac" ? (
              <Trash2 size={13} className="shrink-0 text-text-muted" />
            ) : (
              <FolderOpen size={13} className="shrink-0" style={{ color: "#e8a33d" }} />
            )}
            <span className="truncate">{t.ten}</span>
            {t.so_tai_lieu > 0 && <span className="ml-auto pl-2 font-mono text-[10.5px] text-text-muted">{t.so_tai_lieu}</span>}
          </button>
        </div>
        {mo && con.map((c) => veThuMuc(c, muc + 1))}
      </div>
    );
  };

  const veCay = () => {
    if (!cay) return null;
    return NHOM.map((n) => {
      // Chức danh lãnh đạo (Chủ tịch HĐQT, TGĐ, Phó TGĐ…) hiện thụt vào ngay dưới Ban TGĐ
      const tatCa = cay.don_vi.filter((d) => n.loai.includes(d.loai));
      const conCd = (id: string) => tatCa.filter((d) => d.loai === "chuc_danh" && d.cha_id === id);
      const coCha = new Set(tatCa.map((d) => d.id));
      const ds = tatCa
        .filter((d) => !(d.loai === "chuc_danh" && d.cha_id && coCha.has(d.cha_id)))
        .flatMap((d) => [d, ...conCd(d.id)]);
      if (!ds.length) return null;
      const dong = dongNhom.has(n.ma);
      return (
        <div key={n.ma} className="mb-1">
          <button
            type="button"
            onClick={() => setDongNhom((s) => (s.has(n.ma) ? (s.delete(n.ma), new Set(s)) : new Set(s).add(n.ma)))}
            className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[12px] font-semibold text-text"
          >
            {dong ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            <i className="inline-block h-2 w-2 rounded-full" style={{ background: MAU_NHOM[n.ma] }} />
            {n.ten}
            <span className="ml-auto font-mono text-[10.5px] font-normal text-text-muted">{ds.length}</span>
          </button>
          {!dong &&
            ds.map((d) => {
              const mo = moDonVi.has(d.id);
              const goc = gocCua[d.id];
              const laCuaToi = cay.toi.don_vi_id === d.id;
              return (
                <div key={d.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setMoDonVi((s) => (s.has(d.id) ? (s.delete(d.id), new Set(s)) : new Set(s).add(d.id)));
                      if (!mo && goc) chonThuMuc(goc.id);
                    }}
                    className={`flex w-full items-center gap-1 rounded-sm py-1 ${d.loai === "chuc_danh" ? "pl-8" : "pl-4"} pr-2 text-left text-[12.5px] hover:bg-surface ${
                      goc && chon === goc.id ? "bg-surface text-text" : "text-text"
                    }`}
                    title={d.ten}
                  >
                    {mo ? <ChevronDown size={12} className="text-text-muted" /> : <ChevronRight size={12} className="text-text-muted" />}
                    <span className="truncate">{d.ten}</span>
                    {laCuaToi && <span className="ml-auto shrink-0 rounded-sm border border-accent px-1 text-[9.5px] text-accent">của tôi</span>}
                  </button>
                  {mo && goc && (conCua[goc.id] ?? []).map((c) => veThuMuc(c, 2))}
                </div>
              );
            })}
        </div>
      );
    });
  };

  // ---------- vẽ nội dung ----------
  const nhomCuaDonVi = (loai?: string) => NHOM.find((n) => loai && n.loai.includes(loai))?.ten ?? "SCI";

  const veBang = (nd: NoiDung) => {
    const dsLoc = locTheoTuan(locDong(nd.tai_lieu, loc, (d) => (nd.la_thung_rac ? d.xoa_luc : d.tai_len_luc)), tuan, (d) => (nd.la_thung_rac ? d.xoa_luc : d.tai_len_luc));
    if (nd.tai_lieu.length && !dsLoc.length) {
      return (
        <p className="py-10 text-center text-[12.5px] text-text-muted">
          Không có file khớp bộ lọc.{" "}
          <button type="button" className="text-accent hover:underline" onClick={() => setLoc(BO_LOC_TRONG)}>
            Xóa lọc
          </button>
        </p>
      );
    }
    if (!nd.tai_lieu.length) {
      return (
        <p className="py-10 text-center text-[12.5px] text-text-muted">
          {nd.la_thung_rac ? "Thùng rác trống." : "Thư mục trống."}
          {!nd.la_thung_rac && nd.duoc_tai_len && " Kéo thả file vào đây hoặc bấm Tải lên."}
        </p>
      );
    }
    if (nd.la_thung_rac) {
      return (
        <table className="tbl" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th>Tên file</th>
              <th>Từ thư mục</th>
              <th>Người xóa</th>
              <th>Lúc xóa</th>
              <th>Giữ đến</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {dsLoc.map((d) => (
              <tr key={d.vi_tri_id}>
                <td>
                  <TenTep d={d} onXem={() => d.duoc_xem && setXem({ tai_lieu_id: d.tai_lieu_id, ten: d.ten, tab: "xem" })} />
                </td>
                <td>{d.tu_thu_muc}</td>
                <td>{d.xoa_boi_ten}</td>
                <td className="font-mono text-[11.5px]">{ngayGio(d.xoa_luc)}</td>
                <td className="font-mono text-[11.5px]">{ngayGio(d.het_han_luc).slice(0, 10)}</td>
                <td className="whitespace-nowrap text-right">
                  <button type="button" className={NUT_ICON} title="Lịch sử" onClick={() => setXem({ tai_lieu_id: d.tai_lieu_id, ten: d.ten, tab: "lich_su" })}>
                    <History size={14} />
                  </button>
                  <button
                    type="button"
                    className={NUT}
                    disabled={!d.duoc_khoi_phuc}
                    title={d.duoc_khoi_phuc ? "Đưa về thư mục cũ" : "Bạn không có quyền khôi phục tài liệu này"}
                    onClick={() => void khoiPhuc(d.vi_tri_id)}
                  >
                    <RotateCcw size={12} /> Khôi phục
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return (
      <table className="tbl" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th>Tên file</th>
            <th>Mẫu</th>
            <th>Bản</th>
            <th>Người tải lên</th>
            <th>Lúc</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {dsLoc.map((d) => (
            <tr key={d.vi_tri_id} className={danhDau === d.vi_tri_id ? "outline outline-1 outline-accent" : ""}>
              <td>
                <TenTep d={d} onXem={() => (d.duoc_xem ? setXem({ tai_lieu_id: d.tai_lieu_id, ten: d.ten, tab: "xem" }) : bao("Bạn không có quyền mở xem nội dung tài liệu của đơn vị này.", "loi"))} />
              </td>
              <td className="font-mono text-[11.5px]" title={d.mau_ten ?? ""}>
                {d.mau_ma ? d.mau_ma.replace(/^form-/i, "Form ") : "—"}
              </td>
              <td className="font-mono text-[11.5px]">bản {d.phien_ban}</td>
              <td>
                <div className="text-text">{d.tai_len_boi_ten}</div>
                {d.don_vi_lap_ten && <div className="text-[11px] text-text-muted">{d.don_vi_lap_ten}</div>}
              </td>
              <td className="whitespace-nowrap font-mono text-[11.5px]">{ngayGio(d.tai_len_luc)}</td>
              <td className="whitespace-nowrap text-right">
                <button
                  type="button"
                  className={NUT_ICON}
                  title={d.duoc_xem ? "Xem trước" : "Không có quyền mở xem"}
                  disabled={!d.duoc_xem}
                  onClick={() => setXem({ tai_lieu_id: d.tai_lieu_id, ten: d.ten, tab: "xem" })}
                >
                  <Eye size={14} />
                </button>
                {d.duoc_xem ? (
                  <a className={NUT_ICON} title="Tải về" href={`/api/tai-lieu/${encodeURIComponent(d.tai_lieu_id)}/tep`}>
                    <Download size={14} />
                  </a>
                ) : (
                  <button type="button" className={NUT_ICON} disabled title="Không có quyền tải về">
                    <Download size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className={NUT_ICON}
                  title="Tải bản mới (bản cũ vẫn giữ)"
                  disabled={!nd.duoc_tai_len || dangTaiLen}
                  onClick={() => {
                    banMoiCho.current = d.tai_lieu_id;
                    banMoiRef.current?.click();
                  }}
                >
                  <FilePlus2 size={14} />
                </button>
                <button type="button" className={NUT_ICON} title="Lịch sử" onClick={() => setXem({ tai_lieu_id: d.tai_lieu_id, ten: d.ten, tab: "lich_su" })}>
                  <History size={14} />
                </button>
                <Link className={NUT_ICON} title="Mở trang tài liệu" href={`/tai-lieu/${encodeURIComponent(d.tai_lieu_id)}`}>
                  <ExternalLink size={14} />
                </Link>
                <button
                  type="button"
                  className={`${NUT_ICON} hover:text-red`}
                  disabled={!d.duoc_xoa}
                  aria-label="Xóa"
                  title={d.duoc_xoa ? "Xóa (vào Thùng rác)" : `Không có quyền xóa: chỉ ${nguoiDuocXoa(d.tai_len_boi_ten)}`}
                  onClick={() => void xoa(d)}
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden">
      {/* Thanh trên: tìm tài liệu mọi đơn vị + người đang đăng nhập */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-2.5">
        <h1 className="whitespace-nowrap text-[15px] font-semibold text-text">Thư mục &amp; gửi</h1>
        <div className="relative ml-2 w-full max-w-xl">
          <div className="flex items-center gap-2 rounded-sm border border-border bg-surface px-2.5 py-1.5">
            <Search size={14} className="text-text-muted" />
            <input
              ref={timRef}
              value={tuKhoa}
              onChange={(e) => {
                setTuKhoa(e.target.value);
                setMoTim(true);
              }}
              onFocus={() => setMoTim(true)}
              onBlur={() => setTimeout(() => setMoTim(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setMoTim(false);
                  (e.target as HTMLInputElement).blur();
                }
                if (e.key === "Enter" && ketQua?.[0]) denKetQua(ketQua[0]);
              }}
              placeholder="Tìm báo cáo của mọi đơn vị…"
              className="min-w-0 flex-1 bg-transparent text-[12.5px] text-text outline-none placeholder:text-text-muted"
            />
            <kbd className="rounded-sm border border-border px-1.5 font-mono text-[10px] text-text-muted">Ctrl K</kbd>
          </div>
          {moTim && tuKhoa.trim() && (
            <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-[60vh] overflow-auto rounded border border-border bg-bg shadow-card">
              {ketQua === null && <div className="px-3 py-2 text-[12px] text-text-muted">Đang tìm…</div>}
              {ketQua?.length === 0 && <div className="px-3 py-2 text-[12px] text-text-muted">Không thấy tài liệu nào.</div>}
              {ketQua?.map((r) => (
                <button
                  key={r.vi_tri_id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => denKetQua(r)}
                  className="flex w-full items-center gap-2 border-b border-border-light px-3 py-2 text-left last:border-0 hover:bg-surface"
                >
                  <BieuTuongTep ten={r.ten} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-text">{r.ten}</span>
                    <span className="block truncate text-[11px] text-text-muted">
                      {r.don_vi_ten} › {r.thu_muc_ten} · bản {r.phien_ban} · {ngayGio(r.tai_len_luc)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <ChonTuan tuan={tuan} doi={doiTuanBaoCao} />
        {cay && (
          <div className="ml-auto flex items-center gap-2 text-[12px] text-text-secondary">
            <span className="hidden sm:inline">
              {cay.toi.ten}
              {cay.toi.don_vi_id ? ` · ${cay.don_vi.find((d) => d.id === cay.toi.don_vi_id)?.ten_ngan ?? ""}` : " · chưa gán đơn vị"}
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white" style={{ background: "#F2520F" }}>
              {viTat(cay.toi.ten)}
            </span>
          </div>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1">
        {/* Cây thư mục */}
        <aside className="scroll-thin shrink-0 overflow-y-auto py-2 pr-1" style={{ width: rongCay }}>
          {loiCay && <p className="px-3 text-[12px] text-red">{loiCay}</p>}
          {!cay && !loiCay && (
            <div className="flex items-center gap-2 px-3 text-[12px] text-text-muted">
              <Loader2 size={13} className="animate-spin" /> Đang tải cây thư mục…
            </div>
          )}
          {veCay()}
        </aside>

        {/* Nội dung thư mục */}
        <ThanhKeo onKeo={(dx, goc) => doiRong("cay", goc + dx)} layGoc={() => rongCay} onDatLai={() => doiRong("cay", RONG_MAC_DINH.cay)} />
        <section
          className={`relative min-w-0 flex-1 overflow-auto px-5 py-4 ${moRongPhai ? "hidden" : ""} ${keoTha ? "outline-dashed outline-2 -outline-offset-8 outline-accent" : ""}`}
          onDragOver={(e) => {
            if (noiDung?.duoc_tai_len && e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setKeoTha(true);
            }
          }}
          onDragLeave={() => setKeoTha(false)}
          onDrop={(e) => {
            if (!noiDung?.duoc_tai_len) return;
            e.preventDefault();
            setKeoTha(false);
            if (e.dataTransfer.files.length) void taiLen(e.dataTransfer.files);
          }}
        >
          {loiNd && <p className="text-[12.5px] text-red">{loiNd}</p>}
          {!noiDung && dangTaiNd && (
            <div className="flex items-center gap-2 text-[12px] text-text-muted">
              <Loader2 size={13} className="animate-spin" /> Đang mở thư mục…
            </div>
          )}
          {noiDung && (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1 text-[12.5px] text-text-muted">
                  SCI › {nhomCuaDonVi(noiDung.don_vi?.loai)} ›{" "}
                  {noiDung.duong_dan.map((t, i) => (
                    <span key={t.id}>
                      {i > 0 && " › "}
                      <button
                        type="button"
                        onClick={() => chonThuMuc(t.id)}
                        className={i === noiDung.duong_dan.length - 1 ? "font-semibold text-text" : i === 0 ? "font-semibold text-text-secondary hover:text-text" : "hover:text-text"}
                      >
                        {t.ten}
                      </button>
                    </span>
                  ))}
                  {noiDung.truong_don_vi.length > 0 && <span> · trưởng đơn vị: {noiDung.truong_don_vi.join(", ")}</span>}
                  {dangTaiNd && <Loader2 size={12} className="ml-2 inline animate-spin" />}
                </div>
                {noiDung.duoc_tao_thu_muc && (
                  <button type="button" className={NUT} onClick={() => setTenThuMucMoi("")}>
                    <FolderPlus size={13} /> Thư mục mới
                  </button>
                )}
                {!noiDung.la_thung_rac && (
                  <button
                    type="button"
                    className={NUT}
                    disabled={!noiDung.duoc_tai_len || dangTaiLen}
                    title={noiDung.duoc_tai_len ? "Tải một hoặc nhiều file vào thư mục này" : "Bạn không có quyền tải lên thư mục của đơn vị này"}
                    onClick={() => tepRef.current?.click()}
                  >
                    {dangTaiLen ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} Tải lên
                  </button>
                )}
              </div>

              {tenThuMucMoi !== null && (
                <div className="mb-3 flex items-center gap-2">
                  <input
                    autoFocus
                    value={tenThuMucMoi}
                    onChange={(e) => setTenThuMucMoi(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void taoThuMuc();
                      if (e.key === "Escape") setTenThuMucMoi(null);
                    }}
                    placeholder="Tên thư mục, vd: Thủy điện Nậm Xe 2"
                    className="w-80 rounded-sm border border-border bg-surface px-2.5 py-1 text-[12.5px] text-text outline-none focus:border-accent"
                  />
                  <button type="button" className={NUT} onClick={() => void taoThuMuc()}>
                    Tạo
                  </button>
                  <button type="button" className={NUT} onClick={() => setTenThuMucMoi(null)}>
                    Hủy
                  </button>
                </div>
              )}

              {noiDung.thu_muc_con.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {noiDung.thu_muc_con.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setMoThuMuc((s) => new Set(s).add(noiDung.thu_muc.id));
                        chonThuMuc(c.id);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12px] text-text-secondary hover:text-text"
                    >
                      {c.loai === "thung_rac" ? <Trash2 size={13} /> : <FolderOpen size={13} style={{ color: "#e8a33d" }} />}
                      {c.ten}
                      {c.so_tai_lieu > 0 && <span className="font-mono text-[10.5px] text-text-muted">{c.so_tai_lieu}</span>}
                    </button>
                  ))}
                </div>
              )}

              {noiDung.tai_lieu.length > 0 && (
                <ThanhLoc
                  ds={noiDung.tai_lieu}
                  loc={loc}
                  doi={setLoc}
                  soHien={locTheoTuan(locDong(noiDung.tai_lieu, loc, (d) => (noiDung.la_thung_rac ? d.xoa_luc : d.tai_len_luc)), tuan, (d) => (noiDung.la_thung_rac ? d.xoa_luc : d.tai_len_luc)).length}
                  nhanNgay={noiDung.la_thung_rac ? "Ngày xóa" : "Ngày tải lên"}
                />
              )}
              {(noiDung.thu_muc.loai !== "goc" || noiDung.tai_lieu.length > 0) && (
                <div className="scroll-thin overflow-x-auto rounded border border-border bg-surface">{veBang(noiDung)}</div>
              )}

              <p className="mt-3 text-[11.5px] text-text-muted">
                {noiDung.la_thung_rac
                  ? `Thùng rác giữ ${noiDung.thung_rac_giu_ngay} ngày rồi ẩn đi. Nội dung không bao giờ mất: mọi phiên bản vẫn mở được trong Lịch sử.`
                  : `Mọi người thấy cây thư mục của cả ${cay?.don_vi.length ?? 9} đơn vị. Xóa: người tải lên, trưởng đơn vị của thư mục, quản trị viên. ${
                      noiDung.xem_noi_dung_phong_khac === "tat_ca" ? "Ai cũng mở xem được nội dung." : "Mở xem nội dung đơn vị khác theo quyền."
                    }`}{" "}
                <Link href="/lich-su" className="text-accent hover:underline">
                  Mở Lịch sử
                </Link>
              </p>
            </>
          )}
        </section>
        {/* Cột phải: Nạp file & gửi báo cáo (Soạn và gửi gộp vào Thư mục — bố cục 3 cột như "Hồ sơ dự án") */}
        {phai ? (
          <>
            {!moRongPhai && (
              <ThanhKeo onKeo={(dx, goc) => doiRong("phai", goc - dx)} layGoc={() => rongPhai} onDatLai={() => doiRong("phai", RONG_MAC_DINH.phai)} />
            )}
            {/* Khung Nạp file mở rộng: chiếm cả chỗ danh sách thư mục (không để cột giữa trống) */}
            <aside className={`scroll-thin overflow-y-auto px-4 py-4 ${moRongPhai ? "min-w-0 flex-1" : "shrink-0"}`} style={moRongPhai ? undefined : { width: rongPhai }}>
              {phai}
            </aside>
          </>
        ) : null}
      </div>

      <input
        ref={tepRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void taiLen(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={banMoiRef}
        type="file"
        hidden
        onChange={(e) => {
          const id = banMoiCho.current;
          if (e.target.files?.length && id) void taiLen(e.target.files, id);
          e.target.value = "";
        }}
      />

      {xem && (
        <HopThoai
          tieuDe={xem.ten}
          onDong={() => setXem(null)}
          phai={
            <div className="flex items-center gap-1">
              {(["xem", "lich_su"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setXem({ ...xem, tab: t })}
                  className={`rounded-sm border px-2.5 py-1 text-[12px] ${xem.tab === t ? "border-accent text-accent" : "border-border text-text-secondary hover:text-text"}`}
                >
                  {t === "xem" ? "Xem trước" : "Lịch sử"}
                </button>
              ))}
              <Link
                href={`/tai-lieu/${encodeURIComponent(xem.tai_lieu_id)}`}
                className="ml-1 inline-flex items-center gap-1 rounded-sm border border-border px-2.5 py-1 text-[12px] text-text-secondary hover:text-text"
              >
                <ExternalLink size={12} /> Trang tài liệu
              </Link>
            </div>
          }
        >
          {xem.tab === "xem" ? (
            <XemTruocTaiLieu taiLieuId={xem.tai_lieu_id} choChonPhienBan />
          ) : (
            <DongThoiGian doiTuongLoai="tai_lieu" doiTuongId={xem.tai_lieu_id} />
          )}
        </HopThoai>
      )}

      {thongBao && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-[60] flex max-w-xl -translate-x-1/2 items-center gap-3 rounded border bg-bg px-4 py-2.5 text-[12.5px] shadow-card ${
            thongBao.loai === "loi" ? "border-red text-red" : "border-green text-text"
          }`}
        >
          <span>{thongBao.chu}</span>
          {thongBao.hoanTac && (
            <button
              type="button"
              className="shrink-0 text-accent hover:underline"
              onClick={() => {
                thongBao.hoanTac?.();
                setThongBao(null);
              }}
            >
              Hoàn tác
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BieuTuongTep({ ten }: { ten: string }) {
  const k = kieuTep(ten);
  return (
    <span
      className="grid h-[26px] w-[22px] shrink-0 place-items-center rounded-[4px] font-mono text-[7px] font-bold text-white"
      style={{ background: k.mau }}
    >
      {k.nhan}
    </span>
  );
}

function TenTep({ d, onXem }: { d: DongTaiLieu; onXem: () => void }) {
  return (
    <span className="inline-flex max-w-[420px] items-center gap-2">
      <BieuTuongTep ten={d.ten_tep || d.ten} />
      <span className="min-w-0">
        <button type="button" onClick={onXem} className="block max-w-full truncate text-left text-text hover:text-accent" title={d.ten}>
          {d.ten}
        </button>
        <span className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-text-muted">
          {kichThuoc(d.kich_thuoc)}
          {d.nhan && (
            <span className="rounded-sm border border-yellow px-1 text-yellow">{NHAN_VI_TRI[d.nhan] ?? d.nhan}</span>
          )}
          {d.vai === "den" && <span>đến</span>}
          {d.vai === "di" && <span>đi</span>}
        </span>
      </span>
    </span>
  );
}
