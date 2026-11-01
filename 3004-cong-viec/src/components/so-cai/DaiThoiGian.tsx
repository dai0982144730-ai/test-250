"use client";
// Dải thời gian các phần việc của một công việc (như hình CV-0415): mỗi phần một thanh từ ngày bắt đầu đến hạn,
// dấu ✓ khi kết thúc, hàng "Sổ cái" tăng dần 1/3 → 2/3 → 3/3 · rời sổ cái.
import { Check } from "lucide-react";
import type { PhanViec } from "@/lib/types";
import { congNgay, ngayNgan } from "@/lib/so-cai/tien-ich";

function ngayVN(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso.slice(0, 10);
  return new Date(t + 7 * 3600_000).toISOString().slice(0, 10);
}

function soNgay(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400_000);
}

export function DaiThoiGian({
  phan,
  batDau,
  ketThuc,
  taoLuc,
  homNay,
  hoanThanh,
}: {
  phan: PhanViec[];
  batDau: string | null;
  ketThuc: string | null;
  taoLuc: string;
  homNay: string;
  hoanThanh: boolean;
}) {
  const moc: string[] = [];
  const dau0 = batDau ?? ngayVN(taoLuc) ?? homNay;
  moc.push(dau0);
  for (const p of phan) {
    if (p.bat_dau) moc.push(p.bat_dau);
    if (p.ket_thuc) moc.push(p.ket_thuc);
    const kt = ngayVN(p.ket_thuc_luc);
    if (kt) moc.push(kt);
  }
  if (ketThuc) moc.push(ketThuc);
  moc.push(homNay);
  moc.sort();
  const dau = moc[0];
  let cuoi = moc[moc.length - 1];
  if (soNgay(dau, cuoi) < 6) cuoi = congNgay(dau, 6);
  const tong = soNgay(dau, cuoi) || 1;
  const x = (d: string) => `${(soNgay(dau, d) / tong) * 100}%`;
  const buoc = Math.max(1, Math.ceil(tong / 6));
  const vach: string[] = [];
  for (let i = 0; i <= tong; i += buoc) vach.push(congNgay(dau, i));

  // Hàng sổ cái: mỗi lần một phần kết thúc thì tiến độ tăng
  const xong = phan
    .filter((p) => p.trang_thai === "da_ket_thuc")
    .map((p) => ngayVN(p.ket_thuc_luc) ?? p.ket_thuc ?? homNay)
    .sort();

  return (
    <div className="scroll-thin overflow-x-auto">
      {/* chừa lề phải cho dấu ✓ và nhãn "n/n · rời sổ cái" nằm ở mốc cuối (hôm nay) không bị cắt */}
      <div className="min-w-[720px] pr-16">
        <div className="grid grid-cols-[220px_1fr] gap-x-3">
          <div />
          <div className="relative h-6 text-[11px] text-text-muted">
            {vach.map((d) => (
              <span key={d} className="absolute -translate-x-1/2 font-mono" style={{ left: x(d) }}>
                {ngayNgan(d)}
              </span>
            ))}
          </div>
          {phan.map((p) => {
            const bd = p.bat_dau ?? batDau ?? dau0;
            const kt = p.ket_thuc ?? (p.trang_thai === "da_ket_thuc" ? ngayVN(p.ket_thuc_luc) : null) ?? cuoi;
            const xongLuc = ngayVN(p.ket_thuc_luc);
            const qua = p.trang_thai === "dang_lam" && !!p.ket_thuc && p.ket_thuc < homNay;
            return (
              <div key={p.id} className="contents">
                <div className="border-t border-border-light py-2">
                  <div className="truncate text-sm text-text">{p.phu_trach_ten}</div>
                  <div className="truncate text-xs text-text-muted">{p.noi_dung}</div>
                </div>
                <div className="relative border-t border-border-light">
                  {vach.map((d) => (
                    <span key={d} className="absolute inset-y-0 w-px bg-border-light" style={{ left: x(d) }} />
                  ))}
                  <span
                    className={`absolute top-1/2 h-5 -translate-y-1/2 rounded-full border ${
                      p.trang_thai === "da_ket_thuc" ? "border-green" : qua ? "border-red" : "border-accent"
                    } ${!p.ket_thuc && p.trang_thai !== "da_ket_thuc" ? "border-dashed" : ""}`}
                    style={{ left: x(bd), width: `max(10px, calc(${x(kt)} - ${x(bd)}))` }}
                    title={`${ngayNgan(bd)} → ${p.ket_thuc ? ngayNgan(p.ket_thuc) : "luôn mở"}`}
                  />
                  {p.trang_thai === "da_ket_thuc" ? (
                    <span
                      className="absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-green text-bg"
                      style={{ left: x(xongLuc ?? kt) }}
                      title={`Kết thúc ${ngayNgan(xongLuc)}`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
          <div className="border-t border-border py-2 text-sm text-text">
            Sổ cái <span className="text-xs text-text-muted">tăng dần mỗi lần có người bấm Kết thúc</span>
          </div>
          <div className="relative h-10 border-t border-border">
            <span className="absolute inset-y-0 w-px bg-accent" style={{ left: x(homNay) }} title="Hôm nay" />
            {xong.map((d, i) => {
              const cuoiCung = i === xong.length - 1 && hoanThanh;
              // Nhiều phần kết thúc cùng ngày: chỉ hiện mốc sau cùng của ngày đó (tránh nhãn chồng lên nhau)
              if (xong[i + 1] === d) return null;
              // Mốc sát mép trái/phải: canh nhãn vào trong dải (không đè cột tên, không bị cắt)
              const tiLe = soNgay(dau, d) / tong;
              const canh = tiLe < 0.12 ? "translate-x-0" : tiLe > 0.88 ? "-translate-x-full" : "-translate-x-1/2";
              return (
                <span
                  key={i}
                  className={`absolute top-1/2 ${canh} -translate-y-1/2 whitespace-nowrap rounded-full border bg-surface px-2 py-0.5 font-mono text-[11px] ${
                    cuoiCung ? "border-green text-green" : "border-blue text-blue"
                  }`}
                  style={{ left: x(d) }}
                >
                  {i + 1}/{phan.length}
                  {cuoiCung ? " · rời sổ cái" : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
