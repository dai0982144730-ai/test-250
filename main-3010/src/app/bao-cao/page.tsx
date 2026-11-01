// TRANG BÁO CÁO — một mục menu, hai tab Sáng · Tháng
//
// ⭐ 26/09 (Mr. Đại chốt 1a — gọn menu 20/80): demo-agent-main.html vẽ MỘT mục
// "Báo cáo" (navitem data-v="baocao"). Trước ngày này menu có hai mục riêng
// "Báo cáo sáng" và "Báo cáo tháng"; nay gộp, hai đường cũ chuyển hướng về
// đúng tab (/bao-cao-sang → ?tab=sang · /bao-cao-thang → ?tab=thang).
//
//   Tab Sáng  — PLAN-MAIN-AGENT mục 6 (báo cáo 07:00) · mục 7 (nhịp định kỳ)
//               Luật động (xem · thêm · xoá) và nhịp định kỳ CHỈ ở đây — Cài đặt
//               tab 🔔 trỏ tới, không bày lại (chốt 2a, một vấn đề một nơi).
//   Tab Tháng — PLAN-MAIN-AGENT mục 2 (6 mục · 11 bảng) và mục 7 (ngày 1 hằng tháng)
//
// Server component: đọc thẳng kho (node:fs) cho tab đang mở, tab kia không đọc.

import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { BaoCaoSangView } from "@/components/tabs/bao-cao-sang/BaoCaoSangView";
import { BaoCaoThangView } from "@/components/tabs/bao-cao-thang/BaoCaoThangView";
import { gioVn } from "@/lib/gio-vn";
import {
  docBaoCaoNgay,
  docKhoi,
  docLichSu,
  docLuatConHieuLuc,
  docLuatHetHan,
} from "@/lib/bao-cao-sang/kho";
import { GHI_CHU_LUAT, moTaHieuLuc } from "@/lib/bao-cao-sang/luat";
import { ketXuatTelegram, NHIP_DINH_KY } from "@/lib/bao-cao-sang/model";
import { agentCanHoi, docKetQuaNhip, docTrangThaiNhip, khoiDongNhipBaoCaoSang } from "@/lib/bao-cao-sang/dung";
import { trangThaiTelegram } from "@/lib/bao-cao-sang/telegram";
import { docBanNhap, docBanTruoc, docCaiDatDau } from "@/lib/bao-cao-thang/kho";
import { soHaiBan } from "@/lib/bao-cao-thang/model";
import { kyThangTruoc } from "@/lib/bao-cao-thang/dung";
import { boLocMatCuaToi } from "@/lib/agent-mat-tren-main";
import { locBaoCaoSang, locBaoCaoThang, locDuLieuKhoi, lyDoChanSoanNhanXet } from "@/lib/agent-mat-loc";

export const metadata = { title: "Báo cáo — Main Agent" };
export const dynamic = "force-dynamic";

const TAB = [
  { khoa: "sang", nhan: "Báo cáo sáng" },
  { khoa: "thang", nhan: "Báo cáo tháng" },
] as const;
type KhoaTab = (typeof TAB)[number]["khoa"];

export default function BaoCaoPage({ searchParams }: { searchParams: { tab?: string } }) {
  // Vòng nhịp định kỳ bật LƯỜI ở đây và ở route — layout.tsx là file dùng chung
  // của cả 5 agent, phần này cố ý không đụng vào. Mở tab nào cũng bật.
  khoiDongNhipBaoCaoSang();

  const tab: KhoaTab = searchParams.tab === "thang" ? "thang" : "sang";

  return (
    <>
      {/* GD-2: trang CÓ thanh ghim → topmenu cuộn trôi, ghim thế chỗ */}
      <Header title="Báo cáo" helpKey="bao-cao" coGhim />
      <div className="space-y-4 p-5">
        {tab === "sang" ? <TabSang dauHang={hangTab(tab)} /> : (
          <>
            <TabThang dauHang={hangTab(tab)} />
          </>
        )}
      </div>
    </>
  );
}

/** 2 nút Báo cáo sáng · Báo cáo tháng. Tab sáng: đặt ĐẦU hàng nút "ngày · Dựng lại · Gửi ngay…" (Mr. Đại 04/10). */
function hangTab(tab: KhoaTab) {
  return (
        <div className="flex flex-wrap items-center gap-1.5">
          {TAB.map((t) => (
            <Link
              key={t.khoa}
              href={`/bao-cao?tab=${t.khoa}`}
              data-lenh="bao-cao.tab"
              data-gia-tri={t.nhan}
              className={`rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                tab === t.khoa
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
              }`}
            >
              {t.nhan}
            </Link>
          ))}
        </div>
  );
}

async function TabSang({ dauHang }: { dauHang: React.ReactNode }) {
  const ngay = gioVn(new Date()).ngay;
  // ⭐ 05/10 luật agent mật: lọc NGAY TẠI TRANG — dòng Agent Hợp đồng chỉ cho người được thấy hợp đồng dự án đó
  const goc = docBaoCaoNgay(ngay);
  const loc = await boLocMatCuaToi();
  const baoCao = goc ? locBaoCaoSang(goc, loc) : null;
  // ⭐ 17/10/2026 (KE-HOACH/23) — số các khối của ngày, lọc agent mật theo người xem
  const khoi = docKhoi(ngay);
  return (
    <BaoCaoSangView
      dauHang={dauHang}
      banDau={{
        ok: true,
        ngay,
        baoCao,
        chu: baoCao ? ketXuatTelegram(baoCao) : null,
        khoi: khoi ? locDuLieuKhoi(khoi, loc) : null,
        luatConHieuLuc: docLuatConHieuLuc(ngay).map((l) => ({ ...l, moTa: moTaHieuLuc(l) })),
        luatHetHan: docLuatHetHan(ngay).map((l) => ({ ...l, moTa: moTaHieuLuc(l) })),
        lichSu: docLichSu(400).map((b) => ({
          ngay: b.ngay,
          dungLuc: b.dungLuc,
          daGuiLuc: b.daGuiLuc,
          soDong: b.dong.length,
        })),
        telegram: trangThaiTelegram(),
        nhip: [...NHIP_DINH_KY],
        trangThaiNhip: docTrangThaiNhip(),
        ketQuaNhip: docKetQuaNhip(),
        agentSeHoi: agentCanHoi().map((a) => ({ ma: a.ma, ten: a.ten })),
        ghiChuHieuLuc: GHI_CHU_LUAT,
      }}
    />
  );
}

async function TabThang({ dauHang }: { dauHang: React.ReactNode }) {
  // Trang chỉ ĐỌC bản nháp đã lưu. Việc đi hỏi 4 agent là lượt gọi nặng nên để
  // người dùng bấm nút, không chạy lúc mở trang — F5 vài lần là kéo sập cả hệ.
  const ky = kyThangTruoc();
  const { bc: goc, lyDo } = docBanNhap(ky.nam, ky.thang);
  // ⭐ 05/10 luật agent mật: ô / dòng / nhận xét có thông tin hợp đồng lọc theo người xem
  const loc = await boLocMatCuaToi();
  const bc = goc ? locBaoCaoThang(goc, loc) : goc;
  return (
    <BaoCaoThangView
      dauHang={dauHang}
      banDau={bc}
      namBanDau={ky.nam}
      thangBanDau={ky.thang}
      ghiChuBanDau={lyDo}
      lyDoChanSoanBanDau={goc ? lyDoChanSoanNhanXet(goc, loc) : null}
      caiDatDauBanDau={docCaiDatDau()}
      soVoiTruocBanDau={(() => {
        const truoc = goc ? docBanTruoc(ky.nam, ky.thang) : null;
        return goc && truoc && truoc.thoiDiemDung !== goc.thoiDiemDung ? soHaiBan(truoc, goc) : null;
      })()}
    />
  );
}
