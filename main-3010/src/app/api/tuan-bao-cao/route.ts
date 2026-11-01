// API tuần báo cáo — Header (client) đọc để hiện "Tuần báo cáo: …".
//
// ⭐ 24/09 (Mr. Đại chốt: Main chỉ ánh xạ số của agent tiến độ qua cổng):
// trước đây route này tự đọc BC tuần/BC ngày CHÉP trong data/projects của Main
// (lib/tuan-bao-cao.ts → datasource/dayreport). Nay hỏi thẳng Agent tiến độ
// `tiendo.tom_tat_du_an`. Header nằm trên MỌI trang nên đệm 10 phút / dự án —
// không đệm thì mỗi lần chuyển trang là một dòng sổ nhật ký (luật 29).
//
// SỬA 24/09 (lần 2): từng đọc `overlayWeek` = tuần của BC tuần đang đắp số
// (W38) → "W38 (dữ liệu đến 24/09/2026)" trong khi tiến độ ghi W39. Nay đọc
// ĐÚNG hai trường cổng trả: `tuan_bao_cao` (tuần ISO CHỨA ngày cắt — định nghĩa
// ở tiến độ lib/tuan-bao-cao.ts) + `ngay_cat_tuan_bao_cao`. Main KHÔNG tự tính
// tuần: cổng không trả (agent tắt / bản cũ / chưa có báo cáo) → coDuLieu=false,
// thanh ghi "chưa có số từ Agent tiến độ".

import { NextResponse } from "next/server";
import { canAccessProjectByEmail, resolveProjectId } from "@/lib/projects";
import { requireRole } from "@/lib/route-auth";
import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { gioPhut, thongTinBanCu } from "@/lib/nguon/bo-nho-hoi";
import { bocRouteTrang } from "@/lib/nhat-ky/so";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TuanBaoCao {
  /** Tuần ISO CHỨA ngày cắt ("2026-W39") — nguyên văn cổng tiến độ; "" khi chưa có */
  tuan: string;
  /** Ngày cắt dữ liệu của Agent tiến độ (ISO); "" khi chưa có */
  ngay: string;
  /** false = Agent tiến độ chưa trả lời / dự án chưa có báo cáo */
  coDuLieu: boolean;
  ghiChu?: string;
  /** Lúc Agent tiến độ trả câu này (ISO) — số có thể lấy từ bộ nhớ tạm 10 phút */
  luc?: string;
  /**
   * ⭐ QS-073 (27/09): Agent tiến độ chưa trả lời kịp nên đang dùng BẢN CŨ —
   * câu tiếng Việt để thanh trên cùng nói rõ, không để ô trống. Không có = số tươi.
   */
  banCu?: string;
  /** "HH:mm" của bản cũ đang dùng */
  gioBanCu?: string;
}

// ⭐ QS-074 (27/09): bộ đệm cũ ở đây là Map CẤP MODULE — `next dev` nạp lại route
// là mất, nên lý do gọi hứa "đệm 10 phút" mà sổ 26/09 21:36–21:41 vẫn ghi 6 lượt.
// Nay dùng bộ nhớ chung trên globalThis của cửa hoiAgent (bo-nho-hoi.ts): nhớ 10
// phút, một lượt bay, dùng CHUNG câu trả lời với Bảng điều hành (cùng câu hỏi).

async function hoiTuan(projectId: string): Promise<TuanBaoCao> {
  const kq = await hoiAgent(
    "tiendo",
    "tiendo.tom_tat_du_an",
    "Topmenu Main: hiện tuần báo cáo + ngày cắt dữ liệu của dự án đang mở (đệm 10 phút)",
    { tham_so: { ma_du_an: projectId }, dungBanCuKhiLoi: true },
  );
  if (!kq.ok) {
    return {
      tuan: "",
      ngay: "",
      coDuLieu: false,
      ghiChu:
        kq.ma_loi === "HET_HAN_CHO"
          ? `Agent tiến độ chưa trả lời kịp — chưa có số, thử lại sau ít phút (${kq.thong_diep})`
          : kq.thong_diep,
    };
  }
  const cu = thongTinBanCu(kq);
  const d = (kq.du_lieu ?? {}) as Record<string, unknown>;
  const tuan = typeof d.tuan_bao_cao === "string" ? d.tuan_bao_cao : null;
  const ngay = typeof d.ngay_cat_tuan_bao_cao === "string" ? d.ngay_cat_tuan_bao_cao : null;
  if (!tuan || !ngay) {
    return {
      tuan: "",
      ngay: "",
      coDuLieu: false,
      ghiChu: "Agent tiến độ chưa trả tuần báo cáo (dự án chưa có báo cáo hoặc cổng bản cũ).",
    };
  }
  return {
    tuan,
    ngay,
    coDuLieu: true,
    luc: kq.thoi_diem_tra_loi,
    ...(cu
      ? {
          banCu: `Agent tiến độ chưa trả lời kịp — đang dùng số lúc ${gioPhut(cu.luc)} (${cu.lyDo})`,
          gioBanCu: gioPhut(cu.luc),
        }
      : {}),
  };
}

async function xuLyGET(request: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const projectId = resolveProjectId(searchParams.get("project") ?? undefined);
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, projectId)) {
    return NextResponse.json({ ok: false, message: "Không thuộc dự án này." }, { status: 403 });
  }
  const kq = await hoiTuan(projectId);
  return NextResponse.json({ ok: true, ...kq });
}

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const GET = bocRouteTrang("/api/tuan-bao-cao", xuLyGET);
