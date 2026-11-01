"use client";
// ============================================================
// KHO «MÀN / TAB / KHUNG ĐANG HIỆN CÓ HƯỚNG DẪN NÀO» — agent Công việc 3004 (20/10/2026), chép khuôn agent Nghiệm thu 3015.
// Trước đây 3004 tra theo ĐƯỜNG DẪN trang nên không nhận được tab và khung con. Nay màn / tab / khung tự KHAI:
//   <KhaiHuongDan ma="…" uuTien={…} />  — không vẽ gì; gỡ ra (đổi tab, đóng khung) là hướng dẫn đó tự bỏ khỏi nút thanh trên.
// Nhiều hướng dẫn cùng lúc: nút mở cái ƯU TIÊN cao nhất (ngang nhau → khai sau cùng); trong khung có hàng chọn để đổi sang cái kia.
// uuTien: 0 = khối phụ trong màn · 1 = màn / tab · 2 = khung đang mở đè lên màn.
// Mã không có trong kho nội dung thì bỏ qua (màn chưa viết hướng dẫn → nút mờ).
// ============================================================
import { useEffect, useSyncExternalStore } from "react";
import { HUONG_DAN, type MaHuongDan } from "@/lib/huong-dan/noi-dung";

interface Muc {
  id: number;
  ma: string;
  uuTien: number;
}
let ds: Muc[] = [];
let soId = 0;
const nghe = new Set<() => void>();
const bao = () => nghe.forEach((f) => f());

/** Danh sách hướng dẫn của màn đang hiện — phần tử đầu là cái nút mở ra */
let anh: MaHuongDan[] = [];
function tinhAnh() {
  const xep = [...ds].sort((a, b) => b.uuTien - a.uuTien || b.id - a.id).filter((m) => m.ma in HUONG_DAN);
  anh = Array.from(new Set(xep.map((m) => m.ma as MaHuongDan)));
}

export function useDanhSachHuongDan(): MaHuongDan[] {
  return useSyncExternalStore(
    (f) => {
      nghe.add(f);
      return () => nghe.delete(f);
    },
    () => anh,
    () => anh,
  );
}

/** Đặt trong màn / tab / khung có hướng dẫn — không vẽ gì. `ma` nhận chuỗi bất kỳ (Cài đặt ghép mã theo mục); mã lạ bị bỏ qua. */
export function KhaiHuongDan({ ma, uuTien = 1 }: { ma: MaHuongDan | (string & {}); uuTien?: number }) {
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
