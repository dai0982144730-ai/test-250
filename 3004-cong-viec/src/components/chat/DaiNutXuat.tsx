"use client";

// Dải NÚT ĐỊNH DẠNG dưới ô nhập chat (lấy từ agent tiến độ, mẫu Web Pháp lý): người dùng
// CHỦ ĐỘNG chọn định dạng → câu hỏi kế tiếp AI sinh thẳng file đó. Không chọn thì AI vẫn
// tự phát hiện ý định từ câu hỏi. SCI công việc giữ các định dạng dùng cho tài liệu/báo cáo
// (bỏ KML, DXF, MMD, DOT, SVG của bản gốc — bản đồ, bản vẽ, sơ đồ mã không dùng ở đây).

const MO_TA: Record<string, string> = {
  docx: "DOCX (Word) — báo cáo, công văn, phiếu giao việc; sửa tiếp và trình ký",
  xlsx: "XLSX (Excel) — bảng việc, số liệu, có định dạng màu/gộp ô",
  pdf: "PDF — bản in cố định (máy chủ chưa có bộ in PDF thì ra trang in: Ctrl+P → Lưu PDF)",
  md: "MD (Markdown) — văn bản thuần, dán lại vào chat/ghi chú",
  html: "HTML — trang web tự chạy, mở bằng trình duyệt, in được",
  pptx: "PPTX (PowerPoint) — slide giao ban, báo cáo lãnh đạo",
};

const THU_TU = ["docx", "xlsx", "pdf", "md", "html", "pptx"];

export function DaiNutXuat({ chon, onChon }: { chon: string | null; onChon: (dd: string | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1 px-1 pt-1">
      {THU_TU.map((dd) => (
        <button
          key={dd}
          type="button"
          title={MO_TA[dd]}
          onClick={() => onChon(chon === dd ? null : dd)}
          data-lenh="chat.dinh-dang-xuat"
          data-gia-tri={dd}
          className={`rounded-[7px] border px-1.5 py-[1px] text-[9.5px] font-bold uppercase transition-colors ${
            chon === dd ? "border-accent bg-accent-soft text-accent" : "border-border text-text-secondary hover:border-accent/50 hover:text-accent"
          }`}
        >
          {dd}
        </button>
      ))}
      {chon !== null && (
        <span className="text-[9.5px] text-accent">
          → câu hỏi tiếp theo sẽ xuất file {chon.toUpperCase()} ({MO_TA[chon]?.split("—")[1]?.trim()})
        </span>
      )}
    </div>
  );
}
