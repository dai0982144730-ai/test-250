import { Header } from "@/components/layout/Header";
import { BaiGioiThieu } from "@/components/tabs/gioi-thieu/BaiGioiThieu";

// GIỚI THIỆU (Mr. Đại chốt 06/09) — tài liệu nguyên lý, không phải hướng dẫn
// thao tác. Nút ❓ trên từng màn giữ nguyên vai trò cũ (trợ giúp theo màn),
// hai thứ không giẫm chân nhau.
export const metadata = { title: "Giới thiệu — Main Agent" };

export default function GioiThieuPage() {
  return (
    <>
      <Header title="Giới thiệu" />
      <div className="p-5">
        <BaiGioiThieu />
      </div>
    </>
  );
}
