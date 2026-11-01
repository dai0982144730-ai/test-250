// CHUẨN SỐ VIỆT NAM (Mr. Đại chốt 12/10/2026 — KE-HOACH/10 chốt 130) — khung xem tệp: ô SỐ của Excel phải hiện theo chuẩn
// Việt Nam («49.105.229.400»), không phải chữ kiểu Anh thư viện viết ra («49,105,229,400»). Cùng bài với agent Hợp đồng.
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { chuSoAnhSangVN, oSoRaChuVN } from "@/lib/chung/o-so-excel";
import { docSoNguoiGo } from "@/lib/chung/doc-so";
import { taoBanXem } from "@/lib/thu-muc/xem-truoc";
import { bangSangChu } from "@/lib/tro-ly/dinh-kem";

function toThu(): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  ws.A1 = { t: "n", v: 49105229400, z: "#,##0" };
  ws.B1 = { t: "n", v: 1234.5, z: "#,##0.00" };
  ws.C1 = { t: "n", v: 0.055, z: "0.0%" };
  ws.D1 = { t: "n", v: 1200, z: "#,##0" };
  ws.E1 = { t: "s", v: "1,5" }; // ô CHỮ người gõ — không đụng
  ws.F1 = { t: "n", v: 46000, z: "dd/mm/yyyy" }; // ngày — không đụng
  ws.G1 = { t: "n", v: 69.812 }; // không định dạng
  ws["!ref"] = "A1:G1";
  return ws;
}

describe("Ô số Excel ra chữ chuẩn Việt Nam (chốt 130)", () => {
  it("đổi chéo dấu của chữ số kiểu Anh", () => {
    expect(chuSoAnhSangVN("49,105,229,400")).toBe("49.105.229.400");
    expect(chuSoAnhSangVN("1,234.50")).toBe("1.234,50");
    expect(chuSoAnhSangVN("5.5%")).toBe("5,5%");
    expect(chuSoAnhSangVN("2026")).toBe("2026");
  });

  it("thư viện tự nó viết ô số kiểu Anh — đây là thứ phải chữa", () => {
    const hang = XLSX.utils.sheet_to_json<string[]>(toThu(), { header: 1, raw: false, defval: "" })[0]!;
    expect(String(hang[0]).trim()).toBe("49,105,229,400");
    expect(docSoNguoiGo(String(hang[3]).trim())).toBe(1.2); // «1,200» máy sinh mà đọc theo chuẩn Việt Nam thì thành 1,2 — sai 1.000 lần
  });

  it("sau khi chữa tại nguồn: chữ đọc ra theo chuẩn Việt Nam và đọc lại ĐÚNG số gốc", () => {
    const ws = toThu();
    oSoRaChuVN(ws);
    const hang = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" })[0]!.map((o) => String(o).trim());
    expect(hang[0]).toBe("49.105.229.400");
    expect(hang[1]).toBe("1.234,50");
    expect(hang[2]).toBe("5,5%");
    expect(hang[3]).toBe("1.200");
    expect(hang[4]).toBe("1,5");
    expect(hang[5]).not.toMatch(/,/); // ngày giữ nguyên chữ của thư viện
    expect(hang[6]).toBe("69,812");
    expect(docSoNguoiGo(hang[0])).toBe(49105229400);
    expect(docSoNguoiGo(hang[1])).toBe(1234.5);
    expect(docSoNguoiGo(hang[3])).toBe(1200);
    expect(docSoNguoiGo(hang[6])).toBe(69.812);
  });

  it("ô số mà chữ hiện ra KHÔNG phải một con số (ngày, giờ) thì giữ nguyên; số âm trong ngoặc vẫn đổi", () => {
    const ws: XLSX.WorkSheet = {
      A1: { t: "n", v: 46307, w: "12.10.2026" }, // ngày viết bằng dấu chấm — đổi dấu là hỏng ngày
      B1: { t: "n", v: 0.604, w: "14:30" },
      C1: { t: "n", v: -25.01, w: "(25.01)" },
      D1: { t: "n", v: 1234.5, w: " 1,234.50 " },
      E1: { t: "n", v: 46307, w: "12.10" }, // ngày.tháng — trông như số nhưng KHÔNG phải giá trị của ô
      F1: { t: "n", v: 1234.5678, w: "1,234.57" }, // số làm tròn theo định dạng ô — vẫn là chính số đó
      G1: { t: "n", v: 0.1045, w: "10.45%" },
      "!ref": "A1:G1",
    };
    oSoRaChuVN(ws);
    expect(ws.E1.w).toBe("12.10");
    expect(ws.F1.w).toBe("1.234,57");
    expect(ws.G1.w).toBe("10,45%");
    expect(ws.A1.w).toBe("12.10.2026");
    expect(ws.B1.w).toBe("14:30");
    expect(ws.C1.w).toBe("(25,01)");
    expect(ws.D1.w).toBe(" 1.234,50 ");
  });

  it("tờ rỗng không vỡ", () => {
    expect(() => oSoRaChuVN(undefined)).not.toThrow();
    expect(() => oSoRaChuVN({})).not.toThrow();
  });
});

// Agent Công việc: hai chỗ đọc ô Excel ra chữ đã định dạng — bản xem trước tệp (thu-muc/xem-truoc) và tệp kẹp vào chat (tro-ly/dinh-kem)
describe("Xem trước tệp + tệp kẹp vào chat (chốt 130)", () => {
  const tepThu = (): Buffer => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, toThu(), "Tờ 1");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  };

  it("bản xem trước tệp Excel hiện ô số theo chuẩn Việt Nam", async () => {
    const kq = await taoBanXem("thu.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", tepThu(), "0".repeat(64));
    expect(kq.loai).toBe("html");
    expect(kq.html).toContain("49.105.229.400");
    expect(kq.html).toContain("1.234,50");
    expect(kq.html).toContain("5,5%");
    expect(kq.html).not.toContain("49,105,229,400");
  });

  it("chữ bóc từ tệp Excel kẹp vào chat mang số chuẩn Việt Nam", () => {
    const chu = bangSangChu(tepThu());
    expect(chu).toContain("49.105.229.400");
    expect(chu).toContain("1.234,50");
    expect(chu).not.toContain("49,105,229,400");
  });
});
