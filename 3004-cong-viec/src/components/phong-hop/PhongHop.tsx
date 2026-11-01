"use client";
// ============================================================
// PhongHop — menu «Phòng họp» (Mr. Đại chốt 25/10/2026; đề xuất DE-XUAT-PHONG-HOP-25-10.md, câu chốt A).
//   TRÁI : ảnh mặt bằng (public/phong-hop/mat-bang.webp) + 2 nút «Đăng ký phòng họp» · «Thông báo họp giao ban»; GIỮA: lịch các phòng».
//          Phòng đang họp: người ngồi (tên ngắn trên đầu; Chủ tịch vòng đỏ nhấp nháy, Tổng giám đốc vòng xanh lá) + khung đỏ nhấp nháy.
//          Có lịch sắp tới hôm nay: khung vàng nhấp nháy. Không còn cuộc nào tới 17:00: phủ xám như tắt điện. Rê chuột → khung chi tiết.
//   PHẢI : nội dung theo nút. Luật giờ / màu / ghế ở lib/phong-hop/thuan.ts (một chỗ, luật 7).
// ============================================================
import "./phong-hop.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { goiApi } from "@/components/layout/giao-dien";
import ONhapNgay from "@/components/common/ONhapNgay";
import {
  ANH_CAO,
  ANH_RONG,
  BUOC_PHUT,
  CAC_O,
  CHU_BUOI,
  DAU_BUOI,
  buoiCua,
  denKetThucSom,
  mocBatDauCho,
  mocKetThucCho,
  trangThaiCuoc,
  MOC_BAT_DAU,
  MOC_KET_THUC,
  PHONG_HOP,
  THU,
  bayGioVN,
  chong,
  congNgay,
  cuocTrung,
  cauTrung,
  gio,
  khoangGio,
  laDuongDanHop,
  ngayGiaoBanKeTiep,
  mauO,
  ngayVN,
  phongTheoId,
  phut,
  tenNganNguoi,
  tenThu,
  thuCua,
  trangThaiPhong,
  xepGhe,
  type CuocHop,
  type MucMoi,
  type NguoiDanhMuc,
} from "@/lib/phong-hop/thuan";

type Nhom = { id: string; ten: string; so: number; ids: string[] };
type DonVi = { id: string; ten: string; ten_ngan: string; so: number; ids: string[] };
interface DanhMuc {
  nguoi: NguoiDanhMuc[];
  don_vi: DonVi[];
  nhom: Nhom[];
}
interface DuLieu {
  bay: { ngay: string; phut: number; gio: string };
  ngay: string;
  cuoc: CuocHop[];
  danh_muc: DanhMuc | null;
  toi: { id: string; ten: string; la_quan_tri: boolean };
  lap_giao_ban: boolean;
}
type CheDo = "dang-ky" | "giao-ban";

/** Người dự thật của một danh sách mục mời (giống máy chủ bungMoi) */
function bung(muc: MucMoi[], dm: DanhMuc | null): string[] {
  if (!dm) return [];
  const ra = new Set<string>();
  for (const m of muc) {
    if (m.loai === "nguoi") ra.add(m.id);
    else if (m.loai === "don_vi") dm.don_vi.find((d) => d.id === m.id)?.ids.forEach((x) => ra.add(x));
    else dm.nhom.find((d) => d.id === m.id)?.ids.forEach((x) => ra.add(x));
  }
  return [...ra];
}
const tenMuc = (m: MucMoi, dm: DanhMuc | null): string =>
  m.loai === "nguoi"
    ? (dm?.nguoi.find((n) => n.id === m.id)?.ten ?? m.id)
    : m.loai === "don_vi"
      ? `Cả ${dm?.don_vi.find((d) => d.id === m.id)?.ten_ngan ?? m.id}`
      : (dm?.nhom.find((d) => d.id === m.id)?.ten ?? m.id);

// ---------------- ô chọn người mời: gõ tìm, bấm một dòng là thêm và đóng (quy tắc 4) ----------------
function ChonMoi({ dm, muc, setMuc, gt }: { dm: DanhMuc | null; muc: MucMoi[]; setMuc: (m: MucMoi[]) => void; gt: string }) {
  const [tim, setTim] = useState("");
  const [mo, setMo] = useState(false);
  const bo = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  const co = (m: MucMoi) => muc.some((x) => x.loai === m.loai && x.id === m.id);
  const k = bo(tim.trim());
  const dsNhom = (dm?.nhom ?? []).filter((n) => !co({ loai: "nhom", id: n.id }) && (!k || bo(n.ten).includes(k)));
  const dsDv = (dm?.don_vi ?? []).filter((d) => !co({ loai: "don_vi", id: d.id }) && (!k || bo(`${d.ten_ngan} ${d.ten}`).includes(k)));
  const dsNg = (dm?.nguoi ?? []).filter((n) => !co({ loai: "nguoi", id: n.id }) && (!k || bo(`${n.ten} ${n.don_vi ?? ""}`).includes(k))).slice(0, 40);
  const them = (m: MucMoi) => {
    setMuc([...muc, m]);
    setTim("");
    setMo(false);
  };
  const tong = bung(muc, dm).length;
  return (
    <div className="ph-moi" data-gt={gt}>
      <div className="ph-chip-ds">
        {muc.map((m) => (
          <span key={`${m.loai}:${m.id}`} className="ph-chip">
            {tenMuc(m, dm)}
            {m.loai !== "nguoi" && <span className="mo"> ({(m.loai === "don_vi" ? dm?.don_vi.find((d) => d.id === m.id)?.so : dm?.nhom.find((d) => d.id === m.id)?.so) ?? 0} người)</span>}
            <button type="button" title={`Bỏ ${tenMuc(m, dm)}`} onClick={() => setMuc(muc.filter((x) => !(x.loai === m.loai && x.id === m.id)))}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="ph-moi-o">
        <input
          type="search"
          value={tim}
          placeholder="+ thêm người, cả phòng, Ban lãnh đạo… (gõ để tìm)"
          onFocus={() => setMo(true)}
          onChange={(e) => (setTim(e.target.value), setMo(true))}
          onBlur={() => window.setTimeout(() => setMo(false), 180)}
        />
        {mo && (
          <div className="ph-moi-ds">
            {dsNhom.map((n) => (
              <button type="button" key={n.id} onMouseDown={(e) => e.preventDefault()} onClick={() => them({ loai: "nhom", id: n.id })}>
                <b>{n.ten}</b> <span className="mo">· {n.so} người</span>
              </button>
            ))}
            {dsDv.map((d) => (
              <button type="button" key={d.id} onMouseDown={(e) => e.preventDefault()} onClick={() => them({ loai: "don_vi", id: d.id })}>
                Cả <b>{d.ten_ngan}</b> <span className="mo">· {d.ten} · {d.so} người</span>
              </button>
            ))}
            {dsNg.map((n) => (
              <button type="button" key={n.id} onMouseDown={(e) => e.preventDefault()} onClick={() => them({ loai: "nguoi", id: n.id })}>
                {n.ten} <span className="mo">· {n.don_vi ?? "chưa có đơn vị"}</span>
              </button>
            ))}
            {!dsNhom.length && !dsDv.length && !dsNg.length && <div className="trong">Không tìm thấy.</div>}
          </div>
        )}
      </div>
      <div className="mo nho">Tổng {tong} người dự (tính cả người trong nhóm, cả phòng; người tạo cuộc họp tự được thêm).</div>
    </div>
  );
}

// ---------------- mặt bằng bên trái ----------------
function MatBang({ dl, bay, dm, moDangKy }: { dl: DuLieu | null; bay: DuLieu["bay"]; dm: Map<string, NguoiDanhMuc>; moDangKy: (phong: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const het = useRef<number>();
  const vao = (id: string) => (window.clearTimeout(het.current), setHover(id));
  const ra = () => (het.current = window.setTimeout(() => setHover(null), 220));
  const homNay = (dl?.cuoc ?? []).filter((c) => c.ngay === bay.ngay);
  const kim = { h: ((Math.floor(bay.phut / 60) % 12) + (bay.phut % 60) / 60) * 30, m: (bay.phut % 60) * 6 };
  return (
    <div className="ph-mat-bang" data-gt="ph-mat-bang">
      <img src="/phong-hop/mat-bang.webp?v=4" alt="Mặt bằng khu phòng họp" draggable={false} />
      <svg className="ph-svg" viewBox={`0 0 ${ANH_RONG} ${ANH_CAO}`} aria-hidden>
        {/* đồng hồ treo tường ở sảnh — giờ Việt Nam */}
        {/* Mr. Đại 25/10: to hơn (bán kính 30 → 62), đặt góc trên bên phải mặt bằng */}
        <g transform="translate(1152 132)">
          <circle r="62" className="dh-mat" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="0" y1="-54" x2="0" y2={i % 3 ? -47 : -40} transform={`rotate(${i * 30})`} className="dh-vach" />
          ))}
          <line x1="0" y1="8" x2="0" y2="-30" transform={`rotate(${kim.h})`} className="dh-kim-gio" />
          <line x1="0" y1="10" x2="0" y2="-48" transform={`rotate(${kim.m})`} className="dh-kim-phut" />
          <circle r="5" className="dh-tam" />
          <text y="92" className="dh-chu">{bay.gio}</text>
        </g>
        {PHONG_HOP.map((p) => {
          const tt = trangThaiPhong(homNay, p.id, bay);
          if (tt.tt !== "dang" || !tt.cuoc) return null;
          return (
            <g key={p.id}>
              {xepGhe(tt.cuoc, dm).map((n) => (
                <g key={n.nguoi.id} transform={`translate(${n.x} ${n.y})`} className="ph-nguoi">
                  <title>{`${n.nguoi.ten}${n.chu_toa ? " — chủ toạ" : ""}`}</title>
                  <circle r="11" className={`than ${n.chu_toa ? "chu-toa" : ""}`} />
                  <circle r="6" cy="-3" className="dau" />
                  {n.vong ? (
                    // xanh dương tô thẳng trên hình (tệp phong-hop.css đang có phiên khác sửa dở)
                    <circle r="9.5" cy="-3" className={`vong vong-${n.vong}`} stroke={n.vong === "xanh-duong" ? "#2563EB" : undefined} />
                  ) : <text y="-17" className="ten-ngan">{tenNganNguoi(n.nguoi.ten)}</text>}
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      {PHONG_HOP.map((p) => {
        const tt = trangThaiPhong(homNay, p.id, bay);
        const c = tt.cuoc;
        const bien = tt.tt === "dang" && c ? `Đang họp · đến ${c.den}` : tt.tt === "sap" && c ? `Tiếp theo ${c.tu}` : "Trống";
        return (
          <div key={p.id}>
            <div
              className={`ph-o-phong tt-${tt.tt}`}
              style={{ left: `${p.khung.x}%`, top: `${p.khung.y}%`, width: `${p.khung.w}%`, height: `${p.khung.h}%` }}
              onMouseEnter={() => vao(p.id)}
              onMouseLeave={ra}
              onClick={() => moDangKy(p.id)}
              role="button"
              tabIndex={0}
              aria-label={`${p.ten} — ${bien}`}
              data-gt="ph-o-phong"
            />
            <span className={`ph-bien tt-${tt.tt}`} style={{ left: `${p.bien.x}%`, top: `${p.bien.y}%` }}>
              {bien}
            </span>
            {hover === p.id && (
              <div
                className={`ph-the ${p.khung.y > 50 ? "tren" : "duoi"}`}
                style={{ left: `${Math.min(Math.max(p.khung.x + p.khung.w / 2, 22), 78)}%`, top: p.khung.y > 50 ? `${p.khung.y}%` : `${p.khung.y + p.khung.h}%` }}
                onMouseEnter={() => vao(p.id)}
                onMouseLeave={ra}
              >
                <b>{p.ten}</b>
                {tt.tt === "tat" || !c ? (
                  <>
                    <div>Hôm nay không còn cuộc họp nào tới hết giờ làm việc — chưa ai đăng ký. Hãy đăng ký họp cho phòng này.</div>
                    <button type="button" className="nut-ph chinh" onClick={() => moDangKy(p.id)}>
                      Đăng ký phòng họp
                    </button>
                  </>
                ) : (
                  <ChiTietCuoc c={c} bay={bay} chuTri={xepGhe(c, dm).find((n) => n.chu_toa)?.nguoi.ten ?? c.nguoi_dat_ten} tieuDe={tt.tt === "dang" ? "Đang họp" : "Cuộc họp sắp tới"} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChiTietCuoc({ c, bay, tieuDe, chuTri }: { c: CuocHop; bay: DuLieu["bay"]; tieuDe?: string; chuTri?: string }) {
  const dangHop = c.ngay === bay.ngay && phut(c.tu) <= bay.phut && bay.phut < phut(c.den);
  const daQua = dangHop ? bay.phut - phut(c.tu) : 0;
  const tong = phut(c.den) - phut(c.tu);
  return (
    <div className="ph-chi-tiet">
      {tieuDe && <div className="mo nho">{tieuDe}</div>}
      <div className="nd">{c.noi_dung}</div>
      <div>
        {khoangGio(c.tu, c.den)} · {tenThu(thuCua(c.ngay))} {ngayVN(c.ngay)} · {phongTheoId(c.phong)?.ten}
      </div>
      {dangHop && (
        <div className="ph-tien" title={`Đã họp ${daQua} phút / ${tong} phút`}>
          <span style={{ width: `${Math.round((daQua / tong) * 100)}%` }} />
        </div>
      )}
      {chuTri && (
        <div>
          Chủ trì: <b>{chuTri}</b>
        </div>
      )}
      <div>
        Người tổ chức: <b>{c.nguoi_dat_ten}</b>
        {c.loai === "giao_ban" ? " · họp giao ban" : ""}
      </div>
      <div>
        Người dự ({c.moi.length}): {c.moi.map((m) => m.ten).join(", ") || "—"}
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
      {c.ghi_chu && <div className="ghi-chu">Dặn: {c.ghi_chu}</div>}
      {c.an_chi_tiet && <div className="ghi-chu">Ghi chú, đường dẫn họp, khách ngoài: chỉ người đặt, người được mời và quản trị xem được.</div>}
    </div>
  );
}

// ---------------- 3 thanh giờ ----------------
function ThanhGio({
  ds,
  ngay,
  bay,
  chon,
  bamO,
  boQua,
}: {
  ds: CuocHop[];
  ngay: string;
  bay: DuLieu["bay"];
  chon: { phong: string; tu: string; den: string };
  bamO: (phong: string, o: string, keo: boolean) => void;
  boQua?: number;
}) {
  const keo = useRef(false);
  useEffect(() => {
    const tha = () => (keo.current = false);
    window.addEventListener("pointerup", tha);
    return () => window.removeEventListener("pointerup", tha);
  }, []);
  return (
    <div className="ph-thanh-gio" data-gt="ph-thanh-gio">
      <div className="ph-hang dau">
        <span className="ten" />
        {CAC_O.map((o, i) => (
          <span key={o} className={`gio ${DAU_BUOI.has(o) ? "dau-buoi" : ""}`}>
            {/* «14» ngay sau «13:30» bị dính thành «13:3014» → bỏ nhãn giờ chẵn đứng liền sau nhãn đầu buổi */}
            {DAU_BUOI.has(o) ? o : o.endsWith(":00") && !DAU_BUOI.has(CAC_O[i - 1]) ? o.slice(0, 2) : ""}
          </span>
        ))}
      </div>
      {PHONG_HOP.map((p) => (
        <div key={p.id} className="ph-hang">
          <span className="ten">
            {p.ten.replace("Phòng họp ", "P.")}
          </span>
          {CAC_O.map((o) => {
            const m = mauO(ds.filter((c) => c.id !== boQua), p.id, ngay, o, bay);
            const dangChon = chon.phong === p.id && phut(chon.tu) <= phut(o) && phut(o) < phut(chon.den);
            const tieuDe =
              m.cuoc
                ? `${p.ten} · ${khoangGio(m.cuoc.tu, m.cuoc.den)} · ${m.cuoc.noi_dung} — ${m.cuoc.nguoi_dat_ten} đặt`
                : m.mau === "qua"
                  ? `${o} đã qua`
                  : `${p.ten} · ${o} – ${gio(phut(o) + BUOC_PHUT)} trống — bấm (hoặc kéo qua nhiều ô) để chọn`;
            return (
              <button
                type="button"
                key={o}
                className={`o-gio m-${m.mau}${dangChon ? " dang-chon" : ""}${DAU_BUOI.has(o) ? " dau-buoi" : ""}`}
                title={tieuDe}
                aria-label={tieuDe}
                disabled={m.mau === "qua"}
                onPointerDown={(e) => {
                  if (m.mau !== "trong") return;
                  e.preventDefault();
                  keo.current = true;
                  bamO(p.id, o, false);
                }}
                onPointerEnter={() => keo.current && m.mau === "trong" && bamO(p.id, o, true)}
                onClick={() => m.mau !== "trong" && m.cuoc && bamO(p.id, `#${m.cuoc.id}`, false)}
              />
            );
          })}
        </div>
      ))}
      <div className="ph-chu-thich">
        <span>
          <i className="m-trong" /> Trống
        </span>
        <span>
          <i className="m-dat" /> Đã có người đặt
        </span>
        <span>
          <i className="m-dang" /> Đang họp
        </span>
        <span>
          <i className="m-qua" /> Đã qua
        </span>
        <span>
          <i className="dang-chon-mau" /> Bạn đang chọn
        </span>
        <span className="mo">Mỗi ô 30 phút · {CHU_BUOI}</span>
      </div>
    </div>
  );
}

// ---------------- màn đăng ký ----------------
interface Form {
  phong: string;
  ngay: string;
  tu: string;
  den: string;
  noi_dung: string;
  moi: MucMoi[];
  khach_ngoai: string;
  duong_dan: string;
  ghi_chu: string;
}
const formTrong = (ngay: string, phong = "p01"): Form => ({ phong, ngay, tu: "", den: "", noi_dung: "", moi: [], khach_ngoai: "", duong_dan: "", ghi_chu: "" });

function DangKy({
  dl,
  dsNgay,
  bay,
  ngay,
  setNgay,
  form,
  setForm,
  dangSua,
  setDangSua,
  xemCuoc,
  setXemCuoc,
  chuTri,
  xong,
}: {
  dl: DuLieu;
  dsNgay: CuocHop[];
  bay: DuLieu["bay"];
  ngay: string;
  setNgay: (n: string) => void;
  form: Form;
  setForm: (f: Form | ((f: Form) => Form)) => void;
  dangSua: CuocHop | null;
  setDangSua: (c: CuocHop | null) => void;
  xemCuoc: CuocHop | null;
  setXemCuoc: (c: CuocHop | null) => void;
  chuTri: (c: CuocHop) => string;
  xong: (bao: string) => void;
}) {
  const dm = dl.danh_muc;
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const [chacHuy, setChacHuy] = useState(false);
  const [chacKetThuc, setChacKetThuc] = useState(false); // «Kết thúc sớm» bấm hai lần: lần 1 hiện giờ mới, lần 2 mới chạy (Mr. Đại 29/10/2026)
  const duocSua = (c: CuocHop) => c.nguoi_dat === dl.toi.id || dl.toi.la_quan_tri;
  const dsCuocKhac = dsNgay.filter((c) => c.id !== dangSua?.id);
  /** Mở sửa — chỉ cuộc CHƯA diễn ra của mình (hoặc quản trị); cuộc đang họp / đã xong chỉ xem */
  const moSua = (c: CuocHop) => {
    setDangSua(c);
    setXemCuoc(null);
    setForm({ phong: c.phong, ngay: c.ngay, tu: c.tu, den: c.den, noi_dung: c.noi_dung, moi: c.moi.map((m) => ({ loai: "nguoi", id: m.id })), khach_ngoai: c.khach_ngoai ?? "", duong_dan: c.duong_dan ?? "", ghi_chu: c.ghi_chu ?? "" });
  };
  const oTrong = (phong: string, o: string) => mauO(dsCuocKhac, phong, ngay, o, bay).mau === "trong";
  /**
   * Bấm / kéo ô (Mr. Đại 25/10/2026 — rà lại từng tình huống):
   *   · ô của một cuộc họp: chưa họp + của mình → Sửa · đang họp / đã xong / của người khác → chỉ xem (đang họp của mình: nút Kết thúc sớm)
   *   · ô trống: bấm lại ô đang chọn (khoảng 1 ô) → bỏ chọn · kéo hoặc bấm ô liền sau khoảng đang chọn → nối dài, nhưng chỉ trong
   *     CÙNG phòng, CÙNG buổi và mọi ô ở giữa đều trống (gặp ô vàng / đỏ thì dừng) · còn lại → chọn lại từ ô đó
   */
  const bamO = (phong: string, o: string, keo: boolean) => {
    setLoi("");
    if (o.startsWith("#")) {
      const c = dsNgay.find((x) => x.id === Number(o.slice(1)));
      if (!c) return;
      if (duocSua(c) && trangThaiCuoc(c, bay) === "sap") moSua(c);
      else setXemCuoc(c);
      return;
    }
    const sau = gio(phut(o) + BUOC_PHUT);
    setForm((f) => {
      const cungKhoang = f.phong === phong && f.ngay === ngay && f.tu && f.den;
      if (!keo && cungKhoang && f.tu === o && f.den === sau) return { ...f, tu: "", den: "" };
      if (cungKhoang && (keo || o === f.den) && buoiCua(o) === buoiCua(f.tu)) {
        const tu = phut(o) < phut(f.tu) ? o : f.tu;
        const den = phut(sau) > phut(f.den) ? sau : f.den;
        const giua = CAC_O.filter((x) => phut(x) >= phut(tu) && phut(x) < phut(den));
        if (giua.every((x) => oTrong(phong, x))) return { ...f, tu, den };
        return f; // kéo tới ô đã có người đặt → dừng ở mép
      }
      if (keo) return f;
      return { ...f, phong, tu: o, den: sau, ngay };
    });
  };
  const ketThucSom = async (c: CuocHop) => {
    if (!chacKetThuc) return setChacKetThuc(true);
    setDang(true);
    try {
      const r = await goiApi<{ cuoc: CuocHop }>(`/api/phong-hop/${c.id}`, { method: "POST" });
      xong(`Đã kết thúc sớm «${c.noi_dung}» lúc ${r.cuoc.den} — ${phongTheoId(c.phong)?.ten} trống từ ${r.cuoc.den}, đã báo người dự`);
      setXemCuoc(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
      setChacKetThuc(false);
    }
  };

  const trung = form.tu && form.den ? cuocTrung(dsCuocKhac, { phong: form.phong, ngay: form.ngay, tu: form.tu, den: form.den, noi_dung: "" }) : undefined;
  const nguoiDu = useMemo(() => [...new Set([...bung(form.moi, dm), dl.toi.id])], [form.moi, dm, dl.toi.id]);
  const p = phongTheoId(form.phong);
  const ban =
    form.tu && form.den
      ? nguoiDu
          .map((id) => {
            const c = dsCuocKhac.find((x) => x.ngay === form.ngay && chong(x, form) && x.moi.some((m) => m.id === id));
            return c ? { id, c } : null;
          })
          .filter((x): x is { id: string; c: CuocHop } => !!x)
      : [];
  const tenNg = (id: string) => dm?.nguoi.find((n) => n.id === id)?.ten ?? id;
  const thieu = !form.tu || !form.den ? "Chọn giờ trên thanh hoặc ở ô Bắt đầu / Kết thúc" : !form.noi_dung.trim() ? "Chưa ghi nội dung họp" : trung ? cauTrung(trung) : "";
  const gui = async () => {
    setDang(true);
    setLoi("");
    try {
      const body = { ...form };
      if (dangSua) await goiApi(`/api/phong-hop/${dangSua.id}`, { method: "PUT", body });
      else await goiApi("/api/phong-hop", { body });
      const ten = p?.ten ?? form.phong;
      xong(
        dangSua
          ? `Đã lưu cuộc họp ${ten} · ${khoangGio(form.tu, form.den)} ngày ${ngayVN(form.ngay)}`
          : `Đã đặt ${ten} · ${khoangGio(form.tu, form.den)} ngày ${ngayVN(form.ngay)} — đã báo ${nguoiDu.length - 1} người qua thanh trên`,
      );
      setDangSua(null);
      setForm(formTrong(form.ngay, form.phong));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  };
  const huy = async () => {
    if (!dangSua) return;
    if (!chacHuy) return setChacHuy(true);
    setDang(true);
    try {
      await goiApi(`/api/phong-hop/${dangSua.id}`, { method: "DELETE" });
      xong(`Đã huỷ cuộc họp «${dangSua.noi_dung}» — đã báo người dự`);
      setDangSua(null);
      setForm(formTrong(form.ngay, form.phong));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
      setChacHuy(false);
    }
  };
  const dat = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  // Đổi ngày = xoá giờ đã chọn của ngày cũ (trước: ‹ › đổi ngày mà giờ cũ vẫn giữ, bấm Đăng ký là đặt nhầm ngày)
  const doiNgay = (v: string) => {
    setNgay(v);
    setXemCuoc(null);
    setForm((f) => ({ ...f, ngay: v, tu: "", den: "" }));
  };
  // Đổi giờ bắt đầu: giờ kết thúc không còn hợp lệ (trước bắt đầu / khác buổi) thì tự đặt = bắt đầu + 30 phút
  const doiTu = (tu: string) => setForm((f) => ({ ...f, tu, den: !tu ? "" : mocKetThucCho(tu).includes(f.den) ? f.den : gio(phut(tu) + BUOC_PHUT) }));
  const tt = xemCuoc ? trangThaiCuoc(xemCuoc, bay) : null;
  return (
    <div className="ph-phai-than">
      <div className="ph-dau">
        <b>{dangSua ? "Sửa cuộc họp" : "Đăng ký phòng họp"}</b>
        <span className="ph-ngay">
          <button type="button" className="nut-ph" title="Ngày trước" onClick={() => doiNgay(congNgay(ngay, -1))} disabled={ngay <= bay.ngay}>
            ‹
          </button>
          <ONhapNgay className="ph-o-ngay" value={ngay} min={bay.ngay} onChange={(v) => v && doiNgay(v)} aria-label="Ngày họp" />
          <button type="button" className="nut-ph" title="Ngày sau" onClick={() => doiNgay(congNgay(ngay, 1))}>
            ›
          </button>
          <span className="mo nho">{tenThu(thuCua(ngay))}</span>
        </span>
      </div>
      <ThanhGio ds={dsNgay} ngay={ngay} bay={bay} chon={form.ngay === ngay ? form : { phong: "", tu: "", den: "" }} bamO={bamO} boQua={dangSua?.id} />
      {xemCuoc && (
        <div className="ph-hop-xem">
          <ChiTietCuoc
            c={xemCuoc}
            bay={bay}
            chuTri={chuTri(xemCuoc)}
            tieuDe={tt === "dang" ? "Đang họp" : tt === "xong" ? "Đã họp xong" : duocSua(xemCuoc) ? "Cuộc họp của bạn" : `${xemCuoc.nguoi_dat_ten} đặt — chỉ người đặt hoặc quản trị sửa được`}
          />
          <div className="ph-nut-doc">
            {tt === "sap" && duocSua(xemCuoc) && (
              <button type="button" className="nut-ph" onClick={() => moSua(xemCuoc)}>
                Sửa cuộc họp
              </button>
            )}
            {tt === "dang" && duocSua(xemCuoc) && phut(denKetThucSom(bay)) < phut(xemCuoc.den) && (
              <button type="button" className="nut-ph nguy" disabled={dang} onClick={() => void ketThucSom(xemCuoc)} onBlur={() => setChacKetThuc(false)} title={`Kết thúc lúc ${denKetThucSom(bay)}, trả phòng phần còn lại — người dự nhận chuông báo`}>
                {chacKetThuc ? `Bấm lần nữa: kết thúc lúc ${denKetThucSom(bay)}, báo người dự` : `Kết thúc sớm (${denKetThucSom(bay)})`}
              </button>
            )}
            <button type="button" className="nut-ph" onClick={() => setXemCuoc(null)}>
              Đóng
            </button>
          </div>
        </div>
      )}
      <div className="ph-form" data-gt="ph-form">
        <label>Phòng</label>
        <div className="ph-nut-nhom">
          {PHONG_HOP.map((x) => (
            <button type="button" key={x.id} className={`nut-ph ${form.phong === x.id ? "dang" : ""}`} onClick={() => setForm((f) => ({ ...f, phong: x.id }))}>
              {x.ten}
            </button>
          ))}
        </div>
        <label>Thời gian</label>
        <div className="ph-hang-o">
          <span>{ngayVN(form.ngay)}</span>
          <select value={form.tu} onChange={(e) => doiTu(e.target.value)} aria-label="Bắt đầu">
            <option value="">Bắt đầu</option>
            {mocBatDauCho(form.ngay, bay).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <span>–</span>
          <select value={form.den} onChange={(e) => dat("den", e.target.value)} aria-label="Kết thúc">
            <option value="">Kết thúc</option>
            {(form.tu ? mocKetThucCho(form.tu) : []).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          {form.tu && form.den && <b>{khoangGio(form.tu, form.den).split(" · ")[0]}</b>}
        </div>
        <label>Nội dung họp</label>
        <input value={form.noi_dung} onChange={(e) => dat("noi_dung", e.target.value)} placeholder="vd: Rà soát tiến độ Hướng Việt tuần 44" maxLength={300} />
        <label>Người dự</label>
        <ChonMoi dm={dm} muc={form.moi} setMuc={(m) => setForm((f) => ({ ...f, moi: m }))} gt="ph-moi" />
        {p && nguoiDu.length > p.so_ghe && (
          <div className="ph-canh-bao">
            ⚠ Mời {nguoiDu.length} người — {p.ten} có {p.so_ghe} ghế. Vẫn đặt được.
          </div>
        )}
        {ban.length > 0 && (
          <div className="ph-canh-bao">
            ⚠ {ban.length} người đang có họp khác cùng giờ (vẫn đặt được):
            <ul>
              {ban.slice(0, 8).map((b) => (
                <li key={b.id}>
                  {tenNg(b.id)} — {phongTheoId(b.c.phong)?.ten} {khoangGio(b.c.tu, b.c.den)} «{b.c.noi_dung}»
                </li>
              ))}
              {ban.length > 8 && <li>… và {ban.length - 8} người khác</li>}
            </ul>
          </div>
        )}
        <label>Khách mời ngoài</label>
        <input value={form.khach_ngoai} onChange={(e) => dat("khach_ngoai", e.target.value)} placeholder="Không bắt buộc — vd: Tư vấn giám sát Công ty ABC (2 người)" maxLength={500} />
        <label>Họp trực tuyến</label>
        <input value={form.duong_dan} onChange={(e) => dat("duong_dan", e.target.value)} placeholder="Không bắt buộc — dán đường dẫn Zoom / Teams / Meet" maxLength={500} />
        {form.duong_dan.trim() && !laDuongDanHop(form.duong_dan) && <div className="ph-loi">Đường dẫn phải bắt đầu bằng http:// hoặc https://</div>}
        <label>Ghi chú dặn</label>
        <textarea value={form.ghi_chu} onChange={(e) => dat("ghi_chu", e.target.value)} rows={3} placeholder="Không bắt buộc — vd: mang theo hồ sơ thiết kế bản in" maxLength={2000} />
        <div className="ph-nut-cuoi">
          <button type="button" className="nut-ph chinh" disabled={!!thieu || dang} onClick={() => void gui()}>
            {dangSua ? "Lưu thay đổi" : "Đăng ký phòng họp"}
          </button>
          {dangSua && (
            <>
              <button type="button" className={`nut-ph nguy ${chacHuy ? "chac" : ""}`} disabled={dang} onClick={() => void huy()}>
                {chacHuy ? "Bấm lần nữa để huỷ" : "Huỷ cuộc họp"}
              </button>
              <button type="button" className="nut-ph" onClick={() => (setDangSua(null), setChacHuy(false), setForm(formTrong(form.ngay, form.phong)))}>
                Đăng ký cuộc mới
              </button>
            </>
          )}
          <span className="mo nho">{thieu}</span>
        </div>
        {loi && <div className="ph-loi">{loi}</div>}
      </div>
    </div>
  );
}

// ---------------- màn giao ban ----------------
interface GiaoBan {
  thu: number;
  tu: string;
  den: string;
  phong: string;
  thanh_phan: MucMoi[];
  noi_dung: string;
  sua_boi_ten: string | null;
  sua_luc: string | null;
}
function GiaoBanMan({ dl, bay, xong }: { dl: DuLieu; bay: DuLieu["bay"]; xong: (bao: string) => void }) {
  const dm = dl.danh_muc;
  const [g, setG] = useState<GiaoBan | null>(null);
  const [duocSua, setDuocSua] = useState(false);
  const [dsBuoi, setDsBuoi] = useState<CuocHop[]>([]);
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  const tai = useCallback(async () => {
    const r = await goiApi<{ giao_ban: GiaoBan; duoc_sua: boolean }>("/api/phong-hop/giao-ban");
    setG(r.giao_ban);
    setDuocSua(r.duoc_sua);
  }, []);
  useEffect(() => {
    void tai().catch((e) => setLoi(e instanceof Error ? e.message : String(e)));
  }, [tai]);
  // Buổi kế tiếp tính theo ô đang sửa (chưa lưu) — dùng ĐÚNG hàm của máy chủ (kiểm lần 7 X6: hai bản tính lệch nhau)
  const buoi = g ? ngayGiaoBanKeTiep(g.thu, g.tu, bay) : "";
  useEffect(() => {
    if (!buoi) return;
    void goiApi<{ cuoc: CuocHop[] }>(`/api/phong-hop?ngay=${buoi}&danh_muc=0`).then((r) => setDsBuoi(r.cuoc)).catch(() => setDsBuoi([]));
  }, [buoi]);
  if (!g) return <div className="ph-phai-than">{loi ? <div className="ph-loi">{loi}</div> : "Đang đọc…"}</div>;
  const giaoBanCu = dsBuoi.find((c) => c.loai === "giao_ban");
  const trung = cuocTrung(dsBuoi.filter((c) => c.id !== giaoBanCu?.id), { phong: g.phong, ngay: buoi, tu: g.tu, den: g.den, noi_dung: "" });
  const so = [...new Set([...bung(g.thanh_phan, dm), dl.toi.id])].length;
  const chay = async (gui: boolean) => {
    setDang(true);
    setLoi("");
    try {
      const body = { thu: g.thu, tu: g.tu, den: g.den, phong: g.phong, thanh_phan: g.thanh_phan, noi_dung: g.noi_dung };
      if (gui) {
        const r = await goiApi<{ so_nguoi: number; cap_nhat: boolean }>("/api/phong-hop/giao-ban", { body });
        xong(`${r.cap_nhat ? "Đã cập nhật" : "Đã gửi"} thông báo giao ban ${tenThu(g.thu)} ${ngayVN(buoi)} · ${khoangGio(g.tu, g.den)} · ${phongTheoId(g.phong)?.ten} — ${r.so_nguoi} người nhận`);
      } else {
        await goiApi("/api/phong-hop/giao-ban", { method: "PUT", body });
        xong("Đã lưu lịch giao ban (chưa gửi thông báo)");
      }
      await tai();
      const r2 = await goiApi<{ cuoc: CuocHop[] }>(`/api/phong-hop?ngay=${buoi}&danh_muc=0`);
      setDsBuoi(r2.cuoc);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(false);
    }
  };
  const tat = !duocSua;
  return (
    <div className="ph-phai-than">
      <div className="ph-dau">
        <b>Thông báo họp giao ban hằng tuần</b>
        {g.sua_luc && (
          <span className="mo nho">
            Sửa lần cuối {g.sua_luc} · {g.sua_boi_ten}
          </span>
        )}
      </div>
      {tat && <div className="mo nho">Chỉ Ban lãnh đạo, trưởng các phòng và quản trị sửa, gửi được thông báo giao ban. Bạn chỉ xem.</div>}
      <div className="ph-form" data-gt="ph-giao-ban">
        <label>Họp vào</label>
        <select value={g.thu} disabled={tat} onChange={(e) => setG({ ...g, thu: Number(e.target.value) })}>
          {[1, 2, 3, 4, 5, 6, 7].map((t) => (
            <option key={t} value={t}>
              {THU[t % 7]}
            </option>
          ))}
        </select>
        <label>Thời gian</label>
        <div className="ph-hang-o">
          <select value={g.tu} disabled={tat} onChange={(e) => setG({ ...g, tu: e.target.value, den: mocKetThucCho(e.target.value).includes(g.den) ? g.den : gio(phut(e.target.value) + BUOC_PHUT) })}>
            {MOC_BAT_DAU.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <span>–</span>
          <select value={g.den} disabled={tat} onChange={(e) => setG({ ...g, den: e.target.value })}>
            {mocKetThucCho(g.tu).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
          <b>{khoangGio(g.tu, g.den).split(" · ")[0]}</b>
        </div>
        <label>Phòng</label>
        <div className="ph-nut-nhom">
          {PHONG_HOP.map((x) => (
            <button type="button" key={x.id} disabled={tat} className={`nut-ph ${g.phong === x.id ? "dang" : ""}`} onClick={() => setG({ ...g, phong: x.id })}>
              {x.ten}
            </button>
          ))}
        </div>
        <label>Thành phần</label>
        {tat ? <div>{g.thanh_phan.map((m) => tenMuc(m, dm)).join(", ")}</div> : <ChonMoi dm={dm} muc={g.thanh_phan} setMuc={(m) => setG({ ...g, thanh_phan: m })} gt="ph-giao-ban-moi" />}
        <label>Nội dung</label>
        <input value={g.noi_dung} disabled={tat} onChange={(e) => setG({ ...g, noi_dung: e.target.value })} maxLength={300} />
        <div className="ph-buoi">
          Buổi kế tiếp: <b>{tenThu(g.thu)} {ngayVN(buoi)}</b> · {khoangGio(g.tu, g.den)} · {phongTheoId(g.phong)?.ten} · {so} người nhận
          {giaoBanCu && <div className="mo nho">Buổi này đã gửi thông báo ({khoangGio(giaoBanCu.tu, giaoBanCu.den)}, {phongTheoId(giaoBanCu.phong)?.ten}). Gửi lại = cập nhật, mọi người nhận lại dòng báo.</div>}
          {trung && <div className="ph-loi">{cauTrung(trung)}</div>}
        </div>
        {!tat && (
          <div className="ph-nut-cuoi">
            <button type="button" className="nut-ph chinh" disabled={dang || !!trung || !g.thanh_phan.length} onClick={() => void chay(true)} title="Lưu, đặt phòng cho buổi kế tiếp, báo mọi người trong thành phần">
              Gửi thông báo
            </button>
            <button type="button" className="nut-ph" disabled={dang} onClick={() => void chay(false)}>
              Chỉ lưu
            </button>
          </div>
        )}
        {loi && <div className="ph-loi">{loi}</div>}
      </div>
    </div>
  );
}

// ---------------- lịch họp các phòng — dải giữa, cao cố định vừa màn, không thanh trượt (Mr. Đại 25/10/2026) ----------------
/** Chủ trì = người ngồi ghế chủ toạ; ghế trống (lãnh đạo đồng cấp không phân được) → người tạo cuộc họp */
function chuTri(c: CuocHop, dm: Map<string, NguoiDanhMuc>): string {
  return xepGhe(c, dm).find((n) => n.chu_toa)?.nguoi.ten ?? c.nguoi_dat_ten;
}
function Lich({
  dl,
  dsNgay,
  bay,
  ngay,
  setNgay,
  moCuoc,
  dm,
}: {
  dl: DuLieu;
  dsNgay: CuocHop[];
  bay: DuLieu["bay"];
  ngay: string;
  setNgay: (n: string) => void;
  moCuoc: (c: CuocHop) => void;
  dm: Map<string, NguoiDanhMuc>;
}) {
  const [cuaToi, setCuaToi] = useState(false);
  const [rePhai, setRePhai] = useState<{ c: CuocHop; x: number; y: number } | null>(null);
  const ds = dsNgay.filter((c) => c.ngay === ngay && (!cuaToi || c.nguoi_dat === dl.toi.id || c.moi.some((m) => m.id === dl.toi.id)));
  // hàng của một mốc giờ: ô bắt đầu → chỉ số ô; giờ kết thúc → ô có kết thúc đúng mốc đó (+1). Hàng 1 là tên phòng
  const hangTu = (o: string) => {
    const i = CAC_O.findIndex((x) => phut(x) + BUOC_PHUT > phut(o));
    return (i < 0 ? CAC_O.length : i) + 2;
  };
  const hangDen = (o: string) => {
    const i = CAC_O.findIndex((x) => phut(x) >= phut(o));
    return (i < 0 ? CAC_O.length : i) + 2;
  };
  const oBay = CAC_O.findIndex((x) => phut(x) <= bay.phut && bay.phut < phut(x) + BUOC_PHUT);
  return (
    <div className="ph-lich-khung" data-gt="ph-lich">
      <div className="lich-dau">
        <b>Lịch họp các phòng</b>
        <span className="ph-ngay">
          <button type="button" className="nut-ph nho" title="Ngày trước" onClick={() => setNgay(congNgay(ngay, -1))}>
            ‹
          </button>
          <span className="lich-ngay" title={`${tenThu(thuCua(ngay))} ${ngayVN(ngay)}`}>
            {tenThu(thuCua(ngay)).replace("Thứ ", "T").replace("Chủ nhật", "CN")} {ngayVN(ngay).slice(0, 5)}
          </span>
          <button type="button" className="nut-ph nho" title="Ngày sau" onClick={() => setNgay(congNgay(ngay, 1))}>
            ›
          </button>
          {ngay !== bay.ngay && (
            <button type="button" className="nut-ph nho" onClick={() => setNgay(bay.ngay)} title="Về hôm nay">
              Hôm nay
            </button>
          )}
        </span>
        <button type="button" className={`nut-ph nho ${cuaToi ? "dang" : ""}`} onClick={() => setCuaToi((x) => !x)} data-gt="ph-cua-toi">
          Chỉ cuộc họp của tôi
        </button>
      </div>
      <div className="ph-lich" style={{ gridTemplateRows: `22px repeat(${CAC_O.length}, minmax(0, 1fr))` }}>
        <span className="lich-goc" style={{ gridRow: 1, gridColumn: 1 }} />
        {PHONG_HOP.map((p, i) => (
          <span key={p.id} className="lich-ten" style={{ gridRow: 1, gridColumn: i + 2 }} title={p.ten}>
            {p.ten.replace("Phòng họp ", "P.")}
          </span>
        ))}
        {CAC_O.map((o, r) => (
          <span key={o} className={`lich-gio ${o.endsWith(":00") || DAU_BUOI.has(o) ? "chan" : ""} ${DAU_BUOI.has(o) ? "dau-buoi" : ""}`} style={{ gridRow: r + 2, gridColumn: 1 }}>
            {o}
          </span>
        ))}
        {CAC_O.map((o, r) =>
          PHONG_HOP.map((p, i) => (
            <span key={`${o}-${p.id}`} className={`lich-o ${o.endsWith(":00") ? "chan" : ""} ${DAU_BUOI.has(o) ? "dau-buoi" : ""}`} style={{ gridRow: r + 2, gridColumn: i + 2 }} />
          )),
        )}
        {ngay === bay.ngay && oBay >= 0 && (
          <span className="lich-bay" style={{ gridRow: oBay + 2, gridColumn: "1 / -1", top: `${((bay.phut - phut(CAC_O[oBay])) / BUOC_PHUT) * 100}%` }} title={`Bây giờ ${bay.gio}`} />
        )}
        {ds.map((c) => {
          const dangHop = c.ngay === bay.ngay && phut(c.tu) <= bay.phut && bay.phut < phut(c.den);
          const qua = c.ngay < bay.ngay || (c.ngay === bay.ngay && phut(c.den) <= bay.phut);
          const tu = hangTu(c.tu);
          const den = Math.max(hangDen(c.den), tu + 1);
          return (
            <button
              type="button"
              key={c.id}
              className={`lich-cuoc ${dangHop ? "m-dang" : qua ? "m-qua" : "m-dat"}`}
              style={{ gridRow: `${tu} / ${den}`, gridColumn: PHONG_HOP.findIndex((p) => p.id === c.phong) + 2 }}
              onClick={() => moCuoc(c)}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setRePhai({ c, x: r.right + 8, y: r.top });
              }}
              onMouseLeave={() => setRePhai(null)}
              aria-label={`${c.noi_dung} — ${khoangGio(c.tu, c.den)}`}
            >
              {c.noi_dung}
            </button>
          );
        })}
      </div>
      {!ds.length && <div className="lich-trong">{cuaToi ? "Ngày này bạn không có cuộc họp nào." : "Ngày này chưa có cuộc họp nào."}</div>}
      {rePhai && (
        <div className="ph-the lich-the" style={{ left: Math.min(rePhai.x, window.innerWidth - 340), top: Math.min(rePhai.y, window.innerHeight - 220) }}>
          <b>{rePhai.c.noi_dung}</b>
          <div>
            {khoangGio(rePhai.c.tu, rePhai.c.den)} · {phongTheoId(rePhai.c.phong)?.ten}
          </div>
          <div>
            Chủ trì: <b>{chuTri(rePhai.c, dm)}</b>
          </div>
          <div>
            Người dự ({rePhai.c.moi.length}): {rePhai.c.moi.map((m) => m.ten).join(", ") || "—"}
          </div>
          <div className="mo nho">Bấm để xem chi tiết bên phải</div>
        </div>
      )}
    </div>
  );
}

// ---------------- màn chính ----------------
export function PhongHopPhong() {
  const sp = useSearchParams();
  const [dl, setDl] = useState<DuLieu | null>(null);
  const [bay, setBay] = useState(() => bayGioVN());
  const [ngay, setNgay] = useState(() => sp.get("ngay") || bayGioVN().ngay);
  const [dsNgay, setDsNgay] = useState<CuocHop[]>([]);
  const [cheDo, setCheDo] = useState<CheDo>(() => (sp.get("xem") === "giao-ban" ? "giao-ban" : "dang-ky"));
  const [form, setForm] = useState<Form>(() => formTrong(sp.get("ngay") || bayGioVN().ngay));
  const [dangSua, setDangSua] = useState<CuocHop | null>(null);
  const [xemCuoc, setXemCuoc] = useState<CuocHop | null>(null);
  const [bao, setBao] = useState("");
  const [loi, setLoi] = useState("");
  // Hôm nay (mặt bằng bên trái) + danh mục mời: đọc lại mỗi 60 giây; kim đồng hồ, màu ô chạy theo giờ thật mỗi 20 giây
  const taiHomNay = useCallback(async () => {
    try {
      setDl(await goiApi<DuLieu>(`/api/phong-hop?ngay=${bayGioVN().ngay}`));
      setLoi("");
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    }
  }, []);
  const taiNgay = useCallback(async (n: string) => {
    const r = await goiApi<{ cuoc: CuocHop[] }>(`/api/phong-hop?ngay=${n}&danh_muc=0`).catch(() => ({ cuoc: [] as CuocHop[] }));
    setDsNgay(r.cuoc);
  }, []);
  useEffect(() => {
    void taiHomNay();
    const t1 = window.setInterval(() => document.visibilityState === "visible" && void taiHomNay(), 60_000);
    const t2 = window.setInterval(() => setBay(bayGioVN()), 20_000);
    return () => (window.clearInterval(t1), window.clearInterval(t2));
  }, [taiHomNay]);
  useEffect(() => {
    void taiNgay(ngay);
  }, [ngay, taiNgay, dl]);
  const dm = useMemo(() => new Map((dl?.danh_muc?.nguoi ?? []).map((n) => [n.id, n])), [dl?.danh_muc]);
  const xong = (chu: string) => {
    setBao(chu);
    window.setTimeout(() => setBao(""), 6000);
    void taiHomNay();
    void taiNgay(ngay);
  };
  const moDangKy = (phong: string) => {
    setCheDo("dang-ky");
    setDangSua(null);
    setXemCuoc(null);
    setForm((f) => ({ ...formTrong(ngay < bay.ngay ? bay.ngay : ngay, phong), moi: f.moi }));
  };
  // Bấm một cuộc họp ở lịch giữa: chưa họp + của mình (hoặc quản trị) → khung Sửa; đang họp / đã xong / của người khác → chi tiết bên phải
  const moCuoc = (c: CuocHop) => {
    setCheDo("dang-ky");
    setNgay(c.ngay);
    if ((c.nguoi_dat === dl?.toi.id || dl?.toi.la_quan_tri) && trangThaiCuoc(c, bay) === "sap") {
      setDangSua(c);
      setXemCuoc(null);
      setForm({ phong: c.phong, ngay: c.ngay, tu: c.tu, den: c.den, noi_dung: c.noi_dung, moi: c.moi.map((m) => ({ loai: "nguoi", id: m.id })), khach_ngoai: c.khach_ngoai ?? "", duong_dan: c.duong_dan ?? "", ghi_chu: c.ghi_chu ?? "" });
    } else {
      setDangSua(null);
      setXemCuoc(c);
    }
  };
  const NUT: { ma: CheDo; nhan: string; gt: string }[] = [
    { ma: "dang-ky", nhan: "Đăng ký phòng họp", gt: "ph-nut-dang-ky" },
    { ma: "giao-ban", nhan: "Thông báo họp giao ban", gt: "ph-nut-giao-ban" },
  ];
  return (
    <div className="ph-trang">
      <section className="ph-trai">
        <div className="ph-nut-trai">
          {NUT.map((n) => (
            <button type="button" key={n.ma} data-gt={n.gt} className={`nut-ph to ${cheDo === n.ma ? "dang" : ""}`} onClick={() => (setCheDo(n.ma), n.ma === "dang-ky" && (setDangSua(null), setXemCuoc(null)))}>
              {n.nhan}
            </button>
          ))}
        </div>
        <MatBang dl={dl} bay={bay} dm={dm} moDangKy={moDangKy} />
        {/* Chú thích màu dưới ảnh đã bỏ (Mr. Đại 25/10 — lấy chiều cao cho ảnh); nghĩa màu nằm ở 💡 Giải thích và hướng dẫn */}
      </section>
      <section className="ph-giua">{dl ? <Lich dl={dl} dsNgay={dsNgay} bay={bay} ngay={ngay} setNgay={setNgay} moCuoc={moCuoc} dm={dm} /> : null}</section>
      <section className="ph-phai">
        {loi && <div className="ph-loi">{loi}</div>}
        {!dl ? (
          <div className="ph-phai-than">Đang đọc…</div>
        ) : cheDo === "dang-ky" ? (
          <DangKy dl={dl} dsNgay={dsNgay} bay={bay} ngay={ngay} setNgay={setNgay} form={form} setForm={setForm} dangSua={dangSua} setDangSua={setDangSua} xemCuoc={xemCuoc} setXemCuoc={setXemCuoc} chuTri={(c) => chuTri(c, dm)} xong={xong} />
        ) : (
          <GiaoBanMan dl={dl} bay={bay} xong={xong} />
        )}
      </section>
      {bao && <div className="toast">{bao}</div>}
    </div>
  );
}
