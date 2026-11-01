# Sổ cái SCI công việc cho agent khác — cổng `socai.*`

Tài liệu cho agent tiến độ, agent main, agent báo cáo… đọc **sổ cái công việc** của SCI công việc.
Chỉ đọc. Tên trường **cố định** — agent nào đọc cũng hiểu giống nhau. Đổi tên trường là đổi hợp đồng
(phải báo mọi agent và tăng `phien_ban_hop_dong`).

- Sổ cái = chỉ việc **đang mở**. Việc hoàn thành (mọi phần việc bấm Kết thúc) hoặc bị đóng thì tự rời sổ cái,
  vẫn tra được bằng `lichsu.tra_cuu_viec`.
- Việc không có ngày là **luôn mở** (`luon_mo: true`): không bao giờ quá hạn.
- Cùng một việc báo ở nhiều nơi → sổ cái giữ MỘT dòng theo **quy tắc đè** (mặc định: cấp cao đè cấp thấp,
  cùng cấp thì kỳ sau đè kỳ trước, quyết định TGĐ Form 0 đè tất cả). Bản bị đè không mất: `da_de`.

## 1. Khóa và cách gọi

Quản trị viên (quyền «Cấp khóa cho agent đọc sổ cái») cấp khóa ở **/quan-tri/khoa-agent**, chọn công cụ được gọi.
Khóa gốc dạng `dfk_…` chỉ hiện **một lần**; SCI công việc chỉ giữ sha256. Thu hồi là bị từ chối ngay.

Mọi yêu cầu gửi header:

```
Authorization: Bearer dfk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Có **ba cửa**, cùng dữ liệu, cùng khóa:

| Cửa | Địa chỉ | Dùng khi |
|---|---|---|
| Cổng MCP kiểu SCI | `POST /api/mcp/socai` body `{ cong_cu, tham_so }` | Agent SCI đang gọi `/api/mcp/tiendo` kiểu này (HOP-DONG-KET-NOI) |
| MCP chuẩn JSON-RPC 2.0 | `POST /api/mcp/socai` body `{ jsonrpc:"2.0", method, params }` | Client MCP chuẩn (initialize · tools/list · tools/call · ping) |
| REST chỉ đọc | `GET /api/v1/so-cai?…` · `GET /api/v1/so-cai/<mã việc>` | Script, Excel Power Query, cron |

Khóa sai / thiếu → HTTP 401. Khóa không được gọi công cụ đó → `KHONG_CO_QUYEN` (REST: 403).
Mẫu công cụ trong khóa: tên đầy đủ (`socai.chi_tiet_viec`) hoặc cả nhóm (`socai.*`, `lichsu.*`).
`nang_luc`, `suc_khoe` luôn gọi được với khóa hợp lệ; `tim_theo_ma` cần quyền `socai.chi_tiet_viec`.

## 2. Công cụ

| Công cụ | Tham số | Trả về (`du_lieu`) |
|---|---|---|
| `nang_luc` | — | danh mục công cụ, phiên bản hợp đồng |
| `suc_khoe` | — | `{ ok, phien_ban_hop_dong, thoi_diem }` |
| `tim_theo_ma` | `ma` | một `DongSoCaiAgent` (kèm `qua_trinh`) |
| `socai.danh_sach_viec` | `don_vi?` `du_an?` `nguoi?` `luon_mo?` `canh_bao?` (`qua_han`\|`sap_den_han`) `tu_khoa?` `gioi_han?` (≤100) | `{ tong, qua_han, sap_den_han, viec: DongSoCaiAgent[] }` (không kèm `qua_trinh` cho gọn) |
| `socai.chi_tiet_viec` | `ma_viec` | một `DongSoCaiAgent` đầy đủ `qua_trinh` |
| `socai.viec_cua_don_vi` | `don_vi` hoặc `nguoi` (bắt buộc một trong hai), `gioi_han?` | như `danh_sach_viec` |
| `lichsu.tra_cuu_viec` | `tu?` `den?` (yyyy-mm-dd) `don_vi?` `du_an?` `nguoi?` `tu_khoa?` `ma_viec?` `gioi_han?` | `{ tong, viec: DongSoCaiAgent[] }` — việc đã rời sổ cái |

`don_vi` nhận mã (`ban-tgd`, `p-dtpc`, `p-ktvh`, `p-hcth`, `p-tckt`, `sci-pmc`, `sci-enc`, `bqlda-qt`, `nm-namxe`)
hoặc tên gõ tự do (`SCI E&C`, `P.ĐT&PC`, `BQLDA Quảng Trị`, `Nậm Xe`). `nguoi` nhận email hoặc họ tên.
Trần 100 dòng mỗi câu trả lời; vượt trần có `canh_bao`.

## 3. Khuôn trả lời (HOP-DONG-KET-NOI mục 3)

Thành công:

```json
{
  "ok": true,
  "du_lieu": { "...": "..." },
  "nguon": [
    { "loai": "so-cai", "ma": "docflow.so_cai", "file_goc": "CSDL scidocflow · view docflow.so_cai", "thoi_diem_trich": "2026-09-24T03:00:00.000Z" },
    { "loai": "cong-viec", "ma": "CV-2026-0412", "file_goc": "Form 0 · tuần 30 · Ban Tổng giám đốc", "vi_tri": "/cong-viec/CV-2026-0412", "trang_thai": "dang_mo" }
  ],
  "thoi_diem_tra_loi": "2026-09-24T03:00:00.120Z",
  "canh_bao": []
}
```

Thất bại (kiểu SCI luôn HTTP 200 trừ lỗi khóa):

```json
{ "ok": false, "ma_loi": "KHONG_CO_DU_LIEU", "thong_diep": "Không có việc mã CV-2026-9999 trong SCI công việc." }
```

| `ma_loi` | Nghĩa |
|---|---|
| `KHONG_CO_DU_LIEU` | Không có việc / người như yêu cầu |
| `KHONG_HIEU_YEU_CAU` | Thiếu hoặc sai tham số (có gợi ý mã đơn vị hợp lệ) |
| `KHONG_CO_QUYEN` | Khóa sai, đã thu hồi, hoặc không được gọi công cụ này |
| `AGENT_KHONG_SAN_SANG` | Phần sổ cái của SCI công việc chưa sẵn sàng |
| `LOI_NOI_BO` | Lỗi khác phía SCI công việc |

## 4. Một dòng sổ cái — `DongSoCaiAgent` (tên trường cố định)

```json
{
  "ma_viec": "CV-2026-0412",
  "ten_viec": "Chi trả GPMB Trụ T11",
  "du_an": "ĐG Hướng Việt",
  "nguon_hien_hanh": { "bao_cao": "Form 0 · tuần 30", "don_vi": "Ban Tổng giám đốc", "cap": 1 },
  "da_de": ["BQLDA Quảng Trị · Form 7 · tuần 28", "BQLDA Quảng Trị · Form 7 · tuần 29"],
  "luon_mo": false,
  "bat_dau": "2026-07-28",
  "ket_thuc": "2026-08-05",
  "phan_viec": [
    { "phu_trach": "BQLDA Quảng Trị", "noi_dung": "Thỏa thuận với 3 hộ", "trang_thai": "da_ket_thuc", "ket_thuc": "2026-08-02" },
    { "phu_trach": "Phòng Đầu tư và Pháp chế", "noi_dung": "Công văn gửi UBND huyện Hướng Hóa", "trang_thai": "dang_lam", "ket_thuc": "2026-08-05" }
  ],
  "tien_do": "1/2",
  "canh_bao": "sap_den_han",
  "trang_thai": "dang_mo",
  "qua_trinh": [
    { "luc": "2026-07-21 10:05", "su_kien": "vao_so_cai", "tu": "Form 7 · BQLDA Quảng Trị", "nguoi": "Lý Thị Nga" },
    { "luc": "2026-07-28 16:30", "su_kien": "bi_de", "tu": "Form 0 · Ban Tổng giám đốc", "nguoi": "Tổng Giám đốc" }
  ]
}
```

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `ma_viec` | string | Mã việc, dạng theo cấu hình (mặc định `CV-{năm}-{số 4}`). Báo cáo sau ghi lại mã này là chắc chắn trùng. |
| `ten_viec` | string | Tên công việc |
| `du_an` | string \| null | Dự án (nếu báo cáo ghi) |
| `nguon_hien_hanh` | object \| null | Bản đang được dùng: `bao_cao` (mẫu · kỳ), `don_vi` (tên đơn vị gửi), `cap` (1 Ban TGĐ · 2 phòng · 3 đơn vị · 9 bên ngoài). `null` = việc giao tay. |
| `da_de` | string[] | Các bản đã bị đè (vẫn còn trong lịch sử SCI công việc) |
| `luon_mo` | boolean | `true` = không có ngày, không bao giờ quá hạn |
| `bat_dau`, `ket_thuc` | `yyyy-mm-dd` \| null | Ngày của cả việc |
| `phan_viec[]` | array | Mỗi người/đơn vị một phần: `phu_trach` (tên), `noi_dung`, `trang_thai` (`dang_lam` \| `da_ket_thuc`), `ket_thuc` (hạn riêng của phần, có thể null) |
| `tien_do` | string | Số phần đã kết thúc / tổng, vd `"1/2"` |
| `canh_bao` | `"qua_han"` \| `"sap_den_han"` \| null | Theo cấu hình «sắp đến hạn» (mặc định 3 ngày) |
| `trang_thai` | `"dang_mo"` \| `"hoan_thanh"` \| `"da_dong"` | `dang_mo` = còn trong sổ cái |
| `qua_trinh[]` | array | Dòng thời gian: `luc` (`yyyy-mm-dd hh:mm` giờ VN), `su_kien` (mã hành động lịch sử: `vao_so_cai`, `bi_de`, `giao_viec`, `gia_han`, `doi_nguoi`, `ket_thuc_phan_viec`, `cong_viec_hoan_thanh`, `dong_viec`…), `tu` (nguồn nếu có), `nguoi` (tên người làm). Danh sách chỉ có đủ ở `chi_tiet_viec` / `tim_theo_ma`. |

## 5. Ví dụ gọi

Kiểu SCI (như cổng tiến độ):

```bash
curl -s -X POST https://docflow.scigroup.vn/api/mcp/socai \
  -H "Authorization: Bearer $DOCFLOW_KHOA" -H "Content-Type: application/json" \
  -d '{"cong_cu":"socai.danh_sach_viec","tham_so":{"don_vi":"SCI E&C","canh_bao":"sap_den_han"},"agent_goi":"tiendo","ly_do_goi":"Bảng điều hành tuần 39"}'
```

MCP chuẩn (JSON-RPC):

```bash
curl -s -X POST https://docflow.scigroup.vn/api/mcp/socai \
  -H "Authorization: Bearer $DOCFLOW_KHOA" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"socai.chi_tiet_viec","arguments":{"ma_viec":"CV-2026-0412"}}}'
```

`result.structuredContent` là đúng khuôn mục 3; `result.content[0].text` là chuỗi JSON của nó; `isError` = `!ok`.
`tools/list` chỉ liệt kê công cụ khóa được phép gọi.

REST:

```bash
curl -s "https://docflow.scigroup.vn/api/v1/so-cai?don_vi=p-dtpc&luon_mo=false" -H "Authorization: Bearer $DOCFLOW_KHOA"
curl -s "https://docflow.scigroup.vn/api/v1/so-cai/CV-2026-0412" -H "Authorization: Bearer $DOCFLOW_KHOA"
```

Node (agent SCI):

```ts
const r = await fetch(`${DOCFLOW}/api/mcp/socai`, {
  method: "POST",
  headers: { authorization: `Bearer ${process.env.DOCFLOW_KHOA}`, "content-type": "application/json" },
  body: JSON.stringify({ cong_cu: "socai.viec_cua_don_vi", tham_so: { don_vi: "bqlda-qt" }, agent_goi: "tiendo", ly_do_goi: "Đồng bộ việc BQLDA" }),
});
const kq = await r.json(); // kq.ok ? kq.du_lieu.viec : kq.ma_loi
```

## 6. Ghi nhận

- Mỗi khóa mỗi ngày: số lượt và công cụ đã gọi (màn /quan-tri/khoa-agent).
- Lịch sử SCI công việc (không sửa xóa được) ghi: cấp khóa, thu hồi khóa, và **lượt đọc đầu tiên mỗi ngày** của mỗi khóa
  (hành động `agent_doc`, người = `agent:<mã khóa>`) — không ghi từng lượt để lịch sử khỏi dày.
