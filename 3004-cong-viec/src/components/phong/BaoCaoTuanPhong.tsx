"use client";
// ============================================================
// BaoCaoTuanPhong — menu BÁO CÁO TUẦN (Mr. Đại duyệt demo 30/09/2026).
// Thước: 0 Tài liệu thiết kế/demo-bao-cao-tuan-3004.html. Danh mục khối (luật 26):
//   khu TRÁI (chỗ sơ đồ): đầu báo cáo (tuần · lúc AI viết · model · cấp 1 đã/chưa nộp · Viết lại) + 4 nút tab
//     t1 🤖 AI đánh giá: Nhận định chung (chữ gạch chân bấm được) + Chỉ số đơn vị (dòng số + dòng 🤖 nhận xét) + Cách tính điểm
//     t2 Cần BLĐ ra quyết định (02/10): dòng kiến nghị + Form 0 do code đọc (chưa có việc → Giao việc · đang chạy → Nhắc + bình luận @;
//        bỏ việc đã xong, việc dễ / rất dễ) + Điểm nóng (bỏ việc trùng / việc dễ)
//        20/10: 4 tab con Trước khởi công · Thực thi, kiểm soát · ENC đề xuất · Nhóm khác (code xếp, 🤖 AI xếp dòng chưa chắc, người chuyển nhóm thắng AI)
//     t3 Số liệu tuần qua: 4 ô số một dòng · Đơn vị (thanh 4 màu) · Dự án · Thời điểm gửi báo cáo (vòng x/y + trục thời gian, vạch hạn)
//     Độ khó (CHỈ Ban lãnh đạo, bỏ tab 30/09): ghi chú dưới bảng chỉ số → cột phải hiện thanh chồng theo mức + phân bố, sửa điểm tại đó
//   cột PHẢI: danh sách / chi tiết việc (DongViec dùng chung Sơ đồ) · form Giao việc · báo cáo đơn vị đã nộp
// Mọi con số do CODE tính (lib/bao-cao-tuan/tinh.ts); lời 🤖 do AI viết, đã qua lưới kiểm của code.
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { goiApi } from "@/components/layout/giao-dien";
import { taiLaiToi, useToi } from "@/components/layout/dung-toi";
import { moXemTep } from "@/components/dinh-kem/DinhKem";
import type { BanBaoCaoTuan } from "@/lib/bao-cao-tuan/viet";
import type { DongCanQuyet } from "@/lib/bao-cao-tuan/can-quyet";
import { NHOM_CAN_QUYET, type NhomCanQuyet } from "@/lib/bao-cao-tuan/can-quyet-nhom";
import { tenVung, type DongDonVi, type KetQuaTinh } from "@/lib/bao-cao-tuan/tinh";
import { khoangNgay, ngayVN, nhanTuanGon } from "@/lib/phong/tuan";
import type { OSoDo } from "@/lib/phong/so-do";
import { useKeoGiua } from "./KeoGiua";
import { chuyenViec, noiGiaoDichDanh, type ViecApi, type ViecO } from "./viec";
import { DongViec, GiaoViec, HopBaoCaoGoc, TomTatViec, coTheGiaoToi } from "./SoDoPhong";
import { BinhLuanViec, type KemNutThem } from "./BinhLuanViec";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface DuLieuSoDo {
  o: OSoDo[];
  lanh_dao: { id: string; ten: string; ten_ngan: string }[];
  nguoi: { id: string; ten: string; don_vi_id: string | null; don_vi_ids?: string[]; chuc_vu?: string | null }[];
  hom_nay: string;
  giao_duoc?: "tat_ca" | string[];
  /** Phạm vi giao CHƯA trừ đơn vị ngoài SCI — Báo cáo tuần: báo cáo của chính PMC/E&C giao trong nội bộ họ (chốt 10/10) */
  giao_duoc_bao_cao?: "tat_ca" | string[];
  du_an: { id: string; ten: string; nhom: string }[];
}
interface PhanHoi {
  ban: BanBaoCaoTuan | null;
  cac_ban: { id: string; tuan_so: number; trang_thai: string }[];
  la_bld: boolean;
  co_the_viet_lai: boolean;
  thao_tac: { cong_viec_id: string; loai: "nhac" | "giao"; ket_qua: string | null }[];
  do_kho: Record<string, { diem: number; ly_do: string | null; nguon: string }>;
}
type Phai =
  | { kieu: "ds"; tieu: string; nhom: { ten: string; ma: string[] }[]; kho?: boolean }
  | { kieu: "giao"; ma: string }
  /** Giao việc từ một dòng kiến nghị chưa có việc (tab Cần ra quyết định, chốt 02/10) */
  | { kieu: "giao_kn"; khoa: string; dv: string; ten: string }
  | { kieu: "bc"; dv: string }
  | { kieu: "dokho" };

const MUC: [number, string, string][] = [
  [13, "Rất khó", "#7C2D12"],
  [8, "Khó", "#C2410C"],
  [4, "Vừa", "#EA580C"],
  [2, "Dễ", "#FDBA74"],
  [1, "Rất dễ", "#E7E5E4"],
];
const TEN_CAP: Record<number, [string, string]> = { 1: ["Cấp 1", "Ban TGĐ"], 2: ["Cấp 2", "các phòng"], 3: ["Cấp 3", "công ty con · BQLDA · nhà máy"], 4: ["Cấp 4", "ban điều hành"] };
const gioPhut = (s: string | null) => (s ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }) : "");
const ngayGio = (h: number) => (h >= 24 ? `${Math.floor(h / 24)} ngày${h % 24 ? ` ${h % 24} giờ` : ""}` : `${h} giờ`);
const phay = (x: number | null) => (x === null ? "—" : String(x).replace(".", ","));

/** Màu % trễ (Mr. Đại 01/10): 0% xanh → ngưỡng trễ vàng → gấp đôi ngưỡng trở lên đỏ, chuyển dần giữa các mốc */
export function mauTre(pt: number, nguong: number): string {
  const XANH = [34, 197, 94], VANG = [234, 179, 8], DO = [220, 38, 38];
  const tron = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * Math.min(1, Math.max(0, t))));
  const c = pt <= nguong ? tron(XANH, VANG, pt / nguong) : tron(VANG, DO, (pt - nguong) / nguong);
  return `rgb(${c.join(",")})`;
}

/** Vòng tròn % trễ: phần tô (theo chiều kim đồng hồ từ 12 giờ) = % trễ, màu theo mauTre */
function TronTre({ pt, nguong }: { pt: number; nguong: number }) {
  const R = 8, C = 2 * Math.PI * R, mau = mauTre(pt, nguong);
  return (
    <svg className="tron-tre" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="9.2" fill="none" stroke={mau} strokeWidth="1.2" />
      {pt > 0 && <circle cx="10" cy="10" r={R / 2} fill="none" stroke={mau} strokeWidth={R} strokeDasharray={`${(Math.min(pt, 100) / 100) * (C / 2)} ${C}`} transform="rotate(-90 10 10)" />}
    </svg>
  );
}

/** Chấm Năng suất: mỗi chấm ≈ 1 điểm việc/người (có làm ra thì ít nhất 1 chấm, tối đa 12); 0 = một vòng rỗng */
function ChamLamRa({ x }: { x: number }) {
  const n = x > 0 ? Math.min(12, Math.max(1, Math.round(x))) : 0;
  return (
    <span className="cham-lr">
      {n ? Array.from({ length: n }, (_, i) => <i key={i} />) : <i className="rong" />}
      {x > 12 ? <b>+</b> : null}
    </span>
  );
}

/** Một đơn vị đã nộp, đặt trên trục thời gian */
type ChamNop = { id: string; ten: string; luc: string; tre: boolean; x: number };
const CO_NUT = 22; // đường kính nút (px) — hai nút gần nhau hơn thế thì chồng lên nhau → gộp

/**
 * Trục "Thời điểm gửi báo cáo" — Mr. Đại chốt 02/10: các chấm sát nhau chồng lên nhau nên 5/5 mà chỉ thấy 2 chấm. Nay gộp các
 * đơn vị nộp gần nhau (cách nhau dưới một đường kính nút, đo theo bề rộng trục thật — điện thoại trục hẹp thì gộp rộng hơn)
 * thành MỘT nút ghi số đơn vị bên trong. Rê chuột: danh sách đơn vị + giờ nộp. Bấm: nút 1 đơn vị mở thẳng bên phải;
 * nút nhiều đơn vị xổ danh sách, bấm tên là mở và đóng luôn.
 */
function TrucNop({ cham, chon, children }: { cham: ChamNop[]; chon: (id: string) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rong, setRong] = useState(600);
  const [mo, setMo] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRong(el.clientWidth || 600));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (mo === null) return;
    const dong = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMo(null);
    };
    document.addEventListener("mousedown", dong);
    return () => document.removeEventListener("mousedown", dong);
  }, [mo]);
  const nguong = (100 * CO_NUT) / Math.max(rong, 1);
  const cum: ChamNop[][] = [];
  for (const c of [...cham].sort((a, b) => a.x - b.x || a.luc.localeCompare(b.luc))) {
    const cuoi = cum[cum.length - 1];
    if (cuoi && c.x - cuoi[0].x < nguong) cuoi.push(c);
    else cum.push([c]);
  }
  const gio = (c: ChamNop) => `${c.luc.slice(11, 16)} ${ngayVN(c.luc.slice(0, 10))}`;
  return (
    <div className="truc" ref={ref}>
      {children}
      {cum.map((g, i) => {
        const x = g.reduce((n, c) => n + c.x, 0) / g.length;
        const tre = g.filter((c) => c.tre).length;
        const nen = tre === 0 ? "#22C55E" : tre === g.length ? "var(--p-danger)" : `conic-gradient(var(--p-danger) 0 ${(100 * tre) / g.length}%, #22C55E 0)`;
        const tip = (g.length > 1 ? `${g.length} đơn vị nộp:\n` : "") + g.map((c) => `${c.ten} — nộp ${gio(c)}${c.tre ? " (sau hạn)" : ""}`).join("\n");
        return (
          <span key={g[0].id} className="cum" style={{ left: `${x}%` }}>
            <button className="cham" style={{ background: nen }} title={mo === i ? undefined : tip} onClick={() => (g.length === 1 ? chon(g[0].id) : setMo(mo === i ? null : i))}>
              {g.length}
            </button>
            {mo === i && (
              <span className={`ds-cum${x > 70 ? " trai" : ""}`}>
                {g.map((c) => (
                  <button key={c.id} onClick={() => { setMo(null); chon(c.id); }}>
                    <i style={{ background: c.tre ? "var(--p-danger)" : "#22C55E" }} />
                    {c.ten}<em>{gio(c)}</em>
                  </button>
                ))}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function BaoCaoTuanPhong() {
  const sp = useSearchParams();
  const tuanChon = sp.get("tuan") ?? "";
  const toi = useToi();
  const keo = useKeoGiua("bao-cao-tuan");
  const [dl, setDl] = useState<DuLieuSoDo | null>(null);
  const [viecApi, setViecApi] = useState<ViecApi[] | null>(null);
  const [xongApi, setXongApi] = useState<ViecApi[] | null>(null);
  const [bc, setBc] = useState<PhanHoi | null>(null);
  /** tab Cần ra quyết định: dòng kiến nghị + Form 0 của tuần (lib/bao-cao-tuan/can-quyet.ts) */
  const [cq, setCq] = useState<{ dong: DongCanQuyet[]; an_xong: number; an_de: number; nong_an: string[]; dang_xet_ai?: number } | null>(null);
  const lanHoiAi = useRef(0);
  const [loi, setLoi] = useState("");
  const [tab, setTab] = useState<"t1" | "t2" | "t3">("t1");
  const [phai, setPhai] = useState<Phai | null>(null);
  /** chú thích nổi khi rê chuột lên tiêu đề / ô số của bảng chỉ số (Mr. Đại 30/09) */
  const [goi, setGoi] = useState<{ x: number; y: number; nd: React.ReactNode } | null>(null);
  const goiY = (nd: React.ReactNode) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setGoi({ x: Math.max(8, Math.min(r.left, window.innerWidth - 348)), y: r.bottom + 6, nd });
    },
    onMouseLeave: () => setGoi(null),
  });
  const [mo, setMo] = useState("");
  const [chonDong, setChonDong] = useState("");
  const [toast, setToast] = useState("");
  const [bcGoc, setBcGoc] = useState<ViecO | null>(null);
  // Tab Cần BLĐ ra quyết định: 5 dòng một trang, bấm số trang 2, 3, 4… (Mr. Đại chốt 02/10)
  const [trangCq, setTrangCq] = useState(0);
  /** tab con của Cần BLĐ ra quyết định (Mr. Đại chốt 20/10/2026) */
  const [nhomCq, setNhomCq] = useState<NhomCanQuyet>("truoc_khoi_cong");
  const [trangNong, setTrangNong] = useState(0);
  const [cachTinh, setCachTinh] = useState(false);
  const bao = useCallback((s: string) => {
    setToast(s);
    window.setTimeout(() => setToast(""), 3500);
  }, []);

  const taiBc = useCallback(async () => {
    try {
      setBc(await goiApi<PhanHoi>(`/api/bao-cao-tuan${tuanChon ? `?tuan=${tuanChon}` : ""}`));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, [tuanChon]);
  const taiViec = useCallback(async () => {
    const [a, b] = await Promise.all([goiApi<{ viec: ViecApi[] }>("/api/so-cai"), goiApi<{ viec: ViecApi[] }>("/api/so-cai/da-xong")]);
    setViecApi(a.viec);
    setXongApi(b.viec);
  }, []);
  useEffect(() => {
    goiApi<DuLieuSoDo>("/api/phong/so-do").then(setDl).catch((e) => setLoi(e instanceof Error ? e.message : String(e)));
    void taiViec().catch((e) => setLoi(e instanceof Error ? e.message : String(e)));
  }, [taiViec]);
  useEffect(() => {
    void taiBc();
  }, [taiBc]);
  const tuanTu = bc?.ban?.tuan_tu;
  const tuanDen = bc?.ban?.tuan_den;
  const nongMa = (bc?.ban?.so_lieu?.nong ?? []).map((n) => n.ma).join(",");
  const taiCq = useCallback(async () => {
    if (!tuanTu || !tuanDen) return setCq(null);
    try {
      setCq(await goiApi(`/api/bao-cao-tuan/can-quyet?tu=${tuanTu}&den=${tuanDen}&nong=${encodeURIComponent(nongMa)}`));
    } catch {
      setCq({ dong: [], an_xong: 0, an_de: 0, nong_an: [] });
    }
  }, [tuanTu, tuanDen, nongMa]);
  useEffect(() => {
    lanHoiAi.current = 0;
    void taiCq();
  }, [taiCq]);
  // 🤖 AI đang đọc những dòng luật code chưa chắc (chạy nền) → hỏi lại sau 20 giây, tối đa 6 lần
  useEffect(() => {
    if (!cq?.dang_xet_ai || lanHoiAi.current >= 6) return;
    const t = window.setTimeout(() => {
      lanHoiAi.current++;
      void taiCq();
    }, 20_000);
    return () => window.clearTimeout(t);
  }, [cq, taiCq]);
  // AI đang viết → hỏi lại mỗi 10 giây
  useEffect(() => {
    if (bc?.ban?.trang_thai !== "dang_viet") return;
    const t = window.setInterval(() => void taiBc(), 10_000);
    return () => window.clearInterval(t);
  }, [bc?.ban?.trang_thai, taiBc]);

  const sl: KetQuaTinh | null = bc?.ban?.so_lieu ?? null;
  const ai = bc?.ban?.ai ?? null;
  const tenDvMap = useMemo(() => {
    const m: Record<string, string> = { bld: "Ban lãnh đạo" };
    for (const o of dl?.o ?? []) m[o.id] = o.ten_ngan;
    for (const l of dl?.lanh_dao ?? []) m[l.id] = l.ten_ngan;
    for (const r of sl?.don_vi ?? []) m[r.ma] = r.ten;
    for (const c of sl?.nop ?? []) for (const d of c.don_vi) m[d.id] ??= d.ten;
    return m;
  }, [dl, sl]);
  const tenDv = useCallback((id: string) => tenDvMap[id] ?? id, [tenDvMap]);
  const goc = useMemo(() => dl?.o.find((o) => o.cha === null)?.id ?? "", [dl]);
  const tenNgan = useCallback((id: string) => (id === goc ? "Ban lãnh đạo" : tenDv(id)), [goc, tenDv]);
  // Ô "Giao cho" trong form giao việc (Mr. Đại chốt 09/10): lãnh đạo đích danh + đơn vị, cùng một danh sách với hộp Sửa việc
  const noiGiao = useMemo(() => (dl ? noiGiaoDichDanh(dl.o, dl.lanh_dao) : []), [dl]);

  // Việc (đang mở + đã xong) → ViecO như Sơ đồ tổ chức (dùng chung dòng việc bên phải)
  const V: Record<string, ViecO> = useMemo(() => {
    if (!dl || !viecApi) return {};
    const coO = new Set(dl.o.map((o) => o.id));
    const lanhDao = new Set(dl.lanh_dao.map((l) => l.id));
    const oCua = (id: string | null) => (!id ? null : coO.has(id) ? id : lanhDao.has(id) ? goc : null);
    const dvNguoi = Object.fromEntries(dl.nguoi.map((n) => [n.id, n.don_vi_id]));
    const tenNguoi = Object.fromEntries(dl.nguoi.map((n) => [n.id, n.ten]));
    const gon = Object.fromEntries(dl.lanh_dao.map((l) => [l.id, l.ten_ngan]));
    return Object.fromEntries([...viecApi, ...(xongApi ?? [])].map((v) => [v.id, chuyenViec(v, dl.hom_nay, oCua, dvNguoi, tenNguoi, gon)]));
  }, [dl, viecApi, xongApi, goc]);
  const tenViec = (ma: string, n = 70) => {
    const t = V[ma]?.ten ?? sl?.viec[ma]?.ten ?? "";
    return `${ma} ${t.length > n ? t.slice(0, n - 1) + "…" : t}`;
  };
  const diemCua = (ma: string) => bc?.do_kho[ma]?.diem ?? sl?.viec[ma]?.diem ?? 0;
  useEffect(() => {
    setTrangCq(0);
    setTrangNong(0);
  }, [sl?.tuan.so]);

  // ---------- Cột phải ----------
  const xemDs = (tieu: string, nhom: { ten: string; ma: string[] }[] | string[], moMa = "", kho = false) => {
    const n = typeof nhom[0] === "string" || !nhom.length ? [{ ten: "", ma: nhom as string[] }] : (nhom as { ten: string; ma: string[] }[]);
    setPhai({ kieu: "ds", tieu, nhom: n, kho });
    setMo(moMa);
  };
  const moViec = (ma: string) => xemDs(tenViec(ma, 40), [ma], ma);
  const xemDonVi = (id: string, loc?: string) => {
    const r = sl?.don_vi.find((x) => x.ma === id);
    setChonDong(id);
    if (!r) return xemDs(tenDv(id), []);
    if (loc === "qua_han") return xemDs(`${r.ten} · quá hạn`, r.ds.qua_han);
    if (loc === "trong_han") return xemDs(`${r.ten} · trong hạn`, r.ds.trong_han);
    if (loc === "xong") return xemDs(`${r.ten} · xong tuần ${sl?.tuan.so}`, r.ds.xong);
    if (loc === "moi") return xemDs(`${r.ten} · mới tuần ${sl?.tuan.so}`, r.ds.moi);
    xemDs(r.ten, [
      { ten: "Quá hạn", ma: r.ds.qua_han },
      { ten: "Đang làm, trong hạn", ma: r.ds.trong_han },
      { ten: `Xong tuần ${sl?.tuan.so}`, ma: r.ds.xong },
    ]);
  };
  const DS_THE: Record<string, [string, keyof KetQuaTinh["ds_the"]]> = {
    xong: ["Việc xong tuần", "xong"],
    moi: ["Việc mới tuần", "moi"],
    qua_han: ["Việc quá hạn toàn công ty", "qua_han"],
    trong_han: ["Việc đang mở trong hạn", "trong_han"],
  };
  const xemDsThe = (k: string) => {
    if (!sl) return;
    if (k === "dang_mo") return xemDs("Việc đang mở toàn công ty", [{ ten: "Quá hạn", ma: sl.ds_the.qua_han }, { ten: "Trong hạn", ma: sl.ds_the.trong_han }]);
    const [t, key] = DS_THE[k] ?? DS_THE.qua_han;
    xemDs(`${t} ${k === "xong" || k === "moi" ? sl.tuan.so : ""}`.trim(), sl.ds_the[key]);
  };
  // Mặc định cột phải: điểm nóng
  useEffect(() => {
    if (sl && !phai) setPhai({ kieu: "ds", tieu: `Điểm nóng tuần ${sl.tuan.so}`, nhom: [{ ten: "", ma: sl.nong.map((n) => n.ma) }] });
  }, [sl, phai]);

  /** Chữ AI có liên kết [[đích|chữ]] → chữ gạch chân bấm được */
  const ChuAi = ({ chu, tru }: { chu: string; tru?: string[] }) => {
    const phan: React.ReactNode[] = [];
    let i = 0;
    for (const m of chu.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g)) {
      phan.push(chu.slice(i, m.index));
      const [dich, hien] = [m[1], m[2]];
      if (tru?.includes(dich)) {
        phan.push(hien);
        i = (m.index ?? 0) + m[0].length;
        continue;
      }
      phan.push(
        <span
          key={m.index}
          className="xem"
          onClick={() => {
            if (/^CV-/.test(dich)) moViec(dich);
            else if (dich.startsWith("dv:")) xemDonVi(dich.split(":")[1], dich.split(":")[2]);
            else if (dich.startsWith("ds:")) xemDsThe(dich.split(":")[1]);
          }}
        >
          {hien}
        </span>,
      );
      i = (m.index ?? 0) + m[0].length;
    }
    phan.push(chu.slice(i));
    return <>{phan}</>;
  };

  // ---------- Giao / Nhắc ----------
  const daLam = (ma: string, loai: "nhac" | "giao") => bc?.thao_tac.some((t) => t.cong_viec_id === ma && t.loai === loai);
  // Nút Giao việc chỉ hiện khi giao được cho bên chủ trì việc đó (riêng 3004: không quyền thì ẨN — Mr. Đại 01/10, như ô Giao việc của Sơ đồ)
  const coTheGiao = (ma: string) => {
    if (!dl) return false;
    const dv = sl?.viec[ma]?.don.find((d) => d !== "bld") ?? goc;
    return dv === goc ? dl.lanh_dao.some((l) => coTheGiaoToi((dl.giao_duoc_bao_cao ?? dl.giao_duoc), l.id)) : coTheGiaoToi((dl.giao_duoc_bao_cao ?? dl.giao_duoc), dv);
  };
  const ghiThaoTac = async (ma: string, loai: "nhac" | "giao", ket_qua?: string, kem?: Pick<KemNutThem, "chu" | "nhac" | "dinh_kem">) => {
    await goiApi("/api/bao-cao-tuan/thao-tac", {
      body: { bao_cao_id: bc?.ban?.id, cong_viec_id: ma, loai, ket_qua, ...(kem ? { loi_nhan: kem.chu, nhac: kem.nhac, dinh_kem: kem.dinh_kem } : {}) },
    });
    await taiBc();
  };
  const NutHang = ({ ma, giao = true }: { ma: string; giao?: boolean }) => (
    <div className="nut-hang" data-gt="bc-giao-nhac" onClick={(e) => e.stopPropagation()}>
      {!giao ? null : daLam(ma, "giao") ? (
        <span className="da-lam">✓ Đã giao</span>
      ) : (
        coTheGiao(ma) && (
          <button className="nut-nho" onClick={() => setPhai({ kieu: "giao", ma })}>
            Giao việc
          </button>
        )
      )}
      {daLam(ma, "nhac") ? (
        <span className="da-lam">✓ Đã nhắc</span>
      ) : (
        bc?.co_the_viet_lai && (
          <button
            className="nut-nho"
            onClick={() =>
              void ghiThaoTac(ma, "nhac")
                .then(() => bao(`Đã gửi chuông nhắc bên chủ trì việc ${tenViec(ma, 40)}`))
                .catch((e) => bao(e instanceof Error ? e.message : String(e)))
            }
          >
            Nhắc
          </button>
        )
      )}
    </div>
  );

  const vietLai = async () => {
    const tuan = bc?.ban?.tuan_tu ?? tuanChon ?? dl?.hom_nay;
    try {
      await goiApi("/api/bao-cao-tuan/viet", { body: { tuan } });
      bao("🤖 AI bắt đầu viết — trang tự cập nhật khi xong (thường vài phút)");
      window.setTimeout(() => void taiBc(), 1500);
    } catch (e) {
      bao(e instanceof Error ? e.message : String(e));
    }
  };

  if (loi) return <div className="trong" style={{ color: "#fca5a5" }}>Không tải được báo cáo tuần: {loi}</div>;
  if (!bc || !dl) return <div className="trong" style={{ color: "#d6d3d1" }}>Đang tải báo cáo tuần…</div>;

  const ban = bc.ban;
  const la = bc.la_bld;

  // ================== KHU TRÁI ==================
  let than: React.ReactNode;
  /** biểu đồ độ khó (chỉ BLĐ) — hiện ở cột phải khi bấm ghi chú dưới bảng chỉ số (Mr. Đại 30/09: bỏ tab thứ 4) */
  let bieuDoKho: React.ReactNode = null;
  if (!ban) {
    than = (
      <div className="trong-bc">
        Tuần này chưa có báo cáo. 🤖 AI tự viết khi Ban TGĐ nộp báo cáo tuần, hoặc tới 12:00 thứ Hai tuần sau.
        {bc.co_the_viet_lai && (
          <>
            {" "}
            <button className="nut-chu" onClick={() => void vietLai()}>Viết ngay</button>
          </>
        )}
      </div>
    );
  } else if (!sl || !ai) {
    than = (
      <div className="trong-bc">
        {ban.trang_thai === "dang_viet"
          ? `🤖 AI đang viết báo cáo tuần ${ban.tuan_so} (bắt đầu ${gioPhut(ban.bat_dau_luc)}) — trang tự cập nhật khi xong.`
          : `🤖 AI chưa viết được báo cáo tuần ${ban.tuan_so}: ${ban.loi ?? "không rõ lỗi"}`}
      </div>
    );
  } else {
    // ----- Bảng chỉ số đơn vị — cách A (Mr. Đại chốt 30/09): Điểm công việc · % trễ · Năng suất → Vùng.
    // Rê chuột lên tiêu đề hoặc ô số: hiện câu hỏi con số trả lời + cách tính (ô số kèm phép tính bằng số thật của dòng).
    const ng = sl.nguong;
    const ngTre = ng.tre ?? 25;
    const GOI_COT = {
      nguoi: <><b>Người</b><p>Số tài khoản của đơn vị trên hệ thống, kể cả người kiêm nhiệm. Đây là số để chia đều việc cho từng người.</p></>,
      cv: <><b>Điểm công việc</b><p><i>Trả lời:</i> mỗi người đang gánh bao nhiêu việc, có tính độ khó?</p><p><i>Cách tính:</i> cộng điểm khó của mọi việc đơn vị đang làm (rất dễ 1 · dễ 2 · vừa 4 · khó 8 · rất khó 13), rồi chia cho số người.</p><p><i>Ngưỡng:</i> trên {ng.qua_tai} là Quá tải · {ng.can_bang}–{ng.qua_tai} Cân bằng · dưới {ng.can_bang} Dư sức.</p></>,
      tre: <><b>% trễ</b><p><i>Trả lời:</i> bao nhiêu phần khối lượng đang làm đã quá hạn?</p><p><i>Cách tính:</i> điểm khó của các việc quá hạn ÷ điểm khó của mọi việc đang làm × 100. Một việc khó quá hạn kéo % lên nhiều hơn một việc dễ.</p><p><i>Ngưỡng:</i> từ {ngTre}% trở lên là trễ nhiều, dưới là giữ nhịp.</p></>,
      lr: <><b>Năng suất</b><p><i>Trả lời:</i> tuần này mỗi người khép lại được bao nhiêu?</p><p><i>Cách tính:</i> điểm khó của các việc xong trong tuần ÷ số người.</p><p>Chỉ để xem thêm, không dùng để xếp vùng.</p></>,
      vung: <><b>Vùng</b><p>Ghép Điểm công việc (nặng hay nhẹ) với % trễ (kịp hay chậm):</p><p>Quá tải / Cân bằng / Dư sức &nbsp;×&nbsp; giữ nhịp / trễ nhiều → 6 vùng, ví dụ &quot;Quá tải, trễ nhiều&quot;.</p><p>Vùng chỉ tả tình trạng, không phải lời khen chê.</p></>,
    };
    const mucCv = (r: DongDonVi) => (r.tai_nguoi == null ? "" : r.tai_nguoi > ng.qua_tai ? `vượt ngưỡng quá tải ${ng.qua_tai}` : r.tai_nguoi >= ng.can_bang ? `trong khoảng cân bằng ${ng.can_bang}–${ng.qua_tai}` : `dưới ${ng.can_bang} — dư sức`);
    const goiO = {
      cv: (r: DongDonVi) => <><b>{r.ten} · Điểm công việc</b><p>{r.so_mo} việc đang làm = {r.tai} điểm ÷ {r.nhan_su} người = <b>{phay(r.tai_nguoi)}</b> điểm/người</p><p>→ {mucCv(r)}</p></>,
      tre: (r: DongDonVi) => <><b>{r.ten} · % trễ</b><p>{r.so_qua_han} việc quá hạn = {r.diem_tre ?? 0} điểm ÷ {r.tai} điểm đang làm = <b>{r.pt_tre ?? "—"}%</b></p><p>→ {r.tre_nhieu ? `từ ngưỡng ${ngTre}% trở lên: trễ nhiều` : `dưới ngưỡng ${ngTre}%: giữ nhịp`}</p>{r.so_qua_han ? <p>Bấm để xem {r.so_qua_han} việc quá hạn bên phải.</p> : null}</>,
      lr: (r: DongDonVi) => <><b>{r.ten} · Năng suất</b><p>{r.so_xong} việc xong trong tuần = {r.san_luong} điểm ÷ {r.nhan_su} người = <b>{phay(r.lam_ra_nguoi ?? null)}</b> điểm/người</p>{r.so_xong ? <p>Bấm để xem {r.so_xong} việc xong bên phải.</p> : null}</>,
      vung: (r: DongDonVi) => <><b>{r.ten} · {tenVung(r)}</b><p>Điểm công việc {phay(r.tai_nguoi)} → {mucCv(r)}</p>{r.pt_tre != null && <p>% trễ {r.pt_tre}% → {r.tre_nhieu ? "trễ nhiều" : "giữ nhịp"} (ngưỡng {ngTre}%)</p>}</>,
    };
    const maxTN = Math.max(...sl.don_vi.map((x) => x.tai_nguoi ?? 0), 1);
    const bangDv = (
      <>
      <table className="bang-dv">
        <colgroup>
          <col />
          <col style={{ width: 64 }} />
          <col style={{ width: 150 }} />
          <col style={{ width: 84 }} />
          <col style={{ width: 104 }} />
          <col style={{ width: 170 }} />
        </colgroup>
        <thead>
          <tr>
            <th>Đơn vị</th>
            <th data-gt="bc-cot-nguoi" {...goiY(GOI_COT.nguoi)}>Người</th>
            <th data-gt="bc-cot-diem" {...goiY(GOI_COT.cv)}>Điểm công việc</th>
            <th data-gt="bc-cot-tre" {...goiY(GOI_COT.tre)}>% trễ</th>
            <th data-gt="bc-cot-lam-ra" {...goiY(GOI_COT.lr)}>Năng suất</th>
            <th data-gt="bc-cot-vung" {...goiY(GOI_COT.vung)}>Vùng</th>
          </tr>
        </thead>
        <tbody>
          {sl.don_vi.map((r) => [
            <tr key={r.ma} className={`dong-dv ${chonDong === r.ma ? "chon" : ""}`} onClick={() => xemDonVi(r.ma)}>
              <td className="nw"><b>{r.ten}</b></td>
              <td className="s">{r.nhan_su}</td>
              <td className="o-cv">{r.tai_nguoi === null ? <span className="mo nho">—</span> : <span className="thanh-cv" {...goiY(goiO.cv(r))}><i style={{ width: r.tai_nguoi > 0 ? `${Math.max(2, Math.round((100 * r.tai_nguoi) / maxTN))}%` : 0 }} /></span>}</td>
              <td>{r.pt_tre == null ? <span className="mo nho">—</span> : <span className={`o-hinh ${r.so_qua_han ? "bam" : ""}`} {...goiY(goiO.tre(r))} onClick={r.so_qua_han ? (e) => (e.stopPropagation(), xemDonVi(r.ma, "qua_han")) : undefined}><TronTre pt={r.pt_tre} nguong={ngTre} /></span>}</td>
              <td>{r.lam_ra_nguoi == null ? <span className="mo nho">—</span> : <span className={`o-hinh ${r.so_xong ? "bam" : ""}`} {...goiY(goiO.lr(r))} onClick={r.so_xong ? (e) => (e.stopPropagation(), xemDonVi(r.ma, "xong")) : undefined}><ChamLamRa x={r.lam_ra_nguoi} /></span>}</td>
              <td className={`nw vung-${r.vung}`} {...(r.vung === "chua_du" || r.vung === "tap_the" ? {} : goiY(goiO.vung(r)))}>{tenVung(r)}</td>
            </tr>,
            <tr key={r.ma + "-nx"} className="dong-nx" data-gt="bc-nhan-xet" onClick={() => xemDonVi(r.ma)}>
              <td colSpan={6} title={ai.nhan_xet[r.ma] ? ai.nhan_xet[r.ma].replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1") : ""}>
                {ai.nhan_xet[r.ma] ? <>🤖 <ChuAi chu={ai.nhan_xet[r.ma]} /></> : <span className="mo">🤖 —</span>}
              </td>
            </tr>,
          ])}
        </tbody>
      </table>
      <div className="chan-bang mo nho">
        <span>
          Thanh dài = gánh nhiều · Vòng tròn: phần tô = % trễ, màu <b style={{ color: mauTre(0, ngTre) }}>xanh</b> → <b style={{ color: mauTre(ngTre, ngTre) }}>vàng</b> (ngưỡng {ngTre}%) → <b style={{ color: mauTre(2 * ngTre, ngTre) }}>đỏ</b> (từ {2 * ngTre}%) · Mỗi chấm ≈ 1 điểm việc làm ra/người. Rê chuột lên hình để xem con số và cách tính.
          {sl.chua_cham ? ` ${sl.chua_cham} việc AI chưa kịp chấm độ khó, tạm tính 2 điểm.` : ""}
        </span>
        {la ? (
          <button className="lk-phai" data-gt="bc-do-kho" onClick={() => setPhai({ kieu: "dokho" })}>🤖 Độ khó từng việc do AI chấm ›</button>
        ) : (
          <span className="nw">🤖 Độ khó từng việc do AI chấm</span>
        )}
      </div>
      </>
    );

    // Cách tính chi tiết — mỗi bước kèm phép tính bằng số thật của đơn vị đang chọn (chưa chọn: đơn vị có Điểm công việc cao nhất)
    const vd = sl.don_vi.find((x) => x.ma === chonDong && x.tai_nguoi != null) ?? [...sl.don_vi].filter((x) => x.tai_nguoi != null).sort((a, b) => (b.tai_nguoi ?? 0) - (a.tai_nguoi ?? 0))[0];
    const cachTinhNd = (
      <div className="cach-tinh">
        <div><b>Bước 1 · Điểm khó từng việc</b><span>🤖 AI chấm mỗi việc một mức: rất dễ 1 · dễ 2 · vừa 4 · khó 8 · rất khó 13. Căn cứ: phạm vi ảnh hưởng, có vướng cơ quan/đối tác bên ngoài không, giá trị tiền, số bên phải phối hợp. Ban lãnh đạo sửa được điểm; người sửa thì thắng AI. Việc giao đích danh một người được tính về đơn vị chính của người đó.</span></div>
        <div><b>Bước 2 · Điểm công việc</b><span>Cộng điểm khó các việc đơn vị đang làm, chia cho số người (số tài khoản, kể cả kiêm nhiệm).{vd && <> Ví dụ {vd.ten}: {vd.so_mo} việc = {vd.tai} điểm ÷ {vd.nhan_su} người = <b>{phay(vd.tai_nguoi)}</b>.</>} Trên {ng.qua_tai} Quá tải · {ng.can_bang}–{ng.qua_tai} Cân bằng · dưới {ng.can_bang} Dư sức.</span></div>
        <div><b>Bước 3 · % trễ</b><span>Việc quá hạn = đã qua hạn mà chưa xong (hạn lấy theo phần chủ trì sớm nhất còn mở). Cộng điểm khó các việc quá hạn, chia cho điểm khó mọi việc đang làm.{vd && <> Ví dụ {vd.ten}: {vd.so_qua_han} việc = {vd.diem_tre ?? 0} điểm ÷ {vd.tai} = <b>{vd.pt_tre ?? "—"}%</b>.</>} Từ {ngTre}% trở lên là trễ nhiều.</span></div>
        <div><b>Bước 4 · Năng suất</b><span>Cộng điểm khó các việc xong trong tuần, chia cho số người.{vd && <> Ví dụ {vd.ten}: {vd.so_xong} việc = {vd.san_luong} điểm ÷ {vd.nhan_su} = <b>{phay(vd.lam_ra_nguoi ?? null)}</b>.</>} Chỉ để xem thêm, không dùng xếp vùng.</span></div>
        <div><b>Bước 5 · Vùng</b><span>Ghép bước 2 và bước 3.{vd && <> Ví dụ {vd.ten}: <b>{tenVung(vd)}</b>.</>} Ngưỡng đổi ở Cài đặt → Báo cáo tuần (AI).</span></div>
      </div>
    );

    // Dòng tổng đầu nhận định — máy ghép từ số đã tính, mọi con số bấm được (Mr. Đại 01/10)
    const lk = (k: string, chu: React.ReactNode) => <span className="xem" onClick={() => xemDsThe(k)}>{chu}</span>;
    const dongTong = (
      <>
        Tuần {sl.tuan.so} {sl.hom_nay < sl.tuan.den ? <>tính tới {ngayVN(sl.hom_nay)} có </> : <>khép lại với </>}
        {lk("xong", <>{sl.the.xong} việc hoàn thành</>)}, {lk("moi", <>{sl.the.moi} việc mới</>)} và {lk("dang_mo", <>{sl.the.dang_mo} việc đang mở</>)}, trong đó {lk("qua_han", <>{sl.the.qua_han} việc đã quá hạn</>)}.
      </>
    );
    const t1 = (
      <>
        <div className="the ai">
          <h2 data-gt="bc-nhan-dinh">🤖 Nhận định chung <span className="phu">chữ gạch chân cam: bấm để xem việc bên phải</span></h2>
          <ul className="gach">
            <li data-gt="bc-dong-tong">{dongTong}</li>
            {ai.nhan_dinh.map((x, i) => <li key={i}><ChuAi chu={x} /></li>)}
          </ul>
        </div>
        <div className="the">
          <h2>
            Chỉ số đơn vị <span className="phu">bấm một dòng: việc của đơn vị hiện bên phải</span>
            <button className="lk-phai" data-gt="bc-cach-tinh" onClick={() => setCachTinh((b) => !b)}>Cách tính các chỉ số {cachTinh ? "▴" : "▾"}</button>
          </h2>
          {cachTinh && cachTinhNd}
          {bangDv}
        </div>
      </>
    );

    // ---- Nút Nhắc (cùng cỡ nút Gửi của ô ý kiến) — ô ý kiến đang có chữ/file thì gửi kèm trong tin nhắc (Mr. Đại chốt 02/10) ----
    const nutNhac = (ma: string) => (kem: KemNutThem) =>
      daLam(ma, "nhac") ? (
        <span className="da-lam nut-ngang">✓ Đã nhắc</span>
      ) : bc?.co_the_viet_lai ? (
        <button
          className="nut-gui nut-nhac"
          disabled={kem.ban}
          title={kem.chu || kem.dinh_kem.length ? "Gửi chuông nhắc kèm lời nhắn đang gõ" : "Gửi chuông nhắc bên chủ trì việc"}
          onClick={() => {
            const coKem = !!kem.chu || kem.dinh_kem.length > 0;
            void ghiThaoTac(ma, "nhac", undefined, coKem ? kem : undefined)
              .then(() => {
                if (coKem) kem.xong();
                bao(`Đã gửi chuông nhắc${coKem ? " kèm lời nhắn" : ""} bên chủ trì việc ${tenViec(ma, 40)}`);
              })
              .catch((e) => bao(e instanceof Error ? e.message : String(e)));
          }}
        >
          Nhắc
        </button>
      ) : null;
    // Khối nội dung (bên trái) của một việc đã có: ô việc rút gọn như Sơ đồ, BỎ thanh thời gian + "Kết quả cần có" (Mr. Đại 02/10)
    const oViec = (ma: string) =>
      V[ma] ? (
        <TomTatViec v={V[ma]} tenNgan={tenNgan} bat={() => moViec(ma)} moGoc={() => setBcGoc(V[ma])} />
      ) : (
        <div className="ten xem" onClick={() => moViec(ma)}>{tenViec(ma, 80)}</div>
      );
    // Cột phải (xanh): ô ý kiến @ + 📎, dưới là Gửi · Nhắc cùng cỡ
    const oYKien = (ma: string) => (
      <div className="ben ben-y-kien">
        <BinhLuanViec maViec={ma} sauKhiGui={bao} che="viet" nutThem={nutNhac(ma)} />
      </div>
    );
    // Phân trang 5 dòng + "Xem cả N việc bên phải →"
    const MOI_TRANG = 5;
    const phanTrang = (tong: number, trang: number, dat: (t: number) => void) => {
      const so = Math.ceil(tong / MOI_TRANG);
      if (so <= 1) return null;
      return (
        <div className="phan-trang">
          {Array.from({ length: so }, (_, t) => (
            <button key={t} className={t === trang ? "dang" : ""} onClick={() => dat(t)}>
              {t + 1}
            </button>
          ))}
        </div>
      );
    };
    const hang = (ma: string[], i: number, loiAi: string, benPhai: React.ReactNode, dong2: React.ReactNode, viecDaCo = false) =>
      viecDaCo ? (
        // Điểm nóng (việc đã có): không Giao việc — ý kiến @ + Nhắc ở cột phải (chốt 02/10)
        <div key={ma.join(",")} className={`hang hang-kn ${phai?.kieu === "ds" && mo === ma[0] ? "chon" : ""}`}>
          <div className="stt">{i + 1}</div>
          <div>
            {oViec(ma[0])}
            <div className="ai">🤖 <ChuAi chu={loiAi} tru={ma} /></div>
            <div className="dong2">{dong2}</div>
            <BinhLuanViec maViec={ma[0]} che="ds" />
          </div>
          {oYKien(ma[0])}
        </div>
      ) : (
      <div
        key={ma.join(",")}
        className={`hang ${phai?.kieu === "ds" && mo === ma[0] ? "chon" : ""}`}
        onClick={() => xemDs(ma.length > 1 ? `${ma[0]} và việc liên quan` : tenViec(ma[0], 40), ma, ma[0])}
      >
        <div className="stt">{i + 1}</div>
        <div>
          <div className="ten" title={tenViec(ma[0], 400)}>{tenViec(ma[0], 80)}</div>
          <div className="ai">🤖 <ChuAi chu={loiAi} tru={ma} /></div>
          <div className="dong2">{dong2}</div>
        </div>
        <div className="ben">
          {benPhai}
          <NutHang ma={ma[0]} />
        </div>
      </div>
    );
    const benViec = (ma: string) => {
      const v = sl.viec[ma];
      const tre = V[ma]?.tt === "tre" ? v?.tre : 0;
      return tre ? <span className="tre">quá hạn {tre} ngày</span> : v?.han ? <span className="mo">hạn {ngayVN(v.han)}</span> : <span className="mo">chưa có hạn</span>;
    };
    // ----- t2 Cần ra quyết định (Mr. Đại chốt 02/10): dòng kiến nghị + Form 0 do CODE đọc từ báo cáo, mỗi dòng theo việc trên sổ cái
    const maCq = new Set((cq?.dong ?? []).flatMap((d) => (d.viec ? [d.viec.ma] : [])));
    // Điểm nóng: bỏ việc đã hiện ở trên + việc độ khó dễ / rất dễ (BLĐ không cần đọc — chốt 02/10)
    const nongCon = sl.nong.filter((n) => !maCq.has(n.ma) && !cq?.nong_an.includes(n.ma));
    // Chuyển nhóm: người có quyền giao việc (cùng người bấm Giao việc ở đây); chọn là áp dụng luôn — không nút xác nhận (quy tắc 4)
    const gd = dl.giao_duoc_bao_cao ?? dl.giao_duoc;
    const duocChuyenNhom = gd === "tat_ca" || (Array.isArray(gd) && gd.length > 0);
    const chuyenNhom = async (d: DongCanQuyet, nhom: NhomCanQuyet) => {
      if (!nhom) return;
      try {
        await goiApi("/api/bao-cao-tuan/can-quyet/nhom", { body: { khoa: d.khoa, nhom } });
        setCq((c) => (c ? { ...c, dong: c.dong.map((x) => (x.khoa === d.khoa ? { ...x, nhom, nhom_boi: "nguoi", nhom_ly_do: undefined, nhom_cho_ai: false } : x)) } : c));
        bao(`Đã chuyển sang nhóm ${NHOM_CAN_QUYET.find((n) => n.kieu === nhom)?.nhan}`);
      } catch (e) {
        bao(e instanceof Error ? e.message : String(e));
      }
    };
    const dongCq = (d: DongCanQuyet, i: number) => {
      const [dau, ...sau] = d.noi_dung.split("\n");
      const dv0 = d.don_vi[0]?.id ?? goc;
      const v = d.viec;
      return (
        <div key={d.khoa} className={`hang hang-kn ${v && phai?.kieu === "ds" && mo === v.ma ? "chon" : ""}`}>
          <div className="stt">{i + 1}</div>
          <div>
            {/* Đã có việc trên hệ thống: hiện ô việc rút gọn (bấm tên mở việc bên phải) — một việc không hiện ở hai nơi (02/10) */}
            {v ? (
              oViec(v.ma)
            ) : (
              <>
                <div className="ten-kn">{d.loai === "quyet_dinh" ? "Form 0 · " : ""}{dau}</div>
                {sau.length > 0 && <div className="mo-ta-kn">{sau.join(" ")}</div>}
              </>
            )}
            {d.kien_nghi && <div className="kn-de-xuat">{d.loai === "quyet_dinh" ? "" : <b>Kiến nghị: </b>}{d.kien_nghi}</div>}
            <div className="dong2">
              {d.don_vi.map((x, j) => (
                <span key={x.id}>
                  {j ? " · " : ""}
                  <button className="lk-bc" onClick={() => moXemTep(x.tai_lieu_id, `Báo cáo ${x.ten}`, "tai_lieu", [dau, d.kien_nghi])} title="Mở báo cáo gốc — khung cam là dòng kiến nghị này">{x.ten}</button>
                </span>
              ))}
              {d.muc_do ? ` · mức độ ${d.muc_do}` : ""}
              {d.nhom_cho_ai ? (
                <span className="mo"> · 🤖 đang xếp nhóm…</span>
              ) : d.nhom_ai_loi ? (
                <span className="mo" title="AI chưa đọc được dòng này — nhóm đang là máy đoán tạm, 10 phút sau máy hỏi lại"> · 🤖 chưa xếp được — máy đoán tạm</span>
              ) : d.nhom_boi === "ai" ? (
                <span className="mo" title="🤖 AI xếp nhóm — bấm Chuyển nhóm nếu chưa đúng"> · 🤖 {d.nhom_ly_do || "AI xếp"}</span>
              ) : null}
              {duocChuyenNhom && (
                <select className="chon-nhom" data-gt="bc-chuyen-nhom" value="" aria-label="Chuyển dòng này sang nhóm khác" onChange={(e) => void chuyenNhom(d, e.target.value as NhomCanQuyet)}>
                  <option value="">Chuyển nhóm…</option>
                  {NHOM_CAN_QUYET.filter((n) => n.kieu !== d.nhom).map((n) => (
                    <option key={n.kieu} value={n.kieu}>
                      {n.nhan}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {v && <BinhLuanViec maViec={v.ma} che="ds" />}
          </div>
          {v?.trang_thai === "dang_mo" ? (
            oYKien(v.ma)
          ) : (
          <div className="ben">
            {!v ? (
              <>
                {d.co_the &&
                  (d.ung_vien?.length ? (
                    <div className="co-the">🤖 đang đọc xem đã có việc chưa…</div>
                  ) : (
                    <div className="co-the" title={d.co_the.ten}>
                      có thể là <span className="xem" onClick={() => moViec(d.co_the!.ma)}>{d.co_the.ma}</span>
                    </div>
                  ))}
                {coTheGiaoToi((dl.giao_duoc_bao_cao ?? dl.giao_duoc), dv0) || (dl.giao_duoc_bao_cao ?? dl.giao_duoc) === "tat_ca" ? (
                  <div className="nut-hang">
                    <button className="nut-nho" onClick={() => setPhai({ kieu: "giao_kn", khoa: d.khoa, dv: dv0, ten: dau })}>Giao việc</button>
                  </div>
                ) : (
                  <span className="mo">chưa có việc</span>
                )}
              </>
            ) : (
              <span className="tt-xong">
                {v.trang_thai === "hoan_thanh" ? "Đã xong" : "Đã đóng"}{v.dong_ngay ? ` ngày ${ngayVN(v.dong_ngay)}` : ""}
              </span>
            )}
          </div>
          )}
        </div>
      );
    };
    // 4 tab con (20/10): mỗi dòng đúng một nhóm; số trên tab = số dòng của nhóm
    const theoNhom = (k: NhomCanQuyet) => (cq?.dong ?? []).filter((d) => (d.nhom ?? "khac") === k);
    const dongNhom = theoNhom(nhomCq);
    const maNhom = [...new Set(dongNhom.flatMap((d) => (d.viec ? [d.viec.ma] : [])))];
    const soChua = dongNhom.filter((d) => !d.viec).length;
    // trang đang xem (kẹp lại khi danh sách ngắn đi)
    const tCq = Math.min(trangCq, Math.max(0, Math.ceil(dongNhom.length / MOI_TRANG) - 1));
    const tNong = Math.min(trangNong, Math.max(0, Math.ceil(nongCon.length / MOI_TRANG) - 1));
    const an = cq ? [cq.an_xong ? `${cq.an_xong} đã xong` : "", cq.an_de ? `${cq.an_de} việc dễ / rất dễ` : ""].filter(Boolean).join(", ") : "";
    const t2 = (
      <>
        <div className="the">
          <h2 data-gt="bc-can-quyet">
            Cần BLĐ ra quyết định{" "}
            <span className="phu">
              kiến nghị trong báo cáo mới nhất của các đơn vị tuần {sl.tuan.so} + quyết định Form 0
              {cq ? ` · ${dongNhom.length} dòng: ${soChua} chưa có việc · ${dongNhom.length - soChua} đang chạy${an ? ` · cả 4 nhóm đã ẩn ${an}` : ""}` : ""}
            </span>
            {maNhom.length > 0 && (
              <button className="lk-phai" onClick={() => xemDs(`Cần BLĐ ra quyết định tuần ${sl.tuan.so} · ${NHOM_CAN_QUYET.find((n) => n.kieu === nhomCq)?.nhan}`, maNhom)}>Xem cả {maNhom.length} việc bên phải →</button>
            )}
          </h2>
          <div className="tab-nhom-cq" data-gt="bc-nhom-quyet">
            {NHOM_CAN_QUYET.map((n) => (
              <button key={n.kieu} className="nut-nho" aria-pressed={nhomCq === n.kieu} title={n.giai_thich} onClick={() => (setNhomCq(n.kieu), setTrangCq(0))}>
                {n.nhan} · {theoNhom(n.kieu).length}
              </button>
            ))}
          </div>
          {cq === null ? (
            <div className="mo">Đang đọc kiến nghị trong các báo cáo…</div>
          ) : dongNhom.length ? (
            dongNhom.slice(tCq * MOI_TRANG, (tCq + 1) * MOI_TRANG).map((d, j) => dongCq(d, tCq * MOI_TRANG + j))
          ) : (
            <div className="mo">Tuần {sl.tuan.so} không có kiến nghị nào thuộc nhóm {NHOM_CAN_QUYET.find((n) => n.kieu === nhomCq)?.nhan}.</div>
          )}
          {cq && phanTrang(dongNhom.length, tCq, setTrangCq)}
        </div>
        <div className="the">
          <h2 data-gt="bc-diem-nong">
            Điểm nóng <span className="phu">code xếp theo nợ quá hạn (điểm × hệ số trễ) · 🤖 viết vì sao nghẽn</span>
            <button className="lk-phai" onClick={() => xemDs(`Điểm nóng tuần ${sl.tuan.so}`, nongCon.map((n) => n.ma))}>Xem cả {nongCon.length} việc bên phải →</button>
          </h2>
          {nongCon.length === 0 && <div className="mo">Không còn điểm nóng nào ngoài mục Cần BLĐ ra quyết định ở trên (việc dễ / rất dễ đã ẩn).</div>}
          {nongCon.slice(tNong * MOI_TRANG, (tNong + 1) * MOI_TRANG).map((n, j) => {
            const i = tNong * MOI_TRANG + j;
            const v = sl.viec[n.ma];
            return hang(
              [n.ma],
              i,
              ai.diem_nong[n.ma] ?? "",
              <span className="tre">quá hạn {n.tre} ngày</span>,
              <>
                {(v?.don ?? []).map(tenDv).join(" + ")} chủ trì{v?.phoi_hop.length ? ` · ${v.phoi_hop.map(tenDv).join(", ")} phối hợp` : ""} · dự án {v?.du_an ?? "—"}
                {la ? ` · độ khó ${diemCua(n.ma)} · nợ ${n.no} điểm` : ""}
              </>,
              true,
            );
          })}
          {phanTrang(nongCon.length, tNong, setTrangNong)}
        </div>
      </>
    );

    // ----- t3 -----
    const hangBd = (ten: string, phan: [number, string, () => void, string][], tong: number, chu: string, bamTen: () => void, lop = "") => (
      <div className={`bd ${lop}`} key={ten}>
        <span className="nhan-bd" onClick={bamTen}>{ten}</span>
        <div className="cot">{phan.map(([n, m, bam, tip], i) => (n ? <i key={i} style={{ width: `${(100 * n) / tong}%`, background: m }} onClick={bam} title={`${tip}: ${n}`} /> : null))}</div>
        <span className="chu so">{chu}</span>
      </div>
    );
    const tongMax = Math.max(...sl.don_vi.map((r) => r.so_mo + r.so_xong + r.moi), 1);
    const maxDa = Math.max(...sl.du_an.map((d) => d.mo.length), 1);
    const T0 = Date.parse(`${sl.tuan.tu}T00:00:00Z`);
    const T1 = Date.parse(`${sl.tuan.den}T00:00:00Z`) + 36 * 36e5; // tới 12:00 thứ Hai tuần sau
    const vt = (iso: string) => Math.max(0, Math.min(100, (100 * (Date.parse(iso.slice(0, 16) + ":00Z") - T0)) / (T1 - T0)));
    const vong = (a: number, b: number) => {
      const r = 20, c = 2 * Math.PI * r;
      return (
        <svg width="54" height="54" viewBox="0 0 54 54">
          <circle cx="27" cy="27" r={r} fill="none" stroke="#E8E5E0" strokeWidth="6" />
          <circle cx="27" cy="27" r={r} fill="none" stroke="#22C55E" strokeWidth="6" strokeDasharray={`${b ? (c * a) / b : 0} ${c}`} transform="rotate(-90 27 27)" />
          <text x="27" y="31" textAnchor="middle" fontSize="12" fontWeight="700" fill="#1a1a1a">{a}/{b}</text>
        </svg>
      );
    };
    const ngayTruc = [0, 2, 4, 6].map((d) => {
      const n = new Date(T0 + d * 864e5).toISOString().slice(0, 10);
      return <span key={d} className="ngay" style={{ left: `${vt(n + "T00:00")}%` }}>{n.slice(8, 10)}/{n.slice(5, 7)}</span>;
    });
    const t3 = (
      <>
        <div className="bon-o" data-gt="bc-o-so">
          <button className="o-so" onClick={() => xemDsThe("xong")} title={khoangNgay(sl.tuan.tu, sl.hom_nay < sl.tuan.den ? sl.hom_nay : sl.tuan.den)}>
            <span className="nhan">Xong</span><span className="lon so">{sl.the.xong}</span><span className="phu">{khoangNgay(sl.tuan.tu, sl.hom_nay < sl.tuan.den ? sl.hom_nay : sl.tuan.den)}</span>
          </button>
          <button className="o-so" onClick={() => xemDsThe("moi")}><span className="nhan">Mới</span><span className="lon so">{sl.the.moi}</span><span className="phu">không tính việc đã hủy</span></button>
          <button className="o-so" onClick={() => xemDsThe("dang_mo")}><span className="nhan">Đang mở</span><span className="lon so">{sl.the.dang_mo}</span><span className="phu"><span className="tre">{sl.the.qua_han} quá hạn</span> · {sl.the.dang_mo ? Math.round((100 * sl.the.qua_han) / sl.the.dang_mo) : 0}%</span></button>
          <button className="o-so" onClick={() => document.getElementById("bct-nop")?.scrollIntoView({ behavior: "smooth" })}><span className="nhan">Nộp báo cáo</span><span className="lon so">{sl.the.nop}/{sl.the.tong_don_vi}</span><span className="phu">đơn vị</span></button>
        </div>
        <div className="hai-cot">
          <div className="the">
            <h2 data-gt="bc-the-don-vi">Đơn vị <span className="phu">số việc · bấm thanh màu để xem đúng nhóm việc</span></h2>
            <div className="chu-giai"><span><i style={{ background: "var(--mau-trong-han)" }} />trong hạn</span><span><i style={{ background: "var(--p-danger)" }} />quá hạn</span><span><i style={{ background: "#22C55E" }} />xong tuần</span><span><i style={{ background: "#A8A29E" }} />mới tuần</span></div>
            {sl.don_vi.filter((r) => r.so_mo + r.so_xong + r.moi).map((r) =>
              hangBd(r.ten, [
                [r.so_mo - r.so_qua_han, "var(--mau-trong-han)", () => xemDonVi(r.ma, "trong_han"), "trong hạn"],
                [r.so_qua_han, "var(--p-danger)", () => xemDonVi(r.ma, "qua_han"), "quá hạn"],
                [r.so_xong, "#22C55E", () => xemDonVi(r.ma, "xong"), "xong tuần"],
                [r.moi, "#A8A29E", () => xemDonVi(r.ma, "moi"), "mới tuần"],
              ], tongMax, `${r.so_mo} mở · ${r.so_qua_han} trễ · ${r.so_xong} xong · ${r.moi} mới`, () => xemDonVi(r.ma)),
            )}
          </div>
          <div className="the">
            <h2 data-gt="bc-the-du-an">Dự án SCI đầu tư <span className="phu">việc đang mở · dự án chưa có việc không hiện · bấm để xem</span></h2>
            <div className="chu-giai"><span><i style={{ background: "var(--mau-trong-han)" }} />trong hạn</span><span><i style={{ background: "var(--p-danger)" }} />quá hạn</span></div>
            {sl.du_an.map((d) => {
              const trong = d.mo.filter((m) => !d.qua_han.includes(m));
              return hangBd(d.ten, [
                [trong.length, "var(--mau-trong-han)", () => xemDs(`Dự án ${d.ten} · trong hạn`, trong), "trong hạn"],
                [d.qua_han.length, "var(--p-danger)", () => xemDs(`Dự án ${d.ten} · quá hạn`, d.qua_han), "quá hạn"],
              ], maxDa, `${d.mo.length} mở · ${d.qua_han.length} trễ`, () => xemDs(`Dự án ${d.ten}`, [{ ten: "Quá hạn", ma: d.qua_han }, { ten: "Trong hạn", ma: trong }]), "hep");
            })}
          </div>
        </div>
        <div className="the" id="bct-nop">
          <h2 data-gt="bc-thoi-diem">Thời điểm gửi báo cáo <span className="phu">số trong nút = số đơn vị nộp cùng lúc, đặt theo giờ nộp · rê chuột xem tên + giờ · vạch đỏ = hạn của cấp (Cài đặt) · bấm chấm / tên chưa nộp để xem bên phải</span></h2>
          <div className="chu-giai"><span><i style={{ background: "#22C55E", borderRadius: "50%" }} />nộp trước hạn</span><span><i style={{ background: "var(--p-danger)", borderRadius: "50%" }} />nộp sau hạn</span><span><i style={{ background: "var(--p-surface2)", border: "1px solid var(--p-line2)" }} />chưa nộp</span></div>
          {sl.nop.map((c) => {
            const da = c.don_vi.filter((d) => d.nop);
            const chua = c.don_vi.filter((d) => !d.nop);
            const han = vt(c.han);
            return (
              <div className="nop" key={c.cap}>
                <div className="ten-cap">{TEN_CAP[c.cap]?.[0]}<span>{TEN_CAP[c.cap]?.[1]}</span></div>
                {vong(da.length, c.don_vi.length)}
                <div>
                  <TrucNop
                    cham={da.map((d) => ({ id: d.id, ten: d.ten, luc: d.nop!.luc, tre: (d.truoc_han_gio ?? 0) < 0, x: vt(d.nop!.luc) }))}
                    chon={(id) => setPhai({ kieu: "bc", dv: id })}
                  >
                    <div className="nen" />
                    {ngayTruc}
                    <span className="han" style={{ left: `${han}%` }}><em className={han > 85 ? "trai" : ""}>hạn {c.han.slice(11, 16)}</em></span>
                  </TrucNop>
                  {chua.length > 0 && (
                    <div className="chua-nop">
                      <span className="mo nho" style={{ marginRight: 2 }}>chưa nộp:</span>
                      {chua.map((d) => <button key={d.id} onClick={() => xemDonVi(d.id)} title="Xem việc của đơn vị">{d.ten}</button>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );

    // ----- t4 (chỉ BLĐ) -----
    const moKhong = Object.entries(sl.viec).filter(([, v]) => !v.xong_ngay);
    const xemKho = (dv: string, muc?: number) => {
      const ds = moKhong.filter(([m, v]) => (!dv || v.don.includes(dv)) && (!muc || diemCua(m) === muc)).map(([m]) => m);
      xemDs(`${dv ? tenDv(dv) : "Toàn công ty"}${muc ? ` · ${MUC.find((x) => x[0] === muc)?.[1]}` : ""} · độ khó`, MUC.map(([d, t]) => ({ ten: `🤖 ${t} · ${d} điểm`, ma: ds.filter((m) => diemCua(m) === d) })), "", true);
    };
    const demMuc = MUC.map(([d, t, m]) => [d, t, m, moKhong.filter(([ma]) => diemCua(ma) === d).length] as const);
    const maxMuc = Math.max(...demMuc.map((x) => x[3]), 1);
    const t4 = la && (
      <>
        <div className="the">
          <h2>🤖 Độ khó việc đang mở theo đơn vị <span className="phu">bấm một khúc màu: xem việc đúng mức đó, sửa điểm ngay tại đó</span></h2>
          <div className="chu-giai">{MUC.map(([d, t, m]) => <span key={d}><i style={{ background: m, border: "1px solid #d6d3d1" }} />{t} · {d}</span>)}</div>
          {sl.don_vi.filter((r) => r.so_mo).map((r) => {
            const ds = moKhong.filter(([, v]) => v.don.includes(r.ma));
            const tong = ds.reduce((n, [m]) => n + diemCua(m), 0) || 1;
            return (
              <div className="bd" key={r.ma}>
                <span className="nhan-bd" onClick={() => xemKho(r.ma)}>{r.ten}</span>
                <div className="chong">
                  {MUC.map(([d, t, m]) => {
                    const s = ds.filter(([ma]) => diemCua(ma) === d);
                    const p = s.length * d;
                    return p ? <i key={d} style={{ width: `${(100 * p) / tong}%`, background: m }} title={`${t}: ${s.length} việc · ${p} điểm`} onClick={() => xemKho(r.ma, d)} /> : null;
                  })}
                </div>
                <span className="chu so">{tong} điểm · {ds.length} việc</span>
              </div>
            );
          })}
        </div>
        <div className="the">
          <h2>Phân bố mức khó toàn công ty <span className="phu">số việc đang mở ở mỗi mức</span></h2>
          {demMuc.map(([d, t, m, n]) => (
            <div className="bd hep" key={d}>
              <span className="nhan-bd" onClick={() => xemKho("", d)}>{t} · {d} điểm</span>
              <div className="cot"><i style={{ width: `${(100 * n) / maxMuc}%`, background: m }} onClick={() => xemKho("", d)} /></div>
              <span className="chu so">{n} việc</span>
            </div>
          ))}
        </div>
      </>
    );
    bieuDoKho = t4 || null;
    than = tab === "t1" ? t1 : tab === "t2" ? t2 : t3;
  }

  // ================== CỘT PHẢI ==================
  let phaiNd: React.ReactNode = null;
  const dongViec = (ma: string, kho?: boolean) => {
    const v = V[ma];
    if (!v) return <div key={ma} className="viec-mat">{tenViec(ma, 80)} — không còn trong sổ cái (đã xoá theo hạn lưu)</div>;
    return (
      <div key={ma}>
        {kho && la && (
          <div className="kho-dong">
            <select
              value={diemCua(ma)}
              onChange={(e) =>
                void goiApi("/api/bao-cao-tuan/do-kho", { method: "PUT", body: { cong_viec_id: ma, diem: Number(e.target.value) } })
                  .then(() => taiBc())
                  .then(() => bao(`Đã sửa độ khó ${tenViec(ma, 40)} (người sửa thắng AI)`))
                  .catch((er) => bao(er instanceof Error ? er.message : String(er)))
              }
            >
              {MUC.map(([d, t]) => <option key={d} value={d}>🤖 {t} · {d}</option>)}
            </select>
            <span>{bc.do_kho[ma]?.nguon === "nguoi" ? "Ban lãnh đạo đã sửa" : bc.do_kho[ma]?.ly_do ? `🤖 ${bc.do_kho[ma].ly_do}` : "🤖 chưa chấm"}</span>
          </div>
        )}
        <DongViec
          v={v}
          mo={mo === ma}
          moi={false}
          homNay={dl.hom_nay}
          tenNgan={tenNgan}
          donVi={noiGiaoDichDanh(dl.o, dl.lanh_dao)}
          giaoDuoc={(dl.giao_duoc_bao_cao ?? dl.giao_duoc)}
          bat={() => setMo((m) => (m === ma ? "" : ma))}
          moGoc={() => setBcGoc(v)}
          sauThaoTac={async (chu) => {
            bao(chu);
            await taiViec();
          }}
          roi={() => undefined}
        />
      </div>
    );
  };
  if (phai?.kieu === "ds") {
    const tong = phai.nhom.reduce((n, g) => n + g.ma.length, 0);
    phaiNd = (
      <>
        <div className="phai-dau" data-gt="bc-phai"><b>{phai.tieu}</b> · {tong} việc</div>
        {tong === 0 && <div className="trong">Không có việc nào.</div>}
        {phai.nhom.map((g) =>
          g.ma.length ? (
            <div key={g.ten || "ds"}>
              {g.ten && <div className="nhom-viec"><span>{g.ten}</span><span>{g.ma.length}</span></div>}
              {g.ma.map((m) => dongViec(m, phai.kho))}
            </div>
          ) : null,
        )}
      </>
    );
  } else if (phai?.kieu === "dokho" && bieuDoKho) {
    phaiNd = (
      <>
        <div className="phai-dau"><b>🤖 Độ khó từng việc do AI chấm</b> · chỉ Ban lãnh đạo thấy</div>
        <div className="bct khoi-kho">{bieuDoKho}</div>
      </>
    );
  } else if (phai?.kieu === "giao") {
    const ma = phai.ma;
    const dv = sl?.viec[ma]?.don.find((d) => d !== "bld") ?? goc;
    phaiNd = (
      <GiaoViec
        key={ma}
        id={dv}
        laGoc={dv === goc}
        tenDu={tenDv(dv)}
        lanhDao={dl.lanh_dao}
        homNay={dl.hom_nay}
        dsDuAn={dl.du_an}
        giaoDuoc={(dl.giao_duoc_bao_cao ?? dl.giao_duoc)}
        toiDonVi={toi?.don_vi_ids}
        nguoi={dl.nguoi}
        dsNoiGiao={noiGiao}
        tenMacDinh={`Xử lý dứt điểm: ${(V[ma]?.ten ?? sl?.viec[ma]?.ten ?? "").slice(0, 80)}`}
        xong={async (moi) => {
          await ghiThaoTac(ma, "giao", moi).catch(() => undefined);
          await taiViec();
          bao(`Đã giao việc ${moi} (từ ${ma})`);
          void taiLaiToi();
          xemDs(tenViec(moi, 40), [moi], moi);
        }}
      />
    );
  } else if (phai?.kieu === "giao_kn") {
    const p = phai;
    phaiNd = (
      <GiaoViec
        key={p.khoa}
        id={p.dv}
        laGoc={p.dv === goc}
        tenDu={tenDv(p.dv)}
        lanhDao={dl.lanh_dao}
        homNay={dl.hom_nay}
        dsDuAn={dl.du_an}
        giaoDuoc={(dl.giao_duoc_bao_cao ?? dl.giao_duoc)}
        toiDonVi={toi?.don_vi_ids}
        nguoi={dl.nguoi}
        dsNoiGiao={noiGiao}
        tenMacDinh={p.ten.slice(0, 200)}
        xong={async (moi) => {
          await goiApi("/api/bao-cao-tuan/can-quyet", { body: { khoa: p.khoa, cong_viec_id: moi } }).catch(() => undefined);
          await Promise.all([taiViec(), taiCq()]);
          bao(`Đã giao việc ${moi} từ kiến nghị`);
          void taiLaiToi();
          xemDs(tenViec(moi, 40), [moi], moi);
        }}
      />
    );
  } else if (phai?.kieu === "bc" && sl) {
    const dvNop = sl.nop.flatMap((c) => c.don_vi.map((d) => ({ ...d, han: c.han }))).find((d) => d.id === phai.dv);
    const r = sl.don_vi.find((x) => x.ma === phai.dv);
    const cuaBc = Object.entries(sl.viec).filter(([, v]) => v.nguon && v.nguon.includes(`tuần ${sl.tuan.so}`) && (v.nguon.startsWith(tenDv(phai.dv)) || v.don.includes(phai.dv))).map(([m]) => m);
    phaiNd = (
      <>
        <div className="phai-dau"><b>Báo cáo tuần {sl.tuan.so} · {dvNop?.ten ?? tenDv(phai.dv)}</b></div>
        {dvNop?.nop && (
          <div className="khoi-bc" data-gt="bc-bao-cao-dv">
            <div className="nw">
              Nộp <b>{dvNop.nop.luc.slice(11, 16)} {ngayVN(dvNop.nop.luc.slice(0, 10))}</b> · hạn {dvNop.han.slice(11, 16)} {ngayVN(dvNop.han.slice(0, 10))} ·{" "}
              {(dvNop.truoc_han_gio ?? 0) >= 0 ? <span style={{ color: "var(--p-ok)", fontWeight: 600 }}>trước hạn {ngayGio(dvNop.truoc_han_gio ?? 0)}</span> : <span className="do">sau hạn {ngayGio(-(dvNop.truoc_han_gio ?? 0))}</span>}
              {dvNop.nop.so_lan > 1 ? ` · gửi ${dvNop.nop.so_lan} lần` : ""}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="nut chinh"
                title="Mở báo cáo gốc — khung cam là các dòng máy lọc ra việc"
                onClick={() => moXemTep(dvNop.nop!.tai_lieu_id, `Báo cáo tuần ${sl.tuan.so} · ${dvNop.ten}`, "tai_lieu", cuaBc.map((m) => V[m]?.ten ?? sl.viec[m]?.ten))}
              >
                Xem file báo cáo
              </button>
              {r && <button className="nut" onClick={() => xemDonVi(phai.dv)}>Mọi việc của {r.ten}</button>}
            </div>
          </div>
        )}
        <div className="nhom-viec"><span>Việc lọc ra từ báo cáo này</span><span>{cuaBc.length}</span></div>
        {cuaBc.length ? cuaBc.map((m) => dongViec(m)) : <div className="trong">Không có việc nào.</div>}
      </>
    );
  }

  const meta = ban
    ? `🤖 AI viết ${ban.xong_luc ? gioPhut(ban.xong_luc) : "…"}${ban.model ? ` · ${ban.model}` : ""} · ${ban.cap1_da_nop ? "sau khi Ban TGĐ nộp báo cáo tuần" : "cấp 1 chưa nộp"}${sl && sl.hom_nay < sl.tuan.den ? ` · số chốt tới ${ngayVN(sl.hom_nay)}` : ""}`
    : "";
  return (
    <div className="so-do" ref={keo.khungRef} style={keo.kieuKhung}>
      <section className="san bct">
        <div className="bct-dau">
          <h1 data-gt="bc-dau">Báo cáo tuần {ban?.tuan_so ?? ""}</h1>
          {ban && <span>{nhanTuanGon(ban.tuan_tu, ban.tuan_den)}</span>}
          <span className="meta" title={meta}>{meta}</span>
          {bc.co_the_viet_lai && ban && ban.trang_thai !== "dang_viet" && (
            <button className="nut-chu" onClick={() => void vietLai()} title="🤖 AI viết lại báo cáo tuần này từ số liệu mới nhất">Viết lại</button>
          )}
        </div>
        {sl && ai && (
          <div className="day-nut bct-tab">
            <button className="nut-san nut-loc" data-gt="bc-tab-ai" aria-pressed={tab === "t1"} onClick={() => setTab("t1")}>🤖 AI đánh giá</button>
            <button className="nut-san nut-loc" data-gt="bc-tab-quyet" aria-pressed={tab === "t2"} onClick={() => setTab("t2")}>Cần BLĐ ra quyết định</button>
            <button className="nut-san nut-loc" data-gt="bc-tab-so-lieu" aria-pressed={tab === "t3"} onClick={() => setTab("t3")}>Số liệu tuần qua</button>
          </div>
        )}
        {sl && ai && <KhaiHuongDan ma={tab === "t1" ? "bct-tab-ai" : tab === "t2" ? "bct-tab-quyet" : "bct-tab-so-lieu"} />}
        <div className="bct-than">{than}</div>
      </section>
      {keo.vach}
      <section className="phai">
        {(phai?.kieu === "giao" || phai?.kieu === "giao_kn") && <KhaiHuongDan ma="bct-giao-viec" uuTien={2} />}
        {(phai?.kieu === "dokho" || (phai?.kieu === "ds" && phai.kho)) && <KhaiHuongDan ma="bct-do-kho" uuTien={2} />}
        {phai?.kieu === "bc" && <KhaiHuongDan ma="bct-bao-cao-don-vi" />}
        <div className="vao">{phaiNd}</div>
      </section>
      {bcGoc && <HopBaoCaoGoc v={bcGoc} dong={() => setBcGoc(null)} />}
      {goi && <div className="goi-y-bct" style={{ left: goi.x, top: goi.y }}>{goi.nd}</div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

