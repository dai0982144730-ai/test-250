"use client";
// ============================================================
// NÚT «? Hướng dẫn» + KHUNG HƯỚNG DẪN dạng tab — chép khung từ agent Nghiệm thu 3015 (Mr. Đại 20/10/2026), gắn vào THANH TRÊN 3004
// cạnh «Giải thích». Luôn hiện: màn có hướng dẫn thì chữ cam phát sáng, không có thì mờ «Màn này chưa có hướng dẫn» (luật 17).
// Màn / tab / khung nào có hướng dẫn nào: tự khai bằng KhaiHuongDan (kho-huong-dan.ts). Nội dung: lib/huong-dan/noi-dung.ts + tab/<mã>.ts.
// Màu khung theo bộ token riêng .hd-khung trong app/phong.css (khung sáng, nhấn cam — đúng cả 2D/3D).
// ============================================================
import { useEffect, useRef, useState } from "react";
import type { HuongDanTab, KhoiHD } from "@/lib/huong-dan/kieu";
import { HUONG_DAN, type MaHuongDan } from "@/lib/huong-dan/noi-dung";
import { useDanhSachHuongDan } from "@/components/huong-dan/kho-huong-dan";

const lay = (ma: MaHuongDan): HuongDanTab => HUONG_DAN[ma];

/** Thanh trên, cạnh «Giải thích» — luôn hiện; mờ khi màn chưa có hướng dẫn */
export function NutHuongDanTren() {
  const ds = useDanhSachHuongDan();
  const [mo, setMo] = useState<MaHuongDan | null>(null);
  useEffect(() => {
    if (!mo) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMo(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [mo]);
  // đổi màn khi khung đang mở mà hướng dẫn đó không còn → đóng
  useEffect(() => {
    if (mo && !ds.includes(mo)) setMo(null);
  }, [ds, mo]);
  const hd = mo ? lay(mo) : null;
  const co = ds.length > 0;

  return (
    <>
      <button
        type="button"
        data-gt="huong-dan"
        disabled={!co}
        className={`nut-tren nut-huong-dan ${co ? "nut-hd-sang" : "nut-hd-mo"}`}
        title={co ? `Hướng dẫn từng bước: ${lay(ds[0]).tieuDe}` : "Màn này chưa có hướng dẫn"}
        onClick={() => co && setMo(ds[0])}
      >
        ? Hướng dẫn
      </button>
      {mo && hd && (
        <div className="hd-khung fixed inset-0 z-[80] flex items-start justify-center bg-black/60 px-2 pt-[3vh] whitespace-normal" onClick={(e) => e.target === e.currentTarget && setMo(null)}>
          <div className="flex max-h-[94vh] w-full max-w-[880px] flex-col rounded border border-accent bg-surface text-[13.5px] text-text shadow-card" role="dialog" aria-label={`Hướng dẫn ${hd.tieuDe}`}>
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <b className="text-[15px] text-accent">Hướng dẫn — {hd.tieuDe}</b>
              <span className="flex-1" />
              <button type="button" className="text-[15px] text-text-muted hover:text-text" title="Đóng (Esc)" onClick={() => setMo(null)}>
                ✕
              </button>
            </div>
            {ds.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-1.5 text-[12px]">
                <span className="text-text-muted">Màn này có {ds.length} hướng dẫn:</span>
                {ds.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={m === mo}
                    className={`rounded-sm border px-2 py-0.5 ${m === mo ? "border-accent font-bold text-accent" : "border-border text-text-secondary hover:border-accent hover:text-accent"}`}
                    onClick={() => setMo(m)}
                  >
                    {lay(m).tieuDe}
                  </button>
                ))}
              </div>
            )}
            <ThanTab key={mo} hd={hd} />
          </div>
        </div>
      )}
    </>
  );
}

// ───────── bản 2 — tab ─────────
function ThanTab({ hd }: { hd: HuongDanTab }) {
  const [i, setI] = useState(0);
  const cuon = useRef<HTMLDivElement | null>(null);
  const chon = (k: number) => {
    setI(k);
    cuon.current?.scrollTo({ top: 0 });
  };
  const t = hd.tab[i];
  return (
    <div ref={cuon} className="overflow-y-auto">
      {/* thanh tab GHIM — cuộn tới đâu cũng thấy (Mr. Đại 20/10) */}
      <div className="sticky top-0 z-10 border-b border-border bg-surface px-3 pt-2">
        {/* xuống dòng thay vì kéo ngang — thấy đủ mọi tab một lúc */}
        <div className="flex flex-wrap gap-1 pb-2">
          {hd.tab.map((x, k) => (
            <button
              key={x.ten}
              type="button"
              aria-pressed={k === i}
              className={`shrink-0 whitespace-nowrap rounded-sm border px-2.5 py-1 text-[12.5px] transition ${k === i ? "border-accent bg-accent-soft font-bold text-accent" : "border-border text-text-secondary hover:border-accent hover:text-accent"}`}
              onClick={() => chon(k)}
            >
              {x.ten}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pb-4 pt-3">
        {i === 0 && (
          <>
            <div className="mb-1 text-[12.5px] text-text-secondary">Ai làm: {hd.ai}</div>
            <div className="mb-2 text-[12.5px] text-text-secondary">
              Cách đọc: chữ thường = việc <b className="text-text">người</b> làm hoặc <b className="text-text">máy</b> tự tính theo luật cố định ·{" "}
              <span className="font-semibold text-accent">chữ cam có 🤖 = việc AI làm</span> (AI chỉ đề xuất, người kiểm rồi mới có hiệu lực).
            </div>
          </>
        )}
        {t.khoi.map((k, j) => (
          <Khoi key={j} k={k} />
        ))}
        <div className="mt-5 flex items-center gap-2 border-t border-border-light pt-3">
          {i > 0 && (
            <button type="button" className="rounded-sm border border-border px-3 py-1 text-[12.5px] text-text-secondary hover:border-accent hover:text-accent" onClick={() => chon(i - 1)}>
              ← {hd.tab[i - 1].ten}
            </button>
          )}
          <span className="flex-1" />
          {i < hd.tab.length - 1 && (
            <button type="button" className="rounded-sm border border-accent px-3 py-1 text-[12.5px] font-semibold text-accent hover:bg-accent-soft" onClick={() => chon(i + 1)}>
              {hd.tab[i + 1].ten} →
            </button>
          )}
        </div>
        {hd.canCu && <div className="mt-3 text-[11.5px] text-text-muted">Căn cứ: {hd.canCu}</div>}
      </div>
    </div>
  );
}

const KHUNG = "mt-2 rounded border-l-4 px-3 py-2";
/** Chữ bắt đầu bằng 🤖 = việc AI làm → chữ cam (Mr. Đại 20/10 — người đọc phân biệt việc mình làm / việc AI làm) */
function Chu({ x }: { x: string }) {
  return x.startsWith("🤖") ? <span className="font-medium text-accent">{x}</span> : <>{x}</>;
}
function Khoi({ k }: { k: KhoiHD }) {
  return (
    <div className="mt-4 first:mt-1">
      {k.tieuDe && <h3 className="mb-1 text-[14px] font-bold text-text">{k.tieuDe}</h3>}
      {k.doan?.map((x) => (
        <p key={x} className="mt-1.5 leading-relaxed text-text-secondary">
          <Chu x={x} />
        </p>
      ))}
      {k.ds && (
        <ul className="mt-1.5 list-disc space-y-1 pl-5 leading-relaxed text-text-secondary">
          {k.ds.map((x) => (
            <li key={x}>
              <Chu x={x} />
            </li>
          ))}
        </ul>
      )}
      {k.bam && (
        <ol className="mt-1.5 space-y-1.5">
          {k.bam.map((x, n) => (
            <li key={x} className="flex gap-2 leading-relaxed text-text-secondary">
              <b className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-[12px] text-accent">{n + 1}</b>
              <span>
                <Chu x={x} />
              </span>
            </li>
          ))}
        </ol>
      )}
      {k.bang && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                {k.bang[0].map((c) => (
                  <th key={c} className="border border-border bg-bg px-2 py-1.5 text-left font-bold text-text">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {k.bang.slice(1).map((h, r) => (
                <tr key={r}>
                  {h.map((c, n) => (
                    <td key={n} className={`border border-border px-2 py-1.5 align-top leading-relaxed ${n === 0 ? "font-semibold text-text" : "text-text-secondary"}`}>
                      <Chu x={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {k.viDu && (
        <div className={`${KHUNG} border-accent bg-accent-soft/40`}>
          <b className="text-[12.5px] text-text">Ví dụ</b>
          {k.viDu.map((x) => (
            <p key={x} className="mt-0.5 leading-relaxed text-text-secondary">
              <Chu x={x} />
            </p>
          ))}
        </div>
      )}
      {k.ketQua && (
        <div className={`${KHUNG} border-green bg-surface`}>
          <b className="text-[12.5px] text-text">Kết quả</b>
          {k.ketQua.map((x) => (
            <p key={x} className="mt-0.5 leading-relaxed text-text-secondary">
              <Chu x={x} />
            </p>
          ))}
        </div>
      )}
      {k.ai && (
        <div className={`${KHUNG} border-accent bg-accent-soft/30`}>
          <b className="text-[12.5px] text-accent">🤖 AI làm gì ở bước này</b>
          {k.ai.map((x) => (
            <p key={x} className="mt-0.5 font-medium leading-relaxed text-accent">
              {x.replace(/^🤖\s*/u, "")}
            </p>
          ))}
        </div>
      )}
      {k.luuY && (
        <div className={`${KHUNG} border-yellow bg-surface`}>
          <b className="text-[12.5px] text-text">Lưu ý</b>
          {k.luuY.map((x) => (
            <p key={x} className="mt-0.5 leading-relaxed text-text-secondary">
              <Chu x={x} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

