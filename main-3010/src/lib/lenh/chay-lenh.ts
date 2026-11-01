// ============================================================
// chay-lenh.ts — BỘ CHẠY LỆNH GIAO DIỆN (chạy trong trình duyệt)
//
// Tìm phần tử theo `data-lenh` (và `data-wbs` với lệnh trong bảng tiến độ),
// rồi bấm / điền / chọn / cuộn tới. KHÔNG dùng toạ độ chuột, KHÔNG chụp màn.
//
// Ô nhập của React không nhận `el.value = "x"` — React nghe qua setter gốc của
// prototype. Đo trong phiên 06/09: đẩy chữ bằng nativeSetter + dispatch("input")
// thì React nhận đúng (đã thử trên ô chat và form giao việc).
//
// Client-only (đụng document/window).
// ============================================================

import {
  NHIP,
  TRAN_BUOC,
  bangNhau,
  type BuocGiaoDien,
  type KetQuaBuoc,
  type TocDoDien,
} from "./mo-hinh";
import { timTheoMoc } from "./danh-muc";
import { latToiMa } from "@/components/common/PhanTrang";

const ID_TRO = "sci-tro-chuot-ao";
const ID_THANH = "sci-thanh-dien";
const ID_NHAN = "sci-nhan-tro";

function nghi(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Tìm phần tử mang lệnh; có wbs thì phải đúng dòng đó */
export function timPhanTu(lenh: string, wbs?: string, giaTri?: string): HTMLElement | null {
  const q = (s: string) => document.querySelector<HTMLElement>(s);
  const an = (v: string) => v.replace(/["\\]/g, "\\$&");
  if (wbs) {
    const el = q(`[data-lenh="${an(lenh)}"][data-wbs="${an(wbs)}"]`);
    if (el) return el;
  }
  if (giaTri) {
    const el = q(`[data-lenh="${an(lenh)}"][data-gia-tri="${an(giaTri)}"]`);
    if (el) return el;
    // Không trùng khít thì so kiểu người đọc ("giãn" ↔ "Giãn rộng thang ngang")
    const ds = Array.from(document.querySelectorAll<HTMLElement>(`[data-lenh="${an(lenh)}"]`));
    const gan = ds.find((e) => bangNhau(e.getAttribute("data-gia-tri") ?? "", giaTri));
    if (gan) return gan;
  }
  return q(`[data-lenh="${an(lenh)}"]`);
}

// ===== Con trỏ ảo (mức ③ Mr. Đại chọn) =====
// Hình vẽ trong trang, KHÔNG chiếm chuột thật của máy — người dùng vẫn gõ
// việc khác được trong lúc trợ lý thao tác.

function troChuot(): HTMLElement {
  let el = document.getElementById(ID_TRO);
  if (el) return el;
  el = document.createElement("div");
  el.id = ID_TRO;
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:34px",
    "height:34px",
    "z-index:2147483000",
    "pointer-events:none",
    "opacity:0",
    "filter:drop-shadow(0 3px 8px rgba(0,0,0,.55))",
    "transition:transform .55s cubic-bezier(.22,.61,.36,1),opacity .2s",
  ].join(";");
  // Vòng sáng quanh mũi tên để nổi trên mọi nền bảng (đo 06/09: bản 22px
  // không nhìn thấy trên nền tối nhiều chữ)
  el.innerHTML =
    '<svg viewBox="0 0 34 34" width="34" height="34" fill="none" style="overflow:visible">' +
    '<circle cx="9" cy="9" r="13" fill="var(--accent)" opacity=".18"><animate attributeName="r" values="9;15;9" dur="1.4s" repeatCount="indefinite"/></circle>' +
    '<circle cx="9" cy="9" r="8.4" fill="var(--accent)" opacity=".3"/>' +
    '<path d="M4 2l16.5 9.5-7.3 1.9L10.6 21z" fill="var(--accent)" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>' +
    "</svg>" +
    // Nhãn chữ đi theo con trỏ: dù mũi tên lẫn vào nền bảng nhiều chữ thì vẫn
    // đọc được "trợ lý đang ở đây" (Mr. Đại báo 2 lần không thấy con trỏ)
    '<span id="' +
    ID_NHAN +
    '" style="position:absolute;left:30px;top:6px;white-space:nowrap;' +
    "padding:2px 7px;border-radius:6px;background:var(--accent);color:#fff;" +
    "font:600 11px 'Segoe UI',Arial,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.5)\"></span>";
  document.body.appendChild(el);
  return el;
}

function anTroChuot(): void {
  const el = document.getElementById(ID_TRO);
  if (el) el.style.opacity = "0";
}

/**
 * Chờ phần tử NGỪNG DI CHUYỂN rồi mới trả toạ độ.
 * LỖI Mr. Đại bắt 06/09 ("không nhìn thấy con chuột"): đọc toạ độ ngay sau khi
 * gọi scrollIntoView smooth thì trang còn đang cuộn → con trỏ bay tới chỗ CŨ,
 * hoá ra nằm ngoài màn hình (đo được translate(20px, −270px)).
 */
async function choYen(el: HTMLElement): Promise<DOMRect> {
  let truoc = el.getBoundingClientRect();
  for (let i = 0; i < 12; i++) {
    await nghi(60);
    const nay = el.getBoundingClientRect();
    if (Math.abs(nay.top - truoc.top) < 1 && Math.abs(nay.left - truoc.left) < 1) return nay;
    truoc = nay;
  }
  return truoc;
}

async function bayToi(el: HTMLElement, nhanh: boolean): Promise<void> {
  const tro = troChuot();
  const r = await choYen(el);
  // KẸP vào trong khung nhìn: phần tử có thể nằm ngoài (thanh dính che, danh
  // sách vừa co lại sau cú bấm trước, khung cuộn riêng…). Không kẹp thì con
  // trỏ bay ra ngoài mép và người dùng KHÔNG THẤY GÌ — đúng lỗi Mr. Đại báo
  // 06/09 (đo được y = −58px trên khung 1280×860).
  const le = 22;
  const x = Math.max(
    le,
    Math.min(window.innerWidth - le, r.left + Math.min(r.width / 2, 40))
  );
  const y = Math.max(le, Math.min(window.innerHeight - le, r.top + r.height / 2));
  tro.style.transitionDuration = nhanh ? ".18s" : ".55s";
  tro.style.opacity = "1";
  tro.style.transform = `translate(${x}px, ${y}px)`;
  // Kể cả chế độ nhanh cũng chờ con trỏ tới nơi rồi mới bấm — không thì
  // người dùng chỉ thấy màn hình nhảy, không thấy ai bấm gì
  await nghi(nhanh ? 200 : 600);
}

/** Gợn sóng tại chỗ bấm — cho người dùng thấy ĐÚNG nút nào vừa bị bấm */
function gonSong(el: HTMLElement): void {
  // rect đọc tại đây đã ổn định vì bayToi() vừa chờ xong
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return; // phần tử vừa biến mất
  const s = document.createElement("div");
  s.setAttribute("aria-hidden", "true");
  s.style.cssText = [
    "position:fixed",
    `left:${r.left - 4}px`,
    `top:${r.top - 4}px`,
    `width:${r.width + 8}px`,
    `height:${r.height + 8}px`,
    "border:3px solid var(--accent)",
    "border-radius:8px",
    "background:color-mix(in srgb, var(--accent) 18%, transparent)",
    "box-shadow:0 0 0 4px color-mix(in srgb, var(--accent) 25%, transparent)",
    "z-index:2147482999",
    "pointer-events:none",
    "opacity:1",
    "transition:opacity .7s,transform .7s",
  ].join(";");
  document.body.appendChild(s);
  requestAnimationFrame(() => {
    s.style.opacity = "0";
    s.style.transform = "scale(1.12)";
  });
  setTimeout(() => s.remove(), 760);
}

// ===== Thanh diễn: Dừng · Chậm · Nhanh =====
// Bộ chạy TỰ dựng thanh này vào body thay vì để khung chat vẽ — như vậy gọi
// từ đâu cũng thấy (kể cả nút "Xem thử" trong Cài đặt), và không mất khi
// chuyển trang giữa chừng. (Mr. Đại test 06/09: không thấy thanh đâu.)

interface TayDieuKhien {
  capNhat: (moTa: string, i: number, tong: number) => void;
  dong: (cauCuoi: string) => void;
  tocDo: () => TocDoDien;
}

function moThanhDien(
  tocDoBanDau: TocDoDien,
  onDung: () => void,
  onDoiTocDo?: (t: TocDoDien) => void
): TayDieuKhien {
  document.getElementById(ID_THANH)?.remove();
  let tocDo = tocDoBanDau;

  const hop = document.createElement("div");
  hop.id = ID_THANH;
  hop.setAttribute("role", "status");
  hop.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:18px",
    "transform:translateX(-50%)",
    "z-index:2147483002",
    "display:flex",
    "align-items:center",
    "gap:10px",
    "padding:10px 14px",
    "border-radius:12px",
    "border:1px solid var(--accent)",
    "background:var(--surface)",
    "color:var(--text)",
    "font:500 12.5px/1.3 'Segoe UI',Arial,sans-serif",
    "box-shadow:0 10px 34px rgba(0,0,0,.45)",
  ].join(";");

  const chu = document.createElement("span");
  chu.textContent = "🖱 Trợ lý đang thao tác…";
  hop.appendChild(chu);

  const nut = (nhan: string, bam: () => void): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = nhan;
    b.style.cssText = [
      "padding:4px 9px",
      "border-radius:7px",
      "border:1px solid var(--border)",
      "background:transparent",
      "color:var(--text-secondary)",
      "font:600 11.5px 'Segoe UI',Arial,sans-serif",
      "cursor:pointer",
    ].join(";");
    b.addEventListener("click", bam);
    hop.appendChild(b);
    return b;
  };

  nut("⏸ Dừng", () => {
    onDung();
    chu.textContent = "⏸ Đang dừng…";
  });
  const nCham = nut("🐢 Chậm", () => doiToc("cham"));
  const nNhanh = nut("🐇 Nhanh", () => doiToc("nhanh"));

  function veNut(): void {
    for (const [b, bat] of [
      [nCham, tocDo === "cham"],
      [nNhanh, tocDo === "nhanh"],
    ] as [HTMLButtonElement, boolean][]) {
      b.style.borderColor = bat ? "var(--accent)" : "var(--border)";
      b.style.color = bat ? "var(--accent)" : "var(--text-secondary)";
      b.style.background = bat ? "var(--accent-bg)" : "transparent";
    }
  }
  function doiToc(t: TocDoDien): void {
    tocDo = t;
    veNut();
    onDoiTocDo?.(t);
  }
  veNut();
  document.body.appendChild(hop);

  return {
    capNhat: (moTa, i, tong) => {
      chu.textContent = `🖱 Bước ${i}/${tong} — ${moTa}`;
    },
    dong: (cauCuoi) => {
      chu.textContent = cauCuoi;
      // giữ lại một nhịp để người dùng kịp đọc kết quả rồi mới biến mất
      setTimeout(() => document.getElementById(ID_THANH)?.remove(), 2600);
    },
    tocDo: () => tocDo,
  };
}

// ===== Bốn thao tác =====

/** Đẩy giá trị vào ô React (input/textarea/select) đúng đường React nghe được */
function datGiaTri(el: HTMLElement, gt: string): boolean {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : el instanceof HTMLInputElement
          ? HTMLInputElement.prototype
          : null;
  if (!proto) return false;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (!setter) return false;
  setter.call(el, gt);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/** Gõ từng ký tự cho người nhìn thấy — nhanh thì đặt thẳng một phát */
async function goDan(el: HTMLElement, gt: string, nhipPhim: number): Promise<boolean> {
  if (nhipPhim <= 0) return datGiaTri(el, gt);
  for (let i = 1; i <= gt.length; i++) {
    if (!datGiaTri(el, gt.slice(0, i))) return false;
    await nghi(nhipPhim);
  }
  return true;
}

function laONhap(el: HTMLElement): boolean {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement
  );
}

/** Ô checkbox/radio: "bật" | "tắt" | "" (đảo) */
function datTick(el: HTMLInputElement, gt: string): void {
  const muon = gt === "" ? !el.checked : gt === "bật" || gt === "bat" || gt === "true";
  if (el.checked !== muon) el.click();
}

// ===== Chạy một bước =====

/**
 * BƯỚC NGẦM: vài lệnh nằm trong hộp/danh sách phải MỞ RA mới bấm được. Trợ lý
 * không phải biết chuyện này — bộ chạy tự mở giúp rồi mới thao tác.
 * (đo 06/09: trợ lý dựng bước "chọn lọc" mà quên bước mở hộp Lưu)
 */
const MO_TRUOC: Record<string, string> = {
  "chung.doi-du-an": "chung.doi-du-an.mo",
  // 24/09: bỏ 4 lệnh Lưu của /planning (D1–D4) — trang đã gỡ khỏi Main
};

/**
 * Thanh "đang nghĩ" — hiện NGAY khi gửi câu, trước cả khi trợ lý trả lời.
 * Mr. Đại test 06/09: chờ 40–60 giây không thấy gì rồi thao tác vụt qua trong
 * 4 giây nên tưởng tính năng không chạy. Phải cho người dùng biết đang chờ ai.
 */
export function moThanhCho(): () => void {
  document.getElementById(ID_THANH)?.remove();
  const hop = document.createElement("div");
  hop.id = ID_THANH;
  hop.setAttribute("role", "status");
  hop.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:18px",
    "transform:translateX(-50%)",
    "z-index:2147483002",
    "display:flex",
    "align-items:center",
    "gap:8px",
    "padding:9px 14px",
    "border-radius:12px",
    "border:1px dashed var(--accent)",
    "background:var(--surface)",
    "color:var(--text-secondary)",
    "font:500 12.5px/1.3 'Segoe UI',Arial,sans-serif",
    "box-shadow:0 10px 34px rgba(0,0,0,.45)",
  ].join(";");
  hop.dataset.cho = "1"; // dấu để biết đây là hộp CHỜ, chưa phải thanh diễn
  const bat = Date.now();
  const ve = (): void => {
    const giay = Math.round((Date.now() - bat) / 1000);
    hop.textContent = `🤖 Trợ lý đang nghĩ… ${giay}s (thường 30–60 giây, xong mới bắt đầu bấm)`;
  };
  ve();
  const dem = window.setInterval(ve, 1000);
  document.body.appendChild(hop);
  return () => {
    window.clearInterval(dem);
    // Trợ lý trả lời xong: chờ nửa giây xem có thao tác không. Có thì
    // chayDayBuoc đã thay bằng thanh diễn (mất dấu "cho") — để nguyên.
    // Không có thao tác nào thì dọn hộp đi, đừng để treo mãi trên màn.
    window.setTimeout(() => {
      const con = document.getElementById(ID_THANH);
      if (con?.dataset.cho === "1") con.remove();
    }, 500);
  };
}

export interface TuyChonChay {
  tocDo: TocDoDien;
  /** Điều hướng SPA — ChatPanel truyền router.push vào (lệnh kiểu mở trang) */
  diTrang?: (duongDan: string) => void;
  /** Trả true để dừng giữa chừng (người bấm ⏸ Dừng) */
  daDung: () => boolean;
  /** Báo cho khung chat biết đang làm bước nào (thanh diễn tự lo phần hiển thị) */
  bao?: (moTa: string, chiSo: number, tong: number) => void;
  /** Người bấm 🐢/🐇 giữa chừng — để bên gọi lưu lựa chọn cho lần sau */
  onDoiTocDo?: (t: TocDoDien) => void;
}

export async function chayMotBuoc(b: BuocGiaoDien, tc: TuyChonChay): Promise<KetQuaBuoc> {
  const khai = timTheoMoc(b.lenh);
  if (!khai) {
    return { lenh: b.lenh, ok: false, loi: `Lệnh "${b.lenh}" không có trong sổ lệnh.` };
  }
  // Lệnh MỞ TRANG không có nút nào để bấm — đi bằng điều hướng của app
  if (khai.kieu === "mo-trang") {
    const duong = (b.giaTri ?? "").trim();
    if (!duong.startsWith("/")) {
      return { lenh: b.lenh, ok: false, loi: `Thiếu đường dẫn trang cần mở.` };
    }
    if (!tc.diTrang) {
      return { lenh: b.lenh, ok: false, loi: "Khung trợ lý này không mở trang hộ được." };
    }
    if (window.location.pathname !== duong) {
      tc.diTrang(duong);
      // chờ trang mới vẽ xong rồi mới chạy bước sau, nếu không sẽ tìm hụt
      await nghi(tc.tocDo === "nhanh" ? 900 : 1400);
    }
    return { lenh: b.lenh, ok: true };
  }

  // A7 "cuộn tới đúng dòng/mục" là lệnh CHUNG, không gắn vào nút nào: tìm bất
  // kỳ phần tử nào mang đúng data-wbs trên trang hiện tại (dòng bảng tiến độ,
  // thẻ issue, dòng TK-…). Không có wbs thì không biết cuộn tới đâu.
  if (b.lenh === "chung.cuon-toi") {
    const q = (b.wbs ?? b.giaTri ?? "").trim();
    if (q === "") {
      return { lenh: b.lenh, ok: false, loi: "Chưa nói rõ cuộn tới dòng/mục nào." };
    }
    const chon = `[data-wbs="${q.replace(/["\\]/g, "\\$&")}"]`;
    let dich = document.querySelector<HTMLElement>(chon);
    // Dòng nằm ở trang khác của một khối chia trang (E40) → lật tới trang đó rồi tìm lại
    if (!dich) {
      latToiMa(q);
      await nghi(120);
      dich = document.querySelector<HTMLElement>(chon);
    }
    if (!dich) {
      return { lenh: b.lenh, ok: false, loi: `Không thấy "${q}" trên màn hình này.` };
    }
    dich.scrollIntoView({ behavior: tc.tocDo === "nhanh" ? "auto" : "smooth", block: "center" });
    await bayToi(dich, tc.tocDo === "nhanh");
    gonSong(dich);
    return { lenh: b.lenh, ok: true };
  }

  // Nằm trong hộp chưa mở → tự mở giúp (bước ngầm), rồi thử lại
  const moTruoc = MO_TRUOC[b.lenh];
  if (moTruoc && !timPhanTu(b.lenh, b.wbs, b.giaTri)) {
    const nutMo = timPhanTu(moTruoc);
    if (nutMo) {
      nutMo.click();
      await nghi(tc.tocDo === "nhanh" ? 160 : 420);
    }
  }

  // Dòng mang mã WBS nằm ở trang khác của một khối chia trang (E40) → lật tới trang đó trước
  if (b.wbs && !document.querySelector(`[data-wbs="${CSS.escape(b.wbs)}"]`)) {
    latToiMa(b.wbs);
    await nghi(120);
  }
  const el = timPhanTu(b.lenh, b.wbs, b.giaTri);
  if (!el) {
    return {
      lenh: b.lenh,
      ok: false,
      loi: b.wbs
        ? `Không thấy "${khai.ten}" ở dòng ${b.wbs} trên màn hình này.`
        : `Không thấy "${khai.ten}" trên màn hình này — có thể đang ở trang khác.`,
    };
  }

  const nhanh = tc.tocDo === "nhanh";
  const nhip = NHIP[tc.tocDo];

  el.scrollIntoView({ behavior: nhanh ? "auto" : "smooth", block: "center" });
  // Bấm bước trước có thể làm danh sách co lại và đẩy phần tử ra khỏi màn —
  // cuộn lại lần nữa nếu vẫn lệch, rồi mới cho con trỏ bay tới
  {
    const r0 = el.getBoundingClientRect();
    if (r0.top < 0 || r0.bottom > window.innerHeight) {
      await nghi(120);
      el.scrollIntoView({ behavior: "auto", block: "center" });
    }
  }
  await bayToi(el, nhanh); // tự chờ trang cuộn xong mới lấy toạ độ

  try {
    if (khai.kieu === "cuon") {
      gonSong(el);
      return { lenh: b.lenh, ok: true };
    }

    if (khai.kieu === "dien") {
      if (!laONhap(el)) return { lenh: b.lenh, ok: false, loi: `"${khai.ten}" không phải ô nhập.` };
      (el as HTMLElement).focus();
      const ok = await goDan(el, b.giaTri ?? "", nhip.goPhim);
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      gonSong(el);
      return ok
        ? { lenh: b.lenh, ok: true }
        : { lenh: b.lenh, ok: false, loi: `Không điền được vào "${khai.ten}".` };
    }

    if (khai.kieu === "chon") {
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        datTick(el, b.giaTri ?? "");
      } else if (el instanceof HTMLSelectElement) {
        const muon = b.giaTri ?? "";
        const co =
          Array.from(el.options).find((o) => o.value === muon || o.text.trim() === muon.trim()) ??
          Array.from(el.options).find((o) => bangNhau(o.text, muon));
        if (!co) {
          return {
            lenh: b.lenh,
            ok: false,
            loi: `"${b.giaTri}" không có trong danh sách "${khai.ten}".`,
          };
        }
        datGiaTri(el, co.value);
      } else {
        el.click();
      }
      gonSong(el);
      return { lenh: b.lenh, ok: true };
    }

    // Nút cần chữ đi kèm (G8 bác bỏ "kèm lý do"): phần tử khai `data-dien-truoc` = móc
    // của ô nhập cùng dòng — điền `giaTri` vào ô đó rồi mới bấm (24/09).
    const dienTruoc = el.getAttribute("data-dien-truoc");
    if (dienTruoc && (b.giaTri ?? "").trim() !== "") {
      const o = timPhanTu(dienTruoc, b.wbs);
      if (!o || !laONhap(o)) return { lenh: b.lenh, ok: false, loi: `Không thấy ô cần điền trước khi bấm "${khai.ten}".` };
      o.focus();
      const daDien = await goDan(o, b.giaTri ?? "", nhip.goPhim);
      o.dispatchEvent(new Event("blur", { bubbles: true }));
      if (!daDien) return { lenh: b.lenh, ok: false, loi: `Không điền được chữ trước khi bấm "${khai.ten}".` };
      await nghi(nhanh ? 60 : 200);
    }

    // "bam" và "mo-trang" đều là một cú bấm trên phần tử đã khai
    el.click();
    gonSong(el);
    return { lenh: b.lenh, ok: true };
  } catch (e) {
    return {
      lenh: b.lenh,
      ok: false,
      loi: e instanceof Error ? e.message.slice(0, 140) : "Lỗi không rõ khi thao tác.",
    };
  }
}

/**
 * Chạy cả dãy bước. Hỏng bước nào DỪNG NGAY tại đó — không chạy tiếp trên
 * trạng thái sai (nếp Mr. Đại: hỏng thì dừng, báo rõ dừng ở đâu).
 */
export async function chayDayBuoc(
  ds: BuocGiaoDien[],
  tc: TuyChonChay
): Promise<KetQuaBuoc[]> {
  const buoc = ds.slice(0, TRAN_BUOC);
  const kq: KetQuaBuoc[] = [];
  let daDung = false;
  troChuot(); // dựng sẵn con trỏ + nhãn ngay từ bước 1, không đợi tới bước 2
  const tay = moThanhDien(
    tc.tocDo,
    () => {
      daDung = true;
    },
    tc.onDoiTocDo
  );
  // Tốc độ đọc từ thanh mỗi bước → bấm 🐢/🐇 giữa chừng là ăn ngay
  const tcSong: TuyChonChay = { ...tc, get tocDo() {
    return tay.tocDo();
  } };

  for (let i = 0; i < buoc.length; i++) {
    if (daDung || tc.daDung()) {
      kq.push({ lenh: buoc[i].lenh, ok: false, loi: "Người dùng bấm Dừng." });
      break;
    }
    tay.capNhat(buoc[i].moTa, i + 1, buoc.length);
    const nhan = document.getElementById(ID_NHAN);
    if (nhan) nhan.textContent = `${i + 1}/${buoc.length} ${buoc[i].moTa}`;
    tc.bao?.(buoc[i].moTa, i + 1, buoc.length);
    const r = await chayMotBuoc(buoc[i], tcSong);
    kq.push(r);
    if (!r.ok) break;
    await nghi(NHIP[tay.tocDo()].buoc);
  }
  const hong = kq.find((r) => !r.ok);
  const nhanCuoi = document.getElementById(ID_NHAN);
  if (nhanCuoi) nhanCuoi.textContent = hong ? "dừng ở đây" : "xong";
  // Giữ con trỏ thêm 2,2 giây rồi mới mờ đi — tắt ngay thì người dùng vừa
  // nhìn lên đã không thấy gì (lỗi Mr. Đại báo 2 lần)
  setTimeout(anTroChuot, 2200);
  tay.dong(
    hong
      ? `⚠️ Dừng ở bước ${kq.length}/${buoc.length} — ${hong.loi ?? "lỗi"}`
      : `✅ Xong ${kq.length} bước`
  );
  return kq;
}
