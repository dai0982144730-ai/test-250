// Khai báo mẫu — CỔNG "CẬP NHẬT MÀ KHÔNG ĐỔI GÌ" (01/10/2026).
// Người quản trị tải mẫu hiện hành về, tải lên lại nguyên si → qua luồng cập nhật (phiên bản trước đọc từ file,
// 🤖 giả trả đúng nghĩa cũ, code ghép + gắn nhãn) → file mới đọc ra Y HỆT: mọi bảng (cả 18 loại bảng số liệu mà
// 59 luật kiểm tra trỏ vào), mọi việc, mọi lỗi / cảnh báo / gợi ý. Chạy trên 16 báo cáo thật của 11 mẫu (Form 0–10).
import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { csdlMoi, nguoi } from "../helpers/csdl";
import type { Q } from "@/lib/db";
import type { CauTrucMau } from "@/lib/types";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { docWord } from "@/lib/kiem-tra/doc-word";
import { sinhTruongCu } from "@/lib/kiem-tra/cau-truc";
import { cauTrucTuFileCo, ganNhanTheoCauTruc, khungVanBan, type KhungVanBan } from "@/lib/kiem-tra/gan-nhan";
import { ghepDeXuat, slugTag } from "@/lib/kiem-tra/de-xuat-cau-truc-thuan";

const THU_MUC = path.join(process.cwd(), "..", "File test tuần 40 - mẫu bản 8");
const NGAY_NOP = "2026-10-01T09:00:00+07:00";
const TEP = fs.existsSync(THU_MUC) ? fs.readdirSync(THU_MUC).filter((f) => /^TEST - (Tuần 40|Tháng 9) - .*\(Form \d+\)\.docx$/.test(f)) : [];

/** 🤖 "hoàn hảo": trả đúng nghĩa của phiên bản trước theo số thứ tự trong khung. */
function aiDung(khung: KhungVanBan, cu: CauTrucMau) {
  const k = (s: string) => slugTag(s);
  return {
    chuong: khung.chuong.map((kc, i) => {
      const cc = cu.chuong.find((c) => k(c.tieu_de) === k(kc.tieu_de));
      return {
        so: i,
        nghia: cc?.nghia ?? "thong_tin",
        bang: kc.bang.map((kb) => {
          const b = cc?.bang[kb.vi_tri];
          return { vi_tri: kb.vi_tri, nghia: b?.tag ? b.nghia : "so_lieu", cot: kb.tieu_de_cot.map((t, j) => ({ so: j, nghia: b?.cot.find((x) => k(x.tieu_de) === k(t))?.nghia ?? "them" })) };
        }),
      };
    }),
  };
}

describe.skipIf(!TEP.length)("cập nhật mẫu trên file tải về, không đổi gì → đọc ra y hệt (16 báo cáo thật, Form 0–10)", () => {
  let q: Q;
  beforeAll(async () => {
    q = await csdlMoi();
  });

  for (const tep of TEP)
    it(tep, async () => {
      const goc = fs.readFileSync(path.join(THU_MUC, tep));
      const d1 = await docWord(goc);
      const ma = d1.mau_ma!;
      const { rows } = await q.query<{ dinh_nghia: Parameters<typeof cauTrucTuFileCo>[1] & Record<string, unknown> }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = $1", [ma]);
      const dnGoc = rows[0].dinh_nghia;
      const cu = await cauTrucTuFileCo(goc, dnGoc);
      const khung = await khungVanBan(goc);
      const kq = ghepDeXuat(aiDung(khung, cu), khung, cu);
      expect(kq.loi_cau_truc).toEqual([]);
      const gan = await ganNhanTheoCauTruc(goc, ma, kq.cau_truc, ((dnGoc.o_nhap ?? []) as { tag: string }[]).map((o) => o.tag));
      expect(gan.thieu).toEqual([]);
      expect(gan.mat_nhan_cot).toEqual([]);

      // mọi bảng đọc ra y hệt
      const d2 = await docWord(gan.buf);
      expect(d2.mau_ma).toBe(ma);
      expect(Object.keys(d2.bang).sort()).toEqual(Object.keys(d1.bang).sort());
      for (const t of Object.keys(d1.bang)) expect(d2.bang[t], t).toEqual(d1.bang[t]);

      // mọi việc + mọi lỗi / cảnh báo / gợi ý y hệt
      const nd0 = await nguoi("truong.dtpc@scigroup.vn");
      const tc = { bo_qua_so_cai: true, ngay_nop: NGAY_NOP };
      const k0 = await kiemTraDayDu(q, nd0, goc, "goc.docx", tc);
      const nd = { ...nd0, don_vi_id: k0.don_vi_lap, don_vi_ids: [k0.don_vi_lap!] } as typeof nd0;
      const kq1 = await kiemTraDayDu(q, nd, goc, "goc.docx", tc);
      await q.query("UPDATE docflow.mau_word SET dinh_nghia = $2::jsonb WHERE ma = $1", [ma, JSON.stringify({ ...dnGoc, cau_truc: kq.cau_truc, ...sinhTruongCu(kq.cau_truc) })]);
      const kq2 = await kiemTraDayDu(q, nd, gan.buf, "gan.docx", tc);
      await q.query("UPDATE docflow.mau_word SET dinh_nghia = $2::jsonb WHERE ma = $1", [ma, JSON.stringify(dnGoc)]);
      const viec = (k: typeof kq1) => k.cong_viec.map((c) => [c.ten, c.ket_thuc ?? null, c.du_an ?? null, !!c.da_xong, c.ket_qua_can_co ?? null]);
      expect(viec(kq2)).toEqual(viec(kq1));
      const loi = (k: typeof kq1) => k.loi.map((l) => `${l.muc} ${l.thong_diep}`);
      expect(loi(kq2)).toEqual(loi(kq1));
    });
});
