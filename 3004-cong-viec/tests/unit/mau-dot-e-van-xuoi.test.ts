// Khai báo mẫu Đợt E — chương "sinh việc — văn xuôi" (thiết kế DE-XUAT-KHAI-BAO-MAU mục 5, Mr. Đại chốt 02/10/2026):
// GIỮ AI quét toàn bộ chữ tự do như cũ; chương mẫu khai văn xuôi thì AI đọc TRƯỚC, phải liệt kê ĐỦ việc trong đó, và việc nhặt
// ở đó mang dấu van_xuoi (bước 4 ghi "AI nhặt ở chương văn xuôi"). Người gửi vẫn duyệt / bỏ từng việc.
import { describe, it, expect } from "vitest";
import { chuTuDoChoAi, raSoatViecBangAi } from "@/lib/so-cai/ai-ra-viec";
import { kiemCauTruc, sinhTruongCu } from "@/lib/kiem-tra/cau-truc";
import type { CauTrucMau } from "@/lib/types";

const MUC = [
  { tieu_de: "I. TÌNH HÌNH CHUNG", van_ban: "Tuần qua sản lượng đạt 94% kế hoạch. Phòng sẽ rà soát lại số liệu đo đếm trước 10/10." },
  { tieu_de: "IV. KIẾN NGHỊ VÀ VIỆC CẦN LÀM", van_ban: "- Lập hồ sơ gia hạn HĐ O&M trước 15/10/2026.\n- Tổ chức họp dân xã Hướng Linh.", van_xuoi: true },
];

describe("Đợt E: chương văn xuôi", () => {
  it("chương văn xuôi đứng TRƯỚC trong chữ gửi AI và mang nhãn", () => {
    const s = chuTuDoChoAi(MUC);
    expect(s.indexOf("IV. KIẾN NGHỊ")).toBeLessThan(s.indexOf("I. TÌNH HÌNH"));
    expect(s).toContain("### IV. KIẾN NGHỊ VÀ VIỆC CẦN LÀM [CHƯƠNG SINH VIỆC — VĂN XUÔI]");
  });

  it("vẫn quét chữ tự do các chương khác (giữ như cũ); việc ở chương văn xuôi có dấu van_xuoi", async () => {
    let loiDan = "";
    const ai = async (prompt: string, system: string) => {
      loiDan = system + prompt;
      return JSON.stringify({
        viec: [],
        viec_them: [
          { ten: "Lập hồ sơ gia hạn HĐ O&M", nguoi_lam: null, han: "15/10/2026", trich: "Lập hồ sơ gia hạn HĐ O&M trước 15/10/2026.", muc: "IV. KIẾN NGHỊ VÀ VIỆC CẦN LÀM [CHƯƠNG SINH VIỆC — VĂN XUÔI]", trung: [] },
          { ten: "Tổ chức họp dân xã Hướng Linh", nguoi_lam: null, han: null, trich: "Tổ chức họp dân xã Hướng Linh.", muc: "IV", trung: [] },
          { ten: "Rà soát số liệu đo đếm", nguoi_lam: null, han: "10/10/2026", trich: "Phòng sẽ rà soát lại số liệu đo đếm trước 10/10.", muc: "I. TÌNH HÌNH CHUNG", trung: [] },
        ],
      });
    };
    const kq = await raSoatViecBangAi([], [], ai, { muc: MUC, ngay_lap: "2026-10-02", nam: 2026 });
    expect(loiDan).toContain("liệt kê ĐỦ mọi việc cần làm");
    expect(kq.viec_them.map((v) => [v.ten, !!v.van_xuoi])).toEqual([
      ["Lập hồ sơ gia hạn HĐ O&M", true],
      ["Tổ chức họp dân xã Hướng Linh", true], // tên mục AI ghi tắt — nhận theo câu trích nằm trong chương
      ["Rà soát số liệu đo đếm", false],
    ]);
    expect(kq.viec_them[0].muc).toBe("IV. KIẾN NGHỊ VÀ VIỆC CẦN LÀM"); // bỏ nhãn khi hiện cho người
    expect(kq.viec_them[0].han).toBe("2026-10-15");
  });

  it("mẫu khai một chương văn xuôi (không có bảng) là cấu trúc hợp lệ, không sinh bảng việc", () => {
    const ct: CauTrucMau = {
      chuong: [
        { tieu_de: "IV. KIẾN NGHỊ VÀ VIỆC CẦN LÀM", nghia: "sinh_viec_van_xuoi", bat_buoc: true, bang: [] },
      ],
    };
    expect(kiemCauTruc(ct)).toEqual([]);
    expect(sinhTruongCu(ct)).toEqual({ bang_cong_viec: [], muc_bat_buoc: ["IV. KIẾN NGHỊ VÀ VIỆC CẦN LÀM"] });
  });
});
