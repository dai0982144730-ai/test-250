// ============================================================
// kiem-tra/khai-bao-mau.ts — LUỒNG KHAI BÁO MẪU trên màn /mau-word (Đợt D, 01/10/2026). CHỈ SERVER.
// MD 0 Tài liệu thiết kế/DE-XUAT-KHAI-BAO-MAU-BAO-CAO-v0.1 mục 4.1: tải file Word → 🤖 đề xuất → người duyệt →
// KIỂM (code gắn nhãn rồi đọc lại bằng bộ đọc thật) → LƯU phiên bản mới (+ tự tắt luật trỏ vào bảng/cột đã bỏ, mục 6).
// Cập nhật mẫu cũ: phải giữ nhãn bảng số liệu và ô nhập cũ (đo 01/10: 59 luật code trỏ vào 18 bảng số liệu).
//   Sửa trên file mẫu tải về → 13/13 file thật đọc ra y hệt; Word thường → 10/13 mẫu mất nhãn cột số liệu → CHẶN, chỉ đường.
// ============================================================
import type { Q } from "@/lib/db";
import type { CauTrucMau, DinhNghiaMau, NguoiDungPhien, ONhapMau } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { ghiTep } from "@/lib/luu-tru/kho";
import { kiemCauTruc, sinhTruongCu } from "./cau-truc";
import { docWord } from "./doc-word";
import { ganNhanTheoCauTruc } from "./gan-nhan";
import { layMau } from "./kiem-tra";
import { batBuocQuanLyMau, dinhNghiaKhung, kiemTraDinhNghia, themMau } from "./quan-ly-mau";
import { cauTrucTruoc, deXuatCauTruc } from "./de-xuat-cau-truc";
import { luatHongVoiDinhNghia, tatLuatChoMau, type LuatHong } from "@/lib/luat/kho-luat";

/** Model đề xuất cấu trúc — MD mục 9 chốt "fable" (đo 01/10: 15–21 giây/file). */
const MODEL_DE_XUAT = "fable";

export async function deXuatChoMau(q: Q, nd: NguoiDungPhien, v: { buf: Buffer; ma?: string | null }) {
  batBuocQuanLyMau(nd);
  const cu = v.ma ? await cauTrucTruoc(q, v.ma) : null;
  const { runAIGan } = await import("@/lib/ai/providers");
  try {
    return { ...(await deXuatCauTruc(v.buf, (p, s) => runAIGan("lib/kiem-tra/khai-bao-mau", p, s, undefined, MODEL_DE_XUAT, 240_000, true), cu)), cu };
  } catch (e) {
    throw new LoiHttp(400, e instanceof Error ? e.message : "🤖 AI chưa đọc được file");
  }
}

type BangDn = { tag: string; nhan: string; cot?: { tag: string; nhan: string }[] };

/** Danh sách bảng (cho màn Luật chọn bảng/cột): mọi bảng có nhãn trong cau_truc; giữ tên đã quen của bản trước. */
function sinhBang(ct: CauTrucMau, cu: BangDn[] | undefined): BangDn[] {
  const ra: BangDn[] = [];
  for (const c of ct.chuong)
    for (const b of c.bang) {
      if (!b.tag || ra.some((x) => x.tag === b.tag)) continue;
      const bc = cu?.find((x) => x.tag === b.tag);
      ra.push({
        tag: b.tag,
        nhan: bc?.nhan || b.tieu_de || c.tieu_de,
        cot: b.cot.filter((x) => x.nghia !== "bo_qua" || x.tag === "stt").map((x) => ({ tag: x.tag, nhan: bc?.cot?.find((y) => y.tag === x.tag)?.nhan || x.tieu_de })),
      });
    }
  return ra;
}

export interface KetQuaKiemThu {
  dat: boolean;
  loi: string[];
  bao_cao: string[];
  luat_tat: LuatHong[];
}

/** Bước 5: gắn nhãn bằng code → đọc lại bằng bộ đọc thật → định nghĩa mới + luật sẽ tắt. Không ghi gì. */
async function kiemThuNoiBo(q: Q, v: { buf: Buffer; ma: string; ten: string; moi: boolean; cau_truc: CauTrucMau }) {
  const ct = v.cau_truc;
  if (!ct || !Array.isArray(ct.chuong)) throw new LoiHttp(400, "Thiếu cấu trúc mẫu");
  const loi = [...kiemCauTruc(ct)];
  const mau = v.moi ? null : await layMau(q, v.ma);
  if (!v.moi && !mau) throw new LoiHttp(404, "Không có mẫu này");
  const dnCu = (mau?.dinh_nghia ?? null) as (DinhNghiaMau & { bang?: BangDn[] }) | null;
  const gan = await ganNhanTheoCauTruc(v.buf, v.ma, ct, (dnCu?.o_nhap ?? []).map((o) => o.tag));
  loi.push(...gan.thieu);
  if (!v.moi) {
    const huong = "tải mẫu hiện hành về (nút Tải ở danh sách mẫu), sửa trên đó rồi tải lên lại — giữ được nhãn";
    for (const m of gan.mat_nhan_cot)
      loi.push(`Bảng số liệu "${m.tieu_de}": file tải lên đã mất nhãn ${m.cot.length} cột (${m.cot.slice(0, 4).join(", ")}${m.cot.length > 4 ? "…" : ""}) mà luật kiểm tra đang dùng — ${huong}`);
    const co = new Set([...gan.o_nhap.map((o) => o.tag), ...gan.o_nhap_giu]);
    for (const o of dnCu?.o_nhap ?? []) if (!co.has(o.tag) && !/^ky_chon_/.test(o.tag)) loi.push(`Mất ô nhập "${o.nhan}" (${o.tag}) của bản trước — ${huong}`);
  }
  // đọc lại chính file vừa gắn nhãn bằng bộ đọc báo cáo thật
  const doc = await docWord(gan.buf);
  if (doc.mau_ma !== v.ma) loi.push(`Bộ đọc báo cáo không nhận ra mẫu "${v.ma}" trong file vừa gắn nhãn`);
  const bao = [...gan.bao_cao];
  for (const c of ct.chuong)
    for (const b of c.bang)
      if (b.nghia !== "so_lieu") {
        const dong = doc.bang[b.tag];
        if (!dong) loi.push(`Bộ đọc báo cáo không thấy bảng "${b.tieu_de}" (${b.tag}) trong file vừa gắn nhãn`);
        else bao.push(`Đọc lại bảng "${b.tieu_de}": ${dong.length} dòng`);
      }
  // định nghĩa mới: ô nhập máy dựng + ô cũ còn giữ; cau_truc là gốc
  const oCu = new Map((dnCu?.o_nhap ?? []).map((o) => [o.tag, o]));
  const oNhap: ONhapMau[] = [...gan.o_nhap.map((o) => ({ ...(oCu.get(o.tag) ?? {}), ...o })), ...gan.o_nhap_giu.map((t) => oCu.get(t)!).filter(Boolean)];
  const dn = { ...(dnCu ?? dinhNghiaKhung()), o_nhap: oNhap, cau_truc: ct, ...sinhTruongCu(ct), bang: sinhBang(ct, dnCu?.bang) };
  const luatTat = v.moi ? [] : await luatHongVoiDinhNghia(q, v.ma, v.ten, dn);
  return { kq: { dat: loi.length === 0, loi: Array.from(new Set(loi)), bao_cao: bao, luat_tat: luatTat } as KetQuaKiemThu, dn, buf: gan.buf };
}

export async function kiemThuMau(q: Q, nd: NguoiDungPhien, v: { buf: Buffer; ma: string; ten: string; moi: boolean; cau_truc: CauTrucMau }): Promise<KetQuaKiemThu> {
  batBuocQuanLyMau(nd);
  return (await kiemThuNoiBo(q, v)).kq;
}

/** Bước 6: lưu phiên bản mới (file đã gắn nhãn + định nghĩa) — kiểm lại từ đầu, không tin bước trước. */
export async function luuPhienBanMau(
  q: Q,
  nd: NguoiDungPhien,
  v: { buf: Buffer; ten_tep: string; ma: string; ten: string; moi: boolean; cau_truc: CauTrucMau },
): Promise<{ ma: string; phien_ban: number; luat_tat: LuatHong[] }> {
  batBuocQuanLyMau(nd);
  if (!/\.docx$/i.test(v.ten_tep)) throw new LoiHttp(400, "File mẫu phải là Word .docx");
  if (v.moi) await themMau(q, nd, { ma: v.ma, ten: v.ten });
  const ma = v.moi ? v.ma.trim().toLowerCase() : v.ma;
  const { kq, dn, buf } = await kiemThuNoiBo(q, { ...v, ma });
  if (!kq.dat) throw new LoiHttp(400, `Chưa lưu được: ${kq.loi.join(" · ")}`);
  const dnSach = kiemTraDinhNghia(dn);
  const { khoa, sha256, kich_thuoc } = await ghiTep(buf);
  // mẫu mới tạo chưa có file → bản đầu tiên giữ số 1; mẫu đã có file → +1
  const { rows } = await q.query<{ phien_ban: number }>(
    `UPDATE docflow.mau_word SET khoa_luu = $2, dinh_nghia = $3::jsonb,
       phien_ban = CASE WHEN khoa_luu IS NULL THEN phien_ban ELSE phien_ban + 1 END, sua_luc = now()
     WHERE ma = $1 RETURNING phien_ban`,
    [ma, khoa, JSON.stringify(dnSach)],
  );
  const pb = rows[0].phien_ban;
  const tenTep = v.ten_tep.replace(/[\/:*?"<>|]/g, "-");
  await q.query(
    `INSERT INTO docflow.mau_word_phien_ban (ma, phien_ban, ten_tep, khoa_luu, sha256, kich_thuoc, dinh_nghia, tai_len_boi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
    [ma, pb, tenTep, khoa, sha256, kich_thuoc, JSON.stringify(dnSach), nd.id],
  );
  if (kq.luat_tat.length) await tatLuatChoMau(q, nd, ma, kq.luat_tat);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "mau",
    doi_tuong_id: ma,
    hanh_dong: "tai_len",
    chi_tiet: {
      khai_bao_theo_nghia: true,
      ten_tep: tenTep,
      sha256,
      phien_ban: pb,
      chuong: dnSach.cau_truc?.chuong.map((c) => `${c.tieu_de} (${c.nghia})`),
      luat_tat: kq.luat_tat.map((l) => ({ ma: l.ma, ten: l.ten, ly_do: l.ly_do })),
    },
  });
  return { ma, phien_ban: pb, luat_tat: kq.luat_tat };
}
