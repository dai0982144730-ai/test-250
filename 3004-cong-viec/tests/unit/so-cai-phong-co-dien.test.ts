// ============================================================
// PHÒNG CƠ ĐIỆN (Form 9, mẫu SCI-160 — bố cục mới): gửi đúng file Word anh gửi (chưa gắn mã, tên file gốc) theo QUY TẮC THẬT.
// Từ mẫu phiên bản 4 (Mr. Đại chốt 29/09/2026): việc CHỈ lấy từ chương "KẾT QUẢ VÀ KẾ HOẠCH VIỆC TUẦN TỚI". File gốc của phòng
// chưa có chương đó → 3 mục An toàn / Cảnh báo / Kiến nghị là số liệu báo cáo, không sinh việc, không chặn vì thiếu hạn.
// ============================================================
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import { khoTam, tep } from "../fixtures/chuan-bi";
import { tx, layQ } from "@/lib/db";
import { taiLenVaKiemTra } from "@/lib/gui/tai-len";
import { gui } from "@/lib/gui/dich-vu";

const GOC = path.join(process.cwd(), "mau-word", "goc", "SCI-160_BaoCaoTuan_PhongCoDien.docx");
/** Tên file đúng như phòng gửi (nhận mẫu theo mã biểu mẫu SCI-160 trong tên file). */
const TEN = "SCI-160_V01_260926_Mẫu Báo cáo tuần Phòng Cơ điện (Demo).docx";


describe("Phòng Cơ điện · Form 9 (SCI-160) · quy tắc thật", () => {
  beforeAll(async () => {
    khoTam();
    await csdlMoi({ macDinhGoc: true });
  });

  it("file gốc: nhận đúng Form 9, kỳ tuần 39 (21–27/09), gửi Ban TGĐ; không sinh việc → chặn chương việc trống (K11 02/10)", async () => {
    const nd = await nguoi("nv.cd@scigroup.vn");
    const r = await tx((q) => taiLenVaKiemTra(q, nd, { tep: tep(TEN, fs.readFileSync(GOC)) }));
    const k = r.ket_qua;
    expect(k.mau_ma).toBe("form-9");
    expect(k.ky_bao_cao).toMatchObject({ loai: "tuan", so: 39, nam: 2026, tu: "2026-09-21", den: "2026-09-27" });
    expect(k.gui_den).toEqual(["ban-tgd"]);
    expect(k.loi.filter((l) => l.muc === "chan").map((l) => l.luat)).toEqual(["bang_viec_trong"]);
    expect(k.cong_viec).toEqual([]);
    expect(k.loi.some((l) => /chưa tích/i.test(l.thong_diep))).toBe(false); // mẫu không có hộp tích Tuần/Tháng
  });

  it("gửi file gốc: bị chặn vì chương việc trống (K11); không việc nào vào sổ cái (bảng An toàn / Cảnh báo / Kiến nghị không sinh việc)", async () => {
    const nd = await nguoi("nv.cd@scigroup.vn");
    const r = await tx((q) => taiLenVaKiemTra(q, nd, { tep: tep(TEN, fs.readFileSync(GOC)) }));
    await expect(tx((q) => gui(q, nd, { tai_lieu_id: r.tai_lieu_id!, den: r.ket_qua.gui_den }))).rejects.toThrow();
    const q = await layQ();
    const { rows } = await q.query("SELECT 1 FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1", [r.tai_lieu_id]);
    expect(rows).toHaveLength(0);
  });
});
