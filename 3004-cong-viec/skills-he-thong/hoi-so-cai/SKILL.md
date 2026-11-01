---
name: hoi-so-cai
description: >-
  Trả lời câu hỏi về SỔ CÁI công việc SCI công việc: việc nào sắp trễ/quá hạn, đơn vị
  hay người nào còn mấy việc mở, một việc (CV-2026-0412) đang vướng ở phần nào,
  nguồn hiện hành và các bản đã bị đè, tuần trước xong những gì. Dùng khi hỏi
  "việc nào sắp trễ", "Phòng ĐT&PC còn mấy việc mở", "Hướng Việt đang vướng ở đâu".
---

# Hỏi đáp sổ cái (/hoi-so-cai)

## Sổ cái là gì (nói đúng thuật ngữ)

- **Sổ cái** chỉ ghi việc ĐANG MỞ. Việc hoàn thành (mọi phần việc bấm Kết thúc)
  hoặc bị đóng thì **tự rời sổ cái**, sang lịch sử (`lichsu.tra_cuu_viec`).
- Một **công việc** có nhiều **phần việc**; mỗi phần một người/đơn vị phụ trách,
  có ngày riêng hoặc không. **Tiến độ** = số phần đã kết thúc / tổng (vd 1/2).
- Việc **không có ngày = LUÔN MỞ**: không bao giờ quá hạn, đừng gọi là trễ.
- **Cảnh báo**: `qua_han` (qua ngày kết thúc chưa xong) · `sap_den_han` (trong số
  ngày cấu hình, mặc định 3 ngày).
- **Quy tắc đè**: cùng một việc báo ở nhiều nơi thì sổ cái giữ MỘT dòng — mặc định
  cấp cao đè cấp thấp (Ban TGĐ cấp 1 > 4 phòng cấp 2 > 4 đơn vị cấp 3), cùng cấp
  thì bản kỳ sau đè bản kỳ trước; quyết định TGĐ trong Form 0 đè tất cả. Bản bị
  đè không mất: `nguon_hien_hanh` + `so_ban_da_de` / `cac_nguon`.

## Công cụ

| Câu hỏi | Gọi |
|---|---|
| Sắp trễ / quá hạn | `socai.danh_sach_viec` với `canh_bao` = sap_den_han / qua_han (hỏi chung "sắp trễ" thì gọi không lọc cảnh báo rồi tự tách) |
| Đơn vị / người còn mấy việc | `socai.viec_cua_don_vi` (don_vi hoặc nguoi; "của tôi" → nguoi="toi") |
| Theo dự án ("Hướng Việt") | `socai.danh_sach_viec` với `du_an` hoặc `tu_khoa` |
| Một việc cụ thể | `socai.chi_tiet_viec` (ma_viec) — có quá trình và các bản bị đè |
| Đã xong | `lichsu.tra_cuu_viec` (tu, den) |
| Ai làm gì với việc này | `lichsu.doi_tuong` (loai=cong_viec) |

Tên đơn vị người dùng gõ tự do (SCI E&C, P.ĐT&PC, BQLDA, Nậm Xe…) — truyền nguyên văn.

## Khuôn trả lời

1. Câu đầu là con số: "SCI E&C có 2 việc đáng chú ý (1 quá hạn, 1 sắp đến hạn)."
2. Bảng: | Mã việc | Công việc | Phụ trách còn dở | Hạn | Tiến độ | — mã việc gắn link
   `[CV-2026-0412 <tên ngắn>](/so-do?viec=CV-2026-0412)`. Luôn mở ghi "Luôn mở".
3. "Vướng ở đâu" = phần việc CHƯA kết thúc + người phụ trách + hạn của phần đó.
4. Gợi ý tiếp theo: nhắc ai, việc nào nên gia hạn/đổi người (người giao việc làm trên
   màn Công việc), hoặc câu nên hỏi tiếp.

## Luật cứng

- Chỉ nói điều công cụ trả về. Phần bị ẩn vì quyền thì nói "ngoài phạm vi quyền của anh/chị".
- Công cụ báo sổ cái "đang được xây dựng" → nói thẳng, không đoán.
- Ngày dd/mm/yyyy.
