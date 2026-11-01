// ============================================================
// so-cai/ai-doc-bao-cao.ts — CHẠY "AI ĐỌC BÁO CÁO" cho một bản tài liệu và lưu kết quả (docflow.ai_doc_bao_cao);
// dựng dòng việc sổ cái từ các "việc ngoài bảng" người gửi đã tích chọn (nguon_bang = "ai_ngoai_bang").
// AI tự chạy sau khi tải lên (giao diện gọi); lỗi / chưa kết nối AI thì lưu lỗi, không chặn gửi.
// ============================================================
import type { Q } from "@/lib/db";
import type { DongCongViec, PhuTrach } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { docBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { thuNhanMauGoc } from "@/lib/kiem-tra/nhan-mau-goc";
import { chuanHoaTieuDe, docNgay, ngayVN } from "@/lib/kiem-tra/chuan-hoa";
import { napDanhBa, phanGiaiPhuTrach } from "@/lib/kiem-tra/phan-giai";
import { laLanNapDau, ungVienTrung } from "./dich-vu";
import { raSoatViecBangAi, type ChayAi, type DongDaGop, type KetQuaAiDocBaoCao, type ViecMoSoCai } from "./ai-ra-viec";

/** Bảng "nguồn" của việc AI tìm thấy ngoài các bảng việc. */
export const BANG_AI = "ai_ngoai_bang";

export interface KetQuaAiLuu {
  ket_qua: KetQuaAiDocBaoCao | null;
  loi: string | null;
  luc: string;
}

export async function layKetQuaAi(q: Q, taiLieuId: string, phienBan: number): Promise<KetQuaAiLuu | null> {
  const { rows } = await q.query<{ ket_qua: KetQuaAiDocBaoCao | string | null; loi: string | null; luc: string }>(
    "SELECT ket_qua, loi, luc::text FROM docflow.ai_doc_bao_cao WHERE tai_lieu_id = $1 AND phien_ban = $2",
    [taiLieuId, phienBan],
  );
  const r = rows[0];
  if (!r) return null;
  return { ket_qua: typeof r.ket_qua === "string" ? (JSON.parse(r.ket_qua) as KetQuaAiDocBaoCao) : r.ket_qua, loi: r.loi, luc: new Date(r.luc).toISOString() };
}

/** Đọc báo cáo bằng AI (bản đã lưu), lưu kết quả hoặc lỗi. */
export async function docBaoCaoBangAi(q: Q, taiLieuId: string, phienBan: number, chay: ChayAi): Promise<KetQuaAiLuu> {
  // AI bóc việc chỉ nhận bản đã cắt chương mật (Q5)
  const { thong_tin, noi_dung } = await docPhienBan(q, taiLieuId, phienBan, null);
  const kqLuu = thong_tin.ket_qua_kiem_tra;
  const congViec = (kqLuu?.cong_viec ?? []) as DongCongViec[];
  let nd = await docBaoCao(noi_dung);
  if (!nd.mau_ma) {
    const goc = await thuNhanMauGoc(noi_dung, thong_tin.ten_tep, nd);
    if (goc) nd = goc.noi_dung;
  }
  const ky = kqLuu?.ky_bao_cao;
  const nam = ky?.nam ?? (ky?.den ? Number(ky.den.slice(0, 4)) : new Date().getFullYear());
  const ngayLap = kqLuu?.ngay_nop ?? docNgay(kqLuu?.o_nhap?.ngay_lap ?? "", nam).iso ?? ky?.den;
  // Việc đang mở + việc đã xong ≤ 120 ngày (02/10: AI chỉ thấy việc đang mở nên không biết dòng "đã xong" đã có việc đóng rồi)
  const { rows: mo } = await q.query<ViecMoSoCai>(
    `SELECT id, ten, du_an, CASE WHEN trang_thai = 'dang_mo' THEN NULL ELSE ((COALESCE(dong_luc, tao_luc) + interval '7 hours')::date)::text END AS xong_ngay
       FROM docflow.cong_viec WHERE trang_thai = 'dang_mo' OR COALESCE(dong_luc, tao_luc) > now() - interval '120 days'
      ORDER BY (trang_thai = 'dang_mo') DESC, id DESC LIMIT 400`,
  );
  const ungVien = await ungVienTrung(q, congViec);
  // Lần nạp đầu của đơn vị lập + mẫu (18/10/2026): dòng đã xong sẽ vào sổ ở trạng thái đã xong — AI phải biết để không báo "sai"
  const tl = (await q.query<{ don_vi_lap: string | null; mau_ma: string | null; nguoi_tao: string }>("SELECT don_vi_lap, mau_ma, nguoi_tao FROM docflow.tai_lieu WHERE id = $1", [taiLieuId])).rows[0];
  const lanDau = tl
    ? await laLanNapDau(q, { tai_lieu_id: taiLieuId, phien_ban: phienBan, mau_ma: kqLuu?.mau_ma ?? tl.mau_ma, don_vi_id: tl.don_vi_lap, nguoi_gui: tl.nguoi_tao }, false)
    : false;
  // Đợt E: chương mẫu khai "sinh việc — văn xuôi" (cau_truc) → đánh dấu để AI đọc trước và liệt kê đủ việc trong đó
  const ct = kqLuu?.mau_ma
    ? (await q.query<{ dinh_nghia: { cau_truc?: { chuong?: { tieu_de: string; nghia: string }[] } } }>("SELECT dinh_nghia FROM docflow.mau_word WHERE ma = $1", [kqLuu.mau_ma])).rows[0]
        ?.dinh_nghia?.cau_truc
    : undefined;
  const vanXuoi = new Set((ct?.chuong ?? []).filter((c) => c.nghia === "sinh_viec_van_xuoi").map((c) => chuanHoaTieuDe(c.tieu_de)));
  const muc = (nd.muc ?? []).map((m) => (vanXuoi.has(chuanHoaTieuDe(m.tieu_de)) ? { ...m, van_xuoi: true } : m));
  // Dòng quy tắc đã gộp là "cùng việc" (thông điệp lúc kiểm tra) → AI soát lại
  const daGop: DongDaGop[] = [];
  for (const l of kqLuu?.loi ?? []) {
    const m = /\("(.*)"\): cùng việc "(.*)" đã có trong báo cáo/.exec(l.thong_diep);
    const bang = l.vi_tri?.bang;
    const dong = l.vi_tri?.dong;
    if (!m || !bang || !dong) continue;
    const row = nd.bang[bang]?.[dong - 1] ?? {};
    const chu = Object.values(row).map((x) => (x ?? "").trim()).filter(Boolean).join(" — ") || m[1];
    daGop.push({ bang, dong, ten: m[1], chu, voi: m[2] });
  }
  let ket_qua: KetQuaAiDocBaoCao | null = null;
  let loi: string | null = null;
  try {
    ket_qua = await raSoatViecBangAi(congViec, mo, chay, { muc, ngay_lap: ngayLap, nam, van_ban: nd.van_ban, da_gop: daGop, ung_vien: ungVien, lan_nap_dau: lanDau });
  } catch (e) {
    loi = e instanceof Error ? e.message : String(e);
  }
  const { rows } = await q.query<{ luc: string }>(
    `INSERT INTO docflow.ai_doc_bao_cao (tai_lieu_id, phien_ban, ket_qua, loi, luc) VALUES ($1,$2,$3,$4, now())
     ON CONFLICT (tai_lieu_id, phien_ban) DO UPDATE SET ket_qua = EXCLUDED.ket_qua, loi = EXCLUDED.loi, luc = now()
     RETURNING luc::text`,
    [taiLieuId, phienBan, ket_qua ? JSON.stringify(ket_qua) : null, loi],
  );
  return { ket_qua, loi, luc: new Date(rows[0].luc).toISOString() };
}

/** Việc ngoài bảng người gửi đã chọn đưa vào sổ cái (có thể đã sửa tên / người làm / hạn). */
export interface ThemViecAi {
  ten: string;
  nguoi_lam?: string | null;
  /** yyyy-mm-dd hoặc dd/mm/yyyy */
  han?: string | null;
  trich?: string;
  du_an?: string | null;
  /** gộp vào việc đang mở (mã việc) */
  gop?: string | null;
}

/**
 * Dòng việc sổ cái từ việc AI tìm thấy ngoài bảng. Người làm: phân giải từ chữ, không nhận ra thì đơn vị lập.
 * Hạn bắt buộc (như dòng bảng) trừ khi cài đặt cho việc không ngày luôn mở. dongBatDau: số dòng AI đã có của bản này.
 */
export async function dongViecTuAi(
  q: Q,
  them: ThemViecAi[],
  ctx: { don_vi_lap: string | null; ten_don_vi_lap: string; ngay_lap?: string; nam: number; du_an?: string | null; dongBatDau?: number },
): Promise<DongCongViec[]> {
  if (!them.length) return [];
  const danhBa = await napDanhBa(q);
  const choKhongNgay = (await layCauHinh(q, "quy_tac_de")).viec_khong_ngay_luon_mo;
  return them.map((v, j) => {
    const ten = String(v.ten ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!ten) throw new LoiHttp(400, `Việc AI tìm thấy thứ ${j + 1}: chưa có tên việc`);
    const han = v.han ? docNgay(String(v.han), ctx.nam) : null;
    if (han?.loi) throw new LoiHttp(400, `"${ten}": hạn "${v.han}" ${han.loi}`);
    if (!han?.iso && !choKhongNgay) throw new LoiHttp(400, `"${ten}" (việc AI tìm thấy ngoài bảng): chưa có hạn — ghi hạn trước khi gửi`);
    // Ngày bắt đầu = ngày lập báo cáo: hạn trước ngày đó = việc đã quá hạn khi báo (Mr. Đại bắt 29/09) → sửa hạn trước khi gửi
    if (han?.iso && ctx.ngay_lap && han.iso < ctx.ngay_lap)
      throw new LoiHttp(400, `"${ten}" (việc AI tìm thấy ngoài bảng): hạn ${ngayVN(han.iso)} đã qua trước ngày nộp báo cáo ${ngayVN(ctx.ngay_lap)} — ghi hạn mới trước khi gửi`);
    let phuTrach: PhuTrach[] = v.nguoi_lam ? phanGiaiPhuTrach(v.nguoi_lam, danhBa, ten).phu_trach : [];
    if (!phuTrach.length && ctx.don_vi_lap) phuTrach = [{ loai: "don_vi", id: ctx.don_vi_lap, ten: ctx.ten_don_vi_lap, noi_dung: ten }];
    return {
      ten,
      ...(v.du_an || ctx.du_an ? { du_an: (v.du_an || ctx.du_an) as string } : {}),
      phu_trach: phuTrach,
      ...(ctx.ngay_lap ? { bat_dau: ctx.ngay_lap, bat_dau_kieu: "ngay_bao_cao" as const } : {}),
      ...(han?.iso ? { ket_thuc: han.iso } : {}),
      ...(v.trich ? { ket_qua_can_co: `AI tìm thấy ngoài bảng: “${String(v.trich).slice(0, 400)}”` } : {}),
      nguon_bang: BANG_AI,
      dong_so: (ctx.dongBatDau ?? 0) + j + 1,
    };
  });
}

/** Số dòng việc AI đã vào sổ của một bản tài liệu (để đánh số dòng tiếp theo). */
export async function soDongAiDaCo(q: Q, taiLieuId: string, phienBan: number): Promise<number> {
  const { rows } = await q.query<{ n: number }>(
    `SELECT COALESCE(max(dong_so), 0)::int AS n FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND phien_ban = $2 AND du_lieu->>'nguon_bang' = $3`,
    [taiLieuId, phienBan, BANG_AI],
  );
  return rows[0]?.n ?? 0;
}

/** Ghi nhận việc AI tìm thấy đã được người xem quyết "không phải việc" (theo câu gốc) — không còn tính là chờ duyệt. */
export async function boQuaViecAi(q: Q, taiLieuId: string, phienBan: number, trich: string[]): Promise<void> {
  const ds = trich.map((t) => String(t ?? "").slice(0, 600)).filter(Boolean);
  if (!ds.length) return;
  await q.query(
    `UPDATE docflow.ai_doc_bao_cao SET bo_qua = (SELECT COALESCE(jsonb_agg(DISTINCT x), '[]'::jsonb) FROM jsonb_array_elements(bo_qua || $3::jsonb) x)
      WHERE tai_lieu_id = $1 AND phien_ban = $2`,
    [taiLieuId, phienBan, JSON.stringify(ds)],
  );
}

/** Câu gốc của các việc AI đã bị bỏ qua ở một bản. */
export async function daBoQuaAi(q: Q, taiLieuId: string, phienBan: number): Promise<Set<string>> {
  const { rows } = await q.query<{ bo_qua: string[] | string }>("SELECT bo_qua FROM docflow.ai_doc_bao_cao WHERE tai_lieu_id = $1 AND phien_ban = $2", [taiLieuId, phienBan]);
  const v = rows[0]?.bo_qua ?? [];
  return new Set(typeof v === "string" ? (JSON.parse(v) as string[]) : v);
}
