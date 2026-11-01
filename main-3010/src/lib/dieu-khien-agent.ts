// ============================================================
// BẬT / TẮT AGENT NGAY TỪ MAIN — "chạy một cái, bật cả hệ"
//
// Yêu cầu của Mr. Thịnh 06/09/2026: *"tại sao không làm 1 giao diện chính,
// chạy nó rồi bật các agent … em thấy làm thế có đỡ mất công phải chạy từng
// agent không"*. Đúng — file này thay `BAT-5-AGENT.bat` bằng một cái nút.
//
// ⚠ GIỚI HẠN PHẢI NÓI THẲNG, KHÔNG ĐƯỢC GIẤU
//
// Việc này CHỈ chạy được khi agent nằm CÙNG MÁY với Main. Lên tên miền
// (`https://base.scigroup.vn`) thì con đó ở server khác — Main không có
// quyền khởi động tiến trình trên máy người ta, và cũng KHÔNG NÊN có.
// Lúc ấy nút "Bật" chỉ còn nghĩa thứ hai của nó:
//
//   · Bật TIẾN TRÌNH  = chạy app lên          → chỉ máy này
//   · Bật TRONG DANH BẠ = "kể từ giờ hỏi con này" → luôn luôn được
//
// Hai nghĩa đó CỐ Ý tách rời trên màn hình. Gộp làm một là bẫy: người dùng
// lên tên miền sẽ bấm "Bật" rồi tưởng app đã chạy.
//
// ⛔ BA CHỐT AN TOÀN — file này chạy lệnh hệ điều hành nên phải khắt khe:
//   1. Chỉ bật được con có `thuMucCode` khai sẵn VÀ thư mục đó có thật.
//   2. Chỉ bật được con có địa chỉ trỏ về máy này (localhost/127.0.0.1).
//      Địa chỉ là tên miền → từ chối kèm lý do, không thử.
//   3. Cổng LẤY TỪ ĐỊA CHỈ trong danh bạ, không gắn cứng số nào.
//
// Chỉ vai PM bấm được — route gọi file này phải tự kiểm quyền.
//
// Server-only.
// ============================================================

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gocDuLieu } from "@/lib/goc-du-lieu";
import type { KhaiAgent } from "@/lib/danh-ba-agent";

const TEN_FILE = "tien-trinh-agent.json";

/** Mỗi con một dòng: đã bật lúc nào, tiến trình số mấy. */
interface VetTienTrinh {
  ma: string;
  pid: number;
  cong: number;
  batLuc: string;
}

export interface TrangThaiAgent {
  ma: string;
  ten: string;
  /** true = cổng đang có người trả lời. Đây là sự thật, không phải suy từ PID. */
  dangChay: boolean;
  /** PID Main đã bật. null = không phải Main bật (chạy tay, hoặc chưa chạy). */
  pidMainBat: number | null;
  cong: number | null;
  /** Vì sao KHÔNG bật được từ đây. null = bật được. */
  khongBatDuoc: string | null;
}

// ── Kho vết ──────────────────────────────────────────────────

function duongDanVet(): string {
  return path.join(gocDuLieu(), TEN_FILE);
}

function docVet(): VetTienTrinh[] {
  try {
    const d = JSON.parse(fs.readFileSync(duongDanVet(), "utf8")) as unknown;
    return Array.isArray(d) ? (d as VetTienTrinh[]) : [];
  } catch {
    return [];
  }
}

function ghiVet(ds: VetTienTrinh[]): void {
  try {
    const f = duongDanVet();
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(ds, null, 2), "utf8");
  } catch {
    // Mất vết thì chỉ mất khả năng tắt hộ, không được làm chết lượt gọi.
  }
}

// ── Đọc cấu hình ─────────────────────────────────────────────

/** Rút số cổng từ địa chỉ. Không có cổng rõ ràng thì trả null, KHÔNG đoán. */
export function congTuDiaChi(diaChi: string): number | null {
  try {
    const u = new URL(diaChi);
    if (u.port !== "") return Number(u.port);
    if (u.protocol === "https:") return 443;
    if (u.protocol === "http:") return 80;
    return null;
  } catch {
    return null;
  }
}

/** Địa chỉ này có trỏ về chính máy đang chạy Main không? */
export function laMayNay(diaChi: string): boolean {
  try {
    const h = new URL(diaChi).hostname.toLowerCase();
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
  } catch {
    return false;
  }
}

/**
 * Vì sao con này KHÔNG bật được từ Main. null = bật được.
 * Trả CÂU TIẾNG VIỆT nói rõ phải làm gì, không trả mã lỗi.
 */
export function lyDoKhongBatDuoc(a: KhaiAgent): string | null {
  if (!laMayNay(a.diaChi)) {
    return `Địa chỉ ${a.diaChi} không trỏ về máy này nên Main không khởi động hộ được — con đó phải tự chạy trên máy chủ của nó. Ô "Bật" vẫn dùng được với nghĩa "kể từ giờ hỏi con này".`;
  }
  const tm = (a.thuMucCode ?? "").trim();
  if (tm === "") {
    return 'Chưa khai "Thư mục code" nên không biết chạy ở đâu. Điền cột đó rồi Lưu danh bạ.';
  }
  if (!fs.existsSync(path.join(tm, "package.json"))) {
    return `Không thấy package.json trong ${tm}. Kiểm lại đường dẫn ở cột "Thư mục code".`;
  }
  if (congTuDiaChi(a.diaChi) === null) {
    return `Không rút được số cổng từ địa chỉ ${a.diaChi}. Viết dạng http://localhost:3011.`;
  }
  return null;
}

// ── Đo thật ──────────────────────────────────────────────────

/** Cổng có người thưa không. Đo thật bằng một lượt gọi, không suy từ PID. */
async function congCoNguoiThua(diaChi: string, hanMs = 2500): Promise<boolean> {
  const dungLai = new AbortController();
  const hen = setTimeout(() => dungLai.abort(), hanMs);
  try {
    await fetch(diaChi, { signal: dungLai.signal, cache: "no-store" });
    return true; // 200 hay 307 đều là "có người thưa"
  } catch {
    return false;
  } finally {
    clearTimeout(hen);
  }
}

function pidConSong(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Trạng thái từng con — đo thật, không đoán. */
export async function trangThaiCacAgent(danhBa: KhaiAgent[]): Promise<TrangThaiAgent[]> {
  const vet = docVet();
  return Promise.all(
    danhBa.map(async (a) => {
      const v = vet.find((x) => x.ma === a.ma);
      return {
        ma: a.ma,
        ten: a.ten,
        dangChay: await congCoNguoiThua(a.diaChi),
        pidMainBat: v && pidConSong(v.pid) ? v.pid : null,
        cong: congTuDiaChi(a.diaChi),
        khongBatDuoc: lyDoKhongBatDuoc(a),
      };
    })
  );
}

// ── Bật ──────────────────────────────────────────────────────

export interface KetQuaDieuKhien {
  ok: boolean;
  /** Câu nói thẳng cho màn hình. Luôn có, kể cả khi thành công. */
  noi: string;
}

/**
 * Bật một agent. Trả về NGAY sau khi đẻ tiến trình — không chờ nó sẵn sàng,
 * vì `next dev` lần đầu biên dịch mất 30–60s. Màn hình tự hỏi lại trạng thái.
 */
export function batAgent(a: KhaiAgent): KetQuaDieuKhien {
  const chan = lyDoKhongBatDuoc(a);
  if (chan !== null) return { ok: false, noi: chan };

  const tm = (a.thuMucCode ?? "").trim();
  const cong = congTuDiaChi(a.diaChi);
  if (cong === null) return { ok: false, noi: `Không rút được cổng từ ${a.diaChi}.` };

  try {
    // Đúng khuôn BAT-5-AGENT.bat. NODE_ENV=development là BẮT BUỘC: máy này
    // có biến hệ thống NODE_ENV=production, để nguyên thì Tailwind không được
    // dịch và MỌI trang lỗi 500 — đã dính thật ngày 05/09.
    const con = spawn("npx", ["next", "dev", "-p", String(cong)], {
      cwd: tm,
      env: { ...process.env, NODE_ENV: "development" },
      detached: true,
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    con.unref();

    if (typeof con.pid !== "number") {
      return { ok: false, noi: `Đẻ được lệnh nhưng hệ điều hành không trả số tiến trình cho ${a.ten}.` };
    }

    const vet = docVet().filter((x) => x.ma !== a.ma);
    vet.push({ ma: a.ma, pid: con.pid, cong, batLuc: new Date().toISOString() });
    ghiVet(vet);

    return {
      ok: true,
      noi: `Đang bật ${a.ten} ở cổng ${cong}. Lần đầu phải biên dịch nên mất khoảng 30–60 giây mới thưa.`,
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return { ok: false, noi: `Không chạy được ${a.ten}: ${m}` };
  }
}

// ── Tắt ──────────────────────────────────────────────────────

/**
 * Tắt CẢ CÂY tiến trình.
 *
 * Trên Windows `con.kill()` chỉ giết cái vỏ `npx`, để lại `node` con chạy tiếp
 * — đã dính thật: một lần chạy treo hơn 30 phút và bỏ lại 4 tiến trình mồ côi.
 * Phải dùng `taskkill /T /F` mới hết cây.
 */
export function tatAgent(ma: string): KetQuaDieuKhien {
  const vet = docVet();
  const v = vet.find((x) => x.ma === ma);
  if (!v) {
    return {
      ok: false,
      noi: `Main không bật con "${ma}" nên không tắt hộ được. Nếu nó đang chạy thì là chạy tay — đóng cửa sổ đen của nó.`,
    };
  }
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(v.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      process.kill(-v.pid, "SIGKILL");
    }
  } catch {
    // Tiến trình chết sẵn rồi cũng tính là tắt xong.
  }
  ghiVet(vet.filter((x) => x.ma !== ma));
  return { ok: true, noi: `Đã tắt ${ma} (tiến trình ${v.pid} và các tiến trình con).` };
}
