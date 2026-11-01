// Gọn kết quả công cụ theo cấu trúc (lỗi đo 26/09: trần cụt 6.000 ký tự làm mất
// bản ghi 6.1.4 — trễ 24 ngày, dự báo 2027-06-04 — trong tiendo.duong_gang của HV).
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { gonKetQuaCongCu, tranMoiCongCu, TRAN_MOT_CONG_CU, SAN_MOT_CONG_CU } from "@/lib/ai/chat-gon-ket-qua";

const duongGangHv = JSON.parse(
  readFileSync(path.join(__dirname, "mau", "duong-gang-hv-2026-09-26.json"), "utf8")
) as Record<string, unknown>;
const boc = (du_lieu: unknown) => ({ agent: "Agent tiến độ", cong_cu: "tiendo.duong_gang", du_lieu, nguon: "", canh_bao: [] });
const goiY = (k: string | null) => (k === "wbs" ? "chi_tiet_dau_viec(ma_wbs=<mã>)" : "duong_gang() kèm tham số lọc hẹp hơn");

describe("gọn kết quả công cụ — không mất số", () => {
  it("số đo lại lỗi 26/09: trần cụt 6.000 cắt giữa bản ghi 6.1.4", () => {
    const s = JSON.stringify(boc(duongGangHv));
    const i = s.indexOf('"6.1.4"');
    expect(s.length).toBeGreaterThan(12000);
    expect(i).toBeLessThan(6000); // mã có trong phần giữ…
    expect(s.indexOf("2027-06-04", i)).toBeGreaterThan(6000); // …ngày dự báo thì không
  });

  it("dữ liệu thật HV ở trần 6.000 cũ: vẫn giữ 6.1.4 kèm dự báo 2027-06-04, trễ 24", () => {
    const g = gonKetQuaCongCu(boc(duongGangHv), 6000, goiY);
    expect(g.chuoi.length).toBeLessThanOrEqual(6000);
    const ban = JSON.parse(g.chuoi) as { du_lieu: { viec_gang_dang_tre: Array<Record<string, unknown>> } };
    const v = ban.du_lieu.viec_gang_dang_tre.find((x) => typeof x === "object" && x.wbs === "6.1.4");
    expect(v).toBeDefined();
    expect(v!.du_bao_xong).toBe("2027-06-04");
    expect(v!.so_ngay_tre).toBe(24);
    expect(g.canhBao).toContain("ĐÃ GỌN");
  });

  it("nhỏ hơn trần → nguyên văn, không có dòng cảnh báo", () => {
    const g = gonKetQuaCongCu({ a: 1, b: "x" }, 1000, goiY);
    expect(g.chuoi).toBe('{"a":1,"b":"x"}');
    expect(g.canhBao).toBeNull();
    expect(g.conThieu).toBe(0);
  });

  it("danh sách quá dài, mục QUAN TRỌNG nằm cuối → vẫn giữ, có dòng 'còn N mục chưa đưa vào'", () => {
    const viec = Array.from({ length: 200 }, (_, i) => ({
      wbs: `7.${i}`,
      ten: `Việc thường số ${i} `.repeat(3),
      so_ngay_tre: 1,
      du_bao_xong: "2027-01-01",
    }));
    viec.push({ wbs: "6.1.4", ten: "Cung cấp Hub, Nacelle", so_ngay_tre: 24, du_bao_xong: "2027-06-04" });
    const g = gonKetQuaCongCu({ viec_gang_dang_tre: viec }, 3000, goiY);
    expect(g.chuoi.length).toBeLessThanOrEqual(3000);
    expect(g.chuoi).toContain('"wbs":"6.1.4"');
    expect(g.chuoi).toContain("2027-06-04");
    // Trễ nhiều nhất lên đầu
    expect(g.chuoi.indexOf("6.1.4")).toBeLessThan(g.chuoi.indexOf('"7.0"') < 0 ? Infinity : g.chuoi.indexOf('"7.0"'));
    expect(g.conThieu).toBeGreaterThan(0);
    expect(g.chuoi).toMatch(/còn \d+ mục của viec_gang_dang_tre chưa đưa vào \(wbs: /);
    expect(g.chuoi).toContain("hỏi riêng bằng chi_tiet_dau_viec(ma_wbs=<mã>)");
    expect(g.canhBao).toMatch(/còn \d+ mục/);
    // Số mục giữ + số mục báo thiếu = đủ 201
    const ban = JSON.parse(g.chuoi) as { viec_gang_dang_tre: unknown[] };
    const giu = ban.viec_gang_dang_tre.filter((x) => typeof x === "object").length;
    expect(giu + g.conThieu).toBe(201);
  });

  it("việc găng (cờ) được giữ trước việc không găng cùng mức trễ", () => {
    const ds = Array.from({ length: 100 }, (_, i) => ({ ma: `M${i}`, gang: i === 99, tre_ngay: 5, ghi_chu: "x".repeat(50) }));
    const g = gonKetQuaCongCu({ ds }, 1200, goiY);
    expect(g.chuoi).toContain('"M99"');
  });

  it("một khối chữ không tách được → cắt cụt nhưng GHI RÕ còn bao nhiêu ký tự", () => {
    const g = gonKetQuaCongCu({ van_ban: "a".repeat(20000) }, 5000, goiY);
    // nấc ② đã cắt chữ ngoài danh sách còn 400 → vừa trần, có cảnh báo
    expect(g.chuoi.length).toBeLessThanOrEqual(5000);
    expect(g.canhBao).toContain("ĐÃ GỌN");
    const g2 = gonKetQuaCongCu({ so: Array.from({ length: 1 }, () => ({ x: Array(3000).fill(7) })) }, 2000, goiY);
    expect(g2.chuoi.length).toBeLessThanOrEqual(2100);
    expect(g2.chuoi + (g2.canhBao ?? "")).toMatch(/chưa đưa vào/);
  });

  it("không đụng dữ liệu gốc", () => {
    const goc = { ds: Array.from({ length: 300 }, (_, i) => ({ wbs: `${i}`, ly_do: "y".repeat(200) })) };
    const truoc = JSON.stringify(goc);
    gonKetQuaCongCu(goc, 2000, goiY);
    expect(JSON.stringify(goc)).toBe(truoc);
  });

  it("trần chia đều theo số công cụ, có sàn và trần", () => {
    expect(tranMoiCongCu(1)).toBe(TRAN_MOT_CONG_CU);
    expect(tranMoiCongCu(4)).toBe(12000);
    expect(tranMoiCongCu(8)).toBe(6000);
    expect(tranMoiCongCu(50)).toBe(SAN_MOT_CONG_CU);
  });
});
