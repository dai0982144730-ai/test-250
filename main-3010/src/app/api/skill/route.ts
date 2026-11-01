// API SKILL AI CỦA TÔI — port từ app/actions/ky-nang.ts của phaply
// (QLDA không dùng Server Actions nên chuyển thành route JSON quen thuộc).
//
// GET  → danh sách skill người này thấy (chung + riêng)
// POST { hanhDong: "nap-zip" | "luu-noi-dung" | "nho-ai" | "xoa" | "xuat" | "doc" }
//   nap-zip     : body.duLieuBase64 (file .skill) + body.phamVi
//   luu-noi-dung: body.noiDung (SKILL.md) + body.phamVi
//   nho-ai      : body.noiDungTho → AI sắp lại thành SKILL.md chuẩn (KHÔNG lưu,
//                 trả về cho người xem rồi bấm lưu — người duyệt, máy không tự ghi)
//   doc         : body.slug → nguyên văn SKILL.md
//   xoa         : body.slug + body.phamVi
//   xuat        : body.slug → file .skill (base64) để tải về
// Server-only.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { runAI } from "@/lib/ai/providers";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { goiCoGhi } from "@/lib/nhat-ky/so";
import {
  docFrontmatterSkillMd,
  docNoiDung,
  layDanhSach,
  luuTuNoiDung,
  luuTuZip,
  xoaSkill,
  xuatRaZip,
  type PhamViSkill,
} from "@/lib/skill/ky-nang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Khoá kho riêng = phần trước @ của email đăng nhập */
function khoaNguoi(email: string): string {
  return email.split("@")[0] ?? email;
}

function phamViHopLe(v: unknown): PhamViSkill {
  return v === "chung" ? "chung" : "rieng";
}

export async function GET() {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, skill: layDanhSach(khoaNguoi(auth.session.email)) });
}

export async function POST(request: Request) {
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;
  const nguoi = khoaNguoi(auth.session.email);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Nội dung gửi lên không hợp lệ." }, { status: 400 });
  }

  const hanhDong = String(body.hanhDong ?? "");

  try {
    switch (hanhDong) {
      case "nap-zip": {
        const b64 = String(body.duLieuBase64 ?? "");
        if (!b64) return NextResponse.json({ ok: false, message: "Chưa chọn file." }, { status: 400 });
        const kq = luuTuZip(nguoi, Buffer.from(b64, "base64"), phamViHopLe(body.phamVi));
        return NextResponse.json({
          ok: true,
          message: `Đã nạp skill "/${kq.slug}" (${Math.round(kq.soByte / 1024).toLocaleString("vi-VN")} KB).`,
          skill: layDanhSach(nguoi),
        });
      }

      case "luu-noi-dung": {
        const noiDung = String(body.noiDung ?? "");
        const kq = luuTuNoiDung(nguoi, noiDung, phamViHopLe(body.phamVi));
        return NextResponse.json({
          ok: true,
          message: `Đã lưu skill "/${kq.slug}".`,
          skill: layDanhSach(nguoi),
        });
      }

      case "nho-ai": {
        const tho = String(body.noiDungTho ?? "").trim();
        if (tho.length < 10) {
          return NextResponse.json(
            { ok: false, message: "Nội dung quá ngắn — dán phần hướng dẫn bạn muốn thành skill." },
            { status: 400 }
          );
        }
        // Cùng prompt phaply đã chạy thật. AI chỉ SẮP LẠI — trả về cho người
        // xem, KHÔNG tự lưu (người duyệt).
        const system =
          "Bạn là công cụ chuyển nội dung thô thành file SKILL.md chuẩn của Claude Code. " +
          "CHỈ trả về nội dung file, KHÔNG giải thích, KHÔNG bọc trong khối ```.\n" +
          "Cấu trúc bắt buộc:\n---\nname: <ten-khong-dau-chu-thuong-noi-bang-gach-ngang>\n" +
          "description: >-\n  <mô tả 2-4 dòng: skill làm gì, KHI NÀO nên dùng>\n---\n\n" +
          "# <Tiêu đề>\n\n<hướng dẫn, chia mục bằng ##>\n\n" +
          "Quy tắc: giữ ĐÚNG ý người dùng viết, không bịa thông tin chuyên môn. " +
          "Toàn bộ tiếng Việt. `name` chỉ gồm a-z, 0-9 và gạch ngang.";
        const raw = await goiCoGhi(
          {
            agentTraLoi: "llm",
            congCu: "skill.nho_ai_chuan_hoa",
            thamSo: { soKyTu: tho.length },
            lyDoGoi: "Màn Skill AI: người dán nội dung thô, nhờ AI sắp thành SKILL.md chuẩn",
            duong: "tay",
            nguoi: auth.session.name,
          },
          () => chayVoiNguoiGoiAi(auth.session.email, () => runAI(`Chuyển nội dung sau thành file SKILL.md chuẩn:\n\n<noi_dung_tho>\n${tho}\n</noi_dung_tho>`, system))
        );
        const sach = raw.trim().replace(/^```[a-zA-Z]*\r?\n?/, "").replace(/\r?\n?```$/, "").trim();
        if (!docFrontmatterSkillMd(sach)) {
          return NextResponse.json(
            { ok: false, message: "AI trả về chưa đúng khuôn SKILL.md — thử lại hoặc tự sửa tay." },
            { status: 400 }
          );
        }
        return NextResponse.json({ ok: true, noiDung: sach });
      }

      case "doc": {
        const noiDung = docNoiDung(nguoi, String(body.slug ?? ""));
        if (noiDung === null)
          return NextResponse.json({ ok: false, message: "Không tìm thấy skill." }, { status: 404 });
        return NextResponse.json({ ok: true, noiDung });
      }

      case "xoa": {
        xoaSkill(nguoi, String(body.slug ?? ""), phamViHopLe(body.phamVi));
        return NextResponse.json({ ok: true, message: "Đã xoá skill.", skill: layDanhSach(nguoi) });
      }

      case "xuat": {
        const buf = xuatRaZip(nguoi, String(body.slug ?? ""));
        return NextResponse.json({ ok: true, duLieuBase64: buf.toString("base64") });
      }

      default:
        return NextResponse.json({ ok: false, message: "Hành động không hợp lệ." }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, message: err instanceof Error ? err.message : "Lỗi không rõ." },
      { status: 400 }
    );
  }
}
