"use client";

// ⭐ 11/09: sau mỗi lần ghi, Main tự ĐẨY sang 4 agent — hiện kết quả một dòng để biết agent nào chưa nhận
function chuDayChoAgent(j: { dayChoAgent?: { ten: string; ok: boolean; tomTat: string }[] } | null | undefined): string {
  const ds = j?.dayChoAgent;
  if (!ds || ds.length === 0) return "";
  const hong = ds.filter((d) => !d.ok);
  return hong.length === 0 ? ` Đã đẩy sang ${ds.length} agent.` : ` Đẩy sang agent: ${ds.length - hong.length}/${ds.length} nhận — ${hong.map((d) => `${d.ten}: ${d.tomTat}`).join("; ")}.`;
}

// Tab Cài đặt → Quản lý dự án (CHỈ PM nhìn thấy — vai trò khác card ẩn hẳn):
// bảng dự án (tên, ngày khởi công, ngày tạo, trạng thái) + đổi tên inline +
// Lưu trữ/Bỏ lưu trữ + Xóa (confirm 2 bước — dữ liệu chuyển vào thùng rác
// data/projects/_trash, không mất vĩnh viễn) + form ➕ Tạo dự án.
// Gọi /api/projects (GET ?all=1 / POST / PATCH / DELETE).

import { useCallback, useEffect, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { SectionCard } from "@/components/common/SectionCard";
import { Pill } from "@/components/common/StatusBadge";
import { useSessionUser } from "@/lib/use-session";
// GD-8: dùng bản dùng chung (dd/mm/yyyy), không giữ hàm ngày riêng ở đây
import { fmtDate } from "@/lib/format";
import { duocCaiDat } from "@/lib/quyen";
import { DonViDuAn, type DonViLuaChon } from "@/components/tabs/settings/DonViDuAn";
import ONhapNgay from "@/components/common/ONhapNgay";

const INPUT_CLASS =
  "w-full min-w-0 rounded-sm border border-border bg-bg2 px-2.5 py-1.5 text-[12.5px] text-text outline-none transition-colors focus:border-accent";

const BTN_SMALL =
  "rounded-sm border border-border px-2 py-1 text-[11px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

const BTN_PRIMARY =
  "rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60";

/** Giai đoạn dự án chọn được (khớp CAC_GIAI_DOAN_DU_AN ở lib/projects.ts — file đó đụng node:fs nên không import vào đây, luật 10) */
const CAC_GIAI_DOAN = ["Chuẩn bị đầu tư", "Đang thi công", "Vận hành"];

interface ApiProject {
  id: string;
  name: string;
  /** Mã ngắn dùng chung cả hệ (HV · TT · BT · N3A) — Mr. Đại chốt 11/09 */
  ma?: string;
  /** Email Giám đốc dự án — CHỈ LÀ DỮ LIỆU (25/09: ký phiếu giá = mọi PM, không theo trường này) */
  giamDoc?: string;
  /** ⭐ 03/10 (LOI-DUNG-CHUNG 6g.6): tên gọi khác trong báo cáo + nhóm cây Dự án */
  tenKhac?: string[];
  nhom?: "sci" | "khac";
  /** 6g.6 Đợt 2 bước E: đơn vị gắn (SCI đầu tư: đầu = Ban QLDA) + Ban điều hành */
  donVi?: string[];
  banDieuHanh?: string;
  /** 13/10: bốn ô Bảng 3 báo cáo tháng */
  congSuat?: string;
  loaiHinh?: string;
  diaDiem?: string;
  giaiDoan?: string;
  projectStart?: string;
  createdAt: string;
  createdBy: string;
  archived?: boolean;
}

interface ProjectsGetResponse {
  projects: ApiProject[];
  current: string;
  donViLuaChon?: DonViLuaChon;
}

/** Ô "tên gọi khác" gõ cách nhau dấu ; (hoặc xuống dòng) → danh sách */
function tachTen(s: string): string[] {
  return s
    .split(/[;\n]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Card quản lý dự án — nằm trong Cài đặt (cửa "caidat": PM, Admin) */
export function ProjectManagement() {
  const me = useSessionUser();

  const [projects, setProjects] = useState<ApiProject[] | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  // form tạo dự án
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createMa, setCreateMa] = useState("");
  const [createGiamDoc, setCreateGiamDoc] = useState("");
  const [createNhom, setCreateNhom] = useState<"" | "sci" | "khac">("");
  const [createTenKhac, setCreateTenKhac] = useState("");

  // đổi tên inline theo id đang mở
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editMa, setEditMa] = useState("");
  const [editGiamDoc, setEditGiamDoc] = useState("");
  const [editNhom, setEditNhom] = useState<"" | "sci" | "khac">("");
  const [editTenKhac, setEditTenKhac] = useState("");
  const [editCongSuat, setEditCongSuat] = useState("");
  const [editLoaiHinh, setEditLoaiHinh] = useState("");
  const [editDiaDiem, setEditDiaDiem] = useState("");
  const [editGiaiDoan, setEditGiaiDoan] = useState("");
  /** Email đã có tài khoản — null = chưa đọc được danh sách người dùng */
  const [emailCoTk, setEmailCoTk] = useState<Set<string> | null>(null);
  const [donViLuaChon, setDonViLuaChon] = useState<DonViLuaChon | null>(null);

  // xóa: confirm 2 bước theo id
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showToast = useCallback((text: string, ok: boolean) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/projects?all=1", { cache: "no-store" });
      if (!res.ok) throw new Error(`API trả HTTP ${res.status}`);
      const json = (await res.json()) as ProjectsGetResponse;
      setProjects(json.projects);
      setCurrentId(json.current);
      setDonViLuaChon(json.donViLuaChon ?? null);
      // ⭐ 11/09: soát email Giám đốc dự án có đúng là một TÀI KHOẢN không — khai email không có
      // tài khoản thì nút ✍ Ký hồ sơ bên hợp đồng KHÔNG BAO GIỜ sáng (nó so email người đăng nhập).
      try {
        const ru = await fetch("/api/users", { cache: "no-store" });
        const ju = (await ru.json()) as { users?: { email: string }[] };
        setEmailCoTk(new Set((ju.users ?? []).map((u) => u.email.toLowerCase())));
      } catch {
        setEmailCoTk(null);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không tải được danh sách dự án");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Gọi API mutation chung — message lỗi tiếng Việt từ server */
  const callApi = useCallback(
    async (input: RequestInfo, init: RequestInit, okText: string) => {
      setBusy(true);
      try {
        const res = await fetch(input, init);
        const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message ?? `Thao tác thất bại (HTTP ${res.status})`);
        }
        showToast(`✓ ${okText}`, true);
        await load();
        return true;
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Thao tác thất bại", false);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load, showToast]
  );

  const submitCreate = async () => {
    const okDone = await callApi(
      "/api/projects",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          ...(createStart !== "" ? { projectStart: createStart } : {}),
          ma: createMa,
          giamDoc: createGiamDoc,
          nhom: createNhom || null,
          tenKhac: tachTen(createTenKhac),
        }),
      },
      `Đã tạo dự án "${createName.trim()}"`
    );
    if (okDone) {
      setCreateName("");
      setCreateStart("");
      setCreateMa("");
      setCreateGiamDoc("");
      setCreateNhom("");
      setCreateTenKhac("");
      setShowCreate(false);
    }
  };

  const submitRename = async (id: string) => {
    const okDone = await callApi(
      "/api/projects",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: editName,
          ma: editMa,
          giamDoc: editGiamDoc,
          nhom: editNhom || null,
          tenKhac: tachTen(editTenKhac),
          congSuat: editCongSuat,
          loaiHinh: editLoaiHinh,
          diaDiem: editDiaDiem,
          giaiDoan: editGiaiDoan,
        }),
      },
      "Đã lưu thông tin dự án"
    );
    if (okDone) setEditId(null);
  };

  /** 6g.6 bước E: chọn đơn vị là lưu ngay */
  const luuDonVi = async (p: ApiProject, donVi: string[], banDieuHanh: string | null) => {
    await callApi(
      "/api/projects",
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, donVi, banDieuHanh }) },
      `Đã lưu đơn vị của dự án "${p.name}"`
    );
  };

  const toggleArchive = async (p: ApiProject) => {
    await callApi(
      "/api/projects",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, archived: p.archived !== true }),
      },
      p.archived === true ? `Đã bỏ lưu trữ "${p.name}"` : `Đã lưu trữ "${p.name}"`
    );
  };

  const confirmDelete = async (p: ApiProject) => {
    const okDone = await callApi(
      `/api/projects?id=${encodeURIComponent(p.id)}`,
      { method: "DELETE" },
      `Đã xóa dự án "${p.name}" — dữ liệu nằm trong data/projects/_trash`
    );
    if (okDone) setDeleteId(null);
  };

  // Card nằm trong Cài đặt — chỉ người qua cửa "caidat" (PM, Admin) mở được màn này
  if (me === null || !duocCaiDat(me.role)) return null;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-1.5">
          <FolderKanban className="h-4 w-4 text-accent" />
          Quản lý dự án
        </span>
      }
      subtitle="Tạo / đổi tên / lưu trữ / xóa dự án — mỗi dự án có tiến độ, báo cáo, dữ liệu riêng"
      actions={
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className={BTN_PRIMARY}
          disabled={busy}
        >
          {showCreate ? "Đóng form" : "+ Tạo dự án"}
        </button>
      }
    >
      <div className="space-y-3">
        {loadError && (
          <div className="rounded-sm border border-red/30 bg-red-soft px-3 py-2 text-[11.5px] text-red">
            Không tải được danh sách dự án: {loadError}
          </div>
        )}

        {showCreate && (
          <div className="space-y-2.5 rounded-sm border border-border-light bg-bg2/40 p-3">
            <div className="text-[12.5px] font-bold text-text">Tạo dự án mới</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Tên dự án (VD: Điện gió Hướng Phùng 2)"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                autoComplete="off"
              />
              <ONhapNgay
                className={INPUT_CLASS}
                title="Ngày khởi công (tùy chọn)"
                value={createStart}
                onChange={(v) => setCreateStart(v)}
              />
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Mã ngắn dùng chung cả hệ (VD: HV, N3A)"
                title="2–6 ký tự chữ/số — khoá nối 5 agent (hợp đồng, pháp lý, tiến độ đều dùng mã này)"
                value={createMa}
                onChange={(e) => setCreateMa(e.target.value.toUpperCase())}
                autoComplete="off"
              />
              <input
                type="email"
                className={INPUT_CLASS}
                placeholder="Email Giám đốc dự án (VD: dai@sci.vn)"
                title="Mỗi dự án một Giám đốc — chỉ người này thấy nút «Ký hồ sơ» bên Agent hợp đồng"
                value={createGiamDoc}
                onChange={(e) => setCreateGiamDoc(e.target.value)}
                autoComplete="off"
              />
              <select
                className={INPUT_CLASS}
                title="Nhóm trên cây Dự án của agent Công việc"
                value={createNhom}
                onChange={(e) => setCreateNhom(e.target.value as "" | "sci" | "khac")}
              >
                <option value="">— Nhóm dự án —</option>
                <option value="sci">SCI đầu tư</option>
                <option value="khac">Loại khác</option>
              </select>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Tên gọi khác trong báo cáo, cách nhau dấu ; (VD: ĐG Hướng Việt; NMĐG Hướng Việt)"
                title="Agent Công việc so tên việc với các tên này để gắn việc vào dự án"
                value={createTenKhac}
                onChange={(e) => setCreateTenKhac(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={busy || createName.trim() === ""}
                className={BTN_PRIMARY}
              >
                <span className="flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {busy ? "Đang tạo…" : "Tạo dự án"}
                </span>
              </button>
              <span className="text-[10.5px] text-text-muted">
                Ngày khởi công chỉ để hiển thị — tiến độ thật lập trong màn hình Lập tiến độ.
              </span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto scroll-thin">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tên dự án · Mã · Nhóm</th>
                <th>Đơn vị</th>
                <th>Công suất · Loại hình</th>
                <th>Địa điểm</th>
                <th>Giai đoạn · Khởi công</th>
                <th>Giám đốc dự án</th>
                <th>Trạng thái · Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {projects === null && !loadError && (
                <tr>
                  <td colSpan={8} className="text-[11.5px] text-text-muted">
                    Đang tải danh sách dự án…
                  </td>
                </tr>
              )}
              {projects?.map((p) => {
                const isDefault = p.id === "default";
                const isCurrent = p.id === currentId;
                const editing = editId === p.id;
                const deleting = deleteId === p.id;
                return (
                  <tr key={p.id}>
                    {/* 25/10/2026 (Mr. Đại): 14 cột → 8 cột. Chỉ dồn cách HIỆN — mọi ô và mọi trường lưu giữ nguyên.
                        Tên dự án + Mã ngắn + Nhóm + Tên gọi khác = một ô; Công suất + Loại hình = một ô; Giai đoạn + Ngày khởi công = một ô; Ngày tạo nằm dưới Trạng thái */}
                    <td className="min-w-[220px]">
                      {editing ? (
                        <input
                          type="text"
                          className={`${INPUT_CLASS} max-w-[240px]`}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void submitRename(p.id);
                            if (e.key === "Escape") setEditId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="font-semibold text-text">
                          {p.name}
                          {isCurrent && (
                            <span className="ml-1.5 text-[10px] font-bold text-accent">(đang chọn)</span>
                          )}
                          {isDefault && (
                            <span className="ml-1.5 text-[10px] text-text-muted">(dự án gốc)</span>
                          )}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {editing ? (
                          <input type="text" className={`${INPUT_CLASS} w-20`} value={editMa} onChange={(e) => setEditMa(e.target.value.toUpperCase())} placeholder="HV" />
                        ) : p.ma ? (
                          <b className="text-accent">{p.ma}</b>
                        ) : (
                          <span className="text-[10.5px] text-red">chưa có mã — 4 agent kia không nối được</span>
                        )}
                        {editing ? (
                          <select className={`${INPUT_CLASS} w-32`} value={editNhom} onChange={(e) => setEditNhom(e.target.value as "" | "sci" | "khac")}>
                            <option value="">—</option>
                            <option value="sci">SCI đầu tư</option>
                            <option value="khac">Loại khác</option>
                          </select>
                        ) : (
                          <span className="text-[11px] text-text-secondary">· {p.nhom === "sci" ? "SCI đầu tư" : p.nhom === "khac" ? "Loại khác" : "—"}</span>
                        )}
                      </div>
                      <div className="mt-1">
                        {editing ? (
                          <input
                            type="text"
                            className={`${INPUT_CLASS} w-64`}
                            value={editTenKhac}
                            onChange={(e) => setEditTenKhac(e.target.value)}
                            placeholder="Tên gọi khác, cách nhau dấu ;"
                            title="Tên gọi khác trong báo cáo, cách nhau dấu ;"
                          />
                        ) : p.tenKhac?.length ? (
                          <span className="text-[11px] text-text-muted" title="Tên gọi khác trong báo cáo">
                            {p.tenKhac.join(" · ")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    {/* «Đơn vị» rộng gấp đôi (220 → 440 px): có ô dài tới ~1.000 ký tự */}
                    <td className="min-w-[440px]">
                      {isDefault ? (
                        <span className="text-[11px] text-text-muted">—</span>
                      ) : (
                        <DonViDuAn
                          nhom={p.nhom}
                          donVi={p.donVi}
                          banDieuHanh={p.banDieuHanh}
                          luaChon={donViLuaChon}
                          ban={busy || editing}
                          luu={(dv, bdh) => void luuDonVi(p, dv, bdh)}
                        />
                      )}
                    </td>
                    {/* 13/10: bốn ô Bảng 3 báo cáo tháng (Công suất · Loại hình · Địa điểm · Giai đoạn) */}
                    <td className="min-w-[130px]">
                      <div>
                        {editing ? (
                          <input type="text" className={`${INPUT_CLASS} w-28`} value={editCongSuat} onChange={(e) => setEditCongSuat(e.target.value)} placeholder="48 MW" />
                        ) : (
                          <span className="text-text-secondary">{p.congSuat ?? "—"}</span>
                        )}
                      </div>
                      <div className="mt-1">
                        {editing ? (
                          <input type="text" className={`${INPUT_CLASS} w-28`} value={editLoaiHinh} onChange={(e) => setEditLoaiHinh(e.target.value)} placeholder="Điện gió" />
                        ) : (
                          <span className="text-[11px] text-text-muted">{p.loaiHinh ?? "—"}</span>
                        )}
                      </div>
                    </td>
                    <td className="min-w-[140px]">
                      {editing ? (
                        <input type="text" className={`${INPUT_CLASS} w-40`} value={editDiaDiem} onChange={(e) => setEditDiaDiem(e.target.value)} placeholder="Hướng Hoá, Quảng Trị" />
                      ) : (
                        <span className="text-text-secondary">{p.diaDiem ?? "—"}</span>
                      )}
                    </td>
                    <td className="min-w-[140px]">
                      <div className="whitespace-nowrap">
                        {editing ? (
                          <select className={`${INPUT_CLASS} w-36`} value={editGiaiDoan} onChange={(e) => setEditGiaiDoan(e.target.value)}>
                            <option value="">—</option>
                            {CAC_GIAI_DOAN.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-text-secondary">{p.giaiDoan ?? "—"}</span>
                        )}
                      </div>
                      <div className="mt-1 whitespace-nowrap text-[11px] text-text-muted" title="Ngày khởi công">
                        {p.projectStart ? `Khởi công ${fmtDate(p.projectStart)}` : "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {editing ? (
                        <input type="email" className={`${INPUT_CLASS} w-44`} value={editGiamDoc} onChange={(e) => setEditGiamDoc(e.target.value)} placeholder="dai@sci.vn" />
                      ) : (
                        <span className="text-text-secondary">
                          {p.giamDoc ?? "—"}
                          {p.giamDoc && emailCoTk && !emailCoTk.has(p.giamDoc.toLowerCase()) && (
                            <span className="block text-[10.5px] font-semibold text-red" title="Sửa email cho khớp một tài khoản, hoặc tạo tài khoản này ở 👥 Người dùng">
                              ⚠ chưa có tài khoản — nút ✍ Ký hồ sơ sẽ không sáng
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.archived === true ? (
                        <Pill tone="muted">Đã lưu trữ</Pill>
                      ) : (
                        <Pill tone="green">Hoạt động</Pill>
                      )}
                      <div className="mt-1 whitespace-nowrap text-[11px] text-text-muted" title="Ngày tạo dự án">
                        Tạo {fmtDate(p.createdAt?.slice(0, 10))}
                      </div>
                    </td>
                    <td>
                      {deleting ? (
                        <div className="max-w-[340px] space-y-1.5 rounded-sm border border-red/30 bg-red-soft p-2">
                          <div className="text-[11px] leading-relaxed text-red">
                            Xóa dự án <b>&quot;{p.name}&quot;</b>? Dữ liệu được chuyển vào thùng rác{" "}
                            <code>data/projects/_trash</code> — không mất vĩnh viễn.
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="rounded-sm border border-red/50 bg-red-soft px-2 py-1 text-[11px] font-bold text-red transition-colors hover:border-red disabled:opacity-50"
                              disabled={busy}
                              onClick={() => void confirmDelete(p)}
                            >
                              Xác nhận xóa
                            </button>
                            <button
                              type="button"
                              className={BTN_SMALL}
                              onClick={() => setDeleteId(null)}
                            >
                              Hủy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className={BTN_PRIMARY}
                                disabled={busy || editName.trim() === ""}
                                onClick={() => void submitRename(p.id)}
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                onClick={() => setEditId(null)}
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                disabled={busy}
                                onClick={() => {
                                  setDeleteId(null);
                                  setEditId(p.id);
                                  setEditName(p.name);
                                  setEditMa(p.ma ?? "");
                                  setEditGiamDoc(p.giamDoc ?? "");
                                  setEditNhom(p.nhom ?? "");
                                  setEditTenKhac((p.tenKhac ?? []).join("; "));
                                  setEditCongSuat(p.congSuat ?? "");
                                  setEditLoaiHinh(p.loaiHinh ?? "");
                                  setEditDiaDiem(p.diaDiem ?? "");
                                  setEditGiaiDoan(p.giaiDoan ?? "");
                                }}
                              >
                                Đổi tên
                              </button>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                disabled={busy || isDefault}
                                title={isDefault ? "Không thể lưu trữ dự án gốc" : undefined}
                                onClick={() => void toggleArchive(p)}
                              >
                                {p.archived === true ? "Bỏ lưu trữ" : "Lưu trữ"}
                              </button>
                              <button
                                type="button"
                                className={`${BTN_SMALL} hover:border-red hover:text-red`}
                                disabled={busy || isDefault}
                                title={isDefault ? "Không thể xóa dự án gốc" : undefined}
                                onClick={() => {
                                  setEditId(null);
                                  setDeleteId(p.id);
                                }}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[10.5px] text-text-muted">
          Dự án gốc dùng nguyên thư mục <code>data/</code> hiện tại; dự án mới lưu tại{" "}
          <code>data/projects/&lt;id&gt;/</code>. Xóa dự án chỉ chuyển dữ liệu vào thùng rác{" "}
          <code>data/projects/_trash</code>, không mất vĩnh viễn.
        </p>
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded border bg-surface px-4 py-2.5 text-[12.5px] font-semibold shadow-card ${
            toast.ok ? "border-green/30 text-green" : "border-red/30 text-red"
          }`}
        >
          {toast.text}
        </div>
      )}
    </SectionCard>
  );
}
