// Lọc báo cáo tháng về MỘT dự án (Mr. Đại 28/10/2026: nút «Chọn dự án» — Toàn công ty hoặc từng dự án).
// Hàm THUẦN, dùng chung cho màn hình và file Excel nên đọc web thế nào xuất ra thế ấy.
// Dòng không gắn dự án (dòng giữ chỗ khi bảng trống) được giữ để bảng không biến mất (A.4 điều 5).

import type { BaoCaoThang } from "@/lib/bao-cao-thang/model";

export function locTheoDuAn(bc: BaoCaoThang, maDuAn: string): BaoCaoThang {
  if (!maDuAn) return bc;
  const cua = (d: { duAn?: string }) => d.duAn === undefined || d.duAn === maDuAn;
  return {
    ...bc,
    duAn: bc.duAn.filter((d) => d.ma === maDuAn),
    dauBaoCao: bc.dauBaoCao,
    muc: bc.muc.map((m) => ({
      ...m,
      bang: m.bang.map((b) => ({ ...b, dong: b.dong.filter(cua) })),
      khoiThem: (m.khoiThem ?? []).filter(cua),
    })),
  };
}
