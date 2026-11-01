// ============================================================
// Cổng base của agent Công việc — ba việc chốt tối 17/10/2026 (KE-HOACH/23 mục 8, việc 2 + 3 ở agent con):
//   ① base.tai_viec_theo_nguoi đếm việc găng theo DANH SÁCH VIỆC LÁ GĂNG TỚI MỐC COD (tiendo.tim_dau_viec · critical),
//      không theo chuỗi 12 mắt xích của tiendo.duong_gang. Việc gắn mã lá găng HOẶC mã con của nó thì tính; mã nhóm cha không.
//      Đo 17/10 22:25 (HV): chuỗi găng 12 mã, KHÔNG có 6.1.4; lá găng 21 mã, CÓ 6.1.4 → cả 10 người ra 0 việc găng.
//   ② base.danh_sach_issue không chờ agent Tiến độ quá 5 giây (08:36 17/10: 20,1 giây → Main hết hạn 10 giây, bản sáng thiếu
//      phần Công việc). Quá hạn → tren_duong_gang = null + cảnh báo; lượt hỏi vẫn chạy tiếp, lượt sau có ngay.
//   ③ Mọi lượt gửi sang agent Tiến độ kèm khoá nội bộ x-sci-noi-bo (cổng Tiến độ lọc phần tiền của lượt máy–máy thiếu khoá).
// CSDL RAM + fetch giả theo khuôn trả THẬT của cổng Tiến độ — không gọi agent thật, không gọi AI.
// ============================================================
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { csdlMoi } from "../helpers/csdl";
import { tx } from "@/lib/db";
import { xoaNhoDauViec } from "@/lib/tien-do-dau-viec";
import { tongHopTaiTheoNguoi } from "@/lib/mcp/cong-base-thuan";

const KHOA_CHUNG = "khoa-chung-bai-kiem-17-10-2026-du-dai";
const BAM_NOI_BO = crypto.createHash("sha256").update("noi-bo:" + KHOA_CHUNG).digest("hex");

/** Cây đầu việc giả — khuôn trang K1 của tiendo.tim_dau_viec (cờ critical = găng tới mốc COD; mã nhóm cũng mang cờ) */
const CAY = [
  { wbs: "6", critical: true },
  { wbs: "6.1", critical: true },
  { wbs: "6.1.4", critical: true },
  { wbs: "7", critical: true },
  { wbs: "7.1", critical: true },
  { wbs: "7.1.12", critical: true },
  { wbs: "7.2", critical: false },
  { wbs: "7.2.3", critical: false },
  { wbs: "9", critical: true },
  { wbs: "9.6", critical: true },
  { wbs: "9.6.4", critical: true },
];

/** tiendo.duong_gang giả — đúng khuôn đo 17/10: chuỗi dẫn COD KHÔNG có 6.1.4 */
const DUONG_GANG = {
  chuoi_gang: [{ wbs: "9.6.4" }, { wbs: "7.1.12" }],
  so_viec_gang_toi_cod: 3,
  so_viec_gang_dang_tre: 3,
  viec_gang_dang_tre: [{ wbs: "6.1.4" }, { wbs: "9.6.4" }, { wbs: "7.1.12" }],
};

let tmp = "";
let treo = false;
const choTha: (() => void)[] = [];
const dauThu: { congCu: string; noiBo: string | null }[] = [];

function traLoiTienDo(congCu: string): unknown {
  if (congCu === "tiendo.tim_dau_viec") {
    return { ok: true, du_lieu: { tasks: CAY, tong_so: CAY.length, con_nua: false }, nguon: [], canh_bao: [], thoi_diem_tra_loi: new Date().toISOString() };
  }
  if (congCu === "tiendo.duong_gang") return { ok: true, du_lieu: DUONG_GANG, nguon: [], canh_bao: [], thoi_diem_tra_loi: new Date().toISOString() };
  return { ok: false, ma_loi: "KHONG_HIEU_YEU_CAU", thong_diep: `bài kiểm không giả ${congCu}` };
}

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cv-gang-17-10-"));
  process.env.DOCFLOW_AI_DATA = tmp;
  delete process.env.URL_AGENT_TIEN_DO;
  await csdlMoi();
  await tx(async (q) => {
    const viec: [string, string, string, "nguoi" | "don_vi", string][] = [
      ["CV-G-1", "Xử lý 6.1.4 Cung cấp Hub, Nacelle", "6.1.4", "nguoi", "doainv@scigroup.vn"],
      ["CV-G-2", "Đôn đốc lô Hub thứ hai", "6.1.4.2", "nguoi", "doainv@scigroup.vn"],
      ["CV-G-3", "Rà danh mục thiết bị chính", "6.1", "don_vi", "p-cd"],
      ["CV-G-4", "Thi công san nền khu trụ T5", "7.2.3", "don_vi", "p-cd"],
      ["CV-G-5", "Chuẩn bị thử nghiệm tần số", "9.6.4", "don_vi", "bqlda-qt"],
    ];
    for (const [id, ten, , loai, nguoi] of viec) {
      await q.query("INSERT INTO docflow.cong_viec (id, ten, du_an, trang_thai, ket_thuc) VALUES ($1,$2,'ĐG Hướng Việt','dang_mo','2026-12-31')", [id, ten]);
      await q.query("INSERT INTO docflow.phan_viec (id, cong_viec_id, phu_trach_loai, phu_trach_id, noi_dung, vai) VALUES ($1,$2,$3,$4,$5,'chu_tri')", [`${id}-p`, id, loai, nguoi, ten]);
    }
    for (const [id, , ma] of viec) {
      await q.query(
        "INSERT INTO docflow.wbs_viec (cong_viec_id, du_an_id, ma_wbs, ten_wbs, ly_do, do_chac, nguon, trang_thai) VALUES ($1,'HV',$2,$2,'bài kiểm',1,'nguoi','da_duyet')",
        [id, ma],
      );
    }
  });
  // Sổ issue HV: một thẻ luật 3 (găng, chưa ai nhận) + một thẻ thường gắn 6.1.4
  fs.mkdirSync(path.join(tmp, "cay-viec", "issue"), { recursive: true });
  const the = (id: string, o: Record<string, unknown>) => ({
    id, nguon: "nguoi", mucDo: "red", tieuDe: id, phanTich: "", anhHuongCod: 0, nguonDuLieu: "bài kiểm", deXuat: "",
    dieuKien: "dang-vi-pham", xuLy: "chua-xu-ly", ghiNhan: [], ngayMo: "2026-10-10", ...o,
  });
  fs.writeFileSync(
    path.join(tmp, "cay-viec", "issue", "HV.json"),
    JSON.stringify({ lanChayCuoi: "2026-10-17", the: [the("ISS-1", { nguon: "gang", tieuDe: "Luật 3 — găng: 6.1.4 chưa ai nhận", wbs: "6.1.4" }), the("ISS-2", { wbs: "6.1.4" })] }),
  );
});

afterAll(() => {
  delete process.env.DOCFLOW_AI_DATA;
  delete process.env.AUTH_SECRET_CHUNG;
  fs.rmSync(tmp, { recursive: true, force: true });
});

beforeEach(() => {
  process.env.AUTH_SECRET_CHUNG = KHOA_CHUNG;
  xoaNhoDauViec();
  treo = false;
  dauThu.length = 0;
  vi.stubGlobal("fetch", async (url: string, init: { body: string; headers?: Record<string, string> }) => {
    const than = JSON.parse(init.body) as { cong_cu: string };
    if (url.includes("/api/mcp/tiendo")) dauThu.push({ congCu: than.cong_cu, noiBo: init.headers?.["x-sci-noi-bo"] ?? null });
    if (treo && than.cong_cu === "tiendo.tim_dau_viec") await new Promise<void>((r) => choTha.push(r));
    return { status: 200, json: async () => traLoiTienDo(than.cong_cu) } as unknown as Response;
  });
});

afterEach(() => {
  treo = false;
  choTha.splice(0).forEach((r) => r());
  vi.unstubAllGlobals();
});

type NguoiTai = { ma_base: string; viec_gang: number | null; viec_nang: { ma_viec_base: string; gang: boolean }[] };

describe("① base.tai_viec_theo_nguoi — việc găng theo danh sách việc lá găng tới COD", () => {
  it("6.1.4 (lá găng, ngoài chuỗi dẫn COD) và 6.1.4.2 (mã con) tính găng; 6.1 (nhóm cha) và 7.2.3 không tính", async () => {
    const { chayCongCu } = await import("@/lib/mcp/cong-base");
    const kq = await chayCongCu("base.tai_viec_theo_nguoi", { ma_du_an: "HV" });
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    const d = kq.du_lieu as { nguoi: NguoiTai[]; dinh_nghia_viec_gang?: string };
    const cua = (ma: string) => d.nguoi.find((n) => n.ma_base === ma);
    expect(cua("doainv@scigroup.vn")?.viec_gang).toBe(2);
    expect(cua("p-cd")?.viec_gang).toBe(0);
    expect(cua("bqlda-qt")?.viec_gang).toBe(1);
    // Người nặng nhất (nhiều việc găng) lên đầu
    expect(d.nguoi[0]!.ma_base).toBe("doainv@scigroup.vn");
    expect(cua("doainv@scigroup.vn")?.viec_nang.every((v) => v.gang)).toBe(true);
    expect(d.dinh_nghia_viec_gang).toMatch(/con/);
    // Hỏi danh sách lá găng (tim_dau_viec), không hỏi chuỗi 12 mắt xích
    expect(dauThu.map((x) => x.congCu)).toContain("tiendo.tim_dau_viec");
    expect(dauThu.map((x) => x.congCu)).not.toContain("tiendo.duong_gang");
  });

  it("mô tả công cụ ghi rõ luật đếm việc găng (lá găng hoặc mã con · nhóm cha không tính)", async () => {
    const { DANH_MUC } = await import("@/lib/mcp/cong-base");
    const moTa = DANH_MUC.find((c) => c.ten === "base.tai_viec_theo_nguoi")?.mo_ta ?? "";
    expect(moTa).toMatch(/tim_dau_viec/);
    expect(moTa).toMatch(/mã con/);
    expect(moTa).toMatch(/nhóm cha/);
  });

  it("phần thuần: mã con ở mọi tầng sâu đều tính, mã cha không tính, mã khác nhánh không tính", () => {
    const ds = tongHopTaiTheoNguoi(
      [
        { id: "1", ten: "a", nguoiPhuTrach: "p1", daXong: false, han: null, quaHanNgay: null, maWbs: ["6.1.4.2.1"] },
        { id: "2", ten: "b", nguoiPhuTrach: "p1", daXong: false, han: null, quaHanNgay: null, maWbs: ["6.1"] },
        { id: "3", ten: "c", nguoiPhuTrach: "p1", daXong: false, han: null, quaHanNgay: null, maWbs: ["6.1.40"] },
      ],
      new Set(["6.1.4"]),
      "2026-10-17",
    );
    expect(ds[0]!.viec_gang).toBe(1);
  });
});

describe("② base.danh_sach_issue — không chờ agent Tiến độ quá 5 giây", () => {
  it("Tiến độ treo → trả trong ~5 giây: thẻ luật 3 vẫn true, thẻ khác null + cảnh báo; lượt sau có cờ đủ", async () => {
    const { chayCongCu } = await import("@/lib/mcp/cong-base");
    treo = true;
    // Mã cũ chờ tới khi Tiến độ thưa — tự thả sau 8 giây để bài đỏ không treo 20 giây
    const thaSau = setTimeout(() => choTha.splice(0).forEach((r) => r()), 8_000);
    const bd = Date.now();
    const kq = await chayCongCu("base.danh_sach_issue", { ma_du_an: "HV" });
    const ms = Date.now() - bd;
    clearTimeout(thaSau);
    expect(ms).toBeLessThan(6_500);
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    const ds = (kq.du_lieu as { issue: { id: string; tren_duong_gang: boolean | null }[] }).issue;
    expect(ds.find((x) => x.id === "ISS-1")?.tren_duong_gang).toBe(true);
    expect(ds.find((x) => x.id === "ISS-2")?.tren_duong_gang).toBeNull();
    expect((kq.canh_bao ?? []).join(" ")).toMatch(/5 giây/);

    // Tiến độ thưa → lượt hỏi đang bay nạp bộ nhớ → lượt sau có cờ ngay
    treo = false;
    choTha.splice(0).forEach((r) => r());
    await new Promise((r) => setTimeout(r, 50));
    const kq2 = await chayCongCu("base.danh_sach_issue", { ma_du_an: "HV" });
    expect(kq2.ok).toBe(true);
    if (!kq2.ok) return;
    const ds2 = (kq2.du_lieu as { issue: { id: string; tren_duong_gang: boolean | null }[] }).issue;
    expect(ds2.find((x) => x.id === "ISS-2")?.tren_duong_gang).toBe(true);
  }, 30_000);
});

describe("③ lượt gửi sang agent Tiến độ luôn kèm khoá nội bộ", () => {
  it("x-sci-noi-bo = sha256(\"noi-bo:\" + khoá chung) ở mọi lượt", async () => {
    const { chayCongCu } = await import("@/lib/mcp/cong-base");
    await chayCongCu("base.danh_sach_issue", { ma_du_an: "HV" });
    await chayCongCu("base.tai_viec_theo_nguoi", { ma_du_an: "HV" });
    expect(dauThu.length).toBeGreaterThan(0);
    expect(dauThu.every((x) => x.noiBo === BAM_NOI_BO)).toBe(true);
  });
});
