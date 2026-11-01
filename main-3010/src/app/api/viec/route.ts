// ============================================================
// API MÀN "VIỆC CỦA TÔI" — bản hai nửa (Mr. Đại chốt 04/10/2026 — CHOT LOI-DUNG-CHUNG 6g.7 mục 3)
//
// GET  /api/viec          → việc của tôi theo 3 nút (đọc agent Công việc) + nháp AI chờ duyệt
// POST {action:"gui-nhap", id, giaoCho, ten?, ketQua?, han?, maDuAn?, dinhKem?}
//        → gửi một nháp AI sang agent Công việc (người duyệt tại chỗ). Trường nào gửi kèm (từ ô Sửa) thì thắng nháp;
//          thiếu thì lấy từ nháp (nút Gửi thẳng trên dòng).
// POST {action:"giao-tai-cho", ten, ketQua?, giaoCho, han?, maDuAn?, dinhKem?} → nút Giao việc / Nhắc ở Bảng điều hành
// POST {action:"bo-nhap", id} → bỏ một nháp
// POST {action:"hien-lai-tu-dong", id, agent} → việc máy tự đóng ở agent đó về lại chờ duyệt (08/10)
// ĐỢT ④ (06/10/2026): GET gom thêm nháp chờ duyệt của các agent (bảng tổng); POST mang `agent` khác "main" → chuyển về agent gốc
//
// Dự án KHÔNG bắt buộc (như ô "+" của agent Công việc — Mr. Đại chốt 04/10 chiều). Main xem MỌI dự án — không lọc.
// Bỏ hết Base.vn. Mọi lời gọi agent Công việc đi qua lib/chung/viec-cong-viec.ts (luật 29).
// ============================================================

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { duocGhi, LY_DO_CHAN } from "@/lib/quyen";
import { boNhapCuaToi, daGiaoNhapCuaToi, giaoSangCongViec, gocCongViec, hanIso, layViecCuaToiCV, nhapCuaToi } from "@/lib/chung/viec-cong-viec";
import { ketQuaMacDinhNhap, locNhapHien } from "@/lib/chung/viec-cong-viec-kieu";
import { boQuaQuaAgent, giaoQuaAgent, gomViecChoDuyet, hienLaiQuaAgent, laAgentCoCua } from "@/lib/chung/viec-cho-duyet-gom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function goiDuLieu(email: string) {
  // ĐỢT ④ (06/10/2026): bảng tổng — nháp của Main + nháp chờ duyệt các agent khác (người này giao được), đọc SONG SONG
  const [viec, ngoai] = await Promise.all([layViecCuaToiCV(email), gomViecChoDuyet(email)]);
  const tatCa = [...nhapCuaToi(email).map((n) => ({ ...n, agent: "main" })), ...ngoai.nhap].sort((a, b) => b.luc.localeCompare(a.luc));
  return {
    ok: true,
    viec,
    goc: gocCongViec(),
    // Nháp đã giao / trùng thì ẩn (Mr. Đại bắt 04/10)
    nhapAi: locNhapHien(tatCa, viec.ok ? viec.ds.giao : []),
    // Agent chưa đọc được (không thưa / chưa mở cửa) — màn ghi rõ, không lặng im
    chuaDoc: ngoai.chuaDoc,
    // "Tự đóng (N) ▸" (Mr. Đại duyệt 08/10): việc các agent máy tự đóng — một danh sách thu gọn
    tuDong: ngoai.tuDong,
  };
}

export async function GET() {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  return NextResponse.json(await goiDuLieu(auth.session.email));
}

export async function POST(request: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;
  const email = auth.session.email;
  if (!duocGhi(auth.session.role)) {
    return NextResponse.json({ ok: false, message: LY_DO_CHAN.ghi }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }
  const action = String(body.action ?? "");
  const chuoi = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const co = (k: string) => typeof body[k] === "string";

  // ĐỢT ④: nháp của agent khác → chuyển cú bấm về agent gốc (agent đó tự kiểm quyền giao theo dự án, hạn, nháp còn)
  const agent = chuoi(body.agent);
  if (action === "hien-lai-tu-dong") {
    if (!laAgentCoCua(agent)) return NextResponse.json({ ok: false, message: `Agent "${agent}" chưa mở cửa việc chờ duyệt.` }, { status: 400 });
    const kq = await hienLaiQuaAgent(agent, email, chuoi(body.id));
    if (!kq.ok) return NextResponse.json({ ok: false, message: kq.loi }, { status: 400 });
    return NextResponse.json(await goiDuLieu(email));
  }
  if (agent && agent !== "main" && (action === "bo-nhap" || action === "gui-nhap")) {
    if (!laAgentCoCua(agent)) return NextResponse.json({ ok: false, message: `Agent "${agent}" chưa mở cửa việc chờ duyệt.` }, { status: 400 });
    if (action === "bo-nhap") {
      const kq = await boQuaQuaAgent(agent, email, chuoi(body.id));
      if (!kq.ok) return NextResponse.json({ ok: false, message: kq.loi }, { status: 400 });
      return NextResponse.json(await goiDuLieu(email));
    }
    const giaoCho = chuoi(body.giaoCho);
    if (!giaoCho) return NextResponse.json({ ok: false, message: "Chưa chọn người hoặc đơn vị nhận." }, { status: 400 });
    const kq = await giaoQuaAgent(agent, email, {
      id: chuoi(body.id),
      giaoCho,
      tenNhan: chuoi(body.tenNhan),
      ten: co("ten") ? chuoi(body.ten) : undefined,
      ketQua: co("ketQua") ? chuoi(body.ketQua) : undefined,
      han: co("han") ? chuoi(body.han) : undefined,
      maDuAn: co("maDuAn") ? chuoi(body.maDuAn) : undefined,
      dinhKem: Array.isArray(body.dinhKem) ? body.dinhKem.filter((x): x is string => typeof x === "string") : [],
    });
    if (!kq.ok) return NextResponse.json({ ok: false, message: kq.loi }, { status: 400 });
    return NextResponse.json({ ...(await goiDuLieu(email)), maViec: kq.maViec, tenNhan: chuoi(body.tenNhan) });
  }

  if (action === "bo-nhap") {
    if (!boNhapCuaToi(chuoi(body.id), email)) {
      return NextResponse.json({ ok: false, message: "Không tìm thấy nháp (có thể đã gửi hoặc đã bỏ)." }, { status: 404 });
    }
    return NextResponse.json(await goiDuLieu(email));
  }

  if (action === "gui-nhap" || action === "giao-tai-cho") {
    const giaoCho = chuoi(body.giaoCho);
    if (!giaoCho) return NextResponse.json({ ok: false, message: "Chưa chọn người hoặc đơn vị nhận." }, { status: 400 });
    let ten = chuoi(body.ten);
    let ketQua = chuoi(body.ketQua);
    let maDuAn = chuoi(body.maDuAn);
    let han = hanIso(chuoi(body.han));
    let canCu = "";
    const nhapId = action === "gui-nhap" ? chuoi(body.id) : "";
    if (nhapId) {
      const n = nhapCuaToi(email).find((x) => x.id === nhapId);
      if (!n) return NextResponse.json({ ok: false, message: "Không tìm thấy nháp (có thể đã gửi hoặc đã bỏ)." }, { status: 404 });
      // Ô Sửa gửi đủ trường → người thắng; nút Gửi thẳng → lấy từ nháp
      if (!co("ten")) ten = n.ten;
      if (!co("ketQua")) ketQua = ketQuaMacDinhNhap(n);
      if (!co("maDuAn")) maDuAn = n.maDuAn;
      if (!co("han")) han = hanIso(n.han);
      canCu = ketQuaMacDinhNhap(n);
    }
    if (!ten) return NextResponse.json({ ok: false, message: "Chưa có nội dung việc." }, { status: 400 });
    const dinhKem = Array.isArray(body.dinhKem) ? body.dinhKem.filter((x): x is string => typeof x === "string") : [];
    const kq = await giaoSangCongViec({
      email,
      maDuAn,
      ten,
      han,
      giaoCho,
      canCu,
      ketQua,
      dinhKem,
      nguon: nhapId ? "màn Việc của tôi (nháp AI Main soạn)" : "Bảng điều hành Main",
      khongAi: !nhapId,
    });
    if (!kq.ok) return NextResponse.json({ ok: false, message: kq.loi }, { status: 400 });
    if (nhapId) daGiaoNhapCuaToi(nhapId, email, kq.maViec ?? null);
    return NextResponse.json({ ...(await goiDuLieu(email)), maViec: kq.maViec, tenNhan: chuoi(body.tenNhan) });
  }

  return NextResponse.json({ ok: false, message: `Hành động "${action}" không hỗ trợ.` }, { status: 400 });
}
