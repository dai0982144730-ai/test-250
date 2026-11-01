// ============================================================
// TỪ ĐIỂN MÃ → TÊN CỦA MỘT DỰ ÁN  (server-only — hỏi Agent Tiến độ qua cổng)
// Luật "mã kèm tên" Mr. Đại chốt 26/09 — lưới an toàn `ganTenChoMa` cần biết
// "6.1.4" của dự án NÀY tên là gì.
//
// Main KHÔNG giữ cây WBS (không giữ dữ liệu nghiệp vụ): hỏi `tiendo.tim_dau_viec`
// từ khoá rỗng (đo 25/09 HV: 330/330 đầu việc {wbs, name}) qua `hoiTienDo` — có
// vết trong sổ nhật ký (luật 29). Đệm ngắn hạn 10 phút theo dự án, dùng CHUNG
// với màn Cảnh báo chế độ "Xếp theo WBS" (A10a) để hai nơi không hỏi hai lần.
// Tiến độ không trả được → từ điển rỗng, chữ giữ nguyên (không bịa tên).
// ============================================================

import { layMoiDauViec } from "@/lib/nguon/tim-dau-viec-het";
import { LOP_CHU, ganTenChoMa, gopTuDien, laMaHopLe, type TuDienMa } from "./ma-kem-ten";

const HAN_DEM_MS = 10 * 60 * 1000;
const g = globalThis as unknown as {
  __tenWbsIssueMain?: Map<string, { luc: number; ten: Record<string, string> }>;
};
const dem = (g.__tenWbsIssueMain ??= new Map());

/** Mã WBS thật, kể cả một cấp ("6") — màn Cảnh báo cần; lưới an toàn tự lọc bỏ mã một cấp */
function laMaWbs(v: unknown): v is string {
  return typeof v === "string" && /^\d+(\.\d+)*$/.test(v.trim());
}

/**
 * Tên việc theo mã WBS của một dự án. Không bao giờ ném lỗi.
 * `loi` = câu tiếng Việt khi Agent Tiến độ không trả được (màn Cảnh báo hiện câu này).
 */
export async function layTuDienWbs(
  projectId: string | undefined,
  lyDo: string,
): Promise<{ ten: Record<string, string>; loi: string | null }> {
  if (!projectId) return { ten: {}, loi: null };
  const c = dem.get(projectId);
  if (c && Date.now() - c.luc < HAN_DEM_MS) return { ten: c.ten, loi: null };
  try {
    // ⭐ K1 (QS-078, 27/09): cổng trần 100 dòng/lượt — lặp trang vi_tri += 100 (tim-dau-viec-het.ts)
    const kq = await layMoiDauViec(projectId, lyDo);
    if (kq.loi !== null && kq.tasks.length === 0) {
      return { ten: {}, loi: `Chưa lấy được tên việc từ Agent Tiến độ — ${kq.loi}` };
    }
    const ten: Record<string, string> = {};
    for (const t of kq.tasks) {
      if (laMaWbs(t.wbs) && typeof t.name === "string" && t.name.trim() !== "") ten[t.wbs.trim()] = t.name.trim();
    }
    // Thiếu trang (trang sau hỏng) thì dùng phần đã có nhưng KHÔNG đệm — lần sau hỏi lại cho đủ
    if (kq.du) dem.set(projectId, { luc: Date.now(), ten });
    return { ten, loi: null };
  } catch (e) {
    return { ten: {}, loi: `Chưa lấy được tên việc từ Agent Tiến độ — ${e instanceof Error ? e.message : "lỗi không rõ"}` };
  }
}

/**
 * Từ điển mã WBS → tên của một dự án cho lưới (bỏ mã một cấp). Không ném lỗi.
 * Cùng tên với bản Agent Tiến độ (bản đó đọc file, không phải hỏi mạng).
 */
export async function tuDienDuAn(
  projectId: string | null | undefined,
  lyDo = "Luật mã kèm tên (26/09): lấy tên việc cho mã WBS trong chữ AI viết",
): Promise<Map<string, string>> {
  if (!projectId) return new Map();
  const { ten } = await layTuDienWbs(projectId, lyDo);
  return new Map(Object.entries(ten).filter(([m]) => laMaHopLe(m)));
}

/** Có mã WBS nào trong chữ mà từ điển sẵn có chưa biết không — không có thì khỏi hỏi Tiến độ */
function canHoiWbs(text: string, daCo: TuDienMa | undefined): boolean {
  const ds = text.match(new RegExp(`(?<![${LOP_CHU}.])\\d+(?:\\.\\d+)+(?!\\d|\\.\\d)`, "g")) ?? [];
  return ds.some((m) => !daCo?.has(m));
}

/**
 * ⭐ Lưới an toàn cho chữ LLM viết — gọi TRƯỚC khi hiển thị / gửi Telegram / lưu.
 * Từ điển = `them` (vd cặp mã–tên quét từ kết quả công cụ, đứng trước nên thắng)
 * + cây WBS của `projectId` (chỉ hỏi Tiến độ khi chữ có mã WBS chưa biết).
 * `projectId` null = câu trả lời vắt nhiều dự án → KHÔNG dùng cây WBS của dự án
 * nào (cùng mã "6.1.4" mỗi dự án một việc), chỉ dùng `them`.
 */
export async function ganTenLlm(
  text: string,
  projectId: string | null | undefined,
  them?: TuDienMa,
  lyDo = "Luật mã kèm tên (26/09): lấy tên việc cho mã WBS trong chữ AI viết",
  tuyChon?: { choFile?: boolean },
): Promise<string> {
  if (!text) return text;
  try {
    let wbs: TuDienMa | undefined;
    if (projectId && canHoiWbs(text, them)) {
      // Mã một cấp ("6") là số trơn trong câu — không đưa vào lưới (laMaHopLe loại)
      wbs = new Map(Object.entries((await layTuDienWbs(projectId, lyDo)).ten).filter(([m]) => laMaHopLe(m)));
    }
    return ganTenChoMa(text, gopTuDien(them, wbs), tuyChon);
  } catch {
    return text;
  }
}
