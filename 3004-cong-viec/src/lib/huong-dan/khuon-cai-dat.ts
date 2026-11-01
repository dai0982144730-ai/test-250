// ============================================================
// KHUÔN HƯỚNG DẪN CHO MỘT MỤC CÀI ĐẶT — dùng chung cho các mục cùng một trình sửa (nhom.tsx): Tổng quan, «Lưu · Nhật ký · Quay lại»,
// «Hay vướng» giống nhau ở khung, chỉ khác nội dung từng mục. Mỗi mục vẫn là MỘT hướng dẫn riêng (mã cd-<khoa mục>) với ví dụ riêng.
// Thuần (luật 10). Nhãn nút chép từ TrangCaiDat.tsx / nhom.tsx (20/10/2026).
// ============================================================
import type { HuongDanTab, KhoiHD, TabHD } from "./kieu";

export interface MucCaiDat {
  /** Tên mục đúng như trên màn, vd «Hạn việc, quá hạn, nhắc việc» */
  tieuDe: string;
  /** Tab ngang chứa mục, vd «🔔 Cảnh báo & ngưỡng» */
  tab: string;
  /** Ai được SỬA mục này (ai chỉ XEM thì thấy nhãn «chỉ xem», nút Lưu bị ẩn) */
  ai: string;
  /** ① Mục này là gì (lời thường) */
  laGi: string[];
  /** ② Vì sao cần mục này */
  vaoSao: string[];
  /** ③ Nằm ở đâu trong vòng làm việc: bước trước → mục này → bước sau */
  vongLam: string[];
  /** ④ Các khối / ô trên màn: [khối, để làm gì, xem tab nào] */
  cacKhoi: string[][];
  /** Việc của Người · Máy · 🤖 AI (mỗi phần một dòng, «—» nếu không có) */
  nguoi: string;
  may: string;
  aiLam: string;
  /** ⑥ Quy trình người ↔ AI từng bước; mục không dùng AI thì truyền null */
  quyTrinhAI: string[] | null;
  /** Các tab nội dung giữa Tổng quan và Hay vướng */
  buoc: TabHD[];
  /** Ví dụ cho tab «Lưu · Nhật ký · Quay lại» (đổi thật một ô của mục này) */
  viDuLuu: string[];
  /** Mục chỉ để XEM (không có ô nhập, không có nút Lưu) → bỏ tab «Lưu · Nhật ký · Quay lại» */
  chiXem?: boolean;
  /** Bảng «Hay vướng»: [gặp chuyện, vì sao · làm gì] */
  vuong: string[][];
  canCu: string;
}

const KHOI_LUU: (m: MucCaiDat) => KhoiHD[] = (m) => [
  { doan: [`Mỗi lần đổi một ô của «${m.tieuDe}» là đổi cách máy làm việc cho cả hệ thống, nên màn không lưu ngay khi bạn gõ. Bạn sửa nháp trước, thấy đúng mới bấm «Lưu».`] },
  {
    tieuDe: "Bấm gì, theo thứ tự",
    bam: [
      "Sửa các ô theo ý bạn. Ô nào bạn đã đổi so với bản đang chạy thì màn nhớ là «đã đổi».",
      "Muốn bỏ hết sửa nháp: bấm «Bỏ thay đổi» (xuất hiện khi có thay đổi). Muốn điền lại giá trị gốc của phần mềm: bấm «Điền mặc định» (xuất hiện khi giá trị khác mặc định; chưa lưu, vẫn phải bấm «Lưu»).",
      "Bấm «Lưu». Máy kiểm tra trước: kiểu dữ liệu, giới hạn nhỏ nhất lớn nhất, luật liên quan. Sai thì hiện khung đỏ «Chưa lưu được — cấu hình chưa hợp lệ:» kèm từng dòng lỗi, chưa có gì bị ghi.",
      "Đúng hết thì máy lưu thành một PHIÊN BẢN mới (v1, v2…) và báo «Đã lưu … → phiên bản N. Có hiệu lực ngay.» Mọi chỗ trong ứng dụng dùng giá trị mới từ giây đó.",
    ],
  },
  {
    tieuDe: "Nút «JSON nâng cao»",
    doan: ["Dành cho người rành kỹ thuật: bấm «JSON nâng cao» để sửa cả nhóm dưới dạng văn bản, bấm «Về biểu mẫu» để trở lại ô nhập thường. Khi lưu, máy vẫn kiểm tra y như biểu mẫu. Người bình thường không cần dùng."],
  },
  { viDu: m.viDuLuu },
  {
    ketQua: [
      "Cột bên phải «Nhật ký phiên bản» thêm một dòng: «Phiên bản N · tên người sửa · giờ · từng ô đổi từ gì sang gì». Phiên bản đang chạy có chữ «ĐANG DÙNG».",
      "Nút «Lưu» sáng chỉ khi có thay đổi chưa lưu.",
    ],
  },
  {
    luuY: [
      "Người không có quyền sửa mục này thấy nhãn «chỉ xem» và KHÔNG thấy các nút «Lưu», «Bỏ thay đổi», «Điền mặc định» (nút không có quyền bấm thì ẩn hẳn, đúng luật riêng của ứng dụng này).",
      "Đổi cài đặt không viết lại được lịch sử: bản cũ vẫn nằm trong nhật ký.",
    ],
  },
];

const KHOI_QUAY_LAI: KhoiHD[] = [
  { tieuDe: "Lỡ đổi sai thì sao", doan: ["Lỡ đổi sai thì quay lại, không cần nhớ giá trị cũ. Mỗi dòng trong cột «Nhật ký phiên bản» cho biết ai đổi ô nào từ gì sang gì."] },
  {
    tieuDe: "Quay lại bản cũ",
    bam: [
      "Ở cột «Nhật ký phiên bản», tìm dòng phiên bản bạn muốn quay về.",
      "Bấm «Quay lại bản này» ở dòng đó (dòng đang chạy không có nút này), rồi bấm xác nhận trong hộp hỏi «Quay lại phiên bản …?».",
      "Muốn về hẳn giá trị gốc của phần mềm: bấm «Quay về mặc định» ở cuối cột nhật ký, xác nhận «Quay về giá trị mặc định ban đầu?».",
    ],
  },
  { ketQua: ["Máy KHÔNG xoá phiên bản nào: nó tạo một phiên bản mới mang giá trị cũ, có hiệu lực ngay. Nhật ký vẫn giữ trọn lịch sử."] },
  { luuY: ["Nút quay lại cũng chỉ hiện với người có quyền sửa mục này."] },
];

/** Tab «Lưu · Nhật ký · Quay lại» — giống nhau ở mọi mục dùng trình sửa nhóm, chỉ khác ví dụ */
export function tabLuuNhatKy(m: MucCaiDat): TabHD {
  return { ten: "Lưu · Nhật ký · Quay lại", khoi: [...KHOI_LUU(m), ...KHOI_QUAY_LAI] };
}

function tabTongQuan(m: MucCaiDat): TabHD {
  const khoi: KhoiHD[] = [
    { tieuDe: "① Mục này là gì", doan: m.laGi },
    { tieuDe: "② Vì sao cần", doan: m.vaoSao },
    { tieuDe: "③ Nằm ở đâu trong vòng làm việc", doan: m.vongLam },
    { tieuDe: "④ Các khối trên màn", bang: [["Khối / ô", "Để làm gì", "Xem tab"], ...m.cacKhoi] },
    {
      tieuDe: "⑤ Ai làm gì: Người · Máy · 🤖 AI",
      bang: [
        ["Bên", "Làm gì ở mục này"],
        ["Người", m.nguoi],
        ["Máy", m.may],
        ["🤖 AI", m.aiLam],
      ],
    },
    m.quyTrinhAI
      ? { tieuDe: "⑥ Quy trình người ↔ AI", bam: m.quyTrinhAI }
      : { tieuDe: "⑥ Quy trình người ↔ AI", doan: ["Mục này không dùng AI: người chỉnh, máy áp dụng đúng như đã chỉnh, cùng đầu vào luôn ra cùng kết quả."] },
    {
      luuY: [
        `Mục nằm ở tab «${m.tab}» của màn Cài đặt (menu tên người → Cài đặt).`,
        ...(m.chiXem ? [] : ["Ai đăng nhập cũng XEM được; chỉ người có quyền mới SỬA được (xem tab «Lưu · Nhật ký · Quay lại»)."]),
      ],
    },
  ];
  return { ten: "Tổng quan", khoi };
}

function tabVuong(m: MucCaiDat): TabHD {
  return { ten: "Hay vướng", khoi: [{ bang: [["Gặp chuyện", "Vì sao · làm gì"], ...m.vuong] }] };
}

/** Dựng hướng dẫn đầy đủ cho một mục cài đặt dùng trình sửa nhóm: Tổng quan · các bước riêng · Lưu · Hay vướng */
export function huongDanMucCaiDat(m: MucCaiDat): HuongDanTab {
  return {
    tieuDe: `Cài đặt — ${m.tieuDe}`,
    ai: m.ai,
    tab: [tabTongQuan(m), ...m.buoc, ...(m.chiXem ? [] : [tabLuuNhatKy(m)]), tabVuong(m)],
    canCu: m.canCu,
  };
}
