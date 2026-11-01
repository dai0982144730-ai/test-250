import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { ghiLichSu, kiemTraChuoi } from "@/lib/lich-su/ghi";
import { coQuyen } from "@sci/identity";
import { tx, query } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";

describe("nền", () => {
  beforeAll(async () => {
    await csdlMoi();
  });

  it("gieo 26 đơn vị (17 + 9 Ban điều hành tổng thầu) và người dùng mẫu", async () => {
    const { rows } = await query<{ n: number }>("SELECT count(*)::int n FROM identity.don_vi");
    expect(rows[0].n).toBe(26);
    const hung = await nguoi("hung.tv@scigroup.vn");
    expect(hung.don_vi_id).toBe("p-ktvh");
    expect(hung.cap).toBe(2);
  });

  it("nhân viên chỉ xóa được file mình tải lên; trưởng đơn vị xóa được trong đơn vị", async () => {
    const hung = await nguoi("hung.tv@scigroup.vn");
    const truong = await nguoi("truong.ktvh@scigroup.vn");
    expect(coQuyen(hung, "tai_lieu.xoa", { chu_so_huu: hung.id, don_vi_id: "p-ktvh" })).toBe(true);
    expect(coQuyen(hung, "tai_lieu.xoa", { chu_so_huu: "khac", don_vi_id: "p-ktvh" })).toBe(false);
    expect(coQuyen(truong, "tai_lieu.xoa", { chu_so_huu: "khac", don_vi_id: "p-ktvh" })).toBe(true);
    expect(coQuyen(truong, "tai_lieu.xoa", { chu_so_huu: "khac", don_vi_id: "p-dtpc" })).toBe(false);
  });

  it("lịch sử chỉ ghi thêm, chuỗi băm nguyên vẹn", async () => {
    await tx(async (q) => {
      await ghiLichSu(q, { nguoi: "a", doi_tuong_loai: "tai_lieu", doi_tuong_id: "t1", hanh_dong: "tai_len" });
      await ghiLichSu(q, { nguoi: "b", doi_tuong_loai: "tai_lieu", doi_tuong_id: "t1", hanh_dong: "gui", chi_tiet: { den: ["p-dtpc"] } });
      // jsonb tự sắp lại khóa (ngắn trước) — chuỗi băm vẫn phải kiểm lại được
      await ghiLichSu(q, {
        nguoi: "c",
        doi_tuong_loai: "cong_viec",
        doi_tuong_id: "CV-1",
        hanh_dong: "bi_de",
        chi_tiet: { zzz_dai_nhat: 1, a: { yy: [{ bb: 1, a: undefined, c: new Date(0) }], x: "đ" }, mm: null },
      });
    });
    await expect(query("DELETE FROM docflow.lich_su")).rejects.toThrow();
    await expect(query("UPDATE docflow.lich_su SET nguoi='x'")).rejects.toThrow();
    const q = await (await import("@/lib/db")).layQ();
    expect(await kiemTraChuoi(q)).toBeNull();
  });

  it("cấu hình trả mặc định khi chưa sửa", async () => {
    const q = await (await import("@/lib/db")).layQ();
    const c = await layCauHinh(q, "quy_tac_de");
    expect(c.thu_tu).toBe("cap_truoc");
  });
});
