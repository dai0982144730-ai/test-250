"use client";
// ============================================================
// TÀI KHOẢN CLAUDE CỦA CÔNG TY — Cài đặt → 🔌 Kết nối, ngay dưới khung Kết nối AI (Quản lý token AI, Mr. Đại chốt 04/10/2026 —
// Đợt 2 nhân bản từ agent Công việc: khối "HaiTaiKhoan" của KetNoiAI.tsx).
//   • Mỗi tài khoản một thẻ TheTaiKhoanClaude (cùng khuôn với thẻ Tài khoản Claude cá nhân) — đăng nhập bằng link + dán mã.
//   • Bốn ô cấu hình (khai tại agent này): Dùng 2 tài khoản · Đảo vai chính/phụ mỗi 24 giờ · Tự mồi phiên lúc [giờ].
//     Bấm là lưu ngay (bớt cú bấm — không có nút Lưu). Agent Công việc đặt bốn ô này trong khung cấu hình AI; ở đây gom vào
//     một khối vì khung Kết nối AI của Main là cấu hình chung (model + chế độ).
//   • Không phải PM/Admin: thấy tình trạng, nút hiện mờ kèm lý do (luật 17).
//   • `coCaNhan={false}` (Agent quan sát): agent không có tài khoản cá nhân dự phòng — câu giải thích nói đúng điều đó.
// API: /api/ai/tai-khoan (GET tình hình · POST thao tác thẻ + "cau_hinh").
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Nut, goiApi, useThongBaoNhanh } from "@/components/ai/giao-dien-ai";
import { TheTaiKhoanClaude, type KetQuaThe } from "@/components/ai/TheTaiKhoanClaude";

interface TinhHinhTk {
  coTheSua: boolean;
  hai_tai_khoan: boolean;
  dao_vai_24h: boolean;
  moi_phien_bat: boolean;
  moi_phien_gio: string;
  chinh: 1 | 2;
  /** tài khoản đang phục vụ (chính; hết / mất đăng nhập thì phụ) */
  dang_dung: 1 | 2;
  tai_khoan: {
    so: 1 | 2;
    dang_nhap: boolean;
    dung_mac_dinh_may: boolean;
    email?: string;
    goi?: string;
    dang_chay: number;
    het_den: string | null;
    mat_dang_nhap?: boolean;
    luot_hom_nay: number;
  }[];
}

const LY_DO_KHOA = "Chỉ PM và Admin đăng nhập / cấu hình tài khoản Claude của công ty.";

export function TaiKhoanClaudeCongTy({ coCaNhan = true }: { coCaNhan?: boolean } = {}) {
  const [th, setTh] = useState<TinhHinhTk | null>(null);
  const [dang, setDang] = useState(false);
  const [luu, setLuu] = useState(false);
  const [gio, setGio] = useState("07:00");
  const { bao, khung } = useThongBaoNhanh();

  const tai = useCallback(async () => {
    setDang(true);
    try {
      const r = await goiApi<TinhHinhTk>("/api/ai/tai-khoan");
      setTh(r);
      setGio(r.moi_phien_gio);
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không đọc được tình hình tài khoản.", false);
    } finally {
      setDang(false);
    }
  }, [bao]);
  useEffect(() => {
    void tai();
  }, [tai]);

  async function doiCauHinh(p: Partial<Pick<TinhHinhTk, "hai_tai_khoan" | "dao_vai_24h" | "moi_phien_bat" | "moi_phien_gio">>) {
    setLuu(true);
    try {
      await goiApi("/api/ai/tai-khoan", { body: { action: "cau_hinh", ...p } });
      bao("Đã lưu.");
      await tai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Lưu không được.", false);
    } finally {
      setLuu(false);
    }
  }

  const sua = !!th?.coTheSua;
  const oChon = (nhan: string, giaTri: boolean, doi: (v: boolean) => void, khoa = false) => (
    <label
      className={`flex items-center gap-2 text-[12px] ${sua && !khoa ? "cursor-pointer text-text-secondary" : "cursor-not-allowed text-text-muted opacity-60"}`}
      title={sua ? undefined : LY_DO_KHOA}
    >
      <input type="checkbox" checked={giaTri} disabled={!sua || luu || khoa} onChange={(e) => doi(e.target.checked)} className="accent-[var(--accent)]" />
      {nhan}
    </label>
  );

  return (
    <section className="rounded border border-border bg-surface p-4" aria-label="Tài khoản Claude của công ty">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[13px] font-bold text-text">Tài khoản Claude của công ty</div>
        <Nut nho onClick={() => void tai()} disabled={dang}>
          <RefreshCw className={`h-3.5 w-3.5 ${dang ? "animate-spin" : ""}`} /> Làm mới
        </Nut>
      </div>
      <p className="mb-3 mt-1 text-[11.5px] text-text-muted">
        {th?.hai_tai_khoan
          ? `Đang BẬT dùng 2 tài khoản${th.dao_vai_24h ? ", đảo vai chính / phụ mỗi 24 giờ" : ", tài khoản 1 luôn là chính"}${th.moi_phien_bat ? `, mồi phiên lúc ${th.moi_phien_gio}` : ""}. `
          : "Đang dùng 1 tài khoản. "}
        Tài khoản hết hạn mức (chu kỳ 5 giờ / hạn mức tuần) thì trợ lý tự chuyển sang tài khoản kia.{" "}
        {coCaNhan ? (
          <>
            Hết cả hai thì người đã nối &quot;Tài khoản Claude cá nhân&quot; (menu tên ở góc trên) vẫn hỏi được bằng tài khoản của mình.
          </>
        ) : (
          "Hết cả hai thì 🤖 tạm dừng tới giờ tài khoản sớm nhất mở lại — agent này chỉ chạy việc nền, không dùng tài khoản cá nhân."
        )}{" "}
        Chỉ dùng khi Kết nối AI ở chế độ Gói Claude Pro/Max.
      </p>

      {th && (
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-sm border border-border-light bg-bg px-3.5 py-2.5">
          {oChon("Dùng 2 tài khoản Claude", th.hai_tai_khoan, (v) => void doiCauHinh({ hai_tai_khoan: v }))}
          {oChon("Đảo vai chính / phụ mỗi 24 giờ", th.dao_vai_24h, (v) => void doiCauHinh({ dao_vai_24h: v }), !th.hai_tai_khoan)}
          <span className="flex items-center gap-2">
            {oChon("Tự mồi phiên mỗi sáng lúc", th.moi_phien_bat, (v) => void doiCauHinh({ moi_phien_bat: v }))}
            <input
              type="time"
              value={gio}
              disabled={!sua || luu}
              onChange={(e) => setGio(e.target.value)}
              onBlur={() => gio && gio !== th.moi_phien_gio && void doiCauHinh({ moi_phien_gio: gio })}
              className="rounded-sm border border-border bg-bg2 px-2 py-0.5 text-[12px] text-text disabled:opacity-60"
              aria-label="Giờ mồi phiên"
              title={sua ? "Giờ gửi một câu ngắn vào tài khoản chính để chu kỳ 5 giờ bắt đầu từ giờ này" : LY_DO_KHOA}
            />
          </span>
        </div>
      )}

      {!th ? (
        <p className="text-[12px] text-text-muted">Đang kiểm tra…</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {th.tai_khoan.map((t) => {
            const dangDungTk = th.hai_tai_khoan || t.so === 1;
            return (
              <TheTaiKhoanClaude
                key={t.so}
                ten={`Tài khoản ${t.so}`}
                vai={dangDungTk ? (th.chinh === t.so ? "chính" : "phụ") : "chưa dùng — đang tắt 2 tài khoản"}
                dangDung={th.dang_dung === t.so && t.dang_nhap && !t.het_den && !t.mat_dang_nhap}
                moTa={
                  t.so === 1
                    ? "Tài khoản chính của công ty. Chưa đăng nhập riêng thì tạm mượn tài khoản Claude chung của máy chủ."
                    : "Tự vào thay khi tài khoản chính hết hạn mức, và đỡ khi tài khoản chính đang bận."
                }
                tt={{
                  dang_nhap: t.dang_nhap,
                  email: t.email,
                  goi: t.goi,
                  mac_dinh_may: t.dung_mac_dinh_may,
                  het_den: t.het_den,
                  mat_dang_nhap: t.mat_dang_nhap,
                }}
                dongPhu={[`Hôm nay ${t.luot_hom_nay.toLocaleString("vi-VN")} lượt${t.dang_chay ? ` · đang chạy ${t.dang_chay}` : ""}.`]}
                sua={sua}
                lyDoKhoa={LY_DO_KHOA}
                goi={(body) => goiApi<KetQuaThe>("/api/ai/tai-khoan", { body: { ...body, so: t.so } })}
                sauKhiDoi={tai}
                bao={bao}
              />
            );
          })}
        </div>
      )}
      {khung}
    </section>
  );
}
