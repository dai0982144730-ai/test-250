"use client";

// ============================================================
// KÉO THẢ KHỐI BÁO CÁO SÁNG — KE-HOACH/23 (Mr. Đại chốt 17/10/2026)
//
// Người dùng vào đây để: dựng báo cáo sáng CỦA MỘT NGƯỜI bằng cách kéo khối từ thư viện vào.
//   · Trái: thư viện 21 khối, 3 kệ (chỉ để dễ tìm — ai cũng kéo được mọi khối)
//   · Phải: báo cáo của người đó — kéo vào, kéo đổi thứ tự, nút «Toàn công ty / Dự án tôi chọn», số dòng, bỏ khối
//   · Bấm tên một khối → khung bên: số thật hôm nay + lấy ở đâu · công thức · lời dặn AI (chỉ xem)
// Mọi thao tác LƯU NGAY (luật 4 — không nút xác nhận). Nút không có quyền: mờ + lý do (luật 17).
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import type { BaoCaoSang } from "@/lib/bao-cao-sang/model";
import type { ChonKhoi, KeKhoi, MaKhoi, MoTaKhoi, PhamViKhoi } from "@/lib/bao-cao-sang/khoi";
import { NHAN_PHAM_VI, soDongCua } from "@/lib/bao-cao-sang/khoi";
import type { ThamSoKichBan } from "@/lib/bao-cao-sang/kich-ban";
import type { DuLieuKhoi } from "@/lib/bao-cao-sang/khoi-du-lieu";
import { DienThoaiTelegram } from "./DienThoaiTelegram";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const NUT =
  "rounded-sm border border-border px-2 py-0.5 text-[11px] font-semibold text-text-secondary transition hover:border-accent/40 hover:text-text disabled:opacity-50";
const NUT_CHON = "rounded-sm border border-accent/50 bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent";
const O_CHON = "rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[11px] text-text disabled:opacity-50";

const TEN_KE_NGAN: Record<KeKhoi, string> = { "tong-quat": "Tổng quát", "ra-quyet-dinh": "Ra quyết định", "di-sau-du-an": "Đi sâu" };

const NHAN_KIEU: Record<MoTaKhoi["kieu"], string> = { bang: "bảng", "bieu-do": "biểu đồ + ảnh", chu: "chữ 🤖" };

/** Khối có danh sách dòng → cho chọn số dòng */
const CO_SO_DONG: ReadonlySet<MaKhoi> = new Set<MaKhoi>(["TQ-4", "RQ-1", "RQ-5", "RQ-6", "DA-1", "DA-2"]);
const CAC_SO_DONG = [1, 3, 5, 10, 20];

/**
 * Ô chọn dự án (27/10/2026, Mr. Đại chọn A): bấm tên là chọn / bỏ, lưu ngay — không nút xác nhận; bấm ra ngoài thì gập.
 * Một danh sách cho mỗi người, dùng chung cho mọi khối «Dự án tôi chọn» (chốt 04/10) — ghi rõ ngay trên ô.
 */
function OChonDuAn({
  ds,
  chon,
  suaDuoc,
  lyDoChan,
  onBatTat,
  onDong,
}: {
  ds: readonly { id: string; ten: string }[];
  chon: readonly string[];
  suaDuoc: boolean;
  lyDoChan: string;
  onBatTat: (id: string) => void;
  onDong: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const ngoai = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      // Bấm vào chính nút mở ô thì để nút tự bật / tắt (khỏi đóng rồi mở lại)
      if (ref.current && t && !ref.current.contains(t) && !t.closest("[data-mo-chon-du-an]")) onDong();
    };
    document.addEventListener("mousedown", ngoai);
    return () => document.removeEventListener("mousedown", ngoai);
  }, [onDong]);
  return (
    <div ref={ref} className="mt-1 rounded-sm border border-border bg-bg2 p-2">
      <div className="mb-1.5 text-[11px] text-text-muted">
        Bấm tên để chọn / bỏ — lưu ngay. Danh sách này <b className="text-text-secondary">dùng chung cho mọi khối «Dự án tôi chọn»</b> của bạn.
      </div>
      {ds.length === 0 ? (
        <p className="text-[11px] text-text-muted">Chưa có dự án nào trong sổ dự án.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ds.map((p) => {
            const co = chon.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={co}
                disabled={!suaDuoc}
                title={suaDuoc ? undefined : lyDoChan}
                onClick={() => onBatTat(p.id)}
                className={`rounded-sm border px-2 py-0.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                  co ? "border-accent/50 bg-accent-soft text-accent" : "border-border bg-surface text-text-secondary hover:border-accent/40 hover:text-text"
                }`}
              >
                {co ? "✓ " : ""}
                {p.ten}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SuaBoKhoi({
  ten,
  boKhoi,
  boKhoiRieng,
  thuVien,
  nhanKe,
  suaDuoc,
  lyDoChan,
  onLuu,
  bc,
  khoi,
  thamSo,
  tenMau,
  duAnChon = null,
  duAnDeChon = [],
  onBatTatDuAn,
  coDinh = false,
}: {
  /** 27/10/2026 (Mr. Đại chọn A): danh sách dự án để chọn ngay tại khối «Dự án tôi chọn» — MỘT danh sách mỗi người, dùng chung mọi khối */
  duAnDeChon?: readonly { id: string; ten: string }[];
  /** Bấm một dự án = chọn / bỏ + lưu ngay (không nút xác nhận) */
  onBatTatDuAn?: (id: string) => void;
  ten: string;
  boKhoi: ChonKhoi[];
  boKhoiRieng: boolean;
  thuVien: MoTaKhoi[];
  nhanKe: Record<KeKhoi, string>;
  suaDuoc: boolean;
  lyDoChan: string;
  onLuu: (bo: ChonKhoi[]) => Promise<void>;
  bc: BaoCaoSang | null;
  khoi: DuLieuKhoi | null;
  thamSo: ThamSoKichBan;
  tenMau: string;
  /** Dự án chọn tay của người này (null = mọi dự án) — để màn điện thoại in đúng bản người đó nhận */
  duAnChon?: readonly string[] | null;
  /** 25/10/2026 (Mr. Đại): ba cột CỐ ĐỊNH vừa một màn hình, mỗi cột có thanh trượt riêng (từ màn rộng lg trở lên) */
  coDinh?: boolean;
}) {
  const [bo, setBo] = useState<ChonKhoi[]>(boKhoi);
  /** Ô chọn dự án đang mở ở đâu: dưới một khối (mã khối) hay ở dòng đầu cột («dau») */
  const [moChonDuAn, setMoChonDuAn] = useState<MaKhoi | "dau" | null>(null);
  const tenDuAn = useMemo(() => new Map(duAnDeChon.map((p) => [p.id, p.ten])), [duAnDeChon]);
  const daChonTen = (duAnChon ?? []).map((id) => tenDuAn.get(id) ?? id);
  const oChonDuAn = (
    <OChonDuAn ds={duAnDeChon} chon={duAnChon ?? []} suaDuoc={suaDuoc && !!onBatTatDuAn} lyDoChan={lyDoChan} onBatTat={(id) => onBatTatDuAn?.(id)} onDong={() => setMoChonDuAn(null)} />
  );
  const [dangXem, setDangXem] = useState<MaKhoi | null>(null);
  // Màn điện thoại: xem CẢ báo cáo hay riêng khối đang chọn. Đổi qua lại không mất khối đã chọn (nút nằm ngoài màn điện thoại)
  const [xemCa, setXemCa] = useState(false);
  const chonXem = (ma: MaKhoi) => {
    setDangXem(ma);
    setXemCa(false);
  };
  // Thư viện chia 3 tab theo kệ (đỡ phải cuộn) · thẻ giải thích hiện khi rê chuột vào một khối
  const [keDangXem, setKeDangXem] = useState<KeKhoi>("tong-quat");
  const [the, setThe] = useState<{ ma: MaKhoi; top: number; left: number } | null>(null);
  const keo = useRef<{ tu: "thu-vien"; ma: MaKhoi } | { tu: "bo"; i: number } | null>(null);
  useEffect(() => setBo(boKhoi), [boKhoi]);

  const theoMa = useMemo(() => new Map(thuVien.map((k) => [k.ma, k])), [thuVien]);
  const daCo = new Set(bo.map((k) => k.ma));

  function luu(moi: ChonKhoi[]) {
    setBo(moi);
    void onLuu(moi);
  }
  function them(ma: MaKhoi, viTri = bo.length) {
    if (!suaDuoc || daCo.has(ma)) return;
    const moi = bo.slice();
    moi.splice(viTri, 0, { ma, phamVi: "cong-ty" });
    luu(moi);
  }
  function doiCho(tu: number, toi: number) {
    if (tu === toi) return;
    const moi = bo.slice();
    const [k] = moi.splice(tu, 1);
    moi.splice(toi > tu ? toi - 1 : toi, 0, k!);
    luu(moi);
  }
  function sua(i: number, phan: Partial<ChonKhoi>) {
    luu(bo.map((k, j) => (j === i ? { ...k, ...phan } : k)));
  }
  function tha(viTri: number) {
    const k = keo.current;
    keo.current = null;
    if (!k || !suaDuoc) return;
    if (k.tu === "thu-vien") them(k.ma, viTri);
    else doiCho(k.i, viTri);
  }

  const ke: KeKhoi[] = ["tong-quat", "ra-quyet-dinh", "di-sau-du-an"];
  const anhDau = bo.filter((k) => theoMa.get(k.ma)?.coAnh);

  return (
    <div className={`grid gap-3 lg:grid-cols-[repeat(3,minmax(0,1fr))] ${coDinh ? "lg:h-full lg:min-h-0 lg:grid-rows-1" : ""}`}>
      <KhaiHuongDan ma="bcs-bo-khoi" uuTien={0} />
      {/* Thư viện — 3 tab theo kệ */}
      <div className={`space-y-2 ${coDinh ? "lg:min-h-0 lg:overflow-y-auto lg:pr-1 scroll-thin" : ""}`}>
        <div data-gt="Thư viện khối" className="text-[12px] font-semibold text-text">Thư viện khối</div>
        <div role="tablist" aria-label="Kệ khối" className="flex flex-wrap gap-1">
          {ke.map((k) => {
            const tong = thuVien.filter((x) => x.ke === k).length;
            const co = thuVien.filter((x) => x.ke === k && daCo.has(x.ma)).length;
            return (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={keDangXem === k}
                title={nhanKe[k]}
                onClick={() => setKeDangXem(k)}
                className={keDangXem === k ? NUT_CHON : NUT}
              >
                {TEN_KE_NGAN[k]} <span className="font-normal opacity-80">{co}/{tong}</span>
              </button>
            );
          })}
        </div>
        <div className="text-[11px] text-text-muted">{nhanKe[keDangXem]}</div>
        <ul className="space-y-1">
          {thuVien
            .filter((x) => x.ke === keDangXem)
            .map((x) => {
              const co = daCo.has(x.ma);
              return (
                <li
                  key={x.ma}
                  draggable={suaDuoc && !co}
                  onDragStart={() => (keo.current = { tu: "thu-vien", ma: x.ma })}
                  onMouseEnter={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setThe({ ma: x.ma, top: r.top, left: r.right + 8 });
                  }}
                  onMouseLeave={() => setThe(null)}
                  className={`flex items-center gap-1 rounded-sm border px-2 py-1 ${dangXem === x.ma ? "border-accent/50 bg-accent-soft" : "border-border bg-surface"} ${suaDuoc && !co ? "cursor-grab" : ""}`}
                >
                  <button type="button" className="min-w-0 flex-1 text-left text-[11.5px] text-text" onClick={() => chonXem(x.ma)}>
                    <span className="font-semibold">{x.ma}</span> {x.ten}
                    <span className="block text-[10.5px] text-text-muted">{NHAN_KIEU[x.kieu]}</span>
                  </button>
                  <button
                    type="button"
                    className={NUT}
                    disabled={!suaDuoc || co}
                    title={!suaDuoc ? lyDoChan : co ? "Đã có trong báo cáo" : "Thêm vào cuối báo cáo (hoặc kéo thả vào chỗ muốn)"}
                    onClick={() => them(x.ma)}
                  >
                    {co ? "✓" : "＋"}
                  </button>
                </li>
              );
            })}
        </ul>
      </div>
      {/* «Để làm gì · Lấy ở đâu · Công thức» — NGOÀI màn điện thoại, hiện khi rê chuột vào một khối ở thư viện */}
      {the && theoMa.get(the.ma) && (
        <div
          className="pointer-events-none fixed z-50 w-[340px] space-y-1.5 rounded-sm border border-border bg-surface p-3 text-[11.5px] shadow-lg"
          style={{ top: Math.max(8, Math.min(the.top, (typeof window === "undefined" ? 600 : window.innerHeight) - 260)), left: the.left }}
        >
          <div className="text-[12.5px] font-semibold text-text">
            {the.ma} {theoMa.get(the.ma)!.ten}
          </div>
          <div>
            <span className="text-text-muted">Để làm gì: </span>
            <span className="text-text-secondary">{theoMa.get(the.ma)!.deLamGi}</span>
          </div>
          <div>
            <span className="text-text-muted">Lấy ở đâu: </span>
            <span className="text-text-secondary">{theoMa.get(the.ma)!.nguon}</span>
          </div>
          <div>
            <span className="text-text-muted">Công thức: </span>
            <span className="text-text-secondary">{theoMa.get(the.ma)!.congThuc}</span>
          </div>
        </div>
      )}

      {/* Báo cáo của người này */}
      <div
        className={`space-y-1.5 ${coDinh ? "lg:min-h-0 lg:overflow-y-auto lg:pr-1 scroll-thin" : ""}`}
        onDragOver={(e) => suaDuoc && e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          tha(bo.length);
        }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span data-gt="Báo cáo sáng của người này" className="text-[12px] font-semibold text-text">Báo cáo sáng của {ten}</span>
          <span className="text-[11px] text-text-muted">
            {boKhoiRieng ? `bộ riêng · ${bo.length} khối` : `bộ mặc định của mẫu ${tenMau}`}
          </span>
          <span className="flex-1" />
          {boKhoiRieng && (
            <button type="button" className={NUT} disabled={!suaDuoc} title={suaDuoc ? undefined : lyDoChan} onClick={() => luu([])}>
              Về bộ mặc định
            </button>
          )}
        </div>
        {/* 27/10/2026 (Mr. Đại chọn A): dòng đầu cột — dự án đã chọn, bấm ✎ là mở ô chọn ngay đây */}
        {onBatTatDuAn && (
          <div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
              <span className="text-text-muted">Dự án tôi chọn:</span>
              <span className={daChonTen.length > 0 ? "font-semibold text-text" : "text-text-muted"}>
                {daChonTen.length > 0 ? daChonTen.join(" · ") : "chưa chọn dự án nào"}
              </span>
              <button
                type="button"
                data-mo-chon-du-an=""
                className={moChonDuAn === "dau" ? NUT_CHON : NUT}
                disabled={!suaDuoc}
                title={suaDuoc ? "Chọn / bỏ dự án — dùng chung cho mọi khối «Dự án tôi chọn»" : lyDoChan}
                onClick={() => setMoChonDuAn(moChonDuAn === "dau" ? null : "dau")}
              >
                ✎ {daChonTen.length > 0 ? "Sửa" : "Chọn dự án"}
              </button>
            </div>
            {moChonDuAn === "dau" && oChonDuAn}
          </div>
        )}
        {bo.length === 0 && <p className="text-[11.5px] text-text-muted">Kéo khối từ thư viện vào đây.</p>}
        <ol className="space-y-1">
          {bo.map((k, i) => {
            const mo = theoMa.get(k.ma);
            if (!mo) return null;
            return (
              <li
                key={k.ma}
                draggable={suaDuoc}
                onDragStart={() => (keo.current = { tu: "bo", i })}
                onDragOver={(e) => suaDuoc && e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  tha(i);
                }}
                className={`rounded-sm border px-2 py-1.5 ${dangXem === k.ma ? "border-accent/50 bg-accent-soft" : "border-border bg-surface"}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`text-[12px] text-text-muted ${suaDuoc ? "cursor-grab" : ""}`} title="Kéo để đổi thứ tự">
                    ⋮⋮
                  </span>
                  <button type="button" className="min-w-0 flex-1 text-left text-[11.5px] font-semibold text-text" onClick={() => chonXem(k.ma)}>
                    {i + 1}. {k.ma} {mo.ten}
                  </button>
                  <button type="button" className={NUT} disabled={!suaDuoc} title={suaDuoc ? "Bỏ khối này khỏi báo cáo" : lyDoChan} onClick={() => luu(bo.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1 pl-5">
                  {(["cong-ty", "du-an-chon"] as PhamViKhoi[]).map((pv) => (
                    <button
                      key={pv}
                      type="button"
                      data-mo-chon-du-an={pv === "du-an-chon" ? "" : undefined}
                      className={`${k.phamVi === pv ? NUT_CHON : NUT} max-w-full truncate`}
                      disabled={!suaDuoc}
                      title={
                        !suaDuoc
                          ? lyDoChan
                          : pv === "du-an-chon"
                            ? `Bấm để chọn dự án ngay dưới đây${daChonTen.length > 0 ? ` — đang chọn: ${daChonTen.join(", ")}` : ""}`
                            : undefined
                      }
                      onClick={() => {
                        if (k.phamVi !== pv) sua(i, { phamVi: pv });
                        // Bấm «Dự án tôi chọn» là mở ngay ô chọn dưới khối (chưa chọn dự án nào thì càng phải mở)
                        if (pv === "du-an-chon" && onBatTatDuAn) setMoChonDuAn(k.phamVi === pv && moChonDuAn === k.ma ? null : k.ma);
                        else if (moChonDuAn === k.ma) setMoChonDuAn(null);
                      }}
                    >
                      {pv === "du-an-chon" && k.phamVi === pv && onBatTatDuAn
                        ? daChonTen.length > 0
                          ? `Dự án tôi chọn: ${daChonTen.join(", ")} ✎`
                          : "Dự án tôi chọn: chưa chọn ✎"
                        : NHAN_PHAM_VI[pv]}
                    </button>
                  ))}
                  {CO_SO_DONG.has(k.ma) && (
                    <select
                      className={O_CHON}
                      disabled={!suaDuoc}
                      title={suaDuoc ? "Số dòng mỗi dự án" : lyDoChan}
                      value={k.soDong === undefined ? "md" : k.soDong === null ? "het" : String(k.soDong)}
                      onChange={(e) => {
                        const v = e.target.value;
                        const { soDong: _bo, ...con } = k;
                        luu(bo.map((x, j) => (j === i ? (v === "md" ? con : { ...con, soDong: v === "het" ? null : Number(v) }) : x)));
                      }}
                    >
                      <option value="md">mặc định ({soDongCua({ ma: k.ma, phamVi: k.phamVi }) ?? "tất cả"} dòng)</option>
                      {CAC_SO_DONG.map((n) => (
                        <option key={n} value={String(n)}>
                          {n} dòng
                        </option>
                      ))}
                      <option value="het">tất cả</option>
                    </select>
                  )}
                  {k.ma === "RQ-1" && (
                    <button
                      type="button"
                      className={k.gopCongTy ? NUT_CHON : NUT}
                      disabled={!suaDuoc}
                      title={suaDuoc ? "Lấy N việc nặng nhất cả công ty thay vì mỗi dự án N việc" : lyDoChan}
                      onClick={() => sua(i, { gopCongTy: !k.gopCongTy })}
                    >
                      {k.gopCongTy ? "✓ Nặng nhất cả công ty" : "Nặng nhất cả công ty"}
                    </button>
                  )}
                </div>
                {moChonDuAn === k.ma && k.phamVi === "du-an-chon" && <div className="pl-5">{oChonDuAn}</div>}
              </li>
            );
          })}
        </ol>
        {suaDuoc && bo.length > 0 && (
          <div
            className="rounded-sm border border-dashed border-border px-2 py-1.5 text-center text-[11px] text-text-muted"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              tha(bo.length);
            }}
          >
            Thả vào đây để thêm xuống cuối
          </div>
        )}
        {anhDau.length > 0 && (
          <p className="text-[11px] text-text-muted">
            Khối có ảnh biểu đồ (Telegram gửi các ảnh có nội dung thành một album, theo thứ tự khối): {anhDau.map((k) => `${k.ma} ${theoMa.get(k.ma)?.ten ?? ""}`).join(" · ")}
          </p>
        )}
      </div>

      {/* Cột phải: màn hình điện thoại giả lập — đúng tin Telegram người này sẽ nhận (rộng bằng cột giữa) */}
      <div className={`min-w-0 ${coDinh ? "lg:min-h-0" : ""}`}>
        <DienThoaiTelegram
          coDinh={coDinh}
          cuonToi={dangXem && xemCa ? (theoMa.get(dangXem)?.ten ?? null) : null}
          ghiChu={dangXem && !xemCa && !bo.some((k) => k.ma === dangXem) ? `Đang xem thử khối ${dangXem}: khối này CHƯA nằm trong báo cáo của bạn nên hiện ở phạm vi «Toàn công ty» (như khi vừa kéo vào). Telegram chỉ gửi những khối đã có trong danh sách bên trái.` : null}
          dauVao={bc && bc.duAn && bc.vanDe ? { bc, khoi, boKhoi: dangXem && !xemCa ? [bo.find((k) => k.ma === dangXem) ?? { ma: dangXem, phamVi: "cong-ty" }] : bo, thamSo, duAnChon } : null}
          dieuKhien={
            // Nút chuyển nằm trên thanh «Main Agent» của điện thoại, KHÔNG nằm trong màn hình tin nhắn
            <>
              <button
                type="button"
                data-gt="Nút Cả báo cáo"
                onClick={() => setXemCa(true)}
                className={`rounded-sm border px-2 py-0.5 text-[10.5px] font-semibold transition ${xemCa || !dangXem ? "border-accent bg-accent text-white" : "border-[#4a5a6a] text-[#cfd8e3] hover:border-white hover:text-white"}`}
              >
                Cả báo cáo
              </button>
              <button
                type="button"
                disabled={!dangXem}
                title={dangXem ? (daCo.has(dangXem) ? undefined : "Khối này chưa có trong báo cáo") : "Bấm tên một khối ở thư viện hoặc danh sách để xem riêng khối đó"}
                data-gt="Nút Khối đã chọn"
                onClick={() => setXemCa(false)}
                className={`max-w-[150px] truncate rounded-sm border px-2 py-0.5 text-[10.5px] font-semibold transition disabled:opacity-40 ${dangXem && !xemCa ? "border-accent bg-accent text-white" : "border-[#4a5a6a] text-[#cfd8e3] hover:border-white hover:text-white"}`}
              >
                {dangXem ? `Khối ${dangXem}` : "Khối đã chọn"}
              </button>
            </>
          }
        />
      </div>
    </div>
  );
}
