// ============================================================
// TÓM TẮT TIẾN ĐỘ — VẼ BẢNG LẤY TỪ AGENT TIẾN ĐỘ (Mr. Đại duyệt 26/10/2026)
// Chép đúng cách vẽ Gantt agent Tiến độ khi bấm «C3» (5-Agent-tien-do/src/components/tabs/planning/MiniGantt.tsx, màu
// lib/mau-do-hoa.ts): thanh Tiến độ mục tiêu cam ở trên (29/10: mặc định ẩn, nút «Tiến độ mục tiêu» mới hiện) · thanh Baseline
// xanh lá (găng tới mốc COD: VIỀN ĐỎ mảnh, lõi vẫn xanh — 29/10/2026) · mốc = hình vuông xoay 45° (cả việc 0 ngày) · dòng nhóm xanh lá
// hai đầu tam giác chúc xuống (26/10) · thực hiện = nét trắng mảnh TRÙNG TIM thanh Baseline · dự báo = nét trắng ĐỨT (đỏ khi găng ở lượt dự báo)
// · vạch Hôm nay vàng · COD mục tiêu cam · COD Baseline xanh lá · COD dự báo trắng nét đứt.
// Số, ngày, câu nhanh/chậm đều do agent Tiến độ tính (cổng tiendo.bang_gantt) — ở đây chỉ vẽ.
// ============================================================
import type { ReactNode } from "react";
import { fmtSo } from "@/lib/format";
import { cachNgay, khoangNgay, ngayVN } from "@/lib/phong/tuan";
import { type BanTomTat, type DongTomTat, type TienDoBang } from "@/lib/tom-tat-tien-do/thuan";

/** Màu — đúng bảng MAU của agent Tiến độ (lib/mau-do-hoa.ts) */
export const MAU_TD = {
  mucTieu: "#f97316",
  baseline: "#22c55e",
  gang: "#ef4444",
  thucTe: "#ffffff",
  vang: "#fbbf24",
  xam: "#6b7280",
} as const;
const DAY_KH = 6; // bề dày thanh kế hoạch
const DAY_TH = 3; // bề dày nét thực hiện / dự báo = ½
const DUT_MANH = "5 3";
/** Cùng bộ chữ số đều với hộp chi tiết bên agent Tiến độ (font-mono của Tailwind) */
const DONG_DEU = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
/** Viền đỏ mảnh quanh thanh / mốc găng (Mr. Đại 29/10/2026 — như MiniGantt agent Tiến độ VIEN_GANG) */
const VIEN_GANG = 1;
const DUT_VACH = "4 3";

/** Toạ độ dọc trong một dòng cao `cao`: có Tiến độ mục tiêu thì hai làn (cam trên, xanh dưới), không thì một làn giữa */
export function lanTD(cao: number, coMucTieu: boolean) {
  const yKh = coMucTieu ? cao / 2 + 1 : (cao - DAY_KH) / 2;
  return { yMt: cao / 2 - 1 - DAY_KH, yKh, yTh: yKh + (DAY_KH - DAY_TH) / 2 };
}

export function VeDongTD({ d, yDong, cao, dau, px, coMucTieu }: { d: DongTomTat; yDong: number; cao: number; dau: string; px: number; coMucTieu: boolean }) {
  const t = d.td;
  if (!t) return null;
  const x = (iso: string) => cachNgay(dau, iso) * px;
  const xHet = (iso: string) => (cachNgay(dau, iso) + 1) * px;
  const { yMt, yKh, yTh } = lanTD(cao, coMucTieu);
  const nhom = t.nhom;
  const ra: ReactNode[] = [];
  // Mốc MỤC TIÊU (việc 0 ngày — 29/10/2026): hình vuông xoay 45° tô đặc cam
  if (t.muc_tieu && coMucTieu && t.moc)
    ra.push(<rect key="mt-moc" x={-4} y={-4} width={8} height={8} fill={MAU_TD.mucTieu} transform={`translate(${x(t.muc_tieu.bd)} ${yDong + yMt + DAY_KH / 2}) rotate(45)`} />);
  else if (t.muc_tieu && coMucTieu)
    ra.push(<rect key="mt" x={x(t.muc_tieu.bd)} y={yDong + yMt} width={Math.max(2, xHet(t.muc_tieu.kt) - x(t.muc_tieu.bd))} height={DAY_KH} rx={1} fill={MAU_TD.mucTieu} fillOpacity={nhom ? 0.5 : 0.95} />);
  const vien = t.gang ? { stroke: MAU_TD.gang, strokeWidth: VIEN_GANG } : {};
  if (t.moc) {
    const xm = x(t.ke_hoach.bd);
    ra.push(<rect key="moc" x={-4} y={-4} width={8} height={8} fill={MAU_TD.baseline} {...vien} transform={`translate(${xm} ${yDong + yKh + DAY_KH / 2}) rotate(45)`} />);
    // Mốc ĐÃ ĐẠT: hình thoi trắng CÙNG CỠ hình thoi xanh, tại ngày đạt thực tế
    if (t.thuc_te?.xong)
      ra.push(<rect key="moc-dat" x={-4} y={-4} width={8} height={8} fill={MAU_TD.thucTe} transform={`translate(${x(t.thuc_te.kt)} ${yDong + yKh + DAY_KH / 2}) rotate(45)`} />);
    // Mốc CHƯA ĐẠT có ngày dự báo (29/10/2026): hình thoi RỖNG viền trắng tại ngày dự báo — như MiniGantt agent Tiến độ
    else if (t.du_bao)
      ra.push(<rect key="moc-db" x={-4} y={-4} width={8} height={8} fill="none" stroke={MAU_TD.thucTe} strokeWidth={1.2} transform={`translate(${x(t.du_bao.kt)} ${yDong + yKh + DAY_KH / 2}) rotate(45)`} />);
  } else if (nhom) {
    const k = t.thanh_nhom ?? t.ke_hoach;
    if (k.bd) {
      const x1 = x(k.bd);
      const w = Math.max(2, xHet(k.kt) - x1);
      // Mr. Đại 26/10/2026: thân liền hết chiều dài + tam giác chúc xuống ở hai đầu (như bảng nạp tay; agent Tiến độ đổi theo)
      const yDuoi = yDong + yKh + DAY_KH;
      const m = Math.min(6, w / 2);
      ra.push(
        <g key="nhom" fill={MAU_TD.baseline}>
          <rect x={x1} y={yDong + yKh} width={w} height={DAY_KH} />
          <polygon points={`${x1},${yDuoi} ${x1 + m},${yDuoi} ${x1},${yDuoi + 5}`} />
          <polygon points={`${x1 + w},${yDuoi} ${x1 + w - m},${yDuoi} ${x1 + w},${yDuoi + 5}`} />
        </g>,
      );
    }
  } else {
    ra.push(<rect key="kh" x={x(t.ke_hoach.bd)} y={yDong + yKh} width={Math.max(2, xHet(t.ke_hoach.kt) - x(t.ke_hoach.bd))} height={DAY_KH} rx={2} fill={MAU_TD.baseline} {...vien} />);
  }
  if (t.thuc_te && !t.moc)
    ra.push(<rect key="tt" x={x(t.thuc_te.bd)} y={yDong + yTh} width={Math.max(2, xHet(t.thuc_te.kt) - x(t.thuc_te.bd))} height={DAY_TH} fill={MAU_TD.thucTe} fillOpacity={nhom ? 0.75 : 1} />);
  // 26/10/2026: ngày báo cáo → hôm nay chưa có số — nét XÁM liền (như màn Gantt agent Tiến độ)
  if (t.cho_bao_cao && !t.moc)
    ra.push(<rect key="cho" x={x(t.cho_bao_cao.bd)} y={yDong + yTh} width={Math.max(2, xHet(t.cho_bao_cao.kt) - x(t.cho_bao_cao.bd))} height={DAY_TH} fill={MAU_TD.xam} fillOpacity={nhom ? 0.75 : 1} />);
  if (t.du_bao && !t.moc) {
    const x1 = x(t.du_bao.bd);
    ra.push(
      <line
        key="db"
        x1={x1}
        y1={yDong + yTh + DAY_TH / 2}
        x2={x1 + Math.max(2, xHet(t.du_bao.kt) - x1)}
        y2={yDong + yTh + DAY_TH / 2}
        stroke={t.gang_du_bao ? MAU_TD.gang : MAU_TD.thucTe}
        strokeWidth={DAY_TH}
        strokeDasharray={DUT_MANH}
        opacity={nhom && t.thuc_te ? 0.6 : 0.95}
      />,
    );
  }
  return <g>{ra}</g>;
}

/** Ba vạch COD dọc cả thân đồ hoạ */
export function VachCodTD({ td, dau, cuoi, px, cao, anMucTieu }: { td: TienDoBang; dau: string; cuoi: string; px: number; cao: number; anMucTieu?: boolean }) {
  const vach: { iso: string | null; mau: string; dut: boolean; ten: string }[] = [
    { iso: anMucTieu ? null : td.cod_muc_tieu, mau: MAU_TD.mucTieu, dut: false, ten: "COD mục tiêu" },
    { iso: td.cod_baseline, mau: MAU_TD.baseline, dut: false, ten: "COD Baseline" },
    { iso: td.cod_du_bao, mau: MAU_TD.thucTe, dut: true, ten: "COD dự báo" },
  ];
  return (
    <g>
      {vach
        .filter((v) => v.iso && v.iso >= dau && v.iso <= cuoi)
        .map((v) => {
          const xv = cachNgay(dau, v.iso!) * px;
          return (
            <line key={v.ten} x1={xv} y1={0} x2={xv} y2={cao} stroke={v.mau} strokeWidth={1.5} strokeOpacity={0.85} strokeDasharray={v.dut ? DUT_VACH : undefined}>
              <title>{`${v.ten} ${ngayVN(v.iso)}`}</title>
            </line>
          );
        })}
    </g>
  );
}

/** Chú giải — chỉ ký hiệu đang có trên bảng */
export function ChuGiaiTD({ ban, soHien, anMucTieu }: { ban: BanTomTat; soHien: number; anMucTieu?: boolean }) {
  const td = ban.tien_do!;
  const o = (mau: string, chu: string, kieu: "thanh" | "gang" | "manh" | "dut" | "vach" | "vach-dut" = "thanh") => (
    <span key={chu}>
      <svg width="18" height="8" aria-hidden>
        {kieu === "thanh" && <rect x="0" y="1" width="18" height="6" rx="1" fill={mau} />}
        {kieu === "gang" && <rect x="0.5" y="1" width="17" height="6" rx="1" fill={MAU_TD.baseline} stroke={mau} strokeWidth={VIEN_GANG} />}
        {kieu === "manh" && <rect x="0" y="2.5" width="18" height="3" fill={mau} />}
        {kieu === "dut" && <line x1="0" y1="4" x2="18" y2="4" stroke={mau} strokeWidth="3" strokeDasharray={DUT_MANH} />}
        {kieu === "vach" && <line x1="9" y1="0" x2="9" y2="8" stroke={mau} strokeWidth="2" />}
        {kieu === "vach-dut" && <line x1="9" y1="0" x2="9" y2="8" stroke={mau} strokeWidth="2" strokeDasharray="2 2" />}
      </svg>
      {chu}
    </span>
  );
  return (
    <div className="tt-chu" data-gt="tt-chu-giai-td">
      {td.co_muc_tieu && !anMucTieu && o(MAU_TD.mucTieu, "Tiến độ mục tiêu")}
      {o(MAU_TD.baseline, "Baseline")}
      {o(MAU_TD.gang, "đường găng", "gang")}
      {o(MAU_TD.thucTe, "thực hiện", "manh")}
      {ban.dong.some((d) => d.td?.cho_bao_cao) && o(MAU_TD.xam, "chưa có báo cáo", "manh")}
      {o(MAU_TD.thucTe, "dự báo", "dut")}
      {o(MAU_TD.vang, "hôm nay", "vach")}
      {td.cod_muc_tieu && !anMucTieu && o(MAU_TD.mucTieu, `COD mục tiêu ${ngayVN(td.cod_muc_tieu)}`, "vach")}
      {td.cod_baseline && o(MAU_TD.baseline, `COD Baseline ${ngayVN(td.cod_baseline)}`, "vach")}
      {td.cod_du_bao && o(MAU_TD.thucTe, `COD dự báo ${ngayVN(td.cod_du_bao)}`, "vach-dut")}
      <span className="tt-nguon">
        Lấy từ agent Tiến độ
        {td.lay_luc && Date.now() - Date.parse(td.lay_luc) > 5 * 60_000 && (
          <b style={{ color: "#FBBF24" }}> lúc {new Date(td.lay_luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })} — số mới chưa về (agent Tiến độ đang tính hoặc chưa trả lời), mở lại bảng sau ít phút</b>
        )}{" "}
        · Baseline{td.phien_ban_baseline ? ` v${td.phien_ban_baseline}` : ""}
        {td.baseline_duyet_luc ? ` duyệt ${ngayVN(td.baseline_duyet_luc.slice(0, 10))}` : ""}
        {td.ngay_bao_cao ? ` · số báo cáo tới ${ngayVN(td.ngay_bao_cao)}` : " · chưa có ngày báo cáo nên chưa vẽ nét thực hiện"} · {soHien}/{ban.dong.length} dòng
      </span>
    </div>
  );
}

/** Hộp rê chuột — cùng thứ tự dòng với hộp chi tiết Gantt agent Tiến độ */
export function NoiDungHopTD({ d, td }: { d: DongTomTat; td: TienDoBang | undefined }) {
  const t = d.td!;
  const dong = (nhan: string, giaTri: ReactNode, mau?: string) => (
    <div className="tt-hop-dong" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#A8A29E" }}>{nhan}</span>
      <span style={{ color: mau, textAlign: "right" }}>{giaTri}</span>
    </div>
  );
  if (!d.ma) {
    // dòng tên dự án
    return (
      <>
        <b>{t.ten}</b>
        {t.muc_tieu && dong("Tiến độ mục tiêu:", khoangNgay(t.muc_tieu.bd, t.muc_tieu.kt), MAU_TD.mucTieu)}
        {t.baseline_duyet && dong("Baseline:", khoangNgay(t.baseline_duyet.bd, t.baseline_duyet.kt), MAU_TD.baseline)}
        {td?.cod_muc_tieu && dong("COD mục tiêu:", ngayVN(td.cod_muc_tieu), MAU_TD.mucTieu)}
        {td?.cod_baseline && dong("COD Baseline:", ngayVN(td.cod_baseline), MAU_TD.baseline)}
        {td?.cod_du_bao && dong("COD dự báo:", ngayVN(td.cod_du_bao))}
      </>
    );
  }
  // Hộp việc: vẽ đúng cấu trúc agent Tiến độ dựng sẵn (cùng bộ với màn Gantt · Lập tiến độ bên đó) — không tự ghép chữ, không tự chọn màu
  const h = t.hop;
  if (!h) return <b>{d.ma} {t.ten}</b>;
  return (
    <>
      <b style={{ color: "var(--hop-sang,#F5F5F4)" }}>
        {h.ma} {h.ten}
      </b>
      {h.dong.map((x) => (
        <div key={x.nhan} className="tt-hop-dong" style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <span style={{ color: "var(--hop-xam,#A8A29E)", whiteSpace: "nowrap" }}>{x.nhan}</span>
          <span style={{ color: x.mau, textAlign: "right", fontFamily: DONG_DEU, fontVariantNumeric: "tabular-nums", fontWeight: x.nhan === "% thực tế:" ? 700 : undefined }}>{x.chu}</span>
        </div>
      ))}
      {h.ghiChu.map((g, i) => (
        <div key={i} style={{ color: g.mau, fontSize: 11.5, lineHeight: 1.35, marginTop: 2 }}>
          {g.chu}
        </div>
      ))}
      {h.cham.length > 0 && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--hop-ke,#44403C)", textAlign: "right" }}>
          {h.cham.map((c, i) => (
            <div key={i} style={{ color: c.mau }}>
              {c.chu}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
