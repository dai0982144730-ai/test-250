// ============================================================
// TEST BẬT/TẮT AGENT TỪ MAIN
//
// Điều đáng test nhất ở đây KHÔNG phải "spawn được tiến trình" — mà là ba
// chốt CHẶN, vì file này cho máy chủ chạy lệnh hệ điều hành:
//
//   1. Địa chỉ là TÊN MIỀN thì phải từ chối. Main không có quyền khởi động
//      tiến trình trên máy người khác, và cũng không nên có. Đây là chỗ dễ
//      hỏng nhất khi hệ lên `https://base.scigroup.vn`.
//   2. Cổng phải RÚT TỪ ĐỊA CHỈ trong danh bạ, không gắn cứng số nào — cùng
//      luật với "số agent không gắn cứng trong code".
//   3. Thiếu `thuMucCode` hoặc thư mục không có thật thì nói rõ phải làm gì,
//      không im lặng bỏ qua.
// ============================================================

import { describe, expect, it } from "vitest";
import { congTuDiaChi, laMayNay, lyDoKhongBatDuoc } from "@/lib/dieu-khien-agent";
import type { KhaiAgent } from "@/lib/danh-ba-agent";

function khai(p: Partial<KhaiAgent>): KhaiAgent {
  return {
    ma: "thu",
    ten: "Agent thử",
    diaChi: "http://localhost:3011",
    duongDanMcp: "/api/mcp/thu",
    dangBat: true,
    ...p,
  };
}

describe("congTuDiaChi — cổng lấy từ cấu hình, không gắn cứng", () => {
  it("rút đúng cổng của địa chỉ localhost", () => {
    expect(congTuDiaChi("http://localhost:3011")).toBe(3011);
    expect(congTuDiaChi("http://127.0.0.1:3003")).toBe(3003);
  });

  it("địa chỉ không ghi cổng thì suy theo giao thức", () => {
    expect(congTuDiaChi("https://base.scigroup.vn")).toBe(443);
    expect(congTuDiaChi("http://base.scigroup.vn")).toBe(80);
  });

  it("địa chỉ hỏng thì trả null chứ KHÔNG đoán bừa một cổng", () => {
    expect(congTuDiaChi("localhost:3011")).toBeNull();
    expect(congTuDiaChi("")).toBeNull();
    expect(congTuDiaChi("chưa khai")).toBeNull();
  });
});

describe("laMayNay — phân biệt cùng máy với tên miền", () => {
  it("nhận đúng các dạng trỏ về máy này", () => {
    expect(laMayNay("http://localhost:3011")).toBe(true);
    expect(laMayNay("http://127.0.0.1:3012")).toBe(true);
  });

  it("tên miền thì KHÔNG phải máy này", () => {
    expect(laMayNay("https://base.scigroup.vn")).toBe(false);
    expect(laMayNay("https://qlda.scigroup.vn/x")).toBe(false);
  });

  it("địa chỉ hỏng thì coi như không phải máy này — chọn phía an toàn", () => {
    expect(laMayNay("")).toBe(false);
    expect(laMayNay("localhost")).toBe(false);
  });
});

describe("lyDoKhongBatDuoc — luôn nói RÕ phải làm gì", () => {
  it("tên miền: từ chối, và nhắc ô Bật vẫn dùng được với nghĩa kia", () => {
    const ly = lyDoKhongBatDuoc(khai({ diaChi: "https://base.scigroup.vn", thuMucCode: "D:/x" }));
    expect(ly).not.toBeNull();
    expect(ly).toContain("không trỏ về máy này");
    // Không được để người dùng tưởng cả dòng đó vô dụng.
    expect(ly).toContain("kể từ giờ hỏi con này");
  });

  it("thiếu thư mục code: chỉ đúng chỗ phải điền", () => {
    const ly = lyDoKhongBatDuoc(khai({ thuMucCode: undefined }));
    expect(ly).toContain("Thư mục code");
    expect(ly).toContain("Lưu danh bạ");
  });

  it("thư mục khai sai: nêu đích danh đường dẫn sai", () => {
    const sai = "D:/khong-he-ton-tai-cua-test";
    const ly = lyDoKhongBatDuoc(khai({ thuMucCode: sai }));
    expect(ly).toContain(sai);
    expect(ly).toContain("package.json");
  });

  it("con khai đủ và đúng máy thì KHÔNG bị chặn", () => {
    // Dùng chính thư mục đang chạy test — chắc chắn có package.json.
    expect(lyDoKhongBatDuoc(khai({ thuMucCode: process.cwd() }))).toBeNull();
  });

  it("thứ tự kiểm: tên miền bị chặn TRƯỚC khi xét thư mục", () => {
    // Nếu xét thư mục trước, người dùng cấu hình tên miền sẽ nhận lời khuyên
    // sai ("điền thư mục code") thay vì lời khuyên đúng.
    const ly = lyDoKhongBatDuoc(
      khai({ diaChi: "https://base.scigroup.vn", thuMucCode: undefined })
    );
    expect(ly).toContain("không trỏ về máy này");
    expect(ly).not.toContain("Thư mục code");
  });
});
