"use client";

// RUỘT của khung chat trợ lý AI — dùng chung cho:
//   - widget nổi (ChatWidget)         → standalone = false
//   - cửa sổ riêng /chat (popup)      → standalone = true
//
// BỐ CỤC 2 CỘT kiểu Claude.ai (đo BỀ RỘNG PANEL bằng ResizeObserver, không dùng
// media query của cửa sổ vì panel nổi có thể nhỏ hơn cửa sổ rất nhiều):
//   - panel ≥ 560px : cột trái 180px LUÔN HIỆN = lịch sử phiên (nhóm theo ngày)
//   - panel < 560px : cột trái tự ẩn, quay về kiểu ngăn kéo trượt ra (nút ☰)
//
// Chỉ gọi API theo HỢP ĐỒNG src/lib/ai/chat-types.ts (không sửa hợp đồng):
//   GET    /api/ai/chat/sessions?project=<id>
//   POST   /api/ai/chat/sessions   { title? }
//   PATCH  /api/ai/chat/sessions   { id, title }
//   DELETE /api/ai/chat/sessions?id=<sid>
//   GET    /api/ai/chat/messages?id=<sid>
//   POST   /api/ai/chat            { sessionId, message }
//
// Phiên được tạo LƯỜI (lazy): bấm ✚ chỉ dọn màn hình, phiên thật chỉ sinh ra
// khi người dùng gửi tin đầu tiên → không để lại phiên rỗng trong data/.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionUser } from "@/lib/use-session";
import { ChonModel, VongNguCanh } from "./ChonModel";
import { XuatTraLoi } from "./XuatTraLoi";
import { DaiNutXuat } from "./DaiNutXuat";
import {
  TRAN_SO_TEP,
  doDuocDuoi,
  type TepDinhKem,
} from "@/lib/tro-ly/dinh-kem-chung";
import { chayDayBuoc, moThanhCho } from "@/lib/lenh/chay-lenh";
import { toSang } from "@/lib/lenh/to-sang";
import type { KetQuaBuoc, TocDoDien } from "@/lib/lenh/mo-hinh";
import {
  ArrowUp,
  Check,
  ExternalLink,
  Menu,
  Minus,
  Globe,
  PanelLeftClose,
  PanelLeftOpen,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Pencil,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { TOOL_SPECS, titleFromMessage } from "@/lib/ai/chat-types";
import { cauNhacXoaPhien } from "@/lib/ai/nhac-xoa-phien";
import type {
  ChatMessage,
  ChatSession,
  ChatSessionMeta,
  ExecutedAction,
  UiAction,
} from "@/lib/ai/chat-types";
import { duocGhi, LY_DO_CHAN, LY_DO_TRO_LY } from "@/lib/quyen";
import type { ViecChoGon } from "@/lib/ai/cho-duyet";
import { SU_KIEN_MO_TRO_LY, layCauHoiCho } from "@/lib/tro-ly/mo-tro-ly";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

// ===== tiện ích dùng chung =====

/** Bề rộng panel tối thiểu để bày được 2 cột (nhỏ hơn thì cột trái thành ngăn kéo) */
const TWO_COL_MIN_WIDTH = 560;

// --- Độ rộng CỘT TRÁI (kéo được bằng thanh chia giữa 2 cột) ---
/**
 * MẶC ĐỊNH = 1/4 BỀ RỘNG KHUNG (theo yêu cầu: cột phiên chiếm 1/4 cửa sổ), tự
 * co giãn khi phóng to/thu nhỏ khung — KHÔNG cố định px. Người dùng kéo thanh
 * chia thì giá trị tay đó được nhớ và thắng tỷ lệ; nháy đúp = bỏ nhớ, trở lại 1/4.
 */
const SIDEBAR_RATIO = 0.25;
/** Dự phòng khi chưa đo được bề rộng panel (khung hình đầu tiên) */
const SIDEBAR_W_FALLBACK = 200;
/** Hẹp nhất còn đọc được tên phiên */
const SIDEBAR_W_MIN = 140;
/** Rộng nhất tuyệt đối (còn bị chặn thêm bởi 45% bề rộng panel THẬT) */
const SIDEBAR_W_MAX = 320;
/** Nhớ độ rộng người dùng đã chọn */
const SIDEBAR_W_KEY = "qldasci-chat-sidebar-w";
/** Nhớ việc người dùng BẬT/TẮT cột lịch sử phiên ("1" = bật, "0" = tắt) */
const SIDEBAR_ON_KEY = "qldasci-chat-sidebar-on";

/** Tra cứu nhanh: công cụ nào GHI dữ liệu → chip màu cam để người dùng để ý */
const WRITE_TOOL: Record<string, boolean> = {};
TOOL_SPECS.forEach(function (spec) {
  WRITE_TOOL[spec.name] = spec.writes === true;
});

const TAB_LABELS: Record<string, string> = {
  "/": "Tổng quan",
  "/planning": "Lập tiến độ",
  "/gantt": "Gantt",
  "/detail": "Chi tiết",
  "/alerts": "Cảnh báo",
  "/crosscheck": "Đối chiếu",
  "/report-field": "Báo cáo hiện trường",
  "/report-mgmt": "Báo cáo quản lý",
  "/contractors": "Nhà thầu",
  "/weather": "Thời tiết",
  "/photos": "Hình ảnh",
  "/productivity": "Năng suất",
  "/settings": "Cài đặt",
};

const QUICK_PROMPTS: string[] = [
  "Tóm tắt tiến độ dự án",
  "Việc găng nào đang chậm so với Baseline?", // luật 36 (15/10/2026): câu gợi ý cũng ghi rõ so với hệ nào
  "Chạy phân tích cảnh báo",
  "Mở tab Gantt",
];

let idSeq = 0;
function localId(prefix: string): string {
  idSeq += 1;
  return prefix + "-" + Date.now().toString(36) + "-" + idSeq;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return hh + ":" + mm;
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return hh + ":" + mm;
  return (
    String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0")
  );
}

// ===== nhóm phiên theo mốc thời gian (kiểu Claude.ai) =====

interface SessionGroup {
  key: string;
  label: string;
  items: ChatSessionMeta[];
}

function groupSessions(list: ChatSessionMeta[]): SessionGroup[] {
  const today: ChatSessionMeta[] = [];
  const yesterday: ChatSessionMeta[] = [];
  const week: ChatSessionMeta[] = [];
  const older: ChatSessionMeta[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86400000;

  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    const t = new Date(s.updatedAt).getTime();
    if (isNaN(t)) older.push(s);
    else if (t >= startOfToday) today.push(s);
    else if (t >= startOfToday - DAY) yesterday.push(s);
    else if (t >= startOfToday - 7 * DAY) week.push(s);
    else older.push(s);
  }

  const out: SessionGroup[] = [];
  if (today.length > 0) out.push({ key: "today", label: "Hôm nay", items: today });
  if (yesterday.length > 0) out.push({ key: "yest", label: "Hôm qua", items: yesterday });
  if (week.length > 0) out.push({ key: "week", label: "7 ngày trước", items: week });
  if (older.length > 0) out.push({ key: "old", label: "Cũ hơn", items: older });
  return out;
}

// ===== markdown tối thiểu (tự viết, KHÔNG thêm thư viện) =====
// Hỗ trợ: **đậm**, `code` inline, xuống dòng, gạch đầu dòng "-" / "•" / "*",
// và BẢNG "|...|" (Mr. Đại 03/09: trợ lý phải vẽ được bảng thật, không mô phỏng chữ).

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i];
    if (p === undefined || p === "") continue;
    // Link [tên](/duong-dan) — Mr. Đại 04/09: dẫn chứng phải bấm được về nguồn.
    // Chỉ nhận đường dẫn trong app ("/...") hoặc http(s) — thứ khác vẽ như chữ.
    const lk = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
    if (lk && (lk[2]!.startsWith("/") || /^https?:\/\//.test(lk[2]!))) {
      const ngoai = !lk[2]!.startsWith("/");
      out.push(
        <a
          key={keyPrefix + "-a" + i}
          href={lk[2]}
          target={ngoai ? "_blank" : undefined}
          rel={ngoai ? "noopener noreferrer" : undefined}
          className="font-semibold text-accent underline decoration-accent/50 underline-offset-2 hover:decoration-accent"
        >
          {lk[1]}
        </a>,
      );
      continue;
    }
    if (p.length >= 5 && p.slice(0, 2) === "**" && p.slice(-2) === "**") {
      out.push(
        <strong key={keyPrefix + "-b" + i} className="font-bold text-text">
          {p.slice(2, -2)}
        </strong>,
      );
    } else if (p.length >= 3 && p.charAt(0) === "`" && p.charAt(p.length - 1) === "`") {
      out.push(
        <code
          key={keyPrefix + "-c" + i}
          className="rounded-[4px] border border-border-light bg-bg2 px-1 py-[1px] font-mono text-[11.5px] text-accent"
        >
          {p.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(<span key={keyPrefix + "-t" + i}>{p}</span>);
    }
  }
  return out;
}

function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let para: string[] = [];
  let bang: string[] = [];

  /** Hàng "|---|:---|" chỉ là kẻ phân cách của markdown — không phải dữ liệu */
  const laKe = (s: string): boolean => /^\|[\s:|-]+\|$/.test(s.replace(/\s/g, ""));

  function flushBang(at: number): void {
    if (bang.length === 0) return;
    const hang = bang
      .filter((r) => !laKe(r))
      .map((r) =>
        r
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim())
      );
    bang = [];
    if (hang.length === 0) return;
    blocks.push(
      <div key={"tb-" + at} className="scroll-thin overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              {hang[0]!.map((c, j) => (
                <th key={j}>{renderInline(c, `th${at}-${j}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hang.slice(1).map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{renderInline(c, `td${at}-${i}-${j}`)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>,
    );
  }

  function flushBullets(at: number): void {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={"ul-" + at} className="space-y-1">
        {items.map((it, j) => (
          <li key={"li-" + at + "-" + j} className="flex gap-2">
            <span
              className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-accent"
              aria-hidden
            />
            <span className="min-w-0 flex-1 break-words">
              {renderInline(it, "li" + at + "-" + j)}
            </span>
          </li>
        ))}
      </ul>,
    );
  }

  function flushPara(at: number): void {
    if (para.length === 0) return;
    const txt = para.join("\n");
    para = [];
    blocks.push(
      <p key={"p-" + at} className="whitespace-pre-wrap break-words">
        {renderInline(txt, "p" + at)}
      </p>,
    );
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    // Bảng: các dòng liên tiếp bắt đầu và kết thúc bằng "|"
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length > 2) {
      flushBullets(i);
      flushPara(i);
      bang.push(trimmed);
      continue;
    }
    flushBang(i);
    // Tiêu đề "# ..."/"## ..." → dòng đậm (văn phong biên bản A/B/C, 04/09)
    const tieuDe = /^#{1,6}\s+/.exec(trimmed);
    if (tieuDe) {
      flushBullets(i);
      flushPara(i);
      blocks.push(
        <p key={"h-" + i} className="font-bold text-text">
          {renderInline(trimmed.slice(tieuDe[0].length), "h" + i)}
        </p>,
      );
      continue;
    }
    const bullet = /^([-•*])\s+/.exec(trimmed);
    if (bullet) {
      flushPara(i);
      bullets.push(trimmed.slice(bullet[0].length));
      continue;
    }
    if (trimmed === "") {
      flushBullets(i);
      flushPara(i);
      continue;
    }
    flushBullets(i);
    para.push(raw);
  }
  flushBang(lines.length);
  flushBullets(lines.length);
  flushPara(lines.length);

  return <div className="space-y-2 text-[13px] leading-relaxed text-text">{blocks}</div>;
}

/** Router tối thiểu — khai báo tại chỗ để ChatWidget dùng lại được hàm này */
export interface UiActionRouter {
  push: (path: string) => void;
  refresh: () => void;
}

/** Thực thi uiActions trên CỬA SỔ CHÍNH (điều hướng / đổi dự án / tải lại) */
export function runUiActions(actions: UiAction[], router: UiActionRouter): void {
  for (let i = 0; i < actions.length; i += 1) {
    const a = actions[i];
    if (a.type === "navigate") {
      router.push(a.path);
    } else if (a.type === "refresh") {
      router.refresh();
    } else if (a.type === "switchProject") {
      const pid = a.projectId;
      void fetch("/api/projects/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pid }),
      })
        .then(function () {
          window.location.reload();
        })
        .catch(function () {
          /* im lặng — người dùng vẫn đổi dự án tay được */
        });
    }
  }
}

// ===== các mảnh giao diện nhỏ =====

/** Chấm tròn accent chữ "AI" đứng đầu hàng thông tin của tin nhắn trợ lý */
function AiAvatar() {
  return (
    <span
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-[7.5px] font-bold tracking-wide text-white"
      aria-hidden
    >
      AI
    </span>
  );
}

function ActionChip({ action }: { action: ExecutedAction }) {
  const writes = WRITE_TOOL[action.name] === true;
  const cls = !action.ok
    ? "border-red/40 bg-red-soft text-red"
    : writes
      ? "border-accent/45 bg-accent-soft text-accent"
      : "border-green/35 bg-green-soft text-green";
  return (
    <span
      title={action.name}
      className={
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-[3px] text-[10.5px] font-semibold " +
        cls
      }
    >
      <span aria-hidden>{action.ok ? "✓" : "✗"}</span>
      <span className="truncate">{action.summary !== "" ? action.summary : action.name}</span>
    </span>
  );
}

function IconBtn(props: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      onClick={props.onClick}
      className={
        "shrink-0 rounded-md p-1.5 text-text-muted transition-colors duration-150 hover:bg-surface " +
        (props.danger === true ? "hover:text-red" : "hover:text-text")
      }
    >
      {props.children}
    </button>
  );
}

// ===== component chính =====

export interface ChatPanelProps {
  initialSessionId?: string;
  standalone?: boolean;
  /** widget nổi truyền vào — mở /chat thành cửa sổ riêng */
  onOpenWindow?: (sessionId: string | null) => void;
  /** widget nổi truyền vào — thu gọn xuống đáy màn hình */
  onMinimize?: () => void;
  /** widget nổi truyền vào — đóng hẳn khung chat */
  onClose?: () => void;
  /** báo cho widget phiên đang mở để lưu localStorage / mở cửa sổ riêng đúng phiên */
  onSessionChange?: (sessionId: string | null) => void;
  /** chế độ hiển thị hiện tại của khung chat (widget nổi truyền vào) */
  mode?: "dock" | "float";
  /** đổi chế độ: neo cột trái (chia đôi màn hình) ↔ khung nổi tự do */
  onSetMode?: (m: "dock" | "float") => void;
  /** khi neo (mode === "dock"): đang neo mép TRÁI hay mép PHẢI màn hình */
  dockSide?: "left" | "right";
  /** neo khung chat vào mép trái / mép phải (tự chuyển sang mode "dock") */
  onSetDock?: (side: "left" | "right") => void;
  /** đưa khung chat về khung nhỏ góc phải dưới (kích thước/vị trí mặc định) */
  onResetDefault?: () => void;
}

export function ChatPanel({
  initialSessionId,
  standalone = false,
  onOpenWindow,
  onMinimize,
  onClose,
  onSessionChange,
  mode,
  onSetMode,
  dockSide,
  onSetDock,
  onResetDefault,
}: ChatPanelProps) {
  const router = useRouter();

  // null = chưa biết dự án đang mở; "" = không lấy được → gọi API không kèm ?project
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [sessions, setSessions] = useState<ChatSessionMeta[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId ?? null);
  const [title, setTitle] = useState<string>("Phiên mới");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Trần ngữ cảnh ƯỚC — 200K token của Claude; % chỉ để canh mở phiên mới
  const TRAN_NGU_CANH = 200_000;
  // Định dạng xuất người chọn ở dải 11 nút dưới ô nhập (null = AI tự phát hiện)
  const [dinhDangXuat, setDinhDangXuat] = useState<string | null>(null);
  // Kế hoạch tạo file đang CHỜ DUYỆT (bước duyệt của bộ xuất — port pháp lý)
  const [keHoachChoDuyet, setKeHoachChoDuyet] = useState<{
    dinhDang: string;
    keHoach: string;
    cauHoi: string;
  } | null>(null);
  const [suaKeHoach, setSuaKeHoach] = useState(false);
  const [keHoachDraft, setKeHoachDraft] = useState("");
  // Công cụ GHI trợ lý đã đề nghị, CHỜ BẤM ✅ Làm / ❌ Bỏ (Mr. Đại chốt 25/09 —
  // cùng một bộ chạy với nút Telegram). id đang bấm dở để khoá nút, chống bấm đúp.
  const [choDuyet, setChoDuyet] = useState<ViecChoGon[]>([]);
  const [dangBam, setDangBam] = useState<string | null>(null);
  // Loại tài khoản — nút đổi model cần cửa "ghi" (quyen.ts)
  const nguoiDung = useSessionUser();
  const vaiTro = nguoiDung?.role ?? "";
  // Kẹp file = cửa GHI (26/09): Người xem thấy nút 📎 MỜ kèm lý do (luật 17).
  // Chưa đọc xong phiên thì chưa chặn — API vẫn chặn lần nữa.
  const chanKepFile = nguoiDung != null && !duocGhi(vaiTro);
  // Người xem không dùng trợ lý AI trong mọi tình huống (Mr. Đại chốt 04/10 — tốn chi phí công ty)
  const chanTroLy = chanKepFile;
  // Ngữ cảnh phiên: ƯỚC token = tổng ký tự ÷ 4 (tooltip nói rõ chữ "ước")
  const uocTokenPhien = useMemo(
    () => Math.round(messages.reduce((s, m) => s + m.content.length, 0) / 4),
    [messages]
  );
  /** uiActions KHÔNG tự chạy được (cửa sổ riêng không có opener) → hiện chip cho người dùng bấm */
  const [manualUi, setManualUi] = useState<Record<string, UiAction[]>>({});

  /** true = panel đủ rộng để bày 2 cột; false = cột trái thành ngăn kéo trượt.
   *  Đoán ban đầu theo standalone (cửa sổ riêng thường rộng, widget nổi 400px)
   *  để tránh nháy bố cục 1 khung hình trước khi ResizeObserver đo thật. */
  const [wide, setWide] = useState(standalone);
  /** bề rộng THẬT của panel (px) do ResizeObserver đo — dùng để chặn max cột trái */
  const [panelW, setPanelW] = useState(0);
  /** Độ rộng cột trái NGƯỜI DÙNG tự kéo (px). null = chưa chỉnh → dùng tỷ lệ 1/4 */
  const [sidebarW, setSidebarW] = useState<number | null>(null);
  const [draggingDivider, setDraggingDivider] = useState(false);
  const [showList, setShowList] = useState(false);
  /** người dùng CHỦ ĐỘNG bật/tắt cột lịch sử phiên (chỉ áp dụng khi panel đủ rộng).
   *  Mặc định BẬT; nhớ trong localStorage để mở lần sau vẫn như cũ. */
  const [sidebarOn, setSidebarOn] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [input, setInput] = useState("");
  // TỰ THAO TÁC (chốt 06/09) — chip bật/tắt, nhớ cho lần sau
  /** 🌐 Tìm trên internet — mặc định TẮT (06/09). Bật thì trợ lý được ra
      ngoài internet; tắt thì nó chỉ dùng dữ liệu trong hệ thống. */
  const [timWeb, setTimWeb] = useState(false);
  const [tuThaoTac, setTuThaoTac] = useState(false);
  const [tocDo, setTocDo] = useState<TocDoDien>("cham");
  const dungRef = useRef(false);
  // B2 — danh sách skill để xổ gợi ý khi gõ "/": người không phải nhớ tên
  const [dsSkill, setDsSkill] = useState<{ slug: string; ten: string; moTa: string }[]>([]);
  const [chonSkill, setChonSkill] = useState(0);
  // B1 — file kẹp vào ô chat: client gửi lên /api/tro-ly/dinh-kem bóc chữ
  // TRƯỚC, sau đó chữ đi kèm câu hỏi. File KHÔNG được lưu lên đĩa.
  const [tepDinhKem, setTepDinhKem] = useState<TepDinhKem[]>([]);
  const [dangDocTep, setDangDocTep] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const tepRef = useRef<HTMLInputElement | null>(null);
  const bootRef = useRef(false);
  const initialSessionIdRef = useRef<string | undefined>(initialSessionId);
  /** bề rộng panel mới nhất — đọc được ngay trong lúc kéo (state có độ trễ 1 nhịp) */
  const panelWRef = useRef(0);
  /** độ rộng cột trái mới nhất — để ghi localStorage đúng giá trị lúc thả tay */
  const sidebarWRef = useRef(SIDEBAR_W_FALLBACK);
  /** trạng thái phiên kéo hiện tại (null = không kéo) */
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  // --- đo BỀ RỘNG PANEL (không phải cửa sổ) để chọn 2 cột hay ngăn kéo ---
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const apply = () => {
      const w = el.offsetWidth;
      panelWRef.current = w;
      setPanelW(w);
      setWide(w >= TWO_COL_MIN_WIDTH);
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  // --- đọc độ rộng cột trái đã nhớ (chỉ ở trình duyệt → tránh lệch SSR).
  //     Không có giá trị nhớ → giữ null = dùng tỷ lệ 1/4 bề rộng khung.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SIDEBAR_W_KEY);
      if (raw === null) return;
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= SIDEBAR_W_MIN && n <= SIDEBAR_W_MAX) {
        sidebarWRef.current = n;
        setSidebarW(n);
      }
    } catch {
      /* localStorage bị chặn → dùng tỷ lệ mặc định */
    }
  }, []);

  // --- lỡ tháo component giữa lúc đang kéo thì trả lại con trỏ / bôi chọn ---
  useEffect(() => {
    return () => {
      if (dragRef.current !== null) {
        dragRef.current = null;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };
  }, []);

  // rộng ra thì ngăn kéo không còn ý nghĩa → đóng lại
  useEffect(() => {
    if (wide) setShowList(false);
  }, [wide]);

  // đọc lựa chọn bật/tắt cột phiên đã nhớ (chạy sau mount để không lệch SSR)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(SIDEBAR_ON_KEY);
      if (v === "0") setSidebarOn(false);
    } catch {
      /* localStorage bị chặn → giữ mặc định BẬT */
    }
  }, []);

  /** Đang thực sự thấy danh sách phiên hay không (2 cột hoặc ngăn kéo) */
  const sidebarVisible = wide ? sidebarOn : showList;

  /** Nút trên tiêu đề: panel rộng → bật/tắt CỘT; panel hẹp → mở/đóng NGĂN KÉO */
  const toggleSidebar = useCallback(() => {
    if (wide) {
      setSidebarOn((v) => {
        const next = !v;
        try {
          window.localStorage.setItem(SIDEBAR_ON_KEY, next ? "1" : "0");
        } catch {
          /* bỏ qua */
        }
        return next;
      });
    } else {
      setShowList((v) => !v);
    }
  }, [wide]);

  // --- báo phiên hiện tại lên widget cha ---
  useEffect(() => {
    if (onSessionChange) onSessionChange(sessionId);
  }, [sessionId, onSessionChange]);

  // --- dự án đang mở (để lọc danh sách phiên theo dự án) ---
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          json: { current?: string; projects?: { id: string; name: string }[] } | null,
        ) => {
          if (cancelled) return;
          const cur = json && typeof json.current === "string" ? json.current : "";
          setProjectId(cur);
          const list = json && json.projects ? json.projects : [];
          for (let i = 0; i < list.length; i += 1) {
            if (list[i].id === cur && typeof list[i].name === "string") {
              setProjectName(list[i].name);
              break;
            }
          }
        },
      )
      .catch(() => {
        if (!cancelled) setProjectId("");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const projectQuery = useCallback(
    (first: boolean): string => {
      if (projectId === null || projectId === "") return "";
      return (first ? "?" : "&") + "project=" + encodeURIComponent(projectId);
    },
    [projectId],
  );

  // --- danh sách phiên ---
  const loadSessions = useCallback(async () => {
    if (projectId === null) return; // chờ biết dự án đã
    if (chanTroLy) return; // Người xem — API trả 403, khỏi gọi
    try {
      const res = await fetch("/api/ai/chat/sessions" + projectQuery(true), {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        sessions?: ChatSessionMeta[];
      } | null;
      if (res.ok && json && json.ok === true && json.sessions) {
        setSessions(json.sessions);
      }
    } catch {
      /* danh sách phiên lỗi thì vẫn chat được — không chặn */
    }
  }, [projectId, projectQuery, chanTroLy]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  // --- mở 1 phiên ---
  const openSession = useCallback(async (id: string) => {
    setLoadingSession(true);
    setError(null);
    setShowList(false);
    setConfirmDel(null);
    setMenuFor(null);
    setRenamingId(null);
    try {
      const res = await fetch("/api/ai/chat/messages?id=" + encodeURIComponent(id), {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        session?: ChatSession;
        choDuyet?: ViecChoGon[];
        message?: string;
      } | null;
      if (!res.ok || !json || json.ok !== true || !json.session) {
        throw new Error(json?.message ?? "Không tải được phiên chat (HTTP " + res.status + ")");
      }
      setSessionId(json.session.id);
      setTitle(json.session.title);
      setMessages(json.session.messages);
      setChoDuyet(json.choDuyet ?? []);
      setManualUi({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được phiên chat");
    } finally {
      setLoadingSession(false);
    }
  }, []);

  // --- khôi phục phiên được truyền vào: CHỈ 1 LẦN lúc mount ---
  // (widget cha cập nhật ui.sessionId khi ta tạo phiên mới → nếu effect này chạy
  //  lại theo prop nó sẽ tải đè, xóa mất tin nhắn đang gửi dở)
  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const boot = initialSessionIdRef.current;
    if (boot !== undefined && boot !== "") void openSession(boot);
  }, [openSession]);

  // --- luôn cuộn xuống cuối khi có tin mới ---
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, loadingSession]);

  // --- câu hỏi điền sẵn từ nút ở màn khác (moTroLy — lib/tro-ly/mo-tro-ly.ts) ---
  // Lấy lúc vừa mount (khung vừa được mở) và mỗi lần có sự kiện khi khung đã mở.
  useEffect(() => {
    const dien = () => {
      const c = layCauHoiCho();
      if (c === null) return;
      setInput(c);
      window.setTimeout(() => taRef.current?.focus(), 50);
    };
    dien();
    window.addEventListener(SU_KIEN_MO_TRO_LY, dien);
    return () => window.removeEventListener(SU_KIEN_MO_TRO_LY, dien);
  }, []);

  // --- textarea tự giãn 1 → 5 dòng ---
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.max(98, Math.min(el.scrollHeight, 200)) + "px";
  }, [input]);

  const newSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setChoDuyet([]);
    setManualUi({});
    setTitle("Phiên mới");
    setError(null);
    setShowList(false);
    setEditingTitle(false);
    setMenuFor(null);
    setConfirmDel(null);
    setRenamingId(null);
    setInput("");
    if (taRef.current) taRef.current.focus();
  }, []);

  // --- thực thi uiActions sau mỗi lượt trả lời ---
  // Nhớ lựa chọn tự thao tác + tốc độ (chỉ tiện ích của máy này)
  useEffect(() => {
    try {
      setTuThaoTac(localStorage.getItem("sci-tu-thao-tac") === "1");
      const t = localStorage.getItem("sci-toc-do-dien");
      if (t === "nhanh" || t === "cham") setTocDo(t);
    } catch {
      /* trình duyệt chặn lưu thì dùng mặc định */
    }
  }, []);

  const doiTuThaoTac = useCallback((v: boolean) => {
    setTuThaoTac(v);
    try {
      localStorage.setItem("sci-tu-thao-tac", v ? "1" : "0");
    } catch {
      /* không lưu được thì vẫn dùng trong phiên này */
    }
  }, []);

  const doiTocDo = useCallback((v: TocDoDien) => {
    setTocDo(v);
    try {
      localStorage.setItem("sci-toc-do-dien", v);
    } catch {
      /* bỏ qua */
    }
  }, []);

  /** Chạy dãy bước trợ lý đề nghị, báo lại kết quả vào khung chat */
  const chayThaoTac = useCallback(
    async (buoc: { lenh: string; wbs?: string; giaTri?: string; moTa: string }[]) => {
      dungRef.current = false;
      const kq: KetQuaBuoc[] = await chayDayBuoc(buoc, {
        tocDo,
        diTrang: (p) => router.push(p),
        onDoiTocDo: doiTocDo,
        daDung: () => dungRef.current,
      });
      const hong = kq.find((r) => !r.ok);
      const xong = kq.filter((r) => r.ok).length;
      const cau = hong
        ? `⚠️ Làm được ${xong}/${buoc.length} bước rồi dừng: ${hong.loi ?? "bước lỗi"}`
        : `✅ Đã làm xong ${xong} bước trên màn hình.`;
      setMessages((prev) =>
        prev.concat([
          {
            id: localId("a"),
            role: "assistant",
            content: cau,
            at: new Date().toISOString(),
          },
        ]),
      );
    },
    [tocDo, router, doiTocDo],
  );

  const applyUiActions = useCallback(
    (actions: UiAction[], msgId: string) => {
      if (actions.length === 0) return;
      if (standalone) {
        // Cửa sổ riêng: KHÔNG tự điều hướng — nhờ cửa sổ cha làm
        const opener = window.opener as Window | null;
        if (opener) {
          try {
            opener.postMessage(
              { source: "qldasci-chat", uiActions: actions },
              window.location.origin,
            );
            return;
          } catch {
            /* opener đã đóng / khác origin → rơi xuống chip thủ công */
          }
        }
        setManualUi((prev) => {
          const next: Record<string, UiAction[]> = {};
          const keys = Object.keys(prev);
          for (let i = 0; i < keys.length; i += 1) next[keys[i]] = prev[keys[i]];
          next[msgId] = actions;
          return next;
        });
        return;
      }
      // LÀM & DUYỆT: mở màn kết quả rồi tô sáng chỗ cần xem. KHÔNG cần bật chip
      // Tự thao tác — đây chỉ là dẫn đường + tô, không bấm gì của người dùng.
      const dan = actions.find((a) => a.type === "danToiKetQua");
      if (dan && dan.type === "danToiKetQua" && !standalone) {
        const doiTrang = window.location.pathname + window.location.search !== dan.trang;
        if (doiTrang) router.push(dan.trang);
        const cho = dan.toSang ?? [];
        // ⭐ 13/09 (Mr. Đại: "tô 10 issue — không tô được chỗ nào"): trang mới còn đang
        // biên dịch + tự nạp dữ liệu (đo 1,2 s chỉ để trả HTML) nên chờ cứng 1,5 s là
        // hụt. Nay thử tô mỗi 0,5 s, tối đa 12 giây, tô được thì dừng.
        const bao = (dem: number) => {
            if (dan.nhac) {
              setMessages((prev) =>
                prev.concat([
                  {
                    id: localId("a"),
                    role: "assistant",
                    content:
                      `🔦 ${dan.nhac}` +
                      (cho.length > 0
                        ? dem > 0
                          ? ` — đã tô ${dem}/${cho.length} chỗ.`
                          : " — không tô được chỗ nào (có thể đang bị bộ lọc ẩn)."
                        : ""),
                    at: new Date().toISOString(),
                  },
                ]),
              );
            }
        };
        const batDau = Date.now();
        const thu = () => {
          const dem = cho.length > 0 ? toSang(cho) : 0;
          if (dem > 0 || cho.length === 0 || Date.now() - batDau > 12000) {
            bao(dem);
            return;
          }
          window.setTimeout(thu, 500);
        };
        window.setTimeout(thu, doiTrang ? 800 : 250);
      }

      // Bước tự thao tác chỉ chạy được ở khung TRONG app (cùng trang), và chỉ
      // khi người dùng đã bật chip 🖱 — không bật thì báo rõ thay vì im lặng.
      const thaoTac = actions.filter((a) => a.type === "thaoTac");
      if (thaoTac.length > 0) {
        if (!tuThaoTac) {
          setMessages((prev) =>
            prev.concat([
              {
                id: localId("a"),
                role: "assistant",
                content:
                  "Mình đã dựng sẵn các bước nhưng chưa được phép tự bấm — bật **nút con trỏ** (tròn, cạnh nút 📎 kẹp file) rồi nhắn lại là mình làm ngay.",
                at: new Date().toISOString(),
              },
            ]),
          );
        } else {
          for (const a of thaoTac) {
            if (a.type === "thaoTac") void chayThaoTac(a.buoc);
          }
        }
      }
      runUiActions(
        actions.filter((a) => a.type !== "thaoTac" && a.type !== "danToiKetQua"),
        router,
      );
    },
    [standalone, router, tuThaoTac, chayThaoTac],
  );

  /**
   * ĐƯA TRỢ LÝ VỀ LẠI TRONG ỨNG DỤNG (chỉ ở cửa sổ riêng).
   * Trình duyệt không cho "thả" cửa sổ popup vào lại trang, nên: báo cửa sổ cha
   * mở khung chat với ĐÚNG phiên đang xem rồi tự đóng mình. Nếu không còn cửa sổ
   * cha (người dùng đã đóng app, hoặc mở /chat trực tiếp) → điều hướng tab này
   * về trang chủ, khung chat sẽ tự mở lại theo trạng thái đã lưu.
   */
  const redockToApp = useCallback(() => {
    const opener = window.opener as Window | null;
    if (opener && !opener.closed) {
      try {
        opener.postMessage(
          { source: "qldasci-chat", action: "redock", sessionId },
          window.location.origin,
        );
        try {
          opener.focus();
        } catch {
          /* trình duyệt chặn focus — không sao */
        }
        window.close();
        return;
      } catch {
        /* khác origin / opener hỏng → rơi xuống nhánh dưới */
      }
    }
    try {
      window.localStorage.setItem("qldasci-chat-redock", sessionId ?? "");
    } catch {
      /* localStorage bị chặn — bỏ qua */
    }
    window.location.href = "/";
  }, [sessionId]);

  // --- gửi tin nhắn ---
  // `ep` = gửi kèm (duyệt kế hoạch xuất file): message giữ nguyên câu hỏi gốc
  /** B1 — kẹp file: gửi từng file lên bóc chữ, lỗi file nào nói rõ file đó */
  const napTep = useCallback(
    async (ds: FileList | null) => {
      if (!ds || ds.length === 0) return;
      if (chanKepFile) {
        setError(LY_DO_CHAN.ghi);
        return;
      }
      setError(null);
      setDangDocTep(true);
      const loi: string[] = [];
      for (const f of Array.from(ds)) {
        if (!doDuocDuoi(f.name)) {
          loi.push(`${f.name}: trợ lý chưa đọc được loại file này`);
          continue;
        }
        try {
          const fd = new FormData();
          fd.append("file", f);
          const r = await fetch("/api/tro-ly/dinh-kem" + projectQuery(true), {
            method: "POST",
            body: fd,
          });
          const j = (await r.json().catch(() => null)) as {
            ok?: boolean;
            tep?: TepDinhKem;
            message?: string;
          } | null;
          if (!r.ok || !j || j.ok !== true || !j.tep) {
            loi.push(`${f.name}: ${j?.message ?? "đọc hỏng (HTTP " + r.status + ")"}`);
            continue;
          }
          const tep = j.tep;
          setTepDinhKem((cu) =>
            cu.filter((x) => x.ten !== tep.ten).concat([tep]).slice(-TRAN_SO_TEP)
          );
        } catch (e) {
          loi.push(`${f.name}: ${e instanceof Error ? e.message : "đọc hỏng"}`);
        }
      }
      setDangDocTep(false);
      if (loi.length > 0) setError(loi.join(" · "));
    },
    [projectQuery, chanKepFile]
  );

  const send = useCallback(
    async (raw: string, ep?: { dinhDangXuat: string; keHoachDaDuyet: string }) => {
      const content = raw.replace(/\s+$/, "").trim();
      if (content === "" || sending) return;

      setError(null);
      setInput("");
      const userMsg: ChatMessage = {
        id: localId("u"),
        role: "user",
        content,
        at: new Date().toISOString(),
      };
      setMessages((prev) => prev.concat([userMsg]));
      setSending(true);
      // Chip bật → hiện thanh "đang nghĩ" ngay, đếm giây, để người dùng biết
      // đang chờ LLM chứ không phải tính năng chết (Mr. Đại 06/09)
      const dongThanhCho = tuThaoTac && !standalone ? moThanhCho() : null;

      try {
        // Phiên tạo lười: chưa có thì tạo ngay trước lượt đầu tiên
        let sid = sessionId;
        if (sid === null || sid === "") {
          const res = await fetch("/api/ai/chat/sessions" + projectQuery(true), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: titleFromMessage(content) }),
          });
          const json = (await res.json().catch(() => null)) as {
            ok?: boolean;
            session?: ChatSessionMeta;
            message?: string;
          } | null;
          if (!res.ok || !json || json.ok !== true || !json.session) {
            throw new Error(
              json?.message ?? "Không tạo được phiên chat (HTTP " + res.status + ")",
            );
          }
          sid = json.session.id;
          setSessionId(sid);
          setTitle(json.session.title);
        }

        // Định dạng xuất người đã CHỌN ở dải nút — gửi kèm rồi tự bỏ chọn
        // (chọn là cho MỘT câu, không dính sang câu sau)
        const ddGui = ep?.dinhDangXuat ?? dinhDangXuat;
        setDinhDangXuat(null);
        const res2 = await fetch("/api/ai/chat" + projectQuery(true), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            message: content,
            ...(ddGui ? { dinhDangXuat: ddGui } : {}),
            ...(ep ? { keHoachDaDuyet: ep.keHoachDaDuyet } : {}),
            ...(tepDinhKem.length > 0 ? { dinhKem: tepDinhKem } : {}),
            ...(tuThaoTac && !standalone
              ? { trangHienTai: window.location.pathname }
              : {}),
            ...(timWeb ? { timWebBat: true } : {}),
          }),
        });
        const json2 = (await res2.json().catch(() => null)) as {
          ok?: boolean;
          reply?: string;
          actions?: ExecutedAction[];
          uiActions?: UiAction[];
          session?: ChatSessionMeta;
          message?: string;
          keHoachChoDuyet?: { dinhDang: string; keHoach: string; cauHoi: string };
          choDuyet?: ViecChoGon[];
        } | null;
        if (!res2.ok || !json2 || json2.ok !== true) {
          throw new Error(
            json2?.message ?? "Trợ lý AI không phản hồi (HTTP " + res2.status + ")",
          );
        }

        const aiMsg: ChatMessage = {
          id: localId("a"),
          role: "assistant",
          content: json2.reply ?? "",
          at: new Date().toISOString(),
          actions: json2.actions ?? [],
        };
        setMessages((prev) => prev.concat([aiMsg]));
        // File kẹp chỉ dùng cho MỘT lượt — trừ khi còn chờ duyệt kế hoạch tạo
        // file, lúc đó lượt sau vẫn cần chữ trong file.
        if (!json2.keHoachChoDuyet) setTepDinhKem([]);
        // Kế hoạch tạo file chờ duyệt (bộ xuất) — hiện 2 nút dưới ô nhập
        setKeHoachChoDuyet(json2.keHoachChoDuyet ?? null);
        setSuaKeHoach(false);
        if (json2.keHoachChoDuyet) setKeHoachDraft(json2.keHoachChoDuyet.keHoach);
        if (json2.session) setTitle(json2.session.title);
        // Công cụ GHI chờ bấm — server trả MỌI việc còn chờ của phiên
        setChoDuyet(json2.choDuyet ?? []);
        void loadSessions();
        applyUiActions(json2.uiActions ?? [], aiMsg.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gửi tin nhắn thất bại");
      } finally {
        dongThanhCho?.();
        setSending(false);
      }
    },
    [
      sending,
      sessionId,
      projectQuery,
      loadSessions,
      applyUiActions,
      dinhDangXuat,
      tepDinhKem,
      tuThaoTac,
      standalone,
    ],
  );

  // --- bấm ✅ Làm / ❌ Bỏ một công cụ GHI đang chờ (POST /api/ai/chat/xac-nhan) ---
  const bamViecCho = useCallback(
    async (id: string, hanhDong: "lam" | "bo") => {
      if (dangBam !== null) return;
      setDangBam(id);
      setError(null);
      try {
        const res = await fetch("/api/ai/chat/xac-nhan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, hanhDong }),
        });
        const j = (await res.json().catch(() => null)) as {
          ok?: boolean;
          cau?: string;
          message?: string;
          action?: ExecutedAction;
          uiActions?: UiAction[];
          choDuyet?: ViecChoGon[];
        } | null;
        const cau = j?.cau ?? j?.message ?? "Không bấm được (HTTP " + res.status + ")";
        const msg: ChatMessage = {
          id: localId("a"),
          role: "assistant",
          content: cau,
          at: new Date().toISOString(),
          actions: j?.action ? [j.action] : [],
        };
        setMessages((prev) => prev.concat([msg]));
        // Bấm xong (dù chạy được hay bị chặn) thì việc đó rời khối chờ
        setChoDuyet(j?.choDuyet ?? ((cu) => cu.filter((v) => v.id !== id)));
        if (j?.uiActions && j.uiActions.length > 0) applyUiActions(j.uiActions, msg.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bấm nút thất bại");
      } finally {
        setDangBam(null);
      }
    },
    [dangBam, applyUiActions],
  );

  // --- đổi tên phiên (dùng chung cho thanh tiêu đề và menu ⋯ ở cột trái) ---
  const renameSession = useCallback(
    async (id: string, raw: string) => {
      const t = raw.trim();
      setRenamingId(null);
      setMenuFor(null);
      if (t === "") return;
      if (id === sessionId) setTitle(t);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? Object.assign({}, s, { title: t }) : s)),
      );
      try {
        await fetch("/api/ai/chat/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, title: t }),
        });
        void loadSessions();
      } catch {
        /* đổi tên hỏng thì thôi — không chặn chat */
      }
    },
    [sessionId, loadSessions],
  );

  const commitRename = useCallback(async () => {
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (sessionId === null || t === "" || t === title) return;
    await renameSession(sessionId, t);
  }, [titleDraft, sessionId, title, renameSession]);

  // --- xóa phiên ---
  const removeSession = useCallback(
    async (id: string) => {
      setConfirmDel(null);
      setMenuFor(null);
      try {
        await fetch("/api/ai/chat/sessions?id=" + encodeURIComponent(id), {
          method: "DELETE",
        });
      } catch {
        /* bỏ qua */
      }
      if (id === sessionId) {
        setSessionId(null);
        setMessages([]);
        setChoDuyet([]);
        setManualUi({});
        setTitle("Phiên mới");
      }
      void loadSessions();
    },
    [sessionId, loadSessions],
  );

  // ===== KÉO CHỈNH ĐỘ RỘNG CỘT TRÁI =====

  /** Trần độ rộng cột trái: 320px nhưng không quá 45% bề rộng panel THẬT */
  const sidebarMax = useCallback((): number => {
    const pw = panelWRef.current;
    if (pw <= 0) return SIDEBAR_W_MAX;
    const byPanel = Math.round(pw * 0.45);
    return Math.max(SIDEBAR_W_MIN, Math.min(SIDEBAR_W_MAX, byPanel));
  }, []);

  const clampSidebar = useCallback(
    (w: number): number => {
      const max = sidebarMax();
      if (w < SIDEBAR_W_MIN) return SIDEBAR_W_MIN;
      if (w > max) return max;
      return Math.round(w);
    },
    [sidebarMax],
  );

  /** Độ rộng THEO TỶ LỆ 1/4 khung (dùng khi người dùng chưa tự kéo bao giờ) */
  const ratioW =
    panelW > 0 ? Math.round(panelW * SIDEBAR_RATIO) : SIDEBAR_W_FALLBACK;
  /** Độ rộng THỰC SỰ đem vẽ — panel co lại thì kẹp tạm, KHÔNG ghi đè giá trị đã nhớ */
  const panelMax =
    panelW > 0
      ? Math.max(SIDEBAR_W_MIN, Math.min(SIDEBAR_W_MAX, Math.round(panelW * 0.45)))
      : SIDEBAR_W_MAX;
  const sidebarWidth = Math.min(
    Math.max(sidebarW === null ? ratioW : sidebarW, SIDEBAR_W_MIN),
    panelMax,
  );
  /** Ngăn kéo (panel hẹp) nổi đè lên nội dung → chỉ chặn theo bề rộng panel, không theo 45% */
  const drawerWidth = Math.min(
    Math.max(sidebarW === null ? ratioW : sidebarW, SIDEBAR_W_MIN),
    SIDEBAR_W_MAX,
    panelW > 0 ? Math.max(SIDEBAR_W_MIN, panelW - 48) : SIDEBAR_W_MAX,
  );

  const endDividerDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current === null) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* con trỏ đã nhả sẵn — bỏ qua */
    }
    setDraggingDivider(false);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    // chỉ ghi khi THẢ TAY (không ghi liên tục lúc đang kéo)
    try {
      window.localStorage.setItem(SIDEBAR_W_KEY, String(sidebarWRef.current));
    } catch {
      /* localStorage bị chặn — bỏ qua */
    }
  }, []);

  /** Nháy đúp thanh chia = BỎ độ rộng tay, quay lại tỷ lệ 1/4 khung */
  const resetSidebarW = useCallback(() => {
    setSidebarW(null);
    try {
      window.localStorage.removeItem(SIDEBAR_W_KEY);
    } catch {
      /* localStorage bị chặn — bỏ qua */
    }
  }, []);

  // Nạp kho skill một lần — chỉ để xổ gợi ý, không tốn token AI
  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/skill");
        const j = (await r.json()) as {
          ok?: boolean;
          skill?: { slug: string; ten: string; moTa: string }[];
        };
        if (j.ok === true && j.skill) setDsSkill(j.skill);
      } catch {
        /* không có skill thì thôi — chat vẫn chạy */
      }
    })();
  }, []);

  // Vào từ nút ▶ Chạy ở màn Skill (/chat?skill=slug) → điền sẵn "/slug "
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const sk = sp.get("skill");
    if (sk === null || !/^[a-z0-9-]{2,64}$/.test(sk)) return;
    setInput(`/${sk} `);
    taRef.current?.focus();
  }, []);

  // Gõ "/" ở ĐẦU ô nhập và chưa có dấu cách → đang tìm skill
  const goiYSkill = useMemo(() => {
    const m = /^\/([a-z0-9-]*)$/.exec(input);
    if (!m) return [];
    const q = m[1] ?? "";
    return dsSkill
      .filter((k) => k.slug.includes(q) || k.ten.toLowerCase().includes(q))
      .slice(0, 8);
  }, [input, dsSkill]);

  /** Chọn một skill: điền "/slug " rồi trỏ chuột về ô nhập (một cú bấm) */
  const dungSkill = useCallback((slug: string) => {
    setInput(`/${slug} `);
    setChonSkill(0);
    taRef.current?.focus();
  }, []);

  // Kẹp file mà chưa gõ gì thì vẫn gửi được — dùng câu hỏi mặc định bên dưới
  const canSend = (input.trim() !== "" || tepDinhKem.length > 0) && !sending && !dangDocTep;
  const CAU_MAC_DINH_TEP = "Đọc file mình vừa kẹp, tóm tắt phần liên quan tới tiến độ dự án.";
  const noiDungGui = () =>
    input.trim() !== "" ? input : tepDinhKem.length > 0 ? CAU_MAC_DINH_TEP : "";
  const groups = groupSessions(sessions);
  // Quá 100 phiên: chỉ NHẮC, máy không tự xoá phiên nào (Mr. Đại chốt 18/10/2026 — lib/ai/nhac-xoa-phien.ts)
  const nhacXoaPhien = cauNhacXoaPhien(sessions.length);

  // ===== CỘT TRÁI: lịch sử phiên (dùng lại cho cả 2 cột lẫn ngăn kéo) =====
  function renderSidebar(drawer: boolean): React.ReactNode {
    return (
      <>
        <div className="shrink-0 px-2 pb-1 pt-2">
          {drawer && (
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Phiên làm việc
              </span>
              <IconBtn title="Đóng danh sách" onClick={() => setShowList(false)}>
                <X className="h-3.5 w-3.5" />
              </IconBtn>
            </div>
          )}
          <button
            type="button"
            onClick={newSession}
            data-lenh="chat.phien"
            data-gia-tri="phiên mới"
            className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-border px-2 py-[7px] text-[11.5px] font-semibold text-text-secondary transition-colors duration-150 hover:border-accent/60 hover:bg-surface hover:text-accent"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Cuộc trò chuyện mới</span>
          </button>
          {/* chữ thuần (luật 28) — không chặn tạo phiên mới */}
          {nhacXoaPhien && <p className="mt-1.5 px-0.5 text-[11px] leading-snug text-text-secondary">{nhacXoaPhien}</p>}
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
          {sessions.length === 0 && (
            <div className="px-2 py-3 text-[11px] leading-relaxed text-text-muted">
              Chưa có phiên nào. Gửi câu hỏi đầu tiên để tạo phiên.
            </div>
          )}

          {groups.map((g) => (
            <div key={g.key} className="mb-1">
              <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                {g.label}
              </div>
              <div className="space-y-[2px]">
                {g.items.map((s) => {
                  const active = s.id === sessionId;

                  if (renamingId === s.id) {
                    return (
                      <div key={s.id} className="px-1 py-[2px]">
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => void renameSession(s.id, renameDraft)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void renameSession(s.id, renameDraft);
                            else if (e.key === "Escape") setRenamingId(null);
                          }}
                          className="w-full rounded-[6px] border border-accent/60 bg-surface px-1.5 py-1 text-[11.5px] text-text outline-none"
                        />
                      </div>
                    );
                  }

                  if (confirmDel === s.id) {
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-1 rounded-[8px] border border-red/30 bg-red-soft px-2 py-[5px]"
                      >
                        <span className="min-w-0 flex-1 truncate text-[10.5px] font-semibold text-red">
                          Xóa phiên này?
                        </span>
                        <button
                          type="button"
                          title="Xác nhận xóa phiên"
                          onClick={() => void removeSession(s.id)}
                          className="shrink-0 rounded p-0.5 text-red transition-colors hover:bg-red-soft"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Hủy"
                          onClick={() => setConfirmDel(null)}
                          className="shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-text"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      className={
                        "group relative flex items-center rounded-[8px] transition-colors duration-150 " +
                        (active ? "bg-accent-soft" : "hover:bg-surface")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => void openSession(s.id)}
                        title={s.title + " · " + fmtWhen(s.updatedAt) + " · " + s.messageCount + " tin"}
                        className={
                          "min-w-0 flex-1 truncate px-2 py-[6px] text-left text-[11.5px] " +
                          (active ? "font-semibold text-accent" : "text-text-secondary")
                        }
                      >
                        {s.title}
                      </button>
                      <button
                        type="button"
                        title="Tùy chọn phiên"
                        aria-label="Tùy chọn phiên"
                        onClick={() => setMenuFor(menuFor === s.id ? null : s.id)}
                        className={
                          "mr-1 shrink-0 rounded p-0.5 text-text-muted transition-all duration-150 hover:text-text " +
                          (menuFor === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")
                        }
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>

                      {menuFor === s.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setMenuFor(null)}
                          />
                          <div className="absolute right-1 top-[26px] z-50 w-[124px] overflow-hidden rounded-[8px] border border-border bg-bg2 py-0.5 shadow-card">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuFor(null);
                                setRenameDraft(s.title);
                                setRenamingId(s.id);
                              }}
                              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11.5px] text-text-secondary transition-colors hover:bg-surface hover:text-text"
                            >
                              <Pencil className="h-3 w-3 shrink-0" />
                              Đổi tên
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuFor(null);
                                setConfirmDel(s.id);
                              }}
                              className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-[11.5px] text-text-secondary transition-colors hover:bg-surface hover:text-red"
                            >
                              <Trash2 className="h-3 w-3 shrink-0" />
                              Xóa
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (chanTroLy) {
    return (
      <div data-khung-chat className="flex h-full w-full items-center justify-center bg-surface p-6 text-center text-[12.5px] text-text-secondary">
        {LY_DO_TRO_LY}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      data-khung-chat
      className="relative flex h-full min-h-0 w-full overflow-hidden bg-surface text-text"
    >
      <KhaiHuongDan ma="chat" uuTien={2} />
      {/* ===== CỘT TRÁI — LỊCH SỬ PHIÊN, LUÔN HIỆN khi panel ≥ 560px ===== */}
      {wide && sidebarOn && (
        <aside
          style={{ width: sidebarWidth }}
          className="flex h-full shrink-0 flex-col border-r border-border-light bg-bg2"
        >
          {renderSidebar(false)}
        </aside>
      )}

      {/* ===== THANH KÉO giữa 2 cột (chỉ ở chế độ 2 cột) =====
          Nét vẽ chỉ 3px nhưng vùng bắt chuột 5px và lấn 2px sang mỗi bên nên
          đưa chuột vào ĐÚNG ranh giới là kéo được ngay. Nháy đúp → về 180px. */}
      {wide && sidebarOn && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo để chỉnh độ rộng danh sách phiên"
          title="Kéo để chỉnh độ rộng · nháy đúp để về mặc định (1/4 khung)"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            dragRef.current = { startX: e.clientX, startW: sidebarWidth };
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* trình duyệt không cho bắt con trỏ — vẫn kéo được bằng pointermove */
            }
            setDraggingDivider(true);
            document.body.style.userSelect = "none";
            document.body.style.cursor = "col-resize";
          }}
          onPointerMove={(e) => {
            const st = dragRef.current;
            if (st === null) return;
            const next = clampSidebar(st.startW + (e.clientX - st.startX));
            sidebarWRef.current = next;
            setSidebarW(next);
          }}
          onPointerUp={endDividerDrag}
          onPointerCancel={endDividerDrag}
          onDoubleClick={resetSidebarW}
          className="group relative z-10 -ml-[2px] -mr-[2px] w-[5px] shrink-0 cursor-col-resize touch-none select-none"
        >
          <span
            aria-hidden
            className={
              "pointer-events-none absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full transition-colors duration-150 " +
              (draggingDivider ? "bg-accent" : "bg-transparent group-hover:bg-accent/70")
            }
          />
        </div>
      )}

      {/* ===== panel hẹp: cột trái thu về ngăn kéo trượt từ trái ===== */}
      {!wide && showList && (
        <>
          <div
            className="absolute inset-0 z-20 bg-black/50"
            onClick={() => setShowList(false)}
          />
          <aside
            style={{ width: drawerWidth }}
            className="absolute bottom-0 left-0 top-0 z-30 flex flex-col border-r border-border bg-bg2 shadow-card"
          >
            {renderSidebar(true)}
          </aside>
        </>
      )}

      {/* ===== CỘT PHẢI — HỘI THOẠI ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* thanh tiêu đề mỏng (đồng thời là tay nắm KÉO THẢ của widget) */}
        <div
          data-chat-drag="1"
          onDoubleClick={(e) => {
            // Bấm đúp vào VÙNG TRỐNG của thanh tiêu đề → về khung mặc định.
            // Bỏ qua nếu bấm trúng nút / ô nhập (ô đổi tên phiên tự chặn nổi bọt).
            if ((e.target as HTMLElement).closest("button, input")) return;
            if (onResetDefault) onResetDefault();
          }}
          className={
            "flex shrink-0 select-none flex-nowrap items-center gap-1 border-b border-border-light bg-bg2 px-2 py-1.5 " +
            (standalone ? "" : "cursor-grab active:cursor-grabbing")
          }
        >
          {/* BẬT/TẮT cột lịch sử phiên — luôn hiện.
              Panel rộng: ẩn/hiện hẳn cột (gọn như khung chat đơn ↔ 2 cột kiểu
              Claude.ai). Panel hẹp: mở/đóng ngăn kéo trượt. */}
          <IconBtn
            title={
              sidebarVisible
                ? "Ẩn danh sách phiên (chỉ còn khung trò chuyện)"
                : "Hiện danh sách phiên — xem lại các cuộc trò chuyện cũ"
            }
            onClick={toggleSidebar}
          >
            {sidebarVisible ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </IconBtn>

          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void commitRename()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitRename();
                else if (e.key === "Escape") setEditingTitle(false);
              }}
              className="min-w-0 flex-1 rounded-sm border border-accent/60 bg-surface px-1.5 py-0.5 text-[13px] font-bold text-text outline-none"
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                // đổi tên phiên — KHÔNG để nổi bọt lên header (tránh "về mặc định")
                e.stopPropagation();
                if (sessionId === null) return;
                setTitleDraft(title);
                setEditingTitle(true);
              }}
              title={sessionId === null ? title : "Bấm đúp để đổi tên phiên"}
              className="min-w-0 flex-1 truncate px-1 text-[13px] font-bold text-text"
            >
              {title}
            </div>
          )}

          {/* Model + vòng ngữ cảnh (S8 tầng 2 — 05/09): chip model bấm đổi ngay,
              vòng tròn vàng ≥60% / đỏ ≥85% ước theo ký tự phiên */}
          <VongNguCanh uocToken={uocTokenPhien} tran={TRAN_NGU_CANH} />
          <ChonModel duocDoi={duocGhi(vaiTro)} />

          {/* Cột phiên đang ẩn thì không có nút "✚ Cuộc trò chuyện mới" bên đó
              → đưa nút ✚ lên tiêu đề */}
          {!sidebarVisible && (
            <IconBtn title="Cuộc trò chuyện mới" onClick={newSession}>
              <Plus className="h-4 w-4" />
            </IconBtn>
          )}

          {/* Cửa sổ riêng: nút ĐƯA VỀ ỨNG DỤNG.
              Trình duyệt KHÔNG cho kéo cửa sổ popup "dính" ngược vào trang, nên
              phải có nút: báo cửa sổ cha mở lại khung chat (đúng phiên đang xem)
              rồi tự đóng mình. Không còn cửa sổ cha → mở lại app ở tab này. */}
          {standalone && (
            <button
              type="button"
              onClick={redockToApp}
              title="Đưa trợ lý về lại trong ứng dụng"
              className="flex shrink-0 items-center gap-1.5 rounded-[8px] border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
            >
              <PanelLeft className="h-3.5 w-3.5" />
              Đưa về ứng dụng
            </button>
          )}

          {!standalone && (
            <>
              {/* BỘ CHUYỂN CHẾ ĐỘ (segmented) — 3 trạng thái khi có onSetDock:
                    neo mép TRÁI · khung NỔI tự do · neo mép PHẢI
                  (nút "nổi" đặt GIỮA cho khớp trực giác vị trí trên màn hình).
                  Chỗ gọi cũ không truyền onSetDock → giữ nguyên bộ 2 nút. */}
              {onSetDock ? (
                <div
                  className="flex shrink-0 items-center overflow-hidden rounded-[8px] border border-border"
                  role="group"
                  aria-label="Vị trí khung chat"
                >
                  <button
                    type="button"
                    title="Neo cột trái (chia đôi màn hình)"
                    aria-label="Neo cột trái (chia đôi màn hình)"
                    aria-pressed={mode === "dock" && dockSide === "left"}
                    onClick={() => onSetDock("left")}
                    className={
                      "flex h-[22px] w-[24px] items-center justify-center transition-colors duration-150 " +
                      (mode === "dock" && dockSide === "left"
                        ? "bg-accent-soft text-accent"
                        : "text-text-muted hover:bg-surface hover:text-text")
                    }
                  >
                    <PanelLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Khung nổi tự do (kéo thả được)"
                    aria-label="Khung nổi tự do (kéo thả được)"
                    aria-pressed={mode === "float"}
                    onClick={() => {
                      if (onSetMode) onSetMode("float");
                    }}
                    className={
                      "flex h-[22px] w-[24px] items-center justify-center border-x border-border transition-colors duration-150 " +
                      (mode === "float"
                        ? "bg-accent-soft text-accent"
                        : "text-text-muted hover:bg-surface hover:text-text")
                    }
                  >
                    <Square className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Neo cột phải"
                    aria-label="Neo cột phải"
                    aria-pressed={mode === "dock" && dockSide === "right"}
                    onClick={() => onSetDock("right")}
                    className={
                      "flex h-[22px] w-[24px] items-center justify-center transition-colors duration-150 " +
                      (mode === "dock" && dockSide === "right"
                        ? "bg-accent-soft text-accent"
                        : "text-text-muted hover:bg-surface hover:text-text")
                    }
                  >
                    <PanelRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                onSetMode && (
                  <div
                    className="flex shrink-0 items-center overflow-hidden rounded-[8px] border border-border"
                    role="group"
                    aria-label="Chế độ hiển thị khung chat"
                  >
                    <button
                      type="button"
                      title="Neo cột trái (chia đôi màn hình)"
                      aria-label="Neo cột trái (chia đôi màn hình)"
                      aria-pressed={mode === "dock"}
                      onClick={() => onSetMode("dock")}
                      className={
                        "flex h-[22px] w-[24px] items-center justify-center transition-colors duration-150 " +
                        (mode === "dock"
                          ? "bg-accent-soft text-accent"
                          : "text-text-muted hover:bg-surface hover:text-text")
                      }
                    >
                      <PanelLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Khung nổi tự do (kéo thả được)"
                      aria-label="Khung nổi tự do (kéo thả được)"
                      aria-pressed={mode === "float"}
                      onClick={() => onSetMode("float")}
                      className={
                        "flex h-[22px] w-[24px] items-center justify-center border-l border-border transition-colors duration-150 " +
                        (mode === "float"
                          ? "bg-accent-soft text-accent"
                          : "text-text-muted hover:bg-surface hover:text-text")
                      }
                    >
                      <Square className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              )}

              {/* VỀ MẶC ĐỊNH — lối thoát rõ ràng về khung nhỏ góc phải dưới */}
              {onResetDefault && (
                <button
                  type="button"
                  title="Về khung nhỏ góc phải dưới (mặc định)"
                  aria-label="Về khung nhỏ góc phải dưới (mặc định)"
                  onClick={onResetDefault}
                  className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-150 hover:bg-surface hover:text-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              {onOpenWindow && (
                <IconBtn
                  title="Mở thành cửa sổ riêng — kéo sang màn hình khác (muốn quay lại, bấm 'Đưa về ứng dụng' ở cửa sổ đó)"
                  onClick={() => onOpenWindow(sessionId)}
                >
                  <ExternalLink className="h-4 w-4" />
                </IconBtn>
              )}
              {onMinimize && (
                <IconBtn title="Thu gọn" onClick={onMinimize}>
                  <Minus className="h-4 w-4" />
                </IconBtn>
              )}
              {onClose && (
                <IconBtn title="Đóng" onClick={onClose} danger>
                  <X className="h-4 w-4" />
                </IconBtn>
              )}
            </>
          )}
        </div>

        {/* ===== VÙNG TIN NHẮN ===== */}
        <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
          {loadingSession && (
            <div className="py-6 text-center text-[11.5px] text-text-muted">Đang tải phiên…</div>
          )}

          {!loadingSession && messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-2 py-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">
                AI
              </div>
              <div className="max-w-[380px] text-center">
                <div className="text-[14px] font-bold leading-snug text-text">
                  {projectName !== ""
                    ? "Mình giúp gì cho bạn về dự án " + projectName + "?"
                    : "Mình giúp gì cho bạn hôm nay?"}
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-text-secondary">
                  Hỏi bằng tiếng Việt — tôi tra cứu tiến độ, cập nhật số liệu, chạy phân tích và
                  mở tab giúp anh.
                </p>
              </div>
              <div className="flex w-full flex-wrap justify-center gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={sending}
                    onClick={() => void send(q)}
                    className="rounded-full border border-border bg-bg2 px-2.5 py-1 text-[11.5px] text-text-secondary transition-colors duration-150 hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m) => {
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex flex-col items-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[12px] bg-accent-soft px-3 py-2 text-[13px] leading-relaxed text-text">
                      {m.content}
                    </div>
                    <div className="mt-1 pr-1 text-[10px] text-text-muted">{fmtTime(m.at)}</div>
                  </div>
                );
              }
              const manual = manualUi[m.id];
              return (
                <div key={m.id} className="flex flex-col items-start">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <AiAvatar />
                    <span className="text-[10.5px] font-semibold text-text-secondary">
                      Trợ lý
                    </span>
                    <span className="text-[10px] text-text-muted">{fmtTime(m.at)}</span>
                  </div>
                  <div className="w-full min-w-0">
                    <MarkdownLite text={m.content !== "" ? m.content : "…"} />
                    {/* Dải nút xuất file — chỉ khi câu trả lời đã có chữ */}
                    {m.content.trim() !== "" && <XuatTraLoi noiDung={m.content} />}
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.actions.map((a, i) => (
                          <ActionChip key={m.id + "-" + i} action={a} />
                        ))}
                      </div>
                    )}
                    {manual && manual.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {manual.map((a, i) => {
                          if (a.type === "navigate") {
                            const label = TAB_LABELS[a.path] ?? a.path;
                            return (
                              <button
                                key={m.id + "-ui-" + i}
                                type="button"
                                onClick={() => router.push(a.path)}
                                className="rounded-full border border-accent/45 bg-accent-soft px-2 py-[3px] text-[10.5px] font-semibold text-accent transition-colors duration-150 hover:border-accent"
                              >
                                → mở tab {label}
                              </button>
                            );
                          }
                          if (a.type === "switchProject") {
                            return (
                              <span
                                key={m.id + "-ui-" + i}
                                className="rounded-full border border-border bg-bg2 px-2 py-[3px] text-[10.5px] font-semibold text-text-secondary"
                              >
                                → đổi dự án {a.projectId} ở cửa sổ chính
                              </span>
                            );
                          }
                          return (
                            <span
                              key={m.id + "-ui-" + i}
                              className="rounded-full border border-border bg-bg2 px-2 py-[3px] text-[10.5px] font-semibold text-text-secondary"
                            >
                              → tải lại dữ liệu ở cửa sổ chính
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* CÔNG CỤ GHI CHỜ BẤM (25/09) — trợ lý đề nghị, người bấm ✅ Làm mới
                chạy; ❌ Bỏ là thôi. Mô tả là chữ thuần (luật 28), chỉ nút có viền. */}
            {choDuyet.length > 0 && (
              <div className="space-y-1.5">
                {choDuyet.map((v) => (
                  <div key={v.id} className="rounded-md border border-accent/40 bg-accent-soft/40 p-2">
                    <div className="text-[12px] leading-relaxed text-text">
                      <span className="font-semibold text-accent">⏸ Chờ bạn bấm: </span>
                      {v.moTa}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={dangBam !== null || sending}
                        onClick={() => void bamViecCho(v.id, "lam")}
                        className="rounded-[7px] border border-accent bg-accent-soft px-2.5 py-[3px] text-[11px] font-bold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
                      >
                        {dangBam === v.id ? "Đang làm…" : "✅ Làm"}
                      </button>
                      <button
                        type="button"
                        disabled={dangBam !== null || sending}
                        onClick={() => void bamViecCho(v.id, "bo")}
                        className="rounded-[7px] border border-border px-2.5 py-[3px] text-[11px] font-semibold text-text-secondary transition-colors hover:border-red hover:text-red disabled:opacity-50"
                      >
                        ❌ Bỏ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sending && (
              <div className="flex flex-col items-start">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <AiAvatar />
                  <span className="text-[10.5px] font-semibold text-text-secondary">Trợ lý</span>
                </div>
                <div className="flex items-center gap-1.5 py-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted"
                      style={{ animationDelay: i * 180 + "ms" }}
                    />
                  ))}
                  <span className="ml-1 text-[10px] text-text-muted">
                    Đang xử lý… (có thể mất vài phút nếu chạy phân tích)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== Ô NHẬP ===== */}
        <div className="shrink-0 px-4 pb-3 pt-1">
          {error !== null && (
            <div className="mb-1.5 rounded-md border border-red/30 bg-red-soft px-2.5 py-1.5 text-[11px] leading-relaxed text-red">
              {error}
            </div>
          )}
          {/* B2 — XỔ SKILL khi gõ "/": bấm một phát là điền tên, khỏi phải nhớ */}
          {goiYSkill.length > 0 && (
            <div className="mb-1.5 overflow-hidden rounded-md border border-border bg-bg2">
              <div className="border-b border-border px-2 py-1 text-[10px] text-text-muted">
                Skill gọi đích danh — chọn rồi gõ tiếp câu hỏi
              </div>
              {goiYSkill.map((k, i) => (
                <button
                  key={k.slug}
                  type="button"
                  onMouseEnter={() => setChonSkill(i)}
                  onClick={() => dungSkill(k.slug)}
                  className={`block w-full px-2 py-1.5 text-left transition-colors ${
                    i === chonSkill ? "bg-accent-soft" : "hover:bg-bg"
                  }`}
                >
                  <div className="text-[11.5px] font-semibold text-text">/{k.slug}</div>
                  <div className="truncate text-[10px] text-text-muted">{k.moTa || k.ten}</div>
                </button>
              ))}
            </div>
          )}
          {/* B1 — CHIP FILE ĐÃ KẸP: nói rõ đọc được bao nhiêu chữ, có bị cắt
              không, và mách nộp Lớp 0 nếu nhận ra loại hồ sơ */}
          {tepDinhKem.length > 0 && (
            <div className="mb-1.5 flex flex-col gap-1">
              {tepDinhKem.map((t) => (
                <div
                  key={t.ten}
                  className="flex items-start gap-2 rounded-md border border-border bg-bg2 px-2 py-1.5 text-[11px] text-text-secondary"
                >
                  <span className="shrink-0 pt-[1px]">📎</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-text">{t.ten}</div>
                    <div className="text-[10px] text-text-muted">
                      đọc được {t.chu.length.toLocaleString("vi-VN")} ký tự
                      {t.biCat ? " (đã cắt bớt phần cuối)" : ""}
                      {t.ghiChu ? ` · ${t.ghiChu}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Bỏ file ${t.ten}`}
                    onClick={() => setTepDinhKem((ds) => ds.filter((x) => x.ten !== t.ten))}
                    className="shrink-0 text-text-muted transition-colors hover:text-red"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative rounded-[12px] border border-border bg-bg2 transition-colors duration-150 focus-within:border-accent/60">
            <textarea
              ref={taRef}
              rows={1}
              value={input}
              disabled={sending}
              data-lenh="chat.goi-skill"
              placeholder={sending ? "Đang xử lý…" : "Nhắn cho trợ lý…"}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Đang xổ skill: ↑↓ chạy trong danh sách, Enter/Tab chọn
                if (goiYSkill.length > 0) {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setChonSkill((c) => {
                      const n = goiYSkill.length;
                      return (c + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
                    });
                    return;
                  }
                  if ((e.key === "Enter" || e.key === "Tab") && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    dungSkill(goiYSkill[Math.min(chonSkill, goiYSkill.length - 1)].slug);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setInput("");
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(noiDungGui());
                }
              }}
              className="scroll-thin block min-h-[98px] max-h-[200px] w-full resize-none bg-transparent py-[9px] pl-3 pr-[44px] text-[13px] leading-[20px] text-text outline-none placeholder:text-text-muted disabled:opacity-60"
            />
            <input
              ref={tepRef}
              type="file"
              hidden
              multiple
              accept=".pdf,.xlsx,.xls,.csv,.docx,.txt,.md,.json,.pptx"
              onChange={(e) => {
                void napTep(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              title={
                chanKepFile
                  ? LY_DO_CHAN.ghi
                  : "Kẹp file cho trợ lý đọc (pdf, xlsx, docx, txt, md, json, pptx)"
              }
              aria-label="Kẹp file"
              // 28/10 (Mr. Đại): ô gõ cao bằng Pháp lý (4 dòng); 📎 · 🌐 · Gửi xếp dọc cột phải, chữ gõ bên trái; bỏ nút Tự thao tác
              disabled={chanKepFile || sending || dangDocTep || tepDinhKem.length >= TRAN_SO_TEP}
              onClick={() => tepRef.current?.click()}
              data-lenh="chat.kep-file"
              className="absolute top-[6px] right-[6px] flex h-7 w-7 items-center justify-center rounded-full border border-border text-[13px] text-text-secondary transition-colors duration-150 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-35"
            >
              {dangDocTep ? "…" : "📎"}
            </button>
            {/* 🌐 TÌM TRÊN INTERNET (06/09) — tắt là xám, bật là cam, cùng
                khuôn với nút Tự thao tác. Mặc định tắt: nội dung ngoài
                internet không được lẫn vào số liệu dự án nếu người dùng
                không xin. */}
            <button
              type="button"
              onClick={() => setTimWeb((v) => !v)}
              aria-pressed={timWeb}
              aria-label="Tìm trên internet"
              title={
                timWeb
                  ? "Tìm trên internet: ĐANG BẬT — trợ lý được ra ngoài tra giá vật tư, quy định mới, thông số thiết bị. Câu trả lời luôn kèm địa chỉ trang. Bấm để tắt."
                  : "Tìm trên internet: đang tắt — trợ lý chỉ dùng dữ liệu trong hệ thống. Bấm để cho phép ra ngoài internet."
              }
              data-lenh="chat.tim-web"
              className={`absolute top-[38px] right-[6px] flex h-7 w-7 items-center justify-center rounded-full border text-[13px] transition-colors duration-150 ${
                timWeb
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-secondary hover:border-accent hover:text-accent"
              }`}
            >
              <Globe className="h-[15px] w-[15px]" />
            </button>
            <button
              type="button"
              title="Gửi (Enter)"
              aria-label="Gửi"
              disabled={!canSend}
              onClick={() => void send(noiDungGui())}
              className="absolute bottom-[6px] right-[6px] flex h-7 w-7 items-center justify-center rounded-full bg-accent text-white transition-colors duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
          {/* KẾ HOẠCH TẠO FILE CHỜ DUYỆT — một bấm là chạy (nếp bớt cú bấm);
              muốn sửa thì bấm ✏️ mới hiện ô soạn */}
          {keHoachChoDuyet !== null && (
            <div className="mt-1.5 rounded-md border border-accent/40 bg-accent-soft/40 p-2">
              {suaKeHoach && (
                <textarea
                  value={keHoachDraft}
                  onChange={(e) => setKeHoachDraft(e.target.value)}
                  rows={5}
                  className="mb-1.5 w-full rounded-sm border border-border bg-bg px-2 py-1 text-[11.5px] leading-relaxed text-text"
                />
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    const kh = keHoachChoDuyet;
                    setKeHoachChoDuyet(null);
                    void send(kh.cauHoi, {
                      dinhDangXuat: kh.dinhDang,
                      keHoachDaDuyet: suaKeHoach ? keHoachDraft : kh.keHoach,
                    });
                  }}
                  className="rounded-[7px] border border-accent bg-accent-soft px-2.5 py-[3px] text-[11px] font-bold text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
                >
                  ✅ Duyệt &amp; tạo file {keHoachChoDuyet.dinhDang.toUpperCase()}
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => setSuaKeHoach((v) => !v)}
                  className="rounded-[7px] border border-border px-2.5 py-[3px] text-[11px] font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  {suaKeHoach ? "↩ Bỏ sửa" : "✏️ Sửa kế hoạch"}
                </button>
                <button
                  type="button"
                  onClick={() => setKeHoachChoDuyet(null)}
                  className="rounded-[7px] border border-border px-2.5 py-[3px] text-[11px] font-semibold text-text-secondary transition-colors hover:border-red hover:text-red"
                >
                  ✕ Bỏ
                </button>
              </div>
            </div>
          )}

          {/* Dải 11 nút định dạng xuất (05/09) — chọn để câu tiếp theo AI sinh
              thẳng file; không chọn thì AI vẫn tự phát hiện từ câu hỏi */}
          <DaiNutXuat chon={dinhDangXuat} onChon={setDinhDangXuat} />
          <div className="mt-1 px-1 text-[10px] text-text-muted">
            Enter gửi · Shift+Enter xuống dòng
            {standalone ? " · cửa sổ riêng: kéo ra màn hình khác được" : " · Ctrl+K bật/tắt"}
          </div>
        </div>
      </div>

    </div>
  );
}

export default ChatPanel;
