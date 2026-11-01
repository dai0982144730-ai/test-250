// ============================================================
// luat/loai/tinh-toan.ts — dạng luật TÍNH TOÁN trên số liệu: tinh_toan · dong_tong.
//   tinh_toan: kết quả (ô / cột) phải bằng (hoặc ≥, ≤ …) phép tính giữa A và B (tham chiếu hoặc hằng số):
//     hiệu, tổng (cộng thêm được nhiều cột), tích, thương, phần trăm A ÷ B × 100, hoặc chính A.
//     Có cột → xét TỪNG DÒNG của bảng đó; toàn ô → xét một lần cho cả báo cáo.
//   dong_tong: dòng có nhãn "TỔNG…" phải bằng tổng các dòng còn lại ở các cột chọn (dòng nhóm không tính).
// Số đọc kiểu Việt Nam (docSo): "41,5%", "+3%", "−2,7%", "1.421,5", "1 sự kiện". Cho lệch làm tròn theo số chữ số
// thập phân đã ghi ở ô kết quả (trừ khi chọn so chính xác), cộng sai số tuyệt đối / % người dùng đặt.
// Ô trống, "—", "N/A" → bỏ qua (hoặc tính là 0 nếu chọn); "......" (chưa điền) → luôn bỏ qua.
// ============================================================
import { laChuaDien } from "@/lib/kiem-tra/chuan-hoa";
import type { DuLieuBaoCao, NguCanhKiem, PhepSo, ThamChieu } from "../types";
import type { DinhNghiaMauRutGon } from "../types-them";
import {
  type BoNhan,
  type LoaiDayDu,
  type Loi,
  type TS,
  PHEP_SO,
  bangChung,
  cacDong,
  chuTs,
  chuanChu,
  docSo,
  hoaDau,
  kiemCotMau,
  kiemOMau,
  laCot,
  laO,
  laThamChieu,
  layChuTho,
  soLeDaViet,
  soThamSo,
  taoBoNhan,
  tenViTri,
  viTriCua,
} from "./chung";

// ---------------- Đọc ô số ----------------

type GiaTriSo = { loai: "so"; so: number; tho: string } | { loai: "trong" } | { loai: "chua_dien" } | { loai: "chu"; tho: string };

/** "—", "–", "-", "N/A", "không có" trong bảng số liệu nghĩa là không có số. */
const LA_GACH = /^\s*([—–\-]+|n\/?a|không có|kc)\s*$/i;

/** Phân loại chữ thô của một ô số: số / trống (hoặc "—") / chưa điền ("......") / chữ. */
export function docOSo(tho: string | undefined, chuaDien: string[]): GiaTriSo {
  const s = (tho ?? "").replace(/ /g, " ").trim();
  if (!s || LA_GACH.test(s)) return { loai: "trong" };
  if (laChuaDien(s, chuaDien)) return { loai: "chua_dien" };
  const so = docSo(s);
  return so === null ? { loai: "chu", tho: s } : { loai: "so", so, tho: s };
}

/** Số chữ số thập phân đã viết (theo đúng cách docSo hiểu dấu chấm/phẩy): "98,4%" → 1 · "1.240" → 0 · "0,823" → 3. */
export function soChuSoLe(tho: string): number {
  const m = /(\d{1,3}(?:[ .,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?)/.exec(tho.replace(/ /g, " "));
  if (!m) return 0;
  // dấu nào là thập phân: hỏi đúng bộ đọc của docSo (chuẩn số Việt Nam, chốt 130) — không tự đoán lần hai ở đây
  return soLeDaViet(m[1].replace(/ /g, ""));
}

/** Số hiển thị kiểu Việt Nam: −2,7% · +3 · 1.596 · 98,44. */
export function hienSo(x: number, o: { pt?: boolean; dau?: boolean; le?: number } = {}): string {
  const le = o.le ?? (Math.abs(x) >= 1 ? 2 : 4);
  const r = Number(x.toFixed(le));
  let s = Math.abs(r).toFixed(le);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  const [nguyen, thap] = s.split(".");
  const dau = r < 0 ? "−" : o.dau && r > 0 ? "+" : "";
  return `${dau}${nguyen.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${thap ? `,${thap}` : ""}${o.pt ? "%" : ""}`;
}

const EPS = 1e-9;

/** Sai số cho phép: lớn nhất giữa tuyệt đối, % của giá trị tính ra, và nửa đơn vị chữ số cuối đã ghi (làm tròn). */
function saiSoChoPhep(ts: TS, tinh: number, thoKetQua: string): number {
  const tuyetDoi = Math.max(0, soThamSo(ts.sai_so) ?? 0);
  const theoPt = (Math.abs(tinh) * Math.max(0, soThamSo(ts.sai_so_phan_tram) ?? 0)) / 100;
  const lamTron = ts.khong_lam_tron === true ? 0 : 0.5 * 10 ** -soChuSoLe(thoKetQua);
  return Math.max(tuyetDoi, theoPt, lamTron) + EPS;
}

/** Lời nói về sai số người dùng đặt (không nhắc phần làm tròn). */
function docSaiSo(ts: TS): string {
  const ds: string[] = [];
  const a = soThamSo(ts.sai_so);
  const p = soThamSo(ts.sai_so_phan_tram);
  if (a) ds.push(`±${hienSo(Math.abs(a), { le: 4 })}`);
  if (p) ds.push(`±${hienSo(Math.abs(p), { le: 4 })}% giá trị tính ra`);
  return ds.length ? `cho lệch ${ds.join(" hoặc ")}` : "";
}

const TU_SO_SANH: Record<PhepSo, string> = { "=": "bằng", "!=": "khác", "<": "nhỏ hơn", "<=": "không lớn hơn", ">": "lớn hơn", ">=": "không nhỏ hơn" };

function datSoSanh(kq: number, p: PhepSo, tinh: number, sai: number): boolean {
  switch (p) {
    case "=":
      return Math.abs(kq - tinh) <= sai;
    case "!=":
      return Math.abs(kq - tinh) > sai;
    case "<=":
      return kq <= tinh + sai;
    case ">=":
      return kq >= tinh - sai;
    case "<":
      return kq < tinh - EPS;
    case ">":
      return kq > tinh + EPS;
  }
}

const soSanhTs = (ts: TS): PhepSo => (PHEP_SO.includes(ts.so_sanh as PhepSo) ? (ts.so_sanh as PhepSo) : "=");

/** Chữ người dùng ghi (chu_bo_qua) — kết quả ghi đúng chữ này thì bỏ qua, vd "Đạt". */
function chuBoQua(ts: TS): Set<string> {
  const ds = Array.isArray(ts.chu_bo_qua) ? ts.chu_bo_qua : [];
  return new Set(ds.filter((x): x is string | number => typeof x === "string" || typeof x === "number").map((x) => chuanChu(String(x), true)).filter(Boolean));
}

function danhSachChu(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string | number => typeof x === "string" || typeof x === "number").map((x) => String(x).trim()).filter(Boolean) : [];
}

/** Cột theo tag hoặc theo nhãn thật (không phân biệt hoa thường, dấu). Không có mẫu → giữ nguyên. */
function giaiCot(bang: string, x: string, mau: DinhNghiaMauRutGon | null | undefined): string | null {
  const b = mau?.bang.find((y) => y.tag === bang);
  if (!b) return x;
  const k = chuanChu(x, true);
  return b.cot.find((c) => c.tag === x)?.tag ?? b.cot.find((c) => chuanChu(c.nhan, true) === k)?.tag ?? null;
}

function giaiO(x: string, mau: DinhNghiaMauRutGon | null | undefined): string | null {
  if (!mau) return x;
  const k = chuanChu(x, true);
  return mau.o_nhap.find((o) => o.tag === x)?.tag ?? mau.o_nhap.find((o) => chuanChu(o.nhan, true) === k)?.tag ?? null;
}

// ---------------- tinh_toan ----------------

export type PhepTinh = "hieu" | "tong" | "tich" | "thuong" | "phan_tram" | "chi_a";

const TEN_PHEP: Record<PhepTinh, string> = {
  hieu: "hiệu A − B",
  tong: "tổng A + B (+ các cột cộng thêm)",
  tich: "tích A × B",
  thuong: "thương A ÷ B",
  phan_tram: "phần trăm A ÷ B × 100",
  chi_a: "chính A (so thẳng với A)",
};

const BI_DANH: Record<string, PhepTinh> = {
  hieu: "hieu", tru: "hieu", "-": "hieu", "−": "hieu", "a-b": "hieu", lech: "hieu",
  tong: "tong", cong: "tong", "+": "tong", "a+b": "tong",
  tich: "tich", nhan: "tich", "*": "tich", "×": "tich", x: "tich", "a*b": "tich", "a×b": "tich",
  thuong: "thuong", chia: "thuong", "/": "thuong", "÷": "thuong", ":": "thuong", "a/b": "thuong", "a÷b": "thuong",
  phan_tram: "phan_tram", phantram: "phan_tram", "%": "phan_tram", ty_le: "phan_tram", tyle: "phan_tram", ti_le: "phan_tram",
  chi_a: "chi_a", a: "chi_a", bang_a: "chi_a", "=": "chi_a",
};

/** Mã phép tính từ chữ người dùng ghi ("hiệu", "−", "phần trăm", "%"...). Không nhận ra → null. */
export function chuanPhepTinh(v: unknown): PhepTinh | null {
  if (typeof v !== "string") return null;
  const k = chuanChu(v, true).replace(/\s*([+\-−×*/÷:])\s*/g, "$1").replace(/\s+/g, "_");
  return BI_DANH[k] ?? null;
}

const coGT = (v: unknown) => v !== undefined && v !== null && !(typeof v === "string" && !v.trim());

/** Một vế của phép tính: tham chiếu hoặc hằng số. */
type Ve = { tc: ThamChieu } | { so: number };

function veTs(ts: TS, khoa: "a" | "b"): Ve | null {
  if (laThamChieu(ts[khoa]) && !("ky" in (ts[khoa] as object))) return { tc: ts[khoa] as ThamChieu };
  const so = soThamSo(ts[`${khoa}_so`]);
  return so === null ? null : { so };
}

const ketQuaTs = (ts: TS): ThamChieu | null => (laThamChieu(ts.ket_qua) && !("ky" in (ts.ket_qua as object)) ? (ts.ket_qua as ThamChieu) : null);

/** Các tham chiếu cộng thêm (chỉ phép tổng): cột của bảng chung, hoặc ô khi xét cấp tài liệu. */
function themTs(ts: TS, bang: string | null, mau: DinhNghiaMauRutGon | null | undefined): ThamChieu[] {
  return danhSachChu(ts.them).map((x) => {
    if (bang) return { bang, cot: giaiCot(bang, x, mau) ?? x };
    return { o: giaiO(x, mau) ?? x };
  });
}

function cacThamChieu(ts: TS): ThamChieu[] {
  const ds: ThamChieu[] = [];
  const kq = ketQuaTs(ts);
  if (kq) ds.push(kq);
  for (const k of ["a", "b"] as const) {
    const v = veTs(ts, k);
    if (v && "tc" in v) ds.push(v.tc);
  }
  return ds;
}

function tinh(p: PhepTinh, a: number, b: number, them: number[]): number | null {
  switch (p) {
    case "hieu":
      return a - b;
    case "tong":
      return them.reduce((s, x) => s + x, a + b);
    case "tich":
      return a * b;
    case "thuong":
      return b === 0 ? null : a / b;
    case "phan_tram":
      return b === 0 ? null : (a / b) * 100;
    case "chi_a":
      return a;
  }
}

/** Tên một vế: nhãn thật của cột / ô, hoặc số. */
function tenVe(n: BoNhan, v: Ve): string {
  if ("so" in v) return hienSo(v.so, { le: 4 });
  if (laCot(v.tc)) return n.cot(v.tc.bang, v.tc.cot);
  if (laO(v.tc)) return n.o(v.tc.o);
  return "kỳ báo cáo";
}

function bieuThuc(n: BoNhan, p: PhepTinh, a: Ve, b: Ve | null, them: ThamChieu[]): string {
  const A = tenVe(n, a);
  const B = b ? tenVe(n, b) : "…";
  switch (p) {
    case "hieu":
      return `${A} − ${B}`;
    case "tong":
      return [A, B, ...them.map((t) => tenVe(n, { tc: t }))].join(" + ");
    case "tich":
      return `${A} × ${B}`;
    case "thuong":
      return `${A} ÷ ${B}`;
    case "phan_tram":
      return `${A} ÷ ${B} × 100`;
    case "chi_a":
      return A;
  }
}

/** Giá trị số của một vế ở một dòng (null = bỏ qua dòng này). */
function soCuaVe(bc: DuLieuBaoCao, v: Ve, ctx: NguCanhKiem, dong: Record<string, string> | undefined, trongLa0: boolean): number | null {
  if ("so" in v) return v.so;
  const o = docOSo(layChuTho(bc, v.tc, dong), ctx.gia_tri_chua_dien);
  if (o.loai === "so") return o.so;
  if (o.loai === "trong" && trongLa0) return 0;
  return null;
}

export const TINH_TOAN: LoaiDayDu = {
  ma: "tinh_toan",
  ten: "Phép tính giữa các số",
  mo_ta:
    "Ô / cột kết quả phải bằng phép tính giữa A và B (ô, cột hoặc số): hiệu, tổng, tích, thương, phần trăm A ÷ B × 100 — hoặc so ≥, ≤ với phép tính đó. " +
    'Cột cùng bảng thì xét từng dòng. Hiểu số Việt Nam ("41,5%", "+3%", "−2,7%", "1.421,5"); cho lệch làm tròn theo số chữ số đã ghi, thêm sai số nếu đặt. ' +
    'Ô trống, "—", "......" thì bỏ qua.',
  vi_du: "Trong bảng Tiến độ tổng thể, cột Lệch phải bằng TH lũy kế trừ KH lũy kế",
  tham_so: [
    { khoa: "ket_qua", nhan: "Ô hoặc cột kết quả", kieu: "tham_chieu", bat_buoc: true, goi_y: "vd cột Lệch" },
    { khoa: "so_sanh", nhan: "Kết quả phải … phép tính", kieu: "phep_so", bat_buoc: false, goi_y: "mặc định = (bằng); ≥ / ≤ để so lũy kế với kỳ", mac_dinh: "=" },
    {
      khoa: "phep_tinh",
      nhan: "Phép tính",
      kieu: "chu",
      bat_buoc: true,
      goi_y: "hieu (A − B) · tong (A + B) · tich (A × B) · thuong (A ÷ B) · phan_tram (A ÷ B × 100) · chi_a (chính A)",
    },
    { khoa: "a", nhan: "A — ô hoặc cột", kieu: "tham_chieu", bat_buoc: false, goi_y: "hoặc nhập số ở ô A (số)" },
    { khoa: "a_so", nhan: "A — hoặc một số", kieu: "so", bat_buoc: false },
    { khoa: "b", nhan: "B — ô hoặc cột", kieu: "tham_chieu", bat_buoc: false, goi_y: "hoặc nhập số ở ô B (số); phép chi_a không cần B" },
    { khoa: "b_so", nhan: "B — hoặc một số", kieu: "so", bat_buoc: false },
    { khoa: "them", nhan: "Cộng thêm (chỉ phép tổng)", kieu: "danh_sach", bat_buoc: false, goi_y: "tag hoặc tên cột cùng bảng (ô nếu xét cả báo cáo), vd quan_ly" },
    { khoa: "sai_so", nhan: "Sai số cho phép (tuyệt đối)", kieu: "so", bat_buoc: false, goi_y: "vd 0,1 điểm %; bỏ trống = chỉ cho lệch làm tròn" },
    { khoa: "sai_so_phan_tram", nhan: "Sai số cho phép (% giá trị tính ra)", kieu: "so", bat_buoc: false, goi_y: "vd 1 = lệch không quá 1%" },
    { khoa: "khong_lam_tron", nhan: "So chính xác (không cho lệch làm tròn)", kieu: "bool", bat_buoc: false },
    { khoa: "trong_la_0", nhan: 'Ô A/B trống hoặc "—" thì tính là 0', kieu: "bool", bat_buoc: false },
    { khoa: "chu_bo_qua", nhan: "Kết quả ghi chữ này thì bỏ qua", kieu: "danh_sach", bat_buoc: false, goi_y: "vd Đạt" },
  ],
  kiemThem(ts, mau) {
    const loi: string[] = [];
    const p = chuanPhepTinh(ts.phep_tinh);
    if (!p) loi.push(`Phép tính "${String(ts.phep_tinh)}" không nhận ra (chọn: ${Object.keys(TEN_PHEP).join(", ")})`);
    for (const k of p === "chi_a" ? (["a"] as const) : (["a", "b"] as const)) {
      const coTc = coGT(ts[k]);
      const coSo = coGT(ts[`${k}_so`]);
      const K = k.toUpperCase();
      if (!coTc && !coSo) loi.push(`Thiếu ${K}: chọn một ô / cột hoặc nhập một số`);
      else if (coTc && coSo) loi.push(`${K} chỉ được là một: ô / cột hoặc số`);
    }
    if ((p === "thuong" || p === "phan_tram") && !coGT(ts.b) && soThamSo(ts.b_so) === 0) loi.push("B bằng 0 — không chia được");
    const ds = cacThamChieu(ts);
    const bang = bangChung(ds);
    if (bang === "nhieu") loi.push("Các cột thuộc hai bảng khác nhau — chỉ tính được trong cùng một dòng của một bảng");
    const them = danhSachChu(ts.them);
    if (them.length && p && p !== "tong") loi.push("Cộng thêm chỉ dùng với phép tổng");
    if (them.length && bang !== "nhieu") {
      for (const x of them) {
        if (bang) {
          const tag = giaiCot(bang, x, mau);
          loi.push(...(tag ? kiemCotMau(bang, tag, mau, '"Cộng thêm"') : [`"Cộng thêm": bảng "${mau?.bang.find((b) => b.tag === bang)?.nhan ?? bang}" không có cột "${x}"`]));
        } else {
          const tag = giaiO(x, mau);
          loi.push(...(tag ? kiemOMau(tag, mau, '"Cộng thêm"') : [`"Cộng thêm": ô "${x}" không có trong mẫu ${mau?.ten ?? ""}`.trim()]));
        }
      }
    }
    for (const k of ["sai_so", "sai_so_phan_tram"]) {
      const v = soThamSo(ts[k]);
      if (v !== null && v < 0) loi.push(`Sai số không được âm (đang là ${String(ts[k])})`);
    }
    return loi;
  },
  kiem(bc, ts, ctx) {
    const kq = ketQuaTs(ts);
    const p = chuanPhepTinh(ts.phep_tinh);
    const a = veTs(ts, "a");
    const b = p === "chi_a" ? null : veTs(ts, "b");
    if (!kq || !p || !a || (p !== "chi_a" && !b)) return [];
    const bang = bangChung(cacThamChieu(ts));
    if (bang === "nhieu") return [];
    const mau = ctx.dinh_nghia_mau;
    const them = p === "tong" ? themTs(ts, bang, mau) : [];
    const n = taoBoNhan(mau);
    const soSanh = soSanhTs(ts);
    const trongLa0 = ts.trong_la_0 === true;
    const boQua = chuBoQua(ts);
    const bt = bieuThuc(n, p, a, b, them);
    const sai = docSaiSo(ts);
    const loi: Loi[] = [];
    const xet = (dong: Record<string, string> | undefined, soDong?: number) => {
      const o = docOSo(layChuTho(bc, kq, dong), ctx.gia_tri_chua_dien);
      if (o.loai === "trong" || o.loai === "chua_dien") return;
      const ten = tenViTri(n, kq, soDong);
      if (o.loai === "chu") {
        if (boQua.has(chuanChu(o.tho, true))) return;
        loi.push({ thong_diep: `${ten} = "${o.tho}" không phải số, chưa so được với ${bt}`, vi_tri: viTriCua(kq, soDong) });
        return;
      }
      const va = soCuaVe(bc, a, ctx, dong, trongLa0);
      const vb = b ? soCuaVe(bc, b, ctx, dong, trongLa0) : 0;
      if (va === null || vb === null) return;
      const vThem: number[] = [];
      for (const t of them) {
        const x = soCuaVe(bc, { tc: t }, ctx, dong, trongLa0);
        if (x === null) return;
        vThem.push(x);
      }
      const ra = tinh(p, va, vb, vThem);
      if (ra === null) return; // chia cho 0: không kết luận
      if (datSoSanh(o.so, soSanh, ra, saiSoChoPhep(ts, ra, o.tho))) return;
      const pt = /%/.test(o.tho);
      const dau = /^[+\-−–]/.test(o.tho); // người lập ghi dấu (lệch, biến động) thì số tính ra cũng hiện dấu
      const vKq = hienSo(o.so, { pt, dau, le: 4 });
      const vRa = hienSo(ra, { pt, dau });
      const duoi = sai ? ` (${sai})` : "";
      loi.push({
        thong_diep:
          soSanh === "="
            ? `${ten} = ${vKq}, nhưng ${bt} = ${vRa}${duoi}`
            : `${ten} = ${vKq}, phải ${TU_SO_SANH[soSanh]} ${bt} (= ${vRa})${duoi}`,
        vi_tri: viTriCua(kq, soDong),
      });
    };
    if (bang === null) xet(undefined);
    else for (const { so, dong } of cacDong(bc, bang, ctx)) xet(dong, so);
    return loi;
  },
  doc(ts, n) {
    const kq = ketQuaTs(ts);
    const p = chuanPhepTinh(ts.phep_tinh);
    const a = veTs(ts, "a");
    const b = veTs(ts, "b");
    if (!kq || !p || !a) return "Phép tính giữa các số (chưa đủ tham số)";
    const bang = bangChung(cacThamChieu(ts));
    const trong = typeof bang === "string" && bang !== "nhieu";
    const them = p === "tong" ? themTs(ts, trong ? bang : null, null) : [];
    const phu: string[] = [];
    const sai = docSaiSo(ts);
    if (sai) phu.push(sai);
    if (ts.khong_lam_tron === true) phu.push("so chính xác, không cho lệch làm tròn");
    if (ts.trong_la_0 === true) phu.push('ô trống hoặc "—" tính là 0');
    const bq = danhSachChu(ts.chu_bo_qua);
    if (bq.length) phu.push(`được ghi ${bq.map((x) => `"${x}"`).join(", ")}`);
    const cau = `${n.tc(kq, trong)} phải ${TU_SO_SANH[soSanhTs(ts)]} ${bieuThuc(n, p, a, p === "chi_a" ? null : b, them)}${phu.length ? ` (${phu.join("; ")})` : ""}`;
    return trong ? `Ở mỗi dòng bảng "${n.bang(bang)}": ${cau}` : hoaDau(cau);
  },
};

// ---------------- dong_tong ----------------

const NHAN_TONG_MAC_DINH = ["TỔNG", "TỔNG CỘNG"];

const nhanTongTs = (ts: TS) => {
  const ds = danhSachChu(ts.nhan);
  return ds.length ? ds : NHAN_TONG_MAC_DINH;
};

/** Nhãn dòng khớp: bằng nhãn, hoặc bắt đầu bằng nhãn rồi tới khoảng trắng / dấu ("TỔNG TRẠNG THÁI TUẦN NÀY"). */
function khopNhan(v: string, nhan: string[]): boolean {
  const s = chuanChu(v, true);
  if (!s) return false;
  return nhan.some((x) => {
    const k = chuanChu(x, true);
    return !!k && s.startsWith(k) && (s.length === k.length || !/[\p{L}\p{N}]/u.test(s.charAt(k.length)));
  });
}

/** Các cột phải cộng (tag, theo tag hoặc nhãn thật). */
function cotTong(ts: TS, bang: string, mau: DinhNghiaMauRutGon | null | undefined): string[] {
  return danhSachChu(ts.cot).map((x) => giaiCot(bang, x, mau) ?? x);
}

/** Cột ghi nhãn dòng tổng: tham số, hoặc cột đầu của bảng (không tính STT, Nhóm và các cột số đang cộng). */
function cotNhanTs(bc: DuLieuBaoCao, ts: TS, bang: string, cot: string[], mau: DinhNghiaMauRutGon | null | undefined): string | null {
  const chon = chuTs(ts, "cot_nhan");
  if (chon) return giaiCot(bang, chon, mau) ?? chon;
  const dsCot = mau?.bang.find((b) => b.tag === bang)?.cot.map((c) => c.tag) ?? Object.keys((bc.bang[bang] ?? [])[0] ?? {});
  return dsCot.find((c) => c !== "stt" && c !== "nhom" && !cot.includes(c)) ?? null;
}

/** "dòng 1–3" / "dòng 1, 2, 5". */
function moTaDong(so: number[]): string {
  const lienTiep = so.every((x, i) => i === 0 || x === so[i - 1] + 1);
  if (so.length === 1) return `dòng ${so[0]}`;
  return lienTiep ? `dòng ${so[0]}–${so[so.length - 1]}` : `dòng ${so.join(", ")}`;
}

export const DONG_TONG: LoaiDayDu = {
  ma: "dong_tong",
  ten: "Dòng tổng bằng tổng các dòng",
  mo_ta:
    'Dòng có nhãn "TỔNG" / "TỔNG CỘNG" (nhận theo cột đầu hoặc cột nhãn chọn) phải bằng tổng các dòng còn lại ở từng cột chọn; dòng nhóm (không có số) không tính, ' +
    '"—" hay ô trống ở dòng thành phần tính là 0. Dòng tổng để trống / "—" thì bỏ qua; còn dòng thành phần "......" thì chưa kết luận.',
  vi_du: "Dòng TỔNG của bảng Công nợ phải thu bằng tổng các dự án ở mọi cột số",
  tham_so: [
    { khoa: "bang", nhan: "Bảng", kieu: "bang", bat_buoc: true },
    { khoa: "cot", nhan: "Các cột phải cộng khớp", kieu: "danh_sach", bat_buoc: true, goi_y: "tag hoặc tên cột, vd gia_tri_hd; con_lai" },
    { khoa: "cot_nhan", nhan: "Cột ghi nhãn dòng tổng", kieu: "cot", bat_buoc: false, theo_bang: "bang", goi_y: "mặc định cột đầu (không tính STT, Nhóm)" },
    { khoa: "nhan", nhan: "Nhãn dòng tổng", kieu: "danh_sach", bat_buoc: false, goi_y: "mặc định TỔNG; TỔNG CỘNG — khớp khi nhãn dòng bắt đầu bằng chữ này", mac_dinh: NHAN_TONG_MAC_DINH },
    { khoa: "sai_so", nhan: "Sai số cho phép (tuyệt đối)", kieu: "so", bat_buoc: false, goi_y: "bỏ trống = chỉ cho lệch làm tròn" },
    { khoa: "sai_so_phan_tram", nhan: "Sai số cho phép (% của tổng)", kieu: "so", bat_buoc: false },
    { khoa: "khong_lam_tron", nhan: "So chính xác (không cho lệch làm tròn)", kieu: "bool", bat_buoc: false },
  ],
  kiemThem(ts, mau) {
    const bang = chuTs(ts, "bang");
    const loi: string[] = [];
    const ds = danhSachChu(ts.cot);
    if (!ds.length) loi.push("Chưa chọn cột nào để cộng");
    const b = mau?.bang.find((x) => x.tag === bang);
    if (b) for (const x of ds) if (!giaiCot(bang, x, mau)) loi.push(`"Các cột phải cộng khớp": bảng "${b.nhan}" không có cột "${x}"`);
    for (const k of ["sai_so", "sai_so_phan_tram"]) {
      const v = soThamSo(ts[k]);
      if (v !== null && v < 0) loi.push(`Sai số không được âm (đang là ${String(ts[k])})`);
    }
    const cot = b ? cotTong(ts, bang, mau) : ds;
    const cn = chuTs(ts, "cot_nhan");
    if (cn && cot.includes(cn)) loi.push("Cột ghi nhãn dòng tổng không được là cột đang cộng");
    return loi;
  },
  kiem(bc, ts, ctx) {
    const bang = chuTs(ts, "bang");
    if (!bang) return [];
    const mau = ctx.dinh_nghia_mau;
    const cot = cotTong(ts, bang, mau);
    const cn = cotNhanTs(bc, ts, bang, cot, mau);
    if (!cot.length || !cn) return [];
    const n = taoBoNhan(mau);
    const nhan = nhanTongTs(ts);
    const sai = docSaiSo(ts);
    const dong = cacDong(bc, bang, ctx);
    const viTriTong = dong.map((d, i) => (khopNhan(d.dong[cn] ?? "", nhan) ? i : -1)).filter((i) => i >= 0);
    const loi: Loi[] = [];
    const coSo = (d: Record<string, string>) => cot.some((c) => docOSo(d[c], ctx.gia_tri_chua_dien).loai !== "trong");
    for (const [j, t] of viTriTong.entries()) {
      // Dòng thuộc tổng: các dòng từ tổng trước tới nó; tổng đứng đầu nhóm thì các dòng sau nó tới tổng kế tiếp
      let thanh = dong.slice(j === 0 ? 0 : viTriTong[j - 1] + 1, t);
      if (!thanh.length) thanh = dong.slice(t + 1, viTriTong[j + 1] ?? dong.length);
      thanh = thanh.filter((d) => coSo(d.dong)); // dòng nhóm / ghi chú không có số: không tính
      if (!thanh.length) continue;
      const tong = dong[t];
      for (const c of cot) {
        const o = docOSo(tong.dong[c], ctx.gia_tri_chua_dien);
        if (o.loai !== "so") continue;
        let cong = 0;
        let chuaDien = false;
        for (const d of thanh) {
          const x = docOSo(d.dong[c], ctx.gia_tri_chua_dien);
          if (x.loai === "chua_dien") chuaDien = true;
          else if (x.loai === "so") cong += x.so;
        }
        if (chuaDien) continue; // còn dòng chưa điền: chưa kết luận được
        if (Math.abs(o.so - cong) <= saiSoChoPhep(ts, cong, o.tho)) continue;
        const pt = /%/.test(o.tho);
        loi.push({
          thong_diep: `Dòng ${tong.so} bảng "${n.bang(bang)}": cột "${n.cot(bang, c)}" = ${hienSo(o.so, { pt, le: 4 })}, nhưng tổng ${moTaDong(thanh.map((d) => d.so))} = ${hienSo(cong, { pt })}${sai ? ` (${sai})` : ""}`,
          vi_tri: { bang, dong: tong.so, cot: c },
        });
      }
    }
    return loi;
  },
  doc(ts, n) {
    const bang = chuTs(ts, "bang");
    const cot = danhSachChu(ts.cot);
    if (!bang || !cot.length) return "Dòng tổng bằng tổng các dòng (chưa đủ tham số)";
    const phu: string[] = [];
    const sai = docSaiSo(ts);
    if (sai) phu.push(sai);
    if (ts.khong_lam_tron === true) phu.push("so chính xác, không cho lệch làm tròn");
    const cn = chuTs(ts, "cot_nhan");
    const nhan = nhanTongTs(ts).map((x) => `"${x}"`).join(" / ");
    return (
      `Dòng ${nhan}${cn ? ` (theo cột "${n.cot(bang, cn)}")` : ""} của bảng "${n.bang(bang)}" phải bằng tổng các dòng còn lại ở ${cot.length > 1 ? "các cột" : "cột"} ` +
      `${cot.map((c) => `"${n.cot(bang, c)}"`).join(", ")}${phu.length ? ` (${phu.join("; ")})` : ""}`
    );
  },
};
