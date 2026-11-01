"use client";

// ============================================================
// NGƯỜI NHẬN BÁO CÁO SÁNG — mỗi người một bản theo kịch bản của họ
// MD: PLAN-MAIN-AGENT mục 6.6 · Mr. Đại chốt 04/10/2026
//
// Người dùng vào khối này để: ① chọn ai nhận bản nào (chọn là lưu, không nút xác nhận)
// ② xem trước ĐÚNG chữ từng người sẽ nhận ③ gửi thử bản của một người về Telegram
// của chính mình. Kịch bản = bộ tham số do code dựng (kich-ban.ts) — màn này dựng
// xem trước bằng CÙNG hàm với lúc gửi, nên thấy gì gửi nấy.
// ============================================================

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import type { BaoCaoSang } from "@/lib/bao-cao-sang/model";
import { CONG_DUNG_MAU, NHAN_MAU, THAM_SO_MAU, type MaMau, type ThamSoKichBan } from "@/lib/bao-cao-sang/kich-ban";
import { BO_MAC_DINH, KHOI_THEO_MA, type ChonKhoi, type KeKhoi, type MoTaKhoi } from "@/lib/bao-cao-sang/khoi";
import { phanThieu, type DuLieuKhoi } from "@/lib/bao-cao-sang/khoi-du-lieu";
import { canCuaNguoiNhan, type DauVaoBoKhoi } from "@/lib/bao-cao-sang/khoi-telegram";
import { gioVn } from "@/lib/gio-vn";
import { SuaBoKhoi } from "./SuaBoKhoi";
import { XemBoKhoi } from "./XemBoKhoi";
import { LY_DO_CHAN } from "@/lib/quyen";
import { ngayGioVN } from "@/lib/ngay-hien";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface DongNguoi {
  ma: string;
  email: string;
  ten: string;
  chucVu: string | null;
  daNoiTelegram: boolean;
  mau: MaMau | null;
  laMacDinh: boolean;
  thamSo: ThamSoKichBan | null;
  duAnChon: string[];
  /** ⭐ 17/10 — bộ khối hiệu lực + đã tự kéo thả chưa */
  boKhoi: ChonKhoi[];
  boKhoiRieng: boolean;
  seGui: boolean;
  lyDoChuaGui: string | null;
  thieuDuAn: boolean;
  soPhienBan: number;
  guiGanNhat: { ngay: string; luc: string; ok: boolean; soTin: number; loi: string | null } | null;
}

interface DuLieu {
  ok: boolean;
  duocSua: boolean;
  maCuaToi: string | null;
  duAn: { id: string; ten: string }[];
  nguoi: DongNguoi[];
  thuVien: MoTaKhoi[];
  nhanKe: Record<KeKhoi, string>;
}

type XemTruoc = { loai: "mau"; mau: MaMau } | { loai: "nguoi"; ma: string };

/** 27/10/2026 (Mr. Đại chọn A): ô chọn dự án hiện cho mẫu Dự án VÀ cho mọi bộ có khối «Dự án tôi chọn» — trước chỉ mẫu Dự án */
const canChonDuAn = (n: DongNguoi): boolean => n.mau === "du-an" || n.boKhoi.some((k) => k.phamVi === "du-an-chon");

const O_CHON = "rounded-sm border border-border bg-surface px-2 py-1 text-[11.5px] text-text disabled:opacity-50";
const NUT_PHU =
  "rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-text disabled:opacity-50";

export function KhoiNguoiNhan({
  bc,
  khoi,
  coGhi,
  onSoNguoiNhan,
  onTaiLaiSo,
  cheDo = "bang",
}: {
  /** "bang" = bảng người nhận (tab Người nhận) · "bao-cao" = bản báo cáo của CHÍNH người đang đăng nhập, 3 cột cố định (tab Báo cáo sáng) */
  cheDo?: "bang" | "bao-cao";
  bc: BaoCaoSang | null;
  /** ⭐ 17/10 — số các khối của ngày (đã lọc agent mật theo người xem) */
  khoi: DuLieuKhoi | null;
  coGhi: boolean;
  /** Tải lại số của ngày (sau khi kéo thêm khối, máy chủ gom bổ sung ở nền) */
  onTaiLaiSo?: () => void;
  /** Báo lên thanh ghim: bao nhiêu người sẽ nhận · bao nhiêu người ĐÃ nhận bản ngày đang xem */
  onSoNguoiNhan?: (n: number, daNhan: number) => void;
}) {
  const [d, setD] = useState<DuLieu | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [bao, setBao] = useState<string | null>(null);
  const [dangLam, setDangLam] = useState<string | null>(null);
  const [hienHet, setHienHet] = useState(false);
  const [xem, setXem] = useState<XemTruoc>({ loai: "mau", mau: "tong-quat" });
  /** Dòng đang mở ô chọn dự án (mẫu Dự án) */
  const [moChon, setMoChon] = useState<string | null>(null);

  const tai = useCallback(async () => {
    try {
      const r = await fetch("/api/bao-cao-sang/nguoi-nhan", { cache: "no-store" });
      const j = (await r.json()) as DuLieu & { message?: string };
      if (!j.ok) setLoi(j.message ?? "Không tải được danh sách người nhận.");
      else {
        setD(j);
        setLoi(null);
      }
    } catch {
      setLoi("Không gọi được máy chủ — thử tải lại trang.");
    }
  }, []);

  useEffect(() => {
    void tai();
  }, [tai]);

  const soNhan = d ? d.nguoi.filter((x) => x.seGui).length : 0;
  const soDaNhan = d && bc ? d.nguoi.filter((x) => x.seGui && x.guiGanNhat?.ok && x.guiGanNhat.ngay === bc.ngay).length : 0;
  useEffect(() => {
    if (d) onSoNguoiNhan?.(soNhan, soDaNhan);
  }, [d, soNhan, soDaNhan, onSoNguoiNhan]);
  // Kiểm độc lập 04/10 ⚪7: bấm liền tay nhiều dự án → gửi LẦN LƯỢT, yêu cầu sau không tới máy chủ trước yêu cầu trước
  const hangLuu = useRef<Promise<void>>(Promise.resolve());

  async function datMau(ma: string, mau: string) {
    setDangLam(`mau-${ma}`);
    setBao(null);
    try {
      const r = await fetch("/api/bao-cao-sang/nguoi-nhan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hanhDong: "dat-mau", ma, mau }),
      });
      const j = (await r.json()) as { ok: boolean; message?: string };
      if (!j.ok) setBao(j.message ?? "Không lưu được.");
      await tai();
      if (mau !== "khong-nhan") setXem({ loai: "nguoi", ma });
      // Vừa chuyển sang mẫu Dự án → mở luôn ô chọn dự án (đỡ một cú bấm)
      if (mau === "du-an") setMoChon(ma);
    } catch {
      setBao("Không gọi được máy chủ — thử lại.");
    } finally {
      setDangLam(null);
    }
  }

  /** Bấm một dự án = bật/tắt + LƯU NGAY (không nút xác nhận). Gửi cả danh sách mới. */
  async function batTatDuAn(n: DongNguoi, id: string) {
    if (!d) return;
    // Giữ thứ tự sổ dự án
    const chon = n.duAnChon.includes(id) ? n.duAnChon.filter((x) => x !== id) : [...n.duAnChon, id];
    const moi = d.duAn.map((p) => p.id).filter((x) => chon.includes(x));
    // Hiện ngay trên màn, không chờ máy chủ. KHÔNG tải lại khi lưu được — bấm liền tay nhiều
    // dự án thì lượt tải của lần bấm trước sẽ đè mất lần bấm sau.
    setD((cu) =>
      cu
        ? {
            ...cu,
            nguoi: cu.nguoi.map((x) =>
              x.ma === n.ma ? { ...x, duAnChon: moi, thieuDuAn: x.mau === "du-an" && moi.length === 0 } : x,
            ),
          }
        : cu,
    );
    setBao(null);
    const luu = async () => {
      try {
        const r = await fetch("/api/bao-cao-sang/nguoi-nhan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong: "chon-du-an", ma: n.ma, duAn: moi }),
        });
        const j = (await r.json()) as { ok: boolean; message?: string };
        if (!j.ok) {
          setBao(j.message ?? "Không lưu được.");
          await tai();
        }
      } catch {
        setBao("Không gọi được máy chủ — thử lại.");
        await tai();
      }
    };
    hangLuu.current = hangLuu.current.then(luu, luu);
    await hangLuu.current;
  }

  /** ⭐ 17/10 — kéo thả khối: lưu CẢ bộ ngay (không nút xác nhận); khối mới thì máy chủ gom số ở nền → tải lại sau ít giây */
  async function luuBoKhoi(n: DongNguoi, bo: ChonKhoi[]) {
    setD((cu) => (cu ? { ...cu, nguoi: cu.nguoi.map((x) => (x.ma === n.ma ? { ...x, boKhoi: bo, boKhoiRieng: bo.length > 0 } : x)) } : cu));
    setBao(null);
    const luu = async () => {
      try {
        const r = await fetch("/api/bao-cao-sang/nguoi-nhan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hanhDong: "dat-bo-khoi", ma: n.ma, boKhoi: bo }),
        });
        const j = (await r.json()) as { ok: boolean; message?: string; nguoi?: DongNguoi[] };
        if (!j.ok) setBao(j.message ?? "Không lưu được.");
        // Bộ rỗng = về bộ mặc định — lấy lại bộ hiệu lực từ máy chủ
        if (!j.ok || bo.length === 0) await tai();
        // Khối mới chưa có số: không còn hẹn 8 giây — màn xem trước tự lấy số khối thiếu (useEffect «daHoiKhoi» bên dưới)
      } catch {
        setBao("Không gọi được máy chủ — thử lại.");
        await tai();
      }
    };
    hangLuu.current = hangLuu.current.then(luu, luu);
    await hangLuu.current;
  }

  async function guiThu(ma: string) {
    setDangLam(`thu-${ma}`);
    setBao(null);
    try {
      const r = await fetch("/api/bao-cao-sang/nguoi-nhan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hanhDong: "gui-thu", ma, ngay: bc?.ngay }),
      });
      const j = (await r.json()) as { message?: string };
      setBao(j.message ?? "Xong.");
    } catch {
      setBao("Không gọi được máy chủ — thử lại.");
    } finally {
      setDangLam(null);
    }
  }

  // Xem trước — CÙNG hàm với lúc gửi (khoi-telegram.ts): bộ khối của người đó, hoặc bộ mặc định của mẫu
  const truoc = useMemo((): { nhan: string; dauVao: DauVaoBoKhoi } | null => {
    if (!bc || !bc.duAn || !bc.vanDe) return null;
    if (xem.loai === "mau") {
      return {
        nhan: `Mẫu ${NHAN_MAU[xem.mau]} — bộ khối mặc định${xem.mau === "du-an" ? " (xem như đã chọn mọi dự án — người thật chỉ thấy dự án chọn cho họ)" : ""}`,
        dauVao: { bc, khoi, boKhoi: BO_MAC_DINH[xem.mau], thamSo: THAM_SO_MAU[xem.mau], duAnChon: null },
      };
    }
    const n = d?.nguoi.find((x) => x.ma === xem.ma);
    if (!n || !n.mau || !n.thamSo) return null;
    return {
      nhan: `Bản của ${n.ten} — ${n.boKhoi.length} khối${n.duAnChon.length > 0 ? ` · ${n.duAnChon.length} dự án đã chọn` : ""}`,
      dauVao: { bc, khoi, boKhoi: n.boKhoi, thamSo: n.thamSo, duAnChon: n.duAnChon },
    };
  }, [bc, khoi, xem, d]);

  // 27/10/2026: khối trong bản đang xem chưa có số của HÔM NAY → tự lấy, từng khối một (máy chủ gom đúng khối đó cho cả
  // công ty, đo: cả 16 khối ~29 giây, riêng khối 🤖 ~20 giây). Trước đây màn chỉ đọc số có sẵn và in «bấm Dựng lại» —
  // nhưng Dựng lại chỉ gom khối của người đã nối Telegram nên bấm vẫn không ra. Mỗi khối chỉ hỏi một lần mỗi lần mở màn.
  const daHoiKhoi = useRef(new Set<string>());
  const [dangLaySo, setDangLaySo] = useState<{ xong: number; tong: number; ten: string } | null>(null);
  useEffect(() => {
    if (!truoc || !bc?.duAn || bc.ngay !== gioVn(new Date()).ngay) return;
    const { can } = canCuaNguoiNhan(bc, [{ boKhoi: truoc.dauVao.boKhoi, duAnChon: truoc.dauVao.duAnChon }]);
    const thieu = Array.from(phanThieu(khoi, can).keys()).filter((ma) => !daHoiKhoi.current.has(`${bc.ngay}|${ma}`));
    if (thieu.length === 0) return;
    thieu.forEach((ma) => daHoiKhoi.current.add(`${bc.ngay}|${ma}`));
    void (async () => {
      for (let i = 0; i < thieu.length; i++) {
        const ma = thieu[i]!;
        setDangLaySo({ xong: i, tong: thieu.length, ten: `${ma} ${KHOI_THEO_MA.get(ma)?.ten ?? ""}`.trim() });
        await fetch(`/api/bao-cao-sang/khoi?ma=${encodeURIComponent(ma)}&ngay=${bc.ngay}`, { cache: "no-store" }).catch(() => null);
      }
      setDangLaySo(null);
      onTaiLaiSo?.();
    })();
  }, [truoc, khoi, bc, onTaiLaiSo]);
  const dongLaySo = dangLaySo ? (
    <p className="text-[12px] text-text-muted">
      Đang lấy số hôm nay cho khối {dangLaySo.ten} ({dangLaySo.xong + 1}/{dangLaySo.tong}) — khối nào chưa có số sẽ tự hiện khi lấy xong.
    </p>
  ) : null;
  const nguoiDangXem =xem.loai === "nguoi" ? d?.nguoi.find((x) => x.ma === xem.ma) : undefined;
  // Chế độ «bao-cao»: tự chọn bản của CHÍNH người đăng nhập, không cần bấm
  useEffect(() => {
    if (cheDo !== "bao-cao" || !d || xem.loai !== "mau") return;
    // Của chính mình nếu mình có mẫu; chưa có thì lấy người nhận đầu tiên (để người quản trị vẫn thấy được bố cục)
    const cuaToi = d.nguoi.find((x) => x.ma === d.maCuaToi && x.mau);
    const dau = cuaToi ?? d.nguoi.find((x) => x.mau && x.seGui) ?? d.nguoi.find((x) => x.mau);
    if (dau) setXem({ loai: "nguoi", ma: dau.ma });
  }, [cheDo, d, xem.loai]);
  if (cheDo === "bao-cao") {
    return (
      <div className="space-y-2 lg:h-full lg:min-h-0">
        {loi && <p className="text-[12px] text-red">{loi}</p>}
        {bao && <p className="text-[12px] text-accent">{bao}</p>}
        {dongLaySo}
        {!d ? (
          <p className="text-[12px] text-text-muted">Đang tải bản báo cáo của bạn…</p>
        ) : nguoiDangXem && nguoiDangXem.mau && nguoiDangXem.thamSo ? (
          <SuaBoKhoi
            coDinh
            ten={nguoiDangXem.ten}
            boKhoi={nguoiDangXem.boKhoi}
            boKhoiRieng={nguoiDangXem.boKhoiRieng}
            thuVien={d.thuVien}
            nhanKe={d.nhanKe}
            suaDuoc={d.duocSua || nguoiDangXem.ma === d.maCuaToi}
            lyDoChan={LY_DO_CHAN.caidat}
            onLuu={(bo) => luuBoKhoi(nguoiDangXem, bo)}
            bc={bc}
            khoi={khoi}
            thamSo={nguoiDangXem.thamSo}
            tenMau={NHAN_MAU[nguoiDangXem.mau]}
            duAnChon={nguoiDangXem.duAnChon}
            duAnDeChon={d.duAn}
            onBatTatDuAn={(id) => {
              const n = d.nguoi.find((x) => x.ma === nguoiDangXem.ma);
              if (n) void batTatDuAn(n, id);
            }}
          />
        ) : (
          <p className="text-[12px] text-text-muted">
            Bạn chưa có mẫu báo cáo sáng. Vào tab ② Người nhận, chọn mẫu cho tên bạn để có bản riêng ở đây.
          </p>
        )}
      </div>
    );
  }

  const hien = d ? (hienHet ? d.nguoi : d.nguoi.filter((x) => x.mau || x.daNoiTelegram)) : [];
  const soAn = d ? d.nguoi.length - d.nguoi.filter((x) => x.mau || x.daNoiTelegram).length : 0;

  return (
    <SectionCard>
      <KhaiHuongDan ma="bcs-nguoi-nhan" uuTien={0} />
      {loi && <p className="mb-2 text-[12px] text-red">{loi}</p>}
      {bao && <p className="mb-2 text-[12px] text-accent">{bao}</p>}

      {/* 28/10/2026 (Mr. Đại, đợt 2): HAI CỘT cao bằng khung điện thoại (28/10, KHÔNG ghim khi cuộn) — trái là «Xem mẫu» + danh sách người + sửa khối,
          phải là khung điện thoại của người đang chọn; cột nào dài thì có thanh trượt riêng */}
      <div className="grid grid-cols-1 gap-5 xl:h-[580px] xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 xl:overflow-y-auto scroll-thin xl:pr-1">
      {/* Ba mẫu — bấm là xem ngay */}
      <div className="mb-3 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span data-gt="Xem mẫu" className="text-[11.5px] text-text-muted">Xem mẫu:</span>
          {(Object.keys(NHAN_MAU) as MaMau[]).map((m) => (
            <button
              key={m}
              type="button"
              title={CONG_DUNG_MAU[m]}
              onClick={() => setXem({ loai: "mau", mau: m })}
              className={`rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                xem.loai === "mau" && xem.mau === m
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
              }`}
            >
              {NHAN_MAU[m]}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng người nhận */}
      {d && (
        <div className="overflow-x-auto scroll-thin">
          <table className="tbl">
            <thead>
              <tr>
                <th className="min-w-[160px]">Người</th>
                <th className="min-w-[90px]">Telegram</th>
                <th className="min-w-[260px]">Mẫu báo cáo</th>
                <th className="min-w-[130px]">Gửi gần nhất</th>
                <th className="min-w-[140px]"></th>
              </tr>
            </thead>
            <tbody>
              {hien.map((n) => {
                // Dự án chọn tay: Admin sửa mọi dòng, người khác chỉ dòng của chính mình
                const suaDuocDuAn = d.duocSua || n.ma === d.maCuaToi;
                const tenDuAn = new Map(d.duAn.map((p) => [p.id, p.ten]));
                return (
                <Fragment key={n.ma}>
                <tr>
                  <td>
                    <div className="font-semibold text-text">{n.ten}</div>
                    <div className="text-[10.5px] text-text-muted">{n.chucVu ?? n.email}</div>
                  </td>
                  <td className="whitespace-nowrap text-[11.5px]">
                    {n.daNoiTelegram ? (
                      <span className="text-green">đã nối</span>
                    ) : (
                      <span className="text-text-muted" title="Mỗi người tự nối: menu tên người (góc trên bên phải) → «Nối Telegram»">
                        chưa nối
                      </span>
                    )}
                  </td>
                  <td>
                    <select
                      className={O_CHON}
                      value={n.mau ?? "khong-nhan"}
                      disabled={!d.duocSua || dangLam !== null}
                      title={d.duocSua ? undefined : LY_DO_CHAN.caidat}
                      onChange={(e) => void datMau(n.ma, e.target.value)}
                    >
                      <option value="khong-nhan">Không nhận</option>
                      {(Object.keys(NHAN_MAU) as MaMau[]).map((m) => (
                        <option key={m} value={m}>
                          {NHAN_MAU[m]}
                        </option>
                      ))}
                    </select>
                    {canChonDuAn(n) && (
                      <div className="mt-1 max-w-[260px]">
                        {n.duAnChon.length > 0 && (
                          <div className="text-[11px] leading-snug text-text-secondary">
                            {n.duAnChon.map((id) => tenDuAn.get(id) ?? id).join(" · ")}
                          </div>
                        )}
                        <button
                          type="button"
                          className={`${NUT_PHU} mt-1`}
                          disabled={!suaDuocDuAn}
                          title={suaDuocDuAn ? undefined : LY_DO_CHAN.caidat}
                          onClick={() => setMoChon(moChon === n.ma ? null : n.ma)}
                        >
                          {moChon === n.ma ? "Thu gọn" : `Chọn dự án (${n.duAnChon.length}/${d.duAn.length})`}
                        </button>
                      </div>
                    )}
                    {/* 25/10/2026 (Mr. Đại): ghi chú của ô chạy HẾT bề rộng cột rồi mới xuống dòng — gom một đoạn, cách nhau « · » */}
                    {(n.laMacDinh || n.mau || n.thieuDuAn || n.lyDoChuaGui || n.soPhienBan > 1) && (
                      <div className="mt-0.5 text-[10.5px] leading-snug text-text-muted">
                        {[
                          n.laMacDinh ? <span key="md">mặc định theo chức vụ</span> : null,
                          n.mau && n.mau !== "du-an" ? <span key="tct">toàn công ty</span> : null,
                          n.mau ? <span key="bk">{n.boKhoiRieng ? `bộ riêng ${n.boKhoi.length} khối` : `${n.boKhoi.length} khối mặc định của mẫu`}</span> : null,
                          n.thieuDuAn ? <span key="td" className="text-yellow">chưa chọn dự án — 07:00 chỉ nhận lời nhắc chọn dự án</span> : null,
                          n.lyDoChuaGui ? <span key="cg">chưa gửi được — {n.lyDoChuaGui}</span> : null,
                          n.soPhienBan > 1 ? <span key="pb">đã sửa {n.soPhienBan} lần</span> : null,
                        ]
                          .filter((x): x is JSX.Element => x !== null)
                          .map((x, i) => (i === 0 ? x : <span key={x.key ?? i}> · {x}</span>))}
                      </div>
                    )}
                  </td>
                  <td className="text-[11.5px]">
                    {n.guiGanNhat ? (
                      <span className={n.guiGanNhat.ok ? "text-text-secondary" : "text-red"}>
                        {ngayGioVN(new Date(n.guiGanNhat.luc))}
                        {n.guiGanNhat.ok ? ` · ${n.guiGanNhat.soTin} tin` : ` · lỗi: ${n.guiGanNhat.loi ?? "không rõ"}`}
                      </span>
                    ) : (
                      <span className="text-text-muted">chưa gửi</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {n.mau && (
                      <div className="flex gap-1.5">
                        <button type="button" className={NUT_PHU} onClick={() => setXem({ loai: "nguoi", ma: n.ma })}>
                          Xem · sửa khối
                        </button>
                        <button
                          type="button"
                          className={NUT_PHU}
                          disabled={!coGhi || dangLam !== null || !bc}
                          title={!coGhi ? LY_DO_CHAN.ghi : !bc ? "Chưa có bản báo cáo của ngày này" : "Gửi bản của người này về Telegram của bạn"}
                          onClick={() => void guiThu(n.ma)}
                        >
                          {dangLam === `thu-${n.ma}` ? "Đang gửi…" : "Gửi thử cho tôi"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {/* ⭐ 04/10 tối — ô chọn dự án cho mẫu Dự án: bấm tên là chọn/bỏ + lưu ngay, chọn 1 hoặc nhiều */}
                {moChon === n.ma && canChonDuAn(n) && suaDuocDuAn && (
                  <tr>
                    <td colSpan={5} className="bg-bg2">
                      <div className="mb-1.5 text-[11px] text-text-muted">
                        Dự án {n.ten} xem chi tiết — bấm tên để chọn / bỏ, lưu ngay. Chọn được 1 hoặc nhiều dự án, thuộc BQLDA nào cũng được.
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {d.duAn.map((p) => {
                          const chon = n.duAnChon.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              aria-pressed={chon}
                              onClick={() => void batTatDuAn(n, p.id)}
                              className={`rounded-sm border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                                chon
                                  ? "border-accent/50 bg-accent-soft text-accent"
                                  : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
                              }`}
                            >
                              {chon ? "✓ " : ""}
                              {p.ten}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {d && soAn > 0 && d.duocSua && (
        <button type="button" className={`${NUT_PHU} mt-2`} onClick={() => setHienHet((v) => !v)}>
          {hienHet ? "Chỉ hiện người có mẫu hoặc đã nối Telegram" : `Hiện cả ${soAn} người khác (chọn mẫu trước khi họ nối Telegram)`}
        </button>
      )}

      {/* ⭐ 17/10 — kéo thả khối cho người đang xem (KE-HOACH/23) */}
      {d && nguoiDangXem && nguoiDangXem.mau && nguoiDangXem.thamSo && (
        <div className="mt-4 border-t border-border-light pt-3">
          <SuaBoKhoi
            ten={nguoiDangXem.ten}
            boKhoi={nguoiDangXem.boKhoi}
            boKhoiRieng={nguoiDangXem.boKhoiRieng}
            thuVien={d.thuVien}
            nhanKe={d.nhanKe}
            suaDuoc={d.duocSua || nguoiDangXem.ma === d.maCuaToi}
            lyDoChan={LY_DO_CHAN.caidat}
            onLuu={(bo) => luuBoKhoi(nguoiDangXem, bo)}
            bc={bc}
            khoi={khoi}
            thamSo={nguoiDangXem.thamSo}
            tenMau={NHAN_MAU[nguoiDangXem.mau]}
            duAnChon={nguoiDangXem.duAnChon}
            duAnDeChon={d.duAn}
            onBatTatDuAn={(id) => {
              const n = d.nguoi.find((x) => x.ma === nguoiDangXem.ma);
              if (n) void batTatDuAn(n, id);
            }}
          />
        </div>
      )}

      </div>

      {/* Xem trước — cột phải, ghim dưới thanh trên khi cuộn (màn hẹp thì rơi xuống dưới danh sách) */}
      <div className="min-w-0 xl:overflow-y-auto scroll-thin">
        {!bc || !bc.duAn ? (
          <p className="text-[12px] text-text-muted">Chưa có bản báo cáo của ngày này để xem trước — bấm Dựng lại ở trên.</p>
        ) : truoc ? (
          <>
            {dongLaySo}
            <XemBoKhoi dauVao={truoc.dauVao} nhan={truoc.nhan} />
          </>
        ) : null}
      </div>
      </div>
    </SectionCard>
  );
}
