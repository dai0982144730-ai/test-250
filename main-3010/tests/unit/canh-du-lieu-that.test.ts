// ============================================================
// BÀI CANH: KHÔNG BỘ TEST NÀO ĐƯỢC ĐỤNG VÀO `data/` THẬT
//
// Nền: bộ test cũ ghi thẳng vào `data/` rồi khôi phục ở afterAll — đặt cược
// vào MỘT lần khôi phục. Đứt giữa chừng (Ctrl+C, máy treo, bài khác ném lỗi
// trước) là dữ liệu thật nằm dở. Một bộ e2e cũ từng xoá mất 5.670 dòng
// schedule.json của cả 4 agent, phải khôi phục từ kho mã.
//
// Bài này đỏ NGAY khi có ai thêm một tệp test kiểu cũ. Muốn đọc-ghi dữ liệu
// trong test thì đi qua duongDanDuLieu()/gocDuLieu() của src/lib/goc-du-lieu.ts.
// ============================================================

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu, duongDanDuLieu } from "@/lib/goc-du-lieu";

const GOC_REPO = process.cwd();
const THU_MUC_TEST = path.join(GOC_REPO, "tests");
const DATA_THAT = path.join(GOC_REPO, "data");

/**
 * NGOẠI LỆ CÓ CHỦ Ý — mỗi mục phải nói rõ vì sao.
 *
 * ⭐ 24/09: bỏ ngoại lệ `nap-du-lieu-test.test.ts` — công cụ nạp BC ngày/tuần
 * vào dự án HV CHÉP trong Main; bản chép bộ tính tiến độ đã gỡ (chốt Mr. Đại
 * 24/09), công cụ đó xoá theo. Nạp dữ liệu test làm ở Agent tiến độ.
 */
const NGOAI_LE: Record<string, string> = {
  // Hai tệp hạ tầng dưới đây PHẢI nhắc tới `data/` thật: một cái chép nó đi,
  // một cái (chính bài này) so xem cửa có còn trỏ vào nó không. Cả hai chỉ ĐỌC
  // tên thư mục, không có lệnh ghi nào vào đó.
  "ho-tro/thu-muc-du-lieu.ts": "hạ tầng: nơi khai `data/` thật để chép sang bản sao",
  "unit/canh-du-lieu-that.test.ts": "chính bài canh này — phải nêu tên `data/` mới so được",
};

function moiTepTest(thuMuc: string, goc = thuMuc): string[] {
  const ra: string[] = [];
  for (const m of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    const p = path.join(thuMuc, m.name);
    if (m.isDirectory()) {
      if (m.name === "node_modules" || m.name === "fixtures") continue;
      ra.push(...moiTepTest(p, goc));
    } else if (/\.(ts|mts|mjs)$/.test(m.name)) {
      ra.push(path.relative(goc, p).split(path.sep).join("/"));
    }
  }
  return ra;
}

/** Dấu hiệu tự dựng đường dẫn dữ liệu từ gốc repo thay vì đi qua cửa chung. */
const DAU_HIEU = [
  /process\.cwd\(\)\s*,\s*\r?\n?\s*"data"/,
  /process\.cwd\(\)\s*,\s*'data'/,
  /path\.resolve\(\s*__dirname\s*,[^)]*"\.\.\/data"/,
];

describe("Bộ test không được đụng vào data/ thật", () => {
  const tep = moiTepTest(THU_MUC_TEST);

  it("quét được tệp để canh — danh sách không rỗng (kẻo bài này xanh giả)", () => {
    expect(tep.length).toBeGreaterThan(20);
  });

  it("KHÔNG tệp test nào tự ghép đường dẫn tới data/ của repo", () => {
    const pham: string[] = [];
    for (const t of tep) {
      if (NGOAI_LE[t] !== undefined) continue;
      const noi = fs.readFileSync(path.join(THU_MUC_TEST, t), "utf8");
      if (DAU_HIEU.some((re) => re.test(noi))) pham.push(t);
    }
    expect(
      pham,
      `Các tệp sau trỏ vào data/ thật. Dùng duongDanDuLieu() của ` +
        `@/lib/goc-du-lieu thay vì path.join(process.cwd(), "data", …):\n` +
        pham.map((t) => "  tests/" + t).join("\n")
    ).toEqual([]);
  });

  it("mọi ngoại lệ đều còn tồn tại và có ghi lý do — không để sót mục chết", () => {
    for (const [t, lyDo] of Object.entries(NGOAI_LE)) {
      expect(fs.existsSync(path.join(THU_MUC_TEST, t)), `ngoại lệ trỏ vào tệp không có: ${t}`).toBe(true);
      expect(lyDo.length).toBeGreaterThan(20);
    }
  });
});

describe("Cửa dữ liệu đang trỏ ra khỏi repo khi chạy test", () => {
  it("THU_MUC_DU_LIEU đã được đặt (vitest.config.ts + globalSetup)", () => {
    expect(process.env.THU_MUC_DU_LIEU ?? "").not.toBe("");
  });

  it("gocDuLieu() KHÔNG phải data/ của repo", () => {
    expect(path.resolve(gocDuLieu())).not.toBe(path.resolve(DATA_THAT));
  });

  it("bản sao có thật và ghi được — ghi rồi xoá không đụng tới bản thật", () => {
    const p = duongDanDuLieu("_bai-canh-ghi-thu.tmp");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, "thử", "utf8");
    expect(fs.existsSync(p)).toBe(true);
    expect(fs.existsSync(path.join(DATA_THAT, "_bai-canh-ghi-thu.tmp"))).toBe(false);
    fs.rmSync(p, { force: true });
  });

  it("src/ cũng không còn chỗ nào tự ghép data/ — cửa vẫn là cửa duy nhất", () => {
    const src = path.join(GOC_REPO, "src");
    const pham: string[] = [];
    const di = (d: string): void => {
      for (const m of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, m.name);
        if (m.isDirectory()) { di(p); continue; }
        if (!/\.(ts|tsx)$/.test(m.name)) continue;
        if (path.relative(GOC_REPO, p).split(path.sep).join("/") === "src/lib/goc-du-lieu.ts") continue;
        const noi = fs.readFileSync(p, "utf8");
        if (/process\.cwd\(\)\s*,\s*\r?\n?\s*"data"/.test(noi)) {
          pham.push(path.relative(GOC_REPO, p).split(path.sep).join("/"));
        }
      }
    };
    di(src);
    expect(pham, "Phải dùng gocDuLieu() của @/lib/goc-du-lieu:\n" + pham.join("\n")).toEqual([]);
  });
});
