// ============================================================
// POST /api/ai/chat — MỘT LƯỢT trò chuyện với trợ lý AI (pm | engineer).
//   body { sessionId, message } (+ ?project=<id>)
//   → { ok, reply, actions: ExecutedAction[], uiActions: UiAction[],
//       choDuyet: ViecChoGon[], session: ChatSessionMeta }
// Công cụ GHI KHÔNG chạy trong lượt này: qua cổng quyền (kiemCongCu) thì vào
// kho chờ, người bấm ✅ Làm ở khung chat → POST /api/ai/chat/xac-nhan mới chạy.
//   → 400 khi chưa cấu hình kết nối AI · 404 khi phiên không tồn tại
//   → 502 khi gọi mô hình thất bại
// Tin nhắn NGƯỜI DÙNG được lưu NGAY (trước khi gọi AI) để không mất câu hỏi
// khi mô hình lỗi; tin trợ lý (kèm actions) lưu sau khi có kết quả.
// HỢP ĐỒNG: xem comment đầu src/lib/ai/chat-types.ts.
// ============================================================

import { NextResponse } from "next/server";
import { runChatAgent } from "@/lib/ai/chat-agent";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { chayUuTien } from "@/lib/ai/uu-tien";
import { themViecCho, viecChoCuaPhien } from "@/lib/ai/cho-duyet-kho";
import {
  appendMessage,
  createSession,
  getSessionCuaNguoi,
  isValidSessionId,
  saveSession,
  toMeta,
} from "@/lib/ai/chat-store";
import { titleFromMessage, type ChatSession } from "@/lib/ai/chat-types";
import { getAIConfig, isAIConfigured } from "@/lib/ai/providers";
import {
  DANH_SACH_DINH_DANG,
  canDuyetKeHoach,
  lapKeHoachXuat,
  phatHienYDinhXuat,
  xuatTheoYeuCau,
  type DinhDangXuat,
} from "@/lib/tro-ly/xuat-theo-yeu-cau";
import {
  TRAN_CHU_TEP,
  TRAN_SO_TEP,
  khoiChuDinhKem,
  type TepDinhKem,
} from "@/lib/tro-ly/dinh-kem-chung";
import { canAccessProjectByEmail, resolveProjectId } from "@/lib/projects";
import { requireRole } from "@/lib/route-auth";
import { duocCaiDat, duocGhi, LY_DO_CHAN, LY_DO_TRO_LY, NHAN_LOAI } from "@/lib/quyen";
import { chayGocChuoi, rutTraLoiJson } from "@/lib/nhat-ky/so";
import { KENH_GOC } from "@/lib/nhat-ky/khuon-so";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Giới hạn độ dài câu hỏi (chống prompt khổng lồ) */
const MAX_MESSAGE_CHARS = 4000;

/**
 * ⭐ Khuôn sổ bản 2 (HOP-DONG-KET-NOI 7.1, 26/09/2026): mỗi câu chat là MỘT chuỗi.
 * Mọi lượt trợ lý hỏi agent khác / LLM trong câu này mang cùng mã chuỗi; xong việc
 * ghi dòng gốc `troly.chat` (câu người hỏi → câu trả lời cuối gửi người dùng).
 * Body không có câu hỏi (sai khuôn) thì chạy thẳng, không mở chuỗi.
 */
export async function POST(req: Request): Promise<NextResponse> {
  let cauHoi = "";
  try {
    const b = (await req.clone().json()) as { message?: unknown };
    cauHoi = typeof b?.message === "string" ? b.message.trim() : "";
  } catch {
    // body hỏng — route tự trả 400
  }
  if (cauHoi === "") return xuLyCauChat(req);
  return chayGocChuoi(
    {
      kenh: KENH_GOC.chat,
      lyDoGoi: "người dùng hỏi trợ lý chat trên web",
      cauHoi,
      duong: "A",
      duAn: new URL(req.url).searchParams.get("project") ?? undefined,
    },
    () => xuLyCauChat(req),
    (res) => rutTraLoiJson(res, "reply"),
  );
}

async function xuLyCauChat(req: Request): Promise<NextResponse> {
  // Người xem KHÔNG dùng trợ lý AI trong mọi tình huống (Mr. Đại chốt 04/10 — tốn chi phí công ty)
  const auth = await requireRole("ghi", LY_DO_TRO_LY);
  if (!auth.ok) return auth.response;

  const projectId = resolveProjectId(new URL(req.url).searchParams.get("project"));
  if (!canAccessProjectByEmail(auth.session.email, auth.session.role, projectId)) {
    return NextResponse.json(
      { ok: false, message: "Bạn không có quyền truy cập dự án này." },
      { status: 403 }
    );
  }
  const email = auth.session.email;
  // Bậc lệnh trợ lý: lệnh sổ lệnh khai vai "pm" = bậc Cài đặt → PM + Admin (quyen.ts)
  const role: "pm" | "engineer" = duocCaiDat(auth.session.role) ? "pm" : "engineer";
  const tenLoai = NHAN_LOAI[auth.session.role];
  // Người xem: chat được (quyen.ts cửa "xem"), nhưng công cụ GHI của trợ lý bị chặn
  const chiXem = !duocGhi(auth.session.role);

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not object");
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body phải là JSON { sessionId, message }." },
      { status: 400 }
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message === "") {
    return NextResponse.json(
      { ok: false, message: "Chưa có nội dung câu hỏi." },
      { status: 400 }
    );
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { ok: false, message: `Câu hỏi quá dài (tối đa ${MAX_MESSAGE_CHARS.toLocaleString("vi-VN")} ký tự).` },
      { status: 400 }
    );
  }

  // Kẹp file = cửa GHI (ma trận 6g.5, 26/09): Người xem gửi thẳng dinhKem (bỏ qua nút
  // 📎 mờ) cũng bị chặn — TRƯỚC khi tạo phiên, lưu câu hỏi hay gọi AI.
  if (Array.isArray(body.dinhKem) && body.dinhKem.length > 0 && !duocGhi(auth.session.role)) {
    return NextResponse.json({ ok: false, message: LY_DO_CHAN.ghi }, { status: 403 });
  }

  // Chưa bật / chưa đủ cấu hình AI → 400 hướng dẫn vào Cài đặt
  if (!isAIConfigured(getAIConfig())) {
    return NextResponse.json(
      { ok: false, message: "Chưa cấu hình kết nối AI — vào Cài đặt → Kết nối AI." },
      { status: 400 }
    );
  }

  // Phiên: có id → phải tồn tại; không gửi id → tạo phiên mới cho tiện
  const sessionIdRaw = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
  let session: ChatSession;
  try {
    if (sessionIdRaw === "") {
      session = createSession(projectId, email, message);
    } else {
      if (!isValidSessionId(sessionIdRaw)) {
        return NextResponse.json({ ok: false, message: "Sai id phiên chat." }, { status: 400 });
      }
      // Chỉ hỏi tiếp trong phiên CHÍNH mình (chốt 04/10) — phiên người khác = 404
      const found = getSessionCuaNguoi(projectId, sessionIdRaw, email);
      if (!found) {
        return NextResponse.json(
          { ok: false, message: "Không tìm thấy phiên chat." },
          { status: 404 }
        );
      }
      session = found;
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: `Không mở được phiên chat: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 }
    );
  }

  // ===== FILE ĐÍNH KÈM (B1) =====
  // Client đã gọi /api/tro-ly/dinh-kem bóc chữ; ở đây chỉ nhận lại chữ đó và
  // ghép vào câu hỏi gửi AI. SỔ CHAT vẫn lưu câu hỏi GỐC (không phình file).
  const dinhKem: TepDinhKem[] = Array.isArray(body.dinhKem)
    ? (body.dinhKem as unknown[])
        .filter((t): t is TepDinhKem => {
          if (t === null || typeof t !== "object") return false;
          const o = t as Record<string, unknown>;
          return typeof o.ten === "string" && typeof o.chu === "string";
        })
        .slice(0, TRAN_SO_TEP)
        .map((t) => ({ ...t, chu: t.chu.slice(0, TRAN_CHU_TEP) }))
    : [];
  const messageAI = message + khoiChuDinhKem(dinhKem);

  // Trang người dùng đang mở — client chỉ gửi khi bật nút Tự thao tác. Có nó
  // thì agent được kèm sẵn bảng lệnh của trang, khỏi tiêu vòng đi hỏi.
  const trangHienTai =
    typeof body.trangHienTai === "string" && /^\/[a-z0-9-]{0,40}$/.test(body.trangHienTai)
      ? body.trangHienTai
      : undefined;

  // 🌐 Người dùng có bật tìm trên internet không (06/09) — mặc định TẮT.
  const timWebBat = body.timWebBat === true || body.timWebBat === "1";

  // Lịch sử TRƯỚC câu hỏi mới (agent tự nhét câu hỏi mới vào prompt)
  const history = session.messages.slice();

  // Phiên chưa đặt tên → lấy câu hỏi đầu tiên làm tiêu đề
  const needTitle = session.title.trim() === "" || session.title.trim() === "Phiên mới";
  // Lịch sử ghi thêm tên file kẹp kèm để lượt sau còn biết câu hỏi dựa vào đâu
  const messageLuu =
    dinhKem.length === 0
      ? message
      : `${message}

📎 Đính kèm: ${dinhKem.map((t) => t.ten).join(" · ")}`;
  session = appendMessage(session, "user", messageLuu);
  if (needTitle) session = { ...session, title: titleFromMessage(message) };
  try {
    session = saveSession(session); // lưu ngay — mất kết nối AI vẫn còn câu hỏi
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: `Không lưu được tin nhắn: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 }
    );
  }

  // ===== XUẤT FILE THEO YÊU CẦU (S8 tầng 2, port bộ pháp lý) =====
  // Người bấm nút định dạng dưới ô nhập (dinhDangXuat) HOẶC AI tự phát hiện ý
  // định từ câu hỏi ("xuất pptx...", "làm file kml...") → đi luồng sinh file,
  // không đi vòng lặp công cụ.
  const ddChon = typeof body.dinhDangXuat === "string" ? body.dinhDangXuat : "";
  const ddXuat =
    (DANH_SACH_DINH_DANG as string[]).includes(ddChon)
      ? (ddChon as DinhDangXuat)
      : phatHienYDinhXuat(message);
  if (ddXuat) {
    const keHoachDaDuyet =
      typeof body.keHoachDaDuyet === "string" ? body.keHoachDaDuyet.trim() : "";

    // BƯỚC DUYỆT KẾ HOẠCH (port bản pháp lý): yêu cầu phức tạp mà CHƯA có kế
    // hoạch duyệt → lượt này chỉ trình bày sẽ làm gì, người bấm Duyệt mới chạy
    if (keHoachDaDuyet === "" && canDuyetKeHoach(message, ddXuat)) {
      const kh = await lapKeHoachXuat(ddXuat, messageAI, history, projectId, email);
      if (kh.ok) {
        const reply =
          `📋 **Kế hoạch tạo file ${ddXuat.toUpperCase()}** — bạn xem rồi bấm **Duyệt & tạo file** (sửa được trước khi duyệt):\n\n${kh.keHoach}`;
        try {
          session = saveSession(appendMessage(session, "assistant", reply, []));
        } catch {
          // mất lịch sử lượt này thì vẫn trả lời
        }
        return NextResponse.json({
          ok: true,
          reply,
          actions: [],
          uiActions: [],
          keHoachChoDuyet: { dinhDang: ddXuat, keHoach: kh.keHoach, cauHoi: message },
          session: toMeta(session),
        });
      }
      // Lập kế hoạch hỏng → đi thẳng xuất luôn, không chặn việc của người dùng
    }

    // Người đang chờ: lượt AI ghi sổ đúng người, đi trước việc nền, hết tài khoản công ty thì dùng tài khoản cá nhân của chính họ
    const kqXuat = await chayVoiNguoiGoiAi(email, () => chayUuTien(() => xuatTheoYeuCau(
      ddXuat,
      messageAI,
      history,
      projectId,
      email,
      keHoachDaDuyet || undefined
    )));
    try {
      session = saveSession(appendMessage(session, "assistant", kqXuat.reply, []));
    } catch {
      // mất lịch sử lượt này thì vẫn trả lời
    }
    return NextResponse.json({
      ok: true,
      reply: kqXuat.reply,
      actions: [],
      uiActions: [],
      session: toMeta(session),
    });
  }

  // Gọi vòng lặp agent (có thể chạy công cụ ghi dữ liệu)
  let result;
  try {
    // Người đang chờ (Quản lý token AI 04/10): ghi sổ đúng người, đi trước việc nền, dự phòng tài khoản Claude cá nhân
    result = await chayVoiNguoiGoiAi(email, () => chayUuTien(() => runChatAgent({
      projectId,
      email,
      role,
      loai: auth.session.role,
      chiXem,
      tenLoai,
      message: messageAI,
      // Cổng chống chèn lệnh chỉ xét câu người dùng GÕ — chữ trong file đính
      // kèm không được tính là "người dùng yêu cầu ghi"
      userMessage: message,
      history,
      trangHienTai,
      timWebBat,
      kenh: "web",
    })));
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: `Gọi AI thất bại: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 502 }
    );
  }

  // Lưu tin trợ lý (kèm các hành động đã chạy)
  try {
    session = saveSession(appendMessage(session, "assistant", result.reply, result.actions));
  } catch {
    // Ghi file lỗi → vẫn trả lời cho người dùng, chỉ mất lịch sử lượt này
  }

  // Công cụ GHI đã qua cổng quyền → vào kho chờ, khung chat hiện nút ✅ Làm / ❌ Bỏ
  // (MỘT kho, MỘT bộ chạy với Telegram — lib/ai/cho-duyet-kho.ts)
  for (const c of result.choDuyet) {
    themViecCho({
      kenh: "web",
      email,
      projectId,
      sessionId: session.id,
      name: c.name,
      args: c.args,
      cauHoi: message,
    });
  }

  return NextResponse.json({
    ok: true,
    reply: result.reply,
    actions: result.actions,
    uiActions: result.uiActions,
    // Mọi việc còn chờ của phiên này (kể cả lượt trước chưa bấm)
    choDuyet: viecChoCuaPhien(projectId, session.id, email, "web"),
    session: toMeta(session),
    // Đo tốc độ (26/09): số vòng mô hình · công cụ code tự hỏi sẵn · token ra
    doLuong: result.doLuong,
  });
}
