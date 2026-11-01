"use client";
// Trang đăng nhập — cùng phong cách agent tiến độ SCI. POST /api/auth/login → cookie phiên (SESSION_COOKIE).
// Danh sách tài khoản "bấm chọn" (GET /api/auth/danh-sach): bấm tên là đăng nhập luôn bằng mật khẩu lần đầu = chính email
// (Mr. Đại chốt K13 02/10); tài khoản đã
// đổi mật khẩu thì điền sẵn email để gõ mật khẩu. Bật/tắt ở Cài đặt → Tài khoản người dùng (tắt khi dùng thật).

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn, Search } from "lucide-react";
import { quenHet } from "@/components/phong/nho-trang-thai";

interface DanhSachDangNhap {
  hien: boolean;
  bam_la_dang_nhap?: boolean;
  nhom: { don_vi: string; tai_khoan: { email: string; ten: string; chuc_vu: string | null }[] }[];
}

const boDau = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();

function KhungDangNhap() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const [ds, setDs] = useState<DanhSachDangNhap | null>(null);
  const [tim, setTim] = useState("");
  const [dangChon, setDangChon] = useState<string | null>(null);
  const oMatKhau = useRef<HTMLInputElement>(null);

  useEffect(() => {
    quenHet(); // đổi người dùng: không mang bộ lọc / tuần / việc đang mở của người trước
    fetch("/api/auth/danh-sach", { cache: "no-store" })
      .then((r) => r.json() as Promise<DanhSachDangNhap>)
      .then(setDs)
      .catch(() => setDs(null));
  }, []);

  async function gui(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await dangNhap(email, matKhau);
  }

  /** Đăng nhập; trả false nếu sai mật khẩu (để màn chọn tài khoản chuyển sang gõ mật khẩu). */
  async function dangNhap(em: string, mk: string, tuDanhSach = false): Promise<boolean> {
    setLoi(null);
    setDang(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, mat_khau: mk }),
      });
      const j = (await res.json().catch(() => null)) as { ok?: boolean; loi?: string } | null;
      if (res.ok && j?.ok) {
        // Tải lại cả trang để cookie mới đi qua middleware
        const tiep = sp.get("tiep");
        window.location.href = tiep && tiep.startsWith("/") && !tiep.startsWith("//") ? tiep : "/";
        return true;
      }
      setLoi(tuDanhSach ? "Tài khoản này đã đổi mật khẩu — gõ mật khẩu rồi bấm Đăng nhập" : (j?.loi ?? "Email hoặc mật khẩu không đúng"));
    } catch {
      setLoi("Không kết nối được máy chủ, thử lại sau");
    }
    setDang(false);
    return false;
  }

  async function chon(em: string) {
    setEmail(em);
    setDangChon(em);
    if (ds?.hien) {
      // 26/10/2026 (Mr. Đại): danh sách đang hiện = giai đoạn test → bấm tên là điền mật khẩu (= chính email) và vào luôn, giống các agent khác
      // Mật khẩu lần đầu = chính email (chốt K13 02/10) — tài khoản đã đổi mật khẩu thì báo gõ mật khẩu
      setMatKhau(em.trim().toLowerCase());
      const ok = await dangNhap(em, em.trim().toLowerCase(), true);
      if (!ok) {
        setMatKhau("");
        oMatKhau.current?.focus();
      }
    } else {
      setMatKhau("");
      oMatKhau.current?.focus();
    }
    setDangChon(null);
  }

  const tu = boDau(tim.trim());
  const nhomLoc = (ds?.nhom ?? [])
    .map((g) => ({
      ...g,
      tai_khoan: g.tai_khoan.filter((a) => !tu || boDau(`${a.ten} ${a.email} ${a.chuc_vu ?? ""} ${g.don_vi}`).includes(tu)),
    }))
    .filter((g) => g.tai_khoan.length);

  const lopO =
    "w-full rounded-sm border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none transition placeholder:text-text-muted focus:border-accent";
  const coDs = !!ds?.hien && (ds.nhom?.length ?? 0) > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-8">
      <div className={`w-full ${coDs ? "max-w-[860px]" : "max-w-[400px]"}`}>
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-accent text-xl font-extrabold text-white shadow-card">D</div>
          <div>
            <h1 className="text-[17px] font-bold text-text">SCI công việc</h1>
            <p className="mt-0.5 text-[11.5px] text-text-muted">Giao việc bằng tài liệu. Sổ cái biết việc nào đang chạy.</p>
          </div>
        </div>

        <form onSubmit={gui} className="rounded border border-border bg-bg2 p-5 shadow-card">
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
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              placeholder="••••••••"
              className={lopO}
            />
          </label>

          {loi && <div className="mb-3 rounded-sm border border-red/30 px-3 py-2 text-[12px] font-medium text-red">{loi}</div>}

          <button
            type="submit"
            disabled={dang}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-3 py-2 text-[13px] font-bold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {dang ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
          <p className="mt-3 text-center text-[10.5px] text-text-muted">Quên mật khẩu? Liên hệ quản trị viên (Phòng HCTH) để đặt lại.</p>
        </form>

        {coDs && (
          <div className="mt-4 rounded border border-border bg-surface p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="text-[12px] font-bold uppercase tracking-wider text-accent">Chọn tài khoản</div>
              <div className="text-[11px] text-text-muted">
                Bấm vào tên là đăng nhập luôn
              </div>
              <label className="ml-auto flex items-center gap-1.5 rounded-sm border border-border bg-bg px-2 py-1">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <input
                  value={tim}
                  onChange={(e) => setTim(e.target.value)}
                  placeholder="Tìm tên, đơn vị…"
                  className="w-40 bg-transparent text-[12px] text-text outline-none placeholder:text-text-muted"
                />
              </label>
            </div>
            <div className="scroll-thin max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {nhomLoc.map((g) => (
                <div key={g.don_vi}>
                  <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">{g.don_vi}</div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {g.tai_khoan.map((a) => (
                      <button
                        key={a.email}
                        type="button"
                        disabled={dang}
                        onClick={() => void chon(a.email)}
                        title={a.email}
                        className={`rounded-sm border px-2.5 py-1.5 text-left transition disabled:opacity-60 ${
                          email === a.email ? "border-accent bg-accent/10" : "border-border hover:border-accent hover:bg-white/5"
                        }`}
                      >
                        <div className="truncate text-[12.5px] font-semibold text-text">
                          {dangChon === a.email ? "Đang đăng nhập…" : a.ten}
                        </div>
                        <div className="truncate text-[10.5px] text-text-muted">{a.chuc_vu ?? a.email}</div>
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

export default function TrangDangNhap() {
  return (
    <Suspense fallback={null}>
      <KhungDangNhap />
    </Suspense>
  );
}
