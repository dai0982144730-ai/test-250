"use client";

// ============================================================
// CHUÔNG ở thanh trên — DÙNG CHUNG chuông agent Công việc (Mr. Đại chốt 07/10/2026): cùng con số, cùng danh sách, bấm một dòng mở
// đúng chỗ bên agent Công việc (thẻ mới). Không viết lại chuông (luật 7): nhúng trang /nhung/chuong của agent Công việc.
// Khung nhúng nhỏ bằng nút chuông; bấm chuông → trang nhúng báo "sci-chuong" mo=true → khung nở ra cho hộp tin; bấm ra ngoài →
// gửi "sci-chuong-dong" vào khung. BẢN GỐC ở Main — chép nguyên sang Tiến độ · Hợp đồng.
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const RONG_DONG = 40;
const CAO_DONG = 34;
const HEN_DO_MS = 4000;
const NHIP_DO_MS = 60_000;
const CHU_TAT = "Agent Công việc (cổng 3004) đang tắt — chưa đọc được thông báo. Máy dò lại mỗi phút.";

export function ChuongCongViec() {
  // 26/10/2026 (Mr. Đại): khung nhúng theo đúng sáng/tối của trang này — truyền ?theme= để dòng chữ họp không có nền riêng
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const doc = () => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    doc();
    const ob = new MutationObserver(doc);
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => ob.disconnect();
  }, []);
  const [goc, setGoc] = useState("");
  const [mo, setMo] = useState(false);
  // Dòng chữ đỏ báo họp (agent Công việc, Phòng họp — Mr. Đại chốt 25/10/2026): trang nhúng báo "sci-chuong-rong" { rong, mo }
  // → nới khung nhúng thêm `rong` điểm ảnh (dòng chữ nằm BÊN PHẢI chuông, không đụng con số chuông); mo = đang mở khung chi tiết cuộc họp (khung nở như hộp tin)
  const [rong, setRong] = useState(0);
  const [moHop, setMoHop] = useState(false);
  const [rongDung, setRongDung] = useState(0); // phần `rong` vừa khoảng trống thật của thanh trên
  const khung = useRef<HTMLIFrameElement>(null);
  const boc = useRef<HTMLSpanElement>(null);
  // null = đang dò · true = agent Công việc thưa · false = không thưa (tắt / không tới được)
  const [song, setSong] = useState<boolean | null>(null);

  useEffect(() => {
    void fetch("/api/viec/goc", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { goc?: string }) => setGoc(j.goc ?? ""))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!goc) return;
    const nguon = new URL(goc).origin;
    const nghe = (e: MessageEvent) => {
      if (e.origin !== nguon) return;
      const d = e.data as { loai?: string; mo?: boolean; rong?: number } | null;
      if (d?.loai === "sci-chuong") setMo(!!d.mo);
      if (d?.loai === "sci-chuong-rong") {
        setRong(Math.max(0, Math.min(400, Number(d.rong) || 0)));
        setMoHop(!!d.mo);
      }
    };
    window.addEventListener("message", nghe);
    return () => window.removeEventListener("message", nghe);
  }, [goc]);

  // Dò agent Công việc TRƯỚC khi nhúng (Mr. Đại chốt 15/10/2026): khung nhúng khác nguồn không báo lỗi tải — agent Công việc
  // (3004) tắt thì trình duyệt vẽ hình tài liệu hỏng. Dò bằng fetch no-cors hẹn 4 giây: không thưa → 🔔 mờ + chữ rê chuột.
  // Dò lại mỗi 60 giây để agent Công việc bật lại là chuông tự về.
  useEffect(() => {
    if (!goc) return;
    let huy = false;
    const doThu = async () => {
      const ct = new AbortController();
      const hen = setTimeout(() => ct.abort(), HEN_DO_MS);
      try {
        await fetch(`${goc}/nhung/chuong`, { mode: "no-cors", cache: "no-store", signal: ct.signal });
        if (!huy) setSong(true);
      } catch {
        if (!huy) {
          setSong(false);
          setMo(false);
        }
      } finally {
        clearTimeout(hen);
      }
    };
    void doThu();
    const nhip = setInterval(() => void doThu(), NHIP_DO_MS);
    return () => {
      huy = true;
      clearInterval(nhip);
    };
  }, [goc]);

  // Bấm ra ngoài khi hộp tin đang mở → báo khung đóng (khung nhúng không tự nghe được cú bấm bên ngoài nó)
  useEffect(() => {
    if (!mo && !moHop) return;
    const f = (e: MouseEvent) => {
      if (boc.current && !boc.current.contains(e.target as Node)) khung.current?.contentWindow?.postMessage({ loai: "sci-chuong-dong" }, "*");
    };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, [mo, moHop]);

  // Dòng chữ chỉ lấy KHOẢNG TRỐNG THẬT từ chuông tới nút kế bên trên thanh trên (kiểm độc lập lần 7, B1: nở cứng 300 px
  // đẩy nút người dùng ra ngoài màn / đè «Giải thích»). Đo đồng bộ lúc vẽ + khi đổi cỡ cửa sổ; trống dưới 60 px thì ẩn dòng chữ.
  useLayoutEffect(() => {
    const b = boc.current;
    if (!b || !song) return;
    const doCho = () => {
      if (!rong) return setRongDung(0);
      let thanh: HTMLElement | null = b.closest("header");
      if (!thanh) {
        thanh = b.parentElement;
        while (thanh?.parentElement && thanh.getBoundingClientRect().width < window.innerWidth * 0.6) thanh = thanh.parentElement;
      }
      if (!thanh) return;
      // Đo khi khung chỉ còn bằng chuông — không thì phần đang nở đẩy nút kế bên ra và đo nhầm thành «còn trống»
      const cu = b.style.width;
      b.style.width = `${RONG_DONG}px`;
      const o = b.getBoundingClientRect();
      let ke = Math.min(thanh.getBoundingClientRect().right, window.innerWidth);
      for (const el of Array.from(thanh.querySelectorAll<HTMLElement>("*"))) {
        if (b.contains(el) || el.contains(b)) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || r.bottom <= o.top || r.top >= o.bottom) continue;
        if (r.left >= o.left + RONG_DONG - 1 && r.left < ke) ke = r.left;
      }
      b.style.width = cu;
      const cho = Math.floor(ke - o.left - RONG_DONG - 12);
      setRongDung(cho >= 60 ? Math.min(rong, cho) : 0);
    };
    doCho();
    const hen = window.setTimeout(doCho, 1500); // thanh trên còn nạp thêm nút sau (vd ô chọn tuần)
    window.addEventListener("resize", doCho);
    return () => {
      window.clearTimeout(hen);
      window.removeEventListener("resize", doCho);
    };
  }, [rong, song, goc]);

  if (!goc || song === null) return <span style={{ width: RONG_DONG, height: CAO_DONG }} />;
  // Agent Công việc không thưa → chuông mờ, chữ thuần (không phải nút — luật 28), rê chuột thấy lý do
  if (!song)
    return (
      <span
        title={CHU_TAT}
        aria-label={CHU_TAT}
        style={{ width: RONG_DONG, height: CAO_DONG, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: 0.35, cursor: "default", userSelect: "none" }}
      >
        🔔
      </span>
    );
  return (
    <span ref={boc} className="relative shrink-0" style={{ width: RONG_DONG + rongDung, height: CAO_DONG }} data-gt="Thông báo">
      {mo && <KhaiHuongDan ma="chuong-bao" uuTien={2} />}
      <iframe
        ref={khung}
        src={`${goc}/nhung/chuong?theme=${theme}`}
        data-chuong-khung
        data-mo={mo || moHop || undefined}
        title="Thông báo agent Công việc"
        className="absolute left-0 top-0 z-50 border-0 bg-transparent"
        style={{
          // Rộng ĐÚNG bằng khung bọc (100%) = chuông + khoảng trống đo được — không đẩy, không đè nút nào
          width: mo || moHop ? "max(600px, 100%)" : "100%",
          height: mo || moHop ? `min(760px, calc(100vh - 8px))` : CAO_DONG,
          // Bảng màu khung = bảng màu trang nhúng (light) — khác nhau thì trình duyệt tô nền kín, mất trong suốt (đo 07/10: nền đen)
          colorScheme: "light",
        }}
      />
    </span>
  );
}
