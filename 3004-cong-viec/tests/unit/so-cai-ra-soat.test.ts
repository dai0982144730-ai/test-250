// KIỂM SOÁT SỔ CÁI (so-cai/ra-soat.ts): báo cáo đã gửi mà sổ cái thiếu việc → rà soát chỉ đúng dòng thiếu và VÌ SAO
// (quy tắc lấy việc lúc gửi còn hẹp / lỗi ghi sổ), "bổ sung" ghi đủ theo ngày gửi gốc, chạy lại không ghi trùng;
// rà soát tự động thấy thiếu thì TỰ BỔ SUNG ngay + báo quản trị (tắt được); đối chiếu ngay sau khi gửi báo lỗi ghi sổ.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, tep } from "../fixtures/chuan-bi";
import { tx, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { doiChieuSauGui, raSoatHangNgay, raSoatMoiNhat, raSoatSoCai } from "@/lib/so-cai/ra-soat";
import { ghiCauHinh } from "@/lib/cau-hinh/ghi";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { DauVaoSoCai } from "@/lib/types";

let bqlda = "";
let form0 = "";

/** Xóa hẳn các việc (và mọi bản ghi của chúng) — giả lập sổ cái đã không ghi các dòng này lúc gửi. */
async function xoaViec(ids: string[]) {
  const q = await layQ();
  await q.query("UPDATE docflow.cong_viec SET nguon_hien_hanh_id = NULL WHERE id = ANY($1::text[])", [ids]);
  for (const bang of ["phu_thuoc_viec", "phan_viec", "nguon_cong_viec"]) await q.query(`DELETE FROM docflow.${bang} WHERE cong_viec_id = ANY($1::text[])`, [ids]);
  await q.query("DELETE FROM docflow.cong_viec WHERE id = ANY($1::text[])", [ids]);
}

async function viecTuBang(taiLieuId: string, bang: string[]): Promise<string[]> {
  const q = await layQ();
  const { rows } = await q.query<{ cong_viec_id: string }>(
    "SELECT cong_viec_id FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND du_lieu->>'nguon_bang' = ANY($2::text[])",
    [taiLieuId, bang],
  );
  return rows.map((r) => r.cong_viec_id);
}

describe("Kiểm soát sổ cái: rà soát + lý do thiếu", () => {
  beforeAll(async () => {
    khoTam();
    await csdlMoi();
    const nv = await nguoi("nv.bqlda@scigroup.vn");
    const r = await tx((q) => taiLenVaKiemTra(q, nv, { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx") }));
    await tx((q) => gui(q, nv, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
    bqlda = r.tai_lieu_id!;
    const ptgd = await nguoi("photgd@scigroup.vn");
    const f0 = await tx((q) => taiLenVaKiemTra(q, ptgd, { tep: tep("BaoCao_HopNhat_Tuan30.docx") }));
    await tx((q) => gui(q, ptgd, { tai_lieu_id: f0.tai_lieu_id!, den: ["ban-tgd"] }));
    form0 = f0.tai_lieu_id!;
    // Tài liệu tải lên nhưng KHÔNG gửi: không thuộc phạm vi rà soát
    await tx((q) => taiLenVaKiemTra(q, nv, { tep: tep("BaoCao_Tuan28_BQLDA_QuangTri.docx") }));
  });

  it("sổ cái đủ việc → không thiếu; chỉ xét tài liệu đã gửi; đếm dòng chờ TGĐ quyết định", async () => {
    const kq = await tx((q) => raSoatSoCai(q));
    expect(kq.so_tai_lieu).toBe(2);
    expect(kq.so_thieu).toBe(0);
    expect(kq.tai_lieu.find((t) => t.tai_lieu_id === bqlda)).toMatchObject({ so_viec: 3, da_co: 3 }); // 3 việc chương việc (mẫu phiên bản 4: bảng Kiến nghị / GPMB không sinh việc)
    expect(kq.tai_lieu.find((t) => t.tai_lieu_id === form0)?.cho_quyet_dinh).toBe(6);
  });

  it("gửi khi quy tắc lấy việc còn hẹp (chưa đọc được dòng 3) → lý do 'quy tắc mới'; bổ sung → đủ; chạy lại không ghi trùng", async () => {
    // Giả lập: kết quả kiểm tra LÚC GỬI thiếu dòng 3 của bảng việc, sổ cái cũng không có việc đó
    const q0 = await layQ();
    await q0.query(
      `UPDATE docflow.phien_ban_tep SET ket_qua_kiem_tra = jsonb_set(ket_qua_kiem_tra, '{cong_viec}',
         (SELECT jsonb_agg(x) FROM jsonb_array_elements(ket_qua_kiem_tra->'cong_viec') x WHERE (x->>'dong_so')::int <> 3))
       WHERE tai_lieu_id = $1`,
      [bqlda],
    );
    const q1 = await layQ();
    await xoaViec(
      (await q1.query<{ cong_viec_id: string }>("SELECT cong_viec_id FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND dong_so = 3", [bqlda])).rows.map((r) => r.cong_viec_id),
    );

    const xem = await tx((q) => raSoatSoCai(q));
    const t = xem.tai_lieu.find((x) => x.tai_lieu_id === bqlda)!;
    expect(t.thieu.map((d) => `${d.nguon_bang}:${d.dong_so}:${d.ly_do}`)).toEqual(["bang_cong_viec:3:quy_tac_moi"]);
    expect(t.thieu[0].giai_thich).toContain("quy tắc lấy việc chưa đọc được dòng này");
    expect(xem.so_loi_ghi_so).toBe(0);

    const bs = await tx((q) => raSoatSoCai(q, { ghi: true }));
    expect(bs.so_bo_sung).toBe(1);
    const t2 = bs.tai_lieu.find((x) => x.tai_lieu_id === bqlda)!;
    expect(t2.thieu.every((d) => d.cong_viec_id && d.hanh_dong === "tao_moi")).toBe(true);
    const q = await layQ();
    const ngay = await q.query<{ ngay_gui: string; luc: string }>(
      "SELECT n.ngay_gui::text, b.luc::text FROM docflow.nguon_cong_viec n, docflow.buoc_hanh_trinh b WHERE n.cong_viec_id = $1 AND b.tai_lieu_id = $2 AND b.loai = 'gui'",
      [t2.thieu[0].cong_viec_id, bqlda],
    );
    expect(Date.parse(ngay.rows[0].ngay_gui)).toBe(Date.parse(ngay.rows[0].luc)); // ngày gửi GỐC, không phải ngày rà soát

    const lai = await tx((q) => raSoatSoCai(q, { ghi: true }));
    expect(lai.so_thieu).toBe(0);
    expect(lai.so_bo_sung).toBe(0);
    const dem = await q.query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1", [bqlda]);
    expect(dem.rows[0].n).toBe(3);
  });

  it("lúc gửi ĐÃ đọc được dòng mà sổ cái không có → lý do 'lỗi ghi sổ'; tắt tự bổ sung thì rà soát tự động chỉ lưu + báo quản trị", async () => {
    const qt = await nguoi("quantri@scigroup.vn");
    await tx(async (t) => ghiCauHinh(t, qt, "so_cai", { ...(await layCauHinh(t, "so_cai")), tu_bo_sung_thieu: false }));
    const [ma] = await viecTuBang(bqlda, ["bang_cong_viec"]);
    await xoaViec([ma]);
    const kq = await tx((q) => raSoatHangNgay(q));
    expect(kq.cach_chay).toBe("tu_dong");
    expect(kq.so_loi_ghi_so).toBe(1);
    expect(kq.so_bo_sung).toBe(0);
    const d = kq.tai_lieu.find((x) => x.tai_lieu_id === bqlda)!.thieu[0];
    expect(d).toMatchObject({ nguon_bang: "bang_cong_viec", ly_do: "loi_ghi_so" });
    expect(d.giai_thich).toContain("lỗi hệ thống");
    // Trang Issue / thanh bên đọc lần gần nhất, không chạy lại
    const moi = await raSoatMoiNhat(await layQ());
    expect(moi?.so_thieu).toBe(1);
    const q = await layQ();
    const tb = await q.query<{ noi_dung: string; lien_ket: string }>("SELECT noi_dung, lien_ket FROM docflow.thong_bao WHERE nguoi_nhan = 'quan-tri' AND loai = 'so_cai_thieu'");
    expect(tb.rows.at(-1)!.noi_dung).toContain("LỖI GHI SỔ");
    expect(tb.rows.at(-1)!.lien_ket).toBe("/cai-dat?tab=rieng&muc=ra-soat");
    // Bổ sung xong, lần gần nhất không còn thiếu
    await tx((q) => raSoatSoCai(q, { ghi: true }).then((k) => import("@/lib/so-cai/ra-soat").then((m) => m.luuRaSoat(q, k, "bo_sung", "quantri@scigroup.vn"))));
    expect((await raSoatMoiNhat(await layQ()))?.so_thieu).toBe(0);
    await tx(async (t) => ghiCauHinh(t, qt, "so_cai", { ...(await layCauHinh(t, "so_cai")), tu_bo_sung_thieu: true }));
  });

  it("bật tự bổ sung (mặc định): rà soát tự động thấy thiếu là TỰ GHI vào sổ cái ngay + báo quản trị; rà một báo cáo không đè kết quả toàn bộ", async () => {
    const [ma] = await viecTuBang(bqlda, ["bang_cong_viec"]);
    await xoaViec([ma]);
    const kq = await tx((q) => raSoatHangNgay(q, { ly_do: "Sau khi gửi", tai_lieu_id: bqlda }));
    expect(kq.so_tai_lieu).toBe(1);
    expect(kq.so_bo_sung).toBe(1);
    expect(kq.tai_lieu[0].thieu[0]).toMatchObject({ ly_do: "loi_ghi_so" });
    expect(kq.tai_lieu[0].thieu[0].cong_viec_id).toBeTruthy();
    expect((await tx((q) => raSoatSoCai(q))).so_thieu).toBe(0);
    const q = await layQ();
    const tb = await q.query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = 'quan-tri' AND loai = 'so_cai_thieu' ORDER BY id DESC LIMIT 1");
    expect(tb.rows[0].noi_dung).toContain("Sau khi gửi: đã TỰ BỔ SUNG 1/1");
    expect(tb.rows[0].noi_dung).toContain("LỖI GHI SỔ");
    // rà một báo cáo: không lưu thành "kết quả rà soát mới nhất" (trang Rà soát vẫn là lần toàn bộ gần nhất)
    expect((await raSoatMoiNhat(q))?.so_tai_lieu).toBe(2);

    // Rà toàn bộ: bổ sung + lưu kết quả, lần gần nhất không còn thiếu
    await xoaViec((await viecTuBang(bqlda, ["bang_cong_viec"])).slice(0, 1));
    const toan = await tx((t) => raSoatHangNgay(t));
    expect(toan.cach_chay).toBe("bo_sung");
    expect(toan.so_bo_sung).toBe(1);
    expect((await raSoatMoiNhat(q))?.so_thieu).toBe(0);
  });

  it("đối chiếu ngay sau khi gửi: dòng vừa gửi mà sổ cái không ghi → ghi lịch sử + báo quản trị; đủ thì im lặng", async () => {
    const q = await layQ();
    const pb = (await q.query<{ phien_ban: number }>("SELECT phien_ban_hien_tai AS phien_ban FROM docflow.tai_lieu WHERE id = $1", [bqlda])).rows[0].phien_ban;
    const dv = (ten: string, dong: number): DauVaoSoCai => ({
      tai_lieu_id: bqlda,
      phien_ban: pb,
      mau_ma: "form-7",
      nhan: "BQLDA Quảng Trị · Form 7 · tuần 29",
      don_vi_id: "bqlda-qt",
      cap: 3,
      nguoi_gui: "nv.bqlda@scigroup.vn",
      ky_bao_cao_den: "2026-07-20",
      ngay_gui: new Date().toISOString(),
      cong_viec: [{ ten, phu_trach: [], nguon_bang: "bang_cong_viec", dong_so: dong }],
    });
    expect(await tx((t) => doiChieuSauGui(t, dv("GPMB Trụ T11", 1), "nv.bqlda@scigroup.vn", "tuần 29"))).toEqual([]);
    const thieu = await tx((t) => doiChieuSauGui(t, dv("Việc bị lỗi ghi sổ", 9), "nv.bqlda@scigroup.vn", "tuần 29"));
    expect(thieu.map((d) => d.dong_so)).toEqual([9]);
    const ls = await q.query<{ chi_tiet: { dong: { dong: number }[] } }>("SELECT chi_tiet FROM docflow.lich_su WHERE hanh_dong = 'so_cai_thieu' AND doi_tuong_id = $1", [bqlda]);
    expect(ls.rows).toHaveLength(1);
    expect(ls.rows[0].chi_tiet.dong[0].dong).toBe(9);
    const tb = await q.query<{ noi_dung: string }>("SELECT noi_dung FROM docflow.thong_bao WHERE nguoi_nhan = 'quan-tri' AND loai = 'so_cai_thieu' ORDER BY id DESC LIMIT 1");
    expect(tb.rows[0].noi_dung).toContain("Kết quả và kế hoạch việc dòng 9: Việc bị lỗi ghi sổ");
  });
});
