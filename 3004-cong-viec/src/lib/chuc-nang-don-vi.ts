// ============================================================
// chuc-nang-don-vi.ts — CHỨC NĂNG NHIỆM VỤ của từng đơn vị (db/81, Mr. Đại chốt 03/10/2026).
//   · Nạp sẵn MỘT lần (ô đang trống mới điền, ghi dấu luat_danh_dau để quản trị xoá đi thì không điền lại).
//   · Nguồn: NQ 06/2026/NQ-SCI-HĐQT ngày 29/05/2026 Phụ lục 02 (4 phòng) · NQ thành lập Phòng Cơ điện ngày 14/09/2026 ·
//     phân công 7 lãnh đạo Mr. Đại nhắn 03/10/2026, kèm 2 chốt cùng ngày:
//       ① pháp lý dự án: dự án BQL Lào → PCT Phúc; BQL Quảng Trị → PTGĐ Độ; pháp lý chung, hợp tác kinh doanh → TGĐ Ngọc
//       ② COD, đóng điện, thỏa thuận chuyên ngành điện: P.Cơ điện chủ trì (NQ 14/09 mới hơn NQ 06), P.KT&VH phối hợp
//   · Đơn vị chưa có tài liệu (BQLDA, SCI PMC, SCI E&C, nhà máy, BĐH) để trống — AI chỉ thấy lãnh đạo phụ trách.
// ============================================================
import type { Q } from "@/lib/db";

const NGUON_NQ06 = "Nguồn: NQ 06/2026/NQ-SCI-HĐQT ngày 29/05/2026, Phụ lục 02.";

export const CHUC_NANG_MAC_DINH: Record<string, string> = {
  "bld-ct-hdqt": "Chuyên trách các công việc liên quan tài chính, kinh tế, chi phí.",
  "bld-pct-hdqt":
    "Chuyên trách các việc liên quan tới các hợp đồng lớn của SCI khi triển khai: hợp đồng mua bán thiết bị, hợp đồng với tổng thầu EPC, hợp đồng tư vấn, giám sát.\n" +
    "Vướng mắc với sở ban ngành Chính phủ Lào.\n" +
    "Chỉ đạo các phòng giải quyết tất cả các công việc liên quan pháp lý của các dự án mà BQLDA Lào triển khai.\n" +
    "Quản lý Phòng Tài chính Kế toán và Phòng Hành chính Tổng hợp.",
  "bld-tgd":
    "Tất cả các vấn đề liên quan pháp lý và hợp tác kinh doanh trên toàn công ty. " +
    "Riêng pháp lý của dự án do BQLDA Lào triển khai thì PCT HĐQT Nguyễn Văn Phúc chỉ đạo, của dự án do BQLDA Quảng Trị triển khai thì PTGĐ Nguyễn Văn Độ chỉ đạo.",
  "bld-ptgd-do":
    "Chỉ đạo các phòng giải quyết tất cả các công việc liên quan pháp lý của các dự án mà BQLDA Quảng Trị triển khai.\n" +
    "Trực tiếp chỉ đạo công việc của Nhà máy điện gió Hướng Linh 7, 8.",
  "bld-ptgd-theanh":
    "Trực tiếp chỉ đạo công việc của các nhà máy thủy điện Ca Nan 1, 2, Nậm Lụm 1, 2, Nậm Xe.\n" + "Quản lý Phòng Kinh tế và Vận hành.",
  "bld-ptgd-nghia": "Toàn bộ công tác thiết kế của SCI.\nQuản lý Phòng Cơ điện.",
  "bld-ptgd-dai":
    "Toàn bộ các hoạt động của các BQLDA của công ty, trừ phần pháp lý (pháp lý dự án BQLDA Lào: PCT Phúc; BQLDA Quảng Trị: PTGĐ Độ).\n" +
    "Kiêm nhiệm Trưởng Phòng Đầu tư và Pháp chế.",
  "p-hcth":
    "Tham mưu, giúp việc Ban lãnh đạo về hành chính, quản trị văn phòng, hậu cần và công việc tổng hợp; phối hợp các đơn vị về hành chính, quản trị nội bộ, sự kiện, đối nội – đối ngoại.\n" +
    "Hành chính: lễ tân, văn thư, lưu trữ, xe phục vụ, mua sắm tài sản/thiết bị văn phòng, quan hệ chính quyền sở tại trong hoạt động văn phòng.\n" +
    "Hạ tầng CNTT cơ bản: mạng nội bộ, máy chủ, email, phần mềm văn phòng, giám sát dịch vụ CNTT thuê ngoài.\n" +
    "Truyền thông nội bộ và thương hiệu: website, fanpage, profile, kế hoạch truyền thông, sự kiện nội bộ (liên hoan, hội nghị, khánh tiết, tham quan, teambuilding; phối hợp Công đoàn).\n" +
    "Nhân sự: tuyển dụng, đào tạo, điều động, khen thưởng, kỷ luật, tranh chấp lao động, chấm dứt hợp đồng lao động; chính sách nhân sự, đãi ngộ (bảo hiểm, phúc lợi); xây dựng, duy trì cơ cấu tổ chức.\n" +
    NGUON_NQ06,
  "p-tckt":
    "Tham mưu, giúp việc Ban lãnh đạo về tài chính, kế toán, dòng tiền, nguồn vốn, tài sản; hạch toán kế toán theo pháp luật và quy định nội bộ.\n" +
    "Tài chính đầu tư: thẩm định, phân tích chỉ số tài chính trong đầu tư; đề xuất phương án tài chính đầu tư.\n" +
    "Tài chính doanh nghiệp: dự báo tài chính, kế hoạch tài chính ngắn/trung/dài hạn; đối tác tài chính, huy động vốn, cơ cấu và phân bổ vốn; kiểm soát sử dụng vốn và ngân sách, đề xuất điều chỉnh chi phí.\n" +
    "Kế toán tài chính: sổ sách, hóa đơn, chứng từ; báo cáo tài chính, quyết toán; làm việc với kiểm toán, thuế; quản lý tài sản, vật tư, chi phí giá thành; kiểm tra hồ sơ thanh quyết toán công trình; công nợ phải thu/phải trả; thanh toán ngân hàng, quỹ; bảo lãnh dự thầu, bảo lãnh thực hiện hợp đồng và các bảo lãnh khác.\n" +
    "Kế toán quản trị: hệ thống báo cáo quản trị; đề xuất chính sách, thủ tục, quy trình, định mức.\n" +
    NGUON_NQ06,
  "p-dtpc":
    "Tham mưu, giúp việc Ban lãnh đạo về đầu tư, quản lý pháp lý và kiểm soát tuân thủ.\n" +
    "Đầu tư: chiến lược và phát triển dự án; chuẩn bị đầu tư; thủ tục pháp lý dự án; triển khai/quản lý triển khai dự án, giám sát tiến độ, chất lượng, hiệu quả; báo cáo, quản trị nội bộ lĩnh vực đầu tư; chủ trì soạn thảo, đàm phán, quản lý thực hiện hợp đồng thuộc phạm vi; công tác đấu thầu, triển khai/quản lý gói thầu.\n" +
    "Pháp chế và quản trị rủi ro: ý kiến pháp lý cho HĐQT, Ban Giám đốc, các phòng; nhận diện, phòng ngừa rủi ro pháp lý và thiệt hại kinh tế; bảo vệ quyền lợi công ty trong tranh chấp, khiếu nại; thẩm định pháp lý văn bản, quy chế, hợp đồng; xây dựng hợp đồng mẫu; phối hợp thủ tục hành chính pháp lý; giải quyết tranh chấp, tố tụng; cập nhật, phổ biến pháp luật.\n" +
    "Chuyển đổi số: nghiên cứu, triển khai phần mềm và công cụ số hóa quản trị; đào tạo, chuyển giao, cải tiến.\n" +
    NGUON_NQ06,
  "p-ktvh":
    "Tham mưu, giúp việc Ban lãnh đạo về kinh tế, kế hoạch, quản lý vận hành các nhà máy điện.\n" +
    "Quản lý sản xuất công nghiệp tại các nhà máy điện (cả chuẩn bị sản xuất): an toàn, liên tục, hiệu quả, đúng kế hoạch, tối ưu chi phí.\n" +
    "Kinh tế, kế hoạch: thủ tục pháp lý ngành điện như PPA (chủ trì, phối hợp P.ĐT&PC); phối hợp P.Cơ điện về thỏa thuận chuyên ngành điện, đóng điện, COD (P.Cơ điện chủ trì từ 14/09/2026); báo cáo, kế hoạch sản xuất kinh doanh toàn công ty; lập tổng mức đầu tư, tổng dự toán, dự toán; tiền lương; giá thành, chi phí, hợp đồng kinh tế, nghiệm thu, thanh quyết toán.\n" +
    NGUON_NQ06,
  "p-cd":
    "Tham mưu, giúp việc Ban lãnh đạo về quản lý kỹ thuật cơ điện cho dự án đầu tư, tổng thầu EPC, tổng thầu và nhà máy; trực tiếp quản lý, thẩm tra, giám sát, kiểm soát chất lượng công tác cơ điện của nhà thầu.\n" +
    "Chuẩn bị đầu tư: đề xuất phương án công nghệ, cấu hình thiết bị, phương án đấu nối; thẩm định phần cơ điện hồ sơ dự án; tham gia lập tổng mức đầu tư phần thiết bị.\n" +
    "Quản lý thiết kế (vai trò chủ đầu tư): yêu cầu kỹ thuật, thẩm định thiết kế cơ điện; đặc tính kỹ thuật thiết bị; kiểm soát thay đổi thiết kế cơ điện.\n" +
    "Đấu thầu: phần kỹ thuật hồ sơ mời thầu gói thiết bị cơ điện; đánh giá kỹ thuật hồ sơ dự thầu.\n" +
    "Hợp đồng: chủ trì đàm phán điều khoản kỹ thuật; duyệt bản vẽ, hồ sơ chế tạo; kế hoạch cấp hàng; kiểm tra xuất xưởng, chứng kiến thí nghiệm, nghiệm thu bàn giao thiết bị.\n" +
    "Lắp đặt, chạy thử: giám sát lắp đặt, thí nghiệm, hiệu chỉnh, chạy thử; xác nhận nghiệm thu, hồ sơ chất lượng, hoàn công cơ điện; CHỦ TRÌ (đầu mối chủ đầu tư) thỏa thuận chuyên ngành điện, thủ tục đóng điện, thử nghiệm, công nhận COD, phối hợp P.KT&VH.\n" +
    "Vận hành, bảo trì: phối hợp P.KT&VH quản lý kỹ thuật vận hành; phân tích sự cố thiết bị; kế hoạch bảo dưỡng, sửa chữa lớn, đại tu, vật tư dự phòng; bảo hành, khiếu nại nhà cung cấp.\n" +
    "Công tác chung: tiêu chuẩn kỹ thuật cơ điện, danh mục thiết bị và nhà cung cấp; an toàn điện, kiểm định thiết bị; đào tạo, sát hạch nhân sự vận hành.\n" +
    "Nguồn: NQ HĐQT thành lập Phòng Cơ điện ngày 14/09/2026.",
};

/** Nạp chức năng nhiệm vụ mặc định MỘT lần — chỉ điền ô đang trống của đơn vị có thật. */
export async function napChucNangMacDinh(q: Q): Promise<void> {
  const khoa = "chuc_nang_don_vi_0310";
  if ((await q.query("SELECT 1 FROM docflow.luat_danh_dau WHERE khoa = $1", [khoa])).rows.length) return;
  let so = 0;
  for (const [id, chu] of Object.entries(CHUC_NANG_MAC_DINH)) {
    const r = await q.query("UPDATE identity.don_vi SET chuc_nang = $2 WHERE id = $1 AND (chuc_nang IS NULL OR chuc_nang = '') RETURNING id", [id, chu]);
    so += r.rows.length;
  }
  await q.query("INSERT INTO docflow.luat_danh_dau (khoa, gia_tri, luc) VALUES ($1, $2::jsonb, now()) ON CONFLICT (khoa) DO NOTHING", [khoa, JSON.stringify({ da_dien: so })]);
}

export interface ChucNangDonVi {
  id: string;
  ten: string;
  loai: string;
  cha_id: string | null;
  chuc_nang: string;
}

/** Đơn vị còn hoạt động CÓ ghi chức năng nhiệm vụ — đầu vào cho 🤖 AI soạn giao việc */
export async function docChucNang(q: Q): Promise<ChucNangDonVi[]> {
  const { rows } = await q.query<ChucNangDonVi>(
    "SELECT id, ten, loai, cha_id, chuc_nang FROM identity.don_vi WHERE active AND chuc_nang IS NOT NULL AND btrim(chuc_nang) <> '' ORDER BY cap, thu_tu, id",
  );
  return rows;
}
