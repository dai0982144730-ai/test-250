// ============================================================
// TÓM TẮT BỐN DÒNG CỦA BẢNG ĐIỀU HÀNH — file THUẦN (không node:fs, client import được — luật 10)
//
// Mr. Đại chốt 01/11/2026: thay MỘT câu dài 🤖 (đo: 67–82 từ, vượt mức 60; 3 chỗ nối nhân quả sai —
// «6.1 kéo COD chậm 106 ngày», «7.6.2 chậm THÊM 20 ngày», «Hợp đồng tín dụng chưa rõ trách nhiệm»)
// bằng BỐN dòng ngắn có nhãn: Kéo lùi COD nhiều nhất · Kéo lùi COD thứ hai · Pháp lý · Tuần này (01/11 đổi từ «Gốc chậm»).
//   · AI viết từng dòng (cách 1) — MÁY SOÁT từng dòng; dòng nào trượt thì thay bằng câu máy ghép.
//   · Câu máy ghép hiện ngay lúc chờ AI (luật 3) và không có 🤖 (luật 19).
//   · Mỗi dòng bấm được → cuộn tới khối có số gốc (luật 12, «một vấn đề một nơi»).
// ============================================================

import type { DuLieuBdh, HangMucTuLamCham } from "./gom";
import { fmtSo } from "@/lib/format";
import { dungTuanKhac, tenTuan } from "./tuan-khac";

export type KhoaDong = "goc" | "thu_hai" | "phap_ly" | "tuan";

/** Một dòng như màn nhận — `laAi` = AI viết và qua máy soát (có 🤖) */
export interface DongTomTat {
  khoa: KhoaDong;
  nhan: string;
  /** id khối trên màn để cuộn tới */
  neo: string;
  chu: string;
  laAi: boolean;
}

/** Khung một dòng: số liệu đưa AI + câu máy ghép + thứ máy soát cần biết */
export interface KhungDong {
  khoa: KhoaDong;
  nhan: string;
  neo: string;
  /** Số liệu (tiếng người) gửi AI — mọi con số AI viết phải có ở đây */
  duLieu: string;
  /** Câu máy ghép — hiện ngay, và là chỗ lui khi dòng AI trượt soát */
  cauMay: string;
  /** Riêng Pháp lý: tên hồ sơ (rút gọn) → đã thành việc chưa */
  hoSo?: { ten: string; quaHan: string; daLaViec: boolean }[];
}

export const NEO = {
  duongGang: "khoi-duong-gang",
  tuan: "khoi-tuan-nay",
  phapLy: "khoi-phap-ly",
} as const;

const tenGon = (s: string): string => s.replace(/\s+/g, " ").trim();

function cauHangMuc(h: HangMucTuLamCham): string {
  const n = fmtSo(h.tuLamCodCham ?? 0);
  const tt = h.trongDoThoiTiet ?? 0;
  const thoiTiet = tt <= 0 ? "" : tt >= (h.tuLamCodCham ?? 0) ? ", toàn bộ do thời tiết" : `, trong đó ${fmtSo(tt)} ngày do thời tiết`;
  return `${h.wbs} ${tenGon(h.ten)}: nếu làm đúng Baseline thì COD sớm hơn ${n} ngày${thoiTiet}.`;
}

/** Hạng mục có làm COD lùi, bỏ hạng mục con nằm trong hạng mục đã lấy (7.6.2 trong 7.6 — cùng số ngày, không cộng dồn) */
function hangMucChinh(ds: HangMucTuLamCham[]): HangMucTuLamCham[] {
  const ra: HangMucTuLamCham[] = [];
  for (const h of ds.filter((x) => (x.tuLamCodCham ?? 0) > 0)) {
    if (ra.some((r) => h.wbs.startsWith(r.wbs + ".") || r.wbs.startsWith(h.wbs + "."))) continue;
    ra.push(h);
  }
  return ra;
}

/**
 * Dựng khung bốn dòng từ đúng bộ số các khối trên màn đang bày — không thêm gì.
 * Thiếu số mảng nào thì bỏ dòng đó (không đoán).
 */
export function dungKhungBonDong(b: DuLieuBdh): KhungDong[] {
  const ra: KhungDong[] = [];
  const ct = b.chiTiet && b.chiTiet.loi === null ? b.chiTiet : null;
  const hm = ct ? hangMucChinh(ct.hangMucTuLam) : [];

  if (hm[0]) {
    ra.push({
      khoa: "goc",
      nhan: "Kéo lùi COD nhiều nhất", // Mr. Đại 01/11: «Gốc chậm» khó hiểu
      neo: NEO.duongGang,
      duLieu: `Hạng mục làm COD dự báo lùi nhiều nhất — ${cauHangMuc(hm[0])} (số này là phần COD lùi do RIÊNG hạng mục đó; KHÔNG phải chậm của cả dự án)`,
      cauMay: cauHangMuc(hm[0]),
    });
  }
  if (hm.length > 1) {
    const sau = hm.slice(1, 3);
    ra.push({
      khoa: "thu_hai",
      nhan: sau.length > 1 ? "Kéo lùi COD tiếp theo" : "Kéo lùi COD thứ hai",
      neo: NEO.duongGang,
      duLieu: `${sau.map(cauHangMuc).join(" ")} (mỗi số là phần riêng của hạng mục, KHÔNG cộng dồn với hạng mục khác)`,
      cauMay: sau.map(cauHangMuc).join(" "),
    });
  }

  if (b.phapLy && b.phapLy.loi === null && b.phapLy.soThieu > 0) {
    const daLaViec = (ma: string) => b.daThanhIssue.some((d) => d.khoa === ma);
    const dau = [...b.phapLy.dong]
      .filter((h) => (h.quaHanNgay ?? 0) > 0)
      .sort((x, y) => (y.quaHanNgay ?? 0) - (x.quaHanNgay ?? 0))
      .slice(0, 2);
    // Tên dài rút ≤ 7 chữ (luật 30) — dòng tóm tắt phải đọc được trên điện thoại; tên đủ ở khối Pháp lý bên dưới
    const rut = (s: string): string => {
      const tu = tenGon(s).split(" ");
      return tu.length <= 7 ? tu.join(" ") : tu.slice(0, 7).join(" ").replace(/[\s/,–-]+$/, "") + "…";
    };
    const motHoSo = (h: (typeof dau)[number]) =>
      `${rut(h.ten)} quá hạn ${fmtSo(h.quaHanNgay ?? 0)} ngày (${daLaViec(h.maHoSo) ? "đã thành việc" : "chưa giao việc"})`;
    const cau = `Thiếu ${fmtSo(b.phapLy.soThieu)}/${fmtSo(b.phapLy.tongPhaiCo)} hồ sơ.` + (dau.length ? ` ${dau.map(motHoSo).join("; ")}.` : "");
    ra.push({
      khoa: "phap_ly",
      nhan: "Pháp lý",
      neo: NEO.phapLy,
      duLieu: cau,
      cauMay: cau,
      hoSo: dau.map((h) => ({ ten: tenGon(h.ten), quaHan: fmtSo(h.quaHanNgay ?? 0), daLaViec: daLaViec(h.maHoSo) })),
    });
  }

  // Số chậm theo tuần do khối «Tuần này khác tuần trước» tính từ S-Curve (tuan-khac.ts) — dùng đúng mô hình đó cho khớp số khối
  const mh =
    b.soTuan && b.soTuan.loi === null && b.sCurve && b.sCurve.loi === null
      ? dungTuanKhac({ tuanTruoc: b.soTuan.tuanTruoc, tuanNay: b.soTuan.tuanNay, thuocDo: b.soTuan.thuocDo, diem: b.sCurve.diem, nguonLuc: b.nguonLuc })
      : null;
  if (b.soTuan && mh) {
    const tim = (re: RegExp) => mh.bang.find((t) => re.test(t.ten));
    const bl = tim(/chậm so với baseline/i);
    const mt = tim(/chậm so với tiến độ mục tiêu/i);
    const phan = [
      bl ? `so với Baseline chậm ${bl.truoc} → ${bl.nay}` : "",
      mt ? `so với Tiến độ mục tiêu chậm ${mt.truoc} → ${mt.nay}` : "",
    ].filter(Boolean);
    if (phan.length) {
      const cau = `${tenTuan(b.soTuan.tuanTruoc)} → ${tenTuan(b.soTuan.tuanNay)}: ${phan.join("; ")} (đo trên đường S, cùng mức khối lượng).`;
      ra.push({ khoa: "tuan", nhan: "Tuần này", neo: NEO.tuan, duLieu: cau, cauMay: cau });
    }
  }
  return ra;
}

/** Bốn dòng máy ghép — màn hiện ngay, không chờ AI */
export function dongMay(k: KhungDong[]): DongTomTat[] {
  return k.map((x) => ({ khoa: x.khoa, nhan: x.nhan, neo: x.neo, chu: x.cauMay, laAi: false }));
}

const boDauSo = (s: string): string[] => s.match(/\d+(?:[.,]\d+)*/g) ?? [];
const demTu = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
export const TOI_DA_TU_MOT_DONG = 40;
/** Chữ quá phổ biến trong tên hồ sơ — không dùng để nhận ra hồ sơ nào */
const CHU_THUONG = new Set(["hồ", "sơ", "cho", "dự", "án", "và", "của", "các", "văn", "bản", "khu", "vực", "với", "ký", "hợp", "đồng", "quá", "hạn", "ngày"]);

/**
 * MÁY SOÁT một dòng AI viết. Trả null = qua; chuỗi = lý do trượt (dòng sẽ thay bằng câu máy ghép).
 * Bắt đúng ba kiểu sai đã đo 01/11 + luật chung.
 */
export function soatDong(chu: string, k: KhungDong): string | null {
  const t = chu.trim();
  if (t.length < 10) return "rỗng hoặc quá ngắn";
  if (/\n/.test(t)) return "nhiều dòng";
  if (demTu(t) > TOI_DA_TU_MOT_DONG) return `dài ${demTu(t)} từ (tối đa ${TOI_DA_TU_MOT_DONG})`;
  // ① mọi con số phải có trong số liệu CỦA CHÍNH DÒNG này — chặn «6.1 kéo COD chậm 106 ngày» (106 là số cả dự án)
  const coSo = new Set(boDauSo(k.duLieu));
  const la = boDauSo(t).filter((s) => !coSo.has(s));
  if (la.length) return `số không có trong dữ liệu dòng này: ${la.join(", ")}`;
  // ② hai hạng mục đường găng không cộng dồn — chặn «chậm THÊM 20 ngày»
  if ((k.khoa === "goc" || k.khoa === "thu_hai") && /\b(thêm|cộng|cộng dồn|tổng cộng|kéo theo)\b/i.test(t)) return "nối cộng dồn giữa các hạng mục";
  // luật 36 + ngoại lệ 01/11: số COD lùi của hạng mục không gắn «so với Baseline»; «chậm N ngày» ở dòng tuần phải ghi hệ
  if ((k.khoa === "goc" || k.khoa === "thu_hai") && /so với (Baseline|Tiến độ mục tiêu)/i.test(t)) return "gắn hệ so sánh cho số COD lùi của hạng mục";
  if (k.khoa === "tuan" && /(chậm|trễ|sớm)\s+\d/i.test(t) && !/so với (Baseline|Tiến độ mục tiêu)/i.test(t)) return "chậm N ngày không ghi so với hệ nào (luật 36)";
  // ③ «chưa giao / chưa rõ ai» chỉ được nói về hồ sơ thật sự chưa thành việc — chặn «Hợp đồng tín dụng chưa rõ trách nhiệm»
  if (k.khoa === "phap_ly" && k.hoSo) {
    for (const ve of t.split(/[;.]/)) {
      if (!/chưa (giao|rõ|có (ai|người)|ai)/i.test(ve)) continue;
      // Nhận hồ sơ trong vế câu: có đúng số ngày quá hạn của nó, hoặc trùng ≥ 2 chữ có nghĩa của tên (AI hay viết gọn tên)
      const chuVe = new Set(ve.toLowerCase().split(/[\s/,()]+/));
      const trung = k.hoSo.filter(
        (h) =>
          new RegExp(`(^|[^\\d.,])${h.quaHan.replace(/\./g, "\\.")}(?![\\d.,]*\\d)`).test(ve) ||
          h.ten.toLowerCase().split(/[\s/,()]+/).filter((w) => w.length > 1 && !CHU_THUONG.has(w) && chuVe.has(w)).length >= 2
      );
      if (trung.length === 0) return "nói «chưa giao» mà không rõ hồ sơ nào";
      if (trung.some((h) => h.daLaViec)) return "nói «chưa giao» cho hồ sơ đã thành việc";
    }
  }
  return null;
}
