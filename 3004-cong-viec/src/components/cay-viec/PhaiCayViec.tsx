"use client";
// ============================================================
// CỘT PHẢI của màn Cây việc & đường găng (Mr. Đại chốt 03/10/2026): LUÔN HIỆN; mọi chỗ bấm ở cột trái mở nội dung ở đây —
// không chuyển trang, không tab mới, không popup, không window.prompt/confirm. Chưa chọn gì → tóm tắt dự án + hướng dẫn bấm.
//   · nguồn của 4 thẻ (Base: modal m-nguon-*)   · đầu việc WBS + việc treo + khối ⭕ AI soạn giao / Giao / Không cần giao
//   · chi tiết một việc (đọc sổ cái /api/cong-viec/<mã>) + ô chọn mã WBS (một cú chọn là áp dụng) + nút Duyệt
//   · 🤖 soạn giao hàng loạt                    · kết quả "🤖 Gán mã ngay"
// Nút không có quyền thì ẨN (luật riêng 3004).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { goiApi, LOP_O_NHAP } from "@/components/layout/giao-dien";
import { khoangNgay } from "@/lib/phong/tuan";
import { fmtSo } from "@/lib/format";
import type { DuLieuCayViec, QuyenMan, TinhTrangSoViec } from "@/lib/cay-viec/dung-man";
import { chuaAiGiao, chuaToiLucGiao, ketQuaMacDinhGang, phangCay, type NutCay, type ViecCay } from "@/lib/cay-viec/thuan";
import { useCaiDatDinhKem, useKepTep } from "@/components/dinh-kem/DinhKem";
import { OGiaoSua, type DanhBaGiao } from "./OGiaoSua";
import { OChonNoiNhan } from "./OChonNoiNhan";
import type { DeXuatGiao } from "@/lib/cay-viec/soan-giao";
import type { CongViec, PhanViec } from "@/lib/types";
import { chuDoChac, DongViec, nhanTrangThai, NutViecDaXong } from "./CayGiaiDoan";
import { KhungHangLoat } from "./SoanGiaoHangLoat";
import type { Chon } from "./chon";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

const LOP_CHON = `${LOP_O_NHAP} !py-1 !text-[12px]`;
const ngayVN = (iso: string) => {
  const [n, t, ng] = iso.slice(0, 10).split("-");
  return ng && t && n ? `${ng}/${t}/${n}` : iso;
};
const gioPhut = (iso?: string) => (iso ? new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 16).replace("T", " ") : "—");
const tenNgan = (s: string) => s.split(/\s+/).slice(0, 8).join(" ");

interface Props {
  chon: Chon;
  mo: (c: Chon) => void;
  du: DuLieuCayViec | null;
  so: TinhTrangSoViec | undefined;
  quyen: QuyenMan | undefined;
  duAn: { id: string; ten: string } | undefined;
  onDoi: () => void;
  /** Đang tải lần đầu / agent Tiến độ không trả lời */
  thongBao?: string;
}

export function PhaiCayViec(p: Props) {
  const phang = useMemo(() => phangCay(p.du?.cay ?? []), [p.du]);
  const nutTheoMa = useMemo(() => new Map(phang.map((n) => [n.wbs, n])), [phang]);
  const viecTheoId = useMemo(() => {
    const m = new Map<string, { v: ViecCay; nut: NutCay | null }>();
    for (const n of phang) for (const v of n.viec) m.set(v.id, { v, nut: n });
    for (const v of p.so?.viecChuaGan ?? []) if (!m.has(v.id)) m.set(v.id, { v, nut: null });
    return m;
  }, [phang, p.so]);

  const c = p.chon;
  if (c.loai === "nguon") return <KhungNguon the={c.so} tt={p.so} duAn={p.duAn} />;
  if (c.loai === "gan") return <KhungGan tin={c.tin} loi={c.loi} so={p.so} />;
  if (c.loai === "hang-loat" && p.du && p.duAn) return <KhungHangLoat cay={p.du.cay} duAnId={p.duAn.id} lan={c.lan} mo={p.mo} onDoi={p.onDoi} />;
  if (c.loai === "nut") {
    const n = nutTheoMa.get(c.wbs);
    if (n && p.duAn) return <KhungNut key={n.wbs} n={n} soan={c.soan} duAnId={p.duAn.id} duAnTen={p.duAn.ten} duocGiao={!!p.quyen?.giao} mo={p.mo} onDoi={p.onDoi} />;
  }
  if (c.loai === "viec") {
    const x = viecTheoId.get(c.id);
    return <KhungViec key={c.id} id={c.id} v={x?.v ?? null} nut={x?.nut ?? null} phang={phang} mo={p.mo} onDoi={p.onDoi} />;
  }
  return <KhungTong {...p} />;
}

// ─────────────── Tóm tắt dự án (chưa chọn gì) ───────────────
function KhungTong({ so, duAn, thongBao, mo, du }: Props) {
  // Chỉ việc lá găng ĐẾN LÚC GIAO (cửa sổ N ngày — Mr. Đại chốt 04/10), cùng định nghĩa thẻ ④
  const nutTrong = useMemo(() => phangCay(du?.cay ?? []).filter(chuaAiGiao).slice(0, 8), [du]);
  return (
    <div className="p-4 text-[12px] leading-relaxed text-text-secondary" data-gt="cv:phai-tong">
      <div className="text-[15px] font-bold text-text">{duAn ? `Dự án ${duAn.ten}` : "Cây việc & đường găng"}</div>
      {thongBao && <div className="mt-1 text-[11.5px] text-text-muted">{thongBao}</div>}
      {so?.ok && so.tongWbs !== undefined && (
        <ul className="mt-2 space-y-0.5">
          <li>
            <b className="text-text">{so.tongWbs}</b> đầu việc WBS · <b className="text-text">{so.soGiaiDoan}</b> giai đoạn · COD dự báo{" "}
            {so.codDuBao ? ngayVN(so.codDuBao) : "—"}
          </li>
          <li>
            <b className="text-red">{so.tongGang}</b> đầu việc trên đường găng — <b className="text-red">{so.nutGangChuaGiao}</b> việc tới lúc giao mà chưa ai được giao
            {so.soLaChuaToiLuc ? <span className="text-text-muted"> · {so.soLaChuaToiLuc} việc chưa tới lúc giao</span> : null}
          </li>
          <li>
            <b className="text-text">{so.tongSoViec}</b> việc liên quan WBS · gắn được mã <b className="text-text">{so.soViecGanDuocWbs}</b> ·{" "}
            <span className="text-yellow">{so.soChoDuyet} chờ duyệt</span>
          </li>
        </ul>
      )}
      {so?.ok && nutTrong.length === 0 && (
        <div className="mt-3 text-[11.5px] text-text-secondary">
          Không có việc găng nào tới lúc giao — cửa sổ giao {so.cuaSoGiaoNgay ?? 7} ngày (bắt đầu tới {so.ngayCuoiCuaSo ? ngayVN(so.ngayCuoiCuaSo) : "—"}), sửa ở Cài đặt › Gắn việc vào WBS.
        </div>
      )}
      {nutTrong.length > 0 && (
        <div className="mt-3">
          <div className="text-[11.5px] font-semibold text-text">Việc găng tới lúc giao, chưa ai giao (đầu danh sách)</div>
          {nutTrong.map((n) => (
            <button key={n.wbs} type="button" onClick={() => mo({ loai: "nut", wbs: n.wbs })} data-gt="cv:phai-nut-trong" className="block w-full truncate py-0.5 text-left text-[11.5px] font-semibold text-red hover:underline">
              {n.wbs} {n.ten}
              {n.end && <span className="font-normal text-text-muted"> · {ngayVN(n.end)}</span>}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 border-t border-border-light pt-2 text-[11px]">
        <div className="font-semibold text-text">Bấm vào đâu</div>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>Một đầu việc trên cây → chi tiết đầu việc, việc đang treo, và (nếu găng chưa ai giao) 🤖 AI soạn giao ngay tại đây</li>
          <li>Một việc → chi tiết việc trong sổ, mã WBS AI gắn, Duyệt hoặc đổi mã</li>
          <li>Chữ “nguồn” dưới 4 thẻ → con số đó lấy từ đâu, tính thế nào</li>
          <li>🤖 Soạn việc trên đường găng chưa ai làm → AI soạn người nhận cho mọi nút găng trống</li>
        </ul>
      </div>
    </div>
  );
}


// ─────────────── Nguồn của 4 thẻ (Base: modal m-nguon-* của demo) ───────────────
function KhungNguon({ the, tt, duAn }: { the: 1 | 2 | 3 | 4; tt: TinhTrangSoViec | undefined; duAn: { id: string; ten: string } | undefined }) {
  const s = tt ?? { ok: false };
  const dong = (nhan: string, gia: React.ReactNode) => (
    <tr className="border-b border-border-light">
      <td className="py-1 pr-2 text-text-secondary">{nhan}</td>
      <td className="py-1 text-right font-bold text-text">{gia}</td>
    </tr>
  );
  const noiDung: Record<1 | 2 | 3 | 4, { tieu: string; nguon: string; cong: string; bang: React.ReactNode }> = {
    1: {
      tieu: `Đầu việc WBS · ${duAn?.ten ?? ""}`,
      nguon: `chung.wbs — Agent tiến độ (công cụ tiendo.tim_dau_viec, cắt trang 100 dòng, nhớ tạm 10 phút) · lấy lúc ${gioPhut(s.lucLayTienDo)}`,
      cong: "Đếm MỌI đầu việc baseline của cây WBS (mọi cấp). Giai đoạn = đầu việc cấp 1.",
      bang: (
        <>
          {dong("Tổng đầu việc", s.tongWbs ?? 0)}
          {dong("Giai đoạn cấp 1", s.soGiaiDoan ?? 0)}
          {dong("COD dự báo", s.codDuBao ? ngayVN(s.codDuBao) : "—")}
        </>
      ),
    },
    2: {
      tieu: "Trên đường găng",
      nguon: `criticalWbs — engine CPM của Agent tiến độ (trường critical của từng đầu việc) · lấy lúc ${gioPhut(s.lucLayTienDo)}`,
      cong: "Đếm đầu việc có critical = đúng, trên TOÀN cây (không chỉ chuỗi găng chốt COD). Chia theo nhóm = mã cấp 1.",
      bang: (
        <>
          {dong("Đầu việc găng", s.tongGang ?? 0)}
          {(s.gangTheoNhom ?? "").split(" · ").filter(Boolean).map((x) => {
            const [nhom, so] = x.split(": ");
            return <tr key={nhom} className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">{nhom}</td><td className="py-1 text-right text-text">{so}</td></tr>;
          })}
        </>
      ),
    },
    3: {
      tieu: "Việc của dự án",
      nguon: `sổ cái agent Công việc (việc sinh từ báo cáo tuần + giao tay) · mã WBS ở bảng gắn WBS · đọc lúc ${gioPhut(s.lucDocSoCai)}`,
      cong: `Việc thuộc dự án = ô Dự án của việc trùng tên / tên gọi khác trong Cài đặt, hoặc việc giao Ban điều hành dự án, hoặc tên dự án ghi trong tên việc. Việc liên quan WBS = việc thuộc dự án − việc AI/người kết luận không gắn được vào đầu việc WBS nào (Mr. Đại chốt 05/10: màn này không để những việc đó — lần đọc này bỏ ${s.soKetLuanKhongThuoc ?? 0} việc). Gắn được = đã có mã WBS ĐÃ DUYỆT (đề xuất 🤖 còn chờ duyệt không tính — chốt 03/10).`,
      bang: (
        <>
          {dong("Việc liên quan WBS", s.tongSoViec ?? 0)}
          {dong("Đã xét (có dòng gắn mã)", s.soDaXet ?? 0)}
          {dong("Gắn được mã WBS", s.soViecGanDuocWbs ?? 0)}
          {dong("🤖 AI đề xuất — chờ duyệt", s.ganTheoDuong?.ai_cho ?? 0)}
          {dong("🤖 AI đề xuất — đã duyệt / tự duyệt", s.ganTheoDuong?.ai_duyet ?? 0)}
          {dong("Người gắn", s.ganTheoDuong?.nguoi ?? 0)}
        </>
      ),
    },
    4: {
      tieu: "Nút găng CHƯA AI GIAO",
      nguon: "ghép hai nguồn trên — code tính, không AI",
      cong: `⭐ 04/10 (Mr. Đại chốt): chỉ VIỆC LÁ trên đường găng (nút tổng không đếm), bắt đầu trong cửa sổ giao ${s.cuaSoGiaoNgay ?? 7} ngày tới hoặc đã qua. = việc lá găng − đã có ít nhất một việc treo (kể cả việc đã xong) − đánh dấu “không cần giao” − đã xong theo tiến độ − chưa tới lúc giao.`,
      bang: (
        <>
          {dong("Đầu việc găng (mọi cấp)", s.tongGang ?? 0)}
          {dong("Trong đó việc lá", s.soGangLa ?? 0)}
          {dong("− đã có việc treo", s.soLaCoViec ?? 0)}
          {dong("− đánh dấu không cần giao", s.soLaKhongCan ?? 0)}
          {dong("− đã xong theo tiến độ (100%)", s.soLaDaXong ?? 0)}
          {dong(`− chưa tới lúc giao (bắt đầu sau ${s.ngayCuoiCuaSo ? ngayVN(s.ngayCuoiCuaSo) : "—"})`, s.soLaChuaToiLuc ?? 0)}
          {dong("= Chưa ai giao", <span className="text-red">{s.nutGangChuaGiao ?? 0}</span>)}
        </>
      ),
    },
  };
  const x = noiDung[the];
  return (
    <div className="p-4 text-[12px]" data-gt="cv:phai-nguon">
      <KhaiHuongDan ma="cay-viec-nguon" uuTien={2} />
      <div className="text-[10.5px] uppercase tracking-wider text-text-muted">Nguồn số liệu</div>
      <div className="text-[15px] font-bold text-text">{x.tieu}</div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-text-secondary">{x.cong}</p>
      <table className="mt-2 w-full text-[11.5px]">
        <tbody>{x.bang}</tbody>
      </table>
      <div className="mt-2 text-[10.5px] text-text-muted">nguồn: {x.nguon}</div>
    </div>
  );
}

// ─────────────── Kết quả "🤖 Gán mã ngay" ───────────────
function KhungGan({ tin, loi, so }: { tin: string; loi?: boolean; so: TinhTrangSoViec | undefined }) {
  return (
    <div className="p-4 text-[12px]" data-gt="cv:phai-gan">
      <div className="text-[15px] font-bold text-text">🤖 Gán mã WBS bằng AI</div>
      <div className={`mt-2 text-[12px] ${loi ? "text-yellow" : "text-text"}`}>{tin || "Đang gán… (AI đọc theo lô)"}</div>
      {so?.lanChayGan && (
        <div className="mt-2 text-[11px] text-text-secondary">
          Lần chạy gần nhất ({gioPhut(so.lanChayGan.luc)}): {so.lanChayGan.thongDiep}
        </div>
      )}
      <div className="mt-2 text-[11px] text-text-muted">Máy vẫn tự chạy nền 5 phút một lần. Đề xuất 🤖 hiện chấm vàng trên cây cho tới khi người có quyền duyệt.</div>
    </div>
  );
}

// ─────────────── Một đầu việc WBS + khối ⭕ giao việc ───────────────
function KhungNut({ n, soan, duAnId, duAnTen, duocGiao, mo, onDoi }: { n: NutCay; soan?: number; duAnId: string; duAnTen: string; duocGiao: boolean; mo: (c: Chon) => void; onDoi: () => void }) {
  const trong = n.gang && n.viec.length === 0 && n.con.length === 0;
  // Việc găng chưa tới lúc giao (ngoài cửa sổ N ngày) → ẨN HẲN khối giao (Mr. Đại chốt 04/10 tối, thay chốt "vẫn cho giao sớm")
  const toiLuc = chuaToiLucGiao(n);
  // Việc đã xong ẩn sau chữ xanh, bấm mới mở; số đếm chỉ việc chưa xong (Mr. Đại chốt 05/10). key={n.wbs} → đổi nút là đóng lại
  const conMo = n.viec.filter((v) => !v.daXong);
  const daXong = n.viec.filter((v) => v.daXong);
  const [moXong, setMoXong] = useState(false);
  return (
    <div className="p-4 text-[12px]" data-gt="cv:phai-nut">
      <KhaiHuongDan ma="cay-viec-nut" uuTien={2} />
      <div className="text-[10.5px] uppercase tracking-wider text-text-muted">Đầu việc WBS</div>
      <div className={`text-[15px] font-bold ${n.gang ? "text-red" : "text-text"}`}>
        {n.wbs} {n.ten}
      </div>
      <table className="mt-2 w-full text-[11.5px]">
        <tbody>
          <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Baseline</td><td className="py-1 text-right text-text">{khoangNgay(n.start || null, n.end || null)}</td></tr>
          <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Hoàn thành</td><td className="py-1 text-right text-text">{fmtSo(n.pct)}%</td></tr>
          <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Đường găng</td><td className={`py-1 text-right font-semibold ${n.gang ? "text-red" : "text-text"}`}>{n.gang ? "trên đường găng" : "không"}</td></tr>
          <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Nhà thầu</td><td className="py-1 text-right text-text">{n.nhaThau || "—"}</td></tr>
          <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Việc chưa xong gán vào nút này</td><td className="py-1 text-right font-bold text-text">{conMo.length}</td></tr>
          {n.con.length > 0 && <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Đầu việc con</td><td className="py-1 text-right text-text">{n.con.length}</td></tr>}
        </tbody>
      </table>
      <div className="mt-1 text-[10px] text-text-muted">nguồn: chung.wbs — Agent tiến độ</div>

      {n.viec.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] font-semibold text-text">Việc treo vào nút</span>
            {daXong.length > 0 && <NutViecDaXong so={daXong.length} mo={moXong} onBam={() => setMoXong((x) => !x)} />}
          </div>
          {conMo.map((v) => (
            <DongViec key={v.id} v={v} mo={mo} />
          ))}
          {conMo.length === 0 && !moXong && <div className="py-1 text-[11px] text-text-muted">Không còn việc nào chưa xong.</div>}
          {moXong && daXong.map((v) => <DongViec key={v.id} v={v} mo={mo} />)}
        </div>
      )}
      {trong && !toiLuc && duocGiao && <KhoiGiao n={n} soan={soan} duAnId={duAnId} duAnTen={duAnTen} mo={mo} onDoi={onDoi} />}
      {trong && !toiLuc && !duocGiao && <div className="mt-3 text-[11px] font-semibold text-text">CHƯA AI ĐƯỢC GIAO</div>}
    </div>
  );
}

function KhoiGiao({ n, soan, duAnId, duAnTen, mo, onDoi, toiLuc }: { n: NutCay; soan?: number; duAnId: string; duAnTen: string; mo: (c: Chon) => void; onDoi: () => void; toiLuc?: boolean }) {
  const [pha, setPha] = useState<"dong" | "dang-soan" | "co-de-xuat" | "da-giao" | "khong-can">(n.khongCanGiao ? "khong-can" : "dong");
  const [deXuat, setDeXuat] = useState<DeXuatGiao | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [maMoi, setMaMoi] = useState<string | null>(null);
  // Bấm Sửa → bung ô giao việc NGAY TẠI CHỖ, giống ô dấu + ở Sơ đồ tổ chức, AI điền sẵn mọi ô (Mr. Đại chốt 04/10)
  const [sua, setSua] = useState(false);
  const [fGiao, setFGiao] = useState("");
  const [fTen, setFTen] = useState("");
  const [fKq, setFKq] = useState("");
  const [fHan, setFHan] = useState("");
  const [dangGui, setDangGui] = useState(false);
  const cdDk = useCaiDatDinhKem(sua);
  const [tepKep, setTepKep] = useState<{ id: string; ten: string; kich_thuoc: number }[]>([]);
  const [dangTaiTep, setDangTaiTep] = useState(false);
  const kep = useKepTep({ noi: "giao_viec", cd: cdDk, tep: tepKep, setTep: setTepKep, dangTai: setDangTaiTep });
  const [ds, setDs] = useState<DanhBaGiao | null>(null);
  /** Người nhận chọn ở ô NGOÀI ô trình bày ("loai|id") — AI chọn sẵn, chọn là áp dụng (khuôn chung chốt 04/10 chiều) */
  const [chonNhan, setChonNhan] = useState("");
  // Luật 33 (05/10): agent khác đã soạn việc trùng → câu trùng + nút làm lại kèm van_soan; vanSoan = người đã đọc câu trùng
  const [trung, setTrung] = useState<{ chu: string; nut: string; lamLai: () => void } | null>(null);
  const [vanSoan, setVanSoan] = useState(false);
  const [hoiTrung, setHoiTrung] = useState<string | null>(null);

  const napDs = useCallback(async () => {
    try {
      setDs(await goiApi("/api/cay-viec/soan-giao", { body: { du_an: duAnId, ds_nguoi: true } }));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, [duAnId]);

  const chaySoan = useCallback(async (van = false) => {
    setPha("dang-soan");
    setLoi(null);
    setTrung(null);
    try {
      const j = await goiApi<{ ok: boolean; de_xuat?: DeXuatGiao; thong_diep?: string; trung?: string; hoi_trung?: string | null }>("/api/cay-viec/soan-giao", {
        body: { du_an: duAnId, soan: { ma_wbs: n.wbs, ten: n.ten, han: n.end, ...(van ? { van_soan: true } : {}) } },
      });
      if (j.trung) {
        setTrung({ chu: j.trung, nut: "Vẫn soạn việc riêng", lamLai: () => void chaySoanRef.current(true) });
        setPha("dong");
        return;
      }
      setVanSoan(van);
      setHoiTrung(van ? "Bạn đã chọn vẫn soạn việc riêng dù agent khác đã soạn việc gần giống." : (j.hoi_trung ?? null));
      if (j.ok && j.de_xuat) {
        setDeXuat(j.de_xuat);
        setChonNhan(`${j.de_xuat.loai}|${j.de_xuat.giao_cho}`);
        setPha("co-de-xuat");
        if (!ds) void napDs();
      } else {
        setLoi(j.thong_diep ?? "Chưa soạn được.");
        setPha("dong");
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không gọi được máy chủ của chính agent này.");
      setPha("dong");
    }
  }, [n, duAnId, ds, napDs]);
  const chaySoanRef = useRef(chaySoan);
  chaySoanRef.current = chaySoan;

  // Bấm "🤖 Xem việc AI soạn sẵn" ở cây trái → tự soạn khi mở khung
  useEffect(() => {
    if (soan && !n.khongCanGiao) void chaySoan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soan]);

  const homNay = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
  // Không gửi việc có hạn đã qua (Mr. Đại chốt 04/10 tối): nút găng đã quá ngày xong → bấm Sửa chọn hạn mới
  const hanQua = !!n.end && n.end.slice(0, 10) < homNay;
  const giao = async (van = vanSoan) => {
    if (!deXuat || !chonNhan || hanQua) return;
    const [loaiChon, idChon] = chonNhan.split("|") as ["nguoi" | "don_vi", string];
    const laAiChon = loaiChon === deXuat.loai && idChon === deXuat.giao_cho;
    setTrung(null);
    try {
      const j = await goiApi<{ ok: boolean; ma_viec?: string; trung?: string }>("/api/cay-viec/soan-giao", {
        body: { du_an: duAnId, giao: { ma_wbs: n.wbs, ten: n.ten, han: n.end, giao_cho: idChon, can_cu: laAiChon ? deXuat.can_cu : "✎ người chọn tay", ...(van ? { van_soan: true } : {}) } },
      });
      if (j.trung || !j.ma_viec) {
        if (j.trung) setTrung({ chu: j.trung, nut: "Vẫn giao việc riêng", lamLai: () => void giao(true) });
        return;
      }
      setMaMoi(j.ma_viec);
      setPha("da-giao");
      onDoi();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Chưa giao được.");
    }
  };

  const moSua = async () => {
    if (!deXuat) return;
    setLoi(null);
    setFGiao(chonNhan || `${deXuat.loai}|${deXuat.giao_cho}`);
    setFTen(`[${duAnTen}] Xử lý ${n.wbs} — ${n.ten}`);
    setFKq(ketQuaMacDinhGang(n.wbs, n.ten, deXuat.can_cu));
    setFHan(n.end && !hanQua ? n.end.slice(0, 10) : "");
    setTepKep([]);
    setSua(true);
    if (!ds) await napDs();
  };

  const thieuSua = !fTen.trim() ? "Chưa có nội dung việc" : !fGiao ? "Chưa chọn người nhận" : !fHan ? "Chưa có hạn" : fHan < homNay ? "Hạn đã qua — chọn từ hôm nay trở đi" : "";
  const giaoSua = async (van = vanSoan) => {
    if (!deXuat || thieuSua) return;
    const [loai, id] = fGiao.split("|") as ["nguoi" | "don_vi", string];
    setDangGui(true);
    setLoi(null);
    setTrung(null);
    try {
      const j = await goiApi<{ ok: boolean; ma_viec?: string; trung?: string }>("/api/cay-viec/soan-giao", {
        body: {
          du_an: duAnId,
          giao: {
            ma_wbs: n.wbs,
            ten: n.ten,
            han: fHan || null,
            giao_cho: id,
            can_cu: loai === deXuat.loai && id === deXuat.giao_cho ? deXuat.can_cu : "✎ người chọn tay",
            ten_day_du: fTen.trim(),
            ket_qua: fKq.trim(),
            dinh_kem: tepKep.map((t) => t.id),
            ...(van ? { van_soan: true } : {}),
          },
        },
      });
      if (j.trung || !j.ma_viec) {
        if (j.trung) setTrung({ chu: j.trung, nut: "Vẫn giao việc riêng", lamLai: () => void giaoSua(true) });
        return;
      }
      setMaMoi(j.ma_viec);
      setSua(false);
      setPha("da-giao");
      onDoi();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Chưa giao được.");
    } finally {
      setDangGui(false);
    }
  };

  const khongCan = async (bo: boolean) => {
    setLoi(null);
    try {
      await goiApi("/api/cay-viec/khong-can-giao", { body: { du_an: duAnId, wbs: n.wbs, ...(bo ? { bo: true } : {}) } });
      setPha(bo ? "dong" : "khong-can");
      onDoi();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không gọi được máy chủ app.");
    }
  };

  return (
    <div className="mt-3 border-t border-border pt-3" data-gt="cv:khoi-giao">
      {toiLuc ? (
        <div className="text-[11.5px] font-semibold text-text-muted">
          CHƯA TỚI LÚC GIAO — bắt đầu {n.start ? ngayVN(n.start) : "—"}
          {n.conNgay !== null ? ` · còn ${n.conNgay} ngày` : ""}
          <div className="mt-0.5 text-[10.5px] font-normal">Ngoài cửa sổ giao (Cài đặt › Gắn việc vào WBS) nên không đếm đỏ; cần giao sớm thì vẫn bấm dưới đây.</div>
        </div>
      ) : (
        <div className="text-[11.5px] font-semibold text-red">⭕ CHƯA AI ĐƯỢC GIAO</div>
      )}
      {loi && <div className="mt-1 text-[11px] text-yellow">{loi}</div>}
      {trung && (
        <div className="mt-1.5 text-[11px] text-text-secondary" data-gt="cv:trung-viec">
          🤖 {trung.chu}
          <div className="mt-1">
            <button type="button" data-lenh="cay-viec.van-soan-rieng" onClick={trung.lamLai} className="rounded-sm border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent">
              {trung.nut}
            </button>
          </div>
        </div>
      )}
      {pha === "dong" && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <button type="button" data-lenh="cay-viec.soan-giao" data-gt="cv:xem-ai-soan" onClick={() => void chaySoan(false)} className="rounded-sm border border-accent px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent hover:text-white">
            🤖 Xem việc AI soạn sẵn
          </button>
          <button type="button" data-lenh="cay-viec.khong-can-giao" data-gt="cv:khong-can-giao" onClick={() => void khongCan(false)} className="rounded-sm border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent">
            Việc này không cần giao trong agent Công việc
          </button>
        </div>
      )}
      {pha === "khong-can" && (
        <div className="mt-1.5 text-[11px] text-text-secondary">
          Đã đánh dấu <b className="text-text">{n.wbs} {tenNgan(n.ten)}</b> — không cần giao trong agent Công việc, thôi không tính vào “nút găng chưa ai giao”.{" "}
          <button type="button" data-lenh="cay-viec.bo-khong-can-giao" data-gt="cv:bo-khong-can-giao" onClick={() => void khongCan(true)} className="font-semibold text-accent underline hover:text-accent-hover">
            Bỏ đánh dấu
          </button>{" "}
          nếu đánh nhầm.
        </div>
      )}
      {pha === "dang-soan" && <div className="mt-1.5 text-[11px] text-text-muted">🤖 Đang rà lịch sử xem loại việc này thường ai làm…</div>}
      {pha === "co-de-xuat" && deXuat && (
        <div className="mt-2 rounded-sm border border-border bg-bg px-3 py-2.5 text-[11.5px] leading-relaxed" data-gt="cv:de-xuat-giao">
          {sua ? (
            // Ô giao việc giống ô dấu + ở Sơ đồ tổ chức (lớp form-giao), AI điền sẵn — người sửa rồi bấm Giao việc (Mr. Đại chốt 04/10)
            <OGiaoSua
              tieuDe="🤖 AI đã điền sẵn — sửa rồi bấm Giao việc"
              ds={ds}
              tenGoiY={deXuat.ten_day_du || deXuat.giao_cho}
              fGiao={fGiao}
              setFGiao={setFGiao}
              duAnTen={deXuat.du_an_ten || duAnTen}
              fTen={fTen}
              setFTen={setFTen}
              fKq={fKq}
              setFKq={setFKq}
              fHan={fHan}
              setFHan={setFHan}
              kep={kep}
              homNay={homNay}
              thieu={thieuSua}
              dangGui={dangGui}
              dangTaiTep={dangTaiTep}
              onGiao={() => void giaoSua()}
              onHuy={() => setSua(false)}
              lenh="cay-viec.giao-viec-da-sua"
              gt="cv"
            />
          ) : (
            <>
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wider text-accent">🤖 AI soạn sẵn — chưa gửi đi đâu cả</div>
            <div><b className="text-text">Tên việc:</b> <span className="text-text-secondary">[{duAnTen}] Xử lý {n.wbs} — {n.ten}</span></div>
            <div>
              <b className="text-text">Giao cho:</b> <b className="text-text">{deXuat.ten_day_du || deXuat.giao_cho}</b>
              <span className="text-text-muted"> ({deXuat.loai === "don_vi" ? "đơn vị" : deXuat.giao_cho})</span> — <i className="text-text-secondary">{deXuat.can_cu}</i>
            </div>
            <div><b className="text-text">Thuộc dự án:</b> <span className="text-text-secondary">{deXuat.du_an_ten}</span></div>
            <div><b className="text-text">Hạn:</b> <span className="text-text-secondary">ngày xong theo tiến độ — <b className="text-text">{n.end ? ngayVN(n.end) : "—"}</b></span></div>
            <div className="line-clamp-2"><b className="text-text">Kết quả cần có:</b> <span className="text-text-secondary">{ketQuaMacDinhGang(n.wbs, n.ten)}</span></div>
            </>
          )}
        </div>
      )}
      {pha === "co-de-xuat" && deXuat && !sua && (
        <>
            {/* Ngoài ô trình bày: chọn người nhận + Giao việc · Sửa · Bỏ qua (khuôn chung mọi màn — Mr. Đại chốt 04/10 chiều) */}
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <OChonNoiNhan
                className="flex-1"
                ds={ds}
                loiDs={ds ? null : deXuat.ten_day_du || deXuat.giao_cho}
                value={chonNhan}
                onChange={setChonNhan}
                giaTri="loai|id"
              />
              <button type="button" data-lenh="cay-viec.giao-viec" data-gt="cv:giao-viec" disabled={!chonNhan || hanQua} title={hanQua ? "Hạn đã qua — bấm Sửa chọn hạn mới" : undefined} onClick={() => void giao()} className="rounded-sm border border-accent bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                Giao việc
              </button>
              <button type="button" onClick={() => void moSua()} data-gt="cv:sua-de-xuat" className="rounded-sm border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent">
                Sửa
              </button>
              <button type="button" onClick={() => (setPha("dong"), setDeXuat(null), setSua(false))} data-gt="cv:bo-qua-de-xuat" className="rounded-sm border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent">
                Bỏ qua
              </button>
            </div>
            {hanQua && <div className="mt-1 text-[11px] text-red">Hạn {ngayVN(n.end)} đã qua — bấm Sửa chọn hạn mới rồi mới giao được.</div>}
            {hoiTrung && <div className="mt-1.5 text-[10px] text-text-muted">Hỏi trùng (luật 33): {hoiTrung}</div>}
            <div className="mt-1.5 text-[10px] text-text-muted">Chốt an toàn: <b>AI không tự ghi</b> — chỉ cú bấm Giao việc của người mới tạo việc trong sổ cái, có ghi lịch sử ai bấm, lúc nào.</div>
        </>
      )}
      {pha === "da-giao" && (
        <div className="mt-1.5 text-[11.5px] font-semibold text-green">
          ✓ Đã tạo việc{" "}
          {maMoi && (
            <button type="button" onClick={() => mo({ loai: "viec", id: maMoi })} data-gt="cv:da-tao-viec" className="underline">
              {maMoi}
            </button>
          )}{" "}
          trong sổ cái — cây bên trái đã đọc lại.
        </div>
      )}
    </div>
  );
}

// ─────────────── Chi tiết một việc (sổ cái) + mã WBS ───────────────
type ChiTiet = { viec: CongViec & { phan_viec: PhanViec[] }; ten_nguoi: Record<string, string> };
const TRANG_THAI: Record<string, string> = { dang_mo: "đang mở", hoan_thanh: "hoàn thành", da_dong: "đã đóng" };

function KhungViec({ id, v, nut, phang, mo, onDoi }: { id: string; v: ViecCay | null; nut: NutCay | null; phang: NutCay[]; mo: (c: Chon) => void; onDoi: () => void }) {
  const [ct, setCt] = useState<ChiTiet | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tin, setTin] = useState<string | null>(null);
  useEffect(() => {
    goiApi<ChiTiet>(`/api/cong-viec/${encodeURIComponent(id)}`)
      .then(setCt)
      .catch((e) => setLoi(e instanceof Error ? e.message : String(e)));
  }, [id]);

  const gui = async (body: unknown, xong: string) => {
    setTin(null);
    try {
      await goiApi("/api/cay-viec/gan-wbs", { body });
      setTin(xong);
      onDoi();
    } catch (e) {
      setTin(e instanceof Error ? e.message : String(e));
    }
  };

  const w = ct?.viec;
  const tenWbs = (ma: string | null) => (ma ? `${ma} ${tenNgan(phang.find((x) => x.wbs === ma)?.ten ?? "")}`.trim() : "Không thuộc đầu việc nào");
  const dc = v ? chuDoChac(v) : null;
  return (
    <div className="p-4 text-[12px]" data-gt="cv:phai-viec">
      <KhaiHuongDan ma="cay-viec-viec" uuTien={2} />
      <div className="text-[10.5px] uppercase tracking-wider text-text-muted">Việc trong sổ · {id}</div>
      <div className="text-[15px] font-bold text-text">{w?.ten ?? v?.ten ?? id}</div>
      {loi && <div className="mt-1 text-[11px] text-yellow">{loi}</div>}
      {v && (
        <div className="mt-1 flex flex-wrap gap-x-1.5 text-[11px]">
          {nhanTrangThai(v).map(([chu, mau]) => (
            <span key={chu} className={`font-semibold ${mau}`}>{chu}</span>
          ))}
        </div>
      )}
      {w && (
        <table className="mt-2 w-full text-[11.5px]">
          <tbody>
            <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Trạng thái</td><td className="py-1 text-right text-text">{TRANG_THAI[w.trang_thai] ?? w.trang_thai}</td></tr>
            <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Thời gian</td><td className="py-1 text-right text-text">{w.luon_mo ? "việc luôn mở" : khoangNgay(w.bat_dau, w.ket_thuc)}</td></tr>
            <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Dự án</td><td className="py-1 text-right text-text">{w.du_an ?? "—"}</td></tr>
            <tr className="border-b border-border-light"><td className="py-1 pr-2 text-text-secondary">Người giao</td><td className="py-1 text-right text-text">{w.giao_boi ? (ct.ten_nguoi[w.giao_boi] ?? w.giao_boi) : "từ báo cáo / tài liệu"}</td></tr>
          </tbody>
        </table>
      )}
      {w?.ket_qua_can_co && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold text-text">Kết quả cần có</div>
          <div className="whitespace-pre-wrap text-[11.5px] text-text-secondary">{w.ket_qua_can_co}</div>
        </div>
      )}
      {w && w.phan_viec.length > 0 && (
        <div className="mt-2">
          <div className="text-[11px] font-semibold text-text">Phần việc</div>
          {w.phan_viec.filter((p) => !(p as PhanViec & { da_bo?: boolean }).da_bo).map((p) => (
            <div key={p.id} className="flex flex-wrap items-baseline gap-x-2 border-b border-border-light py-1 text-[11.5px]">
              <span className="font-semibold text-text">{p.phu_trach_ten ?? p.phu_trach_id}</span>
              <span className="text-text-muted">{p.vai === "chu_tri" ? "chủ trì" : "phối hợp"}</span>
              <span className={p.trang_thai === "da_ket_thuc" ? "text-green" : "text-text-secondary"}>{p.trang_thai === "da_ket_thuc" ? "đã xong" : "đang làm"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mã WBS — 🤖 AI đề xuất, người duyệt / đổi (một cú chọn là áp dụng) */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="text-[11.5px] font-semibold text-text">Mã WBS</div>
        {v ? (
          <>
            <div className="mt-0.5 text-[12px] text-text">
              {v.duongGanMa ? tenWbs(v.maWbs) : <span className="text-text-muted">chưa xét — 🤖 AI đọc ở lượt gán tới</span>}
              {v.aiGanChuaSoat && <span className="ml-1 text-yellow">● chờ duyệt</span>}
            </div>
            <div className="text-[11px] text-text-secondary">
              {v.duongGanMa === "ai" ? (v.aiGanChuaSoat ? "🤖 AI đề xuất" : "🤖 AI đề xuất — đã duyệt") : v.duongGanMa === "nguoi" ? "người gắn" : ""}
              {dc && <span className={`ml-1 font-semibold ${dc.mau}`}>· {dc.chu}</span>}
            </div>
            {v.canCuGan && <div className="mt-0.5 text-[11px] text-text-muted">{v.canCuGan}</div>}
            {nut && (
              <button type="button" onClick={() => mo({ loai: "nut", wbs: nut.wbs })} data-gt="cv:xem-dau-viec" className="mt-1 text-[11px] text-accent underline decoration-dotted">
                Xem đầu việc {nut.wbs} {tenNgan(nut.ten)}
              </button>
            )}
            {v.duyetDuoc && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {v.aiGanChuaSoat && (
                  <button type="button" onClick={() => void gui({ duyet: v.id }, `Đã duyệt mã WBS cho ${v.id}`)} data-gt="cv:duyet-ma" className="rounded-sm border border-accent bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:opacity-90" title="Giữ nguyên mã AI đề xuất">
                    Duyệt
                  </button>
                )}
                <select
                  className={`${LOP_CHON} min-w-0 flex-1`}
                  data-gt="cv:doi-ma"
                  value=""
                  onChange={(e) => e.target.value && void gui({ sua: { cong_viec_id: v.id, ma: e.target.value === "__khong" ? null : e.target.value } }, `Đã đổi mã WBS cho ${v.id}`)}
                  title="✎ Chọn là áp dụng ngay — người thắng, AI không gắn đè"
                >
                  <option value="">✎ Đổi sang mã khác…</option>
                  <option value="__khong">Không thuộc đầu việc nào</option>
                  {phang.map((x) => (
                    <option key={x.wbs} value={x.wbs}>{x.wbs} {x.ten}</option>
                  ))}
                </select>
              </div>
            )}
            {tin && <div className="mt-1 text-[11px] text-text-secondary">{tin}</div>}
          </>
        ) : (
          <div className="text-[11px] text-text-muted">Việc này không nằm trong danh sách đang hiện (có thể đã đóng hoặc ngoài dự án).</div>
        )}
      </div>
    </div>
  );
}
