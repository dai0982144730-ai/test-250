"use client";
// Nhóm "Quy tắc đè, luôn mở": xem TRƯỚC KHI LƯU các việc đang mở sẽ đổi khi bật "Áp dụng lại cho việc đang mở khi đổi cài đặt"
// (GET /api/so-cai/ap-dung-lai?… theo giá trị định lưu), và nút "Áp dụng lại ngay" (POST, theo cấu hình hiện hành).
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { CauHinh } from "@/lib/cau-hinh/mac-dinh";
import { HopLoi, HopThoai, LoiApi, Nut, goiApi, ngay } from "@/components/layout/giao-dien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

type QuyTacDe = CauHinh["quy_tac_de"];

/** Trường làm đổi thứ tự thắng/thua (giống TRUONG_ANH_HUONG trong src/lib/so-cai/ap-dung-lai.ts). */
export const TRUONG_ANH_HUONG = ["thu_tu", "ngay_sau_tinh_theo", "da_xong_luon_ghi_nhan"] as const;

export interface ViecApDungLai {
  cong_viec_id: string;
  ten: string;
  loai: "doi_nguon" | "ghi_nhan_da_xong";
  nguon_cu: { id: string; nhan: string } | null;
  nguon_moi: { id: string; nhan: string } | null;
  ly_do: string;
  han_cu: string | null;
  han_moi: string | null;
  ten_moi?: string;
  them_phan_viec: string[];
  bo_phan_viec: string[];
  ghi_nhan_da_xong: { phan_viec_id: string; phu_trach: string; tu: string }[];
  hoan_thanh?: boolean;
}

export interface KetQuaApDungLai {
  so_viec: number;
  viec: ViecApDungLai[];
}

export function doiThuTu(cu: Partial<QuyTacDe> | null | undefined, moi: Partial<QuyTacDe> | null | undefined): boolean {
  return TRUONG_ANH_HUONG.some((t) => (cu?.[t] ?? null) !== (moi?.[t] ?? null));
}

export function thamSoXemTruoc(v: Partial<QuyTacDe>): string {
  const sp = new URLSearchParams();
  for (const t of TRUONG_ANH_HUONG) if (v[t] !== undefined && v[t] !== null) sp.set(t, String(v[t]));
  return sp.toString();
}

/** Xem trước theo giá trị định lưu. `xong` = đã có kết quả (hoặc lỗi) cho đúng giá trị hiện tại. */
export function useXemTruocApDungLai(bat: boolean, v: Partial<QuyTacDe> | null | undefined) {
  const khoa = bat && v ? thamSoXemTruoc(v) : "";
  const [kq, setKq] = useState<{ khoa: string; du_lieu?: KetQuaApDungLai; loi?: string; cam?: boolean } | null>(null);
  useEffect(() => {
    if (!khoa) return;
    let huy = false;
    const t = window.setTimeout(async () => {
      try {
        const r = await goiApi<KetQuaApDungLai>(`/api/so-cai/ap-dung-lai?${khoa}`);
        if (!huy) setKq({ khoa, du_lieu: r });
      } catch (e) {
        if (!huy) setKq({ khoa, loi: e instanceof Error ? e.message : "Không xem trước được", cam: e instanceof LoiApi && e.status === 403 });
      }
    }, 250);
    return () => {
      huy = true;
      window.clearTimeout(t);
    };
  }, [khoa]);
  const hienTai = kq && kq.khoa === khoa ? kq : null;
  return { dangXem: !!khoa && !hienTai, ket_qua: hienTai?.du_lieu ?? null, loi: hienTai?.loi ?? null, cam: !!hienTai?.cam };
}

export function BangApDungLai({ kq }: { kq: KetQuaApDungLai }) {
  if (kq.viec.length === 0) return <p className="text-[11.5px] text-text-muted">Không việc đang mở nào đổi nguồn hay hạn theo quy tắc mới.</p>;
  return (
    <div className="scroll-thin max-h-[320px] overflow-auto">
      <table className="tbl">
        <thead>
          <tr>
            <th>Mã việc</th>
            <th>Nguồn cũ → mới</th>
            <th>Hạn cũ → mới</th>
            <th>Lý do</th>
          </tr>
        </thead>
        <tbody>
          {kq.viec.map((v) => (
            <tr key={v.cong_viec_id}>
              <td className="whitespace-nowrap">
                <Link href={`/so-do?viec=${encodeURIComponent(v.cong_viec_id)}`} className="font-mono text-[11px] text-accent hover:underline" target="_blank">
                  {v.cong_viec_id}
                </Link>
                <div className="max-w-[220px] truncate text-[10.5px] text-text-muted" title={v.ten}>
                  {v.ten_moi && v.ten_moi !== v.ten ? `${v.ten} → ${v.ten_moi}` : v.ten}
                </div>
              </td>
              <td className="text-[11px]">
                {v.loai === "ghi_nhan_da_xong" ? (
                  <span className="text-green">Ghi nhận đã xong{v.hoan_thanh ? " — việc hoàn thành" : ""}</span>
                ) : (
                  <>
                    <span className="text-text-muted line-through">{v.nguon_cu?.nhan ?? "(không)"}</span> → <span className="text-text">{v.nguon_moi?.nhan ?? "(không)"}</span>
                  </>
                )}
              </td>
              <td className="whitespace-nowrap text-[11px]">
                {v.han_cu === v.han_moi ? (
                  <span className="text-text-muted">{v.han_cu ? ngay(v.han_cu) : "luôn mở"}</span>
                ) : (
                  <>
                    <span className="text-text-muted line-through">{v.han_cu ? ngay(v.han_cu) : "luôn mở"}</span> →{" "}
                    <span className="text-accent">{v.han_moi ? ngay(v.han_moi) : "luôn mở"}</span>
                  </>
                )}
              </td>
              <td className="max-w-[260px] text-[10.5px] text-text-muted">{v.ly_do}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Khung xem trước hiện ngay trên biểu mẫu khi người dùng đổi một trong 4 trường và công tắc đang bật. */
export function KhungXemTruoc({ xt }: { xt: ReturnType<typeof useXemTruocApDungLai> }) {
  return (
    <div className="mb-4 rounded-sm border border-yellow/40 bg-bg p-3">
      <div className="mb-1.5 text-[12px] font-bold text-yellow">
        {xt.dangXem
          ? "Đang tính các việc đang mở sẽ đổi…"
          : xt.ket_qua
            ? `Khi lưu, hệ thống áp dụng lại cho ${xt.ket_qua.so_viec} việc đang mở`
            : "Chưa xem trước được danh sách việc sẽ đổi"}
      </div>
      {xt.ket_qua && <BangApDungLai kq={xt.ket_qua} />}
      {xt.loi && (
        <p className="text-[11px] text-text-muted">
          {xt.loi}
          {xt.cam ? " — vẫn lưu được; hệ thống vẫn áp dụng lại khi lưu." : ""}
        </p>
      )}
    </div>
  );
}

/** Nút "Áp dụng lại ngay" theo cấu hình ĐANG LƯU (quyền cau_hinh.sua): xem trước → xác nhận → chạy. */
export function NutApDungLaiNgay({ bao, sauKhi }: { bao: (c: string, t?: boolean) => void; sauKhi?: () => void }) {
  const [mo, setMo] = useState(false);
  const [kq, setKq] = useState<KetQuaApDungLai | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);

  async function moHop() {
    setMo(true);
    setKq(null);
    setLoi(null);
    try {
      setKq(await goiApi<KetQuaApDungLai>("/api/so-cai/ap-dung-lai"));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không xem trước được");
    }
  }

  async function chay() {
    setDang(true);
    try {
      const r = await goiApi<KetQuaApDungLai>("/api/so-cai/ap-dung-lai", { body: {} });
      bao(`Đã áp dụng lại quy tắc đè cho ${r.so_viec} việc đang mở`);
      setMo(false);
      sauKhi?.();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không áp dụng lại được");
    } finally {
      setDang(false);
    }
  }

  return (
    <>
      <Nut nho kieu="nhat" onClick={() => void moHop()} title="Tính lại mọi việc đang mở theo quy tắc đè đang lưu">
        <RefreshCw className="h-3.5 w-3.5" /> Áp dụng lại ngay
      </Nut>
      {mo && (
        <HopThoai
          tieuDe="Áp dụng lại quy tắc đè cho việc đang mở"
          dong={() => setMo(false)}
          rong="max-w-[860px]"
          chan={
            <>
              <Nut onClick={() => setMo(false)}>Hủy</Nut>
              <Nut kieu="chinh" disabled={dang || !kq || kq.so_viec === 0} onClick={() => void chay()}>
                {dang ? "Đang áp dụng…" : `Áp dụng cho ${kq?.so_viec ?? 0} việc`}
              </Nut>
            </>
          }
        >
          <KhaiHuongDan ma="cd-ap-dung-lai-ngay" uuTien={2} />
          <p className="mb-2 text-[12px] text-text-secondary">Theo quy tắc đè đang lưu. Mỗi việc đổi được ghi vào lịch sử.</p>
          {!kq && !loi && <p className="text-[12px] text-text-muted">Đang tính…</p>}
          <HopLoi loi={loi} />
          {kq && <BangApDungLai kq={kq} />}
        </HopThoai>
      )}
    </>
  );
}
