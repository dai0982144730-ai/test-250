# KẾT QUẢ kiểm độc lập — Giao chuyển tiếp 3004 (`66d674f`) · BẢN DỞ

> Người kiểm: phiên "o kiem tra code lần 2" · 10/10/2026 ~01:05–01:20. **Dừng giữa chừng vì hết hạn mức** — mục 4 ghi phần chưa làm.
> Chỉ đọc + đo: CSDL trên bản sao (chép `data/pgdata` lúc ~00:15, sau khi 3004 dựng lại 23:25); cookie tự ký; chỉ GET; không giao thật; không gọi AI.

**Kết luận tạm: lỗi gốc đã chữa · 0 🔴 · 3 🟡 · 4 ⏸ cần anh quyết.**

## 1. Đo được

| # | Kết quả | Số đo · cách tái hiện |
|---|---|---|
| K1 | ✅ | `tsc --noEmit` 0 lỗi · vitest **1.005 đạt · 12 bỏ qua · 0 hỏng** (đo 00:54 cho đề khác, cùng mã) |
| K3 | ✅ | `/api/cong-viec/nhan-chuyen-tiep`: 27 tài khoản → 200; không cookie → **401**. `/so-do?viec=CV-2026-0151` (ptgd.dai) → 200 |
| Lỗi gốc | ✅ chữa | `/api/so-cai?q=CV-2026-0151`: ptgd.dai `co_the_phan_cong=["pv-mv0pek0p-218d4e"]`, danh sách **32 người**; truong.dtpc, thinhhp → `[]` |
| K2 lãnh đạo | ✅ khớp | 7 lãnh đạo: **33 người** (anh Đại 32, trừ chính mình). Đếm độc lập: 52 tài khoản − 7 lãnh đạo chức danh cấp 1 − 11 PMC − 2 E&C + anh Đại (kiêm P.ĐT&PC) = 33. Không ai PMC/E&C |
| K2 trưởng | ⚠ xem 🟡1 | truong.cd 6 · truong.hcth 2 · truong.tckt 5 · truong.dtpc 10 · nv.dtpc (Hằng, trưởng phụ) 10 · doainv 5 · anhn 1 · gd.enc 1 · gd.pmc 12 · vinhht 12 · **truong.ktvh 11 · troly.ct 10** · sangnq/thachtl/gd.namxe/laonv 0 · nhân viên (thinhhp, nv.bqlda, cuongnv1) 0 |
| #9 bộ nhớ tạm | ✅ | Đăng nhập luôn tải lại cả trang (`src/app/login/page.tsx:64` `window.location.href`) → biến mô-đun `nhanChuyenTiep` bị xoá khi đổi người |
| #8 mã 409 | ✅ | Không còn giao diện nào dựa câu "không phân công lại được" / mã 409 của đường này |
| #10 cột | ✅ giá trị · 🟡 chỗ sửa | Bản sao: PMC, E&C, 8 BĐH = true; phòng/BQL/nhà máy = false; **8 ô chức danh = NULL** (coi như trong SCI) |

## 2. Phát hiện

| # | Mức | Ở đâu | Số đo | Đề xuất |
|---|---|---|---|---|
| 🟡1 | lệch lời anh "theo quyền… trong mọi tình huống kiêm nhiệm" | `src/lib/phien.ts:84` `donViTruong = coVaiTruong ? donViIds : …` → `coQuyen` (`packages/sci-identity/src/quyen.ts:62-66`) | **Anh Sơn (truong.ktvh)** chỉ kiêm BQLDA QT với vai "Nhóm chuẩn bị sản xuất" mà giao chuyển tiếp được **5 người BQLDA QT** (gồm Phó GĐ Ban Đoài). Chốt 03/10 chính là ca này ("Hương mang quyền trưởng sang BQLDA QT" là sai) | Quyền trưởng chỉ áp ở đơn vị có chức vụ trưởng/phó (đơn vị chính, hoặc kiêm nhiệm có chức vụ lãnh đạo) — đo lại 52 tài khoản |
| 🟡2 | chú thích sai | `db/85-don-vi-ngoai-sci.sql:4` | Ghi "quản trị sửa ở Cài đặt › Tổ chức" — grep `ngoai_sci` chỉ có ở `khoi-tao.ts:145` + `dich-vu.ts`; **không màn nào sửa được**. Đơn vị BĐH mới thêm sau sẽ để NULL (= trong SCI) vì gieo chỉ chạy `DON_VI_MAC_DINH` | Thêm ô ở Cài đặt › Tổ chức, hoặc sửa chú thích |
| 🟡3 | giao ngược lên | `nguoiNhanChuyenTiep` (`dich-vu.ts:1595-1611`) chỉ chặn ô `ban_tgd` + chức danh cấp 1, nhưng lãnh đạo vẫn lọt qua đơn vị kiêm nhiệm | Hương (Phó phòng), Hằng, Thanh (chuyên viên) đều có **anh Đại (PTGĐ, trưởng chính P.ĐT&PC)** trong danh sách; Đoài (BQLDA QT) có Hương + Sơn | Bỏ người có vai Lãnh đạo / trưởng chính của chính đơn vị người giao — ⏸ anh xác nhận trước |

## 3. ✅ Anh Đại đã quyết (10/10/2026, trả lời trong phiên "o kiem tra code lần 2")

| # | Câu hỏi | Anh trả lời | Việc cho phiên sửa |
|---|---|---|---|
| 1 | Anh Thanh (troly.ct) giao chuyển tiếp được 10 người | **"theo gợi ý"** — quyền trưởng của anh Thanh chỉ áp ở ô Trợ lý CT | Cùng nguyên tắc với 🟡1 (anh Sơn): quyền trưởng chỉ ở đơn vị người đó làm trưởng. ⚠ Không được làm mất quyền của **Hằng** (trưởng phụ P.ĐT&PC, chức vụ ghi "Chuyên viên" — chốt 08/10) → không lọc theo chữ chức vụ được, cần chỗ khai "trưởng ở đơn vị nào" |
| 2 | 8 BĐH tổng thầu xếp "ngoài SCI" | **"có"** — đúng | Giữ `ngoai_sci = true` cho 8 BĐH; vẫn còn 🟡2 (không màn nào sửa cột) |
| 3 | Giao MỚI có áp "không giao xuống PMC/E&C" | **"có áp"** | Thêm luật vào giao mới (`batBuocTrongPhamVi`, `dich-vu.ts:248`). Anh chốt tiếp "theo gợi ý": **26 phần việc đang mở đã giao ngoài SCI giữ nguyên** (luật chỉ chặn từ nay) · **việc sinh từ báo cáo của chính PMC/E&C không chặn** (việc nội bộ công ty họ — như ngoại lệ ở chuyển tiếp) |
| 4 | Tài khoản "Quản trị viên" trong danh sách người nhận | **"không"** — không bỏ | Giữ nguyên |

## 3b. Câu hỏi gốc (để đối chiếu)

1. **Anh Thanh (troly.ct)** — chuyên viên P.ĐT&PC, mang vai Trưởng vì ô "Trợ lý CT" → hiện giao chuyển tiếp được **10 người** (P.ĐT&PC + BQLDA QT/Lào), y như Phó phòng. *Gợi ý:* quyền trưởng của anh Thanh chỉ ở ô Trợ lý CT (cùng sửa 🟡1).
2. **8 BĐH tổng thầu xếp "ngoài SCI"** (điểm tự nghi #1). *Gợi ý:* giữ ngoài SCI nếu BĐH là người SCI E&C; nếu là người BQLDA thì bỏ.
3. **Giao MỚI có áp "không xuống PMC/E&C" không** (điểm #5). Số đo bản sao: **26 phần việc đang mở** giao cho đơn vị ngoài SCI, do 6 người giao (CT HĐQT, anh Đại, quantri, trưởng TCKT, GĐ E&C, GĐ PMC). *Gợi ý:* hỏi anh trước — áp cho giao mới sẽ chặn cả việc lãnh đạo giao thẳng cho PMC.
4. **Tài khoản "Quản trị viên" là người nhận** (điểm #4): có trong danh sách của 7 lãnh đạo + trưởng P.HCTH. *Gợi ý:* bỏ tài khoản `la_quan_tri` chỉ có vai Quản trị khỏi danh sách người nhận.

## 4. Chưa làm (hết hạn mức)

- #6 · #7 (người giao vẫn theo dõi; chuỗi "được giao bởi", Sơ đồ đếm theo đơn vị) — mới đọc tới `nguoiDaPhanCong` (`dich-vu.ts:1319,1428`), chưa kết luận.
- K4 (ô Giao cho trên 4 màn), K5 (thử giao trên việc test), K6 (soát chữ tiếng Việt câu 403 — đọc mã thấy tiếng Việt, chưa đo sống).
- Danh sách người nhận từng người chưa so từng tên với luật độc lập cho nhóm trưởng (mới so số lượng + soi ca lệch).
