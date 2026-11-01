// ============================================================
// LUẬT 33 — HỎI TRÙNG TRƯỚC KHI SOẠN VIỆC, phần máy chủ của agent Main (Mr. Đại chốt 04/10/2026)
//
// ① TRẢ LỜI (cổng `main.hoi_trung_viec`): agent khác hỏi "tôi định giao việc … vì …" → so với NHÁP chờ duyệt của
//    agent này (kho data/viec/viec-ai-soan.json) → máy lọc ứng viên → 🤖 AI phán (khuôn chung hoi-trung-kieu.ts).
// Phần thuần ở `hoi-trung-kieu.ts` (bản gốc Main). Chép từ agent Tiến độ (luật 7 — sửa ở Tiến độ rồi chép). Server-only.
// ============================================================

import { listProjects } from "@/lib/projects";
import { runAI } from "@/lib/ai/providers";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import { docSo } from "@/lib/canh-bao/so-issue";
import { docTatCaNhap, giuChoConSong, type NhapViecAi } from "@/lib/chung/viec-ai-soan";
import { chuanHanHoiTrung, phanTrung, type CauHoiTrung, type TraLoiTrung, type ViecDeSo } from "@/lib/chung/hoi-trung-kieu";

const TEN_AGENT_NAY = "Main";
const MA_AGENT_NAY = "main";

function maNganCua(projectId: string | undefined): string | null {
  if (!projectId) return null;
  return listProjects().find((p) => p.id === projectId)?.ma ?? null;
}

/** Mã WBS dạng số của thẻ nguồn trong sổ issue agent này (nháp soạn từ thẻ) */
function wbsCuaThe(id: string, projectId?: string): string | null {
  if (!id) return null;
  try {
    const w = docSo(projectId).the.find((t) => t.id === id)?.wbs?.trim() ?? "";
    return /^\d+(?:\.\d+)*$/.test(w) ? w : null;
  } catch {
    return null;
  }
}

/** Nháp còn sống đem ra so: bỏ nháp đã giao, nháp của thẻ đã giao qua nháp khác (cùng luật ẩn ở Việc của tôi — 04/10),
 *  bản ghi trùng lúc soạn (trừ khi người bấm "Vẫn soạn việc riêng") và giữ chỗ đã chết (quá 10 phút) */
export function viecDeSoTuNhap(ds: readonly NhapViecAi[], bayGio = Date.now()): ViecDeSo[] {
  const theDaGiao = new Set(ds.filter((n) => n.daGiao && n.tuIssue).map((n) => n.tuIssue));
  return ds
    .filter(
      (n) =>
        !n.daGiao &&
        !(n.tuIssue && theDaGiao.has(n.tuIssue)) &&
        (!n.hoiTrung?.trung || n.hoiTrung.muon || n.vanSoan) &&
        (!n.dangHoi || giuChoConSong(n, bayGio)),
    )
    .map((n) => ({
      ma: n.id,
      noi_dung: n.moTa ? `${n.ten} — ${n.moTa}` : n.ten,
      ma_du_an: maNganCua(n.projectId),
      ma_wbs: wbsCuaThe(n.tuIssue, n.projectId),
      trang_thai: n.dangHoi ? ("dang_hoi" as const) : ("cho_duyet" as const),
      luc: n.luc,
      han: chuanHanHoiTrung(n.han) ?? null,
    }));
}

/** ① Trả lời câu hỏi trùng của agent khác */
export async function traLoiHoiTrung(cau: CauHoiTrung, agentHoi: string): Promise<TraLoiTrung> {
  // Dự án agent này không theo dõi → thưa rõ "không có việc để so" (không trả lỗi: bên hỏi coi lỗi là không thưa và gọi lại)
  if (cau.ma_du_an && !listProjects().some((p) => p.ma === cau.ma_du_an)) {
    return { trung: false, cach_phan: "khong_ung_vien", so_ung_vien: 0, ly_do: `Agent ${TEN_AGENT_NAY} không theo dõi dự án mã ${cau.ma_du_an} — không có việc nào để so.` };
  }
  return phanTrung(cau, viecDeSoTuNhap(docTatCaNhap()), (prompt, heThong) =>
    goiCoGhi(
      {
        agentTraLoi: "llm",
        congCu: "viec.phan_trung",
        thamSo: { agent_hoi: agentHoi, ma_du_an: cau.ma_du_an, ma_wbs: cau.ma_wbs },
        lyDoGoi: `Luật 33: agent ${agentHoi} hỏi việc định giao có trùng nháp chờ duyệt của agent ${MA_AGENT_NAY} không — 🤖 phán giữa các ứng viên máy đã lọc`,
        duong: "A",
        duAn: cau.ma_du_an ?? undefined,
      },
      // Tắt nghĩ dài (lượt trả JSON) — kiểm lần 5 🟡2: có lượt 16,3 s vượt 15 s bên hỏi chờ
      () => runAI(prompt, heThong, undefined, { tokenNghi: 0 }),
    ),
  );
}
