// Đọc chung form khai báo mẫu (bước Kiểm tra / Lưu): {tep, ma, ten, moi, cau_truc(JSON)}.
import { LoiHttp } from "@/lib/phien";
import { tepTuForm } from "@/lib/gui/api";
import type { CauTrucMau } from "@/lib/types";

export async function docFormKhaiBao(req: Request) {
  const fd = await req.formData();
  const tep = (await tepTuForm(fd))!;
  let cau_truc: CauTrucMau;
  try {
    cau_truc = JSON.parse(String(fd.get("cau_truc") ?? "")) as CauTrucMau;
  } catch {
    throw new LoiHttp(400, "Cấu trúc mẫu gửi lên không đọc được");
  }
  const ma = String(fd.get("ma") ?? "").trim();
  if (!ma) throw new LoiHttp(400, "Thiếu mã mẫu");
  return { buf: tep.noi_dung, ten_tep: tep.ten_tep, ma, ten: String(fd.get("ten") ?? "").trim(), moi: fd.get("moi") === "1", cau_truc };
}
