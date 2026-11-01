"use client";

// ============================================================
// Ô GIAO VIỆC KHI BẤM "SỬA" — giống ô dấu + ở Sơ đồ tổ chức (lớp form-giao), AI/máy điền sẵn mọi ô, người sửa rồi bấm Giao việc.
// MỘT bản cho mọi khối giao việc theo gợi ý ở agent này: cây việc (KhoiGiao) · màn Issue (KhoiSoanViec) — khuôn chung
// Mr. Đại chốt 04/10/2026 chiều. Màn có khu trái/phải → ô hiện ngay ở khu phải (tại chỗ), không popup.
// ============================================================

import type { ReactNode } from "react";
import { khoangNgay } from "@/lib/phong/tuan";
import ONhapNgay from "@/components/common/ONhapNgay";
import { OChonNoiNhan, type NguoiNhanCV } from "./OChonNoiNhan";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

/** Danh sách nơi nhận (route /api/cay-viec/soan-giao ds_nguoi) — kèm nhóm cho ô "Giao cho" 2 trong 1 (chốt 04/10 tối) */
export type DanhBaGiao = NguoiNhanCV;

export function OGiaoSua({
  tieuDe,
  ds,
  tenGoiY,
  fGiao,
  setFGiao,
  duAnTen,
  fTen,
  setFTen,
  fKq,
  setFKq,
  fHan,
  setFHan,
  kep,
  homNay,
  thieu,
  dangGui,
  dangTaiTep,
  onGiao,
  onHuy,
  lenh,
  gt,
}: {
  tieuDe: string;
  ds: DanhBaGiao | null;
  /** Tên hiện tạm khi danh bạ chưa về */
  tenGoiY: string;
  /** "nguoi|id" | "don_vi|id" */
  fGiao: string;
  setFGiao: (v: string) => void;
  duAnTen: string;
  fTen: string;
  setFTen: (v: string) => void;
  fKq: string;
  setFKq: (v: string) => void;
  /** ISO yyyy-mm-dd */
  fHan: string;
  setFHan: (v: string) => void;
  kep: { nut: ReactNode; ds: ReactNode };
  homNay: string;
  /** Chữ lý do khi chưa đủ (rỗng = đủ) */
  thieu: string;
  dangGui: boolean;
  dangTaiTep: boolean;
  onGiao: () => void;
  onHuy: () => void;
  /** data-lenh nút Giao việc */
  lenh: string;
  /** tiền tố data-gt */
  gt: string;
}) {
  return (
    <div className="form-giao !p-0" data-gt={`${gt}:sua-giao`}>
      <KhaiHuongDan ma="cay-viec-o-giao-sua" uuTien={3} />
      <div className="text-[10.5px] font-bold uppercase tracking-wider text-accent">{tieuDe}</div>
      <label>
        Giao cho
        {/* Ô Giao cho (Mr. Đại chốt 04/10 tối): bấm = Ban lãnh đạo + đơn vị · gõ @ = chọn theo tên người — chỉ nơi mình giao được */}
        <OChonNoiNhan ds={ds} loiDs={ds ? null : tenGoiY || "Đang tải danh bạ…"} value={fGiao} onChange={setFGiao} giaTri="loai|id" />
      </label>
      <label title="Việc gắn dự án này — không đổi dự án">
        Thuộc dự án
        <select value="da" disabled>
          <option value="da">{duAnTen}</option>
        </select>
      </label>
      <label htmlFor={`${gt}-sua-noi-dung`}>
        Nội dung việc
        <div className="hang-kep">
          <textarea id={`${gt}-sua-noi-dung`} value={fTen} onChange={(e) => setFTen(e.target.value)} placeholder="Việc cần làm…" />
          {kep.nut}
        </div>
        {kep.ds}
      </label>
      <label>
        Kết quả cần có
        <textarea value={fKq} onChange={(e) => setFKq(e.target.value)} rows={4} placeholder="Ví dụ: tờ trình gửi TGĐ" />
      </label>
      <label>
        Hạn
        <ONhapNgay value={fHan} onChange={setFHan} aria-label="Hạn" />
      </label>
      {fHan && fHan >= homNay && <div className="nho">{khoangNgay(homNay, fHan)}</div>}
      <div>
        <button type="button" className="nut chinh" data-lenh={lenh} data-gt={`${gt}:giao-viec-da-sua`} disabled={!!thieu || dangGui || dangTaiTep} onClick={onGiao}>
          {dangGui ? "Đang giao…" : "Giao việc"}
        </button>{" "}
        <button type="button" className="nut" data-gt={`${gt}:huy-sua`} onClick={onHuy}>
          Huỷ sửa
        </button>{" "}
        <span className="mo nho">{thieu || (dangTaiTep ? "Đang tải file…" : "")}</span>
      </div>
    </div>
  );
}
