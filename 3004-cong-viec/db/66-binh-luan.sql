-- ============================================================
-- 66-binh-luan.sql — BÌNH LUẬN VIỆC (giao diện căn phòng Đợt 2, 28/09/2026)
-- Ai xem được việc đều viết được; gõ @ để nhắc tên người. Người nhận tin (luật demo, Mr. Đại chốt 27/09):
-- người làm + người giao + người đã bình luận + người được @ (trừ người viết). Chỉ ghi thêm, không sửa/xoá.
-- ============================================================
CREATE TABLE IF NOT EXISTS docflow.binh_luan (
  id            bigserial PRIMARY KEY,
  cong_viec_id  text NOT NULL REFERENCES docflow.cong_viec(id),
  nguoi         text NOT NULL,                 -- nguoi_dung.id người viết
  noi_dung      text NOT NULL,
  nhac          jsonb NOT NULL DEFAULT '[]',   -- id người được @
  luc           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS binh_luan_cv ON docflow.binh_luan(cong_viec_id, id);
