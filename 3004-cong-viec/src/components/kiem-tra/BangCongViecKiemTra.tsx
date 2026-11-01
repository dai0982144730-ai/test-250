"use client";
// Bảng công việc trong báo cáo: Phụ trách · Bắt đầu · Kết thúc · Vào sổ cái (dự đoán: tạo mới / đè / không dùng /
// gợi ý trùng — người gửi xác nhận hoặc bỏ qua). Ô lỗi tô đỏ đúng dòng, đúng cột.
// Cột "Duyệt" (Mr. Đại chốt 28/09, nộp báo cáo Đợt B): mỗi việc sắp vào sổ cái người gửi bấm Duyệt hoặc Bỏ;
// việc Bỏ không vào sổ cái (báo cáo vẫn gửi nguyên văn). Dòng "Không dùng" / "Chờ TGĐ quyết định" không cần duyệt.
import { AlertTriangle, Clock } from "lucide-react";
import type { DongCongViec, DuDoanDong, LoiKiemTra, MauWord } from "@/lib/types";
import { Nhan, ngayVN } from "@/components/gui/chung";
import { moTaMoc } from "@/lib/so-cai/moc-viec";

export type DuDoanHienThi = DuDoanDong & { chi_so: number };
/** Dòng việc giao "Ban TGĐ / Ban lãnh đạo" chung chung (chủ trì hay phối hợp) — phải chọn lãnh đạo đích danh khi duyệt */
export const canChonBld = (c: DongCongViec | undefined) => !!c?.phu_trach?.some((p) => p.loai === "don_vi" && p.id === "ban-tgd");

export type QuyetDuyet = "duyet" | "bo";

/** Dòng cần người gửi duyệt: có dự đoán vào sổ, không phải "Không dùng", không thuộc bảng chờ TGĐ quyết định. */
export function dongCanDuyet(duDoan: DuDoanHienThi[], congViec: DongCongViec[], mau: MauWord | null | undefined): number[] {
  const qd = new Set((mau?.dinh_nghia.bang_cong_viec ?? []).filter((b) => b.la_quyet_dinh).map((b) => b.tag));
  return duDoan.filter((d) => d.hanh_dong !== "khong_dung" && congViec[d.chi_so] && !qd.has(congViec[d.chi_so].nguon_bang)).map((d) => d.dong);
}

export function BangCongViecKiemTra({
  congViec,
  duDoan,
  loi,
  mau,
  xacNhan,
  onXacNhan,
  goiYAi,
  doiTen = {},
  onDoiTen,
  duyet,
  onDuyet,
  khoaDuyet,
  lanhDao,
  chonBld = {},
  onChonBld,
}: {
  congViec: DongCongViec[];
  duDoan: DuDoanHienThi[];
  loi: LoiKiemTra[];
  mau: MauWord | null | undefined;
  xacNhan: Record<number, string>;
  onXacNhan?: (dong: number, giaTri: string | null) => void;
  /** Gợi ý của AI phụ tá theo vị trí việc trong báo cáo (chỉ gợi ý, người gửi bấm mới áp dụng) */
  goiYAi?: { chi_so: number; ten_goi_y: string | null; trung: { ma: string; ten: string; ly_do: string }[] }[];
  /** Tên việc đã đổi theo vị trí dòng vào sổ cái */
  doiTen?: Record<number, string>;
  onDoiTen?: (dong: number, ten: string | null) => void;
  /** Quyết định Duyệt / Bỏ theo vị trí dòng vào sổ cái — không truyền thì không hiện cột Duyệt */
  duyet?: Record<number, QuyetDuyet>;
  onDuyet?: (dong: number, v: QuyetDuyet | null) => void;
  /** Chưa tới bước Duyệt (còn sửa lỗi / đang soát nội dung): nút Duyệt / Bỏ hiện mờ, lý do ở chú thích nút (luật 17) */
  khoaDuyet?: string | null;
  /** Dòng ghi "Ban TGĐ / Ban lãnh đạo" chung chung: phải chọn lãnh đạo ĐÍCH DANH trước khi Duyệt (Mr. Đại chốt 28/09) */
  lanhDao?: { id: string; ten: string }[];
  chonBld?: Record<number, string>;
  onChonBld?: (dong: number, id: string | null) => void;
}) {
  const canDuyet = duyet ? new Set(dongCanDuyet(duDoan, congViec, mau)) : null;
  const qd = new Set((mau?.dinh_nghia.bang_cong_viec ?? []).filter((b) => b.la_quyet_dinh).map((b) => b.tag));
  const loiO = (c: DongCongViec, cot?: string) =>
    loi.filter((l) => l.vi_tri?.bang === c.nguon_bang && l.vi_tri?.dong === c.dong_so && (!cot || l.vi_tri?.cot === cot));
  const tenBang = (tag: string) => mau?.dinh_nghia.bang_cong_viec.find((b) => b.tag === tag)?.nhan ?? tag;
  // Dòng bị bỏ vì thiếu tên việc vẫn hiện để người gửi thấy
  const dongThieuTen = loi.filter((l) => l.vi_tri?.cot === "ten" && l.vi_tri.bang);

  const oLoi = (c: DongCongViec, cot: string) => {
    const ls = loiO(c, cot);
    const chan = ls.some((l) => l.muc === "chan");
    const canh = ls.some((l) => l.muc === "canh_bao");
    return { cls: chan ? "text-red" : canh ? "text-yellow" : "", title: ls.map((l) => l.thong_diep).join("\n") || undefined };
  };

  function vaoSoCai(c: DongCongViec, i: number) {
    if (qd.has(c.nguon_bang)) return <Nhan mau="border-accent text-accent">Chờ TGĐ quyết định</Nhan>;
    const d = duDoan.find((x) => x.chi_so === i);
    if (!d) return <span className="text-text-muted">—</span>;
    const treo = !c.ket_thuc && !c.ket_thuc_sau;
    // Người gửi đã xác nhận trùng (theo gợi ý AI) cho dòng hệ thống định tạo mới
    const gop = xacNhan[d.dong];
    // (kể cả khi hệ thống đang gợi ý trùng một việc KHÁC — vd AI chỉ ra việc đúng hơn)
    if (gop && gop !== "moi" && (d.hanh_dong === "tao_moi" || (d.hanh_dong === "goi_y_trung" && d.goi_y?.[0]?.cong_viec_id !== gop)))
      return (
        <div className="flex flex-col gap-1">
          <Nhan mau="border-accent text-accent">Gộp vào {gop}</Nhan>
          {onXacNhan ? (
            <button type="button" onClick={() => onXacNhan(d.dong, null)} className="w-fit text-[11px] text-text-muted hover:text-text">
              bỏ chọn
            </button>
          ) : null}
        </div>
      );
    switch (d.hanh_dong) {
      case "tao_moi":
        return treo ? (
          <Nhan mau="border-yellow text-yellow">
            <AlertTriangle size={11} /> Thiếu ngày kết thúc — sửa rồi gửi lại
          </Nhan>
        ) : c.ket_thuc_sau ? (
          <Nhan mau="border-blue text-blue">
            <Clock size={11} /> Việc mới · hạn chờ mốc
          </Nhan>
        ) : (
          <Nhan mau="border-green text-green">Việc mới</Nhan>
        );
      case "de":
        return <Nhan mau="border-yellow text-yellow" title={d.ly_do}>Đè {d.cong_viec_id}{d.ly_do ? ` · ${d.ly_do}` : ""}</Nhan>;
      case "khong_dung":
        return <Nhan mau="border-red text-red" title={d.ly_do}>Không dùng{d.cong_viec_id ? ` · ${d.cong_viec_id}` : ""}{d.ly_do ? ` · ${d.ly_do}` : ""}</Nhan>;
      case "dong_viec":
        return <Nhan mau="border-blue text-blue">Đóng {d.cong_viec_id}</Nhan>;
      // Lần nạp đầu của đơn vị lập + mẫu (Mr. Đại gật 18/10/2026): dòng đã xong vào sổ ở trạng thái đã xong
      case "vao_so_xong":
        return (
          <Nhan mau="border-green text-green" title={d.ly_do}>
            Vào sổ — đã xong{d.xong_lan_dau ? ` ngày ${ngayVN(d.xong_lan_dau)}` : ""}{d.cong_viec_id ? ` · ${d.cong_viec_id}` : ""}
          </Nhan>
        );
      case "goi_y_trung": {
        const g = d.goi_y?.[0];
        const chon = xacNhan[d.dong];
        return (
          <div className="flex flex-col gap-1">
            <Nhan mau="border-yellow text-yellow" title={g ? `độ giống ${Math.round(g.do_giong * 100)}%` : undefined}>
              Có vẻ trùng {g?.cong_viec_id}
            </Nhan>
            {g && onXacNhan ? (
              <div className="flex flex-wrap gap-1 whitespace-nowrap text-[11px]">
                <button
                  type="button"
                  onClick={() => onXacNhan(d.dong, chon === g.cong_viec_id ? null : g.cong_viec_id)}
                  className={`rounded-sm border px-1.5 py-0.5 ${chon === g.cong_viec_id ? "border-accent text-accent" : "border-border text-text-secondary"}`}
                >
                  Đúng là {g.cong_viec_id}
                </button>
                <button
                  type="button"
                  onClick={() => onXacNhan(d.dong, chon === "moi" ? null : "moi")}
                  className={`rounded-sm border px-1.5 py-0.5 ${chon === "moi" ? "border-accent text-accent" : "border-border text-text-secondary"}`}
                >
                  Việc mới
                </button>
              </div>
            ) : null}
          </div>
        );
      }
      default:
        return <span className="text-text-muted">{d.hanh_dong}</span>;
    }
  }

  if (congViec.length === 0 && dongThieuTen.length === 0) {
    return <p className="text-sm text-text-muted">Không có công việc nào trong chương "Kết quả và kế hoạch việc" của file.</p>;
  }

  return (
    <div className="scroll-thin overflow-x-auto">
      <table className="tbl" style={{ minWidth: 620 }}>
        <thead>
          <tr>
            <th>Công việc trong báo cáo</th>
            <th>Phụ trách</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th>Vào sổ cái</th>
            {canDuyet ? <th>Duyệt</th> : null}
          </tr>
        </thead>
        <tbody>
          {congViec.map((c, i) => {
            const ten = oLoi(c, "ten");
            const pt = oLoi(c, "phu_trach");
            const bd = oLoi(c, "bat_dau");
            const kt = oLoi(c, "ket_thuc");
            return (
              <tr key={`${c.nguon_bang}-${c.dong_so}`}>
                <td className={ten.cls} title={ten.title}>
                  {(() => {
                    const dong = duDoan.find((x) => x.chi_so === i)?.dong;
                    const tenMoi = dong !== undefined ? doiTen[dong] : undefined;
                    const biBo = dong !== undefined && duyet?.[dong] === "bo";
                    return (
                      <div className={biBo ? "text-text-muted line-through" : "text-text"} title={biBo ? "Bỏ: không vào sổ cái" : undefined}>
                        {c.ma_viec ? <span className="font-mono text-xs text-text-muted">{c.ma_viec} · </span> : null}
                        {tenMoi ? (
                          <>
                            <b>{tenMoi}</b>
                            <span className="block text-[11px] text-text-muted line-through">{c.ten}</span>
                          </>
                        ) : (
                          c.ten
                        )}
                      </div>
                    );
                  })()}
                  {(() => {
                    const g = goiYAi?.find((x) => x.chi_so === i);
                    const dong = duDoan.find((x) => x.chi_so === i)?.dong;
                    if (!g || dong === undefined) return null;
                    const daDoi = !!doiTen[dong];
                    return (
                      <div className="mt-1 space-y-1 rounded-sm border border-accent/40 bg-accent/5 px-2 py-1 text-[11.5px]">
                        {g.ten_goi_y ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-accent">✨ AI gợi ý tên:</span>
                            <span className="text-text">{g.ten_goi_y}</span>
                            {onDoiTen ? (
                              <button type="button" onClick={() => onDoiTen(dong, daDoi ? null : g.ten_goi_y)} className="rounded-sm border border-accent px-1.5 text-accent hover:bg-accent hover:text-white">
                                {daDoi ? "Bỏ, giữ tên cũ" : "Dùng tên này"}
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                        {g.trung.map((t) => (
                          <div key={t.ma} className="flex flex-wrap items-center gap-1.5">
                            <span className="text-accent">✨ Có thể trùng</span>
                            <b className="font-mono text-text">{t.ma}</b>
                            <span className="text-text-secondary">&quot;{t.ten}&quot;{t.ly_do ? ` — ${t.ly_do}` : ""}</span>
                            {onXacNhan ? (
                              <button
                                type="button"
                                onClick={() => onXacNhan(dong, xacNhan[dong] === t.ma ? null : t.ma)}
                                className="rounded-sm border border-accent px-1.5 text-accent hover:bg-accent hover:text-white"
                              >
                                {xacNhan[dong] === t.ma ? "Bỏ, tạo việc mới" : `Đúng là trùng ${t.ma}`}
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  <div className="text-[11px] text-text-muted">
                    {c.du_an ? `${c.du_an} · ` : ""}
                    {tenBang(c.nguon_bang)} dòng {c.dong_so}
                    {c.da_xong ? " · báo đã xong" : ""}
                  </div>
                </td>
                <td className={pt.cls} title={pt.title}>
                  {c.phu_trach.length ? c.phu_trach.map((p) => p.ten).join(", ") : <span className="text-text-muted">—</span>}
                  {c.phu_trach_tu_gan ? <div className="text-[11px] text-yellow">tự gán đơn vị lập</div> : null}
                </td>
                <td className={`font-mono text-xs ${bd.cls}`} title={bd.title}>
                  {c.bat_dau_sau ? <span className="font-sans">{moTaMoc(c.bat_dau_sau)}</span> : ngayVN(c.bat_dau) || "—"}
                  {c.bat_dau_kieu === "ngay_bao_cao" ? <div className="font-sans text-[11px] text-text-muted">= ngày nộp báo cáo</div> : null}
                </td>
                <td className={`font-mono text-xs ${kt.cls}`} title={kt.title}>
                  {/* Chỉ ghi "lỗi" khi có lỗi chặn/cảnh báo; ngày trống chỉ là thông tin (việc luôn mở) */}
                  {c.ket_thuc_sau ? (
                    <span className="font-sans">{moTaMoc(c.ket_thuc_sau)}</span>
                  ) : (
                    ngayVN(c.ket_thuc) || (loiO(c, "ket_thuc").some((l) => l.muc === "chan") ? "thiếu hạn" : "—")
                  )}
                </td>
                <td>{vaoSoCai(c, i)}</td>
                {canDuyet ? (
                  <td className="whitespace-nowrap">
                    {(() => {
                      const dong = duDoan.find((x) => x.chi_so === i)?.dong;
                      if (dong === undefined || !canDuyet.has(dong)) return <span className="text-[11px] text-text-muted">không cần</span>;
                      const v = duyet?.[dong];
                      // Có vẻ trùng mà chưa chọn Đúng là / Việc mới → nút Duyệt mờ (luật 17): duyệt lúc này là tự tạo việc trùng
                      const dd = duDoan.find((x) => x.chi_so === i);
                      const choChon = dd?.hanh_dong === "goi_y_trung" && !xacNhan[dong];
                      const canBld = canChonBld(congViec[i]) && !chonBld[dong];
                      if (!onDuyet) return <span className={`text-[11px] ${v === "bo" ? "text-text-muted" : "text-green"}`}>{v === "bo" ? "Đã bỏ" : "Đã duyệt"}</span>;
                      const nut = (gt: QuyetDuyet, nhan: string, mauChon: string) => (
                        <button
                          type="button"
                          disabled={!!khoaDuyet || (gt === "duyet" && (choChon || canBld))}
                          title={
                            khoaDuyet
                              ? khoaDuyet
                              : gt === "duyet" && choChon
                                ? "Chọn “Đúng là …” hoặc “Việc mới” ở cột Vào sổ cái trước"
                                : gt === "duyet" && canBld
                                  ? "Việc ghi “Ban lãnh đạo” chung chung: chọn lãnh đạo cụ thể trước"
                                  : undefined
                          }
                          onClick={() => onDuyet(dong, v === gt ? null : gt)}
                          className={`rounded-sm border px-1.5 py-0.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-40 ${v === gt ? mauChon : "border-border text-text-secondary hover:border-accent"}`}
                        >
                          {nhan}
                        </button>
                      );
                      return (
                        <div className="space-y-1">
                          {canChonBld(congViec[i]) && lanhDao?.length ? (
                            <select
                              value={chonBld[dong] ?? ""}
                              disabled={!!khoaDuyet || !onChonBld}
                              onChange={(e) => onChonBld?.(dong, e.target.value || null)}
                              className={`block max-w-[190px] rounded-sm border bg-bg px-1 py-0.5 text-[11px] text-text ${chonBld[dong] ? "border-border" : "border-yellow"}`}
                              title="Báo cáo ghi “Ban lãnh đạo” chung chung — chọn lãnh đạo đích danh"
                            >
                              <option value="">Lãnh đạo nào?</option>
                              {lanhDao.map((l) => (
                                <option key={l.id} value={l.id}>{l.ten}</option>
                              ))}
                            </select>
                          ) : null}
                          <div className="flex gap-1">
                            {nut("duyet", "Duyệt", "border-green bg-green/15 text-green")}
                            {nut("bo", "Bỏ", "border-text-muted bg-white/5 text-text-muted")}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                ) : null}
              </tr>
            );
          })}
          {dongThieuTen.map((l, i) => (
            <tr key={`thieu-${i}`}>
              <td colSpan={canDuyet ? 6 : 5} className={l.muc === "chan" ? "text-red" : "text-yellow"}>
                {l.thong_diep}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
