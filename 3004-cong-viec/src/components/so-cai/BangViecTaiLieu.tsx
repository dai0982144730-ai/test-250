"use client";
// Bảng các việc trong sổ cái sinh từ một tài liệu (kèm tiến độ, nút Kết thúc). Chủ: module so-cai. Props là hợp đồng.
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PhanViec } from "@/lib/types";
import { homNayVN } from "@/lib/so-cai/tien-ich";
import { ChipPhanViec, goiApi, Han, HopKetThuc, TienDo, type DongViecUi } from "./giao-dien";

export interface BangViecTaiLieuProps {
  taiLieuId: string;
}

type DongBang = DongViecUi & { ban_nay: { phien_ban: number | null; trang_thai: string; ly_do: string | null; dong_so: number | null } };

const NHAN_BAN: Record<string, string> = { hien_hanh: "bản này đang dùng", bi_de: "bản này đã bị đè", khong_dung: "bản này không được dùng" };

export function BangViecTaiLieu({ taiLieuId }: BangViecTaiLieuProps) {
  const [ds, setDs] = useState<DongBang[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [ketThuc, setKetThuc] = useState<{ viec: DongBang; phan: PhanViec } | null>(null);

  const tai = useCallback(async () => {
    try {
      setDs((await goiApi<{ viec: DongBang[] }>(`/api/cong-viec/tai-lieu/${encodeURIComponent(taiLieuId)}`)).viec);
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, [taiLieuId]);

  useEffect(() => {
    void tai();
  }, [tai]);

  if (loi) return <div className="text-sm text-red">{loi}</div>;
  if (!ds) return <div className="text-sm text-text-muted"><Loader2 size={14} className="inline animate-spin" /> Đang tải việc trong sổ cái…</div>;
  if (!ds.length) return <div className="text-sm text-text-muted">Tài liệu này chưa sinh việc nào trong sổ cái.</div>;
  const homNay = homNayVN();

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="tbl" style={{ minWidth: 720 }}>
        <thead>
          <tr>
            <th>Công việc</th>
            <th>Phụ trách và phần việc</th>
            <th style={{ width: 110 }}>Hạn</th>
            <th style={{ width: 110 }}>Tiến độ</th>
          </tr>
        </thead>
        <tbody>
          {ds.map((v) => (
            <tr key={v.id}>
              <td className="align-top">
                <Link href={`/cong-viec/${encodeURIComponent(v.id)}`} className="hover:underline">
                  <b className="text-text">{v.id}</b> <span className="text-text">· {v.ten}</span>
                </Link>
                <div className="text-xs text-text-muted">
                  {NHAN_BAN[v.ban_nay.trang_thai] ?? v.ban_nay.trang_thai}
                  {v.ban_nay.ly_do ? `: ${v.ban_nay.ly_do}` : ""}
                  {v.ban_nay.trang_thai !== "hien_hanh" && v.nguon_hien_hanh ? ` · đang dùng ${v.nguon_hien_hanh.nhan}` : ""}
                </div>
              </td>
              <td className="align-top">
                <div className="flex flex-col gap-1">
                  {v.phan_viec.map((p) => (
                    <ChipPhanViec key={p.id} p={p} homNay={homNay} coTheKetThuc={!!v.co_the_ket_thuc?.includes(p.id)} onKetThuc={() => setKetThuc({ viec: v, phan: p })} />
                  ))}
                </div>
              </td>
              <td className="align-top">
                <Han v={v} />
              </td>
              <td className="align-top">
                <TienDo tienDo={v.tien_do} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ketThuc ? (
        <HopKetThuc
          congViecId={ketThuc.viec.id}
          phan={ketThuc.phan}
          onDong={() => setKetThuc(null)}
          onXong={() => {
            setKetThuc(null);
            void tai();
          }}
        />
      ) : null}
    </div>
  );
}
