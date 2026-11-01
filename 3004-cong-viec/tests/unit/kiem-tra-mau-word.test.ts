// Quản lý mẫu Word: sửa định nghĩa, thêm mẫu mới (Form 9) không sửa code, tải phiên bản file mới, lịch sử 'mau'.
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { layQ, tx, type Q } from "@/lib/db";
import { layMau, kiemTraTaiLieu } from "@/lib/kiem-tra/kiem-tra";
import { suaMau, themMau, taiLenTepMau, docTepMau, lichSuPhienBanMau, kiemTraDinhNghia, docThuMau } from "@/lib/kiem-tra/quan-ly-mau";
import { khoTam, boSinh } from "../fixtures/chuan-bi";
import { PHIEN_BAN_MAU } from "../../scripts/chuyen-mau-that.mjs";
import DINH_NGHIA_GIEO from "../../mau-word/dinh-nghia.json";

let q: Q;
const tepMau = (ma: string) => fs.readFileSync(path.join(process.cwd(), "mau-word", `${ma}.docx`));

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  q = await layQ();
});

describe("quản lý mẫu Word", () => {
  it("chỉ người có quyền mau.quan_ly được sửa", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    await expect(tx((x) => suaMau(x, hung, "form-7", { ten: "X" }))).rejects.toMatchObject({ status: 403 });
  });

  it("sửa nơi nhận mặc định và ô bắt buộc: có hiệu lực ngay khi kiểm tra", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const m = (await layMau(q, "form-8"))!;
    const dn = structuredClone(m.dinh_nghia);
    const moi = await tx((x) => suaMau(x, qt, "form-8", { gui_den_mac_dinh: "ban-tgd", dinh_nghia: dn }));
    expect(moi.gui_den_mac_dinh).toBe("ban-tgd");
    expect(moi.phien_ban).toBe(m.phien_ban + 1);
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = structuredClone(VI_DU.NAMXE_T29);
    g.o.gui_den = "";
    const kq = await kiemTraTaiLieu(q, await nguoi("gd.namxe@scigroup.vn"), await taoBaoCao("form-8", g), "nx.docx");
    expect(kq.dat).toBe(true);
    expect(kq.gui_den).toEqual(["ban-tgd"]);
    const ls = await q.query("SELECT 1 FROM docflow.lich_su WHERE doi_tuong_loai = 'mau' AND doi_tuong_id = 'form-8'");
    expect(ls.rows.length).toBe(1);

    // Ô bắt buộc (mẫu bản 6 bỏ Người kiểm soát — dùng ô "Tình trạng tổng thể" của Form 7): bật bắt buộc thì chặn ngay, tắt thì đạt
    const nv = await nguoi("nv.bqlda@scigroup.vn");
    const g7 = VI_DU.bqlda(29, "Lý Thị Nga");
    g7.o.du_an_tinh_trang = "......";
    const bc7 = await taoBaoCao("form-7", g7);
    const dn7 = structuredClone((await layMau(q, "form-7"))!.dinh_nghia);
    dn7.o_nhap.find((o) => o.tag === "du_an_tinh_trang")!.bat_buoc = true;
    await tx((x) => suaMau(x, qt, "form-7", { dinh_nghia: dn7 }));
    const kq7 = await kiemTraTaiLieu(q, nv, bc7, "bc7.docx");
    expect(kq7.dat).toBe(false);
    expect(kq7.loi.filter((l) => l.muc === "chan").map((l) => l.vi_tri?.tag)).toEqual(["du_an_tinh_trang"]);
    dn7.o_nhap.find((o) => o.tag === "du_an_tinh_trang")!.bat_buoc = false;
    await tx((x) => suaMau(x, qt, "form-7", { dinh_nghia: dn7 }));
    expect((await kiemTraTaiLieu(q, nv, bc7, "bc7.docx")).dat).toBe(true);
  });

  it("định nghĩa sai không lưu được", () => {
    expect(() => kiemTraDinhNghia({ o_nhap: [{ tag: "nguoi lap" }] })).toThrow(/tag/);
    expect(() => kiemTraDinhNghia({ o_nhap: [{ tag: "a" }] })).toThrow(/mau_ma/);
    expect(() => kiemTraDinhNghia({ o_nhap: [{ tag: "mau_ma" }], bang_cong_viec: [{ tag: "cong_viec" }] })).toThrow(/bang_/);
  });

  it("thêm Form 9 không sửa code, tải file mẫu: báo ô thiếu / ô mới so với định nghĩa", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const m10 = await tx((x) => themMau(x, qt, { ma: "form-99", ten: "Báo cáo Văn phòng HĐQT", gui_den_mac_dinh: "ban-tgd" }));
    expect(m10.dinh_nghia.bang_cong_viec[0].tag).toBe("bang_cong_viec");
    await expect(tx((x) => themMau(x, qt, { ma: "form-99", ten: "Trùng" }))).rejects.toMatchObject({ status: 409 });
    // dùng tạm file Form 3 làm file mẫu của Form 9
    const r = await tx((x) => taiLenTepMau(x, qt, "form-99", { ten_tep: "form-99.docx", noi_dung: tepMau("form-3") }));
    // mẫu bản 6: khung định nghĩa mẫu mới không còn Người lập / Ngày lập / Người kiểm soát, file không còn ô chữ ký
    expect(r.thieu_o).toEqual([]);
    expect(r.tag_moi).toContain("don_vi_lap");
    expect(r.tag_moi.filter((t) => ["nguoi_lap", "ngay_lap", "nguoi_kiem_soat"].includes(t) || (t.startsWith("ky_") && !t.startsWith("ky_bao_cao") && !t.startsWith("ky_chon")))).toEqual([]);
    const tai = await docTepMau(q, "form-99");
    expect(tai!.noi_dung.length).toBeGreaterThan(1000);
    expect((await lichSuPhienBanMau(q, "form-99")).length).toBe(1);
    const goi = await docThuMau(tepMau("form-0"));
    expect(goi.goi_y.bang.map((b) => b.tag)).toEqual(["bang_an_toan", "bang_kpi", "bang_cong_no", "bang_canh_bao", "bang_quyet_dinh", "bang_cong_viec"]);
  });
});

describe("nâng cấp mẫu gieo sẵn", () => {
  it("CSDL còn bản gieo cũ chưa ai sửa thì thay bằng mẫu thật; mẫu quản trị đã sửa thì giữ nguyên", async () => {
    const { hatGiong } = await import("@/lib/kiem-tra/hat-giong");
    await q.query("UPDATE docflow.mau_word SET phien_ban = 1, dinh_nghia = '{\"o_nhap\":[],\"bang_cong_viec\":[],\"muc_bat_buoc\":[]}' WHERE ma IN ('form-5','form-8')");
    await hatGiong(q);
    const m5 = (await layMau(q, "form-5"))!;
    // Form 5 sửa tay 20/10/2026: phiên bản gieo lấy ở dinh-nghia.json (trước là PHIEN_BAN_MAU của kịch bản sinh mẫu)
    expect(m5.phien_ban).toBe(Math.max(PHIEN_BAN_MAU, DINH_NGHIA_GIEO.find((m) => m.ma === "form-5")!.phien_ban));
    expect(m5.dinh_nghia.o_nhap.map((o) => o.tag)).toContain("ky_bao_cao");
    const m8 = (await layMau(q, "form-8"))!; // đã sửa ở test trên (có lịch sử 'mau')
    expect(m8.phien_ban).toBe(1);
    expect(m8.dinh_nghia.o_nhap).toEqual([]);
  });
});
