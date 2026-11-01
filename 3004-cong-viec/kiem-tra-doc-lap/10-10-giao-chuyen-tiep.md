# Kiểm tra độc lập — Giao chuyển tiếp theo quyền người nhận (3004)

> Phiên sửa: "SCI-AI-Agent project context recovery [244122]". Kết quả ghi `10-10-giao-chuyen-tiep.KET-QUA.md` cùng thư mục rồi **nhắn lại phiên sửa** — phiên sửa soát từng điểm rồi code sửa.
> Chỉ ĐỌC + ĐO. Không sửa code. 3004 chạy `next start` (đã dựng lại sau commit). **Không mở `data/pgdata` khi app đang chạy** — đo dữ liệu thật trên BẢN SAO (chép thư mục ra chỗ khác rồi mở PGlite). Bài kiểm không gọi AI thật.

## 1. Thước — Mr. Đại chốt 09/10/2026 (nguyên văn)

> "Code giao việc chuyển tiếp tức giao cụ thể cá nhân phải theo quyền của người đó trong mọi tình huống kiêm nhiệm. trưởng phòng/bộ phận/đơn vị thì giao đc cho nhân viên cấp dưới họ và giao xuống nhân sự đơn vị con của họ nhưng thuộc SCI. lãnh đạo giao đc cho mọi nhân viên lẫn trưởng phòng lẫn nhân sự của các đơn vị con của SCI. Không ai giao suống nhân sự của công ty có enc cổ phần là ENC và PMC là công ty ENC có cổ phân chứ kh phải đơn vị trực thuộc. đơn vị trực thuộc chỉ có các BQL, các nhà máy"

Gốc vụ việc: CV-2026-0151 "[Nậm săm 3A] Xử lý 3.3 — Bê tông RCC san phẳng đập." giao cho đơn vị chức danh `bld-ptgd-dai` (1 người). Ô "Giao cho nhân viên…" chỉ hiện chính anh Đại, dù anh là Lãnh đạo (cong_viec.giao = toàn bộ) và trưởng chính P.ĐT&PC (kiêm nhiệm `p-dtpc`).

Anh trả lời câu hỏi trước khi code: ô chọn **theo phạm vi giao việc**; sau khi giao xuống thì **chuyển chủ trì cho người mới, người giao vẫn theo dõi**; chỉ tick thêm "#2 việc giao đích danh cũng giao tiếp được". KHÔNG tick: #3 riêng, #4 đổi lại người đã giao xuống, #5 hiện ở nút "Việc tôi giao".

## 2. Commit cần soát

| Bộ | Commit | Nội dung |
|---|---|---|
| 3004 `6-Agent-cong-viec/CodeSCICongViec` | `66d674f` | Toàn bộ thay đổi (11 tệp) |

Tệp: `src/lib/so-cai/dich-vu.ts` (`coThePhanCong`, `cumNgoaiSci`, `nguoiNhanChuyenTiep`, `phanCong`) · `src/lib/so-cai/doc-them.ts` · `src/lib/khoi-tao.ts` (gieo `ngoai_sci`) · `db/85-don-vi-ngoai-sci.sql` · `src/app/api/cong-viec/nhan-chuyen-tiep/route.ts` (mới) · `src/components/phong/SoDoPhong.tsx` (ô chọn optgroup, tải một lần) · gỡ prop `nhanVienCua` ở `BaoCaoTuanPhong.tsx` `DuAnPhong.tsx` `TheViecNhung.tsx` · `src/lib/giai-thich/noi-dung.ts` · `tests/unit/giao-nhan-vien.test.ts`.
Ngoài git: `6-Agent-cong-viec/HUONG-DAN-AI-TEST.md` thêm dòng 4.5.8.

## 3. Luật đã code

| Vế | Code |
|---|---|
| Ai có ô "Giao cho…" | phần việc `dang_lam` + (đích danh mình HOẶC đơn vị trong `nd.don_vi_ids`) + danh sách người nhận không rỗng |
| Danh sách người nhận | đơn vị trong `phamViGiao(nd)` (dùng `coQuyen` — đã tính trưởng chính / kiêm nhiệm) TRỪ cụm ngoài SCI (đơn vị `ngoai_sci` + mọi đơn vị con) TRỪ ô `ban_tgd` + `chuc_danh` cấp 1; người có đơn vị chính HOẶC kiêm nhiệm trong tập đó; bỏ chính mình |
| Ngoại lệ | người thuộc chính cụm ngoài SCI (vd GĐ SCI E&C) vẫn giao trong cụm của mình |
| `ngoai_sci` | NULL = chưa khai; gieo điền `sci-pmc`, `sci-enc`, mọi đơn vị `mau_ma = form-10` (ban điều hành tổng thầu) = true, còn lại false; chỉ điền ô NULL |
| Giao xong | `phan_viec` → `nguoi`, ghi lịch sử `phan_cong` (người giao vẫn nhận tin xong / gia hạn qua `nguoiDaPhanCong`), chuông cho người nhận |

Số đo phía sửa (dữ liệu thật, tài khoản anh Đại): 32 người / 11 nhóm; loại 13 người PMC/E&C + 6 lãnh đạo chức danh.

## 4. Điểm tự nghi ngờ — soi kỹ

1. **Ban điều hành tổng thầu (8 đơn vị `bdh-*`)** tôi tự xếp "ngoài SCI" vì anh nói trực thuộc chỉ BQL + nhà máy. Có hợp lời anh không — hay BĐH dưới BQLDA phải tính trực thuộc?
2. **Bỏ ô Ban TGĐ / chức danh cấp 1**: anh không nói cấm giao ngang/ngược lên, tôi tự thêm. Lãnh đạo kiêm trưởng phòng vẫn hiện qua phòng đó — đúng chưa? `bld-troly-ct` (chức danh cấp 2) vẫn được chọn.
3. **"Theo quyền trong mọi tình huống kiêm nhiệm"**: `phamViGiao` dựa `coQuyen` — với người KHÔNG có trưởng chính mà mang vai Trưởng, quyền trưởng áp trên MỌI đơn vị của họ (kể cả đơn vị chỉ là nhân viên kiêm nhiệm). Có tình huống nào trong 37 tài khoản thật cho kết quả sai không? Liệt kê từng người có quyền Giao việc: số người nhận được + có ai lọt ngoài phạm vi.
4. Tài khoản **"Quản trị viên"** (`quantri@`, P.HCTH) lọt vào danh sách người nhận.
5. Ô **"+ Giao việc"** (giao MỚI, `batBuocTrongPhamVi`) chưa áp luật "không xuống PMC/E&C" — lãnh đạo vẫn giao mới cho SCI PMC/E&C. Lời anh "Không ai giao xuống…" có phải áp cả giao mới không? Kéo theo những đường nào (Báo cáo tuần ô Giao cho, Cây việc, Issue, agent khác gửi sang, việc sinh từ báo cáo của chính PMC/E&C)?
6. Người nhận đích danh rồi giao xuống → việc biến khỏi "Việc tôi nhận" của họ và không vào "Việc tôi giao" (chỉ tính `giao_boi`) — anh chọn "vẫn theo dõi"; hiện chỉ còn tin chuông. Đủ chưa?
7. Đổi chủ trì sang người khác → đơn vị/chức danh gốc biến khỏi việc: chuỗi "được giao bởi …" trên thẻ, đường đi chuông người giao gốc (4.6.4 "không báo người giao gốc"), Sơ đồ đếm việc theo đơn vị — có lệch không?
8. Bỏ 409 "không phân công lại được" → nay 403 khi người xem không còn đang nhận. Có đường nào phía giao diện còn dựa vào mã 409 / câu chữ cũ "không thuộc" không?
9. Cache danh sách người nhận ở `SoDoPhong.tsx` (biến cấp mô-đun `nhanChuyenTiep`) — đổi tài khoản không tải lại trang (đăng xuất → đăng nhập người khác) có giữ danh sách cũ không?
10. `db/85` + gieo: CSDL thật đã có cột và đúng giá trị chưa (đo trên bản sao). Hàm gieo chạy mỗi lần khởi động — có đè giá trị quản trị đã sửa không?

## 5. Danh mục kiểm

| # | Kiểm | Đạt khi |
|---|---|---|
| K1 | `npx tsc --noEmit` · `npx vitest run` | sạch · đạt hết (biết trước: 1 bài cấu hình tài khoản AI hỏng chập chờn, không liên quan) |
| K2 | Bản sao CSDL: với MỌI tài khoản có quyền Giao việc, tính danh sách người nhận theo luật ở mục 1 bằng script độc lập, so với `nguoiNhanChuyenTiep` | trùng khớp, không ai PMC/E&C (trừ ngoại lệ chính cụm) |
| K3 | curl có cookie `/api/cong-viec/nhan-chuyen-tiep` (quantri, và một trưởng phòng nếu đăng nhập được) · `/so-do?viec=CV-2026-0151` | 200; 401 khi chưa đăng nhập |
| K4 | Ô "Giao cho…" trên màn Sơ đồ / Dự án / Báo cáo tuần / thẻ nhúng (TheViecNhung) | hiện đúng, nhóm theo đơn vị, chữ tiếng Việt |
| K5 | Thử giao chuyển tiếp **trên dữ liệu test** (tạo việc tên có chữ "test", xong thì xoá/đóng) — KHÔNG giao thật CV-2026-0151 | phần việc sang người, chuông đúng, lịch sử `phan_cong`, người giao nhận tin khi xong |
| K6 | Mọi chữ mới đến tay người dùng là tiếng Việt; câu lỗi 403 đọc hiểu được | đúng |

## 6. Khuôn kết quả

🔴 sai luật / hỏng chức năng · 🟡 lệch thước, nên sửa · ⚪ ghi nhận. Mỗi điểm: file:dòng + số đo + cách tái hiện + đề xuất sửa (đề xuất cũng phải đo). Điểm cần **anh Đại quyết** gom riêng cuối file, kèm gợi ý phương án.
