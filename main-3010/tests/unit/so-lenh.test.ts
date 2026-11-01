import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BUOC_NGAM,
  DANH_MUC_LENH,
  LENH_BI_LOAI,
  LENH_GO_24_09,
  LENH_GO_KHONG_CON_NUT,
  lenhTheoVai,
  timLenh,
  timTheoMoc,
} from "@/lib/lenh/danh-muc";
import { TRAN_BUOC, NHIP, bangNhau } from "@/lib/lenh/mo-hinh";

describe("sổ lệnh giao diện (chốt 06/09)", () => {
  // 24/09: 92 lệnh Mr. Đại tick 06/09 − 61 lệnh trỏ trang tiến độ đã rời Main − 9 lệnh
  // không còn nút (G2–G6 ở /alerts, N2–N5 ở /settings) = 22
  // 04/10: thêm 5 lệnh không còn nút (I1 · I2 · I3 · I6 · I9 — Việc của tôi bỏ Base.vn, CHOT 6g.7 mục 3)
  it("còn 17 lệnh (92 − 61 − 14 không còn nút), 19 lệnh bị loại 06/09", () => {
    const soGo = Object.values(LENH_GO_24_09).reduce((s, v) => s + v.length, 0);
    expect(soGo).toBe(61);
    expect(Object.keys(LENH_GO_KHONG_CON_NUT).length).toBe(14);
    expect(DANH_MUC_LENH.length).toBe(92 - soGo - 14);
    expect(LENH_BI_LOAI.length).toBe(19);
  });

  it("lệnh gỡ vì không còn nút: không tra được, lý do không rỗng", () => {
    for (const [ma, lyDo] of Object.entries(LENH_GO_KHONG_CON_NUT)) {
      expect(timLenh(ma), `lệnh ${ma}`).toBeUndefined();
      expect(lyDo.length, `lý do ${ma}`).toBeGreaterThan(20);
    }
  });

  // ⭐ 24/09: 12 lệnh ở /alerts, /settings từng có móc trong sổ mà KHÔNG phần tử nào
  // mang `data-lenh` đó — trợ lý gọi là trượt. Bài này đi từ page.tsx của trang theo
  // các import "@/…" và "./…" (không đi vào node_modules), gom mã nguồn rồi tìm móc.
  // Lệnh "*" tìm trong cả src/. Hai lệnh không có phần tử: mở trang (điều hướng) và
  // cuộn tới (tìm theo data-wbs bất kỳ).
  it("mọi lệnh có móc data-lenh trên trang của nó", () => {
    const goc = path.join(process.cwd(), "src");
    const docTep = (p: string) => fs.readFileSync(p, "utf8");
    const giaiImport = (tu: string, spec: string): string | null => {
      const co = spec.startsWith("@/") ? path.join(goc, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(tu), spec) : null;
      if (!co) return null;
      for (const duoi of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
        const f = co + duoi;
        if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
      }
      return null;
    };
    const gomTuTrang = (trang: string): string => {
      const daDi = new Set<string>();
      const hang = [path.join(goc, "app", trang, "page.tsx")];
      let chu = "";
      while (hang.length > 0) {
        const f = hang.pop()!;
        if (daDi.has(f)) continue;
        daDi.add(f);
        const t = docTep(f);
        chu += t;
        for (const m of Array.from(t.matchAll(/from\s+"([^"]+)"/g))) {
          const g = giaiImport(f, m[1]);
          if (g) hang.push(g);
        }
      }
      return chu;
    };
    const tatCa = (() => {
      const ra: string[] = [];
      const di = (d: string) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) di(p);
          else if (p.endsWith(".tsx")) ra.push(docTep(p));
        }
      };
      di(goc);
      return ra.join("\n");
    })();
    // Móc đặt được hai kiểu: viết thẳng `data-lenh="…"` trên phần tử, hoặc truyền qua prop
    // `lenh="…"` cho một component dùng chung (ThanhTab) mà bên trong nó mới gắn `data-lenh={lenh}`.
    // Kiểu thứ hai vẫn ra đúng thuộc tính trên trình duyệt, nên bài không được coi là trượt.
    const coMoc = (chu: string, moc: string): boolean =>
      chu.includes(`data-lenh="${moc}"`) || (chu.includes(`lenh="${moc}"`) && chu.includes("data-lenh={lenh}"));

    const theoTrang = new Map<string, string>();
    for (const l of DANH_MUC_LENH) {
      if (l.kieu === "mo-trang" || l.moc === "chung.cuon-toi") continue;
      let chu = tatCa;
      if (l.trang !== "*") {
        if (!theoTrang.has(l.trang)) theoTrang.set(l.trang, gomTuTrang(l.trang));
        chu = theoTrang.get(l.trang)!;
      }
      expect(coMoc(chu, l.moc), `lệnh ${l.ma} (${l.trang}) thiếu data-lenh="${l.moc}"`).toBe(true);
    }
  });

  it("mọi lệnh trỏ trang CÓ THẬT ở Main (src/app/<trang>/page.tsx) — không để móc trượt", () => {
    for (const l of DANH_MUC_LENH) {
      if (l.trang === "*") continue;
      expect(fs.existsSync(path.join(process.cwd(), "src", "app", l.trang, "page.tsx")), `lệnh ${l.ma} trỏ ${l.trang}`).toBe(true);
    }
  });

  it("lệnh đã gỡ không còn tra được", () => {
    for (const ma of Object.values(LENH_GO_24_09).flat()) expect(timLenh(ma), `lệnh ${ma}`).toBeUndefined();
  });

  it("mã lệnh không trùng nhau", () => {
    const ma = DANH_MUC_LENH.map((l) => l.ma);
    expect(new Set(ma).size).toBe(ma.length);
  });

  it("hai lệnh khác nhau không dùng chung một móc", () => {
    const moc = DANH_MUC_LENH.map((l) => l.moc);
    expect(new Set(moc).size).toBe(moc.length);
  });

  it("móc phải theo khuôn <khu>.<việc>, không dấu tiếng Việt", () => {
    for (const l of DANH_MUC_LENH) {
      expect(l.moc, `lệnh ${l.ma}`).toMatch(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/);
    }
  });

  it("bước ngầm không được trùng móc của lệnh nào", () => {
    for (const b of BUOC_NGAM) expect(timTheoMoc(b), `bước ngầm ${b}`).toBeUndefined();
  });

  it("lệnh điền/chọn phải là ô nhập, lệnh cuộn không bao giờ ghi dữ liệu", () => {
    for (const l of DANH_MUC_LENH) {
      if (l.kieu === "cuon") expect(l.ghi, `lệnh ${l.ma}`).toBe(false);
    }
  });

  it("kỹ sư không thấy lệnh chỉ dành cho PM", () => {
    // 24/09: N3 (lệnh pm-only duy nhất) đã gỡ — kiểm theo luật, không theo mã
    const ks = lenhTheoVai("engineer");
    expect(ks.every((l) => l.vai !== "pm")).toBe(true);
    expect(lenhTheoVai("pm").length).toBe(DANH_MUC_LENH.length);
  });

  it("trần bước và nhịp diễn hợp lệ", () => {
    expect(TRAN_BUOC).toBe(24);
    expect(NHIP.cham.buoc).toBeGreaterThan(NHIP.nhanh.buoc);
    expect(NHIP.nhanh.goPhim).toBe(0);
  });

  it("tra được lệnh theo mã và theo móc", () => {
    expect(timLenh("g8")?.ten).toContain("Bác bỏ đề xuất");
    expect(timTheoMoc("viec.gui-nhap")?.ma).toBe("I4");
    expect(timTheoMoc("viec.tao")).toBeUndefined(); // I3 gỡ 04/10 cùng form giao kiểu Base.vn
  });
});

describe("so khớp giá trị giao diện", () => {
  it("bỏ dấu và chứa nhau là khớp — trợ lý viết tắt vẫn trúng", () => {
    expect(bangNhau("chỉ đường găng", "Chỉ đường găng (nội bộ)")).toBe(true);
    expect(bangNhau("giãn", "Giãn rộng thang ngang")).toBe(true);
    expect(bangNhau("Full", "full")).toBe(true);
  });

  it("khác hẳn thì KHÔNG khớp — thà dừng còn hơn bấm nhầm", () => {
    expect(bangNhau("Chỉ chậm baseline", "Chỉ đường găng (nội bộ)")).toBe(false);
    expect(bangNhau("", "Tất cả")).toBe(false);
  });

  it("mọi giá trị hợp lệ đã khai đều khớp với chính nó", () => {
    for (const l of DANH_MUC_LENH) {
      for (const g of l.giaTriHopLe ?? []) {
        expect(bangNhau(g, g), `lệnh ${l.ma} giá trị ${g}`).toBe(true);
      }
    }
  });
});
