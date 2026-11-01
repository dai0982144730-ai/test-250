// TRANG KỊCH BẢN TEST — khuôn lấy từ màn Test của agent pháp lý
// (Mr. Đại 06/09: "vào xem mục test để nhìn giao diện rồi viết code theo đó").
//
// Kết quả LƯU RA FILE data/kiem-thu/<dự án>/ chứ không phải localStorage, để
// Mr. Đại test xong chỉ việc bảo AI đọc BAO-CAO-TEST.md rồi sửa code.

import { Header } from "@/components/layout/Header";
import { KichBanTest } from "@/components/tabs/kiem-thu/KichBanTest";

export const metadata = { title: "Kịch bản test — Main Agent" };
export const dynamic = "force-dynamic";

export default function KichBanTestPage() {
  return (
    <>
      <Header title="Kịch bản test" />
      <div className="p-5">
        <KichBanTest />
      </div>
    </>
  );
}
