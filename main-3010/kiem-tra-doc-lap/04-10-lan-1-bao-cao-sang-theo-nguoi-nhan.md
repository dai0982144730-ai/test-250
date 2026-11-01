# KIỂM TRA ĐỘC LẬP — lần 1 phiên "4 Main agent": báo cáo sáng theo người nhận (04/10/2026)

> Người gửi: phiên **"4 Main agent"** (giữ Main Agent cổng 3010). Phiên bắt đầu 04/10 16:59, **chưa từng được kiểm** → lần này soát TỪ ĐẦU phiên.
> Người kiểm: phiên **"0 Kiểm tra độc lập"**.
> **Đừng tin lời kể trong file này** — mở file, chạy lệnh, đếm lại.

## 0. Cách trả kết quả

- Ghi kết quả vào: `D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT\4-agent-main\kiem-tra-doc-lap\04-10-lan-1-bao-cao-sang-theo-nguoi-nhan.KET-QUA.md`
- Rồi nhắn **một tin ngắn** cho phiên **"4 Main agent"**: đường dẫn file + kết luận một dòng. Phiên gửi soát lại từng điểm (đúng thì sửa, sai thì nói vì sao kèm số) — **không tự sửa code thay**.
- Luật dự án: `D:\3 SETUP\1 AI\SCI Tiến độ\CLAUDE.md`. Báo cáo **tiếng Việt**, bảng ngắn, `file:dòng`, mã luôn kèm tên.
- **Cấm `next build`** (dev 3010 đang chạy, nhiều phiên test song song). Kiểm bằng `npx tsc --noEmit`, `npx vitest run`, `curl`.
- **Cấm gửi Telegram thật** (nút "Gửi ngay", "Gửi thử", `hanhDong: "gui"`) — sẽ nhắn vào điện thoại Mr. Đại. Kiểm phần dựng chữ bằng hàm thuần / vitest.
- Thử API ghi (chọn mẫu, chọn dự án) chỉ trên tài khoản thử `quantri@scigroup.vn`, thử xong **xoá đúng dòng của mình** trong `4-agent-main/data/bao-cao-sang-kich-ban.json`. **Không đụng** dòng `ptgd.dai@scigroup.vn` (Mr. Đại tự đặt lúc 19:01).
- Gọi cổng MCP agent khác: `agent_goi` là mã lạ (vd `kiem-doc-lap-04-10`) + khoá nội bộ, không giả danh `main`.

## 1. Thước đo — Mr. Đại đã chốt (04/10)

| # | Chốt | Nguồn |
|---|---|---|
| C1 | **Kịch bản = BỘ THAM SỐ do code dựng**, không phải lời dặn để AI viết cả bản | trả lời 04/10 chiều |
| C2 | **Góp ý của ai chỉ sửa bản của người đó** | như trên |
| C3 | Công dụng: Chủ tịch — biết dự án nào xấu đi · TGĐ — biết việc nào cần mình quyết · PM — danh sách việc phải xử lý hôm nay | như trên |
| C4 | 3 mẫu Tổng quát · Điều hành · Dự án làm điểm xuất phát. Dự án "dữ liệu test" **không loại** | như trên |
| C5 | *(tối)* Tổng quát · Điều hành = **toàn công ty**. Dự án = **chọn tay 1 hoặc nhiều dự án** trong danh sách dự án công ty ("1 PM quản lý các dự án khác nhau thuộc nhiều BQL dự án") | tin 04/10 tối |
| C6 | Nguyên tắc chung: bớt cú bấm (chọn là lưu, không nút xác nhận) · tiếng Việt mọi chữ ra người dùng · "im lặng dễ nhầm với hỏng" (PLAN-MAIN-AGENT 6.3) · LLM không ước số (phân vai LLM ↔ code 06/09) · luật 10 · 11 · 13 · 17 (Main: nút bị chặn **mờ** kèm lý do) · 18 · 28 · 29 · 30 · 31 | `CLAUDE.md` |

Tài liệu đã ghi chốt: `0 Tài liệu thiết kế/CHOT/PLAN-MAIN-AGENT-v1.0.md` mục **6.6** (mới), 6.4 (dòng "Báo cáo sáng"), mục 7 (nhịp 06:30).

## 2. Code đã commit (`4-agent-main`)

| Commit | Nội dung |
|---|---|
| `198f26a` | Đợt 1: 3 mẫu + gửi theo người nhận + khối Người nhận + 4 lỗi sửa kèm |
| `1df8f3a` | Mẫu Dự án chọn tay 1 hoặc nhiều dự án; mẫu Dự án chưa chọn dự án vẫn nhận 1 tin nhắc |

Tài liệu (`0 Tài liệu thiết kế`): `ae9d14b` · `a781a9b`.

Tệp: `src/lib/bao-cao-sang/kich-ban.ts` (mới, thuần) · `kich-ban-kho.ts` (mới, node:fs) · `dung.ts` · `kho.ts` · `luat-cod.ts` · `model.ts` · `telegram.ts` · `src/app/api/bao-cao-sang/route.ts` · `src/app/api/bao-cao-sang/nguoi-nhan/route.ts` (mới) · `src/app/api/noi-bo/telegram-tro-ly/danh-thuc/route.ts` · `src/components/tabs/bao-cao-sang/KhoiNguoiNhan.tsx` (mới) · `BaoCaoSangView.tsx` · `XemBaoCao.tsx` · `tests/unit/bao-cao-sang-kich-ban.test.ts` (mới) · `tests/unit/bao-cao-sang.test.ts`.

Bốn lỗi sửa kèm (phiên gửi tự đo):

| Lỗi | Số đo phiên gửi nêu | Sửa |
|---|---|---|
| Gửi trùng | 04/10 gửi 3 lần (07:02/03/04), 03/10 hai lần — `data/bao-cao-sang-lich-su.jsonl` | ghi "đã chạy" đầu nhịp + khoá nhịp đang chạy + một lượt dựng/ngày |
| Dựng 21:00 phí công | bản 21:00 mang ngày hôm đó | dời 06:30 cùng ngày |
| "Chưa hỏi được" gộp nhầm cả agent | "Agent Công việc chưa hỏi được vì Tân Thành…" | ghi theo dự án |
| Nhịp chỉ bật khi mở trang Báo cáo | `khoiDongNhipBaoCaoSang` chỉ gọi ở trang + route | route đánh thức nội bộ gọi thêm |

## 3. Việc KHÔNG phải code nhưng có tác động — phải soát

1. **Khởi động lại cổng 3010 ba lần** (≈18:29, ≈19:13, ≈19:16 giờ VN) bằng `taskkill /T /F` rồi để script gác bật lại. Có ghi nhớ phiên khác: giết tiến trình giữa lúc biên dịch làm hỏng bộ đệm Turbopack → 404 hàng loạt. Soát: trang Main còn 200 không.
2. Sau lần khởi động đầu, nhịp "dựng báo cáo" tự chạy → **một bản dựng mới 04/10 lúc 18:31** (1 lượt LLM câu hỏi 🤖, 7 câu). Soát dòng cuối `data/bao-cao-sang-lich-su.jsonl`.
3. **8 lượt gọi `danh_sach_issue`** sang 4 cổng (3003 · 3013 · 3012 · 3004) bằng mã lạ `do-bao-cao-sang-04-10` để đo thẻ — sổ nhật ký các agent có dòng này.
4. Kho mới `data/bao-cao-sang-kich-ban.json`: phiên gửi thử API bằng `quantri@scigroup.vn` rồi **xoá dòng quantri**. Còn lại đúng một dòng `ptgd.dai@scigroup.vn` (mẫu Dự án, chưa chọn dự án) do Mr. Đại đặt 19:01.
5. `data/bao-cao-sang-nhip.json`: `dung-bao-cao-dem` = 2026-10-04 (do nhịp chạy sau khởi động lại).
6. **Sáng mai 05/10 07:00** theo trạng thái hiện tại: chỉ Mr. Đại nhận, và chỉ nhận **1 tin nhắc chọn dự án** (Chủ tịch, TGĐ có mẫu mặc định nhưng chưa nối Telegram). Soát xem đúng vậy không.

## 4. Hướng đã BỎ giữa chừng — soát còn rác không

- Phạm vi "dự án người nhận thuộc theo sơ đồ" (`phamVi: "cua-toi"`, hàm `duAnCuaNguoi`, import `loaiTheoDuAn` / `docToChuc` trong `kich-ban-kho.ts`) — bỏ ở `1df8f3a`.
- Tham số `chiDuAn` — bỏ, thay bằng kho `duAnChon` (một định nghĩa một chỗ).
- Khung "Chữ sẽ gửi qua Telegram" ở `XemBaoCao.tsx` — nay chỉ hiện khi chưa ai có mẫu (`coDuongCu`).
- Đường cũ `ketXuatTelegram` + `guiTelegram()` (một bản, chat `TELEGRAM_CHAT_ID`) — giữ làm dự phòng khi danh sách người nhận rỗng.

## 5. Điểm phiên gửi tự thấy đáng ngờ — ưu tiên soát

1. **Chia tin** `dongGoiTin` (`kich-ban.ts`): khối dài hơn trần, `toiDa = 1`, phần cuối không vừa → có tin nào > 4.096 ký tự (Telegram đếm UTF-16; emoji 2 đơn vị) hay mất dòng "Xem và xử lý"?
2. **Đồng thời**: `dungBaoCao` chờ lượt đang chạy theo ngày; `chayNhipTho` ghi "đã chạy" ngay đầu → hỏng giữa chừng thì cả ngày không chạy lại. Người bấm "Gửi ngay" trong lúc nhịp 07:00 đang chạy → gửi hai lần?
3. **Ghi kho không bọc lỗi**: `ghiKho` trong `kich-ban-kho.ts` ném lỗi đĩa → route trả câu lỗi gốc tiếng Anh?
4. **Quyền chọn dự án**: `chon-du-an` mở ở cửa Xem + chỉ dòng của chính mình. Nhánh "người thường sửa dòng người khác → 403" phiên gửi **chỉ đọc code**, chưa chạy được bằng tài khoản thật (tài khoản giả bị lớp đăng nhập chặn trước). Người xem có được tự chọn dự án không — có trái luật Người xem không?
5. **Ô chọn dự án**: bấm liền tay nhiều dự án — `batTatDuAn` không tải lại khi lưu được; lỗi thì tải lại. Có mất lần bấm không?
6. **Đường cũ dự phòng**: danh sách người nhận rỗng → gửi bản cũ vào `TELEGRAM_CHAT_ID`. Còn trường hợp nào người đã chọn "Không nhận" mà vẫn nhận qua đường cũ?
7. **Mặc định theo chức vụ** so khớp nguyên chữ "chủ tịch hđqt" / "tổng giám đốc" — có ai lọt / nhận nhầm?
8. **Thứ tự dự án** đổi cho cả 3 mẫu (xấu đi so hôm qua lên đầu) — bản Điều hành trước đây theo thứ tự sổ dự án.
9. **Bản cũ trong sổ** (trước 18:31) không có `viecDoKhac`, `maDuAn` ở chỗ thiếu → xem trước ngày cũ ra "(mọi dự án)".
10. **Câu hỏi 🤖 lặp tên việc** (*"7.2.3 Thi công san nền San nền: …"*) — phiên gửi cho là có từ trước (lưới `ganTenChoMa` trong `cau-hoi-ai.ts`), không phải việc này. Xác nhận hay bác.
11. **3 bài test hỏng** ở `tests/unit/man-cua-main.test.ts` (menu trái) — phiên gửi cho là do phiên khác đổi menu, không phải việc này. Xác nhận hay bác.
12. Màu `text-yellow` cho "chưa chọn dự án", `text-green` cho "đã nối" — có định nghĩa (luật 18) không? Ô chọn dự án là nút thật nên có viền (luật 28) — chữ thuần nào lỡ có viền?

## 6. Danh mục kiểm (ghi số)

1. `npx tsc --noEmit` ở `4-agent-main`.
2. `npx vitest run` ở `4-agent-main` — đếm qua/hỏng, tách bài hỏng thuộc / không thuộc việc này.
3. Grep rác mục 4: `duAnCuaToi` · `cua-toi` · `duAnCuaNguoi` · `chiDuAn` trong `src` + `tests`.
4. So từng chốt C1–C6 với code, trỏ `file:dòng`.
5. `curl` cổng 3010 (có phiên `quantri@scigroup.vn`, không phiên thì 307 là bình thường, **500 là lỗi**): `/bao-cao?tab=sang` · `/api/bao-cao-sang` · `/api/bao-cao-sang/nguoi-nhan` · `/alerts` · `/viec-cua-toi` · `/settings`.
6. Dựng chữ 3 mẫu từ dòng cuối `data/bao-cao-sang-lich-su.jsonl` (vitest tạm, xoá sau) — đếm ký tự từng tin, soát tiếng Việt, mã kèm tên (luật 30), không đường dẫn file.
7. Luật dự án trên phần đã sửa: 10 (lib đụng `node:fs` tách file thuần — `kich-ban.ts` có bị màn hình kéo theo `node:fs` không) · 11 (token màu có thật trong `tailwind.config.ts`) · 17 · 18 · 28 · 29 (lượt gọi agent khác qua `goiCoGhi`/`hoiAgent`) · 30 · 31.
8. Tài liệu: PLAN-MAIN-AGENT 6.6 + mục 7 có khớp code không; còn chỗ nào trong `CHOT\` ghi "dựng báo cáo sáng 21:00" hoặc "báo cáo sáng chỉ gửi TELEGRAM_CHAT_ID" mà chưa sửa (luật 6).

## 7. Khuôn kết quả

1. **Kết luận một dòng.**
2. Bảng chốt C1–C6: đạt / một phần / không · bằng chứng `file:dòng`.
3. Bảng lỗi nặng → nhẹ: mức · mô tả lời thường · `file:dòng` · bằng chứng · đề xuất (không tự sửa).
4. Trả lời từng điểm mục 5 (đúng / sai / không kiểm được).
5. Đã kiểm xong · chưa kiểm được (vì sao) · cần Mr. Đại quyết.
