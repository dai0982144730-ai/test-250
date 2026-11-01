// ============================================================
// XỬ LÝ MỘT UPDATE TELEGRAM (server-only) — Mr. Đại chốt 25/09/2026
//
//   tin chữ    → lệnh (/start /giup /moi /noi) hoặc câu hỏi cho TRỢ LÝ MAIN
//   bấm nút    → ✅ Làm / ❌ Bỏ một công cụ GHI đang chờ
//
// Danh tính: đọc users.json NGAY lúc nhận (timNguoiTheoTelegram) — đổi loại /
// khoá / xoá tài khoản có hiệu lực tức thì. Chưa nối · bị khoá · Người xem →
// KHÔNG gọi AI, trả câu lý do. Trợ lý chạy đúng email + loại của người nhắn,
// cùng cổng quyền của trợ lý web (kiemCongCu trong chat-tools.ts).
// Phiên: mỗi người một phiên "Telegram" trong kho phiên chat của Main (xem
// được trên website, cùng lịch sử); /moi mở phiên mới.
// Mỗi chat xử lý TUẦN TỰ (hàng đợi theo chat) — hai tin liền nhau không ghi
// đè phiên của nhau.
// 26/10/2026 (Mr. Đại gật): câu hỏi đi tới AI được báo ⏳ «đã nhận» NGAY lúc nhận (kể cả khi
// đang xếp hàng sau câu trước — báo «xếp thứ N»), câu trả lời gửi dạng trả lời vào đúng câu hỏi,
// có câu trả lời rồi thì xoá tin ⏳. Xoá rồi gửi tin mới (không sửa tin ⏳ thành câu trả lời)
// vì sửa tin không rung chuông — người rời app sẽ không biết đã có trả lời.
// ============================================================

import { runChatAgent } from "@/lib/ai/chat-agent";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { chayUuTien } from "@/lib/ai/uu-tien";
import { xuLyViecCho } from "@/lib/ai/cho-duyet-kho";
import { appendMessage, createSession, getSession, getSessionCuaNguoi, saveSession } from "@/lib/ai/chat-store";
import type { ChatMessage, UiAction } from "@/lib/ai/chat-types";
import { getAIConfig, isAIConfigured, runAIDo } from "@/lib/ai/providers";
import { TRAN_KY_TU, catCau, catTheoTran, chonLichSu, promptTomTat, tinTomTat } from "./lich-su-ngay";
import { canAccessProjectByEmail, getProject, listProjects } from "@/lib/projects";
import { timNguoiTheoTelegram } from "@/lib/users";
import { diaChiMain } from "@/lib/keo-cau-hinh";
import { gioVn } from "@/lib/gio-vn";
import { goNut, guiDangGo, guiTin, suaTin, traLoiNut, xoaTin, type CallbackTg, type TinTg, type UpdateTg } from "./api-tg";
import { demMotTin, docLoiTom, docPhien, docTomTat, docViecCho, ghiLoiTom, ghiPhien, ghiSo, ghiTomTat, suaViecCho, themViecCho, type PhienTg } from "./kho";
import { dungMaNoi } from "./noi-tai-khoan";
import {
  CAU_DEN_LUOT,
  TRAN_CAU_HOI,
  cauDaNhan,
  cauLoiAI,
  docLenh,
  gonChoTelegram,
  loiChao,
  maHoaHtml,
  moTaViecCho,
  rutGon,
  thanhCacTin,
  xetNguoiNhan,
  type KetQuaXet,
} from "./thuan";
import { chayGocChuoi } from "@/lib/nhat-ky/so";
import { KENH_GOC } from "@/lib/nhat-ky/khuon-so";

declare global {
  // eslint-disable-next-line no-var
  var __tgHangCho: Map<string, Promise<void>> | undefined;
  // eslint-disable-next-line no-var
  var __tgCauDangCho: Map<string, number> | undefined;
}

/** Số câu hỏi AI đang trong hàng của một chat (kể cả câu đang chạy) — cộng `them` rồi trả số mới */
function demCauCho(chatId: string, them: number): number {
  const m = (globalThis.__tgCauDangCho ??= new Map());
  const n = Math.max(0, (m.get(chatId) ?? 0) + them);
  if (n === 0) m.delete(chatId);
  else m.set(chatId, n);
  return n;
}

/** Xếp việc của một chat vào hàng — chạy sau việc trước của CHÍNH chat đó */
export function xepHang(chatId: string, viec: () => Promise<void>): Promise<void> {
  const hang = (globalThis.__tgHangCho ??= new Map());
  const truoc = hang.get(chatId) ?? Promise.resolve();
  const sau = truoc.then(viec).catch(() => undefined);
  hang.set(chatId, sau);
  void sau.then(() => {
    if (hang.get(chatId) === sau) hang.delete(chatId);
  });
  return sau;
}

/** Gửi câu trả lời (Markdown của trợ lý) — chia khúc, đổi HTML an toàn. `traLoiTin`: khúc đầu trả lời vào câu hỏi */
async function guiTraLoi(chatId: string, md: string, traLoiTin?: number): Promise<string | null> {
  let dau = true;
  for (const tin of thanhCacTin(md, diaChiMain())) {
    const kq = await guiTin(chatId, tin, undefined, dau ? { traLoiTin } : {});
    dau = false;
    if (!kq.ok) return kq.loi ?? "gửi tin thất bại";
  }
  return null;
}

async function guiChu(chatId: string, chu: string, traLoiTin?: number): Promise<void> {
  await guiTin(chatId, maHoaHtml(chu), undefined, { traLoiTin });
}

/** Xét người nhắn từ sổ người dùng — đọc MỚI mỗi lần */
export function xetChat(chatId: string): KetQuaXet {
  const u = timNguoiTheoTelegram(chatId);
  return xetNguoiNhan(u ? { email: u.email, name: u.name, role: u.role, active: u.active } : null);
}

// ===== Phiên "Telegram" =====

function duAnMacDinh(email: string, role: string): string | null {
  return listProjects().find((p) => canAccessProjectByEmail(email, role, p.id))?.id ?? null;
}

function tenPhienMoi(): string {
  const g = gioVn(new Date());
  return `Telegram ${g.ngay.slice(8, 10)}/${g.ngay.slice(5, 7)} ${g.gio.slice(0, 5)}`;
}

/** Phiên Telegram hiện tại của người này; mất/khác quyền thì mở phiên mới */
export function layPhienTelegram(email: string, role: string, moiHan = false, duAnEp?: string): PhienTg | null {
  const cu = docPhien(email);
  if (
    !moiHan &&
    !duAnEp &&
    cu &&
    getProject(cu.projectId) &&
    canAccessProjectByEmail(email, role, cu.projectId) &&
    getSessionCuaNguoi(cu.projectId, cu.sessionId, email) // phiên đã ghi phải đúng của người này (04/10)
  ) {
    return cu;
  }
  const projectId =
    duAnEp && canAccessProjectByEmail(email, role, duAnEp)
      ? duAnEp
      : cu && getProject(cu.projectId) && canAccessProjectByEmail(email, role, cu.projectId)
        ? cu.projectId
        : duAnMacDinh(email, role);
  if (!projectId) return null;
  const s = createSession(projectId, email, cu || moiHan ? tenPhienMoi() : "Telegram");
  const p = { projectId, sessionId: s.id };
  ghiPhien(email, p);
  return p;
}

/** Phiên Telegram đang dùng của người này mở từ ngày (giờ VN) trước hôm nay? */
function phienTuHomTruoc(email: string): boolean {
  const cu = docPhien(email);
  if (!cu) return false;
  const s = getSession(cu.projectId, cu.sessionId);
  if (!s) return false;
  const tao = new Date(s.createdAt);
  // Ngày tạo hỏng (kiểm độc lập TG-12) → coi như phiên cũ, mở phiên mới thay vì lỗi «Invalid time value»
  if (Number.isNaN(tao.getTime())) return true;
  return gioVn(tao).ngay !== gioVn(new Date()).ngay;
}

/** Hạn chót một lượt tóm — quá thì dùng lịch sử cắt theo trần, người hỏi không phải chờ (kiểm độc lập TG-02) */
const HAN_TOM_MS = 25_000;
/** Tóm lỗi thì nghỉ ngần này mới thử lại (TG-03) */
const NGHI_SAU_LOI_MS = 10 * 60_000;

/**
 * Lịch sử cả ngày cho câu hỏi (26/10): quá trần thì tóm phần cũ bằng AI nhẹ, lưu bản tóm.
 * Lượt tóm chạy như người đang chờ (ưu tiên + đúng người hỏi — TG-01), có hạn chót 25 giây.
 * Tóm hỏng / quá hạn / vừa lỗi < 10 phút → bản tóm cũ (nếu có) + các tin MỚI NHẤT vừa trần (không cắt cứng 20 — TG-04).
 */
async function lichSuChoCau(email: string, sessionId: string, tin: ChatMessage[]): Promise<{ lichSu: ChatMessage[]; daTom: boolean }> {
  const tomCu = docTomTat(sessionId);
  const chon = chonLichSu(tin, tomCu);
  if (!chon.canTom) return { lichSu: chon.lichSu, daTom: false };
  const duPhong = (): { lichSu: ChatMessage[]; daTom: boolean } => {
    const con = catTheoTran(tin.slice(tomCu?.denTin ?? 0), TRAN_KY_TU - (tomCu?.chu.length ?? 0));
    return { lichSu: tomCu ? [tinTomTat(tomCu.chu, con[0]?.at ?? new Date().toISOString()), ...con] : con, daTom: false };
  };
  if (Date.now() - docLoiTom(sessionId) < NGHI_SAU_LOI_MS) return duPhong();
  try {
    const goi = chayVoiNguoiGoiAi(email, () => chayUuTien(() => runAIDo(promptTomTat(chon.canTom!.tomCu, chon.canTom!.tin), undefined, "haiku")));
    const kq = await Promise.race([
      goi,
      new Promise<never>((_r, tuChoi) => setTimeout(() => tuChoi(new Error("tóm quá hạn")), HAN_TOM_MS)),
    ]);
    const chu = catCau(kq.text.trim(), 1_800);
    if (chu === "") throw new Error("bản tóm rỗng");
    const moi = { denTin: chon.canTom.denTinMoi, chu };
    ghiTomTat(sessionId, moi);
    return { lichSu: chonLichSu(tin, moi).lichSu, daTom: true };
  } catch {
    ghiLoiTom(sessionId);
    return duPhong();
  }
}

// ===== Tin chữ =====

async function xuLyTin(tin: TinTg): Promise<void> {
  const chatId = String(tin.chat.id);
  const bd = Date.now();
  demMotTin();
  const so = (loai: Parameters<typeof ghiSo>[0]["loai"], email: string | null, cauHoi: string, traLoi: string, loi: string | null = null) =>
    ghiSo({ luc: new Date().toISOString(), chatId, email, loai, cauHoi: rutGon(cauHoi), traLoi: rutGon(traLoi), ms: Date.now() - bd, loi });

  if (tin.chat.type !== "private") {
    so("bo-qua", null, tin.text ?? "", "tin trong nhóm — trợ lý chỉ nhận chat riêng");
    return;
  }
  const chu = (tin.text ?? "").trim();
  if (chu === "") {
    const cau = "Mình mới đọc được tin chữ — ảnh, tệp, tin thoại chưa nhận qua Telegram.";
    await guiChu(chatId, cau);
    so("bo-qua", null, "(tin không phải chữ)", cau);
    return;
  }
  const lenh = docLenh(chu);

  // /noi <mã> — không cần đã nối
  if (lenh.loai === "noi") {
    const kq = dungMaNoi(chatId, lenh.ma);
    const cau = kq.ok
      ? `✅ Đã nối chat này với ${kq.ten} (${kq.email}, ${kq.tenLoai}).` +
        (kq.canhBao ? `\n${kq.canhBao}` : "\nNhắn câu hỏi vào đây để hỏi Trợ lý Main.")
      : kq.cau;
    await guiChu(chatId, cau);
    so("lenh", kq.ok ? kq.email : null, `/noi ${lenh.ma.replace(/\d/g, "•")}`, cau, kq.ok ? null : "nối thất bại");
    return;
  }

  const xet = xetChat(chatId);
  if (!xet.duoc) {
    await guiChu(chatId, xet.cau);
    so("tu-choi", null, chu, xet.cau);
    return;
  }
  const { nguoi } = xet;

  if (lenh.loai === "start" || lenh.loai === "giup") {
    const cau = loiChao(nguoi.name, xet.tenLoai);
    await guiChu(chatId, cau);
    so("lenh", nguoi.email, chu, cau);
    return;
  }
  if (lenh.loai === "moi") {
    const p = layPhienTelegram(nguoi.email, nguoi.role, true);
    const cau = p
      ? `🆕 Đã mở phiên mới (dự án ${getProject(p.projectId)?.name ?? p.projectId}). Phiên cũ vẫn xem được trên website.`
      : "Tài khoản chưa được cấp dự án nào — nhờ Admin cấp quyền dự án.";
    await guiChu(chatId, cau);
    so("lenh", nguoi.email, chu, cau);
    return;
  }

  // ===== Câu hỏi cho trợ lý =====
  // Mọi tin gửi ra từ đây trả lời vào ĐÚNG câu hỏi (26/10): hỏi liền hai câu vẫn biết câu nào trả lời câu nào
  const cauHoi = lenh.chu;
  const maCau = tin.message_id;
  if (cauHoi.length > TRAN_CAU_HOI) {
    const cau = `Câu hỏi quá dài (tối đa ${TRAN_CAU_HOI.toLocaleString("vi-VN")} ký tự) — anh chia nhỏ giúp.`;
    await guiChu(chatId, cau, maCau);
    so("hoi", nguoi.email, cauHoi, cau, "quá dài");
    return;
  }
  if (!isAIConfigured(getAIConfig())) {
    const cau = "Chưa cấu hình kết nối AI trên Main — vào Cài đặt → Kết nối → Kết nối AI.";
    await guiChu(chatId, cau, maCau);
    so("hoi", nguoi.email, cauHoi, cau, "chưa cấu hình AI");
    return;
  }
  // ⭐ 26/10 (Mr. Đại chốt): mỗi ngày giờ VN một phiên — phiên đang dùng mở từ hôm trước thì mở phiên mới
  const sangNgayMoi = phienTuHomTruoc(nguoi.email);
  const p = layPhienTelegram(nguoi.email, nguoi.role, sangNgayMoi);
  if (!p) {
    const cau = "Tài khoản chưa được cấp dự án nào — nhờ Admin cấp quyền dự án.";
    await guiChu(chatId, cau, maCau);
    so("hoi", nguoi.email, cauHoi, cau, "không có dự án");
    return;
  }
  // ⭐ Khuôn sổ bản 2 (HOP-DONG-KET-NOI 7.1, 26/09/2026): mỗi câu hỏi Telegram là MỘT
  // chuỗi — mọi lượt trợ lý hỏi agent khác mang cùng mã chuỗi; xong việc ghi dòng
  // gốc `telegram.chat` (câu người hỏi → câu trả lời cuối đã gửi).
  await chayGocChuoi(
    {
      kenh: KENH_GOC.telegram,
      lyDoGoi: "người dùng hỏi trợ lý Main qua Telegram",
      cauHoi,
      duong: "A",
      duAn: p.projectId,
      nguoi: nguoi.email,
    },
    async (): Promise<unknown> => {
      // "đang gõ…" — Telegram tự tắt sau 5 giây nên nhắc lại mỗi 4 giây. Bật TRƯỚC lượt tóm lịch sử (kiểm độc lập TG-02)
      void guiDangGo(chatId);
      const nhacGo = setInterval(() => void guiDangGo(chatId), 4_000);
      let phien = getSession(p.projectId, p.sessionId)!;
      const { lichSu, daTom } = await lichSuChoCau(nguoi.email, p.sessionId, phien.messages.slice());
      phien = saveSession(appendMessage(phien, "user", `${cauHoi}\n\n📱 qua Telegram`));
      let kq: Awaited<ReturnType<typeof runChatAgent>>;
      try {
        // Người đang chờ trả lời trên Telegram (Quản lý token AI 04/10): ghi sổ đúng người, đi trước việc nền
        kq = await chayVoiNguoiGoiAi(nguoi.email, () => chayUuTien(() => runChatAgent({
          projectId: p.projectId,
          email: nguoi.email,
          role: xet.role,
          loai: nguoi.role,
          tenLoai: xet.tenLoai,
          message: cauHoi,
          history: lichSu,
          lichSuCaNgay: true,
          timWebBat: false,
          kenh: "telegram",
        })));
      } catch (e) {
        clearInterval(nhacGo);
        const loi = e instanceof Error ? e.message : String(e);
        const cau = cauLoiAI(loi);
        await guiChu(chatId, cau, maCau);
        try {
          saveSession(appendMessage(phien, "assistant", cau));
        } catch {
          /* mất lịch sử lượt này thì vẫn đã trả lời */
        }
        so("hoi", nguoi.email, cauHoi, cau, loi);
        return { ok: false, ma_loi: "LOI_NOI_BO", thong_diep: cau };
      }
      clearInterval(nhacGo);

      // Link màn web mà trợ lý muốn dẫn tới (trên web là tự chuyển trang)
      const goc = diaChiMain();
      const them: string[] = [];
      const cacDuAn: string[] = [];
      for (const u of kq.uiActions as UiAction[]) {
        if (u.type === "navigate") them.push(`Mở trên web: ${goc}${u.path}`);
        else if (u.type === "danToiKetQua") them.push(`Xem kết quả trên web: ${goc}${u.trang}`);
        else if (u.type === "switchProject") cacDuAn.push(u.projectId);
      }
      const duAnMoi = cacDuAn.length > 0 ? cacDuAn[cacDuAn.length - 1]! : null;
      const duoiLink = them.length > 0 ? `\n\n${Array.from(new Set(them)).join("\n")}` : "";
      // Lưu vào phiên bản GỐC của AI (xem trên web còn bảng; lịch sử cả ngày không mang dòng 🆕/📝) — kiểm độc lập TG-14
      const replyLuu = kq.reply + duoiLink;
      let reply = gonChoTelegram(kq.reply, cauHoi) + duoiLink;
      if (sangNgayMoi) {
        const g = gioVn(new Date());
        reply = `🆕 Phiên ngày ${g.ngay.slice(8, 10)}/${g.ngay.slice(5, 7)} — phiên hôm trước xem trên web, mục Trợ lý.\n\n${reply}`;
      }
      if (daTom) reply += "\n\n📝 Đã tóm tắt phần đầu cuộc trò chuyện hôm nay cho gọn.";
      if (duAnMoi) {
        const moi = layPhienTelegram(nguoi.email, nguoi.role, true, duAnMoi);
        if (moi) reply += `\n\n🔀 Từ tin sau, Telegram hỏi trên dự án ${getProject(moi.projectId)?.name ?? moi.projectId} (phiên mới).`;
      }

      const loiGui = await guiTraLoi(chatId, reply, maCau);
      try {
        saveSession(appendMessage(phien, "assistant", replyLuu, kq.actions));
      } catch {
        /* như trên */
      }

      // Công cụ GHI chờ bấm nút — mỗi việc một tin có ✅ Làm / ❌ Bỏ
      for (const c of kq.choDuyet) {
        const v = themViecCho({
          kenh: "telegram",
          chatId,
          email: nguoi.email,
          projectId: p.projectId,
          sessionId: p.sessionId,
          name: c.name,
          args: c.args,
          cauHoi,
        });
        const g = await guiTin(
          chatId,
          `⏸ <b>Chờ anh bấm</b>\n${maHoaHtml(moTaViecCho(c.name, c.args))}`,
          [
            [
              { text: "✅ Làm", callback_data: `lam:${v.id}` },
              { text: "❌ Bỏ", callback_data: `bo:${v.id}` },
            ],
          ],
          { traLoiTin: maCau },
        );
        if (g.ok && g.ketQua) suaViecCho(v.id, { messageId: g.ketQua.message_id });
      }
      so("hoi", nguoi.email, cauHoi, reply + (kq.choDuyet.length > 0 ? ` [chờ bấm: ${kq.choDuyet.map((c) => c.name).join(", ")}]` : ""), loiGui);
      return reply;
    },
    (traVe) => traVe,
  );
}

// ===== Bấm nút =====

async function xuLyNut(cb: CallbackTg): Promise<void> {
  const bd = Date.now();
  const chatId = String(cb.message?.chat.id ?? cb.from.id);
  const m = (cb.data ?? "").match(/^(lam|bo):([a-f0-9]{12})$/);
  const so = (loai: "lam" | "bo" | "tu-choi", email: string | null, cauHoi: string, traLoi: string, loi: string | null = null) =>
    ghiSo({ luc: new Date().toISOString(), chatId, email, loai, cauHoi: rutGon(cauHoi), traLoi: rutGon(traLoi), ms: Date.now() - bd, loi });
  if (!m) {
    await traLoiNut(cb.id, "Nút này không còn dùng được.");
    return;
  }
  const [, hanhDong, id] = m as unknown as [string, "lam" | "bo", string];
  // Người bấm đọc MỚI từ sổ người dùng — khoá / đổi loại có hiệu lực ngay
  const xet = xetChat(chatId);
  const nguoi = xet.duoc ? { email: xet.nguoi.email, loai: xet.nguoi.role } : null;
  const truoc = docViecCho().find((x) => x.id === id);
  // Chạy công cụ có thể mất vài giây — trả lời nút sớm để Telegram thôi quay
  const seChay =
    hanhDong === "lam" && truoc?.trangThai === "cho" && truoc.chatId === chatId && truoc.email === nguoi?.email;
  if (seChay) await traLoiNut(cb.id, "Đang làm…");

  // MỘT bộ chạy chung với trợ lý web (lib/ai/cho-duyet-kho.ts)
  const kq = await xuLyViecCho({ id, hanhDong, kenh: "telegram", chatId, nguoi, cauKhongNguoi: xet.duoc ? undefined : xet.cau });
  const v = kq.viec;
  switch (kq.trangThai) {
    case "khong-thay":
      await traLoiNut(cb.id, kq.cau);
      so("tu-choi", null, cb.data ?? "", "không tìm thấy việc chờ / khác chat");
      return;
    case "xong-truoc":
      await traLoiNut(cb.id, kq.cau);
      return;
    case "tu-choi":
      await traLoiNut(cb.id, "Không chạy.");
      await guiChu(chatId, kq.cau);
      if (cb.message) await goNut(chatId, cb.message.message_id);
      so("tu-choi", v?.email ?? null, `${hanhDong} ${v?.name ?? ""}`, kq.cau);
      return;
    case "da-bo":
      if (cb.message) await goNut(chatId, cb.message.message_id);
      await traLoiNut(cb.id, "Đã bỏ.");
      await guiChu(chatId, kq.cau);
      so("bo", v?.email ?? null, v?.name ?? "", kq.cau);
      return;
    case "qua-han":
      if (cb.message) await goNut(chatId, cb.message.message_id);
      if (!seChay) await traLoiNut(cb.id, "Quá hạn.");
      await guiChu(chatId, kq.cau);
      so("tu-choi", v?.email ?? null, v?.name ?? "", kq.cau);
      return;
    case "da-lam": {
      if (cb.message) await goNut(chatId, cb.message.message_id);
      const loiGui = await guiTraLoi(chatId, kq.cau);
      so("lam", v?.email ?? null, v?.name ?? "", kq.cau, kq.action?.ok ? loiGui : (kq.action?.summary ?? null));
      return;
    }
  }
}

/** Lỗi lạ trong một lượt: ghi sổ + báo người nhắn, KHÔNG nuốt im */
async function anToan(chatId: string, viec: () => Promise<void>): Promise<void> {
  try {
    await viec();
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e);
    ghiSo({ luc: new Date().toISOString(), chatId, email: null, loai: "hoi", cauHoi: "", traLoi: "", ms: 0, loi: `lỗi xử lý: ${loi}` });
    await guiChu(chatId, `Trợ lý Main gặp lỗi khi xử lý tin này: ${rutGon(loi, 200)}`).catch(() => undefined);
  }
}

/**
 * Tin này có đi tới AI không — để báo ⏳ NGAY, trước khi xếp hàng. Chỉ xét phần rẻ, cùng điều kiện
 * với xuLyTin: chat riêng · có chữ · không phải lệnh · không quá dài · người đã nối và đủ loại.
 */
function seHoiAI(tin: TinTg): boolean {
  if (tin.chat.type !== "private") return false;
  const chu = (tin.text ?? "").trim();
  if (chu === "" || chu.length > TRAN_CAU_HOI) return false;
  if (docLenh(chu).loai !== "cau-hoi") return false;
  return xetChat(String(tin.chat.id)).duoc;
}

/** Điểm vào: một update → xếp vào hàng của chat đó */
export function xuLyUpdate(u: UpdateTg): Promise<void> {
  if (u.callback_query) {
    const cb = u.callback_query;
    const chatId = String(cb.message?.chat.id ?? cb.from.id);
    return xepHang(chatId, () => anToan(chatId, () => xuLyNut(cb)));
  }
  if (u.message) {
    const tin = u.message;
    const chatId = String(tin.chat.id);
    if (!seHoiAI(tin)) return xepHang(chatId, () => anToan(chatId, () => xuLyTin(tin)));

    // ⏳ gửi ngay lúc nhận (không chờ hàng), trả lời vào câu hỏi — xem đầu tệp
    const thuTu = demCauCho(chatId, 1);
    // tin ⏳ / sửa / xoá hỏng KHÔNG được nuốt câu hỏi (kiểm độc lập 26/10 lần 2 #8): mọi lỗi ở đây chỉ làm mất tin ⏳, câu hỏi vẫn
    // đi vào anToan → xuLyTin như trước. `.catch` ngay lúc tạo: câu đang xếp hàng không để lời hứa bị từ chối nằm không ai đón.
    const henDaNhan = guiTin(chatId, maHoaHtml(cauDaNhan(thuTu)), undefined, { traLoiTin: tin.message_id }).catch(() => null);
    return xepHang(chatId, async () => {
      let maDaNhan: number | null = null;
      try {
        const daNhan = await henDaNhan;
        maDaNhan = daNhan?.ok ? (daNhan.ketQua?.message_id ?? null) : null;
        if (thuTu > 1 && maDaNhan !== null) await suaTin(chatId, maDaNhan, maHoaHtml(CAU_DEN_LUOT)).catch(() => null);
        await anToan(chatId, () => xuLyTin(tin));
      } finally {
        demCauCho(chatId, -1);
        if (maDaNhan !== null) await xoaTin(chatId, maDaNhan).catch(() => null);
      }
    });
  }
  return Promise.resolve();
}
