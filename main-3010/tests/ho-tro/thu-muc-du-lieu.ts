// ============================================================
// THƯ MỤC DỮ LIỆU RIÊNG CHO MỖI LẦN CHẠY TEST
//
// Bộ test KHÔNG được đụng vào `data/` thật. Trước đây nó ghi thẳng rồi khôi
// phục ở afterAll — một canh bạc: Ctrl+C, máy treo, hay một bài khác ném lỗi
// trước là dữ liệu thật nằm dở. (Bộ e2e cũ từng xoá mất 5.670 dòng
// schedule.json của cả 4 agent, phải khôi phục từ kho mã.)
//
// CÁCH LÀM: mỗi lần `npm test` dựng một BẢN SAO của `data/` trong thư mục tạm
// của hệ điều hành, rồi đặt THU_MUC_DU_LIEU trỏ vào đó. Mọi lib đọc-ghi đều
// đi qua gocDuLieu() (src/lib/goc-du-lieu.ts) nên cả hệ quay sang bản sao.
// Ghi bao nhiêu cũng được — bản thật không suy suyển một byte.
//
// VÌ SAO CHÉP CHỨ KHÔNG DỰNG DỮ LIỆU GIẢ: nhiều bài kiểm CHẠY THẬT trên dự án
// HV (330 việc, S-curve, soát số liệu W35, mốc thực tế 7.2.3…). Dựng tay bộ
// dữ liệu đủ nghĩa cho chúng là bịa lại dữ liệu — bài kiểm sẽ mất đúng cái nó
// đang kiểm. Chép nguyên rồi ghi lên bản sao giữ y nguyên ý nghĩa từng phép
// kiểm, mà không có một lệnh ghi nào chạm vào bản thật.
//
// Lẫn giữa hai lần chạy song song: tên thư mục kèm PID.
// ============================================================

import os from "node:os";
import path from "node:path";

/** Bản sao `data/` của LẦN CHẠY NÀY — dựng ở globalSetup, xoá ở teardown. */
export const THU_MUC_DU_LIEU_TEST = path.join(
  os.tmpdir(),
  "sci-agent-du-lieu-test",
  String(process.pid)
);

/** `data/` THẬT trong repo — chỉ dùng để chép đi và để bài canh đối chiếu. */
export function thuMucDuLieuThat(): string {
  return path.join(process.cwd(), "data");
}
