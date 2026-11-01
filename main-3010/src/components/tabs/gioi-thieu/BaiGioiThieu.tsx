"use client";

// ============================================================
// BaiGioiThieu — khuôn đọc bài lấy đúng theo trang bài viết của agent pháp lý
// (`components/ArticleReader.tsx` + `.reader/.toc/.content` trong globals.css
// của phaply), đo ngày 06/09 rồi dịch sang token màu tối của agent tiến độ:
//
//   .reader  → lưới 220px mục lục · 1fr thân bài, khe 24px
//   .toc     → dính (sticky), tự cuộn, mục đang đọc tô accent
//   .content → thẻ nền surface, chữ 14.5px/1.75, h2 có vạch ngăn phía trên
//   dưới 900px  → đổ về MỘT cột (Mr. Đại xem bằng điện thoại)
//
// Mục lục sinh từ chính mảng MUC_GIOI_THIEU — không chép tay (luật 7).
// ============================================================

import { useEffect, useState } from "react";
import { MUC_GIOI_THIEU } from "@/lib/gioi-thieu/noi-dung";

export function BaiGioiThieu() {
  const [dangDoc, setDangDoc] = useState<string>(MUC_GIOI_THIEU[0]?.id ?? "");

  // Mục đang đọc: lấy mục cuối cùng có đỉnh đã trôi qua vạch 120px từ đầu khung
  useEffect(() => {
    const tinh = (): void => {
      let hienTai = MUC_GIOI_THIEU[0]?.id ?? "";
      for (const m of MUC_GIOI_THIEU) {
        const el = document.getElementById(m.id);
        if (el && el.getBoundingClientRect().top <= 120) hienTai = m.id;
      }
      setDangDoc(hienTai);
    };
    tinh();
    window.addEventListener("scroll", tinh, { passive: true });
    return () => window.removeEventListener("scroll", tinh);
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      {/* ===== MỤC LỤC — dính bên trái, giống .toc của phaply ===== */}
      <aside className="scroll-thin sticky top-[var(--cao-topmenu)] hidden max-h-[calc(100vh-90px)] self-start overflow-y-auto rounded border border-border bg-surface p-4 shadow-card lg:block">
        <div className="mb-3 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">
          Mục lục
        </div>
        {MUC_GIOI_THIEU.map((m) => (
          <a
            key={m.id}
            href={`#${m.id}`}
            data-lenh="gioi-thieu.muc-luc"
            data-gia-tri={m.id}
            className={`mb-0.5 block rounded-sm px-2 py-1.5 text-[12.5px] font-medium transition ${
              dangDoc === m.id
                ? "bg-accent-soft font-bold text-accent"
                : "text-text-secondary hover:bg-white/5 hover:text-text"
            }`}
          >
            {m.tieuDe}
          </a>
        ))}
      </aside>

      {/* ===== THÂN BÀI ===== */}
      <article className="min-w-0 rounded border border-border bg-surface px-6 py-6 shadow-card sm:px-8">
        <h1 className="text-[20px] font-bold text-text">Agent tiến độ — giới thiệu</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
          Đọc một mạch để nắm: AI này dùng làm gì, nó chạy theo trình tự nào, và nó đứng ở đâu trong hệ
          SCI AI Agent. Thao tác chi tiết của từng màn nằm ở nút{" "}
          <b className="text-text">❓ Hướng dẫn</b> ngay trên màn đó.
        </p>

        {/* Mục lục gọn cho điện thoại — màn hẹp không có cột trái */}
        <div className="mt-4 flex flex-wrap gap-1.5 lg:hidden">
          {MUC_GIOI_THIEU.map((m) => (
            <a
              key={m.id}
              href={`#${m.id}`}
              className="rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
            >
              {m.tieuDe}
            </a>
          ))}
        </div>

        {MUC_GIOI_THIEU.map((m, i) => (
          <section
            key={m.id}
            id={m.id}
            className={`scroll-mt-[70px] ${
              i === 0 ? "mt-6" : "mt-7 border-t border-border-light pt-6"
            }`}
          >
            <h2 className="text-[16px] font-bold text-text">{m.tieuDe}</h2>
            {m.dan && <p className="mt-0.5 text-[12px] italic text-text-muted">{m.dan}</p>}
            <div className="mt-2.5 space-y-2.5 text-[13px] leading-[1.75] text-text-secondary">
              {m.than}
            </div>
          </section>
        ))}

        <p className="mt-8 border-t border-border-light pt-4 text-[11px] text-text-muted">
          Nguồn của trang này là bộ tài liệu chốt trong{" "}
          <span className="font-mono">0 Tài liệu thiết kế/CHOT</span>. Số liệu trong bài đo từ code
          đang chạy, không viết theo trí nhớ.
        </p>
      </article>
    </div>
  );
}
