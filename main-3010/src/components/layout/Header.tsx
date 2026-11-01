"use client";

import { useEffect, useState } from "react";
import { fmtDateFull } from "@/lib/format";
import { nhanTuanHienTai } from "@/lib/tuan-hien-tai";
import { useSessionUser } from "@/lib/use-session";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { NutGiaiThich } from "@/components/giai-thich/GiaiThich";
import { NutHuongDanTren } from "@/components/huong-dan/NutHuongDan";
import { useGonTopmenu } from "@/lib/use-gon-topmenu";
import { UserMenu } from "@/components/layout/UserMenu";
import { NutSangToi } from "@/components/layout/NutSangToi";
import { ChuongCongViec } from "@/components/layout/ChuongCongViec";
import "./nut-tren.css";

// Tuần báo cáo THẬT theo dự án đang mở. Nguồn: /api/tuan-bao-cao → hỏi Agent
// tiến độ `tiendo.tom_tat_du_an` (24/09 — Main không tự đọc báo cáo chép).
interface TuanBaoCaoResp {
  ok: boolean;
  tuan?: string;
  ngay?: string;
  coDuLieu?: boolean;
  ghiChu?: string;
  /** ⭐ QS-073 (27/09): Agent tiến độ chưa trả lời kịp — đang dùng bản cũ (câu tiếng Việt) */
  banCu?: string;
  gioBanCu?: string;
}

export function Header({
  title,
  helpKey,
  coGhim = false,
}: {
  title: string;
  /**
   * GD-2 (Mr. Đại 05/09) cho topmenu trôi ở trang có thanh ghim — Mr. Đại BỎ
   * 03/10/2026 ("topmenu của main cũng bị cuốn, hãy ghim nó lại"): topmenu
   * LUÔN ghim; thanh ghim làm việc dính ngay dưới nó (top: var(--cao-topmenu)).
   * Prop giữ lại để 3 trang đang truyền vào không phải sửa; hiện KHÔNG dùng.
   */
  coGhim?: boolean;
  /**
   * 06/09 — Mr. Đại bỏ nút ❓ Hướng dẫn khỏi topmenu, thay bằng nút Giới thiệu.
   * Prop giữ lại để 18 trang đang truyền vào không phải sửa; hiện KHÔNG dùng.
   */
  helpKey?: string;
}) {
  const user = useSessionUser();
  const pathname = usePathname();
  // 27/09: topmenu một dòng, hẹp thì gọn dần (khung chat neo phải làm hẹp)
  const { ref: topRef, gon } = useGonTopmenu<HTMLElement>();
  const [tuanBC, setTuanBC] = useState<TuanBaoCaoResp | null>(null);

  useEffect(() => {
    let song = true;
    void fetch("/api/tuan-bao-cao", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: TuanBaoCaoResp) => {
        if (song && j.ok) setTuanBC(j);
      })
      .catch(() => undefined);
    return () => {
      song = false;
    };
  }, []);

  // Chú thích ô tuần: báo cáo tuần nào, số liệu đến ngày nào (lấy từ /api/tuan-bao-cao như trước)
  const chuThichTuan = tuanBC?.coDuLieu && tuanBC.tuan
    ? `Tuần báo cáo ${tuanBC.tuan.replace(/^\d{4}-/, "")}${tuanBC.ngay ? ` · dữ liệu đến ${fmtDateFull(tuanBC.ngay)}` : ""}${tuanBC.banCu ? ` · ⏳ số lúc ${tuanBC.gioBanCu ?? "?"} (${tuanBC.banCu})` : ""}`
    : tuanBC?.ghiChu ? `Chưa có số báo cáo — ${tuanBC.ghiChu.slice(0, 80)}` : "Tuần hiện tại";

  return (
    // py-2 (trước là py-3) — lệnh Mr. Đại 02/09: giảm chiều cao top menu
    <header
      ref={topRef}
      data-gon={gon}
      className={`sticky top-0 z-40 nen-ghim flex h-[var(--cao-topmenu)] flex-nowrap items-center justify-between gap-2 border-b border-border px-5 py-2`}
    >
      {/* Mr. Đại chốt 07/10: BỎ chữ tên màn (biết chỗ nhờ mục menu đang sáng); đầu thanh trên = nút "Việc của tôi" + chuông dùng
          chung agent Công việc — như thanh trên agent Công việc. `title` giữ để các trang đang truyền vào không phải sửa. */}
      {/* 14/10/2026: KHÔNG co nhóm này — co lại thì nút «Việc của tôi» tràn ra, đè tên dự án mà máy đo gọn không thấy (điện thoại nằm ngang) */}
      <div className="flex shrink-0 items-center gap-2" data-tieu-de={title}>
        <Link href="/viec-cua-toi" className="nut-tren-cv" data-lenh="topmenu.viec-cua-toi" aria-current={pathname === "/viec-cua-toi" ? "page" : undefined}>
          Việc của tôi
        </Link>
        <ChuongCongViec />
      </div>
      <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
        <ProjectSwitcher />
        {/* 03/10 (Mr. Đại): ô tuần giống agent Công việc 3004 — "Tuần 40 · 28/09–04/10/2026", chỉ hiển thị tuần hiện tại.
            Số liệu báo cáo lấy đến ngày nào thì nằm ở chú thích khi rê chuột (không bỏ thông tin). */}
        <div
          className="nhan-gon-5 flex w-[92px] cursor-default items-center justify-center rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] text-text-secondary"
          data-gt="Tuần hiện tại"
          title={`${nhanTuanHienTai()} · ${chuThichTuan}`}
        >
          <span>{nhanTuanHienTai().split(" · ")[0]}</span>
        </div>
        {/* GIẢI THÍCH — bật lên thì rê/chạm từng chữ có viền chấm là hiện popup
            hướng dẫn đúng chữ đó (Mr. Đại chốt 08/09) */}
        <NutGiaiThich />
        {/* HƯỚNG DẪN — cạnh Giải thích, luôn hiện; sáng cam khi màn / tab / khung đang hiện có hướng dẫn (Mr. Đại 20/10) */}
        <NutHuongDanTren />
        {/* GÓP Ý — giống agent Công việc 3004 (Mr. Đại 03/10): trước menu tên người; ghi kèm màn đang mở để biết góp ý cho chỗ nào */}
        <Link
          href={pathname === "/gop-y" ? "/gop-y" : `/gop-y?tu=${encodeURIComponent(pathname)}`}
          data-lenh="topmenu.gop-y"
          data-gt="Góp ý"
          aria-current={pathname === "/gop-y" ? "page" : undefined}
          title="Góp ý, phản ánh: bất cập bạn gặp, đề xuất cho phần mềm tốt hơn — mọi người cùng đọc, quản trị trả lời"
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11.5px] text-text-secondary transition hover:border-accent hover:text-accent"
        >
          Góp ý
        </Link>
        {/* SÁNG / TỐI — sát bên trái tên người đăng nhập (Mr. Đại 26/10/2026) */}
        <NutSangToi />
        {/* 03/10 (Mr. Đại): chip tên người thành MENU — Giao diện 3D/2D · Skill AI của tôi · Agent quan sát ↗ · Cài đặt · Đổi mật khẩu · Đăng xuất */}
        <UserMenu />
      </div>
    </header>
  );
}
