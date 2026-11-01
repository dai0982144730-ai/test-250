// AI ĐỌC BÁO CÁO (so-cai/ai-ra-viec.ts, so-cai/ai-doc-bao-cao.ts) — AI giả lập, không gọi AI thật:
//   · tên việc gợi ý + việc trùng theo nghĩa (chỉ nhận mã việc có thật);
//   · việc NGOÀI BẢNG: câu gốc phải có thật trong báo cáo (bịa thì bỏ), trùng việc trong bảng thì bỏ, hạn đọc được;
//   · lưu kết quả theo bản tài liệu; người gửi tích chọn → vào sổ cái lúc gửi (bắt buộc có hạn);
//   · quản trị rà soát báo cáo đã gửi → ghi việc AI tìm thấy theo ngày gửi gốc.
import { describe, it, expect, beforeAll } from "vitest";
import type { DongCongViec } from "@/lib/types";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, tep, datCauHinh, xoaCauHinh } from "../fixtures/chuan-bi";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { tx, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { dungYeuCau, raSoatViecBangAi } from "@/lib/so-cai/ai-ra-viec";
import { BANG_AI, docBaoCaoBangAi, dongViecTuAi, layKetQuaAi } from "@/lib/so-cai/ai-doc-bao-cao";
import { raSoatHangNgay, raSoatSoCai, themViecAiChoBanDaGui } from "@/lib/so-cai/ra-soat";

const cv = (ten: string, kn?: string): DongCongViec => ({ ten, ket_qua_can_co: kn, phu_trach: [{ loai: "don_vi", id: "p-ktvh", ten: "P.KT&VH" }], nguon_bang: "bang_kien_nghi", dong_so: 1 });
const MO = [
  { id: "CV-2026-0009", ten: "Thay relay bảo vệ R21 máy phát TM2", du_an: "NM Nậm Xe" },
  { id: "CV-2026-0010", ten: "Nạo vét cửa nhận nước", du_an: "NM Nậm Xe" },
];
const MUC = [
  { tieu_de: "IV. TIẾN ĐỘ THU VỐN", van_ban: "TĐ Nậm Mô 1\n1.850,0\nThanh toán đúng KH; đợt 8 dự kiến T8\nTĐ Nậm Khiên 1\nCĐT chậm thanh toán đợt 4 — đã nhắc lần 2" },
  { tieu_de: "V. GHI CHÚ", van_ban: "Tuần tới Phòng KT&VH sẽ lập phương án nạo vét lòng hồ trước 15/08/2026." },
];

async function taiLenVaKiemTraGui(nv: Awaited<ReturnType<typeof nguoi>>): Promise<string> {
  const r = await tx((q) => taiLenVaKiemTra(q, nv, { tep: tep("BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx") }));
  await tx((q) => gui(q, nv, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
  return r.tai_lieu_id!;
}

describe("AI đọc báo cáo — xử lý câu trả lời của AI", () => {
  it("câu hỏi gửi AI có việc trong bảng, việc đang mở và phần chữ tự do theo mục", () => {
    const { prompt, system } = dungYeuCau([cv("Relay R21 có dấu hiệu bất thường", "Phê duyệt mua relay R21 thay thế")], MO, MUC);
    expect(prompt).toContain("#0 | tên: Relay R21 có dấu hiệu bất thường | kiến nghị / việc cần làm: Phê duyệt mua relay R21 thay thế");
    expect(prompt).toContain("CV-2026-0009 | Thay relay bảo vệ R21 máy phát TM2");
    expect(prompt).toContain("### V. GHI CHÚ\nTuần tới Phòng KT&VH sẽ lập phương án nạo vét lòng hồ");
    expect(system).toContain("CHÉP NGUYÊN VĂN");
    expect(system).toContain("Chỉ trả về JSON");
  });

  it("tên gợi ý + trùng: đọc JSON (kể cả bọc ```json), bỏ mã bịa, bỏ gợi ý trùng tên cũ", async () => {
    const ds = [cv("Relay R21 có dấu hiệu bất thường", "Phê duyệt mua relay R21"), cv("Nạo vét cửa nhận nước")];
    const traLoi =
      '```json\n{"viec":[{"i":0,"ten_goi_y":"Phê duyệt mua và thay relay R21 máy phát TM2","trung":[{"ma":"CV-2026-0009","ly_do":"cùng thay relay R21"},{"ma":"CV-2099-9999","ly_do":"bịa"}]},' +
      '{"i":1,"ten_goi_y":"Nạo vét cửa nhận nước","trung":[]},{"i":7,"ten_goi_y":"ngoài phạm vi","trung":[]}],"viec_them":[]}\n```';
    const kq = await raSoatViecBangAi(ds, MO, async () => traLoi);
    expect(kq.goi_y).toEqual([
      { chi_so: 0, ten_goi_y: "Phê duyệt mua và thay relay R21 máy phát TM2", trung: [{ ma: "CV-2026-0009", ten: "Thay relay bảo vệ R21 máy phát TM2", ly_do: "cùng thay relay R21" }] },
    ]);
    expect(kq.viec_them).toEqual([]);
  });

  it("việc ngoài bảng: câu gốc bịa → bỏ; trùng việc trong bảng → bỏ; hạn từ AI hoặc đọc từ câu gốc; mã trùng phải có thật", async () => {
    const ds = [cv("Thu vốn đợt 4 Nậm Khiên 1")];
    const traLoi = JSON.stringify({
      viec: [],
      viec_them: [
        { ten: "Thu vốn đợt 8 TĐ Nậm Mô 1", nguoi_lam: null, han: null, trich: "Thanh toán đúng KH;  đợt 8 dự kiến T8", muc: "IV. TIẾN ĐỘ THU VỐN", trung: [] },
        { ten: "Lập phương án nạo vét lòng hồ", nguoi_lam: "Phòng KT&VH", han: "15/08/2026", trich: "Tuần tới Phòng KT&VH sẽ lập phương án nạo vét lòng hồ trước 15/08/2026.", muc: "V. GHI CHÚ", trung: [{ ma: "CV-2026-0010", ly_do: "cùng nạo vét" }, { ma: "CV-X", ly_do: "bịa" }] },
        { ten: "Họp giao ban với CĐT", nguoi_lam: null, han: "20/08/2026", trich: "Họp giao ban với chủ đầu tư ngày 20/08", muc: null, trung: [] },
        { ten: "Nhắc CĐT thu vốn đợt 4 Nậm Khiên 1", nguoi_lam: null, han: null, trich: "CĐT chậm thanh toán đợt 4 — đã nhắc lần 2", muc: null, trung: [] },
        { ten: "", trich: "Thanh toán đúng KH" },
      ],
    });
    const kq = await raSoatViecBangAi(ds, MO, async () => traLoi, { muc: MUC, ngay_lap: "2026-08-03", nam: 2026 });
    expect(kq.viec_them.map((v) => v.ten)).toEqual(["Thu vốn đợt 8 TĐ Nậm Mô 1", "Lập phương án nạo vét lòng hồ"]); // câu bịa + trùng bảng + không tên → bỏ
    expect(kq.viec_them[0].han).toBe("2026-08-31"); // "dự kiến T8" → cuối tháng 8 (quy tắc đọc từ câu gốc)
    expect(kq.viec_them[1]).toMatchObject({ han: "2026-08-15", nguoi_lam: "Phòng KT&VH", muc: "V. GHI CHÚ", trung: [{ ma: "CV-2026-0010", ten: "Nạo vét cửa nhận nước", ly_do: "cùng nạo vét" }] });
  });

  it("dòng thiếu hạn: AI chỉ ra hạn ghi ở chỗ khác — chỉ nhận khi câu gốc có thật và đọc ra ngày", async () => {
    const ds: DongCongViec[] = [
      { ten: "Lập hồ sơ mời thầu EPC HP1", phu_trach: [], nguon_bang: "bang_kien_nghi", dong_so: 1 },
      { ten: "Đấu nối lưới 110kV HP1", phu_trach: [], nguon_bang: "bang_kien_nghi", dong_so: 2 },
      { ten: "Có hạn rồi", ket_thuc: "2026-09-30", phu_trach: [], nguon_bang: "bang_kien_nghi", dong_so: 3 },
    ];
    const vanBan = "Lập hồ sơ mời thầu EPC | Chưa bắt đầu | T11/2026 | Chờ TKCS được phê duyệt";
    const traLoi = JSON.stringify({
      viec: [
        { i: 0, ten_goi_y: null, trung: [], han: "30/11/2026", trich_han: "Lập hồ sơ mời thầu EPC | Chưa bắt đầu | T11/2026" },
        { i: 1, ten_goi_y: null, trung: [], han: "31/01/2027", trich_han: "Đấu nối lưới T1/2027 (câu AI bịa)" },
        { i: 2, ten_goi_y: null, trung: [], han: "01/01/2027", trich_han: "Lập hồ sơ mời thầu EPC" },
      ],
      viec_them: [],
    });
    const kq = await raSoatViecBangAi(ds, MO, async () => traLoi, { van_ban: vanBan, ngay_lap: "2026-09-25", nam: 2026 });
    expect(kq.goi_y).toEqual([{ chi_so: 0, ten_goi_y: null, trung: [], han_goi_y: { han: "2026-11-30", trich: "Lập hồ sơ mời thầu EPC | Chưa bắt đầu | T11/2026" } }]);
  });

  it("soát gộp trùng trong báo cáo: dòng AI thấy là việc khác → đưa ra để tách (kèm lý do, hạn đọc từ dòng)", async () => {
    const daGop = [
      { bang: "bang_kien_nghi", dong: 2, ten: "GPMB Trụ T12–T18 chưa xong", chu: "GPMB Trụ T12–T18 chưa xong — Đề nghị TGĐ ký công văn trước 30/09", voi: "GPMB Trụ T11" },
      { bang: "bang_gpmb", dong: 1, ten: "GPMB T11 (3 hộ)", chu: "T11 (3 hộ dân) — Khiếu nại", voi: "GPMB Trụ T11" },
    ];
    const traLoi = JSON.stringify({ viec: [], viec_them: [], tach: [{ d: 0, ten: "Ký công văn đôn đốc GPMB Trụ T12–T18", ly_do: "khác vị trí trụ (T12–T18 so với T11)" }, { d: 9, ten: "x" }] });
    const kq = await raSoatViecBangAi([], MO, async () => traLoi, { da_gop: daGop, ngay_lap: "2026-09-25", nam: 2026 });
    expect(kq.viec_them).toEqual([
      {
        ten: "Ký công văn đôn đốc GPMB Trụ T12–T18",
        nguoi_lam: null,
        han: "2026-09-30",
        trich: daGop[0].chu,
        muc: null,
        trung: [],
        tach: { bang: "bang_kien_nghi", dong: 2, voi: "GPMB Trụ T11", ly_do: "khác vị trí trụ (T12–T18 so với T11)" },
      },
    ]);
  });

  it("AI trả rác → báo lỗi rõ", async () => {
    await expect(raSoatViecBangAi([cv("x")], MO, async () => "xin lỗi, tôi không làm được")).rejects.toThrow(/JSON/);
  });
});

describe("AI đọc báo cáo — lưu, gửi kèm việc đã chọn, bổ sung báo cáo đã gửi", () => {
  let taiLieu = "";
  let phienBan = 0;
  const AI_GIA = async () =>
    JSON.stringify({
      viec: [],
      viec_them: [
        { ten: "Thu vốn đợt 8 TĐ Nậm Mô 1", nguoi_lam: "SCI E&C", han: null, trich: "Thanh toán đúng KH; đợt 8 dự kiến T8", muc: "IV. TIẾN ĐỘ THU VỐN & HỢP ĐỒNG", trung: [] },
        { ten: "Xử lý cửa van đường hầm dẫn nước Nậm Mô 1", nguoi_lam: null, han: null, trich: "Hầm chính hoàn thành; đang xử lý cửa van", muc: "II. TIẾN ĐỘ THI CÔNG", trung: [] },
        // cùng mảng việc "Đập chính Nậm Mô 1 đạt 85%" đã có trong bảng Kế hoạch → hệ thống bỏ
        { ten: "Bù tiến độ đập chính Nậm Mô 1", nguoi_lam: null, han: null, trich: "Chậm do mưa lớn T6; bù lại T7 (2 ca)", muc: "II. TIẾN ĐỘ THI CÔNG", trung: [] },
        { ten: "Việc AI bịa", nguoi_lam: null, han: "30/09/2026", trich: "Câu này không có trong báo cáo", muc: null, trung: [] },
      ],
    });

  beforeAll(async () => {
    khoTam();
    await csdlMoi();
    const nv = await nguoi("nv.enc@scigroup.vn");
    const r = await tx((q) => taiLenVaKiemTra(q, nv, { tep: tep("BaoCao_Thang7_SCI_ENC.docx") }));
    taiLieu = r.tai_lieu_id!;
    phienBan = r.phien_ban!;
  });

  it("đọc phần chữ tự do của báo cáo thật (cả chữ trong bảng số liệu), bỏ việc bịa, lưu theo bản tài liệu", async () => {
    const q = await layQ();
    expect(await layKetQuaAi(q, taiLieu, phienBan)).toBeNull();
    const kq = await docBaoCaoBangAi(q, taiLieu, phienBan, AI_GIA);
    expect(kq.loi).toBeNull();
    expect(kq.ket_qua!.viec_them.map((v) => v.ten)).toEqual(["Thu vốn đợt 8 TĐ Nậm Mô 1", "Xử lý cửa van đường hầm dẫn nước Nậm Mô 1"]);
    expect((await layKetQuaAi(q, taiLieu, phienBan))?.ket_qua?.viec_them).toHaveLength(2);
    // AI lỗi: lưu lỗi, không ném
    const loi = await docBaoCaoBangAi(q, taiLieu, phienBan, async () => {
      throw new Error("AI chưa kết nối");
    });
    expect(loi).toMatchObject({ ket_qua: null, loi: "AI chưa kết nối" });
    await docBaoCaoBangAi(q, taiLieu, phienBan, AI_GIA);
  });

  it("gửi kèm việc AI tìm thấy đã chọn: thiếu hạn → chặn (quy tắc thật); có hạn → vào sổ cái (người làm phân giải, câu gốc giữ lại)", async () => {
    const nv = await nguoi("nv.enc@scigroup.vn");
    const them = [{ ten: "Thu vốn đợt 8 TĐ Nậm Mô 1", nguoi_lam: "SCI E&C", han: null, trich: "Thanh toán đúng KH; đợt 8 dự kiến T8" }];
    const q0 = await layQ();
    await datCauHinh(q0, "quy_tac_de", { ...MAC_DINH.quy_tac_de, viec_khong_ngay_luon_mo: false });
    await expect(dongViecTuAi(q0, them, { don_vi_lap: "sci-enc", ten_don_vi_lap: "SCI E&C", nam: 2026 })).rejects.toThrow(/chưa có hạn/);
    await xoaCauHinh(q0, "quy_tac_de");
    // việc AI thứ hai không tích = người gửi đã xem, không phải việc
    await tx((q) =>
      gui(q, nv, { tai_lieu_id: taiLieu, den: ["p-dtpc"], them_viec: [{ ...them[0], han: "2026-08-31" }], bo_qua_ai: ["Hầm chính hoàn thành; đang xử lý cửa van"] }),
    );
    const rs = await tx((q) => raSoatSoCai(q));
    expect(rs.tai_lieu.find((t) => t.tai_lieu_id === taiLieu)).toMatchObject({ thieu: [] });
    const q = await layQ();
    const { rows } = await q.query<{ ten: string; ket_thuc: string; kq: string; pt: string }>(
      `SELECT c.ten, c.ket_thuc::text, c.ket_qua_can_co AS kq, (SELECT string_agg(p.phu_trach_id, ',') FROM docflow.phan_viec p WHERE p.cong_viec_id = c.id) AS pt
         FROM docflow.nguon_cong_viec n JOIN docflow.cong_viec c ON c.id = n.cong_viec_id WHERE n.tai_lieu_id = $1 AND n.du_lieu->>'nguon_bang' = $2`,
      [taiLieu, BANG_AI],
    );
    expect(rows).toEqual([{ ten: "Thu vốn đợt 8 TĐ Nậm Mô 1", ket_thuc: "2026-08-31", kq: "AI tìm thấy ngoài bảng: “Thanh toán đúng KH; đợt 8 dự kiến T8”", pt: "sci-enc" }]);
    // chuông báo sau khi gửi không kêu (mọi dòng, kể cả dòng AI, đều có trong sổ)
    expect((await q.query("SELECT 1 FROM docflow.lich_su WHERE hanh_dong = 'so_cai_thieu'")).rows).toHaveLength(0);
  });

  it("quản trị rà soát báo cáo đã gửi: ghi việc AI tìm thấy vào sổ theo ngày gửi gốc, đánh số dòng tiếp theo", async () => {
    const kq = await tx((q) => themViecAiChoBanDaGui(q, taiLieu, [{ ten: "Xử lý cửa van đường hầm dẫn nước Nậm Mô 1", han: "2026-08-15", trich: "Hầm chính hoàn thành; đang xử lý cửa van" }]));
    expect(kq[0]).toMatchObject({ hanh_dong: "tao_moi" });
    const q = await layQ();
    const r = await q.query<{ dong_so: number; ngay_gui: string; luc: string }>(
      `SELECT n.dong_so, n.ngay_gui::text, (SELECT min(b.luc)::text FROM docflow.buoc_hanh_trinh b WHERE b.tai_lieu_id = $1 AND b.loai = 'gui') AS luc
         FROM docflow.nguon_cong_viec n WHERE n.cong_viec_id = $2`,
      [taiLieu, kq[0].cong_viec_id],
    );
    expect(r.rows[0].dong_so).toBe(2); // dòng AI thứ 2 của bản này
    expect(Date.parse(r.rows[0].ngay_gui)).toBe(Date.parse(r.rows[0].luc));
  });

  it("rà soát hằng ngày KHÔNG còn phần AI (chốt 29/09): không đếm việc AI ngoài bảng, không báo quản trị khi sổ cái đủ", async () => {
    const nv = await nguoi("nv.bqlda@scigroup.vn");
    const r = await taiLenVaKiemTraGui(nv);
    const q = await layQ();
    const kq = await tx((t) => raSoatHangNgay(t));
    expect(kq.so_thieu).toBe(0);
    expect(kq.tai_lieu.find((t) => t.tai_lieu_id === r)).toBeDefined();
    const tb = await q.query("SELECT 1 FROM docflow.thong_bao WHERE nguoi_nhan = 'quan-tri' AND noi_dung LIKE 'AI đọc báo cáo đã gửi%'");
    expect(tb.rows).toHaveLength(0);
  });
});
