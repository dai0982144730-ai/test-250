// NHẬT KÝ AGENT HỎI NHAU — HOP-DONG-KET-NOI mục 7 · 8 · PLAN-TONG-THE 8.6
//
// Ba thứ đáng kiểm nhất:
//   ① KHOÁ API KHÔNG ĐƯỢC LỌT VÀO SỔ. Sổ này Mr. Đại mở xem hằng ngày; để
//      token lọt vào là phá nguyên tắc "khoá API tuyệt đối không đưa ra ngoài".
//   ② Thiếu LÝ DO GỌI thì không được ghi — "không cho gọi vu vơ" (mục 7).
//   ③ Sổ hỏng KHÔNG được làm hỏng việc chính; ngược lại, lỗi việc chính vẫn
//      phải ném tiếp ra ngoài sau khi đã ghi vết.

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { duongDanDuLieu } from "@/lib/goc-du-lieu";
import { dongHopLe, gomTheoNgay, locThamSo, type DongNhatKy } from "@/lib/nhat-ky/model";
import { docNhatKy, ghiNhatKy, goiCoGhi } from "@/lib/nhat-ky/so";

function d(p: Partial<DongNhatKy> = {}): DongNhatKy {
  return {
    thoiDiem: "2026-09-02T21:04:00.000Z",
    agentHoi: "tien-do",
    agentTraLoi: "llm",
    congCu: "thietke.phan_loai_ban_ve",
    thamSo: { soViec: 18 },
    ketQua: "ok",
    miliGiay: 340,
    lyDoGoi: "Hệ 3: phân loại đầu việc sắp khởi công",
    duong: "tay",
    ...p,
  };
}

// ============ ① LỌC KHOÁ ============

describe("Lọc tham số — khoá API tuyệt đối không lọt vào sổ", () => {
  it("ẩn mọi trường có chữ token / key / secret / password", () => {
    const r = locThamSo({
      access_token_v2: "abc123",
      apiKey: "sk-xxx",
      client_secret: "s3cr3t",
      password: "Sci@2026",
      mat_khau: "x",
      authorization: "Bearer y",
      cookie: "z",
      id: "HV",
    });
    for (const k of [
      "access_token_v2",
      "apiKey",
      "client_secret",
      "password",
      "mat_khau",
      "authorization",
      "cookie",
    ]) {
      expect(r[k], `${k} phải bị ẩn`).toBe("«đã ẩn»");
    }
    expect(r.id).toBe("HV"); // trường thường thì giữ nguyên
  });

  it("không lộ khoá qua đường ghi thật", () => {
    const sach = locThamSo({ baseTokenWework: "TOKEN-THAT-CUA-BASE" });
    expect(JSON.stringify(sach)).not.toContain("TOKEN-THAT-CUA-BASE");
  });

  it("chuỗi dài bị cắt, mảng và object không đổ nguyên vào sổ", () => {
    const r = locThamSo({
      prompt: "x".repeat(500),
      danhSach: [1, 2, 3],
      long: { a: 1 },
    });
    expect(String(r.prompt).length).toBeLessThan(220);
    expect(r.danhSach).toBe("3 phần tử");
    expect(r.long).toBe("{…}");
  });
});

// ============ ② LÝ DO GỌI BẮT BUỘC ============

describe("Lý do gọi bắt buộc — không cho gọi vu vơ", () => {
  it("có lý do đầy đủ thì hợp lệ", () => {
    expect(dongHopLe(d())).toBe(true);
  });
  it("thiếu lý do → không hợp lệ", () => {
    expect(dongHopLe(d({ lyDoGoi: "" }))).toBe(false);
  });
  it("lý do quá cụt (dưới 3 ký tự) cũng không nhận", () => {
    expect(dongHopLe(d({ lyDoGoi: "ok" }))).toBe(false);
  });
  it("thiếu tên công cụ → không hợp lệ", () => {
    expect(dongHopLe(d({ congCu: "" }))).toBe(false);
  });
});

// ============ GOM THEO NGÀY ============

describe("Gom theo ngày", () => {
  it("đếm đúng số lượt và số lỗi trong ngày", () => {
    const n = gomTheoNgay([
      d({ thoiDiem: "2026-09-02T21:04:00Z" }),
      d({ thoiDiem: "2026-09-02T21:05:00Z", ketQua: "loi" }),
      d({ thoiDiem: "2026-09-01T10:00:00Z" }),
    ]);
    expect(n).toHaveLength(2);
    expect(n[0]!.ngay).toBe("2026-09-02"); // mới nhất trước
    expect(n[0]!.soLuot).toBe(2);
    expect(n[0]!.soLoi).toBe(1);
  });

  it("KHÔNG ước token: dòng nào không đo được thì đếm riêng, không cộng bừa", () => {
    const n = gomTheoNgay([d({ soToken: 1204 }), d(), d()]);
    expect(n[0]!.tongToken).toBe(1204);
    expect(n[0]!.soDongKhongCoToken).toBe(2);
  });

  it("cả ngày không đo được token nào thì tổng là null, không phải 0", () => {
    // 0 token là một khẳng định SAI; null nghĩa là "không đo được".
    const n = gomTheoNgay([d(), d()]);
    expect(n[0]!.tongToken).toBeNull();
  });
});

// ============ ③ GHI / ĐỌC THẬT ============

// ⭐ 23/09 — bài đếm dòng từng đỏ thất thường (9457 → 9468): bản sao `data/`
// của cả lượt test là DÙNG CHUNG, các file test khác chạy song song cũng gọi
// goiCoGhi ghi vào đúng sổ này giữa hai lần đếm. Nay khối này chạy trên BẢN
// CHÉP TẠM của riêng nó: chép sổ sang thư mục tạm, trỏ THU_MUC_DU_LIEU vào đó
// (gocDuLieu() đọc biến mỗi lần gọi), xong thì trả biến và xoá thư mục.
const THU_MUC_RIENG = fs.mkdtempSync(path.join(os.tmpdir(), "sci-nhat-ky-rieng-"));
const FILE = path.join(THU_MUC_RIENG, "nhat-ky-hoi-agent.jsonl");

const bienCu = process.env.THU_MUC_DU_LIEU;
beforeAll(() => {
  const goc = duongDanDuLieu("nhat-ky-hoi-agent.jsonl");
  if (fs.existsSync(goc)) fs.copyFileSync(goc, FILE);
  process.env.THU_MUC_DU_LIEU = THU_MUC_RIENG;
});
afterAll(() => {
  if (bienCu === undefined) delete process.env.THU_MUC_DU_LIEU;
  else process.env.THU_MUC_DU_LIEU = bienCu;
  fs.rmSync(THU_MUC_RIENG, { recursive: true, force: true });
});

describe("Ghi và đọc sổ (bản chép tạm riêng)", () => {

  it("ghi rồi đọc lại vẫn còn, mới nhất trước", () => {
    const truoc = docNhatKy().length;
    expect(ghiNhatKy(d({ congCu: "bai.kiem_mot", thoiDiem: "2026-09-02T22:00:00Z" }))).toBe(true);
    expect(ghiNhatKy(d({ congCu: "bai.kiem_hai", thoiDiem: "2026-09-02T22:01:00Z" }))).toBe(true);
    const ds = docNhatKy();
    expect(ds.length).toBe(truoc + 2);
    expect(ds[0]!.congCu).toBe("bai.kiem_hai");
  });

  it("dòng thiếu lý do bị TỪ CHỐI ghi", () => {
    const truoc = docNhatKy().length;
    expect(ghiNhatKy(d({ lyDoGoi: "" }))).toBe(false);
    expect(docNhatKy().length).toBe(truoc);
  });

  it("khoá gửi vào cũng không nằm trong file trên đĩa", () => {
    ghiNhatKy(
      d({ congCu: "bai.kiem_khoa", thamSo: { access_token_v2: "KHOA-KHONG-DUOC-LO" } })
    );
    expect(fs.readFileSync(FILE, "utf8")).not.toContain("KHOA-KHONG-DUOC-LO");
  });

  it("lọc theo bên được hỏi và theo lỗi", () => {
    ghiNhatKy(d({ congCu: "bai.kiem_base", agentTraLoi: "base", ketQua: "loi", loi: "hỏng" }));
    expect(docNhatKy({ agentTraLoi: "base" }).every((x) => x.agentTraLoi === "base")).toBe(true);
    expect(docNhatKy({ chiLoi: true }).every((x) => x.ketQua === "loi")).toBe(true);
  });

  it("dòng hỏng trong file chỉ bỏ qua ĐÚNG dòng đó, không mất cả sổ", () => {
    fs.appendFileSync(FILE, "{ đây không phải JSON\n", "utf8");
    expect(docNhatKy().length).toBeGreaterThan(0);
  });
});

// ============ BỌC LỜI GỌI ============

describe("goiCoGhi — bọc một lời gọi ra ngoài (cùng bản chép tạm riêng)", () => {

  const nc = {
    agentTraLoi: "llm" as const,
    congCu: "bai.goi_co_ghi",
    thamSo: { x: 1 },
    lyDoGoi: "Bài kiểm bọc lời gọi",
    duong: "tay" as const,
  };

  it("gọi thành công thì trả nguyên kết quả và ghi vết ok", async () => {
    const kq = await goiCoGhi(nc, async () => "kết quả thật");
    expect(kq).toBe("kết quả thật");
    const ds = docNhatKy({ gioiHan: 1 });
    expect(ds[0]!.congCu).toBe("bai.goi_co_ghi");
    expect(ds[0]!.ketQua).toBe("ok");
  });

  it("⭐ gọi lỗi thì VẪN NÉM LỖI ra ngoài — sổ không được nuốt lỗi", async () => {
    await expect(
      goiCoGhi({ ...nc, congCu: "bai.goi_loi" }, async () => {
        throw new Error("máy chủ hỏng");
      })
    ).rejects.toThrow("máy chủ hỏng");
    const ds = docNhatKy({ gioiHan: 1 });
    expect(ds[0]!.ketQua).toBe("loi");
    expect(ds[0]!.loi).toBe("máy chủ hỏng");
  });

  it("đo được thời gian thật, không phải số 0 cho có", async () => {
    await goiCoGhi({ ...nc, congCu: "bai.do_gio" }, async () => {
      await new Promise((r) => setTimeout(r, 25));
      return 1;
    });
    expect(docNhatKy({ gioiHan: 1 })[0]!.miliGiay).toBeGreaterThanOrEqual(20);
  });
});
