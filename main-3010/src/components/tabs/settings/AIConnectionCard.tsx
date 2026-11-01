"use client";

// Thẻ "🤖 Kết nối AI" — trung tâm cấu hình AI của hệ thống, 2 con đường:
//   1. "claude-cli" — dùng gói Claude Pro/Max qua Claude Code CLI cài trên máy
//      chủ (khuyên dùng, KHÔNG tốn phí API). Trạng thái đọc từ GET /api/ai/status.
//   2. "api"        — gọi API mô hình khác (Anthropic/OpenAI/Gemini/Grok/DeepSeek/
//      OpenAI-compatible tùy chỉnh). Key lưu server-side, GET chỉ trả mask.
// Chỉ PM và Admin sửa được (cửa "caidat", quyen.ts).

import { useCallback, useEffect, useRef, useState } from "react";
import { InfoBox, SectionCard } from "@/components/common/SectionCard";
import { Pill } from "@/components/common/StatusBadge";

type AiMode = "off" | "claude-cli" | "api";

type AiProvider = "anthropic" | "openai" | "gemini" | "grok" | "deepseek" | "custom";

const INPUT_CLASS =
  "w-full min-w-0 rounded-sm border border-border bg-bg2 px-2.5 py-1.5 text-[12.5px] text-text outline-none transition-colors focus:border-accent";

// ===== Kiểu response của GET /api/ai/status (hợp đồng với backend) =====
interface AiStatusResponse {
  ok: boolean;
  mode: "claude-cli" | "api" | "off";
  cli: { installed: boolean; loggedIn: boolean; version?: string; plan?: string } | null;
  api: { provider: string; model: string; keyMasked: string } | null;
}

// ===== Hợp đồng với 3 API cài/đăng nhập Claude CLI (agent khác đang xây) =====
/** POST /api/ai/install-cli — khởi động cài ở nền, trả về NGAY */
interface InstallStartResponse {
  ok: boolean;
  started: boolean;
  message?: string;
}

/** GET /api/ai/install-cli — trạng thái + log để hiển thị */
interface InstallStatusResponse {
  ok: boolean;
  running: boolean;
  done: boolean;
  success: boolean;
  log: string[];
  message?: string;
}

// ===== Kiểu response tối thiểu của GET /api/settings =====
interface SettingsField {
  value: string; // secret: "••••abcd" · thường: giá trị đầy đủ · rỗng: ""
  hasValue: boolean;
}

interface SettingsGetResponse {
  ok: boolean;
  fields?: Partial<Record<string, SettingsField>>;
  message?: string;
}

// ===== Danh sách nhà cung cấp + model mặc định (placeholder) =====
const PROVIDERS: { id: AiProvider; label: string; defaultModel: string }[] = [
  { id: "anthropic", label: "Claude API (Anthropic)", defaultModel: "claude-sonnet-4-5" },
  { id: "openai", label: "OpenAI GPT", defaultModel: "gpt-5" },
  { id: "gemini", label: "Google Gemini", defaultModel: "gemini-2.5-flash" },
  { id: "grok", label: "xAI Grok", defaultModel: "grok-4" },
  { id: "deepseek", label: "DeepSeek", defaultModel: "deepseek-chat" },
  { id: "custom", label: "Tùy chỉnh (OpenAI-compatible)", defaultModel: "" },
];

function providerLabel(id: string): string {
  for (const p of PROVIDERS) {
    if (p.id === id) return p.label;
  }
  return id;
}

function defaultModelOf(id: AiProvider): string {
  for (const p of PROVIDERS) {
    if (p.id === id) return p.defaultModel;
  }
  return "";
}

function isProvider(v: string): v is AiProvider {
  return (
    v === "anthropic" ||
    v === "openai" ||
    v === "gemini" ||
    v === "grok" ||
    v === "deepseek" ||
    v === "custom"
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent align-middle"
      aria-label="Đang xử lý"
    />
  );
}

/**
 * Lưu 1 key qua PUT /api/settings (hợp đồng mới); server chưa có PUT (405)
 * thì rơi về POST {key, value} — cùng cơ chế các key cũ, hiệu lực ngay.
 */
async function saveSetting(key: string, value: string): Promise<void> {
  const body = JSON.stringify({ key, value });
  const headers = { "Content-Type": "application/json" };
  let res = await fetch("/api/settings", { method: "PUT", headers, body });
  if (res.status === 405) {
    res = await fetch("/api/settings", { method: "POST", headers, body });
  }
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(json?.message ?? `Lưu "${key}" thất bại (HTTP ${res.status})`);
  }
}

/** Khối lệnh copy được trong hướng dẫn 5 bước */
function CopyCommand({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => undefined);
  };
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 align-middle">
      <code className="break-all rounded-sm border border-border-light bg-bg2 px-1.5 py-0.5 font-mono text-[11.5px] text-accent">
        {text}
      </code>
      <button
        type="button"
        onClick={copy}
        title="Copy lệnh"
        className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[10.5px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        {copied ? "✓ Đã copy" : "📋 Copy"}
      </button>
    </span>
  );
}

function GuideStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/50 bg-accent-soft text-[11px] font-bold text-accent">
        {n}
      </span>
      <span className="text-[12.5px] leading-relaxed text-text-secondary">{children}</span>
    </li>
  );
}

/** Thẻ "🤖 Kết nối AI" — PM cấu hình chế độ AI; engineer xem trạng thái */
export function AIConnectionCard() {
  // --- quyền + cấu hình đã lưu ---
  const [forbidden, setForbidden] = useState(false); // không phải PM → chỉ xem trạng thái
  const [savedKeyMask, setSavedKeyMask] = useState<string | null>(null);

  // --- form (chỉ PM và Admin) ---
  const [mode, setMode] = useState<AiMode>("off");
  const [provider, setProvider] = useState<AiProvider>("anthropic");
  const [keyInput, setKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");

  // --- trạng thái từ GET /api/ai/status ---
  const [status, setStatus] = useState<AiStatusResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // --- hành động ---
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  // --- cài đặt / đăng nhập Claude CLI tự động (chỉ PM và Admin) ---
  const [installing, setInstalling] = useState(false); // đang cài → poll 2s/lần
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [installDone, setInstallDone] = useState(false); // vừa cài xong → vẫn hiện log
  const logRef = useRef<HTMLDivElement | null>(null);
  const idleTicks = useRef(0); // đếm số lần poll thấy "không chạy" để tự dừng

  const showToast = useCallback((text: string, ok: boolean) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  /** Đọc cấu hình đã lưu (chỉ PM và Admin đọc được — loại khác nhận 403 → chế độ chỉ xem) */
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as SettingsGetResponse;
      if (!json.ok || !json.fields) return;
      setForbidden(false);
      const f = json.fields;
      const savedMode = f.aiMode?.value;
      setMode(savedMode === "claude-cli" || savedMode === "api" ? savedMode : "off");
      const savedProvider = f.aiProvider?.value ?? "";
      if (isProvider(savedProvider)) setProvider(savedProvider);
      setModelInput(f.aiModel?.value ?? "");
      setBaseUrlInput(f.aiBaseUrl?.value ?? "");
      setSavedKeyMask(f.aiApiKey?.hasValue ? f.aiApiKey.value : null);
      setKeyInput("");
    } catch {
      // không chặn card — trạng thái vẫn hiển thị từ /api/ai/status
    }
  }, []);

  /** Kiểm tra trạng thái AI (pm|engineer đều gọi được) */
  const checkStatus = useCallback(async () => {
    setChecking(true);
    setStatusError(null);
    try {
      const res = await fetch("/api/ai/status", { cache: "no-store" });
      if (!res.ok) throw new Error(`API trả HTTP ${res.status}`);
      setStatus((await res.json()) as AiStatusResponse);
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Không gọi được /api/ai/status",
      );
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
    void checkStatus();
  }, [loadSettings, checkStatus]);

  /**
   * Poll GET /api/ai/install-cli mỗi 2 giây khi đang cài.
   * Tự dừng khi: cài xong · lỗi mạng · rời chế độ claude-cli · component unmount.
   */
  useEffect(() => {
    if (!installing || mode !== "claude-cli") return;
    let stopped = false;

    const finish = (success: boolean, note?: string) => {
      stopped = true;
      setInstalling(false);
      setInstallDone(true);
      showToast(
        success ? "✓ Đã cài Claude CLI" : `✗ ${note ?? "Cài thất bại — xem log bên dưới"}`,
        success,
      );
      void checkStatus();
    };

    const tick = async () => {
      try {
        const res = await fetch("/api/ai/install-cli", { cache: "no-store" });
        if (!res.ok) throw new Error(`API trả HTTP ${res.status}`);
        const json = (await res.json()) as InstallStatusResponse;
        if (stopped) return;
        if (json.log && json.log.length > 0) setInstallLog(json.log);
        if (json.done) {
          finish(json.success === true);
          return;
        }
        if (json.running) {
          idleTicks.current = 0;
        } else {
          idleTicks.current += 1;
          if (idleTicks.current >= 5) {
            finish(false, "Không thấy tiến trình cài đặt đang chạy — xem log bên dưới");
          }
        }
      } catch (err) {
        if (stopped) return;
        stopped = true;
        setInstalling(false);
        setInstallDone(true);
        showToast(
          `✗ ${err instanceof Error ? err.message : "Mất kết nối khi theo dõi cài đặt"}`,
          false,
        );
      }
    };

    void tick();
    const id = window.setInterval(() => {
      if (!stopped) void tick();
    }, 2000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [installing, mode, showToast, checkStatus]);

  /** Khung log luôn cuộn xuống dòng mới nhất */
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [installLog, installing]);

  /** ⬇️ Bắt đầu cài Claude CLI tự động trên máy chủ */
  const startInstall = async () => {
    setInstallLog([]);
    setInstallDone(false);
    idleTicks.current = 0;
    try {
      const res = await fetch("/api/ai/install-cli", { method: "POST" });
      const json = (await res.json().catch(() => null)) as InstallStartResponse | null;
      if (!res.ok || !json?.ok) {
        showToast(
          `✗ ${
            json?.message ??
            (res.status === 403 || res.status === 401
              ? "Chỉ PM và Admin được cài đặt Claude CLI."
              : `Không khởi động được cài đặt (HTTP ${res.status})`)
          }`,
          false,
        );
        return;
      }
      if (json.message) setInstallLog([json.message]);
      setInstalling(true);
    } catch (err) {
      showToast(
        `✗ ${err instanceof Error ? err.message : "Không gọi được /api/ai/install-cli"}`,
        false,
      );
    }
  };

  /** 💾 Lưu cấu hình theo chế độ đang chọn → reload mask + trạng thái */
  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await saveSetting("aiMode", mode);
      if (mode === "api") {
        await saveSetting("aiProvider", provider);
        if (keyInput.trim() !== "") await saveSetting("aiApiKey", keyInput.trim());
        await saveSetting("aiModel", modelInput.trim());
        if (provider === "custom") await saveSetting("aiBaseUrl", baseUrlInput.trim());
      }
      showToast("✓ Đã lưu cấu hình AI — hiệu lực ngay.", true);
      await loadSettings();
      await checkStatus();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Lưu cấu hình AI thất bại");
    } finally {
      setSaving(false);
    }
  };

  /** ⚡ Kiểm tra kết nối thật (POST /api/ai/test) → toast kết quả */
  const test = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/ai/test", { method: "POST" });
      const json = (await res.json().catch(() => null)) as
        | { ok: boolean; message?: string }
        | null;
      if (json?.ok) {
        showToast(`✓ ${json.message ?? "Kết nối AI hoạt động."}`, true);
      } else {
        showToast(
          `✗ ${json?.message ?? `Kiểm tra thất bại (HTTP ${res.status})`}`,
          false,
        );
      }
    } catch (err) {
      showToast(
        `✗ ${err instanceof Error ? err.message : "Không gọi được /api/ai/test"}`,
        false,
      );
    } finally {
      setTesting(false);
    }
  };

  // ===== Pill trạng thái hiện tại (từ /api/ai/status) =====
  const renderStatusPills = () => {
    if (checking) {
      return (
        <Pill tone="muted">
          <Spinner /> Đang kiểm tra…
        </Pill>
      );
    }
    if (!status) return <Pill tone="muted">Chưa kiểm tra</Pill>;
    if (status.mode === "off") return <Pill tone="muted">AI đang tắt</Pill>;
    if (status.mode === "claude-cli") {
      const cli = status.cli;
      if (!cli) return <Pill tone="yellow">Chưa đọc được trạng thái CLI</Pill>;
      return (
        <>
          {cli.installed ? (
            <Pill tone="green">
              CLI đã cài{cli.version ? ` (v${cli.version})` : ""}
            </Pill>
          ) : (
            <Pill tone="red">CLI chưa cài</Pill>
          )}
          {cli.loggedIn ? (
            <Pill tone="green">
              Đã đăng nhập{cli.plan ? ` — gói ${cli.plan}` : ""}
            </Pill>
          ) : (
            <Pill tone="red">Chưa đăng nhập</Pill>
          )}
        </>
      );
    }
    // mode === "api"
    const api = status.api;
    if (!api) return <Pill tone="yellow">Chưa cấu hình API</Pill>;
    return (
      <Pill tone="green">
        {providerLabel(api.provider)} · {api.model || "model mặc định"} · key{" "}
        {api.keyMasked}
      </Pill>
    );
  };

  // Trạng thái CLI rút gọn (dùng cho hàng nút hành động chế độ Claude Pro/Max)
  const cliStatus = status?.cli ?? null;
  const cliInstalled = cliStatus?.installed === true;
  const cliLoggedIn = cliStatus?.loggedIn === true;

  const modelPlaceholder =
    provider === "custom"
      ? "Tên model của server (ví dụ: llama-3.3-70b)"
      : `Mặc định: ${defaultModelOf(provider)}`;

  const MODE_OPTIONS: { key: AiMode; label: string; desc: string }[] = [
    { key: "off", label: "Tắt", desc: "Không chạy phân tích AI." },
    {
      key: "claude-cli",
      label: "Gói Claude Pro/Max (khuyên dùng — không tốn phí API)",
      desc: "Dùng Claude Code CLI đăng nhập tài khoản Pro/Max trên máy chủ.",
    },
    {
      key: "api",
      label: "API mô hình khác",
      desc: "Gọi API trả phí: Anthropic, OpenAI, Gemini, Grok, DeepSeek hoặc server tùy chỉnh.",
    },
  ];

  return (
    <SectionCard
      title="🤖 Kết nối AI"
      subtitle="Chọn cách hệ thống chạy phân tích AI (dự báo + cảnh báo) — gói Claude Pro/Max qua CLI hoặc API mô hình khác"
      actions={
        <button
          type="button"
          onClick={() => void checkStatus()}
          disabled={checking}
          className="rounded-sm border border-accent/50 bg-accent-soft px-3 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking ? (
            <>
              <Spinner /> Đang kiểm tra…
            </>
          ) : (
            <>🔄 Kiểm tra lại</>
          )}
        </button>
      }
    >
      <div className="space-y-3">
        {/* ===== Dòng trạng thái hiện tại ===== */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-semibold text-text-secondary">
            Trạng thái hiện tại:
          </span>
          {renderStatusPills()}
        </div>

        {statusError && (
          <div className="rounded-sm border border-red/30 bg-red-soft px-3 py-2 text-[11.5px] text-red">
            Không kiểm tra được trạng thái AI: {statusError}
          </div>
        )}

        {forbidden && (
          <div className="rounded-sm border border-yellow/30 bg-yellow-soft px-3 py-2 text-[11.5px] text-yellow">
            Chỉ PM và Admin được sửa cấu hình AI. Bạn vẫn xem được trạng thái và bấm{" "}
            <b>🔄 Kiểm tra lại</b>.
          </div>
        )}

        {/* ===== 3 lựa chọn chế độ ===== */}
        <div className="space-y-2">
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.key}
              className={`flex items-start gap-2.5 rounded-sm border p-3 transition-colors ${
                mode === opt.key
                  ? "border-accent/60 bg-accent-soft"
                  : "border-border-light bg-bg2/40"
              } ${forbidden ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            >
              <input
                type="radio"
                name="aiMode"
                className="mt-0.5 accent-current"
                checked={mode === opt.key}
                disabled={forbidden || saving}
                onChange={() => setMode(opt.key)}
              />
              <span>
                <span className="block text-[12.5px] font-bold text-text">{opt.label}</span>
                <span className="mt-0.5 block text-[11px] text-text-muted">{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>

        {/* ===== Chế độ Claude Pro/Max: trạng thái CLI + hướng dẫn 5 bước ===== */}
        {mode === "claude-cli" && (
          <div className="space-y-2.5 rounded-sm border border-border-light bg-bg2/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] font-bold text-text">
                Claude Code CLI trên máy chủ
              </span>
              {renderStatusPills()}
            </div>

            {/* ===== Hàng nút hành động tự động (chỉ PM và Admin) ===== */}
            {!forbidden && (
              <>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Bấm <b>Cài đặt tự động</b> — hệ thống tự tải Claude CLI về máy chủ đang chạy
                  ứng dụng (cần Node.js, khoảng 1-3 phút).
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {installing ? (
                    <button
                      type="button"
                      disabled
                      className="rounded-sm border border-accent/50 bg-accent-soft px-4 py-1.5 text-[12px] font-bold text-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Spinner /> Đang cài đặt… (1-3 phút)
                    </button>
                  ) : !cliInstalled ? (
                    <button
                      type="button"
                      onClick={() => void startInstall()}
                      className="rounded-sm border border-accent/50 bg-accent-soft px-4 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ⬇️ Cài đặt tự động
                    </button>
                  ) : (
                    <>
                      {cliLoggedIn && (
                        <Pill tone="green">
                          ✓ Sẵn sàng
                          {cliStatus?.plan ? ` — gói ${cliStatus.plan}` : ""}
                          {cliStatus?.version ? ` · v${cliStatus.version}` : ""}
                        </Pill>
                      )}
                      {/* 04/10 (Quản lý token AI): đăng nhập / đăng xuất ở thẻ Tài khoản 1 / 2 ngay bên dưới — link + dán mã,
                          mở được trên điện thoại; cửa sổ dòng lệnh trên máy chủ đã bỏ */}
                      <span className="text-[11.5px] text-text-muted">
                        Đăng nhập / đăng xuất tài khoản Claude ở khối <b>Tài khoản Claude của công ty</b> ngay bên dưới.
                      </span>
                    </>
                  )}
                </div>

                {/* Khung log cài đặt — chỉ hiện khi đang cài hoặc vừa cài xong */}
                {(installing || installDone) && (
                  <div
                    ref={logRef}
                    className="max-h-40 overflow-y-auto rounded-sm border border-border bg-black/60 p-2 font-mono text-[11px] leading-relaxed text-text-secondary"
                  >
                    {installLog.length === 0 ? (
                      <div className="text-text-muted">Đang khởi động trình cài đặt…</div>
                    ) : (
                      installLog.map((line, i) => (
                        <div key={i} className="whitespace-pre-wrap break-all">
                          {line}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}

            {/* ===== Hướng dẫn 5 bước gõ tay — thu gọn, mặc định đóng ===== */}
            <details className="rounded-sm border border-border-light bg-bg2">
              <summary className="cursor-pointer select-none px-3 py-2 text-[11.5px] font-bold text-accent">
                Hoặc cài thủ công bằng lệnh
              </summary>
              <ol className="space-y-2.5 border-t border-border-light p-3">
                <GuideStep n={1}>
                  Cài <b>Node.js</b> bản LTS trên máy chủ chạy hệ thống (tải tại{" "}
                  <a
                    href="https://nodejs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-accent underline-offset-2 hover:underline"
                  >
                    nodejs.org ↗
                  </a>
                  ).
                </GuideStep>
                <GuideStep n={2}>
                  Mở PowerShell, cài Claude Code CLI:{" "}
                  <CopyCommand text="npm install -g @anthropic-ai/claude-code" />
                </GuideStep>
                <GuideStep n={3}>
                  Quay lại đây bấm <b>🔄 Kiểm tra lại</b> rồi đăng nhập ở khối <b>Tài khoản Claude của công ty</b> bên
                  dưới (bấm <b>Đăng nhập Claude</b>, mở link, dán mã trang Claude hiện ra).
                </GuideStep>
              </ol>
            </details>
          </div>
        )}

        {/* ===== Chế độ API: provider + key + model (+ base URL) ===== */}
        {mode === "api" && !forbidden && (
          <div className="space-y-2.5 rounded-sm border border-border-light bg-bg2/40 p-3">
            <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[220px_1fr]">
              <div className="text-[11.5px] font-semibold text-text-secondary">
                Nhà cung cấp
              </div>
              <select
                className={`${INPUT_CLASS} md:max-w-[320px]`}
                value={provider}
                disabled={saving}
                onChange={(e) => {
                  const v = e.target.value;
                  if (isProvider(v)) setProvider(v);
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[220px_1fr]">
              <div className="text-[11.5px] font-semibold text-text-secondary">
                API key
                {savedKeyMask && (
                  <span className="ml-1.5 align-middle text-[10px] font-bold text-green">
                    ●
                  </span>
                )}
              </div>
              <input
                type="password"
                className={INPUT_CLASS}
                value={keyInput}
                placeholder={
                  savedKeyMask
                    ? `Đang lưu ${savedKeyMask} — nhập để thay key mới`
                    : "Dán API key của nhà cung cấp…"
                }
                onChange={(e) => setKeyInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={saving}
              />
            </div>

            <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[220px_1fr]">
              <div className="text-[11.5px] font-semibold text-text-secondary">Model</div>
              <input
                type="text"
                className={INPUT_CLASS}
                value={modelInput}
                placeholder={modelPlaceholder}
                onChange={(e) => setModelInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={saving}
              />
            </div>

            {provider === "custom" && (
              <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-[220px_1fr]">
                <div className="text-[11.5px] font-semibold text-text-secondary">
                  Base URL
                </div>
                <input
                  type="text"
                  className={INPUT_CLASS}
                  value={baseUrlInput}
                  placeholder="https://ten-server.com/v1 (endpoint OpenAI-compatible)"
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={saving}
                />
              </div>
            )}

            <p className="text-[10.5px] text-text-muted">
              Key được lưu trên máy chủ, hiển thị che; tính phí theo nhà cung cấp.
            </p>
          </div>
        )}

        {saveError && (
          <div className="rounded-sm border border-red/30 bg-red-soft px-3 py-2 text-[11.5px] text-red">
            {saveError}
          </div>
        )}

        {/* ===== Nút hành động ===== */}
        {!forbidden && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || testing}
              className="rounded-sm border border-accent/50 bg-accent-soft px-4 py-1.5 text-[12px] font-bold text-accent transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Spinner /> Đang lưu…
                </>
              ) : (
                <>💾 Lưu</>
              )}
            </button>
            <button
              type="button"
              onClick={() => void test()}
              disabled={saving || testing}
              className="rounded-sm border border-border px-4 py-1.5 text-[12px] font-bold text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {testing ? (
                <>
                  <Spinner /> Đang kiểm tra…
                </>
              ) : (
                <>⚡ Kiểm tra kết nối</>
              )}
            </button>
          </div>
        )}

        <InfoBox title="📐 Hệ thống dùng AI để làm gì">
          AI đọc tiến độ + báo cáo tuần rồi sinh <b>dự báo tuần tới</b> và{" "}
          <b>3 nhóm cảnh báo</b> (tab Cảnh báo → nút <b>🤖 Chạy phân tích AI</b>). Chế độ{" "}
          <b>Gói Claude Pro/Max</b> chạy qua Claude Code CLI trên máy chủ — không phát sinh
          phí API. Chế độ <b>API</b> gọi trực tiếp nhà cung cấp đã chọn — tính phí theo
          lượng dùng.
        </InfoBox>
      </div>

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 rounded border px-4 py-2.5 text-[12.5px] font-semibold shadow-card ${
            toast.ok
              ? "border-green/30 bg-surface text-green"
              : "border-red/30 bg-surface text-red"
          }`}
        >
          {toast.text}
        </div>
      )}
    </SectionCard>
  );
}
