"use client";

// ============================================================
// KHUÔN DANH SÁCH CỦA TRỢ LÝ — Cài đặt Main → 🧩 Riêng của agent (Mr. Đại chốt 28/10/2026)
// Mỗi nhóm: «Cắt gọn» (mặc định) hoặc «Đầy đủ». Bấm là lưu ngay, có hiệu lực ở lượt hỏi kế tiếp — không dựng lại, không đẩy hosting.
// Người dùng gõ «xem hết» thì lượt đó vẫn trả đủ dù nhóm đang cắt gọn. Cửa quyền «caidat» kiểm ở API.
// ============================================================

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { CaiDatKhuon, CaiDatNhom, MaNhom } from "@/lib/ai/khuon-danh-sach-thuan";

type Nhan = Record<MaNhom, string>;

export function KhuonDanhSach() {
  const [cd, setCd] = useState<CaiDatKhuon | null>(null);
  const [nhan, setNhan] = useState<Nhan | null>(null);
  const [bao, setBao] = useState<{ ok: boolean; chu: string } | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const j = (await (await fetch("/api/khuon-danh-sach", { cache: "no-store" })).json()) as { ok: boolean; caiDat?: CaiDatKhuon; nhan?: Nhan };
        if (j.ok && j.caiDat && j.nhan) {
          setCd(j.caiDat);
          setNhan(j.nhan);
        }
      } catch {
        setBao({ ok: false, chu: "Không gọi được máy chủ" });
      }
    })();
  }, []);

  const luu = async (nhom: MaNhom, thayDoi: Partial<CaiDatNhom>) => {
    setBao(null);
    try {
      const r = await fetch("/api/khuon-danh-sach", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nhom, thayDoi }) });
      const j = (await r.json()) as { ok: boolean; caiDat?: CaiDatKhuon; message?: string };
      if (j.ok && j.caiDat) {
        setCd(j.caiDat);
        setBao({ ok: true, chu: "✓ Đã lưu — có hiệu lực từ lượt hỏi kế tiếp" });
      } else {
        setBao({ ok: false, chu: j.message ?? "Lưu không được (cần tài khoản PM hoặc Admin)" });
      }
    } catch {
      setBao({ ok: false, chu: "Không gọi được máy chủ" });
    }
  };

  const o = "w-14 rounded-sm border border-border bg-bg2 px-2 py-1 text-right text-[12px] text-text outline-none focus:border-accent";
  const nut = (bat: boolean) =>
    `rounded-sm border px-3 py-1 text-[12px] font-bold transition ${bat ? "border-accent/60 bg-accent-soft text-accent" : "border-border text-text-secondary hover:border-accent/40"}`;

  return (
    <div className="rounded border border-border bg-surface p-4">
      <div className="text-[13px] font-bold text-text">Khuôn danh sách của trợ lý</div>
      <p className="mt-1 max-w-[820px] text-[11.5px] leading-relaxed text-text-secondary">
        Danh sách dài (issue, hồ sơ thiếu, BOQ…) làm trợ lý gõ lâu: 45–70 giây. <b>Cắt gọn</b> chỉ đưa phần quan trọng nhất cho trợ lý và ghi
        «Còn N mục — nhắn xem hết». <b>Đầy đủ</b> trả mọi dòng như cũ. Người dùng gõ «xem hết» thì lượt đó vẫn đủ. Bấm là lưu ngay.
      </p>
      {cd === null || nhan === null ? (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang nạp…
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12px] text-text">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase text-text-muted">
                <th className="py-1.5 pr-3">Nhóm danh sách</th>
                <th className="py-1.5 pr-3">Chế độ</th>
                <th className="py-1.5 pr-3 text-right">Số dòng</th>
                <th className="py-1.5 text-right">Ngày tới / dòng tối đa</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(nhan) as MaNhom[]).map((k) => {
                const g = cd[k];
                return (
                  <tr key={k} className="border-b border-border-light align-middle">
                    <td className="py-2 pr-3">{nhan[k]}</td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-1.5">
                        <button type="button" data-lenh={`khuon-danh-sach.${k}.gon`} onClick={() => void luu(k, { cheDo: "khuon" })} className={nut(g.cheDo === "khuon")}>
                          Cắt gọn
                        </button>
                        <button type="button" data-lenh={`khuon-danh-sach.${k}.day-du`} onClick={() => void luu(k, { cheDo: "day-du" })} className={nut(g.cheDo === "day-du")}>
                          Đầy đủ
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        defaultValue={g.soDong}
                        key={`${k}-d-${g.soDong}`}
                        className={o}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== g.soDong) void luu(k, { soDong: v });
                        }}
                      />
                    </td>
                    <td className="py-2 text-right">
                      {g.soNgay !== undefined && (
                        <span className="mr-2">
                          <input
                            type="number"
                            min={1}
                            max={365}
                            defaultValue={g.soNgay}
                            key={`${k}-n-${g.soNgay}`}
                            className={o}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== g.soNgay) void luu(k, { soNgay: v });
                            }}
                          />{" "}
                          <span className="text-text-muted">ngày</span>
                        </span>
                      )}
                      {g.soDongToiDa !== undefined && (
                        <span>
                          <input
                            type="number"
                            min={1}
                            max={200}
                            defaultValue={g.soDongToiDa}
                            key={`${k}-t-${g.soDongToiDa}`}
                            className={o}
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v !== g.soDongToiDa) void luu(k, { soDongToiDa: v });
                            }}
                          />{" "}
                          <span className="text-text-muted">dòng</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {bao && <div className={`mt-2 text-[12px] font-semibold ${bao.ok ? "text-green" : "text-red"}`}>{bao.chu}</div>}
    </div>
  );
}
