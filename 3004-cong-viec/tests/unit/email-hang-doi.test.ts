// Email thông báo: xếp hàng theo cấu hình từng loại, chưa cấu hình thì không gửi, người tắt nhận email,
// nhắc sổ cái đi email khi so_cai.kenh_nhac có "email".
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { query, tx } from "@/lib/db";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { ghiCauHinh, kiemTraCauHinh } from "@/lib/cau-hinh/ghi";
import { taoThongBao, thongBaoDonVi } from "@/lib/thong-bao";
import { layCauHinhGuiThu } from "@/lib/email/cau-hinh";
import { datNhanEmail, layNhanEmail } from "@/lib/email/hang-doi";
import { guiHangDoi } from "@/lib/email/bo-gui";
import { quetHan } from "@/lib/so-cai/dich-vu";

const BIEN = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_SECURE", "DOCFLOW_EMAIL_THU", "DOCFLOW_URL"];
const thuMucThu = fs.mkdtempSync(path.join(os.tmpdir(), "docflow-email-"));

type DongThu = { id: string; nguoi_nhan: string; den: string; loai: string; tieu_de: string; van_ban: string; trang_thai: string };
async function thu(dieuKien = "TRUE", ts: unknown[] = []): Promise<DongThu[]> {
  return (await query<DongThu>(`SELECT * FROM docflow.hang_doi_email WHERE ${dieuKien} ORDER BY id`, ts)).rows;
}

beforeAll(async () => {
  await csdlMoi();
  process.env.DOCFLOW_EMAIL_THU_THU_MUC = thuMucThu;
});

beforeEach(async () => {
  for (const b of BIEN) delete process.env[b];
  await query("DELETE FROM docflow.hang_doi_email");
});

describe("cấu hình email", () => {
  it("các trường mới trong thong_bao hợp lệ với bộ kiểm tra cấu hình", async () => {
    const q = await query("SELECT 1");
    expect(q.rows).toHaveLength(1);
    const { layQ } = await import("@/lib/db");
    expect(await kiemTraCauHinh(await layQ(), "thong_bao", MAC_DINH.thong_bao)).toEqual([]);
    expect(MAC_DINH.thong_bao.theo_loai.nhan_tai_lieu.email).toBe(true);
    expect(MAC_DINH.thong_bao.theo_loai.khac).toBeDefined();
  });

  it("chưa khai SMTP: không xếp thư, không lỗi, trạng thái 'chưa cấu hình email'", async () => {
    const { layQ } = await import("@/lib/db");
    const q = await layQ();
    const c = await layCauHinhGuiThu(q);
    expect(c.che_do).toBe("chua_cau_hinh");
    expect(c.mo_ta).toMatch(/^Chưa cấu hình email/);
    await tx((q) => taoThongBao(q, { nguoi_nhan: "hung.tv@scigroup.vn", loai: "nhan_tai_lieu", noi_dung: "Có tài liệu", lien_ket: "/tai-lieu/tl-1" }));
    expect(await thu()).toHaveLength(0);
    // thông báo trong app vẫn có
    const tb = await query("SELECT 1 FROM docflow.thong_bao WHERE nguoi_nhan = 'hung.tv@scigroup.vn' AND lien_ket = '/tai-lieu/tl-1'");
    expect(tb.rows).toHaveLength(1);
    const kq = await guiHangDoi(q);
    expect(kq).toMatchObject({ che_do: "chua_cau_hinh", da_gui: 0, loi: 0 });
  });

  it("có tài khoản SMTP mà thiếu SMTP_PASS vẫn là chưa cấu hình; mật khẩu không nằm trong cấu hình CSDL", async () => {
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_USER = "docflow@scigroup.vn";
    const { layQ } = await import("@/lib/db");
    const c = await layCauHinhGuiThu(await layQ());
    expect(c.che_do).toBe("chua_cau_hinh");
    expect(c.thieu.join(" ")).toContain("SMTP_PASS");
    process.env.SMTP_PASS = "abcd efgh ijkl mnop";
    const c2 = await layCauHinhGuiThu(await layQ());
    expect(c2.che_do).toBe("smtp");
    expect(c2.dia_chi_gui).toBe("docflow@scigroup.vn");
    expect(JSON.stringify(await layCauHinh(await layQ(), "thong_bao"))).not.toContain("abcd");
  });
});

describe("xếp thư theo loại thông báo", () => {
  beforeEach(() => {
    process.env.DOCFLOW_EMAIL_THU = "1";
  });

  it("loại bật email → xếp thư tiếng Việt, liên kết tuyệt đối; loại chỉ trong app → không xếp", async () => {
    await tx((q) => taoThongBao(q, { nguoi_nhan: "hung.tv@scigroup.vn", loai: "nhan_tai_lieu", noi_dung: "Phòng KT&VH gửi Báo cáo tuần 29 đến bạn", lien_ket: "/tai-lieu/tl-9" }));
    await tx((q) => taoThongBao(q, { nguoi_nhan: "hung.tv@scigroup.vn", loai: "da_nhan", noi_dung: "Đã nhận", lien_ket: "/tai-lieu/tl-9" }));
    const ds = await thu();
    expect(ds).toHaveLength(1);
    expect(ds[0]).toMatchObject({ nguoi_nhan: "hung.tv@scigroup.vn", den: "hung.tv@scigroup.vn", loai: "nhan_tai_lieu", trang_thai: "cho" });
    expect(ds[0].tieu_de).toBe("[SCI công việc] Tài liệu mới đến: Phòng KT&VH gửi Báo cáo tuần 29 đến bạn");
    expect(ds[0].van_ban).toContain("Chào Trần Văn Hùng,");
    expect(ds[0].van_ban).toContain("https://docflow.scigroup.vn/api/tai-lieu/tl-9/tep"); // link mới (test đêm 01/10)
    // thông báo trong app gắn với thư
    const tb = await query<{ id: string }>("SELECT id FROM docflow.thong_bao WHERE loai = 'nhan_tai_lieu' AND lien_ket = '/tai-lieu/tl-9'");
    const tbId = (await query<{ thong_bao_id: string }>("SELECT thong_bao_id FROM docflow.hang_doi_email")).rows[0].thong_bao_id;
    expect(String(tbId)).toBe(String(tb.rows[0].id));
  });

  it("DOCFLOW_URL đổi gốc liên kết; thongBaoDonVi gửi từng người của đơn vị", async () => {
    process.env.DOCFLOW_URL = "http://localhost:3999/";
    await tx((q) => thongBaoDonVi(q, "p-dtpc", { loai: "giao_viec", noi_dung: "Việc CV-2026-0001 giao cho phòng", lien_ket: "/cong-viec/CV-2026-0001" }));
    const ds = await thu();
    const nguoiPhong = await query<{ id: string }>(
      "SELECT id FROM identity.nguoi_dung WHERE active AND (don_vi_id = 'p-dtpc' OR id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = 'p-dtpc'))",
    );
    expect(ds.map((d) => d.nguoi_nhan).sort()).toEqual(nguoiPhong.rows.map((r) => r.id).sort());
    expect(ds.length).toBeGreaterThan(0);
    expect(ds[0].van_ban).toContain("http://localhost:3999/so-do?viec=CV-2026-0001");
  });

  it("đổi cấu hình theo_loai: bật email cho 'quan-tri' → mỗi quản trị viên một thư; tắt trong app → không có dòng trong app", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const tbCh = await layCauHinh(await (await import("@/lib/db")).layQ(), "thong_bao");
    const moi = structuredClone(tbCh);
    moi.theo_loai.chua_gan_don_vi = { trong_app: true, email: true, tieu_de: "Người chưa gán đơn vị" };
    moi.theo_loai.hoan_thanh = { trong_app: false, email: true, tieu_de: "Xong: {noi_dung}" };
    await tx((q) => ghiCauHinh(q, qt, "thong_bao", moi));
    await tx((q) => taoThongBao(q, { nguoi_nhan: "quan-tri", loai: "chua_gan_don_vi", noi_dung: "Có người dùng chưa được gán đơn vị: A", lien_ket: "/quan-tri" }));
    const quanTri = await query<{ id: string }>("SELECT id FROM identity.nguoi_dung WHERE active AND la_quan_tri");
    const ds = await thu("loai = 'chua_gan_don_vi'");
    for (const r of quanTri.rows) expect(ds.map((d) => d.nguoi_nhan)).toContain(r.id);
    expect(ds[0].tieu_de).toBe("[SCI công việc] Người chưa gán đơn vị");

    await tx((q) => taoThongBao(q, { nguoi_nhan: "hung.tv@scigroup.vn", loai: "hoan_thanh", noi_dung: "Tài liệu X đã xử lý", lien_ket: "/tai-lieu/tl-x" }));
    expect(await thu("loai = 'hoan_thanh'")).toHaveLength(1);
    const trongApp = await query("SELECT 1 FROM docflow.thong_bao WHERE loai = 'hoan_thanh' AND lien_ket = '/tai-lieu/tl-x'");
    expect(trongApp.rows).toHaveLength(0);
    // trả lại mặc định
    await tx((q) => ghiCauHinh(q, qt, "thong_bao", tbCh));
  });

  it("thư xếp trong giao dịch bị hoàn lại thì cũng mất", async () => {
    await tx(async (q) => {
      await taoThongBao(q, { nguoi_nhan: "hung.tv@scigroup.vn", loai: "bi_tra_lai", noi_dung: "Bị trả lại", lien_ket: "/tai-lieu/tl-2" });
      throw new Error("hoàn lại");
    }).catch(() => undefined);
    expect(await thu()).toHaveLength(0);
  });

  it("người tắt nhận email không bị gửi (vẫn có thông báo trong app); bật lại thì nhận", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    expect(await layNhanEmail(await (await import("@/lib/db")).layQ(), hung.id)).toBe(true);
    await tx((q) => datNhanEmail(q, hung, false));
    await tx((q) => taoThongBao(q, { nguoi_nhan: hung.id, loai: "bi_tra_lai", noi_dung: "Báo cáo tuần bị trả lại: thiếu số liệu", lien_ket: "/tai-lieu/tl-3" }));
    expect(await thu()).toHaveLength(0);
    const trongApp = await query("SELECT 1 FROM docflow.thong_bao WHERE nguoi_nhan = $1 AND lien_ket = '/tai-lieu/tl-3'", [hung.id]);
    expect(trongApp.rows).toHaveLength(1);
    const ls = await query<{ chi_tiet: { tuy_chon: string; sau: boolean } }>(
      "SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_loai = 'nguoi_dung' AND doi_tuong_id = $1 AND hanh_dong = 'sua_nguoi_dung'",
      [hung.id],
    );
    expect(ls.rows.some((r) => r.chi_tiet.tuy_chon === "nhan_email" && r.chi_tiet.sau === false)).toBe(true);
    await tx((q) => datNhanEmail(q, hung, true));
    await tx((q) => taoThongBao(q, { nguoi_nhan: hung.id, loai: "bi_tra_lai", noi_dung: "Lần 2", lien_ket: "/tai-lieu/tl-3" }));
    expect(await thu()).toHaveLength(1);
  });

  it("người bị khóa hoặc email không hợp lệ thì bỏ qua", async () => {
    await query("UPDATE identity.nguoi_dung SET active = false WHERE id = 'photgd@scigroup.vn'");
    await tx((q) => taoThongBao(q, { nguoi_nhan: "photgd@scigroup.vn", loai: "giao_viec", noi_dung: "x" }));
    await tx((q) => taoThongBao(q, { nguoi_nhan: "khong-ton-tai", loai: "giao_viec", noi_dung: "x" }));
    expect(await thu()).toHaveLength(0);
    await query("UPDATE identity.nguoi_dung SET active = true WHERE id = 'photgd@scigroup.vn'");
  });
});

describe("nhắc việc sổ cái theo so_cai.kenh_nhac", () => {
  beforeEach(() => {
    process.env.DOCFLOW_EMAIL_THU = "1";
  });

  async function dungViec(id: string, ketThuc: string) {
    await query(
      `INSERT INTO docflow.cong_viec (id, ten, giao_boi, don_vi_giao) VALUES ($1, $2, 'truong.dtpc@scigroup.vn', 'p-dtpc')`,
      [id, `Việc thử ${id}: rà soát hồ sơ GPMB`],
    );
    await query(
      `INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, ket_thuc)
       VALUES ($1, $2, 'nguoi', 'hung.tv@scigroup.vn', 'Nộp biên bản kiểm đếm', $3::date)`,
      [`pv-${id}`, id, ketThuc],
    );
  }

  it("kenh_nhac chỉ trong app → không có thư nhắc", async () => {
    await dungViec("CV-EM-1", "2026-09-01");
    const kq = await tx((q) => quetHan(q, "2026-09-10"));
    expect(kq.qua_han).toBeGreaterThanOrEqual(1);
    expect(await thu("loai IN ('qua_han','sap_den_han')")).toHaveLength(0);
  });

  it("kenh_nhac có email → thư quá hạn / sắp đến hạn tới người phụ trách và người giao", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    const { layQ } = await import("@/lib/db");
    const sc = await layCauHinh(await layQ(), "so_cai");
    await tx((q) => ghiCauHinh(q, qt, "so_cai", { ...sc, kenh_nhac: ["trong_app", "email"] }));
    await dungViec("CV-EM-2", "2026-09-05");
    await dungViec("CV-EM-3", "2026-09-12");
    await tx((q) => quetHan(q, "2026-09-10"));
    const quaHan = await thu("loai = 'qua_han' AND van_ban LIKE '%CV-EM-2%'");
    expect(quaHan.map((d) => d.nguoi_nhan).sort()).toEqual(["hung.tv@scigroup.vn", "truong.dtpc@scigroup.vn"]);
    expect(quaHan[0].tieu_de).toContain("Việc quá hạn: Việc CV-EM-2 đã quá hạn");
    expect(quaHan[0].van_ban).toContain("https://docflow.scigroup.vn/so-do?viec=CV-EM-2");
    const sapDen = await thu("loai = 'sap_den_han' AND van_ban LIKE '%CV-EM-3%'");
    expect(sapDen.map((d) => d.nguoi_nhan)).toContain("hung.tv@scigroup.vn");
    expect(sapDen[0].tieu_de).toContain("Việc sắp đến hạn");
    // quét lại cùng ngày: không nhắc trùng
    const truoc = (await thu()).length;
    await tx((q) => quetHan(q, "2026-09-10"));
    expect((await thu()).length).toBe(truoc);
    // CV-EM-1 đã nhắc (trong app) hôm nay ở test trước → không nhắc lại
    expect(await thu("van_ban LIKE '%CV-EM-1%'")).toHaveLength(0);
  });

  it("gửi hết hàng đợi ở chế độ thử → mỗi thư một file .eml, trạng thái đã gửi", async () => {
    const { layQ } = await import("@/lib/db");
    await dungViec("CV-EM-4", "2026-09-02");
    await tx((q) => quetHan(q, "2026-09-11"));
    const soThu = (await thu("trang_thai = 'cho'")).length;
    expect(soThu).toBeGreaterThan(0);
    const truoc = fs.readdirSync(thuMucThu).length;
    const kq = await guiHangDoi(await layQ(), { gioi_han: 100 });
    expect(kq).toMatchObject({ che_do: "thu", da_gui: soThu, loi: 0 });
    expect(fs.readdirSync(thuMucThu).length - truoc).toBe(soThu);
    expect(await thu("trang_thai <> 'da_gui'")).toHaveLength(0);
  });
});

describe("tin chuông quá hạn ghi tên việc MỘT lần (Mr. Đại 10/10/2026)", () => {
  it("nội dung phần việc trùng tên việc → không lặp; khác tên → vẫn ghi nội dung phần việc", async () => {
    await query(`INSERT INTO docflow.cong_viec (id, ten, giao_boi, don_vi_giao) VALUES ('CV-LAP-1', 'Làm hồ sơ pháp lý HV-09-01', 'truong.dtpc@scigroup.vn', 'p-dtpc')`);
    await query(
      `INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, ket_thuc)
       VALUES ('pv-lap-1', 'CV-LAP-1', 'nguoi', 'hung.tv@scigroup.vn', 'Làm hồ sơ pháp lý HV-09-01', '2026-09-01')`,
    );
    await tx((q) => quetHan(q, "2026-09-10"));
    const tb = (await query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE lien_ket = '/cong-viec/CV-LAP-1' AND loai = 'qua_han' LIMIT 1")).rows[0];
    expect(tb.noi_dung.split("Làm hồ sơ pháp lý HV-09-01").length - 1).toBe(1);
  });
});
