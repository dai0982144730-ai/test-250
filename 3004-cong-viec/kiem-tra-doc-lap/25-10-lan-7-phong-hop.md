# Kiểm tra độc lập lần 7 — phiên «2 Agent Công việc» (3004): menu **Phòng họp**

> Lập 25/10/2026 tối · Người giao: Mr. Đại · Phiên viết code: «2 Agent Công việc» (Opus 5.5)
> Kết quả ghi vào `25-10-lan-7-phong-hop.KET-QUA.md` **cùng thư mục này**, rồi nhắn lại phiên «2 Agent Công việc» một tin ngắn.
> Sau khi kiểm xong, bản này sẽ được đóng gói gửi AI của anh Thịnh cài vào **bộ đang chạy trên mạng** — nên chỗ nào phụ thuộc máy này (đường dẫn, cổng, dữ liệu thử) cũng ghi ra.

## 1. Thước — các chốt của Mr. Đại (25/10/2026)

Đề xuất gốc: `SCI-AI-AGENT/6-Agent-cong-viec/DE-XUAT-PHONG-HOP-25-10.md` (anh chốt **A**). Chốt thêm giữa phiên — lấy đây làm thước, không lấy đề xuất khi hai bên khác nhau:

| # | Chốt |
|---|---|
| C1 | Không có lễ tân: **ai cũng đặt được** phòng còn trống; không ai (kể cả lãnh đạo) giành được phòng đã có người đặt |
| C2 | 3 phòng: P.01 · P.03 · P.09 trên ảnh mặt bằng thật (`public/phong-hop/mat-bang.webp`, 1295×1215) |
| C3 | Giờ làm việc **08:00–12:00 · 13:30–17:00**, ô 30 phút (15 ô/phòng). Bỏ 06–08, 12–13:30, 17–18. Một cuộc họp nằm gọn một buổi |
| C4 | Màu ô: xanh trống · vàng đã có người đặt · đỏ đang họp · xám đã qua · viền xanh dương = đang chọn |
| C5 | Báo họp **không cộng vào con số chuông** — dòng chữ chạy **bên phải chuông**; chuông vẫn đỏ nhấp nháy cho tin công việc như cũ; từ 2 cuộc trở lên thì **đỏ – trắng xen kẽ** từng cuộc |
| C6 | Dòng chữ nhấp nháy khi chưa bấm xem và 15 phút trước giờ họp; họp xong thì tắt |
| C7 | Giao ban (chốt A): Thứ Hai 15:00–17:00, ô Phòng mặc định P.09, thành phần Ban lãnh đạo + Trưởng các phòng; «Gửi thông báo» = **đặt luôn phòng buổi kế tiếp** rồi báo; gửi lại = cập nhật, không tạo buổi thứ hai. Chỉ BLĐ / trưởng phòng / quản trị gửi được |
| C8 | Đồ hoạ phòng: đang họp = người ngồi + khung đỏ nhấp nháy · sắp họp hôm nay = khung vàng nhấp nháy · không còn cuộc nào hôm nay = phủ xám + nút đăng ký |
| C9 | Tên ngắn = **2 chữ cuối** trên đầu người («Nguyễn Chính Đại» → «Chính Đại»). Chủ tịch: vòng đỏ nhấp nháy · Tổng giám đốc: vòng xanh lá · hai người này **không ghi tên**; rê chuột hiện đủ tên |
| C10 | Ghế chủ toạ = cấp cao nhất; không ai cao hơn → người tạo; **đồng cấp không phân được → để trống ghế chủ toạ**. Thừa người → vẽ đủ ghế, thiếu thì thôi |
| C11 | Danh sách mời **bỏ nhà máy đang vận hành + Ban điều hành tổng thầu** và người chỉ thuộc các đơn vị đó (phòng họp ở văn phòng) |
| C12 | Bố cục 3 cột: ảnh · dải lịch giữa · khung phải. Ảnh **không được kéo dãn**. Lịch giữa rộng **345 px** (đã +50% so với 230). Ảnh to thêm ~10% (chạm chiều cao thì dừng), khung phải hẹp lại đúng phần đó. Bỏ chú thích dưới ảnh, bỏ chữ «N ghế» |
| C13 | Lịch giữa cao cố định không thanh cuộn; ô chỉ ghi nội dung; rê chuột: tên cuộc họp + chủ trì + người dự; bấm: chi tiết bên phải. Bỏ nút «Lịch họp các phòng»; 2 nút còn lại bằng nhau, dài hết bề rộng ảnh |
| C14 | Bấm ô đỏ (đang họp) → xem chi tiết (không mở Sửa); người đặt có «Kết thúc sớm» |
| C15 | Ảnh mặt bằng: nền ngoài toà nhà **trắng** (không khoét trong suốt); WC + sảnh giữ gạch trắng kẻ ô; ô kem trước cửa WC lát gạch trắng; dãy tiểu nam → bàn 3 bồn rửa |
| C16 | Đồng hồ to, góc trên phải mặt bằng |

## 2. Commit cần kiểm

**3004** (`6-Agent-cong-viec/CodeSCICongViec`, nhánh master), theo thứ tự:

`a6ed6b5` menu Phòng họp · `ba299f3` khung chi tiết đóng khi trang cha bấm ra ngoài · `d5b2dd5` ô ngày nền sáng · `0659b4d` ảnh không kéo dãn · `245c4c2` bỏ nhà máy / BĐH khỏi danh sách mời · `74211bf` ba cột, 15 ô, luật bấm ô · `b496f30` đỏ – trắng xen kẽ · `c0db319` · `28b188f` lịch 345 · `2d7ba57` + `61d1342` ảnh mặt bằng · `4d62e95` ảnh +10%, nhãn «13:3014» · `99acf7b` dòng chữ co theo chỗ trống (sửa trang Sơ đồ tràn ngang 195px) · `1b77008` hướng dẫn + giải thích

**Chuông nhúng ở 5 bộ khác** (nghe tin `sci-chuong-rong` để nới khung nhúng): Tiến độ `954d1ad` `d7691e3` · Hợp đồng `df2887e` `f0bfc02` · Main `63d7958` `34a40d2` · Pháp lý (`3-agent-phap-ly-code`) `e5ab057` `2404b6c` · Nghiệm thu `ed2f111` `eed90a5`

## 3. Tệp chính

| Tệp | Vai |
|---|---|
| `db/89-phong-hop.sql` | 3 bảng `docflow.phong_hop_cuoc` · `phong_hop_moi` · `phong_hop_giao_ban` |
| `src/lib/phong-hop/thuan.ts` | Thuần (client dùng được): phòng/ghế, ô giờ, trạng thái, lỗi đặt, trùng, xếp ghế, cấp bậc, tên ngắn |
| `src/lib/phong-hop/dich-vu.ts` | Máy chủ: đọc, đặt (khoá `pg_advisory_xact_lock`), sửa, huỷ, kết thúc sớm, mời, giao ban, gửi chuông |
| `src/app/api/phong-hop/{route,[id]/route,giao-ban/route,cua-toi/route}.ts` | 4 cửa API |
| `src/app/phong-hop/page.tsx` · `src/components/phong-hop/{PhongHop,DongHop}.tsx` · `phong-hop.css` | Màn + dòng chữ thanh trên |
| `src/components/phong/KhungPhong.tsx` | Mục menu + đặt `<DongHop>` bên phải chuông |
| `src/lib/huong-dan/tab/phong-hop.ts` · `src/lib/giai-thich/noi-dung.ts` (mục `ph-*`, `dong-hop`) | Hướng dẫn tab + giải thích |
| `tests/unit/phong-hop-25-10.test.ts` | 13 bài (đồng hồ giả 26/10 08:10 giờ VN) |

## 4. Tác động ngoài code

- Thêm 3 bảng (tệp `db/89`). Loại thông báo mới `phong_hop` → rơi về kênh `khac` của chuông.
- Gửi chuông thật cho người được mời khi đặt / sửa giờ / đổi phòng / huỷ / kết thúc sớm / gửi giao ban.
- 5 agent khác: khung nhúng chuông nở thêm tối đa 400px khi trang nhúng báo.

## 5. Hướng đã bỏ (đừng báo là thiếu)

- Nền ngoài trong suốt (anh bác) · sàn WC nhuộm màu kem (anh bác) · chữ đỏ thay con số chuông (anh đổi: tách hẳn) · dòng chữ bên trái chuông · khoá cứng dòng chữ 260px (làm tràn trang Sơ đồ) · nút «Lịch họp các phòng» · khung giờ 06–18 · «PTGĐ phụ trách» để phân chủ toạ (không có dữ liệu — Cài đặt đã bỏ từ 28/09, nên đồng cấp → để trống).

## 6. Điểm em tự nghi ngờ — soát kỹ

| # | Nghi | Gợi ý cách đo |
|---|---|---|
| N1 | Đua đặt trùng: khoá theo `phong:ngay` trong giao dịch; **sửa** cuộc họp sang phòng khác — có khoá đúng phòng ĐÍCH không? | Đọc `suaHop` + hàm khoá dòng 200 |
| N2 | `guiGiaoBan` khi giờ đó P.09 đã có cuộc họp thường của người khác → phải từ chối kèm tên người đặt (C1), không đè | Đọc + bài kiểm |
| N3 | Giờ VN (+7): «Giờ họp đã qua», «hôm nay», nhấp nháy 15 phút — có chỗ nào dùng `new Date()` trơn theo UTC? (luật 44) | `grep -n "new Date\|Date.now" src/lib/phong-hop src/components/phong-hop` |
| N4 | `POST /api/phong-hop/cua-toi` (đánh dấu đã xem): có cho đánh dấu cuộc mình **không** được mời? | Đọc `daXemHop` |
| N5 | Quyền: Người xem (bốn loại người dùng) có đặt được không? Anh chốt «ai cũng đặt» — ghi rõ em đang cho cả Người xem đặt hay không, để anh quyết | Đọc route POST |
| N6 | `DongHop`: hiệu ứng đo tràn chạy mỗi lần vẽ, tạo lại `ResizeObserver` mỗi 20 giây — có vòng vẽ lại vô tận không? | Đọc + mở trang 1 phút xem bảng điều khiển |
| N7 | Khung nhúng 5 agent: rộng `RONG_DONG + rong`; nay ô chữ co 60–260px — trong khung nhúng có bị tràn / cắt? | Mở Main/Tiến độ có cuộc họp, đo |
| N8 | Ảnh +10%: `--ph-rong-anh` = min(cao × tỉ lệ, gốc × 1,1); khung phải = 2×gốc − ảnh. Màn rất cao + hẹp → khung phải có âm / quá hẹp? Màn ≤ 900px chuyển 1 cột | Thử 1024×1366, 1280×720, 1920×1080 |
| N9 | `bungMoi` «Cả phòng X» lấy người lúc đặt; người đổi phòng sau không tự cập nhật (đã ghi trong Hay vướng) | — |
| N10 | Bộ kiểm toàn bộ: 2 bài trượt ở `hoi-trung-hoi-cv` — em cho là lỗi thời từ trước (phiên khác thêm agent Nghiệm thu), không do Phòng họp. Xác nhận | `npx vitest run` |
| N11 | Chữ tới người dùng toàn tiếng Việt (thông báo lỗi 400/403/409, chuông, tooltip); khoảng giờ kèm số giờ (luật 31: «2 giờ · 15:00 – 17:00») | grep chuỗi tiếng Anh trong 4 route + dich-vu |
| N12 | Thứ phụ thuộc máy này khi đem sang bộ chạy trên mạng: đường dẫn ảnh `?v=3`, tệp `db/89` có chạy tự động khi khởi động không, mã đơn vị nhà máy / BĐH nhận theo **tên** (`laDonViNgoaiVP`: NM / Nhà máy / BĐH / Ban điều hành) | Đọc `thuan.ts` + nơi chạy migration |

## 7. Luật an toàn khi thử

- **Không mở `data/pgdata`** khi 3004 đang chạy (hỏng WAL) — đo qua API hoặc bản sao.
- **Không gọi AI thật** (màn này không dùng AI).
- **Không `next build`** khi máy đang chạy; dựng lại theo `scripts/chay-ung-dung.ps1` (phiên viết code làm, phiên kiểm không cần).
- Ký phiên thử: `node "C:/Users/Admin/AppData/Local/Temp/claude/D--3-SETUP-1-AI-SCI-Ti-n---/65b6a6c5-fe81-4419-8b8b-510afd96fa3b/scratchpad/ky-cv2.mjs" .env.local <email>` (chạy trong thư mục repo 3004; in ra mã phiên ở dòng cuối) → cookie `sci_congviec_session`. Tài khoản: `ptgd.dai@scigroup.vn` (BLĐ) · `nv.dtpc@scigroup.vn` (Lê Thị Thanh Hằng, đầu P.ĐT&PC) · `test.quantri@scigroup.vn`.
- Đặt cuộc thử thì đặt nội dung có chữ «test», giờ ngoài giờ có cuộc thật, **huỷ trước khi xong việc** (huỷ sẽ gửi chuông cho người dự — dùng ít người dự).
- Đang có sẵn 3 cuộc «test» ngày 25/10 (đã qua) + 1 buổi giao ban 26/10 15:00 P.09 — đừng xoá buổi giao ban.

## 8. Danh mục kiểm

1. Đối chiếu C1–C16 với màn thật (`http://localhost:3004/phong-hop`) và mã.
2. Soát N1–N12.
3. Luật chung CLAUDE.md: 28 (chữ thuần không viền), 30 (mã kèm tên), 31 (khoảng giờ kèm số), 34 (hàng tổng — không áp), 43 (đổi tên → soát hướng dẫn), 44 (giờ VN).
4. Bộ kiểm: `npx vitest run tests/unit/phong-hop-25-10.test.ts` + toàn bộ; `npx tsc --noEmit`.
5. 5 agent có chuông nhúng: dòng chữ hiện, không tràn thanh trên, khung chi tiết mở / đóng đúng.

## 9. Khuôn kết quả

```
# Kết quả lần 7 — Phòng họp
Kết luận: ĐẠT / ĐẠT CÓ ĐIỀU KIỆN / KHÔNG ĐẠT · 🔴 n · 🟡 n · ⚪ n
| # | Mức | Chỗ (tệp:dòng) | Thấy gì (kèm số đo / lệnh đã chạy) | Đề xuất |
Mục «Cần Mr. Đại quyết» tách riêng, mỗi câu đủ 5 phần (vấn đề · gợi ý · vì sao · nhược điểm · phương án không chọn).
```
