// ============================================================
// gui/dich-vu.ts — GỬI · NHẬN · CHUYỂN TIẾP · CHUYỂN TIẾP KÈM · TRẢ LẠI · GỬI LẠI · GỬI MỚI · HOÀN THÀNH.
// Chủ module: gui (giai đoạn 3). Mỗi thao tác = một bước trên cây hành trình, chạy trong MỘT giao dịch
// (người gọi bọc tx): thư mục (thu-muc/dich-vu) + sổ cái (so-cai/dich-vu) + lịch sử. Không có thu hồi.
//
// Bảng "Mỗi thao tác làm gì" (kế hoạch v2):
//   Gửi            → Đến của mỗi nơi nhận + Đi của người gửi · việc vào sổ cái · mỗi nơi nhận một bước riêng
//   Nhận           → không đổi thư mục/sổ cái · người gửi thấy "đã nhận lúc …"
//   Chuyển tiếp    → Đến của nơi nhận mới · sổ cái không đổi · không kiểm tra lại (cấu hình)
//   + gửi kèm      → tài liệu gốc + file kèm vào Đến · việc trong file kèm vào sổ cái · file kèm theo mẫu phải đạt
//   Trả lại        → về Đến của người gửi, nhãn "bi_tra_lai" · việc "đang chờ sửa" (cấu hình) · bắt buộc lý do
//   Gửi lại        → bản 2 thay bản 1 (bản 1 còn trong lịch sử) · sổ cái: bản 2 đè · qua kiểm tra lại · cùng hành trình
//   Gửi mới        → như Gửi · hành trình mới, "liên quan đến" tài liệu gốc
//   Hoàn thành     → nhánh dừng tại đây
// ============================================================
import type { Q } from "@/lib/db";
import type { DuDoanDong, NguoiDungPhien } from "@/lib/types";
import { LoiHttp } from "@/lib/phien";
import { taoMa } from "@/lib/ma";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import { nguoiCuaDonVi, taoThongBao } from "@/lib/thong-bao";
import { bamSha256 } from "@/lib/luu-tru/kho";
import { docPhienBan, ganNhan, themPhienBan, thuMucCuaDonVi } from "@/lib/thu-muc/dich-vu";
import { MAY_DOC_TOAN_VAN } from "@/lib/bao-mat/loc";
import { danhDauChoSua, ghiVaoSoCai } from "@/lib/so-cai/dich-vu";
import { kiemTraDayDu, rutGon, type KetQuaKiemTraDayDu } from "@/lib/kiem-tra/kiem-tra";
import { doiChieuSauGui } from "@/lib/so-cai/ra-soat";
import { raSoatNen } from "@/lib/so-cai/hen-gio";
import { boQuaViecAi, dongViecTuAi, layKetQuaAi, soDongAiDaCo, type ThemViecAi } from "@/lib/so-cai/ai-doc-bao-cao";
import { docNgay } from "@/lib/kiem-tra/chuan-hoa";
import { dungDauVao } from "@/lib/kiem-tra/dau-vao";
import { kiemLuatAiKhiGui } from "@/lib/luat/chay-luat";
import {
  baoNoiNhan,
  batBuocNoiNhan,
  coQuyenGui,
  dien,
  duocChuyenTiep,
  gioVN,
  kiemNguoiChuaGanDonVi,
  layBuoc,
  layTaiLieu,
  mauThongBao,
  phanTichNoiNhan,
  tenDonVi,
  tenNguoi,
  vaoThuMuc,
  type HangBuoc,
  type HangTaiLieu,
  type NoiNhan,
} from "./chung";
import { MA_BLD } from "@/lib/kiem-tra/viec-tu-kien-nghi";

export interface NutHanhTrinh {
  buoc_id: string;
  loai: "gui" | "chuyen_tiep" | "chuyen_tiep_kem" | "tra_lai" | "gui_lai" | "gui_moi" | "hoan_thanh";
  tai_lieu_id: string;
  phien_ban: number;
  tep_kem: { tai_lieu_id: string; phien_ban: number; ten: string }[];
  tu_don_vi: string | null;
  tu_nguoi: string;
  den_don_vi: string | null;
  ly_do: string | null;
  trang_thai: "cho_nhan" | "da_nhan" | "bi_tra_lai" | "da_xu_ly" | "hoan_thanh";
  nhan_luc: string | null;
  luc: string;
  con: NutHanhTrinh[];
  // Thông tin thêm để vẽ cây (không bắt buộc)
  hanh_trinh_id?: string;
  den_nguoi?: string | null;
  tu_ten?: string; // tên đơn vị gửi (hoặc người ngoài khi văn thư nhập thay)
  tu_nguoi_ten?: string;
  den_ten?: string; // tên đơn vị / người nhận
  nhan_boi?: string | null;
  nhan_boi_ten?: string | null;
  tai_lieu_ten?: string;
  lien_quan?: boolean; // nút gốc của hành trình mới "liên quan đến" tài liệu này
  nguoi_gui_that?: string | null;
}

const KHONG_CON_XU_LY = new Set(["bi_tra_lai", "hoan_thanh"]);

async function capNguon(q: Q, nd: NguoiDungPhien, tl: HangTaiLieu): Promise<number> {
  if (tl.nguoi_gui_that) return (await layCauHinh(q, "nguoi_ngoai")).cap_ben_ngoai;
  return nd.cap;
}

/** Kiểm tra lại phiên bản hiện tại của tài liệu (không hỏi sổ cái). */
async function kiemTraLai(q: Q, nd: NguoiDungPhien, tl: HangTaiLieu): Promise<{ kq: KetQuaKiemTraDayDu; phien_ban: number }> {
  // Máy kiểm lại đủ mục của mẫu khi gửi — cần toàn văn, kết quả không chứa chữ chương mật
  const { thong_tin, noi_dung } = await docPhienBan(q, tl.id, undefined, MAY_DOC_TOAN_VAN);
  const kq = await kiemTraDayDu(q, nd, noi_dung, thong_tin.ten_tep, {
    don_vi_lap: tl.don_vi_lap,
    tai_lieu_id: tl.id,
    phien_ban: thong_tin.phien_ban,
    nguoi_gui_that: tl.nguoi_gui_that,
    bo_qua_so_cai: true,
    ngay_nop: thong_tin.tai_len_luc,
  });
  return { kq, phien_ban: thong_tin.phien_ban };
}

function loiChan(kq: KetQuaKiemTraDayDu, ten: string): LoiHttp {
  const chan = kq.loi.filter((l) => l.muc === "chan").map((l) => l.thong_diep);
  return new LoiHttp(400, `"${ten}" chưa đạt kiểm tra: ${chan.slice(0, 3).join("; ")}${chan.length > 3 ? `; và ${chan.length - 3} lỗi khác` : ""}`);
}

/** Việc trong tài liệu vào sổ cái theo quy tắc đè (không có việc thì bỏ qua). */
async function vaoSoCai(
  q: Q,
  nd: NguoiDungPhien,
  tl: HangTaiLieu,
  kq: KetQuaKiemTraDayDu,
  phienBan: number,
  xacNhan?: Record<number, string>,
  /** Tên việc người gửi đã chọn (vd theo gợi ý AI phụ tá): vị trí dòng vào sổ cái → tên mới */
  doiTen?: Record<number, string>,
  /** Việc AI tìm thấy NGOÀI bảng mà người gửi đã tích chọn — vào sổ cùng lúc, như một dòng việc */
  themViec?: ThemViecAi[],
  /** câu gốc các việc AI tìm thấy mà người gửi KHÔNG tích (đã xem, không phải việc) */
  boQuaAi?: string[],
  /** Vị trí dòng (trong bảng việc) người gửi BỎ ở bước Duyệt việc — không vào sổ cái, file vẫn gửi (db/71) */
  boViec?: number[],
  /** Dòng ghi "Ban TGĐ / Ban lãnh đạo" chung chung → lãnh đạo ĐÍCH DANH người gửi chọn ở bước Duyệt việc (chức danh) */
  thayBld?: Record<number, string>,
): Promise<DuDoanDong[]> {
  if (kq.tu_do || !kq.mau) return [];
  if (tl.nguoi_gui_that) return []; // văn bản đến từ bên ngoài không sinh việc (chốt 28/09)
  if (boQuaAi?.length) await boQuaViecAi(q, tl.id, phienBan, boQuaAi);
  const { dau_vao, chi_so } = dungDauVao({
    kq,
    mau: kq.mau,
    tai_lieu_id: tl.id,
    phien_ban: phienBan,
    ten_don_vi: tl.don_vi_lap ? await tenDonVi(q, tl.don_vi_lap) : (tl.nguoi_gui_that ?? nd.ten),
    don_vi_id: tl.don_vi_lap,
    cap: await capNguon(q, nd, tl),
    nguoi_gui: nd.id,
    xac_nhan_trung: xacNhan,
  });
  // 🤖 AI RÀ LẦN CUỐI (Mr. Đại chốt 02/10/2026): ô Tình trạng viết kiểu code chưa nhận ra ("đạt yêu cầu", "đã có QĐ"…) mà AI đọc
  // là ĐÃ XONG → coi là đã xong: không thành việc mới, chỉ đóng đúng việc đang có. Người nộp chọn "Vẫn vào sổ" (xác nhận "moi") thì thôi.
  const ai = (await layKetQuaAi(q, tl.id, phienBan))?.ket_qua;
  if (ai) {
    dau_vao.cong_viec = dau_vao.cong_viec.map((d, i) => {
      const tt = ai.goi_y.find((g) => g.chi_so === chi_so[i])?.tinh_trang;
      if (d.da_xong || tt?.gia_tri !== "xong" || dau_vao.xac_nhan_trung?.[i] === "moi") return d;
      return { ...d, da_xong: true, da_xong_ai: tt.ly_do || "AI đọc ô Tình trạng là đã xong" };
    });
  }
  for (const [k, ten] of Object.entries(doiTen ?? {})) {
    const i = Number(k);
    if (dau_vao.cong_viec[i] && ten?.trim()) dau_vao.cong_viec[i] = { ...dau_vao.cong_viec[i], ten: ten.trim().slice(0, 200) };
  }
  // Ban lãnh đạo phải ĐÍCH DANH (Mr. Đại chốt 28/09): dòng ghi "Ban TGĐ / BLĐ" → thay bằng lãnh đạo người gửi chọn; chưa chọn thì chặn
  const laBld = (p: { loai: string; id: string }) => p.loai === "don_vi" && p.id === MA_BLD;
  if (dau_vao.cong_viec.some((d) => d.phu_trach.some(laBld))) {
    const { rows: cd } = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM identity.don_vi WHERE loai = 'chuc_danh' AND cha_id = $1 AND active", [MA_BLD]);
    const tenCd = new Map(cd.map((r) => [r.id, r.ten]));
    const boTruoc = new Set(boViec ?? []);
    const thieu: string[] = [];
    dau_vao.cong_viec = dau_vao.cong_viec.map((d, i) => {
      if (!d.phu_trach.some(laBld) || boTruoc.has(i)) return d;
      const chon = thayBld?.[i];
      if (!chon || !tenCd.has(chon)) {
        thieu.push(`"${d.ten.slice(0, 60)}"`);
        return d;
      }
      const pt = d.phu_trach.map((p) => (laBld(p) ? { ...p, id: chon, ten: tenCd.get(chon)! } : p));
      return { ...d, phu_trach: pt.filter((p, j) => pt.findIndex((x) => x.loai === p.loai && x.id === p.id) === j) };
    });
    if (thieu.length)
      throw new LoiHttp(400, `Việc ghi "Ban lãnh đạo" chung chung — chọn lãnh đạo cụ thể ở bảng Duyệt việc: ${thieu.join(", ")}`);
  }
  // Bước "Duyệt việc" (Mr. Đại chốt 28/09): việc người gửi bấm Bỏ → rút khỏi danh sách vào sổ, ghi sổ việc bị bỏ + lịch sử.
  // Giữ bảng đổi vị trí (giu[mới] = cũ) để trả kết quả về đúng dòng như người gửi thấy, và dời khóa xác nhận trùng theo.
  const soDongGoc = dau_vao.cong_viec.length;
  let giu: number[] | null = null;
  const bo = new Set((boViec ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < soDongGoc));
  if (bo.size) {
    giu = dau_vao.cong_viec.map((_, i) => i).filter((i) => !bo.has(i));
    const xacCu = dau_vao.xac_nhan_trung ?? {};
    const xacMoi: Record<number, string> = {};
    giu.forEach((cu, moi) => {
      if (xacCu[cu] !== undefined) xacMoi[moi] = xacCu[cu];
    });
    const biBo = [...bo].map((i) => dau_vao.cong_viec[i]);
    for (const d of biBo)
      await q.query(
        `INSERT INTO docflow.viec_bi_bo (tai_lieu_id, phien_ban, nguon_bang, dong_so, y_so, ten, nguoi) VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT DO NOTHING`,
        [tl.id, phienBan, d.nguon_bang, d.dong_so, d.y_so ? Number(d.y_so) : 1, d.ten, nd.id],
      );
    await ghiLichSu(q, {
      nguoi: nd.id,
      don_vi_id: nd.don_vi_id,
      doi_tuong_loai: "tai_lieu",
      doi_tuong_id: tl.id,
      hanh_dong: "bo_viec_khi_gui",
      chi_tiet: { phien_ban: phienBan, viec: biBo.map((d) => ({ bang: d.nguon_bang, dong: d.dong_so, ten: d.ten })) },
    });
    dau_vao.cong_viec = giu.map((i) => dau_vao.cong_viec[i]);
    dau_vao.xac_nhan_trung = xacMoi;
  }
  if (themViec?.length) {
    const ky = kq.ky_bao_cao;
    const nam = ky?.nam ?? (ky?.den ? Number(ky.den.slice(0, 4)) : new Date().getFullYear());
    const dvLap = tl.don_vi_lap ? (await q.query<{ ten: string; ten_ngan: string; loai: string }>("SELECT ten, ten_ngan, loai FROM identity.don_vi WHERE id = $1", [tl.don_vi_lap])).rows[0] : null;
    const them = await dongViecTuAi(q, themViec, {
      don_vi_lap: tl.don_vi_lap,
      ten_don_vi_lap: dvLap?.ten ?? nd.ten,
      ngay_lap: kq.ngay_nop ?? docNgay(kq.o_nhap?.ngay_lap ?? "", nam).iso ?? ky?.den,
      nam,
      du_an: dvLap ? (["phong", "ban_tgd", "chuc_danh"].includes(dvLap.loai) ? "Công ty" : dvLap.ten_ngan) : null,
      dongBatDau: await soDongAiDaCo(q, tl.id, phienBan),
    });
    const xac = { ...(dau_vao.xac_nhan_trung ?? {}) };
    themViec.forEach((v, j) => {
      if (v.gop) xac[dau_vao.cong_viec.length + j] = v.gop;
    });
    dau_vao.cong_viec.push(...them);
    dau_vao.xac_nhan_trung = xac;
  }
  if (dau_vao.cong_viec.length === 0) return [];
  // ghiVaoSoCai tự báo người gửi khi bản của họ không được dùng (cấu hình bao_nguoi_gui_khi_khong_dung)
  const ketQua = await ghiVaoSoCai(q, dau_vao);
  // Trả vị trí dòng về như trước khi rút việc bị bỏ (việc AI thêm nối sau các dòng gốc)
  const duDoan = giu ? ketQua.map((d) => ({ ...d, dong: d.dong < giu!.length ? giu![d.dong] : d.dong - giu!.length + soDongGoc })) : ketQua;
  // Chuông báo: mọi dòng việc vừa gửi phải có trong sổ cái — thiếu thì ghi lịch sử + báo quản trị (không chặn gửi)
  // Sổ cái thiếu dòng vừa gửi → tự rà soát + bổ sung báo cáo này ngay sau khi giao dịch gửi xong (không chặn gửi)
  if ((await doiChieuSauGui(q, dau_vao, nd.id, tl.ten)).length && dau_vao.tai_lieu_id) raSoatNen("Sau khi gửi", dau_vao.tai_lieu_id);
  return duDoan;
}

async function themBuoc(
  q: Q,
  b: {
    hanh_trinh_id: string;
    cha_id: string | null;
    loai: NutHanhTrinh["loai"];
    tai_lieu_id: string;
    phien_ban: number;
    tep_kem?: { tai_lieu_id: string; phien_ban: number }[];
    tu_don_vi: string | null;
    tu_nguoi: string;
    den_don_vi: string | null;
    den_nguoi?: string | null;
    ly_do?: string | null;
    trang_thai?: NutHanhTrinh["trang_thai"];
  },
): Promise<string> {
  const id = taoMa("b");
  await q.query(
    `INSERT INTO docflow.buoc_hanh_trinh (id, hanh_trinh_id, cha_id, loai, tai_lieu_id, phien_ban, tep_kem, tu_don_vi, tu_nguoi,
       den_don_vi, den_nguoi, ly_do, trang_thai, luc)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, clock_timestamp())`,
    [
      id,
      b.hanh_trinh_id,
      b.cha_id,
      b.loai,
      b.tai_lieu_id,
      b.phien_ban,
      JSON.stringify(b.tep_kem ?? []),
      b.tu_don_vi,
      b.tu_nguoi,
      b.den_don_vi,
      b.den_nguoi ?? null,
      b.ly_do ?? null,
      b.trang_thai ?? "cho_nhan",
    ],
  );
  return id;
}

/** Nhận ngầm khi nơi nhận làm thao tác khác trên bước còn "chờ nhận". */
async function tuNhan(q: Q, nd: NguoiDungPhien, b: HangBuoc): Promise<void> {
  if (b.trang_thai === "cho_nhan") {
    await nhan(q, nd, b.id);
    b.trang_thai = "da_nhan";
  }
}

// ---------------- GỬI · GỬI MỚI ----------------

async function guiNoiBo(
  q: Q,
  nd: NguoiDungPhien,
  v: { tai_lieu_id: string; den: string[]; xac_nhan_trung?: Record<number, string>; doi_ten?: Record<number, string>; them_viec?: ThemViecAi[]; bo_qua_ai?: string[]; bo_viec?: number[]; thay_bld?: Record<number, string> },
  loai: "gui" | "gui_moi",
  lienQuan?: { hanh_trinh_id: string | null; tu_buoc_id: string | null; tai_lieu_id: string | null },
): Promise<{ hanh_trinh_id: string; buoc_ids: string[]; so_cai: DuDoanDong[] }> {
  await kiemNguoiChuaGanDonVi(q, nd);
  const tl = await layTaiLieu(q, v.tai_lieu_id);
  if (!(await coQuyenGui(q, nd, { chu_so_huu: tl.nguoi_tao, don_vi_id: tl.don_vi_lap }))) {
    throw new LoiHttp(403, "Bạn không có quyền gửi tài liệu này");
  }
  const daGui = await q.query("SELECT 1 FROM docflow.hanh_trinh WHERE tai_lieu_goc_id = $1 LIMIT 1", [tl.id]);
  if (daGui.rows.length > 0 || tl.trang_thai !== "nhap") {
    throw new LoiHttp(409, "Tài liệu đã được gửi. Dùng Chuyển tiếp, hoặc Gửi tài liệu mới cho nơi khác");
  }

  // Phải qua kiểm tra (chạy lại trên bản hiện tại: cấu hình có thể đã đổi)
  const { kq, phien_ban } = await kiemTraLai(q, nd, tl);
  if (!kq.dat) throw loiChan(kq, tl.ten);
  // Luật AI mức chặn (chạy nền): đang kiểm / không đạt / AI lỗi theo khi_ai_loi
  await kiemLuatAiKhiGui(q, { tai_lieu_id: tl.id, phien_ban, mau_ma: kq.mau_ma, ten: tl.ten, luat_da_dung: kq.luat_da_dung });

  const noiNhan: NoiNhan[] = await phanTichNoiNhan(q, v.den?.length ? v.den : kq.gui_den);
  if (noiNhan.length === 0) throw new LoiHttp(400, "Chưa chọn nơi nhận");

  const hanhTrinhId = taoMa("ht");
  await q.query("INSERT INTO docflow.hanh_trinh (id, tai_lieu_goc_id, lien_quan_den, tu_buoc_id) VALUES ($1,$2,$3,$4)", [
    hanhTrinhId,
    tl.id,
    lienQuan?.hanh_trinh_id ?? null,
    lienQuan?.tu_buoc_id ?? null,
  ]);

  // Gửi TỪ đơn vị của báo cáo (người kiêm nhiệm nộp HL8 thì "từ HL8", không phải đơn vị chính của họ)
  const tuDonVi = tl.don_vi_lap ?? nd.don_vi_id;
  const buocIds: string[] = [];
  for (const nn of noiNhan) {
    const id = await themBuoc(q, {
      hanh_trinh_id: hanhTrinhId,
      cha_id: null,
      loai,
      tai_lieu_id: tl.id,
      phien_ban,
      tu_don_vi: tuDonVi,
      tu_nguoi: nd.id,
      den_don_vi: nn.don_vi_id,
      den_nguoi: nn.nguoi_id,
    });
    buocIds.push(id);
    await vaoThuMuc(q, nn.don_vi_id, "den", tl.id, nd.id);
  }
  if (tuDonVi) await vaoThuMuc(q, tuDonVi, "di", tl.id, nd.id);

  await q.query("UPDATE docflow.tai_lieu SET trang_thai = 'da_gui', lien_quan_den = COALESCE($2, lien_quan_den) WHERE id = $1", [
    tl.id,
    lienQuan?.tai_lieu_id ?? null,
  ]);

  const soCai = await vaoSoCai(q, nd, tl, kq, phien_ban, v.xac_nhan_trung, v.doi_ten, v.them_viec, v.bo_qua_ai, v.bo_viec, v.thay_bld);

  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    thay_cho: tl.nguoi_gui_that,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: tl.id,
    hanh_dong: loai,
    chi_tiet: {
      den: noiNhan.map((n) => ({ don_vi_id: n.don_vi_id, nguoi_id: n.nguoi_id, ten: n.ten })),
      hanh_trinh_id: hanhTrinhId,
      buoc_ids: buocIds,
      phien_ban,
      so_viec: soCai.length,
      ...(lienQuan?.tai_lieu_id ? { lien_quan_den: lienQuan.tai_lieu_id } : {}),
    },
  });

  // Chuông (Mr. Đại chốt 30/09): cả đơn vị lập báo cáo (không gồm đơn vị con) + nơi nhận ở bước 5
  // (đơn vị → mọi thành viên; một người → chỉ người đó). Mỗi người một tin, trừ chính người gửi. Bấm tin → mở thẳng file.
  const mau = await mauThongBao(q, "nhan_tai_lieu", "{nguoi_gui} gửi {ten_tai_lieu} đến {don_vi}");
  const tuTen = tuDonVi ? await tenDonVi(q, tuDonVi) : "";
  const nhan = new Set<string>(tuDonVi ? await nguoiCuaDonVi(q, tuDonVi) : []);
  for (const nn of noiNhan) {
    if (nn.nguoi_id) nhan.add(nn.nguoi_id);
    else for (const id of await nguoiCuaDonVi(q, nn.don_vi_id)) nhan.add(id);
  }
  nhan.delete(nd.id);
  const noiDung = dien(mau, {
    nguoi_gui: tuTen ? `${nd.ten} (${tuTen})` : nd.ten,
    ten_tai_lieu: tl.ten,
    don_vi: noiNhan.map((n) => n.ten).join(", "),
  });
  for (const id of nhan) await taoThongBao(q, { nguoi_nhan: id, loai: "nhan_tai_lieu", noi_dung: noiDung, lien_ket: `/tai-lieu/${tl.id}` });
  return { hanh_trinh_id: hanhTrinhId, buoc_ids: buocIds, so_cai: soCai };
}

/** Gửi tài liệu (đã đạt kiểm tra) đến một hoặc nhiều đơn vị. Việc trong tài liệu vào sổ cái. */
export async function gui(
  q: Q,
  nd: NguoiDungPhien,
  v: { tai_lieu_id: string; den: string[]; xac_nhan_trung?: Record<number, string>; doi_ten?: Record<number, string>; them_viec?: ThemViecAi[]; bo_qua_ai?: string[]; bo_viec?: number[]; thay_bld?: Record<number, string> },
): Promise<{ hanh_trinh_id: string; buoc_ids: string[]; so_cai: DuDoanDong[] }> {
  return guiNoiBo(q, nd, v, "gui");
}

/** Gửi một tài liệu mới hoàn toàn: hành trình mới, có thể gắn "liên quan đến" tài liệu gốc. */
export async function guiMoi(
  q: Q,
  nd: NguoiDungPhien,
  v: {
    tai_lieu_id: string;
    den: string[];
    lien_quan_den_tai_lieu?: string | null;
    xac_nhan_trung?: Record<number, string>;
    tu_buoc_id?: string | null; // bước (của tài liệu gốc) mà người gửi đang xử lý — để gắn đúng nút trên cây
  },
): Promise<{ hanh_trinh_id: string; buoc_ids: string[]; so_cai: DuDoanDong[] }> {
  let lienQuan: { hanh_trinh_id: string | null; tu_buoc_id: string | null; tai_lieu_id: string | null } | undefined;
  const goc = v.lien_quan_den_tai_lieu ?? null;
  if (goc) {
    if (goc === v.tai_lieu_id) throw new LoiHttp(400, "Tài liệu mới không thể liên quan đến chính nó");
    await layTaiLieu(q, goc);
    let buoc: HangBuoc | null = null;
    if (v.tu_buoc_id) {
      buoc = await layBuoc(q, v.tu_buoc_id);
      if (buoc.tai_lieu_id !== goc) throw new LoiHttp(400, "Bước không thuộc tài liệu gốc");
    } else {
      // Bước gần nhất tài liệu gốc đến tay người gửi
      const { rows } = await q.query<{ id: string }>(
        `SELECT id FROM docflow.buoc_hanh_trinh WHERE tai_lieu_id = $1 AND loai <> 'hoan_thanh'
           AND (den_nguoi = $2 OR (den_nguoi IS NULL AND den_don_vi = ANY($3)))
         ORDER BY luc DESC LIMIT 1`,
        [goc, nd.id, nd.don_vi_ids],
      );
      if (rows[0]) buoc = await layBuoc(q, rows[0].id);
    }
    let htId = buoc?.hanh_trinh_id ?? null;
    if (!htId) {
      const r = await q.query<{ id: string }>("SELECT id FROM docflow.hanh_trinh WHERE tai_lieu_goc_id = $1 ORDER BY tao_luc LIMIT 1", [goc]);
      htId = r.rows[0]?.id ?? null;
    }
    lienQuan = { hanh_trinh_id: htId, tu_buoc_id: buoc?.id ?? null, tai_lieu_id: goc };
    if (buoc && (await laNoiNhanCoThe(q, nd, buoc))) {
      await tuNhan(q, nd, buoc);
      await q.query("UPDATE docflow.buoc_hanh_trinh SET trang_thai = 'da_xu_ly' WHERE id = $1 AND trang_thai = 'da_nhan'", [buoc.id]);
    }
  }
  return guiNoiBo(q, nd, v, "gui_moi", lienQuan);
}

async function laNoiNhanCoThe(q: Q, nd: NguoiDungPhien, b: HangBuoc): Promise<boolean> {
  try {
    await batBuocNoiNhan(q, nd, b);
    return !KHONG_CON_XU_LY.has(b.trang_thai) && b.loai !== "hoan_thanh";
  } catch {
    return false;
  }
}

// ---------------- NHẬN ----------------

/** Nơi nhận bấm Nhận: người gửi thấy "đã nhận lúc …". */
export async function nhan(q: Q, nd: NguoiDungPhien, buocId: string): Promise<void> {
  const b = await layBuoc(q, buocId);
  await batBuocNoiNhan(q, nd, b);
  if (b.trang_thai !== "cho_nhan") throw new LoiHttp(409, "Bước này không còn ở trạng thái chờ nhận");
  await q.query("UPDATE docflow.buoc_hanh_trinh SET trang_thai = 'da_nhan', nhan_boi = $2, nhan_luc = clock_timestamp() WHERE id = $1", [
    b.id,
    nd.id,
  ]);
  const tl = await layTaiLieu(q, b.tai_lieu_id);
  const denTen = b.den_nguoi ? await tenNguoi(q, b.den_nguoi) : await tenDonVi(q, b.den_don_vi);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: b.tai_lieu_id,
    hanh_dong: "nhan",
    chi_tiet: { buoc_id: b.id, hanh_trinh_id: b.hanh_trinh_id, don_vi: b.den_don_vi, phien_ban: b.phien_ban },
  });
  if (b.tu_nguoi !== nd.id) {
    await taoThongBao(q, {
      nguoi_nhan: b.tu_nguoi,
      loai: "da_nhan",
      noi_dung: `${denTen} đã nhận "${tl.ten}" lúc ${gioVN()} (${nd.ten})`,
      lien_ket: `/tai-lieu/${tl.id}`,
    });
  }
}

// ---------------- CHUYỂN TIẾP (nguyên văn / kèm tài liệu khác) ----------------

/** Chuyển tiếp nguyên văn, hoặc kèm tài liệu khác (tep_kem) → loai chuyen_tiep_kem. */
export async function chuyenTiep(
  q: Q,
  nd: NguoiDungPhien,
  v: { buoc_id: string; den: string[]; tep_kem?: string[]; xac_nhan_trung?: Record<number, string> },
): Promise<{ buoc_ids: string[]; so_cai: DuDoanDong[] }> {
  const b = await layBuoc(q, v.buoc_id);
  await batBuocNoiNhan(q, nd, b);
  if (b.loai === "tra_lai") throw new LoiHttp(409, "Tài liệu đang bị trả lại: sửa và gửi lại bản mới, không chuyển tiếp");
  if (b.loai === "hoan_thanh" || KHONG_CON_XU_LY.has(b.trang_thai)) throw new LoiHttp(409, "Bước này đã dừng (bị trả lại hoặc hoàn thành)");

  const noiNhan = await phanTichNoiNhan(q, v.den);
  if (noiNhan.length === 0) throw new LoiHttp(400, "Chưa chọn nơi nhận");
  const ch = await layCauHinh(q, "gui");
  for (const nn of noiNhan) {
    if (!duocChuyenTiep(ch.duoc_chuyen_tiep, b.den_don_vi, nn.don_vi_id)) {
      throw new LoiHttp(403, `Cấu hình không cho ${await tenDonVi(q, b.den_don_vi)} chuyển tiếp cho ${nn.ten}`);
    }
  }
  await tuNhan(q, nd, b);

  const tl = await layTaiLieu(q, b.tai_lieu_id);
  const phienBan = tl.phien_ban_hien_tai;
  if (ch.chuyen_tiep_phai_kiem_tra_lai && tl.mau_ma) {
    const { kq, phien_ban: pbKiem } = await kiemTraLai(q, nd, tl);
    if (!kq.dat) throw loiChan(kq, tl.ten);
    await kiemLuatAiKhiGui(q, { tai_lieu_id: tl.id, phien_ban: pbKiem, mau_ma: kq.mau_ma, ten: tl.ten, luat_da_dung: kq.luat_da_dung });
  }

  // File kèm: file theo mẫu phải đạt kiểm tra, việc trong file kèm vào sổ cái theo quy tắc đè
  const kemIds = Array.from(new Set((v.tep_kem ?? []).filter((x) => x && x !== tl.id)));
  const kem: { tai_lieu_id: string; phien_ban: number; ten: string }[] = [];
  const soCai: DuDoanDong[] = [];
  let daDungXacNhan = false;
  for (const id of kemIds) {
    const tk = await layTaiLieu(q, id);
    if (!(await coQuyenGui(q, nd, { chu_so_huu: tk.nguoi_tao, don_vi_id: tk.don_vi_lap }))) {
      throw new LoiHttp(403, `Bạn không có quyền gửi file kèm "${tk.ten}"`);
    }
    const { kq, phien_ban } = await kiemTraLai(q, nd, { ...tk, don_vi_lap: tk.don_vi_lap ?? nd.don_vi_id });
    if (kq.mau_ma) {
      if (!kq.dat) throw loiChan(kq, tk.ten);
      await kiemLuatAiKhiGui(q, { tai_lieu_id: tk.id, phien_ban, mau_ma: kq.mau_ma, ten: tk.ten, luat_da_dung: kq.luat_da_dung });
      soCai.push(...(await vaoSoCai(q, nd, tk, kq, phien_ban, daDungXacNhan ? undefined : v.xac_nhan_trung)));
      daDungXacNhan = true;
    }
    kem.push({ tai_lieu_id: tk.id, phien_ban, ten: tk.ten });
    await q.query("UPDATE docflow.tai_lieu SET trang_thai = 'da_gui' WHERE id = $1 AND trang_thai = 'nhap'", [tk.id]);
  }

  const loai = kem.length > 0 ? "chuyen_tiep_kem" : "chuyen_tiep";
  const buocIds: string[] = [];
  for (const nn of noiNhan) {
    buocIds.push(
      await themBuoc(q, {
        hanh_trinh_id: b.hanh_trinh_id,
        cha_id: b.id,
        loai,
        tai_lieu_id: tl.id,
        phien_ban: phienBan,
        tep_kem: kem.map(({ tai_lieu_id, phien_ban }) => ({ tai_lieu_id, phien_ban })),
        tu_don_vi: b.den_don_vi,
        tu_nguoi: nd.id,
        den_don_vi: nn.don_vi_id,
        den_nguoi: nn.nguoi_id,
      }),
    );
    await vaoThuMuc(q, nn.don_vi_id, "den", tl.id, nd.id);
    for (const k of kem) await vaoThuMuc(q, nn.don_vi_id, "den", k.tai_lieu_id, nd.id);
  }
  await q.query("UPDATE docflow.buoc_hanh_trinh SET trang_thai = 'da_xu_ly' WHERE id = $1 AND trang_thai = 'da_nhan'", [b.id]);

  const den = noiNhan.map((n) => ({ don_vi_id: n.don_vi_id, nguoi_id: n.nguoi_id, ten: n.ten }));
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: tl.id,
    hanh_dong: loai,
    chi_tiet: { tu_buoc_id: b.id, hanh_trinh_id: b.hanh_trinh_id, den, buoc_ids: buocIds, phien_ban: phienBan, tep_kem: kem, so_viec_kem: soCai.length },
  });
  for (const k of kem) {
    await ghiLichSu(q, {
      nguoi: nd.id,
      don_vi_id: nd.don_vi_id,
      doi_tuong_loai: "tai_lieu",
      doi_tuong_id: k.tai_lieu_id,
      hanh_dong: "chuyen_tiep_kem",
      chi_tiet: { kem_theo: tl.id, kem_theo_ten: tl.ten, den, buoc_ids: buocIds, phien_ban: k.phien_ban },
    });
  }

  const tuTen = await tenDonVi(q, b.den_don_vi);
  for (const nn of noiNhan) {
    await baoNoiNhan(q, nn, {
      loai: "nhan_tai_lieu",
      noi_dung: `${nd.ten}${tuTen ? ` (${tuTen})` : ""} chuyển tiếp "${tl.ten}"${kem.length ? ` kèm ${kem.map((k) => k.ten).join(", ")}` : ""} đến ${nn.ten}`,
      lien_ket: `/tai-lieu/${tl.id}`,
    });
  }
  return { buoc_ids: buocIds, so_cai: soCai };
}

// ---------------- TRẢ LẠI ----------------

/** Trả lại người gửi, BẮT BUỘC lý do. Việc trong tài liệu giữ nguyên, ghi "đang chờ sửa" (theo cấu hình). */
export async function traLai(q: Q, nd: NguoiDungPhien, v: { buoc_id: string; ly_do: string }): Promise<string> {
  const lyDo = (v.ly_do ?? "").trim();
  if (!lyDo) throw new LoiHttp(400, "Trả lại phải ghi lý do");
  const b = await layBuoc(q, v.buoc_id);
  await batBuocNoiNhan(q, nd, b);
  if (b.loai === "tra_lai" || b.loai === "hoan_thanh") throw new LoiHttp(409, "Không trả lại được bước này");
  if (!["cho_nhan", "da_nhan"].includes(b.trang_thai)) throw new LoiHttp(409, "Chỉ trả lại được tài liệu đang chờ nhận hoặc vừa nhận (chưa chuyển đi)");
  const tl = await layTaiLieu(q, b.tai_lieu_id);
  if (!b.tu_don_vi && tl.nguoi_gui_that) {
    throw new LoiHttp(409, `Văn bản của ${tl.nguoi_gui_that} (ngoài công ty) không trả lại trên hệ thống được: văn thư liên hệ nơi gửi`);
  }

  const id = await themBuoc(q, {
    hanh_trinh_id: b.hanh_trinh_id,
    cha_id: b.id,
    loai: "tra_lai",
    tai_lieu_id: b.tai_lieu_id,
    phien_ban: b.phien_ban,
    tu_don_vi: b.den_don_vi,
    tu_nguoi: nd.id,
    den_don_vi: b.tu_don_vi,
    den_nguoi: b.tu_don_vi ? null : b.tu_nguoi,
    ly_do: lyDo,
  });
  await q.query(
    "UPDATE docflow.buoc_hanh_trinh SET trang_thai = 'bi_tra_lai', nhan_boi = COALESCE(nhan_boi, $2), nhan_luc = COALESCE(nhan_luc, clock_timestamp()) WHERE id = $1",
    [b.id, nd.id],
  );
  if (b.tu_don_vi) await vaoThuMuc(q, b.tu_don_vi, "den", tl.id, nd.id, "bi_tra_lai").then((x) => ganNhan(q, { tai_lieu_id: tl.id, thu_muc_id: x.thu_muc_id, nhan: "bi_tra_lai" }));
  await q.query("UPDATE docflow.tai_lieu SET trang_thai = 'bi_tra_lai' WHERE id = $1", [tl.id]);

  // Việc lấy từ tài liệu này: "đang chờ sửa" khi trả lại về chính đơn vị lập
  const ch = await layCauHinh(q, "gui");
  const veNguoiLap = !tl.don_vi_lap || b.tu_don_vi === tl.don_vi_lap;
  if (ch.tra_lai_tam_dung_viec && veNguoiLap && tl.mau_ma) await danhDauChoSua(q, tl.id, true, nd.id);

  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: tl.id,
    hanh_dong: "tra_lai",
    chi_tiet: { ly_do: lyDo, buoc_id: id, tu_buoc_id: b.id, hanh_trinh_id: b.hanh_trinh_id, ve: b.tu_don_vi, phien_ban: b.phien_ban },
  });
  const mau = await mauThongBao(q, "bi_tra_lai", "{ten_tai_lieu} bị trả lại: {ly_do}");
  await baoNoiNhan(
    q,
    { don_vi_id: b.tu_don_vi, nguoi_id: b.tu_don_vi ? null : b.tu_nguoi },
    { loai: "bi_tra_lai", noi_dung: dien(mau, { ten_tai_lieu: tl.ten, ly_do: lyDo }), lien_ket: `/tai-lieu/${tl.id}` },
  );
  if (b.tu_don_vi && b.tu_nguoi && b.tu_nguoi !== nd.id) {
    // Người gửi thật luôn được báo, kể cả khi đơn vị có nhiều người
    const { rows } = await q.query("SELECT 1 FROM identity.nguoi_dung WHERE id = $1 AND (don_vi_id = $2 OR id IN (SELECT nguoi_dung_id FROM identity.kiem_nhiem WHERE don_vi_id = $2))", [b.tu_nguoi, b.tu_don_vi]);
    if (rows.length === 0) await taoThongBao(q, { nguoi_nhan: b.tu_nguoi, loai: "bi_tra_lai", noi_dung: dien(mau, { ten_tai_lieu: tl.ten, ly_do: lyDo }), lien_ket: `/tai-lieu/${tl.id}` });
  }
  return id;
}

// ---------------- GỬI LẠI ----------------

/** Gửi lại bản mới sau khi sửa (cùng hành trình). Bản mới qua kiểm tra lại, đè bản cũ trong sổ cái. */
export async function guiLai(
  q: Q,
  nd: NguoiDungPhien,
  v: {
    buoc_tra_lai_id: string;
    tep: { ten_tep: string; mime: string; noi_dung: Buffer };
    xac_nhan_trung?: Record<number, string>;
  },
): Promise<{ buoc_id: string; phien_ban: number; so_cai: DuDoanDong[] }> {
  const b = await layBuoc(q, v.buoc_tra_lai_id);
  if (b.loai !== "tra_lai") throw new LoiHttp(400, "Chỉ gửi lại được tài liệu đã bị trả lại");
  await batBuocNoiNhan(q, nd, b);
  if (!["cho_nhan", "da_nhan"].includes(b.trang_thai)) throw new LoiHttp(409, "Bản sửa của lần trả lại này đã gửi, hoặc nhánh đã dừng");
  const tl = await layTaiLieu(q, b.tai_lieu_id);

  const kq = await kiemTraDayDu(q, nd, v.tep.noi_dung, v.tep.ten_tep, {
    don_vi_lap: tl.don_vi_lap,
    tai_lieu_id: tl.id,
    nguoi_gui_that: tl.nguoi_gui_that,
    bo_qua_so_cai: true,
    moi_nop: true,
  });
  if (!kq.dat) throw loiChan(kq, v.tep.ten_tep);
  if (tl.mau_ma && kq.mau_ma !== tl.mau_ma) throw new LoiHttp(400, `Bản sửa phải cùng mẫu với bản trước (${tl.mau_ma})`);
  await tuNhan(q, nd, b);

  // Đã tải bản sửa lên trước (Tải lại bản đã sửa) thì dùng luôn phiên bản đó, không nhân đôi
  let phienBan: number;
  let banMoi = false;
  const hienTai = await docPhienBan(q, tl.id, undefined, MAY_DOC_TOAN_VAN); // chỉ so sha256 với bản sửa
  if (hienTai.thong_tin.phien_ban > b.phien_ban && hienTai.thong_tin.sha256 === bamSha256(v.tep.noi_dung)) {
    phienBan = hienTai.thong_tin.phien_ban;
  } else {
    phienBan = await themPhienBan(q, tl.id, { nguoi: nd.id, tep: v.tep, ket_qua_kiem_tra: rutGon(kq), ky_bao_cao: kq.ky_bao_cao ?? null });
    banMoi = true;
  }
  await kiemLuatAiKhiGui(q, { tai_lieu_id: tl.id, phien_ban: phienBan, mau_ma: kq.mau_ma, ten: v.tep.ten_tep, luat_da_dung: kq.luat_da_dung, ban_moi: banMoi });
  // Tên tài liệu đi theo bản mới (themPhienBan đổi tai_lieu.ten) — đọc lại để thông báo dùng tên mới
  const tenMoi = (await layTaiLieu(q, tl.id)).ten;

  const denDonVi = b.tu_don_vi;
  const id = await themBuoc(q, {
    hanh_trinh_id: b.hanh_trinh_id,
    cha_id: b.id,
    loai: "gui_lai",
    tai_lieu_id: tl.id,
    phien_ban: phienBan,
    tu_don_vi: b.den_don_vi,
    tu_nguoi: nd.id,
    den_don_vi: denDonVi,
  });
  await q.query("UPDATE docflow.buoc_hanh_trinh SET trang_thai = 'da_xu_ly' WHERE id = $1", [b.id]);
  if (b.den_don_vi) {
    const tm = await thuMucCuaDonVi(q, b.den_don_vi, "den");
    await ganNhan(q, { tai_lieu_id: tl.id, thu_muc_id: tm, nhan: null });
  }
  if (denDonVi) await vaoThuMuc(q, denDonVi, "den", tl.id, nd.id);
  await q.query("UPDATE docflow.tai_lieu SET trang_thai = 'da_gui' WHERE id = $1", [tl.id]);

  const ch = await layCauHinh(q, "gui");
  if (ch.tra_lai_tam_dung_viec && tl.mau_ma) await danhDauChoSua(q, tl.id, false, nd.id);
  const soCai = await vaoSoCai(q, nd, tl, kq, phienBan, v.xac_nhan_trung);

  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    thay_cho: tl.nguoi_gui_that,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: tl.id,
    hanh_dong: "gui_lai",
    chi_tiet: { buoc_id: id, tu_buoc_id: b.id, hanh_trinh_id: b.hanh_trinh_id, phien_ban: phienBan, phien_ban_truoc: b.phien_ban, den: denDonVi, so_viec: soCai.length },
  });
  await baoNoiNhan(
    q,
    { don_vi_id: denDonVi, nguoi_id: null },
    { loai: "nhan_tai_lieu", noi_dung: `${nd.ten} gửi lại bản ${phienBan} của "${tenMoi}" (đã sửa theo yêu cầu: ${b.ly_do ?? ""})`, lien_ket: `/tai-lieu/${tl.id}` },
  );
  return { buoc_id: id, phien_ban: phienBan, so_cai: soCai };
}

// ---------------- HOÀN THÀNH ----------------

/** Nhận, lưu, hoàn thành: nhánh hành trình dừng tại đây. */
export async function hoanThanh(q: Q, nd: NguoiDungPhien, buocId: string): Promise<void> {
  const b = await layBuoc(q, buocId);
  await batBuocNoiNhan(q, nd, b);
  if (b.loai === "hoan_thanh" || KHONG_CON_XU_LY.has(b.trang_thai)) throw new LoiHttp(409, "Nhánh này đã dừng");
  await tuNhan(q, nd, b);
  await themBuoc(q, {
    hanh_trinh_id: b.hanh_trinh_id,
    cha_id: b.id,
    loai: "hoan_thanh",
    tai_lieu_id: b.tai_lieu_id,
    phien_ban: b.phien_ban,
    tu_don_vi: b.den_don_vi,
    tu_nguoi: nd.id,
    den_don_vi: null,
    trang_thai: "hoan_thanh",
  });
  await q.query("UPDATE docflow.buoc_hanh_trinh SET trang_thai = 'hoan_thanh' WHERE id = $1", [b.id]);
  const mo = await q.query(
    "SELECT 1 FROM docflow.buoc_hanh_trinh WHERE tai_lieu_id = $1 AND trang_thai IN ('cho_nhan','da_nhan') LIMIT 1",
    [b.tai_lieu_id],
  );
  if (mo.rows.length === 0) await q.query("UPDATE docflow.tai_lieu SET trang_thai = 'hoan_thanh' WHERE id = $1", [b.tai_lieu_id]);
  const tl = await layTaiLieu(q, b.tai_lieu_id);
  await ghiLichSu(q, {
    nguoi: nd.id,
    don_vi_id: nd.don_vi_id,
    doi_tuong_loai: "tai_lieu",
    doi_tuong_id: b.tai_lieu_id,
    hanh_dong: "hoan_thanh",
    chi_tiet: { buoc_id: b.id, hanh_trinh_id: b.hanh_trinh_id, don_vi: b.den_don_vi },
  });
  if (b.tu_nguoi !== nd.id) {
    await taoThongBao(q, {
      nguoi_nhan: b.tu_nguoi,
      loai: "hoan_thanh",
      noi_dung: `${await tenDonVi(q, b.den_don_vi)} đã hoàn thành xử lý "${tl.ten}"`,
      lien_ket: `/tai-lieu/${tl.id}`,
    });
  }
}

// ---------------- CÂY HÀNH TRÌNH ----------------

interface HangBuocDoc extends HangBuoc {
  tu_ten: string | null;
  tu_nguoi_ten: string | null;
  den_dv_ten: string | null;
  den_nguoi_ten: string | null;
  nhan_boi_ten: string | null;
  tai_lieu_ten: string;
  nguoi_gui_that: string | null;
}

const iso = (d: string | Date | null) => (d ? new Date(d).toISOString() : null);

/** Cây hành trình của tài liệu (mọi hành trình chứa tài liệu này, kèm hành trình mới "liên quan đến" nó). */
export async function cayHanhTrinh(q: Q, taiLieuId: string): Promise<NutHanhTrinh[]> {
  const { rows: htGoc } = await q.query<{ id: string }>(
    `SELECT DISTINCT h.id FROM docflow.hanh_trinh h
     WHERE h.tai_lieu_goc_id = $1
        OR EXISTS (SELECT 1 FROM docflow.buoc_hanh_trinh b WHERE b.hanh_trinh_id = h.id
                   AND (b.tai_lieu_id = $1 OR b.tep_kem @> jsonb_build_array(jsonb_build_object('tai_lieu_id', $1::text))))`,
    [taiLieuId],
  );
  const chinh = new Set(htGoc.map((r) => r.id));
  if (chinh.size === 0) return [];
  // Hành trình mới liên quan (gửi tài liệu mới từ một bước), lần theo nhiều tầng
  const tatCa = new Map<string, { id: string; lien_quan_den: string | null; tu_buoc_id: string | null }>();
  let moi = Array.from(chinh);
  while (moi.length > 0) {
    const { rows } = await q.query<{ id: string; lien_quan_den: string | null; tu_buoc_id: string | null }>(
      "SELECT id, lien_quan_den, tu_buoc_id FROM docflow.hanh_trinh WHERE id = ANY($1) OR lien_quan_den = ANY($1)",
      [moi],
    );
    moi = [];
    for (const r of rows) {
      if (!tatCa.has(r.id)) {
        tatCa.set(r.id, r);
        moi.push(r.id);
      }
    }
  }
  const { rows } = await q.query<HangBuocDoc>(
    `SELECT b.*, dt.ten AS tu_ten, nt.ten AS tu_nguoi_ten, dd.ten AS den_dv_ten, nn.ten AS den_nguoi_ten, nb.ten AS nhan_boi_ten,
            t.ten AS tai_lieu_ten, t.nguoi_gui_that
     FROM docflow.buoc_hanh_trinh b
     JOIN docflow.tai_lieu t ON t.id = b.tai_lieu_id
     LEFT JOIN identity.don_vi dt ON dt.id = b.tu_don_vi
     LEFT JOIN identity.nguoi_dung nt ON nt.id = b.tu_nguoi
     LEFT JOIN identity.don_vi dd ON dd.id = b.den_don_vi
     LEFT JOIN identity.nguoi_dung nn ON nn.id = b.den_nguoi
     LEFT JOIN identity.nguoi_dung nb ON nb.id = b.nhan_boi
     WHERE b.hanh_trinh_id = ANY($1)
     ORDER BY b.luc, b.id`,
    [Array.from(tatCa.keys())],
  );
  const kemIds = Array.from(new Set(rows.flatMap((r) => (typeof r.tep_kem === "string" ? JSON.parse(r.tep_kem) : r.tep_kem).map((k: { tai_lieu_id: string }) => k.tai_lieu_id))));
  const tenKem = new Map<string, string>();
  if (kemIds.length) {
    const r = await q.query<{ id: string; ten: string }>("SELECT id, ten FROM docflow.tai_lieu WHERE id = ANY($1)", [kemIds]);
    for (const x of r.rows) tenKem.set(x.id, x.ten);
  }
  const nut = new Map<string, NutHanhTrinh>();
  for (const r of rows) {
    const tk = (typeof r.tep_kem === "string" ? JSON.parse(r.tep_kem) : r.tep_kem) as { tai_lieu_id: string; phien_ban: number }[];
    nut.set(r.id, {
      buoc_id: r.id,
      loai: r.loai,
      tai_lieu_id: r.tai_lieu_id,
      phien_ban: Number(r.phien_ban),
      tep_kem: tk.map((k) => ({ ...k, ten: tenKem.get(k.tai_lieu_id) ?? k.tai_lieu_id })),
      tu_don_vi: r.tu_don_vi,
      tu_nguoi: r.tu_nguoi,
      den_don_vi: r.den_don_vi,
      ly_do: r.ly_do,
      trang_thai: r.trang_thai,
      nhan_luc: iso(r.nhan_luc),
      luc: iso(r.luc)!,
      con: [],
      hanh_trinh_id: r.hanh_trinh_id,
      den_nguoi: r.den_nguoi,
      tu_ten: r.tu_ten ?? (r.cha_id ? undefined : (r.nguoi_gui_that ?? undefined)) ?? r.tu_nguoi_ten ?? r.tu_nguoi,
      tu_nguoi_ten: r.tu_nguoi_ten ?? r.tu_nguoi,
      den_ten: r.den_nguoi_ten ?? r.den_dv_ten ?? undefined,
      nhan_boi: r.nhan_boi,
      nhan_boi_ten: r.nhan_boi_ten,
      tai_lieu_ten: r.tai_lieu_ten,
      nguoi_gui_that: r.nguoi_gui_that,
    });
  }
  const goc: NutHanhTrinh[] = [];
  for (const r of rows) {
    const n = nut.get(r.id)!;
    if (r.cha_id && nut.has(r.cha_id)) {
      nut.get(r.cha_id)!.con.push(n);
      continue;
    }
    const ht = tatCa.get(r.hanh_trinh_id);
    if (!r.cha_id && ht && !chinh.has(ht.id) && ht.tu_buoc_id && nut.has(ht.tu_buoc_id)) {
      n.lien_quan = true;
      nut.get(ht.tu_buoc_id)!.con.push(n);
      continue;
    }
    if (!r.cha_id && ht && !chinh.has(ht.id)) n.lien_quan = true;
    goc.push(n);
  }
  return goc;
}
