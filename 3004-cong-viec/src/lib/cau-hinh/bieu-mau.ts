// ============================================================
// cau-hinh/bieu-mau.ts — MÔ TẢ BIỂU MẪU trang Cài đặt (thuần, dùng ở client).
// Nhóm đơn giản vẽ tự động từ danh sách trường dưới đây; nhóm phức tạp có thành phần riêng
// (src/components/cai-dat/*). Thêm trường vào mac-dinh.ts thì thêm một dòng ở đây để có nhãn tiếng Việt.
// ============================================================
import type { KhoaCauHinh, ThuTuUuTien } from "./mac-dinh";
import { NGUYEN_TAC_MA_VIEC } from "@/lib/so-cai/tien-ich";

export type KieuTruong = "nguoi_nhieu" | "bat_tat" | "so" | "chu" | "gio" | "chon" | "chon_nhieu" | "danh_sach_chu" | "danh_sach_ngay" | "mau_sac" | "vai_tro_nhieu" | "don_vi_nhieu" | "chon_model";

export interface TruongBieuMau {
  duong: string; // 'han_nop_tuan.thu'
  nhan: string;
  mo_ta?: string;
  kieu: KieuTruong;
  lua_chon?: { gia_tri: string | number; nhan: string }[];
  toi_thieu?: number;
  toi_da?: number;
  buoc?: number;
  /** chon_model: chữ của lựa chọn "để trống" (vd "Theo Model mặc định"); không ghi = bắt buộc chọn một model */
  nhan_trong?: string;
  /** bat_tat: đường của ô KHÔNG được bật cùng lúc với ô này (bật ô này thì ô kia tự tắt; ô kia mờ kèm lý do) */
  loai_tru_voi?: string;
}

export const THU_TU_UU_TIEN: { gia_tri: ThuTuUuTien; nhan: string; mo_ta: string }[] = [
  { gia_tri: "cap_truoc", nhan: "Cấp trước, cùng cấp thì so ngày", mo_ta: "Mặc định. Cấp cao đè cấp thấp kể cả khi cấp thấp gửi sau." },
  { gia_tri: "ngay_truoc", nhan: "Ngày trước, cùng ngày thì so cấp", mo_ta: "Báo cáo mới hơn thắng; cùng kỳ thì cấp cao thắng." },
  { gia_tri: "chi_cap", nhan: "Chỉ theo cấp", mo_ta: "Cùng cấp thì giữ bản đến trước." },
  { gia_tri: "chi_ngay", nhan: "Chỉ theo ngày", mo_ta: "Bản mới nhất luôn thắng, không xét cấp." },
];

export const MUC_LUAT: { gia_tri: "chan" | "canh_bao" | "goi_y"; nhan: string }[] = [
  { gia_tri: "chan", nhan: "Chặn gửi" },
  { gia_tri: "canh_bao", nhan: "Cảnh báo" },
  { gia_tri: "goi_y", nhan: "Gợi ý" },
];

export const LOAI_THU_MUC: { gia_tri: string; nhan: string }[] = [
  { gia_tri: "den", nhan: "Đến" },
  { gia_tri: "di", nhan: "Đi" },
  { gia_tri: "du_an", nhan: "Dự án" },
  { gia_tri: "thung_rac", nhan: "Thùng rác" },
  { gia_tri: "khac", nhan: "Khác" },
];

const TUAN_HAN = [
  { gia_tri: "nay", nhan: "Tuần làm việc cần báo cáo" },
  { gia_tri: "sau", nhan: "Tuần làm việc sau đó" },
];
const THU = [1, 2, 3, 4, 5, 6, 7].map((t) => ({ gia_tri: t, nhan: t === 7 ? "Chủ nhật" : `Thứ ${["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy"][t - 1]}` }));

/** Biểu mẫu tự động cho nhóm đơn giản. */
export const BIEU_MAU: Partial<Record<KhoaCauHinh, TruongBieuMau[]>> = {
  giao_viec: [
    {
      duong: "ho_tro_ban_lanh_dao",
      nhan: "Nhóm hỗ trợ Ban lãnh đạo (giao chuyển tiếp)",
      mo_ta:
        "Người được chọn hiện thành một nhóm «Hỗ trợ Ban lãnh đạo» trong ô «Giao cho…» của lãnh đạo khi giao chuyển tiếp — kể cả khi họ không phải nhân viên của đơn vị nào (vd trợ lý Chủ tịch, trưởng bộ phận kiểm soát nội bộ). Nhóm này không có trên sơ đồ tổ chức",
      kieu: "nguoi_nhieu",
    },
  ],
  nguoi_ngoai: [
    {
      duong: "chua_gan_don_vi",
      nhan: "Người chưa gán đơn vị",
      kieu: "chon",
      lua_chon: [
        { gia_tri: "chan_gui", nhan: "Chặn gửi đến khi được gán đơn vị (mặc định)" },
        { gia_tri: "cho_gui_cap_thap_nhat", nhan: "Cho gửi với cấp thấp nhất" },
      ],
    },
    { duong: "ca_nhan_duoc_gui_tu_do", nhan: "Cá nhân ngoài 9 đơn vị được gửi tự do", mo_ta: "Gửi tự do thì không sinh việc vào sổ cái", kieu: "bat_tat" },
    { duong: "cap_ben_ngoai", nhan: "Cấp của bên ngoài công ty", mo_ta: "Văn thư nhập thay người ngoài; số càng lớn cấp càng thấp", kieu: "so", toi_thieu: 0, toi_da: 99 },
    { duong: "cap_thap_nhat", nhan: "Cấp thấp nhất trong công ty", mo_ta: "Dùng cho người chưa gán đơn vị", kieu: "so", toi_thieu: 0, toi_da: 99 },
  ],
  ky_bao_cao: [
    {
      duong: "loai",
      nhan: "Loại kỳ báo cáo dùng (chưa có tác dụng)",
      kieu: "chon_nhieu",
      lua_chon: [
        { gia_tri: "tuan", nhan: "Tuần" },
        { gia_tri: "thang", nhan: "Tháng" },
        { gia_tri: "quy", nhan: "Quý" },
      ],
    },
    ...[1, 2, 3, 4].flatMap((c): TruongBieuMau[] => [
      { duong: `han_nop_theo_cap.cap${c}.tuan`, nhan: `Hạn nộp báo cáo tuần — cấp ${c}: tuần`, kieu: "chon", lua_chon: TUAN_HAN },
      { duong: `han_nop_theo_cap.cap${c}.thu`, nhan: `Hạn nộp báo cáo tuần — cấp ${c}: thứ`, kieu: "chon", lua_chon: THU },
      { duong: `han_nop_theo_cap.cap${c}.gio`, nhan: `Hạn nộp báo cáo tuần — cấp ${c}: giờ`, kieu: "gio" },
    ]),
    { duong: "han_nop_thang.ngay", nhan: "Hạn nộp báo cáo tháng: ngày của tháng sau (chưa có tác dụng)", kieu: "so", toi_thieu: 1, toi_da: 28 },
    { duong: "han_nop_thang.gio", nhan: "Hạn nộp báo cáo tháng: giờ (chưa có tác dụng)", kieu: "gio" },
    { duong: "nhac_truoc_gio", nhan: "Nhắc nộp trước (giờ) (chưa có tác dụng)", kieu: "so", toi_thieu: 0 },
    { duong: "ngay_nghi", nhan: "Ngày nghỉ, ngày lễ", mo_ta: "Không tính khi tính hạn", kieu: "danh_sach_ngay" },
  ],
  so_cai: [
    { duong: "sap_den_han_ngay", nhan: "Còn bao nhiêu ngày thì là \"sắp đến hạn\"", kieu: "so", toi_thieu: 0 },
    { duong: "qua_han_vang_ngay", nhan: "Quá hạn đến bao nhiêu ngày thì tô vàng", mo_ta: "Quá hạn từ 1 đến N ngày: vàng. Quá hơn N ngày: đỏ.", kieu: "so", toi_thieu: 0 },
    {
      duong: "nguyen_tac_ma_viec",
      nhan: "Nguyên tắc sinh mã việc",
      mo_ta: "Mã tự sinh khi việc vào sổ cái lần đầu; việc đã có mã giữ nguyên mã cũ. Mỗi tiền tố (năm, tháng, đơn vị, dự án) đánh số riêng.",
      kieu: "chon",
      lua_chon: NGUYEN_TAC_MA_VIEC,
    },
    {
      duong: "dang_ma_viec",
      nhan: "Dạng mã việc (khi tự đặt)",
      mo_ta: "{nam} = năm, {thang} = tháng, {don_vi} = mã đơn vị, {du_an} = mã dự án (chữ đầu mỗi từ), {so:4} = số thứ tự 4 chữ số",
      kieu: "chu",
    },
    { duong: "nhac_qua_han", nhan: "Nhắc khi quá hạn", mo_ta: "Nhắc người phụ trách và người giao việc", kieu: "bat_tat" },
    { duong: "gio_nhac", nhan: "Giờ gửi nhắc mỗi ngày", kieu: "gio" },
    {
      duong: "tu_bo_sung_thieu",
      nhan: "Tự bổ sung việc thiếu vào sổ cái",
      mo_ta: "Thấy báo cáo đã gửi còn việc chưa vào sổ cái là tự ghi vào NGAY (khi khởi động, đổi cài đặt, sau khi gửi; thêm lượt dự phòng hằng ngày), báo quản trị kết quả. Tắt = chỉ báo, quản trị bấm Bổ sung",
      kieu: "bat_tat",
    },
    {
      duong: "kenh_nhac",
      nhan: "Kênh nhắc",
      kieu: "chon_nhieu",
      lua_chon: [
        { gia_tri: "trong_app", nhan: "Trong ứng dụng" },
        { gia_tri: "email", nhan: "Email" },
      ],
    },
  ],
  bao_cao_tuan: [
    { duong: "bat", nhan: "Bật báo cáo tuần do AI viết", mo_ta: "Tắt thì menu Báo cáo tuần vẫn xem được bản cũ, máy không viết bản mới", kieu: "bat_tat" },
    { duong: "model", nhan: "Model viết báo cáo", mo_ta: "Tuần viết một lần — nên dùng model mạnh", kieu: "chon_model", nhan_trong: "Theo AI → Model mặc định" },
    { duong: "model_cham_do_kho", nhan: "Model chấm độ khó từng việc", mo_ta: "Chạy nền mỗi khi có việc mới vào sổ", kieu: "chon_model", nhan_trong: "Theo AI → Model mặc định" },
    { duong: "don_vi_danh_gia", nhan: "Đơn vị được đánh giá", mo_ta: "Đơn vị có nhân sự thật (số tài khoản = số người). Đơn vị khác chỉ tính số, AI không nhận xét", kieu: "don_vi_nhieu" },
    { duong: "nguong_qua_tai", nhan: "Quá tải khi Điểm công việc lớn hơn (điểm/người)", kieu: "so", toi_thieu: 1, toi_da: 500 },
    { duong: "nguong_can_bang", nhan: "Cân bằng khi Điểm công việc từ (điểm/người)", mo_ta: "Dưới mức này là Dư sức", kieu: "so", toi_thieu: 0, toi_da: 500 },
    { duong: "nguong_tre", nhan: "Trễ nhiều khi tỷ lệ khối lượng quá hạn từ (%)", mo_ta: "Tỷ lệ này chỉ đo KHỐI LƯỢNG việc đang quá hạn (điểm việc quá hạn ÷ điểm việc đang làm), không đo số ngày chậm và không so với hệ nào. Dưới mức này là Giữ nhịp", kieu: "so", toi_thieu: 1, toi_da: 100 },
    { duong: "tre_muc_1", nhan: "Nợ quá hạn: trễ tới (ngày) thì hệ số ×1", kieu: "so", toi_thieu: 1, toi_da: 365 },
    { duong: "tre_muc_2", nhan: "Nợ quá hạn: trễ tới (ngày) thì hệ số ×2, hơn nữa ×3", kieu: "so", toi_thieu: 2, toi_da: 365 },
    { duong: "gio_viet_muon", nhan: "Cấp 1 chưa nộp: thứ Hai tuần sau tới giờ này vẫn viết", kieu: "gio" },
  ],
  dinh_kem: [
    { duong: "giao_viec", nhan: "Kẹp file khi giao việc", kieu: "bat_tat" },
    { duong: "bao_xong", nhan: "Kẹp file khi báo xong việc", mo_ta: "Người giao nhận tin ở chuông kèm file để xem / tải về", kieu: "bat_tat" },
    { duong: "binh_luan", nhan: "Kẹp file khi bình luận", kieu: "bat_tat" },
    { duong: "toi_da_mb", nhan: "Dung lượng tối đa mỗi file (MB)", kieu: "so", toi_thieu: 1, toi_da: 200 },
    { duong: "so_file_toi_da", nhan: "Số file tối đa mỗi lần kẹp", kieu: "so", toi_thieu: 1, toi_da: 50 },
    { duong: "luu_thang", nhan: "Thời hạn lưu file và việc đã xong (tháng)", mo_ta: "Quá hạn máy tự xóa nội dung file (giữ tên, ghi \"đã xóa do hết hạn lưu\"); việc đã xong / đã hủy quá số tháng này (tính từ ngày xong) bị xóa hẳn khỏi hệ thống — sổ lịch sử vẫn giữ", kieu: "so", toi_thieu: 1, toi_da: 120 },
  ],
  bao_mat: [
    {
      duong: "mau_mat",
      nhan: "Mẫu mật (mã mẫu)",
      mo_ta: "Mỗi dòng một mã mẫu, vd form-4. Mọi tài liệu theo mẫu này (tuần lẫn tháng) bị cắt chương mật với người không có tên dưới đây",
      kieu: "danh_sach_chu",
    },
    {
      duong: "chuong_mat",
      nhan: "Chương mật",
      mo_ta: "Tên chương như trong mẫu, không cần số La Mã. Người không được xem đủ: chương này biến mất khỏi bản xem trước, bản Word tải về, trợ lý AI và cổng agent khác",
      kieu: "danh_sach_chu",
    },
    {
      duong: "nguoi_duoc_xem",
      nhan: "Người được xem đủ (email)",
      mo_ta: "Đích danh từng tài khoản. Quản trị viên không có tên ở đây cũng chỉ thấy bản đã cắt. Người tải một bản lên luôn thấy đủ bản của chính mình",
      kieu: "danh_sach_chu",
    },
    {
      duong: "don_vi_theo_quyen",
      nhan: "Đơn vị có tài liệu khác xét theo phân quyền",
      mo_ta: "Tài liệu không theo mẫu mật của các đơn vị này chỉ mở được theo phân quyền xem tài liệu, dù cài đặt Thư mục đang để mọi người mở được",
      kieu: "don_vi_nhieu",
    },
    { duong: "cau_tu_choi", nhan: "Câu trả cho người không được xem", kieu: "chu" },
  ],
  gan_wbs: [
    { duong: "bat", nhan: "Bật gắn việc vào WBS", mo_ta: "Chỉ việc của dự án có cây WBS bên agent Tiến độ (máy tự điền \"Mã bên Tiến độ\" ở Sơ đồ tổ chức dự án). Mã WBS ghi sẵn trong tên việc thì máy gắn luôn; còn lại 🤖 AI đề xuất", kieu: "bat_tat" },
    {
      duong: "che_do",
      nhan: "Ai duyệt mã WBS AI đề xuất",
      mo_ta: "Người duyệt: đề xuất nằm chờ ở màn Cây việc & đường găng, người có quyền \"Duyệt gắn WBS\" (Vai trò và quyền) bấm duyệt. AI tự duyệt: đề xuất có hiệu lực ngay, người vẫn sửa được bất cứ lúc nào",
      kieu: "chon",
      lua_chon: [
        { gia_tri: "nguoi_duyet", nhan: "Người duyệt (mặc định)" },
        { gia_tri: "ai_tu_duyet", nhan: "AI tự duyệt" },
      ],
    },
    { duong: "nguong_tu_duyet", nhan: "Ngưỡng độ chắc (0–1): AI tự duyệt và nút «Duyệt cả lô»", mo_ta: "Dùng ở hai nơi: AI tự duyệt (khi chọn chế độ đó) và nút «Duyệt N/M việc chờ duyệt chắc từ …%» ở Cây việc & đường găng. Đề xuất có độ chắc dưới ngưỡng vẫn chờ người duyệt từng cái. 0,7 = AI tự nhận \"hợp lý nhưng có thể nhầm dòng lân cận\" trở lên", kieu: "so", toi_thieu: 0, toi_da: 1, buoc: 0.05 },
    {
      duong: "cua_so_giao_ngay",
      nhan: "Cửa sổ giao việc găng (số ngày trước ngày bắt đầu)",
      mo_ta: "Màn Cây việc & đường găng chỉ coi việc LÁ trên đường găng có ngày bắt đầu baseline trong số ngày này (hoặc đã qua) là \"chưa ai giao\": đếm đỏ, vào 🤖 Soạn việc trên đường găng chưa ai làm, sinh issue ⭕. Việc xa hơn ghi \"chưa tới lúc giao\", vẫn giao sớm tay được. 0 = chỉ khi đã đến ngày bắt đầu",
      kieu: "so",
      toi_thieu: 0,
      toi_da: 365,
    },
  ],
  ai: [
    {
      duong: "model_mac_dinh",
      nhan: "Model mặc định",
      mo_ta: "Dùng cho kiểm tra lúc nộp, báo cáo tuần, chấm độ khó. Danh sách là các model đã chạy thử được trên máy chủ",
      kieu: "chon_model",
    },
    {
      duong: "model_tro_ly",
      nhan: "Model của trợ lý chat",
      mo_ta: "Mỗi người vẫn tự đổi riêng ở chip model trong khung chat. Đo 01/10 (20 câu thật): Opus 5 trả lời tốt nhất, khoảng 30 giây/câu; Sonnet 5 khoảng 16 giây",
      kieu: "chon_model",
      nhan_trong: "Theo Model mặc định",
    },
    {
      duong: "model_vong_cong_cu",
      nhan: "Model ở vòng tra cứu của trợ lý",
      mo_ta: "Vòng đầu trợ lý chỉ đọc câu hỏi và chọn công cụ tra sổ cái — chạy model nhanh này; câu trả lời cuối (đã có số liệu) vẫn do Model của trợ lý chat viết",
      kieu: "chon_model",
      nhan_trong: "Mọi vòng dùng Model của trợ lý chat",
    },
    {
      duong: "hai_tai_khoan",
      nhan: "Dùng 2 tài khoản Claude",
      mo_ta: "Tài khoản 2 tự vào thay khi tài khoản chính hết hạn mức (chu kỳ 5 giờ hoặc hạn mức tuần) và đỡ khi tài khoản chính đang bận. Đăng nhập từng tài khoản ở mục Kết nối AI",
      kieu: "bat_tat",
    },
    {
      duong: "dao_vai_24h",
      nhan: "Đảo vai chính / phụ mỗi 24 giờ",
      mo_ta: "Bật: ngày chẵn tài khoản 1 làm chính, ngày lẻ tài khoản 2 làm chính (giờ Việt Nam). Tắt: tài khoản 1 luôn là chính",
      kieu: "bat_tat",
    },
    {
      duong: "moi_phien_bat",
      nhan: "Tự mồi phiên làm việc mỗi sáng",
      mo_ta: "Tới giờ dưới đây máy gửi một câu ngắn vào tài khoản chính để chu kỳ làm việc của hãng bắt đầu từ giờ đó",
      kieu: "bat_tat",
    },
    { duong: "moi_phien_gio", nhan: "Giờ mồi phiên", kieu: "gio" },
    {
      duong: "model_them",
      nhan: "Model bổ sung",
      mo_ta: "Mã model mới (mỗi dòng một mã) — hiện thêm trong khung chọn model của trợ lý, không cần sửa phần mềm",
      kieu: "danh_sach_chu",
    },
    { duong: "bat_gop_y", nhan: "AI góp ý nội dung khi kiểm tra trước khi gửi", kieu: "bat_tat" },
    { duong: "cau_goi_y", nhan: "Câu gợi ý trong khung chat", kieu: "danh_sach_chu" },
  ],
  giao_dien: [
    { duong: "ten_ung_dung", nhan: "Tên ứng dụng", kieu: "chu" },
    { duong: "mau_chinh", nhan: "Màu chính (chưa có tác dụng)", kieu: "mau_sac" },
    { duong: "gio_sao_luu", nhan: "Giờ sao lưu hằng ngày (chưa có tác dụng)", kieu: "gio" },
    { duong: "so_ngay_giu_sao_luu", nhan: "Số ngày giữ bản sao lưu (chưa có tác dụng)", kieu: "so", toi_thieu: 1 },
    {
      duong: "hien_don_vi_khong_viec",
      nhan: "Sơ đồ tổ chức: hiện đơn vị không có việc",
      mo_ta: "Bật = vẽ mọi đơn vị; tắt = đơn vị không có việc nào (kể cả đơn vị con) bị ẩn cùng đường nối tới nó",
      kieu: "bat_tat",
    },
    {
      duong: "nhom_gap_so_do",
      nhan: "Sơ đồ tổ chức: nhóm bung/gập",
      mo_ta:
        "Mỗi dòng một ô có dòng chữ bấm để bung/gập các ô bên dưới: mã đơn vị | nhãn | tên gọi ô con — vd «sci-enc | Đang thi công | dự án». Mặc định gập, máy nhớ theo từng người xem",
      kieu: "danh_sach_chu",
    },
  ],
  tai_khoan: [
    { duong: "vai_tro_mac_dinh", nhan: "Vai trò gán sẵn cho người mới", mo_ta: "Khi thêm hoặc nhập Excel mà không ghi vai trò", kieu: "vai_tro_nhieu" },
    { duong: "do_dai_mat_khau_toi_thieu", nhan: "Độ dài mật khẩu tối thiểu", kieu: "so", toi_thieu: 4 },
    { duong: "bao_quan_tri_chua_gan_don_vi", nhan: "Nhắc quản trị viên khi có người chưa gán đơn vị", kieu: "bat_tat" },
    {
      duong: "danh_sach_dang_nhap",
      nhan: "Màn đăng nhập hiện danh sách tài khoản để bấm chọn",
      mo_ta: "Tiện khi chạy thử; khi dùng thật nên tắt (người ngoài không thấy danh sách người dùng). Không bật cùng lúc với «Bấm tên là đăng nhập luôn»",
      kieu: "bat_tat",
      loai_tru_voi: "bam_la_dang_nhap",
    },
    {
      duong: "bam_la_dang_nhap",
      nhan: "Bấm tên là đăng nhập luôn bằng mật khẩu lần đầu (chính email)",
      mo_ta: "Tài khoản đã đổi mật khẩu thì chỉ điền sẵn email, người dùng gõ mật khẩu. Không bật cùng lúc với «Màn đăng nhập hiện danh sách tài khoản»",
      kieu: "bat_tat",
      loai_tru_voi: "danh_sach_dang_nhap",
    },
  ],
};

/** Nhãn thêm cho các trường của nhóm có thành phần riêng (dùng khi hiện nhật ký "từ gì sang gì"). */
const NHAN_THEM: Record<string, string> = {
  "quy_tac_de.thu_tu": "Thứ tự ưu tiên khi việc trùng",
  "quy_tac_de.ngay_sau_tinh_theo": "\"Ngày sau\" tính theo",
  "quy_tac_de.da_xong_luon_ghi_nhan": "\"Đã xong\" luôn được ghi nhận",
  "quy_tac_de.viec_khong_ngay_luon_mo": "Việc không có ngày thì luôn mở",
  "quy_tac_de.bao_nguoi_gui_khi_khong_dung": "Báo cho người gửi khi bản của họ không được dùng",
  "quy_tac_de.ap_dung_lai_khi_doi": "Áp dụng lại cho việc đang mở khi đổi cài đặt",
  "quy_tac_de.nguong_goi_y_trung": "Ngưỡng gợi ý \"có vẻ trùng\"",
  "luat_kiem_tra.luat": "Danh sách luật",
  "luat_kiem_tra.gia_tri_chua_dien": "Chuỗi coi là \"chưa điền\"",
  "gui.chuyen_tiep_phai_kiem_tra_lai": "Chuyển tiếp phải kiểm tra lại",
  "gui.tra_lai_tam_dung_viec": "Trả lại thì tạm dừng việc trong sổ cái",
  "gui.duoc_chuyen_tiep": "Ai được chuyển tiếp cho ai",
  "thu_muc.thu_muc_con_mac_dinh": "Thư mục con mặc định",
  "thu_muc.thung_rac_giu_ngay": "Thùng rác giữ (ngày)",
  "thu_muc.quy_uoc_ten_file": "Quy ước tên file",
  "thu_muc.xem_noi_dung_phong_khac": "Mở xem nội dung phòng khác",
  "thong_bao.email_gui": "Hộp thư gửi",
  "thong_bao.mau": "Nội dung mẫu",
  "thong_bao.ten_nguoi_gui": "Tên người gửi",
  "thong_bao.theo_loai": "Kênh theo loại thông báo",
  "thong_bao.smtp": "Máy chủ gửi thư (SMTP)",
  "thong_bao.smtp.may_chu": "Máy chủ SMTP",
  "thong_bao.smtp.cong": "Cổng SMTP",
  "thong_bao.smtp.bao_mat": "Bảo mật SMTP",
  "thong_bao.smtp.tai_khoan": "Tài khoản SMTP",
  "phan_quyen_cau_hinh.nhom": "Phân quyền từng nhóm",
};

/** Tên tiếng Việt của từng loại thông báo (khóa trong thong_bao.theo_loai / thong_bao.mau). */
export const NHAN_LOAI_THONG_BAO: Record<string, string> = {
  nhan_tai_lieu: "Tài liệu mới đến",
  da_nhan: "Tài liệu đã được nhận",
  bi_tra_lai: "Tài liệu bị trả lại",
  hoan_thanh: "Tài liệu đã xử lý xong",
  giao_viec: "Được giao việc",
  gia_han: "Việc được gia hạn",
  bi_de: "Việc bị đè",
  ban_khong_dung: "Bản của người gửi không được dùng",
  ket_thuc_phan_viec: "Phần việc đã kết thúc",
  cong_viec_hoan_thanh: "Công việc hoàn thành",
  bot_phan_viec: "Phần việc được bớt",
  dong_viec: "Việc đã đóng",
  mo_lai_viec: "Việc được mở lại",
  y_kien_khac: "Báo cáo cấp dưới ghi khác với việc đã xong",
  ai_tai_khoan: "Tài khoản Claude hết hạn mức (chuyển tài khoản)",
  chua_gan_don_vi: "Có người chưa gán đơn vị (gửi quản trị viên)",
  qua_han: "Việc quá hạn",
  sap_den_han: "Việc sắp đến hạn",
  khac: "Loại khác (mọi loại chưa có dòng riêng)",
};

/** Loại thông báo lấy kênh theo "Sổ cái, nhắc việc › Kênh nhắc" (ở bảng kênh chỉ dùng tiêu đề thư). */
export const LOAI_KENH_THEO_SO_CAI = ["qua_han", "sap_den_han"];

export const BAO_MAT_SMTP: { gia_tri: "starttls" | "ssl" | "khong"; nhan: string }[] = [
  { gia_tri: "starttls", nhan: "STARTTLS (thường dùng cổng 587)" },
  { gia_tri: "ssl", nhan: "SSL/TLS (thường dùng cổng 465)" },
  { gia_tri: "khong", nhan: "Không mã hóa (chỉ dùng trong mạng nội bộ)" },
];

/** Nhãn từng đoạn đường khi hiện "từ gì sang gì" (vd theo_loai.giao_viec.email → "… › Được giao việc › Email"). */
const NHAN_DOAN: Record<string, string> = { trong_app: "Trong app", email: "Email", tieu_de: "Tiêu đề thư", ...NHAN_LOAI_THONG_BAO };

export function nhanTruong(khoa: KhoaCauHinh, duong: string): string {
  const d = duong.replace(/\[\d+\]/g, "");
  const nhanCua = (x: string) => BIEU_MAU[khoa]?.find((t) => t.duong === x)?.nhan ?? NHAN_THEM[`${khoa}.${x}`];
  const tu = nhanCua(d);
  if (tu) return tu;
  // Tìm nhãn của đoạn cha gần nhất rồi nối các đoạn còn lại
  const phan = d.split(".");
  for (let i = phan.length - 1; i > 0; i--) {
    const nhanCha = nhanCua(phan.slice(0, i).join("."));
    if (nhanCha) return [nhanCha, ...phan.slice(i).map((x) => NHAN_DOAN[x] ?? x)].join(" › ");
  }
  return duong;
}

/**
 * Lỗi kiểm kiểu trả về dạng "đường.trường: thông điệp" → thêm nhãn tiếng Việt cho người đọc:
 * "sap_den_han_ngay: không được là số âm" → "Còn bao nhiêu ngày thì là "sắp đến hạn" (sap_den_han_ngay): không được là số âm".
 * Lỗi đã là câu tiếng Việt (không bắt đầu bằng đường trường) giữ nguyên.
 */
export function nhanLoiCauHinh(khoa: KhoaCauHinh, loi: string): string {
  const m = /^([a-z_][a-z0-9_]*(?:\[\d+\])?(?:\.[a-z0-9_*]+(?:\[\d+\])?)*): (.*)$/s.exec(loi);
  if (!m) return loi;
  const nhan = nhanTruong(khoa, m[1]);
  return nhan === m[1] ? loi : `${nhan} (${m[1]}): ${m[2]}`;
}

/** Lấy / đặt giá trị theo đường 'a.b.c' (bất biến). */
export function layTheoDuong(o: unknown, duong: string): unknown {
  return duong.split(".").reduce<unknown>((x, k) => (x && typeof x === "object" ? (x as Record<string, unknown>)[k] : undefined), o);
}

export function datTheoDuong<T>(o: T, duong: string, v: unknown): T {
  const [dau, ...con] = duong.split(".");
  const goc = (o && typeof o === "object" ? { ...(o as Record<string, unknown>) } : {}) as Record<string, unknown>;
  goc[dau] = con.length ? datTheoDuong(goc[dau], con.join("."), v) : v;
  return goc as T;
}
