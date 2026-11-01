# Đề xuất sửa máy chủ web (congviec.scigroup.vn) — từ app điện thoại, 29/10/2026

Hai việc app điện thoại không tự làm được vì máy chủ chặn. Em chưa sửa gì trên máy chủ.

## 1. Giao chuyển tiếp phần việc của đơn vị cho CHÍNH MÌNH

| Mục | Nội dung |
|---|---|
| Anh Đại muốn | Trưởng đơn vị nhận việc giao cả đơn vị thì tự nhận (chuyển tiếp) cho mình. |
| Máy chủ đang làm | `phanCong` (`lib/so-cai/dich-vu.ts` ~dòng 1613) chỉ nhận người nằm trong `nguoiGiaoDuoc`; hàm đó bỏ chính người giao: `WHERE ... AND n.id <> $2` (`lib/so-cai/giao-chuyen-tiep.ts` ~dòng 139). Nên tự chuyển cho mình bị báo «ngoài phạm vi giao việc». |
| Đề xuất | Ở `phanCong`, trước bước kiểm `ds.some(...)`, cho qua khi `v.nguoi_id === nd.id` và phần việc đang giao cho một ĐƠN VỊ mà `nd` thuộc (`nd.don_vi_ids.includes(p.phu_trach_id)`). Danh sách `giao_nguoi` trả về cho app thì thêm chính người giao ở đầu nhóm đơn vị mình. |
| Phần Giao việc mới | Không cần sửa: `batBuocTrongPhamVi` đã cho tự giao cho mình. App đã thêm dòng «Chính tôi». |

## 2. Nhân sự Ban lãnh đạo ở ô chức danh (vd. Thủy — Trưởng BP KTNB)

| Mục | Nội dung |
|---|---|
| Hiện tượng | Giao chuyển tiếp cho Quách Thị Thanh Thủy bị báo «ngoài phạm vi giao việc của bạn». Nguyễn Văn Thanh giao được. |
| Nguyên nhân | `nguoiGiaoDuoc` loại hẳn các ô loại `chuc_danh` (`LOAI_KHONG_GIAO`). Thanh lọt qua nhờ kiêm nhiệm ở Phòng Đầu tư và Pháp chế; Thủy chỉ có ô `tbp-ktnb`. |
| Cách không sửa code | Quản trị cho Thủy kiêm nhiệm thêm một đơn vị thật (vd. Phòng Đầu tư và Pháp chế). |
| Cách sửa code | Trong `nguoiGiaoDuoc`: khi người giao là lãnh đạo (`laLanhDao(nd)`), cho thêm người có đơn vị chính là ô chức danh nhưng KHÔNG mang vai `lanh-dao` (trợ lý, kiểm soát). |
