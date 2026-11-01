"use client";

// ============================================================
// DÃY LINK CÁC AGENT (Mr. Đại chốt 04/10/2026) — một nguồn cho hai chỗ:
//   · menu tên người: ngay dưới "Đăng xuất", có gạch ngang phía trên
//   · cột trái Main: nhóm "Sang agent khác", cùng thứ tự (Mr. Đại: "trình tự giống trong tên")
// Địa chỉ đọc từ DANH BẠ AGENT qua /api/lien-ket-agent — không gắn cứng (luật 7).
// Mở tab mới như chốt AT cũ của nhóm "Sang agent khác".
// Bản giống hệt ở Main · Tiến độ · Hợp đồng (cùng Tailwind) — sửa một nơi thì chép sang nơi kia.
// ============================================================
import { useEffect, useState } from "react";
import { CHUA_HOAT_DONG, DANG_O_DAY, DAY_AGENT, type LienKetAgent } from "@/lib/lien-ket-agent";

/** `khoa` = lý do người đang mở không vào được agent đó (agent mật — Mr. Đại chốt 04/10 tối); máy chủ tính, màn chỉ hiện */
export type LienKetAgentCoKhoa = LienKetAgent & { khoa?: string };

let daCo: LienKetAgentCoKhoa[] | null = null;
let dangTai: Promise<LienKetAgentCoKhoa[] | null> | null = null;

/** Tải một lần cho cả trang (menu + cột trái dùng chung). Lỗi thì không nhớ — lần mở sau thử lại. */
function taiDay(): Promise<LienKetAgentCoKhoa[] | null> {
  if (daCo) return Promise.resolve(daCo);
  if (!dangTai) {
    dangTai = fetch("/api/lien-ket-agent")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { day?: LienKetAgentCoKhoa[] } | null) => {
        if (j?.day) daCo = j.day;
        return daCo;
      })
      .catch(() => null)
      .finally(() => {
        dangTai = null;
      });
  }
  return dangTai;
}

/** null = đang tải (hoặc tải lỗi) */
export function useDayAgent(): LienKetAgentCoKhoa[] | null {
  const [day, setDay] = useState<LienKetAgentCoKhoa[] | null>(daCo);
  useEffect(() => {
    let huy = false;
    void taiDay().then((d) => {
      if (!huy && d) setDay(d);
    });
    return () => {
      huy = true;
    };
  }, []);
  return day;
}

const MUC =
  "flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-[12px] font-medium text-text-secondary transition hover:bg-white/5 hover:text-text";
/** Chữ thuần, bấm không ra gì — không viền, không nền (luật 28) */
const CHU = "block w-full px-2.5 py-1.5 text-left text-[12px] text-text-muted";

/** Dãy trong menu tên người. `maToi` = mã agent đang mở (hiện "đang ở đây", không phải link). */
export function DayAgentMenu({ maToi }: { maToi: string }) {
  const day = useDayAgent();
  const ds: LienKetAgentCoKhoa[] = day ?? DAY_AGENT.map((a) => ({ ...a, diaChi: null }));
  return (
    <div className="border-t border-border pt-1" data-gt="Các agent">
      {ds.map((a) =>
        a.ma === maToi ? (
          <div key={a.ma} className={CHU} data-um-chu>
            <b className="font-semibold text-text">{a.ten}</b> · {DANG_O_DAY}
          </div>
        ) : a.khoa ? (
          // Agent mật mình không vào được — chữ thuần mờ kèm lý do (luật 17 + 28), không phải link
          <div key={a.ma} className={CHU} data-um-chu title={a.khoa}>
            {a.ten} · {a.khoa}
          </div>
        ) : a.diaChi ? (
          <a key={a.ma} href={a.diaChi} target="_blank" rel="noreferrer" role="menuitem" className={MUC} data-gt={a.ten}>
            {a.ten} ↗
          </a>
        ) : (
          <div key={a.ma} className={CHU} data-um-chu>
            {a.ten} · {day ? CHUA_HOAT_DONG : "…"}
          </div>
        )
      )}
    </div>
  );
}
