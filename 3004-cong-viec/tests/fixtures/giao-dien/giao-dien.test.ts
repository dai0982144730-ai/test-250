// Khói giao diện: dựng (server render) cây hành trình, hộp xử lý, kết quả kiểm tra với dữ liệu thật của kịch bản.
import { describe, it, expect, beforeAll } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { csdlMoi, nguoi } from "../../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { gui, traLai, nhan } from "@/lib/gui/dich-vu";
import { taiLenVaKiemTra, boNoiDung } from "@/lib/gui/tai-len";
import { thongTinTaiLieuGui } from "@/lib/gui/doc";
import { CayHanhTrinh } from "@/components/gui/CayHanhTrinh";
import { HopXuLy } from "@/components/gui/HopXuLy";
import { KetQuaKiemTra } from "@/components/kiem-tra/KetQuaKiemTra";
import { PhieuONhap } from "@/components/kiem-tra/PhieuONhap";
import { BangCongViecKiemTra } from "@/components/kiem-tra/BangCongViecKiemTra";
import { khoTam, tep } from "../chuan-bi";

let q: Q;
beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
});

describe("giao diện kiểm tra và hành trình (dựng tĩnh)", () => {
  it("màn kiểm tra bản 1 BQLDA: báo đúng ô Người lập, bảng việc có cột Vào sổ cái", async () => {
    const nd = await nguoi("nv.bqlda@scigroup.vn");
    const r = await tx((x) => taiLenVaKiemTra(x, nd, { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx") }));
    const k = boNoiDung(r.ket_qua);
    const html =
      renderToStaticMarkup(h(KetQuaKiemTra, { kq: k })) +
      renderToStaticMarkup(h(PhieuONhap, { mau: k.mau, oNhap: k.o_nhap, loi: k.loi })) +
      renderToStaticMarkup(h(BangCongViecKiemTra, { congViec: k.cong_viec, duDoan: k.du_doan, loi: k.loi, mau: k.mau, xacNhan: {} }));
    expect(html).toContain("Chưa đạt: 1 lỗi chặn gửi");
    expect(html).toContain("Ô Người lập (nguoi_lap)");
    expect(html).toContain("GPMB Trụ T11");
    expect(html).toContain("luôn mở");
  });

  it("cây hành trình + hộp xử lý sau khi trả lại", async () => {
    const enc = await nguoi("nv.enc@scigroup.vn");
    const dtpc = await nguoi("truong.dtpc@scigroup.vn");
    const t = await tx((x) => taiLenVaKiemTra(x, enc, { tep: tep("BaoCao_Thang7_SCI_ENC.docx") }));
    const g = await tx((x) => gui(x, enc, { tai_lieu_id: t.tai_lieu_id!, den: ["p-dtpc", "p-tckt"] }));
    const tckt = await nguoi("truong.tckt@scigroup.vn");
    await tx((x) => nhan(x, tckt, g.buoc_ids[1]));
    await tx((x) => traLai(x, dtpc, { buoc_id: g.buoc_ids[0], ly_do: "thiếu số liệu thu vốn NK1" }));
    const tt = await thongTinTaiLieuGui(q, enc, t.tai_lieu_id!);
    const html = renderToStaticMarkup(h(CayHanhTrinh, { cay: tt.cay, taiLieuId: t.tai_lieu_id!, cuaToi: tt.buoc_cua_toi.map((b) => b.buoc_id) }));
    expect(html).toContain("SCI E&amp;C");
    expect(html).toContain("Bị trả lại");
    expect(html).toContain("thiếu số liệu thu vốn NK1");
    expect(html).toContain("Phòng Tài chính Kế toán");
    const hop = renderToStaticMarkup(h(HopXuLy, { tt, onDaLam: () => undefined }));
    expect(hop).toContain("Gửi lại bản đã sửa");
    expect(hop).toContain("Hoàn thành");
    expect(hop).not.toContain("Chuyển tiếp");
  });
});
