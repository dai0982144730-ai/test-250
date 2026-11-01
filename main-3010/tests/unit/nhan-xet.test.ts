// ============================================================
// TEST BƯỚC SOẠN NHẬN XÉT 🤖 CỦA BÁO CÁO THÁNG
//
// Điều đáng test nhất KHÔNG phải "gọi được LLM" — mà là ba luật chặn LLM bịa:
//   1. Chỉ những ô ĐÃ CÓ NGUỒN mới được đưa vào prompt. Ô thiếu số tuyệt đối
//      không lọt sang, vì LLM thấy chỗ trống là điền cho đầy.
//   2. Ô 🤖 không bao giờ được coi là nguyên liệu cho ô 🤖 khác — nếu không
//      thì máy tự nhận xét về nhận xét của chính nó.
//   3. Câu trả lời của LLM phải bóc được kể cả khi nó gói trong ```json.
// ============================================================

import { describe, expect, it } from "vitest";
import { bocMang, dungPrompt, soCoNguon } from "@/lib/bao-cao-thang/nhan-xet";
import { oCoSo, oThieu, type AnhXaNguon, type Bang, type DongBang } from "@/lib/bao-cao-thang/model";

const ANH_XA: AnhXaNguon = { maAgent: "tiendo", congCu: "tiendo.khoi_luong_hang_muc", thamSo: {} };
const VET = { moTa: "BC ngày 2026-08-24", thoiDiem: "2026-08-24T00:00:00.000Z" };

function cot(khoa: string, nhan: string, laLlm = false) {
  return { khoa, nhan, kieu: "chu" as const, anhXa: ANH_XA, laLlm };
}

function bang(cots: ReturnType<typeof cot>[], dong: DongBang[]): Bang {
  return {
    soHieu: 10,
    ma: "B10",
    ten: "Vấn đề nổi bật & kiến nghị",
    cot: cots,
    dong,
    ghiChuDuoiBang: [],
    luotHoi: [],
  } as unknown as Bang;
}

describe("soCoNguon — chỉ ô CÓ NGUỒN mới thành nguyên liệu cho LLM", () => {
  it("lấy ô có nguồn, bỏ ô thiếu", () => {
    const b = bang(
      [cot("wbs", "Hạng mục"), cot("kl", "TH lũy kế")],
      [
        {
          khoa: "d1",
          o: {
            wbs: oCoSo("7.2.2", ANH_XA, VET),
            kl: oThieu(ANH_XA, "chưa hỏi được"),
          },
        } as DongBang,
      ],
    );
    const ra = soCoNguon(b, b.dong[0]);
    expect(ra).toHaveLength(1);
    expect(ra[0]).toEqual({ nhan: "Hạng mục", giaTri: "7.2.2" });
  });

  it("⭐ Ô 🤖 KHÔNG được làm nguyên liệu cho ô 🤖 khác", () => {
    const b = bang(
      [cot("kl", "TH lũy kế"), cot("danh_gia", "Đánh giá", true)],
      [
        {
          khoa: "d1",
          o: {
            kl: oCoSo(1384.3, ANH_XA, VET),
            // ô 🤖 đã có chữ từ lần soạn trước
            danh_gia: oCoSo("🤖 Khối lượng đạt thấp", ANH_XA, VET),
          },
        } as DongBang,
      ],
    );
    const ra = soCoNguon(b, b.dong[0]);
    // Nếu lọt, máy sẽ nhận xét về chính nhận xét của mình — vòng tự khen
    expect(ra.map((x) => x.nhan)).toEqual(["TH lũy kế"]);
  });

  it("kèm đơn vị vào giá trị để LLM không đoán đơn vị", () => {
    const b = bang(
      [cot("kl", "TH lũy kế")],
      [{ khoa: "d1", o: { kl: oCoSo(1384.3, ANH_XA, VET, "m") } } as DongBang],
    );
    // chuẩn số Việt Nam (Mr. Đại chốt 12/10/2026, chốt 130): số đưa LLM diễn giải viết «1.384,3» để câu LLM chép ra đúng chuẩn — bản cũ «1384.3 m»
    expect(soCoNguon(b, b.dong[0])[0].giaTri).toBe("1.384,3 m");
  });

  it("dòng không có ô nào có nguồn thì trả mảng rỗng — sẽ KHÔNG hỏi LLM", () => {
    const b = bang(
      [cot("kl", "TH lũy kế")],
      [{ khoa: "d1", o: { kl: oThieu(ANH_XA, "chưa hỏi được") } } as DongBang],
    );
    expect(soCoNguon(b, b.dong[0])).toHaveLength(0);
  });
});

describe("dungPrompt — prompt chỉ chứa số thật", () => {
  const b = bang([cot("kl", "TH lũy kế")], []);

  it("có mã dòng để ghép câu trả lời về đúng dòng", () => {
    const p = dungPrompt(b, [{ khoa: "d1", so: [{ nhan: "TH lũy kế", giaTri: "1384.3 m" }] }], [
      { khoa: "kien_nghi", nhan: "Kiến nghị" },
    ]);
    expect(p).toContain("[khoa=d1]");
    expect(p).toContain("1384.3 m");
  });

  it("nói rõ số phần tử phải trả về — chống LLM trả thiếu dòng", () => {
    const p = dungPrompt(
      b,
      [
        { khoa: "d1", so: [{ nhan: "a", giaTri: "1" }] },
        { khoa: "d2", so: [{ nhan: "a", giaTri: "2" }] },
      ],
      [{ khoa: "kien_nghi", nhan: "Kiến nghị" }],
    );
    expect(p).toContain("Đúng 2 phần tử");
  });
});

describe("bocMang — chịu được mọi kiểu LLM gói câu trả lời", () => {
  it("mảng JSON trần", () => {
    expect(bocMang('[{"khoa":"d1","kien_nghi":"Họp khẩn"}]')).toEqual([
      { khoa: "d1", kien_nghi: "Họp khẩn" },
    ]);
  });

  it("gói trong ```json", () => {
    const r = bocMang('```json\n[{"khoa":"d1","kien_nghi":"A"}]\n```');
    expect(r).toHaveLength(1);
  });

  it("có chữ thừa trước và sau vẫn bóc được", () => {
    const r = bocMang('Đây là kết quả:\n[{"khoa":"d1","kien_nghi":"A"}]\nHết.');
    expect(r).toHaveLength(1);
  });

  it("không phải JSON thì trả null — KHÔNG trả mảng rỗng", () => {
    // null và [] khác nhau: null = "không đọc được", [] = "đọc được, không có gì"
    expect(bocMang("Tôi không thể trả lời câu hỏi này.")).toBeNull();
  });

  it("JSON hỏng giữa chừng thì trả null chứ không ném lỗi", () => {
    expect(bocMang('[{"khoa":"d1", "kien_nghi":')).toBeNull();
  });

  it("phần tử không phải object bị loại", () => {
    const r = bocMang('["chuoi", 5, {"khoa":"d1"}]');
    expect(r).toEqual([{ khoa: "d1" }]);
  });
});
