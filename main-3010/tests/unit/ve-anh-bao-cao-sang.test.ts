// Bộ vẽ ảnh biểu đồ báo cáo sáng + gửi ảnh Telegram (KE-HOACH/23, Mr. Đại chốt 17/10/2026).
// Số mẫu lấy từ tệp 23: TQ-2 (Hướng Việt 24/09–17/10/2026) · RQ-2 (hạng mục tự làm COD chậm) · DA-3 (S-Curve, ngày cắt 11/10/2026).
// KHÔNG gọi Telegram thật (fetch giả), KHÔNG gọi AI.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadImage } from "@napi-rs/canvas";
import { veAnh } from "@/lib/bao-cao-sang/ve-anh";
import { guiAlbumToi, guiAnhToi } from "@/lib/bao-cao-sang/telegram";
import { CO_ANH, type DacTaAnh } from "@/lib/bao-cao-sang/anh-kieu";

const CHU_KY_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Đọc chữ ký + cỡ ở khối IHDR (byte 12–23) */
function docPng(b: Buffer) {
  return {
    chuKy: Array.from(b.subarray(0, 8)),
    khoi: b.subarray(12, 16).toString("ascii"),
    rong: b.readUInt32BE(16),
    cao: b.readUInt32BE(20),
  };
}

async function kiemPng(b: Buffer) {
  expect(Buffer.isBuffer(b)).toBe(true);
  const p = docPng(b);
  expect(p.chuKy).toEqual(CHU_KY_PNG);
  expect(p.khoi).toBe("IHDR");
  expect([p.rong, p.cao]).toEqual([CO_ANH.rong, CO_ANH.cao]);
  const anh = await loadImage(b);
  expect([anh.width, anh.height]).toEqual([720, 480]);
}

const TQ2: DacTaAnh = {
  kieu: "duong-ngay",
  tieuDe: "Xu thế COD dự báo — Điện gió Hướng Việt (24 ngày · 24/09/2026 – 17/10/2026)",
  diem: [
    { ngay: "2026-09-24", giaTri: "2027-10-21" },
    { ngay: "2026-09-27", giaTri: "2027-10-14" },
    { ngay: "2026-10-11", giaTri: "2027-10-27" },
    { ngay: "2026-10-12", giaTri: "2027-10-28" },
    { ngay: "2026-10-17", giaTri: "2027-10-28" },
  ],
  vachNgang: [
    { nhan: "Tiến độ mục tiêu", ngay: "2027-08-03", mau: "muc-tieu" },
    { nhan: "Baseline", ngay: "2027-09-14", mau: "baseline" },
  ],
  chuThich: "Bỏ 1 điểm lạ 10/10/2026 — lượt tính lỗi.",
};

const RQ2: DacTaAnh = {
  kieu: "thanh-ngang",
  tieuDe: "Hạng mục tự làm COD chậm so với Baseline — Điện gió Hướng Việt",
  donVi: "ngày",
  thanh: [
    { nhan: "6.1 Hợp đồng cung cấp turbine", doan: [{ nhan: "Không do thời tiết", giaTri: 41, mau: "du-bao" }] },
    {
      nhan: "7.6 Vận chuyển và Lắp đặt Turbine",
      doan: [
        { nhan: "Không do thời tiết", giaTri: 0, mau: "du-bao" },
        { nhan: "Do thời tiết", giaTri: 20, mau: "phu" },
      ],
    },
    { nhan: "↳ 7.6.2 Lắp đặt cơ khí Turbine (nằm trong 7.6)", doan: [{ nhan: "Do thời tiết", giaTri: 20, mau: "phu" }] },
    { nhan: "6 hạng mục găng khác", doan: [] },
  ],
};

const DA3: DacTaAnh = {
  kieu: "s-curve",
  tieuDe: "S-Curve khối lượng — Điện gió Hướng Việt",
  duong: [
    { nhan: "Tiến độ mục tiêu", mau: "muc-tieu", diem: [{ ngay: "2026-04-06", pct: 0 }, { ngay: "2026-10-11", pct: 16.8 }, { ngay: "2027-08-03", pct: 100 }] },
    { nhan: "Baseline", mau: "baseline", diem: [{ ngay: "2026-04-06", pct: 0 }, { ngay: "2026-10-11", pct: 15.2 }, { ngay: "2027-09-14", pct: 100 }] },
    { nhan: "Thực tế", mau: "thuc-te", diem: [{ ngay: "2026-04-06", pct: 0 }, { ngay: "2026-10-11", pct: 4.5 }] },
    { nhan: "Dự báo", mau: "du-bao", diem: [{ ngay: "2026-10-11", pct: 4.5 }, { ngay: "2027-10-28", pct: 100 }] },
  ],
  ngayCat: "2026-10-11",
  chuThich: "Thực tế tại 11/10/2026 chậm 39 ngày so với Tiến độ mục tiêu (cùng mức khối lượng, đo trên đường S-Curve).",
};

describe("veAnh — ba kiểu ra PNG 720×480", () => {
  it("duong-ngay (TQ-2)", async () => {
    await kiemPng(veAnh(TQ2));
  });
  it("s-curve (DA-3)", async () => {
    await kiemPng(veAnh(DA3));
  });
  it("thanh-ngang (RQ-2) — có thanh 0 ngày", async () => {
    await kiemPng(veAnh(RQ2));
  });
  it("ảnh vẽ có nội dung — khác ảnh «Chưa có số liệu để vẽ» cùng tiêu đề", () => {
    const rong = veAnh({ kieu: "s-curve", tieuDe: DA3.tieuDe, duong: [] });
    expect(veAnh(DA3).equals(rong)).toBe(false);
  });
});

describe("veAnh — đặc tả rỗng / hỏng KHÔNG ném lỗi", () => {
  const hong: [string, unknown][] = [
    ["đối tượng rỗng", {}],
    ["null", null],
    ["undefined", undefined],
    ["kiểu lạ", { kieu: "tron", tieuDe: "Biểu đồ tròn" }],
    ["duong-ngay không điểm", { kieu: "duong-ngay", tieuDe: "x", diem: [], vachNgang: [] }],
    ["duong-ngay ngày hỏng", { kieu: "duong-ngay", tieuDe: "x", diem: [{ ngay: "31/02/2026", giaTri: "abc" }, { ngay: "2026-02-31", giaTri: "2027-01-01" }], vachNgang: null }],
    ["duong-ngay một điểm", { kieu: "duong-ngay", tieuDe: "x", diem: [{ ngay: "2026-10-17", giaTri: "2027-10-28" }], vachNgang: [] }],
    ["s-curve không đường", { kieu: "s-curve", tieuDe: "x", duong: [] }],
    ["s-curve số NaN, % vượt 100", { kieu: "s-curve", tieuDe: "x", duong: [{ nhan: "A", mau: "lạ", diem: [{ ngay: "2026-10-01", pct: NaN }, { ngay: "2026-10-02", pct: 250 }] }] }],
    ["thanh-ngang không thanh", { kieu: "thanh-ngang", tieuDe: "x", donVi: "ngày", thanh: [] }],
    ["thanh-ngang số âm + vô cực", { kieu: "thanh-ngang", tieuDe: "x", donVi: "ngày", thanh: [{ nhan: "A", doan: [{ nhan: "a", giaTri: -5, mau: "phu" }, { nhan: "b", giaTri: Infinity, mau: "phu" }] }] }],
    [
      "thanh-ngang 60 thanh nhãn rất dài",
      {
        kieu: "thanh-ngang",
        tieuDe: "Tiêu đề rất dài ".repeat(20),
        donVi: "ngày",
        thanh: Array.from({ length: 60 }, (_, i) => ({ nhan: `Hạng mục số ${i} `.repeat(8), doan: [{ nhan: `Đoạn ${i}`, giaTri: i, mau: "baseline" }] })),
        chuThich: "Chú thích rất dài ".repeat(40),
      },
    ],
  ];
  for (const [ten, d] of hong) {
    it(ten, async () => {
      let ra: Buffer | null = null;
      expect(() => (ra = veAnh(d as DacTaAnh))).not.toThrow();
      await kiemPng(ra as unknown as Buffer);
    });
  }
});

describe("guiAnhToi — sendPhoto qua fetch giả", () => {
  const giuToken = process.env.TELEGRAM_BOT_TOKEN;
  const PNG = veAnh(TQ2);
  let goi: { url: string; init: RequestInit }[] = [];

  function fetchGia(traLoi: unknown, maHttp = 200) {
    goi = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        goi.push({ url: String(url), init });
        return new Response(JSON.stringify(traLoi), { status: maHttp, headers: { "Content-Type": "application/json" } });
      })
    );
  }

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = "123456:khoa-bai-kiem";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (giuToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = giuToken;
  });

  it("gửi đúng sendPhoto: chat_id, caption (ngày dd/mm/yyyy), tệp photo PNG", async () => {
    fetchGia({ ok: true, result: { message_id: 77 } });
    const kq = await guiAnhToi("-100123", PNG, "COD dự báo Hướng Việt: 2027-10-21 → 2027-10-28, lùi 7 ngày.");
    expect(kq.ok).toBe(true);
    expect(kq.chuaCauHinh).toBe(false);
    expect(kq.messageId).toBe(77);
    expect(kq.thongDiep).toBe("Đã gửi ảnh biểu đồ qua Telegram.");
    expect(goi).toHaveLength(1);
    expect(goi[0].url).toBe("https://api.telegram.org/bot123456:khoa-bai-kiem/sendPhoto");
    expect(goi[0].init.method).toBe("POST");
    const form = goi[0].init.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("chat_id")).toBe("-100123");
    expect(form.get("caption")).toBe("COD dự báo Hướng Việt: 21/10/2027 → 28/10/2027, lùi 7 ngày.");
    const tep = form.get("photo") as Blob;
    expect(tep).toBeInstanceOf(Blob);
    expect(tep.type).toBe("image/png");
    expect(tep.size).toBe(PNG.length);
    expect(Array.from(new Uint8Array(await tep.arrayBuffer()).subarray(0, 8))).toEqual(CHU_KY_PNG);
  });

  it("album: 3 ảnh → MỘT lượt sendMediaGroup, mỗi ảnh một chú thích; 11 ảnh → 2 lượt (10 + 1 ảnh đơn)", async () => {
    fetchGia({ ok: true, result: [{ message_id: 5 }, { message_id: 6 }, { message_id: 7 }] });
    const ba = await guiAlbumToi("-100123", [1, 2, 3].map((i) => ({ png: PNG, chuThich: `Ảnh ${i} ngày 2027-10-21` })));
    expect(ba.loi).toEqual([]);
    expect(ba.messageIds).toEqual([5, 6, 7]);
    expect(goi).toHaveLength(1);
    expect(goi[0].url).toBe("https://api.telegram.org/bot123456:khoa-bai-kiem/sendMediaGroup");
    const form = goi[0].init.body as FormData;
    const media = JSON.parse(String(form.get("media"))) as { type: string; media: string; caption: string }[];
    expect(media.map((m) => m.media)).toEqual(["attach://anh0", "attach://anh1", "attach://anh2"]);
    expect(media[0]!.caption).toBe("Ảnh 1 ngày 21/10/2027");
    expect((form.get("anh2") as Blob).size).toBe(PNG.length);

    fetchGia({ ok: true, result: Array.from({ length: 10 }, (_, i) => ({ message_id: i + 1 })) });
    const muoiMot = await guiAlbumToi("-100123", Array.from({ length: 11 }, () => ({ png: PNG, chuThich: "x" })));
    expect(goi.map((g) => g.url.split("/").pop())).toEqual(["sendMediaGroup", "sendPhoto"]);
    expect(muoiMot.loi).toEqual([]);
  });

  it("album: Telegram từ chối → câu lỗi tiếng Việt, không ném", async () => {
    fetchGia({ ok: false, description: "Bad Request" });
    const kq = await guiAlbumToi("-100123", [PNG, PNG].map((png) => ({ png, chuThich: "x" })));
    expect(kq.messageIds).toEqual([]);
    expect(kq.loi[0]).toContain("Telegram từ chối album ảnh");
  });

  it("chú thích dài quá 1.024 ký tự thì cắt có «…»", async () => {
    fetchGia({ ok: true, result: { message_id: 1 } });
    await guiAnhToi("-100123", PNG, "Hướng Việt 🤖 ".repeat(200));
    const caption = String((goi[0].init.body as FormData).get("caption"));
    expect(caption.length).toBeLessThanOrEqual(1024);
    expect(caption.endsWith("…")).toBe(true);
    expect(caption.startsWith("Hướng Việt 🤖")).toBe(true);
  });

  it("chưa khai token → chuaCauHinh, không gọi mạng", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    fetchGia({ ok: true });
    const kq = await guiAnhToi("-100123", PNG, "x");
    expect(kq.ok).toBe(false);
    expect(kq.chuaCauHinh).toBe(true);
    expect(kq.thongDiep).toMatch(/^Chưa cấu hình Telegram/);
    expect(goi).toHaveLength(0);
  });

  it("chat id trống → chuaCauHinh", async () => {
    fetchGia({ ok: true });
    const kq = await guiAnhToi("  ", PNG, "x");
    expect(kq.chuaCauHinh).toBe(true);
    expect(goi).toHaveLength(0);
  });

  it("Telegram từ chối → câu lỗi tiếng Việt, không ném", async () => {
    fetchGia({ ok: false, description: "Bad Request: chat not found" }, 400);
    const kq = await guiAnhToi("-100123", PNG, "x");
    expect(kq.ok).toBe(false);
    expect(kq.chuaCauHinh).toBe(false);
    expect(kq.messageId).toBeNull();
    expect(kq.thongDiep).toBe("Telegram từ chối ảnh: Bad Request: chat not found.");
  });

  it("mất mạng → câu tiếng Việt, không ném", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      })
    );
    const kq = await guiAnhToi("-100123", PNG, "x");
    expect(kq.ok).toBe(false);
    expect(kq.thongDiep).toBe("Không nối được tới Telegram để gửi ảnh — kiểm tra mạng ra ngoài của máy chủ.");
  });

  it("ảnh rỗng → không gửi, câu tiếng Việt", async () => {
    fetchGia({ ok: true });
    const kq = await guiAnhToi("-100123", Buffer.alloc(0), "x");
    expect(kq.ok).toBe(false);
    expect(kq.chuaCauHinh).toBe(false);
    expect(kq.thongDiep).toBe("Không gửi ảnh rỗng — bộ vẽ chưa dựng được ảnh biểu đồ.");
    expect(goi).toHaveLength(0);
  });
});

describe("thanh-hai-chieu (DA-4, 27/10)", () => {
  it("vẽ ra PNG hợp lệ với thanh dương, âm, 0; hỏng thì thành ảnh «Chưa có số liệu», không ném lỗi", async () => {
    const d: DacTaAnh = {
      kieu: "thanh-hai-chieu",
      tieuDe: "Hướng Việt · 6.1 chậm 56 ngày so với Baseline",
      donVi: "ngày",
      thanh: [{ nhan: "Hướng Việt · 6.1 Cung cấp turbine", giaTri: 56 }, { nhan: "Hướng Việt · 7.6 Vận chuyển", giaTri: 0 }, { nhan: "Nậm săm 3A · 3.2 Đường vào", giaTri: -12 }],
      nhanDuong: "Chậm so với Baseline",
      nhanAm: "Sớm so với Baseline",
    };
    let ra: Buffer | null = null;
    expect(() => (ra = veAnh(d))).not.toThrow();
    await kiemPng(ra as unknown as Buffer);
    for (const hong of [{ ...d, thanh: [] }, { ...d, thanh: [{ nhan: "x", giaTri: Number.NaN }] }, { ...d, thanh: "x" as unknown as never }]) {
      let r2: Buffer | null = null;
      expect(() => (r2 = veAnh(hong as DacTaAnh))).not.toThrow();
      await kiemPng(r2 as unknown as Buffer);
    }
  });
});
