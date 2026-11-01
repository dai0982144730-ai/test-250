"use client";
// ============================================================
// SoDoPhong — màn SƠ ĐỒ TỔ CHỨC của giao diện căn phòng (Đợt 1, 28/09/2026).
// Thước: 0 Tài liệu thiết kế/demo-agent-cong-viec-pa2-cay.html (vòng 5). Danh mục khối (luật 26):
//   sân: chú giải cấp 1–4 + đã nộp + đã nhắc · nút "Issue · N" · ô khối (📒 báo cáo tuần · giữa = việc · + giao việc)
//        · đường nối (rê = sáng + tín hiệu chạy lên; bấm = soát báo cáo tuần các đơn vị gửi lên) · hộp nhắc nộp giữa sân
//   cột phải: việc của ô (nhóm "Của riêng …" + từng đơn vị con; mở MỘT việc) · báo cáo tuần (← Quay lại khi mở từ soát)
//        · danh sách soát nộp · form giao việc (Ban lãnh đạo chọn 1 trong 8 người)
//   hộp báo cáo gốc giữa màn hình, khoanh cam dòng máy lọc ra việc.
// Đợt 2 (28/09): bình luận + @ trong chi tiết việc (BinhLuanViec). Đợt 3 (Dự án) chưa có ở đây.
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { goiApi } from "@/components/layout/giao-dien";
import { taiLaiToi, useToi } from "@/components/layout/dung-toi";
import { cachNgay, khoangNgay, ngayVN, type TuanBaoCao } from "@/lib/phong/tuan";
import type { BaoCaoTuanO, OSoDo } from "@/lib/phong/so-do";
import { COT, X0, duongNoi, xepSoDo, type BoCuc, type NhomGap } from "./bo-cuc";
import { useKeoGiua } from "./KeoGiua";
import { useNhoTrangThai } from "./nho-trang-thai";
import { IconNutLoc } from "./IconNguoi";
import { LOC_CHUYEN_TIEP, NUT_LOC, PHAM_VI_TIM, boDau, laPhamTim, locChuyenTiep, chuTimViec, khoangViecLamXong, khoangXongCua, locPhamVi, locViec, moiTrongKhoang, noiGiaoDichDanh, nutXong, toiLoc, xepViec, xongMoiTruoc, xongTrongKhoang, type LocToi, type NoiGiao, type PhamViTim, type ViecApi, type ViecO } from "./viec";
import { BinhLuanViec } from "./BinhLuanViec";
import { useCaiDatDinhKem, useKepTep } from "@/components/dinh-kem/DinhKem";
import { oTatCaCua, taoDoiViec } from "./doi-viec";
import { OChonNoiNhan, type NguoiNhanCV } from "@/components/cay-viec/OChonNoiNhan";
import { khoanhDong } from "@/components/dinh-kem/khoanh";
import { GIAI_DOAN, type GiaiDoanViec } from "@/lib/phong/giai-doan-thuan";
import { laNutDuAn, type DuAn } from "@/lib/phong/du-an-thuan";
import ONhapNgay from "@/components/common/ONhapNgay";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import { DsTheoNguoi } from "./DsTheoNguoi";

interface DuLieu {
  tuan: TuanBaoCao;
  o: OSoDo[];
  lanh_dao: { id: string; ten: string; ten_ngan: string }[];
  bao_cao: Record<string, BaoCaoTuanO>;
  nhac: Record<string, { luc: string; nguoi_nhan: string[] }>;
  /** hạn nộp tuần này ("yyyy-mm-ddTHH:MM" giờ VN) · đã quá hạn chưa */
  han_nop: Record<string, string>;
  qua_han_nop: string[];
  hien_don_vi_khong_viec?: boolean;
  /** ô có dòng nhóm bung/gập các ô cấp 3–4 (Mr. Đại chốt 20/10/2026) */
  nhom_gap?: NhomGap[];
  nguoi: { id: string; ten: string; don_vi_id: string | null; don_vi_ids?: string[]; chuc_vu?: string | null }[];
  hom_nay: string;
  giao_duoc?: "tat_ca" | string[];
  du_an: DuAn[];
  giai_doan: Record<string, GiaiDoanViec>;
}
type CheDo = "viec" | "bao-cao" | "giao" | "soat";

const IC_SO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5z" />
    <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3M8 7h7M8 10.5h5" />
  </svg>
);
/** Đơn vị chưa nộp mà đã được nhắc: dấu chấm than đỏ thay quyển sổ (Mr. Đại chốt 28/09). */
const IC_NHAC = (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#DC2626" stroke="#fff" strokeWidth="1.5" />
    <path d="M12 6.5v7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    <circle cx="12" cy="17.4" r="1.5" fill="#fff" />
  </svg>
);
const gio = (luc: string) => {
  const d = new Date(luc);
  return Number.isNaN(d.getTime()) ? luc : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
};

export function SoDoPhong() {
  const sp = useSearchParams();
  const ngay = sp.get("ngay") ?? "";
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [viecApi, setViecApi] = useState<ViecApi[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chon, setChon] = useState<string>("");
  const [cheDo, setCheDo] = useState<CheDo>("viec");
  const [soat, setSoat] = useState("");
  const [roiSoat, setRoiSoat] = useState("");
  const [chiIssue, setChiIssue] = useState(false);
  // Khối "Việc làm xong" cuối mỗi nhóm: mặc định co lại, không nhớ (mỗi tuần chỉ mở khi họp giao ban — Mr. Đại 01/10)
  const [moXong, setMoXong] = useState<Set<string>>(new Set());
  const doiMoXong = (k: string) => setMoXong((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const [mo, setMo] = useState("");
  const [moiGiao, setMoiGiao] = useState<Set<string>>(new Set());
  const [hopNhac, setHopNhac] = useState("");
  const [bcGoc, setBcGoc] = useState<ViecO | null>(null);
  const [toast, setToast] = useState("");
  const [lac, setLac] = useState<{ id: string; n: number } | null>(null);
  const hen = useRef<number>();
  const keo = useKeoGiua("so-do");
  const toi = useToi();
  const [loc, setLoc] = useState<LocToi>("");
  // Hai nút việc ĐÃ HOÀN THÀNH (Mr. Đại chốt 30/09): tuần đang chọn trên thanh trên · 30 ngày gần nhất — chỉ xem, không thao tác
  const [xem, setXem] = useState<"" | "xong_tuan" | "xong_30">("");
  const [xongApi, setXongApi] = useState<ViecApi[] | null>(null);
  // Ô tìm việc + ô phạm vi bên trái nó, ở hàng tiêu đề cột phải (Mr. Đại chốt 30/09): gõ tới đâu lọc tới đó
  const [tim, setTim] = useState("");
  const [pham, setPham] = useState<PhamViTim>("");
  // Chuyển menu rồi quay lại: giữ ô đang chọn, chế độ, bộ lọc, việc đang mở (Mr. Đại chốt 28/09)
  useNhoTrangThai(
    "so-do",
    { chon, cheDo: cheDo === "giao" ? "viec" : cheDo, soat, chiIssue, loc, mo, xem, tim, pham },
    (v) => {
      if (v.chon) setChon(v.chon);
      if (v.cheDo) setCheDo(v.cheDo);
      if (v.soat) setSoat(v.soat);
      if (v.chiIssue) setChiIssue(true);
      if (v.loc && NUT_LOC.some((n) => n.kieu === v.loc)) setLoc(v.loc); // bộ nhớ cũ "toi"/"he-thong" (nút đã bỏ) thì thôi
      if (v.mo) setMo(v.mo);
      if (v.xem === "xong_tuan" || v.xem === "xong_30") setXem(v.xem);
      if (typeof v.tim === "string") setTim(v.tim);
      if (v.pham && [...PHAM_VI_TIM, ...LOC_CHUYEN_TIEP].some((p) => p.kieu === v.pham)) setPham(v.pham);
    },
  );

  const bao = useCallback((s: string) => {
    setToast(s);
    window.clearTimeout(hen.current);
    hen.current = window.setTimeout(() => setToast(""), 4000);
  }, []);

  const taiSoDo = useCallback(async () => {
    try {
      setDl(await goiApi<DuLieu>(`/api/phong/so-do${ngay ? `?ngay=${ngay}` : ""}`));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, [ngay]);
  const taiViec = useCallback(async () => {
    try {
      setViecApi((await goiApi<{ viec: ViecApi[] }>("/api/so-cai")).viec);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void taiSoDo();
  }, [taiSoDo]);
  useEffect(() => {
    void taiViec();
  }, [taiViec]);
  // Việc nằm trên đường găng → dấu "!" đỏ trước tên, như màn Dự án (Mr. Đại chốt 05/10). Nạp riêng — chậm hơn sổ cái
  // vì hỏi agent Tiến độ; chưa về / hỏi lỗi thì danh sách vẫn hiện, chỉ chưa có dấu.
  const [gang, setGang] = useState<Set<string>>(new Set());
  useEffect(() => {
    goiApi<{ ids: string[] }>("/api/phong/viec-gang")
      .then((r) => setGang(new Set(r.ids)))
      .catch(() => undefined);
  }, []);
  // Việc đã xong: tải từ ngày sớm hơn trong hai mốc (đầu tuần đang chọn · 30 ngày trước) — hai nút lọc tại máy
  // máy chủ trả mọi việc hoàn thành còn trong thời hạn lưu (lùi tới đầu tuần đang chọn nếu sớm hơn) — để link chuông và ô tìm thấy được
  const xongTu = dl ? dl.tuan.tu : "";
  const taiXong = useCallback(async () => {
    if (!xongTu) return;
    try {
      setXongApi((await goiApi<{ viec: ViecApi[] }>(`/api/so-cai/da-xong?tu=${xongTu}`)).viec);
    } catch {
      setXongApi([]);
    }
  }, [xongTu]);
  useEffect(() => {
    void taiXong();
  }, [taiXong]);

  // Ô trên sân = đơn vị + ô dự án LOẠI KHÁC treo dưới SCI PMC / SCI E&C… (Đợt 3; không 📒, không +)
  // Phòng cấp 2 có dòng nhóm (P.KT&VH «Các nhà máy») vẽ như mọi phòng; nhóm thành MỘT hộp riêng cấp 3 dưới phòng (Mr. Đại chốt 25/10/2026):
  // hộp ảo «<phòng>@nhom» — mã có «@» nên không 📒, không +; các đơn vị con của phòng chuyển xuống treo dưới hộp.
  const nhomPhong = useMemo(() => {
    const r = new Map<string, string>();
    if (dl) for (const n of dl.nhom_gap ?? []) if (dl.o.find((o) => o.id === n.id)?.cap === 2) r.set(n.id, `${n.id}@nhom`);
    return r;
  }, [dl]);
  const oTatCa: OSoDo[] = useMemo(() => {
    if (!dl) return [];
    const ds = oTatCaCua(dl).map((o) => (o.cha && nhomPhong.has(o.cha) ? { ...o, cha: nhomPhong.get(o.cha)! } : o));
    for (const [p, vid] of nhomPhong) {
      const ng = dl.nhom_gap!.find((n) => n.id === p)!;
      ds.push({ id: vid, ten: ng.nhan, ten_ngan: ng.nhan, cap: 3, loai: "nhom", mau_ma: null, thu_tu: -1, cha: p });
    }
    return ds;
  }, [dl, nhomPhong]);
  /** Bố cục đủ mọi ô — để gắn việc vào ô; bố cục VẼ (bc) có thể bỏ ô không có việc (Cài đặt → Giao diện) */
  const bcDu: BoCuc | null = useMemo(() => (dl ? xepSoDo(oTatCa.map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu }))) : null), [dl, oTatCa]);
  const theoId = useMemo(() => Object.fromEntries(oTatCa.map((o) => [o.id, o])), [oTatCa]);

  // Dựng ViecO — một chỗ chung với trang nhúng thẻ việc (doi-viec.ts, 04/10/2026)
  const doiViec = useMemo(() => (dl && bcDu ? taoDoiViec(dl, bcDu, theoId) : null), [dl, bcDu, theoId]);
  const viecDu: ViecO[] = useMemo(() => (doiViec && viecApi ? viecApi.map(doiViec) : []), [doiViec, viecApi]);
  const xongDu: ViecO[] = useMemo(() => (doiViec && xongApi ? xongApi.map(doiViec) : []), [doiViec, xongApi]);
  /** Khoảng ngày của hai nút xong: tuần đang chọn (tới hôm nay) · 30 ngày tính cả hôm nay */
  const khoangXong = useMemo(() => (dl ? khoangXongCua(dl.tuan, dl.hom_nay) : null), [dl]);
  const xongTrong = useCallback((k: "xong_tuan" | "xong_30") => (khoangXong ? xongTrongKhoang(xongDu, khoangXong[k]) : []), [xongDu, khoangXong]);
  /** Tập việc đang xem trên sơ đồ: việc đang mở, hoặc việc đã xong theo nút đang bật */
  const viecGoc: ViecO[] = useMemo(() => (xem ? xongTrong(xem) : viecDu), [xem, xongTrong, viecDu]);

  // Cài đặt → Giao diện → "Sơ đồ tổ chức: hiện đơn vị không có việc" TẮT (Mr. Đại chốt 29/09/2026): bỏ khỏi bố cục ô mà số trên ô
  // là "0 việc" — đếm như ô đếm (việc chủ trì, tính cả đơn vị con; phối hợp không tính) — nên đường nối tới nó cũng mất; ô gốc luôn còn
  const bcHien: BoCuc | null = useMemo(() => {
    if (!bcDu || dl?.hien_don_vi_khong_viec !== false || !viecApi) return bcDu;
    const coViec = new Set<string>();
    for (const v of viecGoc) for (const n of v.nut) coViec.add(n);
    const giu = (id: string): boolean => id === bcDu.goc || coViec.has(id) || (bcDu.con[id] ?? []).some(giu);
    return xepSoDo(oTatCa.filter((o) => giu(o.id)).map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu })));
  }, [bcDu, dl, viecApi, viecGoc, oTatCa]);

  // Nhóm bung/gập (Mr. Đại chốt 20/10/2026, mục 7): SCI PMC «Đang thiết kế», SCI E&C «Đang thi công», BQLDA Lào / QT, P.KT&VH
  // «Các nhà máy» — bấm dòng chữ dưới tên ô mới xổ ra các ô cấp 3–4. Mặc định gập; máy nhớ nhóm đang bung theo TỪNG người xem.
  const nhomGap = useMemo(
    () => new Map((dl?.nhom_gap ?? []).map((n) => (nhomPhong.has(n.id) ? [nhomPhong.get(n.id)!, { ...n, id: nhomPhong.get(n.id)!, nhan: "Danh sách nhà máy" }] : [n.id, n]))),
    [dl, nhomPhong],
  );
  /** ô có dòng nhóm = ô khai ở Cài đặt mà còn ô con trên sơ đồ */
  const coNhom = useMemo(() => new Set([...nhomGap.keys()].filter((id) => (bcHien?.con[id] ?? []).length > 0)), [nhomGap, bcHien]);
  const khoaNhom = toi?.id ? `so-do-nhom-mo:${toi.id}` : "";
  const [moNhom, setMoNhom] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!khoaNhom) return;
    try {
      const s = localStorage.getItem(khoaNhom);
      setMoNhom(new Set(s ? (JSON.parse(s) as string[]) : []));
    } catch {
      /* bộ nhớ trình duyệt bị chặn: mọi nhóm gập như mặc định */
    }
  }, [khoaNhom]);
  const doiNhom = useCallback(
    (id: string, mo?: boolean, nho = true) =>
      setMoNhom((s) => {
        const n = new Set(s);
        if (mo ?? !n.has(id)) n.add(id);
        else n.delete(id);
        try {
          // chỉ lần bấm tay mới nhớ; tự bung (link chuông, ô đang chọn nằm trong nhóm gập) không ghi (kiểm độc lập lần 6, K3-4)
          if (khoaNhom && nho) localStorage.setItem(khoaNhom, JSON.stringify([...n]));
        } catch {
          /* bỏ qua */
        }
        return n;
      }),
    [khoaNhom],
  );
  /** Ô nằm dưới một nhóm đang gập (xét mọi cấp cha) → true */
  const trongNhomGap = useCallback(
    (id: string): boolean => {
      for (let c = theoId[id]?.cha; c; c = theoId[c]?.cha) if (coNhom.has(c) && !moNhom.has(c)) return true;
      return false;
    },
    [theoId, coNhom, moNhom],
  );
  /** Bố cục VẼ: như bcHien nhưng bỏ ô con của nhóm đang gập; ô có dòng nhóm cao thêm */
  // Bước cột DÃN theo khung (25/10/2026): tỉ lệ sân tính từ bố cục BUNG HẾT (bcMax) nên không đổi khi bung/gập → không giật zoom;
  // bố cục đang gập hẹp hơn thì dãn khoảng cách giữa các cột cho đầy chiều ngang
  const [cotX, setCotX] = useState(COT);
  /** Chiều cao sơ đồ khi CHỈ bung nhóm của phòng cấp 2 (P.KT&VH «Các nhà máy») — Mr. Đại 26/10: bung các nhà máy thì đáy ô
   *  cuối vừa đủ trong khung. Không có nhóm đó thì lấy bố cục bung hết. Bung nhóm khác dài hơn thì khung cuộn dọc. */
  const hNhaMay = useMemo(() => {
    if (!bcHien || !nhomPhong.size) return null;
    const mo = new Set(nhomPhong.values());
    const an = (id: string) => {
      for (let c = theoId[id]?.cha; c; c = theoId[c]?.cha) if (coNhom.has(c) && !mo.has(c)) return true;
      return false;
    };
    return xepSoDo(oTatCa.filter((o) => o.id in bcHien.con && !an(o.id)).map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu })), coNhom).H;
  }, [bcHien, nhomPhong, theoId, coNhom, oTatCa]);
  const bc: BoCuc | null = useMemo(() => {
    if (!bcHien) return null;
    return xepSoDo(
      oTatCa.filter((o) => o.id in bcHien.con && !trongNhomGap(o.id)).map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu })),
      coNhom,
      cotX,
    );
  }, [bcHien, oTatCa, trongNhomGap, coNhom, cotX]);
  const bcMax: BoCuc | null = useMemo(
    () => (bcHien ? xepSoDo(oTatCa.filter((o) => o.id in bcHien.con).map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu })), coNhom) : null),
    [bcHien, oTatCa, coNhom],
  );
  useEffect(() => {
    if (!bc?.goc || !bcHien) return;
    if (!chon || !bcHien.VT[chon]) setChon(bc.goc); // ô đã nhớ không còn trên sơ đồ → về gốc
    // ô nằm trong nhóm đang gập (link chuông, soát nộp, ô đã nhớ) → bung nhóm chứa nó
    else if (!bc.VT[chon]) for (let c = theoId[chon]?.cha; c; c = theoId[c]?.cha) if (coNhom.has(c) && !moNhom.has(c)) doiNhom(c, true, false);
  }, [bc, bcHien, chon, theoId, coNhom, moNhom, doiNhom]);

  // Link từ chuông (/so-do?viec=CV-…): mở đúng ô của việc và mở việc đó — làm một lần cho mỗi mã
  const viecMo = sp.get("viec") ?? "";
  const daMoLink = useRef("");
  useEffect(() => {
    if (!viecMo || daMoLink.current === viecMo || !viecDu.length || !bc || !xongApi || !khoangXong) return;
    const v = viecDu.find((x) => x.ma === viecMo) ?? xongDu.find((x) => x.ma === viecMo);
    if (!v) return;
    daMoLink.current = viecMo;
    setChon(v.nut[0] ?? bc.goc ?? "");
    setCheDo("viec");
    setSoat("");
    setChiIssue(false);
    setLoc("");
    setXem("");
    setTim("");
    setPham("");
    // Việc ĐÃ XONG (tin "đã xong việc" ở chuông, chốt 30/09): mở bằng nút Xong tuần / Xong 30 ngày để xem chi tiết + bình luận;
    // xong lâu hơn 30 ngày thì mở qua ô tìm (Việc toàn công ty + mã việc)
    const ng = v.xongNgay;
    if (ng) {
      const trong = (k: "xong_tuan" | "xong_30") => ng >= khoangXong[k][0] && ng <= khoangXong[k][1];
      if (trong("xong_tuan")) setXem("xong_tuan");
      else if (trong("xong_30")) setXem("xong_30");
      else {
        setPham("cong_ty");
        setTim(v.ma);
      }
    }
    setMo(v.ma);
  }, [viecMo, viecDu, xongDu, xongApi, khoangXong, bc]);

  // Cây con theo bố cục ĐỦ (bcDu): ô cấp 3–4 đang gập (20/10) hay ô ẩn vì không có việc vẫn được cộng vào số của ô cha
  const cayCon = useCallback((id: string): string[] => (bcDu ? [id, ...(bcDu.con[id] ?? []).flatMap(cayCon)] : [id]), [bcDu]);
  /** Việc dự án Loại khác chỉ đếm từ ô của nó lên tới SCI E&C / SCI PMC (Mr. Đại chốt 20/10/2026) — doi-viec.ts oDemViecLoaiKhac */
  const duocO = (v: ViecO, id: string) => !v.duoc || v.duoc.includes(id);
  // Ba nút lọc ĐÍCH DANH (Mr. Đại chốt 28/09): Việc tôi giao · Việc tôi nhận · Việc cần tôi phối hợp
  const tl = useMemo(() => toiLoc(toi, new Set((dl?.lanh_dao ?? []).map((l) => l.id))), [toi, dl]);
  const viec = useMemo(() => locViec(viecGoc, loc, tl), [viecGoc, loc, tl]);
  const soLoc = useMemo(() => Object.fromEntries(NUT_LOC.map((n) => [n.kieu, locViec(viecGoc, n.kieu, tl).length])), [viecGoc, tl]);
  const viecNhanh = useCallback(
    (id: string) => {
      const s = new Set(cayCon(id));
      return viec.filter((v) => duocO(v, id) && v.nut.some((n) => s.has(n)));
    },
    [viec, cayCon],
  );
  const duongLen = (id: string) => {
    const r: OSoDo[] = [];
    for (let o: OSoDo | undefined = theoId[id]; o; o = o.cha ? theoId[o.cha] : undefined) r.unshift(o);
    return r;
  };
  const tenNgan = (id: string) => (id === bc?.goc ? "Ban lãnh đạo" : (theoId[id]?.ten_ngan ?? id));
  /** Nhãn trên ô: bỏ tiền tố "BĐH " / "NM " như demo (chú giải đã ghi cấp 4 = Ban điều hành); tên đủ ở tiêu đề + cột phải */
  const nhanO = (id: string) => tenNgan(id).replace(/^(BĐH|NM) /, "");
  const tenDu = (id: string) => (id === bc?.goc ? "Ban lãnh đạo" : (theoId[id]?.ten ?? id));
  const coBaoCao = (id: string) => !!dl?.bao_cao[id];

  // ---------- Sân: co giãn theo khung ----------
  const khungRef = useRef<HTMLDivElement>(null);
  const tgRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const k = khungRef.current;
    if (!k || !bc || !bcMax) return;
    const vua = () => {
      const tg = tgRef.current;
      if (!tg) return;
      const hep = window.innerWidth < 1000;
      k.style.scrollbarGutter = "";
      let s: number;
      if (hep) {
        s = Math.max(0.6, Math.min(k.clientWidth / bc.W, 1));
      } else {
        // 26/10 (Mr. Đại): tỉ lệ vừa đủ để BUNG «Các nhà máy» thì đáy ô cuối (Hướng Linh 8) vẫn trong khung — không thanh cuộn.
        // Tính từ bố cục bung hết (bcMax.H) nên bung / gập cùng một tỉ lệ (không giật zoom). Bề ngang dư thì dãn khoảng cách
        // 5 cột cho đầy khung, nhưng KHÔNG quá 1,6 lần bước gốc (25/10 tối: dãn đầy hết thì các khối xa nhau quá).
        // Bề ngang làm tròn bậc 16 px: khung trái nhích vài px theo danh sách bên phải không làm đổi cỡ.
        const rongDo = Math.floor(k.clientWidth / 16) * 16;
        const sCao = (k.clientHeight - 6) / (hNhaMay ?? bcMax.H);
        const soCot = Math.round((bcMax.W - 2 * X0) / COT) + 1;
        const cotVua = soCot > 1 ? (rongDo / Math.min(sCao, 1.3) - 2 * X0) / (soCot - 1) : COT;
        const cot = Math.round(Math.min(COT * 1.6, Math.max(COT, cotVua)));
        if (Math.abs(cot - cotX) > 0.5) setCotX(cot);
        s = Math.min(rongDo / (2 * X0 + (soCot - 1) * cot), sCao, 1.3);
      }
      const lx = hep ? 0 : Math.max(0, (k.clientWidth - bc.W * s) / 2);
      tg.style.transform = `translate(${lx}px,2px) scale(${s})`; // neo từ TRÊN xuống (25/10/2026)
      k.style.height = hep ? `${bc.H * s + 8}px` : "";
      k.style.overflowY = !hep && bc.H * s + 4 > k.clientHeight ? "auto" : "";
    };
    vua();
    const ro = new ResizeObserver(vua);
    ro.observe(k);
    return () => ro.disconnect();
  }, [bc, bcMax, cotX, hNhaMay, viecApi === null]);

  const bayGio = useRef(performance.now() / 1000);

  if (loi) return <div className="trong" style={{ color: "#fca5a5" }}>Không tải được sơ đồ: {loi}</div>;
  if (!dl || !bc || !viecApi) return <div className="trong" style={{ color: "#d6d3d1" }}>Đang tải sơ đồ tổ chức…</div>;

  const tuan = dl.tuan;
  const kLamXong = khoangViecLamXong(tuan, dl.hom_nay);
  // Issue luôn đếm trên việc ĐANG MỞ (việc đã xong không trễ)
  // 20/10: cùng luật «Loại khác dừng ở E&C/PMC» như danh sách ở ô gốc — số trên nút khớp danh sách (kiểm độc lập lần 6, K1-3)
  const soTre = locViec(viecDu, loc, tl).filter((v) => v.tt === "tre" && duocO(v, bc.goc!)).length;
  // Số trên 2 nút Xong theo Ô ĐANG CHỌN + các ô bên dưới, cùng nút lọc Tôi giao/nhận/phối hợp — khớp danh sách bên phải (chốt 30/09)
  const oDangChon = new Set(cayCon(chon || bc.goc!));
  const trongO = (ds: ViecO[]) => locViec(ds, loc, tl).filter((v) => duocO(v, chon || bc.goc!) && v.nut.some((n) => oDangChon.has(n)));
  const demNut = (k: "xong_tuan" | "xong_30") => ({
    xong: trongO(xongTrong(k)).length,
    moi: trongO(moiTrongKhoang([...viecDu, ...xongDu], khoangXong![k])).length,
  });
  const soXong = { xong_tuan: demNut("xong_tuan"), xong_30: demNut("xong_30") };
  const NUT_XONG = nutXong(tuan.so, khoangXong!);
  const tenXem = xem ? NUT_XONG.find((n) => n.kieu === xem)!.tieu_de : "";

  // ---------- Sân ----------
  // Đang bật Issue / Việc của tôi / Việc thuộc hệ thống: ô không còn việc nào (sau lọc) mờ đi, đường nối tới nó cũng mờ (Mr. Đại chốt 28/09)
  const biMo = (id: string) => {
    if (!chiIssue && !loc) return false;
    const ds = viecNhanh(id);
    return chiIssue ? !ds.some((y) => y.tt === "tre") : ds.length === 0;
  };
  const day: JSX.Element[] = [];
  Object.entries(bc.con).forEach(([cha, ds]) =>
    ds.forEach((c) => {
      if (!bc.VT[c] || !bc.VT[cha]) return;
      const d = duongNoi(bc, cha, c);
      const lop = soat === cha && !laNutDuAn(c) ? (coBaoCao(c) ? "nop" : dl.nhac[c] ? "nhac" : "thieu") : "";
      day.push(
        <g key={`${cha}>${c}`} className={`nhanh-noi ${roiSoat === cha ? "sang" : ""} ${biMo(c) ? "mo-di" : ""}`}>
          <path className={`noi ${lop}`} d={d} />
          <path className="tin" d={d} />
          <path
            data-gt="sd-duong-noi"
            className="noi-bam"
            d={d}
            onMouseEnter={() => setRoiSoat(cha)}
            onMouseLeave={() => setRoiSoat("")}
            onClick={() => {
              setSoat(cha);
              setCheDo("soat");
              setChon(cha);
            }}
          >
            <title>Soát báo cáo tuần các đơn vị gửi lên {tenNgan(cha)}</title>
          </path>
        </g>,
      );
    }),
  );
  // Nút + mờ khi ô ngoài phạm vi giao việc; ô Ban lãnh đạo: sáng nếu giao được cho ít nhất một lãnh đạo
  const giaoDuocO = (id: string) =>
    id === bc.goc ? dl.lanh_dao.some((l) => coTheGiaoToi(dl.giao_duoc, l.id)) : coTheGiaoToi(dl.giao_duoc, id);
  // Bật nút Tuần N / 30 ngày: mỗi ô ghi "Xong a · Mới b" cho ô đó + các ô bên dưới (Mr. Đại chốt 30/09)
  const moiKy = xem ? locViec(moiTrongKhoang([...viecDu, ...xongDu], khoangXong![xem]), loc, tl) : [];
  const demMoi = (id: string) => {
    const s = new Set(cayCon(id));
    return moiKy.filter((v) => duocO(v, id) && v.nut.some((n) => s.has(n))).length;
  };
  const o = oTatCa
    .filter((x) => bc.VT[x.id])
    .map((x, i) => {
      const v = bc.VT[x.id];
      const ds = viecNhanh(x.id);
      const tre = ds.filter((y) => y.tt === "tre").length;
      const laDa = laNutDuAn(x.id);
      const soatCon = !laDa && !!soat && (bcHien!.con[soat] ?? []).includes(x.id);
      const nhac = dl.nhac[x.id] && !coBaoCao(x.id);
      // Quá hạn nộp (Cài đặt → Hạn nộp báo cáo tuần) mà chưa có báo cáo → sổ tự hiện "!", không cần ai bấm nhắc (chốt 29/09)
      const quaHan = !laDa && (dl.qua_han_nop ?? []).includes(x.id) && !coBaoCao(x.id);
      const lop = [
        `o c${bc.cap[x.id] ?? 4}`,
        laDa ? "chi-giua" : "",
        biMo(x.id) ? "mo-di" : "",
        soatCon ? (coBaoCao(x.id) ? "da-nop" : "chua-nop") : "",
        nhac || quaHan ? "da-nhac" : "",
        x.id === chon && cheDo !== "soat" ? "chon" : "",
        coNhom.has(x.id) ? "co-nhom" : "",
      ].join(" ");
      const dem = xem ? (
        <>Xong {ds.length} · Mới {demMoi(x.id)}</>
      ) : chiIssue ? (
        tre ? <span className="tre">{tre} trễ</span> : "không trễ"
      ) : nhac ? (
        <span className="nhac">Đã nhắc nộp {gio(dl.nhac[x.id].luc)}</span>
      ) : (
        <>
          {ds.length} việc{tre ? <> · <span className="tre">{tre} trễ</span></> : null}
        </>
      );
      const tre6 = -((bayGio.current + i * 0.9) % 6);
      const ng = coNhom.has(x.id) ? nhomGap.get(x.id) : undefined;
      const moNg = !!ng && moNhom.has(x.id);
      // Dòng nhóm: "Đang thi công · 6 dự án · 3 trễ" — trễ của các ô con; đang gập mà có việc trễ thì có chấm đỏ (Mr. Đại gật 20/10)
      const treCon = ng ? ds.filter((y) => y.tt === "tre" && !y.nut.includes(x.id)).length : 0;
      const hang = (
        <>
            {!laDa && (
            <button
              className="so-bc"
              data-gt="sd-so-bao-cao"
              title={`Báo cáo tuần ${tuan.so} của ${tenNgan(x.id)}${x.mau_ma ? ` (${x.mau_ma.replace("form-", "Form ")})` : ""}${quaHan ? ` — quá hạn nộp ${dl.han_nop[x.id]?.slice(11)} ${ngayVN(dl.han_nop[x.id]?.slice(0, 10))}, chưa nộp` : ""}`}
              onClick={() => (coBaoCao(x.id) ? (setChon(x.id), setCheDo("bao-cao")) : setHopNhac(x.id))}
            >
              {nhac || quaHan ? IC_NHAC : IC_SO}
            </button>
            )}
            <button
              className="giua"
              data-gt="sd-o-don-vi"
              title={`Việc của ${tenDu(x.id)}`}
              onClick={() => {
                setChon(x.id);
                setCheDo("viec");
                setSoat("");
                setLac({ id: x.id, n: Date.now() });
              }}
            >
              <span className="ten">{nhanO(x.id)}</span>
              <span className="dem">{dem}</span>
            </button>
            {/* Ngoài phạm vi giao việc thì ẨN nút + (Mr. Đại chốt 29/09, riêng 3004) */}
            {!laDa && giaoDuocO(x.id) && (
            <button
              className="cong"
              data-gt="sd-nut-giao"
              title={`Giao việc cho ${tenNgan(x.id)}`}
              onClick={() => {
                setChon(x.id);
                setCheDo("giao");
              }}
            >
              +
            </button>
            )}
        </>
      );
      return (
        <div key={x.id} data-nut={x.id} className={lop} style={{ left: v.x - v.w / 2, top: v.y, width: v.w, height: v.h, ["--tre" as string]: `${tre6.toFixed(2)}s` }}>
          <div className={`khoi ${ng ? "co-nhom" : ""} ${lac?.id === x.id ? "lac" : ""}`} key={lac?.id === x.id ? lac.n : 0}>
            {ng ? (
              <>
                <div className="hang">{hang}</div>
                <button
                  className={`dong-nhom ${!moNg && treCon ? "co-tre" : ""}`}
                  data-gt="sd-dong-nhom"
                  aria-expanded={moNg}
                  title={`${ng.nhan} · ${(bcHien!.con[x.id] ?? []).length} ${ng.ten_con}${treCon ? ` · ${treCon} việc trễ` : ""} — bấm để ${moNg ? "gập" : "bung"} các ô dưới ${tenNgan(x.id)}`}
                  onClick={() => {
                    // Gập nhóm đang chứa ô được chọn → chọn ô có nhóm (không thì ô chọn mất khỏi sân và nhóm tự bung lại — kiểm lần 6, K3-1)
                    if (moNg) for (let c = theoId[chon]?.cha; c; c = theoId[c]?.cha) if (c === x.id) (setChon(x.id), setCheDo("viec"));
                    doiNhom(x.id);
                  }}
                >
                  <span className="mui">{moNg ? "▾" : "▸"}</span>
                  {/* Hai dòng chữ 12px (kiểm lần 6, K3-2: một dòng 11px bị cắt mất «· k trễ»): nhãn · số ô con + số việc trễ */}
                  <span className="chu">
                    <span className="nhan-nhom">{ng.nhan}</span>
                    <span className="so-nhom">
                      {(bcHien!.con[x.id] ?? []).length} {ng.ten_con}
                      {treCon ? <> · <span className="tre-nhom">{treCon} trễ</span></> : null}
                    </span>
                  </span>
                </button>
              </>
            ) : (
              hang
            )}
          </div>
        </div>
      );
    });

  // ---------- Cột phải ----------
  const dauPhai = (id: string, duoi?: React.ReactNode, quay?: boolean, oTim?: React.ReactNode) => (
    <div className={`phai-dau ${quay ? "co-quay" : ""} ${oTim ? "co-tim" : ""}`} data-gt="duong-dan">
      {oTim}
      {quay && (
        <button className="nut quay" onClick={() => (setCheDo("soat"), setChon(soat))} title={`Về danh sách báo cáo gửi lên ${tenNgan(soat)}`}>
          ← Quay lại
        </button>
      )}
      {duongLen(id).map((x, i, a) =>
        i < a.length - 1 ? (
          <span key={x.id}>
            <button className="lk" onClick={() => (setChon(x.id), setCheDo("viec"), setSoat(""))}>
              {tenNgan(x.id)}
            </button>{" "}
            ›{" "}
          </span>
        ) : (
          <b key={x.id}>
            {chiIssue && cheDo === "viec" ? "Quá hạn · " : ""}
            {xem && cheDo === "viec" ? `${tenXem} · ` : ""}
            {loc && cheDo === "viec" ? `${NUT_LOC.find((n) => n.kieu === loc)?.nhan ?? ""} · ` : ""}
            {tenDu(x.id)}
          </b>
        ),
      )}
      {duoi}
    </div>
  );

  let phai: React.ReactNode = null;
  if (cheDo === "soat" && soat) {
    const con = (bcHien!.con[soat] ?? []).filter((c) => !laNutDuAn(c)); // ô dự án không nộp báo cáo
    const nop = con.filter(coBaoCao).length;
    phai = (
      <>
        <KhaiHuongDan ma="so-do-soat-bao-cao" uuTien={2} />
        {dauPhai(
          soat,
          <>
            {" "}
            · báo cáo tuần {tuan.so} gửi lên: <b style={{ fontSize: 13, fontFamily: "inherit" }}>{nop}/{con.length} đã nộp</b>
          </>,
        )}
        {con.map((c) => {
          const co = coBaoCao(c);
          const nh = dl.nhac[c];
          return (
            <button key={c} className="dong-soat" data-gt="soat-dau" onClick={() => (co ? (setChon(c), setCheDo("bao-cao")) : setHopNhac(c))}>
              <span className="cham" style={{ background: co ? "var(--nop)" : nh ? "#DC2626" : "#44403C" }} />
              <span>{tenDu(c)}</span>
              <span className={`nho ${co || nh ? "" : "do"}`}>
                {co ? dl.bao_cao[c].ten_tep : nh ? `đã nhắc ${gio(nh.luc)} · chờ nộp` : "chưa nộp — bấm để nhắc"}
              </span>
            </button>
          );
        })}
      </>
    );
  } else if (cheDo === "bao-cao" && dl.bao_cao[chon]) {
    phai = <BaoCaoTuan id={chon} b={dl.bao_cao[chon]} dau={dauPhai(chon, <> · báo cáo tuần {tuan.so}</>, !!soat && (bcHien!.con[soat] ?? []).includes(chon))} />;
  } else if (cheDo === "giao") {
    phai = (
      <GiaoViec
        id={chon}
        laGoc={chon === bc.goc}
        tenDu={tenDu(chon)}
        lanhDao={dl.lanh_dao}
        homNay={dl.hom_nay}
        dsDuAn={dl.du_an}
        giaoDuoc={dl.giao_duoc}
        toiDonVi={toi?.don_vi_ids}
        nguoi={dl.nguoi}
        xong={async (ma) => {
          await taiViec();
          setMoiGiao((s) => new Set(s).add(ma));
          setMo(ma);
          setCheDo("viec");
          bao(`Đã giao việc ${ma}`);
          void taiLaiToi();
        }}
      />
    );
  } else {
    const id = chon || bc.goc!;
    const tuKhoa = boDau(tim.trim());
    const khop = (v: ViecO) => !tuKhoa || chuTimViec(v, tenNgan).includes(tuKhoa);
    const nhom: { ten: string; ds: ViecO[]; xong?: ViecO[] }[] = [];
    // Ô phạm vi CHỈ có tác dụng khi đang gõ tìm (Mr. Đại chốt 30/09); ô tìm trống thì bên phải theo sơ đồ + nút bên trái
    if (laPhamTim(pham) && tuKhoa) {
      // Chọn phạm vi: tìm theo phạm vi, BỎ QUA các nút lọc (Issue, Tôi giao, Xong…) và ô đang chọn; việc đang làm trước, đã xong sau
      const moVaXong = [...viecDu, ...xongDu.filter((x) => !viecDu.some((y) => y.ma === x.ma))];
      const lanhDao = new Set(dl.lanh_dao.map((l) => l.id));
      const oToi = new Set((toi?.don_vi_ids ?? []).map((d) => (lanhDao.has(d) ? bc.goc! : d)));
      const trong = locPhamVi(moVaXong, pham, oToi, tl);
      const theoO = new Map<string, ViecO[]>();
      for (const v of trong.filter(khop)) {
        const k = v.nut[0] ?? "";
        theoO.set(k, [...(theoO.get(k) ?? []), v]);
      }
      for (const [k, ds] of theoO)
        // Ô dự án trùng tên dưới nhiều đơn vị (Dự án Nậm Mô 1 dưới SCI PMC và SCI E&C) → kèm tên đơn vị cha
        nhom.push({ ten: !k ? "Chưa gắn đơn vị" : laNutDuAn(k) && theoId[k]?.cha ? `${tenDu(k)} · ${tenNgan(theoId[k].cha!)}` : tenDu(k), ds: [...xepViec(ds.filter((v) => !v.xongNgay)), ...ds.filter((v) => v.xongNgay)] });
    } else {
      let tatCa = viecNhanh(id);
      if (chiIssue) tatCa = tatCa.filter((v) => v.tt === "tre");
      // Lọc giao chuyển tiếp (chốt 21/10): lọc ngay danh sách đang hiện; nhóm Phối hợp và khối Việc làm xong không áp nên ẩn
      const ct = laPhamTim(pham) ? null : pham || null;
      if (ct) tatCa = locChuyenTiep(tatCa, ct, new Set(dl.lanh_dao.map((l) => l.id)));
      const giu = new Set(tatCa.filter(khop).map((v) => v.ma));
      const daCo = new Set<string>();
      // Khối "Việc làm xong: Tuần N−1 và N" cuối mỗi nhóm (Mr. Đại giao 01/10) — chỉ khi xem việc đang làm (không bật Quá hạn / Xong…)
      const lamXong = !chiIssue && !xem && !ct ? xongMoiTruoc(locViec(xongDu, loc, tl).filter((v) => khop(v) && duocO(v, id)), kLamXong) : [];
      const daCoXong = new Set<string>();
      const xongCua = (thuoc: (v: ViecO) => boolean) => {
        const r = lamXong.filter((v) => thuoc(v) && !daCoXong.has(v.ma));
        r.forEach((v) => daCoXong.add(v.ma));
        return r;
      };
      const them = (ten: string, ds: ViecO[], xong: ViecO[] = []) => {
        ds = ds.filter((v) => giu.has(v.ma) && !daCo.has(v.ma));
        ds.forEach((v) => daCo.add(v.ma));
        if (ds.length || xong.length) nhom.push({ ten, ds: xepViec(ds), xong });
      };
      const con = bcHien!.con[id] ?? []; // cả khi nhóm đang gập: bấm ô thì cột phải vẫn chia việc theo từng ô con
      them(con.length ? `Của riêng ${tenNgan(id)}` : tenNgan(id), viec.filter((v) => v.nut.includes(id)), xongCua((v) => v.nut.includes(id)));
      con.forEach((c) => {
        const s = new Set(cayCon(c));
        // Việc làm xong xếp dưới ĐÚNG đơn vị làm, không gom đơn vị con về đơn vị cha — trừ Ban lãnh đạo là đơn vị tổng (Mr. Đại chốt 29/10/2026)
        them(tenDu(c), viecNhanh(c), xongCua((v) => (id === bc.goc ? v.nut.some((n) => s.has(n)) : v.nut.includes(c))));
      });
      // Việc đơn vị này chỉ PHỐI HỢP: nhóm riêng cuối cùng, không đếm vào ô (Mr. Đại chốt 28/09)
      if (!chiIssue && !xem && !ct) {
        const ph = xepViec(viec.filter((v) => v.nutPh.includes(id) && !daCo.has(v.ma) && khop(v)));
        const phXong = xongCua((v) => v.nutPh.includes(id));
        if (ph.length || phXong.length) nhom.push({ ten: "Phối hợp — chỉ để biết, không tính vào số việc", ds: ph, xong: phXong });
      }
    }
    const tong = nhom.reduce((n, g) => n + g.ds.length, 0);
    const oTim = <OTimViec pham={pham} setPham={setPham} tim={tim} setTim={setTim} />;
    const dongViec = (v: ViecO) => (
            <DongViec
                key={v.ma}
                v={v}
                mo={mo === v.ma}
                moi={moiGiao.has(v.ma)}
                gang={!v.xongNgay && gang.has(v.ma)}
                homNay={dl.hom_nay}
                tenNgan={tenNgan}
                donVi={noiGiaoDichDanh(dl.o, dl.lanh_dao)}
                giaoDuoc={dl.giao_duoc}
                bat={() => setMo((m) => (m === v.ma ? "" : v.ma))}
                moGoc={() => setBcGoc(v)}
                sauThaoTac={async (chu) => {
                  bao(chu);
                  await taiViec();
                }}
                roi={(on) => {
                  document.querySelectorAll(".gd-phong .o.sang").forEach((e) => e.classList.remove("sang"));
                  if (on) v.nut.forEach((n) => document.querySelector(`.gd-phong .o[data-nut="${n}"]`)?.classList.add("sang"));
                }}
              />
    );
    phai = (
      <>
        {laPhamTim(pham) && tuKhoa ? (
          <div className="phai-dau co-tim">
            {oTim}
            <b>{PHAM_VI_TIM.find((p) => p.kieu === pham)?.nhan}</b>
            <span> · {tong.toLocaleString("vi-VN")} việc</span>
          </div>
        ) : (
          dauPhai(id, tuKhoa ? <> · tìm thấy {tong.toLocaleString("vi-VN")} việc</> : undefined, false, oTim)
        )}
        {nhom.length === 0 && (
          <div className="trong">
            {tuKhoa
              ? "Không tìm thấy việc nào."
              : pham && !laPhamTim(pham)
                ? `Không có ${LOC_CHUYEN_TIEP.find((p) => p.kieu === pham)?.nhan.toLowerCase()} ở đây.`
                : chiIssue
                ? "Không có việc trễ."
                : xem
                  ? "Không có việc hoàn thành trong khoảng này."
                  : "Chưa có việc nào."}
          </div>
        )}
        {nhom.map((g) => (
          <div key={g.ten}>
            <div className="nhom-viec" data-gt={g.ten.startsWith("Phối hợp") ? "nhom-phoi-hop" : "nhom-viec"}>
              <span>{g.ten}</span>
              <span>{g.ds.length}</span>
            </div>
            {g.ten.startsWith("Phối hợp") ? g.ds.map(dongViec) : <DsTheoNguoi ds={g.ds} ve={dongViec} tenChung={`Việc chung của ${g.ten.replace(/^Của riêng /, "")}`} />}
            {g.xong?.length ? (
              <div className="khoi-xong">
                <button className="dong-khoi-xong" data-gt="khoi-viec-lam-xong" aria-expanded={moXong.has(g.ten)} title={kLamXong.giai_thich} onClick={() => doiMoXong(g.ten)}>
                  <span>{moXong.has(g.ten) ? "▾" : "▸"}</span> {kLamXong.nhan}
                  <span className="so">{g.xong.length}</span>
                </button>
                {moXong.has(g.ten) && (g.ten.startsWith("Phối hợp") ? g.xong.map(dongViec) : <DsTheoNguoi ds={g.xong} ve={dongViec} tenChung="Việc chung" />)}
              </div>
            ) : null}
          </div>
        ))}
      </>
    );
  }

  const nhacO = hopNhac ? theoId[hopNhac] : null;
  return (
    <div className="so-do" ref={keo.khungRef} style={keo.kieuKhung}>
      {xem && <KhaiHuongDan ma="viec-xem-da-xong" uuTien={1} />}
      <section className="san">
        <div className="san-dau">
          <span className="cap" data-gt="sd-chu-giai-cap"><i className="m1" style={{ ["--m" as string]: "var(--c1)" }} />cấp 1</span>
          <span className="cap" data-gt="sd-chu-giai-cap"><i className="m2" style={{ ["--m" as string]: "var(--c2)" }} />cấp 2</span>
          <span className="cap" data-gt="sd-chu-giai-cap"><i className="m3" style={{ ["--m" as string]: "var(--c3)" }} />cấp 3</span>
          <span className="cap" data-gt="sd-chu-giai-cap"><i className="m4" style={{ ["--m" as string]: "var(--c4)" }} />cấp 4 · Ban điều hành</span>
          <span className="cap" data-gt="sd-chu-giai-nop"><i className="vong" style={{ ["--m" as string]: "var(--nop)" }} />đã nộp</span>
          <span className="cap" data-gt="sd-chu-giai-nhac"><i className="bieu">{IC_NHAC}</i>quá hạn / đã nhắc nộp</span>
          <div className="day-nut">
            {NUT_XONG.map((n) => (
              <button
                key={n.kieu}
                data-gt={`nut:${n.kieu}`}
                className="nut-san nut-loc"
                aria-pressed={xem === n.kieu}
                disabled={!soXong[n.kieu].xong && xem !== n.kieu}
                onClick={() => {
                  setXem((x) => (x === n.kieu ? "" : n.kieu));
                  setChiIssue(false);
                  setMo("");
                  if (cheDo === "soat" || cheDo === "bao-cao") setCheDo("viec");
                  setSoat("");
                }}
                title={n.giai_thich}
              >
                {n.nhan}: <span className="so-nut">xong {soXong[n.kieu].xong} ·</span> <span className="so-nut">mới {soXong[n.kieu].moi}</span>
              </button>
            ))}
            <button
              className="nut-san nut-issue"
              data-gt="nut-qua-han"
              aria-pressed={chiIssue}
              onClick={() => {
                setChiIssue((b) => !b);
                setXem("");
                if (cheDo === "soat") setCheDo("viec");
                setSoat("");
              }}
              title="Chỉ xem việc quá hạn"
            >
              Quá hạn <span className="so-nut">· {soTre}</span>
            </button>
            {NUT_LOC.map((n) => (
              <button
                key={n.kieu}
                data-gt={`nut:${n.kieu}`}
                className="nut-san nut-loc"
                aria-pressed={loc === n.kieu}
                disabled={!soLoc[n.kieu] && loc !== n.kieu}
                onClick={() => setLoc((l) => (l === n.kieu ? "" : n.kieu))}
                title={soLoc[n.kieu] ? n.giai_thich : `${n.giai_thich}. Hiện chưa có việc nào`}
              >
                <span className="nhan-icon"><IconNutLoc kieu={n.kieu} /><span>{n.ngan} <span className="so-nut">· {soLoc[n.kieu]}</span></span></span>
              </button>
            ))}
          </div>
        </div>
        <div className="khung3d" ref={khungRef}>
          <div className="the-gioi" ref={tgRef} style={{ width: bc.W, height: bc.H }}>
            <svg className="day" width={bc.W} height={bc.H}>
              {day}
            </svg>
            {o}
          </div>
        </div>
        {nhacO && (
          <div className="man-san" onClick={(e) => e.target === e.currentTarget && setHopNhac("")}>
            <HopNhac
              o={nhacO}
              ten={tenDu(nhacO.id)}
              tuan={tuan}
              daNhac={dl.nhac[nhacO.id]?.luc ?? null}
              duocNhac={coTheGiaoToi(dl.giao_duoc, nhacO.id)}
              chaTen={nhacO.cha ? tenNgan(nhacO.cha) : ""}
              dong={() => setHopNhac("")}
              xong={async (n) => {
                setHopNhac("");
                bao(n);
                await taiSoDo();
              }}
            />
          </div>
        )}
      </section>
      {keo.vach}
      <section className="phai" key={`${cheDo}-${chon}-${soat}`}>
        <div className="vao">{phai}</div>
      </section>
      {bcGoc && <HopBaoCaoGoc v={bcGoc} dong={() => setBcGoc(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ---------------- Cây bút ✏ — sửa toàn bộ một việc (Mr. Đại chốt 29/09) ----------------
// Quyền "Sửa việc" (Cài đặt → Vai trò và quyền). Chủ trì chỉ chọn trong phạm vi giao; đơn vị ngoài phạm vi thì ẩn.
// Phối hợp: bấm chọn là thêm ngay, ✕ là bỏ. Đổi hạn không bắt ghi lý do. Máy chủ kiểm lại toàn bộ.
// LÃNH ĐẠO PHỐI HỢP (chốt 03/10, db/82): ô chọn riêng, mỗi việc MỘT lãnh đạo — chọn là thay, 🤖 máy gắn sẵn theo phân công.
type PhuTrachGui = { loai: "nguoi" | "don_vi"; id: string; ten: string };

function FormSuaViec({
  v,
  donVi,
  giaoDuoc,
  homNay,
  tenPt,
  dang,
  bo,
  luu,
}: {
  v: ViecO;
  donVi: NoiGiao[];
  giaoDuoc?: "tat_ca" | string[];
  homNay: string;
  tenPt: (p: { nut: string; ten: string; tenRieng?: string }) => string;
  dang: boolean;
  bo: () => void;
  luu: (body: Record<string, unknown>) => Promise<void>;
}) {
  const ctCu = v.pt.find((p) => p.vai === "chu_tri" && !p.xong);
  const khoaCtCu = ctCu ? `${ctCu.loai}:${ctCu.pid}` : "";
  const [ten, setTen] = useState(v.ten);
  const [kq, setKq] = useState(v.kq ?? "");
  const [bd, setBd] = useState(v.bd ?? "");
  const [kt, setKt] = useState(v.kt ?? "");
  const [ct, setCt] = useState(khoaCtCu);
  const [ph, setPh] = useState<PhuTrachGui[]>(
    v.pt.filter((p) => p.vai === "phoi_hop" && !p.xong).map((p) => ({ loai: p.loai, id: p.pid, ten: tenPt(p) })),
  );
  const khoa = (x: { loai: string; id: string }) => `${x.loai}:${x.id}`;
  const laLd = new Set(donVi.filter((d) => d.lanh_dao).map((d) => d.id));
  const ldDang = ph.find((x) => x.loai === "don_vi" && laLd.has(x.id));
  const phKhac = ph.filter((x) => x !== ldDang);
  const doiLd = (id: string) => {
    const d = donVi.find((x) => x.id === id);
    setPh([...phKhac, ...(d ? [{ loai: "don_vi" as const, id: d.id, ten: d.ten }] : [])]);
  };
  // Chủ trì (Mr. Đại chốt 10/10/2026 tối): sửa chủ trì CHÍNH LÀ giao việc → cùng danh sách, cùng cách trình bày với ô "Giao cho…"
  // (giao chuyển tiếp): nhóm theo đơn vị, tên người bên dưới. Dòng đầu = chủ trì đang có.
  const [nhomCt, setNhomCt] = useState<NhomNhan[]>([]);
  useEffect(() => {
    let huy = false;
    void taiNhanChuyenTiep()
      .then((g) => !huy && setNhomCt(g))
      .catch(() => undefined);
    return () => {
      huy = true;
    };
  }, []);
  const luaCt: PhuTrachGui[] = [
    ...(ctCu ? [{ loai: ctCu.loai, id: ctCu.pid, ten: tenPt(ctCu) }] : []),
    ...nhomCt.flatMap((g) => g.nguoi).filter((n) => `nguoi:${n.id}` !== khoaCtCu).map((n) => ({ loai: "nguoi" as const, id: n.id, ten: n.ten })),
  ];
  const chonPh = new Set([...ph.map(khoa), ct]);
  const noiPh = useNoiPhoiHop(true);
  const thieu = !ten.trim() ? "Chưa có tên việc" : bd && kt && bd > kt ? "Ngày bắt đầu sau hạn" : "";
  const gui = () => {
    if (thieu) return;
    const moiCt = luaCt.find((x) => khoa(x) === ct);
    void luu({
      ten: ten.trim(),
      ket_qua_can_co: kq.trim() || null,
      bat_dau: bd || null,
      ket_thuc: kt || null,
      ...(moiCt && ct !== khoaCtCu ? { chu_tri: moiCt } : {}),
      phoi_hop: ph,
    });
  };
  return (
    <div className="form-giao form-sua">
      <label>
        Tên việc
        <textarea autoFocus value={ten} onChange={(e) => setTen(e.target.value)} />
      </label>
      <label>
        Kết quả cần có
        <input value={kq} onChange={(e) => setKq(e.target.value)} placeholder="Ví dụ: tờ trình gửi TGĐ" />
      </label>
      <div className="hang-ngay">
        <label>
          Bắt đầu
          <ONhapNgay value={bd} onChange={setBd} />
        </label>
        <label>
          Hạn
          <ONhapNgay value={kt} onChange={setKt} />
        </label>
      </div>
      <div className="nho mo">{khoangNgay(bd || null, kt || null)}{kt && kt < homNay ? " · hạn đã qua" : ""}</div>
      {ctCu && (
        <label>
          Chủ trì
          <select value={ct} onChange={(e) => setCt(e.target.value)}>
            {ctCu && <option value={khoaCtCu}>{tenPt(ctCu)} (đang chủ trì)</option>}
            {nhomCt
              .map((g) => ({ ...g, nguoi: g.nguoi.filter((n) => `nguoi:${n.id}` !== khoaCtCu) }))
              .filter((g) => g.nguoi.length > 0)
              .map((g) => (
                <optgroup key={g.don_vi} label={g.don_vi}>
                  {g.nguoi.map((n) => (
                    <option key={n.id} value={`nguoi:${n.id}`}>
                      {n.ten}
                    </option>
                  ))}
                </optgroup>
              ))}
          </select>
        </label>
      )}
      {laLd.size > 0 && (
        <label>
          Lãnh đạo phối hợp
          <select data-gt="lanh-dao-phoi-hop" value={ldDang?.id ?? ""} onChange={(e) => doiLd(e.target.value)}>
            <option value="">— Không có —</option>
            {donVi
              .filter((d) => d.lanh_dao && `don_vi:${d.id}` !== ct)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.ten}
                </option>
              ))}
          </select>
        </label>
      )}
      <div>
        <div className="mo nho" style={{ marginBottom: 4 }}>Phối hợp</div>
        <div className="ds-ph">
          {phKhac.map((x) => (
            <span key={khoa(x)} className="ph">
              {x.ten}
              <button type="button" title={`Bỏ ${x.ten} khỏi phối hợp`} onClick={() => setPh((d) => d.filter((y) => khoa(y) !== khoa(x)))}>
                ✕
              </button>
            </span>
          ))}
          <select
            value=""
            onChange={(e) => {
              const m = timMucPh(noiPh, e.target.value);
              if (m) setPh((l) => [...l, { loai: m.loai, id: m.id, ten: m.loai === "don_vi" ? (donVi.find((d) => d.id === m.id)?.ten ?? m.ten) : m.ten }]);
            }}
          >
            <option value="">＋ thêm phối hợp…</option>
            <NhomPhoiHop ds={noiPh ?? []} daCo={chonPh} boLanhDao />
          </select>
        </div>
      </div>
      <div>
        <button className="nut chinh" disabled={!!thieu || dang} onClick={gui}>
          Lưu
        </button>{" "}
        <button className="nut" disabled={dang} onClick={bo}>
          Bỏ
        </button>{" "}
        <span className="mo nho">{thieu}</span>
      </div>
    </div>
  );
}


// ---------------- Một việc (mở MỘT việc một lúc, không có nút Thu gọn) ----------------
/** Ô phạm vi (nhỏ, bên trái) + ô tìm (lớn) ở hàng tiêu đề cột phải — Sơ đồ tổ chức và menu Dự án (Mr. Đại chốt 30/09) */
export function OTimViec({ pham, setPham, tim, setTim }: { pham: PhamViTim; setPham: (p: PhamViTim) => void; tim: string; setTim: (t: string) => void }) {
  return (
    <span className="o-tim">
      <select
        data-gt="tim-pham-vi"
        value={pham}
        onChange={(e) => setPham(e.target.value as PhamViTim)}
        title={
          pham && !laPhamTim(pham)
            ? `${LOC_CHUYEN_TIEP.find((p) => p.kieu === pham)?.giai_thich}. Lọc ngay danh sách đang hiện`
            : `${pham ? PHAM_VI_TIM.find((p) => p.kieu === pham)?.giai_thich : "Bỏ trống: tìm trong danh sách đang hiện (theo sơ đồ và các nút bên trái)"}. Chỉ có tác dụng khi gõ chữ vào ô tìm bên cạnh`
        }
        aria-label="Phạm vi tìm"
      >
        <option value="">Lọc tìm kiếm</option>
        {PHAM_VI_TIM.map((p) => (
          <option key={p.kieu} value={p.kieu}>
            {p.nhan}
          </option>
        ))}
        {/* Mr. Đại chốt 21/10/2026: hai lựa chọn LỌC NGAY (không cần gõ chữ) — giao chuyển tiếp */}
        <option disabled>──────────</option>
        {LOC_CHUYEN_TIEP.map((p) => (
          <option key={p.kieu} value={p.kieu}>
            {p.nhan}
          </option>
        ))}
      </select>
      <input data-gt="tim-viec" type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm mã việc, tên việc, tên người, dự án…" aria-label="Tìm việc" />
    </span>
  );
}

/** Dòng "Việc của … · lọc ra từ hệ thống báo cáo … · được giao bởi …" — một chỗ, dùng ở ô việc Sơ đồ và ô việc rút gọn. */
function DongCuaAi({ v, tenNgan, moGoc }: { v: ViecO; tenNgan: (id: string) => string; moGoc: () => void }) {
  const tenPt = (p: { nut: string; ten: string; tenRieng?: string }) => p.tenRieng ?? (p.nut ? tenNgan(p.nut) : p.ten);
  const ai = [...new Set(v.pt.filter((p) => p.vai === "chu_tri").map(tenPt))].join(" + ");
  const phoiHop = [...new Set(v.pt.filter((p) => p.vai === "phoi_hop").map(tenPt))].filter((t) => t !== ai);
  const m = /(tuần \d+|tháng \d+)/i.exec(v.nguon?.nhan ?? "");
  // tên đơn vị lập báo cáo — máy chủ trả tên ngắn; chức danh lãnh đạo không có ô trên sơ đồ nên tenNgan rơi về mã ("bld-troly-ct", Mr. Đại 02/10)
  const dvBc = v.nguon?.don_vi_ten || (v.nguon?.don_vi_id ? tenNgan(v.nguon.don_vi_id) : "");
  return (
    <div className="cua-ai" data-gt="viec-cua-ai">
      Việc của <b>{ai || "—"}</b>
      {phoiHop.length > 0 && <> · {phoiHop.join(" + ")} phối hợp</>}
      {v.nguon?.tai_lieu_id ? (
        <>
          {" "}· lọc ra từ hệ thống báo cáo{" "}
          <button onClick={moGoc}>
            {m ? m[1] : "báo cáo"}
            {dvBc ? ` · ${dvBc}` : ""}
          </button>
          {/* Mr. Đại 02/10: việc lọc từ báo cáo cũng phải ghi AI gán ai là người giao — để kiểm soát luồng tin (chuông xong việc đi về đâu) */}
          {" "}· được giao bởi {v.giao ?? "không rõ"}
        </>
      ) : (
        <> · được giao bởi {v.giao ?? "không rõ"}</>
      )}
      {v.xongNgay && <> · <b>hoàn thành {ngayVN(v.xongNgay)}</b>{v.coTheMoLai ? "" : " — chỉ xem"}</>}
    </div>
  );
}

/**
 * Ô việc RÚT GỌN (Mr. Đại chốt 02/10 — tab Cần BLĐ ra quyết định / Điểm nóng): như ô việc Sơ đồ đã bung nhưng BỎ thanh thời gian
 * và dòng "Kết quả cần có". Bấm tên = mở đúng việc đó bên phải (một việc chỉ hiện chi tiết ở MỘT nơi).
 */
export function TomTatViec({ v, tenNgan, bat, moGoc }: { v: ViecO; tenNgan: (id: string) => string; bat: () => void; moGoc: () => void }) {
  return (
    <div className={`muc-viec mo-ra tom-tat ${v.xongNgay ? "da-xong" : ""}`}>
      <button className="dau-viec" data-gt="dong-viec" onClick={bat} title="Mở việc này bên phải">
        <span className="t">
          {v.ten}
          {v.coTheSuaViec && <span className="but-sua">✎</span>}
        </span>
        <span className={`r tt-${v.tt}`} data-gt="viec-trang-thai">{v.ttChu}</span>
      </button>
      <div className="than-viec">
        <DongCuaAi v={v} tenNgan={tenNgan} moGoc={moGoc} />
      </div>
    </div>
  );
}

// Ô PHỐI HỢP (Mr. Đại chốt 10/10/2026 tối): trình bày GIỐNG ô "Giao cho…" (giao chuyển tiếp) — nhóm theo đơn vị, dưới nhóm là dòng
// "Cả <đơn vị>" rồi tên người. Nơi mời được do máy chủ tính (api/cong-viec/noi-phoi-hop: ngang cấp + cấp dưới; PMC, E&C chỉ cả đơn vị).
type MucPh = { loai: "don_vi" | "nguoi"; id: string; ten: string };
type NhomPh = { don_vi: string; lanh_dao?: boolean; muc: MucPh[] };
let noiPhoiHop: Promise<NhomPh[]> | null = null;
function taiNoiPhoiHop(): Promise<NhomPh[]> {
  noiPhoiHop ??= goiApi<{ nhom: NhomPh[] }>("/api/cong-viec/noi-phoi-hop")
    .then((r) => r.nhom)
    .catch((e) => {
      noiPhoiHop = null;
      throw e;
    });
  return noiPhoiHop;
}
function useNoiPhoiHop(bat: boolean): NhomPh[] | null {
  const [ds, setDs] = useState<NhomPh[] | null>(null);
  useEffect(() => {
    if (!bat) return;
    let huy = false;
    void taiNoiPhoiHop()
      .then((x) => !huy && setDs(x))
      .catch(() => !huy && setDs([]));
    return () => {
      huy = true;
    };
  }, [bat]);
  return ds;
}
/** Các <optgroup> của ô Phối hợp — bỏ mục đã có trong việc (khoá "loai:id"); nhóm hết mục thì ẩn */
function NhomPhoiHop({ ds, daCo, boLanhDao }: { ds: NhomPh[]; daCo: Set<string>; boLanhDao?: boolean }) {
  return (
    <>
      {ds
        .filter((g) => !(boLanhDao && g.lanh_dao))
        .map((g) => ({ ...g, muc: g.muc.filter((m) => !daCo.has(`${m.loai}:${m.id}`)) }))
        .filter((g) => g.muc.length > 0)
        .map((g) => (
          <optgroup key={g.don_vi} label={g.don_vi}>
            {g.muc.map((m) => (
              <option key={`${m.loai}|${m.id}`} value={`${m.loai}|${m.id}`}>
                {m.ten}
              </option>
            ))}
          </optgroup>
        ))}
    </>
  );
}
const timMucPh = (ds: NhomPh[] | null, giaTri: string) => (ds ?? []).flatMap((g) => g.muc).find((m) => `${m.loai}|${m.id}` === giaTri);

// Người nhận giao chuyển tiếp — khai ở đây để form Sửa việc (ô Chủ trì) dùng chung với ô "Giao cho…"
type NhomNhan = { don_vi: string; nguoi: { id: string; ten: string }[] };
// Danh sách theo người đăng nhập, không đổi trong lúc mở trang — tải một lần, mọi thẻ việc dùng chung
let nhanChuyenTiep: Promise<NhomNhan[]> | null = null;
function taiNhanChuyenTiep(): Promise<NhomNhan[]> {
  nhanChuyenTiep ??= goiApi<{ nhom: NhomNhan[] }>("/api/cong-viec/nhan-chuyen-tiep")
    .then((r) => r.nhom)
    .catch((e) => {
      nhanChuyenTiep = null;
      throw e;
    });
  return nhanChuyenTiep;
}
export function DongViec({
  v,
  mo,
  moi,
  homNay,
  tenNgan,
  donVi,
  bat,
  moGoc,
  sauThaoTac,
  roi,
  giaiDoan,
  giaoDuoc,
  gang,
}: {
  /** Việc chưa xong nằm trên đường găng → dấu "!" đỏ trước tên, cùng kiểu dấu tin mới ở chuông (màn Dự án + Sơ đồ — Mr. Đại chốt 05/10) */
  gang?: boolean;
  /** Phạm vi giao việc — form Sửa việc chỉ cho chọn chủ trì trong phạm vi (ngoài phạm vi thì ẨN, Mr. Đại chốt 29/09) */
  giaoDuoc?: "tat_ca" | string[];
  /** Menu Dự án: giai đoạn PMP 🤖 xếp — chọn là sửa ngay (một cú bấm) */
  giaiDoan?: { ma: string | null; lyDo: string | null; nguon: "ai" | "nguoi" | null; doi: (gd: string) => Promise<void> };
  v: ViecO;
  mo: boolean;
  moi: boolean;
  homNay: string;
  tenNgan: (id: string) => string;
  donVi: NoiGiao[];
  bat: () => void;
  moGoc: () => void;
  sauThaoTac: (chu: string) => Promise<void>;
  roi: (on: boolean) => void;
}) {
  const [thao, setThao] = useState<"" | "xong" | "huy" | "gia-han" | "phoi-hop" | "sua" | "mo-lai">("");
  const [hanMoLai, setHanMoLai] = useState("");
  const [lyDo, setLyDo] = useState("");
  const cdDk = useCaiDatDinhKem(thao === "xong");
  const [tepXong, setTepXong] = useState<{ id: string; ten: string; kich_thuoc: number }[]>([]);
  const [dangTaiTep, setDangTaiTep] = useState(false);
  const kepXong = useKepTep({ noi: "bao_xong", cd: cdDk, tep: tepXong, setTep: setTepXong, dangTai: setDangTaiTep });
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mo) ref.current?.scrollIntoView({ block: "nearest" });
    else setThao("");
  }, [mo]);
  // Người nhận giao chuyển tiếp — chỉ tải khi mở thẻ có ô "Giao cho…"
  const toiCt = useToi(); // «Chính tôi» trong ô Giao cho… (tự nhận phần việc của đơn vị mình)
  const canNhan = mo && v.coThePhanCong.length > 0;
  const [nhomNhan, setNhomNhan] = useState<NhomNhan[] | null>(null);
  useEffect(() => {
    if (!canNhan) return;
    let huy = false;
    void taiNhanChuyenTiep()
      .then((g) => !huy && setNhomNhan(g))
      .catch((e) => !huy && setLoi(e instanceof Error ? e.message : String(e)));
    return () => {
      huy = true;
    };
  }, [canNhan]);

  const lam = async (body: Record<string, unknown>, chu: string) => {
    setDang(true);
    setLoi("");
    try {
      await goiApi(`/api/cong-viec/${encodeURIComponent(v.ma)}`, { body });
      setThao("");
      await sauThaoTac(chu);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  };

  // Xong đúng phần của mình / bộ phận mình (máy chủ kiểm lại); phần chủ trì xong thì việc hoàn thành
  const xongPhanCuaToi = async () => {
    setDang(true);
    setLoi("");
    try {
      let hoanThanh = false;
      for (const [i, p] of v.coTheXong.entries()) {
        const r = await goiApi<{ hoan_thanh: boolean }>(`/api/cong-viec/${encodeURIComponent(v.ma)}`, {
          // File kẹp đi cùng phần đầu tiên (một lần báo xong = một bộ file)
          body: { hanh_dong: "ket_thuc", phan_viec_id: p.id, ghi_chu: lyDo.trim() || null, ...(i === 0 ? { dinh_kem: tepXong.map((t) => t.id) } : {}) },
        });
        if (r?.hoan_thanh) {
          hoanThanh = true;
          break;
        }
      }
      setThao("");
      await sauThaoTac(hoanThanh ? `Việc ${v.ma} đã hoàn thành — bên phối hợp đã được báo` : `Đã xong phần của bạn trong việc ${v.ma}`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  };

  const tenPt = (p: { nut: string; ten: string; tenRieng?: string }) => p.tenRieng ?? (p.nut ? tenNgan(p.nut) : p.ten);
  const daMoi = new Set(v.pt.filter((p) => !p.xong).map((p) => `${p.loai}:${p.pid}`));
  const noiPh = useNoiPhoiHop(mo && thao === "phoi-hop");
  let moc: React.ReactNode = null;
  if (v.loiNgay) moc = <div className="canh-ngay" data-gt="viec-moc">{khoangNgay(v.bd, v.kt)}</div>;
  else if (v.bd && v.kt) {
    const tong = cachNgay(v.bd, v.kt) || 1;
    const da = Math.min(Math.max(cachNgay(v.bd, v.xongNgay ?? homNay) / tong, 0), 1);
    moc = (
      <div className="moc" data-gt="viec-moc">
        <span>{ngayVN(v.bd)}</span>
        <span className="thanh">
          <i style={{ width: `${(da * 100).toFixed(0)}%` }} />
          <em>{cachNgay(v.bd, v.kt) + 1} ngày</em>
        </span>
        <span className={v.han === v.kt ? `tt-${v.tt}` : ""}>{ngayVN(v.kt)}</span>
      </div>
    );
  } else if (v.bd)
    moc = (
      <div className="moc" data-gt="viec-moc" style={{ gridTemplateColumns: "auto" }}>
        <span className="mo" style={{ fontWeight: 500 }}>từ {ngayVN(v.bd)} · việc thường xuyên, không có hạn</span>
      </div>
    );

  return (
    <div ref={ref} className={`muc-viec ${mo ? "mo-ra" : ""} ${moi ? "moi-giao" : ""} ${v.xongNgay ? "da-xong" : ""}`} onMouseEnter={() => roi(true)} onMouseLeave={() => roi(false)}>
      <button className="dau-viec" data-gt="dong-viec" onClick={bat}>
        <span className="mui">›</span>
        <span className="t">
          {gang && (
            <span className="dau-moi" title="Việc chưa xong nằm trên đường găng — trễ việc này là lùi ngày COD" data-gt="viec-gang">
              !
            </span>
          )}
          {v.ten}
          {/* Cây bút ✏ sửa toàn bộ việc — chỉ hiện khi có quyền "Sửa việc" (Mr. Đại chốt 29/09) */}
          {v.coTheSuaViec && (
            <span
              role="button"
              tabIndex={0}
              className="but-sua"
                data-gt="viec-sua"
              title="Sửa việc: tên, kết quả cần có, ngày, hạn, chủ trì, phối hợp"
              onClick={(e) => {
                e.stopPropagation();
                if (!mo) bat();
                setThao("sua");
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                e.stopPropagation();
                if (!mo) bat();
                setThao("sua");
              }}
            >
              ✎
            </span>
          )}
        </span>
        <span className={`r tt-${v.tt}`} data-gt="viec-trang-thai">{v.ttChu}</span>
      </button>
      {mo && (
        <div className="than-viec">
          <KhaiHuongDan ma="viec-the-viec" uuTien={1} />
          {v.coThePhanCong.length > 0 && <KhaiHuongDan ma="viec-thao-tac-nho" uuTien={0} />}
          {thao === "xong" && <KhaiHuongDan ma="viec-bao-xong" uuTien={2} />}
          {(thao === "gia-han" || thao === "phoi-hop" || thao === "huy" || thao === "mo-lai") && <KhaiHuongDan ma="viec-thao-tac-nho" uuTien={2} />}
          {thao === "sua" && <KhaiHuongDan ma="viec-sua-viec" uuTien={2} />}
          <DongCuaAi v={v} tenNgan={tenNgan} moGoc={moGoc} />
          {moc}
          {giaiDoan && (
            <div className="giai-doan-viec" data-gt="viec-giai-doan">
              <span className="mo">{giaiDoan.nguon === "nguoi" ? "Giai đoạn (người đã sửa):" : "🤖 Giai đoạn:"}</span>
              <select
                value={giaiDoan.ma ?? ""}
                disabled={dang}
                onChange={(e) => {
                  setDang(true);
                  void giaiDoan
                    .doi(e.target.value)
                    .catch((er) => setLoi(er instanceof Error ? er.message : String(er)))
                    .finally(() => setDang(false));
                }}
              >
                {!giaiDoan.ma && <option value="">chưa xếp</option>}
                {GIAI_DOAN.map(([ma, ten]) => (
                  <option key={ma} value={ma}>{ten}</option>
                ))}
              </select>
              {giaiDoan.nguon === "ai" && giaiDoan.lyDo && <span className="mo nho">🤖 {giaiDoan.lyDo}</span>}
            </div>
          )}
          {v.kq && (
            <div className="ket-qua" data-gt="viec-tu-bao-cao">
              <span className="mo">Kết quả cần có:</span> {v.kq}
            </div>
          )}
          {/* Việc từ chương Tiến độ chi tiết thiết kế (Form 5): % HT = tình trạng, Ghi chú = thông tin thêm (Mr. Đại 01/10) */}
          {v.nguon?.du_lieu?.cot_khac?.tien_do && (
            <div className="ket-qua" data-gt="viec-tu-bao-cao">
              <span className="mo">% hoàn thành (theo báo cáo):</span> {v.nguon.du_lieu.cot_khac.tien_do}
            </div>
          )}
          {v.nguon?.du_lieu?.cot_khac?.ghi_chu && (
            <div className="ket-qua" data-gt="viec-tu-bao-cao">
              <span className="mo">Ghi chú (theo báo cáo):</span> {v.nguon.du_lieu.cot_khac.ghi_chu}
            </div>
          )}
          {/* Mr. Đại chốt 28/09: tách "Xong" (người làm báo xong phần mình) khỏi "Hủy việc" (người giao, có lý do).
              Chốt 29/09 (riêng 3004, thay luật 17 ở app này): nút KHÔNG có quyền thì ẨN — còn thấy là bấm được */}
          {/* Phân công (chốt 30/09): việc giao cho CẢ đơn vị → trưởng đơn vị chọn một nhân viên là giao ngay, không nút xác nhận */}
          {/* Giao chuyển tiếp (Mr. Đại chốt 09/10): danh sách theo quyền Giao việc của người xem — lãnh đạo: mọi người trực thuộc SCI;
              trưởng: đơn vị mình + đơn vị con trực thuộc; không có SCI PMC / SCI E&C. Máy chủ tính (api/cong-viec/nhan-chuyen-tiep) */}
          {v.coThePhanCong.map((p) => (
            <div key={p.id} className="phan-cong" data-gt="viec-phan-cong">
              <select
                disabled={dang || !nhomNhan}
                value=""
                onChange={(e) => {
                  const ng = e.target.value === toiCt?.id ? { id: toiCt.id, ten: "chính tôi" } : (nhomNhan ?? []).flatMap((g) => g.nguoi).find((n) => n.id === e.target.value);
                  if (ng) void lam({ hanh_dong: "phan_cong", phan_viec_id: p.id, nguoi_id: ng.id }, `Đã giao ${v.ma} cho ${ng.ten}`);
                }}
              >
                <option value="" disabled>
                  {!nhomNhan ? "Đang tải danh sách người…" : v.coThePhanCong.length > 1 ? `Phần của ${p.ten}: giao cho…` : "Giao cho…"}
                </option>
                {p.loai === "don_vi" && toiCt?.id && <option value={toiCt.id}>Chính tôi</option>}
                {(nhomNhan ?? []).map((g) => (
                  <optgroup key={g.don_vi} label={g.don_vi}>
                    {g.nguoi.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.ten}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
          {(v.coTheXong.length > 0 || v.coTheSua || v.coThePhoiHop || v.coTheDieuChinh.length > 0) && (
            <div className="ba-nut">
              {v.coTheXong.length > 0 && (
                <button
                  data-gt="viec-xong"
                  className="chinh"
                  disabled={dang}
                  title={
                    v.coTheXong[0].vai === "chu_tri"
                      ? "Bộ phận bạn chủ trì: bấm Xong việc là việc hoàn thành, bên phối hợp tự đóng theo và được báo"
                      : "Bạn phối hợp: bấm Xong việc là xong phần phối hợp của bạn, việc vẫn mở tới khi bên chủ trì xong"
                  }
                  onClick={() => setThao(thao === "xong" ? "" : "xong")}
                >
                  Xong việc
                </button>
              )}
              {(v.coTheSua || v.coTheDieuChinh.length > 0) && (
                <button data-gt="viec-gia-han" disabled={dang} title={v.coTheSua ? "Đổi hạn của việc" : "Đổi hạn phần việc của đơn vị bạn làm trưởng"} onClick={() => setThao(thao === "gia-han" ? "" : "gia-han")}>Gia hạn</button>
              )}
              {/* K5 (02/10): trưởng đơn vị cấp trên của bên chủ trì cũng mời phối hợp được (không gia hạn / hủy) */}
              {v.coThePhoiHop && (
                <button data-gt="viec-gia-han" disabled={dang} title="Mời đơn vị hoặc một người phối hợp (chỉ để biết, không hạn riêng)" onClick={() => setThao(thao === "phoi-hop" ? "" : "phoi-hop")}>＋ Phối hợp</button>
              )}
              {v.coTheSua && (
                <button data-gt="viec-gia-han" disabled={dang} title="Việc không làm nữa: rời sổ cái, bắt buộc ghi lý do" onClick={() => setThao(thao === "huy" ? "" : "huy")}>Hủy việc</button>
              )}
            </div>
          )}
          {/* K1 (Mr. Đại duyệt 02/10): việc đã xong — người giao + lãnh đạo "Mở lại", bắt buộc lý do; không quyền thì không thấy nút */}
          {v.coTheMoLai && (
            <div className="ba-nut">
              <button data-gt="viec-mo-lai" disabled={dang} title="Việc chưa thật sự xong: đưa về sổ cái, người làm được báo lại" onClick={() => setThao(thao === "mo-lai" ? "" : "mo-lai")}>
                Mở lại
              </button>
            </div>
          )}
          {thao === "mo-lai" && (
            <form
              className="form-nho"
              onSubmit={(e) => {
                e.preventDefault();
                void lam({ hanh_dong: "mo_lai", ly_do: lyDo.trim(), ket_thuc: hanMoLai || null }, `Đã mở lại việc ${v.ma}${hanMoLai ? `, hạn mới ${ngayVN(hanMoLai)}` : ""}`);
              }}
            >
              <input type="text" autoFocus placeholder="Lý do mở lại (bắt buộc) — Enter để mở lại" value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
              <span className="mo">Hạn mới</span>
              <ONhapNgay min={homNay} value={hanMoLai} onChange={setHanMoLai} title="Để trống = giữ hạn cũ" />
              <button className="nut chinh" disabled={dang || !lyDo.trim()}>Mở lại</button>
            </form>
          )}
          {thao === "sua" && (
            <FormSuaViec
              v={v}
              donVi={donVi}
              giaoDuoc={giaoDuoc}
              homNay={homNay}
              tenPt={tenPt}
              dang={dang}
              bo={() => setThao("")}
              luu={(body) => lam({ hanh_dong: "sua_viec", ...body }, `Đã sửa việc ${v.ma}`)}
            />
          )}
          {thao === "xong" && (
            <form
              className="form-nho"
              onSubmit={(e) => {
                e.preventDefault();
                void xongPhanCuaToi();
              }}
            >
              {/* Kẹp file kết quả — bên phải ô lời báo, trước nút Xong; người giao nhận tin ở chuông kèm Xem / Tải về (Mr. Đại chốt 29/09) */}
              <input type="text" autoFocus placeholder="Báo kết quả bằng lời (không bắt buộc) — Enter để xong" value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
              {kepXong.nut}
              <button className="nut chinh" disabled={dang || dangTaiTep}>Xong việc</button>
              {kepXong.ds && <div style={{ flexBasis: "100%" }}>{kepXong.ds}</div>}
            </form>
          )}
          {thao === "huy" && (
            <form
              className="form-nho"
              onSubmit={(e) => {
                e.preventDefault();
                void lam({ hanh_dong: "dong_viec", ly_do: lyDo.trim() }, `Đã hủy việc ${v.ma}`);
              }}
            >
              <input type="text" autoFocus placeholder="Lý do hủy việc (bắt buộc, Enter để hủy)" value={lyDo} onChange={(e) => setLyDo(e.target.value)} />
              <button className="nut chinh" disabled={dang || !lyDo.trim()}>Hủy việc</button>
            </form>
          )}
          {thao === "gia-han" && (
            <div className="form-nho">
              <span>Hạn mới</span>
              <ONhapNgay
                min={homNay}
                onChange={(x) => x && void lam({ hanh_dong: "gia_han", ket_thuc: x, ...(v.coTheSua ? {} : { phan_viec_id: v.coTheDieuChinh[0] }), ly_do: "Gia hạn trên sơ đồ tổ chức" }, `Đã gia hạn ${v.ma} tới ${ngayVN(x)}`)}
              />
              <span className="mo">chọn ngày là áp dụng</span>
            </div>
          )}
          {thao === "phoi-hop" && (
            <div className="form-nho">
              <span>Phối hợp</span>
              <select
                autoFocus
                defaultValue=""
                disabled={dang || !noiPh}
                onChange={(e) => {
                  const m = timMucPh(noiPh, e.target.value);
                  if (!m) return;
                  const ten = m.loai === "don_vi" ? (donVi.find((d) => d.id === m.id)?.ten ?? m.ten) : m.ten;
                  void lam({ hanh_dong: "them_phan_viec", phu_trach: { loai: m.loai, id: m.id, ten }, bat_dau: homNay, ket_thuc: null }, `Đã thêm ${ten} phối hợp việc ${v.ma}`);
                }}
              >
                <option value="" disabled>{!noiPh ? "Đang tải danh sách…" : "Phối hợp với…"}</option>
                <NhomPhoiHop ds={noiPh ?? []} daCo={daMoi} />
              </select>
            </div>
          )}
          {loi && <div className="loi-nho">{loi}</div>}
          <BinhLuanViec maViec={v.ma} chiDoc={!!v.xongNgay} sauKhiGui={(chu) => void sauThaoTac(chu)} />
        </div>
      )}
    </div>
  );
}

// ---------------- Báo cáo tuần của một ô ----------------
function BaoCaoTuan({ id, b, dau }: { id: string; b: BaoCaoTuanO; dau: React.ReactNode }) {
  const [html, setHtml] = useState<string | null>(null);
  const [loi, setLoi] = useState("");
  useEffect(() => {
    setHtml(null);
    goiApi<{ loai: string; html?: string; ghi_chu?: string }>(`/api/tai-lieu/${encodeURIComponent(b.tai_lieu_id)}/xem-truoc`)
      .then((r) => setHtml(r.html ?? `<p>${r.ghi_chu ?? "Chưa xem trước được — bấm Tải tệp gốc."}</p>`))
      .catch((e) => setLoi(e instanceof Error ? e.message : String(e)));
  }, [b.tai_lieu_id, id]);
  return (
    <>
      <KhaiHuongDan ma="so-do-bao-cao-o" uuTien={2} />
      {dau}
      <div className="bc-tt" data-gt="xem-bao-cao">
        {b.ten_tep} · {b.ky}
        {` · nộp ${b.ngay_nop}`}
        {b.nguoi_nop ? ` bởi ${b.nguoi_nop}` : ""} · máy kiểm tra: {b.dat === false ? <span className="do">chưa đạt</span> : b.dat ? "đạt" : "—"} · {b.so_viec} việc vào sổ cái ·{" "}
        <a className="nut-chu" href={`/api/tai-lieu/${encodeURIComponent(b.tai_lieu_id)}/tep`}>Tải tệp gốc</a>
      </div>
      {loi ? <div className="trong do">{loi}</div> : html === null ? <div className="trong">Đang mở báo cáo…</div> : <div className="bc-html" dangerouslySetInnerHTML={{ __html: html }} />}
    </>
  );
}

// ---------------- Hộp báo cáo gốc giữa màn hình, khoanh cam dòng máy lọc ra việc ----------------
// Dùng cả ở bước 4 trang Gửi báo cáo (dòng "lọc ra từ hệ thống báo cáo …") — chỉ cần tên việc + tài liệu nguồn
// Bước 2 Sửa lỗi: `tim` = chữ của chỗ lỗi (tên việc của dòng / giá trị ô) — dòng bảng không thấy thì tìm cả đoạn văn; `chuThich` thay câu đầu hộp.
export function HopBaoCaoGoc({
  v,
  dong,
  tim,
  chuThich,
}: {
  v: { ten: string; nguon?: { tai_lieu_id?: string | null; nhan?: string | null } | null };
  dong: () => void;
  tim?: string;
  chuThich?: string;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [khong, setKhong] = useState(false);
  const thanRef = useRef<HTMLDivElement>(null);
  const htmlRef = useRef<HTMLDivElement>(null);
  const id = v.nguon?.tai_lieu_id;
  useEffect(() => {
    if (!id) return;
    goiApi<{ html?: string; ghi_chu?: string }>(`/api/tai-lieu/${encodeURIComponent(id)}/xem-truoc`)
      .then((r) => setHtml(r.html ?? `<p>${r.ghi_chu ?? ""}</p>`))
      .catch((e) => setHtml(`<p>${e instanceof Error ? e.message : String(e)}</p>`));
  }, [id]);
  // Tự đặt bản xem vào khung (không qua dangerouslySetInnerHTML: React vẽ lại là mất lớp khoanh — đo 02/10) rồi khoanh cam
  useEffect(() => {
    if (!html || !thanRef.current || !htmlRef.current) return;
    htmlRef.current.innerHTML = html;
    setKhong(khoanhDong(thanRef.current, [tim ?? v.ten]) === 0);
  }, [html, v.ten, tim]);
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && dong();
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [dong]);
  return (
    <div className="man-bc" onClick={(e) => e.target === e.currentTarget && dong()}>
      <KhaiHuongDan ma="viec-bao-cao-goc" uuTien={2} />
      <div className="hop-bc">
        <div className="dau">
          <span>
            <b>{v.nguon?.nhan}</b> <span className="mo">· {khong ? "không tìm thấy đúng dòng trong bản xem nhanh — mở tệp gốc để xem" : (chuThich ?? "khung cam là dòng máy lọc ra việc này")}</span>
          </span>
          <button className="nut" onClick={dong}>✕ Đóng</button>
        </div>
        <div className="than" ref={thanRef}>
          {html === null ? <div className="trong">Đang mở báo cáo…</div> : <div className="bc-html" ref={htmlRef} />}
        </div>
      </div>
    </div>
  );
}

// ---------------- Hộp nhắc nộp ----------------
function HopNhac({
  o,
  ten,
  tuan,
  daNhac,
  duocNhac,
  chaTen,
  dong,
  xong,
}: {
  o: OSoDo;
  ten: string;
  tuan: TuanBaoCao;
  daNhac: string | null;
  /** Có quyền nhắc đơn vị này không (cùng phạm vi «Giao việc»); không có thì ẨN nút nhắc (3004) */
  duocNhac: boolean;
  chaTen: string;
  dong: () => void;
  xong: (chu: string) => Promise<void>;
}) {
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState("");
  const gui = async () => {
    setDang(true);
    setLoi("");
    try {
      const r = await goiApi<{ nguoi_nhan: string[] }>("/api/phong/nhac-nop", { body: { don_vi_id: o.id, ngay: tuan.tu } });
      await xong(r.nguoi_nhan[0] === "quan-tri" ? "Đơn vị chưa có tài khoản — đã báo quản trị" : `Đã nhắc ${r.nguoi_nhan.length} người — tin đỏ ở chuông`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
      setDang(false);
    }
  };
  return (
    <div className="hop-nhac" data-gt="sd-hop-nhac">
      <KhaiHuongDan ma="so-do-soat-bao-cao" uuTien={2} />
      <div className="ic">!</div>
      <h3>{ten} chưa nộp báo cáo tuần {tuan.so}</h3>
      <p className="mo">{khoangNgay(tuan.tu, tuan.den)}</p>
      <p>
        {daNhac
          ? `Đã nhắc lúc ${gio(daNhac)}. Nhắc lần nữa?`
          : `Tin nhắc gửi tới người của đơn vị; đơn vị chưa có tài khoản thì gửi người của ${chaTen || "đơn vị cấp trên"}.`}
      </p>
      {loi && <p className="do">{loi}</p>}
      <div className="hai-nut">
        {duocNhac && <button className="nut chinh" disabled={dang} onClick={() => void gui()}>Nhắc nộp báo cáo</button>}
        <button className="nut" onClick={dong}>Để sau</button>
      </div>
    </div>
  );
}

// ---------------- Giao việc (nút +) ----------------
/** Có giao việc chủ trì tới đơn vị này được không (phạm vi quyền Giao việc máy chủ trả về). Chưa có dữ liệu → không chặn ở màn. */
export function coTheGiaoToi(g: "tat_ca" | string[] | undefined, id: string): boolean {
  return !g || g === "tat_ca" || g.includes(id);
}

// Hộp «Giao cho cá nhân» (Mr. Đại chốt 29/10/2026) — danh sách theo người đăng nhập, tải một lần
type NhomCaNhan = { don_vi_id: string; don_vi: string; nguoi: { id: string; ten: string; toi?: boolean }[] };
let giaoCaNhan: Promise<NhomCaNhan[]> | null = null;
function taiGiaoCaNhan(): Promise<NhomCaNhan[]> {
  giaoCaNhan ??= goiApi<{ nhom: NhomCaNhan[] }>("/api/phong/giao-ca-nhan")
    .then((r) => r.nhom)
    .catch((e) => {
      giaoCaNhan = null;
      throw e;
    });
  return giaoCaNhan;
}

export function GiaoViec({
  id: idGoiY,
  laGoc: laGocGoiY,
  tenDu: tenDuGoiY,
  dsNoiGiao,
  lanhDao,
  homNay,
  xong,
  duAn,
  dsDuAn,
  giaoDuoc,
  toiDonVi,
  nguoi: nguoiDs,
  tenMacDinh,
}: {
  /** Tên việc điền sẵn (giao từ Báo cáo tuần — chốt 30/09) */
  tenMacDinh?: string;
  /** Có thì hiện ô "Giao cho" để ĐỔI nơi nhận ngay trong form (Mr. Đại chốt 09/10, màn Báo cáo tuần): mặc định = nơi AI gợi ý
   *  (`id`), chọn nơi khác thì giao thẳng tới đó — không phải giao xong rồi vào Sửa. Chỉ liệt kê nơi mình giao được (3004: không quyền thì ẨN). */
  dsNoiGiao?: NoiGiao[];
  /** Đơn vị của người đang giao (chính + kiêm nhiệm) — giao trong phòng mình thì bắt buộc chọn MỘT nhân viên (chốt 30/09) */
  toiDonVi?: string[];
  nguoi?: { id: string; ten: string; don_vi_id: string | null; don_vi_ids?: string[]; chuc_vu?: string | null }[];
  /** Đơn vị được giao chủ trì tới (phạm vi quyền Giao việc) — ngoài phạm vi thì nơi nhận hiện mờ, không bấm được (luật 17) */
  giaoDuoc?: "tat_ca" | string[];
  id: string;
  laGoc: boolean;
  tenDu: string;
  lanhDao: { id: string; ten: string }[];
  homNay: string;
  xong: (ma: string) => Promise<void>;
  /** Menu Dự án: chọn dự án + đơn vị nhận (thước: demo panelGiao khi CHE = 'du-an') */
  duAn?: { ds: { id: string; ten: string; nhom: string; don_vi: string[] }[]; chon: string; donVi: { id: string; ten: string }[] };
  /** Giao cho một đơn vị / lãnh đạo: ô "Thuộc dự án" KHÔNG bắt buộc — chọn thì việc gán vào dự án (Mr. Đại chốt 28/09) */
  dsDuAn?: { id: string; ten: string; nhom: string }[];
}) {
  // Nơi nhận đang chọn — mặc định theo gợi ý (AI / ô vừa bấm); đổi ở ô "Giao cho" (chỉ khi có dsNoiGiao)
  const [id, setIdChon] = useState(idGoiY);
  const laGoc = id === idGoiY ? laGocGoiY : false;
  const tenDu = id === idGoiY ? tenDuGoiY : (dsNoiGiao?.find((x) => x.id === id)?.ten_ngan ?? id);
  const [nguoi, setNguoi] = useState("");
  const [daChon, setDaChon] = useState(duAn?.chon ?? "");
  const daHienTai = duAn?.ds.find((a) => a.id === daChon);
  // Màn Dự án — ô "Giao cho" chung (Mr. Đại chốt 04/10 tối): bấm = Ban lãnh đạo + đơn vị · gõ @ = người giao đích danh được.
  // Giá trị "loai|id"; mặc định đơn vị đầu tiên của dự án mà mình giao được (như ô cũ)
  const dvMacDinh = (a?: { don_vi: string[] }) => {
    const x = a?.don_vi.find((v) => coTheGiaoToi(giaoDuoc, v)) ?? a?.don_vi[0];
    return x ? `don_vi|${x}` : "";
  };
  const [giaoCho, setGiaoCho] = useState(dvMacDinh(daHienTai));
  const loaiNhan = giaoCho.startsWith("nguoi|") ? "nguoi" : "don_vi";
  const maNhan = giaoCho.slice(giaoCho.indexOf("|") + 1);
  const dvNhan = giaoCho && loaiNhan === "don_vi" ? maNhan : "";
  const [noiNhan, setNoiNhan] = useState<NguoiNhanCV | null>(null);
  const [loiNoiNhan, setLoiNoiNhan] = useState("");
  const coDuAn = !!duAn;
  useEffect(() => {
    if (!coDuAn) return;
    let huy = false;
    goiApi<NguoiNhanCV>("/api/phong/noi-nhan")
      .then((d) => !huy && setNoiNhan(d))
      .catch((e) => !huy && setLoiNoiNhan(e instanceof Error ? e.message : String(e)));
    return () => {
      huy = true;
    };
  }, [coDuAn]);
  const [daPhu, setDaPhu] = useState("");
  const daGan = daHienTai ?? dsDuAn?.find((a) => a.id === daPhu);
  const [ten, setTen] = useState(tenMacDinh ?? "");
  const [kq, setKq] = useState("");
  const [han, setHan] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const cdDk = useCaiDatDinhKem();
  const [tepKep, setTepKep] = useState<{ id: string; ten: string; kich_thuoc: number }[]>([]);
  const [dangTaiTep, setDangTaiTep] = useState(false);
  const kep = useKepTep({ noi: "giao_viec", cd: cdDk, tep: tepKep, setTep: setTepKep, dangTai: setDangTaiTep });
  const duoc = (x: string) => coTheGiaoToi(giaoDuoc, x);
  // Giao trong PHÒNG MÌNH (trưởng phòng, không phải lãnh đạo toàn công ty): chọn một nhân viên làm chủ trì (chốt 30/09)
  const dvDich = duAn ? dvNhan : laGoc ? "" : id;
  const chonNV = !!dvDich && giaoDuoc !== "tat_ca" && !!toiDonVi?.includes(dvDich);
  const dsNV = chonNV ? (nguoiDs ?? []).filter((n) => (n.don_vi_ids?.length ? n.don_vi_ids : [n.don_vi_id]).includes(dvDich)) : [];
  const [nv, setNv] = useState("");
  const nvChon = dsNV.find((n) => n.id === nv);
  // «Giao cho cá nhân»: chọn một người thì giao thẳng người đó (không qua giao chuyển tiếp); không chọn thì giao cho đơn vị như cũ
  const [caNhan, setCaNhan] = useState("");
  const toiGiao = useToi(); // «Chính tôi» đứng đầu hộp — tự giao cho mình luôn được (máy chủ: batBuocTrongPhamVi)
  const [nhomCaNhan, setNhomCaNhan] = useState<NhomCaNhan[] | null>(null);
  useEffect(() => {
    let huy = false;
    void taiGiaoCaNhan()
      .then((g) => !huy && setNhomCaNhan(g))
      .catch(() => !huy && setNhomCaNhan([]));
    return () => {
      huy = true;
    };
  }, []);
  const caNhanChon = caNhan && toiGiao?.id === caNhan ? { id: toiGiao.id, ten: toiGiao.ten } : (nhomCaNhan ?? []).flatMap((g) => g.nguoi).find((n) => n.id === caNhan);
  const nhan = caNhanChon
    ? { id: caNhanChon.id, ten: caNhanChon.ten }
    : chonNV
    ? nvChon && { id: nvChon.id, ten: nvChon.ten }
    : duAn
      ? loaiNhan === "nguoi"
        ? noiNhan?.nguoi.find((n) => n.id === maNhan)
        : (noiNhan?.don_vi.find((d) => d.id === dvNhan) ?? duAn.donVi.find((d) => d.id === dvNhan))
      : laGoc
        ? lanhDao.find((l) => l.id === nguoi)
        : { id, ten: tenDu };
  const thieu =
    duAn && !daHienTai
      ? "Chưa chọn dự án"
      : !ten.trim()
        ? "Chưa có nội dung việc"
        : !nhan
          ? chonNV
            ? "Chưa chọn nhân viên làm chủ trì"
            : "Chưa chọn người nhận"
          : !caNhanChon && !chonNV && !(duAn && loaiNhan === "nguoi") && !duoc(nhan.id)
            ? `${nhan.ten} ngoài phạm vi giao việc của bạn`
            : han && han < homNay
              ? "Hạn trước hôm nay"
              : "";
  const gui = async () => {
    if (!nhan || thieu) return;
    setDang(true);
    setLoi("");
    try {
      const r = await goiApi<{ ma_viec: string }>("/api/cong-viec", {
        body: {
          ten: ten.trim(),
          ...(daGan ? { du_an: daGan.ten } : {}),
          ket_qua_can_co: kq.trim() || null,
          bat_dau: homNay,
          ket_thuc: han || null,
          phan_viec: [{ loai: caNhanChon || chonNV || (duAn && loaiNhan === "nguoi") ? "nguoi" : "don_vi", id: nhan.id, ten: nhan.ten, bat_dau: homNay, ket_thuc: han || null }],
          dinh_kem: tepKep.map((t) => t.id),
        },
      });
      await xong(r.ma_viec);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
      setDang(false);
    }
  };
  return (
    <>
      {duAn ? <KhaiHuongDan ma="du-an-giao-viec" uuTien={2} /> : !dsNoiGiao && <KhaiHuongDan ma="so-do-giao-viec" uuTien={2} />}
      <div className="phai-dau">
        <b>{duAn ? "Giao việc theo dự án" : `Giao việc cho ${tenDu}`}</b>
      </div>
      <div className="form-giao" data-gt="giao-viec">
        {!duAn && dsNoiGiao && (
          <label>
            {/* một dòng (Mr. Đại 09/10) — nhãn form xếp dọc nên phải gói chung một mẩu */}
            <span>Giao cho <span className="mo nho">· {id === idGoiY ? "theo gợi ý" : "đã đổi khỏi gợi ý"}</span></span>
            <select
              value={id}
              onChange={(e) => {
                setIdChon(e.target.value);
                setNv("");
                setNguoi("");
                setCaNhan("");
              }}
            >
              {(() => {
                const ds = dsNoiGiao.filter((x) => x.id === idGoiY || duoc(x.id));
                const coGoiY = ds.some((x) => x.id === idGoiY);
                const nhan = (x: NoiGiao) => `${x.ten_ngan}${x.id === idGoiY ? " — gợi ý" : ""}`;
                return (
                  <>
                    {!coGoiY && <option value={idGoiY}>{tenDuGoiY} — gợi ý</option>}
                    {ds.some((x) => x.lanh_dao) && (
                      <optgroup label="Lãnh đạo">
                        {ds.filter((x) => x.lanh_dao).map((x) => (
                          <option key={x.id} value={x.id}>{nhan(x)}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Đơn vị">
                      {ds.filter((x) => !x.lanh_dao).map((x) => (
                        <option key={x.id} value={x.id}>{nhan(x)}</option>
                      ))}
                    </optgroup>
                  </>
                );
              })()}
            </select>
          </label>
        )}
        {duAn && (
          <>
            <label>
              Dự án
              <select
                value={daChon}
                onChange={(e) => {
                  setDaChon(e.target.value);
                  setGiaoCho(dvMacDinh(duAn.ds.find((a) => a.id === e.target.value)));
                }}
              >
                <option value="" disabled>chọn một dự án…</option>
                {duAn.ds.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.ten} · {a.nhom === "sci" ? "SCI đầu tư" : "loại khác"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Giao cho
              <OChonNoiNhan ds={noiNhan} loiDs={noiNhan ? null : loiNoiNhan || "Đang lấy danh sách…"} value={giaoCho} onChange={setGiaoCho} giaTri="loai|id" />
            </label>
          </>
        )}
        {laGoc && !caNhanChon && (
          <div>
            <div className="mo nho" style={{ marginBottom: 5 }}>Người nhận trong Ban lãnh đạo</div>
            <div className="chon-nguoi">
              {lanhDao.filter((l) => duoc(l.id)).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={nguoi === l.id}
                  onClick={() => setNguoi(l.id)}
                >
                  {l.ten}
                </button>
              ))}
            </div>
          </div>
        )}
        {chonNV && !caNhanChon && (
          <div>
            <div className="mo nho" style={{ marginBottom: 5 }}>Nhân viên làm chủ trì · bắt buộc chọn một người</div>
            <div className="chon-nguoi">
              {dsNV.map((n) => (
                <button key={n.id} type="button" aria-pressed={nv === n.id} title={n.chuc_vu ?? undefined} onClick={() => setNv(n.id)}>
                  {n.ten}
                </button>
              ))}
            </div>
            {!dsNV.length && <div className="mo nho">Đơn vị chưa có tài khoản nhân viên nào</div>}
          </div>
        )}
        {nhomCaNhan && nhomCaNhan.length > 0 && toiGiao && (
          <label data-gt="giao-ca-nhan">
            <span>Giao cho cá nhân <span className="mo nho">· {caNhanChon ? "giao thẳng người này" : "không chọn = giao cho đơn vị"}</span></span>
            <select value={caNhan} onChange={(e) => setCaNhan(e.target.value)}>
              <option value="">— Không chọn: giao cho đơn vị —</option>
              <option value={toiGiao.id}>Chính tôi</option>
              {nhomCaNhan.map((g) => ({ ...g, nguoi: g.nguoi.filter((n) => n.id !== toiGiao.id) })).filter((g) => g.nguoi.length).map((g) => (
                <optgroup key={g.don_vi_id} label={g.don_vi}>
                  {g.nguoi.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.ten}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        )}
        {!duAn && dsDuAn?.length ? (
          <label>
            <span>Thuộc dự án <span className="mo nho">· không bắt buộc</span></span>
            <select value={daPhu} onChange={(e) => setDaPhu(e.target.value)}>
              <option value="">— Không thuộc dự án nào —</option>
              {dsDuAn.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.ten} · {a.nhom === "sci" ? "SCI đầu tư" : "loại khác"}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label htmlFor="giao-noi-dung">
          Nội dung việc
          {/* 📎 bên phải ô nội dung việc (Mr. Đại chốt 29/09) — người nhận thấy ở chuông, bấm Xem / Tải về */}
          <div className="hang-kep">
            <textarea id="giao-noi-dung" value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Việc cần làm…" />
            {kep.nut}
          </div>
          {kep.ds}
        </label>
        <label>
          Kết quả cần có
          <input value={kq} onChange={(e) => setKq(e.target.value)} placeholder="Ví dụ: tờ trình gửi TGĐ" />
        </label>
        <label>
          Hạn
          <ONhapNgay min={homNay} value={han} onChange={setHan} />
        </label>
        {han && <div className="nho">{khoangNgay(homNay, han)}</div>}
        {loi && <div className="loi-nho">{loi}</div>}
        <div>
          <button className="nut chinh" disabled={!!thieu || dang || dangTaiTep} onClick={() => void gui()}>Giao việc</button> <span className="mo nho">{thieu || (dangTaiTep ? "Đang tải file…" : "")}</span>
        </div>
      </div>
    </>
  );
}
