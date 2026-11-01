"use client";
// ============================================================
// KHO «MÀN / TAB / KHUNG ĐANG CÓ HƯỚNG DẪN NÀO» — Mr. Đại 20/10/2026: nút «? Hướng dẫn» ở THANH TRÊN cạnh «Giải thích»;
// màn / tab / khung đang hiện có hướng dẫn thì nút sáng cam, không có thì mờ. Màn chỉ KHAI (<KhaiHuongDan ma=… />, không vẽ gì),
// thanh trên đọc kho này. Nhiều hướng dẫn cùng lúc: nút mở cái ƯU TIÊN cao nhất (ngang nhau → khai sau cùng);
// trong khung có hàng chọn để đổi sang cái kia.
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { HUONG_DAN, type MaHuongDan } from "@/lib/huong-dan/noi-dung";

interface Muc {
  id: number;
  ma: MaHuongDan;
  /** 0 = khối phụ trong màn · 1 = màn / tab · 2 = khung đang mở đè lên màn */
  uuTien: number;
}
let ds: Muc[] = [];
let soId = 0;
const nghe = new Set<() => void>();
const bao = () => nghe.forEach((f) => f());

/** Danh sách hướng dẫn của màn đang hiện — phần tử đầu là cái nút mở ra */
let anh: MaHuongDan[] = [];
function tinhAnh() {
  const xep = [...ds].sort((a, b) => b.uuTien - a.uuTien || b.id - a.id);
  anh = Array.from(new Set(xep.map((m) => m.ma))).filter((ma) => HUONG_DAN[ma]);
}
const RONG: MaHuongDan[] = [];

export function useDanhSachHuongDan(): MaHuongDan[] {
  return useSyncExternalStore(
    (f) => {
      nghe.add(f);
      return () => nghe.delete(f);
    },
    () => anh,
    () => RONG,
  );
}

/** Đặt trong màn / tab / khung có hướng dẫn — không vẽ gì; gỡ ra (đổi tab, đóng khung) là nút thanh trên tự cập nhật */
export function KhaiHuongDan({ ma, uuTien = 1 }: { ma: MaHuongDan; uuTien?: number }) {
  useEffect(() => {
    const m = { id: ++soId, ma, uuTien };
    ds = [...ds, m];
    tinhAnh();
    bao();
    return () => {
      ds = ds.filter((x) => x.id !== m.id);
      tinhAnh();
      bao();
    };
  }, [ma, uuTien]);
  return null;
}
