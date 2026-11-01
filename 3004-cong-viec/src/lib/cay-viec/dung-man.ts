// ============================================================
// cay-viec/dung-man.ts — GHÉP HAI NGUỒN cho màn "Cây việc & đường găng" (chép route /api/cay-viec của agent Base). CHỈ SERVER.
//   ① Đường găng + cây WBS ← HỎI agent Tiến độ qua lớp ghi sổ (luật 29: duongGang · layHetDauViec)
//   ② Việc                  ← SỔ CÁI của chính mình (doc-so-cai.ts) — chỗ duy nhất khác Base
//   → trả lời: "nút găng này đã có ai được giao chưa?"
// Hai nguồn đi hỏi gọi SONG SONG (Promise.all) — cấm chờ nối đuôi (HOP-DONG-KET-NOI 6.2). Hàm hỏi tiêm vào để test offline.
// ============================================================
import { tx } from "@/lib/db";
import { LoiHttp } from "@/lib/phien";
import type { NguoiDungPhien } from "@/lib/types";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { lanChayCuoi } from "@/lib/gan-wbs/gan-wbs";
import type { KhuonTra, NguonMcp } from "@/lib/mcp/khuon";
import { homNayVN, viecSoCaiCuaDuAn } from "./doc-so-cai";
import { tapKhongCanGiao } from "./khong-can-giao";
import { doiMaCu } from "@/lib/du-an-main-thuan";
import { demBonThe, dungCay, gomTheoWbs, xepTangB, type DauViecCay, type NutCay, type ViecCay } from "./thuan";

export interface ViecGang {
  wbs: string;
  ten: string;
  batDau: string;
  ketThuc: string;
  pct: number;
  quanHeTruoc: string;
}

export interface DongGang extends ViecGang {
  viec: ViecCay[];
  daCoAiNhan: boolean;
}

export interface DuLieuCayViec {
  cod_du_bao: string;
  cod_muc_tieu: string;
  lech_ngay_so_muc_tieu: number;
  chuoi_gang: DongGang[];
  cay: NutCay[];
}

/** Tình trạng nguồn việc (sổ cái) — thay TinhTrangBase của agent Base */
export interface TinhTrangSoViec {
  ok: boolean;
  thong_diep?: string;
  tenDuAn?: string;
  tongSoViec?: number;
  soViecGanDuocWbs?: number;
  soDaXet?: number;
  soChoDuyet?: number;
  mauChuaGan?: string[];
  ganTheoDuong?: Record<"ai_cho" | "ai_duyet" | "nguoi" | "ten_viec", number>;
  nutGangChuaGiao?: number;
  tongWbs?: number;
  soGiaiDoan?: number;
  codDuBao?: string;
  tongGang?: number;
  gangTheoNhom?: string;
  soNutGangCoViec?: number;
  /** Thẻ ④ tách số (04/10): việc lá găng · đã có việc · không cần giao · đã xong theo tiến độ · chưa tới lúc giao */
  soGangLa?: number;
  soLaCoViec?: number;
  soLaKhongCan?: number;
  soLaDaXong?: number;
  soLaChuaToiLuc?: number;
  /** Cửa sổ giao việc găng (ngày) và ngày cuối cửa sổ (yyyy-mm-dd) */
  cuaSoGiaoNgay?: number;
  ngayCuoiCuaSo?: string;
  /** Ngưỡng độ chắc (0–1) của nút duyệt cả lô — đọc từ Cài đặt › Gắn việc vào WBS (ô «Ngưỡng độ chắc») */
  nguongDuyetLo?: number;
  viecChuaGan?: ViecCay[];
  tongViecChuaGan?: number;
  /** Việc 🤖 đề xuất mã WBS còn chờ duyệt — nút "🤖 Duyệt gán mã công việc" trên cây (Mr. Đại chốt 05/10, cách A) */
  viecChoDuyet?: ViecCay[];
  lanChayGan?: { luc: string; thongDiep: string } | null;
  soKetLuanKhongThuoc?: number;
  lucDocSoCai?: string;
  lucLayTienDo?: string;
}

export interface QuyenMan {
  /** "🤖 Gán mã ngay" — quyền Duyệt gắn WBS (như API gan-wbs đang đòi) */
  gan: boolean;
  /** Soạn giao · Giao việc · Không cần giao — quyền Giao việc */
  giao: boolean;
}

export type TraManCayViec =
  | { ok: true; du_an: { id: string; ten: string }; du_lieu: DuLieuCayViec; nguon: NguonMcp[]; so_viec: TinhTrangSoViec; quyen: QuyenMan }
  | { ok: false; ma_loi: string; thong_diep: string; du_an?: { id: string; ten: string }; so_viec?: TinhTrangSoViec; quyen?: QuyenMan };

export type HoiTienDo = (maTienDo: string, lyDo: string) => Promise<KhuonTra>;

export interface NguonHoi {
  hoiGang: HoiTienDo;
  hoiCay: HoiTienDo;
}

/** Dự án của màn: ?du_an, không có thì dự án ĐẦU TIÊN có cây WBS (mọi nhóm — Mr. Đại sửa 03/10: cả SCI đầu tư lẫn Loại khác).
 *  Link cũ ?du_an=da-hv vẫn mở đúng dự án (mã đổi sang mã ngắn Main — LOI-DUNG-CHUNG 6g.6). */
export function chonDuAn<T extends { id: string; ma_tien_do?: string | null }>(ds: T[], duAnId: string | null | undefined): T | undefined {
  if (!duAnId) return ds.find((d) => d.ma_tien_do);
  const ma = doiMaCu(duAnId);
  return ds.find((d) => d.id === duAnId) ?? ds.find((d) => d.id === ma);
}

export async function dungManCayViec(nd: NguoiDungPhien, duAnId: string | null, nguon: NguonHoi): Promise<TraManCayViec> {
  const dsDuAn = await tx((q) => layCauHinh(q, "du_an"));
  const da = chonDuAn(dsDuAn, duAnId);
  if (!da) {
    if (duAnId) throw new LoiHttp(404, `Không có dự án "${duAnId}" trong Cài đặt › Sơ đồ tổ chức dự án`);
    return { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: 'Chưa dự án nào có cây WBS bên agent Tiến độ — chưa có gì để soi việc' };
  }
  const quyen: QuyenMan = { gan: nd.la_quan_tri || !!nd.quyen["wbs.duyet"], giao: nd.la_quan_tri || !!nd.quyen["cong_viec.giao"] };
  const duAn = { id: da.id, ten: da.ten };
  if (!da.ma_tien_do) {
    // Thà trống còn hơn hiện số của dự án khác (chốt 13/09 bên Base)
    return { ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: `Dự án ${da.ten} chưa có cây WBS bên agent Tiến độ (máy tự điền "Mã bên Tiến độ" khi bên đó có cây)`, du_an: duAn, quyen };
  }
  const maTienDo = da.ma_tien_do;

  const [ketGang, ketCay, viec] = await Promise.all([
    nguon.hoiGang(maTienDo, `màn Cây việc & đường găng — tìm nút găng chưa ai được giao (dự án ${da.ten})`),
    nguon.hoiCay(maTienDo, `màn Cây việc — dựng cây theo giai đoạn để lọc găng/giai đoạn (dự án ${da.ten})`),
    tx((q) => viecSoCaiCuaDuAn(q, dsDuAn, da.id, nd)),
  ]);
  const lucDoc = new Date().toISOString();
  const gom = gomTheoWbs(viec);

  if (!ketGang.ok) {
    return {
      ok: false,
      ma_loi: ketGang.ma_loi,
      thong_diep: ketGang.thong_diep,
      du_an: duAn,
      quyen,
      so_viec: { ok: true, tenDuAn: da.ten, tongSoViec: gom.tongSoViec },
    };
  }

  const goc = ketGang.du_lieu as { cod_du_bao: string; cod_muc_tieu: string; lech_ngay_so_muc_tieu: number; chuoi_gang?: ViecGang[] };
  const chuoi: DongGang[] = (goc.chuoi_gang ?? []).map((v) => {
    const ds = gom.theoWbs.get(v.wbs) ?? [];
    return { ...v, viec: ds, daCoAiNhan: ds.some((x) => !x.daXong && x.nguoiPhuTrach !== "") };
  });

  // Thiếu cây thì cây trống, hai phần kia vẫn chạy — "phần đi hỏi được phép thiếu"
  const tasks: DauViecCay[] = ketCay.ok ? (((ketCay.du_lieu as { tasks?: DauViecCay[] }).tasks ?? []) as DauViecCay[]) : [];
  const boQua = tapKhongCanGiao(da.id);
  // Cửa sổ giao việc găng (Mr. Đại chốt 04/10, mặc định 7 ngày — Cài đặt › Gắn việc vào WBS)
  const homNay = homNayVN();
  const chWbs = await tx((q) => layCauHinh(q, "gan_wbs"));
  const cuaSo = chWbs.cua_so_giao_ngay ?? 7;
  const cay = dungCay(tasks, gom.theoWbs, boQua, homNay, cuaSo);
  const the = demBonThe(tasks, gom.theoWbs, boQua, homNay, cuaSo);
  const lan = lanChayCuoi();
  const lanDa = lan?.ket_qua.find((k) => k.du_an_id === da.id);

  return {
    ok: true,
    du_an: duAn,
    du_lieu: { cod_du_bao: goc.cod_du_bao, cod_muc_tieu: goc.cod_muc_tieu, lech_ngay_so_muc_tieu: goc.lech_ngay_so_muc_tieu, chuoi_gang: chuoi, cay },
    nguon: ketGang.nguon,
    quyen,
    so_viec: {
      ok: true,
      tenDuAn: da.ten,
      tongSoViec: gom.tongSoViec,
      soViecGanDuocWbs: gom.ganDuoc,
      soDaXet: gom.daXet,
      soChoDuyet: gom.choDuyet,
      mauChuaGan: gom.mauChuaGan,
      ganTheoDuong: gom.theoDuong,
      ...the,
      soGiaiDoan: cay.length,
      nguongDuyetLo: chWbs.nguong_tu_duyet,
      codDuBao: goc.cod_du_bao,
      lanChayGan: lan ? { luc: lan.luc, thongDiep: lan.loi ? `lỗi: ${lan.loi}` : (lanDa?.thong_diep ?? "lượt này không xét dự án này") } : null,
      soKetLuanKhongThuoc: gom.khongThuoc,
      // Tầng B cắt 60 dòng: bảng để NHÌN, không phải để tải hết dữ liệu
      viecChuaGan: xepTangB(gom.chuaGan).slice(0, 60),
      tongViecChuaGan: gom.chuaGan.length,
      viecChoDuyet: gom.chuaGan.filter((v) => v.aiGanChuaSoat).slice(0, 200),
      lucDocSoCai: lucDoc,
      lucLayTienDo: ketGang.thoi_diem_tra_loi ?? lucDoc,
    },
  };
}
