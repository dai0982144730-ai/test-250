"use client";

// ============================================================
// KHỐI "TRỢ LÝ QUA TELEGRAM" — Cài đặt → 🔌 Kết nối (Mr. Đại chốt 25/09)
// Một dòng trạng thái: "Nhận tin từ Telegram: đang chạy · tin cuối lúc … ·
// N tin hôm nay" + nút bật/tắt (cửa Cài đặt — trang /settings đã là cửa đó).
// API: /api/telegram-tro-ly
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ngayGioVN } from "@/lib/ngay-hien";

interface TrangThai {
  bat: boolean;
  dangChay: boolean;
  tinCuoiLuc: string | null;
  soTinHomNay: number;
  loiCuoi: string | null;
  soNguoiDaNoi: number;
  daKhaiToken: boolean;
  bot: string;
}

function gioNgan(iso: string): string {
  const d = new Date(iso);
  return ngayGioVN(d);
}

export function TelegramTroLyCard() {
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const nap = useCallback(async () => {
    try {
      const r = await fetch("/api/telegram-tro-ly", { cache: "no-store" });
      const j = (await r.json()) as { ok: boolean; trangThai?: TrangThai; message?: string };
      if (j.ok && j.trangThai) setTt(j.trangThai);
      else setLoi(j.message ?? "Không đọc được trạng thái.");
    } catch {
      setLoi("Không gọi được máy chủ Main.");
    }
  }, []);

  useEffect(() => {
    void nap();
    const t = window.setInterval(() => void nap(), 15_000);
    return () => window.clearInterval(t);
  }, [nap]);

  const doi = async (bat: boolean) => {
    setDangLuu(true);
    setLoi(null);
    try {
      const r = await fetch("/api/telegram-tro-ly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bat }),
      });
      const j = (await r.json()) as { ok: boolean; trangThai?: TrangThai; message?: string };
      if (j.ok && j.trangThai) setTt(j.trangThai);
      else setLoi(j.message ?? "Lưu không được.");
    } catch {
      setLoi("Không gọi được máy chủ Main.");
    } finally {
      setDangLuu(false);
    }
  };

  const chuTrangThai = !tt
    ? ""
    : !tt.daKhaiToken
      ? "chưa khai TELEGRAM_BOT_TOKEN"
      : !tt.bat
        ? "đang tắt"
        : tt.dangChay
          ? "đang chạy"
          : "đang khởi động (chưa nhận được nhịp nào trong 90 giây)";

  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="text-[13px] font-bold text-text">Trợ lý qua Telegram</div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-text-secondary">
        Nhắn bot <b className="text-text">@{tt?.bot ?? "SCI_Main_agent_bot"}</b> là hỏi Trợ lý Main — câu trả lời gửi lại
        Telegram, lịch sử nằm ở phiên «Telegram» của trợ lý trên web. Mỗi người tự nối tài khoản ở menu tên người
        (góc trên bên phải) → «Nối Telegram»; chỉ PM, Admin, Người dùng dùng được. Việc có ghi dữ liệu chỉ chạy khi người nhắn bấm ✅ Làm.
      </p>

      {!tt && !loi ? (
        <div className="mt-2 flex items-center gap-2 text-[12px] text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang đọc…
        </div>
      ) : tt ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-text">
            Nhận tin từ Telegram:{" "}
            <b className={tt.bat && tt.dangChay ? "text-green" : tt.bat ? "text-yellow" : "text-text-muted"}>{chuTrangThai}</b>
            {" · "}
            {tt.tinCuoiLuc ? `tin cuối lúc ${gioNgan(tt.tinCuoiLuc)}` : "chưa có tin nào"}
            {" · "}
            {tt.soTinHomNay} tin hôm nay · {tt.soNguoiDaNoi} người đã nối
          </span>
          <button
            type="button"
            disabled={dangLuu || !tt.daKhaiToken}
            title={!tt.daKhaiToken ? "Khai TELEGRAM_BOT_TOKEN trong .env.local rồi khởi động lại Main" : undefined}
            onClick={() => void doi(!tt.bat)}
            className="ml-auto rounded-sm border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent disabled:opacity-50"
          >
            {tt.bat ? "Tắt nhận tin" : "Bật nhận tin"}
          </button>
        </div>
      ) : null}
      {tt?.loiCuoi && tt.bat && <div className="mt-1 text-[11.5px] text-red">Lỗi gần nhất: {tt.loiCuoi}</div>}
      {loi && <div className="mt-1 text-[11.5px] font-semibold text-red">{loi}</div>}
    </div>
  );
}
