// SỔ GÁC NGOÀI (J13) — `main.so_gac` đọc đúng sổ script ghi và dựng khoảng bảo trì
// 26/09: màn Sức khoẻ ở Main đã bỏ (bài tomTatGac bỏ theo); Agent quan sát đọc qua MCP.
import { describe, it, expect } from "vitest";
import {
  BIEN_SAU_MS,
  bocSo,
  congTuDiaChi,
  dungKhoangBaoTri,
  khoangCham,
} from "@/lib/quan-sat/gac-ngoai-thuan";

const SO = [
  '{"luc":"2026-09-23T01:00:00.000Z","cong":0,"ten":"Gác ngoài","su_kien":"khoi_dong","lan":0,"mo_ta":"bắt đầu"}',
  '{"luc":"2026-09-23T01:05:00.000Z","cong":3011,"ten":"Agent Base","su_kien":"bat_lai","lan":1,"mo_ta":"cổng chet"}',
  "{ dòng hỏng",
  '{"luc":"2026-09-23T01:08:00.000Z","cong":3011,"ten":"Agent Base","su_kien":"song_lai","lan":1,"mo_ta":"đã lên"}',
  '{"luc":"2026-09-23T02:00:00.000Z","cong":3011,"ten":"Agent Base","su_kien":"bat_lai","lan":1,"mo_ta":"lần sau"}',
].join("\n");

const tra = (c: number): string | null => ({ 3011: "base", 3010: "main", 3013: "phaply" })[c] ?? null;

describe("sổ gác — bóc sổ script", () => {
  it("bóc sổ bỏ đúng dòng hỏng, giữ 4 dòng tốt (kể cả dòng đầu có BOM)", () => {
    expect(bocSo("﻿" + SO)).toHaveLength(4);
  });

  it("cổng lấy từ địa chỉ danh bạ", () => {
    expect(congTuDiaChi("http://127.0.0.1:3014")).toBe(3014);
    expect(congTuDiaChi("https://tiendo.scigroup.vn")).toBe(443);
    expect(congTuDiaChi("khong-phai-url")).toBeNull();
  });
});

describe("sổ gác — khoảng bảo trì do code dựng", () => {
  it("bat_lai mở khoảng, song_lai đóng; khoảng chưa sống lại thì den null", () => {
    const k = dungKhoangBaoTri(bocSo(SO), tra);
    expect(k).toHaveLength(2);
    expect(k[0]).toMatchObject({
      cong: 3011,
      ma_agent: "base",
      tu: "2026-09-23T01:05:00.000Z",
      den: "2026-09-23T01:08:00.000Z",
      den_ca_bien: "2026-09-23T01:10:00.000Z",
      so_lan_bat_lai: 1,
      cat_boi_script_luc: null,
    });
    expect(k[1].den).toBeNull();
    expect(k[1].den_ca_bien).toBeNull();
    expect(BIEN_SAU_MS).toBe(120_000);
  });

  it("treo ngay trước bat_lai (≤5 phút) thì khoảng tính từ lúc treo; treo lẻ không mở khoảng", () => {
    const s = bocSo(
      [
        '{"luc":"2026-09-26T00:30:00.000Z","cong":3013,"ten":"PL","su_kien":"treo","lan":1,"mo_ta":""}',
        '{"luc":"2026-09-26T00:40:28.000Z","cong":3013,"ten":"PL","su_kien":"treo","lan":1,"mo_ta":""}',
        '{"luc":"2026-09-26T00:41:45.000Z","cong":3013,"ten":"PL","su_kien":"bat_lai","lan":1,"mo_ta":""}',
        '{"luc":"2026-09-26T00:43:48.000Z","cong":3013,"ten":"PL","su_kien":"song_lai","lan":1,"mo_ta":""}',
        '{"luc":"2026-09-26T02:22:05.000Z","cong":3013,"ten":"PL","su_kien":"treo","lan":1,"mo_ta":""}',
      ].join("\n"),
    );
    const k = dungKhoangBaoTri(s, tra);
    expect(k).toHaveLength(1);
    expect(k[0].tu).toBe("2026-09-26T00:40:28.000Z");
    expect(k[0].su_kien).toEqual(["treo", "bat_lai", "song_lai"]);
  });

  it("3004 đang dựng lại (26/10): dang_dung mở khoảng nhưng không tính lần bật lại; gác bật sau khi dựng xong mới đếm; song_lai đóng", () => {
    const s = bocSo(
      [
        '{"luc":"2026-10-26T08:34:59.000Z","cong":3004,"ten":"Agent công việc","su_kien":"dang_dung","lan":0,"mo_ta":""}',
        '{"luc":"2026-10-26T08:40:01.000Z","cong":3004,"ten":"Agent công việc","su_kien":"dung_xong","lan":0,"mo_ta":""}',
        '{"luc":"2026-10-26T08:40:02.000Z","cong":3004,"ten":"Agent công việc","su_kien":"bat_lai","lan":1,"mo_ta":""}',
        '{"luc":"2026-10-26T08:42:10.000Z","cong":3004,"ten":"Agent công việc","su_kien":"song_lai","lan":1,"mo_ta":""}',
        // phiên code tự bật 3004 sau khi dựng: gác chỉ thấy cổng sống lại, không có lần bật nào
        '{"luc":"2026-10-26T09:00:00.000Z","cong":3004,"ten":"Agent công việc","su_kien":"dang_dung","lan":0,"mo_ta":""}',
        '{"luc":"2026-10-26T09:06:00.000Z","cong":3004,"ten":"Agent công việc","su_kien":"song_lai","lan":0,"mo_ta":""}',
      ].join("\n"),
    );
    const k = dungKhoangBaoTri(s, (c) => (c === 3004 ? "base" : null));
    expect(k).toHaveLength(2);
    expect(k[0]).toMatchObject({ tu: "2026-10-26T08:34:59.000Z", den: "2026-10-26T08:42:10.000Z", so_lan_bat_lai: 1 });
    expect(k[0].su_kien).toEqual(["dang_dung", "bat_lai", "song_lai"]);
    expect(k[1]).toMatchObject({ tu: "2026-10-26T09:00:00.000Z", den: "2026-10-26T09:06:00.000Z", so_lan_bat_lai: 0 });
  });

  it("bật lại nhiều lần trong một khoảng thì đếm dồn; script khởi động lại thì cắt khoảng còn mở", () => {
    const s = bocSo(
      [
        '{"luc":"2026-09-26T10:00:00.000Z","cong":3010,"ten":"Main","su_kien":"bat_lai","lan":1,"mo_ta":""}',
        '{"luc":"2026-09-26T10:02:00.000Z","cong":3010,"ten":"Main","su_kien":"bat_lai","lan":2,"mo_ta":""}',
        '{"luc":"2026-09-26T10:05:00.000Z","cong":0,"ten":"Gác ngoài","su_kien":"khoi_dong","lan":0,"mo_ta":""}',
      ].join("\n"),
    );
    const k = dungKhoangBaoTri(s, tra);
    expect(k).toHaveLength(1);
    expect(k[0].so_lan_bat_lai).toBe(2);
    expect(k[0].den).toBeNull();
    expect(k[0].cat_boi_script_luc).toBe("2026-09-26T10:05:00.000Z");
    // khoảng bị cắt không "chạm" mãi mãi mọi khung sau đó
    expect(khoangCham(k[0], "2026-09-26T11:00:00.000Z", null)).toBe(false);
  });

  it("lọc khung: khoảng bắt đầu trước tu_luc nhưng còn trong biên sau vẫn chạm", () => {
    const [k] = dungKhoangBaoTri(bocSo(SO), tra);
    expect(khoangCham(k, "2026-09-23T01:09:30.000Z", null)).toBe(true); // trong 2 phút biên
    expect(khoangCham(k, "2026-09-23T01:10:01.000Z", null)).toBe(false);
    expect(khoangCham(k, null, "2026-09-23T01:04:59.000Z")).toBe(false);
  });
});
