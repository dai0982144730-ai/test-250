"use client";

/**
 * Ô NHẬP NGÀY dd/mm/yyyy — thay <input type="date"> (Mr. Đại 04/10/2026: "các hiển thị ngày tháng luôn luôn phải theo
 * cấu trúc dd/mm/yyyy"; GD-8). Ô ngày gốc của trình duyệt hiện theo NGÔN NGỮ MÁY — máy tiếng Anh ra "04/30/2027" + lịch
 * "April 2027 · Su Mo Tu" — code không ép được. Ô này: gõ số tự chèn "/", bấm vào ô mở lịch tiếng Việt (tuần bắt đầu
 * Thứ Hai), bấm một ngày là chọn và đóng (bớt cú bấm). Giá trị vào/ra vẫn là ISO yyyy-mm-dd như ô gốc — `value` +
 * `onChange(iso)` (kiểu điều khiển) hoặc `defaultValue` + `name` (form gửi thẳng, kèm ô ẩn ISO) — nên thay thẳng chỗ cũ,
 * máy chủ không phải sửa. Tô màu bằng biến giao diện có sẵn ở cả 4 app (--surface, --border, --accent; chữ --text hoặc
 * --ink) nên MỘT bản chép nguyên ở Main · Tiến độ · Hợp đồng · Pháp lý · Công việc (bản gốc: Main — sửa ở Main rồi chép, luật 7).
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const RONG_LICH = 256;
const CAO_LICH = 300;

function isoSangChu(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** "04/10/2026" → "2026-10-04"; ngày không có thật (31/02) → null */
function chuSangIso(chu: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(chu);
  if (!m) return null;
  const d = Number(m[1]);
  const t = Number(m[2]);
  const n = Number(m[3]);
  const x = new Date(Date.UTC(n, t - 1, d));
  if (x.getUTCFullYear() !== n || x.getUTCMonth() !== t - 1 || x.getUTCDate() !== d) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Gõ số → tự chèn "/": 0410 → 04/10 · 04102026 → 04/10/2026 */
function chenGach(goc: string): string {
  const so = goc.replace(/\D/g, "").slice(0, 8);
  if (so.length <= 2) return so;
  if (so.length <= 4) return `${so.slice(0, 2)}/${so.slice(2)}`;
  return `${so.slice(0, 2)}/${so.slice(2, 4)}/${so.slice(4)}`;
}

const hai = (n: number) => String(n).padStart(2, "0");

function homNayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}`;
}

type Props = {
  /** ISO yyyy-mm-dd, "" = trống — kiểu điều khiển (đi cùng onChange) */
  value?: string;
  /** ISO — kiểu form không điều khiển (đi cùng name) */
  defaultValue?: string;
  onChange?: (iso: string) => void;
  /** có name → kèm ô ẩn gửi ISO theo form */
  name?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
  id?: string;
  "aria-label"?: string;
  "data-lenh"?: string;
};

export default function ONhapNgay(p: Props) {
  const dieuKhien = p.value !== undefined;
  const [isoTrong, setIsoTrong] = useState(p.defaultValue ?? "");
  const iso = dieuKhien ? (p.value ?? "") : isoTrong;
  const [chu, setChu] = useState(() => isoSangChu(iso));
  const [mo, setMo] = useState(false);
  const [viTri, setViTri] = useState({ x: 0, y: 0 });
  const [trang, setTrang] = useState({ n: 2026, t: 1 });
  const oRef = useRef<HTMLInputElement>(null);
  const hopRef = useRef<HTMLDivElement>(null);

  // Giá trị đổi từ ngoài (hoặc vừa chọn) → hiện lại đúng dd/mm/yyyy
  useEffect(() => {
    setChu(isoSangChu(iso));
  }, [iso]);

  const ngoaiKhoang = (x: string) => Boolean((p.min && x < p.min) || (p.max && x > p.max));

  const dat = (x: string) => {
    if (!dieuKhien) setIsoTrong(x);
    setChu(isoSangChu(x));
    if (x !== iso) p.onChange?.(x);
  };

  const go = (v: string) => {
    const c = chenGach(v);
    setChu(c);
    if (c === "") {
      if (iso !== "") dat("");
      return;
    }
    const x = chuSangIso(c);
    if (x && !ngoaiKhoang(x)) dat(x);
  };

  // Báo lỗi bằng tiếng Việt (câu "Please fill out this field" của trình duyệt là tiếng Anh)
  useEffect(() => {
    const o = oRef.current;
    if (!o) return;
    const x = chu === "" ? "" : chuSangIso(chu);
    let loi = "";
    if (chu === "" && p.required) loi = "Hãy nhập ngày (dd/mm/yyyy)";
    else if (chu !== "" && !x) loi = "Ngày phải đúng dạng dd/mm/yyyy, ví dụ 04/10/2026";
    else if (x && ngoaiKhoang(x))
      loi = `Ngày phải trong khoảng ${p.min ? isoSangChu(p.min) : "…"} – ${p.max ? isoSangChu(p.max) : "…"}`;
    o.setCustomValidity(loi);
  });

  const moLich = () => {
    if (p.disabled || mo) return;
    const r = oRef.current?.getBoundingClientRect();
    if (!r) return;
    const y = window.innerHeight - r.bottom < CAO_LICH + 8 && r.top > CAO_LICH + 8 ? r.top - CAO_LICH - 4 : r.bottom + 4;
    const x = Math.min(Math.max(8, r.left), window.innerWidth - RONG_LICH - 8);
    setViTri({ x, y });
    const g = iso || homNayIso();
    setTrang({ n: Number(g.slice(0, 4)), t: Number(g.slice(5, 7)) });
    setMo(true);
  };

  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: Event) => {
      const t = e.target as Node;
      if (hopRef.current?.contains(t) || oRef.current === t) return;
      setMo(false);
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMo(false);
    };
    const dong = () => setMo(false);
    document.addEventListener("pointerdown", ngoai, true);
    document.addEventListener("keydown", phim);
    window.addEventListener("scroll", ngoai, true);
    window.addEventListener("resize", dong);
    return () => {
      document.removeEventListener("pointerdown", ngoai, true);
      document.removeEventListener("keydown", phim);
      window.removeEventListener("scroll", ngoai, true);
      window.removeEventListener("resize", dong);
    };
  }, [mo]);

  const chon = (x: string) => {
    if (x !== "" && ngoaiKhoang(x)) return;
    dat(x);
    setMo(false);
  };

  const homNay = homNayIso();
  const dau = (new Date(Date.UTC(trang.n, trang.t - 1, 1)).getUTCDay() + 6) % 7; // Thứ Hai = 0
  const o42 = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(trang.n, trang.t - 1, 1 + i - dau));
    return { iso: `${d.getUTCFullYear()}-${hai(d.getUTCMonth() + 1)}-${hai(d.getUTCDate())}`, ngay: d.getUTCDate(), trongThang: d.getUTCMonth() === trang.t - 1 };
  });
  const namDau = Math.min(p.min ? Number(p.min.slice(0, 4)) : trang.n - 10, trang.n);
  const namCuoi = Math.max(p.max ? Number(p.max.slice(0, 4)) : trang.n + 10, trang.n);
  const luiThang = (k: number) => {
    const t = trang.t - 1 + k;
    setTrang({ n: trang.n + Math.floor(t / 12), t: ((t % 12) + 12) % 12 + 1 });
  };

  const chuMau = "var(--text, var(--ink, #1a1a1a))";
  const nutNho: CSSProperties = { border: 0, background: "transparent", color: chuMau, cursor: "pointer", borderRadius: 6, fontSize: 14, lineHeight: 1, padding: "4px 7px" };
  const chonNho: CSSProperties = { border: "1px solid var(--border, #d5d2cd)", background: "var(--surface, #fff)", color: chuMau, borderRadius: 6, fontSize: 12.5, padding: "2px 4px" };

  return (
    <>
      <input
        ref={oRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        id={p.id}
        title={p.title}
        aria-label={p["aria-label"]}
        data-lenh={p["data-lenh"]}
        disabled={p.disabled}
        className={p.className}
        style={{ fontVariantNumeric: "tabular-nums", ...p.style }}
        value={chu}
        onChange={(e) => go(e.target.value)}
        onClick={moLich}
        onFocus={moLich}
        onBlur={() => {
          if (chu !== "" && chuSangIso(chu) === null) setChu(isoSangChu(iso)); // gõ dở → trả lại ngày đang có
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") setMo(false);
          if (e.key === "ArrowDown" && !mo) moLich();
        }}
      />
      {p.name ? <input type="hidden" name={p.name} value={iso} /> : null}
      {mo &&
        createPortal(
          <div
            ref={hopRef}
            role="dialog"
            aria-label="Chọn ngày"
            style={{
              position: "fixed", left: viTri.x, top: viTri.y, width: RONG_LICH, zIndex: 1000, boxSizing: "border-box",
              background: "var(--surface, #fff)", color: chuMau, border: "1px solid var(--border, #d5d2cd)", borderRadius: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,.28)", padding: 8, fontSize: 12.5, fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <button type="button" style={nutNho} onClick={() => luiThang(-1)} aria-label="Tháng trước">‹</button>
              <select aria-label="Tháng" style={{ ...chonNho, flex: 1 }} value={trang.t} onChange={(e) => setTrang({ ...trang, t: Number(e.target.value) })}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i + 1}>Tháng {i + 1}</option>
                ))}
              </select>
              <select aria-label="Năm" style={chonNho} value={trang.n} onChange={(e) => setTrang({ ...trang, n: Number(e.target.value) })}>
                {Array.from({ length: namCuoi - namDau + 1 }, (_, i) => (
                  <option key={i} value={namDau + i}>{namDau + i}</option>
                ))}
              </select>
              <button type="button" style={nutNho} onClick={() => luiThang(1)} aria-label="Tháng sau">›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
              {THU.map((t) => (
                <div key={t} style={{ fontSize: 11, fontWeight: 600, opacity: 0.6, padding: "3px 0" }}>{t}</div>
              ))}
              {o42.map((o) => {
                const daChon = o.iso === iso;
                const cam = ngoaiKhoang(o.iso);
                return (
                  <button
                    key={o.iso}
                    type="button"
                    disabled={cam}
                    onClick={() => chon(o.iso)}
                    title={isoSangChu(o.iso)}
                    style={{
                      border: 0, borderRadius: 6, padding: "6px 0", fontSize: 12.5, cursor: cam ? "not-allowed" : "pointer",
                      background: daChon ? "var(--accent, #ea580c)" : "transparent",
                      color: daChon ? "#fff" : chuMau,
                      fontWeight: daChon || o.iso === homNay ? 700 : 400,
                      boxShadow: o.iso === homNay && !daChon ? "inset 0 0 0 1px var(--accent, #ea580c)" : "none",
                      opacity: cam ? 0.25 : o.trongThang ? 1 : 0.45,
                    }}
                  >
                    {o.ngay}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border, #d5d2cd)" }}>
              {p.required ? <span /> : (
                <button type="button" style={{ ...nutNho, fontSize: 12.5 }} onClick={() => chon("")}>Xoá</button>
              )}
              <button type="button" style={{ ...nutNho, fontSize: 12.5, color: "var(--accent, #ea580c)", fontWeight: 600 }} onClick={() => chon(homNay)}>
                Hôm nay {isoSangChu(homNay)}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
