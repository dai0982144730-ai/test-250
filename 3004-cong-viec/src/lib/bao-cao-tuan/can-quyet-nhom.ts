// ============================================================
// bao-cao-tuan/can-quyet-nhom.ts — 4 NHÓM của tab "Cần BLĐ ra quyết định" (Mr. Đại chốt 20/10/2026, mục 6). File THUẦN (luật 10).
// Bản 2 (Mr. Đại sửa cùng ngày 20/10) — nhóm theo GIAI ĐOẠN dự án (6 giai đoạn PMP, lib/phong/giai-doan-thuan.ts):
//   · Trước khởi công     — dự án SCI đầu tư · Khởi tạo (pháp lý, chủ trương, GPMB…) · Thiết kế · Kế hoạch (đấu thầu, vốn…)
//   · Thực thi, kiểm soát — dự án SCI đầu tư · Thực thi · Kiểm soát · Kết thúc (anh chốt: kết thúc cũng vào đây)
//   · ENC đề xuất         — dự án Loại khác (SCI E&C làm, không do SCI đầu tư), cả 6 giai đoạn
//   · Nhóm khác           — còn lại: vận hành nhà máy, nội bộ phòng ban, kiến nghị không gắn dự án
// Giai đoạn xét theo NỘI DUNG dòng (anh chốt), không theo tình trạng dự án: GPMB Hướng Việt lúc đang thi công vẫn là Trước khởi công.
// Kiến nghị E&C gửi về dự án SCI đầu tư → theo giai đoạn vào hai nhóm SCI (anh chốt).
// CODE xếp trước theo ĐƠN VỊ GỬI (Ban điều hành của dự án nào) + DỰ ÁN NHẮC TRONG DÒNG + chữ theo giai đoạn; dòng code không chắc
// thì 🤖 AI xếp (can-quyet-nhom-ai.ts, kèm lý do); người bấm chuyển nhóm — người sửa THẮNG AI (bảng can_quyet_nhom, db/88).
// Mã nhóm bản 1 (dau_tu · thi_cong_sci · thi_cong_enc) không còn hợp lệ → dòng AI đã xếp theo bản 1 tự xếp lại.
// ============================================================
import { duAnTrongTen, type DuAn } from "@/lib/phong/du-an-thuan";

export type NhomCanQuyet = "truoc_khoi_cong" | "thuc_thi" | "enc" | "khac";
export const NHOM_CAN_QUYET: { kieu: NhomCanQuyet; nhan: string; giai_thich: string }[] = [
  { kieu: "truoc_khoi_cong", nhan: "Trước khởi công", giai_thich: "Dự án SCI đầu tư, giai đoạn Khởi tạo · Thiết kế · Kế hoạch: pháp lý, chủ trương, GPMB, thiết kế, đấu thầu, vốn…" },
  { kieu: "thuc_thi", nhan: "Thực thi, kiểm soát", giai_thich: "Dự án SCI đầu tư, giai đoạn Thực thi · Kiểm soát · Kết thúc: thi công, thiết bị, nghiệm thu, thanh toán, quyết toán…" },
  { kieu: "enc", nhan: "ENC đề xuất", giai_thich: "Dự án Loại khác (SCI E&C làm, không do SCI đầu tư) — cả 6 giai đoạn" },
  { kieu: "khac", nhan: "Nhóm khác", giai_thich: "Ngoài ba nhóm trên: vận hành nhà máy, nội bộ phòng ban, kiến nghị không gắn dự án" },
];
export const laNhomCanQuyet = (x: unknown): x is NhomCanQuyet => NHOM_CAN_QUYET.some((n) => n.kieu === x);

/** Ai xếp nhóm: máy (luật code chắc) · 🤖 AI · người bấm chuyển */
export type NhomBoi = "may" | "ai" | "nguoi";

export interface XepNhom {
  nhom: NhomCanQuyet;
  /** code chắc chắn — không cần AI */
  chac: boolean;
  /** dự án code nhận ra (mã) — để AI và người đọc biết vì sao */
  du_an: string | null;
}

/**
 * Biểu thức chữ có RANH GIỚI TỪ hai bên (kiểm độc lập lần 6, F-A7: «cod» từng khớp «code», «pda» khớp «update», «fs» khớp
 * «sfs»); khoảng trắng giữa hai chữ của một cụm cho nhiều dấu cách / xuống dòng. Chữ đầu vào đã viết thường + NFC.
 */
const tuGiaiDoan = (cac: string) =>
  new RegExp(String.raw`(?<![\p{L}\p{M}\p{N}])(?:${cac.replace(/ /g, String.raw`\s+`)})(?![\p{L}\p{M}\p{N}])`, "u");

// Chữ theo giai đoạn. TRƯỚC KHỞI CÔNG = Khởi tạo (pháp lý, chủ trương, đất) · Thiết kế (khảo sát, TKCS, FS…) · Kế hoạch (đấu thầu, vốn).
const CHU_TRUOC = tuGiaiDoan(
  "pháp lý|giải phóng mặt bằng|gpmb|đền bù|bồi thường|thu hồi đất|giao đất|thuê đất|chuyển mục đích|sử dụng đất|quy hoạch|chủ trương|giấy phép|cấp phép|thủ tục|pda|quyền phát triển|đánh giá tác động môi trường|đtm|chuyển đổi rừng|trồng rừng thay thế|thỏa thuận đấu nối|thoả thuận đấu nối|ppa|mua bán điện|khảo sát|thiết kế|tkcs|tkkt|nckt|báo cáo khả thi|fs|tmb|thẩm định|phê duyệt (dự án|đầu tư|fs|tkcs|tkkt|tmđt)|tmđt|tổng mức đầu tư|đấu thầu|gói thầu|hồ sơ (mời|dự) thầu|hsdt|hsmt|lựa chọn nhà thầu|kế hoạch vốn|thu xếp vốn|vay vốn|tín dụng",
);
// THỰC THI, KIỂM SOÁT, KẾT THÚC = thi công, thiết bị, nghiệm thu, thanh toán khối lượng, quyết toán, bàn giao.
const CHU_THUC = tuGiaiDoan(
  "thi công|xây dựng (công trình|nhà máy|đập|hầm|tuyến|trạm)|xây lắp|lắp đặt|lắp dựng|tổng thầu|nhà thầu thi công|đào đắp|bê tông|hầm|đập|cửa nhận nước|tuyến (ống|năng lượng)|kênh dẫn|móng|trụ (điện|tuabin|móng)|đường dây|trạm biến áp|vật tư|nghiệm thu|đóng điện|cod|chạy thử|hòa lưới|hoà lưới|an toàn lao động|atlđ|bvtc|bản vẽ thi công|khối lượng|công trường|mũi thi công|thanh toán|epc|tiến độ thi công|giám sát|quyết toán|bàn giao|rotor|thiết bị (về|giao|nhập|chậm)",
);
// VẬN HÀNH nhà máy đang chạy — không thuộc giai đoạn dự án nào → Nhóm khác
const CHU_VAN_HANH = tuGiaiDoan(
  "vận hành|bảo dưỡng|bảo trì|sửa chữa|sự cố|dừng máy|hư hỏng|hộp số|sản lượng|phát điện|relay|rơle|scada|bảo hành|nhà máy (thủy|thuỷ|điện)|nm",
);

export interface DuLieuXep {
  du_an: DuAn[];
  /** đơn vị → đơn vị cha (identity.don_vi) */
  cha: Record<string, string | null>;
}

/** Dự án mà đơn vị gửi là Ban điều hành của nó (hoặc nằm dưới Ban điều hành đó) */
function duAnCuaDonViGui(dv: string, dl: DuLieuXep): DuAn | null {
  for (let u: string | null | undefined = dv, n = 0; u && n < 8; u = dl.cha[u], n++) {
    const a = dl.du_an.find((x) => x.ban_dieu_hanh === u);
    if (a) return a;
  }
  return null;
}

/** Đơn vị gửi làm cho dự án SCI đầu tư (BQLDA Lào, BQLDA QT, P.ĐT&PC, PMC…) / cho dự án Loại khác (SCI E&C…) */
const laDonViSci = (dv: string, dl: DuLieuXep) => dl.du_an.some((a) => a.nhom === "sci" && a.don_vi.includes(dv));
const laDonViLoaiKhac = (dv: string, dl: DuLieuXep) => dl.du_an.some((a) => a.nhom !== "sci" && a.don_vi.includes(dv));

/**
 * Code xếp một dòng (kiến nghị / quyết định Form 0) vào 4 nhóm. `chac = false` → để 🤖 AI đọc lại (nhóm trả về là dự đoán tạm
 * khi AI chưa đọc xong).
 */
export function xepNhomCanQuyet(d: { noi_dung: string; kien_nghi?: string; don_vi: { id: string }[] }, dl: DuLieuXep): XepNhom {
  const chu = `${d.noi_dung} ${d.kien_nghi ?? ""}`;
  const thuong = chu.normalize("NFC").toLowerCase();
  const truoc = CHU_TRUOC.test(thuong);
  const thuc = CHU_THUC.test(thuong);
  const theoGui = [...new Set(d.don_vi.map((x) => duAnCuaDonViGui(x.id, dl)).filter((a): a is DuAn => !!a))];
  const theoChu = duAnTrongTen(chu, dl.du_an);
  // Nhiều đơn vị gửi thuộc hai loại dự án khác nhau, hoặc chữ nhắc dự án khác loại với Ban điều hành gửi → không chắc
  const loai = new Set([...theoGui, ...(theoChu ? [theoChu] : [])].map((a) => (a.nhom === "sci" ? "sci" : "khac")));
  const a = theoChu ?? theoGui[0] ?? null;
  const ma = a?.id ?? null;
  if (a) {
    // Dự án Loại khác: mọi giai đoạn → ENC đề xuất
    if (a.nhom !== "sci") return { nhom: "enc", chac: loai.size === 1, du_an: ma };
    const chacLoai = loai.size === 1;
    // Ban điều hành tổng thầu (đơn vị thi công) gửi lên: mặc định thực thi, trừ khi nói chuyện trước khởi công
    const tuBdh = theoGui.some((x) => x.id === a.id);
    if (truoc && !thuc) return { nhom: "truoc_khoi_cong", chac: chacLoai, du_an: ma };
    if (thuc && !truoc) return { nhom: "thuc_thi", chac: chacLoai, du_an: ma };
    if (tuBdh && !truoc) return { nhom: "thuc_thi", chac: chacLoai, du_an: ma };
    // Có cả hai loại chữ: theo nội dung (anh chốt) — có chữ trước khởi công thì đoán Trước khởi công, để 🤖 AI đọc lại
    return { nhom: truoc ? "truoc_khoi_cong" : "thuc_thi", chac: false, du_an: ma };
  }
  // Không nhận ra dự án
  if (CHU_VAN_HANH.test(thuong) && !truoc && !thuc) return { nhom: "khac", chac: true, du_an: null };
  const gui = d.don_vi.map((x) => x.id);
  // Đơn vị gửi làm dự án SCI đầu tư (kể cả SCI PMC / SCI E&C — làm cả hai loại dự án): theo chữ giai đoạn, để 🤖 AI xác nhận
  if (gui.some((u) => laDonViSci(u, dl)) && (truoc || thuc)) return { nhom: truoc ? "truoc_khoi_cong" : "thuc_thi", chac: false, du_an: null };
  if (gui.some((u) => laDonViSci(u, dl) || laDonViLoaiKhac(u, dl))) return { nhom: "khac", chac: false, du_an: null };
  return { nhom: "khac", chac: !truoc && !thuc, du_an: null };
}
