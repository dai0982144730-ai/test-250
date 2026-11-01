// ============================================================
// TẦNG KẾT NỐI AI — 2 loại kết nối:
//   1. "claude-cli": gọi Claude Code CLI cài trên máy chủ (gói Pro/Max,
//      không tốn API key) — spawn tiến trình con, prompt gửi qua STDIN.
//   2. "api": gọi HTTP API của provider (anthropic | openai | gemini | grok |
//      deepseek | custom). Trừ anthropic, tất cả dùng chuẩn OpenAI
//      chat/completions (Gemini dùng shim OpenAI-compatible của Google).
//
// CHỈ chạy phía server (node:child_process, node:fs) — không import vào
// Client Component. Cấu hình đọc qua getSetting (data/settings.json → env).
// ============================================================

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSetting } from "@/lib/appconfig";
import { fmtNum } from "@/lib/format";
// Quản lý token AI (Mr. Đại chốt 04/10/2026 — Đợt 2 nhân bản từ agent Công việc): hai tài khoản Claude công ty + tài khoản cá
// nhân dự phòng, mỗi tài khoản một hàng chờ; mỗi lượt AI ghi một dòng sổ dùng AI (người · tính năng · token · tài khoản).
import { dichLoiCli, tenGoiClaude } from "@/lib/ai/loi-cli";
import { chayUuTien, laUuTien } from "@/lib/ai/uu-tien";
import { ghiLuotAi, metaLuotHienTai, type MetaLuot } from "@/lib/ai/so-dung-ai";
import { giaiGioMoLai, type KetQuaLuot, type TaiKhoanLuot } from "@/lib/ai/thong-ke-ai";
import {
  batMoiPhien,
  boDauHongCaNhan,
  caNhanDungDuoc,
  chonTaiKhoan,
  coDangNhapCaNhan,
  conTaiKhoanCongTy,
  danhDauHet,
  danhDauHetCaNhan,
  danhDauHongCaNhan,
  danhDauHongDangNhap,
  dangMatDangNhap,
  demLuot,
  gioMoLaiCongTy,
  gioVN,
  laLoiDangNhap,
  laLoiHetLuot,
  thuMucCaNhan,
  thuMucChay,
  trangThai,
  trangThaiCaNhan,
  type SoTk,
  type TrangThaiTk,
} from "@/lib/ai/tai-khoan-claude";

// ===== Cấu hình =====

export type AIMode = "claude-cli" | "api" | "off";

export type AIProvider =
  | "anthropic"
  | "openai"
  | "gemini"
  | "grok"
  | "deepseek"
  | "custom";

export interface AIConfig {
  mode: AIMode;
  provider: AIProvider;
  apiKey: string;
  /** Model người dùng nhập — rỗng → dùng mặc định theo provider */
  model: string;
  /** Base URL — chỉ dùng khi provider = "custom" */
  baseUrl: string;
}

const PROVIDERS: AIProvider[] = [
  "anthropic",
  "openai",
  "gemini",
  "grok",
  "deepseek",
  "custom",
];

/** Base URL + model mặc định của các provider chuẩn OpenAI-compatible */
const OPENAI_COMPAT: Record<string, { baseUrl: string; defaultModel: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", defaultModel: "gpt-5" },
  gemini: {
    // Google có shim OpenAI-compatible — dùng luôn cho đồng nhất
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
  },
  grok: { baseUrl: "https://api.x.ai/v1", defaultModel: "grok-4" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat" },
};

const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-5";

/** Đọc cấu hình AI hiệu lực (settings.json → fallback env). Giá trị lạ → an toàn. */
export function getAIConfig(): AIConfig {
  const modeRaw = getSetting("aiMode", "AI_MODE");
  const mode: AIMode = modeRaw === "claude-cli" || modeRaw === "api" ? modeRaw : "off";
  const providerRaw = getSetting("aiProvider", "AI_PROVIDER") ?? "";
  const provider: AIProvider = (PROVIDERS as readonly string[]).includes(providerRaw)
    ? (providerRaw as AIProvider)
    : "anthropic";
  return {
    mode,
    provider,
    apiKey: getSetting("aiApiKey", "AI_API_KEY") ?? "",
    model: getSetting("aiModel", "AI_MODEL") ?? "",
    baseUrl: (getSetting("aiBaseUrl", "AI_BASE_URL") ?? "").replace(/\/+$/, ""),
  };
}

/** Model hiệu lực sau khi áp mặc định theo provider ("" nếu custom chưa nhập) */
export function effectiveModel(cfg: AIConfig): string {
  if (cfg.model) return cfg.model;
  if (cfg.provider === "anthropic") return ANTHROPIC_DEFAULT_MODEL;
  const compat = OPENAI_COMPAT[cfg.provider];
  return compat ? compat.defaultModel : ""; // custom → bắt buộc nhập model
}

/** Mask API key kiểu "••••" + 4 ký tự cuối; rỗng → "" */
export function maskApiKey(key: string): string {
  const clean = key.replace(/\s+/g, "");
  if (clean === "") return "";
  if (clean.length <= 4) return "••••";
  return `••••${clean.slice(-4)}`;
}

/**
 * Đã đủ cấu hình để chạy AI chưa? (kiểm tra tĩnh — trạng thái CLI thật sự
 * kiểm ở checkCliStatus khi chạy)
 */
export function isAIConfigured(cfg: AIConfig): boolean {
  if (cfg.mode === "off") return false;
  if (cfg.mode === "claude-cli") return true;
  // mode = "api"
  if (cfg.apiKey === "") return false;
  if (cfg.provider === "custom" && (cfg.baseUrl === "" || cfg.model === "")) return false;
  return true;
}

// ===== LOẠI 1: Claude CLI =====

const CLAUDE_NAMES = ["claude.exe", "claude.cmd", "claude.bat", "claude"];

// Cache module-level kết quả dò binary. undefined = chưa dò; null = không thấy.
let cachedClaudePath: string | null | undefined;

/** Xóa cache dò binary — gọi trước mỗi lần status-check để nhận cài đặt mới */
export function resetClaudeBinaryCache(): void {
  cachedClaudePath = undefined;
}

function firstExisting(candidates: string[]): string | null {
  for (let i = 0; i < candidates.length; i++) {
    try {
      if (fs.existsSync(candidates[i]!)) return candidates[i]!;
    } catch {
      // bỏ qua đường dẫn lỗi
    }
  }
  return null;
}

function detectClaudeBinary(): string | null {
  // 1. Biến môi trường chỉ định full path
  const envPath = process.env.ANTHROPIC_SUB_CLI_PATH?.trim();
  if (envPath && fs.existsSync(envPath)) return envPath;

  // 1b. ƯU TIÊN FILE .exe THẬT trong gói npm (bỏ qua claude.cmd trong PATH).
  //     LÝ DO QUAN TRỌNG: .cmd bắt buộc chạy qua cmd.exe (shell:true), mà
  //     cmd.exe KHÔNG truyền được tham số NHIỀU DÒNG — system prompt của trợ lý
  //     (dài, nhiều dòng) bị cắt cụt ⇒ mô hình mất hết quy tắc + danh sách công
  //     cụ và trả lời như trợ lý lập trình. Gọi thẳng .exe (shell:false) là hết.
  const exeCandidates: string[] = [];
  const npmRoots: string[] = [];
  if (process.env.APPDATA) npmRoots.push(path.join(process.env.APPDATA, "npm"));
  if (process.env.LOCALAPPDATA) {
    npmRoots.push(path.join(process.env.LOCALAPPDATA, "npm"));
  }
  npmRoots.push(path.join(os.homedir(), ".npm-global"));
  npmRoots.forEach((root) => {
    exeCandidates.push(
      path.join(root, "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe")
    );
  });
  const direct = firstExisting(exeCandidates);
  if (direct) return direct;

  // 2. Quét từng thư mục trong PATH với các tên khả dĩ
  const pathDirs = (process.env.PATH ?? "").split(path.delimiter);
  for (let i = 0; i < pathDirs.length; i++) {
    const dir = pathDirs[i]!.trim();
    if (dir === "") continue;
    for (let j = 0; j < CLAUDE_NAMES.length; j++) {
      const p = path.join(dir, CLAUDE_NAMES[j]!);
      try {
        if (fs.existsSync(p)) return p;
      } catch {
        // thư mục PATH hỏng — bỏ qua
      }
    }
  }

  // 3. Các vị trí cài đặt quen thuộc trên Windows
  const extra: string[] = [];
  const appData = process.env.APPDATA;
  if (appData) {
    extra.push(path.join(appData, "npm", "claude.cmd"));
    extra.push(path.join(appData, "npm", "claude.exe"));
  }
  const localBin = path.join(os.homedir(), ".local", "bin");
  for (let j = 0; j < CLAUDE_NAMES.length; j++) {
    extra.push(path.join(localBin, CLAUDE_NAMES[j]!));
  }
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const programDir = path.join(localAppData, "Programs", "claude");
    for (let j = 0; j < CLAUDE_NAMES.length; j++) {
      extra.push(path.join(programDir, CLAUDE_NAMES[j]!));
    }
  }
  return firstExisting(extra);
}

/** Dò đường dẫn Claude CLI (cache module-level) — null nếu chưa cài */
export function findClaudeBinary(): string | null {
  if (cachedClaudePath !== undefined) return cachedClaudePath;
  cachedClaudePath = detectClaudeBinary();
  return cachedClaudePath;
}

/** .cmd/.bat phải chạy qua shell (cmd.exe) — và bọc path trong dấu nháy kép */
export function needsShell(binPath: string): boolean {
  return /\.(cmd|bat)$/i.test(binPath);
}

/** Strip ký tự điều khiển/\x00 khỏi arg (giữ \t \n \r cho system prompt) */
function sanitizeArg(v: string): string {
  return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/**
 * Chặn cmd.exe bung biến môi trường (%AI_API_KEY%, %USERPROFILE%…): nội dung
 * arg có thể chứa tên dự án / model do người dùng nhập, nếu để nguyên %TÊN%
 * thì cmd thay bằng GIÁ TRỊ THẬT → rò rỉ bí mật vào prompt gửi cho mô hình.
 * Bỏ cặp % quanh tên biến (giữ nguyên "46%" vì không thành cặp). Lặp tới khi
 * ổn định để chống né kiểu "%%KEY%%".
 */
function stripEnvExpansion(v: string): string {
  let out = v;
  for (let i = 0; i < 5; i++) {
    const next = out.replace(/%([A-Za-z_][A-Za-z0-9_]*)%/g, "$1");
    if (next === out) return out;
    out = next;
  }
  return out.replace(/%/g, ""); // hiếm gặp: vẫn còn cặp % lồng nhau → bỏ hẳn
}

/**
 * Quote arg khi chạy qua shell cmd.exe.
 * BẢO MẬT: KHÔNG dùng \" để thoát dấu nháy — cmd.exe không hiểu backslash, nó
 * coi dấu " là ĐÓNG chuỗi nên payload kiểu:  Dự án A" & del /q *.* & rem "
 * sẽ THOÁT RA và chạy lệnh tùy ý trên máy chủ (đã kiểm chứng bằng thực nghiệm).
 * Cách đúng với cmd.exe: luôn bọc trong "…" và NHÂN ĐÔI mọi dấu " bên trong —
 * mọi ký tự & | > < ^ ( ) ! nằm trong ngoặc đều thành text thường.
 */
export function quoteForShell(v: string): string {
  const safe = stripEnvExpansion(v);
  if (safe === "") return '""';
  return `"${safe.replace(/"/g, '""')}"`;
}

const noop = (): void => {};

/**
 * ⛔ BÀI HỌC (ghi lại từ SCIDrive, đo lại 06/09): nếu app được KHỞI ĐỘNG TỪ một phiên Claude Code khác (dev, hỗ trợ từ xa), biến
 * phiên đó lây sang đây. CLI con tưởng nó đang chạy LỒNG trong một phiên Claude Code, xác thực sai kiểu, rồi báo "not logged in"
 * DÙ máy đã đăng nhập gói Pro/Max. Xoá sạch dấu vết phiên ngoài để CLI đọc đúng hồ sơ đăng nhập.
 */
const BIEN_PHIEN_NGOAI = [
  "CLAUDECODE",
  "CLAUDE_CODE_ENTRYPOINT",
  "CLAUDE_CODE_SSE_PORT",
  "CLAUDE_CODE_SESSION_ID",
  "CLAUDE_CODE_CHILD_SESSION",
  "CLAUDE_CODE_SESSION_ATTENDED",
  "CLAUDE_CODE_MESSAGING_SOCKET",
  "CLAUDE_CODE_MESSAGING_TOKEN",
  "CLAUDE_CODE_EXECPATH",
  "CLAUDE_PID",
  "CLAUDE_AGENT_SDK_VERSION",
  // ⛔ 27/10 (QS-095): thư mục tài khoản phải do CHỖ GỌI quyết (opts.envThem, đặt sau khi dọn). App được
  // bật từ một phiên Claude Code đang chạy bằng tk1 thì biến này lây sang, và MỌI lượt CLI chạy nhầm tk1
  // — kể cả lượt đáng lẽ dùng tài khoản mặc định của máy. Dọn đi, không ai đọc nhờ nữa.
  "CLAUDE_CONFIG_DIR",
];

/** env cho tiến trình Claude CLI: xoá NODE_OPTIONS, ELECTRON_/VSCODE_ và dấu vết phiên Claude Code ngoài (dang-nhap-link.ts dùng chung) */
export function envConCli(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NODE_OPTIONS;
  Object.keys(env).forEach((k) => {
    if (k.indexOf("ELECTRON_") === 0 || k.indexOf("VSCODE_") === 0) delete env[k];
  });
  for (const k of BIEN_PHIEN_NGOAI) delete env[k];
  return env;
}

interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

/**
 * THƯ MỤC CÁCH LY cho tiến trình CLI.
 * Claude Code vốn là công cụ LẬP TRÌNH: nếu chạy với cwd = thư mục mã nguồn của
 * chính ứng dụng thì về lý thuyết nó "nhìn thấy" code. Ta đã chặn toàn bộ công
 * cụ bằng --disallowed-tools, nhưng thêm một lớp nữa cho chắc: luôn chạy trong
 * MỘT THƯ MỤC TRỐNG ở %TEMP% — không có gì để đọc, không có gì để sửa.
 * (Trợ lý chỉ tác động dữ liệu qua 10 công cụ do server thực thi, xem chat-tools.ts)
 */
function aiSandboxDir(): string {
  const dir = path.join(os.tmpdir(), "qldasci-ai-sandbox");
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch {
    return os.tmpdir();
  }
}

/**
 * Spawn Claude CLI với timeout. Prompt (nếu có) gửi qua STDIN — write xong
 * end() NGAY (không đóng → CLI chờ 3s rồi exit 1). Gắn on("error") cho các
 * stream để chống EPIPE crash. env con xóa NODE_OPTIONS + mọi key ELECTRON_/VSCODE_.
 * cwd = thư mục cách ly (xem aiSandboxDir).
 */
function spawnClaude(
  binPath: string,
  args: string[],
  opts: { timeoutMs: number; stdinData?: string; cwd?: string; envThem?: Record<string, string> },
): Promise<SpawnResult> {
  // Test (vitest.config.ts đặt CAM_CLI_THAT=1) KHÔNG BAO GIỜ được gọi Claude CLI thật — bài học agent Công việc 04/10: giả lập
  // thiếu một hàm làm 6 bài test gọi thật (~115 nghìn token). Test cần CLI thì trỏ ANTHROPIC_SUB_CLI_PATH tới tệp giả + giả spawn.
  if (process.env.CAM_CLI_THAT === "1" && binPath !== process.env.ANTHROPIC_SUB_CLI_PATH?.trim()) {
    return Promise.reject(new Error("Đang chạy test: cấm gọi Claude CLI thật — giả runAI, hoặc trỏ ANTHROPIC_SUB_CLI_PATH tới CLI giả."));
  }
  return new Promise<SpawnResult>((resolve, reject) => {
    const shell = needsShell(binPath);
    const cleanArgs = args.map(sanitizeArg);
    const finalArgs = shell ? cleanArgs.map(quoteForShell) : cleanArgs;
    // Đường dẫn CLI cũng phải quote đúng luật cmd.exe (thư mục có dấu cách/&)
    const command = shell ? quoteForShell(binPath) : binPath;

    const env = envConCli();
    // Biến riêng của một lượt (vd MAX_THINKING_TOKENS của trợ lý chat) — đặt SAU khi dọn
    Object.assign(env, opts.envThem ?? {});

    let settled = false;
    let stdout = "";
    let stderr = "";

    const child = spawn(command, finalArgs, {
      shell,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      env,
      // Skill: sandbox NGƯỜI DÙNG (chứa .claude/skills/ để CLI tự dò) thay
      // sandbox mặc định — vẫn không bao giờ là thư mục mã nguồn ứng dụng
      cwd: opts.cwd ?? aiSandboxDir(),
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        child.kill("SIGTERM");
      } catch {
        // đã thoát
      }
      reject(
        new Error(
          `Claude CLI không phản hồi sau ${Math.round(opts.timeoutMs / 1000)} giây — đã dừng tiến trình.`,
        ),
      );
    }, opts.timeoutMs);

    // Chống EPIPE crash khi CLI thoát sớm
    child.stdin?.on("error", noop);
    child.stdout?.on("error", noop);
    child.stderr?.on("error", noop);

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Không chạy được Claude CLI: ${err.message}`));
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    // Prompt qua STDIN — end() NGAY sau write
    try {
      if (opts.stdinData !== undefined) {
        child.stdin?.write(opts.stdinData.replace(/\x00/g, ""));
      }
      child.stdin?.end();
    } catch {
      // stdin đã đóng — bỏ qua (on("error") đã nuốt EPIPE)
    }
  });
}

export interface CliStatus {
  installed: boolean;
  loggedIn: boolean;
  version?: string;
  /** "max" | "pro" ... (subscriptionType từ `claude auth status --json`) */
  plan?: string;
  /** Tên gói để hiện: "Claude Max", "Claude Pro"… */
  tenGoi?: string;
  /** Email tài khoản Claude đang đăng nhập (route chỉ trả cho người sửa được cài đặt / chính chủ) */
  email?: string;
  authMethod?: string;
}

/**
 * Kiểm tra Claude CLI: đã cài chưa (--version) + đã đăng nhập chưa (auth status). `thuMucDangNhap` = thư mục của một tài khoản
 * (tai-khoan-claude.ts); bỏ trống = tài khoản mặc định của máy chủ.
 */
export async function checkCliStatus(thuMucDangNhap?: string): Promise<CliStatus> {
  const envThem = thuMucDangNhap ? { CLAUDE_CONFIG_DIR: thuMucDangNhap } : undefined;
  const bin = findClaudeBinary();
  if (!bin) return { installed: false, loggedIn: false };

  // (1) claude --version — timeout 8s
  let version: string | undefined;
  try {
    const res = await spawnClaude(bin, ["--version"], { timeoutMs: 8000, envThem });
    if (res.code !== 0) return { installed: false, loggedIn: false };
    version = res.stdout.trim().split(/\r?\n/)[0] || undefined;
  } catch {
    return { installed: false, loggedIn: false };
  }

  // (2) claude auth status --json — timeout 15s; stdout có thể lẫn text nhiễu
  //     → vớt JSON bằng match(/\{[\s\S]*\}/)
  try {
    const res = await spawnClaude(bin, ["auth", "status", "--json"], {
      timeoutMs: 15000,
      envThem,
    });
    if (res.code !== 0) return { installed: true, loggedIn: false, version };
    const m = res.stdout.match(/\{[\s\S]*\}/);
    if (!m) return { installed: true, loggedIn: false, version };
    const parsed = JSON.parse(m[0]) as Record<string, unknown>;
    const loggedIn = parsed.loggedIn === true;
    const plan = typeof parsed.subscriptionType === "string" && parsed.subscriptionType !== "" ? parsed.subscriptionType : undefined;
    const authMethod = typeof parsed.authMethod === "string" ? parsed.authMethod : undefined;
    const email = typeof parsed.email === "string" && parsed.email !== "" ? parsed.email : undefined;
    const tenGoi = loggedIn ? tenGoiClaude(plan, authMethod) : undefined;
    return {
      installed: true,
      loggedIn,
      version,
      plan,
      authMethod,
      ...(tenGoi ? { tenGoi } : {}),
      ...(loggedIn && email ? { email } : {}),
    };
  } catch {
    return { installed: true, loggedIn: false, version };
  }
}

// Hàng chờ: MỖI TÀI KHOẢN Claude một hàng (lib/ai/tai-khoan-claude.ts) — 2 lời gọi cùng một tài khoản không chạy song song
// (đụng .config.lock của thư mục đăng nhập); hai tài khoản thì chạy song song được.
/**
 * Số lời gọi chờ/chạy tối đa MỖI tài khoản. Mỗi lượt CLI có thể mất tới 420s, nếu 10 người
 * cùng bấm thì người cuối chờ > 1 giờ (và giữ 10 request Node treo) → chặn sớm.
 */
const CLI_MAX_PENDING = 4;

/** stdout mở đầu bằng câu chào (không phải JSON) → CLI khởi động "nhầm mood" */
const GREETING_RE = /^\s*(I'?m ready|Welcome to Claude|Hi[!,.\s])/i;

/**
 * Chặn toàn bộ công cụ: tác vụ của ta chỉ là sinh JSON từ dữ liệu đã nhét sẵn
 * trong prompt, CLI không được đọc/ghi file hay lên mạng.
 * LƯU Ý PHIÊN BẢN: bản CLI cũ dùng `--tools ""`, bản 2.x đổi thành
 * `--disallowed-tools <danh sách>` (truyền chuỗi rỗng sẽ lỗi "argument missing"
 * và tiến trình treo tới hết timeout). Nếu bản tương lai bỏ luôn cờ này →
 * runCliPromptOnce tự chạy lại KHÔNG kèm cờ (xem UNKNOWN_FLAG_RE).
 */
const DISALLOWED_TOOLS = "Bash Edit Write Read WebFetch WebSearch Glob Grep NotebookEdit Task";
/** CLI báo cờ lạ → thử lại không kèm cờ chặn công cụ */
const UNKNOWN_FLAG_RE = /error:\s*(unknown option|option '[^']*' argument missing)/i;

/** System prompt dài hơn ngưỡng này thì không truyền qua dòng lệnh nữa */
const SYSTEM_ARG_MAX = 4096;

/**
 * Tuỳ chọn SKILL cho một lượt gọi (Mr. Đại chốt 03/09: tự chọn + gọi đích danh
 * để ép — theo hành vi đã đo ở bản phaply chạy thật 12/08/2026).
 *   • sandboxCwd: sandbox người dùng chứa `.claude/skills/` — CLI TỰ DÒ skill
 *     và tự chọn theo `description:`.
 *   • choPhepScript: skill có scripts/ được chạy — mở thêm Bash + Write nhưng
 *     CHỈ trong sandbox (đường xuất docx/xlsx/dxf). Mặc định TẮT.
 */
export interface TuyChonSkill {
  sandboxCwd: string;
  choPhepScript?: boolean;
}

/**
 * Tuỳ chọn tốc độ của MỘT lượt gọi (26/09 — Mr. Đại chốt, chỉ trợ lý chat dùng).
 *   • tokenNghi: trần token "nghĩ ngầm" của CLI (biến MAX_THINKING_TOKENS truyền
 *     qua env tiến trình con). 0 = tắt. Đo 26/09 (Sonnet 4.5, cùng câu hỏi):
 *     mặc định 482 token ra / 12,4 s → 0: 36 token / 4,6 s, trả lời cùng số.
 *     Đường API (callAnthropic) vốn không bật thinking → không đổi gì.
 */
export interface TuyChonGoi {
  tokenNghi?: number;
  /** Đo lượt gọi: CLI tự báo token ra + USD (chỉ đường CLI) */
  khiXong?: (d: { tokenRa: number | null; usd: number | null }) => void;
}

function envNghi(tc?: TuyChonGoi): Record<string, string> | undefined {
  if (tc?.tokenNghi === undefined || !Number.isFinite(tc.tokenNghi) || tc.tokenNghi < 0) return undefined;
  return { MAX_THINKING_TOKENS: String(Math.floor(tc.tokenNghi)) };
}

async function runCliPromptOnce(
  prompt: string,
  system?: string,
  withToolFlags = true,
  skill?: TuyChonSkill,
  modelEp?: string,
  tuyChon?: TuyChonGoi,
  /** CLAUDE_CONFIG_DIR của tài khoản chạy lượt này — bỏ trống = tài khoản mặc định của máy chủ */
  thuMucDangNhap?: string
): Promise<string> {
  const bin = findClaudeBinary();
  if (!bin) {
    throw new Error("Chưa tìm thấy Claude CLI trên máy chủ — cài đặt rồi thử lại.");
  }
  const cfg = getAIConfig();
  // --strict-mcp-config: KHÔNG nạp kết nối MCP của tài khoản đang đăng nhập CLI trên máy chủ (đo 01/10 ở agent Công việc: không
  // có cờ thì AI trong app thấy Gmail, Google Drive/Calendar… của người cài máy — chỗ hở dữ liệu cá nhân). App chỉ dùng công cụ
  // của chính nó (chat-tools), không cần MCP nào.
  const args = ["-p", "--output-format", "json", "--strict-mcp-config", ...coTatLuuPhien()];
  if (skill) {
    // ALLOWLIST thay vì danh sách cấm — mở đúng thứ cần, không hơn.
    // Đã đo ở phaply: Read bị hệ thống quyền chặn ra ngoài cwd.
    args.push(
      "--tools",
      skill.choPhepScript ? "Skill,Read,Bash,Write,Edit" : "Skill,Read"
    );
  } else if (withToolFlags) {
    args.push("--disallowed-tools", DISALLOWED_TOOLS);
  }
  // modelEp: lượt gọi đích danh một model (vd J12 nhận định dùng Sonnet 5) —
  // không đụng model chung ở Cài đặt.
  if (modelEp || cfg.model) {
    args.push("--model", modelEp || cfg.model);
  }
  // System prompt: chỉ truyền qua DÒNG LỆNH khi CHẮC CHẮN an toàn —
  //   (a) không quá dài, VÀ
  //   (b) không chứa xuống dòng khi phải chạy qua cmd.exe (.cmd/.bat) — cmd
  //       cắt tham số tại ký tự xuống dòng nên mô hình chỉ nhận được 1 dòng đầu.
  // Không thỏa → ghép vào đầu STDIN (luôn nguyên vẹn), KHÔNG âm thầm bỏ.
  let stdinData = prompt;
  if (system) {
    const multiline = /[\r\n]/.test(system);
    const viaShell = needsShell(bin);
    if (system.length < SYSTEM_ARG_MAX && !(viaShell && multiline)) {
      args.push("--append-system-prompt", system);
    } else {
      stdinData = `=== HƯỚNG DẪN HỆ THỐNG (BẮT BUỘC TUÂN THỦ) ===\n${system}\n\n=== YÊU CẦU ===\n${prompt}`;
    }
  }
  // 420s: đo thực tế trên dự án 360 task, sinh dự báo mất ~230s — để dư biên
  const res = await spawnClaude(bin, args, {
    timeoutMs: 420000,
    stdinData,
    cwd: skill?.sandboxCwd,
    envThem: { ...(envNghi(tuyChon) ?? {}), ...(thuMucDangNhap ? { CLAUDE_CONFIG_DIR: thuMucDangNhap } : {}) },
  });
  if (res.code !== 0) {
    // CLI báo lỗi API bằng JSON ĐẦY ĐỦ trên stdout rồi thoát mã 1 (đo 04/10: lý do "result" nằm CUỐI, sau ~700 ký tự) — cắt 400 ký
    // tự đầu là mất lý do, lỗi hết hạn mức không được nhận ra để chuyển tài khoản.
    const jsonLoi = docJsonLoiCli(res.stdout);
    const detail = (jsonLoi ?? (res.stderr || res.stdout)).trim().slice(0, 400);
    if (withToolFlags && UNKNOWN_FLAG_RE.test(detail)) {
      return runCliPromptOnce(prompt, system, false, skill, modelEp, tuyChon, thuMucDangNhap);
    }
    // Có JSON báo lỗi → trả nguyên cho bên gọi: nhánh is_error ở đó dịch sang tiếng Việt + đọc giờ mở lại hạn mức
    if (jsonLoi !== null) return res.stdout;
    throw new Error(`Claude CLI thoát với mã ${res.code}${detail ? `: ${detail}` : "."}`);
  }
  return res.stdout;
}

/** stdout là JSON kết quả CLI có is_error:true → lý do (trường result); không phải → null */
export function docJsonLoiCli(stdout: string): string | null {
  const m = String(stdout ?? "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>;
    return o?.is_error === true && typeof o.result === "string" ? o.result : null;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chạy 1 prompt qua Claude CLI → trả text kết quả (JSON.parse(stdout).result).
 * - GREETING-RETRY: stdout là câu chào thay vì JSON → chờ 1s thử lại đúng 1 lần.
 * - Hàng chờ MỖI TÀI KHOẢN: không bao giờ 2 tiến trình CLI chạy song song trên cùng một tài khoản.
 */
export function runCliPrompt(
  prompt: string,
  system?: string,
  skill?: TuyChonSkill,
  tuyChon?: TuyChonGoi,
  meta: MetaLuot = metaLuotHienTai()
): Promise<string> {
  return chayCliJson(prompt, system, skill, undefined, tuyChon, meta).then((j) => j.result as string);
}

/** Một lượt CLI cần chạy (đi qua chọn tài khoản → hàng chờ của tài khoản đó) */
interface LuotCli {
  prompt: string;
  system?: string;
  skill?: TuyChonSkill;
  modelEp?: string;
  tuyChon?: TuyChonGoi;
}

/**
 * Cùng đường với runCliPrompt nhưng trả NGUYÊN khối JSON của CLI (có
 * `total_cost_usd`, `usage`, `modelUsage`) — để đo chi phí thật từng lượt.
 */
function chayCliJson(
  prompt: string,
  system?: string,
  skill?: TuyChonSkill,
  modelEp?: string,
  tuyChon?: TuyChonGoi,
  meta: MetaLuot = metaLuotHienTai()
): Promise<Record<string, unknown>> {
  khoiDongMoiPhien();
  return chayTrenTaiKhoan({ prompt, system, skill, modelEp, tuyChon }, meta);
}

/** Bộ hẹn giờ "mồi phiên buổi sáng" (tai-khoan-claude.ts) — bật lười ở lượt AI đầu tiên sau khi máy chủ khởi động */
export function khoiDongMoiPhien(): void {
  batMoiPhien(async (cauHoi) => {
    if (getAIConfig().mode !== "claude-cli") return;
    // Việc nền (không người) → không bao giờ dùng tài khoản cá nhân; model nhẹ, tắt nghĩ dài
    await chayTrenTaiKhoan({ prompt: cauHoi, modelEp: "haiku", tuyChon: { tokenNghi: 0 } }, { tinh_nang: "lib/ai/moi-phien", nguoi: null });
  });
}

/**
 * SỔ DÙNG AI (Quản lý token AI, Mr. Đại chốt 04/10): mỗi lượt một dòng data/ai-so-dung.jsonl — kể cả lượt lỗi / hết hạn mức /
 * đầy hàng chờ. Xem lib/ai/so-dung-ai.ts. Ghi hỏng không làm hỏng lượt AI.
 */
function ghiLuotSo(
  meta: MetaLuot | undefined,
  taiKhoan: TaiKhoanLuot,
  ketQua: KetQuaLuot,
  tVao: number,
  tBat: number,
  usage?: Record<string, unknown>,
  model?: string | null,
): void {
  const n = (k: string) => (typeof usage?.[k] === "number" ? (usage[k] as number) : 0);
  ghiLuotAi({
    luc: new Date(tVao).toISOString(),
    tai_khoan: taiKhoan,
    tinh_nang: meta?.tinh_nang ?? "",
    nguoi: meta?.nguoi ?? null,
    token_vao: n("input_tokens") || n("prompt_tokens"),
    token_cache_doc: n("cache_read_input_tokens"),
    token_cache_ghi: n("cache_creation_input_tokens"),
    token_ra: n("output_tokens") || n("completion_tokens"),
    chay_ms: tBat ? Date.now() - tBat : 0,
    cho_ms: (tBat || Date.now()) - tVao,
    ket_qua: ketQua,
    model: model ?? null,
  });
}

/** Lỗi hết hạn mức mang theo giờ mở lại đọc từ câu GỐC của CLI (câu tiếng Việt sau khi dịch không còn giờ) */
function loiCoGioMoLai(loi: string, goc: unknown): Error {
  const e = new Error(loi) as Error & { hetDen?: number | null };
  if (typeof goc === "string" && laLoiHetLuot(goc)) e.hetDen = giaiGioMoLai(goc, Date.now());
  return e;
}

const CHI_DUONG_CA_NHAN = 'bấm tên mình ở góc trên → "Tài khoản Claude cá nhân" để nối tài khoản Claude của mình';

/** Câu báo khi không còn tài khoản Claude công ty nào (kèm lối đi tiếp nếu là người đang hỏi) */
async function cauHetCongTy(nguoi: string | null): Promise<string> {
  // Mất đăng nhập thì nói đúng lý do — quản trị phải đăng nhập lại, chờ không tự khỏi
  if (dangMatDangNhap(1) || dangMatDangNhap(2)) {
    const tk = ([1, 2] as SoTk[]).filter((so) => dangMatDangNhap(so)).join(" và ");
    const goi = `Tài khoản Claude ${tk} của công ty mất đăng nhập (hết hạn hoặc bị thu hồi) — quản trị cần đăng nhập lại ở Cài đặt → 🔌 Kết nối → thẻ Tài khoản ${tk}`;
    if (nguoi && coDangNhapCaNhan(nguoi)) return `${goi}; tài khoản Claude cá nhân của anh/chị cũng đang không dùng được.`;
    return nguoi ? `${goi}. Muốn làm tiếp ngay: ${CHI_DUONG_CA_NHAN}.` : `${goi}.`;
  }
  const mo = await gioMoLaiCongTy();
  const luc = mo ? ` (dùng lại khoảng ${gioVN(mo)})` : "";
  if (!nguoi) return `Tài khoản Claude của công ty đang hết hạn mức${luc}.`;
  if (coDangNhapCaNhan(nguoi)) {
    const het = trangThaiCaNhan(nguoi).het_den;
    return `Tài khoản Claude của công ty${luc} và tài khoản Claude cá nhân của anh/chị${het > Date.now() ? ` (dùng lại khoảng ${gioVN(het)})` : ""} đều đang hết hạn mức — anh/chị chờ tới giờ đó rồi gửi lại giúp em.`;
  }
  return `Tài khoản Claude của công ty đang hết hạn mức${luc}. Muốn làm tiếp ngay: ${CHI_DUONG_CA_NHAN}.`;
}

/**
 * Hai tài khoản Claude (xem lib/ai/tai-khoan-claude.ts): chọn tài khoản, xếp vào hàng chờ CỦA tài khoản đó.
 * Tài khoản báo hết hạn mức → đánh dấu, chạy lại lượt đó NGAY trên tài khoản kia (nếu dùng được) — người hỏi không phải gửi lại.
 * Hết cả tài khoản công ty → tài khoản cá nhân của CHÍNH người đang hỏi (đã nối, chưa hết); việc nền (meta.nguoi null) không bao
 * giờ dùng tài khoản cá nhân. Không còn gì → câu báo tiếng Việt có giờ mở lại.
 */
async function chayTrenTaiKhoan(l: LuotCli, meta: MetaLuot, daThu: SoTk[] = []): Promise<Record<string, unknown>> {
  const so = await chonTaiKhoan();
  const conCongTy = await conTaiKhoanCongTy();
  // Mốc "hết" chỉ là ĐOÁN 15 phút (CLI không báo giờ mở lại) → thử lại công ty MỘT lần trước khi dùng tài khoản (tiền) của
  // người hỏi — đúng thứ tự TK1 → TK2 → cá nhân
  const chiDoanHet = !conCongTy && !daThu.includes(so) && trangThai(so).het_doan === true;
  const hetCongTy = daThu.includes(so) || (!conCongTy && !chiDoanHet);
  if (hetCongTy && meta.nguoi && caNhanDungDuoc(meta.nguoi)) return chayCaNhan(meta.nguoi, l, meta);
  // Đã thử mà vẫn quay về tài khoản vừa hết → thôi. Chưa thử lần nào thì vẫn gọi tài khoản chính dù đang đánh dấu hết (mốc có
  // thể chỉ là đoán) — CLI báo hết thật thì xuống nhánh dưới.
  if (daThu.includes(so)) throw new Error(await cauHetCongTy(meta.nguoi));
  try {
    return await runCliPromptDich(dichCongTy(so), l, meta);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (laLoiHetLuot(msg)) {
      await danhDauHet(so, msg, (e as { hetDen?: number | null }).hetDen ?? null);
      return chayTrenTaiKhoan(l, meta, [...daThu, so]);
    }
    // Mất đăng nhập (401…) → coi như tài khoản tạm không dùng được, chuyển tài khoản còn lại rồi cá nhân
    if (laLoiDangNhap(msg)) {
      await danhDauHongDangNhap(so, msg);
      // Còn đường khác thì chuyển; hết đường thì giữ câu báo GỐC — nó chỉ đúng chỗ sửa
      if ((await conTaiKhoanCongTy()) || (meta.nguoi && caNhanDungDuoc(meta.nguoi))) {
        return chayTrenTaiKhoan(l, meta, [...daThu, so]);
      }
    }
    throw e;
  }
}

/** Lượt chạy trên tài khoản Claude CÁ NHÂN của người hỏi — hàng chờ riêng của người đó */
async function chayCaNhan(nguoi: string, l: LuotCli, meta: MetaLuot): Promise<Record<string, unknown>> {
  if (!coDangNhapCaNhan(nguoi)) throw new Error(await cauHetCongTy(nguoi));
  try {
    const kq = await runCliPromptDich(dichCaNhan(nguoi), l, meta);
    boDauHongCaNhan(nguoi);
    return kq;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (laLoiHetLuot(msg)) {
      danhDauHetCaNhan(nguoi, msg, (e as { hetDen?: number | null }).hetDen ?? null);
      throw new Error(await cauHetCongTy(nguoi));
    }
    // Mất đăng nhập → đánh dấu để thẻ "Tài khoản Claude cá nhân" hiện "Đăng nhập lại" ngay
    if (laLoiDangNhap(msg)) danhDauHongCaNhan(nguoi, msg);
    if (/đăng nhập Claude đã hết hạn|failed to authenticate/i.test(msg)) {
      throw new Error('Đăng nhập Claude cá nhân của anh/chị không còn dùng được (hết hạn hoặc đã thu hồi). Bấm tên mình ở góc trên → "Tài khoản Claude cá nhân" → Đăng nhập Claude.');
    }
    throw e;
  }
}

/** Một "đích chạy": tài khoản công ty 1/2 hoặc tài khoản cá nhân — mỗi đích một hàng chờ + một thư mục đăng nhập */
interface DichChay {
  tk: TrangThaiTk;
  nhan: TaiKhoanLuot;
  /** CLAUDE_CONFIG_DIR — undefined = tài khoản mặc định của máy */
  thuMuc?: string;
  dem: () => void;
}

const dichCongTy = (so: SoTk): DichChay => ({ tk: trangThai(so), nhan: so === 2 ? "tk2" : "tk1", thuMuc: thuMucChay(so), dem: () => demLuot(so) });
const dichCaNhan = (nguoi: string): DichChay => ({ tk: trangThaiCaNhan(nguoi), nhan: "ca_nhan", thuMuc: thuMucCaNhan(nguoi), dem: () => {} });

function runCliPromptDich(dich: DichChay, l: LuotCli, meta?: MetaLuot): Promise<Record<string, unknown>> {
  const tk = dich.tk;
  const tkSo = dich.nhan;
  tk.cho ??= [];
  tk.dang_uu_tien ??= 0;
  // Lượt ưu tiên (chat — người đang chờ) chỉ đếm suất của nhau, không bị việc nền chiếm suất
  const uuTien = laUuTien();
  if (uuTien ? tk.dang_uu_tien >= CLI_MAX_PENDING : tk.dang >= CLI_MAX_PENDING) {
    ghiLuotSo(meta, tkSo, "day_hang", Date.now(), 0, undefined, l.modelEp);
    return Promise.reject(
      new Error(
        uuTien
          ? `Đang có ${tk.dang_uu_tien} câu hỏi khác chờ trợ lý trả lời — anh/chị chờ vài phút rồi gửi lại giúp em.`
          : `Máy chủ đang xử lý ${tk.dang} yêu cầu AI khác — chờ vài phút rồi gửi lại giúp mình nhé.`,
      ),
    );
  }
  const tVao = Date.now();
  let tBat = 0;
  let objCuoi: Record<string, unknown> | undefined;
  const modelSo = () => l.modelEp || getAIConfig().model || null;
  const job = async (): Promise<Record<string, unknown>> => {
    try {
      const kq = await jobGoc();
      ghiLuotSo(meta, tkSo, "ok", tVao, tBat, objCuoi?.usage as Record<string, unknown> | undefined, modelSo());
      return kq;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ghiLuotSo(meta, tkSo, laLoiHetLuot(msg) ? "het_han_muc" : "loi", tVao, tBat, objCuoi?.usage as Record<string, unknown> | undefined, modelSo());
      throw e;
    }
  };
  const jobGoc = async (): Promise<Record<string, unknown>> => {
    tBat = Date.now();
    dich.dem();
    let stdout = await runCliPromptOnce(l.prompt, l.system, true, l.skill, l.modelEp, l.tuyChon, dich.thuMuc);
    if (GREETING_RE.test(stdout) && !/^\s*[[{]/.test(stdout)) {
      await delay(1000);
      stdout = await runCliPromptOnce(l.prompt, l.system, true, l.skill, l.modelEp, l.tuyChon, dich.thuMuc);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      // stdout lẫn nhiễu → vớt khối JSON (parse lần 2 cũng phải bọc try/catch,
      // nếu không SyntaxError tiếng Anh sẽ lọt thẳng ra thông báo cho người dùng)
      const m = stdout.match(/\{[\s\S]*\}/);
      if (!m) {
        throw new Error(
          `Claude CLI không trả về JSON hợp lệ: ${stdout.trim().slice(0, 200)}`,
        );
      }
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        throw new Error(
          `Claude CLI không trả về JSON hợp lệ: ${stdout.trim().slice(0, 200)}`,
        );
      }
    }
    const obj = parsed as Record<string, unknown>;
    objCuoi = obj;
    const result = obj?.result;
    // CLI báo lỗi (chưa đăng nhập, hết lượt, tổ chức chặn…) bằng is_error:true + câu tiếng Anh trong result — dịch sang tiếng
    // Việt rồi ném (giữ giờ mở lại hạn mức đọc từ câu gốc)
    if (obj?.is_error === true) {
      const loi =
        dichLoiCli(result) ??
        (typeof result === "string" && result.trim() !== ""
          ? `Claude CLI báo lỗi: ${result.trim().slice(0, 300)}`
          : "Claude CLI báo lỗi mà không kèm lý do.");
      throw loiCoGioMoLai(loi, result);
    }
    if (typeof result !== "string") {
      throw new Error("Claude CLI không trả về trường result — kiểm tra phiên bản CLI.");
    }
    const loiAn = dichLoiCli(result);
    if (loiAn) throw loiCoGioMoLai(loiAn, result);
    if (l.tuyChon?.khiXong) {
      const u = (obj.usage ?? {}) as Record<string, unknown>;
      try {
        l.tuyChon.khiXong({
          tokenRa: typeof u.output_tokens === "number" ? u.output_tokens : null,
          usd: typeof obj.total_cost_usd === "number" ? obj.total_cost_usd : null,
        });
      } catch {
        // đo lường hỏng không được làm hỏng câu trả lời
      }
    }
    return obj;
  };
  // Xếp hàng CỦA TÀI KHOẢN NÀY, mỗi lúc một lượt. Lượt ưu tiên (chat) chen lên trước mọi lượt nền đang CHỜ (lượt đang chạy dở
  // vẫn chạy xong); các lượt cùng loại giữ thứ tự đến trước làm trước.
  tk.dang += 1;
  if (uuTien) tk.dang_uu_tien += 1;
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const muc = {
      uu_tien: uuTien,
      chay: () => {
        job()
          .then(resolve, reject)
          .finally(() => {
            // Giảm bộ đếm ở CẢ 2 nhánh (thành công/lỗi) — không được để rò rỉ suất
            tk.dang -= 1;
            if (uuTien) tk.dang_uu_tien = Math.max(0, (tk.dang_uu_tien ?? 1) - 1);
            tk.dang_chay = false;
            chayLuotTiep(tk);
          });
      },
    };
    const cho = tk.cho!;
    const viTri = uuTien ? cho.findIndex((x) => !x.uu_tien) : -1;
    if (viTri >= 0) cho.splice(viTri, 0, muc);
    else cho.push(muc);
    chayLuotTiep(tk);
  });
}

/** Tài khoản rảnh → chạy lượt đầu danh sách chờ */
function chayLuotTiep(tk: TrangThaiTk): void {
  if (tk.dang_chay) return;
  const j = tk.cho?.shift();
  if (!j) return;
  tk.dang_chay = true;
  j.chay();
}

/**
 * NÚT "THỬ TRỢ LÝ AI" TRÊN THẺ TÀI KHOẢN CLAUDE (một khuôn thẻ cho TK1, TK2, tài khoản cá nhân): hỏi MỘT câu rất ngắn trên model
 * nhẹ (haiku) bằng ĐÚNG tài khoản đó, đi đúng hàng chờ của tài khoản đó. Lộ ra cả lỗi mà kiểm nhanh không thấy: phiên bị thu
 * hồi, tổ chức chặn gói, hết hạn mức. Lượt thử ghi sổ dùng AI; trúng hết hạn mức / 401 thì đánh dấu y như lượt thật.
 */
export async function thuTaiKhoan(ai: SoTk | { nguoi: string }, nguoiBam: string): Promise<{ ok: boolean; tra_loi?: string; loi?: string; giay: number }> {
  const t0 = Date.now();
  const dich = typeof ai === "number" ? dichCongTy(ai) : dichCaNhan(ai.nguoi);
  const giay = () => Math.round((Date.now() - t0) / 100) / 10;
  try {
    // Người bấm đang đứng chờ → lượt ƯU TIÊN, không xếp sau việc nền
    const kq = await chayUuTien(() =>
      runCliPromptDich(dich, { prompt: "Chỉ trả lời đúng một từ: OK", modelEp: "haiku", tuyChon: { tokenNghi: 0 } }, { tinh_nang: "lib/ai/thu-tai-khoan", nguoi: nguoiBam }),
    );
    if (typeof ai !== "number") boDauHongCaNhan(ai.nguoi);
    return { ok: true, tra_loi: String(kq.result ?? "").trim().slice(0, 200), giay: giay() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hetDen = (e as { hetDen?: number | null }).hetDen ?? null;
    if (laLoiHetLuot(msg)) {
      if (typeof ai === "number") await danhDauHet(ai, msg, hetDen);
      else danhDauHetCaNhan(ai.nguoi, msg, hetDen);
    } else if (laLoiDangNhap(msg)) {
      if (typeof ai === "number") await danhDauHongDangNhap(ai, msg);
      else danhDauHongCaNhan(ai.nguoi, msg);
    }
    return { ok: false, loi: msg, giay: giay() };
  }
}

// ===== LOẠI 2: API providers =====

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Base URL OpenAI-compatible theo provider (custom → aiBaseUrl); null nếu thiếu */
function compatBaseUrl(cfg: AIConfig): string | null {
  if (cfg.provider === "custom") return cfg.baseUrl || null;
  const compat = OPENAI_COMPAT[cfg.provider];
  return compat ? compat.baseUrl : null;
}

/** Như callAnthropic, kèm `usage` để đo chi phí thật */
async function callAnthropicDo(
  cfg: AIConfig,
  prompt: string,
  system?: string,
  modelEp?: string,
): Promise<{ text: string; model: string; tokenVao: number | null; tokenRa: number | null }> {
  const model = modelEp || cfg.model || ANTHROPIC_DEFAULT_MODEL;
  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) body.system = system;
  const res = await fetchWithTimeout(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": cfg.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    },
    180000,
  );
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`Anthropic API lỗi HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  // Model đời mới có thể trả khối thinking trước — lấy khối text đầu tiên
  const text = (data.content ?? []).find((b) => typeof b.text === "string" && (b.type ?? "text") === "text")?.text;
  if (typeof text !== "string") throw new Error("Anthropic API không trả về nội dung text.");
  return {
    text,
    model,
    tokenVao: typeof data.usage?.input_tokens === "number" ? data.usage.input_tokens : null,
    tokenRa: typeof data.usage?.output_tokens === "number" ? data.usage.output_tokens : null,
  };
}

/** Gọi provider chuẩn OpenAI chat/completions → text trả lời */
async function callOpenAICompat(cfg: AIConfig, prompt: string, system?: string): Promise<string> {
  const base = compatBaseUrl(cfg);
  if (!base) throw new Error("Chưa cấu hình Base URL cho provider custom.");
  const model = effectiveModel(cfg);
  if (!model) throw new Error("Chưa cấu hình model cho provider custom.");
  const messages: Array<{ role: string; content: string }> = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  const res = await fetchWithTimeout(
    `${base}/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
    },
    180000,
  );
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    throw new Error(`${cfg.provider} API lỗi HTTP ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error(`${cfg.provider} API không trả về nội dung text.`);
  }
  return text;
}

/**
 * Chạy 1 prompt qua kết nối AI hiện hành → text trả lời.
 * Throw Error (message tiếng Việt) khi chưa cấu hình / lỗi mạng / lỗi provider.
 */
export async function runAI(
  prompt: string,
  system?: string,
  skill?: TuyChonSkill,
  /** Chỉ trợ lý chat truyền (tắt/giới hạn nghĩ ngầm) — việc AI khác để trống = như cũ */
  tuyChon?: TuyChonGoi
): Promise<string> {
  // Ai gọi + tính năng nào: đọc NGAY lúc vào (ngăn xếp còn tệp gọi) — sổ dùng AI
  const meta = metaLuotHienTai();
  const cfg = getAIConfig();
  if (cfg.mode === "off") {
    throw new Error("Chưa cấu hình kết nối AI — vào Cài đặt → Kết nối AI.");
  }
  if (cfg.mode === "claude-cli") {
    return chayCliJson(prompt, system, skill, undefined, tuyChon, meta).then((j) => j.result as string);
  }
  // Đường API không có cơ chế skill của CLI — vẫn trả lời được nhưng skill
  // không tự kích hoạt; đường gọi đích danh /tên-skill đã nạp nội dung vào
  // system prompt nên vẫn ép được (chat-agent lo việc đó).
  if (cfg.apiKey === "") {
    throw new Error("Chưa nhập API key — vào Cài đặt → Kết nối AI.");
  }
  const tVao = Date.now();
  try {
    if (cfg.provider === "anthropic") {
      const r = await callAnthropicDo(cfg, prompt, system);
      ghiLuotSo(meta, "api", "ok", tVao, tVao, { input_tokens: r.tokenVao ?? 0, output_tokens: r.tokenRa ?? 0 }, r.model);
      return r.text;
    }
    const text = await callOpenAICompat(cfg, prompt, system);
    ghiLuotSo(meta, "api", "ok", tVao, tVao, undefined, effectiveModel(cfg));
    return text;
  } catch (e) {
    ghiLuotSo(meta, "api", ketQuaLoiApi(e), tVao, tVao, undefined, effectiveModel(cfg));
    throw e;
  }
}

/** Lỗi API trả 429 / báo hết quota → "hết hạn mức" trong sổ dùng AI; còn lại là lỗi */
function ketQuaLoiApi(e: unknown): KetQuaLuot {
  return /HTTP 429|rate.?limit|quota/i.test(e instanceof Error ? e.message : String(e)) ? "het_han_muc" : "loi";
}

// ===== Chạy có ĐO CHI PHÍ (J12, 23/09) =====

/** Giá niêm yết USD / 1 triệu token (Anthropic, bảng 24/06/2026) — chỉ model đã biết */
export const GIA_MODEL_USD: Record<string, { vao: number; ra: number }> = {
  "claude-sonnet-5": { vao: 2, ra: 10 },
  "claude-sonnet-4-6": { vao: 3, ra: 15 },
  "claude-sonnet-4-5": { vao: 3, ra: 15 },
  "claude-opus-5": { vao: 5, ra: 25 },
  "claude-haiku-4-5": { vao: 1, ra: 5 },
};

export interface KetQuaDo {
  text: string;
  model: string;
  /** null = đường gọi không báo */
  tokenVao: number | null;
  tokenRa: number | null;
  /** USD thật: CLI tự báo total_cost_usd; API thì nhân giá niêm yết. null = không đo được */
  usd: number | null;
  /** Số USD lấy từ đâu — hiện cho người đọc biết mà tin tới đâu */
  nguonUsd: "cli-bao" | "api-nhan-gia" | "khong-do-duoc";
  /** CLI có thể dùng nhiều model trong một lượt — "model $x · model $y" (đo 23/09: có cả Haiku phụ) */
  chiTietModel?: string;
}

/**
 * Chạy một prompt qua kết nối AI hiện hành (khoá/CLI của Main), ép model nếu
 * cần, và trả kèm token + USD thật của lượt gọi. Ném Error tiếng Việt như runAI.
 */
export async function runAIDo(prompt: string, system: string | undefined, modelEp?: string): Promise<KetQuaDo> {
  const meta = metaLuotHienTai();
  const cfg = getAIConfig();
  if (cfg.mode === "off") throw new Error("Chưa cấu hình kết nối AI — vào Cài đặt → Kết nối AI.");
  if (cfg.mode === "claude-cli") {
    const j = await chayCliJson(prompt, system, undefined, modelEp, undefined, meta);
    const u = (j.usage ?? {}) as Record<string, unknown>;
    const so = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);
    // Token vào của CLI = vào thường + ghi bộ nhớ đệm + đọc bộ nhớ đệm (prompt hệ thống của CLI)
    const vao = so(u.input_tokens) + so(u.cache_creation_input_tokens) + so(u.cache_read_input_tokens);
    // modelUsage: { "<model>": { costUSD, … } } — model chính = model tốn nhiều nhất
    const mu = Object.entries(
      j.modelUsage && typeof j.modelUsage === "object" ? (j.modelUsage as Record<string, Record<string, unknown>>) : {},
    ).sort((a, b) => so(b[1]?.costUSD) - so(a[1]?.costUSD));
    return {
      text: String(j.result),
      model: mu[0]?.[0] ?? modelEp ?? (cfg.model || "mặc định CLI"),
      chiTietModel: mu.map(([m, v]) => `${m} $${fmtNum(so(v?.costUSD), 4)}`).join(" · ") || undefined,
      tokenVao: vao > 0 ? vao : null,
      tokenRa: so(u.output_tokens) > 0 ? so(u.output_tokens) : null,
      usd: typeof j.total_cost_usd === "number" ? j.total_cost_usd : null,
      nguonUsd: typeof j.total_cost_usd === "number" ? "cli-bao" : "khong-do-duoc",
    };
  }
  if (cfg.apiKey === "") throw new Error("Chưa nhập API key — vào Cài đặt → Kết nối AI.");
  const tVao = Date.now();
  try {
    if (cfg.provider === "anthropic") {
      const r = await callAnthropicDo(cfg, prompt, system, modelEp);
      ghiLuotSo(meta, "api", "ok", tVao, tVao, { input_tokens: r.tokenVao ?? 0, output_tokens: r.tokenRa ?? 0 }, r.model);
      const gia = GIA_MODEL_USD[r.model];
      const usd = gia && r.tokenVao !== null && r.tokenRa !== null ? (r.tokenVao * gia.vao + r.tokenRa * gia.ra) / 1e6 : null;
      return { ...r, usd, nguonUsd: usd === null ? "khong-do-duoc" : "api-nhan-gia" };
    }
    // Nhà cung cấp khác: không ép model Claude, không có bảng giá → chỉ trả chữ
    const text = await callOpenAICompat(cfg, prompt, system);
    ghiLuotSo(meta, "api", "ok", tVao, tVao, undefined, effectiveModel(cfg));
    return { text, model: effectiveModel(cfg), tokenVao: null, tokenRa: null, usd: null, nguonUsd: "khong-do-duoc" };
  } catch (e) {
    ghiLuotSo(meta, "api", ketQuaLoiApi(e), tVao, tVao, undefined, modelEp || effectiveModel(cfg));
    throw e;
  }
}

// ===== Test kết nối (KHÔNG tốn token) =====

export interface TestResult {
  ok: boolean;
  message: string;
}

/**
 * Test kết nối theo cấu hình hiện tại — không tốn token:
 * - claude-cli → checkCliStatus
 * - anthropic  → GET /v1/models (x-api-key)
 * - còn lại    → GET {base}/models (Bearer)
 */
export async function testConnection(): Promise<TestResult> {
  const cfg = getAIConfig();

  if (cfg.mode === "off") {
    return {
      ok: false,
      message: "Chưa bật kết nối AI — chọn 1 trong 2 loại trong Cài đặt.",
    };
  }

  if (cfg.mode === "claude-cli") {
    resetClaudeBinaryCache();
    const status = await checkCliStatus();
    if (!status.installed) {
      return {
        ok: false,
        message:
          "Không tìm thấy Claude CLI trên máy chủ — cài đặt (npm install -g @anthropic-ai/claude-code) rồi thử lại.",
      };
    }
    if (!status.loggedIn) {
      return {
        ok: false,
        message: `Claude CLI đã cài (${status.version ?? "?"}) nhưng CHƯA đăng nhập — chạy \`claude\` trên máy chủ để đăng nhập.`,
      };
    }
    return {
      ok: true,
      message: `Claude CLI sẵn sàng — ${status.version ?? ""}${status.plan ? ` (gói ${status.plan})` : ""}`.trim(),
    };
  }

  // mode = "api"
  if (cfg.apiKey === "") {
    return { ok: false, message: "Chưa nhập API key — nhập trong Cài đặt → Kết nối AI." };
  }

  let url: string;
  let headers: Record<string, string>;
  if (cfg.provider === "anthropic") {
    url = "https://api.anthropic.com/v1/models";
    headers = { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" };
  } else {
    const base = compatBaseUrl(cfg);
    if (!base) {
      return { ok: false, message: "Chưa nhập Base URL cho provider custom." };
    }
    if (cfg.provider === "custom" && cfg.model === "") {
      return { ok: false, message: "Provider custom bắt buộc nhập model." };
    }
    url = `${base}/models`;
    headers = { authorization: `Bearer ${cfg.apiKey}` };
  }

  try {
    const res = await fetchWithTimeout(url, { method: "GET", headers }, 20000);
    if (res.ok) {
      return {
        ok: true,
        message: `Kết nối ${cfg.provider} thành công — model: ${effectiveModel(cfg)}.`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `API key không hợp lệ hoặc hết hạn (HTTP ${res.status}).`,
      };
    }
    return {
      ok: false,
      message: `Provider ${cfg.provider} trả về HTTP ${res.status} — kiểm tra lại cấu hình.`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/abort/i.test(msg)) {
      return { ok: false, message: "Hết thời gian chờ (20s) — kiểm tra mạng/Base URL." };
    }
    return { ok: false, message: `Không kết nối được: ${msg}` };
  }
}

/**
 * Cờ TẮT LƯU PHIÊN của Claude CLI (Mr. Đại chốt 12/10/2026 sau lần rà dữ liệu phình). Trước đó mỗi lượt AI để lại một tệp ghi cả
 * lượt ở thư mục người dùng (~/.claude/projects/…sandbox…): đo 12/10 có 2.513 tệp ≈ 113 MB, ước 2 năm ≈ 12,7 GB — không app nào đọc
 * lại (không chỗ nào dùng --resume). Đo 12/10: gắn cờ thì CLI vẫn trả đủ khuôn JSON / stream-json, không sinh tệp phiên.
 * Cần soi lại một lượt: đặt biến môi trường SCI_CLAUDE_GIU_PHIEN=1 rồi khởi động lại app — CLI lưu phiên như cũ.
 */
function coTatLuuPhien(): string[] {
  return process.env.SCI_CLAUDE_GIU_PHIEN === "1" ? [] : ["--no-session-persistence"];
}
