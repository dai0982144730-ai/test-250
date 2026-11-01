// MỖI VIỆC MỘT LÃNH ĐẠO PHỐI HỢP (Mr. Đại chốt 03/10/2026, db/82) + CHỨC NĂNG NHIỆM VỤ ĐƠN VỊ (db/81).
// Chạy offline: CSDL RAM, AI là hàm giả.
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi } from "../helpers/csdl";
import { layQ, tx } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { CHUC_NANG_MAC_DINH, docChucNang, napChucNangMacDinh } from "@/lib/chuc-nang-don-vi";
import { docTraLoi, xetMotLuot } from "@/lib/so-cai/lanh-dao-phoi-hop";
import { soanDeXuat } from "@/lib/cay-viec/soan-giao";

const LD = [
  ["bld-tgd", "Tổng Giám đốc · Trương Bửu Ngọc"],
  ["bld-ptgd-do", "Phó Tổng Giám đốc · Nguyễn Văn Độ"],
  ["bld-ptgd-nghia", "Phó Tổng Giám đốc · Phạm Văn Nghĩa"],
];

async function viec(id: string, ten: string, pt: { loai: string; id: string; vai: string }[]) {
  await tx(async (q) => {
    await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai) VALUES ($1,$2,'ĐG Hướng Việt','dang_mo')", [id, ten]);
    let i = 0;
    for (const p of pt)
      await q.query(
        "INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, luon_mo, thu_tu, vai) VALUES ($1,$2,$3,$4,$5,true,$6,$7)",
        [`pv-${id}-${i}`, id, p.loai, p.id, ten, ++i, p.vai],
      );
  });
}

describe("chức năng nhiệm vụ + lãnh đạo phối hợp", () => {
  let dvPhong = "";
  beforeAll(async () => {
    await csdlMoi();
    await tx(async (q) => {
      for (const [id, ten] of LD)
        await q.query("INSERT INTO identity.don_vi (id, ten, ten_ngan, cap, loai) VALUES ($1,$2,$2,1,'chuc_danh') ON CONFLICT (id) DO NOTHING", [id, ten]);
      dvPhong = (await q.query<{ id: string }>("SELECT id FROM identity.don_vi WHERE loai = 'phong' AND active ORDER BY id LIMIT 1")).rows[0].id;
      await q.query("DELETE FROM docflow.luat_danh_dau WHERE khoa = 'chuc_nang_don_vi_0310'");
      await napChucNangMacDinh(q);
    });
    await viec("CV-A", "Xin văn bản chấp thuận chủ trương đầu tư Hướng Việt", [{ loai: "don_vi", id: dvPhong, vai: "chu_tri" }]);
    await viec("CV-B", "Thẩm tra thiết kế trạm biến áp", [{ loai: "don_vi", id: dvPhong, vai: "chu_tri" }, { loai: "don_vi", id: "bld-ptgd-nghia", vai: "phoi_hop" }]);
    await viec("CV-C", "TGĐ tự họp đối tác", [{ loai: "don_vi", id: "bld-tgd", vai: "chu_tri" }]);
  });

  it("nạp sẵn chức năng một lần, chỉ ô trống; lần sau không đè chữ người đã sửa", async () => {
    const q = await layQ();
    const cn = await docChucNang(q);
    expect(cn.find((d) => d.id === "bld-ptgd-do")?.chuc_nang).toBe(CHUC_NANG_MAC_DINH["bld-ptgd-do"]);
    await tx((t) => t.query("UPDATE identity.don_vi SET chuc_nang = 'người sửa' WHERE id = 'bld-tgd'"));
    await tx((t) => napChucNangMacDinh(t));
    expect((await docChucNang(q)).find((d) => d.id === "bld-tgd")?.chuc_nang).toBe("người sửa");
    await tx((t) => t.query("UPDATE identity.don_vi SET chuc_nang = $1 WHERE id = 'bld-tgd'", [CHUC_NANG_MAC_DINH["bld-tgd"]]));
  });

  it("dò dự án trong tên việc: giữ dấu (Nậm Khiên ≠ Nam Khiên), bỏ tiền tố, bỏ tên ngắn, lấy tên dài nhất", async () => {
    const { duAnTrongTen } = await import("@/lib/so-cai/lanh-dao-phoi-hop");
    const ds = [
      { id: "da-hv", ten: "Hướng Việt", ten_khac: ["ĐG Hướng Việt", "HV"] },
      { id: "da-nk2", ten: "Nam Khian 2", ten_khac: ["TĐ Nam Khiên 2"] },
      { id: "da-nkh1", ten: "Nậm Khiên 1", ten_khac: ["TĐ Nậm Khiên 1"] },
      { id: "da-hp1", ten: "Hướng Phùng 1", ten_khac: ["Hướng Phùng"] },
    ];
    expect(duAnTrongTen("GPMB Trụ T12–T18 DA Hướng Việt chưa xong", ds)?.id).toBe("da-hv");
    expect(duAnTrongTen("HĐ khảo sát Nam Khiên 2&3 chưa ký", ds)?.id).toBe("da-nk2");
    expect(duAnTrongTen("Gia hạn GPXD Nậm Khiên 1", ds)?.id).toBe("da-nkh1");
    expect(duAnTrongTen("ĐG Hướng Phùng 1: TKCS chưa duyệt", ds)?.id).toBe("da-hp1");
    expect(duAnTrongTen("Họp HV tuần", ds)).toBeNull(); // "HV" quá ngắn
  });

  it("đọc trả lời AI: bỏ mã việc lạ, mã lãnh đạo bịa, dòng trùng", () => {
    const m = docTraLoi(
      'ok [{"ma":"CV-A","lanh_dao":"bld-ptgd-do","ly_do":"pháp lý BQLDA QT"},{"ma":"CV-A","lanh_dao":"bld-tgd"},{"ma":"CV-X","lanh_dao":"bld-tgd"},{"ma":"CV-B","lanh_dao":"bld-bia"}]',
      new Set(["CV-A", "CV-B"]),
      new Set(["bld-tgd", "bld-ptgd-do"]),
    );
    expect([...m.entries()]).toEqual([["CV-A", { lanh_dao: "bld-ptgd-do", ly_do: "pháp lý BQLDA QT" }]]);
    expect(docTraLoi("không phải JSON", new Set(), new Set()).size).toBe(0);
  });

  it("một lượt: AI gắn việc chưa có; việc đã có lãnh đạo và việc lãnh đạo chủ trì thì chỉ ghi sổ xét; không xét lại", async () => {
    const q = await layQ();
    const ds = await layCauHinh(q, "du_an");
    let prompt = "";
    const kq = await xetMotLuot(q, tx, ds, async (p) => {
      prompt = p;
      return '[{"ma":"CV-A","lanh_dao":"bld-ptgd-do","ly_do":"pháp lý dự án BQLDA Quảng Trị"}]';
    });
    expect(kq).toMatchObject({ so_xet: 3, ai_gan: 1, co_san: 1, chu_tri_la_lanh_dao: 1, bo_qua: 0 });
    expect(prompt).toContain("bld-ptgd-do | Phó Tổng Giám đốc · Nguyễn Văn Độ | Chỉ đạo các phòng giải quyết");
    expect(prompt).toContain("CV-A | Xin văn bản chấp thuận");
    expect(prompt).not.toContain("CV-B |"); // đã có lãnh đạo → không hỏi AI
    const pv = (await q.query<{ phu_trach_id: string; vai: string }>("SELECT phu_trach_id, vai FROM docflow.phan_viec WHERE cong_viec_id = 'CV-A' AND NOT da_bo ORDER BY thu_tu")).rows;
    expect(pv).toEqual([
      { phu_trach_id: dvPhong, vai: "chu_tri" },
      { phu_trach_id: "bld-ptgd-do", vai: "phoi_hop" },
    ]);
    const so = (await q.query<{ cong_viec_id: string; nguon: string }>("SELECT cong_viec_id, nguon FROM docflow.lanh_dao_phoi_hop ORDER BY cong_viec_id")).rows;
    expect(so).toEqual([
      { cong_viec_id: "CV-A", nguon: "ai" },
      { cong_viec_id: "CV-B", nguon: "co_san" },
      { cong_viec_id: "CV-C", nguon: "chu_tri_la_lanh_dao" },
    ]);
    // lượt sau: không còn gì để xét, AI không bị gọi
    let goi = 0;
    const kq2 = await xetMotLuot(q, tx, ds, async () => {
      goi++;
      return "[]";
    });
    expect(kq2.so_xet).toBe(0);
    expect(goi).toBe(0);
  });

  it("người bỏ lãnh đạo đi thì máy không gắn lại (sổ xét giữ dòng)", async () => {
    await tx((q) => q.query("UPDATE docflow.phan_viec SET da_bo = true WHERE cong_viec_id = 'CV-A' AND phu_trach_id = 'bld-ptgd-do'"));
    const q = await layQ();
    const kq = await xetMotLuot(q, tx, await layCauHinh(q, "du_an"), async () => '[{"ma":"CV-A","lanh_dao":"bld-tgd","ly_do":"x"}]');
    expect(kq.so_xet).toBe(0);
  });

  it("chạy lại: gỡ lựa chọn của AI một lần (giữ việc có sẵn / người sửa), vòng sau xét lại với bảng dự án trong prompt", async () => {
    // CV-D: AI gắn rồi người sửa → giữ
    await viec("CV-D", "Rà soát HĐ EPC", [{ loai: "don_vi", id: dvPhong, vai: "chu_tri" }, { loai: "don_vi", id: "bld-ptgd-do", vai: "phoi_hop" }]);
    await tx((q) => q.query("INSERT INTO docflow.lanh_dao_phoi_hop (cong_viec_id, don_vi_id, ly_do, nguon) VALUES ('CV-D','bld-ptgd-do','x','nguoi')"));
    // CV-A đang bị người bỏ lãnh đạo (test trên) → gắn lại cho có dòng AI còn nguyên
    await tx((q) => q.query("UPDATE docflow.phan_viec SET da_bo = false WHERE cong_viec_id = 'CV-A' AND phu_trach_id = 'bld-ptgd-do'"));
    const { goLuaChonAi } = await import("@/lib/so-cai/lanh-dao-phoi-hop");
    expect(await tx((q) => goLuaChonAi(q, "test_go"))).toBe(1);
    expect(await tx((q) => goLuaChonAi(q, "test_go"))).toBe(0); // một lần
    const q = await layQ();
    const conA = await q.query("SELECT 1 FROM docflow.phan_viec WHERE cong_viec_id = 'CV-A' AND phu_trach_id = 'bld-ptgd-do'");
    expect(conA.rows.length).toBe(0);
    const so = (await q.query<{ cong_viec_id: string }>("SELECT cong_viec_id FROM docflow.lanh_dao_phoi_hop ORDER BY cong_viec_id")).rows.map((r) => r.cong_viec_id);
    expect(so).toEqual(["CV-B", "CV-C", "CV-D"]);
    let prompt = "";
    const kq = await xetMotLuot(q, tx, await layCauHinh(q, "du_an"), async (p) => {
      prompt = p;
      return '[{"ma":"CV-A","loai":"phap_ly","lanh_dao":"bld-ptgd-do","ly_do":"phap_ly · Chỉ đạo các phòng giải quyết…"}]';
    });
    expect(kq).toMatchObject({ so_xet: 1, ai_gan: 1 });
    expect(prompt).toContain("DỰ ÁN (tên | tên khác | đơn vị triển khai)");
  });

  it("🤖 soạn giao: chưa có lịch sử vẫn đề xuất theo chức năng nhiệm vụ, kèm phối hợp + lãnh đạo phụ trách", async () => {
    const q = await layQ();
    const ds = await layCauHinh(q, "du_an");
    let gui = "";
    const kq = await soanDeXuat(q, ds, { id: "da-hv", ten: "Hướng Việt" }, { ma_wbs: "9.1", ten: "Thủ tục đóng điện" }, new Map(), async (p) => {
      gui = p;
      return JSON.stringify({ ma: dvPhong, phoi_hop: [dvPhong, "bia"], lanh_dao: "bld-ptgd-nghia", ly_do: "chức năng ghi thủ tục đóng điện" });
    });
    expect(gui).toContain("BAN LÃNH ĐẠO");
    expect(gui).toContain("(chưa có việc nào gắn mã đã duyệt)");
    expect(kq.ok).toBe(true);
    expect(kq.ok && kq.de_xuat.giao_cho).toBe(dvPhong);
    expect(kq.ok && kq.de_xuat.can_cu).toMatch(/Lãnh đạo phụ trách: Phó Tổng Giám đốc · Phạm Văn Nghĩa/);
    expect(kq.ok && kq.de_xuat.can_cu).not.toMatch(/Phối hợp:/); // chủ trì + mã bịa bị lọc hết
  });
});
