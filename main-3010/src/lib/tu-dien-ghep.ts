// ============================================================
// TỪ ĐIỂN NGỮ CẢNH — MAIN TỰ GHÉP (Mr. Đại chốt 04/10/2026, CHOT LOI-DUNG-CHUNG 6g.7 mục 5; thay phần gõ tay của 6f)
//
// Trước: một ô gõ tay 6.581 ký tự (có mục giải mã tiền tố Base.vn, "ba dự án Ban QLDA" đã lỗi thời).
// Nay: A "Tập đoàn và công ty thành viên" (gõ tay) + B dự án (máy ghép từ danh mục dự án Main) + C sơ đồ tổ chức
// và chức năng nhiệm vụ (máy ghép từ data/to-chuc.json) + D "Chỗ bổ sung" (gõ tay). Mục giải mã tiền tố Base.vn bỏ.
// File THUẦN (luật 10): không đụng node:fs — server đọc dữ liệu ở lib/tu-dien-ngu-canh.ts rồi gọi vào đây.
// ============================================================
import type { DonViToChuc, KiemNhiemToChuc } from "@/lib/to-chuc-kieu";

export interface DuAnTuDien {
  ma?: string;
  name: string;
  tenKhac?: string[];
  nhom?: "sci" | "khac";
  donVi?: string[];
  banDieuHanh?: string;
}

export interface NguoiTuDien {
  id: string;
  name: string;
  donViId?: string | null;
  chucVu?: string | null;
  vaiCongViec?: string[];
  active?: boolean;
}

export interface DauVaoTuDien {
  congTy: string;
  boSung: string;
  duAn: DuAnTuDien[];
  donVi: DonViToChuc[];
  kiemNhiem: KiemNhiemToChuc[];
  nguoi: NguoiTuDien[];
  /** Giờ ghép, đã định dạng để người đọc (vd "04/10/2026 12:30") */
  luc: string;
}

/**
 * Tách ô gõ tay cũ thành hai ô mới (chạy một lần khi tệp chưa có hai trường mới):
 *   A = thân mục "2. Tập đoàn và các công ty thành viên";
 *   D = mục "5. Danh mục dự án SCI Group đã và đang triển khai" (năng lực tập đoàn — KHÔNG phải danh sách dự án hệ
 *       thống đang quản, máy không ghép được nên giữ nguyên chữ) + thân mục "6. Chỗ để bổ sung".
 * Bỏ: mục 1 (hướng dẫn nạp vào Base) · 3 (giải mã tiền tố Base.vn) · 4 (ba dự án Ban QLDA — nay máy ghép ở B).
 * Không nhận ra khuôn → A rỗng, D = nguyên văn (không mất chữ nào).
 */
export function tachTuDienCu(cu: string): { congTy: string; boSung: string } {
  const dong = cu.replace(/\r\n/g, "\n").split("\n");
  const tim = (re: RegExp) => dong.findIndex((l) => re.test(l.trim()));
  const i2 = tim(/^2\.\s/);
  const i3 = tim(/^3\.\s/);
  const i5 = tim(/^5\.\s/);
  const i6 = tim(/^6\.\s/);
  if (i2 < 0 || i3 <= i2 || i5 < 0 || i6 <= i5) return { congTy: "", boSung: cu.trim() };
  const congTy = dong.slice(i2 + 1, i3).join("\n").trim();
  const nangLuc = dong.slice(i5, i6).join("\n").trim();
  const muc6 = dong
    .slice(i6 + 1)
    .filter((l) => !/^Phần dưới để trống cho Mr\. Đại điền thêm/.test(l.trim()))
    .join("\n")
    .trim();
  return { congTy, boSung: [nangLuc, muc6].filter(Boolean).join("\n\n") };
}

const TEN_NHOM: Record<string, string> = { sci: "SCI đầu tư", khac: "Loại khác" };

function tenDonVi(ma: string, theoMa: Map<string, DonViToChuc>): string {
  const d = theoMa.get(ma);
  return d ? (d.ten_ngan && d.ten_ngan !== d.ten ? `${d.ten_ngan} (${d.ten})` : d.ten) : ma;
}

/** Người đứng đầu một đơn vị: trưởng chính nếu đã chọn, không thì người mang vai "Trưởng đơn vị" có đơn vị chính ở đó */
function nguoiDungDau(d: DonViToChuc, nguoi: NguoiTuDien[]): string[] {
  const dangDung = nguoi.filter((n) => n.active !== false);
  if (d.uy_quyen_truong) {
    const n = dangDung.find((x) => x.id === d.uy_quyen_truong);
    return n ? [n.name] : [];
  }
  return dangDung.filter((n) => n.donViId === d.id && (n.vaiCongViec ?? []).includes("truong-don-vi")).map((n) => n.name);
}

export function ghepTuDien(v: DauVaoTuDien): string {
  const theoMa = new Map(v.donVi.map((d) => [d.id, d]));
  const ra: string[] = [];
  ra.push("CƠ CẤU TỔ CHỨC VÀ DANH MỤC DỰ ÁN — từ điển ngữ cảnh dùng chung cho các agent");
  ra.push(
    `Main tự ghép lúc ${v.luc}. Phần A và D do người gõ ở Main › Cài đặt; phần B và C máy lấy thẳng từ danh mục dự án và sơ đồ tổ chức của Main — muốn sửa thì sửa ở đó.`,
  );

  ra.push("", "A. TẬP ĐOÀN VÀ CÁC CÔNG TY THÀNH VIÊN", v.congTy.trim() || "(chưa khai)");

  const duAn = v.duAn.filter((d) => d.ma);
  ra.push("", `B. DỰ ÁN ĐANG QUẢN LÝ TRÊN HỆ THỐNG (${duAn.length} dự án)`);
  ra.push("Mỗi dòng: mã ngắn — tên · tên gọi khác · nhóm · đơn vị gắn (dự án SCI đầu tư: đơn vị đầu tiên là Ban QLDA đứng đầu).");
  for (const d of duAn) {
    const phan = [`- ${d.ma} — ${d.name}`];
    const khac = (d.tenKhac ?? []).filter((t) => t && t !== d.name);
    if (khac.length) phan.push(`tên khác: ${khac.join(", ")}`);
    if (d.nhom) phan.push(TEN_NHOM[d.nhom] ?? d.nhom);
    const dv = d.donVi ?? [];
    if (dv.length) {
      if (d.nhom === "sci") {
        phan.push(`Ban QLDA: ${tenDonVi(dv[0], theoMa)}`);
        if (dv.length > 1) phan.push(`đơn vị làm: ${dv.slice(1).map((m) => tenDonVi(m, theoMa)).join(", ")}`);
      } else {
        phan.push(`đơn vị làm: ${dv.map((m) => tenDonVi(m, theoMa)).join(", ")}`);
      }
    }
    if (d.banDieuHanh) phan.push(`Ban điều hành: ${tenDonVi(d.banDieuHanh, theoMa)}`);
    ra.push(phan.join(" · "));
  }

  const dangDung = v.donVi.filter((d) => d.active !== false);
  ra.push("", `C. SƠ ĐỒ TỔ CHỨC (${dangDung.length} đơn vị)`);
  ra.push("Thụt lề theo cấp. Mỗi đơn vị: tên (tên ngắn) — người đứng đầu — chức năng nhiệm vụ.");
  const con = new Map<string | null, DonViToChuc[]>();
  for (const d of dangDung) {
    const cha = d.cha_id && theoMa.has(d.cha_id) ? d.cha_id : null;
    con.set(cha, [...(con.get(cha) ?? []), d]);
  }
  con.forEach((ds) => ds.sort((a, b) => a.cap - b.cap || a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, "vi")));
  const daIn = new Set<string>();
  const inCay = (cha: string | null, sau: number) => {
    for (const d of con.get(cha) ?? []) {
      if (daIn.has(d.id)) continue;
      daIn.add(d.id);
      const le = "  ".repeat(sau);
      const ten = d.ten_ngan && d.ten_ngan !== d.ten ? `${d.ten} (${d.ten_ngan})` : d.ten;
      const dau = d.loai === "chuc_danh" ? [] : nguoiDungDau(d, v.nguoi);
      ra.push(`${le}- ${ten}${dau.length ? ` — đứng đầu: ${dau.join(", ")}` : ""}`);
      if (d.chuc_nang?.trim()) ra.push(`${le}  Chức năng nhiệm vụ: ${d.chuc_nang.trim().replace(/\s*\n\s*/g, " ")}`);
      inCay(d.id, sau + 1);
    }
  };
  inCay(null, 0);
  const tenNguoi = new Map(v.nguoi.map((n) => [n.id, n.name]));
  const kiem = v.kiemNhiem.filter((k) => theoMa.has(k.don_vi_id) && tenNguoi.has(k.nguoi_id));
  if (kiem.length) {
    ra.push("Kiêm nhiệm:");
    for (const k of kiem) ra.push(`- ${tenNguoi.get(k.nguoi_id)} — ${k.chuc_vu ?? "kiêm nhiệm"} — ${tenDonVi(k.don_vi_id, theoMa)}`);
  }

  ra.push("", "D. BỔ SUNG", v.boSung.trim() || "(chưa có)");
  return ra.join("\n");
}
