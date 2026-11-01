"use client";
// ============================================================
// MÀN "VIỆC CỦA TÔI" của agent Công việc (đợt ⑤, Mr. Đại chốt 06/10/2026 "Ca": menu riêng trên thanh trên, hai nửa như Main —
// bộ nhớ "viec-cua-toi-hai-nua" + "khuon-giao-viec-ai-04-10").
//   TRÁI : issue cần giao việc MỚI mà tôi giao được (thẻ nhắc không tính — Q4) — ô chữ + chọn người NGOÀI ô + Giao việc · Sửa · Bỏ qua.
//          Cùng nháp máy soạn với khối dưới thẻ Issue và cửa base.viec_cho_duyet của Main (lib/cay-viec/issue/nhap-thuan.ts).
//   PHẢI : 3 nút Việc tôi giao · Việc tôi nhận · Việc cần phối hợp + danh sách (chia 30 dòng/trang — E40); bấm việc → thẻ việc ở Sơ đồ.
//          Bấm Sửa ở trái → nửa phải ẩn danh sách, hiện ô giao việc giống "+" (OGiaoSua); Giao xong / Huỷ → về danh sách.
// Giao / Bỏ qua đi qua POST /api/cay-viec/issue — MỘT lõi giao (quyền · hạn · hỏi trùng Luật 33).
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TheViecNhung } from "@/components/phong/TheViecNhung";
import { goiApi } from "@/components/layout/giao-dien";
import { taiLaiToi } from "@/components/layout/dung-toi";
import { khoangNgay, ngayVN } from "@/lib/phong/tuan";
import { useKeoGiua } from "@/components/phong/KeoGiua";
import { useCaiDatDinhKem, useKepTep } from "@/components/dinh-kem/DinhKem";
import { OChonNoiNhan, type NguoiNhanCV } from "@/components/cay-viec/OChonNoiNhan";
import { OGiaoSua } from "@/components/cay-viec/OGiaoSua";
import { NUT_CHINH, NUT_VIEN } from "@/components/cay-viec/issue/chung";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
// Khu phải cùng khuôn Main · Tiến độ · Hợp đồng (bản chép, khối sáng cố định — kế hoạch 09 Phiên 5, V6)
import "./phai-viec.css";

interface DongCho {
  id: string;
  du_an: { id: string; ma: string; ten: string };
  tu_issue: { ma: string; tieu_de: string };
  ten: string;
  ket_qua_can_co: string;
  han: string;
  giao_cho_goi_y: { id: string } | null;
  can_cu_ai: string | null;
  muc_do: string;
  ten_wbs: string | null;
  /** Nguồn (Mr. Đại chốt 07/10): nút găng chưa giao ở Cây việc & đường găng · hay issue — tổng phải khớp từng nguồn */
  nguon_viec?: "cay-viec" | "issue";
  /** ISO lúc máy soạn (ngày mở issue) — "Mới soạn trước" */
  luc?: string;
  tren_duong_gang?: boolean;
}
interface DongViec {
  ma_viec_base: string;
  ten: string;
  du_an: string | null;
  han: string | null;
  qua_han_ngay: number | null;
  chu_tri: string | null;
  nguoi_giao: string | null;
  duong_mo: string;
  /** Tình trạng + chữ tình trạng, dấu ! găng, nhóm đơn vị — cùng lõi base.viec_cua_toi mà Main đọc */
  tt?: string;
  tt_chu?: string;
  gang?: boolean;
  nhom?: string;
  nhom_thu_tu?: number;
}
interface DuLieu {
  hom_nay: string;
  co_quyen_giao: boolean;
  cho_duyet: DongCho[];
  noi_nhan: NguoiNhanCV | null;
  viec: {
    viec_giao: DongViec[];
    viec_nhan: DongViec[];
    viec_phoi_hop: DongViec[];
    dem: Record<"giao" | "nhan" | "phoi_hop", number>;
    lam_xong?: { nhan: string; giai_thich: string; viec_giao: DongViec[]; viec_nhan: DongViec[]; viec_phoi_hop: DongViec[] };
  };
}
type Tep = { id: string; ten: string; kich_thuoc: number };
interface Nhap {
  /** "nguoi|id" | "don_vi|id" | "" */
  giaoCho: string;
  canCu: string;
  ten: string;
  han: string;
  kq: string;
  tep: Tep[];
}
type Loai = "giao" | "nhan" | "phoi_hop";

// ── KHUNG TRÁI THEO KHUÔN 4 AGENT (Mr. Đại chốt 08/10/2026 "đồng bộ cho giống nhau") — chép từ Main components/tabs/viec/ViecView.tsx
//    (luật 7): một dòng tiêu đề · [Tải lại][Dự án][Lọc] · luôn đúng 2 thẻ (màn rộng thẻ cao ½ khung) · ← Trước · Trang x/y · Sau →
type LocNhap = "moi" | "gap" | "gang" | "do" | "chua-nguoi" | "han-7";
const LUA_CHON_LOC_NHAP: { kieu: LocNhap; nhan: string }[] = [
  { kieu: "moi", nhan: "Mới soạn trước" },
  { kieu: "gap", nhan: "Gấp nhất trước" },
  { kieu: "gang", nhan: "Việc trên đường găng" },
  { kieu: "do", nhan: "Việc nghiêm trọng" },
  { kieu: "chua-nguoi", nhan: "Chưa có người nhận" },
  { kieu: "han-7", nhan: "Hạn trong 7 ngày" },
];
const CAO_THE_TRAI = 204; // px — màn hẹp (điện thoại)
const MOI_TRANG_TRAI = 2;
const congNgayIso = (iso: string, n: number) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const NUT_LOAI: { loai: Loai; nhan: string; khoa: "viec_giao" | "viec_nhan" | "viec_phoi_hop" }[] = [
  { loai: "giao", nhan: "Việc tôi giao", khoa: "viec_giao" },
  { loai: "nhan", nhan: "Việc tôi nhận", khoa: "viec_nhan" },
  { loai: "phoi_hop", nhan: "Việc cần phối hợp", khoa: "viec_phoi_hop" },
];

/** Bỏ dấu để tìm (như ô tìm Sơ đồ) */
const boDauTim = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Nhóm theo đơn vị như khu phải Sơ đồ — CÙNG hàm nhomViec của Main (components/tabs/viec/ViecView.tsx) */
function nhomViec(ds: DongViec[]): { ten: string; thuTu: number; ds: DongViec[] }[] {
  const m = new Map<string, { ten: string; thuTu: number; ds: DongViec[] }>();
  for (const v of ds) {
    const k = v.nhom ?? "";
    if (!m.has(k)) m.set(k, { ten: k, thuTu: v.nhom_thu_tu ?? 0, ds: [] });
    m.get(k)!.ds.push(v);
  }
  const hanX = (v: DongViec) => v.han ?? "9999";
  for (const g of Array.from(m.values())) g.ds.sort((a, b) => Number(a.tt === "thuong-xuyen") - Number(b.tt === "thuong-xuyen") || hanX(a).localeCompare(hanX(b)));
  return Array.from(m.values()).sort((a, b) => a.thuTu - b.thuTu);
}

/** Một dòng việc — khuôn .muc-viec: › · ! găng · tên (tối đa 2 dòng) · tình trạng bên phải (chép DongViec của Main) */
function HangViec({ v, onMo }: { v: DongViec; onMo: () => void }) {
  const tt = v.tt ?? (v.qua_han_ngay ? "tre" : "con");
  const chu = v.tt_chu ?? (v.qua_han_ngay ? `quá hạn ${v.qua_han_ngay} ngày` : v.han ? `hạn ${ngayVN(v.han)}` : "");
  return (
    <div className={`muc-viec${tt === "xong" ? " da-xong" : ""}`}>
      <button type="button" className="dau-viec" onClick={onMo} data-gt="vct:viec" title={`${v.ma_viec_base} — bấm để xem chi tiết ngay tại chỗ`}>
        <span className="mui">›</span>
        <span className="t">
          {v.gang && (
            <span className="dau-moi" title="Việc chưa xong nằm trên đường găng — trễ việc này là lùi ngày COD">
              !
            </span>
          )}
          {v.ten}
        </span>
        <span className={`r tt-${tt}`}>{chu}</span>
      </button>
    </div>
  );
}

/** Mã gợi ý → "loai|id" theo danh sách nơi nhận (chỉ nơi mình giao được) */
function giaoChoTu(ds: NguoiNhanCV | null, id: string | undefined): string {
  if (!ds || !id) return "";
  if (ds.nguoi.some((x) => x.id === id)) return `nguoi|${id}`;
  if (ds.don_vi.some((x) => x.id === id)) return `don_vi|${id}`;
  return "";
}
function tenNhan(ds: NguoiNhanCV | null, giaoCho: string): string {
  const [loai, ma] = giaoCho.split("|");
  if (!ma) return "";
  return (loai === "don_vi" ? ds?.don_vi.find((x) => x.id === ma)?.ten : ds?.nguoi.find((x) => x.id === ma)?.ten) ?? ma;
}
// Không gửi việc có hạn đã qua (Mr. Đại chốt 04/10 tối) — cùng câu với khối dưới thẻ Issue
const thieuCua = (n: Nhap, homNay: string) =>
  !n.ten.trim() ? "Chưa có nội dung việc" : !n.giaoCho ? "Chưa chọn người nhận" : !n.han ? "Chưa có hạn" : n.han < homNay ? "Hạn đã qua — bấm Sửa chọn hạn mới" : "";

export function ViecCuaToiView() {
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState("");
  const [nhap, setNhap] = useState<Record<string, Nhap>>({});
  const [loai, setLoai] = useState<Loai>("nhan");
  const [sua, setSua] = useState<string | null>(null);
  const [dang, setDang] = useState<string | null>(null);
  const [tin, setTin] = useState<Record<string, { ok: boolean; chu: string }>>({});
  const [trung, setTrung] = useState<Record<string, string>>({});
  /** Việc đang bung tại chỗ ở khung phải (Mr. Đại chốt 08/10/2026 — như Việc của tôi 4 agent, không chuyển sang Sơ đồ) */
  const [moViec, setMoViec] = useState<string | null>(null);
  /** Ô tìm cạnh 3 nút + nhóm đang mở khối "Việc làm xong" (khuôn Main) */
  const [tim, setTim] = useState("");
  const [moXong, setMoXong] = useState<Set<string>>(new Set());
  // Khung trái (khuôn 4 agent)
  const [locDuAn, setLocDuAn] = useState("");
  const [locNhap, setLocNhap] = useState<LocNhap>("moi");
  const [trangTrai, setTrangTrai] = useState(0);
  const [caoThe, setCaoThe] = useState(CAO_THE_TRAI);
  const khungTrai = useRef<HTMLDivElement>(null);
  const keo = useKeoGiua("viec-cua-toi");

  const tai = useCallback(async () => {
    setLoi("");
    try {
      const d = await goiApi<DuLieu>("/api/viec-cua-toi");
      setDl(d);
      // Giữ phần người đã sửa; nháp mới lấy từ máy chủ
      setNhap((cu) =>
        Object.fromEntries(
          d.cho_duyet.map((c) => [
            c.id,
            cu[c.id] ?? { giaoCho: giaoChoTu(d.noi_nhan, c.giao_cho_goi_y?.id), canCu: c.can_cu_ai ?? "", ten: c.ten, han: c.han, kq: c.ket_qua_can_co, tep: [] },
          ]),
        ),
      );
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không đọc được việc của tôi.");
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);
  // Mở màn Việc của tôi = đã thấy việc mới → nút Việc của tôi trên thanh trên hết phát sáng (Mr. Đại chốt 08/10)
  useEffect(() => {
    void goiApi("/api/viec-cua-toi/da-xem", { method: "POST" })
      .then(() => taiLaiToi())
      .catch(() => undefined);
  }, []);
  // Luôn 2 thẻ — màn rộng mỗi thẻ cao ½ khung (phóng to/thu nhỏ vẫn đúng 2 thẻ), màn hẹp cao cố định (như Main)
  useLayoutEffect(() => {
    const k = khungTrai.current;
    if (!k) return;
    const rong = window.matchMedia("(min-width: 1024px)");
    const tinh = () => setCaoThe(rong.matches ? Math.max(150, Math.floor(k.clientHeight / MOI_TRANG_TRAI)) : CAO_THE_TRAI);
    tinh();
    const ro = new ResizeObserver(tinh);
    ro.observe(k);
    rong.addEventListener("change", tinh);
    return () => {
      ro.disconnect();
      rong.removeEventListener("change", tinh);
    };
  }, [dl]);

  // Thẻ việc bung tại chỗ báo qua postMessage (cùng cách khi nhúng ở agent khác): thu lại · đã đổi → tải lại danh sách
  useEffect(() => {
    const nghe = (e: MessageEvent) => {
      const d = e.data as { loai?: string; ma?: string } | null;
      if (!d || !d.ma) return;
      if (d.loai === "sci-viec-dong") setMoViec((m) => (m === d.ma ? null : m));
      else if (d.loai === "sci-viec-doi") void tai();
    };
    window.addEventListener("message", nghe);
    return () => window.removeEventListener("message", nghe);
  }, [tai]);

  const datNhap = useCallback((id: string, f: (n: Nhap) => Partial<Nhap>) => setNhap((cu) => (cu[id] ? { ...cu, [id]: { ...cu[id], ...f(cu[id]) } } : cu)), []);
  const baoTin = (id: string, ok: boolean, chu: string) => setTin((t) => ({ ...t, [id]: { ok, chu } }));

  /** Gửi lên lõi giao của màn Issue — người bấm mới tạo việc trong sổ cái */
  const giao = async (c: DongCho, vanSoan = false): Promise<boolean> => {
    const n = nhap[c.id];
    if (!n) return false;
    setDang(c.id);
    setTrung((t) => ({ ...t, [c.id]: "" }));
    try {
      const r = await goiApi<{ ok: boolean; trung?: string; thong_diep?: string }>("/api/cay-viec/issue", {
        body: {
          du_an: c.du_an.id,
          id: c.tu_issue.ma,
          hanhDong: "giao-viec",
          giao_cho: n.giaoCho,
          han: n.han,
          ten: n.ten,
          ket_qua_can_co: n.kq,
          ten_wbs: c.ten_wbs ?? undefined,
          can_cu: n.canCu || undefined,
          dinh_kem: n.tep.map((x) => x.id),
          ...(vanSoan ? { van_soan: true } : {}),
        },
      });
      if (r.trung) {
        setTrung((t) => ({ ...t, [c.id]: r.trung! }));
        return false;
      }
      baoTin(c.id, true, r.thong_diep ?? "Đã giao việc.");
      await tai();
      return true;
    } catch (e) {
      baoTin(c.id, false, e instanceof Error ? e.message : "Chưa giao được.");
      return false;
    } finally {
      setDang(null);
    }
  };
  const boQua = async (c: DongCho) => {
    setDang(c.id);
    try {
      await goiApi("/api/cay-viec/issue", { body: { du_an: c.du_an.id, id: c.tu_issue.ma, hanhDong: "khong-can-giao" } });
      if (sua === c.id) setSua(null);
      await tai();
    } catch (e) {
      baoTin(c.id, false, e instanceof Error ? e.message : "Chưa bỏ qua được.");
    } finally {
      setDang(null);
    }
  };

  // Khung trái: ô Dự án + ô Lọc (2 cách xếp + 4 bộ lọc — chép Main 07/10; "Hạn trong 7 ngày" = hôm nay → hôm nay + 7)
  const dsDuAn = useMemo(
    () => Array.from(new Map((dl?.cho_duyet ?? []).map((c) => [c.du_an.ma, c.du_an.ten] as const)).entries()).sort((a, b) => a[0].localeCompare(b[0])),
    [dl],
  );
  const dsTrai = useMemo(() => {
    if (!dl) return [];
    const homNay = dl.hom_nay;
    const sau7 = congNgayIso(homNay, 7);
    const hanXep = (c: DongCho) => nhap[c.id]?.han || c.han || "9999";
    const qua = (c: DongCho): boolean => {
      const h = hanXep(c);
      switch (locNhap) {
        case "gang":
          return !!c.tren_duong_gang || c.nguon_viec === "cay-viec";
        case "do":
          return c.muc_do === "red";
        case "chua-nguoi":
          return !nhap[c.id]?.giaoCho;
        case "han-7":
          return h !== "9999" && h >= homNay && h <= sau7;
        default:
          return true;
      }
    };
    return dl.cho_duyet
      .filter((c) => (!locDuAn || c.du_an.ma === locDuAn) && qua(c))
      .sort((a, b) => (locNhap === "moi" ? (b.luc ?? "").localeCompare(a.luc ?? "") : hanXep(a).localeCompare(hanXep(b))));
  }, [dl, nhap, locDuAn, locNhap]);
  const soTrangTrai = Math.max(1, Math.ceil(dsTrai.length / MOI_TRANG_TRAI));
  const tt = Math.min(trangTrai, soTrangTrai - 1);

  const khoa = NUT_LOAI.find((x) => x.loai === loai)!.khoa;
  const tuKhoa = boDauTim(tim.trim());
  const khop = (v: DongViec) => !tuKhoa || boDauTim([v.ma_viec_base, v.ten, v.du_an, v.chu_tri, v.nguoi_giao, v.nhom].filter(Boolean).join(" ")).includes(tuKhoa);
  const dsViec = dl ? dl.viec[khoa] : [];
  const nhomMo = nhomViec(dsViec.filter(khop));
  const xongLoc = (dl?.viec.lam_xong?.[khoa] ?? []).filter(khop);
  const nhomXong = new Map(nhomViec(xongLoc).map((x) => [x.ten, x.ds]));
  const nhomPhai = [
    ...nhomMo.map((x) => ({ ...x, xong: nhomXong.get(x.ten) ?? [] })),
    ...nhomViec(xongLoc)
      .filter((x) => !nhomMo.some((y) => y.ten === x.ten))
      .map((x) => ({ ...x, ds: [] as DongViec[], xong: x.ds })),
  ].sort((a, b) => a.thuTu - b.thuTu);
  const hangHoacMo = (v: DongViec) =>
    moViec === v.ma_viec_base ? (
      // Việc đang mở: CHỈ việc này sáng, cả khung phải còn lại thẫm đi (Mr. Đại chốt 09/10). Bấm tiêu đề trong thẻ = thu lại
      <div key={v.ma_viec_base} className="muc-viec mo-ra" data-gt="vct:viec-mo">
        <TheViecNhung ma={v.ma_viec_base} taiCho />
      </div>
    ) : (
      <HangViec key={v.ma_viec_base} v={v} onMo={() => setMoViec(v.ma_viec_base)} />
    );
  const dangSua = sua && dl ? dl.cho_duyet.find((c) => c.id === sua) : undefined;

  return (
    <div className="so-do cay-viec-sang vct thang-chu" ref={keo.khungRef} style={{ ["--rong-phai" as string]: "minmax(380px, 1fr)", ...keo.kieuKhung }}>
      {/* ── TRÁI: việc chờ tôi duyệt giao — khuôn 4 agent (Mr. Đại chốt 08/10/2026) ── */}
      <section className="san vct-trai" data-gt="vct:trai">
        {/* Tiêu đề · số việc · Nguồn — MỘT dòng; bấm tên nguồn mở đúng màn nguồn để đối chiếu */}
        <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap border-b border-border pb-2" data-gt="vct:theo-nguon">
          <b className="shrink-0 text-[13px] text-text">Agent Công việc đề xuất giao việc</b>
          {dl && <span className="shrink-0 text-[11px] text-text-muted">· {dsTrai.length === dl.cho_duyet.length ? `${dsTrai.length} việc` : `${dsTrai.length}/${dl.cho_duyet.length} việc`}</span>}
          {dl && dl.cho_duyet.length > 0 && (
            <span className="truncate text-[11px] text-text-secondary">
              · Nguồn:{" "}
              <a href="/cay-viec" className="hover:underline">
                Cây việc &amp; đường găng {dsTrai.filter((c) => c.nguon_viec === "cay-viec").length}
              </a>{" "}
              ·{" "}
              <a href="/cay-viec/issue" className="hover:underline">
                Cảnh báo {dsTrai.filter((c) => c.nguon_viec !== "cay-viec").length}
              </a>
            </span>
          )}
        </div>
        {/* [Tải lại][Dự án][Lọc] chia đều hết bề ngang — chọn là áp dụng */}
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <button type="button" onClick={() => void tai()} className={`${NUT_VIEN} w-full whitespace-nowrap`} data-gt="vct:tai-lai">
            Tải lại
          </button>
          <select
            className="w-full min-w-0 rounded-sm border border-border bg-transparent px-1.5 text-[12px] text-text"
            value={locDuAn}
            data-gt="vct:loc-du-an"
            title="Lọc theo dự án"
            onChange={(e) => {
              setLocDuAn(e.target.value);
              setTrangTrai(0);
            }}
          >
            <option value="">Mọi dự án</option>
            {dsDuAn.map(([ma, ten]) => (
              <option key={ma} value={ma}>
                {ma} {ten}
              </option>
            ))}
          </select>
          <select
            className="w-full min-w-0 rounded-sm border border-border bg-transparent px-1.5 text-[12px] text-text"
            value={locNhap}
            data-gt="vct:loc-nhap"
            title="Lọc / cách xếp"
            onChange={(e) => {
              setLocNhap(e.target.value as LocNhap);
              setTrangTrai(0);
            }}
          >
            {LUA_CHON_LOC_NHAP.map((l) => (
              <option key={l.kieu} value={l.kieu}>
                {l.nhan}
              </option>
            ))}
          </select>
        </div>
        {loi && <p className="mt-2 text-[12px] text-red">{loi}</p>}
        <div ref={khungTrai} className="ds-nhap min-h-0 flex-1 overflow-hidden">
          {!dl && !loi && <p className="mt-3 text-[12px] text-text-muted">Đang đọc…</p>}
          {dl && !dl.co_quyen_giao && <p className="mt-3 text-[12px] text-text-muted">Bạn không có quyền Giao việc — không có việc chờ duyệt.</p>}
          {dl && dl.co_quyen_giao && dsTrai.length === 0 && <p className="mt-3 text-[12px] text-text-muted">Không có việc soạn sẵn nào đang chờ duyệt.</p>}
          {dl &&
            dsTrai.slice(tt * MOI_TRANG_TRAI, (tt + 1) * MOI_TRANG_TRAI).map((c) => {
              const n = nhap[c.id];
              if (!n) return null;
              const thieu = thieuCua(n, dl.hom_nay);
              const t = tin[c.id];
              const hanQua = !!n.han && n.han < dl.hom_nay;
              return (
                <div key={c.id} className={`the-nhap flex flex-col${sua === c.id ? " dang-sua" : ""}`} style={{ height: caoThe }} data-gt="vct:nhap">
                  {/* Ô trình bày — một khối chữ (khuôn chung chốt 04/10 chiều) */}
                  <div className="o-trinh-bay min-h-0 flex-1 overflow-y-auto text-[11.5px] leading-[17px] text-text-secondary">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${c.muc_do === "red" ? "text-red" : "text-accent"}`}>
                      Máy soạn sẵn từ {c.nguon_viec === "cay-viec" ? "cây việc & đường găng" : "issue"} — chưa gửi đi đâu cả
                    </div>
                    <div className="ten-viec" title={n.ten}>
                      <b>Tên việc:</b> {n.ten}
                    </div>
                    <div className="truncate">
                      <b className="text-text">Giao cho:</b>{" "}
                      {n.giaoCho ? <b className="text-text">{tenNhan(dl.noi_nhan, n.giaoCho)}</b> : <span className="text-text-muted">máy chưa biết ai — chọn ở ô bên dưới</span>}
                      {n.canCu && <i> — 🤖 {n.canCu}</i>}
                    </div>
                    <div className="truncate">
                      <b className="text-text">Hạn:</b> {n.han ? ngayVN(n.han) : "chưa có"}
                      {hanQua && <b className="text-red"> — đã qua, bấm Sửa chọn hạn mới</b>} · <b className="text-text">Thuộc dự án:</b> {c.du_an.ten}
                    </div>
                    <div title={n.kq}>
                      <b className="text-text">Kết quả cần có:</b> {n.kq || "—"}
                    </div>
                    {n.tep.length > 0 && <div>📎 {n.tep.length} file kẹp</div>}
                    <div className="truncate text-text-muted">
                      Nguồn: {c.nguon_viec === "cay-viec" ? `Cây việc & đường găng — ${c.tu_issue.tieu_de}` : `issue ${c.tu_issue.ma} ${c.tu_issue.tieu_de}`}
                      {c.luc ? ` · soạn ${ngayVN(c.luc.slice(0, 10))}` : ""}
                    </div>
                    {trung[c.id] && (
                      <div className="mt-1">
                        🤖 {trung[c.id]}{" "}
                        <button type="button" disabled={!!dang} onClick={() => void giao(c, true)} className={NUT_VIEN}>
                          Vẫn giao việc riêng
                        </button>
                      </div>
                    )}
                    {t && <div className={`mt-1 ${t.ok ? "text-text-secondary" : "text-red"}`}>{t.chu}</div>}
                  </div>
                  {/* Bên ngoài ô: chọn người nhận (máy chọn sẵn, chọn là áp dụng) + Giao việc · Sửa · Bỏ qua */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <OChonNoiNhan className="min-w-0 flex-1" ds={dl.noi_nhan} value={n.giaoCho} onChange={(v) => datNhap(c.id, () => ({ giaoCho: v, canCu: "" }))} giaTri="loai|id" />
                    <button type="button" disabled={!!dang || !!thieu} data-lenh="vct.giao-viec" onClick={() => void giao(c)} className={NUT_CHINH} title={thieu || "Tạo việc thật trong sổ cái"}>
                      {dang === c.id ? "Đang giao…" : "Giao việc"}
                    </button>
                    <button type="button" disabled={!!dang} onClick={() => setSua(c.id)} className={NUT_VIEN} title="Sửa ở nửa bên phải">
                      Sửa
                    </button>
                    <button type="button" disabled={!!dang} data-lenh="vct.bo-qua" onClick={() => void boQua(c)} className={NUT_VIEN} title='Nhớ "không cần giao việc" cho issue này — bỏ đánh dấu được ở màn Issue'>
                      Bỏ qua
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
        {soTrangTrai > 1 && (
          <div className="flex items-center justify-between border-t border-border-light pt-2 text-[11.5px] text-text-muted">
            <button type="button" className={NUT_VIEN} disabled={tt <= 0} onClick={() => setTrangTrai(tt - 1)}>
              ← Trước
            </button>
            <span>
              Trang {tt + 1}/{soTrangTrai} · {dsTrai.length} việc
            </span>
            <button type="button" className={NUT_VIEN} disabled={tt >= soTrangTrai - 1} onClick={() => setTrangTrai(tt + 1)}>
              Sau →
            </button>
          </div>
        )}
      </section>
      {keo.vach}
      {/* ── PHẢI: 3 nút việc của tôi · hoặc ô Sửa. Bấm một việc → thẻ việc (TheViecNhung, đúng thẻ của Sơ đồ) bung NGAY TẠI CHỖ ── */}
      <section className={`phai overflow-auto ${dangSua ? "p-3" : "p-0"}`} data-gt="vct:phai">
        {dangSua && dl ? (
          <KhungSua key={dangSua.id} c={dangSua} dl={dl} n={nhap[dangSua.id]} datNhap={datNhap} trung={trung[dangSua.id]} dang={dang === dangSua.id} giao={(v) => giao(dangSua, v)} dong={() => setSua(null)} />
        ) : (
          // Khuôn khu phải CHUNG 4 agent (Main · Tiến độ · Hợp đồng · 3004 — Mr. Đại 09/10): 3 nút + ô tìm một hàng · nhóm theo đơn vị · dòng việc 14px
          <div className="phai-viec">
            <div className="pv-dau">
              {NUT_LOAI.map((x) => (
                <button
                  key={x.loai}
                  type="button"
                  className="pv-nut"
                  aria-pressed={loai === x.loai}
                  data-gt={`vct:loc-${x.loai}`}
                  onClick={() => {
                    setLoai(x.loai);
                    setMoViec(null);
                  }}
                >
                  {x.nhan} ({dl?.viec.dem[x.loai] ?? 0})
                </button>
              ))}
              <input
                type="search"
                className="pv-tim"
                value={tim}
                onChange={(e) => {
                  setTim(e.target.value);
                  setMoViec(null);
                }}
                placeholder="Tìm mã việc, tên việc, tên người, dự án…"
                aria-label="Tìm việc"
                data-gt="vct:tim"
              />
            </div>
            <div className="pv-ds">
              {dl && nhomPhai.length === 0 && <div className="trong">{tuKhoa ? "Không tìm thấy việc nào." : "Không có việc nào đang mở."}</div>}
              {nhomPhai.map((nh) => (
                <div key={nh.ten || "_"}>
                  {nh.ten && (
                    <div className="nhom-viec" data-gt="nhom-viec">
                      <span>{nh.ten}</span>
                      <span>{nh.ds.length}</span>
                    </div>
                  )}
                  {nh.ds.map(hangHoacMo)}
                  {nh.xong.length > 0 && dl?.viec.lam_xong && (
                    <div className="khoi-xong">
                      <button
                        type="button"
                        className="dong-khoi-xong"
                        data-gt="khoi-viec-lam-xong"
                        aria-expanded={moXong.has(nh.ten)}
                        title={dl.viec.lam_xong.giai_thich}
                        onClick={() =>
                          setMoXong((cu) => {
                            const m = new Set(cu);
                            if (m.has(nh.ten)) m.delete(nh.ten);
                            else m.add(nh.ten);
                            return m;
                          })
                        }
                      >
                        <span>{moXong.has(nh.ten) ? "▾" : "▸"}</span> {dl.viec.lam_xong.nhan}
                        <span className="so">{nh.xong.length}</span>
                      </button>
                      {moXong.has(nh.ten) && nh.xong.map(hangHoacMo)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {dl && dl.viec.dem[loai] > dsViec.length && <div className="pv-ghi">Hiện {dsViec.length}/{dl.viec.dem[loai]} việc mới nhất.</div>}
          </div>
        )}
      </section>
    </div>
  );
}

/** Ô Sửa ở nửa phải — giống dấu "+" (OGiaoSua), cùng bản nháp với ô trái */
function KhungSua({
  c,
  dl,
  n,
  datNhap,
  trung,
  dang,
  giao,
  dong,
}: {
  c: DongCho;
  dl: DuLieu;
  n: Nhap | undefined;
  datNhap: (id: string, f: (n: Nhap) => Partial<Nhap>) => void;
  trung?: string;
  dang: boolean;
  giao: (vanSoan: boolean) => Promise<boolean>;
  dong: () => void;
}) {
  const [dangTaiTep, setDangTaiTep] = useState(false);
  const cdDk = useCaiDatDinhKem();
  const kep = useKepTep({ noi: "giao_viec", cd: cdDk, tep: n?.tep ?? [], setTep: (f) => datNhap(c.id, (x) => ({ tep: f(x.tep) })), dangTai: setDangTaiTep });
  if (!n) return null;
  const dat = (k: "giaoCho" | "ten" | "kq" | "han") => (v: string) => datNhap(c.id, () => (k === "giaoCho" ? { giaoCho: v, canCu: "" } : { [k]: v }));
  const gui = async (vanSoan: boolean) => {
    if (await giao(vanSoan)) dong();
  };
  return (
    <div className="text-[12px]" data-gt="vct:sua">
      <KhaiHuongDan ma="vct-khung-sua" uuTien={2} />
      <div className="mb-2 text-[10.5px] uppercase tracking-wider text-text-muted">
        Issue {c.tu_issue.ma} · {c.tu_issue.tieu_de}
      </div>
      <OGiaoSua
        tieuDe="Đã điền sẵn từ issue — sửa rồi bấm Giao việc"
        ds={dl.noi_nhan}
        tenGoiY={tenNhan(dl.noi_nhan, n.giaoCho)}
        fGiao={n.giaoCho}
        setFGiao={dat("giaoCho")}
        duAnTen={c.du_an.ten}
        fTen={n.ten}
        setFTen={dat("ten")}
        fKq={n.kq}
        setFKq={dat("kq")}
        fHan={n.han}
        setFHan={dat("han")}
        kep={kep}
        homNay={dl.hom_nay}
        thieu={thieuCua(n, dl.hom_nay)}
        dangGui={dang}
        dangTaiTep={dangTaiTep}
        onGiao={() => void gui(false)}
        onHuy={dong}
        lenh="vct.giao-viec"
        gt="vct"
      />
      {trung && (
        <div className="mt-2 text-text-secondary">
          🤖 {trung}
          <div className="mt-1">
            <button type="button" disabled={dang} onClick={() => void gui(true)} className={NUT_VIEN}>
              Vẫn giao việc riêng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
