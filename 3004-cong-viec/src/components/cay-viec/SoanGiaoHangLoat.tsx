"use client";
// ============================================================
// 🤖 SOẠN GIAO VIỆC HÀNG LOẠT — chép từ agent Base (Mr. Đại chốt 10/09/2026).
// Soạn MỘT LƯỢT cho TẤT CẢ nút "găng mà sổ việc chưa có việc nào" — đúng tập hợp hai bộ lọc 🔴 Việc găng + ⭕ Việc găng
// chưa giao lọc ra (tên nút đổi 05/10). Base bày bảng kết quả ngay dưới nút; agent Công việc (chốt 03/10) bày ở CỘT PHẢI: nút ở cột trái
// chỉ mở khung, khung phải tự soạn lần lượt rồi mỗi dòng một nút Giao.
// ⛔ AI KHÔNG tự ghi: nó chỉ soạn; NGƯỜI bấm Giao từng dòng mới tạo việc trong sổ cái (người giao = người bấm).
// Gọi lần lượt chứ không bắn song song: mỗi lượt là một lời gọi LLM.
// Nút chỉ hiện với người có quyền "Giao việc" (luật riêng 3004: không quyền thì ẩn — chỗ gọi quyết).
// ============================================================
import { useEffect, useRef, useState } from "react";
import { goiApi } from "@/components/layout/giao-dien";
import { nutGangTrong, type NutCay } from "@/lib/cay-viec/thuan";
import type { DeXuatGiao } from "@/lib/cay-viec/soan-giao";
import type { Chon } from "./chon";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface Dong {
  wbs: string;
  ten: string;
  han: string | null;
  deXuat: DeXuatGiao | null;
  /** Lý do không soạn được — nói thẳng, không bỏ trống */
  loi: string | null;
  daGiao: string | null;
}

/** Nút ở cột trái — đứng SÁT nút "Gán mã ngay" (Mr. Đại chốt 10/09); bấm là mở khung soạn ở cột phải */
export function NutSoanGiao({ cay, mo, trai }: { cay: NutCay[]; mo: (c: Chon) => void; trai?: boolean }) {
  const so = nutGangTrong(cay).length;
  return (
    <button
      type="button"
      data-lenh="cay-viec.soan-giao-hang-loat"
      data-gt="cv:soan-giao-hang-loat"
      onClick={() => mo({ loai: "hang-loat", lan: Date.now() })}
      disabled={so === 0}
      title={`Soạn một lượt cho ${so} nút găng đang trống người — kết quả ở khung bên phải`}
      className={`${trai ? "ml-auto " : ""}rounded-sm border border-accent px-3 py-1.5 text-[11.5px] font-semibold text-accent transition hover:bg-accent hover:text-white disabled:opacity-50`}
    >
      🤖 Soạn việc trên đường găng chưa ai làm ({so})
    </button>
  );
}

/** Khung phải: soạn lần lượt mọi nút găng trống, mỗi dòng một nút Giao */
export function KhungHangLoat({ cay, duAnId, lan, mo, onDoi }: { cay: NutCay[]; duAnId: string; lan: number; mo: (c: Chon) => void; onDoi: () => void }) {
  const [dong, setDong] = useState<Dong[]>([]);
  const [tienDo, setTienDo] = useState("");
  const dsNut = useRef(nutGangTrong(cay));

  useEffect(() => {
    let huy = false;
    dsNut.current = nutGangTrong(cay);
    const ds = dsNut.current;
    void (async () => {
      setDong([]);
      const ra: Dong[] = [];
      for (let i = 0; i < ds.length && !huy; i++) {
        const n = ds[i]!;
        setTienDo(`đang soạn ${i + 1}/${ds.length} — ${n.wbs} ${n.ten.split(/\s+/).slice(0, 6).join(" ")}`);
        try {
          const j = await goiApi<{ ok: boolean; de_xuat?: DeXuatGiao; thong_diep?: string; trung?: string }>("/api/cay-viec/soan-giao", {
            body: { du_an: duAnId, soan: { ma_wbs: n.wbs, ten: n.ten, han: n.end } },
          });
          // Luật 33: trùng việc agent khác đã soạn → nói rõ; muốn vẫn giao thì bấm tên đầu việc, khung riêng có nút "Vẫn soạn việc riêng"
          const loi = j.trung ? `🤖 ${j.trung} — bấm tên đầu việc nếu vẫn muốn soạn việc riêng.` : j.ok ? null : (j.thong_diep ?? "Chưa soạn được.");
          ra.push({ wbs: n.wbs, ten: n.ten, han: n.end, deXuat: j.ok && j.de_xuat ? j.de_xuat : null, loi, daGiao: null });
        } catch (e) {
          ra.push({ wbs: n.wbs, ten: n.ten, han: n.end, deXuat: null, loi: e instanceof Error ? e.message : "Không gọi được máy chủ app.", daGiao: null });
        }
        if (!huy) setDong([...ra]);
      }
      if (!huy) setTienDo("");
    })();
    return () => {
      huy = true;
    };
    // Chỉ soạn lại khi người bấm lại nút (lan đổi) — dữ liệu cây làm tươi sau khi Giao không được kích soạn lại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lan, duAnId]);

  const giaoMot = async (d: Dong) => {
    if (!d.deXuat) return;
    try {
      const j = await goiApi<{ ok: boolean; ma_viec?: string; trung?: string; thong_diep?: string }>("/api/cay-viec/soan-giao", {
        body: { du_an: duAnId, giao: { ma_wbs: d.wbs, ten: d.ten, han: d.han, giao_cho: d.deXuat.giao_cho, can_cu: d.deXuat.can_cu } },
      });
      if (!j.ma_viec) {
        const loi = j.trung ? `🤖 ${j.trung} — bấm tên đầu việc nếu vẫn muốn giao việc riêng.` : (j.thong_diep ?? "Chưa giao được.");
        setDong((cu) => cu.map((x) => (x.wbs === d.wbs ? { ...x, loi } : x)));
        return;
      }
      const ma = j.ma_viec;
      setDong((cu) => cu.map((x) => (x.wbs === d.wbs ? { ...x, daGiao: ma, loi: null } : x)));
      onDoi();
    } catch (e) {
      setDong((cu) => cu.map((x) => (x.wbs === d.wbs ? { ...x, loi: e instanceof Error ? e.message : "Chưa giao được." } : x)));
    }
  };

  const soSoanDuoc = dong.filter((d) => d.deXuat !== null).length;
  const tong = dsNut.current.length;

  return (
    <div className="p-4 text-[12px]" data-gt="cv:phai-hang-loat">
      <KhaiHuongDan ma="cay-viec-hang-loat" uuTien={2} />
      <div className="text-[14px] font-bold text-text">🤖 Soạn việc trên đường găng chưa ai làm — {tong} nút</div>
      <div className="mt-1 text-[11px] text-text-secondary">
        {tienDo ? `Đang soạn… ${tienDo}` : `Soạn được ${soSoanDuoc}/${dong.length} nút.`} Dòng nào AI không chọn được người thì nói rõ vì sao — bấm tên
        đầu việc để chọn tay.
      </div>
      {tong === 0 && <div className="mt-2 text-[11px] text-text-secondary">Không có nút găng nào đang trống người — không có gì để soạn.</div>}
      {dong.length > 0 && (
        <div className="mt-2.5 space-y-2">
          {dong.map((d) => (
            <div key={d.wbs} className="border-b border-border-light pb-2">
              <button type="button" onClick={() => mo({ loai: "nut", wbs: d.wbs })} data-gt="cv:hl-dau-viec" className="text-left font-bold text-red hover:underline">
                <span className="font-mono text-[10.5px] font-normal text-text-muted">{d.wbs}</span> {d.ten}
              </button>
              <div className="mt-0.5 text-[11.5px] text-text">
                🤖 Giao cho:{" "}
                {d.deXuat ? (
                  <b>
                    {d.deXuat.ten_day_du || d.deXuat.giao_cho}
                    <span className="font-normal text-text-muted"> ({d.deXuat.loai === "don_vi" ? "đơn vị" : d.deXuat.giao_cho})</span>
                  </b>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </div>
              <div className="text-[10.5px] text-text-secondary">{d.loi ?? d.deXuat?.can_cu}</div>
              <div className="mt-1">
                {d.daGiao ? (
                  <button type="button" onClick={() => mo({ loai: "viec", id: d.daGiao! })} data-gt="cv:da-tao-viec" className="text-[11px] font-semibold text-green hover:underline">
                    Đã giao {d.daGiao}
                  </button>
                ) : d.deXuat ? (
                  <button
                    type="button"
                    data-lenh="cay-viec.giao-mot-dong"
                    data-gt="cv:hl-giao"
                    data-gia-tri={d.wbs}
                    onClick={() => void giaoMot(d)}
                    className="rounded-sm border border-accent bg-accent px-2.5 py-0.5 text-[10.5px] font-semibold text-white transition hover:opacity-90"
                  >
                    Giao
                  </button>
                ) : (
                  <button type="button" onClick={() => mo({ loai: "nut", wbs: d.wbs })} data-gt="cv:hl-dau-viec" className="text-[10.5px] text-accent underline decoration-dotted">
                    chọn tay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 text-[10px] text-text-muted">Chốt an toàn: AI không tự ghi — chỉ cú bấm Giao của người mới tạo việc trong sổ cái.</div>
    </div>
  );
}
