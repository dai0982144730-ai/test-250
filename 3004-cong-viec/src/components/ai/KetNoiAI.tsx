"use client";

// ============================================================
// THẺ "KẾT NỐI AI" — dùng CHUNG cho Cài đặt → AI và trang Kỹ năng AI.
// Bố cục, các bước, câu chữ lấy theo HptStart (frontend/src/pages/CaiDatAI.jsx), đổi màu theo SCI công việc:
//
//   [⚡ Đang dùng: …]                                   [↻ Làm mới]
//   Chế độ hoạt động
//   ( ) Gói thuê bao (Claude Pro/Max)   ( ) API key
//   ─────────── chỉ hiện panel của chế độ đang chọn ───────────
//
// Radio chọn panel để XEM/CẤU HÌNH; nhãn "đang dùng" cho biết thực tế hệ thống đang chạy bằng gì.
// Chỉ người có quyền cau_hinh.sua (hoặc quản trị) thấy nút; người khác chỉ xem trạng thái.
// Khác HptStart: Claude CLI nằm trên MÁY CHỦ (không phải máy người bấm) — cài chạy ngầm có nhật ký,
// đăng nhập từng tài khoản Claude bằng link + dán mã (thẻ TheTaiKhoanClaude, 04/10); khóa API không bao giờ về trình duyệt (chỉ dạng che sk-…abcd).
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { MODEL_CLAUDE } from "@/lib/ai/danh-muc-model";
import { fmtSo } from "@/lib/format";
import { AlertTriangle, CheckCircle2, Download, Eye, EyeOff, Power, RefreshCw, Save, Zap } from "lucide-react";
import { LOP_O_NHAP, Nut, goiApi, useThongBaoNhanh } from "@/components/layout/giao-dien";
import { TheTaiKhoanClaude, type KetQuaThe } from "@/components/ai/TheTaiKhoanClaude";

// ===== Kiểu dữ liệu từ API =====

interface TrangThaiCli {
  installed: boolean;
  loggedIn: boolean;
  version?: string;
  plan?: string;
  tenGoi?: string;
  email?: string;
}

export interface TrangThaiAI {
  ok: boolean;
  coTheSua: boolean;
  mode: "claude-cli" | "api" | "off";
  cli: TrangThaiCli;
  api: { provider: string; model: string; keyMasked?: string; coKhoa: boolean } | null;
}

interface KetNoi {
  mode: "claude-cli" | "api" | "off";
  provider: string;
  model: string;
  modelCli: string;
  baseUrl: string;
  keyMasked: string;
  nhaCungCap: Record<string, { coKhoa: boolean; keyMasked: string; model: string }>;
}

interface KetQuaThu {
  ok: boolean;
  tra_loi?: string;
  loi?: string;
  giay: number;
}

// ===== Hằng số hiển thị (theo HptStart, thêm Grok + tùy chỉnh của SCI công việc) =====

const MODEL_THUE_BAO = [{ id: "", ten: "Theo Cài đặt → AI → Model mặc định" }, ...MODEL_CLAUDE];

const NHA_CUNG_CAP = [
  { ma: "anthropic", ten: "Anthropic (Claude API)", layKey: "console.anthropic.com → Settings → API Keys", cho: "sk-ant-…", chu: "A" },
  { ma: "openai", ten: "OpenAI (ChatGPT)", layKey: "platform.openai.com → API keys", cho: "sk-…", chu: "O" },
  { ma: "gemini", ten: "Google Gemini", layKey: "aistudio.google.com → Get API key", cho: "AIza…", chu: "G" },
  { ma: "grok", ten: "xAI Grok", layKey: "console.x.ai → API Keys", cho: "xai-…", chu: "X" },
  { ma: "deepseek", ten: "DeepSeek", layKey: "platform.deepseek.com → API keys", cho: "sk-…", chu: "D" },
  { ma: "custom", ten: "Tùy chỉnh (chuẩn OpenAI)", layKey: "trang quản trị của máy chủ AI đó", cho: "khóa của máy chủ", chu: "C" },
] as const;

function tenDangDung(tt: TrangThaiAI): string {
  if (tt.mode === "claude-cli") return "Tài khoản Claude (Pro/Max)";
  if (tt.mode === "api") return NHA_CUNG_CAP.find((n) => n.ma === tt.api?.provider)?.ten ?? tt.api?.provider ?? "API key";
  return "Chưa bật — AI đang tắt";
}

const THE_PANEL = "rounded-sm border border-border bg-surface p-4";
const HOP_TRANG_THAI = "mb-4 rounded-sm border border-border-light bg-bg px-3.5 py-3";

// ===== Nút thử trợ lý AI — dùng chung cho cả hai chế độ =====

function NutThu({ mode, provider, disabled, bao }: { mode: "claude-cli" | "api"; provider?: string; disabled?: boolean; bao: (c: string, t?: boolean) => void }) {
  const [dangThu, setDangThu] = useState<"" | "that" | "nhanh">("");
  const [kq, setKq] = useState<KetQuaThu | null>(null);

  async function thu(that: boolean) {
    setDangThu(that ? "that" : "nhanh");
    setKq(null);
    const batDau = Date.now();
    try {
      if (that) {
        const r = await goiApi<KetQuaThu>("/api/ai/test", { body: { thuThat: true, mode, provider } });
        setKq(r);
        if (r.ok) bao(`Trợ lý AI đang hoạt động (${fmtSo(r.giay, 1)}s).`);
        else bao(r.loi || "Không gọi được trợ lý AI.", false);
      } else {
        const r = await goiApi<{ ok: boolean; message: string }>("/api/ai/test", { body: { mode, provider } });
        const giay = Math.round((Date.now() - batDau) / 100) / 10;
        setKq(r.ok ? { ok: true, tra_loi: r.message, giay } : { ok: false, loi: r.message, giay });
        bao(r.message, r.ok);
      }
    } catch (e) {
      const loi = e instanceof Error ? e.message : "Không gọi được trợ lý AI.";
      setKq({ ok: false, loi, giay: 0 });
      bao(loi, false);
    } finally {
      setDangThu("");
    }
  }

  return (
    <>
      <Nut onClick={() => void thu(true)} disabled={disabled || dangThu !== ""} title="Hỏi AI một câu rất ngắn — tốn vài chục token, lộ ra cả lỗi kiểu tổ chức chặn gói thuê bao">
        <Zap className="h-3.5 w-3.5" />
        {dangThu === "that" ? "Đang hỏi thử…" : "Thử trợ lý AI"}
      </Nut>
      <Nut kieu="nhat" onClick={() => void thu(false)} disabled={disabled || dangThu !== ""} title="Chỉ kiểm tra đăng nhập / khóa — không tốn token">
        {dangThu === "nhanh" ? "Đang kiểm tra…" : "Kiểm tra nhanh (không tốn token)"}
      </Nut>
      {kq && (
        <div className={`mt-3 w-full rounded-sm border px-3 py-2.5 text-[12px] ${kq.ok ? "border-green/40" : "border-red/40"}`}>
          <div className="mb-1 flex items-center gap-2 font-semibold">
            {kq.ok ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green" />
                <span className="text-green">Hoạt động bình thường</span>
                {kq.giay > 0 && <span className="font-normal text-text-muted">· {fmtSo(kq.giay, 1)} giây</span>}
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-red" />
                <span className="text-red">Chưa gọi được</span>
              </>
            )}
          </div>
          <div className={`whitespace-pre-line ${kq.ok ? "italic text-text-secondary" : "text-text-secondary"}`}>{kq.ok ? `“${kq.tra_loi}”` : kq.loi}</div>
        </div>
      )}
    </>
  );
}

// ===== Thẻ chọn chế độ (radio) =====

function TheChon({ chon, onChon, tieuDe, moTa, dangDung }: { chon: boolean; onChon: () => void; tieuDe: string; moTa: string; dangDung: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chon}
      onClick={onChon}
      className={`flex flex-1 items-start gap-3 rounded-sm border p-3.5 text-left transition ${chon ? "border-accent" : "border-border hover:border-accent/50"}`}
    >
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${chon ? "border-accent" : "border-border"}`}>
        {chon && <span className="h-2 w-2 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-text">
          {tieuDe}
          {dangDung && <span className="rounded-sm border border-green/40 px-1.5 text-[10.5px] font-semibold text-green">đang dùng</span>}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-text-muted">{moTa}</span>
      </span>
    </button>
  );
}

// ===== Dò trạng thái mỗi 3 giây tới khi xong / hết hạn (như HptStart) =====

function useDoLai() {
  const conSong = useRef(true);
  useEffect(() => {
    conSong.current = true;
    return () => {
      conSong.current = false;
    };
  }, []);
  return useCallback(<T,>(hoi: () => Promise<T>, o: { xong: (s: T) => boolean; hanMs: number; khiMoi?: (s: T) => void; khiXong: (s: T) => void; khiHetHan: () => void }) => {
    const hetHanLuc = Date.now() + o.hanMs;
    const chay = async () => {
      if (!conSong.current) return;
      let s: T | null = null;
      try {
        s = await hoi();
      } catch {
        /* mất kết nối tạm thời — cứ thử lại */
      }
      if (!conSong.current) return;
      if (s !== null) o.khiMoi?.(s);
      if (s !== null && o.xong(s)) return o.khiXong(s);
      if (Date.now() < hetHanLuc) return void setTimeout(() => void chay(), 3000);
      o.khiHetHan();
    };
    setTimeout(() => void chay(), 3000);
  }, []);
}

// ===== Panel: gói thuê bao =====

function PanelThueBao({
  tt,
  kn,
  dangDung,
  ban,
  setBan,
  lamMoi,
  bao,
}: {
  tt: TrangThaiAI;
  kn: KetNoi | null;
  dangDung: boolean;
  ban: boolean;
  setBan: (b: boolean) => void;
  lamMoi: (imLang?: boolean) => Promise<TrangThaiAI | null>;
  bao: (c: string, t?: boolean) => void;
}) {
  const cli = tt.cli;
  const daCai = cli.installed;
  const sua = tt.coTheSua;
  const [model, setModel] = useState(kn?.modelCli ?? "");
  const [nhatKy, setNhatKy] = useState<string[] | null>(null);
  const doLai = useDoLai();

  useEffect(() => setModel(kn?.modelCli ?? ""), [kn?.modelCli]);

  async function caiDat(batBuoc: boolean) {
    if (batBuoc && !window.confirm("Cài lại Claude CLI trên máy chủ?\n\nChạy lại npm install -g @anthropic-ai/claude-code (1–3 phút). Phiên đăng nhập hiện có được giữ nguyên.")) return;
    setBan(true);
    try {
      const r = await goiApi<{ already?: boolean; started: boolean; message: string }>("/api/ai/install-cli", { body: { bat_buoc: batBuoc } });
      if (r.already) {
        setBan(false);
        await lamMoi(true);
        return bao("Máy chủ đã có sẵn Claude CLI.");
      }
      bao(r.started ? "Đang cài Claude CLI trên máy chủ. Chờ chạy xong (1–3 phút), SCI công việc tự nhận." : r.message);
      setNhatKy([]);
      doLai(() => goiApi<{ running: boolean; done: boolean; success: boolean | null; log: string[] }>("/api/ai/install-cli"), {
        xong: (s) => !s.running && s.done,
        hanMs: 11 * 60 * 1000,
        khiMoi: (s) => setNhatKy(s.log),
        khiXong: (s) => {
          setBan(false);
          void lamMoi(true);
          if (s.success) bao("Cài xong! Giờ đăng nhập ở thẻ Tài khoản 1 bên dưới.");
          else bao("Cài chưa được — xem nhật ký cài bên dưới.", false);
        },
        khiHetHan: () => {
          setBan(false);
          bao("Chưa thấy Claude CLI. Bấm Làm mới, hoặc xem nhật ký cài.", false);
        },
      });
    } catch (e) {
      setBan(false);
      bao(e instanceof Error ? e.message : "Không bắt đầu cài được.", false);
    }
  }

  async function capNhat() {
    setBan(true);
    try {
      await goiApi("/api/ai/ket-noi", { body: { mode: "claude-cli", modelCli: model } });
      await lamMoi(true);
      bao(dangDung ? "Đã cập nhật model." : "Đang dùng gói thuê bao.");
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không lưu được.", false);
    } finally {
      setBan(false);
    }
  }

  return (
    <div className={THE_PANEL}>
      <div className="mb-1 flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden
          className="ml-1 h-5 w-5 shrink-0 rotate-45 rounded-[4px]"
          style={{ backgroundImage: "linear-gradient(160deg, var(--accent-hover) 0%, var(--accent) 100%)", boxShadow: "0 1px 0 rgba(255,255,255,.25) inset, 0 2px 6px rgba(194,114,79,.35)" }}
        />
        <span className="text-[13px] font-bold text-text">Gói thuê bao Claude (Pro/Max)</span>
        {dangDung && (
          <span className="inline-flex items-center gap-1 rounded-sm border border-green/40 px-1.5 py-0.5 text-[10.5px] font-semibold text-green">
            <CheckCircle2 className="h-3 w-3" /> Đang dùng
          </span>
        )}
      </div>
      <p className="mb-4 text-[12px] text-text-muted">
        Claude CLI trên máy chủ chạy bằng các tài khoản Claude bên dưới — không tốn phí API token. CLI chạy trong thư mục cách ly, chỉ thấy dữ liệu SCI công việc đưa vào.
      </p>

      {/* --- Hộp trạng thái --- */}
      <div className={HOP_TRANG_THAI}>
        {!daCai ? (
          <p className="flex items-start gap-2 text-[12px] text-text-secondary">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow" />
            <span>
              <b className="text-text">Máy chủ chưa có Claude CLI.</b>{" "}
              {sua ? (
                <>
                  Bấm “Cài Claude ngay” bên dưới, SCI công việc tự cài giúp (chạy <span className="font-mono">npm install -g @anthropic-ai/claude-code</span> trên máy chủ, 1–3 phút).
                </>
              ) : (
                "Nhờ quản trị viên cài ở Cài đặt → AI."
              )}
            </span>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[12px] text-text-secondary">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green" />
            <span>
              <b className="text-text">Đã có Claude CLI</b>
              {cli.version ? ` — ${cli.version}` : ""}. Đăng nhập từng tài khoản ở các thẻ Tài khoản 1 / Tài khoản 2 bên dưới.
            </span>
          </p>
        )}
      </div>

      {/* --- Model --- */}
      {daCai && sua && (
        <label className="mb-4 block max-w-md">
          <span className="mb-1 block text-[11px] font-semibold text-text-secondary">Model mặc định</span>
          <select className={LOP_O_NHAP} value={model} onChange={(e) => setModel(e.target.value)} disabled={ban}>
            {MODEL_THUE_BAO.map((m) => (
              <option key={m.id} value={m.id}>
                {m.ten}
              </option>
            ))}
            {model !== "" && !MODEL_THUE_BAO.some((m) => m.id === model) && <option value={model}>{model}</option>}
          </select>
          <span className="mt-0.5 block text-[10.5px] text-text-muted">Chip model trong khung chat vẫn đổi riêng được cho từng người.</span>
        </label>
      )}

      {/* --- Nút --- */}
      {sua ? (
        <div className="flex flex-wrap items-start gap-2">
          {!daCai ? (
            <Nut kieu="chinh" onClick={() => void caiDat(false)} disabled={ban}>
              <Download className="h-3.5 w-3.5" />
              {ban ? "Đang cài, chờ chút…" : "Cài Claude ngay"}
            </Nut>
          ) : (
            <Nut kieu="chinh" onClick={() => void capNhat()} disabled={ban}>
              {dangDung ? "Cập nhật model" : "Dùng cái này"}
            </Nut>
          )}
          {daCai && (
            // Luôn để lối cài lại: CLI hỏng, PATH sai hay bản lỗi thì vẫn có đường sửa.
            <Nut kieu="nhat" onClick={() => void caiDat(true)} disabled={ban} title="Chạy lại trình cài — dùng khi Claude trên máy chủ bị lỗi">
              Cài lại
            </Nut>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-text-muted">Chỉ người có quyền sửa cài đặt mới cài hoặc đổi kết nối AI.</p>
      )}

      {nhatKy !== null && (
        <div className="mt-3">
          <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">Nhật ký cài trên máy chủ</div>
          <pre className="scroll-thin max-h-48 overflow-auto rounded-sm border border-border-light bg-bg p-2 font-mono text-[10.5px] leading-relaxed text-text-secondary">
            {nhatKy.length ? nhatKy.join("\n") : "Đang bắt đầu…"}
          </pre>
        </div>
      )}
    </div>
  );
}

// ===== Panel: API key =====

function PanelApiKey({
  tt,
  kn,
  ban,
  setBan,
  lamMoi,
  bao,
}: {
  tt: TrangThaiAI;
  kn: KetNoi | null;
  ban: boolean;
  setBan: (b: boolean) => void;
  lamMoi: (imLang?: boolean) => Promise<TrangThaiAI | null>;
  bao: (c: string, t?: boolean) => void;
}) {
  const dangDungApi = tt.mode === "api";
  const [ma, setMa] = useState<string>(kn && NHA_CUNG_CAP.some((n) => n.ma === kn.provider) ? kn.provider : "anthropic");
  const [key, setKey] = useState("");
  const [hienKey, setHienKey] = useState(false);
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState(kn?.baseUrl ?? "");
  const [dsModel, setDsModel] = useState<{ id: string; ten: string }[]>([]);

  const ncc = NHA_CUNG_CAP.find((n) => n.ma === ma) ?? NHA_CUNG_CAP[0];
  const rieng = kn?.nhaCungCap?.[ma];
  const daCoKey = !!rieng?.coKhoa;
  const laDangDung = dangDungApi && tt.api?.provider === ma;

  // Đổi nhà cung cấp → nạp lại model đã lưu và danh sách model của hãng đó (dùng khóa đã lưu)
  useEffect(() => {
    setKey("");
    setHienKey(false);
    setModel(kn?.nhaCungCap?.[ma]?.model ?? "");
    setDsModel([]);
    if (!kn) return;
    let huy = false;
    goiApi<{ models: { id: string; ten: string }[] }>("/api/ai/models", { body: { provider: ma } })
      .then((r) => {
        if (!huy) setDsModel(r.models ?? []);
      })
      .catch(() => {});
    return () => {
      huy = true;
    };
  }, [ma, kn]);

  // Người không có quyền: chỉ xem đang dùng hãng nào
  if (!tt.coTheSua) {
    return (
      <div className={THE_PANEL}>
        <div className={HOP_TRANG_THAI + " mb-0"}>
          {dangDungApi && tt.api ? (
            <p className="text-[12px] text-text-secondary">
              Đang dùng <b className="text-text">{tenDangDung(tt)}</b> · model <span className="font-mono">{tt.api.model || "mặc định"}</span>
              {tt.api.coKhoa ? "" : " — chưa có API key"}
            </p>
          ) : (
            <p className="text-[12px] text-text-secondary">Hệ thống không chạy bằng API key.</p>
          )}
        </div>
        <p className="mt-3 text-[11px] text-text-muted">Chỉ người có quyền sửa cài đặt mới nhập hoặc đổi API key.</p>
      </div>
    );
  }

  async function luu() {
    if (!key.trim() && !daCoKey) return bao("Hãy dán API key vào ô bên trái đã.", false);
    if (ma === "custom" && baseUrl.trim() === "") return bao("Nhà cung cấp tùy chỉnh cần Base URL.", false);
    if (ma === "custom" && model.trim() === "") return bao("Nhà cung cấp tùy chỉnh cần tên model.", false);
    setBan(true);
    try {
      await goiApi("/api/ai/ket-noi", {
        body: {
          mode: "api",
          provider: ma,
          model,
          ...(ma === "custom" ? { baseUrl: baseUrl.trim() } : {}),
          // Để trống = giữ key cũ, không ghi đè bằng chuỗi rỗng
          ...(key.trim() ? { apiKey: key.trim() } : {}),
        },
      });
      setKey("");
      await lamMoi(true);
      bao(laDangDung ? `Đã lưu ${ncc.ten}.` : `Đã lưu và chuyển sang ${ncc.ten}.`);
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không lưu được.", false);
    } finally {
      setBan(false);
    }
  }

  async function xoaKey() {
    if (!window.confirm(`Xóa API key đã lưu của ${ncc.ten}?${laDangDung ? "\n\nĐây là nhà cung cấp đang dùng — Trợ lý SCI công việc sẽ ngừng trả lời cho tới khi dán key mới hoặc chuyển về gói thuê bao." : ""}`)) return;
    setBan(true);
    try {
      // nccKhoa: xóa khóa của đúng hãng này mà KHÔNG đổi nhà cung cấp đang dùng
      await goiApi("/api/ai/ket-noi", { body: { nccKhoa: ma, apiKey: "-" } });
      await lamMoi(true);
      bao(`Đã xóa API key của ${ncc.ten}.`);
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không xóa được.", false);
    } finally {
      setBan(false);
    }
  }

  return (
    <div className={THE_PANEL}>
      <div className="mb-4 flex items-start gap-2.5 rounded-sm border border-yellow/40 px-3 py-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow" />
        <p className="text-[12px] text-text-secondary">
          Dùng API key thì <b className="text-text">tính phí theo token</b> của hãng. Kỹ năng AI <b className="text-text">không tự kích hoạt</b> như gói thuê bao — gõ đích danh /tên-kỹ-năng trong khung chat thì vẫn chạy.
        </p>
      </div>

      <label className="mb-4 block max-w-md">
        <span className="mb-1 block text-[11px] font-semibold text-text-secondary">Nhà cung cấp</span>
        <select className={LOP_O_NHAP} value={ma} onChange={(e) => setMa(e.target.value)} disabled={ban}>
          {NHA_CUNG_CAP.map((n) => (
            <option key={n.ma} value={n.ma}>
              {n.ten}
              {kn?.nhaCungCap?.[n.ma]?.coKhoa ? " — đã có key" : ""}
            </option>
          ))}
        </select>
      </label>

      {/* Hàng nhận diện nhà cung cấp đang chọn */}
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border text-[13px] font-bold text-text"
          style={{ backgroundImage: "linear-gradient(160deg, #3a3a3a 0%, #1a1a1a 100%)" }}
        >
          {ncc.chu}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-[12.5px] font-bold text-text">
            {ncc.ten}
            {laDangDung && <span className="rounded-sm border border-green/40 px-1.5 text-[10.5px] font-semibold text-green">đang dùng</span>}
          </span>
          <span className="block text-[11px] text-text-muted">{daCoKey ? `Đã cấu hình · ${rieng?.keyMasked}` : "Chưa cấu hình"}</span>
        </span>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-text-secondary" htmlFor="o-api-key">
            API key{daCoKey && <span className="ml-2 font-normal text-text-muted">(đã lưu {rieng?.keyMasked})</span>}
          </label>
          <div className="relative">
            <input
              id="o-api-key"
              className={`${LOP_O_NHAP} pr-10 font-mono`}
              type={hienKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={key}
              disabled={ban}
              onChange={(e) => setKey(e.target.value)}
              placeholder={daCoKey ? "••••••••  (để trống nếu giữ nguyên)" : ncc.cho}
            />
            <button
              type="button"
              onClick={() => setHienKey((v) => !v)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1.5 text-text-muted hover:bg-white/5 hover:text-text"
              title={hienKey ? "Ẩn key" : "Hiện key"}
              aria-label={hienKey ? "Ẩn key" : "Hiện key"}
            >
              {hienKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[10.5px] text-text-muted">
            Lấy key tại {ncc.layKey}. Key lưu trên máy chủ (không nằm trong “Xuất cấu hình”), trình duyệt chỉ thấy dạng che.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold text-text-secondary" htmlFor="o-api-model">
            Model
          </label>
          {ma === "custom" ? (
            <input id="o-api-model" className={`${LOP_O_NHAP} font-mono`} value={model} disabled={ban} onChange={(e) => setModel(e.target.value)} placeholder="vd llama-3.1-70b" />
          ) : (
            <select id="o-api-model" className={LOP_O_NHAP} value={model} disabled={ban} onChange={(e) => setModel(e.target.value)}>
              <option value="">Mặc định của hãng</option>
              {model && !dsModel.some((m) => m.id === model) && <option value={model}>{model}</option>}
              {dsModel.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.ten}
                </option>
              ))}
            </select>
          )}
          <p className="mt-1 text-[10.5px] text-text-muted">Nhập API key rồi bấm Lưu — SCI công việc sẽ hỏi thẳng hãng để lấy đúng danh sách model.</p>
        </div>

        {ma === "custom" && (
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold text-text-secondary">Base URL (chuẩn OpenAI)</span>
            <input className={`${LOP_O_NHAP} font-mono`} value={baseUrl} disabled={ban} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://may-chu-ai/v1" />
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <Nut kieu="chinh" onClick={() => void luu()} disabled={ban}>
          <Save className="h-3.5 w-3.5" />
          {laDangDung ? "Lưu" : "Lưu và dùng cái này"}
        </Nut>
        {daCoKey && <NutThu mode="api" provider={ma} disabled={ban} bao={bao} />}
        {daCoKey && (
          <Nut kieu="nhat" onClick={() => void xoaKey()} disabled={ban} className="hover:text-red">
            Xóa key
          </Nut>
        )}
      </div>
    </div>
  );
}

// ===== Thẻ chính =====

interface TinhHinhTk {
  hai_tai_khoan: boolean;
  dao_vai_24h: boolean;
  moi_phien_bat: boolean;
  moi_phien_gio: string;
  chinh: 1 | 2;
  /** tài khoản đang phục vụ (chính, hết / mất đăng nhập thì phụ) */
  dang_dung: 1 | 2;
  tai_khoan: {
    so: 1 | 2;
    dang_nhap: boolean;
    dung_mac_dinh_may: boolean;
    /** cách đăng nhập: "ma" = mã dán tay (claude setup-token) · "cua_so" = cửa sổ đăng nhập trên máy chủ */
    kieu?: "ma" | "cua_so" | null;
    duoi_ma?: string;
    email?: string;
    goi?: string;
    dang_chay: number;
    het_den: string | null;
    /** mất đăng nhập (401…) — trợ lý tạm bỏ qua tài khoản này (Mr. Đại chốt 04/10) */
    mat_dang_nhap?: boolean;
    luot_hom_nay: number;
  }[];
}

/**
 * HAI TÀI KHOẢN CLAUDE (Mr. Đại chốt 02/10/2026): mỗi tài khoản một thư mục đăng nhập riêng trên máy chủ. Bật/tắt dùng 2 tài khoản,
 * đảo vai 24 giờ, mồi phiên buổi sáng: ở các ô cấu hình AI ngay bên dưới khung này.
 * 04/10 trưa: mỗi tài khoản một THẺ cùng khuôn với thẻ Tài khoản Claude cá nhân (TheTaiKhoanClaude) — một cách đăng nhập (link + dán mã).
 */
function HaiTaiKhoan({ coTheSua, dungThueBao, lamMoiTren, bao }: { coTheSua: boolean; dungThueBao: boolean; lamMoiTren: () => Promise<unknown>; bao: (c: string, t?: boolean) => void }) {
  const [th, setTh] = useState<TinhHinhTk | null>(null);
  const [dang, setDang] = useState(false);
  const tai = useCallback(async () => {
    setDang(true);
    try {
      setTh(await goiApi<TinhHinhTk>("/api/ai/tai-khoan"));
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không đọc được tình hình tài khoản.", false);
    } finally {
      setDang(false);
    }
  }, [bao]);
  useEffect(() => {
    void tai();
  }, [tai]);
  return (
    <div className="mt-4" aria-label="Hai tài khoản Claude">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12.5px] font-bold text-text">Tài khoản Claude của công ty</div>
        <Nut nho onClick={() => void tai()} disabled={dang}>
          <RefreshCw className={`h-3.5 w-3.5 ${dang ? "animate-spin" : ""}`} /> Làm mới
        </Nut>
      </div>
      <p className="mb-3 mt-1 text-[11.5px] text-text-muted">
        {th?.hai_tai_khoan
          ? `Đang BẬT dùng 2 tài khoản${th.dao_vai_24h ? ", đảo vai chính / phụ mỗi 24 giờ" : ", tài khoản 1 luôn là chính"}${th.moi_phien_bat ? `, mồi phiên lúc ${th.moi_phien_gio}` : ""}. `
          : "Đang dùng 1 tài khoản. "}
        Bật / tắt ở các ô &quot;Dùng 2 tài khoản Claude&quot;, &quot;Đảo vai…&quot;, &quot;Tự mồi phiên…&quot; ngay bên dưới. Hết cả hai thì người đã nối
        &quot;Tài khoản Claude cá nhân&quot; (menu tên ở góc trên) vẫn hỏi được bằng tài khoản của mình.
      </p>
      {!th ? (
        <p className="text-[12px] text-text-muted">Đang kiểm tra…</p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {th.tai_khoan.map((t) => {
            const dangDungTk = th.hai_tai_khoan || t.so === 1;
            return (
              <TheTaiKhoanClaude
                key={t.so}
                ten={`Tài khoản ${t.so}`}
                vai={dangDungTk ? (th.chinh === t.so ? "chính" : "phụ") : "chưa dùng — đang tắt 2 tài khoản"}
                dangDung={dungThueBao && th.dang_dung === t.so && t.dang_nhap && !t.het_den && !t.mat_dang_nhap}
                moTa={
                  t.so === 1
                    ? "Tài khoản chính của công ty. Chưa đăng nhập riêng thì tạm mượn tài khoản Claude chung của máy chủ."
                    : "Tự vào thay khi tài khoản chính hết hạn mức, và đỡ khi tài khoản chính đang bận."
                }
                tt={{
                  dang_nhap: t.dang_nhap,
                  email: t.email,
                  goi: t.goi,
                  kieu: t.kieu,
                  duoi_ma: t.duoi_ma,
                  mac_dinh_may: t.dung_mac_dinh_may,
                  het_den: t.het_den,
                  mat_dang_nhap: t.mat_dang_nhap,
                }}
                dongPhu={[`Hôm nay ${fmtSo(t.luot_hom_nay)} lượt${t.dang_chay ? ` · đang chạy ${t.dang_chay}` : ""}.`]}
                sua={coTheSua}
                goi={(body) => goiApi<KetQuaThe>("/api/ai/tai-khoan", { body: { ...body, so: t.so } })}
                sauKhiDoi={async () => {
                  await tai();
                  await lamMoiTren();
                }}
                bao={bao}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function KetNoiAI({ className = "" }: { className?: string }) {
  const [tt, setTt] = useState<TrangThaiAI | null>(null);
  const [kn, setKn] = useState<KetNoi | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [ban, setBan] = useState(false);
  const [cheDo, setCheDo] = useState<"thue_bao" | "api_key">("thue_bao");
  const daChonCheDo = useRef(false);
  const { bao, khung } = useThongBaoNhanh();

  const lamMoi = useCallback(async (imLang = false): Promise<TrangThaiAI | null> => {
    if (!imLang) setDangTai(true);
    try {
      const s = await goiApi<TrangThaiAI>("/api/ai/status");
      setTt(s);
      setKn(s.coTheSua ? await goiApi<KetNoi>("/api/ai/ket-noi") : null);
      // Lần đầu mở: xem đúng panel của chế độ đang chạy
      if (!daChonCheDo.current) {
        daChonCheDo.current = true;
        if (s.mode === "api") setCheDo("api_key");
      }
      setLoi(null);
      return s;
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không đọc được kết nối AI.");
      return null;
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    void lamMoi();
  }, [lamMoi]);

  async function tatAI() {
    if (!window.confirm("Tắt AI cho toàn hệ thống?\n\nTrợ lý SCI công việc, AI góp ý khi kiểm tra và các kỹ năng AI sẽ ngừng cho tới khi bật lại (chọn một chế độ rồi bấm Dùng cái này / Lưu).")) return;
    setBan(true);
    try {
      await goiApi("/api/ai/ket-noi", { body: { mode: "off" } });
      await lamMoi(true);
      bao("Đã tắt AI.");
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không tắt được.", false);
    } finally {
      setBan(false);
    }
  }

  const dungThueBao = tt?.mode === "claude-cli";

  return (
    <section className={`rounded border border-accent/40 bg-surface ${className}`} aria-label="Kết nối AI">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-bold text-text">
            <Zap className="h-4 w-4 text-accent" /> Kết nối AI
          </div>
          <div className="text-[11px] text-text-muted">Nguồn xử lý AI cho toàn bộ tính năng: gói thuê bao Claude Pro/Max qua Claude CLI trên máy chủ, hoặc API key.</div>
        </div>
      </div>
      <div className="p-4">
        {dangTai && !tt ? (
          <p className="text-[12px] text-text-muted">Đang kiểm tra…</p>
        ) : !tt ? (
          <p className="text-[12px] text-red">{loi}</p>
        ) : (
          <>
            {/* --- Thanh trạng thái --- */}
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-sm border border-border px-3.5 py-2.5">
              <Zap className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 text-[12.5px] text-text-secondary">
                Đang dùng: <b className="text-text">{tenDangDung(tt)}</b>
                {dungThueBao && tt.cli.loggedIn && tt.cli.email ? ` · ${tt.cli.email}` : ""}
                {dungThueBao && tt.cli.loggedIn && tt.cli.tenGoi ? ` · ${tt.cli.tenGoi}` : ""}
                {dungThueBao && !tt.cli.loggedIn && <span className="text-yellow"> · {tt.cli.installed ? "chưa đăng nhập" : "máy chủ chưa có Claude CLI"}</span>}
                {tt.mode === "api" && tt.api && !tt.api.coKhoa && <span className="text-yellow"> · chưa có API key</span>}
              </span>
              {tt.coTheSua && tt.mode !== "off" && (
                <Nut nho kieu="nhat" onClick={() => void tatAI()} disabled={ban} title="Tắt AI cho toàn hệ thống">
                  <Power className="h-3.5 w-3.5" /> Tắt AI
                </Nut>
              )}
              <Nut nho onClick={() => void lamMoi()} disabled={ban || dangTai}>
                <RefreshCw className={`h-3.5 w-3.5 ${dangTai ? "animate-spin" : ""}`} /> Làm mới
              </Nut>
            </div>

            {/* --- Chọn chế độ --- */}
            <div className="mb-5">
              <div className="text-[12.5px] font-bold text-text">Chế độ hoạt động</div>
              <p className="mb-2.5 text-[11.5px] text-text-muted">Chọn nguồn xử lý AI cho toàn bộ tính năng.</p>
              <div className="flex flex-col gap-3 sm:flex-row" role="radiogroup" aria-label="Chế độ hoạt động">
                <TheChon
                  chon={cheDo === "thue_bao"}
                  onChon={() => setCheDo("thue_bao")}
                  tieuDe="Gói thuê bao (Claude Pro/Max)"
                  moTa="Dùng phiên đăng nhập Claude trên máy chủ — không tốn phí token. Khuyến nghị."
                  dangDung={dungThueBao}
                />
                <TheChon
                  chon={cheDo === "api_key"}
                  onChon={() => setCheDo("api_key")}
                  tieuDe="API key"
                  moTa="Anthropic / OpenAI / Gemini / Grok / DeepSeek / tùy chỉnh — tính phí theo token."
                  dangDung={tt.mode === "api"}
                />
              </div>
            </div>

            {/* --- Panel tương ứng --- */}
            {cheDo === "thue_bao" ? (
              <>
                <PanelThueBao tt={tt} kn={kn} dangDung={dungThueBao} ban={ban} setBan={setBan} lamMoi={lamMoi} bao={bao} />
                <HaiTaiKhoan coTheSua={tt.coTheSua} dungThueBao={dungThueBao} lamMoiTren={() => lamMoi(true)} bao={bao} />
              </>
            ) : (
              <PanelApiKey tt={tt} kn={kn} ban={ban} setBan={setBan} lamMoi={lamMoi} bao={bao} />
            )}
            {loi && <p className="mt-2 text-[11.5px] text-red">{loi}</p>}
          </>
        )}
      </div>
      {khung}
    </section>
  );
}
