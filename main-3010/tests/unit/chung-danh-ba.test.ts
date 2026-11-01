// DANH BẠ BASE — lib/chung/danh-ba.ts (VIEC-CUA-TOI-v2.0 mục 3.4)
// Kho thật nằm data/viec/danh-ba-base.json — bài kiểm sao lưu rồi trả lại.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { duongDanDuLieu } from "@/lib/goc-du-lieu";
import { gomTuTask, timNguoi, traNhieu, capNhatHoTen } from "@/lib/chung/danh-ba";

const FILE = duongDanDuLieu("viec", "danh-ba-base.json");
let banGoc: string | null = null;

describe("danh bạ Base", () => {
  beforeAll(() => {
    banGoc = fs.existsSync(FILE) ? fs.readFileSync(FILE, "utf8") : null;
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, "{}\n", "utf8");
  });
  afterAll(() => {
    if (banGoc === null) fs.rmSync(FILE, { force: true });
    else fs.writeFileSync(FILE, banGoc, "utf8");
  });

  it("gom từ task thô (mẫu đo thật): username+avatar, owners, creator", () => {
    gomTuTask([
      {
        username: "thinhhp",
        avatar: "https://cdn/x.png",
        creator_username: "dainc",
        owners: [{ username: "thinhhp", gavatar: "https://cdn/x2.png" }],
        followers: [{ username: "thanhnv", gavatar: "https://cdn/t.png" }],
      },
    ]);
    const m = traNhieu(["thinhhp", "dainc", "thanhnv"]);
    expect(Object.keys(m).sort()).toEqual(["dainc", "thanhnv", "thinhhp"]);
    expect(m.thanhnv.avatar).toBe("https://cdn/t.png");
  });

  it("tầng 2 đổ họ tên → tìm không dấu 'thinh' ra Hoàng Phú Thịnh", () => {
    capNhatHoTen([{ username: "thinhhp", tenDayDu: "Hoàng Phú Thịnh", chucDanh: "Chuyên viên P.ĐT&PC" }]);
    const kq = timNguoi("thinh");
    expect(kq.some((n) => n.username === "thinhhp" && n.tenDayDu === "Hoàng Phú Thịnh")).toBe(true);
  });

  it("tìm theo đầu username thắng khớp giữa; rỗng trả tối đa 8", () => {
    expect(timNguoi("thanh")[0].username).toBe("thanhnv");
    expect(timNguoi("").length).toBeLessThanOrEqual(8);
  });
});
