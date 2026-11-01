"use client";

// ============================================================
// THẺ MỘT VIỆC ĐỂ NHÚNG (/nhung/viec/[ma]) — Mr. Đại chốt 04/10/2026: ở màn "Việc của tôi" của Main · Tiến độ · Hợp đồng,
// bấm một việc → popup chứa ĐÚNG thẻ việc của agent Công việc (Xong việc · Gia hạn · + Phối hợp · Hủy việc · ý kiến @/@@ · 📎),
// không viết lại ở agent khác (luật 7). Dùng nguyên DongViec của Sơ đồ tổ chức; dựng ViecO qua doi-viec.ts (chung với Sơ đồ).
// Không thanh trên, không khung chat (AppShell bỏ khung cho /nhung/*). Thao tác xong → báo trang cha (postMessage) để tải lại danh sách.
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import type { TuanBaoCao } from "@/lib/phong/tuan";
import type { GiaiDoanViec } from "@/lib/phong/giai-doan-thuan";
import { xepSoDo } from "./bo-cuc";
import { oTatCaCua, taoDoiViec, type DuLieuDoiViec } from "./doi-viec";
import { noiGiaoDichDanh, type ViecApi, type ViecO } from "./viec";
import { DongViec, HopBaoCaoGoc } from "./SoDoPhong";

type DuLieu = DuLieuDoiViec & { tuan: TuanBaoCao; giao_duoc?: "tat_ca" | string[]; giai_doan?: Record<string, GiaiDoanViec> };

/** Báo trang cha (popup ở agent khác) rằng việc vừa đổi — trang cha tự tải lại danh sách */
function baoTrangCha(ma: string, chu: string) {
  try {
    window.parent?.postMessage({ loai: "sci-viec-doi", ma, chu }, "*");
  } catch {
    /* không nằm trong khung nào — bỏ qua */
  }
}

/** Tại chỗ: báo trang cha chiều cao thật (khung cao vừa nội dung) · bấm tiêu đề việc = thu lại (Mr. Đại chốt 07/10) */
function baoCha(loai: string, ma: string, them: Record<string, unknown> = {}) {
  try {
    window.parent?.postMessage({ loai, ma, ...them }, "*");
  } catch {
    /* không nằm trong khung nào */
  }
}

/** xanh = nhúng ở agent khác (Việc của tôi Main · Tiến độ · Hợp đồng — chốt 07/10): chữ/nút cam đổi xanh dương, phong.css .nhan-xanh */
export function TheViecNhung({ ma, taiCho = false, xanh = false }: { ma: string; taiCho?: boolean; xanh?: boolean }) {
  const goc = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = goc.current;
    if (!taiCho || !el || typeof ResizeObserver === "undefined") return;
    const bao = () => baoCha("sci-viec-cao", ma, { cao: el.scrollHeight });
    bao();
    const ro = new ResizeObserver(bao);
    ro.observe(el);
    return () => ro.disconnect();
  }, [taiCho, ma]);
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [mo, setMo] = useState<ViecApi[] | null>(null);
  const [xong, setXong] = useState<ViecApi[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [tin, setTin] = useState("");
  const [bcGoc, setBcGoc] = useState<ViecO | null>(null);

  const tai = useCallback(async () => {
    try {
      const d = await goiApi<DuLieu>("/api/phong/so-do");
      setDl(d);
      const [a, b] = await Promise.all([
        goiApi<{ viec: ViecApi[] }>("/api/so-cai"),
        // Việc đã xong: máy chủ trả mọi việc hoàn thành còn trong thời hạn lưu (lùi tới đầu tuần đang chọn)
        goiApi<{ viec: ViecApi[] }>(`/api/so-cai/da-xong?tu=${d.tuan.tu}`).catch(() => ({ viec: [] as ViecApi[] })),
      ]);
      setMo(a.viec);
      setXong(b.viec);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  useEffect(() => {
    void tai();
  }, [tai]);

  const oTatCa = useMemo(() => (dl ? oTatCaCua(dl) : []), [dl]);
  const bcDu = useMemo(() => (dl ? xepSoDo(oTatCa.map((o) => ({ id: o.id, cha: o.cha, thu_tu: o.thu_tu }))) : null), [dl, oTatCa]);
  const theoId = useMemo(() => Object.fromEntries(oTatCa.map((o) => [o.id, o])), [oTatCa]);
  const v: ViecO | null = useMemo(() => {
    if (!dl || !bcDu || !mo) return null;
    const doi = taoDoiViec(dl, bcDu, theoId);
    const tho = mo.find((x) => x.id === ma) ?? xong?.find((x) => x.id === ma);
    return tho ? doi(tho) : null;
  }, [dl, bcDu, theoId, mo, xong, ma]);
  const tenNgan = (id: string) => (id === bcDu?.goc ? "Ban lãnh đạo" : (theoId[id]?.ten_ngan ?? id));

  let than: React.ReactNode;
  if (loi) than = <div className="trong">Không mở được việc {ma}: {loi}</div>;
  else if (!dl || !mo || !xong) than = <div className="trong">Đang mở việc {ma}…</div>;
  else if (!v) than = <div className="trong">Không tìm thấy việc {ma} — có thể đã bị xoá, hoặc đã xong quá thời hạn lưu.</div>;
  else
    than = (
      <DongViec
        v={v}
        mo
        moi={false}
        homNay={dl.hom_nay}
        tenNgan={tenNgan}
        donVi={noiGiaoDichDanh(dl.o, dl.lanh_dao)}
        giaoDuoc={dl.giao_duoc}
        bat={() => (taiCho ? baoCha("sci-viec-dong", ma) : undefined)}
        moGoc={() => setBcGoc(v)}
        sauThaoTac={async (chu) => {
          setTin(chu);
          await tai();
          baoTrangCha(ma, chu);
        }}
        roi={() => undefined}
      />
    );

  return (
    // Bung tại chỗ: bỏ min-height 100vh của .gd-phong — không thì cao nội dung = cao khung, khung báo cao hơn 2px → lớn mãi (đo 07/10: 1.400px)
    <div ref={goc} className={`gd-phong${xanh ? " nhan-xanh" : ""}`} style={{ background: "var(--p-surface)", ...(taiCho ? { minHeight: 0 } : {}) }}>
      <div className="phai" style={{ border: 0, borderRadius: 0, ...(taiCho ? {} : { minHeight: "100vh" }) }} data-gt="nhung:the-viec">
        {than}
        {tin && <div className="toast">{tin}</div>}
      </div>
      {bcGoc && <HopBaoCaoGoc v={bcGoc} dong={() => setBcGoc(null)} />}
    </div>
  );
}
