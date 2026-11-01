"use client";
// Form 0: TGĐ quyết định các dòng "Nội dung cần TGĐ quyết định" → giao việc (cấp 1). Chủ: module so-cai. Props là hợp đồng.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Gavel, Loader2 } from "lucide-react";
import type { DongCongViec } from "@/lib/types";
import { ngayNgan } from "@/lib/so-cai/tien-ich";
import { goiApi, napDanhMuc, type DanhMuc } from "./giao-dien";
import { HopGiaoViec, type NoiDungGiaoViec } from "./HopGiaoViec";

export interface QuyetDinhGiaoViecProps {
  taiLieuId: string;
  phienBan: number;
  onDaGiao?: (maViec: string) => void;
}

interface DongQd {
  dong: DongCongViec;
  da_giao: string | null;
  goi_y: { cong_viec_id: string; ten: string; do_giong: number }[];
}

interface KetQua {
  ten_tai_lieu: string;
  nhan: string;
  dong: DongQd[];
  co_the_giao: boolean;
}

export function QuyetDinhGiaoViec({ taiLieuId, phienBan, onDaGiao }: QuyetDinhGiaoViecProps) {
  const [kq, setKq] = useState<KetQua | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dm, setDm] = useState<DanhMuc | null>(null);
  const [mo, setMo] = useState<DongQd | null>(null);

  const tai = useCallback(async () => {
    try {
      setKq(await goiApi<KetQua>(`/api/cong-viec/quyet-dinh?tai_lieu_id=${encodeURIComponent(taiLieuId)}&phien_ban=${phienBan}`));
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, [taiLieuId, phienBan]);

  useEffect(() => {
    void tai();
    napDanhMuc().then(setDm).catch(() => undefined);
  }, [tai]);

  if (loi) return <div className="text-sm text-red">{loi}</div>;
  if (!kq) return <div className="text-sm text-text-muted"><Loader2 size={14} className="inline animate-spin" /> Đang đọc nội dung cần TGĐ quyết định…</div>;

  const banDau = (d: DongQd): Partial<NoiDungGiaoViec> => ({
    ten: d.dong.ten,
    du_an: d.dong.du_an ?? "",
    hang_muc: d.dong.hang_muc ?? "",
    ket_qua_can_co: d.dong.ket_qua_can_co ?? "",
    cong_viec_id: d.dong.ma_viec ?? d.goi_y[0]?.cong_viec_id ?? "",
    phan_viec: (d.dong.phu_trach ?? []).map((p) => ({ phu_trach: p, noi_dung: p.noi_dung ?? "", bat_dau: d.dong.bat_dau ?? "", ket_thuc: d.dong.ket_thuc ?? "" })),
  });

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-text">Nội dung cần TGĐ quyết định</div>
      {!kq.dong.length ? <div className="text-sm text-text-muted">Phiên bản này không có dòng nào cần quyết định.</div> : null}
      {kq.dong.map((d) => (
        <div key={d.dong.dong_so} className="flex flex-wrap items-start justify-between gap-3 rounded-sm border border-border px-3 py-2 text-sm">
          <div className="min-w-0 flex-1">
            <div className="text-text">
              {d.dong.dong_so}. {d.dong.ten}
            </div>
            {(d.dong as { mo_ta?: string }).mo_ta ? <div className="text-xs text-text-secondary">{(d.dong as { mo_ta?: string }).mo_ta}</div> : null}
            <div className="text-xs text-text-muted">
              {[
                d.dong.du_an,
                (d.dong.phu_trach ?? []).map((p) => p.ten).join(", "),
                d.dong.ket_thuc ? `hạn ${ngayNgan(d.dong.ket_thuc, true)}` : null,
                // Mẫu Form 0 thật: cột "Hạn quyết định" (hạn TGĐ quyết, không phải hạn việc)
                (d.dong as { han_quyet_dinh?: string }).han_quyet_dinh ? `hạn quyết định ${ngayNgan((d.dong as { han_quyet_dinh?: string }).han_quyet_dinh!, true)}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              {!d.da_giao && d.goi_y.length ? ` · có vẻ trùng ${d.goi_y[0].cong_viec_id}` : ""}
            </div>
          </div>
          {d.da_giao ? (
            <Link href={`/cong-viec/${encodeURIComponent(d.da_giao)}`} className="whitespace-nowrap text-green hover:underline">
              Đã giao · {d.da_giao}
            </Link>
          ) : kq.co_the_giao ? (
            <button
              type="button"
              onClick={() => setMo(d)}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-sm bg-accent px-3 py-1 text-white hover:bg-accent-hover"
            >
              <Gavel size={14} /> Quyết định, giao việc
            </button>
          ) : (
            <span className="whitespace-nowrap text-xs text-text-muted">Chờ Tổng Giám đốc quyết định</span>
          )}
        </div>
      ))}
      {mo ? (
        <HopGiaoViec
          dm={dm}
          tieuDe="Quyết định, giao việc"
          nutGui="Quyết định, giao việc"
          banDau={banDau(mo)}
          goiY={mo.goi_y}
          onDong={() => setMo(null)}
          gui={async (v) =>
            (
              await goiApi<{ ma_viec: string }>("/api/cong-viec/quyet-dinh", {
                ...v,
                tai_lieu_id: taiLieuId,
                phien_ban: phienBan,
                dong_so: mo.dong.dong_so,
              })
            ).ma_viec
          }
          onXong={(ma) => {
            setMo(null);
            onDaGiao?.(ma);
            void tai();
          }}
        />
      ) : null}
    </div>
  );
}
