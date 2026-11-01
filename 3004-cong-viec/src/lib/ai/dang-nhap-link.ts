// ============================================================
// ai/dang-nhap-link.ts — ĐĂNG NHẬP CLAUDE BẰNG LINK + DÁN MÃ (Mr. Đại chốt 04/10/2026 trưa). CHỈ SERVER.
//
// MỘT cách đăng nhập chung cho Tài khoản 1, Tài khoản 2 (công ty) và Tài khoản Claude cá nhân — "bản chất đây là cùng 1 việc thì
// không trình bầy 1 vấn đề theo 2 cách khác nhau". Thay cho cửa sổ đăng nhập mở trên MÁY CHỦ (người ở máy khác / điện thoại không
// thấy) và mã dài hạn `claude setup-token` (phải gõ dòng lệnh trên một máy có Claude Code).
//   ① máy chủ chạy `claude auth login --claudeai`, CLAUDE_CONFIG_DIR = thư mục của tài khoản, stdin/stdout là ống.
//      Đo 04/10: CLI in "If the browser didn't open, visit: <link>" rồi chờ "Paste code here" (setup-token qua ống thì không in gì).
//   ② trả link về trình duyệt → người dùng mở trên máy / điện thoại của MÌNH, đăng nhập Claude → trang Claude hiện một mã.
//   ③ người dùng dán mã vào app → app ghi mã vào stdin của CLI → CLI đổi mã, ghi .credentials.json vào thư mục tài khoản, thoát 0.
// BROWSER trỏ vào lệnh rỗng — đo 04/10: CLI gọi đúng chương trình trong biến BROWSER; không chặn thì máy chủ tự bật tab đăng nhập.
// Mã sai / quá hạn → CLI thoát 1 "Login failed: Request failed with status code 400" — lượt đó hết, bấm Đăng nhập lấy link mới.
// Mỗi tài khoản chỉ một lượt đang chờ (bấm lại thì tắt lượt cũ); 15 phút không dán mã thì tự tắt.
// Không chuỗi nào từ trình duyệt vào dòng lệnh: mã đi qua stdin và đã lọc chỉ còn ký tự của mã.
// ============================================================
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { envConCli, findClaudeBinary, needsShell, quoteForShell, resetClaudeBinaryCache } from "@/lib/ai/providers";

interface LuotCho {
  p: ChildProcess;
  thuMuc: string;
  out: string;
  err: string;
  thoat: Promise<number | null>;
  hen: ReturnType<typeof setTimeout>;
}
type G = typeof globalThis & { __dangNhapLink?: Map<string, LuotCho> };
const dsCho = () => ((globalThis as G).__dangNhapLink ??= new Map());

/** Câu trả cho 3 cửa đăng nhập cũ đã đóng (cửa sổ trên máy chủ · mã dài hạn công ty · mã dài hạn cá nhân) — kiểm độc lập lần 2 #3 */
export const CAU_CUA_DANG_NHAP_CU =
  // (Mr. Đại chốt 04/10: mọi tài khoản Claude đăng nhập MỘT cách — người dùng không cần biết ai chốt, kiểm độc lập lần 4 ⚪5)
  'Cách đăng nhập này đã bỏ — mọi tài khoản Claude nay đăng nhập một cách: bấm "Đăng nhập Claude" trên thẻ tài khoản, mở link, dán mã trang Claude hiện ra.';

const HAN_CHO_MS = 15 * 60_000;
/** Trần tổng lượt chờ dán mã cùng lúc trên máy chủ — mỗi lượt một claude.exe ~60–100 MB (kiểm độc lập lần 2 #4) */
export const TRAN_LUOT_CHO = 5;
const CHO_LINK_MS = 30_000;
const CHO_XAC_NHAN_MS = 60_000;
const RE_LINK = /https:\/\/\S+\/oauth\/authorize\?\S+/;
const boMauChu = (s: string) => s.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");

/** Lệnh rỗng cho biến BROWSER — CLI "mở trình duyệt" mà máy chủ không bật gì */
function lenhRong(): string {
  if (process.platform !== "win32") return "true";
  const f = path.join(os.tmpdir(), "sci-trinh-duyet-rong.cmd");
  try {
    if (!fs.existsSync(f)) fs.writeFileSync(f, "@exit /b 0\r\n");
  } catch {
    /* không ghi được thì máy chủ bật thừa một tab đăng nhập — không hại */
  }
  return f;
}

/**
 * Mã người dùng dán: bỏ khoảng trắng / xuống dòng; chỉ nhận ký tự có thể có trong mã (chữ, số, - _ . ~ # = % / +).
 * Dạng mã thật CHƯA thấy (chưa ai đăng nhập trọn) → nới sẵn = % / + (kiểm độc lập lần 2 #5); mã đi qua stdin, không vào dòng lệnh.
 */
export function chuanHoaMaLink(tho: unknown): string | null {
  const s = String(tho ?? "").replace(/\s+/g, "");
  return /^[A-Za-z0-9_\-.~#=%/+]{10,2000}$/.test(s) ? s : null;
}

/**
 * Lý do đăng nhập hỏng, nói bằng tiếng Việt (kiểm độc lập lần 2 #6 — không ghép nguyên văn tiếng Anh của CLI vào câu cho người đọc).
 * Câu gốc ghi nhật ký máy chủ để quản trị tra.
 */
function lyDoTiengViet(khoa: string, goc: string): string {
  const s = goc.trim();
  if (s) console.warn(`[dang-nhap-link] ${khoa}: ${s.slice(0, 500)}`);
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EAI_AGAIN|fetch failed|getaddrinfo|network/i.test(s)) return "máy chủ không kết nối được tới Claude (mạng)";
  if (/status code 5\d\d/i.test(s)) return "máy chủ của Claude đang lỗi";
  if (/status code 4\d\d/i.test(s)) return "Claude từ chối yêu cầu đăng nhập";
  return s ? "chi tiết kỹ thuật ở nhật ký máy chủ" : "";
}

/** Tắt lượt đăng nhập đang chờ của tài khoản (bấm Huỷ, bấm Đăng nhập lần nữa, hết 15 phút) */
export function huyDangNhapLink(khoa: string): void {
  const l = dsCho().get(khoa);
  if (!l) return;
  dsCho().delete(khoa);
  clearTimeout(l.hen);
  try {
    l.p.kill();
  } catch {
    /* đã thoát */
  }
}

/**
 * Bước ①–②: chạy `claude auth login` cho tài khoản `khoa` (vd "tk1", "ca_nhan:<mã người>"), đăng nhập vào `thuMuc`.
 * Trả link đăng nhập để trình duyệt mở. CLI vẫn chạy, chờ mã ở bước ③ (guiMaDangNhap).
 */
export async function moDangNhapLink(khoa: string, thuMuc: string): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  huyDangNhapLink(khoa);
  if (dsCho().size >= TRAN_LUOT_CHO) {
    return { ok: false, message: `Đang có ${dsCho().size} lượt đăng nhập Claude chờ dán mã cùng lúc (tối đa ${TRAN_LUOT_CHO}) — anh/chị thử lại sau vài phút.` };
  }
  resetClaudeBinaryCache();
  const bin = findClaudeBinary();
  if (!bin) return { ok: false, message: "Máy chủ chưa có Claude CLI — nhờ quản trị cài ở Cài đặt → AI (nút Cài Claude ngay)." };
  if (process.env.CAM_CLI_THAT === "1" && bin !== process.env.ANTHROPIC_SUB_CLI_PATH?.trim()) {
    return { ok: false, message: "Đang chạy test: cấm gọi Claude CLI thật." };
  }
  try {
    fs.mkdirSync(thuMuc, { recursive: true });
  } catch {
    return { ok: false, message: "Không tạo được thư mục đăng nhập trên máy chủ." };
  }
  const env = envConCli();
  env.CLAUDE_CONFIG_DIR = thuMuc;
  env.BROWSER = lenhRong();
  delete env.CLAUDE_CODE_OAUTH_TOKEN;

  const shell = needsShell(bin);
  let p: ChildProcess;
  try {
    const tuyChon = { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] as ("pipe")[], env, cwd: thuMuc };
    // .cmd phải qua cmd.exe: ghép MỘT câu lệnh (tham số cố định, không có chữ nào từ người dùng)
    p = shell ? spawn(`${quoteForShell(bin)} auth login --claudeai`, { ...tuyChon, shell: true }) : spawn(bin, ["auth", "login", "--claudeai"], tuyChon);
  } catch (e) {
    const ly = lyDoTiengViet(khoa, e instanceof Error ? e.message : String(e));
    return { ok: false, message: `Không chạy được Claude CLI trên máy chủ${ly ? ` — ${ly}` : ""}.` };
  }
  const l: LuotCho = {
    p,
    thuMuc,
    out: "",
    err: "",
    thoat: new Promise((res) => {
      p.on("exit", (c) => res(c));
      p.on("error", () => res(null));
    }),
    // Hết hạn chờ thì tắt CHÍNH tiến trình này — không tra danh sách chờ (đo 04/10: một lượt bấm thử qua trình duyệt còn treo
    // sau khi lượt mới thay chỗ trong danh sách; tra theo khoá thì hẹn giờ không còn thấy nó)
    hen: setTimeout(() => {
      if (dsCho().get(khoa) === l) dsCho().delete(khoa);
      try {
        p.kill();
      } catch {
        /* đã thoát */
      }
    }, HAN_CHO_MS),
  };
  // Thoát (thành công, mã sai, tự hỏng) → bỏ khỏi danh sách chờ; guiMaDangNhap giữ sẵn `l` nên vẫn đọc được mã thoát
  p.on("exit", () => {
    clearTimeout(l.hen);
    if (dsCho().get(khoa) === l) dsCho().delete(khoa);
  });
  p.stdin?.on("error", () => {});
  p.stdout?.on("data", (d) => (l.out += d.toString()));
  p.stderr?.on("data", (d) => (l.err += d.toString()));
  dsCho().set(khoa, l);

  const url = await new Promise<string | null>((res) => {
    const t0 = Date.now();
    const kiem = setInterval(() => {
      const m = boMauChu(l.out).match(RE_LINK);
      if (m) {
        clearInterval(kiem);
        res(m[0]);
      } else if (p.exitCode !== null || p.killed || Date.now() - t0 > CHO_LINK_MS) {
        clearInterval(kiem);
        res(null);
      }
    }, 200);
  });
  if (!url) {
    const ly = lyDoTiengViet(khoa, boMauChu(l.err || l.out));
    huyDangNhapLink(khoa);
    return { ok: false, message: `Claude CLI không đưa ra link đăng nhập${ly ? ` — ${ly}` : ""}. Thử lại sau ít phút.` };
  }
  return { ok: true, url };
}

/** Bước ③: chuyển mã người dùng dán cho CLI đang chờ, đợi CLI xác nhận. Thành công = CLI thoát 0 và đã có file đăng nhập. */
export async function guiMaDangNhap(khoa: string, ma: string): Promise<{ ok: boolean; message: string }> {
  const l = dsCho().get(khoa);
  if (!l || l.p.exitCode !== null) {
    huyDangNhapLink(khoa);
    return { ok: false, message: "Lượt đăng nhập này đã hết hạn — bấm Đăng nhập Claude để lấy link mới." };
  }
  try {
    l.p.stdin?.write(ma + "\n");
  } catch {
    huyDangNhapLink(khoa);
    return { ok: false, message: "Không chuyển được mã cho Claude CLI — bấm Đăng nhập Claude để thử lại." };
  }
  const code = await Promise.race([l.thoat, new Promise<"het">((r) => setTimeout(() => r("het"), CHO_XAC_NHAN_MS))]);
  dsCho().delete(khoa);
  clearTimeout(l.hen);
  if (code === "het") {
    try {
      l.p.kill();
    } catch {
      /* đã thoát */
    }
    return { ok: false, message: "Claude chưa xác nhận mã sau 60 giây — bấm Đăng nhập Claude để thử lại." };
  }
  if (code === 0 && fs.existsSync(path.join(l.thuMuc, ".credentials.json"))) return { ok: true, message: "Đã đăng nhập." };
  const goc = boMauChu(`${l.err}\n${l.out}`);
  if (/status code 400|invalid_grant|invalid.*code/i.test(goc)) {
    return { ok: false, message: "Mã không đúng hoặc đã quá hạn (mỗi mã chỉ dùng được một lần, trong vài phút). Bấm Đăng nhập Claude để lấy link mới rồi dán mã mới." };
  }
  const dong = goc.split(/\r?\n/).map((x) => x.trim()).filter((x) => x && !/^https?:|Paste code|Opening browser|If the browser/i.test(x));
  const ly = lyDoTiengViet(khoa, dong.join(" "));
  return { ok: false, message: `Đăng nhập không thành công${ly ? ` — ${ly}` : ""}. Bấm Đăng nhập Claude để thử lại.` };
}
