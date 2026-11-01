# SCI Tiến độ — Dashboard AI quản lý tiến độ

## Gác 5 agent — tự bật lại khi bật máy (J13, 23/09/2026)

1. Bấm Start → gõ **Task Scheduler** → **Create Task…** → tab General đặt tên `SCI gác 5 agent`, tick *Run only when user is logged on*.
2. Tab **Triggers** → New → *Begin the task:* **At log on** → OK. Tab **Actions** → New → *Program:* `D:\3 SETUP\1 AI\SCI Tiến độ\GAC-5-AGENT.bat` → OK.
3. Thử trước không bật gì: `GAC-5-AGENT.bat -ThuMotLuot` (in bảng 5 cổng). Sổ sự kiện: `data/gac-5-agent.jsonl`, xem ở màn **Quan sát các agent**. Telegram: thêm `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` vào `.env.local` của Main.


Dashboard quản lý tiến độ dự án **Nhà máy Điện gió Hướng Phùng 1 — Quảng Trị**, xây theo
`../Tailieu/KIEN-TRUC-HE-THONG.md` (v6.1) và kế hoạch `../kehoach/KE-HOACH.md`.

## Chạy thử

```bash
npm install
npm run dev
# mở http://localhost:3000
```

## Trạng thái Phase 1

- 12 tab đầy đủ giao diện, chạy bằng **seed data tuần 28/2026** (`src/lib/seed/`) —
  đã chuẩn hóa nhất quán từ prototype `../Tailieu/index.html`.
- Công thức tính (KPI, S-Curve, chênh lệch, phân loại cảnh báo) theo Section 12
  tài liệu kiến trúc, tập trung tại `src/lib/calculations.ts`.
- Chưa nối API thật. Phase 2: Smartsheet API + Supabase (realtime + auth) + Google Drive
  — chỉ cần thay nguồn dữ liệu, giữ nguyên interface trong `src/lib/types.ts`.

## Cấu trúc

```
src/app/            12 trang (Tổng quan, Gantt, Tiến độ chi tiết, Năng suất, Cảnh báo,
                    Kiểm tra chéo, BC Kỹ thuật, BC Lãnh đạo, Nhà thầu, Thời tiết, Hình ảnh, Cài đặt)
src/components/     layout/ (Sidebar, Header) · common/ (KPICard, Pill, SectionCard...) · tabs/<tab>/
src/lib/            types.ts · calculations.ts · format.ts · seed/
```
