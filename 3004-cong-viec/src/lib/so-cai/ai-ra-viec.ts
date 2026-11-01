// ============================================================
// so-cai/ai-ra-viec.ts — AI ĐỌC BÁO CÁO trước khi vào sổ cái. Một lượt AI cho mỗi bản báo cáo, làm năm việc
// (AI tìm / hiểu nghĩa — CODE kiểm lại: câu trích phải có thật, mã việc phải có thật, việc vẫn phải có hạn):
//   1. VIỆC NGOÀI BẢNG: đọc phần chữ tự do (đoạn mô tả, nhận xét, xu thế, ghi chú, cả chữ trong bảng số liệu) và liệt kê
//      những việc cần làm mà quy tắc cố định không lấy được (không nằm trong bảng việc). Mỗi việc PHẢI kèm câu gốc nguyên văn —
//      câu không có trong báo cáo thì bỏ (chống AI bịa); việc đã có trong bảng thì bỏ.
//   2. TÊN VIỆC gọn đúng "việc cần làm" khi tên đang là mô tả vấn đề (vd lấy từ bảng Kiến nghị).
//   3. TRÙNG THEO NGHĨA với việc đang mở trong sổ cái (khác chữ nhưng cùng một việc) — chỉ nhận mã việc có thật.
//   4. HẠN CHO DÒNG THIẾU HẠN: hạn ghi ở chỗ khác trong báo cáo (cột "Hạn KH", đoạn mô tả…) — kèm câu gốc làm bằng chứng.
//   5. SOÁT GỘP TRÙNG TRONG BÁO CÁO: dòng quy tắc cho là "cùng việc" với dòng khác — AI thấy là việc khác thì đưa ra để tách.
//   6. (Mr. Đại chốt 02/10/2026 — lỗi CV-2026-0098) ĐỌC Ô TÌNH TRẠNG như người ("xong", "100%", "đạt", "kết thúc", "đã nghiệm thu"…
//      code bắt kiểu rõ, kiểu lạ code sót) · SOÁT TỪNG ỨNG VIÊN TRÙNG máy tìm (thi công ≠ nghiệm thu) · RÀ LẦN CUỐI kế hoạch máy
//      định cho từng dòng. Việc vào sổ cái luôn có AI rà: /api/gui tự chạy lượt này nếu người nộp chưa chạy.
// Chỉ GỢI Ý: người gửi tích chọn / bấm xác nhận mới áp dụng; AI lỗi không chặn gửi. Lấy việc từ bảng vẫn bằng quy tắc cố định.
// ============================================================
import type { DongCongViec } from "@/lib/types";
import { cungMotViec, docHanTrongChu } from "@/lib/kiem-tra/viec-tu-kien-nghi";
import { docNgay } from "@/lib/kiem-tra/chuan-hoa";

export interface ViecMoSoCai {
  id: string;
  ten: string;
  du_an: string | null;
  /** việc đã xong / đã đóng: ngày (yyyy-mm-dd); null = đang mở */
  xong_ngay?: string | null;
}

/** Ứng viên trùng MÁY tìm cho một dòng (so-cai/dich-vu.ts ungVienTrung) */
export type UngVienMay = { cong_viec_id: string; ten: string; do_giong: number; da_xong: string | null };

export interface GoiYAiViec {
  chi_so: number; // vị trí trong danh sách việc của báo cáo (kq.cong_viec)
  ten_goi_y: string | null;
  trung: { ma: string; ten: string; ly_do: string }[];
  /** dòng đang thiếu hạn: hạn AI thấy ghi ở chỗ khác trong báo cáo (yyyy-mm-dd) + câu gốc */
  han_goi_y?: { han: string; trich: string };
  /** 🤖 AI đọc ô Tình trạng: xong / chưa xong / dừng + lý do (chỉ khi ô có chữ) */
  tinh_trang?: { gia_tri: "xong" | "chua_xong" | "dung"; ly_do: string };
  /** 🤖 ứng viên trùng của MÁY mà AI đọc ra KHÔNG phải cùng việc */
  may_sai?: { ma: string; ly_do: string }[];
  /** 🤖 rà lần cuối: kế hoạch máy định cho dòng này có gì sai */
  van_de?: string;
}

/** Dòng quy tắc đã gộp là "cùng việc" với dòng khác trong báo cáo (để AI soát lại). */
export interface DongDaGop {
  bang: string;
  dong: number;
  ten: string;
  chu: string;
  voi: string;
}

/** Việc AI tìm thấy NGOÀI các bảng việc của báo cáo. */
export interface ViecNgoaiBang {
  ten: string;
  /** người / đơn vị làm như ghi trong câu (chưa phân giải) */
  nguoi_lam: string | null;
  /** hạn yyyy-mm-dd (AI đọc, không có thì quy tắc đọc từ câu gốc) — null = chưa có hạn, người gửi phải ghi */
  han: string | null;
  /** câu gốc nguyên văn trong báo cáo */
  trich: string;
  /** mục của báo cáo chứa câu gốc */
  muc: string | null;
  trung: { ma: string; ten: string; ly_do: string }[];
  /** dòng quy tắc đã gộp nhầm (AI thấy là việc khác): vị trí + lý do */
  tach?: { bang: string; dong: number; voi: string; ly_do: string };
  /** Đợt E: việc nhặt ở chương mẫu khai "sinh việc — văn xuôi" */
  van_xuoi?: boolean;
}

export interface KetQuaAiDocBaoCao {
  goi_y: GoiYAiViec[];
  viec_them: ViecNgoaiBang[];
}

export type ChayAi = (prompt: string, system: string) => Promise<string>;

/** Chữ tự do của báo cáo theo mục (NoiDungWord.muc). van_xuoi: chương mẫu khai "sinh việc — văn xuôi" (Đợt E). */
export type MucTuDo = { tieu_de: string; van_ban: string; van_xuoi?: boolean };

/** Nhãn đánh dấu chương văn xuôi trong lời gửi AI (một chỗ: dựng chữ + lời dặn) */
const NHAN_VAN_XUOI = "[CHƯƠNG SINH VIỆC — VĂN XUÔI]";

const TOI_DA_CHU = 14000;

const HE_THONG = `Bạn là trợ lý rà soát công việc cho sổ cái giao việc của công ty SCI (thủy điện, điện gió, đầu tư dự án).
Bạn nhận: (A) các việc hệ thống đã lấy từ BẢNG của một báo cáo, (B) các việc trong sổ cái — đang mở, và đã xong gần đây (ghi "(đã xong dd/mm/yyyy)"),
(C) phần CHỮ TỰ DO của báo cáo (ngoài bảng việc).
Luật của công ty: việc báo ĐÃ XONG thì KHÔNG vào sổ cái thành việc mới (xong rồi thì không giao) — chỉ dùng để đóng đúng việc đang có.
Ngoại lệ: báo cáo là LẦN NẠP ĐẦU của đơn vị lập + mẫu (máy định ghi "vào sổ ở trạng thái ĐÃ XONG — lần nạp đầu") thì việc đã xong
được ghi vào sổ ở trạng thái đã xong (không giao, không thành việc đang mở) — đúng luật, không phải lỗi.
Làm các việc:
0. ĐỌC Ô TÌNH TRẠNG của mỗi việc ở (A) như người đọc ("tình trạng ghi: …"): người viết ghi rất nhiều kiểu. Trả "tinh_trang":
   "xong" (đã hoàn thành: xong, đã xong, 100%, đạt, hoàn thành, kết thúc, đã nghiệm thu, đã ký, đã bàn giao… kể cả viết khác),
   "chua_xong" (chưa làm / đang làm / đạt dưới 100% / sắp / chờ), "dung" (dừng, hủy, không làm nữa), kèm "ly_do_tt" ngắn.
   Không có "tình trạng ghi" thì "tinh_trang": null.
   Với mỗi ứng viên ở "máy thấy giống" mà KHÔNG phải cùng một việc (khác hành động: thi công ≠ nghiệm thu, lập ≠ trình ≠ duyệt;
   khác đối tượng; khác đợt / số hiệu), trả vào "may_sai" [{"ma","ly_do"}]. Đúng là cùng việc thì không ghi.
   RÀ LẦN CUỐI "máy định" của dòng: thấy sai (việc đã xong mà sắp tạo việc mới, sắp đóng/gộp nhầm việc khác, tình trạng đọc sai…)
   thì ghi "van_de" một câu; đúng thì null.
1. Với mỗi việc ở (A): nếu việc ghi "(chưa có hạn)" mà (A)/(C) có ghi hạn / mốc cho đúng việc đó ở chỗ khác (vd cột "Hạn KH",
   "dự kiến …", "trước …"), trả "han":"dd/mm/yyyy" và "trich_han" CHÉP NGUYÊN VĂN câu có hạn đó; không thấy thì bỏ qua (KHÔNG đoán).
   Nếu tên đang là MÔ TẢ VẤN ĐỀ / NHẬN XÉT / SỐ LIỆU chứ không phải VIỆC CẦN LÀM, đề xuất tên việc ngắn gọn
   (dưới 15 từ, bắt đầu bằng động từ, tiếng Việt có dấu) dựa trên phần "kiến nghị / việc cần làm"; tên đã rõ thì để null.
   Tìm trong (B) những việc CÙNG MỘT VIỆC (cùng đối tượng, cùng hành động, có thể viết khác chữ). Chỉ nêu khi chắc chắn.
2. Đọc (C) và liệt kê những VIỆC CẦN LÀM chưa có ở (A): cam kết, kế hoạch, việc giao, việc sẽ làm, đề nghị ai đó làm gì
   (vd "sẽ hoàn thành…", "cần…", "đề nghị … trước …", "tuần tới …", "kế hoạch …", "giao … thực hiện").
   KHÔNG lấy: số liệu, sự việc đã xảy ra / đã xong, nhận xét chung không có hành động, việc đã có ở (A) (kể cả khác chữ).
   Mục có nhãn ${NHAN_VAN_XUOI}: chương mẫu dành để GHI VIỆC PHẢI LÀM bằng lời văn — liệt kê ĐỦ mọi việc cần làm trong đó
   (mỗi ý / gạch đầu dòng có hành động là một việc), "muc" ghi đúng tên mục như đầu dòng ###.
   Mỗi việc: "ten" (ngắn, bắt đầu bằng động từ), "nguoi_lam" (người/đơn vị làm như ghi trong câu, không có thì null),
   "han" (dd/mm/yyyy nếu câu có ngày/tháng/tuần cụ thể, không có thì null — KHÔNG tự đoán), "trich" (CHÉP NGUYÊN VĂN
   một câu hoặc một đoạn ngắn trong (C) chứa việc đó, không sửa chữ), "muc" (tên mục chứa câu đó), "trung" (việc ở (B) cùng việc).
3. Với mỗi cặp ở (D) (hệ thống đã coi dòng bên trái là CÙNG VIỆC với việc bên phải nên không tạo việc riêng): nếu thật ra là
   HAI VIỆC KHÁC NHAU (khác đối tượng / khác hành động / khác người làm), trả vào "tach" kèm tên việc cho dòng đó và lý do. Đúng là cùng việc thì bỏ qua.
4. Không bịa việc, không bịa mã việc. Không có gì thì để mảng rỗng.
Chỉ trả về JSON đúng dạng:
{"viec":[{"i":<số thứ tự ở A>,"tinh_trang":<"xong"|"chua_xong"|"dung"|null>,"ly_do_tt":<chuỗi hoặc null>,"ten_goi_y":<chuỗi hoặc null>,"trung":[{"ma":"<mã việc>","ly_do":"<ngắn>"}],"may_sai":[{"ma":"<mã>","ly_do":"<ngắn>"}],"van_de":<chuỗi hoặc null>,"han":<"dd/mm/yyyy" hoặc null>,"trich_han":<chuỗi hoặc null>}],
 "tach":[{"d":<số thứ tự ở D>,"ten":"<tên việc cho dòng đó>","ly_do":"<vì sao khác việc>"}],
 "viec_them":[{"ten":"…","nguoi_lam":<chuỗi hoặc null>,"han":<"dd/mm/yyyy" hoặc null>,"trich":"…","muc":"…","trung":[{"ma":"…","ly_do":"…"}]}]}
Không viết gì ngoài JSON.`;

export function chuTuDoChoAi(muc: MucTuDo[] | undefined): string {
  let s = "";
  // Chương văn xuôi đứng TRƯỚC — chữ dài quá TOI_DA_CHU thì cắt phần thường, không cắt chương sinh việc (Đợt E)
  const ds = [...(muc ?? [])].sort((a, b) => Number(!!b.van_xuoi) - Number(!!a.van_xuoi));
  for (const m of ds) {
    const t = (m.van_ban ?? "").trim();
    if (!t) continue;
    const phan = `### ${m.tieu_de || "(đầu báo cáo)"}${m.van_xuoi ? ` ${NHAN_VAN_XUOI}` : ""}\n${t}\n\n`;
    if (s.length + phan.length > TOI_DA_CHU) {
      s += phan.slice(0, Math.max(0, TOI_DA_CHU - s.length));
      break;
    }
    s += phan;
  }
  return s.trim();
}

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Kế hoạch máy định cho một dòng (đúng luật so-cai/dich-vu.ts) — để AI rà lần cuối. lanDau: lần nạp đầu của đơn vị lập + mẫu. */
export function mayDinh(c: DongCongViec, uv: UngVienMay[], lanDau = false): string {
  if (c.ma_viec?.trim()) return `${c.da_xong ? "đóng" : "cập nhật"} việc ${c.ma_viec.trim()} (báo cáo ghi mã)`;
  const mo = uv.filter((u) => !u.da_xong);
  if (c.da_xong) {
    if (mo.length)
      return `báo đã xong → hỏi người nộp: có phải ${mo.map((u) => u.cong_viec_id).join(" / ")} (đóng việc đó)${lanDau ? ", vào sổ ở trạng thái ĐÃ XONG (lần nạp đầu)" : ""} hay không vào sổ`;
    const xong = uv.find((u) => u.da_xong && u.do_giong >= 0.9);
    if (xong) return `không vào sổ — đã ghi xong ở ${xong.cong_viec_id}`;
    return lanDau ? "vào sổ ở trạng thái ĐÃ XONG — lần nạp đầu (không giao, không thành việc đang mở)" : "không vào sổ — việc đã xong, sổ chưa từng có";
  }
  return uv.length ? `hỏi người nộp: cùng việc ${uv.map((u) => u.cong_viec_id).join(" / ")} hay việc mới` : "tạo việc mới trong sổ cái";
}

export function dungYeuCau(
  congViec: DongCongViec[],
  viecMo: ViecMoSoCai[],
  mucTuDo?: MucTuDo[],
  daGop: DongDaGop[] = [],
  /** ứng viên trùng MÁY tìm cho từng dòng (cùng thứ tự congViec) */
  ungVien: UngVienMay[][] = [],
  /** báo cáo là lần nạp đầu của đơn vị lập + mẫu (so-cai/dich-vu.ts laLanNapDau) */
  lanDau = false,
): { prompt: string; system: string } {
  const bao = congViec
    .map((c, i) => {
      const kn = (c.ket_qua_can_co ?? "").trim();
      const han = c.ket_thuc ? ` | hạn: ${c.ket_thuc}` : c.ket_thuc_sau ? "" : " | (chưa có hạn)";
      const tt = c.tinh_trang?.trim() ? ` | tình trạng ghi: "${c.tinh_trang.trim()}" (máy đọc: ${c.da_xong ? "ĐÃ XONG" : "chưa xong"})` : "";
      const uv = ungVien[i] ?? [];
      const may = uv.length
        ? ` | máy thấy giống: ${uv.map((u) => `${u.cong_viec_id} "${u.ten.slice(0, 120)}" (${u.da_xong ? `đã xong ${dmy(u.da_xong)}` : "đang mở"}, ${Math.round(u.do_giong * 100)}%)`).join("; ")}`
        : "";
      return `#${i} | tên: ${c.ten}${kn ? ` | kiến nghị / việc cần làm: ${kn}` : ""}${c.du_an ? ` | dự án: ${c.du_an}` : ""} | làm: ${c.phu_trach.map((p) => p.ten).join(", ") || "?"}${han}${tt}${may} | máy định: ${mayDinh(c, uv, lanDau)}`;
    })
    .join("\n");
  const gop = daGop.map((d, k) => `D${k} | dòng: ${d.chu.slice(0, 400)} | đã coi là cùng việc: ${d.voi}`).join("\n");
  const mo = viecMo.map((v) => `${v.id} | ${v.ten}${v.du_an ? ` | ${v.du_an}` : ""}${v.xong_ngay ? ` | (đã xong ${dmy(v.xong_ngay)})` : ""}`).join("\n");
  const tuDo = chuTuDoChoAi(mucTuDo);
  return {
    system: HE_THONG,
    prompt:
      `(A) VIỆC TRONG BẢNG CỦA BÁO CÁO:\n${bao || "(không có)"}\n\n(B) VIỆC TRONG SỔ CÁI — đang mở và đã xong gần đây (mã | tên | dự án):\n${mo || "(chưa có)"}\n\n` +
      `(C) CHỮ TỰ DO CỦA BÁO CÁO:\n${tuDo || "(không có)"}\n\n(D) CÁC DÒNG HỆ THỐNG ĐÃ GỘP LÀ CÙNG VIỆC:\n${gop || "(không có)"}\n\nTrả JSON như hướng dẫn.`,
  };
}

/** Lấy khối JSON đầu tiên trong câu trả lời (AI hay bọc ```json … ```). */
function layJson(text: string): unknown {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) throw new Error("AI không trả về JSON");
  return JSON.parse(m[0]);
}

/** Chuẩn hóa để so câu trích: bỏ khoảng trắng thừa, ngoặc kép cong/thẳng, chữ thường. */
const chuanTrich = (s: string) =>
  (s ?? "")
    .normalize("NFC")
    .replace(/[“”"'‘’]/g, "")
    .replace(/[\s\u00a0]+/g, " ")
    .trim()
    .toLowerCase();

export async function raSoatViecBangAi(
  congViec: DongCongViec[],
  viecMo: ViecMoSoCai[],
  chay: ChayAi,
  /** van_ban: toàn bộ chữ báo cáo (kiểm câu trích hạn / dòng gộp); da_gop: dòng quy tắc đã gộp là cùng việc */
  tuyChon: { muc?: MucTuDo[]; ngay_lap?: string; nam?: number; van_ban?: string; da_gop?: DongDaGop[]; ung_vien?: UngVienMay[][]; lan_nap_dau?: boolean } = {},
): Promise<KetQuaAiDocBaoCao> {
  const tuDo = chuTuDoChoAi(tuyChon.muc);
  const daGop = tuyChon.da_gop ?? [];
  if (!congViec.length && !tuDo && !daGop.length) return { goi_y: [], viec_them: [] };
  const ungVien = tuyChon.ung_vien ?? [];
  const { prompt, system } = dungYeuCau(congViec, viecMo, tuyChon.muc, daGop, ungVien, !!tuyChon.lan_nap_dau);
  const dl = layJson(await chay(prompt, system)) as {
    viec?: { i?: unknown; ten_goi_y?: unknown; trung?: unknown; han?: unknown; trich_han?: unknown; tinh_trang?: unknown; ly_do_tt?: unknown; may_sai?: unknown; van_de?: unknown }[];
    tach?: { d?: unknown; ten?: unknown; ly_do?: unknown }[];
    viec_them?: { ten?: unknown; nguoi_lam?: unknown; han?: unknown; trich?: unknown; muc?: unknown; trung?: unknown }[];
  };
  const theoMa = new Map(viecMo.map((v) => [v.id.toUpperCase(), v]));
  const docTrung = (x: unknown) =>
    (Array.isArray(x) ? x : [])
      .map((t) => t as { ma?: unknown; ly_do?: unknown })
      .map((t) => ({ mo: theoMa.get(String(t.ma ?? "").toUpperCase()), ly_do: String(t.ly_do ?? "").slice(0, 200) }))
      .filter((t): t is { mo: ViecMoSoCai; ly_do: string } => !!t.mo) // chỉ nhận mã có thật trong sổ cái
      .map((t) => ({ ma: t.mo.id, ten: t.mo.ten, ly_do: t.ly_do }))
      .slice(0, 3);

  const toanVan = chuanTrich(`${tuyChon.van_ban ?? ""}\n${tuDo}`);
  const nam0 = tuyChon.nam ?? Number((tuyChon.ngay_lap ?? "").slice(0, 4) || new Date().getFullYear());
  const goi_y: GoiYAiViec[] = [];
  for (const v of dl.viec ?? []) {
    const i = Number(v.i);
    if (!Number.isInteger(i) || i < 0 || i >= congViec.length) continue;
    const ten = typeof v.ten_goi_y === "string" && v.ten_goi_y.trim() && v.ten_goi_y.trim() !== congViec[i].ten.trim() ? v.ten_goi_y.trim().slice(0, 160) : null;
    const trung = docTrung(v.trung);
    // Hạn cho dòng thiếu hạn: câu gốc phải có thật trong báo cáo và đọc ra được ngày
    let han_goi_y: GoiYAiViec["han_goi_y"];
    const trichHan = typeof v.trich_han === "string" ? v.trich_han.replace(/\s+/g, " ").trim().slice(0, 400) : "";
    if (!congViec[i].ket_thuc && trichHan && toanVan.includes(chuanTrich(trichHan))) {
      const han = (typeof v.han === "string" && v.han.trim() ? docNgay(v.han.trim(), nam0).iso : undefined) ?? docHanTrongChu(trichHan, tuyChon.ngay_lap, nam0);
      if (han) han_goi_y = { han, trich: trichHan };
    }
    // Tình trạng: chỉ nhận khi ô có chữ thật (AI không được đoán xong cho ô trống)
    const gt: "xong" | "chua_xong" | "dung" | null =
      congViec[i].tinh_trang?.trim() && (v.tinh_trang === "xong" || v.tinh_trang === "chua_xong" || v.tinh_trang === "dung") ? v.tinh_trang : null;
    const tinh_trang = gt ? { gia_tri: gt, ly_do: String(v.ly_do_tt ?? "").slice(0, 200) } : undefined;
    // Ứng viên máy sai: chỉ nhận mã nằm trong danh sách máy đã đưa
    const uvMa = new Set((ungVien[i] ?? []).map((u) => u.cong_viec_id));
    const may_sai = (Array.isArray(v.may_sai) ? v.may_sai : [])
      .map((t) => t as { ma?: unknown; ly_do?: unknown })
      .map((t) => ({ ma: String(t.ma ?? "").toUpperCase(), ly_do: String(t.ly_do ?? "").slice(0, 200) }))
      .filter((t) => uvMa.has(t.ma));
    const van_de = typeof v.van_de === "string" && v.van_de.trim() ? v.van_de.trim().slice(0, 300) : undefined;
    if (ten || trung.length || han_goi_y || tinh_trang || may_sai.length || van_de)
      goi_y.push({
        chi_so: i,
        ten_goi_y: ten,
        trung,
        ...(han_goi_y ? { han_goi_y } : {}),
        ...(tinh_trang ? { tinh_trang } : {}),
        ...(may_sai.length ? { may_sai } : {}),
        ...(van_de ? { van_de } : {}),
      });
  }

  // Việc ngoài bảng: câu trích phải có thật trong báo cáo; trùng việc đã có trong bảng thì bỏ
  const nguon = chuanTrich(tuDo);
  const nam = tuyChon.nam ?? Number((tuyChon.ngay_lap ?? "").slice(0, 4) || new Date().getFullYear());
  const viec_them: ViecNgoaiBang[] = [];
  for (const v of dl.viec_them ?? []) {
    const ten = typeof v.ten === "string" ? v.ten.replace(/\s+/g, " ").trim().slice(0, 160) : "";
    const trich = typeof v.trich === "string" ? v.trich.replace(/\s+/g, " ").trim().slice(0, 600) : "";
    if (!ten || !trich || !nguon.includes(chuanTrich(trich))) continue; // không có câu gốc thật → AI bịa, bỏ
    if (congViec.some((c) => cungMotViec({ ten, chu: trich }, { ten: c.ten, chu: `${c.ket_qua_can_co ?? ""}` }))) continue;
    if (viec_them.some((x) => cungMotViec({ ten, chu: trich }, { ten: x.ten, chu: x.trich }))) continue;
    const hanAi = typeof v.han === "string" && v.han.trim() ? docNgay(v.han.trim(), nam).iso : undefined;
    // thuộc chương văn xuôi: tên mục AI ghi, hoặc câu trích nằm trong chữ của chương đó
    const vx = (tuyChon.muc ?? []).filter((m) => m.van_xuoi);
    const laVanXuoi = vx.some((m) => (typeof v.muc === "string" && chuanTrich(v.muc).includes(chuanTrich(m.tieu_de))) || chuanTrich(m.van_ban).includes(chuanTrich(trich)));
    const han = hanAi ?? docHanTrongChu(trich, tuyChon.ngay_lap, nam) ?? null;
    viec_them.push({
      ten,
      nguoi_lam: typeof v.nguoi_lam === "string" && v.nguoi_lam.trim() ? v.nguoi_lam.trim().slice(0, 120) : null,
      han,
      trich,
      muc: typeof v.muc === "string" && v.muc.trim() ? v.muc.trim().replace(NHAN_VAN_XUOI, "").trim().slice(0, 160) : null,
      trung: docTrung(v.trung),
      ...(laVanXuoi ? { van_xuoi: true } : {}),
    });
    if (viec_them.length >= 30) break;
  }
  // Dòng quy tắc đã gộp nhầm: AI thấy là việc khác → đưa ra để người gửi chọn tạo việc riêng (câu gốc = chữ của dòng)
  for (const t of dl.tach ?? []) {
    const d = daGop[Number(String(t.d ?? "").replace(/^D/i, ""))];
    if (!d || viec_them.some((x) => x.tach?.bang === d.bang && x.tach.dong === d.dong)) continue;
    const ten = typeof t.ten === "string" && t.ten.trim() ? t.ten.replace(/\s+/g, " ").trim().slice(0, 160) : d.ten;
    viec_them.push({
      ten,
      nguoi_lam: null,
      han: docHanTrongChu(d.chu, tuyChon.ngay_lap, nam0) ?? null,
      trich: d.chu.slice(0, 600),
      muc: null,
      trung: [],
      tach: { bang: d.bang, dong: d.dong, voi: d.voi, ly_do: String(t.ly_do ?? "").slice(0, 200) },
    });
  }
  return { goi_y, viec_them };
}
