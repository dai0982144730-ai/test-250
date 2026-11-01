# Soát lại kết quả kiểm lần 6 — phiên «2 Agent Công việc», 20/10/2026

Đề: `20-10-lan-6-loai-khac-so-do-bung-gap-4-nhom-can-quyet.md` · Kết quả: `….KET-QUA.md`
Commit sửa: `72609b6` (sơ đồ + 4 nhóm) · `0e042f1` (Q1 ghép BĐH theo tên + Q2) · tải lại tệp Form 11 (dữ liệu, không commit)

## Đã sửa

| Điểm | Sửa gì | Đo sau sửa |
|---|---|---|
| 🔴 K3-1 gập khi đang chọn ô con | Gập nhóm chứa ô đang chọn → chọn luôn ô có nhóm (`SoDoPhong.tsx`) | Trình duyệt: chọn ô Hướng Việt → gập «Các dự án QT» → nhóm gập, ô chọn = BQLDA Quảng Trị |
| 🟡 K1-3 số Quá hạn lệch danh sách | `soTre` lọc thêm `duocO(v, bc.goc)` | — |
| 🟡 K3-2 dòng nhóm cắt chữ | Hai dòng chữ 12px, `CAO_NHOM` 26 → 38, chấm đỏ đứng trước số trễ | 5/5 dòng nhóm cao 33px, `scrollWidth > clientWidth` = 0/5 |
| ⚪ K3-4 tự bung ghi bộ nhớ | `doiNhom(id, mo, nho=false)` khi tự bung | localStorage = `[]` sau bung/gập tự động |
| 🟡 K2-1 / Q1 7b không có đường dữ liệu vào | Anh chốt «Ban điều hành dưới SCI E&C chính là dự án Loại khác» → `ghepBdhLoaiKhac` ghép theo tên trong lượt kéo dự án từ Main | Máy thật sau dựng lại: 5/5 dự án Loại khác có BĐH; ô dưới SCI E&C 11 → 6 (mỗi dự án một ô) |
| 🟡 K2-2 dữ liệu kiểm «đẹp» | Thêm ca `ban_dieu_hanh` rỗng như máy thật · BĐH có cha khác | đạt |
| 🟡 K1-1 / K1-2 / Q2 | Anh chốt: giao đích danh thì HIỆN — code đã đúng; sửa lời giải thích `sd-o-don-vi` | — |
| 🟡 F-A4 AI lỗi treo «đang xếp» | Nhớ lượt lỗi / bỏ sót 10 phút (`__canQuyetNhomLoi`), cờ `nhom_ai_loi` → «🤖 chưa xếp được — máy đoán tạm» | Tuần 40: 0 dòng treo |
| 🟡 F-A5 lý do rỗng mất 🤖 | Hiện «🤖 AI xếp» | — |
| 🟡 F-A7 khớp chuỗi con | Ranh giới từ `(?<![\p{L}\p{M}\p{N}])…(?![\p{L}\p{M}\p{N}])` cờ `u`, khoảng trắng `\s+`, bỏ «xây dựng» trơn | 6 ca mới đạt («code», «update», «xây dựng quy chế» → Nhóm khác) |
| 🟡 F-B1 tệp Form 11 mất 7 ô | Tải lại `mau-word/trang/form-11.docx` qua `POST /api/mau-word/form-11/tep` | Thẻ `w:tag`: 94 → 101 (= tệp repo) |
| ⚪ F-A10 · F-B2 | Chú thích `db/88` bản 2 · `CONG_TY_TU_GHI` thêm form-11 | — |

## Không sửa — lý do

| Điểm | Lý do |
|---|---|
| 🔴 F-A1 mất lựa chọn người bản 1 | Đo bản sao `can_quyet_nhom`: 10 hàng, **0 hàng của người** — không có gì để mất |
| 🟡 F-A2 dự án SCI + chữ vận hành | Hợp chốt «ngoài 4 nhóm thì Nhóm khác»; để 🤖 AI đọc |
| 🟡 F-A3 ENC theo dự án | Đúng chốt ③ của anh (theo dự án, không theo người gửi) |
| ⚪ F-A6 AI trả thuc_thi cho Loại khác | Chỉ xảy ra ở dòng lẫn hai loại dự án (code đã không chắc) — để AI quyết là đúng |
| ⚪ F-A8, F-A9, F-A11, K1-4, K1-5, K3-3, K3-5, K3-6, F-B3 | Ghi nhận, rủi ro thấp, không đổi hành vi anh đã gật |

## Đo cuối

- `tsc` sạch · vitest 1.181 đạt; 2 trượt ở `hoi-trung-hoi-cv` (bài lỗi thời do commit `3b92154` thêm agent Nghiệm thu, không thuộc lô này).
- Tuần 40 (28/09–04/10/2026), 20 dòng: Trước khởi công 9 · Thực thi, kiểm soát 1 · ENC đề xuất 2 · Nhóm khác 8 — giống trước khi sửa.
