// ============================================================
// cay-viec/issue/nhom5.ts — NHÓM 5 🤖 AI ĐỀ XUẤT: gom câu nguồn + hỏi LLM + ghi đề xuất vào sổ (chép sinhNhom5 của agent Base).
// TỐN TOKEN nên chỉ chạy khi NGƯỜI BẤM "🤖 Chạy AI đề xuất". CHỈ SERVER.
//   Nguồn: bảng Sự cố · Cảnh báo của (Kiến nghị bỏ 07/10 — tab "Cần ra quyết định" lo) báo cáo tuần/tháng ĐÃ NỘP trong 28 ngày gần nhất — bản MỚI NHẤT mỗi đơn vị.
//   Thuộc dự án: báo cáo của đơn vị quản lý dự án / Ban điều hành dự án (Cài đặt › Sơ đồ tổ chức dự án) → lấy mọi dòng;
//   báo cáo đơn vị khác → chỉ dòng có nhắc tên dự án (tên / tên gọi khác).
// ⛔ KHÔNG bọc lượt AI trong tx(): PGlite khoá cả CSDL suốt giao dịch, runAI tự đọc Cài đặt bằng layQ() → treo cả app (03/10).
//   Mọi câu đọc dùng layQ() từng câu; ghi sổ issue là file, ghi ngắn sau khi AI trả lời.
// ============================================================
import { layQ, type Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { khoangNgay } from "@/lib/phong/tuan";
import { ganTenWbs } from "@/lib/gan-wbs/thuan";
import { chonDuAn } from "@/lib/cay-viec/dung-man";
import { homNayVN } from "@/lib/cay-viec/doc-so-cai";
import type { DauViecCay } from "@/lib/cay-viec/thuan";
import { theHopLe } from "./model";
import { docSo, themDeXuatAi } from "./so-issue";
import { BANG_NHOM5, HE_THONG_NHOM5, docTraLoi5, nhacDuAn, trichDong, xayTheNhom5, type CauNguon } from "./nhom5-thuan";
import type { KhuonTra } from "@/lib/mcp/khuon";

type BanNop = { id: string; phien_ban: number; khoa_luu: string; don_vi: string; ten_dv: string; loai: string; tu: string; den: string };
type G = typeof globalThis & { __bangNhom5Cache?: Map<string, Record<string, Record<string, string>[]>> };

const SO_NGAY_DOC = 28;
const TRAN_CAU = 80;

/** Bảng của một bản đã nộp (nhớ theo tài liệu + phiên bản — file đã gửi không đổi) */
async function bangCuaBan(q: Q, b: BanNop): Promise<Record<string, Record<string, string>[]>> {
  const g = globalThis as G;
  const cache = (g.__bangNhom5Cache ??= new Map());
  const k = `${b.id}:${b.phien_ban}`;
  const co = cache.get(k);
  if (co) return co;
  let bang: Record<string, Record<string, string>[]> = {};
  try {
    bang = ((await docBaoCao((await docPhienBan(q, b.id, b.phien_ban, null)).noi_dung)).bang ?? {}) as Record<string, Record<string, string>[]>;
  } catch {
    bang = {}; // file không đọc được: bỏ qua, không làm hỏng cả lượt
  }
  if (cache.size > 300) cache.clear();
  cache.set(k, bang);
  return bang;
}

/** Gom câu nguồn của một dự án (code, không AI). Trả kèm số báo cáo đã đọc để màn nói được "đọc gì". */
export async function gomCauNguon(
  q: Q,
  da: { id: string; ten: string; ten_khac: string[]; don_vi: string[]; ban_dieu_hanh?: string | null },
  homNay: string,
): Promise<{ cau: CauNguon[]; soBaoCao: number; soBaoCaoCuaDuAn: number }> {
  const tu = new Date(Date.parse(homNay + "T00:00:00Z") - SO_NGAY_DOC * 86400000).toISOString().slice(0, 10);
  const { rows: ban } = await q.query<BanNop>(
    `SELECT DISTINCT ON (t.don_vi_lap) t.id, b.phien_ban, p.khoa_luu, t.don_vi_lap AS don_vi, COALESCE(d.ten_ngan, d.ten, t.don_vi_lap) AS ten_dv,
            t.ky_bao_cao->>'loai' AS loai, t.ky_bao_cao->>'tu' AS tu, t.ky_bao_cao->>'den' AS den
       FROM docflow.tai_lieu t
       JOIN docflow.buoc_hanh_trinh b ON b.tai_lieu_id = t.id AND b.loai IN ('gui','gui_moi','gui_lai')
       JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = b.tai_lieu_id AND p.phien_ban = b.phien_ban
       LEFT JOIN identity.don_vi d ON d.id = t.don_vi_lap
      WHERE t.trang_thai IN ('da_gui','hoan_thanh') AND t.don_vi_lap IS NOT NULL AND t.ky_bao_cao IS NOT NULL
        AND t.ky_bao_cao->>'loai' IN ('tuan','thang') AND t.ky_bao_cao->>'den' >= $1
      ORDER BY t.don_vi_lap, t.ky_bao_cao->>'tu' DESC, b.luc DESC`,
    [tu],
  );
  const dvDuAn = new Set([...(da.don_vi ?? []), ...(da.ban_dieu_hanh ? [da.ban_dieu_hanh] : [])]);
  const cau: CauNguon[] = [];
  const daCo = new Set<string>();
  let soCuaDuAn = 0;
  for (const b of ban) {
    const cuaDuAn = dvDuAn.has(b.don_vi);
    if (cuaDuAn) soCuaDuAn++;
    const bang = await bangCuaBan(q, b); // AI đề xuất chỉ đọc bản đã cắt chương mật
    for (const { tag, nhan } of BANG_NHOM5) {
      (bang[tag] ?? []).forEach((r, i) => {
        if (cau.length >= TRAN_CAU) return;
        const x = trichDong(tag, r);
        if (!x) return;
        if (!cuaDuAn && !nhacDuAn(`${x.trich} ${x.boSung ?? ""}`, da.ten, da.ten_khac ?? [])) return;
        const khoa = x.trich.toLowerCase();
        if (daCo.has(khoa)) return; // nhiều đơn vị ghi cùng một câu → một câu
        daCo.add(khoa);
        cau.push({
          so: cau.length + 1,
          trich: x.trich,
          boSung: x.boSung,
          ngayDau: b.tu || undefined,
          nguonDuLieu: `Báo cáo ${b.loai === "thang" ? "tháng" : "tuần"} ${khoangNgay(b.tu, b.den)} — ${b.ten_dv} — bảng ${nhan} dòng ${i + 1}`,
        });
      });
    }
  }
  return { cau, soBaoCao: ban.length, soBaoCaoCuaDuAn: soCuaDuAn };
}

export interface KetQuaNhom5 {
  ok: boolean;
  soDeXuat: number;
  soCauNguon: number;
  soLoai: number;
  soBaoCao: number;
  thongDiep: string;
}

export async function sinhNhom5(
  duAnId: string,
  hoiCay: (maTienDo: string, lyDo: string) => Promise<KhuonTra>,
  goiAi?: (prompt: string, system: string) => Promise<string>,
  bayGio = Date.now(),
): Promise<KetQuaNhom5> {
  const homNay = homNayVN(bayGio);
  const q = await layQ();
  const da = chonDuAn(await layCauHinh(q, "du_an"), duAnId);
  if (!da) return { ok: false, soDeXuat: 0, soCauNguon: 0, soLoai: 0, soBaoCao: 0, thongDiep: `Không có dự án "${duAnId}".` };
  const { cau, soBaoCao, soBaoCaoCuaDuAn } = await gomCauNguon(q, da, homNay);
  const docGi = `đọc ${soBaoCao} báo cáo đã nộp trong ${SO_NGAY_DOC} ngày (${soBaoCaoCuaDuAn} của đơn vị quản lý / Ban điều hành dự án)`;
  if (cau.length === 0) {
    return { ok: true, soDeXuat: 0, soCauNguon: 0, soLoai: 0, soBaoCao, thongDiep: `Đã ${docGi} — không có dòng Sự cố / Cảnh báo nào của dự án ${da.ten}.` };
  }
  let ai = goiAi;
  if (!ai) {
    const { getAIConfig, isAIConfigured, runAIGan } = await import("@/lib/ai/providers");
    if (!isAIConfigured(getAIConfig())) return { ok: false, soDeXuat: 0, soCauNguon: cau.length, soLoai: 0, soBaoCao, thongDiep: "Chưa kết nối AI — vào Cài đặt › Kết nối › AI rồi thử lại." };
    const model = (await layCauHinh(q, "ai")).model_mac_dinh || undefined;
    ai = (p, sys) => runAIGan("lib/cay-viec/issue/nhom5", p, sys, undefined, model, 180_000, true);
  }
  const kc = da.ma_tien_do ? await hoiCay(da.ma_tien_do, `màn Issue agent Công việc — nhóm 5: danh sách đầu việc để AI gắn đề xuất vào đúng WBS (dự án ${da.ten})`) : null;
  const tasks: (DauViecCay & { floatDays?: number })[] = kc?.ok ? (((kc.du_lieu as { tasks?: DauViecCay[] })?.tasks ?? []) as DauViecCay[]) : [];
  const cay = new Map(tasks.filter((t) => t.wbs).map((t) => [t.wbs, t]));
  const tenTheoMa = new Map(tasks.map((t) => [t.wbs, String(t.name ?? "")]));
  // Danh sách đầu việc cho AI chọn mã: cấp ≤ 3 (đủ để gắn chuyện vào hạng mục, không ngập prompt)
  const dsWbs = tasks
    .filter((t) => t.wbs.split(".").length <= 3)
    .slice(0, 200)
    .map((t) => `${t.wbs} ${t.name ?? ""}${t.critical ? " [GĂNG]" : ""}`)
    .join("\n");
  const so = docSo(da.id);
  const dangMo = so.the.filter((t) => t.dieuKien !== "da-dong").map((t) => `- [${t.id}] ${t.tieuDe}`).slice(0, 60);
  const prompt =
    `DỰ ÁN: ${da.ten}\n\nCÂU NGUỒN (trích nguyên văn):\n` +
    cau.map((c) => `${c.so}. «${c.trich}» — ${c.nguonDuLieu}${c.boSung ? ` (${c.boSung})` : ""}`).join("\n") +
    `\n\nĐẦU VIỆC WBS CỦA DỰ ÁN:\n${dsWbs || "(agent Tiến độ chưa trả cây — bỏ trống wbs)"}` +
    `\n\nISSUE ĐANG MỞ (đừng đề xuất trùng):\n${dangMo.length ? dangMo.join("\n") : "(chưa có)"}`;
  let raw: string;
  try {
    raw = String(await ai(prompt, HE_THONG_NHOM5));
  } catch (e) {
    return { ok: false, soDeXuat: 0, soCauNguon: cau.length, soLoai: 0, soBaoCao, thongDiep: `🤖 Chưa gọi được AI: ${e instanceof Error ? e.message : "lỗi không rõ"}.` };
  }
  const { dong, soLoai } = docTraLoi5(raw);
  // Đọc lại sổ SAU lượt AI (lượt AI có thể dài — người khác có thể vừa ghi) rồi mới ghép
  const soMoi = docSo(da.id);
  const theMoi = xayTheNhom5(dong, cau, cay, soMoi.the, homNay, (s) => ganTenWbs(s, tenTheoMa)).filter(theHopLe);
  themDeXuatAi(da.id, theMoi);
  return {
    ok: true,
    soDeXuat: theMoi.length,
    soCauNguon: cau.length,
    soLoai,
    soBaoCao,
    thongDiep: `🤖 AI ${docGi}: ${cau.length} câu nguồn → ${theMoi.length} đề xuất mới${soLoai > 0 ? ` (${soLoai} dòng bị loại vì thiếu căn cứ / đề xuất)` : ""}.`,
  };
}
