// Layout riêng cho trang /chat — CỬA SỔ POPUP của trợ lý AI.
//
// Root layout (src/app/layout.tsx) bọc mọi trang bằng <AppShell> (Sidebar +
// main). AppShell đã được cho phép render full-screen với pathname "/chat"
// (giống /login), nên layout này chỉ còn việc phủ nền tối và khóa cuộn trang
// để khung chat chiếm trọn 100% chiều cao cửa sổ, KHÔNG có thanh điều hướng.

export default function ChatWindowLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full overflow-hidden bg-[#0a0a0a] text-slate-100">{children}</div>
  );
}
