// ============================================================
// KỊCH BẢN GỬI — SỔ CÁI GHI HẾT VIỆC CỦA MỌI BÁO CÁO. Gửi lần lượt (đúng thứ tự thời gian) mọi báo cáo mẫu đang có:
// tuần 28–29 · hợp nhất tuần 30 (TGĐ quyết định) · SCI E&C tháng 7–8 · bộ tuần 39 · 9 file Word gốc Form 0–8.
// Với từng báo cáo: MỌI dòng việc (chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC …" / Tiến độ thiết kế Form 5 — từ mẫu phiên bản 4, 29/09/2026,
// bảng Kiến nghị / Sự cố / Cảnh báo / GPMB không còn sinh việc; file theo mẫu cũ vẫn nhận, Form 6 cũ bang_ke_hoach = bảng việc)
// phải có bản ghi trong sổ cái (việc mới, gộp vào việc cũ, hay bản không dùng vì thua cấp/ngày — đều ghi lại);
// dòng quyết định của Form 0 thành việc khi TGĐ giao. Người gửi xác nhận gợi ý trùng giống nhất (như bấm "Xác nhận").
// ============================================================
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { datCauHinh, khoTam, tep } from "../fixtures/chuan-bi";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import { tx, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";
import { dongQuyetDinh } from "@/lib/so-cai/doc-them";
import { giaoViec } from "@/lib/so-cai/dich-vu";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import type { DongCongViec } from "@/lib/types";

const VD = "mau-word/vi-du/";
/** Đo 29/09/2026 sau khi bỏ bảng phụ sinh việc (trước: ≥ 160 việc, PMC 20 việc) */
const TONG_TOI_THIEU = 76;
const SO_VIEC_PMC = 17;
const T39 = "tests/e2e/du-lieu/tuan39/";
const GOC = "mau-word/goc/";

/** [tệp, người gửi] theo thứ tự thời gian */
const KICH_BAN: [string, string][] = [
  [VD + "BaoCao_Tuan28_BQLDA_QuangTri.docx", "nv.bqlda"],
  [VD + "BaoCao_Tuan29_BQLDA_QuangTri_ban2.docx", "nv.bqlda"],
  [VD + "BaoCao_Tuan29_NM_NamXe.docx", "gd.namxe"],
  [VD + "BaoCao_Tuan29_PDTPC.docx", "nv.dtpc"],
  [VD + "BaoCao_HopNhat_Tuan30.docx", "photgd"],
  [VD + "BaoCao_Thang7_SCI_ENC.docx", "nv.enc"],
  [T39 + "BaoCao_Thang8_SCI_ENC.docx", "nv.enc"],
  [T39 + "BaoCao_Tuan39_BQLDA_QuangTri.docx", "nv.bqlda"],
  [T39 + "BaoCao_Tuan39_NM_NamXe.docx", "gd.namxe"],
  [T39 + "BaoCao_Tuan39_PKTVH.docx", "hung.tv"],
  [T39 + "BaoCao_Tuan39_PDTPC.docx", "nv.dtpc"],
  [T39 + "BaoCao_Tuan39_PHCTH.docx", "truong.hcth"],
  [T39 + "BaoCao_Tuan39_PTCKT.docx", "truong.tckt"],
  [T39 + "BaoCao_Tuan39_SCI_PMC.docx", "gd.pmc"],
  [T39 + "BaoCao_HopNhat_Tuan39.docx", "photgd"],
  [GOC + "OK_Form1_PhongDauTuPhapChe_Sua lan 2.docx", "nv.dtpc"],
  [GOC + "OK_Form2_PhongKinhTeVanHanh_Sua lan 2.docx", "hung.tv"],
  [GOC + "OK_Form3_PhongHanhChinh_Sua lan 2.docx", "truong.hcth"],
  [GOC + "OK_Form4_PhongTaiChinhKeToan_Sua lan 2.docx", "truong.tckt"],
  [GOC + "OK_Form5_SCI_PMC_Sua lan 2.docx", "gd.pmc"],
  [GOC + "OK_Form6_SCI_ENC_Sua lan 2.docx", "nv.enc"],
  [GOC + "OK_Form7_BQLDA_Sua lan 2.docx", "nv.bqlda"],
  [GOC + "OK_Form8_NhaMayNamXe_Sua lan 2.docx", "gd.namxe"],
  [GOC + "OK_Form0_BaoCaoHopNhat_Sua lan 2.docx", "photgd"],
];

/** File Word gốc để "Người lập: ......": điền tên như người dùng làm trước khi gửi. */
async function dienNguoiLap(buf: Buffer, ten: string): Promise<Buffer> {
  const z = await JSZip.loadAsync(buf);
  const xml = await z.file("word/document.xml")!.async("string");
  const i = xml.indexOf("Người lập");
  const j = i < 0 ? -1 : xml.indexOf(">......<", i);
  if (j < 0 || j - i > 4000) return buf;
  z.file("word/document.xml", `${xml.slice(0, j)}>${ten}<${xml.slice(j + 8)}`);
  return z.generateAsync({ type: "nodebuffer" });
}

const docTep = async (f: string, tenNguoi: string) => {
  const buf = fs.readFileSync(f);
  return tep(path.basename(f), f.startsWith(GOC) ? await dienNguoiLap(buf, tenNguoi) : buf);
};

interface KetQuaGui {
  tep: string;
  tai_lieu_id: string;
  cong_viec: DongCongViec[];
  /** nguon_bang:dong_so → mã việc trong sổ cái */
  vao_so: Map<string, { cong_viec_id: string; trang_thai: string }>;
  /** dòng quyết định → mã việc TGĐ giao */
  tgd_giao: { ten: string; cong_viec_id: string; gop_vao?: string }[];
  goi_y_trung: Map<string, string[]>;
}

describe("Kịch bản gửi: sổ cái ghi hết việc của từng báo cáo", () => {
  const kq = new Map<string, KetQuaGui>();
  /** tệp → số dòng "hạn đã qua trước ngày nộp báo cáo" (Mr. Đại bắt 29/09: 23 việc lệch ngày lọt sổ từ chính bộ file tuần 39;
   *  mẫu bản 6: ngày nộp máy ghi — trong test là ngày đầu kỳ) */
  const quaHanKhiBao = new Map<string, number>();

  beforeAll(async () => {
    khoTam();
    await csdlMoi();
    // Bộ file mẫu tuần 39 có dòng hạn đã qua trước ngày lập (đúng loại lỗi đã lọt sổ). Mặc định luật "ngày hợp lệ" CHẶN —
    // kịch bản này đo "sổ cái ghi hết việc" nên hạ luật xuống cảnh báo; phép chặn có bài riêng bên dưới + kiem-tra-kiem-tra.
    await datCauHinh(await layQ(), "luat_kiem_tra", {
      ...MAC_DINH.luat_kiem_tra,
      luat: [
        ...MAC_DINH.luat_kiem_tra.luat.map((l) => (l.ma === "ngay_hop_le" ? { ...l, muc: "canh_bao" as const } : l)),
        // File Word gốc (OK_Form…) có chương việc trống — luật K11 (02/10) chặn; kịch bản này đo sổ cái nên hạ xuống cảnh báo
        { ma: "bang_viec_trong", ten: "Bảng việc trống", bat: true, muc: "canh_bao" as const, ap_dung: "tat_ca" as const },
      ],
    });
    const tgd = await nguoi("tgd@scigroup.vn");
    for (const [f, ai] of KICH_BAN) {
      const nd = await nguoi(`${ai}@scigroup.vn`);
      const r = await tx(async (q) => taiLenVaKiemTra(q, nd, { tep: await docTep(f, nd.ten) }));
      const k = r.ket_qua;
      quaHanKhiBao.set(path.basename(f), k.loi.filter((l) => l.thong_diep.includes("đã qua trước ngày nộp báo cáo")).length);
      if (!k.dat) throw new Error(`${path.basename(f)} bị chặn: ${k.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep).join(" | ")}`);
      const xac: Record<number, string> = {};
      const goiY = new Map<string, string[]>();
      const vaoSo = k.cong_viec.filter((c) => c.nguon_bang !== "bang_quyet_dinh");
      for (const d of k.du_doan) {
        if (d.hanh_dong === "goi_y_trung" && d.goi_y?.[0]) xac[d.dong] = d.goi_y[0].cong_viec_id;
        if (d.goi_y?.length) goiY.set(`${vaoSo[d.dong].nguon_bang}:${vaoSo[d.dong].dong_so}`, d.goi_y.map((g) => g.cong_viec_id));
      }
      await tx((q) => gui(q, nd, { tai_lieu_id: r.tai_lieu_id!, den: k.gui_den, xac_nhan_trung: xac }));
      const q = await layQ();
      const { rows } = await q.query<{ cong_viec_id: string; trang_thai: string; bang: string; so: number }>(
        `SELECT cong_viec_id, trang_thai, du_lieu->>'nguon_bang' AS bang, (du_lieu->>'dong_so')::int AS so
           FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND NOT la_quyet_dinh`,
        [r.tai_lieu_id],
      );
      const kg: KetQuaGui = {
        tep: path.basename(f),
        tai_lieu_id: r.tai_lieu_id!,
        cong_viec: k.cong_viec,
        vao_so: new Map(rows.map((x) => [`${x.bang}:${x.so}`, x])),
        tgd_giao: [],
        goi_y_trung: goiY,
      };
      // Form 0: TGĐ quyết định từng dòng — gộp vào việc đang mở nếu có gợi ý, không thì giao việc mới
      const qd = await dongQuyetDinh(q, r.tai_lieu_id!, r.phien_ban!);
      for (const d of qd?.dong ?? []) {
        const gop = d.goi_y[0]?.cong_viec_id;
        const duAn = gop ? (await q.query<{ du_an: string | null }>("SELECT du_an FROM docflow.cong_viec WHERE id = $1", [gop])).rows[0]?.du_an : d.dong.du_an;
        const ma = await tx((t) =>
          giaoViec(t, tgd, {
            ten: d.dong.ten,
            du_an: duAn ?? "Công ty",
            bat_dau: k.ky_bao_cao?.den ?? "2026-07-28",
            ket_thuc: (d.dong as DongCongViec & { han_quyet_dinh?: string }).han_quyet_dinh ?? "2026-12-31",
            ...(gop ? { cong_viec_id: gop } : {}),
            la_quyet_dinh: true,
            tu_tai_lieu: { tai_lieu_id: r.tai_lieu_id!, phien_ban: r.phien_ban!, dong_so: d.dong.dong_so, nhan: qd!.nhan },
            phan_viec: d.dong.phu_trach.length
              ? d.dong.phu_trach.map((p) => ({ ...p, noi_dung: d.dong.ten }))
              : [{ loai: "don_vi", id: "p-dtpc", ten: "Phòng Đầu tư và Pháp chế", noi_dung: d.dong.ten }],
          }),
        );
        kg.tgd_giao.push({ ten: d.dong.ten, cong_viec_id: ma, ...(gop ? { gop_vao: gop } : {}) });
      }
      kq.set(kg.tep, kg);
    }
  }, 300_000);

  const lay = (tenTep: string) => kq.get(tenTep)!;
  const viec = (tenTep: string, bang: string, chua: string) => {
    const k = lay(tenTep);
    const c = k.cong_viec.find((x) => x.nguon_bang === bang && x.ten.includes(chua));
    expect(c, `${tenTep}: không có việc "${chua}" từ ${bang}`).toBeDefined();
    return { ...c!, so: k.vao_so.get(`${c!.nguon_bang}:${c!.dong_so}`) };
  };

  it("MỌI dòng việc của MỌI báo cáo đều có bản ghi trong sổ cái; mọi dòng quyết định Form 0 đều thành việc", () => {
    let tong = 0;
    for (const [f] of KICH_BAN) {
      const k = lay(path.basename(f));
      // dòng báo ĐÃ XONG mà sổ chưa từng có việc đó thì không vào sổ (Mr. Đại chốt 02/10) — không phải "thiếu"
      const thieu = k.cong_viec.filter((c) => c.nguon_bang !== "bang_quyet_dinh" && !c.da_xong && !k.vao_so.has(`${c.nguon_bang}:${c.dong_so}`));
      expect(thieu.map((c) => `${k.tep} · ${c.nguon_bang} dòng ${c.dong_so}: ${c.ten}`)).toEqual([]);
      const qd = k.cong_viec.filter((c) => c.nguon_bang === "bang_quyet_dinh");
      expect(k.tgd_giao).toHaveLength(qd.length);
      tong += k.cong_viec.length;
    }
    expect(tong).toBeGreaterThanOrEqual(TONG_TOI_THIEU);
  });

  it("luật ngày hợp lệ bắt được dòng hạn đã qua trước ngày nộp báo cáo (file PMC tuần 39: 11 dòng)", () => {
    expect(quaHanKhiBao.get("BaoCao_Tuan39_SCI_PMC.docx")).toBe(11);
  });

  it("mỗi báo cáo lấy việc CHỈ từ bảng mẫu khai sinh việc", () => {
    const bangCua = (t: string) => new Set(lay(t).cong_viec.map((c) => c.nguon_bang));
    for (const t of ["BaoCao_Tuan39_BQLDA_QuangTri.docx", "BaoCao_Tuan39_NM_NamXe.docx", "BaoCao_Tuan39_PDTPC.docx", "BaoCao_Tuan39_PKTVH.docx", "BaoCao_Tuan39_PHCTH.docx", "BaoCao_Tuan39_PTCKT.docx"])
      expect(bangCua(t), t).toEqual(new Set(["bang_cong_viec"]));
    expect(bangCua("BaoCao_Tuan39_SCI_PMC.docx")).toEqual(new Set(["bang_cong_viec", "bang_tien_do_tk"]));
    expect(bangCua("BaoCao_Thang8_SCI_ENC.docx")).toEqual(new Set(["bang_cong_viec"])); // file Form 6 cũ: bang_ke_hoach đọc như bảng việc
    expect(bangCua("OK_Form0_BaoCaoHopNhat_Sua lan 2.docx")).toEqual(new Set(["bang_quyet_dinh"]));
    expect(lay("BaoCao_Tuan39_SCI_PMC.docx").cong_viec).toHaveLength(SO_VIEC_PMC);
  });

  it("cùng một việc nhắc lại ở báo cáo sau → cùng MỘT mã việc (không đẻ việc trùng)", () => {
    const gpmb = viec("BaoCao_Tuan28_BQLDA_QuangTri.docx", "bang_cong_viec", "GPMB Trụ T11").so!.cong_viec_id;
    expect(viec("BaoCao_Tuan29_PDTPC.docx", "bang_cong_viec", "GPMB Trụ T11").so?.cong_viec_id).toBe(gpmb);
    expect(lay("BaoCao_HopNhat_Tuan30.docx").tgd_giao.find((x) => x.ten.includes("GPMB Trụ T11"))?.gop_vao).toBe(gpmb);
    expect(viec("BaoCao_Tuan39_BQLDA_QuangTri.docx", "bang_cong_viec", "GPMB Trụ T11").so?.cong_viec_id).toBe(gpmb);
    const relay = viec("BaoCao_Tuan29_NM_NamXe.docx", "bang_cong_viec", "Thay relay bảo vệ R21").so!.cong_viec_id;
    expect(viec("BaoCao_Tuan39_PKTVH.docx", "bang_cong_viec", "Thay relay bảo vệ R21").so?.cong_viec_id).toBe(relay);
  });

  it("việc khác nhau không bị gộp nhầm: đợt 4 ≠ đợt 5, NK1 ≠ NK2, Hướng Việt ≠ Hướng Phùng", () => {
    const dot4 = viec("BaoCao_HopNhat_Tuan30.docx", "bang_cong_viec", "thu vốn đợt 4").so!.cong_viec_id;
    expect(viec("BaoCao_Thang8_SCI_ENC.docx", "bang_cong_viec", "Thu vốn đợt 5").so?.cong_viec_id).not.toBe(dot4);
    const pmc = lay("BaoCao_Tuan39_SCI_PMC.docx");
    const ks = pmc.cong_viec.filter((c) => c.ten === "Khảo sát thủy văn, đo lưu lượng thực tế");
    expect(ks.map((c) => c.du_an)).toEqual(["TĐ Nam Khiên 1", "TĐ Nam Khiên 2"]);
    expect(new Set(ks.map((c) => pmc.vao_so.get(`${c.nguon_bang}:${c.dong_so}`)?.cong_viec_id)).size).toBe(2);
  });

  it("hạng mục báo 100% ở báo cáo ĐẦU TIÊN của SCI PMC + Form 5 → vào sổ ở trạng thái ĐÃ XONG, không sinh việc đang mở (Mr. Đại gật 18/10/2026; 02/10: không vào sổ)", async () => {
    const q = await layQ();
    const ks = viec("BaoCao_Tuan39_SCI_PMC.docx", "bang_tien_do_tk", "Khảo sát địa hình, địa chất");
    expect(ks.da_xong).toBe(true);
    expect(ks.so?.trang_thai).toBe("hien_hanh");
    const { rows } = await q.query<{ id: string; trang_thai: string }>("SELECT id, trang_thai FROM docflow.cong_viec WHERE ten = 'Khảo sát địa hình, địa chất' ORDER BY id");
    expect(rows.map((r) => r.id)).toContain(ks.so!.cong_viec_id);
    expect(rows.every((r) => r.trang_thai === "hoan_thanh")).toBe(true);
  });

  it("chỉ báo cáo ĐẦU TIÊN của mỗi đơn vị lập + mẫu ghi dòng đã xong vào sổ; báo cáo sau cùng đơn vị + mẫu: đã xong chỉ để đóng việc", async () => {
    const q = await layQ();
    const daGap = new Set<string>();
    const dem: string[] = [];
    for (const [f] of KICH_BAN) {
      const k = lay(path.basename(f));
      const tl = (await q.query<{ don_vi_lap: string | null; mau_ma: string | null }>("SELECT don_vi_lap, mau_ma FROM docflow.tai_lieu WHERE id = $1", [k.tai_lieu_id])).rows[0];
      const khoaDvMau = `${tl.don_vi_lap}|${tl.mau_ma}`;
      const { rows } = await q.query<{ id: string; trang_thai: string }>(
        `SELECT l.doi_tuong_id AS id, c.trang_thai FROM docflow.lich_su l JOIN docflow.cong_viec c ON c.id = l.doi_tuong_id
          WHERE l.hanh_dong = 'vao_so_cai' AND l.chi_tiet->>'lan_nap_dau' = 'true' AND l.chi_tiet->>'tai_lieu_id' = $1`,
        [k.tai_lieu_id],
      );
      if (daGap.has(khoaDvMau)) expect(rows, `${k.tep}: không phải lần nạp đầu của ${khoaDvMau}`).toEqual([]);
      for (const r of rows) expect(r.trang_thai).toBe("hoan_thanh");
      // mỗi dòng đã xong vào sổ lần đầu là một dòng báo đã xong của chính báo cáo đó
      expect(rows.length).toBeLessThanOrEqual(k.cong_viec.filter((c) => c.da_xong).length);
      if (rows.length) dem.push(`${k.tep}: ${rows.length}`);
      daGap.add(khoaDvMau);
    }
    console.log(`Dòng đã xong vào sổ lần nạp đầu — ${dem.join(" · ") || "không có"}`);
    expect(dem.length).toBeGreaterThan(0);
  });

  it("báo cáo cũ gửi sau (bản gốc tháng 7) không đè việc đã cập nhật từ báo cáo tuần 39 — vẫn ghi lại là bản không dùng", () => {
    const tk = viec("OK_Form5_SCI_PMC_Sua lan 2.docx", "bang_tien_do_tk", "Phương án đấu nối 110kV");
    expect(tk.so?.trang_thai).toBe("khong_dung");
    expect(tk.so?.cong_viec_id).toBe(viec("BaoCao_Tuan39_SCI_PMC.docx", "bang_tien_do_tk", "Phương án đấu nối 110kV").so?.cong_viec_id);
  });
});

describe("Theo quy tắc thật (mặc định): việc thiếu hạn chặn gửi, chỉ rõ từng dòng", () => {
  it("Form 4 gốc: kiến nghị không có hạn KHÔNG còn chặn (bảng Kiến nghị không sinh việc từ mẫu phiên bản 4)", async () => {
    const q = await csdlMoi({ macDinhGoc: true });
    const nd = await nguoi("truong.tckt@scigroup.vn");
    const f = GOC + "OK_Form4_PhongTaiChinhKeToan_Sua lan 2.docx";
    const kq = await kiemTraDayDu(q, nd, await dienNguoiLap(fs.readFileSync(f), nd.ten), path.basename(f));
    expect(kq.loi.filter((l) => l.luat === "ngay_trong" && l.vi_tri?.bang === "bang_kien_nghi")).toEqual([]);
    expect(kq.cong_viec).toEqual([]);
  });
});
