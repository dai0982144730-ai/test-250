# KIỂM TRA ĐỘC LẬP LẦN 5 — phiên "2 Agent Công việc": Luật 33 hỏi trùng (đợt ②) + kiểm TỔNG THỂ mở việc + Cây việc

> Người gửi: phiên **"2 Agent Công việc"**. Người kiểm: phiên **"0 Kiểm tra độc lập"**.
> Lần 4 (`04-10-lan-4-viec-cua-toi-khuon-giao-viec-o-giao-cho.md`) — kết quả + soát lại `005930e`, sửa `a24a890` · `9dd3b25` · `61622b5` · `8ebafae` · `97b3983`. Lần này tính **từ các commit sửa đó** (chúng chưa được ai đo lại).
> Mr. Đại dặn 05/10: *"Xong lô việc này nhắn tin cho kiểm tra độc lập kiểm tra code"* — lô = đợt ② Luật 33. Mục 8 lần 4 đã báo trước lần 5 kiểm **tổng thể**.
> **Đừng tin lời kể trong file này** — mở file, chạy lệnh, đếm lại. Lời commit không phải bằng chứng.
>
> ⚠ Cùng khoảng giờ có commit của **phiên khác** trong cùng bộ code (TĐ `ec8b1d9` `b7dc8bd` · HĐ `c6777c5` `d040c2d` `8037eff` `fe022cb` `e1d95d7` · Main `23d0b06` · PL `897b7e0` · 3004 `1738848` `1f8c8d3` `bb693cf`). Chúng **không** thuộc đề này — trừ tệp `2-agent-hop-dong/src/lib/mcp/cong-hopdong.ts` (đoạn `hopdong.hoi_trung_viec`) của phiên này đã **lọt vào `fe022cb`** của phiên khác (chỉ mục git dùng chung).

## 0. Cách trả kết quả

- Ghi kết quả vào **cùng thư mục**: `…\6-Agent-cong-viec\CodeSCICongViec\kiem-tra-doc-lap\05-10-lan-5-luat-33-hoi-trung-tong-the.KET-QUA.md`, rồi nhắn **một tin ngắn** cho phiên "2 Agent Công việc" (đường dẫn + kết luận một dòng).
- Luật dự án: `D:\3 SETUP\1 AI\SCI Tiến độ\CLAUDE.md` (Luật 32, 33 ở đầu bảng bổ sung). Báo cáo **tiếng Việt**, bảng ngắn, `file:dòng`, mã luôn kèm tên (luật 30).
- **CHỈ SOÁT**: không sửa code, không sửa MD, không commit. Muốn chứng minh lỗi thì viết bài test tạm, chạy, dán số, rồi XOÁ.

**Luật an toàn (bắt buộc):**

| Cấm | Vì sao |
|---|---|
| Mở `6-Agent-cong-viec/CodeSCICongViec/data/pgdata` khi cổng 3004 đang chạy | Làm hỏng WAL (02/10). Chép ra scratchpad, tạo các thư mục rỗng `pg_notify pg_tblspc pg_replslot pg_twophase pg_snapshots pg_commit_ts pg_serial pg_dynshmem pg_stat_tmp pg_logical/snapshots pg_logical/mappings`, xoá `postmaster.pid` |
| `next build` ở bất kỳ bộ nào | Các cổng dev đang chạy (3003 · 3004 · 3010 · 3012 · 3013 · 3014) |
| Bấm **"AI soạn việc giao"** / **"Vẫn soạn việc riêng"** / trợ lý chat soạn việc trên app thật | Mỗi lượt gọi AI thật + ghi nháp thật + hỏi 4 agent (mỗi agent có ứng viên lại gọi AI). Thử bằng **bài test tạm** giả `hoi-trung-hoi` + `providers` |
| Giao việc thật | Tạo việc thật ở sổ cái agent Công việc, chuông tới người thật |
| Gọi cổng MCP bằng `agent_goi` của agent thật | Dùng `agent_goi: "kiem-doc-lap"` + đầu thư `x-sci-noi-bo` (sha256 hex của `"noi-bo:" + AUTH_SECRET` trong `4-agent-main/.env.local`). Gửi thân bằng **tệp UTF-8** (`--data-binary @tep.json`) — Git Bash làm hỏng chữ có dấu trên dòng lệnh |
| Mở `3-agent-phap-ly-code/prisma/phaply.db` trực tiếp | Chép ra scratchpad rồi đọc |

**Cookie thử**: scratchpad phiên gửi `C:\Users\Admin\AppData\Local\Temp\claude\D--3-SETUP-1-AI-SCI-Ti-n---\65b6a6c5-fe81-4419-8b8b-510afd96fa3b\scratchpad\` — `ky-thu.mjs <.env.local> <email> <role>` → `sci_session` (Main · TĐ · HĐ · Pháp lý cùng khoá) · `ky-cv2.mjs <CodeSCICongViec/.env.local> <id>` → `sci_congviec_session` (3004; id ví dụ `ptgd.dai@scigroup.vn`).

## 1. Thước đo — Mr. Đại đã chốt

| # | Chốt | Nguồn |
|---|---|---|
| C1 | **Luật 33**: trước khi soạn (máy hay AI) một việc giao, hỏi các agent khác "tôi định giao việc '…' vì '…' — có trùng không". Không trùng → soạn. Đã có → không soạn bản 2, ghi đúng câu *"Việc này đã được agent <tên> soạn giao việc có nội dung là '<nội dung>'"*. Agent không thưa → gọi 3 lần (ngay · 1 phút · 3 phút, mỗi lần chờ ≤15 giây), hết vẫn im → soạn, ghi "chưa hỏi được agent X". Lời hỏi qua sổ (luật 29). Nơi trả lời xét cả việc chờ duyệt lẫn việc đã giao còn mở | `CLAUDE.md` Luật 33 · CHOT `HOP-DONG-KET-NOI-v1.0.md` mục 4.2 (`2a9f6ad`) |
| C2 | Q1: máy lọc ứng viên → 🤖 AI phán, có nút **"Vẫn soạn việc riêng"** | `THIET-KE-VIEC-CHO-DUYET-CHUNG-04-10.md` mục 6 (gốc SCI Tiến độ) |
| C3 | Q3: **người đang chờ** → hỏi 1 lần chờ 15 giây; agent im → soạn luôn kèm "chưa hỏi được", 2 lần còn lại hỏi ngầm, **trùng muộn thì gắn cờ lên nháp** (nháp vẫn hiện) | như trên |
| C4 | Q4: issue loại nhắc (nhắc đóng việc · tồn việc quá hạn) **không sinh việc mới** — *làm ở đợt ⑤, lần này chỉ soát có chỗ nào đang vi phạm* | như trên |
| C5 | Q5: xoá hẳn 16 nháp rác (có sao lưu, theo danh sách mã đã trình) | như trên + bộ nhớ `xoa-du-lieu-theo-danh-sach-ma` |
| C6 | **Luật 32**: việc (và issue dự báo sinh ra nó) chưa tới lúc → không hiện ở đâu; hiện từ 7 ngày trước ngày phải bắt đầu (tính từ lịch THỰC TẾ) | `CLAUDE.md` Luật 32 |
| C7 | Không một việc mở ở hai nơi trở lên; ca mẫu: CV-2026-0124 + CV-2026-0132 cùng 6.1.4 — anh **giữ cả hai làm mẫu kiểm** Luật 33, xong đợt ② huỷ một | trả lời anh 05/10 |
| C8 | Cây việc 3004: "🤔 Mã AI (dưới 70%)" · nút "🤖 AI đề xuất" · 5 nút một hàng bằng nhau · "Đầu việc WBS" · thẻ 4 "Chưa giao trong 7 ngày tới · N việc chờ" · thẻ thấp hơn · xoá dòng "Không còn việc mới…" · dòng "n việc 🤖 chờ duyệt…" chỉ hiện khi bấm Mở | lệnh anh 05/10 sáng |
| C9 | Cây việc 3004: việc đã xong **ẩn** sau chữ xanh "▸ N việc đã xong" ngay sau tên đầu việc WBS, **chỉ mở khi bấm, không bao giờ tự mở**; dòng việc xong = tên chữ xanh + "Xong ngày dd/mm/yyyy" như khối Việc làm xong ở Sơ đồ tổ chức; **số "n việc" chỉ đếm việc chưa xong** (ảnh 1.1.4 → 1) | lệnh anh 05/10 07:00 + trả lời "khung bên phải đếm việc chưa xong" |

⏸ Anh **chưa** chốt (đừng kiểm như lỗi): nút "🤖 AI đề xuất" đổi thành "Chờ duyệt" (cách A/B) · mẫu số thẻ 3 Cây việc bỏ việc "không thuộc WBS".

## 2. Code đã commit — của phiên gửi

| Bộ | Commit | Nội dung |
|---|---|---|
| 3004 | `a24a890` | Sửa theo kiểm lần 4 (test hạn cố định, 11 ô ngày…) |
| 3004 | `14c8ad1` | Cổng `base.hoi_trung_viec` (so với việc đang mở trong sổ cái) |
| 3004 | `6075867` | Cây việc C8 |
| 3004 | `2ad7723` | Cây việc C9 (thêm `xong_ngay` vào truy vấn sổ cái `doc-so-cai.ts`) |
| 3004 | `149cbd1` | Chép khuôn `hoi-trung-kieu.ts` bản mới |
| TĐ | `9dd3b25` · `84e06f7` · `8216cf4` · `291d16c` | Sửa lần 4 · khuôn chung · cổng `tiendo.hoi_trung_viec` · **bên hỏi**: nút AI soạn việc giao + 3 công cụ trợ lý chat |
| HĐ | `61622b5` · `7fc14ca` · `f7a950d` (+ đoạn trong `fe022cb`) · `5c01157` | như TĐ; bên hỏi có lời gọi riêng `src/lib/chung/hoi-trung-hoi.ts` (HĐ không có hàm gọi chung) |
| Main | `8ebafae` · `a44f4b4` · `3abd87e` · `40a5d65` | Sửa lần 4 · **bản gốc** khuôn chung (15 bài test) · cổng `main.hoi_trung_viec` · bên hỏi qua `hoiAgent` (thêm `hanChoMs` + `khongThuLai`) |
| PL | `97b3983` · `b9c461e` · `f15c915` · `492cf31` | Sửa lần 4 · khuôn chung · cổng `phaply.hoi_trung_viec` · **lượt đêm** hỏi trùng (trạng thái `dang_hoi` / `trung`, tab "Trùng việc agent khác", nút "Vẫn soạn việc riêng"), bài đo `scripts/test-hoi-trung-dem.ts` |
| Tài liệu | `2a9f6ad` (CHOT mục 4.2) · `005930e` `5e3c7dc` (soát lại lần 4) | |

Tệp chính: khuôn thuần `hoi-trung-kieu.ts` (Main `src/lib/chung/` — bản gốc; TĐ/HĐ/3004 `src/lib/chung/`; PL `lib/`) · bên trả lời `hoi-trung.ts` (3004 `src/lib/cay-viec/hoi-trung.ts`) · bên hỏi `hoi-trung-hoi.ts` · luồng nháp `viec-ai-soan.ts` (TĐ bản đầu, HĐ/Main dựng lại từ bản TĐ + đắp chỗ riêng) · PL `lib/viec-cho-duyet.ts` + `lib/viec-chay-dem.ts`.

## 3. Việc KHÔNG phải code nhưng có tác động — phải soát

| Việc | Soát gì |
|---|---|
| Xoá 16 nháp rác (TĐ/HĐ/Main `data/viec/viec-ai-soan.json`) — có sao lưu cạnh tệp | Số nháp còn lại · không còn nháp nào thuộc danh sách 16 mã · không mất nháp ngoài danh sách (đã từng xoá nhầm `NH-1791130494317` rồi khôi phục) |
| Gắn mã WBS 6.1.4 cho CV-2026-0132 (sổ cái 3004) | Bản sao pgdata: dòng gắn mã của CV-2026-0132 |
| Giữ CV-2026-0124 + CV-2026-0132 (cùng 6.1.4) | Đây là ca "một việc hai nơi" CÓ CHỦ Ý — ghi nhận, không tính lỗi |
| Một lượt đo thật 05/10 bằng `agent_goi: kiem-doc-lap` gọi `base.hoi_trung_viec` (1 lượt AI phán ở 3004, 5,2 giây) | Sổ nhật ký 3004 có đúng 1 lượt `llm` lúc ~07:58 |

## 4. Hướng đã BỎ / dời — soát rác

- Cửa ĐỌC · GIAO · BỎ QUA của khuôn chung dời sang đợt ③–⑥ (đã báo anh) — không được có code nửa vời của chúng.
- Kiểu `hoiTrung` viết tay trong `NhapViecAi` (bước 3) đã thay bằng `BanGhiHoiTrung` từ khuôn chung.

## 5. Điểm phiên gửi tự thấy đáng ngờ — ưu tiên soát

1. **Hạn chờ 15 giây vs bên trả lời gọi AI**: 3004 đo 5,2 giây (`runAIGan` tắt nghĩ dài). TĐ/HĐ/Main trả lời bằng `runAI` (CLI) — chưa đo; nếu > 15 giây thì bên hỏi coi là "không thưa", gọi lại sau 1 phút → **AI bên kia chạy lần 2**. Đo thật một ca có ứng viên ở `tiendo`/`hopdong`/`main`.
2. **Trùng muộn ghi đè** (`sauKhiHoiNot` trong `soanViecTuIssue` / `ghiNhapCoHoiTrung`): lượt hỏi ngầm xong sau khi người đã bấm Giao → cờ ghi lên nháp đã giao. Có hại không?
3. **Giữ chỗ chỉ chặn cùng người + cùng thẻ** (TĐ/HĐ). Hai người khác nhau cùng agent bấm soạn cùng một thẻ → hai nháp (nếp này có từ trước, Luật 33 chỉ nói giữa các agent) — ghi nhận hay lỗi?
4. **Định dạng hạn lệch**: nháp lưu `han` dd/mm/yyyy, khuôn `CauHoiTrung.han`/`ViecDeSo.han` ghi yyyy-mm-dd — `viecDeSoTuNhap` đưa nguyên dd/mm/yyyy. Máy lọc có dùng hạn không? Có sai gì không?
5. **Bản ghi trùng (TĐ/HĐ/Main) nằm mãi trong tệp nháp** — không hiện ở Việc của tôi, chỉ hiện câu trên thẻ cảnh báo; thẻ đóng thì bản ghi còn. Rác dữ liệu?
6. **Pháp lý hỏi lại bản ghi `trung` mỗi đêm** (để biết việc bên kia đã xong chưa) → mỗi đêm có thể tốn một lượt AI phán ở bên kia cho mỗi bản ghi trùng.
7. **Main `hoiAgent`**: ma trận "ai được gọi ai" chặn cặp nào thì lượt hỏi thành "không thưa" và bị gọi lại 3 lần (chế độ người chờ: 1 lần + 2 ngầm). Đo ma trận hiện có chặn cặp nào trong `AGENT_HOI_TRUNG` không.
8. **Cây việc C9**: dòng đầu việc WBS đổi từ `<button>` sang `<div role="button">` để chứa nút "việc đã xong" — trợ lý tự thao tác giao diện (`data-lenh="cay-viec.xem-nut"`) còn bấm được không? Số ở dòng giai đoạn (`demViec`) đổi nghĩa thành "chưa xong" — chỗ nào khác dựa vào số cũ?
9. **Luật 19**: câu trùng hiện kèm 🤖 (máy ghép câu, AI quyết trùng) — đúng luật?
10. **Đường soạn việc CHƯA hỏi** (phiên gửi tự khai): TĐ `src/lib/canh-bao/nhac-im-lang.ts:176` (máy soạn nhắc nộp BC ngày) · 3004 soạn giao trên Cây việc (`src/lib/cay-viec/soan-giao.ts`) và AI nhặt việc từ báo cáo. Còn đường nào khác? (grep `ghiNhapTuDo(` · `giaoSangCongViec(` · `giaoViecSangCongViec(` · `soanViecChoDuyet(` · đường tạo việc trong 3004)

## 6. Danh mục kiểm (ghi số)

**A. Code đợt ② + Cây việc**
1. `npx tsc --noEmit -p .` ở 5 bộ.
2. Test: Main/TĐ/HĐ `npx vitest run` · PL `npx tsx scripts/test-hoi-trung-dem.ts` (+ `npm test` nếu chạy được — đứt từ `831a7c7`, không phải lô này) · 3004 `DOCFLOW_DB=memory npx vitest run --maxWorkers=2`. Hỏng cũ không tính: HĐ `nhan-dien-agent` · Main 3 bài `man-cua-main`. **Đếm lượt AI/agent thật trong test = 0.**
3. **Luật 7**: `hoi-trung-kieu.ts` 5 bản giống hệt (bỏ qua xuống dòng) · `NutAiSoanViec.tsx` + `ViecView.tsx` TĐ = HĐ (= Main với ViecView) · `viec-ai-soan.ts` HĐ/Main chỉ khác bản TĐ ở chỗ riêng có chủ ý.
4. **Luật 29**: `grep -rn "fetch(" src/lib` (PL `lib`) — mọi lượt hỏi trùng đi qua `goiCoGhi` / `hoiAgent` / `goiCongCoGhi`; hàm gọi thật không export.
5. **Cổng trả lời** (5 agent): gọi `<ma>.hoi_trung_viec` bằng tệp JSON — ca có ứng viên (6.1.4 HV), ca không ứng viên (0 lượt `llm` trong sổ), ca dự án lạ, ca thiếu `noi_dung`. Đo thời gian từng agent (điểm 1 mục 5).
6. **Bên hỏi** bằng bài test tạm: trùng ngay → không gọi AI soạn · agent im → lần 1 trả, 2 lần ngầm, trùng muộn gắn cờ · "Vẫn soạn việc riêng" dùng lại bản ghi · AI soạn lỗi → không còn giữ chỗ · PL agent im một lần thì hồ sơ sau không chờ.
7. **Màn**: curl 200 + đọc HTML — TĐ/HĐ `/alerts` `/viec-cua-toi` · Main `/viec-cua-toi` · PL `/duyet-giao-viec?loc=trung` · 3004 `/cay-viec?du_an=HV` (đếm: dòng 1.1.4 hiện "1 việc", có "▸ 1 việc đã xong", khối việc xong không có sẵn trong HTML lúc mới mở).

**B. TỔNG THỂ (anh dặn ở lần 4 mục 8)** — trên dữ liệu thật (bản sao), dự án HV + một dự án khác:
8. **Issue ở các agent**: TĐ `GET /api/canh-bao?project=dien-gio-huong-viet-hv-du-lieu` · HĐ `/api/canh-bao` · PL bảng `Issue` (bản sao) · 3004 màn Issue — đếm issue mở theo nguồn.
9. **Không mở sớm (Luật 32)**: issue dự báo / việc có ngày phải bắt đầu > hôm nay + 7 (tính từ lịch thực tế) còn hiện ở đâu không — TĐ (2 luật dự báo `2a86036`), 3004 Cây việc (thẻ 4 "Chưa giao trong 7 ngày tới"), **Pháp lý** (đã biết: chưa trừ 7 ngày — xác nhận số).
10. **Không rác**: nháp chờ duyệt có hạn đã qua · nháp của thẻ đã giao · nháp trùng tên trong cùng người · giữ chỗ `dang_hoi` quá 10 phút (TĐ/HĐ/Main tệp nháp; PL bảng `ViecChoDuyet`).
11. **Không một việc nhiều nơi**: sổ cái 3004 — việc đang mở trùng nhau (cùng dự án + cùng mã WBS + nội dung gần) ngoài cặp mẫu CV-2026-0124/CV-2026-0132; nháp chờ duyệt ở TĐ/HĐ/Main/PL trùng với việc đã giao ở 3004. Liệt kê từng cặp.
12. **Hỏi nhau trước khi mở**: sổ nhật ký 5 agent — đếm lượt `*.hoi_trung_viec` từ 05/10 07:00 · có lượt soạn việc nào (sổ `llm` `viec.soan_tu_issue`) KHÔNG có lượt hỏi trùng đi trước cùng phút không.
13. **C4 (Q4)**: issue loại nhắc đóng việc / tồn việc quá hạn đang sinh việc mới ở đâu không.

**C. Luật chung trên phần đã sửa**: tiếng Việt mọi chữ ra màn và lỗi (gồm câu trả lời cổng) · luật 30 · luật 31 · ngày dd/mm/yyyy · luật 28 · luật 17 (3004 ẩn nút không quyền; PL nút mờ kèm lý do) · luật 10 (`hoi-trung-kieu.ts` thuần; `ViecView.tsx` client chỉ import tệp thuần).

## 7. Khuôn kết quả

1. **Kết luận một dòng.**
2. Bảng chốt C1–C9: đạt / một phần / không · bằng chứng `file:dòng`.
3. Bảng phát hiện nặng → nhẹ: # · mức · mô tả lời thường · `file:dòng` · kịch bản lỗi (đầu vào → kết quả sai) · đề xuất (không tự sửa). Nặng = một việc ra hai bản / hỏi trùng bị bỏ qua / agent khác nhận câu trả lời sai / mất dữ liệu / sai quyền. Vừa = ca hiếm nhưng có thật. Nhẹ = chữ, dọn dẹp.
4. Trả lời từng điểm mục 5 (đúng nghi / không lỗi / chưa kiểm được).
5. Bảng số mục 6-B (tổng thể) theo từng agent.
6. Bảng số tsc + test từng bộ.
7. Đã kiểm xong · chưa kiểm được (vì sao) · cần Mr. Đại quyết.
