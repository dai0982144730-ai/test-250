// Bộ hẹn giờ mỗi ngày cũng dọn tệp Trợ lý làm trong chat quá 7 ngày (kiểm độc lập lần 7, 17/10/2026: trước đó hàm dọn chỉ chạy khi
// có người xuất / tải tệp → 27 tệp quá hạn 8–9 ngày nằm lại). Link tải tệp đã xoá → trang HTML tiếng Việt, không phải JSON trần.
// Chạy trên thư mục tạm (DOCFLOW_AI_DATA); mọi bước dọn dùng CSDL đều GIẢ — không mở CSDL nào, không gọi AI.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const gia = vi.hoisted(() => ({ dinhKemNem: false, quetHan: 0 }));

vi.mock("@/lib/db", () => ({
  layQ: async () => ({}),
  tx: async (fn: (q: unknown) => unknown) => fn({}),
}));
vi.mock("@/lib/cau-hinh/doc", () => ({ layCauHinh: async () => ({ gio_nhac: "00:00" }) }));
vi.mock("@/lib/so-cai/dich-vu", () => ({
  quetHan: async () => {
    gia.quetHan++;
  },
}));
vi.mock("@/lib/dinh-kem/kho", () => ({
  donDinhKem: async () => {
    if (gia.dinhKemNem) throw new Error("lỗi giả ở bước dọn đính kèm");
    return { het_han: 0, bo_do: 0 };
  },
  donViecHetHan: async () => ({ so_viec: 0, ma: [] }),
}));
vi.mock("@/lib/thong-bao", () => ({
  donChuongTonDong: async () => ({ gop: 0, tat: 0 }),
  xoaTinDaDocCu: async () => 0,
}));
vi.mock("@/lib/thu-muc/ban-nop-cu", () => ({ donBanNopCu: async () => ({ so_ban: 0 }) }));
vi.mock("@/lib/so-cai/ra-soat", () => ({ raSoatHangNgay: async () => ({ so_thieu: 0, so_loi_ghi_so: 0 }) }));
// Cửa tải: phiên đăng nhập giả (không mở CSDL); xuLy thật trả thẳng Response nên giả bằng lời gọi thẳng
vi.mock("@/lib/phien", () => ({
  batBuocDangNhap: async () => ({ id: "nv.a@scigroup.vn" }),
  xuLy: async (fn: () => Promise<unknown>) => fn(),
}));

import { donTepXuatChatHangNgay, nhip } from "@/lib/so-cai/hen-gio";
import { trangTepKhongCon } from "@/lib/tro-ly/trang-tep-khong-con";
import { GET as taiTep } from "@/app/api/tro-ly/xuat/tai/route";

// Hàm lấy thư mục đọc biến này LÚC GỌI nên đặt ở đây là đủ
process.env.DOCFLOW_AI_DATA = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-hen-gio-xuat-"));
const THU_MUC = path.join(process.env.DOCFLOW_AI_DATA, "xuat-chat");
if (!path.resolve(THU_MUC).startsWith(path.resolve(os.tmpdir()))) throw new Error("Bài kiểm không trỏ vào thư mục tạm — dừng, không xoá gì");

function taoTep(nguoi: string, ten: string, tuoiNgay: number): string {
  const d = path.join(THU_MUC, nguoi);
  fs.mkdirSync(d, { recursive: true });
  const p = path.join(d, ten);
  fs.writeFileSync(p, "noi dung thu");
  const luc = new Date(Date.now() - tuoiNgay * 86_400_000);
  fs.utimesSync(p, luc, luc);
  return p;
}

type G = typeof globalThis & { __docflowHenGio?: { timer: unknown; ngayDaQuet: string | null; ngayDaRaSoat?: string | null; dangChay: boolean } };
const datLaiHenGio = () => {
  (globalThis as G).__docflowHenGio = { timer: null, ngayDaQuet: null, ngayDaRaSoat: null, dangChay: false };
};

describe("bộ hẹn giờ dọn tệp chat quá 7 ngày — mỗi ngày một lần, không chờ ai xuất / tải", () => {
  beforeEach(() => {
    fs.rmSync(THU_MUC, { recursive: true, force: true });
    gia.dinhKemNem = false;
    gia.quetHan = 0;
    datLaiHenGio();
  });

  it("nhịp hằng ngày xoá tệp 9 ngày tuổi của mọi người, giữ tệp 1 ngày tuổi", async () => {
    const cuA = taoTep("nv.a_scigroup.vn", "aaaaaa01__cu.docx", 9);
    const cuB = taoTep("nv.b_scigroup.vn", "bbbbbb01__cu.xlsx", 8.5);
    const moi = taoTep("nv.a_scigroup.vn", "aaaaaa02__moi.docx", 1);
    await nhip();
    expect(gia.quetHan).toBe(1);
    expect([fs.existsSync(cuA), fs.existsSync(cuB), fs.existsSync(moi)]).toEqual([false, false, true]);
  });

  it("cùng ngày không chạy lại; bước dọn đính kèm (CSDL) lỗi thì tệp chat vẫn được dọn", async () => {
    gia.dinhKemNem = true;
    const cu = taoTep("nv.a_scigroup.vn", "cccccc01__cu.pdf", 10);
    await nhip();
    expect(fs.existsSync(cu)).toBe(false);
    const cuSau = taoTep("nv.a_scigroup.vn", "cccccc02__cu.pdf", 10);
    await nhip(); // hôm nay đã quét → không chạy lần hai
    expect(gia.quetHan).toBe(1);
    expect(fs.existsSync(cuSau)).toBe(true);
  });

  it("chưa có thư mục xuất: không lỗi, xoá 0", async () => {
    expect(await donTepXuatChatHangNgay()).toBe(0);
  });
});

describe("link tải tệp đã tự xoá → trang HTML tiếng Việt mã 404", () => {
  it("không phải JSON, có cách làm lại cho cả hai loại tệp", async () => {
    const r = trangTepKhongCon();
    expect(r.status).toBe(404);
    expect(r.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    const html = await r.text();
    expect(html.trimStart().startsWith("{")).toBe(false);
    expect(html).not.toMatch(/"loi"\s*:/);
    expect(html).toContain('<html lang="vi">');
    expect(html).toContain("Tệp đã quá 7 ngày nên đã tự xoá");
    expect(html).toContain("làm lại file");
    expect(html).toContain("xuất lại file Word");
  });

  it("cửa GET /api/tro-ly/xuat/tai: tệp 9 ngày tuổi → trang đó; tệp còn hạn → tải được", async () => {
    taoTep("nv.a_scigroup.vn", "dddddd01__cu.docx", 9);
    taoTep("nv.a_scigroup.vn", "dddddd02__moi.docx", 1);
    const het = await taiTep(new Request("http://localhost/api/tro-ly/xuat/tai?ma=dddddd01"));
    expect(het.status).toBe(404);
    expect(het.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    expect(await het.text()).toContain("Tệp đã quá 7 ngày nên đã tự xoá");
    const con = await taiTep(new Request("http://localhost/api/tro-ly/xuat/tai?ma=dddddd02"));
    expect(con.status).toBe(200);
    expect(con.headers.get("Content-Disposition")).toContain("moi.docx");
  });
});
