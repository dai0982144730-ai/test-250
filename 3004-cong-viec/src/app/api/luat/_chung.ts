// Dùng chung cho /api/luat/*: trả lỗi luật chưa hợp lệ kèm danh sách lỗi.
import { NextResponse } from "next/server";
import { LoiLuatKhongHopLe } from "@/lib/luat/kho-luat";

/** Chạy fn; lỗi LoiLuatKhongHopLe → 400 { loi, danh_sach_loi }. Lỗi khác ném tiếp cho xuLy. */
export async function traLoiLuat<T>(fn: () => Promise<T>): Promise<T | Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LoiLuatKhongHopLe) return NextResponse.json({ loi: e.message, danh_sach_loi: e.danhSach }, { status: 400 });
    throw e;
  }
}
