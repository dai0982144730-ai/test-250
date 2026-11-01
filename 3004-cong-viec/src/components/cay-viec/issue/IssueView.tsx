"use client";
// ============================================================
// MÀN ISSUE — agent Công việc (chép components/tabs/alerts/CanhBaoView.tsx của agent Base, Mr. Đại chốt 03/10/2026).
// Y HỆT Base: 6 tab theo nguồn sinh · câu tổng · "không cộng dồn" · đếm đang mở + 👁 hiện tất cả · bộ sinh chạy lần cuối ·
// Phạm vi (chỉ issue của agent này / đã đóng) · hộp "đọc trước khi tin" · ghi chú bộ sinh · ngưỡng đang áp · thẻ đủ 9 phần.
// KHÁC Base (chốt 03/10):
//   · NGUỒN VIỆC = sổ cái agent Công việc (bộ sinh lib/cay-viec/issue/sinh.ts) — chữ "Base" đổi thành "sổ việc"/"agent Công việc"
//   · HAI CỘT CỐ ĐỊNH: mọi chỗ bấm ở cột trái mở nội dung ở cột phải (PhaiIssue) — nút trên thẻ (Ghi nhận, Đóng,
//     Ẩn, Xoá, Duyệt/Bác bỏ) dời sang cột phải; "+ Thêm issue" là form bên phải; "Sửa bộ cấu hình" sửa ngưỡng ngay bên phải
//   · KHỐI GIAO VIỆC ngay dưới mỗi thẻ (khuôn chung, chốt 04/10 tối — KhoiViecIssue.tsx); Sửa mở ô giao ở cột phải
//   · Nút không có quyền thì ẨN (luật riêng 3004 — Base làm mờ) · chữ thuần không viền/nền (luật 28 — Base dùng chip Pill)
//   · Link "Xem toàn cảnh issue ở Main →" bỏ (không chuyển trang) — thay bằng một dòng chữ ở cột phải
//   · Trang không gọi agent khác lúc dựng: đọc sổ trước, bộ sinh chạy ngay sau qua API (Base chạy lúc dựng trang server)
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { useKeoGiua } from "@/components/phong/KeoGiua";
import {
  CAC_PHAM_VI,
  CAC_TAB_MAN_ISSUE,
  NHAN_DIEU_KIEN,
  NHAN_PHAM_VI,
  NHAN_XU_LY,
  laCuaAgentNay,
  laNguonMay,
  locIssueManHinh,
  nhanTab,
  sapXep,
  tongCanhBao,
  demTheoTab,
  hienLaiBoQuaDuoc,
  dangBoQua,
  SO_NGAY_HIEN_LAI_BO_QUA,
  type NguonIssue,
  type PhamViIssue,
  type SoIssue,
  type TheCanhBao,
} from "@/lib/cay-viec/issue/model";
import type { CauHinhNguong } from "@/lib/cay-viec/issue/nguong";
import { canGiaoViec, laTheNhac } from "@/lib/cay-viec/issue/nhap-thuan";
import { lyDoChanGhi } from "@/lib/cay-viec/issue/quyen";
import { PhaiIssue } from "./PhaiIssue";
import { ThanhTab } from "@/components/common/ThanhTab";
import { HopHuongDanTab } from "@/components/common/HopHuongDanTab";
import { HUONG_DAN_TAB_CANH_BAO } from "./noi-dung-tab";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";
import { KhoiViecIssue, coKhoiViec, useNhapViecIssue } from "./KhoiViecIssue";
import { NUT_NHAN, laChuLlm, mauMuc, ngayVN, nhanMuc, type ChonIssue, type DuLieuIssue, type GoiIssue } from "./chung";

/** Mã hướng dẫn của từng tab (bốn tab hiện trên màn) */
const MA_HUONG_DAN_TAB: Partial<Record<NguonIssue, string>> = {
  "nang-suat": "issue-qua-han",
  "xong-giay": "issue-xong-giay",
  nguoi: "issue-nguoi-them",
  ai: "issue-de-xuat-ai",
};

type TraGet = { ok: true; du_an: DuLieuIssue["duAn"]; so: SoIssue; nguong: CauHinhNguong; quyen: DuLieuIssue["quyen"]; hom_nay: string };

/** Một dòng nói MÁY ĐANG CHẠY BẰNG NGƯỠNG NÀO — không để người đoán (chữ y Base, nguồn đổi sang sổ việc) */
export function nguongDangDung(tab: NguonIssue, ng: { N: number; M: number; K: number }): string {
  if (tab === "gang")
    return "Ngưỡng đang áp: đầu việc trên đường găng, đã đến ngày bắt đầu, mà tra sổ việc không có việc nào gắn mã đó ĐÃ DUYỆT (việc 🤖 AI gắn còn chờ duyệt không tính) → issue đỏ ngay, không có ngưỡng ngày.";
  if (tab === "nang-suat")
    return `Ngưỡng đang áp: quá hạn ≥ ${ng.N} ngày và có mã WBS ĐÃ DUYỆT của dự án. Chưa có mã đã duyệt thì KHÔNG sinh issue — tránh sổ ngập.`;
  if (tab === "su-kien") return `Ngưỡng đang áp: đề xuất tắc ở một bước ≥ ${ng.M} ngày — agent Công việc chưa có nguồn đề xuất nên ngưỡng này chưa dùng.`;
  if (tab === "xong-giay")
    return `Ngưỡng đang áp: việc trong sổ báo HOÀN THÀNH có mã WBS đã duyệt mà tiến độ trả % = 0 và không có BC ngày trong ±${ng.K} ngày quanh ngày xong (luật 4). Chiều ngược — WBS 100% mà việc còn mở — nhắc đóng việc, không ngưỡng.`;
  if (tab === "nguoi") return "Bộ 4 không có ngưỡng — cấu hình là trường bắt buộc của biểu mẫu.";
  return "Bộ 5 không có ngưỡng — cấu hình là khung: nguồn nào AI được đọc.";
}

export function IssueView({ duAnId }: { duAnId: string | null }) {
  const [du, setDu] = useState<DuLieuIssue | null>(null);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [dangChay, setDangChay] = useState(false);
  const [ghiChuChay, setGhiChuChay] = useState<string[] | null>(null);
  const [tab, setTab] = useState<NguonIssue>("nang-suat");
  const [phamVi, setPhamVi] = useState<PhamViIssue>("agent-nay");
  /** "Hiện lại bỏ qua" (khuôn Issue hai loại): bật thì danh sách là thẻ đã bỏ qua trong 30 ngày, mọi tab */
  const [xemBoQua, setXemBoQua] = useState(false);
  const [chon, setChon] = useState<ChonIssue>({ loai: "tong" });
  const [dangGuiAi, setDangGuiAi] = useState(false);
  const keo = useKeoGiua("cay-viec-issue");

  const duAnQs = duAnId ? `du_an=${encodeURIComponent(duAnId)}` : "";

  // ① Đọc sổ (không hỏi agent khác) → ② chạy bộ sinh ngay sau (Base: mỗi lần mở trang)
  useEffect(() => {
    let huy = false;
    let daCoSo = false;
    (async () => {
      try {
        const j = await goiApi<TraGet>(`/api/cay-viec/issue${duAnQs ? `?${duAnQs}` : ""}`);
        if (huy) return;
        daCoSo = true;
        setDu({ duAn: j.du_an, so: j.so, nguong: j.nguong, quyen: j.quyen, homNay: j.hom_nay });
        if (!j.du_an.co_cay) return;
        setDangChay(true);
        const r = await goiApi<{ so: SoIssue; ghi_chu: string[] }>("/api/cay-viec/issue", { body: { du_an: j.du_an.id, hanhDong: "chay" } });
        if (huy) return;
        setDu((x) => (x ? { ...x, so: r.so } : x));
        setGhiChuChay(r.ghi_chu);
      } catch (e) {
        if (!huy) {
          if (!daCoSo) setLoiTai(e instanceof Error ? e.message : "Không gọi được máy chủ của chính agent này.");
          else setGhiChuChay([`Bộ sinh không chạy được lượt này: ${e instanceof Error ? e.message : "lỗi không rõ"}`]);
        }
      } finally {
        if (!huy) setDangChay(false);
      }
    })();
    return () => {
      huy = true;
    };
  }, [duAnQs]);

  const goi: GoiIssue = useCallback(
    async (payload) => {
      if (!du) return null;
      const j = await goiApi<{ ok: boolean; thong_diep?: string; so?: SoIssue; nguong?: CauHinhNguong; id?: string; ma_viec?: string; trung?: string }>("/api/cay-viec/issue", {
        body: { du_an: du.duAn.id, ...payload },
      });
      setDu((x) => (x ? { ...x, ...(j.so ? { so: j.so } : {}), ...(j.nguong ? { nguong: j.nguong } : {}) } : x));
      return j;
    },
    [du],
  );

  const theVao = du?.so.the ?? [];
  // Thẻ găng chỉ hiện ở Cây việc & đường găng (Mr. Đại chốt 06/10) — không đếm, không vẽ ở màn này.
  // Thẻ đã BỎ QUA không còn là issue: không đếm, không hiện — chỉ thấy ở "Hiện lại bỏ qua" (07/10, khuôn hai loại; Ẩn đã bỏ)
  const tatCa = useMemo(() => theVao.filter((t) => laCuaAgentNay(t) && t.nguon !== "gang"), [theVao]);
  const the = useMemo(() => tatCa.filter((t) => !dangBoQua(t)), [tatCa]);
  const theBoQua = useMemo(() => tatCa.filter((t) => t.dieuKien !== "da-dong" && hienLaiBoQuaDuoc(t)).sort(sapXep), [tatCa]);
  const dem = useMemo(() => demTheoTab(the), [the]);
  const dsTab = useMemo(() => {
    if (xemBoQua) return theBoQua;
    return locIssueManHinh(the.filter((t) => t.nguon === tab), phamVi).sort(sapXep);
  }, [the, tab, phamVi, xemBoQua, theBoQua]);
  const tong = useMemo(() => tongCanhBao(the), [the]);
  // Mr. Đại chốt 07/10: tách "N cần giao · M việc đã có" — N khớp phần Issue của "Việc chờ tôi giao"
  const phanLoai = useMemo(() => {
    const mo = the.filter((t) => t.dieuKien !== "da-dong");
    return {
      canGiao: mo.filter((t) => canGiaoViec(t, lyDoChanGhi(t)) && !laTheNhac(t)).length,
      daCo: mo.filter((t) => laTheNhac(t) || t.xuLy === "da-giao-viec").length,
    };
  }, [the]);
  const ghiChuBoSinh = ghiChuChay ?? du?.so.ghiChu ?? [];
  const ng = du?.nguong ?? { N: 7, M: 5, K: 7 };

  // Chạy AI đề xuất — kết quả hiện ở cột phải
  const chayAi = async () => {
    setDangGuiAi(true);
    setChon({ loai: "ket-qua", tieuDe: "🤖 Chạy AI đề xuất", tin: "🤖 AI đang đọc bảng Sự cố / Cảnh báo của các báo cáo đã nộp… (có thể mất 1–3 phút)" });
    try {
      const j = await goi({ hanhDong: "sinh-ai" });
      setChon({ loai: "ket-qua", tieuDe: "🤖 Chạy AI đề xuất", tin: j?.thong_diep ?? "Xong." });
    } catch (e) {
      setChon({ loai: "ket-qua", tieuDe: "🤖 Chạy AI đề xuất", tin: e instanceof Error ? e.message : "Không gọi được máy chủ.", loi: true });
    } finally {
      setDangGuiAi(false);
    }
  };

  const idChon = chon.loai === "the" || chon.loai === "sua-giao" ? chon.id : null;
  const theChon = idChon ? the.find((t) => t.id === idChon) : undefined;
  // Khối giao việc dưới mỗi thẻ đang hiện — bản nháp giữ ở đây để khối trái và ô Sửa bên phải dùng chung (chốt 04/10 tối)
  const nh = useNhapViecIssue(du, dsTab);

  return (
    <div className="so-do cay-viec-sang" ref={keo.khungRef} style={keo.kieuKhung}>
      <section className="san">
        <div className="space-y-4">
          <div className="cv-dau flex flex-wrap items-baseline gap-2">
            <h1>Cảnh báo</h1>
            {du && <span className="text-[12.5px] font-semibold text-text-secondary">· {du.duAn.ten}</span>}
            <span className="text-[11px] text-text-muted">vấn đề cần xử lý — máy soi sổ việc, người xử lý</span>
          </div>

          {loiTai && <div className="rounded border border-yellow/30 bg-yellow-soft px-3 py-2.5 text-[12px] text-yellow">{loiTai}</div>}
          {!du && !loiTai && <div className="rounded border border-border bg-surface px-4 py-6 text-[12.5px] text-text-muted">Đang đọc sổ issue…</div>}

          {du && (
            <>
              {/* hướng dẫn riêng của tab đang xem (20/10/2026); đang xem thẻ đã bỏ qua thì dùng hướng dẫn chung */}
              {!xemBoQua && <KhaiHuongDan ma={MA_HUONG_DAN_TAB[tab] ?? "issue"} uuTien={1} />}
              {/* ===== Hàng 6 TAB + nút (đúng Base) ===== */}
              <div className="flex flex-wrap items-center gap-1.5">
                <ThanhTab
                  tabs={CAC_TAB_MAN_ISSUE.map((k, i) => ({ ma: k, so: "①②③④⑤"[i] ?? "", ten: nhanTab(k, ng), viec: dem[k] }))}
                  chon={tab}
                  onChon={setTab}
                  nhan="Các nguồn cảnh báo"
                  lenh="issue.tab"
                  gt={(k) => `iss:tab-${k}`}
                />
                {tab === "ai" && du.quyen.duyet && (
                  <button type="button" disabled={dangGuiAi} onClick={() => void chayAi()} data-lenh="issue.chay-ai" data-gt="iss:chay-ai" title="AI đọc bảng Sự cố · Cảnh báo của báo cáo đã nộp rồi đề xuất — tốn token nên chỉ chạy khi bấm" className={`ml-auto ${NUT_NHAN} !text-[11.5px]`}>
                    {dangGuiAi ? "🤖 AI đang đọc…" : "🤖 Chạy AI đề xuất"}
                  </button>
                )}
                {du.quyen.ghi && (
                  <button type="button" onClick={() => setChon({ loai: "them" })} data-lenh="issue.them-issue" data-gt="iss:them-issue" className={`${tab === "ai" && du.quyen.duyet ? "" : "ml-auto "}${NUT_NHAN} !text-[11.5px]`}>
                    + Thêm issue
                  </button>
                )}
              </div>

              {HUONG_DAN_TAB_CANH_BAO[tab] && <HopHuongDanTab key={tab} nd={HUONG_DAN_TAB_CANH_BAO[tab]!} />}

              {/* ===== CÂU TỔNG ===== */}
              <div className="rounded border border-border bg-surface p-4" data-gt="iss:cau-tong">
                <div className="space-y-1.5">
                  <div className="text-[13.5px] text-text">
                    {tong.soDangMo === 0 ? (
                      <b className="text-green">Không còn issue nào đang mở.</b>
                    ) : (
                      <>
                        <b className={tong.soDo > 0 ? "text-red" : "text-yellow"}>
                          {tong.soDangMo} issue đang mở, {tong.soDo} nghiêm trọng.
                        </b>
                        {tong.codNangNhat > 0 && tong.theNangNhat && (
                          <>
                            {" "}
                            Nặng nhất đẩy ngày phát điện <b className="text-red">{tong.codNangNhat} ngày</b>: <b className="text-text">{tong.theNangNhat.tieuDe}</b>.
                          </>
                        )}
                        {tong.soChuaAiDong > 0 && (
                          <>
                            {" "}
                            Còn <b className="text-text">{tong.soChuaAiDong}</b> issue chưa ai nhận xử lý.
                          </>
                        )}
                        {tong.soDeLau > 0 && (
                          <>
                            {" "}
                            <b className="text-yellow">{tong.soDeLau}</b> issue đã mở quá 3 tuần.
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Số ngày ảnh hưởng <b>không cộng dồn</b> giữa các issue — thẻ nằm trong chuỗi lan truyền của thẻ khác không tính lại, và các
                    chuỗi độc lập chạy song song nên chuỗi dài nhất mới quyết định ngày phát điện.
                  </div>
                </div>
              </div>

              {/* ===== HÀNG ĐẾM + PHẠM VI ===== */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className={`font-semibold ${tong.soDo > 0 ? "text-red" : "text-green"}`} data-gt="iss:dem-dang-mo">
                  {tong.soDangMo} issue đang mở · {tong.soDo} 🔴
                </span>
                <span className="text-text-secondary" data-gt="iss:can-giao-da-co" title="Cần giao = chưa thành việc, khớp phần Issue ở Việc chờ tôi giao · Việc đã có = đã giao việc, hoặc issue nhắc việc cũ (quá hạn, xong trên giấy)">
                  <b className="text-text">{phanLoai.canGiao}</b> cần giao · <b className="text-text">{phanLoai.daCo}</b> việc đã có (nhắc)
                </span>
                {(theBoQua.length > 0 || xemBoQua) && (
                  <button type="button" onClick={() => setXemBoQua(!xemBoQua)} data-lenh="issue.hien-lai-bo-qua" data-gt="iss:hien-lai-bo-qua" aria-pressed={xemBoQua} title={`Thẻ đã bỏ qua trong ${SO_NGAY_HIEN_LAI_BO_QUA} ngày — không đếm, không hiện; bấm để xem lại`} className={`rounded-sm border px-2.5 py-1 font-semibold transition ${xemBoQua ? "border-accent bg-accent-soft text-accent" : "border-border text-text-secondary hover:border-accent hover:text-accent"}`}>
                    {xemBoQua ? "Về danh sách issue" : `Hiện lại bỏ qua (${theBoQua.length})`}
                  </button>
                )}
                <span className="text-text-muted" data-gt="iss:lan-chay">
                  {dangChay ? "Bộ sinh đang chạy — hỏi agent Tiến độ…" : du.so.lanChayCuoi ? `Bộ sinh chạy lần cuối ${ngayVN(du.so.lanChayCuoi)}` : "Bộ sinh chưa chạy lần nào"}
                </span>
                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <span className="text-text-muted">Phạm vi:</span>
                  {CAC_PHAM_VI.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPhamVi(p)}
                      data-lenh="issue.pham-vi"
                      data-gt={`iss:pham-vi-${p}`}
                      className={`rounded-sm border px-2.5 py-1 font-semibold transition ${phamVi === p ? "border-accent bg-accent-soft text-accent" : "border-border text-text-secondary hover:border-accent hover:text-accent"}`}
                    >
                      {NHAN_PHAM_VI[p]}
                    </button>
                  ))}
                </div>
              </div>

              {!du.duAn.co_cay && (
                <div className="rounded-sm border border-yellow/30 bg-yellow-soft px-3 py-2 text-[11px] leading-relaxed text-yellow" data-gt="iss:chua-co-cay">
                  Dự án {du.duAn.ten} chưa có cây WBS bên agent Tiến độ — bộ sinh không chạy.
                </div>
              )}
              {tab === "gang" && (
                <div className="rounded-sm border border-border bg-bg2 px-3 py-2 text-[11px] leading-relaxed text-text-secondary" data-gt="iss:doc-truoc">
                  <b className="text-text">⚠ Đọc trước khi tin con số này</b>: sổ việc chỉ chứa việc ghi trong báo cáo tuần và việc giao tay — không phải mọi
                  việc thực tế. &ldquo;Không có việc trong sổ&rdquo; nghĩa là <b className="text-text">chưa ai được giao TRONG AGENT CÔNG VIỆC</b> — có thể ngoài
                  đời đã có người làm mà không ghi vào báo cáo. Thẻ chỉ nói đúng chừng đó, không kết luận &ldquo;không ai làm&rdquo;. Nút đã đánh dấu
                  &ldquo;Việc này không cần giao trong agent Công việc&rdquo; ở Cây việc thì bộ sinh bỏ qua.
                </div>
              )}
              {xemBoQua && (
                <div className="text-[11px] text-text-secondary">
                  Đang xem {theBoQua.length} thẻ đã bỏ qua trong {SO_NGAY_HIEN_LAI_BO_QUA} ngày (mọi tab) — bấm <b>Hiện lại</b> dưới thẻ để thẻ về chỗ cũ.
                </div>
              )}
              {laNguonMay(tab) && ghiChuBoSinh.length > 0 && (
                <div className="rounded-sm border border-yellow/30 bg-yellow-soft px-3 py-2 text-[11px] leading-relaxed text-text-secondary" data-gt="iss:ghi-chu-bo-sinh">
                  {ghiChuBoSinh.map((g, i) => (
                    <div key={i}>⚠ {g}</div>
                  ))}
                </div>
              )}
              {phamVi === "da-dong" && <div className="text-[11px] text-text-muted">Đang xem lại issue đã đóng — chỉ đọc, không sửa được.</div>}

              {/* Máy đang chạy bằng ngưỡng nào — bấm là mở khung ngưỡng bên phải (Base: link sang Cài đặt) */}
              <div className="flex flex-wrap items-baseline gap-2 text-[10.5px] text-text-muted">
                <span data-gt="iss:nguong-dang-ap">{nguongDangDung(tab, ng)}</span>
                {laNguonMay(tab) && (
                  <button type="button" onClick={() => setChon({ loai: "nguong", tab })} data-lenh="issue.nguong" data-gt="iss:sua-nguong" className="font-semibold text-accent hover:text-accent-hover">
                    {du.quyen.duyet ? "Sửa ngưỡng của tab này →" : "Xem ngưỡng và vết sửa →"}
                  </button>
                )}
              </div>

              {!xemBoQua && tab === "nguoi" && (
                <div className="text-[10.5px] text-text-muted">
                  Nhập issue mới bằng nút <b>+ Thêm issue</b> góc phải trên — ghi thẳng vào sổ, hiệu lực ngay. Đã giao việc thì việc xong là máy tự đóng issue.
                </div>
              )}
              {!xemBoQua && tab === "ai" && (
                <div className="text-[10.5px] text-text-muted">
                  🤖 AI đọc bảng Sự cố · Cảnh báo của báo cáo tuần/tháng đã nộp · <b>bắt buộc trích nguyên văn câu chữ nguồn</b> · thẻ đủ 9 phần. Đáng
                  làm thì <b>Giao việc</b>, không thì <b>Bỏ qua</b>.
                </div>
              )}

              {dsTab.length === 0 && !xemBoQua && (
                <div className="rounded border border-border bg-surface p-4">
                  <div className="text-[12.5px] font-bold text-text">{nhanTab(tab, ng)}</div>
                  <div className="py-4 text-[12px] text-text-muted">
                    Không có cảnh báo nào đang mở ở nhóm này.
                    {laNguonMay(tab) && du.so.lanChayCuoi
                        ? ` Bộ sinh chạy lần cuối ${ngayVN(du.so.lanChayCuoi)} — máy soi hết sổ việc và không thấy gì vượt ngưỡng.`
                        : ""}
                  </div>
                </div>
              )}

              {dsTab.map((t) => (
                <div key={t.id}>
                  <TheIssue t={t} dangChon={idChon === t.id} mo={() => setChon({ loai: "the", id: t.id })} />
                  {coKhoiViec(t, du) && <KhoiViecIssue t={t} du={du} goi={goi} nh={nh} moSua={() => setChon({ loai: "sua-giao", id: t.id })} />}
                </div>
              ))}
            </>
          )}
        </div>
      </section>
      {keo.vach}
      <section className="phai">
        <div className="vao" key={idChon ? `${chon.loai}:${idChon}` : chon.loai === "nguong" ? `nguong:${chon.tab}` : chon.loai}>
          <PhaiIssue chon={chon} mo={setChon} du={du} the={theChon} goi={goi} dem={dem} chonTab={setTab} dangChay={dangChay} loiTai={loiTai} nh={nh} />
        </div>
      </section>
    </div>
  );
}

/** MỘT THẺ — đủ 9 phần (y Base). Bấm cả thẻ → chi tiết + nút ở cột phải. Không có nút trên thẻ. */
export function TheIssue({ t, dangChon, mo }: { t: TheCanhBao; dangChon: boolean; mo: () => void }) {
  const vien = t.mucDo === "red" ? "border-l-red" : t.mucDo === "yellow" ? "border-l-yellow" : "border-l-green";
  const codChuaLay = t.thieuDuLieu?.startsWith("Ảnh hưởng COD");
  const cuoi = t.ghiNhan.length > 0 ? t.ghiNhan[t.ghiNhan.length - 1] : null;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={mo}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), mo())}
      data-lenh="issue.the"
      data-gt="iss:the"
      data-ma={t.id}
      title="Bấm để xem chi tiết và xử lý ở khung bên phải"
      className={`cursor-pointer rounded border bg-surface p-4 transition hover:border-accent ${dangChon ? "border-accent ring-1 ring-accent" : "border-border"}`}
    >
      <div className={`border-l-2 pl-3 ${vien}`}>
        {/* (1) mức + mã + tiêu đề */}
        <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`text-[11px] font-bold ${mauMuc(t.mucDo)}`}>{nhanMuc(t.mucDo)}</span>
          <span className="font-mono text-[10px] text-text-muted">{t.id}</span>
          <b className="text-[12.5px] text-text">
            {laChuLlm(t) ? "🤖 " : ""}
            {t.tieuDe}
          </b>
          {t.chuaVaoSo && <span className="text-[10.5px] font-semibold text-yellow">Chờ duyệt — chưa vào sổ</span>}
          {t.an && <span className="text-[10.5px] text-text-muted">🙈 Đang ẩn — vẫn đếm vào tổng</span>}
        </div>
        {/* (2) phân tích số — thẻ gộp theo người mang danh sách việc, mỗi việc một dòng */}
        <p className="mb-2 whitespace-pre-line text-[11.5px] leading-relaxed text-text-secondary">
          {laChuLlm(t) ? "🤖 " : ""}
          {t.phanTich}
        </p>
        {/* (5b) trích NGUYÊN VĂN — code trích, không gắn 🤖 */}
        {t.trichNguyenVan && <p className="mb-2 border-l-2 border-border pl-2 text-[11.5px] italic text-text-secondary">“{t.trichNguyenVan}”</p>}
        {t.chuoiLanTruyen && t.chuoiLanTruyen.length > 0 && <pre className="mb-2 overflow-x-auto font-mono text-[10.5px] leading-relaxed text-text-secondary">{t.chuoiLanTruyen.join("\n")}</pre>}
        {/* (4) Ảnh hưởng COD tách riêng + (5) Nguồn */}
        <div className="mb-2 grid gap-x-4 gap-y-1 text-[11px] sm:grid-cols-2">
          <div data-gt="iss:the-cod">
            <span className="text-text-muted">Ảnh hưởng COD: </span>
            {codChuaLay ? (
              <b className="text-text-muted" title={t.thieuDuLieu}>
                chưa lấy được
              </b>
            ) : (
              <b className={t.anhHuongCod > 0 ? "text-red" : "text-text"}>
                {t.anhHuongCod > 0 ? "+" : ""}
                {t.anhHuongCod} ngày
              </b>
            )}
            {t.trungChuoiVoi && (
              <span className="text-text-muted">
                {" "}
                — nằm trong chuỗi {t.trungChuoiVoi}, <b>KHÔNG cộng dồn</b>
              </span>
            )}
            {t.anhHuongCod === 0 && !t.trungChuoiVoi && !codChuaLay && <span className="text-text-muted"> (không trên đường găng)</span>}
          </div>
          <div className="text-[10.5px] text-text-muted">
            Nguồn: <span className="text-text-secondary">{t.nguonDuLieu}</span>
          </div>
        </div>
        {/* (6) Đề xuất — bắt buộc */}
        <p className="mb-2 text-[11.5px] leading-relaxed text-text">
          <b>🤖 Đề xuất:</b> {t.deXuat}
        </p>
        {/* (7) thiếu dữ liệu thì nói thẳng */}
        {t.thieuDuLieu && <p className="mb-2 rounded-sm border border-yellow/30 bg-yellow-soft px-2.5 py-1.5 text-[11px] text-text-secondary">⚠ {t.thieuDuLieu}</p>}
        {/* (8) HAI TRỤC TRẠNG THÁI — chữ thuần (luật 28) */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[10.5px]" data-gt="iss:the-hai-truc">
          <span className="text-text-secondary">
            Điều kiện: <b className="text-text">{NHAN_DIEU_KIEN[t.dieuKien]}</b> {laNguonMay(t.nguon) ? "(máy giữ)" : "(người giữ)"}
          </span>
          <span className={t.xuLy === "chua-ai-dong" ? "text-text-secondary" : "text-blue"}>
            Xử lý: <b>{NHAN_XU_LY[t.xuLy]}</b>
            {cuoi ? ` — ${cuoi.nguoi}, ${ngayVN(cuoi.luc)}` : ""}
          </span>
          {t.soTuanMo !== undefined && t.soTuanMo > 0 && <span className="text-text-muted">mở {t.soTuanMo} tuần</span>}
        </div>
        {t.ghiNhan.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[10.5px] text-text-muted">
            {t.ghiNhan.map((g, i) => (
              <li key={i}>
                ✍ {ngayVN(g.luc)} · {g.nguoi}: {g.viecDaLam}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
