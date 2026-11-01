// Sổ cái: vào sổ cái theo quy tắc đè, gợi ý trùng, phần việc + nút Kết thúc, nhắc hạn, dòng cho agent.
// Bám ví dụ kế hoạch v2: GPMB Trụ T11 (CV-0412), relay R21 Nậm Xe (CV-0415).
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import type { DauVaoSoCai, DongCongViec } from "@/lib/types";
import {
  chiTietViec,
  danhDauChoSua,
  danhSachSoCai,
  dongViec,
  giaHan,
  giaoViec,
  ghiVaoSoCai,
  ketThucPhanViec,
  quetHan,
  themPhanViec,
  botPhanViec,
  doiNguoi,
  viecDaXong,
  xemTruocVaoSoCai,
} from "@/lib/so-cai/dich-vu";
import { dongChoAgent } from "@/lib/so-cai/dinh-dang-agent";

const BQ = { loai: "don_vi" as const, id: "bqlda-qt", ten: "BQLDA Quảng Trị" };
const DT = { loai: "don_vi" as const, id: "p-dtpc", ten: "Phòng Đầu tư và Pháp chế" };

function dong(p: Partial<DongCongViec> & { ten: string }): DongCongViec {
  return { phu_trach: [], nguon_bang: "bang_cong_viec", dong_so: 1, ...p };
}

function baoCaoBqlda(tuan: number, kyDen: string, ngayGui: string, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai {
  return {
    tai_lieu_id: null,
    phien_ban: null,
    mau_ma: "form-7",
    nhan: `BQLDA Quảng Trị · Form 7 · tuần ${tuan}`,
    don_vi_id: "bqlda-qt",
    cap: 3,
    nguoi_gui: "gd.bqlda@scigroup.vn",
    ky_bao_cao_den: kyDen,
    ngay_gui: ngayGui,
    cong_viec: cv,
    ...extra,
  };
}

function baoCaoDtpc(tuan: number, kyDen: string, ngayGui: string, cv: DongCongViec[], extra: Partial<DauVaoSoCai> = {}): DauVaoSoCai {
  return {
    tai_lieu_id: null,
    phien_ban: null,
    mau_ma: "form-1",
    nhan: `Phòng Đầu tư và Pháp chế · Form 1 · tuần ${tuan}`,
    don_vi_id: "p-dtpc",
    cap: 2,
    nguoi_gui: "truong.dtpc@scigroup.vn",
    ky_bao_cao_den: kyDen,
    ngay_gui: ngayGui,
    cong_viec: cv,
    ...extra,
  };
}

async function lichSu(id: string): Promise<{ hanh_dong: string; chi_tiet: Record<string, unknown>; nguoi: string }[]> {
  const { rows } = await query<{ hanh_dong: string; chi_tiet: Record<string, unknown>; nguoi: string }>(
    "SELECT hanh_dong, chi_tiet, nguoi FROM docflow.lich_su WHERE doi_tuong_loai = 'cong_viec' AND doi_tuong_id = $1 ORDER BY id",
    [id],
  );
  return rows;
}

describe("sổ cái", () => {
  beforeAll(async () => {
    await csdlMoi();
  });

  describe("chuỗi GPMB T11: BQLDA tuần 28 → tuần 29 → P.ĐT&PC tuần 29", () => {
    let ma = "";
    const tenViec = "GPMB Trụ T11 · 3 hộ khiếu nại đơn giá";

    it("tuần 28 vào sổ cái lần đầu, cấp mã theo cấu hình", async () => {
      const kq = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(28, "2026-07-13", "2026-07-14T03:00:00Z", [dong({ ten: tenViec, du_an: "ĐG Hướng Việt", bat_dau: "2026-07-14", ket_thuc: "2026-07-30" })])),
      );
      expect(kq[0].hanh_dong).toBe("tao_moi");
      ma = kq[0].cong_viec_id!;
      expect(ma).toMatch(/^CV-2026-\d{4}$/);
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.ket_thuc).toBe("2026-07-30");
      expect(ct!.phan_viec).toHaveLength(1);
      expect(ct!.phan_viec[0].phu_trach_ten).toBe("BQLDA Quảng Trị"); // phụ trách trống → đơn vị lập
    });

    it("tuần 29 (ghi mã) cùng cấp, ngày sau đè: hạn 30/07 → 05/08", async () => {
      const kq = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(29, "2026-07-20", "2026-07-21T03:05:00Z", [dong({ ma_viec: ma, ten: tenViec, du_an: "ĐG Hướng Việt", bat_dau: "2026-07-14", ket_thuc: "2026-08-05" })])),
      );
      expect(kq[0]).toMatchObject({ hanh_dong: "de", cong_viec_id: ma });
      expect(kq[0].ly_do).toContain("ngày sau đè");
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.ket_thuc).toBe("2026-08-05");
    });

    it("P.ĐT&PC không ghi mã: xem trước chỉ GỢI Ý trùng, không tự gộp", async () => {
      const dv = baoCaoDtpc(29, "2026-07-20", "2026-07-22T02:00:00Z", [
        dong({ ten: "GPMB trụ T11 (3 hộ khiếu nại)", du_an: "ĐG Hướng Việt", phu_trach: [BQ], bat_dau: "2026-07-14", ket_thuc: "2026-08-10" }),
      ]);
      const xt = await tx((q) => xemTruocVaoSoCai(q, dv));
      expect(xt[0].hanh_dong).toBe("goi_y_trung");
      expect(xt[0].goi_y![0].cong_viec_id).toBe(ma);
      // Xem trước không ghi gì
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.cac_nguon).toHaveLength(2);

      // Người gửi xác nhận trùng → cấp cao hơn đè
      const kq = await tx((q) => ghiVaoSoCai(q, { ...dv, xac_nhan_trung: { 0: ma } }));
      expect(kq[0]).toMatchObject({ hanh_dong: "de", cong_viec_id: ma, ly_do: "cấp cao hơn đè" });
      const sau = await tx((q) => chiTietViec(q, ma));
      expect(sau!.ket_thuc).toBe("2026-08-10");
      expect(sau!.nguon_hien_hanh!.nhan).toBe("Phòng Đầu tư và Pháp chế · Form 1 · tuần 29");
      expect(sau!.so_ban_da_de).toBe(2);
      expect(sau!.cac_nguon.map((n) => n.trang_thai)).toEqual(["bi_de", "bi_de", "hien_hanh"]);
    });

    it("đơn vị cấp thấp gửi sau không đè được; bản vẫn lưu + báo người gửi lý do", async () => {
      const kq = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(30, "2026-07-27", "2026-07-28T02:00:00Z", [dong({ ma_viec: ma, ten: tenViec, ket_thuc: "2026-08-12" })])),
      );
      expect(kq[0]).toMatchObject({ hanh_dong: "khong_dung", ly_do: "thua cấp" });
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.ket_thuc).toBe("2026-08-10");
      expect(ct!.cac_nguon.filter((n) => n.trang_thai === "khong_dung")).toHaveLength(1);
      const { rows } = await query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = 'gd.bqlda@scigroup.vn' AND loai = 'ban_khong_dung'");
      expect(rows[0].noi_dung).toContain("thua cấp");
      const ls = await lichSu(ma);
      expect(ls.map((l) => l.hanh_dong)).toEqual(["vao_so_cai", "bi_de", "bi_de", "khong_dung"]);
      expect(ls[1].chi_tiet).toMatchObject({ han_cu: "2026-07-30", han_moi: "2026-08-05", bi_de: "BQLDA Quảng Trị · Form 7 · tuần 28" });
    });

    it("gợi ý trùng mà không xác nhận thì tạo việc mới, không gộp", async () => {
      const dv = baoCaoDtpc(30, "2026-07-27", "2026-07-29T02:00:00Z", [dong({ ten: "GPMB trụ T11 khiếu nại đơn giá", du_an: "ĐG Hướng Việt", ket_thuc: "2026-08-20" })]);
      const kq = await tx((q) => ghiVaoSoCai(q, dv));
      expect(kq[0].hanh_dong).toBe("tao_moi");
      expect(kq[0].cong_viec_id).not.toBe(ma);
      expect(kq[0].goi_y?.[0].cong_viec_id).toBe(ma);
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.ket_thuc).toBe("2026-08-10"); // việc cũ không bị đụng
      // 'moi' = người gửi chọn tạo mới: không còn gợi ý
      const xt = await tx((q) => xemTruocVaoSoCai(q, { ...dv, cong_viec: [dong({ ten: "GPMB trụ T11 lần 2", du_an: "ĐG Hướng Việt" })], xac_nhan_trung: { 0: "moi" } }));
      expect(xt[0].hanh_dong).toBe("tao_moi");
    });
  });

  describe("10 bước: BQLDA → Form 0 TGĐ quyết định → 2 đơn vị kết thúc → rời sổ cái", () => {
    let ma = "";
    it("BQLDA tuần 28 và tuần 29 vào sổ cái", async () => {
      const k1 = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(28, "2026-07-13", "2026-07-14T03:00:00Z", [dong({ ten: "Chi trả GPMB Trụ T11", du_an: "ĐG Hướng Việt Nam Sơn", ket_thuc: "2026-07-30", phu_trach: [BQ] })])),
      );
      ma = k1[0].cong_viec_id!;
      const k2 = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(29, "2026-07-20", "2026-07-21T03:05:00Z", [dong({ ma_viec: ma, ten: "Chi trả GPMB Trụ T11", du_an: "ĐG Hướng Việt Nam Sơn", ket_thuc: "2026-08-05", phu_trach: [BQ] })])),
      );
      expect(k2[0].hanh_dong).toBe("de");
    });

    it("nhân viên không giao việc theo quyết định được", async () => {
      const nv = await nguoi("nv.dtpc@scigroup.vn");
      await expect(tx((q) => giaoViec(q, nv, { ten: "x", phan_viec: [BQ], la_quyet_dinh: true }))).rejects.toThrow();
    });

    it("TGĐ quyết định, BQLDA chủ trì + P.ĐT&PC phối hợp: Form 0 cấp 1 đè bản của BQLDA · 0/1", async () => {
      const tgd = await nguoi("tgd@scigroup.vn");
      const id = await tx((q) =>
        giaoViec(q, tgd, {
          cong_viec_id: ma,
          ten: "Chi trả GPMB Trụ T11",
          du_an: "ĐG Hướng Việt",
          bat_dau: "2026-07-28",
          ket_thuc: "2026-08-05",
          la_quyet_dinh: true,
          phan_viec: [
            { ...BQ, noi_dung: "Thỏa thuận với 3 hộ" },
            { ...DT, noi_dung: "Công văn gửi UBND huyện Hướng Hóa" },
          ],
        }),
      );
      expect(id).toBe(ma);
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.tien_do).toBe("0/1"); // tiến độ chỉ tính phần chủ trì
      expect(ct!.phan_viec.map((p) => [p.phu_trach_id, p.vai, p.ket_thuc])).toEqual([
        ["bqlda-qt", "chu_tri", "2026-08-05"],
        ["p-dtpc", "phoi_hop", null], // phối hợp không hạn riêng
      ]);
      expect(ct!.nguon_hien_hanh!.cap).toBe(1);
      expect(ct!.so_ban_da_de).toBe(2);
      expect(ct!.giao_boi).toBe("tgd@scigroup.vn");
    });

    it("BQLDA gửi tuần 30 sau quyết định: không đè được", async () => {
      const k = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(30, "2026-07-27", "2026-07-29T02:00:00Z", [dong({ ma_viec: ma, ten: "Chi trả GPMB Trụ T11", ket_thuc: "2026-08-12", phu_trach: [BQ] })])),
      );
      expect(k[0].hanh_dong).toBe("khong_dung");
      expect(k[0].ly_do).toContain("thua cấp");
    });

    it("người P.ĐT&PC không bấm được phần chủ trì của BQLDA; phối hợp xong phần mình → việc vẫn mở 0/1", async () => {
      const ct = await tx((q) => chiTietViec(q, ma));
      const pBq = ct!.phan_viec.find((p) => p.phu_trach_id === "bqlda-qt")!;
      const pDt = ct!.phan_viec.find((p) => p.phu_trach_id === "p-dtpc")!;
      const nvDt = await nguoi("nv.dtpc@scigroup.vn");
      await expect(tx((q) => ketThucPhanViec(q, nvDt, pBq.id, {}))).rejects.toThrow(/Chỉ/);
      const kq = await tx((q) => ketThucPhanViec(q, nvDt, pDt.id, { ghi_chu: "Đã gửi công văn" }));
      expect(kq).toEqual({ tien_do: "0/1", hoan_thanh: false }); // phối hợp không đóng được việc
      await expect(tx((q) => ketThucPhanViec(q, nvDt, pDt.id, {}))).rejects.toThrow(/đã kết thúc/);
    });

    it("dongChoAgent đúng tên trường mẫu JSON", async () => {
      const a = await tx((q) => dongChoAgent(q, ma));
      expect(Object.keys(a!).sort()).toEqual(
        ["ma_viec", "ten_viec", "du_an", "nguon_hien_hanh", "da_de", "luon_mo", "bat_dau", "ket_thuc", "phan_viec", "tien_do", "canh_bao", "trang_thai", "qua_trinh"].sort(),
      );
      expect(a).toMatchObject({
        ma_viec: ma,
        ten_viec: "Chi trả GPMB Trụ T11",
        du_an: "ĐG Hướng Việt",
        nguon_hien_hanh: { don_vi: "Ban Tổng giám đốc", cap: 1 },
        da_de: ["BQLDA Quảng Trị · Form 7 · tuần 28", "BQLDA Quảng Trị · Form 7 · tuần 29"],
        luon_mo: false,
        bat_dau: "2026-07-28",
        ket_thuc: "2026-08-05",
        tien_do: "0/1",
        trang_thai: "dang_mo",
      });
      expect(a!.phan_viec).toEqual([
        { phu_trach: "BQLDA Quảng Trị", vai: "chủ trì", noi_dung: "Thỏa thuận với 3 hộ", trang_thai: "dang_lam", ket_thuc: "2026-08-05" },
        { phu_trach: "Phòng Đầu tư và Pháp chế", vai: "phối hợp", noi_dung: "Công văn gửi UBND huyện Hướng Hóa", trang_thai: "da_ket_thuc", ket_thuc: null },
      ]);
      expect(Object.keys(a!.nguon_hien_hanh!).sort()).toEqual(["bao_cao", "cap", "don_vi"]);
      const sk = a!.qua_trinh.map((x) => x.su_kien);
      expect(sk).toEqual(["vao_so_cai", "bi_de", "bi_de", "giao_viec", "khong_dung", "ket_thuc_phan_viec"]);
      expect(a!.qua_trinh[0]).toMatchObject({ tu: "BQLDA Quảng Trị · Form 7 · tuần 28" });
      expect(a!.qua_trinh[0].luc).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    it("trưởng BQLDA (chủ trì) bấm thay đơn vị → 1/1, việc hoàn thành, rời sổ cái, đủ lịch sử", async () => {
      const ct = await tx((q) => chiTietViec(q, ma));
      const pBq = ct!.phan_viec.find((p) => p.phu_trach_id === "bqlda-qt")!;
      const gd = await nguoi("gd.bqlda@scigroup.vn");
      const kq = await tx((q) => ketThucPhanViec(q, gd, pBq.id, { ghi_chu: "đã ký biên bản với 3 hộ" }));
      expect(kq).toEqual({ tien_do: "1/1", hoan_thanh: true });
      const ds = await tx((q) => danhSachSoCai(q));
      expect(ds.find((d) => d.id === ma)).toBeUndefined();
      const xong = await tx((q) => viecDaXong(q));
      expect(xong.find((d) => d.id === ma)?.trang_thai).toBe("hoan_thanh");
      const ls = await lichSu(ma);
      expect(ls.at(-1)!.hanh_dong).toBe("cong_viec_hoan_thanh");
      const kt = ls.filter((l) => l.hanh_dong === "ket_thuc_phan_viec");
      expect(kt[0].chi_tiet).toMatchObject({ bam_boi: "Phạm Thu Hà", thay_don_vi: "Phòng Đầu tư và Pháp chế", ghi_chu: "Đã gửi công văn" });
      expect(kt[1].chi_tiet).toMatchObject({ bam_boi: "Trịnh Văn Dũng", thay_don_vi: "BQLDA Quảng Trị", tien_do: "1/1" });
      // Báo cáo tuần sau ghi lại mã: việc đã rời sổ cái, không mở lại
      const k = await tx((q) => ghiVaoSoCai(q, baoCaoBqlda(31, "2026-08-03", "2026-08-04T02:00:00Z", [dong({ ma_viec: ma, ten: "Chi trả GPMB Trụ T11", da_xong: true })])));
      expect(k[0].hanh_dong).toBe("khong_dung");
    });
  });

  describe("CV-0415 relay R21 Nậm Xe: P.KT&VH chủ trì, P.TCKT + NM Nậm Xe phối hợp", () => {
    let ma = "";
    it("P.KT&VH giao việc: dòng đầu chủ trì giữ hạn, hai dòng sau phối hợp không hạn riêng", async () => {
      const truong = await nguoi("truong.ktvh@scigroup.vn");
      // Hạn để năm 2099: từ 04/10/2026 giaoViec chặn hạn đã qua (Mr. Đại chốt) — ngày cố định 2026 làm bài hỏng dần
      // Chốt 30/09: giao trong phòng mình phải chọn MỘT nhân viên làm chủ trì (anh Hùng — P.KT&VH)
      const hungNd = await nguoi("hung.tv@scigroup.vn");
      ma = await tx((q) =>
        giaoViec(q, truong, {
          ten: "Thay relay bảo vệ R21 máy phát TM2",
          du_an: "NM Nậm Xe",
          phan_viec: [
            { loai: "nguoi", id: hungNd.id, ten: "", noi_dung: "Thay relay R21", bat_dau: "2099-07-21", ket_thuc: "2099-07-31" },
            { loai: "don_vi", id: "p-tckt", ten: "", noi_dung: "Thanh toán nhà cung cấp", bat_dau: "2099-07-23", ket_thuc: "2099-07-25" },
            { loai: "don_vi", id: "nm-namxe", ten: "", noi_dung: "Lắp đặt, thí nghiệm relay", bat_dau: "2099-07-26", ket_thuc: "2099-08-05" },
          ],
        }),
      );
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.bat_dau).toBe("2099-07-21");
      expect(ct!.ket_thuc).toBe("2099-07-31"); // hạn của chủ trì, không lấy hạn dòng phối hợp
      expect(ct!.tien_do).toBe("0/1");
      expect(ct!.phan_viec.map((p) => [p.phu_trach_ten, p.vai, p.ket_thuc])).toEqual([
        ["Trần Văn Hùng", "chu_tri", "2099-07-31"],
        ["Phòng Tài chính Kế toán", "phoi_hop", null],
        ["Nhà máy thủy điện Nậm Xe", "phoi_hop", null],
      ]);
    });

    it("mỗi người chỉ kết thúc được phần của mình; phối hợp xong không đóng việc; chủ trì xong → việc xong, phối hợp tự đóng theo", async () => {
      const ct = await tx((q) => chiTietViec(q, ma));
      const [pKt, pTc, pNx] = ct!.phan_viec;
      const hung = await nguoi("hung.tv@scigroup.vn");
      await expect(tx((q) => ketThucPhanViec(q, hung, pTc.id, {}))).rejects.toThrow();
      const gdNx = await nguoi("gd.namxe@scigroup.vn");
      await expect(tx((q) => ketThucPhanViec(q, gdNx, pKt.id, {}))).rejects.toThrow();
      const tckt = await nguoi("truong.tckt@scigroup.vn");
      expect(await tx((q) => ketThucPhanViec(q, tckt, pTc.id, { tep_ket_qua: [] }))).toEqual({ tien_do: "0/1", hoan_thanh: false });
      expect((await tx((q) => danhSachSoCai(q))).find((d) => d.id === ma)?.tien_do).toBe("0/1");
      expect(await tx((q) => ketThucPhanViec(q, hung, pKt.id, { ghi_chu: "Đã thí nghiệm đạt" }))).toEqual({ tien_do: "1/1", hoan_thanh: true });
      expect((await tx((q) => danhSachSoCai(q))).find((d) => d.id === ma)).toBeUndefined();
      const nx = (await tx((q) => q.query<{ trang_thai: string; ghi_chu: string | null }>("SELECT trang_thai, ghi_chu FROM docflow.phan_viec WHERE id = $1", [pNx.id]))).rows[0];
      expect(nx).toEqual({ trang_thai: "da_ket_thuc", ghi_chu: "Tự đóng theo chủ trì" });
      const tb = await tx((q) =>
        q.query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao WHERE nguoi_nhan = 'gd.namxe@scigroup.vn' AND noi_dung LIKE $1", [`%${ma}%phối hợp%hoàn thành%`]),
      );
      expect(tb.rows[0].n).toBe(1); // bên phối hợp được báo việc đã xong
    });
  });

  describe("luôn mở, quá hạn, nhắc hạn", () => {
    let luonMo = "";
    let coHan = "";
    it("việc không ngày: luôn mở, không bao giờ quá hạn", async () => {
      const kq = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(29, "2026-07-20", "2026-07-21T03:05:00Z", [
          dong({ ten: "Chuyển mục đích đất rừng T14–T16", phu_trach: [BQ], dong_so: 2 }),
          dong({ ten: "Thi công móng trụ T5–T8", phu_trach: [BQ], bat_dau: "2026-07-01", ket_thuc: "2026-08-15", dong_so: 3 }),
        ])),
      );
      luonMo = kq[0].cong_viec_id!;
      coHan = kq[1].cong_viec_id!;
      const ds = await tx((q) => danhSachSoCai(q, { hom_nay: "2030-01-01" }));
      const a = ds.find((d) => d.id === luonMo)!;
      expect(a.luon_mo).toBe(true);
      expect(a.canh_bao).toBeNull();
      expect(ds.find((d) => d.id === coHan)!.canh_bao).toBe("qua_han");
      expect((await tx((q) => danhSachSoCai(q, { luon_mo: true, hom_nay: "2026-07-22" }))).map((d) => d.id)).toContain(luonMo);
      expect((await tx((q) => danhSachSoCai(q, { hom_nay: "2026-08-13" }))).find((d) => d.id === coHan)!.canh_bao).toBe("sap_den_han");
    });

    it("quét hạn: phát hiện quá hạn, báo phụ trách + người giao, lịch sử một lần mỗi ngày", async () => {
      const r1 = await tx((q) => quetHan(q, "2026-08-16"));
      expect(r1.qua_han).toBeGreaterThanOrEqual(1);
      await tx((q) => quetHan(q, "2026-08-16"));
      let ls = (await lichSu(coHan)).filter((l) => l.hanh_dong === "qua_han");
      expect(ls).toHaveLength(1);
      expect(ls[0].chi_tiet).toMatchObject({ han: "2026-08-15", ngay: "2026-08-16" });
      expect((await lichSu(luonMo)).some((l) => l.hanh_dong === "qua_han")).toBe(false);
      const { rows } = await query<{ nguoi_nhan: string }>("SELECT DISTINCT nguoi_nhan FROM docflow.thong_bao WHERE loai = 'qua_han' AND lien_ket = $1", [`/cong-viec/${coHan}`]);
      const nhan = rows.map((r) => r.nguoi_nhan);
      expect(nhan).toContain("gd.bqlda@scigroup.vn"); // người giao + trưởng đơn vị phụ trách
      expect(nhan).not.toContain("nv.bqlda@scigroup.vn"); // việc của CẢ đơn vị: nhân viên không nhận (chốt K2 02/10)
      await tx((q) => quetHan(q, "2026-08-17"));
      ls = (await lichSu(coHan)).filter((l) => l.hanh_dong === "qua_han");
      expect(ls).toHaveLength(2);
    });

    it("chỉ người giao (hoặc đủ quyền) được gia hạn, thêm/bớt, đổi người, đóng việc có lý do", async () => {
      const hung = await nguoi("hung.tv@scigroup.vn");
      await expect(tx((q) => giaHan(q, hung, { cong_viec_id: coHan, ket_thuc: "2026-09-30" }))).rejects.toThrow(/Chỉ người giao/);
      const gd = await nguoi("gd.bqlda@scigroup.vn");
      await tx((q) => giaHan(q, gd, { cong_viec_id: coHan, ket_thuc: "2026-09-30", ly_do: "chờ vật tư" }));
      expect((await tx((q) => chiTietViec(q, coHan)))!.phan_viec[0].ket_thuc).toBe("2026-09-30");
      const pvId = await tx((q) => themPhanViec(q, gd, { cong_viec_id: coHan, phu_trach: { loai: "don_vi", id: "sci-enc", ten: "" } }));
      await tx((q) => doiNguoi(q, gd, { phan_viec_id: pvId, phu_trach: { loai: "nguoi", id: "nv.enc@scigroup.vn", ten: "" }, ly_do: "giao cho người cụ thể" }));
      const ct = await tx((q) => chiTietViec(q, coHan));
      expect(ct!.phan_viec.find((p) => p.id === pvId)!.phu_trach_ten).toBe("Đặng Thị Hoa");
      await expect(tx((q) => botPhanViec(q, gd, { phan_viec_id: pvId, ly_do: "" }))).rejects.toThrow(/lý do/);
      await tx((q) => botPhanViec(q, gd, { phan_viec_id: pvId, ly_do: "không cần nữa" }));
      await expect(tx((q) => dongViec(q, gd, { cong_viec_id: coHan, ly_do: "  " }))).rejects.toThrow(/lý do/);
      // Công tắc "Chỉ người giao việc…" BẬT (mặc định) = đúng chữ (Mr. Đại chốt 28/09): trưởng P.ĐT&PC là cấp trên cũng KHÔNG sửa được
      const tp = await nguoi("truong.dtpc@scigroup.vn");
      await expect(tx((q) => dongViec(q, tp, { cong_viec_id: coHan, ly_do: "gộp vào gói thầu khác" }))).rejects.toThrow(/hoặc lãnh đạo/);
      await tx((q) => dongViec(q, gd, { cong_viec_id: coHan, ly_do: "gộp vào gói thầu khác" })); // người giao (trưởng đơn vị lập) hủy được
      const sau = await tx((q) => chiTietViec(q, coHan));
      expect(sau!.trang_thai).toBe("da_dong");
      expect(sau!.ly_do_dong).toBe("gộp vào gói thầu khác");
      const hd = (await lichSu(coHan)).map((l) => l.hanh_dong);
      for (const h of ["gia_han", "them_phan_viec", "doi_nguoi", "bot_phan_viec", "dong_viec"]) expect(hd).toContain(h);
    });
  });

  describe("người giao của việc từ báo cáo (Mr. Đại chốt 28/09)", () => {
    it("nhân viên bấm gửi báo cáo → người giao là TRƯỞNG đơn vị lập, nhân viên không gia hạn / hủy được", async () => {
      const k = await tx((q) =>
        ghiVaoSoCai(q, baoCaoBqlda(35, "2026-08-31", "2026-09-01T02:00:00Z", [dong({ ten: "Đo điện trở nối đất T25", ket_thuc: "2026-09-20", phu_trach: [BQ] })], { nguoi_gui: "nv.bqlda@scigroup.vn" })),
      );
      const ma = k[0].cong_viec_id!;
      expect((await tx((q) => chiTietViec(q, ma)))!.giao_boi).toBe("gd.bqlda@scigroup.vn");
      const nv = await nguoi("nv.bqlda@scigroup.vn");
      await expect(tx((q) => giaHan(q, nv, { cong_viec_id: ma, ket_thuc: "2026-09-30", ly_do: "thử" }))).rejects.toThrow(/Chỉ người giao/);
    });
  });

  describe("cùng tài liệu gửi lại bản mới, đã xong, chờ sửa", () => {
    it("bản 2 của cùng tài liệu đè bản 1 theo dòng cùng tên; gọi lại không ghi hai lần", async () => {
      await query("INSERT INTO docflow.tai_lieu (id, ten, nguoi_tao) VALUES ('tl-test-1', 'BaoCao_Tuan29_BQLDA.docx', 'gd.bqlda@scigroup.vn')");
      const d1 = baoCaoBqlda(29, "2026-07-20", "2026-07-21T02:40:00Z", [dong({ ten: "Đền bù trụ T20", ket_thuc: "2026-08-15", phu_trach: [BQ] })], { tai_lieu_id: "tl-test-1", phien_ban: 1 });
      const k1 = await tx((q) => ghiVaoSoCai(q, d1));
      const ma = k1[0].cong_viec_id!;
      const d2 = { ...d1, phien_ban: 2, ngay_gui: "2026-07-21T03:05:00Z", cong_viec: [dong({ ten: "Đền bù trụ T20", ket_thuc: "2026-08-20", phu_trach: [BQ] })] };
      const k2 = await tx((q) => ghiVaoSoCai(q, d2));
      expect(k2[0]).toMatchObject({ hanh_dong: "de", cong_viec_id: ma });
      expect(k2[0].ly_do).toContain("cùng tài liệu");
      const k3 = await tx((q) => ghiVaoSoCai(q, d2));
      expect(k3[0].ly_do).toContain("đã vào sổ cái");
      expect((await tx((q) => chiTietViec(q, ma)))!.cac_nguon).toHaveLength(2);

      await tx((q) => danhDauChoSua(q, "tl-test-1", true, "truong.dtpc@scigroup.vn"));
      expect((await tx((q) => chiTietViec(q, ma)))!.cho_sua).toBe(true);
      await tx((q) => danhDauChoSua(q, "tl-test-1", false, "gd.bqlda@scigroup.vn"));
      expect((await tx((q) => chiTietViec(q, ma)))!.cho_sua).toBe(false);
      expect((await lichSu(ma)).filter((l) => l.hanh_dong === "cho_sua")).toHaveLength(2);
    });

    it("gửi lại bản 2 KHÔNG lách được quy tắc cấp: bản 1 thua cấp thì bản 2 cũng thua (đo 30/09, CV-0009 Nậm Xe)", async () => {
      const k = await tx((q) => ghiVaoSoCai(q, baoCaoDtpc(40, "2026-10-04", "2026-09-29T02:00:00Z", [dong({ ten: "Thay relay bảo vệ R21", ket_thuc: "2026-10-08", phu_trach: [BQ] })])));
      const ma = k[0].cong_viec_id!;
      await query("INSERT INTO docflow.tai_lieu (id, ten, nguoi_tao) VALUES ('tl-test-lach', 'BQLDA tuan 40.docx', 'gd.bqlda@scigroup.vn')");
      const b1 = baoCaoBqlda(40, "2026-10-04", "2026-09-29T05:00:00Z", [dong({ ten: "Thay relay bảo vệ R21", ket_thuc: "2026-10-20", phu_trach: [BQ] })], { tai_lieu_id: "tl-test-lach", phien_ban: 1, xac_nhan_trung: { 0: ma } });
      const k1 = await tx((q) => ghiVaoSoCai(q, b1));
      expect(k1[0]).toMatchObject({ hanh_dong: "khong_dung", cong_viec_id: ma });
      const k2 = await tx((q) => ghiVaoSoCai(q, { ...b1, phien_ban: 2, ngay_gui: "2026-09-30T01:00:00Z", xac_nhan_trung: undefined }));
      expect(k2[0].hanh_dong).toBe("khong_dung");
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.nguon_hien_hanh!.don_vi_id).toBe("p-dtpc");
      expect(ct!.ket_thuc).toBe("2026-10-08");
    });

    it("'đã xong' từ đơn vị thực hiện được ghi nhận không xét cấp: đóng phần của đơn vị đó", async () => {
      const k = await tx((q) =>
        ghiVaoSoCai(q, baoCaoDtpc(29, "2026-07-20", "2026-07-22T02:00:00Z", [dong({ ten: "Hồ sơ thu hồi đất T22", ket_thuc: "2026-08-30", phu_trach: [BQ, DT] })])),
      );
      const ma = k[0].cong_viec_id!;
      const k2 = await tx((q) => ghiVaoSoCai(q, baoCaoBqlda(30, "2026-07-27", "2026-07-28T02:00:00Z", [dong({ ma_viec: ma, ten: "Hồ sơ thu hồi đất T22", da_xong: true })])));
      expect(k2[0].hanh_dong).toBe("dong_viec");
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.tien_do).toBe("1/1"); // BQLDA đứng đầu = chủ trì → việc xong
      expect(ct!.trang_thai).toBe("hoan_thanh");
      expect(ct!.nguon_hien_hanh!.don_vi_id).toBe("p-dtpc"); // nội dung vẫn theo bản cấp cao hơn
    });

    it("Form 0: đọc dòng cần TGĐ quyết định, giao việc cấp 1, không giao trùng một dòng", async () => {
      const { dongQuyetDinh, viecCuaTaiLieu } = await import("@/lib/so-cai/doc-them");
      await query("INSERT INTO docflow.tai_lieu (id, ten, nguoi_tao, don_vi_lap, ky_bao_cao) VALUES ('tl-f0', 'BC hợp nhất tuần 30', 'photgd@scigroup.vn', 'ban-tgd', $1)", [
        JSON.stringify({ loai: "tuan", so: 30, nam: 2026, den: "2026-07-27" }),
      ]);
      const kq = {
        cong_viec: [
          { ten: "Nâng đơn giá GPMB Trụ T20", du_an: "ĐG Hướng Việt", phu_trach: [BQ], nguon_bang: "bang_quyet_dinh", dong_so: 1 },
          { ten: "Việc thường", phu_trach: [], nguon_bang: "bang_cong_viec", dong_so: 1 },
        ],
      };
      await query(
        "INSERT INTO docflow.phien_ban_tep (tai_lieu_id, phien_ban, ten_tep, mime, kich_thuoc, sha256, khoa_luu, tai_len_boi, ket_qua_kiem_tra) VALUES ('tl-f0', 1, 'f0.docx', 'x', 1, 'x', 'x', 'photgd@scigroup.vn', $1)",
        [JSON.stringify(kq)],
      );
      const d = await tx((q) => dongQuyetDinh(q, "tl-f0", 1));
      expect(d!.nhan).toBe("Ban Tổng giám đốc · Form 0 · tuần 30");
      expect(d!.dong).toHaveLength(1);
      expect(d!.dong[0].goi_y.length).toBeGreaterThan(0); // gợi ý việc đang mở có vẻ trùng
      const tgd = await nguoi("tgd@scigroup.vn");
      const v = { ten: "Nâng đơn giá GPMB Trụ T20", phan_viec: [{ ...BQ, ket_thuc: "2026-08-15" }], la_quyet_dinh: true, tu_tai_lieu: { tai_lieu_id: "tl-f0", phien_ban: 1, dong_so: 1, nhan: d!.nhan } };
      const ma = await tx((q) => giaoViec(q, tgd, v));
      await expect(tx((q) => giaoViec(q, tgd, v))).rejects.toThrow(/đã được giao/);
      expect((await tx((q) => dongQuyetDinh(q, "tl-f0", 1)))!.dong[0].da_giao).toBe(ma);
      const ct = await tx((q) => chiTietViec(q, ma));
      expect(ct!.nguon_hien_hanh).toMatchObject({ cap: 1, don_vi_id: "ban-tgd", nhan: "Ban Tổng giám đốc · Form 0 · tuần 30" });
      const gd = await nguoi("gd.bqlda@scigroup.vn");
      const bang = await tx((q) => viecCuaTaiLieu(q, gd, "tl-f0"));
      expect(bang[0].id).toBe(ma);
      expect(bang[0].co_the_ket_thuc).toHaveLength(1);
    });

    it("lọc sổ cái theo đơn vị, người, dự án, từ khóa", async () => {
      const ds = await tx((q) => danhSachSoCai(q, { don_vi_id: "bqlda-qt" }));
      expect(ds.length).toBeGreaterThan(0);
      expect(ds.every((d) => d.don_vi_giao === "bqlda-qt" || d.phan_viec.some((p) => p.phu_trach_id === "bqlda-qt"))).toBe(true);
      const tk = await tx((q) => danhSachSoCai(q, { tu_khoa: "dat rung" }));
      expect(tk.map((d) => d.ten)).toContain("Chuyển mục đích đất rừng T14–T16");
      const da = await tx((q) => danhSachSoCai(q, { du_an: "huong viet" }));
      expect(da.length).toBeGreaterThan(0);
      const ng = await tx((q) => danhSachSoCai(q, { nguoi: "nv.bqlda@scigroup.vn" }));
      expect(ng.length).toBeGreaterThan(0);
    });
  });
});
