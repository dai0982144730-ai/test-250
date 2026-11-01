// «Tuần này khác tuần trước» — biểu đồ + bảng + vài gạch đầu dòng kết luận (Mr. Đại duyệt 28/10/2026).
// Chỉ vẽ mô hình do `dungTuanKhac` (CODE) tính; không tính số nào ở đây.
// Màu ba đường = màu đường trong khối S-Curve cùng trang (luật 18: màu truy về một định nghĩa).
// Một độ đậm cho cả khối (nguyên tắc 1): phân cấp bằng cỡ chữ, màu, nhãn viết hoa.

import type { MoHinhTuanKhac } from "@/lib/bang-dieu-hanh/tuan-khac";
import { ngayVN } from "@/lib/ngay-hien";
import { fmtSo } from "@/lib/format";

const MAU = { thuc: "#f97316", base: "#3b82f6", mucTieu: "#a855f7" } as const;
const TEN_DUONG = { "muc-tieu": "Tiến độ mục tiêu", baseline: "Baseline", "thuc-te": "Thực tế" } as const;
const MAU_DUONG = { "muc-tieu": MAU.mucTieu, baseline: MAU.base, "thuc-te": MAU.thuc } as const;

const NHAN = "text-[10.5px] uppercase tracking-[0.07em] text-text-muted";
const mauDoi = (h: "tot" | "xau" | "trung") => (h === "tot" ? "text-green" : h === "xau" ? "text-red" : "text-text-secondary");

function BieuDoLuyKe({ m }: { m: MoHinhTuanKhac }) {
  const W = 460, H = 230, L = 34, R = 12, T = 14, B = 34;
  const px = (i: number) => L + ((W - L - R) / m.cot.length) * (i + 0.5);
  const coGiaTri = m.duong.flatMap((d) => d.diem).filter((v): v is number => v !== null);
  const dinh = Math.max(5, Math.ceil(Math.max(0, ...coGiaTri) / 5) * 5);
  const py = (v: number) => T + (H - T - B) * (1 - v / dinh);
  const lamMax = Math.max(0.1, ...m.cot.map((c) => c.lamThem ?? 0));
  const rongCot = ((W - L - R) / m.cot.length) * 0.46;
  const cao = (v: number) => ((H - T - B) * 0.34 * v) / lamMax;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Khối lượng làm thêm mỗi tuần và ba đường lũy kế">
      {[0, 1, 2, 3, 4].map((k) => {
        const v = (dinh / 4) * k;
        return (
          <g key={k}>
            <line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="var(--border)" strokeWidth={0.6} />
            <text x={L - 6} y={py(v) + 3.5} textAnchor="end" fontSize={10} fill="var(--text-muted)">{fmtSo(v, 1)}%</text>
          </g>
        );
      })}
      {m.cot.map((c, i) => {
        const dangSo = c.vaiTro !== "khac";
        const h = c.lamThem !== null ? cao(Math.max(0, c.lamThem)) : 0;
        return (
          <g key={i}>
            {c.lamThem !== null && (
              <>
                <rect x={px(i) - rongCot / 2} y={py(0) - h} width={rongCot} height={Math.max(1, h)} fill={dangSo ? "var(--accent)" : "var(--text-muted)"} opacity={dangSo ? 0.9 : 0.35} />
                <text x={px(i)} y={py(0) - h - 4} textAnchor="middle" fontSize={10} fill={dangSo ? "var(--text)" : "var(--text-muted)"}>{fmtSo(c.lamThem, 1)}</text>
              </>
            )}
            <text x={px(i)} y={H - 16} textAnchor="middle" fontSize={11} fill={dangSo ? "var(--text)" : "var(--text-muted)"}>{c.nhan}</text>
          </g>
        );
      })}
      {m.duong.map((d) => {
        const diem = d.diem.map((v, i) => (v === null ? null : [px(i), py(v), v] as const));
        const noi = diem.filter((p): p is readonly [number, number, number] => p !== null);
        if (noi.length === 0) return null;
        const cuoi = noi[noi.length - 1]!;
        return (
          <g key={d.muc}>
            <polyline points={noi.map((p) => `${p[0]},${p[1]}`).join(" ")} fill="none" stroke={MAU_DUONG[d.muc]} strokeWidth={2} />
            {noi.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={2.4} fill={MAU_DUONG[d.muc]} />)}
            <text x={cuoi[0] + 6} y={cuoi[1] + 3.5} fontSize={10.5} fill={MAU_DUONG[d.muc]}>{fmtSo(cuoi[2], 1)}%</text>
          </g>
        );
      })}
    </svg>
  );
}

function BieuDoNhanCong({ m }: { m: MoHinhTuanKhac }) {
  const ds = m.nhanCongTheoThau;
  if (ds.length === 0) return <div className="py-6 text-center text-[12px] text-text-muted">Chưa có số nhân công của hai tuần.</div>;
  const max = Math.max(1, ...ds.flatMap((d) => [d.truoc ?? 0, d.nay ?? 0]));
  const W = 360, H = 230, L = 10, R = 10, T = 18, B = 40;
  const nhom = (W - L - R) / ds.length;
  const cao = (v: number) => ((H - T - B) * v) / max;
  const rong = Math.min(34, nhom * 0.3);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Nhân công bình quân theo thầu phụ, hai tuần cạnh nhau">
      {ds.map((d, i) => {
        const cx = L + nhom * (i + 0.5);
        const y0 = H - B;
        return (
          <g key={d.thauPhu}>
            {d.truoc !== null ? (
              <>
                <rect x={cx - rong - 2} y={y0 - cao(d.truoc)} width={rong} height={cao(d.truoc)} fill="var(--text-muted)" opacity={0.45} />
                <text x={cx - rong / 2 - 2} y={y0 - cao(d.truoc) - 4} textAnchor="middle" fontSize={10} fill="var(--text-muted)">{fmtSo(d.truoc, 1)}</text>
              </>
            ) : (
              <text x={cx - rong / 2 - 2} y={y0 - 4} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)">không có BC</text>
            )}
            {d.nay !== null ? (
              <>
                <rect x={cx + 2} y={y0 - cao(d.nay)} width={rong} height={cao(d.nay)} fill="var(--accent)" opacity={0.9} />
                <text x={cx + rong / 2 + 2} y={y0 - cao(d.nay) - 4} textAnchor="middle" fontSize={10} fill="var(--text)">{fmtSo(d.nay, 1)}</text>
              </>
            ) : (
              <text x={cx + rong / 2 + 2} y={y0 - 4} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)">không có BC</text>
            )}
            <text x={cx} y={H - 20} textAnchor="middle" fontSize={11} fill="var(--text-secondary)">{d.thauPhu}</text>
          </g>
        );
      })}
      <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--border)" strokeWidth={0.8} />
    </svg>
  );
}

export function TuanNayKhac({ m, tuanTruoc, tuanNay }: { m: MoHinhTuanKhac; tuanTruoc: string; tuanNay: string }) {
  return (
    <section className="rounded border border-border bg-surface p-4" aria-label="Tuần này khác tuần trước">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-normal text-text">Tuần này khác tuần trước</h2>
        <span className="text-[12px] text-text-muted">
          {m.tenTuanTruoc} → {m.tenTuanNay}
          {m.denNgay ? ` · số đến ${ngayVN(m.denNgay)}` : ""}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div>
          <div className={NHAN}>Khối lượng làm thêm mỗi tuần và ba đường lũy kế</div>
          <BieuDoLuyKe m={m} />
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-text-secondary">
            {m.duong.map((d) => (
              <span key={d.muc} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-[2px] w-4" style={{ background: MAU_DUONG[d.muc] }} />
                {TEN_DUONG[d.muc]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2.5 w-2.5 bg-accent" />
              Làm thêm trong tuần
            </span>
          </div>
        </div>
        <div>
          <div className={NHAN}>Nhân công bình quân theo thầu phụ — {m.tenTuanTruoc.toLowerCase()} (xám) cạnh {m.tenTuanNay.toLowerCase()} (xanh)</div>
          <BieuDoNhanCong m={m} />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr className={`border-b border-border text-left ${NHAN}`}>
              <th className="py-1.5 pr-3 font-normal">Thước đo</th>
              <th className="py-1.5 pr-3 text-right font-normal">{m.tenTuanTruoc}</th>
              <th className="py-1.5 pr-3 text-right font-normal">{m.tenTuanNay}</th>
              <th className="py-1.5 pr-3 text-right font-normal">Đổi</th>
              <th className="py-1.5 pr-3 font-normal">So với</th>
              <th className="py-1.5 font-normal">Nguồn</th>
            </tr>
          </thead>
          <tbody>
            {m.bang.map((h) => (
              <tr key={h.ten} className="border-b border-border/50 align-top">
                <td className="py-1.5 pr-3 text-text">{h.ten}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-text-secondary">{h.truoc}</td>
                <td className="py-1.5 pr-3 text-right tabular-nums text-text">{h.nay}</td>
                <td className={`py-1.5 pr-3 text-right tabular-nums ${mauDoi(h.huong)}`}>{h.doi}</td>
                <td className="py-1.5 pr-3 text-text-secondary">{h.soVoi}</td>
                <td className="py-1.5 text-text-muted">{h.nguon}</td>
              </tr>
            ))}
            {m.chuaTinh && (
              <tr>
                <td colSpan={6} className="py-2 text-[12px] text-text-muted">{m.chuaTinh}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {m.ketLuan.length > 0 && (
        <div className="mt-3">
          <div className={NHAN}>Kết luận ngắn</div>
          {/* Chỗ DUY NHẤT trên trang được dùng gạch đầu dòng (Mr. Đại yêu cầu riêng mục này) */}
          <ul className="mt-1 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-text">
            {m.ketLuan.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 text-[11.5px] text-text-muted">
        Nguồn: tiendo.s_curve · tiendo.nguon_luc_huy_dong · tiendo.so_tuan — cùng bộ tính với khối S-Curve ở trên. So tuần: {tuanTruoc} → {tuanNay}.
      </div>
    </section>
  );
}
