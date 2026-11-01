"use client";
// ============================================================
// DuAnPhong — màn DỰ ÁN của giao diện căn phòng (Đợt 3, Mr. Đại chốt 28/09/2026).
// Thước: 0 Tài liệu thiết kế/demo-agent-cong-viec-pa2-cay.html, khung 'du-an'. Danh mục khối (luật 26):
//   sân: chú giải nhóm · Ban QLDA · dự án · nút "＋ Giao việc" · "Issue · N" · "Việc của tôi" · "Việc thuộc hệ thống"
//        · cây: "SCI đầu tư" → BQLDA → dự án xếp dọc; "Loại khác" → dự án 1 cột dọc (04/10) · ô KHÔNG có 📒 và +
//   cột phải: việc của ô nhóm theo 6 giai đoạn (PMP + Thiết kế) do 🤖 xếp (giai đoạn trống không hiện) + "🤖 chưa xếp giai đoạn"
//        · form giao việc theo dự án (chọn dự án + đơn vị nhận)
// 13/10/2026 (Mr. Đại): dưới icon Cây việc & đường găng của ô dự án có thêm icon «Tóm tắt tiến độ dự án» — bấm thì KHU BÊN TRÁI
//   đổi thành bảng tiến độ rút gọn (TomTatTienDo — bản nháp nạp bằng Excel, không nối hệ agent), khu việc bên phải giữ nguyên.
// Chi tiết việc dùng chung DongViec của Sơ đồ tổ chức, thêm ô chọn giai đoạn (chọn là sửa ngay, người sửa thắng AI).
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { goiApi } from "@/components/layout/giao-dien";
import { taiLaiToi, useToi } from "@/components/layout/dung-toi";
import type { OSoDo } from "@/lib/phong/so-do";
import type { TuanBaoCao } from "@/lib/phong/tuan";
import { GIAI_DOAN, type GiaiDoanViec } from "@/lib/phong/giai-doan-thuan";
import { G_KHAC, G_SCI, duAnCuaViec, xepDuAn, type DuAn } from "@/lib/phong/du-an-thuan";
import { duongNoi, xepSoDo } from "./bo-cuc";
import { useKeoGiua } from "./KeoGiua";
import { useNhoTrangThai } from "./nho-trang-thai";
import { IconNutLoc } from "./IconNguoi";
import { LOC_CHUYEN_TIEP, NUT_LOC, PHAM_VI_TIM, boDau, laPhamTim, locChuyenTiep, chuTimViec, chuyenViec, khoangViecLamXong, khoangXongCua, locPhamVi, locViec, moiTrongKhoang, noiGiaoDichDanh, nutXong, toiLoc, xepViec, xongMoiTruoc, xongTrongKhoang, type KieuXong, type LocToi, type PhamViTim, type ViecApi, type ViecO } from "./viec";
import { DongViec, GiaoViec, HopBaoCaoGoc, OTimViec } from "./SoDoPhong";
import { IconTomTat, TomTatTienDo } from "./TomTatTienDo";
import { DsTheoNguoi } from "./DsTheoNguoi";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface DuLieu {
  o: OSoDo[];
  lanh_dao: { id: string; ten: string; ten_ngan: string }[];
  nguoi: { id: string; ten: string; don_vi_id: string | null; don_vi_ids?: string[]; chuc_vu?: string | null }[];
  hom_nay: string;
  tuan: TuanBaoCao;
  giao_duoc?: "tat_ca" | string[];
  du_an: DuAn[];
  giai_doan: Record<string, GiaiDoanViec>;
}
type ViecDa = ViecO & { da: string | null };

export function DuAnPhong() {
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [viecApi, setViecApi] = useState<ViecApi[] | null>(null);
  const [gd, setGd] = useState<Record<string, GiaiDoanViec>>({});
  const [loi, setLoi] = useState<string | null>(null);
  const [chon, setChon] = useState(G_SCI);
  const [cheDo, setCheDo] = useState<"viec" | "giao">("viec");
  const [chiIssue, setChiIssue] = useState(false);
  // Khối "Việc làm xong" cuối danh sách dự án: mặc định co lại (Mr. Đại 01/10)
  const [moXong, setMoXong] = useState(false);
  const [loc, setLoc] = useState<LocToi>("");
  // Cùng Sơ đồ tổ chức (Mr. Đại chốt 30/09): 2 nút việc hoàn thành + ô tìm + ô phạm vi
  const [xem, setXem] = useState<"" | KieuXong>("");
  const [xongApi, setXongApi] = useState<ViecApi[] | null>(null);
  const [tim, setTim] = useState("");
  const [pham, setPham] = useState<PhamViTim>("");
  const [mo, setMo] = useState("");
  const [moiGiao, setMoiGiao] = useState<Set<string>>(new Set());
  const [roi, setRoi] = useState("");
  const [lac, setLac] = useState<{ id: string; n: number } | null>(null);
  const [toast, setToast] = useState("");
  const [dangXep, setDangXep] = useState(false);
  const [bcGoc, setBcGoc] = useState<ViecO | null>(null);
  // Tóm tắt tiến độ dự án (13/10): mã dự án đang mở bảng ("" = đang ở sơ đồ) · có tràn toàn màn hình không · ô nào hiện icon
  const [tomTat, setTomTat] = useState("");
  const [ttRong, setTtRong] = useState(false);
  const [ttCo, setTtCo] = useState<{ co: Set<string>; nap: Set<string>; cho: Set<string>; xong: boolean }>({
    co: new Set(),
    nap: new Set(),
    cho: new Set(),
    xong: false,
  });
  const hen = useRef<number>();
  const keo = useKeoGiua("du-an");
  const toi = useToi();
  // Chuyển menu rồi quay lại: giữ ô đang chọn, bộ lọc, việc đang mở
  useNhoTrangThai("du-an", { chon, chiIssue, loc, mo, xem, tim, pham }, (v) => {
    if (v.chon) setChon(v.chon);
    if (v.chiIssue) setChiIssue(true);
    if (v.loc && NUT_LOC.some((n) => n.kieu === v.loc)) setLoc(v.loc); // bộ nhớ cũ "toi"/"he-thong" (nút đã bỏ) thì thôi
    if (v.mo) setMo(v.mo);
    if (v.xem === "xong_tuan" || v.xem === "xong_30") setXem(v.xem);
    if (typeof v.tim === "string") setTim(v.tim);
    if (v.pham && [...PHAM_VI_TIM, ...LOC_CHUYEN_TIEP].some((p) => p.kieu === v.pham)) setPham(v.pham);
  });

  const bao = useCallback((s: string) => {
    setToast(s);
    window.clearTimeout(hen.current);
    hen.current = window.setTimeout(() => setToast(""), 4000);
  }, []);
  const taiSoDo = useCallback(async () => {
    try {
      const d = await goiApi<DuLieu>("/api/phong/so-do");
      setDl(d);
      setGd(d.giai_doan ?? {});
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  const taiViec = useCallback(async () => {
    try {
      setViecApi((await goiApi<{ viec: ViecApi[] }>("/api/so-cai")).viec);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  // Việc nằm trên đường găng → dấu "!" đỏ trước tên (Mr. Đại chốt 05/10). Nạp riêng, chậm hơn sổ cái vì hỏi agent
  // Tiến độ — chưa về / hỏi lỗi thì danh sách vẫn hiện, chỉ chưa có dấu.
  const [gang, setGang] = useState<Set<string>>(new Set());
  const taiGang = useCallback(async () => {
    try {
      setGang(new Set((await goiApi<{ ids: string[] }>("/api/phong/viec-gang")).ids));
    } catch {
      /* thiếu dấu găng không chặn màn */
    }
  }, []);
  const taiTomTat = useCallback(async () => {
    try {
      const r = await goiApi<{ co: string[]; nap_duoc: string[]; chua_hoi_duoc?: string[] }>("/api/phong/tom-tat-tien-do");
      setTtCo({ co: new Set(r.co), nap: new Set(r.nap_duoc), cho: new Set(r.chua_hoi_duoc ?? []), xong: true });
    } catch {
      /* thiếu icon tóm tắt tiến độ không chặn màn */
    }
  }, []);
  useEffect(() => {
    void taiSoDo();
    void taiViec();
    void taiGang();
    void taiTomTat();
  }, [taiSoDo, taiViec, taiGang, taiTomTat]);
  const xongTu = dl?.tuan?.tu ?? "";
  useEffect(() => {
    if (!xongTu) return;
    goiApi<{ viec: ViecApi[] }>(`/api/so-cai/da-xong?tu=${xongTu}`)
      .then((r) => setXongApi(r.viec))
      .catch(() => setXongApi([]));
  }, [xongTu]);

  const bc = useMemo(() => (dl ? xepDuAn(dl.du_an ?? []) : null), [dl]);
  const cha = useMemo(() => {
    const m: Record<string, string> = {};
    if (bc) Object.entries(bc.con).forEach(([c, ds]) => ds.forEach((x) => (m[x] = c)));
    return m;
  }, [bc]);
  // Cây TỔ CHỨC (để tính "Việc thuộc hệ thống" và tên ô đơn vị trong chi tiết việc)
  const bcTc = useMemo(() => (dl ? xepSoDo(dl.o.map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu }))) : null), [dl]);
  const theoIdTc = useMemo(() => Object.fromEntries((dl?.o ?? []).map((o) => [o.id, o])), [dl]);
  const tenNganTc = useCallback((id: string) => (id === bcTc?.goc ? "Ban lãnh đạo" : (theoIdTc[id]?.ten_ngan ?? id)), [bcTc, theoIdTc]);
  const tenO = (id: string) => (id === G_SCI || id === G_KHAC ? bc?.ten[id] ?? id : (theoIdTc[id]?.ten_ngan ?? bc?.ten[id] ?? id));
  const tenDu = (id: string) => (id === G_SCI ? "Dự án SCI đầu tư" : id === G_KHAC ? "Dự án loại khác" : theoIdTc[id]?.ten ?? `Dự án ${bc?.ten[id] ?? id}`);

  const doiViec = useMemo(() => {
    if (!dl || !bcTc) return null;
    const coO = new Set(dl.o.map((o) => o.id));
    const lanhDao = new Set(dl.lanh_dao.map((l) => l.id));
    const oCua = (id: string | null) => (!id ? null : coO.has(id) ? id : lanhDao.has(id) ? bcTc.goc : null);
    const dvNguoi = Object.fromEntries(dl.nguoi.map((n) => [n.id, n.don_vi_id]));
    const tenNguoi = Object.fromEntries(dl.nguoi.map((n) => [n.id, n.ten]));
    return (v: ViecApi): ViecDa => ({
      ...chuyenViec(v, dl.hom_nay, oCua, dvNguoi, tenNguoi, Object.fromEntries(dl.lanh_dao.map((l) => [l.id, l.ten_ngan]))),
      da: duAnCuaViec(v.du_an, v.phan_viec.map((p) => p.phu_trach_id), dl.du_an ?? [], v.ten),
    });
  }, [dl, bcTc]);
  const viecDu: ViecDa[] = useMemo(() => (doiViec && viecApi ? viecApi.map(doiViec) : []), [doiViec, viecApi]);
  const xongDu: ViecDa[] = useMemo(() => (doiViec && xongApi ? xongApi.map(doiViec).filter((v) => v.da) : []), [doiViec, xongApi]);
  const khoangXong = useMemo(() => (dl?.tuan ? khoangXongCua(dl.tuan, dl.hom_nay) : null), [dl]);

  // Ba nút lọc ĐÍCH DANH (Mr. Đại chốt 28/09) — cùng Sơ đồ tổ chức: Việc tôi giao · Việc tôi nhận · Việc cần tôi phối hợp
  const tl = useMemo(() => toiLoc(toi, new Set((dl?.lanh_dao ?? []).map((l) => l.id))), [toi, dl]);
  const cuaDuAn = useMemo(
    () => (xem && khoangXong ? xongTrongKhoang(xongDu, khoangXong[xem]) : viecDu.filter((v) => v.da)),
    [viecDu, xongDu, xem, khoangXong],
  );
  const viec = useMemo(() => locViec(cuaDuAn, loc, tl) as ViecDa[], [cuaDuAn, loc, tl]);

  const cay = useCallback((id: string): string[] => (bc ? [id, ...(bc.con[id] ?? []).flatMap(cay)] : [id]), [bc]);
  const viecNhanh = useCallback(
    (id: string) => {
      const s = new Set(cay(id));
      return viec.filter((v) => v.da && s.has(v.da));
    },
    [viec, cay],
  );

  // Sân co giãn đều theo khung (kéo vạch giữa → sân thu nhỏ, không méo)
  const khungRef = useRef<HTMLDivElement>(null);
  const tgRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const k = khungRef.current;
    if (!k || !bc) return;
    const vua = () => {
      const tg = tgRef.current;
      if (!tg) return;
      const hep = window.innerWidth < 1000;
      // LE: lề hai bên chừa khi phóng to (04/10 — khung xanh Mr. Đại vẽ cách mép sân ~45px, giữ cỡ cây như trước khi bỏ lề thừa)
      const LE = 40;
      // ×0,9 (ô chữ quá to so với sơ đồ tổ chức) rồi +10% = ×0,99 (Mr. Đại 25/10/2026)
      const s = hep ? Math.max(0.6, Math.min(k.clientWidth / bc.W, 1)) : 0.99 * Math.min(k.clientWidth / (bc.W + 2 * LE), (k.clientHeight - 4) / bc.H, 1.3);
      const lx = hep ? 0 : Math.max(0, (k.clientWidth - bc.W * s) / 2);
      // 04/10 (Mr. Đại): cây đứng CHÍNH GIỮA cả sân theo chiều dọc — tính cả hàng nút phía trên (dau = khoảng từ đỉnh sân
      // tới đỉnh khung cây), không chỉ phần dưới hàng nút như trước (thấp hơn ~50px)
      const dau = k.parentElement ? k.getBoundingClientRect().top - k.parentElement.getBoundingClientRect().top : 0;
      const ty = hep ? 2 : Math.max(4, (k.clientHeight - dau - bc.H * s) / 2);
      tg.style.transform = `translate(${lx}px,${ty}px) scale(${s})`;
      k.style.height = hep ? `${bc.H * s + 8}px` : "";
    };
    vua();
    const ro = new ResizeObserver(vua);
    ro.observe(k);
    return () => ro.disconnect();
  }, [bc, viecApi === null, tomTat]);
  const bayGio = useRef(performance.now() / 1000);

  if (loi) return <div className="trong" style={{ color: "#fca5a5" }}>Không tải được menu Dự án: {loi}</div>;
  if (!dl || !bc || !viecApi) return <div className="trong" style={{ color: "#d6d3d1" }}>Đang tải menu Dự án…</div>;

  // Issue luôn đếm trên việc ĐANG MỞ
  const soTre = locViec(viecDu.filter((v) => v.da), loc, tl).filter((v) => v.tt === "tre").length;
  const NUT_XONG = khoangXong ? nutXong(dl.tuan.so, khoangXong) : [];
  // Số trên 2 nút Xong theo Ô DỰ ÁN ĐANG CHỌN + các ô bên dưới, cùng nút lọc — khớp danh sách bên phải (chốt 30/09)
  const oDangChon = new Set(cay(chon));
  const trongO = (ds: ViecDa[]) => (locViec(ds, loc, tl) as ViecDa[]).filter((v) => !!v.da && oDangChon.has(v.da));
  const demNut = (k: KieuXong) =>
    khoangXong
      ? { xong: trongO(xongTrongKhoang(xongDu, khoangXong[k])).length, moi: trongO(moiTrongKhoang([...viecDu, ...xongDu], khoangXong[k])).length }
      : { xong: 0, moi: 0 };
  const soXong = { xong_tuan: demNut("xong_tuan"), xong_30: demNut("xong_30") };
  const tenXem = xem ? (NUT_XONG.find((n) => n.kieu === xem)?.tieu_de ?? "") : "";
  const soLoc = Object.fromEntries(NUT_LOC.map((n) => [n.kieu, locViec(cuaDuAn, n.kieu, tl).length]));

  // ---------- Sân ----------
  // Đang bật Issue / Việc của tôi / Việc thuộc hệ thống: ô không còn việc nào (sau lọc) mờ đi, đường nối tới nó cũng mờ
  const biMo = (id: string) => {
    if (!chiIssue && !loc) return false;
    const ds = viecNhanh(id);
    return chiIssue ? !ds.some((y) => y.tt === "tre") : ds.length === 0;
  };
  const day: JSX.Element[] = [];
  Object.entries(bc.con).forEach(([c, ds]) =>
    ds.forEach((k) => {
      if (!bc.VT[k] || !bc.VT[c]) return;
      const d = duongNoi(bc, c, k);
      day.push(
        <g key={`${c}>${k}`} className={`nhanh-noi ${roi === c ? "sang" : ""} ${biMo(k) ? "mo-di" : ""}`}>
          <path className="noi" d={d} />
          <path className="tin" d={d} />
          <path data-gt="sd-duong-noi" className="noi-bam" d={d} style={{ cursor: "default" }} onMouseEnter={() => setRoi(c)} onMouseLeave={() => setRoi("")} />
        </g>,
      );
    }),
  );
  // Bật nút Tuần N / 30 ngày: mỗi ô ghi "Xong a · Mới b" (Mr. Đại chốt 30/09)
  const moiKy = xem && khoangXong ? (locViec(moiTrongKhoang([...viecDu, ...xongDu], khoangXong[xem]), loc, tl) as ViecDa[]) : [];
  const demMoi = (id: string) => {
    const s = new Set(cay(id));
    return moiKy.filter((v) => !!v.da && s.has(v.da)).length;
  };
  const coCay = new Set(dl.du_an.filter((d) => d.ma_tien_do).map((d) => d.id));
  // Mr. Đại chốt 13/10 chiều: dự án CÓ việc (đang mở, chưa lọc) mới hiện chức năng Tóm tắt tiến độ; 0 việc thì không hiện.
  // Đã nạp bảng → icon ba gạch; có việc mà chưa nạp tệp → dấu chấm than đỏ.
  const soViecMo: Record<string, number> = {};
  for (const v of viecDu) if (v.da) soViecMo[v.da] = (soViecMo[v.da] ?? 0) + 1;
  // Chưa biết dự án nào đã có bảng (danh sách chưa về) thì chưa vẽ icon — tránh nháy dấu chấm than đỏ sai ở dự án đã nạp
  const coTomTat = (id: string) => ttCo.xong && (soViecMo[id] ?? 0) > 0;
  const duAnTomTat = tomTat ? dl.du_an.find((a) => a.id === tomTat) : undefined;
  const tranManHinh = !!duAnTomTat && ttRong;
  // Nút «+» giao việc ngay trên ô dự án (Mr. Đại giao 20/10/2026, như trang thật congviec.scigroup.vn): bấm là mở form giao việc
  // đã chọn sẵn dự án đó. Không có quyền giao việc nào thì ẨN (luật riêng 3004, chốt 29/09).
  const laDuAn = new Set(dl.du_an.map((a) => a.id));
  const giaoDuocGi = dl.giao_duoc === "tat_ca" || (Array.isArray(dl.giao_duoc) && dl.giao_duoc.length > 0);
  const o = Object.keys(bc.VT).map((id, i) => {
    const v = bc.VT[id];
    const ds = viecNhanh(id);
    const tre = ds.filter((y) => y.tt === "tre").length;
    const lop = [`o c${bc.cap[id] ?? 4}`, "chi-giua", biMo(id) ? "mo-di" : "", id === chon && cheDo === "viec" ? "chon" : ""].join(" ");
    const tre6 = -((bayGio.current + i * 0.9) % 6);
    return (
      <div key={id} data-nut={id} className={lop} style={{ left: v.x - v.w / 2, top: v.y, width: v.w, height: v.h, ["--tre" as string]: `${tre6.toFixed(2)}s` }}>
        <div className={`khoi ${lac?.id === id ? "lac" : ""}`} key={lac?.id === id ? lac.n : 0}>
          {/* Mr. Đại chốt 03/10: dự án có cây WBS bên agent Tiến độ ("Mã bên Tiến độ" ở Cài đặt) → icon lịch bên trái ô, bấm vào
              Cây việc & đường găng của dự án đó. Dự án chưa có cây thì ẩn icon. */}
          {/* Mr. Đại giao 13/10: ngay DƯỚI icon cây việc là icon «Tóm tắt tiến độ dự án» (bản nháp nạp bằng Excel). Chỉ hiện ở dự án
              có việc: đã nạp bảng → ba gạch; chưa nạp → dấu chấm than đỏ. */}
          {(coCay.has(id) || coTomTat(id)) && (
            <span className="cot-nut-da">
              {coCay.has(id) && (
                <Link className="nut-cay-viec" href={`/cay-viec?du_an=${encodeURIComponent(id)}`} data-gt="da-cay-viec" title={`Cây việc & đường găng — ${tenDu(id)}`} aria-label={`Cây việc & đường găng — ${tenDu(id)}`}>
                  <IconCayViec />
                </Link>
              )}
              {coTomTat(id) && (
                <button
                  className={`nut-cay-viec nut-tom-tat${ttCo.co.has(id) ? "" : " thieu"}`}
                  data-gt={ttCo.co.has(id) ? "da-tom-tat" : "da-tom-tat-thieu"}
                  title={
                    ttCo.cho.has(id)
                      ? `Tóm tắt tiến độ dự án — ${tenDu(id)} (chưa hỏi được agent Tiến độ — bấm để xem lời báo)`
                      : ttCo.co.has(id)
                        ? `Tóm tắt tiến độ dự án — ${tenDu(id)}`
                        : `Chưa nạp bảng tóm tắt tiến độ — ${tenDu(id)}`
                  }
                  aria-label={ttCo.co.has(id) ? `Tóm tắt tiến độ dự án — ${tenDu(id)}` : `Chưa nạp bảng tóm tắt tiến độ — ${tenDu(id)}`}
                  onClick={() => {
                    setChon(id);
                    setCheDo("viec");
                    setTomTat(id);
                  }}
                >
                  {ttCo.co.has(id) ? <IconTomTat /> : "!"}
                </button>
              )}
            </span>
          )}
          <button
            className="giua"
            data-gt="da-o"
            title={`Việc của ${tenDu(id)}`}
            onClick={() => {
              setChon(id);
              setCheDo("viec");
              setLac({ id, n: Date.now() });
            }}
          >
            <span className="ten">{tenO(id)}</span>
            <span className="dem">
              {xem ? (
                <>Xong {ds.length} · Mới {demMoi(id)}</>
              ) : chiIssue ? (
                tre ? <span className="tre">{tre} trễ</span> : "không trễ"
              ) : (
                <>
                  {ds.length} việc{tre ? <> · <span className="tre">{tre} trễ</span></> : null}
                </>
              )}
            </span>
          </button>
          {/* Mr. Đại chốt 03/10: icon "!" bên PHẢI ô dự án có cây WBS → Issue của dự án (icon lịch bên trái → Cây việc).
              20/10: ngay DƯỚI Issue là «+» giao việc cho dự án này (không phải chọn dự án ở form nữa). */}
          {(coCay.has(id) || (laDuAn.has(id) && giaoDuocGi)) && (
            <span className="cot-nut-da ben-phai">
              {coCay.has(id) && (
                <Link className="nut-cay-viec nut-issue-da" href={`/cay-viec/issue?du_an=${encodeURIComponent(id)}`} data-gt="da-issue" title={`Cảnh báo — ${tenDu(id)}`} aria-label={`Cảnh báo — ${tenDu(id)}`}>
                  <IconIssue />
                </Link>
              )}
              {laDuAn.has(id) && giaoDuocGi && (
                <button
                  className="nut-cay-viec nut-giao-da"
                  data-gt="da-nut-giao-o"
                  title={`Giao việc cho dự án ${tenDu(id)}`}
                  aria-label={`Giao việc cho dự án ${tenDu(id)}`}
                  onClick={() => {
                    setChon(id);
                    setTomTat("");
                    setCheDo("giao");
                  }}
                >
                  +
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    );
  });

  // ---------- Cột phải ----------
  const duong: string[] = [];
  for (let x: string | undefined = chon; x; x = cha[x]) duong.unshift(x);
  const tuKhoa = boDau(tim.trim());
  const khop = (v: ViecO) => !tuKhoa || chuTimViec(v, tenNganTc).includes(tuKhoa);
  const oTim = <OTimViec pham={pham} setPham={setPham} tim={tim} setTim={setTim} />;
  const dau = laPhamTim(pham) && tuKhoa ? (
    <div className="phai-dau co-tim">
      {oTim}
      <b>{PHAM_VI_TIM.find((p) => p.kieu === pham)?.nhan} · dự án</b>
    </div>
  ) : (
    <div className="phai-dau co-tim" data-gt="duong-dan">
      {oTim}
      {duong.map((x, i) =>
        i < duong.length - 1 ? (
          <span key={x}>
            <button className="lk" onClick={() => (setChon(x), setCheDo("viec"))}>{tenO(x)}</button> ›{" "}
          </span>
        ) : (
          <b key={x}>
            {chiIssue ? "Quá hạn · " : ""}
            {xem ? `${tenXem} · ` : ""}
            {loc ? `${NUT_LOC.find((n) => n.kieu === loc)?.nhan ?? ""} · ` : ""}
            {tenDu(x)}
          </b>
        ),
      )}
    </div>
  );

  const xepNgay = async () => {
    setDangXep(true);
    try {
      const r = await goiApi<{ da_xep: number }>("/api/phong/giai-doan", { method: "POST", body: {} });
      await taiSoDo();
      bao(r.da_xep ? `🤖 Đã xếp ${r.da_xep} việc vào giai đoạn` : "🤖 Không còn việc nào chờ xếp (hoặc lượt nền đang chạy)");
    } catch (e) {
      bao(e instanceof Error ? e.message : String(e));
    } finally {
      setDangXep(false);
    }
  };

  let phai: React.ReactNode;
  if (cheDo === "giao") {
    const donVi = noiGiaoDichDanh(dl.o, dl.lanh_dao);
    phai = (
      <GiaoViec
        id=""
        laGoc={false}
        tenDu=""
        lanhDao={dl.lanh_dao}
        homNay={dl.hom_nay}
        duAn={{ ds: dl.du_an, chon: dl.du_an.some((a) => a.id === chon) ? chon : "", donVi }}
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
    let tatCa = viecNhanh(chon);
    if (chiIssue) tatCa = tatCa.filter((v) => v.tt === "tre");
    // Ô phạm vi CHỈ có tác dụng khi đang gõ tìm (chốt 30/09)
    // Lọc giao chuyển tiếp (chốt 21/10): lọc ngay danh sách đang hiện, không cần gõ chữ
    if (pham && !laPhamTim(pham)) tatCa = locChuyenTiep(tatCa, pham, new Set(dl.lanh_dao.map((l) => l.id)));
    if (laPhamTim(pham) && tuKhoa) {
      // Chọn phạm vi: mọi việc dự án (đang làm + đã xong) theo phạm vi, BỎ QUA nút lọc và ô dự án đang chọn
      const lanhDao = new Set(dl.lanh_dao.map((l) => l.id));
      const oToi = new Set((toi?.don_vi_ids ?? []).map((d) => (lanhDao.has(d) ? bcTc!.goc! : d)));
      const moVaXong = [...viecDu.filter((v) => v.da), ...xongDu.filter((x) => !viecDu.some((y) => y.ma === x.ma))];
      tatCa = locPhamVi(moVaXong, pham, oToi, tl);
    }
    tatCa = tatCa.filter(khop);
    const nhom: { ten: string; ds: ViecDa[]; chua?: boolean }[] = [];
    for (const [ma, ten] of GIAI_DOAN) {
      const ds = tatCa.filter((v) => gd[v.ma]?.giai_doan === ma);
      if (ds.length) nhom.push({ ten: `🤖 ${ten}`, ds: xepViec(ds) as ViecDa[] });
    }
    const chua = tatCa.filter((v) => !gd[v.ma]);
    if (chua.length) nhom.push({ ten: "🤖 chưa xếp giai đoạn", ds: xepViec(chua) as ViecDa[], chua: true });
    // Khối "Việc làm xong: Tuần N−1 và N" dưới nhóm giai đoạn cuối (Mr. Đại giao 01/10) — chỉ khi xem việc đang làm
    const kLamXong = dl.tuan ? khoangViecLamXong(dl.tuan, dl.hom_nay) : null;
    const sChon = new Set(cay(chon));
    const lamXong =
      kLamXong && !chiIssue && !xem && !(laPhamTim(pham) && tuKhoa) && !(pham && !laPhamTim(pham))
        ? (xongMoiTruoc((locViec(xongDu, loc, tl) as ViecDa[]).filter((v) => v.da && sChon.has(v.da)).filter(khop), kLamXong) as ViecDa[])
        : [];
    const dongViec = (v: ViecDa) => (
              <DongViec
                key={v.ma}
                v={v}
                mo={mo === v.ma}
                moi={moiGiao.has(v.ma)}
                gang={!v.xongNgay && gang.has(v.ma)}
                homNay={dl.hom_nay}
                tenNgan={tenNganTc}
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
                  if (on && v.da) document.querySelector(`.gd-phong .o[data-nut="${v.da}"]`)?.classList.add("sang");
                }}
                giaiDoan={v.xongNgay ? undefined : {
                  ma: gd[v.ma]?.giai_doan ?? null,
                  lyDo: gd[v.ma]?.ly_do ?? null,
                  nguon: gd[v.ma]?.nguon ?? null,
                  doi: async (ma) => {
                    await goiApi("/api/phong/giai-doan", { method: "PUT", body: { cong_viec_id: v.ma, giai_doan: ma } });
                    setGd((x) => ({ ...x, [v.ma]: { giai_doan: ma as GiaiDoanViec["giai_doan"], ly_do: null, nguon: "nguoi", nguoi_sua: toi?.id ?? null } }));
                    bao(`Đã chuyển ${v.ma} sang giai đoạn ${GIAI_DOAN.find((x) => x[0] === ma)?.[1] ?? ma}`);
                  },
                }}
              />
    );
    phai = (
      <>
        {dau}
        {nhom.length === 0 && (
          <div className="trong">
            {tuKhoa ? "Không tìm thấy việc nào." : chiIssue ? "Không có việc trễ." : xem ? "Không có việc hoàn thành trong khoảng này." : "Chưa có việc nào của dự án này trong sổ cái."}
          </div>
        )}
        {nhom.map((g) => (
          <div key={g.ten}>
            <div className="nhom-viec" data-gt={g.chua ? "da-chua-xep" : g.ten.startsWith("Phối hợp") ? "nhom-phoi-hop" : "da-giai-doan"}>
              <span>{g.ten}</span>
              <span>
                {g.chua && toi?.la_quan_tri && (
                  <button className="nut-chu" disabled={dangXep} onClick={() => void xepNgay()} title="Bình thường máy tự xếp 2 phút một lượt">
                    {dangXep ? "🤖 đang xếp…" : "🤖 Xếp ngay"}
                  </button>
                )}{" "}
                {g.ds.length}
              </span>
            </div>
            <DsTheoNguoi ds={g.ds} ve={(v) => dongViec(v as ViecDa)} tenChung="Việc chung — giao cả đơn vị" />
          </div>
        ))}
        {kLamXong && lamXong.length ? (
          <div className="khoi-xong">
            <button className="dong-khoi-xong" data-gt="khoi-viec-lam-xong" aria-expanded={moXong} title={kLamXong.giai_thich} onClick={() => setMoXong((b) => !b)}>
              <span>{moXong ? "▾" : "▸"}</span> {kLamXong.nhan}
              <span className="so">{lamXong.length}</span>
            </button>
            {moXong && <DsTheoNguoi ds={lamXong} ve={(v) => dongViec(v as ViecDa)} tenChung="Việc chung" />}
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div className="so-do" ref={keo.khungRef} style={tranManHinh ? { ...keo.kieuKhung, gridTemplateColumns: "minmax(0, 1fr)" } : keo.kieuKhung}>
      {xem && <KhaiHuongDan ma="viec-xem-da-xong" uuTien={1} />}
      {duAnTomTat ? (
        <TomTatTienDo
          duAn={{ id: duAnTomTat.id, ten: duAnTomTat.ten }}
          homNay={dl.hom_nay}
          rong={ttRong}
          doiRong={() => setTtRong((b) => !b)}
          dong={() => setTomTat("")}
          sauNap={() => void taiTomTat()}
        />
      ) : (
      <section className="san">
        <div className="san-dau">
          <span className="cap" data-gt="da-chu-giai"><i className="m1" style={{ ["--m" as string]: "var(--c1)" }} />nhóm</span>
          <span className="cap" data-gt="da-chu-giai"><i className="m2" style={{ ["--m" as string]: "var(--c2)" }} />Ban QLDA</span>
          <span className="cap" data-gt="da-chu-giai"><i className="m4" style={{ ["--m" as string]: "var(--c4)" }} />dự án</span>
          <div className="day-nut">
            <button className="nut-san nut-loc" data-gt="da-nut-giao" aria-pressed={cheDo === "giao"} onClick={() => setCheDo((c) => (c === "giao" ? "viec" : "giao"))} title="Giao việc gắn với một dự án">
              ＋ Giao việc
            </button>
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
                  setCheDo("viec");
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
      </section>
      )}
      {!tranManHinh && keo.vach}
      <section className="phai" key={`${cheDo}-${chon}`} style={tranManHinh ? { display: "none" } : undefined}>
        <div className="vao">{phai}</div>
      </section>
      {bcGoc && <HopBaoCaoGoc v={bcGoc} dong={() => setBcGoc(null)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/** Icon lịch có thanh tiến độ bậc thang (hình Mr. Đại gửi 03/10) — lối vào Cây việc & đường găng của dự án */
export function IconCayViec({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="4" width="19" height="17" rx="3" />
      <path d="M7.5 2.5v3M16.5 2.5v3M2.5 8.5h19" />
      <rect x="5.5" y="11" width="4.5" height="2" rx="0.8" />
      <rect x="8.5" y="13" width="5" height="2" rx="0.8" />
      <rect x="12" y="15" width="4.5" height="2" rx="0.8" />
      <rect x="15" y="17" width="3.5" height="1.6" rx="0.8" />
    </svg>
  );
}

/** Icon "!" trong vòng tròn — lối vào Issue của dự án */
export function IconIssue({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M12 7v6.5" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" />
    </svg>
  );
}
