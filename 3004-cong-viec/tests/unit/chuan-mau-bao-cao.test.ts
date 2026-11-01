// ============================================================
// ẢNH CHUẨN BỘ ĐỌC BÁO CÁO — cổng kiểm thử Đợt A "Khai báo mẫu báo cáo không cần sửa code"
// (0 Tài liệu thiết kế/DE-XUAT-KHAI-BAO-MAU-BAO-CAO-v0.1-CHO-DUYET.md, mục 8 ca 1 — Mr. Đại duyệt 01/10/2026).
// Chạy mọi file báo cáo thật (tuần 39, tuần 40 mẫu bản 8 kể cả các ca lỗi, mẫu gốc, mẫu trắng, ví dụ) qua kiemTraDayDu
// với NGÀY NỘP CỐ ĐỊNH 01/10/2026, so với ảnh chụp trước khi gỡ ghi cứng: số việc, cột, lỗi, nơi gửi phải BẰNG HỆT.
//   Chụp lại ảnh (chỉ khi cố ý đổi hành vi):  CHUP_CHUAN=1 npx vitest run tests/unit/chuan-mau-bao-cao.test.ts
// ============================================================
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { NGUOI_DUNG_MAU } from "@/lib/khoi-tao";

const GOC = process.cwd();
// Bộ tuần 40 từng nằm cạnh CodeSCICongViec; 02/10 được dời vào "SCI-AI-AGENT/Lưu tạm 6-Agent-cong-viec" (đo 04/10, đủ 34 tệp).
// Khoá ảnh chuẩn = tên thư mục cuối + tên tệp nên chỗ nào cũng khớp — lấy chỗ đang có.
const TUAN_40 =
  [path.join(GOC, "..", "File test tuần 40 - mẫu bản 8"), path.join(GOC, "..", "..", "Lưu tạm 6-Agent-cong-viec", "File test tuần 40 - mẫu bản 8")].find((d) =>
    fs.existsSync(d),
  ) ?? path.join(GOC, "..", "File test tuần 40 - mẫu bản 8");
const THU_MUC = [
  TUAN_40,
  path.join(GOC, "tests", "e2e", "du-lieu", "tuan39"),
  path.join(GOC, "mau-word", "goc"),
  path.join(GOC, "mau-word", "trang"),
  path.join(GOC, "mau-word", "vi-du"),
];
const ANH = path.join(GOC, "tests", "unit", "__chuan__", "mau-bao-cao.json");
const NGAY_NOP = "2026-10-01T09:00:00+07:00";

function tomTat(kq: Awaited<ReturnType<typeof kiemTraDayDu>>) {
  return {
    mau_ma: kq.mau_ma,
    dat: kq.dat,
    tu_do: kq.tu_do,
    don_vi_lap: kq.don_vi_lap,
    gui_den: kq.gui_den,
    ky: kq.ky_bao_cao ? `${kq.ky_bao_cao.loai}-${kq.ky_bao_cao.so}-${kq.ky_bao_cao.nam}` : null,
    viec: kq.cong_viec.map((c) => ({
      ten: c.ten,
      bang: c.nguon_bang,
      dong: c.dong_so,
      du_an: c.du_an ?? null,
      bat_dau: c.bat_dau ?? null,
      ket_thuc: c.ket_thuc ?? null,
      da_xong: !!c.da_xong,
      phu_trach: (c.phu_trach ?? []).map((p) => `${p.loai}:${p.id}`),
      kq: c.ket_qua_can_co ?? null,
      cot_khac: (c as { cot_khac?: Record<string, string> }).cot_khac ?? null,
    })),
    loi: kq.loi.map((l) => `${l.muc}|${l.luat}|${l.thong_diep}`),
  };
}

describe("ảnh chuẩn bộ đọc báo cáo (Đợt A)", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
  });

  it("mọi file báo cáo thật cho kết quả bằng hệt ảnh chuẩn", async () => {
    // Người nộp = người mẫu thuộc ĐÚNG đơn vị máy đọc ra từ file (không thì bị chặn "bạn không thuộc…" và ảnh bỏ sót phần đọc sau)
    const nd0 = await nguoi("truong.dtpc@scigroup.vn");
    const emailCua = new Map<string, string>();
    for (const n of NGUOI_DUNG_MAU) if (n.don_vi_id && !emailCua.has(n.don_vi_id)) emailCua.set(n.don_vi_id, n.email);
    const kq: Record<string, unknown> = {};
    for (const tm of THU_MUC) {
      if (!fs.existsSync(tm)) continue;
      for (const tep of fs.readdirSync(tm).filter((f) => f.toLowerCase().endsWith(".docx")).sort()) {
        const buf = fs.readFileSync(path.join(tm, tep));
        const khoa = `${path.basename(tm)}/${tep}`;
        try {
          const tc = { bo_qua_so_cai: true, ngay_nop: NGAY_NOP };
          let r = await kiemTraDayDu(q, nd0, buf, tep, tc);
          const email = r.don_vi_lap ? emailCua.get(r.don_vi_lap) : undefined;
          if (email && email !== nd0.email) r = await kiemTraDayDu(q, await nguoi(email), buf, tep, tc);
          kq[khoa] = tomTat(r);
        } catch (e) {
          kq[khoa] = { loi_chay: e instanceof Error ? e.message : String(e) };
        }
      }
    }
    if (process.env.CHUP_CHUAN === "1") {
      fs.mkdirSync(path.dirname(ANH), { recursive: true });
      fs.writeFileSync(ANH, JSON.stringify(kq, null, 1));
      return;
    }
    const chuan = JSON.parse(fs.readFileSync(ANH, "utf8"));
    expect(Object.keys(kq).sort()).toEqual(Object.keys(chuan).sort());
    for (const k of Object.keys(chuan)) expect(kq[k], k).toEqual(chuan[k]);
  }, 600_000);
});
