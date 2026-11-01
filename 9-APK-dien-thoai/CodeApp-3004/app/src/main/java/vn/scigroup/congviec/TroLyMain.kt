package vn.scigroup.congviec

import android.content.Context
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

/**
 * Trợ lý AI của agent Main (cổng 3010) — CHỈ có ở bản «SCI Công việc 3004» (Mr. Đại duyệt 01/11/2026, câu 2A).
 * Main có sổ người dùng + cookie RIÊNG (`sci_session`, 8 giờ) nên app giữ phiên thứ hai, tách khỏi phiên 3004 (`Cfg`).
 * Hợp đồng API: main-3010/src/lib/ai/chat-types.ts (đầu tệp). Lỗi Main trả `{ ok:false, message }` (3004 trả `{ loi }`).
 */
object TroLyMain {
    class HetPhien : Exception("Phiên trợ lý Main đã hết hạn")

    /** Một lượt chat: Main gọi AI nhiều vòng + hỏi agent khác → chờ lâu (Main cho mỗi lần hỏi chéo 150 giây). */
    private const val CHO_CHAT_MS = 300_000
    private const val CHO_THUONG_MS = 20_000

    /**
     * Mặc định: cùng máy với địa chỉ 3004, đổi cổng thành 3010 — CHỈ khi 3004 là máy trong mạng nội bộ
     * (http + IP riêng / localhost / tên .local). Tên miền công khai (vd https://congviec.scigroup.vn) thì
     * «:3010» không có thật → để trống cho người dùng tự nhập (kiểm độc lập AP-05, 01/11/2026).
     */
    fun diaChiGoiY(c: Context): String {
        val sv = Cfg.server(c).trim().trimEnd('/')
        val m = Regex("^http://([^/:]+)(:\\d+)?$").find(sv) ?: return ""
        val host = m.groupValues[1].lowercase()
        val noiBo = host == "localhost" || host.endsWith(".local") ||
            Regex("^(127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.)").containsMatchIn(host)
        return if (noiBo) "http://$host:3010" else ""
    }

    /** Các cửa Main mà app được gọi: chat (+ phiên, tin, xác nhận) và danh sách dự án. Siết bằng mẫu đầy đủ, không startsWith (AP-04). */
    private val DUONG_DUOC_GOI = Regex("^/api/(ai/chat(/(sessions|messages|xac-nhan))?|projects)(\\?[^/#\\\\]*)?$")
    fun duongDuocGoi(method: String, path: String): Boolean =
        (method == "GET" || method == "POST") && !path.contains("..") && DUONG_DUOC_GOI.matches(path)

    private fun docLoi(txt: String, ma: Int): String {
        val j = try { JSONObject(txt) } catch (_: Exception) { null }
        return j?.optString("message").orEmpty().ifEmpty { j?.optString("loi").orEmpty() }.ifEmpty { "Main trả lỗi $ma" }
    }

    /** null = đăng nhập được; ngược lại là câu báo lỗi. mk rỗng = thử mật khẩu SCI Công việc đã nhớ (nhiều người dùng chung một mật khẩu). */
    fun dangNhap(c: Context, server: String, email: String, mkNhap: String): String? {
        val goc = server.trim().trimEnd('/')
        if (!Regex("^https?://[^/\\s]+$").matches(goc)) return "Địa chỉ Main phải dạng http://… hoặc https://…"
        // Mật khẩu 3004 đã nhớ CHỈ gửi sang Main nằm cùng máy với 3004 — không gửi tới địa chỉ lạ người gõ nhầm
        val cungMay = try { URL(goc).host == URL(Cfg.server(c)).host } catch (_: Exception) { false }
        val mk = mkNhap.ifEmpty { if (cungMay) Cfg.mk(c) ?: "" else "" }
        if (email.isBlank()) return "Nhập email"
        if (mk.isEmpty()) return if (mkNhap.isEmpty() && !cungMay) "Main khác máy với SCI Công việc — nhập mật khẩu tài khoản Main" else "Nhập mật khẩu tài khoản Main"
        val h = URL("$goc/api/auth/login").openConnection() as HttpURLConnection
        try {
            h.requestMethod = "POST"
            h.instanceFollowRedirects = false
            h.connectTimeout = 12_000
            h.readTimeout = CHO_THUONG_MS
            h.doOutput = true
            h.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            // Main đọc { email, password } (khác 3004 đọc mat_khau)
            h.outputStream.use { it.write(JSONObject().put("email", email.trim()).put("password", mk).toString().toByteArray(Charsets.UTF_8)) }
            val ma = h.responseCode
            val txt = (if (ma >= 400) h.errorStream else h.inputStream)?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (ma !in 200..299) {
                if (ma == 401 && mkNhap.isEmpty()) return "Mật khẩu SCI Công việc không dùng được cho Main — nhập mật khẩu tài khoản Main"
                return docLoi(txt, ma)
            }
            val ck = Api.gomCookie(h.headerFields["Set-Cookie"] ?: h.headerFields["set-cookie"])
            if (ck.isEmpty()) return "Main không trả phiên đăng nhập (không có cookie)"
            Cfg.luuPhienMain(c, goc, email.trim(), ck)
            Cfg.luuMkMain(c, mk)
            Nhat.ghi(c, "trợ lý Main: đăng nhập ok")
            return null
        } catch (e: IOException) {
            return "Không kết nối được Main $goc — Main có đang chạy và mở cổng 3010 trên tường lửa không?"
        } finally {
            h.disconnect()
        }
    }

    /** Gọi một API của Main. Hết phiên thì tự đăng nhập lại bằng mật khẩu đã nhớ rồi gọi lại ĐÚNG MỘT lần. */
    fun goi(c: Context, method: String, path: String, body: String?): Api.Kq {
        try { return goiMot(c, method, path, body) } catch (e: HetPhien) {
            val mk = Cfg.mkMain(c)
            val sv = Cfg.serverMain(c)
            val em = Cfg.emailMain(c)
            if (mk == null || sv.isEmpty() || em.isEmpty()) { Cfg.xoaPhienMain(c); throw e }
            val loi = dangNhap(c, sv, em, mk)
            if (loi != null) { Nhat.ghi(c, "trợ lý Main: tự đăng nhập lại chưa được: $loi"); Cfg.xoaPhienMain(c); throw e }
            return goiMot(c, method, path, body)
        }
    }

    private fun goiMot(c: Context, method: String, path: String, body: String?): Api.Kq {
        val sv = Cfg.serverMain(c)
        if (sv.isEmpty() || Cfg.cookieMain(c).isEmpty()) throw HetPhien()
        val h = URL(sv.trimEnd('/') + path).openConnection() as HttpURLConnection
        try {
            h.requestMethod = method
            // Main hết phiên thì middleware CHUYỂN HƯỚNG sang /login (không trả 401) → tự đọc mã 3xx
            h.instanceFollowRedirects = false
            h.connectTimeout = 10_000
            h.readTimeout = if (path.startsWith("/api/ai/chat") && method == "POST") CHO_CHAT_MS else CHO_THUONG_MS
            h.setRequestProperty("Cookie", Cfg.cookieMain(c))
            h.setRequestProperty("Accept", "application/json")
            if (body != null) {
                h.doOutput = true
                h.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                h.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            }
            val ma = h.responseCode
            if (ma == 401 || (ma in 300..399 && (h.getHeaderField("Location") ?: "").contains("/login"))) throw HetPhien()
            val st = if (ma >= 400) h.errorStream else h.inputStream
            val txt = st?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            return Api.Kq(ma, txt)
        } catch (e: java.net.SocketTimeoutException) {
            throw Api.LoiMang("Trợ lý Main chưa trả lời sau ${h.readTimeout / 1000} giây")
        } catch (e: IOException) {
            throw Api.LoiMang("Không kết nối được Main")
        } finally {
            h.disconnect()
        }
    }
}
