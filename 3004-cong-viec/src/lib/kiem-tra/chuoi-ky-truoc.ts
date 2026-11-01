// ============================================================
// kiem-tra/chuoi-ky-truoc.ts — CHUỖI THEO DÕI VIỆC lúc nộp báo cáo (CHỈ SERVER — đọc file kỳ trước trong kho).
// Mr. Đại chốt 01/10 + 02/10/2026: báo cáo kỳ N phải ghi ĐỦ mọi việc trong kế hoạch của báo cáo kỳ N−1 kèm tình hình
// (Đã xong / Đang làm / Dừng: lý do); chỉ kỳ N+1 mới được bỏ việc đã xong / đã dừng. Nộp tay mà thiếu → CHẶN.
// Đo 01/10: báo cáo tuần 40 SCI PMC nộp tay mất 2 việc của tuần 39, máy không báo gì → chuỗi theo dõi đứt.
//   · kỳ trước = báo cáo CÙNG ĐƠN VỊ, CÙNG LOẠI KỲ (tuần/tháng) đã gửi gần nhất, kỳ kết thúc trước kỳ này bắt đầu
//   · việc phải có mặt = dòng có tên ở bảng việc chính kỳ trước, tình trạng không phải "Đã xong" / "Dừng…"
//   · "có mặt" = cùng mã việc (cột Mã việc / cùng việc trong sổ cái) hoặc tên giống (≥ 0,8)
// ============================================================
import type { Q } from "@/lib/db";
import type { MauWord } from "@/lib/types";
import { docBaoCao } from "./doc-bao-cao";
import { anhXaBang, chuanHoaDongTheoNghia } from "./cau-truc";
import { laDaXong } from "./chuan-hoa";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { chuanHoa, doGiongTen } from "@/lib/so-cai/tien-ich";

/** "Dừng: …", "không làm nữa", "huỷ" — việc kỳ trước đã báo dừng thì kỳ này được bỏ (cùng luật /lam-bao-cao) */
export const laDung = (s: string) => /^\s*(dừng|không làm nữa|hủy|huỷ)/i.test(s ?? "");

/** Bảng việc chính của mẫu (Form 0 có bang_quyet_dinh, Form 5 có bang_tien_do_tk đứng trước → lấy bang_cong_viec) */
export function tagBangViecChinh(m: MauWord): string | undefined {
  const ds = m.dinh_nghia.bang_cong_viec ?? [];
  return (ds.find((x) => x.tag === "bang_cong_viec") ?? ds[0])?.tag;
}

export type ViecThieu = { ten: string; ma: string | null };
export type KetQuaChuoi = { ky_truoc: string; tai_lieu_id: string; thieu: ViecThieu[] };

/**
 * Việc của báo cáo kỳ trước chưa được báo tình hình trong báo cáo này. null = không có báo cáo kỳ trước để so
 * (đơn vị nộp lần đầu / kỳ trước không đọc được) — khi đó không chặn.
 */
export async function viecKyTruocBiThieu(
  q: Q,
  layMau: (ma: string) => Promise<MauWord | null>,
  v: {
    don_vi_id: string;
    ky: { loai?: string; tu?: string };
    /** dòng việc của báo cáo đang nộp: tên + mã việc (cột Mã việc hoặc việc sổ cái máy khớp được) */
    viec: { ten: string; ma: string[] }[];
    /** tài liệu đang nộp (gửi lại bản mới) — không so với chính nó */
    tai_lieu_id?: string | null;
  },
): Promise<KetQuaChuoi | null> {
  if (!v.ky.tu) return null;
  const { rows } = await q.query<{ id: string; mau_ma: string; ky_bao_cao: { loai?: string; so?: number; nam?: number }; khoa_luu: string; phien_ban: number }>(
    `SELECT t.id, t.mau_ma, t.ky_bao_cao, p.khoa_luu, p.phien_ban
       FROM docflow.buoc_hanh_trinh b
       JOIN docflow.tai_lieu t ON t.id = b.tai_lieu_id
       JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = b.tai_lieu_id AND p.phien_ban = b.phien_ban
      WHERE b.loai IN ('gui','gui_moi','gui_lai') AND t.don_vi_lap = $1
        AND t.trang_thai IN ('da_gui','hoan_thanh') AND t.mau_ma IS NOT NULL AND t.ky_bao_cao IS NOT NULL
        AND (t.ky_bao_cao->>'den') < $2 AND COALESCE(t.ky_bao_cao->>'loai', '') = $3 AND t.id <> $4
      ORDER BY (t.ky_bao_cao->>'den') DESC, b.luc DESC LIMIT 1`,
    [v.don_vi_id, v.ky.tu, v.ky.loai ?? "", v.tai_lieu_id ?? ""],
  );
  const tr = rows[0];
  if (!tr) return null;
  const mau = await layMau(tr.mau_ma);
  const tag = mau ? tagBangViecChinh(mau) : "bang_cong_viec";
  if (!tag) return null;
  let bang: Record<string, string>[];
  try {
    bang = (await docBaoCao((await docPhienBan(q, tr.id, tr.phien_ban, null)).noi_dung)).bang[tag] ?? []; // chỉ bảng việc — bản đã cắt đủ dùng
  } catch {
    return null; // file kỳ trước không đọc được: không chặn oan
  }
  const ax = mau ? anhXaBang(mau.dinh_nghia, tag) : null;
  // Việc sổ cái sinh từ từng dòng của bản kỳ trước (để khớp theo mã khi người nộp đổi tên việc). CHỈ dòng của bảng việc chính:
  // việc "AI tìm ngoài bảng" cũng đánh số dòng 1, 2, 3… — trước 02/10 dòng 3 của nó đè dòng 3 bảng việc (test 02/10: báo thiếu
  // "CV-2026-0024 Thi công móng trụ T5–T8", sai mã — CV-0024 là việc GPMB đường thi công)
  const { rows: ng } = await q.query<{ dong_so: number; cong_viec_id: string }>(
    `SELECT dong_so, cong_viec_id FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND phien_ban = $2 AND dong_so IS NOT NULL
        AND du_lieu->>'nguon_bang' = $3 AND COALESCE(du_lieu->>'y_so', '1') = '1'`,
    [tr.id, tr.phien_ban, tag],
  );
  const maCuaDong = new Map(ng.map((r) => [Number(r.dong_so), r.cong_viec_id]));
  const thieu: ViecThieu[] = [];
  bang.forEach((row, i) => {
    const r = ax ? chuanHoaDongTheoNghia(row, ax) : row;
    const ten = (r.ten ?? "").split("\n")[0].trim();
    if (!ten || /^\.+$/.test(ten)) return;
    const tt = (r.tinh_trang ?? r.da_xong ?? "").trim();
    if (laDaXong(tt) || laDung(tt)) return; // kỳ trước đã báo xong / dừng → kỳ này được bỏ
    const ma = (r.ma_viec ?? "").trim().toUpperCase() || maCuaDong.get(i + 1) || null;
    const k = chuanHoa(ten);
    const co = v.viec.some((x) => (ma && x.ma.includes(ma)) || chuanHoa(x.ten) === k || doGiongTen(x.ten, ten) >= 0.8);
    if (!co) thieu.push({ ten, ma });
  });
  const k = tr.ky_bao_cao;
  return { ky_truoc: `${k.loai === "thang" ? "tháng" : "tuần"} ${k.so ?? "?"}/${k.nam ?? "?"}`, tai_lieu_id: tr.id, thieu };
}
