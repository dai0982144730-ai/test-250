// ============================================================
// kiem-tra/gop-y-luu.ts — CHẠY NỀN + LƯU AI GÓP Ý theo (tài liệu, phiên bản, sha256). CHỈ SERVER.
// Tải lên KHÔNG chờ AI: kiểm tra luật bắt buộc trả về ngay; màn Soạn và gửi hỏi /api/kiem-tra/gop-y,
// lần hỏi đầu khởi động góp ý nền (thời gian chờ tối đa THOI_GIAN_CHO_GOP_Y_MS), các lần sau đọc trạng thái.
// Chạy nền ở luat/ai/luot.ts: có luật AI áp dụng thì GỘP góp ý + luật AI trong một lượt AI.
// Cùng một file (cùng sha256) đã góp ý xong → dùng lại, không gọi AI lần nữa.
// Góp ý luôn mức goi_y — không bao giờ đụng tới kết quả kiểm tra (dat).
// ============================================================
import type { Q } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { getAIConfig } from "@/lib/ai/providers";
import { khoiDongLuotAi, phanLuatDiKem, viecGopY } from "@/lib/luat/ai/luot";
import type { GopYAi } from "./gop-y-ai";

export type TrangThaiGopY = "dang_gop_y" | "xong" | "loi" | "tat";

export interface KetQuaGopY {
  tai_lieu_id: string;
  phien_ban: number | null;
  trang_thai: TrangThaiGopY;
  gop_y: GopYAi[];
  loi?: string | null; // trang_thai = loi
  ly_do?: string; // trang_thai = tat
  model?: string | null;
  bat_dau_luc?: string | null;
  xong_luc?: string | null;
}

interface HangGopY {
  tai_lieu_id: string;
  phien_ban: number;
  sha256: string;
  trang_thai: Exclude<TrangThaiGopY, "tat">;
  gop_y: GopYAi[] | string;
  loi: string | null;
  model: string | null;
  bat_dau_luc: string | Date;
  xong_luc: string | Date | null;
}

// Việc góp ý đang chạy trong tiến trình này, theo sha256 — dùng chung với lượt AI gộp (luat/ai/luot.ts)
const dangChay = () => viecGopY();

/** CHỈ DÙNG TRONG TEST / SCRIPT: chờ mọi việc góp ý nền chạy xong. */
export async function choGopYXong(): Promise<void> {
  while (dangChay().size) await Promise.all(Array.from(dangChay().values()));
}

const iso = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString() : null);

function thanhKetQua(r: HangGopY): KetQuaGopY {
  const gy = typeof r.gop_y === "string" ? (JSON.parse(r.gop_y) as GopYAi[]) : (r.gop_y ?? []);
  return {
    tai_lieu_id: r.tai_lieu_id,
    phien_ban: Number(r.phien_ban),
    trang_thai: r.trang_thai,
    gop_y: gy,
    loi: r.loi,
    model: r.model,
    bat_dau_luc: iso(r.bat_dau_luc),
    xong_luc: iso(r.xong_luc),
  };
}

/** Lý do không góp ý (cấu hình tắt / luật tắt / không áp dụng mẫu / kết nối AI tắt). null = được góp ý. */
export async function lyDoTatGopY(q: Q, mauMa: string | null): Promise<string | null> {
  const chAi = await layCauHinh(q, "ai");
  if (!chAi.bat_gop_y) return "AI góp ý đang tắt trong Cài đặt";
  const chLuat = await layCauHinh(q, "luat_kiem_tra");
  const l = chLuat.luat.find((x) => x.ma === "noi_dung_ai");
  if (!l || !l.bat) return "Luật “Nội dung (AI góp ý)” đang tắt";
  if (!mauMa) return "Tài liệu không theo mẫu: không góp ý nội dung";
  if (l.ap_dung !== "tat_ca" && !l.ap_dung.includes(mauMa)) return "Luật AI góp ý không áp dụng cho mẫu này";
  if (getAIConfig().mode === "off") return "Kết nối AI đang tắt";
  return null;
}

/**
 * Trạng thái + danh sách góp ý AI của một phiên bản tài liệu (mặc định bản hiện tại).
 * Chưa có → khởi động nền, trả "dang_gop_y". Lỗi thì giữ "loi" (không tự gọi lại tốn phí) — `thu_lai` để chạy lại.
 */
export async function layGopY(
  q: Q,
  taiLieuId: string,
  phienBan?: number | null,
  tuyChon: { thu_lai?: boolean; thoiGianChoMs?: number } = {},
): Promise<KetQuaGopY> {
  const { rows: pbs } = await q.query<{ phien_ban: number; sha256: string; ten_tep: string; mau_ma: string | null }>(
    `SELECT p.phien_ban, p.sha256, p.ten_tep, t.mau_ma FROM docflow.phien_ban_tep p JOIN docflow.tai_lieu t ON t.id = p.tai_lieu_id
     WHERE p.tai_lieu_id = $1 AND p.phien_ban = COALESCE($2::int, t.phien_ban_hien_tai)`,
    [taiLieuId, phienBan ?? null],
  );
  const pb = pbs[0];
  if (!pb) throw new LoiHttp(404, phienBan ? `Không có bản ${phienBan} của tài liệu này` : "Không tìm thấy tài liệu");
  const soBan = Number(pb.phien_ban);
  const tat = (ly_do: string): KetQuaGopY => ({ tai_lieu_id: taiLieuId, phien_ban: soBan, trang_thai: "tat", gop_y: [], ly_do });
  if (!/\.(docx|docm|xlsx)$/i.test(pb.ten_tep)) return tat("Không phải báo cáo Word / Excel: không góp ý nội dung");
  const lyDo = await lyDoTatGopY(q, pb.mau_ma);
  if (lyDo) return tat(lyDo);

  const { rows } = await q.query<HangGopY>("SELECT * FROM docflow.gop_y_ai WHERE tai_lieu_id = $1 AND phien_ban = $2", [taiLieuId, soBan]);
  const cu = rows[0];
  if (cu && cu.sha256 === pb.sha256) {
    if (cu.trang_thai === "xong") return thanhKetQua(cu);
    if (cu.trang_thai === "loi" && !tuyChon.thu_lai) return thanhKetQua(cu);
    if (cu.trang_thai === "dang_gop_y" && dangChay().has(pb.sha256)) return thanhKetQua(cu);
    // lỗi + thử lại, hoặc đang chờ mà việc nền đã mất (máy chủ khởi động lại) → chạy lại bên dưới
  }

  // Cùng file đã góp ý xong ở tài liệu / phiên bản khác → dùng lại
  const { rows: daCo } = await q.query<HangGopY>(
    "SELECT * FROM docflow.gop_y_ai WHERE sha256 = $1 AND trang_thai = 'xong' ORDER BY xong_luc DESC LIMIT 1",
    [pb.sha256],
  );
  const giu = daCo[0];
  const { rows: moi } = await q.query<HangGopY>(
    `INSERT INTO docflow.gop_y_ai (tai_lieu_id, phien_ban, sha256, trang_thai, gop_y, loi, model, bat_dau_luc, xong_luc)
     VALUES ($1, $2, $3, $4, $5::jsonb, NULL, $6, now(), $7)
     ON CONFLICT (tai_lieu_id, phien_ban) DO UPDATE SET sha256 = EXCLUDED.sha256, trang_thai = EXCLUDED.trang_thai,
       gop_y = EXCLUDED.gop_y, loi = NULL, model = EXCLUDED.model, bat_dau_luc = now(), xong_luc = EXCLUDED.xong_luc
     RETURNING *`,
    [
      taiLieuId,
      soBan,
      pb.sha256,
      giu ? "xong" : "dang_gop_y",
      JSON.stringify(giu ? thanhKetQua(giu).gop_y : []),
      giu?.model ?? null,
      giu ? (iso(giu.xong_luc) ?? new Date().toISOString()) : null,
    ],
  );
  if (!giu) {
    // Một lượt AI cho mỗi file: luật AI áp dụng (nếu có, chưa kiểm) chạy GỘP trong cùng lượt góp ý
    const luat = await phanLuatDiKem(q, pb.sha256, pb.mau_ma);
    khoiDongLuotAi({ sha256: pb.sha256, taiLieuId, phienBan: soBan, gopY: true, luat, thoiGianChoMs: tuyChon.thoiGianChoMs });
  }
  return thanhKetQua(moi[0]);
}
