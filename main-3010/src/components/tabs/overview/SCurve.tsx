"use client";

import { Chart as ChartJS, registerables } from "chart.js";
import { Line } from "react-chartjs-2";
import type { LechNgay, SCurveDayDu, SCurvePoint } from "@/lib/scurve-kieu";
import { ngayTrongChu } from "@/lib/ngay-hien";
import { fmtPct } from "@/lib/format";

ChartJS.register(...registerables);

const GRID = "#2a2a2a";
const TICKS = "#a8a8a8";

/** "2026-09-21" → "21/09/2026" */
const dmy = (iso: string): string => iso.split("-").reverse().join("/");

/** Phần "= ±N ngày" của một dòng rê chuột (6a) — số do CODE phía tiến độ tính sẵn */
function chuLech(l: LechNgay | undefined, laMucTieu: boolean): string {
  if (laMucTieu) return " = 0 ngày";
  if (l === undefined || l === null) return "";
  if (l === "vuot") return " = vượt đường mục tiêu";
  return ` = ${l > 0 ? "+" : l < 0 ? "−" : ""}${Math.abs(l)} ngày`;
}

/**
 * S-Curve tiến độ tổng thể — BỐN đường theo PLAN-AGENT-TIEN-DO mục 6:
 *   Mục tiêu (cam) · Baseline (xanh lá) · Thực tế (xanh dương) · Dự báo (xám đứt).
 * CHỈ HIỂN THỊ — mọi số (lệch ngày, ngày cắt, ngày đạt 100%, ghi chú) do
 * `lib/du-bao/s-curve` tính. ⚠ Bản sao y hệt ở repo Main.
 * Trục X tuyến tính theo NGÀY (`x`): điểm thứ Hai, điểm ngày cắt và điểm đạt
 * 100% nằm đúng vị trí ngày của nó; nhãn trục là số tuần.
 * Rê chuột (Mr. Đại chốt 24/09): tiêu đề "W39 · 21/09/2026" (+ "ngày cắt dữ
 * liệu …" ở điểm ngày cắt); mỗi dòng "Tên: x% = ±N ngày" so Mục tiêu, âm =
 * chậm (6a). Đường đã đạt 100% thì DỪNG — rê chuột sau đó ghi "đã xong 100%
 * ngày … (việc cuối: …)", không ghi "100%".
 */
export function SCurve({
  height = 320,
  points,
  ngayCatDuLieu,
  ghiChu,
  dat100,
  cauTapViec,
  viecKhongNoi,
}: {
  height?: number;
  /** Số THẬT từ tinhSCurveDayDu (du-bao/s-curve-doc.ts) — BẮT BUỘC */
  points: SCurvePoint[];
  /** Ngày cắt dữ liệu — hiện "Dự báo tính đến dữ liệu ngày …" */
  ngayCatDuLieu?: string | null;
  /** Ghi chú code sinh (kỳ vọng mâu thuẫn, dự báo sau COD…) */
  ghiChu?: string[];
  /** Ngày từng đường đạt 100% + việc cuối (tiendo.s_curve `dat100`) */
  dat100?: SCurveDayDu["dat100"] | null;
  /** "tính trên N việc nối tới mốc COD …" (tiendo.s_curve `cauTapViec`) */
  cauTapViec?: string;
  /** Việc kế hoạch xong trước COD mà không nối tới mốc COD — khối cảnh báo riêng */
  viecKhongNoi?: SCurveDayDu["viecKhongNoi"];
}) {
  // x = số ngày từ thứ Hai đầu tiên (bản tiến độ cũ chưa có x → 7 ngày/điểm)
  const xCua = (p: SCurvePoint, i: number): number => (typeof p.x === "number" ? p.x : i * 7);
  const diemTuan = points.map((p, i) => ({ p, x: xCua(p, i) })).filter(({ p }) => !p.nhan);
  const buoc = Math.max(1, Math.ceil(diemTuan.length / 14));
  const moc = diemTuan.filter((_, i) => i % buoc === 0);
  const nhanTaiX = new Map(moc.map(({ p, x }) => [x, p.week]));
  const xy = (k: "target" | "baseline" | "actual" | "forecast") =>
    points.map((p, i) => ({ x: xCua(p, i), y: p[k] ?? null }));
  const dong: { khoa: keyof NonNullable<SCurveDayDu["dat100"]>; ten: string }[] = [
    { khoa: "mucTieu", ten: "Mục tiêu (CĐT)" },
    { khoa: "baseline", ten: "Baseline (KH)" },
    { khoa: "thucTe", ten: "Thực tế" },
    { khoa: "duBao", ten: "Dự báo (NS 7 ngày)" },
  ];
  // Thứ tự dataset cố định — khoá lệch ngày tương ứng
  const khoaLech: (keyof NonNullable<SCurvePoint["lechNgay"]> | "mucTieu")[] = [
    "mucTieu",
    "baseline",
    "thucTe",
    "duBao",
  ];

  const data = {
    datasets: [
      {
        label: "Mục tiêu (CĐT)",
        data: xy("target"),
        borderColor: "#c2724f",
        backgroundColor: "#c2724f",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
      },
      {
        label: "Baseline (KH)",
        data: xy("baseline"),
        borderColor: "#4ade80",
        backgroundColor: "#4ade80",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
      },
      {
        label: "Thực tế",
        data: xy("actual"),
        borderColor: "#60a5fa",
        backgroundColor: "#60a5fa",
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
      },
      {
        label: "Dự báo (NS 7 ngày)",
        data: xy("forecast"),
        borderColor: "#888",
        backgroundColor: "#888",
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.35,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        labels: { color: "#a8a8a8", boxWidth: 20, boxHeight: 2, font: { size: 11 } },
      },
      tooltip: {
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const p = points[items[0]?.dataIndex ?? 0];
            if (!p) return "";
            const ngay = p.ngay ?? p.ngayDauTuan;
            return (ngay ? `${p.week} · ${dmy(ngay)}` : p.week) + (p.nhan ? ` — ${p.nhan}` : "");
          },
          // Đường đã đạt 100% trước điểm này: "đã xong 100% ngày … (việc cuối: …)"
          afterBody: (items: { dataIndex: number }[]) => {
            const p = points[items[0]?.dataIndex ?? 0];
            const ngay = p?.ngay ?? p?.ngayDauTuan;
            if (!p || !ngay || !dat100) return [];
            const ra: string[] = [];
            for (const d of dong) {
              const x = dat100[d.khoa];
              if (!x || ngay <= x.ngayDat100) continue;
              ra.push(
                ` ${d.ten}: đã xong 100% ngày ${dmy(x.ngayDat100)} (việc cuối: ${x.viecCuoi.wbs} ${x.viecCuoi.ten}` +
                  `${x.ghiChu ? ` — ${x.ghiChu}` : ""})`
              );
            }
            return ra;
          },
          label: (ctx: {
            dataset: { label?: string };
            datasetIndex: number;
            dataIndex: number;
            parsed: { y: number | null };
          }) => {
            if (ctx.parsed.y === null) return "";
            const p = points[ctx.dataIndex];
            const khoa = khoaLech[ctx.datasetIndex];
            const lech =
              khoa === "mucTieu" ? chuLech(null, true) : chuLech(khoa ? p?.lechNgay?.[khoa] : undefined, false);
            return ` ${ctx.dataset.label ?? ""}: ${fmtPct(ctx.parsed.y)}${lech}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear" as const,
        min: 0,
        max: points.length > 0 ? xCua(points[points.length - 1], points.length - 1) : 0,
        grid: { color: GRID },
        afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
          axis.ticks = moc.map(({ x }) => ({ value: x }));
        },
        ticks: {
          color: TICKS,
          maxRotation: 0,
          autoSkip: false,
          font: { size: 10 },
          callback: (v: string | number) => nhanTaiX.get(Number(v)) ?? "",
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: GRID },
        ticks: {
          color: TICKS,
          font: { size: 10 },
          callback: (v: string | number) => `${v}%`,
        },
      },
    },
  };

  return (
    <div>
      <div style={{ height }}>
        <Line data={data} options={options} />
      </div>
      {(ngayCatDuLieu !== undefined || cauTapViec || (ghiChu && ghiChu.length > 0)) && (
        <div className="mt-1 space-y-0.5 text-[10.5px] text-text-muted">
          {cauTapViec && <div>Bốn đường {ngayTrongChu(cauTapViec)}.</div>}
          {ngayCatDuLieu !== undefined && (
            <div>
              {ngayCatDuLieu
                ? `Dự báo tính đến dữ liệu ngày ${dmy(ngayCatDuLieu)} (kiểu MS Project; việc đang làm theo năng suất 7 ngày gần nhất) · rê chuột: "= ±N ngày" so đường Mục tiêu, âm = chậm`
                : "Chưa có báo cáo nào mang ngày — đường Dự báo tạm bằng kế hoạch nội bộ"}
            </div>
          )}
          {(ghiChu ?? []).map((c) => (
            <div key={c}>⚠ {ngayTrongChu(c)}</div>
          ))}
        </div>
      )}
      {/* KHỐI CẢNH BÁO RIÊNG (Mr. Đại chốt 24/09 tối) — việc không nối tới mốc
          COD không vẽ vào bốn đường; chữ thuần, không khung (luật 28) */}
      {viecKhongNoi && viecKhongNoi.length > 0 && (
        <div className="mt-2 text-[10.5px] text-text-muted">
          <div className="font-bold text-text-secondary">
            ⚠ {viecKhongNoi.length} việc kế hoạch xong trước COD nhưng không nối quan hệ tới mốc COD — người lập
            tiến độ cần nối hoặc xác nhận (không tính vào bốn đường):
          </div>
          {viecKhongNoi.slice(0, 8).map((v) => (
            <div key={v.wbs}>
              {v.wbs} {v.ten} — kế hoạch xong {dmy(v.ketThuc)}
            </div>
          ))}
          {viecKhongNoi.length > 8 && (
            <details>
              <summary className="cursor-pointer text-text-secondary">Xem đủ {viecKhongNoi.length} việc</summary>
              {viecKhongNoi.slice(8).map((v) => (
                <div key={v.wbs}>
                  {v.wbs} {v.ten} — kế hoạch xong {dmy(v.ketThuc)}
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </div>
  );
}
