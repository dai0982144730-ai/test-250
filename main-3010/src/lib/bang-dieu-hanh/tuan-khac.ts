// ============================================================
// «TUẦN NÀY KHÁC TUẦN TRƯỚC» — mô hình số cho biểu đồ + bảng + kết luận (Mr. Đại duyệt 28/10/2026, phương án A).
// Hàm THUẦN (không đụng node:fs) — luật 10. CODE tính hết, không có chữ nào do AI viết.
//
// Nguồn: tiendo.s_curve (khối lượng + lệch ngày từng đường) · tiendo.nguon_luc_huy_dong (hai kỳ 7 ngày) · tiendo.so_tuan (việc xong/bắt đầu
// và lý do các thước đo chưa tính được). «Tiến độ thực tế» lấy từ S-Curve cho khớp khối S-Curve cùng trang (Mr. Đại chốt 28/10).
//
// Luật 35 + 36: nhanh chậm tính bằng NGÀY và ghi rõ so với hệ nào. Lệch ngày trong điểm S-Curve là «so Tiến độ mục tiêu»
// (âm = chậm), nên chậm so Baseline = lệch của Baseline − lệch của thực tế (cùng mức khối lượng).
// ============================================================

import type { SCurvePoint } from "@/lib/scurve-kieu";
import { fmtSo } from "@/lib/format";

export interface DongNguonLucTuan {
  thauPhu: string;
  nhanCong: number | null;
  may: number | null;
}

export interface NguonLucHaiTuan {
  truoc: DongNguonLucTuan[] | null;
  nay: DongNguonLucTuan[] | null;
  loi: string | null;
}

export interface ThuocDoSoTuan {
  ten: string;
  truoc: string;
  nay: string;
  ghiChu: string;
}

export interface DauVaoTuanKhac {
  tuanTruoc: string;
  tuanNay: string;
  thuocDo: ThuocDoSoTuan[];
  diem: SCurvePoint[];
  nguonLuc: NguonLucHaiTuan | null;
}

export interface CotTuan {
  nhan: string;
  /** Khối lượng thực tế làm thêm trong tuần (điểm %) — null = chưa có điểm đo */
  lamThem: number | null;
  vaiTro: "truoc" | "nay" | "khac";
}

export interface DuongLuyKe {
  muc: "muc-tieu" | "baseline" | "thuc-te";
  /** Cuối mỗi tuần trong `cot` (cùng độ dài) */
  diem: (number | null)[];
}

export interface HangBang {
  ten: string;
  truoc: string;
  nay: string;
  doi: string;
  /** «tốt» khi xích lại gần kế hoạch, «xau» khi xa ra, «trung» còn lại — chỉ để chọn màu số «Đổi» (luật 18: màu truy về định nghĩa này) */
  huong: "tot" | "xau" | "trung";
  soVoi: string;
  nguon: string;
}

export interface MoHinhTuanKhac {
  tenTuanTruoc: string;
  tenTuanNay: string;
  /** Đo đến ngày nào (ISO) — số có thể cũ hơn hôm nay */
  denNgay: string | null;
  cot: CotTuan[];
  duong: DuongLuyKe[];
  nhanCongTheoThau: { thauPhu: string; truoc: number | null; nay: number | null }[];
  bang: HangBang[];
  chuaTinh: string | null;
  ketLuan: string[];
}

const NGAY_MS = 86400000;

function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Thứ Hai của tuần ISO «2026-W41» → «2026-10-05» */
export function thuHaiTuanIso(tuan: string): string | null {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(tuan.trim());
  if (!m) return null;
  const jan4 = Date.UTC(Number(m[1]), 0, 4);
  const thu = (new Date(jan4).getUTCDay() + 6) % 7; // 0 = thứ Hai
  return iso(jan4 - thu * NGAY_MS + (Number(m[2]) - 1) * 7 * NGAY_MS);
}

export function congNgay(ngay: string, n: number): string {
  return iso(Date.parse(ngay + "T00:00:00Z") + n * NGAY_MS);
}

/** «2026-W41» → «Tuần 41» */
export function tenTuan(tuan: string): string {
  const m = /W0?(\d{1,2})$/.exec(tuan);
  return m ? `Tuần ${m[1]}` : tuan;
}

type Duong = "target" | "baseline" | "actual";

/** Điểm đo ở ĐẦU tuần bắt đầu thứ Hai `d` (điểm tuần, không phải điểm đặc biệt) */
function diemDauTuan(diem: SCurvePoint[], d: string): SCurvePoint | null {
  return diem.find((p) => p.ngay === d && !p.nhan) ?? null;
}

/**
 * Điểm đo ở CUỐI tuần bắt đầu thứ Hai `d`: thứ Hai kế tiếp; tuần đang chạy thì là điểm «ngày cắt dữ liệu» rơi trong tuần.
 * Đường thực tế không có điểm sau ngày cắt → null (không đoán).
 */
function diemCuoiTuan(diem: SCurvePoint[], d: string): SCurvePoint | null {
  const keTiep = congNgay(d, 7);
  const cat = diem.find((p) => p.nhan && p.ngay !== undefined && p.ngay >= d && p.ngay < keTiep && /cắt/.test(p.nhan));
  const tuan = diem.find((p) => p.ngay === keTiep && !p.nhan);
  // Còn điểm «cắt» trong tuần thì cuối tuần là điểm cắt (số thực tế dừng ở đó); không thì thứ Hai kế tiếp
  return cat ?? tuan ?? null;
}

const giaTri = (p: SCurvePoint | null, d: Duong): number | null => {
  const v = p ? p[d] : undefined;
  return typeof v === "number" ? v : null;
};

/** Ngày chậm so Tiến độ mục tiêu (số dương = chậm) từ lệch ngày của điểm; không phải số → null */
function chamSoMucTieu(p: SCurvePoint | null): number | null {
  const v = p?.lechNgay?.thucTe;
  return typeof v === "number" ? -v : null;
}

/** Chậm so Baseline = lệch của Baseline − lệch của thực tế (cùng đo so Tiến độ mục tiêu) */
function chamSoBaseline(p: SCurvePoint | null): number | null {
  const t = p?.lechNgay?.thucTe;
  const b = p?.lechNgay?.baseline;
  return typeof t === "number" && typeof b === "number" ? b - t : null;
}

const soDiem = (n: number): string => fmtSo(Math.round(n * 10) / 10, 1);
const dau = (n: number): string => (n > 0 ? "+" : n < 0 ? "−" : "");
const tuyetDoi = (n: number): number => Math.abs(Math.round(n * 10) / 10);

function tong(ds: DongNguonLucTuan[] | null, truong: "nhanCong" | "may"): number | null {
  if (!ds || ds.length === 0) return null;
  const co = ds.filter((d) => d[truong] !== null);
  return co.length === 0 ? null : co.reduce((a, d) => a + (d[truong] ?? 0), 0);
}

export function dungTuanKhac(dv: DauVaoTuanKhac): MoHinhTuanKhac | null {
  const dauNay = thuHaiTuanIso(dv.tuanNay);
  const dauTruoc = thuHaiTuanIso(dv.tuanTruoc);
  if (!dauNay || !dauTruoc || dv.diem.length === 0) return null;

  // 6 tuần kết thúc ở tuần này
  const cot: CotTuan[] = [];
  const duongTarget: (number | null)[] = [];
  const duongBase: (number | null)[] = [];
  const duongThuc: (number | null)[] = [];
  for (let k = 5; k >= 0; k--) {
    const d = congNgay(dauNay, -7 * k);
    const dau0 = diemDauTuan(dv.diem, d);
    const cuoi = diemCuoiTuan(dv.diem, d);
    const a0 = giaTri(dau0, "actual");
    const a1 = giaTri(cuoi, "actual");
    cot.push({
      nhan: `T${Number(/W0?(\d{1,2})$/.exec(isoTuanSo(d))?.[1] ?? 0)}`,
      lamThem: a0 !== null && a1 !== null ? a1 - a0 : null,
      vaiTro: d === dauNay ? "nay" : d === dauTruoc ? "truoc" : "khac",
    });
    duongTarget.push(giaTri(cuoi, "target"));
    duongBase.push(giaTri(cuoi, "baseline"));
    duongThuc.push(a1);
  }

  const cuoiTruoc = diemCuoiTuan(dv.diem, dauTruoc);
  const cuoiNay = diemCuoiTuan(dv.diem, dauNay);
  const dauTruocP = diemDauTuan(dv.diem, dauTruoc);
  const dauNayP = diemDauTuan(dv.diem, dauNay);
  const aTruoc = giaTri(cuoiTruoc, "actual");
  const aNay = giaTri(cuoiNay, "actual");
  const lamTruoc = aTruoc !== null && giaTri(dauTruocP, "actual") !== null ? aTruoc - (giaTri(dauTruocP, "actual") as number) : null;
  const lamNay = aNay !== null && giaTri(dauNayP, "actual") !== null ? aNay - (giaTri(dauNayP, "actual") as number) : null;
  const baseDiLen = giaTri(cuoiNay, "baseline") !== null && giaTri(dauNayP, "baseline") !== null ? (giaTri(cuoiNay, "baseline") as number) - (giaTri(dauNayP, "baseline") as number) : null;

  const tenT = tenTuan(dv.tuanTruoc);
  const tenN = tenTuan(dv.tuanNay);
  const bang: HangBang[] = [];
  const ketLuan: string[] = [];

  // --- 1. khối lượng thực tế lũy kế
  if (aTruoc !== null && aNay !== null) {
    const d = aNay - aTruoc;
    const soVoi =
      lamTruoc !== null
        ? `làm thêm ${d >= lamTruoc ? "nhiều" : "ít"} hơn tuần trước (${dau(lamTruoc)}${soDiem(Math.abs(lamTruoc))} điểm)`
        : "chưa có điểm đo đầu tuần trước";
    bang.push({
      ten: "Khối lượng thực tế lũy kế",
      truoc: `${soDiem(aTruoc)}%`,
      nay: `${soDiem(aNay)}%`,
      doi: `${dau(d)}${soDiem(Math.abs(d))} điểm`,
      huong: d > 0 ? "tot" : d < 0 ? "xau" : "trung",
      soVoi,
      nguon: "Tiến độ · S-Curve",
    });
    if (lamNay !== null && lamTruoc !== null) {
      ketLuan.push(
        `${tenN} làm thêm ${soDiem(lamNay)} điểm khối lượng nối COD, ${lamNay >= lamTruoc ? "nhiều" : "ít"} hơn ${tenT.toLowerCase()} (${soDiem(lamTruoc)} điểm)` +
          (baseDiLen !== null ? ` — trong khi đường Baseline đi lên ${soDiem(baseDiLen)} điểm trong cùng tuần.` : "."),
      );
    }
  }

  // --- 2. chậm so Tiến độ mục tiêu · 3. chậm so Baseline (đo trên đường S, cùng mức khối lượng)
  const cmtT = chamSoMucTieu(cuoiTruoc);
  const cmtN = chamSoMucTieu(cuoiNay);
  const cbT = chamSoBaseline(cuoiTruoc);
  const cbN = chamSoBaseline(cuoiNay);
  const hangCham = (ten: string, t: number, n: number): HangBang => ({
    ten,
    truoc: `${fmtSo(t)} ngày`,
    nay: `${fmtSo(n)} ngày`,
    doi: n === t ? "0 ngày" : `${dau(n - t)}${fmtSo(Math.abs(n - t))} ngày`,
    huong: n > t ? "xau" : n < t ? "tot" : "trung",
    soVoi: "đo trên đường S, cùng mức khối lượng",
    nguon: "Tiến độ · S-Curve",
  });
  if (cmtT !== null && cmtN !== null) bang.push(hangCham("Chậm so với Tiến độ mục tiêu", cmtT, cmtN));
  if (cbT !== null && cbN !== null) bang.push(hangCham("Chậm so với Baseline", cbT, cbN));
  if (cmtT !== null && cmtN !== null && cbT !== null && cbN !== null) {
    const cau = (n: number, t: number) => (n === t ? "không đổi" : n > t ? `chậm thêm ${fmtSo(n - t)} ngày` : `gần lên ${fmtSo(t - n)} ngày`);
    ketLuan.push(
      `So với Tiến độ mục tiêu, dự án ${cau(cmtN, cmtT)} (${fmtSo(cmtT)} → ${fmtSo(cmtN)} ngày); so với Baseline ${cau(cbN, cbT)} (${fmtSo(cbT)} → ${fmtSo(cbN)} ngày).`,
    );
  }

  // --- 4. nhân công · 5. máy
  const nl = dv.nguonLuc;
  const ncT = nl ? tong(nl.truoc, "nhanCong") : null;
  const ncN = nl ? tong(nl.nay, "nhanCong") : null;
  const nhanCongTheoThau: MoHinhTuanKhac["nhanCongTheoThau"] = [];
  if (nl) {
    const ten = new Set<string>([...(nl.truoc ?? []).map((d) => d.thauPhu), ...(nl.nay ?? []).map((d) => d.thauPhu)]);
    for (const t of Array.from(ten)) {
      nhanCongTheoThau.push({
        thauPhu: t,
        truoc: (nl.truoc ?? []).find((d) => d.thauPhu === t)?.nhanCong ?? null,
        nay: (nl.nay ?? []).find((d) => d.thauPhu === t)?.nhanCong ?? null,
      });
    }
  }
  const moiVao = nhanCongTheoThau.filter((t) => t.truoc === null && t.nay !== null).map((t) => t.thauPhu);
  if (ncT !== null && ncN !== null) {
    const d = ncN - ncT;
    bang.push({
      ten: "Nhân công bình quân",
      truoc: `${soDiem(ncT)} người`,
      nay: `${soDiem(ncN)} người`,
      doi: `${dau(d)}${soDiem(Math.abs(d))} người`,
      huong: "trung",
      soVoi: moiVao.length > 0 ? `thầu phụ ${moiVao.join(", ")} có báo cáo từ ${tenN.toLowerCase()}` : "cộng các thầu phụ có báo cáo",
      nguon: "Tiến độ · nguồn lực huy động",
    });
    const giam = nhanCongTheoThau.filter((t) => t.truoc !== null && t.nay !== null && t.nay < t.truoc);
    let cau =
      d === 0
        ? `Nhân công bình quân không đổi (${soDiem(ncT)} người)`
        : `Nhân công bình quân ${d > 0 ? "tăng từ" : "giảm từ"} ${soDiem(ncT)} ${d > 0 ? "lên" : "xuống"} ${soDiem(ncN)} người`;
    if (moiVao.length > 0) cau += `, phần tăng do ${moiVao.join(", ")} vào công trường (${tenT.toLowerCase()} chưa có báo cáo ngày nào)`;
    if (giam.length > 0) cau += `; ${giam.map((t) => `${t.thauPhu} giảm từ ${soDiem(t.truoc as number)} xuống ${soDiem(t.nay as number)} người`).join(", ")}`;
    ketLuan.push(cau + ".");
  }
  const mT = nl ? tong(nl.truoc, "may") : null;
  const mN = nl ? tong(nl.nay, "may") : null;
  if (mT !== null && mN !== null) {
    const d = mN - mT;
    bang.push({
      ten: "Máy chính bình quân",
      truoc: soDiem(mT),
      nay: soDiem(mN),
      doi: d === 0 ? "0" : `${dau(d)}${soDiem(Math.abs(d))}`,
      huong: "trung",
      soVoi: "cộng các thầu phụ có báo cáo",
      nguon: "Tiến độ · nguồn lực huy động",
    });
  }

  // --- 6. việc xong · việc bắt đầu (so_tuan — thước đo đầu tiên có ghi chú dạng «✅ N việc xong · 🆕 M việc bắt đầu»)
  const viec = dv.thuocDo
    .map((t) => /(\d+)\s*việc xong[^\d]*(\d+)\s*việc bắt đầu/.exec(t.ghiChu))
    .find((m) => m !== null);
  if (viec) {
    const xong = Number(viec[1]);
    const bd = Number(viec[2]);
    bang.push({
      ten: "Việc xong · việc bắt đầu trong tuần",
      truoc: "—",
      nay: `${xong} · ${bd}`,
      doi: xong + bd === 0 ? "0" : "—",
      huong: "trung",
      soVoi: xong + bd === 0 ? "không việc lá nào đổi trạng thái" : "việc lá đổi trạng thái trong tuần",
      nguon: "Tiến độ · so tuần",
    });
  }

  // --- thước đo chưa tính được: gom MỘT dòng, mỗi lý do một lần (nguyên tắc 7)
  const chua = dv.thuocDo.filter((t) => t.truoc === "—" && t.nay === "—");
  const lyDo = (g: string) => g.replace(/^Chưa tính được:\s*/i, "").replace(/\.$/, "");
  const chuaTinh =
    chua.length > 0
      ? `Chưa tính được ${chua.length} thước đo: ${chua.map((t) => `${t.ten} — ${lyDo(t.ghiChu)}`).join(" · ")}`
      : null;
  if (chua.length > 0) {
    ketLuan.push(`${chua.length === 4 ? "Bốn" : String(chua.length)} thước đo còn lại chưa so được vì hệ chưa lưu lịch sử hai tuần — cần việc nền ở agent Tiến độ trước khi có số.`);
  }

  const denNgay = cuoiNay?.ngay ?? null;
  return {
    tenTuanTruoc: tenT,
    tenTuanNay: tenN,
    denNgay,
    cot,
    duong: [
      { muc: "muc-tieu", diem: duongTarget },
      { muc: "baseline", diem: duongBase },
      { muc: "thuc-te", diem: duongThuc },
    ],
    nhanCongTheoThau,
    bang,
    chuaTinh,
    ketLuan,
  };
}

/** «2026-10-05» → «2026-W41» (để lấy số tuần cho nhãn cột) */
function isoTuanSo(ngay: string): string {
  const d = new Date(ngay + "T00:00:00Z");
  const thu = (d.getUTCDay() + 6) % 7;
  const thuNam = new Date(d.getTime() - thu * NGAY_MS + 3 * NGAY_MS); // thứ Năm cùng tuần
  const nam = thuNam.getUTCFullYear();
  const dauNam = Date.UTC(nam, 0, 4);
  const thuDau = (new Date(dauNam).getUTCDay() + 6) % 7;
  const tuan1 = dauNam - thuDau * NGAY_MS;
  const so = Math.floor((d.getTime() - thu * NGAY_MS - tuan1) / (7 * NGAY_MS)) + 1;
  return `${nam}-W${String(so).padStart(2, "0")}`;
}
