-- ============================================================
-- 75-bao-cao-tuan.sql — MENU "BÁO CÁO TUẦN" (Mr. Đại duyệt demo 30/09/2026 — 0 Tài liệu thiết kế/demo-bao-cao-tuan-3004.html)
-- · do_kho_viec: 🤖 AI chấm độ khó mỗi việc MỘT lần khi việc vào sổ (thang 1·2·4·8·13, kèm lý do); Ban lãnh đạo sửa được,
--   người sửa thắng AI và AI không chấm lại. Chỉ Ban lãnh đạo xem được điểm từng việc.
-- · bao_cao_tuan: mỗi tuần MỘT bản — số liệu do CODE tính (chụp lại lúc viết để xem tuần cũ đúng số lúc đó) + lời AI viết.
-- · bao_cao_tuan_thao_tac: đã bấm Giao việc / Nhắc từ báo cáo (nút đổi thành "Đã giao" / "Đã nhắc", không bấm lại).
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.do_kho_viec (
  cong_viec_id  text PRIMARY KEY REFERENCES docflow.cong_viec(id),
  diem          smallint NOT NULL CHECK (diem IN (1, 2, 4, 8, 13)),
  ly_do         text,                   -- lý do AI nêu (người sửa thì giữ lý do cũ để đối chiếu)
  nguon         text NOT NULL,          -- 'ai' | 'nguoi'
  nguoi_sua     text,
  luc           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS docflow.bao_cao_tuan (
  id            text PRIMARY KEY,       -- ngày đầu tuần yyyy-mm-dd (thứ Hai)
  tuan_so       integer NOT NULL,
  tuan_tu       date NOT NULL,
  tuan_den      date NOT NULL,
  trang_thai    text NOT NULL,          -- dang_viet | xong | loi
  ly_do_viet    text,                   -- 'cap1_nop' | 'den_gio' | 'viet_lai'
  cap1_da_nop   boolean NOT NULL DEFAULT false,
  model         text,
  so_lieu       jsonb,                  -- số do code tính (chụp lúc viết)
  ai            jsonb,                  -- lời AI viết (đã qua lưới kiểm của code)
  canh_bao      jsonb NOT NULL DEFAULT '[]',
  loi           text,
  bat_dau_luc   timestamptz NOT NULL DEFAULT now(),
  xong_luc      timestamptz,
  thoi_gian_ms  integer
);

CREATE TABLE IF NOT EXISTS docflow.bao_cao_tuan_thao_tac (
  bao_cao_id    text NOT NULL,
  cong_viec_id  text NOT NULL,          -- không khoá ngoại: việc hết hạn lưu bị xoá thì dòng này vẫn giữ để đọc tuần cũ
  loai          text NOT NULL,          -- 'giao' | 'nhac'
  nguoi         text NOT NULL,
  ket_qua       text,                   -- giao: mã việc mới
  luc           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bao_cao_id, cong_viec_id, loai)
);
