"use client";

// KHUNG CHAT toàn cục (gắn 1 lần trong RootLayout) — 2 CHẾ ĐỘ:
//
//  A) "dock" — NEO CỐ ĐỊNH MÉP TRÁI **HOẶC** MÉP PHẢI (mặc định trái, giống
//     Claude.ai) — bên nào do `dockSide` quyết định:
//     • Panel cao nguyên màn hình, dính mép trái/phải, rộng mặc định 420px
//       (min 320 · max min(720, 50vw)), nhớ trong localStorage.
//     • KHÔNG che nội dung: widget ghi 2 biến CSS `--chat-dock-l` /
//       `--chat-dock-r` lên <html>, AppShell dùng làm padding-left /
//       padding-right → app bị ĐẨY sang bên còn lại. Bên không neo = 0px.
//     • Thanh kéo 5px ở mép TRONG của panel (neo trái → mép phải panel,
//       neo phải → mép trái panel; cursor col-resize, hover sáng accent)
//       dùng pointer capture → đổi độ rộng realtime.
//     • Thu gọn "—" → dải dọc mảnh 40px dính đúng mép đang neo
//       (chấm AI + mũi tên › khi neo trái, ‹ khi neo phải).
//
//  B) "float" — NỔI TỰ DO:
//     • Kéo thả bằng thanh tiêu đề ([data-chat-drag]), thu gọn thành thanh
//       dính đáy màn hình.
//     • ĐỔI KÍCH THƯỚC 8 HƯỚNG: 4 mép (dày EDGE_HIT=6px) + 4 góc (ô
//       CORNER_HIT=14px, đè lên mép nhờ z cao hơn). Kéo mép TRÊN/TRÁI đổi cả
//       vị trí lẫn kích thước (mép đối diện đứng yên); mép DƯỚI/PHẢI chỉ đổi
//       kích thước. Giới hạn min 320×360 · max 96vw × 96vh · không lọt ra
//       ngoài màn hình. Các tay nắm KHÔNG hiện ở chế độ neo / khi thu gọn.
//
//  NHỚ KÍCH THƯỚC KHUNG NỔI (`floatBefore`):
//     • Trước MỌI lần float → dock (kéo snap vào mép, bấm nút neo trái/phải,
//       bấm nút "Neo" đổi chế độ) → chụp lại {x,y,w,h} hiện tại.
//     • Khi GỠ NEO: kéo tiêu đề ra khỏi mép ⇒ w/h lấy lại từ `floatBefore`
//       (x/y bám con trỏ); bấm nút "Khung nổi" ⇒ khôi phục nguyên x/y/w/h.
//     • Chưa từng có `floatBefore` (người dùng mới) → 400×600 góc phải dưới.
//     • Nút "↺ Về mặc định" vẫn LUÔN ép về 400×600 góc phải dưới.
//
//  KÉO ĐỂ NEO / GỠ NEO (snap kiểu Windows) — dùng chung cho cả 2 chế độ:
//    • FLOAT → kéo con trỏ vào dải 80px sát mép TRÁI  ⇒ xem trước cột dọc
//      nguyên chiều cao (rộng dockW) · thả = neo TRÁI.
//    • FLOAT → kéo con trỏ vào dải 80px sát mép PHẢI (nhưng CAO HƠN ô góc
//      phải-dưới) ⇒ xem trước cột dọc sát mép phải · thả = neo PHẢI.
//    • FLOAT → kéo con trỏ vào ô 220×220 góc PHẢI DƯỚI ⇒ xem trước khung
//      400×600 ở vị trí mặc định · thả = về khung nhỏ góc phải dưới.
//      (Ô góc CHỒNG lên dải mép phải → ô góc được ƯU TIÊN, xem chú thích
//       ở chỗ tính SnapZone bên dưới.)
//    • DOCK  → kéo tiêu đề rời khỏi mép đang neo quá 120px ⇒ GỠ NEO ngay
//      lập tức, panel bám con trỏ và kéo tiếp mượt trong CÙNG một thao tác.
//
//  Nút ⧉ mở cửa sổ riêng (window.open /chat + postMessage) — trả dock về 0.
//  Nút ✕ đóng → về nút bong bóng góc phải dưới, dock về 0. Ctrl+K bật/tắt.
//  Đổi chế độ / chọn bên neo / về mặc định còn có nút trên tiêu đề (ChatPanel
//  gọi ngược lên qua `onSetMode` / `onSetDock` / `onResetDefault`).
//
//  Mọi trạng thái lưu ở localStorage key "docflow-chat-ui" (tương thích ngược:
//  bản cũ thiếu `mode`/`dockW`/`dockSide` → mặc định "dock" / 420 / "left").
//
//  SCI công việc (24/09/2026): LẤY NGUYÊN khung của agent tiến độ — chỉ đổi tên agent
//  ("Trợ lý SCI công việc"), khóa localStorage, và cách biết người đăng nhập
//  (useNguoiDungChat → /api/tro-ly/phien thay useSessionUser; mọi người đã
//  đăng nhập đều dùng được, không còn chặn theo vai pm/engineer).

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronUp, Sparkles, X } from "lucide-react";
import { useNguoiDungChat } from "@/components/chat/dung-phien";
import { ChatPanel, runUiActions } from "@/components/chat/ChatPanel";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import type { UiAction } from "@/lib/ai/chat-types";

const LS_KEY = "docflow-chat-ui";

/* --- chế độ nổi --- */
const DEFAULT_W = 400;
const DEFAULT_H = 600;
const MIN_W = 320;
const MIN_H = 360;
const EDGE = 20;
/** trần kích thước khung nổi = 96% màn hình (cả 2 chiều) */
const MAX_RATIO = 0.96;
/** bề dày vùng bắt chuột của 4 MÉP (px) */
const EDGE_HIT = 6;
/** cạnh ô vuông bắt chuột của 4 GÓC (px) — đè lên mép, z cao hơn */
const CORNER_HIT = 14;

/* --- chế độ neo (trái hoặc phải) --- */
const DOCK_DEFAULT_W = 420;
const DOCK_MIN_W = 320;
const DOCK_MAX_W = 720;
/** bề rộng dải dọc khi thu gọn ở chế độ neo */
const RAIL_W = 40;

/* --- vùng SNAP khi kéo thả --- */
/** dải sát mép trái: con trỏ vào đây → xem trước "neo trái" */
const SNAP_LEFT_PX = 80;
/** dải sát mép phải: con trỏ vào đây → xem trước "neo phải" */
const SNAP_RIGHT_PX = 80;
/** ô vuông góc phải dưới: con trỏ vào đây → xem trước "khung nhỏ mặc định" */
const SNAP_CORNER_PX = 220;
/** mép panel cách mép màn hình dưới ngưỡng này = coi như đã chạm mép → snap */
const SNAP_EDGE_TOUCH = 12;
/** đang NEO, kéo tiêu đề rời khỏi MÉP ĐANG NEO quá mốc này → GỠ NEO ngay */
const UNDOCK_PX = 120;

/** biến CSS AppShell đọc để đẩy nội dung sang PHẢI (khi neo trái) */
const VAR_L = "--chat-dock-l";
/** biến CSS AppShell đọc để đẩy nội dung sang TRÁI (khi neo phải) */
const VAR_R = "--chat-dock-r";
/** 0ms khi đang kéo thanh resize để app bám tay, 150ms khi đóng/mở */
const VAR_ANIM = "--chat-dock-anim";

type Mode = "dock" | "float";
type DockSide = "left" | "right";

/** hình học khung nổi đã ghi nhớ trước khi neo */
interface FloatGeom {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UiState {
  mode: Mode;
  /** khi mode === "dock": đang neo mép nào của màn hình */
  dockSide: DockSide;
  dockW: number;
  x: number;
  y: number;
  w: number;
  h: number;
  open: boolean;
  minimized: boolean;
  sessionId: string | null;
  /**
   * Kích thước + vị trí khung NỔI ngay TRƯỚC lần neo gần nhất. Dùng để khôi
   * phục đúng "kích thước người dùng đã điều khiển" khi gỡ neo.
   * `undefined` = chưa từng neo từ chế độ nổi → dùng mặc định 400×600.
   */
  floatBefore?: FloatGeom;
}

const INITIAL: UiState = {
  mode: "dock",
  dockSide: "left",
  dockW: DOCK_DEFAULT_W,
  x: -1,
  y: -1,
  w: DEFAULT_W,
  h: DEFAULT_H,
  open: false,
  minimized: false,
  sessionId: null,
};

/** 8 hướng kéo giãn của khung nổi */
type ResizeDir = "n" | "s" | "w" | "e" | "nw" | "ne" | "sw" | "se";
type DragMode = "move" | ResizeDir;

interface ResizeHandle {
  dir: ResizeDir;
  style: React.CSSProperties;
}

/**
 * 4 MÉP trải hết cạnh (z 40) + 4 GÓC đè lên (z 45) → góc luôn thắng khi con
 * trỏ nằm ở phần chồng lấn, không có 2 phần tử tranh chấp cùng z.
 */
const RESIZE_HANDLES: ResizeHandle[] = [
  { dir: "n", style: { top: 0, left: 0, right: 0, height: EDGE_HIT, cursor: "n-resize", zIndex: 40 } },
  { dir: "s", style: { bottom: 0, left: 0, right: 0, height: EDGE_HIT, cursor: "s-resize", zIndex: 40 } },
  { dir: "w", style: { left: 0, top: 0, bottom: 0, width: EDGE_HIT, cursor: "w-resize", zIndex: 40 } },
  { dir: "e", style: { right: 0, top: 0, bottom: 0, width: EDGE_HIT, cursor: "e-resize", zIndex: 40 } },
  {
    dir: "nw",
    style: { left: 0, top: 0, width: CORNER_HIT, height: CORNER_HIT, cursor: "nw-resize", zIndex: 45 },
  },
  {
    dir: "ne",
    style: { right: 0, top: 0, width: CORNER_HIT, height: CORNER_HIT, cursor: "ne-resize", zIndex: 45 },
  },
  {
    dir: "sw",
    style: { left: 0, bottom: 0, width: CORNER_HIT, height: CORNER_HIT, cursor: "sw-resize", zIndex: 45 },
  },
  {
    dir: "se",
    style: { right: 0, bottom: 0, width: CORNER_HIT, height: CORNER_HIT, cursor: "se-resize", zIndex: 45 },
  },
];

function clampNum(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi));
}
/** vùng snap con trỏ đang nằm trong (null = không hiện xem trước) */
type SnapZone = "left" | "right" | "corner" | null;

interface DragOrigin {
  mode: DragMode;
  startX: number;
  startY: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
  /** true = thao tác kéo bắt đầu ở chế độ NEO và CHƯA vượt ngưỡng gỡ neo */
  dock: boolean;
  /** bên đang neo lúc bắt đầu kéo — quyết định mốc gỡ neo tính từ mép nào */
  dockSide: DockSide;
}

/** Trần độ rộng panel neo trái: không quá 720px và không quá nửa màn hình */
function dockMaxW(): number {
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  return Math.max(DOCK_MIN_W, Math.min(DOCK_MAX_W, Math.round(vw * 0.5)));
}

function clampDockW(w: number): number {
  const max = dockMaxW();
  if (!isFinite(w)) return Math.min(DOCK_DEFAULT_W, max);
  return Math.min(Math.max(Math.round(w), DOCK_MIN_W), max);
}

/** Kẹp panel NỔI vào trong màn hình; nếu vị trí cũ lạc ra ngoài → về góc phải dưới */
function clampToViewport(s: UiState): UiState {
  if (typeof window === "undefined") return s;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = clampNum(s.w, MIN_W, Math.round(vw * MAX_RATIO));
  const h = clampNum(s.h, MIN_H, Math.round(vh * MAX_RATIO));
  let x = s.x;
  let y = s.y;
  const outside =
    !isFinite(x) || !isFinite(y) || x < 0 || y < 0 || x + w > vw || y + h > vh;
  if (outside) {
    x = Math.max(0, vw - w - EDGE);
    y = Math.max(0, vh - h - EDGE);
  }
  return {
    mode: s.mode,
    dockSide: s.dockSide,
    dockW: clampDockW(s.dockW),
    x: x,
    y: y,
    w: w,
    h: h,
    open: s.open,
    minimized: s.minimized,
    sessionId: s.sessionId,
    // hình học đã nhớ chỉ kẹp theo GIỚI HẠN kích thước, không ép vị trí —
    // vị trí sẽ được kẹp lại đúng lúc khôi phục
    floatBefore: s.floatBefore
      ? {
          x: s.floatBefore.x,
          y: s.floatBefore.y,
          w: clampNum(s.floatBefore.w, MIN_W, Math.round(vw * MAX_RATIO)),
          h: clampNum(s.floatBefore.h, MIN_H, Math.round(vh * MAX_RATIO)),
        }
      : undefined,
  };
}

/** Đọc `floatBefore` từ localStorage (bỏ qua nếu thiếu / sai kiểu) */
function readFloatBefore(v: unknown): FloatGeom | undefined {
  if (!v || typeof v !== "object") return undefined;
  const g = v as Partial<FloatGeom>;
  if (
    typeof g.x !== "number" ||
    typeof g.y !== "number" ||
    typeof g.w !== "number" ||
    typeof g.h !== "number" ||
    !isFinite(g.x) ||
    !isFinite(g.y) ||
    !isFinite(g.w) ||
    !isFinite(g.h)
  ) {
    return undefined;
  }
  return { x: g.x, y: g.y, w: g.w, h: g.h };
}

function readStored(): UiState {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw === null) return clampToViewport(INITIAL);
    const p = JSON.parse(raw) as Partial<UiState> | null;
    if (!p) return clampToViewport(INITIAL);
    return clampToViewport({
      // người dùng cũ (chưa có `mode`) → mặc định neo trái
      mode: p.mode === "float" ? "float" : "dock",
      // tương thích ngược: bản cũ không có `dockSide` → "left"
      dockSide: p.dockSide === "right" ? "right" : "left",
      dockW: typeof p.dockW === "number" ? p.dockW : DOCK_DEFAULT_W,
      x: typeof p.x === "number" ? p.x : -1,
      y: typeof p.y === "number" ? p.y : -1,
      w: typeof p.w === "number" ? p.w : DEFAULT_W,
      h: typeof p.h === "number" ? p.h : DEFAULT_H,
      open: p.open === true,
      minimized: p.minimized === true,
      sessionId: typeof p.sessionId === "string" ? p.sessionId : null,
      // tương thích ngược: bản cũ không có `floatBefore` → undefined
      floatBefore: readFloatBefore(p.floatBefore),
    });
  } catch {
    return clampToViewport(INITIAL);
  }
}

/** Hình học MẶC ĐỊNH của khung nhỏ góc phải dưới (400×600, cách mép 20px) */
function defaultFloatGeom(): { x: number; y: number; w: number; h: number } {
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  return {
    x: Math.max(0, vw - DEFAULT_W - EDGE),
    y: Math.max(0, vh - DEFAULT_H - EDGE),
    w: DEFAULT_W,
    h: DEFAULT_H,
  };
}

/**
 * Chụp hình học khung NỔI hiện tại để nhớ trước khi neo. Nếu đang ở chế độ
 * neo sẵn rồi (đổi bên neo) thì giữ nguyên giá trị đã nhớ trước đó.
 */
function rememberFloat(prev: UiState): FloatGeom | undefined {
  if (prev.mode !== "float") return prev.floatBefore;
  return { x: prev.x, y: prev.y, w: prev.w, h: prev.h };
}

/**
 * Hình học cần khôi phục khi GỠ NEO: lấy lại đúng kích thước người dùng đã
 * điều khiển trước khi neo; chưa từng có → khung nhỏ 400×600 góc phải dưới.
 */
function restoreFloatGeom(fb: FloatGeom | undefined): FloatGeom {
  if (!fb) return defaultFloatGeom();
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const w = clampNum(fb.w, MIN_W, Math.round(vw * MAX_RATIO));
  const h = clampNum(fb.h, MIN_H, Math.round(vh * MAX_RATIO));
  return {
    x: clampNum(fb.x, 0, Math.max(0, vw - w)),
    y: clampNum(fb.y, 0, Math.max(0, vh - h)),
    w: w,
    h: h,
  };
}

export function ChatWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const me = useNguoiDungChat(pathname);

  const [mounted, setMounted] = useState(false);
  const [ui, setUi] = useState<UiState>(INITIAL);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [dockResizing, setDockResizing] = useState(false);
  /** vùng snap đang sáng (để vẽ lớp xem trước) */
  const [snap, setSnap] = useState<SnapZone>(null);
  const dragRef = useRef<DragOrigin | null>(null);
  const dockRef = useRef<{ startX: number; startW: number; side: DockSide } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  /** bản sao `ui` mới nhất để handler pointer đọc mà không cần re-bind listener */
  const uiRef = useRef<UiState>(INITIAL);
  /** bản sao `snap` mới nhất — pointerup cần đọc ngay, không đợi re-render */
  const snapRef = useRef<SnapZone>(null);

  // --- khôi phục trạng thái đã lưu ---
  useEffect(() => {
    setUi(readStored());
    setMounted(true);
  }, []);

  useEffect(() => {
    uiRef.current = ui;
  }, [ui]);

  // --- lưu lại mỗi khi đổi ---
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(LS_KEY, JSON.stringify(ui));
    } catch {
      /* localStorage đầy / bị chặn → bỏ qua */
    }
  }, [ui, mounted]);

  // --- màn hình đổi kích thước → kẹp lại panel nổi + độ rộng dock ---
  useEffect(() => {
    if (!mounted) return;
    const onResize = () =>
      setUi((prev) => {
        const next = clampToViewport(prev);
        const dw = clampDockW(prev.dockW);
        return next.dockW === dw ? next : { ...next, dockW: dw };
      });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  // --- kéo thả / đổi kích thước + SNAP neo-gỡ neo ---
  useEffect(() => {
    if (dragMode === null) return;

    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // (1) ĐANG NEO — chờ con trỏ rời MÉP ĐANG NEO quá UNDOCK_PX rồi GỠ NEO
      //     ngay giữa thao tác. Mốc đo đối xứng cho 2 bên:
      //       neo TRÁI  → khoảng cách tới mép trái  = clientX
      //       neo PHẢI  → khoảng cách tới mép phải  = vw - clientX
      if (d.dock) {
        const awayFromEdge = d.dockSide === "right" ? vw - ev.clientX : ev.clientX;
        if (awayFromEdge <= UNDOCK_PX) return;
        const cur = uiRef.current;
        // KÍCH THƯỚC KHÔI PHỤC = đúng khung nổi TRƯỚC KHI NEO (không phải
        // dockW, không phải 400×600) — chưa từng nổi thì mới về mặc định.
        const back = restoreFloatGeom(cur.floatBefore);
        const w = back.w;
        const h = back.h;
        // panel bám con trỏ: giữ nguyên điểm cầm trên thanh tiêu đề.
        // d.ox = mép trái panel lúc bắt đầu kéo (0 khi neo trái, vw-dockW khi
        // neo phải) → (startX - ox) chính là khoảng cách từ điểm cầm tới mép
        // trái panel. Panel mới có thể HẸP HƠN panel neo nên phải kẹp điểm cầm
        // lại trong bề rộng mới, nếu không con trỏ sẽ nằm ngoài khung.
        const grab = clampNum(d.startX - d.ox, 0, Math.max(0, w - CORNER_HIT * 2));
        const grabY = clampNum(d.startY - d.oy, 0, Math.max(0, h - CORNER_HIT * 2));
        const x = clampNum(ev.clientX - grab, 0, Math.max(0, vw - w));
        const y = clampNum(ev.clientY - grabY, 0, Math.max(0, vh - h));
        // gốc kéo mới → những lần pointermove sau chạy nhánh "move" bình thường
        d.dock = false;
        d.startX = ev.clientX;
        d.startY = ev.clientY;
        d.ox = x;
        d.oy = y;
        d.ow = w;
        d.oh = h;
        setUi((prev) => ({
          ...prev,
          mode: "float",
          minimized: false,
          x: x,
          y: y,
          w: w,
          h: h,
        }));
        return;
      }

      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;

      // (2) vùng SNAP — chỉ khi đang DI CHUYỂN panel (không tính lúc resize)
      if (d.mode === "move") {
        // NHẬN DIỆN VÙNG SNAP — xét CẢ vị trí con trỏ LẪN mép của khung.
        // LÝ DO (lỗi đã gặp thật): panel bị kẹp trong màn hình, nên khi đẩy sang
        // phải nó DỪNG ở mép trong khi con trỏ vẫn còn cách mép phải cả trăm px
        // (đúng bằng khoảng từ điểm cầm tới cạnh phải panel) → điều kiện chỉ
        // theo con trỏ không bao giờ đúng ⇒ KHÔNG gim phải được. Bên trái thì
        // ngược lại: panel chạm mép là con trỏ cũng gần mép nên vẫn chạy.
        // ⇒ Thêm điều kiện "mép panel chạm mép màn hình" cho cả hai bên.
        // XUNG ĐỘT VÙNG: ô 220×220 góc PHẢI-DƯỚI ("về khung nhỏ mặc định") chồng
        // lên dải mép phải → con trỏ nằm TRONG ô góc thì ô góc LUÔN thắng.
        const nx = clampNum(d.ox + dx, 0, Math.max(0, vw - d.ow));
        const touchLeft = nx <= SNAP_EDGE_TOUCH;
        const touchRight = nx + d.ow >= vw - SNAP_EDGE_TOUCH;
        let zone: SnapZone = null;
        const inCorner =
          ev.clientX >= vw - SNAP_CORNER_PX && ev.clientY >= vh - SNAP_CORNER_PX;
        if (inCorner) zone = "corner";
        else if (ev.clientX <= SNAP_LEFT_PX || touchLeft) zone = "left";
        else if (ev.clientX >= vw - SNAP_RIGHT_PX || touchRight) zone = "right";
        if (snapRef.current !== zone) {
          snapRef.current = zone;
          setSnap(zone);
        }
      }

      setUi((prev) => {
        if (d.mode === "move") {
          const x = Math.min(Math.max(0, d.ox + dx), Math.max(0, vw - prev.w));
          const y = Math.min(Math.max(0, d.oy + dy), Math.max(0, vh - prev.h));
          return { ...prev, x: x, y: y };
        }
        // ĐỔI KÍCH THƯỚC 8 HƯỚNG (d.mode = "n"|"s"|"w"|"e"|"nw"|…)
        //   • mép chứa "w"/"n" → mép ĐỐI DIỆN (phải/dưới) đứng yên ⇒ đổi cả
        //     x/y lẫn w/h.
        //   • mép chứa "e"/"s" → mép trái/trên đứng yên ⇒ chỉ đổi w/h.
        //   • trần: 96vw × 96vh VÀ không cho panel lọt ra ngoài màn hình.
        const dir: string = d.mode;
        const maxW = Math.max(MIN_W, Math.round(vw * MAX_RATIO));
        const maxH = Math.max(MIN_H, Math.round(vh * MAX_RATIO));
        let x = d.ox;
        let y = d.oy;
        let w = d.ow;
        let h = d.oh;
        if (dir.indexOf("e") >= 0) {
          w = clampNum(d.ow + dx, MIN_W, Math.min(maxW, vw - d.ox));
        } else if (dir.indexOf("w") >= 0) {
          w = clampNum(d.ow - dx, MIN_W, Math.min(maxW, d.ox + d.ow));
          x = d.ox + d.ow - w;
        }
        if (dir.indexOf("s") >= 0) {
          h = clampNum(d.oh + dy, MIN_H, Math.min(maxH, vh - d.oy));
        } else if (dir.indexOf("n") >= 0) {
          h = clampNum(d.oh - dy, MIN_H, Math.min(maxH, d.oy + d.oh));
          y = d.oy + d.oh - h;
        }
        return { ...prev, x: x, y: y, w: w, h: h };
      });
    };

    // (3) THẢ CHUỘT — nếu đang đứng trong vùng snap thì áp dụng
    const onUp = () => {
      const zone = snapRef.current;
      snapRef.current = null;
      setSnap(null);
      if (zone === "left" || zone === "right") {
        setUi((prev) => ({
          ...prev,
          // NHỚ khung nổi hiện tại TRƯỚC khi neo để gỡ neo còn trả lại đúng
          floatBefore: rememberFloat(prev),
          mode: "dock",
          dockSide: zone,
          open: true,
          minimized: false,
          dockW: clampDockW(prev.dockW),
        }));
      } else if (zone === "corner") {
        const g = defaultFloatGeom();
        setUi((prev) => ({
          ...prev,
          mode: "float",
          open: true,
          minimized: false,
          x: g.x,
          y: g.y,
          w: g.w,
          h: g.h,
        }));
      }
      dragRef.current = null;
      setDragMode(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    const prevUserSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    // giữ con trỏ đúng hướng kể cả khi chuột chạy ra ngoài tay nắm 6px
    if (dragMode !== "move") document.body.style.cursor = dragMode + "-resize";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // trả lại nguyên trạng — kể cả khi kết thúc bằng `pointercancel`
      document.body.style.userSelect = prevUserSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [dragMode]);

  const beginDrag = useCallback(
    (mode: DragMode, clientX: number, clientY: number) => {
      const isDockNow = ui.mode === "dock";
      // ở chế độ NEO panel cao nguyên màn hình (top = 0) và rộng dockW; mép
      // trái của nó là 0 khi neo trái, (vw - dockW) khi neo phải
      const vw = window.innerWidth;
      const dockLeftX = ui.dockSide === "right" ? Math.max(0, vw - ui.dockW) : 0;
      dragRef.current = {
        mode: mode,
        startX: clientX,
        startY: clientY,
        ox: isDockNow ? dockLeftX : ui.x,
        oy: isDockNow ? 0 : ui.y,
        ow: isDockNow ? ui.dockW : ui.w,
        oh: ui.h,
        dock: mode === "move" && isDockNow,
        dockSide: ui.dockSide,
      };
      snapRef.current = null;
      setSnap(null);
      setDragMode(mode);
    },
    [ui.mode, ui.x, ui.y, ui.w, ui.h, ui.dockW, ui.dockSide],
  );

  /**
   * Chỉ kéo khi bấm vào vùng tiêu đề và KHÔNG bấm trúng nút / ô nhập.
   * Chạy cho CẢ HAI chế độ: neo trái (để gỡ neo) và nổi (để di chuyển / snap).
   */
  const onPanelPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest("button, input, textarea, a, [data-chat-noresize]")) return;
      if (!t.closest("[data-chat-drag]")) return;
      e.preventDefault();
      try {
        // giữ chuỗi pointer event kể cả khi con trỏ ra ngoài panel
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* trình duyệt không hỗ trợ → vẫn chạy nhờ listener trên window */
      }
      beginDrag("move", e.clientX, e.clientY);
    },
    [beginDrag],
  );

  /**
   * Bấm vào 1 trong 8 tay nắm quanh khung NỔI → bắt đầu kéo giãn theo hướng.
   * `stopPropagation` + `data-chat-noresize` ⇒ không cướp thao tác kéo-di-chuyển
   * của thanh tiêu đề (và ngược lại, tiêu đề không nuốt mất tay nắm).
   */
  const onResizeHandleDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, dir: ResizeDir) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      try {
        // giữ chuỗi pointer event kể cả khi con trỏ rời khỏi dải 6px
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* trình duyệt không hỗ trợ → vẫn chạy nhờ listener trên window */
      }
      beginDrag(dir, e.clientX, e.clientY);
    },
    [beginDrag],
  );

  // --- THANH KÉO của chế độ neo trái (pointer capture) ---
  const onDockResizeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dockRef.current = { startX: e.clientX, startW: ui.dockW, side: ui.dockSide };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* trình duyệt không hỗ trợ → vẫn chạy nhờ event bubbling */
      }
      setDockResizing(true);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    },
    [ui.dockW, ui.dockSide],
  );

  const onDockResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dockRef.current;
    if (!d) return;
    // neo trái: kéo sang PHẢI = rộng ra · neo phải: kéo sang TRÁI = rộng ra
    const delta = e.clientX - d.startX;
    const next = clampDockW(d.startW + (d.side === "right" ? -delta : delta));
    setUi((prev) => (prev.dockW === next ? prev : { ...prev, dockW: next }));
  }, []);

  const endDockResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dockRef.current === null) return;
    dockRef.current = null;
    setDockResizing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* bỏ qua */
    }
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  // --- tin nhắn từ cửa sổ riêng gửi về cửa sổ chính ---
  //   uiActions        → thực thi điều hướng/refresh giúp cửa sổ con
  //   action "redock"  → người dùng bấm "Đưa về ứng dụng": mở lại khung chat
  //                      tại chỗ (đúng phiên đang xem bên cửa sổ riêng)
  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      const data = ev.data as
        | { source?: string; uiActions?: UiAction[]; action?: string; sessionId?: string | null }
        | null;
      if (!data || data.source !== "docflow-chat") return;
      if (data.action === "redock") {
        setUi((prev) => ({
          ...prev,
          open: true,
          minimized: false,
          sessionId: data.sessionId ?? prev.sessionId,
        }));
        try {
          window.focus();
        } catch {
          /* trình duyệt chặn focus — không sao */
        }
        return;
      }
      if (data.uiActions) runUiActions(data.uiActions, router);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [router]);

  // Trường hợp cửa sổ riêng KHÔNG còn cửa sổ cha: nó ghi cờ vào localStorage rồi
  // điều hướng về "/" — khi app tải lại, mở khung chat đúng phiên đó.
  useEffect(() => {
    let flag: string | null = null;
    try {
      flag = window.localStorage.getItem("docflow-chat-redock");
      if (flag !== null) window.localStorage.removeItem("docflow-chat-redock");
    } catch {
      return;
    }
    if (flag === null) return;
    setUi((prev) => ({
      ...prev,
      open: true,
      minimized: false,
      sessionId: flag === "" ? prev.sessionId : flag,
    }));
  }, []);

  // --- Ctrl+K ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Autofill của trình duyệt bắn keydown không có e.key
      const k = e.key?.toLowerCase();
      if (k !== "k" || (!e.ctrlKey && !e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const insidePanel =
        t !== null && panelRef.current !== null && panelRef.current.contains(t);
      if (!insidePanel && t) {
        const tag = t.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable) return;
      }
      e.preventDefault();
      setUi((prev) =>
        prev.open
          ? { ...prev, open: false, minimized: false }
          : clampToViewport({ ...prev, open: true, minimized: false }),
      );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openChat = useCallback(() => {
    setUi((prev) => clampToViewport({ ...prev, open: true, minimized: false }));
  }, []);
  const closeChat = useCallback(() => {
    setUi((prev) => ({ ...prev, open: false, minimized: false }));
  }, []);
  const minimizeChat = useCallback(() => {
    setUi((prev) => ({ ...prev, minimized: true }));
  }, []);
  const restoreChat = useCallback(() => {
    setUi((prev) => clampToViewport({ ...prev, minimized: false }));
  }, []);
  const handleSessionChange = useCallback((sessionId: string | null) => {
    setUi((prev) => (prev.sessionId === sessionId ? prev : { ...prev, sessionId: sessionId }));
  }, []);

  /** ChatPanel gọi lên khi bấm nút đổi chế độ trên thanh tiêu đề */
  const setMode = useCallback((m: Mode) => {
    setUi((prev) => {
      if (m === "dock") {
        return {
          ...prev,
          // NHỚ khung nổi hiện tại trước khi neo
          floatBefore: rememberFloat(prev),
          mode: "dock",
          open: true,
          minimized: false,
          dockW: clampDockW(prev.dockW),
        };
      }
      // GỠ NEO bằng NÚT → khôi phục NGUYÊN cả x/y/w/h đã nhớ.
      // Chưa từng nhớ → restoreFloatGeom trả về khung 400×600 góc phải dưới.
      if (prev.mode === "dock") {
        const g = restoreFloatGeom(prev.floatBefore);
        return {
          ...prev,
          mode: "float",
          open: true,
          minimized: false,
          x: g.x,
          y: g.y,
          w: g.w,
          h: g.h,
        };
      }
      // clampToViewport tự đưa về góc phải dưới nếu hình học cũ không hợp lệ
      return clampToViewport({ ...prev, mode: "float", open: true, minimized: false });
    });
  }, []);

  /** ChatPanel gọi lên khi bấm nút "neo trái" / "neo phải" trên thanh tiêu đề */
  const setDock = useCallback((side: DockSide) => {
    setUi((prev) => ({
      ...prev,
      // NHỚ khung nổi hiện tại trước khi neo (đổi bên neo thì giữ nguyên)
      floatBefore: rememberFloat(prev),
      mode: "dock",
      dockSide: side,
      open: true,
      minimized: false,
      dockW: clampDockW(prev.dockW),
    }));
  }, []);

  /** VỀ MẶC ĐỊNH: khung nhỏ 400×600 ở góc phải dưới, chế độ nổi, không thu gọn */
  const resetDefault = useCallback(() => {
    const g = defaultFloatGeom();
    setUi((prev) => ({
      ...prev,
      mode: "float",
      open: true,
      minimized: false,
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
    }));
  }, []);

  const openWindow = useCallback((sessionId: string | null) => {
    const url =
      "/chat" + (sessionId !== null && sessionId !== "" ? "?session=" + encodeURIComponent(sessionId) : "");
    window.open(url, "docflow-chat", "popup=yes,width=460,height=700");
    setUi((prev) => ({ ...prev, open: false, minimized: false }));
  }, []);

  // --- điều kiện hiển thị (tính TRƯỚC mọi return để hook luôn chạy đủ) ---
  const hidden =
    !mounted ||
    pathname === "/login" ||
    pathname === "/chat" ||
    pathname.indexOf("/chat/") === 0 ||
    pathname.indexOf("/nhung/") === 0 || // trang nhúng trong popup agent khác (04/10/2026)
    !me;

  const docked = !hidden && ui.open && ui.mode === "dock";
  const dockPx = docked ? (ui.minimized ? RAIL_W : ui.dockW) : 0;
  // bên KHÔNG neo luôn = 0; float / đóng / popout → cả hai = 0
  const dockLpx = docked && ui.dockSide === "left" ? dockPx : 0;
  const dockRpx = docked && ui.dockSide === "right" ? dockPx : 0;

  // --- ĐẨY nội dung ứng dụng qua 2 biến CSS trên <html> ---
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(VAR_L, dockLpx + "px");
    root.style.setProperty(VAR_R, dockRpx + "px");
    root.style.setProperty(VAR_ANIM, dockResizing ? "0ms" : "150ms");
  }, [dockLpx, dockRpx, dockResizing]);

  // --- unmount → dọn sạch, không để lại khoảng trống trắng ---
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.style.setProperty(VAR_L, "0px");
      root.style.setProperty(VAR_R, "0px");
      root.style.setProperty(VAR_ANIM, "150ms");
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  if (hidden) return null;

  const isDock = ui.mode === "dock";
  const dockRight = isDock && ui.dockSide === "right";

  return (
    <>
      {/* ===== Nút bong bóng (góc phải dưới, mở theo `mode` đã lưu) ===== */}
      {!ui.open && (
        <button
          type="button"
          onClick={openChat}
          title="Trợ lý SCI công việc — hỏi về tài liệu, sổ cái, lịch sử (Ctrl+K)"
          aria-label="Mở Trợ lý SCI công việc"
          className="fixed bottom-5 right-5 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-card transition-all duration-150 hover:scale-105 hover:bg-accent-hover"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      )}

      {/* ===== NEO · thu gọn → dải dọc mảnh 40px dính đúng mép đang neo ===== */}
      {ui.open && isDock && ui.minimized && (
        <div
          onClick={restoreChat}
          title="Bung lại Trợ lý SCI công việc"
          style={{ width: RAIL_W }}
          className={
            "fixed bottom-0 top-0 z-[70] flex cursor-pointer flex-col items-center gap-3 bg-bg2 py-3 transition-colors duration-150 hover:border-accent " +
            (dockRight ? "right-0 border-l border-border" : "left-0 border-r border-border")
          }
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
            AI
          </span>
          {dockRight ? (
            <ChevronLeft className="h-4 w-4 shrink-0 text-text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
          )}
          <span
            style={{ writingMode: "vertical-rl" }}
            className="select-none text-[11.5px] font-bold tracking-wide text-text-muted"
          >
            Trợ lý SCI công việc
          </span>
        </div>
      )}

      {/* ===== NỔI · thu gọn → thanh dính đáy màn hình (như cũ) ===== */}
      {ui.open && !isDock && ui.minimized && (
        <div
          onClick={restoreChat}
          className="fixed bottom-0 right-6 z-[70] flex cursor-pointer items-center gap-2 rounded-t-[12px] border border-b-0 border-border bg-surface px-3 py-2 shadow-card transition-colors duration-150 hover:border-accent"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-white">
            AI
          </span>
          <span className="text-[12.5px] font-bold text-text">Trợ lý SCI công việc</span>
          <button
            type="button"
            title="Mở lại"
            aria-label="Mở lại"
            onClick={(e) => {
              e.stopPropagation();
              restoreChat();
            }}
            className="rounded-md p-1 text-text-muted transition-colors duration-150 hover:text-text"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Đóng"
            aria-label="Đóng"
            onClick={(e) => {
              e.stopPropagation();
              closeChat();
            }}
            className="rounded-md p-1 text-text-muted transition-colors duration-150 hover:text-red"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ===== THANH KÉO đổi độ rộng (chế độ neo, khi đang bung) =====
           Luôn nằm ở mép TRONG của panel: neo trái → x = dockW, neo phải →
           cách mép phải đúng dockW. */}
      {ui.open && isDock && !ui.minimized && (
        <div
          role="separator"
          aria-orientation="vertical"
          title="Kéo để đổi độ rộng khung chat"
          onPointerDown={onDockResizeDown}
          onPointerMove={onDockResizeMove}
          onPointerUp={endDockResize}
          onPointerCancel={endDockResize}
          style={
            dockRight
              ? { right: ui.dockW - 2, width: 5 }
              : { left: ui.dockW - 2, width: 5 }
          }
          className={
            "fixed bottom-0 top-0 z-[72] cursor-col-resize transition-colors duration-150 " +
            (dockResizing ? "bg-accent" : "bg-transparent hover:bg-accent/70")
          }
        />
      )}

      {/* ===== LỚP XEM TRƯỚC khi kéo vào vùng snap (kiểu Windows Snap) ===== */}
      {snap !== null && (
        <div className="pointer-events-none fixed inset-0 z-[69]">
          <div
            style={
              snap === "left"
                ? { left: 0, top: 0, width: ui.dockW, bottom: 0 }
                : snap === "right"
                  ? { right: 0, top: 0, width: ui.dockW, bottom: 0 }
                  : { right: EDGE, bottom: EDGE, width: DEFAULT_W, height: DEFAULT_H }
            }
            className={
              "absolute flex items-center justify-center overflow-hidden border-2 border-accent " +
              (snap === "left"
                ? "rounded-r-[12px]"
                : snap === "right"
                  ? "rounded-l-[12px]"
                  : "rounded-[14px]")
            }
          >
            {/* nền accent 12% tách riêng để viền + chữ không bị mờ theo */}
            <span className="absolute inset-0 bg-accent opacity-[0.12]" />
            <span className="relative select-none px-4 text-center text-[13px] font-bold text-text-muted">
              {snap === "left"
                ? "Thả để neo bên trái"
                : snap === "right"
                  ? "Thả để neo bên phải"
                  : "Thả để về khung nhỏ góc phải"}
            </span>
          </div>
        </div>
      )}

      {/* ===== PANEL — giữ trong DOM khi thu gọn để không mất nội dung chat ===== */}
      {ui.open && !ui.minimized && (
        <>
          <KhaiHuongDan ma="tro-ly-chat" uuTien={2} />
          <KhaiHuongDan ma="tro-ly-chat-xuat" uuTien={0} />
        </>
      )}
      {ui.open && (
        <div
          ref={panelRef}
          onPointerDown={onPanelPointerDown}
          style={
            isDock
              ? {
                  // neo phải → dính mép phải, neo trái → dính mép trái
                  left: dockRight ? undefined : 0,
                  right: dockRight ? 0 : undefined,
                  top: 0,
                  width: ui.dockW,
                  height: "100vh",
                  display: ui.minimized ? "none" : "block",
                }
              : {
                  left: ui.x,
                  top: ui.y,
                  width: ui.w,
                  height: ui.h,
                  display: ui.minimized ? "none" : "block",
                }
          }
          className={
            isDock
              ? "fixed z-[70] overflow-hidden bg-surface " +
                (dockRight ? "border-l border-border" : "border-r border-border")
              : "fixed z-[70] overflow-hidden rounded-[14px] border border-border bg-surface shadow-card " +
                (dragMode === null ? "transition-shadow duration-150" : "")
          }
        >
          <ChatPanel
            initialSessionId={ui.sessionId ?? undefined}
            onOpenWindow={openWindow}
            onMinimize={minimizeChat}
            onClose={closeChat}
            onSessionChange={handleSessionChange}
            mode={ui.mode}
            onSetMode={setMode}
            dockSide={ui.dockSide}
            onSetDock={setDock}
            onResetDefault={resetDefault}
          />

          {/* ===== 8 TAY NẮM KÉO GIÃN — CHỈ chế độ NỔI, KHÔNG khi thu gọn =====
               (chế độ neo đã có thanh kéo độ rộng riêng ở mép trong)
               Đặt SAU <ChatPanel> để luôn nằm trên nội dung; tay nắm góc
               trái-trên `nw` chính là tay nắm cũ (đã hợp nhất, có vạch góc). */}
          {!isDock &&
            !ui.minimized &&
            RESIZE_HANDLES.map((hd) => (
              <div
                key={hd.dir}
                data-chat-noresize
                title={hd.dir.length === 2 ? "Kéo để đổi kích thước" : undefined}
                onPointerDown={(e) => onResizeHandleDown(e, hd.dir)}
                style={hd.style}
                className="absolute"
              >
                {hd.dir === "nw" && (
                  <span className="pointer-events-none absolute left-[5px] top-[5px] h-2 w-2 rounded-tl-[3px] border-l-2 border-t-2 border-border" />
                )}
              </div>
            ))}
        </div>
      )}
    </>
  );
}

export default ChatWidget;
