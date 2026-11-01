// ============================================================
// GỌN KẾT QUẢ CÔNG CỤ TRƯỚC KHI ĐƯA CHO MÔ HÌNH — cắt THEO CẤU TRÚC, không cắt cụt chuỗi.
//
// Lỗi đo 26/09: trợ lý Main cắt JSON kết quả mỗi công cụ còn 6.000 ký tự. Kết quả
// tiendo.duong_gang của HV dài 12.654 ký tự; bản ghi 6.1.4 (trễ 24 ngày, dự báo
// 04/06/2027) bắt đầu ở ký tự 5.950 → nhát cắt rơi giữa tên việc, mất ngày dự báo
// và số ngày trễ → AI kết luận "6.1.4 không trễ". Chưa thấy ≠ không có.
//
// Bốn nấc, dừng ngay khi vừa trần:
//   ① nguyên văn
//   ② chữ dài trong từng mục (lý do, ghi chú) cắt còn 80 ký tự; chữ ngoài danh sách còn 400
//   ③ mỗi mục chỉ giữ TRƯỜNG LÕI — mã/tên ngắn, số, ngày, cờ; bỏ trường chữ phụ
//   ④ vẫn dài: xếp mục QUAN TRỌNG lên đầu (găng trước, trễ nhiều nhất trước), bớt
//      mục ở đuôi danh sách dài nhất, chèn "… còn N mục chưa đưa vào — hỏi riêng bằng …"
//   (chót) một khối không tách được: cắt cụt nhưng GHI RÕ còn bao nhiêu ký tự chưa đưa vào.
// File thuần — không đụng node:fs (luật 10).
// ============================================================

/** Trần MỘT kết quả công cụ khi lượt đó chỉ có ít công cụ (cũ: 6.000) */
export const TRAN_MOT_CONG_CU = 16000; // 27/10 (đợt 3, PL-12): 28 issue vượt 10.000 → mất 6 dòng; giữ đủ danh sách
/** Trần CẢ khối kết quả công cụ đưa vào một vòng — chia đều cho số công cụ */
export const TRAN_CA_KHOI = 48000;
/** Sàn cho một công cụ khi lượt có nhiều công cụ */
export const SAN_MOT_CONG_CU = 4000;

/** Chữ dài trong MỘT mục của danh sách (nấc ②) */
const CHU_TRONG_MUC = 80;
/** Chữ nằm ngoài danh sách — định nghĩa, tóm tắt (nấc ②) */
const CHU_NGOAI_MUC = 400;
/** Nấc ③: chữ ngoài danh sách còn ngần này */
const CHU_NGOAI_MUC_LOI = 200;
/** Nấc ③: chữ ngắn hơn ngần này coi là nhãn/mã, giữ */
const CHU_NGAN = 24;
/** Nấc ③: mã nhận dạng cắt còn */
const CHU_NHAN_DANG = 40;
/** Nấc ③: TÊN / TIÊU ĐỀ cắt còn — 27/10 (Main đợt 2, PL-12): 40 ký tự cắt «hạn phải có 09/0…» mất ngày và mất tên hồ sơ */
const CHU_TEN = 100;
/** Số mã liệt kê trong dòng "còn N mục" */
const SO_MA_LIET_KE = 12;

/** Trường nhận dạng một mục — nấc ③ luôn giữ (cắt ngắn) */
const KHOA_NHAN_DANG = [
  "wbs", "ma_wbs", "ma", "id", "so_hieu", "ma_hop_dong", "ma_ho_so", "ma_issue",
  "username", "nguoi", "ten", "tieu_de", "trang_thai",
];

/** Trường đo mức nghiêm trọng — số càng lớn càng phải giữ (xếp theo thứ tự ưu tiên) */
const KHOA_NGHIEM_TRONG = [
  "so_ngay_tre", "tre_so_ke_hoach", "tre_ngay", "tre_ngay_so_ke_hoach", "so_ngay_cham",
  "cham_ngay", "so_ngay_qua_han", "qua_han_ngay", "so_thang_cham", "lech_ngay",
];
/** Cờ đánh dấu mục găng / đang trễ — có cờ thì lên trước */
const CO_GANG = ["gang", "gang_toi_cod", "tren_duong_gang", "critical", "dang_tre", "qua_han"];

/**
 * Vô hiệu hóa trò GIẢ MẠO TIÊU ĐỀ KHỐI trong prompt ("=== CÂU HỎI MỚI ... ==="):
 * rút mọi chuỗi "==" về "=". Dùng chung với chat-agent.ts.
 */
export function neutralize(s: string): string {
  return s.replace(/={2,}/g, "=");
}

/** Chuỗi đúng như sẽ nằm trong prompt: đã vô hiệu tiêu đề giả, gộp khoảng trắng */
function chuanHoa(s: string): string {
  return neutralize(s).replace(/\s+/g, " ").trim();
}

function json(x: unknown): string {
  try {
    return JSON.stringify(x) ?? "";
  } catch {
    return "";
  }
}

function doDai(x: unknown): number {
  return chuanHoa(json(x)).length;
}

function laDoiTuong(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function laNgay(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(s);
}

function cat(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

/** Cắt ở khoảng trắng gần nhất trước trần — không cắt giữa chữ / giữa con số («09/0…») */
function catTheoChu(s: string, n: number): string {
  if (s.length <= n) return s;
  const cho = s.lastIndexOf(" ", n);
  return `${s.slice(0, cho > n * 0.6 ? cho : n).replace(/[\s,;:·—-]+$/, "")}…`;
}

/** Bản sao sâu — mọi nấc sửa trên bản sao, không đụng dữ liệu gốc */
function saoSau<T>(x: T): T {
  const s = json(x);
  return s === "" ? x : (JSON.parse(s) as T);
}

/** Nấc ②: cắt chữ dài (trong mục danh sách ngắn hơn ngoài) */
function catChuDai(x: unknown, trongMuc: boolean, tranNgoai: number, khoa = ""): unknown {
  // Kiểm độc lập đợt 2 M2-01: tên / tiêu đề cắt ở nấc này luôn (100 ký tự, theo khoảng trắng) — trước đây nấc ② cắt cứng 80
  // nên CHU_TEN của nấc ③ không bao giờ có tác dụng («hạn phải có 09/0…» vẫn cụt)
  if (typeof x === "string") return khoa === "ten" || khoa === "tieu_de" ? catTheoChu(x, CHU_TEN) : cat(x, trongMuc ? CHU_TRONG_MUC : tranNgoai);
  if (Array.isArray(x)) return x.map((v) => catChuDai(v, trongMuc || laDoiTuong(v), tranNgoai));
  if (laDoiTuong(x)) {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) o[k] = catChuDai(v, trongMuc, tranNgoai, k);
    return o;
  }
  return x;
}

/** Nấc ③: mỗi mục danh sách chỉ giữ trường lõi; ghi lại tên trường đã bỏ */
function rutTruongLoi(x: unknown, trongMuc: boolean, daBo: Set<string>): unknown {
  if (typeof x === "string") return trongMuc ? x : cat(x, CHU_NGOAI_MUC_LOI);
  if (Array.isArray(x)) return x.map((v) => rutTruongLoi(v, trongMuc || laDoiTuong(v), daBo));
  if (!laDoiTuong(x)) return x;
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x)) {
    if (!trongMuc || typeof v !== "string") {
      o[k] = rutTruongLoi(v, trongMuc, daBo);
      continue;
    }
    if (k === "ten" || k === "tieu_de") o[k] = catTheoChu(v, CHU_TEN);
    else if (KHOA_NHAN_DANG.includes(k)) o[k] = cat(v, CHU_NHAN_DANG);
    else if (laNgay(v) || v.length <= CHU_NGAN) o[k] = v;
    else daBo.add(k);
  }
  return o;
}

/** Điểm quan trọng của một mục: [có cờ găng/trễ, mức trễ lớn nhất] */
function diemQuanTrong(v: unknown): [number, number] {
  if (!laDoiTuong(v)) return [0, 0];
  const co = CO_GANG.some((k) => v[k] === true) ? 1 : 0;
  for (const k of KHOA_NGHIEM_TRONG) {
    const n = v[k];
    if (typeof n === "number" && Number.isFinite(n)) return [co, n];
  }
  return [co, 0];
}

/** Trường làm mã của mục (để liệt kê mã các mục chưa đưa vào) */
function khoaMaCua(ds: unknown[]): string | null {
  const dau = ds.find(laDoiTuong);
  if (!dau) return null;
  return ["wbs", "ma_wbs", "ma", "so_hieu", "ma_hop_dong", "ma_ho_so", "ma_issue", "id", "username"].find(
    (k) => typeof dau[k] === "string" || typeof dau[k] === "number"
  ) ?? null;
}

interface DanhSachTimThay {
  mang: unknown[];
  ten: string;
}

/** Mọi danh sách ≥ 2 mục trong cây dữ liệu (kèm tên trường chứa nó) */
function timDanhSach(x: unknown, ten: string, ra: DanhSachTimThay[]): void {
  if (Array.isArray(x)) {
    if (x.length >= 2 && !ra.some((r) => r.mang === x)) ra.push({ mang: x, ten });
    x.forEach((v) => timDanhSach(v, ten, ra));
  } else if (laDoiTuong(x)) {
    for (const [k, v] of Object.entries(x)) timDanhSach(v, k, ra);
  }
}

export interface KetQuaGon {
  /** Chuỗi JSON (đã chuẩn hoá) đưa vào prompt */
  chuoi: string;
  /** Tổng số mục bị bớt (0 = đủ mục) */
  conThieu: number;
  /** Dòng cảnh báo cho mô hình — null khi nguyên văn */
  canhBao: string | null;
}

/**
 * Gọn một kết quả công cụ cho vừa `tran` ký tự mà KHÔNG làm mô hình mất số.
 * `goiY(khoaMa)` trả cách hỏi riêng phần bị bớt (vd `chi_tiet_dau_viec(ma_wbs=<mã>)`).
 */
export function gonKetQuaCongCu(
  data: unknown,
  tran: number,
  goiY: (khoaMa: string | null) => string
): KetQuaGon {
  const goc = chuanHoa(json(data));
  if (goc.length <= tran) return { chuoi: goc, conThieu: 0, canhBao: null };

  // ② cắt chữ dài
  let d: unknown = catChuDai(saoSau(data), false, CHU_NGOAI_MUC);
  const ghiChu: string[] = ["chữ dài trong từng mục cắt còn 80 ký tự"];
  if (doDai(d) <= tran) return xong(d, 0, ghiChu, []);

  // ③ chỉ giữ trường lõi
  const daBo = new Set<string>();
  d = rutTruongLoi(d, false, daBo);
  if (daBo.size > 0) {
    ghiChu.push(`bỏ trường chữ phụ trong từng mục: ${Array.from(daBo).slice(0, 8).join(", ")} — mã, tên, số, ngày GIỮ NGUYÊN`);
  }
  if (doDai(d) <= tran) return xong(d, 0, ghiChu, []);

  // ④ xếp quan trọng lên đầu, bớt đuôi danh sách dài nhất
  const dong: string[] = [];
  let conThieu = 0;
  const daXep = new Set<unknown[]>();
  for (let vong = 0; vong < 50 && doDai(d) > tran; vong++) {
    // Dò lại mỗi vòng — danh sách nằm trong mục đã bị bớt thì không còn trong cây
    const ds: DanhSachTimThay[] = [];
    timDanhSach(d, "du_lieu", ds);
    // Danh sách còn bớt được (≥ 2 mục thật), dài nhất trước
    const conBot = ds.filter((x) => !daXep.has(x.mang) && x.mang.length >= 2);
    if (conBot.length === 0) break;
    conBot.sort((a, b) => doDai(b.mang) - doDai(a.mang));
    const { mang, ten } = conBot[0]!;
    daXep.add(mang);
    const tong = mang.length;
    // Xếp ổn định: găng trước, trễ nhiều trước; hoà thì giữ thứ tự gốc
    const xep = mang
      .map((v, i) => ({ v, i, p: diemQuanTrong(v) }))
      .sort((a, b) => b.p[0] - a.p[0] || b.p[1] - a.p[1] || a.i - b.i)
      .map((x) => x.v);
    const khoaMa = khoaMaCua(xep);
    const dauMoc = (giu: number): string => {
      const bo = xep.slice(giu);
      const ma = khoaMa
        ? bo
            .map((v) => (laDoiTuong(v) ? v[khoaMa] : undefined))
            .filter((m) => m !== undefined && m !== null)
            .map(String)
        : [];
      const liet =
        ma.length > 0
          ? ` (${khoaMa}: ${ma.slice(0, SO_MA_LIET_KE).join(", ")}${ma.length > SO_MA_LIET_KE ? ", …" : ""})`
          : "";
      return `… còn ${tong - giu} mục của ${ten} chưa đưa vào${liet} — hỏi riêng bằng ${goiY(khoaMa)}. CHƯA THẤY ≠ KHÔNG CÓ.`;
    };
    // Tìm số mục giữ lớn nhất còn vừa trần (tìm nhị phân trên [1, tong-1])
    const dat = (giu: number) => {
      mang.length = 0;
      mang.push(...xep.slice(0, giu), dauMoc(giu));
    };
    let lo = 1;
    let hi = tong - 1;
    let tot = 1;
    while (lo <= hi) {
      const giua = (lo + hi) >> 1;
      dat(giua);
      if (doDai(d) <= tran) {
        tot = giua;
        lo = giua + 1;
      } else hi = giua - 1;
    }
    dat(tot);
    conThieu += tong - tot;
    dong.push(dauMoc(tot));
  }
  if (doDai(d) <= tran) return xong(d, conThieu, ghiChu, dong);

  // Chót: không tách được nữa — cắt cụt nhưng nói rõ còn bao nhiêu
  const s = chuanHoa(json(d));
  const chua = s.length - (tran - 160);
  const duoi = ` …[CẮT CỤT: còn ${chua} ký tự chưa đưa vào — hỏi riêng bằng ${goiY(null)}. CHƯA THẤY ≠ KHÔNG CÓ]`;
  return {
    chuoi: s.slice(0, Math.max(0, tran - 160)) + duoi,
    conThieu: Math.max(conThieu, 1),
    canhBao: `⚠ ĐÃ GỌN: ${[...ghiChu, ...dong, `còn ${chua} ký tự chưa đưa vào`].join(" · ")}`,
  };

  function xong(x: unknown, thieu: number, ghi: string[], cacDong: string[]): KetQuaGon {
    return {
      chuoi: chuanHoa(json(x)),
      conThieu: thieu,
      canhBao: `⚠ ĐÃ GỌN (bản gốc ${goc.length} ký tự): ${[...ghi, ...cacDong].join(" · ")}`,
    };
  }
}

/** Trần cho MỖI công cụ khi khối có `soCongCu` kết quả */
export function tranMoiCongCu(soCongCu: number): number {
  const n = Math.max(1, soCongCu);
  return Math.max(SAN_MOT_CONG_CU, Math.min(TRAN_MOT_CONG_CU, Math.floor(TRAN_CA_KHOI / n)));
}
