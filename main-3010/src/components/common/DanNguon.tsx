"use client";

// ============================================================
// DẪN NGUỒN BẤM ĐƯỢC (lệnh Mr. Đại 07/09 điểm 2–3 — "việc quan trọng")
//
// Mọi chỗ AI/máy nêu căn cứ ("BC ngày 2026-08-27 — Điện 8 · BC tuần
// 2026-W35 — sheet Vấn đề dòng 2") thì từng đoạn thành LINK; bấm → popup
// che phần lớn màn hình hiện ĐÚNG phần dữ liệu nguồn (bảng, tô sáng dòng
// liên quan) — KHÔNG đổi trang, tắt popup là về đúng chỗ đang làm.
//
// Dùng chung cho MỌI menu (luật 7): chỉ cần <DanNguon text={chuỗi nguồn}/>.
// ============================================================

import { useState } from "react";
import { tachDanNguon, type MocNguon } from "@/lib/nguon/phan-tich";
import { ngayTrongChu } from "@/lib/ngay-hien";

// ⭐ 24/09 (Mr. Đại chốt: Main chỉ ánh xạ số của agent tiến độ qua cổng):
// popup cũ gọi /api/nguon của CHÍNH Main — mở BC ngày/tuần trên bản CHÉP dữ
// liệu tiến độ. Bản chép đã gỡ, nên popup nay nói thẳng nguồn nằm ở đâu và
// đưa link sang Agent tiến độ — ở đó thẻ này và popup nguồn chạy trên dữ liệu
// gốc. Địa chỉ trùng mục "Agent tiến độ" của menu trái (Sidebar.tsx).
const DIA_CHI_TIEN_DO = "http://localhost:3003";

const NUT = "rounded-sm border border-border px-3 py-1.5 text-[12px] text-text-secondary hover:text-text";

function XemNguonModal({ moc, onDong }: { moc: MocNguon; onDong: () => void }) {
  const loai = moc.loai === "bc-tuan" ? "báo cáo tuần" : "báo cáo ngày";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" onClick={onDong}>
      <div
        className="flex w-full max-w-lg flex-col rounded border border-border bg-panel shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-2.5">
          <h3 className="min-w-0 truncate text-[13px] font-bold text-text">🔎 Nguồn: {moc.chu}</h3>
          <button className={NUT} onClick={onDong}>✕ Đóng</button>
        </div>
        <div className="space-y-2 p-4 text-[12.5px] text-text-secondary">
          <p>
            Đây là {loai} nằm ở <b className="text-text">Agent tiến độ</b>. Main không giữ bản chép dữ liệu
            tiến độ nên không mở tại chỗ được.
          </p>
          <p>
            Mở màn Cảnh báo của Agent tiến độ, bấm đúng đoạn nguồn này trên thẻ để xem bảng gốc:{" "}
            <a
              href={`${DIA_CHI_TIEN_DO}/alerts`}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline hover:text-accent-hover"
            >
              {DIA_CHI_TIEN_DO}/alerts
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/** Chuỗi nguồn → từng đoạn bấm được. Đoạn không nhận dạng được giữ chữ thường. */
export function DanNguon({ text }: { text: string | undefined | null }) {
  const [dangXem, setDangXem] = useState<MocNguon | null>(null);
  const moc = tachDanNguon(text);
  if (moc.length === 0) return null;

  return (
    <>
      {moc.map((m, i) => (
        <span key={i}>
          {i > 0 && <span className="text-text-muted"> · </span>}
          {m.loai === "chu" ? (
            <span>{ngayTrongChu(m.chu)}</span>
          ) : m.loai === "man" ? (
            <a
              href={`${DIA_CHI_TIEN_DO}${m.duongDan ?? ""}`}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer border-b border-dotted border-accent/60 text-accent hover:border-solid"
              title={`Mở màn ${m.tenMan ?? ""} ở Agent tiến độ — bảng nguồn nằm ở đó`}
            >
              {m.chu}
            </a>
          ) : (
            <button
              type="button"
              className="cursor-pointer border-b border-dotted border-accent/60 text-accent hover:border-solid"
              title="Nguồn nằm ở Agent tiến độ — bấm để biết mở ở đâu"
              onClick={() => setDangXem(m)}
              data-lenh="chung.dan-nguon"
            >
              {m.chu}
            </button>
          )}
        </span>
      ))}
      {dangXem && <XemNguonModal moc={dangXem} onDong={() => setDangXem(null)} />}
    </>
  );
}
