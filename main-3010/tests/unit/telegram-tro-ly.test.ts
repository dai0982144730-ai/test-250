// Cầu nối Telegram ↔ Trợ lý Main (Mr. Đại chốt 25/09/2026)
// Kiểm: lọc chat (chưa nối · Người xem · khoá · xoá) · chia khúc · offset không
// lặp · nút ✅ Làm / ❌ Bỏ · mã nối (đúng / sai / hết hạn / nối lại chat khác).
import "../ho-tro/telegram-du-lieu-rieng";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Telegram giả: ghi lại mọi tin gửi đi, getUpdates trả theo kịch bản ----
const daGui: { chatId: string; html: string; nut?: unknown; traLoiTin?: number; ma: number }[] = [];
const daSua: { chatId: string; ma: number; html: string }[] = [];
const daXoa: { chatId: string; ma: number }[] = [];
const layUpdatesGoi: (number | null)[] = [];
let hangUpdates: unknown[][] = [];
let nemKhiGuiDaNhan = false; // giả Telegram ném lỗi đúng lúc gửi tin ⏳ (kiểm độc lập lần 2 #8)
let nemKhiSuaTin = false; // giả Telegram ném lỗi lúc sửa tin ⏳ thành «đến lượt» (kiểm lại 26/10 tối, MG-3)
vi.mock("@/lib/telegram-tro-ly/api-tg", () => ({
  tokenBot: () => "token-gia",
  guiTin: async (chatId: string, html: string, nut?: unknown, tuyChon?: { traLoiTin?: number }) => {
    if (nemKhiGuiDaNhan && html.startsWith("⏳")) throw new Error("mạng đứt giả");
    const ma = 9000 + daGui.length;
    daGui.push({ chatId, html, nut, traLoiTin: tuyChon?.traLoiTin, ma });
    return { ok: true, ketQua: { message_id: ma } };
  },
  suaTin: async (chatId: string, ma: number, html: string) => {
    if (nemKhiSuaTin) throw new Error("mạng đứt giả");
    daSua.push({ chatId, ma, html });
    return { ok: true };
  },
  xoaTin: async (chatId: string, ma: number) => {
    daXoa.push({ chatId, ma });
    return { ok: true };
  },
  guiDangGo: async () => ({ ok: true }),
  traLoiNut: async () => ({ ok: true }),
  goNut: async () => ({ ok: true }),
  layUpdates: async (offset: number | null) => {
    layUpdatesGoi.push(offset);
    return { ok: true, ketQua: hangUpdates.shift() ?? [] };
  },
}));

// ---- Trợ lý giả: đếm lượt gọi AI + trả một công cụ GHI chờ duyệt ----
const goiAI: { email: string; role: string; kenh?: string; message: string }[] = [];
vi.mock("@/lib/ai/chat-agent", () => ({
  runChatAgent: async (i: { email: string; role: string; kenh?: string; message: string }) => {
    goiAI.push(i);
    return {
      // «dài» → câu trả lời quá một khúc Telegram (kiểm độc lập lần 2 #11)
      reply: i.message.includes("dài") ? `**Đã tra xong.** ${"số liệu ".repeat(700)}` : "**Đã tra xong.** Xem màn /viec-cua-toi",
      actions: [],
      uiActions: [],
      choDuyet: i.message.includes("giao")
        ? [{ name: "tao_viec_base", args: { ten: "Đổ bê tông móng T5", giaoCho: "thinhhp" } }]
        : [],
    };
  },
}));
const goiTool: { name: string; role: string; userMessage?: string }[] = [];
vi.mock("@/lib/ai/chat-tools", () => ({
  runTool: async (name: string, _a: unknown, ctx: { role: string; userMessage?: string }) => {
    goiTool.push({ name, role: ctx.role, userMessage: ctx.userMessage });
    return { ok: true, summary: `Đã giao việc (${name})` };
  },
}));
vi.mock("@/lib/ai/providers", () => ({ getAIConfig: () => ({}), isAIConfigured: () => true }));

import { goNoiTelegram, listUsers, noiTelegram, updateUser } from "@/lib/users";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { CAU_DEN_LUOT, cauDaNhan, chiaKhuc, docLenh, mdSangHtml, thanhCacTin, TRAN_KHUC, xetNguoiNhan } from "@/lib/telegram-tro-ly/thuan";
import { dungMaNoi, taoMaNoi } from "@/lib/telegram-tro-ly/noi-tai-khoan";
import { xuLyUpdate } from "@/lib/telegram-tro-ly/xu-ly";
import { chayMotNhip } from "@/lib/telegram-tro-ly/nhan";
import { docTrangThai, docViecCho, suaTrangThai } from "@/lib/telegram-tro-ly/kho";

const CHAT_DAI = "1966969513";
const CHAT_LA = "555";

let soTin = 1;
function tin(chatId: string, text: string) {
  return {
    update_id: soTin++,
    message: { message_id: soTin, date: 0, text, chat: { id: Number(chatId), type: "private" } },
  };
}
const guiToi = (chatId: string) => daGui.filter((g) => g.chatId === chatId).map((g) => g.html).join("\n---\n");

beforeEach(() => {
  nemKhiGuiDaNhan = false;
  nemKhiSuaTin = false;
  daGui.length = 0;
  daSua.length = 0;
  daXoa.length = 0;
  goiAI.length = 0;
  goiTool.length = 0;
  layUpdatesGoi.length = 0;
  hangUpdates = [];
  fs.rmSync(path.join(gocDuLieu(), "telegram-tro-ly"), { recursive: true, force: true });
  fs.rmSync(path.join(gocDuLieu(), "tro-ly"), { recursive: true, force: true }); // kho việc chờ chung (25/09)
  for (const u of listUsers()) {
    if (u.telegramChatId) goNoiTelegram(u.email);
    if (!u.active) updateUser(u.email, { active: true });
  }
  noiTelegram("dai@sci.vn", CHAT_DAI);
});

describe("thuần — lệnh, chia khúc, HTML", () => {
  it("đọc lệnh /noi, link sâu /start noi_…, /moi; còn lại là câu hỏi", () => {
    expect(docLenh("/noi 123 456")).toEqual({ loai: "noi", ma: "123456" });
    expect(docLenh("/start noi_654321")).toEqual({ loai: "noi", ma: "654321" });
    expect(docLenh("/moi@SCI_Main_agent_bot")).toEqual({ loai: "moi" });
    expect(docLenh("HV chậm bao nhiêu ngày?")).toEqual({ loai: "cau-hoi", chu: "HV chậm bao nhiêu ngày?" });
  });

  it("chia khúc ≤ 4.000 ký tự, không cắt giữa từ, không mất chữ", () => {
    const tu = Array.from({ length: 2500 }, (_, i) => `từ${i}`);
    const chu = tu.join(" ");
    const khuc = chiaKhuc(chu);
    expect(khuc.length).toBeGreaterThan(1);
    for (const k of khuc) expect(k.length).toBeLessThanOrEqual(TRAN_KHUC);
    expect(khuc.join(" ").split(" ")).toEqual(tu);
  });

  it("Markdown → HTML an toàn: mã hoá < &, **đậm**, link tương đối về địa chỉ Main, bảng thành dòng", () => {
    const h = mdSangHtml("**Tổng** a<b & c\n| A | B |\n|---|---|\n| 1 | 2 |\nMở [việc](/viec-cua-toi) hoặc /alerts, gõ /moi", "http://main:3010");
    expect(h).toContain("<b>Tổng</b> a&lt;b &amp; c");
    expect(h).toContain("A · B\n1 · 2");
    expect(h).toContain('<a href="http://main:3010/viec-cua-toi">việc</a>');
    expect(h).toContain('<a href="http://main:3010/alerts">');
    expect(h).toContain("gõ /moi");
    for (const t of thanhCacTin("x ".repeat(6000), "http://m")) expect(t.length).toBeLessThanOrEqual(4096);
  });

  it("xét người nhắn: chưa nối · khoá · Người xem bị từ chối; Người dùng → bậc engineer, Admin → pm", () => {
    expect(xetNguoiNhan(null)).toMatchObject({ duoc: false, lyDo: "chua-noi" });
    expect(xetNguoiNhan({ email: "a", name: "A", role: "engineer", active: false })).toMatchObject({ duoc: false, lyDo: "bi-khoa" });
    const xem = xetNguoiNhan({ email: "x", name: "X", role: "viewer", active: true });
    expect(xem).toMatchObject({ duoc: false, lyDo: "nguoi-xem" });
    expect(xem.duoc ? "" : xem.cau).toContain("cần loại Người dùng trở lên");
    expect(xetNguoiNhan({ email: "n", name: "N", role: "engineer", active: true })).toMatchObject({ duoc: true, role: "engineer", tenLoai: "Người dùng" });
    expect(xetNguoiNhan({ email: "ad", name: "Ad", role: "admin", active: true })).toMatchObject({ duoc: true, role: "pm" });
  });
});

describe("lọc chat — chỉ tài khoản đã nối và đủ loại mới gọi AI", () => {
  it("chat CHƯA nối: không gọi AI, trả hướng dẫn nối", async () => {
    await xuLyUpdate(tin(CHAT_LA, "HV chậm bao nhiêu?"));
    expect(goiAI).toHaveLength(0);
    expect(guiToi(CHAT_LA)).toContain("/noi 123456");
  });

  it("chat nối với Người xem: không gọi AI, trả lý do", async () => {
    noiTelegram("xem@sci.vn", CHAT_LA);
    await xuLyUpdate(tin(CHAT_LA, "HV chậm bao nhiêu?"));
    expect(goiAI).toHaveLength(0);
    expect(guiToi(CHAT_LA)).toContain("Người xem không dùng trợ lý qua Telegram");
  });

  it("tài khoản bị khoá SAU khi nối: có hiệu lực ngay tin kế tiếp", async () => {
    noiTelegram("nguoidung@sci.vn", CHAT_LA);
    updateUser("nguoidung@sci.vn", { active: false });
    await xuLyUpdate(tin(CHAT_LA, "hỏi"));
    expect(goiAI).toHaveLength(0);
    expect(guiToi(CHAT_LA)).toContain("đang bị khoá");
  });

  it("Người dùng: AI chạy đúng email + bậc engineer, kênh telegram; trả HTML có link", async () => {
    noiTelegram("nguoidung@sci.vn", CHAT_LA);
    await xuLyUpdate(tin(CHAT_LA, "HV chậm bao nhiêu?"));
    expect(goiAI).toHaveLength(1);
    expect(goiAI[0]).toMatchObject({ email: "nguoidung@sci.vn", role: "engineer", kenh: "telegram" });
    expect(guiToi(CHAT_LA)).toContain("<b>Đã tra xong.</b>");
  });
});

describe("⏳ đã nhận — chờ lâu không tưởng hỏng (26/10)", () => {
  const maTin = (u: ReturnType<typeof tin>) => u.message.message_id;

  it("câu chữ: không chờ / xếp thứ 2 / xếp thứ 3 / đến lượt", () => {
    expect(cauDaNhan(1)).toBe("⏳ Đã nhận câu hỏi — đang tra số liệu, thường mất dưới 1 phút.");
    expect(cauDaNhan(2)).toBe("⏳ Đã nhận câu hỏi — đang trả lời câu trước, câu này xếp thứ 2. Mỗi câu thường mất dưới 1 phút.");
    expect(cauDaNhan(3)).toContain("đang trả lời 2 câu trước, câu này xếp thứ 3");
    expect(CAU_DEN_LUOT).toBe("⏳ Đến lượt câu này — đang tra số liệu, thường mất dưới 1 phút.");
  });

  it("một câu: ⏳ gửi trước, trả lời vào câu hỏi; câu trả lời cũng trả lời vào câu hỏi; xong thì xoá ⏳", async () => {
    const u = tin(CHAT_DAI, "HV chậm bao nhiêu?");
    await xuLyUpdate(u);
    expect(daGui).toHaveLength(2);
    expect(daGui[0]).toMatchObject({ html: cauDaNhan(1), traLoiTin: maTin(u) });
    expect(daGui[1]!.html).toContain("<b>Đã tra xong.</b>");
    expect(daGui[1]!.traLoiTin).toBe(maTin(u));
    expect(daXoa).toEqual([{ chatId: CHAT_DAI, ma: daGui[0]!.ma }]);
    expect(daSua).toHaveLength(0);
  });

  it("hai câu liền: câu 2 báo «xếp thứ 2» NGAY, đến lượt thì sửa thành «đến lượt»; mỗi câu trả lời đúng câu của nó", async () => {
    const u1 = tin(CHAT_DAI, "câu một?");
    const u2 = tin(CHAT_DAI, "câu hai?");
    const p1 = xuLyUpdate(u1);
    const p2 = xuLyUpdate(u2);
    await Promise.resolve();
    // hai tin ⏳ đã đi trước khi AI trả lời câu nào
    expect(daGui.slice(0, 2).map((g) => g.html)).toEqual([cauDaNhan(1), cauDaNhan(2)]);
    await Promise.all([p1, p2]);
    expect(goiAI.map((g) => g.message)).toEqual(["câu một?", "câu hai?"]);
    const traLoi = daGui.filter((g) => g.html.includes("Đã tra xong"));
    expect(traLoi.map((g) => g.traLoiTin)).toEqual([maTin(u1), maTin(u2)]);
    expect(daSua).toEqual([{ chatId: CHAT_DAI, ma: daGui[1]!.ma, html: CAU_DEN_LUOT }]);
    expect(daXoa.map((x) => x.ma).sort()).toEqual([daGui[0]!.ma, daGui[1]!.ma].sort());
    // hàng trống lại: câu kế tiếp không còn «xếp thứ»
    await xuLyUpdate(tin(CHAT_DAI, "câu ba?"));
    expect(daGui.filter((g) => g.html.startsWith("⏳")).at(-1)!.html).toBe(cauDaNhan(1));
  });

  it("gửi tin ⏳ ném lỗi: câu hỏi VẪN được trả lời, không xoá tin không có (kiểm độc lập lần 2 #8)", async () => {
    nemKhiGuiDaNhan = true;
    const u = tin(CHAT_DAI, "HV chậm bao nhiêu?");
    await xuLyUpdate(u);
    expect(goiAI).toHaveLength(1);
    expect(daGui.some((g) => g.html.includes("Đã tra xong") && g.traLoiTin === maTin(u))).toBe(true);
    expect(daXoa).toHaveLength(0);
  });

  it("sửa tin ⏳ thành «đến lượt» ném lỗi: câu thứ hai VẪN được trả lời (kiểm lại 26/10 tối, MG-3)", async () => {
    nemKhiSuaTin = true;
    const u1 = tin(CHAT_DAI, "câu một?");
    const u2 = tin(CHAT_DAI, "câu hai?");
    await Promise.all([xuLyUpdate(u1), xuLyUpdate(u2)]);
    expect(goiAI.map((g) => g.message)).toEqual(["câu một?", "câu hai?"]);
    const traLoi = daGui.filter((g) => g.html.includes("Đã tra xong"));
    expect(traLoi.map((g) => g.traLoiTin)).toEqual([maTin(u1), maTin(u2)]);
    expect(daSua).toHaveLength(0);
  });

  it("câu trả lời nhiều khúc: chỉ khúc đầu trả lời vào câu hỏi (kiểm độc lập lần 2 #11)", async () => {
    const u = tin(CHAT_DAI, "báo cáo dài giúp");
    await xuLyUpdate(u);
    const khuc = daGui.filter((g) => !g.html.startsWith("⏳"));
    expect(khuc.length).toBeGreaterThan(1);
    expect(khuc[0]!.traLoiTin).toBe(maTin(u));
    for (const k of khuc.slice(1)) expect(k.traLoiTin).toBeUndefined();
  });

  it("không báo ⏳ cho lệnh và cho chat chưa nối", async () => {
    await xuLyUpdate(tin(CHAT_DAI, "/giup"));
    await xuLyUpdate(tin(CHAT_LA, "HV chậm bao nhiêu?"));
    expect(daGui.some((g) => g.html.startsWith("⏳"))).toBe(false);
    expect(daXoa).toHaveLength(0);
  });
});

describe("nút ✅ Làm / ❌ Bỏ", () => {
  it("công cụ GHI không tự chạy; bấm Làm chạy đúng MỘT lần, bấm đúp không chạy lại", async () => {
    await xuLyUpdate(tin(CHAT_DAI, "giao việc đổ bê tông cho thịnh, giao luôn"));
    expect(goiTool).toHaveLength(0);
    const v = docViecCho()[0]!;
    expect(v).toMatchObject({ name: "tao_viec_base", trangThai: "cho", email: "dai@sci.vn" });
    expect(daGui.some((g) => JSON.stringify(g.nut ?? "").includes(`lam:${v.id}`))).toBe(true);

    const bam = (data: string, chatId = CHAT_DAI) =>
      xuLyUpdate({
        update_id: soTin++,
        callback_query: { id: "cb", data, from: { id: Number(chatId) }, message: { message_id: 1, date: 0, chat: { id: Number(chatId), type: "private" } } },
      });
    await bam(`lam:${v.id}`, CHAT_LA); // chat khác bấm → không chạy
    expect(goiTool).toHaveLength(0);
    await bam(`lam:${v.id}`);
    await bam(`lam:${v.id}`);
    expect(goiTool).toHaveLength(1);
    // Cổng chống chèn lệnh được xét lại bằng ĐÚNG câu người dùng nhắn lượt đó
    expect(goiTool[0]).toMatchObject({ name: "tao_viec_base", role: "pm", userMessage: "giao việc đổ bê tông cho thịnh, giao luôn" });
  });

  it("bấm Bỏ: không chạy công cụ", async () => {
    await xuLyUpdate(tin(CHAT_DAI, "giao việc đổ bê tông"));
    const v = docViecCho()[0]!;
    await xuLyUpdate({
      update_id: soTin++,
      callback_query: { id: "cb", data: `bo:${v.id}`, from: { id: Number(CHAT_DAI) }, message: { message_id: 1, date: 0, chat: { id: Number(CHAT_DAI), type: "private" } } },
    });
    expect(goiTool).toHaveLength(0);
    expect(docViecCho()[0]!.trangThai).toBe("da-bo");
  });
});

describe("mã nối", () => {
  it("đúng mã → nối; mã dùng một lần; nối lại chat khác thì chat cũ mất quyền", async () => {
    const { ma } = taoMaNoi("nguoidung@sci.vn");
    await xuLyUpdate(tin(CHAT_LA, `/noi ${ma}`));
    expect(listUsers().find((u) => u.email === "nguoidung@sci.vn")?.telegramChatId).toBe(CHAT_LA);
    expect(dungMaNoi("777", ma)).toMatchObject({ ok: false });

    const lan2 = taoMaNoi("nguoidung@sci.vn");
    expect(dungMaNoi("888", lan2.ma)).toMatchObject({ ok: true });
    expect(listUsers().find((u) => u.email === "nguoidung@sci.vn")?.telegramChatId).toBe("888");
    await xuLyUpdate(tin(CHAT_LA, "hỏi"));
    expect(goiAI).toHaveLength(0);
  });

  it("một chat chỉ thuộc MỘT người: chat của anh Đại nối sang tài khoản khác thì anh Đại mất nối", () => {
    const { ma } = taoMaNoi("admin@sci.vn");
    expect(dungMaNoi(CHAT_DAI, ma)).toMatchObject({ ok: true, email: "admin@sci.vn" });
    const ds = listUsers();
    expect(ds.find((u) => u.email === "dai@sci.vn")?.telegramChatId).toBeUndefined();
    expect(ds.filter((u) => u.telegramChatId === CHAT_DAI)).toHaveLength(1);
  });

  it("mã hết hạn / sai; sai quá 5 lần thì khoá thử", () => {
    const bay = Date.now();
    const { ma } = taoMaNoi("nguoidung@sci.vn", bay);
    const het = dungMaNoi(CHAT_LA, ma, bay + 11 * 60 * 1000);
    expect(het.ok ? "" : het.cau).toContain("hết hạn");
    const sai = dungMaNoi("999", "000000", bay);
    expect(sai.ok ? "" : sai.cau).toContain("Mã không đúng");
    for (let i = 0; i < 4; i++) dungMaNoi("999", "000001", bay);
    const khoa = dungMaNoi("999", "000002", bay);
    expect(khoa.ok ? "" : khoa.cau).toContain("thử lại sau 10 phút");
  });
});

describe("vòng nhận — offset bền, không xử lý lặp", () => {
  it("lần đầu bỏ tin tồn; các nhịp sau xin đúng offset kế tiếp, mỗi tin xử lý đúng một lần", async () => {
    suaTrangThai((t) => ({ ...t, bat: true, offset: null }));
    hangUpdates = [[{ update_id: 100, message: tin(CHAT_LA, "tin cũ").message }]];
    await chayMotNhip();
    expect(docTrangThai().offset).toBe(101);
    expect(daGui).toHaveLength(0); // không trả lời tin tồn

    hangUpdates = [[{ update_id: 101, message: tin(CHAT_LA, "a").message }, { update_id: 102, message: tin(CHAT_LA, "b").message }], []];
    await chayMotNhip();
    await new Promise((r) => setTimeout(r, 50));
    await chayMotNhip();
    expect(layUpdatesGoi).toEqual([null, 101, 103]);
    expect(docTrangThai().offset).toBe(103);
    expect(daGui.filter((g) => g.chatId === CHAT_LA)).toHaveLength(2); // hai tin → hai câu hướng dẫn, không lặp
  });

  it("đang tắt thì không gọi getUpdates", async () => {
    suaTrangThai((t) => ({ ...t, bat: false, offset: 5 }));
    const kq = await chayMotNhip();
    expect(kq.ghiChu).toBe("đang tắt");
    expect(layUpdatesGoi).toHaveLength(0);
  });
});
