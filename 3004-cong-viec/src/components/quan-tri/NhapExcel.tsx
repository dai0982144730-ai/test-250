"use client";
// Thẻ Nhập từ Excel: tải file mẫu → chọn file → kiểm tra (báo lỗi từng dòng) → nhập các dòng hợp lệ.
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { HopLoi, LOP_O_NHAP, Nut, The, Truong, goiApi } from "@/components/layout/giao-dien";
import type { Bao } from "./du-lieu";

interface DongNhap {
  dong: number;
  ho_ten: string;
  email: string;
  don_vi_nhap: string;
  don_vi_id: string | null;
  chuc_vu: string;
  vai_tro: string[];
  loi: string[];
  canh_bao: string[];
  hanh_dong: "tao_moi" | "cap_nhat" | "bo_qua";
}

interface KetQuaNhap {
  tong: number;
  tao_moi: number;
  cap_nhat: number;
  bo_qua: number;
  dong: DongNhap[];
  mat_khau: { email: string; mat_khau: string }[];
}

const NHAN_HANH_DONG: Record<DongNhap["hanh_dong"], { chu: string; mau: string }> = {
  tao_moi: { chu: "Tạo mới", mau: "text-green" },
  cap_nhat: { chu: "Cập nhật", mau: "text-blue" },
  bo_qua: { chu: "Bỏ qua", mau: "text-red" },
};

function taiCsvMatKhau(ds: { email: string; mat_khau: string }[]) {
  const csv = "﻿Email,Mật khẩu lần đầu\n" + ds.map((d) => `${d.email},${d.mat_khau}`).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "mat-khau-tam.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Thu hồi sau khi trình duyệt đã bắt đầu tải (thu hồi ngay có thể làm hỏng lượt tải)
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function NhapExcel({ bao }: { bao: Bao }) {
  const [tep, setTep] = useState<File | null>(null);
  const [matKhau, setMatKhau] = useState("");
  const [capNhat, setCapNhat] = useState(true);
  const [xemTruoc, setXemTruoc] = useState<DongNhap[] | null>(null);
  const [ketQua, setKetQua] = useState<KetQuaNhap | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const [keo, setKeo] = useState(false);
  const oTep = useRef<HTMLInputElement>(null);

  const form = (thu: boolean) => {
    const f = new FormData();
    f.set("tep", tep!);
    f.set("thu", thu ? "1" : "0");
    f.set("cap_nhat", capNhat ? "1" : "0");
    if (matKhau) f.set("mat_khau_ban_dau", matKhau);
    return f;
  };

  async function kiemTra(f: File | null = tep) {
    if (!f) return;
    setDang(true);
    setLoi(null);
    setKetQua(null);
    try {
      const fd = new FormData();
      fd.set("tep", f);
      fd.set("thu", "1");
      fd.set("cap_nhat", capNhat ? "1" : "0");
      if (matKhau) fd.set("mat_khau_ban_dau", matKhau);
      const r = await goiApi<{ dong: DongNhap[] }>("/api/quan-tri/nhap-excel", { form: fd });
      setXemTruoc(r.dong);
    } catch (e) {
      setXemTruoc(null);
      setLoi(e instanceof Error ? e.message : "Không đọc được file");
    } finally {
      setDang(false);
    }
  }

  async function nhap() {
    if (!tep) return;
    setDang(true);
    setLoi(null);
    try {
      const r = await goiApi<KetQuaNhap>("/api/quan-tri/nhap-excel", { form: form(false) });
      setKetQua(r);
      setXemTruoc(null);
      bao(`Đã nhập: ${r.tao_moi} tạo mới, ${r.cap_nhat} cập nhật, ${r.bo_qua} bỏ qua`);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Nhập thất bại");
    } finally {
      setDang(false);
    }
  }

  const chon = (f: File | null) => {
    setTep(f);
    setXemTruoc(null);
    setKetQua(null);
    if (f) void kiemTra(f);
  };

  const ds = ketQua?.dong ?? xemTruoc ?? [];
  const soHopLe = (xemTruoc ?? []).filter((d) => d.hanh_dong !== "bo_qua").length;
  const soLoi = ds.filter((d) => d.loi.length > 0).length;

  return (
    <The
      tieuDe={
        <span>
          Nhập người dùng từ Excel
          <span className="ml-2 text-[11px] font-normal text-text-muted">Cột: Họ tên · Email · Mã đơn vị hoặc tên đơn vị · Chức vụ · Vai trò</span>
        </span>
      }
      phai={
        <a href="/api/quan-tri/nhap-excel/mau" className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary transition hover:border-accent hover:text-accent">
          <Download className="h-3.5 w-3.5" /> Tải file mẫu
        </a>
      }
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setKeo(true);
        }}
        onDragLeave={() => setKeo(false)}
        onDrop={(e) => {
          e.preventDefault();
          setKeo(false);
          chon(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => oTep.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded border border-dashed px-4 py-6 text-center transition ${
          keo ? "border-accent text-accent" : "border-border text-text-muted hover:border-accent/60"
        }`}
      >
        <FileSpreadsheet className="h-7 w-7" />
        <div className="text-[12.5px]">
          {tep ? (
            <span className="text-text">{tep.name}</span>
          ) : (
            <>
              Kéo file Excel vào đây hoặc <span className="text-accent">bấm để chọn</span>
            </>
          )}
        </div>
        <div className="text-[10.5px]">Dòng tiêu đề có cột Email; vai trò nhiều thì cách nhau dấu phẩy; đơn vị ghi mã, tên hoặc tên ngắn</div>
        <input ref={oTep} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => chon(e.target.files?.[0] ?? null)} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Truong nhan="Mật khẩu ban đầu cho người mới" goiY="Để trống = mật khẩu lần đầu của mỗi người là chính email đăng nhập; người dùng tự đổi sau.">
          <input className={LOP_O_NHAP} value={matKhau} onChange={(e) => setMatKhau(e.target.value)} autoComplete="off" />
        </Truong>
        <label className="flex items-center gap-2 self-center text-[12px] text-text-secondary">
          <input type="checkbox" className="accent-[var(--accent)]" checked={capNhat} onChange={(e) => setCapNhat(e.target.checked)} />
          Email đã có tài khoản thì cập nhật tên, đơn vị, chức vụ, vai trò
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Nut disabled={!tep || dang} onClick={() => void kiemTra()}>
          Kiểm tra lại
        </Nut>
        <Nut kieu="chinh" disabled={!xemTruoc || soHopLe === 0 || dang} onClick={() => void nhap()}>
          <Upload className="h-3.5 w-3.5" /> {dang ? "Đang xử lý…" : `Nhập ${soHopLe} dòng hợp lệ`}
        </Nut>
        {xemTruoc && (
          <span className="text-[11.5px] text-text-muted">
            {xemTruoc.length} dòng · {soHopLe} hợp lệ · {soLoi > 0 ? <span className="text-red">{soLoi} dòng lỗi (bỏ qua)</span> : "không có lỗi"}
          </span>
        )}
      </div>

      <div className="mt-3">
        <HopLoi loi={loi} />
      </div>

      {ketQua && (
        <div className="mt-3 rounded-sm border border-green/40 px-3 py-2 text-[12px] text-green">
          Đã nhập xong: {ketQua.tao_moi} tạo mới · {ketQua.cap_nhat} cập nhật · {ketQua.bo_qua} bỏ qua.
          {ketQua.mat_khau.length > 0 && (
            <span className="ml-2">
              <Nut nho onClick={() => taiCsvMatKhau(ketQua.mat_khau)}>
                <Download className="h-3 w-3" /> Tải danh sách mật khẩu lần đầu ({ketQua.mat_khau.length})
              </Nut>
              <span className="ml-2 text-[11px] text-text-muted">chỉ tải được lúc này</span>
            </span>
          )}
        </div>
      )}

      {ds.length > 0 && (
        <div className="scroll-thin mt-3 overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th className="num">Dòng</th>
                <th>Họ tên · Email</th>
                <th>Đơn vị</th>
                <th>Chức vụ</th>
                <th>Vai trò</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {ds.map((d) => (
                <tr key={d.dong}>
                  <td className="num">{d.dong}</td>
                  <td>
                    <div className="text-text">{d.ho_ten || <span className="text-red">(trống)</span>}</div>
                    <div className="text-[11px] text-text-muted">{d.email}</div>
                  </td>
                  <td>
                    {d.don_vi_nhap}
                    {d.don_vi_id && d.don_vi_id !== d.don_vi_nhap && <div className="font-mono text-[10.5px] text-text-muted">{d.don_vi_id}</div>}
                  </td>
                  <td>{d.chuc_vu}</td>
                  <td className="font-mono text-[11px]">{d.vai_tro.join(", ")}</td>
                  <td>
                    <div className={`font-semibold ${NHAN_HANH_DONG[d.hanh_dong].mau}`}>{NHAN_HANH_DONG[d.hanh_dong].chu}</div>
                    {d.loi.map((l, i) => (
                      <div key={i} className="text-[11px] text-red">
                        {l}
                      </div>
                    ))}
                    {d.canh_bao.map((l, i) => (
                      <div key={i} className="text-[11px] text-yellow">
                        {l}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </The>
  );
}
