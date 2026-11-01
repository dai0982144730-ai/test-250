// API BÁO CÁO THÁNG — PLAN-MAIN-AGENT mục 2 · 7 (ngày 1 hằng tháng dựng nháp)
//
//   GET  /api/bao-cao-thang?nam=&thang=            → đọc bản nháp đã lưu
//   GET  /api/bao-cao-thang?nam=&thang=&khung=1    → chỉ dựng KHUNG, không hỏi
//                                                    agent nào (xem báo cáo
//                                                    này định lấy số ở đâu)
//   GET  /api/bao-cao-thang?danh_sach=1            → các kỳ đã có bản nháp
//   POST /api/bao-cao-thang  { thang, nam }        → đi hỏi, dựng và LƯU nháp
//
// Dựng nháp là lượt gọi NẶNG (fan-out tới 4 agent) nên chỉ vai quản lý được
// bấm; đọc thì ai đăng nhập cũng xem được.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/route-auth";
import { boLocMatCuaNguoi } from "@/lib/agent-mat-tren-main";
import { locBaoCaoThang, lyDoChanSoanNhanXet } from "@/lib/agent-mat-loc";
import { chayVoiNguoiGoiAi } from "@/lib/ai/moi-truong-ai";
import { dungBaoCaoThang, kyThangTruoc } from "@/lib/bao-cao-thang/dung";
import { danhSachBanNhap, docBanNhap, docBanTruoc, docCaiDatDau, giuBanTruoc, luuBanNhap, luuCaiDatDau } from "@/lib/bao-cao-thang/kho";
import { soanNhanXet } from "@/lib/bao-cao-thang/nhan-xet";
import { demO, soHaiBan, type BaoCaoThang, type SoHaiBan } from "@/lib/bao-cao-thang/model";
import { apDungSuaTay, DO_DAI_TOI_DA, kiemKhoaSua } from "@/lib/bao-cao-thang/sua-tay";
import { bocRouteTrang } from "@/lib/nhat-ky/so";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** So với bản trước của cùng kỳ (giữ lại mỗi lần làm lại) — không có bản trước thì null */
function soVoiBanTruoc(bc: BaoCaoThang): SoHaiBan | null {
  const truoc = docBanTruoc(bc.ky.nam, bc.ky.thang);
  return truoc && truoc.thoiDiemDung !== bc.thoiDiemDung ? soHaiBan(truoc, bc) : null;
}

function docKy(url: URL): { nam: number; thang: number } {
  const mac = kyThangTruoc();
  const nam = Number(url.searchParams.get("nam"));
  const thang = Number(url.searchParams.get("thang"));
  return {
    nam: Number.isInteger(nam) && nam >= 2000 && nam <= 2100 ? nam : mac.nam,
    thang: Number.isInteger(thang) && thang >= 1 && thang <= 12 ? thang : mac.thang,
  };
}

async function xuLyGET(request: Request) {
  const auth = await requireRole("xem");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  if (url.searchParams.get("danh_sach") === "1") {
    return NextResponse.json({ ok: true, ky: danhSachBanNhap() });
  }

  const { nam, thang } = docKy(url);
  // ⭐ 05/10 luật agent mật: ô / dòng / nhận xét có thông tin hợp đồng lọc theo người xem
  const loc = boLocMatCuaNguoi(auth.session.email, auth.session.role);

  if (url.searchParams.get("khung") === "1") {
    const bc = await dungBaoCaoThang({ thang, nam, chiDungKhung: true });
    return NextResponse.json({ ok: true, bc: locBaoCaoThang(bc, loc), dem: demO(bc), laKhung: true });
  }

  const { bc, lyDo } = docBanNhap(nam, thang);
  if (!bc) return NextResponse.json({ ok: false, message: lyDo, caiDatDau: docCaiDatDau() }, { status: 404 });
  return NextResponse.json({
    ok: true,
    bc: locBaoCaoThang(apDungSuaTay(bc), loc),
    dem: demO(bc),
    lyDoChanSoan: lyDoChanSoanNhanXet(bc, loc),
    caiDatDau: docCaiDatDau(),
    soVoiTruoc: soVoiBanTruoc(bc),
  });
}

async function xuLyPOST(request: Request) {
  const auth = await requireRole("ghi");
  if (!auth.ok) return auth.response;

  let than: {
    thang?: number;
    nam?: number;
    donViLap?: string;
    noiNhan?: string;
    nguoiKy?: string;
    /**
     * "soan-nhan-xet" = chạy bước 🤖 trên bản nháp ĐÃ LƯU, không hỏi lại 4 agent ·
     * "lam-lai" (13/10) = hỏi lại mọi agent RỒI soạn luôn 🤖, giữ bản cũ làm "bản trước" để so ·
     * "luu-dau" (13/10) = lưu ba ô đầu báo cáo (Đơn vị lập · Nơi nhận · Người ký)
     */
    hanhDong?: string;
    /** "sua-chu" (28/10): khoá chỗ sửa (lib/bao-cao-thang/sua-tay.ts) và chữ mới — rỗng = bỏ chữ sửa tay */
    khoa?: string;
    giaTri?: string;
  } = {};
  try {
    than = (await request.json()) as typeof than;
  } catch {
    than = {};
  }
  const mac = kyThangTruoc();
  const thang =
    Number.isInteger(than.thang) && than.thang! >= 1 && than.thang! <= 12 ? than.thang! : mac.thang;
  const nam = Number.isInteger(than.nam) && than.nam! >= 2000 ? than.nam! : mac.nam;
  const loc = boLocMatCuaNguoi(auth.session.email, auth.session.role);

  // ── 13/10: ba ô đầu báo cáo — khai một lần, lần làm lại sau tự điền ──
  if (than.hanhDong === "luu-dau") {
    const kq = luuCaiDatDau({ donViLap: than.donViLap, noiNhan: than.noiNhan, nguoiKy: than.nguoiKy });
    return NextResponse.json(
      { ok: kq.ok, message: kq.ok ? "Đã lưu — bấm Làm lại báo cáo để điền vào bản đang xem." : kq.loi, caiDatDau: kq.caiDat },
      { status: kq.ok ? 200 : 500 },
    );
  }

  // ── 28/10: sửa tay MỘT chỗ lời văn 🤖 (nhận xét đầu mục · ô 🤖). Chữ rỗng = bỏ chữ sửa tay, về chữ 🤖 ──
  if (than.hanhDong === "sua-chu") {
    const { bc: daCo, lyDo } = docBanNhap(nam, thang);
    if (!daCo) return NextResponse.json({ ok: false, message: `Chưa có bản nháp kỳ này để sửa. ${lyDo ?? ""}` }, { status: 404 });
    const khoa = typeof than.khoa === "string" ? than.khoa : "";
    const chu = typeof than.giaTri === "string" ? than.giaTri.replace(/\r\n?/g, "\n").trim() : "";
    const loiKhoa = kiemKhoaSua(daCo, khoa);
    if (loiKhoa || chu.length > DO_DAI_TOI_DA) {
      return NextResponse.json({ ok: false, message: loiKhoa ?? `Chữ dài quá ${DO_DAI_TOI_DA} ký tự.` }, { status: 400 });
    }
    const suaTay = { ...(daCo.suaTay ?? {}) };
    if (chu === "") delete suaTay[khoa];
    else suaTay[khoa] = chu;
    daCo.suaTay = suaTay;
    const luuLai = luuBanNhap(daCo);
    return NextResponse.json({
      ok: luuLai.ok,
      message: luuLai.ok ? (chu === "" ? "Đã bỏ chữ sửa tay." : "Đã lưu.") : `Không lưu được: ${(luuLai.loi ?? []).join(" · ")}`,
      bc: locBaoCaoThang(apDungSuaTay(daCo), loc),
      dem: demO(daCo),
    });
  }

  // ── Bước 🤖: soạn nhận xét trên bản nháp ĐÃ DỰNG ──────────────
  // Tách khỏi "Dựng bản nháp" cố ý: dựng nháp là đi hỏi agent (rẻ, nhanh, lặp
  // lại bao nhiêu lần cũng được); soạn nhận xét là tốn lượt LLM. Gộp làm một
  // thì mỗi lần bấm dựng lại đốt thêm một lượt mô hình mà chẳng ai cần.
  if (than.hanhDong === "soan-nhan-xet") {
    const { bc: daCo, lyDo } = docBanNhap(nam, thang);
    if (!daCo) {
      return NextResponse.json(
        { ok: false, message: `Chưa có bản nháp kỳ này để soạn nhận xét. ${lyDo ?? ""}` },
        { status: 404 },
      );
    }
    // ⭐ 05/10 luật agent mật: LLM đọc cả phần hợp đồng mọi dự án — người không thấy hết thì không cho đọc hộ
    const chan = lyDoChanSoanNhanXet(daCo, loc);
    if (chan) return NextResponse.json({ ok: false, message: chan }, { status: 403 });
    const kq = await chayVoiNguoiGoiAi(auth.session.email, () => soanNhanXet(daCo, auth.session.email));
    const luuLai = luuBanNhap(daCo);
    return NextResponse.json({
      ok: true,
      bc: locBaoCaoThang(apDungSuaTay(daCo), loc),
      dem: demO(daCo),
      daLuu: luuLai.ok,
      loiLuu: luuLai.loi,
      nhanXet: kq,
    });
  }

  // Giữ bản đang lưu làm "bản trước" để so sau khi làm lại (13/10)
  giuBanTruoc(nam, thang);
  // 28/10: chữ người đã sửa tay không bị «Làm lại» đè — mang sang bản mới
  const suaTayCu = docBanNhap(nam, thang).bc?.suaTay;
  const bc = await dungBaoCaoThang({
    thang,
    nam,
    donViLap: than.donViLap,
    noiNhan: than.noiNhan,
    nguoiLap: auth.session.name || auth.session.email,
  });
  if (suaTayCu && Object.keys(suaTayCu).length > 0) bc.suaTay = suaTayCu;
  let luu = luuBanNhap(bc);

  // "Làm lại báo cáo" = dựng xong soạn LUÔN phần 🤖 (Mr. Đại chốt 13/10). Người không được đọc hết phần agent mật
  // thì chỉ dựng, không soạn — lý do hiện ở nút 🤖.
  let nhanXet: Awaited<ReturnType<typeof soanNhanXet>> | undefined;
  if (than.hanhDong === "lam-lai" && lyDoChanSoanNhanXet(bc, loc) === null) {
    nhanXet = await chayVoiNguoiGoiAi(auth.session.email, () => soanNhanXet(bc, auth.session.email));
    luu = luuBanNhap(bc);
  }

  // Lưu hỏng KHÔNG được nuốt mất bản nháp vừa dựng — trả về luôn cho màn hình
  // hiện, kèm lý do không lưu được, để công sức hỏi 4 agent không mất trắng.
  return NextResponse.json({
    ok: true,
    bc: locBaoCaoThang(apDungSuaTay(bc), loc),
    dem: demO(bc),
    lyDoChanSoan: lyDoChanSoanNhanXet(bc, loc),
    daLuu: luu.ok,
    loiLuu: luu.loi,
    nhanXet,
    caiDatDau: docCaiDatDau(),
    soVoiTruoc: soVoiBanTruoc(bc),
  });
}

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const GET = bocRouteTrang("/api/bao-cao-thang", xuLyGET);

// ⭐ Khuôn sổ bản 2 (7.1): một lần gọi = MỘT chuỗi — mọi lượt hỏi agent khác chung mã chuỗi
export const POST = bocRouteTrang("/api/bao-cao-thang", xuLyPOST);
