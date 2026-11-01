"use client";

// ============================================================
// MÀN "AI ĐƯỢC GỌI AI" — ma trận hàng = agent gọi, cột = agent được gọi
//
// ⛔ KHÔNG chỗ nào trong file này biết hệ có mấy agent. Bảng dựng từ
// `bang.agent` do máy chủ trả về, mà danh sách đó lấy từ Danh bạ agent.
// Khai 2 con → bảng 2×2, khai 6 con → 6×6, không sửa dòng nào.
//
// 26/09 (Mr. Đại chốt): BỎ số lượt gọi đọc từ sổ — số liệu quan sát thuộc Agent
// quan sát. Màn này chỉ còn là CẤU HÌNH (bật/tắt ô + cửa chặn ở cổng MCP).
//
// LUẬT MÀU: đỏ dành riêng cho Issue. Ô tắt ở đây là lựa chọn của người dùng,
// không phải sự cố → dùng nền chìm + chữ xám, không tô đỏ.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Loader2, Network } from "lucide-react";
import type { BangMaTran, KetQuaChan, OMaTran } from "@/lib/ma-tran-goi/model";
import { LY_DO_CHAN } from "@/lib/quyen";

interface TraLoi {
  ok: boolean;
  bang?: BangMaTran;
  macDinhChoGoi?: boolean;
  /** Sửa ma trận = cửa "caidat" (quyen.ts) */
  duocSua?: boolean;
  message?: string;
}

export function MaTranGoiView() {
  const [bang, setBang] = useState<BangMaTran | null>(null);
  const [macDinh, setMacDinh] = useState(true);
  const [duocSua, setDuocSua] = useState(false);
  const [loi, setLoi] = useState("");
  const [dangGhi, setDangGhi] = useState("");
  const [thu, setThu] = useState<{ goi: string; nhan: string; kq: KetQuaChan } | null>(null);

  const nap = useCallback(async () => {
    try {
      const r = await fetch("/api/ma-tran-goi", { cache: "no-store" });
      const j = (await r.json()) as TraLoi;
      if (!j.ok || !j.bang) {
        setLoi(j.message ?? "Không đọc được ma trận.");
        return;
      }
      setBang(j.bang);
      setMacDinh(j.macDinhChoGoi !== false);
      setDuocSua(j.duocSua === true);
      setLoi("");
    } catch {
      setLoi("Không gọi được máy chủ.");
    }
  }, []);

  useEffect(() => {
    void nap();
  }, [nap]);

  const tichO = async (o: OMaTran, bat: boolean) => {
    setDangGhi(`${o.agentGoi}>${o.agentDuocGoi}`);
    try {
      const r = await fetch("/api/ma-tran-goi", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentGoi: o.agentGoi, agentDuocGoi: o.agentDuocGoi, bat }),
      });
      const j = (await r.json()) as TraLoi;
      if (j.ok && j.bang) setBang(j.bang);
      else setLoi(j.message ?? "Không lưu được ô.");
    } catch {
      setLoi("Không gọi được máy chủ.");
    } finally {
      setDangGhi("");
    }
  };

  const doiMacDinh = async (v: boolean) => {
    const r = await fetch("/api/ma-tran-goi", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ macDinhChoGoi: v }),
    });
    const j = (await r.json()) as TraLoi;
    if (j.ok && j.bang) {
      setBang(j.bang);
      setMacDinh(j.macDinhChoGoi !== false);
    }
  };

  const thuMotCap = async (o: OMaTran) => {
    const r = await fetch("/api/ma-tran-goi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentGoi: o.agentGoi, agentDuocGoi: o.agentDuocGoi }),
    });
    const j = (await r.json()) as { ok: boolean; ketQua?: KetQuaChan };
    if (j.ok && j.ketQua) setThu({ goi: o.tenGoi, nhan: o.tenDuocGoi, kq: j.ketQua });
  };

  if (loi !== "" && bang === null) {
    return (
      <div className="rounded border border-border bg-surface p-4 text-sm text-text-secondary">
        {loi}
      </div>
    );
  }
  if (!bang) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Đang dựng ma trận…
      </div>
    );
  }

  if (bang.canh === 0) {
    return (
      <div className="rounded border border-border bg-surface p-4 text-[13px] text-text-secondary">
        Danh bạ agent chưa bật con nào nên chưa có hàng cột nào để vẽ. Vào{" "}
        <b className="text-text">Cài đặt → Danh bạ agent</b> khai và bật lên; khai mấy con thì ma
        trận bấy nhiêu ô, màn này không gắn cứng số agent.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-border bg-accent-soft p-3 text-[13px] leading-relaxed text-text-secondary">
        <div className="mb-1 flex items-center gap-2 font-semibold text-accent">
          <Network className="h-4 w-4" /> Chọn con nào được gọi con nào
        </div>
        Hàng là <b className="text-text">agent gọi</b>, cột là{" "}
        <b className="text-text">agent được gọi</b>. Ma trận đang{" "}
        <b className="text-text">
          {bang.canh}×{bang.canh}
        </b>{" "}
        vì Danh bạ agent đang bật {bang.canh} con — thêm bớt agent thì bảng tự co giãn theo.
        <div className="mt-2 text-text-muted">
          Ma trận có hiệu lực thật: cổng <code className="font-mono">/api/mcp/main</code> tra bảng
          này trước mỗi lời gọi và từ chối lời gọi bị cấm.
        </div>
        <div className="mt-1 text-text-muted">
          Số lượt gọi thật: xem{" "}
          <a href="/api/agent-quan-sat" target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Agent quan sát ↗
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[13px] text-text-secondary">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={macDinh}
            disabled={!duocSua}
            onChange={(e) => void doiMacDinh(e.target.checked)}
          />
          Ô chưa khai thì mặc định CHO gọi
        </label>
        <span className="text-text-muted">·</span>
        <span>
          Đang bật <b className="text-text">{bang.soODangBat}</b> /{" "}
          {bang.canh * bang.canh - bang.canh} ô
        </span>
        {!duocSua && <span className="text-text-muted">· {LY_DO_CHAN.caidat}</span>}
      </div>

      <div className="overflow-x-auto rounded border border-border bg-surface">
        <table className="min-w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-r border-border bg-bg2 px-3 py-2 text-left text-text-muted">
                Gọi ↓ / Được gọi →
              </th>
              {bang.agent.map((a) => (
                <th
                  key={a.ma}
                  className="border-b border-border bg-bg2 px-3 py-2 text-left font-medium text-text"
                >
                  {a.ten}
                  <div className="font-mono text-[10px] font-normal text-text-muted">{a.ma}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bang.hang.map((h, i) => (
              <tr key={bang.agent[i].ma}>
                <th className="sticky left-0 z-10 border-b border-r border-border bg-bg2 px-3 py-2 text-left font-medium text-text">
                  {bang.agent[i].ten}
                  <div className="font-mono text-[10px] font-normal text-text-muted">
                    {bang.agent[i].ma}
                  </div>
                </th>
                {h.map((o) => (
                  <td
                    key={`${o.agentGoi}>${o.agentDuocGoi}`}
                    className={`border-b border-border px-3 py-2 align-top ${
                      o.duongCheo ? "bg-bg2" : ""
                    }`}
                  >
                    {o.duongCheo ? (
                      <span className="text-[11px] text-text-muted">
                        chính nó — không tự gọi
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={o.bat}
                            disabled={!duocSua || dangGhi === `${o.agentGoi}>${o.agentDuocGoi}`}
                            onChange={(e) => void tichO(o, e.target.checked)}
                          />
                          <span className={o.bat ? "text-green" : "text-text-muted"}>
                            {o.bat ? "cho gọi" : "cấm gọi"}
                          </span>
                          {!o.daKhai && (
                            <span className="text-[10px] text-text-muted">(theo mặc định)</span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => void thuMotCap(o)}
                          className="text-[11px] text-accent underline-offset-2 hover:underline"
                        >
                          thử
                        </button>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {thu && (
        <div className="rounded border border-border bg-surface p-3 text-[13px]">
          <div className="mb-1 flex items-center gap-2 text-text">
            <span className="font-medium">{thu.goi}</span>
            <ArrowRight className="h-3.5 w-3.5 text-text-muted" />
            <span className="font-medium">{thu.nhan}</span>
            <span className={thu.kq.duoc ? "text-green" : "text-yellow"}>
              {thu.kq.duoc ? "được gọi" : "bị từ chối"}
            </span>
          </div>
          <div className="text-text-secondary">{thu.kq.lyDo}</div>
        </div>
      )}

      {loi !== "" && <div className="text-[13px] text-text-secondary">{loi}</div>}
    </div>
  );
}
