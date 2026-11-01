"use client";

// ============================================================
// MÀN BÁO CÁO THÁNG — PLAN-MAIN-AGENT mục 2 (6 mục · 11 bảng)
//
// Màn này KHÔNG tính lại số nào. Mọi ô đã kèm nguồn từ tầng `dung.ts`; việc
// của màn hình chỉ là bày ra và nói thật chỗ nào chưa có số (A.4 điều 3 · 5).
//
// ⭐ 13/10/2026 (KE-HOACH/22, Mr. Đại chốt):
//   · Nút "Làm lại báo cáo" = hỏi lại mọi agent RỒI soạn luôn phần 🤖; giữ bản cũ để nói báo cáo đổi ra sao.
//   · Ghi rõ bản đang xem DỰNG LÚC NÀO (bản dựng trước khi hết kỳ thì tô vàng — số chưa đủ tháng).
//   · Ba ô đầu báo cáo (Đơn vị lập · Nơi nhận · Người ký) khai ngay tại đây, rời ô là lưu.
//   · Bảng nhiều dự án bày theo HÀNG tên dự án (xem BangBaoCao.tsx).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import {
  nhanKyChu,
  type BaoCaoThang,
  type MucBaoCao,
  type SoHaiBan,
} from "@/lib/bao-cao-thang/model";
import { BangBaoCao, GIOI_HAN_CONG_TY, GIOI_HAN_MOT_DU_AN } from "./BangBaoCao";
import { ChuSuaDuoc } from "./ChuSuaDuoc";
import { ThanhTab } from "@/components/common/ThanhTab";
import { HopHuongDanTab } from "@/components/common/HopHuongDanTab";
import { HUONG_DAN_BAO_CAO_THANG, type MaTabBaoCaoThang } from "@/lib/huong-dan/hop-tab/bao-cao-thang";
import { khoaNhanXet } from "@/lib/bao-cao-thang/sua-tay";
import { locTheoDuAn } from "@/lib/bao-cao-thang/loc-du-an";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";
import { fmtSo, khoangNgay } from "@/lib/format";
import { khoangKy } from "@/lib/bao-cao-thang/model";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface CaiDatDau {
  donViLap: string;
  noiNhan: string;
  nguoiKy: string;
}

interface TraApi {
  ok: boolean;
  bc?: BaoCaoThang;
  message?: string;
  daLuu?: boolean;
  nhanXet?: { soO: number; soBang: number; lyDo: string | null };
  loiLuu?: string[];
  laKhung?: boolean;
  /** ⭐ 05/10 luật agent mật: vì sao người đang xem không bấm được 🤖 Soạn nhận xét; null = bấm được */
  lyDoChanSoan?: string | null;
  caiDatDau?: CaiDatDau;
  soVoiTruoc?: SoHaiBan | null;
}

const NUT_PHU =
  "rounded-sm border border-border px-2.5 py-1 text-[11.5px] text-text-secondary hover:bg-bg2 disabled:opacity-50";

/** Tên mục kiểu form công ty — chữ hoa, gạch chân (cùng khuôn trang Báo cáo tuần) */
function MucForm({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 border-b border-border-light pb-1.5 text-[12.5px] font-bold uppercase tracking-wide text-accent">{title}</h2>
      {children}
    </section>
  );
}

export function BaoCaoThangView({
  banDau,
  namBanDau,
  thangBanDau,
  ghiChuBanDau,
  lyDoChanSoanBanDau = null,
  caiDatDauBanDau,
  soVoiTruocBanDau = null,
  dauHang,
}: {
  /** Hai nút Báo cáo sáng · Báo cáo tháng — đứng đầu hàng ghim, «Chọn dự án» nằm ngay bên phải (Mr. Đại 28/10) */
  dauHang?: ReactNode;
  banDau: BaoCaoThang | null;
  namBanDau: number;
  thangBanDau: number;
  /** Vì sao chưa có bản nháp — hiện nguyên văn thay vì để màn trống trơn */
  ghiChuBanDau?: string;
  /** ⭐ 05/10 luật agent mật — vì sao không bấm được 🤖 Soạn nhận xét (máy chủ tính); null = bấm được */
  lyDoChanSoanBanDau?: string | null;
  caiDatDauBanDau?: CaiDatDau;
  soVoiTruocBanDau?: SoHaiBan | null;
}) {
  const [nam, setNam] = useState(namBanDau);
  const [thang, setThang] = useState(thangBanDau);
  const [bcGoc, setBc] = useState<BaoCaoThang | null>(banDau);
  // «Chọn dự án»: "" = toàn công ty. Lọc ở máy khách bằng CÙNG hàm với lúc xuất Excel (lib/bao-cao-thang/loc-du-an.ts)
  const [duAnChon, setDuAnChon] = useState("");
  const [moChon, setMoChon] = useState(false);
  const bc = useMemo(() => (bcGoc && duAnChon ? locTheoDuAn(bcGoc, duAnChon) : bcGoc), [bcGoc, duAnChon]);
  const tenDuAnChon = bcGoc?.duAn.find((d) => d.ma === duAnChon)?.ten ?? "";
  const gioiHan = duAnChon ? GIOI_HAN_MOT_DU_AN : GIOI_HAN_CONG_TY;
  useEffect(() => {
    if (!moChon) return;
    const ngoai = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest("[data-menu-du-an]")) setMoChon(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMoChon(false);
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", esc);
    };
  }, [moChon]);
  const [laKhung, setLaKhung] = useState(false);
  const [dangChay, setDangChay] = useState(false);
  // Nút gọi AI / ghi = cửa "ghi" (quyen.ts) — Người xem thấy nút MỜ kèm lý do (luật 17)
  const coGhi = duocGhi(useSessionUser()?.role);
  const [thongBao, setThongBao] = useState<string>(ghiChuBanDau ?? "");
  const [lyDoChanSoan, setLyDoChanSoan] = useState<string | null>(lyDoChanSoanBanDau);
  const [dau, setDau] = useState<CaiDatDau>(caiDatDauBanDau ?? { donViLap: "", noiNhan: "", nguoiKy: "" });

  const nhan = useCallback((j: TraApi) => {
    if (j.lyDoChanSoan !== undefined) setLyDoChanSoan(j.lyDoChanSoan);
    if (j.caiDatDau) setDau(j.caiDatDau);
  }, []);

  const nap = useCallback(
    async (chiKhung: boolean) => {
      setDangChay(true);
      setThongBao(chiKhung ? "Đang dựng khung…" : "Đang mở bản đã lưu…");
      try {
        const q = `nam=${nam}&thang=${thang}${chiKhung ? "&khung=1" : ""}`;
        const r = await fetch(`/api/bao-cao-thang?${q}`, { cache: "no-store" });
        const j = (await r.json()) as TraApi;
        nhan(j);
        if (j.ok && j.bc) {
          setBc(j.bc);
          setLaKhung(Boolean(j.laKhung));
          setThongBao(j.laKhung ? "Đang xem KHUNG — chưa hỏi agent nào." : "");
        } else {
          setBc(null);
          setThongBao(j.message ?? "Không đọc được bản nháp.");
        }
      } catch (e) {
        setThongBao(`Lỗi gọi máy chủ: ${(e as Error).message}`);
      } finally {
        setDangChay(false);
      }
    },
    [nam, thang, nhan],
  );

  /** Gọi POST: "lam-lai" (hỏi lại agent + soạn 🤖) hoặc "soan-nhan-xet" (chỉ soạn lại 🤖 trên bản đã lưu) */
  const chay = useCallback(
    async (hanhDong: "lam-lai" | "soan-nhan-xet") => {
      setDangChay(true);
      setThongBao(
        hanhDong === "lam-lai"
          ? "Đang hỏi lại các agent rồi 🤖 soạn nhận xét… (có thể vài phút)"
          : "🤖 Đang soạn lại nhận xét… (mỗi bảng một lượt, có thể vài phút)",
      );
      try {
        const r = await fetch("/api/bao-cao-thang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nam, thang, hanhDong }),
        });
        const j = (await r.json()) as TraApi;
        nhan(j);
        if (j.ok && j.bc) {
          setBc(j.bc);
          setLaKhung(false);
          const nx = j.nhanXet;
          const cauAi = nx
            ? nx.soO > 0
              ? ` 🤖 đã soạn ${fmtSo(nx.soO)} ô trên ${fmtSo(nx.soBang)} bảng.`
              : ` ${nx.lyDo ?? "🤖 không soạn được ô nào — xem lý do trong từng ô."}`
            : hanhDong === "lam-lai"
              ? " Phần 🤖 chưa soạn — xem lý do ở nút 🤖 Soạn nhận xét."
              : "";
          setThongBao(
            hanhDong === "soan-nhan-xet"
              ? cauAi.trim()
              : j.daLuu === false
                ? `Đã làm lại nhưng KHÔNG lưu được: ${(j.loiLuu ?? []).join(" · ")}`
                : `Đã làm lại báo cáo và lưu.${cauAi}`,
          );
        } else {
          setThongBao(j.message ?? "Không làm lại được báo cáo.");
        }
      } catch (e) {
        setThongBao(`Lỗi gọi máy chủ: ${(e as Error).message}`);
      } finally {
        setDangChay(false);
      }
    },
    [nam, thang, nhan],
  );

  /** Rời ô là lưu (bớt cú bấm) — chỉ gửi khi chữ đã đổi */
  const luuDau = useCallback(
    async (khoa: keyof CaiDatDau, giaTri: string) => {
      try {
        const r = await fetch("/api/bao-cao-thang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong: "luu-dau", [khoa]: giaTri }),
        });
        const j = (await r.json()) as TraApi;
        if (j.caiDatDau) setDau(j.caiDatDau);
        setThongBao(j.message ?? "");
      } catch (e) {
        setThongBao(`Lỗi gọi máy chủ: ${(e as Error).message}`);
      }
    },
    [],
  );

  /** 28/10: sửa tay một chỗ lời văn 🤖 — rời ô là lưu, máy chủ trả lại bản đã áp chữ sửa; file Excel lấy đúng chữ này */
  const luuSua = useCallback(
    async (khoa: string, giaTri: string) => {
      try {
        const r = await fetch("/api/bao-cao-thang", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nam, thang, hanhDong: "sua-chu", khoa, giaTri }),
        });
        const j = (await r.json()) as TraApi;
        if (j.ok && j.bc) setBc(j.bc);
        setThongBao(j.message ?? "");
      } catch (e) {
        setThongBao(`Lỗi gọi máy chủ: ${(e as Error).message}`);
      }
    },
    [nam, thang],
  );

  // 28/10/2026 (Mr. Đại): bỏ «Mở bản đã lưu» và «Xem khung + nguồn» — đổi tháng/năm là tự mở bản đã lưu của kỳ đó
  // (bớt một cú bấm); nguồn từng ô vẫn hiện khi rê chuột và ở «Tải phụ lục nguồn». Năm gõ dở thì chờ 0,7 giây rồi mới hỏi.
  const lanDau = useRef(true);
  useEffect(() => {
    if (lanDau.current) {
      lanDau.current = false;
      return;
    }
    if (!Number.isInteger(nam) || nam < 2000) return;
    const h = setTimeout(() => void nap(false), 700);
    return () => clearTimeout(h);
  }, [nam, thang, nap]);

  useEffect(() => {
    if (!banDau) void nap(true);
    // Chỉ chạy một lần lúc mở màn — kỳ đổi thì người dùng bấm nút.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tenDuAn = (ma: string) => bc?.duAn.find((d) => d.ma === ma)?.ten ?? ma;
  const [tabBc, setTabBc] = useState<MaTabBaoCaoThang>("tong-quan");

  /** Một mục (I..VI) trên khung giấy: nhận xét 🤖 sửa tại chỗ, các bảng, khối xu thế */
  const ghepMuc = (m: MucBaoCao) => (
    <MucForm key={m.ma} title={`${m.ma}. ${m.ten}`}>
      <div className="space-y-6">
        {m.nhanXet && (
          <div className="rounded-sm border border-border bg-surface px-3 py-2 text-[12px] text-text-secondary">
            <ChuSuaDuoc
              khoiRong
              hien={m.nhanXet}
              chuSua={bc?.suaTay?.[khoaNhanXet(m.ma)]}
              chuBanDau={m.nhanXet}
              coGhi={coGhi && !m.nhanXet.startsWith("Ẩn nhận xét")}
              luu={(chu) => void luuSua(khoaNhanXet(m.ma), chu)}
            />
          </div>
        )}
        {m.bang.map((b) => (
          <BangBaoCao
            key={b.ma}
            bang={b}
            tenDuAn={tenDuAn}
            gioiHan={b.ma === "B3" ? undefined : gioiHan}
            suaTay={bc?.suaTay}
            coGhi={coGhi}
            luuSua={(khoa, chu) => void luuSua(khoa, chu)}
          />
        ))}
        {(m.khoiThem ?? []).map((kt) => (
          <div key={kt.ma} className="space-y-1">
            <h3 className="text-[13px] font-normal text-text">{kt.ten}</h3>
            {kt.diem.length === 0 ? (
              <p className="text-[11.5px] text-text-muted">— {kt.lyDoTrong ?? "Chưa có điểm nào."}</p>
            ) : (
              <p className="text-[11.5px] text-text">
                {kt.diem
                  .map((p, i) => `${p.nhan}: ${p.chu ?? fmtSo(p.giaTri)}${i > 0 && p.giaTri !== 0 ? ` (${p.giaTri > 0 ? "lùi" : "sớm"} ${fmtSo(Math.abs(p.giaTri))} ngày so điểm đầu)` : ""}`)
                  .join("  ·  ")}
                <span className="text-text-muted"> ({kt.diem.length}/6 tháng)</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </MucForm>
  );

  return (
    <div className="space-y-4">
      <KhaiHuongDan ma="bct" />
      {/* Hàng ghim: Báo cáo sáng · Báo cáo tháng · Chọn dự án · ⬇ Xuất Excel — cuộn tới cuối báo cáo vẫn đổi được dự án */}
      <div className="thanh-ghim ghim-the-cho ghim-tran-trang -mt-4 flex flex-wrap items-center gap-2 py-2.5">
        {dauHang}
        <div className="relative" data-menu-du-an>
          <button
            type="button"
            disabled={!bcGoc}
            aria-haspopup="menu"
            aria-expanded={moChon}
            onClick={() => setMoChon((v) => !v)}
            className="rounded-sm border border-border bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-text disabled:opacity-50"
          >
            {duAnChon ? tenDuAnChon : "Toàn công ty"} ▾
          </button>
          {moChon && bcGoc && (
            <div role="menu" className="absolute left-0 top-full z-30 mt-1 max-h-[60vh] w-[280px] overflow-y-auto rounded-sm border border-border bg-surface p-1 shadow-card scroll-thin">
              {[{ ma: "", ten: "Toàn công ty" }, ...bcGoc.duAn.map((d) => ({ ma: d.ma, ten: d.ten }))].map((d) => (
                <button
                  key={d.ma || "tat-ca"}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDuAnChon(d.ma);
                    setMoChon(false);
                  }}
                  className={`block w-full rounded-sm px-2.5 py-1.5 text-left text-[12px] hover:bg-accent-soft ${d.ma === duAnChon ? "text-accent" : "text-text"}`}
                >
                  {d.ma === duAnChon ? "✓ " : ""}
                  {d.ten}
                </button>
              ))}
            </div>
          )}
        </div>
        {bc && (
          <ThanhTab
            tabs={[
              { ma: "tong-quan", so: "①", ten: "Tổng quan" },
              { ma: "chi-tiet", so: "②", ten: "Chi tiết" },
              { ma: "kien-nghi", so: "③", ten: "Kiến nghị & kế hoạch" },
            ]}
            chon={tabBc}
            onChon={setTabBc}
            nhan="Các phần của báo cáo tháng"
          />
        )}
      </div>
      {bc && <HopHuongDanTab key={tabBc} nd={HUONG_DAN_BAO_CAO_THANG[tabBc]} />}
      <SectionCard
        title="Bản nháp báo cáo tháng của BQLDA"
        subtitle="Gộp các dự án có dữ liệu vào một file"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={thang}
              onChange={(e) => setThang(Number(e.target.value))}
              className="rounded-sm border border-border bg-surface px-2 py-1 text-[11.5px] text-text"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((t) => (
                <option key={t} value={t}>
                  Tháng {String(t).padStart(2, "0")}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={nam}
              onChange={(e) => setNam(Number(e.target.value))}
              className="w-20 rounded-sm border border-border bg-surface px-2 py-1 text-[11.5px] text-text"
            />
            <button
              type="button"
              disabled={dangChay || !coGhi}
              title={
                coGhi
                  ? "Hỏi lại mọi agent, soạn lại phần 🤖, ghi đè bản đang lưu — bản cũ được giữ để so"
                  : LY_DO_CHAN.ghi
              }
              onClick={() => void chay("lam-lai")}
              className="rounded-sm bg-accent px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-50"
            >
              Làm lại báo cáo
            </button>
            <button
              type="button"
              disabled={dangChay || !bc || laKhung || !coGhi || lyDoChanSoan !== null}
              onClick={() => void chay("soan-nhan-xet")}
              title={
                !coGhi
                  ? LY_DO_CHAN.ghi
                  : lyDoChanSoan !== null
                    ? lyDoChanSoan
                    : !bc || laKhung
                      ? "Làm lại báo cáo trước đã — chưa có số thì không có gì để nhận xét"
                      : "Chỉ soạn lại các ô 🤖 trên bản đang lưu, không hỏi lại agent"
              }
              className="rounded-sm border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent disabled:opacity-50"
            >
              🤖 Soạn nhận xét
            </button>
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            {bc && !laKhung ? (
              <>
                <a
                  className="rounded-sm border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent"
                  href={`/api/bao-cao-thang/xuat?nam=${bc.ky.nam}&thang=${bc.ky.thang}&dinh_dang=xlsx${duAnChon ? `&du_an=${encodeURIComponent(duAnChon)}` : ""}`}
                  title={duAnChon ? `Tải file Excel của ${tenDuAnChon}` : "Tải file Excel toàn công ty"}
                >
                  ⬇ Xuất Excel
                </a>
                <a className={NUT_PHU} href={`/api/bao-cao-thang/xuat?nam=${bc.ky.nam}&thang=${bc.ky.thang}&dinh_dang=md`}>
                  Tải Markdown
                </a>
                <a className={NUT_PHU} href={`/api/bao-cao-thang/xuat?nam=${bc.ky.nam}&thang=${bc.ky.thang}&dinh_dang=nguon`}>
                  Tải phụ lục nguồn
                </a>
              </>
            ) : (
              <span className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-muted opacity-50">⬇ Xuất Excel</span>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          {thongBao && <p className="text-[11.5px] text-text-secondary">{thongBao}</p>}

          {bc && bc.agentKhongHoiDuoc.length > 0 && (
            <div className="rounded-sm border border-border bg-bg2 px-3 py-2 text-[11.5px]">
              <div className="mb-1 text-text">Agent chưa hỏi được</div>
              <ul className="list-disc space-y-0.5 pl-4 text-text-secondary">
                {bc.agentKhongHoiDuoc.map((a) => (
                  <li key={a.maAgent}>
                    <span className="text-text">{a.maAgent}</span> — {a.lyDo}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </SectionCard>

      {bc && (
        <div className="space-y-3">
          {/* Khung giấy A4 — cùng khuôn trang Báo cáo tuần của agent Tiến độ (Mr. Đại 28/10) */}
          <div className="mx-auto w-full max-w-[1000px] rounded border border-border bg-bg2 p-6 shadow-card md:p-9">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[14px] font-bold text-accent">CÔNG TY CỔ PHẦN SCI</div>
                <label className="flex items-center gap-1 text-[11px] text-text-muted">
                  Gửi:
                  <input
                    type="text"
                    defaultValue={dau.noiNhan}
                    key={`noiNhan:${dau.noiNhan}`}
                    disabled={!coGhi}
                    title={coGhi ? "Sửa thẳng tại đây, rời ô là lưu" : LY_DO_CHAN.ghi}
                    placeholder="Ban lãnh đạo Công ty …"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== dau.noiNhan) void luuDau("noiNhan", v);
                    }}
                    className="w-[260px] max-w-full rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11.5px] text-text"
                  />
                </label>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-bold text-red">BÁO CÁO THÁNG</div>
                <label className="mt-1 flex items-center justify-end gap-1 text-[11px] text-text-secondary">
                  Đơn vị lập:
                  <input
                    type="text"
                    defaultValue={dau.donViLap}
                    key={`donViLap:${dau.donViLap}`}
                    disabled={!coGhi}
                    title={coGhi ? "Sửa thẳng tại đây, rời ô là lưu" : LY_DO_CHAN.ghi}
                    placeholder="Ban Quản lý dự án …"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== dau.donViLap) void luuDau("donViLap", v);
                    }}
                    className="w-[220px] max-w-full rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11.5px] text-text"
                  />
                </label>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[auto_1fr] border border-border text-[11.5px]">
              <div className="border-r border-border-light p-2 font-semibold text-accent">Kỳ báo cáo</div>
              <div className="p-2 font-semibold text-text">
                {nhanKyChu(bc.ky)} · {khoangKy(bc.ky, khoangNgay)}
              </div>
            </div>

            {tabBc === "tong-quan" && (
              <>
                <MucForm title="Đầu báo cáo (bảng 1 · 2)">
                  <div className="space-y-5">
                    {bc.dauBaoCao.map((b) => (
                      <BangBaoCao key={b.ma} bang={b} tenDuAn={tenDuAn} />
                    ))}
                  </div>
                </MucForm>
                {bc.muc.filter((m) => m.ma === "I").map((m) => ghepMuc(m))}
              </>
            )}
            {tabBc === "chi-tiet" && bc.muc.filter((m) => ["II", "III", "IV"].includes(m.ma)).map((m) => ghepMuc(m))}
            {tabBc === "kien-nghi" && bc.muc.filter((m) => ["V", "VI"].includes(m.ma)).map((m) => ghepMuc(m))}
          </div>
        </div>
      )}
    </div>
  );
}
