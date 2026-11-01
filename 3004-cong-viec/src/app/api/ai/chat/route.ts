// ============================================================
// POST /api/ai/chat — MỘT LƯỢT trò chuyện với Trợ lý SCI công việc (mọi người đã đăng nhập).
//   body { sessionId, message, dinhKem?, dinhDangXuat?, keHoachDaDuyet?, timWebBat? }
//   → { ok, reply, actions, uiActions, session, keHoachChoDuyet? }
//   → 400 thiếu câu hỏi / AI đang tắt · 404 phiên không có · 502 gọi mô hình thất bại
// Lấy nguyên luồng bản gốc: tin người dùng lưu NGAY (trước khi gọi AI) để không mất
// câu hỏi khi mô hình lỗi; tin trợ lý (kèm actions) lưu sau. Xuất file theo yêu cầu
// đi luồng riêng. Bỏ: dự án đang mở, trang hiện tại cho tự thao tác (riêng tiến độ).
// ============================================================

import { batBuocDangNhap, LoiHttp, thietBi, xuLy } from "@/lib/phien";
import { layQ } from "@/lib/db";
import { runChatAgent } from "@/lib/ai/chat-agent";
import { chayUuTien } from "@/lib/ai/uu-tien";
import { appendMessage, createSession, getSession, isValidSessionId, saveSession, toMeta } from "@/lib/ai/chat-store";
import { titleFromMessage, type ChatSession } from "@/lib/ai/chat-types";
import { getAIConfig, isAIConfigured } from "@/lib/ai/providers";
import { modelHieuLuc } from "@/lib/ai/model-rieng";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docJson } from "@/lib/ai/route-chung";
import {
  DANH_SACH_DINH_DANG,
  canDuyetKeHoach,
  lapKeHoachXuat,
  phatHienYDinhXuat,
  xuatTheoYeuCau,
  type DinhDangXuat,
} from "@/lib/tro-ly/xuat-theo-yeu-cau";
import { TRAN_CHU_TEP, TRAN_SO_TEP, khoiChuDinhKem, type TepDinhKem } from "@/lib/tro-ly/dinh-kem-chung";
import { dangLamBaoCao, lamBaoCao } from "@/lib/tro-ly/lam-bao-cao";
import { locLinkTraLoi } from "@/lib/ai/trang-co-that";
import { ganTenChoMaViec } from "@/lib/ai/gan-ten-ma";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Giới hạn độ dài câu hỏi (chống prompt khổng lồ) */
const MAX_MESSAGE_CHARS = 4000;

export async function POST(req: Request): Promise<Response> {
  // Người đang chờ trả lời: mọi lượt AI của câu này chen trước việc AI nền trong hàng chờ (chốt 02/10, lib/ai/uu-tien.ts)
  return xuLy(() => chayUuTien(async () => {
    const nd = await batBuocDangNhap();
    const body = await docJson(req);

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (message === "") throw new LoiHttp(400, "Chưa có nội dung câu hỏi.");
    if (message.length > MAX_MESSAGE_CHARS) throw new LoiHttp(400, `Câu hỏi quá dài (tối đa ${MAX_MESSAGE_CHARS.toLocaleString("vi-VN")} ký tự).`);

    if (!isAIConfigured(getAIConfig())) {
      throw new LoiHttp(400, "Kết nối AI chưa bật — quản trị viên bật ở Cài đặt → AI → Kết nối AI.");
    }

    // Phiên: có id → phải tồn tại; không gửi id → tạo phiên mới cho tiện
    const sessionIdRaw = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    let session: ChatSession;
    if (sessionIdRaw === "") {
      session = createSession(nd.id, nd.email, message);
    } else {
      if (!isValidSessionId(sessionIdRaw)) throw new LoiHttp(400, "Sai id phiên chat.");
      const found = getSession(nd.id, sessionIdRaw);
      if (!found) throw new LoiHttp(404, "Không tìm thấy phiên chat.");
      session = found;
    }

    // FILE ĐÍNH KÈM: client đã gọi /api/tro-ly/dinh-kem bóc chữ; ở đây chỉ nhận lại
    // chữ đó ghép vào câu hỏi gửi AI. Sổ chat vẫn lưu câu hỏi GỐC (không phình file).
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
    const timWebBat = body.timWebBat === true || body.timWebBat === "1";

    const history = session.messages.slice();
    const needTitle = session.title.trim() === "" || session.title.trim() === "Phiên mới";
    const messageLuu = dinhKem.length === 0 ? message : `${message}\n\n📎 Đính kèm: ${dinhKem.map((t) => t.ten).join(" · ")}`;
    session = appendMessage(session, "user", messageLuu);
    if (needTitle) session = { ...session, title: titleFromMessage(message) };
    session = saveSession(session); // lưu ngay — mất kết nối AI vẫn còn câu hỏi

    const q = await layQ();
    // Hai lưới cho mọi câu trả lời: bỏ link lạ (Mr. Đại 01/10 — link ngoài chỉ giữ khi người hỏi bật tìm web),
    // rồi gắn tên cho mã việc đứng trần (luật 30) + số ngày cho khoảng ngày (luật 31)
    const sach = (s: string) => ganTenChoMaViec(q, locLinkTraLoi(s, timWebBat).text);
    const { model, nguon: nguonModel } = await modelHieuLuc(q, nd.id);
    // P1 (02/10): vòng tra cứu chạy model nhanh — chỉ khi người KHÔNG tự chọn model riêng ở chip
    const modelVongCongCu = nguonModel === "cau_hinh" ? (await layCauHinh(q, "ai")).model_vong_cong_cu?.trim() || undefined : undefined;

    // ===== SKILL /lam-bao-cao (Mr. Đại chốt 01/10): CODE dẫn luồng, AI chỉ đọc lời người. Phiên đang làm dở một báo cáo thì
    // câu tiếp theo (không phải /skill khác) đi thẳng vào đây — người trả lời câu hỏi của máy không phải gõ lại lệnh.
    const goiLamBaoCao = /^\/(lam-bao-cao|tong-hop-bao-cao)(\s|$)/.test(message);
    if (goiLamBaoCao || (!/^\/[a-z0-9-]+/.test(message) && dangLamBaoCao(nd, session.id))) {
      let kq;
      try {
        kq = await lamBaoCao(q, nd, session.id, messageAI, model);
      } catch (e) {
        throw new LoiHttp(502, `Làm báo cáo lỗi: ${e instanceof Error ? e.message : String(e)}`);
      }
      // Câu không nhằm sửa báo cáo đang làm → rơi xuống trợ lý thường bên dưới (không trả lại bảng báo cáo cũ)
      if (!kq.chuyen) {
        kq.reply = await sach(kq.reply);
        try {
          session = saveSession(appendMessage(session, "assistant", kq.reply, []));
        } catch {
          /* mất lịch sử lượt này thì vẫn trả lời */
        }
        return { ok: true, reply: kq.reply, actions: [], uiActions: [], session: toMeta(session) };
      }
    }

    // Tên đơn vị của người hỏi (bối cảnh)
    let tenDonVi: string | null = null;
    if (nd.don_vi_id) {
      const r = await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [nd.don_vi_id]);
      tenDonVi = r.rows[0]?.ten ?? null;
    }

    // ===== XUẤT FILE THEO YÊU CẦU (lấy nguyên bộ xuất của khung chat) =====
    const ddChon = typeof body.dinhDangXuat === "string" ? body.dinhDangXuat : "";
    // /lam-bao-cao tự ra file Word đúng mẫu bằng code — không đi bộ xuất chung (chữ "làm báo cáo" dễ bị nhận nhầm là ý định xuất)
    const laLamBaoCao = /^\/(lam-bao-cao|tong-hop-bao-cao)(\s|$)/.test(message.trim());
    const ddXuat = laLamBaoCao ? null : (DANH_SACH_DINH_DANG as string[]).includes(ddChon) ? (ddChon as DinhDangXuat) : phatHienYDinhXuat(message);
    if (ddXuat) {
      const keHoachDaDuyet = typeof body.keHoachDaDuyet === "string" ? body.keHoachDaDuyet.trim() : "";
      // P3 (Mr. Đại duyệt 02/10): bìa slide / đầu file ghi đơn vị NGƯỜI HỎI — test đêm 01/10 bìa ghi "Đơn vị: Chưa có thông tin"
      const ngayLap = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10).split("-").reverse().join("/");
      const cauXuat = `${messageAI}\n\n(Người yêu cầu: ${nd.ten}${tenDonVi ? ` — ${tenDonVi}` : ""}. Trang bìa / dòng "Đơn vị" của file ghi đơn vị này; ngày lập ${ngayLap}.)`;
      // MỌI yêu cầu xuất file (gõ /skill hay câu thường): chạy trợ lý + công cụ sổ cái TRƯỚC để có số liệu thật, rồi mới dựng file
      // từ câu trả lời đó. Trước 01/10 chỉ nhánh /skill làm vậy (lỗi L2); test đêm 02/10 X-1: "xuất danh sách việc quá hạn phòng tôi
      // ra excel" ra file toàn "Chưa có thông tin", 0 dòng — trong khi phòng có 4 việc quá hạn.
      if (keHoachDaDuyet === "") {
        let kqDuLieu;
        try {
          // Báo trước cho lượt lấy số liệu: MÁY sẽ tự dựng file — test đêm 02/10 X-2: lượt này viết "em chưa xuất được file slide,
          // hệ thống chưa có công cụ tạo file trình chiếu" ngay trên link tải file .pptx vừa dựng xong
          const loiDan = `\n\n(Ghi chú của hệ thống: sau câu trả lời này MÁY sẽ tự dựng file ${ddXuat.toUpperCase()} từ số liệu anh/chị đưa ra. Chỉ cần tra và trình bày ĐỦ số liệu thật cho file; KHÔNG nói "chưa xuất được file" hay "không có công cụ tạo file", KHÔNG hướng dẫn người dùng tự chép sang phần mềm khác.)`;
          kqDuLieu = await runChatAgent({ nd, message: messageAI + loiDan, history, timWebBat, model, modelVongCongCu, tenDonVi, thietBi: thietBi() });
        } catch (e) {
          throw new LoiHttp(502, `Gọi AI thất bại: ${e instanceof Error ? e.message : String(e)}`);
        }
        const lichSu = history.concat([{ id: "du-lieu", role: "assistant", content: kqDuLieu.reply, at: new Date().toISOString() }]);
        if (canDuyetKeHoach(message, ddXuat)) {
          const kh = await lapKeHoachXuat(ddXuat, cauXuat, lichSu, model);
          if (kh.ok) {
            // Số liệu đi kèm kế hoạch (lưu vào phiên) → lúc bấm Duyệt, bộ dựng file đọc được số liệu từ lịch sử
            const reply = await sach(
              `${kqDuLieu.reply}\n\n---\n\n📋 **Kế hoạch tạo file ${ddXuat.toUpperCase()}** — anh/chị xem rồi bấm **Duyệt & tạo file** (sửa được trước khi duyệt):\n\n${kh.keHoach}`,
            );
            try {
              session = saveSession(appendMessage(session, "assistant", reply, kqDuLieu.actions));
            } catch {
              /* mất lịch sử lượt này thì vẫn trả lời */
            }
            return {
              ok: true,
              reply,
              actions: kqDuLieu.actions,
              uiActions: kqDuLieu.uiActions,
              keHoachChoDuyet: { dinhDang: ddXuat, keHoach: kh.keHoach, cauHoi: message },
              session: toMeta(session),
            };
          }
        }
        const kqXuat = await xuatTheoYeuCau(ddXuat, cauXuat, lichSu, undefined, model, nd.id);
        const reply = await sach(`${kqDuLieu.reply}\n\n---\n\n${kqXuat.reply}`);
        try {
          session = saveSession(appendMessage(session, "assistant", reply, kqDuLieu.actions));
        } catch {
          /* mất lịch sử lượt này thì vẫn trả lời */
        }
        return { ok: true, reply, actions: kqDuLieu.actions, uiActions: kqDuLieu.uiActions, session: toMeta(session) };
      }
      // Đã bấm Duyệt kế hoạch: số liệu nằm trong lịch sử phiên (lưu cùng kế hoạch ở trên)
      const kqXuat = await xuatTheoYeuCau(ddXuat, cauXuat, history, keHoachDaDuyet || undefined, model, nd.id);
      kqXuat.reply = await sach(kqXuat.reply);
      try {
        session = saveSession(appendMessage(session, "assistant", kqXuat.reply, []));
      } catch {
        /* mất lịch sử lượt này thì vẫn trả lời */
      }
      return { ok: true, reply: kqXuat.reply, actions: [], uiActions: [], session: toMeta(session) };
    }

    let result;
    try {
      result = await runChatAgent({ nd, message: messageAI, history, timWebBat, model, modelVongCongCu, tenDonVi, thietBi: thietBi() });
    } catch (e) {
      throw new LoiHttp(502, `Gọi AI thất bại: ${e instanceof Error ? e.message : String(e)}`);
    }

    result.reply = await sach(result.reply);
    try {
      session = saveSession(appendMessage(session, "assistant", result.reply, result.actions));
    } catch {
      /* ghi file lỗi → vẫn trả lời, chỉ mất lịch sử lượt này */
    }

    return { ok: true, reply: result.reply, actions: result.actions, uiActions: result.uiActions, session: toMeta(session) };
  }));
}
