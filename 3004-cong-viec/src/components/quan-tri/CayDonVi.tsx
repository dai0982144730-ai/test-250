"use client";
// Thẻ Đơn vị: cây có cấp (Ban TGĐ › 4 phòng › 4 đơn vị), thêm đơn vị con, sửa, ngừng / mở lại. Không phải sửa code.
import { useMemo, useState } from "react";
import { Ban, Pencil, Plus, RotateCcw } from "lucide-react";
import type { DonVi } from "@/lib/types";
import { donViVaCapDuoi } from "@sci/identity";
import { HopLoi, HopThoai, LOP_O_NHAP, Nut, The, Truong, goiApi } from "@/components/layout/giao-dien";
import { useTai, xepTheoCay, type Bao, type DonViQT, type KetQuaDonVi } from "./du-lieu";
import type { ToiQuanTri } from "./TrangQuanTri";

export type Sua = { che_do: "them"; cha: DonViQT | null } | { che_do: "sua"; dv: DonViQT };

export function CayDonVi({ bao }: { toi: ToiQuanTri; bao: Bao }) {
  const { duLieu, loi, taiLai } = useTai<KetQuaDonVi>("/api/quan-tri/don-vi");
  const [caNgung, setCaNgung] = useState(false);
  const [sua, setSua] = useState<Sua | null>(null);
  const cay = useMemo(() => xepTheoCay((duLieu?.don_vi ?? []).filter((d) => caNgung || d.active)), [duLieu, caNgung]);

  if (loi) return <HopLoi loi={loi} />;
  if (!duLieu) return <div className="text-[12px] text-text-muted">Đang tải…</div>;

  async function doiHoatDong(d: DonViQT, bat: boolean) {
    if (!bat && !window.confirm(`Ngừng hoạt động "${d.ten}"? Đơn vị không bị xóa: lịch sử và thư mục cũ vẫn giữ nguyên.`)) return;
    try {
      await goiApi(`/api/quan-tri/don-vi/${encodeURIComponent(d.id)}`, { method: "PATCH", body: { active: bat } });
      bao(bat ? `Đã mở lại ${d.ten}` : `Đã ngừng ${d.ten}`);
      await taiLai();
    } catch (e) {
      bao(e instanceof Error ? e.message : "Không đổi được", false);
    }
  }

  return (
    <The
      tieuDe={
        <span>
          Đơn vị
          <span className="ml-2 text-[11px] font-normal text-text-muted">
            Cây có cấp · cấp là dữ liệu dùng cho quy tắc đè (cấp nhỏ hơn là cấp cao hơn)
          </span>
        </span>
      }
      phai={
        <>
          <label className="flex items-center gap-1.5 text-[12px] text-text-secondary">
            <input type="checkbox" checked={caNgung} onChange={(e) => setCaNgung(e.target.checked)} className="accent-[var(--accent)]" /> Hiện đơn vị đã ngừng
          </label>
          {duLieu.them_goc_duoc && (
            <Nut nho kieu="chinh" onClick={() => setSua({ che_do: "them", cha: null })}>
              <Plus className="h-3.5 w-3.5" /> Đơn vị gốc
            </Nut>
          )}
        </>
      }
    >
      <div className="scroll-thin overflow-x-auto">
        <table className="tbl">
          <thead>
            <tr>
              <th>Đơn vị</th>
              <th className="num">Cấp</th>
              <th>Loại</th>
              <th>Mẫu báo cáo</th>
              <th className="num">Người</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cay.map((d) => (
              <tr key={d.id} className={d.active ? "" : "opacity-50"}>
                <td>
                  <div style={{ paddingLeft: d.sau * 20 }} className="flex items-center gap-1.5">
                    {d.sau > 0 && <span className="text-text-muted">└</span>}
                    <div>
                      <div className="font-semibold text-text">
                        {d.ten}
                        {!d.active && <span className="ml-1.5 text-[10px] font-bold text-red">NGỪNG</span>}
                      </div>
                      <div className="text-[10.5px] text-text-muted">
                        {d.ten_ngan} · <span className="font-mono">{d.id}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="num font-bold text-text">{d.cap}</td>
                <td>{duLieu.loai[d.loai] ?? d.loai}</td>
                <td className="font-mono text-[11px]">{d.mau_ma ?? ""}</td>
                <td className="num">{d.so_nguoi}</td>
                <td className="whitespace-nowrap text-right">
                  {d.sua_duoc && (
                    <div className="flex justify-end gap-1">
                      {d.active && (
                        <Nut nho kieu="nhat" title="Thêm đơn vị con" onClick={() => setSua({ che_do: "them", cha: d })}>
                          <Plus className="h-3 w-3" /> Con
                        </Nut>
                      )}
                      <Nut nho kieu="nhat" title="Sửa" onClick={() => setSua({ che_do: "sua", dv: d })}>
                        <Pencil className="h-3 w-3" />
                      </Nut>
                      {d.active ? (
                        <Nut nho kieu="nhat" title="Ngừng hoạt động" onClick={() => void doiHoatDong(d, false)}>
                          <Ban className="h-3 w-3" />
                        </Nut>
                      ) : (
                        <Nut nho kieu="nhat" title="Mở lại" onClick={() => void doiHoatDong(d, true)}>
                          <RotateCcw className="h-3 w-3" />
                        </Nut>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {duLieu.chua_gan > 0 && (
        <p className="mt-3 text-[11.5px] text-yellow">
          Có {duLieu.chua_gan} người dùng chưa được gán đơn vị — xem ở thẻ Người dùng, lọc «Chưa gán đơn vị».
        </p>
      )}
      {sua && (
        <SuaDonVi
          sua={sua}
          tatCa={duLieu.don_vi}
          loai={duLieu.loai}
          mau={duLieu.mau}
          dong={() => setSua(null)}
          xong={async (chu) => {
            bao(chu);
            setSua(null);
            await taiLai();
          }}
        />
      )}
    </The>
  );
}

export function SuaDonVi({
  sua,
  tatCa,
  loai,
  mau,
  dong,
  xong,
}: {
  sua: Sua;
  tatCa: DonViQT[];
  loai: Record<DonVi["loai"], string>;
  mau: { ma: string; ten: string }[];
  dong: () => void;
  xong: (chu: string) => void;
}) {
  const dv = sua.che_do === "sua" ? sua.dv : null;
  const chaMacDinh = sua.che_do === "them" ? sua.cha : null;
  // Đơn vị chức danh: sửa CHỨC DANH, tên đơn vị máy tự ghép với người giữ (lib/to-chuc.ts)
  const [ten, setTen] = useState(dv?.loai === "chuc_danh" ? (dv.chuc_danh ?? dv.ten.split(" · ")[0]) : (dv?.ten ?? ""));
  const [tenNgan, setTenNgan] = useState(dv?.loai === "chuc_danh" ? (dv.chuc_danh_ngan ?? dv.ten_ngan.split(" · ")[0]) : (dv?.ten_ngan ?? ""));
  const [ma, setMa] = useState("");
  const [cap, setCap] = useState(String(dv?.cap ?? (chaMacDinh ? Math.min(chaMacDinh.cap + 1, 9) : 3)));
  const [chaId, setChaId] = useState(dv?.cha_id ?? chaMacDinh?.id ?? "");
  const [loaiDv, setLoaiDv] = useState<DonVi["loai"]>(dv?.loai ?? "don_vi");
  const [mauMa, setMauMa] = useState(dv?.mau_ma ?? "");
  const [thuTu, setThuTu] = useState(dv ? String(dv.thu_tu) : "");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  // Đơn vị cha chọn được: bỏ chính nó và cả cây con của nó (chọn vào đó sẽ thành vòng tròn)
  const cay = useMemo(() => {
    const boQua = dv ? donViVaCapDuoi(tatCa, dv.id) : new Set<string>();
    return xepTheoCay(tatCa.filter((d) => d.active && !boQua.has(d.id)));
  }, [tatCa, dv]);

  async function luu() {
    setDang(true);
    setLoi(null);
    const du = {
      ten,
      ten_ngan: tenNgan || ten,
      cap: Number(cap),
      cha_id: chaId || null,
      loai: loaiDv,
      mau_ma: mauMa || null,
      ...(thuTu !== "" ? { thu_tu: Number(thuTu) } : {}),
      ...(loaiDv === "chuc_danh" ? { chuc_danh: ten, chuc_danh_ngan: tenNgan || ten } : {}),
    };
    try {
      if (dv) {
        await goiApi(`/api/quan-tri/don-vi/${encodeURIComponent(dv.id)}`, { method: "PATCH", body: du });
        xong(`Đã lưu ${ten}`);
      } else {
        const r = await goiApi<{ don_vi: DonVi }>("/api/quan-tri/don-vi", { body: { ...du, id: ma || undefined } });
        xong(`Đã thêm đơn vị ${r.don_vi.ten} (mã ${r.don_vi.id})`);
      }
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setDang(false);
    }
  }

  return (
    <HopThoai
      tieuDe={dv ? `Sửa đơn vị: ${dv.ten}` : chaMacDinh ? `Thêm đơn vị con của ${chaMacDinh.ten}` : "Thêm đơn vị gốc"}
      dong={dong}
      rong="max-w-[560px]"
      chan={
        <>
          <Nut onClick={dong}>Hủy</Nut>
          <Nut kieu="chinh" disabled={dang || !ten.trim() || cap === ""} onClick={() => void luu()}>
            {dang ? "Đang lưu…" : "Lưu"}
          </Nut>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Truong nhan={loaiDv === "chuc_danh" ? "Chức danh" : "Tên đơn vị"} goiY={loaiDv === "chuc_danh" ? "Chỉ ghi chức danh. Tên người giữ máy tự ghép từ người dùng thuộc đơn vị này." : undefined}>
          <input className={LOP_O_NHAP} autoFocus value={ten} onChange={(e) => setTen(e.target.value)} placeholder={loaiDv === "chuc_danh" ? "Phó Tổng Giám đốc" : "Văn phòng HĐQT"} />
        </Truong>
        <Truong nhan={loaiDv === "chuc_danh" ? "Viết tắt" : "Tên ngắn"}>
          <input className={LOP_O_NHAP} value={tenNgan} onChange={(e) => setTenNgan(e.target.value)} placeholder={loaiDv === "chuc_danh" ? "PTGĐ" : "VP HĐQT"} />
        </Truong>
        {!dv && (
          <Truong nhan="Mã (không bắt buộc)" goiY="Để trống thì tự tạo từ tên ngắn. Không đổi được sau khi tạo.">
            <input className={LOP_O_NHAP} value={ma} onChange={(e) => setMa(e.target.value)} placeholder="vp-hdqt" />
          </Truong>
        )}
        <Truong nhan="Cấp" goiY="0 = trên Ban TGĐ, 1 = Ban TGĐ, 2 = phòng, 3 = đơn vị, 9 = bên ngoài.">
          <input className={LOP_O_NHAP} type="number" min={0} max={99} value={cap} onChange={(e) => setCap(e.target.value)} />
        </Truong>
        <Truong nhan="Đơn vị cha">
          <select className={LOP_O_NHAP} value={chaId} onChange={(e) => setChaId(e.target.value)}>
            <option value="">— Không (đơn vị gốc) —</option>
            {cay.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.sua_duoc}>
                {"  ".repeat(d.sau)}
                {d.ten}
              </option>
            ))}
          </select>
        </Truong>
        <Truong nhan="Loại">
          <select className={LOP_O_NHAP} value={loaiDv} onChange={(e) => setLoaiDv(e.target.value as DonVi["loai"])}>
            {Object.entries(loai).map(([k, t]) => (
              <option key={k} value={k}>
                {t}
              </option>
            ))}
          </select>
        </Truong>
        <Truong nhan="Mẫu báo cáo của đơn vị">
          <select className={LOP_O_NHAP} value={mauMa} onChange={(e) => setMauMa(e.target.value)}>
            <option value="">— Không có mẫu riêng —</option>
            {mau.map((m) => (
              <option key={m.ma} value={m.ma}>
                {m.ma} · {m.ten}
              </option>
            ))}
            {mauMa && !mau.some((m) => m.ma === mauMa) && <option value={mauMa}>{mauMa}</option>}
          </select>
        </Truong>
        <Truong nhan="Thứ tự hiển thị">
          <input className={LOP_O_NHAP} type="number" value={thuTu} onChange={(e) => setThuTu(e.target.value)} placeholder="tự xếp cuối" />
        </Truong>
      </div>
      <div className="mt-3">
        <HopLoi loi={loi} />
      </div>
    </HopThoai>
  );
}
