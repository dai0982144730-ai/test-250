// ============================================================
// so-cai/hen-gio.ts — Bộ hẹn giờ quét quá hạn / sắp đến hạn. Chủ: module so-cai.
// Mỗi phút xem giờ Việt Nam: đến giờ so_cai.gio_nhac (vd '08:00') mà hôm nay chưa quét thì gọi quetHan,
// rồi rà soát sổ cái hằng ngày (lượt dự phòng). Rà soát + TỰ BỔ SUNG việc thiếu còn chạy NGAY, không chờ giờ (raSoatNen):
// khi khởi động (cập nhật phần mềm → quy tắc lấy việc có thể đã mở rộng), khi đổi cài đặt, sau lần gửi mà sổ cái thiếu dòng.
// Chống bật trùng (một bộ cho cả tiến trình), không ném lỗi làm sập server, không chạy trong test / lúc build.
// Chống nhắc trùng ở CSDL: bảng docflow.nhac_han (db/40-so-cai.sql).
// ============================================================

type G = typeof globalThis & {
  __docflowHenGio?: { timer: ReturnType<typeof setInterval>; ngayDaQuet: string | null; ngayDaRaSoat?: string | null; dangChay: boolean };
  __docflowRaSoatNen?: { dang: boolean; hen: ReturnType<typeof setTimeout> | null; toanBo: boolean; taiLieu: Set<string>; lyDo: string };
};

const khongChayNen = () =>
  typeof window !== "undefined" ||
  !!process.env.VITEST ||
  process.env.NODE_ENV === "test" ||
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.DOCFLOW_TAT_HEN_GIO === "1";

/**
 * MỞ SẴN CSDL ngay lượt đầu cổng MCP được hỏi (17/10/2026). Đo sổ hỏi–đáp sáng 17/10: máy bật 08:32, cổng 3004 bật 08:33,
 * không ai mở trang nên CSDL chưa mở (bộ hẹn giờ chỉ bật khi dựng trang; gác ping "/" không theo chuyển hướng). 08:36:51 Main
 * bắn 15 lượt base.danh_sach_issue — cả 15 cùng đứng chờ 9,3 giây rồi cùng chạy (lượt không cần Tiến độ cũng 9,4 giây) → Main
 * hết hạn 10 giây. Lượt đầu cổng được hỏi thường là suc_khoe / nang_luc (không đụng CSDL — sáng 17/10 Main hỏi nang_luc lúc
 * 08:36:34, 17 giây trước lượt nghiệp vụ) → mở sẵn lúc đó thì lượt nghiệp vụ đầu tiên đỡ phải gánh. Chỉ MỞ CSDL — không bật việc
 * nền nào (việc nền vẫn chỉ bật khi dựng trang). Không chờ, không ném lỗi;
 * không chạy trong test / lúc build (lúc build mà mở data/pgdata khi app đang chạy là hỏng WAL).
 */
export function moSanCsdlNen(): void {
  try {
    if (khongChayNen()) return;
    void import("@/lib/db")
      .then((m) => m.layQ())
      .catch((e) => console.error("[db] mở sẵn CSDL lỗi:", e instanceof Error ? e.message : e));
  } catch {
    /* mở sẵn hỏng thì lượt hỏi đầu tiên tự mở như cũ */
  }
}

/**
 * Rà soát sổ cái + TỰ BỔ SUNG việc thiếu NGAY (chạy nền sau 3 giây, ngoài giao dịch của người gọi — gộp các lần gọi dồn
 * dập; đang chạy thì xếp thêm một lượt). `taiLieuId` = chỉ rà một báo cáo (sau khi gửi); bỏ trống = rà toàn bộ.
 * Không bao giờ ném lỗi ra người gọi.
 */
export function raSoatNen(lyDo: string, taiLieuId?: string): void {
  try {
    if (khongChayNen()) return;
    const g = globalThis as G;
    const st = (g.__docflowRaSoatNen ??= { dang: false, hen: null, toanBo: false, taiLieu: new Set<string>(), lyDo });
    if (taiLieuId) st.taiLieu.add(taiLieuId);
    else st.toanBo = true;
    st.lyDo = lyDo;
    if (st.dang || st.hen) return; // lượt đang chạy / đã hẹn sẽ nhặt yêu cầu này
    st.hen = setTimeout(() => void chayRaSoatNen(), 3000);
  } catch (e) {
    console.error("[so-cai] không hẹn được rà soát:", e instanceof Error ? e.message : e);
  }
}

async function chayRaSoatNen(): Promise<void> {
  const st = (globalThis as G).__docflowRaSoatNen;
  if (!st) return;
  st.hen = null;
  st.dang = true;
  const toanBo = st.toanBo;
  const taiLieu = [...st.taiLieu];
  const lyDo = st.lyDo;
  st.toanBo = false;
  st.taiLieu.clear();
  try {
    const { tx } = await import("@/lib/db");
    const { raSoatHangNgay } = await import("./ra-soat");
    for (const id of toanBo ? [undefined] : taiLieu) {
      const kq = await tx((q) => raSoatHangNgay(q, { ly_do: lyDo, tai_lieu_id: id }));
      if (kq.so_bo_sung || kq.so_thieu) console.log(`[so-cai] rà soát ngay (${lyDo}): tự bổ sung ${kq.so_bo_sung}/${kq.so_thieu} việc thiếu`);
    }
  } catch (e) {
    console.error("[so-cai] rà soát ngay lỗi:", e instanceof Error ? e.message : e);
  } finally {
    st.dang = false;
    if (st.toanBo || st.taiLieu.size) st.hen = setTimeout(() => void chayRaSoatNen(), 3000);
  }
}

function gioVN(): { ngay: string; gio: string } {
  const s = new Date(Date.now() + 7 * 3600_000).toISOString();
  return { ngay: s.slice(0, 10), gio: s.slice(11, 16) };
}

/**
 * Tệp Trợ lý làm trong chat (data/xuat-chat/<người>/) giữ 7 ngày rồi xoá (Mr. Đại chốt 12/10/2026). Trước 17/10 hàm dọn chỉ chạy
 * khi có người xuất tệp mới hoặc bấm tải → không ai dùng thì tệp nằm mãi (kiểm độc lập lần 7: 27 tệp quá hạn 8–9 ngày).
 * Nay chạy thêm mỗi ngày một lần cùng nhịp các hàm dọn khác. Không bao giờ ném lỗi. Trả số tệp đã xoá.
 */
export async function donTepXuatChatHangNgay(): Promise<number> {
  try {
    const { donTepXuatQuaHan, SO_NGAY_GIU_TEP_XUAT } = await import("@/lib/tro-ly/xuat-theo-yeu-cau");
    const n = donTepXuatQuaHan();
    if (n) console.log(`[tro-ly] xoá ${n} tệp Trợ lý làm trong chat đã quá ${SO_NGAY_GIU_TEP_XUAT} ngày`);
    return n;
  } catch (e) {
    console.error("[tro-ly] dọn tệp chat quá hạn lỗi:", e instanceof Error ? e.message : e);
    return 0;
  }
}

/** Một nhịp của bộ hẹn giờ (mỗi phút). Xuất ra chỉ để bài kiểm gọi thẳng — trong app chỉ setInterval gọi. */
export async function nhip(): Promise<void> {
  const g = globalThis as G;
  const st = g.__docflowHenGio;
  if (!st || st.dangChay) return;
  const { ngay, gio } = gioVN();
  if (st.ngayDaQuet === ngay && st.ngayDaRaSoat === ngay) return;
  st.dangChay = true;
  try {
    const { layQ, tx } = await import("@/lib/db");
    const { layCauHinh } = await import("@/lib/cau-hinh/doc");
    const ch = await layCauHinh(await layQ(), "so_cai");
    const gioNhac = /^\d{1,2}:\d{2}$/.test(ch.gio_nhac) ? ch.gio_nhac.padStart(5, "0") : "08:00";
    if (gio < gioNhac) return;
    if (st.ngayDaQuet !== ngay) {
      const { quetHan } = await import("./dich-vu");
      await tx((q) => quetHan(q, ngay));
      st.ngayDaQuet = ngay;
      // Tệp đính kèm việc: hết thời hạn lưu (Cài đặt, mặc định 6 tháng) thì xóa nội dung; file tải lên mà bỏ dở quá 1 ngày thì dọn
      try {
        const { donDinhKem } = await import("@/lib/dinh-kem/kho");
        const d = await tx((q) => donDinhKem(q));
        if (d.het_han || d.bo_do) console.log(`[dinh-kem] xóa ${d.het_han} file hết hạn lưu, dọn ${d.bo_do} file bỏ dở`);
        // Việc đã xong / đã hủy quá cùng thời hạn lưu: xóa hẳn (Mr. Đại chốt 30/09 — thay cho "xóa sau 30 ngày")
        const { donViecHetHan } = await import("@/lib/dinh-kem/kho");
        const v = await tx((q) => donViecHetHan(q));
        if (v.so_viec) console.log(`[so-cai] xóa ${v.so_viec} việc đã xong quá thời hạn lưu: ${v.ma.join(", ")}`);
        // Chuông tự gọn (Mr. Đại duyệt 08/10): gộp nhắc trùng + tắt chuông vô nghĩa của việc đã xong — lưới cho phần đường ngay bỏ sót
        const { donChuongTonDong } = await import("@/lib/thong-bao");
        const c = await tx((q) => donChuongTonDong(q));
        if (c.gop || c.tat) console.log(`[chuong] gộp ${c.gop} chuông nhắc trùng, tắt ${c.tat} chuông của việc đã xong`);
        // Tin đã đọc quá 7 ngày: xoá hẳn (Mr. Đại chốt 10/10/2026 — đọc rồi rời chuông, xem lại 7 ngày; db/87)
        const { xoaTinDaDocCu } = await import("@/lib/thong-bao");
        const x = await tx((q) => xoaTinDaDocCu(q));
        if (x) console.log(`[chuong] xoá ${x} tin đã đọc quá 7 ngày`);
        // Bản nộp báo cáo đã bị nộp đè quá 90 ngày: xoá nội dung file, bản cuối mỗi kỳ giữ (Mr. Đại chốt 08/10)
        const { donBanNopCu } = await import("@/lib/thu-muc/ban-nop-cu");
        const b = await tx((q) => donBanNopCu(q));
        if (b.so_ban) console.log(`[thu-muc] xoá file ${b.so_ban} bản nộp cũ quá ${b.so_ngay} ngày (${b.so_tep_xoa} tệp, ${b.byte} byte)`);
      } catch (e) {
        console.error("[dinh-kem] dọn file lỗi:", e instanceof Error ? e.message : e);
      }
      // Tệp Trợ lý làm trong chat quá 7 ngày: xoá — khối riêng, không đụng CSDL nên lỗi ở các bước dọn trên không chặn nó
      await donTepXuatChatHangNgay();
    }
    // Rà soát sổ cái hằng ngày (cùng giờ): còn thiếu việc của báo cáo đã gửi thì báo quản trị (so-cai/ra-soat.ts)
    if (st.ngayDaRaSoat !== ngay) {
      st.ngayDaRaSoat = ngay; // lỗi cũng không thử lại liên tục trong ngày
      // Không còn lượt AI tự đọc báo cáo đã gửi (Mr. Đại chốt 29/09): việc AI tìm ngoài bảng người nộp quyết ở bước 4
      const { raSoatHangNgay } = await import("./ra-soat");
      const kq = await tx((q) => raSoatHangNgay(q));
      if (kq.so_thieu) console.warn(`[so-cai] rà soát: thiếu ${kq.so_thieu} việc (${kq.so_loi_ghi_so} lỗi ghi sổ)`);
    }
  } catch (e) {
    console.error("[so-cai] quét hạn lỗi:", e instanceof Error ? e.message : e);
  } finally {
    st.dangChay = false;
  }
}

export function khoiDongHenGio(): void {
  try {
    if (khongChayNen()) return;
    // Bộ gửi thư (email thông báo, nhắc việc) — tự chống bật trùng, xem src/lib/email/bo-gui.ts
    void import("@/lib/email/bo-gui")
      .then((m) => m.khoiDongBoGuiThu())
      .catch((e) => console.error("[email] không bật được bộ gửi thư:", e instanceof Error ? e.message : e));
    // Kéo danh mục dự án từ Main (bản gốc mã ngắn · tên · tên gọi khác · nhóm — LOI-DUNG-CHUNG 6g.6) — tự chống bật trùng
    void import("@/lib/du-an-main")
      .then((m) => m.batKeoDuAnNen())
      .catch((e) => console.error("[du-an-main] không bật được:", e instanceof Error ? e.message : e));
    // 🤖 Xếp việc vào 6 giai đoạn (PMP + Thiết kế) cho menu Dự án (giao diện căn phòng) — tự chống bật trùng
    void import("@/lib/phong/giai-doan")
      .then((m) => m.batXepGiaiDoanNen())
      .catch((e) => console.error("[giai-doan] không bật được:", e instanceof Error ? e.message : e));
    // 🤖 Gắn việc vào cây WBS của agent Tiến độ (Mr. Đại chốt 03/10/2026) — tự chống bật trùng
    void import("@/lib/gan-wbs/gan-wbs")
      .then((m) => m.batGanWbsNen())
      .catch((e) => console.error("[gan-wbs] không bật được:", e instanceof Error ? e.message : e));
    // 🤖 Mỗi việc một lãnh đạo phối hợp theo phân công Ban lãnh đạo (Mr. Đại chốt 03/10/2026) — tự chống bật trùng
    void import("@/lib/so-cai/lanh-dao-phoi-hop")
      .then((m) => m.batLanhDaoNen())
      .catch((e) => console.error("[lanh-dao-phoi-hop] không bật được:", e instanceof Error ? e.message : e));
    // 🤖 Báo cáo tuần: chấm độ khó từng việc + viết báo cáo khi cấp 1 nộp / tới giờ muộn nhất thứ Hai — tự chống bật trùng
    void import("@/lib/bao-cao-tuan/nen")
      .then((m) => m.batBaoCaoTuanNen())
      .catch((e) => console.error("[bao-cao-tuan] không bật được:", e instanceof Error ? e.message : e));
    // Hai tài khoản Claude: tự mồi phiên làm việc mỗi sáng (tuỳ chọn ở Cài đặt → AI, mặc định tắt) — tự chống bật trùng
    void import("@/lib/ai/tai-khoan-claude")
      .then(async (m) => {
        const { runCliPrompt } = await import("@/lib/ai/providers");
        const { voiTinhNang } = await import("@/lib/ai/so-dung-ai");
        m.batMoiPhien((cau) => voiTinhNang("lib/so-cai/hen-gio", () => runCliPrompt(cau, undefined, undefined, undefined, 90_000, true)));
      })
      .catch((e) => console.error("[ai] không bật được mồi phiên:", e instanceof Error ? e.message : e));
    const g = globalThis as G;
    if (g.__docflowHenGio) return;
    const timer = setInterval(() => void nhip(), 60_000);
    if (typeof timer === "object" && timer && "unref" in timer) (timer as { unref(): void }).unref();
    g.__docflowHenGio = { timer, ngayDaQuet: null, dangChay: false };
    // Nhịp đầu sau 15 giây để server khởi động xong
    const t0 = setTimeout(() => void nhip(), 15_000);
    if (typeof t0 === "object" && t0 && "unref" in t0) (t0 as { unref(): void }).unref();
    // Khởi động (thường là sau khi cập nhật phần mềm — quy tắc lấy việc có thể đã mở rộng): rà soát + tự bổ sung ngay
    const t1 = setTimeout(() => raSoatNen("Khởi động hệ thống"), 20_000);
    if (typeof t1 === "object" && t1 && "unref" in t1) (t1 as { unref(): void }).unref();
  } catch (e) {
    console.error("[so-cai] không bật được bộ hẹn giờ:", e);
  }
}
