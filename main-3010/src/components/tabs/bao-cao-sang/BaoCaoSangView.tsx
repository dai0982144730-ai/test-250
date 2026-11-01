"use client";

// ============================================================
// MÀN BÁO CÁO SÁNG — PLAN-MAIN-AGENT mục 6 (báo cáo) · mục 7 (nhịp)
//
// Bốn khối, theo đúng thứ tự người dùng cần:
//   ① Thanh ghim: dựng lại · gửi Telegram · trạng thái token
//   ② Luật động — xem và xoá được, không có luật ẩn (6.2)
//   ③ Bản báo cáo khung ba phần (6.3)
//   ④ Nhịp định kỳ của mục 7 — chạy tay được để nhìn thấy nó chạy
// ============================================================

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SectionCard, InfoBox } from "@/components/common/SectionCard";
import { ThanhTab } from "@/components/common/ThanhTab";
import { KhoiLuat, type LuatHienThi } from "./KhoiLuat";
import { KhoiNguoiNhan } from "./KhoiNguoiNhan";
import type { BaoCaoSang, NhipDinhKy } from "@/lib/bao-cao-sang/model";
import type { DuLieuKhoi } from "@/lib/bao-cao-sang/khoi-du-lieu";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";
import ONhapNgay from "@/components/common/ONhapNgay";
import { ngayGioVN, ngayTrongChu, ngayVN } from "@/lib/ngay-hien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface TrangThaiTelegram {
  daCauHinh: boolean;
  tokenCheBot: string | null;
  chatId: string | null;
  huongDan: string;
}

interface DuLieuMan {
  ok: boolean;
  ngay: string;
  baoCao: BaoCaoSang | null;
  chu: string | null;
  /** ⭐ 17/10/2026 — số các khối của ngày (đã lọc agent mật theo người xem); null = chưa gom */
  khoi?: DuLieuKhoi | null;
  luatConHieuLuc: LuatHienThi[];
  luatHetHan: LuatHienThi[];
  lichSu: { ngay: string; dungLuc: string; daGuiLuc: string | null; soDong: number }[];
  telegram: TrangThaiTelegram;
  nhip: NhipDinhKy[];
  trangThaiNhip: Record<string, string>;
  /** Lần chạy gần nhất từng nhịp — loi ≠ null thì hiện câu lỗi (kiểm độc lập 04/10 🟡4) */
  ketQuaNhip?: Record<string, { ngay: string; luc: string; loi: string | null; tomTat: string }>;
  agentSeHoi: { ma: string; ten: string }[];
  ghiChuHieuLuc: string;
}

type TabSang = "sang" | "nguoi";

export function BaoCaoSangView({ banDau, dauHang }: { banDau: DuLieuMan; /** 2 nút Báo cáo sáng · tháng — đứng đầu hàng nút (Mr. Đại 04/10) */ dauHang?: ReactNode }) {
  const [d, setD] = useState<DuLieuMan>(banDau);
  const [ngay, setNgay] = useState(banDau.ngay);
  const [dangChay, setDangChay] = useState<string | null>(null);
  const [tab, setTab] = useState<TabSang>("sang");
  const [moGui, setMoGui] = useState(false);
  // Nút gọi AI / ghi = cửa "ghi" (quyen.ts) — Người xem thấy nút MỜ kèm lý do (luật 17)
  const coGhi = duocGhi(useSessionUser()?.role);
  const [bao, setBao] = useState<string | null>(null);
  // ⭐ 04/10 — số người sẽ nhận (khối Người nhận báo lên), để nút gửi nói rõ gửi cho mấy người
  const [soNguoiNhan, setSoNguoiNhan] = useState<number | null>(null);
  const [soDaNhan, setSoDaNhan] = useState(0);
  const baoSoNguoi = useCallback((n: number, daNhan: number) => {
    setSoNguoiNhan(n);
    setSoDaNhan(daNhan);
  }, []);

  const lamMoi = useCallback(
    async (n: string) => {
      try {
        const r = await fetch(`/api/bao-cao-sang?ngay=${encodeURIComponent(n)}`, {
          cache: "no-store",
        });
        const j = (await r.json()) as DuLieuMan;
        if (j.ok) setD(j);
      } catch {
        // Giữ nguyên dữ liệu cũ trên màn — mất một lần làm mới không đáng hoảng
      }
    },
    [],
  );

  useEffect(() => {
    if (ngay !== d.ngay) void lamMoi(ngay);
  }, [ngay, d.ngay, lamMoi]);

  // Menu «Gửi»: bấm ra ngoài hoặc Esc thì đóng
  useEffect(() => {
    if (!moGui) return;
    const ngoai = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest("[data-menu-gui]")) setMoGui(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMoGui(false);
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", esc);
    };
  }, [moGui]);

  // Dựng lại mất khoảng 90–110 giây: đếm giây ngay trên nút để biết máy đang chạy, không bấm lần hai
  const [giayDung, setGiayDung] = useState(0);
  useEffect(() => {
    if (dangChay !== "dung") {
      setGiayDung(0);
      return;
    }
    const t = setInterval(() => setGiayDung((g) => g + 1), 1000);
    return () => clearInterval(t);
  }, [dangChay]);

  async function goiHanhDong(hanhDong: string, ma?: string) {
    setDangChay(ma ?? hanhDong);
    setBao(null);
    try {
      const r = await fetch("/api/bao-cao-sang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hanhDong, ngay, ma }),
      });
      const j = (await r.json()) as { message?: string; tomTat?: string };
      setBao(j.tomTat ?? j.message ?? "Xong.");
      await lamMoi(ngay);
    } catch {
      setBao("Không gọi được máy chủ — thử lại.");
    } finally {
      setDangChay(null);
    }
  }

  return (
    <div className="space-y-4">
      <KhaiHuongDan ma="bcs" />
      {/* ① Thanh ghim */}
      {/* Mr. Đại 04/10: hàng "ngày · Dựng lại · Gửi ngay…" đưa lên NGANG HÀNG 2 nút Báo cáo sáng · Báo cáo tháng */}
      <div className="thanh-ghim ghim-the-cho ghim-tran-trang -mt-4 flex flex-wrap items-center gap-2 py-2.5">
        {dauHang}
        <ONhapNgay
          value={ngay}
          onChange={(v) => setNgay(v)}
          className="rounded-sm border border-border bg-surface px-2 py-1 text-[11.5px] text-text"
        />
        <button
          type="button"
          disabled={dangChay !== null || !coGhi}
          title={coGhi ? undefined : LY_DO_CHAN.ghi}
          data-gt="Nút Dựng lại"
          onClick={() => void goiHanhDong("dung")}
          className="rounded-sm border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent transition disabled:opacity-50"
        >
          {dangChay === "dung" ? `Đang dựng… ${giayDung} giây (thường 90–110 giây)` : "Dựng lại"}
        </button>
        {/* 28/10/2026 (Mr. Đại, đợt 2): «Gửi ngay» + «Gửi lại» gộp MỘT nút «Gửi» có menu — bấm chọn là chạy và đóng luôn.
            Gửi cho người chưa nhận = bỏ qua người đã nhận bản ngày này (chống gửi trùng lên lãnh đạo, chốt 04/10);
            Gửi lại = cả người đã nhận, dùng khi dựng lại bản sau khi sửa số liệu. */}
        <div className="relative" data-menu-gui>
          <button
            type="button"
            disabled={dangChay !== null || !coGhi}
            title={coGhi ? undefined : LY_DO_CHAN.ghi}
            data-gt="Nút Gửi"
            aria-haspopup="menu"
            aria-expanded={moGui}
            onClick={() => setMoGui((v) => !v)}
            className="rounded-sm border border-border bg-surface px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-text disabled:opacity-50"
          >
            {dangChay === "gui" ? "Đang gửi…" : dangChay === "gui-lai" ? "Đang gửi lại…" : "Gửi ▾"}
          </button>
          {moGui && (
            <div role="menu" className="absolute left-0 top-full z-30 mt-1 w-[300px] rounded-sm border border-border bg-surface p-1 shadow-card">
              <button
                type="button"
                role="menuitem"
                data-gt="Nút Gửi cho người chưa nhận"
                onClick={() => {
                  setMoGui(false);
                  void goiHanhDong("gui");
                }}
                className="block w-full rounded-sm px-2.5 py-1.5 text-left text-[12px] text-text hover:bg-accent-soft"
              >
                {soNguoiNhan && soNguoiNhan > soDaNhan
                  ? `Gửi cho ${soNguoiNhan - soDaNhan} người chưa nhận`
                  : "Gửi cho người chưa nhận"}
                <span className="block text-[11px] text-text-muted">Bỏ qua người đã nhận bản ngày này</span>
              </button>
              <button
                type="button"
                role="menuitem"
                data-gt="Nút Gửi lại"
                disabled={soDaNhan === 0}
                title={soDaNhan === 0 ? "Hôm nay chưa ai nhận bản này — dùng «Gửi cho người chưa nhận»" : undefined}
                onClick={() => {
                  setMoGui(false);
                  void goiHanhDong("gui-lai");
                }}
                className="block w-full rounded-sm px-2.5 py-1.5 text-left text-[12px] text-text hover:bg-accent-soft disabled:opacity-50"
              >
                Gửi lại cho cả {soNguoiNhan ?? 0} người
                <span className="block text-[11px] text-text-muted">Kể cả {soDaNhan} người đã nhận — dùng sau khi dựng lại bản đã sửa số</span>
              </button>
            </div>
          )}
        </div>
        {/* Mr. Đại 04/10: xoá chữ "Telegram đã cấu hình · …" và "Sẽ hỏi N agent đang bật: …" (Telegram chưa cấu hình
            vẫn có hộp báo riêng ngay dưới) */}
      </div>

      {/* Kiểm độc lập 04/10 🟡4 — 07:00 hôm nay hỏng thì nói ra, không im lặng (6.3) */}
      {d.ketQuaNhip?.["gui-bao-cao-sang"]?.loi && d.ketQuaNhip["gui-bao-cao-sang"].ngay === d.ngay && (
        <p className="text-[12px] text-red">
          ⚠ Lần gửi báo cáo sáng {ngayGioVN(new Date(d.ketQuaNhip["gui-bao-cao-sang"].luc))} hỏng:{" "}
          {d.ketQuaNhip["gui-bao-cao-sang"].loi}
        </p>
      )}

      {bao && (
        <p className="rounded-sm border border-accent/30 bg-accent-soft px-3 py-2 text-[12px] text-accent">
          {bao}
        </p>
      )}

      {!d.telegram.daCauHinh && (
        <InfoBox title="📮 Telegram chưa cấu hình">
          {d.telegram.huongDan} — <b className="text-text">Đây không phải lỗi</b>: báo cáo vẫn được
          dựng và lưu, chỉ chưa tự nhắn đi được.
        </InfoBox>
      )}

      {/* 25/10/2026 (Mr. Đại chốt): Báo cáo sáng chia 3 tab — ① bản của CHÍNH MÌNH (3 cột cố định vừa một màn hình)
          · ② Người nhận · ③ Bản máy dựng. Luật động nằm ĐẦU tab ①, thường co lại. «Lịch sử báo cáo» bỏ khỏi màn;
          «Kịch bản định kỳ» + «⚠️ Chưa hỏi được» chuyển sang Cài đặt → 🔔 Cảnh báo & ngưỡng. */}
      <div>
      <ThanhTab
        tabs={[
          { ma: "sang" as TabSang, so: "①", ten: "Báo cáo sáng của tôi" },
          { ma: "nguoi" as TabSang, so: "②", ten: "Người nhận", viec: soNguoiNhan === null ? undefined : soNguoiNhan === 0 ? 1 : 0 },
        ]}
        chon={tab}
        onChon={setTab}
        nhan="Các phần của báo cáo sáng"
      />
      </div>

      {tab === "sang" && (
        <div className="space-y-3">
          <KhoiLuat
            conHieuLuc={d.luatConHieuLuc}
            hetHan={d.luatHetHan}
            ghiChu={d.ghiChuHieuLuc}
            onLamMoi={() => void lamMoi(ngay)}
          />
          {/* 28/10/2026 (Mr. Đại): KHÔNG khoá/ghim khi cuộn — trang chỉ cao đúng một màn hình, lấy bề cao khung điện thoại làm chuẩn
              (544px = 640px cũ giảm 15%); ba cột bằng nhau, cột nào dài thì có thanh trượt riêng */}
          <div className="lg:h-[544px]">
            <KhoiNguoiNhan cheDo="bao-cao" bc={d.baoCao} khoi={d.khoi ?? null} coGhi={coGhi} onSoNguoiNhan={baoSoNguoi} onTaiLaiSo={() => void lamMoi(ngay)} />
          </div>
        </div>
      )}

      {tab === "nguoi" && (
        <KhoiNguoiNhan bc={d.baoCao} khoi={d.khoi ?? null} coGhi={coGhi} onSoNguoiNhan={baoSoNguoi} onTaiLaiSo={() => void lamMoi(ngay)} />
      )}

    </div>
  );
}
