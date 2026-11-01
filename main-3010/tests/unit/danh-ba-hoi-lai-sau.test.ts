// Kéo danh bạ từ "base" — luật hẹn hỏi lại (04/10/2026, kiểm độc lập lần 3 #2):
// base trả KHONG_CO_DU_LIEU (agent Công việc tạm đóng danh bạ hàng loạt) là CÂU TRẢ LỜI THẬT → hẹn 24 giờ, không hỏi lại
// mỗi lần mở màn Việc; lỗi kết nối vẫn thử lại ngay như cũ. Sáng 04/10 Mr. Đại chốt TẮT hẳn tự kéo (TU_KEO_DANH_BA_BASE).
// Chạy trên bản sao data/ của lần test (THU_MUC_DU_LIEU).
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

const tra: { v: unknown } = { v: null };
const goi = vi.fn(async () => tra.v);
vi.mock("@/lib/nguon/hoi-agent", () => ({ hoiAgent: () => goi() }));

import { duongDanDuLieu } from "@/lib/goc-du-lieu";
import { keoDanhBaTuBase, keoDanhBaNenTuDong, docMocKeoTuBase, TU_KEO_DANH_BA_BASE } from "@/lib/chung/danh-ba";

const MOC = duongDanDuLieu("viec", "danh-ba-keo-tu-base.json");
const BA_NGAY_TRUOC = new Date(Date.now() - 3 * 86_400_000).toISOString();
const choNen = () => new Promise((xong) => setTimeout(xong, 30));

describe("kéo danh bạ từ base — hẹn hỏi lại", () => {
  beforeEach(() => {
    goi.mockClear();
    fs.mkdirSync(path.dirname(MOC), { recursive: true });
    fs.writeFileSync(MOC, JSON.stringify({ luc: BA_NGAY_TRUOC, soNguoi: 152, soCoTen: 150 }), "utf8");
  });

  it("KHONG_CO_DU_LIEU → hẹn 24 giờ, giữ mốc kéo thành công cũ, mở màn không hỏi lại", async () => {
    tra.v = { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "Danh bạ hàng loạt đang tạm đóng" };
    const kq = await keoDanhBaTuBase("bài test");
    expect(kq.ok).toBe(false);
    const moc = docMocKeoTuBase();
    expect(moc.luc).toBe(BA_NGAY_TRUOC);
    expect(moc.soNguoi).toBe(152);
    expect(moc.loi).toContain("KHONG_CO_DU_LIEU");
    const hen = Date.parse(moc.hoiLaiSau ?? "");
    expect(hen - Date.now()).toBeGreaterThan(23 * 3_600_000);
    goi.mockClear();
    keoDanhBaNenTuDong();
    await choNen();
    expect(goi).not.toHaveBeenCalled();
  });

  it("lỗi kết nối → không ghi hẹn (khi bật lại tự kéo thì thử lại ngay như cũ)", async () => {
    tra.v = { ok: false, ma_loi: "HET_HAN_CHO", thong_diep: "Agent không thưa trong 10 giây" };
    await keoDanhBaTuBase("bài test");
    expect(docMocKeoTuBase().hoiLaiSau).toBeUndefined();
  });

  it("tự kéo đang TẮT (Mr. Đại chốt 04/10): mốc cũ 3 ngày, không hẹn — mở màn vẫn không kéo", async () => {
    expect(TU_KEO_DANH_BA_BASE).toBe(false);
    keoDanhBaNenTuDong();
    await choNen();
    expect(goi).not.toHaveBeenCalled();
  });

  it("kéo được lại thì xoá hẹn", async () => {
    fs.writeFileSync(MOC, JSON.stringify({ luc: BA_NGAY_TRUOC, soNguoi: 152, soCoTen: 150, hoiLaiSau: new Date(Date.now() - 1000).toISOString() }), "utf8");
    tra.v = { ok: true, du_lieu: { nhan_su: [{ ma_base: "thu-hen", ho_ten: "Người thử" }] }, nguon: [], canh_bao: [] };
    await keoDanhBaTuBase("bài test");
    const moc = docMocKeoTuBase();
    expect(moc.hoiLaiSau).toBeUndefined();
    expect(moc.loi).toBeUndefined();
    expect(Date.parse(moc.luc ?? "") > Date.parse(BA_NGAY_TRUOC)).toBe(true);
  });
});
