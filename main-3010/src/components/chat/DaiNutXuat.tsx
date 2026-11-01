"use client";

// Dải 11 NÚT ĐỊNH DẠNG dưới ô nhập chat (lệnh Mr. Đại 05/09, kèm ảnh mẫu Web
// Pháp lý): người dùng CHỦ ĐỘNG chọn định dạng → câu hỏi kế tiếp AI sinh thẳng
// file đó. Không chọn thì AI vẫn tự phát hiện ý định từ câu hỏi (giữ như cũ).
// Rê chuột lên nút hiện dòng mô tả ngắn — nhiều định dạng lạ (MMD, DOT, KML)
// người dùng không biết công dụng.

const MO_TA: Record<string, string> = {
  html: "HTML — trang web tự chạy, mở bằng trình duyệt, in được",
  docx: "DOCX (Word) — báo cáo, công văn; sửa tiếp và trình ký",
  xlsx: "XLSX (Excel) — bảng số liệu, có định dạng màu/gộp ô",
  pdf: "PDF — bản in cố định, gửi đối tác không sợ lệch font",
  pptx: "PPTX (PowerPoint) — slide thuyết trình, báo cáo giao ban",
  kml: "KML (Google Earth) — ranh giới, tọa độ, vị trí trụ turbine trên bản đồ",
  dxf: "DXF (AutoCAD) — bản vẽ kỹ thuật, chèn được vào hồ sơ thiết kế",
  md: "MD (Markdown) — văn bản thuần, dán lại vào chat/ghi chú",
  svg: "SVG — hình vector (sơ đồ, biểu đồ), phóng to không vỡ",
  mmd: "MMD (Mermaid) — vẽ sơ đồ tổ chức, luồng công việc bằng mã",
  dot: "DOT (Graphviz) — sơ đồ quan hệ/phụ thuộc bằng mã",
};

const THU_TU = ["html", "docx", "xlsx", "pdf", "pptx", "md", "svg", "mmd", "dot", "kml", "dxf"];

export function DaiNutXuat({
  chon,
  onChon,
}: {
  chon: string | null;
  onChon: (dd: string | null) => void;
}) {
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
            chon === dd
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-text-secondary hover:border-accent/50 hover:text-accent"
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
