// ============================================================
// KỊCH BẢN KHÓ — những cách người dùng thật viết / gửi báo cáo dễ làm sổ cái RƠI VIỆC:
//   nhiều việc gõ chung một ô (đánh số tay hoặc danh sách Word), dòng thiếu tên, ô gộp dọc, báo cáo rất nhiều dòng,
//   mã việc gõ sai, dòng chỉ ghi mã việc, bị trả lại rồi gửi lại bản sửa có thêm việc, chuyển tiếp lên cấp trên.
// Mỗi việc người viết ghi trong báo cáo phải có bản ghi trong sổ cái — hoặc báo cáo bị CHẶN, chỉ đúng chỗ phải sửa.
// ============================================================
import { describe, it, expect, beforeAll } from "vitest";
import JSZip from "jszip";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, boSinh, tep } from "../fixtures/chuan-bi";
import { tuanIso } from "../../scripts/chuyen-mau-that.mjs";
import { tx, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui, guiLai, nhan, traLai, chuyenTiep } from "@/lib/gui/dich-vu";
import type { NguoiDungPhien } from "@/lib/types";

type Dong = Record<string, string>;
let nv: NguoiDungPhien;
let truongDtpc: NguoiDungPhien;

/** Sửa document.xml của báo cáo đã sinh. */
async function suaXml(buf: Buffer, sua: (xml: string) => string): Promise<Buffer> {
  const z = await JSZip.loadAsync(buf);
  z.file("word/document.xml", sua(await z.file("word/document.xml")!.async("string")));
  return z.generateAsync({ type: "nodebuffer" });
}

/** Đoạn có chữ bắt đầu bằng "§" → mục danh sách đánh số của Word (numPr; số thứ tự KHÔNG nằm trong chữ). */
function danhSachWord(xml: string): string {
  let i: number;
  while ((i = xml.indexOf(">§")) >= 0) {
    const dauP = Math.max(xml.lastIndexOf("<w:p>", i), xml.lastIndexOf("<w:p ", i));
    const pPr = xml.indexOf("<w:pPr>", dauP);
    const numPr = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr>';
    xml = xml.slice(0, i + 1) + xml.slice(i + 2); // bỏ "§"
    if (pPr >= 0 && pPr < i) xml = xml.slice(0, pPr + 7) + numPr + xml.slice(pPr + 7);
    else {
      const hetTheP = xml.indexOf(">", dauP) + 1;
      xml = xml.slice(0, hetTheP) + `<w:pPr>${numPr}</w:pPr>` + xml.slice(hetTheP);
    }
  }
  return xml;
}

/** Ô có chữ "⇡" → ô gộp dọc với ô phía trên (vMerge tiếp nối, ô trống). */
function gopDoc(xml: string): string {
  let i: number;
  while ((i = xml.indexOf(">⇡<")) >= 0) {
    const dauTc = xml.lastIndexOf("<w:tc>", i);
    xml = xml.slice(0, i + 1) + xml.slice(i + 2);
    const tcPr = xml.indexOf("<w:tcPr>", dauTc);
    if (tcPr >= 0 && tcPr < i) xml = xml.slice(0, tcPr + 8) + "<w:vMerge/>" + xml.slice(tcPr + 8);
    else xml = xml.slice(0, dauTc + 6) + "<w:tcPr><w:vMerge/></w:tcPr>" + xml.slice(dauTc + 6);
  }
  return xml;
}

async function baoCaoBqlda(soTuan: number, dong: Dong[], sua?: (xml: string) => string): Promise<Buffer> {
  const { taoBaoCao, VI_DU } = await boSinh();
  const g = VI_DU.bqlda(29, "Lý Thị Nga");
  g.o.ky_bao_cao = { chon: "tuan", tuan: `${soTuan}/2026   (${tuanIso(soTuan, 2026).join(" – ")})` };
  g.bang.bang_cong_viec = dong;
  const buf = await taoBaoCao("form-7", g);
  return sua ? suaXml(buf, sua) : buf;
}

const viec = (ten: string, them: Dong = {}): Dong => ({ ten, du_an: "ĐG Hướng Việt", phu_trach: "BQLDA Quảng Trị", ket_thuc: "31/12/2026", ...them }); // hạn sau mọi tuần thử (bản 9 ngày tuần đúng → nộp tới tháng 9)

async function taiLen(buf: Buffer, ten = "bc.docx", taiLieuId?: string) {
  return tx((q) => taiLenVaKiemTra(q, nv, { tep: tep(ten, buf), ...(taiLieuId ? { tai_lieu_id: taiLieuId } : {}) }));
}

/** Gửi rồi trả về tên các việc (bảng Công việc) đã có bản ghi trong sổ cái từ tài liệu này. */
async function guiVaDoc(buf: Buffer): Promise<{ ten: string[]; ma: Map<string, string>; ket_qua: Awaited<ReturnType<typeof taiLen>>["ket_qua"]; tai_lieu_id: string }> {
  const r = await taiLen(buf);
  expect(r.ket_qua.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep)).toEqual([]);
  await tx((q) => gui(q, nv, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
  return { ...(await docSoCai(r.tai_lieu_id!)), ket_qua: r.ket_qua, tai_lieu_id: r.tai_lieu_id! };
}

async function docSoCai(taiLieuId: string) {
  const q = await layQ();
  const { rows } = await q.query<{ ten: string; cong_viec_id: string }>(
    `SELECT du_lieu->>'ten' AS ten, cong_viec_id FROM docflow.nguon_cong_viec
      WHERE tai_lieu_id = $1 AND du_lieu->>'nguon_bang' = 'bang_cong_viec' ORDER BY phien_ban, (du_lieu->>'dong_so')::int, id`,
    [taiLieuId],
  );
  return { ten: rows.map((r) => r.ten), ma: new Map(rows.map((r) => [r.ten, r.cong_viec_id])) };
}

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  nv = await nguoi("nv.bqlda@scigroup.vn");
  truongDtpc = await nguoi("truong.dtpc@scigroup.vn");
});

describe("Kịch bản khó: sổ cái không rơi việc", () => {
  it("báo cáo 15 việc (thêm nhiều dòng vào bảng) → đủ 15 việc", async () => {
    const ds = Array.from({ length: 15 }, (_, i) => viec(`Hạng mục kiểm thử số ${i + 1} trụ T${40 + i}`));
    const r = await guiVaDoc(await baoCaoBqlda(30, ds));
    expect(r.ten).toHaveLength(15);
  });

  it("nhiều việc gõ chung MỘT ô, đánh số tay → mỗi ý một việc", async () => {
    const r = await guiVaDoc(await baoCaoBqlda(31, [viec("1. Đổ bê tông móng trụ T60\n2. Lắp dựng cột trụ T61\n3. Kéo dây đoạn T61–T62")]));
    expect(r.ten).toEqual(["Đổ bê tông móng trụ T60", "Lắp dựng cột trụ T61", "Kéo dây đoạn T61–T62"]);
    expect(new Set(r.ma.values()).size).toBe(3);
  });

  it("nhiều việc gõ chung MỘT ô bằng danh sách đánh số của Word (số không nằm trong chữ) → mỗi ý một việc", async () => {
    const r = await guiVaDoc(await baoCaoBqlda(32, [viec("§Nghiệm thu móng trụ T70\n§Bàn giao mặt bằng trụ T71")], danhSachWord));
    expect(r.ten).toEqual(["Nghiệm thu móng trụ T70", "Bàn giao mặt bằng trụ T71"]);
  });

  it("một việc có mô tả nhiều dòng (dòng sau không phải danh sách) → vẫn là MỘT việc, mô tả giữ lại", async () => {
    const r = await guiVaDoc(await baoCaoBqlda(33, [viec("Thí nghiệm vật liệu trụ T80\nMẫu bê tông lấy tại hiện trường, gửi phòng LAS-XD")]));
    expect(r.ten).toEqual(["Thí nghiệm vật liệu trụ T80"]);
    expect((r.ket_qua.cong_viec[0] as { mo_ta?: string }).mo_ta).toContain("LAS-XD");
  });

  it("dòng có người làm + hạn nhưng QUÊN TÊN → chặn gửi, chỉ đúng ô (không lặng lẽ bỏ việc)", async () => {
    const r = await taiLen(await baoCaoBqlda(34, [viec("Gia cố mái taluy trụ T90"), viec("", { ket_qua_can_co: "Có biên bản nghiệm thu" })]));
    expect(r.ket_qua.dat).toBe(false);
    const c = r.ket_qua.loi.filter((l) => l.muc === "chan");
    expect(c).toEqual([expect.objectContaining({ luat: "ten_viec", vi_tri: { bang: "bang_cong_viec", dong: 2, cot: "ten" } })]);
  });

  it("tuần sau ghi lại tên việc + chọn Tình trạng \"Đã xong\" → vào đúng việc cũ và đóng việc (mẫu phiên bản 4, không còn cột Mã việc)", async () => {
    const r1 = await guiVaDoc(await baoCaoBqlda(35, [viec("Lắp tiếp địa trụ T95")]));
    const ma = r1.ma.get("Lắp tiếp địa trụ T95")!;
    // Không có mã: máy gợi ý trùng theo tên, người nộp xác nhận ở bước Duyệt việc (như bấm "Gộp")
    const t2 = await taiLen(await baoCaoBqlda(36, [viec("Lắp tiếp địa trụ T95", { tinh_trang: "Đã xong" })]));
    const goiY = t2.ket_qua.du_doan.find((d) => d.hanh_dong === "goi_y_trung");
    expect(goiY?.goi_y?.[0].cong_viec_id).toBe(ma);
    await tx((q) => gui(q, nv, { tai_lieu_id: t2.tai_lieu_id!, den: ["p-dtpc"], xac_nhan_trung: { [goiY!.dong]: ma } }));
    expect((await docSoCai(t2.tai_lieu_id!)).ma.get("Lắp tiếp địa trụ T95")).toBe(ma);
    const q = await layQ();
    expect((await q.query<{ trang_thai: string }>("SELECT trang_thai FROM docflow.cong_viec WHERE id = $1", [ma])).rows[0].trang_thai).toBe("hoan_thanh");
  });

  it("mã việc gõ sai → vẫn vào sổ là việc mới (ghi chú mã không có)", async () => {
    const r = await guiVaDoc(await baoCaoBqlda(37, [viec("Trồng cây hoàn trả rừng T14", { ma_viec: "CV-2026-9999" })]));
    expect(r.ten).toEqual(["Trồng cây hoàn trả rừng T14"]);
  });

  it("ô Dự án gộp dọc cho nhiều dòng → dòng dưới mang dự án của ô gộp", async () => {
    const r = await guiVaDoc(
      await baoCaoBqlda(38, [viec("Khảo sát tuyến đường dây 110kV"), viec("Đo điện trở đất trạm 110kV", { du_an: "⇡" }), viec("Lập hồ sơ đấu nối trạm 110kV", { du_an: "⇡" })], gopDoc),
    );
    expect(r.ket_qua.cong_viec.filter((c) => c.nguon_bang === "bang_cong_viec").map((c) => c.du_an)).toEqual(["ĐG Hướng Việt", "ĐG Hướng Việt", "ĐG Hướng Việt"]);
    expect(r.ten).toHaveLength(3);
  });

  it("bị trả lại → gửi lại bản sửa có THÊM việc → việc thêm vào sổ; chuyển tiếp lên Ban TGĐ không làm mất việc", async () => {
    const b1 = await taiLen(await baoCaoBqlda(39, [viec("Sửa đường công vụ K3")]), "tuan39.docx");
    const g = await tx((q) => gui(q, nv, { tai_lieu_id: b1.tai_lieu_id!, den: ["p-dtpc"] }));
    await tx((q) => nhan(q, truongDtpc, g.buoc_ids[0]));
    const bTra = await tx((q) => traLai(q, truongDtpc, { buoc_id: g.buoc_ids[0], ly_do: "thiếu việc cắm mốc" }));
    const buf2 = await baoCaoBqlda(39, [viec("Sửa đường công vụ K3"), viec("Cắm mốc giới hành lang tuyến K3–K5")]);
    const g2 = await tx((q) => guiLai(q, nv, { buoc_tra_lai_id: bTra, tep: tep("tuan39-ban2.docx", buf2) }));
    const sc = await docSoCai(b1.tai_lieu_id!);
    expect(sc.ten).toContain("Cắm mốc giới hành lang tuyến K3–K5");
    expect(new Set(sc.ten)).toEqual(new Set(["Sửa đường công vụ K3", "Cắm mốc giới hành lang tuyến K3–K5"]));
    await tx((q) => nhan(q, truongDtpc, g2.buoc_id));
    const ct = await tx((q) => chuyenTiep(q, truongDtpc, { buoc_id: g2.buoc_id, den: ["ban-tgd"] }));
    expect(ct.buoc_ids.length).toBe(1);
    const q = await layQ();
    const mo = await q.query<{ n: number }>("SELECT count(*)::int AS n FROM docflow.so_cai WHERE ten IN ('Sửa đường công vụ K3', 'Cắm mốc giới hành lang tuyến K3–K5')");
    expect(mo.rows[0].n).toBe(2);
  });
});
