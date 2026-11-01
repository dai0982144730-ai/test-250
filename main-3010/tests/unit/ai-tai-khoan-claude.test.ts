// Quản lý token AI — Đợt 2 (Mr. Đại chốt 04/10/2026, nhân bản từ agent Công việc): hai tài khoản Claude công ty + tài khoản cá
// nhân dự phòng + hàng chờ ưu tiên + sổ dùng AI. Thứ tự: TK1 → TK2 → tài khoản cá nhân của CHÍNH người đang hỏi; việc nền không
// bao giờ dùng tài khoản cá nhân.
// CLI là GIẢ LẬP (vi.mock spawn) — nhận ra tài khoản qua CLAUDE_CONFIG_DIR, không đụng Claude thật (CAM_CLI_THAT=1 chặn CLI thật).
// Chạy trên bản sao dữ liệu tạm (THU_MUC_DU_LIEU) — thư mục đăng nhập nằm trong đó (moi-truong-ai.ts: VITEST).
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "main-ai-tai-khoan-"));
const bin = path.join(tam, "claude.exe");
fs.writeFileSync(bin, "gia");
process.env.ANTHROPIC_SUB_CLI_PATH = bin;

const HET = "Claude AI usage limit reached|4102444800";

/** Kịch bản: tài khoản nào trả gì ("ok" / "het" / "401") + nhật ký tài khoản đã gọi + câu đã gửi (để xếp thứ tự) */
const gia = vi.hoisted(() => ({ tra: {} as Record<string, string>, goi: [] as string[], thuTu: [] as string[], cham: 5 }));

vi.mock("node:child_process", async (goc) => {
  const g = (await goc()) as Record<string, unknown>;
  const { EventEmitter: EE } = await import("node:events");
  return {
    ...g,
    spawn: (_lenh: string, args: string[], opts: { env?: Record<string, string> }) => {
      const con = new EE() as EventEmitter & Record<string, unknown>;
      const out = new EE() as EventEmitter & { setEncoding: () => void };
      const err = new EE() as EventEmitter & { setEncoding: () => void };
      out.setEncoding = () => {};
      err.setEncoding = () => {};
      let vao = (args ?? []).join(" ");
      con.stdout = out;
      con.stderr = err;
      con.stdin = { on: () => {}, write: (s: string) => ((vao += String(s)), true), end: () => {} };
      con.kill = () => true;
      con.unref = () => {};
      const dir = opts?.env?.CLAUDE_CONFIG_DIR ?? "";
      const tk = /tk1$/.test(dir) ? "tk1" : /tk2$/.test(dir) ? "tk2" : /ca-nhan/.test(dir) ? "ca_nhan" : "may";
      gia.goi.push(tk);
      const kieu = gia.tra[tk] ?? "ok";
      // Như CLI thật (đo 04/10): lỗi API → JSON đầy đủ trên stdout, lý do "result" nằm CUỐI, thoát mã 1
      const dem = { is_error: true, num_turns: 1, usage: { input_tokens: 0, output_tokens: 0 }, modelUsage: {}, terminal_reason: "x".repeat(500) };
      setTimeout(() => {
        const ma = (vao.match(/LUOT-[A-Z0-9]+/) ?? ["?"])[0];
        gia.thuTu.push(ma);
        const o =
          kieu === "het"
            ? { ...dem, result: HET, type: "result" }
            : kieu === "401"
              ? { ...dem, api_error_status: 401, result: "Failed to authenticate. API Error: 401 OAuth access token is invalid.", type: "result" }
              : { type: "result", is_error: false, result: ma === "?" ? `TRA-${tk}` : ma, usage: { input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 3 } };
        out.emit("data", JSON.stringify(o));
        con.emit("close", kieu === "ok" ? 0 : 1);
      }, gia.cham);
      return con;
    },
  };
});

const CH = { hai_tai_khoan: true, dao_vai_24h: false, moi_phien_bat: false, moi_phien_gio: "07:00" };
const datCauHinh = (x: Partial<typeof CH> = {}) => {
  (globalThis as { __taiKhoanCauHinh?: unknown }).__taiKhoanCauHinh = { luc: Date.now() + 3600_000, ch: { ...CH, ...x } };
};
const dangNhap = (dir: string) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, ".credentials.json"), "{}");
};

beforeEach(async () => {
  datCauHinh();
  const p = await import("@/lib/ai/providers");
  p.resetClaudeBinaryCache();
  const m = await import("@/lib/ai/tai-khoan-claude");
  for (const so of [1, 2] as const) {
    m.trangThai(so).het_den = 0;
    m.trangThai(so).het_doan = false;
    m.trangThai(so).dang = 0;
    m.boDauHong(so);
  }
  m.trangThaiCaNhan("u1@sci.vn").het_den = 0;
  m.boDauHongCaNhan("u1@sci.vn");
  gia.tra = {};
  gia.goi = [];
  gia.thuTu = [];
  gia.cham = 5;
});

describe("hai tài khoản Claude", () => {
  it("tài khoản chính: tắt đảo vai → luôn 1; bật → đổi theo ngày giờ Việt Nam", async () => {
    const { taiKhoanChinh } = await import("@/lib/ai/tai-khoan-claude");
    expect(taiKhoanChinh(CH, Date.UTC(2026, 9, 2, 3))).toBe(1);
    const a = taiKhoanChinh({ ...CH, dao_vai_24h: true }, Date.UTC(2026, 9, 2, 3));
    const b = taiKhoanChinh({ ...CH, dao_vai_24h: true }, Date.UTC(2026, 9, 3, 3));
    expect(a).not.toBe(b);
    // 23:30 giờ VN ngày 02/10 và 00:30 giờ VN ngày 03/10 là hai ngày khác nhau
    expect(taiKhoanChinh({ ...CH, dao_vai_24h: true }, Date.UTC(2026, 9, 2, 16, 30))).toBe(a);
    expect(taiKhoanChinh({ ...CH, dao_vai_24h: true }, Date.UTC(2026, 9, 2, 17, 30))).toBe(b);
    expect(taiKhoanChinh({ ...CH, hai_tai_khoan: false, dao_vai_24h: true })).toBe(1);
  });

  it("bốn ô cấu hình lưu ra đĩa; giờ mồi phiên sai dạng → câu báo tiếng Việt", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const ch = await m.luuCauHinhTk({ hai_tai_khoan: true, moi_phien_gio: "06:30" });
    expect(ch).toMatchObject({ hai_tai_khoan: true, moi_phien_gio: "06:30" });
    m.quenCauHinhTk();
    expect((await m.cauHinhTk()).moi_phien_gio).toBe("06:30");
    await expect(m.luuCauHinhTk({ moi_phien_gio: "25:00" })).rejects.toThrow(/giờ:phút/);
    datCauHinh();
  });

  it("chọn tài khoản: tk2 chưa đăng nhập → 1; đăng nhập rồi: chính bận thì phụ đỡ; hết hạn mức thì chuyển", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    fs.rmSync(path.join(m.thuMucTk(2), ".credentials.json"), { force: true });
    expect(await m.chonTaiKhoan()).toBe(1);
    dangNhap(m.thuMucTk(2));
    expect(await m.chonTaiKhoan()).toBe(1); // cả hai rảnh → chính
    m.trangThai(1).dang = 1;
    expect(await m.chonTaiKhoan()).toBe(2); // chính bận, phụ rảnh → phụ
    m.trangThai(1).dang = 0;
    await m.danhDauHet(1, HET); // giờ mở lại do CLI báo
    expect(m.trangThai(1).het_den).toBe(4102444800 * 1000);
    expect(await m.chonTaiKhoan()).toBe(2);
    m.trangThai(1).het_den = 0;
    datCauHinh({ hai_tai_khoan: false });
    m.trangThai(1).dang = 1;
    expect(await m.chonTaiKhoan()).toBe(1); // tắt 2 tài khoản → luôn 1
  });

  it("TK1 chưa đăng nhập riêng → chạy bằng tài khoản mặc định của máy; đăng xuất không đụng tài khoản máy", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    fs.rmSync(path.join(m.thuMucTk(1), ".credentials.json"), { force: true });
    expect(m.thuMucChay(1)).toBeUndefined();
    expect(m.dangXuatCongTy(1)).toBe(false); // không có gì để xoá
    const { runCliPrompt } = await import("@/lib/ai/providers");
    expect(await runCliPrompt("việc nền")).toBe("TRA-may");
  });
});

describe("thứ tự TK1 → TK2 → tài khoản cá nhân", () => {
  it("người đang hỏi: TK1 hết, TK2 hết → chạy bằng tài khoản cá nhân của chính người đó; sổ ghi đúng tài khoản + người", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    dangNhap(m.thuMucTk(1));
    dangNhap(m.thuMucTk(2));
    dangNhap(m.thuMucCaNhan("u1@sci.vn"));
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguoiGoiAi } = await import("@/lib/ai/moi-truong-ai");
    gia.tra = { tk1: "het", tk2: "het" };
    const kq = await chayVoiNguoiGoiAi("U1@sci.vn", () => runCliPrompt("câu hỏi"));
    expect(kq).toBe("TRA-ca_nhan");
    expect(gia.goi).toEqual(["tk1", "tk2", "ca_nhan"]);
    const { tepAi } = await import("@/lib/ai/moi-truong-ai");
    const so = fs.readFileSync(tepAi("ai-so-dung.jsonl"), "utf8").trim().split("\n").map((d) => JSON.parse(d));
    expect(so.slice(-3).map((l) => [l.tai_khoan, l.ket_qua])).toEqual([["tk1", "het_han_muc"], ["tk2", "het_han_muc"], ["ca_nhan", "ok"]]);
    expect(so.at(-1).nguoi).toBe("u1@sci.vn"); // email viết thường
    expect(so.at(-1).token_cache_doc).toBe(5);
    expect(so.at(-1).tinh_nang).toBe(""); // gọi thẳng từ bài kiểm — không có tệp src/ nào ngoài lớp gọi AI
  });

  it("đã biết hai tài khoản công ty đang hết → đi thẳng tài khoản cá nhân, không gọi thử công ty", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    m.trangThai(1).het_den = Date.now() + 3600_000;
    m.trangThai(2).het_den = Date.now() + 3600_000;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguoiGoiAi } = await import("@/lib/ai/moi-truong-ai");
    expect(await chayVoiNguoiGoiAi("u1@sci.vn", () => runCliPrompt("câu hỏi"))).toBe("TRA-ca_nhan");
    expect(gia.goi).toEqual(["ca_nhan"]);
  });

  it("việc nền (không có người): KHÔNG dùng tài khoản cá nhân — báo hết, kèm giờ mở lại", async () => {
    const { runCliPrompt } = await import("@/lib/ai/providers");
    gia.tra = { tk1: "het", tk2: "het" };
    await expect(runCliPrompt("việc nền")).rejects.toThrow(/Tài khoản Claude của công ty đang hết hạn mức \(dùng lại khoảng/);
    expect(gia.goi).toEqual(["tk1", "tk2"]);
    // khoảng ngừng được ghi cho Thống kê dùng AI
    const { docNgung } = await import("@/lib/ai/so-dung-ai");
    expect(docNgung(Date.now() - 60_000, Date.now() + 60_000).length).toBeGreaterThan(0);
  });

  it("yêu cầu của người hỏi xong → bộ hẹn giờ bật lười trong yêu cầu đó KHÔNG mượn tên (và tài khoản cá nhân) của họ", async () => {
    const { chayVoiNguoiGoiAi, nguoiGoiAi } = await import("@/lib/ai/moi-truong-ai");
    let sau: () => string | null = () => "chưa";
    await chayVoiNguoiGoiAi("u1@sci.vn", async () => {
      expect(nguoiGoiAi()).toBe("u1@sci.vn");
      sau = () => nguoiGoiAi(); // như setInterval bật lười trong yêu cầu
    });
    expect(sau()).toBeNull();
  });

  it("người chưa nối tài khoản cá nhân → câu báo chỉ đường nối tài khoản", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    m.trangThai(1).het_den = Date.now() + 3600_000;
    m.trangThai(2).het_den = Date.now() + 3600_000;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguoiGoiAi } = await import("@/lib/ai/moi-truong-ai");
    gia.tra = { tk1: "het" };
    await expect(chayVoiNguoiGoiAi("u2@sci.vn", () => runCliPrompt("câu hỏi"))).rejects.toThrow(/Tài khoản Claude cá nhân/);
    expect(gia.goi).not.toContain("ca_nhan");
  });

  it("tài khoản cá nhân cũng hết → báo cả hai, đánh dấu hết (ghi đĩa); phiên cá nhân hỏng (401) → báo đăng nhập lại", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    m.trangThai(1).het_den = Date.now() + 3600_000;
    m.trangThai(2).het_den = Date.now() + 3600_000;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguoiGoiAi } = await import("@/lib/ai/moi-truong-ai");
    gia.tra = { ca_nhan: "het" };
    await expect(chayVoiNguoiGoiAi("u1@sci.vn", () => runCliPrompt("câu hỏi"))).rejects.toThrow(/tài khoản Claude cá nhân của anh\/chị .*đều đang hết hạn mức/);
    expect(m.trangThaiCaNhan("u1@sci.vn").het_den).toBe(4102444800 * 1000);
    expect(m.caNhanDungDuoc("u1@sci.vn")).toBe(false);
    // khởi động lại (quên bộ nhớ) vẫn nhớ mốc hết
    (globalThis as { __taiKhoanCaNhan?: Map<string, unknown> }).__taiKhoanCaNhan?.delete("u1@sci.vn");
    expect(m.trangThaiCaNhan("u1@sci.vn").het_den).toBe(4102444800 * 1000);
    m.trangThaiCaNhan("u1@sci.vn").het_den = 0;
    gia.tra = { ca_nhan: "401" };
    await expect(chayVoiNguoiGoiAi("u1@sci.vn", () => runCliPrompt("câu hỏi"))).rejects.toThrow(/không còn dùng được .*→ Đăng nhập Claude\.$/);
    expect(m.caNhanMatDangNhap("u1@sci.vn")).toBe(true);
  });

  it("mốc hết của công ty chỉ là ĐOÁN 15 phút → thử lại công ty một lần trước khi dùng tài khoản cá nhân", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayVoiNguoiGoiAi } = await import("@/lib/ai/moi-truong-ai");
    await m.danhDauHet(1, "Claude AI usage limit reached"); // không kèm giờ → đoán
    expect(m.trangThai(1).het_doan).toBe(true);
    m.trangThai(2).het_den = Date.now() + 3600_000;
    expect(await chayVoiNguoiGoiAi("u1@sci.vn", () => runCliPrompt("câu hỏi"))).toBe("TRA-tk1");
    expect(gia.goi).toEqual(["tk1"]);
  });

  it("tài khoản công ty MẤT ĐĂNG NHẬP (401) → tự chuyển tài khoản còn lại, lượt sau bỏ qua; đăng nhập lại thì thử ngay", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { runCliPrompt } = await import("@/lib/ai/providers");
    gia.tra = { tk1: "401" };
    expect(await runCliPrompt("việc nền")).toBe("TRA-tk2");
    expect(gia.goi).toEqual(["tk1", "tk2"]);
    expect(m.dangMatDangNhap(1)).toBe(true);
    expect(m.trangThai(1).het_den).toBe(0); // không tính là hết hạn mức
    gia.goi = [];
    expect(await runCliPrompt("việc nền")).toBe("TRA-tk2");
    expect(gia.goi).toEqual(["tk2"]);
    expect((await m.tinhHinhTk()).tai_khoan.find((t) => t.so === 1)?.mat_dang_nhap).toBe(true);
    m.boDauHong(1);
    gia.tra = {};
    gia.goi = [];
    expect(await runCliPrompt("việc nền")).toBe("TRA-tk1");
  });

  it("nút Thử: trúng hết hạn mức → đánh dấu như lượt thật; trả lời được → ok", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    const { thuTaiKhoan } = await import("@/lib/ai/providers");
    gia.tra = { tk2: "het" };
    expect((await thuTaiKhoan(2, "quantri@scigroup.vn")).ok).toBe(false);
    expect(m.trangThai(2).het_den).toBe(4102444800 * 1000);
    m.trangThai(2).het_den = 0;
    gia.tra = {};
    const r = await thuTaiKhoan(2, "quantri@scigroup.vn");
    expect(r.ok).toBe(true);
  });

  it("gỡ tài khoản cá nhân → không còn dùng; thư mục mỗi người tách riêng, email khác hoa thường là một người", async () => {
    const m = await import("@/lib/ai/tai-khoan-claude");
    expect(m.thuMucCaNhan("u1@sci.vn")).not.toBe(m.thuMucCaNhan("u2@sci.vn"));
    expect(m.thuMucCaNhan("U1@SCI.VN")).toBe(m.thuMucCaNhan("u1@sci.vn"));
    expect(m.caNhanDungDuoc("u1@sci.vn")).toBe(true);
    expect(m.caNhanDungDuoc(null)).toBe(false);
    m.xoaDangNhapCaNhan("u1@sci.vn");
    expect(m.caNhanDungDuoc("u1@sci.vn")).toBe(false);
    dangNhap(m.thuMucCaNhan("u1@sci.vn"));
  });
});

describe("hàng chờ có ưu tiên (mỗi tài khoản một hàng)", () => {
  it("3 lượt nền đang chờ, 1 câu chat đến sau → chat chạy ngay sau lượt đang chạy dở", async () => {
    datCauHinh({ hai_tai_khoan: false });
    gia.cham = 30;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayUuTien } = await import("@/lib/ai/uu-tien");
    const nen = ["LUOT-N1", "LUOT-N2", "LUOT-N3"].map((x) => runCliPrompt(x));
    await new Promise((r) => setTimeout(r, 5));
    const chat = chayUuTien(() => runCliPrompt("LUOT-CHAT"));
    expect(await Promise.all([...nen, chat])).toEqual(["LUOT-N1", "LUOT-N2", "LUOT-N3", "LUOT-CHAT"]);
    expect(gia.thuTu).toEqual(["LUOT-N1", "LUOT-CHAT", "LUOT-N2", "LUOT-N3"]);
  });

  it("4 lượt nền đầy suất vẫn nhận câu chat; lượt nền thứ 5 bị từ chối và ghi sổ 'đầy hàng chờ'", async () => {
    datCauHinh({ hai_tai_khoan: false });
    gia.cham = 20;
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const { chayUuTien } = await import("@/lib/ai/uu-tien");
    const nen = ["LUOT-A1", "LUOT-A2", "LUOT-A3", "LUOT-A4"].map((x) => runCliPrompt(x));
    await expect(runCliPrompt("LUOT-A5")).rejects.toThrow(/đang xử lý 4 yêu cầu AI khác/);
    const chat = chayUuTien(() => runCliPrompt("LUOT-CHAT2"));
    await Promise.all([...nen, chat]);
    expect(gia.thuTu[1]).toBe("LUOT-CHAT2");
    const { docLuot } = await import("@/lib/ai/so-dung-ai");
    expect(docLuot(Date.now() - 60_000, Date.now() + 1000).luot.some((l) => l.ket_qua === "day_hang")).toBe(true);
  });

  it("hai tài khoản chạy SONG SONG: chính bận thì lượt sau sang phụ", async () => {
    gia.cham = 30;
    const m = await import("@/lib/ai/tai-khoan-claude");
    dangNhap(m.thuMucTk(1));
    dangNhap(m.thuMucTk(2));
    const { runCliPrompt } = await import("@/lib/ai/providers");
    const a = runCliPrompt("LUOT-P1");
    await new Promise((r) => setTimeout(r, 2));
    const b = runCliPrompt("LUOT-P2");
    await Promise.all([a, b]);
    expect(gia.goi).toEqual(["tk1", "tk2"]);
  });
});
