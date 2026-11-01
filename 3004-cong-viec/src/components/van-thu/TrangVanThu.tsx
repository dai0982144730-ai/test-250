"use client";
// ĐANG ẨN (25/09/2026, theo yêu cầu "trang này bỏ không cần"): /van-thu chuyển về Thư mục & gửi. Bật lại: cho app/van-thu/page.tsx
// render <TrangVanThu /> và thêm lại dòng menu trong lib/dieu-huong.ts.
// SỔ VĂN BẢN ĐẾN: văn thư (quyền van_thu.nhap_den) nhập thay người ngoài công ty (đối tác, nhà thầu,
// cơ quan nhà nước...). Số đến tự tăng theo năm; văn bản vào Đến của đơn vị văn thư rồi chuyển đơn vị xử lý.
// Lịch sử và cây hành trình luôn ghi đúng người gửi thật.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Forward, Inbox, Loader2, Search, Upload } from "lucide-react";
import ONhapNgay from "@/components/common/ONhapNgay";
import type { DongSoDen } from "@/lib/van-thu/dich-vu";
import { NutChinh, NutPhu, The, ThongDiep, goiApi, goiForm, ngayGio, ngayVN } from "@/components/gui/chung";

interface DuLieu {
  so: DongSoDen[];
  la_van_thu: boolean;
  don_vi: { id: string; ten: string }[];
  don_vi_van_thu: string | null;
}

const o = "rounded-sm border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-accent";

function ChuyenXuLy({ dong, donVi, boQua, onXong }: { dong: DongSoDen; donVi: DuLieu["don_vi"]; boQua: string | null; onXong: (m: string) => void }) {
  const [dv, setDv] = useState("");
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  if (dong.don_vi_xu_ly) return <span className="text-xs text-text-secondary">→ {dong.don_vi_xu_ly_ten}</span>;
  return (
    <div className="flex items-center gap-1">
      <select value={dv} onChange={(e) => setDv(e.target.value)} className="max-w-[170px] rounded-sm border border-border bg-bg px-1.5 py-1 text-xs text-text">
        <option value="">Chuyển cho…</option>
        {donVi.filter((d) => d.id !== boQua).map((d) => (
          <option key={d.id} value={d.id}>{d.ten}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={!dv || dang}
        onClick={async () => {
          setDang(true);
          setLoi(null);
          try {
            await goiApi(`/api/van-thu/${encodeURIComponent(dong.id)}/chuyen`, { don_vi: dv });
            onXong(`Đã chuyển văn bản số ${dong.so_den} cho ${donVi.find((d) => d.id === dv)?.ten}.`);
          } catch (e) {
            setLoi(e instanceof Error ? e.message : String(e));
          } finally {
            setDang(false);
          }
        }}
        className="rounded-sm border border-border p-1 text-text-secondary hover:border-accent hover:text-accent disabled:opacity-40"
        aria-label="Chuyển xử lý"
        title={loi ?? "Chuyển xử lý"}
      >
        {dang ? <Loader2 size={12} className="animate-spin" /> : <Forward size={12} />}
      </button>
      {loi ? <span className="text-[11px] text-red">{loi}</span> : null}
    </div>
  );
}

export function TrangVanThu() {
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [tuKhoa, setTuKhoa] = useState("");
  const [nam, setNam] = useState(String(new Date().getFullYear()));
  const [thong, setThong] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const [f, setF] = useState({ noi_gui: "", so_ky_hieu: "", ngay_van_ban: "", hinh_thuc: "giay", email_gui: "", trich_yeu: "", don_vi_xu_ly: "" });
  const [tep, setTep] = useState<File | null>(null);
  const oTep = useRef<HTMLInputElement>(null);

  const tai = useCallback(async () => {
    const u = new URLSearchParams();
    if (nam) u.set("nam", nam);
    if (tuKhoa.trim()) u.set("tu_khoa", tuKhoa.trim());
    try {
      setDl(await goiApi<DuLieu>(`/api/van-thu?${u}`));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, [nam, tuKhoa]);
  useEffect(() => {
    const t = setTimeout(tai, tuKhoa ? 250 : 0);
    return () => clearTimeout(t);
  }, [tai, tuKhoa]);

  async function vaoSo() {
    if (!tep) return;
    setDang(true);
    setLoi(null);
    try {
      const fd = new FormData();
      for (const [k, v] of Object.entries(f)) fd.set(k, v);
      fd.set("tep", tep);
      const r = await goiForm<{ so_den: number; nam: number; tai_lieu_id: string }>("/api/van-thu", fd);
      setThong(`Đã vào sổ văn bản đến số ${r.so_den}/${r.nam}${f.don_vi_xu_ly ? " và chuyển đơn vị xử lý" : ""}.`);
      setF({ noi_gui: "", so_ky_hieu: "", ngay_van_ban: "", hinh_thuc: "giay", email_gui: "", trich_yeu: "", don_vi_xu_ly: "" });
      setTep(null);
      void tai();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-text">Sổ văn bản đến</h1>
        <p className="text-sm text-text-secondary">
          Văn bản của người ngoài công ty (giấy hoặc email) do văn thư vào sổ, rồi chuyển đơn vị xử lý. Văn bản đến không tự sinh việc — cần làm gì thì giao việc trên ứng dụng. Lịch sử luôn ghi đúng nơi gửi thật.
        </p>
      </div>
      {thong ? <div className="mb-3"><ThongDiep loai="ok" onDong={() => setThong(null)}>{thong}</ThongDiep></div> : null}
      {loi ? <div className="mb-3"><ThongDiep loai="loi" onDong={() => setLoi(null)}>{loi}</ThongDiep></div> : null}

      {dl?.la_van_thu ? (
        <div className="mb-4">
          <The tieuDe={<span className="inline-flex items-center gap-2"><Inbox size={15} /> Vào sổ văn bản đến</span>}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="text-xs text-text-muted md:col-span-2">
                Nơi gửi (cơ quan, đối tác) *
                <input value={f.noi_gui} onChange={(e) => setF({ ...f, noi_gui: e.target.value })} placeholder="vd UBND huyện Hướng Hóa" className={`mt-1 block w-full ${o}`} />
              </label>
              <label className="text-xs text-text-muted">
                Số, ký hiệu
                <input value={f.so_ky_hieu} onChange={(e) => setF({ ...f, so_ky_hieu: e.target.value })} placeholder="125/UBND-TNMT" className={`mt-1 block w-full ${o}`} />
              </label>
              <label className="text-xs text-text-muted md:col-span-2">
                Trích yếu *
                <input value={f.trich_yeu} onChange={(e) => setF({ ...f, trich_yeu: e.target.value })} placeholder="V/v phương án bồi thường GPMB Trụ T11" className={`mt-1 block w-full ${o}`} />
              </label>
              <label className="text-xs text-text-muted">
                Ngày văn bản
                <ONhapNgay value={f.ngay_van_ban} onChange={(x) => setF({ ...f, ngay_van_ban: x })} className={`mt-1 block w-full ${o}`} aria-label="Ngày văn bản" />
              </label>
              <div className="text-xs text-text-muted">
                Hình thức
                <div className="mt-1 flex gap-3 text-sm text-text">
                  {[["giay", "Giấy"], ["email", "Email"]].map(([v, t]) => (
                    <label key={v} className="inline-flex items-center gap-1.5">
                      <input type="radio" name="hinh_thuc" checked={f.hinh_thuc === v} onChange={() => setF({ ...f, hinh_thuc: v })} /> {t}
                    </label>
                  ))}
                </div>
              </div>
              {f.hinh_thuc === "email" ? (
                <label className="text-xs text-text-muted">
                  Email gửi
                  <input value={f.email_gui} onChange={(e) => setF({ ...f, email_gui: e.target.value })} className={`mt-1 block w-full ${o}`} />
                </label>
              ) : <div />}
              <label className="text-xs text-text-muted">
                Chuyển đơn vị xử lý (có thể để sau)
                <select value={f.don_vi_xu_ly} onChange={(e) => setF({ ...f, don_vi_xu_ly: e.target.value })} className={`mt-1 block w-full ${o}`}>
                  <option value="">Chưa chuyển</option>
                  {dl.don_vi.filter((d) => d.id !== dl.don_vi_van_thu).map((d) => (
                    <option key={d.id} value={d.id}>{d.ten}</option>
                  ))}
                </select>
              </label>
            </div>
            <input ref={oTep} type="file" className="hidden" onChange={(e) => { setTep(e.target.files?.[0] ?? null); e.target.value = ""; }} />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <NutPhu onClick={() => oTep.current?.click()}>
                <Upload size={14} /> {tep ? tep.name : "Chọn file (bản chụp giấy hoặc file email) *"}
              </NutPhu>
              <NutChinh onClick={() => void vaoSo()} disabled={dang || !tep || !f.noi_gui.trim() || !f.trich_yeu.trim()}>
                {dang ? <Loader2 size={14} className="animate-spin" /> : <Inbox size={14} />} Vào sổ
              </NutChinh>
            </div>
          </The>
        </div>
      ) : null}

      <The
        tieuDe="Sổ văn bản đến"
        phai={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 rounded-sm border border-border bg-bg px-2 py-1 text-sm text-text-muted focus-within:border-accent">
              <Search size={13} />
              <input value={tuKhoa} onChange={(e) => setTuKhoa(e.target.value)} placeholder="Nơi gửi, số ký hiệu, trích yếu…" className="w-56 bg-transparent text-text outline-none placeholder:text-text-muted" />
            </label>
            <input value={nam} onChange={(e) => setNam(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-16 rounded-sm border border-border bg-bg px-2 py-1 text-sm text-text" aria-label="Năm" />
          </div>
        }
      >
        {!dl ? (
          <Loader2 size={16} className="animate-spin text-text-muted" />
        ) : dl.so.length === 0 ? (
          <p className="text-sm text-text-muted">Chưa có văn bản đến nào trong năm {nam}.</p>
        ) : (
          <div className="scroll-thin overflow-x-auto">
            <table className="tbl" style={{ minWidth: 900 }}>
              <thead>
                <tr>
                  <th className="num">Số đến</th>
                  <th>Nơi gửi</th>
                  <th>Số, ký hiệu · ngày</th>
                  <th>Trích yếu</th>
                  <th>Hình thức</th>
                  <th>Vào sổ</th>
                  <th>Xử lý</th>
                </tr>
              </thead>
              <tbody>
                {dl.so.map((s) => (
                  <tr key={s.id}>
                    <td className="num font-mono text-text">
                      {s.so_den}
                      <span className="text-text-muted">/{s.nam}</span>
                    </td>
                    <td className="text-text">{s.noi_gui}</td>
                    <td>
                      {s.so_ky_hieu ?? "—"}
                      {s.ngay_van_ban ? <div className="text-[11px] text-text-muted">{ngayVN(s.ngay_van_ban)}</div> : null}
                    </td>
                    <td>
                      <Link href={`/tai-lieu/${s.tai_lieu_id}`} className="text-accent hover:underline">
                        {s.trich_yeu ?? s.ten_tep}
                      </Link>
                    </td>
                    <td>{s.hinh_thuc === "email" ? `Email${s.email_gui ? ` · ${s.email_gui}` : ""}` : "Giấy"}</td>
                    <td className="text-xs">
                      {ngayGio(s.nhap_luc, true)}
                      <div className="text-text-muted">{s.nhap_boi_ten}</div>
                    </td>
                    <td>
                      {dl.la_van_thu ? (
                        <ChuyenXuLy dong={s} donVi={dl.don_vi} boQua={dl.don_vi_van_thu} onXong={(m) => { setThong(m); void tai(); }} />
                      ) : s.don_vi_xu_ly_ten ? (
                        <span className="text-xs">→ {s.don_vi_xu_ly_ten}</span>
                      ) : (
                        <span className="text-xs text-text-muted">chưa chuyển</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </The>
    </div>
  );
}
