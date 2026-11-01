// Đợt C — 🤖 AI ĐỀ XUẤT CẤU TRÚC, CODE SOÁT (Khai báo mẫu không cần sửa code, 01/10/2026).
// AI giả (không gọi mạng) trả nghĩa theo SỐ THỨ TỰ trong khung → lưới code đặt tag, sửa nghĩa bịa
// → gắn nhãn bằng code → bộ kiểm tra thật đọc ra đúng các việc như bản gốc.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { sinhTruongCu } from "@/lib/kiem-tra/cau-truc";
import { cauTrucTuFileCo, ganNhanTheoCauTruc, goHetNhan } from "@/lib/kiem-tra/gan-nhan";
import { deXuatCauTruc, ghepDeXuat } from "@/lib/kiem-tra/de-xuat-cau-truc";

const THU_MUC = path.join(process.cwd(), "..", "File test tuần 40 - mẫu bản 8");
const NGAY_NOP = "2026-10-01T09:00:00+07:00";
const TEP = "TEST - Tuần 40 - P.TCKT (Form 4).docx";

/** AI giả: đúng như một LLM ngoan, cộng thêm vài chỗ bịa để lưới phải bắt. */
const AI_GIA = JSON.stringify({
  chuong: [
    { so: 0, nghia: "so_lieu", ly_do: "bảng chỉ tiêu tài chính", chac: true, bang: [{ vi_tri: 0, nghia: "so_lieu", cot: [] }] },
    { so: 1, nghia: "so_lieu", ly_do: "nguồn tiền", chac: true, bang: [{ vi_tri: 0, nghia: "so_lieu", cot: [] }] },
    { so: 2, nghia: "bang_tien", ly_do: "nghĩa bịa", chac: false, bang: [{ vi_tri: 0, nghia: "so_lieu", cot: [] }] },
    { so: 3, nghia: "thong_tin", ly_do: "kiến nghị không phải việc", chac: true, bang: [{ vi_tri: 0, nghia: "sinh_viec", cot: [] }] },
    {
      so: 4, nghia: "sinh_viec_bang", ly_do: "bảng kế hoạch việc", chac: true,
      bang: [{ vi_tri: 0, nghia: "sinh_viec", ly_do: "mỗi dòng một việc", chac: true, cot: [
        { so: 0, nghia: "ten", chac: true }, { so: 1, nghia: "du_an", chac: true }, { so: 2, nghia: "bat_dau", chac: true },
        { so: 3, nghia: "ket_thuc", chac: true }, { so: 4, nghia: "ket_qua_can_co", chac: true }, { so: 5, nghia: "tinh_trang", chac: true },
        { so: 99, nghia: "ten", chac: true },
      ] }],
    },
    { so: 7, nghia: "sinh_viec_bang", bang: [] },
  ],
});

describe.skipIf(!fs.existsSync(THU_MUC))("AI đề xuất cấu trúc — code soát (Đợt C)", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
  });

  it("Word thường → AI giả → lưới → gắn nhãn → việc ra như bản gốc", async () => {
    const goc = fs.readFileSync(path.join(THU_MUC, TEP));
    const tron = await goHetNhan(goc);
    let promptNhan = "";
    const kq = await deXuatCauTruc(tron, async (p) => ((promptNhan = p), AI_GIA));
    expect(promptNhan).toContain("KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI");

    // lưới: chương không có (so 7) bị bỏ, cột 99 bị bỏ, nghĩa bịa → mặc định, bảng sinh việc trong chương thông tin → số liệu
    expect(kq.cau_truc.chuong.map((c) => c.nghia)).toEqual(["so_lieu", "so_lieu", "thong_tin", "thong_tin", "sinh_viec_bang"]);
    expect(kq.cau_truc.chuong[3].bang[0].nghia).toBe("so_lieu");
    expect(kq.canh_bao.some((c) => c.includes("bang_tien"))).toBe(true);
    const bv = kq.cau_truc.chuong[4].bang[0];
    expect(bv.tag).toBe("bang_cong_viec");
    expect(bv.cot.map((c) => [c.tag, c.nghia])).toEqual([
      ["ten", "ten"], ["du_an", "du_an"], ["bat_dau", "bat_dau"], ["ket_thuc", "ket_thuc"], ["ket_qua_can_co", "ket_qua_can_co"], ["tinh_trang", "tinh_trang"],
    ]);
    expect(kq.loi_cau_truc).toEqual([]);
    expect(kq.hang.find((h) => h.khoa === "c4.b0")?.ly_do).toBe("mỗi dòng một việc");

    const gan = await ganNhanTheoCauTruc(tron, "form-4", kq.cau_truc);
    expect(gan.thieu).toEqual([]);

    const nd0 = await nguoi("truong.dtpc@scigroup.vn");
    const tc = { bo_qua_so_cai: true, ngay_nop: NGAY_NOP };
    const k0 = await kiemTraDayDu(q, nd0, goc, "goc.docx", tc);
    const nd = { ...nd0, don_vi_id: k0.don_vi_lap, don_vi_ids: [k0.don_vi_lap!] } as typeof nd0;
    const kq1 = await kiemTraDayDu(q, nd, goc, "goc.docx", tc);
    const { rows } = await q.query<{ dinh_nghia: Record<string, unknown> }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = 'form-4'");
    const dnGoc = rows[0].dinh_nghia;
    await q.query("UPDATE docflow.mau_word SET dinh_nghia = $1::jsonb WHERE ma = 'form-4'", [JSON.stringify({ ...dnGoc, cau_truc: kq.cau_truc, ...sinhTruongCu(kq.cau_truc) })]);
    const kq2 = await kiemTraDayDu(q, nd, gan.buf, "gan.docx", tc);
    await q.query("UPDATE docflow.mau_word SET dinh_nghia = $1::jsonb WHERE ma = 'form-4'", [JSON.stringify(dnGoc)]);

    const viec = (k: typeof kq1) => k.cong_viec.map((c) => [c.ten, c.ket_thuc ?? null, c.du_an ?? null, !!c.da_xong, c.ket_qua_can_co ?? null]);
    expect(kq2.mau_ma).toBe("form-4");
    expect(viec(kq2)).toEqual(viec(kq1));
    expect(kq1.cong_viec.length).toBeGreaterThan(0);
  });

  for (const kieu of ["sửa trên file mẫu tải về (còn nhãn)", "Word thường (mất nhãn)"] as const)
    it(`PMC Form 5 — ${kieu}: giữ bảng đặc biệt Tiến độ thiết kế + nhãn bảng số liệu; kiến nghị không sinh việc`, async () => {
      const goc = fs.readFileSync(path.join(THU_MUC, "TEST - Tuần 40 - SCI PMC (Form 5).docx"));
      const { rows } = await q.query<{ dinh_nghia: { bang_cong_viec: { tag: string; nhan: string }[]; muc_bat_buoc: string[] } & Record<string, unknown> }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = 'form-5'");
      const dnGoc = rows[0].dinh_nghia;
      const cu = await cauTrucTuFileCo(goc, dnGoc);
      expect(cu.chuong.flatMap((c) => c.bang.filter((b) => b.tag).map((b) => [b.tag, b.nghia]))).toEqual([
        ["bang_du_an", "so_lieu"],
        ["bang_tien_do_tk", "dac_biet"],
        ["bang_kien_nghi", "so_lieu"],
        ["bang_cong_viec", "sinh_viec"],
      ]);
      // 🤖 giả mắc đúng 2 lỗi đo được 01/10: bảng kiến nghị → quyết định; bảng thiết kế → bảng thường
      const ai = JSON.stringify({ chuong: [
        { so: 0, nghia: "so_lieu" },
        { so: 1, nghia: "sinh_viec_bang", bang: [{ vi_tri: 0, nghia: "sinh_viec", cot: [{ so: 1, nghia: "du_an" }, { so: 2, nghia: "ten" }, { so: 3, nghia: "ket_thuc" }, { so: 4, nghia: "tinh_trang" }, { so: 5, nghia: "them" }] }] },
        { so: 2, nghia: "thong_tin", bang: [{ vi_tri: 0, nghia: "quyet_dinh", cot: [{ so: 1, nghia: "ten" }] }] },
        { so: 3, nghia: "sinh_viec_bang", bang: [{ vi_tri: 0, nghia: "sinh_viec", cot: [{ so: 0, nghia: "ten" }, { so: 1, nghia: "du_an" }, { so: 2, nghia: "bat_dau" }, { so: 3, nghia: "ket_thuc" }, { so: 4, nghia: "ket_qua_can_co" }, { so: 5, nghia: "tinh_trang" }] }] },
      ] });
      const conNhan = kieu.startsWith("sửa");
      const vao = conNhan ? goc : await goHetNhan(goc);
      const kq = await deXuatCauTruc(vao, async () => ai, cu);
      expect(kq.cau_truc.chuong.flatMap((c) => c.bang.map((b) => [b.tag, b.nghia]))).toEqual([
        ["bang_du_an", "so_lieu"],
        ["bang_tien_do_tk", "dac_biet"],
        ["bang_kien_nghi", "so_lieu"],
        ["bang_cong_viec", "sinh_viec"],
      ]);
      expect(kq.canh_bao.some((c) => c.includes("bảng quyết định"))).toBe(true);
      expect(kq.loi_cau_truc).toEqual([]);
      const gan = await ganNhanTheoCauTruc(vao, "form-5", kq.cau_truc, ((dnGoc.o_nhap ?? []) as { tag: string }[]).map((o) => o.tag));
      expect(gan.thieu).toEqual([]);
      // Word thường: bảng số liệu 1 dòng tiêu đề → máy dựng lại nhãn cột theo chữ tiêu đề, không mất nhãn nào
      expect(gan.mat_nhan_cot).toEqual([]);

      const nd0 = await nguoi("truong.dtpc@scigroup.vn");
      const tc = { bo_qua_so_cai: true, ngay_nop: NGAY_NOP };
      const k0 = await kiemTraDayDu(q, nd0, goc, "goc.docx", tc);
      const nd = { ...nd0, don_vi_id: k0.don_vi_lap, don_vi_ids: [k0.don_vi_lap!] } as typeof nd0;
      const kq1 = await kiemTraDayDu(q, nd, goc, "goc.docx", tc);
      await q.query("UPDATE docflow.mau_word SET dinh_nghia = $1::jsonb WHERE ma = 'form-5'", [JSON.stringify({ ...dnGoc, cau_truc: kq.cau_truc, ...sinhTruongCu(kq.cau_truc) })]);
      const kq2 = await kiemTraDayDu(q, nd, gan.buf, "gan.docx", tc);
      await q.query("UPDATE docflow.mau_word SET dinh_nghia = $1::jsonb WHERE ma = 'form-5'", [JSON.stringify(dnGoc)]);
      const viec = (k: typeof kq1) => k.cong_viec.map((c) => [c.ten, c.ket_thuc ?? null, c.du_an ?? null, !!c.da_xong]);
      expect(viec(kq2)).toEqual(viec(kq1));
      // bảng số liệu đọc y như cũ → MỌI lỗi / cảnh báo / gợi ý (gồm luật kiểm tra trỏ ô bảng số liệu) bằng hệt
      const loi = (k: typeof kq1) => k.loi.filter((l) => !/gui_den/.test(l.thong_diep)).map((l) => `${l.muc} ${l.thong_diep}`);
      {
        const [d1, d2] = [await docWord(goc), await docWord(gan.buf)];
        for (const t of ["bang_du_an", "bang_kien_nghi"]) expect(d2.bang[t]).toEqual(d1.bang[t]);
        expect(loi(kq2)).toEqual(loi(kq1));
      }
    });

  it("bảng duyệt: đổi tên chương / cột giữ tag cũ, cột bỏ hiện dòng Bỏ, người chọn thắng AI", () => {
    const khung = {
      tieu_de_bao_cao: "BÁO CÁO",
      co_ky_bao_cao: true,
      chuong: [
        { tieu_de: "KẾ HOẠCH TUẦN SAU", tieu_de_goc: "II. KẾ HOẠCH TUẦN SAU", doan: "", bang: [{ vi_tri: 0, so_dong: 2, dong_mau: [], tieu_de_cot: ["Nội dung", "Hạn chót", "Hạn hoàn thành", "Tình trạng"] }] },
        { tieu_de: "AN TOÀN", tieu_de_goc: "III. AN TOÀN", doan: "", bang: [] },
      ],
    };
    const cu = { chuong: [
      { tieu_de: "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI", nghia: "sinh_viec_bang" as const, bat_buoc: true, bang: [{ tag: "bang_cong_viec", tieu_de: "Việc", nghia: "sinh_viec" as const, cot: [
        { tag: "ten", tieu_de: "Nội dung", nghia: "ten" as const },
        { tag: "ket_thuc", tieu_de: "Hạn", nghia: "ket_thuc" as const },
        { tag: "phu_trach", tieu_de: "Người làm", nghia: "phu_trach" as const },
        { tag: "tinh_trang", tieu_de: "Tình trạng", nghia: "tinh_trang" as const },
      ] }] },
      { tieu_de: "NHÂN SỰ", nghia: "thong_tin" as const, bat_buoc: true, bang: [] },
    ] };
    const ai = { chuong: [
      { so: 0, nghia: "sinh_viec_bang", bang: [{ vi_tri: 0, nghia: "sinh_viec", cot: [{ so: 0, nghia: "ten" }, { so: 1, nghia: "ket_thuc", chac: true }, { so: 2, nghia: "them" }, { so: 3, nghia: "tinh_trang" }] }] },
      { so: 1, nghia: "thong_tin" },
    ] };
    const kq = ghepDeXuat(ai, khung, cu);
    const sv = (k: string) => kq.hang.find((h) => h.khoa === k)?.so_voi_truoc;
    expect(sv("c0")).toBe('Đổi tên (cũ: "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI")');
    expect(kq.cau_truc.chuong[0].ten_cu).toEqual(["KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI"]); // file mẫu cũ vẫn qua kiểm "đủ chương"
    expect(kq.cau_truc.chuong[0].bang[0].tag).toBe("bang_cong_viec");
    expect(sv("c0.b0.cot0")).toBe("Giữ nguyên");
    expect(sv("c0.b0.cot1")).toBe('Đổi tên (cũ: "Hạn")');
    expect(kq.cau_truc.chuong[0].bang[0].cot[1].tag).toBe("ket_thuc");
    expect(sv("c0.b0.cot2")).toBe("Mới");
    expect(kq.hang.filter((h) => h.so_voi_truoc === "Bỏ").map((h) => h.trong_file)).toEqual(['cột "Người làm" (bản trước)', "Chương NHÂN SỰ (bản trước)"]);
    expect(sv("c1")).toBe("Mới");

    // người chọn "Hạn hoàn thành" là Ngày kết thúc → thắng 🤖; cột 🤖 chọn trước đó chuyển Thông tin thêm
    const kq2 = ghepDeXuat(ai, khung, cu, { "c0.b0.cot2": "ket_thuc", "c1.bb": "0" });
    expect(kq2.cau_truc.chuong[0].bang[0].cot.map((c) => c.nghia)).toEqual(["ten", "them", "ket_thuc", "tinh_trang"]);
    expect(kq2.hang.find((h) => h.khoa === "c0.b0.cot2")?.nguoi_chon).toBe(true);
    expect(kq2.cau_truc.chuong[1].bat_buoc).toBe(false);
    expect(kq2.loi_cau_truc).toEqual([]);

    // người đổi bảng thành Bảng số liệu → mất bảng sinh việc → chương sinh việc vẫn hợp lệ? kiemCauTruc báo nếu thiếu cột bắt buộc
    const kq3 = ghepDeXuat(ai, khung, cu, { "c0.b0.cot3": "them" });
    expect(kq3.loi_cau_truc.join(" ")).toContain("Tình trạng");
  });

  it("bản cập nhật giữ tag cũ; cột mới → tag theo tên; trùng nghĩa → Thông tin thêm", async () => {
    const khung = {
      tieu_de_bao_cao: "BÁO CÁO",
      co_ky_bao_cao: false,
      chuong: [{ tieu_de: "KẾ HOẠCH VIỆC", tieu_de_goc: "I. KẾ HOẠCH VIỆC", doan: "", bang: [{ vi_tri: 0, so_dong: 2, dong_mau: [], tieu_de_cot: ["STT", "Nội dung", "Hạn chót", "Hạn hoàn thành", "Tình trạng", "Ghi chú"] }] }],
    };
    const cu = { chuong: [{ tieu_de: "KẾ HOẠCH VIỆC", nghia: "sinh_viec_bang" as const, bat_buoc: true, bang: [{ tag: "bang_cong_viec", tieu_de: "Việc", nghia: "sinh_viec" as const, cot: [{ tag: "noi_dung_cu", tieu_de: "Nội dung", nghia: "ten" as const }] }] }] };
    const ai = { chuong: [{ so: 0, nghia: "sinh_viec_bang", bang: [{ vi_tri: 0, nghia: "sinh_viec", cot: [
      { so: 0, nghia: "ten" }, { so: 1, nghia: "ten" }, { so: 2, nghia: "ket_thuc" }, { so: 3, nghia: "ket_thuc" }, { so: 4, nghia: "tinh_trang" }, { so: 5, nghia: "them" },
    ] }] }] };
    const kq = ghepDeXuat(ai, khung, cu);
    expect(kq.cau_truc.chuong[0].bang[0].cot.map((c) => [c.tag, c.nghia])).toEqual([
      ["cot_stt", "bo_qua"],
      ["noi_dung_cu", "ten"],
      ["ket_thuc", "ket_thuc"],
      ["han_hoan_thanh", "them"],
      ["tinh_trang", "tinh_trang"],
      ["ghi_chu", "them"],
    ]);
    expect(kq.canh_bao.some((c) => c.includes("Hạn hoàn thành"))).toBe(true);
    expect(kq.loi_cau_truc).toEqual([]);
  });
});
