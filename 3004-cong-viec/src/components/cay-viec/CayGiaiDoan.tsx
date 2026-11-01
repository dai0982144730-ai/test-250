"use client";
// ============================================================
// CÂY TIẾN ĐỘ — VIỆC TREO THEO TỪNG NÚT (chép CayGiaiDoan của agent Base, demo `v-theoduan` là thước). Danh mục khối:
//   ① thanh lọc: chọn giai đoạn · 🔴 việc găng · 👤 việc găng đã giao · ⭕ việc găng chưa giao ·
//      🤖 Duyệt gán mã công việc (bấm → thay cây bằng danh sách việc 🤖 đề xuất mã còn chờ duyệt — Mr. Đại chốt 05/10, cách A;
//      đổi tên 07/10) · nút "🤔 Mã AI (dưới 70%)" BỎ 07/10 (Mr. Đại) — chữ "nghi · chắc N%" trên dòng việc vẫn giữ ·
//      ô tìm · Bung hết · Thu hết
//   ② dòng chú nguồn ghi GIỜ LẤY (đường găng đổi liên tục)
//   ③ dòng tóm tắt: đang hiện N nút · cây gốc X đầu việc / Y giai đoạn · Z găng · việc treo được
//   ④ dòng nút: mã · tên (đỏ đậm nếu găng) · ▸ N việc đã xong (chữ xanh, bấm mới mở) · CHƯA AI ĐƯỢC GIAO · ngày · nhà thầu · % ·
//      N việc (CHỈ việc chưa xong) · ⏳ nằm im lâu nhất ở bàn ai
//   ⑤ việc dưới nút: ✓ · tên · 🤖●✎ (+ Duyệt) · độ chắc · nhãn trạng thái · hạn · người — bấm cả dòng mở chi tiết ở CỘT PHẢI.
//      Việc ĐÃ XONG ẩn sau chữ "▸ N việc đã xong" — tên chữ xanh + "Xong ngày dd/mm/yyyy" như khối Việc làm xong ở Sơ đồ tổ
//      chức; luôn đóng khi mở trang, chỉ mở khi bấm (Mr. Đại chốt 05/10: suốt vòng đời dự án việc xong lên hàng nghìn dòng)
//   ⑥ nút găng trống → khối ⭕: 🤖 Xem việc AI soạn sẵn · Việc này không cần giao trong agent Công việc
//   ⑦ chú giải cuối cây
// Nguồn việc = sổ cái agent Công việc. Nút không có quyền thì ẨN (luật riêng 3004 — Base làm mờ).
// LUẬT MÀU: đỏ chỉ cho thứ sinh issue (găng, chưa ai giao, nằm im ≥ ngưỡng). Chữ thuần không viền/nền (luật 28).
// ============================================================
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, UserX } from "lucide-react";
import { goiApi, LOP_O_NHAP } from "@/components/layout/giao-dien";
import { chuaAiGiao, type NutCay, type ViecCay } from "@/lib/cay-viec/thuan";
import { fmtSo } from "@/lib/format";
import { TheIssue } from "./issue/IssueView";
import { KhoiViecIssue, coKhoiViec } from "./issue/KhoiViecIssue";
import type { IssueGang } from "./issue/dung-issue-gang";
import type { Chon } from "./chon";

/** Ngưỡng "nằm im" tô đỏ — cùng số mặc định bên Base (7 ngày) */
const NGUONG_IM = 7;
/** Mã AI gán có độ chắc dưới mức này là "nghi" — cùng số NGUONG_NGHI ở lib/gan-wbs/thuan */
const NGUONG_NGHI = 0.7;
/** Ô chọn: lớp ô nhập chung của app (Mr. Đại bắt lỗi <select> nền đen chữ đen ở bản cũ) — bỏ w-full để nằm trên một hàng */
const LOP_CHON = `${LOP_O_NHAP.replace("w-full ", "")} w-auto max-w-[280px] !py-1 !text-[11.5px]`;

/** Việc AI gán mà độ chắc < 0,7 (chữ "nghi" trên màn) */
export function laViecNghi(v: ViecCay): boolean {
  return v.duongGanMa === "ai" && typeof v.doChacGan === "number" && v.doChacGan < NGUONG_NGHI;
}
/** Việc có mã WBS do 🤖 AI đề xuất (đã duyệt / AI tự duyệt — cây chỉ treo mã đã duyệt), mọi độ chắc — nút lọc thứ 5 (Mr. Đại 05/10) */

/** Chữ độ chắc — CHỮ THUẦN, không viền (luật 28). null khi không phải đường AI */
export function chuDoChac(v: ViecCay): { chu: string; mau: string } | null {
  if (v.duongGanMa !== "ai") return null;
  if (typeof v.doChacGan !== "number") return { chu: "chưa đo độ chắc", mau: "text-text-muted" };
  if (v.doChacGan < NGUONG_NGHI) return { chu: `nghi · chắc ${Math.round(v.doChacGan * 100)}%`, mau: "text-yellow" };
  return { chu: `chắc ${Math.round(v.doChacGan * 100)}%`, mau: "text-text-muted" };
}

function coGang(n: NutCay): boolean {
  return n.gang || n.con.some(coGang);
}
/** "Chưa ai giao" = việc LÁ găng đến lúc giao (cửa sổ N ngày), 0 việc treo — định nghĩa chung chuaAiGiao (thuan.ts, khớp thẻ ④) */
function coTrong(n: NutCay): boolean {
  return chuaAiGiao(n) || n.con.some(coTrong);
}
/** Nút găng ĐÃ có người nhận — mặt kia của "chưa ai giao" (Mr. Đại chốt 10/09) */
function daGiao(n: NutCay): boolean {
  return n.gang && n.viec.length > 0;
}
function coDaGiao(n: NutCay): boolean {
  return daGiao(n) || n.con.some(coDaGiao);
}
function khopTim(n: NutCay, tim: string): boolean {
  if (tim === "") return true;
  const t = tim.toLowerCase();
  return n.ten.toLowerCase().includes(t) || n.wbs.includes(t) || n.viec.some((v) => v.ten.toLowerCase().includes(t)) || n.con.some((c) => khopTim(c, tim));
}
function demGang(n: NutCay): number {
  return (n.gang ? 1 : 0) + n.con.reduce((c, x) => c + demGang(x), 0);
}
/** Số việc CHƯA XONG của cả nhánh (Mr. Đại chốt 05/10: số đếm chỉ tính việc chưa xong) */
function demViec(n: NutCay): number {
  return n.viec.filter((v) => !v.daXong).length + n.con.reduce((c, x) => c + demViec(x), 0);
}
/** dd/mm/yyyy đủ năm — dòng "Xong ngày …" giống Sơ đồ tổ chức */
function ngayDu(iso: string): string {
  const [n, t, ng] = iso.slice(0, 10).split("-");
  return ng && t && n ? `${ng}/${t}/${n}` : iso;
}
function ngayVN(iso: string): string {
  const [n, t, ng] = iso.slice(0, 10).split("-");
  return ng && t && n ? `${ng}/${t}/${n.slice(2)}` : iso;
}

/** ⏳ việc nằm im lâu nhất dưới nút — báo ngay trên dòng nút (chốt khuya 5 bên Base) */
function imLauNhat(n: NutCay): { ngay: number; ai: string } | null {
  let max = 0;
  let ai = "";
  for (const v of n.viec) {
    if (!v.daXong && (v.namImNgay ?? 0) > max) {
      max = v.namImNgay ?? 0;
      ai = v.tenNguoi || v.nguoiPhuTrach;
    }
  }
  return max >= NGUONG_IM ? { ngay: max, ai } : null;
}

interface ChungNhanh {
  /** Mở nội dung ở cột phải */
  mo: (c: Chon) => void;
  /** Khoá thứ đang mở ở cột phải — tô nền dòng đang chọn */
  chonKhoa: string;
  duAnId: string;
  duocGiao: boolean;
  /** Đọc lại dữ liệu màn sau khi đánh dấu */
  onDoi: () => void;
  /** Nút WBS đang mở danh sách việc đã xong — không nhớ, mở trang là đóng hết */
  moXong?: Set<string>;
  doiMoXong?: (wbs: string) => void;
  /** Thẻ issue găng + khối "AI soạn sẵn" hiện ngay dưới dòng CHƯA AI ĐƯỢC GIAO (Mr. Đại chốt 06/10) */
  issueGang?: IssueGang;
}

/** Mã WBS → tên đầu việc (luật 30: mã luôn kèm tên) */
function tenTheoWbs(cay: NutCay[]): Map<string, string> {
  const m = new Map<string, string>();
  const di = (ds: NutCay[]) => ds.forEach((n) => (m.set(n.wbs, n.ten), di(n.con)));
  di(cay);
  return m;
}

/** Một việc 🤖 đề xuất mã còn chờ duyệt — bấm cả dòng mở khung phải (nơi có Duyệt / đổi mã) */
function DongChoDuyet({ v, tenWbs, mo, dangChon }: { v: ViecCay; tenWbs: string; mo: (c: Chon) => void; dangChon: boolean }) {
  const dc = chuDoChac(v);
  return (
    <button
      type="button"
      data-lenh="cay-viec.xem-viec"
      data-gt="cv:dong-cho-duyet"
      data-gia-tri={v.ten}
      onClick={() => mo({ loai: "viec", id: v.id })}
      className={`flex w-full items-start gap-2 border-b border-border-light/60 px-2 py-1.5 text-left last:border-b-0 ${dangChon ? "bg-accent-soft" : "hover:bg-bg2"}`}
    >
      <div className="min-w-0 flex-1">
        <div className={`text-[12.5px] font-semibold ${v.daXong ? "text-[var(--p-ok-dam)]" : "text-text"}`}>{v.ten}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-text-muted">
          <span>
            🤖 đề xuất <b className="text-text">{v.maWbs}</b> {tenWbs}
          </span>
          {dc && <span className={`font-semibold ${dc.mau}`}>{dc.chu}</span>}
          {v.daXong && <span className="font-semibold text-[var(--p-ok-dam)]">đã xong</span>}
          <span>{v.id}</span>
        </div>
      </div>
    </button>
  );
}

/** Chữ xanh "▸ N việc đã xong" — BẤM mới mở danh sách việc đã xong, không bao giờ tự mở (Mr. Đại chốt 05/10) */
export function NutViecDaXong({ so, mo, onBam }: { so: number; mo: boolean; onBam: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onBam();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      data-lenh="cay-viec.viec-da-xong"
      data-gt="cv:viec-da-xong"
      aria-expanded={mo}
      title={mo ? "Đóng danh sách việc đã xong" : "Bấm để xem việc đã xong của đầu việc này"}
      className="text-[11px] font-semibold text-[var(--p-ok-dam)] hover:underline"
    >
      {mo ? "▾" : "▸"} {so} việc đã xong
    </button>
  );
}

export function CayGiaiDoan({
  cay,
  nguonDong,
  viecChoDuyet = [],
  ...chung
}: {
  cay: NutCay[];
  /** Dòng chú nguồn kèm GIỜ LẤY — dựng sẵn ở CayViecView */
  nguonDong: string;
  /** Việc 🤖 đề xuất mã WBS còn chờ duyệt (chưa treo lên cây — chốt 03/10) */
  viecChoDuyet?: ViecCay[];
} & ChungNhanh) {
  const [giaiDoan, setGiaiDoan] = useState("");
  // 4 nút lọc: CHỈ BẬT MỘT — chọn nút này thì nút kia tắt, bấm lại nút đang bật thì về xem tất cả (Mr. Đại chốt 04/10 chiều)
  const [loc, setLoc] = useState<"" | "gang" | "trong" | "da-giao" | "cho-duyet">("");
  const chiGang = loc === "gang";
  const chiTrong = loc === "trong";
  const chiDaGiao = loc === "da-giao";
  // "🤖 Chờ duyệt" (Mr. Đại chốt 05/10, cách A): việc chờ duyệt CHƯA treo lên cây → bấm thì thay cây bằng danh sách của chúng
  const chiChoDuyet = loc === "cho-duyet";
  const doiLoc = (k: "gang" | "trong" | "da-giao" | "cho-duyet") => setLoc((c) => (c === k ? "" : k));
  const [tim, setTim] = useState("");
  // Dòng nguồn + chú giải gộp một chỗ, mặc định ẨN — chỉ chữ "Xem thêm" (Mr. Đại chốt 04/10)
  const [xemThem, setXemThem] = useState(false);
  const [mo, setMo] = useState<Set<string>>(new Set());
  // Danh sách việc đã xong mở theo từng nút WBS — luôn đóng khi mở trang, không nhớ (Mr. Đại chốt 05/10)
  const [moXong, setMoXong] = useState<Set<string>>(new Set());
  const doiMoXong = (wbs: string) =>
    setMoXong((cu) => {
      const m = new Set(cu);
      if (m.has(wbs)) m.delete(wbs);
      else m.add(wbs);
      return m;
    });

  const dsLoc = useMemo(() => {
    const loc = (nut: NutCay[]): NutCay[] =>
      nut
        .filter((n) => (!chiGang || coGang(n)) && (!chiTrong || coTrong(n)) && (!chiDaGiao || coDaGiao(n)) && khopTim(n, tim))
        .map((n) => ({ ...n, con: loc(n.con) }));
    return loc(giaiDoan === "" ? cay : cay.filter((g) => g.wbs === giaiDoan));
  }, [cay, giaiDoan, chiGang, chiTrong, chiDaGiao, tim]);
  const tenWbs = useMemo(() => tenTheoWbs(cay), [cay]);
  const dsChoDuyet = useMemo(() => {
    const t = tim.trim().toLowerCase();
    return viecChoDuyet.filter((v) => !t || v.ten.toLowerCase().includes(t) || (v.maWbs ?? "").includes(t));
  }, [viecChoDuyet, tim]);

  // Đang lọc thì mở hết cho thấy kết quả; không lọc thì theo tay người bấm
  const dangLoc = chiGang || chiTrong || chiDaGiao || tim !== "";

  const doiMo = (wbs: string) =>
    setMo((cu) => {
      const m = new Set(cu);
      if (m.has(wbs)) m.delete(wbs);
      else m.add(wbs);
      return m;
    });

  if (cay.length === 0) return null;

  // Nút lọc đang BẬT = viền cam bao quanh, giống nút "Dự án" đang chọn trên thanh trên (phong.css `.menu a.dang`) —
  // Mr. Đại chốt 04/10. Năm nút chia đều bề ngang một hàng (nút 🤖 AI đề xuất thêm 05/10).
  const lopLoc = (bat: boolean) =>
    `flex items-center justify-center rounded-md border px-2 py-1 text-center text-[11px] font-semibold leading-tight transition ${
      bat
        ? "border-[var(--p-cam)] text-accent shadow-[inset_0_0_0_1px_var(--p-cam)]"
        : "border-border text-text-secondary hover:border-[var(--p-cam)] hover:text-accent"
    }`;

  return (
    <div className="rounded border border-border bg-surface" data-gt="cv:cay">
      <div className="border-b border-border px-4 py-2.5">
        <div className="text-[13px] font-bold text-text">Cây tiến độ dự án — thể hiện dạng công việc</div>
        {/* Dòng tóm tắt "Đang hiện … nút · cây gốc …" đã xoá (Mr. Đại 04/10) — số đã có ở 4 thẻ đầu màn.
            Nguồn kèm giờ lấy + chú giải gộp MỘT chỗ, mặc định chỉ hiện chữ "Xem thêm" (Mr. Đại chốt 04/10) */}
        <button
          type="button"
          onClick={() => setXemThem((x) => !x)}
          data-gt="cv:cay-xem-them"
          className="mt-0.5 text-[10.5px] font-semibold text-text-muted underline decoration-dotted underline-offset-2 hover:text-accent"
        >
          {xemThem ? "Thu gọn" : "Xem thêm"}
        </button>
        {xemThem && (
          <div className="mt-1 space-y-0.5 text-[10.5px] text-text-muted" data-gt="cv:cay-nguon">
            <div>{nguonDong}</div>
            <div>
              <b className="text-red">tên việc đỏ đậm</b> nằm trên đường găng — thừa hưởng từ Agent tiến độ
            </div>
            <div>
              <b className="text-text">n việc</b> số việc trong sổ gắn được vào nút (tầng A)
            </div>
            <div>
              <span className="font-bold text-red">⭕ chưa ai giao</span> nút găng mà sổ việc trống
            </div>
            <div>🤖 mã do AI gắn, đã duyệt — mã 🤖 chưa duyệt chưa treo lên cây, nằm ở danh sách “🤖 Gán mã WBS bằng AI”</div>
            <div>
              <b className="text-yellow">nghi</b> AI tự chấm độ chắc dưới 70% · <span className="text-text-muted">chưa đo độ chắc</span> = AI không chấm độ
              chắc cho dòng này
            </div>
          </div>
        )}
      </div>

      {/* ① thanh lọc — HAI hàng (Mr. Đại chốt 04/10): trên = chọn giai đoạn · ô tìm · Bung hết · Thu hết (không xuống dòng,
          ô tìm co lại); dưới = 4 nút lọc chia đều bề ngang */}
      <div className="space-y-2 border-b border-border px-4 py-2.5">
        <div className="flex flex-nowrap items-center gap-2">
          <select value={giaiDoan} onChange={(e) => setGiaiDoan(e.target.value)} data-lenh="cay-viec.giai-doan" data-gt="cv:loc-giai-doan" className={`${LOP_CHON} w-[42%] min-w-0 shrink`}>
            <option value="">Tất cả {cay.length} giai đoạn</option>
            {cay.map((g) => (
              <option key={g.wbs} value={g.wbs}>
                {g.wbs} · {g.ten}
              </option>
            ))}
          </select>
          <input
            value={tim}
            onChange={(e) => setTim(e.target.value)}
            placeholder="Tìm đầu việc, mã WBS, tên việc…"
            data-gt="cv:tim"
            className={`${LOP_O_NHAP.replace("w-full ", "")} w-0 min-w-0 flex-1 !py-1 !text-[11.5px]`}
          />
          <button
            type="button"
            onClick={() => setMo(new Set(cay.map((g) => g.wbs)))}
            data-gt="cv:bung-het"
            className="shrink-0 whitespace-nowrap rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
          >
            Bung hết
          </button>
          <button
            type="button"
            onClick={() => setMo(new Set())}
            data-gt="cv:thu-het"
            className="shrink-0 whitespace-nowrap rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
          >
            Thu hết
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <button type="button" onClick={() => doiLoc("gang")} data-lenh="cay-viec.chi-gang" data-gt="cv:loc-gang" aria-pressed={chiGang} className={lopLoc(chiGang)}>
            🔴 Việc găng
          </button>
          {/* "Việc găng đã giao" đứng ngay cạnh "Việc găng" — hai mặt của cùng một câu hỏi (Mr. Đại chốt 10/09).
              Tên 4 nút đổi 05/10 (Mr. Đại gật): Việc găng → đã giao / chưa giao; nút 4 nói rõ nghi là nghi MÃ AI gắn */}
          <button type="button" onClick={() => doiLoc("da-giao")} data-lenh="cay-viec.chi-da-giao" data-gt="cv:loc-da-giao" aria-pressed={chiDaGiao} className={lopLoc(chiDaGiao)}>
            👤 Việc găng đã giao
          </button>
          <button type="button" onClick={() => doiLoc("trong")} data-lenh="cay-viec.chi-trong" data-gt="cv:loc-chua-giao" aria-pressed={chiTrong} className={lopLoc(chiTrong)}>
            ⭕ Việc găng chưa giao
          </button>
          <button type="button" onClick={() => doiLoc("cho-duyet")} data-lenh="cay-viec.chi-cho-duyet" data-gt="cv:loc-cho-duyet" aria-pressed={chiChoDuyet} className={lopLoc(chiChoDuyet)}>
            🤖 Duyệt gán mã công việc
          </button>
        </div>
      </div>

      {chiChoDuyet ? (
        <div className="px-2 py-1.5" data-gt="cv:ds-cho-duyet">
          {dsChoDuyet.length === 0 ? (
            <div className="px-2 py-3 text-[12px] text-text-muted">Không có việc nào chờ duyệt mã WBS.</div>
          ) : (
            dsChoDuyet.map((v) => (
              <DongChoDuyet key={v.id} v={v} tenWbs={(v.maWbs && tenWbs.get(v.maWbs)) || ""} mo={chung.mo} dangChon={chung.chonKhoa === `viec:${v.id}`} />
            ))
          )}
        </div>
      ) : dsLoc.length === 0 ? (
        <div className="px-4 py-5 text-[12px] text-text-muted">Không giai đoạn nào khớp bộ lọc — nới bớt một điều kiện.</div>
      ) : (
        <div className="px-2 py-1.5">
          {dsLoc.map((g) => {
            const soGang = demGang(g);
            const dangMo = dangLoc || mo.has(g.wbs);
            return (
              <div key={g.wbs}>
                <button type="button" onClick={() => doiMo(g.wbs)} data-gt="cv:dong-giai-doan" className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition hover:bg-bg2">
                  {dangMo ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-muted" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />}
                  <code className="text-[11.5px] text-accent">{g.wbs}</code>
                  <span className="text-[12.5px] font-bold text-text">{g.ten}</span>
                  {/* Số đếm — CHỮ THUẦN, bấm không ra gì nên không khoanh viền (luật 28) */}
                  {soGang > 0 && <span className="text-[10px] font-bold text-red">{soGang} GĂNG</span>}
                  <span className="ml-auto shrink-0 text-[10.5px] text-text-muted">{demViec(g)} việc</span>
                </button>
                {dangMo && <NhanhCay nut={g.con} lui={1} {...chung} moXong={moXong} doiMoXong={doiMoXong} />}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ④+⑤ nhánh cây: dòng nút giàu thông tin + từng việc bên dưới. Bấm dòng nút / dòng việc → mở ở CỘT PHẢI (chốt 03/10)
// ─────────────────────────────────────────────────────────────

function NhanhCay({ nut, lui, ...chung }: { nut: NutCay[]; lui: number } & ChungNhanh) {
  if (nut.length === 0) return null;
  return (
    <div style={{ paddingLeft: lui * 18 }}>
      {nut.map((n) => {
        const im = imLauNhat(n);
        const dangChon = chung.chonKhoa === `nut:${n.wbs}`;
        // Việc chưa xong hiện như cũ; việc ĐÃ XONG ẩn sau chữ xanh, bấm mới mở (Mr. Đại chốt 05/10)
        const conMo = n.viec.filter((v) => !v.daXong);
        const daXong = n.viec.filter((v) => v.daXong);
        const moDsXong = !!chung.moXong?.has(n.wbs);
        const moNut = () => chung.mo({ loai: "nut", wbs: n.wbs });
        return (
          <div key={n.wbs}>
            {/* div bấm được thay <button>: trong dòng có nút "việc đã xong" — không lồng button trong button */}
            <div
              role="button"
              tabIndex={0}
              data-lenh="cay-viec.xem-nut"
              data-gt="cv:dong-nut"
              data-gia-tri={n.wbs}
              onClick={moNut}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  moNut();
                }
              }}
              title="Xem đầu việc này ở khung bên phải"
              className={`flex w-full cursor-pointer flex-wrap items-center gap-2 border-b border-border-light px-2 py-1.5 text-left text-[12px] transition hover:bg-bg2 ${dangChon ? "bg-accent-soft" : ""}`}
            >
              <code className="text-[11px] text-text-muted">{n.wbs}</code>
              {/* Việc trên đường găng thì CHÍNH TÊN VIỆC đỏ và đậm — không chip "GĂNG" (Mr. Đại chốt 10/09) */}
              <span className={n.gang ? "font-bold text-red" : "text-text"}>{n.ten}</span>
              {daXong.length > 0 && chung.doiMoXong && <NutViecDaXong so={daXong.length} mo={moDsXong} onBam={() => chung.doiMoXong?.(n.wbs)} />}
              {/* "CHƯA AI ĐƯỢC GIAO" là CHỮ THUẦN (luật 28) */}
              {chuaAiGiao(n) && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text">
                  <UserX className="h-3 w-3" /> CHƯA AI ĐƯỢC GIAO
                </span>
              )}
              {/* Việc găng chưa tới lúc giao: KHÔNG hiện gì (Mr. Đại chốt 04/10 tối — chưa cần là rác thông tin) */}
              <span className="ml-auto flex flex-wrap items-center gap-2 text-[10.5px] text-text-muted">
                {n.end && <span>{ngayVN(n.end)}</span>}
                {n.nhaThau && <span>· {n.nhaThau}</span>}
                <span>· {fmtSo(n.pct)}%</span>
                {/* Số việc = CHỈ việc chưa xong (Mr. Đại chốt 05/10) */}
                {conMo.length > 0 ? (
                  <span>
                    · <b className="text-text">{conMo.length}</b> việc
                  </span>
                ) : (
                  n.gang && n.viec.length === 0 && <span className="font-semibold text-red">· 0 việc</span>
                )}
                {im && (
                  <b className="text-red">
                    · ⏳ {im.ngay} ngày ở bàn {im.ai || "(chưa gán)"}
                  </b>
                )}
              </span>
            </div>

            {/* ⑤ từng việc CHƯA XONG treo vào nút */}
            {conMo.length > 0 && (
              <div className="pl-7">
                {conMo.slice(0, 4).map((v) => (
                  <DongViec key={v.id} v={v} mo={chung.mo} dangChon={chung.chonKhoa === `viec:${v.id}`} nenVang />
                ))}
                {conMo.length > 4 && (
                  <button type="button" onClick={moNut} data-gt="cv:con-viec" className="px-2 pb-1 text-left text-[10px] text-accent underline decoration-dotted">
                    …còn {conMo.length - 4} việc nữa — xem đủ ở khung bên phải
                  </button>
                )}
              </div>
            )}
            {/* Việc đã xong — chỉ khi người bấm chữ "▸ N việc đã xong" */}
            {moDsXong && daXong.length > 0 && (
              <div className="pl-7" data-gt="cv:ds-viec-da-xong">
                {daXong.map((v) => (
                  <DongViec key={v.id} v={v} mo={chung.mo} dangChon={chung.chonKhoa === `viec:${v.id}`} nenVang />
                ))}
              </div>
            )}

            {chuaAiGiao(n) && chung.duocGiao && <KhoiChuaGiao nut={n} {...chung} />}
            <NhanhCay nut={n.con} lui={1} {...chung} />
          </div>
        );
      })}
    </div>
  );
}

/** Ảnh người: agent Công việc không giữ ảnh → chữ cái đầu của tên thật (như Avatar của Base khi danh bạ không có ảnh) */
export function Avatar({ ten, co = 18 }: { ten: string; co?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-bold text-text-secondary"
      style={{ width: co, height: co }}
    >
      {(ten.trim().split(/\s+/).pop()?.[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Dấu chữ v trạng thái — KHÔNG bấm được (như DauXong của Base) */
export function DauXong({ xong }: { xong: boolean }) {
  return (
    <span
      className={`mt-0.5 w-4 shrink-0 text-center text-[13px] font-bold ${xong ? "text-green" : "text-text-muted opacity-40"}`}
      title={xong ? "Đã hoàn thành" : "Chưa xong — cập nhật trong agent Công việc"}
    >
      ✓
    </span>
  );
}

/** Nhãn trạng thái của một việc: chữ có màu, KHÔNG viền không nền (luật 28) — dùng chung cây trái và khung phải */
export function nhanTrangThai(v: ViecCay): [string, string][] {
  const nhan: [boolean, string, string][] = [
    [v.nguoiPhuTrach === "", "chưa giao ai", "text-red"],
    [v.daXong, "đã xong", "text-green"],
    [v.quaHanNgay !== null && v.quaHanNgay > 0, `quá hạn ${v.quaHanNgay} ngày`, "text-red"],
    [!v.daXong && v.namImNgay !== null && v.namImNgay >= NGUONG_IM, `nằm im ${v.namImNgay} ngày`, "text-red"],
    [!v.daXong && v.namImNgay !== null && v.namImNgay < NGUONG_IM, `nằm im ${v.namImNgay} ngày`, "text-text-muted"],
    [!v.daXong && v.namImNgay === null, "không đo được nằm im", "text-text-muted"],
  ];
  return nhan.filter(([co]) => co).map(([, chu, mau]) => [chu, mau]);
}

/**
 * Một việc treo dưới nút WBS — giống dòng việc của Base; bấm CẢ DÒNG (kể cả 🤖✎) là mở chi tiết việc ở khung bên phải, nơi có
 * ô chọn mã WBS + nút Duyệt (chốt 03/10: không window.prompt).
 */
/** `nenVang`: dòng CÔNG VIỆC trên cây WBS mang nền vàng nhạt để khỏi lẫn với đầu việc WBS (Mr. Đại chốt 04/10 chiều;
 *  định nghĩa màu: --nen-viec-cay ở phong.css). Danh sách chỉ toàn việc (khu phải) thì không cần. */
export function DongViec({ v, mo, dangChon, nenVang }: { v: ViecCay; mo: (c: Chon) => void; dangChon?: boolean; nenVang?: boolean }) {
  const dc = chuDoChac(v);
  return (
    <button
      type="button"
      data-lenh="cay-viec.xem-viec"
      data-gt="cv:dong-viec"
      data-gia-tri={v.ten}
      onClick={() => mo({ loai: "viec", id: v.id })}
      className={`flex w-full items-start gap-2 border-b border-border-light/60 py-1.5 pl-2 pr-1 text-left last:border-b-0 ${dangChon ? "bg-accent-soft" : nenVang ? "bg-[var(--nen-viec-cay)] hover:brightness-[0.97]" : "hover:bg-bg2"}`}
    >
      <DauXong xong={v.daXong} />
      <div className="min-w-0 flex-1">
        {/* Việc đã xong: tên chữ xanh đậm, không gạch — như khối Việc làm xong ở Sơ đồ tổ chức (Mr. Đại chốt 05/10) */}
        <div className={`text-[12.5px] font-semibold ${v.daXong ? "text-[var(--p-ok-dam)]" : "text-text"}`}>
          {v.ten}
          {v.duongGanMa === "ai" && (
            <span className="ml-1 text-[10px]" title={v.canCuGan ?? "AI gán từ tên việc"}>
              🤖{v.aiGanChuaSoat && <span className="text-yellow">●</span>}
              {v.duyetDuoc && <span className="ml-0.5 text-text-muted underline decoration-dotted">✎</span>}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-text-muted">
          {dc && <span className={`font-semibold ${dc.mau}`}>{dc.chu}</span>}
          {/* "đã xong" đã nói bằng màu tên + dòng Xong ngày bên phải — không nhắc lần hai */}
          {nhanTrangThai(v)
            .filter(([chu]) => !(v.daXong && chu === "đã xong"))
            .map(([chu, mau]) => (
              <span key={chu} className={`font-semibold ${mau}`}>
                {chu}
              </span>
            ))}
          <span>{v.id}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        {v.daXong ? (
          <div className="text-[12px] font-bold text-[var(--p-ok-dam)]">{v.xongNgay ? `Xong ngày ${ngayDu(v.xongNgay)}` : "Đã xong"}</div>
        ) : (
          <div className={`text-[12px] font-bold ${v.quaHanNgay !== null && v.quaHanNgay > 0 ? "text-red" : "text-text-secondary"}`}>
            {v.han ? ngayVN(v.han) : "Không hạn"}
          </div>
        )}
        <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[10.5px] text-text-muted">
          {v.nguoiPhuTrach === "" ? (
            <span className="font-semibold text-red">Chưa giao ai</span>
          ) : (
            <>
              <Avatar ten={v.tenNguoi || v.nguoiPhuTrach} />
              <span className="max-w-[130px] truncate">{v.tenNguoi || v.nguoiPhuTrach}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// ⑥ Nút găng CHƯA AI ĐƯỢC GIAO — Mr. Đại chốt 06/10/2026: tab "⭕ Găng chưa ai nhận" ở màn Issue bỏ, THẺ ISSUE + khối "AI soạn sẵn"
//    + chọn người · Giao việc · Sửa · Bỏ qua hiện ngay dưới dòng này (đúng giao diện màn Issue — dùng lại TheIssue/KhoiViecIssue).
//    Sổ issue chưa có thẻ cho nút / không đọc được sổ → hai nút cũ (Xem việc AI soạn sẵn · Không cần giao) làm lối dự phòng.
// ─────────────────────────────────────────────────────────────

function KhoiChuaGiao(props: { nut: NutCay } & ChungNhanh) {
  const { nut, mo, issueGang } = props;
  const t = issueGang?.theCua(nut.wbs);
  if (issueGang?.du && t) {
    const du = issueGang.du;
    return (
      <div className="my-2 ml-6 space-y-1.5" data-gt="cv:khoi-issue-gang">
        <TheIssue t={t} dangChon={false} mo={() => mo({ loai: "nut", wbs: nut.wbs })} />
        {coKhoiViec(t, du) && <KhoiViecIssue t={t} du={du} goi={issueGang.goi} nh={issueGang.nh} moSua={() => mo({ loai: "sua-giao", id: t.id, wbs: nut.wbs })} />}
      </div>
    );
  }
  if (issueGang && !issueGang.du && !issueGang.loi) return <div className="my-1 ml-6 text-[10.5px] text-text-muted">Đang soạn sẵn việc giao…</div>;
  return <KhoiChuaGiaoCu {...props} />;
}

function KhoiChuaGiaoCu({ nut, mo, duAnId, onDoi }: { nut: NutCay } & ChungNhanh) {
  const [loi, setLoi] = useState<string | null>(null);
  const khongCan = async () => {
    setLoi(null);
    try {
      await goiApi("/api/cay-viec/khong-can-giao", { body: { du_an: duAnId, wbs: nut.wbs } });
      mo({ loai: "nut", wbs: nut.wbs });
      onDoi();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không gọi được máy chủ app.");
    }
  };
  return (
    <div className="my-1 ml-6" data-gt="cv:khoi-chua-giao">
      {loi && <div className="text-[10.5px] text-yellow">{loi}</div>}
      {nut.khongCanGiao ? (
        <div className="mt-1.5 text-[10.5px] text-text-secondary">
          Đã đánh dấu không cần giao trong agent Công việc —{" "}
          <button type="button" onClick={() => mo({ loai: "nut", wbs: nut.wbs })} data-gt="cv:bo-khong-can-giao" className="font-semibold text-accent underline hover:text-accent-hover">
            xem / bỏ đánh dấu
          </button>
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-lenh="cay-viec.soan-giao"
            data-gt="cv:xem-ai-soan"
            onClick={() => mo({ loai: "nut", wbs: nut.wbs, soan: Date.now() })}
            className="rounded-sm border border-accent px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent hover:text-white"
          >
            🤖 Xem việc AI soạn sẵn
          </button>
          {/* Lối thoát cho đầu việc KHÔNG giao qua agent Công việc (Mr. Đại chốt 10/09) */}
          <button
            type="button"
            data-lenh="cay-viec.khong-can-giao"
            data-gt="cv:khong-can-giao"
            data-gia-tri={nut.wbs}
            onClick={() => void khongCan()}
            className="rounded-sm border border-border px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
          >
            Việc này không cần giao trong agent Công việc
          </button>
        </div>
      )}
    </div>
  );
}
