"use client";
// ============================================================
// ThongKeAI.tsx — THỐNG KÊ DÙNG AI (Mr. Đại chốt 04/10/2026). Nhân bản từ agent Công việc (Đợt 2) — ở agent này là TAB RIÊNG
// "📊 Thống kê dùng AI" trong Cài đặt (anh chốt 04/10: không để chung tab Kết nối).
//   [Ngày] [Tuần] [Tháng] + chọn ngày · ĐỒ HỌA ở trên · SỐ chi tiết ở dưới · 5 người + 5 tính năng tốn token nhất.
//   Sửa theo ý anh trưa 04/10:
//   ① Token: 4 ĐƯỜNG CONG MỀM nối đỉnh từng mốc (TK1 cam · TK2 xanh dương · cá nhân xanh lá · khoá API xám), trục dọc có đường kẻ
//      ngang — chế độ Ngày mỗi đường 100 nghìn token, Tuần / Tháng mỗi đường 1 triệu; đỉnh trục làm tròn lên từ giá trị lớn nhất.
//   ② Thời gian: MỘT VỆT dài suốt kỳ — xanh lúc AI đang chạy, vàng lúc ngừng vì hết hạn mức, xám lúc rảnh (không ai hỏi).
//   Bảng số chi tiết mặc định ĐÓNG, bấm mới mở; Ngày / Tháng 15 dòng một trang. Hai bảng xếp hạng có tiêu đề cột + thanh tỉ lệ;
//   lượt sổ cũ (chưa ghi người / tính năng) thành ghi chú xám, không xếp hạng.
//   Bấm một mốc ở Tuần / Tháng → mở Ngày đó. Không có quyền (cửa Cài đặt) → câu báo thay cho số.
// Số do code tính ở server (lib/ai/thong-ke-ai.ts) — màn chỉ vẽ. Màu có định nghĩa (luật 18), chú giải ngay trên đồ họa.
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { LoiApi, Nut, goiApi } from "@/components/ai/giao-dien-ai";
import ONhapNgay from "@/components/common/ONhapNgay";

type CheDo = "ngay" | "tuan" | "thang";
type Tk = "tk1" | "tk2" | "ca_nhan" | "api";
interface Mui {
  nhan: string;
  nhanDay: string;
  ngay: string;
  tuMs: number;
  denMs: number;
  tuongLai: boolean;
  luot: number;
  loi: number;
  hetHanMuc: number;
  dayHang: number;
  tokenVao: number;
  tokenRa: number;
  theoTk: Record<Tk, number>;
  phutChay: number;
  phutNgung: number;
}
interface DongXep {
  ma: string;
  ten: string;
  luot: number;
  token: number;
}
interface DuLieu {
  cheDo: CheDo;
  ngay: string;
  homNay: string;
  tieuDe: string;
  mui: Mui[];
  tong: Omit<Mui, "nhan" | "nhanDay" | "ngay" | "tuMs" | "denMs" | "tuongLai">;
  topNguoi: DongXep[];
  topTinhNang: DongXep[];
  coSoCu: boolean;
  soCu: { luot: number; token: number };
  vet: { tuMs: number; denMs: number; bayGio: number; chay: [number, number][]; ngung: [number, number][] };
}

const THE_PANEL = "rounded-sm border border-border bg-surface p-4";
/** Màu từng tài khoản — `mau` là lớp chữ (đường vẽ bằng currentColor), `nen` cho ô chú giải */
const TK: { k: Tk; ten: string; mau: string; nen: string }[] = [
  // TK1 CAM cố định (token `tk1` = #c2724f ở tailwind.config.ts, = màu nhấn agent Công việc) — không lấy màu nhấn của app: Main/Hợp đồng/Quan sát nhấn xanh, sát
  // màu TK2 (đo 04/10). Chốt màu: TK1 cam · TK2 xanh dương · cá nhân xanh lá · API xám.
  { k: "tk1", ten: "Tài khoản 1", mau: "text-tk1", nen: "bg-tk1" },
  { k: "tk2", ten: "Tài khoản 2", mau: "text-blue", nen: "bg-blue" },
  { k: "ca_nhan", ten: "Tài khoản cá nhân", mau: "text-green", nen: "bg-green" },
  { k: "api", ten: "Khoá API", mau: "text-text-muted", nen: "bg-text-muted" },
];
const TEN_CHE_DO: Record<CheDo, string> = { ngay: "Ngày", tuan: "Tuần", thang: "Tháng" };
/** Bảng chi tiết: Ngày (24 dòng) và Tháng (28–31 dòng) chia trang 15 dòng; Tuần 7 dòng để nguyên */
const DONG_MOT_TRANG = 15;
const HOVER = "hover:bg-[color:color-mix(in_srgb,var(--text)_6%,transparent)]";

const so = (n: number) => Math.round(n).toLocaleString("vi-VN");
/** Token gọn: 4,0 triệu · 12 nghìn */
const gon = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu` : n >= 1000 ? `${Math.round(n / 1000).toLocaleString("vi-VN")} nghìn` : so(n);
const phut = (p: number) => {
  const m = Math.round(p);
  if (m < 60) return `${m} phút`;
  return `${Math.floor(m / 60)} giờ ${String(m % 60).padStart(2, "0")} phút`;
};

/** Lùi / tiến một kỳ (ngày · 7 ngày · tháng) — ngày dạng YYYY-MM-DD */
function doiKy(ngay: string, cheDo: CheDo, buoc: number): string {
  const [y, m, d] = ngay.split("-").map(Number);
  const t = cheDo === "thang" ? new Date(Date.UTC(y, m - 1 + buoc, 1)) : new Date(Date.UTC(y, m - 1, d + buoc * (cheDo === "tuan" ? 7 : 1)));
  return t.toISOString().slice(0, 10);
}

/** Nhãn dưới trục: Ngày hiện 0h 3h 6h… · Tháng hiện 1 5 10 15… · Tuần hiện hết */
const hienNhan = (cheDo: CheDo, i: number, n: number) => cheDo === "tuan" || (cheDo === "ngay" ? i % 3 === 0 : i === 0 || (i + 1) % 5 === 0 || i === n - 1);

/**
 * Đường cong MỀM qua các điểm, không vọt quá đỉnh / không lún dưới 0 (nội suy bậc ba đơn điệu Fritsch–Carlson):
 * mốc 0 token nằm đúng trên trục, đỉnh nằm đúng giá trị — đường "mềm mại" mà không bịa số giữa hai mốc.
 */
function duongMem(p: [number, number][]): string {
  const n = p.length;
  if (n === 0) return "";
  if (n === 1) return `M${p[0][0]},${p[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1][0] - p[i][0];
    m[i] = (p[i + 1][1] - p[i][1]) / dx[i];
  }
  const t: number[] = new Array(n).fill(0);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${p[i][0] + h},${p[i][1] + t[i] * h} ${p[i + 1][0] - h},${p[i + 1][1] - t[i + 1] * h} ${p[i + 1][0]},${p[i + 1][1]}`;
  }
  return d;
}

export function ThongKeAI({ className = "" }: { className?: string }) {
  const [cheDo, setCheDo] = useState<CheDo>("ngay");
  const [ngay, setNgay] = useState<string>("");
  const [d, setD] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [khongQuyen, setKhongQuyen] = useState(false);
  const [dang, setDang] = useState(false);
  const [moBang, setMoBang] = useState(false);
  const [trang, setTrang] = useState(0);

  const tai = useCallback(async (cd: CheDo, ng: string) => {
    setDang(true);
    try {
      const q = new URLSearchParams({ che_do: cd, ...(ng ? { ngay: ng } : {}) });
      const r = await goiApi<DuLieu>(`/api/ai/thong-ke?${q}`);
      setD(r);
      if (!ng) setNgay(r.ngay);
      setLoi(null);
    } catch (e) {
      if (e instanceof LoiApi && e.status === 403) setKhongQuyen(true);
      else setLoi(e instanceof Error ? e.message : "Không đọc được thống kê dùng AI.");
    } finally {
      setDang(false);
    }
  }, []);

  useEffect(() => {
    void tai(cheDo, ngay);
    setTrang(0);
  }, [tai, cheDo, ngay]);

  if (khongQuyen) return <p className="text-[12px] text-text-muted">Thống kê dùng AI chỉ PM và Admin xem được.</p>;

  const xemNgay = (ng: string) => {
    setCheDo("ngay");
    setNgay(ng);
  };
  const bamDuoc = cheDo !== "ngay";
  const tongToken = d ? d.tong.tokenVao + d.tong.tokenRa : 0;
  const soTrang = d && cheDo !== "tuan" ? Math.ceil(d.mui.length / DONG_MOT_TRANG) : 1;
  const dongHien = d ? (cheDo === "tuan" ? d.mui : d.mui.slice(trang * DONG_MOT_TRANG, (trang + 1) * DONG_MOT_TRANG)) : [];

  return (
    <section className={`${THE_PANEL} ${className}`} aria-label="Thống kê dùng AI">
      {/* Đầu mục: chế độ xem + chọn ngày */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-text">Thống kê dùng AI</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["ngay", "tuan", "thang"] as CheDo[]).map((c) => (
            <Nut key={c} nho kieu={cheDo === c ? "chinh" : "vien"} onClick={() => setCheDo(c)}>
              {TEN_CHE_DO[c]}
            </Nut>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <Nut nho kieu="nhat" aria-label="Kỳ trước" onClick={() => ngay && setNgay(doiKy(ngay, cheDo, -1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Nut>
          <ONhapNgay
            value={ngay}
            max={d?.homNay}
            onChange={(v) => v && setNgay(v)}
            className="rounded-sm border border-border bg-bg2 px-2 py-0.5 text-[12px] text-text"
            aria-label="Chọn ngày"
          />
          <Nut nho kieu="nhat" aria-label="Kỳ sau" onClick={() => ngay && setNgay(doiKy(ngay, cheDo, 1))}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Nut>
          {d && ngay !== d.homNay && (
            <Nut nho kieu="nhat" onClick={() => setNgay(d.homNay)}>
              Hôm nay
            </Nut>
          )}
          <Nut nho kieu="nhat" aria-label="Làm mới" onClick={() => void tai(cheDo, ngay)} disabled={dang}>
            <RefreshCw className={`h-3.5 w-3.5 ${dang ? "animate-spin" : ""}`} />
          </Nut>
        </div>
      </div>

      {loi && <p className="mt-2 text-[12px] text-red">{loi}</p>}
      {!d ? (
        !loi && <p className="mt-3 text-[12px] text-text-muted">Đang đọc sổ dùng AI…</p>
      ) : (
        <>
          <p className="mt-1 text-[12px] text-text-secondary">
            <b className="text-text">{d.tieuDe}</b> — {so(d.tong.luot)} lượt · token vào {gon(d.tong.tokenVao)} · token ra {gon(d.tong.tokenRa)} · AI chạy{" "}
            {phut(d.tong.phutChay)} ·{" "}
            <span className={d.tong.phutNgung > 0 ? "font-semibold text-yellow" : ""}>ngừng vì hết hạn mức {phut(d.tong.phutNgung)}</span> · {d.tong.hetHanMuc} lần hết
            hạn mức · {d.tong.loi} lỗi{d.tong.dayHang ? ` · ${d.tong.dayHang} lượt bị từ chối vì đầy hàng chờ` : ""}
          </p>

          <BieuDoToken d={d} bamDuoc={bamDuoc} xemNgay={xemNgay} />
          <VetThoiGian d={d} bamDuoc={bamDuoc} xemNgay={xemNgay} />

          {/* SỐ CHI TIẾT theo múi — mặc định đóng */}
          <div className="mt-4">
            <button type="button" onClick={() => setMoBang((x) => !x)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline" aria-expanded={moBang}>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${moBang ? "" : "-rotate-90"}`} />
              Bảng số chi tiết theo {cheDo === "ngay" ? "giờ" : "ngày"} ({d.mui.length} dòng)
            </button>
            {moBang && (
              <div className="mt-2">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-[12px]">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] text-text-muted">
                        <th className="py-1.5 pr-2 font-semibold">{cheDo === "ngay" ? "Giờ" : "Ngày"}</th>
                        <th className="px-2 text-right font-semibold">Lượt</th>
                        <th className="px-2 text-right font-semibold">Token vào</th>
                        <th className="px-2 text-right font-semibold">Token ra</th>
                        <th className="px-2 text-right font-semibold">TK1 / TK2 / cá nhân</th>
                        <th className="px-2 text-right font-semibold">AI chạy</th>
                        <th className="px-2 text-right font-semibold">Ngừng</th>
                        <th className="pl-2 text-right font-semibold">Hết hạn mức / lỗi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dongHien.map((m) => {
                        const trong = m.luot === 0 && m.phutNgung === 0;
                        return (
                          <tr key={m.nhanDay} className={`border-b border-border-light ${trong || m.tuongLai ? "text-text-muted" : "text-text-secondary"}`}>
                            <td className="py-1 pr-2">
                              {bamDuoc ? (
                                <button type="button" onClick={() => xemNgay(m.ngay)} className="text-accent hover:underline">
                                  {m.nhanDay}
                                </button>
                              ) : (
                                m.nhanDay
                              )}
                            </td>
                            <td className="px-2 text-right font-mono">{so(m.luot)}</td>
                            <td className="px-2 text-right font-mono">{so(m.tokenVao)}</td>
                            <td className="px-2 text-right font-mono">{so(m.tokenRa)}</td>
                            <td className="px-2 text-right font-mono">
                              {gon(m.theoTk.tk1)} / {gon(m.theoTk.tk2)} / {gon(m.theoTk.ca_nhan)}
                            </td>
                            <td className="px-2 text-right font-mono">{phut(m.phutChay)}</td>
                            <td className={`px-2 text-right font-mono ${m.phutNgung > 0 ? "font-semibold text-yellow" : ""}`}>{phut(m.phutNgung)}</td>
                            <td className="pl-2 text-right font-mono">
                              {m.hetHanMuc} / {m.loi}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-semibold text-text">
                        <td className="py-1.5 pr-2">Tổng cả kỳ</td>
                        <td className="px-2 text-right font-mono">{so(d.tong.luot)}</td>
                        <td className="px-2 text-right font-mono">{so(d.tong.tokenVao)}</td>
                        <td className="px-2 text-right font-mono">{so(d.tong.tokenRa)}</td>
                        <td className="px-2 text-right font-mono">
                          {gon(d.tong.theoTk.tk1)} / {gon(d.tong.theoTk.tk2)} / {gon(d.tong.theoTk.ca_nhan)}
                        </td>
                        <td className="px-2 text-right font-mono">{phut(d.tong.phutChay)}</td>
                        <td className="px-2 text-right font-mono">{phut(d.tong.phutNgung)}</td>
                        <td className="pl-2 text-right font-mono">
                          {d.tong.hetHanMuc} / {d.tong.loi}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {soTrang > 1 && (
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-text-secondary">
                    <Nut nho kieu="vien" disabled={trang === 0} onClick={() => setTrang((t) => t - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" /> Trang trước
                    </Nut>
                    <span>
                      Trang {trang + 1}/{soTrang} · dòng {trang * DONG_MOT_TRANG + 1}–{Math.min((trang + 1) * DONG_MOT_TRANG, d.mui.length)} trên {d.mui.length}
                    </span>
                    <Nut nho kieu="vien" disabled={trang >= soTrang - 1} onClick={() => setTrang((t) => t + 1)}>
                      Trang sau <ChevronRight className="h-3.5 w-3.5" />
                    </Nut>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5 người + 5 tính năng tốn nhất */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <BangXep tieuDe="Ai dùng nhiều nhất" cotTen="Người" ds={d.topNguoi} tongToken={tongToken} cu={d.soCu} chuCu="chưa ghi người" />
            <BangXep tieuDe="Tính năng tốn token nhất" cotTen="Tính năng" ds={d.topTinhNang} tongToken={tongToken} cu={d.soCu} chuCu="chưa ghi tính năng" />
          </div>

          <p className="mt-3 text-[11px] text-text-muted">
            Token vào gồm cả phần đọc lại bộ nhớ đệm (cache). &quot;AI chạy&quot; cộng thời gian từng lượt — 2 tài khoản chạy song song nên một giờ có thể quá 60
            phút. &quot;Ngừng&quot; là lúc mọi tài khoản Claude công ty đều hết hạn mức. Tỉ lệ tính trên tổng token cả kỳ.
            {d.coSoCu ? " Trước ngày 04/10 sổ cũ chỉ ghi lượt thành công, chưa ghi người dùng và tính năng." : ""}
          </p>
        </>
      )}
    </section>
  );
}

/** ① TOKEN — 4 đường cong mềm theo tài khoản, đường kẻ ngang mỗi 100 nghìn (Ngày) / 1 triệu (Tuần, Tháng) */
function BieuDoToken({ d, bamDuoc, xemNgay }: { d: DuLieu; bamDuoc: boolean; xemNgay: (ng: string) => void }) {
  const W = 1000;
  const H = 200;
  const n = d.mui.length;
  const buoc = d.cheDo === "ngay" ? 100_000 : 1_000_000;
  const lonNhat = Math.max(0, ...d.mui.flatMap((m) => TK.map((t) => m.theoTk[t.k] || 0)));
  const soDuong = Math.max(1, Math.ceil(lonNhat / buoc));
  const dinh = soDuong * buoc;
  // Nhãn trục dọc: tối đa ~5 nhãn để khỏi đè nhau (đường kẻ vẫn vẽ đủ mỗi bước)
  const nhanMoi = Math.max(1, Math.ceil(soDuong / 5));
  const x = (i: number) => ((i + 0.5) / n) * W;
  const y = (v: number) => H - (v / dinh) * H;
  // Không vẽ phần tương lai: đường dừng ở mốc cuối đã qua
  const daQua = d.mui.filter((m) => !m.tuongLai).length;
  const coDung = TK.filter((t) => d.mui.some((m) => (m.theoTk[t.k] || 0) > 0));
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-text-secondary">
        <span className="font-semibold text-text">① Token (vào + ra) theo tài khoản</span>
        {TK.map((t) => {
          const dung = coDung.includes(t);
          return (
            <span key={t.k} className={`inline-flex items-center gap-1 ${dung ? "" : "text-text-muted"}`}>
              <i className={`inline-block h-[3px] w-4 ${t.nen} ${dung ? "" : "opacity-40"}`} /> {t.ten}
              {dung ? ` ${gon(d.tong.theoTk[t.k])}` : " (chưa dùng)"}
            </span>
          );
        })}
        <span className="ml-auto text-text-muted">mỗi đường kẻ {gon(buoc)}</span>
      </div>
      <div className="mt-2 overflow-x-auto">
        {/* pt-2: chừa chỗ nửa trên của nhãn đỉnh trục (khung trượt ngang cắt phần tràn) */}
        <div className="min-w-[320px] pt-2">
          <div className="flex">
            {/* trục dọc */}
            <div className="relative h-44 w-16 shrink-0">
              {Array.from({ length: soDuong + 1 }, (_, i) => i).map((i) =>
                i % nhanMoi === 0 || i === soDuong ? (
                  <span key={i} className="absolute right-1.5 -translate-y-1/2 whitespace-nowrap text-[9.5px] text-text-muted" style={{ top: `${100 - (i / soDuong) * 100}%` }}>
                    {i === 0 ? "0" : gon(i * buoc)}
                  </span>
                ) : null,
              )}
            </div>
            <div className="relative h-44 flex-1 border-b border-l border-border">
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
                {Array.from({ length: soDuong }, (_, i) => i + 1).map((i) => (
                  <line key={i} x1={0} x2={W} y1={y(i * buoc)} y2={y(i * buoc)} stroke="currentColor" className="text-border" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray={i % nhanMoi === 0 ? undefined : "2 4"} />
                ))}
                {coDung.map((t) => (
                  <path
                    key={t.k}
                    d={duongMem(d.mui.slice(0, daQua).map((m, i) => [x(i), y(m.theoTk[t.k] || 0)] as [number, number]))}
                    fill="none"
                    stroke="currentColor"
                    className={t.mau}
                    strokeWidth={2.25}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              {/* lớp bấm / rê chuột: mỗi mốc một ô */}
              <div className="absolute inset-0 flex">
                {d.mui.map((m) => {
                  const tieuDe = `${m.nhanDay}: ${TK.map((t) => `${t.ten} ${gon(m.theoTk[t.k] || 0)}`).join(" · ")} — ${so(m.luot)} lượt${bamDuoc ? " · bấm để xem ngày này" : ""}`;
                  return bamDuoc ? (
                    <button key={m.nhanDay} type="button" title={tieuDe} onClick={() => xemNgay(m.ngay)} className={`h-full flex-1 ${HOVER}`} aria-label={tieuDe} />
                  ) : (
                    <div key={m.nhanDay} title={tieuDe} className={`h-full flex-1 ${HOVER} ${m.tuongLai ? "bg-[color:color-mix(in_srgb,var(--surface)_60%,transparent)]" : ""}`} />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex">
            <div className="w-16 shrink-0" />
            <NhanTruc mui={d.mui} cheDo={d.cheDo} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** ② THỜI GIAN — một vệt dài suốt kỳ: xanh AI đang chạy · vàng ngừng vì hết hạn mức · xám rảnh */
function VetThoiGian({ d, bamDuoc, xemNgay }: { d: DuLieu; bamDuoc: boolean; xemNgay: (ng: string) => void }) {
  const { tuMs, denMs, bayGio, chay, ngung } = d.vet;
  const dai = Math.max(1, denMs - tuMs);
  const vi = (a: number, b: number) => ({ left: `${((a - tuMs) / dai) * 100}%`, width: `max(1px, ${((b - a) / dai) * 100}%)` });
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-text-secondary">
        <span className="font-semibold text-text">② Thời gian</span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 bg-green" /> AI đang chạy {phut(d.tong.phutChay)}
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 bg-yellow" /> Ngừng vì hết hạn mức {phut(d.tong.phutNgung)}
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 bg-border" /> Rảnh — không ai hỏi
        </span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <div className="min-w-[320px]">
          <div className="flex">
            <div className="w-16 shrink-0" />
            <div className="relative h-6 flex-1 overflow-hidden rounded-sm bg-border">
              {ngung.map(([a, b]) => (
                <div key={`n${a}`} className="absolute inset-y-0 bg-yellow" style={vi(a, b)} />
              ))}
              {chay.map(([a, b]) => (
                <div key={`c${a}`} className="absolute inset-y-0 bg-green" style={vi(a, b)} />
              ))}
              {bayGio < denMs && (
                <div className="absolute inset-y-0 right-0 bg-[color:color-mix(in_srgb,var(--surface)_70%,transparent)]" style={{ left: `${(Math.max(0, bayGio - tuMs) / dai) * 100}%` }} title="Chưa tới" />
              )}
              {/* lớp bấm / rê chuột theo mốc */}
              <div className="absolute inset-0 flex">
                {d.mui.map((m) => {
                  const tieuDe = `${m.nhanDay}: AI chạy ${phut(m.phutChay)} · ngừng ${phut(m.phutNgung)}${bamDuoc ? " · bấm để xem ngày này" : ""}`;
                  return bamDuoc ? (
                    <button key={m.nhanDay} type="button" title={tieuDe} onClick={() => xemNgay(m.ngay)} className={`h-full flex-1 ${HOVER}`} aria-label={tieuDe} />
                  ) : (
                    <div key={m.nhanDay} title={tieuDe} className="h-full flex-1" />
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex">
            <div className="w-16 shrink-0" />
            <NhanTruc mui={d.mui} cheDo={d.cheDo} />
          </div>
        </div>
      </div>
      {bamDuoc && <p className="mt-1 text-[11px] text-text-muted">Bấm vào một ngày trên biểu đồ để xem ngày đó theo từng giờ.</p>}
    </div>
  );
}

function NhanTruc({ mui, cheDo }: { mui: Mui[]; cheDo: CheDo }) {
  return (
    <div className="flex flex-1 pt-1">
      {mui.map((m, i) => (
        <div key={m.nhanDay} className="flex-1 overflow-visible whitespace-nowrap text-center text-[9.5px] leading-tight text-text-muted">
          {hienNhan(cheDo, i, mui.length) ? m.nhan : ""}
        </div>
      ))}
    </div>
  );
}

/** Bảng xếp hạng có tiêu đề cột + thanh tỉ lệ; lượt sổ cũ thành ghi chú xám, không xếp hạng */
function BangXep({
  tieuDe,
  cotTen,
  ds,
  tongToken,
  cu,
  chuCu,
}: {
  tieuDe: string;
  cotTen: string;
  ds: DongXep[];
  tongToken: number;
  cu: { luot: number; token: number };
  chuCu: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold text-text">{tieuDe}</div>
      {ds.length === 0 ? (
        <p className="text-[11.5px] text-text-muted">Chưa có lượt nào được ghi {cotTen.toLowerCase()} trong kỳ này (sổ bắt đầu ghi từ ngày bật tính năng — 04/10/2026).</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[11px] text-text-muted">
                <th className="w-6 py-1 pr-1 font-semibold">#</th>
                <th className="pr-2 font-semibold">{cotTen}</th>
                <th className="px-2 text-right font-semibold">Lượt</th>
                <th className="px-2 text-right font-semibold">Token</th>
                <th className="w-[34%] pl-2 font-semibold">Tỉ lệ</th>
              </tr>
            </thead>
            <tbody>
              {ds.map((r, i) => {
                const pt = tongToken > 0 ? (r.token / tongToken) * 100 : 0;
                return (
                  <tr key={r.ma || "nen"} className="border-b border-border-light text-text-secondary">
                    <td className="py-1.5 pr-1 text-text-muted">{i + 1}</td>
                    <td className="pr-2 text-text">{r.ten}</td>
                    <td className="px-2 text-right">{so(r.luot)}</td>
                    <td className="whitespace-nowrap px-2 text-right">{gon(r.token)}</td>
                    <td className="pl-2">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                          <div className="h-full bg-accent" style={{ width: `${Math.min(100, pt)}%` }} />
                        </div>
                        <span className="w-9 text-right text-[11px]">{pt < 1 && pt > 0 ? "<1" : Math.round(pt)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {cu.luot > 0 && (
        <p className="mt-1.5 text-[11px] text-text-muted">
          · {so(cu.luot)} lượt trước 04/10 ({gon(cu.token)} token) {chuCu} — không xếp hạng.
        </p>
      )}
    </div>
  );
}
