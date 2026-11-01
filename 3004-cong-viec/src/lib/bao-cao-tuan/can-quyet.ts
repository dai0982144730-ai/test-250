// ============================================================
// bao-cao-tuan/can-quyet.ts — TAB "CẦN RA QUYẾT ĐỊNH" của Báo cáo tuần (CHỈ SERVER — đọc file báo cáo trong kho).
// Mr. Đại chốt 02/10/2026 (thay "AI chọn việc từ sổ cái theo chữ trong tên"):
//   · nguồn = dòng KIẾN NGHỊ trong báo cáo mới nhất của từng đơn vị trong tuần + dòng QUYẾT ĐỊNH Form 0 — CODE đọc, không AI
//   · mỗi dòng xét đã có việc trên sổ cái chưa:
//       chưa có → nút Giao việc (lãnh đạo quyết xong thì giao — kể cả kiến nghị trưởng phòng bấm Bỏ lúc nộp)
//       có, đang chạy → mã + tên việc · Nhắc một chạm · ô bình luận @ (ghi vào việc đó)
//       có, đã xong → "Đã xong ngày …", không nút
//   · "đã có việc" CHẮC CHẮN khi: đã giao từ chính tab này (bảng kien_nghi_viec) · Form 0 TGĐ đã quyết · dòng kiến nghị từng vào
//     sổ cái (cùng nội dung) · tên việc giống ≥ 0,9. Giống 0,6–0,9 KHÔNG tự nhận — chỉ hiện "có thể là …" (đo 02/10: khớp lỏng
//     ≥ 0,6 sai ít nhất 6/34 dòng, vd "Hợp đồng O&M nhà máy" khớp nhầm "Hợp đồng bảo vệ VP Hà Nội").
//   · nhiều đơn vị ghi cùng một kiến nghị → gộp một dòng, ghi đủ đơn vị.
// ============================================================
import type { Q } from "@/lib/db";
import { docBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { chuanHoa, doGiongTen, khacSoHieu, tachTuCoDau, tuCoNghia } from "@/lib/so-cai/tien-ich";
import { dongQuyetDinh } from "@/lib/so-cai/doc-them";
import { docKetLuanAi, khoaUngVien } from "./can-quyet-ai";
import type { NhomBoi, NhomCanQuyet } from "./can-quyet-nhom";

export type ViecGan = { ma: string; ten: string; trang_thai: string; dong_ngay: string | null };
export interface DongCanQuyet {
  /** khoá dòng = nội dung đã chuẩn hoá (giữ qua các tuần) */
  khoa: string;
  loai: "kien_nghi" | "quyet_dinh";
  noi_dung: string;
  /** cột "Kiến nghị" nguyên văn (Form 0: hạn quyết định) */
  kien_nghi: string;
  muc_do: string;
  don_vi: { id: string; ten: string; tai_lieu_id: string }[];
  /** việc chắc chắn đã có trên sổ cái */
  viec: ViecGan | null;
  /** chưa chắc: việc gần giống nhất (chỉ hiện khi AI chưa đọc / không chắc) */
  co_the: { ma: string; ten: string } | null;
  /** việc gần giống (tối đa 4) — đưa AI đọc như người */
  ung_vien?: { ma: string; ten: string }[];
  /** 🤖 AI kết luận cùng việc — lý do một câu (luật 19: nội dung AI có 🤖) */
  ai_ly_do?: string;
  /** 4 nhóm của tab (Mr. Đại chốt 20/10/2026) — can-quyet-nhom.ts; ai xếp; 🤖 lý do khi AI xếp; code chưa chắc đang chờ AI */
  nhom?: NhomCanQuyet;
  nhom_boi?: NhomBoi;
  nhom_ly_do?: string;
  nhom_cho_ai?: boolean;
  /** 🤖 AI vừa lỗi khi xếp dòng này — nhóm là máy đoán tạm, 10 phút sau hỏi lại */
  nhom_ai_loi?: boolean;
}

/** Chữ viết tắt hay gặp trong báo cáo — mở ra trước khi so (người đọc hiểu TMĐT = tổng mức đầu tư, máy thì không) */
/** Từ đứng riêng ( của JavaScript không hiểu chữ có dấu như Đ) */
const tuRieng = (w: string, co = "") => new RegExp(String.raw`(?<![\p{L}\p{N}])(?:${w})(?![\p{L}\p{N}])`, `gu${co}`);
const VIET_TAT: [RegExp, string][] = [
  [tuRieng("TMĐT", "i"), "tổng mức đầu tư"],
  [tuRieng("GPMB", "i"), "giải phóng mặt bằng"],
  [tuRieng("TKCS", "i"), "thiết kế cơ sở"],
  [tuRieng("TKKT", "i"), "thiết kế kỹ thuật"],
  [tuRieng("HĐ"), "hợp đồng"],
  [tuRieng("BộCT|BCT"), "bộ công thương"],
  [tuRieng("ĐG"), "điện gió"],
  [tuRieng("TĐ"), "thủy điện"],
  [tuRieng("NM"), "nhà máy"],
  [tuRieng("UBND", "i"), "ủy ban nhân dân"],
  [tuRieng("O&M", "i"), "vận hành bảo dưỡng"],
  [tuRieng("PDA"), "quyền phát triển dự án"],
];
/** Chữ hay thêm vào TÊN VIỆC khi giao ("Trình TGĐ phê duyệt …", "Xử lý dứt điểm …") — không mang nghĩa phân biệt việc */
const CHU_GIAO = new Set("trình tgđ xin xử lý dứt điểm làm việc thực hiện hoàn thành theo dõi đôn đốc báo cáo trụ".split(" "));
const moVietTat = (s: string) => VIET_TAT.reduce((t, [re, thay]) => t.replace(re, thay), s);

/**
 * Như người đọc (Mr. Đại 02/10: "câu ngắn giống tới 80% thì chắc chắn là việc đó, phần việc có tên dài viết thêm"):
 * phần từ có nghĩa của câu NGẮN có mặt trong câu DÀI (sau khi mở chữ viết tắt, bỏ chữ hay thêm khi giao việc).
 * Số hiệu / mã khác nhau (T11 ≠ T12–T18, đợt 4 ≠ đợt 5) → 0.
 */
export function doChuaTrong(a: string, b: string): number {
  const [x, y] = [moVietTat(a), moVietTat(b)];
  if (khacSoHieu(x, y)) return 0;
  const loc = (s: string) => tuCoNghia(s).filter((w) => !CHU_GIAO.has(w));
  const [ngan, dai] = loc(x).length <= loc(y).length ? [x, y] : [y, x];
  const tu = loc(ngan);
  if (tu.length < 2) return 0;
  const co = new Set(tachTuCoDau(dai));
  return tu.filter((w) => co.has(w)).length / tu.length;
}

const GUONG_CHAC = 0.9;
const GUONG_CHUA = 0.8;
const GUONG_GOI_Y = 0.6;
const coChu = (s: string | undefined) => !!(s ?? "").replace(/[.…\s\-–—]/g, "");

type BanNop = { id: string; phien_ban: number; khoa_luu: string; don_vi: string; ten_dv: string; mau_ma: string | null };
type G = typeof globalThis & { __kienNghiCache?: Map<string, Record<string, string>[]> };

/** Dòng bảng kiến nghị của một bản (nhớ theo tài liệu + phiên bản — file đã gửi không đổi) */
async function dongKienNghi(q: Q, b: BanNop): Promise<Record<string, string>[]> {
  const g = globalThis as G;
  const cache = (g.__kienNghiCache ??= new Map());
  const k = `${b.id}:${b.phien_ban}`;
  const co = cache.get(k);
  if (co) return co;
  let rows: Record<string, string>[] = [];
  try {
    rows = (await docBaoCao((await docPhienBan(q, b.id, b.phien_ban, null)).noi_dung)).bang.bang_kien_nghi ?? []; // bản đã cắt chương mật
  } catch {
    rows = []; // file không đọc được: bỏ qua, không làm hỏng cả tab
  }
  if (cache.size > 500) cache.clear();
  cache.set(k, rows);
  return rows;
}

/** Bản báo cáo MỚI NHẤT mỗi đơn vị đã gửi cho tuần [tu, den] (báo cáo tuần đúng tuần, báo cáo tháng phủ tuần này) */
async function banTrongTuan(q: Q, tu: string, den: string): Promise<BanNop[]> {
  const { rows } = await q.query<BanNop>(
    `SELECT DISTINCT ON (t.don_vi_lap) t.id, b.phien_ban, p.khoa_luu, t.don_vi_lap AS don_vi, COALESCE(d.ten_ngan, d.ten, t.don_vi_lap) AS ten_dv, t.mau_ma
       FROM docflow.tai_lieu t
       JOIN docflow.buoc_hanh_trinh b ON b.tai_lieu_id = t.id AND b.loai IN ('gui','gui_moi','gui_lai')
       JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = b.tai_lieu_id AND p.phien_ban = b.phien_ban
       LEFT JOIN identity.don_vi d ON d.id = t.don_vi_lap
      WHERE t.trang_thai IN ('da_gui','hoan_thanh') AND t.don_vi_lap IS NOT NULL AND t.ky_bao_cao IS NOT NULL
        AND ((t.ky_bao_cao->>'loai' = 'tuan' AND t.ky_bao_cao->>'tu' = $1)
          OR (t.ky_bao_cao->>'loai' = 'thang' AND t.ky_bao_cao->>'tu' <= $2 AND t.ky_bao_cao->>'den' >= $1))
      ORDER BY t.don_vi_lap, b.luc DESC`,
    [tu, den],
  );
  return rows;
}

export async function dongCanQuyet(q: Q, tuan: { tu: string; den: string }): Promise<DongCanQuyet[]> {
  const ban = await banTrongTuan(q, tuan.tu, tuan.den);
  const { rows: viec } = await q.query<{ id: string; ten: string; trang_thai: string; dong_ngay: string | null; ten_cu: string[] | null }>(
    `SELECT c.id, c.ten, c.trang_thai, to_char(c.dong_luc + interval '7 hours', 'YYYY-MM-DD') AS dong_ngay,
            COALESCE((SELECT array_agg(DISTINCT n.du_lieu->>'ten') FROM docflow.nguon_cong_viec n WHERE n.cong_viec_id = c.id), '{}') AS ten_cu
       FROM docflow.cong_viec c`,
  );
  const theoMa = new Map(viec.map((v) => [v.id, v]));
  const gan = (ma: string | null | undefined): ViecGan | null => {
    const v = ma ? theoMa.get(ma) : undefined;
    return v ? { ma: v.id, ten: v.ten, trang_thai: v.trang_thai, dong_ngay: v.trang_thai === "dang_mo" ? null : v.dong_ngay } : null;
  };
  // Đã giao từ tab này
  const { rows: daGiao } = await q.query<{ khoa: string; cong_viec_id: string }>("SELECT khoa, cong_viec_id FROM docflow.kien_nghi_viec");
  const giaoTheoKhoa = new Map(daGiao.map((r) => [r.khoa, r.cong_viec_id]));
  // Dòng kiến nghị từng vào sổ cái (trước 29/09 kiến nghị còn sinh việc) — cùng nội dung
  const { rows: cu } = await q.query<{ ten: string; cong_viec_id: string }>(
    "SELECT du_lieu->>'ten' AS ten, cong_viec_id FROM docflow.nguon_cong_viec WHERE du_lieu->>'nguon_bang' = 'bang_kien_nghi' AND cong_viec_id IS NOT NULL",
  );
  const cuTheoKhoa = new Map(cu.map((r) => [chuanHoa(r.ten), r.cong_viec_id]));

  const tim = (chu: string, day = chu): { viec: ViecGan | null; co_the: DongCanQuyet["co_the"]; ung_vien?: { ma: string; ten: string }[] } => {
    const k = chuanHoa(chu);
    const chac = gan(giaoTheoKhoa.get(k)) ?? gan(cuTheoKhoa.get(k));
    if (chac) return { viec: chac, co_the: null };
    // Việc cũ sinh từ kiến nghị lấy VẾ ĐẦU câu làm tên ("Sản lượng tuần đạt 94,7% KH do mực nước thấp hơn dự báo" ← "… — hệ quả …")
    // → tên đó là phần đầu câu kiến nghị thì là cùng việc (đo 02/10: 7 dòng trước đây chỉ ra "có thể là")
    for (const [t, ma] of cuTheoKhoa) if (t.length >= 15 && k.startsWith(t) && gan(ma)) return { viec: gan(ma), co_the: null };
    // Mỗi việc: d = giống tên (cũ) · c = câu ngắn nằm trong câu dài (so với CẢ nội dung kiến nghị, đã mở chữ viết tắt)
    const diem: { v: (typeof viec)[number]; d: number; c: number }[] = [];
    for (const v of viec) {
      let d = 0;
      let c = 0;
      for (const t of [v.ten, ...(v.ten_cu ?? [])]) {
        if (!t) continue;
        d = Math.max(d, chuanHoa(t) === k ? 1 : doGiongTen(chu, t));
        c = Math.max(c, doChuaTrong(t, day));
      }
      if (d >= GUONG_GOI_Y || c >= 0.5) diem.push({ v, d, c });
    }
    diem.sort((a, b) => Math.max(b.c, b.d) - Math.max(a.c, a.d) || b.d - a.d);
    const tot = diem[0];
    // Chắc chắn: giống tên ≥ 0,9, hoặc câu ngắn nằm trong câu dài ≥ 80% và hơn hẳn việc thứ hai (≥ 0,15) — hai việc cùng khớp
    // ngang nhau thì để AI đọc
    const chuaDu = [...diem].sort((a, b) => b.c - a.c).filter((x) => x.c >= GUONG_CHUA);
    if (tot && tot.d >= GUONG_CHAC) return { viec: gan(tot.v.id), co_the: null };
    if (chuaDu.length && (chuaDu.length === 1 || chuaDu[0].c - chuaDu[1].c >= 0.15)) return { viec: gan(chuaDu[0].v.id), co_the: null };
    if (!tot) return { viec: null, co_the: null };
    // Còn lại: nhờ AI đọc như người (lib/bao-cao-tuan/can-quyet-ai.ts) — tối đa 4 ứng viên
    return { viec: null, co_the: { ma: tot.v.id, ten: tot.v.ten }, ung_vien: diem.slice(0, 4).map((x) => ({ ma: x.v.id, ten: x.v.ten })) };
  };

  const ra = new Map<string, DongCanQuyet>();
  const them = (d: Omit<DongCanQuyet, "don_vi" | "viec" | "co_the">, dv: DongCanQuyet["don_vi"][number], tuTim: () => ReturnType<typeof tim>) => {
    const co = ra.get(d.khoa);
    if (co) {
      if (!co.don_vi.some((x) => x.id === dv.id)) co.don_vi.push(dv);
      return;
    }
    ra.set(d.khoa, { ...d, don_vi: [dv], ...tuTim() });
  };

  for (const b of ban) {
    const dv = { id: b.don_vi, ten: b.ten_dv, tai_lieu_id: b.id };
    // Form 0: dòng quyết định — TGĐ đã quyết (đã giao) thì là "đã có việc"
    const qd = await dongQuyetDinh(q, b.id, b.phien_ban).catch(() => null);
    for (const d of qd?.dong ?? []) {
      const chu = d.dong.ten?.trim();
      if (!chu) continue;
      const han = (d.dong as { han_quyet_dinh?: string }).han_quyet_dinh;
      them(
        { khoa: chuanHoa(chu), loai: "quyet_dinh", noi_dung: chu, kien_nghi: han ? `Hạn quyết định ${han.split("-").reverse().join("/")}` : "", muc_do: "" },
        dv,
        () => (d.da_giao ? { viec: gan(d.da_giao), co_the: null } : tim(chu)),
      );
    }
    for (const r of await dongKienNghi(q, b)) {
      const noiDung = (r.noi_dung ?? "").trim();
      if (!coChu(noiDung)) continue;
      const dau = noiDung.split("\n")[0].trim();
      them(
        { khoa: chuanHoa(dau), loai: "kien_nghi", noi_dung: noiDung, kien_nghi: coChu(r.kien_nghi) ? r.kien_nghi.trim() : "", muc_do: coChu(r.muc_do) ? r.muc_do.trim() : "" },
        dv,
        () => tim(dau, noiDung),
      );
    }
  }
  // 🤖 Kết luận AI đã đọc (can-quyet-ai.ts): dòng luật code chưa chắc — cùng danh sách ứng viên thì dùng lại, không hỏi lại
  const ketLuan = await docKetLuanAi(q);
  for (const d of ra.values()) {
    if (d.viec || !d.ung_vien?.length) continue;
    const c = ketLuan.get(`${d.khoa}|${khoaUngVien(d)}`);
    if (!c) continue; // chưa đọc → còn "có thể là", API đưa AI đọc nền
    d.co_the = null;
    d.ung_vien = undefined;
    if (c.ma && gan(c.ma)) {
      d.viec = gan(c.ma);
      d.ai_ly_do = c.ly_do;
    }
  }
  // Thứ tự: chưa có việc → đang chạy → đã xong; trong nhóm giữ thứ tự đọc
  const hang = (d: DongCanQuyet) => (!d.viec ? 0 : d.viec.trang_thai === "dang_mo" ? 1 : 2);
  return [...ra.values()].sort((a, b) => hang(a) - hang(b));
}

/** Độ khó từ mức "vừa" trở lên mới đưa BLĐ đọc (thang 1 rất dễ · 2 dễ · 4 vừa · 8 khó · 13 rất khó) */
export const DIEM_BLD_DOC = 4;

/**
 * Lọc cho BLĐ đọc (Mr. Đại chốt 02/10: "mục này dành cho BLĐ đọc… việc dễ, rất dễ thành rác thông tin"):
 *  · bỏ dòng mà việc đã xong / đã đóng
 *  · dòng đã có việc đang chạy: bỏ khi AI đã chấm độ khó dưới "vừa"; chưa chấm thì giữ (không đủ căn cứ để ẩn)
 *  · dòng CHƯA có việc: giữ — chưa có độ khó, đó chính là chỗ BLĐ quyết có giao hay không
 *  · Điểm nóng (danh sách mã gửi lên): trả lại các mã độ khó dưới "vừa" để ẩn
 */
export async function locChoBld(q: Q, ds: DongCanQuyet[], nong: string[]): Promise<{ dong: DongCanQuyet[]; an_xong: number; an_de: number; nong_an: string[] }> {
  const { rows } = await q.query<{ cong_viec_id: string; diem: number }>("SELECT cong_viec_id, diem FROM docflow.do_kho_viec");
  const diem = new Map(rows.map((r) => [r.cong_viec_id, Number(r.diem)]));
  const de = (ma: string) => diem.has(ma) && (diem.get(ma) as number) < DIEM_BLD_DOC;
  let anXong = 0;
  let anDe = 0;
  const dong = ds.filter((d) => {
    if (!d.viec) return true;
    if (d.viec.trang_thai !== "dang_mo") return (anXong++, false);
    if (de(d.viec.ma)) return (anDe++, false);
    return true;
  });
  return { dong, an_xong: anXong, an_de: anDe, nong_an: nong.filter(de) };
}

/** Ghi việc vừa giao từ một dòng kiến nghị (Giao việc ở tab Cần ra quyết định) */
export async function ghiGiaoTuKienNghi(q: Q, khoa: string, congViecId: string, nguoi: string): Promise<void> {
  await q.query(
    `INSERT INTO docflow.kien_nghi_viec (khoa, cong_viec_id, nguoi) VALUES ($1, $2, $3)
     ON CONFLICT (khoa) DO UPDATE SET cong_viec_id = EXCLUDED.cong_viec_id, nguoi = EXCLUDED.nguoi, luc = now()`,
    [khoa, congViecId, nguoi],
  );
}
