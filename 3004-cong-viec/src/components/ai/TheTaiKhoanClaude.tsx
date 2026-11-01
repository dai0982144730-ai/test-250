"use client";
// ============================================================
// THẺ TÀI KHOẢN CLAUDE — MỘT khuôn cho Tài khoản 1, Tài khoản 2 (Cài đặt → AI) và Tài khoản Claude cá nhân (menu tên người).
// Mr. Đại chốt 04/10/2026 trưa: "bản chất đây là cùng 1 việc thì không trình bầy 1 vấn đề theo 2 cách khác nhau".
// Khuôn lấy theo khối "Tài khoản Claude (Pro/Max)" anh chụp: đầu thẻ (tên · vai · đang dùng) · mô tả · hộp trạng thái · hàng nút.
// Đăng nhập = LINK + DÁN MÃ (lib/ai/dang-nhap-link.ts): bấm "Đăng nhập Claude" → tab mới mở trang đăng nhập Claude trên máy /
// điện thoại của người bấm → trang Claude hiện một mã → dán vào ô (dán là tự gửi). Không còn cửa sổ trên máy chủ, không còn mã
// dài hạn setup-token. Nút không có quyền bấm thì ẨN (luật riêng 3004).
// API của thẻ (cùng tên thao tác ở /api/ai/tai-khoan và /api/ai/tai-khoan-ca-nhan): mo_link · nhap_ma · huy_link · logout · thu · kiem_tra.
// ============================================================
import { useState } from "react";
import { AlertTriangle, CheckCircle2, LogOut, Zap } from "lucide-react";
import { LOP_O_NHAP, Nut } from "@/components/layout/giao-dien";

export interface TinhTrangTaiKhoan {
  dang_nhap: boolean;
  email?: string;
  goi?: string;
  /** "ma" = mã dài hạn dán tay (bản cũ) · "cua_so" = file đăng nhập (link / cửa sổ) */
  kieu?: "ma" | "cua_so" | null;
  duoi_ma?: string;
  /** Tài khoản 1 chưa đăng nhập riêng → đang chạy bằng tài khoản mặc định của máy chủ */
  mac_dinh_may?: boolean;
  het_den?: string | null;
  mat_dang_nhap?: boolean;
}

export interface KetQuaThe {
  ok: boolean;
  message?: string;
  url?: string;
}

const THE = "rounded-sm border border-border bg-surface p-4";
const HOP_TRANG_THAI = "mb-3 rounded-sm border border-border-light bg-bg px-3.5 py-3";
/** Dán là tự gửi khi chuỗi trông như mã (cùng bộ ký tự với chuanHoaMaLink ở máy chủ — kiểm độc lập lần 2 #5) */
const RE_MA = /^[A-Za-z0-9_\-.~#=%/+]{20,2000}$/;
const gio = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });

export function TheTaiKhoanClaude({
  ten,
  vai,
  dangDung,
  moTa,
  tt,
  dongPhu = [],
  sua,
  cuaToi,
  goi,
  sauKhiDoi,
  bao,
}: {
  ten: string;
  /** chính · phụ · dự phòng… (chữ thuần) */
  vai?: string;
  dangDung?: boolean;
  moTa: string;
  tt: TinhTrangTaiKhoan | null;
  dongPhu?: string[];
  /** được bấm nút (đăng nhập / đăng xuất / thử) */
  sua: boolean;
  /** thẻ tài khoản của chính người xem — câu chữ xưng "anh/chị" */
  cuaToi?: boolean;
  goi: (body: Record<string, unknown>) => Promise<KetQuaThe>;
  sauKhiDoi: () => Promise<void> | void;
  bao: (c: string, t?: boolean) => void;
}) {
  const [ban, setBan] = useState<"" | "mo" | "ma" | "thu" | "kiem" | "xuat">("");
  const [link, setLink] = useState<string | null>(null);
  /** tab đăng nhập có mở được không (trình duyệt chặn cửa sổ mới thì phải bấm link trong khung) */
  const [daMoTab, setDaMoTab] = useState(false);
  const [ma, setMa] = useState("");
  const [kq, setKq] = useState<{ ok: boolean; chu: string } | null>(null);

  const loiChu = (e: unknown) => (e instanceof Error ? e.message : String(e));

  async function dangNhap() {
    setKq(null);
    // Mở tab NGAY trong cú bấm (trình duyệt chặn tab mở sau khi chờ mạng), có link rồi thì đưa tab đó tới trang đăng nhập Claude
    const tab = window.open("about:blank", "_blank");
    setBan("mo");
    try {
      const r = await goi({ action: "mo_link" });
      if (!r.ok || !r.url) {
        tab?.close();
        setKq({ ok: false, chu: r.message || "Không lấy được link đăng nhập." });
        return;
      }
      let moDuoc = false;
      if (tab) {
        try {
          tab.opener = null;
          tab.location.href = r.url;
          moDuoc = true;
        } catch {
          /* tab bị chặn — vẫn còn link bấm tay trong khung */
        }
      }
      setDaMoTab(moDuoc);
      setLink(r.url);
      setMa("");
    } catch (e) {
      tab?.close();
      setKq({ ok: false, chu: loiChu(e) });
    } finally {
      setBan("");
    }
  }

  async function nhapMa(giaTri: string) {
    if (!giaTri.trim() || ban) return;
    setBan("ma");
    setKq(null);
    try {
      const r = await goi({ action: "nhap_ma", ma: giaTri });
      setKq({ ok: r.ok, chu: r.message || (r.ok ? "Đã đăng nhập." : "Đăng nhập không thành công.") });
      // Thành công hay mã sai thì lượt đăng nhập trên máy chủ đều đã kết thúc → về nút Đăng nhập
      setLink(null);
      setMa("");
      if (r.ok) {
        bao(r.message || "Đã đăng nhập.");
        await sauKhiDoi();
      }
    } catch (e) {
      // Lỗi dạng mã (chưa gửi cho Claude) → giữ khung để dán lại
      setKq({ ok: false, chu: loiChu(e) });
    } finally {
      setBan("");
    }
  }

  async function huy() {
    setLink(null);
    setMa("");
    try {
      await goi({ action: "huy_link" });
    } catch {
      /* lượt chờ tự tắt sau 15 phút */
    }
  }

  async function lam(action: "thu" | "kiem_tra" | "logout") {
    if (action === "logout" && !window.confirm(`Đăng xuất ${cuaToi ? "tài khoản Claude cá nhân của anh/chị" : ten.toLowerCase()}?`)) return;
    setBan(action === "thu" ? "thu" : action === "kiem_tra" ? "kiem" : "xuat");
    setKq(null);
    try {
      const r = await goi({ action });
      if (action === "logout") {
        bao(r.message || "Đã đăng xuất.", r.ok);
        await sauKhiDoi();
      } else setKq({ ok: r.ok, chu: r.message || "" });
    } catch (e) {
      setKq({ ok: false, chu: loiChu(e) });
    } finally {
      setBan("");
    }
  }

  const nutDangNhap = !tt ? null : !tt.dang_nhap ? "Đăng nhập Claude" : tt.mat_dang_nhap ? "Đăng nhập lại" : tt.mac_dinh_may ? "Đăng nhập tài khoản riêng" : null;

  return (
    <div className={THE}>
      {/* --- Đầu thẻ --- */}
      <div className="mb-1 flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden
          className="ml-1 h-4 w-4 shrink-0 rotate-45 rounded-[3px]"
          style={{ backgroundImage: "linear-gradient(160deg, var(--accent-hover) 0%, var(--accent) 100%)" }}
        />
        <span className="text-[13px] font-bold text-text">{ten}</span>
        {vai && <span className="text-[11.5px] text-text-muted">{vai}</span>}
        {dangDung && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green">
            <CheckCircle2 className="h-3 w-3" /> Đang dùng
          </span>
        )}
      </div>
      <p className="mb-3 text-[12px] text-text-muted">{moTa}</p>

      {/* --- Hộp trạng thái --- */}
      <div className={HOP_TRANG_THAI}>
        {!tt ? (
          <p className="text-[12px] text-text-muted">Đang kiểm tra…</p>
        ) : (
          <div className="space-y-1 text-[12px] text-text-secondary">
            {tt.dang_nhap ? (
              <p className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green" />
                <span>
                  <b className="text-text">Đã đăng nhập:</b>{" "}
                  {tt.email || (tt.kieu === "ma" ? `mã dài hạn${tt.duoi_ma ? ` (đuôi ${tt.duoi_ma})` : ""}` : "—")}
                  {tt.goi ? ` · ${tt.goi}` : ""}
                </span>
              </p>
            ) : (
              <p>
                <b className="text-text">Chưa đăng nhập.</b>{" "}
                {sua ? `Bấm “Đăng nhập Claude” bên dưới — mở được trên máy tính hoặc điện thoại của ${cuaToi ? "anh/chị" : "người bấm"}.` : "Nhờ quản trị viên đăng nhập."}
              </p>
            )}
            {/* TK1 chưa đăng nhập riêng = TẠM MƯỢN tài khoản chung của máy (Mr. Đại chốt 18/10/2026: mỗi agent 2 tài khoản riêng,
                con nào chết thì tự chết — mượn chung thì một con hết hạn mức là cả nhóm đang mượn cùng dừng). Chữ thuần, luật 28. */}
            {tt.mac_dinh_may && tt.dang_nhap && (
              <p className="text-[11.5px] text-text-secondary">
                <b className="text-text">Đang mượn tài khoản Claude chung của máy</b> — hết hạn mức thì mọi agent đang mượn cùng dừng. Đăng nhập
                tài khoản riêng để agent này chạy độc lập.
              </p>
            )}
            {tt.het_den && <p className="text-[11.5px] font-semibold text-yellow">Hết hạn mức — dùng lại khoảng {gio(tt.het_den)}.</p>}
            {tt.mat_dang_nhap && (
              <p className="text-[11.5px] font-semibold text-red">Mất đăng nhập (hết hạn hoặc bị thu hồi) — bấm Đăng nhập lại.{cuaToi ? "" : " Trợ lý đang dùng tài khoản khác."}</p>
            )}
            {tt.dang_nhap && <p className="text-[11.5px] text-green">Dùng gói thuê bao — không tính thêm tiền theo token.</p>}
            {dongPhu.map((d) => (
              <p key={d} className="text-[11px] text-text-muted">
                {d}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* --- Đang đăng nhập: link + dán mã --- */}
      {sua && link && (
        <div className="rounded-sm border border-accent/40 bg-accent/5 p-3 text-[12px] text-text-secondary">
          <p>
            <b className="text-text">①</b> {daMoTab ? "Trang đăng nhập Claude đã mở ở tab mới" : "Bấm link để mở trang đăng nhập Claude"} — đăng nhập bằng{" "}
            {cuaToi ? "tài khoản Claude của anh/chị" : `tài khoản Claude dùng làm ${ten.toLowerCase()}`}.{" "}
            {daMoTab ? "Không thấy tab? " : ""}
            <a href={link} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline">
              Mở trang đăng nhập Claude ↗
            </a>
          </p>
          <p className="mt-1.5">
            <b className="text-text">②</b> Đăng nhập xong, trang Claude hiện một mã — bấm chép mã (Copy Code) rồi dán vào ô dưới. Dán xong là tự gửi.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              autoComplete="off"
              spellCheck={false}
              className={`${LOP_O_NHAP} min-w-0 flex-1 font-mono`}
              placeholder="Dán mã trang Claude hiện ra"
              value={ma}
              disabled={ban === "ma"}
              onChange={(e) => setMa(e.target.value)}
              onPaste={(e) => {
                const dan = e.clipboardData.getData("text").replace(/\s+/g, "");
                if (RE_MA.test(dan)) {
                  e.preventDefault();
                  setMa(dan);
                  void nhapMa(dan);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void nhapMa(ma);
              }}
              aria-label={`Mã đăng nhập ${ten}`}
            />
            <Nut kieu="chinh" disabled={ban === "ma" || !ma.trim()} onClick={() => void nhapMa(ma)}>
              {ban === "ma" ? "Đang xác nhận…" : "Xong"}
            </Nut>
            <Nut kieu="nhat" disabled={ban === "ma"} onClick={() => void huy()}>
              Huỷ
            </Nut>
          </div>
          <p className="mt-1.5 text-[11px] text-text-muted">Link dùng được 15 phút; mỗi mã chỉ dùng một lần.</p>
        </div>
      )}

      {/* --- Hàng nút (không có quyền bấm thì ẩn — luật riêng 3004) --- */}
      {sua && tt && !link && (
        <div className="flex flex-wrap items-start gap-2">
          {nutDangNhap && (
            <Nut kieu={tt.mac_dinh_may && tt.dang_nhap && !tt.mat_dang_nhap ? "vien" : "chinh"} onClick={() => void dangNhap()} disabled={!!ban}>
              {ban === "mo" ? "Đang lấy link…" : nutDangNhap}
            </Nut>
          )}
          {tt.dang_nhap && !tt.mac_dinh_may && (
            <Nut kieu="nguy" onClick={() => void lam("logout")} disabled={!!ban}>
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </Nut>
          )}
          {tt.dang_nhap && (
            <>
              <Nut onClick={() => void lam("thu")} disabled={!!ban} title="Hỏi Claude một câu rất ngắn bằng đúng tài khoản này — tốn vài nghìn token">
                <Zap className="h-3.5 w-3.5" />
                {ban === "thu" ? "Đang hỏi thử…" : "Thử trợ lý AI"}
              </Nut>
              <Nut kieu="nhat" onClick={() => void lam("kiem_tra")} disabled={!!ban} title="Chỉ kiểm tra đăng nhập — không tốn token">
                {ban === "kiem" ? "Đang kiểm tra…" : "Kiểm tra nhanh (không tốn token)"}
              </Nut>
            </>
          )}
        </div>
      )}

      {kq && (
        <div className={`mt-3 flex items-start gap-2 rounded-sm border px-3 py-2.5 text-[12px] ${kq.ok ? "border-green/40" : "border-red/40"}`}>
          {kq.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red" />}
          <span className="text-text-secondary">{kq.chu}</span>
        </div>
      )}
    </div>
  );
}
