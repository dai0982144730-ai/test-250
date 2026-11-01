# SOÁT LẠI kết quả kiểm độc lập — Token AI lần 2 (phiên "1 Agent quan sát", 04/10/2026 chiều)

> Kết quả phiên kiểm: `04-10-token-ai-lan-2-tai-khoan-thong-ke-ket-noi.KET-QUA.md` — 0 🔴 · 16/16 chốt đạt · 5 🟡 · 8 ⚪.
> Phiên gửi đo lại từng điểm trước khi sửa. Đúng thì sửa, sai thì ghi vì sao.

## 5 điểm 🟡 — cả 5 ĐÚNG, đã sửa

| # | Điểm | Đo lại | Sửa |
|---|---|---|---|
| 1 | "Thử trợ lý AI" đi hàng chờ thường; trúng hết / 401 không đánh dấu | Đúng: `thuTaiKhoan` gọi `runCliPromptDich` ngoài `chayUuTien` → `laUuTien()` = false; nhánh `catch` chỉ trả lỗi | Bọc `chayUuTien`; hết hạn mức → `danhDauHet` / `danhDauHetCaNhan` (giờ mở lại đọc từ câu CLI); 401 → `danhDauHongDangNhap`. Test: hết → `het_den` = mốc CLI báo; 401 → mất đăng nhập; trả lời được → không đánh dấu |
| 2 | Thanh "Đang dùng" chỉ đọc TK1; nhãn "Đang dùng" trên thẻ theo tài khoản chính | Đúng | Hàm mới `taiKhoanDangDung()` (chính dùng được → chính; hết / mất đăng nhập → phụ; cả hai hết → chính; **không** đổi theo "chính đang bận" để nhãn khỏi nhảy). `/api/ai/status` + `GET /api/ai/tai-khoan` (`dang_dung`) + thẻ dùng hàm này. Đo sống: `dang_dung: 1`, thanh trên vẫn đúng email |
| 3 | 3 cửa cũ (`login-cli`, `dan_ma`, `luu`) còn sống | Đúng. Đo trước khi đóng: `tk1`, `tk2` trống, không tài khoản cá nhân nào có mã → đóng không ai mất đăng nhập. Không hỏi lại anh: lựa chọn anh bấm ghi rõ "bỏ cửa sổ trên máy chủ và bỏ Dán mã dài hạn" | Cả 3 trả **410** câu Việt chỉ đường mới (một hằng `CAU_CUA_DANG_NHAP_CU` ở `dang-nhap-link.ts`), vẫn kiểm quyền trước (người thường 403). Test `ai-ket-noi-cli` viết lại: 410 · không chạy gì · KHÔNG xoá file đăng nhập. Thư viện đọc mã cũ (`kieu "ma"`) để nguyên — không còn cửa nào ghi được |
| 4 | `mo_link` không trần tổng | Đúng | `TRAN_LUOT_CHO = 5`; lượt thứ 6 nhận "Đang có 5 lượt đăng nhập Claude chờ dán mã cùng lúc (tối đa 5)…"; người đã có lượt bấm lại thì thay lượt cũ, không bị chặn. Lượt thoát (thành công / mã sai / tự hỏng) tự rời danh sách chờ |
| 5 | Bộ lọc mã chưa theo dạng thật | Đúng — chưa ai đăng nhập trọn | Nới thêm `= % / +` ở máy chủ (`chuanHoaMaLink`) và trình duyệt (`RE_MA`); vẫn qua stdin. ⏸ Chốt lại sau khi anh đăng nhập thử lần đầu |

## ⚪ đã làm

| # | Điểm | Làm |
|---|---|---|
| 6 | "(Claude báo: …)" ghép tiếng Anh thô | Bỏ hết; `lyDoTiengViet`: mạng → "máy chủ không kết nối được tới Claude (mạng)" · mã 5xx → "máy chủ của Claude đang lỗi" · 4xx → "Claude từ chối yêu cầu đăng nhập" · còn lại "chi tiết kỹ thuật ở nhật ký máy chủ"; câu gốc ghi `console.warn`. Test: câu mã sai không chứa "Login failed / status code" |
| 7 | Nghi #1 không tái hiện; giữ 251ca54 | Đồng ý. Không viết test "tiến trình chết sau huỷ" — CLI giả chạy qua `.cmd`, huỷ giết `cmd.exe` chứ không giết `node` con (khác `claude.exe` thật là con trực tiếp) nên bài test sẽ sai cách |

## ⚪ chưa làm (để lại có lý do)

| # | Điểm | Vì sao |
|---|---|---|
| 8 · 9 | Đăng nhập trọn bằng link; điện thoại | Chỉ người thật làm được — chờ anh |
| 13 | `GET /api/ai/tai-khoan` 2,7 s | Màn mở ít, chưa đáng thêm bộ nhớ đệm |
| 14 | 5.039 thư mục `docflow-*` rác trong `%TEMP%` | Ngoài phạm vi, nhiều phiên cùng tạo — báo anh, chưa xoá |

## Đo cuối

tsc 0 lỗi · `tests/unit/ai-*` **108/108** (13 file) · sổ dùng AI 28 → 28 dòng (0 lượt Claude thật) · `curl`: 3 cửa cũ → câu "Cách đăng nhập này đã bỏ…", `/cai-dat?tab=ket-noi&muc=ai` + `/tai-khoan-claude` 200 · tiến trình `claude.exe auth login`: 0 · thư mục thử `ca-nhan/` đã xoá (không có `.credentials.json`).
