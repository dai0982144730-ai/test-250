// ============================================================
// TEST: BA CỬA NHẬT KÝ CHO AGENT QUAN SÁT (src/lib/nhat-ky/cua-quan-sat.ts, 26/09/2026)
//
// Canh bốn thứ: khuôn trả về khớp bộ bóc của `0-agent-quan-sat` · mã agent đã
// quy chuẩn (A04, gồm `quansat`) · giới hạn/tổng/còn lại · luật chỉ đọc của `quansat`.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  ganDaySo,
  hoiThoaiSo,
  lamSach,
  quanSatDuocGoi,
  tongHopSo,
  xetLuatQuanSat,
  type DongSoQs,
} from "@/lib/nhat-ky/cua-quan-sat";
import { chuanHoaAgentHoi, chuanHoaMaAgent } from "@/lib/chung/ma-agent";

function dong(p: Partial<DongSoQs> & { thoiDiem: string }): DongSoQs {
  return {
    agentHoi: "main",
    agentTraLoi: "tiendo",
    congCu: "tiendo.tom_tat_du_an",
    ketQua: "ok",
    miliGiay: 100,
    nguonDan: "data/wbs.json",
    lyDoGoi: "Báo cáo sáng",
    ...p,
  };
}

// Sổ mẫu — MỚI NHẤT TRƯỚC, như docNhatKy trả
const SO: DongSoQs[] = [
  dong({ thoiDiem: "2026-09-26T10:00:05.000Z", agentHoi: "quansat", agentTraLoi: "main", congCu: "main.nhat_ky_gan_day", lyDoGoi: "con quan sát", traLoiGon: "tong_luot=3 · 10 ký tự" }),
  dong({ thoiDiem: "2026-09-26T10:00:04.000Z", ketQua: "loi", miliGiay: 900, loi: "hết hạn chờ", traLoiGon: "khong-co · HET_HAN_CHO · quá 10s" }),
  dong({ thoiDiem: "2026-09-26T10:00:03.000Z", miliGiay: 300, thamSo: { ma_du_an: "HV", api_key: "abc", ghi: "sk-ant-abcdefghijklmnop12345" }, traLoiGon: "so_viec=4 · 120 ký tự" }),
  dong({ thoiDiem: "2026-09-26T10:00:02.000Z", agentTraLoi: "phaply", congCu: "phaply.ho_so_cua_wbs", nguonDan: "" }),
  dong({ thoiDiem: "2026-09-25T10:00:01.000Z" }),
];

describe("mã agent chuẩn A04 có quansat", () => {
  it("quy bí danh về mã chuẩn", () => {
    expect(chuanHoaMaAgent("tien-do")).toBe("tiendo");
    expect(chuanHoaMaAgent("Agent-Quan-Sat")).toBe("quansat");
    expect(chuanHoaAgentHoi("quan-sat")).toBe("quansat");
    expect(chuanHoaAgentHoi("kiem-thu")).toBe("kiem-thu");
  });
});

describe("<ma>.nhat_ky_tong_hop", () => {
  it("khuôn theo_ben / theo_cap / theo_cong_cu đúng tên trường bộ bóc", () => {
    const kq = tongHopSo(SO, {}, "Main");
    expect(kq.ok).toBe(true);
    if (!kq.ok) return;
    const d = kq.du_lieu as Record<string, any>;
    expect(d.tong_luot).toBe(5);
    expect(d.tong).toBe(5);
    const tiendo = d.theo_ben.find((b: any) => b.ben === "tiendo");
    expect(tiendo).toMatchObject({ so_luot: 3, so_loi: 1, ty_le_loi: 33.3, giua_ms: 300, cham_nhat_ms: 900, tong_token: null });
    const cap = d.theo_cap.find((c: any) => c.hoi === "main" && c.tra_loi === "tiendo");
    expect(cap).toMatchObject({ so_luot: 3, so_loi: 1, cong_cu_hay: "tiendo.tom_tat_du_an" });
    const pl = d.theo_ben.find((b: any) => b.ben === "phaply");
    expect(pl.so_ok_khong_nguon).toBe(1);
    expect(d.theo_cong_cu[0]).toHaveProperty("cong_cu");
  });

  it("tu_luc cắt khoảng thời gian", () => {
    const kq = tongHopSo(SO, { tu_luc: "2026-09-26T00:00:00Z" }, "Main");
    if (!kq.ok) throw new Error("phải ok");
    expect((kq.du_lieu as any).tong_luot).toBe(4);
    expect((kq.du_lieu as any).tong_luot_ca_so).toBe(5);
  });

  it("gioi_han cắt bảng và nói còn lại", () => {
    const kq = tongHopSo(SO, { gioi_han: 1 }, "Main");
    if (!kq.ok) throw new Error("phải ok");
    const d = kq.du_lieu as any;
    expect(d.theo_ben).toHaveLength(1);
    expect(d.ben_con_lai).toBe(2);
    expect(d.con_lai).toBeGreaterThan(0);
  });

  it("sổ rỗng → KHONG_CO_DU_LIEU", () => {
    expect(tongHopSo([], {}, "Main")).toMatchObject({ ok: false, ma_loi: "KHONG_CO_DU_LIEU" });
  });
});

describe("<ma>.nhat_ky_gan_day", () => {
  it("giới hạn + tổng + còn lại + mốc lùi trang", () => {
    const kq = ganDaySo(SO, { gioi_han: 2 }, "Main");
    if (!kq.ok) throw new Error("phải ok");
    const d = kq.du_lieu as any;
    expect(d.dong).toHaveLength(2);
    expect(d.tong).toBe(5);
    expect(d.con_lai).toBe(3);
    expect(d.con_trang_sau).toBe(true);
    expect(d.moc_tiep).toBe("2026-09-26T10:00:04.000Z");
    expect(d.dong[0]).toMatchObject({ agent_hoi: "quansat", loai_luot: "ha-tang", bam_tra_loi: null });
    expect(d.dong[0]).not.toHaveProperty("tham_so");
    const tiep = ganDaySo(SO, { gioi_han: 2, truoc_moc: d.moc_tiep }, "Main");
    if (!tiep.ok) throw new Error("phải ok");
    expect((tiep.du_lieu as any).dong[0].thoi_diem).toBe("2026-09-26T10:00:03.000Z");
  });

  it("trần 100 dòng", () => {
    const nhieu = Array.from({ length: 150 }, (_, i) => dong({ thoiDiem: new Date(Date.UTC(2026, 8, 26, 0, 0, 150 - i)).toISOString() }));
    const kq = ganDaySo(nhieu, { gioi_han: 500 }, "Main");
    if (!kq.ok) throw new Error("phải ok");
    expect((kq.du_lieu as any).dong).toHaveLength(100);
    expect((kq.du_lieu as any).con_lai).toBe(50);
  });

  it("chi_loi không có lỗi → ok, 0 dòng (đã đo), không phải lỗi", () => {
    const kq = ganDaySo(SO.filter((x) => x.ketQua !== "loi"), { chi_loi: true }, "Main");
    expect(kq.ok).toBe(true);
    if (kq.ok) expect((kq.du_lieu as any).dong).toHaveLength(0);
  });

  it("sau_moc chỉ lấy phần mới, báo da_dung_sau_moc", () => {
    const kq = ganDaySo(SO, { sau_moc: "2026-09-26T10:00:03.000Z", gioi_han: 1 }, "Main");
    if (!kq.ok) throw new Error("phải ok");
    const d = kq.du_lieu as any;
    expect(d.da_dung_sau_moc).toBe("2026-09-26T10:00:03.000Z");
    expect(d.dong[0].thoi_diem).toBe("2026-09-26T10:00:04.000Z");
    expect(d.con_dong_moi_hon).toBe(true);
  });
});

describe("<ma>.hoi_thoai_gan_day", () => {
  it("mặc định bỏ lượt hạ tầng, có câu trả lời gọn, tham số đã lọc khoá", () => {
    const kq = hoiThoaiSo(SO, { gioi_han: 10 }, "Main");
    if (!kq.ok) throw new Error("phải ok");
    const d = kq.du_lieu as any;
    expect(d.dong.some((x: any) => x.agent_hoi === "quansat")).toBe(false);
    const loi = d.dong.find((x: any) => x.ket_qua === "loi");
    expect(loi.tra_loi).toMatchObject({ ok: false, ma_loi: "HET_HAN_CHO" });
    const coTs = d.dong.find((x: any) => x.tham_so.ma_du_an === "HV");
    expect(coTs.tham_so.api_key).toBe("«đã ẩn»");
    expect(coTs.tham_so.ghi).toBe("«đã ẩn»");
    expect(coTs.tra_loi).toMatchObject({ ok: true, du_lieu: "so_viec=4 · 120 ký tự", so_nguon: 1 });
    const khongGon = d.dong.find((x: any) => x.agent_tra_loi === "phaply");
    expect(khongGon.tra_loi).toBeNull();
    expect(khongGon.ghi_chu_tra_loi).toMatch(/không bịa/);
  });

  it("loai=tat-ca giữ cả hạ tầng", () => {
    const kq = hoiThoaiSo(SO, { loai: "tat-ca" }, "Main");
    if (!kq.ok) throw new Error("phải ok");
    expect((kq.du_lieu as any).tong).toBe(5);
  });

  it("lamSach ẩn chuỗi kết nối có mật khẩu", () => {
    expect(lamSach("postgresql://u:matkhau@host/db")).toBe("postgresql://u:«đã ẩn»@host/db");
  });
});

describe("luật chỉ đọc của quansat", () => {
  it("được 3 cửa nhật ký + suc_khoe + nang_luc", () => {
    for (const c of ["tiendo.nhat_ky_tong_hop", "base.nhat_ky_gan_day", "main.hoi_thoai_gan_day", "suc_khoe", "nang_luc"]) {
      expect(quanSatDuocGoi(c)).toBe(true);
    }
  });
  it("từ chối công cụ ghi / nghiệp vụ", () => {
    const kq = xetLuatQuanSat("quansat", "tiendo.ghi_bao_cao", "Agent Tiến độ");
    expect(kq.duoc).toBe(false);
    expect(xetLuatQuanSat("quansat", "tim_theo_ma", "Main").duoc).toBe(false);
    expect(xetLuatQuanSat("quansat", "nhat_ky_gan_day", "Main").duoc).toBe(false); // thiếu tiền tố <ma>.
  });
  it("Main thêm được công cụ đọc hạ tầng riêng", () => {
    expect(xetLuatQuanSat("quansat", "main.danh_ba", "Main", false, ["main.danh_ba"]).duoc).toBe(true);
  });
  it("hội thoại chỉ quansat đọc (khoá nội bộ vẫn qua)", () => {
    expect(xetLuatQuanSat("base", "main.hoi_thoai_gan_day", "Main").duoc).toBe(false);
    expect(xetLuatQuanSat("kiem-thu", "main.hoi_thoai_gan_day", "Main", true).duoc).toBe(true);
    expect(xetLuatQuanSat("base", "main.nhat_ky_gan_day", "Main").duoc).toBe(true);
  });
});
