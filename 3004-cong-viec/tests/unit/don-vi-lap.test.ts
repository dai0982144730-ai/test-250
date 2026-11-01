// BÁO CÁO CỦA ĐƠN VỊ NÀO DO NỘI DUNG FILE NÓI (Mr. Đại chốt 29/09/2026). Trước đây: anh An — chính NM Hướng Linh 7, kiêm
// Hướng Linh 8 — nộp báo cáo HL8 (Form 8 dùng chung) bị ghi vào HL7, không cảnh báo (đo trên hệ thống thật 29/09).
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import { csdlMoi } from "../helpers/csdl";
import { layQ, type Q } from "@/lib/db";
import { napDanhBa, type DanhBa } from "@/lib/kiem-tra/phan-giai";
import { thuocDonVi, xacDinhDonViLap, type NutDonVi } from "@/lib/kiem-tra/don-vi-lap";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { docWord } from "@/lib/kiem-tra/doc-word";
import type { NguoiDungPhien } from "@/lib/types";
import { dienOBatBuoc } from "../../scripts/tao-mau-trang.mjs";

let q: Q;
let db: DanhBa;
let cay: NutDonVi[];
const F8 = { ma: "form-8", don_vi_lap: "nm-namxe" };
const doc = (don_vi_lap: string | undefined, van_ban = "") => ({ o_nhap: (don_vi_lap === undefined ? {} : { don_vi_lap }) as Record<string, string>, van_ban });

beforeAll(async () => {
  await csdlMoi();
  q = await layQ();
  db = await napDanhBa(q);
  cay = (await q.query<NutDonVi>("SELECT id, ten, cha_id, loai FROM identity.don_vi")).rows;
});

describe("đọc đơn vị lập trên mặt báo cáo", () => {
  it("ô Đơn vị lập (bản 5): tên đầy đủ, tên ngắn, viết tắt NM. TĐ / NMĐG, tên gọi khác HL8 (Cài đặt)", () => {
    for (const [chu, id] of [
      ["NHÀ MÁY ĐIỆN GIÓ HƯỚNG LINH 8", "nm-huonglinh8"],
      ["NM Hướng Linh 7", "nm-huonglinh7"],
      ["NM. TĐ NẬM XE", "nm-namxe"],
      ["HL8", "nm-huonglinh8"],
      ["NMĐG HL7", "nm-huonglinh7"],
    ] as const)
      expect(xacDinhDonViLap(doc(chu), F8, db, cay)).toMatchObject({ don_vi_id: id, cach: "o_don_vi_lap" });
  });

  it("mẫu dùng chung, ô còn '......' → không biết (chặn); mẫu riêng → đơn vị của mẫu", () => {
    expect(xacDinhDonViLap(doc("......"), F8, db, cay, ["......"]).don_vi_id).toBeNull();
    expect(xacDinhDonViLap(doc("......"), { ma: "form-1", don_vi_lap: "p-dtpc" }, db, cay, ["......"])).toMatchObject({ don_vi_id: "p-dtpc", cach: "theo_mau" });
  });

  it("file cũ (chưa có ô): dò các dòng đầu, bỏ qua dòng công ty mẹ và dòng Gửi:", () => {
    const vb = "CÔNG TY CỔ PHẦN SCI\nGửi: Phòng Kinh tế & Vận hành — SCI Corp\nBÁO CÁO TUẦN / THÁNG\nNM. TĐ NẬM XE\nKỳ báo cáo:\nNM Hướng Linh 7";
    expect(xacDinhDonViLap(doc(undefined, vb), F8, db, cay)).toMatchObject({ don_vi_id: "nm-namxe", cach: "dau_file" });
  });

  it("người nộp thuộc đơn vị: chính / kiêm nhiệm; không thuộc thì không", () => {
    expect(thuocDonVi(["nm-huonglinh7", "nm-huonglinh8"], "nm-huonglinh8", cay)).toBe(true);
    expect(thuocDonVi(["nm-huonglinh7"], "nm-huonglinh8", cay)).toBe(false);
  });
});

describe("kiểm báo cáo: anh An (chính HL7, kiêm HL8) nộp Form 8", () => {
  const nd = (ids: string[]) => ({ id: "an@test", ten: "An", don_vi_id: ids[0], don_vi_ids: ids, cap: 3, quyen: [], vai_tro: ["truong-don-vi"] }) as unknown as NguoiDungPhien;
  const f8 = (tenDv: string) =>
    dienOBatBuoc(fs.readFileSync("mau-word/trang/form-8.docx"), "form-8", {
      o: { don_vi_lap: tenDv },
      bang: { bang_cong_viec: [{ ten: "Kiểm tra tuabin", ket_thuc: "31/07/2026" }] },
    });

  it("báo cáo ghi HL8 → của HL8 (không còn bị ghi vào HL7), đạt", async () => {
    const buf = await f8("NM Hướng Linh 8");
    expect((await docWord(buf)).o_nhap.don_vi_lap).toBe("NM Hướng Linh 8");
    const kq = await kiemTraDayDu(q, nd(["nm-huonglinh7", "nm-huonglinh8"]), buf, "hl8.docx", { bo_qua_so_cai: true });
    expect(kq.don_vi_lap).toBe("nm-huonglinh8");
    expect(kq.loi.filter((l) => l.muc === "chan")).toEqual([]);
  });

  it("người chỉ thuộc HL7 nộp báo cáo ghi HL8 → CHẶN, nêu rõ đơn vị", async () => {
    const kq = await kiemTraDayDu(q, nd(["nm-huonglinh7"]), await f8("NM Hướng Linh 8"), "hl8.docx", { bo_qua_so_cai: true });
    expect(kq.dat).toBe(false);
    expect(kq.loi.find((l) => l.muc === "chan" && l.vi_tri?.tag === "don_vi_lap")?.thong_diep).toMatch(/bạn không thuộc Nhà máy điện gió Hướng Linh 8/);
  });

  it("chưa ghi tên đơn vị (mẫu trắng '......') → CHẶN, dặn ghi tên", async () => {
    const buf = await dienOBatBuoc(fs.readFileSync("mau-word/trang/form-8.docx"), "form-8", { bang: { bang_cong_viec: [{ ten: "Kiểm tra tuabin", ket_thuc: "31/07/2026" }] } });
    const kq = await kiemTraDayDu(q, nd(["nm-huonglinh7"]), buf, "trong.docx", { bo_qua_so_cai: true });
    expect(kq.loi.find((l) => l.muc === "chan" && l.vi_tri?.tag === "don_vi_lap")?.thong_diep).toMatch(/Chưa nhận ra đơn vị nộp báo cáo/);
  });
});

describe("Form 0 — mẫu không có ô Đơn vị lập (đo 30/09: báo cáo Ban TGĐ bị ghi cho Trợ lý CT)", () => {
  it("không dò dòng đầu, luôn là đơn vị của mẫu", () => {
    const F0 = { ma: "form-0", don_vi_lap: "ban-tgd", dinh_nghia: { o_nhap: [{ tag: "mau_ma" }, { tag: "ky_bao_cao" }] } };
    const x = xacDinhDonViLap(doc(undefined, "CÔNG TY CỔ PHẦN SCI\nTRÌNH TỔNG GIÁM ĐỐC\nPhòng Đầu tư và Pháp chế\nKỳ báo cáo:"), F0, db, cay);
    expect(x).toMatchObject({ don_vi_id: "ban-tgd", cach: "theo_mau" });
  });
  it("mẫu có ô Đơn vị lập nhưng file cũ thiếu ô → vẫn dò dòng đầu như trước", () => {
    const F1 = { ma: "form-1", don_vi_lap: "p-dtpc", dinh_nghia: { o_nhap: [{ tag: "mau_ma" }, { tag: "don_vi_lap" }] } };
    expect(xacDinhDonViLap(doc(undefined, "PHÒNG KINH TẾ VÀ VẬN HÀNH\nKỳ báo cáo:"), F1, db, cay)).toMatchObject({ don_vi_id: "p-ktvh", cach: "dau_file" });
  });
});
