import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
// Thang chữ +2px + màu chữ đọc được (GIAO-DIEN-CHUNG 3.5, 09/10) — gỡ dòng này là về như cũ
import "./thang-chu.css";
import { AppShell } from "@/components/layout/AppShell";
import { COOKIE_GIAO_DIEN, kieuTuCookie } from "@/lib/giao-dien-agent";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { LopGiaiThich } from "@/components/giai-thich/GiaiThich";
import { khoiDongDonSo } from "@/lib/nhat-ky/don-so";
import { khoiDongNhipKeoSoDo } from "@/lib/so-do-keo";
import { khoiDongNhipDemCanhBao } from "@/lib/issue-main/nhip-dem";
import BoiKhongBam from "@/components/common/BoiKhongBam";

// ⛔ 24/09 — ĐÃ GỠ `khoiDongHenGio()` (lib/hen-gio): ba kịch bản hẹn giờ đó
// (quét tối 20:00 · vòng đêm 21:00 · phân tích T2 05:00 — sinh cảnh báo, năng
// suất, CPM + ghi mốc COD, soát quy tắc P) là của AGENT TIẾN ĐỘ, chạy ở đây
// trên bản CHÉP dữ liệu tiến độ → hai bản số cãi nhau. Mr. Đại chốt 24/09:
// Main chỉ ánh xạ số qua cổng. Nhịp riêng của Main (báo cáo sáng) bật ở
// trang/route báo cáo sáng; gác ngoài chạy bằng script GAC-5-AGENT.

// ⭐ 26/09 — nhịp DỌN SỔ HỎI–ĐÁP theo tuổi (HOP-DONG-KET-NOI 7.1), 03:30 mỗi đêm.
// Main không có vòng hẹn giờ chạy sẵn (nhịp báo cáo sáng chỉ bật khi mở màn Báo cáo)
// nên bật ở đây: gác ngoài ping "/" mỗi phút → layout nạp ngay sau khi máy chủ lên.
khoiDongDonSo();
// ⭐ 12/10 — nhịp KÉO SƠ ĐỒ TỔ CHỨC từ agent Công việc, 30 phút một lượt (Mr. Đại chốt câu 9 bản rà phân quyền).
khoiDongNhipKeoSoDo();
// ⭐ 01/11 — nhịp ĐÊM màn Cảnh báo 02:30: AI xếp chủ đề issue mới + chọn lại «cần anh xem» khi tập issue đổi (Mr. Đại chốt).
khoiDongNhipDemCanhBao();


// Nhãn ỨNG DỤNG, không gắn tên một dự án cụ thể (04/09 — app chạy đa dự án,
// tên dự án hiện ở ô chuyển dự án trên Header)
export const metadata: Metadata = {
  title: "Main Agent — BQLDA SCI",
  description: "Main Agent — hỏi 4 agent kia rồi tổng hợp. Không giữ dữ liệu nghiệp vụ.",
  // Icon tab trình duyệt — ngôi sao lấp lánh "AI trợ lý", màu accent của agent này
  // (lệnh Mr. Đại 11/09)
  icons: { icon: "/icon-main.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Kiểu giao diện 3D/2D (Mr. Đại chốt 03/10): cookie → gắn sẵn data-giao-dien để lần tải đầu không nháy
    // data-theme: sáng/tối như agent Pháp lý (03/10) — mặc định tối, script trong <head> gắn lựa chọn đã nhớ trước khi vẽ
    <html lang="vi" data-theme="dark" data-giao-dien={kieuTuCookie(cookies().get(COOKIE_GIAO_DIEN)?.value)} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
        <LopGiaiThich />
        {/* Khung chat nổi trợ lý AI — hiện trên mọi tab (tự ẩn ở /login, /chat) */}
        <ChatWidget />
        {/* Kéo chuột bôi chữ trong nút / link thì không tính là bấm (E45 — Mr. Đại 11/10) */}
        <BoiKhongBam />
      </body>
    </html>
  );
}
