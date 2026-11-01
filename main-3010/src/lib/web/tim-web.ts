// ============================================================
// tim-web.ts — CHỈ CHẠY PHÍA SERVER (gọi ra internet). Client chỉ import
// `tim-web-chung.ts` (file thuần) — luật 10.
//
// Thứ tự thử: Brave (nếu có khoá) → SearXNG → DuckDuckGo Lite.
// Hai nhà sau không cần khoá, nên tính năng chạy được ngay.
//
// Khoá Brave (tuỳ chọn) khai trong Cài đặt hoặc .env.local:
//   braveSearchKey  /  BRAVE_SEARCH_API_KEY
// ============================================================

import { getSetting } from "@/lib/appconfig";
import {
  goHtml,
  HAN_CHO,
  MAY_SEARXNG,
  SO_KET_QUA_MAC_DINH,
  type KetQuaTimWeb,
  type KetQuaWeb,
} from "./tim-web-chung";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function khoaBrave(): string | undefined {
  return getSetting("braveSearchKey", "BRAVE_SEARCH_API_KEY");
}

/** Brave Search — gói miễn phí 2000 lượt/tháng, cần đăng ký khoá */
async function quaBrave(hoi: string, soKetQua: number, khoa: string): Promise<KetQuaWeb[]> {
  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", hoi);
    url.searchParams.set("count", String(Math.min(soKetQua, 20)));
    url.searchParams.set("search_lang", "vi");
    url.searchParams.set("country", "vn");
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Subscription-Token": khoa },
      signal: AbortSignal.timeout(HAN_CHO.brave),
    });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      web?: { results?: { title?: string; url?: string; description?: string }[] };
    };
    return (j.web?.results ?? []).slice(0, soKetQua).map((r) => ({
      tieuDe: r.title ?? "(không tiêu đề)",
      link: r.url ?? "",
      moTa: goHtml(r.description ?? "").slice(0, 300),
    }));
  } catch {
    return [];
  }
}

/** SearXNG — máy chủ công cộng, không cần khoá; thử lần lượt vài máy */
async function quaSearXNG(hoi: string, soKetQua: number): Promise<KetQuaWeb[]> {
  for (const may of MAY_SEARXNG) {
    try {
      const url = new URL("/search", may);
      url.searchParams.set("q", hoi);
      url.searchParams.set("format", "json");
      url.searchParams.set("language", "vi");
      url.searchParams.set("categories", "general");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json", "User-Agent": UA },
        signal: AbortSignal.timeout(HAN_CHO.searxng),
      });
      if (!res.ok) continue;
      const j = (await res.json()) as {
        results?: { title?: string; url?: string; content?: string }[];
      };
      if (!j.results || j.results.length === 0) continue;
      return j.results.slice(0, soKetQua).map((r) => ({
        tieuDe: r.title ?? "(không tiêu đề)",
        link: r.url ?? "",
        moTa: goHtml(r.content ?? "").slice(0, 300),
      }));
    } catch {
      continue; // máy này hỏng thì thử máy sau
    }
  }
  return [];
}

/**
 * DuckDuckGo — chỗ dựa cuối, không cần khoá.
 *
 * ⭐ ĐO THẬT trên máy này 06/09 (số liệu lật giả định chép từ bản pháp lý):
 *      lite.duckduckgo.com/lite/ → HTTP 202, 0 liên kết  (đang bị chặn)
 *      html.duckduckgo.com/html/ → HTTP 200, 10 liên kết (chạy)
 *    Nên thử HTML trước, LITE sau — ngược với bản pháp lý.
 *
 * Hai bản dựng trang khác nhau nên đọc bằng hai bộ khuôn; và KHÔNG neo cứng
 * thứ tự thuộc tính hay loại dấu nháy vì DuckDuckGo hay đổi.
 */
async function bocDuckDuckGo(html: string, soKetQua: number, lop: string): Promise<KetQuaWeb[]> {
  // Chú ý: trong template string phải viết hai dấu gạch chéo (\s). Một dấu là
  // escape không hợp lệ, JS nuốt mất → regex hỏng mà không báo lỗi. Vấp 06/09.
  const LA_LINK = new RegExp(`class\\s*=\\s*['"][^'"]*${lop}[^'"]*['"]`);
  const LAY_HREF = /href\s*=\s*['"]([^'"]+)['"]/;
  const link: { dia: string; ten: string }[] = [];
  for (const the of Array.from(html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g))) {
    if (!LA_LINK.test(the[1])) continue;
    const h = the[1].match(LAY_HREF);
    if (!h) continue;
    link.push({ dia: h[1], ten: goHtml(the[2]) });
  }
  const moTa = Array.from(
    html.matchAll(/class\s*=\s*['"][^'"]*result[-_]+snippet[^'"]*['"][^>]*>([\s\S]*?)<\/(?:td|a)>/g)
  );
  const ra: KetQuaWeb[] = [];
  for (let i = 0; i < Math.min(link.length, soKetQua); i++) {
    let dia = link[i].dia;
    if (dia.startsWith("//")) dia = "https:" + dia;
    // DuckDuckGo bọc địa chỉ thật trong tham số uddg=
    if (dia.includes("uddg=")) {
      const m = dia.match(/uddg=([^&]+)/);
      if (m) dia = decodeURIComponent(m[1]);
    }
    ra.push({
      tieuDe: link[i].ten || "(không tiêu đề)",
      link: dia,
      moTa: moTa[i] ? goHtml(moTa[i][1]).slice(0, 300) : "",
    });
  }
  return ra;
}

async function quaDuckDuckGo(hoi: string, soKetQua: number): Promise<KetQuaWeb[]> {
  const dau = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
  };
  const than = new URLSearchParams({ q: hoi, kl: "vn-vi" }).toString();

  for (const { dia, lop } of [
    { dia: "https://html.duckduckgo.com/html/", lop: "result__a" },
    { dia: "https://lite.duckduckgo.com/lite/", lop: "result-link" },
  ]) {
    try {
      const res = await fetch(dia, {
        method: "POST",
        headers: dau,
        body: than,
        signal: AbortSignal.timeout(HAN_CHO.duckduckgo),
      });
      if (!res.ok) continue;
      const kq = await bocDuckDuckGo(await res.text(), soKetQua, lop);
      if (kq.length > 0) return kq;
    } catch {
      continue;
    }
  }
  return [];
}

/**
 * Tìm trên internet. KHÔNG bao giờ ném ngoại lệ — mọi nhà hỏng thì trả về
 * danh sách rỗng kèm câu tiếng Việt nói rõ vì sao, để trợ lý nói lại cho
 * người dùng thay vì làm hỏng cả lượt chat.
 */
export async function timWeb(
  hoi: string,
  soKetQua = SO_KET_QUA_MAC_DINH
): Promise<KetQuaTimWeb> {
  const cau = hoi.trim();
  if (cau === "") {
    return { nha: "khong-co", ketQua: [], loi: "Chưa có từ khoá để tìm." };
  }

  const khoa = khoaBrave();
  if (khoa) {
    const kq = await quaBrave(cau, soKetQua, khoa);
    if (kq.length > 0) return { nha: "brave", ketQua: kq };
  }

  const kqSearx = await quaSearXNG(cau, soKetQua);
  if (kqSearx.length > 0) return { nha: "searxng", ketQua: kqSearx };

  const kqDdg = await quaDuckDuckGo(cau, soKetQua);
  if (kqDdg.length > 0) return { nha: "duckduckgo", ketQua: kqDdg };

  return {
    nha: "khong-co",
    ketQua: [],
    loi: "Không nhà tìm kiếm nào trả lời được lúc này. Có thể máy không ra được internet, hoặc các máy chủ công cộng đang bận. Thử lại sau, hoặc khai khoá Brave Search trong Cài đặt để đi đường riêng.",
  };
}

// ===========================================================================
// ĐỌC NỘI DUNG TRANG — tiêu đề với mô tả ngắn thường không đủ trả lời câu
// hỏi cần số. Tải thêm vài trang đầu rồi bóc chữ để mô hình có dữ liệu thật.
// ===========================================================================

const CHU_MOI_TRANG = 3_000;
const SO_TRANG_DOC = 2;

async function docTrang(dia: string): Promise<string> {
  try {
    const res = await fetch(dia, {
      headers: { "User-Agent": UA, "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8" },
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return "";
    if (!(res.headers.get("content-type") ?? "").includes("text/html")) return "";
    return goHtml(await res.text()).slice(0, CHU_MOI_TRANG);
  } catch {
    return "";
  }
}

/** Tìm rồi đọc luôn nội dung vài trang đầu, trả về đoạn chữ cho mô hình */
export async function timVaDocWeb(hoi: string, soKetQua = SO_KET_QUA_MAC_DINH): Promise<KetQuaTimWeb> {
  const kq = await timWeb(hoi, soKetQua);
  if (kq.ketQua.length === 0) return kq;

  const doc = await Promise.all(
    kq.ketQua.slice(0, SO_TRANG_DOC).map(async (k) => ({ k, chu: await docTrang(k.link) }))
  );
  for (const { k, chu } of doc) {
    if (chu) k.moTa = `${k.moTa}\n    — Trích nội dung trang: ${chu.slice(0, 1200)}`;
  }
  return kq;
}
