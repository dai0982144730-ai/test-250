// ============================================================
// scripts/tao-bao-cao-kich-ban.mjs — BỘ BÁO CÁO HỢP LỆ CHO CẢ 9 ĐƠN VỊ, TÍNH NGÀY THEO HÔM NAY.
//
// Chạy: node scripts/tao-bao-cao-kich-ban.mjs [yyyy-mm-dd]
//   → ghi 9 báo cáo (+ 2 bản phụ của kịch bản) vào tests/e2e/du-lieu/tuan<N>/ (N = tuần của ngày cho sẵn, mặc định hôm nay)
// Dựng từ mẫu thật đã chuyển (mau-word/form-N.docx) bằng dienBaoCao — đủ ô bắt buộc, đúng kỳ, có bảng việc.
// Test e2e 15-kich-ban-van-hanh dùng cùng hàm này (sinh file ngay khi chạy) nên kịch bản đúng dù chạy ngày nào.
//
// Kịch bản cố ý có việc TRÙNG giữa cấp dưới và cấp trên để xem sổ cái đè theo cấp:
//   - "GPMB Trụ T11":                      BQLDA (cấp 3) ← P.ĐT&PC (cấp 2) ← TGĐ quyết định (cấp 1)
//   - "Thay relay bảo vệ R21 máy phát TM2": NM Nậm Xe (cấp 3) ← P.KT&VH (cấp 2)
//   - "Thu vốn đợt 5 Nậm Khiên 1":          SCI E&C (cấp 3) ← P.TCKT (cấp 2)
// Hạn chọn để sổ cái có đủ trạng thái: quá hạn, sắp đến hạn (≤ 3 ngày), còn hạn, treo (không có ngày).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { taoBaoCao } from "./tao-mau-word.mjs";

const GOC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------- Ngày theo giờ Việt Nam ----------

/** Ngày hôm nay (giờ VN) ở dạng Date UTC 00:00. */
export function homNayVN(luc = new Date()) {
  const s = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(luc); // yyyy-mm-dd
  return new Date(`${s}T00:00:00Z`);
}
const cong = (d, n) => new Date(d.getTime() + n * 86_400_000);
const dmy = (d) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;

/** Tuần ISO (thứ Hai đầu tuần) của ngày d. */
export function tuanISO(d) {
  const thu = (d.getUTCDay() + 6) % 7; // 0 = thứ Hai
  const thuHai = cong(d, -thu);
  const thuNam = cong(thuHai, 3);
  const dauNam = new Date(Date.UTC(thuNam.getUTCFullYear(), 0, 1));
  const so = 1 + Math.floor((thuNam - dauNam) / 86_400_000 / 7);
  return { so, nam: thuNam.getUTCFullYear(), tu: thuHai, den: cong(thuHai, 6) };
}

/**
 * Kịch bản tuần hiện tại: 9 báo cáo (thứ tự gửi: đơn vị cấp 3 → phòng cấp 2 → Ban TGĐ tổng hợp)
 * + 2 bản phụ (BQLDA quên người lập, SCI E&C bản sửa sau khi bị trả lại).
 * Ngày = hôm nay + n ngày (h(n)), nên trạng thái hạn trên sổ cái luôn như nhau.
 */
export function kichBan(luc = new Date()) {
  const nay = homNayVN(luc);
  const h = (n) => dmy(cong(nay, n));
  const t = tuanISO(nay);
  const thangTruoc = new Date(Date.UTC(nay.getUTCFullYear(), nay.getUTCMonth() - 1, 1));
  const kyTuan = { chon: "tuan", tuan: `${t.so}/${t.nam}   (${dmy(t.tu)} – ${dmy(t.den)})` };
  const kyThang = { chon: "thang", thang: `${String(thangTruoc.getUTCMonth() + 1).padStart(2, "0")}/${thangTruoc.getUTCFullYear()}` };
  const ngayLap = h(0);

  const o = (nguoiLap, kiemSoat, ky = kyTuan) => ({
    ky_bao_cao: ky,
    nguoi_lap: nguoiLap,
    ngay_lap: ngayLap,
    nguoi_kiem_soat: kiemSoat,
    ky_nguoi_lap: nguoiLap,
    ky_truong_don_vi: kiemSoat,
  });
  const viec = (ten, du_an, phu_trach, bat_dau, ket_thuc, ket_qua_can_co) => ({ ten, du_an, phu_trach, bat_dau, ket_thuc, ket_qua_can_co });
  const T = t.so;

  const bqlda = (nguoiLap) => ({
    o: o(nguoiLap, "Trịnh Văn Dũng"),
    bang: {
      bang_cong_viec: [
        viec("GPMB Trụ T11", "ĐG Hướng Việt", "BQLDA Quảng Trị", h(-4), h(15), "Thỏa thuận xong với 3 hộ còn lại"),
        viec("Chuyển mục đích đất rừng T14–T16", "ĐG Hướng Việt", "BQLDA Quảng Trị", "", "", "Có văn bản Sở NN&PTNT chuyển mục đích"),
        viec("Thi công móng trụ T5–T8", "ĐG Hướng Việt", "BQLDA Quảng Trị; SCI E&C", h(-20), h(2), "Hoàn thành móng 4 trụ"),
      ],
    },
  });
  const enc = (ban) => ({
    o: o("Đặng Thị Hoa", "Bùi Văn Cường", kyThang),
    bang: {
      bang_ke_hoach: [
        { stt: "1", ten: "Đập chính Nậm Mô 1 đạt 90%", phu_trach: "SCI E&C", ket_thuc: h(36), ket_qua_can_co: "Đập chính đạt 90%" },
        {
          stt: "2",
          ten: "Thu vốn đợt 5 Nậm Khiên 1",
          phu_trach: "SCI E&C; Phòng Tài chính Kế toán",
          ket_thuc: h(20),
          ket_qua_can_co: ban === 1 ? "Thu vốn đợt 5" : "Thu đủ 9,8 tỷ đồng (đã có biên bản nghiệm thu đợt 5)",
        },
        { stt: "3", ten: "Lắp đặt turbine tổ máy 1 Nậm Mô 1", phu_trach: "SCI E&C", ket_thuc: h(66), ket_qua_can_co: "Turbine tổ máy 1 lắp xong" },
      ],
    },
  });

  const baoCao = [
    { ma: "form-7", tep: `BaoCao_Tuan${T}_BQLDA_QuangTri.docx`, nguoi_gui: "nv.bqlda@scigroup.vn", den: ["p-dtpc"], g: bqlda("Lý Thị Nga") },
    {
      ma: "form-5",
      tep: `BaoCao_Tuan${T}_SCI_PMC.docx`,
      nguoi_gui: "gd.pmc@scigroup.vn",
      den: ["p-dtpc"],
      g: {
        o: o("Ngô Thị Hạnh", "Ngô Văn Bình"),
        bang: {
          bang_cong_viec: [
            viec("Giám sát thi công Nậm Mô 1 tháng tới", "Nậm Mô 1", "SCI PMC", h(6), h(36), "Báo cáo giám sát tháng"),
            viec("Nghiệm thu đập chính Nậm Khiên 1 giai đoạn 2", "Nậm Khiên 1", "SCI PMC", h(-15), h(-5), "Biên bản nghiệm thu giai đoạn 2"),
          ],
        },
      },
    },
    { ma: "form-6", tep: `BaoCao_Thang${thangTruoc.getUTCMonth() + 1}_SCI_ENC.docx`, nguoi_gui: "nv.enc@scigroup.vn", den: ["p-dtpc"], g: enc(1) },
    {
      ma: "form-8",
      tep: `BaoCao_Tuan${T}_NM_NamXe.docx`,
      nguoi_gui: "gd.namxe@scigroup.vn",
      den: ["p-ktvh"],
      g: {
        o: o("Nguyễn Văn Tâm", "Mai Văn Sơn"),
        bang: {
          bang_cong_viec: [
            viec("Thay relay bảo vệ R21 máy phát TM2", "NM Nậm Xe", "Nhà máy thủy điện Nậm Xe", h(-3), h(10), "Relay mới vận hành, thí nghiệm đạt"),
            viec("Nạo vét cửa nhận nước", "NM Nậm Xe", "Nhà máy thủy điện Nậm Xe", h(3), h(20), "Cửa nhận nước thông thoáng"),
          ],
        },
      },
    },
    {
      ma: "form-1",
      tep: `BaoCao_Tuan${T}_PDTPC.docx`,
      nguoi_gui: "nv.dtpc@scigroup.vn",
      den: ["ban-tgd"],
      g: {
        o: o("Phạm Thu Hà", "Lê Minh Tuấn"),
        bang: {
          bang_cong_viec: [
            viec("GPMB Trụ T11", "ĐG Hướng Việt", "BQLDA Quảng Trị; Phòng Đầu tư và Pháp chế", h(-4), h(20), "Chi trả xong cho 3 hộ"),
            viec("Gia hạn GPXD Nậm Khiên 1", "Nậm Khiên 1", "Phòng Đầu tư và Pháp chế", h(-4), h(25), "Có giấy phép gia hạn"),
          ],
        },
      },
    },
    {
      ma: "form-2",
      tep: `BaoCao_Tuan${T}_PKTVH.docx`,
      nguoi_gui: "hung.tv@scigroup.vn",
      den: ["ban-tgd"],
      g: {
        o: o("Trần Văn Hùng", "Đỗ Quang Vinh"),
        bang: {
          bang_cong_viec: [
            viec("Thay relay bảo vệ R21 máy phát TM2", "NM Nậm Xe", "Nhà máy thủy điện Nậm Xe; Phòng Kinh tế và Vận hành", h(-3), h(13), "Relay mới vận hành, có biên bản thí nghiệm"),
            viec("Kế hoạch vận hành mùa khô", "NM Nậm Xe", "Phòng Kinh tế và Vận hành", h(-4), h(36), "Kế hoạch được TGĐ duyệt"),
          ],
        },
      },
    },
    {
      ma: "form-3",
      tep: `BaoCao_Tuan${T}_PHCTH.docx`,
      nguoi_gui: "vanthu@scigroup.vn",
      den: ["ban-tgd"],
      g: {
        o: o("Hoàng Thị Mai", "Nguyễn Thị Lan"),
        bang: {
          bang_cong_viec: [
            viec("Tổ chức hội nghị tổng kết quý", "Công ty", "Phòng Hành chính Tổng hợp", h(-4), h(5), "Hội nghị diễn ra, có biên bản"),
            viec("Mua sắm thiết bị văn phòng quý tới", "Công ty", "Phòng Hành chính Tổng hợp", "", "", "Thiết bị bàn giao đủ"),
          ],
        },
      },
    },
    {
      ma: "form-4",
      tep: `BaoCao_Tuan${T}_PTCKT.docx`,
      nguoi_gui: "truong.tckt@scigroup.vn",
      den: ["ban-tgd"],
      g: {
        o: o("Nguyễn Thu Trang", "Vũ Đức Anh"),
        bang: {
          bang_cong_viec: [
            viec("Thu vốn đợt 5 Nậm Khiên 1", "Nậm Khiên 1", "Phòng Tài chính Kế toán; SCI E&C", h(-4), h(17), "Thu đủ 9,8 tỷ đồng"),
            viec("Quyết toán thuế quý", "Công ty", "Phòng Tài chính Kế toán", h(6), h(25), "Tờ khai quyết toán nộp đúng hạn"),
          ],
        },
      },
    },
    {
      ma: "form-0",
      tep: `BaoCao_HopNhat_Tuan${T}.docx`,
      nguoi_gui: "photgd@scigroup.vn",
      den: ["ban-tgd"],
      g: {
        o: { ...o("Phó TGĐ phụ trách", "Tổng Giám đốc"), ky_tgd: "Tổng Giám đốc" },
        bang: {
          bang_quyet_dinh: [
            {
              uu_tien: "1",
              // Mở đầu bằng tên việc đang mở ("…GPMB Trụ T11") để hệ thống gợi ý trùng → TGĐ giao lại, đè việc cũ
              ten: "Chi trả GPMB Trụ T11\nPhê duyệt phương án bồi thường, nâng đơn giá cho 3 hộ theo QĐ mới của UBND tỉnh",
              phu_trach: "BQLDA QT + P.ĐT&PC",
              han_quyet_dinh: h(5),
              tai_lieu: "✅ Tờ trình BQLDA QT, biên bản làm việc với 3 hộ",
            },
          ],
          bang_cong_viec: [viec("Theo dõi tiến độ đập chính Nậm Mô 1", "Nậm Mô 1", "Phòng Kinh tế và Vận hành", h(-4), h(36), "Đập chính đạt 90%")],
        },
      },
    },
  ];

  const banPhu = {
    /** BQLDA bản đầu: quên điền Người lập → hệ thống chặn gửi đúng ô đó. */
    bqldaThieuNguoiLap: { ma: "form-7", tep: `BaoCao_Tuan${T}_BQLDA_QuangTri_thieu-nguoi-lap.docx`, g: bqlda("......") },
    /** SCI E&C bản 2: bổ sung số liệu thu vốn sau khi P.ĐT&PC trả lại. */
    encBan2: { ma: "form-6", tep: `BaoCao_Thang${thangTruoc.getUTCMonth() + 1}_SCI_ENC_ban2.docx`, g: enc(2) },
  };

  return { tuan: t.so, nam: t.nam, ngay_lap: ngayLap, h, baoCao, banPhu };
}

/** Ghi mọi file của kịch bản vào thư mục; trả về { thuMuc, kb }. */
export async function taoBoBaoCao(thuMuc, luc = new Date()) {
  const kb = kichBan(luc);
  const dich = thuMuc ?? path.join(GOC, "tests", "e2e", "du-lieu", `tuan${kb.tuan}`);
  fs.mkdirSync(dich, { recursive: true });
  for (const b of [...kb.baoCao, ...Object.values(kb.banPhu)]) {
    fs.writeFileSync(path.join(dich, b.tep), await taoBaoCao(b.ma, b.g));
  }
  return { thuMuc: dich, kb };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const luc = process.argv[2] ? new Date(`${process.argv[2]}T08:00:00+07:00`) : new Date();
  taoBoBaoCao(undefined, luc).then(({ thuMuc, kb }) =>
    console.log(`Tuần ${kb.tuan}/${kb.nam}, ngày lập ${kb.ngay_lap}: đã tạo ${kb.baoCao.length} báo cáo + ${Object.keys(kb.banPhu).length} bản phụ vào ${thuMuc}`),
  );
}
