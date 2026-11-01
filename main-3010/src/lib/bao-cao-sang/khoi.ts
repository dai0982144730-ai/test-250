// ============================================================
// THƯ VIỆN KHỐI BÁO CÁO SÁNG  (file THUẦN — luật 10, màn hình import được)
// MD: KE-HOACH/23-THU-VIEN-KHOI-BAO-CAO-SANG-17-10.md · Mr. Đại chốt 17/10/2026 (8 câu mục 11 + duyệt 15 khối)
//
// Mỗi người nhận tự kéo thả khối vào báo cáo sáng của mình. Thư viện chia 3 kệ chỉ để dễ tìm — ai cũng kéo được mọi khối.
// Mỗi khối có nút phạm vi «Toàn công ty / Dự án tôi chọn» (chốt 1: một khối + nút, không tách khối).
// Số do CODE tính (agent chủ); 🤖 chỉ viết chữ, câu có số lạ hoặc thiếu «so với …» bị loại (lưới luật 36 ở đây).
// Ba mẫu cũ (Tổng quát · Điều hành · Dự án) thành BA BỘ KHỐI MẶC ĐỊNH — không ai mất bản đang nhận.
// ============================================================

import type { MaMau } from "./kich-ban";

export type MaKhoi =
  | "TQ-1"
  | "TQ-2"
  | "TQ-4"
  | "TQ-5"
  | "RQ-1"
  | "RQ-2"
  | "RQ-3"
  | "RQ-4"
  | "RQ-5"
  | "RQ-6"
  | "DA-1"
  | "DA-2"
  | "DA-3"
  | "DA-4"
  | "NT-1"
  | "NT-2"
  | "NT-3"
  | "CT-1"
  | "CT-2"
  | "VS-1"
  | "PL-2";

export type KeKhoi = "tong-quat" | "ra-quyet-dinh" | "di-sau-du-an";

export const NHAN_KE: Record<KeKhoi, string> = {
  "tong-quat": "Tổng quát — Chủ tịch",
  "ra-quyet-dinh": "Ra quyết định — Giám đốc điều hành",
  "di-sau-du-an": "Đi sâu dự án — Giám đốc BQL dự án",
};

export type KieuKhoi = "bang" | "bieu-do" | "chu";

export interface MoTaKhoi {
  ma: MaKhoi;
  ten: string;
  ke: KeKhoi;
  kieu: KieuKhoi;
  /** Người đọc khối này để LÀM gì (luật 14) */
  deLamGi: string;
  /** Lấy ở agent nào · công cụ nào */
  nguon: string;
  /** Công thức / luật xếp — để người bấm khối đọc được máy tính thế nào */
  congThuc: string;
  /** Khối có chữ 🤖 — nguyên lời dặn AI (khung prompt CHỈ XEM) */
  prompt?: string;
  /** Telegram in thế nào */
  telegram: string;
  /** Khối biểu đồ: gửi kèm ảnh */
  coAnh: boolean;
  /** Số dòng mặc định mỗi dự án (null = tất cả) — chỉ khối dạng danh sách */
  soDongMacDinh?: number | null;
}

/** Lời dặn AI đang dùng — trích nguyên, để khung prompt hiện đúng chữ máy gửi */
const PROMPT_TQ5 =
  "Viết MỘT câu tóm tắt tình hình một dự án năng lượng cho Giám đốc BQLDA đọc lướt. CHỈ dùng con số có trong dữ liệu tôi đưa — " +
  "không bịa, không ước lượng, không suy ra số mới; thiếu số thì bỏ ý đó. Không chấm điểm, không khuyên phải làm gì. NỐI các mảnh thành " +
  "mạch nhân quả — chậm ở đâu, gốc do đâu, kéo theo gì. Tiếng Việt, 1–2 câu, tối đa 60 từ. + luật mã kèm tên + luật nhanh/chậm theo ngày " +
  "(bang-dieu-hanh/tom-tat-ai.ts — dùng lại câu đã viết ở Bảng điều hành khi bộ số không đổi)";
const PROMPT_RQ1 =
  "Với MỖI vấn đề làm chậm mốc COD tôi đưa, viết MỘT câu hỏi ngắn để Giám đốc quyết ngay (chọn phương án, giao ai, có chấp nhận không). " +
  "CHỈ dùng con số có trong dòng dữ liệu của chính vấn đề đó; không thêm số, ngày, hạn, tỷ lệ nào khác. Mỗi câu ≤ 25 từ, kết thúc bằng " +
  "dấu '?'. + luật mã kèm tên + luật nhanh/chậm theo ngày (bao-cao-sang/cau-hoi-ai.ts — một lượt AI cho cả bản)";

export const DANH_MUC_KHOI: readonly MoTaKhoi[] = [
  {
    ma: "TQ-1",
    ten: "Bảng COD các dự án",
    ke: "tong-quat",
    kieu: "bang",
    deLamGi: "Nhìn một bảng biết dự án nào đang xấu đi",
    nguon: "Tiến độ tiendo.tom_tat_du_an · tiendo.lich_su_du_bao · tiendo.duong_gang (tach_cham_cod) · Pháp lý phaply.han_chu_truong",
    congThuc:
      "So hôm qua = COD dự báo hôm nay − điểm cuối trước hôm nay trong sổ mốc COD. Xếp: xấu đi so hôm qua nhiều nhất → chậm so với Tiến độ mục tiêu nhiều nhất. Dự án chưa có tiến độ: ẩn (chốt 13/10). Dưới bảng có thêm bảng «Vì sao chậm»: Chậm = Ký muộn (Baseline ký muộn hơn Tiến độ mục tiêu) + Làm chậm (thực hiện chậm so với Baseline) — gộp từ khối TQ-3 cũ (27/10); chưa có Baseline đã duyệt thì không tách được",
    telegram: "Mỗi dự án 1 dòng",
    coAnh: false,
  },
  {
    ma: "TQ-2",
    ten: "Xu thế COD dự báo",
    ke: "tong-quat",
    kieu: "bieu-do",
    deLamGi: "Thấy COD đang trượt dần hay đứng yên — không chỉ một ngày",
    nguon: "Tiến độ tiendo.lich_su_du_bao (sổ ghi từ 05/09/2026)",
    congThuc:
      "Mỗi ngày lấy điểm cuối ngày (giờ Việt Nam). Điểm «cách cũ trước 24/09» không vẽ. Điểm lạ (lượt tính lỗi) bỏ khỏi đường, ghi 1 dòng chú thích (chốt 4)",
    telegram: "Ảnh + 1 dòng «COD dự báo N ngày qua: a → b, lùi / sớm N ngày»",
    coAnh: true,
  },
  {
    ma: "TQ-4",
    ten: "Tiền các dự án",
    ke: "tong-quat",
    kieu: "bang",
    deLamGi: "Thấy tiền đã ký, đã làm ra, đã đòi, đã trả",
    nguon: "Hợp đồng hopdong.gia_tri_luy_ke · hopdong.toan_canh · hopdong.chi_phi_theo_hop_dong · Tiến độ tiendo.san_luong_hop_dong",
    congThuc:
      "Chỉ cộng khi MỌI dự án đều có số — thiếu một thì không cộng thiếu. Dòng người nhận không được xem hợp đồng thì ẩn (luật agent mật 05/10). Đơn vị tỷ đồng, 1 số thập phân; dưới 1 tỷ 2 số thập phân (chốt 8)",
    telegram: "Bảng đủ mọi dự án, hàng Cộng đầu",
    coAnh: false,
  },
  {
    ma: "TQ-5",
    ten: "🤖 Một câu mỗi dự án",
    ke: "tong-quat",
    kieu: "chu",
    deLamGi: "Đọc một câu biết mạch: chậm ở đâu, gốc do đâu, kéo theo gì",
    nguon: "🤖 AI viết từ số các khối khác (Tiến độ, Pháp lý, Công việc, Hợp đồng) — câu của Bảng điều hành",
    congThuc: "Không thêm lượt AI khi bộ số không đổi (nhớ 24 giờ theo dấu vân bộ số). Câu thiếu «so với …» khi nói chậm/trễ thì bị loại (lưới luật 36)",
    prompt: PROMPT_TQ5,
    telegram: "Nguyên câu",
    coAnh: false,
  },
  {
    ma: "RQ-1",
    ten: "Việc làm chậm COD + 🤖 câu hỏi quyết",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Biết việc nào đang kéo lùi COD và phải quyết điều gì",
    nguon: "<agent>.danh_sach_issue của 4 agent · Tiến độ tiendo.gia_dinh_cod (kéo COD về được bao nhiêu)",
    congThuc:
      "Vào bảng khi thẻ: trên găng tới COD · hoặc làm COD lùi ≥ 1 ngày · hoặc COD vượt mốc bắt buộc. Gộp trùng, xếp ngày lùi giảm dần. Số ngày chậm của việc TÍNH LẠI HẰNG NGÀY (chốt 3), cột «xử lý riêng việc này kéo COD về được N ngày» (chốt 2)",
    prompt: PROMPT_RQ1,
    telegram: "Mỗi việc 1 dòng + câu 🤖 ngay dưới",
    coAnh: false,
  },
  {
    ma: "RQ-2",
    ten: "Hạng mục tự làm COD chậm",
    ke: "ra-quyet-dinh",
    kieu: "bieu-do",
    deLamGi: "Biết hạng mục nào là GỐC của số ngày chậm, để dồn lực đúng chỗ",
    nguon: "Tiến độ tiendo.duong_gang → hang_muc_tu_lam_cod_cham",
    congThuc:
      "COD dự báo hôm nay − COD dự báo nếu RIÊNG hạng mục này làm đúng Baseline (Tiến độ tính). Không cộng dồn giữa các hạng mục → không có hàng tổng",
    telegram: "Ảnh + 1 dòng mỗi hạng mục > 0 ngày",
    coAnh: true,
  },
  {
    ma: "RQ-3",
    ten: "Thử: xử lý xong thì COD về đâu",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Trước khi dồn tiền / người vào một việc, biết làm xong thì COD kéo về được bao nhiêu ngày",
    nguon: "Tiến độ tiendo.gia_dinh_cod — chạy lại bộ dự báo COD trên bản sao, KHÔNG ghi dữ liệu",
    congThuc:
      "Máy tự chọn 2 giả định: ① việc nặng nhất ở «Việc làm chậm COD» về đúng Baseline ② cả hạng mục nặng nhất ở «Hạng mục tự làm COD chậm» về đúng Baseline",
    telegram: "2 dòng",
    coAnh: false,
  },
  {
    ma: "RQ-4",
    ten: "Phiếu giá chờ ký so với sản lượng",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Biết phiếu giá nào đang chờ, và nhà thầu ghi đã làm nhiều hơn sản lượng Tiến độ ghi nhận bao nhiêu",
    nguon: "Hợp đồng hopdong.phieu_gia_so_san_luong (agent Hợp đồng tự hỏi Tiến độ rồi tính chênh — chốt 5)",
    congThuc: "Chênh = lũy kế trên phiếu − sản lượng lũy kế Tiến độ. Hai số khác ngày chốt thì ghi rõ ngày của từng số",
    telegram: "1 dòng mỗi hợp đồng",
    coAnh: false,
  },
  {
    ma: "RQ-5",
    ten: "Hồ sơ pháp lý quá hạn",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Biết giấy tờ nào chặn dự án, đang nằm ở cơ quan nào — để gọi đúng người",
    nguon: "Pháp lý phaply.ho_so_thieu",
    congThuc: "Mọi hồ sơ quá hạn so với hạn phải có, quá hạn nhiều nhất trên đầu, hàng tổng đầu",
    telegram: "Dòng tổng + đủ mọi hồ sơ quá hạn",
    coAnh: false,
  },
  {
    ma: "RQ-6",
    ten: "Việc quá hạn theo người",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Biết ai đang ôm nhiều việc trễ để nhắc đúng người",
    nguon: "Công việc base.tai_viec_theo_nguoi",
    congThuc: "Đang mở · quá hạn · việc trễ lâu nhất (quá hạn so với hạn giao việc). Người nặng nhất lên đầu, hàng tổng đầu",
    telegram: "Dòng tổng + đủ mọi người có việc mở",
    coAnh: false,
  },
  {
    ma: "DA-1",
    ten: "Việc đỏ phải xử lý hôm nay",
    ke: "di-sau-du-an",
    kieu: "bang",
    deLamGi: "Danh sách việc đỏ (ngoài «Việc làm chậm COD») của dự án mình, theo từng agent",
    nguon: "<agent>.danh_sach_issue — thẻ mức đỏ không lọt luật COD",
    congThuc: "Xếp: quá hạn nhiều trước → mở gần đây trước. Số dòng mỗi agent mỗi dự án",
    telegram: "Đủ mọi việc đỏ, mở lâu nhất trên đầu",
    coAnh: false,
  },
  {
    ma: "DA-2",
    ten: "Việc găng đang trễ",
    ke: "di-sau-du-an",
    kieu: "bang",
    deLamGi: "Biết việc nào trên găng đang trễ nhiều nhất để đôn đốc nhà thầu",
    nguon: "Tiến độ tiendo.duong_gang → viec_gang_dang_tre",
    congThuc: "Việc lá chưa xong, găng tới mốc COD, dự báo xong muộn hơn Baseline. Chậm = ngày xong dự báo − ngày xong theo Baseline",
    telegram: "Dòng tổng + đủ mọi việc găng trễ",
    coAnh: false,
  },
  {
    ma: "DA-3",
    ten: "S-Curve",
    ke: "di-sau-du-an",
    kieu: "bieu-do",
    deLamGi: "Thấy khối lượng đã làm so với các đường kế hoạch, và ngày từng đường đạt 100 %",
    nguon: "Tiến độ tiendo.s_curve — cùng số trang Tổng quan của Tiến độ",
    congThuc: "% = khối lượng, chỉ tính việc nối tới mốc COD. Nhanh / chậm đọc bằng NGÀY trên đường S, không bằng chênh %",
    telegram: "Ảnh + 1 dòng",
    coAnh: true,
  },
  {
    ma: "DA-4",
    ten: "Hạng mục đang thi công",
    ke: "di-sau-du-an",
    kieu: "bang",
    deLamGi: "Giữ đà 7 ngày gần nhất thì từng hạng mục đang làm xong ngày nào, sớm / chậm bao nhiêu ngày so với Baseline",
    nguon: "Tiến độ tiendo.nang_suat — dòng đang làm (dự báo theo năng suất thật)",
    congThuc: "Năng suất 7 ngày / Baseline · giữ đà thì xong ngày nào · so với Baseline (Tiến độ tính)",
    telegram: "1 dòng mỗi hạng mục đang thi công, chậm nhất trên đầu",
    coAnh: false,
  },
  // 25/10/2026 (Mr. Đại): khối thứ 16 — nhà thầu mời nghiệm thu hôm nay + ngày mai (phiếu yêu cầu nhà thầu đã gửi từ hôm trước)
  {
    ma: "NT-1",
    ten: "Nhà thầu mời nghiệm thu",
    ke: "di-sau-du-an",
    kieu: "bang",
    deLamGi: "Biết hôm nay và ngày mai nhà thầu nào mời nghiệm thu việc gì, mấy giờ — để cử người có mặt",
    nguon: "Nghiệm thu nghiemthu.lich_nghiem_thu — phiếu yêu cầu nghiệm thu nhà thầu đã gửi (chờ ký / đã ký)",
    congThuc:
      "Nhà thầu có việc nghiệm thu thì làm phiếu yêu cầu từ hôm trước → có phiếu là có lịch. Bảng theo ngày: hôm nay · ngày mai; mỗi dòng giờ bắt đầu–kết thúc · nhà thầu · biên bản · chờ ký / đã ký. Nhà thầu chưa gửi phiếu thì chưa có trong lịch",
    telegram: "2 nhóm dòng: hôm nay, ngày mai",
    coAnh: false,
  },
  // 28/10/2026 (Mr. Đại duyệt việc 2): bốn khối mới, đo dữ liệu thật trước khi viết (KE-HOACH/34 mục 1)
  {
    ma: "NT-2",
    ten: "Phiếu nghiệm thu chờ BQL ký quá hạn",
    ke: "di-sau-du-an",
    kieu: "bang",
    deLamGi: "Thấy phiếu nghiệm thu nào chính mình (Ban QLDA) đang giữ quá ngưỡng giờ mà chưa ký",
    nguon: "Nghiệm thu nghiemthu.so_lieu_sang — phần «phiếu chờ BQL ký quá hạn»",
    congThuc: "Phiếu nhà thầu đã gửi, chờ BQL ký quá ngưỡng giờ do agent Nghiệm thu đặt (hiện 24 giờ). Quá nhiều giờ nhất trên đầu. Số do Nghiệm thu tính, Main chỉ in",
    telegram: "Mỗi phiếu 2 dòng: tên việc nghiệm thu, quá bao nhiêu giờ",
    coAnh: false,
  },
  {
    ma: "NT-3",
    ten: "Đã làm mà chưa nghiệm thu",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Biết hạng mục nào đã thi công xong mà quá ngưỡng ngày vẫn chưa có biên bản nghiệm thu — để đôn đốc làm hồ sơ",
    nguon: "Nghiệm thu nghiemthu.so_lieu_sang — phần «dòng BOQ thi công rồi quá ngưỡng chưa nghiệm thu»",
    congThuc: "Dòng BOQ đã có khối lượng thi công mà quá ngưỡng ngày (hiện 7 ngày) chưa có biên bản nghiệm thu đã ký. Gom theo hạng mục, lâu nhất trên đầu. Số do Nghiệm thu tính",
    telegram: "Mỗi hạng mục 2 dòng: số dòng BOQ, lâu nhất bao nhiêu ngày",
    coAnh: false,
  },
  {
    ma: "CT-1",
    ten: "Nhân lực · máy ngoài công trường",
    ke: "di-sau-du-an",
    kieu: "bang",
    deLamGi: "Biết mỗi thầu phụ đang đưa bao nhiêu người, bao nhiêu máy ra công trường — để gọi đúng người khi thấy ít",
    nguon: "Tiến độ tiendo.nguon_luc_huy_dong (+ Hợp đồng hopdong.cam_ket_nha_thau để so, khi hợp đồng ghi cam kết bằng số)",
    congThuc: "Nhân công và máy chính BÌNH QUÂN trong 7 ngày gần nhất có báo cáo ngày, mỗi thầu phụ. Hợp đồng chỉ ghi cam kết bằng lời thì nói thẳng «chưa so được», không bịa số",
    telegram: "Mỗi thầu phụ 2 dòng: nhân công, máy, số ngày có báo cáo",
    coAnh: false,
  },
  {
    ma: "CT-2",
    ten: "Công trường báo cáo ngày gần nhất",
    ke: "di-sau-du-an",
    kieu: "bang",
    deLamGi: "Biết hôm qua mỗi nhà thầu làm gì, thời tiết ảnh hưởng không, vướng mắc gì cần Ban QLDA gỡ",
    nguon: "Tiến độ tiendo.nhat_ky_thi_cong (báo cáo ngày nhà thầu nộp) · tiendo.bao_cao_ngay_boq khi cần biết ngày báo cáo mới nhất",
    congThuc: "Ngày có báo cáo mới nhất trong 7 ngày qua; mỗi nhà thầu: nhân công, máy, việc làm và khối lượng trong ngày, vướng mắc kèm đề xuất. Báo cáo cũ hơn hôm qua thì ghi rõ cũ bao nhiêu ngày",
    telegram: "Mỗi nhà thầu 2 dòng + vướng mắc",
    coAnh: false,
  },
  // 28/10/2026 (Mr. Đại duyệt phương án A, KE-HOACH/36): hai khối «nhìn tới» — việc sắp tới và hồ sơ sắp đến hạn
  {
    ma: "VS-1",
    ten: "Việc sắp đến lúc làm (7 ngày tới)",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Biết tuần này việc nào sắp khởi công hoặc phải xong, để chuẩn bị vật tư, nhân lực, thủ tục trước khi chậm",
    nguon: "Tiến độ tiendo.viec_trong_khoang — việc có ngày dự báo hoặc ngày theo Baseline rơi vào 7 ngày tới",
    congThuc: "Việc chưa xong mà ngày khởi công hoặc ngày xong (dự báo hay Baseline) nằm trong 7 ngày tới. Việc trên đường găng lên đầu, rồi việc chậm so với Baseline nhiều nhất. Số do Tiến độ tính theo số ngày đánh giá của nó (ghi rõ ở cuối khối)",
    telegram: "Mỗi việc 2 dòng: tên việc, ngày khởi công / xong dự báo, chậm bao nhiêu ngày so với Baseline",
    coAnh: false,
  },
  {
    ma: "PL-2",
    ten: "Hồ sơ pháp lý sắp đến hạn (30 ngày tới)",
    ke: "ra-quyet-dinh",
    kieu: "bang",
    deLamGi: "Biết hồ sơ pháp lý nào sắp đến hạn phải có và đang bị hồ sơ gốc nào chặn — để gọi đúng cơ quan trước khi quá hạn",
    nguon: "Pháp lý phaply.lich_ho_so — hồ sơ chưa xong có ngày nên bắt đầu hoặc hạn phải có nằm trong 30 ngày tới",
    congThuc: "Hồ sơ chưa xong, hạn phải có trong 30 ngày tới. Gần hạn nhất trên đầu. Hồ sơ nào chờ cùng một hồ sơ gốc thì có thêm một dòng nói rõ (đếm, không tính số mới). Hồ sơ đã quá hạn nằm ở khối «Hồ sơ pháp lý quá hạn». Người không được xem pháp lý thì ẩn",
    telegram: "Mỗi hồ sơ 2–3 dòng: tên, còn bao nhiêu ngày, cơ quan, đang chờ hồ sơ gốc nào",
    coAnh: false,
  },
];

export const KHOI_THEO_MA: ReadonlyMap<MaKhoi, MoTaKhoi> = new Map(DANH_MUC_KHOI.map((k) => [k.ma, k] as const));

export function laMaKhoi(v: unknown): v is MaKhoi {
  return typeof v === "string" && KHOI_THEO_MA.has(v as MaKhoi);
}

/** Tên khối luôn kèm mã (luật 30) */
export function tenKhoi(ma: MaKhoi): string {
  return `${ma} ${KHOI_THEO_MA.get(ma)?.ten ?? ""}`.trim();
}

// ─────────────────────────────────────────────────────────────
// Bộ khối của một người nhận
// ─────────────────────────────────────────────────────────────

/** «Toàn công ty» = mọi dự án đang mở · «Dự án tôi chọn» = các dự án chọn tay cho người này (`duAnChon`) */
export type PhamViKhoi = "cong-ty" | "du-an-chon";

export const NHAN_PHAM_VI: Record<PhamViKhoi, string> = {
  "cong-ty": "Toàn công ty",
  "du-an-chon": "Dự án tôi chọn",
};

export interface ChonKhoi {
  ma: MaKhoi;
  phamVi: PhamViKhoi;
  /** Số dòng tối đa (mỗi dự án; DA-1 mỗi agent mỗi dự án). null = tất cả. Không khai = theo mặc định của khối */
  soDong?: number | null;
  /** RQ-1: lấy N việc nặng nhất CẢ CÔNG TY (dòng «Nặng nhất» của mẫu Tổng quát cũ) thay vì mỗi dự án N việc */
  gopCongTy?: boolean;
}

/** Trần số khối mỗi bản — trần 20 khối (thư viện nay 19, thêm 4 khối 28/10/2026) (thêm NT-1 25/10/2026); giữ trần để kho không phình */
export const TRAN_SO_KHOI = 22;

/** Ba mẫu cũ → ba bộ khối mặc định (KE-HOACH/23 mục 6) — người chưa kéo thả gì vẫn nhận đúng bản cũ */
export const BO_MAC_DINH: Record<MaMau, readonly ChonKhoi[]> = {
  "tong-quat": [
    { ma: "TQ-1", phamVi: "cong-ty" },
    { ma: "RQ-1", phamVi: "cong-ty", soDong: 1, gopCongTy: true },
  ],
  "dieu-hanh": [{ ma: "RQ-1", phamVi: "cong-ty" }],
  "du-an": [
    { ma: "TQ-1", phamVi: "du-an-chon" },
    { ma: "RQ-1", phamVi: "du-an-chon", soDong: null },
    { ma: "DA-1", phamVi: "du-an-chon" },
  ],
};

/** Lọc bộ khối thô (đĩa / màn hình): bỏ mã lạ, bỏ trùng mã (giữ cái đầu), kẹp số dòng 1–50 — sai thì bỏ, không đoán */
export function chuanHoaBoKhoi(v: unknown): ChonKhoi[] | null {
  if (!Array.isArray(v)) return null;
  const ra: ChonKhoi[] = [];
  for (const x of v) {
    if (typeof x !== "object" || x === null) continue;
    let o = x as Record<string, unknown>;
    // TQ-3 «Vì sao chậm» đã gộp vào TQ-1 (27/10) — bộ khối cũ còn TQ-3 thì đọc thành TQ-1
    if (o.ma === "TQ-3") o = { ...o, ma: "TQ-1" };
    if (!laMaKhoi(o.ma) || ra.some((k) => k.ma === o.ma)) continue;
    const phamVi: PhamViKhoi = o.phamVi === "du-an-chon" ? "du-an-chon" : "cong-ty";
    const k: ChonKhoi = { ma: o.ma, phamVi };
    if (o.soDong === null) k.soDong = null;
    else if (typeof o.soDong === "number" && Number.isInteger(o.soDong) && o.soDong >= 1 && o.soDong <= 50) k.soDong = o.soDong;
    if (o.gopCongTy === true && o.ma === "RQ-1") k.gopCongTy = true;
    ra.push(k);
    if (ra.length >= TRAN_SO_KHOI) break;
  }
  return ra;
}

/** Bộ khối hiệu lực: bộ người đã kéo thả, chưa kéo thả thì bộ mặc định của mẫu */
export function boKhoiHieuLuc(mau: MaMau, boKhoi: readonly ChonKhoi[] | null | undefined): ChonKhoi[] {
  return boKhoi && boKhoi.length > 0 ? boKhoi.map((k) => ({ ...k })) : BO_MAC_DINH[mau].map((k) => ({ ...k }));
}

/** Số dòng thật của một khối đã chọn — khai thì theo khai, không khai thì mặc định của khối */
export function soDongCua(k: ChonKhoi): number | null {
  if (k.soDong !== undefined) return k.soDong;
  return KHOI_THEO_MA.get(k.ma)?.soDongMacDinh ?? null;
}

// ─────────────────────────────────────────────────────────────
// Tiền: tỷ đồng (chốt 8 — cả Telegram lẫn web)
// ─────────────────────────────────────────────────────────────

/**
 * Đồng → «9,4 tỷ» (1 số thập phân) · dưới 1 tỷ «0,54 tỷ» (2 số thập phân) — chuẩn số Việt Nam (thập phân «,», nhóm ba «.»).
 * null → «chưa có số» (không bao giờ in 0 thay cho «chưa có»).
 */
export function fmtTy(dong: number | null | undefined): string {
  if (typeof dong !== "number" || !Number.isFinite(dong)) return "chưa có số";
  const ty = dong / 1e9;
  const le = Math.abs(ty) < 1 ? 2 : 1;
  const chu = ty.toLocaleString("vi-VN", { minimumFractionDigits: le, maximumFractionDigits: le });
  return `${chu} tỷ`;
}

// ─────────────────────────────────────────────────────────────
// Lưới luật 36 cho chữ 🤖 (KE-HOACH/23 mục 8, Main việc 4)
// ─────────────────────────────────────────────────────────────

const RE_CHAM_CO_SO = /(chậm|dời|trễ|quá hạn|quá|lùi|sớm|vượt)\s*(?:thêm\s*)?\d[\d.,]*\s*ngày/gi;
const RE_SO_VOI = /so\s+với|so\s+hạn/i;
/** Ranh giới vế câu — «so với …» phải nằm CÙNG vế với số ngày */
const RE_RANH = /[,;.()—–]|\svà\s|\snhưng\s/;

/**
 * Câu 🤖 nói «chậm / dời / trễ / quá hạn / quá / lùi / sớm / vượt N ngày» mà vế đó KHÔNG có «so với …» → loại (luật 36: nhanh
 * chậm phải ghi rõ so với hệ nào). Xét TỪNG vế: câu mẫu 17/10 «chậm 86 ngày so với Tiến độ mục tiêu …, HV-09-01 (quá 250
 * ngày)» có «so với» ở vế đầu nhưng vế sau thiếu → loại. true = câu được giữ.
 */
/**
 * Mr. Đại đồng ý 26/10/2026: câu 🤖 nói «quá hạn N ngày» thiếu «so với …» thì CODE ghép «so với hạn đã đặt» (đúng cho mọi loại hạn:
 * hạn phải có của hồ sơ, hạn giao việc) thay vì bỏ cả câu. Chỉ ghép cho «quá hạn / quá»; «chậm / trễ / lùi / sớm / vượt» không biết so
 * với hệ nào (Tiến độ mục tiêu hay Baseline) nên KHÔNG đoán — giữ nguyên để lưới bỏ câu.
 */
export function ghepSoVoiChoQuaHan(cau: string): string {
  const ghep = Array.from(cau.matchAll(RE_CHAM_CO_SO)).filter((m) => /^quá/i.test(m[1] ?? ""));
  let ra = cau;
  for (const m of ghep.reverse()) {
    const dau = m.index ?? 0;
    const cuoi = dau + m[0].length;
    const sau = ra.slice(cuoi);
    const ve = sau.search(RE_RANH);
    const veSau = ve < 0 ? sau : sau.slice(0, ve);
    const tachTruoc = ra.slice(0, dau).split(RE_RANH);
    const veTruoc = tachTruoc[tachTruoc.length - 1] ?? "";
    if (RE_SO_VOI.test(veSau) || RE_SO_VOI.test(veTruoc)) continue;
    ra = `${ra.slice(0, cuoi)} so với hạn đã đặt${ra.slice(cuoi)}`;
  }
  return ra;
}

/**
 * Mr. Đại duyệt A 28/10/2026 (mở rộng chốt 26/10): câu 🤖 nói «chậm / trễ / lùi / sớm / vượt N ngày» thiếu «so với …» thì CODE ghép hệ
 * LẤY TỪ KHUNG SỐ mà chính AI được đưa — khung đã ghi «N ngày so với <hệ>» cho ĐÚNG con số N đó. Không đoán:
 *   · khung không có «N ngày so với …» → để nguyên (lưới luật 36 bỏ câu);
 *   · khung ghi N với HAI hệ khác nhau → mơ hồ, để nguyên.
 * «Quá hạn» do `ghepSoVoiChoQuaHan` lo (so với hạn đã đặt). Gọi sau hàm đó.
 */
export function ghepHeTheoKhung(cau: string, khung: string): string {
  const heCua = (so: string): string | null => {
    const re = new RegExp(`(?<![\\d.,])${so.replace(/[.,]/g, "[.,]")}\\s*ngày\\s+so\\s+với\\s+([^;,.()|·—–\\n]+?)(?=\\s*(?:[;,.()|·—–\\n]|\\s+và\\s|\\s+nhưng\\s|$))`, "gi");
    const he = new Set(Array.from(khung.matchAll(re)).map((x) => (x[1] ?? "").trim().toLowerCase()));
    if (he.size !== 1) return null;
    const goc = Array.from(khung.matchAll(re))[0]?.[1]?.trim();
    return goc ?? null;
  };
  // «vượt 316 ngày hạn 1315/QĐ-UBND» — câu đã NÊU hạn ngay sau số ngày, chỉ thiếu chữ «so với» → ghép (không đoán hệ nào)
  let ra = cau.replace(/(vượt\s*\d[\d.,]*\s*ngày)\s+(hạn\b)/gi, "$1 so với $2");
  // Duyệt từ cuối lên đầu để chỉ số chèn không lệch
  const ds = Array.from(ra.matchAll(RE_CHAM_CO_SO)).filter((m) => !/^quá/i.test(m[1] ?? ""));
  for (const m of ds.reverse()) {
    const dau = m.index ?? 0;
    const cuoi = dau + m[0].length;
    const sau = ra.slice(cuoi);
    const ve = sau.search(RE_RANH);
    const veSau = ve < 0 ? sau : sau.slice(0, ve);
    const tachTruoc = ra.slice(0, dau).split(RE_RANH);
    const veTruoc = tachTruoc[tachTruoc.length - 1] ?? "";
    if (RE_SO_VOI.test(veSau) || RE_SO_VOI.test(veTruoc)) continue;
    const so = /\d[\d.,]*/.exec(m[0])?.[0];
    const he = so ? heCua(so) : null;
    if (he) ra = `${ra.slice(0, cuoi)} so với ${he}${ra.slice(cuoi)}`;
  }
  return ra;
}

export function quaLuoiLuat36(cau: string): boolean {
  for (const m of Array.from(cau.matchAll(RE_CHAM_CO_SO))) {
    const dau = m.index ?? 0;
    const cuoi = dau + m[0].length;
    const sau = cau.slice(cuoi);
    const ve = sau.search(RE_RANH);
    const veSau = ve < 0 ? sau : sau.slice(0, ve);
    const truoc = cau.slice(0, dau);
    const tachTruoc = truoc.split(RE_RANH);
    const veTruoc = tachTruoc[tachTruoc.length - 1] ?? "";
    if (!RE_SO_VOI.test(veSau) && !RE_SO_VOI.test(veTruoc)) return false;
  }
  return true;
}
