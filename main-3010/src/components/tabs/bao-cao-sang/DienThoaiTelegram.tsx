"use client";

// ============================================================
// MÀN HÌNH ĐIỆN THOẠI GIẢ LẬP — xem báo cáo sáng của MÌNH hiện trên Telegram ra sao (Mr. Đại chốt 25/10/2026)
// Cùng hàm với lúc gửi (ketXuatBoKhoi): thấy gì ở đây là Telegram nhận đúng như vậy — bong bóng chữ HTML (đậm, bảng đơn cách),
// kèm ảnh biểu đồ. Khung điện thoại có thanh trượt riêng; «Để làm gì · Lấy ở đâu · Công thức» KHÔNG nằm trong màn hình này
// mà hiện khi rê chuột vào từng khối ở thư viện bên trái (SuaBoKhoi).
// ============================================================

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { ketXuatBoKhoi, type DauVaoBoKhoi } from "@/lib/bao-cao-sang/khoi-telegram";
import { AnhKhoi } from "./AnhKhoi";
import { TinHtml } from "./KhoiInWeb";

export function DienThoaiTelegram({
  dauVao,
  coDinh,
  dieuKhien,
  cuonToi,
  ghiChu,
}: {
  dauVao: DauVaoBoKhoi | null;
  coDinh: boolean;
  /** Nút điều khiển đặt bên phải thanh «Main Agent» (ngoài màn hình tin nhắn) */
  dieuKhien?: ReactNode;
  /** Tên khối cần cuộn tới trong bản đầy đủ (chế độ «Cả báo cáo» + đang chọn một khối) */
  cuonToi?: string | null;
  /** Dòng ghi chú đầu màn hình (vd đang xem thử khối chưa có trong báo cáo) */
  ghiChu?: string | null;
}) {
  const tele = useMemo(() => (dauVao ? ketXuatBoKhoi(dauVao) : null), [dauVao]);
  const vung = useRef<HTMLDivElement>(null);
  // Bấm một khối ở thư viện/danh sách khi đang xem cả báo cáo → cuộn tới tên khối đó và nháy viền một lúc
  useEffect(() => {
    const goc = vung.current;
    if (!goc || !tele || !cuonToi) return;
    const cay = document.createTreeWalker(goc, NodeFilter.SHOW_TEXT);
    for (let n = cay.nextNode(); n; n = cay.nextNode()) {
      if (!n.nodeValue || !n.nodeValue.includes(cuonToi)) continue;
      const el = n.parentElement;
      if (!el) return;
      // Cuộn đúng vùng tin nhắn (không dùng scrollIntoView: nó kéo cả trang)
      goc.scrollTo({ top: Math.max(0, goc.scrollTop + el.getBoundingClientRect().top - goc.getBoundingClientRect().top - 10) });
      el.style.outline = "2px solid #c2724f";
      el.style.outlineOffset = "2px";
      const t = setTimeout(() => {
        el.style.outline = "";
        el.style.outlineOffset = "";
      }, 1800);
      return () => {
        clearTimeout(t);
        el.style.outline = "";
        el.style.outlineOffset = "";
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy khi đổi khối cần cuộn tới (dauVao tạo mới mỗi lần vẽ nên không đưa `tele` vào)
  }, [cuonToi, tele !== null]);
  return (
    <div data-gt="Màn hình điện thoại giả lập" className={`flex w-full flex-col overflow-hidden rounded-[30px] border-[7px] border-[#2b303b] bg-[#0e1621] shadow-lg ${coDinh ? "lg:h-full lg:min-h-0" : "h-[544px]"}`}>
      {/* Thanh tên cuộc trò chuyện */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-[#17212b] px-3 py-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">M</div>
        <div className="shrink-0">
          <div className="whitespace-nowrap text-[12.5px] font-semibold text-white">Main Agent</div>
          <div className="text-[10px] text-[#6d7f8f]">Demo telegram điện thoại</div>
        </div>
        {dieuKhien ? <div className="ml-auto flex shrink-0 items-center gap-1">{dieuKhien}</div> : null}
      </div>
      {/* Vùng tin nhắn — thanh trượt riêng */}
      <div ref={vung} className="scroll-thin min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#0e1621] px-2 py-2">
        {ghiChu ? <p className="rounded-lg bg-[#2b3a1f] px-2 py-1.5 text-[11px] leading-snug text-[#d9e8b8]">ⓘ {ghiChu}</p> : null}
        {!tele ? (
          <p className="px-2 py-4 text-[11.5px] text-[#6d7f8f]">Chưa có bản báo cáo của ngày này — bấm «Dựng lại» ở trên để xem trước.</p>
        ) : (
          <>
            {tele.tinHtml.map((t, i) => (
              <div key={i}>
                <TinHtml html={t} kieu="dien-thoai" />
                <div className="mt-0.5 pr-1 text-right text-[9.5px] text-[#6d7f8f]">07:00</div>
              </div>
            ))}
            {tele.anh.map((a, j) => (
              <div key={`a${j}`} className="rounded-xl bg-[#182533] p-1">
                <AnhKhoi dacTa={a.dacTa} chuThich={a.chuThich} />
                <div className="px-1 pb-0.5 pt-1 text-[10.5px] leading-snug text-[#e4e8ee]">{a.chuThich}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
