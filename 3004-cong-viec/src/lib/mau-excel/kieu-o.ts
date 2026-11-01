// ============================================================
// mau-excel/kieu-o.ts — LUẬT TRÌNH BÀY Ô của mẫu báo cáo Excel, MỘT chỗ khai (luật 7) cho tờ ghi, tờ ví dụ, tờ hướng dẫn.
// Đồng bộ với biểu mẫu agent Tiến độ (Mr. Đại chốt 22/10/2026 — «người dùng không bị lệch quy chiếu chung»), đo từ tệp
// «Mẫu báo cáo tuần - HV - Ban điều hành» của 3003:
//   NỀN ĐỎ  FBDADA — nơi ghi, ghi sai thì máy HIỂU SAI (ở đây: hạn, tình trạng, dự án, người phụ trách của việc)
//   NỀN XANH D6E6FA — nơi ghi THEO KỲ, ghi sai thì GHI ĐÈ báo cáo đã nộp / vào nhầm kỳ, nhầm đơn vị
//   CHỮ ĐỎ C00000 · CHỮ XANH 1F4E9A — máy in sẵn, KHÔNG SỬA ·  dấu * — phải ghi ·  ô trắng có khung — ghi tự do
//   tên chương / dòng nhóm nền be EFEBE4 · hàng tên cột nền xám E5E7EB · chữ nhắc xám 6B7280 · chữ in sẵn xám đậm 374151
// Mỗi ô ghi có LỜI NHẮC (rê chuột vào là hiện, như 3003) — chữ lấy từ bảng HD bên dưới, tờ Hướng dẫn dùng đúng chữ đó.
// ============================================================

export const MAU_O = {
  nenDo: "FFFBDADA",
  nenXanh: "FFD6E6FA",
  chuDo: "FFC00000",
  chuXanh: "FF1F4E9A",
  nenBe: "FFEFEBE4",
  nenXam: "FFE5E7EB",
  chuNhac: "FF6B7280",
  chuInSan: "FF374151",
  khung: "FFBFBFBF",
  nenViDu: "FFFFF1E0",
  chuCam: "FFC2724F",
} as const;

/** Loại ô theo hậu quả ghi sai */
export type LoaiO = "do" | "xanh" | "trang";

export interface HuongDanO {
  /** Ghi gì — cũng là lời nhắc khi rê chuột */
  ghi: string;
  /** Máy dùng để làm gì */
  de: string;
  /** Ghi sai thì sao */
  sai: string;
}

/** Danh sách chọn (tag bảng.tag cột, hoặc tag cột dùng chung). Cảnh báo chứ không cấm — máy vẫn đọc chữ gõ tay. */
const DS_CHON: Record<string, string[]> = {
  "bang_cong_viec.tinh_trang": ["Chưa làm", "Đang làm", "Đã xong", "Dừng"],
  "bang_kien_nghi.muc_do": ["Khẩn cấp", "Cần quyết định", "Cần phê duyệt", "Cần sớm xử lý", "Theo dõi", "Thông tin"],
  "bang_kpi.tinh_trang": ["Bình thường", "Chú ý", "Cảnh báo"],
  "bang_du_an.trang_thai": ["Chuẩn bị đầu tư", "Thi công", "Vận hành", "Hoàn thành"],
  "bang_du_an.loai_hinh": ["Thủy điện", "Điện gió", "Điện mặt trời", "Đường dây - TBA", "Mỏ khai thác", "Hạ tầng"],
  "bang_gpmb.tinh_trang": ["Đã thỏa thuận", "Đang đàm phán", "Chờ văn bản", "Khiếu nại", "Đã bàn giao"],
  "bang_gpmb.loai_dat": ["Đất nông nghiệp", "Đất ở + vườn", "Đất rừng sản xuất", "Đất rừng phòng hộ", "Đất khác"],
  "bang_khoi_luong.don_vi": ["m³", "m²", "md", "tấn", "cái", "bộ", "ngày công"],
};

export function dsChon(bang: string, cot: string, dsWord?: string[]): string[] | undefined {
  return DS_CHON[`${bang}.${cot}`] ?? (dsWord?.length ? dsWord : undefined);
}

/** Bảng sinh việc: các cột ghi sai thì việc trong sổ theo dõi sai → NỀN ĐỎ */
const COT_DO_BANG_VIEC = new Set(["ket_thuc", "tinh_trang", "du_an", "phu_trach", "han_quyet_dinh", "ngay_ke_hoach", "pt_ht"]);
/** Cột phải ghi (dấu *) của bảng sinh việc */
const COT_BAT_BUOC_VIEC = new Set(["ten", "ket_thuc"]);

export function loaiCot(laBangViec: boolean, tag: string): { loai: LoaiO; batBuoc: boolean } {
  if (!laBangViec) return { loai: "trang", batBuoc: false };
  return { loai: COT_DO_BANG_VIEC.has(tag) ? "do" : "trang", batBuoc: COT_BAT_BUOC_VIEC.has(tag) };
}

/** Cột ngày: ô dạng CHỮ, Excel không tự đổi 05/08 thành ngày kiểu Mỹ. */
export const COT_NGAY = new Set(["bat_dau", "ket_thuc", "han_quyet_dinh", "han", "ngay_ke_hoach"]);
/** Cột ngày bắt buộc đúng 10 ký tự dd/mm/yyyy (Kết thúc còn nhận «N ngày sau khi xong …» nên không ép) */
export const COT_NGAY_10 = new Set(["bat_dau", "han_quyet_dinh", "ngay_ke_hoach"]);

// ---------------- chữ hướng dẫn từng ô / cột ----------------

const SO_VN = "Chỉ ghi số theo chuẩn Việt Nam («1.234,5»). Không có số liệu thì ghi «—».";

const HD_O: Record<string, HuongDanO> = {
  gui_den: {
    ghi: "Nơi nhận báo cáo. Mẫu ghi sẵn nơi nhận mặc định — đúng thì để nguyên.",
    de: "Máy gửi báo cáo tới đơn vị này; lúc nộp vẫn chọn thêm được nơi nhận.",
    sai: "Tên đơn vị không có trong hệ thống → máy cảnh báo, gửi theo nơi nhận mặc định.",
  },
  don_vi_lap: {
    ghi: "Tên đơn vị lập báo cáo. Mẫu dùng chung (BQLDA, nhà máy, ban điều hành): thay «......» bằng đúng tên đơn vị.",
    de: "Máy biết báo cáo của đơn vị nào. Người nộp phải thuộc đơn vị đó (chính hoặc kiêm nhiệm).",
    sai: "Để «......» hoặc sai tên → không nộp được, hoặc báo cáo GHI ĐÈ lên báo cáo của đơn vị khác.",
  },
  ky_bao_cao: {
    ghi: "Số tuần/năm và khoảng ngày Thứ Hai → Chủ nhật, vd «Tuần 43/2026 (19/10/2026 – 25/10/2026)». Máy ghi sẵn tuần lúc tải mẫu — soát lại trước khi nộp.",
    de: "Máy xếp báo cáo vào đúng kỳ, tính đơn vị đã nộp / chưa nộp.",
    sai: "Để nguyên kỳ cũ → GHI ĐÈ báo cáo đã nộp kỳ đó, kỳ này vẫn tính chưa nộp. Số tuần lệch khoảng ngày → không nộp được.",
  },
};

const HD_COT: Record<string, HuongDanO> = {
  // bảng việc (sinh việc vào sổ theo dõi)
  ten: {
    ghi: "Mỗi dòng MỘT việc. Muốn ghi mô tả thì xuống dòng trong ô (Alt + Enter). Việc kỳ trước chưa xong phải ghi lại.",
    de: "Mỗi dòng thành một việc trong sổ theo dõi; kỳ sau máy soát báo cáo có ghi lại đủ việc kỳ này không.",
    sai: "Nhiều việc chung một ô → chỉ tính là một việc. Dòng CHỈ ghi ô này (vd «SCI QUẢNG TRỊ») → máy hiểu là tên nhóm, không thành việc.",
  },
  du_an: { ghi: "Tên dự án việc thuộc về.", de: "Gắn việc vào đúng dự án để lọc, tổng hợp.", sai: "Sai tên → việc gắn nhầm dự án." },
  phu_trach: { ghi: "Đơn vị hoặc người phụ trách việc.", de: "Máy giao việc cho đúng người / đơn vị.", sai: "Tên không có trong danh bạ → máy cảnh báo, việc giao về đơn vị lập." },
  bat_dau: { ghi: "Ngày bắt đầu, ghi đủ dd/mm/yyyy.", de: "Biết việc chạy từ khi nào.", sai: "Để trống → máy lấy ngày nộp. Không đủ 10 ký tự dd/mm/yyyy → Excel báo lỗi ngay." },
  ket_thuc: {
    ghi: "Ngày phải xong dd/mm/yyyy, hoặc «N ngày sau khi xong <tên việc>» khi chưa biết ngày.",
    de: "Hạn của việc: máy nhắc trước hạn, báo quá hạn.",
    sai: "Bỏ trống hoặc sai dạng → máy báo lỗi đúng dòng; việc không hạn thành việc treo.",
  },
  ket_qua_can_co: { ghi: "Việc xong thì phải có gì: biên bản, quyết định, hồ sơ…", de: "Để người đọc và 🤖 AI biết thế nào là xong.", sai: "Bỏ trống → máy gợi ý ghi thêm." },
  tinh_trang: { ghi: "Chọn trong danh sách: Chưa làm · Đang làm · Đã xong · Dừng (ghi thêm lý do: «Dừng: …»).", de: "Việc «Đã xong» được đóng; kỳ sau không phải ghi lại.", sai: "Gõ chữ khác danh sách → Excel nhắc; máy vẫn đọc kiểu rõ nghĩa như «xong», «100%»." },
  han_quyet_dinh: { ghi: "Hạn Tổng giám đốc cần quyết định, dd/mm/yyyy.", de: "Nhắc lãnh đạo trước hạn.", sai: "Bỏ trống → không có nhắc hạn." },
  ngay_ke_hoach: { ghi: "Ngày kế hoạch xong hạng mục, dd/mm/yyyy.", de: "Thành hạn của việc thiết kế.", sai: "Sai dạng → việc không có hạn." },
  pt_ht: { ghi: "% hoàn thành, vd 85%. Đủ 100% là xong.", de: "Hạng mục 100% được tính là việc đã xong.", sai: "Ghi 100% khi chưa xong → việc bị đóng." },
  uu_tien: { ghi: "Thứ tự ưu tiên, 1 là cao nhất.", de: "Xếp việc chờ quyết định.", sai: "—" },
  tai_lieu: { ghi: "Tài liệu đã chuẩn bị để lãnh đạo quyết, kèm số hiệu.", de: "Người nhận biết đã đủ hồ sơ chưa.", sai: "—" },
  // kiến nghị
  stt: { ghi: "Số thứ tự — máy in sẵn, không cần sửa.", de: "Để đọc, gọi tên dòng.", sai: "—" },
  noi_dung: { ghi: "Vấn đề cần lãnh đạo biết hoặc quyết: việc gì, vì sao, ảnh hưởng gì. Mỗi dòng một vấn đề.", de: "Người nhận đọc; 🤖 AI soát chỗ còn mơ hồ.", sai: "Viết chung chung → khó ra quyết định." },
  nguon: { ghi: "Đơn vị nêu vấn đề.", de: "Biết hỏi lại ai.", sai: "—" },
  muc_do: { ghi: "Chọn trong danh sách: Khẩn cấp · Cần quyết định · Cần phê duyệt · Cần sớm xử lý · Theo dõi · Thông tin.", de: "Lãnh đạo xem việc gấp trước.", sai: "Gõ chữ khác danh sách → Excel nhắc." },
  kien_nghi: { ghi: "Đề nghị cụ thể: ai làm gì, trước ngày nào.", de: "Người nhận biết cần làm gì.", sai: "—" },
  anh_huong: { ghi: "Ảnh hưởng nếu chậm, có định lượng (ngày, tiền).", de: "Lãnh đạo cân nhắc mức gấp.", sai: "—" },
  // cảnh báo
  ho_so: { ghi: "Hồ sơ, mốc pháp lý hoặc hạng mục cần cảnh báo.", de: "Người nhận đọc.", sai: "—" },
  loai: { ghi: "Loại hồ sơ / mốc, viết tắt quen dùng (GP XD, QĐĐT…).", de: "Người nhận đọc.", sai: "—" },
  vuong_mac: { ghi: "Vướng mắc cần xử lý và ai xử lý.", de: "Người nhận đọc.", sai: "—" },
  // chung
  ghi_chu: { ghi: "Ghi tự do.", de: "Người đọc xem kèm.", sai: "—" },
  hanh_dong: { ghi: "Hành động ngay cần làm.", de: "Người nhận đọc.", sai: "—" },
};

/** Cột chỉ ghi số (bảng số liệu) — nhận theo chữ tên cột */
export function laCotSo(nhan: string, viDu: string[] = []): boolean {
  const co = viDu.filter((v) => v.trim());
  if (co.length >= 2) {
    const so = co.filter((v) => /^[-+−]?\s*[\d.,]+\s*%?(\s*KH)?$|^[—-]$/.test(v.trim())).length;
    if (so / co.length >= 0.6) return true;
  }
  // biên chữ theo Unicode — \b của JS coi «á» là dấu ngắt nên «Trạng thái» từng khớp «TH»
  return /(?<![\p{L}\d])(KH|TH|T\/H|LK|YTD)(?![\p{L}\d])|lũy kế|luỹ kế|tuần này|tháng|năm|giá trị|%|diện tích|^kl |khối lượng|sản lượng|số lượng|công suất|\(tr\.đ\)|tr\.đ|tỷ|^sci|hướng linh|đầu (tuần|kỳ)|cuối (tuần|kỳ)|biến động|trong hạn|quá hạn|^lệch/iu.test(nhan.trim());
}

/** Hướng dẫn của một ô nhập */
export function hdO(tag: string, nhan: string, batBuoc: boolean): HuongDanO {
  return (
    HD_O[tag] ?? {
      ghi: `Ghi ${nhan.toLocaleLowerCase("vi-VN")}.`,
      de: "Người nhận đọc kèm báo cáo.",
      sai: batBuoc ? "Bỏ trống → không nộp được." : "—",
    }
  );
}

/** Hướng dẫn của một cột bảng */
export function hdCot(tag: string, nhan: string, laBangViec: boolean, coSo: boolean): HuongDanO {
  const co = HD_COT[tag];
  if (co && (laBangViec || !["tinh_trang", "du_an", "ten"].includes(tag))) return co;
  if (coSo) return { ghi: `${nhan}: ${SO_VN}`, de: laBangViec ? "Lưu kèm việc." : "Người nhận đọc số liệu; bảng này không sinh việc.", sai: "Gõ chữ vào ô số → người đọc không so được." };
  return {
    ghi: `Ghi ${nhan.replace(/\s+/g, " ").toLocaleLowerCase("vi-VN")}.`,
    de: laBangViec ? "Lưu kèm việc." : "Người nhận đọc; bảng này không sinh việc.",
    sai: "—",
  };
}

/** Lời nhắc khi rê chuột (Excel giới hạn 255 ký tự lời, 32 ký tự tiêu đề) */
export function loiNhac(tieuDe: string, h: HuongDanO): { promptTitle: string; prompt: string } {
  return { promptTitle: tieuDe.replace(/\s+/g, " ").slice(0, 32), prompt: h.ghi.slice(0, 255) };
}

/** Tuần hiện tại (Thứ Hai → Chủ nhật, số tuần ISO) — ghi sẵn ô «Kỳ báo cáo» lúc tải mẫu */
export function kyTuanHienTai(nay = new Date()): string {
  const d = new Date(Date.UTC(nay.getFullYear(), nay.getMonth(), nay.getDate()));
  const thu = (d.getUTCDay() + 6) % 7; // 0 = Thứ Hai
  const hai = new Date(d.getTime() - thu * 86400000);
  const cn = new Date(hai.getTime() + 6 * 86400000);
  // Tuần ISO: tuần chứa Thứ Năm thuộc năm của Thứ Năm đó; tuần 1 chứa Thứ Năm đầu tiên của năm
  const t5 = new Date(hai.getTime() + 3 * 86400000);
  const nam = t5.getUTCFullYear();
  const tuan = Math.ceil(((t5.getTime() - Date.UTC(nam, 0, 1)) / 86400000 + 1) / 7);
  const f = (x: Date) => `${String(x.getUTCDate()).padStart(2, "0")}/${String(x.getUTCMonth() + 1).padStart(2, "0")}/${x.getUTCFullYear()}`;
  return `Tuần ${tuan}/${nam} (${f(hai)} – ${f(cn)})`;
}
