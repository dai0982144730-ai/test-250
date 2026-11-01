// Gom 10 tab kịch bản test của MAIN AGENT. File THUẦN — client import được (luật 10).
//
// Bảy tab đầu là màn riêng của Main (noi-dung-main.ts); ba tab cuối là phần
// dùng chung cả hệ + cách nhận ra đang chạy dữ liệu thật hay dữ liệu thử
// (noi-dung-chung.ts).
//
// ⛔ Trước 07/09 hai file nội dung ở đây là bản CHÉP NGUYÊN của bộ Agent Tiến
//    độ — 197 bài về "Kho hồ sơ", "Cây thư mục", "Thả một báo cáo ngày", toàn
//    màn Main KHÔNG HỀ CÓ. Đã thay hẳn bằng nội dung đo trên chính bản chạy
//    cổng 3010, nguồn là BAI-TEST-NGUOI-DUNG.md nhóm G + A + E.

import type { TabTest } from "./kich-ban-chung";
import { TAB_MAIN } from "./noi-dung-main";
import { TAB_CHUNG, TAB_TAM_AN } from "./noi-dung-chung";

export const CAC_TAB: TabTest[] = [...TAB_MAIN, ...TAB_CHUNG];

/** Tổng số bài — hiện trên đầu màn để biết quy mô. Đếm từ dữ liệu, không gõ cứng. */
export const TONG_SO_BAI = CAC_TAB.reduce((s, t) => s + t.bai.length, 0);

/** Tra một bài theo mã, dùng khi đọc lại kết quả đã lưu */
export function timBai(ma: string): { tab: TabTest; bai: TabTest["bai"][number] } | null {
  // cả nhóm TẠM ẨN (04/10) — kết quả đã chấm trước khi ẩn vẫn hiện được tên bài
  for (const tab of [...CAC_TAB, ...TAB_TAM_AN]) {
    const bai = tab.bai.find((b) => b.ma === ma);
    if (bai) return { tab, bai };
  }
  return null;
}
