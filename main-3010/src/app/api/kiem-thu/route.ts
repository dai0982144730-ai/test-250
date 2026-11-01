// API màn Kịch bản test.
//
// POST { hanhDong: "cham" | "bo-cham" | "them-phat-sinh" | "sua-phat-sinh"
//        | "xoa-phat-sinh" | "luu-anh" }
// GET  → sổ kết quả hiện tại
//
// Mọi thay đổi đều ghi ra file (data/kiem-thu/<dự án>/), và sinh lại
// BAO-CAO-TEST.md để AI đọc được — xem lib/kiem-thu/so-ket-qua.ts.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { resolveProjectId } from "@/lib/projects";
import {
  boCham,
  chamBai,
  docSo,
  luuAnh,
  suaPhatSinh,
  themPhatSinh,
  xoaPhatSinh,
} from "@/lib/kiem-thu/so-ket-qua";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, so: docSo(resolveProjectId(null)) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Body phải là JSON." }, { status: 400 });
  }

  const projectId = resolveProjectId(null);
  const hanhDong = String(body.hanhDong ?? "");
  const chuoi = (k: string): string => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const mangChuoi = (k: string): string[] =>
    Array.isArray(body[k]) ? (body[k] as unknown[]).filter((x): x is string => typeof x === "string") : [];

  try {
    switch (hanhDong) {
      case "cham": {
        const ma = chuoi("ma");
        const tt = chuoi("trangThai");
        if (ma === "") return NextResponse.json({ ok: false, message: "Thiếu mã bài." }, { status: 400 });
        if (tt !== "dat" && tt !== "khong-dat") {
          return NextResponse.json({ ok: false, message: "Trạng thái phải là dat hoặc khong-dat." }, { status: 400 });
        }
        const so = chamBai(projectId, ma, {
          trangThai: tt,
          ghiChu: chuoi("ghiChu") || undefined,
          prompt: chuoi("prompt") || undefined,
          anh: mangChuoi("anh"),
        });
        return NextResponse.json({ ok: true, so, message: "Đã lưu vào sổ trên máy." });
      }

      case "bo-cham":
        return NextResponse.json({ ok: true, so: boCham(projectId, chuoi("ma")), message: "Đã bỏ chấm." });

      case "them-phat-sinh": {
        const ten = chuoi("ten");
        if (ten === "") {
          return NextResponse.json({ ok: false, message: "Vấn đề phải có tên để sau còn tìm lại." }, { status: 400 });
        }
        const so = themPhatSinh(projectId, { ten, prompt: chuoi("prompt"), anh: mangChuoi("anh") });
        return NextResponse.json({ ok: true, so, message: "Đã ghi vấn đề phát sinh." });
      }

      case "sua-phat-sinh": {
        const so = suaPhatSinh(projectId, chuoi("id"), {
          ten: chuoi("ten"),
          prompt: chuoi("prompt"),
          anh: mangChuoi("anh"),
        });
        return NextResponse.json({ ok: true, so, message: "Đã sửa." });
      }

      case "xoa-phat-sinh":
        return NextResponse.json({ ok: true, so: xoaPhatSinh(projectId, chuoi("id")), message: "Đã xoá." });

      case "luu-anh": {
        // Ảnh gửi lên dạng base64 (dán bằng Ctrl+V nên không có file thật)
        const duoi = chuoi("duoi") || "png";
        const b64 = chuoi("duLieu").replace(/^data:image\/[a-z+]+;base64,/, "");
        if (b64 === "") return NextResponse.json({ ok: false, message: "Không có dữ liệu ảnh." }, { status: 400 });
        const ten = luuAnh(projectId, duoi, Buffer.from(b64, "base64"));
        return NextResponse.json({ ok: true, ten });
      }

      default:
        return NextResponse.json({ ok: false, message: `Không hiểu hành động "${hanhDong}".` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "Lỗi khi ghi sổ test." },
      { status: 400 }
    );
  }
}
