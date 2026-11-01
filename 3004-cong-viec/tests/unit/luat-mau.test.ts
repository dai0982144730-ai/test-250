// Bộ luật mẫu mặc định (src/lib/luat/luat-mau.ts) cho 9 mẫu thật: mọi luật trỏ đúng ô/bảng/cột/mục có trong
// mau-word/dinh-nghia.json, mã không trùng, tham số đúng dạng luật (kiemThamSo); chạy luật code trên báo cáo ví dụ
// hợp lệ không bị CHẶN oan, và trên biến thể dựng lỗi thì bắt đúng.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LUAT_MAU } from "@/lib/luat/luat-mau";
import { LOAI_LUAT, kiemThamSo } from "@/lib/luat/loai-luat";
import type { DinhNghiaMauRutGon } from "@/lib/luat/types-them";
import type { DieuKien, DuLieuBaoCao, LuatNhap, NguCanhKiem, ThamChieu } from "@/lib/luat/types";
import type { LoiKiemTra } from "@/lib/types";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { docKyBaoCao } from "@/lib/kiem-tra/chuan-hoa";
import { MAC_DINH } from "@/lib/cau-hinh/mac-dinh";
import DINH_NGHIA from "../../mau-word/dinh-nghia.json";
import { taoBaoCao, VI_DU } from "../../scripts/tao-mau-word.mjs";
import { dienOBatBuoc } from "../../scripts/tao-mau-trang.mjs";

type DnJson = (typeof DINH_NGHIA)[number];
const GOC = path.join(process.cwd(), "mau-word");
const MA_MAU = DINH_NGHIA.map((d) => d.ma);
const dnCua = (ma: string) => DINH_NGHIA.find((d) => d.ma === ma) as DnJson;

function rutGon(d: DnJson): DinhNghiaMauRutGon {
  const dn = d.dinh_nghia as unknown as {
    o_nhap: { tag: string; nhan: string; kieu?: string }[];
    bang: { tag: string; nhan: string; cot: { tag: string; nhan: string }[] }[];
    muc_bat_buoc: string[];
  };
  return {
    ma: d.ma,
    ten: d.ten,
    o_nhap: dn.o_nhap.map((o) => ({ tag: o.tag, nhan: o.nhan, ...(o.kieu ? { kieu: o.kieu } : {}) })),
    bang: dn.bang.map((b) => ({ tag: b.tag, nhan: b.nhan, cot: b.cot.map((c) => ({ tag: c.tag, nhan: c.nhan })) })),
    muc_bat_buoc: dn.muc_bat_buoc,
  };
}

const mauApDung = (l: LuatNhap) => (l.ap_dung === "tat_ca" ? MA_MAU : l.ap_dung);

/** Mọi tham chiếu (ô, bảng + cột, bảng, mục) trong tham số của một luật code — tự đọc, không dựa vào kiemThamSo. */
function thamChieuCua(ts: Record<string, unknown>): { o?: string; bang?: string; cot?: string; muc?: string; ky?: string }[] {
  const kq: { o?: string; bang?: string; cot?: string; muc?: string; ky?: string }[] = [];
  const tc = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    const x = v as ThamChieu & Record<string, unknown>;
    if (typeof x.o === "string") kq.push({ o: x.o });
    else if (typeof x.bang === "string" && typeof x.cot === "string") kq.push({ bang: x.bang, cot: x.cot });
    else if ("ky" in x) kq.push({ ky: String(x.ky) }); // mốc kỳ / ngày nộp: không trỏ vào mẫu
  };
  for (const k of ["a", "b", "tham_chieu", "ket_qua"]) tc(ts[k]);
  for (const k of ["neu", "thi"]) tc((ts[k] as DieuKien | undefined)?.tham_chieu);
  if (typeof ts.o === "string") kq.push({ o: ts.o });
  if (typeof ts.bang === "string") kq.push(typeof ts.cot === "string" ? { bang: ts.bang, cot: ts.cot } : { bang: ts.bang });
  // dong_tong: danh sách cột + cột nhãn; tinh_toan: cột cộng thêm (cùng bảng với kết quả)
  if (typeof ts.bang === "string" && Array.isArray(ts.cot)) for (const x of ts.cot) kq.push({ bang: ts.bang, cot: String(x) });
  if (typeof ts.bang === "string" && typeof ts.cot_nhan === "string") kq.push({ bang: ts.bang, cot: ts.cot_nhan });
  const kqCot = ts.ket_qua as { bang?: string } | undefined;
  if (Array.isArray(ts.them) && typeof kqCot?.bang === "string") for (const x of ts.them) kq.push({ bang: kqCot.bang, cot: String(x) });
  if (typeof ts.muc === "string") kq.push({ muc: ts.muc });
  return kq;
}

describe("LUAT_MAU: khai báo", () => {
  it("mã ổn định, không trùng; đủ trường; mỗi mẫu có luật riêng", () => {
    const ma = LUAT_MAU.map((l) => l.ma);
    expect(new Set(ma).size).toBe(ma.length);
    for (const l of LUAT_MAU) {
      expect(l.ma, l.ma).toMatch(/^(chung|f[0-9])-[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(l.ten.trim().length, l.ma).toBeGreaterThan(3);
      expect(l.cau_luat.trim().length, l.ma).toBeGreaterThan(10);
      expect(l.nhom, l.ma).toBeTruthy();
      expect(["chan", "canh_bao", "goi_y"]).toContain(l.muc);
      expect(l.bat).toBe(true);
      expect(l.id ?? null).toBeNull();
      if (l.ap_dung !== "tat_ca") for (const m of l.ap_dung) expect(MA_MAU, `${l.ma}: mẫu ${m}`).toContain(m);
      if (/^f\d-/.test(l.ma)) expect(l.ap_dung, l.ma).toContain(`form-${l.ma[1]}`);
    }
    // không đè 9 luật hệ thống
    const heThong = MAC_DINH.luat_kiem_tra.luat.map((l) => l.ma);
    for (const m of ma) expect(heThong).not.toContain(m);
    for (const m of MA_MAU) {
      const so = LUAT_MAU.filter((l) => mauApDung(l).includes(m)).length;
      expect(so, `${m} có ${so} luật`).toBeGreaterThanOrEqual(8);
    }
  });

  it("luật AI: có hướng dẫn rõ, không chặn; luật code: đúng dạng luật có sẵn", () => {
    for (const l of LUAT_MAU) {
      if (l.cach_kiem === "ai") {
        expect(l.loai, l.ma).toBeNull();
        expect(l.tham_so, l.ma).toBeNull();
        expect((l.huong_dan_ai ?? "").length, l.ma).toBeGreaterThan(80);
        expect(l.muc, l.ma).not.toBe("chan");
        expect(l.khi_ai_loi).toBe("cho_gui");
      } else {
        expect(l.cach_kiem, l.ma).toBe("code");
        expect(Object.keys(LOAI_LUAT), l.ma).toContain(l.loai);
        expect(l.tham_so, l.ma).toBeTruthy();
        expect(l.huong_dan_ai).toBeNull();
      }
    }
  });

  it("mọi luật code trỏ đúng ô / bảng / cột / mục có trong dinh-nghia.json của từng mẫu áp dụng", () => {
    for (const l of LUAT_MAU.filter((x) => x.cach_kiem !== "ai")) {
      const ds = thamChieuCua(l.tham_so!);
      expect(ds.length, l.ma).toBeGreaterThan(0);
      for (const m of mauApDung(l)) {
        const dn = dnCua(m).dinh_nghia as unknown as { o_nhap: { tag: string }[]; bang: { tag: string; cot: { tag: string }[] }[]; muc_bat_buoc: string[] };
        for (const t of ds) {
          const noi = `${l.ma} @ ${m}: ${JSON.stringify(t)}`;
          if (t.o) expect(dn.o_nhap.map((o) => o.tag), noi).toContain(t.o);
          if (t.bang) {
            const b = dn.bang.find((x) => x.tag === t.bang);
            expect(b, noi).toBeTruthy();
            if (t.cot) expect(b!.cot.map((c) => c.tag), noi).toContain(t.cot);
          }
          if (t.muc) expect(dn.muc_bat_buoc.some((x) => x.includes(t.muc!)), noi).toBe(true);
        }
      }
    }
  });

  it("kiemThamSo của dạng luật: tham số hợp lệ với mọi mẫu áp dụng", () => {
    for (const l of LUAT_MAU.filter((x) => x.cach_kiem !== "ai")) {
      for (const m of mauApDung(l)) expect(kiemThamSo(l.loai!, l.tham_so!, rutGon(dnCua(m))), `${l.ma} @ ${m}`).toEqual([]);
    }
  });
});

// ---------------- Chạy luật code trên báo cáo ----------------

type LoiMau = Omit<LoiKiemTra, "luat"> & { luat: string };

/** nop = ngày nộp máy ghi (mẫu bản 6); mặc định 21/07/2026 (ngày lập của bộ báo cáo ví dụ), kỳ bắt đầu sau đó thì ngày đầu kỳ. */
async function chay(buf: Buffer, maMau?: string, nopEp?: string): Promise<LoiMau[]> {
  const nd = await docWord(buf);
  const ma = maMau ?? nd.mau_ma!;
  expect(MA_MAU).toContain(ma);
  const bc: DuLieuBaoCao = { o_nhap: nd.o_nhap, bang: nd.bang, tieu_de: nd.tieu_de, ...(nd.muc ? { muc: nd.muc } : {}) };
  const ky = docKyBaoCao(nd.o_nhap.ky_bao_cao ?? "");
  const nop = nopEp ?? (ky.tu && ky.tu > "2026-07-21" ? ky.tu : "2026-07-21");
  const ctx: NguCanhKiem = {
    mau_ma: ma,
    ky_bao_cao: { ...(ky.tu || ky.den ? { tu: ky.tu, den: ky.den } : {}), nop },
    gia_tri_chua_dien: MAC_DINH.luat_kiem_tra.gia_tri_chua_dien,
    dinh_nghia_mau: rutGon(dnCua(ma)),
  } as NguCanhKiem;
  const loi: LoiMau[] = [];
  for (const l of LUAT_MAU) {
    if (l.cach_kiem === "ai" || !mauApDung(l).includes(ma)) continue;
    for (const x of LOAI_LUAT[l.loai!].kiem(bc, l.tham_so!, ctx)) loi.push({ ...x, luat: l.ma, muc: l.muc });
  }
  return loi;
}

const tep = (...p: string[]) => fs.readFileSync(path.join(GOC, ...p));
const tomTat = (ds: LoiMau[]) => ds.map((l) => `${l.muc} ${l.luat}: ${l.thong_diep}`);
const chan = (ds: LoiMau[]) => tomTat(ds.filter((l) => l.muc === "chan"));

describe("LUAT_MAU trên báo cáo hợp lệ: không chặn oan", () => {
  it.each(MA_MAU)("%s: mẫu có số liệu ví dụ của anh Đại — không lỗi chặn, không cảnh báo sai", async (ma) => {
    const loi = await chay(tep(`${ma}.docx`));
    expect(chan(loi)).toEqual([]);
    // Số liệu ví dụ của anh Đại là số thật đã đối chiếu: không có cảnh báo nào từ luật code (gợi ý thì được)
    expect(tomTat(loi.filter((l) => l.muc === "canh_bao"))).toEqual([]);
  });

  it("các báo cáo ví dụ (mau-word/vi-du) theo mẫu: không lỗi chặn", async () => {
    const ds = fs.readdirSync(path.join(GOC, "vi-du")).filter((f) => f.endsWith(".docx"));
    let dem = 0;
    for (const f of ds) {
      const nd = await docWord(tep("vi-du", f));
      if (!nd.mau_ma || !MA_MAU.includes(nd.mau_ma)) continue;
      dem++;
      expect(chan(await chay(tep("vi-du", f))), f).toEqual([]);
    }
    expect(dem).toBeGreaterThanOrEqual(8);
  });

  it.each(MA_MAU)("%s: mẫu trắng điền đủ ô bắt buộc — không lỗi chặn", async (ma) => {
    const dn = dnCua(ma).dinh_nghia;
    const bangViec = dn.bang_cong_viec.find((b) => !("la_quyet_dinh" in b && b.la_quyet_dinh))!.tag;
    const buf = await dienOBatBuoc(tep("trang", `${ma}.docx`), ma, { bang: { [bangViec]: [{ ten: "Rà soát hồ sơ tuần", ket_thuc: "31/07/2026" }] } });
    expect(chan(await chay(buf))).toEqual([]);
  });

  it("SCI E&C báo cáo tháng cũ (mẫu trước 20/10/2026): vẫn đọc được, không chặn; luật thu vốn đã bỏ nên không cảnh báo nữa", async () => {
    const b1 = await chay(tep("vi-du", "BaoCao_Thang7_SCI_ENC.docx"));
    expect(chan(b1)).toEqual([]);
    expect(b1.filter((l) => l.luat.startsWith("f6-"))).toEqual([]);
  });
});

describe("LUAT_MAU trên biến thể dựng lỗi: bắt đúng", () => {
  const co = (ds: LoiMau[], ma: string, muc?: string) => ds.filter((l) => l.luat === ma && (!muc || l.muc === muc));

  it("mọi mẫu (bản 6 — ngày nộp máy ghi): kỳ chưa bắt đầu lúc nộp → CHẶN; nộp quá 10 ngày sau kỳ → cảnh báo", async () => {
    const buf = await taoBaoCao("form-7", VI_DU.bqlda(29, "Lý Thị Nga")); // tuần 29: 14/07 – 20/07/2026
    expect(co(await chay(buf, undefined, "2026-07-18"), "chung-ky-bat-dau-truoc-ngay-nop")).toEqual([]); // nộp giữa tuần: đạt
    const truoc = await chay(buf, undefined, "2026-07-10");
    expect(co(truoc, "chung-ky-bat-dau-truoc-ngay-nop", "chan")).toHaveLength(1);
    expect(co(truoc, "chung-ky-bat-dau-truoc-ngay-nop")[0].vi_tri).toEqual({ tag: "ky_bao_cao" });
    const tre = await chay(buf, undefined, "2026-08-05");
    expect(chan(tre)).toEqual([]);
    expect(co(tre, "chung-ky-khong-qua-cu", "canh_bao")).toHaveLength(1);
  });

  it("Form 7: % tiến độ lũy kế > 100 → CHẶN; rủi ro Cao thiếu kiến nghị/ảnh hưởng → cảnh báo; GPMB khiếu nại thiếu vướng mắc", async () => {
    const g = VI_DU.bqlda(29, "Lý Thị Nga");
    const loi = await chay(
      await taoBaoCao("form-7", {
        ...g,
        thay: [["41,5%", "141,5%"]],
        bang: {
          ...g.bang,
          bang_kien_nghi: [{ stt: "1", noi_dung: "GPMB T11 kéo dài", muc_do: "Cao", anh_huong: "", kien_nghi: "" }],
          bang_gpmb: [{ khu_vuc: "T11 (3 hộ)", loai_dat: "Đất nông nghiệp", dien_tich: "4.250", tinh_trang: "Khiếu nại", vuong_mac: "" }],
        },
      }),
    );
    expect(co(loi, "f7-th-luy-ke-0-100", "chan").map((l) => l.vi_tri)).toEqual([{ bang: "bang_tien_do", dong: 1, cot: "th_luy_ke" }]);
    expect(co(loi, "chung-rui-ro-cao-co-kien-nghi", "canh_bao")).toHaveLength(1);
    expect(co(loi, "chung-rui-ro-khac-co-kien-nghi")).toHaveLength(0);
    expect(co(loi, "f7-rui-ro-cao-anh-huong", "canh_bao")[0].vi_tri).toEqual({ bang: "bang_kien_nghi", dong: 1, cot: "anh_huong" });
    expect(co(loi, "f7-gpmb-khieu-nai-vuong-mac", "canh_bao")).toHaveLength(1);
  });

  it("Form 0: hạn quyết định trước ngày nộp, thiếu phụ trách trình, trùng ưu tiên; có sự cố mà không ghi hành động", async () => {
    const loi = await chay(
      await taoBaoCao("form-0", {
        bang_them: { bang_quyet_dinh: [{ uu_tien: "1", ten: "Duyệt phương án X", phu_trach: "", han_quyet_dinh: "20/07/2026", tai_lieu: "" }] },
        bang: { bang_an_toan: [{ chi_tieu: "Sự cố an toàn lao động", tuan_nay: "2", luy_ke_nam: "2", ghi_chu: "" }] },
      }),
    );
    expect(chan(loi)).toEqual([]);
    expect(co(loi, "f0-han-qd-tu-ngay-nop", "canh_bao").map((l) => l.vi_tri)).toEqual([{ bang: "bang_quyet_dinh", dong: 6, cot: "han_quyet_dinh" }]);
    expect(co(loi, "f0-qd-co-phu-trach-trinh", "canh_bao")).toHaveLength(1);
    expect(co(loi, "f0-qd-uu-tien-khong-trung")).toHaveLength(1);
    expect(co(loi, "f0-qd-co-tai-lieu", "goi_y")).toHaveLength(1);
    expect(co(loi, "chung-an-toan-co-hanh-dong", "canh_bao")[0].vi_tri).toEqual({ bang: "bang_an_toan", dong: 1, cot: "ghi_chu" });
  });

  it("Form 6 (báo cáo tuần 20/10/2026): hạn việc tuần tới đã qua, thiếu kết quả cần có → luật chung của bảng việc", async () => {
    const loi = await chay(
      await taoBaoCao("form-6", { bang: { bang_cong_viec: [{ ten: "Đôn đốc rotor", ket_thuc: "15/07/2026", ket_qua_can_co: "" }] } }),
    );
    expect(co(loi, "chung-viec-ket-thuc-tu-ngay-nop", "goi_y")).toHaveLength(1);
    expect(co(loi, "chung-viec-ket-qua-can-co", "goi_y")).toHaveLength(1);
    expect(loi.filter((l) => l.luat.startsWith("f6-"))).toEqual([]);
  });

  it("Form 5 % HT 120% → CHẶN; Form 8 giờ vận hành tuần 170 h, sự cố thiếu biện pháp → cảnh báo", async () => {
    const f5 = await chay(await taoBaoCao("form-5", { o: { nguoi_lap: "Nguyễn Văn An" }, thay: [["90%", "120%"]] }));
    expect(co(f5, "f5-pt-ht-0-100", "chan")).toHaveLength(1);
    const g8 = VI_DU.NAMXE_T29;
    const f8 = await chay(
      await taoBaoCao("form-8", {
        ...g8,
        thay: [["165,5", "170"]],
        bang: { ...g8.bang, bang_su_co: [{ stt: "1", ngay: "20/07", thiet_bi: "Relay R21", mo_ta: "Tác động không ổn định", bien_phap: "......" }] },
      }),
    );
    expect(chan(f8)).toEqual([]);
    expect(co(f8, "f8-gio-van-hanh-tuan", "canh_bao")[0].vi_tri).toEqual({ bang: "bang_san_luong", dong: 3, cot: "tuan_th" });
    expect(co(f8, "f8-su-co-bien-phap", "canh_bao")).toHaveLength(1);
  });

  it("Form 1–4: kiến nghị trống → cảnh báo; mức độ lạ → gợi ý; Form 3 thiếu số cuối kỳ", async () => {
    const f1 = await chay(
      await taoBaoCao("form-1", {
        ...VI_DU.DTPC_T29,
        bang: { ...VI_DU.DTPC_T29.bang, bang_kien_nghi: [{ stt: "1", noi_dung: "GPMB T12–T18 chậm", nguon: "BQLDA QT", muc_do: "Rất gấp", kien_nghi: "" }] },
      }),
    );
    expect(co(f1, "chung-kien-nghi-co-noi-dung", "canh_bao")).toHaveLength(1);
    expect(co(f1, "chung-muc-do-phong", "goi_y")).toHaveLength(1);
    const f3 = await chay(await taoBaoCao("form-3", { bang: { bang_nhan_su: [{ chi_tieu: "SCI (công ty mẹ)", kh_nam: "45", dau_ky: "43", cuoi_ky: "", bien_dong: "", ghi_chu: "" }] } }));
    expect(co(f3, "f3-nhan-su-cuoi-ky", "canh_bao")).toHaveLength(1);
  });

});
