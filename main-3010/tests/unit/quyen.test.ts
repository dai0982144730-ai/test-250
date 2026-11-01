// Bảng quyền 4 loại × 5 cửa — Mr. Đại chốt 25/09/2026 (src/lib/quyen.ts).
// Soát cả hai tầng: ① bảng đúng từng ô ② code không còn tự so mã loại ngoài quyen.ts.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAC_CUA,
  CAC_LOAI,
  MA_TRAN_QUYEN,
  NHAN_LOAI,
  chuanHoaLoai,
  cuaCuaTrang,
  cuaTuDanhSachCu,
  duocCaiDat,
  duocGhi,
  duocPheDuyet,
  duocQuaCua,
  duocQuanLyNguoiDung,
  duocXem,
  luonMoiDuAn,
  type Cua,
  type Role,
} from "@/lib/quyen";
import { canAccessPath } from "@/lib/auth";

// Bảng Mr. Đại chốt — viết tay MỘT lần ở bài kiểm để đối chiếu với code
const BANG_CHOT: Record<Role, Record<Cua, boolean>> = {
  pm: { xem: true, ghi: true, caidat: true, quanlynguoidung: false, pheduyet: true },
  admin: { xem: true, ghi: true, caidat: true, quanlynguoidung: true, pheduyet: false },
  engineer: { xem: true, ghi: true, caidat: false, quanlynguoidung: false, pheduyet: false },
  viewer: { xem: true, ghi: false, caidat: false, quanlynguoidung: false, pheduyet: false },
  // 18/10/2026: Nhà thầu chỉ qua cửa xem — và chỉ ở agent Tiến độ, Nghiệm thu (duocVaoAgent)
  nhathau: { xem: true, ghi: false, caidat: false, quanlynguoidung: false, pheduyet: false },
};

// Tên hiển thị Mr. Đại chốt — cũng viết tay MỘT lần ở đây. `Record<Role, …>` nên thêm loại tài khoản
// mới vào quyen.ts mà quên khai ở đây là tsc báo ngay, không phải đợi bài chạy mới biết.
const NHAN_CHOT: Record<Role, string> = {
  pm: "PM",
  admin: "Admin",
  engineer: "Người dùng",
  viewer: "Người xem",
  nhathau: "Nhà thầu",
};

describe("bảng quyền 25/09", () => {
  for (const loai of CAC_LOAI) {
    for (const cua of CAC_CUA) {
      it(`${NHAN_LOAI[loai]} × ${cua} = ${BANG_CHOT[loai][cua] ? "✓" : "✗"}`, () => {
        expect(duocQuaCua(loai, cua)).toBe(BANG_CHOT[loai][cua]);
        expect(MA_TRAN_QUYEN[cua].includes(loai)).toBe(BANG_CHOT[loai][cua]);
      });
    }
  }

  it("năm hàm tắt khớp bảng", () => {
    expect(CAC_LOAI.filter(duocXem)).toEqual(CAC_LOAI.filter((l) => BANG_CHOT[l].xem));
    expect(CAC_LOAI.filter(duocGhi)).toEqual(["pm", "admin", "engineer"]);
    expect(CAC_LOAI.filter(duocCaiDat)).toEqual(["pm", "admin"]);
    expect(CAC_LOAI.filter(duocQuanLyNguoiDung)).toEqual(["admin"]);
    expect(CAC_LOAI.filter(duocPheDuyet)).toEqual(["pm"]);
  });

  it("tên hiển thị đúng chốt", () => {
    expect(CAC_LOAI.map((l) => NHAN_LOAI[l])).toEqual(CAC_LOAI.map((l) => NHAN_CHOT[l]));
  });

  it("PM + Admin luôn vào mọi dự án", () => {
    expect(CAC_LOAI.filter(luonMoiDuAn)).toEqual(["pm", "admin"]);
  });
});

describe("gỡ mã cũ field", () => {
  it("field đọc vào thành engineer; mã lạ bị từ chối", () => {
    expect(chuanHoaLoai("field")).toBe("engineer");
    expect(chuanHoaLoai("viewer")).toBe("viewer");
    expect(chuanHoaLoai("sep")).toBeNull();
    expect(chuanHoaLoai(undefined)).toBeNull();
  });
  it("tài khoản field cũ qua đúng các cửa của Người dùng", () => {
    for (const cua of CAC_CUA) expect(duocQuaCua("field", cua)).toBe(BANG_CHOT.engineer[cua]);
  });
});

describe("chặn trang + lời gọi kiểu cũ", () => {
  it("/settings cần cửa Cài đặt, trang khác cửa Xem", () => {
    expect(cuaCuaTrang("/settings")).toBe("caidat");
    expect(cuaCuaTrang("/settings/x")).toBe("caidat");
    expect(cuaCuaTrang("/settingsx")).toBe("xem");
    expect(cuaCuaTrang("/bao-cao-sang")).toBe("xem");
    expect(canAccessPath("admin", "/settings")).toBe(true);
    expect(canAccessPath("engineer", "/settings")).toBe(false);
    expect(canAccessPath("viewer", "/alerts")).toBe(true);
  });
  it("mảng mã loại cũ đổi đúng sang cửa", () => {
    expect(cuaTuDanhSachCu([])).toBe("xem");
    expect(cuaTuDanhSachCu(["pm", "engineer", "field"])).toBe("ghi");
    expect(cuaTuDanhSachCu(["pm", "engineer"])).toBe("ghi");
    expect(cuaTuDanhSachCu(["pm"])).toBe("caidat");
  });
});

describe("code không tự so mã loại ngoài quyen.ts (luật 7)", () => {
  const GOC = path.resolve(__dirname, "../../src");
  const tepMa: string[] = [];
  const duyet = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) duyet(p);
      else if (/\.(ts|tsx)$/.test(e.name)) tepMa.push(p);
    }
  };
  duyet(GOC);

  it("không còn so tay loại tài khoản / mã \"field\" / requireRole([...]) trong src", () => {
    const vi: string[] = [];
    for (const p of tepMa) {
      if (p.endsWith(path.join("lib", "quyen.ts"))) continue;
      const noi = fs.readFileSync(p, "utf8");
      const tuongDoi = path.relative(GOC, p);
      // Kiểm quyền tài khoản phải qua quyen.ts — cấm so tay loại của phiên/người dùng.
      // (ctx.role của trợ lý là BẬC LỆNH pm|engineer, suy từ duocCaiDat ở route chat — không tính.)
      if (/\b(session|me|user|u|nguoiDung)\??\.role\s*[!=]==\s*"/.test(noi)) vi.push(`${tuongDoi}: so mã loại tay`);
      if (/"field"/.test(noi)) vi.push(`${tuongDoi}: còn mã field`);
      if (/requireRole\(\s*\[/.test(noi)) vi.push(`${tuongDoi}: requireRole mảng kiểu cũ`);
    }
    expect(vi).toEqual([]);
  });
});
