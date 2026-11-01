// Sổ GÓP Ý của app này (Mr. Đại chốt 03/10/2026: mỗi agent MỘT sổ riêng, giao diện như 3004 /gop-y).
// Lưu file: <data>/gop-y/gop-y.json (danh sách) + <data>/gop-y/anh/<mã>/<số thứ tự> (ảnh). Chỉ chạy phía máy chủ (node:fs).
import fs from "node:fs";
import path from "node:path";
import { thuMucDuLieu } from "@/lib/chung/thu-muc-du-lieu";
import { CAC_TT, TOI_DA_ANH, type GopY, type TrangThai } from "./loai";

const GOC = () => path.join(thuMucDuLieu(), "gop-y");
const FILE = () => path.join(GOC(), "gop-y.json");
const TOI_DA_BYTE = 8 * 1024 * 1024;
/** Chỉ ảnh "phẳng" — KHÔNG nhận SVG: SVG chứa được mã chạy, mở thẳng link ảnh là chạy dưới tên miền app
 *  (kiểm tra chéo 03/10, lỗi #4). */
const LOAI_ANH = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

export class LoiGopY extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function doc(): GopY[] {
  try {
    return JSON.parse(fs.readFileSync(FILE(), "utf8")) as GopY[];
  } catch {
    return [];
  }
}
function ghi(ds: GopY[]) {
  fs.mkdirSync(GOC(), { recursive: true });
  const tam = FILE() + ".tmp";
  fs.writeFileSync(tam, JSON.stringify(ds, null, 1), "utf8");
  fs.renameSync(tam, FILE());
}

export interface NguoiGui {
  email: string;
  name: string;
  quanTri: boolean;
}

/** Mới nhất đứng đầu */
export function danhSachGopY(): GopY[] {
  return doc().sort((a, b) => b.tao_luc.localeCompare(a.tao_luc));
}

export interface AnhVao {
  ten: string;
  loai: string;
  noiDung: Buffer;
}

export function guiGopY(nd: NguoiGui, v: { tieu_de: string; noi_dung: string; trang: string | null; anh: AnhVao[] }): { id: string } {
  const tieuDe = v.tieu_de.trim();
  if (!tieuDe) throw new LoiGopY("Góp ý cần có tên — viết ngắn gọn để sau còn tìm lại.");
  if (tieuDe.length > 200) throw new LoiGopY("Tên góp ý tối đa 200 chữ.");
  if (v.noi_dung.length > 5000) throw new LoiGopY("Phần mô tả tối đa 5000 chữ.");
  if (v.anh.length > TOI_DA_ANH) throw new LoiGopY(`Mỗi góp ý đính kèm tối đa ${TOI_DA_ANH} ảnh.`);
  for (const a of v.anh) {
    if (!LOAI_ANH.includes(a.loai.toLowerCase()))
      throw new LoiGopY(`"${a.ten}" không nhận — chỉ nhận ảnh PNG, JPG, WEBP hoặc GIF (ảnh chụp màn hình).`);
    if (a.noiDung.length > TOI_DA_BYTE) throw new LoiGopY(`Ảnh "${a.ten}" quá lớn (tối đa 8 MB).`);
  }
  const ds = doc();
  const so = ds.reduce((m, g) => Math.max(m, Number(g.id.replace(/\D/g, "")) || 0), 0) + 1;
  const id = `GY-${String(so).padStart(4, "0")}`;
  if (v.anh.length) {
    const thu = path.join(GOC(), "anh", id);
    fs.mkdirSync(thu, { recursive: true });
    v.anh.forEach((a, i) => fs.writeFileSync(path.join(thu, String(i)), a.noiDung));
  }
  ds.push({
    id,
    tieu_de: tieuDe,
    noi_dung: v.noi_dung.trim(),
    trang: v.trang,
    anh: v.anh.map((a) => ({ ten: a.ten, kich_thuoc: a.noiDung.length, loai: a.loai })),
    nguoi: nd.email,
    ten_nguoi: nd.name,
    trang_thai: "moi",
    tra_loi: null,
    ten_tra_loi: null,
    tra_loi_luc: null,
    tao_luc: new Date().toISOString(),
  });
  ghi(ds);
  return { id };
}

export function traLoiGopY(nd: NguoiGui, id: string, v: { trang_thai: string; tra_loi?: string | null }): void {
  if (!nd.quanTri) throw new LoiGopY("Chỉ quản trị mới đặt trạng thái và trả lời góp ý.", 403);
  if (!CAC_TT.includes(v.trang_thai as TrangThai)) throw new LoiGopY("Trạng thái không hợp lệ.");
  const ds = doc();
  const g = ds.find((x) => x.id === id);
  if (!g) throw new LoiGopY("Không tìm thấy góp ý này.", 404);
  g.trang_thai = v.trang_thai as TrangThai;
  const tl = (v.tra_loi ?? "").trim();
  if (tl !== (g.tra_loi ?? "")) {
    g.tra_loi = tl || null;
    g.ten_tra_loi = tl ? nd.name : null;
    g.tra_loi_luc = tl ? new Date().toISOString() : null;
  }
  ghi(ds);
}

export function xoaGopY(nd: NguoiGui, id: string): void {
  const ds = doc();
  const g = ds.find((x) => x.id === id);
  if (!g) throw new LoiGopY("Không tìm thấy góp ý này.", 404);
  if (!nd.quanTri && !(g.nguoi === nd.email && g.trang_thai === "moi"))
    throw new LoiGopY("Chỉ xoá được góp ý của mình khi còn ở trạng thái Mới; quản trị xoá được mọi góp ý.", 403);
  ghi(ds.filter((x) => x.id !== id));
  fs.rmSync(path.join(GOC(), "anh", id), { recursive: true, force: true });
}

export function docAnhGopY(id: string, i: number): { noiDung: Buffer; loai: string } | null {
  const g = doc().find((x) => x.id === id);
  if (!g || !Number.isInteger(i) || i < 0 || i >= g.anh.length) return null;
  try {
    return { noiDung: fs.readFileSync(path.join(GOC(), "anh", id, String(i))), loai: g.anh[i].loai || "image/png" };
  } catch {
    return null;
  }
}
