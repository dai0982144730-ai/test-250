// bao-cao-tuan/nen.ts — chạy nền của Báo cáo tuần: 🤖 chấm độ khó (2 phút/lượt) + xét viết báo cáo (5 phút/lượt). CHỈ SERVER.
import { batChamDoKhoNen } from "./do-kho";

type G = typeof globalThis & { __vietBaoCaoTuan?: { dang: boolean; timer?: ReturnType<typeof setInterval> } };

/** AI viết báo cáo: model riêng của Báo cáo tuần, trống thì theo AI → Model mặc định. Viết dài → cho 15 phút. */
export async function goiAiBaoCao(prompt: string, system: string, model?: string): Promise<string> {
  const { layQ } = await import("@/lib/db");
  const { layCauHinh } = await import("@/lib/cau-hinh/doc");
  const { runAIGan } = await import("@/lib/ai/providers");
  const m = model || (await layCauHinh(await layQ(), "ai")).model_mac_dinh || undefined;
  return runAIGan("lib/bao-cao-tuan/nen", prompt, system, undefined, m, 900_000, true);
}

export async function xetVietNen(): Promise<void> {
  const g = globalThis as G;
  const st = (g.__vietBaoCaoTuan ??= { dang: false });
  if (st.dang) return;
  st.dang = true;
  try {
    const { layQ } = await import("@/lib/db");
    const { vietTheoLich } = await import("./viet");
    const t = await vietTheoLich(await layQ(), goiAiBaoCao);
    if (t) console.log(`[bao-cao-tuan] 🤖 đã viết báo cáo tuần bắt đầu ${t}`);
  } catch (e) {
    console.error("[bao-cao-tuan] viết báo cáo tuần lỗi:", e instanceof Error ? e.message : e);
  } finally {
    st.dang = false;
  }
}

export function batBaoCaoTuanNen(): void {
  batChamDoKhoNen();
  const g = globalThis as G;
  const st = (g.__vietBaoCaoTuan ??= { dang: false });
  if (st.timer) return;
  st.timer = setInterval(() => void xetVietNen(), 5 * 60_000);
  if (typeof st.timer === "object" && "unref" in st.timer) st.timer.unref();
  const t0 = setTimeout(() => void xetVietNen(), 3 * 60_000);
  if (typeof t0 === "object" && "unref" in t0) t0.unref();
}
