// Ngữ cảnh yêu cầu (src/lib/ngu-canh.ts): ghiLichSu tự điền thiết bị trong yêu cầu, ngoài yêu cầu thì null,
// chuỗi băm vẫn kiểm lại được, hai yêu cầu chạy xen kẽ không lẫn thiết bị, xuLy() tự bọc ngữ cảnh.
import { describe, it, expect, beforeAll, vi } from "vitest";

// xuLy() lấy thiết bị từ next/headers — giả lập header của một yêu cầu
const hdr = vi.hoisted(() => ({ gia_tri: { "x-forwarded-for": "10.0.0.9, 1.1.1.1", "user-agent": "TrinhDuyet/1.0" } as Record<string, string> }));
vi.mock("next/headers", () => ({
  headers: () => new Headers(hdr.gia_tri),
  cookies: () => ({ get: () => undefined }),
}));

import { csdlMoi } from "../helpers/csdl";
import { ghiLichSu, kiemTraChuoi } from "@/lib/lich-su/ghi";
import { ghiLichSuChuan } from "@/lib/lich-su/ghi-chuan";
import { chayVoiNguCanh, layNguCanh, ngoaiNguCanh } from "@/lib/ngu-canh";
import { xuLy } from "@/lib/phien";
import { layQ, query, tx } from "@/lib/db";

async function thietBiCua(id: string): Promise<string | null> {
  const { rows } = await query<{ thiet_bi: string | null }>("SELECT thiet_bi FROM docflow.lich_su WHERE doi_tuong_id = $1 ORDER BY id DESC LIMIT 1", [id]);
  return rows[0]?.thiet_bi ?? null;
}

const cho = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("nền · ngữ cảnh yêu cầu", () => {
  beforeAll(async () => {
    await csdlMoi();
  });

  it("ghi lịch sử trong chayVoiNguCanh có thiết bị; ngoài ngữ cảnh thì null", async () => {
    await chayVoiNguCanh({ thiet_bi: "192.168.1.5 Firefox" }, () =>
      tx((q) => ghiLichSu(q, { nguoi: "u1", doi_tuong_loai: "tai_lieu", doi_tuong_id: "nc-1", hanh_dong: "tai_len" })),
    );
    expect(await thietBiCua("nc-1")).toBe("192.168.1.5 Firefox");

    expect(layNguCanh()).toBeUndefined();
    await tx((q) => ghiLichSu(q, { nguoi: "he-thong", doi_tuong_loai: "cong_viec", doi_tuong_id: "nc-2", hanh_dong: "qua_han" }));
    expect(await thietBiCua("nc-2")).toBeNull();

    // Trong ngữ cảnh nhưng tác vụ chạy ngoài (ngoaiNguCanh) → null như tác vụ nền
    await chayVoiNguCanh({ thiet_bi: "x" }, () =>
      ngoaiNguCanh(() => tx((q) => ghiLichSu(q, { nguoi: "he-thong", doi_tuong_loai: "cong_viec", doi_tuong_id: "nc-3", hanh_dong: "qua_han" }))),
    );
    expect(await thietBiCua("nc-3")).toBeNull();
  });

  it("thiết bị truyền tường minh được ưu tiên hơn ngữ cảnh; ghi-chuan (thu-muc) cũng nhận thiết bị", async () => {
    await chayVoiNguCanh({ thiet_bi: "ngu-canh" }, async () => {
      await tx((q) => ghiLichSu(q, { nguoi: "u1", doi_tuong_loai: "tai_lieu", doi_tuong_id: "nc-4", hanh_dong: "gui", thiet_bi: "rieng" }));
      await tx((q) =>
        ghiLichSuChuan(q, { nguoi: "u1", doi_tuong_loai: "tai_lieu", doi_tuong_id: "nc-5", hanh_dong: "xoa", chi_tiet: { vi_tri_id: "v", thu_muc: "Đến", a: 1 } }),
      );
    });
    expect(await thietBiCua("nc-4")).toBe("rieng");
    expect(await thietBiCua("nc-5")).toBe("ngu-canh");
    expect(await kiemTraChuoi(await layQ())).toBeNull();
  });

  it("hai yêu cầu chạy xen kẽ (Promise.all) không lẫn thiết bị của nhau; chuỗi băm nguyên vẹn", async () => {
    const yeuCau = (tb: string, id: string, tre: number) =>
      chayVoiNguCanh({ thiet_bi: tb }, async () => {
        await cho(tre);
        await tx((q) => ghiLichSu(q, { nguoi: "u", doi_tuong_loai: "tai_lieu", doi_tuong_id: `${id}-a`, hanh_dong: "nhan" }));
        await cho(tre);
        await tx((q) => ghiLichSuChuan(q, { nguoi: "u", doi_tuong_loai: "tai_lieu", doi_tuong_id: `${id}-b`, hanh_dong: "gui", chi_tiet: { den: [id], zz: 2 } }));
        return layNguCanh()?.thiet_bi;
      });
    const kq = await Promise.all([yeuCau("may-A", "xa", 15), yeuCau("may-B", "xb", 5), yeuCau("may-C", "xc", 0)]);
    expect(kq).toEqual(["may-A", "may-B", "may-C"]);
    for (const [id, tb] of [
      ["xa", "may-A"],
      ["xb", "may-B"],
      ["xc", "may-C"],
    ]) {
      expect(await thietBiCua(`${id}-a`)).toBe(tb);
      expect(await thietBiCua(`${id}-b`)).toBe(tb);
    }
    expect(await kiemTraChuoi(await layQ())).toBeNull();
  });

  it("xuLy() tự bọc handler với thiết bị = IP + user-agent của yêu cầu", async () => {
    const res = await xuLy(async () => {
      await tx((q) => ghiLichSu(q, { nguoi: "u1", doi_tuong_loai: "tai_lieu", doi_tuong_id: "nc-api", hanh_dong: "tai_ve" }));
      return { ok: true, tb: layNguCanh()?.thiet_bi };
    });
    expect(await res.json()).toEqual({ ok: true, tb: "10.0.0.9 TrinhDuyet/1.0" });
    expect(await thietBiCua("nc-api")).toBe("10.0.0.9 TrinhDuyet/1.0");
    // Sau yêu cầu: không còn ngữ cảnh
    expect(layNguCanh()).toBeUndefined();
    expect(await kiemTraChuoi(await layQ())).toBeNull();
  });
});
