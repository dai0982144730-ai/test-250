"use client";

// Màn đăng nhập CHUNG của cả hệ SCI (Mr. Đại chốt 25/10/2026) — cùng một khuôn với agent Công việc 3004: gõ email + mật khẩu,
// hoặc (giai đoạn test) bấm tên trong danh sách để đăng nhập luôn bằng mật khẩu = chính email. Danh sách do công tắc ở Main
// (Cài đặt › Người dùng) bật/tắt; tắt thì không hiện tên nào.
import { useEffect, useRef, useState } from "react";
import { LogIn, Search } from "lucide-react";
import { TEN_AGENT, TRANG_CHU_MAIN } from "@/lib/nhan-dien-agent";

interface DanhSachDangNhap {
  hien: boolean;
  nhom: { don_vi: string; tai_khoan: { email: string; ten: string; chuc_vu: string | null }[] }[];
}

const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ds, setDs] = useState<DanhSachDangNhap | null>(null);
  const [tim, setTim] = useState("");
  const [dangChon, setDangChon] = useState<string | null>(null);
  const oMatKhau = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/auth/danh-sach", { cache: "no-store" })
      .then((r) => r.json() as Promise<DanhSachDangNhap>)
      .then(setDs)
      .catch(() => setDs(null));
  }, []);

  /** Đăng nhập; trả false nếu sai (để màn chọn tài khoản chuyển sang gõ mật khẩu). */
  async function dangNhap(em: string, mk: string, tuDanhSach = false): Promise<boolean> {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: mk }),
      });
      const data = (await res.json().catch(() => null)) as { ok: boolean; role?: string; message?: string } | null;
      if (res.ok && data?.ok && data.role) {
        // full reload để cookie áp dụng qua middleware
        window.location.href = TRANG_CHU_MAIN;
        return true;
      }
      setError(tuDanhSach && res.status === 401 ? "Tài khoản này đã đổi mật khẩu — gõ mật khẩu rồi bấm Đăng nhập" : (data?.message ?? "Email hoặc mật khẩu không đúng"));
    } catch {
      setError("Không kết nối được máy chủ, thử lại sau");
    }
    setLoading(false);
    return false;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await dangNhap(email, password);
  }

  async function chon(em: string) {
    const mk = em.trim().toLowerCase();
    setEmail(em);
    setPassword(mk);
    setDangChon(em);
    const ok = await dangNhap(em, mk, true);
    if (!ok) {
      setPassword("");
      oMatKhau.current?.focus();
    }
    setDangChon(null);
  }

  const tu = boDau(tim.trim());
  const nhomLoc = (ds?.nhom ?? [])
    .map((g) => ({
      ...g,
      tai_khoan: g.tai_khoan.filter((x) => !tu || boDau(`${x.ten} ${x.email} ${x.chuc_vu ?? ""} ${g.don_vi}`).includes(tu)),
    }))
    .filter((g) => g.tai_khoan.length);

  const lopO =
    "w-full rounded-sm border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none transition placeholder:text-text-muted focus:border-accent";
  const coDs = !!ds?.hien && (ds.nhom?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <div className={`w-full ${coDs ? "max-w-[860px]" : "max-w-[400px]"}`}>
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent text-xl font-extrabold text-white shadow-card">M</div>
          <div>
            <h1 className="text-[17px] font-bold text-text">{TEN_AGENT} — BQLDA SCI</h1>
            <p className="mt-0.5 text-[11.5px] text-text-muted">Đăng nhập một lần ở đây là vào được cả hệ SCI</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded border border-border bg-bg2 p-5 shadow-card">
          <label className="mb-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">Email</span>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@scigroup.vn"
              className={lopO}
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">Mật khẩu</span>
            <input
              ref={oMatKhau}
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={lopO}
            />
          </label>

          {error && <div className="mb-3 rounded-sm border border-red/30 bg-red-soft px-3 py-2 text-[12px] font-medium text-red">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-3 py-2 text-[13px] font-bold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
          <p className="mt-3 text-center text-[10.5px] text-text-muted">Quên mật khẩu? Liên hệ quản trị viên (Phòng HCTH) để đặt lại.</p>
        </form>

        {coDs && (
          <div className="mt-4 rounded border border-border bg-surface p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="text-[12px] font-bold uppercase tracking-wider text-accent">Chọn tài khoản</div>
              <div className="text-[11px] text-text-muted">Bấm vào tên là đăng nhập luôn</div>
              <label className="ml-auto flex items-center gap-1.5 rounded-sm border border-border bg-bg px-2 py-1">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <input
                  value={tim}
                  onChange={(e) => setTim(e.target.value)}
                  placeholder="Tìm tên, chức vụ…"
                  className="w-40 bg-transparent text-[12px] text-text outline-none placeholder:text-text-muted"
                />
              </label>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {nhomLoc.map((g) => (
                <div key={g.don_vi}>
                  <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">{g.don_vi}</div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {g.tai_khoan.map((x) => (
                      <button
                        key={x.email}
                        type="button"
                        disabled={loading}
                        onClick={() => void chon(x.email)}
                        title={x.email}
                        className={`rounded-sm border px-2.5 py-1.5 text-left transition disabled:opacity-60 ${
                          email === x.email ? "border-accent bg-accent-soft" : "border-border hover:border-accent hover:bg-bg2"
                        }`}
                      >
                        <div className="truncate text-[12.5px] font-semibold text-text">{dangChon === x.email ? "Đang đăng nhập…" : x.ten}</div>
                        <div className="truncate text-[10.5px] text-text-muted">{x.chuc_vu ?? x.email}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!nhomLoc.length && <div className="py-4 text-center text-[12px] text-text-muted">Không thấy tài khoản khớp “{tim}”.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
