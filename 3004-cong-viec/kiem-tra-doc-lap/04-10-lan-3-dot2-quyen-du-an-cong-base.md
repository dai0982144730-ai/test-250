# KIỂM TRA ĐỘC LẬP LẦN 3 — phiên "2 Agent Công việc", từ sau soát vòng 2 (03/10 20:05) tới 04/10 01:03

> Người gửi: phiên **"2 Agent Công việc"**. Người kiểm: phiên **"0 Kiểm tra độc lập"**.
> Lần 1 (03/10 chiều) soát Đợt 1 + 1b — CHOT `LOI-DUNG-CHUNG-v1.0.md` 6g.6.9. Lần 2 (03/10 19:40) soát 13 commit — 6g.6.11.
> **Đừng tin lời kể trong file này** — mở file, chạy lệnh, đếm lại. Lời commit không phải bằng chứng.

## 0. Cách trả kết quả

- Ghi kết quả vào **cùng thư mục**: `…\6-Agent-cong-viec\CodeSCICongViec\kiem-tra-doc-lap\04-10-lan-3-dot2-quyen-du-an-cong-base.KET-QUA.md`, rồi nhắn **một tin ngắn** cho phiên "2 Agent Công việc" (đường dẫn + kết luận một dòng). Phiên gửi sẽ soát lại từng điểm bằng đo thật — đúng thì sửa, sai thì nói vì sao kèm số.
- Luật dự án: `D:\3 SETUP\1 AI\SCI Tiến độ\CLAUDE.md`. Báo cáo **tiếng Việt**, bảng ngắn, `file:dòng`, mã luôn kèm tên (luật 30).
- **CHỈ SOÁT**: không sửa code, không sửa MD, không commit. Muốn chứng minh lỗi thì viết bài test tạm, chạy, dán số, rồi XOÁ.

**Luật an toàn (bắt buộc):**

| Cấm | Vì sao |
|---|---|
| Mở `6-Agent-cong-viec/CodeSCICongViec/data/pgdata` khi cổng 3004 đang chạy | Làm hỏng WAL (đã xảy ra 02/10). Chép ra thư mục mới trong scratchpad rồi mới mở; tạo thêm các thư mục rỗng `pg_notify pg_tblspc pg_replslot pg_twophase pg_snapshots pg_commit_ts pg_serial pg_dynshmem pg_stat_tmp pg_logical/snapshots pg_logical/mappings`, xoá `postmaster.pid` |
| `next build` ở bất kỳ bộ nào | 6 cổng dev đang chạy (3003 · 3004 · 3010 · 3011 · 3012 · 3013 · 3014) |
| Chạy `scripts/chuyen-len-main.mjs --ghi`, ghi vào `data/` của Main | Dữ liệu thật đã chuyển 04/10 00:10 |
| Gọi cổng MCP bằng `agent_goi` của agent thật (`main`, `tiendo`…) | Sổ ghi như lượt thật. Dùng `agent_goi: "kiem-doc-lap"` + đầu thư `x-sci-noi-bo` (sha256 hex của `"noi-bo:" + AUTH_SECRET` trong `4-agent-main/.env.local`) |

## 1. Thước đo — Mr. Đại đã chốt

| # | Chốt | Nguồn |
|---|---|---|
| C1 | Main là gốc người dùng + tổ chức; agent con chỉ tra | CHOT `LOI-DUNG-CHUNG-v1.0.md` 6g.6.1–6g.6.2 |
| C2 | Đợt 2: Main lưu tổ chức · bộ chuyển · bỏ bảng tài khoản mẫu `Sci@2026` ở trang đăng nhập 4 agent · Hợp đồng hiện đúng người khi chữ ký đứng tên email cũ | 6g.6.12 |
| C3 | Bước E: Ban QLDA · đơn vị làm · Ban điều hành của dự án do **Main** giữ; agent Công việc chỉ hiện | 6g.6.12, 6g.6.13 |
| C4 | Loại tài khoản: Tiến độ · Hợp đồng · Pháp lý theo **TỪNG dự án** (thuộc dự án = Người dùng, không thuộc = Người xem); lãnh đạo (vai "Lãnh đạo" ở agent Công việc) Người dùng mọi dự án; người chỉ thuộc **nhà máy** không thấy dự án không thuộc mình; PM/Admin luôn đủ quyền | 6g.6.13 |
| C5 | "Thuộc dự án" = đơn vị chính/kiêm nhiệm là đơn vị gắn **hoặc cấp trên** của nó; **không** tính cấp dưới | 6g.6.13 |
| C6 | Main: lãnh đạo + trưởng (trừ GĐ nhà máy; ở đơn vị có trưởng chính thì chỉ trưởng chính) = Người dùng, còn lại Người xem | 6g.6.13, 6g.6.10 |
| C7 | Agent quan sát: chỉ PM + Admin sửa, còn lại Người xem | 6g.6.13 ③ |
| C8 | Pháp lý: việc không thuộc dự án (thư viện luật, khung thủ tục…) theo **loại ở Main** (chốt A) | 6g.6.13 ⑤ |
| C9 | Agent Công việc thay vai Base: **giữ mã `base` + đường `/api/mcp/base`**, giữ tên + khuôn trả lời của `1-agent-base`; chữ cho người đọc ghi "agent Công việc"; không sửa `1-agent-base` | 6g.6.11 ①③ · bộ nhớ `chuyen-vai-base-sang-cong-viec.md` |
| C10 | Mã WBS 🤖 chờ duyệt **KHÔNG** tính là đã gắn (cả cổng MCP) | bộ nhớ trên, chốt 03/10 chiều |
| C11 | `de_xuat_lien_quan` · `quy_trinh_dang_tac` → `KHONG_CO_DU_LIEU` (không có Base Request) | bộ nhớ trên |
| C12 | Luật 29 (gọi agent khác phải qua sổ) · khuôn sổ 2.0 · Agent quan sát chỉ đọc · luật 30 · tiếng Việt mọi chữ ra | CLAUDE.md · CHOT `HOP-DONG-KET-NOI` 7.1 |

## 2. Code đã commit — 27 commit ở 7 bộ code (+ 11 commit tài liệu ở `0 Tài liệu thiết kế`: c5f2453 · be82d7c · 8c84df0 · 23621ea · d3dfd31 · fd80546 · 76724b0 · 89acbc8 · 73b586a · 2a14a4e · 2ebeb7c)

Xem bằng `git -C <bộ> show <mã>`. Thư mục gốc: `D:\3 SETUP\1 AI\SCI Tiến độ\SCI-AI-AGENT\`.

**A. Sửa theo soát vòng 2 (chưa ai soát lại)**

| Bộ | Commit | Việc |
|---|---|---|
| `4-agent-main` | `a901653` | Main giao `nguoi_dung_bi_loc`; bí danh chỉ giao khi email mới là người Main đang hoạt động |
| `3-agent-phap-ly-code` | `9c47819` | Main báo bản ghi lỗi > 0 → không khoá ai; lọc bí danh lần nữa |
| `6-Agent-cong-viec/CodeSCICongViec` | `10d93f5` | Lịch sử tính từng đơn vị theo trưởng chính; khoá / rời đơn vị → bỏ chọn trưởng chính |

**B. Đợt 2 (6g.6.12)**

| Bộ | Commit | Việc |
|---|---|---|
| Main | `5dca8e8` | Bước A: `data/to-chuc.json`, trường tổ chức của người, `main.du_lieu_dung_chung` giao `to_chuc` + `tinh_trang` |
| Công việc | `5fd382b` | Bước B: `scripts/chuyen-len-main.mjs` (chạy thử / `--ghi`, từ chối đọc pgdata khi 3004 đang chạy) |
| Main `ac8c687` · Tiến độ `16195a7` · Hợp đồng `be47940` · Pháp lý `135045b` | | Bước C: bỏ bảng tài khoản mẫu ở trang đăng nhập |
| Hợp đồng | `213937f` | Bước D: hiện "email mới (tài khoản cũ email cũ)" cho chữ ký / lượt soát |
| Main `9fb88b8` · Công việc `7846147` | | Bước E: cột "Đơn vị" ở Quản lý dự án Main; agent Công việc chỉ hiện khi Main đã giữ |

**C. Quyền theo dự án + theo sơ đồ (6g.6.13)**

| Bộ | Commit | Việc |
|---|---|---|
| Main | `4502acf` · `ef111f0` | MỘT định nghĩa `src/lib/loai-theo-so-do.ts`; giao `role` (loại ở Main) + `loaiTheoDuAn` khoá **mã ngắn** |
| Công việc | `3986e7c` | Bộ chuyển chép vai trò + 3 trường đơn vị dự án |
| Tiến độ | `f747731` | `lib/loai-du-an.ts`, `route-auth.ts` (`x-sci-du-an` do middleware chép từ `?project=`), 4 route kiểm dự án trong thân |
| Hợp đồng | `bb7bb92` | Chép nguyên Tiến độ + 3 route |
| Pháp lý | `6b90078` · `f09760d` | `lib/permissions.ts`, `dong-bo-nguoi-thuan.ts` (`loaiTheoDuAnTaiCho`), action/API kiểm theo dự án; ⑤ chốt A |
| Quan sát | `74d3c44` | `route-auth.ts` `loaiOQuanSat` |

**D. Cổng `base` ở agent Công việc + đổi danh bạ (04/10)**

| Bộ | Commit | Việc |
|---|---|---|
| Công việc | `15eca31` | `src/app/api/mcp/base/route.ts` · `src/lib/mcp/cong-base.ts` (15 công cụ) · `cong-base-thuan.ts` · `cua-ma-tran.ts` (chép Base) · `ma-tran-cong.ts` (kéo `main.ma_tran_goi`) · `khoa-chung.ts` (khoá chung) · `GET /api/viec/danh-ba` · `POST /api/mcp/dong-bo-tu-main` · middleware chừa `api/viec/danh-ba` · test `cong-base.test.ts` |
| Công việc | `0f892fd` · `6238413` | Câu báo dự án 0 việc · hồ sơ nhiệm vụ `docs/HO-SO-NHIEM-VU-CHO-QUAN-SAT.md` |
| Main | `ec415fa` | `data/cai-dat-base.json` (chỉ 4 trường mục `base` — đưa vào git riêng phần này) · `danh-ba-agent.ts` · `day-sang-agent.ts` → `http://127.0.0.1:3004` |
| Tiến độ `c5e496d` · Hợp đồng `0c28bd2` · Pháp lý `185eb09` | | Địa chỉ dự phòng `base` → 3004 |

## 3. Việc KHÔNG phải code nhưng có tác động — phải soát

| # | Việc | Trạng thái phiên gửi nói |
|---|---|---|
| T1 | **Chạy thật bộ chuyển 04/10 00:10**: dừng 3004 → sao lưu `CodeSCICongViec/data/_truoc-6g6-dot2-20261004-0010-pgdata` → `--ghi` (Main tự sao lưu `4-agent-main/data/_truoc-6g6-dot2-20261004-0010`) → bật lại → kéo lại 6 agent | Main 52 người, PM `dainc` · Admin `quantri` · 15 Người dùng / 35 Người xem; `vinhht` mất quyền trưởng (SCI PMC có trưởng chính `annv`); Pháp lý 4 GĐ nhà máy "không dự án nào", 2 tài khoản mẫu bị khoá |
| T2 | Thêm `AUTH_SECRET_CHUNG=` vào `CodeSCICongViec/.env.local` (giá trị = `AUTH_SECRET` của Main; git chặn) | Không đưa vào git; không in khoá |
| T3 | Danh bạ Main **đang chạy** trỏ `base` → 3004 | Main đã gọi thật 3004; Quan sát · Hợp đồng · Pháp lý kéo danh bạ mới 01:01; **Tiến độ chưa** (kéo lười, chỉ khi cần gọi) |
| T4 | Lượt đo để lại vết trong sổ `CodeSCICongViec/data/nhat-ky-hoi-agent.jsonl` | ⚠ Có lượt em gửi bằng `agent_goi: "tiendo"/"main"/"hopdong"/"quansat"` (lý do "đo cổng base mới…") — sổ ghi như lượt thật; còn `do-kiem` · "do so viec tung du an…" |
| T5 | Ghi ngoài git: `6-Agent-cong-viec/HUONG-DAN-AI-TEST.md` mục 4.9 · `kế hoạch và báo cáo công việc.md` · bộ nhớ `memory/chuyen-vai-base-sang-cong-viec.md`, `quyen-theo-du-an-6g6-13.md` | — |
| T6 | Nhắn phiên "1 Agent quan sát" 2 tin (16:45 UTC báo `74d3c44`; 18:04 UTC báo cổng xong) | — |

## 4. Hướng đã BỎ — soát rác

| Hướng bỏ | Phải kiểm |
|---|---|
| Bản route-auth cũ chép nhầm sang Hợp đồng (script dùng chung) — đã thay bằng bản cuối của Tiến độ | `diff 5-Agent-tien-do/src/lib/route-auth.ts 2-agent-hop-dong/src/lib/route-auth.ts` chỉ khác chỗ cố ý |
| Phương án "≥ 1 dự án" cho việc không thuộc dự án ở Pháp lý (bỏ, chốt A) | `lib/permissions.ts` không còn nhánh đó cho thư viện luật / khung thủ tục |
| Đổi mã `base` → `congviec` (rút 03/10) | grep `congviec` ở 4 agent không còn mã máy mới thêm |

## 5. Điểm phiên gửi tự thấy đáng ngờ — ưu tiên soát

1. **Danh bạ Main bị ghi đè?** `base.thong_tin_nhan_su tat_ca=1` nay trả 52 người với `ma_base` = mã người agent Công việc (21/52 không phải email thật). Main (`4-agent-main/src/lib/chung/danh-ba.ts` ~dòng 241) kéo mỗi 24 giờ và dựng ánh xạ "username Base ↔ email" (`anhXaBase`) mà "Việc của tôi" ở Main/Tiến độ/Hợp đồng dùng để gọi **thẳng Base.vn**. Ghép hay thay? Nếu thay → "Việc của tôi" hỏi Base.vn bằng mã sai → rỗng. **Chưa đo.**
2. **`danh_sach_issue` không mã dự án → gom mọi dự án.** Main báo cáo sáng (`4-agent-main/src/lib/bao-cao-sang/dung.ts` ~dòng 487) có lúc gọi không mã: có đếm trùng thẻ khi Main cũng gọi từng dự án không?
3. **`nguoi_phu_trach` đổi nghĩa**: 84% việc do đơn vị chủ trì → mã như `p-dtpc`. Chỗ nào ở 4 agent hiện thẳng giá trị này ra màn (luật 30)? Phiên gửi biết một chỗ: Main Bảng điều hành ghép "đang ở {nguoiPhuTrach}".
4. **Mã việc Base.vn số** (`10017568`) Tiến độ còn gửi sang `trang_thai_cong_viec` (35 lượt/7 ngày) → cổng mới trả KCDL. Tiến độ có lưu mã cũ ở đâu không?
5. **Khoá chung ở hai nơi** (`4-agent-main/.env.local` và `CodeSCICongViec/.env.local`): đổi một nơi là `x-sci-noi-bo` / `sci_session` ở cổng base hỏng lặng lẽ. Có cách nào báo sớm không?
6. **Middleware 3004** chừa tiền tố `api/viec/danh-ba` (`src/middleware.ts`): còn đường nào lọt qua? Route tự kiểm cookie — kiểm cả ca cookie hết hạn, người bị khoá ở 3004 nhưng còn cookie chung.
7. **Kiểu xuống dòng**: Pháp lý `135045b` ghi lại cả `components/TestPanel.tsx` (git đếm 2.622 dòng, phần đổi thật 28 dòng — đo `git diff --ignore-cr-at-eol`); `6b90078` ghi lại 3 tệp `app/api/ai/trich-can-cu/route.ts` · `kiem-tra-van-ban-lien-quan/route.ts` · `app/api/upload/route.ts` (240/138/89 dòng → thật 6/8/5). Cùng loại vòng 2 #6.
8. **Quyền theo dự án ở Tiến độ/Hợp đồng**: route nào lấy dự án ở chỗ khác `?project=` / thân lời gọi mà chưa gọi `requireRole(cua, msg, duAnId)` → Người xem của dự án A ghi được vào A nhờ là Người dùng ở dự án B? Phiên gửi sửa 4 route Tiến độ + 3 route Hợp đồng theo grep, chưa soát hết 50 cửa.
9. **Pháp lý bước phụ** (tải tệp, 🤖 trích trường/căn cứ) cho "Người dùng ở Main **hoặc** ≥ 1 dự án" — có lối nào dùng bước phụ để ghi vào dự án mình chỉ là Người xem?
10. **Cổng `base` khi Main tắt**: chưa từng kéo được ma trận → cho qua kèm cảnh báo (giống Base). `ma-tran-cong.ts` gọi Main trong lượt phục vụ, chờ tối đa 3 giây — Main tắt thì mỗi lượt chậm 3 giây không?
11. **`traMotMa` bỏ tiền tố dự án** bằng biểu thức `^[A-Z0-9]{2,5}\.` chỉ khi không bắt đầu bằng số (`cong-base-thuan.ts`) — mã như `IAD1.3.1`, `10.2`, `HV.7.2.3` đúng; còn ca nào sai?
12. **Bài test 3004 `chuan-mau-bao-cao` hỏng** (44/78 tệp mẫu) — đã có trong danh sách hỏng cũ của vòng 2. Phiên gửi nói thư mục mẫu "File test tuần 40 - mẫu bản 8" bị bớt tệp — kiểm có đúng nguyên nhân không.
13. Lệnh sơ ý 04/10 ~00:39: `cp -r data/_truoc-6g6-dot2-…-pgdata /dev/null` (báo lỗi "cannot overwrite", phiên gửi tin là không tác động) — kiểm bản sao lưu còn nguyên.

## 6. Danh mục kiểm (ghi số)

1. `npx tsc --noEmit -p .` ở 6 bộ: `4-agent-main` · `5-Agent-tien-do` · `2-agent-hop-dong` · `3-agent-phap-ly-code` · `0-agent-quan-sat` · `6-Agent-cong-viec/CodeSCICongViec` (phiên gửi đo: 0 lỗi cả 6).
2. Test: Main / Tiến độ / Hợp đồng / Quan sát `npx vitest run` · Pháp lý `npm test` · Công việc `DOCFLOW_DB=memory npx vitest run --maxWorkers=2`. Hỏng cũ không tính: Main 3 bài `man-cua-main` · Tiến độ `trang-trong-app` · Hợp đồng `nhan-dien-agent` · Công việc `chuan-mau-bao-cao`. Phiên gửi đo Công việc: 911 đạt / 1 hỏng cũ / 12 bỏ qua.
3. Gọi cổng `POST http://127.0.0.1:3004/api/mcp/base` đủ 15 công cụ, so tên + trường với `1-agent-base/src/lib/mcp/cong-base.ts` (khuôn Base). Ca phải chặn: thiếu `ly_do_goi` · `do_sau: 3` · mã lạ không khoá · khoá sai · `quansat` gọi công cụ nghiệp vụ · agent khác đọc `base.hoi_thoai_gan_day` không khoá · gọi qua tên miền không phải localhost.
4. C10: chọn một việc có mã 🤖 chờ duyệt (đo bằng `base.trang_thai_cong_viec` → `ma_wbs_cho_duyet`, vd `CV-2026-0074`) → `co_viec_cho_ma_khong` mã đó phải ra `KHONG_TIM_THAY_MA`.
5. `GET http://127.0.0.1:3004/api/viec/danh-ba?limit=500`: không cookie → 401 câu Việt; `sci_session` hợp lệ → `{ok, nguoi[], tong}`; sửa một ký tự → 401. Cookie thử của PM có trong scratchpad của phiên gửi: `C:\Users\Admin\AppData\Local\Temp\claude\D--3-SETUP-1-AI-SCI-Ti-n---\65b6a6c5-fe81-4419-8b8b-510afd96fa3b\scratchpad\ck-dainc.txt` (chuỗi phiên trơn, gửi bằng `-H "cookie: sci_session=<nội dung>"`).
6. `POST /api/mcp/dong-bo-tu-main` ở 3004: không khoá → 401; có khoá → `{ok, vet:{tomTat}}`.
7. Danh bạ: `POST http://127.0.0.1:3010/api/mcp/main {"cong_cu":"main.danh_ba","agent_goi":"quansat","ly_do_goi":"kiểm độc lập lần 3"}` → `base` = 3004; bản kéo về ở `0-agent-quan-sat/data/cau-hinh-keo-ve.json` · `2-agent-hop-dong/data/cau-hinh-keo-ve.json` · `3-agent-phap-ly-code/storage/cau-hinh-keo-ve.json` · `5-Agent-tien-do/data/danh-ba-keo-ve.json`.
8. Quyền theo dự án (C4–C8) trên dữ liệu thật sau T1: chọn 1 nhân viên BQLDA QT, 1 nhân viên P.CĐ, 1 GĐ nhà máy, 1 lãnh đạo — đọc bảng `loaiTheoDuAn` Main giao (`main.du_lieu_dung_chung`) và so với luật C4/C5. Không cần đăng nhập bằng mật khẩu.
9. Luật trên phần đã sửa: tiếng Việt mọi chữ ra màn và lỗi · luật 10 (lib đụng `node:fs` tách tệp thuần — `cong-base-thuan.ts` có import gì phía máy chủ?) · luật 29 (`grep -rn "fetch(" src/lib/mcp` ở 3004: mọi lời gọi ra ngoài có `goiCoGhi`) · luật 30.

## 7. Khuôn kết quả

1. **Kết luận một dòng.**
2. Bảng chốt C1–C12: đạt / một phần / không · bằng chứng `file:dòng`.
3. Bảng phát hiện nặng → nhẹ: # · mức · mô tả lời thường · `file:dòng` · kịch bản lỗi (đầu vào → kết quả sai) · đề xuất (không tự sửa). Nặng = sai quyền / mất hoặc khoá nhầm dữ liệu / không đăng nhập được / agent khác nhận câu trả lời sai. Vừa = ca hiếm nhưng có thật. Nhẹ = chữ, dọn dẹp.
4. Trả lời từng điểm mục 5 (đúng nghi / không lỗi / chưa kiểm được).
5. Bảng số tsc + test từng bộ.
6. Đã kiểm xong · chưa kiểm được (vì sao) · cần Mr. Đại quyết.
