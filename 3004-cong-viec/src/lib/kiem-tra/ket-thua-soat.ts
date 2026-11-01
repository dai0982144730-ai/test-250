// ============================================================
// kiem-tra/ket-thua-soat.ts — BƯỚC 3 "SOÁT NỘI DUNG": GHI ĐỀ XUẤT ĐÃ DUYỆT VÀO FILE MÀ KHÔNG SOÁT LẠI
// (Mr. Đại chốt 29/09/2026: gom các dòng Đồng ý, ghi file MỘT lần thành bản mới; AI không soát lại bản đó để khỏi
// vòng lặp soát → sửa → soát). Kết quả góp ý / luật AI của bản cũ được CHÉP sang bản mới: dòng đã ghi vào file
// đánh dấu da_sua (luật coi như đạt), dòng bỏ qua giữ nguyên. Hàng đã có của bản mới (nếu có) bị ghi đè. CHỈ SERVER.
// ============================================================
import type { Q } from "@/lib/db";
import type { GopYAi } from "./gop-y-ai";
import type { KetQuaLuatAi } from "@/lib/luat/types";

export interface DaSuaBuoc3 {
  /** Thông điệp các góp ý AI đã ghi đề xuất vào file */
  gop_y: string[];
  /** Mã các luật AI đã ghi đề xuất vào file */
  luat: string[];
}

const docJson = <T>(v: unknown): T[] => (typeof v === "string" ? (JSON.parse(v) as T[]) : ((v as T[] | null) ?? []));

export async function ketThuaSoat(q: Q, taiLieuId: string, tuBan: number, denBan: number, daSua: DaSuaBuoc3): Promise<void> {
  const { rows: pb } = await q.query<{ sha256: string }>("SELECT sha256 FROM docflow.phien_ban_tep WHERE tai_lieu_id = $1 AND phien_ban = $2", [taiLieuId, denBan]);
  const sha = pb[0]?.sha256;
  if (!sha) return;
  const gySua = new Set(daSua.gop_y);
  const luatSua = new Set(daSua.luat);

  const { rows: gy } = await q.query<{ gop_y: unknown; model: string | null }>(
    "SELECT gop_y, model FROM docflow.gop_y_ai WHERE tai_lieu_id = $1 AND phien_ban = $2 AND trang_thai = 'xong'",
    [taiLieuId, tuBan],
  );
  if (gy[0]) {
    const ds = docJson<GopYAi>(gy[0].gop_y).map((g) => (gySua.has(g.thong_diep) ? { ...g, da_sua: true } : g));
    await q.query(
      `INSERT INTO docflow.gop_y_ai (tai_lieu_id, phien_ban, sha256, trang_thai, gop_y, loi, model, bat_dau_luc, xong_luc)
       VALUES ($1, $2, $3, 'xong', $4::jsonb, NULL, $5, now(), now())
       ON CONFLICT (tai_lieu_id, phien_ban) DO UPDATE SET sha256 = EXCLUDED.sha256, trang_thai = 'xong', gop_y = EXCLUDED.gop_y,
         loi = NULL, model = EXCLUDED.model, bat_dau_luc = now(), xong_luc = now()`,
      [taiLieuId, denBan, sha, JSON.stringify(ds), gy[0].model],
    );
  }

  const { rows: la } = await q.query<{ ket_qua: unknown; dau_luat: string; model: string | null }>(
    "SELECT ket_qua, dau_luat, model FROM docflow.luat_ai_ket_qua WHERE tai_lieu_id = $1 AND phien_ban = $2 AND trang_thai = 'xong'",
    [taiLieuId, tuBan],
  );
  if (la[0]) {
    const ds = docJson<KetQuaLuatAi>(la[0].ket_qua).map((k) => (luatSua.has(k.luat_id) ? { ...k, dat: true, da_sua: true } : k));
    await q.query(
      `INSERT INTO docflow.luat_ai_ket_qua (tai_lieu_id, phien_ban, sha256, dau_luat, trang_thai, ket_qua, loi, model, bat_dau_luc, xong_luc)
       VALUES ($1, $2, $3, $4, 'xong', $5::jsonb, NULL, $6, now(), now())
       ON CONFLICT (tai_lieu_id, phien_ban) DO UPDATE SET sha256 = EXCLUDED.sha256, dau_luat = EXCLUDED.dau_luat, trang_thai = 'xong',
         ket_qua = EXCLUDED.ket_qua, loi = NULL, model = EXCLUDED.model, bat_dau_luc = now(), xong_luc = now()`,
      [taiLieuId, denBan, sha, la[0].dau_luat, JSON.stringify(ds), la[0].model],
    );
  }
}
