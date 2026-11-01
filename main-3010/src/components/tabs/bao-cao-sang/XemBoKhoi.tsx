"use client";

// ============================================================
// XEM TRƯỚC BÁO CÁO SÁNG THEO BỘ KHỐI — KE-HOACH/23 (Mr. Đại chốt 17/10/2026)
//
// Hai cách xem, CÙNG hàm với lúc gửi (khoi-telegram.ts) nên thấy gì gửi nấy:
//   · Bản đầy đủ (web): mọi dòng, mọi ảnh biểu đồ
//   · Đúng tin Telegram: các tin chữ (trần 4.096 ký tự / tin) + mọi ảnh có nội dung theo thứ tự khối (album)
// Ảnh do máy chủ vẽ (ve-anh.ts) từ đặc tả màn hình gửi lên — bộ vẽ không tính số nào.
// ============================================================

import { useMemo, useState } from "react";
import { dungBoKhoi, ketXuatBoKhoi, type DauVaoBoKhoi } from "@/lib/bao-cao-sang/khoi-telegram";
import { ngayTrongChu } from "@/lib/ngay-hien";
import { KhoiInWeb } from "./KhoiInWeb";
import { AnhKhoi } from "./AnhKhoi";
import { DienThoaiTelegram } from "./DienThoaiTelegram";

export { AnhKhoi };

export function XemBoKhoi({ dauVao, nhan }: { dauVao: DauVaoBoKhoi; nhan: string }) {
  // 28/10/2026 (Mr. Đại, đợt 2): mặc định là KHUNG ĐIỆN THOẠI (đúng thứ người nhận thấy); bản web đầy đủ chỉ là một nút nhỏ đổi qua lại
  const [cheDo, setCheDo] = useState<"day-du" | "telegram">("telegram");
  const ban = useMemo(() => dungBoKhoi({ ...dauVao, dayDu: true }), [dauVao]);
  const tele = useMemo(() => ketXuatBoKhoi(dauVao), [dauVao]);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-[12px] text-text-secondary">{nhan}</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setCheDo(cheDo === "telegram" ? "day-du" : "telegram")}
          className="rounded-sm border border-border bg-surface px-2 py-0.5 text-[11px] text-text-secondary transition hover:border-accent/40 hover:text-text"
        >
          {cheDo === "telegram" ? "Xem bản web đầy đủ" : "Về khung điện thoại"}
        </button>
      </div>
      {cheDo === "day-du" ? (
        <div className="space-y-4">
          <div className="whitespace-pre-line text-[13px] text-text">{ngayTrongChu(ban.dau)}</div>
          {ban.khoi.map((k, i) => {
            const [, ...than] = k.chu.split("\n");
            return (
              <div key={`${k.ma}-${i}`} className="border-t border-border-light pt-3">
                {/* Nguyên tắc 1 (KE-HOACH/37): một độ đậm — tên khối là nhãn nhỏ viết hoa, không in đậm */}
                <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.07em] text-text-muted">
                  {k.ten ? `${k.ma} ${k.ten}` : k.chu}
                  {k.chu.split("\n")[0]?.includes("(dự án tôi chọn)") && <span className="ml-1">· dự án tôi chọn</span>}
                </div>
                {k.kin ? (
                  <KhoiInWeb kin={k.kin} />
                ) : (
                  k.ten && (
                    <pre className="overflow-x-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-text-secondary">{ngayTrongChu(than.join("\n"))}</pre>
                  )
                )}
                {k.anh.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {k.anh.map((a, j) => (
                      <AnhKhoi key={j} dacTa={a.dacTa} chuThich={a.chuThich} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-text-muted">{ngayTrongChu(ban.cuoi)}</pre>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[400px]">
          <DienThoaiTelegram dauVao={dauVao} coDinh={false} />
          <p className="mt-1 text-center text-[11px] text-text-muted">
            {tele.tinHtml.length} tin chữ · {tele.anh.length} ảnh — cùng hàm với lúc gửi, thấy gì ở đây Telegram nhận đúng như vậy
          </p>
        </div>
      )}
    </div>
  );
}
