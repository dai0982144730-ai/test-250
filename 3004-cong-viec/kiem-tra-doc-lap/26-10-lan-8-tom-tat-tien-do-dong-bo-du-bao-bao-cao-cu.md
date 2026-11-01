# Kiểm độc lập lần 8 — phiên «2 Agent Công việc» (25/10 19:11 → 26/10 20:08)

> Tính từ sau `59a1c8c` (soát lại lần 7). Ghi kết quả vào **`26-10-lan-8-tom-tat-tien-do-dong-bo-du-bao-bao-cao-cu.KET-QUA.md`** cùng thư mục, rồi nhắn lại phiên «2 Agent Công việc».

## 0. Luật an toàn khi kiểm

| Luật | Vì sao |
|---|---|
| **KHÔNG tắt / dựng lại 3004** (`next build`, `next start`). Cần thử giao diện thì dùng bản đang chạy `localhost:3004` | Mỗi lần tắt ~4 phút, Main + Telegram báo «agent Công việc đang tắt», ngắt mạch 10 phút (anh đang test Telegram) |
| Không mở `data/pgdata` khi 3004 chạy · không gọi AI thật · không POST ghi dữ liệu thật trừ khi tự dọn | Luật cũ |
| Cổng MCP 3003 gọi bằng tệp UTF‑8 (`--data-binary @tệp`), `agent_goi` = `base` hoặc mã lạ có chữ «kiem», `ly_do_goi` ghi «kiểm độc lập lần 8» | Sổ nhật ký ghi như lượt thật |
| Agent Tiến độ (3003) chạy `next dev` — sửa code bên đó tự nạp; KHÔNG `next build` ở 3003 | Cấm build khi dev đang chạy |
| Tệp `data/tom-tat-tien-do/BT.json` là bản nạp THẬT của Ba Tầng 1 (ngày giả định, anh dùng) — đừng xoá | |

## 1. Thước — chốt của Mr. Đại (nguyên văn rút gọn)

| # | Chốt | Ngày |
|---|---|---|
| T1 | Tóm tắt tiến độ nạp tay: cấp 1–2 cam, cấp 3 xám như cấp 4; thanh nhóm dày bằng việc lá + ký tự tam giác | 26/10 |
| T2 | Duyệt `6-Agent-cong-viec/DE-XUAT-TOM-TAT-TIEN-DO-DONG-BO-26-10.md` ý a·b·c: (a) công cụ mới `tiendo.bang_gantt` ở 3003 · (b) bật đồng bộ khi dự án có **Baseline đã duyệt**, có mục tiêu thì vẽ thêm · (c) cột «KL TH / KL TK = %», dòng nhóm chỉ % | 26/10 |
| T3 | Đồng bộ thì vẽ như Gantt 3003 ở nút «C3»; 3004 cấp 1 = tên dự án, 3003 cấp 1 = giai đoạn; vạch Hôm nay vàng, COD mục tiêu cam, COD Baseline xanh lá, COD dự báo trắng; WBS găng đỏ; rê chuột như Tiến độ; **khoá nạp tay** | 26/10 |
| T4 | Ba Tầng 1 chưa có Baseline → làm xlsx nạp tay | 26/10 |
| T5 | Mũi tên hai đầu thanh nhóm → tam giác (như bảng nạp tay), sửa cả 3003 | 26/10 |
| T6 | «đồng ý vẽ vạch xám, làm cả ở tiến độ lẫn công việc»: báo cáo cuối cũ → nét XÁM từ ngày báo cáo tới hôm nay; dự báo tính phần còn lại TỪ HÔM NAY (ngày không báo cáo = không làm) | 26/10 |
| T7 | Mẫu số năng suất 7 ngày (÷ số ngày CÓ báo cáo) — «tạm thời cứ để nguyên» | 26/10 |
| T8 | Phòng họp: ảnh — phòng vệ sinh thành phòng trống như phòng đồng hồ · Phó chủ tịch HĐQT (Văn Phúc) vòng xanh dương như Công Hùng / Ngọc, không ghi tên | 26/10 |
| T9 | Main: câu báo khi agent không thưa nói rõ «đang tắt / đang khởi động lại» | 26/10 |
| T10 | Sơ đồ tổ chức: bung «Các nhà máy» thì đáy Hướng Linh 8 vừa khung, không thanh cuộn; khối không xa nhau quá | 25–26/10 |

## 2. Commit cần kiểm

| Repo | Commit | Nội dung |
|---|---|---|
| 3004 `6-Agent-cong-viec/CodeSCICongViec` | `a274eed` `e03fbbf` | Phòng họp sửa theo lần 7 (đường dẫn http(s), hướng dẫn) |
| | `99232b3` · `6bb1b5e` · `8014564` | Chuông nhúng một hàng · cột ảnh nền sáng + nét phân cách · vòng đo tràn dòng chữ họp (chớp) |
| | `7c88006` | T1 màu cấp + thanh nhóm |
| | `3e3bc76` · `8119d09` | T8 ảnh mặt bằng · vòng xanh dương (⚠ commit này cuốn theo 2 dòng của phiên khác trong `giai-thich/noi-dung.ts`: «Sơ đồ tổ chức» → «Sơ đồ») |
| | `32285f6` · `c155902` · `5bfd152` · `db19cef` | T2–T6 đồng bộ Tiến độ · thanh nhóm tam giác · nét xám · giờ lấy số (luật 39) |
| | `d866f6e` | T10 Sơ đồ tổ chức (gộp phần phiên «Sơ đồ» 25/10 chưa commit + phần vừa khung của phiên này) |
| 3003 `5-Agent-tien-do` | `1c403b9` · `c376b2e` | `tiendo.bang_gantt` + nhớ cả bảng |
| | `345efa4` · `946a773` | T5 tam giác · T6 dự báo từ hôm nay + nét xám + `cho_bao_cao` |
| Main `4-agent-main` | `d8e984e` · `ff29012` · `f712e97` | T9 câu báo + bài kiểm |
| Chuông nhúng 4 agent | Main `5824061` · TĐ `a5adacf` · (HĐ `5dacce3` · NT `1a79471` · PL `0690748` cùng lô 25/10 19:01) | Dòng chữ họp chỉ lấy khoảng trống thật — thuộc lô sửa lần 7, kiểm lại nhanh |

Gói gửi anh Thịnh (không phải code chạy, chỉ soát áp sạch): `6-Agent-cong-viec/GOI-TOM-TAT-TIEN-DO-13-10/{5-ban-va-26-10,6-dong-bo-agent-tien-do-26-10}` · `GOI-PHONG-HOP-25-10/6-ban-va-26-10`.

## 3. Đo của phiên làm (để đối chiếu)

| Đo | Số |
|---|---|
| `bang_gantt` | HV 183 dòng (Baseline v2) · TT 275 (mục tiêu chép y Baseline 723/723) · N3A 37 (không mục tiêu) · BT «chưa có bảng tiến độ» |
| 3004 mở bảng | 12–16 ms (nhớ) · danh sách 42 ms · lượt lạnh TT từng 7,7 s trước khi thêm nhớ |
| HV sau T6 | 7.2.1.3 dự báo xong 14/11 → 28/11/2026 · COD dự báo 28/10/2027 → 11/11/2027 · đoạn xám 12/10–25/10 |
| Bài kiểm | 3004: tsc 0 · `tom-tat-tien-do*` 20/20 · phong-hop 14/14 · sơ đồ 97/97 · 3003: 1.606/1.610 (4 đỏ của phiên khác: vai «Nhà thầu», công cụ BOQ mới) · Main ngắt mạch 22/22 |

## 4. Điểm tự nghi ngờ — soát kỹ

| # | Nghi |
|---|---|
| N1 | T6 đổi bộ tính dự báo dùng CHUNG (`lib/du-bao/lich.ts` `homNay`): COD dự báo, cảnh báo, báo cáo sáng / tháng, giả định COD (`gia-dinh.ts` `sauCat`), ảnh hưởng hạng mục (`anh-huong-cod.ts` qua `...v`) — có chỗ nào gọi `lapLichDuBao` / tính ngày còn lại mà KHÔNG truyền `homNay` nên lệch số giữa hai màn? (`grep lapLichDuBao\|docDauVaoDuBao\|sauCat`) |
| N2 | `soNgayCho` (lich.ts) đếm ngày làm việc `ngaySauCat..homNay−1` theo lịch — đúng với việc lịch liên tục (`calendarMode=continuous`) và việc có ngày nghỉ? Việc «đang làm» KHÔNG có ngày bắt đầu thật (`notEarlierThan: sauCat`) giờ bắt đầu hôm nay — đúng ý T6? |
| N3 | Bộ nhớ: `getComputed` nhớ theo `chuKyDuLieu` (có NGÀY) — sang ngày mới tự tính lại? `NHO_BANG_GANTT` (cong-tiendo) cùng khoá — có trả bảng cũ sai «hôm nay»? |
| N4 | 3004 `layBangGanttNhanh`: luôn trả bản cũ trước, làm mới ngầm; bản cũ không bao giờ hết hạn khi 3003 tắt lâu → `db19cef` chỉ ghi giờ khi cũ >5 phút. Đủ chưa (luật 39)? |
| N5 | Danh sách `GET /api/phong/tom-tat-tien-do` lần đầu sau khởi động phải CHỜ 3003 (đo 1,5 s; lạnh có thể ~13 s) — màn Dự án chờ theo? |
| N6 | `banTuBangGantt`: dòng «0» tên dự án — `wbsCoCon`, nút C2/C3, cột WBS hiện `ma` rỗng, hộp rê chuột dòng dự án, xuất «Tải file» (bỏ dòng 0, đổi `wbs` = `ma`) — đúng? |
| N7 | Màu / bố cục so với `MiniGantt.tsx` 3003: làn cam trên, xanh dưới, nét trắng trùng tim, độ mờ dòng nhóm, mốc hình thoi, thanh nhóm dùng `thanh_nhom ?? ke_hoach` — lệch chỗ nào? |
| N8 | Hộp rê chuột 3004 so với 3003 (`MiniGantt.tsx` ~2780–2890): thứ tự dòng, hai câu nhanh/chậm ghi rõ hệ (luật 35/36), khoảng ngày kèm số ngày (luật 31) |
| N9 | Quyền: route Tóm tắt đọc bảng Tiến độ cho mọi người có `so_cai.xem` — có cần lọc theo quyền dự án như agent Tiến độ (Người xem / agent mật)? `bang_gantt` không trả tiền (việc theo tiền BOQ chỉ có %) — kiểm lại |
| N10 | `POST` nạp tay bị chặn 409 khi có Baseline — nếu 3003 đang tắt thì chặn không được (nạp tay lọt) — chấp nhận được? |
| N11 | `d866f6e` commit code phiên khác (Sơ đồ) — đọc lại diff `SoDoPhong.tsx` / `bo-cuc.ts`: vòng đo `useLayoutEffect` (setCotX trong effect) có tự gây vòng vẽ lại không (đo MutationObserver 3 giây như lần 7) |
| N12 | Ảnh `mat-bang.webp`: vị trí % các phòng (`thuan.ts` `PHONG_HOP.khung`) vẫn khớp; phòng mới vẽ không lẫn vào ô bấm phòng họp |
| N13 | Vòng xanh dương tô bằng thuộc tính `stroke` (không qua CSS vì `phong-hop.css` phiên khác đang sửa dở) — có bị CSS `.vong` đè? |
| N14 | Câu báo Main mới: còn chỗ nào ở Main / agent khác so khớp chữ cũ «Đã bật chưa» / «Thử lại sau» (luật 37: câu cho máy đọc phải khớp mẫu bên nhận)? |

## 5. Khuôn kết quả

Bảng 🔴 / 🟡 / ⚪ — mỗi điểm: `tệp:dòng` · đo bằng lệnh gì · số ra · đề xuất. Cuối tệp: kết luận ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT.
