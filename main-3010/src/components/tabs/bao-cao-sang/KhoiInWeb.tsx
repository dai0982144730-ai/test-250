"use client";

// ============================================================
// HIỂN THỊ WEB CỦA MỘT KHỐI BÁO CÁO SÁNG DỰNG BẰNG KhoiIn (Mr. Đại chốt 25/10/2026)
//   · KhoiInWeb  — bảng thật (HTML) từ cấu trúc KhoiIn, hàng tổng đứng đầu (luật 34), cột «chỉ web» có mặt
//   · TinHtml    — xem trước ĐÚNG tin Telegram HTML: đậm / nghiêng / khối <pre>; không dùng dangerouslySetInnerHTML,
//                  chỉ nhận ba thẻ <b> <i> <pre> do máy chủ ghép (mọi chữ dữ liệu đã thoát & < >)
// ============================================================

import { Fragment } from "react";
import type { Doan, KhoiIn } from "@/lib/bao-cao-sang/khoi-in";
import { ngayTrongChu } from "@/lib/ngay-hien";

const chuDong = (d: readonly Doan[]) =>
  d.map((x, i) =>
    typeof x === "string" ? (
      <span key={i}>{ngayTrongChu(x)}</span>
    ) : (
      // Một độ đậm (KE-HOACH/37): chỗ nhấn là MÀU chữ, không in đậm
      <span key={i} className="text-text">
        {x.d}
      </span>
    ),
  );

type PhanWeb = KhoiIn["phan"][number];
type TheWeb = Extract<PhanWeb, { k: "the" }>;
/** Một mục của bảng web: thẻ việc + (nếu có) câu hỏi 🤖 đứng ngay dưới nó */
type HangThe = { the: TheWeb; ai: string | null };
type MucWeb = { loai: "phan"; p: PhanWeb } | { loai: "bang-the"; hang: HangThe[] };

/**
 * Câu 2 (Mr. Đại duyệt A 28/10): Telegram giữ THẺ việc (bảng 34 ký tự cắt tên), còn màn WEB hiện BẢNG thật — các thẻ việc liên tiếp
 * gom thành một bảng «Việc · Số liệu · Ghi chú»; câu hỏi 🤖 đứng ngay dưới việc của nó là một hàng liền khung trích.
 */
function gomTheThanhBang(phan: PhanWeb[]): MucWeb[] {
  const ra: MucWeb[] = [];
  for (const p of phan) {
    const cuoi = ra[ra.length - 1];
    if (p.k === "the") {
      if (cuoi && cuoi.loai === "bang-the") cuoi.hang.push({ the: p, ai: null });
      else ra.push({ loai: "bang-the", hang: [{ the: p, ai: null }] });
      continue;
    }
    if (p.k === "ai" && cuoi && cuoi.loai === "bang-the" && cuoi.hang[cuoi.hang.length - 1]!.ai === null) {
      cuoi.hang[cuoi.hang.length - 1]!.ai = p.chu;
      continue;
    }
    ra.push({ loai: "phan", p });
  }
  return ra;
}

export function KhoiInWeb({ kin }: { kin: KhoiIn }) {
  const muc = gomTheThanhBang(kin.phan);
  return (
    <div className="space-y-1.5">
      {muc.map((m, i) => {
        if (m.loai === "bang-the") {
          const coGhiChu = m.hang.some((h) => h.the.them);
          return (
            <div key={i} className="scroll-thin overflow-x-auto rounded-sm border border-border-light">
              <table className="w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="border-b border-border-light bg-bg2 text-left text-text-muted">
                    <th className="px-2 py-1 font-semibold">Việc</th>
                    <th className="px-2 py-1 font-semibold">Số liệu</th>
                    {coGhiChu && <th className="px-2 py-1 font-semibold">Ghi chú</th>}
                  </tr>
                </thead>
                <tbody>
                  {m.hang.map((h, r) => (
                    <Fragment key={r}>
                      <tr className={`${h.ai ? "" : "border-b border-border-light last:border-0"} align-top`}>
                        <td className="px-2 py-1 text-text">{ngayTrongChu(h.the.ten)}</td>
                        <td className="px-2 py-1 text-text-secondary">{ngayTrongChu(h.the.so)}</td>
                        {coGhiChu && <td className="px-2 py-1 text-text-muted">{h.the.them ? ngayTrongChu(h.the.them) : ""}</td>}
                      </tr>
                      {h.ai && (
                        <tr className="border-b border-border-light last:border-0">
                          <td colSpan={coGhiChu ? 3 : 2} className="px-2 pb-1.5">
                            <div className="border-l-2 border-accent/60 pl-2 text-[12px] leading-relaxed text-text-secondary">🤖 {ngayTrongChu(h.ai)}</div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        const p = m.p;
        if (p.k === "chu") return <div key={i} className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-text-secondary">{chuDong(p.dong)}</div>;
        // Khuôn 27/10 (KE-HOACH/33): CHỈ lời AI mới nghiêng — khung trích viền trái màu nhấn, mở đầu 🤖
        if (p.k === "ai")
          return (
            <div key={i} className="border-l-2 border-accent/60 pl-2 text-[12px] leading-relaxed text-text-secondary">
              🤖 {ngayTrongChu(p.chu)}
            </div>
          );
        if (p.k === "chuGiai") return <div key={i} className="text-[11px] text-text-muted">ⓘ {ngayTrongChu(p.chu)}</div>;
        if (p.k === "thieu")
          return (
            <div key={i} className="text-[11.5px] text-text-secondary">
              ⚠ <span className="text-text">{p.ten}</span>: {ngayTrongChu(p.lyDo)}
            </div>
          );
        if (p.k === "the") return null; // đã gom vào bảng ở trên
        const { cot, hang, tong } = p.bang;
        return (
          <div key={i} className="scroll-thin overflow-x-auto rounded-sm border border-border-light">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="border-b border-border-light bg-bg2 text-text-muted">
                  {cot.map((c, j) => (
                    <th key={j} className={`px-2 py-1 font-normal ${c.phai ? "text-right" : "text-left"}`}>
                      {c.ten}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tong && (
                  <tr className="border-b border-border-light text-text">
                    {tong.map((o, j) => (
                      <td key={j} className={`px-2 py-1 tabular-nums ${cot[j]?.phai ? "text-right" : "text-left"}`}>
                        {o}
                      </td>
                    ))}
                  </tr>
                )}
                {hang.map((h, r) => (
                  <tr key={r} className="border-b border-border-light last:border-0 text-text-secondary">
                    {h.map((o, j) => (
                      <td key={j} className={`px-2 py-1 align-top tabular-nums ${cot[j]?.phai ? "text-right" : "text-left"}`}>
                        {o}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

const bo = (s: string): string => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Một tin Telegram HTML hiện đúng như người nhận thấy: đậm, nghiêng, khối <pre> đơn cách */
export function TinHtml({ html, kieu = "web" }: { html: string; kieu?: "web" | "dien-thoai" }) {
  const dt = kieu === "dien-thoai";
  const phan = html.split(/(<\/?(?:b|i|pre|blockquote)>)/g);
  const ra: JSX.Element[] = [];
  let dam = false;
  let ng = false;
  let pre = false;
  let trich = false;
  let bufPre = "";
  phan.forEach((p, i) => {
    if (p === "<b>") dam = true;
    else if (p === "</b>") dam = false;
    // Lời AI trong <blockquote> (khuôn 27/10): Telegram vẽ vạch dọc bên trái — xem trước cũng vậy
    else if (p === "<blockquote>") trich = true;
    else if (p === "</blockquote>") trich = false;
    else if (p === "<i>") ng = true;
    else if (p === "</i>") ng = false;
    else if (p === "<pre>") {
      pre = true;
      bufPre = "";
    } else if (p === "</pre>") {
      pre = false;
      ra.push(
        <pre key={i} className={dt ? "my-1 overflow-x-auto rounded-md bg-[#0e1621] px-2 py-1 font-mono text-[11.5px] leading-snug text-[#cfd8e3]" : "my-1 overflow-x-auto rounded-sm bg-surface px-2 py-1 font-mono text-[11.5px] leading-snug text-text"}>
          {ngayTrongChu(bo(bufPre))}
        </pre>,
      );
    } else if (pre) bufPre += p;
    else if (p !== "")
      ra.push(
        <span
          key={i}
          className={`${dam ? (dt ? "font-bold text-white" : "font-bold text-text") : ""} ${ng ? "italic" : ""} ${trich ? `block border-l-2 pl-2 ${dt ? "border-[#5ea5e5]" : "border-accent/60"}` : ""}`}
        >
          {ngayTrongChu(bo(p))}
        </span>,
      );
  });
  if (dt) return <div className="whitespace-pre-wrap rounded-xl bg-[#182533] px-3 py-2 text-[12px] leading-relaxed text-[#e4e8ee]">{ra}</div>;
  return <div className="whitespace-pre-wrap rounded-sm border border-border-light bg-bg2 p-3 text-[11.5px] leading-relaxed text-text-secondary">{ra}</div>;
}
