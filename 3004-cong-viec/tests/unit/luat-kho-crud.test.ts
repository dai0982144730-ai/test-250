// ============================================================
// luat-kho — LƯU LUẬT: gieo 9 luật hệ thống, tạo/sửa/xóa, kiểm hợp lệ, phiên bản, quay lại, lịch sử, quyền,
// đồng bộ hai chiều với cấu hình luat_kiem_tra. Dạng luật code giả lập (agent luat-loai làm bản thật).
// ============================================================
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("@/lib/luat/loai-luat", () => ({
  LOAI_LUAT: {
    o_co_gia_tri: {
      ma: "o_co_gia_tri",
      ten: "Ô phải có giá trị",
      mo_ta: "Ô nhập không được để trống",
      vi_du: "Ô Trưởng đơn vị ký phải điền",
      tham_so: [{ khoa: "o", nhan: "Ô", kieu: "o", bat_buoc: true }],
      kiem: (bc: { o_nhap: Record<string, string> }, ts: Record<string, unknown>, ctx: { gia_tri_chua_dien: string[] }) => {
        const tag = String(ts.o);
        const v = (bc.o_nhap[tag] ?? "").trim();
        return !v || ctx.gia_tri_chua_dien.includes(v) ? [{ thong_diep: `Ô "${tag}" chưa có giá trị`, vi_tri: { tag } }] : [];
      },
    },
  },
  kiemThamSo: (_loai: string, ts: Record<string, unknown>, mau: { ten: string; o_nhap: { tag: string }[] } | null) => {
    if (!ts.o) return ["Chưa chọn ô"];
    if (mau && !mau.o_nhap.some((o) => o.tag === ts.o)) return [`Mẫu ${mau.ten} không có ô "${String(ts.o)}"`];
    return [];
  },
  docThanhLoi: () => "",
}));

import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, datCauHinh } from "../fixtures/chuan-bi";
import { tx, type Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import {
  danhSachLuat,
  dinhNghiaCacMau,
  duocSuaLuat,
  layLuat,
  luatApDung,
  luuLuat,
  LoiLuatKhongHopLe,
  phienBanLuat,
  quayLaiLuat,
  xoaLuat,
} from "@/lib/luat/kho-luat";
import { hatGiongLuat } from "@/lib/luat/hat-giong";
import type { LuatNhap } from "@/lib/luat/types";
import type { NguoiDungPhien } from "@/lib/types";

let q: Q;
let quanTri: NguoiDungPhien, truongDtpc: NguoiDungPhien, nhanVien: NguoiDungPhien;

const luatMoi = (x: Partial<LuatNhap> = {}): LuatNhap => ({
  // mẫu bản 6 bỏ khối chữ ký: luật thử kiểm ô "Tình trạng tổng thể" của Form 7
  ma: "f7-tinh-trang-tong-the",
  ten: "Tình trạng tổng thể đã ghi",
  cau_luat: "Ô Tình trạng tổng thể phải điền",
  mo_ta: null,
  cach_kiem: "code",
  loai: "o_co_gia_tri",
  tham_so: { o: "du_an_tinh_trang" },
  huong_dan_ai: null,
  ap_dung: ["form-7"],
  muc: "canh_bao",
  khi_ai_loi: "cho_gui",
  bat: true,
  nhom: "Ô chung",
  thu_tu: 500,
  ...x,
});

async function loiHopLe(p: Promise<unknown>): Promise<string[]> {
  try {
    await p;
  } catch (e) {
    if (e instanceof LoiLuatKhongHopLe) return e.danhSach;
    throw e;
  }
  throw new Error("Không báo lỗi");
}

async function maLoi(p: Promise<unknown>): Promise<number> {
  try {
    await p;
  } catch (e) {
    if (e instanceof LoiHttp) return e.status;
    throw e;
  }
  return 200;
}

beforeAll(async () => {
  khoTam();
  q = await csdlMoi();
  [quanTri, truongDtpc, nhanVien] = await Promise.all(["quantri", "truong.dtpc", "hung.tv"].map((e) => nguoi(`${e}@scigroup.vn`)));
  // Tách khỏi luật mẫu (nếu agent luat-mau đã gieo): chỉ giữ luật hệ thống
  await q.query("UPDATE docflow.luat_kiem_tra SET da_xoa = true WHERE NOT he_thong");
});

describe("gieo 9 luật hệ thống", () => {
  it("đủ 9 luật từ cấu hình, loai he_thong, giữ bat/muc/ap_dung; gieo lại không nhân đôi", async () => {
    const ds = (await danhSachLuat(q)).filter((l) => l.he_thong);
    expect(ds.map((l) => l.ma)).toEqual(MAC_DINH.luat_kiem_tra.luat.map((l) => l.ma));
    for (const l of ds) {
      const g = MAC_DINH.luat_kiem_tra.luat.find((x) => x.ma === l.ma)!;
      expect(l).toMatchObject({ loai: "he_thong", he_thong: true, bat: g.bat, muc: g.muc, ap_dung: g.ap_dung, ten: g.ten, phien_ban: 1 });
    }
    await hatGiongLuat(q);
    const lai = (await danhSachLuat(q)).filter((l) => l.he_thong);
    expect(lai.length).toBe(9);
    expect(await phienBanLuat(q, lai[0].id)).toHaveLength(1);
  });

  it("định nghĩa mẫu rút gọn: 12 mẫu (Form 11 thêm 20/10/2026), có ô nhập và bảng + cột", async () => {
    const ds = await dinhNghiaCacMau(q);
    expect(ds.map((m) => m.ma)).toEqual(["form-0", "form-1", "form-2", "form-3", "form-4", "form-5", "form-6", "form-7", "form-8", "form-9", "form-10", "form-11"]);
    const f7 = ds.find((m) => m.ma === "form-7")!;
    expect(f7.o_nhap.some((o) => o.tag === "du_an_tinh_trang")).toBe(true);
    expect(f7.o_nhap.some((o) => ["ky_truong_don_vi", "nguoi_lap", "ngay_lap", "nguoi_kiem_soat"].includes(o.tag))).toBe(false); // mẫu bản 6
    expect(f7.bang.find((b) => b.tag === "bang_cong_viec")?.cot.some((c) => c.tag === "ket_thuc")).toBe(true);
  });
});

describe("tạo · sửa · phiên bản · quay lại · xóa", () => {
  let id = "";

  it("tạo luật code: phiên bản 1, lưu bản đầy đủ, ghi lịch sử sua_cau_hinh luat:<id>", async () => {
    const l = await tx((t) => luuLuat(t, quanTri, luatMoi()));
    id = l.id;
    expect(l).toMatchObject({ ma: "f7-tinh-trang-tong-the", he_thong: false, phien_ban: 1, tao_boi: quanTri.id, da_xoa: false, ap_dung: ["form-7"] });
    const pb = await phienBanLuat(q, id);
    expect(pb).toHaveLength(1);
    expect(pb[0].gia_tri).toMatchObject({ id, ma: l.ma, muc: "canh_bao" });
    const { rows } = await q.query<{ hanh_dong: string; doi_tuong_loai: string; chi_tiet: Record<string, unknown> }>(
      "SELECT hanh_dong, doi_tuong_loai, chi_tiet FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id",
      [`luat:${id}`],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ hanh_dong: "sua_cau_hinh", doi_tuong_loai: "cau_hinh" });
    expect(rows[0].chi_tiet).toMatchObject({ tao_moi: true, phien_ban: 1 });
    expect((await luatApDung(q, "form-7")).some((x) => x.id === id)).toBe(true);
    expect((await luatApDung(q, "form-6")).some((x) => x.id === id)).toBe(false);
  });

  it("kiểm hợp lệ: thiếu dạng, ô không có trong mẫu, luật AI thiếu hướng dẫn / mức chặn chưa chọn khi AI lỗi, trùng mã, mẫu lạ", async () => {
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, luatMoi({ ma: "a1", loai: null }))))).join()).toMatch(/phải chọn dạng luật/);
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, luatMoi({ ma: "a2", loai: "khong_co" }))))).join()).toMatch(/Không có dạng luật/);
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, luatMoi({ ma: "a3", tham_so: { o: "o_khong_co" } }))))).join()).toMatch(/không có ô "o_khong_co"/);
    // 'tat_ca' chỉ kiểm cú pháp
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, luatMoi({ ma: "a4", ap_dung: "tat_ca", tham_so: {} }))))).join()).toMatch(/Chưa chọn ô/);
    const ai = { ma: "a5", cach_kiem: "ai" as const, loai: null, tham_so: null };
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, luatMoi({ ...ai, huong_dan_ai: null }))))).join()).toMatch(/hướng dẫn cho AI/);
    const khongChon = { ...luatMoi({ ...ai, huong_dan_ai: "Số liệu tổng phải khớp", muc: "chan" }) } as Partial<LuatNhap>;
    delete khongChon.khi_ai_loi;
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, khongChon as LuatNhap)))).join()).toMatch(/khi AI lỗi/);
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, luatMoi())))).join()).toMatch(/đã có/);
    expect((await loiHopLe(tx((t) => luuLuat(t, quanTri, luatMoi({ ma: "a6", ap_dung: ["form-99"] }))))).join()).toMatch(/Không có mẫu "form-99"/);
    // Luật AI mức chặn chọn rõ khi AI lỗi thì lưu được
    const ok = await tx((t) => luuLuat(t, quanTri, luatMoi({ ...ai, huong_dan_ai: "Số liệu tổng phải khớp", muc: "chan", khi_ai_loi: "chan" })));
    expect(ok).toMatchObject({ cach_kiem: "ai", loai: null, tham_so: null, khi_ai_loi: "chan" });
    await tx((t) => xoaLuat(t, quanTri, ok.id));
  });

  it("không ghi mã: tự sinh mã từ tên, không trùng", async () => {
    const a = await tx((t) => luuLuat(t, quanTri, luatMoi({ ma: "", ten: "Người ký đủ" })));
    const b = await tx((t) => luuLuat(t, quanTri, luatMoi({ ma: "", ten: "Người ký đủ" })));
    expect(a.ma).toBe("nguoi-ky-du");
    expect(b.ma).toBe("nguoi-ky-du-2");
    await tx((t) => xoaLuat(t, quanTri, a.id));
    await tx((t) => xoaLuat(t, quanTri, b.id));
  });

  it("sửa: tăng phiên bản, lịch sử ghi từ gì sang gì; lưu không đổi gì thì giữ phiên bản", async () => {
    const l = await tx((t) => luuLuat(t, quanTri, luatMoi({ id, muc: "chan" })));
    expect(l.phien_ban).toBe(2);
    const { rows } = await q.query<{ chi_tiet: { thay_doi: { truong: string; tu: unknown; sang: unknown }[]; phien_ban: number } }>(
      "SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id DESC LIMIT 1",
      [`luat:${id}`],
    );
    expect(rows[0].chi_tiet.phien_ban).toBe(2);
    expect(rows[0].chi_tiet.thay_doi).toEqual([{ truong: "muc", tu: "canh_bao", sang: "chan" }]);
    const lai = await tx((t) => luuLuat(t, quanTri, luatMoi({ id, muc: "chan" })));
    expect(lai.phien_ban).toBe(2);
    expect(await phienBanLuat(q, id)).toHaveLength(2);
  });

  it("quay lại bản 1: thành bản 3 mang nội dung bản 1, lịch sử ghi quay_lai_phien_ban", async () => {
    const l = await tx((t) => quayLaiLuat(t, quanTri, id, 1));
    expect(l).toMatchObject({ phien_ban: 3, muc: "canh_bao" });
    const pb = await phienBanLuat(q, id);
    expect(pb.map((x) => x.phien_ban)).toEqual([3, 2, 1]);
    const { rows } = await q.query<{ chi_tiet: Record<string, unknown> }>(
      "SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id DESC LIMIT 1",
      [`luat:${id}`],
    );
    expect(rows[0].chi_tiet).toMatchObject({ quay_lai_phien_ban: 1, phien_ban: 3 });
    expect(await maLoi(tx((t) => quayLaiLuat(t, quanTri, id, 9)))).toBe(404);
  });

  it("xóa mềm luật người dùng; luật hệ thống không xóa được (409)", async () => {
    await tx((t) => xoaLuat(t, quanTri, id));
    expect((await danhSachLuat(q)).some((l) => l.id === id)).toBe(false);
    expect((await danhSachLuat(q, { ca_da_xoa: true })).find((l) => l.id === id)?.da_xoa).toBe(true);
    expect((await layLuat(q, id))?.phien_ban).toBe(4);
    const { rows } = await q.query<{ chi_tiet: Record<string, unknown> }>(
      "SELECT chi_tiet FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id DESC LIMIT 1",
      [`luat:${id}`],
    );
    expect(rows[0].chi_tiet).toMatchObject({ xoa: true });
    // Xóa rồi thì dùng lại mã được
    const lai = await tx((t) => luuLuat(t, quanTri, luatMoi()));
    expect(lai.id).not.toBe(id);
    await tx((t) => xoaLuat(t, quanTri, lai.id));

    const heThong = (await danhSachLuat(q)).find((l) => l.ma === "nguoi_lap")!;
    expect(await maLoi(tx((t) => xoaLuat(t, quanTri, heThong.id)))).toBe(409);
    expect(await maLoi(tx((t) => luuLuat(t, quanTri, luatMoi({ id })))) ).toBe(409);
  });
});

describe("quyền và luật hệ thống", () => {
  it("nhân viên không sửa được (403); Trưởng P.ĐT&PC sửa được theo phân quyền nhóm luat_kiem_tra", async () => {
    expect(await duocSuaLuat(q, nhanVien)).toBe(false);
    expect(await duocSuaLuat(q, truongDtpc)).toBe(true);
    expect(await duocSuaLuat(q, quanTri)).toBe(true);
    expect(await maLoi(tx((t) => luuLuat(t, nhanVien, luatMoi({ ma: "nv-thu" }))))).toBe(403);
    const l = await tx((t) => luuLuat(t, truongDtpc, luatMoi({ ma: "truong-thu" })));
    expect(l.tao_boi).toBe(truongDtpc.id);
    expect(await maLoi(tx((t) => xoaLuat(t, nhanVien, l.id)))).toBe(403);
    await tx((t) => xoaLuat(t, truongDtpc, l.id));
  });

  it("luật hệ thống: chỉ đổi bật/mức/áp dụng (tên giữ nguyên); ghi sang cấu hình luat_kiem_tra", async () => {
    const goc = (await danhSachLuat(q)).find((l) => l.ma === "nguoi_lap")!;
    const l = await tx((t) =>
      luuLuat(t, truongDtpc, { ...goc, ten: "Đổi tên thử", loai: "o_co_gia_tri", muc: "canh_bao", ap_dung: ["form-6", "form-7"] }),
    );
    expect(l).toMatchObject({ he_thong: true, ten: goc.ten, loai: "he_thong", muc: "canh_bao", ap_dung: ["form-6", "form-7"], phien_ban: 2 });
    const ch = await layCauHinh(q, "luat_kiem_tra");
    expect(ch.luat.find((x) => x.ma === "nguoi_lap")).toMatchObject({ muc: "canh_bao", ap_dung: ["form-6", "form-7"], ten: goc.ten });
    // Quay lại bản gieo
    const lai = await tx((t) => quayLaiLuat(t, truongDtpc, goc.id, 1));
    expect(lai).toMatchObject({ muc: "chan", ap_dung: "tat_ca", phien_ban: 3 });
    expect((await layCauHinh(q, "luat_kiem_tra")).luat.find((x) => x.ma === "nguoi_lap")).toMatchObject({ muc: "chan", ap_dung: "tat_ca" });
  });

  it("đổi ở trang Cài đặt (cấu hình) → bảng luật kéo về đúng luật đã đổi", async () => {
    const ch = await layCauHinh(q, "luat_kiem_tra");
    await datCauHinh(q, "luat_kiem_tra", { ...ch, luat: ch.luat.map((l) => (l.ma === "ngay_trong" ? { ...l, bat: false } : l)) });
    const ds = await danhSachLuat(q);
    const nt = ds.find((l) => l.ma === "ngay_trong")!;
    expect(nt.bat).toBe(false);
    expect((await phienBanLuat(q, nt.id))[0]).toMatchObject({ ghi_chu: "đồng bộ từ Cài đặt" });
    expect(ds.find((l) => l.ma === "nguoi_lap")?.phien_ban).toBe(3); // luật khác không bị động tới
    expect((await luatApDung(q, "form-7")).some((l) => l.ma === "ngay_trong")).toBe(false);
    await datCauHinh(q, "luat_kiem_tra", ch);
    expect((await danhSachLuat(q)).find((l) => l.ma === "ngay_trong")?.bat).toBe(true);
  });
});
