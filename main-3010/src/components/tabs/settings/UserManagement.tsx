"use client";

// ⭐ 11/09: sau mỗi lần ghi, Main tự ĐẨY sang 4 agent — hiện kết quả một dòng để biết agent nào chưa nhận
function chuDayChoAgent(j: { dayChoAgent?: { ten: string; ok: boolean; tomTat: string }[] } | null | undefined): string {
  const ds = j?.dayChoAgent;
  if (!ds || ds.length === 0) return "";
  const hong = ds.filter((d) => !d.ok);
  return hong.length === 0 ? ` Đã đẩy sang ${ds.length} agent.` : ` Đẩy sang agent: ${ds.length - hong.length}/${ds.length} nhận — ${hong.map((d) => `${d.ten}: ${d.tomTat}`).join("; ")}.`;
}

// Tab Cài đặt → Người dùng & phân quyền: quản lý user thật qua /api/users
// (store server-side data/users.json). Quyền theo src/lib/quyen.ts (Mr. Đại chốt
// 25/09): CHỈ Admin thêm/sửa/khoá/reset/xoá (mọi loại, kể cả PM); PM thấy danh
// sách với nút MỜ kèm lý do (luật 17). Ma trận quyền bên dưới vẽ THẲNG từ
// MA_TRAN_QUYEN — không chép tay bảng thứ hai (luật 7).

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import { Pill, type Tone } from "@/components/common/StatusBadge";
import {
  CAC_CUA,
  CAC_LOAI,
  LY_DO_CHAN,
  BANG_QUYEN_THEO_AGENT,
  MA_TRAN_QUYEN,
  NHAN_CUA,
  NHAN_LOAI,
  CAU_CHAN_NHA_THAU,
  duocQuanLyNguoiDung,
  laNhaThau,
  luonMoiDuAn,
  type Role,
} from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";
import { KeoSoDoToChuc } from "@/components/tabs/settings/KeoSoDoToChuc";
import { KhoaDanhSachDangNhap } from "@/components/tabs/settings/KhoaDanhSachDangNhap";

const INPUT_CLASS =
  "w-full min-w-0 rounded-sm border border-border bg-bg2 px-2.5 py-1.5 text-[12.5px] text-text outline-none transition-colors focus:border-accent";

const BTN_SMALL =
  "rounded-sm border border-border px-2 py-1 text-[11px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";

const BTN_PRIMARY =
  "rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60";

// ===== kiểu dữ liệu khớp /api/users =====

interface ApiUser {
  email: string;
  name: string;
  role: Role;
  active: boolean;
  createdAt: string;
  /** Dự án được truy cập — không có/rỗng = mọi dự án; pm luôn mọi dự án */
  projectIds?: string[];
  /** 25/09 — id chat Telegram đã nối (hỏi trợ lý Main qua bot); không có = chưa nối */
  telegramChatId?: string;
  /** 6g.6.13 — loại tính theo sơ đồ tổ chức (không phải PM/Admin, Main đã có tổ chức) */
  theoSoDo?: true;
  /** 18/10/2026 — đơn vị của tài khoản Nhà thầu (mã NT- / TP- trong sổ agent Tiến độ) */
  nhaThau?: DonVi;
}

interface DonVi {
  ma: string;
  ten: string;
}

interface UsersGetResponse {
  ok: boolean;
  users?: ApiUser[];
  /** 6g.6.13 — Main đã có tổ chức: loại (trừ PM/Admin) + dự án được vào đi theo sơ đồ */
  theoSoDo?: boolean;
  message?: string;
}

// ===== danh sách dự án (GET /api/projects) — cho phần "Dự án được truy cập" =====

interface ApiProject {
  id: string;
  name: string;
  archived?: boolean;
}

const ROLE_TONE: Record<Role, Tone> = {
  pm: "accent",
  admin: "accent",
  engineer: "blue",
  viewer: "muted",
  nhathau: "muted",
};

// ===== ma trận quyền — vẽ từ MA_TRAN_QUYEN (quyen.ts), một định nghĩa =====

function Yes() {
  return <span className="text-[14px] font-bold text-green">✓</span>;
}
function No() {
  return <span className="text-[14px] text-text-muted opacity-60">✗</span>;
}

/** ⭐ 25/09 — bảng quyền Mr. Đại chốt: 4 loại × 5 cửa. */
function RoleMatrix() {
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="tbl">
        <thead>
          <tr>
            <th>Loại tài khoản</th>
            {CAC_CUA.map((c) => (
              <th key={c}>{NHAN_CUA[c]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAC_LOAI.map((loai) => (
            <tr key={loai}>
              <td><b className="text-text">{NHAN_LOAI[loai]}</b></td>
              {CAC_CUA.map((c) => (
                <td key={c}>{MA_TRAN_QUYEN[c].includes(loai) ? <Yes /> : <No />}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[11px] text-text-muted">
        Phê duyệt = ✍ ký phiếu giá thanh toán ở Agent hợp đồng — chỉ PM (PM nào cũng ký được mọi dự án).
        Các loại duyệt khác (Baseline, tab 🤖, căn cứ, mốc, đơn giá…): Người dùng trở lên.
        Cài đặt gồm cả kết nối Drive/AI, ma trận gọi, dự án. Quản lý người dùng: chỉ Admin — sửa được mọi loại kể cả PM,
        nhưng không tự khoá / tự đổi loại / tự xoá chính mình.
      </p>

      {/* ⭐ Mr. Đại chốt 04/10/2026 tối — quyền theo từng agent (quyen.ts BANG_QUYEN_THEO_AGENT, một định nghĩa) */}
      <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-text-muted">Theo từng agent</div>
      <table className="tbl mt-1">
        <thead>
          <tr>
            <th>Agent</th>
            <th>{NHAN_LOAI.viewer}</th>
            <th>{NHAN_LOAI.engineer}</th>
          </tr>
        </thead>
        <tbody>
          {BANG_QUYEN_THEO_AGENT.map((d) => (
            <tr key={d.agent}>
              <td><b className="text-text">{d.agent}</b></td>
              <td className="min-w-[200px]">{d.nguoiXem}</td>
              <td className="min-w-[240px]">{d.nguoiDung}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1.5 text-[11px] text-text-muted">
        PM · Admin: mọi dự án ở mọi agent (ở Quan sát chỉ PM, Admin bấm được nút). Loại ở Tiến độ · Hợp đồng · Pháp lý tính theo
        TỪNG dự án: thuộc dự án (đơn vị chính / kiêm nhiệm gắn với dự án, hoặc cấp trên của đơn vị đó; lãnh đạo thuộc mọi dự án)
        = {NHAN_LOAI.engineer} ở dự án đó. Không thuộc dự án nào = {NHAN_LOAI.viewer}. Main tính theo chức vụ: lãnh đạo + trưởng
        đơn vị = {NHAN_LOAI.engineer}. Cần vào dự án nào thì gắn người vào đơn vị của dự án ở sơ đồ tổ chức (agent Công việc).
      </p>
      <p className="mt-1.5 text-[11px] text-text-muted">
        <b className="text-text-secondary">{NHAN_LOAI.nhathau}</b> (18/10/2026): người của một nhà thầu chính hoặc thầu phụ, chỉ những
        dự án được chọn. {CAU_CHAN_NHA_THAU} Ở Tiến độ: xem như {NHAN_LOAI.viewer} (không giá tiền, hợp đồng, trợ lý AI). Ở Nghiệm thu:
        lập, sửa, nộp biên bản của chính đơn vị mình; không ký, không trả lại, không duyệt.
      </p>
    </div>
  );
}

// ===== form thêm user =====

interface CreateForm {
  email: string;
  name: string;
  role: Role;
  password: string;
  /** [] = tất cả dự án */
  projectIds: string[];
  /** Chỉ loại Nhà thầu */
  nhaThau: DonVi | null;
}

const EMPTY_CREATE: CreateForm = { email: "", name: "", role: "viewer", password: "", projectIds: [], nhaThau: null };

/** Danh sách đơn vị — hỏi agent Tiến độ một lần cho cả màn */
let hoiDonVi: Promise<{ donVi: (DonVi & { ghiChu: string })[]; loi: string | null }> | null = null;
function layDonVi() {
  hoiDonVi ??= fetch("/api/users/don-vi-nha-thau", { cache: "no-store" })
    .then((r) => r.json())
    .then((j: { ok: boolean; donVi?: (DonVi & { ghiChu: string })[]; message?: string }) =>
      j.ok ? { donVi: j.donVi ?? [], loi: null } : { donVi: [], loi: j.message ?? "Không lấy được danh sách đơn vị." },
    )
    .catch(() => ({ donVi: [], loi: "Không gọi được máy chủ." }));
  return hoiDonVi;
}

/** Ô chọn đơn vị cho tài khoản Nhà thầu — một đơn vị, chọn là xong (quy tắc bớt cú bấm) */
function ChonDonViNhaThau({ value, onChange, disabled }: { value: DonVi | null; onChange: (v: DonVi | null) => void; disabled?: boolean }) {
  const [ds, setDs] = useState<(DonVi & { ghiChu: string })[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    let huy = false;
    void layDonVi().then((k) => {
      if (huy) return;
      setDs(k.donVi);
      setLoi(k.loi);
      if (k.loi) hoiDonVi = null; // lần sau hỏi lại
    });
    return () => {
      huy = true;
    };
  }, []);
  if (loi) return <div className="text-[11px] text-yellow">{loi}</div>;
  if (!ds) return <div className="text-[11px] text-text-muted">Đang lấy sổ nhà thầu từ agent Tiến độ…</div>;
  const coTrongDs = !value || ds.some((d) => d.ma === value.ma);
  return (
    <select
      className={INPUT_CLASS}
      value={value?.ma ?? ""}
      disabled={disabled}
      onChange={(e) => {
        const d = ds.find((x) => x.ma === e.target.value);
        onChange(d ? { ma: d.ma, ten: d.ten } : null);
      }}
    >
      <option value="">— Chọn đơn vị (nhà thầu / thầu phụ) —</option>
      {!coTrongDs && value && <option value={value.ma}>{value.ma} {value.ten} (không còn trong sổ)</option>}
      {ds.map((d) => (
        <option key={d.ma} value={d.ma}>
          {d.ma} {d.ten} — {d.ghiChu}
        </option>
      ))}
    </select>
  );
}

/**
 * Bộ chọn "Dự án được truy cập": checkbox "Tất cả dự án" (= mảng rỗng) hoặc
 * tick từng dự án. Vai trò pm luôn "Tất cả" và bị khóa.
 */
function ProjectAccessPicker({
  role,
  value,
  onChange,
  projects,
  disabled,
  theoSoDo,
}: {
  role: Role;
  value: string[];
  onChange: (next: string[]) => void;
  projects: ApiProject[];
  disabled?: boolean;
  theoSoDo?: boolean;
}) {
  if (theoSoDo && !luonMoiDuAn(role) && !laNhaThau(role)) {
    return (
      <div className="text-[11px] text-text-muted">
        <b className="text-text-secondary">Theo sơ đồ tổ chức</b> — thuộc dự án là Người dùng, không thuộc là Người xem; người chỉ thuộc nhà máy chỉ thấy dự án mình thuộc.
      </div>
    );
  }
  if (luonMoiDuAn(role)) {
    return (
      <div className="text-[11px] text-text-muted">
        {NHAN_LOAI[role]} luôn truy cập <b className="text-text-secondary">tất cả dự án</b> (không giới hạn được).
      </div>
    );
  }
  const allChecked = value.length === 0;
  const toggle = (id: string) => {
    if (value.indexOf(id) >= 0) onChange(value.filter((x) => x !== id));
    else onChange(value.concat([id]));
  };
  const nhaThau = laNhaThau(role);
  return (
    <div className="space-y-1">
      {nhaThau ? (
        <div className={`text-[11px] ${allChecked ? "text-yellow" : "text-text-muted"}`}>Nhà thầu: chọn ít nhất một dự án.</div>
      ) : (
        <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-text">
          <input
            type="checkbox"
            className="accent-[#C2724F]"
            checked={allChecked}
            disabled={disabled}
            onChange={() => onChange([])}
          />
          <b>Tất cả dự án</b>
        </label>
      )}
      {projects.length > 0 && (
        <div className={`max-h-[120px] space-y-0.5 overflow-y-auto scroll-thin ${nhaThau ? "" : "pl-4"}`}>
          {projects.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-1.5 text-[11.5px] text-text-secondary"
            >
              <input
                type="checkbox"
                className="accent-[#C2724F]"
                checked={value.indexOf(p.id) >= 0}
                disabled={disabled}
                onChange={() => toggle(p.id)}
              />
              <span className="truncate">{p.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/** Quản lý người dùng thật (data/users.json) + ma trận quyền 4 loại × 5 cửa */
export function UserManagement() {
  const me = useSessionUser();

  const [users, setUsers] = useState<ApiUser[] | null>(null);
  const [theoSoDo, setTheoSoDo] = useState(false);
  /** 6g.6.13: đã có tổ chức thì Người dùng / Người xem gộp thành MỘT lựa chọn "Theo sơ đồ tổ chức" (giá trị engineer) */
  const cacLoaiChon: { ma: Role; nhan: string }[] = theoSoDo
    ? [
        { ma: "pm", nhan: NHAN_LOAI.pm },
        { ma: "admin", nhan: NHAN_LOAI.admin },
        { ma: "engineer", nhan: "Theo sơ đồ tổ chức" },
        { ma: "nhathau", nhan: NHAN_LOAI.nhathau },
      ]
    : CAC_LOAI.map((l) => ({ ma: l, nhan: NHAN_LOAI[l] }));
  const giaTriChon = (r: Role): Role => (theoSoDo && !luonMoiDuAn(r) && !laNhaThau(r) ? "engineer" : r);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  // form thêm user
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);

  // sửa inline theo email đang mở
  const [editEmail, setEditEmail] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  // Đổi email (04/10): ô email mở khi bấm Sửa — đổi thì giữ mã người, mật khẩu = email mới (lib/doi-email.ts)
  const [editEmailMoi, setEditEmailMoi] = useState("");
  const [editRole, setEditRole] = useState<Role>("viewer");
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]); // [] = tất cả
  const [editNhaThau, setEditNhaThau] = useState<DonVi | null>(null);

  // danh sách dự án (đang hoạt động) cho phần "Dự án được truy cập"
  const [projects, setProjects] = useState<ApiProject[]>([]);

  // reset mật khẩu theo email đang mở
  const [resetEmail, setResetEmail] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState("");

  const showToast = useCallback((text: string, ok: boolean) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/users", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        setUsers(null);
        return;
      }
      if (!res.ok) throw new Error(`API trả HTTP ${res.status}`);
      const json = (await res.json()) as UsersGetResponse;
      if (!json.ok || !json.users) throw new Error(json.message ?? "Response không hợp lệ");
      setForbidden(false);
      setUsers(json.users);
      setTheoSoDo(json.theoSoDo === true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Không đọc được danh sách người dùng");
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // Danh sách dự án — mọi role đọc được GET /api/projects; lỗi thì bỏ qua
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { projects?: ApiProject[] } | null) => {
        if (!cancelled && json && Array.isArray(json.projects)) {
          setProjects(json.projects.filter((p) => p.archived !== true));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /** Tên dự án theo id (id không còn trong danh sách → hiện luôn id) */
  const projectName = useCallback(
    (id: string) => {
      const found = projects.filter((p) => p.id === id)[0];
      return found ? found.name : id;
    },
    [projects],
  );

  /** Gọi API mutation chung: trả message lỗi (nếu có) từ server tiếng Việt */
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
        await loadUsers();
        return true;
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Thao tác thất bại", false);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loadUsers, showToast],
  );

  const submitCreate = async () => {
    const okDone = await callApi(
      "/api/users",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      },
      `Đã thêm người dùng ${createForm.email.trim().toLowerCase()}`,
    );
    if (okDone) {
      setCreateForm(EMPTY_CREATE);
      setShowCreate(false);
    }
  };

  const submitEdit = async (email: string) => {
    const moi = editEmailMoi.trim().toLowerCase();
    const doiEmail = moi !== "" && moi !== email;
    const okDone = await callApi(
      "/api/users",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: editName,
          role: editRole,
          projectIds: luonMoiDuAn(editRole) ? [] : editProjectIds,
          nhaThau: laNhaThau(editRole) ? editNhaThau : null,
          ...(doiEmail ? { emailMoi: moi } : {}),
        }),
      },
      doiEmail ? `Đã đổi email ${email} → ${moi} — mật khẩu đăng nhập nay là email mới` : `Đã cập nhật ${email}`,
    );
    if (okDone) setEditEmail(null);
  };

  const toggleActive = async (u: ApiUser) => {
    await callApi(
      "/api/users",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, active: !u.active }),
      },
      u.active ? `Đã khóa ${u.email}` : `Đã mở khóa ${u.email}`,
    );
  };

  const submitReset = async (email: string) => {
    const okDone = await callApi(
      "/api/users",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: resetPw }),
      },
      `Đã đặt lại mật khẩu cho ${email}`,
    );
    if (okDone) {
      setResetEmail(null);
      setResetPw("");
    }
  };

  const removeUser = async (u: ApiUser) => {
    if (!window.confirm(`Xóa người dùng "${u.name}" (${u.email})? Hành động không thể hoàn tác.`)) {
      return;
    }
    await callApi(
      `/api/users?email=${encodeURIComponent(u.email)}`,
      { method: "DELETE" },
      `Đã xóa ${u.email}`,
    );
  };

  // Chỉ Admin quản lý người dùng; PM (qua cửa Cài đặt) xem danh sách với nút MỜ kèm lý do
  const laQuanTri = duocQuanLyNguoiDung(me?.role);
  const lyDoMo = laQuanTri ? undefined : LY_DO_CHAN.quanlynguoidung;

  return (
    <SectionCard
      title="Người dùng & phân quyền"
      subtitle="Tài khoản đăng nhập hệ thống + ma trận quyền theo loại tài khoản"
      actions={
        !forbidden ? (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className={BTN_PRIMARY}
            disabled={busy || !laQuanTri}
            title={lyDoMo}
          >
            {showCreate ? "Đóng form" : "+ Thêm người dùng"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {(!laQuanTri || forbidden) && (
          <p className="text-[11.5px] text-text-muted">
            Chỉ <b className="text-text-secondary">Admin</b> quản lý người dùng (thêm/sửa/khoá/xoá mọi loại, kể cả PM).
            {!forbidden && " Bạn xem được danh sách — các nút thao tác hiện mờ."}
          </p>
        )}

        {loadError && !forbidden && (
          <div className="rounded-sm border border-red/30 bg-red-soft px-3 py-2 text-[11.5px] text-red">
            Không tải được danh sách người dùng: {loadError}
          </div>
        )}

        {/* 12/10 — câu 9: sơ đồ tổ chức tự kéo từ agent Công việc mỗi 30 phút + nút kéo ngay + tạo tài khoản người mới */}
        {/* 25/10 — công tắc hiện danh sách tài khoản ở màn đăng nhập (giai đoạn test) cho cả hệ agent */}
        {!forbidden && <KhoaDanhSachDangNhap laQuanTri={laQuanTri} lyDoMo={lyDoMo} showToast={showToast} />}

        {!forbidden && <KeoSoDoToChuc laQuanTri={laQuanTri} lyDoMo={lyDoMo} onDoi={() => void loadUsers()} showToast={showToast} />}

        {laQuanTri && !forbidden && showCreate && (
          <div className="space-y-2.5 rounded-sm border border-border-light bg-bg2/40 p-3">
            <div className="text-[12.5px] font-bold text-text">Thêm người dùng mới</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="email"
                className={INPUT_CLASS}
                placeholder="Email (vd: ten@sci.vn)"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="off"
              />
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Tên hiển thị"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="off"
              />
              <select
                className={INPUT_CLASS}
                value={giaTriChon(createForm.role)}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as Role }))}
              >
                {cacLoaiChon.map((l) => (
                  <option key={l.ma} value={l.ma}>{l.nhan}</option>
                ))}
              </select>
              <input
                type="password"
                className={INPUT_CLASS}
                placeholder="Mật khẩu tạm (≥ 6 ký tự) — để trống = email"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
              {laNhaThau(createForm.role) && (
                <div className="md:col-span-2">
                  <ChonDonViNhaThau value={createForm.nhaThau} onChange={(v) => setCreateForm((f) => ({ ...f, nhaThau: v }))} disabled={busy} />
                </div>
              )}
            </div>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Dự án được truy cập
              </div>
              <ProjectAccessPicker
                role={createForm.role}
                value={createForm.projectIds}
                onChange={(next) => setCreateForm((f) => ({ ...f, projectIds: next }))}
                projects={projects}
                disabled={busy}
                theoSoDo={theoSoDo}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={busy}
                className={BTN_PRIMARY}
              >
                {busy ? "Đang lưu…" : "Tạo tài khoản"}
              </button>
              <span className="text-[10.5px] text-text-muted">
                Người dùng mới nên tự đổi mật khẩu sau lần đăng nhập đầu (nút chìa khóa ở Sidebar).
              </span>
            </div>
          </div>
        )}

        {!forbidden && (
          <div className="overflow-x-auto scroll-thin">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Tên</th>
                  <th>Vai trò</th>
                  <th>Dự án được truy cập</th>
                  <th>Trạng thái</th>
                  <th>Telegram</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users === null && !loadError && (
                  <tr>
                    <td colSpan={7} className="text-[11.5px] text-text-muted">
                      Đang tải danh sách người dùng…
                    </td>
                  </tr>
                )}
                {users?.map((u) => {
                  const isSelf = me?.email === u.email;
                  const editing = editEmail === u.email;
                  const resetting = resetEmail === u.email;
                  return (
                    <tr key={u.email}>
                      <td className="whitespace-nowrap">
                        {editing ? (
                          <>
                            <input
                              type="email"
                              className={`${INPUT_CLASS} max-w-[230px]`}
                              value={editEmailMoi}
                              onChange={(e) => setEditEmailMoi(e.target.value)}
                              aria-label="Email đăng nhập"
                            />
                            {editEmailMoi.trim().toLowerCase() !== u.email && editEmailMoi.trim() !== "" && (
                              <div className="mt-0.5 max-w-[230px] whitespace-normal text-[10.5px] text-text-muted">
                                Đổi email: giữ nguyên người này ở mọi agent, mật khẩu đặt lại = email mới.
                              </div>
                            )}
                          </>
                        ) : (
                          u.email
                        )}
                        {isSelf && (
                          <span className="ml-1.5 text-[10px] font-bold text-accent">(bạn)</span>
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <input
                            type="text"
                            className={`${INPUT_CLASS} max-w-[200px]`}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                          />
                        ) : (
                          u.name
                        )}
                      </td>
                      <td>
                        {editing ? (
                          <select
                            className={`${INPUT_CLASS} max-w-[160px]`}
                            value={giaTriChon(editRole)}
                            onChange={(e) => setEditRole(e.target.value as Role)}
                            disabled={isSelf}
                            title={isSelf ? "Admin không tự đổi loại chính mình (chống mất quản trị)" : undefined}
                          >
                            {cacLoaiChon.map((l) => (
                              <option key={l.ma} value={l.ma}>{l.nhan}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <Pill tone={ROLE_TONE[u.role]}>{NHAN_LOAI[u.role]}</Pill>
                            {u.theoSoDo && <div className="mt-0.5 text-[10.5px] text-text-muted">theo sơ đồ</div>}
                            {u.nhaThau && (
                              <div className="mt-0.5 max-w-[220px] text-[10.5px] text-text-secondary">
                                {u.nhaThau.ma} {u.nhaThau.ten}
                              </div>
                            )}
                          </>
                        )}
                        {editing && laNhaThau(editRole) && (
                          <div className="mt-1 max-w-[260px]">
                            <ChonDonViNhaThau value={editNhaThau} onChange={setEditNhaThau} disabled={busy} />
                          </div>
                        )}
                      </td>
                      <td className="min-w-[170px] align-top">
                        {editing ? (
                          <ProjectAccessPicker
                            role={editRole}
                            value={editProjectIds}
                            onChange={setEditProjectIds}
                            projects={projects}
                            disabled={busy}
                            theoSoDo={theoSoDo}
                          />
                        ) : u.theoSoDo ? (
                          <span className="text-[11.5px] text-text-secondary">Theo sơ đồ tổ chức</span>
                        ) : luonMoiDuAn(u.role) ? (
                          <span className="text-[11.5px] text-text-muted">Tất cả ({NHAN_LOAI[u.role]})</span>
                        ) : !u.projectIds || u.projectIds.length === 0 ? (
                          <span className="text-[11.5px] text-text-secondary">Tất cả dự án</span>
                        ) : (
                          <div className="flex max-w-[220px] flex-wrap gap-1">
                            {u.projectIds.map((id) => (
                              <Pill key={id} tone="muted">{projectName(id)}</Pill>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        {u.active ? (
                          <Pill tone="green">Hoạt động</Pill>
                        ) : (
                          <Pill tone="red">Khóa</Pill>
                        )}
                      </td>
                      {/* 25/09 — chữ thuần (luật 28); nút gỡ chỉ Admin (cửa quanlynguoidung) */}
                      <td className="whitespace-nowrap text-[11.5px]">
                        {u.telegramChatId ? (
                          <>
                            <span className="font-semibold text-green">đã nối</span>
                            <button
                              type="button"
                              className={`${BTN_SMALL} ml-1.5`}
                              disabled={busy || !laQuanTri}
                              title={lyDoMo ?? "Gỡ nối — chat Telegram này không hỏi trợ lý được nữa cho tới khi nối lại"}
                              onClick={() =>
                                void callApi(
                                  `/api/telegram-tro-ly/noi?email=${encodeURIComponent(u.email)}`,
                                  { method: "DELETE" },
                                  `Đã gỡ nối Telegram của ${u.email}`,
                                )
                              }
                            >
                              Gỡ nối
                            </button>
                          </>
                        ) : (
                          <span className="text-text-muted">chưa nối</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className={BTN_PRIMARY}
                                disabled={busy}
                                onClick={() => void submitEdit(u.email)}
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                onClick={() => setEditEmail(null)}
                              >
                                Hủy
                              </button>
                            </>
                          ) : resetting ? (
                            <>
                              <input
                                type="password"
                                className={`${INPUT_CLASS} max-w-[170px]`}
                                placeholder="Mật khẩu mới (≥ 6)"
                                value={resetPw}
                                onChange={(e) => setResetPw(e.target.value)}
                                autoComplete="new-password"
                              />
                              <button
                                type="button"
                                className={BTN_PRIMARY}
                                disabled={busy || resetPw.length < 6}
                                onClick={() => void submitReset(u.email)}
                              >
                                Đặt lại
                              </button>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                onClick={() => {
                                  setResetEmail(null);
                                  setResetPw("");
                                }}
                              >
                                Hủy
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                disabled={busy || !laQuanTri}
                                title={lyDoMo}
                                onClick={() => {
                                  setResetEmail(null);
                                  setEditEmail(u.email);
                                  setEditEmailMoi(u.email);
                                  setEditName(u.name);
                                  setEditRole(u.role);
                                  setEditProjectIds(u.projectIds ?? []);
                                  setEditNhaThau(u.nhaThau ?? null);
                                }}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                disabled={busy || isSelf || !laQuanTri}
                                title={lyDoMo ?? (isSelf ? "Không thể tự khóa tài khoản đang đăng nhập" : undefined)}
                                onClick={() => void toggleActive(u)}
                              >
                                {u.active ? "Khóa" : "Mở khóa"}
                              </button>
                              <button
                                type="button"
                                className={BTN_SMALL}
                                disabled={busy || !laQuanTri}
                                title={lyDoMo}
                                onClick={() => {
                                  setEditEmail(null);
                                  setResetEmail(u.email);
                                  setResetPw("");
                                }}
                              >
                                Reset mật khẩu
                              </button>
                              <button
                                type="button"
                                className={`${BTN_SMALL} hover:border-red hover:text-red`}
                                disabled={busy || isSelf || !laQuanTri}
                                title={lyDoMo ?? (isSelf ? "Không thể tự xóa tài khoản đang đăng nhập" : undefined)}
                                onClick={() => void removeUser(u)}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Ma trận quyền theo vai trò
          </div>
          <RoleMatrix />
        </div>
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
