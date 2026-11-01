"use client";

// ============================================================
// CÀI ĐẶT MAIN AGENT — NĂM TAB CHUẨN DÙNG CHUNG 5 AGENT (chốt 11/09)
//
//   🔔 Cảnh báo & ngưỡng — Main không có ngưỡng riêng; nhịp định kỳ + luật động
//                            của báo cáo sáng CHỈ ở màn Báo cáo → tab Sáng, tab
//                            này TRỎ tới (chốt 26/09 — một vấn đề một nơi)
//   📁 Quản lý dự án       — bản gốc cả hệ (dự án · toạ độ · từ điển ngữ cảnh)
//   🔌 Kết nối             — Drive · AI · Telegram · Danh bạ agent · Ai được gọi ai
//                            (26/09: màn "Ai được gọi ai" chuyển vào đây, cạnh Danh bạ)
//                            · Giữ sổ hỏi–đáp (26/09: hai mốc 10/35 ngày, HOP-DONG-KET-NOI 7.1)
//   👥 Người dùng & phân quyền
//   📊 Thống kê dùng AI    — 04/10: token + thời gian ngừng theo Ngày/Tuần/Tháng (Quản lý token AI, Đợt 2)
//   🧩 Riêng của agent     — ẨN khi trống (chốt 3a 26/09); Main hiện chưa có gì riêng
//
// ĐÃ BỎ 26/09: thẻ Supabase (không nơi nào dùng) · khối "Dự án trên dàn ngang"
// (TabDanNgang — không ai gọi từ 11/09, dàn ngang lấy thẳng từ 📁).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { DanhBaAgent } from "@/components/tabs/cai-dat-base/DanhBaAgent";
import { TuDienNguCanh } from "@/components/tabs/cai-dat-base/TuDienNguCanh";
// ⭐ 11/09 (Mr. Đại chốt): Main là NƠI DUY NHẤT khai Dự án · Người dùng · Kết nối —
// bốn thẻ lõi này ở Main là BẢN GỐC, 4 agent kia kéo về chỉ đọc.
import { ProjectManagement } from "@/components/tabs/settings/ProjectManagement";
import { ToaDoCongTruong } from "@/components/tabs/settings/ToaDoCongTruong";
import { UserManagement } from "@/components/tabs/settings/UserManagement";
import { DriveConnectionCard } from "@/components/tabs/settings/DriveConnectionCard";
import { AIConnectionCard } from "@/components/tabs/settings/AIConnectionCard";
// Quản lý token AI (Mr. Đại chốt 04/10/2026 — Đợt 2 nhân bản từ agent Công việc)
import { TaiKhoanClaudeCongTy } from "@/components/ai/TaiKhoanClaudeCongTy";
import { ThongKeAI } from "@/components/ai/ThongKeAI";
import { TelegramTroLyCard } from "@/components/telegram-tro-ly/TelegramTroLyCard";
import type { CaiDatBase } from "@/lib/cai-dat-base";
import type { KhaiAgent } from "@/lib/danh-ba-agent";
import { MaTranGoiView } from "@/components/tabs/ma-tran-goi/MaTranGoiView";
import { GiuSoHoiDap } from "@/components/tabs/cai-dat-main/GiuSoHoiDap";
import { KichBanBaoCaoSang } from "@/components/tabs/cai-dat-main/KichBanBaoCaoSang";
import { KhuonDanhSach } from "@/components/tabs/cai-dat-main/KhuonDanhSach";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

// ⭐ 11/09 — NĂM TAB CHUẨN DÙNG CHUNG 5 AGENT (Mr. Đại chốt, khuôn lấy từ tiến độ):
//   🔔 Cảnh báo & ngưỡng · 📁 Quản lý dự án · 🔌 Kết nối · 👥 Người dùng & phân quyền · 🧩 Riêng của agent
// Ở Main, 📁 🔌 👥 là BẢN GỐC (sửa được); ở 4 agent kia ba tab đó chỉ xem, kéo từ Main.
const TAB = [
  { khoa: "canh-bao", nhan: "🔔 Cảnh báo & ngưỡng" },
  { khoa: "du-an", nhan: "📁 Quản lý dự án" },
  { khoa: "ket-noi", nhan: "🔌 Kết nối" },
  { khoa: "nguoi-dung", nhan: "👥 Người dùng & phân quyền" },
  // 04/10 (Mr. Đại chốt): Thống kê dùng AI là TAB RIÊNG ở các agent khác agent Công việc — không để chung tab Kết nối
  { khoa: "thong-ke-ai", nhan: "📊 Thống kê dùng AI" },
  { khoa: "rieng", nhan: "🧩 Riêng của agent" },
] as const;
/**
 * 3a (Mr. Đại chốt 26/09): tab 🧩 ẨN khi trống. Main hiện không có cấu hình
 * riêng nào → false. Ngày có thứ riêng thì bật true và vẽ nội dung ở nhánh "rieng".
 */
const RIENG_CO_NOI_DUNG = true; // 28/10/2026: có «Khuôn danh sách của trợ lý»
const TAB_HIEN = TAB.filter((t) => t.khoa !== "rieng" || RIENG_CO_NOI_DUNG);
type KhoaTab = (typeof TAB)[number]["khoa"];

export interface NguoiDungHien {
  email: string;
  name: string;
  role: string;
  active: boolean;
}

export function CaiDatMainView({ tabBanDau }: { tabBanDau?: string }) {
  // ?tab=ket-noi … — đường cũ /ma-tran-goi, /cau-hinh-chung chuyển về đúng tab
  const [tab, setTab] = useState<KhoaTab>(
    TAB_HIEN.some((t) => t.khoa === tabBanDau) ? (tabBanDau as KhoaTab) : "canh-bao",
  );

  return (
    <div className="space-y-4">
      <div className="rounded-sm border border-accent/40 bg-accent-soft px-3 py-2 text-[11.5px] text-text">
        <b>Main là bản gốc của cả hệ.</b> Dự án · Người dùng & quyền · Kết nối chỉ khai ở đây; bốn agent kia
        kéo về và chỉ đọc (Cài đặt của chúng có nút «↻ Kéo lại từ Main»). Main tắt thì cả hệ dừng khai mới —
        một trong bốn con kia tắt không ảnh hưởng con khác.
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {TAB_HIEN.map((t) => (
          <button
            key={t.khoa}
            type="button"
            onClick={() => setTab(t.khoa)}
            data-lenh="cai-dat-main.tab"
            data-gia-tri={t.nhan}
            className={`rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
              tab === t.khoa
                ? "border-accent/50 bg-accent-soft text-accent"
                : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
            }`}
          >
            {t.nhan}
          </button>
        ))}
      </div>

      {tab === "canh-bao" && (
        <>
          <KhaiHuongDan ma="cd-canh-bao" />
          <TabNhac />
          {/* 25/10/2026 (Mr. Đại): Kịch bản định kỳ + «⚠️ Chưa hỏi được» của báo cáo sáng nằm ở đây */}
          <KichBanBaoCaoSang />
        </>
      )}
      {tab === "du-an" && (
        <div className="space-y-4">
          <KhaiHuongDan ma="cd-du-an" />
          <ProjectManagement />
          {/* 📍 toạ độ công trường — chỉ Main khai (Mr. Đại 11/09), tiến độ kéo về lấy thời tiết */}
          <ToaDoCongTruong />
          {/* 📄 từ điển ngữ cảnh — bản sửa duy nhất chuyển từ Base về Main (Mr. Đại 11/09) */}
          <TuDienNguCanh />
        </div>
      )}
      {tab === "ket-noi" && (
        <div className="space-y-4">
          <KhaiHuongDan ma="cd-ket-noi" />
          <DriveConnectionCard />
          <AIConnectionCard />
          {/* 04/10 — hai tài khoản Claude của công ty (link + dán mã), tự chuyển khi hết hạn mức */}
          <TaiKhoanClaudeCongTy />
          {/* 25/09 — nhắn bot Telegram là hỏi trợ lý Main */}
          <TelegramTroLyCard />
          <TabKetNoi />
          {/* 26/09 — màn "Ai được gọi ai" chuyển vào đây, cạnh Danh bạ agent (cửa Cài đặt).
              Công cụ main.ma_tran_goi 4 agent kéo về giữ nguyên. */}
          <div className="rounded border border-border bg-surface p-4">
            <div className="mb-2.5 text-[13px] font-bold text-text" data-gt="Ai được gọi ai">Ai được gọi ai</div>
            <MaTranGoiView />
          </div>
          {/* 26/09 — hai mốc giữ sổ hỏi–đáp (HOP-DONG-KET-NOI 7.1): cài đặt chung, 4 agent kéo về */}
          <GiuSoHoiDap />
        </div>
      )}
      {tab === "thong-ke-ai" && (
        <>
          <KhaiHuongDan ma="cd-thong-ke-ai" />
          <ThongKeAI />
        </>
      )}
      {tab === "rieng" && (
        <div className="space-y-4">
          <KhuonDanhSach />
        </div>
      )}
      {tab === "nguoi-dung" && (
        <div className="space-y-4">
          <KhaiHuongDan ma="cd-nguoi-dung" />
          <UserManagement />
        </div>
      )}
    </div>
  );
}

// ==========================================================
// TAB 🔔 — CHỈ TRỎ TỚI màn Báo cáo → tab Sáng (chốt 26/09 1a·2a)
// Nhịp định kỳ + luật động ("tuần này theo dõi sát nhà thầu TS"…) xem · thêm ·
// xoá ở ĐÓ — một vấn đề một nơi, Cài đặt không bày lại.
// ==========================================================
function TabNhac() {
  return (
    <div className="rounded border border-border bg-surface p-4 text-[12px] leading-relaxed text-text-secondary">
      <div className="text-[13px] font-bold text-text">Nhắc chủ động của Main</div>
      <p className="mt-1">
        Main không có ngưỡng cảnh báo riêng — số và ngưỡng nằm ở bốn agent kia. Thứ Main tự nhắc là{" "}
        <b className="text-text">báo cáo sáng</b>: nhịp định kỳ (07:00 hằng ngày, ngày 1 hằng tháng…) và
        luật động kiểu <i>«tuần này theo dõi sát nhà thầu TS»</i>. <b className="text-text">Luật động</b> xem · thêm · xoá ở màn Báo cáo (đầu tab Sáng); kịch bản định kỳ và các nguồn chưa hỏi được nằm ngay bên dưới.
      </p>
      <Link
        href="/bao-cao?tab=sang"
        className="mt-2 inline-block rounded-sm border border-accent/50 bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent hover:border-accent"
      >
        Mở Báo cáo → tab Sáng
      </Link>
    </div>
  );
}

// ==========================================================
// TAB ③ — KẾT NỐI: danh bạ 4 cổng MCP (sửa được) + ③b từ điển (chỉ xem)
// ==========================================================
function TabKetNoi() {
  const [danhBa, setDanhBa] = useState<KhaiAgent[] | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [bao, setBao] = useState<string | null>(null);

  const nap = useCallback(async () => {
    const r = await fetch("/api/cai-dat-base", { cache: "no-store" });
    const j = (await r.json()) as { ok: boolean; cauHinh?: CaiDatBase };
    if (j.ok && j.cauHinh) setDanhBa(j.cauHinh.danhBaAgent);
  }, []);
  useEffect(() => {
    void nap();
  }, [nap]);

  const luu = useCallback(async (p: { danhBaAgent: KhaiAgent[] }) => {
    setDangLuu(true);
    setBao(null);
    try {
      const r = await fetch("/api/cai-dat-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const j = (await r.json()) as { ok: boolean; cauHinh?: CaiDatBase; message?: string };
      if (j.ok && j.cauHinh) setDanhBa(j.cauHinh.danhBaAgent);
      else setBao(j.message ?? "Lưu không được");
    } catch {
      setBao("Không gọi được máy chủ");
    } finally {
      setDangLuu(false);
    }
  }, []);

  return (
    <div className="space-y-3">
      {danhBa === null ? (
        <div className="flex items-center gap-2 text-[12px] text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang nạp danh bạ…
        </div>
      ) : (
        <DanhBaAgent danhBa={danhBa} luu={luu} dangLuu={dangLuu} />
      )}
      {bao && <div className="text-[11.5px] font-semibold text-red">{bao}</div>}
    </div>
  );
}


