# HỒ SƠ NHIỆM VỤ — AGENT CÔNG VIỆC (mã trên dây `base`, cổng 3004)

> Soạn 04/10/2026 (phiên code agent Công việc), theo khuôn 6 mục của `0-agent-quan-sat/ho-so-nhiem-vu/tiendo.md`.
> Luật chung: `chung.md`. Số "7 ngày" = sổ **27/09 00:00 → 04/10 00:00 giờ VN**.
> Từ **04/10 ~00:49 giờ VN** danh bạ Main trỏ mã `base` sang `http://127.0.0.1:3004` — trước giờ đó mọi lượt "base" là agent Base cũ (cổng 3011, Base.vn).

## 1. Vai trò và dữ liệu nó giữ

Sổ cái công việc của cả công ty: việc sinh từ báo cáo tuần/tháng nộp lên (chương "Kết quả và kế hoạch việc tuần/tháng tới") và việc giao tay; ai chủ trì, ai phối hợp, hạn, trạng thái, lịch sử. Từ 03/10 (Mr. Đại chốt) **nhận vai agent Base**: gắn việc vào cây WBS của agent Tiến độ, màn Cây việc & đường găng, sổ issue — **giữ mã `base` và đường `/api/mcp/base`** để 5 agent không phải sửa.

| Nó là NGUỒN SỰ THẬT DUY NHẤT cho | Nó KHÔNG giữ — phải hỏi |
|---|---|
| Việc sổ cái `CV-<năm>-<số>` · tên · hạn · trạng thái (`dang_mo` / `hoan_thanh` / `da_dong`) · lịch sử | Cây WBS, % tiến độ, đường găng, COD → **Tiến độ** |
| Ai chủ trì / phối hợp một việc (người **hoặc đơn vị**) | Danh mục dự án (mã ngắn HV, TT…) → **Main** (kéo về, không sửa ở đây) |
| Gắn việc ↔ mã WBS (`docflow.wbs_viec`): 🤖 AI đề xuất, người duyệt | Hồ sơ pháp lý, hạn giấy phép → **Pháp lý** · tiền, nghiệm thu → **Hợp đồng** |
| Sổ issue Cây việc (`data/cay-viec/issue/<dự án>.json`) | **Base.vn — KHÔNG gọi nữa** (`suc_khoe.base_vn` luôn `[]`) |
| Người dùng + đơn vị của agent này (tới Đợt 3 mới chuyển hẳn sang Main) | Đề xuất/duyệt kiểu Base Request — **không có nguồn** |

## 2. Dữ liệu vào

| Nguồn | Hiện có (đo 04/10 trên bản sao CSDL + qua cổng) |
|---|---|
| Báo cáo tuần/tháng nộp bằng Word mẫu → AI trích việc; giao tay trên màn | **116 việc**: 83 đang mở · 27 hoàn thành · 6 đã đóng |
| Phần chủ trì còn hiệu lực | **97 việc do ĐƠN VỊ chủ trì · 19 việc do NGƯỜI** — 84% "người phụ trách" là mã đơn vị |
| Gắn WBS (chỉ dự án có cây bên Tiến độ) | Chỉ **HV**: 19 dòng — **4 đã duyệt · 15 🤖 chờ duyệt**; chế độ `nguoi_duyet`, ngưỡng tự duyệt 0,7 (Cài đặt › Gắn WBS) |
| Việc theo dự án (luật `duAnCuaViec`: ô Dự án khớp tên/tên khác, hoặc giao cho Ban điều hành) | HV 19 · NK1 11 · NM1 5 · TT 4 · BT 3 · NK2 3 · HP1 3 · NK3 2 · MDDT 1 · N3A, IAD1, NL1, NL2, NNHL **0** |
| Dự án kéo từ Main (`main.du_lieu_dung_chung` 30 phút/lần + Main đẩy `/api/mcp/dong-bo-tu-main`) | 15 dự án |
| Cây đầu việc + đường găng hỏi Tiến độ (`tim_dau_viec`, `duong_gang`, `tom_tat_du_an`; nhớ 10 phút) | HV 330 đầu việc, chuỗi găng 12 mã · các dự án khác chưa có cây |
| Người dùng | **52 người** hoạt động; **21/52 có mã người ≠ email thật** (mã cũ giữ bên trong, vd mã `truong.cd@scigroup.vn` = Bùi Quế Lâm, email `lambq@scigroup.vn`) |

## 3. Công cụ MCP nó mở (gọi `nang_luc` 04/10 — 15 công cụ, 13 sẵn sàng; khớp `src/lib/mcp/cong-base.ts`)

Nguồn phải dẫn: `nguon[].loai = "so-cai-cong-viec"`, `file_goc = "Sổ cái agent Công việc · dự án <mã> <tên>"`; issue trỏ `data/cay-viec/issue/<mã>.json`; người trỏ bảng `identity.nguoi_dung`. Thời gian đo 04/10 (trung vị · lớn nhất): mọi công cụ < 0,6 s → hạn chờ 10 s của bên gọi là thừa.

| Công cụ | Hỏi gì | Trường chính trả về | Đo |
|---|---|---|---|
| `base.co_viec_cho_ma_khong` | Mã WBS đã có việc giao chưa; `ds_ma` ≤ 100 mã một lượt | `ket_luan` KHONG_TIM_THAY_MA · DA_XONG_HET · DA_CO_NGUOI_NHAN · CHUA_AI_NHAN · `nguoi_dang_cam` + `ten_nguoi_dang_cam` · `pham_vi_da_soat.so_viec_ma_cho_duyet` | 85 ms |
| `base.nguoi_phu_trach` | Ai chủ trì việc khớp từ khoá (bỏ dấu) hoặc mã WBS | `viec[]`: `ma_viec_base` (CV-…) · `nguoi_phu_trach` · `ten_nguoi_phu_trach` · `loai_phu_trach` (nguoi/don_vi) | 83 ms |
| `base.trang_thai_cong_viec` | Một việc CV-… (`ma_du_an` tuỳ chọn — tự tìm dự án) | hạn · `qua_han_ngay` · `nam_im_ngay` (đo thật từ lịch sử) · `ma_wbs` (đã duyệt) · `ma_wbs_cho_duyet` | 155 ms |
| `base.viec_qua_han` | Việc quá hạn theo dự án / người | `viec[]` quá hạn ↓ · việc không hạn đếm riêng ("chưa biết", không gộp vào "không trễ") | 39 ms |
| `base.tai_viec_theo_nguoi` | Tải từng người/đơn vị | đang mở · quá hạn · sắp hạn 7 ngày · việc găng (hỏi `tiendo.duong_gang`, nhớ 10 phút) | 23–502 ms |
| `base.thong_tin_nhan_su` | Mã người / họ tên là ai. **`tat_ca=1` TẠM ĐÓNG 04/10** → `KHONG_CO_DU_LIEU` nói rõ lý do (kho danh bạ bên gọi đang dùng cho Base.vn) | `ma_base` (mã người) · `ho_ten` · `chuc_danh` · `ban` (tên đơn vị) · `email_sci` (email thật) · `anh`, `cong_ty` = null | 7 ms |
| `base.danh_sach_issue` | Sổ issue cho Main gom | thẻ + `tren_duong_gang` + `ma_du_an` từng thẻ | 196 ms |
| `base.de_xuat_lien_quan` · `base.quy_trinh_dang_tac` | — | **luôn `KHONG_CO_DU_LIEU`**, `san_sang: false` (không có Base Request) | 0–4 ms |
| `tim_theo_ma` · `nang_luc` · `suc_khoe` · 3 cửa `base.nhat_ky_*` / `hoi_thoai_gan_day` | Bắt buộc / hạ tầng; `suc_khoe` có `khuon_so "2.0"`, `giu_so`, `base_vn: []` | — | 0–83 ms |

Cửa thường (không phải MCP): `GET /api/viec/danh-ba` (Tiến độ kéo danh bạ, cookie `sci_session`) — **TẠM ĐÓNG 04/10**: đăng nhập đúng vẫn trả `{ok:false, message}` (lý do một chỗ `LY_DO_DONG_DANH_BA` ở `src/lib/mcp/cong-base-thuan.ts`) · `POST /api/mcp/dong-bo-tu-main` (Main đẩy, khoá nội bộ) → kéo lại dự án · `POST /api/cay-viec/soan-giao` (⏸ mới mở cho màn của chính nó — Pháp lý gọi không cookie sẽ bị từ chối, chờ Mr. Đại chốt).

**Tài liệu nói A — code đang B:**

| Tài liệu nói | Code đang |
|---|---|
| HOP-DONG-KET-NOI 5.4 / PLAN-AGENT-BASE-VN: nguồn là Base.vn | Sổ cái agent Công việc (chốt 03/10, chưa lan vào CHOT) |
| `ma_viec_base` = id việc Base.vn (số, vd `10017568`) | Mã việc sổ cái `CV-2026-0074` |
| `nguoi_phu_trach` = username Base.vn | Mã người (21/52 không phải email thật) **hoặc mã đơn vị** (84% việc) — đọc kèm `ten_nguoi_phu_trach`, `loai_phu_trach` |
| Base cũ tính cả mã 🤖 "ai_gan" là đã gắn | Chỉ mã **ĐÃ DUYỆT**; mã chờ duyệt đếm ở `so_viec_ma_cho_duyet` |
| `de_xuat_lien_quan` · `quy_trinh_dang_tac` sẵn sàng (Base Request) | Luôn KHONG_CO_DU_LIEU |
| `danh_sach_issue` không mã dự án → dự án đang chọn | Gom mọi dự án có sổ, mỗi thẻ ghi `ma_du_an` |

## 4. Nó hỏi ai — ai hỏi nó (7 ngày; ok / KCDL / lỗi)

**Ai hỏi `base`** (sổ agent Base cũ 3011 — các agent gọi y hệt sang cổng mới, chỉ đổi địa chỉ; 1.243 lượt):

| Ai hỏi | Công cụ | Lượt | ok / KCDL / lỗi | Để làm gì (`lyDoGoi` nhiều nhất) |
|---|---|---|---|---|
| Tiến độ | `nguoi_phu_trach` | 365 | 200 / 165 / 0 | Theo dõi thiết kế `TK-HV-00x`: ai làm bản vẽ |
| Main | `quy_trinh_dang_tac` | 252 | 0 / 252 / 0 | Bảng điều hành: tình hình dự án cho lãnh đạo |
| Hợp đồng | `quy_trinh_dang_tac` | 194 | 0 / 194 / 0 | Luật 10.3 phiếu giá tắc: hồ sơ dừng quá 10 ngày ở bàn ai |
| Main | `danh_sach_issue` · `viec_qua_han` · `co_viec_cho_ma_khong` | 122 · 78 · 72 | 53/69/0 · 45/33/0 · 63/9/0 | Màn Issue · Bảng điều hành · khối B11 "Chỗ hai agent nói khác nhau" |
| Pháp lý | `co_viec_cho_ma_khong` | 70 | 63 / 7 / 0 | Hồ sơ pháp lý tắc/quá hạn — đầu việc đã có ai được giao chưa |
| Tiến độ | `co_viec_cho_ma_khong` · `trang_thai_cong_viec` | 36 · 35 | 6/30/0 · 35/0/0 | Vòng đêm việc găng chưa khởi công · hạn việc Base của `TK-HV-001` |
| Main · Hợp đồng | `thong_tin_nhan_su` (`tat_ca=1`) | 3 · 2 | ok | Tự kéo danh bạ mỗi 24 giờ |
| Quan sát | `suc_khoe` · `nang_luc` · 3 cửa sổ | — | — | Không ghi sổ bên nhận (luật 7.1) |

Cổng mới, lượt thật đầu tiên (04/10 00:49–01:05 giờ VN): Main `quy_trinh_dang_tac` 3 (KCDL) · `viec_qua_han` 2 · `danh_sach_issue` 1 · `tai_viec_theo_nguoi` 1. Quan sát · Hợp đồng · Pháp lý đã kéo danh bạ mới (01:01); Tiến độ kéo khi cần gọi lần tới.

**Agent Công việc hỏi ai** (sổ 3004, 437 lượt):

| Hỏi | Công cụ | Lượt | ok / KCDL / lỗi | Để làm gì |
|---|---|---|---|---|
| Tiến độ | `tiendo.duong_gang` | 180 | 174 / 0 / 6 | Màn Cây việc: nút găng chưa ai được giao |
| Tiến độ | `tiendo.tim_dau_viec` | 145 | 142 / 0 / 3 | Dựng cây theo giai đoạn (trang 100 dòng) |
| Tiến độ | `tiendo.tom_tat_du_an` | 90 | 12 / 78 / 0 | Kéo dự án từ Main — dự án nào có cây WBS (KCDL = chưa có cây, đúng) |
| Main | `main.du_lieu_dung_chung` · `main.ma_tran_goi` | 19 · mới | ok | Danh mục dự án · cột Ai được gọi ai (nhớ 10 phút) |
| (sự kiện) | `ngat_mach` | 3 | — | 3 lỗi liên tiếp tới Tiến độ → nghỉ 10 phút |

## 5. Luật riêng phải giữ (CODE tính, LLM chỉ đề xuất mã WBS)

| Luật | Nội dung · nguồn |
|---|---|
| Chỉ mã ĐÃ DUYỆT là đã gắn | 🤖 mã chờ duyệt không treo lên cây, không vào 4 thẻ, không làm nút găng thành "đã có việc" (Mr. Đại 03/10 · `cay-viec/thuan.ts` `gomTheoWbs`) |
| AI không tự giao / tự ghi | Giao việc chỉ sau cú bấm của người có quyền "Giao việc"; AI đề xuất mã WBS kèm `do_chac` + lý do, người (quyền "Duyệt gắn WBS") duyệt; người sửa thì người thắng |
| Người phụ trách = phần CHỦ TRÌ còn hiệu lực | Chưa giao → `null`, không chuỗi rỗng; có thể là đơn vị |
| Không biết là `null` | KHONG_TIM_THAY_MA → mọi trường đếm `null`; việc không hạn không gộp vào "không quá hạn"; dự án 0 việc báo "0 việc", không báo "đã xong hết" |
| Không lấy dự án khác ra thay | Mã dự án lạ → KHONG_CO_DU_LIEU kèm danh sách "mã + tên" |
| Luật 30 · 31 | Mã luôn kèm tên (`ten_nguoi_phu_trach`, tên việc); khoảng ngày kèm số ngày ở chữ cho người đọc |
| Quyền gọi | Cửa Ai được gọi ai (cột `goi_toi` kéo từ Main); `quansat` chỉ đọc; `hoi_thoai_gan_day` chỉ quansat hoặc có khoá nội bộ; mã lạ (`do-kiem`) cần khoá nội bộ |

## 6. Dấu hiệu sai cần soi

| Dấu hiệu | Ví dụ thật |
|---|---|
| Kéo cả danh bạ (`thong_tin_nhan_su tat_ca=1`, `/api/viec/danh-ba`) rồi đổ vào kho tên tài khoản Base.vn | Từ 04/10 cổng trả lỗi có lý do; bên gọi phải giữ kho cũ. Thấy kho `danh-ba-base.json` của Main/Tiến độ/Hợp đồng có mã dạng `…@scigroup.vn` là đã lọt |
| Hỏi lặp công cụ luôn KCDL | `quy_trinh_dang_tac`: Main 252 + Hợp đồng 194 lượt/7 ngày, 100% KCDL; tiếp diễn ở cổng mới 04/10 00:5x (Main 3 lượt) — `nang_luc` đã ghi `san_sang: false`, bên gọi nên thôi hỏi |
| Gửi mã việc Base.vn số sang `trang_thai_cong_viec` | Tiến độ 35 lượt "việc Base 10017568" (`TK-HV-001`) — cổng mới chỉ biết `CV-…`, sẽ trả KCDL |
| Hiểu KHONG_TIM_THAY_MA là "chưa ai được giao" | 7.2.3 Thi công san nền: KHONG_TIM_THAY_MA, nhưng việc CV-2026-0074 "Họp dân chi trả đền bù mặt bằng móng turbine (7.2.3)" có mã 🤖 chờ duyệt 2.2.4 Chi trả bồi thường & Lập hồ sơ thuê đất — đúng luật, chưa duyệt thì chưa tính |
| Đọc `nguoi_phu_trach` như email / username Base | `p-dtpc` là mã đơn vị Phòng Đầu tư và Pháp chế; `truong.cd@scigroup.vn` là mã người của Bùi Quế Lâm (email thật `lambq@scigroup.vn`) → dùng `ten_nguoi_phu_trach` / `email_sci` |
| Hiện mã trần không tên (luật 30) | Main Bảng điều hành ghép "Việc … đang ở {nguoiPhuTrach}" — ở cổng mới sẽ ra "đang ở p-dtpc" |
| Quan sát gọi công cụ nghiệp vụ | 04/10 00:47:26 `quansat → base.viec_qua_han` bị chặn KHONG_CO_QUYEN (bài đo của phiên Công việc) |
| `suc_khoe.base_vn` khác `[]` | Agent Công việc không gọi Base.vn — mảng có phần tử là đang hỏi nhầm cổng 3011 cũ |
| Lượt đo để lại vết | 04/10 00:46–01:05 các lượt `do-kiem` / lý do "đo cổng base mới…", "do so viec tung du an…" là bài đo của phiên Công việc, không chấm |
