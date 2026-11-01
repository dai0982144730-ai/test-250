"use client";
// ============================================================
// BƯỚC 4 · DUYỆT VÀO KẾ HOẠCH — MỘT BẢNG (Mr. Đại chốt 29/09/2026):
//   Công việc trong báo cáo · Phụ trách · Bắt đầu · Kết thúc · Vào sổ cái · Duyệt
// - Việc AI tìm ngoài bảng nằm CHUNG bảng (dưới tên: dòng xám "AI tìm ở mục …: “trích”"), phải Duyệt / Bỏ từng dòng.
// - Chuyện "có vẻ trùng" chỉ ở MỘT nơi: ô chọn cột Vào sổ cái (Việc mới / Đúng là CV-… — gợi ý của máy và của AI gộp chung),
//   lý do trùng là dòng xám dưới ô chọn. Bỏ hộp "✨ Có thể trùng" trong ô tên, chip + 2 nút, chú thích dài cuối bảng.
// - "Ban lãnh đạo" chung chung: chọn lãnh đạo đích danh ngay ở cột Phụ trách. 🤖 chỉ đứng trước gợi ý do AI viết (tên, hạn).
// - Chốt 29/09 (lần 2): ô Công việc trình bày như ô việc cột phải Sơ đồ — tên đậm · "Kết quả cần có" · dòng cuối
//   "lọc ra từ hệ thống báo cáo tuần 40 · P.CĐ" bấm mở báo cáo gốc khoanh cam đúng dòng (HopBaoCaoGoc).
//   Hai nhóm có TIÊU ĐỀ: việc máy lấy từ bảng việc (đọc đúng từng cột) · việc AI tìm thêm ở mục khác (không có cột → ô nhập).
//   Dòng tiêu đề cột ghim khi cuộn (phong.css).
// Bảng cũ BangCongViecKiemTra vẫn dùng ở Hộp xử lý / Rà soát — không đụng.
// ============================================================
import { useState } from "react";
import type { DongCongViec, LoiKiemTra, MauWord } from "@/lib/types";
import { HopBaoCaoGoc } from "@/components/phong/SoDoPhong";
import type { ViecNgoaiBang } from "@/lib/so-cai/ai-ra-viec";
import { ngayVN } from "@/components/gui/chung";
import { moTaMoc } from "@/lib/so-cai/moc-viec";
import { canChonBld, dongCanDuyet, type DuDoanHienThi, type QuyetDuyet } from "@/components/kiem-tra/BangCongViecKiemTra";
import { chonMacDinh, type ChonViecAi } from "@/components/kiem-tra/ViecAiNgoaiBang";
import { cachChon, giaTriGui, type GoiYAiDong } from "./chon-vao-so";
import ONhapNgay from "@/components/common/ONhapNgay";

type GoiYAi = GoiYAiDong & { ten_goi_y: string | null; trung: { ma: string; ten: string; ly_do: string }[]; han_goi_y?: { han: string; trich: string } | null };

const ngan = (s: string, n = 42) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function BangDuyetViec({
  congViec,
  duDoan,
  loi,
  mau,
  xacNhan,
  onXacNhan,
  goiYAi,
  doiTen,
  onDoiTen,
  duyet,
  onDuyet,
  khoaDuyet,
  lanhDao,
  chonBld,
  onChonBld,
  viecAi,
  chonAi,
  onChonAi,
  quyetAi,
  onQuyetAi,
  daGui,
  nguonBc,
}: {
  congViec: DongCongViec[];
  duDoan: DuDoanHienThi[];
  loi: LoiKiemTra[];
  mau: MauWord | null | undefined;
  xacNhan: Record<number, string>;
  onXacNhan: (dong: number, v: string | null) => void;
  goiYAi?: GoiYAi[] | null;
  doiTen: Record<number, string>;
  onDoiTen: (dong: number, ten: string | null) => void;
  duyet: Record<number, QuyetDuyet>;
  onDuyet: (dong: number, v: QuyetDuyet | null) => void;
  khoaDuyet: string | null;
  lanhDao: { id: string; ten: string }[];
  chonBld: Record<number, string>;
  onChonBld: (dong: number, id: string | null) => void;
  viecAi: ViecNgoaiBang[];
  chonAi: Record<number, ChonViecAi>;
  onChonAi: (i: number, c: ChonViecAi) => void;
  quyetAi: Record<number, QuyetDuyet>;
  onQuyetAi: (i: number, v: QuyetDuyet | null) => void;
  daGui: boolean;
  /** Báo cáo đang nộp — dòng "lọc ra từ hệ thống báo cáo <nhan>" mở bản gốc */
  nguonBc?: { taiLieuId: string; nhan: string } | null;
}) {
  const [xemGoc, setXemGoc] = useState<string | null>(null);
  const canDuyet = new Set(dongCanDuyet(duDoan, congViec, mau));
  const qd = new Set((mau?.dinh_nghia.bang_cong_viec ?? []).filter((b) => b.la_quyet_dinh).map((b) => b.tag));
  const tenBang = (tag: string) => mau?.dinh_nghia.bang_cong_viec.find((b) => b.tag === tag)?.nhan ?? tag;
  const loiO = (c: DongCongViec, cot?: string) => loi.filter((l) => l.vi_tri?.bang === c.nguon_bang && l.vi_tri?.dong === c.dong_so && (!cot || l.vi_tri?.cot === cot));
  const cls = (c: DongCongViec, cot: string) => (loiO(c, cot).some((l) => l.muc === "chan") ? "loi" : "");
  const dongThieuTen = loi.filter((l) => l.vi_tri?.cot === "ten" && l.vi_tri.bang);

  if (!congViec.length && !viecAi.length && !dongThieuTen.length)
    return <div className="ghi">Không có công việc nào trong chương “Kết quả và kế hoạch việc” của file.</div>;

  const nutDuyet = (v: QuyetDuyet | undefined, onChon: (x: QuyetDuyet | null) => void, khoaDuyetRieng?: string | null) => {
    if (daGui) return <span className={v === "bo" ? "text-text-muted" : "ok"}>{v === "bo" ? "Đã bỏ" : "Đã duyệt"}</span>;
    const nut = (gt: QuyetDuyet, nhan: string) => (
      <button
        type="button"
        className={`nn${v === gt ? " chon" : ""}`}
        disabled={!!khoaDuyet || (gt === "duyet" && !!khoaDuyetRieng)}
        title={khoaDuyet ?? (gt === "duyet" ? (khoaDuyetRieng ?? undefined) : undefined)}
        onClick={() => onChon(v === gt ? null : gt)}
      >
        {nhan}
      </button>
    );
    return (
      <div className="flex gap-1.5">
        {nut("duyet", "Duyệt")}
        {nut("bo", "Bỏ")}
      </div>
    );
  };

  return (
    <div className="cuon-ngang scroll-thin">
      <table className="bang-viec" style={{ minWidth: 760 }}>
        <thead>
          <tr>
            <th style={{ width: "34%" }}>Công việc trong báo cáo</th>
            <th>Phụ trách</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th style={{ width: "22%" }}>Vào sổ cái</th>
            <th>Duyệt</th>
          </tr>
        </thead>
        <tbody>
          {congViec.length || dongThieuTen.length ? (
            <tr className="nhom">
              <td colSpan={6}>
                Việc máy lấy từ bảng “{Array.from(new Set(congViec.map((c) => tenBang(c.nguon_bang)))).join("”, “") || "Kết quả và kế hoạch việc"}”
                <span className="phu">· {congViec.length} việc · đọc đúng từng cột: tên, phụ trách, ngày</span>
              </td>
            </tr>
          ) : null}
          {congViec.map((c, i) => {
            const d = duDoan.find((x) => x.chi_so === i);
            const dong = d?.dong;
            const g = goiYAi?.find((x) => x.chi_so === i);
            const tenMoi = dong !== undefined ? doiTen[dong] : undefined;
            const v = dong !== undefined ? duyet[dong] : undefined;
            const treo = !c.ket_thuc && !c.ket_thuc_sau;
            // Ô Vào sổ cái: ứng viên của máy + của AI, dòng đã xong, AI rà từng ứng viên — một chỗ tính (chon-vao-so.ts)
            const cc = cachChon(d, c, g ?? undefined);
            const ungVien = cc.ungVien;
            const chon = dong !== undefined ? xacNhan[dong] : undefined;
            const phaiChon = cc.macDinh === "";
            const choChon = phaiChon && !chon;
            const canBld = canChonBld(c) && dong !== undefined && !chonBld[dong];
            const uvChon = ungVien.find((u) => u.ma === chon) ?? (!chon && phaiChon ? ungVien.find((u) => !u.ai_sai) : undefined);
            const giaTri = chon ?? cc.macDinh;

            let soCai: React.ReactNode;
            if (qd.has(c.nguon_bang)) soCai = <span>Chờ TGĐ quyết định</span>;
            else if (!d) soCai = <span className="text-text-muted">—</span>;
            else if (d.hanh_dong === "de") soCai = <><span>Cập nhật {d.cong_viec_id}</span>{d.ly_do ? <div className="phu">{d.ly_do}</div> : null}</>;
            else if (d.hanh_dong === "khong_dung" && cc.luaChon.length <= 1)
              soCai = <><span className="text-text-muted">{cc.laXong && !d.cong_viec_id ? "Không vào sổ — việc đã xong" : `Không dùng${d.cong_viec_id ? ` · ${d.cong_viec_id}` : ""}`}</span>{d.ly_do ? <div className="phu">{d.ly_do}</div> : null}</>;
            else if (d.hanh_dong === "dong_viec") soCai = <span>Đóng {d.cong_viec_id}</span>;
            else
              soCai = (
                <>
                  {cc.luaChon.length > 1 && !daGui ? (
                    <select
                      value={giaTri}
                      onChange={(e) => dong !== undefined && onXacNhan(dong, giaTriGui(cc, e.target.value))}
                      style={choChon ? { borderColor: "var(--p-warn)" } : undefined}
                    >
                      {phaiChon ? <option value="">— Có vẻ trùng, chọn —</option> : null}
                      {cc.luaChon.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.nhan}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span>
                      {giaTri === "khong"
                        ? "Không vào sổ — việc đã xong"
                        : giaTri === "xong"
                          ? `Vào sổ — đã xong${cc.xongLanDau ? ` ngày ${ngayVN(cc.xongLanDau)}` : ""}${d.cong_viec_id ? ` · ${d.cong_viec_id}` : ""}`
                          : giaTri && giaTri !== "moi"
                            ? `Gộp vào ${giaTri}`
                            : "Việc mới"}
                    </span>
                  )}
                  {cc.aiXong ? (
                    <div className="phu">
                      🤖 đọc tình trạng “{c.tinh_trang}” là đã xong: {cc.aiXong}
                    </div>
                  ) : c.da_xong && giaTri === "khong" ? (
                    <div className="phu">báo “{c.tinh_trang ?? "đã xong"}” — xong rồi thì không giao</div>
                  ) : c.da_xong && giaTri === "xong" ? (
                    <div className="phu">báo “{c.tinh_trang ?? "đã xong"}” — lần nạp đầu: ghi vào sổ ở trạng thái đã xong để có trong «Việc làm xong», không giao việc</div>
                  ) : null}
                  {uvChon ? <div className="phu">{uvChon.ma}: {uvChon.ly_do}</div> : null}
                  {ungVien
                    .filter((u) => u.ai_sai)
                    .map((u) => (
                      <div key={u.ma} className="phu">
                        🤖 {u.ma} khác việc: {u.ai_sai}
                      </div>
                    ))}
                  {g?.van_de ? <div className="phu loi">🤖 {g.van_de}</div> : null}
                  {treo && !qd.has(c.nguon_bang) ? <div className="phu loi">Thiếu ngày kết thúc — sửa rồi gửi lại</div> : null}
                  {c.ket_thuc_sau ? <div className="phu">hạn chờ mốc</div> : null}
                </>
              );

            return (
              <tr key={`${c.nguon_bang}-${c.dong_so}`} className={v === "bo" ? "bo" : ""}>
                <td className={cls(c, "ten")}>
                  <div className="ten-viec">
                    {c.ma_viec ? <span className="text-text-muted">{c.ma_viec} · </span> : null}
                    {tenMoi ?? c.ten}
                  </div>
                  {tenMoi ? <div className="phu line-through">{c.ten}</div> : null}
                  {c.ket_qua_can_co ? (
                    <div className="kq">
                      <span className="nhan-kq">Kết quả cần có:</span> {c.ket_qua_can_co}
                    </div>
                  ) : null}
                  {g?.ten_goi_y && dong !== undefined && !daGui ? (
                    <div className="phu">
                      🤖 Tên gợi ý: {g.ten_goi_y}{" "}
                      <button type="button" className="lk" onClick={() => onDoiTen(dong, tenMoi ? null : g.ten_goi_y)}>
                        {tenMoi ? "giữ tên cũ" : "dùng tên này"}
                      </button>
                    </div>
                  ) : null}
                  <div className="phu">
                    {c.du_an ? `${c.du_an} · ` : ""}
                    {c.da_xong ? "báo đã xong · " : ""}
                    lọc ra từ hệ thống báo cáo{" "}
                    {nguonBc ? (
                      <button type="button" className="lk" onClick={() => setXemGoc(c.ten)} title="Mở báo cáo gốc — khung cam là dòng máy lọc ra việc này">
                        {nguonBc.nhan}
                      </button>
                    ) : (
                      "này"
                    )}
                  </div>
                </td>
                <td className={cls(c, "phu_trach")}>
                  {c.phu_trach.length ? c.phu_trach.map((p) => p.ten).join(", ") : <span className="text-text-muted">—</span>}
                  {c.phu_trach_tu_gan ? <div className="phu">đơn vị lập báo cáo</div> : null}
                  {canChonBld(c) && lanhDao.length && dong !== undefined ? (
                    <select
                      className="mt-1"
                      value={chonBld[dong] ?? ""}
                      disabled={daGui || !!khoaDuyet}
                      onChange={(e) => onChonBld(dong, e.target.value || null)}
                      style={!chonBld[dong] ? { borderColor: "var(--p-warn)" } : undefined}
                      title="Báo cáo ghi “Ban lãnh đạo” chung chung — chọn lãnh đạo đích danh"
                    >
                      <option value="">Lãnh đạo nào?</option>
                      {lanhDao.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.ten}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </td>
                <td className={`ngay ${cls(c, "bat_dau")}`}>
                  {c.bat_dau_sau ? moTaMoc(c.bat_dau_sau) : ngayVN(c.bat_dau) || "—"}
                  {c.bat_dau_kieu === "ngay_bao_cao" ? <div className="phu">= ngày nộp</div> : null}
                </td>
                <td className={`ngay ${cls(c, "ket_thuc")}`}>
                  {c.ket_thuc_sau ? moTaMoc(c.ket_thuc_sau) : ngayVN(c.ket_thuc) || (loiO(c, "ket_thuc").some((l) => l.muc === "chan") ? "thiếu hạn" : "—")}
                  {g?.han_goi_y ? <div className="phu">🤖 thấy hạn {ngayVN(g.han_goi_y.han)} — ghi vào file rồi tải lại</div> : null}
                </td>
                <td>{soCai}</td>
                <td>
                  {dong === undefined || !canDuyet.has(dong) ? (
                    <span className="text-text-muted">không cần</span>
                  ) : (
                    nutDuyet(
                      v,
                      (x) => onDuyet(dong, x),
                      choChon ? "Chọn “Việc mới” hoặc “Đúng là …” ở cột Vào sổ cái trước" : canBld ? "Chọn lãnh đạo cụ thể ở cột Phụ trách trước" : null,
                    )
                  )}
                </td>
              </tr>
            );
          })}
          {dongThieuTen.map((l, i) => (
            <tr key={`thieu-${i}`}>
              <td colSpan={6} className={l.muc === "chan" ? "loi" : ""}>
                {l.thong_diep}
              </td>
            </tr>
          ))}
          {viecAi.length ? (
            <tr className="nhom">
              <td colSpan={6}>
                Việc AI tìm thêm ở các mục khác của báo cáo
                <span className="phu">· {viecAi.length} việc · không nằm trong bảng việc nên không có cột phụ trách / ngày — kiểm, sửa rồi Duyệt hoặc Bỏ từng việc</span>
              </td>
            </tr>
          ) : null}
          {viecAi.map((va, i) => {
            const c = chonAi[i] ?? chonMacDinh(va);
            const doi = (x: Partial<ChonViecAi>) => onChonAi(i, { ...c, ...x });
            const v = quyetAi[i];
            const khoa = daGui || v === "bo";
            const thieu = !c.ten.trim() ? "Ghi tên việc trước" : !c.han ? "Ghi hạn (cột Kết thúc) trước" : null;
            return (
              <tr key={`ai-${i}`} className={v === "bo" ? "bo" : ""}>
                <td>
                  <input className="ten-viec" value={c.ten} disabled={khoa} onChange={(e) => doi({ ten: e.target.value })} />
                  <div className="phu">
                    {va.van_xuoi ? `🤖 AI nhặt ở chương văn xuôi “${va.muc ?? ""}”` : `🤖 AI tìm ${va.muc ? `ở mục ${va.muc}` : "ngoài bảng"}`}: “{va.trich}”
                  </div>
                  {va.tach ? <div className="phu">Máy đã gộp dòng này với “{va.tach.voi}” — AI cho là việc khác: {va.tach.ly_do}</div> : null}
                </td>
                <td>
                  <input value={c.nguoi_lam} placeholder="đơn vị lập" disabled={khoa} onChange={(e) => doi({ nguoi_lam: e.target.value })} />
                </td>
                <td className="ngay">
                  —<div className="phu">= ngày nộp</div>
                </td>
                <td className="ngay">
                  <ONhapNgay value={c.han} disabled={khoa} onChange={(x) => doi({ han: x })} style={!c.han && v !== "bo" ? { borderColor: "var(--p-warn)" } : undefined} />
                </td>
                <td>
                  {va.trung.length ? (
                    <>
                      <select value={c.gop} disabled={khoa} onChange={(e) => doi({ gop: e.target.value })}>
                        <option value="">Việc mới</option>
                        {va.trung.map((t) => (
                          <option key={t.ma} value={t.ma}>
                            Đúng là {t.ma} · {ngan(t.ten)}
                          </option>
                        ))}
                      </select>
                      <div className="phu">
                        {(va.trung.find((t) => t.ma === c.gop) ?? va.trung[0]).ma}: 🤖 {(va.trung.find((t) => t.ma === c.gop) ?? va.trung[0]).ly_do}
                      </div>
                    </>
                  ) : (
                    <span>Việc mới</span>
                  )}
                </td>
                <td>{nutDuyet(v, (x) => onQuyetAi(i, x), thieu)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {xemGoc && nguonBc ? (
        <HopBaoCaoGoc v={{ ten: xemGoc, nguon: { tai_lieu_id: nguonBc.taiLieuId, nhan: `Báo cáo ${nguonBc.nhan}` } }} dong={() => setXemGoc(null)} />
      ) : null}
    </div>
  );
}
