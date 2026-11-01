"use client";
// Hộp hướng dẫn ở ĐẦU mỗi tab — cùng khuôn HopHuongDanTab của agent Tiến độ / Nghiệm thu / Hợp đồng (Mr. Đại 25/10/2026): luôn đóng sẵn, bấm mới mở;
// ba phần — Mục đích · Cách đọc dữ liệu (từng cột nói lên gì, đọc để làm gì) · Tác dụng (các nút chọn, bộ lọc). Bản này đặt gam màu theo màn sáng của agent Công việc (3004).
import { useState } from "react";

/** Nội dung hộp hướng dẫn một tab */
export interface NoiDungHopTab {
  ma: string;
  tomTat: string;
  mucDich: string;
  cot: { ten: string; noiLen: string; docDe: string }[];
  nut: { ten: string; tacDung: string }[];
}

const BANG = "mt-1 w-full table-fixed border-collapse text-[12px]";
const TH = "border border-border bg-bg2 px-2 py-1 text-left font-semibold text-text";
const TD = "border border-border px-2 py-1 align-top";

export function HopHuongDanTab({ nd }: { nd: NoiDungHopTab }) {
  const [mo, setMo] = useState(false);
  return (
    <section className="rounded border border-border bg-surface text-[12.5px]" data-gt={`hd-tab-${nd.ma}`}>
      <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left" aria-expanded={mo} onClick={() => setMo((m) => !m)}>
        <span className="text-text-muted">{mo ? "▾" : "▸"}</span>
        <b className="text-text">Hướng dẫn tab này</b>
        <span className="text-text-muted">· {nd.tomTat}</span>
      </button>
      {mo && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <div>
            <b className="text-text">Mục đích</b>
            <p className="mt-0.5 text-text-secondary">{nd.mucDich}</p>
          </div>
          <div>
            <b className="text-text">Cách đọc dữ liệu</b>
            <table className={BANG}>
              <colgroup>
                <col style={{ width: "22%" }} />
                <col style={{ width: "39%" }} />
                <col style={{ width: "39%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={TH}>Cột</th>
                  <th className={TH}>Nói lên điều gì</th>
                  <th className={TH}>Đọc để làm gì</th>
                </tr>
              </thead>
              <tbody>
                {nd.cot.map((c) => (
                  <tr key={c.ten}>
                    <td className={`${TD} font-semibold text-text`}>{c.ten}</td>
                    <td className={`${TD} text-text-secondary`}>{c.noiLen}</td>
                    <td className={`${TD} text-text-secondary`}>{c.docDe}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <b className="text-text">Tác dụng của các nút chọn và bộ lọc</b>
            <table className={BANG}>
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "70%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={TH}>Nút / bộ lọc</th>
                  <th className={TH}>Tác dụng</th>
                </tr>
              </thead>
              <tbody>
                {nd.nut.map((n) => (
                  <tr key={n.ten}>
                    <td className={`${TD} font-semibold text-text`}>{n.ten}</td>
                    <td className={`${TD} text-text-secondary`}>{n.tacDung}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
