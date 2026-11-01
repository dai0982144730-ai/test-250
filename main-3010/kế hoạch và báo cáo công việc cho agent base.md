# SỔ CÔNG VIỆC — AGENT BASE.VN

> File bắt buộc theo `BAT-DAU-DOC-FILE-NAY.md` mục 4.
> Bên nhận đọc đúng file này khi ghép agent vào hệ. **Sổ trống = không ghép được.**
> Cập nhật MỖI KHI xong một bước. Không dồn cuối kỳ mới viết.

- **Nhóm code:** Hoàng Phú Thịnh (@thinhhp)
- **Nhánh git:** `agent-base`
- **Cổng chạy:** 3011 (`npm run dev -- -p 3011`)
- **Nguồn tiến độ:** MCP `http://localhost:3003/api/mcp/tiendo`
- **Đặc tả:** `0-THAM-CHIEU/TAI-LIEU-CHUNG/CHOT/PLAN-AGENT-BASE-VN-v1.0.md`
- **Thước đo giao diện:** `0-THAM-CHIEU/demo/demo-agent-base.html` — **14 màn**

---

## 1. Tình trạng hiện tại

> **Cập nhật 05/09/2026 (chiều).** Chi tiết đợt mới nhất ở cuối file — mục
> *"ĐỢT 05/09/2026 (chiều)"*. Bảng dưới là ảnh chụp nhanh tình trạng.

| | |
|---|---|
| Xong | Khung + lớp cách ly · menu 6 mục · nhận diện Agent Base.vn · màn Cây việc & đường găng (kèm **tầng B**) · màn Cài đặt 8 tab · từ điển ngữ cảnh · **cổng MCP `/api/mcp/base` đủ 10/10 công cụ chạy** · **bộ đọc mã WBS ba đường** · màn Issue theo chốt BC 6e.1 |
| Đang dở | Ba luật sinh issue RIÊNG của Agent Base (PLAN mục 11) chưa nối vào bộ sinh — xem mục I, C-01 |
| Bị chặn bởi | **Dữ liệu, không phải code.** Đo 2830 việc trên 80 không gian: **0 việc** khai được mã WBS. Phải có người gắn thẻ `wbs:…` trên Base (việc T-05) thì cả ba luật kia mới có nghĩa |
| Số đo kiểm | `npm test` **479** · `test:mcp` **25** · `test:ui` **63 đạt 0 trượt** · `tsc` **sạch** · quét app **8/8 trang sạch** |

---

## 2. Quyết định thiết kế — chọn gì, VÌ SAO, số đo nào dẫn tới

### QĐ-01 — Fork nguyên `codeqlda.bundle` thay vì dựng `apps/base` trên lõi dùng chung

- **Chọn:** clone toàn bộ bundle rồi cắt/sửa tại chỗ.
- **Vì sao:** `PLAN-AGENT-BASE-VN` mục 15 giả định có sẵn "lõi dùng chung", nhưng lõi đó là **23 ngày công** (`LOI-DUNG-CHUNG` mục 11) và **chưa ai được giao làm**. Chờ lõi thì không gõ được dòng code nào.
- **Số đo dẫn tới quyết định:**
  - Bundle chứa **330 file `.ts/.tsx`**, khớp đúng thư mục bàn giao (đã đối chiếu).
  - `npm test` trên bản gốc: **403 đạt · 29 bỏ qua · 0 lỗi** → khung lành, fork được.
  - Bundle **đã có sẵn** `src/lib/integrations/base/` — client **967 dòng** + mapper **841** + types **180**.
- **Nợ kỹ thuật chấp nhận:** code lõi bị trùng giữa các agent. Khi hệ ghép lại phải bóc chung ra `packages/`. **Ghi nhận rõ ở đây để bên nhận biết trước.**
- **Căn cứ có lợi:** `CACH-KE-THUA-CODEQLDA.md` đã ghi *"4 Agent Base.vn ← làm sau — lúc này quay lại lấy phần Base từ bộ code mẫu"*.

### QĐ-02 — Giữ Next.js 14.2.5 + lưu file JSON, KHÔNG lên Next 16 + Prisma

- **Chọn:** bám bản đang chạy.
- **Vì sao:** `PLAN-TONG-THE` mục 12.3 chốt *"Next.js 16 + Prisma + PostgreSQL + pgvector"*, nhưng bản bàn giao thực tế là **Next.js 14.2.5, không có Prisma, lưu JSON trong `data/`**. `HUONG-DAN-BAT-AGENT-TIEN-DO` mục 7 nói thẳng *"PostgreSQL — phần đó chưa dựng… không cần cài"*.
- **Căn cứ:** `LOI-DUNG-CHUNG` mục 6e.4 chốt mốc kích hoạt PostgreSQL nằm ở **lúc ghép 5 agent**, không phải lúc code.
- ⚠ **CẦN MR. ĐẠI XÁC NHẬN.** Nếu bắt theo Next 16 + Prisma thì phải làm lại phần lưu trữ.

### QĐ-03 — Mọi lời gọi tiến độ đi qua đúng một file

- **Chọn:** `src/lib/nguon-tien-do.ts` là cửa duy nhất.
- **Vì sao:** nghĩa vụ bắt buộc ghi ở `BAT-DAU-DOC-FILE-NAY` mục 3 và `LOI-DUNG-CHUNG` 6e.4 — khi kho chung dựng xong chỉ sửa một chỗ.
- **Đã cài kèm:** hạn chờ 10s/60s/3s · ngắt mạch 3 lỗi → nghỉ 10 phút · thử lại 1 lần với `HET_HAN_CHO` · coi `KHONG_CO_DU_LIEU` là câu trả lời hợp lệ (không tính lỗi). Theo `HOP-DONG-KET-NOI` mục 6.

---

## 3. Chỗ tài liệu THIẾU hoặc MÂU THUẪN — ghi lại, không tự chế rồi im lặng

| # | Vấn đề | Ảnh hưởng | Đề nghị |
|---|---|---|---|
| M-01 | `PLAN-TONG-THE` 12.3 chốt Next 16 + Prisma; bản bàn giao là Next 14 + JSON | Chọn sai phải làm lại tầng lưu trữ | Mr. Đại xác nhận bằng văn bản |
| M-02 | Header 4 file plan vẫn ghi *"BẢN NHÁP — chưa được dùng để viết code"*, dù nằm trong `CHOT/` và `BAT-DAU-TU-DAU` tuyên bố V1.0 đóng băng 31/08 | Không rõ bản nào có hiệu lực | Cập nhật header, hoặc xác nhận một câu |
| M-03 | `PLAN-AGENT-BASE-VN` mục 15 giả định "lõi dùng chung" đã có; thực tế chưa ai làm 23 ngày đó | Ước lượng 33 ngày công bị thiếu nền | Chốt ai gánh phần lõi |
| M-04 | Plan ghi `client.ts` 932 dòng; đo thực tế **967 dòng** | Nhỏ, chỉ là plan hơi cũ | Không cần xử |

---

## 4. Việc cần Agent tiến độ đổi — KHÔNG tự sửa bộ code của họ

| # | Việc | Trạng thái |
|---|---|---|
| T-01 | `CHAY-UNG-DUNG.bat` mở app ở cổng **3100**, nhưng `HUONG-DAN` mục 5 ghi cổng **3003**. Ai bấm file `.bat` rồi gọi MCP sẽ trượt toàn bộ. | Đã ghi, chờ báo |
| T-03 | ⭐ **Lệch hợp đồng, đo 05/09/2026 (bài nghiệm thu 3).** Gọi `tiendo.tom_tat_du_an` với `ma_du_an` không tồn tại → cổng trả **`KHONG_HIEU_YEU_CAU`**, nhưng `HOP-DONG-KET-NOI` mục 12 bài 3 ghi phải trả **`KHONG_CO_DU_LIEU`**. Khác nhau thật sự: `KHONG_CO_DU_LIEU` thì bên gọi hiện "chưa có dữ liệu" rồi **đi tiếp**; `KHONG_HIEU_YEU_CAU` thì **ghi nhật ký và không thử lại**. Điều cốt lõi của bài 3 (không bao giờ trả HTTP 500) thì **ĐẠT**. | Đã ghi, chờ báo |
| T-04 | ⭐ **Lỗi thật trong code kế thừa, bộ e2e bắt được 05/09/2026.** `src/components/tabs/skill/SkillView.tsx` — trong `ds.map(...)`, thuộc tính `key` đặt trên `<tr>` **bên trong** fragment `<>`, mà React đòi `key` ở **phần tử ngoài cùng**. Hậu quả: React không phân biệt được các dòng skill, thêm/xoá skill có thể vẽ sai dòng. Đã sửa trong bản clone bằng `<Fragment key={s.slug}>`; **bộ tiến độ gốc vẫn còn lỗi này** — báo để họ tự sửa, không tự đụng vào. | Đã sửa bản mình, chờ báo |

---

## 5. Rủi ro đã phát hiện ngoài phạm vi code

| # | Việc |
|---|---|
| R-01 | **Khoá Base.vn thật bị phát tán.** `data/settings.json` trong gói `.rar` chứa 4 khoá thật 156 ký tự (`baseTokenWework/Workflow/Hrm/Request`), trái với `BAT-DAU-DOC` mục 2 luật 2 nói *"gói này không kèm khoá"*. File `.bundle` thì sạch (`.gitignore` đã loại đúng) → lỗi ở khâu nén `.rar`. **Đã báo để Mr. Đại quyết có thu hồi/đổi khoá không.** |
| R-02 | Máy code có biến hệ thống `NODE_ENV=production` → `npm install` **âm thầm bỏ devDependencies**, mất TypeScript và Vitest. Phải dùng `npm install --include=dev`. |

---

## 6. Nhật ký theo ngày

### 2026-09-05 — Dựng khung
- Clone bundle → `D:\SCI-AI-AGENT\1-agent-base`, nhánh `agent-base`.
- Tạo `.env.local` (`AUTH_SECRET`) — bundle không kèm, đúng `.gitignore`.
- Viết `src/lib/nguon-tien-do.ts` (lớp cách ly bắt buộc).
- Đã đo cổng MCP chạy thật: `tiendo.tom_tat_du_an` trả **330 đầu việc · COD 2027-09-21 · 53 việc găng**.
- **Chưa đẽo màn nào.** Bước tiếp: mở `demo-agent-base.html`, đẽo từng màn một theo luật 7 (*demo là thước, không phải vật liệu*).

---

## 7. Việc phải làm NGAY sau khi bật được app

Theo `BAT-DAU-DOC-FILE-NAY.md`: copy nội dung file
`0-THAM-CHIEU/cơ cấu tổ chức và tên các dự án do Sci Group triển khai.docx`
dán vào ô **"Sơ đồ tổ chức và dự án"** trong mục **"Cài đặt Agent Base"**.

Thiếu bước này thì agent đọc tên viết tắt trong Base sẽ không biết đó là ban nào, dự án nào — mọi phân tích phía sau đều lệch.

- [ ] Đã dán từ điển ngữ cảnh

---

## 8. Quyền test trên Base.vn

Hai tài khoản Mr. Đại cấp: **@thinhhp** · **@thanhnv**.
Việc tạo ra khi test **phải có chữ «test» trong tên**; đo xong khôi phục hoặc ghi rõ tại đây.

⚠ Đã đo: khoá API wework đứng tên @thinhhp → **mọi việc tạo qua app đều hiện người tạo là @thinhhp**. Cần biết ai thật sự giao việc thì phải tự ghi sổ giao việc cục bộ.

| Ngày | Việc test đã tạo | Đã dọn chưa |
|---|---|---|
| | | |

### 2026-09-05 (bổ sung) — Bẫy môi trường đã đo và đã xử

**Triệu chứng:** bật `npm run dev` xong mọi trang trả **HTTP 500**, log báo
`Module parse failed: Unexpected character '@'` tại `src/app/globals.css`.

**Nguyên nhân:** máy đặt biến hệ thống `NODE_ENV=production`. Khi đó `next dev`
không nạp PostCSS/Tailwind, nên `@tailwind base;` không được dịch.
Cùng gốc với việc `npm install` âm thầm bỏ devDependencies.

**Cách xử:** ép `NODE_ENV=development` trước khi chạy. Đã tạo `CHAY.bat` ở gốc
thư mục làm sẵn việc này.

**Đã đo sau khi sửa:** `/login` và `/kich-ban-test` đều trả **HTTP 200**, log 0 lỗi.

**Đề nghị lâu dài:** xoá hẳn `NODE_ENV` khỏi biến môi trường Windows — nó không
nên được đặt ở cấp hệ thống, và sẽ còn gây lỗi khó đoán ở chỗ khác.

### Tài khoản dev tạm — XOÁ TRƯỚC KHI TRẢ BÀI

Gói bàn giao có `data/users.json` nhưng mật khẩu băm `sha256(salt + password)`,
không giải ngược được (tài liệu ghi "mật khẩu hỏi người bàn giao").
Đã thêm **một** tài khoản dev để mở app lên xem, **không sửa/xoá tài khoản gốc**:

- Script: `scripts/tao-tai-khoan-dev.mjs` · sao lưu: `data/users.json.truoc-khi-them-dev`
- Đăng nhập: `dev@sci.vn` / `dev123456`

⚠ Xin được mật khẩu thật thì **xoá tài khoản này** và khôi phục từ bản sao lưu.

### 2026-09-05 (bổ sung 2) — Dựng bộ test, đã chạy đạt

**Đã thêm:**
- `tests/unit/nguon-tien-do.test.ts` — **21 bài**, chạy offline, soi 4 luật chống lan
  sự cố của `HOP-DONG-KET-NOI` mục 6.
- `tests/tich-hop/nghiem-thu-mcp.test.ts` — **9 bài nghiệm thu** mục 12, gọi agent tiến
  độ thật.
- `vitest.tich-hop.config.ts` + lệnh `npm run test:mcp` · `npm run test:all`.
- `CHAY.bat` — bật app, tự ép `NODE_ENV=development`.
- `scripts/tao-tai-khoan-dev.mjs` — thêm tài khoản dev, không đụng tài khoản gốc.
- `HUONG-DAN-TEST.md` ở gốc `D:\SCI-AI-AGENT\`.

**Kết quả đo 05/09/2026:**

| Bộ | Kết quả |
|---|---|
| `npm test` | **424 đạt · 29 bỏ qua · 0 lỗi** (403 kế thừa + 21 mới) |
| `npm run test:mcp` | **9 đạt · 1 bỏ qua · 0 lỗi** |
| `npx tsc --noEmit` | **sạch** |

**Hai bài quan trọng nhất đều đạt:**
- Bài 4 — tắt agent kia: trả lời sau **2ms**, `AGENT_KHONG_SAN_SANG`, không treo.
- Bài 5 — gọi 5 lần: **1·1·1·12·0 ms**, lần 4 và 5 tức thì (ngắt mạch đã bật).

**Bài 9 CHƯA kiểm được:** cần hai cổng MCP mới dựng được vòng gọi. Agent này mới có phía
đi hỏi, chưa có phía trả lời `/api/mcp/<agent>`. Viết xong cổng thì mở lại bài này.
Ghi rõ là nợ, không đánh dấu đạt.

### 2026-09-05 (bổ sung 3) — Bộ e2e + bộ lái app

**Thêm hai công cụ:**

| Công cụ | Dùng để |
|---|---|
| `scripts/lai-app.mjs` | Lái Chromium thật: `menu` · `anh` · `chu` · `bam` · `quet` · `demo`. Đăng nhập tự động, giữ phiên, **bắt lỗi console** |
| `tests/e2e-agent.mjs` | **30 bài e2e** chia 7 nhóm A–G, chạy bằng `npm run test:ui` |

**Kết quả đo 05/09/2026 — cả hai agent giống nhau:**

```
npm test           →  424 đạt ·  29 bỏ qua · 0 lỗi
npm run test:mcp   →    9 đạt ·   1 bỏ qua · 0 lỗi
npm run test:ui    →   28 đạt ·   2 bỏ qua · 0 trượt
npx tsc --noEmit   →  sạch
```

**Hai bài BỎ QUA ở `test:ui` là cố ý** — chúng là **thước đo tiến độ đẽo giao diện**:
*"Thanh bên mang tên Agent Base.vn"* và *"Menu đúng 6 mục"*. Đẽo xong thì tự chuyển
sang đạt. Không phải lỗi.

---

#### Ba lỗi bộ e2e bắt được ngay lần chạy đầu

| # | Lỗi | Ai gây | Đã xử |
|---|---|---|---|
| 1 | **`SkillView.tsx` thiếu `key`** — `key` đặt trên `<tr>` bên trong `<>`, React không nhận. Danh sách skill có thể vẽ sai khi thêm/xoá | code kế thừa | ✅ Sửa: dùng `<Fragment key={…}>`. Đã áp cho cả 2 agent. **Bộ tiến độ gốc cũng dính — xem T-04** |
| 2 | Cảnh báo `Extra attributes from the server: data-theme` | **bộ lái của em** — đặt `data-theme` trước khi React hydrate | ✅ Sửa: chỉ đặt sau `networkidle` |
| 3 | Nhóm F báo "agent tiến độ chết" dù đang chạy | **bộ e2e của em** — gọi MCP từ trong trang (cổng 3011 → 3003 khác nguồn, bị CORS chặn) | ✅ Sửa: gọi từ Node, không gọi từ `page.evaluate` |

---

#### ⭐ SỬA MỘT KẾT LUẬN SAI TRƯỚC ĐÓ — mật khẩu KHÔNG cần đi xin

Trước đây ghi *"phải xin mật khẩu `data/users.json`, băm SHA-256 không giải ngược được"*
và xếp là **việc chặn 🔴**. **Sai.**

Trang `/login` **in sẵn ba tài khoản demo ở cuối trang**, bấm một dòng là tự điền:

| Email | Mật khẩu |
|---|---|
| `dai@sci.vn` | `Sci@2026` |
| `duong@sci.vn` | `Sci@2026` |
| `hientruong@sci.vn` | `Sci@2026` |

**Đã dọn theo:** xoá tài khoản dev tạm, khôi phục `data/users.json` nguyên bản, bỏ
`scripts/tao-tai-khoan-dev.mjs`. Bộ lái và bộ e2e dùng `dai@sci.vn`.

Bài học ghi lại: **mở app lên nhìn trước, đừng suy luận từ dữ liệu.** Nhìn file
`users.json` thấy hash rồi kết luận "phải đi xin" — trong khi câu trả lời nằm ngay
trên màn hình đăng nhập.

---

# ĐỢT 05/09/2026 (chiều) — GỠ NÚT THẮT WBS · MỞ 3 CÔNG CỤ MCP · MÀN ISSUE

## A. Kết quả đo cuối đợt

| Bộ kiểm | Trước đợt | Sau đợt |
|---|---|---|
| `npm test` | 424 đạt | **479 đạt** · 29 bỏ qua · 0 lỗi |
| `npm run test:mcp` | 14 đạt | **25 đạt** · 0 lỗi |
| `npm run test:ui` | 44 đạt · 0 trượt | **63 đạt · 0 trượt** |
| `tsc --noEmit` | sạch | **sạch** |
| `lai-app.mjs quet` | 7/7 trang sạch | **8/8 trang sạch** (thêm `/viec-theo-du-an`) |
| Công cụ MCP sẵn sàng | 7/10 | **10/10** |

---

## B. QĐ-04 — Gắn mã WBS: đọc `custom_*` là ngõ cụt, lối ra là THẺ (tag)

**Chọn:** đọc mã WBS theo BA đường, ưu tiên từ chắc chắn xuống phỏng đoán —
① trường tùy chỉnh khai ở Cài đặt tab 3 → ② thẻ (tag) của việc → ③ bóc từ tên việc.

**Vì sao:** `PLAN` mục 5.3 gọi việc đọc `custom_*` là *"một cơ hội rẻ"* và ghi
*"chi phí code bằng 0 vì mapper đã đọc sẵn"*. **Đo lại thì cơ hội đó bằng KHÔNG.**

**Số đo dẫn tới quyết định** — `node scripts/khao-sat-truong-tuy-bien.mjs --toan-bo`,
chạy 05/09/2026 trên **80 không gian dự án · 2830 việc · 0 lỗi đọc**:

| Đo gì | Kết quả |
|---|---|
| Việc có trường `custom_*` | **0 / 2830 · 0,0 %** |
| Việc có thẻ (tag) khác rỗng | **126 / 2830 · 4,5 %** — 30 thẻ phân biệt |
| Thẻ trông như mã WBS | **0 / 2830 · 0,0 %** |
| Việc có mã WBS trong TÊN | **4 / 2830 · 0,1 %** |
| Số khoá Base trả kèm mỗi việc | **68 khoá — KHÔNG khoá nào là `custom_*`** |

Base Wework v3 của công ty **không trả về trường tùy chỉnh nào**. Chỗ khai còn lại
mà API đọc được là `tags`, và người dùng **đang dùng thật**: `bdh` ×26, `kt` ×16,
`kthd` ×12, `mua-hang` ×8, `hcns` ×7, `chung` ×6…

**Kết luận ghi thẳng cho bên nhận: đường ống đã thông, chưa ai rót dữ liệu vào.**
Ngày có người gắn thẻ `wbs:7.5.4.6` lên việc Base là chạy ngay, không sửa dòng code
nào. Đây **không** phải việc code còn dở — đây là việc nhập liệu trên Base.

**Chống gắn bừa:** thẻ nghiệp vụ đang dùng (`bdh`, `kt`, `NS3A`…) tuyệt đối không
được nhận nhầm thành mã WBS. Có hẳn một bài test lấy **cả 30 thẻ thật** ra soi.

## C. QĐ-05 — Giữ lại việc CHƯA gắn được mã (tầng B)

**Chọn:** `layViecBaseTheoWbs` giữ cả việc không gắn được mã, trả về `viecChuaGan`.

**Vì sao:** trước đây những việc đó bị `continue` bỏ luôn, nên màn hình chỉ bày được
con số **"0 việc gắn được mã"** trần trụi — người dùng tưởng phần mềm hỏng. Demo màn 1
có sẵn khối *"Việc thuộc dự án nhưng CHƯA GẮN MÃ — tầng B"* mà không có dữ liệu để vẽ.

**Số đo:** không gian 111663 → **128 việc, 0 gắn được, 128 nằm ở tầng B** (bảng cắt 60 dòng).

## D. ⭐ LỖI THẬT ĐÃ SỬA — `namImNgay` LUÔN trống vì client bỏ mất trường

`nguon-base.ts` dò `last_update` để tính "việc nằm im mấy ngày", nhưng
`client.ts::chuanHoaCongViec` chỉ giữ danh sách trường trắng + `custom_*`, nên
`last_update` **bị bỏ khi chuẩn hoá**. Hậu quả: `doDuocNamIm` luôn `false`, cột
"nằm im" luôn trống, và màn hình còn in hẳn dòng giải thích sai
*"Base không trả về mốc cập nhật gần nhất"* — **Base CÓ trả, mình làm rớt.**

| Đo | Trước | Sau |
|---|---|---|
| Việc có `last_update` trong gói THÔ | 128/128 | 128/128 |
| `doDuocNamIm` | `false` | **`true`** |
| Việc tính được số ngày nằm im | 0 | **60/60** (13 · 13 · 59 · 63 ngày…) |

Nhìn thấy được trên ảnh `anh-chup/viec-theo-du-an.png`, cột "NẰM IM".

## E. QĐ-06 — `base.quy_trinh_dang_tac` ĐỔI NGUỒN: Workflow → Request

**Chọn:** công cụ đọc **Base Request**, không đọc Base Workflow như plan gốc.

**Vì sao — đo 05/09 bằng chính khoá công ty:**

```
POST workflow.base.vn/extapi/v1/workflows/get → {"code":1,"total_items":"0","workflows":[]}
POST workflow.base.vn/extapi/v1/jobs/get      → {"code":1,"total_items":"0","jobs":[]}
POST hrm.base.vn/extapi/v1/employee/list      → {"code":1,"employees":[]}
POST request.base.vn/extapi/v1/group/list     → 3 nhóm
POST request.base.vn/extapi/v1/request/list   → total_items = 6, đọc đủ 6/6
```

`code: 1` = gọi **thành công**, rỗng thật — không phải lỗi khoá, không phải lỗi mạng.
Chuỗi duyệt của Request (`owners[].approved`: 1 đã duyệt · **0 = đang chờ người này** ·
−1 đã bác) mới đúng là thứ trả lời được câu *"hồ sơ đang nằm ở bàn ai"*.
Bản demo cũng chốt hướng này ở tab *"Đề xuất tắc ≥ 5 ngày"*.

**Nhưng vẫn đo lại Workflow mỗi lần trả lời** và kèm số đo vào câu trả lời — ngày công
ty bật Workflow là thấy ngay, không phải nhớ quay lại sửa.

**Kết quả hiện tại là 0 hồ sơ tắc — và đó là câu trả lời ĐÚNG**, không phải thiếu dữ
liệu: cả 6 đề xuất đều đã duyệt xong hoặc bị bác, 0 cái còn đang chạy.

## F. QĐ-07 — `base.thong_tin_nhan_su` trả TẦNG 1, khai `null` cho tầng 2

**Chọn:** không trả `KHONG_CO_DU_LIEU` trọn gói. Tầng 1 (username + ảnh) CÓ dữ liệu
thật thì trả; tầng 2 (họ tên · chức vụ · ban · công ty) khai `null` **kèm lý do đo được**.

**Vì sao:** trả rỗng trọn gói là bỏ phí 140 người đã gom được. Còn trả chuỗi rỗng cho
`ban` thì bên gọi tưởng *"người này không thuộc ban nào"* — sai còn tệ hơn thiếu.

**Số đo:** danh bạ **140 người · 140 có ảnh · 1 có họ tên đầy đủ**.

**Vá thêm miễn phí:** nhật ký duyệt Base Request có sẵn họ tên do Base tự sinh
(`"<b>Nguyễn Anh Cường</b> created this request"` + `username: cuongna`). Gom vào danh
bạ → **1/140 lên 4/140** người có họ tên (`manhpd`, `cuongna`, `thanhnv`, `thinhhp`).
Ít, nhưng là dữ liệu THẬT và mỗi lượt gọi công cụ đề xuất là danh bạ tự dày thêm.

## G. Hai chỗ phải sửa sau khi ĐO công cụ đề xuất (không phải đoán)

1. **Khối base64 lọt vào phần chữ tìm.** Ô *"Bảng kê thanh toán"* mang giá trị base64
   dài; gộp vào là tìm ra nhiễu. Đã loại chuỗi ≥ 40 ký tự, không dấu cách, chỉ gồm ký
   tự base64.
2. **Xếp hạng khớp.** Tìm `"thanh toan"` khớp **6/6** đề xuất — và **khớp ĐÚNG**, vì
   bốn phiếu tiếp khách đều có ô biểu mẫu tên *"Hình thức thanh toán"*. Không loại đi
   được (chúng khớp thật), nhưng phải xếp sau. Nay khớp trên **TIÊU ĐỀ** được 2 điểm,
   khớp trong ô biểu mẫu 1 điểm. Đo lại: đứng đầu là *"ĐX thanh toán CTP 2"*. ✔

---

## H. ⭐⭐ BỐN LỖI THẬT TRÊN MÀN ISSUE — di sản lúc fork, không phải việc đổi văn

### H-1. `AGENT_NAY = "tien-do"` trong cả bộ code của AGENT BASE

`src/lib/canh-bao/model.ts` còn ghi cứng `"tien-do"`. Hai hậu quả:

- issue người thêm bị đóng dấu chủ sở hữu **SAI** (`agent: "tien-do"`);
- `chanGhiAgentKhac` so nhầm chủ → **Agent Base SỬA ĐƯỢC issue của agent tiến độ và
  ngược lại** — đúng điều `LOI-DUNG-CHUNG` 6e.1 cấm.

Sửa ở đúng một hằng số, cả hai chỗ tự đúng theo.

### H-2. `duyetDeXuatAi` và `bacBoDeXuatAi` KHÔNG hề gọi chốt chặn

Hai hàm này thiếu hẳn `chanGhiAgentKhac`, nên Agent Base **duyệt được đề xuất AI của
agent khác**. Đã vá.

**Đo lại qua API thật** (tạm đánh dấu 1 thẻ là của agent pháp lý, xong khôi phục nguyên trạng):

| Lệnh | Kết quả |
|---|---|
| `ghi-nhan` | **HTTP 403** — *"Issue này do Agent pháp lý sinh ra. Agent Base.vn nhìn thấy nhưng không sửa được…"* |
| `duyet` | từ chối, kêu đúng lý do |
| `bac-bo` | từ chối, kêu đúng lý do |

### H-3. `ghiNhanXuLy` trả `null` cho CẢ hai tình huống khác hẳn nhau

Trả `null` cho cả *"không tìm thấy"* lẫn *"bị chốt BC chặn"*, nên người dùng bị báo
**"Không tìm thấy issue"** trong khi issue nằm sờ sờ trên màn. Nay phân biệt: **404 vs 403**.
*Báo sai lý do còn tệ hơn không báo — người ta đi tìm nhầm chỗ.*

### H-4. Nút bị chặn bị ẨN — trái luật cứng "hiện MỜ, không ẩn"

Mọi nút đều bọc `{choPhepGhi && …}`. Nay nút **vẫn vẽ ra**, chỉ `disabled` +
`opacity 0.4` + tooltip nói VÌ SAO.

**Đo thật trên trình duyệt** (`anh-chup/issue-nut-mo.png`):

| Thẻ | Nút | opacity | tooltip |
|---|---|---|---|
| của agent pháp lý | `disabled = true` | **0.4** | *"Issue này do Agent pháp lý sinh ra…"* |
| của chính mình | `disabled = false` | 1 | *"Duyệt xong đề xuất mới thành issue chính thức…"* |

### H-5. Chữ ký giao hộ ghi cứng "qua Agent tiến độ"

`chuKyGiaoHo` nối chuỗi này vào **MÔ TẢ VIỆC TRÊN BASE THẬT** — không phải chữ trên
màn hình. Ghi sai là **sai vĩnh viễn trên bản ghi Base**. Thêm
`src/lib/nhan-dien-agent.ts` làm MỘT định nghĩa; sửa luôn **12 tiêu đề trang** và trang
đăng nhập còn mang tên *"SCI Tiến độ"*.

### Một hàm cho hai phía

Thêm `src/lib/canh-bao/quyen-issue.ts`: **tầng dữ liệu** gọi để chặn thật, **màn hình**
gọi để làm mờ nút. Một hàm nên không thể xảy ra cảnh *"nút sáng mà ghi không được"*
hay tệ hơn *"nút mờ nhưng gọi thẳng API vẫn ghi được"*.

---

## I. Chỗ CHƯA làm — nói thẳng, không giấu

| # | Việc | Vì sao chưa |
|---|---|---|
| C-01 | **Ba luật sinh issue riêng của Agent Base** (PLAN mục 11 — *găng chưa ai nhận* · *quá hạn ≥ N ngày có gắn mã* · *đề xuất tắc ≥ N ngày*) chưa nối vào bộ sinh. Ba tab máy sinh vẫn chạy luật kế thừa của agent tiến độ. | **Cả ba đều cần gắn được mã WBS cho việc Base**, mà đo được là **0/2830**. Nối vào lúc này thì luật 3 sẽ mở issue đỏ cho MỌI nút găng — một sổ ngập cảnh báo sai. Đã hiện hộp nói thẳng điều này ngay trên màn Issue, không để nhãn tab hứa thứ máy chưa sinh. Mở khoá được ngay khi có người gắn thẻ WBS lên Base. |
| C-02 | Bộ sinh cảnh báo chạy **đồng bộ**; ba luật của Base cần gọi Base API + hỏi agent tiến độ (bất đồng bộ). | Phải đổi `chaySinhCanhBao` sang async — việc thật, nhưng chưa làm vì C-01 chặn trước. |
| C-03 | `base.quy_trinh_dang_tac` trả **0 hồ sơ tắc**. | Là **câu trả lời đúng**, không phải thiếu dữ liệu: 6/6 đề xuất đã kết thúc. Sẽ tự có kết quả khi công ty mở đề xuất mới. |
| C-04 | Họ tên đầy đủ mới có **4/140** người. | Chờ **khoá Base Account**. HRM rỗng thật (`employees: []`), Wework không có `/user/list` (File Not Found). Không có nguồn nào khác. |
| C-05 | Bài nghiệm thu 9 (vòng gọi hai chiều) vẫn nợ như đợt trước. | Cần hai cổng MCP mới dựng được vòng gọi. |

## J. Việc cần bên khác làm

| # | Việc | Gửi ai |
|---|---|---|
| **T-05** | **Muốn Agent Base gắn được việc Base vào cây WBS thì phải GẮN THẺ trên Base.** Cách: mở việc trên Base → thêm thẻ dạng `wbs:7.5.4.6` (hoặc thẻ chỉ chứa đúng mã `7.5.4.6`) → vào *Cài đặt Agent Base → tab 3* gõ tên thẻ (`wbs`) → Lưu. Để tùy chọn, không ép cả công ty; ai không gắn thì agent vẫn đoán như cũ. **Không gắn thì mọi câu trả lời "đầu việc này đã có ai được giao chưa" đều vô nghĩa.** | Mr. Đại quyết |
| **T-06** | Nhập **khoá Base Account** để có họ tên · chức vụ · ban · công ty (tầng 2 danh bạ). Không có thì mọi báo cáo vẫn hiện `cuongnv` thay vì tên người. | Mr. Đại |
| **T-07** | Bộ code agent tiến độ dính **cùng ba lỗi H-1 · H-2 · H-3** (cùng gốc `so-issue.ts`, `model.ts`). Bên đó `AGENT_NAY = "tien-do"` là ĐÚNG, nhưng **H-2 (duyệt/bác bỏ thiếu chốt chặn)** và **H-3 (`null` lẫn hai tình huống)** thì sai ở cả hai bản. Báo để họ tự sửa — **không tự đụng vào bộ bàn giao.** | Nhóm agent tiến độ |

## K. Công cụ đo mới thêm

`scripts/khao-sat-truong-tuy-bien.mjs` — gọi thẳng API Base (không qua `client.ts`,
để nhìn được gói JSON THÔ):

```
node scripts/khao-sat-truong-tuy-bien.mjs            # soi sâu KG 111663
node scripts/khao-sat-truong-tuy-bien.mjs 110481     # soi một KG bất kỳ
node scripts/khao-sat-truong-tuy-bien.mjs --toan-bo  # quét CẢ 80 KG dự án
```

Chế độ `--toan-bo` in bảng từng không gian + tổng + danh sách thẻ đang dùng.
**Chạy lại bất cứ lúc nào để biết đã có ai gắn thẻ WBS chưa.**
