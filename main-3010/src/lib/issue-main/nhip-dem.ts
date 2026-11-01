// ============================================================
// NHỊP ĐÊM MÀN CẢNH BÁO MAIN — 02:30 giờ VN mỗi đêm (Mr. Đại chốt 01/11/2026: «phân loại nên để tự động chạy hằng đêm»)
//
// Trước 01/11: AI xếp chủ đề và chọn «cần anh xem» CHỈ chạy khi có người bấm — đo 01/11: lần xếp cuối 08/09 (54 ngày),
// 58/60 issue không có chủ đề; lần chọn cuối 06/09, câu lý do «quá hạn 225 ngày» lệch số trên thẻ.
//
// Mỗi dự án một lượt, tiết kiệm AI:
//   ① xếp chủ đề CHỈ cho issue chưa có chủ đề (issue đã xếp giữ nguyên — luuPhanLoai giữ theo giuIdAn); không có thì không gọi AI
//   ② chọn lại «cần anh xem» CHỈ khi tập issue đang mở đổi so với lần chọn trước (dấu vân theo mã issue)
// Việc nền: không gắn người hỏi → không bao giờ dùng tài khoản Claude cá nhân (moi-truong-ai.ts). Sổ nhật ký ghi đường "B".
// Cùng khuôn nhịp với lib/nhat-ky/don-so.ts (03:30): setInterval mỗi phút + con trỏ toàn cục (G4) + cờ chống chạy chồng.
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import { listProjects } from "@/lib/projects";
import { duLieuManIssue } from "./man-hinh";
import { chayChonCanAnhXem, chayPhanLoaiLai } from "./chay-llm";
import { chuaPhanLoai } from "./phan-loai";
import { locIssue } from "./model";

export const GIO_NHIP_DEM_CANH_BAO = "02:30";
const SO_LAN_LUU = 30;

export interface KetQuaMotDuAn {
  duAn: string;
  /** Số issue chưa có chủ đề đưa AI xếp (0 = không gọi AI) */
  soXep: number;
  /** Đã chạy chọn «cần anh xem» chưa — false khi tập issue không đổi */
  daChon: boolean;
  loi?: string;
}

interface TrangThai {
  ngayDaChay: string;
  /** Dấu vân tập issue đang mở ở lần chọn «cần anh xem» gần nhất, theo dự án */
  vanCanXem: Record<string, string>;
  lichSu: { luc: string; duAn: KetQuaMotDuAn[] }[];
}

const tep = (): string => path.join(gocDuLieu(), "issue-main-nhip-dem.json");

function docTrangThai(): TrangThai {
  try {
    const t = JSON.parse(fs.readFileSync(tep(), "utf8")) as Partial<TrangThai>;
    return { ngayDaChay: t.ngayDaChay ?? "", vanCanXem: t.vanCanXem ?? {}, lichSu: t.lichSu ?? [] };
  } catch {
    return { ngayDaChay: "", vanCanXem: {}, lichSu: [] };
  }
}

function ghiTrangThai(t: TrangThai): void {
  try {
    fs.mkdirSync(path.dirname(tep()), { recursive: true });
    fs.writeFileSync(tep(), JSON.stringify(t, null, 2) + "\n", "utf8");
  } catch {
    /* không ghi được thì đêm sau chạy lại — không làm sập máy chủ */
  }
}

/** Giờ VN (+7, luật 44) — {ngay "YYYY-MM-DD", gio "HH:MM"} */
function gioVn(luc: Date): { ngay: string; gio: string } {
  const t = new Date(luc.getTime() + 7 * 3_600_000).toISOString();
  return { ngay: t.slice(0, 10), gio: t.slice(11, 16) };
}

/** Dấu vân tập issue đang mở — đổi khi có issue mới hoặc issue đóng */
export function vanTapIssue(ma: readonly string[]): string {
  return createHash("sha1").update([...ma].sort().join("|")).digest("hex").slice(0, 16);
}

/** Chạy một lượt cho mọi dự án. Không ném — lỗi từng dự án nằm trong `loi`. */
export async function chayNhipDemCanhBao(bay: Date = new Date()): Promise<KetQuaMotDuAn[]> {
  const tt = docTrangThai();
  const ra: KetQuaMotDuAn[] = [];
  for (const p of listProjects()) {
    const kq: KetQuaMotDuAn = { duAn: p.id, soXep: 0, daChon: false };
    try {
      const dat = await duLieuManIssue(p.id);
      const chua = chuaPhanLoai(dat.issue);
      if (chua.length > 0) {
        const idChua = new Set(chua.map((i) => i.id));
        const r = await chayPhanLoaiLai(chua, p.id, "may", dat.issue.filter((i) => !idChua.has(i.id)).map((i) => i.id), "B");
        kq.soXep = chua.length;
        if (!r.ok) kq.loi = r.message;
      }
      const dangMo = locIssue(dat.issue).nhan.filter((i) => !i.daDong);
      const van = vanTapIssue(dangMo.map((i) => `${i.agentChu}:${i.id}`));
      if (dangMo.length > 0 && tt.vanCanXem[p.id] !== van) {
        const r = await chayChonCanAnhXem(dat.issue, p.id, "may", "B");
        kq.daChon = r.ok;
        if (r.ok) tt.vanCanXem[p.id] = van;
        else kq.loi = [kq.loi, r.message].filter(Boolean).join(" · ");
      }
    } catch (e) {
      kq.loi = e instanceof Error ? e.message : String(e);
    }
    ra.push(kq);
  }
  tt.ngayDaChay = gioVn(bay).ngay;
  tt.lichSu = [{ luc: bay.toISOString(), duAn: ra }, ...tt.lichSu].slice(0, SO_LAN_LUU);
  ghiTrangThai(tt);
  return ra;
}

declare global {
  // eslint-disable-next-line no-var
  var __nhipDemCanhBaoDangChay: boolean | undefined;
  // eslint-disable-next-line no-var
  var __nhipDemCanhBaoDaBat: boolean | undefined;
  /** Nhịp xét của BẢN MÃ MỚI NHẤT (G4) */
  // eslint-disable-next-line no-var
  var __nhipDemCanhBaoKiem: (() => void) | undefined;
}

/** Đã qua 02:30 giờ VN mà hôm nay chưa chạy thì chạy — bật máy muộn vẫn chạy bù trong ngày */
function kiem(): void {
  if (globalThis.__nhipDemCanhBaoDangChay) return;
  const bay = new Date();
  const { ngay, gio } = gioVn(bay);
  if (gio < GIO_NHIP_DEM_CANH_BAO) return;
  if (docTrangThai().ngayDaChay === ngay) return;
  globalThis.__nhipDemCanhBaoDangChay = true;
  void chayNhipDemCanhBao(bay)
    .catch(() => undefined)
    .finally(() => {
      globalThis.__nhipDemCanhBaoDangChay = false;
    });
}
globalThis.__nhipDemCanhBaoKiem = kiem;

/** Bật một lần mỗi tiến trình (gọi từ layout, như khoiDongDonSo) */
export function khoiDongNhipDemCanhBao(): void {
  if (globalThis.__nhipDemCanhBaoDaBat) return;
  globalThis.__nhipDemCanhBaoDaBat = true;
  setInterval(() => {
    (globalThis.__nhipDemCanhBaoKiem ?? kiem)();
  }, 60_000);
}
