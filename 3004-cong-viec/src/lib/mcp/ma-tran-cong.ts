// ============================================================
// KÉO + NHỚ CỘT MA TRẬN "AI ĐƯỢC GỌI AI" TỪ MAIN — phần máy chủ của cổng /api/mcp/base (04/10/2026)
//
// Chép luật của 1-agent-base/src/lib/mcp/ma-tran-cong.ts (Mr. Đại chốt lô 24/09):
//   · kéo `main.ma_tran_goi` (Main giao `goi_toi` = cột của mã "base"), nhớ tạm 10 phút;
//   · Main tắt → dùng bản nhớ gần nhất; chưa từng có → cho qua + cảnh báo (phần xét ở `cua-ma-tran.ts`, thuần);
//   · lượt kéo đi qua `goiCoGhi` (Luật 29), sổ có vết;
//   · Main hỏng thì 1 phút mới thử lại, lượt đang phục vụ chờ tối đa 3 giây.
// Khác Base: agent Công việc chưa có lượt kéo cấu hình chung (keo-cau-hinh) nên tự gọi Main ở đây.
// CHỈ SERVER (gọi mạng).
// ============================================================
import { diaChiMain } from "@/lib/chung/dia-chi-agent";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import { dauThuNoiBo } from "@/lib/mcp/khoa-chung";
import { TEN_AGENT_NAY } from "@/lib/nguon-tien-do";
import { bocGoiToi, type BanMaTran } from "@/lib/mcp/cua-ma-tran";

const NHO_MS = 10 * 60 * 1000;
const THU_LAI_KHI_HONG_MS = 60 * 1000;
const CHO_TOI_DA_MS = 3_000;
const LY_DO = "Cổng base của agent Công việc kéo cột Ai được gọi ai (goi_toi) để tự chặn agent không được phép — nhớ tạm 10 phút";

interface NhoMaTran {
  ban: BanMaTran | null;
  lanThuCuoi: number;
  loiCuoi: string | null;
  dangKeo: Promise<void> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __maTranCongBaseCongViec: NhoMaTran | undefined;
}
const nho: NhoMaTran = (globalThis.__maTranCongBaseCongViec ??= { ban: null, lanThuCuoi: 0, loiCuoi: null, dangKeo: null });

/** ⛔ Gọi thật — không export; đi qua `keo` để có vết sổ (luật 29) */
async function hoiMaTranTho(): Promise<{ ok?: boolean; du_lieu?: unknown; thong_diep?: string }> {
  const r = await fetch(`${diaChiMain()}/api/mcp/main`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headerChuoi(), ...dauThuNoiBo() }, // khoá nội bộ mọi lượt máy–máy (17/10)
    body: JSON.stringify({ cong_cu: "main.ma_tran_goi", tham_so: {}, agent_goi: TEN_AGENT_NAY, ly_do_goi: LY_DO }),
    signal: AbortSignal.timeout(CHO_TOI_DA_MS * 3),
    cache: "no-store",
  });
  return (await r.json()) as { ok?: boolean; du_lieu?: unknown; thong_diep?: string };
}

async function keo(): Promise<void> {
  const kq = await goiCoGhi(
    { agentTraLoi: "main", congCu: "main.ma_tran_goi", thamSo: {}, lyDoGoi: LY_DO, duong: "A" },
    hoiMaTranTho,
    (j) => ({ traLoiGon: j.ok ? `cột goi_toi ${bocGoiToi(j.du_lieu)?.length ?? 0} ô` : (j.thong_diep ?? "lỗi") }),
  );
  if (!kq.ok) {
    nho.loiCuoi = kq.thong_diep ?? "Main trả lỗi khi hỏi main.ma_tran_goi";
    return;
  }
  const goiToi = bocGoiToi(kq.du_lieu);
  if (goiToi === null) {
    nho.loiCuoi = "Main chưa giao cột goi_toi trong main.ma_tran_goi";
    return;
  }
  nho.ban = { luc: Date.now(), goiToi };
  nho.loiCuoi = null;
}

/** Bản ma trận đang dùng: tươi (≤ 10 phút) thì trả ngay; cũ thì kéo lại (chờ tối đa 3 giây) */
export async function layBanMaTran(): Promise<{ ban: BanMaTran | null; banCu: boolean }> {
  const bayGio = Date.now();
  const tuoi = (): boolean => nho.ban !== null && Date.now() - nho.ban.luc < NHO_MS;
  if (tuoi()) return { ban: nho.ban, banCu: false };
  if (bayGio - nho.lanThuCuoi >= THU_LAI_KHI_HONG_MS) {
    nho.lanThuCuoi = bayGio;
    nho.dangKeo ??= keo()
      .catch((e) => {
        nho.loiCuoi = e instanceof Error ? e.message : String(e);
      })
      .finally(() => {
        nho.dangKeo = null;
      });
  }
  if (nho.dangKeo) await Promise.race([nho.dangKeo, new Promise<void>((xong) => setTimeout(xong, CHO_TOI_DA_MS))]);
  return { ban: nho.ban, banCu: nho.ban !== null && !tuoi() };
}
