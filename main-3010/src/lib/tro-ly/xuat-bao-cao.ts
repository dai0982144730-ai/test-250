/**
 * Xuất báo cáo HTML/DOCX/XLSX bằng lệnh tự nhiên trong câu hỏi (chế độ "theo-file").
 *
 * Không có nút UI riêng — hệ thống tự phát hiện ý định + định dạng từ câu hỏi
 * (regex, không dùng tool_use, để hoạt động giống nhau ở cả 2 provider). Khi
 * phát hiện, đổi system prompt để AI trả lời theo đúng cấu trúc (bọc trong 1
 * marker duy nhất), sau đó parse + build file thật trong bộ nhớ, gửi base64
 * qua sự kiện NDJSON có sẵn cho client tự tải về — KHÔNG lưu file trên đĩa
 * server (tránh file rác + rủi ro số liệu kinh doanh nhạy cảm tồn trên server).
 *
 * DOCX dùng schema block-based (Heading/Paragraph/Table/PageBreak) — học theo
 * mô hình dữ liệu của D:\...\Taowordexcel\core\models.py (WordDoc/Heading/
 * Paragraph/Table), AN TOÀN hơn nhiều so với việc để AI trả Markdown rồi tự
 * viết parser: mỗi loại block map thẳng 1-1 sang API của thư viện `docx`.
 */

import { docSoMay } from "@/lib/chung/doc-so";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, PageBreak as DocxPageBreak, WidthType,
} from "docx";
import ExcelJS from "exceljs";
import PptxGenJS from "pptxgenjs";
import { LUAT_MA_KEM_TEN } from "@/lib/chung/ma-kem-ten";
import { LUAT_NHANH_CHAM_THEO_NGAY } from "@/lib/chung/luat-nhanh-cham";

export type DinhDangXuat =
  | "html" | "docx" | "xlsx" | "pdf"
  | "pptx" | "kml" | "dxf" | "md" | "svg" | "mmd" | "dot";

export const DANH_SACH_DINH_DANG: DinhDangXuat[] = [
  "html", "docx", "xlsx", "pdf", "pptx", "kml", "dxf", "md", "svg", "mmd", "dot",
];

/**
 * Định dạng lưu bằng chữ thuần (không nén/nhị phân). Dùng khi cần đọc ngược nội
 * dung file đã lưu từ base64 để nạp vào ngữ cảnh cho AI sửa.
 */
export const DINH_DANG_CHU: string[] = ["html", "kml", "dxf", "md", "svg", "mmd", "dot"];

const RE_Y_DINH_XUAT = /xu[aấ]t\s*(ra|file|báo cáo|thành)?|t[aạ]o\s*(ra\s*)?(file|báo\s*cáo|sơ\s*đồ|slide|bài|bảng|bản\s*vẽ)|làm\s*(báo\s*cáo|slide|sơ\s*đồ|bài)|vẽ\s*(sơ\s*đồ|biểu\s*đồ|mặt\s*bằng|ranh\s*giới)/i;

// Thứ tự trong mảng = thứ tự thử khớp. Đặt các mẫu DÀI/ĐẶC TRƯNG trước để
// "google earth" không bị "html" hay "doc" cướp mất.
const MAU_DINH_DANG: { dd: DinhDangXuat; re: RegExp }[] = [
  { dd: "pptx", re: /\b(powerpoint|pptx?|slide|thuyết\s*trình|bài\s*giảng|pitch\s*deck)\b/i },
  { dd: "kml", re: /\b(kmz?|google\s*earth)\b|toạ\s*độ|tọa\s*độ|ranh\s*giới\s*(dự\s*án|thửa)/i },
  { dd: "dxf", re: /\b(dxf|autocad|cad)\b|bản\s*vẽ\s*kỹ\s*thuật/i },
  { dd: "mmd", re: /\b(mermaid|mmd)\b/i },
  { dd: "dot", re: /\b(graphviz|dot|gv)\b/i },
  { dd: "svg", re: /\bsvg\b|hình\s*vector/i },
  { dd: "md", re: /\b(markdown|md)\b/i },
  { dd: "html", re: /\bhtml?\b/i },
  { dd: "docx", re: /\b(word|docx?|doc)\b/i },
  { dd: "xlsx", re: /\b(excel|xlsx?|xls|bảng\s*tính)\b/i },
  { dd: "pdf", re: /\bpdf\b/i },
];

/**
 * Trả về định dạng đầu tiên tìm thấy theo thứ tự xuất hiện trong câu, hoặc
 * undefined nếu không phát hiện ý định xuất file. Chỉ xử lý 1 định dạng/lượt
 * — nếu người dùng gõ nhiều định dạng ("HTML/Word/Excel"), lấy định dạng ĐẦU
 * TIÊN xuất hiện trong câu (đơn giản, dễ đoán hành vi). Xuất đồng thời nhiều
 * định dạng để dành làm sau nếu cần, chưa làm ở bản này.
 *
 * Khi 2 định dạng khớp cùng một vị trí (vd "google earth" vừa khớp kml vừa
 * khớp… không có), giữ thứ tự ưu tiên khai báo trong MAU_DINH_DANG.
 */
export function phatHienYDinhXuat(hoi: string): DinhDangXuat | undefined {
  if (!RE_Y_DINH_XUAT.test(hoi)) return undefined;
  const viTri: { dd: DinhDangXuat; i: number; uuTien: number }[] = [];
  MAU_DINH_DANG.forEach(({ dd, re }, uuTien) => {
    const m = hoi.match(re);
    if (m) viTri.push({ dd, i: m.index!, uuTien });
  });
  if (viTri.length === 0) return undefined;
  viTri.sort((a, b) => a.i - b.i || a.uuTien - b.uuTien);
  return viTri[0].dd;
}

const MARKER_MO = (dd: DinhDangXuat) => `@@@XUAT_BAOCAO:${dd}@@@`;
const MARKER_DONG = "@@@HET_XUAT_BAOCAO@@@";

export const MARKER_KE_HOACH_MO = "@@@KE_HOACH@@@";
export const MARKER_KE_HOACH_DONG = "@@@HET_KE_HOACH@@@";

export const MARKER_TIEU_DE_MO = "@@@TIEU_DE@@@";
export const MARKER_TIEU_DE_DONG = "@@@HET_TIEU_DE@@@";

/**
 * Tách phần "kế hoạch" (AI tự viết ra nó định làm gì) khỏi phần nội dung file.
 *
 * Vì sao cần: ở chế độ --print, Claude Code CLI KHÔNG phát khối "thinking" ra
 * luồng stream-json (đã kiểm chứng: bật --effort high vẫn chỉ có type "text"),
 * nên không có cách nào lấy suy nghĩ nội tại của model để hiện lên giao diện.
 * Giải pháp: bảo model tự viết kế hoạch thành văn bản trong 1 khối riêng —
 * chạy được ở CẢ Claude Pro lẫn API key, và đúng thứ người dùng muốn thấy.
 */
export function tachKeHoach(traLoi: string): { keHoach?: string; conLai: string } {
  const re = new RegExp(`${MARKER_KE_HOACH_MO}([\\s\\S]*?)${MARKER_KE_HOACH_DONG}`);
  const m = traLoi.match(re);
  if (!m) return { conLai: traLoi };
  return { keHoach: m[1].trim() || undefined, conLai: traLoi.replace(re, "").trim() };
}

/**
 * Tách khối "tiêu đề" (tóm lược ngắn AI tự viết, dùng để đặt tên file tải về)
 * khỏi phần còn lại của câu trả lời.
 */
export function tachTieuDe(traLoi: string): { tieuDe?: string; conLai: string } {
  const re = new RegExp(`${MARKER_TIEU_DE_MO}([\\s\\S]*?)${MARKER_TIEU_DE_DONG}`);
  const m = traLoi.match(re);
  if (!m) return { conLai: traLoi };
  return { tieuDe: m[1].trim() || undefined, conLai: traLoi.replace(re, "").trim() };
}

/** Bỏ ký tự cấm trong tên file Windows/macOS, gộp khoảng trắng/xuống dòng thừa. */
export function sachTenFile(s: string): string {
  return s
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ngày hiện tại theo giờ Việt Nam, dạng dd-mm-yy. */
export function ngayVN(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "2-digit",
  }).formatToParts(new Date());
  const lay = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${lay("day")}-${lay("month")}-${lay("year")}`;
}

/**
 * Tên file (KHÔNG kèm đuôi — nơi gọi tự nối ".ext") theo cấu trúc
 * "tóm lược nội dung-dd-mm-yy", tổng độ dài kể cả đuôi không quá 100 ký tự.
 * Không có tiêu đề hợp lệ (AI quên viết) thì lùi về "Báo cáo-dd-mm-yy".
 */
export function tenFileBaoCao(tieuDeRaw: string | undefined, ext: string): string {
  const duoiNgay = `-${ngayVN()}`;
  const gioiHan = 100 - duoiNgay.length - 1 - ext.length; // trừ dấu chấm trước đuôi file
  let tieu = tieuDeRaw ? sachTenFile(tieuDeRaw) : "";
  if (!tieu) tieu = "Báo cáo";
  if (tieu.length > gioiHan) tieu = tieu.slice(0, Math.max(1, gioiHan)).trim();
  return `${tieu}${duoiNgay}`;
}

/**
 * System prompt CHUYÊN DỤNG cho lượt xuất báo cáo — cố ý KHÔNG nối phong cách
 * trợ lý pháp lý gốc vào. Phong cách gốc yêu cầu "trích lục nguyên văn, dẫn
 * Điều/Khoản, giải thích căn cứ", mâu thuẫn trực tiếp với "chỉ trả về đúng 1
 * khối JSON/HTML, không viết gì khác" — quan sát thực tế khi còn nối chung:
 * model trả văn xuôi phân tích (docx), bảng Markdown (xlsx), thậm chí code
 * Python reportlab (pdf) thay vì cấu trúc yêu cầu. Bỏ phần mâu thuẫn đi thì
 * model tuân thủ đúng.
 */
/**
 * Yêu cầu này có đáng dừng lại cho người dùng duyệt kế hoạch trước không?
 *
 * Báo cáo đơn giản ("xuất đoạn này ra HTML") thì hỏi duyệt chỉ tổ phiền và
 * thêm 1 lượt chờ. Báo cáo phức tạp (nhiều phần, có tab/biểu đồ, bảng tính có
 * công thức) thì ngược lại: làm sai phải làm lại cả lượt dài, duyệt trước rẻ
 * hơn nhiều. Dùng dấu hiệu đếm được trên chính câu hỏi thay vì gọi thêm 1 lượt
 * AI để phân loại — nhanh, không tốn token, và giải thích được vì sao.
 */
export function canDuyetKeHoach(hoi: string, dinhDang: DinhDangXuat): boolean {
  // Sơ đồ và ghi chú làm rất nhanh, sai thì bảo sửa lại là xong — dừng hỏi duyệt
  // chỉ tổ thêm một lượt chờ mà chẳng tiết kiệm được gì.
  if (dinhDang === "mmd" || dinhDang === "dot" || dinhDang === "svg" || dinhDang === "md") return false;

  const s = hoi.toLowerCase();
  let diem = 0;

  // Mỗi thành phần trình bày là một chỗ dễ hiểu sai ý — cộng dồn, vì yêu cầu
  // "có tab, có bảng, có biểu đồ" khó hơn hẳn yêu cầu chỉ có một trong số đó.
  if (/\btabs?\b|thẻ\s*tab/.test(s)) diem += 2;
  if (/biểu\s*đồ|đồ\s*thị|chart|graph/.test(s)) diem += 2;
  if (/dashboard|infographic|trực\s*quan/.test(s)) diem += 2;
  if (/bảng\s*(biểu|số\s*liệu)|nhiều\s*bảng/.test(s)) diem += 1;
  // Yêu cầu phân tích/tổng hợp, không chỉ chép lại dữ liệu.
  if (/phân\s*tích|so\s*sánh|tổng\s*hợp|đánh\s*giá|nhận\s*xét|kiến\s*nghị|rủi\s*ro/.test(s)) diem += 2;
  // Có cấu trúc nhiều mục do người dùng chỉ định sẵn.
  if (/\b(i{1,3}|iv|v)\.\s|\b\d\.\s|\bphần\s*\d|\bmục\s*\d/.test(s)) diem += 1;
  // Bảng tính nhiều sheet / có công thức liên kết.
  if (/công\s*thức|liên\s*kết|nhiều\s*sheet|tham\s*chiếu|tính\s*toán/.test(s)) diem += 2;
  // Yêu cầu dài thường kèm nhiều ràng buộc.
  if (hoi.length > 150) diem += 1;
  if (hoi.length > 300) diem += 1;
  // XLSX vốn khó nhất: sai công thức là hỏng cả bảng tính. PPTX/DXF/KML cũng
  // tốn công dựng lại nếu hiểu sai ý (bố cục slide, toạ độ, kích thước bản vẽ).
  if (dinhDang === "xlsx" || dinhDang === "pptx" || dinhDang === "dxf" || dinhDang === "kml") diem += 1;

  return diem >= 3;
}

/**
 * Prompt cho bước "chỉ lập kế hoạch, chưa làm" — kiểu Gemini Deep Research:
 * AI trình bày sẽ làm gì, người dùng sửa/duyệt rồi mới cho chạy thật. Tốn rất
 * ít token (kế hoạch chỉ vài dòng) nhưng tránh được cả một lượt tạo file sai ý.
 */
export function heThongPromptKeHoach(dinhDang: DinhDangXuat): string {
  return `Bạn là bộ sinh file báo cáo của hệ thống BQLDA SCI. Người dùng muốn xuất báo cáo định
dạng ${dinhDang.toUpperCase()}.

Ở lượt này bạn CHƯA tạo file. Nhiệm vụ DUY NHẤT: đọc dữ liệu và yêu cầu, rồi trình bày KẾ HOẠCH sẽ
làm để người dùng duyệt hoặc sửa.

CHỈ trả về đúng khối sau, không viết gì thêm trước hay sau:
${MARKER_KE_HOACH_MO}
- Dữ liệu sử dụng: ... (nêu rõ lấy số liệu gì, từ tài liệu nào)
- Bố cục báo cáo: ... (liệt kê các phần chính theo thứ tự)
- Bảng/biểu: ... (dựng bảng gì, có những cột nào${dinhDang === "xlsx" ? ", công thức tính gì" : ""})
- Trình bày: ... (${
    dinhDang === "xlsx" ? "cách bố trí sheet"
      : dinhDang === "pptx" ? "số slide, mỗi slide trình bày gì"
      : dinhDang === "kml" ? "những đối tượng địa lý nào, lấy toạ độ từ đâu"
      : dinhDang === "dxf" ? "vẽ hình gì, kích thước lấy từ đâu, đơn vị nào"
      : "phong cách, màu sắc, có tab hay không"
  })
- Lưu ý: ... (dữ liệu nào còn thiếu và sẽ xử lý ra sao)
${MARKER_KE_HOACH_DONG}

QUY TẮC:
- Viết tiếng Việt, mỗi gạch đầu dòng 1 câu ngắn gọn, cụ thể — người dùng phải hình dung được sản phẩm.
- Chỉ nêu việc sẽ làm; TUYỆT ĐỐI KHÔNG viết nội dung file, không viết HTML/JSON/code.
- Bám sát dữ liệu thật đã cung cấp; thiếu thì nói rõ là thiếu, KHÔNG bịa.
- ${LUAT_MA_KEM_TEN}
- ${LUAT_NHANH_CHAM_THEO_NGAY}`;
}

export function heThongPromptXuat(
  dinhDang: DinhDangXuat,
  _phongCachGoc: string,
  /** Kế hoạch người dùng đã duyệt/sửa — có thì bám theo, không tự lập lại. */
  keHoachDaDuyet?: string,
  /**
   * Mô tả phong cách trình bày bóc từ file mẫu người dùng kẹp vào (cùng định
   * dạng đang xuất) — xem lib/hoc-phong-cach.ts. Có thì AI phải làm theo khuôn
   * đó thay vì tự chọn màu/font/bố cục.
   */
  moTaPhongCachMau?: string
): string {
  const phanKeHoach = keHoachDaDuyet
    ? `KẾ HOẠCH ĐÃ ĐƯỢC NGƯỜI DÙNG DUYỆT — BẮT BUỘC LÀM ĐÚNG THEO, không tự đổi ý:
${keHoachDaDuyet}

Không cần xuất lại khối kế hoạch. Xuất thẳng khối nội dung file theo mẫu bên dưới.`
    : `TRƯỚC khi viết nội dung file, hãy nêu ngắn gọn kế hoạch của bạn trong khối sau (để người dùng thấy
bạn định làm gì) — 3 đến 6 gạch đầu dòng, mỗi dòng một việc, viết bằng tiếng Việt:
${MARKER_KE_HOACH_MO}
- Đọc dữ liệu: ... (nêu rõ lấy số liệu gì, từ đâu)
- Bố cục báo cáo: ... (các phần chính sẽ có)
- Bảng/biểu: ... (dựng bảng gì, cột nào)
- Lưu ý: ... (chỗ nào thiếu dữ liệu, xử lý ra sao)
${MARKER_KE_HOACH_DONG}
NGAY SAU khối kế hoạch, xuất khối nội dung file theo đúng mẫu bên dưới.`;

  // Khuôn mẫu trình bày đặt NGAY SAU phần mở đầu và TRƯỚC các quy tắc định dạng
  // — model bám theo hướng dẫn xuất hiện sớm tốt hơn, mà vẫn không lấn át được
  // các quy tắc cấu trúc bắt buộc (vốn quyết định file có dựng được hay không).
  const phanPhongCach = moTaPhongCachMau
    ? `\n═══ KHUÔN MẪU TRÌNH BÀY BẮT BUỘC LÀM THEO ═══
${moTaPhongCachMau}
═══ HẾT KHUÔN MẪU ═══

Nhắc lại cho rõ: lấy HÌNH THỨC (màu, font, cỡ chữ, bố cục, kiểu bảng) của khuôn mẫu trên, còn NỘI
DUNG thì hoàn toàn mới theo yêu cầu của người dùng. Nếu khuôn mẫu và quy tắc cấu trúc bên dưới mâu
thuẫn nhau, ưu tiên quy tắc cấu trúc (vì sai cấu trúc thì hệ thống không dựng được file).\n`
    : "";

  const phanTieuDe = `TRƯỚC TIÊN, luôn viết đúng 1 khối TIÊU ĐỀ — dùng để hệ thống đặt tên file tải về
(khác với tiêu đề hiển thị bên trong nội dung báo cáo):
${MARKER_TIEU_DE_MO}
Tóm lược yêu cầu của người dùng, tối đa 60 ký tự, tiếng Việt có dấu, viết hoa chữ cái đầu. TUYỆT ĐỐI
KHÔNG chứa các ký tự / \\ : * ? " < > | và KHÔNG tự kèm ngày tháng hay đuôi file (hệ thống tự thêm).
${MARKER_TIEU_DE_DONG}
`;

  const chung = `Bạn là bộ sinh file báo cáo của hệ thống BQLDA SCI. Nhiệm vụ DUY NHẤT của bạn ở
lượt này: đọc nội dung người dùng cung cấp và trả về ĐÚNG 1 khối dữ liệu theo định dạng quy định
bên dưới. Hệ thống sẽ tự dựng khối đó thành file thật cho người dùng tải về.
${phanTieuDe}${phanPhongCach}
${phanKeHoach}

QUY TẮC TUYỆT ĐỐI:
1. Ngoài các khối trên (tiêu đề + kế hoạch + nội dung file), KHÔNG viết thêm gì khác: không lời dẫn,
   không giải thích, không hỏi lại, không đề xuất phương án thay thế.
2. KHÔNG viết code bằng ngôn ngữ lập trình nào khác (Python, JavaScript, thư viện reportlab/docx/
   openpyxl…). Bạn KHÔNG tạo file — bạn chỉ trả dữ liệu, hệ thống mới tạo file.
3. KHÔNG dùng bảng Markdown (kiểu | cột | cột |) làm nội dung khối.
4. Người dùng ĐÃ đồng ý tạo file bằng chính câu hỏi của họ — THỰC HIỆN NGAY, không xin xác nhận.
5. Tổng hợp nội dung từ tài liệu và hội thoại đã có; viết bằng tiếng Việt, văn phong hành chính.
6. Nếu thiếu dữ liệu cho một mục, ghi "Chưa có thông tin" — KHÔNG bịa số liệu, KHÔNG bỏ trống khối.
7. ${LUAT_MA_KEM_TEN}
8. ${LUAT_NHANH_CHAM_THEO_NGAY}`;

  if (dinhDang === "html") {
    return `${chung}

ĐỊNH DẠNG: HTML hoàn chỉnh, tự chứa (1 file duy nhất).
Bọc TOÀN BỘ output trong:
${MARKER_MO("html")}
<!doctype html>
<html lang="vi">...</html>
${MARKER_DONG}

Yêu cầu HTML:
- Có <!doctype html>, <meta charset="utf-8">, <title>.
- CSS viết trong 1 thẻ <style> ở <head> — dùng CSS variables cho màu chủ đạo, font hệ thống.
- Bố cục rõ ràng: tiêu đề, mục lục nếu dài, bảng số liệu dùng <table> có viền.
- CHỈ dùng JavaScript thuần nếu thật sự cần tab chuyển đổi nội dung (function đơn giản kiểu
  showTab(i), không dùng framework, không gọi API ngoài).
- FILE PHẢI TỰ CHẠY ĐƯỢC KHI KHÔNG CÓ INTERNET: TUYỆT ĐỐI KHÔNG nhúng thư viện ngoài qua <script src>
  hay <link href> tới CDN (Chart.js, ECharts, Bootstrap, Google Fonts…). Người dùng tải file về và mở
  bằng trình duyệt, có thể không có mạng — nhúng CDN là biểu đồ trắng trơn.
- Cần biểu đồ thì vẽ bằng SVG viết tay hoặc thanh/cột bằng CSS (div có chiều rộng theo %) — đơn giản
  mà luôn hiển thị được.
- KHÔNG dùng ảnh (không có nguồn ảnh) — nếu cần minh hoạ, dùng bảng/khối màu CSS đơn giản.`;
  }

  if (dinhDang === "pdf") {
    return `${chung}

ĐỊNH DẠNG BẮT BUỘC: HTML — và CHỈ HTML.
Người dùng muốn file PDF, nhưng bạn KHÔNG tạo PDF và KHÔNG viết code tạo PDF. Bạn chỉ viết HTML;
hệ thống sẽ tự in HTML đó ra PDF. TUYỆT ĐỐI KHÔNG dùng reportlab/fpdf/wkhtmltopdf hay bất kỳ thư
viện nào — chỉ trả về HTML thuần.
Bọc TOÀN BỘ output trong:
${MARKER_MO("pdf")}
<!doctype html>
<html lang="vi">...</html>
${MARKER_DONG}

Yêu cầu HTML (viết để IN RA GIẤY, không phải để bấm chuột):
- Có <!doctype html>, <meta charset="utf-8">, <title>.
- CSS viết trong 1 thẻ <style> ở <head> — dùng font hệ thống, cỡ chữ phù hợp in ấn (13-15px).
- TUYỆT ĐỐI KHÔNG dùng tab/accordion/bất kỳ nội dung nào ẩn bằng JavaScript hoặc CSS
  (display:none để chuyển đổi) — PDF là ảnh chụp tĩnh, nội dung ẩn sẽ KHÔNG in ra được. Trình bày
  MỌI mục nối tiếp nhau từ trên xuống dưới, dùng tiêu đề (h1/h2/h3) để phân đoạn.
- Bố cục rõ ràng: tiêu đề, mục lục nếu dài, bảng số liệu dùng <table> có viền, thêm
  "page-break-inside: avoid" cho bảng để tránh bị cắt ngang trang.
- TUYỆT ĐỐI KHÔNG nhúng thư viện ngoài qua <script src>/<link href> tới CDN — trang được in ra PDF
  ngay trên máy chủ, tài nguyên ngoài không kịp tải và sẽ mất trắng. Cần biểu đồ thì vẽ bằng SVG
  viết tay hoặc thanh/cột bằng CSS.
- KHÔNG dùng ảnh (không có nguồn ảnh) — nếu cần minh hoạ, dùng bảng/khối màu CSS đơn giản.`;
  }

  if (dinhDang === "docx") {
    return `${chung}

ĐỊNH DẠNG BẮT BUỘC: JSON — và CHỈ JSON (không văn xuôi, không Markdown).
Người dùng muốn file Word, nhưng bạn KHÔNG tạo file Word. Bạn chỉ trả JSON mô tả các khối nội dung;
hệ thống sẽ tự dựng thành .docx thật.
Bọc TOÀN BỘ output trong:
${MARKER_MO("docx")}
{ "caiDat": { "font": "Times New Roman", "coChu": 13 },
  "blocks": [
  { "loai": "heading", "text": "BÁO CÁO ...", "cap": 1, "canLe": "center", "mauChu": "1F3864" },
  { "loai": "doan", "text": "Nội dung đoạn văn...", "canLe": "justify" },
  { "loai": "bang", "headers": ["STT", "Nội dung"], "rows": [["1", "..."]], "nenTieuDe": "1F3864", "mauChuTieuDe": "FFFFFF" },
  { "loai": "ngatTrang" }
] }
${MARKER_DONG}

QUY TẮC BẮT BUỘC (schema JSON dạng block, KHÔNG dùng Markdown):
- "loai": "heading" | "doan" | "bang" | "ngatTrang".
- "heading": {text, cap (0-4, 0=Title), canLe}. "doan": {text, canLe, dam?, nghieng?, gachChan?}.
  "bang": {headers: string[], rows: string[][]}. "ngatTrang": {} (sang trang mới).
- "canLe": "left" | "center" | "right" | "justify".
- Tự sắp xếp thứ tự block hợp lý theo nội dung yêu cầu, đánh số La Mã cho mục lớn nếu phù hợp văn
  phong hành chính (vd "I. Tổng quan").

THUỘC TÍNH TRÌNH BÀY (tuỳ chọn — dùng để bám theo file mẫu nếu có):
- "caiDat" (đặt ở ngoài cùng, cạnh "blocks"): {"font": tên font, "coChu": cỡ chữ pt} — áp cho toàn
  văn bản. Không khai thì mặc định Times New Roman 13pt (chuẩn văn bản hành chính Việt Nam).
- Của "heading"/"doan": "mauChu" (RGB 6 ký tự KHÔNG dấu #, vd "1F3864"), "coChu" (pt, ghi đè cỡ mặc định).
- Của "bang": "nenTieuDe" (màu nền hàng tiêu đề), "mauChuTieuDe" (màu chữ hàng tiêu đề) — nên đặt
  tương phản rõ (nền đậm + chữ trắng) để bảng dễ đọc.`;
  }

  if (dinhDang === "pptx") {
    return `${chung}

ĐỊNH DẠNG BẮT BUỘC: JSON — và CHỈ JSON.
Người dùng muốn file PowerPoint, nhưng bạn KHÔNG tạo file .pptx. Bạn chỉ trả JSON mô tả từng slide;
hệ thống sẽ tự dựng thành bài trình chiếu thật.
Bọc TOÀN BỘ output trong:
${MARKER_MO("pptx")}
{ "tieuDeChung": "Báo cáo ...",
  "caiDat": { "mauNhan": "1F3864", "mauChu": "222222", "font": "Arial", "coChuTieuDe": 26, "coChuNoiDung": 16 },
  "slides": [
  { "tieuDe": "Trang bìa", "bullets": ["Đơn vị: ...", "Ngày: ..."] },
  { "tieuDe": "I. Tổng quan", "bullets": ["Ý chính 1", "Ý chính 2"], "ghiChu": "Ghi chú cho người trình bày" },
  { "tieuDe": "II. Số liệu", "bang": { "headers": ["Chỉ tiêu", "Giá trị"], "rows": [["Doanh thu", "12 tỷ"]] } },
  { "tieuDe": "III. Biểu đồ", "bieuDo": { "loai": "cot", "nhan": ["Quý 1", "Quý 2"], "giaTri": [12, 18], "tenChuoi": "Doanh thu" } }
] }
${MARKER_DONG}

QUY TẮC BẮT BUỘC:
- Mỗi slide có "tieuDe" (bắt buộc) và CHỌN ĐÚNG 1 trong: "bullets" | "bang" | "bieuDo". Không trộn
  nhiều loại nội dung trong cùng 1 slide.
- "bullets": tối đa 6 dòng, mỗi dòng tối đa 120 ký tự — slide là để nhìn, không phải để đọc văn xuôi.
- "bang": tối đa 8 cột, 12 dòng. Số liệu dài thì rút gọn đơn vị (vd "12,5 tỷ").
- "bieuDo": "loai" là "cot" | "duong" | "tron"; "nhan" và "giaTri" phải CÙNG số phần tử; "giaTri" là
  số thuần (không dấu chấm phân cách, không đơn vị, không dấu %).
- "ghiChu" (tuỳ chọn): lời dẫn cho người trình bày, không hiện trên slide.
- Số slide hợp lý: 5-15 slide. Slide đầu là bìa, slide cuối là kết luận/kiến nghị.

THUỘC TÍNH TRÌNH BÀY (tuỳ chọn — dùng để bám theo file mẫu nếu có):
- "caiDat" (đặt ở ngoài cùng, cạnh "slides"): "mauNhan" (màu tiêu đề + nền hàng tiêu đề bảng),
  "mauChu" (màu chữ nội dung), "nenSlide" (màu nền slide) — đều là RGB 6 ký tự KHÔNG có dấu #;
  "font" (tên font); "coChuTieuDe", "coChuNoiDung" (cỡ chữ pt).
- Của từng slide: "nen" (màu nền riêng, ghi đè caiDat.nenSlide).

BỐ CỤC TỰ DO — "thanhPhan" (dùng khi cần tái tạo bố cục giống file mẫu):
Mỗi slide có thể kèm "thanhPhan": mảng các khối đặt ở TOẠ ĐỘ BẤT KỲ. Khổ slide 16:9 = 10 x 5.63
inch, gốc toạ độ ở góc TRÊN-TRÁI, đơn vị inch (trùng đơn vị mà khuôn mẫu mô tả — dịch thẳng 1-1).
Các khối được vẽ theo đúng thứ tự khai báo và nằm DƯỚI tiêu đề/nội dung, nên khai nền trước, chữ sau.
  { "loai": "khoi", "x": 0, "y": 0, "w": 10, "h": 5.63, "mau": "1B3A5C" }          ← dải/nền màu
  { "loai": "khoi", "x": 7.2, "y": 0, "w": 2.8, "h": 5.63, "mau": "1A7F8E" }       ← cột màu bên phải
  { "loai": "chu", "x": 0.4, "y": 1.8, "w": 6.6, "h": 1.1, "text": "TIÊU ĐỀ LỚN",
    "coChu": 44, "mauChu": "FFFFFF", "dam": true, "canLe": "left", "canDoc": "middle" }
  { "loai": "anh", "x": 0.4, "y": 0.5, "w": 1.5, "h": 1.5, "tuKhoa": "toà nhà văn phòng hiện đại" }
- "khoi": bắt buộc có x, y, w, h, mau. Thêm "bo" (0..1) để bo góc.
- "chu": bắt buộc có x, y, text. Tuỳ chọn: w, h, coChu, mauChu, dam, nghieng,
  "canLe" (left|center|right), "canDoc" (top|middle|bottom), "giangCach" (vd 1.2).
- "anh": bắt buộc có x, y, w, h và MỘT trong hai: "tuKhoa" (hệ thống tự tìm ảnh trên mạng — ưu tiên
  cách này) hoặc "url" (địa chỉ ảnh cụ thể). Từ khoá viết ngắn, cụ thể, tiếng Việt hoặc tiếng Anh
  đều được. Tối đa 2 ảnh mỗi slide.
- Khi đã tự vẽ tiêu đề bằng "chu", đặt "anTieuDeMacDinh": true để hệ thống không vẽ thêm tiêu đề
  mặc định đè lên.
- CHỮ PHẢI TƯƠNG PHẢN VỚI NỀN: đặt khối nền màu đậm thì chữ trên đó phải là "FFFFFF" hoặc màu sáng.

KHI CÓ KHUÔN MẪU TRÌNH BÀY Ở TRÊN — BẮT BUỘC:
Khuôn mẫu liệt kê các khung theo dạng "vị trí (x, y) inch, cỡ khung WxH inch, KHỐI NỀN màu #XXXXXX"
hoặc "… có chữ NNpt màu chữ #XXXXXX". Hãy DỰNG LẠI ĐÚNG các khối đó bằng "thanhPhan" với cùng toạ
độ, cùng kích thước, cùng màu — rồi mới đặt nội dung mới của bạn vào. KHÔNG được bỏ qua phần này rồi
chỉ dùng bullets đơn giản: làm vậy sản phẩm sẽ không giống khuôn mẫu chút nào.

ÁP PHONG CÁCH CHO MỌI SLIDE, KHÔNG CHỈ TRANG BÌA:
Mọi slide phải mang cùng bộ nhận diện — nền, dải màu tiêu đề, thanh chân trang, màu chữ tương phản.
Bài trình chiếu có trang bìa đẹp còn các trang sau trắng trơn là SAI. Nếu khuôn mẫu chỉ mô tả trang
bìa, hãy tự suy ra bố cục trang nội dung dùng CÙNG bảng màu đó, ví dụ:
  - Dải màu nhấn ngang phía trên (vd x:0, y:0, w:10, h:0.9) chứa tiêu đề mục, chữ trắng đậm;
  - Nền trang để sáng ("nen": "FFFFFF") cho bảng/biểu dễ đọc, hoặc giữ nền đậm nếu mẫu vậy;
  - Thanh màu mỏng ở chân trang (vd x:0, y:5.45, w:10, h:0.18) đồng bộ với trang bìa.
Khi đã tự vẽ tiêu đề bằng "chu" trong dải màu, nhớ đặt "anTieuDeMacDinh": true.`;
  }

  if (dinhDang === "kml") {
    return `${chung}

ĐỊNH DẠNG BẮT BUỘC: JSON — và CHỈ JSON.
Người dùng muốn file Google Earth (.kml), nhưng bạn KHÔNG viết XML KML. Bạn chỉ trả JSON mô tả các
đối tượng địa lý; hệ thống sẽ tự dựng thành KML chuẩn.
Bọc TOÀN BỘ output trong:
${MARKER_MO("kml")}
{ "ten": "Dự án ...", "moTa": "Mô tả chung", "doiTuong": [
  { "loai": "diem", "ten": "Mốc M1", "moTa": "Ranh giới phía Bắc", "toaDo": [105.8542, 21.0285] },
  { "loai": "duong", "ten": "Tuyến đường vào", "toaDo": [[105.8542, 21.0285], [105.8600, 21.0300]] },
  { "loai": "vung", "ten": "Ranh giới khu đất", "toaDo": [[105.85, 21.02], [105.86, 21.02], [105.86, 21.03]] }
] }
${MARKER_DONG}

QUY TẮC BẮT BUỘC:
- "loai": "diem" (một mốc) | "duong" (tuyến/đường đi) | "vung" (ranh giới khép kín).
- Toạ độ theo thứ tự [KINH ĐỘ, VĨ ĐỘ] — kinh độ TRƯỚC (đúng quy ước KML, ngược với cách đọc
  "vĩ độ, kinh độ" thường thấy). Việt Nam: kinh độ khoảng 102-110, vĩ độ khoảng 8-24.
- "diem": "toaDo" là 1 cặp [kinhDo, viDo]. "duong"/"vung": "toaDo" là MẢNG các cặp, tối thiểu 2 điểm
  (đường) hoặc 3 điểm (vùng). Vùng không cần lặp lại điểm đầu ở cuối — hệ thống tự khép kín.
- CHỈ dùng toạ độ CÓ SẴN trong tài liệu/hội thoại. Bạn KHÔNG đo đạc thực địa được: nếu tài liệu
  không có số liệu toạ độ, TUYỆT ĐỐI KHÔNG bịa ra toạ độ. Khi đó trả về đúng 1 đối tượng "diem" với
  "ten": "Chưa có dữ liệu toạ độ" và "moTa" nêu rõ cần bổ sung toạ độ gì.`;
  }

  if (dinhDang === "dxf") {
    return `${chung}

ĐỊNH DẠNG BẮT BUỘC: JSON — và CHỈ JSON.
Người dùng muốn file AutoCAD (.dxf), nhưng bạn KHÔNG viết mã DXF. Bạn chỉ trả JSON mô tả hình vẽ;
hệ thống sẽ tự dựng thành DXF chuẩn (bản R12, mọi phần mềm CAD đọc được).
Bọc TOÀN BỘ output trong:
${MARKER_MO("dxf")}
{ "doiTuong": [
  { "loai": "duong", "diem": [[0, 0], [100, 0]] },
  { "loai": "daDuong", "diem": [[0, 0], [50, 30], [100, 0]], "kin": false },
  { "loai": "chuNhat", "goc": [0, 0], "rong": 100, "cao": 60 },
  { "loai": "tron", "tam": [50, 30], "banKinh": 20 },
  { "loai": "diem", "viTri": [25, 15] },
  { "loai": "chu", "viTri": [10, 65], "text": "MẶT BẰNG TỔNG THỂ", "cao": 5 }
] }
${MARKER_DONG}

QUY TẮC BẮT BUỘC:
- "loai": "duong" | "daDuong" | "chuNhat" | "tron" | "diem" | "chu".
- Mọi toạ độ là số thực trong hệ toạ độ phẳng, đơn vị mét (hoặc mm nếu tài liệu dùng mm) — ghi rõ
  đơn vị bằng 1 đối tượng "chu" đặt ở góc bản vẽ.
- "duong": "diem" đúng 2 cặp. "daDuong": "diem" từ 2 cặp trở lên, "kin": true để khép kín.
  "chuNhat": "goc" là góc dưới-trái. "tron": "tam" + "banKinh". "chu": "viTri" + "text" + "cao" (cỡ chữ).
- Chữ trong "text" nên KHÔNG DẤU (DXF R12 không có bảng mã Unicode ổn định, chữ có dấu dễ hiện sai
  trên một số phần mềm CAD).
- CHỈ vẽ theo kích thước CÓ SẴN trong tài liệu. Không có số liệu thì KHÔNG bịa kích thước — trả về
  một đối tượng "chu" nêu rõ còn thiếu dữ liệu gì.`;
  }

  if (dinhDang === "md") {
    return `${chung}

ĐỊNH DẠNG: Markdown thuần.
Bọc TOÀN BỘ output trong:
${MARKER_MO("md")}
# Tiêu đề báo cáo
...
${MARKER_DONG}

Yêu cầu:
- Dùng cú pháp Markdown chuẩn: # ## ### cho tiêu đề, - cho gạch đầu dòng, **đậm**, bảng kiểu
  | Cột | Cột | với dòng phân cách |---|---|.
- Ở ĐỊNH DẠNG NÀY bảng Markdown là ĐÚNG và ĐƯỢC KHUYẾN KHÍCH (khác các định dạng khác).
- Không chèn HTML thô, không chèn ảnh.`;
  }

  if (dinhDang === "svg") {
    return `${chung}

ĐỊNH DẠNG: SVG thuần (1 thẻ <svg> duy nhất, tự chứa).
Bọc TOÀN BỘ output trong:
${MARKER_MO("svg")}
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">...</svg>
${MARKER_DONG}

Yêu cầu:
- BẮT BUỘC có xmlns="http://www.w3.org/2000/svg" và viewBox.
- CSS viết trong <style> BÊN TRONG thẻ <svg>, hoặc dùng thuộc tính fill/stroke trực tiếp.
- Chữ dùng <text> với font-family="sans-serif"; chữ tiếng Việt có dấu viết bình thường (SVG là UTF-8).
- TUYỆT ĐỐI KHÔNG tham chiếu tài nguyên ngoài (<image href="http...">, @import font) — file phải mở
  được khi không có mạng.
- KHÔNG dùng JavaScript trong SVG.`;
  }

  if (dinhDang === "mmd") {
    return `${chung}

ĐỊNH DẠNG: mã nguồn sơ đồ Mermaid thuần.
Bọc TOÀN BỘ output trong:
${MARKER_MO("mmd")}
flowchart TD
  A[Tiếp nhận hồ sơ] --> B{Đủ điều kiện?}
  B -- Có --> C[Trình ký]
  B -- Không --> D[Trả bổ sung]
${MARKER_DONG}

Yêu cầu:
- Dòng đầu tiên PHẢI là loại sơ đồ: flowchart TD/LR, sequenceDiagram, classDiagram, stateDiagram-v2,
  erDiagram, gantt, pie, mindmap, timeline.
- KHÔNG bọc thêm dấu \`\`\`mermaid bên trong khối — chỉ mã Mermaid thuần.
- Nhãn tiếng Việt có dấu phải đặt trong ngoặc vuông/ngoặc nhọn: A[Thẩm định hồ sơ]. Nhãn chứa dấu
  ngoặc đơn, dấu phẩy hoặc dấu hai chấm thì bọc thêm nháy kép: A["Điều 5, khoản 2"].
- Mã định danh nút (A, B, C…) viết KHÔNG DẤU, không khoảng trắng.`;
  }

  if (dinhDang === "dot") {
    return `${chung}

ĐỊNH DẠNG: mã nguồn Graphviz (ngôn ngữ DOT) thuần.
Bọc TOÀN BỘ output trong:
${MARKER_MO("dot")}
digraph SoDoQuanHe {
  rankdir=LR;
  node [shape=box, fontname="Arial"];
  "Chủ đầu tư" -> "Nhà thầu chính" [label="hợp đồng"];
  "Nhà thầu chính" -> "Nhà thầu phụ";
}
${MARKER_DONG}

Yêu cầu:
- Dòng đầu PHẢI là digraph <Ten> { (có hướng) hoặc graph <Ten> { (không hướng); tên đồ thị viết
  KHÔNG DẤU, không khoảng trắng.
- Mọi nhãn tiếng Việt có dấu PHẢI bọc trong nháy kép: "Sở Tài nguyên và Môi trường".
- Đặt fontname="Arial" ở node/edge để chữ tiếng Việt hiển thị đúng.
- Kết thúc bằng dấu } — không viết gì sau đó.`;
  }

  return `${chung}

ĐỊNH DẠNG BẮT BUỘC: JSON — và CHỈ JSON. TUYỆT ĐỐI KHÔNG trả bảng Markdown (| cột | cột |).
Người dùng muốn file Excel, nhưng bạn KHÔNG tạo file Excel. Bạn chỉ trả JSON mô tả từng ô của bảng
tính; hệ thống sẽ tự dựng thành .xlsx thật với công thức sống.
Bọc TOÀN BỘ output trong:
${MARKER_MO("xlsx")}
{ "sheets": [
  { "ten": "Tổng hợp",
    "rongCot": { "A": 32, "B": 18 },
    "oGop": ["A1:B1"],
    "oCells": [
      { "dc": "A1", "gt": "BẢNG TỔNG HỢP CHI PHÍ", "kieu": "text", "nen": "1F3864", "mauChu": "FFFFFF", "dam": true, "coChu": 14, "canLe": "center" },
      { "dc": "A2", "gt": "Chỉ tiêu", "kieu": "text", "nen": "D9E2F3", "dam": true, "vien": true },
      { "dc": "B2", "gt": "Giá trị", "kieu": "text", "nen": "D9E2F3", "dam": true, "vien": true },
      { "dc": "A3", "gt": "Đơn giá", "kieu": "text", "vien": true },
      { "dc": "B3", "gt": 1000000, "kieu": "number", "nhapTay": true, "vien": true, "dinhDangSo": "#,##0" },
      { "dc": "A4", "gt": "Số lượng", "kieu": "text", "vien": true },
      { "dc": "B4", "gt": 5, "kieu": "number", "nhapTay": true, "vien": true, "dinhDangSo": "#,##0" },
      { "dc": "A5", "gt": "Thành tiền", "kieu": "text", "dam": true, "vien": true },
      { "dc": "B5", "gt": "=B3*B4", "kieu": "formula", "dam": true, "vien": true, "dinhDangSo": "#,##0" }
    ] },
  { "ten": "Chi tiết", "oCells": [
    { "dc": "A1", "gt": "Hạng mục", "kieu": "text", "dam": true },
    { "dc": "B1", "gt": "Thành tiền (lấy từ sheet Tổng hợp)", "kieu": "text", "dam": true },
    { "dc": "B2", "gt": "='Tổng hợp'!B5", "kieu": "formula", "dinhDangSo": "#,##0" }
  ] }
] }
${MARKER_DONG}

QUY TẮC BẮT BUỘC:
- Mỗi ô là 1 phần tử "oCells" của đúng 1 sheet, "dc" là địa chỉ kiểu "A1"/"B12".
- "kieu": "text" | "number" | "formula". Nếu "formula", "gt" PHẢI bắt đầu bằng "=", cú pháp Excel
  hợp lệ (SUM, SUMPRODUCT, +-*/, tham chiếu cùng sheet "B2", tham chiếu sheet khác 'Tên Sheet'!B4
  — luôn có dấu nháy đơn quanh tên sheet có khoảng trắng).
- "nhapTay": true CHỈ cho ô số liệu đầu vào cần người dùng tự chỉnh sau (sẽ tô vàng) — KHÔNG đặt
  cho ô công thức/tiêu đề.
- Tên sheet có thể có dấu cách/tiếng Việt có dấu, không chứa các ký tự : \\ / ? * [ ]
- Tự thiết kế số sheet/cấu trúc phù hợp nội dung yêu cầu — KHÔNG rập khuôn theo ví dụ trên. Nếu
  không chắc 1 công thức đúng, dùng "kieu":"number" với giá trị đã tính sẵn thay vì đoán liều.

THUỘC TÍNH TRÌNH BÀY (tuỳ chọn, dùng để bảng tính sạch đẹp — hoặc để bám theo file mẫu nếu có):
- Của từng ô: "nen" (màu nền), "mauChu" (màu chữ) — mã RGB 6 ký tự KHÔNG có dấu # (vd "1F3864");
  "dam", "nghieng" (true/false); "coChu" (số, pt); "font" (vd "Arial"); "canLe" ("left"|"center"|
  "right"); "vien" (true = kẻ khung ô); "dinhDangSo" (mã Excel, vd "#,##0" cho số tiền, "0%" cho
  phần trăm, "#,##0.00" cho 2 số lẻ); "xuongDong" (true = chữ tự xuống dòng trong ô).
- Của từng sheet: "rongCot" (vd {"A": 32, "B": 18} — đơn vị ký tự, cột chứa chữ dài nên >= 25);
  "oGop" (vd ["A1:D1"] — dùng cho dòng tiêu đề lớn trải ngang bảng).
- Nguyên tắc trình bày tối thiểu: dòng tiêu đề bảng phải có nền đậm + chữ tương phản + in đậm; mọi
  ô trong bảng số liệu nên có "vien"; cột tiền/số lượng luôn có "dinhDangSo"; đặt "rongCot" đủ rộng
  cho cột chữ để không bị cắt chữ.`;
}

const GIOI_HAN_KY_TU_KHOI = 500_000;

/**
 * Bóc lớp code fence markdown bao ngoài nếu có. Cần thiết vì AI rất hay làm
 * "cả hai": vừa bọc marker theo yêu cầu, vừa bọc thêm ```json/```html quen tay
 * BÊN TRONG marker — khi đó nội dung trích ra vẫn dính ``` và JSON.parse hỏng.
 */
export function boCodeFence(s: string): string {
  const nd = s.trim();
  if (!nd.startsWith("```")) return nd;
  const m = nd.match(/^```[\w]*\s*\n?([\s\S]*?)\n?```$/);
  return m ? m[1].trim() : nd.replace(/^```[\w]*\s*\n?/, "").replace(/\n?```$/, "").trim();
}

/**
 * Trích nội dung nằm giữa marker mở/đóng của đúng định dạng kỳ vọng. AI (kể
 * cả khi được nhắc rất rõ) vẫn có xu hướng dùng code fence markdown quen
 * thuộc (```html/```json) thay vì marker tự chế — chấp nhận cả 2 để tăng độ
 * khoan dung, thay vì chỉ chăm chăm ép đúng 1 định dạng lạ mô hình ít gặp.
 * Ưu tiên: marker > code fence đúng ngôn ngữ > code fence bất kỳ.
 */
export function trichKhoiXuat(traLoi: string, dd: DinhDangXuat): string | undefined {
  const hopLe = (s: string) => {
    const kq = boCodeFence(s);
    return kq.length > 0 && kq.length <= GIOI_HAN_KY_TU_KHOI ? kq : undefined;
  };

  const reMarker = new RegExp(`@@@XUAT_BAOCAO:${dd}@@@([\\s\\S]*?)@@@HET_XUAT_BAOCAO@@@`);
  const mMarker = traLoi.match(reMarker);
  if (mMarker) {
    const kq = hopLe(mMarker[1]);
    if (kq) return kq;
  }

  // Không có marker: gom TẤT CẢ code fence rồi chọn khối dùng được, thay vì lấy
  // khối đầu tiên. Model hay đưa thêm phương án rút gọn ("hoặc nếu bạn chỉ cần
  // đoạn ngắn: …"), nên khối đầu chưa chắc là khối đầy đủ cần lấy.
  const ungVien: string[] = [];
  // Array.from — tsconfig dự án này target thấp hơn bản pháp lý, không iterate thẳng
  for (const m of Array.from(traLoi.matchAll(/```(\w*)\s*\n([\s\S]*?)```/g))) {
    const kq = hopLe(m[2]);
    if (kq) ungVien.push(kq);
  }
  if (ungVien.length === 0) {
    // Định dạng chữ tự do (md/svg/mmd/dot): model hay trả thẳng nội dung, không
    // bọc gì cả — chấp nhận nguyên câu trả lời nếu nó đúng dạng đang cần.
    const toanBo = hopLe(traLoi);
    return toanBo && KIEM_TRA_KHOI[dd](toanBo) ? toanBo : undefined;
  }

  const dungDuoc = ungVien.filter((s) => KIEM_TRA_KHOI[dd](s));

  // Trong các khối dùng được, lấy khối DÀI NHẤT — bản đầy đủ, không phải bản rút gọn.
  if (dungDuoc.length > 0) {
    return dungDuoc.reduce((a, b) => (b.length > a.length ? b : a));
  }
  return ungVien[0];
}

function laJsonCoMang(s: string, khoa: string): boolean {
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    return Array.isArray(o?.[khoa]);
  } catch {
    return false;
  }
}

const RE_MERMAID = /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4Context)\b/i;
const RE_DOT = /^\s*(strict\s+)?(di)?graph\b/i;
const laHtml = (s: string) => /^<!doctype|^<html[\s>]/i.test(s);

/**
 * Khối nội dung có đúng là định dạng đang cần không. Dùng khi AI quên marker và
 * ta phải tự đoán trong đám code fence nó trả về.
 */
const KIEM_TRA_KHOI: Record<DinhDangXuat, (s: string) => boolean> = {
  html: laHtml,
  pdf: laHtml,
  docx: (s) => laJsonCoMang(s, "blocks"),
  xlsx: (s) => laJsonCoMang(s, "sheets"),
  pptx: (s) => laJsonCoMang(s, "slides"),
  kml: (s) => laJsonCoMang(s, "doiTuong"),
  dxf: (s) => laJsonCoMang(s, "doiTuong"),
  svg: (s) => /<svg[\s>]/i.test(s),
  mmd: (s) => RE_MERMAID.test(s),
  dot: (s) => RE_DOT.test(s),
  // Markdown không có dấu hiệu cú pháp bắt buộc nào — chấp nhận mọi chữ.
  md: (s) => s.trim().length > 0,
};

export type KetQuaBaoCao = { tenFile: string; dinhDang: DinhDangXuat; buffer: Buffer } | { loi: string };

// ─────────────────────────────────────────────────────────────────────────
// HTML
// ─────────────────────────────────────────────────────────────────────────

export async function buildHtml(html: string, tenGoi: string): Promise<KetQuaBaoCao> {
  const noiDung = chuanHoaHtml(html);
  if (!noiDung) return { loi: "AI không trả về HTML hợp lệ (thiếu thẻ <html>)." };
  const { html: sach } = goTaiNguyenNgoai(noiDung);
  return { tenFile: `${tenGoi}.html`, dinhDang: "html", buffer: Buffer.from(sach, "utf-8") };
}

/**
 * Bóc code fence + kiểm tra tối thiểu là HTML. Tự thêm <!doctype html> nếu AI
 * quên (chỉ trả <html>...) — thiếu doctype không đáng để huỷ cả báo cáo, trình
 * duyệt vẫn mở được, chỉ rơi vào quirks mode.
 */
function chuanHoaHtml(html: string): string | undefined {
  const nd = boCodeFence(html);
  if (/^<!doctype/i.test(nd)) return nd;
  if (/^<html[\s>]/i.test(nd)) return `<!doctype html>\n${nd}`;
  return undefined;
}

/**
 * File tải về phải mở được khi không có mạng, nhưng model vẫn hay nhúng
 * Chart.js/Bootstrap từ CDN. Gỡ các thẻ đó ra và ghi chú lại, thay vì để người
 * dùng mở file thấy biểu đồ trắng trơn mà không hiểu vì sao.
 */
function goTaiNguyenNgoai(html: string): { html: string; daGo: number } {
  const reScript = /<script\b[^>]*\bsrc\s*=\s*["']https?:\/\/[^"']+["'][^>]*>\s*<\/script>/gi;
  const reLink = /<link\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi;
  let daGo = 0;
  const sach = html
    .replace(reScript, () => { daGo++; return "<!-- đã gỡ script từ CDN (file phải chạy offline) -->"; })
    .replace(reLink, () => { daGo++; return "<!-- đã gỡ link từ CDN (file phải chạy offline) -->"; });
  return { html: sach, daGo };
}

// ─────────────────────────────────────────────────────────────────────────
// PDF — AI trả HTML tĩnh (không tab/JS ẩn hiện), Playwright in thành PDF thật
// ─────────────────────────────────────────────────────────────────────────

export async function buildPdf(html: string, tenGoi: string): Promise<KetQuaBaoCao> {
  const noiDung = chuanHoaHtml(html);
  if (!noiDung) return { loi: "AI không trả về HTML hợp lệ (thiếu thẻ <html>) để in PDF." };
  // Nạp playwright TẠI ĐÂY chứ không ở đầu file: nạp sớm mà máy chủ thiếu file
  // playwright là SẬP CẢ TUYẾN API AI (chat thường cũng chết theo) — bài học 12/08/2026.
  // webpackIgnore: để webpack KHÔNG bundle — thiếu playwright thì chỉ nút PDF
  // báo lỗi đẹp, tuyến chat vẫn sống (đúng bài học trên, siết thêm 05/09).
  // Kiểu tối thiểu tự khai — không dựa d.ts của playwright (nạp động lúc chạy)
  interface TrinhDuyetPdf {
    newPage(): Promise<{
      setContent(html: string, o: { waitUntil: string }): Promise<void>;
      pdf(o: object): Promise<Buffer>;
    }>;
    close(): Promise<void>;
  }
  let chromium: { launch(): Promise<TrinhDuyetPdf> };
  try {
    ({ chromium } = (await import(/* webpackIgnore: true */ "playwright")) as unknown as {
      chromium: { launch(): Promise<TrinhDuyetPdf> };
    });
  } catch {
    return {
      loi: "Máy chủ chưa cài playwright (bộ in PDF) — chạy `npm i playwright && npx playwright install chromium` rồi thử lại, hoặc chọn HTML.",
    };
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(noiDung, { waitUntil: "load" });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", bottom: "15mm", left: "12mm", right: "12mm" },
    });
    return { tenFile: `${tenGoi}.pdf`, dinhDang: "pdf", buffer };
  } catch (e) {
    return { loi: `Không dựng được PDF: ${e instanceof Error ? e.message : "lỗi không xác định"}.` };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ─────────────────────────────────────────────────────────────────────────
// DOCX — schema block-based, học theo model Heading/Paragraph/Table/PageBreak
// ─────────────────────────────────────────────────────────────────────────

type CanLe = "left" | "center" | "right" | "justify";

function anhXaCanLe(c: unknown): (typeof AlignmentType)[keyof typeof AlignmentType] {
  switch (c as CanLe) {
    case "center": return AlignmentType.CENTER;
    case "right": return AlignmentType.RIGHT;
    case "justify": return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}

function anhXaCapHeading(cap: unknown): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  const n = typeof cap === "number" ? cap : 1;
  switch (Math.max(0, Math.min(4, n))) {
    case 0: return HeadingLevel.TITLE;
    case 2: return HeadingLevel.HEADING_2;
    case 3: return HeadingLevel.HEADING_3;
    case 4: return HeadingLevel.HEADING_4;
    default: return HeadingLevel.HEADING_1;
  }
}

interface KhoiDocx {
  loai: string;
  text?: string;
  cap?: number;
  canLe?: string;
  dam?: boolean;
  nghieng?: boolean;
  gachChan?: boolean;
  headers?: string[];
  rows?: string[][];
  // ─ Thuộc tính trình bày (tuỳ chọn) — để bám theo phong cách file mẫu ─
  /** Màu chữ, RGB 6 ký tự không dấu # (vd "1F3864"). */
  mauChu?: string;
  /** Cỡ chữ (pt). */
  coChu?: number;
  /** Màu nền hàng tiêu đề của bảng, RGB 6 ký tự. */
  nenTieuDe?: string;
  /** Màu chữ hàng tiêu đề của bảng, RGB 6 ký tự. */
  mauChuTieuDe?: string;
}

/** Thiết lập chung cho cả tài liệu Word (bắt chước file mẫu nếu có). */
interface CaiDatDocx {
  /** Font mặc định toàn văn bản. */
  font?: string;
  /** Cỡ chữ mặc định (pt). */
  coChu?: number;
}

/** Chỉ nhận RGB 6 ký tự; thư viện docx dùng chuỗi hex không có dấu #. */
function mauHex(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().replace(/^#/, "");
  return /^[0-9A-Fa-f]{6}$/.test(s) ? s.toUpperCase() : undefined;
}

export async function buildDocx(jsonText: string, tenGoi: string): Promise<KetQuaBaoCao> {
  let data: unknown;
  try {
    data = JSON.parse(boCodeFence(jsonText));
  } catch {
    return { loi: "JSON không hợp lệ." };
  }
  const blocks = (data as { blocks?: unknown[] })?.blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return { loi: "Thiếu trường 'blocks' hoặc rỗng." };
  }

  const children: (Paragraph | Table)[] = [];
  for (const raw of blocks as KhoiDocx[]) {
    if (!raw || typeof raw.loai !== "string") continue;
    if (raw.loai === "heading") {
      const mauH = mauHex(raw.mauChu);
      children.push(new Paragraph({
        heading: anhXaCapHeading(raw.cap),
        alignment: anhXaCanLe(raw.canLe),
        children: [new TextRun({
          text: String(raw.text ?? ""),
          ...(mauH ? { color: mauH } : {}),
          ...(raw.coChu ? { size: Math.round(raw.coChu * 2) } : {}), // pt → half-point
        })],
      }));
    } else if (raw.loai === "doan") {
      const mauD = mauHex(raw.mauChu);
      children.push(new Paragraph({
        alignment: anhXaCanLe(raw.canLe),
        children: [new TextRun({
          text: String(raw.text ?? ""),
          bold: !!raw.dam,
          italics: !!raw.nghieng,
          underline: raw.gachChan ? {} : undefined,
          ...(mauD ? { color: mauD } : {}),
          ...(raw.coChu ? { size: Math.round(raw.coChu * 2) } : {}),
        })],
      }));
    } else if (raw.loai === "bang") {
      const headers = Array.isArray(raw.headers) ? raw.headers.map(String) : [];
      const rows = Array.isArray(raw.rows) ? raw.rows.map((r) => (Array.isArray(r) ? r.map(String) : [])) : [];
      if (headers.length === 0 && rows.length === 0) continue;
      const soCot = headers.length || rows[0]?.length || 0;
      if (soCot === 0) continue;
      const nenTd = mauHex(raw.nenTieuDe);
      const chuTd = mauHex(raw.mauChuTieuDe);
      const tableRows: TableRow[] = [];
      if (headers.length) {
        tableRows.push(new TableRow({
          children: Array.from({ length: soCot }, (_, i) => new TableCell({
            ...(nenTd ? { shading: { fill: nenTd } } : {}),
            children: [new Paragraph({
              children: [new TextRun({
                text: headers[i] ?? "",
                bold: true,
                ...(chuTd ? { color: chuTd } : {}),
              })],
            })],
          })),
        }));
      }
      for (const row of rows) {
        tableRows.push(new TableRow({
          children: Array.from({ length: soCot }, (_, i) => new TableCell({
            children: [new Paragraph(row[i] ?? "")],
          })),
        }));
      }
      children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
    } else if (raw.loai === "ngatTrang") {
      children.push(new Paragraph({ children: [new DocxPageBreak()] }));
    }
  }

  if (children.length === 0) return { loi: "Không dựng được nội dung nào từ 'blocks'." };

  // Font/cỡ chữ mặc định: lấy theo file mẫu nếu AI chỉ định, không thì giữ
  // Times New Roman 13pt (chuẩn văn bản hành chính Việt Nam).
  const caiDat = (data as { caiDat?: CaiDatDocx })?.caiDat;
  const fontMacDinh = typeof caiDat?.font === "string" && caiDat.font.trim()
    ? caiDat.font.trim() : "Times New Roman";
  const coChuMacDinh = typeof caiDat?.coChu === "number" && caiDat.coChu > 0 && caiDat.coChu < 100
    ? Math.round(caiDat.coChu * 2) : 26; // 13pt = 26 half-points

  const doc = new Document({
    sections: [{ children }],
    styles: {
      default: {
        document: { run: { font: fontMacDinh, size: coChuMacDinh } },
      },
    },
  });
  const buffer = await Packer.toBuffer(doc);
  return { tenFile: `${tenGoi}.docx`, dinhDang: "docx", buffer };
}

// ─────────────────────────────────────────────────────────────────────────
// XLSX — schema oCells (địa chỉ ô + giá trị/công thức), công thức thật
// ─────────────────────────────────────────────────────────────────────────

interface OCellXlsx {
  dc: string;
  gt: string | number;
  kieu: "text" | "number" | "formula";
  nhapTay?: boolean;
  // ─ Thuộc tính trình bày (tuỳ chọn) — để AI bắt chước được phong cách file mẫu ─
  /** Màu nền ô, RGB 6 ký tự không có dấu # (vd "1F3864"). */
  nen?: string;
  /** Màu chữ, RGB 6 ký tự. */
  mauChu?: string;
  dam?: boolean;
  nghieng?: boolean;
  /** Cỡ chữ (pt). */
  coChu?: number;
  /** Tên font (vd "Arial", "Times New Roman"). */
  font?: string;
  canLe?: "left" | "center" | "right";
  /** Có kẻ viền quanh ô không (viền mảnh). */
  vien?: boolean;
  /** Định dạng số kiểu Excel, vd "#,##0" hoặc "#,##0.00" hoặc "0%". */
  dinhDangSo?: string;
  /** Cho chữ tự xuống dòng trong ô. */
  xuongDong?: boolean;
}
interface SheetXlsx {
  ten: string;
  oCells: OCellXlsx[];
  /** Độ rộng cột, vd {"A": 30, "B": 15}. */
  rongCot?: Record<string, number>;
  /** Danh sách vùng ô gộp, vd ["A1:D1"]. */
  oGop?: string[];
}
interface DuLieuXlsx {
  sheets: SheetXlsx[];
}

const RE_MAU_RGB = /^[0-9A-Fa-f]{6}$/;
/** Chỉ nhận mã màu RGB 6 ký tự; exceljs cần dạng ARGB nên thêm "FF" (đục hoàn toàn). */
function mauArgb(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().replace(/^#/, "");
  return RE_MAU_RGB.test(s) ? `FF${s.toUpperCase()}` : undefined;
}

/**
 * LỌC thay vì loại bỏ toàn bộ: một ô sai lẻ tẻ không đáng để huỷ cả bảng tính
 * (AI thường đúng 99% số ô, sai 1 ô lẻ) — bỏ ô/sheet hỏng, giữ phần còn lại.
 * Chỉ trả null khi không còn sheet nào có dữ liệu dùng được.
 */
function validateXlsxJson(data: unknown): DuLieuXlsx | null {
  if (typeof data !== "object" || data === null) return null;
  const sheets = (data as { sheets?: unknown }).sheets;
  if (!Array.isArray(sheets) || sheets.length === 0) return null;

  const sheetsSach: SheetXlsx[] = [];
  for (const s of sheets as Record<string, unknown>[]) {
    if (!s || typeof s.ten !== "string" || !s.ten.trim() || !Array.isArray(s.oCells)) continue;
    const oCellsSach: OCellXlsx[] = [];
    for (const c of s.oCells as Record<string, unknown>[]) {
      if (!c || typeof c.dc !== "string") continue;
      // Chấp nhận cả "a1" lẫn "A1" — chuẩn hoá về chữ hoa cho exceljs.
      const dc = c.dc.trim().toUpperCase();
      if (!/^[A-Z]{1,3}[0-9]{1,7}$/.test(dc)) continue;
      const kieu = c.kieu as OCellXlsx["kieu"];
      if (!["text", "number", "formula"].includes(kieu)) continue;
      if (kieu === "formula" && (typeof c.gt !== "string" || !c.gt.startsWith("="))) continue;
      if (typeof c.gt !== "string" && typeof c.gt !== "number") continue;
      // Thuộc tính trình bày: sai kiểu thì bỏ RIÊNG thuộc tính đó, vẫn giữ ô —
      // hỏng phần trang trí không đáng để mất cả dữ liệu.
      const canLe = c.canLe as OCellXlsx["canLe"];
      oCellsSach.push({
        dc, gt: c.gt, kieu,
        nhapTay: c.nhapTay === true,
        nen: typeof c.nen === "string" ? c.nen : undefined,
        mauChu: typeof c.mauChu === "string" ? c.mauChu : undefined,
        dam: c.dam === true,
        nghieng: c.nghieng === true,
        coChu: typeof c.coChu === "number" && c.coChu > 0 && c.coChu < 200 ? c.coChu : undefined,
        font: typeof c.font === "string" && c.font.trim() ? c.font.trim() : undefined,
        canLe: canLe === "left" || canLe === "center" || canLe === "right" ? canLe : undefined,
        vien: c.vien === true,
        dinhDangSo: typeof c.dinhDangSo === "string" && c.dinhDangSo.trim() ? c.dinhDangSo.trim() : undefined,
        xuongDong: c.xuongDong === true,
      });
    }
    if (oCellsSach.length === 0) continue;

    const rongCotRaw = s.rongCot as Record<string, unknown> | undefined;
    const rongCot: Record<string, number> = {};
    if (rongCotRaw && typeof rongCotRaw === "object") {
      for (const [cot, v] of Object.entries(rongCotRaw)) {
        const w = docSo(v);
        if (/^[A-Za-z]{1,3}$/.test(cot) && w !== undefined && w > 0 && w <= 255) {
          rongCot[cot.toUpperCase()] = w;
        }
      }
    }
    const oGop = Array.isArray(s.oGop)
      ? (s.oGop as unknown[]).filter(
          (x): x is string => typeof x === "string" && /^[A-Za-z]{1,3}\d{1,7}:[A-Za-z]{1,3}\d{1,7}$/.test(x)
        )
      : [];

    sheetsSach.push({
      ten: s.ten,
      oCells: oCellsSach,
      rongCot: Object.keys(rongCot).length ? rongCot : undefined,
      oGop: oGop.length ? oGop : undefined,
    });
  }
  return sheetsSach.length > 0 ? { sheets: sheetsSach } : null;
}

/**
 * Số tiền tiếng Việt AI hay viết "1.018.517.000.000" hoặc "1,018,517" — Number()
 * trên các chuỗi đó ra NaN, ghi vào Excel thành ô lỗi. Bỏ dấu phân cách rồi thử
 * lại; vẫn không ra số thì trả undefined để ghi dạng chữ, không bao giờ ghi NaN.
 */
function docSo(gt: unknown): number | undefined {
  if (typeof gt === "number") return Number.isFinite(gt) ? gt : undefined;
  // Trường thiếu hẳn trong JSON của AI là chuyện thường — trả undefined để hàm
  // gọi tự bỏ qua đối tượng đó, thay vì ném lỗi làm hỏng cả file.
  if (typeof gt !== "string") return undefined;
  // ⭐ 12/10/2026 (chốt 130): bản cũ không đọc được thì xoá HẾT dấu chấm, dấu phẩy — «1,5» thành 15, «1.234,5» thành 12345.
  // Nay: đúng cú pháp số của máy thì lấy theo máy, còn lại đọc theo chuẩn số Việt Nam (lib/chung/doc-so).
  return docSoMay(gt) ?? undefined;
}

// Học theo Taowordexcel/core/excel_builder.py:_clean_sheet_name — bỏ ký tự
// Excel cấm trong tên sheet, cắt 31 ký tự, tránh trùng tên.
const KY_TU_CAM_TEN_SHEET = /[[\]:*?/\\]/g;
function lamSachTenSheet(raw: string, daDung: Set<string>): string {
  let ten = raw.replace(KY_TU_CAM_TEN_SHEET, "").replace(/\n/g, " ").trim();
  if (!ten) ten = "Sheet1";
  ten = ten.slice(0, 31);
  if (!daDung.has(ten.toLowerCase())) {
    daDung.add(ten.toLowerCase());
    return ten;
  }
  let i = 2;
  while (true) {
    const hauTo = `_${i}`;
    const ung = ten.slice(0, 31 - hauTo.length) + hauTo;
    if (!daDung.has(ung.toLowerCase())) {
      daDung.add(ung.toLowerCase());
      return ung;
    }
    i++;
  }
}

const MAU_O_NHAP_TAY = "FFFFF2CC"; // vàng nhạt, giống quy ước file mẫu tham khảo

export async function buildXlsx(jsonText: string, tenGoi: string): Promise<KetQuaBaoCao> {
  let data: unknown;
  try {
    data = JSON.parse(boCodeFence(jsonText));
  } catch {
    return { loi: "JSON không hợp lệ." };
  }
  const hopLe = validateXlsxJson(data);
  if (!hopLe) return { loi: "JSON trả về không đúng schema — thiếu trường hoặc sai kiểu dữ liệu." };

  const wb = new ExcelJS.Workbook();
  const daDungTen = new Set<string>();
  for (const sheet of hopLe.sheets) {
    const ws = wb.addWorksheet(lamSachTenSheet(sheet.ten, daDungTen));

    if (sheet.rongCot) {
      for (const [cot, w] of Object.entries(sheet.rongCot)) {
        try { ws.getColumn(cot).width = w; } catch { /* tên cột lạ — bỏ qua */ }
      }
    }

    for (const o of sheet.oCells) {
      const cell = ws.getCell(o.dc);
      if (o.kieu === "formula") {
        cell.value = { formula: (o.gt as string).slice(1) };
      } else if (o.kieu === "number") {
        const so = docSo(o.gt);
        cell.value = so ?? String(o.gt);
      } else {
        cell.value = String(o.gt);
      }

      // Ô nhập tay tô vàng theo quy ước — đặt TRƯỚC màu nền do AI chỉ định để
      // nếu AI có ý đồ màu riêng cho ô đó thì màu của AI thắng.
      if (o.nhapTay) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MAU_O_NHAP_TAY } };
      }
      const nenArgb = mauArgb(o.nen);
      if (nenArgb) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: nenArgb } };
      }

      const mauChuArgb = mauArgb(o.mauChu);
      if (mauChuArgb || o.dam || o.nghieng || o.coChu || o.font) {
        cell.font = {
          ...(o.font ? { name: o.font } : {}),
          ...(o.coChu ? { size: o.coChu } : {}),
          ...(o.dam ? { bold: true } : {}),
          ...(o.nghieng ? { italic: true } : {}),
          ...(mauChuArgb ? { color: { argb: mauChuArgb } } : {}),
        };
      }

      if (o.canLe || o.xuongDong) {
        cell.alignment = {
          ...(o.canLe ? { horizontal: o.canLe } : {}),
          ...(o.xuongDong ? { wrapText: true } : {}),
        };
      }

      if (o.vien) {
        const net = { style: "thin" as const, color: { argb: "FF9CA3AF" } };
        cell.border = { top: net, left: net, bottom: net, right: net };
      }

      if (o.dinhDangSo) cell.numFmt = o.dinhDangSo;
    }

    // Gộp ô làm SAU cùng: exceljs xoá giá trị các ô bị gộp vào, nên phải ghi
    // giá trị trước rồi mới gộp, không thì mất nội dung ô góc trên-trái.
    for (const vung of sheet.oGop ?? []) {
      try { ws.mergeCells(vung); } catch { /* vùng chồng lấn — bỏ qua, giữ phần còn lại */ }
    }
  }

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { tenFile: `${tenGoi}.xlsx`, dinhDang: "xlsx", buffer };
}

// ─────────────────────────────────────────────────────────────────────────
// PPTX — schema slides (mỗi slide chọn 1 trong: bullets / bảng / biểu đồ)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Một "thành phần tự do" đặt ở toạ độ bất kỳ trên slide — thứ cho phép tái tạo
 * bố cục thật của file mẫu (dải nền màu, cột màu bên, thanh trang trí, logo,
 * nhiều khối chữ rời). Trước đây mỗi slide chỉ có "tiêu đề + 1 trong 3 loại nội
 * dung" nên dù AI đọc hiểu phong cách vẫn không có cách nào vẽ lại.
 *
 * Đơn vị x/y/w/h là INCH, gốc toạ độ góc trên-trái, khổ 16:9 = 10 x 5.63 inch —
 * trùng đơn vị mà lib/hoc-phong-cach.ts mô tả file mẫu, để AI dịch thẳng 1-1.
 */
interface ThanhPhanPptx {
  loai?: string; // "khoi" | "chu" | "anh"
  x?: number; y?: number; w?: number; h?: number;
  // loai="khoi": hình chữ nhật tô màu (dùng làm nền/dải trang trí)
  mau?: string;
  bo?: number; // bo góc 0..1 (0 = góc vuông)
  // loai="chu": hộp chữ
  text?: string;
  coChu?: number;
  mauChu?: string;
  dam?: boolean;
  nghieng?: boolean;
  canLe?: string; // "left" | "center" | "right"
  canDoc?: string; // "top" | "middle" | "bottom"
  giangCach?: number; // giãn dòng (bội số), vd 1.2
  // loai="anh": ảnh minh hoạ
  /** Ảnh đã tải sẵn (data URI) — route.ts điền vào sau khi tải từ mạng. */
  duLieu?: string;
  /** Địa chỉ ảnh trên mạng — server sẽ tải rồi nhúng. */
  url?: string;
  /** Từ khoá để server tự tìm ảnh nếu không có url. */
  tuKhoa?: string;
}

interface SlidePptx {
  tieuDe?: string;
  bullets?: string[];
  ghiChu?: string;
  bang?: { headers?: string[]; rows?: string[][] };
  bieuDo?: { loai?: string; nhan?: string[]; giaTri?: (number | string)[]; tenChuoi?: string };
  /** Màu nền riêng của slide này (ghi đè caiDat.nenSlide). */
  nen?: string;
  /** Các khối tự do vẽ TRƯỚC tiêu đề/nội dung (nền, dải màu, logo…). */
  thanhPhan?: ThanhPhanPptx[];
  /** Ẩn khối tiêu đề mặc định khi slide tự vẽ tiêu đề bằng thanhPhan. */
  anTieuDeMacDinh?: boolean;
}

const MAU_NHAN_PPTX = "1F3864"; // xanh đậm, hợp văn phong báo cáo hành chính
const FONT_PPTX = "Arial";
const MAU_CHU_PPTX = "222222";

/** Thiết lập chung cho cả bài trình chiếu (bắt chước file mẫu nếu có). */
interface CaiDatPptx {
  mauNhan?: string;
  mauChu?: string;
  font?: string;
  nenSlide?: string;
  coChuTieuDe?: number;
  coChuNoiDung?: number;
}

/** Khổ slide 16:9 của pptxgenjs — dùng để kẹp toạ độ, tránh khối rơi ra ngoài. */
const SLIDE_RONG = 10;
const SLIDE_CAO = 5.63;

/** Số inch hợp lệ trong phạm vi slide; ngoài khoảng thì trả undefined để bỏ khối. */
function soInch(v: unknown, toiDa: number): number | undefined {
  const n = docSo(v);
  if (n === undefined || n < -toiDa || n > toiDa * 2) return undefined;
  return n;
}

/**
 * Vẽ các khối tự do (nền màu / hộp chữ / ảnh) lên slide.
 *
 * Khối nào thiếu toạ độ hoặc sai kiểu thì BỎ RIÊNG khối đó — hỏng một mảnh
 * trang trí không đáng để mất cả bài trình chiếu.
 */
function veThanhPhanTuDo(
  slide: PptxGenJS.Slide,
  ds: ThanhPhanPptx[] | undefined,
  fontMacDinh: string,
  mauChuMacDinh: string
): void {
  if (!Array.isArray(ds)) return;
  for (const tp of ds.slice(0, 24)) {
    if (!tp || typeof tp !== "object") continue;
    const x = soInch(tp.x, SLIDE_RONG);
    const y = soInch(tp.y, SLIDE_CAO);
    const w = soInch(tp.w, SLIDE_RONG);
    const h = soInch(tp.h, SLIDE_CAO);
    if (x === undefined || y === undefined) continue;

    if (tp.loai === "khoi") {
      const mau = mauHex(tp.mau);
      if (!mau || w === undefined || h === undefined || w <= 0 || h <= 0) continue;
      const boGoc = docSo(tp.bo);
      slide.addShape("rect", {
        x, y, w, h,
        fill: { color: mau },
        line: { color: mau, width: 0 },
        ...(boGoc !== undefined && boGoc > 0 ? { rectRadius: Math.min(boGoc, 1) } : {}),
      });
      continue;
    }

    if (tp.loai === "chu") {
      const text = String(tp.text ?? "").trim();
      if (!text) continue;
      const canLe = tp.canLe === "center" || tp.canLe === "right" || tp.canLe === "left" ? tp.canLe : "left";
      const canDoc = tp.canDoc === "middle" || tp.canDoc === "bottom" || tp.canDoc === "top" ? tp.canDoc : "top";
      const co = docSo(tp.coChu);
      const gian = docSo(tp.giangCach);
      slide.addText(text, {
        x, y,
        w: w !== undefined && w > 0 ? w : 9,
        h: h !== undefined && h > 0 ? h : 0.6,
        fontSize: co !== undefined && co > 0 && co < 200 ? co : 16,
        color: mauHex(tp.mauChu) ?? mauChuMacDinh,
        fontFace: fontMacDinh,
        bold: tp.dam === true,
        italic: tp.nghieng === true,
        align: canLe,
        valign: canDoc,
        ...(gian !== undefined && gian > 0 ? { lineSpacingMultiple: Math.min(gian, 3) } : {}),
      });
      continue;
    }

    if (tp.loai === "anh") {
      // Chỉ nhận ảnh ĐÃ TẢI SẴN (data URI). Việc tải từ mạng làm ở tầng route
      // trước khi gọi build — hàm dựng file phải thuần tuý, không tự đi mạng.
      const du = typeof tp.duLieu === "string" ? tp.duLieu.trim() : "";
      if (!du.startsWith("data:image/")) continue;
      if (w === undefined || h === undefined || w <= 0 || h <= 0) continue;
      try {
        slide.addImage({ data: du, x, y, w, h });
      } catch { /* ảnh hỏng — bỏ qua, giữ phần còn lại của slide */ }
    }
  }
}

export async function buildPptx(jsonText: string, tenGoi: string): Promise<KetQuaBaoCao> {
  let data: unknown;
  try {
    data = JSON.parse(boCodeFence(jsonText));
  } catch {
    return { loi: "JSON không hợp lệ." };
  }
  const slides = (data as { slides?: unknown[] })?.slides;
  if (!Array.isArray(slides) || slides.length === 0) {
    return { loi: "Thiếu trường 'slides' hoặc rỗng." };
  }

  // Thiết lập trình bày: lấy theo file mẫu nếu AI chỉ định, không thì dùng mặc định.
  const cd = (data as { caiDat?: CaiDatPptx })?.caiDat;
  const mauNhan = mauHex(cd?.mauNhan) ?? MAU_NHAN_PPTX;
  const mauChu = mauHex(cd?.mauChu) ?? MAU_CHU_PPTX;
  const nenSlide = mauHex(cd?.nenSlide);
  const font = typeof cd?.font === "string" && cd.font.trim() ? cd.font.trim() : FONT_PPTX;
  const coTieuDe = typeof cd?.coChuTieuDe === "number" && cd.coChuTieuDe > 0 && cd.coChuTieuDe < 200
    ? cd.coChuTieuDe : 26;
  const coNoiDung = typeof cd?.coChuNoiDung === "number" && cd.coChuNoiDung > 0 && cd.coChuNoiDung < 200
    ? cd.coChuNoiDung : 16;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9"; // 10 x 5,63 inch
  const tieuDeChung = (data as { tieuDeChung?: unknown }).tieuDeChung;
  if (typeof tieuDeChung === "string" && tieuDeChung.trim()) pptx.title = tieuDeChung.trim();

  let daDung = 0;
  for (const raw of slides as SlidePptx[]) {
    if (!raw || typeof raw !== "object") continue;
    const slide = pptx.addSlide();
    const nenRieng = mauHex(raw.nen) ?? nenSlide;
    if (nenRieng) slide.background = { color: nenRieng };

    // Khối tự do vẽ TRƯỚC để nằm dưới cùng (dải nền, cột màu, logo…). PowerPoint
    // xếp lớp theo thứ tự thêm vào, nên vẽ nền trước rồi mới đến chữ.
    veThanhPhanTuDo(slide, raw.thanhPhan, font, mauChu);

    const tieuDe = String(raw.tieuDe ?? "").trim();
    if (tieuDe && raw.anTieuDeMacDinh !== true) {
      slide.addText(tieuDe, {
        x: 0.5, y: 0.35, w: 9, h: 0.8,
        fontSize: coTieuDe, bold: true, color: mauNhan, fontFace: font,
      });
    }

    if (Array.isArray(raw.bullets) && raw.bullets.length) {
      slide.addText(
        raw.bullets.slice(0, 8).map((t) => ({ text: String(t), options: { bullet: true } })),
        { x: 0.7, y: 1.4, w: 8.6, h: 3.6, fontSize: coNoiDung, fontFace: font, color: mauChu }
      );
    } else if (raw.bang && (Array.isArray(raw.bang.headers) || Array.isArray(raw.bang.rows))) {
      const headers = Array.isArray(raw.bang.headers) ? raw.bang.headers.map(String) : [];
      const rows = Array.isArray(raw.bang.rows)
        ? raw.bang.rows.filter(Array.isArray).map((r) => r.map(String))
        : [];
      const bangPptx: { text: string; options?: Record<string, unknown> }[][] = [];
      if (headers.length) {
        bangPptx.push(headers.map((h) => ({
          text: h,
          options: { bold: true, color: "FFFFFF", fill: { color: mauNhan } },
        })));
      }
      for (const r of rows) bangPptx.push(r.map((c) => ({ text: c })));
      if (bangPptx.length) {
        slide.addTable(bangPptx, {
          x: 0.5, y: 1.4, w: 9,
          fontSize: 12, fontFace: font, border: { type: "solid", pt: 1, color: "BFBFBF" },
        });
      }
    } else if (raw.bieuDo) {
      const nhan = Array.isArray(raw.bieuDo.nhan) ? raw.bieuDo.nhan.map(String) : [];
      const giaTri = Array.isArray(raw.bieuDo.giaTri)
        ? raw.bieuDo.giaTri.map((v) => docSo(v) ?? 0)
        : [];
      if (nhan.length && nhan.length === giaTri.length) {
        // Chỉ nhận 3 loại đã hứa trong prompt; loại lạ thì về cột cho chắc hiển thị.
        const loai = raw.bieuDo.loai === "tron" ? "pie" : raw.bieuDo.loai === "duong" ? "line" : "bar";
        slide.addChart(
          loai as Parameters<typeof slide.addChart>[0],
          [{ name: String(raw.bieuDo.tenChuoi ?? tieuDe ?? "Số liệu"), labels: nhan, values: giaTri }],
          { x: 0.8, y: 1.4, w: 8.4, h: 3.7, showLegend: loai === "pie", showValue: loai !== "pie" }
        );
      }
    }

    if (typeof raw.ghiChu === "string" && raw.ghiChu.trim()) slide.addNotes(raw.ghiChu.trim());
    daDung++;
  }

  if (daDung === 0) return { loi: "Không dựng được slide nào từ 'slides'." };

  const buffer = Buffer.from((await pptx.write({ outputType: "nodebuffer" })) as Uint8Array);
  return { tenFile: `${tenGoi}.pptx`, dinhDang: "pptx", buffer };
}

// ─────────────────────────────────────────────────────────────────────────
// KML — schema doiTuong (điểm / đường / vùng), tự sinh XML chuẩn Google Earth
// ─────────────────────────────────────────────────────────────────────────

interface DoiTuongKml {
  loai?: string;
  ten?: string;
  moTa?: string;
  toaDo?: unknown;
}

function thoatXml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Một cặp [kinhĐộ, vĩĐộ] hợp lệ trên Trái Đất, hay là rác cần bỏ? */
function capToaDo(v: unknown): [number, number] | undefined {
  if (!Array.isArray(v) || v.length < 2) return undefined;
  const kinh = docSo(v[0]);
  const vi = docSo(v[1]);
  if (kinh === undefined || vi === undefined) return undefined;
  if (kinh < -180 || kinh > 180 || vi < -90 || vi > 90) return undefined;
  return [kinh, vi];
}

export async function buildKml(jsonText: string, tenGoi: string): Promise<KetQuaBaoCao> {
  let data: unknown;
  try {
    data = JSON.parse(boCodeFence(jsonText));
  } catch {
    return { loi: "JSON không hợp lệ." };
  }
  const ds = (data as { doiTuong?: unknown[] })?.doiTuong;
  if (!Array.isArray(ds) || ds.length === 0) return { loi: "Thiếu trường 'doiTuong' hoặc rỗng." };

  const phanTu: string[] = [];
  for (const raw of ds as DoiTuongKml[]) {
    if (!raw || typeof raw !== "object") continue;
    const ten = thoatXml(String(raw.ten ?? "Không tên"));
    const moTa = raw.moTa ? `\n      <description>${thoatXml(String(raw.moTa))}</description>` : "";

    if (raw.loai === "diem") {
      const c = capToaDo(raw.toaDo);
      if (!c) continue;
      phanTu.push(`    <Placemark>
      <name>${ten}</name>${moTa}
      <Point><coordinates>${c[0]},${c[1]},0</coordinates></Point>
    </Placemark>`);
    } else if (raw.loai === "duong" || raw.loai === "vung") {
      const diem = Array.isArray(raw.toaDo)
        ? raw.toaDo.map(capToaDo).filter((c): c is [number, number] => !!c)
        : [];
      const toiThieu = raw.loai === "vung" ? 3 : 2;
      if (diem.length < toiThieu) continue;
      // Vùng phải khép kín: KML yêu cầu điểm cuối trùng điểm đầu.
      if (raw.loai === "vung") {
        const dau = diem[0];
        const cuoi = diem[diem.length - 1];
        if (dau[0] !== cuoi[0] || dau[1] !== cuoi[1]) diem.push([dau[0], dau[1]]);
      }
      const toaDoStr = diem.map(([x, y]) => `${x},${y},0`).join(" ");
      const hinh = raw.loai === "duong"
        ? `<LineString><tessellate>1</tessellate><coordinates>${toaDoStr}</coordinates></LineString>`
        : `<Polygon><outerBoundaryIs><LinearRing><coordinates>${toaDoStr}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
      phanTu.push(`    <Placemark>
      <name>${ten}</name>${moTa}
      <styleUrl>#${raw.loai === "duong" ? "kieuDuong" : "kieuVung"}</styleUrl>
      ${hinh}
    </Placemark>`);
    }
  }

  if (phanTu.length === 0) {
    return { loi: "Không có đối tượng nào hợp lệ — toạ độ thiếu hoặc nằm ngoài phạm vi Trái Đất (kinh độ -180..180, vĩ độ -90..90)." };
  }

  const tenLop = thoatXml(String((data as { ten?: unknown }).ten ?? "Bản đồ SCI"));
  const moTaLop = (data as { moTa?: unknown }).moTa;
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${tenLop}</name>${moTaLop ? `\n    <description>${thoatXml(String(moTaLop))}</description>` : ""}
    <Style id="kieuDuong">
      <LineStyle><color>ff0000ff</color><width>3</width></LineStyle>
    </Style>
    <Style id="kieuVung">
      <LineStyle><color>ff00a5ff</color><width>2</width></LineStyle>
      <PolyStyle><color>4d00a5ff</color></PolyStyle>
    </Style>
${phanTu.join("\n")}
  </Document>
</kml>
`;
  return { tenFile: `${tenGoi}.kml`, dinhDang: "kml", buffer: Buffer.from(kml, "utf-8") };
}

// ─────────────────────────────────────────────────────────────────────────
// DXF — schema doiTuong hình học, sinh DXF R12 (AC1009) ASCII
//
// Cố ý chỉ dùng 4 thực thể LINE/CIRCLE/TEXT/POINT: đó là tập lệnh có từ bản R12
// nên MỌI phần mềm CAD đều đọc được. Đa đường và hình chữ nhật được tách thành
// nhiều LINE thay vì dùng LWPOLYLINE (chỉ có từ R14, phần mềm cũ không hiểu).
// ─────────────────────────────────────────────────────────────────────────

interface DoiTuongDxf {
  loai?: string;
  diem?: unknown;
  kin?: boolean;
  goc?: unknown;
  rong?: unknown;
  cao?: unknown;
  tam?: unknown;
  banKinh?: unknown;
  viTri?: unknown;
  text?: unknown;
}

/** Một cặp [x, y] là số thực hữu hạn, hay là rác cần bỏ? */
function capXY(v: unknown): [number, number] | undefined {
  if (!Array.isArray(v) || v.length < 2) return undefined;
  const x = docSo(v[0]);
  const y = docSo(v[1]);
  return x === undefined || y === undefined ? undefined : [x, y];
}

/** Mã nhóm DXF: mỗi giá trị nằm trên 1 dòng, đứng ngay sau dòng mã số của nó. */
const gDxf = (ma: number | string, gt: number | string) => `${ma}\n${gt}\n`;

function dxfLine(a: [number, number], b: [number, number], lop: string): string {
  return gDxf(0, "LINE") + gDxf(8, lop)
    + gDxf(10, a[0]) + gDxf(20, a[1]) + gDxf(30, 0)
    + gDxf(11, b[0]) + gDxf(21, b[1]) + gDxf(31, 0);
}

export async function buildDxf(jsonText: string, tenGoi: string): Promise<KetQuaBaoCao> {
  let data: unknown;
  try {
    data = JSON.parse(boCodeFence(jsonText));
  } catch {
    return { loi: "JSON không hợp lệ." };
  }
  const ds = (data as { doiTuong?: unknown[] })?.doiTuong;
  if (!Array.isArray(ds) || ds.length === 0) return { loi: "Thiếu trường 'doiTuong' hoặc rỗng." };

  const lop = "0"; // lớp mặc định, luôn tồn tại nên khỏi khai báo bảng TABLES
  let ents = "";
  let daDung = 0;

  for (const raw of ds as DoiTuongDxf[]) {
    if (!raw || typeof raw !== "object") continue;

    if (raw.loai === "duong" || raw.loai === "daDuong") {
      const diem = Array.isArray(raw.diem)
        ? raw.diem.map(capXY).filter((c): c is [number, number] => !!c)
        : [];
      if (diem.length < 2) continue;
      for (let i = 0; i < diem.length - 1; i++) ents += dxfLine(diem[i], diem[i + 1], lop);
      if (raw.kin === true && diem.length > 2) ents += dxfLine(diem[diem.length - 1], diem[0], lop);
      daDung++;
    } else if (raw.loai === "chuNhat") {
      const goc = capXY(raw.goc);
      const rong = docSo(raw.rong);
      const cao = docSo(raw.cao);
      if (!goc || rong === undefined || cao === undefined) continue;
      const [x, y] = goc;
      const dinh: [number, number][] = [[x, y], [x + rong, y], [x + rong, y + cao], [x, y + cao]];
      for (let i = 0; i < 4; i++) ents += dxfLine(dinh[i], dinh[(i + 1) % 4], lop);
      daDung++;
    } else if (raw.loai === "tron") {
      const tam = capXY(raw.tam);
      const r = docSo(raw.banKinh);
      if (!tam || r === undefined || r <= 0) continue;
      ents += gDxf(0, "CIRCLE") + gDxf(8, lop) + gDxf(10, tam[0]) + gDxf(20, tam[1]) + gDxf(30, 0) + gDxf(40, r);
      daDung++;
    } else if (raw.loai === "diem") {
      const p = capXY(raw.viTri);
      if (!p) continue;
      ents += gDxf(0, "POINT") + gDxf(8, lop) + gDxf(10, p[0]) + gDxf(20, p[1]) + gDxf(30, 0);
      daDung++;
    } else if (raw.loai === "chu") {
      const p = capXY(raw.viTri);
      const text = String(raw.text ?? "").replace(/\r?\n/g, " ").trim();
      if (!p || !text) continue;
      const coChu = docSo(raw.cao) ?? 2.5;
      ents += gDxf(0, "TEXT") + gDxf(8, lop) + gDxf(10, p[0]) + gDxf(20, p[1]) + gDxf(30, 0)
        + gDxf(40, coChu) + gDxf(1, text);
      daDung++;
    }
  }

  if (daDung === 0) return { loi: "Không có đối tượng hình học nào hợp lệ (thiếu toạ độ hoặc kích thước)." };

  const dxf =
    gDxf(0, "SECTION") + gDxf(2, "HEADER") +
    gDxf(9, "$ACADVER") + gDxf(1, "AC1009") +
    gDxf(9, "$INSBASE") + gDxf(10, 0) + gDxf(20, 0) + gDxf(30, 0) +
    gDxf(0, "ENDSEC") +
    gDxf(0, "SECTION") + gDxf(2, "ENTITIES") + ents + gDxf(0, "ENDSEC") +
    gDxf(0, "EOF");

  return { tenFile: `${tenGoi}.dxf`, dinhDang: "dxf", buffer: Buffer.from(dxf, "utf-8") };
}

// ─────────────────────────────────────────────────────────────────────────
// Markdown / SVG / Mermaid / Graphviz — nội dung vốn là chữ, chỉ cần kiểm dạng
// ─────────────────────────────────────────────────────────────────────────

export type DinhDangChu = "md" | "svg" | "mmd" | "dot";

const LOI_SAI_DANG: Record<DinhDangChu, string> = {
  md: "Nội dung rỗng.",
  svg: "Không phải SVG hợp lệ — thiếu thẻ <svg>.",
  mmd: "Không phải mã Mermaid hợp lệ — dòng đầu phải là loại sơ đồ (flowchart TD, sequenceDiagram, pie…).",
  dot: "Không phải mã Graphviz hợp lệ — phải bắt đầu bằng digraph Ten { hoặc graph Ten {.",
};

export async function buildVanBan(
  noiDung: string,
  tenGoi: string,
  dd: DinhDangChu
): Promise<KetQuaBaoCao> {
  const nd = boCodeFence(noiDung).trim();
  if (!KIEM_TRA_KHOI[dd](nd)) return { loi: LOI_SAI_DANG[dd] };
  // SVG có thể kèm <image href="http…"> làm ảnh trắng khi mở offline — gỡ như với HTML.
  const sach = dd === "svg"
    ? nd.replace(/<image\b[^>]*\bhref\s*=\s*["']https?:\/\/[^"']*["'][^>]*\/?>/gi, "")
    : nd;
  return { tenFile: `${tenGoi}.${dd}`, dinhDang: dd, buffer: Buffer.from(sach, "utf-8") };
}
