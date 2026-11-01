// Ngày theo việc khác (db/45-phu-thuoc.sql, so-cai/phu-thuoc.ts) + việc treo + nguyên tắc sinh mã việc.
// Ví dụ của sếp: đổ bê tông chỉ bắt đầu sau khi xong ván khuôn và cốt pha; hồ sơ xong 2 ngày sau khi làm việc với đối tác MAC.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import type { DauVaoSoCai, DongCongViec, NguoiDungPhien } from "@/lib/types";
import { chiTietViec, danhSachSoCai, ghiVaoSoCai, ketThucPhanViec } from "@/lib/so-cai/dich-vu";
import { docMocViec } from "@/lib/so-cai/moc-viec";
import { giaiMocBaoCao } from "@/lib/so-cai/phu-thuoc";
import { homNayVN, congNgay } from "@/lib/so-cai/tien-ich";
import { ghiCauHinh } from "@/lib/cau-hinh/ghi";
import { layCauHinh } from "@/lib/cau-hinh/doc";

const BQ = { loai: "don_vi" as const, id: "bqlda-qt", ten: "BQLDA Quảng Trị" };

function dong(dongSo: number, p: Partial<DongCongViec> & { ten: string }): DongCongViec {
  return { phu_trach: [BQ], nguon_bang: "bang_cong_viec", dong_so: dongSo, du_an: "ĐG Hướng Việt", ...p };
}

function baoCao(cv: DongCongViec[]): DauVaoSoCai {
  return {
    tai_lieu_id: null,
    phien_ban: null,
    mau_ma: "form-7",
    nhan: "BQLDA Quảng Trị · Form 7 · tuần 39",
    don_vi_id: "bqlda-qt",
    cap: 3,
    nguoi_gui: "gd.bqlda@scigroup.vn",
    ky_bao_cao_den: "2026-09-27",
    ngay_gui: "2026-09-25T02:00:00.000Z",
    cong_viec: cv,
  };
}

async function ketThucHet(nd: NguoiDungPhien, cvId: string) {
  const ct = await tx((q) => chiTietViec(q, cvId));
  for (const p of ct!.phan_viec) await tx((q) => ketThucPhanViec(q, nd, p.id, { ghi_chu: "xong" }));
}

describe("ngày theo việc khác", () => {
  let gd: NguoiDungPhien;
  const ma: Record<string, string> = {};

  beforeAll(async () => {
    await csdlMoi();
    gd = await nguoi("gd.bqlda@scigroup.vn");
    const ds = [
      dong(1, { ten: "Làm ván khuôn móng M1", bat_dau: "2026-09-21", ket_thuc: "2026-09-30" }),
      dong(2, { ten: "Làm cốt pha móng M1", bat_dau: "2026-09-21", ket_thuc: "2026-09-30" }),
      dong(3, { ten: "Đổ bê tông móng M1", ket_thuc: "2026-10-10", bat_dau_kieu: "sau_viec", bat_dau_sau: docMocViec("Sau khi làm xong 2 việc làm ván khuôn và làm cốt pha")! }),
      dong(4, { ten: "Làm việc với đối tác MAC", bat_dau: "2026-09-25", ket_thuc: "2026-10-02" }),
      dong(5, { ten: "Hoàn thiện hồ sơ thiết kế", bat_dau: "2026-09-25", ket_thuc_sau: docMocViec("Sau 2 ngày tính từ khi làm việc với đối tác MAC")! }),
      dong(6, { ten: "Theo dõi thủ tục đất", bat_dau: "2026-09-25" }), // không có hạn → treo
    ];
    // Lúc kiểm tra: tên việc mốc khớp đúng dòng trong cùng báo cáo
    const tb = await tx((q) => giaiMocBaoCao(q, ds));
    expect(tb.filter((t) => t.muc === "canh_bao")).toEqual([]);
    expect(ds[2].bat_dau_sau!.viec.map((v) => v.dong)).toEqual([1, 2]);
    expect(ds[4].ket_thuc_sau!.viec.map((v) => v.dong)).toEqual([4]);

    const kq = await tx((q) => ghiVaoSoCai(q, baoCao(ds)));
    kq.forEach((r) => (ma[ds[r.dong].ten] = r.cong_viec_id!));
  });

  it("vào sổ cái: việc chờ chưa có ngày, việc treo được cảnh báo", async () => {
    const sc = await tx((q) => danhSachSoCai(q));
    const be = sc.find((v) => v.id === ma["Đổ bê tông móng M1"])!;
    expect(be.bat_dau).toBeNull();
    expect(be.phu_thuoc.map((p) => [p.loai, p.viec_truoc_id, p.xong])).toEqual([
      ["bat_dau", ma["Làm ván khuôn móng M1"], false],
      ["bat_dau", ma["Làm cốt pha móng M1"], false],
    ]);
    const hs = sc.find((v) => v.id === ma["Hoàn thiện hồ sơ thiết kế"])!;
    expect(hs.ket_thuc).toBeNull();
    expect(hs.luon_mo).toBe(false); // chờ mốc, không phải việc treo
    expect(hs.treo).toBe(false);
    const dat = sc.find((v) => v.id === ma["Theo dõi thủ tục đất"])!;
    expect(dat.treo).toBe(true);
    expect(dat.luon_mo).toBe(true);
  });

  it("xong một trong hai việc trước: chưa tính; xong cả hai: bắt đầu = ngày xong", async () => {
    await ketThucHet(gd, ma["Làm ván khuôn móng M1"]);
    let be = await tx((q) => chiTietViec(q, ma["Đổ bê tông móng M1"]));
    expect(be!.bat_dau).toBeNull();
    await ketThucHet(gd, ma["Làm cốt pha móng M1"]);
    be = await tx((q) => chiTietViec(q, ma["Đổ bê tông móng M1"]));
    expect(be!.bat_dau).toBe(homNayVN());
    expect(be!.phan_viec.every((p) => p.bat_dau === homNayVN())).toBe(true);
    const { rows } = await query<{ n: number }>(
      "SELECT count(*)::int AS n FROM docflow.lich_su WHERE doi_tuong_id = $1 AND hanh_dong = 'tu_tinh_ngay'",
      [ma["Đổ bê tông móng M1"]],
    );
    expect(Number(rows[0].n)).toBe(1);
  });

  it("mốc sự kiện xong: hạn = ngày xong + 2, có thông báo cho phụ trách", async () => {
    await ketThucHet(gd, ma["Làm việc với đối tác MAC"]);
    const hs = await tx((q) => chiTietViec(q, ma["Hoàn thiện hồ sơ thiết kế"]));
    expect(hs!.ket_thuc).toBe(congNgay(homNayVN(), 2));
    expect(hs!.luon_mo).toBe(false);
    expect(hs!.phan_viec.every((p) => p.ket_thuc === congNgay(homNayVN(), 2) && !p.luon_mo)).toBe(true);
    const { rows } = await query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.thong_bao WHERE loai = 'tu_tinh_ngay'");
    expect(Number(rows[0].n)).toBeGreaterThan(0);
  });

  it("mốc theo mã việc đã xong từ trước: tính ngay khi vào sổ cái", async () => {
    const vk = ma["Làm ván khuôn móng M1"];
    const d = dong(1, { ten: "Tháo ván khuôn móng M1", ket_thuc: "2026-10-20", bat_dau_sau: docMocViec(`Sau ${vk} + 7 ngày`)! });
    const [r] = await tx((q) => ghiVaoSoCai(q, { ...baoCao([d]), nhan: "BQLDA Quảng Trị · Form 7 · tuần 40" }));
    const ct = await tx((q) => chiTietViec(q, r.cong_viec_id!));
    expect(ct!.bat_dau).toBe(congNgay(homNayVN(), 7));
  });

  it("không tìm được việc mốc → cảnh báo khi kiểm tra", async () => {
    const ds = [dong(1, { ten: "Nghiệm thu", ket_thuc: "2026-10-30", bat_dau_sau: docMocViec("Sau khi xong lắp đặt tua-bin số 9")! })];
    const tb = await tx((q) => giaiMocBaoCao(q, ds));
    expect(tb).toEqual([expect.objectContaining({ muc: "canh_bao", loai: "bat_dau" })]);
    expect(tb[0].thong_diep).toContain("không tìm thấy việc mốc");
  });
});

describe("nguyên tắc sinh mã việc trong Cài đặt", () => {
  it("theo đơn vị lập: BQLDA-QT-2026-0001", async () => {
    await csdlMoi();
    const qt = await nguoi("quantri@scigroup.vn");
    await tx(async (q) => ghiCauHinh(q, qt, "so_cai", { ...(await layCauHinh(q, "so_cai")), nguyen_tac_ma_viec: "{don_vi}-{nam}-{so:4}" }));
    const [r] = await tx((q) => ghiVaoSoCai(q, baoCao([dong(1, { ten: "Việc thử mã", ket_thuc: "2026-10-01" })])));
    expect(r.cong_viec_id).toBe("BQLDA-QT-2026-0001");
  });
});
