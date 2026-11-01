// ============================================================
// GỌI API TELEGRAM CHO TRỢ LÝ (server-only, không node:fs)
//
// Hàm gửi RIÊNG của cầu nối trợ lý — không đụng `bao-cao-sang/telegram.ts`
// (nhóm báo cáo sáng đang sửa). Khác hàm kia ở 3 chỗ: gửi tới chat bất kỳ
// (mỗi người dùng một chat), có HTML + nút inline, có long-polling getUpdates.
// KHÔNG BAO GIỜ ném lỗi: mọi thất bại trả { ok:false, loi: câu tiếng Việt }.
// Token: biến môi trường TELEGRAM_BOT_TOKEN (.env.local, không vào git).
// ============================================================

import { boTheHtml } from "./thuan";
import { ngayTrongChu } from "@/lib/ngay-hien";

export interface KetQuaTg<T = unknown> {
  ok: boolean;
  ketQua?: T;
  /** Mã lỗi HTTP Telegram trả (409 = có hệ khác đang nhận tin của bot) */
  maLoi?: number;
  loi?: string;
}

export function tokenBot(): string {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
}

export async function goiTg<T = unknown>(
  phuongThuc: string,
  than: Record<string, unknown>,
  hanMs = 15_000,
): Promise<KetQuaTg<T>> {
  const token = tokenBot();
  if (token === "") return { ok: false, loi: "Chưa khai TELEGRAM_BOT_TOKEN trong .env.local." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${phuongThuc}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(than),
      signal: AbortSignal.timeout(hanMs),
      cache: "no-store",
    });
    const j = (await res.json().catch(() => null)) as
      | { ok?: boolean; result?: T; error_code?: number; description?: string }
      | null;
    if (j?.ok === true) return { ok: true, ketQua: j.result };
    const ma = j?.error_code ?? res.status;
    return {
      ok: false,
      maLoi: ma,
      loi:
        ma === 409
          ? "Có hệ khác đang nhận tin của bot này (Telegram báo 409) — tắt hệ kia hoặc gỡ webhook."
          : `Telegram từ chối ${phuongThuc}: ${j?.description ?? `HTTP ${res.status}`}`,
    };
  } catch (e) {
    const hetGio = e instanceof Error && /timeout|abort/i.test(e.name + e.message);
    return {
      ok: false,
      loi: hetGio
        ? `Telegram không trả lời ${phuongThuc} trong ${Math.round(hanMs / 1000)} giây.`
        : "Không nối được tới Telegram — kiểm tra mạng ra ngoài của máy chủ.",
    };
  }
}

// ===== Kiểu tối thiểu của update =====

export interface TinTg {
  message_id: number;
  date: number;
  text?: string;
  chat: { id: number; type: string; username?: string; first_name?: string };
  from?: { id: number; username?: string; first_name?: string };
}
export interface CallbackTg {
  id: string;
  data?: string;
  from: { id: number };
  message?: TinTg;
}
export interface UpdateTg {
  update_id: number;
  message?: TinTg;
  callback_query?: CallbackTg;
}

export function layUpdates(offset: number | null, choGiay: number): Promise<KetQuaTg<UpdateTg[]>> {
  return goiTg<UpdateTg[]>(
    "getUpdates",
    {
      ...(offset !== null ? { offset } : {}),
      timeout: choGiay,
      allowed_updates: ["message", "callback_query"],
    },
    (choGiay + 10) * 1000,
  );
}

export interface NutInline {
  text: string;
  callback_data: string;
}

/**
 * Gửi một tin HTML. Telegram chê HTML (thẻ lệch) thì gửi lại đúng nội dung
 * dạng chữ thường — thà mất chữ đậm còn hơn mất câu trả lời.
 */
export async function guiTin(
  chatId: string,
  html: string,
  nut?: NutInline[][],
  /** 26/10/2026: `traLoiTin` = mã tin câu hỏi → Telegram hiện câu hỏi trích ngay trên tin này (hỏi liền hai câu vẫn biết câu nào trả lời câu nào) */
  tuyChon: { traLoiTin?: number } = {},
): Promise<KetQuaTg<{ message_id: number }>> {
  const khongTraLoi = {
    chat_id: chatId,
    disable_web_page_preview: true,
    ...(nut ? { reply_markup: { inline_keyboard: nut } } : {}),
  };
  const coTraLoi = tuyChon.traLoiTin !== undefined;
  // tin câu hỏi đã bị xoá thì vẫn gửi, chỉ không trích
  const chung = coTraLoi
    ? { ...khongTraLoi, reply_parameters: { message_id: tuyChon.traLoiTin, allow_sending_without_reply: true } }
    : khongTraLoi;
  html = ngayTrongChu(html); // ngày trong câu trả lời luôn dd/mm/yyyy, link + dữ liệu giữ nguyên (Mr. Đại 04/10)
  const kq = await goiTg<{ message_id: number }>("sendMessage", { ...chung, text: html, parse_mode: "HTML" });
  if (kq.ok || kq.maLoi !== 400) return kq;
  const thuan = await goiTg<{ message_id: number }>("sendMessage", { ...chung, text: boTheHtml(html) });
  if (thuan.ok || thuan.maLoi !== 400 || !coTraLoi) return thuan;
  // Lưới cuối (26/10): Telegram chê phần trả-lời-vào-câu-hỏi → gửi không trích. Thà mất dòng trích còn hơn mất câu trả lời
  return goiTg<{ message_id: number }>("sendMessage", { ...khongTraLoi, text: boTheHtml(html) });
}

/** Sửa chữ một tin đã gửi (tin ⏳ «đã nhận» khi đến lượt). Sửa tin KHÔNG rung chuông — chỉ dùng cho tin chờ, không cho câu trả lời */
export function suaTin(chatId: string, messageId: number, html: string): Promise<KetQuaTg> {
  return goiTg("editMessageText", { chat_id: chatId, message_id: messageId, text: html, parse_mode: "HTML" }, 5_000);
}

/** Xoá một tin bot đã gửi (tin ⏳ «đã nhận» khi câu trả lời đã tới) */
export function xoaTin(chatId: string, messageId: number): Promise<KetQuaTg> {
  return goiTg("deleteMessage", { chat_id: chatId, message_id: messageId }, 5_000);
}

export function guiDangGo(chatId: string): Promise<KetQuaTg> {
  return goiTg("sendChatAction", { chat_id: chatId, action: "typing" }, 5_000);
}

export function traLoiNut(callbackId: string, chu: string): Promise<KetQuaTg> {
  return goiTg("answerCallbackQuery", { callback_query_id: callbackId, text: chu.slice(0, 190) }, 5_000);
}

/** Bỏ nút khỏi tin cũ (đã bấm rồi) */
export function goNut(chatId: string, messageId: number): Promise<KetQuaTg> {
  return goiTg("editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });
}
