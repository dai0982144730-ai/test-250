"use client";
// KhungPhong — khung GIAO DIỆN CĂN PHÒNG: thanh trên mỏng một dòng (menu · tuần báo cáo · chuông · Hướng dẫn · người dùng)
// thay cho thanh bên cổ điển. Kho thư mục KHÔNG có ở giao diện này (Mr. Đại chốt 28/09): báo cáo mở bằng 📒 trên sơ đồ;
// báo cáo bị trả lại, tin nhắc nộp báo qua chuông (tin đỏ).
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KHOA_TUAN, docNho, ghiNho, quenHet } from "./nho-trang-thai";
import { Suspense, useEffect, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { taiLaiToi, useToi } from "@/components/layout/dung-toi";
import { DoiMatKhau } from "@/components/layout/DoiMatKhau";
import { moXemTep, NutTep } from "@/components/dinh-kem/DinhKem";
import { cacTuanGanDay, nhanTuanGon, tuanCua } from "@/lib/phong/tuan";
import { COOKIE_KIEU_VE, type KieuVe } from "@/lib/phong/giao-dien";
import { LopGiaiThich, NutGiaiThich } from "./GiaiThich";
import { NutSangToi } from "./NutSangToi";
import { NutHuongDanTren } from "@/components/huong-dan/NutHuongDan";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import { linkPhong } from "@/lib/ai/trang-co-that";
import { DUONG_RA_SOAT } from "@/lib/so-cai/duong-ra-soat";
import { CHUA_HOAT_DONG, DANG_O_DAY, DAY_AGENT, type LienKetAgent } from "@/lib/chung/lien-ket-agent";
import { DongHop } from "@/components/phong-hop/DongHop";

const MENU: { href: string; nhan: string; tat?: string; cho: "trai" | "gui" | "cai-dat" }[] = [
  // Mr. Đại chốt 08/10: "Việc của tôi" NGOÀI CÙNG BÊN TRÁI như mọi agent (đợt ⑤ 06/10 đặt cạnh Sơ đồ)
  { href: "/viec-cua-toi", nhan: "Việc của tôi", cho: "trai" },
  { href: "/so-do", nhan: "Sơ đồ", cho: "trai" },
  { href: "/du-an", nhan: "Dự án", cho: "trai" },
  { href: "/bao-cao-tuan", nhan: "Báo cáo tuần", cho: "trai" },
  // Mr. Đại chốt 25/10/2026: menu Phòng họp (đăng ký phòng · giao ban · lịch các phòng)
  { href: "/phong-hop", nhan: "Phòng họp", cho: "trai" },
  { href: "/gui-bao-cao", nhan: "Báo cáo", cho: "gui" },
];

/** Giao diện 3D / 2D: gắn lên <html> ngay (không tải lại trang) + cookie cho lần tải sau; máy chủ lưu theo tài khoản */
function apKieuVe(kv: KieuVe) {
  document.documentElement.dataset.giaoDien = kv;
  document.cookie = `${COOKIE_KIEU_VE}=${kv}; path=/; max-age=${400 * 86400}; samesite=lax`;
}
/** Tin cần chú ý ngay — nền đỏ ở chuông */
const LOAI_DO = new Set(["nhac_viec", "nhac_nop", "bi_tra_lai", "qua_han"]);

interface TinBao {
  id: number;
  loai: string;
  noi_dung: string;
  lien_ket: string | null;
  /** File kèm (giao việc / báo xong / bình luận) */
  tep?: { id: string; ten: string }[];
  da_doc: boolean;
  luc: string;
}

const homNayVN = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

async function dangXuat() {
  quenHet();
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* vẫn về trang đăng nhập */
  }
  window.location.href = "/login";
}

const LOAI_TEN: Record<string, string> = {
  nhac_viec: "Ban lãnh đạo nhắc việc",
  nhac_nop: "Nhắc nộp báo cáo",
  bi_tra_lai: "Báo cáo bị trả lại",
  qua_han: "Việc quá hạn",
  // Máy nhắc đóng việc (đầu việc đã 100% bên agent Tiến độ) — không phải tin đỏ, không phải Ban lãnh đạo nhắc
  nhac_dong_viec: "Nhắc bấm Xong việc",
};

interface NhomTin {
  ids: number[];
  loai: string;
  noi_dung: string;
  lien_ket: string | null;
  tep: { id: string; ten: string }[];
  chua_doc: number;
  luc: string;
  /** có tin chưa đọc đến sau lần mở chuông trước → dấu ! đỏ */
  moi: boolean;
}

/** Gộp tin trùng (cùng loại, cùng nội dung) thành một dòng ×N — đo 28/09: 41 tin của quản trị có 26 tin giống hệt nhau. */
function gopTin(ds: TinBao[], mocCu: number): NhomTin[] {
  const m = new Map<string, NhomTin>();
  for (const t of ds) {
    const k = t.loai + "|" + t.noi_dung + "|" + (t.tep ?? []).map((x) => x.id).join(",");
    const moi = !t.da_doc && t.id > mocCu;
    const g = m.get(k);
    if (g) {
      g.ids.push(t.id);
      if (!t.da_doc) g.chua_doc++;
      if (moi) g.moi = true;
      if (t.luc > g.luc) g.luc = t.luc;
    } else m.set(k, { ids: [t.id], loai: t.loai, noi_dung: t.noi_dung, lien_ket: t.lien_ket, tep: t.tep ?? [], chua_doc: t.da_doc ? 0 : 1, luc: t.luc, moi });
  }
  // BLĐ nhắc việc (nút Nhắc ở Báo cáo tuần) chưa đọc: LUÔN đứng đầu, trên cả Việc quá hạn — nhắc nhở gấp (Mr. Đại chốt 02/10);
  // đã đọc thì vẫn trên các tin đã đọc khác. Còn lại: tin MỚI (từ lần mở trước) lên đầu; rồi chưa đọc; trong đó tin đỏ
  // (nhắc nộp, trả lại, quá hạn) và bình luận trước; rồi mới nhất
  const hang = (g: NhomTin) =>
    g.loai === "nhac_viec"
      ? g.chua_doc ? -20 : 3.5
      : (g.moi ? -8 : 0) + (g.chua_doc ? 0 : 4) + (LOAI_DO.has(g.loai) ? 0 : g.loai === "binh_luan" || g.loai === "duoc_nhac" ? 1 : 2);
  return [...m.values()].sort((a, b) => hang(a) - hang(b) || (a.luc < b.luc ? 1 : -1));
}

/**
 * nhung = chuông NHÚNG ở thanh trên agent khác (Main · Tiến độ · Hợp đồng — Mr. Đại chốt 07/10: dùng chung chuông agent Công việc,
 * cùng số, cùng danh sách). Trang /nhung/chuong. Mở/đóng báo trang cha (sci-chuong) để khung nhúng nở ra/thu lại; trang cha bấm ra
 * ngoài thì gửi sci-chuong-dong. Bấm một dòng → mở đúng chỗ bên agent Công việc ở THẺ MỚI (không chạy trong khung nhỏ).
 */
export function Chuong({ nhung = false }: { nhung?: boolean } = {}) {
  const toi = useToi();
  const router = useRouter();
  const [mo, setMo] = useState(false);
  useEffect(() => {
    if (!nhung) return;
    window.parent?.postMessage({ loai: "sci-chuong", mo }, "*");
  }, [nhung, mo]);
  useEffect(() => {
    if (!nhung) return;
    const nghe = (e: MessageEvent) => {
      if ((e.data as { loai?: string } | null)?.loai === "sci-chuong-dong") setMo(false);
    };
    window.addEventListener("message", nghe);
    return () => window.removeEventListener("message", nghe);
  }, [nhung]);
  const [ds, setDs] = useState<TinBao[] | null>(null);
  const [mocCu, setMocCu] = useState(0);
  // Tin đã đọc rời chuông ngay; dòng "Xem tin đã đọc (N)" xem lại 7 ngày (Mr. Đại chốt 10/10/2026, db/87)
  const [soDaDoc, setSoDaDoc] = useState(0);
  const [xemDaDoc, setXemDaDoc] = useState(false);
  const [dsDaDoc, setDsDaDoc] = useState<TinBao[] | null>(null);
  // Số chuông + số việc mới tự đọc lại mỗi 60 giây khi tab đang mở (trước 08/10 chỉ đổi khi tải lại trang) — để phát sáng đúng lúc
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void taiLaiToi();
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);
  const so = toi?.so_thong_bao_chua_doc ?? 0;
  // Chuông "8+5" (Mr. Đại chốt 29/09): 8 = chưa đọc đã thấy ở lần mở trước · 5 = tin mới đến sau lần mở đó
  const soMoi = Math.min(toi?.so_thong_bao_moi ?? 0, so);
  const soCu = so - soMoi;
  const gon = (n: number) => (n > 99 ? "99+" : String(n));
  const chuSo = soMoi ? (soCu ? `${gon(soCu)}${soCu > 99 ? " " : ""}+${gon(soMoi)}` : `+${gon(soMoi)}`) : gon(soCu);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!mo) return;
    // mo=1: máy chủ trả mốc lần mở trước (đánh dấu ! tin mới) rồi dời mốc → đóng chuông thì số mới về 0
    setXemDaDoc(false);
    setDsDaDoc(null);
    goiApi<{ thong_bao: TinBao[]; moc_cu?: number; da_doc_gan_day?: number; tat_tin_xong_nhan_vien?: boolean; hien_nut_tat?: boolean }>(
      "/api/thong-bao?gioi_han=200&mo=1",
    )
      .then((r) => {
        setMocCu(r.moc_cu ?? 0);
        setDs(r.thong_bao);
        setSoDaDoc(r.da_doc_gan_day ?? 0);
        setTatTin(r.hien_nut_tat ? { bat: !!r.tat_tin_xong_nhan_vien, bao: "" } : null);
        void taiLaiToi();
      })
      .catch(() => setDs([]));
  }, [mo]);
  const [tatTin, setTatTin] = useState<{ bat: boolean; bao: string } | null>(null);
  const doiTatTin = async () => {
    if (!tatTin) return;
    const bat = !tatTin.bat;
    try {
      await goiApi("/api/thong-bao", { method: "PUT", body: { tat_tin_xong_nhan_vien: bat } });
      setTatTin({
        bat,
        bao: bat
          ? "Đã tắt: từ giờ không nhận tin nhân viên / đơn vị xong các việc lọc ra từ báo cáo. Việc bạn giao, bạn phân công vẫn báo đủ."
          : "Đã bật lại: nhận đủ tin nhân viên / đơn vị xong việc.",
      });
    } catch (e) {
      setTatTin({ ...tatTin, bao: e instanceof Error ? e.message : "Không đổi được lựa chọn" });
    }
  };
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMo(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  const docHet = async () => {
    await goiApi("/api/thong-bao", { body: { tat_ca: true } }).catch(() => undefined);
    // Đã đọc → rời chuông (chốt 10/10); số tin xem lại được cộng thêm
    setSoDaDoc((n) => n + (ds?.length ?? 0));
    setDs([]);
    void taiLaiToi();
  };
  const moDaDoc = async () => {
    setXemDaDoc(true);
    setDsDaDoc(null);
    const r = await goiApi<{ thong_bao: TinBao[] }>("/api/thong-bao?gioi_han=200&xem=da_doc").catch(() => ({ thong_bao: [] as TinBao[] }));
    setDsDaDoc(r.thong_bao);
  };
  const bam = async (g: NhomTin) => {
    if (g.chua_doc) await goiApi("/api/thong-bao", { body: { ids: g.ids } }).catch(() => undefined);
    void taiLaiToi();
    setMo(false);
    // Tin báo cáo gửi đến (Mr. Đại chốt 30/09): mở thẳng file báo cáo trong cửa sổ nổi, không sang trang tài liệu
    const tl = /^\/tai-lieu\/([^/?#]+)/.exec(g.lien_ket ?? "");
    if (tl) return moXemTep(tl[1], "Báo cáo", "tai_lieu");
    const lk = linkPhong(g.lien_ket);
    if (lk && nhung) window.open(new URL(lk, window.location.origin).href, "_blank", "noopener");
    else if (lk) router.push(lk);
  };
  const nguon = xemDaDoc ? dsDaDoc : ds;
  const nhom = nguon ? gopTin(nguon, mocCu) : null;
  return (
    <>
    <span ref={ref} style={{ position: "relative" }}>
      <button
        className="chuong" data-gt="chuong"
        aria-label="Thông báo"
        title={so ? `${so} thông báo chưa đọc${soMoi ? ` — ${soMoi} tin mới từ lần mở trước` : ""}` : "Thông báo"}
        onClick={() => setMo((m) => !m)}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
        </svg>
        {/* Có tin MỚI (từ lần mở chuông trước) → con số phát sáng, nhìn là biết, không cần dò dấu + (Mr. Đại chốt 08/10) */}
        {so > 0 && <span className={soMoi ? "so phat-sang" : "so"}>{chuSo}</span>}
      </button>
      {mo && (
        <div className="hop-chuong">
          {/* khung chuông đang mở đè lên màn → hướng dẫn «Chuông thông báo» (ưu tiên 2) */}
          <KhaiHuongDan ma="thong-bao" uuTien={2} />
          <div className="chuong-dau">
            <b>Thông báo</b>
            <span className="chuong-nut">
              {so > 0 && (
                <button className="nut-chu" onClick={() => void docHet()}>Đánh dấu đã đọc hết</button>
              )}
              {/* K4 (Mr. Đại chốt 02/10): một cú bấm là bật/tắt, nhớ theo tài khoản. Chỉ hiện với người có nhận tin "cấp dưới xong việc" */}
              {tatTin && (
                <button
                  className={`nut-chu ${tatTin.bat ? "dang-bat" : ""}`}
                  data-gt="chuong-tat-tin-xong"
                  // Chữ khi rê chuột — Mr. Đại sửa nguyên văn 02/10
                  title={
                    tatTin.bat
                      ? "Đang bật: không nhận thông báo xong việc của nhân viên/đơn vị — chỉ hiệu lực với việc Trợ lý AI lọc ra từ báo cáo. Việc bạn giao việc thủ công bằng ứng dụng không bị tắt thông báo. Bấm để nhận lại."
                      : "Chọn để không nhận thông báo xong việc của nhân viên/đơn vị — chỉ hiệu lực với việc Trợ lý AI lọc ra từ báo cáo. Việc bạn giao việc thủ công bằng ứng dụng không bị tắt thông báo."
                  }
                  onClick={() => void doiTatTin()}
                >
                  {tatTin.bat ? "☑" : "☐"} Không nhận thông báo xong việc của Nhân viên
                </button>
              )}
            </span>
          </div>
          {tatTin?.bao && <div className="tb-bao">{tatTin.bao}</div>}
          {xemDaDoc && (
            <button className="nut-chu tb-lui" onClick={() => setXemDaDoc(false)}>
              ◂ Quay lại tin chưa đọc · đây là tin đã đọc trong 7 ngày, quá 7 ngày máy xoá hẳn
            </button>
          )}
          {nhom === null ? (
            <div className="trong">Đang tải…</div>
          ) : nhom.length === 0 ? (
            <div className="trong">{xemDaDoc ? "Không có tin đã đọc trong 7 ngày." : "Không còn thông báo chưa đọc."}</div>
          ) : (
            nhom.map((g) => (
              // Dòng tin là vùng bấm (div role=button) để chứa được nút Xem / Tải về của file kèm bên trong
              <div
                key={g.ids[0]}
                role="button"
                tabIndex={0}
                className={`tb ${g.chua_doc ? "moi" : ""} ${LOAI_DO.has(g.loai) && g.chua_doc ? "tb-do" : ""} ${g.loai === "nhac_viec" && g.chua_doc ? "tb-nhac" : ""}`}
                style={{ cursor: "pointer" }}
                onClick={() => void bam(g)}
                onKeyDown={(e) => e.key === "Enter" && void bam(g)}
              >
                {LOAI_TEN[g.loai] && <b>{LOAI_TEN[g.loai]}</b>}
                <span>
                  {/* Tin mới đến sau lần mở chuông trước: dấu ! đỏ trước nội dung (Mr. Đại chốt 29/09) */}
                  {g.moi && (
                    <span className="dau-moi" title="Tin mới từ lần mở chuông trước">
                      !
                    </span>
                  )}
                  {g.noi_dung}
                </span>
                {/* File kèm (giao việc / báo xong / bình luận): Xem = cửa sổ nổi giữa màn, Tải về = về máy */}
                {g.tep.length > 0 && (
                  <span style={{ display: "flex", flexDirection: "column", gap: 3, margin: "3px 0" }}>
                    {g.tep.map((t) => (
                      <NutTep key={t.id} t={t} />
                    ))}
                  </span>
                )}
                {/* Tin "nhận tài liệu" (báo cáo gửi đến): xem nhanh / tải báo cáo ngay tại chuông */}
                {!g.tep.length && /^\/tai-lieu\/([^/?#]+)/.test(g.lien_ket ?? "") && (
                  <span style={{ margin: "3px 0" }}>
                    <NutTep t={{ id: /^\/tai-lieu\/([^/?#]+)/.exec(g.lien_ket ?? "")![1], ten: "Báo cáo / tài liệu", loai: "tai_lieu" }} />
                  </span>
                )}
                <span className="mo nho">
                  {new Date(g.luc).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  {g.ids.length > 1 ? ` · cùng nội dung ${g.ids.length} lần → gộp còn 1` : ""}
                </span>
              </div>
            ))
          )}
          {!xemDaDoc && soDaDoc > 0 && (
            <button className="nut-chu tb-xem-da-doc" data-gt="chuong-da-doc" onClick={() => void moDaDoc()}>
              Xem tin đã đọc ({soDaDoc}) ▸
            </button>
          )}
        </div>
      )}
    </span>
    {/* Dòng chữ đỏ báo họp (Mr. Đại chốt 25/10/2026) — bên PHẢI chuông (chuông giữ chỗ cũ), không cộng vào con số */}
    {toi && <DongHop nhung={nhung} />}
    </>
  );
}

function MenuNguoi() {
  const toi = useToi();
  const [mo, setMo] = useState(false);
  const [doiMk, setDoiMk] = useState(false);
  const [kv, setKv] = useState<KieuVe>("3d");
  // Máy mới đăng nhập (chưa có cookie): lấy lựa chọn đã lưu theo tài khoản
  useEffect(() => {
    if (!toi?.kieu_ve) return;
    setKv(toi.kieu_ve);
    if (document.documentElement.dataset.giaoDien !== toi.kieu_ve) apKieuVe(toi.kieu_ve);
  }, [toi?.kieu_ve]);
  const chonKieu = (k: KieuVe) => {
    setKv(k);
    setMo(false);
    apKieuVe(k);
    void goiApi("/api/toi/kieu-ve", { method: "PUT", body: { kieu_ve: k } })
      .then(() => taiLaiToi())
      .catch(() => undefined);
  };
  const ref = useRef<HTMLSpanElement>(null);
  // Dãy link các agent — tải một lần khi mở menu lần đầu; lỗi thì lần mở sau thử lại
  const [dayAgent, setDayAgent] = useState<LienKetAgent[] | null>(null);
  useEffect(() => {
    if (!mo || dayAgent) return;
    let huy = false;
    fetch("/api/lien-ket-agent")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { day?: LienKetAgent[] } | null) => {
        if (!huy && j?.day) setDayAgent(j.day);
      })
      .catch(() => undefined);
    return () => {
      huy = true;
    };
  }, [mo, dayAgent]);
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setMo(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  return (
    <span ref={ref} style={{ position: "relative" }}>
      <button className="nut-tren" data-gt="menu-nguoi" onClick={() => setMo((m) => !m)} title={toi?.email}>
        {toi?.ten ?? "…"} ▾
      </button>
      {mo && (
        <div className="menu-nguoi">
          <div className="dau">
            {toi?.don_vi?.ten ?? "Chưa gán đơn vị"}
            {/* Mr. Đại 04/10: "hiển thị 2 lần phó tổng giám đốc là thừa" — ô Ban lãnh đạo đặt tên "<chức vụ> · <tên>"
                (5 ô, đo 04/10) nên tên đơn vị đã chứa chức vụ thì không ghép thêm */}
            {toi?.chuc_vu && !(toi.don_vi?.ten ?? "").toLowerCase().includes(toi.chuc_vu.toLowerCase()) ? ` · ${toi.chuc_vu}` : ""}
          </div>
          {/* Mr. Đại chốt 29/09: chọn Giao diện 3D / 2D ở đây (ngoài Cài đặt) — bấm là đổi ngay */}
          <div className="hai-kieu">
            {(["3d", "2d"] as const).map((k) => (
              <button key={k} aria-pressed={kv === k} onClick={() => chonKieu(k)}>
                Giao diện {k.toUpperCase()}
              </button>
            ))}
          </div>
          <Link href="/cai-dat" onClick={() => setMo(false)}>Cài đặt</Link>
          {/* Mr. Đại chốt 01/10: ngay dưới Cài đặt — skill chung (xem, chạy) + skill riêng của tôi (thêm, sửa, xoá, chạy) */}
          <Link href="/ky-nang" onClick={() => setMo(false)}>Skill AI của tôi</Link>
          {/* Quản lý token AI (Mr. Đại duyệt 04/10): ai cũng nối được tài khoản Claude riêng làm dự phòng khi tài khoản công ty hết */}
          <Link href="/tai-khoan-claude" onClick={() => setMo(false)}>Tài khoản Claude cá nhân</Link>
          {/* Chỉ quản trị (Mr. Đại chốt 29/09): đối chiếu báo cáo đã gửi với sổ cái — trước chỉ mở được từ tin nhắn */}
          {toi?.co_the?.ra_soat_so_cai ? (
            <Link href={DUONG_RA_SOAT} onClick={() => setMo(false)}>
              Rà soát sổ cái{toi.so_viec_thieu_so_cai ? ` (${toi.so_viec_thieu_so_cai})` : ""}
            </Link>
          ) : null}
          <button onClick={() => (setDoiMk(true), setMo(false))}>Đổi mật khẩu</button>
          <button onClick={() => void dangXuat()}>Đăng xuất</button>
          {/* Mr. Đại chốt 04/10: dưới Đăng xuất gạch ngang + link các agent, đúng thứ tự; chưa có link thì ghi rõ */}
          <div className="dai-agent">
            {(dayAgent ?? DAY_AGENT.map((a) => ({ ...a, diaChi: null }))).map((a) =>
              a.ma === "base" ? (
                <div key={a.ma} className="chu">
                  <b>{a.ten}</b> · {DANG_O_DAY}
                </div>
              ) : a.diaChi ? (
                <a key={a.ma} href={a.diaChi} target="_blank" rel="noreferrer">
                  {a.ten} ↗
                </a>
              ) : (
                <div key={a.ma} className="chu">
                  {a.ten} · {dayAgent ? CHUA_HOAT_DONG : "…"}
                </div>
              )
            )}
          </div>
        </div>
      )}
      {doiMk && <DoiMatKhau dong={() => setDoiMk(false)} xong={() => setDoiMk(false)} />}
    </span>
  );
}

/** Ô chọn tuần — Sơ đồ tổ chức (?ngay=) và Báo cáo tuần (?tuan= — xem bản đã lưu của tuần đó) */
/** Danh sách chọn tuần: tuần hiện tại + 12 tuần trước — Mr. Đại 26/10/2026, áp mọi agent */
const SO_TUAN_CHON = 13;

function ChonTuan({ baoCao }: { baoCao?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const homNay = homNayVN();
  const ds = cacTuanGanDay(homNay, SO_TUAN_CHON); // tuần này + 12 tuần trước (Mr. Đại 26/10/2026 — danh sách không dài theo năm tháng)
  const dang = tuanCua((baoCao ? sp.get("tuan") : sp.get("ngay")) || homNay).tu;
  return (
    <select
      className="chon-toi"
      data-gt="chon-tuan"
      title={(() => { const t = ds.find((x) => x.tu === dang); return t ? `Tuần ${t.so} · ${nhanTuanGon(t.tu, t.den)}` : "Tuần báo cáo"; })()}
      value={dang}
      onChange={(e) => {
        const moiNhat = e.target.value === ds[0].tu;
        if (baoCao) return router.push(`/bao-cao-tuan?tuan=${e.target.value}`);
        ghiNho(KHOA_TUAN, moiNhat ? "" : e.target.value); // quay lại Sơ đồ tổ chức từ menu khác vẫn đúng tuần này
        router.push(moiNhat ? "/so-do" : `/so-do?ngay=${e.target.value}`);
      }}
    >
      {ds.map((t) => (
        <option key={t.tu} value={t.tu}>
          {t.tu === dang ? `Tuần ${t.so}` : `Tuần ${t.so} · ${nhanTuanGon(t.tu, t.den)}`}
        </option>
      ))}
    </select>
  );
}

/**
 * Hộp chọn dự án khi đang ở Cây việc & đường găng (Mr. Đại chốt 03/10/2026): vào từ icon lịch trên ô dự án (menu Dự án),
 * đổi dự án ngay tại đây mà không phải quay ra màn 3D. Chỉ liệt kê dự án có cây WBS bên agent Tiến độ. Chọn là chuyển.
 */
function ChonDuAnCay() {
  const router = useRouter();
  const sp = useSearchParams();
  const [ds, setDs] = useState<{ id: string; ten: string; loai: string }[] | null>(null);
  useEffect(() => {
    goiApi<{ du_an: { id: string; ten: string; loai: string }[] }>("/api/phong/du-an-co-cay")
      .then((r) => setDs(r.du_an))
      .catch(() => setDs([]));
  }, []);
  const duong = usePathname(); // /cay-viec hoặc /cay-viec/issue — đổi dự án vẫn ở đúng màn
  if (!ds?.length) return null;
  const dang = sp.get("du_an") || ds[0].id;
  return (
    <select className="chon-toi chon-du-an" data-gt="chon-du-an-cay" title="Cây việc & đường găng của dự án nào" value={dang} onChange={(e) => router.push(`${duong}?du_an=${encodeURIComponent(e.target.value)}`)}>
      {ds.map((d) => (
        <option key={d.id} value={d.id}>
          {d.loai ? `${d.loai} ` : ""}
          {d.ten}
        </option>
      ))}
    </select>
  );
}

export function KhungPhong({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Nút Việc của tôi PHÁT SÁNG khi có việc mới giao đích danh cho mình làm chủ trì — mở màn đó thì hết (Mr. Đại chốt 08/10)
  const soViecMoi = useToi()?.so_viec_moi ?? 0;
  const sangViec = (href: string) => href === "/viec-cua-toi" && soViecMoi > 0 && pathname !== "/viec-cua-toi";
  const router = useRouter();
  const [bao, setBao] = useState("");
  const mucMenu = (m: (typeof MENU)[number]) =>
            m.tat ? (
              <a key={m.href} data-gt={`menu:${m.href}`} className="mo-mat" title={m.tat} aria-disabled onClick={(e) => (e.preventDefault(), setBao(m.tat!), window.setTimeout(() => setBao(""), 3500))} href={m.href}>
                {m.nhan}
              </a>
            ) : (
              <Link
                key={m.href}
                href={m.href}
                data-gt={`menu:${m.href}`}
                // Cây việc & đường găng vào từ ô dự án → menu Dự án vẫn sáng
                className={`${pathname === m.href || pathname.startsWith(m.href + "/") || (m.href === "/du-an" && pathname.startsWith("/cay-viec")) ? "dang" : ""}${sangViec(m.href) ? " phat-sang" : ""}`}
                title={sangViec(m.href) ? `Có ${soViecMoi} việc mới giao cho bạn làm chủ trì — bấm để xem` : undefined}
                onClick={(e) => {
                  // Sơ đồ tổ chức: mở lại đúng tuần đã chọn trước khi rời đi (nhớ theo phiên)
                  if (m.href !== "/so-do") return;
                  const ngay = docNho<string>(KHOA_TUAN) as unknown as string | null;
                  if (ngay && /^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
                    e.preventDefault();
                    router.push(`/so-do?ngay=${ngay}`);
                  }
                }}
              >
                {m.nhan}
              </Link>
            );

  return (
    <div className="gd-phong">
      <header className="thanh-tren">
        <span className="ten-app">
          <span className="logo">S</span>SCI công việc
        </span>
        {/* Thứ tự (Mr. Đại chốt 29/09): chuông SAU "Dự án"; Cài đặt chuyển vào menu tên người (Hướng dẫn cũ đã xoá 01/10 — thay bằng nút Giải thích) */}
        <nav className="menu">{MENU.filter((m) => m.cho === "trai").map(mucMenu)}</nav>
        {pathname.startsWith("/cay-viec") && (
          <Suspense fallback={null}>
            <ChonDuAnCay />
          </Suspense>
        )}
        <Chuong />
        <div className="menu-phai">
          <nav className="menu">{MENU.filter((m) => m.cho === "gui").map(mucMenu)}</nav>
          {(pathname === "/so-do" || pathname === "/bao-cao-tuan") && (
            <Suspense fallback={null}>
              <ChonTuan baoCao={pathname === "/bao-cao-tuan"} />
            </Suspense>
          )}
          {/* Giải thích (thay Hướng dẫn) — bên phải nút chọn tuần (Mr. Đại chốt 01/10) */}
          <NutGiaiThich />
          {/* Hướng dẫn từng bước (Mr. Đại 20/10/2026) — cạnh Giải thích; màn chưa có thì mờ */}
          <NutHuongDanTren />
          {/* Góp ý, phản ánh — bên trái tên người (Mr. Đại chốt 01/10); ghi kèm màn đang mở để biết góp ý cho chỗ nào */}
          <Link
            href={pathname === "/gop-y" ? "/gop-y" : `/gop-y?tu=${encodeURIComponent(pathname)}`}
            className={`nut-tren ${pathname === "/gop-y" ? "dang-mo" : ""}`}
            data-gt="gop-y"
            title="Góp ý, phản ánh: bất cập bạn gặp, đề xuất cho phần mềm tốt hơn — mọi người cùng đọc, quản trị trả lời"
          >
            Góp ý
          </Link>
          {/* SÁNG / TỐI — sát bên trái tên người (Mr. Đại 26/10/2026) */}
          <NutSangToi />
          <MenuNguoi />
        </div>
      </header>
      {children}
      <LopGiaiThich />
      {bao && <div className="toast">{bao}</div>}
    </div>
  );
}
