// ============================================================
// MA TRẬN "AI ĐƯỢC GỌI AI"
//
// Bài đáng giá nhất nằm ở nhóm ①: khai 2 con thì ma trận 2×2, khai 6 con thì
// 6×6 — CÙNG MỘT ĐOẠN CODE, không sửa dòng nào. Đây là luật người dùng nhấn
// mạnh nhất và cũng là chỗ dễ lén gắn cứng nhất.
//
// Ba nhóm còn lại:
//   ② Ô tắt thì `duocGoiKhong` trả false kèm lý do tiếng Việt nói rõ bị chặn
//      ở đâu — ma trận phải có hiệu lực thật, không phải bảng trang trí.
//   ③ Ô chưa có lượt nào thì ghi "chưa có lượt nào", KHÔNG ghi 0.
//   ④ Sổ nhật ký và Danh bạ gọi cùng một con bằng hai tên ("tien-do" vs
//      "tiendo") — không quy về một mối thì mọi ô sẽ mãi mãi trống.
// ============================================================

import { describe, it, expect } from "vitest";
import type { KhaiAgent } from "@/lib/danh-ba-agent";
import { chuanHoaBen } from "@/lib/nhat-ky/model";
import {
  MA_TRAN_RONG,
  NHAN_CHO_CHAN,
  chuanHoaMaAgent,
  datO,
  dungMaTran,
  duocGoiKhong,
  khoaO,
} from "@/lib/ma-tran-goi/model";

/** Sinh danh bạ N con — dùng để chứng minh ma trận co giãn theo Danh bạ */
function danhBa(n: number): KhaiAgent[] {
  return Array.from({ length: n }, (_, i) => ({
    ma: `con${i + 1}`,
    ten: `Agent số ${i + 1}`,
    diaChi: `http://localhost:${3010 + i}`,
    duongDanMcp: `/api/mcp/con${i + 1}`,
    dangBat: true,
  }));
}

// ============ ① SỐ AGENT KHÔNG GẮN CỨNG ============

describe("Kích thước ma trận do Danh bạ agent quyết, không gắn cứng", () => {
  it("khai 2 con thì ma trận 2×2", () => {
    const b = dungMaTran(danhBa(2), MA_TRAN_RONG);
    expect(b.canh).toBe(2);
    expect(b.hang).toHaveLength(2);
    expect(b.hang.every((h) => h.length === 2)).toBe(true);
  });

  it("khai 6 con thì ma trận 6×6 — CÙNG hàm, không sửa dòng code nào", () => {
    const b = dungMaTran(danhBa(6), MA_TRAN_RONG);
    expect(b.canh).toBe(6);
    expect(b.hang).toHaveLength(6);
    expect(b.hang.every((h) => h.length === 6)).toBe(true);
  });

  it("khai 1 con thì 1×1 và ô duy nhất là đường chéo", () => {
    const b = dungMaTran(danhBa(1), MA_TRAN_RONG);
    expect(b.canh).toBe(1);
    expect(b.hang[0][0].duongCheo).toBe(true);
    expect(b.soODangBat).toBe(0);
  });

  it("danh bạ rỗng thì ma trận rỗng, không nổ", () => {
    const b = dungMaTran([], MA_TRAN_RONG);
    expect(b.canh).toBe(0);
    expect(b.hang).toEqual([]);
  });

  it("agent TẮT trong danh bạ thì không có hàng/cột — 5 khai, 3 bật → 3×3", () => {
    const ds = danhBa(5);
    ds[1].dangBat = false;
    ds[4].dangBat = false;
    const b = dungMaTran(ds, MA_TRAN_RONG);
    expect(b.canh).toBe(3);
    expect(b.agent.map((a) => a.ma)).toEqual(["con1", "con3", "con4"]);
  });

  it("mặc định CHO gọi thì mọi ô ngoài đường chéo đều bật — 4 con = 12 ô", () => {
    const b = dungMaTran(danhBa(4), { o: {}, macDinhChoGoi: true });
    expect(b.soODangBat).toBe(4 * 4 - 4);
  });

  it("mặc định CẤM gọi thì không ô nào bật", () => {
    const b = dungMaTran(danhBa(4), { o: {}, macDinhChoGoi: false });
    expect(b.soODangBat).toBe(0);
  });
});

// ============ ② CỬA CHẶN CÓ HIỆU LỰC THẬT ============

describe("duocGoiKhong — ô tắt thì từ chối kèm lý do tiếng Việt", () => {
  const mt = { o: { "con1>con2": false, "con2>con1": true }, macDinhChoGoi: true };

  it("ô bị TẮT thì trả false và nói rõ bị chặn ở màn Ai được gọi ai", () => {
    const kq = duocGoiKhong("con1", "con2", mt);
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain(NHAN_CHO_CHAN);
    expect(kq.lyDo).toContain("con1 → con2");
  });

  it("ô bật thì cho gọi", () => {
    expect(duocGoiKhong("con2", "con1", mt).duoc).toBe(true);
  });

  it("chiều này cấm không kéo theo chiều kia — ma trận KHÔNG đối xứng", () => {
    expect(duocGoiKhong("con1", "con2", mt).duoc).toBe(false);
    expect(duocGoiKhong("con2", "con1", mt).duoc).toBe(true);
  });

  it("ô chưa khai thì theo mặc định, và lý do nói rõ là đang theo mặc định", () => {
    const kq = duocGoiKhong("con3", "con4", { o: {}, macDinhChoGoi: false });
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain("chưa khai");
    expect(kq.lyDo).toContain(NHAN_CHO_CHAN);
  });

  it("tự gọi chính mình bị cấm — đó là vòng A→A", () => {
    const kq = duocGoiKhong("main", "main", { o: {}, macDinhChoGoi: true });
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain("vòng gọi A→A");
  });

  it("agent không có trong Danh bạ thì bị từ chối, nói rõ thiếu ai", () => {
    const kq = duocGoiKhong("con1", "khong-ton-tai", MA_TRAN_RONG, danhBa(2));
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain("Chưa khai agent");
  });

  it("agent bị TẮT trong Danh bạ thì cũng bị từ chối", () => {
    const ds = danhBa(2);
    ds[1].dangBat = false;
    const kq = duocGoiKhong("con1", "con2", MA_TRAN_RONG, ds);
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain("đang TẮT");
  });

  it("thiếu tên bên gọi hoặc bên nhận thì từ chối chứ không cho lọt", () => {
    expect(duocGoiKhong("", "con2", MA_TRAN_RONG).duoc).toBe(false);
    expect(duocGoiKhong("con1", "  ", MA_TRAN_RONG).duoc).toBe(false);
  });

  it("tên viết kiểu sổ nhật ký ('tien-do') vẫn khớp đúng ô đã khai bằng mã danh bạ", () => {
    const kq = duocGoiKhong("tien-do", "main", { o: { "tiendo>main": false }, macDinhChoGoi: true });
    expect(kq.duoc).toBe(false);
    expect(kq.lyDo).toContain(NHAN_CHO_CHAN);
  });
});

// ============ ④ QUY TÊN VỀ MỘT MỐI ============

describe("Chuẩn hoá mã agent — sổ ghi 'tien-do', danh bạ khai 'tiendo'", () => {
  it("bỏ gạch nối và chữ hoa", () => {
    expect(chuanHoaMaAgent("tien-do")).toBe("tiendo");
    expect(chuanHoaMaAgent("Phap_Ly")).toBe("phaply");
    expect(chuanHoaMaAgent("  MAIN  ")).toBe("main");
  });

  it("bí danh 'base-agent' quy về 'base'", () => {
    expect(chuanHoaMaAgent("base-agent")).toBe("base");
    expect(chuanHoaMaAgent("Main Agent")).toBe("main");
  });

  it("khoaO luôn ra cùng một khoá dù gõ kiểu nào", () => {
    expect(khoaO("tien-do", "Main")).toBe(khoaO("tiendo", "main"));
  });

  it("chuanHoaBen: sổ cũ 'base' + công cụ có dấu '/' là API Base.vn, không có '/' là Agent Base", () => {
    expect(chuanHoaBen("base", "base.wework/task/project")).toBe("basevn");
    expect(chuanHoaBen("base", "base.danh_sach_issue")).toBe("base");
    expect(chuanHoaBen("base-agent", "base.danh_sach_issue")).toBe("base");
    expect(chuanHoaBen("tien-do", "tiendo.duong_gang")).toBe("tiendo");
    expect(chuanHoaBen("phap-ly")).toBe("phaply");
    expect(chuanHoaBen("hop-dong")).toBe("hopdong");
    expect(chuanHoaBen("llm")).toBe("llm");
  });

});

// ============ ⑤ TÍCH Ô ============

describe("datO — tích một ô sinh ma trận mới, không sửa bản cũ", () => {
  it("tích ô mới thì bản cũ giữ nguyên", () => {
    const cu = { o: {}, macDinhChoGoi: true };
    const moi = datO(cu, "con1", "con2", false);
    expect(cu.o).toEqual({});
    expect(moi.o["con1>con2"]).toBe(false);
  });

  it("tích lại ô cũ thì ghi đè đúng ô đó, không đụng ô khác", () => {
    const moi = datO({ o: { "a>b": false, "b>a": true }, macDinhChoGoi: true }, "a", "b", true);
    expect(moi.o).toEqual({ "a>b": true, "b>a": true });
  });

  it("tích ô đường chéo thì lặng lẽ bỏ qua — không có ô tự gọi", () => {
    const moi = datO({ o: {}, macDinhChoGoi: true }, "main", "main", true);
    expect(moi.o).toEqual({});
  });

  it("ô đã khai tay thì daKhai=true, ô theo mặc định thì daKhai=false", () => {
    const b = dungMaTran(danhBa(2), { o: { "con1>con2": true }, macDinhChoGoi: true });
    expect(b.hang[0][1].daKhai).toBe(true);
    expect(b.hang[1][0].daKhai).toBe(false);
  });
});
