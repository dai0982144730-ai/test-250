// Dùng chung cho /api/cai-dat/* (không phải route).
import { LoiHttp } from "@/lib/phien";
import { MAC_DINH, type KhoaCauHinh } from "@/lib/cau-hinh/mac-dinh";

export function khoaHopLe(khoa: string): KhoaCauHinh {
  if (!(khoa in MAC_DINH)) throw new LoiHttp(404, `Không có nhóm cài đặt "${khoa}"`);
  return khoa as KhoaCauHinh;
}
