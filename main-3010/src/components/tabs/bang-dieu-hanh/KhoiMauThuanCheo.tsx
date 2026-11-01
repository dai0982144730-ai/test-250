"use client";

// ============================================================
// KHỐI ⑦ — CHỖ HAI AGENT NÓI KHÁC NHAU (B11, Mr. Đại chọn làm 22/09/2026)
// Main chỉ NÊU, không phân xử, không sửa số.
// ⭐ 18/10/2026 (T1 — Mr. Đại gật «ok theo ý bạn»): mỗi chỗ khác nhau là MỘT câu tiếng người do CODE ghép
// (`cauMauThuan` — mã kèm tên, luật 30); câu hai bên + tên sổ, mã nguồn thu vào nút nhỏ «Nguồn», bấm mới hiện.
// Nút "🤖 Nhận định" đổi tên thành "🤖 Giải thích" (J12 22/09: AI viết tin bên nào / vì sao / ai làm gì, hiện sau
// 🤖 — luật 19). Bỏ mọi chữ chi phí AI (ước trên nút, chi phí thật dưới câu) — không nói chi phí với người dùng.
// AI tắt thì nút mờ kèm lý do (luật 17). Tự gọi API khi mở (nhớ 10 phút phía máy chủ) — không chặn lượt tải
// trang. Chữ thuần, không viền: nhãn "găng" là chữ (luật 28).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/common/SectionCard";
import type { DongMauThuan, KhoiMauThuan } from "@/lib/bang-dieu-hanh/mau-thuan-cheo";
import type { NhanDinh, UocChiPhi } from "@/lib/bang-dieu-hanh/nhan-dinh-mau-thuan";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { useSessionUser } from "@/lib/use-session";
import { ngayGioVN, ngayTrongChu } from "@/lib/ngay-hien";

/** Chữ cạnh nút 🤖 Giải thích (title) — nói AI làm gì, không nói chi phí */
const GIAI_THICH_NUT = "AI đọc câu trả lời của hai bên rồi viết vài câu: nên tin bên nào, vì sao, cần ai làm gì. Bạn bấm mới chạy.";

/** Một dòng giải thích 🤖 + nút chạy. Khoá dòng khớp khuôn khoaDong() phía máy chủ. */
function NhanDinhDong({
  duAn,
  d,
  uoc,
  daCo,
  onXong,
}: {
  duAn: string;
  d: DongMauThuan;
  uoc: UocChiPhi | null;
  daCo: NhanDinh | undefined;
  onXong: (n: NhanDinh) => void;
}) {
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  // Nút gọi AI / ghi = cửa "ghi" (quyen.ts) — Người xem thấy nút MỜ kèm lý do (luật 17)
  const coGhi = duocGhi(useSessionUser()?.role);
  const cu = daCo !== undefined && daCo.van !== `${d.benA.noiDung} ‖ ${d.benB.noiDung}`;

  const chay = async () => {
    setDangChay(true);
    setLoi(null);
    try {
      const r = await fetch("/api/bang-dieu-hanh/mau-thuan-cheo/nhan-dinh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ du_an: duAn, loai: d.loai, wbs: d.wbs }),
      });
      const j = (await r.json()) as { ok: boolean; nhanDinh?: NhanDinh; thong_diep?: string };
      if (j.ok && j.nhanDinh) onXong(j.nhanDinh);
      else setLoi(j.thong_diep ?? "Chưa giải thích được.");
    } catch {
      setLoi("Không gọi được máy chủ của chính Main.");
    } finally {
      setDangChay(false);
    }
  };

  const chan = uoc !== null && !uoc.duocChay;
  const nhanNut = dangChay ? "🤖 Đang đọc hai bên…" : `🤖 ${daCo ? "Giải thích lại" : "Giải thích"}`;

  return (
    <>
      <button
        type="button"
        onClick={() => void chay()}
        disabled={dangChay || chan || uoc === null || !coGhi}
        title={!coGhi ? LY_DO_CHAN.ghi : chan ? (uoc?.lyDoChan ?? "") : GIAI_THICH_NUT}
        className="rounded-sm border border-border px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {nhanNut}
      </button>
      {chan ? <span className="text-[10px] text-text-muted">{uoc?.lyDoChan}</span> : null}
      {loi ? <div className="order-2 basis-full text-[10.5px] text-red">{loi}</div> : null}
      {daCo ? (
        <div className="order-2 basis-full text-[11px] leading-relaxed text-text">
          <span aria-label="Do AI viết">🤖</span> {ngayTrongChu(daCo.cau)}
          <div className="mt-0.5 text-[10px] text-text-muted">
            {daCo.chiTietModel ?? daCo.model} · {ngayGioVN(daCo.luc)}
            {cu ? " · ⚠ hai bên đã đổi câu trả lời từ lúc viết — bấm Giải thích lại" : ""}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** «1.1.1 Khảo sát địa hình» — luật 30, thiếu tên thì chỉ mã (câu lý do đã nói bên nào chưa tra được) */
const maKemTen = (wbs: string, ten?: string) => (ten && ten.trim() !== "" ? `${wbs} ${ten}` : wbs);

/** Một chỗ hai agent nói khác nhau: MỘT câu + nút «Nguồn» (bấm mới hiện câu hai bên kèm sổ / mã nguồn) + nút 🤖 Giải thích */
function DongMot({
  duAn,
  d,
  uoc,
  daCo,
  onXong,
}: {
  duAn: string;
  d: DongMauThuan;
  uoc: UocChiPhi | null;
  daCo: NhanDinh | undefined;
  onXong: (n: NhanDinh) => void;
}) {
  const [moNguon, setMoNguon] = useState(false);
  // Dòng nhớ từ trước 18/10 (chưa có câu) — rơi về câu ghép từ hai bên
  const cau = d.cau ?? `${maKemTen(d.wbs, d.tenWbs)}: ${d.benA.agent} — ${d.benA.noiDung}; ${d.benB.agent} — ${d.benB.noiDung}.`;
  return (
    <div className="border-t border-border-light pt-1.5 text-[11px]">
      <div className={d.gang ? "font-semibold text-red" : "text-text"}>
        {d.gang ? <span className="text-[10px] font-semibold text-red">găng · </span> : null}
        {ngayTrongChu(cau)}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={() => setMoNguon((x) => !x)}
          aria-expanded={moNguon}
          className="rounded-sm border border-border px-2 py-0.5 text-[10.5px] text-text-secondary hover:border-accent hover:text-accent"
        >
          {moNguon ? "Ẩn nguồn" : "Nguồn"}
        </button>
        <NhanDinhDong duAn={duAn} d={d} uoc={uoc} daCo={daCo} onXong={onXong} />
        {moNguon ? (
          <div className="order-1 basis-full space-y-0.5 text-[10.5px] text-text-secondary">
            <div>
              <b className="text-text">{d.benA.agent}:</b> {ngayTrongChu(d.benA.noiDung)}{" "}
              <span className="text-text-muted">— {d.benA.nguon}</span>
            </div>
            <div>
              <b className="text-text">{d.benB.agent}:</b> {ngayTrongChu(d.benB.noiDung)}{" "}
              <span className="text-text-muted">— {d.benB.nguon}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function KhoiMauThuanCheo({ duAn }: { duAn: string }) {
  const [ket, setKet] = useState<KhoiMauThuan | null>(null);
  const [dangHoi, setDangHoi] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [uoc, setUoc] = useState<UocChiPhi | null>(null);
  const [nhanDinh, setNhanDinh] = useState<Record<string, NhanDinh>>({});

  const hoi = useCallback(
    async (lamMoi: boolean) => {
      setDangHoi(true);
      setLoi(null);
      try {
        const r = await fetch(
          `/api/bang-dieu-hanh/mau-thuan-cheo?du_an=${encodeURIComponent(duAn)}${lamMoi ? "&lam_moi=1" : ""}`,
          { cache: "no-store" },
        );
        const j = (await r.json()) as {
          ok: boolean;
          ket?: KhoiMauThuan;
          uoc?: UocChiPhi;
          nhanDinh?: Record<string, NhanDinh>;
          thong_diep?: string;
        };
        if (j.ok && j.ket) {
          setKet(j.ket);
          setUoc(j.uoc ?? null);
          setNhanDinh(j.nhanDinh ?? {});
        }
        else setLoi(j.thong_diep ?? "Không hỏi được.");
      } catch {
        setLoi("Không gọi được máy chủ của chính Main.");
      } finally {
        setDangHoi(false);
      }
    },
    [duAn],
  );

  useEffect(() => {
    if (duAn) void hoi(false);
  }, [duAn, hoi]);

  return (
    // 28/10/2026 (Mr. Đại): mặc định ĐÓNG, bấm «▸ Mở» mới xổ ra — giống «Luật động» ở trang Báo cáo
    <SectionCard gap title="Chỗ hai agent nói khác nhau">
      <div className="space-y-1.5 py-1 text-[11.5px] text-text-secondary">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Main <b className="text-text">nêu</b>, không sửa số — bấm «Nguồn» để xem hai bên trả lời gì; muốn biết nên tin bên nào thì bấm 🤖 Giải thích.
          </span>
          <button
            type="button"
            onClick={() => void hoi(true)}
            disabled={dangHoi}
            className="ml-auto rounded-sm border border-border px-2 py-0.5 text-[10.5px] font-semibold text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {dangHoi ? "Đang hỏi ba cổng…" : "Soát lại"}
          </button>
        </div>

        {loi ? <div className="text-red">{loi}</div> : null}
        {!ket && !loi ? <div className="text-text-muted">Đang hỏi Công việc · Pháp lý · Hợp đồng · Tiến độ (tối đa 20 mã WBS mỗi loại, găng trước)…</div> : null}

        {ket ? (
          <>
            {ket.dong.length === 0 ? (
              <div>
                <b className="text-text">0 chỗ khác nhau</b> trên {ket.daSoat.hoSo} mã (việc xong ở agent Công việc ↔ hồ sơ pháp lý) và{" "}
                {ket.daSoat.nghiemThu} mã (tiến độ 100% ↔ nghiệm thu hợp đồng).
              </div>
            ) : (
              ket.dong.map((d) => (
                <DongMot
                  key={d.loai + d.wbs}
                  duAn={duAn}
                  d={d}
                  uoc={uoc}
                  daCo={nhanDinh[`${duAn}|${d.loai}|${d.wbs}`]}
                  onXong={(n) => setNhanDinh((cu) => ({ ...cu, [n.khoa]: n }))}
                />
              ))
            )}

            {ket.chuaHoiDuoc.length > 0 ? (
              <div className="text-[10.5px] text-red">
                Chưa hỏi được: {ket.chuaHoiDuoc.join(" · ")}
              </div>
            ) : null}
            {ket.chuaTraDuoc.length > 0 ? (
              <div className="text-[10.5px] text-text-muted">
                Bên kia chưa tra được ({ket.chuaTraDuoc.length} mã — không phải mâu thuẫn, cũng chưa phải sạch):{" "}
                {ket.chuaTraDuoc
                  .slice(0, 5)
                  .map((x) => `${maKemTen(x.wbs, x.tenWbs)}: ${x.lyDo}`)
                  .join(" · ")}
                {ket.chuaTraDuoc.length > 5 ? ` · …còn ${ket.chuaTraDuoc.length - 5} mã` : ""}
              </div>
            ) : null}
            <div className="text-[10px] text-text-muted">
              Soát lúc {ngayGioVN(ket.luc)} · đã hỏi agent Công việc (việc theo mã WBS) · Pháp lý (hồ sơ theo mã WBS) · Tiến độ
              (đường găng, danh sách đầu việc) · Hợp đồng (nghiệm thu theo mã WBS) — mọi lượt có vết trong sổ hỏi–đáp (xem ở Agent quan sát)
            </div>
          </>
        ) : null}
      </div>
    </SectionCard>
  );
}
