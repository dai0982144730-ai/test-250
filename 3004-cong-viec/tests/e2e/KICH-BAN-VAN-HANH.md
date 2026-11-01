# Kịch bản vận hành: một tuần báo cáo của 9 đơn vị

Kịch bản mô phỏng một tuần báo cáo thật trên SCI công việc, từ lúc các đơn vị lập báo cáo đến lúc việc được giao, làm xong và rời sổ cái.

Mỗi bước do đúng một người đăng nhập và thao tác trên giao diện như ngoài đời. Test tự động nằm ở [`15-kich-ban-van-hanh.spec.ts`](15-kich-ban-van-hanh.spec.ts). Mỗi bước trong tài liệu này ứng với một test cùng số thứ tự.

## Báo cáo dùng trong kịch bản

Có 9 báo cáo Word hợp lệ, mỗi mẫu Form 0–8 một báo cáo, cùng 2 bản phụ:

- **Nguồn dựng:** bộ sinh [`scripts/tao-bao-cao-kich-ban.mjs`](../../scripts/tao-bao-cao-kich-ban.mjs) điền vào mẫu thật đã chuyển (`mau-word/form-N.docx`). Báo cáo có đủ ô bắt buộc, đúng kỳ và có bảng công việc.
- **Ngày tháng:** tính theo ngày chạy. Kỳ là tuần hiện tại, ngày lập là hôm nay, hạn việc bằng hôm nay cộng N ngày. Nhờ vậy trạng thái hạn trên sổ cái luôn như kịch bản, dù chạy vào ngày nào.
- **Tạo file để mở bằng Word:** chạy `node scripts/tao-bao-cao-kich-ban.mjs`. Các file được ghi vào `tests/e2e/du-lieu/tuan<N>/`.

| Mẫu | File | Người gửi | Gửi đến | Việc đáng chú ý |
|---|---|---|---|---|
| Form 7 | `BaoCao_Tuan<N>_BQLDA_QuangTri.docx` | Lý Thị Nga (NV BQLDA) | P.ĐT&PC | GPMB Trụ T11 (hạn +15); đất rừng T14–T16 (**treo**, không ngày); móng trụ T5–T8 (**sắp đến hạn**, +2) |
| Form 5 | `BaoCao_Tuan<N>_SCI_PMC.docx` | Ngô Văn Bình (GĐ SCI PMC) | P.ĐT&PC | Nghiệm thu đập chính NK1 (**quá hạn**, −5) |
| Form 6 | `BaoCao_Thang<M>_SCI_ENC.docx` | Đặng Thị Hoa (NV SCI E&C) | P.ĐT&PC | Thu vốn đợt 5 NK1 (hạn +20); đập chính Nậm Mô 1 |
| Form 8 | `BaoCao_Tuan<N>_NM_NamXe.docx` | Mai Văn Sơn (GĐ NM Nậm Xe) | P.KT&VH | Thay relay R21 (hạn +10) |
| Form 1 | `BaoCao_Tuan<N>_PDTPC.docx` | Phạm Thu Hà (NV P.ĐT&PC) | Ban TGĐ | **GPMB Trụ T11 (hạn +20)**, trùng với việc của BQLDA |
| Form 2 | `BaoCao_Tuan<N>_PKTVH.docx` | Trần Văn Hùng (NV P.KT&VH) | Ban TGĐ | **Relay R21 (hạn +13)**, trùng với việc của nhà máy |
| Form 3 | `BaoCao_Tuan<N>_PHCTH.docx` | Hoàng Thị Mai (Văn thư) | Ban TGĐ | Mua sắm thiết bị (**treo**) |
| Form 4 | `BaoCao_Tuan<N>_PTCKT.docx` | Vũ Đức Anh (KTT P.TCKT) | Ban TGĐ | **Thu vốn đợt 5 (hạn +17)**, trùng với việc của SCI E&C |
| Form 0 | `BaoCao_HopNhat_Tuan<N>.docx` | Phó TGĐ | Ban TGĐ | Dòng cần TGĐ quyết định: "Chi trả GPMB Trụ T11" |
| Form 7 (bản phụ) | `…_thieu-nguoi-lap.docx` | Lý Thị Nga | — | Ô Người lập còn "......", nên bị chặn gửi |
| Form 6 (bản phụ) | `…_SCI_ENC_ban2.docx` | Đặng Thị Hoa | — | Bản sửa gửi lại sau khi bị trả lại |

Ba việc được cố ý cho **trùng** giữa cấp dưới (cấp 3) và cấp trên (cấp 2, rồi cấp 1). Mục đích là xem sổ cái chọn bản nào làm nguồn hiện hành theo quy tắc đè.

## Các bước

### Buổi sáng: đơn vị cấp 3 gửi báo cáo lên phòng quản lý

**1. Lý Thị Nga (NV BQLDA).**
- Làm: tải bản quên ô Người lập, sau đó tải lại bản đã sửa rồi gửi P.ĐT&PC.
- Kết quả mong đợi: bản đầu báo "Chưa đạt: 1 lỗi chặn gửi" đúng ô Người lập và nút Gửi bị khóa. Bản sửa báo "Đủ điều kiện", gửi được.

**2. Ngô Văn Bình (GĐ SCI PMC).**
- Làm: gửi báo cáo có một việc đã quá hạn.
- Kết quả mong đợi: hệ thống chỉ gợi ý "Kết thúc phải sau Ngày lập", không chặn. Gửi được.

**3. Đặng Thị Hoa (NV SCI E&C).**
- Làm: gửi báo cáo tháng.
- Kết quả mong đợi: gửi được.

**4. Mai Văn Sơn (GĐ NM Nậm Xe).**
- Làm: gửi báo cáo.
- Kết quả mong đợi: nơi nhận mặc định là P.KT&VH. Gửi được.

**5. Hoàng Thị Mai (Văn thư).**
- Làm: vào sổ công văn "V/v đơn giá bồi thường GPMB Trụ T11" của UBND huyện Hướng Hóa, chuyển ngay cho P.ĐT&PC.
- Kết quả mong đợi: báo "Đã vào sổ văn bản đến số N/năm và chuyển đơn vị xử lý".

### Trưởng phòng xử lý hộp Đến

**6. Lê Minh Tuấn (Trưởng P.ĐT&PC).**
- Làm: mở Tổng quan; nhận báo cáo BQLDA, báo cáo PMC và công văn; **trả lại** báo cáo SCI E&C với lý do "Thiếu số liệu thu vốn đợt 5".
- Kết quả mong đợi: Hộp Đến có đúng 4 tài liệu (công văn hiện theo trích yếu). Báo "Đã trả lại SCI E&C: …".

**7. Đặng Thị Hoa.**
- Làm: xem thông báo, xem sổ cái, mở tài liệu rồi **gửi lại bản 2**.
- Kết quả mong đợi: có thông báo "Bị trả lại". Trên sổ cái, việc của SCI E&C có nhãn "Chờ sửa: tài liệu nguồn bị trả lại". Trang tài liệu hiện lý do và không có nút Chuyển tiếp. Gửi lại được bản 2.

**8. Lê Minh Tuấn.**
- Làm: nhận bản 2.
- Kết quả mong đợi: việc của SCI E&C hết nhãn "Chờ sửa".

**9. Đỗ Quang Vinh (Trưởng P.KT&VH).**
- Làm: nhận báo cáo Nậm Xe, **chuyển tiếp nguyên văn** lên Ban TGĐ.
- Kết quả mong đợi: báo "Đã chuyển tiếp nguyên văn".

### Buổi chiều: các phòng gửi báo cáo lên Ban TGĐ, sổ cái đè theo cấp

Ở các bước 10, 11 và 13, người gửi xác nhận "Đúng là CV-…" cho việc trùng. Việc không trùng thì bấm "Việc mới".

**10. Phạm Thu Hà.**
- Làm: gửi báo cáo P.ĐT&PC, xác nhận "GPMB Trụ T11" là việc đã có.
- Kết quả mong đợi: gửi được.

**11. Trần Văn Hùng.**
- Làm: gửi báo cáo P.KT&VH, xác nhận "Relay R21" là việc đã có.
- Kết quả mong đợi: gửi được.

**12. Hoàng Thị Mai.**
- Làm: gửi báo cáo P.HCTH.
- Kết quả mong đợi: gửi được.

**13. Vũ Đức Anh.**
- Làm: gửi báo cáo P.TCKT, xác nhận "Thu vốn đợt 5" là việc đã có.
- Kết quả mong đợi: gửi được.

**14. Tổng Giám đốc.**
- Làm: xem Sổ cái.
- Kết quả mong đợi, nguồn hiện hành của ba việc trùng đều là bản của cấp cao hơn:
  - **GPMB:** nguồn "Phòng Đầu tư và Pháp chế · Form 1", hạn +20, "đã đè 1 bản".
  - **Relay R21:** nguồn "P.KT&VH · Form 2", hạn +13.
  - **Thu vốn:** nguồn "P.TCKT · Form 4", hạn +17.
- Kết quả mong đợi, bộ lọc theo hạn:
  - "Quá hạn" có việc nghiệm thu NK1.
  - "Sắp đến hạn" có việc móng trụ T5–T8.
  - "Treo" có việc đất rừng và việc mua sắm.

### Ban TGĐ tổng hợp và quyết định

**15. Phó TGĐ.**
- Làm: gửi báo cáo hợp nhất Form 0.
- Kết quả mong đợi: các dòng quyết định hiện "Chờ TGĐ quyết định".

**16. Tổng Giám đốc.**
- Làm: nhận 4 báo cáo phòng. Mở báo cáo hợp nhất, bấm **Quyết định, giao việc** ở dòng "Chi trả GPMB Trụ T11". Giao 2 phần việc, BQLDA và P.ĐT&PC, với hạn +15.
- Kết quả mong đợi: dòng hiện "có vẻ trùng CV-…". Hộp giao việc chọn sẵn "Giao lại, đè CV-…". Sau khi giao, sổ cái hiện việc cấp 1, tiến độ 0/2, hạn +15.

### Thực hiện và kết thúc việc

**17. Trịnh Văn Dũng (GĐ BQLDA).**
- Làm: xem Tổng quan, bấm **Kết thúc** phần của BQLDA.
- Kết quả mong đợi: việc có trong "Phần việc của tôi". Báo "BQLDA Quảng Trị đã kết thúc phần việc. CV-…: 1/2".

**18. Trần Văn Hùng (phòng khác).**
- Làm: xem việc GPMB trên sổ cái.
- Kết quả mong đợi: không có nút Kết thúc.

**19. Lê Minh Tuấn.**
- Làm: kết thúc phần còn lại.
- Kết quả mong đợi: báo "Đủ người kết thúc: CV-… tự rời sổ cái". Việc sang mục "Vừa chuyển vào lịch sử". Trang việc ghi "Hoàn thành, đã rời sổ cái".

### Cuối ngày: kiểm soát

**20. Mai Văn Sơn.**
- Làm: xem cây hành trình báo cáo Nậm Xe.
- Kết quả mong đợi: cây thấy đủ đường đi, từ nhà máy qua P.KT&VH (chuyển tiếp nguyên văn) lên Ban TGĐ.

**21. Quản trị viên.**
- Làm: tra lịch sử theo mã việc GPMB, rồi bấm Kiểm tra toàn vẹn.
- Kết quả mong đợi: có ít nhất 3 dòng lịch sử. Kết quả kiểm tra là "Nguyên vẹn…, chuỗi băm khớp".

**22. Quản trị viên.**
- Làm: xem hàng đợi email, bấm **Gửi ngay**.
- Kết quả mong đợi: các thao tác trong ngày đã sinh thư thông báo. Ở chế độ thử, thư được ghi thành file `.eml`.

**23. Agent tiến độ.**
- Làm: dùng khóa riêng do quản trị cấp để đọc sổ cái qua `/api/mcp/socai`.
- Kết quả mong đợi: thấy việc thu vốn với nguồn P.TCKT. Việc GPMB đã rời sổ nên không còn.

**24. Nhiều vai.**
- Làm: mở thanh bên với từng vai.
- Kết quả mong đợi: chỉ quản trị viên thấy mục Quản trị.

## Chạy kịch bản

```bash
# Chạy trên máy chủ test mới; CSDL RAM bị bỏ sau khi chạy xong
npx playwright test tests/e2e/15-kich-ban-van-hanh.spec.ts
```

Muốn **giữ lại dữ liệu để đăng nhập xem** sổ cái, cây hành trình, lịch sử, thông báo…, làm theo hai bước sau (PowerShell).

Bước 1, dựng máy chủ demo và để nó chạy:

```powershell
$env:E2E_PORT='3300'; node tests/e2e/may-chu.mjs
```

Bước 2, ở một cửa sổ khác, chạy kịch bản trên máy chủ demo đó:

```powershell
$env:E2E_PORT='3300'; $env:E2E_DUNG_MAY_CHU='1'; npx playwright test tests/e2e/15-kich-ban-van-hanh.spec.ts
```

Sau đó mở http://localhost:3300 và đăng nhập bằng bất kỳ tài khoản mẫu nào (mật khẩu `Sci@2026`).

Máy chủ demo dùng CSDL trong RAM, nên tắt máy chủ là dữ liệu demo mất. Dữ liệu thật ở `data/pgdata` không bị đụng tới.

## Điều quan sát được khi dựng kịch bản

Dòng quyết định của TGĐ tên "Phê duyệt phương án bồi thường GPMB Trụ T11" **không** được gợi ý là trùng với việc đang mở "GPMB Trụ T11", vì độ giống tên dưới ngưỡng gợi ý. Khi đó TGĐ không có lựa chọn "giao lại, đè việc cũ", và sẽ tạo ra một việc mới song song.

Kịch bản đặt tên dòng quyết định bắt đầu bằng "Chi trả GPMB Trụ T11" để luồng đè chạy đúng.

Nếu ngoài thực tế tên dòng quyết định thường viết theo kiểu "Phê duyệt…", nên cân nhắc một trong hai cách:

- Hạ ngưỡng ở Cài đặt → Quy tắc đè → "Ngưỡng gợi ý có vẻ trùng".
- Cho TGĐ tự chọn việc cần đè kể cả khi hệ thống không gợi ý.
