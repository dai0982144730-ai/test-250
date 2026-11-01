// ============================================================
// API MÀN ISSUE CỦA MAIN — PLAN-MAIN-AGENT mục 8b
//
// GET  → gom issue của mọi agent đang bật + phân loại đã lưu
// POST { hanhDong: "phan-loai-lai" } → LLM xếp lại 8 nhóm chủ đề (8b.1)
//      { hanhDong: "can-anh-xem"   } → LLM chọn 5 việc kèm lý do (8b.3b)
//
// Hai hành động POST đều TỐN TOKEN nên chỉ chạy khi người bấm nút, không chạy
// lén mỗi lần mở trang.
// Server-only (fs + mạng).
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { canAccessProjectByEmail, maNganDuAn, resolveProjectId } from "@/lib/projects";
import { hoiAgent } from "@/lib/nguon/hoi-agent";
import { xoaBoNhoHoi } from "@/lib/nguon/bo-nho-hoi";
import { duLieuManIssue, soIssueDoGanNhat } from "@/lib/issue-main/man-hinh";
import { chayChonCanAnhXem, chayPhanLoaiLai } from "@/lib/issue-main/chay-llm";
import { anIssue, bacBoDeXuatAi, duyetDeXuatAi, xoaIssue } from "@/lib/canh-bao/so-issue";
import { bocRouteTrang } from "@/lib/nhat-ky/so";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { locManIssue, lyDoChanChonCanXem } from "@/lib/agent-mat-loc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function xuLyGET(request: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const projectId = resolveProjectId(searchParams.get("project") ?? undefined);
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, projectId)) {
    return NextResponse.json({ ok: false, message: "Không thuộc dự án này." }, { status: 403 });
  }
  // Menu trái chỉ cần số đỏ — đọc số đệm của lần gom gần nhất, không hỏi mạng
  // ⭐ 05/10 luật agent mật: thẻ issue của Agent Hợp đồng chỉ hiện cho người được thấy hợp đồng dự án này
  const loc = boLocMatCuaNguoi(auth.session.email, auth.session.role);
  if (searchParams.get("chi_dem") === "1") {
    // 18/10/2026: số đỏ menu trái chỉ đếm thẻ người xem thấy được
    return NextResponse.json({ ok: true, ...(soIssueDoGanNhat(projectId, loc) ?? { luc: null, soDo: null }) });
  }
  const goc = await duLieuManIssue(projectId);
  const dat = locManIssue(goc, loc, projectId);
  return NextResponse.json({ ok: true, ...dat, lyDoChanCanXem: lyDoChanChonCanXem(goc.issue.length - dat.issue.length) });
}

async function xuLyPOST(request: Request) {
  // Chạy LLM là việc tốn tiền — cửa "ghi" (quyen.ts): Người xem không được bấm
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Nội dung gửi lên không hợp lệ." },
      { status: 400 }
    );
  }

  const projectId = resolveProjectId(
    typeof body.project === "string" ? body.project : undefined
  );
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, projectId)) {
    return NextResponse.json({ ok: false, message: "Không thuộc dự án này." }, { status: 403 });
  }

  const nguoi = auth.session.email.split("@")[0];
  // Dữ liệu trả lại sau mỗi hành động cũng qua bộ lọc agent mật (05/10)
  const loc = boLocMatCuaNguoi(auth.session.email, auth.session.role);
  const xemLoc = async () => locManIssue(await duLieuManIssue(projectId), loc, projectId);
  const hanhDong = String(body.hanhDong ?? "");
  const dat = await duLieuManIssue(projectId);
  // ⭐ 18/10/2026: hai nút 🤖 chỉ đưa AI những thẻ NGƯỜI BẤM được thấy (thẻ Hợp đồng / Pháp lý / Công việc bị ẩn với người
  // ngoài dự án không lọt vào câu hỏi). Phân loại cũ của thẻ bị ẩn được GIỮ khi lưu — người thấy hết không mất nhóm.
  const thay = locManIssue(dat, loc, projectId).issue;
  const coThe = new Set(thay.map((i) => i.id));
  const idAn = dat.issue.filter((i) => !coThe.has(i.id)).map((i) => i.id);

  switch (hanhDong) {
    case "phan-loai-lai": {
      const kq = await chayVoiNguoiGoiAi(auth.session.email, () => chayPhanLoaiLai(thay, projectId, nguoi, idAn));
      return NextResponse.json({
        ok: kq.ok,
        message: kq.message,
        ...(await xemLoc()),
      });
    }
    case "can-anh-xem": {
      // 18/10/2026: chỉ người thấy HẾT thẻ của dự án mới chọn — bản chọn lưu chung cho cả dự án
      const chan = lyDoChanChonCanXem(idAn.length);
      if (chan) return NextResponse.json({ ok: false, message: chan, ...(await xemLoc()) }, { status: 403 });
      const kq = await chayVoiNguoiGoiAi(auth.session.email, () => chayChonCanAnhXem(thay, projectId, nguoi));
      return NextResponse.json({
        ok: kq.ok,
        message: kq.message,
        ...(await xemLoc()),
      });
    }
    // ── 01/11/2026 (Mr. Đại: «lãnh đạo dùng Main — nơi nào cũng giao và bỏ qua được») ──
    // Hai nút trên thẻ issue của AGENT KHÁC: «✎ AI soạn việc giao» · «Bỏ qua». Main không tự làm — gọi cổng agent gốc chạy thay
    // người bấm (ma_nguoi_dung); agent gốc kiểm lại quyền theo dự án. Cùng đường với nút trên màn Cảnh báo của agent đó.
    case "soan-viec-issue":
    case "bo-qua-issue": {
      const agent = String(body.agent ?? "");
      const idIssue = String(body.id ?? "");
      const the = thay.find((i) => i.id === idIssue && i.agentChu === agent);
      if (!the) return NextResponse.json({ ok: false, message: "Không thấy issue này trên màn Cảnh báo của bạn." }, { status: 404 });
      const maDuAn = the.maDuAn || maNganDuAn(projectId) || projectId;
      const soan = hanhDong === "soan-viec-issue";
      const kq = await hoiAgent(
        agent,
        `${agent}.${soan ? "soan_viec_tu_issue" : "bo_qua_issue"}`,
        `Cảnh báo Main — người bấm «${soan ? "✎ AI soạn việc giao" : "Bỏ qua"}» trên issue ${idIssue}`,
        {
          tham_so: soan ? { id: idIssue, ma_du_an: maDuAn, van_soan: body.vanSoan === true } : { id: idIssue, ma_du_an: maDuAn },
          ma_nguoi_dung: auth.session.email,
          // AI soạn + hỏi trùng 4 agent (luật 33) có thể mất cả phút
          hanChoMs: soan ? 180_000 : 20_000,
          khongThuLai: true,
        },
      );
      // Bỏ số nhớ 10 phút để lần tải sau đọc mới — cả khi agent từ chối (vd «đã giao việc CV-…»: số nhớ cũ đã lạc hậu)
      xoaBoNhoHoi();
      if (!kq.ok) return NextResponse.json({ ok: false, message: `${the.tenAgentChu}: ${kq.thong_diep}` }, { status: 400 });
      const du = (kq.du_lieu ?? {}) as { trung?: string; nhap?: unknown };
      return NextResponse.json({
        ok: true,
        message: soan
          ? du.trung
            ? `🤖 ${du.trung}`
            : "Đã soạn nháp giao việc — chọn người nhận rồi bấm Giao việc ngay dưới thẻ."
          : `Đã bỏ qua — ${the.tenAgentChu} không hiện, không đếm issue này nữa; xem lại được 30 ngày ở màn Cảnh báo của ${the.tenAgentChu}.`,
        trung: du.trung ?? null,
      });
    }
    // ── Chốt AQ / 6e.3 — ba nút, CHỈ trên issue do chính Main giữ sổ ──
    // Bốn hành động dưới đều đi vào SỔ NỘI BỘ của Main; issue của agent khác
    // không nằm trong sổ đó nên tự nhiên bị chặn (chốt BC — sửa ở agent chủ).
    case "an": {
      const r = anIssue(String(body.id ?? ""), body.an !== false, projectId);
      if (!r.ok) return NextResponse.json({ ok: false, message: r.loi }, { status: 400 });
      return NextResponse.json({
        ok: true,
        message:
          body.an !== false
            ? "Đã ẩn — issue vẫn nằm trong sổ và VẪN ĐẾM vào tổng. Bấm «👁 Hiện tất cả» để xem lại."
            : "Đã bỏ ẩn.",
        ...(await xemLoc()),
      });
    }
    case "xoa": {
      const r = xoaIssue(String(body.id ?? ""), String(body.lyDo ?? ""), auth.session.name, projectId);
      if (!r.ok) return NextResponse.json({ ok: false, message: r.loi }, { status: 400 });
      return NextResponse.json({
        ok: true,
        message: "Đã xoá và ghi lý do vào Sổ đã bác — bộ sinh sẽ KHÔNG sinh lại issue này.",
        ...(await xemLoc()),
      });
    }
    // Thẻ DX- (Main tự sinh, chưa vào sổ) — demo vẽ nút Duyệt / Bác ngay trên thẻ
    case "duyet": {
      const r = duyetDeXuatAi(String(body.id ?? ""), auth.session.name, new Date().toISOString().slice(0, 10), projectId);
      if (!r.ok) return NextResponse.json({ ok: false, message: r.loi }, { status: 400 });
      return NextResponse.json({
        ok: true,
        message: "Đã duyệt — đề xuất vào sổ thành issue chính thức (mã ISS mới).",
        ...(await xemLoc()),
      });
    }
    case "bac-bo": {
      const r = bacBoDeXuatAi(String(body.id ?? ""), String(body.lyDo ?? ""), projectId);
      if (!r.ok) return NextResponse.json({ ok: false, message: r.loi }, { status: 400 });
      return NextResponse.json({
        ok: true,
        message: "Đã bác bỏ — lý do được lưu để đo AI sai bao nhiêu.",
        ...(await xemLoc()),
      });
    }
    default:
      return NextResponse.json(
        {
          ok: false,
          message: `Không hiểu hành động "${hanhDong}". Có: phan-loai-lai · can-anh-xem · soan-viec-issue · bo-qua-issue · an · xoa · duyet · bac-bo.`,
        },
        { status: 400 }
      );
  }
}

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const GET = bocRouteTrang("/api/issue-main", xuLyGET);

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const POST = bocRouteTrang("/api/issue-main", xuLyPOST);
