// Tệp AI tự tạo trong lúc chat (tải qua đường link): giữ 7 ngày kể từ lúc tạo rồi xoá, có tải hay chưa cũng xoá; KHÔNG xoá ngay khi tải.
// Mr. Đại chốt 12/10/2026 sau lần rà dữ liệu phình. Bài kiểm chạy trên thư mục dữ liệu THỬ của bộ kiểm, không đụng data/ thật.
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/providers", () => ({ runAI: vi.fn() }));

import { SO_NGAY_GIU_TEP_XUAT, donTepXuatQuaHan, timFileDaXuat } from "@/lib/tro-ly/xuat-theo-yeu-cau";
import { gocDuLieu } from "@/lib/goc-du-lieu";

const THU_MUC = path.join(gocDuLieu(), "xuat-chat");
const THU_MUC_TEP = THU_MUC;
// Lưới riêng của bài này: cửa dữ liệu chưa được trỏ sang sân thử thì dừng, không xoá gì (bài canh chung đã giữ cửa đó).
if (!(process.env.THU_MUC_DU_LIEU ?? "").trim()) {
  throw new Error("Bài kiểm chưa được trỏ sang thư mục dữ liệu thử — dừng, không xoá gì");
}
const TRA = (ma: string) => timFileDaXuat(ma);

function taoTep(ma: string, ten: string, tuoiNgay: number): string {
  const p = path.join(THU_MUC_TEP, `${ma}__${ten}`);
  fs.writeFileSync(p, "noi dung thu");
  const luc = new Date(Date.now() - tuoiNgay * 86_400_000);
  fs.utimesSync(p, luc, luc);
  return p;
}

describe("tệp AI tự tạo trong chat — giữ 7 ngày rồi xoá, tải xong KHÔNG xoá ngay (Mr. Đại chốt 12/10/2026)", () => {
  beforeEach(() => {
    fs.rmSync(THU_MUC, { recursive: true, force: true });
    fs.mkdirSync(THU_MUC_TEP, { recursive: true });
  });

  it("giữ đúng 7 ngày", () => {
    expect(SO_NGAY_GIU_TEP_XUAT).toBe(7);
  });

  it("tệp vừa tạo và tệp 6 ngày tuổi còn; tệp 8 ngày tuổi bị xoá", () => {
    const moi = taoTep("aaaaaa01", "moi.docx", 0);
    const sauNgay = taoTep("aaaaaa02", "sau-ngay.xlsx", 6);
    const tamNgay = taoTep("aaaaaa03", "tam-ngay.pdf", 8);
    expect(donTepXuatQuaHan()).toBe(1);
    expect([fs.existsSync(moi), fs.existsSync(sauNgay), fs.existsSync(tamNgay)]).toEqual([true, true, false]);
    expect(donTepXuatQuaHan()).toBe(0); // chạy lại không xoá thêm
  });

  it("tra tệp để tải nhiều lần: tệp vẫn còn — không xoá ngay khi tải", () => {
    const p = taoTep("bbbbbb01", "bao-cao.docx", 3);
    for (let i = 0; i < 3; i++) {
      const f = TRA("bbbbbb01");
      expect(f?.tenFile).toBe("bao-cao.docx");
      expect(fs.existsSync(f!.duongDan)).toBe(true);
    }
    expect(fs.existsSync(p)).toBe(true);
  });

  it("tra tệp đã quá 7 ngày: không còn, dù chưa ai tải", () => {
    const p = taoTep("cccccc01", "cu.docx", 7.5);
    expect(TRA("cccccc01")).toBeNull();
    expect(fs.existsSync(p)).toBe(false);
  });

  it("thư mục chưa có: không lỗi, xoá 0; mã sai khuôn trả không có", () => {
    fs.rmSync(THU_MUC, { recursive: true, force: true });
    expect(donTepXuatQuaHan()).toBe(0);
    expect(TRA("../../x")).toBeNull();
  });
});
