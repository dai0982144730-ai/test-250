-- 71 — VIỆC NGƯỜI NỘP BỎ KHI DUYỆT (Mr. Đại chốt 28/09/2026, nộp báo cáo Đợt B — bước "Duyệt việc").
-- Báo cáo vẫn gửi nguyên văn; việc bị bỏ KHÔNG vào sổ cái. Ghi lại ai bỏ, lúc nào — và để Rà soát sổ cái
-- (ra-soat.ts) KHÔNG coi là "thiếu" rồi tự bổ sung ngược lại.
CREATE TABLE IF NOT EXISTS docflow.viec_bi_bo (
  tai_lieu_id text NOT NULL,
  phien_ban int NOT NULL,
  nguon_bang text NOT NULL,
  dong_so int NOT NULL,
  y_so int NOT NULL DEFAULT 1,
  ten text,
  nguoi text,
  luc timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tai_lieu_id, phien_ban, nguon_bang, dong_so, y_so)
);
