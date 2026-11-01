// ============================================================
// CÀI ĐẶT / ĐĂNG NHẬP CLAUDE CLI BẰNG 1 NÚT BẤM
//
// 3 việc:
//   1. startInstall()     — chạy NGẦM `npm install -g @anthropic-ai/claude-code`,
//                           trả về NGAY, log ghi vào state + file để UI poll.
//   2. openLoginWindow()  — mở CỬA SỔ DÒNG LỆNH THẬT để người dùng tự đăng nhập
//                           (cần thao tác trình duyệt + dán mã → không chạy ngầm được).
//   3. logoutCli()        — CHỈ xóa file credentials cục bộ (không thu hồi OAuth).
//
// BẢO MẬT — CHỐNG COMMAND INJECTION:
//   Lệnh cài là HẰNG SỐ khai báo cứng trong file này (INSTALL_CMD / INSTALL_ARGS).
//   TUYỆT ĐỐI KHÔNG nhận bất kỳ tham số nào từ body/query của người dùng để ghép
//   vào dòng lệnh. Các hàm export ở đây KHÔNG có tham số đầu vào — đó là chủ ý
//   thiết kế, đừng thêm tham số khi bảo trì.
//
// CHỈ chạy phía server (node:child_process, node:fs) — không import vào Client Component.
// SCI công việc: lấy nguyên từ agent tiến độ, chỉ đổi thư mục log (duong-dan.ts) và tên cửa sổ.
// ============================================================

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkCliStatus, envConCli, findClaudeBinary, resetClaudeBinaryCache } from "@/lib/ai/providers";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";

// ===== Hằng số =====

/** Lệnh cài — HẰNG SỐ, không bao giờ ghép chuỗi từ input người dùng */
const INSTALL_CMD = process.platform === "win32" ? "npm.cmd" : "npm";
const INSTALL_ARGS: readonly string[] = ["install", "-g", "@anthropic-ai/claude-code"];

/** Timeout 10 phút — mạng chậm vẫn kịp tải gói */
const INSTALL_TIMEOUT_MS = 600000;

/** Giữ tối đa 200 dòng log gần nhất trong RAM */
const LOG_CAP = 200;
/** Trả tối đa 60 dòng cuối cho UI */
const LOG_UI_LINES = 60;

const LOG_DIR = thuMucDuLieu();
const LOG_FILE = path.join(LOG_DIR, "ai-cli-install.log");

/** Mã màu ANSI của npm — lọc bỏ cho log dễ đọc trên UI */
const ESC = String.fromCharCode(27);
const ANSI_RE = new RegExp(ESC + "\\[[0-9;]*[A-Za-z]", "g");

const noop = (): void => {};

// ===== State module-level =====

export interface InstallState {
  running: boolean;
  done: boolean;
  /** null = chưa chạy xong lần nào */
  ok: boolean | null;
  startedAt: string | null;
  finishedAt: string | null;
  log: string[];
}

const state: InstallState = {
  running: false,
  done: false,
  ok: null,
  startedAt: null,
  finishedAt: null,
  log: [],
};

/**
 * Che bí mật trước khi ghi log. npm/registry đôi khi in ra _authToken, header
 * Authorization hoặc URL kèm mật khẩu; log này còn được trả về UI qua
 * GET /api/ai/install-cli nên không được để lọt.
 */
function redactSecrets(s: string): string {
  return s
    .replace(
      /((?:_auth(?:Token)?|authorization|api[-_]?key|token|secret|password|passwd)\s*[:=]\s*)\S+/gi,
      "$1***"
    )
    .replace(/\b(sk|xoxb|ghp|gho|npm)[-_][A-Za-z0-9_-]{8,}/g, "$1-***")
    .replace(/(:\/\/[^/\s:@]+):[^/\s@]+@/g, "$1:***@"); // https://user:pass@host
}

/** Thêm 1 dòng vào log RAM (cap) + append ra file (best-effort, lỗi thì bỏ qua) */
function pushLog(line: string): void {
  const clean = redactSecrets(line.replace(ANSI_RE, "")).trimEnd();
  if (clean === "") return;
  state.log.push(clean);
  if (state.log.length > LOG_CAP) {
    state.log = state.log.slice(state.log.length - LOG_CAP);
  }
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${clean}\n`, "utf8");
  } catch {
    // không ghi được file log → vẫn giữ log trong RAM, không làm hỏng luồng cài
  }
}

/** Tách chunk stdout/stderr theo xuống dòng, bỏ dòng rỗng → đẩy vào log */
function pushChunk(chunk: string): void {
  const lines = chunk.split("\n");
  for (let i = 0; i < lines.length; i++) {
    pushLog(lines[i]!);
  }
}

/** env con: như tiến trình CLI (xóa NODE_OPTIONS, ELECTRON_/VSCODE_, dấu vết phiên Claude Code ngoài) */
function childEnv(): NodeJS.ProcessEnv {
  return envConCli();
}

/** Máy chủ đã có Claude CLI chưa (dò lại, bỏ cache) — nút "Cài" thì báo "đã có sẵn". */
export function daCoCli(): boolean {
  resetClaudeBinaryCache();
  return findClaudeBinary() !== null;
}

/** Chốt state khi tiến trình cài kết thúc bất thường (không qua checkCliStatus) */
function markFailed(): void {
  state.running = false;
  state.done = true;
  state.ok = false;
  state.finishedAt = new Date().toISOString();
}

// ===== 1. Cài đặt tự động =====

/** Kết thúc tiến trình cài: xác nhận lại bằng checkCliStatus rồi chốt state */
async function finishInstall(code: number | null): Promise<void> {
  // Cache dò binary phải xóa — CLI vừa cài xong nằm ở đường dẫn mới
  resetClaudeBinaryCache();
  let installed = false;
  let version: string | undefined;
  try {
    const status = await checkCliStatus();
    installed = status.installed;
    version = status.version;
  } catch {
    installed = false;
  }

  state.ok = code === 0 && installed;
  state.running = false;
  state.done = true;
  state.finishedAt = new Date().toISOString();

  if (state.ok) {
    pushLog(`✓ Đã cài Claude CLI phiên bản ${version ?? "(không đọc được)"}`);
  } else {
    pushLog(`✗ Cài thất bại (mã thoát ${code ?? "?"}) — xem log`);
  }
}

/**
 * Khởi động cài đặt NỀN. Trả về NGAY, không chờ tiến trình con chạy xong.
 * KHÔNG nhận tham số — lệnh cài là hằng số (chống command injection).
 */
export function startInstall(): { started: boolean; message?: string } {
  if (state.running) {
    return { started: false, message: "Đang cài, vui lòng đợi…" };
  }

  // Reset state cho lượt cài mới
  state.running = true;
  state.done = false;
  state.ok = null;
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.log = [];

  pushLog(`Bắt đầu cài: ${INSTALL_CMD} ${INSTALL_ARGS.join(" ")}`);

  let child: ReturnType<typeof spawn>;
  try {
    child = spawn(INSTALL_CMD, INSTALL_ARGS.slice(), {
      // npm trên Windows là npm.cmd → bắt buộc shell:true
      shell: true,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: childEnv(),
    });
  } catch (e) {
    pushLog(`Không khởi chạy được npm: ${e instanceof Error ? e.message : String(e)}`);
    markFailed();
    return { started: false, message: "Không khởi chạy được npm trên máy chủ." };
  }

  let settled = false;

  const timer = setTimeout(() => {
    if (settled) return;
    pushLog("Quá thời gian (10 phút) — đã dừng tiến trình cài.");
    try {
      child.kill("SIGTERM");
    } catch {
      // tiến trình đã thoát
    }
  }, INSTALL_TIMEOUT_MS);

  // Chống EPIPE crash khi tiến trình con thoát sớm
  child.stdout?.on("error", noop);
  child.stderr?.on("error", noop);
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => pushChunk(chunk));
  child.stderr?.on("data", (chunk: string) => pushChunk(chunk));

  child.on("error", (err: Error) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    pushLog(`Lỗi tiến trình cài: ${err.message}`);
    markFailed();
  });

  child.on("close", (code: number | null) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    // finishInstall là async — chạy nền, nuốt lỗi để không tạo unhandled rejection
    void finishInstall(code).catch((e: unknown) => {
      pushLog(`Lỗi khi xác nhận cài đặt: ${e instanceof Error ? e.message : String(e)}`);
      markFailed();
    });
  });

  return { started: true };
}

/** Trạng thái cài đặt hiện tại (log rút gọn còn 60 dòng cuối cho UI) */
export function getInstallState(): InstallState {
  return {
    running: state.running,
    done: state.done,
    ok: state.ok,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    log:
      state.log.length > LOG_UI_LINES
        ? state.log.slice(state.log.length - LOG_UI_LINES)
        : state.log.slice(),
  };
}

// ===== 2. Đăng nhập (mở cửa sổ dòng lệnh thật) =====

/** Nội dung file .cmd mở cửa sổ đăng nhập — cliPath do findClaudeBinary trả về */
export function loginBatContent(cliPath: string, thuMucDangNhap?: string, soTk?: number): string {
  // Giống HptStart: khung tiêu đề, nói trước sẽ chạy lệnh gì; trình duyệt mở để xác nhận,
  // không tự mở được thì CLI in đường link + ô dán mã ngay trong cửa sổ này.
  return [
    "@echo off",
    "chcp 65001 >nul",
    `title SCI cong viec - Dang nhap Claude${soTk ? ` - tai khoan ${soTk}` : ""}`,
    "echo ============================================================",
    "echo   SCI cong viec - Dang nhap tai khoan Claude (Pro/Max)",
    "echo ============================================================",
    "echo.",
    ...(thuMucDangNhap
      ? [`echo TAI KHOAN ${soTk ?? ""} - thu muc dang nhap rieng: ${thuMucDangNhap}`, "echo Dang nhap DUNG tai khoan Claude danh cho tai khoan nay.", `set "CLAUDE_CONFIG_DIR=${thuMucDangNhap}"`]
      : []),
    "echo Sap chay: claude auth login --claudeai",
    "echo Trinh duyet se mo de xac nhan tai khoan claude.ai (bam Authorize).",
    "echo Trinh duyet khong tu mo: mo duong link ben duoi, dang nhap, roi dan MA vao day.",
    "echo.",
    `"${cliPath}" auth login --claudeai`,
    "echo.",
    'echo === Dang nhap xong thi DONG cua so nay - SCI cong viec tu nhan (hoac bam "Lam moi"). ===',
    "pause",
    "",
  ].join("\r\n");
}

/**
 * Mở cửa sổ dòng lệnh để người dùng tự đăng nhập Claude Pro/Max.
 * KHÔNG chạy ngầm được vì cần thao tác trình duyệt + dán mã ủy quyền.
 */
export function openLoginWindow(thuMucDangNhap?: string, soTk?: number): { ok: boolean; message: string } {
  // Đường dẫn CLI lấy từ hệ thống (findClaudeBinary), KHÔNG từ input người dùng
  resetClaudeBinaryCache();
  const cliPath = findClaudeBinary();
  if (!cliPath) {
    return {
      ok: false,
      message: "Máy chủ chưa có Claude CLI — bấm “Cài Claude ngay” trước.",
    };
  }

  if (process.platform !== "win32") {
    return {
      ok: false,
      message: "Hệ điều hành này cần tự chạy lệnh: claude auth login",
    };
  }

  try {
    const batPath = path.join(os.tmpdir(), `docflow-claude-login-${Date.now()}.cmd`);
    fs.writeFileSync(batPath, loginBatContent(cliPath, thuMucDangNhap, soTk), "utf8");

    // `start "<title>" /MAX <bat>` — cửa sổ mới, độc lập với tiến trình Next.js
    const child = spawn(
      "cmd.exe",
      ["/c", "start", "SCI cong viec - Dang nhap Claude", "/MAX", batPath],
      { detached: true, windowsHide: false, shell: false, stdio: "ignore", env: envConCli() }
    );
    child.on("error", noop);
    child.unref();

    return {
      ok: true,
      message: "Đã mở cửa sổ đăng nhập trên máy chủ. Xong thì đóng lại, SCI công việc tự nhận.",
    };
  } catch (e) {
    return {
      ok: false,
      message: `Không mở được cửa sổ đăng nhập: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ===== 3. Đăng xuất (chỉ xóa credentials cục bộ) =====

/**
 * Đăng xuất = XÓA file credentials cục bộ.
 * CỐ Ý KHÔNG gọi `claude logout` — lệnh đó thu hồi OAuth ở phạm vi toàn cục,
 * ảnh hưởng cả các máy/ứng dụng khác của người dùng.
 */
export function logoutCli(thuMucDangNhap?: string): { ok: boolean; message: string } {
  try {
    const configDir = thuMucDangNhap || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
    const credFile = path.join(configDir, ".credentials.json");
    if (!fs.existsSync(credFile)) {
      return { ok: true, message: "Chưa đăng nhập." };
    }
    fs.unlinkSync(credFile);
    resetClaudeBinaryCache();
    return { ok: true, message: "Đã đăng xuất Claude CLI trên máy chủ này." };
  } catch (e) {
    return {
      ok: false,
      message: `Không xóa được thông tin đăng nhập: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
