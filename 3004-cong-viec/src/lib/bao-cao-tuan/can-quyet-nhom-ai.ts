// ============================================================
// bao-cao-tuan/can-quyet-nhom-ai.ts — GẮN NHÓM cho dòng "Cần BLĐ ra quyết định" (CHỈ SERVER). Mr. Đại chốt 20/10/2026, mục 6.
//   · code xếp trước (can-quyet-nhom.ts); dòng code KHÔNG chắc → 🤖 AI đọc như người, chạy NỀN, lưu bảng can_quyet_nhom (db/88)
//     kèm lý do một câu (vai LLM ①: đọc tiếng người → phân loại; hiện kèm 🤖 — luật 19)
//   · người bấm chuyển nhóm → ghi đè; AI không bao giờ ghi đè lựa chọn của người
// ============================================================
import type { Q } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { DongCanQuyet } from "./can-quyet";
import { NHOM_CAN_QUYET, laNhomCanQuyet, xepNhomCanQuyet, type DuLieuXep, type NhomCanQuyet } from "./can-quyet-nhom";

export async function duLieuXepNhom(q: Q): Promise<DuLieuXep> {
  const { rows } = await q.query<{ id: string; cha_id: string | null }>("SELECT id, cha_id FROM identity.don_vi");
  return { du_an: await layCauHinh(q, "du_an"), cha: Object.fromEntries(rows.map((r) => [r.id, r.cha_id])) };
}

/** Gắn nhóm cho từng dòng: lựa chọn đã lưu (người / 🤖 AI) thắng code; code không chắc → đánh dấu chờ AI. */
export async function ganNhom(q: Q, dong: DongCanQuyet[]): Promise<{ dong: DongCanQuyet[]; cho_ai: DongCanQuyet[]; dl: DuLieuXep }> {
  const dl = await duLieuXepNhom(q);
  const { rows } = await q.query<{ khoa: string; nhom: string; boi: string; ly_do: string | null }>("SELECT khoa, nhom, boi, ly_do FROM docflow.can_quyet_nhom");
  const luu = new Map(rows.map((r) => [r.khoa, r]));
  const choAi: DongCanQuyet[] = [];
  for (const d of dong) {
    const r = luu.get(d.khoa);
    const x = xepNhomCanQuyet(d, dl);
    if (r && laNhomCanQuyet(r.nhom) && (r.boi !== "ai" || !x.chac)) {
      // người chuyển → luôn thắng; 🤖 AI → chỉ dùng khi code vẫn chưa chắc (code nay chắc thì code thắng)
      d.nhom = r.nhom;
      d.nhom_boi = r.boi === "ai" ? "ai" : "nguoi";
      d.nhom_ly_do = r.ly_do ?? undefined;
      continue;
    }
    d.nhom = x.nhom;
    d.nhom_boi = "may";
    if (!x.chac) {
      // AI vừa lỗi với dòng này → không treo «đang xếp», báo «chưa xếp được, máy đoán tạm»
      if (vuaLoiAi(d.khoa)) d.nhom_ai_loi = true;
      else {
        d.nhom_cho_ai = true;
        choAi.push(d);
      }
    }
  }
  return { dong, cho_ai: choAi, dl };
}

type G = typeof globalThis & { __canQuyetNhomAi?: Set<string>; __canQuyetNhomLoi?: Map<string, number> };
/** Lượt AI xếp nhóm lỗi: 10 phút mới hỏi lại dòng đó (kiểm độc lập lần 6, F-A4 — trước đây mỗi lần mở trang lại gọi AI, dòng treo «đang xếp») */
const CHO_SAU_LOI_MS = 10 * 60_000;
export function vuaLoiAi(khoa: string): boolean {
  const t = (globalThis as G).__canQuyetNhomLoi?.get(khoa);
  return t !== undefined && Date.now() - t < CHO_SAU_LOI_MS;
}

/** Gửi AI các dòng code chưa chắc (chạy nền, không ném lỗi). Trả số dòng vừa đưa đi. */
export function xepNhomNenBangAi(dong: DongCanQuyet[], dl: DuLieuXep): number {
  const g = globalThis as G;
  const dang = (g.__canQuyetNhomAi ??= new Set());
  const can = dong.filter((d) => !dang.has(d.khoa)).slice(0, 25);
  if (!can.length) return 0;
  for (const d of can) dang.add(d.khoa);
  void (async () => {
    try {
      const { tx, layQ } = await import("@/lib/db");
      const { runAIGan } = await import("@/lib/ai/providers");
      const { layJson } = await import("@/lib/kiem-tra/gop-y-ai");
      const model = (await layCauHinh(await layQ(), "ai")).model_mac_dinh || undefined;
      const sci = dl.du_an.filter((a) => a.nhom === "sci").map((a) => a.ten);
      const khac = dl.du_an.filter((a) => a.nhom !== "sci").map((a) => a.ten);
      const de = can
        .map((d, i) => {
          const gui = d.don_vi.map((x) => x.ten).join(", ");
          return `#${i + 1} (${d.loai === "quyet_dinh" ? "quyết định Form 0" : "kiến nghị"} — đơn vị gửi: ${gui})\n   ${d.noi_dung.replace(/\s+/g, " ").slice(0, 400)}${d.kien_nghi ? `\n   Kiến nghị: ${d.kien_nghi.replace(/\s+/g, " ").slice(0, 200)}` : ""}`;
        })
        .join("\n\n");
      const prompt =
        `Xếp mỗi dòng dưới đây (kiến nghị gửi Ban lãnh đạo trong báo cáo tuần) vào ĐÚNG MỘT nhóm:\n` +
        NHOM_CAN_QUYET.map((n) => `- ${n.kieu}: ${n.nhan} — ${n.giai_thich}`).join("\n") +
        `\n\nDự án SCI ĐẦU TƯ: ${sci.join(", ") || "(không có)"}\nDự án LOẠI KHÁC (SCI E&C thi công, không do SCI đầu tư): ${khac.join(", ") || "(không có)"}\n` +
        `Xếp theo GIAI ĐOẠN của NỘI DUNG dòng (không theo tình trạng dự án): Khởi tạo (pháp lý, chủ trương, GPMB, đất, giấy phép) · Thiết kế ` +
        `(khảo sát, TKCS, FS) · Kế hoạch (đấu thầu, vốn) → truoc_khoi_cong; Thực thi (thi công, thiết bị, thanh toán) · Kiểm soát ` +
        `(nghiệm thu, giám sát) · Kết thúc (quyết toán, bàn giao) → thuc_thi — hai nhóm này CHỈ cho dự án SCI đầu tư. ` +
        `Dự án Loại khác ở bất kỳ giai đoạn nào → enc. Vận hành nhà máy đang chạy (sự cố, bảo dưỡng, sản lượng), việc nội bộ phòng ban, ` +
        `hoặc không gắn được dự án nào → khac.\n\n` +
        `${de}\n\n` +
        `Trả DUY NHẤT JSON: {"ket_qua":[{"so":1,"nhom":"truoc_khoi_cong|thuc_thi|enc|khac","ly_do":"một câu tiếng Việt, tối đa 20 chữ, nêu tên dự án và giai đoạn nếu có"}]}`;
      const text = await runAIGan("lib/bao-cao-tuan/can-quyet-nhom-ai", prompt, "Bạn chỉ trả JSON, không giải thích.", undefined, model, 120_000, true);
      const kq = (layJson(text) as { ket_qua?: { so?: number; nhom?: string; ly_do?: string }[] }).ket_qua ?? [];
      await tx(async (q) => {
        for (const [i, d] of can.entries()) {
          const r = kq.find((x) => Number(x.so) === i + 1);
          if (!r || !laNhomCanQuyet(r.nhom)) {
            // AI bỏ sót / trả nhóm lạ → coi như lỗi: 10 phút sau mới hỏi lại, giao diện báo «máy đoán tạm»
            (g.__canQuyetNhomLoi ??= new Map()).set(d.khoa, Date.now());
            continue;
          }
          await q.query(
            `INSERT INTO docflow.can_quyet_nhom (khoa, nhom, boi, ly_do) VALUES ($1, $2, 'ai', $3)
             ON CONFLICT (khoa) DO UPDATE SET nhom = EXCLUDED.nhom, ly_do = EXCLUDED.ly_do, luc = now()
             WHERE docflow.can_quyet_nhom.boi = 'ai'`,
            [d.khoa, r.nhom, String(r.ly_do ?? "").slice(0, 300)],
          );
        }
      });
    } catch (e) {
      console.error("[can-quyet] AI xếp nhóm lỗi:", e instanceof Error ? e.message : e);
      const loi = (g.__canQuyetNhomLoi ??= new Map());
      for (const d of can) loi.set(d.khoa, Date.now());
    } finally {
      for (const d of can) dang.delete(d.khoa);
    }
  })();
  return can.length;
}

/** Người bấm chuyển nhóm — thắng AI */
export async function ghiNhomNguoi(q: Q, khoa: string, nhom: NhomCanQuyet, nguoi: string): Promise<void> {
  await q.query(
    `INSERT INTO docflow.can_quyet_nhom (khoa, nhom, boi, ly_do) VALUES ($1, $2, $3, NULL)
     ON CONFLICT (khoa) DO UPDATE SET nhom = EXCLUDED.nhom, boi = EXCLUDED.boi, ly_do = NULL, luc = now()`,
    [khoa, nhom, nguoi],
  );
}
