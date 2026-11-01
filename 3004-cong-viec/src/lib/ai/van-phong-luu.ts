// ĐỌC / GHI văn phong trợ lý AI xuống đĩa — tách khỏi van-phong.ts vì file này
// dùng node:fs, CHỈ chạy phía máy chủ (luật 10). Lưu CHUNG cả app (không theo
// dự án): văn phong là cách trợ lý nói chuyện, không phải dữ liệu dự án.

import fs from "node:fs";
import path from "node:path";
import { VAN_PHONG_MAC_DINH, soatVanPhong } from "./van-phong";
import { thuMucDuLieu } from "./duong-dan";

interface VanPhongLuu {
  noiDung: string;
  /** Vết ai đổi lúc nào — máy tự ghi, giữ 50 lần gần nhất */
  vet: Array<{ luc: string; nguoi: string; soKyTu: number }>;
}

function duongDan(): string {
  return thuMucDuLieu("van-phong-tro-ly.json");
}

function docFile(): VanPhongLuu | null {
  const p = duongDan();
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8")) as Partial<VanPhongLuu>;
    if (typeof j.noiDung !== "string" || j.noiDung.trim() === "") return null;
    return { noiDung: j.noiDung, vet: Array.isArray(j.vet) ? j.vet : [] };
  } catch {
    // File hỏng → chạy bằng mặc định, KHÔNG chặn chat
    return null;
  }
}

/** Văn phong đang có hiệu lực: bản đã lưu, chưa lưu thì bản mặc định */
export function docVanPhong(): { noiDung: string; laMacDinh: boolean } {
  const luu = docFile();
  if (!luu) return { noiDung: VAN_PHONG_MAC_DINH, laMacDinh: true };
  return { noiDung: luu.noiDung, laMacDinh: luu.noiDung === VAN_PHONG_MAC_DINH };
}

/** Lưu văn phong mới kèm vết. veMacDinh = xoá bản lưu, quay về mặc định trong code. */
export function luuVanPhong(
  noiDung: string,
  nguoi: string
): { ok: true } | { ok: false; loi: string } {
  const loi = soatVanPhong(noiDung);
  if (loi) return { ok: false, loi };
  const cu = docFile();
  const moi: VanPhongLuu = {
    noiDung,
    vet: [
      ...(cu?.vet ?? []),
      { luc: new Date().toISOString(), nguoi, soKyTu: noiDung.length },
    ].slice(-50),
  };
  const p = duongDan();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(moi, null, 2), "utf8");
  return { ok: true };
}

/** Về mặc định: xoá file lưu — docVanPhong sẽ trả bản trong code */
export function xoaVanPhong(): void {
  const p = duongDan();
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
