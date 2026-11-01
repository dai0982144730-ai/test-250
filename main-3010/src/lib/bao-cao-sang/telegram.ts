import { ngayTrongChu } from "@/lib/ngay-hien";
import { htmlRaChuThuan, laLoiDocHtml } from "./telegram-html";
// ============================================================
// GỬI BÁO CÁO SÁNG QUA TELEGRAM (server-only)
// MD: PLAN-MAIN-AGENT mục 6 (báo cáo sáng 07:00) · mục 7 (nhắn ngay issue đỏ)
//
// ⛔ CHƯA CÓ TOKEN THÌ TRẢ VỀ "CHƯA CẤU HÌNH", KHÔNG ĐƯỢC NÉM LỖI.
//    Vì sao quan trọng: bộ hẹn giờ 07:00 gọi hàm này không có người trực. Một
//    exception ở đây làm chết cả vòng chạy, và hôm sau không ai biết vì sao
//    báo cáo im — đúng cái "im lặng dễ nhầm với hỏng" mà mục 6.3 chống.
//
// Token khai bằng BIẾN MÔI TRƯỜNG, không nằm trong data/ và không lên màn hình:
//    TELEGRAM_BOT_TOKEN   — token bot lấy từ @BotFather
//    TELEGRAM_CHAT_ID     — id đoạn chat/nhóm nhận báo cáo
// ============================================================

const HAN_CHO_MS = 10_000;

/**
 * Nhãn đầu mọi tin MÁY TỰ GỬI vào chat của anh (Mr. Đại gật 26/10/2026): tin nhắc / cảnh báo đến đúng lúc anh vừa hỏi
 * trợ lý thì nhìn như câu trả lời (vụ 26/10 15:41 — tin ⛔ của gác tới 6 giây sau câu hỏi). Câu trả lời của trợ lý KHÔNG gắn.
 * Báo cáo sáng không gắn — đã có đầu đề «BÁO CÁO SÁNG», khuôn đã chốt.
 * Cùng một câu ở 3 nơi khác ngôn ngữ, sửa thì sửa cả ba: đây · GAC-5-AGENT.ps1 ($NHAN_TIN_HE_THONG) · cong-cu-claude/gui-telegram.py (NHAN)
 */
export const NHAN_TIN_HE_THONG = "🛠 TIN HỆ THỐNG — không phải trả lời câu hỏi của anh";

/** Ghép nhãn lên đầu một tin máy tự gửi */
export function ganNhanHeThong(chu: string): string {
  return `${NHAN_TIN_HE_THONG}\n${chu}`;
}

export interface KetQuaGui {
  ok: boolean;
  /** true = chưa khai token/chat id; đây KHÔNG phải lỗi hệ thống */
  chuaCauHinh: boolean;
  /** Câu tiếng Việt hiện thẳng lên màn hình */
  thongDiep: string;
  /** ISO lúc gửi xong; null nếu không gửi được */
  luc: string | null;
}

export interface TrangThaiTelegram {
  daCauHinh: boolean;
  /** Token che bớt để nhìn được là đã khai mà không lộ — ví dụ "7841…9fQ" */
  tokenCheBot: string | null;
  chatId: string | null;
  huongDan: string;
}

function docCauHinh(): { token: string; chatId: string } {
  return {
    token: (process.env.TELEGRAM_BOT_TOKEN ?? "").trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID ?? "").trim(),
  };
}

const HUONG_DAN =
  "Khai hai biến môi trường rồi khởi động lại: TELEGRAM_BOT_TOKEN (lấy từ @BotFather) " +
  "và TELEGRAM_CHAT_ID (id nhóm nhận báo cáo). Chưa khai thì báo cáo sáng vẫn được " +
  "dựng và lưu, chỉ không tự nhắn đi.";

/** Trạng thái để màn hình nói rõ đã cấu hình chưa — không có gì ẩn */
export function trangThaiTelegram(): TrangThaiTelegram {
  const { token, chatId } = docCauHinh();
  const daCauHinh = token !== "" && chatId !== "";
  return {
    daCauHinh,
    tokenCheBot:
      token === "" ? null : `${token.slice(0, 4)}…${token.slice(-3)}`,
    chatId: chatId === "" ? null : chatId,
    huongDan: HUONG_DAN,
  };
}

/**
 * Gửi một tin nhắn chữ thuần.
 * KHÔNG dùng parse_mode — mã hồ sơ có dấu `_` `*` `[` sẽ làm Telegram từ chối
 * cả tin nhắn; mất báo cáo vì một dấu gạch dưới là cái giá quá đắt cho chữ đậm.
 *
 * Hàm này KHÔNG BAO GIỜ ném lỗi.
 */
export async function guiTelegram(chu: string): Promise<KetQuaGui> {
  const { chatId } = docCauHinh();
  return guiTelegramToi(chatId, chu);
}

/**
 * ⭐ 04/10 — gửi tới MỘT chat bất kỳ (mỗi người nhận một chat, theo kịch bản của họ).
 * Trả kèm `messageId` — Đợt 2 dùng để nhận ra "trả lời vào tin báo cáo" là góp ý.
 * Mặc định chữ thuần như cũ; `{ html: true }` gửi HTML kèm đường lùi chữ thuần. KHÔNG BAO GIỜ ném lỗi.
 */
export async function guiTelegramToi(
  chatId: string,
  chu: string,
  /** 25/10/2026 (Mr. Đại chốt): `html: true` = `chu` là HTML Telegram (đã thoát bằng telegram-html.ts). Mặc định chữ thuần như cũ. */
  tuyChon: { html?: boolean } = {},
): Promise<KetQuaGui & { messageId: number | null; luiVeChuThuan?: boolean }> {
  const { token } = docCauHinh();
  if (token === "" || chatId.trim() === "") {
    return {
      ok: false,
      chuaCauHinh: true,
      thongDiep: `Chưa cấu hình Telegram. ${HUONG_DAN}`,
      luc: null,
      messageId: null,
    };
  }
  if (chu.trim() === "") {
    return {
      ok: false,
      chuaCauHinh: false,
      thongDiep: "Không gửi tin rỗng — báo cáo chưa dựng được nội dung nào.",
      luc: null,
      messageId: null,
    };
  }

  const boDem = new AbortController();
  const hetGio = setTimeout(() => boDem.abort(), HAN_CHO_MS);
  try {
    type TraLoi = { ok?: boolean; description?: string; result?: { message_id?: number } };
    const guiMotLan = async (van: string, html: boolean): Promise<TraLoi> => {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: ngayTrongChu(van), // ngày trong chữ agent gửi về luôn dd/mm/yyyy (Mr. Đại 04/10)
          disable_web_page_preview: true,
          ...(html ? { parse_mode: "HTML" } : {}),
        }),
        signal: boDem.signal,
        cache: "no-store",
      });
      return (await res.json()) as TraLoi;
    };
    let json = await guiMotLan(chu, tuyChon.html === true);
    let lui = false;
    // ĐƯỜNG LÙI: Telegram không đọc được thẻ HTML → gửi lại đúng nội dung bằng CHỮ THUẦN, không để mất báo cáo vì một thẻ hỏng
    if (tuyChon.html === true && json?.ok !== true && laLoiDocHtml(json?.description)) {
      json = await guiMotLan(htmlRaChuThuan(chu), false);
      lui = true;
    }
    if (json?.ok === true) {
      return {
        ok: true,
        chuaCauHinh: false,
        thongDiep: lui ? "Đã gửi báo cáo sáng qua Telegram (bản chữ thuần — Telegram không đọc được định dạng)." : "Đã gửi báo cáo sáng qua Telegram.",
        luc: new Date().toISOString(),
        messageId: typeof json.result?.message_id === "number" ? json.result.message_id : null,
        ...(lui ? { luiVeChuThuan: true } : {}),
      };
    }
    return {
      ok: false,
      chuaCauHinh: false,
      thongDiep: `Telegram từ chối: ${json?.description ?? "không rõ lý do"}.`,
      luc: null,
      messageId: null,
    };
  } catch (e) {
    const hetHan = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      chuaCauHinh: false,
      thongDiep: hetHan
        ? `Telegram không trả lời trong ${HAN_CHO_MS / 1000} giây.`
        : "Không nối được tới Telegram — kiểm tra mạng ra ngoài của máy chủ.",
      luc: null,
      messageId: null,
    };
  } finally {
    clearTimeout(hetGio);
  }
}

/** Ảnh nặng hơn chữ nhiều lần — chờ lâu hơn tin chữ */
const HAN_CHO_ANH_MS = 20_000;
/** Telegram nhận chú thích ảnh tối đa 1.024 ký tự */
const TOI_DA_CHU_THICH = 1024;

/** Cắt chú thích ≤ 1.024 đơn vị UTF-16, có «…» — không cắt đôi ký tự hai đơn vị (emoji 🤖) */
function catChuThich(chu: string): string {
  if (chu.length <= TOI_DA_CHU_THICH) return chu;
  let ra = "";
  for (const kyTu of Array.from(chu)) {
    if (ra.length + kyTu.length > TOI_DA_CHU_THICH - 1) break;
    ra += kyTu;
  }
  return ra.trimEnd() + "…";
}

/**
 * ⭐ 17/10/2026 (KE-HOACH/23) — gửi MỘT ảnh biểu đồ kèm chú thích tới một chat (`sendPhoto`).
 * Ảnh do `ve-anh.ts` dựng (PNG). Chú thích là chữ thuần như tin chữ (không parse_mode), ngày qua `ngayTrongChu`,
 * dài quá 1.024 ký tự thì cắt có «…». Cùng luật với `guiTelegramToi`: KHÔNG BAO GIỜ ném lỗi, câu lỗi tiếng Việt,
 * chưa khai token / chat id thì trả `chuaCauHinh`.
 */
export async function guiAnhToi(
  chatId: string,
  png: Buffer,
  chuThich: string
): Promise<KetQuaGui & { messageId: number | null }> {
  const { token } = docCauHinh();
  if (token === "" || (chatId ?? "").trim() === "") {
    return {
      ok: false,
      chuaCauHinh: true,
      thongDiep: `Chưa cấu hình Telegram. ${HUONG_DAN}`,
      luc: null,
      messageId: null,
    };
  }
  if (!png || png.length === 0) {
    return {
      ok: false,
      chuaCauHinh: false,
      thongDiep: "Không gửi ảnh rỗng — bộ vẽ chưa dựng được ảnh biểu đồ.",
      luc: null,
      messageId: null,
    };
  }

  const boDem = new AbortController();
  const hetGio = setTimeout(() => boDem.abort(), HAN_CHO_ANH_MS);
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    const chu = catChuThich(ngayTrongChu(chuThich ?? "").trim()); // ngày trong chữ luôn dd/mm/yyyy (Mr. Đại 04/10)
    if (chu !== "") form.append("caption", chu);
    form.append(
      "photo",
      new Blob([new Uint8Array(png.buffer, png.byteOffset, png.byteLength)], { type: "image/png" }),
      "bieu-do.png"
    );
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      body: form,
      signal: boDem.signal,
      cache: "no-store",
    });
    type TraLoi = { ok?: boolean; description?: string; result?: { message_id?: number } };
    let json: TraLoi | null;
    try {
      json = (await res.json()) as TraLoi;
    } catch {
      json = null;
    }
    if (json?.ok === true) {
      return {
        ok: true,
        chuaCauHinh: false,
        thongDiep: "Đã gửi ảnh biểu đồ qua Telegram.",
        luc: new Date().toISOString(),
        messageId: typeof json.result?.message_id === "number" ? json.result.message_id : null,
      };
    }
    return {
      ok: false,
      chuaCauHinh: false,
      thongDiep: json
        ? `Telegram từ chối ảnh: ${json.description ?? "không rõ lý do"}.`
        : `Telegram trả về dữ liệu không đọc được (mã ${res.status}).`,
      luc: null,
      messageId: null,
    };
  } catch (e) {
    const hetHan = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      chuaCauHinh: false,
      thongDiep: hetHan
        ? `Telegram không trả lời trong ${HAN_CHO_ANH_MS / 1000} giây khi gửi ảnh.`
        : "Không nối được tới Telegram để gửi ảnh — kiểm tra mạng ra ngoài của máy chủ.",
      luc: null,
      messageId: null,
    };
  } finally {
    clearTimeout(hetGio);
  }
}

/**
 * 27/10/2026 (KE-HOACH/33 mục 3, Mr. Đại duyệt A) — gửi NHIỀU ảnh biểu đồ thành ALBUM (`sendMediaGroup`, 2–10 ảnh một lượt).
 * Một ảnh thì dùng `guiAnhToi`; nhiều hơn 10 thì chia nhóm. Mỗi ảnh mang chú thích riêng. Không bao giờ ném lỗi.
 * Trả về mã tin của các ảnh đã gửi được; `loi` ghi câu tiếng Việt cho nhóm hỏng (nhóm sau vẫn đi tiếp).
 */
export async function guiAlbumToi(
  chatId: string,
  anh: { png: Buffer; chuThich: string }[]
): Promise<{ messageIds: number[]; loi: string[] }> {
  const ra: { messageIds: number[]; loi: string[] } = { messageIds: [], loi: [] };
  const co = anh.filter((a) => a.png && a.png.length > 0);
  if (co.length === 0) return ra;
  if (co.length === 1) {
    const g = await guiAnhToi(chatId, co[0]!.png, co[0]!.chuThich);
    if (g.ok && g.messageId !== null) ra.messageIds.push(g.messageId);
    else if (!g.ok) ra.loi.push(g.thongDiep);
    return ra;
  }
  const { token } = docCauHinh();
  if (token === "" || (chatId ?? "").trim() === "") {
    ra.loi.push(`Chưa cấu hình Telegram. ${HUONG_DAN}`);
    return ra;
  }
  for (let i = 0; i < co.length; i += 10) {
    let nhom = co.slice(i, i + 10);
    // Còn đúng một ảnh lẻ ở nhóm cuối: sendMediaGroup đòi tối thiểu 2 — gửi ảnh đơn
    if (nhom.length === 1) {
      const g = await guiAnhToi(chatId, nhom[0]!.png, nhom[0]!.chuThich);
      if (g.ok && g.messageId !== null) ra.messageIds.push(g.messageId);
      else if (!g.ok) ra.loi.push(g.thongDiep);
      break;
    }
    const boDem = new AbortController();
    const hetGio = setTimeout(() => boDem.abort(), HAN_CHO_ANH_MS * 2);
    try {
      const form = new FormData();
      form.append("chat_id", chatId);
      form.append(
        "media",
        JSON.stringify(
          nhom.map((a, k) => ({
            type: "photo",
            media: `attach://anh${k}`,
            caption: catChuThich(ngayTrongChu(a.chuThich ?? "").trim()),
          }))
        )
      );
      nhom.forEach((a, k) => {
        form.append(
          `anh${k}`,
          new Blob([new Uint8Array(a.png.buffer, a.png.byteOffset, a.png.byteLength)], { type: "image/png" }),
          `bieu-do-${k + 1}.png`
        );
      });
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, {
        method: "POST",
        body: form,
        signal: boDem.signal,
        cache: "no-store",
      });
      type TraLoi = { ok?: boolean; description?: string; result?: { message_id?: number }[] };
      let json: TraLoi | null;
      try {
        json = (await res.json()) as TraLoi;
      } catch {
        json = null;
      }
      if (json?.ok === true) {
        for (const m of json.result ?? []) if (typeof m.message_id === "number") ra.messageIds.push(m.message_id);
      } else {
        ra.loi.push(
          json ? `Telegram từ chối album ảnh: ${json.description ?? "không rõ lý do"}.` : `Telegram trả về dữ liệu không đọc được (mã ${res.status}).`
        );
      }
    } catch (e) {
      const hetHan = e instanceof Error && e.name === "AbortError";
      ra.loi.push(
        hetHan
          ? `Telegram không trả lời trong ${(HAN_CHO_ANH_MS * 2) / 1000} giây khi gửi album ảnh.`
          : "Không nối được tới Telegram để gửi album ảnh — kiểm tra mạng ra ngoài của máy chủ."
      );
    } finally {
      clearTimeout(hetGio);
    }
    nhom = [];
  }
  return ra;
}
