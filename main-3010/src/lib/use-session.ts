"use client";

// Hook client dùng chung cho Sidebar + Header: đọc user hiện tại từ cookie
// qua GET /api/auth/me (session HMAC thật, store data/users.json). Giữ nguyên
// shape trả về { role, name, email } để UI không đổi.
//
// SỬA 31/08 (đo trên /planning): 8–10 component cùng trang đều gọi hook này,
// mỗi cái tự fetch → 10 request /api/auth/me MỖI lần mở trang, dev server nghẽn
// 1,4–1,6s/request. Giờ CACHE Ở MỨC MODULE: cả trang chỉ fetch đúng 1 lần,
// các hook sau dùng chung promise/kết quả. Đăng nhập/đăng xuất đổi cookie →
// điều hướng cả trang nên cache tự làm mới, không cần invalidate thủ công.

import { useEffect, useState } from "react";
import type { Role } from "@/lib/auth";

export interface SessionUser {
  role: Role;
  name: string;
  email: string;
  /** "đơn vị · chức vụ" — dòng đầu menu tên người (Mr. Đại 04/10/2026); chưa khai thì không có */
  dongDau?: string;
}

let cached: SessionUser | null = null;
let inflight: Promise<SessionUser | null> | null = null;

function fetchSessionOnce(): Promise<SessionUser | null> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = fetch("/api/auth/me")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: (SessionUser & { ok: boolean }) | null) => {
      if (data && data.ok) {
        cached = { role: data.role, name: data.name, email: data.email, ...(data.dongDau ? { dongDau: data.dongDau } : {}) };
        return cached;
      }
      inflight = null; // chưa đăng nhập → lần mount sau thử lại
      return null;
    })
    .catch(() => {
      inflight = null; // lỗi mạng → không găm cache, lần sau thử lại
      return null;
    });
  return inflight;
}

export function useSessionUser(): SessionUser | null {
  const [user, setUser] = useState<SessionUser | null>(cached);

  useEffect(() => {
    let cancelled = false;
    void fetchSessionOnce().then((u) => {
      if (!cancelled && u) setUser(u);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
