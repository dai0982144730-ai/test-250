// Tab "Cần ra quyết định" (Mr. Đại chốt 02/10/2026): CODE đọc dòng kiến nghị trong báo cáo mới nhất của từng đơn vị trong tuần,
// mỗi dòng: chưa có việc → Giao việc · có việc đang chạy → Nhắc + bình luận · đã xong → "Đã xong". Code: lib/bao-cao-tuan/can-quyet.ts
import { describe, it, expect, beforeAll } from "vitest";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, boSinh, tep } from "../fixtures/chuan-bi";
import { tuanIso } from "../../scripts/chuyen-mau-that.mjs";
import { tx, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { giaoViec } from "@/lib/so-cai/dich-vu";
import { dongCanQuyet, ghiGiaoTuKienNghi, locChoBld } from "@/lib/bao-cao-tuan/can-quyet";
import { chuanHoa } from "@/lib/so-cai/tien-ich";
import type { NguoiDungPhien } from "@/lib/types";

let nv: NguoiDungPhien;
let tgd: NguoiDungPhien;
const TUAN = 30;
const [TU, DEN] = tuanIso(TUAN, 2026).map((d: string) => d.split("/").reverse().join("-"));

beforeAll(async () => {
  khoTam();
  await csdlMoi();
  nv = await nguoi("nv.bqlda@scigroup.vn");
  tgd = await nguoi("tgd@scigroup.vn");
  const { taoBaoCao, VI_DU } = await boSinh();
  const g = VI_DU.bqlda(29, "Lý Thị Nga");
  g.o.ky_bao_cao = { chon: "tuan", tuan: `${TUAN}/2026   (${tuanIso(TUAN, 2026).join(" – ")})` };
  g.bang.bang_cong_viec = [{ ten: "Đổ bê tông móng trụ T60", du_an: "ĐG Hướng Việt", phu_trach: "BQLDA Quảng Trị", ket_thuc: "31/12/2026" }];
  g.bang.bang_kien_nghi = [
    { stt: "1", noi_dung: "Thiếu kỹ sư giám sát an toàn điện cho đợt đóng điện trạm 110 kV", muc_do: "Cao", anh_huong: "Chậm đóng điện", kien_nghi: "Đề nghị TGĐ điều động 2 kỹ sư từ P.CĐ" },
    { stt: "2", noi_dung: "Đổ bê tông móng trụ T60 cần thêm xe bồn", muc_do: "Trung bình", anh_huong: "", kien_nghi: "Thuê thêm 2 xe bồn" },
  ];
  const buf = await taoBaoCao("form-7", g);
  const r = await tx((q) => taiLenVaKiemTra(q, nv, { tep: tep("bc.docx", buf) }));
  expect(r.ket_qua.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep)).toEqual([]);
  await tx((q) => gui(q, nv, { tai_lieu_id: r.tai_lieu_id!, den: ["p-dtpc"] }));
});

describe("tab Cần ra quyết định", () => {
  it("đọc đủ 2 dòng kiến nghị kèm cột Kiến nghị, đơn vị + link báo cáo; dòng 1 chưa có việc; dòng 2 tên việc nằm trọn trong câu → chắc chắn cùng việc", async () => {
    const ds = await dongCanQuyet(await layQ(), { tu: TU, den: DEN });
    expect(ds).toHaveLength(2);
    const [a, b] = ds;
    expect(a.noi_dung).toContain("kỹ sư giám sát an toàn điện");
    expect(a.kien_nghi).toBe("Đề nghị TGĐ điều động 2 kỹ sư từ P.CĐ");
    expect(a.don_vi.map((d) => d.id)).toEqual(["bqlda-qt"]);
    expect(a.don_vi[0].tai_lieu_id).toBeTruthy();
    expect(a.viec).toBeNull();
    // "Đổ bê tông móng trụ T60 cần thêm xe bồn" chứa trọn việc "Đổ bê tông móng trụ T60" → người đọc biết ngay là việc đó (chốt 02/10)
    expect(b.viec?.ten).toBe("Đổ bê tông móng trụ T60");
  });

  it("lãnh đạo giao việc từ dòng 1 → dòng đó thành 'đã có việc, đang chạy' (lần đọc sau)", async () => {
    const ds = await dongCanQuyet(await layQ(), { tu: TU, den: DEN });
    const ma = await tx((q) => giaoViec(q, tgd, { ten: "Điều động kỹ sư giám sát đóng điện", ket_thuc: "2099-12-31", phan_viec: [{ loai: "don_vi", id: "bqlda-qt", ten: "BQLDA Quảng Trị" }] }));
    await tx((q) => ghiGiaoTuKienNghi(q, ds[0].khoa, ma, tgd.id));
    const sau = await dongCanQuyet(await layQ(), { tu: TU, den: DEN });
    const d = sau.find((x) => x.khoa === chuanHoa("Thiếu kỹ sư giám sát an toàn điện cho đợt đóng điện trạm 110 kV"))!;
    expect(d.viec).toMatchObject({ ma, trang_thai: "dang_mo" });
    expect(sau.every((x) => x.viec)).toBe(true); // cả 2 dòng giờ đã có việc
  });

  it("lọc cho BLĐ: việc AI chấm dễ (2) → ẩn, đếm vào an_de; chấm vừa (4) → hiện; điểm nóng dễ → ẩn", async () => {
    const q = await layQ();
    const ds = await dongCanQuyet(q, { tu: TU, den: DEN });
    const ma = ds.find((d) => d.viec)!.viec!.ma;
    await q.query("INSERT INTO docflow.do_kho_viec (cong_viec_id, diem, ly_do, nguon) VALUES ($1, 2, 'test', 'ai') ON CONFLICT (cong_viec_id) DO UPDATE SET diem = 2", [ma]);
    const de = await locChoBld(q, ds, [ma, "CV-2099-0001"]);
    expect(de.dong.some((d) => d.viec?.ma === ma)).toBe(false);
    expect(de.an_de).toBe(1);
    expect(de.dong).toHaveLength(ds.length - 1); // chỉ ẩn đúng dòng việc dễ
    expect(de.nong_an).toEqual([ma]);
    await q.query("UPDATE docflow.do_kho_viec SET diem = 4 WHERE cong_viec_id = $1", [ma]);
    const vua = await locChoBld(q, ds, [ma]);
    expect(vua.dong.some((d) => d.viec?.ma === ma)).toBe(true);
    expect(vua.nong_an).toEqual([]);
  });

  it("tuần khác (không có báo cáo) → rỗng", async () => {
    expect(await dongCanQuyet(await layQ(), { tu: "2026-08-03", den: "2026-08-09" })).toEqual([]);
  });
});

describe("so kiến nghị với tên việc như người đọc (doChuaTrong — chốt 02/10)", () => {
  it("câu ngắn nằm trong câu dài, hiểu chữ viết tắt; số hiệu khác là khác việc", async () => {
    const { doChuaTrong } = await import("@/lib/bao-cao-tuan/can-quyet");
    expect(doChuaTrong("Trình TGĐ phê duyệt điều chỉnh TMĐT Nậm Khiên 1", "Phê duyệt điều chỉnh tổng mức đầu tư Nậm Khiên 1 (+45 tỷ)")).toBe(1);
    expect(doChuaTrong("PDA quyền phát triển cụm dự án Lào", "Quyết định gia hạn hay dừng PDA cụm dự án Lào")).toBeGreaterThanOrEqual(0.8);
    expect(doChuaTrong("GPMB Trụ T11", "GPMB T11 (cụm Nam A): 3 hộ khiếu nại về đơn giá đền bù")).toBe(1);
    expect(doChuaTrong("Chuyển mục đích đất rừng T14–T16", "Chuyển mục đích đất rừng T14–T16: Sở NN&PTNT chưa có văn bản đồng ý")).toBe(1);
    expect(doChuaTrong("GPMB Trụ T11", "GPMB Trụ T12–T18 DA Hướng Việt chưa xong")).toBe(0);
    expect(doChuaTrong("Hợp đồng bảo vệ VP Hà Nội & các nhà máy hết hạn 31/07", "Thời hạn bảo hành HĐ tuabin Hướng Phùng 1 chưa thống nhất")).toBeLessThan(0.8);
  });
});
