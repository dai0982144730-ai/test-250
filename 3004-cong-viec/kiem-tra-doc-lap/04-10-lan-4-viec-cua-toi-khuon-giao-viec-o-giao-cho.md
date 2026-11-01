# KIỂM TRA ĐỘC LẬP LẦN 4 — phiên "2 Agent Công việc", từ sau lần 3 (04/10 10:47) tới 04/10 19:51

> Người gửi: phiên **"2 Agent Công việc"**. Người kiểm: phiên **"0 Kiểm tra độc lập"**.
> Lần 3 (`04-10-lan-3-dot2-quyen-du-an-cong-base.md`) soát tới 04/10 01:03, soát lại xong 10:47.
> Mr. Đại giao tối 04/10: *"kiểm tra code các việc bạn làm kể từ lần kiểm tra gần nhất tới giờ"* — trước khi phiên này làm khối lượng lớn tiếp theo (bảng tổng việc AI soạn chờ duyệt).
> **Đừng tin lời kể trong file này** — mở file, chạy lệnh, đếm lại. Lời commit không phải bằng chứng.
>
> ⚠ Cùng ngày còn có kiểm độc lập của **phiên khác** trong cùng bộ code (Main `kiem-tra-doc-lap/04-10-lan-1-bao-cao-sang…`, Pháp lý `kiem-tra-doc-lap/04-10-lan-1-phap-ly…`, Quan sát token AI). Commit của họ **không** thuộc đề này — danh sách đúng của phiên gửi ở mục 2.

## 0. Cách trả kết quả

- Ghi kết quả vào **cùng thư mục**: `…\6-Agent-cong-viec\CodeSCICongViec\kiem-tra-doc-lap\04-10-lan-4-viec-cua-toi-khuon-giao-viec-o-giao-cho.KET-QUA.md`, rồi nhắn **một tin ngắn** cho phiên "2 Agent Công việc" (đường dẫn + kết luận một dòng). Phiên gửi soát lại từng điểm bằng đo thật — đúng thì sửa, sai thì nói vì sao kèm số.
- Luật dự án: `D:\3 SETUP\1 AI\SCI Tiến độ\CLAUDE.md`. Báo cáo **tiếng Việt**, bảng ngắn, `file:dòng`, mã luôn kèm tên (luật 30).
- **CHỈ SOÁT**: không sửa code, không sửa MD, không commit. Muốn chứng minh lỗi thì viết bài test tạm, chạy, dán số, rồi XOÁ.

**Luật an toàn (bắt buộc):**

| Cấm | Vì sao |
|---|---|
| Mở `6-Agent-cong-viec/CodeSCICongViec/data/pgdata` khi cổng 3004 đang chạy | Làm hỏng WAL (đã xảy ra 02/10). Chép ra thư mục mới trong scratchpad rồi mới mở; tạo thêm các thư mục rỗng `pg_notify pg_tblspc pg_replslot pg_twophase pg_snapshots pg_commit_ts pg_serial pg_dynshmem pg_stat_tmp pg_logical/snapshots pg_logical/mappings`, xoá `postmaster.pid` |
| `next build` ở bất kỳ bộ nào | Các cổng dev đang chạy (3003 · 3004 · 3010 · 3012 · 3013 · 3014) |
| **Giao việc thật** để thử (POST giao ở 5 agent) | Tạo việc thật trong sổ cái agent Công việc, chuông bắn tới người thật. Thử chặn hạn đã qua / phạm vi giao bằng **bài test tạm** (`DOCFLOW_DB=memory` ở 3004; giả `fetch` ở Main/Tiến độ/Hợp đồng). Nếu buộc phải gọi thật: tên có chữ "test", ghi lại mã việc để phiên gửi dọn |
| Gọi cổng MCP bằng `agent_goi` của agent thật | Sổ ghi như lượt thật. Dùng `agent_goi: "kiem-doc-lap"` + đầu thư `x-sci-noi-bo` (sha256 hex của `"noi-bo:" + AUTH_SECRET` trong `4-agent-main/.env.local`) |
| Mở `3-agent-phap-ly-code/prisma/phaply.db` trực tiếp | Chép ra scratchpad rồi đọc |

**Cookie thử** (ký bằng khoá thật, sống 30 phút — ký lại khi hết): scratchpad phiên gửi `C:\Users\Admin\AppData\Local\Temp\claude\D--3-SETUP-1-AI-SCI-Ti-n---\65b6a6c5-fe81-4419-8b8b-510afd96fa3b\scratchpad\`
- `ky-thu.mjs <đường .env.local> <email> <role>` → chuỗi cho cookie `sci_session` (Main · Tiến độ · Hợp đồng · Pháp lý dùng chung khoá).
- `ky-cv2.mjs <CodeSCICongViec/.env.local> <id người 3004>` → chuỗi cho cookie `sci_congviec_session` (3004 khoá riêng; id ≠ email — tra bảng người trên bản sao pgdata).

## 1. Thước đo — Mr. Đại đã chốt

| # | Chốt | Nguồn |
|---|---|---|
| C1 | **Duyệt tại chỗ**: việc AI agent khác soạn mà người đã duyệt ở agent đó → agent Công việc nhận thẳng, không bắt duyệt lần hai | CHOT `0 Tài liệu thiết kế/CHOT/LOI-DUNG-CHUNG-v1.0.md` 6g.7 mục 2 · bộ nhớ `duyet-5-muc-04-10.md` |
| C2 | **Việc của tôi thu gọn** ở Main/Tiến độ/Hợp đồng: nháp AI duyệt tại chỗ + 3 danh sách (tôi giao · tôi nhận · cần phối hợp) đọc từ agent Công việc; Tiến độ/Hợp đồng theo dự án đang chọn; **bỏ Base.vn** (Base.vn hết hợp đồng — gỡ tới đâu làm tới đó) | 6g.7 mục 3 · bộ nhớ `go-base-vn.md` |
| C3 | **Việc của tôi hai nửa**: 2 nửa cao màn hình; Sửa = ô giao giống nút "+" của agent Công việc (dự án không bắt buộc, có 📎) | bộ nhớ `viec-cua-toi-hai-nua.md` |
| C4 | **Khuôn giao việc chung** mọi màn: thẻ ô chữ + chọn người + **Giao việc / Sửa / Bỏ qua**; Sửa ở khu phải hoặc popup; bấm một việc mở **popup thẻ việc nhúng** của agent Công việc | bộ nhớ `khuon-giao-viec-ai-04-10.md` |
| C5 | Đổi chữ hiển thị "Agent Base" → "agent Công việc"; **giữ mã máy `base`** + `/api/mcp/base` | 6g.7 mục 4 · `chuyen-vai-base-sang-cong-viec.md` |
| C6 | Từ điển ngữ cảnh: Main tự ghép (dự án + sơ đồ tổ chức + chức năng nhiệm vụ); agent con trỏ về Main; trần chèn prompt 20.000 ký tự | 6g.7 mục 5 |
| C7 | **Cây việc** agent Công việc: một danh sách gán mã, cây dời lên, thẻ bấm tiêu đề; 4 nút lọc **chỉ bật một** (bấm lại = xem tất cả); **chỉ việc lá**, cửa sổ giao 7 ngày | 6g.7 mục 6 · `viec-cua-toi-hai-nua.md` |
| C8 | **Ô "Giao cho" bản gọn** (mọi hộp giao việc, cả màn Dự án 3004): bấm = Ban lãnh đạo (trừ trợ lý) + đơn vị theo sơ đồ; gõ `@` = tên người, lọc theo đầu từ; **cả hai chỉ hiện nơi người bấm giao được** | bộ nhớ `o-giao-cho-2-trong-1.md` (bản gọn cuối) |
| C9 | **Màn Issue 3004**: khối giao việc ngay dưới mỗi thẻ ở danh sách trái; Bỏ qua = nhớ "không cần giao"; Sửa → khu phải | `issue-khoi-viec-trong-danh-sach.md` |
| C10 | **Không gửi việc có hạn đã qua** — cả 5 agent (Main · Tiến độ · Hợp đồng · Pháp lý · Công việc); câu báo tiếng Việt, nút mờ + chỉ cách sửa | chốt tối 04/10 · `viec-cho-duyet-tong-hop.md` |
| C11 | **Luật thời điểm**: việc chưa cần thì **ẨN HẲN**, hiện từ 7 ngày trước ngày phải bắt đầu làm. Tiến độ: 2 luật dự báo (quá hạn hợp đồng · giấy phép hết hạn) ẩn cả issue. Cây việc: ẩn chữ xám "chưa tới lúc" + khối giao. *(Pháp lý chưa làm — ngoài đề)* | `viec-cho-duyet-tong-hop.md` |
| C12 | Tắt tự kéo danh bạ `base` cho tới đợt sửa "Việc của tôi" | chốt sáng 04/10 · `chot-04-10-kiem-doc-lap.md` |
| C13 | Luật chung: 29 (gọi agent khác qua hàm bọc ghi sổ) · 30 (mã + tên) · 31 (khoảng ngày kèm số ngày) · 17 (3004: nút không quyền **ẨN**; agent khác: mờ) · 28 (chữ thuần không viền) · 19 (🤖 trước chữ LLM) · 10 (lib đụng `node:fs` tách tệp thuần) · ngày dd/mm/yyyy (ô nhập `ONhapNgay`, cấm `type="date"`) · tiếng Việt mọi chữ ra | `CLAUDE.md` · `ngay-dd-mm-yyyy.md` |

## 2. Code đã commit — 51 commit ở 5 bộ code (+ 4 commit tài liệu ở `0 Tài liệu thiết kế`: `8c3cd41` · `4079d21` · `b24f15b` · `bc03df4`)

Xem bằng `git -C <bộ> show <mã>`. Gốc: `D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT\`. Giờ là giờ VN 04/10.

**A. Agent Công việc — `6-Agent-cong-viec/CodeSCICongViec` (15)**

| Commit | Giờ | Việc · tệp chính |
|---|---|---|
| `79fd821` | 10:47 | Ghi 4 chốt sáng vào soát lại lần 3 (chỉ MD) |
| `f30a3ea` | 11:35 | C1 duyệt tại chỗ — `lib/cay-viec/nhan-tu-agent.ts` (mới) · `soan-giao.ts` · `api/cay-viec/soan-giao/route.ts` · `middleware.ts` |
| `fc8334c` | 11:56 | C7 cây việc một danh sách — `CayGiaiDoan.tsx` · `CayViecView.tsx` |
| `ec42e41` | 12:17 | Cổng `base` công cụ thứ 16 `base.viec_cua_toi` — `lib/mcp/cong-base.ts` · `cong-base-thuan.ts` |
| `c45e85d` | 12:51 | Cây việc thanh lọc 2 hàng, "Xem thêm", Sửa bung ô giao; nhận việc từ Main |
| `484dd1a` | 13:37 | Cửa sổ giao 7 ngày + chỉ việc lá; nhận việc/tệp từ agent khác — `api/cay-viec/soan-giao/tep/route.ts` (mới) · `lib/cau-hinh/*` · `issue/chay.ts` · `issue/sinh.ts` |
| `a7534b5` | 15:25 | C4 khuôn chung ở Cây việc + Issue; **trang nhúng** `app/nhung/viec/[ma]/page.tsx` · `TheViecNhung.tsx` · `OGiaoSua.tsx` · `ONhapNgay.tsx` · `AppShell.tsx` |
| `8a00916` | 16:04 | 4 nút lọc chỉ bật một; dòng công việc nền vàng nhạt |
| `b84eef2` | 17:47 | Ô Giao cho bản "2 trong 1" (**đã bỏ** — xem mục 4) |
| `f7e12da` | 18:15 | C8 ô Giao cho bản gọn — `lib/cay-viec/noi-nhan-thuan.ts` · `OChonNoiNhan.tsx` · test `noi-nhan.test.ts` |
| `f493880` | 18:24 | C8 màn Dự án — `api/phong/noi-nhan/route.ts` (mới) · `SoDoPhong.tsx` |
| `f6b9f23` | 18:31 | C9 khối giao dưới thẻ issue — `KhoiViecIssue.tsx` (mới) · `issue/model.ts` (`khongCanGiao`) · `so-issue.ts` · `api/cay-viec/issue/route.ts` (hành động `khong-can-giao`) |
| `3c35c34` | 18:58 | Issue găng: "Kết quả cần có" lấy câu mặc định việc găng; chữ hạn = ngày xong theo tiến độ |
| `ea141f0` | 19:33 | C10 — `lib/so-cai/dich-vu.ts` `giaoViec` chặn hạn < hôm nay (miễn `tu_tai_lieu` · `cong_viec_id`) · `PhaiCayViec.tsx` · `KhoiViecIssue.tsx` |
| `893e0bd` | 19:51 | C11 cây việc ẩn chữ xám + khối giao chưa tới lúc |

**B. Main — `4-agent-main` (11)**

| Commit | Việc · tệp chính |
|---|---|
| `c0acc4b` | C12 tắt tự kéo — `lib/chung/danh-ba.ts` |
| `5636f22` | C5 đổi chữ hiển thị (16 tệp) |
| `34a88a0` | C6 từ điển tự ghép — `lib/tu-dien-ghep.ts` · `lib/tu-dien-ngu-canh.ts` (mới) |
| `c9a024a` | C2 Việc của tôi qua agent Công việc — `lib/chung/viec-cong-viec.ts` · `viec-cong-viec-kieu.ts` (mới) · `api/viec/nguoi-nhan/route.ts` · `chat-tools.ts` |
| `66dbdeb` | C3 hai nửa + `FormGiaoCongViec.tsx` · `api/viec/tep/route.ts` |
| `2a1b704` | Trợ lý chat giao thẳng sang agent Công việc; **xoá** lớp Base.vn (`lib/chung/viec.ts` · `noi-lam-viec.ts` · `FormGiaoViec` · `GhimNoi` · `PanelChiTiet` · route `viec/chi-tiet` · `viec/ghim`) |
| `97ffe5b` | C4 thẻ khuôn chung + `PopupViecCV.tsx` (khung nhúng thẻ 3004) |
| `89d0cd3` | Nháp của thẻ đã giao thì ẩn hết |
| `43b4e6a` | Ô Giao cho "2 trong 1" (**đã bỏ**) |
| `aa7ea35` | C8 bản gốc `components/tabs/viec/OChonNoiNhan.tsx` (chép sang Tiến độ/Hợp đồng) |
| `ab656b4` | C10 — `homNayIso()` + chặn trong `giaoSangCongViec` · `chat-tools.ts` `toolSoanViecGiao` · `ViecView.tsx` |

**C. Tiến độ — `5-Agent-tien-do` (9)**: `93fbd70` C12 · `9e3cd66` C5 · `e134b40` C6 trần 20.000 · `96bf272` C2+C4 (chép từ Main; nút "AI soạn việc giao" ở trang Cảnh báo mở popup — `NutAiSoanViec.tsx`) · `25ce9e0` nháp đã giao ẩn; giao từ màn nào issue nguồn cũng ghi "Đã giao việc" · `7750cb9` "2 trong 1" (**bỏ**) · `4d7d4e2` C8 chép bản gốc · `2098f7f` C10 · `2a86036` **C11** — `lib/canh-bao/cau-hinh.ts` (`hienDuBaoTruocNgay` mặc định 7) · `lib/hop-dong/moc-hop-dong.ts` (`theQuaHanHopDong` dùng `actualStartCalc ?? start`) · `lib/phap-ly/han-giay-phep.ts` (`NGAY_XIN_GIA_HAN = 30`) · `lib/canh-bao/chay.ts` · `NamCauHinhCanhBao.tsx`

**D. Hợp đồng — `2-agent-hop-dong` (8)**: `0d55c5a` C12 · `f200129` C5 · `39c03fc` C6 · `772ae24` C2+C4 (chép Tiến độ) · `31fec6f` như `25ce9e0` · `4e74e7e` "2 trong 1" (**bỏ**) · `a9558f4` C8 · `1831601` C10

**E. Pháp lý — `3-agent-phap-ly-code` (8)**: `80a9868` C1 gửi sang agent Công việc, người nhận chọn từ danh sách agent Công việc · `be6f0c1` C5 · `39679ce` C6 · `b6ff39c` sổ: tên công cụ gửi việc bỏ dấu "/" · `f9f7d1b` C4 `components/TheViecChoDuyet.tsx` + `app/api/duyet-giao-viec/tep/route.ts` (xoá `OGiaoChoCongViec.tsx`) · `20de092` "2 trong 1" (**bỏ**) · `f1bda0c` C8 `components/OChonNoiNhan.tsx` (xoá `lib/do-ten-trong-chu.ts`) · `8634bb0` C10 `app/actions/phap-ly.ts` `guiViecSangCongViec` + popup bắt chọn hạn

## 3. Việc KHÔNG phải code nhưng có tác động — phải soát

| # | Việc | Phiên gửi nói |
|---|---|---|
| T1 | **Cổng 3003 (Tiến độ) CHƯA khởi động lại** sau `2a86036` | Trang nạp lại theo dev, nhưng **vòng nền hẹn giờ** (sinh issue đêm) có thể còn chạy luật cũ (bộ nhớ `khoi-dong-lai-khi-sua-code-hen-gio.md`). Kiểm: issue dự báo nào sinh sau 19:51 mà vi phạm C11 |
| T2 | Lượt đo bằng cookie ký thử gọi API thật (Main `/api/issue-main`, 3004 `/api/phong/noi-nhan`, `/api/cay-viec/issue`…) | Phiên gửi **không nhớ chắc** có lượt nào ghi dữ liệu không (thử `khong-can-giao` trên issue thật? giao việc thật?). Kiểm: sổ issue 3004 có `khongCanGiao` nào; sổ cái 3004 việc tạo 04/10 có tên "test"/người tạo "Phiên thử…" không |
| T3 | Ghi ngoài git: `6-Agent-cong-viec/HUONG-DAN-AI-TEST.md` 4.9.15 (ô Giao cho bản gọn) · 4.9.16 (khối dưới thẻ issue) · `kế hoạch và báo cáo công việc.md` · `BAO-CAO-RA-SOAT-AI-TAO-VIEC-04-10.md` (gốc SCI Tiến độ — **đã biết có câu sai** "Tiến độ không có luật thời điểm", chưa sửa) · bộ nhớ `memory/*.md` | — |
| T4 | Chỉ mục git dùng chung giữa các phiên: 04/10 một commit của phiên Quan sát **cuốn theo** việc xoá tệp phiên gửi đã `git rm` sẵn | Kiểm: các tệp phiên gửi xoá (`do-ten-trong-chu.ts` ở 4 bộ, `OGiaoChoCongViec.tsx`, lớp Base.vn ở Main/Tiến độ/Hợp đồng) nằm trong commit nào; cây làm việc còn tệp code của phiên gửi chưa commit không |
| T5 | Danh bạ: tự kéo đã tắt — các agent đang chạy giữ bản kéo cũ | Kiểm: không agent nào còn tự kéo danh bạ `base` |

## 4. Hướng đã BỎ — soát rác

| Hướng bỏ | Phải kiểm |
|---|---|
| Ô Giao cho bản **"2 trong 1"** (`@` gợi ý người liên quan, `@@` cá nhân, dò tên trong chữ) — 5 commit `b84eef2 · 43b4e6a · 7750cb9 · 4e74e7e · 20de092` | grep `@@` · `do-ten-trong-chu` · `doTenTrongChu` · `lienQuan` ở 5 bộ: không còn nhánh sống |
| P1 bản đầu "đưa thành việc từ dd/mm/yyyy" | Không còn chữ/nhánh "đưa thành việc từ" |
| Cây việc "vẫn cho giao sớm" (chốt 04/10 chiều) → thay bằng ẩn | `CayGiaiDoan.tsx` · `PhaiCayViec.tsx`: không còn chữ xám chưa tới lúc / khối giao khi `!toiLuc` |
| Pháp lý `OGiaoChoCongViec.tsx` (80a9868) → `TheViecChoDuyet.tsx` | Không import mồ côi |
| Lớp Base.vn ở Main/Tiến độ/Hợp đồng (xoá ở `2a1b704` · `96bf272` · `772ae24`) | grep `noi-lam-viec` · `chung/viec"` · `GhimNoi` · `PanelChiTiet` · `/api/viec/ghim` · `/api/viec/chi-tiet` · `base.vn` ở `src/` |
| `KhoiSoanViec` / nút ✎ / ✓ trong `PhaiIssue.tsx` → khối dưới thẻ | Không còn hai chỗ soạn cho cùng thẻ ở màn Issue |

## 5. Điểm phiên gửi tự thấy đáng ngờ — ưu tiên soát

1. **Hai cửa miễn chặn hạn đã qua ở 3004** (`lib/so-cai/dich-vu.ts` `giaoViec`: miễn khi `tu_tai_lieu` hoặc `cong_viec_id`). Việc agent khác gửi sang (`nhan-tu-agent.ts`, cổng `base`) có đi qua `giaoViec` không, có mang `tu_tai_lieu`/`cong_viec_id` để lọt hạn quá khứ không?
2. **Ngày "hôm nay"**: Main/Tiến độ/Hợp đồng `homNayIso()` theo `Asia/Ho_Chi_Minh`; 3004 `homNayVN()`; Pháp lý? Trình duyệt (`hanDaQua`, `hanQua`) tính theo giờ máy khách? Ca 00:00–07:00 giờ VN có lệch ngày giữa nút mờ (khách) và máy chủ không.
3. **Ô Giao cho — khách lọc có khớp máy chủ chặn?** 3004: `noi-nhan-thuan.ts` (`ca_nhan` = phạm vi "tat_ca" ∨ chính mình ∨ cùng đơn vị trong phạm vi) so với `batBuocTrongPhamVi` ở máy chủ. Ca: kiêm nhiệm · trợ lý Ban lãnh đạo · trưởng có trưởng chính · người phạm vi "tat_ca". Ở Main/Tiến độ/Hợp đồng/Pháp lý: danh sách nơi nhận lấy theo **người bấm** hay theo tài khoản dịch vụ của agent? Nếu hiện người mà máy chủ từ chối → người dùng bấm xong mới báo lỗi.
4. **Màn Dự án 3004** (`SoDoPhong.tsx` · `api/phong/noi-nhan`): giao cho "Ban lãnh đạo" (loại `lanh_dao`) hoặc cá nhân qua `phan_viec` — máy chủ có nhận đúng loại không, hay chỉ quen loại đơn vị.
5. **Một việc giao hai lần**: 3004 issue có khối dưới thẻ (C9) **và** việc găng ở Cây việc; Main/Tiến độ/Hợp đồng ẩn nháp đã giao (`89d0cd3` · `25ce9e0`). Hai người bấm Giao gần như cùng lúc, hoặc giao lỗi giữa chừng (agent Công việc đã tạo việc, ghi "Đã giao" ở issue nguồn hỏng) → có ra 2 việc trong sổ cái không? `maViecDaGiao` kiểm trùng bằng gì?
6. **Trang nhúng `/nhung/viec/<mã>`** (khung trong Main/Tiến độ/Hợp đồng khác cổng): ai xem được việc nào — có kiểm người xem được phép xem việc đó không, hay biết mã là xem được? Có chặn nhúng từ trang lạ (`frame-ancestors`) không? Cookie `sci_congviec_session` trong khung khác cổng có gửi kèm không (SameSite)?
7. **`base.viec_cua_toi`** (`ec42e41`): trả việc theo email do agent gọi truyền vào — chỉ dựa vào khoá nội bộ. Agent gọi truyền email người khác thì đọc được việc của người đó: đúng thiết kế (agent tin nhau) hay phải chặn?
8. **Duyệt tại chỗ** (`f30a3ea`): `middleware.ts` chừa đường nào cho agent khác; chữ "đã duyệt ở agent X" do bên gửi tự khai — có lối nào gửi việc không qua người duyệt?
9. **AI chọn người cho issue găng** (`KhoiViecIssue.tsx` `useNhapViecIssue`): gọi AI lần lượt **mỗi lần mở trang**? Có lưu kết quả không — tốn token lặp lại? Kết quả AI chọn có bị bó trong phạm vi giao của người xem không?
10. **Tiến độ C11**: `theQuaHanHopDong` dùng `actualStartCalc ?? start` — việc đã khởi công thực tế thì luôn hiện (đúng ý "đã tới lúc"?). `NGAY_XIN_GIA_HAN = 30` là **số phiên gửi tự đặt** (không có chốt) — nêu để Mr. Đại quyết.
11. **Từ điển ngữ cảnh** Main tự ghép đo 16.952 ký tự, trần 20.000 — chèn vào prompt mọi lượt chat ở 4 agent? Gần trần thì cắt chỗ nào (cắt giữa câu/mục?).
12. **Pháp lý `b6ff39c`** đổi tên công cụ trong sổ — dòng sổ cũ còn tên cũ: Quan sát gộp/thống kê theo tên công cụ có tách đôi không.
13. **Popup Sửa ở Pháp lý** bắt chọn hạn mới khi hạn cũ đã qua (`TheViecChoDuyet.tsx` `hanCuQua`) — ô nhập ngày có dùng khuôn dd/mm/yyyy không (`type="date"` là sai C13).
14. **Test**: bài `tren-base-giay-phep` (Tiến độ) sửa theo luật mới — phiên gửi đã đổi ngày mong đợi trong test cũ; kiểm việc đổi test là đúng luật, không phải nắn test cho qua.

## 6. Danh mục kiểm (ghi số)

1. `npx tsc --noEmit -p .` ở 5 bộ: `6-Agent-cong-viec/CodeSCICongViec` · `4-agent-main` · `5-Agent-tien-do` · `2-agent-hop-dong` · `3-agent-phap-ly-code`.
2. Test: Main / Tiến độ / Hợp đồng `npx vitest run` · Pháp lý `npm test` · Công việc `DOCFLOW_DB=memory npx vitest run --maxWorkers=2`. Hỏng cũ không tính (theo lần 3): Main 3 bài `man-cua-main` · Tiến độ `trang-trong-app` · Hợp đồng `nhan-dien-agent` · Công việc `chuan-mau-bao-cao`. **Không bài test nào được gọi agent/AI thật** — đếm lượt CLI thật = 0 (bộ nhớ `test-khong-goi-ai-that.md`).
3. **C8 trên dữ liệu thật** (bản sao pgdata): chọn 4 người — PM `dainc`, một lãnh đạo, một trưởng phòng, một nhân viên. Với mỗi người: `GET http://127.0.0.1:3004/api/phong/noi-nhan` (cookie `sci_congviec_session`) → đếm Ban lãnh đạo / đơn vị / người; so với phạm vi giao tính tay từ ma trận quyền. Mỗi mục hiện ra phải qua được `batBuocTrongPhamVi` (chứng minh bằng bài test tạm). Lặp ở Main `GET http://127.0.0.1:3010/api/viec/nguoi-nhan` (cookie `sci_session`).
4. **C10**: bài test tạm — 3004 `giaoViec` hạn hôm qua → lỗi 400 câu Việt, sổ cái không thêm dòng; Main/Tiến độ/Hợp đồng `giaoSangCongViec` hạn hôm qua → `{ok:false}` và **không gọi** `fetch`; Pháp lý `guiViecSangCongViec`. Ca biên: hạn = hôm nay phải qua.
5. **C11**: Tiến độ `GET http://127.0.0.1:3003/api/canh-bao?project=dien-gio-huong-viet-hv-du-lieu` (cookie) → không issue dự báo nào có ngày phải làm > hôm nay + 7; 3004 Cây việc dự án HV: đếm thẻ găng chưa tới lúc còn hiện chữ xám/khối giao (phải = 0).
6. **Trang nhúng**: `curl -i http://127.0.0.1:3004/nhung/viec/<mã có thật>` không cookie · cookie sai một ký tự · cookie người không liên quan việc đó → kết quả từng ca.
7. **Luật 29**: `grep -rn "fetch(" src/lib` ở 5 bộ — các tệp mới/đổi (`viec-cong-viec.ts` Main/Tiến độ/Hợp đồng · `nhan-tu-agent.ts` 3004 · `hoi-base.ts` Pháp lý · `api/viec/tep/route.ts`): lời gọi sang agent khác phải đi qua `goiCoGhi` / `ghiNhatKyMcp`.
8. **Luật 7** (một bản gốc): `diff 4-agent-main/src/components/tabs/viec/OChonNoiNhan.tsx` với bản Tiến độ / Hợp đồng — chỉ khác chỗ cố ý; tương tự `viec-cong-viec.ts` · `viec-cong-viec-kieu.ts` · `FormGiaoCongViec.tsx` · `PopupViecCV.tsx`.
9. Luật trên phần đã sửa: tiếng Việt mọi chữ ra màn và lỗi · luật 30 · luật 31 · ngày dd/mm/yyyy · luật 28 (grep `<span` có `rounded` + `border`/`bg-` trong tệp đã đổi) · luật 17 (3004 nút không quyền phải ẩn) · luật 10 (`noi-nhan-thuan.ts`, `viec-cong-viec-kieu.ts` không import phía máy chủ).

## 7. Khuôn kết quả

1. **Kết luận một dòng.**
2. Bảng chốt C1–C13: đạt / một phần / không · bằng chứng `file:dòng`.
3. Bảng phát hiện nặng → nhẹ: # · mức · mô tả lời thường · `file:dòng` · kịch bản lỗi (đầu vào → kết quả sai) · đề xuất (không tự sửa). Nặng = sai quyền / giao được việc ngoài phạm vi / một việc ra hai bản / mất dữ liệu / agent khác nhận câu trả lời sai. Vừa = ca hiếm nhưng có thật. Nhẹ = chữ, dọn dẹp.
4. Trả lời từng điểm mục 5 (đúng nghi / không lỗi / chưa kiểm được).
5. Bảng số tsc + test từng bộ.
6. Đã kiểm xong · chưa kiểm được (vì sao) · cần Mr. Đại quyết.

## 8. Báo trước lần kiểm SAU (lần 5) — để lần này ghi sẵn điểm nền nếu tiện

Mr. Đại dặn lần 5 sẽ kiểm **tổng thể**: issue ở các agent · các agent mở việc thế nào · trao đổi với nhau thế nào trước khi mở việc (luật mới "hỏi trùng trước khi soạn") · không có việc chưa tới lúc đã vội mở · việc chưa tới lúc không hiện thành rác · không một việc mở ở hai nơi trở lên · cộng code từ lần 4 tới lần 5. Lần này **không** phải kiểm các mục đó; nếu thấy sẵn chỗ vi phạm thì ghi vào mục "ngoài phạm vi" của kết quả.
