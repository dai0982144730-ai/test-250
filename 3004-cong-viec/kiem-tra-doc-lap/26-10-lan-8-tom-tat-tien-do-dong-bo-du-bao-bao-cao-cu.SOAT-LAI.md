# Soát lại kiểm độc lập lần 8 — phiên «2 Agent Công việc» (26/10/2026 tối)

Kết quả kiểm: ĐẠT CÓ ĐIỀU KIỆN — 🔴 2 · 🟡 17 · ⚪ 17. Đã sửa cả 2 lỗi đỏ, 16/17 điểm vàng. Điểm vàng còn lại (TD-04) cần anh quyết.

## Commit

| Repo | Commit | Nội dung |
|---|---|---|
| 3003 Tiến độ | `e470b72` | TD-01/02/03/05/06/07/10/11/13 |
| 3004 Công việc | `1ba87a2` | CT-421, CT-421b, CT-1…6, CT-12, ảnh v=4 |
| Main | `b1aa7f7` | MC-01/03/04/08 |

## Đã sửa

| # | Mức | Sửa thế nào | Đo / bài kiểm |
|---|---|---|---|
| TD-01 | 🔴 | `gia-dinh.ts` cộng `soNgayCho` (lưu ở `DuBaoMotViec.soNgayCho`, cùng phép `lich.ts`) | Bài: giả định N = số còn lại hiện tại thì COD không đổi, cả khi báo cáo cũ |
| CT-421 | 🔴 | `cong-base.ts lichHop` lọc theo người hỏi (`ma_nguoi_dung`) bằng `locChiTietCuoc` | Bài: không gửi / người ngoài → mất 3 trường; người được mời, quản trị → đủ |
| TD-02 | 🟡 | Chỉ chèn ngày chưa báo cáo khi R > 0 | Bài: R = 0 thì ngày xong như nhau ở hôm nay 25/01 và 03/08 |
| TD-03 | 🟡 | Thời tiết: `daLam` gồm cả `soNgayCho` → chỉ áp phần còn lại từ hôm nay | Bài cũ đạt |
| TD-05 | 🟡 | Chữ ký bộ nhớ thêm `homNayVN` | — |
| TD-06 | 🟡 | 10 câu «từ sau ngày cắt» thêm «báo cáo cũ thì từ hôm nay» | grep |
| TD-07 | 🟡 | `MiniGantt` lấy hôm nay theo giờ VN, soát lại mỗi phút | — |
| CT-1 | 🟡 | «Thực tế» chưa xong: «N ngày tới <ngày BC> · <bắt đầu> – đang làm» | — |
| CT-2 | 🟡 | Trang sau hỏng hoặc thiếu dòng so với `tong_so` → `ok:false`, không nhớ | Bài 100/183 |
| CT-3 | 🟡 | Một lượt hỏng → nghỉ 60 giây (chung mọi dự án); danh sách hỏi tuần tự | Bài: 3 dự án khi 3003 tắt = 1 lượt hỏi |
| CT-4 | 🟡 | Chú thích nút C2/C3 khi cấp 1 là tên dự án | — |
| CT-5 | 🟡 | `coBangGantt` trả `null` = chưa hỏi được: vẫn hiện icon + lời báo, không cho nạp tay | Bài |
| CT-421b | 🟡 | Bài kiểm route `GET /api/phong-hop` | 4 vai |
| MC-01 | 🟡 | Câu ngắt mạch theo lý do hỏng gần nhất (không nối được / chậm / lỗi); «không có quyền» không tính là hỏng | Bài |
| MC-03 | 🟡 | Bỏ địa chỉ máy và «Đã bật chưa?» — một chỗ `lib/nguon/cau-ngat-mach.ts` | Bài cũ đổi theo |
| MC-04 | 🟡 | Màn kiểm thử E-05 mong đợi đúng câu mới | — |
| MC-08 | 🟡 | Bài kiểm đường `hoiAgent` | 3 ca |
| TD-10/11/13 | ⚪ | Mô tả `cho_bao_cao`; câu «chưa có tiến độ đã lưu — chưa có bảng Gantt»; `homNayVN` | — |
| CT-6 | ⚪ | POST nạp tay trả 503 khi chưa hỏi được | — |
| CT-12 | ⚪ | Bản cũ quá 24 giờ không đưa ra; câu «máy đang hỏi lại» sửa cho đúng | — |
| ảnh | ⚪ | `mat-bang.webp?v=4` | — |

## Không sửa — lý do

| # | Lý do |
|---|---|
| TD-04 | Cần anh quyết: «Chậm khởi công» đếm tới hôm nay hay tới ngày cắt (anh chốt cách đếm 14/10, trước T6). Hỏi anh ở cuối phiên |
| TD-08 | Sổ mốc COD sẽ có bước nhảy +14 ngày ở điểm 27/10 do đổi cách tính. Đổi nhãn `cachTinh` đụng biểu đồ lịch sử và luật «điểm lạ» — để lần sửa sau, cần anh xem biểu đồ |
| TD-09 | Bài kiểm nhánh BOQ của `bang_gantt`: chưa dự án nào có BOQ (0/495 dòng) — viết khi có dữ liệu thật |
| CT-7 | Lọc quyền theo dự án cho bảng Tóm tắt: ngang mức bảng nạp tay cũ, bảng không có tiền. Chờ anh quyết nếu cần |
| CT-8/9 | Lệch nhỏ về nét vạch / dòng phụ hộp rê chuột — giữ |
| MC-02 | Luật V3 ở `chat-agent.ts` (ép AI nén câu) đang chờ anh ở phiên khác — không tự đổi |
| MC-05/06/07 | Bản chép `nguon-tien-do.ts` ở 3004 / Hợp đồng / Base còn chữ cũ: tệp của phiên khác, không vỡ gì (mỗi bài so câu của chính nó) |
| MC-09 | Chuông nhúng: chưa thử trình duyệt, chỉ suy từ mã — để lượt kiểm giao diện |
| ~136 chữ «Sơ đồ tổ chức» | Phiên khác đang đổi tên |

## Bài kiểm

| Repo | Kết quả |
|---|---|
| 3003 | 1.615 đạt · 4 đỏ cũ của phiên khác (vai «Nhà thầu», công cụ BOQ mới) |
| 3004 | 1.298 đạt · tsc 0 |
| Main | 1.083 đạt · 3 đỏ không phải của em (vai «Nhà thầu», móc lệnh trang Cảnh báo); 3 bài quá giờ khi chạy cả bộ, chạy riêng đạt · tsc 0 |
