// ============================================================
// TẦNG KẾT NỐI AI — 2 loại kết nối:
//   1. "claude-cli": gọi Claude Code CLI cài trên máy chủ (gói Pro/Max,
//      không tốn API key) — spawn tiến trình con, prompt gửi qua STDIN.
//   2. "api": gọi HTTP API của provider (anthropic | openai | gemini | grok |
//      deepseek | custom). Trừ anthropic, tất cả dùng chuẩn OpenAI
//      chat/completions (Gemini dùng shim OpenAI-compatible của Google).
//
// CHỈ chạy phía server (node:child_process, node:fs) — không import vào
// Client Component. Cấu hình đọc qua ket-noi.ts (data/ai-ket-noi.json → env).
//
// SCI công việc (24/09/2026) — LẤY NGUYÊN từ agent tiến độ, chỉ đổi 3 chỗ:
//   1. Nguồn cấu hình: ket-noi.ts thay appconfig.getSetting; MẶC ĐỊNH là
//      "claude-cli" (kế hoạch v2: Claude CLI mặc định, API là tùy chọn).
//   2. runAI nhận thêm `model` cho từng lượt — model mặc định lấy từ cấu hình
//      `ai.model_mac_dinh` (chat-agent đọc), người dùng đổi riêng ở chip model.
//   3. Tên model đầy đủ (claude-sonnet-5…) đổi về bí danh CLI (sonnet/opus/haiku)
//      khi chạy CLI — CLI luôn hiểu bí danh, tên đầy đủ thì tùy phiên bản.
// ============================================================

import { spawn } from "node:child_process";
import { MODEL_CLAUDE } from "./danh-muc-model";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { layKetNoi, layKhoaNcc, layModelCli, layModelNcc } from "@/lib/ai/ket-noi";
import { dichLoiCli, tenGoiClaude } from "@/lib/ai/loi-cli";
import {
  boDauHongCaNhan,
  caNhanDungDuoc,
  chonTaiKhoan,
  coDangNhapCaNhan,
  conTaiKhoanCongTy,
  dangMatDangNhap,
  danhDauHet,
  danhDauHetCaNhan,
  danhDauHongCaNhan,
  danhDauHongDangNhap,
  demLuot,
  gioMoLaiCongTy,
  gioVN,
  laLoiDangNhap,
  laLoiHetLuot,
  maChay,
  maChayCaNhan,
  thuMucCaNhan,
  thuMucChay,
  trangThai,
  trangThaiCaNhan,
  type SoTk,
  type TrangThaiTk,
} from "@/lib/ai/tai-khoan-claude";
import { thuMucDuLieu } from "@/lib/ai/duong-dan";
import { chayUuTien, laUuTien } from "@/lib/ai/uu-tien";
import { ghiLuotAi, metaLuotHienTai, voiTinhNang, type MetaLuot } from "@/lib/ai/so-dung-ai";
import { giaiGioMoLai, type KetQuaLuot, type TaiKhoanLuot } from "@/lib/ai/thong-ke-ai";

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

export const PROVIDERS: AIProvider[] = [
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

const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5";

/** Đọc cấu hình AI hiệu lực (data/ai-ket-noi.json → fallback env). Chưa khai = Claude CLI. */
export function getAIConfig(): AIConfig {
  return cauHinhCho();
}

/**
 * Cấu hình AI cho một chế độ / nhà cung cấp CỤ THỂ (mặc định = đang lưu). Dùng khi thử
 * một nhà cung cấp đã có khóa mà chưa bật (nút "Thử" trên panel API key).
 */
export function cauHinhCho(modeEp?: AIMode, providerEp?: AIProvider): AIConfig {
  const modeRaw = modeEp ?? layKetNoi("aiMode") ?? "claude-cli";
  const mode: AIMode = modeRaw === "claude-cli" || modeRaw === "api" ? modeRaw : "off";
  const providerRaw = providerEp ?? layKetNoi("aiProvider") ?? "";
  const provider: AIProvider = (PROVIDERS as readonly string[]).includes(providerRaw)
    ? (providerRaw as AIProvider)
    : "anthropic";
  return {
    mode,
    provider,
    // Khóa + model RIÊNG theo nhà cung cấp (như HptStart); CLI có model riêng
    apiKey: layKhoaNcc(provider) ?? "",
    model: (mode === "claude-cli" ? layModelCli() : layModelNcc(provider)) ?? "",
    baseUrl: (layKetNoi("aiBaseUrl") ?? "").replace(/\/+$/, ""),
  };
}

/** Model hiệu lực sau khi áp mặc định theo provider ("" nếu custom chưa nhập) */
export function effectiveModel(cfg: AIConfig): string {
  if (cfg.model) return cfg.model;
  if (cfg.provider === "anthropic") return ANTHROPIC_DEFAULT_MODEL;
  const compat = OPENAI_COMPAT[cfg.provider];
  return compat ? compat.defaultModel : ""; // custom → bắt buộc nhập model
}

/**
 * Che API key: tiền tố công khai của hãng (sk-, xai-, AIza…) + "…" + 4 ký tự cuối,
 * vd "sk-…abcd"; khóa ngắn (≤ 12 ký tự) chỉ còn "••••"; rỗng → "".
 */
export function maskApiKey(key: string): string {
  const clean = key.replace(/\s+/g, "");
  if (clean === "") return "";
  if (clean.length <= 12) return "••••";
  const tienTo = /^(sk-|xai-|gsk_|AIza)/.exec(clean)?.[1] ?? "";
  return `${tienTo}…${clean.slice(-4)}`;
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
 * Dấu vết của một phiên Claude Code BÊN NGOÀI. Server được bật từ trong Claude Code
 * (lúc phát triển / hỗ trợ từ xa) thì các biến này lây sang tiến trình con → CLI tưởng
 * mình đang chạy LỒNG và xác thực sai kiểu, báo "not logged in" dù máy đã đăng nhập
 * (HptStart đo thật 28/7/2026). Xóa sạch trước khi spawn.
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

/** env cho tiến trình Claude CLI: xóa NODE_OPTIONS, ELECTRON_/VSCODE_ và dấu vết phiên Claude Code ngoài */
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
 * (Trợ lý chỉ đọc dữ liệu qua bộ công cụ do server thực thi, xem chat-tools.ts)
 */
function aiSandboxDir(): string {
  const dir = path.join(os.tmpdir(), "docflow-ai-sandbox");
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
  opts: { timeoutMs: number; stdinData?: string; cwd?: string; khongNghi?: boolean; thuMucDangNhap?: string; maDangNhap?: string },
): Promise<SpawnResult> {
  // Test (vitest.config.ts đặt CAM_CLI_THAT=1) KHÔNG BAO GIỜ được gọi Claude CLI thật — 04/10 giả lập thiếu một hàm làm 6 bài test
  // gọi thật (Sonnet 5, ~115 nghìn token). Test cần CLI thì trỏ ANTHROPIC_SUB_CLI_PATH tới file giả + giả spawn.
  if (process.env.CAM_CLI_THAT === "1" && binPath !== process.env.ANTHROPIC_SUB_CLI_PATH?.trim()) {
    return Promise.reject(new Error("Đang chạy test: cấm gọi Claude CLI thật — giả runAI / runAIGan, hoặc trỏ ANTHROPIC_SUB_CLI_PATH tới CLI giả."));
  }
  return new Promise<SpawnResult>((resolve, reject) => {
    const shell = needsShell(binPath);
    const cleanArgs = args.map(sanitizeArg);
    const finalArgs = shell ? cleanArgs.map(quoteForShell) : cleanArgs;
    // Đường dẫn CLI cũng phải quote đúng luật cmd.exe (thư mục có dấu cách/&)
    const command = shell ? quoteForShell(binPath) : binPath;

    const env = envConCli();
    // Lượt soát theo khuôn JSON (góp ý, luật AI): tắt "nghĩ dài" — đo 29/09 cùng câu hỏi 105–114 giây → 12–15 giây
    if (opts.khongNghi) env.MAX_THINKING_TOKENS = "0";
    // Hai tài khoản Claude (02/10): mỗi tài khoản một thư mục đăng nhập riêng
    if (opts.thuMucDangNhap) env.CLAUDE_CONFIG_DIR = opts.thuMucDangNhap;
    // Mã dán tay (`claude setup-token`, 04/10): CLI đọc biến này trước file đăng nhập — đo 04/10: thư mục trống + mã đúng → chạy
    if (opts.maDangNhap) env.CLAUDE_CODE_OAUTH_TOKEN = opts.maDangNhap;

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
  /** Email tài khoản Claude đang đăng nhập (route chỉ trả cho người có quyền sửa cài đặt) */
  email?: string;
  authMethod?: string;
}

/** Kiểm tra Claude CLI: đã cài chưa (--version) + đã đăng nhập chưa (auth status) */
export async function checkCliStatus(thuMucDangNhap?: string, maDangNhap?: string): Promise<CliStatus> {
  const bin = findClaudeBinary();
  if (!bin) return { installed: false, loggedIn: false };

  // (1) claude --version — timeout 8s
  let version: string | undefined;
  try {
    const res = await spawnClaude(bin, ["--version"], { timeoutMs: 8000, thuMucDangNhap, maDangNhap });
    if (res.code !== 0) return { installed: false, loggedIn: false };
    version = res.stdout.trim().split(/\r?\n/)[0] || undefined;
  } catch {
    return { installed: false, loggedIn: false };
  }

  // (2) claude auth status --json — timeout 15s; stdout có thể lẫn text nhiễu
  //     → vớt JSON bằng match(/\{[\s\S]*\}/)
  try {
    // ⚠ Đăng nhập bằng mã: auth status chỉ báo "có mã" (authMethod oauth_token, không email/gói), KHÔNG kiểm mã còn dùng được
    // (đo 04/10: mã giả vẫn loggedIn:true) — kiểm thật bằng thuMaDangNhap.
    const res = await spawnClaude(bin, ["auth", "status", "--json"], {
      timeoutMs: 15000,
      thuMucDangNhap,
      maDangNhap,
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
      ...(plan ? { plan } : {}),
      ...(tenGoi ? { tenGoi } : {}),
      ...(loggedIn && email ? { email } : {}),
      ...(authMethod ? { authMethod } : {}),
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
// Skill/ToolSearch/TodoWrite/Agent: lượt không skill thì CLI không được tự dò skill hay tách việc (đo 01/10: tự dò = 4–6 vòng nội bộ)
const DISALLOWED_TOOLS = "Bash Edit Write Read WebFetch WebSearch Glob Grep NotebookEdit Task Agent Skill ToolSearch TodoWrite";
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
 * Tên model cho Claude CLI: tên đầy đủ (claude-opus-5-5, claude-fable-5-1…) truyền thẳng để chọn đúng phiên bản.
 * CLI bản cũ chưa biết mã mới → runCliPromptOnce tự lùi về bí danh (biDanhCli) chứ không làm hỏng lượt AI.
 */
export function modelChoCli(model: string): string {
  return model.trim();
}

/** Bí danh họ model CLI luôn hiểu (opus/sonnet/haiku/fable); "" nếu không nhận ra họ. */
export function biDanhCli(model: string): string {
  const m = model.trim().toLowerCase();
  for (const ho of ["opus", "sonnet", "haiku", "fable"]) if (m.includes(ho)) return ho;
  return "";
}

/** CLI báo không nhận ra model (mã mới hơn bản CLI đang cài). */
const MODEL_LA_RE = /unrecognized_model|invalid model|unknown model|issue with the selected model|model .*not (found|supported|available)/i;

/** Phiên bản Claude CLI đang cài (vd "2.1.277") — "" nếu không chạy được. */
export async function phienBanCli(): Promise<string> {
  const bin = findClaudeBinary();
  if (!bin) return "";
  try {
    const r = await spawnClaude(bin, ["--version"], { timeoutMs: 30000 });
    return (r.stdout.match(/\d+\.\d+\.\d+/) ?? [""])[0];
  } catch {
    return "";
  }
}

/**
 * Chạy THẬT một câu ngắn với model qua Claude CLI để biết model có dùng được không (dò danh sách model thật).
 * `thucTe` = mã model hãng thực sự trả lời (bí danh "opus" → "claude-opus-5"…), đọc từ modelUsage của CLI.
 */
export async function thuModelCli(model: string): Promise<{ ok: boolean; thucTe?: string; loi?: string }> {
  const bin = findClaudeBinary();
  if (!bin) return { ok: false, loi: "Chưa cài Claude CLI" };
  try {
    const r = await spawnClaude(bin, ["-p", "--output-format", "json", "--strict-mcp-config", ...coTatLuuPhien(), "--disallowed-tools", DISALLOWED_TOOLS, "--model", model], {
      timeoutMs: 90000,
      stdinData: "Chỉ trả lời đúng một từ: OK",
    });
    const m = r.stdout.match(/\{[\s\S]*\}/);
    const j = m ? (JSON.parse(m[0]) as { is_error?: boolean; result?: string; modelUsage?: Record<string, unknown> }) : null;
    if (r.code !== 0 || !j || j.is_error) {
      return { ok: false, loi: (j?.result || r.stderr || r.stdout).trim().slice(0, 200) || `mã thoát ${r.code}` };
    }
    // modelUsage có thêm model phụ (haiku) CLI dùng nội bộ — bỏ ra nếu còn model khác
    let ten = Object.keys(j.modelUsage ?? {});
    if (ten.length > 1) ten = ten.filter((x) => !/haiku/i.test(x));
    return { ok: true, thucTe: ten[0] ?? model };
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e) };
  }
}

async function runCliPromptOnce(
  prompt: string,
  system?: string,
  withToolFlags = true,
  skill?: TuyChonSkill,
  modelLuot?: string,
  thoiGianChoMs?: number,
  khongNghi?: boolean,
  thuMucDangNhap?: string,
  maDangNhap?: string
): Promise<string> {
  const bin = findClaudeBinary();
  if (!bin) {
    throw new Error("Chưa tìm thấy Claude CLI trên máy chủ — cài đặt rồi thử lại.");
  }
  const cfg = getAIConfig();
  // --strict-mcp-config: KHÔNG nạp kết nối MCP của tài khoản đang đăng nhập CLI trên máy chủ (đo 01/10: không có cờ thì AI
  // trong app thấy Gmail, Google Drive/Calendar, Mem, Canva… của người cài máy → từ chối làm vì tưởng đang ở môi trường đó,
  // và là chỗ hở dữ liệu cá nhân). App chỉ dùng công cụ của chính nó (chat-tools), không cần MCP nào.
  const args = ["-p", "--output-format", "json", "--strict-mcp-config", ...coTatLuuPhien()];
  if (skill) {
    // ALLOWLIST thay vì danh sách cấm — mở đúng thứ cần, không hơn.
    // Đã đo ở phaply: Read bị hệ thống quyền chặn ra ngoài cwd.
    args.push(
      "--tools",
      skill.choPhepScript ? "Skill,Read,Bash,Write,Edit" : "Skill,Read"
    );
  } else if (withToolFlags) {
    // Tắt SẠCH công cụ của CLI (đo 01/10): chỉ cấm một danh sách thì CLI vẫn thấy vài công cụ còn lại, thử gọi thẳng
    // "thumuc.liet_ke"… thay vì trả JSON {actions} → 2/5 câu thử trả lời "không truy cập được công cụ". App tự chạy
    // công cụ của mình qua JSON; CLI không cần công cụ nào. Cờ lạ thì nhánh thử lại bên dưới bỏ cờ.
    args.push("--tools", "", "--disallowed-tools", DISALLOWED_TOOLS);
  }
  const model = modelChoCli(modelLuot || cfg.model);
  if (model) {
    args.push("--model", model);
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
    timeoutMs: thoiGianChoMs && thoiGianChoMs > 0 ? Math.min(thoiGianChoMs, 420000) : 420000,
    stdinData,
    cwd: skill?.sandboxCwd,
    khongNghi,
    thuMucDangNhap,
    maDangNhap,
  });
  if (res.code !== 0) {
    // CLI báo lỗi API bằng JSON ĐẦY ĐỦ trên stdout rồi thoát mã 1 (đo 04/10: mã đăng nhập sai → 833 ký tự, lý do "result" nằm
    // CUỐI) — cắt 400 ký tự đầu là mất lý do, JSON tiếng Anh lọt ra màn, lỗi hết hạn mức không được nhận ra để chuyển tài khoản.
    const jsonLoi = docJsonLoiCli(res.stdout);
    const detail = (jsonLoi ?? (res.stderr || res.stdout)).trim().slice(0, 400);
    if (withToolFlags && UNKNOWN_FLAG_RE.test(detail)) {
      return runCliPromptOnce(prompt, system, false, skill, modelLuot, thoiGianChoMs, khongNghi, thuMucDangNhap, maDangNhap);
    }
    // Model quá mới với CLI đang cài → chạy lại bằng bí danh cùng họ (vd claude-opus-5-5 → opus), không bỏ việc
    const biDanh = biDanhCli(model);
    if (model && biDanh && biDanh !== model && MODEL_LA_RE.test(detail)) {
      console.warn(`[ai] Claude CLI chưa biết model "${model}" — dùng bí danh "${biDanh}". Cập nhật CLI: claude update`);
      return runCliPromptOnce(prompt, system, withToolFlags, skill, biDanh, thoiGianChoMs, khongNghi, thuMucDangNhap, maDangNhap);
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
 * - Mutex: xếp hàng để không bao giờ 2 tiến trình CLI chạy song song.
 */
/**
 * SỔ ĐO THỜI GIAN AI (Mr. Đại yêu cầu 01/10: "đo cụ thể rồi đề xuất") — mỗi lượt CLI một dòng data/ai-do-thoi-gian.jsonl:
 * chờ hàng đợi bao lâu, CLI chạy bao lâu, mấy vòng nội bộ, bao nhiêu token ra, có nghĩ dài không, ai gọi (đầu lời dặn).
 */
function ghiDoThoiGian(d: { tVao: number; tBat: number; prompt: string; system?: string; skill: boolean; khongNghi: boolean; model?: string; obj: Record<string, unknown>; choTruoc: number; taiKhoan?: number | string }) {
  try {
    const u = (d.obj?.usage ?? {}) as Record<string, number>;
    const dong = {
      luc: new Date(d.tVao).toISOString(),
      goi: (d.system ?? d.prompt).replace(/\s+/g, " ").slice(0, 70),
      hang_doi_truoc: d.choTruoc,
      cho_ms: d.tBat - d.tVao,
      chay_ms: Date.now() - d.tBat,
      cli_ms: d.obj?.duration_ms ?? null,
      api_ms: d.obj?.duration_api_ms ?? null,
      vong_cli: d.obj?.num_turns ?? null,
      token_ra: u.output_tokens ?? null,
      token_vao: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
      chu_vao: d.prompt.length + (d.system?.length ?? 0),
      skill: d.skill,
      nghi_dai: !d.khongNghi,
      model: d.model ?? null,
      /** model Anthropic THỰC SỰ trả lời (CLI báo trong modelUsage) — để kiểm chọn model ở chat có ăn không */
      thuc_te: Object.keys((d.obj?.modelUsage ?? {}) as Record<string, unknown>),
      /** tài khoản Claude chạy lượt này (1 / 2 / "ca_nhan") */
      tai_khoan: d.taiKhoan ?? 1,
    };
    fs.appendFileSync(thuMucDuLieu("ai-do-thoi-gian.jsonl"), JSON.stringify(dong) + "\n");
  } catch {
    /* đo hỏng không được làm hỏng lượt AI */
  }
}

export function runCliPrompt(
  prompt: string,
  system?: string,
  skill?: TuyChonSkill,
  modelLuot?: string,
  /** Dừng hẳn tiến trình CLI sau chừng này ms (mặc định 420s) — lượt nền như AI góp ý không giữ hàng chờ lâu */
  thoiGianChoMs?: number,
  /** Tắt "nghĩ dài" của CLI (MAX_THINKING_TOKENS=0) — cho lượt trả JSON theo khuôn */
  khongNghi?: boolean
): Promise<string> {
  return chayTrenTaiKhoan(prompt, system, skill, modelLuot, thoiGianChoMs, khongNghi, metaLuotHienTai());
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

/** Câu báo khi không còn tài khoản Claude công ty nào (kèm lối đi tiếp nếu là người đang hỏi) */
async function cauHetCongTy(nguoi: string | null): Promise<string> {
  // Mất đăng nhập thì nói đúng lý do — quản trị phải đăng nhập lại, chờ không tự khỏi
  if (dangMatDangNhap(1) || dangMatDangNhap(2)) {
    const tk = ([1, 2] as SoTk[]).filter((so) => dangMatDangNhap(so)).join(" và ");
    const goi = `Tài khoản Claude ${tk} của công ty mất đăng nhập (mã hết hạn hoặc bị thu hồi) — quản trị đã được báo để đăng nhập lại ở Cài đặt → AI`;
    if (nguoi && coDangNhapCaNhan(nguoi)) return `${goi}; tài khoản Claude cá nhân của anh/chị cũng đang không dùng được.`;
    return nguoi ? `${goi}. Muốn làm tiếp ngay: bấm tên mình ở góc trên → "Tài khoản Claude cá nhân" để nối tài khoản Claude cá nhân.` : `${goi}.`;
  }
  const mo = await gioMoLaiCongTy();
  const luc = mo ? ` (dùng lại khoảng ${gioVN(mo)})` : "";
  if (!nguoi) return `Cả hai tài khoản Claude của công ty đều đang hết hạn mức${luc}.`;
  if (coDangNhapCaNhan(nguoi)) {
    const het = trangThaiCaNhan(nguoi).het_den;
    return `Cả hai tài khoản Claude của công ty${luc} và tài khoản Claude cá nhân của anh/chị${het > Date.now() ? ` (dùng lại khoảng ${gioVN(het)})` : ""} đều đang hết hạn mức — anh/chị chờ tới giờ đó rồi gửi lại giúp em.`;
  }
  return `Cả hai tài khoản Claude của công ty đều đang hết hạn mức${luc}. Muốn làm tiếp ngay: bấm tên mình ở góc trên → "Tài khoản Claude cá nhân" để nối tài khoản Claude cá nhân.`;
}

/**
 * Hai tài khoản Claude (Mr. Đại chốt 02/10, xem lib/ai/tai-khoan-claude.ts): chọn tài khoản, xếp vào hàng chờ CỦA tài khoản đó.
 * Tài khoản báo hết hạn mức → đánh dấu, chạy lại lượt đó NGAY trên tài khoản kia (nếu dùng được) — người hỏi không phải gửi lại.
 * Hết cả tài khoản công ty (04/10) → tài khoản cá nhân của CHÍNH người đang hỏi (đã nối, chưa hết); việc nền (meta.nguoi null)
 * không bao giờ dùng tài khoản cá nhân. Không còn gì → câu báo tiếng Việt có giờ mở lại.
 */
async function chayTrenTaiKhoan(
  prompt: string,
  system: string | undefined,
  skill: TuyChonSkill | undefined,
  modelLuot: string | undefined,
  thoiGianChoMs: number | undefined,
  khongNghi: boolean | undefined,
  meta: MetaLuot,
  daThu: SoTk[] = [],
): Promise<string> {
  const so = await chonTaiKhoan();
  const conCongTy = await conTaiKhoanCongTy();
  // Mốc "hết" của tài khoản công ty chỉ là ĐOÁN 15 phút (CLI không báo giờ mở lại) → thử lại công ty MỘT lần trước khi dùng
  // tài khoản (tiền) của người hỏi — đúng thứ tự TK1 → TK2 → cá nhân (kiểm độc lập 04/10 #4)
  const chiDoanHet = !conCongTy && !daThu.includes(so) && trangThai(so).het_doan === true;
  const hetCongTy = daThu.includes(so) || (!conCongTy && !chiDoanHet);
  if (hetCongTy && meta.nguoi && caNhanDungDuoc(meta.nguoi)) {
    return chayCaNhan(meta.nguoi, prompt, system, skill, modelLuot, thoiGianChoMs, khongNghi, meta);
  }
  // Đã thử mà vẫn quay về tài khoản vừa hết → thôi. Chưa thử lần nào thì vẫn gọi tài khoản chính dù đang đánh dấu hết
  // (mốc "hết" có thể chỉ là đoán 15 phút) — CLI báo hết thật thì xuống nhánh dưới.
  if (daThu.includes(so)) throw new Error(await cauHetCongTy(meta.nguoi));
  try {
    return await runCliPromptTk(so, prompt, system, skill, modelLuot, thoiGianChoMs, khongNghi, meta);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (laLoiHetLuot(msg)) {
      await danhDauHet(so, msg, (e as { hetDen?: number | null }).hetDen ?? null);
      return chayTrenTaiKhoan(prompt, system, skill, modelLuot, thoiGianChoMs, khongNghi, meta, [...daThu, so]);
    }
    // Mất đăng nhập (401 mã hết hạn / bị thu hồi…) → coi như tài khoản tạm không dùng được, chuyển tài khoản còn lại rồi cá nhân,
    // báo chuông quản trị (Mr. Đại chốt 04/10 qua phiên kiểm độc lập)
    if (laLoiDangNhap(msg)) {
      await danhDauHongDangNhap(so, msg);
      // Còn đường khác thì chuyển; hết đường thì giữ câu báo GỐC — nó chỉ đúng chỗ sửa ("bấm Đăng nhập Claude…", 3 cách khi tổ chức chặn)
      if ((await conTaiKhoanCongTy()) || (meta.nguoi && caNhanDungDuoc(meta.nguoi))) {
        return chayTrenTaiKhoan(prompt, system, skill, modelLuot, thoiGianChoMs, khongNghi, meta, [...daThu, so]);
      }
    }
    throw e;
  }
}

/** Lượt chạy trên tài khoản Claude CÁ NHÂN của người hỏi (04/10) — hàng chờ riêng của người đó */
async function chayCaNhan(
  nguoi: string,
  prompt: string,
  system: string | undefined,
  skill: TuyChonSkill | undefined,
  modelLuot: string | undefined,
  thoiGianChoMs: number | undefined,
  khongNghi: boolean | undefined,
  meta: MetaLuot,
): Promise<string> {
  if (!coDangNhapCaNhan(nguoi)) throw new Error(await cauHetCongTy(nguoi));
  try {
    const kq = await runCliPromptDich(
      { tk: trangThaiCaNhan(nguoi), nhan: "ca_nhan", thuMuc: thuMucCaNhan(nguoi), ma: maChayCaNhan(nguoi), dem: () => {} },
      prompt, system, skill, modelLuot, thoiGianChoMs, khongNghi, meta,
    );
    boDauHongCaNhan(nguoi);
    return kq;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (laLoiHetLuot(msg)) {
      danhDauHetCaNhan(nguoi, msg, (e as { hetDen?: number | null }).hetDen ?? null);
      throw new Error(await cauHetCongTy(nguoi));
    }
    // Mất đăng nhập → đánh dấu để thẻ "Tài khoản Claude cá nhân" hiện "Đăng nhập lại" ngay (kiểm độc lập lần 4 #3)
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
  /** CLAUDE_CODE_OAUTH_TOKEN — mã dán tay */
  ma?: string;
  dem: () => void;
}

function runCliPromptTk(
  so: SoTk,
  prompt: string,
  system?: string,
  skill?: TuyChonSkill,
  modelLuot?: string,
  thoiGianChoMs?: number,
  khongNghi?: boolean,
  meta?: MetaLuot
): Promise<string> {
  return runCliPromptDich(
    { tk: trangThai(so), nhan: so === 2 ? "tk2" : "tk1", thuMuc: thuMucChay(so), ma: maChay(so), dem: () => demLuot(so) },
    prompt, system, skill, modelLuot, thoiGianChoMs, khongNghi, meta,
  );
}

function runCliPromptDich(
  dich: DichChay,
  prompt: string,
  system?: string,
  skill?: TuyChonSkill,
  modelLuot?: string,
  thoiGianChoMs?: number,
  khongNghi?: boolean,
  meta?: MetaLuot
): Promise<string> {
  const tk = dich.tk;
  const tkSo = dich.nhan;
  tk.cho ??= [];
  tk.dang_uu_tien ??= 0;
  // Lượt ưu tiên (chat — người đang chờ) chỉ đếm suất của nhau, không bị việc nền chiếm suất (chốt 02/10)
  const uuTien = laUuTien();
  if (uuTien ? tk.dang_uu_tien >= CLI_MAX_PENDING : tk.dang >= CLI_MAX_PENDING) {
    ghiLuotSo(meta, tkSo, "day_hang", Date.now(), 0, undefined, modelLuot);
    return Promise.reject(
      new Error(
        uuTien
          ? `Đang có ${tk.dang_uu_tien} câu hỏi khác chờ trợ lý trả lời — anh/chị chờ vài phút rồi gửi lại giúp em.`
          : `Máy chủ đang xử lý ${tk.dang} yêu cầu AI khác — anh/chị chờ vài phút rồi gửi lại giúp em.`,
      ),
    );
  }
  const thuMucDangNhap = dich.thuMuc;
  const tVao = Date.now();
  let tBat = 0;
  let objCuoi: Record<string, unknown> | undefined;
  const job = async (): Promise<string> => {
    try {
      const kq = await jobGoc();
      ghiLuotSo(meta, tkSo, "ok", tVao, tBat, objCuoi?.usage as Record<string, unknown> | undefined, modelLuot);
      return kq;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ghiLuotSo(meta, tkSo, laLoiHetLuot(msg) ? "het_han_muc" : "loi", tVao, tBat, objCuoi?.usage as Record<string, unknown> | undefined, modelLuot);
      throw e;
    }
  };
  const jobGoc = async (): Promise<string> => {
    tBat = Date.now();
    dich.dem();
    let stdout = await runCliPromptOnce(prompt, system, true, skill, modelLuot, thoiGianChoMs, khongNghi, thuMucDangNhap, dich.ma);
    if (GREETING_RE.test(stdout) && !/^\s*[[{]/.test(stdout)) {
      await delay(1000);
      stdout = await runCliPromptOnce(prompt, system, true, skill, modelLuot, thoiGianChoMs, khongNghi, thuMucDangNhap, dich.ma);
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
    ghiDoThoiGian({ tVao, tBat, prompt, system, skill: !!skill, khongNghi: !!khongNghi, model: modelLuot, obj, choTruoc: tk.dang - 1, taiKhoan: tkSo === "tk2" ? 2 : tkSo === "tk1" ? 1 : tkSo });
    const result = obj?.result;
    // CLI báo lỗi (chưa đăng nhập, hết lượt, tổ chức chặn…) bằng is_error:true + câu tiếng Anh
    // trong result — trước đây câu đó lọt ra làm câu trả lời. Dịch sang tiếng Việt rồi ném.
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
    return result;
  };
  // Xếp hàng CỦA TÀI KHOẢN NÀY, mỗi lúc một lượt. Lượt ưu tiên (chat) chen lên trước mọi lượt nền đang CHỜ (lượt đang chạy
  // dở vẫn chạy xong); các lượt cùng loại giữ thứ tự đến trước làm trước.
  tk.dang += 1;
  if (uuTien) tk.dang_uu_tien += 1;
  return new Promise<string>((resolve, reject) => {
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
function chayLuotTiep(tk: ReturnType<typeof trangThai>): void {
  if (tk.dang_chay) return;
  const j = tk.cho?.shift();
  if (!j) return;
  tk.dang_chay = true;
  j.chay();
}

/**
 * THỬ MÃ ĐĂNG NHẬP dán tay (04/10) bằng MỘT câu thật "Chỉ trả lời đúng một từ: OK" trên model nhẹ (haiku) — `auth status` không
 * kiểm được mã (đo 04/10: mã giả vẫn báo đã đăng nhập; mã sai khi hỏi thật → 401, 0 token). Chạy trong thư mục TẠM riêng nên không
 * đụng hàng chờ / khoá thư mục của tài khoản đang chạy. Lượt thử ghi sổ dùng AI như mọi lượt khác.
 * Tài khoản đang hết hạn mức thì mã vẫn ĐÚNG → nhận, kèm ghi chú.
 */
export async function thuMaDangNhap(ma: string, nhan: TaiKhoanLuot, nguoi: string | null): Promise<{ ok: true; ghi_chu?: string } | { ok: false; loi: string }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sci-thu-ma-"));
  const tVao = Date.now();
  const meta: MetaLuot = { tinh_nang: "lib/ai/thu-ma", nguoi };
  let usage: Record<string, unknown> | undefined;
  try {
    const out = await runCliPromptOnce("Chỉ trả lời đúng một từ: OK", undefined, true, undefined, "haiku", 90_000, true, dir, ma);
    const m = out.match(/\{[\s\S]*\}/);
    let o: Record<string, unknown> = {};
    try {
      o = m ? (JSON.parse(m[0]) as Record<string, unknown>) : {};
    } catch {
      /* xử lý như không có JSON */
    }
    usage = o.usage as Record<string, unknown> | undefined;
    const result = typeof o.result === "string" ? o.result : "";
    if (o.is_error === true) {
      if (laLoiHetLuot(result)) {
        ghiLuotSo(meta, nhan, "het_han_muc", tVao, tVao, usage, "haiku");
        return { ok: true, ghi_chu: "Mã đúng, nhưng tài khoản này đang hết hạn mức — tới giờ mở lại sẽ tự dùng được." };
      }
      ghiLuotSo(meta, nhan, "loi", tVao, tVao, usage, "haiku");
      if (/failed to authenticate|invalid.*token|401/i.test(result) || o.api_error_status === 401) {
        return { ok: false, loi: "Mã không đúng, đã hết hạn hoặc đã bị thu hồi. Chạy lại lệnh claude setup-token rồi dán mã mới." };
      }
      return { ok: false, loi: dichLoiCli(result) ?? `Claude báo lỗi khi thử mã: ${result.slice(0, 200) || "không kèm lý do"}` };
    }
    if (!result) {
      ghiLuotSo(meta, nhan, "loi", tVao, tVao, usage, "haiku");
      return { ok: false, loi: "Claude không trả lời câu thử — thử lại sau ít phút." };
    }
    ghiLuotSo(meta, nhan, "ok", tVao, tVao, usage, "haiku");
    return { ok: true };
  } catch (e) {
    ghiLuotSo(meta, nhan, "loi", tVao, tVao, usage, "haiku");
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, loi: /failed to authenticate|401/i.test(msg) ? "Mã không đúng, đã hết hạn hoặc đã bị thu hồi. Chạy lại lệnh claude setup-token rồi dán mã mới." : msg };
  } finally {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* thư mục tạm còn sót không hại gì */
    }
  }
}

/**
 * NÚT "THỬ TRỢ LÝ AI" TRÊN THẺ TÀI KHOẢN CLAUDE (04/10 trưa — một khuôn thẻ cho TK1, TK2, tài khoản cá nhân): hỏi MỘT câu rất
 * ngắn trên model nhẹ (haiku) bằng ĐÚNG tài khoản đó, đi đúng hàng chờ của tài khoản đó (không chen khoá thư mục của lượt đang
 * chạy). Lộ ra cả lỗi mà kiểm nhanh không thấy: mã dán bị thu hồi, tổ chức chặn gói, hết hạn mức. Lượt thử ghi sổ dùng AI.
 */
export async function thuTaiKhoan(ai: SoTk | { nguoi: string }, nguoiBam: string): Promise<{ ok: boolean; tra_loi?: string; loi?: string; giay: number }> {
  const t0 = Date.now();
  const dich: DichChay =
    typeof ai === "number"
      ? { tk: trangThai(ai), nhan: ai === 2 ? "tk2" : "tk1", thuMuc: thuMucChay(ai), ma: maChay(ai), dem: () => demLuot(ai) }
      : { tk: trangThaiCaNhan(ai.nguoi), nhan: "ca_nhan", thuMuc: thuMucCaNhan(ai.nguoi), ma: maChayCaNhan(ai.nguoi), dem: () => {} };
  const giay = () => Math.round((Date.now() - t0) / 100) / 10;
  try {
    // Người bấm đang đứng chờ → lượt ƯU TIÊN, không xếp sau việc nền (kiểm độc lập lần 2 #1)
    const kq = await chayUuTien(() =>
      runCliPromptDich(dich, "Chỉ trả lời đúng một từ: OK", undefined, undefined, "haiku", 90_000, true, {
        tinh_nang: "lib/ai/thu-tai-khoan",
        nguoi: nguoiBam,
      }),
    );
    if (typeof ai !== "number") boDauHongCaNhan(ai.nguoi);
    return { ok: true, tra_loi: kq.trim().slice(0, 200), giay: giay() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Thử trúng hết hạn mức / mất đăng nhập thì đánh dấu y như lượt thật — thẻ hiện đúng ngay, lượt thật sau không đâm lại vào
    const hetDen = (e as { hetDen?: number | null }).hetDen ?? null;
    if (laLoiHetLuot(msg)) {
      if (typeof ai === "number") await danhDauHet(ai, msg, hetDen);
      else danhDauHetCaNhan(ai.nguoi, msg, hetDen);
    } else if (laLoiDangNhap(msg)) {
      if (typeof ai === "number") await danhDauHongDangNhap(ai, msg);
      else danhDauHongCaNhan(ai.nguoi, msg); // kiểm độc lập lần 4 #3: cá nhân 401 cũng đánh dấu
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

/** Gọi Anthropic Messages API → text trả lời */
async function callAnthropic(cfg: AIConfig, prompt: string, system?: string, dem?: { usage?: Record<string, unknown> }): Promise<string> {
  const body: Record<string, unknown> = {
    model: cfg.model || ANTHROPIC_DEFAULT_MODEL,
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
  const data = (await res.json()) as { content?: Array<{ text?: unknown }>; usage?: Record<string, unknown> };
  if (dem) dem.usage = data.usage;
  const text = data.content?.[0]?.text;
  if (typeof text !== "string") throw new Error("Anthropic API không trả về nội dung text.");
  return text;
}

/** Gọi provider chuẩn OpenAI chat/completions → text trả lời */
async function callOpenAICompat(cfg: AIConfig, prompt: string, system?: string, dem?: { usage?: Record<string, unknown> }): Promise<string> {
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
    usage?: Record<string, unknown>;
  };
  if (dem) dem.usage = data.usage;
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
  /** Model cho riêng lượt này (chip model / cấu hình ai.model_mac_dinh). Rỗng = theo kết nối. */
  model?: string,
  /** Thời gian chờ tối đa của lượt CLI (ms), tính từ lúc CLI bắt đầu chạy (không tính lúc xếp hàng). Rỗng = 420s như cũ. */
  thoiGianChoMs?: number,
  /** Tắt "nghĩ dài" của Claude CLI — cho lượt trả JSON theo khuôn (góp ý, luật AI) */
  khongNghi?: boolean
): Promise<string> {
  return runAIVoi(getAIConfig(), prompt, system, skill, model, thoiGianChoMs, khongNghi);
}

/**
 * runAI kèm NHÃN TÍNH NĂNG cho Sổ dùng AI (Quản lý token AI, 04/10/2026) — mã = đường file gọi, vd "lib/bao-cao-tuan/do-kho";
 * tên tiếng Việt ở lib/ai/thong-ke-ai.ts. Bản build sản phẩm không đọc được ngăn xếp nên chỗ gọi phải tự ghi nhãn.
 */
export function runAIGan(tinhNang: string, ...thamSo: Parameters<typeof runAI>): Promise<string> {
  return voiTinhNang(tinhNang, () => runAI(...thamSo));
}

/**
 * Model của lượt có hợp với kết nối không? Cấu hình `ai.model_mac_dinh` mặc định là tên
 * Claude — gửi tên đó sang OpenAI/Gemini… (hoặc tên GPT sang Claude CLI) chỉ nhận lỗi
 * "model không tồn tại". Không hợp → bỏ, dùng model của kết nối.
 */
export function modelHopVoiKetNoi(cfg: AIConfig, modelLuot?: string): string | undefined {
  const m = (modelLuot ?? "").trim();
  if (m === "") return undefined;
  const laClaude = /claude|opus|sonnet|haiku/i.test(m);
  if (cfg.mode === "claude-cli") return laClaude ? m : undefined;
  if (cfg.mode === "api" && cfg.provider !== "anthropic" && cfg.provider !== "custom" && laClaude) return undefined;
  return m;
}

async function runAIVoi(
  goc: AIConfig,
  prompt: string,
  system?: string,
  skill?: TuyChonSkill,
  model?: string,
  thoiGianChoMs?: number,
  khongNghi?: boolean
): Promise<string> {
  const mLuot = modelHopVoiKetNoi(goc, model);
  const cfg: AIConfig = mLuot ? { ...goc, model: mLuot } : goc;
  if (cfg.mode === "off") {
    throw new Error("Kết nối AI đang TẮT — quản trị viên bật lại ở Cài đặt → AI → Kết nối AI.");
  }
  if (cfg.mode === "claude-cli") {
    return runCliPrompt(prompt, system, skill, cfg.model, thoiGianChoMs, khongNghi);
  }
  // Đường API không có cơ chế skill của CLI — vẫn trả lời được nhưng skill
  // không tự kích hoạt; đường gọi đích danh /tên-skill đã nạp nội dung vào
  // system prompt nên vẫn ép được (chat-agent lo việc đó).
  if (cfg.apiKey === "") {
    throw new Error("Chưa nhập API key — quản trị viên nhập ở Cài đặt → AI → Kết nối AI.");
  }
  const meta = metaLuotHienTai();
  const tVao = Date.now();
  const dem: { usage?: Record<string, unknown> } = {};
  try {
    const kq = cfg.provider === "anthropic" ? await callAnthropic(cfg, prompt, system, dem) : await callOpenAICompat(cfg, prompt, system, dem);
    ghiLuotSo(meta, "api", "ok", tVao, tVao, dem.usage, cfg.model);
    return kq;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ghiLuotSo(meta, "api", /HTTP 429|rate.?limit|quota/i.test(msg) ? "het_han_muc" : "loi", tVao, tVao, dem.usage, cfg.model);
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
export async function testConnection(cfg: AIConfig = getAIConfig()): Promise<TestResult> {
  if (cfg.mode === "off") {
    return {
      ok: false,
      message: "Kết nối AI đang tắt — chọn gói thuê bao Claude hoặc API key ở Cài đặt → AI → Kết nối AI.",
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
        message: `Claude CLI đã cài (${status.version ?? "?"}) nhưng CHƯA đăng nhập — bấm "Đăng nhập Claude" ở Cài đặt → AI → Kết nối AI.`,
      };
    }
    return {
      ok: true,
      message: `Claude CLI sẵn sàng — ${status.version ?? ""}${status.tenGoi ? ` (gói ${status.tenGoi})` : ""}`.trim(),
    };
  }

  // mode = "api"
  if (cfg.apiKey === "") {
    return { ok: false, message: "Chưa nhập API key — nhập ở Cài đặt → AI → Kết nối AI." };
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

// ===== Thử trợ lý AI thật (hỏi một câu ngắn — như nút "Thử trợ lý AI" của HptStart) =====

export interface KetQuaThu {
  ok: boolean;
  /** Câu trả lời (cắt 300 ký tự) khi ok */
  tra_loi?: string;
  /** Lỗi tiếng Việt khi không ok */
  loi?: string;
  giay: number;
}

/**
 * Hỏi AI MỘT câu rất ngắn để chắc nó trả lời được thật. Khác testConnection (không tốn
 * token): chỉ cách này mới lộ ra lỗi kiểu "tổ chức đã tắt gói thuê bao" — đăng nhập vẫn
 * báo thành công, tới lúc gọi thật mới hỏng. Tốn vài chục token.
 */
export async function thuTroLy(cfg: AIConfig = getAIConfig()): Promise<KetQuaThu> {
  const batDau = Date.now();
  const giay = () => Math.round((Date.now() - batDau) / 100) / 10;
  try {
    const traLoi = await runAIVoi(
      cfg,
      "Chào bạn, bạn có đang hoạt động không?",
      "Bạn đang được kiểm tra kết nối. Trả lời DUY NHẤT một câu ngắn bằng tiếng Việt, dưới 15 từ, không hỏi lại.",
      undefined,
      undefined,
      90000
    );
    const s = String(traLoi ?? "").trim();
    if (s === "") return { ok: false, loi: "AI không trả lời gì — thử lại sau ít phút.", giay: giay() };
    return { ok: true, tra_loi: s.slice(0, 300), giay: giay() };
  } catch (e) {
    return { ok: false, loi: e instanceof Error ? e.message : String(e), giay: giay() };
  }
}

// ===== Danh sách model của một nhà cung cấp (hỏi thẳng hãng, lỗi → danh sách dự phòng) =====

export interface ModelChon {
  id: string;
  ten: string;
}

/** Danh sách dự phòng khi chưa có khóa / hãng không trả lời */
export const MODEL_DU_PHONG: Record<AIProvider, ModelChon[]> = {
  anthropic: MODEL_CLAUDE,
  openai: [
    { id: "gpt-5", ten: "GPT-5" },
    { id: "gpt-5-mini", ten: "GPT-5 mini" },
    { id: "gpt-4.1", ten: "GPT-4.1" },
    { id: "gpt-4o", ten: "GPT-4o" },
  ],
  gemini: [
    { id: "gemini-2.5-flash", ten: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro", ten: "Gemini 2.5 Pro" },
  ],
  grok: [
    { id: "grok-4", ten: "Grok 4" },
    { id: "grok-3-mini", ten: "Grok 3 mini" },
  ],
  deepseek: [
    { id: "deepseek-chat", ten: "DeepSeek Chat" },
    { id: "deepseek-reasoner", ten: "DeepSeek Reasoner" },
  ],
  custom: [],
};

/**
 * Model khả dụng của `cfg.provider`: có khóa → GET /models của hãng (20 giây), lỗi hoặc
 * không có khóa → danh sách dự phòng. Không bao giờ ném lỗi.
 */
export async function lietKeModel(cfg: AIConfig): Promise<{ models: ModelChon[]; tuHang: boolean }> {
  const duPhong = MODEL_DU_PHONG[cfg.provider] ?? [];
  if (cfg.apiKey === "") return { models: duPhong, tuHang: false };
  let url: string;
  let headers: Record<string, string>;
  if (cfg.provider === "anthropic") {
    url = "https://api.anthropic.com/v1/models?limit=100";
    headers = { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" };
  } else {
    const base = compatBaseUrl(cfg);
    if (!base) return { models: duPhong, tuHang: false };
    url = `${base}/models`;
    headers = { authorization: `Bearer ${cfg.apiKey}` };
  }
  try {
    const res = await fetchWithTimeout(url, { method: "GET", headers }, 20000);
    if (!res.ok) return { models: duPhong, tuHang: false };
    const j = (await res.json()) as { data?: Array<{ id?: unknown; display_name?: unknown }> };
    const ds = (j.data ?? [])
      .filter((m) => typeof m.id === "string" && m.id !== "")
      .map((m) => {
        const id = String(m.id).replace(/^models\//, "");
        return { id, ten: typeof m.display_name === "string" && m.display_name !== "" ? m.display_name : id };
      });
    return ds.length > 0 ? { models: ds, tuHang: true } : { models: duPhong, tuHang: false };
  } catch {
    return { models: duPhong, tuHang: false };
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
