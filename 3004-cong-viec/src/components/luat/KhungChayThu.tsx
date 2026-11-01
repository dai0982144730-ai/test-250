"use client";
// CHẠY THỬ một luật (chưa lưu cũng được) trên các báo cáo đã có: thanh tóm tắt + danh sách lỗi mẫu có đường dẫn tài liệu.
import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, FileText, FlaskConical, Loader2, RotateCw, XCircle } from "lucide-react";
import type { KetQuaChayThu, LoiLuat, LuatNhap } from "@/lib/luat/types";
import { Nut } from "@/components/layout/giao-dien";
import { moXemTep } from "@/components/dinh-kem/DinhKem";

/** Chữ của dòng / ô bị lỗi: thông điệp lỗi luôn trích tên việc / giá trị trong ngoặc kép ("…" hoặc “…”) */
const chuLoi = (l: Pick<LoiLuat, "thong_diep">) => Array.from(l.thong_diep.matchAll(/["“]([^"”]{6,200})["”]/g), (m) => m[1]);
import { chayThu, LoiLuatApi } from "./api";
import { GhiChu, HuyHieuMuc, tenMau } from "./chung";
import type { DanhMucMau } from "./ThamSoLuat";

export function viTriLoi(l: Pick<LoiLuat, "vi_tri">, dm: DanhMucMau): string {
  const v = l.vi_tri;
  if (!v) return "";
  if (v.bang) {
    const b = dm.bang.find((x) => x.tag === v.bang);
    const c = b?.cot.find((x) => x.tag === v.cot)?.nhan ?? v.cot;
    return `Bảng ${b?.nhan ?? v.bang}${v.dong ? `, dòng ${v.dong}` : ""}${c ? `, cột ${c}` : ""}`;
  }
  if (v.tag?.startsWith("muc:")) return `Mục "${v.tag.slice(4)}"`;
  if (v.tag) return `Ô ${dm.o.find((o) => o.tag === v.tag)?.nhan ?? v.tag}`;
  return "";
}

function ThanhTomTat({ kq }: { kq: KetQuaChayThu }) {
  const tong = Math.max(kq.so_tai_lieu, 1);
  const phan = [
    { so: kq.so_dat, mau: "bg-green", nhan: "đạt", chu: "text-green" },
    { so: kq.so_khong_dat, mau: "bg-red", nhan: "không đạt", chu: "text-red" },
    {
      so: kq.so_bo_qua,
      mau: "bg-white/15",
      nhan: "bỏ qua",
      chu: "text-text-muted",
    },
  ];
  return (
    <div className="rounded-sm border border-border p-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
        <span className="font-bold text-text">{kq.so_tai_lieu} báo cáo</span>
        {phan.map((p) => (
          <span key={p.nhan} className={`inline-flex items-center gap-1.5 ${p.chu}`}>
            <span className="text-text-muted">·</span>
            <span className="font-bold tabular-nums">{p.so}</span> {p.nhan}
          </span>
        ))}
      </div>
      <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
        {phan.map((p) => (p.so ? <div key={p.nhan} className={`${p.mau} transition-all duration-500`} style={{ width: `${(p.so / tong) * 100}%` }} /> : null))}
      </div>
      {kq.so_bo_qua > 0 && <p className="mt-1.5 text-[10.5px] text-text-muted">Bỏ qua = báo cáo không thuộc mẫu áp dụng hoặc không đọc được.</p>}
    </div>
  );
}

export function KhungChayThu({ luat, dm, lyDoKhong }: { luat: LuatNhap; dm: DanhMucMau; lyDoKhong?: string | null }) {
  const [kq, setKq] = useState<KetQuaChayThu | null>(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [moDat, setMoDat] = useState(false);
  const [daChay, setDaChay] = useState<string | null>(null);
  const khoa = JSON.stringify([luat.cach_kiem, luat.loai, luat.tham_so, luat.huong_dan_ai, luat.ap_dung, luat.muc]);
  const cu = !!kq && daChay !== khoa;

  async function chay() {
    setDang(true);
    setLoi(null);
    try {
      setKq(await chayThu(luat));
      setDaChay(khoa);
    } catch (e) {
      setLoi(e instanceof LoiLuatApi && e.danhSach.length ? `${e.message}: ${e.danhSach.join("; ")}` : e instanceof Error ? e.message : "Không chạy thử được");
    } finally {
      setDang(false);
    }
  }

  const khongDat = kq?.mau.filter((m) => !m.dat) ?? [];
  const dat = kq?.mau.filter((m) => m.dat) ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Nut onClick={() => void chay()} disabled={dang || !!lyDoKhong} title={lyDoKhong ?? undefined}>
          {dang ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : kq ? <RotateCw className="h-3.5 w-3.5" /> : <FlaskConical className="h-3.5 w-3.5" />}
          {dang ? "Đang chạy thử…" : kq ? "Chạy thử lại" : "Chạy thử trên báo cáo đã có"}
        </Nut>
        <span className="text-[11px] text-text-muted">
          {lyDoKhong ?? (luat.cach_kiem === "code" ? "Chạy trên mọi báo cáo đã tải lên, không lưu gì." : "Luật AI chỉ chạy trên vài báo cáo mẫu để đỡ tốn AI.")}
        </span>
      </div>
      {loi && <GhiChu loai="loi">{loi}</GhiChu>}
      {kq && (
        <div className={`space-y-3 transition-opacity ${dang ? "opacity-50" : ""}`}>
          {cu && <GhiChu loai="canh_bao">Luật đã đổi sau lần chạy thử này — bấm &quot;Chạy thử lại&quot; để xem kết quả mới.</GhiChu>}
          {kq.so_tai_lieu > 0 && <ThanhTomTat kq={kq} />}
          {kq.so_tai_lieu === 0 ? (
            <div className="flex items-start gap-2.5 rounded-sm border border-dashed border-border px-3 py-3 text-[12px] text-text-secondary">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
              <span>
                Chưa có báo cáo nào trong hệ thống để chạy thử. Tải một báo cáo lên ở{" "}
                <Link href="/gui-bao-cao" target="_blank" className="text-accent hover:underline">
                  Gửi báo cáo
                </Link>{" "}
                rồi chạy thử lại — luật vẫn lưu được bình thường.
              </span>
            </div>
          ) : khongDat.length === 0 ? (
            <div className="flex items-center gap-2 text-[12px] text-green">
              <CheckCircle2 className="h-4 w-4" /> Mọi báo cáo đều đạt luật này.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {khongDat.map((m) => (
                <li key={m.tai_lieu_id} className="rounded-sm border border-border-light px-3 py-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red" />
                    <button
                      type="button"
                      onClick={() => moXemTep(m.tai_lieu_id, m.ten, "tai_lieu", m.loi.flatMap(chuLoi))}
                      title="Mở báo cáo — khung cam là chỗ bị lỗi"
                      className="min-w-0 truncate text-left text-[12.5px] font-semibold text-text hover:text-accent hover:underline"
                    >
                      {m.ten}
                    </button>
                    {m.mau_ma && <span className="shrink-0 rounded-[4px] border border-border px-1 text-[10px] text-text-muted">{tenMau(m.mau_ma)}</span>}
                  </div>
                  <ul className="mt-1 space-y-1 pl-[22px]">
                    {m.loi.slice(0, 4).map((l, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11.5px]">
                        <HuyHieuMuc muc={l.muc} nho className="mt-px" />
                        <span className="min-w-0 text-text-secondary">
                          {l.thong_diep}
                          {viTriLoi(l, dm) && <span className="ml-1.5 font-mono text-[10.5px] text-text-muted">{viTriLoi(l, dm)}</span>}
                        </span>
                      </li>
                    ))}
                    {m.loi.length > 4 && <li className="text-[10.5px] text-text-muted">… và {m.loi.length - 4} lỗi khác</li>}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          {dat.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setMoDat((x) => !x)}
                className="inline-flex items-center gap-1 text-[11.5px] text-text-muted hover:text-text"
                aria-expanded={moDat}
              >
                {moDat ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                {moDat ? "Ẩn" : "Xem"} {dat.length} báo cáo đạt
              </button>
              {moDat && (
                <ul className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 pl-5 sm:grid-cols-2">
                  {dat.map((m) => (
                    <li key={m.tai_lieu_id} className="flex min-w-0 items-center gap-1.5 text-[11.5px]">
                      <FileText className="h-3 w-3 shrink-0 text-green" />
                      <button type="button" onClick={() => moXemTep(m.tai_lieu_id, m.ten, "tai_lieu")} className="truncate text-left text-text-secondary hover:text-accent hover:underline">
                        {m.ten}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
