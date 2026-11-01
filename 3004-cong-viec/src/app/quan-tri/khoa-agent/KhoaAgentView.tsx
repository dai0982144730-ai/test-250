"use client";

// Màn cấp / thu hồi khóa cho agent (client). API: /api/quan-tri/khoa-agent.
import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, ShieldOff } from "lucide-react";
import { SectionCard, InfoBox, Pill } from "@/components/ky-nang/khung";
import { KhaiHuongDan } from "@/components/huong-dan/kho-huong-dan";

interface Khoa {
  id: string;
  ten: string;
  cong_cu: string[];
  tao_boi: string;
  tao_boi_ten: string | null;
  tao_luc: string;
  thu_hoi: boolean;
  so_lan_7_ngay: number;
  lan_cuoi: string | null;
}

interface CongCu {
  ma: string;
  mo_ta: string;
}

function ngayGio(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const O = "w-full rounded-sm border border-border bg-bg2 px-2 py-1.5 text-[12px] text-text outline-none focus:border-accent";

export function KhoaAgentView() {
  const [ds, setDs] = useState<Khoa[]>([]);
  const [congCu, setCongCu] = useState<CongCu[]>([]);
  const [ten, setTen] = useState("");
  const [chon, setChon] = useState<string[]>(["socai.*", "lichsu.*"]);
  const [khoaMoi, setKhoaMoi] = useState<{ ten: string; khoa: string } | null>(null);
  const [bao, setBao] = useState<{ ok: boolean; chu: string } | null>(null);
  const [dang, setDang] = useState(false);
  const [xacNhan, setXacNhan] = useState<string | null>(null);

  const nap = useCallback(async () => {
    const r = await fetch("/api/quan-tri/khoa-agent", { cache: "no-store" });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; khoa?: Khoa[]; cong_cu?: CongCu[]; loi?: string };
    if (!r.ok || !j.ok) {
      setBao({ ok: false, chu: j.loi ?? `Không đọc được danh sách khóa (HTTP ${r.status}).` });
      return;
    }
    setDs(j.khoa ?? []);
    setCongCu(j.cong_cu ?? []);
  }, []);

  useEffect(() => {
    void nap();
  }, [nap]);

  async function cap(): Promise<void> {
    setDang(true);
    setBao(null);
    try {
      const r = await fetch("/api/quan-tri/khoa-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ten, cong_cu: chon }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; khoa?: string; loi?: string; message?: string };
      if (!r.ok || !j.ok || !j.khoa) throw new Error(j.loi ?? "Không cấp được khóa.");
      setKhoaMoi({ ten, khoa: j.khoa });
      setTen("");
      setBao({ ok: true, chu: j.message ?? "Đã cấp khóa." });
      await nap();
    } catch (e) {
      setBao({ ok: false, chu: e instanceof Error ? e.message : "Không cấp được khóa." });
    } finally {
      setDang(false);
    }
  }

  async function thuHoi(id: string): Promise<void> {
    setDang(true);
    setBao(null);
    setXacNhan(null);
    try {
      const r = await fetch(`/api/quan-tri/khoa-agent?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; loi?: string; message?: string };
      if (!r.ok || !j.ok) throw new Error(j.loi ?? "Không thu hồi được khóa.");
      setBao({ ok: true, chu: j.message ?? "Đã thu hồi." });
      await nap();
    } catch (e) {
      setBao({ ok: false, chu: e instanceof Error ? e.message : "Không thu hồi được khóa." });
    } finally {
      setDang(false);
    }
  }

  const gocMay = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="space-y-4">
      <KhaiHuongDan ma="khoa-agent" uuTien={1} />
      {khoaMoi && (
        <div className="rounded border border-yellow p-3 text-[12px]">
          <div className="mb-1 font-bold text-yellow">Khóa mới cho «{khoaMoi.ten}» — CHÉP NGAY, khóa này chỉ hiện một lần</div>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-sm border border-border bg-bg2 px-2 py-1.5 text-[12px] text-text">{khoaMoi.khoa}</code>
            <button
              type="button"
              title="Chép khóa"
              onClick={() => void navigator.clipboard?.writeText(khoaMoi.khoa)}
              className="rounded-sm border border-border p-1.5 text-text-secondary hover:border-accent hover:text-accent"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-text-muted">
            Agent gọi: <code>POST {gocMay}/api/mcp/socai</code> với header <code>Authorization: Bearer &lt;khóa&gt;</code>. Mất khóa thì thu hồi và cấp khóa mới.
          </div>
          <button type="button" onClick={() => setKhoaMoi(null)} className="mt-2 text-[11px] font-semibold text-text-secondary hover:text-text">
            Đã chép, ẩn khóa
          </button>
        </div>
      )}

      <SectionCard title="Cấp khóa mới" subtitle="Mỗi agent một khóa riêng, chỉ gọi được công cụ được chọn.">
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-[11px] text-text-muted">Tên agent</span>
            <input className={O} value={ten} placeholder="vd Agent tiến độ" onChange={(e) => setTen(e.target.value)} />
          </label>
          <div className="space-y-1">
            <span className="text-[11px] text-text-muted">Công cụ được gọi</span>
            <div className="grid gap-1 sm:grid-cols-2">
              {congCu.map((c) => (
                <label key={c.ma} className="flex items-start gap-2 rounded-sm border border-border-light px-2 py-1.5 text-[11.5px]">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={chon.includes(c.ma)}
                    onChange={(e) => setChon((cu) => (e.target.checked ? [...cu, c.ma] : cu.filter((x) => x !== c.ma)))}
                  />
                  <span>
                    <code className="text-accent">{c.ma}</code>
                    <span className="block text-[10.5px] text-text-muted">{c.mo_ta}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={dang || ten.trim().length < 2 || chon.length === 0}
            onClick={() => void cap()}
            className="inline-flex items-center gap-1.5 rounded-sm border border-accent bg-accent px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            <KeyRound className="h-4 w-4" /> Cấp khóa
          </button>
          {bao && <div className={`text-[11.5px] ${bao.ok ? "text-green" : "text-red"}`}>{bao.chu}</div>}
        </div>
      </SectionCard>

      <SectionCard title="Khóa đã cấp" subtitle={`${ds.filter((k) => !k.thu_hoi).length} khóa đang dùng · ${ds.filter((k) => k.thu_hoi).length} đã thu hồi`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10.5px] uppercase tracking-wider text-text-muted">
                <th className="py-1.5 pr-2">Agent</th>
                <th className="py-1.5 pr-2">Công cụ</th>
                <th className="py-1.5 pr-2">Cấp bởi · lúc</th>
                <th className="py-1.5 pr-2">Lượt đọc 7 ngày · lần cuối</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody>
              {ds.map((k) => (
                <tr key={k.id} className={`border-b border-border-light align-top ${k.thu_hoi ? "opacity-50" : ""}`}>
                  <td className="py-2 pr-2">
                    <div className="font-semibold text-text">{k.ten}</div>
                    <div className="text-[10px] text-text-muted">{k.id}</div>
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap gap-1">
                      {(k.cong_cu ?? []).map((c) => (
                        <code key={c} className="rounded-[4px] border border-border-light px-1 text-[10.5px] text-accent">
                          {c}
                        </code>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-[11px] text-text-secondary">
                    {k.tao_boi_ten ?? k.tao_boi}
                    <div className="text-text-muted">{ngayGio(k.tao_luc)}</div>
                  </td>
                  <td className="py-2 pr-2 text-[11px] text-text-secondary">
                    {k.so_lan_7_ngay.toLocaleString("vi-VN")} lượt
                    <div className="text-text-muted">{ngayGio(k.lan_cuoi)}</div>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    {k.thu_hoi ? (
                      <Pill tone="muted">đã thu hồi</Pill>
                    ) : xacNhan === k.id ? (
                      <span className="inline-flex items-center gap-2">
                        <button type="button" disabled={dang} onClick={() => void thuHoi(k.id)} className="text-[11px] font-semibold text-red">
                          Thu hồi thật
                        </button>
                        <button type="button" onClick={() => setXacNhan(null)} className="text-[11px] text-text-muted">
                          Hủy
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setXacNhan(k.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-red hover:opacity-80">
                        <ShieldOff className="h-3.5 w-3.5" /> Thu hồi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {ds.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-5 text-center text-text-muted">
                    Chưa cấp khóa nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <InfoBox title="📐 Agent khác đọc sổ cái thế nào">
        Cổng MCP <code>/api/mcp/socai</code> (kiểu SCI <code>{"{ cong_cu, tham_so }"}</code> hoặc MCP chuẩn JSON-RPC) và API chỉ đọc{" "}
        <code>/api/v1/so-cai</code>, <code>/api/v1/so-cai/&lt;mã việc&gt;</code>. Mỗi dòng việc có tên trường cố định (ma_viec,
        ten_viec, nguon_hien_hanh, da_de, phan_viec, tien_do, canh_bao, qua_trinh…) — mô tả trong <code>docs/SO-CAI-CHO-AGENT.md</code>.
        CSDL chỉ giữ mã băm sha256 của khóa. Lịch sử ghi lúc cấp, lúc thu hồi, và lượt đọc đầu tiên mỗi ngày của từng khóa.
      </InfoBox>
    </div>
  );
}
