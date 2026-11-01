"use client";
// Trình sửa từng nhóm cài đặt. Nhóm "Quy tắc đè, luôn mở" làm đúng như hình mẫu trong kế hoạch v2.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Braces, Lock, Plus, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import type { CauHinh, KhoaCauHinh } from "@/lib/cau-hinh/mac-dinh";
import { NHOM_CAU_HINH } from "@/lib/cau-hinh/mac-dinh";
import { BAO_MAT_SMTP, BIEU_MAU, LOAI_KENH_THEO_SO_CAI, LOAI_THU_MUC, NHAN_LOAI_THONG_BAO, THU_TU_UU_TIEN, datTheoDuong } from "@/lib/cau-hinh/bieu-mau";
import { CongTac, LOP_O_NHAP, Nut } from "@/components/layout/giao-dien";
import { ChonNhieu, DanhSachChu, DongCongTac, TruongTuDong, type DanhMucCaiDat, type PropsNhom } from "./o-nhap";

function Muc({ tieuDe, children, moTa }: { tieuDe: string; moTa?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-text-muted">{tieuDe}</div>
      {moTa && <p className="-mt-1 mb-2 text-[11px] text-text-muted">{moTa}</p>}
      {children}
    </div>
  );
}

const luaChonDonVi = (dm: DanhMucCaiDat, sao = false) => [
  ...(sao ? [{ gia_tri: "*", nhan: "Mọi đơn vị (*)" }] : []),
  ...dm.don_vi.filter((d) => d.active).map((d) => ({ gia_tri: d.id, nhan: `${d.ten_ngan} (cấp ${d.cap})` })),
];

// ---------------- Quy tắc đè, luôn mở (theo hình mẫu) ----------------

export function NhomQuyTacDe({ giaTri: v, doi, tat }: PropsNhom<CauHinh["quy_tac_de"]>) {
  const dat = <K extends keyof CauHinh["quy_tac_de"]>(k: K, x: CauHinh["quy_tac_de"][K]) => doi({ ...v, [k]: x });
  return (
    <>
      <Muc tieuDe="Thứ tự ưu tiên khi việc trùng">
        <div className="grid gap-2 md:grid-cols-2">
          {THU_TU_UU_TIEN.map((l) => (
            <label
              key={l.gia_tri}
              className={`flex cursor-pointer items-start gap-2.5 rounded-sm border px-3 py-2.5 transition ${
                v.thu_tu === l.gia_tri ? "border-accent" : "border-border hover:border-accent/50"
              } ${tat ? "cursor-default" : ""}`}
            >
              <input type="radio" name="thu_tu" className="mt-0.5 accent-[var(--accent)]" disabled={tat} checked={v.thu_tu === l.gia_tri} onChange={() => dat("thu_tu", l.gia_tri)} />
              <span>
                <b className="block text-[12.5px] text-text">{l.nhan}</b>
                <small className="text-[11px] text-text-muted">{l.mo_ta}</small>
              </span>
            </label>
          ))}
        </div>
      </Muc>
      <Muc tieuDe={"\"Ngày sau\" tính theo"}>
        <div className="inline-flex overflow-hidden rounded-sm border border-border" role="radiogroup" aria-label="Ngày so sánh">
          {(
            [
              ["ky_bao_cao", "Kỳ báo cáo"],
              ["ngay_gui", "Ngày bấm gửi"],
            ] as const
          ).map(([k, n]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={v.ngay_sau_tinh_theo === k}
              disabled={tat}
              onClick={() => dat("ngay_sau_tinh_theo", k)}
              className={`px-4 py-1.5 text-[12px] font-semibold transition ${v.ngay_sau_tinh_theo === k ? "bg-accent text-white" : "text-text-secondary hover:text-text"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </Muc>
      <Muc tieuDe="Công tắc">
        <DongCongTac
          nhan={"\"Đã xong\" luôn được ghi nhận"}
          moTa="Người phụ trách hoặc đơn vị thực hiện báo xong thì đóng, không xét cấp"
          bat={v.da_xong_luon_ghi_nhan}
          doi={(b) => dat("da_xong_luon_ghi_nhan", b)}
          tat={tat}
        />
        <DongCongTac nhan="Việc không có ngày thì luôn mở" moTa="Tắt: thiếu ngày sẽ bị chặn gửi" bat={v.viec_khong_ngay_luon_mo} doi={(b) => dat("viec_khong_ngay_luon_mo", b)} tat={tat} />
        <DongCongTac
          nhan="Báo cho người gửi khi bản của họ không được dùng"
          moTa="Kèm lý do: thua cấp hay thua ngày"
          bat={v.bao_nguoi_gui_khi_khong_dung}
          doi={(b) => dat("bao_nguoi_gui_khi_khong_dung", b)}
          tat={tat}
        />
        <DongCongTac
          nhan="Áp dụng lại cho việc đang mở khi đổi cài đặt"
          moTa="Bật: đổi thứ tự ưu tiên, «ngày sau», «đã xong», bên ngoài đè thì các việc đang mở được tính lại (xem trước trước khi lưu). Tắt: chỉ áp dụng cho báo cáo gửi từ nay"
          bat={v.ap_dung_lai_khi_doi}
          doi={(b) => dat("ap_dung_lai_khi_doi", b)}
          tat={tat}
        />
      </Muc>
      <Muc tieuDe={"Ngưỡng gợi ý \"có vẻ trùng\""} moTa="Độ giống tên việc, dự án, hạng mục để hệ thống gợi ý trùng khi chưa có mã việc. Người gửi luôn xác nhận.">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            disabled={tat}
            value={v.nguong_goi_y_trung}
            onChange={(e) => dat("nguong_goi_y_trung", Number(e.target.value))}
            aria-label={'Ngưỡng gợi ý "có vẻ trùng"'}
            aria-valuetext={`${Math.round(v.nguong_goi_y_trung * 100)}%`}
            className="w-64 accent-[var(--accent)]"
          />
          <span className="font-mono text-[12px] text-text">{Math.round(v.nguong_goi_y_trung * 100)}%</span>
        </div>
      </Muc>
      <p className="text-[11px] text-text-muted">
        Cấp của từng đơn vị (1, 2, 3) đặt trong cây đơn vị ở trang Quản trị. Mọi lần đổi cài đặt đều ghi vào nhật ký: ai đổi, lúc nào, từ gì sang gì.
      </p>
    </>
  );
}

// ---------------- Luật kiểm tra ----------------

export function NhomLuatKiemTra({ giaTri: v, doi, tat }: PropsNhom<CauHinh["luat_kiem_tra"]>) {
  // Bật/tắt, mức, mẫu áp dụng của từng luật nay quản lý ở trang /luat-kiem-tra (bộ luật động, có phiên bản riêng từng luật)
  return (
    <>
      <Muc tieuDe="Luật kiểm tra trước khi gửi">
        <div className="rounded border border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] px-4 py-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-text">Luật kiểm tra có trang riêng</div>
              <p className="mt-0.5 text-[12px] leading-relaxed text-text-secondary">
                Viết luật bằng một câu tiếng Việt, AI đề xuất cách chạy, chạy thử trên các báo cáo đã có rồi mới lưu. Mỗi luật có phiên bản riêng và quay lại được.
              </p>
              <ul className="mt-2.5 space-y-1 text-[11.5px] text-text-secondary">
                <li className="flex items-center gap-2">
                  <Braces className="h-3.5 w-3.5 shrink-0 text-blue" /> <b className="font-semibold text-text">Code giữ cửa</b> — chạy chắc chắn, được chặn gửi
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" /> <b className="font-semibold text-text">AI góp ý</b> — đọc hiểu nội dung, mặc định cảnh báo
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-text-muted" /> Luật hệ thống chỉ tắt, đổi mức hoặc mẫu áp dụng — không xóa được
                </li>
              </ul>
              <Link
                href="/luat-kiem-tra"
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-sm border border-accent bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-accent-hover"
              >
                Mở trang Luật kiểm tra <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </Muc>
      <Muc tieuDe={"Chuỗi coi là \"chưa điền\""} moTa={"Ô bắt buộc còn đúng các chuỗi này thì coi như bỏ trống (vd \"......\"). Dùng chung cho luật hệ thống và mọi luật code."}>
        <DanhSachChu giaTri={v.gia_tri_chua_dien} doi={(x) => doi({ ...v, gia_tri_chua_dien: x })} tat={tat} goiY="Thêm chuỗi…" />
      </Muc>
    </>
  );
}

// ---------------- Luồng báo cáo ----------------

export function NhomLuongBaoCao({ giaTri: v, doi, tat, danhMuc }: PropsNhom<CauHinh["luong_bao_cao"]>) {
  const dv = luaChonDonVi(danhMuc);
  const datDong = (i: number, x: Partial<CauHinh["luong_bao_cao"][number]>) => doi(v.map((l, j) => (j === i ? { ...l, ...x } : l)));
  const kiemSoat = [...danhMuc.vai_tro.map((r) => ({ gia_tri: r.id, nhan: r.ten })), ...dv];
  return (
    <Muc tieuDe="Đơn vị nào gửi báo cáo cho ai" moTa="Kiểm tra trước khi lưu: đơn vị phải tồn tại, có cấp; luồng không được vòng tròn (trừ Ban TGĐ gửi TGĐ trong nội bộ).">
      <div className="scroll-thin overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Từ đơn vị</th>
              <th>Gửi đến</th>
              <th title="Ô này chưa có tác dụng: máy chưa đọc để kiểm soát báo cáo">Ai kiểm soát (chưa có tác dụng)</th>
              <th title="Ô này chưa có tác dụng: máy chưa đọc để tổng hợp báo cáo">Tổng hợp thành mẫu (chưa có tác dụng)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {v.map((l, i) => (
              <tr key={i}>
                <td>
                  <select className={LOP_O_NHAP} disabled={tat} value={l.tu} onChange={(e) => datDong(i, { tu: e.target.value })}>
                    {!dv.some((d) => d.gia_tri === l.tu) && <option value={l.tu}>{l.tu} (không có)</option>}
                    {dv.map((d) => (
                      <option key={d.gia_tri} value={d.gia_tri}>
                        {d.nhan}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select className={LOP_O_NHAP} disabled={tat} value={l.den} onChange={(e) => datDong(i, { den: e.target.value })}>
                    {!dv.some((d) => d.gia_tri === l.den) && <option value={l.den}>{l.den} (không có)</option>}
                    {dv.map((d) => (
                      <option key={d.gia_tri} value={d.gia_tri}>
                        {d.nhan}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="min-w-[200px]">
                  <ChonNhieu giaTri={l.kiem_soat} doi={(x) => datDong(i, { kiem_soat: x })} tat={tat} luaChon={kiemSoat} goiY="+ vai trò / đơn vị" />
                </td>
                <td>
                  <select className={LOP_O_NHAP} disabled={tat} value={l.tong_hop_thanh ?? ""} onChange={(e) => datDong(i, { tong_hop_thanh: e.target.value || undefined })}>
                    <option value="">— Không —</option>
                    {danhMuc.mau.map((m) => (
                      <option key={m.ma} value={m.ma}>
                        {m.ma} · {m.ten}
                      </option>
                    ))}
                    {l.tong_hop_thanh && !danhMuc.mau.some((m) => m.ma === l.tong_hop_thanh) && <option value={l.tong_hop_thanh}>{l.tong_hop_thanh}</option>}
                  </select>
                </td>
                <td>
                  {!tat && (
                    <button type="button" className="text-text-muted hover:text-red" title="Bỏ luồng" onClick={() => doi(v.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!tat && (
        <Nut nho className="mt-2" onClick={() => doi([...v, { tu: dv[0]?.gia_tri ?? "", den: dv[0]?.gia_tri ?? "", kiem_soat: [] }])}>
          <Plus className="h-3 w-3" /> Thêm luồng
        </Nut>
      )}
    </Muc>
  );
}

// ---------------- Thư mục ----------------

export function NhomThuMuc({ giaTri: v, doi, tat, danhMuc }: PropsNhom<CauHinh["thu_muc"]>) {
  const ds = v.thu_muc_con_mac_dinh;
  const datDs = (x: typeof ds) => doi({ ...v, thu_muc_con_mac_dinh: x });
  const doiCho = (i: number, j: number) => {
    if (j < 0 || j >= ds.length) return;
    const x = [...ds];
    [x[i], x[j]] = [x[j], x[i]];
    datDs(x);
  };
  return (
    <>
      <Muc tieuDe="Thư mục con mặc định của mỗi đơn vị" moTa="Tạo sẵn khi thêm đơn vị mới. Loại cho hệ thống biết tài liệu đến/đi/xóa vào đâu.">
        <div className="space-y-1.5">
          {ds.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={`${LOP_O_NHAP} max-w-[260px]`} disabled={tat} value={t.ten} onChange={(e) => datDs(ds.map((x, j) => (j === i ? { ...x, ten: e.target.value } : x)))} />
              <select
                className={`${LOP_O_NHAP} !w-auto`}
                disabled={tat}
                value={t.loai}
                onChange={(e) => datDs(ds.map((x, j) => (j === i ? { ...x, loai: e.target.value as typeof t.loai } : x)))}
              >
                {LOAI_THU_MUC.map((l) => (
                  <option key={l.gia_tri} value={l.gia_tri}>
                    {l.nhan}
                  </option>
                ))}
              </select>
              {!tat && (
                <>
                  <button type="button" className="text-text-muted hover:text-accent" title="Lên" onClick={() => doiCho(i, i - 1)}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="text-text-muted hover:text-accent" title="Xuống" onClick={() => doiCho(i, i + 1)}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="text-text-muted hover:text-red" title="Bỏ" onClick={() => datDs(ds.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        {!tat && (
          <Nut nho className="mt-2" onClick={() => datDs([...ds, { ten: "Thư mục mới", loai: "khac" }])}>
            <Plus className="h-3 w-3" /> Thêm thư mục con
          </Nut>
        )}
      </Muc>
      <Muc tieuDe="Khác">
        <TruongTuDong
          t={{ duong: "thung_rac_giu_ngay", nhan: "Thùng rác giữ bao lâu (ngày)", mo_ta: "Quá hạn thì ẩn khỏi thùng rác; nội dung vẫn còn trong lịch sử", kieu: "so", toi_thieu: 0 }}
          giaTri={v}
          doi={(d, x) => doi(datTheoDuong(v, d, x))}
          tat={tat}
          danhMuc={danhMuc}
        />
        <TruongTuDong
          t={{ duong: "quy_uoc_ten_file", nhan: "Quy ước tên file (chưa có tác dụng)", mo_ta: "{mau} {ky} {don_vi} — vd Form7_Tuan29_BQLDA-QT", kieu: "chu" }}
          giaTri={v}
          doi={(d, x) => doi(datTheoDuong(v, d, x))}
          tat={tat}
          danhMuc={danhMuc}
        />
        <TruongTuDong
          t={{
            duong: "xem_noi_dung_phong_khac",
            nhan: "Mở xem nội dung tài liệu phòng khác",
            mo_ta: "Cấu trúc thư mục mọi phòng thì ai cũng thấy",
            kieu: "chon",
            lua_chon: [
              { gia_tri: "tat_ca", nhan: "Ai cũng mở xem được" },
              { gia_tri: "theo_quyen", nhan: "Theo quyền tai_lieu.xem" },
            ],
          }}
          giaTri={v}
          doi={(d, x) => doi(datTheoDuong(v, d, x))}
          tat={tat}
          danhMuc={danhMuc}
        />
      </Muc>
    </>
  );
}

// Nhóm "Gửi, chuyển tiếp" đã GỠ (Mr. Đại chốt 30/09): báo cáo duyệt ngoài app, không còn nhận / chuyển tiếp / trả lại.

// ---------------- Thông báo, email ----------------

export function NhomThongBao({ giaTri: v, doi, tat, danhMuc }: PropsNhom<CauHinh["thong_bao"]>) {
  const dat = (d: string, x: unknown) => doi(datTheoDuong(v, d, x));
  const theoLoai = v.theo_loai ?? {};
  const datLoai = (k: string, x: Partial<CauHinh["thong_bao"]["theo_loai"][string]>) =>
    doi({ ...v, theo_loai: { ...theoLoai, [k]: { ...(theoLoai[k] ?? theoLoai.khac), ...x } } });
  // Dòng "khac" luôn ở cuối
  const dsLoai = Object.keys(theoLoai).sort((a, b) => (a === "khac" ? 1 : b === "khac" ? -1 : 0));
  const tt = (t: Parameters<typeof TruongTuDong>[0]["t"]) => <TruongTuDong t={t} giaTri={v} doi={dat} tat={tat} danhMuc={danhMuc} />;
  return (
    <>
      <Muc tieuDe="Hộp thư gửi">
        {tt({ duong: "email_gui", nhan: "Địa chỉ gửi thông báo", mo_ta: "Để trống = chỉ thông báo trong ứng dụng (biến SMTP_FROM đè ô này)", kieu: "chu" })}
        {tt({ duong: "ten_nguoi_gui", nhan: "Tên người gửi", mo_ta: "Tên hiện trong hộp thư người nhận, vd SCI công việc", kieu: "chu" })}
      </Muc>
      <Muc
        tieuDe="Máy chủ gửi thư (SMTP)"
        moTa="Mật khẩu SMTP KHÔNG lưu ở đây: đặt biến SMTP_PASS trong file .env.local trên máy chủ. Biến SMTP_HOST, SMTP_PORT, SMTP_USER… (nếu có) đè các ô này."
      >
        {tt({ duong: "smtp.may_chu", nhan: "Máy chủ", mo_ta: "vd smtp.gmail.com, mail.scigroup.vn", kieu: "chu" })}
        {tt({ duong: "smtp.cong", nhan: "Cổng", mo_ta: "587 (STARTTLS) hoặc 465 (SSL)", kieu: "so", toi_thieu: 1, toi_da: 65535 })}
        {tt({ duong: "smtp.bao_mat", nhan: "Bảo mật", kieu: "chon", lua_chon: BAO_MAT_SMTP })}
        {tt({ duong: "smtp.tai_khoan", nhan: "Tài khoản đăng nhập", mo_ta: "vd docflow@scigroup.vn; để trống nếu máy chủ không cần đăng nhập", kieu: "chu" })}
      </Muc>
      <Muc
        tieuDe="Kênh theo loại thông báo"
        moTa="Mỗi loại gửi trong ứng dụng, qua email, hay cả hai. {noi_dung} trong tiêu đề thư được thay bằng nội dung thông báo. Loại chưa có dòng riêng dùng dòng «Loại khác»."
      >
        <div className="scroll-thin overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Loại thông báo</th>
                <th className="text-center">Trong app</th>
                <th className="text-center">Email</th>
                <th className="min-w-[260px]">Tiêu đề thư</th>
              </tr>
            </thead>
            <tbody>
              {dsLoai.map((k) => {
                const d = theoLoai[k];
                const theoSoCai = LOAI_KENH_THEO_SO_CAI.includes(k);
                return (
                  <tr key={k}>
                    <td>
                      <div className="text-text">{NHAN_LOAI_THONG_BAO[k] ?? k}</div>
                      <div className="font-mono text-[10px] text-text-muted">{k}</div>
                    </td>
                    {theoSoCai ? (
                      <td colSpan={2} className="text-center text-[10.5px] text-text-muted">
                        theo «Sổ cái, nhắc việc › Kênh nhắc»
                      </td>
                    ) : (
                      <>
                        <td className="text-center">
                          <CongTac bat={d.trong_app} doi={(x) => datLoai(k, { trong_app: x })} tat={tat} nhan={`${NHAN_LOAI_THONG_BAO[k] ?? k}: trong app`} />
                        </td>
                        <td className="text-center">
                          <CongTac bat={d.email} doi={(x) => datLoai(k, { email: x })} tat={tat} nhan={`${NHAN_LOAI_THONG_BAO[k] ?? k}: email`} />
                        </td>
                      </>
                    )}
                    <td>
                      <input className={LOP_O_NHAP} disabled={tat} value={d.tieu_de} onChange={(e) => datLoai(k, { tieu_de: e.target.value })} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Muc>
      <Muc tieuDe="Nội dung mẫu từng loại thông báo" moTa="Biến trong ngoặc nhọn được thay khi gửi, vd {ten_tai_lieu}, {ma_viec}, {han}, {ly_do}, {ten}.">
        {Object.entries(v.mau).map(([k, m]) => (
          <div key={k} className="grid gap-1 border-b border-border-light py-2 last:border-b-0 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-center sm:gap-4">
            <div>
              <div className="text-[12.5px] text-text">{NHAN_LOAI_THONG_BAO[k] ?? k}</div>
              <div className="font-mono text-[10px] text-text-muted">{k}</div>
            </div>
            <input className={LOP_O_NHAP} disabled={tat} value={m} onChange={(e) => doi({ ...v, mau: { ...v.mau, [k]: e.target.value } })} />
          </div>
        ))}
      </Muc>
    </>
  );
}

// ---------------- Phân quyền cài đặt ----------------

export function NhomPhanQuyen({ giaTri: v, doi, tat, danhMuc }: PropsNhom<CauHinh["phan_quyen_cau_hinh"]>) {
  const datNhom = (k: string, x: { don_vi: string[]; vai_tro: string[] } | null) => {
    const nhom = { ...v.nhom };
    if (!x || (x.don_vi.length === 0 && x.vai_tro.length === 0)) delete nhom[k];
    else nhom[k] = x;
    doi({ ...v, nhom });
  };
  return (
    <Muc
      tieuDe="Ai được sửa riêng từng nhóm"
      moTa="Người có quyền cau_hinh.sua (hoặc quản trị viên) sửa được mọi nhóm. Ngoài ra, người THUỘC một đơn vị trong cột Đơn vị (trống = mọi đơn vị) VÀ CÓ một vai trò trong cột Vai trò (trống = mọi vai trò) sửa được nhóm đó. Vd: Trưởng phòng ĐT&PC sửa Luật kiểm tra."
    >
      <table className="tbl">
        <thead>
          <tr>
            <th>Nhóm cài đặt</th>
            <th>Đơn vị</th>
            <th>Vai trò</th>
          </tr>
        </thead>
        <tbody>
          {NHOM_CAU_HINH.filter((n) => n.khoa !== "phan_quyen_cau_hinh").map((n) => {
            const r = v.nhom[n.khoa] ?? { don_vi: [], vai_tro: [] };
            return (
              <tr key={n.khoa}>
                <td className="whitespace-nowrap text-text">{n.ten}</td>
                <td className="min-w-[200px]">
                  <ChonNhieu giaTri={r.don_vi} doi={(x) => datNhom(n.khoa, { ...r, don_vi: x })} tat={tat} luaChon={luaChonDonVi(danhMuc)} goiY="+ đơn vị" />
                </td>
                <td className="min-w-[200px]">
                  <ChonNhieu
                    giaTri={r.vai_tro}
                    doi={(x) => datNhom(n.khoa, { ...r, vai_tro: x })}
                    tat={tat}
                    luaChon={danhMuc.vai_tro.map((x) => ({ gia_tri: x.id, nhan: x.ten }))}
                    goiY="+ vai trò"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Muc>
  );
}

// ---------------- Nhóm vẽ tự động ----------------

// ---------------- Danh mục dự án (giao diện căn phòng Đợt 3) ----------------

// Cột bảng Sơ đồ tổ chức dự án — CỐ ĐỊNH, không giãn theo màn (Mr. Đại 28/09: cột "Ban điều hành / đơn vị làm" và "Tên gọi khác" quá rộng)
const LUOI_DU_AN = "grid min-w-[1040px] grid-cols-[180px_90px_150px_160px_220px_150px_20px]";

export function NhomTenGoiKhacDonVi({ giaTri: v, doi, tat, danhMuc }: PropsNhom<CauHinh["ten_goi_khac_don_vi"]>) {
  // Mr. Đại chốt 29/09: báo cáo thuộc đơn vị nào là do NỘI DUNG FILE nói — máy đọc dòng tên đơn vị dưới tiêu đề "BÁO CÁO …".
  // Tên đầy đủ, tên ngắn, "NM" = "Nhà máy", "BQLDA" = "Ban quản lý dự án"… máy tự hiểu; chỉ khai tên viết tắt riêng ở đây.
  const dvs = danhMuc.don_vi.filter((d) => d.active && d.cap >= 2);
  const dat = (id: string, ds: string[]) => {
    const moi = { ...v };
    if (ds.length) moi[id] = ds;
    else delete moi[id];
    doi(moi);
  };
  return (
    <Muc tieuDe="Tên gọi khác của đơn vị" moTa="Máy đọc tên đơn vị ghi trên mặt báo cáo để biết báo cáo của ai. Chỉ cần khai tên viết tắt máy không tự hiểu được (vd HL7).">
      <div className="divide-y divide-border">
        {dvs.map((d) => (
          <div key={d.id} className="flex flex-wrap items-start gap-3 py-2">
            <div className="w-56 shrink-0 text-[12.5px] text-text">{d.ten}</div>
            <div className="min-w-0 flex-1">
              <DanhSachChu giaTri={v[d.id] ?? []} doi={(x) => dat(d.id, x)} tat={tat} goiY="+ tên gọi khác" />
            </div>
          </div>
        ))}
      </div>
    </Muc>
  );
}

/**
 * CÔNG TY CỦA NHÀ MÁY / BAN ĐIỀU HÀNH (Mr. Đại chốt K8 02/10): mẫu dùng chung Form 8 (nhà máy) và Form 10 (Ban điều hành) để trống
 * dòng "CÔNG TY ......" — khai một lần ở đây, AI làm báo cáo tự điền. Trống = để nguyên chấm cho người lập tự ghi.
 */
export function NhomCongTyDonVi({ giaTri: v, doi, tat, danhMuc }: PropsNhom<CauHinh["cong_ty_don_vi"]>) {
  const dvs = danhMuc.don_vi.filter((d) => d.active && d.cap >= 3 && /^(nhà máy|ban điều hành)/i.test(d.ten));
  const dat = (id: string, ten: string) => {
    const moi = { ...v };
    if (ten.trim()) moi[id] = ten;
    else delete moi[id];
    doi(moi);
  };
  return (
    <Muc tieuDe="Công ty của nhà máy / Ban điều hành" moTa="Nhà máy: công ty đang vận hành nhà máy. Ban điều hành: công ty tổng thầu. AI làm báo cáo Form 8 / Form 10 điền tên này vào dòng CÔNG TY …… (viết hoa). Để trống thì giữ nguyên dấu chấm cho người lập tự ghi.">
      <div className="divide-y divide-border">
        {dvs.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-3 py-2">
            <div className="w-72 shrink-0 text-[12.5px] text-text">{d.ten}</div>
            <input className={`${LOP_O_NHAP} min-w-[240px] flex-1`} disabled={tat} value={v[d.id] ?? ""} placeholder="vd: Công ty Cổ phần Thủy điện Nậm Xe" onChange={(e) => dat(d.id, e.target.value)} />
          </div>
        ))}
      </div>
    </Muc>
  );
}

export function NhomDuAn({ giaTri: v, doi, tat, danhMuc }: PropsNhom<CauHinh["du_an"]>) {
  // SƠ ĐỒ TỔ CHỨC DỰ ÁN (Mr. Đại chốt 28/09): Dự án SCI đầu tư (cấp 1) → BQLDA (cấp 2, chọn từ Đơn vị) → dự án (cấp 3);
  // Loại khác (cấp 1) → dự án (cấp 3). Dữ liệu vẫn là danh sách phẳng: dự án SCI đầu tư lấy BQLDA ở don_vi[0].
  // ⭐ 03/10 (LOI-DUNG-CHUNG 6g.6 Đợt 1): Main là gốc danh mục — mã ngắn · tên · nhóm · tên gọi khác KÉO TỪ MAIN, ở đây chỉ đọc
  // (luật 28: chữ trần, không khoanh — 03/10 Mr. Đại: ô ánh xạ từ agent khác tô NỀN DẢI CỘT cam thẫm .o-tu-main, liền
  // từ dòng trên xuống dòng dưới, không bo góc, không viền — để không trông như nút); "Mã bên Tiến độ" máy tự điền. Không thêm/xoá dự án ở đây — khai ở Main. Sửa tại chỗ:
  // loại · Ban QLDA · đơn vị làm · Ban điều hành — 3 trường sau chỉ sửa ở đây khi Main CHƯA giữ (donViTuMain bên dưới).
  const dvCo = danhMuc.don_vi.filter((d) => d.active);
  const tenDv = (id: string) => dvCo.find((d) => d.id === id)?.ten_ngan ?? id;
  const dv = luaChonDonVi(danhMuc);
  // ⭐ 6g.6 Đợt 2 bước E (Mr. Đại chốt 03/10 "2a"): Main giữ Ban QLDA · đơn vị làm · Ban điều hành → ở đây chỉ hiện (chữ nền cam
  // như các ô từ Main), sửa ở Main › Quản lý dự án. Biết qua vết lượt kéo gần nhất.
  const [donViTuMain, setDonViTuMain] = useState(false);
  useEffect(() => {
    fetch("/api/cai-dat/keo-du-an-main", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { vet?: { don_vi_tu_main?: boolean } | null }) => setDonViTuMain(j?.vet?.don_vi_tu_main === true))
      .catch(() => setDonViTuMain(false));
  }, []);
  const bdh = dvCo.filter((d) => d.cap >= 4);
  const [bqlMoi, setBqlMoi] = useState<string[]>([]);
  const bql = [...new Set([...v.filter((d) => d.nhom === "sci").map((d) => d.don_vi[0]).filter(Boolean), ...bqlMoi])];
  const chuaBan = v.filter((d) => d.nhom === "sci" && !d.don_vi[0]);
  const datDong = (id: string, x: Partial<CauHinh["du_an"][number]>) =>
    doi(
      v.map((d) => {
        if (d.id !== id) return d;
        const moi = { ...d, ...x };
        if (!moi.ban_dieu_hanh) delete moi.ban_dieu_hanh; // trường không bắt buộc: bỏ hẳn khi trống
        return moi;
      }),
    );
  /** Chuyển dự án SCI đầu tư sang Ban QLDA khác. Một cú chọn là chuyển. (Đổi nhóm SCI đầu tư ↔ Loại khác: sửa ở Main.) */
  const chuyen = (d: CauHinh["du_an"][number], cha: string) => {
    if (cha) datDong(d.id, { don_vi: [cha, ...d.don_vi.slice(1).filter((x) => x !== cha)] });
  };
  const dongDuAn = (d: CauHinh["du_an"][number]) => (
    <div key={d.id} className={`${LUOI_DU_AN} items-start gap-2 border-b border-border-light py-2 pl-10 pr-3 last:border-b-0`}>
      <div className="o-tu-main -my-2 self-stretch px-2 pb-2 pt-[14px] text-[12.5px] text-text" title="Tên và mã ngắn lấy từ Main — sửa ở Main">
        {d.ten} <span className="text-[11px] text-text-muted">· {d.id}</span>
      </div>
      <input className={LOP_O_NHAP} disabled={tat} value={d.loai} placeholder="Loại" onChange={(e) => datDong(d.id, { loai: e.target.value })} />
      {donViTuMain ? (
        <>
          <div className="o-tu-main -my-2 self-stretch px-2 pb-2 pt-[14px] text-[12px] text-text-secondary" title="Ban QLDA lấy từ Main — sửa ở Main › Quản lý dự án">
            {d.nhom === "sci" ? (d.don_vi[0] ? `thuộc ${tenDv(d.don_vi[0])}` : <span className="text-text-muted">chưa chọn Ban QLDA</span>) : "Loại khác"}
          </div>
          <div className="o-tu-main -my-2 self-stretch px-2 pb-2 pt-[14px] text-[11.5px] text-text-secondary" title="Ban điều hành và đơn vị làm lấy từ Main — sửa ở Main › Quản lý dự án">
            {d.ban_dieu_hanh && <div>BĐH: {tenDv(d.ban_dieu_hanh)}</div>}
            {(d.nhom === "sci" ? d.don_vi.slice(1) : d.don_vi).length ? (
              <div>Đơn vị làm: {(d.nhom === "sci" ? d.don_vi.slice(1) : d.don_vi).map(tenDv).join(" · ")}</div>
            ) : (
              !d.ban_dieu_hanh && <span className="text-text-muted">—</span>
            )}
          </div>
        </>
      ) : d.nhom === "sci" ? (
        <select className={LOP_O_NHAP} disabled={tat} value={d.don_vi[0] ?? ""} onChange={(e) => chuyen(d, e.target.value)} title="Nằm dưới Ban QLDA nào trong sơ đồ dự án">
          {!d.don_vi[0] && <option value="">— chọn Ban QLDA —</option>}
          {bql.map((b) => (
            <option key={b} value={b}>thuộc {tenDv(b)}</option>
          ))}
        </select>
      ) : (
        <div className="o-tu-main -my-2 self-stretch px-2 pb-2 pt-[14px] text-[12px] text-text-secondary" title="Nhóm dự án lấy từ Main — đổi nhóm thì sửa ở Main">Loại khác</div>
      )}
      {donViTuMain ? null : d.nhom === "sci" ? (
        <div className="space-y-1">
          <select className={LOP_O_NHAP} disabled={tat} value={d.ban_dieu_hanh ?? ""} onChange={(e) => datDong(d.id, { ban_dieu_hanh: e.target.value || null })} title="Ban điều hành tổng thầu của dự án — việc giao cho ban này tự thuộc dự án">
            <option value="">— Không có BĐH —</option>
            {bdh.map((b) => (
              <option key={b.id} value={b.id}>{b.ten_ngan}</option>
            ))}
          </select>
          {/* Đơn vị làm (chốt 03/10): PMC thiết kế, E&C thi công… — hiện ô dự án dưới đơn vị đó trên Sơ đồ tổ chức; Ban QLDA vẫn đứng đầu */}
          {d.don_vi[0] ? (
            <div title="Đơn vị làm cho dự án (thiết kế, thi công…) — hiện ô dự án dưới đơn vị này trên Sơ đồ tổ chức; việc của mọi đơn vị vẫn dồn về một dự án ở menu Dự án">
              <ChonNhieu
                giaTri={d.don_vi.slice(1)}
                doi={(x) => datDong(d.id, { don_vi: [d.don_vi[0], ...x.filter((u) => u !== d.don_vi[0])] })}
                tat={tat}
                luaChon={dv}
                goiY="+ đơn vị làm"
              />
            </div>
          ) : (
            <div className="text-[11px] text-text-muted">chọn Ban QLDA trước rồi mới thêm đơn vị làm</div>
          )}
        </div>
      ) : (
        <div title="Thuộc tính phụ: hiện ô dự án dưới đơn vị này trên Sơ đồ tổ chức (giao diện căn phòng)">
          <ChonNhieu giaTri={d.don_vi} doi={(x) => datDong(d.id, { don_vi: x })} tat={tat} luaChon={dv} goiY="+ đơn vị làm (phụ)" />
        </div>
      )}
      <div className="o-tu-main -my-2 self-stretch px-2 pb-2 pt-[14px] text-[11.5px] text-text-secondary" title="Tên gọi khác lấy từ Main — thêm/bớt thì sửa ở Main">
        {d.ten_khac.length ? d.ten_khac.join(" · ") : <span className="text-text-muted">—</span>}
      </div>
      <div className="o-tu-main -my-2 self-stretch px-2 pb-2 pt-[14px] text-[12px]" title="Máy tự điền: có mã khi agent Tiến độ đang có cây WBS của dự án (kiểm 30 phút một lần, hoặc bấm ↻)">
        {d.ma_tien_do ? <span className="text-text">{d.ma_tien_do}</span> : <span className="text-text-muted">không có cây WBS</span>}
      </div>
      <span />
    </div>
  );
  return (
    <Muc
      tieuDe="Sơ đồ tổ chức dự án"
      moTa={`Danh mục dự án lấy từ Main (bản gốc dùng chung cho mọi agent): tên, mã ngắn, nhóm, tên gọi khác${donViTuMain ? ", Ban QLDA, đơn vị làm, Ban điều hành" : ""} chỉ sửa ở Main › Quản lý dự án — máy tự kéo về 30 phút một lần. ${donViTuMain ? "Ở đây chỉ chọn loại." : "Ở đây chọn loại, Ban QLDA, đơn vị làm, Ban điều hành."} Việc chỉ thuộc dự án có trong sơ đồ này: máy so ô Dự án của việc với tên dự án hoặc tên gọi khác (đúng cả dấu; nếu bỏ dấu mà chỉ ra đúng một dự án thì cũng nhận), hoặc việc giao cho Ban điều hành của dự án, hoặc tên dự án ghi ngay trong tên việc. Một dự án có thể có nhiều đơn vị làm (PMC thiết kế, E&C thi công): ô dự án hiện dưới từng đơn vị trên Sơ đồ tổ chức, còn ở menu Dự án mọi việc dồn về một dự án.`}
    >
      <div className="scroll-thin overflow-x-auto rounded border border-border">
        <div className={`${LUOI_DU_AN} gap-2 border-b border-border py-1 pl-10 pr-3 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted`}>
          <span>Tên dự án · mã</span>
          <span>Loại</span>
          <span>Nằm dưới</span>
          <span>Ban điều hành / đơn vị làm</span>
          <span>Tên gọi khác trong báo cáo</span>
          <span>Mã bên Tiến độ</span>
          <span />
        </div>
        <div className="border-b border-border bg-white/5 px-3 py-1.5 text-[12.5px] font-bold text-text">
          Dự án SCI đầu tư <span className="font-normal text-text-muted">· cấp 1</span>
        </div>
        {bql.map((b) => {
          const ds = v.filter((d) => d.nhom === "sci" && d.don_vi[0] === b);
          return (
            <div key={b} className="border-b border-border pb-2">
              <div className="flex items-center gap-2 px-3 pt-2 pl-6 text-[12.5px] font-semibold text-text">
                {tenDv(b)} <span className="font-normal text-text-muted">· cấp 2 · {ds.length} dự án</span>
                {!ds.length && <span className="font-normal text-text-muted">— chuyển dự án vào bằng ô &quot;Nằm dưới&quot;; chưa có dự án thì ban này không được lưu</span>}
              </div>
              {ds.map(dongDuAn)}
            </div>
          );
        })}
        {chuaBan.length > 0 && (
          <div className="border-b border-border pb-2">
            <div className="flex items-center gap-2 px-3 pt-2 pl-6 text-[12.5px] font-semibold text-text">
              Chưa chọn Ban QLDA{" "}
              <span className="font-normal text-text-muted">
                · {chuaBan.length} dự án Main mới khai — {donViTuMain ? "chọn Ban QLDA ở Main › Quản lý dự án" : <>chọn Ban QLDA ở ô &quot;Nằm dưới&quot;</>}
              </span>
            </div>
            {chuaBan.map(dongDuAn)}
          </div>
        )}
        {!tat && !donViTuMain && (
          <div className="border-b border-border px-3 py-2 pl-6">
            <select
              className={`${LOP_O_NHAP} w-[260px]`}
              value=""
              onChange={(e) => e.target.value && setBqlMoi((x) => [...x, e.target.value])}
              title="Chọn một đơn vị có sẵn ở Cài đặt → Đơn vị làm Ban QLDA (cấp 2)"
            >
              <option value="">+ Thêm Ban QLDA (chọn từ Đơn vị)…</option>
              {dvCo
                .filter((d) => !bql.includes(d.id))
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.ten_ngan}</option>
                ))}
            </select>
          </div>
        )}
        <div className="border-b border-border bg-white/5 px-3 py-1.5 text-[12.5px] font-bold text-text">
          Loại khác <span className="font-normal text-text-muted">· cấp 1 · dự án ngay cấp 3</span>
        </div>
        <div className="pb-2">{v.filter((d) => d.nhom !== "sci").map(dongDuAn)}</div>
      </div>
    </Muc>
  );
}

export function NhomTuDong({ khoa, giaTri, doi, tat, danhMuc }: PropsNhom<unknown> & { khoa: KhoaCauHinh }) {
  const truong = BIEU_MAU[khoa];
  if (!truong) return <p className="text-[12px] text-text-muted">Nhóm này chỉ sửa bằng JSON nâng cao.</p>;
  return (
    <div>
      {truong.map((t) => (
        <TruongTuDong
          key={t.duong}
          t={t}
          giaTri={giaTri}
          doi={(d, x) => {
            const moi = datTheoDuong(giaTri, d, x);
            // Bật ô này thì ô loại trừ với nó tự tắt
            doi(x === true && t.loai_tru_voi ? datTheoDuong(moi, t.loai_tru_voi, false) : moi);
          }}
          tat={tat}
          danhMuc={danhMuc}
        />
      ))}
    </div>
  );
}

/** Chọn trình sửa theo nhóm. */
export function TrinhSuaNhom(p: PropsNhom<unknown> & { khoa: KhoaCauHinh }) {
  const { khoa, ...r } = p;
  switch (khoa) {
    case "quy_tac_de":
      return <NhomQuyTacDe {...(r as PropsNhom<CauHinh["quy_tac_de"]>)} />;
    case "luat_kiem_tra":
      return <NhomLuatKiemTra {...(r as PropsNhom<CauHinh["luat_kiem_tra"]>)} />;
    case "luong_bao_cao":
      return <NhomLuongBaoCao {...(r as PropsNhom<CauHinh["luong_bao_cao"]>)} />;
    case "cong_ty_don_vi":
      return <NhomCongTyDonVi {...(r as PropsNhom<CauHinh["cong_ty_don_vi"]>)} />;
    case "ten_goi_khac_don_vi":
      return <NhomTenGoiKhacDonVi {...(r as PropsNhom<CauHinh["ten_goi_khac_don_vi"]>)} />;
    case "du_an":
      return <NhomDuAn {...(r as PropsNhom<CauHinh["du_an"]>)} />;
    case "thu_muc":
      return <NhomThuMuc {...(r as PropsNhom<CauHinh["thu_muc"]>)} />;
    case "thong_bao":
      return <NhomThongBao {...(r as PropsNhom<CauHinh["thong_bao"]>)} />;
    case "phan_quyen_cau_hinh":
      return <NhomPhanQuyen {...(r as PropsNhom<CauHinh["phan_quyen_cau_hinh"]>)} />;
    default:
      return <NhomTuDong khoa={khoa} {...r} />;
  }
}
