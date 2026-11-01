// ============================================================
// LUẬT "MÃ KÈM TÊN" — Mr. Đại chốt 26/09/2026 (luật tuyệt đối)
// MD: CHOT/LOI-DUNG-CHUNG-v1.0.md — mục "Mã kèm tên" (MỘT chỗ định nghĩa)
//
// Nội dung AI viết (có 🤖) KHÔNG BAO GIỜ chỉ ghi mã: phải "mã + tên" hoặc chỉ
// tên. Sai: "nếu việc 9.6.4 xong sớm 30 ngày". Đúng: "nếu việc 9.6.4 Thử nghiệm
// tần số xong sớm 30 ngày". Áp cho mọi mã người không nhớ: WBS (6.1.4), hồ sơ /
// thủ tục (K-09, #58), issue (ISS-…), quy tắc (P04, D06, T12), thầu phụ
// (TP-HV-03)… Số hiệu văn bản/hợp đồng/phiếu giá (1315/QĐ-UBND, HD-548) tự nó
// là tên — giữ nguyên.
//
// Hai lớp:
//   ① LUAT_MA_KEM_TEN — câu dặn nhét vào MỌI prompt sinh chữ cho người đọc.
//   ② ganTenChoMa     — LƯỚI AN TOÀN bằng CODE (LLM có thể quên): chạy trên chữ
//      LLM trả về TRƯỚC khi hiển thị / gửi Telegram / lưu. Chỉ nhận đúng mã CÓ
//      TRONG TỪ ĐIỂN của dự án — không đoán, nên "2.000", "04.06", "100.0%",
//      "3.181.440.000", "v1.2" không bao giờ bị đụng.
//
// File THUẦN (luật 10) — không node:fs, client import được. Các HÀM giống hệt ở
// 4-agent-main · 5-Agent-tien-do · 7-Agent-nghiem-thu (sửa một chỗ thì chép cả ba; câu LUAT_MA_KEM_TEN của
// Tiến độ / Nghiệm thu dài hơn — có đoạn khoảng ngày; Nghiệm thu nhận thêm mã BOQ). 1-agent-base đã tắt, đóng băng.
// ============================================================

/** Câu luật dùng chung — nối vào cuối system prompt của mọi lượt LLM viết chữ cho người đọc */
export const LUAT_MA_KEM_TEN =
  "⛔ LUẬT MÃ KÈM TÊN (bắt buộc): KHÔNG BAO GIỜ viết một mã trơn cho người đọc. Mã WBS (6.1.4), " +
  "mã hồ sơ/thủ tục (K-09, #58), mã issue (ISS-…), mã quy tắc (P04, D06, T12), mã thầu phụ (TP-HV-03)… " +
  "phải viết theo khuôn \"<mã> <tên ngắn>\" (vd \"9.6.4 Thử nghiệm tần số\", \"P04 Móng xong trước dựng cột\") " +
  "hoặc chỉ viết tên. Tên lấy đúng từ dữ liệu được đưa; tên dài thì rút còn ≤ 8 chữ, không đổi nghĩa. " +
  "Không biết tên của mã thì đừng nêu mã đó. Số hiệu văn bản/hợp đồng/phiếu giá (1315/QĐ-UBND, HD-548, " +
  "PG-548.02) tự nó là tên — giữ nguyên, có tên ngắn thì kèm càng tốt.";

/** Từ điển mã → tên đầy đủ (tên sẽ được rút gọn lúc chèn) */
export type TuDienMa = ReadonlyMap<string, string>;

/** Số chữ tối đa của tên ngắn; tên dài hơn một chút (≤ TRAN_CHU_DUNG) thì giữ nguyên cho khỏi cụt nghĩa */
const TOI_DA_CHU = 8;
const TRAN_CHU_DUNG = 10;

/**
 * Mã trông giống mã (dùng khi quét dữ liệu công cụ tìm cặp mã–tên):
 *   WBS "6.1.4" (≥ 2 cấp) · "#58" · chữ hoa + số "P04", "K-09", "TP-HV-03", "ISS-PL-0115"
 * Mã một cấp ("6") KHÔNG nhận — số trơn nằm khắp nơi trong câu.
 */
export function laMaHopLe(s: string): boolean {
  const m = s.trim();
  if (m.length < 2 || m.length > 32 || /\s/.test(m)) return false;
  if (/^\d+(\.\d+)+$/.test(m)) return true;
  if (/^#\d{1,5}$/.test(m)) return true;
  return /^[A-ZĐ]{1,6}(-?[A-Z0-9]{1,8}){0,5}$/.test(m) && /\d/.test(m);
}

/**
 * Rút tên dài còn ≤ 8 chữ, không đổi nghĩa:
 *   bỏ phần trong ngoặc → lấy vế đầu trước dấu ". ; :" nếu vế đó có ≥ 2 chữ →
 *   còn dài quá 10 chữ thì cắt 8 chữ + "…".
 */
export function rutGonTen(ten: string, toiDa = TOI_DA_CHU): string {
  let s = ten.replace(/\s+/g, " ").trim();
  // ⭐ 26/10 — bỏ ngoặc LỒNG NHAU từ trong ra ngoài: «[Điện gió HV (HV — test)] Xử lý…» trước đây còn sót «] Xử lý…»
  let boNgoac = s;
  for (let i = 0; i < 5; i++) {
    const moi = boNgoac.replace(/\s*\([^()]*\)|\s*\[[^[\]]*\]/g, "");
    if (moi === boNgoac) break;
    boNgoac = moi;
  }
  boNgoac = boNgoac.trim();
  if (boNgoac !== "") s = boNgoac;
  const ve = s.split(/[.;:](?=\s)/)[0]?.trim() ?? s;
  if (ve !== s && ve.split(" ").length >= 2) s = ve;
  s = s.replace(/^(?:\s|⛓|🔴|🟡|🟢|•|-|–|—|·|\uFE0F)+/, "").replace(/[\s,;:.\-–—·]+$/, "").trim();
  const chu = s.split(" ");
  if (chu.length <= Math.max(toiDa, TRAN_CHU_DUNG)) return s;
  return `${chu.slice(0, toiDa).join(" ").replace(/[,;:.]+$/, "")}…`;
}

/** Dựng từ điển từ các cặp [mã, tên] — bỏ mã không hợp lệ, tên rỗng, tên trùng chính mã */
export function taoTuDien(cap: Iterable<readonly unknown[]>): Map<string, string> {
  const ra = new Map<string, string>();
  for (const [ma, ten] of Array.from(cap)) {
    if (typeof ma !== "string" || typeof ten !== "string") continue;
    const m = ma.trim();
    // Giữ TÊN GỐC (kiểm độc lập 26/10 AI-02): phần «sau mã» chỉ tính lúc chèn — xem tenSauMa
    const t = ten.replace(/\s+/g, " ").trim();
    if (!laMaHopLe(m) || t === "" || t === m) continue;
    if (!ra.has(m)) ra.set(m, t);
  }
  return ra;
}

/** Gộp nhiều từ điển — cái đứng TRƯỚC thắng khi trùng mã */
export function gopTuDien(...ds: (TuDienMa | null | undefined)[]): Map<string, string> {
  const ra = new Map<string, string>();
  for (const d of ds) {
    if (!d) continue;
    d.forEach((ten, ma) => {
      if (!ra.has(ma)) ra.set(ma, ten);
    });
  }
  return ra;
}

const KHOA_MA = ["wbs", "ma_wbs", "maWbs", "wbsCode", "ma", "ma_ho_so", "maHoSo", "ma_quy_tac", "maQuyTac", "ma_thau_phu", "id", "code"];
const KHOA_TEN = ["ten_gon", "name", "ten", "ten_viec", "tenViec", "ten_ho_so", "tenHoSo", "tieu_de", "tieuDe", "title", "moTa", "mo_ta"];

/**
 * Quét dữ liệu công cụ (JSON bất kỳ) tìm cặp mã–tên — mọi object có một khoá mã
 * (wbs/ma/id…) mang giá trị trông như mã VÀ một khoá tên (name/ten/tieu_de…).
 * Dùng cho trợ lý chat: agent trả `{wbs:"6.1.4", name:"…"}` thì câu trả lời
 * nhắc "6.1.4" được ghép đúng tên agent đã trả, không phải tra thêm.
 */
export function tuDienTuDuLieu(duLieu: unknown, gioiHanNut = 20_000): Map<string, string> {
  const cap: [string, string][] = [];
  let dem = 0;
  const di = (x: unknown, sau: number): void => {
    if (dem++ > gioiHanNut || sau > 12 || x === null || typeof x !== "object") return;
    if (Array.isArray(x)) {
      for (const y of x) di(y, sau + 1);
      return;
    }
    const o = x as Record<string, unknown>;
    const khoaMa = KHOA_MA.find((k) => typeof o[k] === "string" && laMaHopLe(o[k] as string));
    const ma = khoaMa ? (o[khoaMa] as string) : undefined;
    // 27/10 (đợt 3 Main, NT-05): dòng cảnh báo có cả «wbs» lẫn «tieu_de» — tiêu đề / mô tả KHÔNG phải tên việc WBS
    // (trước ra «7.2.3.4 Năng suất thấp — Turbine số 04 Turbine 04»). Mã WBS chỉ ghép với tên thật.
    const laWbs = khoaMa === "wbs" || khoaMa === "ma_wbs" || khoaMa === "maWbs" || khoaMa === "wbsCode";
    const ten = KHOA_TEN.filter((k) => !laWbs || !KHOA_MO_TA.has(k))
      .map((k) => o[k])
      .find((v) => typeof v === "string" && v.trim() !== "");
    if (typeof ma === "string" && typeof ten === "string") cap.push([ma, ten]);
    for (const v of Object.values(o)) if (v !== null && typeof v === "object") di(v, sau + 1);
  };
  di(duLieu, 0);
  return taoTuDien(cap);
}

// ─────────────────────────────────────────────────────────────
// Lưới an toàn
// ─────────────────────────────────────────────────────────────

/** Khoá chữ MÔ TẢ (tiêu đề, mô tả) — không dùng làm tên cho mã WBS */
const KHOA_MO_TA = new Set(["tieu_de", "tieuDe", "title", "moTa", "mo_ta"]);

/**
 * 27/10 (đợt 3 Main, TD-01): HAI chữ ngay sau mã nằm LIỀN NHAU trong tên đầy đủ → AI đã viết tên ngắn, không chèn
 * («6.1 Cung cấp turbine», tên «Hợp đồng cung cấp turbine» → trước ra «6.1 Hợp đồng cung cấp turbine Cung cấp turbine»).
 * Một chữ lẻ không tính (luật kiểm độc lập AI-03).
 */
function haiChuSauNamTrongTen(sau: string, ten: string): boolean {
  const a = chuanSo(sau).slice(0, 2);
  if (a.length < 2 || a.some((w) => w.length < 2 || /^[0-9]+$/.test(w))) return false;
  return ` ${chuanSo(ten).join(" ")} `.includes(` ${a.join(" ")} `);
}

/** Chữ thường, bỏ dấu, chỉ giữ chữ + số — để so "đã có tên liền kề chưa" */
function chuanSo(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w !== "");
}

/** Các chữ có nghĩa của tên ngắn (bỏ chữ 1 ký tự, bỏ số trơn) */
function chuTen(ten: string): string[] {
  return chuanSo(rutGonTen(ten)).filter((w) => w.length >= 2 && !/^\d+$/.test(w));
}

/**
 * Tên đã đứng liền kề mã chưa:
 *   · SAU mã — 2 chữ đầu của tên nằm trong ~6 chữ ngay sau mã ("9.6.4 Thử nghiệm…", "9.6.4 — thu nghiem…")
 *   · TRƯỚC mã — 2 chữ CUỐI của tên nằm trong 3 chữ ngay trước mã ("Thử nghiệm tần số (9.6.4)")
 * Cửa sổ trước cố ý hẹp: lần nhắc thứ hai "…tần số trễ; dời 9.6.4" KHÔNG được tính là đã có tên.
 */
function daCoTenMot(ten: string, truoc: string, sau: string): boolean {
  const c = chuTen(ten);
  if (c.length === 0) return true; // tên toàn ký hiệu — không chèn được gì có nghĩa
  const can = Math.min(2, c.length);
  const dau = c.slice(0, 3);
  const cuoi = c.slice(-can);
  const sauMa = chuanSo(sau).slice(0, 6);
  const truocMa = chuanSo(truoc).slice(-3);
  // ⭐ 26/10 — AI viết tắt «1.1.9 TKCS»: chữ VIẾT TẮT IN HOA (≥ 3 ký tự) ngay sau mã trùng chữ đầu của tên là đã có tên.
  // Chỉ chữ viết tắt (kiểm độc lập AI-03: 90% tên WBS HV chung chữ đầu thường như «Turbine», «Xử lý»)
  const chuDauSau = (sau.match(/^[\s:—–\-·(]*([^\s,.;:()]+)/) ?? [])[1] ?? "";
  if (/^[A-ZĐ]{3,}$/.test(chuDauSau) && sauMa[0] === c[0]) return true;
  return dau.filter((w) => sauMa.includes(w)).length >= can || cuoi.every((w) => truocMa.includes(w));
}

/** Tên đã liền kề mã chưa — so cả tên gốc lẫn phần sau mã («Xử lý 6.1.4 — Cung cấp Hub» ↔ «Cung cấp Hub») */
function daCoTen(ma: string, ten: string, truoc: string, sau: string): boolean {
  const sauMa = tenSauMa(ma, ten);
  return daCoTenMot(ten, truoc, sau) || (sauMa !== null && sauMa !== ten && daCoTenMot(sauMa, truoc, sau));
}

/**
 * Tên chứa chính mã (kiểm độc lập 26/10 AI-01): mã đứng ĐẦU tên hoặc sau ≤ 3 chữ («Xử lý 6.1.4 — Cung cấp Hub»,
 * «Hạng mục 6.1.4») → trả phần SAU mã; phần sau < 2 chữ thì trả "" (tên không thêm gì ngoài mã). Mã nằm sâu trong
 * câu hoặc không có (có biên số: «16.1» không khớp mã 6.1) → null (dùng tên gốc).
 */
function tenSauMa(ma: string, ten: string): string | null {
  const m = ten.match(new RegExp(`^((?:\\S+\\s+){0,3}?)(?<![\\d.])${thoatRegex(ma)}(?![\\d.]\\d)(.*)$`));
  if (!m) return null;
  const sau = m[2]!.replace(/^[\s:—–\-·.,]+/, "").trim();
  return sau.split(" ").filter(Boolean).length >= 2 ? sau : "";
}

/**
 * 27/10/2026 (Main đợt 2, VN-06): chữ ngay sau mã là TÊN NGẮN đã nằm trong tên đầy đủ («NT-03 ENC», tên «Công ty Cổ phần ENC»)
 * → đã có tên, không chèn (trước đây ra «NT-03 Công ty Cổ phần ENC ENC»). Chỉ xét chữ ≥ 3 ký tự, so không dấu.
 */
function tuDauSauNamTrongTen(sau: string, ten: string): boolean {
  const bo = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  const tu = sau.replace(/^[\s*_(]+/, "").match(new RegExp(`^[${LOP_CHU}]{3,}`))?.[0];
  // Chỉ chữ viết tắt IN HOA (ENC, EVN, PMC) — một chữ thường trùng tên không tính (kiểm độc lập AI-03)
  if (!tu || !/^[A-Z0-9Đ]{3,}$/.test(tu)) return false;
  return bo(ten).split(/[^a-z0-9]+/).includes(bo(tu));
}

/** Sau mã là đơn vị / phần trăm → đó là SỐ, không phải mã (kiểm độc lập AI-04: «tăng 4.6%», «chậm 6.1 ngày») */
const SAU_LA_SO = /^\s*(?:%|ngày|tháng|năm|giờ|tỷ|triệu|nghìn|đồng|m2|m3|m²|m³|m\b|km|kg|tấn|MW|kW|kV|MWh|kWh|lần|người)/i;

/** Lớp "chữ hoặc số" (Latin + tiếng Việt) — viết tay thay \p{L}\p{N} vì tsconfig nhắm ES5 (không có cờ u) */
export const LOP_CHU = "A-Za-z0-9_\u00C0-\u024F\u1E00-\u1EFF";

function thoatRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Mã nằm trong một đường link / tham số (…?wbs=6.1.4, /detail/6.1.4) thì không đụng */
function trongLienKet(text: string, batDau: number): boolean {
  const dauToken = Math.max(text.lastIndexOf(" ", batDau - 1), text.lastIndexOf("\n", batDau - 1)) + 1;
  const token = text.slice(dauToken, batDau);
  return /https?:|\/\/|[=/?&]$|[=?&]/.test(token);
}

/**
 * ⭐ LƯỚI AN TOÀN "MÃ KÈM TÊN".
 * Tìm mọi mã CÓ TRONG `tuDien` đứng trơn (ngay sau / ngay trước không có tên)
 * rồi chèn tên ngắn ngay sau mã: "9.6.4" → "9.6.4 Thử nghiệm tần số".
 *   · Chỉ khớp NGUYÊN mã: "6.1.4" không khớp trong "6.1.4.2", "16.1.4", "v6.1.4",
 *     "3.181.440.000"; mã cuối câu "…6.1.4." vẫn khớp.
 *   · Mã đã có tên liền kề (trước hoặc sau, so 2 chữ đầu tên, không phân biệt dấu) → để yên.
 *   · Mã trong link/tham số → để yên.
 * Không bao giờ ném lỗi; từ điển rỗng → trả nguyên chữ.
 */
export function ganTenChoMa(
  text: string,
  tuDien: TuDienMa | null | undefined,
  /** choFile: chữ là nội dung file (JSON/HTML/CSV) — tên chèn vào bỏ ký tự " ' \\ < > & | cho khỏi vỡ khuôn */
  tuyChon?: { choFile?: boolean },
): string {
  if (!text || !tuDien || tuDien.size === 0) return text;
  try {
    const ma = Array.from(tuDien.keys())
      .filter((m) => m.trim() !== "")
      .sort((a, b) => b.length - a.length)
      .map(thoatRegex);
    if (ma.length === 0) return text;
    const re = new RegExp(
      `(?<![${LOP_CHU}#]|[${LOP_CHU}][.,/\-])(?:${ma.join("|")})(?![${LOP_CHU}]|[.,/\-][${LOP_CHU}])`,
      "g",
    );
    return text.replace(re, (khop: string, viTri: number) => {
      const ten = tuDien.get(khop);
      if (!ten) return khop;
      if (trongLienKet(text, viTri)) return khop;
      const truoc = text.slice(Math.max(0, viTri - 80), viTri);
      const sau = text.slice(viTri + khop.length, viTri + khop.length + 80);
      if (SAU_LA_SO.test(sau)) return khop;
      if (daCoTen(khop, ten, truoc, sau)) return khop;
      if (tuDauSauNamTrongTen(sau, ten)) return khop;
      if (haiChuSauNamTrongTen(sau, ten)) return khop;
      const sauMaTen = tenSauMa(khop, ten);
      if (sauMaTen === "") return khop; // «Hạng mục 6.1.4» — chèn vào chỉ lặp mã
      const ngan = rutGonTen(sauMaTen ?? ten);
      return `${khop} ${tuyChon?.choFile ? ngan.replace(/["'\\<>&|]/g, "") : ngan}`;
    });
  } catch {
    return text;
  }
}

/** Khoá mang MÃ (dữ liệu máy đọc) — lưới không đụng, kẻo "wbs":"6.1.4" thành "6.1.4 Tên…" */
const KHOA_KHONG_DUNG = new Set([...KHOA_MA, "predWbs", "wbsCha", "maDuAn", "ma_du_an", "projectId", "cau", "han", "ngay"]);

/**
 * Chạy lưới trên MỌI chuỗi chữ trong một kết quả LLM đã bóc (object/mảng JSON):
 * bỏ qua khoá mang mã (wbs, ma, id…) và chuỗi chỉ gồm đúng một mã.
 * Trả bản sao mới, không sửa tại chỗ.
 */
export function ganTenTrongDuLieu<T>(x: T, tuDien: TuDienMa | null | undefined, sau = 0): T {
  if (!tuDien || tuDien.size === 0 || sau > 10) return x;
  if (typeof x === "string") return (laMaHopLe(x) ? x : ganTenChoMa(x, tuDien)) as unknown as T;
  if (Array.isArray(x)) return x.map((y) => ganTenTrongDuLieu(y, tuDien, sau + 1)) as unknown as T;
  if (x !== null && typeof x === "object") {
    const ra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
      ra[k] = KHOA_KHONG_DUNG.has(k) ? v : ganTenTrongDuLieu(v, tuDien, sau + 1);
    }
    return ra as T;
  }
  return x;
}
