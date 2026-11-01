"use client";

// ============================================================
// VIỆC CỦA TÔI — bản HAI NỬA (Mr. Đại chốt 04/10/2026 chiều, trả lời ở phiên Quan sát; CHOT LOI-DUNG-CHUNG 6g.7 mục 3)
//
//   Hai vùng mỗi vùng ½ khung (trừ menu trái), cao BẰNG CHIỀU CAO MÀN HÌNH, không cuộn trang (màn rộng ≥ lg; điện thoại xếp dọc).
//   TRÁI (cố định): "🤖 Việc AI soạn chờ duyệt" — "Tải lại" căn trái đầu vùng · số thẻ/trang TỰ CO theo chiều cao (Mr. Đại chốt
//     04/10 chiều, bỏ 10/trang), nút trang ở dưới. Mỗi thẻ theo KHUÔN CHUNG mọi màn giao việc theo gợi ý AI (chốt 04/10 chiều):
//     ô trình bày một khối chữ (Tên việc · Giao cho · Thuộc dự án · Hạn · Kết quả cần có · Nguồn) — bên ngoài ô: chọn người nhận
//     (AI chọn sẵn, chọn là áp dụng) + [Giao việc][Sửa][Bỏ qua]. Nháp đã giao / trùng thì máy chủ ẩn (route /api/viec).
//   PHẢI (Mr. Đại chốt 07/10/2026): GIỐNG khu phải Sơ đồ tổ chức agent Công việc — một hàng [3 nút][ô tìm] không xuống dòng; nhóm
//     theo đơn vị ("CỦA RIÊNG BAN LÃNH ĐẠO … 8"); mỗi dòng › · ! găng · tên tối đa 2 dòng · tình trạng ("quá hạn 3 ngày" / "còn 2 ngày");
//     khối "Việc làm xong: Tuần N−1 và N" cuối nhóm; cuộn trong khung (bỏ chia trang). Bấm một việc → việc khác tối nền, thẻ việc
//     agent Công việc bung tại chỗ. Màu/cỡ chữ ở phai-viec.css; chữ cam của agent Công việc → xanh dương.
//   Sửa → vùng phải ẩn danh sách, hiện ô giao việc giống ô "+" của agent Công việc (FormGiaoCongViec). Giao xong / ✕ → về danh sách.
// 07/10/2026 (Mr. Đại chốt) — KHUNG TRÁI: tiêu đề "Agent AI đề xuất giao việc" (agent con: "Agent <Tên> đề xuất giao việc") · số việc ·
//   Nguồn trên MỘT dòng; Main hàng 1 = 5 nút agent Tiến độ · Hợp đồng · Công việc · Pháp lý · Nghiệm thu bằng nhau (bấm lại nút đang chọn = xem
//   tất cả); hàng 2 mọi agent = [Tải lại][Dự án][Lọc] chia đều; ô Lọc 7 lựa chọn (LUA_CHON_LOC_NHAP); phóng to/thu nhỏ trình
//   duyệt vẫn luôn thấy ĐÚNG 2 thẻ (thẻ cao = ½ khung, ô nội dung co giãn, chữ dài cuộn trong ô).
// ĐỢT ④ (06/10/2026): ở Main vùng trái là BẢNG TỔNG — nháp Main + nháp chờ duyệt Tiến độ · Hợp đồng (route gom qua cửa
//   <agent>.viec_cho_duyet), 3 lọc agent · dự án · xếp; Giao/Sửa/Bỏ mang `agent` để route chuyển về agent gốc. Agent con không
//   có nháp mang `agent` nên hàng lọc tự ẩn — bản chép sang Tiến độ · Hợp đồng chạy y như cũ.
// Main xem MỌI dự án; Tiến độ · Hợp đồng lọc theo dự án đang chọn (route gửi `phamVi`). Dữ liệu qua /api/viec → lib/chung/viec-cong-viec.ts.
// BẢN GỐC ở Main — sửa ở đây rồi chép nguyên sang Tiến độ · Hợp đồng (luật 7).
// ============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { hanDaQua, ketQuaMacDinhNhap, LUA_CHON_LOC_NHAP, maNhanTuGoiY, NHAN_NGUON_VIEC, nguonViecCua, type LocNhap, type NguonViec, type LoaiViecToi, type NguoiNhanCV, type NhapHien, type ViecCuaToiCV, type ViecCV, type ViecTuDong, lyDoGon } from "@/lib/chung/viec-cong-viec-kieu";
import { TEN_AGENT_HOI_TRUNG } from "@/lib/chung/hoi-trung-kieu";
import { LY_DO_CHAN } from "@/lib/quyen";
import { NUT, NUT_CHINH } from "./chung";
import { FormGiaoCongViec, type GuiGiaoCV } from "./FormGiaoCongViec";
import { KhungViecTaiCho } from "./KhungViecTaiCho";
import { OChonNoiNhan } from "./OChonNoiNhan";
import { TheNhap, hanHien } from "./TheNhap";
import "./phai-viec.css";
import { ngayTrongChu } from "@/lib/ngay-hien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface GoiViec {
  ok: boolean;
  viec: ViecCuaToiCV;
  goc: string;
  nhapAi: NhapHien[];
  /** Tiến độ · Hợp đồng: "dự án HV …" (lọc theo dự án đang chọn); Main không gửi = mọi dự án */
  phamVi?: string;
  maViec?: string | null;
  tenNhan?: string;
  message?: string;
  /** Đợt ④ (bảng tổng ở Main): agent chưa gom được — không thưa / chưa mở cửa */
  chuaDoc?: { agent: string; ten: string; lyDo: string }[];
  /** Tiến độ · Hợp đồng: mã ngắn dự án đang chọn ở thanh trên — ô Dự án khung trái mặc định chọn sẵn (07/10) */
  maDuAnDangChon?: string;
  /** "Tự đóng (N) ▸" (Mr. Đại duyệt 08/10): việc máy tự đóng — một danh sách thu gọn dưới khung trái */
  tuDong?: ViecTuDong[];
}

const CAO_THE_TRAI = 204; // px — thẻ nháp màn hẹp (điện thoại, không khoá chiều cao)
const MOI_TRANG_TRAI = 2; // Mr. Đại chốt 07/10: mọi mức phóng to/thu nhỏ luôn thấy đúng 2 thẻ — màn rộng thẻ cao = ½ khung

/** Nút agent hàng 1 khung trái Main (Mr. Đại chốt 07/10) — thứ tự cố định, Pháp lý có nút cả khi chưa gửi việc.
 *  09/10 (Mr. Đại): thêm "Tất cả" đứng đầu (mã rỗng = việc của mọi agent). 20/10: thêm Nghiệm thu → 6 nút, xếp 3 × 2 để tên không bị cắt trên điện thoại */
const NUT_AGENT: { ma: string; ten: string }[] = [
  { ma: "", ten: "Tất cả" },
  { ma: "tiendo", ten: "Tiến độ" },
  { ma: "hopdong", ten: "Hợp đồng" },
  { ma: "base", ten: "Công việc" },
  { ma: "phaply", ten: "Pháp lý" },
  { ma: "nghiemthu", ten: "Nghiệm thu" },
];

// Nhãn + giải thích chép đúng agent Công việc (components/phong/viec.ts NUT_LOC — chốt 28/09)
const NUT_LOC: { kieu: LoaiViecToi; nhan: string; giaiThich: string }[] = [
  { kieu: "giao", nhan: "Việc tôi giao", giaiThich: "Việc tôi giao thủ công (nút + Giao việc, hoặc quyết định TGĐ) — không tính việc máy tách từ báo cáo" },
  { kieu: "nhan", nhan: "Việc tôi nhận", giaiThich: "Việc tôi chủ trì, giao đích danh tên tôi hoặc chức danh lãnh đạo tôi giữ — không tính việc giao cho cả đơn vị" },
  { kieu: "phoi_hop", nhan: "Việc cần phối hợp", giaiThich: "Phần phối hợp chưa xong giao đích danh tôi; trưởng đơn vị thấy cả phần giao cho đơn vị mình. Việc tôi đã chủ trì thì không tính" },
];

function ngayVn(iso: string | null): string {
  if (!iso) return "Không hạn";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Danh sách "Tự đóng" chia trang theo E40 (30 dòng) */
const MOI_TRANG_TU_DONG = 30;

function PhanTrang({ trang, soTrang, tong, onDoi }: { trang: number; soTrang: number; tong: number; onDoi: (t: number) => void }) {
  if (soTrang <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border-light pt-2 text-[11.5px] text-text-muted">
      <button className={NUT} disabled={trang <= 0} onClick={() => onDoi(trang - 1)}>← Trước</button>
      <span>Trang {trang + 1}/{soTrang} · {tong.toLocaleString("vi-VN")} việc</span>
      <button className={NUT} disabled={trang >= soTrang - 1} onClick={() => onDoi(trang + 1)}>Sau →</button>
    </div>
  );
}

/** Bỏ dấu tiếng Việt để tìm (như ô tìm agent Công việc) */
const boDau = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Một dòng việc — đúng khuôn .muc-viec agent Công việc: › · ! găng · tên (tối đa 2 dòng) · tình trạng bên phải */
function DongViec({ v, onMo }: { v: ViecCV; onMo: () => void }) {
  const tt = v.tt ?? (v.qua_han_ngay ? "tre" : "con");
  const chu = v.tt_chu ?? (v.qua_han_ngay ? `quá hạn ${v.qua_han_ngay} ngày` : v.han ? `hạn ${ngayVn(v.han)}` : "");
  return (
    <div className={`muc-viec${tt === "xong" ? " da-xong" : ""}`}>
      <button type="button" className="dau-viec" onClick={onMo} data-lenh="viec.mo-viec" data-gia-tri={v.ten} title={`${v.ma_viec_base} — bấm để xem chi tiết ngay tại chỗ`}>
        <span className="mui">›</span>
        <span className="t">
          {v.gang && (
            <span className="dau-moi" title="Việc chưa xong nằm trên đường găng — trễ việc này là lùi ngày COD">
              !
            </span>
          )}
          {v.ten}
        </span>
        <span className={`r tt-${tt}`}>{chu}</span>
      </button>
    </div>
  );
}

/** Nhóm theo đơn vị như agent Công việc (agent Công việc bản cũ không gửi nhóm → một nhóm không đầu) */
function nhomViec(ds: ViecCV[]): { ten: string; thuTu: number; ds: ViecCV[] }[] {
  const m = new Map<string, { ten: string; thuTu: number; ds: ViecCV[] }>();
  for (const v of ds) {
    const k = v.nhom ?? "";
    if (!m.has(k)) m.set(k, { ten: k, thuTu: v.nhom_thu_tu ?? 0, ds: [] });
    m.get(k)!.ds.push(v);
  }
  // Trong nhóm: việc thường xuyên cuối, còn lại theo hạn (xepViec của agent Công việc)
  const hanX = (v: ViecCV) => v.han ?? "9999";
  for (const g of Array.from(m.values())) g.ds.sort((a, b) => Number(a.tt === "thuong-xuyen") - Number(b.tt === "thuong-xuyen") || hanX(a).localeCompare(hanX(b)));
  return Array.from(m.values()).sort((a, b) => a.thuTu - b.thuTu);
}

/** Hạn → "yyyy-mm-dd" để xếp "gấp nhất trước"; không hạn → "9999" (xếp cuối) */
function hanXep(han?: string | null): string {
  const s = (han ?? "").trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : "9999";
}

// hanHien chuyển sang TheNhap.tsx (01/11/2026) — import ở trên

/** duocGhi = qua cửa "ghi" (quyen.ts). Không qua → Sửa/Gửi/Bỏ MỜ kèm lý do (luật 17 — Main). */
export function ViecView({ duocGhi, tieuDeTrai = "Agent AI đề xuất giao việc" }: { duocGhi: boolean; tieuDeTrai?: string }) {
  const [goi, setGoi] = useState<GoiViec | null>(null);
  const [dangTai, setDangTai] = useState(true);
  const [bao, setBao] = useState<{ ok: boolean; chu: string } | null>(null);
  const [dangGui, setDangGui] = useState<string | null>(null);
  const [loc, setLoc] = useState<LoaiViecToi>("nhan");
  const [trangTrai, setTrangTrai] = useState(0);
  /** Ô tìm cạnh 3 nút (07/10) — lọc ngay danh sách đang xem */
  const [tim, setTim] = useState("");
  /** Nhóm đang mở khối "Việc làm xong" */
  const [moXong, setMoXong] = useState<Set<string>>(new Set());
  const [ds, setDs] = useState<NguoiNhanCV | null>(null);
  const [loiDs, setLoiDs] = useState<string | null>(null);
  const [sua, setSua] = useState<NhapHien | null>(null);
  const [loiSua, setLoiSua] = useState<string | null>(null);
  const [caoThe, setCaoThe] = useState(CAO_THE_TRAI);
  /** Người nhận đang chọn trên từng thẻ nháp (chưa chọn tay → người AI gợi ý) */
  const [chonNhan, setChonNhan] = useState<Record<string, string>>({});
  const [moViec, setMoViec] = useState<ViecCV | null>(null);
  // Đợt ④ — 3 lọc bảng tổng (chọn là áp dụng, G9): agent tạo ra · dự án · xếp
  const [locAgent, setLocAgent] = useState("");
  const [locDuAn, setLocDuAn] = useState("");
  const [locNhap, setLocNhap] = useState<LocNhap>("moi");
  /** "Tự đóng (N)" đang bung — thay chỗ 2 thẻ chờ duyệt (khung trái giữ nguyên chiều cao) */
  const [moTuDong, setMoTuDong] = useState(false);
  const [trangTd, setTrangTd] = useState(0);
  /** Ô Dự án đã đặt mặc định theo dự án đang chọn ở thanh trên chưa (một lần) */
  const daDatDuAn = useRef(false);
  /** 01/11/2026: màn Cảnh báo mở thẳng một nháp («Mở ở Việc của tôi →», ?nhap=<mã>) — nháp đó được tô viền */
  const [nhapSang, setNhapSang] = useState<string | null>(null);
  const daMoNhap = useRef(false);
  const khungDs = useRef<HTMLDivElement>(null);
  const khungTrai = useRef<HTMLDivElement>(null);

  const nap = useCallback(async () => {
    setDangTai(true);
    try {
      const r = await fetch("/api/viec", { cache: "no-store" });
      setGoi((await r.json()) as GoiViec);
    } catch {
      setBao({ ok: false, chu: "Không gọi được máy chủ app — thử lại sau vài giây (máy chủ có thể đang biên dịch lại)." });
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    void nap();
  }, [nap]);

  // Danh sách người nhận + dự án + cài đặt tệp — cần để hiện tên người AI chọn và để mở ô Sửa
  useEffect(() => {
    void (async () => {
      try {
        const j = (await (await fetch("/api/viec/nguoi-nhan", { cache: "no-store" })).json()) as { ok: boolean; ds?: NguoiNhanCV; message?: string };
        if (j.ok && j.ds) setDs(j.ds);
        else setLoiDs(j.message ?? "Không lấy được danh sách người nhận");
      } catch {
        setLoiDs("Không gọi được máy chủ app");
      }
    })();
  }, []);

  // Vùng trái: luôn 2 thẻ — màn rộng (khung khoá bằng chiều cao màn hình) mỗi thẻ cao ½ khung, nên phóng to/thu nhỏ trình duyệt thì ô
  // nội dung tự cao lên / thấp xuống; màn hẹp giữ chiều cao cố định
  useLayoutEffect(() => {
    const k = khungTrai.current;
    if (!k) return;
    const rong = window.matchMedia("(min-width: 1024px)");
    const tinh = () => setCaoThe(rong.matches ? Math.max(150, Math.floor(k.clientHeight / MOI_TRANG_TRAI)) : CAO_THE_TRAI);
    tinh();
    const ro = new ResizeObserver(tinh);
    ro.observe(k);
    rong.addEventListener("change", tinh);
    return () => {
      ro.disconnect();
      rong.removeEventListener("change", tinh);
    };
  }, [goi]);

  // 01/11/2026: ?nhap=<mã> từ màn Cảnh báo — bỏ lọc agent, đặt ô Dự án theo nháp, lật tới đúng trang, tô viền nháp
  useEffect(() => {
    if (daMoNhap.current || !goi?.ok) return;
    daMoNhap.current = true;
    const ma = new URLSearchParams(window.location.search).get("nhap");
    if (!ma) return;
    const n = goi.nhapAi.find((x) => x.id === ma);
    if (!n) {
      setBao({ ok: false, chu: "Nháp mở từ màn Cảnh báo không còn ở đây — đã giao hoặc đã bỏ." });
      return;
    }
    daDatDuAn.current = true;
    const duAn = n.maDuAn ?? "";
    const theoDuAnNay = goi.nhapAi.filter((x) => !duAn || x.maDuAn === duAn).sort((a, b) => b.luc.localeCompare(a.luc));
    setLocDuAn(duAn);
    setLocAgent("");
    setLocNhap("moi");
    setMoTuDong(false);
    setTrangTrai(Math.max(0, Math.floor(theoDuAnNay.findIndex((x) => x.id === ma) / MOI_TRANG_TRAI)));
    setNhapSang(ma);
    // «Sửa» bấm từ thẻ nháp bung ở màn Cảnh báo → bật luôn ô Sửa của nháp này
    if (new URLSearchParams(window.location.search).get("sua") === "1") setSua(n);
  }, [goi]);

  // Ô Dự án mặc định = dự án đang chọn ở thanh trên (Tiến độ · Hợp đồng); Main không gửi → Mọi dự án
  useEffect(() => {
    if (!daDatDuAn.current && goi?.maDuAnDangChon) {
      daDatDuAn.current = true;
      setLocDuAn(goi.maDuAnDangChon);
    }
  }, [goi]);

  async function goiPost(payload: Record<string, unknown>, id: string, tuForm = false): Promise<boolean> {
    setDangGui(id);
    setBao(null);
    setLoiSua(null);
    try {
      const r = await fetch("/api/viec", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = (await r.json()) as GoiViec;
      if (j.ok) {
        setGoi(j);
        if (payload.action === "gui-nhap") setBao({ ok: true, chu: `✓ Đã giao cho ${j.tenNhan || "người đã chọn"} — việc ${j.maViec ?? ""} ở agent Công việc` });
        return true;
      }
      if (tuForm) setLoiSua(j.message ?? "Có lỗi, thử lại.");
      else setBao({ ok: false, chu: j.message ?? "Có lỗi, thử lại." });
    } catch {
      const m = "Không gọi được máy chủ app — thử lại sau vài giây.";
      if (tuForm) setLoiSua(m);
      else setBao({ ok: false, chu: m });
    } finally {
      setDangGui(null);
    }
    return false;
  }

  if (dangTai && !goi) return <div className="p-5 text-[12px] text-text-muted">Đang đọc việc từ agent Công việc…</div>;
  const g = goi;
  if (!g?.ok) return <p className="p-5 text-[12px] text-red">{g?.message ?? bao?.chu ?? "Không đọc được dữ liệu."}</p>;

  // Bảng tổng (Main): nháp mang `agent` — lọc + xếp; agent con (không mang agent) giữ nguyên danh sách
  const tatCaNhap = g.nhapAi;
  const coBangTong = tatCaNhap.some((n) => n.agent && n.agent !== "main") || !!g.chuaDoc?.length;
  const demAgent = new Map<string, number>();
  for (const n of tatCaNhap) demAgent.set(n.agent ?? "", (demAgent.get(n.agent ?? "") ?? 0) + 1);
  const dsDuAnNhap = Array.from(new Set([...tatCaNhap.map((n) => n.maDuAn), g.maDuAnDangChon ?? ""].filter(Boolean))).sort();
  // Ô Lọc (07/10): 2 cách xếp + 4 bộ lọc (xếp gấp nhất trước). "Hạn trong 7 ngày" = hôm nay tới hôm nay + 7 (8 ngày lịch — Mr. Đại giữ như cũ 07/10)
  const homNay = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const sau7 = new Date(Date.now() + 7 * 36e5 + 7 * 864e5).toISOString().slice(0, 10);
  const quaLoc = (n: NhapHien): boolean => {
    const h = hanXep(n.han);
    switch (locNhap) {
      case "gang":
        return !!n.gang || nguonViecCua(n) === "cay-viec";
      case "do":
        return n.mucDo === "red";
      case "chua-nguoi":
        return !n.giaoCho;
      case "han-7":
        return h !== "9999" && h >= homNay && h <= sau7;
      default:
        return true;
    }
  };
  const theoDuAn = tatCaNhap.filter((n) => !locDuAn || n.maDuAn === locDuAn);
  // Tự đóng theo cùng ô Dự án + nút agent của khung trái
  const tuDong = (g.tuDong ?? []).filter((t) => (!locDuAn || t.maDuAn === locDuAn) && (!locAgent || (t.agent ?? "") === locAgent));
  const nhap = theoDuAn
    .filter((n) => (!locAgent || (n.agent ?? "") === locAgent) && quaLoc(n))
    .sort((a, b) => (locNhap === "moi" ? b.luc.localeCompare(a.luc) : hanXep(a.han).localeCompare(hanXep(b.han))));
  const moiTrangTrai = MOI_TRANG_TRAI;
  const soTrangTrai = Math.max(1, Math.ceil(nhap.length / moiTrangTrai));
  const soTrangTd = Math.max(1, Math.ceil(tuDong.length / MOI_TRANG_TU_DONG));
  const ttTd = Math.min(trangTd, soTrangTd - 1);
  const tt = Math.min(trangTrai, soTrangTrai - 1);
  const dsLoc = g.viec.ds[loc];
  const tuKhoa = boDau(tim.trim());
  const khop = (v: ViecCV) =>
    !tuKhoa || boDau([v.ma_viec_base, v.ten, v.du_an, v.chu_tri, v.nguoi_giao, v.nhom].filter(Boolean).join(" ")).includes(tuKhoa);
  const nhomMo = nhomViec(dsLoc.filter(khop));
  const xongLoc = (g.viec.lamXong?.ds[loc] ?? []).filter(khop);
  const nhomXong = new Map(nhomViec(xongLoc).map((x) => [x.ten, x.ds]));
  // Nhóm chỉ có việc làm xong vẫn hiện (như agent Công việc)
  const nhomPhai = [
    ...nhomMo.map((x) => ({ ...x, xong: nhomXong.get(x.ten) ?? [] })),
    ...nhomViec(xongLoc)
      .filter((x) => !nhomMo.some((y) => y.ten === x.ten))
      .map((x) => ({ ...x, ds: [] as ViecCV[], xong: x.ds })),
  ].sort((a, b) => a.thuTu - b.thuTu);
  const tenNhanCua = (ma: string) => ds?.don_vi.find((d) => d.id === ma)?.ten ?? ds?.nguoi.find((n) => n.id === ma)?.ten ?? "";
  const tenDuAnCua = (ma: string) => ds?.du_an?.find((d) => d.id === ma)?.ten ?? ma;

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:h-[calc(100dvh-var(--cao-topmenu))] lg:grid-cols-2 lg:overflow-hidden">
      <KhaiHuongDan ma="viec-cua-toi" />
      {/* ── TRÁI: việc AI soạn chờ duyệt ── */}
      <section className="trai-viec flex min-h-[420px] flex-col p-3 lg:min-h-0" data-gt="viec:trai">
        {/* Tiêu đề · số việc · Nguồn — MỘT dòng (Mr. Đại chốt 07/10). Khối gồm việc MÁY soạn từ issue (0 token) lẫn 🤖 AI soạn */}
        <div className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap border-b border-border pb-2" data-gt="viec:theo-nguon">
          <b className="shrink-0 text-[13px] text-text">{tieuDeTrai}</b>
          <span className="shrink-0 text-[11px] text-text-muted">· {nhap.length === tatCaNhap.length ? `${nhap.length} việc` : `${nhap.length}/${tatCaNhap.length} việc`}</span>
          {/* Ghi rõ TỪNG NGUỒN của các việc đang hiện (theo lọc) — cộng lại bằng tổng, đối chiếu được với màn nguồn */}
          {nhap.length > 0 && (
            <span className="truncate text-[11px] text-text-secondary">
              · Nguồn:{" "}
              {(Object.keys(NHAN_NGUON_VIEC) as NguonViec[])
                .map((k) => [k, nhap.filter((n) => nguonViecCua(n) === k).length] as const)
                .filter(([, d]) => d > 0)
                .map(([k, d]) => `${NHAN_NGUON_VIEC[k]} ${d}`)
                .join(" · ")}
            </span>
          )}
        </div>
        {coBangTong && (
          // Hàng 1 (Main): Tất cả + 5 nút agent bằng nhau, 2 hàng × 3 cột; bấm lại nút agent đang chọn = về Tất cả
          <div className="mt-2 grid grid-cols-3 gap-1.5" data-gt="viec:loc-bang-tong">
            {NUT_AGENT.map(({ ma, ten }) => (
              <button
                key={ma}
                type="button"
                className={`${locAgent === ma ? NUT_CHINH : NUT} w-full truncate whitespace-nowrap !px-1 text-center`}
                data-lenh="viec.loc-agent"
                data-gia-tri={ten}
                title={!ma ? "Hiện việc của mọi agent" : locAgent === ma ? "Bấm lại để xem việc của mọi agent" : `Chỉ hiện việc agent ${ten} đề xuất`}
                onClick={() => {
                  setLocAgent(!ma || locAgent === ma ? "" : ma);
                  setTrangTrai(0);
                }}
              >
                {ten} ({ma ? theoDuAn.filter((n) => n.agent === ma).length : theoDuAn.length})
              </button>
            ))}
          </div>
        )}
        {/* Hàng 2 (mọi agent): [Tải lại][Dự án][Lọc] chia đều hết bề ngang — chọn là áp dụng */}
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <button type="button" className={`${NUT} w-full whitespace-nowrap`} disabled={dangTai} onClick={() => void nap()} data-lenh="viec.tai-lai">
            {dangTai ? "Đang tải…" : "Tải lại"}
          </button>
          <select
            className="w-full min-w-0 rounded-sm border border-border bg-transparent px-1.5 text-[12px] text-text"
            value={locDuAn}
            data-lenh="viec.loc-du-an"
            title="Lọc theo dự án"
            onChange={(e) => {
              setLocDuAn(e.target.value);
              setTrangTrai(0);
            }}
          >
            <option value="">Mọi dự án</option>
            {dsDuAnNhap.map((m) => (
              <option key={m} value={m}>
                {m} {tenDuAnCua(m) !== m ? tenDuAnCua(m) : ""}
              </option>
            ))}
          </select>
          <select
            className="w-full min-w-0 rounded-sm border border-border bg-transparent px-1.5 text-[12px] text-text"
            value={locNhap}
            data-lenh="viec.loc-nhap"
            title="Lọc / cách xếp"
            onChange={(e) => {
              setLocNhap(e.target.value as LocNhap);
              setTrangTrai(0);
            }}
          >
            {LUA_CHON_LOC_NHAP.map((l) => (
              <option key={l.kieu} value={l.kieu}>
                {l.nhan}
              </option>
            ))}
          </select>
        </div>
        {!!g.chuaDoc?.length && (
          <p className="mt-1 text-[11px] text-text-muted" title={g.chuaDoc.map((c) => `${c.ten}: ${c.lyDo}`).join(" · ")}>
            Chưa gom được: {g.chuaDoc.map((c) => `${c.ten} (${c.lyDo})`).join(" · ")}
          </p>
        )}
        {bao && <p className={`mt-2 text-[12px] font-semibold ${bao.ok ? "text-green" : "text-red"}`}>{bao.chu}</p>}
        <div ref={khungTrai} className={`ds-nhap min-h-0 flex-1 ${moTuDong ? "overflow-y-auto" : "overflow-hidden"}`}>
          {moTuDong && (
            // Mr. Đại chốt 08/10: việc máy tự đóng gom MỘT danh sách, bấm mới bung — không lẫn vào việc đang chờ. Chữ thuần, không viền (luật 28)
            <div data-gt="viec:tu-dong">
              {tuDong.length === 0 && <p className="mt-3 text-[12px] text-text-muted">Không có việc nào máy tự đóng.</p>}
              {/* Chia 30 dòng/trang (E40 — danh sách giữ 90 ngày, tăng theo thời gian; kiểm độc lập 10/10) */}
              {tuDong.slice(ttTd * MOI_TRANG_TU_DONG, (ttTd + 1) * MOI_TRANG_TU_DONG).map((t) => (
                <div key={`${t.agent ?? ""}|${t.id}`} className="flex items-start gap-2 border-b border-border py-1.5 text-[11.5px] leading-[17px]">
                  <div className="min-w-0 flex-1">
                    <div className="text-text" title={t.ten}>
                      {t.ten}
                    </div>
                    <div className="text-[10.5px] text-text-muted">
                      Máy tự đóng {hanHien(t.luc.slice(0, 10))}
                      {t.maDuAn ? ` · ${t.maDuAn}` : ""}
                      {t.agent ? ` · agent ${TEN_AGENT_HOI_TRUNG[t.agent] ?? t.agent}` : ""} · 90 ngày sau xoá hẳn
                      {/* Mr. Đại 09/10: lý do nối tiếp cùng dòng, chữ cam (#C2724F = cam chung 4 agent — tk1 / --orange Pháp lý) */}
                      {t.lyDo && <span style={{ color: "#C2724F" }}> · Lý do: {lyDoGon(t.lyDo)}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`${NUT} shrink-0`}
                    data-lenh="viec.hien-lai-tu-dong"
                    data-gia-tri={t.ten}
                    disabled={!duocGhi || dangGui === t.id}
                    title={duocGhi ? "Đưa về lại danh sách chờ duyệt — máy không tự đóng việc này nữa" : LY_DO_CHAN.ghi}
                    onClick={() => void goiPost({ action: "hien-lai-tu-dong", id: t.id, agent: t.agent }, t.id)}
                  >
                    Hiện lại
                  </button>
                </div>
              ))}
            </div>
          )}
          {!moTuDong && nhap.length === 0 && <p className="mt-3 text-[12px] text-text-muted">Không có việc soạn sẵn nào đang chờ duyệt.</p>}
          {!moTuDong && nhap.slice(tt * moiTrangTrai, (tt + 1) * moiTrangTrai).map((n) => {
            const maNhan = chonNhan[n.id] ?? maNhanTuGoiY(ds, n.giaoCho);
            // 01/11/2026: thẻ tách ra TheNhap.tsx — màn Cảnh báo bung đúng thẻ này tại chỗ
            return (
              <TheNhap
                key={n.id}
                n={n}
                ds={ds}
                loiDs={loiDs}
                maNhan={maNhan}
                onChonNhan={(x) => setChonNhan((c) => ({ ...c, [n.id]: x }))}
                duocGhi={duocGhi}
                dang={dangGui === n.id}
                lop={`${sua?.id === n.id ? " dang-sua" : ""}${nhapSang === n.id ? " ring-2 ring-accent" : ""}`}
                style={{ height: caoThe }}
                onGiao={(han) =>
                  void goiPost({ action: "gui-nhap", id: n.id, agent: n.agent, giaoCho: maNhan, tenNhan: tenNhanCua(maNhan), ...(han ? { han } : {}) }, n.id).then((ok) => {
                    if (ok && sua?.id === n.id) setSua(null);
                  })
                }
                onSua={() => {
                  setLoiSua(null);
                  setSua(n);
                }}
                onBo={() =>
                  void goiPost({ action: "bo-nhap", id: n.id, agent: n.agent }, n.id).then((ok) => {
                    if (ok && sua?.id === n.id) setSua(null);
                  })
                }
              />
            );
          })}
        </div>
        {!moTuDong && <PhanTrang trang={tt} soTrang={soTrangTrai} tong={nhap.length} onDoi={setTrangTrai} />}
        {moTuDong && <PhanTrang trang={ttTd} soTrang={soTrangTd} tong={tuDong.length} onDoi={setTrangTd} />}
        {(tuDong.length > 0 || moTuDong) && (
          <button
            type="button"
            className={`${NUT} mt-1.5 w-full text-left`}
            data-lenh="viec.mo-tu-dong"
            aria-expanded={moTuDong}
            title="Việc máy tự đóng vì hết lý do tồn tại (issue gốc hết vi phạm · WBS đạt 100% · đã có người giao tay)"
            onClick={() => setMoTuDong(!moTuDong)}
          >
            {moTuDong ? "▾ Quay lại việc chờ duyệt" : `Tự đóng (${tuDong.length}) ▸`}
          </button>
        )}
      </section>

      {/* ── PHẢI: danh sách việc của tôi · hoặc ô giao việc khi bấm Sửa ── */}
      <section className={`flex min-h-[420px] flex-col lg:min-h-0 ${sua ? "rounded border border-border bg-surface p-3" : "phai-viec"}`} data-gt="viec:phai">
        {sua ? (
          <FormGiaoCongViec
            key={sua.id}
            tieuDe={sua.nguonSoan === "may" ? "Giao việc — bản máy soạn" : "Giao việc — bản AI soạn"}
            laAi={sua.nguonSoan !== "may"}
            banDau={{ giaoCho: chonNhan[sua.id] ?? maNhanTuGoiY(ds, sua.giaoCho), maDuAn: sua.maDuAn, ten: sua.ten, ketQua: ketQuaMacDinhNhap(sua), han: sua.han }}
            ds={ds}
            loiDs={loiDs}
            duocGiao={duocGhi}
            dangGui={dangGui === sua.id}
            loi={loiSua}
            lenhGui="viec.giao-sua"
            onDong={() => setSua(null)}
            onGui={(x: GuiGiaoCV) =>
              void goiPost({ action: "gui-nhap", id: sua.id, agent: sua.agent, ...x }, sua.id, true).then((ok) => {
                if (ok) setSua(null);
              })
            }
          />
        ) : (
          <>
            {/* Một hàng không xuống dòng: 3 nút + ô tìm (Mr. Đại chốt 07/10) */}
            <div className="pv-dau">
              {NUT_LOC.map((n) => (
                <button
                  key={n.kieu}
                  type="button"
                  className="pv-nut"
                  aria-pressed={loc === n.kieu}
                  data-lenh="viec.loc"
                  data-gia-tri={n.nhan}
                  title={n.giaiThich}
                  onClick={() => {
                    setLoc(n.kieu);
                    setMoViec(null);
                  }}
                >
                  {n.nhan} ({g.viec.dem[n.kieu]})
                </button>
              ))}
              <input
                type="search"
                className="pv-tim"
                value={tim}
                onChange={(e) => {
                  setTim(e.target.value);
                  setMoViec(null);
                }}
                placeholder="Tìm mã việc, tên việc, tên người, dự án…"
                aria-label="Tìm việc"
                data-gt="viec:tim"
              />
            </div>
            {g.phamVi && <div className="pv-ghi">{g.phamVi}</div>}
            {!g.viec.ok && <div className="pv-ghi" style={{ color: "#DC2626" }}>Không đọc được việc từ agent Công việc: {g.viec.loi}</div>}
            {/* Bấm một việc → việc khác tối nền, chi tiết bung TẠI CHỖ (như agent Công việc); bấm việc khác thì việc đang mở thu lại */}
            <div className="pv-ds">
              {g.viec.ok && nhomPhai.length === 0 && <div className="trong">{tuKhoa ? "Không tìm thấy việc nào." : "Chưa có việc nào."}</div>}
              {nhomPhai.map((nh) => (
                <div key={nh.ten || "_"}>
                  {nh.ten && (
                    <div className="nhom-viec" data-gt="nhom-viec">
                      <span>{nh.ten}</span>
                      <span>{nh.ds.length}</span>
                    </div>
                  )}
                  {nh.ds.map((v) =>
                    moViec?.ma_viec_base === v.ma_viec_base ? (
                      <div key={v.ma_viec_base} className="muc-viec mo-ra">
                        <KhungViecTaiCho goc={g.goc} ma={v.ma_viec_base} onDong={() => setMoViec(null)} onDoi={() => void nap()} />
                      </div>
                    ) : (
                      <DongViec key={v.ma_viec_base} v={v} onMo={() => setMoViec(v)} />
                    ),
                  )}
                  {nh.xong.length > 0 && g.viec.lamXong && (
                    <div className="khoi-xong">
                      <button
                        type="button"
                        className="dong-khoi-xong"
                        data-gt="khoi-viec-lam-xong"
                        aria-expanded={moXong.has(nh.ten)}
                        title={g.viec.lamXong.giaiThich}
                        onClick={() =>
                          setMoXong((cu) => {
                            const m = new Set(cu);
                            if (m.has(nh.ten)) m.delete(nh.ten);
                            else m.add(nh.ten);
                            return m;
                          })
                        }
                      >
                        <span>{moXong.has(nh.ten) ? "▾" : "▸"}</span> {g.viec.lamXong.nhan}
                        <span className="so">{nh.xong.length}</span>
                      </button>
                      {moXong.has(nh.ten) &&
                        nh.xong.map((v) =>
                          moViec?.ma_viec_base === v.ma_viec_base ? (
                            <div key={v.ma_viec_base} className="muc-viec mo-ra">
                              <KhungViecTaiCho goc={g.goc} ma={v.ma_viec_base} onDong={() => setMoViec(null)} onDoi={() => void nap()} />
                            </div>
                          ) : (
                            <DongViec key={v.ma_viec_base} v={v} onMo={() => setMoViec(v)} />
                          ),
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {g.viec.dem[loc] > dsLoc.length && (
              <div className="pv-ghi" style={{ borderBottom: 0, borderTop: "1px solid var(--pv-vien)" }}>
                Hiện {dsLoc.length}/{g.viec.dem[loc]} việc — xem đủ ở agent Công việc.
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
