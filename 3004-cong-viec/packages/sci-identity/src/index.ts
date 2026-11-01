// sci-identity — đăng nhập, cây đơn vị, người dùng, vai trò, phân quyền. Viết một lần, dùng lại cho mọi web SCI.
// Điểm vào này THUẦN (dùng được cả client): tính quyền, tiện ích chữ, dựng cây đơn vị.
// Hàm đụng CSDL / mật khẩu (CHỈ SERVER): import từ "@sci/identity/server". Xem README.md.
export * from "./quyen";
export * from "./chu";
export { LOAI_DON_VI, dungCay, taoVong, type NutDonVi } from "./don-vi";
export { LoiIdentity, type NguCanh, type SuKienIdentity, type NguoiChuaGan } from "./moi-truong";
