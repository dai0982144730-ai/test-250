"use client";
// ============================================================
// BuocSuaLoi — KHUNG "SỬA LỖI" KHI NỘP BÁO CÁO (Mr. Đại chốt 28/09/2026, Đợt A).
// Không phải tải file về mới biết vì sao: mỗi lỗi chặn / cảnh báo MỘT DÒNG (Vấn đề · Đề xuất · Duyệt, chốt 29/09) — 🤖 vì sao + đề xuất "Cũ → Mới"
// (chữ mới sửa được trước khi bấm). Chốt 29/09 (lần 2): "Đồng ý" từng dòng CHỈ đánh dấu; nút cuối "Sửa n mục đã đồng ý
// vào file" mới ghi — MỘT lần, máy ghi vào đúng ô, lưu bản mới, kiểm lại ngay (giống bước 3).
// Lỗi CHẶN phải sửa (không bỏ qua được). CẢNH BÁO: sửa từng mục, "Bỏ qua" từng mục, hoặc "Bỏ qua tất cả cảnh báo".
// Nút Gửi chỉ mở khi hết chặn và mọi cảnh báo đã sửa / bỏ qua (KhungSoanGui).
// ============================================================
import { useEffect, useState } from "react";
import type { KetQuaSuaLoi, MucSuaLoi } from "@/lib/kiem-tra/sua-loi-ai";
import { goiApi } from "@/components/gui/chung";
import { DauBangVanDe, DongVanDe, NutDuyet, ODeXuat } from "@/components/gui/nop/DongVanDe";
import { HopBaoCaoGoc } from "@/components/phong/SoDoPhong";
import ONhapNgay from "@/components/common/ONhapNgay";

const CHO_HAN = "{HAN}";

type Nhap = { o: number; moi: string; han: string };

/** "2026-10-04" → "04/10/2026" */
const ngayVN = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

function chuCuoi(m: MucSuaLoi, n: Nhap): string {
  return n.moi.split(CHO_HAN).join(ngayVN(n.han));
}

export function BuocSuaLoi<T>({
  taiLieuId,
  phienBan,
  boQua,
  onBoQua,
  onDaSua,
  nhanNguon,
}: {
  taiLieuId: string;
  phienBan: number;
  /** Thông điệp các cảnh báo đã bỏ qua */
  boQua: Set<string>;
  onBoQua: (thongDiep: string[]) => void;
  /** Kết quả kiểm tra của bản mới sau khi sửa (cùng dạng POST /api/kiem-tra) */
  onDaSua: (r: T) => void;
  /** "tuần 40 · P.CĐ" — link "xem trong báo cáo …" mở bản gốc khoanh cam chỗ lỗi (Mr. Đại chốt 29/09) */
  nhanNguon?: string;
}) {
  const [xemGoc, setXemGoc] = useState<MucSuaLoi | null>(null);
  const [kq, setKq] = useState<KetQuaSuaLoi | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [nhap, setNhap] = useState<Record<number, Nhap>>({});
  const [dang, setDang] = useState<"tat_ca" | null>(null);
  const [dongY, setDongY] = useState<Set<number>>(new Set());
  const [hoiLai, setHoiLai] = useState(0);

  useEffect(() => {
    let huy = false;
    setKq(null);
    setLoi(null);
    setDongY(new Set());
    goiApi<KetQuaSuaLoi>(`/api/kiem-tra/sua-loi?tai_lieu_id=${encodeURIComponent(taiLieuId)}&phien_ban=${phienBan}`)
      .then((r) => {
        if (huy) return;
        setKq(r);
        const n: Record<number, Nhap> = {};
        for (const m of r.muc) if (m.cho_sua.length) n[m.i] = { o: m.de_xuat?.o ?? m.cho_sua.length - 1, moi: m.de_xuat?.moi ?? m.cho_sua[m.de_xuat?.o ?? m.cho_sua.length - 1].cu, han: "" };
        setNhap(n);
      })
      .catch((e) => !huy && setLoi(e instanceof Error ? e.message : String(e)));
    return () => {
      huy = true;
    };
  }, [taiLieuId, phienBan, hoiLai]);

  // "Có vẻ trùng việc trong sổ cái" quyết ở bước 4 (cột Vào sổ cái) — một vấn đề một nơi, không hiện lại ở đây
  const hien = (kq?.muc ?? []).filter((m) => m.luat !== "viec_trung" && (m.muc === "chan" || !boQua.has(m.thong_diep)));
  const soChan = hien.filter((m) => m.muc === "chan").length;
  const canhBao = hien.filter((m) => m.muc === "canh_bao");

  const sanSang = (m: MucSuaLoi) => {
    const n = nhap[m.i];
    if (!n || !m.cho_sua.length) return false;
    if (n.moi.includes(CHO_HAN) && !n.han) return false;
    const moi = chuCuoi(m, n).trim();
    return !!moi && moi !== m.cho_sua[n.o].cu.trim();
  };

  async function sua(ds: MucSuaLoi[], nhan: "tat_ca") {
    // Hai lỗi cùng một ô (vd thiếu hạn + thiếu phụ trách cùng dòng): đề xuất nào cũng là "chữ cũ + phần thêm" → nối các phần
    // thêm vào sau chữ cũ, không để đề xuất sau đè mất đề xuất trước. Đề xuất viết lại cả câu thì lấy cái sau cùng.
    const theoO = new Map<string, { vi_tri: MucSuaLoi["cho_sua"][number]["vi_tri"]; moi: string }>();
    for (const m of ds) {
      const n = nhap[m.i];
      const o = m.cho_sua[n.o];
      const khoa = JSON.stringify(o.vi_tri);
      const moi = chuCuoi(m, n);
      const cu = o.cu.trim();
      const daCo = theoO.get(khoa);
      if (daCo && daCo.moi.startsWith(cu) && moi.startsWith(cu)) daCo.moi += moi.slice(cu.length);
      else theoO.set(khoa, { vi_tri: o.vi_tri, moi });
    }
    setDang(nhan);
    setLoi(null);
    try {
      onDaSua(await goiApi<T>("/api/kiem-tra/sua-loi", { tai_lieu_id: taiLieuId, sua: Array.from(theoO.values()) }));
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDang(null);
    }
  }

  if (!kq && !loi) return <div className="ghi">🤖 Đang đọc từng lỗi để đề xuất cách sửa… (thường 30 giây, lâu nhất 2–3 phút)</div>;
  if (!hien.length && !loi) return null;
  const coTheSuaHet = hien.filter(sanSang);
  const chuaDongY = coTheSuaHet.filter((m) => !dongY.has(m.i));
  const choGhi = hien.filter((m) => dongY.has(m.i) && sanSang(m));
  const bat = (i: number, co: boolean) =>
    setDongY((c) => {
      const x = new Set(c);
      if (co) x.add(i);
      else x.delete(i);
      return x;
    });

  return (
    <>
      {kq && kq.trang_thai !== "xong" ? (
        <div className="ghi">
          {kq.ly_do}
          {kq.trang_thai === "loi_ai" ? (
            <button type="button" className="lk ml-2" onClick={() => setHoiLai((n) => n + 1)}>
              Hỏi lại
            </button>
          ) : null}
        </div>
      ) : null}
      {loi ? <div className="ghi text-red">{loi}</div> : null}
      <DauBangVanDe />
      {hien.map((m) => {
        const n = nhap[m.i];
        const o = n ? m.cho_sua[n.o] : undefined;
        const laAi = !!m.de_xuat && m.de_xuat.o === n?.o && n?.moi === m.de_xuat.moi;
        const deXuat =
          n && o ? (
            <>
              {m.cho_sua.length > 1 ? (
                <select
                  className="mb-1 w-full rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-text"
                  value={n.o}
                  disabled={dang !== null || dongY.has(m.i)}
                  onChange={(e) => {
                    const k = Number(e.target.value);
                    setNhap((c) => ({ ...c, [m.i]: { ...n, o: k, moi: m.de_xuat?.o === k ? m.de_xuat.moi : m.cho_sua[k].cu } }));
                  }}
                >
                  {m.cho_sua.map((x, k) => (
                    <option key={k} value={k}>
                      Sửa ô: {x.nhan}
                    </option>
                  ))}
                </select>
              ) : null}
              <ODeXuat
                cu={o.cu}
                giaTri={n.moi}
                laAi={laAi}
                khoa={dang !== null || dongY.has(m.i)}
                onDoi={(v) => setNhap((c) => ({ ...c, [m.i]: { ...n, moi: v } }))}
                ghiChu={
                  m.giai_thich || (!m.de_xuat && m.khong_sua_file)
                    ? `🤖 ${[m.giai_thich, !m.de_xuat ? m.khong_sua_file : ""].filter(Boolean).join(" ")}`
                    : undefined
                }
              />
              {n.moi.includes(CHO_HAN) ? (
                <label className="cu mt-1 flex items-center gap-2">
                  Ngày hạn:
                  <ONhapNgay value={n.han} onChange={(x) => setNhap((c) => ({ ...c, [m.i]: { ...n, han: x } }))} />
                </label>
              ) : null}
            </>
          ) : (
            <span className="text-text-muted">
              {m.khong_sua_file || "Không nằm gọn trong một ô — sửa trong tệp rồi bấm “Tải lên bản đã sửa”."}
            </span>
          );
        return (
          <DongVanDe
            key={m.i}
            daQuyet={dongY.has(m.i)}
            noiDung={
              <>
                {m.thong_diep}
                {m.dong_chu?.length ? (
                  <div className="chu-dong">
                    {m.dong_chu.map((x, k) => (
                      <span key={k}>
                        {k ? " · " : ""}
                        <span className="nhan-o">{x.nhan}:</span> {x.gt}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            }
            muc={m.muc}
            phu={
              <>
                {m.noi || "cả báo cáo"} ·{" "}
                <button type="button" className="lk" onClick={() => setXemGoc(m)} title="Mở báo cáo gốc — khung cam là chỗ bị lỗi">
                  xem trong báo cáo {nhanNguon || "này"}
                </button>
              </>
            }
            deXuat={deXuat}
            duyet={
              n && o ? (
                <NutDuyet
                  quyet={dongY.has(m.i) ? "dong_y" : null}
                  onDongY={() => bat(m.i, true)}
                  onDoi={dang !== null ? undefined : () => bat(m.i, false)}
                  onBoQua={m.muc === "canh_bao" ? () => onBoQua([m.thong_diep]) : undefined}
                  choDongY={sanSang(m)}
                  lyDoKhoa={n.moi.includes(CHO_HAN) && !n.han ? "Chọn ngày hạn trước" : "Chữ mới đang giống chữ cũ"}
                  dangGhi={dang !== null}
                />
              ) : m.muc === "canh_bao" ? (
                <button type="button" className="nn" disabled={dang !== null} onClick={() => onBoQua([m.thong_diep])}>
                  Bỏ qua
                </button>
              ) : undefined
            }
          />
        );
      })}
      <div className="chan-nut">
        {chuaDongY.length > 1 ? (
          <button type="button" className="nn to" disabled={dang !== null} onClick={() => chuaDongY.forEach((m) => bat(m.i, true))} title="Đánh dấu đồng ý mọi đề xuất đang hiện — chưa ghi file">
            Đồng ý cả {chuaDongY.length} đề xuất
          </button>
        ) : null}
        {canhBao.length > 0 ? (
          <button type="button" className="nn to" disabled={dang !== null} onClick={() => onBoQua(canhBao.map((m) => m.thong_diep))}>
            Bỏ qua tất cả cảnh báo ({canhBao.length})
          </button>
        ) : null}
        {coTheSuaHet.length || choGhi.length ? (
        <button
          type="button"
          className="nn chinh to"
          disabled={dang !== null || !choGhi.length}
          title={!choGhi.length ? "Bấm Đồng ý ở các dòng muốn sửa trước" : "Máy ghi các đề xuất đã đồng ý vào đúng ô, lưu thành bản mới rồi kiểm lại"}
          onClick={() => void sua(choGhi, "tat_ca")}
        >
          {dang === "tat_ca" ? "Đang ghi…" : `Sửa ${choGhi.length} mục đã đồng ý vào file`}
        </button>
        ) : null}
      </div>
      {xemGoc ? (
        <HopBaoCaoGoc
          v={{ ten: xemGoc.thong_diep, nguon: { tai_lieu_id: taiLieuId, nhan: `Báo cáo ${nhanNguon || ""}`.trim() } }}
          tim={xemGoc.tim ?? ""}
          chuThich="khung cam là chỗ bị lỗi"
          dong={() => setXemGoc(null)}
        />
      ) : null}
    </>
  );
}
