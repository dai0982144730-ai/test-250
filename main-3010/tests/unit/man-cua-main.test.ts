// ============================================================
// BÀI CANH: MAIN KHÔNG ĐƯỢC CÓ ROUTE MANG MÀN NGHIỆP VỤ CỦA AGENT KHÁC
//
// Nền (07/09/2026): trang gốc `/` của Main render nguyên "Tổng quan dự án"
// kế thừa của Agent Tiến độ — S-Curve bốn đường, bảng hạng mục đường găng,
// mốc quan trọng, KPI %TT/%KH — và đọc THẲNG `data/schedule.json` +
// `weekreport-*.json` tại chỗ qua lib/datasource. Đăng nhập xong là đáp
// đúng vào đó.
//
// Không ai thấy suốt nhiều ngày vì màn ấy KHÔNG nằm trong menu trái: soi
// menu thì thấy đủ và đúng 4 nhóm hợp lệ. Phải đăng nhập mới lộ.
//
// Luật bị phạm (KE-HOACH/06-MAIN-AGENT-DA-DUNG.md):
//   "Main KHÔNG giữ dữ liệu nghiệp vụ. Thấy cần số thì dựng bảng riêng để
//    chứa cho tiện. Làm thế là hỏng cả hệ — sẽ có hai bản số liệu cãi nhau."
// Và bài G-02 của BAI-TEST-NGUOI-DUNG: Main không có cây việc, phiếu giá,
// báo cáo ngày, kho văn bản — "thiếu màn là đúng thiết kế".
//
// Bài này đỏ ngay nếu:
//   1. mọc lại một route mang tên màn của bốn con kia
//   2. một page.tsx nào đó nối vào tầng tính tiến độ đọc data/ tại chỗ
//   3. có route lạ không nằm trong menu mà cũng không khai ngoại lệ
//   4. trang gốc đáp xuống chỗ khác màn chính, hoặc /login mang lại nhận
//      diện của agent khác
//
// Cùng khuôn với tests/unit/kich-ban-test.test.ts (canh nội dung kịch bản
// test) và tests/unit/canh-du-lieu-that.test.ts (quét tệp bằng fs).
// Không đụng tới `data/` — chỉ đọc mã nguồn trong `src/`.
// ============================================================

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALLOWED_TAB_PATHS } from "@/lib/ai/chat-types";
import { MA_AGENT, TEN_AGENT, TRANG_CHU_MAIN } from "@/lib/nhan-dien-agent";
import { TRANG_NHA } from "@/lib/auth";

const GOC = process.cwd();
const THU_MUC_APP = path.join(GOC, "src", "app");

const doc = (tep: string): string => fs.readFileSync(path.join(GOC, tep), "utf8");

/** Bóc nhóm 1 của mọi lần khớp (vòng exec — tsconfig target không cho spread iterator) */
function bocNhom(noi: string, re: RegExp): string[] {
  const ra: string[] = [];
  let m: RegExpExecArray | null;
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = g.exec(noi)) !== null) ra.push(m[1]);
  return ra;
}

/** Mọi route CÓ TRANG (bỏ /api — cổng máy gọi máy, không phải màn) */
function moiRouteCoTrang(): { route: string; tep: string }[] {
  const ra: { route: string; tep: string }[] = [];
  const di = (thuMuc: string): void => {
    for (const m of fs.readdirSync(thuMuc, { withFileTypes: true })) {
      const p = path.join(thuMuc, m.name);
      if (m.isDirectory()) {
        if (m.name === "api") continue;
        di(p);
      } else if (m.name === "page.tsx") {
        const duoi = path.relative(THU_MUC_APP, thuMuc).split(path.sep).join("/");
        ra.push({
          route: duoi === "" ? "/" : "/" + duoi,
          tep: path.relative(GOC, p).split(path.sep).join("/"),
        });
      }
    }
  };
  di(THU_MUC_APP);
  return ra.sort((a, b) => a.route.localeCompare(b.route));
}

const ROUTE = moiRouteCoTrang();

/** Menu trái là nguồn sự thật về màn Main CÓ — đọc href trong Sidebar.tsx */
function menuTrai(): string[] {
  const noi = doc("src/components/layout/Sidebar.tsx");
  const khoi = noi.slice(noi.indexOf("const GROUPS"), noi.indexOf("async function handleLogout"));
  return bocNhom(khoi, /href:\s*"([^"]+)"/g);
}

/**
 * ROUTE KHÔNG NẰM TRONG MENU MÀ VẪN ĐƯỢC PHÉP — mỗi mục phải nói rõ vì sao.
 * Thêm mục vào đây là một quyết định, không phải chỗ dập bài test cho xanh.
 */
const NGOAI_LE_NGOAI_MENU: Record<string, string> = {
  "/": "cửa vào chứ không phải màn — đá thẳng sang màn chính của Main",
  // 15/10/2026: bốn màn rời menu trái theo chốt của Mr. Đại — vẫn có đường vào (đo Header.tsx / UserMenu.tsx)
  "/viec-cua-toi": "vào bằng nút «Việc của tôi» đầu thanh trên (Mr. Đại chốt 07/10 — rời menu trái, Header.tsx)",
  "/gop-y": "vào bằng nút «Góp ý» trên thanh trên (Header.tsx)",
  "/settings": "vào bằng mục «Cài đặt» trong menu tên người (E33 04/10 — khuôn agent Công việc, UserMenu.tsx)",
  "/skill": "vào bằng mục «Skill AI của tôi» trong menu tên người (E33 04/10, UserMenu.tsx)",
  "/login": "trang đăng nhập, cố ý đứng ngoài khung app (AppShell bỏ Sidebar)",
  "/chat": "cửa sổ riêng của trợ lý AI, mở bằng window.open từ khung chat nổi",
  "/gioi-thieu": "tài liệu nguyên lý, vào bằng nút Giới thiệu trên topmenu",
  "/kich-ban-test": "màn tự kiểm của Main, vào bằng nút Test trên topmenu",
  "/kiem-thu": "màn Agent Tiến độ đã CHẶN — giữ để nói thẳng vì sao Main không có",
  "/hoi-lien-ban": "đường CŨ — màn Hỏi vắt ngang đã bỏ 25/09 (hỏi qua trợ lý chat); chỉ chuyển hướng sang /chat cho link cũ khỏi 404",
  // 26/09 — gọn menu: năm đường cũ chỉ còn chuyển hướng về đúng chỗ mới
  "/bao-cao-sang": "đường CŨ — gộp vào mục Báo cáo 26/09; chỉ chuyển hướng sang /bao-cao?tab=sang",
  "/bao-cao-thang": "đường CŨ — gộp vào mục Báo cáo 26/09; chỉ chuyển hướng sang /bao-cao?tab=thang",
  "/quan-sat": "đường CŨ — màn Quan sát/Sức khoẻ đã bỏ 26/09; chuyển hướng sang /nhat-ky",
  "/nhat-ky": "đường CŨ — màn Nhật ký & sức khoẻ agent đã BỎ 26/09 (xem ở Agent quan sát); chỉ hiện một dòng dẫn",
  "/ma-tran-goi": "đường CŨ — Ai được gọi ai chuyển vào Cài đặt → 🔌 Kết nối 26/09; chuyển hướng sang /settings?tab=ket-noi",
  "/cau-hinh-chung": "đường CŨ — màn Khai một lần đã GỠ 26/09 (0 lần lưu); chuyển hướng sang /settings?tab=ket-noi",
  "/tai-khoan-claude": "trang của RIÊNG từng người (nối tài khoản Claude cá nhân dự phòng) — vào bằng menu tên người, ngay dưới Skill AI của tôi (Quản lý token AI 04/10)",
};

/** Hai route trên topmenu — có màn thật nhưng cố ý không nằm trong menu trái */
/** Màn mở từ thanh trên (nút) và menu tên người — open_tab được kê (15/10/2026: thêm 3 màn rời menu trái 04–07/10) */
const TREN_TOPMENU = ["/gioi-thieu", "/kich-ban-test", "/viec-cua-toi", "/settings", "/skill"];

/** Tên màn nghiệp vụ của bốn agent kia — Main không được mọc route trùng */
const MAN_CUA_AGENT_KHAC = [
  "/gantt",
  "/planning",
  "/detail",
  "/tuan-truoc",
  "/crosscheck",
  "/soat-so-lieu",
  "/productivity",
  "/thiet-ke",
  "/docs",
  "/contractors",
  "/weather",
  "/photos",
  "/report-field",
  "/report-mgmt",
  "/cay-viec",
  "/phieu-gia",
  "/kho-van-ban",
  "/bao-cao-ngay",
  "/dayreport",
  "/schedule",
];

/**
 * Tầng tính tiến độ đọc `data/` TẠI CHỖ. Màn của Main không được nối vào —
 * cần số thì đi qua hoiAgent() (src/lib/nguon/hoi-agent.ts).
 */
const TANG_TIEN_DO_TAI_CHO = [
  "@/lib/datasource",
  "@/lib/scurve-calc",
  "@/lib/cod-du-an",
  "@/lib/moc-quan-trong",
  "@/lib/nang-suat-tinh",
  "@/lib/calculations",
  "@/lib/schedule/kiem-thu",
];

/**
 * ⭐ 23/09 — `SCurve` từng nằm trong danh sách trên vì hồi 07/09 nó tự đọc
 * `data/` qua scurve-calc. Nay nó chỉ VẼ: nhận điểm từ tiendo.s_curve (Bảng
 * điều hành hỏi qua cổng) và chỉ import kiểu `@/lib/scurve-kieu`. Được dùng,
 * nhưng bài dưới canh: nó mà import lại tầng tính tại chỗ thì đỏ.
 */
const THANH_PHAN_CHI_VE = ["src/components/tabs/overview/SCurve.tsx"];

describe("cây route của Main — quét được, không rỗng", () => {
  it("tìm thấy route để canh (kẻo bài này xanh giả)", () => {
    expect(ROUTE.length).toBeGreaterThan(8);
    const ds = ROUTE.map((r) => r.route);
    expect(ds).toContain("/");
    expect(ds).toContain("/bao-cao");
  });

  // ⭐ 23/09 — danh sách cũ (10 màn) lỗi thời: menu đã thêm Bảng điều hành,
  // Quan sát các agent và nhóm "Sang agent khác" (4 link ra cổng khác), Việc
  // của tôi lên đầu. Đổi menu là quyết định — sửa danh sách này cùng lượt.
  // ⭐ 26/09 (Mr. Đại chốt 1a — gọn 20/80): Báo cáo sáng + tháng gộp một mục; bỏ nhóm
  // "Điều khiển cả hệ" (Khai một lần gỡ · Ai được gọi ai vào Cài đặt 🔌 · Quan sát
  // thành tab Sức khoẻ của Nhật ký). Còn 7 màn.
  // ⭐ 26/09 (sau): BỎ màn Nhật ký & sức khoẻ agent — thay bằng link "Agent quan sát ↗"
  // trong nhóm Sang agent khác (route chuyển hướng theo danh bạ). Còn 6 màn.
  // ⭐ 04/10 (E33): dãy link sang agent khác + Cài đặt + Skill chuyển vào menu tên người (UserMenu); 07/10: «Việc của tôi»
  // lên đầu thanh trên. Menu trái còn 3 màn nghiệp vụ của Main — bài này cập nhật 15/10/2026 (trượt từ 8fa8ce7 / 955f34c).
  it("menu trái đủ 3 màn của Main (07/10)", () => {
    expect(menuTrai()).toEqual(["/bang-dieu-hanh", "/bao-cao", "/alerts"]);
  });
});

describe("Main không có màn nghiệp vụ của agent khác", () => {
  it.each(MAN_CUA_AGENT_KHAC)("không mọc route %s", (man) => {
    const co = ROUTE.filter((r) => r.route === man || r.route.startsWith(man + "/"));
    expect(
      co.map((r) => r.tep),
      `${man} là màn của agent khác — Main hỏi rồi tổng hợp, không tự dựng màn`,
    ).toEqual([]);
  });

  it("mọi route đều ở trong menu, hoặc có ngoại lệ ghi rõ lý do", () => {
    const menu = new Set(menuTrai());
    const lac = ROUTE.filter(
      (r) => !menu.has(r.route) && NGOAI_LE_NGOAI_MENU[r.route] === undefined,
    );
    expect(
      lac.map((r) => `${r.route} (${r.tep})`),
      'Route ngoài menu trái thì KHÔNG AI SOI THẤY — đúng chỗ "Tổng quan dự án" ' +
        "của Agent Tiến độ nấp suốt nhiều ngày. Đưa vào menu, xoá đi, hoặc khai " +
        "ngoại lệ kèm lý do trong NGOAI_LE_NGOAI_MENU.",
    ).toEqual([]);
  });

  it("mọi ngoại lệ đều còn route thật và có lý do — không để sót mục chết", () => {
    const coThat = new Set(ROUTE.map((r) => r.route));
    for (const [r, lyDo] of Object.entries(NGOAI_LE_NGOAI_MENU)) {
      expect(coThat.has(r), `ngoại lệ trỏ vào route không có: ${r}`).toBe(true);
      expect(lyDo.length, `ngoại lệ ${r} chưa ghi lý do tử tế`).toBeGreaterThan(20);
    }
  });

  it("KHÔNG trang nào nối thẳng vào tầng tính tiến độ đọc data/ tại chỗ", () => {
    const pham: string[] = [];
    for (const r of ROUTE) {
      const noi = doc(r.tep);
      for (const mo of TANG_TIEN_DO_TAI_CHO) {
        if (noi.includes(`from "${mo}"`)) pham.push(`${r.tep} -> ${mo}`);
      }
    }
    expect(
      pham,
      "Main KHÔNG giữ dữ liệu nghiệp vụ. Màn cần số tiến độ thì gọi " +
        'hoiAgent("tiendo", ...) — src/lib/nguon/hoi-agent.ts:\n' +
        pham.join("\n"),
    ).toEqual([]);
  });

  it("thành phần chỉ-vẽ (SCurve) KHÔNG tự đọc data/ — chỉ nhận điểm qua props", () => {
    const pham: string[] = [];
    for (const tep of THANH_PHAN_CHI_VE) {
      const noi = doc(tep);
      for (const mo of [...TANG_TIEN_DO_TAI_CHO, "node:fs", "fs"]) {
        if (noi.includes(`from "${mo}"`)) pham.push(`${tep} -> ${mo}`);
      }
    }
    expect(pham).toEqual([]);
  });

  it("màn đã chặn nói thẳng Main không có, và chỉ sang cổng 3003", () => {
    const noi = doc("src/app/kiem-thu/page.tsx");
    expect(noi).toContain("Main không có màn này");
    expect(noi).toContain("127.0.0.1:3003");
  });
});

describe("trang gốc / — cửa vào, không phải màn Tổng quan", () => {
  const noi = doc("src/app/page.tsx");
  /** Chú thích được phép kể lại chuyện cũ; cấm là cấm MÃ CHẠY. */
  const maChay = noi
    .split("\n")
    .filter((d) => {
      const t = d.trimStart();
      return t !== "" && !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n")
    .toLowerCase();

  it("đáp xuống màn chính của Main chứ không tự render gì", () => {
    expect(maChay).toContain("redirect");
    expect(maChay).toContain("trang_chu_main");
  });

  it("màn chính là màn Main CÓ THẬT và nằm trong menu trái", () => {
    expect(menuTrai()).toContain(TRANG_CHU_MAIN);
    expect(ROUTE.map((r) => r.route)).toContain(TRANG_CHU_MAIN);
  });

  it.each(["scurve", "đường găng", "%kh", "baselinepct", "criticaltasks", "getlivetasks"])(
    "không còn dựng %s — đó là màn Agent Tiến độ",
    (dau) => {
      expect(maChay).not.toContain(dau);
    },
  );

  it("cả bốn loại tài khoản đều đáp xuống đúng màn chính", () => {
    expect(TRANG_NHA).toBe(TRANG_CHU_MAIN);
  });
});

describe("nhận diện — bộ code này là Main Agent", () => {
  it("một định nghĩa duy nhất, mang tên Main", () => {
    expect(MA_AGENT).toBe("main");
    expect(TEN_AGENT).toBe("Main Agent");
  });

  it("/login mang tên Main, không phải agent khác", () => {
    const noi = doc("src/app/login/page.tsx");
    expect(noi).not.toContain("Agent Base.vn");
    expect(noi).not.toContain("dashboard tiến độ");
    expect(noi).toContain("TEN_AGENT");
    expect(noi).toContain("TRANG_CHU_MAIN");
  });

  it("không trang nào còn đứng tên agent khác trong tiêu đề thẻ", () => {
    // Chỉ soi TIÊU ĐỀ. Thân trang được phép gọi tên agent khác vì lý do
    // chính đáng — màn đã chặn phải chỉ đường sang Agent Tiến độ cổng 3003.
    const pham: string[] = [];
    for (const r of ROUTE) {
      for (const tieuDe of bocNhom(doc(r.tep), /title:\s*"([^"]*)"/g)) {
        if (/Agent Base\.vn|Agent [Tt]iến độ|SCI Tiến độ/.test(tieuDe)) {
          pham.push(`${r.tep}: ${tieuDe}`);
        }
      }
    }
    expect(pham, "tiêu đề trang còn đứng tên agent khác").toEqual([]);
  });

  it("trợ lý AI chỉ mở được tab CÓ THẬT trong Main", () => {
    const coThat = new Set(ROUTE.map((r) => r.route));
    const ma = ALLOWED_TAB_PATHS.filter((p) => !coThat.has(p));
    expect(ma, `open_tab kê đường dẫn không tồn tại: ${ma.join(", ")}`).toEqual([]);
  });

  it("open_tab chỉ kê màn trong menu trái + màn mở từ thanh trên / menu tên người", () => {
    const hopLe = new Set([...menuTrai(), ...TREN_TOPMENU]);
    const thua = ALLOWED_TAB_PATHS.filter((p) => !hopLe.has(p));
    expect(thua, `open_tab kê màn không phải của Main: ${thua.join(", ")}`).toEqual([]);
  });
});
