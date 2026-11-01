// ============================================================
// TRANG GỐC "/" — CỬA VÀO, KHÔNG PHẢI MÀN
//
// TRƯỚC 07/09/2026 chỗ này là "Tổng quan dự án" kế thừa NGUYÊN của Agent
// Tiến độ: S-Curve bốn đường · bảng hạng mục đường găng · mốc quan trọng ·
// KPI %TT/%KH. Nó đọc THẲNG data/schedule.json + weekreport-*.json của dự
// án tại chỗ (qua lib/datasource, lib/scurve-calc, lib/cod-du-an,
// lib/moc-quan-trong, lib/nang-suat-tinh) — nghĩa là Main không chỉ THỪA
// một màn, mà đang GIỮ VÀ TỰ TÍNH dữ liệu nghiệp vụ của con khác.
//
// KE-HOACH/06-MAIN-AGENT-DA-DUNG.md, luật số một của con này:
//   "Thấy cần số thì dựng bảng riêng để chứa cho tiện. Làm thế là hỏng cả
//    hệ — sẽ có hai bản số liệu cãi nhau. Cần số thì ĐI HỎI, không lưu."
// Và bài G-02 của chính repo này: Main KHÔNG có cây việc, phiếu giá, báo
// cáo ngày, kho văn bản — "thiếu màn là đúng thiết kế".
//
// Màn không nằm trong menu trái nên soi menu thì thấy đúng; phải đăng nhập
// mới lộ. Vì thế "/" nay chỉ còn là cửa: đá thẳng sang màn chính của Main.
// Số tiến độ hỏi Agent Tiến độ ở cổng 3003 (qua hoiAgent("tiendo", …)).
//
// Bài canh: tests/unit/man-cua-main.test.ts
// ============================================================

import { redirect } from "next/navigation";
import { TRANG_CHU_MAIN } from "@/lib/nhan-dien-agent";

export default function TrangGoc() {
  redirect(TRANG_CHU_MAIN);
}
