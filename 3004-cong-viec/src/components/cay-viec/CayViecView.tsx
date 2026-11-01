"use client";
// ============================================================
// CÂY VIỆC & ĐƯỜNG GĂNG — chép màn cùng tên của agent Base (PLAN-AGENT-BASE-VN mục 10b · demo `v-theoduan`), Mr. Đại chốt
// 03/10/2026: Y HỆT khối, nhãn, công thức, nút, bộ lọc; chỉ khác NGUỒN VIỆC — sổ cái của agent Công việc thay Base.vn.
//
// Người dùng vào đây để LÀM gì: soi việc đang tắc ở bàn ai.
//   ① Nút găng chậm mà sổ việc KHÔNG có việc nào → CHƯA AI ĐƯỢC GIAO
//   ② Đã giao rồi nhưng đang nằm im ở bàn ai      → tắc ở khâu nào
// Luật ép vào: cây WBS không phải của agent này (hỏi agent Tiến độ) · đường găng đổi liên tục (mỗi lần mở hỏi lại) ·
// phần của mình hiện trước, phần đi hỏi nạp sau và được phép thiếu.
// LUẬT MÀU: đỏ chỉ cho thứ sinh issue (găng, chưa ai giao, nằm im ≥ ngưỡng). Nút không có quyền thì ẨN (luật riêng 3004).
// ============================================================
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { goiApi } from "@/components/layout/giao-dien";
import type { DuLieuCayViec, QuyenMan, TinhTrangSoViec, TraManCayViec } from "@/lib/cay-viec/dung-man";
import type { NutCay, ViecCay } from "@/lib/cay-viec/thuan";
import { CayGiaiDoan, chuDoChac, laViecNghi } from "./CayGiaiDoan";
import { NutSoanGiao } from "./SoanGiaoHangLoat";
import { PhaiCayViec } from "./PhaiCayViec";
import { khoaChon, type Chon } from "./chon";
import { useKeoGiua } from "@/components/phong/KeoGiua";
import { chuaAiGiao } from "@/lib/cay-viec/thuan";
import { useIssueGang } from "./issue/dung-issue-gang";
import { KhungSuaGiao } from "./issue/KhoiViecIssue";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

type TrangThai =
  | { pha: "dang-hoi" }
  | { pha: "co-so"; du: DuLieuCayViec; so: TinhTrangSoViec; quyen: QuyenMan; duAn: { id: string; ten: string } }
  | { pha: "chua-lay-duoc"; maLoi: string; thongDiep: string; so?: TinhTrangSoViec; quyen?: QuyenMan; duAn?: { id: string; ten: string } };

function gioPhut(iso?: string): string {
  if (!iso) return "—";
  return new Date(new Date(iso).getTime() + 7 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
}

function ngayVN(iso: string): string {
  const [n, t, ng] = iso.slice(0, 10).split("-");
  return ng && t && n ? `${ng}/${t}/${n}` : iso;
}

export function CayViecView({ duAnId }: { duAnId: string | null }) {
  const [tt, setTt] = useState<TrangThai>({ pha: "dang-hoi" });
  const [dangGan, setDangGan] = useState(false);
  const [tinGan, setTinGan] = useState<string | null>(null);
  // Cột phải LUÔN HIỆN (chốt 03/10) — mặc định tóm tắt dự án
  const [chon, setChon] = useState<Chon>({ loai: "tong" });
  const keo = useKeoGiua("cay-viec");

  /** imLang = đọc lại sau một thao tác: giữ màn đang có, không nháy về "Đang hỏi…" */
  const hoiLai = useCallback(async (imLang = false) => {
    if (!imLang) setTt({ pha: "dang-hoi" });
    try {
      const j = await goiApi<TraManCayViec>(`/api/cay-viec${duAnId ? `?du_an=${encodeURIComponent(duAnId)}` : ""}`);
      if (j.ok) setTt({ pha: "co-so", du: j.du_lieu, so: j.so_viec, quyen: j.quyen, duAn: j.du_an });
      else setTt({ pha: "chua-lay-duoc", maLoi: j.ma_loi, thongDiep: j.thong_diep, so: j.so_viec, quyen: j.quyen, duAn: j.du_an });
    } catch (e) {
      setTt({ pha: "chua-lay-duoc", maLoi: "LOI_NOI_BO", thongDiep: e instanceof Error ? e.message : "Không gọi được máy chủ của chính agent này." });
    }
  }, [duAnId]);

  // Đường găng đổi liên tục → hỏi lại mỗi lần mở màn, không nhớ bản cũ
  useEffect(() => {
    void hoiLai();
  }, [hoiLai]);
  const lamTuoi = useCallback(() => void hoiLai(true), [hoiLai]);

  const duAn = tt.pha === "dang-hoi" ? undefined : tt.duAn;

  // Nút găng CHƯA AI ĐƯỢC GIAO → nạp thẻ issue găng để hiện ngay dưới dòng (Mr. Đại chốt 06/10)
  const wbsChuaGiao = useMemo(() => {
    const ra: string[] = [];
    const di = (ds: NutCay[]) => ds.forEach((n) => (chuaAiGiao(n) && ra.push(n.wbs), di(n.con)));
    if (tt.pha === "co-so") di(tt.du.cay ?? []);
    return ra;
  }, [tt]);
  const issueGang = useIssueGang(tt.pha === "co-so" ? tt.duAn.id : null, wbsChuaGiao, tt.pha === "co-so" && !!tt.quyen.giao, lamTuoi);
  const theSua = chon.loai === "sua-giao" ? issueGang.du?.so.the.find((t) => t.id === chon.id) : undefined;

  // Chạy tay AI gán mã — máy vẫn tự chạy nền 5 phút/lần, nút này để khỏi chờ
  const chayGan = useCallback(async () => {
    setDangGan(true);
    setTinGan(null);
    setChon({ loai: "gan", tin: "" });
    try {
      const j = await goiApi<{ ket_qua: { du_an_id: string; thong_diep: string }[] }>("/api/cay-viec/gan-wbs", { body: { chay: true, du_an: duAn?.id } });
      const tin = j.ket_qua.find((k) => k.du_an_id === duAn?.id)?.thong_diep ?? "Máy đang bận một lượt khác — thử lại sau ít phút.";
      setTinGan(tin);
      setChon({ loai: "gan", tin });
      await hoiLai(true);
    } catch (e) {
      const tin = e instanceof Error ? e.message : "Không gọi được máy chủ của chính agent này.";
      setTinGan(tin);
      setChon({ loai: "gan", tin, loi: true });
    } finally {
      setDangGan(false);
    }
  }, [hoiLai, duAn?.id]);

  // Duyệt cả lô đề xuất 🤖 có độ chắc ≥ 70% (Mr. Đại chốt 03/10) — kết quả hiện ở khung phải như "Gán mã ngay"
  const [dangDuyetLo, setDangDuyetLo] = useState(false);
  const duyetLo = useCallback(async () => {
    setDangDuyetLo(true);
    try {
      const j = await goiApi<{ da_duyet: string[]; khong_quyen: string[] }>("/api/cay-viec/gan-wbs", { body: { duyet_lo: duAn?.id } });
      const tin =
        `Đã duyệt ${j.da_duyet.length} việc có độ chắc từ ${Math.round((so?.nguongDuyetLo ?? 0.7) * 100)}% trở lên` +
        (j.khong_quyen.length ? ` · bỏ qua ${j.khong_quyen.length} việc ngoài phạm vi quyền "Duyệt gắn WBS" của bạn` : "") +
        `. Việc dưới ${Math.round((so?.nguongDuyetLo ?? 0.7) * 100)}% và việc chưa đo độ chắc vẫn chờ duyệt từng cái.`;
      setTinGan(tin);
      setChon({ loai: "gan", tin });
      await hoiLai(true);
    } catch (e) {
      const tin = e instanceof Error ? e.message : "Không gọi được máy chủ của chính agent này.";
      setChon({ loai: "gan", tin, loi: true });
    } finally {
      setDangDuyetLo(false);
    }
  }, [hoiLai, duAn?.id]);

  // ✎ gán mã / Duyệt: mở chi tiết việc ở CỘT PHẢI (ô chọn mã + nút Duyệt) — chốt 03/10: không window.prompt
  const moViec = useCallback((id: string) => setChon({ loai: "viec", id }), []);

  const so = tt.pha === "co-so" ? tt.so : tt.pha === "chua-lay-duoc" ? tt.so : undefined;
  const quyen = tt.pha === "dang-hoi" ? undefined : tt.quyen;

  return (
    <div className="so-do cay-viec-sang" ref={keo.khungRef} style={keo.kieuKhung}>
    <section className="san">
    <div className="space-y-4">
      <div className="cv-dau flex flex-wrap items-baseline gap-2">
        <h1>Cây việc &amp; đường găng</h1>
        {duAn && <span className="text-[12.5px] font-semibold text-text-secondary">· {duAn.ten}</span>}
        <span className="text-[11px] text-text-muted">soi việc đang tắc ở bàn ai</span>
      </div>
      {/* ── PHẦN CỦA CHÍNH MÌNH: việc trong sổ. Luôn hiện. ── */}
      <div className="rounded border border-border bg-surface p-4" data-gt="cv:khoi-gan-viec">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="text-[13px] font-bold text-text">Gán việc của dự án vào WBS</div>
          <button
            type="button"
            onClick={() => void hoiLai()}
            data-gt="cv:hoi-lai"
            className="flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
            title="Đường găng đổi liên tục — hỏi lại là lấy bản mới nhất"
          >
            <RefreshCw className="h-3 w-3" />
            Hỏi lại
          </button>
        </div>

        {/* ⭐ 4 THẺ — công thức Mr. Đại chốt 10/09 (giữ nguyên bản Base) */}
        {tt.pha === "co-so" && so?.ok && (
          <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-4">
            <TheDem
              gt="cv:the-dau-viec-wbs"
              moNguon={() => setChon({ loai: "nguon", so: 1 })}
              nhan="Đầu việc WBS"
              gia={String(so.tongWbs ?? 0)}
              mau="xanh"
              phu={`${so.soGiaiDoan ?? 0} giai đoạn cấp 1 · COD ${so.codDuBao ? ngayVN(so.codDuBao) : "—"}`}
              nguon="chung.wbs — Agent tiến độ"
            />
            <TheDem gt="cv:the-duong-gang" moNguon={() => setChon({ loai: "nguon", so: 2 })} nhan="Trên đường găng" gia={String(so.tongGang ?? 0)} mau="do" phu={so.gangTheoNhom ?? ""} nguon="criticalWbs — engine CPM" />
            <TheDem
              gt="cv:the-viec-du-an"
              moNguon={() => setChon({ loai: "nguon", so: 3 })}
              nhan="Việc của dự án"
              gia={String(so.soViecGanDuocWbs ?? 0)}
              duoi={`/ ${so.tongSoViec ?? 0} việc liên quan WBS`}
              phu={`gắn được ${so.soViecGanDuocWbs ?? 0} · ${so.soChoDuyet ?? 0} chờ duyệt${(so.tongSoViec ?? 0) - (so.soDaXet ?? 0) > 0 ? ` · ${(so.tongSoViec ?? 0) - (so.soDaXet ?? 0)} AI chưa đọc` : ""}`}
              nguon="sổ việc agent Công việc — 🤖 AI gắn, người duyệt / sửa được"
            />
            <TheDem
              gt="cv:the-nut-chua-giao"
              moNguon={() => setChon({ loai: "nguon", so: 4 })}
              nhan="Việc găng CHƯA GIAO"
              gia={String(so.nutGangChuaGiao ?? 0)}
              mau={(so.nutGangChuaGiao ?? 0) > 0 ? "do" : undefined}
              phu={`Chưa giao trong ${so.cuaSoGiaoNgay ?? 7} ngày tới · ${so.soLaChuaToiLuc ?? 0} việc chờ`}
              nguon="bấm ⭕ ở cây dưới để xem từng việc và giao"
            />
          </div>
        )}

        {/* VÌ SAO CHƯA GẮN ĐƯỢC — bày SỐ ĐO của chính lần đọc này, không nói vo */}
        {tt.pha === "co-so" && so?.ok && so.soViecGanDuocWbs === 0 && (
          <div className="mt-3 rounded-sm border border-border bg-bg2 px-3 py-2.5" data-gt="cv:vi-sao-chua-gan">
            <div className="text-[11.5px] font-semibold text-text">Vì sao chưa gắn được việc nào vào mã WBS</div>
            <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
              Đã đọc <strong className="text-text">{so.tongSoViec}</strong> việc của dự án trong sổ. Việc được gắn mã theo{" "}
              <strong className="text-text">ba đường</strong>, và đây là số đo của chính lần đọc vừa rồi:
            </p>
            <table className="mt-2 w-full text-[11px]">
              <tbody>
                <tr className="border-b border-border-light">
                  <td className="py-1 text-text-secondary">① 🤖 AI đề xuất — đang chờ người duyệt</td>
                  <td className="py-1 text-right font-bold text-text">{so.ganTheoDuong?.ai_cho ?? 0} việc</td>
                </tr>
                <tr className="border-b border-border-light">
                  <td className="py-1 text-text-secondary">② 🤖 AI đề xuất — đã duyệt / AI tự duyệt</td>
                  <td className="py-1 text-right font-bold text-text">{so.ganTheoDuong?.ai_duyet ?? 0} việc</td>
                </tr>
                <tr>
                  <td className="py-1 text-text-secondary">③ Người gắn tay</td>
                  <td className="py-1 text-right font-bold text-text">{so.ganTheoDuong?.nguoi ?? 0} việc</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[11px] leading-relaxed text-text-secondary">
              Mã ghi trong tên việc chỉ là <em>gợi ý</em> cho AI — báo cáo tuần đánh số theo cách riêng, có thể không trùng cây
              WBS của tiến độ (đo 03/10/2026: CV-2026-0074 ghi 7.2.3 nhưng 7.2.3 bên Tiến độ là “Thi công san nền”), nên máy
              không tự nhận mã trong tên.
            </p>
            <p className="mt-2 text-[11px] text-text-secondary">
              <strong className="text-text">Đường đi tiếp:</strong> để <strong className="text-text">🤖 AI đọc tên việc rồi suy như người</strong>{" "}
              — bấm nút gán ở khối dưới, hoặc chờ máy tự chạy (5 phút một lần). Ai muốn chính xác tuyệt đối thì bấm ✎ gán mã
              từng việc — người gắn luôn thắng AI.
            </p>
            {(so.mauChuaGan?.length ?? 0) > 0 && (
              <>
                <div className="mt-2 text-[10.5px] text-text-muted">Mẫu tên việc đọc được:</div>
                <ul className="mt-1 space-y-0.5">
                  {so.mauChuaGan?.slice(0, 5).map((t) => (
                    <li key={t} className="text-[10.5px] text-text-muted">
                      • {t}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── CÂY — chốt 03/10: dời lên NGAY DƯỚI khối "Gán việc của dự án vào WBS", tên "thể hiện dạng công việc" ── */}
      {tt.pha === "co-so" && (
        <CayGiaiDoan
          cay={tt.du.cay ?? []}
          nguonDong={`Cây WBS + đường găng: chung.wbs — Agent tiến độ · lấy lúc ${gioPhut(tt.so.lucLayTienDo)} · Việc: sổ việc agent Công việc ${tt.so.tongSoViec ?? 0} việc · đọc lúc ${gioPhut(tt.so.lucDocSoCai)}`}
          mo={setChon}
          chonKhoa={khoaChon(chon)}
          onDoi={lamTuoi}
          duAnId={tt.duAn.id}
          duocGiao={!!tt.quyen.giao}
          viecChoDuyet={tt.so.viecChoDuyet ?? []}
          issueGang={issueGang}
        />
      )}

      {/* ── 🤖 GÁN MÃ WBS BẰNG AI — chốt 03/10 + 04/10: "Soát tay" và "tầng B" gộp MỘT danh sách (tầng B đã xoá) ── */}
      {tt.pha === "co-so" && so?.ok && (
        <div className="rounded border border-border bg-surface p-4" data-gt="cv:khoi-gan-ai">
          <KhaiHuongDan ma="cay-viec-gan-ma" uuTien={0} />
          <DanhSachGanAi
            cay={tt.du.cay ?? []}
            viecChuaGan={so.viecChuaGan ?? []}
            conNua={(so.tongViecChuaGan ?? 0) - (so.viecChuaGan?.length ?? 0)}
            moViec={moViec}
            duyetLo={duyetLo}
            dangDuyetLo={dangDuyetLo}
            nguongLo={so.nguongDuyetLo ?? 0.7}
            nut={
              <>
                {quyen?.gan && (
                  <button
                    type="button"
                    data-lenh="cay-viec.gan-wbs"
                    data-gt="cv:gan-ngay"
                    onClick={() => void chayGan()}
                    disabled={dangGan}
                    className="rounded-sm border border-accent px-3 py-1.5 text-[11.5px] font-semibold text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {/* Tên đổi 04/10 (Mr. Đại chốt) — AI đề xuất mã WBS cho mọi việc của dự án chưa có mã, người duyệt */}
                    {dangGan ? "Đang gán… (AI đọc theo lô)" : "🤖 Gán mã WBS vào công việc"}
                  </button>
                )}
                {quyen?.giao && <NutSoanGiao cay={tt.du.cay} mo={setChon} />}
              </>
            }
          />
          {/* Dòng "Lần chạy gần nhất … · Đang giữ N kết luận" đã xoá (Mr. Đại 05/10) — chỉ còn câu báo ngay sau khi người bấm Gán mã */}
          {tinGan && (
            <div className="mt-2 rounded-sm border border-border-light bg-bg2 px-3 py-2 text-[11px] text-text-secondary" data-gt="cv:lan-chay-gan">
              {tinGan}
            </div>
          )}
        </div>
      )}

      {tt.pha === "dang-hoi" && (
        <div className="rounded border border-border bg-surface px-4 py-6 text-[12.5px] text-text-muted">Đang hỏi Agent tiến độ lấy cây WBS + đường găng…</div>
      )}

      {tt.pha === "chua-lay-duoc" && (
        <div className="rounded border border-border bg-surface px-4 py-5" data-gt="cv:chua-lay-duoc">
          <div className="flex items-start gap-2 rounded-sm border border-yellow/30 bg-yellow-soft px-3 py-2.5">
            <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-yellow" />
            <div>
              <div className="text-[12.5px] font-semibold text-yellow">
                {tt.maLoi === "KHONG_CO_DU_LIEU" && !so ? "Chưa có cây WBS cho dự án này" : "Chưa lấy được cây WBS — Agent tiến độ không phản hồi"}
              </div>
              <div className="mt-1 text-[11.5px] text-text-secondary">{tt.thongDiep}</div>
              <div className="mt-1 text-[10.5px] text-text-muted">
                Mã lỗi: <code>{tt.maLoi}</code>
                {so?.ok ? ` · sổ việc của dự án vẫn đọc được: ${so.tongSoViec ?? 0} việc.` : ""}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </section>
    {keo.vach}
    <section className="phai">
      <div className="vao" key={khoaChon(chon) + (chon.loai === "hang-loat" ? chon.lan : chon.loai === "nut" ? (chon.soan ?? 0) : "")}>
        {chon.loai === "sua-giao" && issueGang.du && theSua ? (
          <KhungSuaGiao
            t={theSua}
            du={issueGang.du}
            goi={issueGang.goi}
            nh={issueGang.nh}
            xong={() => setChon({ loai: "nut", wbs: chon.wbs })}
            huy={() => setChon({ loai: "nut", wbs: chon.wbs })}
          />
        ) : (
        <PhaiCayViec
          chon={chon}
          mo={setChon}
          du={tt.pha === "co-so" ? tt.du : null}
          so={so}
          quyen={quyen}
          duAn={duAn}
          onDoi={lamTuoi}
          thongBao={tt.pha === "dang-hoi" ? "Đang hỏi Agent tiến độ lấy cây WBS + đường găng…" : tt.pha === "chua-lay-duoc" ? tt.thongDiep : undefined}
        />
        )}
      </div>
    </section>
    </div>
  );
}

type NhomGan = "cho" | "chua-xet" | "da";
interface DongGan {
  v: ViecCay;
  wbs: string;
  ten: string;
  gang: boolean;
  nghi: boolean;
  nhom: NhomGan;
}
const MOI_TRANG = 10;

/**
 * MỘT danh sách việc của dự án theo mã WBS (Mr. Đại chốt 03/10, trả lời 04/10 — CHOT LOI-DUNG-CHUNG 6g.7 mục 6):
 * gộp "Soát tay" + "tầng B". Thứ tự: 🤖 chờ duyệt (găng & nghi → nghi → găng → độ chắc thấp) → AI chưa đọc → đã duyệt /
 * người gắn tay (STT có chữ "v", số xanh). 10 việc một trang, số trang ở dưới. Mỗi dòng: tên việc → mã + tên đầu việc.
 */
function DanhSachGanAi({
  cay,
  viecChuaGan,
  conNua,
  moViec,
  duyetLo,
  dangDuyetLo,
  nguongLo,
  nut,
}: {
  cay: NutCay[];
  viecChuaGan: ViecCay[];
  conNua: number;
  moViec: (id: string) => void;
  duyetLo: () => void;
  dangDuyetLo: boolean;
  /** Ngưỡng độ chắc (0–1) của nút duyệt cả lô — lấy từ Cài đặt */
  nguongLo: number;
  nut: ReactNode;
}) {
  const [trang, setTrang] = useState(1);
  // Mặc định ĐÓNG — chỉ hiện tiêu đề, các nút và dòng đếm; bấm "▸ Mở" mới hiện danh sách (Mr. Đại 05/10)
  const [moDs, setMoDs] = useState(false);
  const theoMa = new Map<string, NutCay>();
  const phang = (ds: NutCay[]) => ds.forEach((n) => (theoMa.set(n.wbs, n), phang(n.con)));
  phang(cay);
  const cho: DongGan[] = [];
  const chuaXet: DongGan[] = [];
  const da: DongGan[] = [];
  for (const v of viecChuaGan) {
    const n = v.maWbs ? theoMa.get(v.maWbs) : undefined;
    const d = { v, wbs: v.maWbs ?? "—", ten: v.maWbs ? (n?.ten ?? "") : "không thuộc đầu việc nào", gang: !!n?.gang, nghi: laViecNghi(v) };
    if (v.duongGanMa === "ai" && v.aiGanChuaSoat) cho.push({ ...d, nhom: "cho" });
    else if (v.duongGanMa === null) chuaXet.push({ ...d, nhom: "chua-xet" });
    else da.push({ ...d, nhom: "da" }); // đã có kết luận "không thuộc đầu việc nào" (người hoặc AI tự duyệt)
  }
  // Việc đã treo lên cây = mã đã duyệt / người gắn tay (chốt 03/10: việc đã duyệt VẪN nằm trong danh sách)
  const daCo = new Set(viecChuaGan.map((v) => v.id));
  const quet = (ds: NutCay[]) =>
    ds.forEach((n) => {
      for (const v of n.viec) {
        if (daCo.has(v.id)) continue;
        daCo.add(v.id);
        da.push({ v, wbs: n.wbs, ten: n.ten, gang: n.gang, nghi: false, nhom: "da" });
      }
      quet(n.con);
    });
  quet(cay);
  cho.sort(
    (a, b) =>
      Number(b.gang && b.nghi) - Number(a.gang && a.nghi) ||
      Number(b.nghi) - Number(a.nghi) ||
      Number(b.gang) - Number(a.gang) ||
      (a.v.doChacGan ?? 2) - (b.v.doChacGan ?? 2),
  );
  da.sort((a, b) => a.wbs.localeCompare(b.wbs, "vi", { numeric: true }));
  const ds = [...cho, ...chuaXet, ...da];
  const phanTramLo = Math.round(nguongLo * 100);
  const soNghi = cho.filter((d) => d.nghi).length;
  const soChuaDo = cho.filter((d) => typeof d.v.doChacGan !== "number").length;
  // Nút không có quyền thì ẨN (luật riêng agent Công việc): chỉ đếm việc người này duyệt được
  const soLo = cho.filter((d) => d.v.duyetDuoc && typeof d.v.doChacGan === "number" && d.v.doChacGan >= nguongLo).length;
  const soTrang = Math.max(1, Math.ceil(ds.length / MOI_TRANG));
  const tr = Math.min(trang, soTrang);
  const trangDs = ds.slice((tr - 1) * MOI_TRANG, tr * MOI_TRANG);

  return (
    <>
      {/* Tiêu đề + 3 nút MỘT hàng ngang (chốt 03/10): Gán mã ngay · Soạn việc trên đường găng chưa ai làm · Duyệt n/N (tên đổi 04/10) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[13px] font-bold text-text">🤖 Gán mã WBS bằng AI</div>
        {ds.length > 0 && (
          <button
            type="button"
            onClick={() => setMoDs((m) => !m)}
            aria-expanded={moDs}
            data-gt="cv:mo-ds-gan-ai"
            className="rounded-sm border border-border px-2.5 py-1 text-[11.5px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent"
          >
            {moDs ? "▾ Thu gọn" : "▸ Mở"}
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {nut}
          {soLo > 0 && (
            <button
              type="button"
              onClick={duyetLo}
              data-gt="cv:duyet-ca-lo"
              disabled={dangDuyetLo}
              className="rounded-sm border border-accent px-3 py-1.5 text-[11.5px] font-semibold text-accent transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              title={`Duyệt một lượt mọi đề xuất có độ chắc từ ${phanTramLo}% trở lên (ngưỡng ở Cài đặt › Gắn việc vào WBS); việc dưới ngưỡng vẫn duyệt từng cái`}
            >
              {/* Tên nút nói rõ duyệt bao nhiêu TRÊN tổng số chờ duyệt (Mr. Đại chốt 04/10) */}
              {dangDuyetLo ? "Đang duyệt…" : `Duyệt ${soLo}/${cho.length} việc chờ duyệt chắc từ ${phanTramLo}%`}
            </button>
          )}
        </div>
      </div>
      {ds.length === 0 ? (
        <div className="mt-2 text-[11px] text-text-muted">Dự án chưa có việc nào trong sổ.</div>
      ) : (
        <div className="mt-2 text-[11px]" data-gt="cv:ds-gan-ai" hidden={!moDs}>
          <div className="text-text-secondary">
            <b className="text-text">{cho.length}</b> việc 🤖 chờ duyệt
            {cho.length > 0 && (
              <>
                {" "}
                (<span className="font-semibold text-yellow">{soNghi} nghi</span> — AI chắc dưới 70% · {soChuaDo} chưa đo độ chắc)
              </>
            )}
            {chuaXet.length > 0 && <> · {chuaXet.length} việc AI chưa đọc</>} · <b className="text-text">{da.length}</b> đã duyệt / gắn tay
          </div>
          <div hidden={!moDs}>
          <div className="mt-1 space-y-0.5">
            {trangDs.map((d, k) => {
              const stt = (tr - 1) * MOI_TRANG + k + 1;
              const dc = d.nhom === "cho" ? chuDoChac(d.v) : null;
              return (
                <div
                  key={d.v.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => moViec(d.v.id)}
                  onKeyDown={(e) => e.key === "Enter" && moViec(d.v.id)}
                  data-gt="cv:dong-gan-ai"
                  className="flex cursor-pointer items-baseline gap-2 rounded-sm px-1 py-0.5 hover:bg-bg2"
                  title="Xem việc ở khung bên phải"
                >
                  <span className={`w-8 shrink-0 text-right tabular-nums ${d.nhom === "da" ? "font-bold text-green" : "text-text-muted"}`}>
                    {d.nhom === "da" ? `v${stt}` : stt}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                    <span className={d.gang ? "font-bold text-red" : "text-text"}>{d.v.ten}</span>
                    <span className="text-text-muted">→</span>
                    {d.nhom === "chua-xet" ? (
                      <span className="text-text-muted">🤖 chưa xét — AI đọc ở lượt tới</span>
                    ) : (
                      // Luật 30: mã luôn kèm tên ngắn của đầu việc
                      <span className="text-accent" title={`${d.wbs} ${d.ten}`}>
                        <code>{d.wbs}</code> {d.ten.split(/\s+/).slice(0, 8).join(" ")}
                      </span>
                    )}
                    {d.gang && <span className="text-[10px] font-semibold text-red">găng</span>}
                    {dc && <span className={`font-semibold ${dc.mau}`}>{dc.chu}</span>}
                    {d.nhom === "cho" && d.v.canCuGan && (
                      <span className="text-text-muted" title={d.v.canCuGan}>
                        {d.v.canCuGan}
                      </span>
                    )}
                    {d.nhom === "da" && (
                      <span className="text-[10.5px] text-text-muted">
                        {d.v.duongGanMa === "nguoi" ? "người gắn tay" : d.v.duongGanMa === "ten_viec" ? "theo mã trong tên việc" : "đã duyệt"}
                      </span>
                    )}
                    {d.nhom === "cho" && d.v.duyetDuoc && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          moViec(d.v.id);
                        }}
                        data-gt="cv:gan-ma-tay"
                        className="text-[10px] text-text-muted underline decoration-dotted hover:text-accent"
                        title="Duyệt hoặc gán tay mã WBS ở khung bên phải"
                      >
                        ✎ gán mã
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          {soTrang > 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-1" data-gt="cv:trang-gan-ai">
              {Array.from({ length: soTrang }, (_, k) => k + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTrang(p)}
                  className={`min-w-[26px] rounded-sm border px-1.5 py-0.5 text-[11px] font-semibold transition ${
                    p === tr ? "border-accent bg-accent text-white" : "border-border text-text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {conNua > 0 && <div className="mt-1 text-text-muted">Máy chỉ đọc 60 việc chưa gắn đầu tiên — còn {conNua} việc nữa trong sổ.</div>}
          </div>
        </div>
      )}
    </>
  );
}

/** Thẻ đếm 4 ô đầu màn — chốt 03/10: bỏ dòng "nguồn: …" dưới thẻ; link mở nguồn gắn vào TIÊU ĐỀ thẻ, chữ đen đậm */
function TheDem({ gt, nhan, gia, duoi, phu, nguon, mau, moNguon }: { gt: string; nhan: string; gia: string; duoi?: string; phu: string; nguon: string; mau?: "do" | "xanh"; moNguon: () => void }) {
  // Bố cục (Mr. Đại chốt 04/10): nhãn căn giữa sát trên · số căn giữa cả dọc lẫn ngang · dòng phụ căn giữa sát dưới
  return (
    <div className="flex h-full flex-col items-center bg-surface px-3 py-1.5 text-center" data-gt={gt}>
      {/* Base: bấm "nguồn" mở modal m-nguon-*; agent Công việc mở ở cột phải (chốt 03/10) */}
      <button
        type="button"
        onClick={moNguon}
        data-gt="cv:nguon-the"
        className="text-center text-[10.5px] font-bold uppercase tracking-wider text-text underline decoration-dotted underline-offset-2 hover:text-accent"
        title={`Nguồn: ${nguon} — bấm xem cách tính ở khung bên phải`}
      >
        {nhan}
      </button>
      <div className={`flex flex-1 items-center justify-center text-[20px] font-extrabold leading-tight ${mau === "do" ? "text-red" : mau === "xanh" ? "text-accent" : "text-text"}`}>
        <span>
          {gia}
          {duoi && <span className="ml-1 text-[12px] font-normal text-text-muted">{duoi}</span>}
        </span>
      </div>
      <div className="text-[10.5px] leading-snug text-text-secondary">{phu}</div>
    </div>
  );
}
