"use client";
// Tổng quan · cột trái "Việc của tôi": phần việc tôi / bộ phận tôi đang làm, Đóng việc ngay tại đây
// (báo cáo ngắn → người giao việc + cấp trên; lãnh đạo đóng thì mọi phòng + Ban lãnh đạo được báo).
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import type { DongPhanViec } from "./du-lieu";
import { goiApi, napDanhMuc, type DanhMuc } from "@/components/so-cai/giao-dien";
import { HopGiaoViec } from "@/components/so-cai/HopGiaoViec";

function ngay(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Tình trạng: Chưa đến hạn / Đến hạn chưa xong (quá hạn tô vàng/đỏ theo ngưỡng). */
export function TinhTrangHan({ han, soNgayCon, vang = 3 }: { han: string | null; soNgayCon: number | null; vang?: number }) {
  if (!han || soNgayCon === null) return <span className="text-[11px] text-yellow">thiếu ngày kết thúc</span>;
  const n = soNgayCon;
  if (n > 0) return <span className="text-[11px] text-text-secondary">{ngay(han)} · <b className="text-green">còn {n} ngày</b></span>;
  const mau = -n > vang ? "text-red" : "text-yellow";
  return (
    <span className="text-[11px] text-text-secondary">
      {ngay(han)} · <b className={mau}>{n === 0 ? "đến hạn hôm nay" : `quá hạn ${-n} ngày`}</b>
    </span>
  );
}

export function ViecCuaToi({ ds, vang }: { ds: DongPhanViec[]; vang: number }) {
  const router = useRouter();
  const [mo, setMo] = useState<string | null>(null);
  const [baoCao, setBaoCao] = useState("");
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState<string | null>(null);

  async function dong(d: DongPhanViec) {
    if (!baoCao.trim()) return setLoi("Gõ vài dòng báo cáo cho người giao việc trước khi đóng");
    setDang(true);
    setLoi(null);
    try {
      const r = await goiApi<{ tien_do: string; hoan_thanh: boolean }>(`/api/cong-viec/${encodeURIComponent(d.cong_viec_id)}`, {
        hanh_dong: "ket_thuc",
        phan_viec_id: d.id,
        ghi_chu: baoCao.trim(),
        tep_ket_qua: [],
      });
      setXong(r.hoan_thanh ? `Đã đóng ${d.cong_viec_id}: việc hoàn thành. Người giao việc và cấp trên đã được báo.` : `Đã đóng phần của bạn trong ${d.cong_viec_id} (${r.tien_do}).`);
      setMo(null);
      setBaoCao("");
      router.refresh();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  if (!ds.length) return <p className="px-4 py-6 text-center text-[12px] text-text-muted">Không có việc nào đang mở cho bạn hoặc bộ phận bạn.</p>;
  return (
    <>
      {xong ? <div className="border-b border-border px-4 py-2 text-[12px] text-green">{xong}</div> : null}
      <ul className="divide-y divide-border-light">
        {ds.map((d) => (
          <li key={d.id} className={`px-4 py-2.5 ${mo === d.id ? "bg-bg" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <Link href={`/cong-viec/${encodeURIComponent(d.cong_viec_id)}`} className="min-w-0 hover:underline">
                <span className="mr-1.5 font-mono text-[11px] text-text-muted">{d.cong_viec_id}</span>
                <span className="text-[12.5px] font-semibold text-text">{d.ten_viec}</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMo(mo === d.id ? null : d.id);
                  setBaoCao("");
                  setLoi(null);
                }}
                className={`shrink-0 rounded-sm border px-2 py-0.5 text-[11px] ${mo === d.id ? "border-border text-text-secondary" : "border-accent text-accent hover:bg-accent hover:text-white"}`}
              >
                {mo === d.id ? "Hủy" : "Xong việc"}
              </button>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-3 text-[11px] text-text-secondary">
              <span className="truncate">
                {d.phu_trach_loai === "don_vi" ? d.phu_trach_ten : "Cá nhân bạn"}
                {d.du_an && ` · ${d.du_an}`}
                {d.cho_sua && <span className="text-yellow"> · đang chờ sửa tài liệu nguồn</span>}
              </span>
              <TinhTrangHan han={d.han} soNgayCon={d.so_ngay_con} vang={vang} />
            </div>
            {mo === d.id ? (
              <div className="mt-2">
                <div className="flex flex-wrap items-start gap-2">
                  <textarea
                    autoFocus
                    rows={2}
                    value={baoCao}
                    onChange={(e) => setBaoCao(e.target.value)}
                    placeholder="Báo cáo ngắn gọn cho người giao việc…"
                    className="min-w-[240px] flex-1 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[12.5px] text-text outline-none focus:border-accent"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={dang}
                      onClick={() => void dong(d)}
                      className="inline-flex items-center gap-1 rounded-sm bg-accent px-2.5 py-1.5 text-[12px] text-white hover:bg-accent-hover disabled:opacity-60"
                    >
                      {dang ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Gửi báo cáo & đóng
                    </button>
                    <button type="button" onClick={() => setMo(null)} className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-text">
                      <X size={11} /> Hủy
                    </button>
                  </div>
                </div>
                {loi ? <div className="mt-1 text-[12px] text-red">{loi}</div> : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Nút Giao việc trên Tổng quan (chỉ hiện với người được giao việc). */
export function NutGiaoViec() {
  const router = useRouter();
  const [dm, setDm] = useState<DanhMuc | null>(null);
  const [mo, setMo] = useState(false);
  useEffect(() => {
    napDanhMuc().then(setDm).catch(() => undefined);
  }, []);
  if (!dm?.toi?.co_the_giao) return null;
  return (
    <>
      <button type="button" onClick={() => setMo(true)} className="inline-flex items-center gap-1 rounded-sm bg-accent px-3 py-1.5 text-[12.5px] text-white hover:bg-accent-hover">
        <Plus size={14} /> Giao việc
      </button>
      {mo ? (
        <HopGiaoViec
          dm={dm}
          onDong={() => setMo(false)}
          onXong={() => {
            setMo(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
