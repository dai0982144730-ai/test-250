// Chạy: node kiem-thu/thu-giao-dien-tro-ly.js app/src/main/assets/app <thư-mục-lưu-ảnh>   (cần playwright + chromium; KHÔNG cần máy chủ thật)
// Thử giao diện bản 3004 trong Chromium với cầu nối Android GIẢ (trả đúng khuôn API Main ở chat-types.ts)
const { chromium } = require("playwright");
const path = require("path");
const APP = process.argv[2];
const RA = process.argv[3];
const loiTrang = [];
const MOCK = `
(() => {
  const log = (window.__log = []);
  let mainDn = false, chatGoi = 0;
  const tra = (id, ma, o) => setTimeout(() => window.__cb(id, ma, typeof o === "string" ? o : JSON.stringify(o)), 30);
  window.Android = {
    trangThai: () => JSON.stringify({ dangNhap: true, server: "http://192.168.1.10:3004", email: "dai@sci.vn", ten: "Đại", so: 0, soMoi: 0, hop: [] }),
    api: (id, m, p, b) => { log.push("api " + m + " " + p); tra(id, 200, p.startsWith("/api/viec-cua-toi") ? { viec_nhan: [], viec_phoi_hop: [], viec_giao: [] } : {}); },
    dangNhap: (id) => tra(id, 200, { loi: "" }),
    mainTrangThai: () => JSON.stringify({ dangNhap: mainDn, server: "http://192.168.1.10:3010", email: "dai@sci.vn", coMk3004: true }),
    mainDangNhap: (id, s, e, mk) => { log.push("mainDangNhap " + s + " " + e + " mk=" + (mk ? "co" : "trong")); mainDn = true; tra(id, 200, { loi: "" }); },
    mainThoat: () => { mainDn = false; log.push("mainThoat"); },
    mainTuDangNhap: (id) => { log.push("mainTuDangNhap"); if (window.__tuDnHong) return tra(id, 400, { loi: "Mật khẩu SCI Công việc không dùng được cho Main" }); mainDn = true; tra(id, 200, { loi: "" }); },
    mainApi: (id, m, pDu, b) => {
      log.push("mainApi " + m + " " + pDu + " " + b);
      if (!mainDn) return tra(id, 401, "{}");
      const p = pDu.replace(/[?&]project=[^&]*/, "").replace(/\\?$/, ""); // so khớp đường không kèm ?project=
      if (p === "/api/projects") return window.__loiDa ? tra(id, 0, { loi: "Không kết nối được Main" }) : tra(id, 200, { projects: [{ id: "hv", name: "Điện gió Hướng Việt" }, { id: "np", name: "Thuỷ điện Nậm Pông" }, { id: "nt", name: "Điện mặt trời Ninh Thuận" }], current: "hv" });
      if (p === "/api/ai/chat/xac-nhan" && window.__matMang) return tra(id, 0, { loi: "Không kết nối được Main" });
      if (p === "/api/ai/chat/sessions") return tra(id, 200, { ok: true, sessions: [{ id: "abc123", title: "dự án hướng việt bị chậm", projectId: "default", createdBy: "dai@sci.vn", createdAt: "2026-11-01T16:00:00Z", updatedAt: "2026-11-01T16:39:00Z", messageCount: 4 }] });
      if (p.startsWith("/api/ai/chat/messages")) return tra(id, 200, { ok: true, choDuyet: [], session: { id: "abc123", title: "dự án hướng việt bị chậm", messages: [
        { id: "1", role: "user", content: "Hướng việt có bao nhiêu isue?", at: "2026-11-01T16:39:00Z" },
        { id: "2", role: "assistant", content: "Mình chưa có số liệu issue của dự án Hướng Việt.\\n\\n**Gợi ý tiếp theo:**\\n1. Xem danh sách issue trên **[màn Issue](/alerts)** của Main", at: "2026-11-01T16:39:10Z", actions: [] } ] } });
      if (p === "/api/ai/chat/xac-nhan") { const j = JSON.parse(b); return tra(id, 200, { ok: true, trangThai: j.hanhDong === "lam" ? "da-lam" : "da-bo", cau: j.hanhDong === "lam" ? "Đã giao việc «Kiểm tra móng T12» cho Thủy." : "Đã bỏ.", action: { name: "giao_viec", args: {}, ok: true, summary: "Đã giao việc Kiểm tra móng T12" }, uiActions: [], choDuyet: [] }); }
      if (p === "/api/ai/chat") {
        chatGoi++;
        const reply = "## Tiến độ Hướng Việt\\nDự án **Điện gió Hướng Việt** chậm **39 ngày** so với tiến độ mục tiêu.\\n\\n| Đường | Đã làm | Xong 100% |\\n|---|---|---|\\n| Thực tế | 4,6% | – |\\n| Baseline | 15,7% | 14/09/2027 |\\n\\n- Việc chậm nhất: <script>alert(1)</script> Xây dựng nhà ở\\n- Xem [đường găng](/gantt?x=1&y=\\"2)";
        return setTimeout(() => window.__cb(id, 200, JSON.stringify({ ok: true, reply, actions: [{ name: "hoi_agent", args: {}, ok: true, summary: "Agent tiến độ trả lời tiendo.tom_tat_du_an. Dự án Điện gió Hướng Việt (HV — dữ liệu test): 323 việc, 26 quá hạn, rất dài rất dài" }],
          uiActions: [], choDuyet: chatGoi === 1 ? [{ id: "a1b2c3d4e5f6", name: "giao_viec", moTa: "Giao việc «Kiểm tra móng T12» cho Thủy, hạn 05/11", luc: "2026-11-01T16:40:00Z" }] : [],
          session: { id: "moi999", title: "Tiến độ Hướng Việt", messageCount: 2 } })), 2300);
      }
      tra(id, 404, { ok: false, message: "không có" });
    },
    moWeb: (u) => log.push("moWeb " + u),
    lienKetCho: () => "", dongBoNgay: () => {}, chanDoan: () => "{}", phienBan: () => "3004-0.1.0 (bản 1)", dangXuat: () => log.push("dangXuat"),
  };
})();`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => loiTrang.push(String(e)));
  p.on("dialog", (d) => { loiTrang.push("HOP THOAI (XSS?): " + d.message()); d.dismiss(); });
  await p.addInitScript(MOCK);
  await p.goto("file://" + path.join(APP, "index.html"));
  await p.waitForTimeout(400);
  const ck = [];
  const kq = (ten, ok, them) => ck.push((ok ? "ĐẠT  " : "HỎNG ") + ten + (them ? " — " + them : ""));
  kq("có 5 nút menu đáy, nút 5 là «Trợ lý»", (await p.$$eval("#duoi button", (x) => x.map((b) => b.textContent.trim()))).join(",") === "Việc của tôi,Phòng ban,Dự án,Phòng họp,Trợ lý");
  await p.evaluate(() => { window.__tuDnHong = true; }); // lần đầu: cho tự đăng nhập hỏng để thử ô nhập tay dự phòng
  await p.click('#duoi button[data-t="chat"]');
  await p.waitForTimeout(200);
  kq("mở Trợ lý → app TỰ đăng nhập Main bằng tài khoản SCI Công việc (không hỏi)", (await p.evaluate(() => window.__log)).includes("mainTuDangNhap"));
  kq("tự đăng nhập hỏng → mới hiện ô nhập tay, kèm lý do", (await p.isVisible("#cdn-b")) && (await p.textContent("#chat-than")).includes("Chưa tự vào được trợ lý Main"));
  await p.evaluate(() => { window.__tuDnHong = false; });
  kq("địa chỉ Main gợi ý cổng 3010", (await p.inputValue("#cdn-s")) === "http://192.168.1.10:3010");
  kq("ô mật khẩu nói được để trống", (await p.getAttribute("#cdn-m", "placeholder")).includes("Để trống"));
  await p.screenshot({ path: RA + "/1-dang-nhap-main.png" });
  await p.click("#cdn-b");
  await p.waitForTimeout(300);
  kq("đăng nhập Main xong → ô chọn dự án hiện «Chọn dự án để hỏi», ô gửi khoá (mờ, không ẩn)", (await p.isVisible("#chat-da")) && (await p.textContent("#chat-da")).includes("Chọn dự án để hỏi") && (await p.isVisible("#chat-o")) && (await p.isDisabled("#chat-o")) && (await p.isDisabled("#chat-gui")));
  kq("đã gọi GET /api/projects của Main", (await p.evaluate(() => window.__log)).some((l) => l.startsWith("mainApi GET /api/projects")));
  await p.click('[data-da-mo="1"]');
  kq("bấm ô → xổ danh sách 3 dự án", (await p.$$("#chat-da [data-da]")).length === 3);
  await p.screenshot({ path: RA + "/1b-chon-du-an.png" });
  await p.click('#chat-da [data-da="hv"]');
  kq("bấm một dự án → áp dụng và đóng luôn (một cú bấm)", (await p.$$("#chat-da [data-da]")).length === 0 && (await p.textContent("#chat-da")).includes("Điện gió Hướng Việt") && !(await p.isDisabled("#chat-o")));
  kq("khung trống ghi rõ đang hỏi dự án nào", (await p.textContent("#chat-than")).includes("Hỏi về Điện gió Hướng Việt"));
  await p.fill("#chat-o", "Dự án Hướng Việt chậm bao nhiêu ngày?");
  await p.press("#chat-o", "Enter");
  await p.waitForTimeout(1200);
  kq("trong lúc chờ: hiện đếm giây, nút gửi khoá", (await p.textContent("#chat-dem")).includes("giây") && (await p.isDisabled("#chat-gui")));
  await p.screenshot({ path: RA + "/2-dang-cho.png" });
  await p.waitForTimeout(1800);
  const than = await p.innerHTML("#chat-than");
  kq("trả lời có bảng markdown", than.includes("<table>") && than.includes("<th>Đường</th>"));
  kq("chữ đậm + tiêu đề", than.includes("<b>Điện gió Hướng Việt</b>") && than.includes("<h4>Tiến độ Hướng Việt</h4>"));
  kq("không chèn được thẻ <script> (đã thoát HTML)", !than.includes("<script>") && than.includes("&lt;script&gt;"));
  kq("chip «✓ Agent … trả lời»", than.includes("ct-chip") && than.includes("✓ Agent tiến độ"));
  kq("nút ✅ Làm / ❌ Bỏ hiện", (await p.$$('[data-cho^="lam|"]')).length === 1);
  kq("tên phiên lên thanh tiêu đề", (await p.textContent("#chat-ten")) === "Tiến độ Hướng Việt");
  kq("câu hỏi gửi kèm ?project=hv (AP-01)", (await p.evaluate(() => window.__log)).some((l) => l.startsWith("mainApi POST /api/ai/chat?project=hv ")));
  kq("đầu câu trả lời ghi tên dự án", than.includes("dự án Điện gió Hướng Việt"));
  await p.screenshot({ path: RA + "/3-tra-loi.png" });
  await p.evaluate(() => { window.__matMang = true; });
  await p.click('[data-cho^="lam|"]');
  await p.waitForTimeout(300);
  kq("✅ Làm gặp mất mạng → GIỮ thẻ chờ duyệt + báo «chưa rõ lệnh đã chạy» (AP-02)", (await p.$$('[data-cho^="lam|"]')).length === 1 && (await p.textContent("#chat-than")).includes("Chưa rõ lệnh đã chạy hay chưa"));
  await p.evaluate(() => { window.__matMang = false; });
  await p.click('[data-cho^="lam|"]');
  await p.waitForTimeout(300);
  kq("bấm ✅ Làm → câu xác nhận hiện, nút chờ biến mất", (await p.textContent("#chat-than")).includes("Đã giao việc «Kiểm tra móng T12»") && (await p.$$("[data-cho]")).length === 0);
  await p.click('[data-lk-main="/gantt?x=1&y=\\"2"]');
  kq("bấm link trong câu trả lời → mở web Main đúng địa chỉ", (await p.evaluate(() => window.__log)).some((l) => l === 'moWeb http://192.168.1.10:3010/gantt?x=1&y="2'));
  await p.click("#chat-ds-nut");
  await p.waitForTimeout(300);
  kq("«Phiên cũ» liệt kê phiên", (await p.textContent("#chat-than")).includes("dự án hướng việt bị chậm"));
  await p.screenshot({ path: RA + "/4-phien-cu.png" });
  await p.click('[data-phien="abc123"]');
  await p.waitForTimeout(300);
  kq("mở phiên cũ → tải tin cũ", (await p.textContent("#chat-than")).includes("Hướng việt có bao nhiêu isue?"));
  kq("Back của Android ở khung chat → đóng Trợ lý", (await p.evaluate(() => window.__quayLai())) === true && !(await p.isVisible("#man-chat")));
  await p.click('#duoi button[data-t="chat"]');
  await p.waitForTimeout(300);
  kq("mở lại Trợ lý → về đúng phiên đang dở", (await p.textContent("#chat-than")).includes("Hướng việt có bao nhiêu isue?"));
  kq("«Phiên cũ» và tin cũ gọi kèm ?project=hv", (await p.evaluate(() => window.__log)).some((l) => l.startsWith("mainApi GET /api/ai/chat/sessions?project=hv")) && (await p.evaluate(() => window.__log)).some((l) => /messages\?id=abc123&project=hv/.test(l)));
  await p.click("#chat-moi");
  kq("«+ Mới» → khung trống", (await p.textContent("#chat-than")).includes("Hỏi về Điện gió Hướng Việt"));
  await p.click('[data-da-mo="1"]');
  kq("Back khi danh sách dự án đang xổ → chỉ đóng danh sách", (await p.evaluate(() => window.__quayLai())) === true && (await p.$$("#chat-da [data-da]")).length === 0 && (await p.isVisible("#man-chat")));
  await p.click('[data-da-mo="1"]');
  await p.click('#chat-da [data-da="np"]');
  kq("đổi sang Nậm Pông → chat mới của dự án đó", (await p.textContent("#chat-than")).includes("Hỏi về Thuỷ điện Nậm Pông") && (await p.textContent("#chat-ten")) === "Trợ lý Main");
  await p.screenshot({ path: RA + "/4b-doi-du-an.png" });
  await p.click("#chat-ds-nut"); await p.waitForTimeout(200);
  kq("«Phiên cũ» sau khi đổi gọi ?project=np", (await p.evaluate(() => window.__log)).some((l) => l.startsWith("mainApi GET /api/ai/chat/sessions?project=np")));
  kq("nút ở «Phiên cũ» là «Đăng nhập lại trợ lý Main»", (await p.textContent("[data-chat-thoat]")).includes("Đăng nhập lại trợ lý Main"));
  await p.click("[data-chat-thoat]"); await p.waitForTimeout(300);
  kq("«Đăng nhập lại» → tự vào lại, không hiện ô nhập tay", !(await p.isVisible("#cdn-b")) && (await p.isVisible("#chat-da")));
  kq("đăng nhập lại → nhớ dự án lần trước theo email (Nậm Pông)", (await p.textContent("#chat-da")).includes("Thuỷ điện Nậm Pông"));
  await p.click("#chat-ds-nut"); await p.waitForTimeout(200);
  await p.evaluate(() => { window.__loiDa = true; });
  await p.click("[data-chat-thoat]"); await p.waitForTimeout(300);
  kq("không tải được danh sách dự án → báo lỗi, ô gửi khoá", (await p.textContent("#chat-da")).includes("Chưa chọn được dự án") && (await p.textContent("#chat-than")).includes("Không tải được danh sách dự án") && (await p.isDisabled("#chat-o")));
  await p.screenshot({ path: RA + "/4c-loi-du-an.png" });
  await p.evaluate(() => { window.__loiDa = false; });
  await p.click('[data-da-mo="1"]'); await p.waitForTimeout(300);
  kq("bấm ô khi lỗi → tải lại được", (await p.textContent("#chat-da")).includes("Thuỷ điện Nậm Pông") && !(await p.isDisabled("#chat-o")));
  await p.click("#chat-lui");
  // ô địa chỉ máy chủ 3004
  await p.evaluate(() => document.getElementById("man-dn").classList.add("mo"));
  const thuDc = async (v) => { await p.fill("#dn-s", v); return p.textContent("#dn-loi"); };
  kq("gõ http://192.168.1.10:3004 → KHÔNG cảnh báo (bản gốc hiện «/^http:/»)", (await thuDc("http://192.168.1.10:3004")) === "");
  kq("gõ http://localhost:3004 → nhắc localhost là chính điện thoại", (await thuDc("http://localhost:3004")).includes("chính điện thoại"));
  kq("gõ http://congviec.example.com → cảnh báo không mã hoá", (await thuDc("http://congviec.example.com")).includes("không mã hoá"));
  kq("gõ https://congviec.scigroup.vn → không cảnh báo", (await thuDc("https://congviec.scigroup.vn")) === "");
  await thuDc("http://192.168.1.10:3004");
  await p.screenshot({ path: RA + "/5-dang-nhap-3004.png" });
  kq("không có lỗi JS trên trang", loiTrang.length === 0, loiTrang.join(" | "));
  console.log(ck.join("\n"));
  console.log("\nNHẬT KÝ CẦU NỐI:\n" + (await p.evaluate(() => window.__log)).filter((l) => l.startsWith("main")).join("\n"));
  await b.close();
})();
