// ============================================================
// BỘ LỌC AGENT MẬT CỦA TỪNG NGƯỜI — phía máy chủ (đọc phiên + sơ đồ tổ chức)
//
// Mr. Đại chốt 05/10/2026: thông tin agent mật hiện trên Main theo đúng luật của chính
// agent đó (6g.6.14). Hàm lọc dữ liệu là hàm THUẦN ở `agent-mat-loc.ts`; tệp này chỉ trả
// lời "người X thấy agent mật ở dự án nào" — cùng một phép tính với dãy link agent
// (`/api/lien-ket-agent`) và với chính Agent Hợp đồng (`loai-du-an.ts`, bản chép giống hệt).
// ============================================================

import { layPhienCucBo } from "@/lib/route-auth";
import { danhSachNguoiDungDayDu, normalizeEmail } from "@/lib/users";
import { danhSachDuAnDungChung, maNganDuAn } from "@/lib/projects";
import { nguoiKemLoai } from "@/lib/he-thong-dung-chung";
import { duocVaoAgentMat, nguoiXetHopDong, thayDuAnMat } from "@/lib/loai-du-an";
import { duocGhi, duocQuanLyNguoiDung, luonMoiDuAn } from "@/lib/quyen";
import { AN_HET_MAT, canLocTheoNguoi, laAgentTheTheoDuAn, type BoLocMat } from "@/lib/agent-mat-loc";

const THAY_HET: BoLocMat = { thayHet: true, thay: () => true };

/**
 * ⭐ 12/10/2026 (Mr. Đại: «PM của dự án nào thì vào xem và duyệt phiếu giá dự án đó được thôi»): loại PM KHÔNG còn thấy hết phần
 * Hợp đồng trên Main — chỉ dự án mình làm Giám đốc dự án (ô «Giám đốc dự án» ở Cài đặt → Dự án). Chỉ Admin thấy hết. Cùng một
 * phép tính với agent Hợp đồng (`nguoiXetHopDong`, bản chép giống hệt). ⚠ Luật này của riêng agent Hợp đồng — phép xét tách
 * theo agent (`vaiCua`): ở Pháp lý, PM vẫn thấy mọi dự án.
 *
 * Bộ lọc của một người. `role` = loại của phiên đang mở (Admin thấy hết); không truyền thì lấy loại
 * trong sổ. Không có email (chat nhóm, không rõ người) hoặc đọc sơ đồ hỏng → ẩn hết phần mật
 * (Main là cửa sau — thà ẩn nhầm còn hơn lộ; Admin vẫn thấy vì không cần sơ đồ).
 */
export function boLocMatCuaNguoi(email: string | null | undefined, role?: string): BoLocMat {
  if (duocQuanLyNguoiDung(role)) return THAY_HET;
  if (!email) return AN_HET_MAT;
  try {
    const e = normalizeEmail(email);
    const goc = danhSachNguoiDungDayDu().filter((x) => x.email === e);
    if (goc.length === 0) return AN_HET_MAT;
    const u = nguoiKemLoai(goc, danhSachDuAnDungChung())[0];
    const loai = role ?? u?.role;
    if (duocQuanLyNguoiDung(loai)) return THAY_HET;
    const that = { role: loai as string | undefined, loaiTheoDuAn: u?.loaiTheoDuAn };
    // người để xét dự án ở agent Hợp đồng: bảng theo sơ đồ + các dự án mình làm Giám đốc dự án; loại PM không mở mọi dự án
    const vaiHopDong = nguoiXetHopDong(that, e, danhSachDuAnDungChung());
    // ⭐ 12/10/2026 — Pháp lý: xét theo loại THẬT (PM thấy mọi dự án); người khác chỉ dự án mình thuộc theo sơ đồ
    const vaiCua = (agent: string) => (agent === "hopdong" ? vaiHopDong : that);
    const nho = new Map<string, boolean>();
    return {
      thayHet: false,
      thay(agent, duAn) {
        if (!agent || !canLocTheoNguoi(agent)) return true;
        const k = `${agent}|${duAn ?? ""}`;
        const daCo = nho.get(k);
        if (daCo !== undefined) return daCo;
        const vai = vaiCua(agent);
        let kq: boolean;
        if (laAgentTheTheoDuAn(agent)) {
          // ⭐ 18/10/2026 (Q3): thẻ issue agent Công việc — xét theo loại THẬT như Pháp lý (PM thấy mọi dự án); thẻ không gắn
          // dự án chỉ PM (Admin đã thấy hết ở trên) — cách an toàn, không đưa thẻ không rõ dự án cho người ngoài
          if (!duAn) kq = luonMoiDuAn(vai.role);
          else {
            const t = thayDuAnMat(vai, maNganDuAn(duAn) ?? duAn);
            kq = t === null ? duocGhi(vai.role) : t;
          }
        } else if (!duAn) {
          // Dòng của cả hệ, không gắn dự án. Hợp đồng: ai vào được agent mật thì thấy. Pháp lý: luật, mẫu biểu là kiến thức
          // chung — ai cũng thấy (Mr. Đại 12/10/2026: Người xem xem được luật Lào, luật Việt Nam, mẫu biểu, hướng dẫn).
          kq = agent === "phaply" ? true : duocVaoAgentMat(vai);
        } else {
          const t = thayDuAnMat(vai, maNganDuAn(duAn) ?? duAn);
          kq = t === null ? duocGhi(vai.role) : t; // chưa có sơ đồ → luật cũ: Người dùng trở lên
        }
        nho.set(k, kq);
        return kq;
      },
    };
  } catch {
    return AN_HET_MAT;
  }
}

/**
 * Bộ lọc theo `ma_nguoi_dung` của một lượt hỏi agent (18/10/2026 — lưới trong `hoiAgent`): nhận email đủ, hoặc phần trước @
 * (trợ lý chat gửi kiểu này). Phần trước @ trùng nhiều người hoặc không ra ai → ẩn hết (thà ẩn nhầm còn hơn lộ).
 */
export function boLocMatTheoMaNguoi(ma: string | null | undefined): BoLocMat {
  const s = (ma ?? "").trim().toLowerCase();
  if (s === "") return AN_HET_MAT;
  if (s.includes("@")) return boLocMatCuaNguoi(s);
  try {
    const trung = Array.from(new Set(danhSachNguoiDungDayDu().map((x) => normalizeEmail(x.email)).filter((e) => e.split("@")[0] === s)));
    return trung.length === 1 ? boLocMatCuaNguoi(trung[0]) : AN_HET_MAT;
  } catch {
    return AN_HET_MAT;
  }
}

/** Bộ lọc của người đang mở trang / gọi cửa API */
export async function boLocMatCuaToi(): Promise<BoLocMat> {
  const p = await layPhienCucBo();
  return p ? boLocMatCuaNguoi(p.email, p.role) : AN_HET_MAT;
}
