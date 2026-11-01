// Thư mục dữ liệu RIÊNG cho bài test khai dự án (ghi projects.json) — import ĐẦU TIÊN, trước projects.ts
// (projects.ts chốt thư mục lúc nạp). Không ghi lên bản sao dùng chung của các file test khác.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const THU_MUC_DU_AN_TEST = path.join(os.tmpdir(), "sci-du-an-test", `${process.pid}-${Date.now()}`);
fs.mkdirSync(THU_MUC_DU_AN_TEST, { recursive: true });
const luc = new Date().toISOString();
fs.writeFileSync(
  path.join(THU_MUC_DU_AN_TEST, "projects.json"),
  JSON.stringify({
    projects: [
      { id: "nam-khian-1", name: "Nam Khian 1", ma: "NK1", nhom: "sci", tenKhac: ["TĐ Nam Khiên 1"], createdAt: luc, createdBy: "test" },
      { id: "nam-mo-1", name: "Nậm Mô 1", ma: "NM1", nhom: "khac", createdAt: luc, createdBy: "test" },
    ],
  }),
  "utf8",
);
process.env.THU_MUC_DU_LIEU = THU_MUC_DU_AN_TEST;
