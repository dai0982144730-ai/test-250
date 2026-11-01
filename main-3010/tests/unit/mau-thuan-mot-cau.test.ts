// ⭐ 18/10/2026 (T1 — Mr. Đại gật «ok theo ý bạn»): khối «Chỗ hai agent nói khác nhau» — mỗi chỗ khác nhau là MỘT câu tiếng người
// do CODE ghép (không LLM), mã luôn kèm tên lấy từ dữ liệu thật (luật 30); thiếu tên thì câu nói rõ. Giả fetch — không gọi cổng thật.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cauMauThuan, gomMauThuanCheo, viecKemTen, xoaNhoMauThuan } from "@/lib/bang-dieu-hanh/mau-thuan-cheo";

describe("cauMauThuan — một câu do code ghép", () => {
  it("hồ sơ thiếu MỘT: đúng khuôn câu anh duyệt, mã kèm tên việc + tên hồ sơ", () => {
    const cau = cauMauThuan({
      loai: "ho-so",
      wbs: "1.1.4",
      tenWbs: "Khảo sát địa hình khu tuabin",
      chiTiet: { soViecXong: 1, soViecDangMo: 0, hoSoThieu: [{ ma: "HV-K-19", ten: "Văn bản chấp thuận chủ trương đầu tư" }], conThieu: 1, soHoSo: 1 },
    });
    expect(cau).toBe(
      "Việc 1.1.4 Khảo sát địa hình khu tuabin đã xong bên agent Công việc, nhưng hồ sơ HV-K-19 Văn bản chấp thuận chủ trương đầu tư bên agent Pháp lý vẫn chưa có.",
    );
  });

  it("hồ sơ thiếu NHIỀU, còn việc đang làm, quá 4 hồ sơ thì ghi «và N hồ sơ khác»", () => {
    const ds = ["A", "B", "C", "D", "E", "F"].map((x) => ({ ma: `HV-${x}`, ten: `Hồ sơ ${x}` }));
    const cau = cauMauThuan({
      loai: "ho-so",
      wbs: "2.2.4",
      tenWbs: "Đường vào trạm",
      chiTiet: { soViecXong: 2, soViecDangMo: 1, hoSoThieu: ds, conThieu: 6, soHoSo: 7 },
    })!;
    expect(cau).toMatch(/^Việc 2\.2\.4 Đường vào trạm có 2 việc đã xong bên agent Công việc \(còn 1 việc đang làm\), nhưng 6\/7 hồ sơ bên agent Pháp lý vẫn chưa có: /);
    expect(cau).toMatch(/HV-A Hồ sơ A; HV-B Hồ sơ B; HV-C Hồ sơ C; HV-D Hồ sơ D và 2 hồ sơ khác\.$/);
  });

  it("thiếu tên: nói rõ chỗ thiếu, không bịa", () => {
    const cau = cauMauThuan({
      loai: "ho-so",
      wbs: "1.1.9",
      tenWbs: "",
      chiTiet: { soViecXong: 1, hoSoThieu: [{ ma: "HV-06-02", ten: null }], conThieu: 1, soHoSo: 3 },
    })!;
    expect(cau).toBe(
      "Việc 1.1.9 (agent Tiến độ chưa có tên cho mã này) đã xong bên agent Công việc, nhưng hồ sơ HV-06-02 (agent Pháp lý không trả tên hồ sơ) bên agent Pháp lý vẫn chưa có (mã này cần 3 hồ sơ, thiếu 1).",
    );
    expect(viecKemTen("1.1.9", "  ")).toBe("Việc 1.1.9 (agent Tiến độ chưa có tên cho mã này)");
  });

  it("nghiệm thu: Tiến độ 100% ↔ Nghiệm thu chưa nghiệm thu xong (20/10/2026); dòng nhớ từ bản cũ (không chiTiet) → null", () => {
    expect(
      cauMauThuan({ loai: "nghiem-thu", wbs: "2.3.1", tenWbs: "Đổ bê tông móng T1", chiTiet: { trangThaiHopDong: "đã có hợp đồng, chưa nghiệm thu", soBienBan: 0 } }),
    ).toBe("Việc 2.3.1 Đổ bê tông móng T1 đã 100% bên agent Tiến độ, nhưng bên agent Nghiệm thu chưa nghiệm thu xong (đã có hợp đồng, chưa nghiệm thu, 0 biên bản).");
    expect(cauMauThuan({ loai: "ho-so", wbs: "1", tenWbs: "" })).toBeNull();
  });
});

describe("gomMauThuanCheo — mã chỉ có ở agent Công việc vẫn được tra tên việc rồi mới ghép câu", () => {
  const tra = (du_lieu: unknown) => ({ ok: true, du_lieu, nguon: [{ loai: "thu", ma: "x", file_goc: "tệp thử" }], thoi_diem_tra_loi: "", canh_bao: [] });
  const traLoiTheo = (congCu: string, ts: Record<string, unknown>) => {
    switch (congCu) {
      case "tiendo.duong_gang":
        return tra({ chuoi_gang: [] }); // không mã găng → ứng viên chỉ đến từ agent Công việc (tenWbs rỗng, như đo 18/10 HV)
      case "base.co_viec_cho_ma_khong": {
        const ds = (ts.ds_ma as string[]) ?? [];
        const mot = (ma: string) =>
          ma === "1.1.4"
            ? { ma, tim_thay_ma: true, so_viec_da_xong: 1, so_viec_dang_mo: 0, ma_wbs_co_trong_du_lieu: ["1.1.4", "2.3.1"] }
            : ma === "2.3.1"
              ? { ma, tim_thay_ma: true, so_viec_da_xong: 0, so_viec_dang_mo: 1, ma_wbs_co_trong_du_lieu: ["1.1.4", "2.3.1"] }
              : { ma, tim_thay_ma: false, ma_wbs_co_trong_du_lieu: ["1.1.4", "2.3.1"] };
        return tra({ ket_qua: ds.map(mot), so_ma: ds.length });
      }
      case "phaply.ho_so_cua_wbs":
        return ts.ma_wbs === "1.1.4"
          ? tra({ so_ho_so: 1, da_co: 0, con_thieu: 1, ho_so: [{ ma_ho_so: "HV-K-19", ten: "Văn bản chấp thuận chủ trương đầu tư", da_co: false }] })
          : tra({ so_ho_so: 1, da_co: 1, con_thieu: 0, ho_so: [] });
      case "tiendo.tim_dau_viec":
        return tra({
          tasks: [
            { wbs: "1.1.4", name: "Khảo sát địa hình khu tuabin", pct: 40, critical: false },
            { wbs: "2.3.1", name: "Đổ bê tông móng T1", pct: 100, critical: false },
          ],
          tong_so: 2,
          total: 2,
          vi_tri: 0,
          so_tra_ve: 2,
          con_nua: false,
        });
      case "nghiemthu.da_nghiem_thu_chua":
        return tra({ trang_thai: "co_hop_dong_chua_nghiem_thu", da_nghiem_thu: false, so_bien_ban: 0 });
      default:
        return { ok: false, ma_loi: "KHONG_HIEU_YEU_CAU", thong_diep: `không có ${congCu}` };
    }
  };

  const KHOA_CU = process.env.AUTH_SECRET;
  beforeAll(() => {
    process.env.AUTH_SECRET = KHOA_CU || "khoa-bai-kiem-mau-thuan";
    process.env.URL_AGENT_TIEN_DO = "http://127.0.0.1:59971";
    process.env.URL_AGENT_TIENDO = "http://127.0.0.1:59971";
    process.env.URL_AGENT_BASE = "http://127.0.0.1:59972";
    process.env.URL_AGENT_PHAPLY = "http://127.0.0.1:59973";
    process.env.URL_AGENT_HOPDONG = "http://127.0.0.1:59974";
  });
  afterEach(() => vi.unstubAllGlobals());

  it("ra đúng hai câu, có tên việc từ danh sách đầu việc Tiến độ, không còn chữ «base.» ở chỗ đến tay người dùng", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const than = JSON.parse(String(init?.body ?? "{}")) as { cong_cu: string; tham_so: Record<string, unknown> };
        return new Response(JSON.stringify(traLoiTheo(than.cong_cu, than.tham_so ?? {})), { headers: { "content-type": "application/json" } });
      }),
    );
    xoaNhoMauThuan();
    const ket = await gomMauThuanCheo("MT-THU-18-10", true);
    expect(ket.chuaHoiDuoc).toEqual([]);
    const cau = ket.dong.map((d) => d.cau);
    expect(cau).toContain(
      "Việc 1.1.4 Khảo sát địa hình khu tuabin đã xong bên agent Công việc, nhưng hồ sơ HV-K-19 Văn bản chấp thuận chủ trương đầu tư bên agent Pháp lý vẫn chưa có.",
    );
    expect(cau).toContain(
      "Việc 2.3.1 Đổ bê tông móng T1 đã 100% bên agent Tiến độ, nhưng bên agent Nghiệm thu chưa nghiệm thu xong (đã có hợp đồng, chưa nghiệm thu, 0 biên bản).",
    );
    expect(ket.dong.find((d) => d.wbs === "1.1.4")?.tenWbs).toBe("Khảo sát địa hình khu tuabin");
    // Hai câu của hai bên (đưa 🤖 Giải thích đọc) giữ nguyên nghĩa — nhận định đã viết không bị đánh dấu «đã đổi»
    expect(ket.dong.find((d) => d.wbs === "1.1.4")?.benA.noiDung).toBe("1 việc mang mã 1.1.4 đã XONG bên agent Công việc");
    expect(JSON.stringify({ c: cau, h: ket.chuaHoiDuoc, t: ket.chuaTraDuoc })).not.toMatch(/base\./i);
  });
});
