// gui/api.ts — tiện ích cho API route của module kiem-tra-gui (CHỈ SERVER): đọc file/JSON từ request, trả file tải về.
import { LoiHttp } from "@/lib/phien";
import type { TepTaiLen } from "@/lib/thu-muc/dich-vu";
import { GIOI_HAN_TEP } from "./tai-len";

/** File trong multipart/form-data → TepTaiLen. */
export async function tepTuForm(fd: FormData, khoa = "tep", batBuoc = true): Promise<TepTaiLen | null> {
  const f = fd.get(khoa);
  if (!f || typeof f === "string") {
    if (batBuoc) throw new LoiHttp(400, "Chưa chọn file");
    return null;
  }
  const blob = f as File;
  if (blob.size > GIOI_HAN_TEP) throw new LoiHttp(413, "File quá lớn (tối đa 25 MB)");
  return {
    ten_tep: blob.name || "tai-lieu.docx",
    mime: blob.type || "application/octet-stream",
    noi_dung: Buffer.from(await blob.arrayBuffer()),
  };
}

export async function docJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new LoiHttp(400, "Dữ liệu gửi lên không phải JSON hợp lệ");
  }
}

/** Danh sách chuỗi từ form (nhiều giá trị cùng khóa, hoặc một chuỗi JSON). */
export function dsTuForm(fd: FormData, khoa: string): string[] {
  const all = fd.getAll(khoa).map(String).filter(Boolean);
  if (all.length === 1 && all[0].startsWith("[")) {
    try {
      return (JSON.parse(all[0]) as unknown[]).map(String);
    } catch {
      return all;
    }
  }
  return all;
}

export function xacNhanTuForm(fd: FormData): Record<number, string> | undefined {
  const v = fd.get("xac_nhan_trung");
  if (!v || typeof v !== "string") return undefined;
  try {
    return JSON.parse(v) as Record<number, string>;
  } catch {
    return undefined;
  }
}

export function tenAscii(ten: string): string {
  return ten
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
}

export function taiVe(ten: string, noiDung: Buffer, mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"): Response {
  return new Response(new Uint8Array(noiDung), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${tenAscii(ten)}"; filename*=UTF-8''${encodeURIComponent(ten)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=0",
    },
  });
}
