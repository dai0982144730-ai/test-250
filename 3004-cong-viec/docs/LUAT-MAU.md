# Bộ luật mẫu mặc định cho 9 mẫu báo cáo (Form 0–8)

Nguồn: `src/lib/luat/luat-mau.ts` (`LUAT_MAU`, 83 luật: 70 code, 13 AI — trước đây 71 luật: 51 code, 20 AI). Hệ thống gieo mỗi luật **một lần** vào bảng luật
(`src/lib/luat/hat-giong.ts`). Sau đó quản trị sửa, tắt, đổi mức hay xóa trên trang Luật kiểm tra. Luật đã xóa sẽ không gieo lại.

**Cách đọc bảng**
- **Cách**: `code` chạy ngay khi tải báo cáo lên, không tốn AI, chặn gửi được. `AI` là AI đọc hiểu, chạy nền, chỉ cảnh báo hoặc gợi ý.
- **Mức**: **CHẶN** thì không gửi được (chỉ dùng khi chắc chắn là lỗi). *Cảnh báo* vẫn gửi được nhưng hiện màu vàng. *Gợi ý* là nhắc nhẹ.
- Luật không lặp lại **9 luật hệ thống** đã có: đúng mẫu, kỳ báo cáo, người lập/người kiểm soát, nơi nhận, tên việc/người phụ trách,
  ngày đúng dạng và bắt đầu ≤ kết thúc, ngày trống, việc trùng sổ cái, mục trống hoặc còn "......". Ví dụ "Bảng Công việc: bắt đầu ≤ kết thúc"
  và "Người phụ trách phải có trong hệ thống" đã do luật hệ thống kiểm, nên bộ luật mẫu không thêm nữa.

| Mẫu | Tổng luật áp dụng | Code / AI | Chặn / Cảnh báo / Gợi ý | Luật riêng của mẫu |
|---|---|---|---|---|
| Form 0 — Hợp nhất trình TGĐ | 23 | 20 / 3 | 1 / 12 / 10 | 7 |
| Form 1 — P. Đầu tư & Pháp chế | 13 | 10 / 3 | 1 / 5 / 7 | 0 (dùng luật chung) |
| Form 2 — P. Kinh tế & Vận hành | 18 | 15 / 3 | 1 / 7 / 10 | 0 (dùng luật chung) |
| Form 3 — P. Hành chính Tổng hợp | 15 | 12 / 3 | 1 / 9 / 5 | 5 |
| Form 4 — P. Tài chính Kế toán | 15 | 11 / 4 | 1 / 7 / 7 | 5 |
| Form 5 — SCI PMC | 16 | 14 / 2 | 2 / 6 / 8 | 5 |
| Form 6 — SCI E&C (tháng) | 22 | 20 / 2 | 3 / 15 / 4 | 15 |
| Form 7 — BQLDA Quảng Trị | 22 | 18 / 4 | 3 / 12 / 7 | 12 |
| Form 8 — NM thủy điện Nậm Xe | 20 | 18 / 2 | 1 / 12 / 7 | 10 |

Trước khi có dạng tính toán (bản 71 luật), Code / AI theo mẫu là: F0 16/5 · F1 10/3 · F2 13/4 · F3 10/3 · F4 9/5 · F5 14/2 · F6 15/4 · F7 16/5 · F8 14/3.

## Luật đã chuyển AI → code (dạng `tinh_toan`, `dong_tong`)

Hai dạng luật mới trong `src/lib/luat/loai/tinh-toan.ts`:
- **`tinh_toan`** — ô / cột kết quả phải bằng (hoặc ≥, ≤…) phép tính giữa A và B (ô, cột hoặc số): hiệu, tổng (cộng thêm được nhiều cột),
  tích, thương, phần trăm A ÷ B × 100, hoặc chính A. Cột cùng bảng thì xét từng dòng. Cho lệch làm tròn theo số chữ số đã ghi ở ô kết quả
  (vd "98,4%" cho lệch 0,05; "51%" cho lệch 0,5), cộng sai số tuyệt đối hoặc % nếu đặt.
- **`dong_tong`** — dòng có nhãn "TỔNG…" (theo cột đầu hoặc cột nhãn chọn) phải bằng tổng các dòng còn lại ở các cột chọn;
  dòng nhóm (không có số) không tính, "—" ở dòng thành phần tính là 0.
- Ô trống, "—", "N/A" → bỏ qua (hoặc tính là 0 nếu chọn); "......" (chưa điền) → luôn bỏ qua, không bị báo oan.

Mọi luật mới đều đã chạy trên số liệu thật của 9 mẫu, 9 mẫu trắng và các báo cáo ví dụ theo mẫu (`mau-word/vi-du`): **không báo lỗi nào**, kể cả gợi ý.
Mức giữ như luật AI cũ (cảnh báo / gợi ý), **không có luật tính toán nào chặn** — nếu muốn chặn thì đổi mức trên trang Luật kiểm tra.

| Luật AI cũ (đã bỏ) | Luật code mới | Luật AI còn lại (phần cần hiểu nghĩa) |
|---|---|---|
| f0-ai-cong-no | f0-cong-no-con-lai (Còn lại = HĐ − Đã xuất, ±1) · f0-cong-no-dong-tong (dòng TỔNG, ±1) | — |
| chung-ai-an-toan-luy-ke | chung-an-toan-luy-ke-tu-tuan (Lũy kế năm ≥ Tuần này) · chung-an-toan-dong-tong ("1 sự kiện" đọc là 1) | — |
| f3-ai-bien-dong | f3-bien-dong (Biến động = Cuối − Đầu) · f3-tong-cong (dòng TỔNG CỘNG) | f3-ai-vuot-kh-nam (vượt KH năm phải nêu lý do) |
| f4-ai-chi-phi-hoan-thanh | f4-chi-phi-pt-ht (% HT = Lũy kế ÷ KH năm × 100, ±1) · f4-chi-phi-luy-ke-tu-thang (Lũy kế ≥ Tháng, "—" = 0) | — |
| f6-ai-lech-tien-do | f6-lech-tien-do (cột "% KH" = TH − KH, ±0,5, được ghi "Đạt") | — |
| f6-ai-thu-von | f6-pt-gia-tri-hd (% GT HĐ = Giải ngân ÷ TTS HĐ × 100, ±0,2) · f6-giai-ngan-khong-vuot-hd | — |
| f6-ai-nhan-luc | f6-nhan-luc-tong (Tổng = LĐPT + KS + QL, "—" = 0) · f6-nhan-luc-dong-tong | f6-ai-tnld-kien-nghi (có TNLĐ/vi phạm thì nêu ở kiến nghị) |
| f7-ai-lech | f7-lech (Lệch = TH − KH, ±0,1) | — |
| f7-ai-khoi-luong | f7-kl-pt-dat (% đạt = KL TH ÷ KL TK × 100, ±0,2) | f7-ai-kl-vuot-thiet-ke (vượt thiết kế phải giải thích) |
| f8-ai-pt-ke-hoach | f8-pt-kh-tuan · f8-pt-kh-thang (±0,2) · f8-nam-lk-tu-thang · f8-thang-lk-tu-tuan (gợi ý) | — |

Còn là luật AI vì không phải phép tính cùng dòng / cộng dòng: ngày ký, kiến nghị rõ việc, ảnh hưởng có định lượng, tình trạng KPI theo % KH,
tiền không âm theo nghĩa khoản mục (Form 4), **cân đối nguồn** (Form 4 — phép tính giữa các DÒNG theo nhãn, dạng `dong_tong` không diễn đạt được),
thiết kế trễ hạn, Thông tin chung khớp bảng tiến độ và tình trạng tổng thể (Form 7 — bảng Thông tin chung chưa gắn mã), sự cố cần kiến nghị.

**CSDL đã gieo bộ luật cũ:** luật mẫu gieo theo mã, mỗi mã một lần. Mã mới (bảng trên) sẽ được gieo thêm; các luật AI cũ
(`f0-ai-cong-no`…) vẫn còn trong CSDL đó — quản trị nên **tắt hoặc xóa** chúng để không bị báo hai lần.

---

## 1. Luật chung (nhiều mẫu)

| Mã | Luật | Cách | Mức | Áp dụng |
|---|---|---|---|---|
| chung-ngay-lap-tu-dau-ky | Ngày lập không được trước ngày đầu kỳ báo cáo | code | **CHẶN** | tất cả |
| chung-ngay-lap-khong-qua-tre | Ngày lập không muộn hơn cuối kỳ quá 10 ngày | code | Cảnh báo | tất cả |
| chung-ai-ngay-ky | Dòng "…, ngày … tháng … năm …" trên chữ ký đã điền, không trước ngày lập | AI | Gợi ý | tất cả |
| chung-viec-ket-qua-can-co | Mỗi việc trong bảng Công việc nên ghi Kết quả cần có | code | Gợi ý | 0,1,2,3,4,5,7,8 |
| chung-viec-ket-thuc-tu-ngay-lap | Hạn kết thúc của việc không nên trước ngày lập | code | Gợi ý | 0,1,2,3,4,5,7,8 |
| chung-ma-viec-dung-dang | Mã việc (nếu ghi) có dạng CV-2026-0412 | code | Cảnh báo | 0,1,2,3,4,5,7,8 |
| chung-ma-viec-khong-trung | Hai dòng không cùng mã việc | code | Cảnh báo | 0,1,2,3,4,5,7,8 |
| chung-kien-nghi-co-noi-dung | Mỗi vấn đề nổi bật phải có kiến nghị | code | Cảnh báo | 1,2,3,4 |
| chung-muc-do-phong | Mức độ chỉ ghi: Khẩn cấp, Cần xử lý ngay, Cần quyết định, Cần phê duyệt, Cần sớm XL, Cần theo dõi, Theo dõi, Thông tin | code | Gợi ý | 1,2,3,4 |
| chung-kien-nghi-nguon | Mỗi vấn đề ghi Nguồn (đơn vị báo lên) | code | Gợi ý | 1,2 |
| chung-ai-kien-nghi-ro-viec | Vấn đề "Cần quyết định/phê duyệt/Khẩn cấp": kiến nghị nói rõ đề nghị ai quyết việc gì | AI | Gợi ý | 1,2,3,4 |
| chung-rui-ro-cao-co-kien-nghi | Rủi ro mức **Cao** phải có kiến nghị | code | Cảnh báo | 5,6,7,8 |
| chung-rui-ro-khac-co-kien-nghi | Rủi ro mức khác cũng nên có kiến nghị | code | Gợi ý | 5,6,7,8 |
| chung-muc-do-don-vi | Mức độ rủi ro chỉ ghi Cao, Trung bình (TB), Thấp | code | Gợi ý | 5,6,7,8 |
| chung-canh-bao-tinh-trang | Mỗi hồ sơ/mốc pháp lý trong bảng Cảnh báo đầu tư ghi tình trạng hiện tại | code | Cảnh báo | 0,1 |
| chung-ai-anh-huong-dinh-luong | Cột "Ảnh hưởng nếu trễ" có định lượng (tiền, ngày, MW…) hoặc ghi rõ không có rủi ro | AI | Gợi ý | 0,1 |
| chung-an-toan-khong-am | Số sự cố tuần này là số từ 0 trở lên | code | Cảnh báo | 0,2 |
| chung-an-toan-co-hanh-dong | Chỉ tiêu an toàn nào có số tuần này > 0 thì phải ghi "Hành động ngay" | code | Cảnh báo | 0,2 |
| chung-an-toan-luy-ke-tu-tuan | Lũy kế năm không nhỏ hơn tuần này | code (tinh_toan) | Gợi ý | 0,2 |
| chung-an-toan-dong-tong | Dòng TỔNG bằng tổng các chỉ tiêu (Tuần này, Lũy kế năm) | code (dong_tong) | Gợi ý | 0,2 |
| chung-kpi-tinh-trang | Tình trạng KPI chỉ ghi Bình thường, Chú ý, Cảnh báo | code | Gợi ý | 0,2 |
| chung-kpi-kh-khong-am | KH tháng của KPI không âm | code | Cảnh báo | 0,2 |
| chung-ai-kpi-tinh-trang | KPI đạt dưới 92% KH thì không ghi "Bình thường" | AI | Gợi ý | 0,2 |
| chung-du-an-trang-thai | Mỗi dự án trong bảng Tổng quan ghi trạng thái | code | Cảnh báo | 5,6 |

## 2. Form 0 — Báo cáo hợp nhất trình TGĐ

| Mã | Luật | Cách | Mức |
|---|---|---|---|
| f0-han-qd-tu-ngay-lap | Hạn quyết định không được trước ngày lập báo cáo | code | Cảnh báo |
| f0-qd-co-phu-trach-trinh | Mỗi việc cần TGĐ quyết định phải có đơn vị phụ trách trình | code | Cảnh báo |
| f0-qd-co-tai-lieu | Mỗi việc cần quyết định nên ghi tài liệu đã chuẩn bị | code | Gợi ý |
| f0-qd-uu-tien-khong-trung | Hai việc không cùng số ưu tiên | code | Gợi ý |
| f0-cong-no-con-lai-khong-am | Giá trị còn lại (công nợ phải thu) không âm | code | Cảnh báo |
| f0-cong-no-con-lai | Còn lại = Giá trị HĐ − Đã xuất hóa đơn (±1) | code (tinh_toan) | Cảnh báo |
| f0-cong-no-dong-tong | Dòng TỔNG = tổng các dự án ở mọi cột số (±1; "—" = 0) | code (dong_tong) | Cảnh báo |

Cùng với các luật chung: ngày lập (2 luật), ngày ký, bảng Công việc (4 luật), cảnh báo đầu tư (2), an toàn (4), KPI (3).

## 3. Form 1 — P. Đầu tư & Pháp chế · Form 2 — P. Kinh tế & Vận hành

Hai mẫu này chỉ dùng luật chung:
- Form 1: ngày lập, ngày ký, bảng Công việc, kiến nghị (4 luật), cảnh báo đầu tư (2 luật).
- Form 2: ngày lập, ngày ký, bảng Công việc, kiến nghị (4 luật), an toàn (4 luật), KPI nhà máy (3 luật).

## 4. Form 3 — P. Hành chính Tổng hợp

| Mã | Luật | Cách | Mức |
|---|---|---|---|
| f3-nhan-su-cuoi-ky | Mỗi dòng bảng nhân sự ghi số cuối tuần | code | Cảnh báo |
| f3-nhan-su-khong-am | Số nhân sự cuối tuần là số từ 0 trở lên | code | Cảnh báo |
| f3-bien-dong | Biến động = Cuối tuần − Đầu tuần | code (tinh_toan) | Cảnh báo |
| f3-tong-cong | Dòng TỔNG CỘNG = tổng các công ty (KH năm, đầu, cuối, biến động) | code (dong_tong) | Cảnh báo |
| f3-ai-vuot-kh-nam | Cuối tuần vượt KH năm thì ghi chú nêu lý do | AI | Cảnh báo |

## 5. Form 4 — P. Tài chính Kế toán

| Mã | Luật | Cách | Mức |
|---|---|---|---|
| f4-ke-hoach-khong-am | Kế hoạch năm của các khoản mục (bảng Chi phí giá thành) không âm | code | Cảnh báo |
| f4-ai-tien-khong-am | Tiền mặt, tiền gửi, phải thu, dư nợ vay, chi phí, doanh thu không âm (chỉ CÂN ĐỐI, VLĐ, LỢI NHUẬN được âm) | AI | Cảnh báo |
| f4-ai-can-doi-nguon | Cân đối nguồn = Hiện có + Dự kiến thu − Dự kiến chi (từng đơn vị); tóm tắt khớp chi tiết | AI | Cảnh báo |
| f4-chi-phi-pt-ht | % hoàn thành = lũy kế ÷ kế hoạch năm × 100 (mẫu làm tròn 1% → ±1) | code (tinh_toan) | Gợi ý |
| f4-chi-phi-luy-ke-tu-thang | Lũy kế ≥ tháng ("—" = 0) | code (tinh_toan) | Gợi ý |

## 6. Form 5 — SCI PMC

| Mã | Luật | Cách | Mức |
|---|---|---|---|
| f5-pt-ht-0-100 | % hoàn thành hạng mục thiết kế từ 0 đến 100 | code | **CHẶN** |
| f5-tien-do-tk-co-ngay | Mỗi hạng mục thiết kế ghi ngày kế hoạch (chưa có thì "—") | code | Gợi ý |
| f5-tien-do-tk-co-dong | Bảng tiến độ thiết kế có ít nhất một hạng mục | code | Cảnh báo |
| f5-ai-thiet-ke-tre-han | Hạng mục chưa xong mà quá ngày kế hoạch thì ghi chú nêu lý do/biện pháp | AI | Gợi ý |
| f5-giai-doan-danh-muc | Giai đoạn chỉ ghi: Đề xuất, Khảo sát, TMB, FS, TKCS, TKKT, BVTC, Thi công, Vận hành | code | Gợi ý |

## 7. Form 6 — SCI E&C (báo cáo tháng)

| Mã | Luật | Cách | Mức |
|---|---|---|---|
| f6-ke-hoach-han-tu-ngay-lap | Hạn HT của việc tháng tới không trước ngày lập | code | Cảnh báo |
| f6-ke-hoach-ket-qua | Việc tháng tới nên ghi Kết quả cần có | code | Gợi ý |
| f6-kh-luy-ke-0-100 | KH lũy kế hạng mục thi công từ 0 đến 100% | code | **CHẶN** |
| f6-th-luy-ke-0-100 | TH lũy kế hạng mục thi công từ 0 đến 100% | code | **CHẶN** |
| f6-lech-tien-do | Cột "% KH" (NGHĨA THẬT: mức lệch) = TH − KH (±0,5), hoặc ghi "Đạt" | code (tinh_toan) | Cảnh báo |
| f6-thu-von-giai-ngan | Bảng thu vốn: mỗi dự án ghi GT giải ngân lũy kế ("—" nếu không có HĐ) | code | Cảnh báo |
| f6-thu-von-qua-han | Bảng thu vốn: mỗi dự án ghi phải thu quá hạn (0 nếu không có) | code | Cảnh báo |
| f6-thu-von-pt-toi-da | % GT HĐ không vượt 100% | code | Cảnh báo |
| f6-qua-han-co-ghi-chu | Có phải thu quá hạn > 0 thì ghi chú tình trạng đòi nợ | code | Cảnh báo |
| f6-pt-gia-tri-hd | % GT HĐ = giải ngân ÷ TTS HĐ × 100 (±0,2) | code (tinh_toan) | Cảnh báo |
| f6-giai-ngan-khong-vuot-hd | Giải ngân lũy kế không vượt TTS HĐ | code (tinh_toan) | Cảnh báo |
| f6-tnld-khong-am | Số TNLĐ tuần từ 0 trở lên | code | Cảnh báo |
| f6-nhan-luc-tong | Tổng = LĐPT + Kỹ sư + Quản lý ("—" = 0) | code (tinh_toan) | Cảnh báo |
| f6-nhan-luc-dong-tong | Dòng TỔNG = tổng các dự án (trừ cột giờ công AT) | code (dong_tong) | Cảnh báo |
| f6-ai-tnld-kien-nghi | Có TNLĐ/vi phạm thì nêu ở mục kiến nghị | AI | Cảnh báo |

Kịch bản thật: SCI E&C bản 1 để "......" ở thu vốn Nậm Khiên 1. Hai luật `f6-thu-von-*` sẽ **cảnh báo đúng dòng 2** mà không chặn.
P.ĐT&PC vẫn là nơi quyết định trả lại. Bản 2 thì hết cảnh báo. Các luật tính toán thu vốn bỏ qua ô "......" nên không báo thêm.

## 8. Form 7 — BQLDA Quảng Trị

| Mã | Luật | Cách | Mức |
|---|---|---|---|
| f7-kh-luy-ke-0-100 | KH lũy kế (bảng Tiến độ tổng thể) từ 0 đến 100% | code | **CHẶN** |
| f7-th-luy-ke-0-100 | % tiến độ thực hiện lũy kế từ 0 đến 100 | code | **CHẶN** |
| f7-lech | Lệch = TH lũy kế − KH lũy kế (±0,1) | code (tinh_toan) | Cảnh báo |
| f7-ai-thong-tin-chung-khop | "Tiến độ lũy kế (vs KH)" ở mục I khớp dòng TỔNG TIẾN ĐỘ DỰ ÁN | AI | Cảnh báo |
| f7-ai-tinh-trang-tong-the | Không ghi "đúng tiến độ" khi chậm hơn KH quá 2% | AI | Gợi ý |
| f7-kl-pt-dat-0-100 | % đạt khối lượng từ 0 đến 100 | code | Cảnh báo |
| f7-kl-pt-dat | % đạt = KL thực hiện ÷ KL thiết kế × 100 (±0,2) | code (tinh_toan) | Cảnh báo |
| f7-ai-kl-vuot-thiet-ke | Vượt khối lượng thiết kế phải giải thích | AI | Cảnh báo |
| f7-gpmb-co-tinh-trang | Mỗi khu vực GPMB ghi tình trạng | code | Cảnh báo |
| f7-gpmb-tinh-trang-danh-muc | Tình trạng GPMB chỉ ghi: Chưa triển khai, Đang kiểm đếm, Đang thương lượng, Chờ văn bản, Khiếu nại, Đã thỏa thuận, Đã chi trả, Đã bàn giao | code | Gợi ý |
| f7-gpmb-khieu-nai-vuong-mac | Khu vực đang Khiếu nại phải ghi vướng mắc | code | Cảnh báo |
| f7-rui-ro-cao-anh-huong | Rủi ro mức Cao phải ghi ảnh hưởng | code | Cảnh báo |

## 9. Form 8 — Nhà máy thủy điện Nậm Xe

| Mã | Luật | Cách | Mức |
|---|---|---|---|
| f8-gio-van-hanh-tuan | Giờ vận hành trong tuần ≤ 168 giờ | code | Cảnh báo |
| f8-gio-van-hanh-thang | Giờ vận hành lũy kế tháng ≤ 744 giờ | code | Cảnh báo |
| f8-san-luong-khong-am | Số T/H tuần (sản lượng, doanh thu, giờ) không âm | code | Cảnh báo |
| f8-pt-kh-tuan | % KH tuần = T/H ÷ KH × 100 (±0,2) | code (tinh_toan) | Cảnh báo |
| f8-pt-kh-thang | % KH tháng = Lũy kế ÷ KH tháng × 100 (±0,2) | code (tinh_toan) | Cảnh báo |
| f8-nam-lk-tu-thang | Lũy kế năm ≥ lũy kế tháng | code (tinh_toan) | Cảnh báo |
| f8-thang-lk-tu-tuan | Lũy kế tháng ≥ số tuần (tuần vắt hai tháng có thể khác) | code (tinh_toan) | Gợi ý |
| f8-su-co-bien-phap | Mỗi sự cố ghi trạng thái & biện pháp xử lý | code | Cảnh báo |
| f8-su-co-thiet-bi | Mỗi sự cố ghi rõ thiết bị | code | Cảnh báo |
| f8-ai-su-co-kien-nghi | Sự cố cần thay thiết bị/kinh phí phải có dòng kiến nghị tương ứng | AI | Gợi ý |

---

## 10. Bảng mới đã gắn mã (mẫu phiên bản 3)

Để luật code đọc được, các bảng số liệu dưới đây đã được **bọc mã**. Việc bọc giống hệt cách làm với bảng kiến nghị: nội dung, định dạng, gộp ô
và ảnh của mẫu gốc giữ nguyên. Đặc tả nằm ở `BANG_SO_LIEU` trong `scripts/chuyen-mau-that.mjs`. Hệ thống tự nâng các CSDL cũ lên mẫu mới
(phiên bản mẫu 2 → 3), trừ mẫu mà quản trị đã tự sửa.

| Mẫu | Tag bảng | Bảng (mục) | Ghi chú |
|---|---|---|---|
| 0, 2 | `bang_an_toan` | Cảnh báo an toàn, môi trường, cộng đồng, tuân thủ | |
| 0, 2 | `bang_kpi` | KPI điều hành / Doanh thu điện các nhà máy | có dòng nhóm (tên nhà máy) → cột `nhom` |
| 0 | `bang_cong_no` | Công nợ phải thu | 2 dòng tiêu đề (gộp ô) |
| 0, 1 | `bang_canh_bao` | Cảnh báo đầu tư – tư vấn – thi công – vận hành | có dòng nhóm ĐẦU TƯ / TƯ VẤN / THI CÔNG / VẬN HÀNH |
| 3 | `bang_nhan_su` | Tổng hợp nhân sự toàn công ty | |
| 4 | `bang_nguon_tien` | Báo cáo nguồn tiền (8 đơn vị) | |
| 4 | `bang_chi_phi` | Báo cáo chi phí giá thành | |
| 5, 6 | `bang_du_an` | Tổng quan các dự án | cột khác nhau giữa Form 5 và Form 6 |
| 5 | `bang_tien_do_tk` | Tiến độ chi tiết công tác thiết kế | |
| 6 | `bang_tien_do_tc` | Tiến độ thi công từng dự án (2 bảng cùng tag) | bảng Hướng Phùng 1 (chuẩn bị đầu tư) chưa gắn |
| 6 | `bang_nhan_luc` | Nhân lực & an toàn lao động | |
| 6 | `bang_thu_von` | Tiến độ thu vốn & hợp đồng | |
| 7 | `bang_tien_do` | Tiến độ tổng thể | |
| 7 | `bang_khoi_luong` | Chi tiết khối lượng thi công hạng mục | có thể chép thêm bảng cho hạng mục khác, cùng tag |
| 7 | `bang_gpmb` | GPMB & quan hệ địa phương | |
| 8 | `bang_san_luong` | Tổng hợp sản lượng & doanh thu | 2 dòng tiêu đề (Tuần / Tháng / Cả năm) |
| 8 | `bang_su_co` | Thiết bị & bảo trì — sự cố & bất thường | |

Bộ đọc Word có hai thay đổi:
- **Dòng nhóm** là dòng chỉ có chữ ở ô đầu, ví dụ "ĐẦU TƯ", "Hướng Linh 7". Bộ đọc không coi dòng này là dữ liệu mà ghi tên nhóm vào cột `nhom` của các dòng bên dưới.
- Chữ trong bảng số liệu vẫn tính là chữ của mục. Nhờ vậy việc dò "......" theo mục chạy như trước.

Chưa gắn mã: bảng Tóm tắt của Form 4 (hai nửa trái/phải khác nhau), bảng Thông tin chung dự án của Form 7 (dạng nhãn–giá trị),
bảng Hướng Phùng 1 của Form 6. Luật cần các bảng này hiện là luật AI.

## 11. Điểm trong mẫu thật khiến luật khó làm

1. **Ngày lập trước cuối kỳ là chuyện bình thường.** Mẫu Form 1–4 ghi tuần 29 (14/07–20/07) nhưng ngày lập 17/07. Vì vậy luật chặn
   chỉ yêu cầu ngày lập ≥ **đầu** kỳ, không yêu cầu ≥ cuối kỳ.
2. **Nhiều cột bị lệch nhãn.**
   - Bảng KPI (Form 0, 2): cột "Lũy kế tháng" lại chứa mức lệch (+0,3; −0,12). Cột "Sản lượng mất AGC (Tuần này)" chứa "97,8% KH". ĐVT của sản lượng điện ghi "tỷ đ".
   - Form 6: cột "% KH" thực chất là mức lệch TH − KH. Luật code `f6-lech-tien-do` đặt theo nghĩa thật (lệch = TH − KH).
   - Bảng KPI: "Lũy kế tháng" khớp Tuần này − KH tháng ở 8/10 dòng Form 0 và 6/8 dòng Form 2; hai dòng đầu mỗi mẫu **không khớp**
     (5,9 − 6,0 = −0,1 mà ghi +0,3). "% KH" trong cột mất AGC khớp Tuần này ÷ KH tháng ở 18/20 dòng. Vì nghĩa chưa chắc và số mẫu tự lệch,
     **chưa đặt luật tính toán** cho hai cột này — cần anh Đại xác nhận.
   **Nên sửa tiêu đề cột trong mẫu gốc.**
3. **Dấu "—" (gạch dài) dùng cho "không có".** `khoang_so`, `tinh_toan`, `dong_tong` đều đã bỏ qua "—" (hai dạng tính toán có thể
   coi "—" là 0 ở dòng thành phần / vế A, B).
4. **Đã có dạng luật tính toán** (`tinh_toan`, `dong_tong`) — 10 luật AI phép tính đã chuyển sang code (xem mục "Luật đã chuyển AI → code").
   Còn cân đối nguồn Form 4 (phép tính giữa các dòng theo nhãn) chưa có dạng diễn đạt được.
5. **Mẫu đang tự mâu thuẫn:**
   - Form 7 ghi "Đang thi công — **đúng tiến độ**" trong khi lệch −2,7%.
   - Ngưỡng tình trạng KPI không thống nhất: Form 0 ghi 97,9% là "Bình thường", Form 2 ghi 97,6% là "Chú ý".
6. **Hạn không có năm.** Form 6 ghi hạn "25/07". Luật hiểu năm theo kỳ báo cáo, nên báo cáo tháng 12 có việc hạn tháng 1 sẽ bị hiểu sai năm.
7. **Dòng ngày ký** ("Hà Nội, ngày … tháng … năm …") không gắn mã nên để AI kiểm. Báo cáo ví dụ SCI E&C tháng 7 có ngày ký 21/07 sớm hơn ngày lập 03/08, do chép từ mẫu.
8. **Dòng TỔNG nằm lẫn trong bảng** (an toàn, công nợ, nhân sự, nhân lực), và Form 0 ghi "1 sự kiện" ở cột số. Các luật code đã được chọn để
   dòng TỔNG không gây báo sai; `dong_tong` kiểm chính dòng đó (nhận nhãn theo cột đầu, "1 sự kiện" đọc là 1). Form 7 dòng
   "TỔNG TIẾN ĐỘ DỰ ÁN" là tiến độ bình quân có trọng số, KHÔNG phải tổng — không đặt `dong_tong`.

## 12. Cần bố và anh Đại duyệt

- [ ] 6 luật **CHẶN**: ngày lập trước đầu kỳ, và % tiến độ ngoài 0–100 (Form 5 % HT; Form 6 KH/TH lũy kế; Form 7 KH/TH lũy kế). Có luật nào nên hạ xuống cảnh báo không?
- [ ] Mức nào trong bảng rủi ro phải có kiến nghị: chỉ **Cao**, hay cả Trung bình? Có muốn luật Cao thành **chặn** không?
- [ ] Các danh mục:
  - mức độ cấp phòng (8 giá trị);
  - mức độ cấp đơn vị (Cao/Trung bình/TB/Thấp);
  - tình trạng KPI (Bình thường/Chú ý/Cảnh báo);
  - tình trạng GPMB (8 giá trị — phần lớn là đề xuất);
  - giai đoạn dự án Form 5 (9 giá trị).
- [ ] Các ngưỡng:
  - KPI dưới **92%** KH thì không được "Bình thường";
  - "đúng tiến độ" chỉ khi chậm không quá **2%**;
  - ngày lập muộn tối đa **10 ngày** sau cuối kỳ;
  - giờ vận hành **168 h/tuần**: nếu Nậm Xe cộng giờ của 2 tổ máy thì ngưỡng là 336.
- [ ] Form 0: "Phụ trách (trình)" là bắt buộc (cảnh báo) — đúng ý chưa?
- [ ] Có sửa tiêu đề cột bị lệch trong mẫu gốc (mục 11.2) không? Nếu sửa thì phải cập nhật cả `BANG_SO_LIEU` và luật tương ứng.
- [ ] 19 luật tính toán mới đang ở mức cảnh báo / gợi ý. Có luật nào nên **chặn** không (vd Lệch = TH − KH Form 7, Tổng nhân lực Form 6)?
  Sai số đang dùng: công nợ ±1, % HT chi phí ±1, lệch Form 6 ±0,5, lệch Form 7 ±0,1, % đạt / % KH ±0,2.
