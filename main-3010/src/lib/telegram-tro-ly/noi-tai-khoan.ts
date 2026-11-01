// ============================================================
// NỐI TÀI KHOẢN TELEGRAM ↔ NGƯỜI DÙNG MAIN (Mr. Đại chốt 25/09/2026)
//
// Một nguồn: trường `telegramChatId` trong users.json của Main (users.ts).
// Cách nối: người dùng bấm «Nối Telegram» trên website → mã 6 số sống 10
// phút → nhắn `/noi 123456` cho bot. Mã dùng một lần. Mỗi chat gõ sai quá
// TRAN_SAI_MA lần trong 10 phút thì khoá thử tới hết cửa sổ (chống dò mã).
// ============================================================

import { getUserByEmail, noiTelegram } from "@/lib/users";
import { duocGhi, NHAN_LOAI } from "@/lib/quyen";
import { docSoMaNoi, ghiSoMaNoi, sinhMa } from "./kho";
import { HAN_MA_NOI_MS, TRAN_SAI_MA } from "./thuan";

/** Mã hết hạn vẫn giữ thêm 1 giờ để báo đúng "hết hạn" thay vì "sai mã" */
const GIU_MA_CU_MS = 60 * 60 * 1000;

/** Tạo mã nối mới cho email (mã cũ của người này bị huỷ) */
export function taoMaNoi(email: string, bay: number = Date.now()): { ma: string; hetHan: number } {
  const so = docSoMaNoi();
  const conGiu = so.ma.filter((m) => m.hetHan + GIU_MA_CU_MS > bay && m.email !== email);
  let ma = sinhMa();
  while (conGiu.some((m) => m.ma === ma)) ma = sinhMa();
  const hetHan = bay + HAN_MA_NOI_MS;
  ghiSoMaNoi({ ...so, ma: [...conGiu, { ma, email, hetHan }] });
  return { ma, hetHan };
}

export type KetQuaNoi =
  | { ok: true; email: string; ten: string; tenLoai: string; canhBao: string | null }
  | { ok: false; cau: string };

/** Người nhắn `/noi <mã>` từ chat `chatId` */
export function dungMaNoi(chatId: string, ma: string, bay: number = Date.now()): KetQuaNoi {
  const so = docSoMaNoi();
  const sai = (so.sai[chatId] ?? []).filter((t) => bay - t < HAN_MA_NOI_MS);
  if (sai.length >= TRAN_SAI_MA) {
    return { ok: false, cau: `Chat này gõ sai mã ${TRAN_SAI_MA} lần — thử lại sau 10 phút.` };
  }
  const conGiu = so.ma.filter((m) => m.hetHan + GIU_MA_CU_MS > bay);
  const khop = /^\d{6}$/.test(ma) ? conGiu.find((m) => m.ma === ma && m.hetHan > bay) : undefined;
  if (!khop) {
    const hetHan = /^\d{6}$/.test(ma) && conGiu.some((m) => m.ma === ma && m.hetHan <= bay);
    ghiSoMaNoi({ ma: conGiu, sai: { ...so.sai, [chatId]: [...sai, bay] } });
    return {
      ok: false,
      cau: hetHan
        ? "Mã này đã hết hạn (sống 10 phút). Lấy mã mới trên website Main → ✈ Nối Telegram."
        : "Mã không đúng. Nhắn đúng dạng /noi 123456 — mã 6 số lấy trên website Main → ✈ Nối Telegram.",
    };
  }
  // Mã dùng một lần — xoá ngay, kể cả khi nối thất bại phía dưới
  const { [chatId]: _boSai, ...saiConLai } = so.sai;
  void _boSai;
  ghiSoMaNoi({ ma: conGiu.filter((m) => m !== khop), sai: saiConLai });

  const nguoi = getUserByEmail(khop.email);
  if (!nguoi) return { ok: false, cau: "Tài khoản tạo mã này không còn trên Main." };
  if (!nguoi.active) return { ok: false, cau: "Tài khoản này đang bị khoá — nhờ Admin mở khoá rồi nối lại." };
  try {
    noiTelegram(nguoi.email, chatId);
  } catch (e) {
    return { ok: false, cau: `Không nối được: ${e instanceof Error ? e.message : String(e)}` };
  }
  return {
    ok: true,
    email: nguoi.email,
    ten: nguoi.name,
    tenLoai: NHAN_LOAI[nguoi.role],
    canhBao: duocGhi(nguoi.role)
      ? null
      : `Lưu ý: tài khoản ${NHAN_LOAI[nguoi.role]} không dùng trợ lý qua Telegram — cần Người dùng trở lên.`,
  };
}
