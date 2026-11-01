// ============================================================
// API KỸ NĂNG AI — lấy nguyên route /api/skill của agent tiến độ (port từ phaply).
//
// GET  → danh sách kỹ năng người này thấy (hệ thống + kho chung + kho riêng)
// POST { hanhDong: "nap-zip" | "luu-noi-dung" | "nho-ai" | "xoa" | "xuat" | "doc" }
//   nap-zip     : body.duLieuBase64 (file .skill) + body.phamVi
//   luu-noi-dung: body.noiDung (SKILL.md) + body.phamVi
//   nho-ai      : body.noiDungTho → AI sắp lại thành SKILL.md chuẩn (KHÔNG lưu — người xem rồi bấm lưu)
//   doc         : body.slug → nguyên văn SKILL.md
//   xoa         : body.slug + body.phamVi
//   xuat        : body.slug → file .skill (base64) để tải về
// SCI công việc: kho CHUNG cần quyền `ky_nang.them_chung`; kho RIÊNG ai đăng nhập cũng thêm được.
// Thêm kỹ năng (tải .skill hoặc viết trên web) ghi lịch sử `them_ky_nang`.
// ============================================================

import { batBuocDangNhap, LoiHttp, thietBi, xuLy } from "@/lib/phien";
import { coQuyen } from "@sci/identity";
import { tx } from "@/lib/db";
import { ghiLichSu } from "@/lib/lich-su/ghi";
import type { NguoiDungPhien } from "@/lib/types";
import { runAIGan } from "@/lib/ai/providers";
import { docJson } from "@/lib/ai/route-chung";
import {
  docFrontmatterSkillMd,
  docNoiDung,
  layDanhSach,
  luuTuNoiDung,
  luuTuZip,
  xoaSkill,
  xuatRaZip,
  type KyNangTomTat,
  type PhamViSkill,
} from "@/lib/skill/ky-nang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Trần file .skill gửi lên (base64 ~ 1,37 lần) — giải nén còn chặn zip-bomb 20 MB ở ky-nang.ts */
const TRAN_BASE64 = 30 * 1024 * 1024;

function phamViHopLe(v: unknown): PhamViSkill {
  return v === "chung" ? "chung" : "rieng";
}

function kiemQuyenKho(nd: NguoiDungPhien, phamVi: PhamViSkill): void {
  if (phamVi === "chung" && !coQuyen(nd, "ky_nang.them_chung")) {
    throw new LoiHttp(403, "Chỉ người có quyền «Thêm kỹ năng AI vào kho chung» mới sửa được kho chung — bạn vẫn thêm được vào kho riêng.");
  }
}

async function ghiThem(nd: NguoiDungPhien, kq: KyNangTomTat, cach: "tai_len" | "viet_tren_web"): Promise<void> {
  await tx((q) =>
    ghiLichSu(q, {
      nguoi: nd.id,
      doi_tuong_loai: "ky_nang",
      doi_tuong_id: `${kq.phamVi}:${kq.slug}`,
      hanh_dong: "them_ky_nang",
      don_vi_id: nd.don_vi_id,
      thiet_bi: thietBi(),
      chi_tiet: { slug: kq.slug, ten: kq.ten, pham_vi: kq.phamVi, cach, so_byte: kq.soByte },
    }),
  );
}

export async function GET(): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    return { ok: true, skill: layDanhSach(nd.id), duocSuaChung: coQuyen(nd, "ky_nang.them_chung") };
  });
}

export async function POST(request: Request): Promise<Response> {
  return xuLy(async () => {
    const nd = await batBuocDangNhap();
    const nguoi = nd.id;
    const body = await docJson(request);
    const hanhDong = String(body.hanhDong ?? "");

    // Lỗi nghiệp vụ của ky-nang.ts (zip hỏng, zip-slip, thiếu frontmatter…) → 400 tiếng Việt
    const chay = async <T,>(fn: () => T | Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof LoiHttp) throw e;
        throw new LoiHttp(400, e instanceof Error ? e.message : "Lỗi không rõ.");
      }
    };

    switch (hanhDong) {
      case "nap-zip": {
        const phamVi = phamViHopLe(body.phamVi);
        kiemQuyenKho(nd, phamVi);
        const b64 = String(body.duLieuBase64 ?? "");
        if (!b64) throw new LoiHttp(400, "Chưa chọn file.");
        if (b64.length > TRAN_BASE64) throw new LoiHttp(400, "File .skill quá lớn (tối đa khoảng 20 MB).");
        const kq = await chay(() => luuTuZip(nguoi, Buffer.from(b64, "base64"), phamVi));
        await ghiThem(nd, kq, "tai_len");
        return { ok: true, message: `Đã nạp kỹ năng "/${kq.slug}" (${Math.round(kq.soByte / 1024)} KB) — dùng được ngay trong khung chat.`, skill: layDanhSach(nguoi) };
      }

      case "luu-noi-dung": {
        const phamVi = phamViHopLe(body.phamVi);
        kiemQuyenKho(nd, phamVi);
        const noiDung = String(body.noiDung ?? "");
        if (noiDung.length > 200_000) throw new LoiHttp(400, "Nội dung SKILL.md quá dài (tối đa 200 KB).");
        const kq = await chay(() => luuTuNoiDung(nguoi, noiDung, phamVi));
        await ghiThem(nd, kq, "viet_tren_web");
        return { ok: true, message: `Đã lưu kỹ năng "/${kq.slug}" — gõ /${kq.slug} trong khung chat để dùng.`, skill: layDanhSach(nguoi) };
      }

      case "nho-ai": {
        const tho = String(body.noiDungTho ?? "").trim();
        if (tho.length < 10) throw new LoiHttp(400, "Nội dung quá ngắn — dán phần hướng dẫn bạn muốn thành kỹ năng.");
        if (tho.length > 30_000) throw new LoiHttp(400, "Nội dung thô quá dài (tối đa 30.000 ký tự).");
        // Cùng prompt phaply đã chạy thật. AI chỉ SẮP LẠI — trả về cho người xem, KHÔNG tự lưu.
        const system =
          "Bạn là công cụ chuyển nội dung thô thành file SKILL.md chuẩn của Claude Code. " +
          "CHỈ trả về nội dung file, KHÔNG giải thích, KHÔNG bọc trong khối ```.\n" +
          "Cấu trúc bắt buộc:\n---\nname: <ten-khong-dau-chu-thuong-noi-bang-gach-ngang>\n" +
          "description: >-\n  <mô tả 2-4 dòng: kỹ năng làm gì, KHI NÀO nên dùng>\n---\n\n" +
          "# <Tiêu đề>\n\n<hướng dẫn, chia mục bằng ##>\n\n" +
          "Quy tắc: giữ ĐÚNG ý người dùng viết, không bịa thông tin chuyên môn. " +
          "Toàn bộ tiếng Việt. `name` chỉ gồm a-z, 0-9 và gạch ngang.";
        let raw: string;
        try {
          raw = await runAIGan("app/api/skill/route", `Chuyển nội dung sau thành file SKILL.md chuẩn:\n\n<noi_dung_tho>\n${tho}\n</noi_dung_tho>`, system);
        } catch (e) {
          throw new LoiHttp(502, `Gọi AI thất bại: ${e instanceof Error ? e.message : String(e)}`);
        }
        const sach = raw.trim().replace(/^```[a-zA-Z]*\r?\n?/, "").replace(/\r?\n?```$/, "").trim();
        if (!docFrontmatterSkillMd(sach)) throw new LoiHttp(400, "AI trả về chưa đúng khuôn SKILL.md — thử lại hoặc tự sửa tay.");
        return { ok: true, noiDung: sach };
      }

      case "doc": {
        const noiDung = docNoiDung(nguoi, String(body.slug ?? ""));
        if (noiDung === null) throw new LoiHttp(404, "Không tìm thấy kỹ năng.");
        return { ok: true, noiDung };
      }

      case "xoa": {
        const phamVi = phamViHopLe(body.phamVi);
        kiemQuyenKho(nd, phamVi);
        const slug = String(body.slug ?? "");
        await chay(() => xoaSkill(nguoi, slug, phamVi));
        await tx((q) =>
          ghiLichSu(q, {
            nguoi: nd.id,
            doi_tuong_loai: "ky_nang",
            doi_tuong_id: `${phamVi}:${slug}`,
            hanh_dong: "xoa_ky_nang",
            don_vi_id: nd.don_vi_id,
            thiet_bi: thietBi(),
            chi_tiet: { slug, pham_vi: phamVi },
          }),
        );
        return { ok: true, message: "Đã xoá kỹ năng.", skill: layDanhSach(nguoi) };
      }

      case "xuat": {
        const buf = await chay(() => xuatRaZip(nguoi, String(body.slug ?? "")));
        return { ok: true, duLieuBase64: buf.toString("base64") };
      }

      default:
        throw new LoiHttp(400, "Hành động không hợp lệ.");
    }
  });
}
