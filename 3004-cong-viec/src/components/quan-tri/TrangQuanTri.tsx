"use client";
// Khung trang Quản trị: thanh bên trong (như hình mẫu kế hoạch) + nội dung từng thẻ. Thẻ nhớ vào ?tab=.
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, FileSpreadsheet, KeyRound, Network, ShieldCheck, Users, FileText } from "lucide-react";
import { TieuDeTrang } from "@/components/layout/TieuDeTrang";
import { useThongBaoNhanh } from "@/components/layout/giao-dien";
import { MaTranQuyen } from "./MaTranQuyen";
import { BangNguoiDung } from "./BangNguoiDung";
import { CayDonVi } from "./CayDonVi";
import { NhapExcel } from "./NhapExcel";

export interface ToiQuanTri {
  id: string;
  la_quan_tri: boolean;
  toan_bo: boolean; // quản lý toàn bộ người dùng
  cap_khoa: boolean;
  quan_ly_mau: boolean;
}

const THE = [
  { khoa: "vai-tro", nhan: "Vai trò và quyền", Icon: ShieldCheck },
  { khoa: "nguoi-dung", nhan: "Người dùng", Icon: Users },
  { khoa: "don-vi", nhan: "Đơn vị", Icon: Network },
  { khoa: "nhap-excel", nhan: "Nhập từ Excel", Icon: FileSpreadsheet },
] as const;
type KhoaThe = (typeof THE)[number]["khoa"];

function NoiDung({ toi }: { toi: ToiQuanTri }) {
  const sp = useSearchParams();
  const router = useRouter();
  const tabUrl = sp.get("tab") as KhoaThe | null;
  const [the, setThe] = useState<KhoaThe>(tabUrl && THE.some((t) => t.khoa === tabUrl) ? tabUrl : "vai-tro");
  const { bao, khung } = useThongBaoNhanh();

  useEffect(() => {
    if (tabUrl && THE.some((t) => t.khoa === tabUrl)) setThe(tabUrl);
  }, [tabUrl]);

  const chon = (k: KhoaThe) => {
    setThe(k);
    router.replace(`/quan-tri?tab=${k}`, { scroll: false });
  };

  const nhanThe = THE.find((t) => t.khoa === the)?.nhan ?? "";

  return (
    <>
      <TieuDeTrang tieuDe="Quản trị hệ thống" moTa={nhanThe} />
      <div className="flex flex-col gap-4 p-5 lg:flex-row">
        <aside className="shrink-0 lg:w-48">
          <div className="rounded border border-border bg-surface p-2">
            <div className="px-2 pb-1 pt-1 text-[9.5px] font-bold uppercase tracking-wider text-accent">Quản trị</div>
            {THE.filter((t) => t.khoa !== "nhap-excel" || toi.toan_bo).map((t) => (
              <button
                key={t.khoa}
                type="button"
                onClick={() => chon(t.khoa)}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12.5px] transition ${
                  the === t.khoa ? "bg-white/5 font-bold text-text" : "text-text-secondary hover:bg-white/5 hover:text-text"
                }`}
              >
                <t.Icon className={`h-4 w-4 ${the === t.khoa ? "text-accent" : "text-text-muted"}`} />
                {t.nhan}
              </button>
            ))}
            <div className="my-1.5 border-t border-border" />
            <Link href="/mau-word" className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[12.5px] text-text-secondary transition hover:bg-white/5 hover:text-text">
              <FileText className="h-4 w-4 text-text-muted" /> Mẫu báo cáo
              <ExternalLink className="ml-auto h-3 w-3 text-text-muted" />
            </Link>
            {(toi.cap_khoa || toi.la_quan_tri) && (
              <Link
                href="/quan-tri/khoa-agent"
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[12.5px] text-text-secondary transition hover:bg-white/5 hover:text-text"
              >
                <KeyRound className="h-4 w-4 text-text-muted" /> Khóa cho agent
                <ExternalLink className="ml-auto h-3 w-3 text-text-muted" />
              </Link>
            )}
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          {the === "vai-tro" && <MaTranQuyen toi={toi} bao={bao} />}
          {the === "nguoi-dung" && <BangNguoiDung toi={toi} bao={bao} donViBanDau={sp.get("don_vi") ?? ""} />}
          {the === "don-vi" && <CayDonVi toi={toi} bao={bao} />}
          {the === "nhap-excel" && <NhapExcel bao={bao} />}
        </div>
      </div>
      {khung}
    </>
  );
}

export function TrangQuanTri({ toi }: { toi: ToiQuanTri }) {
  return (
    <Suspense fallback={<div className="p-5 text-[12px] text-text-muted">Đang mở trang quản trị…</div>}>
      <NoiDung toi={toi} />
    </Suspense>
  );
}
