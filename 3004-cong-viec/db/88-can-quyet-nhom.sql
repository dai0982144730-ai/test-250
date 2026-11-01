-- 88 — Nhóm của dòng "Cần BLĐ ra quyết định" (Mr. Đại chốt 20/10/2026, mục 6 bản 2): Trước khởi công · Thực thi, kiểm soát · ENC đề xuất · Nhóm khác (mã truoc_khoi_cong · thuc_thi · enc · khac).
-- Code xếp trước (lib/bao-cao-tuan/can-quyet-nhom.ts) — KHÔNG lưu ở đây. Bảng chỉ giữ dòng 🤖 AI xếp (code không chắc) và dòng NGƯỜI
-- bấm chuyển nhóm; người sửa THẮNG AI (AI không ghi đè dòng boi <> 'ai'). khoa = khoá dòng kiến nghị (chuanHoa, như kien_nghi_viec).
CREATE TABLE IF NOT EXISTS docflow.can_quyet_nhom (
  khoa text PRIMARY KEY,
  nhom text NOT NULL,
  -- 'ai' hoặc mã người đã chuyển nhóm
  boi text NOT NULL,
  ly_do text,
  luc timestamptz NOT NULL DEFAULT now()
);
