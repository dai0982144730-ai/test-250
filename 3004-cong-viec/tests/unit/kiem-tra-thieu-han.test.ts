// Quy tắc từ 25/09/2026: mọi việc phải có ngày kết thúc — thiếu thì CHẶN gửi, yêu cầu sửa lại (không còn việc "treo").
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { tx } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { giaoViec } from "@/lib/so-cai/dich-vu";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";

describe("thiếu ngày kết thúc thì chặn", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
    await q.query("UPDATE docflow.cau_hinh SET gia_tri = $1 WHERE khoa = 'quy_tac_de'", [JSON.stringify(MAC_DINH.quy_tac_de)]);
  });

  it("mặc định của hệ thống là chặn", async () => {
    expect(MAC_DINH.quy_tac_de.viec_khong_ngay_luon_mo).toBe(false);
    expect((await layCauHinh(q, "quy_tac_de")).viec_khong_ngay_luon_mo).toBe(false);
  });

  it("báo cáo có việc không có ngày kết thúc: chặn gửi đúng dòng, hướng dẫn sửa", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const buf = fs.readFileSync(path.join(process.cwd(), "mau-word", "vi-du", "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"));
    const kq = await kiemTraDayDu(q, nd, buf, "ban2.docx", { bo_qua_so_cai: true });
    expect(kq.dat).toBe(false);
    const l = kq.loi.find((x) => x.luat === "ngay_trong")!;
    expect(l).toMatchObject({ muc: "chan", vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ket_thuc" } });
    expect(l.thong_diep).toContain("mọi việc phải có ngày kết thúc");
  });

  it("giao việc tay không có hạn bị từ chối", async () => {
    const tgd = await nguoi("tgd@scigroup.vn");
    await expect(tx((t) => giaoViec(t, tgd, { ten: "Việc không hạn", phan_viec: [{ loai: "don_vi", id: "p-ktvh", ten: "P.KTVH" }] }))).rejects.toThrow(/ngày kết thúc/);
  });
});
