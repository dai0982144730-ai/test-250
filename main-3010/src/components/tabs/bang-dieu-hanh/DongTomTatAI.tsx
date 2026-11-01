"use client";

// ============================================================
// TÓM TẮT BỐN DÒNG — Bảng điều hành khối ②
//
// Mr. Đại chốt 10/09/2026: LLM viết, có icon 🤖. Đổi 01/11/2026 («cách 1»): MỘT câu dài thành BỐN dòng ngắn
// có nhãn (Kéo lùi COD nhiều nhất · Kéo lùi COD thứ hai · Pháp lý · Tuần này), kiểu liệt kê, không thêm biểu đồ — các khối bên
// dưới đã có biểu đồ và bảng. Bấm một dòng → cuộn tới khối có số gốc (luật 12).
//
// Trình tự hiện: bốn dòng MÁY GHÉP hiện NGAY (màn không chờ AI — luật 3), không icon (luật 19); dòng AI viết
// và qua máy soát thì thay chỗ, có 🤖. Dòng AI trượt soát thì giữ dòng máy ghép.
// ============================================================

import { useEffect, useState } from "react";
import { ngayTrongChu } from "@/lib/ngay-hien";
import type { DongTomTat } from "@/lib/bang-dieu-hanh/tom-tat-bon-dong";

export function DongTomTatAI({
  duAn,
  dongMay,
}: {
  /** Mã dự án đang chọn — đổi dự án là gọi lại */
  duAn: string;
  /** Bốn dòng máy ghép, hiện ngay trong lúc chờ và giữ lại cho dòng AI không viết được */
  dongMay: DongTomTat[];
}) {
  const [dong, setDong] = useState<DongTomTat[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangViet, setDangViet] = useState(true);

  useEffect(() => {
    let con = true;
    setDong(null);
    setLoi(null);
    setDangViet(true);
    void (async () => {
      // ⭐ QS-077 (27/09): máy chủ chờ tối đa 90 giây; lượt viết chưa xong thì trả `dangViet` và VẪN viết tiếp —
      // hỏi lại tối đa 4 lần, mỗi lần chỉ chờ chung lượt đang bay, không sinh lượt LLM mới.
      try {
        for (let lan = 0; lan < 5 && con; lan++) {
          const r = await fetch(`/api/bang-dieu-hanh/tom-tat?du_an=${encodeURIComponent(duAn)}`, { cache: "no-store" });
          const j = (await r.json()) as { ok: boolean; dong?: DongTomTat[] | null; loi?: string | null; dangViet?: boolean };
          if (!con) return;
          if (j.ok && j.dong && j.dong.length > 0) {
            setDong(j.dong);
            return;
          }
          if (!j.dangViet) {
            setLoi(j.loi ?? "Chưa viết được.");
            return;
          }
        }
        if (con) setLoi("AI viết quá lâu (hơn 7 phút) — mở lại màn sau ít phút là có nếu AI viết xong.");
      } catch {
        if (con) setLoi("Không gọi được máy chủ app.");
      } finally {
        if (con) setDangViet(false);
      }
    })();
    return () => {
      con = false;
    };
  }, [duAn]);

  const hien = dong ?? dongMay;
  const cuon = (neo: string) => document.getElementById(neo)?.scrollIntoView({ block: "start" });

  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        {hien.map((d) => (
          <li key={d.khoa}>
            <button
              type="button"
              onClick={() => cuon(d.neo)}
              className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-[13px] leading-relaxed text-text hover:bg-bg2"
              title="Bấm để xuống khối có số gốc"
            >
              <span className="w-4 shrink-0" title={d.laAi ? "Dòng này do AI viết từ số của các khối bên dưới, đã qua máy soát" : undefined}>
                {d.laAi ? "🤖" : ""}
              </span>
              <span>
                <b className="font-semibold">{d.nhan}:</b> {ngayTrongChu(d.chu)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {dangViet && !dong && <div className="pl-7 text-[10.5px] text-text-muted">🤖 đang viết…</div>}
      {loi && <div className="pl-7 text-[10.5px] text-text-muted">Đang hiện câu máy ghép — {loi}</div>}
    </div>
  );
}
