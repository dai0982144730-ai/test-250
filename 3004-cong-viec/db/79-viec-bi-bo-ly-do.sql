-- 79 — Dòng việc KHÔNG vào sổ cái có lý do (Mr. Đại chốt 02/10/2026, lỗi CV-2026-0098 "Thi công móng trụ T5–T8"):
-- ngoài việc người nộp bấm Bỏ (db/71), còn dòng báo ĐÃ XONG mà sổ cái chưa từng có việc đó ("xong rồi thì không vào sổ"),
-- và dòng người nộp chọn "Không vào sổ". Ghi lại để Rà soát sổ cái không coi là "thiếu" rồi tự bổ sung ngược lại.
ALTER TABLE docflow.viec_bi_bo ADD COLUMN IF NOT EXISTS ly_do text;
