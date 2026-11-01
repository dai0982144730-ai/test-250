// ============================================================
// CẤU HÌNH BẢNG ĐIỀU HÀNH — dự án nào hiện trên dàn ngang, thứ tự nào
// Từ 11/09 lấy thẳng từ sổ dự án (Cài đặt → 📁 Quản lý dự án). 26/09: bỏ route
// PUT /api/bang-dieu-hanh + ghiCauHinhBdh — khối "Dự án trên dàn ngang" ở Cài
// đặt không ai gọi; file bang-dieu-hanh.json chỉ còn là đường lui khi sổ rỗng.
//
// Đây KHÔNG phải dữ liệu nghiệp vụ — chỉ là danh sách MÃ dự án + tên gọi
// ngắn để bày màn. Số liệu của từng dự án vẫn ĐI HỎI Agent tiến độ qua cổng
// (Main không giữ dữ liệu — mục 1). Server-only (node:fs).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";

export interface DuAnDanNgang {
  /** Mã dự án ĐÚNG như Agent tiến độ hiểu (tham số ma_du_an của cổng) */
  ma: string;
  /** Tên ngắn hiện trên nút dàn ngang */
  ten: string;
}

export interface CauHinhBangDieuHanh {
  duAn: DuAnDanNgang[];
}

const TEN_FILE = "bang-dieu-hanh.json";

/**
 * Mặc định: MỘT dự án — đúng dự án Agent tiến độ đang có dữ liệu thật.
 * Demo vẽ 6 nút (HV · TT · BT · HL7 · HL8 · NS3a) nhưng 5 dự án kia chưa có
 * trong Agent tiến độ — khai vào đây là vẽ nút chết. Thêm dự án ở Cài đặt
 * khi Agent tiến độ đã nạp dữ liệu dự án đó.
 */
const MAC_DINH: CauHinhBangDieuHanh = {
  duAn: [{ ma: "dien-gio-huong-viet-hv-du-lieu", ten: "Hướng Việt" }],
};

function duongDan(): string {
  return path.join(gocDuLieu(), TEN_FILE);
}

/**
 * ⭐ 11/09 đợt 3 (Mr. Đại bắt lỗi "đầu voi đuôi chuột": chọn N3A ở top menu mà bảng vẫn HV):
 * dàn ngang KHÔNG khai riêng nữa — lấy thẳng từ sổ dự án của Main (bản gốc, bỏ dự án
 * "default" và dự án đã lưu trữ). File bang-dieu-hanh.json chỉ còn là đường lui khi sổ rỗng.
 */
export function docCauHinhBdh(): CauHinhBangDieuHanh {
  try {
    const { listProjects } = require("@/lib/projects") as typeof import("@/lib/projects");
    const tuSo = listProjects(false)
      .filter((p) => p.id !== "default")
      .map((p) => ({ ma: p.id, ten: p.ma && p.ma.trim() ? p.ma.trim().toUpperCase() + " · " + p.name : p.name }));
    if (tuSo.length > 0) return { duAn: tuSo };
  } catch {
    /* rơi xuống đường lui */
  }
  try {
    const fp = duongDan();
    if (!fs.existsSync(fp)) return MAC_DINH;
    const j = JSON.parse(fs.readFileSync(fp, "utf8")) as Partial<CauHinhBangDieuHanh>;
    const duAn = Array.isArray(j.duAn)
      ? j.duAn.filter((d): d is DuAnDanNgang => typeof d?.ma === "string" && typeof d?.ten === "string")
      : [];
    return duAn.length > 0 ? { duAn } : MAC_DINH;
  } catch {
    return MAC_DINH;
  }
}
