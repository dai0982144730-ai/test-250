// Trang Tổng quan: hộp Đến của tôi (bước chờ nhận đến đơn vị tôi, kể cả kiêm nhiệm), phần việc của tôi, đếm quá hạn / sắp đến hạn.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, query } from "@/lib/db";
import { duLieuTongQuan } from "@/components/tong-quan/du-lieu";
import { datKiemNhiem } from "@sci/identity/server";
import { nguCanh } from "@/lib/cau-hinh/cau-noi-identity";

async function gieo() {
  await query(`INSERT INTO docflow.tai_lieu (id, ten, don_vi_lap, nguoi_tao) VALUES
    ('tl-1','BaoCao_Tuan29_BQLDA.docx','bqlda-qt','gd.bqlda@scigroup.vn'),
    ('tl-2','BaoCao_Thang7_SCI_ENC.docx','sci-enc','gd.enc@scigroup.vn')`);
  await query(`INSERT INTO docflow.hanh_trinh (id, tai_lieu_goc_id) VALUES ('ht-1','tl-1'),('ht-2','tl-2')`);
  await query(`INSERT INTO docflow.buoc_hanh_trinh (id, hanh_trinh_id, loai, tai_lieu_id, phien_ban, tu_don_vi, tu_nguoi, den_don_vi, trang_thai) VALUES
    ('b-1','ht-1','gui','tl-1',1,'bqlda-qt','gd.bqlda@scigroup.vn','p-dtpc','cho_nhan'),
    ('b-2','ht-2','gui','tl-2',1,'sci-enc','gd.enc@scigroup.vn','p-dtpc','da_nhan'),
    ('b-3','ht-2','chuyen_tiep','tl-2',1,'p-dtpc','truong.dtpc@scigroup.vn','p-tckt','cho_nhan')`);
  await query(`INSERT INTO docflow.cong_viec (id, ten, ket_thuc, luon_mo, trang_thai) VALUES
    ('CV-2026-0001','Chi trả GPMB Trụ T11', current_date - 2, false, 'dang_mo'),
    ('CV-2026-0002','Công văn UBND huyện', current_date + 1, false, 'dang_mo'),
    ('CV-2026-0003','Chuyển mục đích đất rừng', NULL, true, 'dang_mo'),
    ('CV-2026-0004','Việc đã xong', current_date, false, 'hoan_thanh')`);
  await query(`INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, luon_mo, ket_thuc) VALUES
    ('pv-1','CV-2026-0001','don_vi','p-dtpc','Thỏa thuận 3 hộ', false, NULL),
    ('pv-2','CV-2026-0002','nguoi','nv.dtpc@scigroup.vn','Soạn công văn', false, NULL),
    ('pv-3','CV-2026-0003','don_vi','p-dtpc','Hồ sơ chuyển mục đích', true, NULL),
    ('pv-4','CV-2026-0004','don_vi','p-dtpc','Đã xong nên không hiện', false, NULL),
    ('pv-5','CV-2026-0002','nguoi','hung.tv@scigroup.vn','Của người khác', false, NULL)`);
}

describe("identity — tổng quan", () => {
  beforeAll(async () => {
    await csdlMoi();
    await gieo();
  });

  it("nhân viên ĐT&PC: hộp Đến có tài liệu chờ nhận của phòng; phần việc của mình và của phòng; đếm hạn", async () => {
    const ha = await nguoi("nv.dtpc@scigroup.vn");
    const dl = await duLieuTongQuan(await layQ(), ha);
    expect(dl.hop_den.map((h) => h.buoc_id)).toEqual(["b-1"]);
    expect(dl.so_hop_den).toBe(1);
    expect(dl.hop_den[0]).toMatchObject({ tai_lieu_id: "tl-1", tu_don_vi: "BQLDA QT", tu_nguoi: "Trịnh Văn Dũng", den_don_vi: "P.ĐT&PC" });
    expect(dl.phan_viec.map((p) => p.id)).toEqual(["pv-1", "pv-2", "pv-3"]); // quá hạn trước, luôn mở sau cùng
    expect(dl.dem).toEqual({ dang_lam: 3, qua_han: 1, sap_den_han: 1, luon_mo: 1 });
    expect(dl.phan_viec[0]).toMatchObject({ so_ngay_con: -2, luon_mo: false, phu_trach_ten: "P.ĐT&PC" });
  });

  it("kiêm nhiệm P.TCKT thì thấy thêm tài liệu chuyển tiếp đến P.TCKT", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    await datKiemNhiem(await layQ(), nguCanh(qt), "nv.dtpc@scigroup.vn", [{ don_vi_id: "p-tckt" }]);
    const dl = await duLieuTongQuan(await layQ(), await nguoi("nv.dtpc@scigroup.vn"));
    expect(dl.hop_den.map((h) => h.buoc_id).sort()).toEqual(["b-1", "b-3"]);
  });

  it("người chưa gán đơn vị: hộp Đến trống, không lỗi", async () => {
    const dl = await duLieuTongQuan(await layQ(), await nguoi("nguoimoi@scigroup.vn"));
    expect(dl.hop_den).toEqual([]);
    expect(dl.phan_viec).toEqual([]);
  });
});
