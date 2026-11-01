// API DÒNG TÓM TẮT 🤖 CỦA BẢNG ĐIỀU HÀNH
//
// GET ?du_an=<mã> → câu LLM viết cho dự án đó (demo khối ②).
//
// Vì sao tách khỏi trang: luật 3 HOP-DONG-KET-NOI — màn hình không bao giờ chờ.
// Trang dựng xong ngay với câu số liệu do code ghép; câu 🤖 tới sau qua đường
// này. Bộ số không đổi thì không viết lại; mỗi dự án chỉ MỘT lượt đang bay (xem tom-tat-ai.ts).
// Số của bốn ban lấy lại qua gomBangDieuHanh — trúng bộ nhớ 10 phút vừa dùng để dựng
// màn (QS-074), nên đường này không hỏi lại các agent.

import { NextResponse } from "next/server";
import { gomBangDieuHanh } from "@/lib/bang-dieu-hanh/gom";
import { layTomTatAi } from "@/lib/bang-dieu-hanh/tom-tat-ai";
import { requireRole } from "@/lib/route-auth";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { duocGhi } from "@/lib/quyen";
import { bocRouteTrang } from "@/lib/nhat-ky/so";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function xuLyGET(req: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const duAn = new URL(req.url).searchParams.get("du_an") ?? undefined;
  const bdh = await gomBangDieuHanh(duAn);
  // ⭐ 12/10/2026 (Mr. Đại: Main ẩn phần Pháp lý với người ngoài dự án): câu 🤖 viết từ CẢ bộ số, có số và tên hồ sơ pháp lý còn
  // thiếu của dự án. Mỗi dự án chỉ nhớ MỘT câu nên không viết bản riêng — người ngoài dự án không nhận câu này (cùng nếp với
  // «ẩn nhận xét 🤖» ở Báo cáo tháng). Chặn TRƯỚC khi gọi AI.
  if (bdh.dangChon && bdh.phapLy && bdh.phapLy.loi === null && !boLocMatCuaNguoi(auth.session.email, auth.session.role).thay("phaply", bdh.dangChon)) {
    return NextResponse.json({
      ok: false,
      cau: "",
      loi: "Ẩn câu 🤖 — câu này viết từ cả số hồ sơ pháp lý của dự án, chỉ thành viên dự án xem được.",
      tuBoNho: false,
      dangViet: false,
    });
  }
  // Người xem mở màn KHÔNG sinh lượt LLM mới (quyen.ts cửa "ghi"): chỉ đọc câu đã viết trong ngày
  const kq = await chayVoiNguoiGoiAi(auth.session.email, () => layTomTatAi(bdh, auth.session.email, duocGhi(auth.session.role)));
  // dangViet = lượt viết còn chạy quá hạn chờ (QS-077) — màn hỏi lại sau vài giây, không gọi LLM lần hai
  return NextResponse.json({ ok: kq.ok, cau: kq.cau, dong: kq.dong ?? null, loi: kq.loi, tuBoNho: kq.tuBoNho, dangViet: kq.dangViet === true });
}

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const GET = bocRouteTrang("/api/bang-dieu-hanh/tom-tat", xuLyGET);
