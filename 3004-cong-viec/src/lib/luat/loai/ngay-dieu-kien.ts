// ============================================================
// luat/loai/ngay-dieu-kien.ts — dạng luật so sánh giữa hai giá trị: so_sanh_ngay · neu_thi.
// Cả hai trỏ cùng một bảng → xét TỪNG DÒNG; một bên là cột → xét từng dòng của bảng đó; toàn ô/kỳ → cấp tài liệu.
// ============================================================
import { docNgay, laDaXong, ngayVN } from "@/lib/kiem-tra/chuan-hoa";
import { docMocViec } from "@/lib/so-cai/moc-viec";
import type { DieuKien, DuLieuBaoCao, NguCanhKiem, PhepSo, ThamChieu } from "../types";
import {
  type BoNhan,
  type LoaiDayDu,
  type Loi,
  type TS,
  PHEP_SO,
  bangChung,
  cacDong,
  datDieuKien,
  docDieuKien,
  hoaDau,
  laCot,
  laThamChieu,
  layGiaTri,
  namKy,
  soSanh,
  soThamSo,
  taoBoNhan,
  tuPhepNgay,
  viTriCua,
} from "./chung";

type Dong = Record<string, string> | undefined;

/** Chạy hàm cho cấp tài liệu (không bảng) hoặc cho từng dòng có nội dung của bảng chung. */
function theoPhamVi(bc: DuLieuBaoCao, ds: ThamChieu[], ctx: NguCanhKiem, lam: (dong: Dong, soDong?: number) => void): void {
  const bang = bangChung(ds);
  if (bang === "nhieu") return; // kiemThamSo đã chặn: hai cột thuộc hai bảng khác nhau
  if (bang === null) lam(undefined);
  else for (const { so, dong } of cacDong(bc, bang, ctx)) lam(dong, so);
}

const tienTo = (n: BoNhan, bang: string | null, soDong?: number) => (bang && soDong ? `Dòng ${soDong} bảng "${n.bang(bang)}": ` : "");

function congNgay(iso: string, soNgay: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + soNgay);
  return d.toISOString().slice(0, 10);
}

/** Ghép vị trí lỗi: ưu tiên cột (để tô đúng ô trong bảng), rồi ô. */
function viTriUuTien(ds: ThamChieu[], soDong?: number) {
  const c = ds.find(laCot);
  return viTriCua(c ?? ds.find((t) => !("ky" in t)) ?? ds[0], soDong);
}

function kiemHaiBang(ds: ThamChieu[], nhanTs: string): string[] {
  return bangChung(ds) === "nhieu" ? [`${nhanTs}: hai cột thuộc hai bảng khác nhau — chỉ so được trong cùng một dòng của một bảng`] : [];
}

// ---------------- so_sanh_ngay ----------------

const phepTs = (ts: TS) => (PHEP_SO.includes(ts.phep as PhepSo) ? (ts.phep as PhepSo) : "<=");
const lechTs = (ts: TS) => soThamSo(ts.lech_ngay) ?? 0;
const cumLech = (tenB: string, lech: number) => (lech ? `${tenB} ${lech > 0 ? "+" : "−"} ${Math.abs(lech)} ngày` : tenB);

export const SO_SANH_NGAY: LoaiDayDu = {
  ma: "so_sanh_ngay",
  ten: "So sánh hai ngày",
  mo_ta: "Ngày A phải trước/sau/trùng ngày B (có thể cộng thêm số ngày cho B); so trong cùng một dòng khi cả hai là cột của một bảng, so với kỳ báo cáo được; bên nào trống thì bỏ qua.",
  vi_du: "Trong bảng Công việc, ngày bắt đầu phải trước hoặc bằng ngày kết thúc",
  tham_so: [
    { khoa: "a", nhan: "Ngày A", kieu: "tham_chieu", bat_buoc: true, cho_ky: true },
    { khoa: "phep", nhan: "Phép so", kieu: "phep_so", bat_buoc: true, goi_y: "<= nghĩa là A trước hoặc bằng B" },
    { khoa: "b", nhan: "Ngày B", kieu: "tham_chieu", bat_buoc: true, cho_ky: true },
    { khoa: "lech_ngay", nhan: "Cộng thêm cho B (ngày)", kieu: "so", bat_buoc: false, goi_y: "vd 30 = A không quá B + 30 ngày; âm = trừ" },
  ],
  kiemThem(ts) {
    const a = ts.a as ThamChieu;
    const b = ts.b as ThamChieu;
    const loi = kiemHaiBang([a, b], "Ngày A và ngày B");
    if (JSON.stringify(a) === JSON.stringify(b)) loi.push("Ngày A và ngày B đang trỏ cùng một chỗ");
    if (ts.lech_ngay !== undefined && ts.lech_ngay !== null && ts.lech_ngay !== "" && !Number.isInteger(soThamSo(ts.lech_ngay))) {
      loi.push(`Số ngày cộng thêm phải là số nguyên (đang là ${String(ts.lech_ngay)})`);
    }
    return loi;
  },
  kiem(bc, ts, ctx) {
    if (!laThamChieu(ts.a) || !laThamChieu(ts.b)) return [];
    const a = ts.a;
    const b = ts.b;
    const phep = phepTs(ts);
    const lech = lechTs(ts);
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const bang = bangChung([a, b]);
    const nam = namKy(ctx);
    const loi: Loi[] = [];
    theoPhamVi(bc, [a, b], ctx, (dong, soDong) => {
      // Dòng việc ĐÃ XONG: so HẠN (cột Kết thúc) với ô / kỳ báo cáo (vd "Kết thúc ≥ Ngày lập") không còn ý nghĩa — việc xong
      // trước ngày lập là bình thường (Mr. Đại chốt 29/09). So hai cột cùng dòng (bắt đầu ≤ kết thúc) thì vẫn xét.
      const soHan = [a, b].some((t) => laCot(t) && t.cot === "ket_thuc");
      if (dong && soHan && !(laCot(a) && laCot(b)) && laDaXong(dong.tinh_trang || dong.da_xong || "")) return;
      const va = layGiaTri(bc, a, ctx, dong);
      const vb = layGiaTri(bc, b, ctx, dong);
      if (!va || !vb) return;
      const trong = !!soDong;
      const tt = tienTo(n, typeof bang === "string" ? bang : null, soDong);
      const dau = (x: string) => (tt ? x : hoaDau(x));
      let pa = docNgay(va, nam);
      const pb = docNgay(vb, nam ?? (pa.iso ? Number(pa.iso.slice(0, 4)) : undefined));
      if (!pa.iso && pb.iso && nam === undefined) pa = docNgay(va, Number(pb.iso.slice(0, 4)));
      // Hạn theo việc khác ("3 ngày sau khi xong Đổ bê tông móng T9") là cách ghi HỢP LỆ — chưa có ngày thì chưa so, không báo (đo 30/09, Form 10)
      if ((!pa.iso && docMocViec(va)) || (!pb.iso && docMocViec(vb))) return;
      for (const [tc, p, v] of [[a, pa, va], [b, pb, vb]] as const) {
        if (!p.iso) loi.push({ thong_diep: `${tt}${dau(n.tc(tc, trong))} = "${v}" không đọc được thành ngày, chưa so được với ${n.tc(tc === a ? b : a, trong)}`, vi_tri: viTriCua(tc, soDong) });
      }
      if (!pa.iso || !pb.iso) return;
      const moc = lech ? congNgay(pb.iso, lech) : pb.iso;
      if (soSanh(pa.iso, phep, moc)) return;
      loi.push({
        thong_diep: `${tt}${dau(n.tc(a, trong))} (${ngayVN(pa.iso)}) phải ${tuPhepNgay(phep)} ${cumLech(n.tc(b, trong), lech)} (${ngayVN(moc)})`,
        vi_tri: viTriUuTien([a, b], soDong),
      });
    });
    return loi;
  },
  doc(ts, n) {
    if (!laThamChieu(ts.a) || !laThamChieu(ts.b)) return "So sánh hai ngày (chưa đủ tham số)";
    const bang = bangChung([ts.a, ts.b]);
    const trong = typeof bang === "string";
    const cau = `${n.tc(ts.a, trong)} phải ${tuPhepNgay(phepTs(ts))} ${cumLech(n.tc(ts.b, trong), lechTs(ts))}`;
    return trong ? `Ở mỗi dòng bảng "${n.bang(bang)}": ${cau}` : hoaDau(cau);
  },
};

// ---------------- neu_thi ----------------

const hienGiaTri = (v: string) => (v ? `đang là "${v}"` : "đang trống");

export const NEU_THI: LoaiDayDu = {
  ma: "neu_thi",
  ten: "Nếu … thì …",
  mo_ta: "Khi điều kiện thứ nhất đúng thì điều kiện thứ hai phải đúng; hai cột cùng bảng thì xét trong từng dòng, còn ô thì xét cho cả báo cáo.",
  vi_du: 'Trong bảng Công việc, nếu cột "Đã xong" có đánh dấu thì cột "Kết thúc" phải có ngày',
  tham_so: [
    { khoa: "neu", nhan: "Nếu", kieu: "dieu_kien", bat_buoc: true },
    { khoa: "thi", nhan: "Thì", kieu: "dieu_kien", bat_buoc: true },
  ],
  kiemThem(ts) {
    const neu = ts.neu as DieuKien;
    const thi = ts.thi as DieuKien;
    return kiemHaiBang([neu.tham_chieu, thi.tham_chieu], "Điều kiện nếu và thì");
  },
  kiem(bc, ts, ctx) {
    const neu = ts.neu as DieuKien;
    const thi = ts.thi as DieuKien;
    if (!neu?.tham_chieu || !thi?.tham_chieu) return [];
    const n = taoBoNhan(ctx.dinh_nghia_mau);
    const nam = namKy(ctx);
    const bang = bangChung([neu.tham_chieu, thi.tham_chieu]);
    if (bang === "nhieu") return [];
    const loi: Loi[] = [];
    // Vế "thì" là phép SO SÁNH (<, ≤, >, ≥) mà ô còn trống: không có gì để so → không báo (ô trống do luật "phải có giá trị"
    // kiểm). Soát 29/09: luật "giờ vận hành ≤ 168" báo "phải không quá 168 (đang trống)" trên báo cáo chưa điền số.
    const soTrong = (v: string) => v === "" && ["<", "<=", ">", ">="].includes(thi.phep);
    // "Nếu" trên cột, "thì" trên ô: có dòng nào thỏa "nếu" thì ô phải thỏa "thì" (báo một lần)
    if (bang && laCot(neu.tham_chieu) && !laCot(thi.tham_chieu)) {
      const khop = cacDong(bc, bang, ctx).filter(({ dong }) => datDieuKien(neu, layGiaTri(bc, neu.tham_chieu, ctx, dong), nam));
      const vt = layGiaTri(bc, thi.tham_chieu, ctx);
      if (khop.length && !soTrong(vt) && !datDieuKien(thi, vt, nam)) {
        loi.push({
          thong_diep: `Dòng ${khop.map((x) => x.so).join(", ")} bảng "${n.bang(bang)}" có ${docDieuKien(neu, n, true)} nên ${docDieuKien(thi, n, false, true)} (${hienGiaTri(vt)})`,
          vi_tri: viTriCua(thi.tham_chieu),
        });
      }
      return loi;
    }
    theoPhamVi(bc, [neu.tham_chieu, thi.tham_chieu], ctx, (dong, soDong) => {
      if (!datDieuKien(neu, layGiaTri(bc, neu.tham_chieu, ctx, dong), nam)) return;
      const vt = layGiaTri(bc, thi.tham_chieu, ctx, dong);
      if (soTrong(vt) || datDieuKien(thi, vt, nam)) return;
      const trong = !!soDong;
      loi.push({
        thong_diep: `${tienTo(n, typeof bang === "string" ? bang : null, soDong)}${trong ? "vì" : "Vì"} ${docDieuKien(neu, n, trong)} nên ${docDieuKien(thi, n, trong, true)} (${hienGiaTri(vt)})`,
        vi_tri: viTriCua(thi.tham_chieu, soDong),
      });
    });
    return loi;
  },
  doc(ts, n) {
    const neu = ts.neu as DieuKien;
    const thi = ts.thi as DieuKien;
    if (!neu?.tham_chieu || !thi?.tham_chieu) return "Nếu … thì … (chưa đủ tham số)";
    const bang = bangChung([neu.tham_chieu, thi.tham_chieu]);
    if (typeof bang === "string" && bang !== "nhieu") {
      if (laCot(neu.tham_chieu) && laCot(thi.tham_chieu)) return `Ở mỗi dòng bảng "${n.bang(bang)}": nếu ${docDieuKien(neu, n, true)} thì ${docDieuKien(thi, n, true, true)}`;
      if (laCot(thi.tham_chieu)) return `Nếu ${docDieuKien(neu, n, false)} thì ở mỗi dòng bảng "${n.bang(bang)}", ${docDieuKien(thi, n, true, true)}`;
      return `Nếu có dòng nào của bảng "${n.bang(bang)}" mà ${docDieuKien(neu, n, true)} thì ${docDieuKien(thi, n, false, true)}`;
    }
    return `Nếu ${docDieuKien(neu, n, false)} thì ${docDieuKien(thi, n, false, true)}`;
  },
};
