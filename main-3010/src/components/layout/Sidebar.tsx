"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarCog,
  Camera,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  ClipboardList,
  CloudSun,
  DraftingCompass,
  Eye,
  FileText,
  FolderTree,
  GanttChartSquare,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Scale,
} from "lucide-react";
import { canAccessPath } from "@/lib/auth";
import { cuaCuaTrang, LY_DO_CHAN } from "@/lib/quyen";
import { MOT_CAU_TA, TEN_AGENT } from "@/lib/nhan-dien-agent";
import { useSessionUser } from "@/lib/use-session";
import { useDayAgent } from "@/components/layout/DayAgent";
import { CHUA_HOAT_DONG, DAY_AGENT } from "@/lib/lien-ket-agent";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

// ============================================================
// CÂY MENU MAIN AGENT — 4 nhóm, 7 màn (gọn 26/09)
//
// Nguồn: PLAN-MAIN-AGENT + KE-HOACH/06-MAIN-AGENT-DA-DUNG.md.
//
// ĐÃ BỎ so với bộ kế thừa (tiến độ, rồi Base):
//   · Nhóm Phân tích AI · Dữ liệu · Báo cáo — nghiệp vụ tiến độ
//   · Cây việc · Gantt · Lập tiến độ · Hồ sơ dự án · Ảnh hiện trường ·
//     Năng suất · Đối chiếu chéo — nghiệp vụ của bốn con kia
//   · Trang gốc "/" cũng KHÔNG phải màn: nó từng render "Tổng quan dự án"
//     của Agent Tiến độ, nay chỉ đá sang Báo cáo sáng (07/09/2026)
//
// Luật phán mỗi màn: "người dùng vào đây để LÀM gì?". Trả lời không được
// thì nó là Cài đặt hoặc ghi chú thiết kế, không phải màn.
// ============================================================
const NHOM_SANG_AGENT = "Sang agent khác";
const BIEU_TUONG_AGENT: Record<string, React.ComponentType<{ className?: string }>> = {
  quansat: Eye,
  base: Building2,
  tiendo: BarChart3,
  hopdong: FileText,
  phaply: Scale,
  // 28/10/2026 (Mr. Đại): Agent Nghiệm thu nằm dưới cùng nhóm «Sang agent khác»
  nghiemthu: ClipboardCheck,
};

const GROUPS: {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    /** Màn lõi dùng chung cả 5 agent — hiện chip LÕI như demo */
    loi?: boolean;
    /** Mở tab mới dù đường dẫn nằm trong app (route chuyển hướng ra ngoài) */
    ngoai?: boolean;
    /** Agent chưa có địa chỉ trong danh bạ — chữ mờ, không bấm */
    chuaCo?: boolean;
    /** Agent mật không vào được — câu lý do thay cho "chưa đưa lên hoạt động" */
    lyDoKhoa?: string;
  }[];
}[] = [
  {
    // ⛔ Main KHÔNG có màn nghiệp vụ nào của bốn agent kia: không cây WBS,
    //    không phiếu giá, không kho văn bản. Nó HỎI rồi tổng hợp.
    //    (PLAN-MAIN-AGENT mục 1 + KE-HOACH/05 A.1 — "cái bẫy lớn nhất")
    // Mr. Đại chốt 04/09 (demo): Việc của tôi nằm nhóm ĐIỀU HÀNH và đứng
    // TRƯỚC Bảng điều hành — vẫn là màn LÕI, chỉ đổi nhóm menu.
    title: "Điều hành",
    items: [
      // 07/10 (Mr. Đại chốt): "Việc của tôi" ra nút ĐẦU THANH TRÊN (Header.tsx) — bỏ khỏi menu trái
      { href: "/bang-dieu-hanh", label: "Bảng điều hành", icon: LayoutDashboard },
      // 26/09 (Mr. Đại chốt 1a): Báo cáo sáng + tháng gộp MỘT mục, hai tab (demo vẽ một mục "Báo cáo")
      { href: "/bao-cao", label: "Báo cáo", icon: FileText },
    ],
  },
  {
    title: "Chung — lõi 5 agent",
    items: [
      { href: "/alerts", label: "Cảnh báo", icon: AlertTriangle, loi: true },
      // 03/10 (Mr. Đại): Skill AI của tôi chuyển vào menu tên người (UserMenu.tsx). Đường /nhat-ky chỉ còn một dòng dẫn.
    ],
  },
  // 26/09 (Mr. Đại chốt 1a — gọn 20/80): BỎ nhóm "Điều khiển cả hệ".
  //   · Khai một lần — dùng chung: 0 lần lưu, 3 agent kéo 459/459 lượt rỗng → gỡ hẳn
  //   · Ai được gọi ai → Cài đặt → 🔌 Kết nối (cạnh Danh bạ agent)
  //   · Quan sát các agent → (26/09) Agent quan sát, link ở nhóm "Sang agent khác"
  {
    // ⭐ Chốt AT — link sang từng agent, mở tab mới (demo nhóm "Sang agent khác").
    // 04/10/2026 (Mr. Đại): "menu trái của agent main cũng có 5 link tới các agent trình tự giống trong tên" —
    // các mục dựng lúc chạy từ DÃY AGENT chung (lib/lien-ket-agent.ts, địa chỉ đọc danh bạ) trong Sidebar() bên dưới;
    // Agent Nghiệm thu thêm 28/10/2026 nên cột trái có 6 link.
    title: NHOM_SANG_AGENT,
    items: [],
  },
  // 03/10 (Mr. Đại): Cài đặt chuyển vào menu tên người (UserMenu.tsx).
];

export async function handleLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // vẫn chuyển về login dù request lỗi
  }
  window.location.href = "/login";
}

/** Modal đổi mật khẩu của chính user đang đăng nhập → /api/auth/change-password */
export function ChangePasswordModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (message: string, ok: boolean) => void;
}) {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (newPw.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message ?? `Đổi mật khẩu thất bại (HTTP ${res.status})`);
      }
      onDone("✓ Đã đổi mật khẩu thành công", true);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đổi mật khẩu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-sm border border-border bg-bg2 px-2.5 py-1.5 text-[12.5px] text-text outline-none transition-colors focus:border-accent";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <KhaiHuongDan ma="doi-mat-khau" uuTien={2} />
      <div
        className="w-full max-w-[340px] rounded border border-border bg-surface p-4 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-bold text-text">Đổi mật khẩu</span>
        </div>
        <div className="space-y-2.5">
          <div>
            <div className="mb-1 text-[11px] font-semibold text-text-secondary">Mật khẩu cũ</div>
            <input
              type="password"
              className={inputClass}
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              autoComplete="current-password"
              autoFocus
            />
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold text-text-secondary">
              Mật khẩu mới (≥ 6 ký tự)
            </div>
            <input
              type="password"
              className={inputClass}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="rounded-sm border border-red/30 bg-red-soft px-2.5 py-1.5 text-[11px] text-red">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border px-3 py-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={saving || oldPw === "" || newPw === ""}
              className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu…" : "Đổi mật khẩu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Màn hẹp (điện thoại, < 640px): menu trái tự thu về cột biểu tượng 56px — để rộng 220px thì thanh trên chỉ còn 180px,
  // tràn ngang 149px (kiểm tra chéo 03/10, lỗi #10). Đổi qua lại mốc 640px thì theo màn; bấm « / » vẫn tự chỉnh được.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    if (mq.matches) setCollapsed(true);
    const doi = (e: MediaQueryListEvent) => setCollapsed(e.matches);
    mq.addEventListener("change", doi);
    return () => mq.removeEventListener("change", doi);
  }, []);
  // Mr. Đại chốt 07/10: vào Việc của tôi → menu trái tự thu gọn (màn rộng gần bằng agent Công việc); rời đi → trả như trước khi vào
  const truocKhiVao = useRef<boolean | null>(null);
  useEffect(() => {
    if (pathname === "/viec-cua-toi") {
      if (truocKhiVao.current === null)
        setCollapsed((c) => {
          truocKhiVao.current = c;
          return true;
        });
    } else if (truocKhiVao.current !== null) {
      setCollapsed(truocKhiVao.current);
      truocKhiVao.current = null;
    }
  }, [pathname]);
  const user = useSessionUser();

  /**
   * Số issue ĐỎ đang mở — đếm từ lần gom gần nhất của màn Cảnh báo (issue thật của
   * các agent hỏi qua cổng). 24/09: thôi đọc /api/canh-bao (sổ issue CHÉP của
   * bộ tính tiến độ trong Main, đã gỡ). Chưa gom lần nào → không hiện huy chương.
   */
  const [soDo, setSoDo] = useState(0);
  useEffect(() => {
    let huy = false;
    fetch("/api/issue-main?chi_dem=1")
      .then((r) => r.json())
      .then((j: { ok?: boolean; soDo?: number | null }) => {
        if (huy || !j.ok) return;
        setSoDo(typeof j.soDo === "number" ? j.soDo : 0);
      })
      .catch(() => {
        /* chưa đăng nhập hoặc chưa có sổ — không hiện huy chương, không báo lỗi */
      });
    return () => {
      huy = true;
    };
  }, [pathname]);

  // Mục ngoài quyền (vd Cài đặt với Người dùng/Người xem — quyen.ts cửa "caidat")
  // KHÔNG ẩn: hiện MỜ, không bấm được, di chuột thấy lý do (luật 17).
  // Chưa load xong user → chưa render nav.
  const dayAgent = useDayAgent();
  const visibleGroups: typeof GROUPS = user
    ? GROUPS.map((g) =>
        g.title !== NHOM_SANG_AGENT
          ? g
          : {
              ...g,
              items: DAY_AGENT.filter((a) => a.ma in BIEU_TUONG_AGENT).map((a) => {
                const dong = dayAgent?.find((x) => x.ma === a.ma);
                const diaChi = dong?.diaChi ?? null;
                if (dong?.khoa) return { href: `#${a.ma}`, label: a.ten, icon: BIEU_TUONG_AGENT[a.ma]!, chuaCo: true, lyDoKhoa: dong.khoa };
                return { href: diaChi ?? `#${a.ma}`, label: a.ten, icon: BIEU_TUONG_AGENT[a.ma]!, ...(diaChi ? {} : { chuaCo: true }) };
              }),
            }
      )
    : [];

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-bg2 transition-all ${collapsed ? "w-14 px-1" : "w-[176px] px-2"} py-3`}
    >
      <div className={`relative mb-2 flex items-center gap-2 border-b border-border pb-3 ${collapsed ? "justify-center px-0" : "px-2"}`}>
        {/* Chữ tắt M = Main. Trước 07/09 còn là "B" — di sản Agent Base. */}
        <div className="flex h-7 w-7 min-w-7 items-center justify-center rounded-[7px] bg-accent text-xs font-extrabold text-white">
          M
        </div>
        {!collapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <div className="text-[13px] font-bold text-accent">{TEN_AGENT}</div>
            <div className="text-[10px] text-text-muted">{MOT_CAU_TA}</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-1 top-0 flex h-[22px] w-[22px] items-center justify-center rounded border border-border bg-surface text-text-muted transition hover:border-accent hover:text-accent"
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
        </button>
      </div>

      {visibleGroups.map((g, gi) => (
        <nav key={g.title || `nhom-${gi}`} className="mb-2">
          {/* Màu sắc lệnh 02/09 (S2): tên nhóm màu DA CAM; mục đang chọn
              chữ TRẮNG nền XÁM (bỏ kiểu cũ chữ cam nền cam nhạt) */}
          {!collapsed && g.title !== "" && (
            <div className="mb-1 px-2.5 text-[9.5px] font-bold uppercase tracking-wider text-accent">
              {g.title}
            </div>
          )}
          {g.items.map((it) => {
            const active = pathname === it.href;
            const Icon = it.icon;
            const raNgoai = it.href.startsWith("http") || it.ngoai === true;
            // Agent chưa có địa chỉ (hoặc đang tải danh bạ) — chữ thuần mờ, không bấm (luật 28)
            if (it.chuaCo) {
              return (
                <span
                  key={it.href}
                  title={`${it.label} — ${it.lyDoKhoa ?? (dayAgent ? CHUA_HOAT_DONG : "đang tải địa chỉ…")}`}
                  data-gt={it.label}
                  className={`flex items-center gap-2 overflow-hidden whitespace-nowrap px-2.5 py-1.5 text-[12px] text-text-muted opacity-60 ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                  {!collapsed && <span className="overflow-hidden text-ellipsis">{it.label}</span>}
                </span>
              );
            }
            // Link sang agent khác (chốt AT) mở tab mới — thẻ <a> thường,
            // không qua router của app này
            if (raNgoai) {
              return (
                <a
                  key={it.href}
                  href={it.href}
                  target="_blank"
                  rel="noreferrer"
                  title={it.label}
                data-gt={it.label}
                  className={`flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[12px] font-medium text-text-secondary transition hover:text-text ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                  {!collapsed && (
                    <span className="overflow-hidden text-ellipsis">{it.label} ↗</span>
                  )}
                </a>
              );
            }
            if (user && !canAccessPath(user.role, it.href)) {
              return (
                <span
                  key={it.href}
                  aria-disabled="true"
                  title={`${it.label} — ${LY_DO_CHAN[cuaCuaTrang(it.href)]}`}
                  data-gt={it.label}
                  className={`flex cursor-not-allowed items-center gap-2 overflow-hidden whitespace-nowrap px-2.5 py-1.5 text-[12px] font-medium text-text-muted opacity-50 ${collapsed ? "justify-center px-2" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                  {!collapsed && <span className="overflow-hidden text-ellipsis">{it.label}</span>}
                </span>
              );
            }
            return (
              <Link
                key={it.href}
                href={it.href}
                title={it.label}
                data-gt={it.label}
                className={`flex items-center gap-2 overflow-hidden whitespace-nowrap rounded-sm px-2.5 py-1.5 text-[12px] font-medium transition ${collapsed ? "justify-center px-2" : ""} ${
                  active
                    ? "bg-white/10 font-semibold text-text"
                    : "text-text-secondary hover:bg-white/5 hover:text-text"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? "text-text" : "text-text-muted"}`} />
                {!collapsed && <span className="overflow-hidden text-ellipsis">{it.label}</span>}
                {(() => {
                  // Mục Issue lấy số từ sổ issue thật; các mục khác dùng badge tĩnh
                  const so = it.href === "/alerts" ? soDo : it.badge;
                  if (collapsed) return null;
                  if (so) {
                    return (
                      <span className="ml-auto rounded-full bg-red px-1.5 py-px text-[9px] font-bold text-black">
                        {so}
                      </span>
                    );
                  }
                  // Chip LÕI theo demo — đánh dấu màn dùng chung cả 5 agent
                  return it.loi ? (
                    <span
                      className="ml-auto rounded-full border border-border bg-bg2 px-1.5 py-px text-[8.5px] font-extrabold text-text-muted"
                      title="Màn lõi — giống nhau ở cả 5 agent"
                    >
                      LÕI
                    </span>
                  ) : null;
                })()}
              </Link>
            );
          })}
        </nav>
      ))}

    </aside>
  );
}
