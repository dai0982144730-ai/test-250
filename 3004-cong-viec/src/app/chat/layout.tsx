// Layout riêng cho /chat — CỬA SỔ POPUP của Trợ lý SCI công việc (lấy từ agent tiến độ).
// AppShell đã cho /chat full-screen (giống /login); layout này phủ nền tối và khóa
// cuộn trang để khung chat chiếm trọn 100% chiều cao cửa sổ.
export default function ChatWindowLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-screen w-full overflow-hidden bg-bg text-text">{children}</div>;
}
