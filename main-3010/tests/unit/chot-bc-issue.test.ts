// Chốt BC 04/09 (LOI-DUNG-CHUNG 6e.1) — nguyên văn Mr. Đại:
// "Tất cả các agent đều nhìn thấy issue của các agent còn lại và chỉ thêm sửa
//  xoá issue chính nó."
//
// Hai vế phải test tách nhau, vì lỗi hay gặp là code hiểu nhầm vế NHÌN thành
// "chỉ đọc được issue của mình" — tài liệu đã phải sửa câu chữ vì lỗ này.
//
// ⭐ SỬA 05/09/2026: bộ code này là AGENT BASE. `AGENT_NAY` trước đây còn ghi
// "tien-do" (di sản lúc fork), khiến Agent Base sửa được issue của agent tiến
// độ — đúng điều chốt BC cấm. Bộ test dưới nay soi theo `AGENT_NAY` thay vì
// ghi cứng tên agent, nên fork sang agent khác không phải sửa lại bài test.

import { describe, expect, it } from "vitest";
import {
  AGENT_NAY,
  NHAN_PHAM_VI,
  TEN_AGENT,
  type MaAgent,
  type PhamViIssue,
  type TheCanhBao,
} from "@/lib/canh-bao/model";

function the(id: string, agent?: MaAgent, daDong = false): TheCanhBao {
  return {
    id,
    nguon: "nguoi",
    mucDo: "yellow",
    tieuDe: `Issue ${id}`,
    phanTich: "—",
    anhHuongCod: 0,
    nguonDuLieu: "—",
    deXuat: "—",
    dieuKien: daDong ? "da-dong" : "dang-vi-pham",
    xuLy: "chua-ai-dong",
    ghiNhan: [],
    ngayMo: "2026-09-01",
    soTuanMo: 0,
    ...(agent ? { agent } : {}),
  } as TheCanhBao;
}

/** Đúng phép lọc mà màn Cảnh báo đang dùng */
function loc(ds: TheCanhBao[], phamVi: PhamViIssue): TheCanhBao[] {
  if (phamVi === "da-dong") return ds.filter((t) => t.dieuKien === "da-dong");
  const mo = ds.filter((t) => t.dieuKien !== "da-dong");
  return phamVi === "toan-bo" ? mo : mo.filter((t) => (t.agent ?? AGENT_NAY) === AGENT_NAY);
}

/** Một mã agent KHÁC agent đang chạy — để bài test không phụ thuộc agent nào */
const AGENT_KHAC: MaAgent = AGENT_NAY === "tien-do" ? "phap-ly" : "tien-do";

const SO = [
  the("ISS-1"), // thẻ cũ chưa có trường agent
  the("ISS-2", AGENT_NAY),
  the("ISS-3", "phap-ly"),
  the("ISS-4", "hop-dong"),
  the("ISS-5", AGENT_NAY, true), // đã đóng
];

describe("chốt BC — vế NHÌN: thấy issue của cả 5 agent", () => {
  it('phạm vi "toàn bộ" thấy issue của MỌI agent, không giấu cái nào', () => {
    expect(loc(SO, "toan-bo").map((t) => t.id)).toEqual(["ISS-1", "ISS-2", "ISS-3", "ISS-4"]);
  });

  it("lọc sẵn theo agent này là LỌC MẶC ĐỊNH, không phải giới hạn quyền đọc", () => {
    // Cùng một sổ, chỉ đổi phạm vi là thấy thêm — chứng minh dữ liệu không bị chặn đọc
    expect(loc(SO, "agent-nay")).toHaveLength(2);
    expect(loc(SO, "toan-bo")).toHaveLength(4);
    // Và cái thấy thêm đúng là của agent KHÁC
    const chiToanBo = loc(SO, "toan-bo").filter(
      (t) => !loc(SO, "agent-nay").some((x) => x.id === t.id)
    );
    expect(chiToanBo.map((t) => t.agent)).toEqual(["phap-ly", "hop-dong"]);
  });

  it("thẻ cũ chưa khai agent được coi là của agent này, không rơi mất", () => {
    expect(loc(SO, "agent-nay").map((t) => t.id)).toContain("ISS-1");
  });
});

describe("chốt BC — phạm vi Đã đóng", () => {
  it("chỉ hiện issue đã đóng, và không lẫn vào hai phạm vi kia", () => {
    expect(loc(SO, "da-dong").map((t) => t.id)).toEqual(["ISS-5"]);
    expect(loc(SO, "agent-nay").map((t) => t.id)).not.toContain("ISS-5");
    expect(loc(SO, "toan-bo").map((t) => t.id)).not.toContain("ISS-5");
  });
});

describe("chốt BC — vế GHI: chỉ sửa được issue của chính mình", () => {
  /** Đúng phép chặn của tầng sổ */
  const chan = (t: TheCanhBao): boolean => (t.agent ?? AGENT_NAY) !== AGENT_NAY;

  it("issue của agent khác bị chặn ghi", () => {
    const khac: MaAgent[] = (["tien-do", "phap-ly", "hop-dong", "base", "main"] as MaAgent[]).filter(
      (a) => a !== AGENT_NAY
    );
    expect(khac).toHaveLength(4);
    for (const a of khac) expect(chan(the("X", a))).toBe(true);
  });

  it("issue của chính agent này thì ghi được", () => {
    expect(chan(the("X", AGENT_NAY))).toBe(false);
    expect(chan(the("X"))).toBe(false);
  });

  it("⭐ agent đang chạy đúng là Agent Base — không còn sót giá trị lúc fork", () => {
    expect(AGENT_NAY).toBe("base");
  });
});

describe("chốt BC — chữ hiện cho người đọc", () => {
  it("ba nhãn phạm vi đều là tiếng Việt, đúng chữ đã chốt", () => {
    expect(NHAN_PHAM_VI["agent-nay"]).toBe(`Chỉ issue của ${TEN_AGENT[AGENT_NAY]}`);
    // 04/10/2026: mã "base" nay là agent Công việc (CHOT 6g.7) — tên hiển thị đổi theo
    expect(NHAN_PHAM_VI["agent-nay"]).toBe("Chỉ issue của Agent Công việc");
    expect(NHAN_PHAM_VI["toan-bo"]).toBe("Toàn bộ dự án — cả 5 agent");
    expect(NHAN_PHAM_VI["da-dong"]).toBe("Đã đóng — xem lại");
  });

  it("đủ tên tiếng Việt cho cả 5 agent", () => {
    const ds: MaAgent[] = ["tien-do", "phap-ly", "hop-dong", "base", "main"];
    for (const a of ds) expect(TEN_AGENT[a]).toMatch(/^(Agent|Main)/);
  });
});
