// ============================================================
// bao-cao-tuan/can-quyet-ai.ts — 🤖 AI ĐỌC NHƯ NGƯỜI cho dòng kiến nghị luật code chưa chắc (CHỈ SERVER).
// Mr. Đại chốt 02/10/2026: "tôi là con người đọc một cái biết luôn có phải hay không. LLM cũng cần như vậy" — giảm "có thể là"
// tới mức thấp nhất. Vai LLM ① (đọc tiếng người → phân loại, kèm lý do); kết quả hiện kèm 🤖 + lý do để BLĐ soát (luật 19).
//   · chạy NỀN (không giữ trang chờ), một lượt cho mọi dòng đang chờ, kết luận lưu bảng kien_nghi_khop (db/78)
//   · AI chỉ được chọn trong ứng viên đưa vào; mã ngoài danh sách = coi như không khớp
// ============================================================
import type { Q } from "@/lib/db";
import type { DongCanQuyet } from "./can-quyet";

export const khoaUngVien = (d: Pick<DongCanQuyet, "ung_vien">) => (d.ung_vien ?? []).map((u) => u.ma).sort().join(",");

/** Kết luận đã lưu: khoa|ung_vien → { ma | null, ly_do } */
export async function docKetLuanAi(q: Q): Promise<Map<string, { ma: string | null; ly_do: string }>> {
  const { rows } = await q.query<{ khoa: string; ung_vien: string; cong_viec_id: string | null; ly_do: string | null }>(
    "SELECT khoa, ung_vien, cong_viec_id, ly_do FROM docflow.kien_nghi_khop",
  );
  return new Map(rows.map((r) => [`${r.khoa}|${r.ung_vien}`, { ma: r.cong_viec_id, ly_do: r.ly_do ?? "" }]));
}

type G = typeof globalThis & { __canQuyetAi?: Set<string> };

/** Gửi AI các dòng đang chờ (chạy nền, không ném lỗi). Trả số dòng vừa đưa đi. */
export function xetNenBangAi(dong: DongCanQuyet[]): number {
  const g = globalThis as G;
  const dang = (g.__canQuyetAi ??= new Set());
  const can = dong.filter((d) => d.ung_vien?.length && !dang.has(`${d.khoa}|${khoaUngVien(d)}`)).slice(0, 20);
  if (!can.length) return 0;
  for (const d of can) dang.add(`${d.khoa}|${khoaUngVien(d)}`);
  void (async () => {
    try {
      const { tx } = await import("@/lib/db");
      const { layCauHinh } = await import("@/lib/cau-hinh/doc");
      const { runAIGan } = await import("@/lib/ai/providers");
      const { layJson } = await import("@/lib/kiem-tra/gop-y-ai");
      const { layQ } = await import("@/lib/db");
      const model = (await layCauHinh(await layQ(), "ai")).model_mac_dinh || undefined;
      const de = can
        .map((d, i) => `#${i + 1} KIẾN NGHỊ: ${d.noi_dung.replace(/\s+/g, " ").slice(0, 400)}\n${(d.ung_vien ?? []).map((u) => `   - ${u.ma}: ${u.ten.replace(/\s+/g, " ").slice(0, 200)}`).join("\n")}`)
        .join("\n\n");
      const prompt =
        `Mỗi mục dưới đây là một dòng KIẾN NGHỊ trong báo cáo tuần của một đơn vị, kèm vài VIỆC đang có trong sổ cái công việc.\n` +
        `Đọc như một người quản lý: kiến nghị có đang nói về ĐÚNG MỘT việc trong danh sách không (cùng sự việc, cùng đối tượng — ` +
        `kiến nghị thường viết dài hơn, thêm hậu quả / đề xuất; chữ viết tắt như TMĐT, GPMB, TKCS, PDA là bình thường)?\n` +
        `Chỉ chọn khi chắc như người đọc thấy hiển nhiên; cùng chủ đề chung chung (cùng "hợp đồng", cùng "nhà máy") mà khác sự việc thì KHÔNG.\n\n` +
        `${de}\n\n` +
        `Trả DUY NHẤT JSON: {"ket_qua":[{"so":1,"ma":"<mã việc hoặc null>","ly_do":"một câu tiếng Việt, tối đa 25 chữ"}]}`;
      const text = await runAIGan("lib/bao-cao-tuan/can-quyet-ai", prompt, "Bạn chỉ trả JSON, không giải thích.", undefined, model, 120_000, true);
      const kq = (layJson(text) as { ket_qua?: { so?: number; ma?: string | null; ly_do?: string }[] }).ket_qua ?? [];
      await tx(async (q) => {
        for (const [i, d] of can.entries()) {
          const r = kq.find((x) => Number(x.so) === i + 1);
          if (!r) continue; // AI bỏ sót mục → lần mở trang sau hỏi lại
          const ma = typeof r.ma === "string" && (d.ung_vien ?? []).some((u) => u.ma === r.ma) ? r.ma : null;
          await q.query(
            `INSERT INTO docflow.kien_nghi_khop (khoa, ung_vien, cong_viec_id, ly_do) VALUES ($1, $2, $3, $4)
             ON CONFLICT (khoa, ung_vien) DO UPDATE SET cong_viec_id = EXCLUDED.cong_viec_id, ly_do = EXCLUDED.ly_do, luc = now()`,
            [d.khoa, khoaUngVien(d), ma, String(r.ly_do ?? "").slice(0, 300)],
          );
        }
      });
    } catch (e) {
      console.error("[can-quyet] AI đọc kiến nghị lỗi:", e instanceof Error ? e.message : e);
    } finally {
      for (const d of can) dang.delete(`${d.khoa}|${khoaUngVien(d)}`);
    }
  })();
  return can.length;
}
