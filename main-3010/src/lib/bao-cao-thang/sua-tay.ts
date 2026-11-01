// ============================================================
// CHỮ NGƯỜI SỬA TAY TRÊN BÁO CÁO THÁNG  (hàm THUẦN — màn hình và file Excel dùng chung; luật 10: không đụng node:fs)
//
// Mr. Đại 28/10/2026 (KE-HOACH/38 đợt 3): «Sửa lời văn» ngay trên màn, file Excel lấy đúng chữ đã sửa, «Làm lại» không đè chữ đã sửa.
//
// Chỉ LỜI VĂN do 🤖 soạn sửa được: nhận xét đầu mục (I–VI) và ô thuộc cột 🤖 (Đánh giá · Kiến nghị · Kết quả cần có).
// Ô SỐ agent trả về KHÔNG có đường sửa — số phải truy được về nguồn (luật dẫn nguồn A.4), sai thì sửa ở agent gốc rồi «Làm lại».
//
// Chữ sửa tay nằm trong `bc.suaTay` (khoá → chữ) của bản nháp đã lưu. Khoá:
//   nx:<mã mục>                       nhận xét đầu mục, vd «nx:II»
//   o:<mã bảng>:<khoá dòng>:<khoá cột> ô 🤖 trong bảng
// Làm lại báo cáo dựng khung mới nhưng giữ nguyên `suaTay`; khoá nào không còn dòng/mục tương ứng thì tự bị bỏ qua.
// ============================================================

import { moiBang, oCoSo, type BaoCaoThang, type MaMuc } from "@/lib/bao-cao-thang/model";

export const KHOA_NHAN_XET = /^nx:(I|II|III|IV|V|VI)$/;
export const DO_DAI_TOI_DA = 4000;

export function khoaNhanXet(ma: MaMuc): string {
  return `nx:${ma}`;
}

export function khoaO(maBang: string, khoaDong: string, khoaCot: string): string {
  return `o:${maBang}:${khoaDong}:${khoaCot}`;
}

/** Tách khoá ô — dòng có thể chứa dấu «:» nên chỉ cắt hai đầu */
function tachKhoaO(khoa: string): { bang: string; dong: string; cot: string } | null {
  if (!khoa.startsWith("o:")) return null;
  const r = khoa.slice(2);
  const i = r.indexOf(":");
  const j = r.lastIndexOf(":");
  if (i < 1 || j <= i) return null;
  return { bang: r.slice(0, i), dong: r.slice(i + 1, j), cot: r.slice(j + 1) };
}

/** Khoá có trỏ đúng một chỗ SỬA ĐƯỢC của báo cáo này không — chặn sửa ô số và khoá bịa */
export function kiemKhoaSua(bc: BaoCaoThang, khoa: string): string | null {
  if (KHOA_NHAN_XET.test(khoa)) {
    const ma = khoa.slice(3);
    return bc.muc.some((m) => m.ma === ma) ? null : "Báo cáo không có mục này.";
  }
  const k = tachKhoaO(khoa);
  if (!k) return "Chỗ này không sửa tay được.";
  const b = moiBang(bc).find((x) => x.ma === k.bang);
  const c = b?.cot.find((x) => x.khoa === k.cot);
  if (!b || !c) return "Báo cáo không có ô này.";
  if (!c.laLlm) return "Ô số do agent trả về không sửa tay được — sai số thì sửa ở agent gốc rồi bấm «Làm lại báo cáo».";
  if (!b.dong.some((d) => d.khoa === k.dong && !d.laDongGiuCho && !d.loai)) return "Báo cáo không có dòng này.";
  return null;
}

/** Chữ người sửa trong ô này, nếu có — màn hình cần để hiện dấu ✎ */
export function chuSuaCuaO(bc: Pick<BaoCaoThang, "suaTay">, maBang: string, khoaDong: string, khoaCot: string): string | undefined {
  return bc.suaTay?.[khoaO(maBang, khoaDong, khoaCot)];
}

/**
 * Bản báo cáo ĐÃ ÁP chữ sửa tay — mọi đường ra (màn hình, Excel, Markdown) đọc bản này để cùng một chữ.
 * Không sửa bản gốc. Ô 🤖 được sửa thành ô có chữ với vết «do người sửa tay», giữ nguyên `anhXa`.
 */
export function apDungSuaTay(bc: BaoCaoThang): BaoCaoThang {
  const s = bc.suaTay;
  if (!s || Object.keys(s).length === 0) return bc;
  const ra = JSON.parse(JSON.stringify(bc)) as BaoCaoThang;
  const luc = new Date().toISOString();
  for (const m of ra.muc) {
    const chu = s[khoaNhanXet(m.ma)];
    if (chu !== undefined && chu.trim() !== "") m.nhanXet = chu.trim();
  }
  for (const b of moiBang(ra)) {
    for (const d of b.dong) {
      if (d.laDongGiuCho || d.loai) continue;
      for (const c of b.cot) {
        if (!c.laLlm) continue;
        const chu = s[khoaO(b.ma, d.khoa, c.khoa)];
        if (chu === undefined || chu.trim() === "") continue;
        const cu = d.o[c.khoa];
        const anhXa = cu?.anhXa ?? c.anhXa;
        d.o[c.khoa] = oCoSo(chu.trim(), anhXa, { moTa: "Chữ do người sửa tay trên màn Báo cáo tháng", thoiDiem: luc });
      }
    }
  }
  return ra;
}
