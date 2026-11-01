// ============================================================
// TÍCH HỢP — "Xong khi" giai đoạn 4: chạy đúng 10 bước của sơ đồ hoạt động trong kế hoạch v2, bằng FILE WORD THẬT,
// qua đủ 4 module (kiem-tra · gui · thu-muc · so-cai) và lịch sử. Không giả lập hàm nào.
// BQLDA Quảng Trị (Form 7) → P.ĐT&PC (Form 1) → Phó TGĐ (Form 0) → TGĐ quyết định giao việc CV →
// 2 đơn vị bấm Kết thúc → việc rời sổ cái, đủ quá trình trong lịch sử.
// ============================================================
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { boSinh, khoTam, tep } from "../fixtures/chuan-bi";
import { tx, query, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui, nhan } from "@/lib/gui/dich-vu";
import { chiTietViec, danhSachSoCai, giaoViec, ketThucPhanViec, viecDaXong } from "@/lib/so-cai/dich-vu";
import { dongQuyetDinh } from "@/lib/so-cai/doc-them";
import { dongChoAgent } from "@/lib/so-cai/dinh-dang-agent";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { lichSuDoiTuong } from "@/lib/lich-su/doc";
import { kiemTraChuoi } from "@/lib/lich-su/ghi";
import type { NguoiDungPhien } from "@/lib/types";

type KQ = Awaited<ReturnType<typeof taiLenVaKiemTra>>;

/** Người gửi xác nhận mọi gợi ý trùng bằng gợi ý giống nhất (như bấm "Xác nhận" trên màn kiểm tra). */
function xacNhanGoiY(kq: KQ["ket_qua"]): Record<number, string> {
  const x: Record<number, string> = {};
  for (const d of kq.du_doan) if (d.hanh_dong === "goi_y_trung" && d.goi_y?.[0]) x[d.dong] = d.goi_y[0].cong_viec_id;
  return x;
}

async function viecGpmb(): Promise<string> {
  const { rows } = await query<{ id: string }>(
    "SELECT id FROM docflow.cong_viec WHERE ten LIKE '%GPMB Trụ T11%' ORDER BY tao_luc",
  );
  expect(rows.length).toBe(1); // luôn MỘT dòng cho một việc, dù nhắc lại ở nhiều báo cáo
  return rows[0].id;
}

describe("10 bước sơ đồ hoạt động · GPMB Trụ T11", () => {
  let nvBqlda: NguoiDungPhien, gdBqlda: NguoiDungPhien, nvDtpc: NguoiDungPhien, truongDtpc: NguoiDungPhien;
  let photgd: NguoiDungPhien, tgd: NguoiDungPhien, hung: NguoiDungPhien;
  let maViec = "";
  let form0 = { id: "", pb: 0 };

  beforeAll(async () => {
    khoTam();
    await csdlMoi();
    [nvBqlda, gdBqlda, nvDtpc, truongDtpc, photgd, tgd, hung] = await Promise.all(
      ["nv.bqlda", "gd.bqlda", "nv.dtpc", "truong.dtpc", "photgd", "tgd", "hung.tv"].map((e) => nguoi(`${e}@scigroup.vn`)),
    );
    // Tiền đề: tuần 28 BQLDA đã vào sổ cái (GPMB T11 hạn 30/07) — lần đầu, cấp mã
    await tx(async (q) => {
      const r = await taiLenVaKiemTra(q, nvBqlda, { tep: tep("BaoCao_Tuan28_BQLDA_QuangTri.docx") });
      expect(r.ket_qua.dat).toBe(true);
      await gui(q, nvBqlda, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] });
    });
    maViec = await viecGpmb();
    expect(maViec).toMatch(/^CV-2026-\d{4}$/);
    const cv = await chiTietViec(await layQ(), maViec);
    expect(cv?.ket_thuc).toBe("2026-07-30");
  });

  let tuan29 = "";

  it("1–2. BQLDA lập báo cáo tuần 29 (Form 7): kiểm tra chặn vì Kỳ báo cáo ghi từ ngày – đến ngày lệch số tuần", async () => {
    // bản 1 dựng từ mẫu thật: ghi Tuần 29 nhưng ngày lệch một ngày (mẫu bản 9: bỏ trống ngày thì máy tự tính, ghi lệch thì chặn)
    const { taoBaoCao, VI_DU } = await boSinh();
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    g.o.ky_bao_cao = { chon: "tuan", tuan: "29/2026   (14/07/2026 – 20/07/2026)" };
    const ban1 = await taoBaoCao("form-7", g);
    const r = await tx((q) => taiLenVaKiemTra(q, nvBqlda, { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban1.docx", ban1) }));
    tuan29 = r.tai_lieu_id!;
    expect(r.ket_qua.mau_ma).toBe("form-7");
    expect(r.ket_qua.ky_bao_cao?.so).toBe(29);
    expect(r.ket_qua.dat).toBe(false);
    const loi = r.ket_qua.loi.filter((l) => l.muc === "chan");
    expect(loi.map((l) => l.vi_tri?.tag)).toEqual(["ky_bao_cao"]);
    // Nút Gửi khóa ở phía server
    await expect(tx((q) => gui(q, nvBqlda, { tai_lieu_id: tuan29, den: ["p-dtpc"] }))).rejects.toThrow();
  });

  it("3. Sửa kỳ báo cáo, tải lại bản 2: đạt; lịch sử vẫn giữ bản 1", async () => {
    const r = await tx((q) => taiLenVaKiemTra(q, nvBqlda, { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), tai_lieu_id: tuan29 }));
    expect(r.phien_ban).toBe(2);
    expect(r.ket_qua.dat).toBe(true);
    // Tên tài liệu theo file của bản hiện tại (bản 1 vẫn giữ tên cũ trong phiên bản)
    const { rows: tl } = await query<{ ten: string }>("SELECT ten FROM docflow.tai_lieu WHERE id = $1", [tuan29]);
    expect(tl[0].ten).toBe("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx");
    const ban1 = await docPhienBan(await layQ(), tuan29, 1);
    expect(ban1.thong_tin.phien_ban).toBe(1);
    expect(ban1.noi_dung.length).toBeGreaterThan(0);
  });

  it("4. Gửi P.ĐT&PC: vào Đến của P.ĐT&PC; tuần 29 đè tuần 28 (ngày sau): hạn 30/07 → 05/08", async () => {
    const q = await layQ();
    const kt = await tx((t) => taiLenVaKiemTra(t, nvBqlda, { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx"), tai_lieu_id: tuan29, luu: false }));
    const kq = await tx((t) => gui(t, nvBqlda, { tai_lieu_id: tuan29, den: ["p-dtpc"], xac_nhan_trung: xacNhanGoiY(kt.ket_qua) }));
    expect(kq.buoc_ids).toHaveLength(1);
    const { rows } = await query<{ n: number }>(
      `SELECT count(*)::int n FROM docflow.vi_tri v JOIN docflow.thu_muc t ON t.id = v.thu_muc_id
        WHERE v.tai_lieu_id = $1 AND t.don_vi_id = 'p-dtpc' AND t.loai = 'den' AND NOT v.da_xoa`,
      [tuan29],
    );
    expect(rows[0].n).toBe(1);
    expect(await viecGpmb()).toBe(maViec);
    const cv = await chiTietViec(q, maViec);
    expect(cv?.ket_thuc).toBe("2026-08-05");
    // Người nhận bấm Nhận
    await tx((t) => nhan(t, truongDtpc, kq.buoc_ids[0]));
  });

  it("5. P.ĐT&PC tổng hợp báo cáo phòng (Form 1) gửi Ban TGĐ: cấp cao hơn đè — hạn 10/08, đã đè 2 bản", async () => {
    const r = await tx((q) => taiLenVaKiemTra(q, nvDtpc, { tep: tep("BaoCao_Tuan29_PDTPC.docx") }));
    expect(r.ket_qua.dat).toBe(true);
    expect(r.ket_qua.mau_ma).toBe("form-1");
    await tx((q) => gui(q, nvDtpc, { tai_lieu_id: r.tai_lieu_id!, den: ["ban-tgd"], xac_nhan_trung: xacNhanGoiY(r.ket_qua) }));
    const cv = await chiTietViec(await layQ(), maViec);
    expect(cv?.ket_thuc).toBe("2026-08-10");
    expect(cv?.nguon_hien_hanh?.don_vi_id).toBe("p-dtpc");
    expect(cv?.so_ban_da_de).toBe(2);
  });

  it("6. Phó TGĐ lập Báo cáo hợp nhất (Form 0) trình TGĐ, mục \"Nội dung cần TGĐ quyết định\"", async () => {
    const r = await tx((q) => taiLenVaKiemTra(q, photgd, { tep: tep("BaoCao_HopNhat_Tuan30.docx") }));
    expect(r.ket_qua.dat).toBe(true);
    expect(r.ket_qua.mau_ma).toBe("form-0");
    form0 = { id: r.tai_lieu_id!, pb: r.phien_ban! };
    await tx((q) => gui(q, photgd, { tai_lieu_id: form0.id, den: ["ban-tgd"], xac_nhan_trung: xacNhanGoiY(r.ket_qua) }));
    const qd = await dongQuyetDinh(await layQ(), form0.id, form0.pb);
    // Mẫu Form 0 thật có sẵn các dòng quyết định khác; dòng của kịch bản là "Chi trả GPMB Trụ T11"
    const gpmb = qd!.dong.find((d) => d.dong.ten.includes("GPMB Trụ T11"));
    expect(gpmb).toBeDefined();
    // Gợi ý: quyết định này trùng việc GPMB đang mở
    expect(gpmb!.goi_y[0]?.cong_viec_id).toBe(maViec);
  });

  it("7. TGĐ quyết định: BQLDA chủ trì + P.ĐT&PC phối hợp, hạn 05/08: Form 0 cấp 1 đè bản của đơn vị · 0/1", async () => {
    const q = await layQ();
    const qd = (await dongQuyetDinh(q, form0.id, form0.pb))!;
    const d = qd.dong.find((x) => x.dong.ten.includes("GPMB Trụ T11"))!;
    const ma = await tx((t) =>
      giaoViec(t, tgd, {
        ten: "Chi trả GPMB Trụ T11",
        du_an: "ĐG Hướng Việt",
        bat_dau: "2026-07-28",
        ket_thuc: "2026-08-05",
        cong_viec_id: maViec,
        la_quyet_dinh: true,
        tu_tai_lieu: { tai_lieu_id: form0.id, phien_ban: form0.pb, dong_so: d.dong.dong_so, nhan: qd.nhan },
        phan_viec: [
          { loai: "don_vi", id: "bqlda-qt", ten: "BQLDA Quảng Trị", noi_dung: "Thỏa thuận với 3 hộ" },
          { loai: "don_vi", id: "p-dtpc", ten: "Phòng Đầu tư và Pháp chế", noi_dung: "Công văn gửi UBND huyện Hướng Hóa" },
        ],
      }),
    );
    expect(ma).toBe(maViec);
    const cv = await chiTietViec(q, maViec);
    expect(cv?.ket_thuc).toBe("2026-08-05");
    expect(cv?.nguon_hien_hanh?.cap).toBe(1);
    const dangLam = cv!.phan_viec.filter((p) => p.trang_thai === "dang_lam");
    expect(dangLam.map((p) => p.phu_trach_id).sort()).toEqual(["bqlda-qt", "p-dtpc"]);
    expect(cv?.tien_do).toBe("0/1"); // tiến độ chỉ tính chủ trì
    expect(cv!.phan_viec.find((p) => p.phu_trach_id === "p-dtpc")?.vai).toBe("phoi_hop");
    // Agent khác đọc sổ cái thấy nguồn hiện hành là Form 0 · tuần 30
    const a = await dongChoAgent(q, maViec);
    expect(a?.nguon_hien_hanh?.cap).toBe(1);
    expect(a?.da_de.length).toBeGreaterThanOrEqual(2);
  });

  it("8. P.ĐT&PC (phối hợp) xong công văn UBND huyện: việc vẫn mở 0/1 (người ngoài đơn vị không bấm được phần chủ trì)", async () => {
    const q = await layQ();
    const cv = await chiTietViec(q, maViec);
    const p1 = cv!.phan_viec.find((p) => p.phu_trach_id === "bqlda-qt" && p.trang_thai === "dang_lam")!;
    await expect(tx((t) => ketThucPhanViec(t, hung, p1.id, {}))).rejects.toThrow();
    const p2 = cv!.phan_viec.find((p) => p.phu_trach_id === "p-dtpc" && p.trang_thai === "dang_lam")!;
    const kq = await tx((t) => ketThucPhanViec(t, truongDtpc, p2.id, {}));
    expect(kq).toEqual({ tien_do: "0/1", hoan_thanh: false });
  });

  it("9–10. BQLDA (chủ trì) thỏa thuận xong 3 hộ: 1/1 · việc hoàn thành, tự rời sổ cái, toàn bộ quá trình vào lịch sử", async () => {
    const q = await layQ();
    const cv = await chiTietViec(q, maViec);
    const p1 = cv!.phan_viec.find((p) => p.phu_trach_id === "bqlda-qt" && p.trang_thai === "dang_lam")!;
    const kq = await tx((t) => ketThucPhanViec(t, gdBqlda, p1.id, { ghi_chu: "Đã ký biên bản với 3 hộ" }));
    expect(kq).toEqual({ tien_do: "1/1", hoan_thanh: true });

    // Rời sổ cái
    const { rows } = await query<{ n: number }>("SELECT count(*)::int n FROM docflow.so_cai WHERE id = $1", [maViec]);
    expect(rows[0].n).toBe(0);
    expect((await danhSachSoCai(q)).some((v) => v.id === maViec)).toBe(false);
    expect((await viecDaXong(q)).some((v) => v.id === maViec)).toBe(true);

    // Lịch sử đủ quá trình: vào sổ cái → bị đè → giao việc → 2 lần kết thúc → hoàn thành
    const ls = await lichSuDoiTuong(q, "cong_viec", maViec);
    const hd = ls.map((d) => d.hanh_dong);
    for (const h of ["vao_so_cai", "bi_de", "ket_thuc_phan_viec", "cong_viec_hoan_thanh"]) expect(hd).toContain(h);
    expect(hd.filter((h) => h === "ket_thuc_phan_viec")).toHaveLength(2);
    // Lịch sử tài liệu tuần 29 có đủ tải lên bản 1, kiểm tra, bản 2, gửi, nhận
    const lsTl = (await lichSuDoiTuong(q, "tai_lieu", tuan29)).map((d) => d.hanh_dong);
    for (const h of ["tai_len", "kiem_tra", "gui", "nhan"]) expect(lsTl).toContain(h);
    // Chuỗi băm nguyên vẹn sau toàn bộ kịch bản
    expect(await kiemTraChuoi(q)).toBeNull();
    // Agent đọc: việc đã hoàn thành
    expect((await dongChoAgent(q, maViec))?.trang_thai).toBe("hoan_thanh");
  });
});
