// ============================================================
// cay-viec/issue/nhac-dong.ts — "NHẮC ĐÓNG VIỆC" thành CHUÔNG (Mr. Đại chốt 07/10/2026, đợt 2 rà màn Issue agent Công việc).
// Trước: luật 4 chiều ngược (mã WBS đã 100% mà việc gắn mã còn mở) mở một THẺ ISSUE "nhắc đóng việc" — chỉ là dọn sổ, ảnh hưởng
// COD 0 ngày, chiếm 5/6 thẻ tab Xong trên giấy (đo 06/10, dự án HV). Nay: chuông cho người chủ trì việc (đơn vị → đầu đơn vị,
// cùng khuôn nút "Nhắc người giữ việc"), mỗi việc nhắc lại tối đa 7 ngày một lần (sổ nhớ data/cay-viec/issue/<dự án>-nhac-dong.json).
// Thẻ "nhắc đóng việc" cũ còn mở trong sổ issue → đóng ngay, ghi lý do. CHỈ SERVER.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import type { Q } from "@/lib/db";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { taoThongBao, dauDonVi } from "@/lib/thong-bao";
import { docSo, ghiSo } from "./so-issue";

export interface NhacDong {
  viecId: string;
  ten: string;
  /** "7.2.3 Thi công san nền" — mã kèm tên (luật 30) */
  maWbs: string;
}

const NHAC_LAI_MS = 7 * 86_400_000;
const LY_DO_DONG = "Đóng 07/10: 'nhắc đóng việc' không còn là issue — nay là chuông gửi người chủ trì (Mr. Đại chốt, đợt 2)";

const duongSoNho = (duAn: string) => thuMucDuLieu("cay-viec", "issue", `${duAn.replace(/[^\w.-]/g, "_")}-nhac-dong.json`);

function docNho(duAn: string): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(duongSoNho(duAn), "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Gửi chuông cho việc chưa nhắc (hoặc nhắc quá 7 ngày) — trả số việc vừa nhắc */
/** Loại tin riêng của MÁY nhắc đóng việc — 07/10 bản đầu dùng nhầm "nhac_viec" nên chuông hiện đỏ "Ban lãnh đạo nhắc việc", đứng đầu */
export const LOAI_NHAC_DONG = "nhac_dong_viec";
const DUOI_NHAC_DONG = "bên agent Tiến độ — xong rồi thì bấm Xong việc.";

export async function guiChuongNhacDong(q: Q, duAn: { id: string; ten: string }, ds: NhacDong[], bayGio = Date.now()): Promise<number> {
  // Sửa tin đã gửi nhầm loại (không hại khi chạy lại — chỉ khớp đúng câu máy nhắc đóng việc)
  await q.query("UPDATE docflow.thong_bao SET loai = $1 WHERE loai = 'nhac_viec' AND noi_dung LIKE $2", [LOAI_NHAC_DONG, `%${DUOI_NHAC_DONG}`]);
  const nho = docNho(duAn.id);
  let so = 0;
  for (const x of ds) {
    const cu = nho[x.viecId] ? Date.parse(nho[x.viecId]) : 0;
    if (cu && bayGio - cu < NHAC_LAI_MS) continue;
    const { rows: pt } = await q.query<{ phu_trach_loai: string; phu_trach_id: string }>(
      "SELECT phu_trach_loai, phu_trach_id FROM docflow.phan_viec WHERE cong_viec_id = $1 AND NOT da_bo AND COALESCE(vai,'chu_tri') = 'chu_tri' AND trang_thai = 'dang_lam'",
      [x.viecId],
    );
    const tb = {
      loai: LOAI_NHAC_DONG,
      noi_dung: `Việc ${x.viecId} ${x.ten.slice(0, 90)} còn mở, trong khi đầu việc ${x.maWbs} (${duAn.ten}) đã hoàn thành 100% ${DUOI_NHAC_DONG}`,
      lien_ket: `/cong-viec/${x.viecId}`,
    };
    let daGui = false;
    for (const p of pt) {
      for (const id of p.phu_trach_loai === "nguoi" ? [p.phu_trach_id] : await dauDonVi(q, p.phu_trach_id)) {
        await taoThongBao(q, { ...tb, nguoi_nhan: id });
        daGui = true;
      }
    }
    if (daGui) {
      nho[x.viecId] = new Date(bayGio).toISOString();
      so += 1;
    }
  }
  if (so > 0) {
    fs.mkdirSync(path.dirname(duongSoNho(duAn.id)), { recursive: true });
    fs.writeFileSync(duongSoNho(duAn.id), JSON.stringify(nho, null, 2), "utf8");
  }
  return so;
}

/** Thẻ "nhắc đóng việc" cũ (khoá chưa-đóng:…) còn mở → đóng ngay */
export function dongTheNhacDongCu(duAn: string, homNay: string): number {
  const so = docSo(duAn);
  let n = 0;
  for (const t of so.the) {
    if (t.dieuKien === "da-dong" || !/^chưa-đóng:/.test(t.wbs ?? "")) continue;
    t.dieuKien = "da-dong";
    t.ghiNhan = [...t.ghiNhan, { luc: `${homNay}T00:00:00.000Z`, nguoi: "Máy (bộ sinh issue)", viecDaLam: LY_DO_DONG, chuyenSang: t.xuLy }];
    n += 1;
  }
  if (n > 0) ghiSo(duAn, so);
  return n;
}
