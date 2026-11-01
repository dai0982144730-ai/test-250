# Soát lại kết quả kiểm độc lập 27/10 — phiên «@ Báo cáo: dữ liệu và trình bầy»

*Soát từng điểm bằng đọc mã + đo; chỉ sửa điểm đo ra đúng. `tsc` 0 lỗi; vitest `tests/unit` 1.172 qua (bài `bao-cao-sang-cod` quá giờ khi chạy cả bộ, chạy riêng 23/23 — lỗi cũ).*

## Đã sửa
| Điểm | Đo | Sửa |
|---|---|---|
| 🔴 BB-01 | `locDuLieuKhoi` (agent-mat-loc.ts) chỉ ẩn tien/phieuGia/hoSo/hanChuTruong/cauAi; **không** ẩn `lichHoSo` (Pháp lý) và `nguonLuc.camKet` (Hợp đồng). Web (`route.ts`, `khoi/route.ts`, `page.tsx`) đều đã truyền `loc`, nên lỗi nằm trong hàm lọc | Ẩn `lichHoSo` khi không có quyền Pháp lý; xoá `camKet` khi không có quyền Hợp đồng. Thêm bài kiểm |
| 🔴 BB-02 | `coKhoi` chỉ xét «có mã khối trong bộ». Đã đổi: phải phủ đúng dự án **và** có số nguồn (TQ-1: hạn chủ trương, RQ-6: tải việc) | `coKhoi(n, ma, maDuAn)`; thêm ca âm trong bài kiểm (RQ-6 không có số → dòng «tồn N việc quá hạn» vẫn in). Còn lại: khối kia đặt `soDong` thấp thì dự án xếp sau vẫn bị coi là đã in — chấp nhận, chưa gặp trong bộ thật |
| 🔴 BC-01 | `report-mgmt/page.tsx` gọi `<Header>` không có `coGhim` → thanh trên `sticky z-40` đè hàng ghim `top:0 z-30` | Thêm `coGhim` (3003, commit `1ce6541`). Chưa nhìn bằng mắt trên điện thoại |
| 🟡 BB-03 (một phần) | `4.6 MW` bị xoá thành `MW` vì mẫu «số.số + Chữ Hoa» khớp `M` | Chỉ xoá khi chữ sau là Hoa + thường (tên việc), không xoá đơn vị `MW`; mã phiếu đến 7 khúc, nhận cả `_` (`ISS_PL_0115`). Bài kiểm mới |
| 🟡 BB-07 | `ngayMo.slice(0,10)` là ngày UTC | Đổi sang giờ VN khi có giờ (luật 44) |
| 🟡 BD-5 | `kyThangTruoc`, `ngayHomNay` dùng giờ máy | Dùng `gioVn()` |
| 🟡 BD-1 | `ChuSuaDuoc`: bấm ✎ Sửa rồi rời ô không gõ → chữ 🤖 bị lưu thành chữ tay | So với chữ lúc mở ô |

## Không sửa (kèm lý do)
| Điểm | Lý do |
|---|---|
| 🔴 BC-02 «đúng hạn so với Baseline» | **Đo lại** `bao-cao-sang-lich-su.jsonl` ngày 27/10: Nậm săm 3A `chamBaselineNgay=0, codBaseline=2027-08-21`; Tân Thành `0, 2028-04-24` → có Baseline COD thật và COD dự báo trùng nó. Cổng trả `null` đúng khi không có Baseline (`lich.ts:575`). Chỗ lệch là RQ-2/báo cáo tháng nói «chưa có Baseline đã duyệt» của **việc/hạng mục** — nguồn khác, không phải lỗi Main. Cần phiên Tiến độ trả lời vì sao S-Curve vẫn vẽ đường Baseline |
| 🟡 BA-04 (bài `/D:\|sk-/`), `gonChoTelegram` lộ đường dẫn | Thuộc `lib/telegram-tro-ly/*` + tests gon-cho-telegram — **phiên 11**; đã chuyển |
| 🟡 BB-03 còn lại (`HD-548`, `A.13-02`) | `HD-548` là số hiệu hợp đồng (luật 30: tự là tên, giữ) nhưng mẫu mã hồ sơ cùng dạng — chưa tách được an toàn; chờ anh chốt |
| 🟡 BB-05/06 `ghepHeTheoKhung` 19/50 ca khác mong đợi | Chưa soát từng ca; ghi là việc kế tiếp (đo lại bộ 50 câu) |
| 🟡 BD-T1 chữ sửa tay báo cáo tuần khoá theo chỉ số dòng; BA-02; BC-03/04; BC-06; BC-07; BC-08/BD-2/BD-T6 (luật 43); BC-10 | Chưa soát/ sửa trong lượt này — việc kế tiếp |
| BD-4 «không ghi mã» áp báo cáo tháng/tuần? | Câu chờ anh Đại |

## Anh Đại chốt (27/10, sau soát)
BD-4: **báo cáo tháng và báo cáo tuần KHÔNG áp luật «không ghi mã»** (chỉ báo cáo sáng áp). Luật 30 (mã kèm tên) vẫn giữ.
