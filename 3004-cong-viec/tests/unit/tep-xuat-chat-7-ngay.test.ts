// Tệp AI tự tạo trong lúc chat (tải qua đường link): giữ 7 ngày kể từ lúc tạo rồi xoá, có tải hay chưa cũng xoá; KHÔNG xoá ngay khi tải.
// Mr. Đại chốt 12/10/2026 sau lần rà dữ liệu phình. Thư mục xuất của agent Công việc chia theo NGƯỜI (xuat-chat/<người>/).
// Chạy trên thư mục tạm (DOCFLOW_AI_DATA), không đụng data/ thật.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { SO_NGAY_GIU_TEP_XUAT, donTepXuatQuaHan, timFileDaXuat } from "@/lib/tro-ly/xuat-theo-yeu-cau";

// Hàm lấy thư mục đọc biến này LÚC GỌI nên đặt ở đây là đủ (không phụ thuộc thứ tự nạp tệp)
process.env.DOCFLOW_AI_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-xuat-chat-"));
const CHU = "nv.dtpc@scigroup.vn";
const THU_MUC = path.join(process.env.DOCFLOW_AI_DATA, "xuat-chat");
// Tên thư mục của một người = email đã đổi ký tự lạ thành "_" (đúng cách THU_MUC trong mã làm)
const THU_MUC_TEP = path.join(THU_MUC, "nv.dtpc_scigroup.vn");
const TRA = (ma: string) => timFileDaXuat(ma, CHU);

function taoTep(ma: string, ten: string, tuoiNgay: number, thuMuc = THU_MUC_TEP): string {
  fs.mkdirSync(thuMuc, { recursive: true });
  const p = path.join(thuMuc, `${ma}__${ten}`);
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

describe("agent Công việc — dọn ở thư mục của MỌI người, tra thì chỉ trong thư mục của mình", () => {
  beforeEach(() => {
    fs.rmSync(THU_MUC, { recursive: true, force: true });
  });
  it("tệp quá hạn của người khác cũng bị xoá; tệp còn hạn của người khác thì mình không tra được", () => {
    const cuNguoiKhac = taoTep("dddddd01", "cu.docx", 9, path.join(THU_MUC, "truong.dtpc_scigroup.vn"));
    const moiNguoiKhac = taoTep("dddddd02", "moi.docx", 1, path.join(THU_MUC, "truong.dtpc_scigroup.vn"));
    expect(donTepXuatQuaHan()).toBe(1);
    expect([fs.existsSync(cuNguoiKhac), fs.existsSync(moiNguoiKhac)]).toEqual([false, true]);
    expect(TRA("dddddd02")).toBeNull();
  });
});
