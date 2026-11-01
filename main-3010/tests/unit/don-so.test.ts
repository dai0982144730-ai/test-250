// Dọn sổ hỏi–đáp theo tuổi (HOP-DONG-KET-NOI 7.1, Mr. Đại chốt 26/09/2026).
// Chạy trên thư mục dữ liệu TẠM riêng của tệp này — không đụng data/ thật.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { donSo, donSoTep, docTrangThaiDonSo, giuSoChoSucKhoe, xetDonSoDem } from "@/lib/nhat-ky/don-so";
import { kiemMocGiuSo, MOC_GIU_SO_MAC_DINH } from "@/lib/nhat-ky/moc-giu-so";
import { docMocGiuSo } from "@/lib/nhat-ky/moc-giu-so-luu";

const cu = process.env.THU_MUC_DU_LIEU;
let thuMuc = "";
beforeEach(() => {
  thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), "sci-don-so-"));
  process.env.THU_MUC_DU_LIEU = thuMuc;
});
afterAll(() => {
  process.env.THU_MUC_DU_LIEU = cu;
});

/** Phần riêng của app: Main đọc mốc từ chính cài đặt của nó */
function datMocMain(moc: { dayDu: number; gon: number }): void {
  fs.writeFileSync(path.join(thuMuc, "cai-dat-base.json"), JSON.stringify({ giuSo: moc }), "utf8");
}

const BAY = Date.parse("2026-09-26T16:30:00Z"); // 23:30 giờ VN ngày 26/09
const dong = (thoiDiem: string, them: Record<string, unknown> = {}) =>
  JSON.stringify({ thoiDiem, agentHoi: "main", agentTraLoi: "tiendo", congCu: "tiendo.tom_tat_du_an", lyDoGoi: "thử", ketQua: "ok", miliGiay: 3, ...them });
const tepSo = () => path.join(thuMuc, "nhat-ky-hoi-agent.jsonl");
const docDong = () => fs.readFileSync(tepSo(), "utf8").split("\n").filter((x) => x !== "");

describe("dọn sổ hỏi–đáp theo tuổi", () => {
  it("giữ đúng 3 nhóm tuổi, dòng hỏng giữ nguyên", () => {
    const A = dong("2026-09-20T00:00:00Z", { traLoi: "nội dung", biCat: false });
    const B = dong("2026-09-16T00:00:00Z", { traLoi: "10 ngày vẫn đầy đủ" });
    const C = dong("2026-09-15T00:00:00Z", { traLoi: "11 ngày thì bỏ", biCat: true, traLoiGon: "gọn" });
    const D = dong("2026-09-01T00:00:00Z", { traLoiGon: "vốn đã gọn" });
    const E = dong("2026-08-22T00:00:00Z", { traLoi: "35 ngày còn bản gọn" });
    const F = dong("2026-08-21T00:00:00Z", { traLoi: "36 ngày thì xoá" });
    const G = "{hỏng không đọc được";
    const H = JSON.stringify({ agentHoi: "main", congCu: "x" }); // không có giờ → không đụng
    fs.writeFileSync(tepSo(), [A, B, C, D, E, F, G, H].join("\n") + "\n");
    const dem = donSoTep(tepSo(), { bayGio: BAY, moc: MOC_GIU_SO_MAC_DINH });
    expect(dem).toMatchObject({ dayDu: 3, gon: 3, daRutGon: 2, xoa: 1, hong: 1, ghiNoiThem: 0, daGhiLai: true });
    const ra = docDong();
    expect(ra).toHaveLength(7);
    expect(ra[0]).toBe(A);
    expect(ra[1]).toBe(B);
    const c = JSON.parse(ra[2]);
    expect(c.traLoi).toBeUndefined();
    expect(c.biCat).toBeUndefined();
    expect(c.daRutGon).toBe(true);
    expect(c.traLoiGon).toBe("gọn");
    expect(ra[3]).toBe(D); // vốn không có nội dung → giữ nguyên từng byte
    expect(JSON.parse(ra[4]).daRutGon).toBe(true);
    expect(ra).not.toContain(F);
    expect(ra[5]).toBe(G);
    expect(ra[6]).toBe(H);
    expect(dem.byteSau).toBe(fs.statSync(tepSo()).size);
    expect(dem.byteSau).toBeLessThan(dem.byteTruoc);
  });

  it("dòng ghi nối trong lúc dọn không mất (kể cả đuôi đang ghi dở lúc đọc)", () => {
    const cuQua = dong("2026-08-01T00:00:00Z");
    const moi = dong("2026-09-26T16:00:00Z", { traLoi: "mới" });
    const dangGhi = dong("2026-09-26T16:10:00Z", { traLoi: "đang ghi dở" });
    // đuôi chưa có "\n" = một dòng đang ghi dở lúc đọc
    fs.writeFileSync(tepSo(), `${cuQua}\n${moi}\n${dangGhi.slice(0, 20)}`);
    const them1 = dong("2026-09-26T16:20:00Z", { traLoi: "ghi nối sau lúc đọc" });
    const them2 = dong("2026-07-01T00:00:00Z"); // ghi sau lúc đọc thì KHÔNG bị xét — giữ
    const dem = donSoTep(tepSo(), {
      bayGio: BAY,
      moc: MOC_GIU_SO_MAC_DINH,
      sauKhiDoc: () => fs.appendFileSync(tepSo(), `${dangGhi.slice(20)}\n${them1}\n${them2}\n`),
    });
    expect(dem.xoa).toBe(1);
    expect(dem.ghiNoiThem).toBe(3);
    expect(docDong()).toEqual([moi, dangGhi, them1, them2]);
  });

  it("không dòng nào phải đổi thì không ghi lại tệp", () => {
    const x = dong("2026-09-25T00:00:00Z", { traLoi: "mới" });
    fs.writeFileSync(tepSo(), `${x}\n`);
    const dem = donSoTep(tepSo(), { bayGio: BAY, moc: MOC_GIU_SO_MAC_DINH });
    expect(dem.daGhiLai).toBe(false);
    expect(dem.byteSau).toBe(dem.byteTruoc);
    expect(fs.existsSync(`${tepSo()}.dang-don`)).toBe(false);
  });

  it("mốc lấy từ cấu hình Main khi có", () => {
    datMocMain({ dayDu: 3, gon: 5 });
    fs.writeFileSync(
      tepSo(),
      [dong("2026-09-22T00:00:00Z", { traLoi: "4 ngày → gọn" }), dong("2026-09-20T00:00:00Z", { traLoi: "6 ngày → xoá" })].join("\n") + "\n",
    );
    const kq = donSo({ boi: "tay", bayGio: new Date(BAY) });
    expect(kq.nguonMoc).toBe("main");
    expect(kq.moc).toEqual({ dayDu: 3, gon: 5 });
    expect(kq).toMatchObject({ gon: 1, daRutGon: 1, xoa: 1, dayDu: 0 });
    expect(docMocGiuSo().moc).toEqual({ dayDu: 3, gon: 5 });
  });

  it("mốc hỏng trong cấu hình → dùng mặc định 10/35", () => {
    datMocMain({ dayDu: 40, gon: 5 });
    expect(docMocGiuSo().moc).toEqual(MOC_GIU_SO_MAC_DINH);
  });

  it("vòng đêm: trước 03:30 không chạy · sau đó chạy một lần mỗi ngày · chạy tay không chặn vòng đêm", () => {
    fs.writeFileSync(tepSo(), `${dong("2026-08-01T00:00:00Z")}\n`);
    expect(xetDonSoDem(new Date("2026-09-26T20:00:00Z"))).toBeNull(); // 03:00 VN 27/09
    donSo({ boi: "tay", bayGio: new Date("2026-09-26T20:10:00Z") });
    expect(docTrangThaiDonSo().ngayDaDon).toBeNull();
    const kq = xetDonSoDem(new Date("2026-09-26T20:31:00Z")); // 03:31 VN
    expect(kq?.boi).toBe("tu-dong");
    expect(docTrangThaiDonSo().ngayDaDon).toBe("2026-09-27");
    expect(xetDonSoDem(new Date("2026-09-27T05:00:00Z"))).toBeNull(); // 12:00 VN cùng ngày
    expect(docTrangThaiDonSo().lichSu).toHaveLength(2);
  });

  it("không chạy chồng: tiến trình khác đang giữ khoá thì bỏ lượt, sổ nguyên vẹn", () => {
    const x = dong("2026-08-01T00:00:00Z");
    fs.writeFileSync(tepSo(), `${x}\n`);
    fs.writeFileSync(path.join(thuMuc, "don-so.dang-chay"), "{}");
    const kq = donSo({ boi: "tay", bayGio: new Date(BAY) });
    expect(kq.loi).toMatch(/không chạy chồng/);
    expect(docDong()).toEqual([x]);
  });

  it("suc_khoe khai giu_so", () => {
    fs.writeFileSync(tepSo(), `${dong("2026-09-25T00:00:00Z")}\n`);
    donSo({ boi: "tay", bayGio: new Date(BAY) });
    const g = giuSoChoSucKhoe();
    expect(g.day_du).toBe(10);
    expect(g.gon).toBe(35);
    expect(typeof g.lan_don_cuoi).toBe("string");
  });

  it("kiểm hai mốc: số nguyên, 1 ≤ đầy đủ < gọn ≤ 365", () => {
    expect(kiemMocGiuSo({ dayDu: 10, gon: 35 }).ok).toBe(true);
    expect(kiemMocGiuSo({ day_du: "7", gon: "30" })).toEqual({ ok: true, moc: { dayDu: 7, gon: 30 } });
    for (const sai of [{ dayDu: 0, gon: 5 }, { dayDu: 10, gon: 10 }, { dayDu: 10, gon: 366 }, { dayDu: 1.5, gon: 5 }, { dayDu: "x", gon: 5 }, null]) {
      expect(kiemMocGiuSo(sai).ok).toBe(false);
    }
  });
});
