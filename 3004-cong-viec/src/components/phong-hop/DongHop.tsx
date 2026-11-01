"use client";
// ============================================================
// DongHop — DÒNG CHỮ ĐỎ báo họp ở thanh trên, ngay bên phải chuông (Mr. Đại chốt 25/10/2026): tin mời họp KHÔNG cộng vào con số
// chuông mà hiện «15:00 họp … · Phòng họp 09». Hai cuộc trở lên → chữ CHẠY trong ô rộng cố định (không dài hết thanh trên).
// Dòng chữ KHÔNG liên quan tới chuông: chuông giữ con số, màu, nhấp nháy của tin công việc như cũ; dòng chữ đứng bên phải chuông.
// Nhấp nháy khi chưa bấm xem, và lại nhấp nháy 15 phút trước giờ họp; còn lại chữ đỏ đứng yên; họp xong thì tắt (thuan.ts).
// Bấm → khung chi tiết từng cuộc + đánh dấu đã xem. Chuông nhúng ở agent khác (nhung) cũng dùng — mở khung thì báo trang cha nở ra.
// ============================================================
import "./phong-hop.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { bayGioVN, chuDongHop, khoangGio, laDuongDanHop, ngayVN, nhapNhay, phongTheoId, tenThu, thuCua, type HopCuaToi } from "@/lib/phong-hop/thuan";

export function DongHop({ nhung = false }: { nhung?: boolean }) {
  const [ds, setDs] = useState<HopCuaToi[]>([]);
  const [bay, setBay] = useState(() => bayGioVN());
  const [mo, setMo] = useState(false);
  const boc = useRef<HTMLSpanElement>(null);
  const nut = useRef<HTMLButtonElement>(null);
  const [tran, setTran] = useState(false); // chữ dài hơn ô (ô co theo chỗ trống thanh trên) → cho chạy
  useEffect(() => {
    const b = nut.current;
    if (!b) return;
    // Đo bề rộng CHỮ (tổng các đoạn chữ con), không đo cả khối chạy — khối chạy có đệm trái 100% khi đang chạy, đo nó thì
    // kết quả lật qua lật lại mỗi khung hình (đo 26/10: 120 lần / 2 giây) → chữ chớp tại chỗ, trang đơ không bấm được
    const do_ = () => {
      const c = b.querySelector<HTMLElement>(".chay");
      if (!c) return;
      const rongChu = Array.from(c.children).reduce((t, e) => t + (e as HTMLElement).getBoundingClientRect().width, 0);
      const cs = getComputedStyle(b);
      const cho = b.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setTran(rongChu > cho + 1);
    };
    do_();
    const ro = new ResizeObserver(do_);
    ro.observe(b);
    return () => ro.disconnect();
  });
  const tai = useCallback(async () => {
    const r = await goiApi<{ hop: HopCuaToi[] }>("/api/phong-hop/cua-toi").catch(() => null);
    if (r) setDs(r.hop);
  }, []);
  useEffect(() => {
    void tai();
    const t1 = window.setInterval(() => document.visibilityState === "visible" && void tai(), 60_000);
    const t2 = window.setInterval(() => setBay(bayGioVN()), 20_000);
    const len = () => document.visibilityState === "visible" && void tai();
    document.addEventListener("visibilitychange", len);
    return () => (window.clearInterval(t1), window.clearInterval(t2), document.removeEventListener("visibilitychange", len));
  }, [tai]);
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => boc.current && !boc.current.contains(e.target as Node) && setMo(false);
    document.addEventListener("mousedown", ngoai);
    return () => document.removeEventListener("mousedown", ngoai);
  }, [mo]);
  // Trang cha bấm ra ngoài khung nhúng → đóng khung chi tiết (giống hộp chuông)
  useEffect(() => {
    if (!nhung) return;
    const nghe = (e: MessageEvent) => e.source === window.parent && (e.data as { loai?: string } | null)?.loai === "sci-chuong-dong" && setMo(false);
    window.addEventListener("message", nghe);
    return () => window.removeEventListener("message", nghe);
  }, [nhung]);
  // Trang cha (Main · Tiến độ · Hợp đồng…) cần nới khung nhúng cho dòng chữ và khung chi tiết
  const hien =ds.filter((c) => c.ngay > bay.ngay || (c.ngay === bay.ngay && Number(c.den.slice(0, 2)) * 60 + Number(c.den.slice(3)) > bay.phut));
  useEffect(() => {
    if (!nhung) return;
    // Báo theo cuộc CÒN HIỆN (kiểm lần 7 X10: trước báo theo ds nên họp xong khung cha vẫn nở thêm tới 60 giây)
    window.parent?.postMessage({ loai: "sci-chuong-rong", rong: hien.length ? 300 : 0, mo }, "*");
  }, [nhung, hien.length, mo]);
  if (!hien.length) return null;
  const chu = hien.map((c) => chuDongHop(c, bay)).join("   ·   ");
  const nhay = hien.some((c) => nhapNhay(c, bay));
  const lan = hien.length > 1 || tran;
  const moKhung = () => {
    setMo((m) => !m);
    const chuaXem = hien.filter((c) => !c.da_xem).map((c) => c.id);
    if (chuaXem.length) {
      setDs((d) => d.map((c) => (chuaXem.includes(c.id) ? { ...c, da_xem: true } : c)));
      void goiApi("/api/phong-hop/cua-toi", { body: { ids: chuaXem } }).catch(() => undefined);
    }
  };
  return (
    <span ref={boc} className="dong-hop" data-gt="dong-hop">
      <button ref={nut} type="button" className={nhay ? "nhay" : ""} onClick={moKhung} title={`${hien.length} cuộc họp sắp tới — bấm để xem chi tiết`}>
        {/* Từ 2 cuộc trở lên: mỗi cuộc một màu, đỏ – trắng xen kẽ (Mr. Đại 25/10/2026) — liếc là biết có nhiều cuộc */}
        <span className={`chay ${lan ? "lan" : ""}`} style={{ ["--ph-t" as string]: `${Math.max(10, Math.round(chu.length / 6))}s` }}>
          {hien.map((c, i) => (
            <span key={c.id} className={i % 2 ? "trang" : "do"}>
              {i ? "   ·   " : ""}
              {chuDongHop(c, bay)}
            </span>
          ))}
        </span>
      </button>
      {mo && (
        <div className="hop-ds">
          <b>Cuộc họp của bạn</b>
          {hien.map((c) => (
            <div key={c.id} className="muc">
              <div className="dau">{c.noi_dung}</div>
              <div>
                {khoangGio(c.tu, c.den)} · {tenThu(thuCua(c.ngay))} {ngayVN(c.ngay)} · {phongTheoId(c.phong)?.ten}
              </div>
              <div>
                Người tổ chức: <b>{c.nguoi_dat_ten}</b>
                {c.loai === "giao_ban" ? " · họp giao ban" : ""}
              </div>
              <div>
                Người dự ({c.moi.length}): {c.moi.map((m) => m.ten).join(", ")}
              </div>
              {c.khach_ngoai && <div>Khách mời ngoài: {c.khach_ngoai}</div>}
              {c.duong_dan && (
                <div>
                  Họp trực tuyến:{" "}
                  {laDuongDanHop(c.duong_dan) ? (
                    <a href={c.duong_dan} target="_blank" rel="noopener noreferrer">
                      {c.duong_dan}
                    </a>
                  ) : (
                    c.duong_dan
                  )}
                </div>
              )}
              {c.ghi_chu && <div>Dặn: {c.ghi_chu}</div>}
            </div>
          ))}
          <a href={`/phong-hop?ngay=${hien[0].ngay}`} target={nhung ? "_blank" : undefined} rel="noreferrer">
            Mở màn Phòng họp →
          </a>
        </div>
      )}
    </span>
  );
}
