// ============================================================
// TEST LỚP CÁCH LY MCP — src/lib/nguon-tien-do.ts
//
// Đây là file quan trọng nhất của agent lúc này: mọi lời gọi lấy số liệu
// tiến độ đi qua đúng nó. Hỏng ở đây thì hỏng âm thầm — vẫn ra số, chỉ là
// sai hoặc treo.
//
// Bộ test này kiểm 4 luật của HOP-DONG-KET-NOI mục 6 "Chống lan sự cố":
//   Luật 1 — mọi lời gọi có hạn chờ (10s thường · 60s nặng · 3s sức khỏe)
//   Luật 2 — ngắt mạch: 3 lỗi liên tiếp → ngừng gọi 10 phút
//   Luật 3 — không bao giờ ném ngoại lệ ra ngoài biên MCP
//   Cấm    — coi KHONG_CO_DU_LIEU là lỗi
//
// Chạy hoàn toàn OFFLINE: fetch bị thay bằng bản giả, không cần bật agent nào.
//
// Ngắt mạch giữ trạng thái ở cấp module, nên mỗi bài phải nạp lại module
// bằng vi.resetModules() — nếu không thì bài trước làm bẩn bài sau.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type ModunNguonTienDo = typeof import("@/lib/nguon-tien-do");

/**
 * Nạp lại module để bộ đếm ngắt mạch về 0. Bộ nhớ 10 phút (QS-074, 27/09) nằm trên
 * globalThis — nạp lại module không xoá được, nên xoá tay.
 */
async function napLai(): Promise<ModunNguonTienDo> {
  vi.resetModules();
  (await import("@/lib/nguon/bo-nho-hoi")).xoaBoNhoHoi();
  return import("@/lib/nguon-tien-do");
}

/** fetch giả trả về đúng khuôn cổng MCP (luôn HTTP 200 theo hợp đồng) */
function fetchTraVe(than: unknown) {
  return vi.fn(async () => ({
    json: async () => than,
  })) as unknown as typeof fetch;
}

/** fetch giả không bao giờ trả lời — chỉ dừng khi bị AbortController cắt */
function fetchTreoMai() {
  return vi.fn(
    (_url: string, opt: { signal: AbortSignal }) =>
      new Promise((_giai, tuChoi) => {
        opt.signal.addEventListener("abort", () => {
          const e = new Error("aborted");
          e.name = "AbortError";
          tuChoi(e);
        });
      })
  ) as unknown as typeof fetch;
}

/** fetch giả hỏng mạng — giống lúc agent kia tắt hẳn */
function fetchNgaMang() {
  return vi.fn(async () => {
    throw new Error("ECONNREFUSED");
  }) as unknown as typeof fetch;
}

const TRA_LOI_TOT = {
  ok: true,
  du_lieu: { pctTotal: 4.4, cod: "2027-09-21" },
  nguon: [{ loai: "tien-do", ma: "HV", file_goc: "data/projects/hv/schedule.json" }],
  thoi_diem_tra_loi: "2026-09-05T00:00:00+07:00",
  canh_bao: [],
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────
describe("Cửa vào — chặn lời gọi không hợp lệ", () => {
  it("thiếu ly_do_goi thì từ chối NGAY, không đụng tới mạng", async () => {
    const { hoiTienDo } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);

    const ket = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "");

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
    // Cổng cố ý từ chối lời gọi vu vơ — không được phép gọi ra ngoài
    expect(goi).not.toHaveBeenCalled();
  });

  it("ly_do_goi chỉ có khoảng trắng cũng bị từ chối", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchTraVe(TRA_LOI_TOT));

    const ket = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "   ");

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("KHONG_HIEU_YEU_CAU");
  });
});

// ─────────────────────────────────────────────────────────────
describe("Thân yêu cầu — đúng 4 trường hợp đồng bắt buộc", () => {
  it("gửi đủ cong_cu · tham_so · agent_goi · ly_do_goi", async () => {
    const { hoiTienDo, TEN_AGENT_NAY } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);

    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lấy % và COD");

    const than = JSON.parse((goi as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    expect(than.cong_cu).toBe("tiendo.tom_tat_du_an");
    expect(than.tham_so).toEqual({ ma_du_an: "HV" });
    expect(than.agent_goi).toBe(TEN_AGENT_NAY);
    expect(than.ly_do_goi).toBe("lấy % và COD");
  });

  it("có ma_nguoi_dung thì gửi kèm — để sau siết quyền không phải sửa giao thức", async () => {
    const { hoiTienDo } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);

    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do", "thinhhp");

    const than = JSON.parse((goi as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    expect(than.ma_nguoi_dung).toBe("thinhhp");
  });

  it("trả về nguyên khuôn của cổng, kèm mảng nguon", async () => {
    const { tomTatDuAn } = await napLai();
    vi.stubGlobal("fetch", fetchTraVe(TRA_LOI_TOT));

    const ket = await tomTatDuAn("HV", "đối chiếu phiếu giá");

    expect(ket.ok).toBe(true);
    if (ket.ok) {
      expect(ket.nguon).toHaveLength(1);
      expect(ket.du_lieu).toEqual({ pctTotal: 4.4, cod: "2027-09-21" });
    }
  });
});

// ─────────────────────────────────────────────────────────────
describe("KHONG_CO_DU_LIEU là câu trả lời hợp lệ, KHÔNG phải lỗi", () => {
  it("trả nguyên mã lỗi cho bên gọi", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal(
      "fetch",
      fetchTraVe({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "Chưa có BC tuần" })
    );

    const ket = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "XX" }, "thử mã lạ");

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("KHONG_CO_DU_LIEU");
  });

  it("KHÔNG được tính là hỏng — 5 lần liên tiếp vẫn không bật ngắt mạch", async () => {
    const { hoiTienDo, trangThaiNgatMach } = await napLai();
    vi.stubGlobal(
      "fetch",
      fetchTraVe({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "không có" })
    );

    for (let i = 0; i < 5; i++) {
      await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "XX" }, "thử");
    }

    // Đây là chỗ dễ sai nhất: coi "không có dữ liệu" là lỗi thì ngắt mạch
    // sẽ tự bật oan, và agent ngừng hỏi 10 phút dù bên kia vẫn khỏe.
    expect(trangThaiNgatMach().dangNgat).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Luật 1 — hạn chờ", () => {
  it("công cụ thường: bỏ sau 10 giây, trả HET_HAN_CHO", async () => {
    vi.useFakeTimers();
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchTreoMai());

    // 27/09: tom_tat_du_an đã sang nhóm NẶNG (QS-073) — bài này dùng một công cụ thường
    const dangCho = hoiTienDo("tiendo.nang_suat", { ma_du_an: "HV" }, "lý do");
    // 10s cho lần đầu + 10s cho lần thử lại (hợp đồng cho thử lại đúng 1 lần)
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    const ket = await dangCho;

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("HET_HAN_CHO");
  });

  it("công cụ NẶNG (đường găng): chưa bỏ ở mốc 10 giây", async () => {
    vi.useFakeTimers();
    const { duongGang } = await napLai();
    vi.stubGlobal("fetch", fetchTreoMai());

    let xong = false;
    const dangCho = duongGang("HV", "tìm nút găng chưa ai được giao").then((k) => {
      xong = true;
      return k;
    });

    await vi.advanceTimersByTimeAsync(10_000);
    expect(xong).toBe(false); // vẫn còn chờ — đúng, vì hạn của nó là 60s

    await vi.advanceTimersByTimeAsync(50_000); // đủ 60s lần 1
    await vi.advanceTimersByTimeAsync(60_000); // lần thử lại
    const ket = await dangCho;

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("HET_HAN_CHO");
  });

  it("QS-073: tom_tat_du_an · s_curve · so_tuan là công cụ NẶNG — chưa bỏ ở mốc 10 giây", async () => {
    vi.useFakeTimers();
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchTreoMai());

    for (const cc of ["tiendo.tom_tat_du_an", "tiendo.s_curve", "tiendo.so_tuan"] as const) {
      let xong = false;
      const dangCho = hoiTienDo(cc, { ma_du_an: "HV" }, "lý do").then((k) => {
        xong = true;
        return k;
      });
      await vi.advanceTimersByTimeAsync(20_000); // đo 26/09: chậm nhất 16,9 giây — hạn 10 giây từng cắt oan
      expect(xong, cc).toBe(false);
      await vi.advanceTimersByTimeAsync(40_000);
      await vi.advanceTimersByTimeAsync(60_000);
      const ket = await dangCho;
      if (!ket.ok) expect(ket.ma_loi).toBe("HET_HAN_CHO");
    }
  });

  it("sức khỏe: bỏ sớm ở 3 giây", async () => {
    vi.useFakeTimers();
    const { sucKhoeTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchTreoMai());

    const dangCho = sucKhoeTienDo();
    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(3_000);
    const ket = await dangCho;

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("HET_HAN_CHO");
  });

  it("HET_HAN_CHO thì thử lại ĐÚNG 1 lần — không thử vô hạn", async () => {
    vi.useFakeTimers();
    const { hoiTienDo } = await napLai();
    const goi = fetchTreoMai();
    vi.stubGlobal("fetch", goi);

    const dangCho = hoiTienDo("tiendo.nang_suat", { ma_du_an: "HV" }, "lý do");
    await vi.advanceTimersByTimeAsync(10_000);
    await vi.advanceTimersByTimeAsync(10_000);
    await dangCho;

    expect((goi as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Luật 2 — ngắt mạch (bài nghiệm thu số 5)", () => {
  it("3 lỗi liên tiếp thì bật ngắt mạch", async () => {
    const { hoiTienDo, trangThaiNgatMach } = await napLai();
    vi.stubGlobal("fetch", fetchNgaMang());

    expect(trangThaiNgatMach().dangNgat).toBe(false);
    for (let i = 0; i < 3; i++) {
      await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
    }
    expect(trangThaiNgatMach().dangNgat).toBe(true);
    expect(trangThaiNgatMach().moLaiLuc).not.toBeNull();
  });

  it("lần gọi thứ 4 và 5 trả về NGAY, không đụng tới mạng nữa", async () => {
    const { hoiTienDo } = await napLai();
    const goi = fetchNgaMang();
    vi.stubGlobal("fetch", goi);

    for (let i = 0; i < 3; i++) {
      await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
    }
    const soLanDaGoi = (goi as unknown as { mock: { calls: unknown[] } }).mock.calls.length;

    const lan4 = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
    const lan5 = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");

    expect(lan4.ok).toBe(false);
    if (!lan4.ok) expect(lan4.ma_loi).toBe("AGENT_KHONG_SAN_SANG");
    expect(lan5.ok).toBe(false);

    // Đây là điểm mấu chốt của bài 5: KHÔNG gọi thêm lần nào nữa.
    // Không có ngắt mạch thì mỗi lần gọi phải chờ hết hạn, và agent mình
    // treo theo agent đã chết.
    expect((goi as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(soLanDaGoi);
  });

  it("thông điệp nói rõ mấy giờ thử lại — để màn hình hiện được cho người dùng", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchNgaMang());

    for (let i = 0; i < 3; i++) {
      await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
    }
    const ket = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.thong_diep).toMatch(/đang tắt hoặc đang được khởi động lại.*thử lại sau \d/);
  });

  it("một lần thành công là xoá sạch bộ đếm lỗi", async () => {
    const { hoiTienDo, trangThaiNgatMach } = await napLai();

    // 27/09: dùng công cụ KHÔNG nằm trong bộ nhớ 10 phút — nếu không, lượt sau lượt
    // thành công sẽ lấy từ bộ nhớ, không đi ra mạng, bài không còn đo bộ đếm lỗi
    vi.stubGlobal("fetch", fetchNgaMang());
    await hoiTienDo("tiendo.nang_suat", { ma_du_an: "HV" }, "lý do");
    await hoiTienDo("tiendo.nang_suat", { ma_du_an: "HV" }, "lý do");

    vi.stubGlobal("fetch", fetchTraVe(TRA_LOI_TOT)); // bên kia sống lại
    await hoiTienDo("tiendo.nang_suat", { ma_du_an: "HV" }, "lý do");

    vi.stubGlobal("fetch", fetchNgaMang()); // hỏng lại 2 lần nữa
    await hoiTienDo("tiendo.nang_suat", { ma_du_an: "HV" }, "lý do");
    await hoiTienDo("tiendo.nang_suat", { ma_du_an: "HV" }, "lý do");

    // Tổng cộng 4 lần hỏng nhưng KHÔNG liên tiếp → chưa được bật ngắt mạch
    expect(trangThaiNgatMach().dangNgat).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Luật 3 — không bao giờ ném ngoại lệ ra ngoài biên MCP", () => {
  it("mạng ngã thì trả AGENT_KHONG_SAN_SANG, không throw", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchNgaMang());

    const ket = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");

    expect(ket.ok).toBe(false);
    if (!ket.ok) {
      expect(ket.ma_loi).toBe("AGENT_KHONG_SAN_SANG");
      // Thông điệp phải chỉ được cách sửa, không chỉ báo "lỗi"
      // Kiểm lần 8 MC-03 (26/10/2026): không in địa chỉ máy ra màn người dùng — nói lý do «đang tắt / khởi động lại»
      expect(ket.thong_diep).toMatch(/đang tắt hoặc đang được khởi động lại/);
      expect(ket.thong_diep).not.toMatch(/3003|127\.0\.0\.1|Đã bật chưa/);
    }
  });

  it("cổng trả khuôn lạ (thiếu trường ok) thì thành LOI_NOI_BO", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchTraVe({ ket_qua: "cái gì đó không đúng khuôn" }));

    const ket = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("LOI_NOI_BO");
  });

  it("JSON hỏng cũng không làm sập tiến trình", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => {
          throw new Error("Unexpected token < in JSON");
        },
      })) as unknown as typeof fetch
    );

    const ket = await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
    expect(ket.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Hàm bọc sẵn — gửi đúng tên tham số theo hợp đồng", () => {
  it("khoiLuongHangMuc dùng `thau_phu`, KHÔNG dùng `nha_thau`", async () => {
    const { khoiLuongHangMuc } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);

    await khoiLuongHangMuc("HV", { thau_phu: "TS" }, "dựng cột đã thi công");

    const than = JSON.parse((goi as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    // Chốt 07/09: tham số nhận tên ĐƠN VỊ TRỰC TIẾP THI CÔNG (TS · SNP · Điện 8),
    // không phải tên nhà thầu theo hợp đồng. Sai chỗ này là sai cả bảng khối lượng.
    expect(than.tham_so.thau_phu).toBe("TS");
    expect(than.tham_so).not.toHaveProperty("nha_thau");
  });

  it("timDauViec chuyển tiếp cả tu_khoa lẫn ma_wbs", async () => {
    const { timDauViec } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);

    await timDauViec("HV", { ma_wbs: "HV.1.3.5.2" }, "treo việc Base lên đầu việc");

    const than = JSON.parse((goi as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    expect(than.tham_so).toEqual({ ma_du_an: "HV", ma_wbs: "HV.1.3.5.2" });
  });

  it("nguonLucHuyDong bỏ hẳn thau_phu khi không truyền, không gửi undefined", async () => {
    const { nguonLucHuyDong } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);

    await nguonLucHuyDong("HV", "2026-08-24", "2026-09-05", undefined, "so cam kết vs thực tế");

    const than = JSON.parse((goi as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    expect(than.tham_so).not.toHaveProperty("thau_phu");
    expect(than.tham_so.tu_ngay).toBe("2026-08-24");
  });
});
