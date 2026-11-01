"use client";
// ============================================================
// TomTatTienDo — bảng «TÓM TẮT TIẾN ĐỘ DỰ ÁN» ở menu Dự án (Mr. Đại giao 13/10/2026).
// BẢN NHÁP để xem bằng mắt: nạp một tệp Excel sáu cột (WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc), máy vẽ thành
// Gantt. KHÔNG nối với sổ cái, cây việc & đường găng, agent Tiến độ — không vẽ quan hệ giữa các việc.
// Danh mục khối (theo lời giao + ảnh Gantt agent Tiến độ anh gửi):
//   hàng nút: «← Quay lại» · tên dự án · C2 · C3 · Full (bung tới cấp WBS nào) · − · + (thu, phóng trục ngày) · «Tải file» (ai cũng
//             tải được — tệp .xlsx đúng khuôn nạp, sửa tay rồi nạp ngược lại) · «Nạp tiến độ» (CHỈ người của Ban QLDA dự án —
//             không có quyền thì ẨN, nếp 3004) · nút toàn màn hình (đồ hoạ tràn sang cả khu việc bên phải)
//   bảng trái: WBS · Công việc · Đơn vị · KL · Bắt đầu · Kết thúc — cột KL rộng vừa số dài nhất; dòng cha có tam giác ▼ / ▶ bung, thu
//             hai cột Bắt đầu · Kết thúc MẶC ĐỊNH ĐÓNG, bấm mũi tên nhỏ sát chữ «KL» mới bung ra (Mr. Đại 13/10 — ngày đã có ở
//             đồ hoạ và hộp rê chuột)
//   vạch giữa: rê chuột vào biên giữa bảng và đồ hoạ, giữ và kéo để chia lại bề rộng (bấm đúp trả về; nhớ theo máy người xem)
//   đồ hoạ:    tiêu đề hai tầng «T4/26» trên, «W18·27/4» dưới · vạch dọc «Hôm nay» · thanh cấp 1–2 cam, cấp 3 trở xuống xám (Mr. Đại
//              đổi 26/10); thanh nhóm dày bằng việc lá, thêm tam giác chúc xuống hai đầu · đường dóng hàng, dóng cột (đầu tháng đậm, đầu tuần nhạt)
//   rê chuột lên một dòng: hộp chi tiết — mã + tên việc, đơn vị · khối lượng, khoảng ngày kèm số ngày (luật 31), còn bao ngày kết thúc
// ============================================================
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { fmtSo } from "@/lib/format";
import { cachNgay, ngayVN } from "@/lib/phong/tuan";
import { capWbs, cotPctTH, chuNgayDong, conBaoNgay, ngayTrucTienDo, trucTomTat, wbsCoCon, type BanTomTat, type DongTomTat, type TienDoBang } from "@/lib/tom-tat-tien-do/thuan";
import { ChuGiaiTD, NoiDungHopTD, VachCodTD, VeDongTD } from "./TomTatGanttTD";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const CAO_DONG = 26;
const CAO_DAU = 40;
const RONG_WBS = 66;
const RONG_DV = 58;
/**
 * Kẻ dọc theo tuần chỉ khi một tuần rộng ≥ ngần này px (Mr. Đại 30/10/2026). Bảng này tự co vừa khung nên mức mặc định hẹp (≈ 8 px/tuần)
 * và mỗi lần «+» chỉ ×1,3: ngưỡng 20 px (như agent Tiến độ) phải bấm «+» 4 lần mới hiện → hạ về 12 px để hiện ở lần «+» thứ 2.
 */
const RONG_TUAN_KE_DOC = 12;
const RONG_NGAY = 80;
const RONG_TEN_MAC_DINH = 250;
const RONG_TEN_NHO_NHAT = 140;
const RONG_TRAI_NHO_NHAT = 110;
/** Màu theo cấp WBS — Mr. Đại định nghĩa 13/10, đổi 26/10: cấp 1 – 2 cam; cấp 3 trở xuống xám (luật 18) */
const MAU_CAP = ["#F97316", "#F97316"];
const MAU_CAP_SAU = "#A8A29E";
const mauCap = (cap: number) => MAU_CAP[cap - 1] ?? MAU_CAP_SAU;
const PX_NHO_NHAT = 0.4;
const PX_LON_NHAT = 16;
const KHOA_NHO = "tt-rong-trai";

type CapToi = 2 | 3 | 0; // 0 = Full

interface TraVe {
  ban: BanTomTat | null;
  nap_duoc: boolean;
  canh_bao?: string[];
}

interface HopReRef {
  hien: (d: DongTomTat, x: number, y: number) => void;
  doi: (x: number, y: number) => void;
  an: () => void;
}

/** Hộp chi tiết đi theo chuột — giữ trạng thái RIÊNG để rê chuột không vẽ lại cả bảng */
const HopRe = forwardRef<HopReRef, { homNay: string; td?: TienDoBang }>(function HopRe({ homNay, td }, ref) {
  const [d, setD] = useState<DongTomTat | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const vt = useRef({ x: 0, y: 0 });
  const dat = useCallback(() => {
    const e = el.current;
    if (!e) return;
    const r = e.getBoundingClientRect();
    const x = Math.min(vt.current.x + 14, window.innerWidth - r.width - 8);
    const y = vt.current.y + 18 + r.height > window.innerHeight ? vt.current.y - r.height - 10 : vt.current.y + 18;
    e.style.left = `${Math.max(8, x)}px`;
    e.style.top = `${Math.max(8, y)}px`;
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      hien: (dong, x, y) => {
        vt.current = { x, y };
        setD(dong);
      },
      doi: (x, y) => {
        vt.current = { x, y };
        dat();
      },
      an: () => setD(null),
    }),
    [dat],
  );
  useLayoutEffect(dat, [d, dat]);
  if (!d) return null;
  if (d.td)
    return (
      <div className="tt-hop-re" ref={el} role="tooltip" style={{ minWidth: 300, maxWidth: 380 }}>
        <NoiDungHopTD d={d} td={td} />
      </div>
    );
  return (
    <div className="tt-hop-re" ref={el} role="tooltip">
      <b style={{ color: mauCap(capWbs(d.wbs)) }}>
        {d.wbs} {d.ten}
      </b>
      {(d.don_vi || d.khoi_luong !== null) && (
        <div>
          Khối lượng: {d.khoi_luong !== null ? fmtSo(d.khoi_luong, 2) : "—"} {d.don_vi ?? ""}
        </div>
      )}
      <div>{chuNgayDong(d)}</div>
      <div className="tt-con">{conBaoNgay(d, homNay)}</div>
    </div>
  );
});

export function IconTomTat() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 5.5h9M7 12h11M11 18.5h10" />
    </svg>
  );
}

function IconRong({ dang }: { dang: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {dang ? <path d="M10 14l-6 6M10 14v5M10 14H5M14 10l6-6M14 10V5M14 10h5" /> : <path d="M4 20l6-6M4 20v-5M4 20h5M20 4l-6 6M20 4v5M20 4h-5" />}
    </svg>
  );
}

export function TomTatTienDo({
  duAn,
  homNay,
  rong,
  doiRong,
  dong,
  sauNap,
}: {
  duAn: { id: string; ten: string };
  homNay: string;
  /** đang tràn toàn màn hình (che khu việc bên phải) */
  rong: boolean;
  doiRong: () => void;
  /** «Quay lại» */
  dong: () => void;
  sauNap?: () => void;
}) {
  const [dl, setDl] = useState<TraVe | null>(null);
  const [loi, setLoi] = useState("");
  const [canhBao, setCanhBao] = useState<string[]>([]);
  const [dangNap, setDangNap] = useState(false);
  // Dòng cha đang THU (ẩn mọi dòng bên dưới). Nút C2 · C3 · Full đặt cả loạt; tam giác ở từng dòng bật, tắt riêng dòng đó.
  const [thu, setThu] = useState<Set<string>>(new Set());
  const [capNut, setCapNut] = useState<CapToi | null>(0);
  const [px, setPx] = useState(0); // điểm ảnh mỗi ngày; 0 = chưa đo khung
  const [rongTrai, setRongTrai] = useState(0); // bề rộng bảng việc bên trái vạch kéo; 0 = chưa đo
  const [dangKeo, setDangKeo] = useState(false);
  const [moNgay, setMoNgay] = useState(false); // hai cột Bắt đầu · Kết thúc: thường đóng
  // Mr. Đại 29/10/2026: đường Tiến độ mục tiêu (cam) THƯỜNG XUYÊN ẨN — mỗi lần mở bảng đều ẩn, bấm nút mới hiện
  const [hienMucTieu, setHienMucTieu] = useState(false);
  const khung = useRef<HTMLDivElement>(null);
  const oTep = useRef<HTMLInputElement>(null);
  const hop = useRef<HopReRef>(null);

  useEffect(() => {
    let huy = false;
    setDl(null);
    setLoi("");
    setCanhBao([]);
    setPx(0);
    setThu(new Set());
    setCapNut(0);
    goiApi<TraVe>(`/api/phong/tom-tat-tien-do?du_an=${encodeURIComponent(duAn.id)}`)
      .then((r) => !huy && setDl(r))
      .catch((e) => !huy && setLoi(e instanceof Error ? e.message : String(e)));
    return () => {
      huy = true;
    };
  }, [duAn.id]);

  const tatCa = dl?.ban?.dong ?? null;
  // Bảng lấy từ agent Tiến độ (26/10/2026): trục phủ cả thanh mục tiêu, thanh nhóm, dự báo và ba vạch COD
  const td = dl?.ban?.tien_do;
  const dongBo = !!td;
  const truc = useMemo(() => (tatCa ? trucTomTat(tatCa, homNay, dl?.ban?.tien_do ? ngayTrucTienDo(dl.ban) : []) : null), [tatCa, homNay, dl]);
  const coCon = useMemo(() => wbsCoCon(tatCa ?? []), [tatCa]);
  const capSauNhat = useMemo(() => Math.max(1, ...(tatCa ?? []).map((d) => capWbs(d.wbs))), [tatCa]);
  const hien = useMemo(() => {
    if (!thu.size) return tatCa ?? [];
    return (tatCa ?? []).filter((d) => {
      for (let i = d.wbs.indexOf("."); i > 0; i = d.wbs.indexOf(".", i + 1)) if (thu.has(d.wbs.slice(0, i))) return false;
      return true;
    });
  }, [tatCa, thu]);
  // Cột KL rộng vừa đủ số dài nhất (Mr. Đại 13/10) — chữ số rộng đều ~7 px ở cỡ 12
  const rongKl = useMemo(() => {
    if (dongBo) {
      // cột «% TH» (29/10/2026): rộng vừa «100%», không nhỏ hơn tiêu đề cột + mũi tên bung cột ngày
      const dai = Math.max(4, ...(tatCa ?? []).map((d) => cotPctTH(d.td, fmtSo).chu.length));
      return Math.max(58, Math.round(dai * 7 + 14));
    }
    const dai = Math.max(2, ...(tatCa ?? []).map((d) => (d.khoi_luong === null || coCon.has(d.wbs) ? 0 : fmtSo(d.khoi_luong, 2).length)));
    return Math.max(46, Math.round(dai * 7 + 14)); // 46: đủ chữ «KL» + mũi tên bung cột ngày
  }, [tatCa, coCon, dongBo]);
  // Bảng lấy từ agent Tiến độ: không còn cột «Đơn vị» (Mr. Đại 29/10/2026) — chỉ WBS · Công việc · % TH
  const rongKhac = RONG_WBS + (dongBo ? 0 : RONG_DV) + rongKl + (moNgay ? RONG_NGAY * 2 : 0);
  const rongTen = Math.max(RONG_TEN_NHO_NHAT, rongTrai - rongKhac);

  // Lần đầu có dữ liệu (và mỗi lần khung đổi cỡ vì bật / tắt toàn màn hình): chia bảng – đồ hoạ, rồi cho cả trục vừa phần còn lại
  // (không nhỏ quá 1,2 điểm ảnh mỗi ngày — tuần còn nhìn ra)
  useLayoutEffect(() => {
    const k = khung.current;
    if (!k) return;
    if (!rongTrai || rongTrai > k.clientWidth - 80) {
      let nho = 0;
      try {
        nho = Number(localStorage.getItem(KHOA_NHO)) || 0;
      } catch {
        /* không có bộ nhớ trình duyệt: dùng mặc định */
      }
      const macDinh = Math.min(rongKhac + RONG_TEN_MAC_DINH, Math.max(180, k.clientWidth - 260));
      setRongTrai(nho >= RONG_TRAI_NHO_NHAT && nho <= k.clientWidth - 80 ? nho : macDinh);
      return;
    }
    if (px || !truc) return;
    setPx(Math.min(6, Math.max(1.2, (k.clientWidth - rongTrai - 6) / truc.soNgay)));
  }, [px, truc, tatCa, rongTrai, rongKhac]);
  useEffect(() => setPx(0), [rong]);
  // Khung hẹp lại (kéo vạch giữa trang, đổi cỡ cửa sổ) mà bảng việc đang rộng hơn khung → thu bảng lại cho còn thấy đồ hoạ và vạch kéo
  const coBang = !!tatCa;
  useEffect(() => {
    const k = khung.current;
    if (!k) return;
    const ro = new ResizeObserver(() => setRongTrai((r) => (r > k.clientWidth - 80 ? Math.max(RONG_TRAI_NHO_NHAT, k.clientWidth - 260) : r)));
    ro.observe(k);
    return () => ro.disconnect();
  }, [coBang]);

  const nap = async (tep: File) => {
    setDangNap(true);
    setLoi("");
    try {
      const fd = new FormData();
      fd.set("du_an", duAn.id);
      fd.set("tep", tep);
      const r = await goiApi<TraVe>("/api/phong/tom-tat-tien-do", { form: fd });
      setDl({ ban: r.ban, nap_duoc: true });
      setCanhBao(r.canh_bao ?? []);
      setThu(new Set());
      setCapNut(0);
      setPx(0);
      sauNap?.();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDangNap(false);
      if (oTep.current) oTep.current.value = "";
    }
  };

  const rongDo = truc && px ? Math.max(120, Math.round(truc.soNgay * px)) : 0;
  const caoThan = hien.length * CAO_DONG;

  // ---------- đồ hoạ ----------
  const dauDo = useMemo(() => {
    if (!truc || !px) return null;
    let truocT = -Infinity;
    let truocW = -Infinity;
    const veTuan = px * 7 >= RONG_TUAN_KE_DOC;
    // Chữ «Hôm nay» nằm ở tầng tuần, ngay cạnh vạch; nhãn tuần nào chạm vào nó thì nhường chỗ
    const coHomNay = homNay >= truc.dau && homNay <= truc.cuoi;
    const xVach = (cachNgay(truc.dau, homNay) + 0.5) * px;
    const xChu = Math.min(xVach + 4, rongDo - 52);
    const chamHomNay = (x: number) => coHomNay && x + 54 > xChu - 4 && x < xChu + 54;
    return (
      <svg className="tt-do-dau" width={rongDo} height={CAO_DAU}>
        {truc.thang.map((m) => {
          const x = m.ngay * px;
          const co = x - truocT >= 40;
          if (co) truocT = x;
          return (
            <g key={m.iso}>
              <line x1={x} y1={0} x2={x} y2={CAO_DAU} className="tt-ke-thang" />
              {co && (
                <text x={x + 4} y={14} className="tt-nhan-thang">
                  {m.nhan}
                </text>
              )}
            </g>
          );
        })}
        {truc.tuan.map((w) => {
          const x = w.ngay * px;
          const co = x - truocW >= 56 && !chamHomNay(x);
          if (co) truocW = x;
          return (
            <g key={w.iso}>
              {veTuan && <line x1={x} y1={CAO_DAU / 2} x2={x} y2={CAO_DAU} className="tt-ke-tuan" />}
              {co && (
                <text x={x + 3} y={CAO_DAU - 6} className="tt-nhan-tuan">
                  {w.nhan}
                </text>
              )}
            </g>
          );
        })}
        <line x1={0} y1={CAO_DAU / 2} x2={rongDo} y2={CAO_DAU / 2} className="tt-ke-tuan" />
        {coHomNay && (
          <>
            <line x1={xVach} y1={CAO_DAU / 2} x2={xVach} y2={CAO_DAU} className="tt-ke-hom-nay" />
            <text x={xChu} y={CAO_DAU - 6} className="tt-nhan-hom-nay">
              Hôm nay
            </text>
          </>
        )}
      </svg>
    );
  }, [truc, px, rongDo, homNay]);

  const thanDo = useMemo(() => {
    if (!truc || !px) return null;
    const veTuan = px * 7 >= RONG_TUAN_KE_DOC;
    const xHomNay = homNay >= truc.dau && homNay <= truc.cuoi ? (cachNgay(truc.dau, homNay) + 0.5) * px : null;
    return (
      <svg className="tt-do" width={rongDo} height={caoThan}>
        {veTuan && truc.tuan.map((w) => <line key={w.iso} x1={w.ngay * px} y1={0} x2={w.ngay * px} y2={caoThan} className="tt-ke-tuan" />)}
        {truc.thang.map((m) => (
          <line key={m.iso} x1={m.ngay * px} y1={0} x2={m.ngay * px} y2={caoThan} className="tt-ke-thang" />
        ))}
        {td && hien.map((d, i) => <VeDongTD key={d.wbs} d={d} yDong={i * CAO_DONG} cao={CAO_DONG} dau={truc.dau} px={px} coMucTieu={td.co_muc_tieu && hienMucTieu} />)}
        {td && <VachCodTD td={td} dau={truc.dau} cuoi={truc.cuoi} px={px} cao={caoThan} anMucTieu={!hienMucTieu} />}
        {!td && hien.map((d, i) => {
          const bd = d.bat_dau ?? d.ket_thuc;
          const kt = d.ket_thuc ?? d.bat_dau;
          if (!bd || !kt || kt < bd) return null;
          const mau = mauCap(capWbs(d.wbs));
          const yTam = i * CAO_DONG + CAO_DONG / 2;
          const x1 = cachNgay(truc.dau, bd) * px;
          const w = (cachNgay(bd, kt) + 1) * px;
          if (bd === kt) {
            const xm = x1 + px / 2;
            return <polygon key={d.wbs} points={`${xm - 6},${yTam} ${xm},${yTam - 6} ${xm + 6},${yTam} ${xm},${yTam + 6}`} fill={mau} />;
          }
          if (coCon.has(d.wbs)) {
            // dòng nhóm (Mr. Đại 26/10): thanh DÀY BẰNG việc lá, thêm tam giác chúc xuống ở hai đầu để nhận ra là nhóm
            const m = Math.min(6, w / 2);
            return (
              <g key={d.wbs} fill={mau}>
                <rect x={x1} y={yTam - 5.5} width={Math.max(w, 2)} height={11} />
                <polygon points={`${x1},${yTam + 5.5} ${x1 + m},${yTam + 5.5} ${x1},${yTam + 11}`} />
                <polygon points={`${x1 + w},${yTam + 5.5} ${x1 + w - m},${yTam + 5.5} ${x1 + w},${yTam + 11}`} />
              </g>
            );
          }
          return <rect key={d.wbs} x={x1} y={yTam - 5.5} width={Math.max(w, 2)} height={11} rx={2} fill={mau} />;
        })}
        {xHomNay !== null && <line x1={xHomNay} y1={0} x2={xHomNay} y2={caoThan} className="tt-ke-hom-nay" />}
      </svg>
    );
  }, [truc, px, rongDo, caoThan, hien, coCon, homNay, td, hienMucTieu]);

  const batTat = useCallback((wbs: string) => {
    setCapNut(null);
    setThu((s) => {
      const m = new Set(s);
      if (!m.delete(wbs)) m.add(wbs);
      return m;
    });
  }, []);

  const cacDong = useMemo(
    () =>
      hien.map((d) => {
        const cap = capWbs(d.wbs);
        const nhom = coCon.has(d.wbs);
        const dangThu = thu.has(d.wbs);
        // Bảng lấy từ Tiến độ: chữ như dòng cùng cấp, KHÔNG đỏ khi găng (Mr. Đại 29/10/2026 — găng thấy bằng viền đỏ của thanh). Nạp tay: cấp 1 – 2 cam
        const mau = d.td ? undefined : cap <= 2 ? mauCap(cap) : undefined;
        return (
          <div key={d.wbs} className={`tt-dong${nhom ? " nhom" : ""}`} style={{ height: CAO_DONG }}>
            {/* Mr. Đại 29/10/2026: hộp chi tiết CHỈ hiện khi rê ở bảng việc bên trái; rê trên đồ hoạ thì không */}
            <div
              className="tt-trai"
              onMouseEnter={(e) => hop.current?.hien(d, e.clientX, e.clientY)}
              onMouseMove={(e) => hop.current?.doi(e.clientX, e.clientY)}
              onMouseLeave={() => hop.current?.an()}
            >
              <span className="tt-o c-wbs" style={{ color: mau }}>
                {d.ma ?? d.wbs}
              </span>
              <span className="tt-o c-ten" style={{ paddingLeft: 3 + (cap - 1) * 10, color: mau }}>
                {nhom ? (
                  <button className="tt-tg" data-gt="tt-tam-giac" aria-expanded={!dangThu} title={dangThu ? "Bung các dòng bên dưới" : "Thu các dòng bên dưới"} aria-label={`${dangThu ? "Bung" : "Thu"} ${d.wbs} ${d.ten}`} onClick={() => batTat(d.wbs)}>
                    {dangThu ? "▶" : "▼"}
                  </button>
                ) : (
                  <i className="tt-tg" />
                )}
                <span className="tt-ten-chu">{d.ten}</span>
              </span>
              {!d.td && <span className="tt-o c-dv giua">{nhom ? "" : (d.don_vi ?? "")}</span>}
              {d.td ? (
                // «% TH»: trắng «—» chưa làm · xanh đang làm · vàng vượt (cùng nguyên tắc cột «% TH» Gantt agent Tiến độ)
                <span className={`tt-o c-kl phai-so pct-${cotPctTH(d.td, fmtSo).mau}`}>{cotPctTH(d.td, fmtSo).chu}</span>
              ) : (
                <span className="tt-o c-kl phai-so">{nhom || d.khoi_luong === null ? "" : fmtSo(d.khoi_luong, 2)}</span>
              )}
              <span className="tt-o c-ngay giua">{ngayVN(d.bat_dau)}</span>
              <span className="tt-o c-ngay giua">{ngayVN(d.ket_thuc)}</span>
            </div>
          </div>
        );
      }),
    [hien, coCon, thu, batTat],
  );

  const datCap = (c: CapToi) => {
    setCapNut(c);
    setThu(c ? new Set([...coCon].filter((w) => capWbs(w) >= c)) : new Set());
  };

  const phong = (heSo: number) => {
    const k = khung.current;
    const moi = Math.min(PX_LON_NHAT, Math.max(PX_NHO_NHAT, px * heSo));
    if (k && px) {
      // giữ ngày đang ở giữa khung đứng yên khi thu, phóng
      const giua = k.scrollLeft + (k.clientWidth - rongTrai) / 2;
      requestAnimationFrame(() => (k.scrollLeft = Math.max(0, (giua / px) * moi - (k.clientWidth - rongTrai) / 2)));
    }
    setPx(moi);
  };

  // Vạch kéo giữa bảng việc và đồ hoạ: kéo trái thì cột Công việc hẹp dần rồi các cột bên phải khuất sau đồ hoạ; kéo phải thì ngược lại
  const batDauKeo = (e: React.PointerEvent<HTMLDivElement>) => {
    const k = khung.current;
    if (!k || e.button !== 0) return;
    e.preventDefault();
    hop.current?.an();
    setDangKeo(true);
    const x0 = e.clientX;
    const r0 = rongTrai;
    const toiDa = k.clientWidth - 80;
    let cuoi = r0;
    const di = (ev: PointerEvent) => {
      cuoi = Math.round(Math.min(toiDa, Math.max(RONG_TRAI_NHO_NHAT, r0 + ev.clientX - x0)));
      setRongTrai(cuoi);
    };
    const tha = () => {
      window.removeEventListener("pointermove", di);
      window.removeEventListener("pointerup", tha);
      setDangKeo(false);
      try {
        localStorage.setItem(KHOA_NHO, String(cuoi));
      } catch {
        /* bỏ qua */
      }
    };
    window.addEventListener("pointermove", di);
    window.addEventListener("pointerup", tha);
  };
  // Bung / đóng hai cột ngày: bảng việc rộng ra / hẹp lại đúng bằng hai cột đó, đồ hoạ giữ nguyên tỉ lệ
  const doiMoNgay = () => {
    const k = khung.current;
    const them = moNgay ? -RONG_NGAY * 2 : RONG_NGAY * 2;
    setRongTrai((r) => Math.round(Math.min((k?.clientWidth ?? 9999) - 80, Math.max(RONG_TRAI_NHO_NHAT, r + them))));
    setMoNgay(!moNgay);
  };
  const traVeKeo = () => {
    try {
      localStorage.removeItem(KHOA_NHO);
    } catch {
      /* bỏ qua */
    }
    setRongTrai(0);
    setPx(0);
  };

  const ban = dl?.ban ?? null;
  const NUT_CAP: { cap: CapToi; nhan: string; goi: string }[] = [
    // Bảng lấy từ Tiến độ có thêm dòng tên dự án làm cấp 1 → cấp ở đây = cấp bên Tiến độ + 1 (kiểm lần 8 CT-4)
    { cap: 2, nhan: "C2", goi: dongBo ? "Chỉ bung tới cấp 2 — cấp 1 là tên dự án, cấp 2 là giai đoạn (cấp 1 bên agent Tiến độ)" : "Chỉ bung tới cấp WBS 2" },
    { cap: 3, nhan: "C3", goi: dongBo ? "Chỉ bung tới cấp 3 — cấp 1 là tên dự án (= cấp 2 bên agent Tiến độ)" : "Chỉ bung tới cấp WBS 3" },
    { cap: 0, nhan: "Full", goi: "Bung toàn bộ các cấp WBS" },
  ];
  const COT_DAU: { lop: string; nhan: string; goi?: string }[] = [
    { lop: "c-wbs", nhan: "WBS" },
    { lop: "c-ten", nhan: "Công việc" },
    ...(dongBo ? [] : [{ lop: "c-dv", nhan: "Đơn vị" }]),
    dongBo
      ? { lop: "c-kl", nhan: "% TH", goi: "% thực hiện thực tế (số của agent Tiến độ). Khối lượng thực hiện / thiết kế xem ở hộp rê chuột" }
      : { lop: "c-kl", nhan: "KL", goi: "Khối lượng" },
    { lop: "c-ngay", nhan: "Bắt đầu" },
    { lop: "c-ngay", nhan: "Kết thúc" },
  ];
  const bien = { ["--tt-trai" as string]: `${rongTrai}px`, ["--tt-ten" as string]: `${rongTen}px`, ["--tt-kl" as string]: `${rongKl}px` } as React.CSSProperties;

  return (
    <section className="san san-tt" data-gt="tom-tat-tien-do">
      <KhaiHuongDan ma="du-an-tom-tat-tien-do" uuTien={2} />
      <div className="tt-dau">
        <button className="nut-san" data-gt="tt-quay-lai" onClick={dong} title="Quay lại sơ đồ dự án">
          ← Quay lại
        </button>
        <b className="tt-ten">Tóm tắt tiến độ dự án · {duAn.ten}</b>
        <div className="tt-nut">
          {ban && (
            <>
              <span className="tt-cum">
                {NUT_CAP.filter((n) => !n.cap || n.cap < capSauNhat).map((n) => (
                  <button key={n.nhan} className="nut-san" data-gt={`tt-cap:${n.nhan}`} aria-pressed={capNut === n.cap} title={n.goi} onClick={() => datCap(n.cap)}>
                    {n.nhan}
                  </button>
                ))}
              </span>
              <span className="tt-cum">
                <button className="nut-san" data-gt="tt-thu" disabled={px <= PX_NHO_NHAT} title="Thu nhỏ trục ngày" aria-label="Thu nhỏ trục ngày" onClick={() => phong(1 / 1.3)}>
                  −
                </button>
                <button className="nut-san" data-gt="tt-phong" disabled={px >= PX_LON_NHAT} title="Phóng to trục ngày" aria-label="Phóng to trục ngày" onClick={() => phong(1.3)}>
                  +
                </button>
              </span>
            </>
          )}
          {/* Mr. Đại 29/10/2026 (lần 2): «Tiến độ mục tiêu» đứng BÊN TRÁI «Tải file» */}
          {td?.co_muc_tieu && (
            <button
              className="nut-san"
              data-gt="tt-muc-tieu"
              aria-pressed={hienMucTieu}
              title={hienMucTieu ? "Đang hiện đường Tiến độ mục tiêu (cam) — bấm để ẩn" : "Hiện đường Tiến độ mục tiêu (cam) và vạch COD mục tiêu"}
              onClick={() => setHienMucTieu((v) => !v)}
            >
              Tiến độ mục tiêu
            </button>
          )}
          {dl?.nap_duoc && (
            <>
              <button className="nut-san" data-gt="tt-nap" disabled={dangNap} title="Nạp tệp Excel sáu cột: WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc. Nạp lại thì thay bảng đang có." onClick={() => oTep.current?.click()}>
                {dangNap ? "Đang nạp…" : "Nạp tiến độ"}
              </button>
              <input ref={oTep} type="file" accept=".xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && void nap(e.target.files[0])} />
            </>
          )}
          {dl && (
            <a
              className="nut-san"
              data-gt="tt-tai"
              href={`/api/phong/tom-tat-tien-do?du_an=${encodeURIComponent(duAn.id)}&tai=1`}
              title={ban ? "Tải bảng đang hiện về dạng Excel (.xlsx) — sửa tay rồi nạp ngược trở lại" : "Tải tệp Excel mẫu (sáu cột) để điền rồi nạp lên"}
            >
              Tải file
            </a>
          )}
          <button className="nut-san tt-nut-rong" data-gt="tt-rong" aria-pressed={rong} title={rong ? "Thu về khu bên trái" : "Toàn màn hình — đồ hoạ tràn sang cả bên phải"} aria-label={rong ? "Thu về khu bên trái" : "Toàn màn hình"} onClick={doiRong}>
            <IconRong dang={rong} />
          </button>
        </div>
      </div>

      {ban && td && <ChuGiaiTD ban={ban} soHien={hien.length} anMucTieu={!hienMucTieu} />}
      {ban && !td && (
        <div className="tt-chu">
          <span>
            <i style={{ background: MAU_CAP[0] }} />
            {capSauNhat > 1 ? "cấp 1 – 2" : "cấp 1"}
          </span>
          {capSauNhat > 2 && (
            <span>
              <i style={{ background: MAU_CAP_SAU }} />
              cấp 3 trở xuống
            </span>
          )}
          <span className="tt-nguon">
            Bản nháp · {hien.length}/{ban.dong.length} dòng · tệp «{ban.ten_tep}» · {ban.nap_boi_ten} nạp {ngayVN(ban.nap_luc.slice(0, 10))}
          </span>
        </div>
      )}
      {loi && <div className="tt-bao loi">{loi}</div>}
      {canhBao.length > 0 && (
        <div className="tt-bao">
          <button className="tt-tat" aria-label="Tắt lời nhắc" title="Tắt lời nhắc" onClick={() => setCanhBao([])}>
            ×
          </button>
          Đã nạp {ban?.dong.length ?? 0} dòng. Máy nhắc:
          <ul>
            {canhBao.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {!dl && !loi && <div className="tt-trong">Đang tải bảng tóm tắt tiến độ…</div>}
      {dl && !ban && (
        <div className="tt-trong">
          Dự án này chưa có bảng tóm tắt tiến độ.
          {dl.nap_duoc ? (
            <> Bấm «Tải file» lấy tệp Excel mẫu (sáu cột: WBS · Công việc · Đơn vị · Khối lượng · Bắt đầu · Kết thúc), điền xong bấm «Nạp tiến độ».</>
          ) : (
            <> Người của Ban QLDA dự án nạp tệp thì bảng sẽ hiện ở đây.</>
          )}
        </div>
      )}
      {ban && !truc && <div className="tt-trong">Tệp đã nạp không có dòng nào ghi ngày bắt đầu hoặc kết thúc nên chưa vẽ được đồ hoạ.</div>}

      {ban && (
        <div className={`tt-vung${moNgay ? "" : " dong-ngay"}`} style={bien}>
          <div className="tt-khung" ref={khung} data-gt="tt-khung" onScroll={() => hop.current?.an()}>
            <div className="tt-trong-khung" style={{ width: rongTrai + rongDo }}>
              <div className="tt-hang-dau" style={{ height: CAO_DAU }}>
                <div className="tt-trai">
                  {COT_DAU.map((c) => (
                    <span key={c.nhan} className={`tt-o dau ${c.lop}`} title={c.goi}>
                      {c.nhan}
                      {c.lop === "c-kl" && (
                        <button className="tt-mo-ngay" data-gt="tt-mo-ngay" aria-expanded={moNgay} title={moNgay ? "Đóng hai cột Bắt đầu · Kết thúc" : "Bung hai cột Bắt đầu · Kết thúc"} aria-label={moNgay ? "Đóng hai cột Bắt đầu, Kết thúc" : "Bung hai cột Bắt đầu, Kết thúc"} onClick={doiMoNgay}>
                          {moNgay ? "◀" : "▶"}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {dauDo}
              </div>
              <div className="tt-than" style={{ height: caoThan }}>
                {thanDo}
                {cacDong}
              </div>
            </div>
          </div>
          {rongTrai > 0 && (
            <div
              className={`tt-keo${dangKeo ? " dang" : ""}`}
              data-gt="tt-keo"
              role="separator"
              aria-orientation="vertical"
              style={{ left: rongTrai - 4 }}
              title="Giữ chuột và kéo sang trái, phải để chia lại bề rộng bảng việc và đồ hoạ · bấm đúp để trả về"
              onPointerDown={batDauKeo}
              onDoubleClick={traVeKeo}
            />
          )}
        </div>
      )}
      <HopRe ref={hop} homNay={homNay} td={td} />
    </section>
  );
}
