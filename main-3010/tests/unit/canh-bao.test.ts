// SỔ ISSUE NỘI BỘ CỦA MAIN — luật thẻ + cấp mã (canh-bao/model + so-issue).
// ⭐ 24/09: bỏ khối "Công thức trễ Nhóm 1" và "Bộ sinh chạy thật trên dữ liệu
// HV" — bộ sinh cảnh báo tiến độ (sinh-nhom12, chay) là bản CHÉP của Agent tiến
// độ, đã gỡ khỏi Main (chốt Mr. Đại 24/09). Các bài đó sống ở repo tiến độ.

import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { duongDanDuLieu } from "@/lib/goc-du-lieu";
import {
  bo_trung,
  laNguonMay,
  sapXep,
  theHopLe,
  tuNangMuc,
  soTuanGiua,
  type TheCanhBao,
} from "@/lib/canh-bao/model";
import {
  docSo,
  ghiNhanXuLy,
  themIssueNguoi,
  dongIssue,
  bacBoDeXuatAi,
  maIssueMoi,
} from "@/lib/canh-bao/so-issue";

function the(p: Partial<TheCanhBao> = {}): TheCanhBao {
  return {
    id: "ISS-2026-35-001",
    nguon: "gang",
    mucDo: "yellow",
    tieuDe: "t",
    phanTich: "p",
    anhHuongCod: 3,
    nguonDuLieu: "n",
    deXuat: "làm gì đó với con số 5",
    dieuKien: "dang-vi-pham",
    xuLy: "chua-ai-dong",
    ghiNhan: [],
    ngayMo: "2026-08-01",
    ...p,
  };
}

// ============ LUẬT CHẶN 10.0 ============

describe("Luật chặn 10.0 — thẻ thiếu Ảnh hưởng COD hoặc Đề xuất thì KHÔNG hiện", () => {
  it("thẻ đủ hai phần thì qua", () => {
    expect(theHopLe(the())).toBe(true);
  });
  it("thiếu ĐỀ XUẤT thì bị loại", () => {
    expect(theHopLe(the({ deXuat: "" }))).toBe(false);
    expect(theHopLe(the({ deXuat: "   " }))).toBe(false);
  });
  it("ảnh hưởng COD = 0 vẫn hợp lệ (việc không trên găng)", () => {
    expect(theHopLe(the({ anhHuongCod: 0 }))).toBe(true);
  });
  it("nguồn AI mà không trích nguyên văn thì bị loại", () => {
    expect(theHopLe(the({ nguon: "ai" }))).toBe(false);
    expect(theHopLe(the({ nguon: "ai", trichNguyenVan: "dân chặn đường" }))).toBe(true);
  });
});

// ============ AI ĐÓNG ĐƯỢC (8.2c) ============

describe("Nguồn 1–3 do máy sinh thì CHỈ MÁY đóng", () => {
  it("phân loại đúng nguồn máy", () => {
    expect(laNguonMay("gang")).toBe(true);
    expect(laNguonMay("nang-suat")).toBe(true);
    expect(laNguonMay("su-kien")).toBe(true);
    expect(laNguonMay("nguoi")).toBe(false);
    expect(laNguonMay("ai")).toBe(false);
  });
});

// ============ LUẬT 8.4 ============

describe("Luật vận hành 8.4", () => {
  it("① không mở trùng — cùng nguồn + cùng đối tượng đang mở thì GIỮ ngày mở cũ", () => {
    const cu = [the({ id: "ISS-A", wbs: "7.2.3", ngayMo: "2026-08-01" })];
    const moi = [the({ id: "ISS-B", wbs: "7.2.3", ngayMo: "2026-09-01" })];
    const ra = bo_trung(cu, moi);
    expect(ra).toHaveLength(1);
    expect(ra[0]!.id).toBe("ISS-A");
    expect(ra[0]!.ngayMo).toBe("2026-08-01");
  });

  it("① đối tượng khác thì mở thẻ mới", () => {
    const ra = bo_trung([the({ wbs: "7.2.3" })], [the({ id: "X", wbs: "7.2.4" })]);
    expect(ra).toHaveLength(2);
  });

  it("② mở 3 tuần chưa ai động thì VÀNG tự lên ĐỎ", () => {
    const t = tuNangMuc(the({ mucDo: "yellow", ngayMo: "2026-08-01" }), "2026-08-29");
    expect(soTuanGiua("2026-08-01", "2026-08-29")).toBe(4);
    expect(t.mucDo).toBe("red");
    expect(t.phanTich).toMatch(/8\.4/);
  });

  it("② đã có người tiếp nhận thì KHÔNG tự nâng", () => {
    const t = tuNangMuc(
      the({ mucDo: "yellow", ngayMo: "2026-08-01", xuLy: "da-tiep-nhan" }),
      "2026-09-01"
    );
    expect(t.mucDo).toBe("yellow");
  });
});

// ============ SẮP XẾP 11.3 ============

describe("Sắp xếp để nhặt lên Tổng quan (11.3)", () => {
  it("đỏ trước, rồi ảnh hưởng COD nhiều hơn lên trước", () => {
    const ds = [
      the({ id: "v1", mucDo: "yellow", anhHuongCod: 30 }),
      the({ id: "d1", mucDo: "red", anhHuongCod: 5 }),
      the({ id: "d2", mucDo: "red", anhHuongCod: 21 }),
    ].sort(sapXep);
    expect(ds.map((x) => x.id)).toEqual(["d2", "d1", "v1"]);
  });
});

// ============ CÔNG THỨC NHÓM 1 ============

// ============ CẤP MÃ ISSUE ============

describe("Cấp mã issue — không được đâm vào mã đã có", () => {
  it("sổ liền mạch thì cấp mã kế tiếp", () => {
    const cu = [the({ id: "ISS-2026-36-001" }), the({ id: "ISS-2026-36-002" })];
    expect(maIssueMoi(cu, "2026-09-02")).toBe("ISS-2026-36-003");
  });

  it("SỔ CÓ LỖ vẫn không cấp trùng — lấy số lớn nhất +1, không phải đếm", () => {
    // 002 đã bị `bo_trung` gộp vào thẻ cũ nên biến mất khỏi sổ.
    // Đếm sẽ ra 2 → cấp 003 → ĐÂM vào thẻ đang có. Đây là lỗi thật, lộ 02/09.
    const cu = [the({ id: "ISS-2026-36-001" }), the({ id: "ISS-2026-36-003" })];
    const moi = maIssueMoi(cu, "2026-09-02");
    expect(cu.some((x) => x.id === moi)).toBe(false);
    expect(moi).toBe("ISS-2026-36-004");
  });

  it("sổ rỗng thì bắt đầu từ 001", () => {
    expect(maIssueMoi([], "2026-09-02")).toBe("ISS-2026-36-001");
  });

  it("mã của tuần khác không ảnh hưởng số thứ tự tuần này", () => {
    const cu = [the({ id: "ISS-2026-35-007" })];
    expect(maIssueMoi(cu, "2026-09-02")).toBe("ISS-2026-36-001");
  });
});
