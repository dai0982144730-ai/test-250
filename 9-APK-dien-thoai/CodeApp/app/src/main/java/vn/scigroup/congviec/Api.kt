package vn.scigroup.congviec

import android.content.Context
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import java.time.format.DateTimeFormatter

/** Gọi API của agent Công việc. Cookie phiên nhận theo BẤT KỲ TÊN nào máy chủ trả (3004: sci_congviec_session · live cũ hơn: sci_session). */
object Api {
    class LoiDangNhap : Exception("Phiên đã hết hạn")
    class LoiMang(m: String) : Exception(m)
    data class Kq(val ma: Int, val noiDung: String)

    /** Chạy một việc cần phiên; gặp 401 thì tự đăng nhập lại bằng mật khẩu đã nhớ rồi chạy lại ĐÚNG MỘT lần. Không đăng nhập lại được thì ném lỗi cũ (hiện «Cần đăng nhập lại»). */
    fun <T> voiPhien(c: Context, f: () -> T): T {
        val cu = Cfg.cookie(c)
        try { return f() } catch (e: LoiDangNhap) {
            if (lamLaiPhien(c, cu)) return f()
            throw e
        }
    }

    @Volatile private var maDangNhapCuoi = 0

    /** true = đã có phiên mới · false = không đăng nhập lại được (chưa nhớ mật khẩu / sai mật khẩu) · ném LoiMang nếu chỉ là mất mạng / máy chủ lỗi tạm */
    @Synchronized
    private fun lamLaiPhien(c: Context, cookieCu: String): Boolean {
        val nay = Cfg.cookie(c)
        if (nay.isNotEmpty() && nay != cookieCu) return true // luồng khác vừa đăng nhập lại rồi
        val mk = Cfg.mk(c) ?: return false
        val sv = Cfg.server(c); val em = Cfg.email(c)
        if (sv.isEmpty() || em.isEmpty()) return false
        val tinCuoi = Cfg.tinCuoi(c) // luuPhien đặt lại về -1 (lần đầu chỉ ghi mốc) — tự đăng nhập lại thì KHÔNG được bỏ sót tin mới
        val loi = dangNhap(c, sv, em, mk) ?: run {
            Cfg.luuTinCuoi(c, tinCuoi)
            Nhat.ghi(c, "phiên hết hạn → tự đăng nhập lại ok")
            return true
        }
        if (maDangNhapCuoi in intArrayOf(400, 401, 403)) { // máy chủ từ chối mật khẩu (đã đổi?): quên mật khẩu nhớ, chờ người đăng nhập
            Nhat.ghi(c, "tự đăng nhập lại bị từ chối ($maDangNhapCuoi): $loi")
            Cfg.xoaMk(c)
            return false
        }
        Nhat.ghi(c, "tự đăng nhập lại chưa được (mạng/máy chủ): $loi")
        throw LoiMang(loi)
    }

    fun goi(c: Context, method: String, path: String, body: String? = null): Kq = voiPhien(c) { goiMot(c, method, path, body) }

    private fun goiMot(c: Context, method: String, path: String, body: String?): Kq {
        val h = URL(Cfg.server(c).trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            h.requestMethod = method
            h.connectTimeout = 10_000
            h.readTimeout = 15_000
            h.setRequestProperty("Cookie", Cfg.cookie(c))
            h.setRequestProperty("Accept", "application/json")
            if (body != null) {
                h.doOutput = true
                h.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                h.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val ma = h.responseCode
            val st = if (ma >= 400) h.errorStream else h.inputStream
            val txt = st?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (ma == 401) throw LoiDangNhap()
            return Kq(ma, txt)
        } catch (e: IOException) {
            throw LoiMang("Không kết nối được máy chủ")
        } finally {
            h.disconnect()
        }
    }

    /** Gom các dòng Set-Cookie thành «tên=giá trị; tên=giá trị». Bỏ cookie rỗng / hết hạn / bị xoá (Max-Age=0). */
    fun gomCookie(ds: List<String>?): String {
        val giu = LinkedHashMap<String, String>()
        for (s in ds ?: emptyList()) {
            val phan = s.split(";")
            val cap = phan[0]
            val i = cap.indexOf('=')
            if (i < 1) continue
            val ten = cap.substring(0, i).trim()
            val gt = cap.substring(i + 1).trim()
            var het = false
            for (x in phan.drop(1)) {
                val t = x.trim().lowercase()
                if (t.replace(" ", "") == "max-age=0") het = true
                if (t.startsWith("expires=")) {
                    try {
                        val d = java.time.ZonedDateTime.parse(x.trim().substring(8).trim(), DateTimeFormatter.RFC_1123_DATE_TIME)
                        if (d.toInstant().isBefore(Instant.now())) het = true
                    } catch (_: Exception) { /* định dạng lạ: bỏ qua */ }
                }
            }
            if (gt.isEmpty() || het) giu.remove(ten) else giu[ten] = gt
        }
        return giu.entries.joinToString("; ") { it.key + "=" + it.value }
    }

    /** null = đăng nhập được; ngược lại là câu báo lỗi tiếng Việt */
    fun dangNhap(c: Context, server: String, email: String, mk: String): String? {
        val goc = server.trim().trimEnd('/')
        if (!Regex("^https?://[^/\\s]+$").matches(goc)) return "Địa chỉ máy chủ phải dạng http://… hoặc https://…"
        if (email.isBlank() || mk.isEmpty()) return "Nhập email và mật khẩu"
        val h = URL("$goc/api/auth/login").openConnection() as HttpURLConnection
        try {
            h.requestMethod = "POST"
            h.connectTimeout = 12_000
            h.readTimeout = 15_000
            h.doOutput = true
            h.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            val b = JSONObject().put("email", email.trim()).put("mat_khau", mk).toString()
            h.outputStream.use { it.write(b.toByteArray(Charsets.UTF_8)) }
            maDangNhapCuoi = 0
            val ma = h.responseCode
            maDangNhapCuoi = ma
            val txt = (if (ma >= 400) h.errorStream else h.inputStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            val j = try { JSONObject(txt) } catch (_: Exception) { JSONObject() }
            if (ma !in 200..299) return j.optString("loi").ifEmpty { "Đăng nhập không được ($ma)" }
            val ds = h.headerFields["Set-Cookie"] ?: h.headerFields["set-cookie"]
            val ck = gomCookie(ds)
            Nhat.ghi(c, "đăng nhập ok · cookie máy chủ trả: " + (ds?.joinToString(", ") { it.substringBefore('=') } ?: "(không có)"))
            if (ck.isEmpty()) return "Máy chủ không trả phiên đăng nhập (không có cookie hợp lệ)"
            val ten = j.optJSONObject("nguoi_dung")?.optString("ten").orEmpty().ifEmpty { email.trim() }
            Cfg.luuPhien(c, goc, email.trim(), ten, ck)
            Cfg.luuMk(c, mk) // nhớ để phiên 8 giờ hết thì tự đăng nhập lại
            return null
        } catch (e: IOException) {
            return "Không kết nối được máy chủ $goc"
        } finally {
            h.disconnect()
        }
    }
}
