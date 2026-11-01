// ============================================================
// CANH 5 BẢN `keo-cau-hinh.ts` KHÔNG ĐƯỢC LỆCH NHAU
//
// ⭐ VÌ SAO CÓ BÀI KIỂM NÀY
//
// `src/lib/keo-cau-hinh.ts` sinh ra để diệt đúng một bệnh: *"mỗi app giữ một
// bản cấu hình riêng, lệch nhau mà không ai báo"*. Nhưng CHÍNH NÓ lại đang
// được nhân bản bằng copy-paste sang 5 repo:
//
//   · Main (bản GỐC)  src/lib/keo-cau-hinh.ts        ← nguồn sự thật
//   · Base            src/lib/keo-cau-hinh.ts
//   · Hợp đồng        src/lib/keo-cau-hinh.ts
//   · Pháp lý         lib/keo-cau-hinh.ts            ← CÓ chỉnh có chủ đích
//   · Tiến độ         src/lib/keo-cau-hinh.ts
//
// Nghĩa là: Main đổi khuôn `du_lieu` của `main.danh_ba` thì 4 bản kia phải
// sửa TAY, và KHÔNG có gì báo khi chúng lệch. Đúng bệnh cũ, chỉ đổi chỗ —
// từ "lệch cấu hình" thành "lệch mã nguồn đọc cấu hình".
//
// ⚠ CÁCH CHỮA GỐC KHÔNG PHẢI LÀ FILE NÀY. Cách chữa gốc là tách
// `keo-cau-hinh.ts` thành một GÓI DÙNG CHUNG (npm workspace hoặc gói nội bộ)
// để 5 repo `import` cùng một bản, không repo nào giữ bản chép. Bài kiểm này
// chỉ là HÀNG RÀO TẠM: nó không ngăn được việc chép, nó chỉ bảo đảm khi bản
// chép lệch thì có người biết ngay thay vì phát hiện lúc chạy thật. Bỏ file
// này đi ngay khi gói dùng chung ra đời.
//
// ⭐ SO CÁI GÌ — VÀ VÌ SAO KHÔNG SO TỪNG BYTE
//
// Bản Pháp lý CỐ Ý khác bản gốc ba chỗ, đều hợp lý và đều KHÔNG được tính là
// lệch:
//   ① đường lưu `storage/` thay cho `data/` (repo đó không có `data/`);
//   ② thêm biến ép đường dẫn `DUONG_DAN_CAU_HINH_KEO_VE` (cho bản đóng gói
//      `output: "standalone"`);
//   ③ một khối ghi chú về Next 16 / `unstable_cache`;
//   ④ (22/09, luật 29) gọi Main qua hàm bọc ghi sổ `goiCongCoGhi` thay vì
//      `fetch` thẳng — sáu trường vỏ MCP nằm trong hàm bọc (TRUONG_VO_MCP).
// So từng byte thì bài kiểm đỏ ngay từ ngày đầu và sẽ bị tắt đi trong một
// tuần — một hàng rào bị tắt còn tệ hơn không có hàng rào.
//
// Nên bài kiểm này so HAI TRỤC, cả hai đều miễn nhiễm với ba chỗ chỉnh trên:
//
//   TRỤC A — GIAO DIỆN XUẤT KHẨU: tên + chữ ký của mọi `export` (hàm, kiểu,
//     hằng). Đây mới là chỗ lệch NGUY HIỂM: nơi gọi ở app kia sẽ gãy hoặc,
//     tệ hơn, chạy sai lặng lẽ. Ba chỗ chỉnh của Pháp lý nằm trong
//     `duongDanFile()` — hàm NỘI BỘ, không `export` — nên không lọt vào trục
//     này.
//
//   TRỤC B — KHUÔN DỮ LIỆU DÂY: tập tên trường snake_case và tên công cụ
//     `main.*` mà file đọc/gửi qua cổng MCP (`danh_ba`, `dia_chi`,
//     `duong_dan_mcp`, `du_lieu`, `cong_cu`…). Đây chính là cái mà đề bài lo:
//     Main đổi khuôn `du_lieu` của `main.danh_ba` mà bản chép không đổi theo.
//     Trục này chạy trên mã nguồn ĐÃ BỎ CHÚ THÍCH, nên khối ghi chú Next 16
//     của Pháp lý (có chữ `unstable_cache`) không làm đỏ.
//
// Cái lệch đáng sợ là LỆCH GIAO DIỆN và LỆCH KHUÔN DỮ LIỆU, không phải lệch
// chú thích. Hai trục trên bắt đúng hai cái đó.
//
// ⭐ LUẬT CỦA BÀI KIỂM
//   · CHỈ ĐỌC. Không sửa một byte nào trong 4 repo kia.
//   · Repo không có trên máy này (ai đó chỉ lấy về một repo) → BỎ QUA có nói
//     rõ lý do ngay trên tên bài, KHÔNG báo đỏ. Bài kiểm không được gãy chỉ
//     vì thiếu thư mục.
//   · Đỏ thì phải nói đúng repo nào, lệch cái gì, và phải làm gì.
// ============================================================

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// ── Vị trí 5 bản ─────────────────────────────────────────────

/** Bản GỐC — nguồn sự thật. Nằm ngay trong repo này. */
const DUONG_DAN_GOC = path.join(process.cwd(), "src", "lib", "keo-cau-hinh.ts");

/** Gốc của cụm repo SCI-AI-AGENT (Main nằm ở `<cụm>/4-agent-main`). */
const CUM_REPO = path.resolve(process.cwd(), "..");

interface BanChep {
  /** Tên gọi trong thông báo lỗi — người đọc phải nhận ra ngay repo nào. */
  ten: string;
  duongDan: string;
}

const BAN_CHEP: BanChep[] = [
  { ten: "Base (1-agent-base)", duongDan: path.join(CUM_REPO, "1-agent-base", "src", "lib", "keo-cau-hinh.ts") },
  { ten: "Hợp đồng (2-agent-hop-dong)", duongDan: path.join(CUM_REPO, "2-agent-hop-dong", "src", "lib", "keo-cau-hinh.ts") },
  // Pháp lý không có thư mục `src/` — thư viện nằm thẳng ở `lib/`.
  { ten: "Pháp lý (3-agent-phap-ly-code)", duongDan: path.join(CUM_REPO, "3-agent-phap-ly-code", "lib", "keo-cau-hinh.ts") },
  // Tiến độ nằm ngoài cụm SCI-AI-AGENT. Cho ép đường dẫn bằng biến môi trường
  // để máy khác (thư mục đặt chỗ khác) vẫn canh được thay vì lặng lẽ bỏ qua.
  {
    ten: "Tiến độ (Code Agent tien do)",
    duongDan:
      (process.env.DUONG_DAN_AGENT_TIEN_DO ?? "").trim() ||
      "D:/CongviecHpt/4.CongviecvietAgent/GÓI CÔNG VIỆC/Code Agent tien do/src/lib/keo-cau-hinh.ts",
  },
];

/** Những cái tên mà mọi bản BẮT BUỘC phải xuất khẩu — bộ xương của file. */
const XUAT_KHAU_BAT_BUOC = [
  "tronDanhBa",
  "keoNenTuDong",
  "keoVeTuMain",
  "docBanLuu",
  "danhBaDangDung",
  "diaChiMain",
  "BanKeoVe",
  "KetQuaKeo",
  "DongDanhBaKeoVe",
  "DongTaiCho",
];

// ── Bóc chú thích ────────────────────────────────────────────

/**
 * Bỏ mọi chú thích, GIỮ NGUYÊN chuỗi và regex.
 *
 * Phải giữ chuỗi vì `"http://localhost:3010"` có `//` ở giữa — cắt ẩu là mất
 * luôn phần đuôi dòng. Phải nhận ra regex vì `/\/+$/` chứa dấu `/`.
 *
 * Máy quét này không phải trình biên dịch, nhưng nó chạy Y HỆT trên cả hai
 * file đem so, nên dù có bóc chưa chuẩn ở đâu đó thì hai bên vẫn bóc lệch
 * giống nhau — phép so vẫn công bằng.
 */
function boChuThich(nguon: string): string {
  let ra = "";
  let i = 0;
  /** Ký tự code có nghĩa gần nhất — để đoán `/` là phép chia hay mở regex. */
  let truoc = "";
  while (i < nguon.length) {
    const c = nguon[i];
    const d = nguon[i + 1] ?? "";

    // Chú thích một dòng
    if (c === "/" && d === "/") {
      while (i < nguon.length && nguon[i] !== "\n") i++;
      continue;
    }
    // Chú thích khối
    if (c === "/" && d === "*") {
      i += 2;
      while (i < nguon.length && !(nguon[i] === "*" && nguon[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    // Chuỗi: ' " `
    if (c === '"' || c === "'" || c === "`") {
      ra += c;
      i++;
      while (i < nguon.length) {
        if (nguon[i] === "\\") {
          ra += nguon.slice(i, i + 2);
          i += 2;
          continue;
        }
        ra += nguon[i];
        const ketThuc = nguon[i] === c;
        i++;
        if (ketThuc) break;
      }
      truoc = c;
      continue;
    }
    // Regex: `/` đứng sau một ký tự KHÔNG thể kết thúc biểu thức
    if (c === "/" && truoc !== "" && !/[\w$)\]]/.test(truoc)) {
      ra += c;
      i++;
      let trongLopKyTu = false;
      while (i < nguon.length) {
        if (nguon[i] === "\\") {
          ra += nguon.slice(i, i + 2);
          i += 2;
          continue;
        }
        if (nguon[i] === "[") trongLopKyTu = true;
        else if (nguon[i] === "]") trongLopKyTu = false;
        const ketThuc = nguon[i] === "/" && !trongLopKyTu;
        ra += nguon[i];
        i++;
        if (ketThuc) break;
      }
      truoc = "/";
      continue;
    }

    ra += c;
    if (!/\s/.test(c)) truoc = c;
    i++;
  }
  return ra;
}

// ── TRỤC A: giao diện xuất khẩu ──────────────────────────────

function gonKhoangTrang(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Tìm vị trí `}` đóng cho dấu `{` ở vị trí `moNgoac`. */
function timNgoacDong(nguon: string, moNgoac: number): number {
  let sau = 0;
  for (let i = moNgoac; i < nguon.length; i++) {
    if (nguon[i] === "{") sau++;
    else if (nguon[i] === "}") {
      sau--;
      if (sau === 0) return i;
    }
  }
  return nguon.length;
}

/**
 * Rút bản đồ `tên export → chữ ký đã chuẩn hoá` từ mã nguồn ĐÃ BỎ CHÚ THÍCH.
 *
 * · `interface`  → danh sách thành viên, sắp xếp cho ổn định (đổi thứ tự khai
 *   báo không phải là lệch giao diện, đổi/thiếu thành viên MỚI là).
 * · `function`   → từ chữ `export` tới dấu `{` mở thân hàm: tên, tham số,
 *   kiểu trả về, cả `<T extends …>`.
 * · `type`/`const`/`let`/`class`/`enum` → phần khai báo tới `;` hoặc `{`.
 */
function giaoDienXuatKhau(nguonSach: string): Map<string, string> {
  const ra = new Map<string, string>();
  const mo = /\bexport\s+/g;
  let m: RegExpExecArray | null;
  while ((m = mo.exec(nguonSach)) !== null) {
    const batDau = m.index;
    const phanConLai = nguonSach.slice(batDau);

    // export interface X { … }
    const kInterface = /^export\s+interface\s+([A-Za-z0-9_$]+)\s*(?:<[^{]*>)?\s*\{/.exec(phanConLai);
    if (kInterface) {
      const ten = kInterface[1];
      const viTriMo = batDau + kInterface[0].length - 1;
      const than = nguonSach.slice(viTriMo + 1, timNgoacDong(nguonSach, viTriMo));
      const thanhVien = than
        .split(/[;\n]/)
        .map((x) => gonKhoangTrang(x))
        .filter((x) => x !== "" && x !== "," )
        .sort();
      ra.set(ten, `interface { ${thanhVien.join("; ")} }`);
      continue;
    }

    // export function X(…): T {   /  export async function …
    const kHam = /^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/.exec(phanConLai);
    if (kHam) {
      const ten = kHam[1];
      // Đi tới dấu `{` mở thân hàm — bỏ qua `{` nằm trong ngoặc tròn/nhọn.
      let i = batDau + kHam[0].length;
      let tron = 0;
      let nhon = 0;
      while (i < nguonSach.length) {
        const c = nguonSach[i];
        if (c === "(") tron++;
        else if (c === ")") tron--;
        else if (c === "<") nhon++;
        else if (c === ">") nhon--;
        else if (c === "{" && tron === 0 && nhon <= 0) break;
        i++;
      }
      ra.set(ten, gonKhoangTrang(nguonSach.slice(batDau, i)));
      continue;
    }

    // export type / const / let / class / enum …
    const kKhac = /^export\s+(type|const|let|var|class|enum)\s+([A-Za-z0-9_$]+)/.exec(phanConLai);
    if (kKhac) {
      const ten = kKhac[2];
      const het = phanConLai.search(/[;{]/);
      const khai = het === -1 ? phanConLai.slice(0, 200) : phanConLai.slice(0, het);
      ra.set(ten, gonKhoangTrang(khai));
      continue;
    }
  }
  return ra;
}

// ── TRỤC B: khuôn dữ liệu dây ────────────────────────────────

/**
 * Tập tên trường snake_case + tên công cụ `main.*` xuất hiện trong mã.
 *
 * Đây là hợp đồng qua dây với cổng MCP của Main: `danh_ba`, `dia_chi`,
 * `duong_dan_mcp`, `dang_bat`, `gia_tri`, `duoc_goi`, `du_lieu`, `cong_cu`,
 * `tham_so`, `agent_goi`, `ly_do_goi`, `thong_diep`… Main đổi khuôn mà bản
 * chép không đổi theo thì lệch ở đây.
 *
 * Chỉ bắt snake_case CHỮ THƯỜNG: hằng số (`HAN_CHO_MS`, `TUOI_TOI_DA_MS`,
 * `DUONG_DAN_CAU_HINH_KEO_VE`) và số có gạch (`10_000`) cố ý nằm ngoài.
 */
function khuonDuLieuDay(nguonSach: string): string[] {
  const tap: Record<string, true> = {};
  // Dùng `exec` chứ không `matchAll`/`for…of`: tsconfig của repo không đặt
  // `target` nên trình biên dịch chưa cho lặp thẳng trên iterator (TS2802).
  const gom = (mau: RegExp): void => {
    let x: RegExpExecArray | null;
    while ((x = mau.exec(nguonSach)) !== null) tap[x[0]] = true;
  };
  gom(/\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g);
  gom(/\bmain\.[a-z][a-z0-9_]*/g);
  return Object.keys(tap).sort();
}

/** Vỏ của một lượt gọi cổng MCP — gửi đi và đọc về, không phải khuôn danh bạ. */
// 24/09: thêm "ma_loi" — mã lỗi nằm ở VỎ câu trả lời MCP (KHONG_CO_DU_LIEU…), bản Base đọc nó khi gọi qua hàm bọc.
const TRUONG_VO_MCP = ["agent_goi", "cong_cu", "du_lieu", "ly_do_goi", "ma_loi", "tham_so", "thong_diep"];

// ── So và dựng thông báo ─────────────────────────────────────

const PHAI_LAM_GI =
  "PHẢI LÀM GÌ: chép lại phần lệch TỪ BẢN GỐC ở Main (src/lib/keo-cau-hinh.ts) đè lên bản chép nói trên — " +
  "Main là nguồn sự thật, không sửa ngược chiều. Riêng repo Pháp lý được phép khác bản gốc ĐÚNG BA CHỖ và " +
  "chỉ ba chỗ đó: đường lưu `storage/` thay `data/`, biến `DUONG_DAN_CAU_HINH_KEO_VE`, và khối ghi chú Next 16 " +
  "— cả ba nằm trong hàm nội bộ `duongDanFile()` / trong chú thích nên KHÔNG BAO GIỜ làm bài kiểm này đỏ. " +
  "Nếu chỗ lệch là do Main vừa đổi có chủ đích thì phải cập nhật CẢ 4 bản chép trong cùng một lượt. " +
  "Chữa gốc: tách file này thành gói dùng chung để 5 repo cùng import một bản.";

function soGiaoDien(goc: Map<string, string>, chep: Map<string, string>): string[] {
  const loi: string[] = [];
  // `forEach` chứ không `for…of` trên Map — xem ghi chú TS2802 ở trên.
  goc.forEach((kyGoc, ten) => {
    const kyChep = chep.get(ten);
    if (kyChep === undefined) {
      loi.push(`THIẾU export \`${ten}\` — bản gốc có, bản chép không có.\n      gốc : ${kyGoc}`);
    } else if (kyChep !== kyGoc) {
      loi.push(`LỆCH chữ ký \`${ten}\`:\n      gốc : ${kyGoc}\n      chép: ${kyChep}`);
    }
  });
  chep.forEach((_ky, ten) => {
    if (!goc.has(ten)) {
      loi.push(`THỪA export \`${ten}\` — bản chép tự thêm, bản gốc ở Main không có. Nơi khác gọi tới sẽ gãy.`);
    }
  });
  return loi;
}

function thongBaoDo(ban: BanChep, loi: string[], truc: string): string {
  return [
    "",
    `❌ LỆCH BẢN CHÉP — ${truc}`,
    `   Repo lệch : ${ban.ten}`,
    `   File lệch : ${ban.duongDan}`,
    `   Bản gốc   : ${DUONG_DAN_GOC}`,
    "   Lệch cái gì:",
    ...loi.map((x) => `    · ${x}`),
    "",
    `   ${PHAI_LAM_GI}`,
    "",
  ].join("\n");
}

// ── Bài kiểm ─────────────────────────────────────────────────

const nguonGocSach = boChuThich(fs.readFileSync(DUONG_DAN_GOC, "utf8"));
const giaoDienGoc = giaoDienXuatKhau(nguonGocSach);
const khuonGoc = khuonDuLieuDay(nguonGocSach);

describe("đồng bộ 5 bản keo-cau-hinh.ts (hàng rào tạm, chờ gói dùng chung)", () => {
  it("bản GỐC ở Main xuất khẩu đủ bộ xương — nếu đỏ thì phải sửa cả 4 bản chép cùng lượt", () => {
    const thieu = XUAT_KHAU_BAT_BUOC.filter((t) => !giaoDienGoc.has(t));
    expect(
      thieu,
      `Bản gốc ${DUONG_DAN_GOC} không còn xuất khẩu: ${thieu.join(", ")}.\n` +
        "Đổi tên/bỏ một export ở Main là đổi hợp đồng của cả 5 repo. Nếu đây là đổi có chủ đích thì " +
        "sửa danh sách XUAT_KHAU_BAT_BUOC trong bài kiểm này VÀ cập nhật cả 4 bản chép."
    ).toEqual([]);
    // Bắt được ít nhất bộ xương thì máy quét đang chạy đúng, không rút ra rỗng.
    expect(khuonGoc.length).toBeGreaterThan(5);
  });

  for (const ban of BAN_CHEP) {
    const coTrenMay = fs.existsSync(ban.duongDan);
    const lyDoBoQua = `BỎ QUA (không phải lỗi): máy này không có repo đó — ${ban.duongDan}`;

    it.skipIf(!coTrenMay)(
      coTrenMay
        ? `${ban.ten} — giao diện xuất khẩu khớp bản gốc`
        : `${ban.ten} — giao diện xuất khẩu · ${lyDoBoQua}`,
      () => {
        const sach = boChuThich(fs.readFileSync(ban.duongDan, "utf8"));
        const loi = soGiaoDien(giaoDienGoc, giaoDienXuatKhau(sach));
        expect(loi, thongBaoDo(ban, loi, "TRỤC A · giao diện xuất khẩu (tên + chữ ký)")).toEqual([]);
      }
    );

    it.skipIf(!coTrenMay)(
      coTrenMay
        ? `${ban.ten} — khuôn dữ liệu dây (main.danh_ba …) khớp bản gốc`
        : `${ban.ten} — khuôn dữ liệu dây · ${lyDoBoQua}`,
      () => {
        const sach = boChuThich(fs.readFileSync(ban.duongDan, "utf8"));
        const khuonChep = khuonDuLieuDay(sach);
        // ⭐ 23/09 — CHỖ KHÁC THỨ TƯ được phép (luật 29, 12/09): bản chép gọi
        // Main qua hàm bọc ghi sổ (`goiCongCoGhi` của Pháp lý 22/09) thay vì
        // `fetch` thẳng. Sáu trường VỎ của lượt gọi MCP khi đó nằm trong hàm bọc,
        // không nằm trong file này — thiếu chúng ở đây KHÔNG phải lệch khuôn.
        // Trường RUỘT (danh_ba, dia_chi, gia_tri, duoc_goi…) vẫn phải khớp đủ.
        const quaHamBoc = /\bgoi(?:Cong)?CoGhi\s*\(/.test(sach);
        const thieu = khuonGoc.filter(
          (x) => !khuonChep.includes(x) && !(quaHamBoc && TRUONG_VO_MCP.includes(x))
        );
        // Trường VỎ (ma_loi, thong_diep…) là của câu trả lời MCP chứ không phải khuôn `du_lieu` Main giao — không tính là thừa.
        const thua = khuonChep.filter((x) => !khuonGoc.includes(x) && !TRUONG_VO_MCP.includes(x));
        const loi: string[] = [];
        if (thieu.length > 0) {
          loi.push(
            `THIẾU trường/công cụ mà bản gốc có: ${thieu.join(", ")}. ` +
              "Main đã đổi khuôn `du_lieu` mà bản chép chưa theo → bản chép sẽ đọc ra `undefined` và " +
              "lặng lẽ hiện danh bạ rỗng."
          );
        }
        if (thua.length > 0) {
          loi.push(
            `THỪA trường/công cụ bản gốc không có: ${thua.join(", ")}. ` +
              "Bản chép đang đọc một khuôn mà Main không giao → sẽ luôn rỗng."
          );
        }
        expect(loi, thongBaoDo(ban, loi, "TRỤC B · khuôn dữ liệu dây qua cổng MCP")).toEqual([]);
      }
    );
  }
});
