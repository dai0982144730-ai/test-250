// LUẬT 33 — phần HỎI của agent Công việc (05/10/2026): cửa soạn giao Cây việc / Issue hỏi 4 agent kia trước khi soạn.
// Giả fetch theo địa chỉ cổng + giả goiCoGhi (không ghi sổ thật, không gọi agent thật).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/nhat-ky/so", () => ({ goiCoGhi: (_nc: unknown, fn: () => Promise<unknown>) => fn() }));

import { goiHoiTrungQuaSo, hoiTrungCoNho, khoaHoiTrung, quenHoiTrung } from "@/lib/cay-viec/hoi-trung-hoi";
import { tomTatHoiTrung, type CauHoiTrung } from "@/lib/chung/hoi-trung-kieu";

const CAU: CauHoiTrung = { noi_dung: "[Hướng Việt] Xử lý 7.5.1 — test lắp tuabin", ly_do: "test", ma_du_an: "HV", ma_wbs: "7.5.1" };
const KHONG = { ok: true, du_lieu: { trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0 } };

let traLoi: (url: string) => unknown;
const daGoi: string[] = [];
beforeEach(() => {
  daGoi.length = 0;
  traLoi = () => KHONG;
  vi.stubGlobal("fetch", async (url: string) => {
    daGoi.push(url);
    return { status: 200, json: async () => traLoi(url) } as unknown as Response;
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("hỏi trùng của agent Công việc", () => {
  it("hỏi đúng 5 agent kia (có Nghiệm thu từ 19/10), không hỏi chính mình (base); có trùng → câu 'đã được agent … soạn'", async () => {
    traLoi = (url) =>
      url.endsWith("/api/mcp/tiendo")
        ? { ok: true, du_lieu: { trung: true, cach_phan: "ai", so_ung_vien: 1, viec: { ma: "TD-test-1", noi_dung: "Lắp tuabin 7.5.1", trang_thai: "cho_duyet" } } }
        : KHONG;
    const kq = await hoiTrungCoNho(khoaHoiTrung("HV", { maWbs: "7.5.1-a" }), CAU, { duong: "tay" });
    expect(daGoi.map((u) => u.split("/api/mcp/")[1]).sort()).toEqual(["hopdong", "main", "nghiemthu", "phaply", "tiendo"]);
    expect(kq.trung?.agent).toBe("tiendo");
    expect(tomTatHoiTrung(kq)).toMatch(/^Việc này đã được agent Tiến độ soạn giao việc có nội dung là "Lắp tuabin 7.5.1"/);
  });

  it("nhớ 10 phút theo (dự án · mã WBS): bước Giao không hỏi lại; quên sau khi giao; quá 10 phút hỏi mới", async () => {
    const khoa = khoaHoiTrung("HV", { maWbs: "7.5.1-b" });
    let gio = 1_000_000;
    await hoiTrungCoNho(khoa, CAU, { duong: "tay" }, () => gio);
    expect(daGoi).toHaveLength(5);
    gio += 9 * 60_000;
    await hoiTrungCoNho(khoa, CAU, { duong: "tay" }, () => gio);
    expect(daGoi).toHaveLength(5);
    gio += 2 * 60_000;
    await hoiTrungCoNho(khoa, CAU, { duong: "tay" }, () => gio);
    expect(daGoi).toHaveLength(10);
    quenHoiTrung(khoa);
    await hoiTrungCoNho(khoa, CAU, { duong: "tay" }, () => gio);
    expect(daGoi).toHaveLength(15);
  });

  it("bên kia trả KHONG_CO_QUYEN → 'tu_choi' (không gọi lại); lỗi khác / khuôn lạ → không thưa (null)", async () => {
    traLoi = () => ({ ok: false, ma_loi: "KHONG_CO_QUYEN", thong_diep: "không cho" });
    expect(await goiHoiTrungQuaSo(CAU, { duong: "tay" })("main", 0)).toBe("tu_choi");
    traLoi = () => ({ ok: false, loi: { ma_loi: "KHONG_HIEU_YEU_CAU", thong_diep: "lạ" } });
    expect(await goiHoiTrungQuaSo(CAU, { duong: "tay" })("phaply", 0)).toBe("tu_choi");
    traLoi = () => ({ ok: false, ma_loi: "AGENT_KHONG_SAN_SANG", thong_diep: "tắt" });
    expect(await goiHoiTrungQuaSo(CAU, { duong: "tay" })("hopdong", 0)).toBeNull();
    traLoi = () => ({ ok: true, du_lieu: { gi: "khác" } });
    expect(await goiHoiTrungQuaSo(CAU, { duong: "tay" })("tiendo", 0)).toBeNull();
    expect(await goiHoiTrungQuaSo(CAU, { duong: "tay" })("base", 0)).toBeNull(); // không có địa chỉ cho chính mình
  });

  it("issue không găng nhớ theo mã issue, nút găng theo mã WBS", () => {
    expect(khoaHoiTrung("HV", { maWbs: "7.5.1" })).toBe("HV|wbs:7.5.1");
    expect(khoaHoiTrung("HV", { maIssue: "ISS-7" })).toBe("HV|issue:ISS-7");
  });
});
