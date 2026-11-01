// ============================================================
// MỘT NHỊP NHẬN TIN (server-only) — gọi từ route nội bộ
// /api/noi-bo/telegram-tro-ly/nhip, KHÔNG gọi từ vòng lặp nền.
//
// Vì sao tách vậy (bài học pháp lý 25/09): hẹn giờ nạp code MỘT LẦN lúc bật
// máy chủ — sửa code xong vòng lặp vẫn chạy bản cũ. Nên vòng nền (vong-nhan.ts)
// chỉ "gõ cửa" route; mọi logic (getUpdates, xử lý tin) nằm sau route → luôn
// là code mới nhất Next vừa dịch.
//
// Offset lưu BỀN trước khi xử lý: khởi động lại không trả lời lặp một tin.
// (Đổi lại: máy chủ sập đúng giữa lúc AI đang nghĩ thì tin đó mất — chấp
// nhận, vì trả lời lặp có thể chạy lặp công cụ GHI.)
// Lần đầu tiên (chưa có offset): BỎ QUA tin tồn đọng từ trước khi bật cầu
// nối, không trả lời câu cũ hàng giờ trước.
// ============================================================

import { layUpdates, tokenBot } from "./api-tg";
import { docTrangThai, ghiSo, suaTrangThai } from "./kho";
import { offsetKeTiep } from "./thuan";
import { xuLyUpdate } from "./xu-ly";

declare global {
  // eslint-disable-next-line no-var
  var __tgDangNhan: boolean | undefined;
}

/** Long-poll bao lâu mỗi nhịp (giây) */
export const CHO_GIAY = 25;

export interface KetQuaNhip {
  /** Vòng nền chờ bao lâu rồi gõ cửa tiếp */
  choMs: number;
  soTin: number;
  ghiChu: string;
}

export async function chayMotNhip(): Promise<KetQuaNhip> {
  if (tokenBot() === "") return { choMs: 60_000, soTin: 0, ghiChu: "chưa khai TELEGRAM_BOT_TOKEN" };
  const tt = docTrangThai();
  if (!tt.bat) return { choMs: 5_000, soTin: 0, ghiChu: "đang tắt" };
  // Chỉ MỘT lời getUpdates cùng lúc trong tiến trình (hai vòng gõ cửa trùng
  // nhau sau hot-reload thì vòng sau lui lại) — Telegram cũng chỉ cho một.
  if (globalThis.__tgDangNhan) return { choMs: 3_000, soTin: 0, ghiChu: "nhịp khác đang nhận" };
  globalThis.__tgDangNhan = true;
  try {
    if (tt.offset === null) {
      const dau = await layUpdates(null, 0);
      if (!dau.ok) return baoLoi(dau.loi ?? "lỗi lạ", dau.maLoi);
      const ds = dau.ketQua ?? [];
      const offset = offsetKeTiep(0, ds.map((u) => u.update_id)) ?? 0;
      suaTrangThai((t) => ({ ...t, offset, lanNhanCuoi: new Date().toISOString(), loiCuoi: null }));
      if (ds.length > 0) {
        ghiSo({
          luc: new Date().toISOString(),
          chatId: "-",
          email: null,
          loai: "bo-qua",
          cauHoi: `${ds.length} tin tồn từ trước khi bật cầu nối`,
          traLoi: "không trả lời tin cũ",
          ms: 0,
          loi: null,
        });
      }
      return { choMs: 200, soTin: 0, ghiChu: `lần đầu — bỏ qua ${ds.length} tin tồn` };
    }

    const kq = await layUpdates(tt.offset, CHO_GIAY);
    if (!kq.ok) return baoLoi(kq.loi ?? "lỗi lạ", kq.maLoi);
    const ds = kq.ketQua ?? [];
    const offset = offsetKeTiep(tt.offset, ds.map((u) => u.update_id));
    // Lưu offset TRƯỚC khi xử lý (xem đầu file)
    suaTrangThai((t) => ({ ...t, offset, lanNhanCuoi: new Date().toISOString(), loiCuoi: null }));
    // Xử lý chạy nền theo hàng đợi từng chat — nhịp trả về ngay để nhận tiếp
    ds.forEach((u) => void xuLyUpdate(u));
    return { choMs: 100, soTin: ds.length, ghiChu: "ok" };
  } finally {
    globalThis.__tgDangNhan = false;
  }
}

function baoLoi(loi: string, maLoi?: number): KetQuaNhip {
  suaTrangThai((t) => ({ ...t, loiCuoi: loi }));
  // 409 = có hệ khác đang nhận tin của bot → lui 30 giây, không giành giật
  return { choMs: maLoi === 409 ? 30_000 : 5_000, soTin: 0, ghiChu: loi };
}
