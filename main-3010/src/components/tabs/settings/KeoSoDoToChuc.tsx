"use client";

// Khối «Sơ đồ tổ chức — tự kéo từ agent Công việc» ở Cài đặt › Người dùng (Mr. Đại chốt 12/10/2026 — câu 9).
// Người dùng vào đây để: ① biết sơ đồ ở Main đã khớp agent Công việc chưa, lần ghi gần nhất đổi gì; ② bấm «Kéo sơ đồ ngay»
// khi vừa sửa kiêm nhiệm bên kia mà không muốn chờ 30 phút; ③ tạo tài khoản cho người mới bằng MỘT nút.
// Chữ giải thích dài giấu sau «chi tiết»; nút không đủ quyền hiện MỜ kèm lý do (luật 17).
import { useCallback, useEffect, useState } from "react";
import { ngayGioVN } from "@/lib/ngay-hien";

const BTN_SMALL =
  "rounded-sm border border-border px-2 py-1 text-[11px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARY =
  "rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60";

interface TrangThai {
  lanThuCuoi: string | null;
  boi: string | null;
  ketQua: "da-ghi" | "khong-doi" | "bi-chan" | "loi" | null;
  thongDiep: string;
  soDo: { donVi: number; kiemNhiem: number; nguoi: number } | null;
  biChan: { lyDo: string; dong: string[] } | null;
  lanGhiCuoi: string | null;
  doiGiLanGhiCuoi: string[];
  nguoiChuaCoTaiKhoan: { email: string; ten: string; donVi: string | null; chucVu: string | null }[];
  khongKhoa: { email: string; ten: string; lyDo: string }[];
  emailLech: { ten: string; emailMain: string; emailCongViec: string }[];
}

interface TraLoi {
  ok?: boolean;
  message?: string;
  trangThai?: TrangThai;
  nhipPhut?: number;
  dayChoAgent?: { ten: string; ok: boolean; tomTat: string }[];
}

function chuDay(ds: TraLoi["dayChoAgent"]): string {
  if (!ds || ds.length === 0) return "";
  const hong = ds.filter((d) => !d.ok);
  return hong.length === 0 ? ` Đã đẩy sang ${ds.length} agent.` : ` Đẩy sang agent: ${ds.length - hong.length}/${ds.length} nhận.`;
}

export function KeoSoDoToChuc({
  laQuanTri,
  lyDoMo,
  onDoi,
  showToast,
}: {
  /** Quản trị mới được «Vẫn ghi theo sơ đồ mới» và «Tạo tài khoản»; «Kéo sơ đồ ngay» thì ai vào được Cài đặt cũng bấm được */
  laQuanTri: boolean;
  lyDoMo?: string;
  /** Sơ đồ / người vừa đổi — màn cha nạp lại danh sách người dùng */
  onDoi: () => void;
  showToast: (text: string, ok: boolean) => void;
}) {
  const [tt, setTt] = useState<TrangThai | null>(null);
  const [nhip, setNhip] = useState(30);
  const [ban, setBan] = useState(false);
  const [moChiTiet, setMoChiTiet] = useState(false);

  const nap = useCallback(async () => {
    try {
      const res = await fetch("/api/so-do-to-chuc", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as TraLoi;
      if (j.trangThai) setTt(j.trangThai);
      if (typeof j.nhipPhut === "number") setNhip(j.nhipPhut);
    } catch {
      // khối phụ — không tải được thì để trống, không chặn màn Người dùng
    }
  }, []);

  useEffect(() => {
    void nap();
  }, [nap]);

  const lam = async (viec: "keo" | "van-ghi" | "tao-tai-khoan") => {
    setBan(true);
    try {
      const res = await fetch("/api/so-do-to-chuc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ viec }),
      });
      const j = (await res.json().catch(() => null)) as TraLoi | null;
      if (j?.trangThai) setTt(j.trangThai);
      showToast((j?.message ?? `Máy chủ trả HTTP ${res.status}`) + chuDay(j?.dayChoAgent), j?.ok === true);
      onDoi();
    } catch {
      showToast("Không gọi được máy chủ — thử lại.", false);
    } finally {
      setBan(false);
    }
  };

  const hong = tt?.ketQua === "bi-chan" || tt?.ketQua === "loi";
  const chuaCo = tt?.nguoiChuaCoTaiKhoan ?? [];
  const doiGi = tt?.doiGiLanGhiCuoi ?? [];

  return (
    <div className="space-y-1.5 rounded-sm border border-border-light bg-bg2/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] font-bold text-text">Sơ đồ tổ chức — tự kéo từ agent Công việc mỗi {nhip} phút</div>
        <button type="button" className={BTN_PRIMARY} disabled={ban} onClick={() => void lam("keo")}>
          {ban ? "Đang kéo…" : "Kéo sơ đồ ngay"}
        </button>
      </div>

      {tt === null || tt.lanThuCuoi === null ? (
        <p className="text-[11.5px] text-text-muted">Chưa kéo lần nào — vòng tự động kéo lượt đầu trong khoảng một phút sau khi máy chủ khởi động.</p>
      ) : (
        <p className={`text-[11.5px] ${hong ? "font-bold text-red" : "text-text-secondary"}`}>
          Kéo gần nhất {ngayGioVN(tt.lanThuCuoi)} ({tt.boi === "tu-dong" ? "tự động" : tt.boi})
          {tt.soDo && !hong ? ` · ${tt.soDo.donVi} đơn vị · ${tt.soDo.kiemNhiem} kiêm nhiệm · ${tt.soDo.nguoi} người` : ""} — {tt.thongDiep}
        </p>
      )}

      {tt?.biChan && (
        <div className="space-y-1">
          <ul className="list-disc pl-5 text-[11.5px] text-text-secondary">
            {tt.biChan.dong.slice(0, moChiTiet ? 200 : 6).map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            {tt.biChan.dong.length > 6 && (
              <button type="button" className={BTN_SMALL} onClick={() => setMoChiTiet((v) => !v)}>
                {moChiTiet ? "Thu gọn" : `Xem đủ ${tt.biChan.dong.length} dòng sẽ đổi`}
              </button>
            )}
            <button type="button" className={BTN_SMALL} disabled={ban || !laQuanTri} title={lyDoMo} onClick={() => void lam("van-ghi")}>
              Vẫn ghi theo sơ đồ mới
            </button>
          </div>
        </div>
      )}

      {chuaCo.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-[11.5px] text-text-secondary">
            <b className="text-text">{chuaCo.length} người</b> có ở agent Công việc nhưng chưa có tài khoản ở Main:{" "}
            {chuaCo
              .slice(0, 8)
              .map((p) => `${p.ten}${p.donVi ? ` (${p.donVi})` : ""}`)
              .join(" · ")}
            {chuaCo.length > 8 ? ` · và ${chuaCo.length - 8} người nữa` : ""}. Mật khẩu lần đầu = email.
          </p>
          <button type="button" className={BTN_PRIMARY} disabled={ban || !laQuanTri} title={lyDoMo} onClick={() => void lam("tao-tai-khoan")}>
            Tạo {chuaCo.length} tài khoản
          </button>
        </div>
      )}

      {(tt?.khongKhoa.length ?? 0) > 0 && (
        <p className="text-[11.5px] text-text-secondary">
          Không tự khoá: {tt!.khongKhoa.map((k) => `${k.ten} (${k.email}) — ${k.lyDo}`).join(" · ")}
        </p>
      )}
      {(tt?.emailLech.length ?? 0) > 0 && (
        <p className="text-[11.5px] text-text-secondary">
          Email hai bên khác nhau (Main không tự đổi email):{" "}
          {tt!.emailLech.map((e) => `${e.ten}: Main ${e.emailMain} · agent Công việc ${e.emailCongViec}`).join(" · ")}
        </p>
      )}

      {tt?.lanGhiCuoi && !tt.biChan && (
        <div className="text-[11.5px] text-text-muted">
          Lần ghi gần nhất {ngayGioVN(tt.lanGhiCuoi)} — {doiGi.length} thay đổi{" "}
          {doiGi.length > 0 && (
            <button type="button" className={BTN_SMALL} onClick={() => setMoChiTiet((v) => !v)}>
              {moChiTiet ? "ẩn" : "chi tiết"}
            </button>
          )}
          {moChiTiet && (
            <ul className="mt-1 list-disc pl-5 text-text-secondary">
              {doiGi.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
