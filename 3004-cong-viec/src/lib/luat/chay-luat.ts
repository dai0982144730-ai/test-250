// ============================================================
// luat/chay-luat.ts — CHẠY LUẬT CODE trên một báo cáo + CHẠY THỬ trên báo cáo cũ + CHẶN GỬI THEO LUẬT AI.
// Chủ: agent luat-loi. "Code giữ cửa, AI góp ý": luật code chạy ngay lúc kiểm tra; luật AI chạy nền (agent luat-ai),
// lúc GỬI mới đọc kết quả (kiemLuatAiKhiGui) — chỉ luật AI mức 'chan' mới chặn được.
// ============================================================
import { layQ, type Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { docBaoCao } from "@/lib/kiem-tra/doc-bao-cao";
import { napDanhBa, timTen } from "@/lib/kiem-tra/phan-giai";
import { bayGioVN } from "@/lib/phong/tuan";
import { LOAI_LUAT } from "./loai-luat";
import { batDauKiemAi, kiemLuatAi, ketQuaKiemAi } from "./kiem-ai";
import { apDungMau, dinhNghiaCacMau, luatApDung, type LuatDaDung } from "./kho-luat";
import type { DuLieuBaoCao, KetQuaChayThu, KetQuaLuatAi, LoiLuat, LuatKiemTra, LuatNhap, NguCanhKiem } from "./types";

const chayBangCode = (l: LuatKiemTra) => l.cach_kiem === "code" || l.cach_kiem === "ca_hai";
const chayBangAi = (l: LuatKiemTra) => l.cach_kiem === "ai" || l.cach_kiem === "ca_hai";

/** Chạy các luật code (loai khác 'he_thong', cach_kiem 'code'|'ca_hai') — thuần, không CSDL. */
export function chayLuatCode(luat: LuatKiemTra[], bc: DuLieuBaoCao, ctx: NguCanhKiem): LoiLuat[] {
  const ra: LoiLuat[] = [];
  for (const l of luat) {
    if (!l.bat || l.da_xoa || l.he_thong || !l.loai || l.loai === "he_thong" || !chayBangCode(l)) continue;
    if (!apDungMau(l, ctx.mau_ma)) continue;
    const gan = { luat: l.ma, luat_id: l.id, cach_kiem: l.cach_kiem, ten_luat: l.ten };
    const dang = LOAI_LUAT[l.loai];
    if (!dang) {
      ra.push({ ...gan, muc: "goi_y", thong_diep: `Luật "${l.ten}" chưa chạy được: không có dạng luật "${l.loai}"` });
      continue;
    }
    try {
      for (const x of dang.kiem(bc, l.tham_so ?? {}, ctx)) {
        ra.push({ ...x, ...gan, muc: l.muc, thong_diep: x.thong_diep });
      }
    } catch (e) {
      // Một luật hỏng không làm hỏng cả lần kiểm tra
      ra.push({ ...gan, muc: "goi_y", thong_diep: `Luật "${l.ten}" chưa chạy được: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  return ra;
}

/** Luật nhập (có thể chưa lưu) → luật đầy đủ để chạy. */
function thanhLuatChay(v: LuatNhap): LuatKiemTra {
  const bayGio = new Date().toISOString();
  return {
    id: v.id || "chay-thu",
    ma: v.ma || "chay-thu",
    ten: v.ten || "Luật chạy thử",
    cau_luat: v.cau_luat ?? "",
    mo_ta: v.mo_ta ?? null,
    he_thong: false,
    cach_kiem: v.cach_kiem ?? "code",
    loai: v.loai ?? null,
    tham_so: v.tham_so ?? {},
    huong_dan_ai: v.huong_dan_ai ?? null,
    ap_dung: v.ap_dung ?? "tat_ca",
    muc: v.muc ?? "canh_bao",
    khi_ai_loi: v.khi_ai_loi ?? "cho_gui",
    bat: true,
    nhom: v.nhom ?? null,
    thu_tu: v.thu_tu ?? 0,
    phien_ban: 0,
    tao_boi: null,
    tao_luc: bayGio,
    sua_boi: null,
    sua_luc: bayGio,
    da_xoa: false,
  };
}

/** Ngữ cảnh chạy luật code dùng chung (kiểm tra + chạy thử). */
export async function nguCanhKiem(q: Q, mauMa: string | null, ky?: NguCanhKiem["ky_bao_cao"]): Promise<NguCanhKiem> {
  const ch = await layCauHinh(q, "luat_kiem_tra");
  const danhBa = await napDanhBa(q);
  const dn = mauMa ? (await dinhNghiaCacMau(q)).find((m) => m.ma === mauMa) : null;
  return {
    mau_ma: mauMa,
    dinh_nghia_mau: dn ?? null,
    ky_bao_cao: ky ?? null,
    gia_tri_chua_dien: ch.gia_tri_chua_dien,
    phan_giai_ten: (ten: string) => timTen(ten, danhBa) !== null,
  };
}

/** Chạy thử MỘT luật (chưa lưu cũng được) trên các báo cáo đã có trong hệ thống. Luật AI: chỉ lấy mẫu tối đa gioi_han_ai tài liệu. */
export async function chayThuLuat(q: Q, luat: LuatNhap, tuy: { gioi_han?: number; gioi_han_ai?: number } = {}): Promise<KetQuaChayThu> {
  if (!luat || typeof luat !== "object") throw new LoiHttp(400, "Thiếu luật để chạy thử");
  const l = thanhLuatChay(luat);
  const gioiHan = Math.max(1, Math.min(Number(tuy.gioi_han) || 200, 1000));
  const gioiHanAi = Math.max(0, Math.min(Number(tuy.gioi_han_ai ?? 5), 20));
  const { rows } = await q.query<{ id: string; ten: string; mau_ma: string | null; phien_ban: number; ten_tep: string; ky_bao_cao: unknown; luc: string }>(
    `SELECT t.id, t.ten, t.mau_ma, p.phien_ban, p.ten_tep, t.ky_bao_cao, p.tai_len_luc::text AS luc
     FROM docflow.tai_lieu t JOIN docflow.phien_ban_tep p ON p.tai_lieu_id = t.id AND p.phien_ban = t.phien_ban_hien_tai
     ORDER BY t.tao_luc DESC, t.id LIMIT $1`,
    [gioiHan],
  );
  const kq: KetQuaChayThu = { so_tai_lieu: rows.length, so_dat: 0, so_khong_dat: 0, so_bo_qua: 0, mau: [] };
  const ctxGoc = await nguCanhKiem(q, null);
  const dinhNghia = new Map((await dinhNghiaCacMau(q)).map((m) => [m.ma, m]));
  let daGoiAi = 0;
  for (const r of rows) {
    if (!/\.(docx|docm|xlsx)$/i.test(r.ten_tep) || !apDungMau(l, r.mau_ma)) {
      kq.so_bo_qua++;
      continue;
    }
    let bc: DuLieuBaoCao & { van_ban: string; mau_ma: string | null };
    try {
      const { noi_dung } = await docPhienBan(q, r.id, Number(r.phien_ban), null); // chạy thử luật (có thể là luật AI): bản đã cắt
      bc = await docBaoCao(noi_dung);
    } catch {
      kq.so_bo_qua++;
      continue;
    }
    const mauMa = bc.mau_ma ?? r.mau_ma;
    if (!apDungMau(l, mauMa)) {
      kq.so_bo_qua++;
      continue;
    }
    const kyTho = (typeof r.ky_bao_cao === "string" ? JSON.parse(r.ky_bao_cao) : r.ky_bao_cao) as { tu?: string; den?: string } | null;
    const ctx: NguCanhKiem = {
      ...ctxGoc,
      mau_ma: mauMa,
      dinh_nghia_mau: mauMa ? (dinhNghia.get(mauMa) ?? null) : null,
      ky_bao_cao: { ...(kyTho ? { tu: kyTho.tu, den: kyTho.den } : {}), nop: bayGioVN(new Date(r.luc)).slice(0, 10) },
    };
    const loi: LoiLuat[] = [];
    let ketLuan = true;
    if (chayBangCode(l)) loi.push(...chayLuatCode([l], bc, ctx));
    if (chayBangAi(l)) {
      if (daGoiAi >= gioiHanAi) {
        // Hết suất AI: luật chỉ AI thì bỏ qua tài liệu này; luật cả hai thì chỉ tính phần code
        if (l.cach_kiem === "ai") {
          kq.so_bo_qua++;
          continue;
        }
      } else {
        daGoiAi++;
        try {
          const ai = await kiemLuatAi([l], bc, mauMa);
          for (const a of ai) {
            if (a.dat === false) loi.push({ luat: l.ma, luat_id: l.id, muc: l.muc, cach_kiem: "ai", ten_luat: l.ten, thong_diep: a.thong_diep, ...(a.vi_tri ? { vi_tri: a.vi_tri } : {}) });
            if (a.dat === null) ketLuan = false;
          }
        } catch {
          ketLuan = false;
        }
        if (!ketLuan && l.cach_kiem === "ai") {
          kq.so_bo_qua++;
          continue;
        }
      }
    }
    const dat = loi.length === 0;
    if (dat) kq.so_dat++;
    else kq.so_khong_dat++;
    kq.mau.push({ tai_lieu_id: r.id, ten: r.ten, mau_ma: mauMa, dat, loi });
  }
  return kq;
}

// ---------------- Chặn gửi theo luật AI ----------------

type KetQuaAiDayDu = Awaited<ReturnType<typeof ketQuaKiemAi>>;

const danhTen = (ds: LuatKiemTra[]) => ds.map((l) => `“${l.ten}”`).join(", ");

/** Khởi động kiểm AI nền SAU giao dịch hiện tại (không chờ; lỗi bỏ qua). */
function khoiDongAiNen(taiLieuId: string, phienBan: number): void {
  void (async () => {
    try {
      await batDauKiemAi(await layQ(), taiLieuId, phienBan);
    } catch {
      /* luat-ai chưa sẵn sàng / AI tắt: lần gửi sau đọc lại trạng thái */
    }
  })();
}

/**
 * Lúc GỬI (gửi, gửi lại, gửi mới, chuyển tiếp có kiểm lại): nếu có luật AI mức 'chan' áp dụng cho mẫu thì đọc kết quả
 * kiểm AI nền của phiên bản — đang kiểm → từ chối ("chờ ít giây rồi gửi lại"); xong mà có luật chặn không đạt → chặn;
 * AI lỗi / không kết luận → theo khi_ai_loi của từng luật. Ghi bằng chứng (luật + phiên bản đã dùng) vào
 * phien_ban_tep.ket_qua_kiem_tra.luat_khi_gui. `ban_moi`: phiên bản vừa tạo trong giao dịch này (AI chưa thể kiểm).
 */
export async function kiemLuatAiKhiGui(
  q: Q,
  v: { tai_lieu_id: string; phien_ban: number; mau_ma: string | null; ten?: string; luat_da_dung?: LuatDaDung[]; ban_moi?: boolean },
): Promise<void> {
  if (!v.mau_ma) return; // tài liệu không theo mẫu: không có luật AI
  const luatChan = (await luatApDung(q, v.mau_ma)).filter((l) => !l.he_thong && chayBangAi(l) && l.muc === "chan");
  const banChung = async (luatAi: object[]) => {
    await q.query(
      `UPDATE docflow.phien_ban_tep SET ket_qua_kiem_tra = COALESCE(ket_qua_kiem_tra, '{}'::jsonb) || jsonb_build_object('luat_khi_gui', $3::jsonb)
       WHERE tai_lieu_id = $1 AND phien_ban = $2`,
      [v.tai_lieu_id, v.phien_ban, JSON.stringify({ luc: new Date().toISOString(), luat_da_dung: v.luat_da_dung ?? [], luat_ai: luatAi })],
    );
  };
  if (luatChan.length === 0) {
    await banChung([]);
    return;
  }
  const ten = v.ten ? `"${v.ten}": ` : "";
  if (v.ban_moi) {
    throw new LoiHttp(409, `${ten}AI cần kiểm luật ${danhTen(luatChan)} trên bản này trước khi gửi: tải bản sửa lên (Tải lại bản đã sửa), chờ ít giây rồi gửi lại`);
  }
  let r: KetQuaAiDayDu;
  try {
    r = await ketQuaKiemAi(q, v.tai_lieu_id, v.phien_ban);
  } catch (e) {
    r = { trang_thai: "loi", ket_qua: [] };
    void e;
  }
  if (r.trang_thai === "dang_kiem") {
    // Lần hỏi này có thể vừa khởi động AI TRONG giao dịch gửi (sẽ bị hoàn tác khi từ chối) → khởi động lại ngoài giao dịch
    khoiDongAiNen(v.tai_lieu_id, v.phien_ban);
    throw new LoiHttp(409, `${ten}AI đang kiểm luật ${danhTen(luatChan)}, chờ ít giây rồi gửi lại`);
  }
  // 'khong_co' (AI không nhận luật nào) / 'loi': coi như AI không kết luận → theo khi_ai_loi từng luật
  const khongDat: string[] = [];
  const aiLoiChan: LuatKiemTra[] = [];
  const bang: { id: string; ma: string; phien_ban: number; dat: boolean | null; thong_diep: string }[] = [];
  for (const l of luatChan) {
    const kqs: KetQuaLuatAi[] = (r.ket_qua ?? []).filter((x) => x.luat_id === l.id);
    const sai = kqs.filter((x) => x.dat === false);
    const ketLuan = kqs.length > 0 && kqs.every((x) => x.dat !== null);
    bang.push({
      id: l.id,
      ma: l.ma,
      phien_ban: l.phien_ban,
      dat: sai.length > 0 ? false : ketLuan ? true : null,
      thong_diep: sai.map((x) => x.thong_diep).join("; ") || (ketLuan ? "đạt" : r.trang_thai === "loi" ? "AI lỗi" : "AI không kết luận được"),
    });
    if (sai.length > 0) khongDat.push(`${l.ten}: ${sai.map((x) => x.thong_diep).join("; ")}`);
    else if (!ketLuan && l.khi_ai_loi === "chan") aiLoiChan.push(l);
  }
  if (khongDat.length > 0) {
    throw new LoiHttp(400, `${ten}chưa đạt luật AI: ${khongDat.slice(0, 3).join(" · ")}${khongDat.length > 3 ? ` · và ${khongDat.length - 3} luật khác` : ""}`);
  }
  if (aiLoiChan.length > 0) {
    throw new LoiHttp(409, `${ten}AI không kiểm được luật ${danhTen(aiLoiChan)} (luật đặt chặn gửi khi AI lỗi) — thử gửi lại sau`);
  }
  await banChung(bang);
}
