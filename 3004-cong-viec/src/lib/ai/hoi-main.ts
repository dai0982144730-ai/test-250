// ============================================================
// HỎI CHÉO QUA MAIN (KE-HOACH/31 đợt 5, Mr. Đại duyệt 26/10/2026)
//
// Trợ lý chat của agent Công việc KHÔNG hỏi thẳng agent khác — hỏi Main (`main.tra_loi_cau_hoi`), Main chạy bộ máy chat theo quyền
// NGƯỜI HỎI, chọn agent liên quan rồi trả một câu. Đi qua `goiCoGhi` (luật 29): sổ nhật ký có vết hỏi + câu trả lời gọn.
// Hàm gọi thật `hoiMainTho` KHÔNG export.
// ============================================================

import { goiCoGhi } from "@/lib/nhat-ky/so";
import { headerChuoi } from "@/lib/nhat-ky/chuoi";
import { dauThuNoiBo } from "@/lib/mcp/khoa-chung";
import { diaChiMain } from "@/lib/chung/dia-chi-agent";
import { TEN_AGENT_NAY } from "@/lib/nguon-tien-do";

/** Main phải gọi AI và hỏi agent liên quan nên chậm hơn các cổng khác */
const HAN_CHO_MS = 150_000;

interface TraMain {
  ok: boolean;
  du_lieu?: { tra_loi?: string; cong_cu_main_da_goi?: string[] };
  canh_bao?: string[];
  thong_diep?: string;
}

async function hoiMainTho(thamSo: Record<string, unknown>, lyDo: string, congCuMain = "main.tra_loi_cau_hoi", hanChoMs = HAN_CHO_MS): Promise<{ ok: true; tra: TraMain } | { ok: false; loi: string }> {
  try {
    const r = await fetch(`${diaChiMain()}/api/mcp/main`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headerChuoi(), ...dauThuNoiBo() },
      body: JSON.stringify({ cong_cu: congCuMain, tham_so: thamSo, agent_goi: TEN_AGENT_NAY, ly_do_goi: lyDo }),
      signal: AbortSignal.timeout(hanChoMs),
      cache: "no-store",
    });
    const j = (await r.json().catch(() => null)) as TraMain | null;
    if (!j?.ok) return { ok: false, loi: j?.thong_diep ?? `Main trả HTTP ${r.status}` };
    return { ok: true, tra: j };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, loi: /abort|timeout/i.test(m) ? `Main không thưa trong ${hanChoMs / 1000} giây` : `không nối được Main (${m})` };
  }
}

/** Hỏi Main một câu cần dữ liệu agent khác. Luôn trả khuôn, không ném lỗi. */
export async function hoiMainCauCheo(cauHoi: string, email: string): Promise<{ ok: true; traLoi: string; canhBao: string[]; congCu: string[] } | { ok: false; loi: string }> {
  const lyDo = `trợ lý agent Công việc chuyển câu hỏi cần dữ liệu agent khác: ${cauHoi.slice(0, 80)}`;
  const thamSo = { cau_hoi: cauHoi, nguoi_hoi: email };
  const kq = await goiCoGhi(
    { agentTraLoi: "main", congCu: "main.tra_loi_cau_hoi", thamSo, lyDoGoi: lyDo, duong: "A", nguoi: email },
    () => hoiMainTho(thamSo, lyDo),
    (k) => ({ traLoiGon: k.ok ? (k.tra.du_lieu?.tra_loi ?? "").slice(0, 200) : `lỗi: ${k.loi}`.slice(0, 200) }),
  );
  if (!kq.ok) return { ok: false, loi: kq.loi };
  return { ok: true, traLoi: kq.tra.du_lieu?.tra_loi ?? "", canhBao: kq.tra.canh_bao ?? [], congCu: kq.tra.du_lieu?.cong_cu_main_da_goi ?? [] };
}

/**
 * Đường «lai» (Mr. Đại chốt 28/10/2026): trợ lý đã biết đúng công cụ đọc của agent khác → Main chạy bằng CODE (`main.chuyen_cong_cu`),
 * kiểm quyền theo người hỏi, không gọi AI. Đo 28/10: 0,1–2,4 giây thay vì 24–67 giây. Có ghi sổ như mọi lượt (luật 29).
 */
export async function chuyenCongCuQuaMain(
  congCu: string,
  thamSoCongCu: Record<string, unknown>,
  cauGoc: string,
  email: string,
  maDuAn: string,
): Promise<{ ok: true; ketQua: string; duLieu: unknown; canhBao: string[] } | { ok: false; loi: string }> {
  const lyDo = `trợ lý agent Công việc xin Main chạy công cụ ${congCu}: ${cauGoc.slice(0, 80)}`;
  const thamSo = { cong_cu: congCu, tham_so: thamSoCongCu, nguoi_hoi: email, ma_du_an: maDuAn, cau_goc: cauGoc };
  const kq = await goiCoGhi(
    { agentTraLoi: "main", congCu: "main.chuyen_cong_cu", thamSo, lyDoGoi: lyDo, duong: "A", nguoi: email },
    () => hoiMainTho(thamSo, lyDo, "main.chuyen_cong_cu", 30_000),
    (k) => ({ traLoiGon: k.ok ? String((k.tra.du_lieu as { ket_qua?: string } | undefined)?.ket_qua ?? "").slice(0, 200) : `lỗi: ${k.loi}`.slice(0, 200) }),
  );
  if (!kq.ok) return { ok: false, loi: kq.loi };
  const d = (kq.tra.du_lieu ?? {}) as { ket_qua?: string; du_lieu?: unknown };
  return { ok: true, ketQua: d.ket_qua ?? "", duLieu: d.du_lieu ?? null, canhBao: kq.tra.canh_bao ?? [] };
}
