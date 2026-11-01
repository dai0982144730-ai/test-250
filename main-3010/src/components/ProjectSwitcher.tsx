"use client";

// Nút chọn dự án hiển thị trên MỌI trang (nhúng trong Header):
// - Hiện tên dự án hiện tại; bấm → dropdown danh sách dự án (GET /api/projects).
// - Chọn dự án khác → POST /api/projects/select → reload trang.
// - Cửa "caidat" (PM, Admin): nút "➕ Tạo dự án mới" (người khác thấy mờ kèm lý do) mở modal (tên + ngày khởi công tùy chọn)
//   → POST /api/projects → tự chọn dự án mới → chuyển về /planning.

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FolderKanban, Plus, X } from "lucide-react";
import { useSessionUser } from "@/lib/use-session";
import { TRANG_CHU_MAIN } from "@/lib/nhan-dien-agent";
import { duocCaiDat, LY_DO_CHAN } from "@/lib/quyen";
import ONhapNgay from "@/components/common/ONhapNgay";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface ApiProject {
  id: string;
  name: string;
  projectStart?: string;
  archived?: boolean;
}

interface ProjectsGetResponse {
  projects: ApiProject[];
  current: string;
}

const INPUT_CLASS =
  "w-full min-w-0 rounded-sm border border-border bg-bg2 px-2.5 py-1.5 text-[12.5px] text-text outline-none transition-colors focus:border-accent";

export function ProjectSwitcher() {
  const me = useSessionUser();
  // Tạo dự án = Cài đặt (PM, Admin) — người khác thấy nút MỜ kèm lý do
  const duocTao = duocCaiDat(me?.role);

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  // modal tạo dự án (chỉ pm)
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const loadProjects = useCallback(async () => {
    setListError(null);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error(`API trả HTTP ${res.status}`);
      const json = (await res.json()) as ProjectsGetResponse;
      setProjects(json.projects.filter((p) => p.archived !== true));
      setCurrentId(json.current);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Không tải được danh sách dự án");
    }
  }, []);

  // Tải 1 lần khi mount để nút hiện đúng tên dự án hiện tại
  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ESC: đóng modal trước, sau đó dropdown
  useEffect(() => {
    if (!open && !showCreate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showCreate) setShowCreate(false);
      else setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, showCreate]);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) void loadProjects(); // làm mới danh sách mỗi lần mở
  };

  const selectProject = useCallback(async (id: string): Promise<boolean> => {
    setSwitching(true);
    setListError(null);
    try {
      const res = await fetch("/api/projects/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.message ?? `Không chọn được dự án (HTTP ${res.status})`);
      }
      return true;
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Không chọn được dự án");
      setSwitching(false);
      return false;
    }
  }, []);

  const onPick = async (id: string) => {
    if (id === currentId) {
      setOpen(false);
      return;
    }
    const ok = await selectProject(id);
    if (ok) window.location.reload();
  };

  const submitCreate = async () => {
    if (creating) return;
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          ...(createStart !== "" ? { projectStart: createStart } : {}),
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        project?: ApiProject;
      } | null;
      if (!res.ok || !json?.ok || !json.project) {
        throw new Error(json?.message ?? `Không tạo được dự án (HTTP ${res.status})`);
      }
      // Tự chọn dự án mới rồi về màn chính của Main (Main không có màn Lập
      // tiến độ — 24/09; lập tiến độ cho dự án mới làm ở Agent tiến độ)
      const picked = await selectProject(json.project.id);
      if (!picked) {
        throw new Error("Đã tạo dự án nhưng không chọn được — thử chọn lại từ danh sách.");
      }
      window.location.href = TRANG_CHU_MAIN;
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Không tạo được dự án");
      setCreating(false);
    }
  };

  const current = projects.filter((p) => p.id === currentId)[0];
  const currentName = current ? current.name : currentId ?? "…";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        data-lenh="chung.doi-du-an.mo"
        disabled={switching}
        title="Chọn dự án đang làm việc"
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] text-text-secondary transition-colors hover:border-accent disabled:cursor-wait disabled:opacity-60"
      >
        <FolderKanban className="h-3.5 w-3.5 shrink-0 text-accent" />
        <b className="ten-du-an-gon max-w-[130px] truncate text-text" title={currentName}>{switching ? "Đang chuyển…" : currentName}</b>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-[260px] rounded border border-border bg-surface py-1 shadow-card">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Dự án
          </div>
          {listError && (
            <div className="px-3 py-1.5 text-[11px] text-red">{listError}</div>
          )}
          {!listError && projects.length === 0 && (
            <div className="px-3 py-1.5 text-[11.5px] text-text-muted">Đang tải…</div>
          )}
          <div className="max-h-[260px] overflow-y-auto scroll-thin">
            {projects.map((p) => {
              const active = p.id === currentId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void onPick(p.id)}
                  data-lenh="chung.doi-du-an"
                  data-gia-tri={p.name}
                  disabled={switching}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-bg2 disabled:opacity-60 ${
                    active ? "text-accent" : "text-text"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
          {me && (
            <div className="mt-1 border-t border-border-light pt-1">
              <button
                type="button"
                disabled={!duocTao}
                title={duocTao ? undefined : LY_DO_CHAN.caidat}
                onClick={() => {
                  setOpen(false);
                  setCreateName("");
                  setCreateStart("");
                  setCreateError(null);
                  setShowCreate(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-bold text-accent transition-colors hover:bg-bg2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Tạo dự án mới
              </button>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="w-full max-w-[400px] rounded border border-border bg-surface p-5 shadow-card">
            <KhaiHuongDan ma="tao-du-an" uuTien={2} />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-[14px] font-bold text-text">
                <FolderKanban className="h-4 w-4 text-accent" />
                Tạo dự án mới
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-sm p-1 text-text-muted transition-colors hover:text-text"
                title="Đóng (ESC)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-text-secondary">
                  Tên dự án <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="VD: Điện gió Hướng Phùng 2"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitCreate();
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-text-secondary">
                  Ngày khởi công (tùy chọn)
                </label>
                <ONhapNgay
                  className={INPUT_CLASS}
                  value={createStart}
                  onChange={(v) => setCreateStart(v)}
                />
              </div>
              {createError && <div className="text-[11.5px] text-red">{createError}</div>}
              <p className="text-[10.5px] leading-relaxed text-text-muted">
                Sau khi tạo, hệ thống tự chuyển sang dự án mới và mở màn hình Lập tiến độ.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-sm border border-border px-3 py-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={creating || createName.trim() === ""}
                className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Đang tạo…" : "Tạo dự án"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
