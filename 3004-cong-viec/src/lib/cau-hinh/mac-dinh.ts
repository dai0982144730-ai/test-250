// ============================================================
// cau-hinh/mac-dinh.ts — GIÁ TRỊ MẶC ĐỊNH của mọi cấu hình (kế hoạch v2, mục "Nguyên tắc cấu hình").
// Code chỉ giữ mặc định để lần đầu chạy là dùng được; giá trị thật nằm trong bảng docflow.cau_hinh,
// quản trị viên đổi trên trang Cài đặt, có hiệu lực ngay. Dùng được cả client lẫn server.
// Thêm khóa mới: thêm kiểu vào CauHinh + giá trị vào MAC_DINH + nhóm vào NHOM_CAU_HINH.
// ============================================================

export type ThuTuUuTien = "cap_truoc" | "ngay_truoc" | "chi_cap" | "chi_ngay";

export type CapHanNop = "cap1" | "cap2" | "cap3" | "cap4";
export interface HanNopCap {
  tuan: "nay" | "sau";
  thu: number;
  gio: string;
}

export interface CauHinh {
  /** Quy tắc đè khi việc trùng + việc luôn mở */
  quy_tac_de: {
    thu_tu: ThuTuUuTien; // mặc định: cấp trước, cùng cấp so ngày
    ngay_sau_tinh_theo: "ky_bao_cao" | "ngay_gui";
    da_xong_luon_ghi_nhan: boolean; // người phụ trách/đơn vị thực hiện báo xong thì đóng, không xét cấp
    viec_khong_ngay_luon_mo: boolean; // tắt = thiếu ngày bị chặn gửi
    bao_nguoi_gui_khi_khong_dung: boolean;
    ap_dung_lai_khi_doi: boolean;
    nguong_goi_y_trung: number; // 0..1, độ giống tên việc để AI/hệ thống gợi ý "có vẻ trùng"
  };
  /** Luật kiểm tra trước khi gửi: bật tắt, mức chặn/cảnh báo, áp dụng cho mẫu nào */
  luat_kiem_tra: {
    luat: {
      ma: string;
      ten: string;
      bat: boolean;
      muc: "chan" | "canh_bao" | "goi_y";
      ap_dung: string[] | "tat_ca"; // mã mẫu
    }[];
    gia_tri_chua_dien: string[]; // chuỗi coi là "chưa điền", vd "......"
  };
  /** Gửi · chuyển tiếp */
  gui: {
    chuyen_tiep_phai_kiem_tra_lai: boolean;
    tra_lai_tam_dung_viec: boolean;
    /** Ai được chuyển tiếp cho ai: từ đơn vị → danh sách đơn vị nhận ('*' = mọi nơi) */
    duoc_chuyen_tiep: Record<string, string[]>;
  };
  /**
   * Giao việc · giao chuyển tiếp (Mr. Đại chốt 29/10/2026): «phòng ảo» hỗ trợ Ban lãnh đạo — người nào quản trị chọn ở đây (vd trợ lý Chủ tịch,
   * trưởng BP kiểm soát nội bộ: không phải nhân viên của đơn vị nào) thì lãnh đạo thấy họ thành một nhóm trong ô «Giao cho…» của giao chuyển tiếp.
   * Nhóm này KHÔNG có trên sơ đồ tổ chức.
   */
  giao_viec: {
    ho_tro_ban_lanh_dao: string[]; // id người dùng (email)
  };
  /** Người ngoài 9 đơn vị */
  nguoi_ngoai: {
    chua_gan_don_vi: "chan_gui" | "cho_gui_cap_thap_nhat";
    ca_nhan_duoc_gui_tu_do: boolean; // gửi tự do không sinh việc
    cap_ben_ngoai: number;
    cap_thap_nhat: number;
  };
  /** Luồng báo cáo: đơn vị nào gửi cho ai, ai kiểm soát, ai tổng hợp */
  luong_bao_cao: {
    tu: string; // don_vi id
    den: string;
    kiem_soat: string[]; // vai trò/đơn vị kiểm soát
    tong_hop_thanh?: string; // mã mẫu tổng hợp, vd 'form-1'
  }[];
  /**
   * SƠ ĐỒ TỔ CHỨC DỰ ÁN (Đợt 3; Mr. Đại chốt thành cây 28/09/2026): Dự án SCI đầu tư (cấp 1) → BQLDA (cấp 2, don_vi[0]) → dự án
   * (cấp 3); Loại khác (cấp 1) → dự án (cấp 3), don_vi là thuộc tính phụ (ô dự án dưới PMC/E&C trên Sơ đồ tổ chức).
   * Việc thuộc dự án khi ô "Dự án" khớp tên / tên gọi khác (đúng dấu; bỏ dấu chỉ nhận khi ra đúng một dự án), hoặc giao cho
   * Ban điều hành của dự án — code tra, không đoán. Dự án chưa lập (đang đấu thầu, tìm hiểu) thì không đưa vào.
   */
  du_an: {
    id: string;
    ten: string;
    loai: string; // 'Điện gió' | 'Thủy điện' | 'Mỏ đá'…
    nhom: "sci" | "khac";
    don_vi: string[]; // đơn vị quản lý / đang làm việc cho dự án (BQLDA; SCI PMC, SCI E&C…)
    ban_dieu_hanh?: string | null; // đơn vị Ban điều hành tổng thầu (cấp 4) của dự án SCI đầu tư
    ten_khac: string[];
    /**
     * Mã hỏi agent Tiến độ — từ 03/10 tối (LOI-DUNG-CHUNG 6g.6 Đợt 1) MÁY TỰ ĐIỀN = mã ngắn khi Tiến độ có cây WBS (lib/du-an-main.ts),
     * không khai tay. Có mã này thì việc của dự án được gắn vào cây WBS; trống = không gắn.
     */
    ma_tien_do?: string | null;
  }[];
  /**
   * GẮN VIỆC VÀO CÂY WBS (Mr. Đại chốt 03/10/2026 — agent Công việc thay vai agent Base): 🤖 AI đề xuất mã WBS cho từng việc
   * của dự án có "Mã bên Tiến độ". Người duyệt (quyền "Duyệt gắn WBS" ở ma trận) hoặc AI tự duyệt. Người sửa thì người thắng.
   */
  gan_wbs: {
    bat: boolean;
    che_do: "nguoi_duyet" | "ai_tu_duyet";
    /** Chỉ dùng khi AI tự duyệt: đề xuất có độ chắc dưới ngưỡng này vẫn chờ người duyệt */
    nguong_tu_duyet: number;
    /**
     * CỬA SỔ GIAO VIỆC GĂNG (Mr. Đại chốt 04/10/2026): chỉ việc LÁ trên đường găng có ngày bắt đầu baseline trong N ngày tới
     * (hoặc đã qua) mới tính "chưa ai giao" — đếm đỏ thẻ ④, vào soạn hàng loạt, sinh issue ⭕. Việc xa hơn ghi "chưa tới lúc giao".
     */
    cua_so_giao_ngay: number;
  };
  /**
   * TÊN GỌI KHÁC CỦA ĐƠN VỊ (Mr. Đại chốt 29/09/2026): "báo cáo thuộc đơn vị nào là do nội dung file nói" — máy đọc tên đơn vị
   * ghi trên báo cáo; tên viết tắt không suy ra được (HL7, NMĐG HL8…) khai ở đây. Mã đơn vị → các tên gọi khác.
   */
  ten_goi_khac_don_vi: Record<string, string[]>;
  /**
   * CÔNG TY CỦA ĐƠN VỊ (Mr. Đại chốt K8 02/10/2026): nhà máy → công ty đang vận hành; Ban điều hành → công ty tổng thầu.
   * Mã đơn vị → tên công ty. AI làm báo cáo Form 8 / Form 10 điền vào dòng "CÔNG TY ......" đầu báo cáo.
   */
  cong_ty_don_vi: Record<string, string>;
  /** Kỳ báo cáo, hạn nộp */
  ky_bao_cao: {
    loai: ("tuan" | "thang" | "quy")[];
    /**
     * Hạn nộp báo cáo TUẦN theo cấp đơn vị (Mr. Đại chốt 30/09). tuan "nay" = tuần làm việc cần báo cáo, "sau" = tuần
     * làm việc kế tiếp; thu 1 = thứ Hai … 7 = Chủ nhật. Quá hạn mà chưa nộp → sổ trên Sơ đồ hiện "!".
     */
    han_nop_theo_cap: Record<CapHanNop, HanNopCap>;
    han_nop_thang: { ngay: number; gio: string };
    nhac_truoc_gio: number;
    ngay_nghi: string[]; // ISO
  };
  /** Sổ cái, nhắc việc */
  so_cai: {
    sap_den_han_ngay: number;
    qua_han_vang_ngay: number; // Issue: quá hạn đến N ngày tô vàng, quá hơn N ngày tô đỏ
    nguyen_tac_ma_viec: string; // một mẫu trong NGUYEN_TAC_MA_VIEC (so-cai/tien-ich.ts), 'tu_chon' = dùng dang_ma_viec
    dang_ma_viec: string; // 'CV-{nam}-{so:4}' — chỉ dùng khi nguyen_tac_ma_viec = 'tu_chon'
    nhac_qua_han: boolean;
    gio_nhac: string; // '08:00'
    kenh_nhac: ("trong_app" | "email")[];
    /** KHÔNG CÒN DÙNG từ 29/09/2026 — quyền sửa việc cố định: người giao + lãnh đạo + quản trị (Mr. Đại chốt) */
    chi_nguoi_giao_duoc_sua: boolean;
    /** Thấy báo cáo đã gửi còn việc chưa vào sổ cái → tự bổ sung NGAY (khởi động, đổi cài đặt, sau khi gửi, dự phòng hằng ngày) */
    tu_bo_sung_thieu: boolean;
  };
  /**
   * Tệp đính kèm việc (Mr. Đại chốt 29/09/2026): kẹp file khi giao việc / báo xong / bình luận. Kho riêng (data/dinh-kem),
   * trợ lý AI không đọc được. Hết hạn lưu thì máy xóa nội dung file, giữ tên.
   */
  dinh_kem: {
    giao_viec: boolean;
    bao_xong: boolean;
    binh_luan: boolean;
    toi_da_mb: number; // mỗi file
    so_file_toi_da: number; // mỗi lần kẹp
    luu_thang: number; // hết hạn thì xóa
  };
  /**
   * Báo cáo tuần do AI viết (Mr. Đại duyệt demo 30/09/2026). Code tính mọi con số; AI chấm độ khó từng việc (1·2·4·8·13)
   * và viết lời nhận định từ bảng số. Chỉ đánh giá sâu các đơn vị có nhân sự thật (5 phòng + 2 BQLDA) + tập thể Ban lãnh đạo.
   */
  bao_cao_tuan: {
    bat: boolean;
    /** model viết báo cáo (tuần một lần); "" = theo AI → Model mặc định */
    model: string;
    /** model chấm độ khó từng việc (chạy nền khi việc vào sổ); "" = theo AI → Model mặc định */
    model_cham_do_kho: string;
    /** đơn vị đánh giá sâu — nhân sự thật = số tài khoản (kể cả kiêm nhiệm) */
    don_vi_danh_gia: string[];
    /** vùng theo tải/người: > quá tải = Quá tải; ≥ cân bằng = Cân bằng; còn lại Còn dư sức */
    nguong_qua_tai: number;
    nguong_can_bang: number;
    /** % trễ = điểm việc quá hạn ÷ điểm việc đang làm; từ ngưỡng này trở lên là "trễ nhiều" (Mr. Đại chốt cách A 30/09) */
    nguong_tre: number;
    /** hệ số nợ quá hạn: trễ ≤ mức 1 ngày ×1 · ≤ mức 2 ngày ×2 · hơn nữa ×3 */
    tre_muc_1: number;
    tre_muc_2: number;
    /** cấp 1 chưa nộp thì tới giờ này thứ Hai tuần sau vẫn viết, kèm dòng "cấp 1 chưa nộp" */
    gio_viet_muon: string;
  };
  /** Thư mục */
  thu_muc: {
    thu_muc_con_mac_dinh: { ten: string; loai: "den" | "di" | "du_an" | "thung_rac" | "khac" }[];
    thung_rac_giu_ngay: number;
    quy_uoc_ten_file: string;
    xem_noi_dung_phong_khac: "tat_ca" | "theo_quyen";
  };
  /**
   * BẢO MẬT BÁO CÁO TÀI CHÍNH (Mr. Đại chốt 07/10/2026). Tài liệu theo mẫu mật: chương mật chỉ người có tên trong danh sách
   * (đích danh tài khoản) + chính người tải bản đó lên thấy; mọi người khác — kể cả quản trị —, AI chạy ngầm và agent khác qua
   * cổng chỉ nhận bản ĐÃ CẮT (lib/bao-mat). Chỉ quản trị sửa nhóm này (cau-hinh/quyen.ts).
   */
  bao_mat: {
    /** Mã mẫu mật (vd form-4 — Báo cáo Phòng TCKT, cả tuần lẫn tháng) */
    mau_mat: string[];
    /** Tên chương mật đúng như tiêu đề trong mẫu (không cần số La Mã; so phần trước dấu "—", bỏ dấu, không phân biệt hoa thường) */
    chuong_mat: string[];
    /** Email hoặc mã tài khoản được xem đủ */
    nguoi_duoc_xem: string[];
    /** Tài liệu KHÁC (không theo mẫu mật) do các đơn vị này lập: xét theo phân quyền, không mở cho tất cả */
    don_vi_theo_quyen: string[];
    /** Câu trả cho người không được xem — trợ lý chat, cổng agent, đoạn thay thế trong bản đã cắt */
    cau_tu_choi: string;
  };
  /** Thông báo, email */
  thong_bao: {
    email_gui: string;
    mau: Record<string, string>;
    /** Tên người gửi hiển thị trong hộp thư người nhận (vd "SCI công việc") */
    ten_nguoi_gui: string;
    /**
     * Loại thông báo → kênh: trong app / email + tiêu đề thư ({noi_dung} = nội dung thông báo).
     * Loại không có trong bảng dùng dòng "khac". Riêng qua_han / sap_den_han: kênh theo so_cai.kenh_nhac.
     */
    theo_loai: Record<string, { trong_app: boolean; email: boolean; tieu_de: string }>;
    /** Máy chủ gửi thư (SMTP). Mật khẩu KHÔNG lưu ở đây: đặt SMTP_PASS trong .env.local; biến SMTP_* đè các ô này. */
    smtp: {
      may_chu: string; // vd smtp.gmail.com
      cong: number; // 587 (STARTTLS) hoặc 465 (SSL)
      bao_mat: "starttls" | "ssl" | "khong";
      tai_khoan: string; // tài khoản đăng nhập SMTP, vd docflow@scigroup.vn
    };
  };
  /** AI */
  ai: {
    model_mac_dinh: string;
    /**
     * Model RIÊNG của trợ lý chat (trống = theo model_mac_dinh). Tách khỏi model_mac_dinh vì model_mac_dinh còn chạy bước 3
     * kiểm tra lúc nộp, báo cáo tuần, chấm độ khó… Test đêm 01/10 (20 câu thật): Opus 5 điểm ~9,1 / 30 giây, Sonnet 5 ~8,9 / 16 giây
     * — chọn Opus theo lệnh "chất lượng câu trả lời là số 1".
     */
    model_tro_ly?: string;
    /**
     * Model ở VÒNG TRA CỨU của trợ lý (vòng 1: đọc câu hỏi, chọn công cụ gọi) — P1 Mr. Đại duyệt 02/10/2026. Vòng chốt câu trả lời
     * (đã có số liệu từ công cụ) vẫn chạy model_tro_ly. Trống = mọi vòng cùng một model. Người tự chọn model riêng ở chip thì
     * mọi vòng theo model riêng đó.
     */
    model_vong_cong_cu?: string;
    /**
     * HAI TÀI KHOẢN CLAUDE (Mr. Đại chốt 02/10/2026, lib/ai/tai-khoan-claude.ts): tài khoản 2 đỡ khi tài khoản chính hết hạn mức
     * hoặc đang bận. Đảo vai chính/phụ mỗi 24 giờ và mồi phiên theo giờ đều là tuỳ chọn bật/tắt.
     */
    hai_tai_khoan?: boolean;
    dao_vai_24h?: boolean;
    moi_phien_bat?: boolean;
    moi_phien_gio?: string;
    /** Model bổ sung (mã model) — hiện thêm trong khung chọn model, ngoài danh mục có sẵn (ai/danh-muc-model.ts) */
    model_them: string[];
    bat_gop_y: boolean;
    cau_goi_y: string[];
  };
  /** Giao diện, sao lưu */
  giao_dien: {
    ten_ung_dung: string;
    mau_chinh: string;
    gio_sao_luu: string;
    so_ngay_giu_sao_luu: number;
    /** Sơ đồ tổ chức: BẬT = vẽ cả đơn vị không có việc; TẮT = ẩn ô đó và đường nối tới nó (Mr. Đại chốt 29/09/2026) */
    hien_don_vi_khong_viec: boolean;
    /**
     * Sơ đồ tổ chức: ô có DÒNG NHÓM bung/gập các ô cấp 3–4 bên dưới (Mr. Đại chốt 20/10/2026). Mỗi dòng
     * "mã đơn vị | Nhãn dòng nhóm | tên gọi ô con" — vd "sci-enc | Đang thi công | dự án". Mặc định gập; máy nhớ theo người xem.
     */
    nhom_gap_so_do: string[];
  };
  /** Tài khoản người dùng: vai trò gán sẵn cho người mới, độ dài mật khẩu */
  tai_khoan: {
    vai_tro_mac_dinh: string[]; // gán khi tạo / nhập Excel mà không ghi vai trò
    do_dai_mat_khau_toi_thieu: number;
    bao_quan_tri_chua_gan_don_vi: boolean; // nhắc quản trị viên khi có người chưa gán đơn vị
    /** Màn đăng nhập hiện danh sách tài khoản để bấm chọn (tiện giai đoạn chạy thử; tắt khi dùng thật) */
    danh_sach_dang_nhap: boolean;
    /** Bấm tên trong danh sách là đăng nhập luôn bằng mật khẩu lần đầu = email (tài khoản đã đổi mật khẩu thì chỉ điền email). Không được bật cùng lúc với danh_sach_dang_nhap */
    bam_la_dang_nhap: boolean;
  };
  /**
   * Phân quyền riêng từng nhóm cài đặt. Ngoài người có quyền `cau_hinh.sua` (sửa được mọi nhóm),
   * nhóm nào có dòng ở đây thì người THUỘC một đơn vị trong `don_vi` (trống = đơn vị nào cũng được)
   * VÀ CÓ một vai trò trong `vai_tro` (trống = vai trò nào cũng được) cũng sửa được nhóm đó.
   * Riêng nhóm này chỉ người có `cau_hinh.sua` sửa được.
   */
  phan_quyen_cau_hinh: {
    nhom: Record<string, { don_vi: string[]; vai_tro: string[] }>;
  };
}

export type KhoaCauHinh = keyof CauHinh;

export const MAC_DINH: CauHinh = {
  quy_tac_de: {
    thu_tu: "cap_truoc",
    ngay_sau_tinh_theo: "ky_bao_cao",
    da_xong_luon_ghi_nhan: true,
    viec_khong_ngay_luon_mo: false, // mọi việc phải có ngày kết thúc: thiếu thì chặn gửi, yêu cầu sửa lại
    bao_nguoi_gui_khi_khong_dung: true,
    ap_dung_lai_khi_doi: false,
    nguong_goi_y_trung: 0.6,
  },
  luat_kiem_tra: {
    luat: [
      { ma: "dung_mau", ten: "Đúng mẫu: nhận ra Form, đủ mục, không mất ô nhập", bat: true, muc: "chan", ap_dung: "tat_ca" },
      { ma: "ky_bao_cao", ten: "Kỳ báo cáo đã chọn tuần/tháng, có ngày", bat: true, muc: "chan", ap_dung: "tat_ca" },
      { ma: "nguoi_lap", ten: "Người lập, người kiểm soát đã điền", bat: true, muc: "chan", ap_dung: "tat_ca" },
      { ma: "gui_den", ten: "Có nơi nhận", bat: true, muc: "chan", ap_dung: "tat_ca" },
      { ma: "ten_viec", ten: "Công việc có tên; phụ trách trống thì gán đơn vị lập", bat: true, muc: "canh_bao", ap_dung: "tat_ca" },
      { ma: "ngay_hop_le", ten: "Ngày bắt đầu không sau ngày kết thúc", bat: true, muc: "chan", ap_dung: "tat_ca" },
      { ma: "ngay_trong", ten: "Ngày trống: việc luôn mở", bat: true, muc: "goi_y", ap_dung: "tat_ca" },
      { ma: "viec_trung", ten: "Việc trùng việc trong sổ cái: áp quy tắc đè", bat: true, muc: "canh_bao", ap_dung: "tat_ca" },
      { ma: "noi_dung_ai", ten: "Nội dung: mục trống, số liệu mâu thuẫn (AI góp ý)", bat: true, muc: "goi_y", ap_dung: "tat_ca" },
    ],
    gia_tri_chua_dien: ["......", "…", "...", "…………", "[điền]"],
  },
  gui: {
    chuyen_tiep_phai_kiem_tra_lai: false,
    tra_lai_tam_dung_viec: true,
    duoc_chuyen_tiep: { "*": ["*"] },
  },
  giao_viec: { ho_tro_ban_lanh_dao: [] },
  nguoi_ngoai: {
    chua_gan_don_vi: "chan_gui",
    ca_nhan_duoc_gui_tu_do: true,
    cap_ben_ngoai: 9,
    cap_thap_nhat: 3,
  },
  ten_goi_khac_don_vi: {
    "nm-huonglinh7": ["HL7", "NMĐG HL7", "ĐG Hướng Linh 7"],
    "nm-huonglinh8": ["HL8", "NMĐG HL8", "ĐG Hướng Linh 8"],
  },
  cong_ty_don_vi: {},
  du_an: [
    // SCI đầu tư — theo BQLDA (demo PA2, Mr. Đại chốt 27/09: BQLDA Quảng Trị 3 dự án, BQLDA Lào 6 dự án)
    { id: "HV", ten: "Hướng Việt", loai: "Điện gió", nhom: "sci", don_vi: ["bqlda-qt"], ban_dieu_hanh: "bdh-huongviet", ten_khac: ["ĐG Hướng Việt", "Điện gió Hướng Việt"], ma_tien_do: "HV" }, // id = mã ngắn Main (6g.6); có cây WBS bên agent Tiến độ
    { id: "TT", ten: "Tân Thành", loai: "Điện gió", nhom: "sci", don_vi: ["bqlda-qt"], ban_dieu_hanh: "bdh-tanthanh", ten_khac: ["ĐG Tân Thành"] },
    { id: "BT", ten: "Ba Tầng 1", loai: "Điện gió", nhom: "sci", don_vi: ["bqlda-qt"], ban_dieu_hanh: "bdh-batang1", ten_khac: ["Điện gió Ba Tầng 1", "ĐG Ba Tầng 1", "ĐG Ba Tầng"] }, // Mr. Đại 28/09: tên đúng "Điện gió Ba Tầng 1" (demo ghi nhầm thủy điện)
    { id: "NK1", ten: "Nam Khian 1", loai: "Thủy điện", nhom: "sci", don_vi: ["bqlda-lao", "sci-pmc", "sci-enc"], ban_dieu_hanh: "bdh-namkhian1", ten_khac: ["TĐ Nam Khiên 1", "Nậm Khiên 1", "TĐ Nậm Khiên 1"] }, // gộp dòng "Nậm Khiên 1" (Mr. Đại 03/10: tên đúng Nam Khian)
    { id: "NK2", ten: "Nam Khian 2", loai: "Thủy điện", nhom: "sci", don_vi: ["bqlda-lao"], ban_dieu_hanh: "bdh-namkhian2", ten_khac: ["TĐ Nam Khiên 2"] },
    { id: "NK3", ten: "Nam Khian 3", loai: "Thủy điện", nhom: "sci", don_vi: ["bqlda-lao"], ban_dieu_hanh: "bdh-namkhian3", ten_khac: ["TĐ Nam Khiên 3"] },
    { id: "NNHL", ten: "Nam Neun hạ lưu", loai: "Thủy điện", nhom: "sci", don_vi: ["bqlda-lao"], ban_dieu_hanh: "bdh-namneun", ten_khac: [] },
    { id: "NL1", ten: "Nam Lan 1", loai: "Thủy điện", nhom: "sci", don_vi: ["bqlda-lao"], ban_dieu_hanh: "bdh-namlan1", ten_khac: [] },
    { id: "NL2", ten: "Nam Lan 2", loai: "Thủy điện", nhom: "sci", don_vi: ["bqlda-lao"], ban_dieu_hanh: "bdh-namlan2", ten_khac: [] },
    // Loại khác — đơn vị đang làm việc cho dự án theo sổ cái (đo 27/09); Nam Sam 3A theo từ điển 3011 "do SCI E&C quản lý"
    { id: "NM1", ten: "Nậm Mô 1", loai: "Thủy điện", nhom: "khac", don_vi: ["sci-pmc", "sci-enc"], ten_khac: ["NM 1", "TĐ Nậm Mô 1"] },
    { id: "NM2", ten: "Nậm Mô 2", loai: "Thủy điện", nhom: "khac", don_vi: ["sci-enc"], ten_khac: ["NM 2", "TĐ Nậm Mô 2"] },
    { id: "HP1", ten: "Hướng Phùng 1", loai: "Điện gió", nhom: "khac", don_vi: ["sci-pmc", "sci-enc"], ten_khac: ["HP1", "ĐG Hướng Phùng 1"] },
    { id: "MDDT", ten: "Mỏ đá Dốc Đá Trắng", loai: "Mỏ đá", nhom: "khac", don_vi: ["sci-enc"], ten_khac: ["Mỏ đá"] },
    { id: "N3A", ten: "Nam Sam 3A", loai: "Thủy điện", nhom: "khac", don_vi: ["sci-enc"], ten_khac: [], ma_tien_do: "N3A" },
  ],
  luong_bao_cao: [
    { tu: "sci-pmc", den: "p-dtpc", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-1" },
    { tu: "sci-enc", den: "p-dtpc", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-1" },
    { tu: "bqlda-qt", den: "p-dtpc", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-1" },
    { tu: "bqlda-lao", den: "p-dtpc", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-1" },
    { tu: "bdh-huongviet", den: "bqlda-qt", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-tanthanh", den: "bqlda-qt", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-batang1", den: "bqlda-qt", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-namkhian1", den: "bqlda-lao", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-namkhian2", den: "bqlda-lao", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-namkhian3", den: "bqlda-lao", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-namneun", den: "bqlda-lao", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-namlan1", den: "bqlda-lao", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "bdh-namlan2", den: "bqlda-lao", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-7" },
    { tu: "nm-namxe", den: "p-ktvh", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-2" },
    { tu: "nm-cannan1", den: "p-ktvh", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-2" },
    { tu: "nm-cannan2", den: "p-ktvh", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-2" },
    { tu: "nm-namlum1", den: "p-ktvh", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-2" },
    { tu: "nm-namlum2", den: "p-ktvh", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-2" },
    { tu: "nm-huonglinh7", den: "p-ktvh", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-2" },
    { tu: "nm-huonglinh8", den: "p-ktvh", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-2" },
    { tu: "p-dtpc", den: "ban-tgd", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-0" },
    { tu: "p-ktvh", den: "ban-tgd", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-0" },
    { tu: "p-hcth", den: "ban-tgd", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-0" },
    { tu: "p-tckt", den: "ban-tgd", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-0" },
    { tu: "p-cd", den: "ban-tgd", kiem_soat: ["truong-don-vi"], tong_hop_thanh: "form-0" },
    { tu: "ban-tgd", den: "ban-tgd", kiem_soat: ["lanh-dao"] },
  ],
  ky_bao_cao: {
    loai: ["tuan", "thang"],
    han_nop_theo_cap: {
      cap1: { tuan: "sau", thu: 1, gio: "10:00" },
      cap2: { tuan: "nay", thu: 6, gio: "10:00" },
      cap3: { tuan: "nay", thu: 6, gio: "08:00" },
      cap4: { tuan: "nay", thu: 5, gio: "17:00" },
    },
    han_nop_thang: { ngay: 3, gio: "10:00" },
    nhac_truoc_gio: 24,
    ngay_nghi: [],
  },
  so_cai: {
    sap_den_han_ngay: 3,
    qua_han_vang_ngay: 3,
    nguyen_tac_ma_viec: "CV-{nam}-{so:4}",
    dang_ma_viec: "CV-{nam}-{so:4}",
    nhac_qua_han: true,
    gio_nhac: "08:00",
    kenh_nhac: ["trong_app"],
    chi_nguoi_giao_duoc_sua: true,
    tu_bo_sung_thieu: true,
  },
  dinh_kem: { giao_viec: true, bao_xong: true, binh_luan: true, toi_da_mb: 50, so_file_toi_da: 20, luu_thang: 6 },
  gan_wbs: { bat: true, che_do: "nguoi_duyet", nguong_tu_duyet: 0.7, cua_so_giao_ngay: 7 },
  bao_cao_tuan: {
    bat: true,
    // Đo 30/09 (Claude CLI 2.1.220): mã đầy đủ claude-opus-5-5 / claude-fable-5-1 lỗi API, 0 token; bí danh "fable" chạy
    // (→ claude-fable-5) và tự theo bản Fable mới nhất CLI hỗ trợ. So Opus 5 vs Fable 5 trên tuần 40: cùng ~54 giây, 0 cảnh báo,
    // Fable bố cục rõ hơn + có câu chốt việc cần tháo gỡ.
    model: "fable",
    model_cham_do_kho: "",
    don_vi_danh_gia: ["p-dtpc", "p-tckt", "p-hcth", "p-cd", "p-ktvh", "bqlda-qt", "bqlda-lao"],
    nguong_qua_tai: 20,
    nguong_can_bang: 8,
    nguong_tre: 25,
    tre_muc_1: 7,
    tre_muc_2: 30,
    gio_viet_muon: "12:00",
  },
  thu_muc: {
    thu_muc_con_mac_dinh: [
      { ten: "Đến", loai: "den" },
      { ten: "Đi", loai: "di" },
      { ten: "Dự án", loai: "du_an" },
      { ten: "Thùng rác", loai: "thung_rac" },
    ],
    thung_rac_giu_ngay: 30,
    quy_uoc_ten_file: "{mau}_{ky}_{don_vi}",
    xem_noi_dung_phong_khac: "tat_ca",
  },
  bao_mat: {
    mau_mat: ["form-4"],
    chuong_mat: ["TÓM TẮT THÔNG TIN CHÍNH", "BÁO CÁO NGUỒN TIỀN — ĐƠN VỊ: TRIỆU ĐỒNG", "BÁO CÁO CHI PHÍ GIÁ THÀNH — ĐƠN VỊ: TRIỆU ĐỒNG"],
    // Chủ tịch HĐQT + Giám đốc Tài chính kiêm Trưởng phòng TCKT (đo 07/10: mã tài khoản truong.tckt@scigroup.vn)
    nguoi_duoc_xem: ["hungnc@scigroup.vn", "manhpd@scigroup.vn"],
    don_vi_theo_quyen: ["p-tckt"],
    cau_tu_choi: "Không có số liệu, đề nghị người dùng liên hệ trưởng phòng TCKT công ty",
  },
  thong_bao: {
    email_gui: "",
    mau: {
      nhan_tai_lieu: "{nguoi_gui} gửi {ten_tai_lieu} đến {don_vi}",
      bi_tra_lai: "{ten_tai_lieu} bị trả lại: {ly_do}",
      sap_den_han: "Việc {ma_viec} sắp đến hạn {han}",
      qua_han: "Việc {ma_viec} đã quá hạn {han}",
      chua_gan_don_vi: "Có người dùng chưa được gán đơn vị: {ten}",
      ban_khong_dung: "Bản của bạn cho việc {ma_viec} không được dùng: {ly_do}",
    },
    ten_nguoi_gui: "SCI công việc",
    theo_loai: {
      nhan_tai_lieu: { trong_app: true, email: true, tieu_de: "Tài liệu mới đến: {noi_dung}" },
      da_nhan: { trong_app: true, email: false, tieu_de: "Tài liệu đã được nhận: {noi_dung}" },
      bi_tra_lai: { trong_app: true, email: true, tieu_de: "Tài liệu bị trả lại: {noi_dung}" },
      hoan_thanh: { trong_app: true, email: false, tieu_de: "Tài liệu đã xử lý xong: {noi_dung}" },
      giao_viec: { trong_app: true, email: true, tieu_de: "Bạn được giao việc: {noi_dung}" },
      gia_han: { trong_app: true, email: true, tieu_de: "Việc được gia hạn: {noi_dung}" },
      bi_de: { trong_app: true, email: false, tieu_de: "Việc bị đè: {noi_dung}" },
      ban_khong_dung: { trong_app: true, email: false, tieu_de: "Bản không được dùng: {noi_dung}" },
      ket_thuc_phan_viec: { trong_app: true, email: false, tieu_de: "Phần việc đã kết thúc: {noi_dung}" },
      cong_viec_hoan_thanh: { trong_app: true, email: false, tieu_de: "Công việc hoàn thành: {noi_dung}" },
      bot_phan_viec: { trong_app: true, email: false, tieu_de: "Phần việc được bớt: {noi_dung}" },
      dong_viec: { trong_app: true, email: true, tieu_de: "Việc đã đóng: {noi_dung}" },
      chua_gan_don_vi: { trong_app: true, email: false, tieu_de: "Có người dùng chưa gán đơn vị" },
      so_cai_thieu: { trong_app: true, email: true, tieu_de: "Sổ cái thiếu việc: {noi_dung}" },
      // qua_han, sap_den_han: kênh lấy theo so_cai.kenh_nhac, ở đây chỉ dùng tiêu đề thư
      qua_han: { trong_app: true, email: false, tieu_de: "Việc quá hạn: {noi_dung}" },
      sap_den_han: { trong_app: true, email: false, tieu_de: "Việc sắp đến hạn: {noi_dung}" },
      khac: { trong_app: true, email: false, tieu_de: "Thông báo: {noi_dung}" },
    },
    smtp: {
      may_chu: "",
      cong: 587,
      bao_mat: "starttls",
      tai_khoan: "",
    },
  },
  ai: {
    model_mac_dinh: "claude-sonnet-5",
    model_tro_ly: "claude-opus-5",
    model_vong_cong_cu: "claude-sonnet-5",
    hai_tai_khoan: false,
    dao_vai_24h: false,
    moi_phien_bat: false,
    moi_phien_gio: "07:00",
    model_them: [],
    bat_gop_y: true,
    cau_goi_y: [
      "Việc nào sắp trễ hạn?",
      "Phòng ĐT&PC còn mấy việc mở?",
      "Hướng Việt đang vướng ở đâu?",
      "Tóm tắt báo cáo tuần mới nhất của SCI E&C",
    ],
  },
  giao_dien: {
    ten_ung_dung: "SCI công việc",
    mau_chinh: "#1f6feb",
    gio_sao_luu: "04:30",
    so_ngay_giu_sao_luu: 30,
    hien_don_vi_khong_viec: true,
    nhom_gap_so_do: [
      "sci-pmc | Đang thiết kế | dự án",
      "sci-enc | Đang thi công | dự án",
      "bqlda-lao | Các dự án Lào | dự án",
      "bqlda-qt | Các dự án QT | dự án",
      "p-ktvh | Các nhà máy | nhà máy",
    ],
  },
  tai_khoan: {
    vai_tro_mac_dinh: ["nhan-vien"],
    do_dai_mat_khau_toi_thieu: 6,
    bao_quan_tri_chua_gan_don_vi: true,
    danh_sach_dang_nhap: true,
    bam_la_dang_nhap: false, // KHÔNG bật cùng lúc với danh_sach_dang_nhap (bật cả hai = ai cũng vào được tài khoản chưa đổi mật khẩu)
  },
  phan_quyen_cau_hinh: {
    // Ví dụ trong kế hoạch: Trưởng phòng ĐT&PC sửa luật kiểm tra (mẫu Word thì theo quyền mau.quan_ly)
    nhom: {
      luat_kiem_tra: { don_vi: ["p-dtpc"], vai_tro: ["truong-don-vi"] },
    },
  },
};

/** Nhóm cài đặt hiển thị trên trang Cài đặt + quyền sửa riêng từng nhóm. */
export const NHOM_CAU_HINH: { khoa: KhoaCauHinh; ten: string; mo_ta: string }[] = [
  { khoa: "quy_tac_de", ten: "Quy tắc đè, luôn mở", mo_ta: "Thứ tự ưu tiên khi việc trùng, việc không ngày" },
  { khoa: "luat_kiem_tra", ten: "Luật kiểm tra", mo_ta: "Bật tắt từng luật, luật nào chặn gửi" },
  { khoa: "gui", ten: "Gửi, chuyển tiếp", mo_ta: "Ai được chuyển tiếp cho ai, trả lại có tạm dừng việc" },
  { khoa: "giao_viec", ten: "Giao chuyển tiếp — nhóm hỗ trợ Ban lãnh đạo", mo_ta: "Chọn người hiện thành một nhóm «ảo» trong ô Giao cho… của lãnh đạo (không có trên sơ đồ tổ chức)" },
  { khoa: "nguoi_ngoai", ten: "Người ngoài 9 đơn vị", mo_ta: "Người chưa gán đơn vị, cá nhân, bên ngoài" },
  { khoa: "luong_bao_cao", ten: "Luồng báo cáo", mo_ta: "Đơn vị nào gửi cho ai, ai kiểm soát, ai tổng hợp" },
  { khoa: "du_an", ten: "Sơ đồ tổ chức dự án", mo_ta: "Dự án SCI đầu tư → Ban QLDA → dự án; Loại khác → dự án; tên gọi khác để khớp sổ cái" },
  { khoa: "ten_goi_khac_don_vi", ten: "Tên gọi khác của đơn vị", mo_ta: "Tên viết tắt ghi trên báo cáo (HL7, NMĐG HL8…) để máy nhận ra đơn vị nộp" },
  { khoa: "cong_ty_don_vi", ten: "Công ty của nhà máy / Ban điều hành", mo_ta: "Công ty vận hành nhà máy, công ty tổng thầu của Ban điều hành — máy điền dòng CÔNG TY …… khi làm báo cáo" },
  { khoa: "ky_bao_cao", ten: "Kỳ báo cáo, hạn nộp", mo_ta: "Tuần, tháng; hạn nộp; ngày nghỉ" },
  { khoa: "so_cai", ten: "Sổ cái, nhắc việc", mo_ta: "Sắp đến hạn, mã việc, kênh nhắc" },
  { khoa: "thu_muc", ten: "Thư mục", mo_ta: "Thư mục con mặc định, thùng rác" },
  { khoa: "dinh_kem", ten: "Tệp đính kèm việc", mo_ta: "Kẹp file khi giao việc, báo xong, bình luận; dung lượng; thời hạn lưu" },
  { khoa: "gan_wbs", ten: "Gắn việc vào WBS", mo_ta: "🤖 AI đề xuất mã WBS cho việc của dự án có cây tiến độ; người duyệt hay AI tự duyệt" },
  { khoa: "bao_cao_tuan", ten: "Báo cáo tuần (AI)", mo_ta: "Model viết, đơn vị được đánh giá, ngưỡng quá tải, hệ số trễ, giờ viết muộn nhất" },
  { khoa: "bao_mat", ten: "Bảo mật báo cáo tài chính", mo_ta: "Mẫu mật, chương mật, ai được xem đủ — chỉ quản trị sửa" },
  { khoa: "thong_bao", ten: "Thông báo, email", mo_ta: "Hộp thư gửi, nội dung mẫu" },
  { khoa: "ai", ten: "AI", mo_ta: "Model mặc định, góp ý, câu gợi ý" },
  { khoa: "giao_dien", ten: "Giao diện, sao lưu", mo_ta: "Tên, màu, giờ sao lưu; sơ đồ tổ chức ẩn/hiện đơn vị không có việc, nhóm bung/gập" },
  { khoa: "tai_khoan", ten: "Tài khoản người dùng", mo_ta: "Vai trò mặc định, độ dài mật khẩu, nhắc người chưa gán đơn vị" },
  { khoa: "phan_quyen_cau_hinh", ten: "Phân quyền cài đặt", mo_ta: "Đơn vị, vai trò nào được sửa riêng nhóm cài đặt nào" },
];
