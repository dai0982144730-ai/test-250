// ============================================================
// cay-viec/issue/chay.ts — CHẠY BỘ SINH ISSUE cho một dự án rồi hoà vào sổ (chép lib/canh-bao/chay.ts của agent Base). CHỈ SERVER.
//   ① đọc SỔ CÁI bằng layQ() — từng câu riêng, KHÔNG bọc tx() (PGlite khoá cả CSDL suốt giao dịch; lỗi treo app 03/10 ở soan-giao)
//   ② hỏi agent Tiến độ qua lớp ghi sổ (luật 29) — chuỗi găng + cây đầu việc SONG SONG; BC ngày hỏi theo mã (luật 4)
//   ③ dựng thẻ (sinh.ts, code thuần) → luật chặn 10.0 → hoà vào sổ (file, ghi ngắn)
// Base chạy bộ sinh mỗi lần mở trang server; ở đây trang KHÔNG gọi agent khác lúc dựng (HOP-DONG-KET-NOI 6.2) — màn gọi
// POST /api/cay-viec/issue {hanhDong:"chay"} ngay sau khi hiện sổ. Hàm hỏi tiêm vào để test offline.
// ============================================================
import { layQ } from "@/lib/db";
import { layCauHinh } from "@/lib/cau-hinh/doc";
import type { KhuonTra } from "@/lib/mcp/khuon";
import { chonDuAn } from "@/lib/cay-viec/dung-man";
import { viecSoCaiCuaDuAn, homNayVN } from "@/lib/cay-viec/doc-so-cai";
import { tapKhongCanGiao } from "@/lib/cay-viec/khong-can-giao";
import type { DauViecCay } from "@/lib/cay-viec/thuan";
import { theHopLe, type SoIssue } from "./model";
import { docNguong } from "./nguong-luu";
import { docSo, dongKhiViecXong, hoaDeXuatMay, hoaVaoSo } from "./so-issue";
import { dongTheNhacDongCu, guiChuongNhacDong } from "./nhac-dong";
import { sinhLuat, type MatXichGang, type ViecIssue } from "./sinh";

export interface NguonHoiIssue {
  hoiGang: (maTienDo: string, lyDo: string) => Promise<KhuonTra>;
  hoiCay: (maTienDo: string, lyDo: string) => Promise<KhuonTra>;
  hoiKhoiLuong: (maTienDo: string, loc: { ma_wbs?: string; tu_ngay?: string; den_ngay?: string }, lyDo: string) => Promise<KhuonTra>;
}

export interface KetQuaChay {
  ok: boolean;
  duAn?: { id: string; ten: string };
  so: SoIssue;
  soSinh: number;
  soBiLoai: number;
  ghiChu: string[];
  doDuoc?: Record<string, number>;
  /** Lượt này KHÔNG đo được (chưa có cây WBS / agent Tiến độ không trả cây) → không hạ bậc thẻ cũ */
  khongChayDuoc?: boolean;
}

const gioPhut = (iso: string) => {
  const s = new Date(Date.parse(iso) + 7 * 3600e3).toISOString();
  return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)} ${s.slice(11, 16)}`;
};

/** Một lượt mỗi dự án tại một thời điểm — hai người cùng mở màn thì dùng chung lượt đang chạy */
type G = typeof globalThis & { __issueDangChay?: Map<string, Promise<KetQuaChay>> };

export function chaySinhIssue(duAnId: string, nguon: NguonHoiIssue, bayGio = Date.now()): Promise<KetQuaChay> {
  const g = globalThis as G;
  const dang = (g.__issueDangChay ??= new Map());
  const co = dang.get(duAnId);
  if (co) return co;
  const p = chayMotLuot(duAnId, nguon, bayGio).finally(() => dang.delete(duAnId));
  dang.set(duAnId, p);
  return p;
}

async function chayMotLuot(duAnId: string, nguon: NguonHoiIssue, bayGio: number): Promise<KetQuaChay> {
  const homNay = homNayVN(bayGio);
  const q = await layQ();
  const dsDuAn = await layCauHinh(q, "du_an");
  const da = chonDuAn(dsDuAn, duAnId);
  if (!da) return { ok: false, so: { lanChayCuoi: "", the: [] }, soSinh: 0, soBiLoai: 0, ghiChu: [`Không có dự án "${duAnId}" trong Cài đặt › Sơ đồ tổ chức dự án.`], khongChayDuoc: true };
  const duAn = { id: da.id, ten: da.ten };
  if (!da.ma_tien_do) {
    return {
      ok: true,
      duAn,
      so: docSo(da.id),
      soSinh: 0,
      soBiLoai: 0,
      ghiChu: [`Dự án ${da.ten} chưa có cây WBS bên agent Tiến độ — bộ sinh không chạy.`],
      khongChayDuoc: true,
    };
  }
  const maTienDo = da.ma_tien_do;
  const N_K = docNguong();
  // ⭕ Luật 3 dùng cùng cửa sổ giao với màn Cây việc (Mr. Đại chốt 04/10, mặc định 7 ngày)
  const cuaSoGiao = (await layCauHinh(q, "gan_wbs")).cua_so_giao_ngay ?? 7;

  const [ketGang, ketCay, viec] = await Promise.all([
    nguon.hoiGang(maTienDo, `màn Cảnh báo agent Công việc — luật 3/1/4: ảnh hưởng COD của đầu việc găng (dự án ${da.ten})`),
    nguon.hoiCay(maTienDo, `màn Cảnh báo agent Công việc — luật 3: nút găng đã đến ngày bắt đầu; luật 4: % đầu việc (dự án ${da.ten})`),
    viecSoCaiCuaDuAn(q, dsDuAn, da.id, null, bayGio),
  ]);
  const lucDoc = new Date(bayGio).toISOString();
  // Ngày hoàn thành (luật 4) — đọc riêng, không đổi khuôn việc của màn Cây việc
  const daXong = viec.filter((v) => v.daXong).map((v) => v.id);
  const ngayXong = new Map<string, string>();
  if (daXong.length) {
    const { rows } = await q.query<{ id: string; ngay: string | null }>(
      `SELECT id, to_char(dong_luc + interval '7 hours', 'YYYY-MM-DD') AS ngay FROM docflow.cong_viec WHERE id = ANY($1::text[])`,
      [daXong],
    );
    for (const r of rows) if (r.ngay) ngayXong.set(r.id, r.ngay);
  }
  const viecIssue: ViecIssue[] = viec.map((v) => ({ ...v, ngayXong: v.daXong ? (ngayXong.get(v.id) ?? null) : null }));

  const tasks: DauViecCay[] = ketCay.ok ? (((ketCay.du_lieu as { tasks?: DauViecCay[] })?.tasks ?? []) as DauViecCay[]) : [];
  const cayOk = ketCay.ok && tasks.length > 0;
  const chuoiGang: MatXichGang[] | null = ketGang.ok ? ((ketGang.du_lieu as { chuoi_gang?: MatXichGang[] })?.chuoi_gang ?? []) : null;
  const nguonSoViec = `Sổ việc agent Công việc · ${da.ten} · ${viec.length} việc · đọc ${gioPhut(lucDoc)}`;
  const nguonTienDo = `chung.wbs · criticalWbs — Agent tiến độ, lấy ${gioPhut(ketGang.ok && ketGang.thoi_diem_tra_loi ? ketGang.thoi_diem_tra_loi : lucDoc)}`;

  const kq = await sinhLuat({
    homNay,
    cuaSoGiao,
    N: N_K.N,
    K: N_K.K,
    tenDuAn: da.ten,
    viec: viecIssue,
    tasks,
    cayOk,
    chuoiGang,
    boQua: tapKhongCanGiao(da.id),
    nguonSoViec,
    nguonTienDo,
    hoiVungPhu: async () => {
      const kp = await nguon.hoiKhoiLuong(maTienDo, {}, "màn Cảnh báo agent Công việc — luật 4: vùng phủ báo cáo ngày trong kho tiến độ (đầu → cuối)");
      const x = kp.ok ? (kp.du_lieu as { tu_ngay?: string; den_ngay?: string }) : null;
      return x?.tu_ngay && x?.den_ngay ? { tu: x.tu_ngay, den: x.den_ngay } : null;
    },
    hoiBcNgay: async (ma, tu, den) => {
      const r = await nguon.hoiKhoiLuong(maTienDo, { ma_wbs: ma, tu_ngay: tu, den_ngay: den }, `màn Cảnh báo agent Công việc — luật 4 xong trên giấy: mã ${ma} có BC ngày nào trong ${tu} → ${den} không`);
      if (r.ok) return true;
      return r.ma_loi === "KHONG_CO_DU_LIEU" ? false : null;
    },
  });

  // Không có cây = không đo được luật 3 · 4 → KHÔNG hạ bậc thẻ cũ (hạ bậc là kết luận "hết vi phạm", mà mình có đo đâu)
  if (!cayOk) {
    const thongDiep = ketCay.ok ? "cây trả về rỗng" : `${ketCay.ma_loi}: ${ketCay.thong_diep}`;
    return {
      ok: true,
      duAn,
      so: docSo(da.id),
      soSinh: 0,
      soBiLoai: 0,
      ghiChu: [`Agent tiến độ không trả cây đầu việc (${thongDiep}) — lượt này không đo được, sổ giữ nguyên, thẻ cũ không bị hạ bậc.`],
      khongChayDuoc: true,
    };
  }

  const hopLe = kq.the.filter(theHopLe);
  const soBiLoai = kq.the.length - hopLe.length;
  const doDuoc = kq.doDuoc as unknown as Record<string, number>;
  hoaVaoSo(da.id, hopLe, homNay, { ghiChu: kq.ghiChu, doDuoc, dauViec: kq.dauViec });
  // ⭐ 07/10 (Mr. Đại chốt, đợt 2): BỎ bản sao máy DX-BASE ở tab 🤖 — trùng thẻ thật (đo 06/10: DX-BASE-008 lệch số với ISS-2026-40-005).
  // Truyền danh sách rỗng → hoaDeXuatMay tự đóng các DX-BASE đang chờ.
  hoaDeXuatMay(da.id, []);
  // "Nhắc đóng việc" thành chuông cho chủ trì; thẻ cũ đóng ngay
  const dongCu = dongTheNhacDongCu(da.id, homNay);
  let soNhac = 0;
  try {
    soNhac = await guiChuongNhacDong(q, duAn, kq.nhacDong);
  } catch {
    kq.ghiChu.push("Chưa gửi được chuông nhắc đóng việc lượt này — lượt sau gửi lại.");
  }
  if (kq.nhacDong.length) kq.ghiChu.push(`${kq.nhacDong.length} việc còn mở dù đầu việc đã 100% — chuông nhắc chủ trì (vừa gửi ${soNhac}, việc đã nhắc trong 7 ngày không nhắc lại).`);
  if (dongCu) kq.ghiChu.push(`Đóng ${dongCu} thẻ "nhắc đóng việc" cũ — nay là chuông, không phải issue.`);
  // Q2 (07/10): issue người thêm / 🤖 AI đề xuất đã giao việc, việc XONG trong sổ cái → máy đóng issue (bỏ nút Đóng)
  dongKhiViecXong(da.id, new Set(viec.filter((v) => v.daXong).map((v) => v.id)), homNay);
  const so = docSo(da.id);
  return { ok: true, duAn, so, soSinh: hopLe.length, soBiLoai, ghiChu: kq.ghiChu, doDuoc };
}
