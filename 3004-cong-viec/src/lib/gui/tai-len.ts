// ============================================================
// gui/tai-len.ts — TẢI FILE LÊN ĐỂ KIỂM TRA (màn Soạn và gửi, file kèm, gửi tài liệu mới). CHỈ SERVER.
// Lần đầu: tạo tài liệu (bản 1, trạng thái nháp) trong thư mục gốc của đơn vị người gửi.
// "Tải lại bản đã sửa": thêm phiên bản mới cho cùng tài liệu — lịch sử vẫn giữ bản 1.
// Mỗi lần kiểm tra ghi lịch sử 'kiem_tra' (đạt hay lỗi gì).
// ============================================================
import type { Q } from "@/lib/db";
import type { NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { taoTaiLieu, themPhienBan, thuMucCuaDonVi, type TepTaiLen } from "@/lib/thu-muc/dich-vu";
import { kiemTraDayDu, rutGon, type KetQuaKiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { coQuyen } from "@sci/identity";
import { layTaiLieu } from "./chung";

export const GIOI_HAN_TEP = 25 * 1024 * 1024;

export type KetQuaKiemTraGuiVe = Omit<KetQuaKiemTraDayDu, "noi_dung">;

export function boNoiDung(kq: KetQuaKiemTraDayDu): KetQuaKiemTraGuiVe {
  const { noi_dung: _bo, ...con } = kq;
  return con;
}

async function ghiKiemTra(q: Q, nd: NguoiDungPhien, taiLieuId: string, phienBan: number, kq: KetQuaKiemTraDayDu) {
  const chan = kq.loi.filter((l) => l.muc === "chan");
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: taiLieuId,
    hanh_dong: "kiem_tra",
    chi_tiet: {
      phien_ban: phienBan,
      dat: kq.dat,
      mau_ma: kq.mau_ma,
      so_viec: kq.cong_viec.length,
      loi_chan: chan.map((l) => ({ luat: l.luat, thong_diep: l.thong_diep, vi_tri: l.vi_tri ?? null })),
      so_canh_bao: kq.loi.filter((l) => l.muc === "canh_bao").length,
    },
  });
}

export async function taiLenVaKiemTra(
  q: Q,
  nd: NguoiDungPhien,
  v: { tep: TepTaiLen; tai_lieu_id?: string | null; luu?: boolean },
): Promise<{ tai_lieu_id: string | null; phien_ban: number | null; ket_qua: KetQuaKiemTraDayDu }> {
  if (!v.tep?.noi_dung?.length) throw new LoiHttp(400, "Chưa chọn file");
  if (v.tep.noi_dung.length > GIOI_HAN_TEP) throw new LoiHttp(413, "File quá lớn (tối đa 25 MB)");
  const luu = v.luu !== false;

  // Tải lại bản đã sửa cho tài liệu đã có
  if (v.tai_lieu_id) {
    const tl = await layTaiLieu(q, v.tai_lieu_id);
    const laChu = tl.nguoi_tao === nd.id || nd.la_quan_tri || (tl.don_vi_lap && coQuyen(nd, "tai_lieu.gui", { don_vi_id: tl.don_vi_lap })); // luồng gửi: không cần quyền tải thẳng lên thư mục
    if (!laChu) throw new LoiHttp(403, "Chỉ người lập hoặc đơn vị lập mới tải bản sửa được");
    if (!["nhap", "bi_tra_lai"].includes(tl.trang_thai)) throw new LoiHttp(409, "Tài liệu đã gửi và chưa bị trả lại: không thay bản được");
    const kq = await kiemTraDayDu(q, nd, v.tep.noi_dung, v.tep.ten_tep, {
      don_vi_lap: tl.don_vi_lap,
      tai_lieu_id: tl.id,
      phien_ban: tl.phien_ban_hien_tai + 1,
      nguoi_gui_that: tl.nguoi_gui_that,
      moi_nop: true,
    });
    if (tl.mau_ma && kq.mau_ma && kq.mau_ma !== tl.mau_ma) {
      kq.loi.unshift({ luat: "dung_mau", muc: "chan", thong_diep: `Bản sửa là ${kq.mau_ma}, khác mẫu của bản trước (${tl.mau_ma})`, vi_tri: { tag: "mau_ma" } });
      kq.dat = false;
    }
    if (!luu) return { tai_lieu_id: tl.id, phien_ban: null, ket_qua: kq };
    // Bản sửa ghi tên đơn vị khác (báo cáo của đơn vị nào do nội dung file nói — chốt 29/09): chuyển tài liệu nháp sang đơn vị đó
    if (kq.don_vi_lap && kq.don_vi_lap !== tl.don_vi_lap) {
      await q.query("UPDATE docflow.tai_lieu SET don_vi_lap = $2 WHERE id = $1", [tl.id, kq.don_vi_lap]);
      await q.query("UPDATE docflow.vi_tri SET thu_muc_id = $2 WHERE tai_lieu_id = $1 AND vai = 'goc'", [tl.id, await thuMucCuaDonVi(q, kq.don_vi_lap, "goc")]);
    }
    const pb = await themPhienBan(q, tl.id, { nguoi: nd.id, tep: v.tep, ket_qua_kiem_tra: rutGon(kq), ky_bao_cao: kq.ky_bao_cao ?? null });
    await ghiKiemTra(q, nd, tl.id, pb, kq);
    return { tai_lieu_id: tl.id, phien_ban: pb, ket_qua: kq };
  }

  const kq = await kiemTraDayDu(q, nd, v.tep.noi_dung, v.tep.ten_tep, { moi_nop: true });
  if (!luu || !nd.don_vi_id) return { tai_lieu_id: null, phien_ban: null, ket_qua: kq };
  // Đơn vị lập do bộ kiểm tra quyết (đóng dấu theo mẫu khi người nộp thuộc đơn vị lập của mẫu — vd Form 0 → Trợ lý CT)
  const dvLap = kq.don_vi_lap ?? nd.don_vi_id;
  const thuMuc = await thuMucCuaDonVi(q, dvLap, "goc");
  const { tai_lieu_id, phien_ban } = await taoTaiLieu(q, {
    ten: v.tep.ten_tep,
    nguoi: nd.id,
    don_vi_lap: dvLap,
    thu_muc_id: thuMuc,
    tep: v.tep,
    mau_ma: kq.mau?.ma ?? null,
    ky_bao_cao: kq.ky_bao_cao ?? null,
    ket_qua_kiem_tra: rutGon(kq),
  });
  await ghiKiemTra(q, nd, tai_lieu_id, phien_ban, kq);
  return { tai_lieu_id, phien_ban, ket_qua: kq };
}

/** Người chưa gán đơn vị (cấu hình cho gửi với cấp thấp nhất): tạo tài liệu ngay trong Đến của nơi nhận đầu tiên. */
export async function taoTaiLieuChoNguoiChuaGan(
  q: Q,
  nd: NguoiDungPhien,
  v: { tep: TepTaiLen; don_vi_nhan: string },
): Promise<string> {
  const kq = await kiemTraDayDu(q, nd, v.tep.noi_dung, v.tep.ten_tep, { don_vi_lap: null, moi_nop: true });
  if (!kq.dat) throw new LoiHttp(400, "Tài liệu chưa đạt kiểm tra");
  const thuMuc = await thuMucCuaDonVi(q, v.don_vi_nhan, "den");
  const { tai_lieu_id, phien_ban } = await taoTaiLieu(q, {
    ten: v.tep.ten_tep,
    nguoi: nd.id,
    don_vi_lap: null,
    thu_muc_id: thuMuc,
    tep: v.tep,
    mau_ma: kq.mau?.ma ?? null,
    ky_bao_cao: kq.ky_bao_cao ?? null,
    ket_qua_kiem_tra: rutGon(kq),
  });
  await ghiKiemTra(q, nd, tai_lieu_id, phien_ban, kq);
  // Như mọi lối gửi khác: luật AI mức chặn phải được kiểm (file vừa tải lên thì AI chưa kịp kiểm → từ chối, hướng dẫn chờ)
  const { kiemLuatAiKhiGui } = await import("@/lib/luat/chay-luat");
  await kiemLuatAiKhiGui(q, { tai_lieu_id, phien_ban, mau_ma: kq.mau?.ma ?? null, ten: v.tep.ten_tep, luat_da_dung: kq.luat_da_dung, ban_moi: true });
  return tai_lieu_id;
}
