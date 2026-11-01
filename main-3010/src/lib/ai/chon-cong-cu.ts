// ============================================================
// chon-cong-cu.ts — CHỌN CÔNG CỤ THEO CÂU HỎI (B4, tiết kiệm ngữ cảnh)
//
// Đo 06/09: danh mục 32 công cụ chiếm 1.741 token = 57% system prompt, và
// được gửi LẠI ở mọi vòng. Bộ này chỉ đưa vào prompt những công cụ dính tới
// câu hỏi → cắt phần lớn số đó mà không đổi cách trả lời.
//
// Ba lưới an toàn (thà tốn token còn hơn trợ lý mất công cụ):
//   ① nhóm LÕI luôn có mặt
//   ② chọn được quá ít (câu mơ hồ) → trả VỀ ĐỦ danh mục
//   ③ từ vòng 2 trở đi (đã có kết quả công cụ) → trả VỀ ĐỦ danh mục
// Model gọi tên ngoài danh sách vẫn chạy được, vì `runTool` tra bảng đầy đủ.
//
// File THUẦN — không đụng fs, dùng được cả ở client.
// ============================================================

import { TOOL_SPECS, type ToolSpec } from "./chat-types";
import { duocQuaCua, type Role } from "@/lib/quyen";

/** Công cụ dùng ở hầu hết câu hỏi — luôn nằm trong prompt */
export const NHOM_LOI = [
  "tom_tat_du_an",
  "duong_gang",
  "tim_dau_viec",
  "chi_tiet_dau_viec",
  "open_tab",
] as const;

/** Chọn được ít hơn ngần này thì coi như câu mơ hồ → đưa đủ danh mục */
const TOI_THIEU = 7;
/** Trần số công cụ đưa vào prompt khi lọc được */
const TRAN = 14;

/**
 * Bí danh cho cụm người dùng hay nói mà mô tả công cụ không có sẵn chữ đó.
 * KHOÁ PHẢI LÀ TÊN CÔNG CỤ THẬT — có bài kiểm chặn, vì đặt nhầm tên thì bí
 * danh im lặng không có tác dụng (đã mắc 06/09 với "duong_gang" không tồn tại).
 * ⭐ 24/09: công cụ số tiến độ nay là công cụ HỎI CỔNG tiendo.* — bí danh đổi theo.
 */
export const BI_DANH: Record<string, string[]> = {
  dieu_khien_giao_dien: ["sua ho", "lam ho", "bam ho", "roi luu", "cuon toi", "loc giup", "mo ra roi"],
  liet_ke_lenh: ["lenh nao", "bam duoc gi", "lam duoc gi tren man"],
  tom_tat_du_an: ["cham bao nhieu", "tong the", "phan tram", "%", "tien do chung"],
  du_bao: ["cod", "van hanh thuong mai", "phat dien", "du bao", "vi sao cham", "cham bao nhieu"],
  duong_gang: ["duong gang", "viec gang", "gang cuoi", "tre nhat", "dang tre"],
  gia_dinh_cod: ["neu ", "gia su", "gia dinh", "xong som", "xong muon", "som hon", "muon hon", "thi cod", "cham them", "tre them", "rut ngan"],
  lich_su_du_bao: ["cod lui", "cod tien", "lich su cod"],
  nang_suat: ["nang suat", "san luong ngay", "toc do thi cong"],
  s_curve: ["s-curve", "scurve", "duong cong"],
  so_tuan: ["tuan truoc", "tuan nay khac", "so voi tuan"],
  khoi_luong_hang_muc: ["khoi luong", "bao cao ngay", "cong truong bao", "lam duoc bao nhieu"],
  boq_theo_hang_muc: ["boq", "khoi luong thiet ke", "khoi luong", "chi tiet", "dau noi", "dz ", "duong day", "mong cot", "hang muc", "bao nhieu cot", "bao nhieu km"],
  bao_cao_ngay_boq: ["ma boq", "boq ngay", "nha thau bao", "nha thau lam"],
  hop_dong_nha_thau: ["khoi luong nha thau", "nha thau nhan", "khoi luong hop dong", "goi thau", "pham vi hop dong", "tong thau", "epc"],
  ho_so_thiet_ke: ["thiet ke", "ban ve", "ho so thiet ke", "pmc", "chua thiet ke", "chua lam thiet ke", "sap thi cong", "can de thi cong", "ban ve thi cong"],
  nguon_luc_huy_dong: ["nhan luc", "may moc", "huy dong", "nguon luc"],
  thau_phu: ["thau phu", "nha thau"],
  soat_quy_tac: ["quy tac", "vi pham"],
  danh_sach_issue: ["canh bao", "issue", "van de", "chua bat dau", "qua ngay bat dau"],
  danh_ba_base: ["ai", "anh ", "chi ", "nguoi nao", "danh ba"],
  tao_viec_base: ["giao viec", "giao cho", "tao viec"],
  soan_viec_giao: ["giao viec", "giao cho", "nhap viec", "de nhap", "duyet tren man"],
  // ⭐ 25/09 — câu vắt ngang (bỏ màn Hỏi vắt ngang, dồn vào trợ lý)
  phaply_ho_so_thieu: ["vi sao cham", "ho so", "phap ly", "giay phep", "thu tuc", "dang chan", "tinh hinh"],
  phaply_han_chu_truong: ["chu truong", "han van hanh", "han dau tu"],
  phaply_ho_so_cua_wbs: ["ho so cua", "can ho so", "vuong ho so"],
  phaply_danh_sach_issue: ["phap ly", "vuong mac phap ly"],
  hopdong_phieu_gia_dang_cho: ["phieu gia", "cho duyet", "thanh toan", "tinh hinh"],
  hopdong_gia_tri_luy_ke: ["thanh toan", "luy ke tien", "luy ke thanh toan", "da tra", "con lai"],
  hopdong_toan_canh: ["hop dong", "bao lanh", "tam ung", "tien phat"],
  nghiemthu_da_nghiem_thu_chua: ["nghiem thu", "bien ban"],
  nghiemthu_so_lieu_sang: ["phieu cho ky", "no nghiem thu", "bao cao sang"],
  nghiemthu_ho_so_hoan_thanh: ["ho so hoan thanh", "hoan thanh cong trinh", "phu luc vii", "hoan cong"],
  nghiemthu_khoi_luong_da_nghiem_thu: ["khoi luong nghiem thu", "da nghiem thu", "nghiem thu"],
  nghiemthu_luat_logic: ["luat logic", "quan he viec", "viec truoc"],
  nghiemthu_danh_sach_issue: ["nghiem thu", "phieu cho ky", "no nghiem thu", "issue nghiem thu"],
  hopdong_moc_hop_dong: ["moc hop dong", "han hop dong", "cam ket tien do"],
  hopdong_danh_sach_issue: ["hop dong", "vuong mac hop dong"],
  base_viec_qua_han: ["vi sao cham", "viec qua han du an", "tinh hinh", "can quyet"],
  base_tai_viec_theo_nguoi: ["tai viec", "ai dang om", "nguoi nao nhieu viec"],
  base_co_viec_cho_ma_khong: ["da giao chua", "co ai lam", "giao cho ai chua"],
  base_danh_sach_issue: ["viec cham", "vuong mac cong viec", "issue cong viec"],
  // ⭐ 26/10/2026 đợt 1 (KE-HOACH/31 mục 7)
  viec_base: ["viec cua toi", "toi co viec", "qua han", "sap han", "can lam gap", "viec gap", "toi da giao"],
  luy_ke_boq: ["luy ke", "luy ke khoi luong", "da thi cong", "da lam duoc", "khoi luong den nay"],
  san_luong_hop_dong: ["san luong", "lam duoc bao nhieu tien", "san luong thang"],
  nhat_ky_thi_cong: ["nhat ky", "hom qua", "cong truong lam gi", "bao nhieu nguoi", "thoi tiet"],
  viec_trong_khoang: ["tuan sau", "thang toi", "sap bat dau", "phai bat dau", "phai xong"],
  bang_gantt: ["gantt", "hang muc chinh", "tien do cac hang muc"],
  nha_thau: ["nha thau chinh", "nha thau nao", "so nha thau", "nt-"],
  hopdong_dieu_khoan: ["dieu khoan", "tam ung", "thu hoi tam ung", "phat cham", "phat bao nhieu", "tam ung bao nhieu", "bao hanh", "dieu kien thanh toan", "ben nao phai"],
  hopdong_chi_phi_theo_hop_dong: ["chi phi", "chi phi luy ke", "gia tri thuc hien"],
  hopdong_phieu_gia_so_san_luong: ["lech san luong", "phieu gia lech", "so voi san luong"],
  hopdong_cam_ket_nha_thau: ["cam ket", "bao nhieu may", "nhan luc cam ket"],
  hopdong_ket_qua_soat: ["pg-", "soat phieu", "sai cho nao", "ket qua soat"],
  hopdong_co_hop_dong_chua: ["co hop dong chua", "da ky hop dong", "chua co hop dong"],
  phaply_tra_van_ban: ["nghi dinh", "thong tu", "luat ", "van ban", "quyet dinh so"],
  phaply_can_cu_phap_ly: ["can cu", "thu tuc", "mat bao lau", "dieu nao", "quy dinh o dau"],
  phaply_van_ban_con_hieu_luc: ["con hieu luc", "het hieu luc", "bi thay the"],
  phaply_han_giay_phep: ["het han", "giay phep het", "han giay phep"],
  phaply_doi_ngay_nen_bat_dau: ["nen bat dau", "phai lam ngay", "lam ngay", "ho so nao phai"],
  nghiemthu_lich_nghiem_thu: ["lich nghiem thu", "moi nghiem thu", "nghiem thu hom nay", "nghiem thu ngay mai"],
  base_trang_thai_cong_viec: ["den dau roi", "trang thai viec", "cv-"],
  base_nguoi_phu_trach: ["ai dang lam", "ai phu trach", "ai chu tri"],
  base_viec_co_han_trong_khoang: ["sap den han", "sap han", "han tuan nay", "den han"],
  tra_ma: ["la viec gi", "la ho so gi", "la hop dong gi", "ma viec", "ma ho so"],
  base_lich_hop: ["lich hop", "cuoc hop", "phong hop", "tham du hop", "di hop", "hop giao ban"],
  // ⭐ ĐỢT 3 (KE-HOACH/31, 27/10/2026)
  base_bao_cao_da_nop: ["nop bao cao", "chua nop", "da nop", "ai chua nop"],
  base_kien_nghi_can_quyet: ["kien nghi", "can lanh dao quyet", "de xuat", "xin y kien"],
  base_bao_cao_tuan: ["bao cao tuan", "bao cao cong ty"],
  base_lich_phong: ["phong hop", "trong khong", "con trong", "dat phong"],
  base_viec_da_xong: ["da xong", "xong nhung viec", "hoan thanh nhung", "lam xong"],
  base_thong_bao_cua_toi: ["thong bao", "chua doc", "chuong"],
  bao_cao_tuan: ["bao cao tuan", "nop chua", "ai nop", "bc tuan"],
  thoi_tiet: ["thoi tiet", "mua", "gio bao", "nghi mua", "ngay mua"],
  phaply_lich_ho_so: ["lich ho so", "ho so phai lam", "ho so phai co", "sap toi han", "30 ngay toi"],
  phaply_khung_thu_tuc: ["thu tuc", "trinh tu", "cac buoc", "khung thu tuc", "giao dat"],
  phaply_tong_quan: ["tong quan phap ly", "tinh hinh phap ly", "phap ly the nao", "phap ly den dau"],
  phaply_van_ban_theo_nhom: ["luat lao", "van ban lao", "nhom van ban", "loai van ban", "liet ke van ban"],
  hopdong_danh_sach_hop_dong: ["may hop dong", "bao nhieu hop dong", "danh sach hop dong", "cac hop dong", "tong gia tri"],
  hopdong_bao_lanh_tam_ung: ["bao lanh", "tam ung", "thu hoi"],
  hopdong_moc_thanh_toan: ["dieu kien thanh toan", "dot thanh toan", "moc thanh toan", "dot tiep theo", "thanh toan dot"],
  hopdong_gia_qua_khu: ["gia qua khu", "don gia", "gia bao nhieu", "thu vien gia"],
  hopdong_du_thao_dang_soat: ["du thao", "dang soat", "chua ky"],
  nghiemthu_danh_sach_phieu: ["phieu yeu cau", "phieu nghiem thu", "dang cho ky", "cho ky"],
  nghiemthu_bien_ban: ["bien ban", "bien ban nghiem thu"],
  nghiemthu_thi_nghiem: ["thi nghiem", "mau be tong", "cuong do", "r28", "do chat"],
  nghiemthu_doi_chieu_khoi_luong: ["doi chieu", "khop khoi luong", "vuot boq", "con no", "khoi luong nghiem thu"],
};

export function boDau(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Tách từ ≥4 ký tự — từ ngắn (và, cho, các…) không phân biệt được gì */
function tuKhoa(s: string): string[] {
  return boDau(s)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
}

/** Khoảng cách sửa (chèn/xoá/thay một ký tự) ≤ 1 giữa hai chuỗi? */
function lech1(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

/** Từ khoá một chữ, từ 5 ký tự — chỉ những từ này mới được sửa lỗi gõ (từ ngắn dễ sửa nhầm) */
const TU_DON_BI_DANH: string[] = Array.from(
  new Set(Object.values(BI_DANH).flat().filter((k) => /^[a-z0-9]{5,}$/.test(k)))
);

/**
 * Sửa lỗi gõ cho bộ chọn công cụ: "isue" → "issue", "baseine" → "baseline"…
 * Chỉ sửa chữ lệch ĐÚNG MỘT ký tự so với một từ khoá đã có (mơ hồ giữa hai từ khoá thì giữ nguyên). Mr. Đại 24/10/2026:
 * câu "Hướng việt có bao nhiêu isue?" bị cắt mất công cụ issue khỏi danh mục, nên mô hình không có gì để gọi.
 */
export function suaLoiGo(cauHoiPhang: string): string {
  return cauHoiPhang.replace(/[a-z0-9]{4,}/g, (t) => {
    if (TU_DON_BI_DANH.includes(t)) return t;
    const gan = TU_DON_BI_DANH.filter((k) => k.length >= 5 && lech1(t, k));
    return gan.length === 1 ? gan[0]! : t;
  });
}

function chamDiem(spec: ToolSpec, tuCauHoi: Set<string>, cauHoiPhang: string): number {
  let diem = 0;
  for (const bd of BI_DANH[spec.name] ?? []) {
    if (cauHoiPhang.includes(bd)) diem += 3;
  }
  // Tên công cụ tách gạch dưới: "bao_cao_tuan" → bao, cao, tuan
  for (const t of boDau(spec.name).split("_")) {
    if (t.length >= 3 && tuCauHoi.has(t)) diem += 2;
  }
  for (const t of tuKhoa(spec.description)) {
    if (tuCauHoi.has(t)) diem += 1;
  }
  return diem;
}

// ===================================================================
// CÂU QUEN → CODE TỰ HỎI SẴN (26/09 — Mr. Đại chốt phần tốc độ)
// Đo 26/09: mỗi câu đi 2 vòng CLI (vòng 1 chỉ để mô hình nói "gọi công cụ nào").
// Câu khớp khuôn quen dưới đây thì CODE gọi trước các công cụ ĐỌC đó (vẫn qua
// hàm bọc ghi sổ — luật 29), mô hình chỉ còn MỘT vòng viết câu trả lời; nó vẫn
// được gọi thêm công cụ nếu thiếu. Câu lạ → [] → đi 2 vòng như cũ.
// ===================================================================

/** Một khuôn: mẫu trên câu ĐÃ BỎ DẤU → các công cụ đọc cần gọi */
/**
 * `mauDau` (tuỳ chọn): khuôn chạy trên chữ CÓ DẤU (thường hoá) khi câu hỏi có dấu — cho khuôn mà bỏ dấu sẽ lẫn nghĩa
 * («họp» ↔ «hợp»: kiểm độc lập 26/10 AI-07 — «trường hợp nào», «hợp lệ» bị bắt nhầm thành hỏi lịch họp).
 */
const KHUON_QUEN: Array<{ mau: RegExp; mauDau?: RegExp; congCu: string[] }> = [
  { mau: /\bcod\b|van hanh thuong mai/, congCu: ["tom_tat_du_an", "du_bao"] },
  {
    // Đợt 2 (26/10): câu hỏi ĐIỀU KHOẢN («phạt chậm tiến độ», «thưởng / bồi thường chậm») không phải hỏi số tiến độ — trước kéo thêm 3 công cụ, mất 41 giây
    mau: /^(?!.*\b(phat|thuong|boi thuong|dieu khoan)\b).*((cham|tre) (bao nhieu|may ngay|tien do)|vi sao (cham|tre)|nguyen nhan (cham|tre)|dang (cham|tre))/,
    congCu: ["tom_tat_du_an", "du_bao", "duong_gang"],
  },
  { mau: /duong gang|viec gang|gang nao|tre nhat/, congCu: ["duong_gang"] },
  { mau: /ho so (con )?thieu|thieu ho so/, congCu: ["phaply_ho_so_thieu"] },
  // Đợt 2 (27/10, PL-14): «giấy phép nào sắp hết hạn» là hạn HIỆU LỰC giấy phép đã có — không phải hồ sơ còn thiếu.
  // Kiểm độc lập B2-01/B2-06: chỉ «giấy phép» (bỏ «văn bản / chứng nhận» — bắt nhầm «văn bản hết hiệu lực», «chứng nhận bảo hiểm»);
  // công cụ cần mã WBS nên chỉ gọi sẵn khi câu có mã (CAN_WBS bên dưới), không thì AI tự chọn trong danh mục
  { mau: /giay phep.*(sap )?het (han|hieu luc)|het han.*giay phep/, congCu: ["phaply_han_giay_phep"] },
  // (PL-13 «luật … quy định gì»: KHÔNG gọi sẵn — công cụ cần từ khoá do AI rút ra; kiểm độc lập B2-04 đo 100% lượt gọi sẵn lỗi.
  //  Bí danh `phaply_tra_van_ban` vẫn đưa công cụ vào danh mục.)
  // Đợt 2 (27/10, PL-11): «hồ sơ pháp lý / giấy phép / ĐTM / chủ trương … đã duyệt chưa» → tình trạng hồ sơ pháp lý.
  // Kiểm độc lập B2-07: «hồ sơ» trơn bắt nhầm hồ sơ thiết kế / thanh toán / nghiệm thu / năng lực (5/5) → phải nói rõ loại pháp lý
  { mau: /(ho so phap ly|giay phep|danh gia tac dong moi truong|\bdtm\b|chu truong dau tu).*(da )?(duoc )?(duyet|phe duyet|cap|co) chua/, congCu: ["phaply_ho_so_thieu"] },
  // Đợt 1 B1 (26/10): «TÔI có việc gì quá hạn» → việc của chính người hỏi (viec_base, mọi dự án);
  // base_viec_qua_han bắt buộc mã dự án nên chỉ dùng khi hỏi theo dự án
  // Kiểm độc lập đợt 1 🔴 CC-06: bỏ dấu thì «tới / tối / Minh» thành «toi / minh» → chạy trên chữ CÓ dấu khi câu có dấu;
  // «cho tôi biết …» không phải hỏi việc của chính mình
  // 28/10 (KE-HOACH/31 đợt 2 mục 7, CC-06 còn sai 6/6): câu có «dự án» → luôn hỏi theo dự án (base_viec_qua_han), không bao giờ viec_base;
  // «tôi/mình + hỏi/muốn/nhờ/cần» là lời lịch sự, không phải việc của chính mình; «cho toi» loại cả ở nhánh không dấu
  {
    mau: /^(?!.*\bdu an\b)(?:.*(?<!cho )\btoi (?!hoi|muon|nho|can)\S*.*qua han|.*\bcua toi\b.*qua han|.*qua han.*\bcua toi\b)/,
    mauDau: /^(?!.*dự án)(?:.*(?<!cho )(?<![A-Za-zÀ-ɏḀ-ỿ])(tôi|mình) (?!hỏi|muốn|nhờ|cần)\S*.*quá hạn|.*của (tôi|mình)(?![A-Za-zÀ-ɏḀ-ỿ]).*quá hạn|.*quá hạn.*của (tôi|mình)(?![A-Za-zÀ-ɏḀ-ỿ]))/,
    congCu: ["viec_base"],
  },
  {
    mau: /^(?:(?=.*\bdu an\b)|(?!.*(?<!cho )\b(toi|cua toi)\b(?! (?:hoi|muon|nho|can)))).*qua han/,
    mauDau: /^(?:(?=.*dự án)|(?!.*(?<!cho )(?<![A-Za-zÀ-ɏḀ-ỿ])(tôi|mình)(?![A-Za-zÀ-ɏḀ-ỿ])(?! (?:hỏi|muốn|nhờ|cần)))).*quá hạn/,
    congCu: ["base_viec_qua_han"],
  },
  { mau: /^(?!.*(tuan|thang|nam) ).*(lich nghiem thu|nghiem thu (hom nay|ngay mai|gi)|moi nghiem thu)/, congCu: ["nghiemthu_lich_nghiem_thu"] },
  { mau: /\bluy ke\b.*\b(khoi luong|boq|da lam|thi cong)\b|\b(khoi luong|boq)\b.*\bluy ke\b/, congCu: ["luy_ke_boq"] },
  // ⭐ ĐỢT 3 (27/10/2026) — chỉ công cụ KHÔNG bắt buộc tham số (bài học B2-01: gọi sẵn thiếu tham số = lỗi 100%)
  { mau: /(phong|don vi|ban)\b.*\bnop bao cao|chua nop bao cao|ai chua nop|\bnop bao cao (tuan )?chua/, congCu: ["base_bao_cao_da_nop"] },
  { mau: /^(?!.*\b(phong|don vi)\b).*bao cao tuan.*(da nop|nop chua|ai nop)/, congCu: ["bao_cao_tuan"] },
  { mau: /bao cao tuan\b.*\b(noi gi|the nao|co gi)/, congCu: ["bao_cao_tuan", "base_bao_cao_tuan"] },
  { mau: /kien nghi.*(quyet|lanh dao)|(can|cho) lanh dao quyet/, congCu: ["base_kien_nghi_can_quyet"] },
  { mau: /thong bao.*chua doc|chua doc.*thong bao/, congCu: ["base_thong_bao_cua_toi"] },
  { mau: /thoi tiet|ngay mua|nghi (vi|do) mua/, congCu: ["thoi_tiet"] },
  { mau: /phieu (yeu cau )?nghiem thu/, congCu: ["nghiemthu_danh_sach_phieu"] },
  { mau: /\bthi nghiem\b/, congCu: ["nghiemthu_thi_nghiem"] },
  // TD-18 (đợt 3 đo: bí danh mới đẩy danh_sach_issue khỏi trần 14) · NT-05 «sự việc công trường cần xử lý» = sổ cảnh báo (Nghiệm thu
  // không có sổ sự cố — trợ lý đợt 3c đo: «sự việc» ở đó là một cách nghiệm thu)
  { mau: /chua bat dau.*qua (ngay|han)|qua ngay bat dau/, congCu: ["danh_sach_issue"] },
  { mau: /su viec.*(cong truong|can xu ly)|(cong truong).*can xu ly/, congCu: ["danh_sach_issue", "nghiemthu_danh_sach_issue"] },
  { mau: /doi chieu khoi luong|khoi luong nghiem thu.*(khop|so voi|lech)/, congCu: ["nghiemthu_doi_chieu_khoi_luong"] },
  { mau: /\b(may|bao nhieu) hop dong\b|danh sach hop dong/, congCu: ["hopdong_danh_sach_hop_dong"] },
  { mau: /\bbao lanh\b|\btam ung\b/, congCu: ["hopdong_bao_lanh_tam_ung"] },
  { mau: /dieu kien thanh toan|dot thanh toan|thanh toan dot (tiep|ke)|moc thanh toan/, congCu: ["hopdong_moc_thanh_toan"] },
  { mau: /tong quan phap ly|tinh hinh phap ly|phap ly (the nao|ra sao|den dau)/, congCu: ["phaply_tong_quan"] },
  { mau: /ho so (nao )?(phai|can) (lam|co).*(ngay toi|tuan (nay|toi|sau)|thang (nay|toi|sau))|lich ho so/, congCu: ["phaply_lich_ho_so"] },
  // 26/10/2026: câu hỏi lịch họp → code hỏi sẵn sổ Phòng họp (không cần mô hình đi một vòng chọn công cụ)
  {
    mau: /lich hop|cuoc hop|hop (gi|nao)|di hop|du hop|tham du hop/,
    mauDau: /lịch họp|cuộc họp|họp (gì|nào)|đi họp|dự họp|tham dự (họp|cuộc)|giao ban/,
    congCu: ["base_lich_hop"],
  },
];
/** Nhóm công cụ tiến độ — câu có mã WBS thì hỏi thêm chi tiết + đường găng */
const CONG_CU_TIEN_DO = new Set(["tom_tat_du_an", "du_bao", "duong_gang"]);
/** Mã WBS ≥ 3 cấp (6.1.4, 7.6.2.6) — 2 cấp dễ nhầm số thập phân "3.3%" */
const MA_WBS = /(?<![\d.])(\d{1,2}(?:\.\d{1,2}){2,5})(?![\d.]|\s*%)/;
const MA_WBS_TOAN_CUC = new RegExp(MA_WBS.source, "g");
/** "xong sớm 10 ngày" · "sớm hơn 10 ngày" · "muộn 7 ngày" · "chậm thêm 5 ngày" (câu đã bỏ dấu) */
const SO_NGAY_GIA_DINH = /\b(som|muon|cham them|tre them)\s+(?:hon\s+)?(\d{1,4})\s*ngay\b/;

/**
 * Câu GIẢ ĐỊNH nhận ra chắc chắn (26/09): đúng MỘT mã WBS + "sớm/muộn N ngày" →
 * một thay đổi cho gia_dinh_cod. Không chắc (nhiều WBS, "bắt đầu ngày …", rút
 * ngắn…) → null, để mô hình tự dựng tham số.
 */
export function thayDoiTrongCau(cauHoi: string): { wbs: string; loai: "xong_som" | "xong_muon"; soNgay: number } | null {
  const cacMa = Array.from(new Set(Array.from(cauHoi.matchAll(MA_WBS_TOAN_CUC), (m) => m[1]!)));
  if (cacMa.length !== 1) return null;
  const m = boDau(cauHoi).replace(/\s+/g, " ").match(SO_NGAY_GIA_DINH);
  if (!m) return null;
  const soNgay = Number(m[2]);
  if (!Number.isInteger(soNgay) || soNgay < 1) return null;
  return { wbs: cacMa[0]!, loai: m[1] === "som" ? "xong_som" : "xong_muon", soNgay };
}
/** Tối đa công cụ tự hỏi sẵn — bằng trần công cụ một vòng của mô hình */
export const TRAN_TU_HOI_SAN = 5;

/** Công cụ bắt buộc mã WBS — chỉ gọi sẵn khi câu hỏi có mã (kiểm độc lập đợt 2 B2-01) */
export const CAN_WBS = new Set<string>(); // 27/10 đợt 3d: phaply_han_giay_phep bỏ trống WBS được (Pháp lý `33ba7b5`)
/** Công cụ NHẬN mã WBS (tuỳ chọn) — câu có mã thì gọi sẵn kèm mã */
export const NHAN_WBS = new Set(["phaply_han_giay_phep"]);

/** Tên dự án bỏ phần loại nguồn + ngoặc: "Điện gió Hướng Việt (HV…)" → "huong viet" */
function loiTenDuAn(ten: string): string {
  return boDau(ten.replace(/\(.*?\)/g, " "))
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^(du an |dien gio |thuy dien |dien mat troi )+/, "")
    .trim();
}

/**
 * Dự án câu hỏi nhắc tới: mã ngắn (chữ HOA đứng riêng — "HV", "N3A") hoặc lõi
 * tên ("Hướng Việt"). undefined = không nhắc (dùng dự án đang mở); null = nhắc
 * NHIỀU dự án (không tự hỏi sẵn — để mô hình tự chia).
 */
export function duAnTrongCau(
  cauHoi: string,
  duAn: Array<{ ma?: string; name: string }>
): string | undefined | null {
  const phang = ` ${boDau(cauHoi).replace(/[^a-z0-9]+/g, " ")} `;
  const thay = new Set<string>();
  for (const p of duAn) {
    const ma = (p.ma ?? "").trim();
    const coMa = ma !== "" && new RegExp(`(^|[^A-Za-z0-9])${ma.toUpperCase()}([^A-Za-z0-9]|$)`).test(cauHoi);
    const loi = loiTenDuAn(p.name);
    const coTen = loi.length >= 4 && phang.includes(` ${loi} `);
    if (coMa || coTen) thay.add(ma !== "" ? ma.toUpperCase() : p.name);
  }
  if (thay.size === 0) return undefined;
  return thay.size === 1 ? Array.from(thay)[0]! : null;
}

/**
 * Câu hỏi khớp khuôn quen → danh sách công cụ ĐỌC để code gọi trước (≤ 5).
 * [] = câu lạ, để mô hình tự chọn như cũ.
 */
export function khuonCauQuen(
  cauHoi: string,
  duAn: Array<{ ma?: string; name: string }>
): Array<{ name: string; args: Record<string, unknown> }> {
  const phang = boDau(cauHoi).replace(/\s+/g, " ");
  const coDau = cauHoi.normalize("NFC").toLowerCase().replace(/\s+/g, " ");
  const vietCoDau = phang !== cauHoi.toLowerCase().replace(/\s+/g, " ");
  const ten: string[] = [];
  for (const k of KHUON_QUEN) {
    const khop = k.mauDau && vietCoDau ? k.mauDau.test(coDau) : k.mau.test(phang);
    if (khop) for (const c of k.congCu) if (!ten.includes(c)) ten.push(c);
  }
  // Giả định nhận ra chắc (một WBS + sớm/muộn N ngày) → hỏi sẵn gia_dinh_cod,
  // kể cả câu chỉ có "nếu … thì sao" không nhắc COD
  const giaDinh = thayDoiTrongCau(cauHoi);
  const hoiGiaDinh = giaDinh !== null && (ten.some((t) => CONG_CU_TIEN_DO.has(t)) || /\b(neu|gia su|gia dinh)\b/.test(phang));
  if (ten.length === 0 && !hoiGiaDinh) return [];
  const da = duAnTrongCau(cauHoi, duAn);
  if (da === null) return [];
  const wbs = cauHoi.match(MA_WBS)?.[1];
  // Thứ tự: số tổng · gia_dinh_cod · chi tiết việc (trần 5 công cụ, chi tiết bị bớt trước)
  if (hoiGiaDinh) ten.push("gia_dinh_cod");
  if (wbs && ten.some((t) => CONG_CU_TIEN_DO.has(t) || t === "gia_dinh_cod")) {
    if (!ten.includes("duong_gang")) ten.splice(hoiGiaDinh ? ten.indexOf("gia_dinh_cod") : ten.length, 0, "duong_gang");
    ten.push("chi_tiet_dau_viec");
  }
  // Công cụ phải có thật trong danh mục (đổi tên công cụ mà quên sửa khuôn → bỏ, không gọi bừa)
  const co = new Set(TOOL_SPECS.map((s) => s.name));
  return ten
    .filter((t) => co.has(t))
    // Kiểm độc lập B2-01: công cụ BẮT BUỘC mã WBS mà câu không có mã → không gọi sẵn (gọi sẵn chỉ mang du_an → lỗi 100%)
    .filter((t) => !CAN_WBS.has(t) || !!wbs)
    .slice(0, TRAN_TU_HOI_SAN)
    .map((name) => {
      const args: Record<string, unknown> = da ? { du_an: da } : {};
      if ((name === "chi_tiet_dau_viec" || NHAN_WBS.has(name)) && wbs) args.ma_wbs = wbs;
      if (name === "gia_dinh_cod" && giaDinh) args.thay_doi = [giaDinh];
      return { name, args };
    });
}

/**
 * Danh mục công cụ cho một lượt hỏi.
 * @param vongSau true khi đã sang vòng 2+ → đưa đủ (lưới an toàn ③)
 */
export function chonCongCu(
  loai: Role,
  cauHoi: string,
  vongSau = false
): ToolSpec[] {
  // Công cụ loại tài khoản này KHÔNG qua được cửa (quyen.ts) thì bỏ hẳn khỏi
  // prompt — Người xem không thấy công cụ GHI, Người dùng không thấy công cụ
  // Cài đặt. Cổng kiemCongCu vẫn chặn lần nữa nếu mô hình gọi bừa tên.
  const duocPhep = TOOL_SPECS.filter((s) => duocQuaCua(loai, s.writes === true && s.cua === "xem" ? "ghi" : s.cua));
  if (vongSau) return duocPhep;

  const cauHoiPhang = suaLoiGo(boDau(cauHoi));
  const tuCauHoi = new Set(tuKhoa(cauHoiPhang));
  const cham = duocPhep
    .map((s) => ({ s, d: NHOM_LOI.includes(s.name as (typeof NHOM_LOI)[number]) ? 99 : chamDiem(s, tuCauHoi, cauHoiPhang) }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d);

  if (cham.length < TOI_THIEU) return duocPhep;
  const chon = cham.slice(0, TRAN).map((x) => x.s);
  // Giữ đúng thứ tự gốc cho prompt ổn định giữa các lượt (dễ đọc khi soi log)
  return duocPhep.filter((s) => chon.includes(s));
}
