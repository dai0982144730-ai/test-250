// ============================================================
// so-cai/ra-soat.ts — KIỂM SOÁT SỔ CÁI: sổ cái đã nhận HẾT việc của mọi báo cáo đã gửi chưa, và nếu thiếu thì VÌ SAO.
// Không dùng AI: đọc lại từng báo cáo bằng quy tắc lấy việc hiện tại, đối chiếu từng dòng việc với sổ cái (bảng + dòng + ý).
// Chỉ xét tài liệu đã đi qua luồng gửi (gửi · gửi mới · gửi lại · file kèm khi chuyển tiếp) — tải thẳng lên thư mục không vào sổ.
//
// LÝ DO THIẾU (so với kết quả kiểm tra đã lưu lúc gửi):
//   · quy_tac_moi — lúc gửi, quy tắc lấy việc chưa đọc dòng này (vd trước đây chưa lấy việc ở bảng Kiến nghị / GPMB /
//     Tiến độ thiết kế khi đã có bảng Công việc). Nay đã đọc được → bấm "Bổ sung" để ghi vào sổ.
//   · loi_ghi_so  — lúc gửi ĐÃ đọc được dòng này mà sổ cái không ghi: lỗi hệ thống, cần kiểm tra code.
//   · khong_ro    — bản gửi không còn kết quả kiểm tra đã lưu để so.
//
// Ba cách chạy (mỗi lần lưu một dòng docflow.ra_soat_so_cai):
//   · tu_dong — TỰ CHẠY NGAY khi có thể phát sinh thiếu (so-cai/hen-gio.ts → raSoatNen): khởi động lại (cập nhật phần mềm,
//     quy tắc lấy việc mở rộng), đổi cài đặt, sau lần gửi mà sổ cái thiếu dòng; thêm một lượt dự phòng hằng ngày.
//     Còn thiếu thì TỰ BỔ SUNG luôn (so_cai.tu_bo_sung_thieu, mặc định bật) rồi báo quản trị — không chờ bấm tay.
//   · bam_tay — quản trị bấm "Rà soát" (Cài đặt, trang Issue).  · bo_sung — quản trị bấm "Bổ sung".
// Ngoài ra doiChieuSauGui chạy NGAY sau mỗi lần gửi: dòng việc vừa gửi mà sổ cái không có → ghi lịch sử + báo quản trị.
// ============================================================
import type { Q } from "@/lib/db";
import type { DauVaoSoCai, DongCongViec, DuDoanDong, NguoiDungPhien } from "@/lib/types";
import { napNguoiDung } from "@/lib/phien";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { docPhienBan } from "@/lib/thu-muc/dich-vu";
import { MAY_DOC_TOAN_VAN } from "@/lib/bao-mat/loc";
import { kiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { dungDauVao } from "@/lib/kiem-tra/dau-vao";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { taoThongBao } from "@/lib/thong-bao";
import { ghiVaoSoCai, xemTruocVaoSoCai } from "./dich-vu";
import { dongQuyetDinh } from "./doc-them";
import { ngayNgan } from "./tien-ich";
import { dongViecTuAi, soDongAiDaCo, type ThemViecAi } from "./ai-doc-bao-cao";
import { docNgay } from "@/lib/kiem-tra/chuan-hoa";
import { LoiHttp } from "@/lib/phien";
import { DUONG_RA_SOAT } from "./duong-ra-soat";

export type LyDoThieu = "quy_tac_moi" | "loi_ghi_so" | "khong_ro";

export interface DongThieu {
  nguon_bang: string;
  dong_so: number;
  y_so?: number;
  ten: string;
  ket_thuc: string | null;
  ly_do: LyDoThieu;
  /** câu giải thích cho người đọc */
  giai_thich: string;
  /** sau khi bổ sung: vào việc nào, bằng cách nào */
  cong_viec_id?: string;
  hanh_dong?: DuDoanDong["hanh_dong"];
  ghi_chu?: string;
}

export interface TaiLieuRaSoat {
  tai_lieu_id: string;
  ten: string;
  phien_ban: number;
  ngay_gui: string;
  so_viec: number;
  da_co: number;
  thieu: DongThieu[];
  /** dòng "Nội dung cần TGĐ quyết định" (Form 0) chưa được TGĐ giao việc — đúng thiết kế, chỉ để biết */
  cho_quyet_dinh: number;
  /** việc "AI đọc báo cáo" tìm thấy ngoài bảng mà chưa vào sổ cái (quản trị xem và chọn) */
  /** AI đã đọc bản này chưa */
  ai_da_doc?: boolean;
  loi?: string;
}

export interface KetQuaRaSoat {
  luc?: string;
  cach_chay?: string;
  so_tai_lieu: number;
  so_viec: number;
  so_thieu: number;
  so_loi_ghi_so: number;
  so_bo_sung: number;
  so_cho_quyet_dinh: number;
  /** tổng việc AI tìm thấy ngoài bảng chưa vào sổ cái */
  tai_lieu: TaiLieuRaSoat[];
}

const TEN_BANG: Record<string, string> = {
  bang_cong_viec: "Kết quả và kế hoạch việc",
  bang_ke_hoach: "Kế hoạch công việc",
  bang_kien_nghi: "Kiến nghị",
  bang_su_co: "Sự cố thiết bị",
  bang_canh_bao: "Cảnh báo hồ sơ / kỹ thuật",
  bang_gpmb: "GPMB",
  bang_tien_do_tk: "Tiến độ thiết kế",
  bang_an_toan: "An toàn — hành động ngay",
};
export const tenBang = (tag: string) => TEN_BANG[tag] ?? tag;

/** Khóa một dòng việc trong một bản tài liệu (dòng không tách ý = ý 1). */
const khoa = (bang: string, dong: number, y?: number | string | null) => `${bang}:${dong}:${y ? Number(y) : 1}`;

/** Khóa các dòng việc đã có bản ghi trong sổ cái của một bản tài liệu. */
async function khoaDaVaoSo(q: Q, taiLieuId: string, phienBan: number): Promise<Set<string>> {
  const { rows } = await q.query<{ bang: string; dong: number; y: string | null }>(
    `SELECT du_lieu->>'nguon_bang' AS bang, dong_so AS dong, du_lieu->>'y_so' AS y
       FROM docflow.nguon_cong_viec WHERE tai_lieu_id = $1 AND phien_ban = $2 AND NOT la_quyet_dinh`,
    [taiLieuId, phienBan],
  );
  return new Set(rows.map((r) => khoa(r.bang, r.dong, r.y)));
}

function giaiThich(ly: LyDoThieu, d: DongCongViec, ngayGui: string, bangLucGui: Set<string>): string {
  const bang = `bảng "${tenBang(d.nguon_bang)}"`;
  if (ly === "loi_ghi_so") return `Lúc gửi đã đọc được dòng này nhưng sổ cái không ghi — lỗi hệ thống, cần kiểm tra`;
  if (ly === "khong_ro") return `Bản gửi không còn kết quả kiểm tra lúc gửi để so — đọc lại nay thấy dòng này ở ${bang}`;
  return bangLucGui.has(d.nguon_bang)
    ? `Lúc gửi (${ngayNgan(ngayGui, true)}) quy tắc lấy việc chưa đọc được dòng này ở ${bang}; quy tắc đã sửa sau đó`
    : `Lúc gửi (${ngayNgan(ngayGui, true)}) hệ thống chưa lấy việc ở ${bang}; quy tắc lấy việc đã mở rộng sau đó`;
}

/** Bản đã gửi: gửi / gửi mới / gửi lại + file kèm khi chuyển tiếp. Mỗi tài liệu lấy bản mới nhất, lúc gửi đầu tiên của bản đó. */
async function banDaGui(q: Q): Promise<{ tai_lieu_id: string; phien_ban: number; luc: string; nguoi: string }[]> {
  const { rows } = await q.query<{ tai_lieu_id: string; phien_ban: number; luc: string; nguoi: string }>(
    `WITH b AS (
       SELECT tai_lieu_id, phien_ban, luc, tu_nguoi FROM docflow.buoc_hanh_trinh WHERE loai IN ('gui', 'gui_moi', 'gui_lai')
       UNION ALL
       SELECT k->>'tai_lieu_id', (k->>'phien_ban')::int, b.luc, b.tu_nguoi
         FROM docflow.buoc_hanh_trinh b, jsonb_array_elements(b.tep_kem) k WHERE b.loai = 'chuyen_tiep_kem'
     ), moi AS (SELECT tai_lieu_id, max(phien_ban) AS phien_ban FROM b GROUP BY tai_lieu_id)
     SELECT b.tai_lieu_id, b.phien_ban, min(b.luc)::text AS luc, (array_agg(b.tu_nguoi ORDER BY b.luc))[1] AS nguoi
       FROM b JOIN moi USING (tai_lieu_id, phien_ban)
      -- văn bản đến từ bên ngoài không sinh việc (chốt 28/09): không rà, không tự bổ sung, AI không đọc
      WHERE NOT EXISTS (SELECT 1 FROM docflow.tai_lieu t WHERE t.id = b.tai_lieu_id AND t.nguoi_gui_that IS NOT NULL)
      GROUP BY b.tai_lieu_id, b.phien_ban
      ORDER BY min(b.luc)`,
  );
  return rows;
}


export async function raSoatSoCai(q: Q, tuyChon: { ghi?: boolean; tai_lieu_id?: string } = {}): Promise<KetQuaRaSoat> {
  const daGui = (await banDaGui(q)).filter((g) => !tuyChon.tai_lieu_id || g.tai_lieu_id === tuyChon.tai_lieu_id);
  const capNgoai = (await layCauHinh(q, "nguoi_ngoai")).cap_ben_ngoai;
  const kq: KetQuaRaSoat = { so_tai_lieu: 0, so_viec: 0, so_thieu: 0, so_loi_ghi_so: 0, so_bo_sung: 0, so_cho_quyet_dinh: 0, tai_lieu: [] };
  const nguoiCache = new Map<string, NguoiDungPhien | null>();

  for (const g of daGui) {
    const tl = (
      await q.query<{ ten: string; don_vi_lap: string | null; nguoi_gui_that: string | null }>(
        "SELECT ten, don_vi_lap, nguoi_gui_that FROM docflow.tai_lieu WHERE id = $1",
        [g.tai_lieu_id],
      )
    ).rows[0];
    if (!tl) continue;
    const muc: TaiLieuRaSoat = { tai_lieu_id: g.tai_lieu_id, ten: tl.ten, phien_ban: g.phien_ban, ngay_gui: new Date(g.luc).toISOString(), so_viec: 0, da_co: 0, thieu: [], cho_quyet_dinh: 0 };
    try {
      if (!nguoiCache.has(g.nguoi)) nguoiCache.set(g.nguoi, await napNguoiDung(q, g.nguoi));
      const nd = nguoiCache.get(g.nguoi);
      if (!nd) throw new Error(`không còn tài khoản người gửi ${g.nguoi}`);
      // Máy kiểm lại đủ mục như lúc gửi để đối chiếu sổ cái — cần toàn văn; kết quả chỉ là tên việc chương "Kết quả và kế hoạch việc"
      const { thong_tin, noi_dung } = await docPhienBan(q, g.tai_lieu_id, g.phien_ban, MAY_DOC_TOAN_VAN);
      const k = await kiemTraDayDu(q, nd, noi_dung, thong_tin.ten_tep, {
        don_vi_lap: tl.don_vi_lap,
        tai_lieu_id: g.tai_lieu_id,
        phien_ban: g.phien_ban,
        nguoi_gui_that: tl.nguoi_gui_that,
        bo_qua_so_cai: true,
        ngay_nop: thong_tin.tai_len_luc,
      });
      if (k.tu_do || !k.mau) continue; // tài liệu không theo mẫu: không có bảng việc
      const tenDv = tl.don_vi_lap ? ((await q.query<{ ten: string }>("SELECT ten FROM identity.don_vi WHERE id = $1", [tl.don_vi_lap])).rows[0]?.ten ?? tl.don_vi_lap) : nd.ten;
      const { dau_vao } = dungDauVao({
        kq: k,
        mau: k.mau,
        tai_lieu_id: g.tai_lieu_id,
        phien_ban: g.phien_ban,
        ten_don_vi: tenDv,
        don_vi_id: tl.don_vi_lap,
        cap: tl.nguoi_gui_that ? capNgoai : nd.cap,
        nguoi_gui: nd.id,
        ngay_gui: muc.ngay_gui,
      });
      const qd = await dongQuyetDinh(q, g.tai_lieu_id, g.phien_ban);
      muc.cho_quyet_dinh = (qd?.dong ?? []).filter((d) => !d.da_giao).length;
      const co = await khoaDaVaoSo(q, g.tai_lieu_id, g.phien_ban);
      // Việc người gửi đã BỎ ở bước Duyệt việc (db/71) — cố ý không vào sổ, không phải "thiếu"
      const biBo = await q.query<{ nguon_bang: string; dong_so: number; y_so: number }>(
        "SELECT nguon_bang, dong_so, y_so FROM docflow.viec_bi_bo WHERE tai_lieu_id = $1 AND phien_ban = $2",
        [g.tai_lieu_id, g.phien_ban],
      );
      for (const b of biBo.rows) co.add(khoa(b.nguon_bang, b.dong_so, b.y_so));
      // Kết quả kiểm tra LÚC GỬI (đã lưu cùng phiên bản) — để biết vì sao thiếu
      const lucGui = (thong_tin.ket_qua_kiem_tra?.cong_viec ?? null) as DongCongViec[] | null;
      const khoaLucGui = new Set((lucGui ?? []).map((d) => khoa(d.nguon_bang, d.dong_so, d.y_so)));
      const bangLucGui = new Set((lucGui ?? []).map((d) => d.nguon_bang));
      muc.so_viec = dau_vao.cong_viec.length;
      const chiSoThieu: number[] = [];
      dau_vao.cong_viec.forEach((d, i) => {
        if (co.has(khoa(d.nguon_bang, d.dong_so, d.y_so))) return;
        if (d.da_xong) return; // báo đã xong: không vào sổ cái nếu sổ chưa có việc đó (chốt 02/10) — không phải "thiếu"
        chiSoThieu.push(i);
        const ly: LyDoThieu = !lucGui ? "khong_ro" : khoaLucGui.has(khoa(d.nguon_bang, d.dong_so, d.y_so)) ? "loi_ghi_so" : "quy_tac_moi";
        muc.thieu.push({
          nguon_bang: d.nguon_bang,
          dong_so: d.dong_so,
          ...(d.y_so ? { y_so: d.y_so } : {}),
          ten: d.ten,
          ket_thuc: d.ket_thuc ?? null,
          ly_do: ly,
          giai_thich: giaiThich(ly, d, muc.ngay_gui, bangLucGui),
        });
      });
      muc.da_co = muc.so_viec - muc.thieu.length;
      if (tuyChon.ghi && chiSoThieu.length) {
        // Tự gộp CHỈ khi gần như trùng tên (≥ 90%) với việc ĐANG MỞ. Trước 02/10 gộp vào "việc giống nhất" bất kể điểm — kiểu
        // này đã đóng nhầm CV-2026-0086 "Nghiệm thu móng trụ T5–T8" bằng dòng "Thi công … đã xong" (máy chấm giống 83%).
        // Không chắc → để người chọn ở Rà soát; dòng báo đã xong không bao giờ thành việc mới (so-cai/dich-vu.ts).
        const xac: Record<number, string> = {};
        for (const d of await xemTruocVaoSoCai(q, dau_vao)) {
          const g = d.goi_y?.[0];
          if (d.hanh_dong === "goi_y_trung" && g && !g.da_xong && g.do_giong >= 0.9) xac[d.dong] = g.cong_viec_id;
        }
        const ghi = await ghiVaoSoCai(q, { ...dau_vao, xac_nhan_trung: xac });
        chiSoThieu.forEach((ci, j) => {
          const r = ghi.find((x) => x.dong === ci);
          if (r?.cong_viec_id) Object.assign(muc.thieu[j], { cong_viec_id: r.cong_viec_id, hanh_dong: r.hanh_dong, ...(r.ly_do ? { ghi_chu: r.ly_do } : {}) });
        });
        kq.so_bo_sung += muc.thieu.filter((t) => t.cong_viec_id).length;
      }
    } catch (e) {
      muc.loi = e instanceof Error ? e.message : String(e);
    }
    kq.so_tai_lieu++;
    kq.so_viec += muc.so_viec;
    kq.so_thieu += muc.thieu.length;
    kq.so_loi_ghi_so += muc.thieu.filter((t) => t.ly_do === "loi_ghi_so").length;
    kq.so_cho_quyet_dinh += muc.cho_quyet_dinh;
    // Không đếm "việc AI tìm ngoài bảng" nữa (Mr. Đại chốt 29/09): người nộp quyết ở bước 4 lúc gửi
    kq.tai_lieu.push(muc);
  }
  return kq;
}

/** Lưu kết quả một lần rà soát. Trả kết quả kèm lúc chạy. */
export async function luuRaSoat(q: Q, kq: KetQuaRaSoat, cach: "tu_dong" | "bam_tay" | "bo_sung", nguoi: string | null): Promise<KetQuaRaSoat> {
  // Giữ mọi tài liệu đã gửi (danh sách ngắn): trang Rà soát cho "AI đọc phần chữ tự do" từng báo cáo
  const gon = kq;
  const { rows } = await q.query<{ luc: string }>(
    `INSERT INTO docflow.ra_soat_so_cai (cach_chay, nguoi, so_tai_lieu, so_viec, so_thieu, so_loi_ghi_so, so_bo_sung, ket_qua)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING luc::text`,
    [cach, nguoi, kq.so_tai_lieu, kq.so_viec, kq.so_thieu, kq.so_loi_ghi_so, kq.so_bo_sung, JSON.stringify(gon)],
  );
  return { ...kq, luc: new Date(rows[0].luc).toISOString(), cach_chay: cach };
}

/** Kết quả rà soát mới nhất (không chạy lại). Sau khi bổ sung, số "thiếu" là số còn lại chưa ghi được. */
export async function raSoatMoiNhat(q: Q): Promise<KetQuaRaSoat | null> {
  const { rows } = await q.query<{ luc: string; cach_chay: string; ket_qua: KetQuaRaSoat }>(
    "SELECT luc::text, cach_chay, ket_qua FROM docflow.ra_soat_so_cai ORDER BY id DESC LIMIT 1",
  );
  if (!rows[0]) return null;
  const kq = typeof rows[0].ket_qua === "string" ? (JSON.parse(rows[0].ket_qua) as KetQuaRaSoat) : rows[0].ket_qua;
  if (rows[0].cach_chay === "bo_sung") {
    // Dòng đã bổ sung không còn là "thiếu"
    for (const t of kq.tai_lieu) t.thieu = t.thieu.filter((d) => !d.cong_viec_id);
    kq.so_thieu = kq.tai_lieu.reduce((s, t) => s + t.thieu.length, 0);
    kq.so_loi_ghi_so = kq.tai_lieu.reduce((s, t) => s + t.thieu.filter((d) => d.ly_do === "loi_ghi_so").length, 0);
  }
  return { ...kq, luc: new Date(rows[0].luc).toISOString(), cach_chay: rows[0].cach_chay };
}

/**
 * Rà soát TỰ ĐỘNG (bộ hẹn giờ, khởi động, đổi cài đặt, sau khi gửi — so-cai/hen-gio.ts): còn thiếu thì TỰ BỔ SUNG ngay
 * (so_cai.tu_bo_sung_thieu) — như quản trị bấm "Bổ sung": việc có vẻ trùng gộp vào việc giống nhất — rồi báo quản trị;
 * tắt tự bổ sung thì chỉ báo.
 * `tai_lieu_id`: chỉ rà một báo cáo (sau khi gửi) — không lưu thành "kết quả rà soát mới nhất" (trang Rà soát giữ bản toàn bộ).
 */
export async function raSoatHangNgay(q: Q, tuy: { ly_do?: string; tai_lieu_id?: string } = {}): Promise<KetQuaRaSoat> {
  const lyDo = tuy.ly_do ?? "Rà soát hằng ngày";
  const motBan = !!tuy.tai_lieu_id;
  const luu = (k: KetQuaRaSoat, cach: "tu_dong" | "bo_sung") => (motBan ? Promise.resolve(k) : luuRaSoat(q, k, cach, null));
  let kq = await raSoatSoCai(q, { tai_lieu_id: tuy.tai_lieu_id });
  if (kq.so_thieu > 0 && (await layCauHinh(q, "so_cai")).tu_bo_sung_thieu !== false) {
    const bs = await luu(await raSoatSoCai(q, { ghi: true, tai_lieu_id: tuy.tai_lieu_id }), "bo_sung");
    await taoThongBao(q, {
      nguoi_nhan: "quan-tri",
      loai: "so_cai_thieu",
      noi_dung:
        `${lyDo}: đã TỰ BỔ SUNG ${bs.so_bo_sung}/${bs.so_thieu} việc còn thiếu vào sổ cái` +
        (bs.so_loi_ghi_so ? ` — ${bs.so_loi_ghi_so} dòng là LỖI GHI SỔ (lúc gửi đã đọc được mà không ghi), cần kiểm tra` : "") +
        (bs.so_bo_sung < bs.so_thieu ? ` — ${bs.so_thieu - bs.so_bo_sung} việc chưa ghi được, xem chi tiết` : ""),
      lien_ket: DUONG_RA_SOAT,
    });
    // đối chiếu lại sau khi bổ sung: còn sót (không ghi được) thì báo như bình thường ở dưới
    kq = await raSoatSoCai(q, { tai_lieu_id: tuy.tai_lieu_id });
    if (kq.so_thieu === 0) {
      return bs;
    }
  }
  kq = await luu(kq, "tu_dong");
  if (kq.so_thieu > 0) {
    const soTl = kq.tai_lieu.filter((t) => t.thieu.length).length;
    await taoThongBao(q, {
      nguoi_nhan: "quan-tri",
      loai: "so_cai_thieu",
      noi_dung:
        `${lyDo}: sổ cái còn thiếu ${kq.so_thieu} việc của ${soTl} báo cáo đã gửi` +
        (kq.so_loi_ghi_so ? ` — trong đó ${kq.so_loi_ghi_so} dòng là LỖI GHI SỔ (lúc gửi đã đọc được mà không ghi)` : " — bấm Bổ sung để ghi"),
      lien_ket: DUONG_RA_SOAT,
    });
  }
  return kq;
}

/**
 * Đối chiếu NGAY SAU KHI GỬI: mọi dòng việc vừa đưa vào sổ cái phải có bản ghi. Thiếu (lỗi hệ thống) thì ghi lịch sử
 * và báo quản trị — không chặn việc gửi. Trả danh sách dòng thiếu (rỗng = bình thường).
 */
export async function doiChieuSauGui(q: Q, dv: DauVaoSoCai, nguoi: string, tenTaiLieu: string): Promise<DongCongViec[]> {
  if (!dv.tai_lieu_id || dv.phien_ban === null) return [];
  const co = await khoaDaVaoSo(q, dv.tai_lieu_id, dv.phien_ban);
  const boQua = await q.query<{ nguon_bang: string; dong_so: number; y_so: number }>(
    "SELECT nguon_bang, dong_so, y_so FROM docflow.viec_bi_bo WHERE tai_lieu_id = $1 AND phien_ban = $2",
    [dv.tai_lieu_id, dv.phien_ban],
  );
  for (const b of boQua.rows) co.add(khoa(b.nguon_bang, b.dong_so, b.y_so));
  const thieu = dv.cong_viec.filter((d) => d?.ten?.trim() && !d.da_xong && !co.has(khoa(d.nguon_bang, d.dong_so, d.y_so)));
  if (!thieu.length) return [];
  await ghiLichSu(q, {
    nguoi,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: dv.tai_lieu_id,
    hanh_dong: "so_cai_thieu",
    chi_tiet: { phien_ban: dv.phien_ban, dong: thieu.map((d) => ({ bang: d.nguon_bang, dong: d.dong_so, ...(d.y_so ? { y: d.y_so } : {}), ten: d.ten })) },
  });
  await taoThongBao(q, {
    nguoi_nhan: "quan-tri",
    loai: "so_cai_thieu",
    noi_dung: `Vừa gửi "${tenTaiLieu}" nhưng sổ cái không ghi ${thieu.length} dòng việc (${thieu
      .slice(0, 3)
      .map((d) => `${tenBang(d.nguon_bang)} dòng ${d.dong_so}: ${d.ten}`)
      .join("; ")}${thieu.length > 3 ? "; …" : ""}) — lỗi ghi sổ, cần kiểm tra`,
    lien_ket: `/tai-lieu/${dv.tai_lieu_id}`,
  });
  return thieu;
}

/**
 * Việc "AI đọc báo cáo" tìm thấy ngoài bảng của một báo cáo ĐÃ GỬI (quản trị chọn trong Rà soát) → ghi vào sổ cái
 * như lúc gửi: đúng người gửi, cấp, ngày gửi gốc; việc có vẻ trùng thì gộp theo lựa chọn ("gop").
 */
export async function themViecAiChoBanDaGui(q: Q, taiLieuId: string, them: ThemViecAi[]): Promise<DuDoanDong[]> {
  const { rows } = await q.query<{ phien_ban: number; luc: string; nguoi: string }>(
    `SELECT phien_ban, min(luc)::text AS luc, (array_agg(tu_nguoi ORDER BY luc))[1] AS nguoi FROM docflow.buoc_hanh_trinh
      WHERE tai_lieu_id = $1 AND loai IN ('gui', 'gui_moi', 'gui_lai') GROUP BY phien_ban ORDER BY phien_ban DESC LIMIT 1`,
    [taiLieuId],
  );
  const g = rows[0];
  if (!g) throw new LoiHttp(400, "Tài liệu chưa gửi — việc chỉ vào sổ cái khi báo cáo đã gửi");
  const tl = (await q.query<{ don_vi_lap: string | null; nguoi_gui_that: string | null; ten: string }>("SELECT don_vi_lap, nguoi_gui_that, ten FROM docflow.tai_lieu WHERE id = $1", [taiLieuId])).rows[0];
  if (tl.nguoi_gui_that) throw new LoiHttp(400, `Văn bản đến từ ${tl.nguoi_gui_that} (ngoài công ty) không sinh việc — cần làm gì thì giao việc thủ công`);
  const nd = await napNguoiDung(q, g.nguoi);
  if (!nd) throw new LoiHttp(400, `Không còn tài khoản người gửi ${g.nguoi}`);
  const { thong_tin } = await docPhienBan(q, taiLieuId, g.phien_ban, MAY_DOC_TOAN_VAN); // máy ghi sổ cái từ kết quả kiểm tra đã lưu
  const kqLuu = thong_tin.ket_qua_kiem_tra;
  if (!kqLuu) throw new LoiHttp(400, "Bản gửi không còn kết quả kiểm tra");
  const ky = kqLuu.ky_bao_cao;
  const nam = ky?.nam ?? (ky?.den ? Number(ky.den.slice(0, 4)) : new Date().getFullYear());
  const dv = tl.don_vi_lap ? (await q.query<{ ten: string; ten_ngan: string; loai: string }>("SELECT ten, ten_ngan, loai FROM identity.don_vi WHERE id = $1", [tl.don_vi_lap])).rows[0] : null;
  const { dau_vao } = dungDauVao({
    kq: { ...kqLuu, cong_viec: [] },
    mau: null,
    tai_lieu_id: taiLieuId,
    phien_ban: g.phien_ban,
    ten_don_vi: dv?.ten ?? nd.ten,
    don_vi_id: tl.don_vi_lap,
    cap: tl.nguoi_gui_that ? (await layCauHinh(q, "nguoi_ngoai")).cap_ben_ngoai : nd.cap,
    nguoi_gui: nd.id,
    ngay_gui: new Date(g.luc).toISOString(),
  });
  dau_vao.cong_viec = await dongViecTuAi(q, them, {
    don_vi_lap: tl.don_vi_lap,
    ten_don_vi_lap: dv?.ten ?? nd.ten,
    ngay_lap: kqLuu.ngay_nop ?? docNgay(kqLuu.o_nhap?.ngay_lap ?? "", nam).iso ?? ky?.den,
    nam,
    du_an: dv ? (["phong", "ban_tgd", "chuc_danh"].includes(dv.loai) ? "Công ty" : dv.ten_ngan) : null,
    dongBatDau: await soDongAiDaCo(q, taiLieuId, g.phien_ban),
  });
  const xac: Record<number, string> = {};
  them.forEach((v, j) => {
    if (v.gop) xac[j] = v.gop;
  });
  dau_vao.xac_nhan_trung = xac;
  const kq = await ghiVaoSoCai(q, dau_vao);
  await doiChieuSauGui(q, dau_vao, nd.id, tl.ten);
  return kq;
}
