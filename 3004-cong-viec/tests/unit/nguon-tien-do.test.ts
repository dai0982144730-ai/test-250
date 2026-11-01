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
// Agent Công việc 03/10/2026: chép từ Agent Base (tests/unit/nguon-tien-do.test.ts).
// Thêm: sổ nhật ký ghi vào thư mục TẠM (DOCFLOW_AI_DATA) — không đụng data/ thật;
// kiểm mã đi hỏi "base", địa chỉ mặc định 127.0.0.1:3003, và dòng sổ khuôn bản 2.
//
// Ngắt mạch giữ trạng thái ở cấp module, nên mỗi bài phải nạp lại module
// bằng vi.resetModules() — nếu không thì bài trước làm bẩn bài sau.
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Sổ hỏi–đáp ghi vào thư mục tạm riêng của tệp này (duong-dan.ts đọc biến lúc gọi)
const THU_MUC_TAM = fs.mkdtempSync(path.join(os.tmpdir(), "cv-nguon-tien-do-"));
process.env.DOCFLOW_AI_DATA = THU_MUC_TAM;
delete process.env.URL_AGENT_TIEN_DO;
const TEP_SO = path.join(THU_MUC_TAM, "nhat-ky-hoi-agent.jsonl");

function docSo(): Record<string, unknown>[] {
  if (!fs.existsSync(TEP_SO)) return [];
  return fs
    .readFileSync(TEP_SO, "utf8")
    .split(/\r?\n/)
    .filter((x) => x.trim() !== "")
    .map((x) => JSON.parse(x) as Record<string, unknown>);
}

type ModunNguonTienDo = typeof import("@/lib/nguon-tien-do");

/** Nạp lại module để bộ đếm ngắt mạch về 0 */
async function napLai(): Promise<ModunNguonTienDo> {
  vi.resetModules();
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
  delete process.env.URL_AGENT_TIEN_DO;
  if (fs.existsSync(TEP_SO)) fs.unlinkSync(TEP_SO);
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

    const dangCho = hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
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

    const dangCho = hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
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
    if (!ket.ok) expect(ket.thong_diep).toMatch(/Thử lại sau/);
  });

  it("một lần thành công là xoá sạch bộ đếm lỗi", async () => {
    const { hoiTienDo, trangThaiNgatMach } = await napLai();

    vi.stubGlobal("fetch", fetchNgaMang());
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");

    vi.stubGlobal("fetch", fetchTraVe(TRA_LOI_TOT)); // bên kia sống lại
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");

    vi.stubGlobal("fetch", fetchNgaMang()); // hỏng lại 2 lần nữa
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do");

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
      expect(ket.thong_diep).toMatch(/3003/);
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

// ─────────────────────────────────────────────────────────────
describe("Agent Công việc — mã đi hỏi và địa chỉ", () => {
  it("đi hỏi bằng mã \"base\" (agent Tiến độ chỉ nhận mã có trong ma trận)", async () => {
    const { hoiTienDo, TEN_AGENT_NAY } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do thử");
    const than = JSON.parse((goi as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    expect(TEN_AGENT_NAY).toBe("base");
    expect(than.agent_goi).toBe("base");
  });

  it("mặc định gọi http://127.0.0.1:3003/api/mcp/tiendo (cố ý 127.0.0.1, không localhost)", async () => {
    const { hoiTienDo } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do thử");
    expect((goi as unknown as { mock: { calls: [string][] } }).mock.calls[0][0]).toBe("http://127.0.0.1:3003/api/mcp/tiendo");
  });

  it("biến URL_AGENT_TIEN_DO đổi được địa chỉ (bỏ \"/\" cuối)", async () => {
    process.env.URL_AGENT_TIEN_DO = "http://may-khac:3100/";
    const { hoiTienDo } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "lý do thử");
    expect((goi as unknown as { mock: { calls: [string][] } }).mock.calls[0][0]).toBe("http://may-khac:3100/api/mcp/tiendo");
  });

  it("layHetDauViec và duongGang gọi được chỉ với mã dự án (lý do có câu mặc định)", async () => {
    const { duongGang } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);
    await duongGang("HV");
    const than = JSON.parse((goi as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls[0][1].body);
    expect(than.cong_cu).toBe("tiendo.duong_gang");
    expect(String(than.ly_do_goi).length).toBeGreaterThan(10);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Luật 29 — mọi lượt hỏi đều để lại vết trong sổ (thư mục tạm)", () => {
  it("lượt ok: một dòng khuôn sổ bản 2, đúng bên hỏi/bên trả lời/lý do, có nguồn dẫn + mã lượt", async () => {
    const { hoiTienDo } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "Thử ghi sổ");
    const so = docSo();
    expect(so).toHaveLength(1);
    const d = so[0]!;
    expect(d).toMatchObject({
      phienBanSo: 2,
      vai: "goi",
      agentHoi: "base",
      agentTraLoi: "tiendo",
      congCu: "tiendo.tom_tat_du_an",
      lyDoGoi: "Thử ghi sổ",
      ketQua: "ok",
      loaiLuot: "nghiep-vu",
      nguonDan: "data/projects/hv/schedule.json",
    });
    expect(typeof d.maLuot).toBe("string");
    expect(typeof d.bam).toBe("string");
    expect(String(d.traLoiGon)).toMatch(/pctTotal=4.4/);
    // Mã lượt đi sang bên nhận qua header — bên kia ghi CÙNG mã
    const tuyChon = (goi as unknown as { mock: { calls: [string, { headers: Record<string, string> }][] } }).mock.calls[0][1];
    expect(tuyChon.headers["x-sci-ma-luot"]).toBe(d.maLuot);
  });

  it("KHONG_CO_DU_LIEU ghi là khong-co-du-lieu (không phải ok, không phải loi)", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchTraVe({ ok: false, ma_loi: "KHONG_CO_DU_LIEU", thong_diep: "Chưa có BC tuần" }));
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "XX" }, "Thử ghi sổ");
    const d = docSo()[0]!;
    expect(d.ketQua).toBe("khong-co-du-lieu");
    expect(d.maLoi).toBe("KHONG_CO_DU_LIEU");
  });

  it("thiếu lý do: không gọi mạng, sổ cũng không ghi dòng vu vơ", async () => {
    const { hoiTienDo } = await napLai();
    const goi = fetchTraVe(TRA_LOI_TOT);
    vi.stubGlobal("fetch", goi);
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "");
    expect(goi).not.toHaveBeenCalled();
    expect(docSo()).toHaveLength(0);
  });

  it("ngắt mạch mở thật → thêm một dòng ngat_mach (hạ tầng); lượt bị chặn vẫn ghi vết lỗi", async () => {
    const { hoiTienDo } = await napLai();
    vi.stubGlobal("fetch", fetchNgaMang());
    for (let i = 0; i < 3; i++) await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "Thử ngắt mạch");
    await hoiTienDo("tiendo.tom_tat_du_an", { ma_du_an: "HV" }, "Thử ngắt mạch");
    const so = docSo();
    const mach = so.filter((d) => d.congCu === "ngat_mach");
    expect(mach).toHaveLength(1);
    expect(mach[0]).toMatchObject({ agentHoi: "base", agentTraLoi: "tiendo", loaiLuot: "ha-tang", ketQua: "loi" });
    const luot = so.filter((d) => d.congCu === "tiendo.tom_tat_du_an");
    expect(luot).toHaveLength(4);
    expect(luot.every((d) => d.ketQua === "loi" && d.maLoi === "AGENT_KHONG_SAN_SANG")).toBe(true);
  });
});
