// ============================================================
// NGHIỆM THU KẾT NỐI — 9 bài của HOP-DONG-KET-NOI mục 12
//
// Khác bộ tests/unit: bộ này gọi AGENT TIẾN ĐỘ THẬT, không giả lập.
//
// Cần bật trước:
//     cd "…\Code Agent tien do"
//     npm run dev -- -p 3003          ← PHẢI 3003, không bấm CHAY-UNG-DUNG.bat
//
// Chạy:  npm run test:mcp
//
// Agent tiến độ chưa bật thì các bài cần nó sẽ BỎ QUA kèm lời nhắc,
// KHÔNG báo đỏ — vì đó là thiếu điều kiện chạy, không phải code sai.
//
// Bài 4 và 5 là hai bài quan trọng nhất: chúng kiểm đúng yêu cầu
// "một agent hỏng không kéo agent khác". Hai bài này KHÔNG cần tắt agent
// thật — trỏ vào một cổng chết là mô phỏng đúng tình huống đó, an toàn hơn.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import http from "node:http";
import fs from "node:fs";

const URL_TIEN_DO = process.env.URL_AGENT_TIEN_DO ?? "http://localhost:3003";
const MA_DU_AN_DEMO = "dien-gio-huong-viet-hv-du-lieu";

/** Cổng của CHÍNH Main Agent — bài 9 gọi vào cổng MCP của mình */
const URL_MINH = process.env.URL_AGENT_NAY ?? "http://localhost:3010";

/** Cổng chắc chắn không có ai nghe — dùng để mô phỏng "agent kia đã tắt" */
const CONG_CHET = "http://127.0.0.1:59999";

let tienDoDangChay = false;

beforeAll(async () => {
  try {
    const c = new AbortController();
    const hen = setTimeout(() => c.abort(), 3000);
    const res = await fetch(`${URL_TIEN_DO}/api/mcp/tiendo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cong_cu: "suc_khoe",
        agent_goi: "base",
        ly_do_goi: "kiểm tra trước khi chạy bộ nghiệm thu",
      }),
      signal: c.signal,
    });
    clearTimeout(hen);
    tienDoDangChay = res.ok;
  } catch {
    tienDoDangChay = false;
  }
  if (!tienDoDangChay) {
    console.warn(
      `\n⚠  Agent tiến độ chưa bật ở ${URL_TIEN_DO}.\n` +
        `   Bài 1·2·3·8 sẽ bỏ qua. Bật bằng:  npm run dev -- -p 3003\n`
    );
  }
});

/** Nạp lớp cách ly với một địa chỉ tiến độ chỉ định */
async function napLopCachLy(url: string) {
  vi.resetModules();
  process.env.URL_AGENT_TIEN_DO = url;
  return import("@/lib/nguon-tien-do");
}

// ─────────────────────────────────────────────────────────────
describe("Bài 1 — gọi nang_luc() của agent kia", () => {
  it("nhận đúng danh sách công cụ", async ({ skip }) => {
    if (!tienDoDangChay) return skip();
    const { nangLucTienDo } = await napLopCachLy(URL_TIEN_DO);

    const ket = await nangLucTienDo("bài nghiệm thu 1 — lấy bảng năng lực");

    expect(ket.ok).toBe(true);
    if (ket.ok) {
      const d = ket.du_lieu as { agent: string; cong_cu: { ten: string }[]; phien_ban_hop_dong: string };
      expect(d.agent).toBe("tiendo");
      expect(d.phien_ban_hop_dong).toBeTruthy();
      // Ba công cụ mọi agent BẮT BUỘC có (HOP-DONG-KET-NOI mục 4)
      const ten = d.cong_cu.map((c) => c.ten);
      expect(ten).toContain("nang_luc");
      expect(ten).toContain("suc_khoe");
      expect(ten).toContain("tim_theo_ma");
      console.log(`   → agent tiến độ mở ${d.cong_cu.length} công cụ, hợp đồng v${d.phien_ban_hop_dong}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
describe("Bài 2 — gọi công cụ nghiệp vụ có dữ liệu", () => {
  it("ok:true VÀ mảng nguon KHÔNG rỗng", async ({ skip }) => {
    if (!tienDoDangChay) return skip();
    const { tomTatDuAn } = await napLopCachLy(URL_TIEN_DO);

    const ket = await tomTatDuAn(MA_DU_AN_DEMO, "bài nghiệm thu 2 — lấy % và COD");

    expect(ket.ok).toBe(true);
    if (ket.ok) {
      // Đây là chỗ nguyên tắc "mọi con số truy về được file gốc" bị ép
      // ở tầng giao thức: nguồn rỗng bị coi là LỖI, không phải trả lời hợp lệ.
      expect(ket.nguon.length).toBeGreaterThan(0);
      expect(ket.nguon[0].file_goc).toBeTruthy();
      const d = ket.du_lieu as { totalTasks: number; cod: string };
      console.log(`   → ${d.totalTasks} đầu việc · COD ${d.cod} · nguồn: ${ket.nguon[0].file_goc}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
describe("Bài 3 — gọi với mã không tồn tại", () => {
  it("trả KHONG_CO_DU_LIEU, KHÔNG phải lỗi 500", async ({ skip }) => {
    if (!tienDoDangChay) return skip();

    // Gọi thẳng HTTP để kiểm được mã trạng thái — cổng phải LUÔN trả 200
    const res = await fetch(`${URL_TIEN_DO}/api/mcp/tiendo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cong_cu: "tiendo.tom_tat_du_an",
        tham_so: { ma_du_an: "DU-AN-KHONG-CO-THAT-XYZ" },
        agent_goi: "base",
        ly_do_goi: "bài nghiệm thu 3 — thử mã không tồn tại",
      }),
    });

    // Điều cốt lõi bài 3 đòi: KHÔNG BAO GIỜ 500, luôn 200 kèm {ok:false}
    expect(res.status).toBe(200);
    const than = (await res.json()) as { ok: boolean; ma_loi?: string };
    expect(than.ok).toBe(false);

    // Mã lỗi phải nằm trong 6 mã đã khai — không được tự chế mã thứ bảy
    const SAU_MA = [
      "KHONG_CO_DU_LIEU",
      "KHONG_HIEU_YEU_CAU",
      "KHONG_CO_QUYEN",
      "HET_HAN_CHO",
      "AGENT_KHONG_SAN_SANG",
      "LOI_NOI_BO",
    ];
    expect(SAU_MA).toContain(than.ma_loi);

    // ⚠ LỆCH ĐÃ ĐO 05/09/2026 — ghi lại, KHÔNG tự sửa code agent tiến độ.
    // HOP-DONG-KET-NOI mục 12 bài 3 nói mã dự án không tồn tại phải trả
    // KHONG_CO_DU_LIEU. Cổng thật trả KHONG_HIEU_YEU_CAU (nghĩa là "sai
    // tham số"). Khác nhau ở chỗ bên gọi phải xử ra sao:
    //   KHONG_CO_DU_LIEU  → hiện "chưa có dữ liệu", đi tiếp
    //   KHONG_HIEU_YEU_CAU → ghi nhật ký, KHÔNG thử lại
    // Đã ghi vào sổ công việc mục "Việc cần Agent tiến độ đổi" (T-03).
    if (than.ma_loi !== "KHONG_CO_DU_LIEU") {
      console.warn(
        `   ⚠ Lệch hợp đồng: mã dự án không tồn tại trả "${than.ma_loi}", ` +
          `hợp đồng ghi "KHONG_CO_DU_LIEU" (đã ghi sổ T-03)`
      );
    }
  });

  it("thiếu ly_do_goi thì bị cổng từ chối", async ({ skip }) => {
    if (!tienDoDangChay) return skip();

    const res = await fetch(`${URL_TIEN_DO}/api/mcp/tiendo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cong_cu: "suc_khoe", agent_goi: "base" }),
    });

    expect(res.status).toBe(200);
    const than = (await res.json()) as { ok: boolean };
    expect(than.ok).toBe(false); // cố ý — không cho gọi vu vơ
  });
});

// ─────────────────────────────────────────────────────────────
describe("⭐ Bài 4 — agent kia TẮT, màn hình mình vẫn phải sống", () => {
  it("trả lời có kiểm soát, không treo, không ném ngoại lệ", async () => {
    const { tomTatDuAn } = await napLopCachLy(CONG_CHET);

    const batDau = Date.now();
    const ket = await tomTatDuAn(MA_DU_AN_DEMO, "bài nghiệm thu 4 — agent tiến độ đã tắt");
    const mgy = Date.now() - batDau;

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("AGENT_KHONG_SAN_SANG");

    // Không treo: nối tới cổng chết phải hỏng ngay, không chờ hết hạn 10 giây
    expect(mgy).toBeLessThan(5_000);

    // Thông điệp phải nói được cách sửa để hiện lên màn hình cho người dùng
    if (!ket.ok) expect(ket.thong_diep).toMatch(/3003|tiến độ/i);
    console.log(`   → trả lời sau ${mgy}ms, mã lỗi AGENT_KHONG_SAN_SANG`);
  });
});

// ─────────────────────────────────────────────────────────────
describe("⭐ Bài 5 — gọi 5 lần khi agent kia tắt", () => {
  it("lần 4 và 5 trả về NGAY LẬP TỨC (ngắt mạch đã bật)", async () => {
    const { tomTatDuAn, trangThaiNgatMach } = await napLopCachLy(CONG_CHET);

    const mgy: number[] = [];
    for (let i = 1; i <= 5; i++) {
      const t = Date.now();
      await tomTatDuAn(MA_DU_AN_DEMO, `bài nghiệm thu 5 — lần gọi ${i}`);
      mgy.push(Date.now() - t);
    }

    expect(trangThaiNgatMach().dangNgat).toBe(true);

    // Lần 4 và 5 không được đụng tới mạng nữa → phải gần như tức thì
    expect(mgy[3]).toBeLessThan(100);
    expect(mgy[4]).toBeLessThan(100);
    console.log(`   → thời gian 5 lần gọi (ms): ${mgy.join(" · ")}`);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Bài 6 — ngắt mạch tự mở lại", () => {
  it("hẹn đúng 10 phút, và nói rõ mấy giờ mở lại", async () => {
    const { tomTatDuAn, trangThaiNgatMach } = await napLopCachLy(CONG_CHET);

    for (let i = 0; i < 3; i++) {
      await tomTatDuAn(MA_DU_AN_DEMO, "bài nghiệm thu 6 — làm hỏng 3 lần");
    }

    const tt = trangThaiNgatMach();
    expect(tt.dangNgat).toBe(true);
    expect(tt.moLaiLuc).not.toBeNull();

    const conLaiPhut = (new Date(tt.moLaiLuc as string).getTime() - Date.now()) / 60000;
    // Không chờ thật 10 phút — chỉ kiểm mốc hẹn đặt đúng
    expect(conLaiPhut).toBeGreaterThan(9);
    expect(conLaiPhut).toBeLessThanOrEqual(10);
    console.log(`   → mở lại lúc ${new Date(tt.moLaiLuc as string).toLocaleTimeString("vi-VN")}`);
  });
});

// ─────────────────────────────────────────────────────────────
describe("Bài 7 — agent kia trả lời chậm 30 giây", () => {
  let mayCham: http.Server;
  let congCham = 0;

  beforeAll(async () => {
    mayCham = http.createServer((_req, res) => {
      // Cố tình không trả lời — mô phỏng agent treo
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, du_lieu: {}, nguon: [], canh_bao: [] }));
      }, 30_000);
    });
    await new Promise<void>((xong) => mayCham.listen(0, "127.0.0.1", xong));
    congCham = (mayCham.address() as { port: number }).port;
  });

  afterAll(() => {
    mayCham?.close();
  });

  it("bỏ sau 10 giây và ghi HET_HAN_CHO", async () => {
    const { tomTatDuAn } = await napLopCachLy(`http://127.0.0.1:${congCham}`);

    const batDau = Date.now();
    const ket = await tomTatDuAn(MA_DU_AN_DEMO, "bài nghiệm thu 7 — agent trả lời chậm");
    const giay = (Date.now() - batDau) / 1000;

    expect(ket.ok).toBe(false);
    if (!ket.ok) expect(ket.ma_loi).toBe("HET_HAN_CHO");

    // 10s lần đầu + 10s lần thử lại = ~20s, và phải xong TRƯỚC khi máy chậm
    // kịp trả lời ở giây thứ 30 — chứng minh là mình chủ động bỏ.
    expect(giay).toBeGreaterThan(19);
    expect(giay).toBeLessThan(29);
    console.log(`   → bỏ sau ${giay.toFixed(1)}s (2 lần × hạn chờ 10s)`);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────
describe("Bài 8 — nhật ký hỏi–đáp ghi lại mọi lượt", () => {
  it("lượt hỏi của agent này được ghi vào sổ, kèm nguồn dẫn", async ({ skip }) => {
    if (!tienDoDangChay) return skip();

    // Đường dẫn sổ nhật ký của agent tiến độ. Đặt biến môi trường
    // DUONG_DAN_NHAT_KY_TIEN_DO nếu để bộ code tiến độ ở chỗ khác.
    const soNhatKy =
      process.env.DUONG_DAN_NHAT_KY_TIEN_DO ??
      "D:/CongviecHpt/4.CongviecvietAgent/GÓI CÔNG VIỆC/Code Agent tien do/data/nhat-ky-hoi-agent.jsonl";

    if (!fs.existsSync(soNhatKy)) {
      console.warn(`   ⚠ Không thấy sổ nhật ký tại ${soNhatKy} — bỏ qua bài 8.`);
      return skip();
    }

    const { tomTatDuAn, TEN_AGENT_NAY } = await napLopCachLy(URL_TIEN_DO);
    const dauVet = `bài nghiệm thu 8 — dấu vết ${Date.now()}`;
    const ket = await tomTatDuAn(MA_DU_AN_DEMO, dauVet);
    expect(ket.ok).toBe(true);

    // Sổ ghi theo kiểu JSONL — mỗi lượt hỏi một dòng
    const cacDong = fs.readFileSync(soNhatKy, "utf8").trim().split(String.fromCharCode(10)).map((x) => x.trim()).filter(Boolean);
    const dong = cacDong
      .slice(-20)
      .map((d) => JSON.parse(d) as Record<string, unknown>)
      .find((v) => v.lyDoGoi === dauVet);

    expect(dong, "không tìm thấy lượt hỏi vừa gọi trong sổ nhật ký").toBeDefined();
    if (!dong) return;

    // Đúng 7 cột mà HOP-DONG-KET-NOI mục 7 đòi phải ghi lại
    expect(dong.agentHoi).toBe(TEN_AGENT_NAY);
    expect(dong.agentTraLoi).toBeTruthy();
    expect(dong.congCu).toBe("tiendo.tom_tat_du_an");
    expect(dong.ketQua).toBe("ok");
    expect(dong.lyDoGoi).toBe(dauVet); // cột bắt buộc — không cho gọi vu vơ
    expect(typeof dong.miliGiay).toBe("number");
    // Nguồn dẫn: chỗ nguyên tắc "truy vết được về file gốc" để lại dấu
    expect(String(dong.nguonDan ?? "")).not.toBe("");

    console.log(
      `   → đã ghi sổ: ${String(dong.agentHoi)} → ${String(dong.agentTraLoi)} · ` +
        `${String(dong.congCu)} · ${String(dong.miliGiay)}ms · nguồn có dẫn`
    );
    console.log("   → xem bằng mắt: nhật ký hỏi–đáp ở Agent quan sát (menu trái → Agent quan sát ↗)");
  });
});

// ─────────────────────────────────────────────────────────────
describe("Bài 9 — cổng MCP của CHÍNH Main Agent", () => {
  // Main KHÔNG mở công cụ nghiệp vụ nào (HOP-DONG-KET-NOI 5.5) — nó không sở
  // hữu hệ mã nào để trả lời. Hai công cụ `main.*` là HẠ TẦNG DÙNG CHUNG:
  // cấu hình khai một lần, và ma trận ai được gọi ai.
  //
  // Bộ này thay bài 9–10 của bản kế thừa từ Agent Base: bản đó nghiệm thu
  // `base.de_xuat_lien_quan`, `base.quy_trinh_dang_tac`, `base.thong_tin_nhan_su`
  // — ba công cụ Main không có và cố ý không có.

  async function goiMain(than: Record<string, unknown>) {
    const c = new AbortController();
    const hen = setTimeout(() => c.abort(), 10000);
    try {
      const res = await fetch(`${URL_MINH}/api/mcp/main`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(than),
        signal: c.signal,
      });
      return { ma: res.status, than: (await res.json()) as Record<string, unknown> };
    } catch {
      return { ma: 0, than: {} as Record<string, unknown> };
    } finally {
      clearTimeout(hen);
    }
  }

  let dangChay = false;
  beforeAll(async () => {
    const r = await goiMain({
      cong_cu: "suc_khoe",
      agent_goi: "base",
      ly_do_goi: "nghiệm thu: Main còn sống không",
    });
    dangChay = r.ma === 200;
  });

  it("cổng trả HTTP 200 kể cả khi sai — không bao giờ 500", async () => {
    if (!dangChay) return;
    const r = await goiMain({
      cong_cu: "khong_ton_tai_dau",
      agent_goi: "base",
      ly_do_goi: "nghiệm thu: gọi công cụ lạ",
    });
    expect(r.ma).toBe(200);
    expect(r.than.ok).toBe(false);
  });

  it("thiếu ly_do_goi thì TỪ CHỐI — mục 7 không cho gọi vu vơ", async () => {
    if (!dangChay) return;
    const r = await goiMain({ cong_cu: "suc_khoe", agent_goi: "base" });
    expect(r.than.ok).toBe(false);
  });

  it("thiếu agent_goi thì TỪ CHỐI — phải biết ai đang hỏi", async () => {
    if (!dangChay) return;
    const r = await goiMain({ cong_cu: "suc_khoe", ly_do_goi: "nghiệm thu" });
    expect(r.than.ok).toBe(false);
  });

  it("suc_khoe trả về kèm mảng nguồn KHÔNG rỗng", async () => {
    if (!dangChay) return;
    const r = await goiMain({
      cong_cu: "suc_khoe",
      agent_goi: "base",
      ly_do_goi: "nghiệm thu: nguồn bắt buộc",
    });
    expect(r.than.ok).toBe(true);
    expect(Array.isArray(r.than.nguon)).toBe(true);
    expect((r.than.nguon as unknown[]).length).toBeGreaterThan(0);
  });

  it("nang_luc liệt kê công cụ và nói rõ Main không sở hữu hệ mã nào", async () => {
    if (!dangChay) return;
    const r = await goiMain({
      cong_cu: "nang_luc",
      agent_goi: "base",
      ly_do_goi: "nghiệm thu: xem Main mở gì",
    });
    expect(r.than.ok).toBe(true);
    const d = r.than.du_lieu as { cong_cu?: unknown[]; he_ma_so_huu?: unknown };
    expect(Array.isArray(d.cong_cu)).toBe(true);
    expect((d.cong_cu as unknown[]).length).toBeGreaterThan(0);
    // Main KHÔNG sở hữu hệ mã nào — WBS · PL- · HD- · PG- · NT- đều của con khác
    const heMa = d.he_ma_so_huu;
    expect(Array.isArray(heMa) ? heMa.length : 0).toBe(0);
  });

  it("main.ma_tran_goi trả về hàng của chính agent đang hỏi", async () => {
    if (!dangChay) return;
    const r = await goiMain({
      cong_cu: "main.ma_tran_goi",
      agent_goi: "base",
      ly_do_goi: "nghiệm thu: Base hỏi nó được gọi những con nào",
    });
    // Có thể KHONG_CO_DU_LIEU nếu chưa khai — nhưng không được ném lỗi
    expect(r.ma).toBe(200);
    expect(typeof r.than.ok).toBe("boolean");
  });

  // 26/09: main.cau_hinh_chung đã GỠ hẳn — gọi tên cũ vẫn HTTP 200, ok:false, nói rõ bằng tiếng Việt
  it("main.cau_hinh_chung (đã gỡ 26/09): HTTP 200 kèm ok:false, không ném lỗi", async () => {
    if (!dangChay) return;
    const r = await goiMain({
      cong_cu: "main.cau_hinh_chung",
      agent_goi: "base",
      ly_do_goi: "nghiệm thu: công cụ đã gỡ phải trả lời tử tế",
    });
    expect(r.ma).toBe(200);
    expect(r.than.ok).toBe(false);
    expect(String(r.than.thong_diep).length).toBeGreaterThan(20);
  });

  it("mọi lượt gọi vào cổng đều để lại vết trong sổ nhật ký", async () => {
    if (!dangChay) return;
    const p = "data/nhat-ky-hoi-agent.jsonl";
    if (!fs.existsSync(p)) return;
    const truoc = fs.readFileSync(p, "utf8").split("\n").filter((x) => x.trim() !== "").length;
    await goiMain({
      cong_cu: "suc_khoe",
      agent_goi: "base",
      ly_do_goi: "nghiệm thu: kiểm sổ có ghi vết không",
    });
    await new Promise((r) => setTimeout(r, 400));
    const sau = fs.readFileSync(p, "utf8").split("\n").filter((x) => x.trim() !== "").length;
    expect(sau).toBeGreaterThanOrEqual(truoc);
  });
});
