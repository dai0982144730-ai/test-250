// ============================================================
// TEST QUYỀN GHI TRÊN SỔ ISSUE — src/lib/canh-bao/quyen-issue.ts
//
// Chốt BC 04/09 (LOI-DUNG-CHUNG 6e.1):
//   NHÌN — mọi agent thấy issue của cả 5
//   GHI  — chỉ với issue do chính agent đó sinh ra
//
// Bộ test này soi ĐÚNG hàm mà CẢ HAI phía dùng:
//   · tầng dữ liệu (`so-issue.ts`) gọi để CHẶN thật
//   · màn hình (`CanhBaoView.tsx`) gọi để làm MỜ nút
// Một hàm cho hai phía nên không thể xảy ra cảnh "nút sáng mà ghi không được"
// hoặc tệ hơn "nút mờ nhưng gọi thẳng API vẫn ghi được".
//
// Và theo luật cứng của dự án: NÚT BỊ CHẶN THÌ HIỆN MỜ, KHÔNG ẨN — nên hàm
// phải trả LÝ DO đọc được bằng tiếng Việt, không phải boolean trần.
// ============================================================

import { describe, it, expect } from "vitest";
import {
  chuSoHuu,
  cuaAgentKhac,
  lyDoChanGhi,
  lyDoChanDong,
} from "@/lib/canh-bao/quyen-issue";
import { AGENT_NAY, TEN_AGENT, type MaAgent, type TheCanhBao } from "@/lib/canh-bao/model";

type ManhThe = Pick<TheCanhBao, "agent" | "dieuKien" | "nguon">;

function the(p: Partial<ManhThe> = {}): ManhThe {
  return { dieuKien: "dang-vi-pham", nguon: "nguoi", ...p };
}

const MOI_AGENT: MaAgent[] = ["tien-do", "phap-ly", "hop-dong", "base", "main"];
const AGENT_KHAC = MOI_AGENT.filter((a) => a !== AGENT_NAY);

describe("Chủ sở hữu thẻ", () => {
  it("thẻ khai rõ agent thì lấy đúng agent đó", () => {
    expect(chuSoHuu({ agent: "phap-ly" })).toBe("phap-ly");
  });

  it("thẻ CŨ chưa có trường agent thì coi là của agent đang chạy", () => {
    // Cố ý chọn hướng dễ dãi: khoá nhầm dữ liệu cũ của chính mình thì người
    // dùng bị chặn oan mà không hiểu vì sao
    expect(chuSoHuu({})).toBe(AGENT_NAY);
    expect(cuaAgentKhac({})).toBe(false);
  });

  it("bốn agent còn lại đều là 'agent khác'", () => {
    expect(AGENT_KHAC).toHaveLength(4);
    for (const a of AGENT_KHAC) expect(cuaAgentKhac({ agent: a })).toBe(true);
  });
});

describe("⭐ Vế GHI — chỉ sửa được issue của chính mình", () => {
  it("issue của chính agent này thì KHÔNG bị chặn", () => {
    expect(lyDoChanGhi(the({ agent: AGENT_NAY }))).toBeNull();
    expect(lyDoChanGhi(the())).toBeNull();
  });

  it("issue của MỖI agent khác đều bị chặn, và lý do gọi ĐÚNG TÊN agent đó", () => {
    for (const a of AGENT_KHAC) {
      const lyDo = lyDoChanGhi(the({ agent: a }));
      expect(lyDo).not.toBeNull();
      expect(lyDo).toContain(TEN_AGENT[a]);
      expect(lyDo).toContain(TEN_AGENT[AGENT_NAY]);
    }
  });

  it("issue ĐÃ ĐÓNG thì không ghi thêm được", () => {
    expect(lyDoChanGhi(the({ dieuKien: "da-dong" }))).toContain("đã đóng");
  });

  it("vai trò chỉ-đọc bị chặn, và lý do nói rõ là do VAI TRÒ", () => {
    const lyDo = lyDoChanGhi(the(), false);
    // 25/09: câu chặn lấy từ quyen.ts LY_DO_CHAN.ghi — nói rõ loại Người xem
    expect(lyDo).toContain("Người xem");
  });

  it("chủ sở hữu được xét TRƯỚC vai trò — nói đúng nguyên nhân gốc", () => {
    // Người hiện trường xem issue của agent pháp lý: lý do phải là "của agent
    // khác", vì kể cả PM cũng không sửa được. Nói nhầm thành "thiếu quyền" là
    // đẩy người ta đi xin quyền vô ích.
    const lyDo = lyDoChanGhi(the({ agent: "phap-ly" }), false);
    expect(lyDo).toContain(TEN_AGENT["phap-ly"]);
    expect(lyDo).not.toContain("ĐỌC");
  });
});

describe("Vế ĐÓNG — chặt hơn vế ghi một bậc", () => {
  it("issue nguồn NGƯỜI của chính mình thì đóng được", () => {
    expect(lyDoChanDong(the({ nguon: "nguoi" }))).toBeNull();
  });

  it("issue do MÁY sinh thì chỉ máy đóng — người bấm cũng không được", () => {
    for (const n of ["gang", "nang-suat", "su-kien"] as TheCanhBao["nguon"][]) {
      const lyDo = lyDoChanDong(the({ nguon: n }));
      expect(lyDo).toContain("CHỈ MÁY đóng được");
    }
  });

  it("của agent khác thì chặn vì chủ sở hữu, không phải vì nguồn máy", () => {
    const lyDo = lyDoChanDong(the({ agent: "hop-dong", nguon: "gang" }));
    expect(lyDo).toContain(TEN_AGENT["hop-dong"]);
  });
});

describe("Chữ hiện cho người đọc — luật «hiện mờ, không ẩn»", () => {
  it("mọi lý do chặn đều là tiếng Việt có dấu, đủ dài để hiểu", () => {
    const ds = [
      lyDoChanGhi(the({ agent: AGENT_KHAC[0] })),
      lyDoChanGhi(the({ dieuKien: "da-dong" })),
      lyDoChanGhi(the(), false),
      lyDoChanDong(the({ nguon: "gang" })),
    ];
    for (const lyDo of ds) {
      expect(lyDo).not.toBeNull();
      expect(lyDo!.length).toBeGreaterThan(25);
      // Có dấu tiếng Việt — không phải chuỗi mã kỹ thuật lọt ra màn hình
      expect(lyDo!).toMatch(/[àáảãạăâđêôơưèéẹìíịòóọùúụýỳ]/i);
    }
  });

  it("ghi được thì trả null — màn hình bật nút, không hiện tooltip thừa", () => {
    expect(lyDoChanGhi(the())).toBeNull();
    expect(lyDoChanDong(the())).toBeNull();
  });
});
