-- 82 — MỖI VIỆC MỘT LÃNH ĐẠO PHỐI HỢP (Mr. Đại chốt 03/10/2026): việc vào sổ cái luôn có MỘT đơn vị chủ trì (giao bởi trưởng
-- đơn vị lập báo cáo) và MỘT lãnh đạo phối hợp, chọn theo phân công Ban lãnh đạo (ô chức năng nhiệm vụ — db/81).
--   · 🤖 AI chọn, gắn thẳng thành phần việc phối hợp (đơn vị chức danh lãnh đạo); người có quyền Sửa việc đổi được.
--   · Bảng này = sổ "việc đã được xét": có dòng thì vòng nền không xét lại — người bỏ lãnh đạo đi thì máy không gắn lại.
--   · nguon: 'ai' (AI chọn) · 'co_san' (việc đã có lãnh đạo phối hợp) · 'chu_tri_la_lanh_dao' (lãnh đạo đang chủ trì, không gắn thêm)
--   · Bản mới của báo cáo đặt lại phần việc thì KHÔNG bỏ lãnh đạo do máy gắn (datPhanViec).
CREATE TABLE IF NOT EXISTS docflow.lanh_dao_phoi_hop (
  cong_viec_id text PRIMARY KEY REFERENCES docflow.cong_viec(id),
  don_vi_id    text REFERENCES identity.don_vi(id),
  ly_do        text,
  nguon        text NOT NULL,
  luc          timestamptz NOT NULL DEFAULT now()
);
