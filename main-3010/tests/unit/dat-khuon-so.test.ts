// ============================================================
// BÀI KIỂM "ĐẠT KHUÔN" — khuôn sổ bản 2 (HOP-DONG-KET-NOI 7.1, chốt 26/09/2026)
//
// ⛔ Tệp này GIỐNG HỆT ở 4 app Next (base · hopdong · main · tiendo). Luật điền
//    trường nằm trong `src/lib/nhat-ky/khuon-so.ts` (cũng giống hệt 5 nơi);
//    bài này chỉ đòi tệp khuôn tự kiểm sạch.
// ============================================================

import { describe, expect, it } from "vitest";
import { KHUON_SO, PHIEN_BAN_SO, tuKiemKhuonSo } from "@/lib/nhat-ky/khuon-so";

describe("đạt khuôn sổ bản 2", () => {
  it("tệp khuôn tự kiểm không hỏng câu nào", () => {
    expect(tuKiemKhuonSo()).toEqual([]);
  });

  it("khai khuôn 2.0 · phiên bản sổ 2", () => {
    expect(KHUON_SO).toBe("2.0");
    expect(PHIEN_BAN_SO).toBe(2);
  });
});
