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
        // không phân biệt hoa thường: bàn phím điện thoại hay tự viết hoa chữ đầu («Http://…»)
        val m = Regex("^http://([^/:]+)(:\\d+)?$", RegexOption.IGNORE_CASE).find(sv) ?: return ""
        val host = m.groupValues[1].lowercase()
        val noiBo = host == "localhost" || host.endsWith(".local") ||
            Regex("^(127\\.|10\\.|192\\.168\\.|172\\.(1[6-9]|2\\d|3[01])\\.)").containsMatchIn(host)
        return if (noiBo) "http://$host:3010" else ""
    }

    /** Các cửa Main mà app được gọi: chat (+ phiên, tin, xác nhận) và danh sách dự án. Siết bằng mẫu đầy đủ, không startsWith (AP-04). */
    private val DUONG_DUOC_GOI = Regex("^/api/(ai/chat(/(sessions|messages|xac-nhan))?|projects)(\\?[^/#\\\\]*)?$")
    fun duongDuocGoi(method: String, path: String): Boolean =
        (method == "GET" || method == "POST") && !path.contains("..") && DUONG_DUOC_GOI.matches(path)

    /** Địa chỉ Main nên dùng: đã lưu (nếu không phải chính địa chỉ 3004 gõ nhầm), không thì gợi ý cùng máy cổng 3010. */
    fun diaChiNen(c: Context): String {
        val luu = Cfg.serverMain(c)
        return if (luu.isNotEmpty() && !cungDiaChi(luu, Cfg.server(c))) luu else diaChiGoiY(c)
    }

    /** Đăng nhập một lần: tài khoản + mật khẩu SCI Công việc đã nhớ → Main. null = được; còn lại là câu báo lỗi để hiện ô nhập tay. */
    fun tuDangNhap(c: Context): String? {
        val sv = diaChiNen(c)
        if (sv.isEmpty()) return "Chưa biết địa chỉ Main (SCI Công việc không chạy trong mạng nội bộ) — nhập địa chỉ Main ở ô dưới"
        if (Cfg.mk(c) == null) return "Chưa có mật khẩu SCI Công việc đã nhớ — nhập mật khẩu ở ô dưới"
        return dangNhap(c, sv, Cfg.email(c), "")
    }

    /** Hai tên máy chỉ cùng một máy: giống chữ, cả hai là máy này (localhost / 127.x / ::1), hoặc (phân giải=true, chỉ gọi ở luồng nền) cùng địa chỉ IP. */
    private val NOI_TAI = Regex("^(localhost|127\\.\\d+\\.\\d+\\.\\d+|\\[?::1]?)$", RegexOption.IGNORE_CASE)
    private fun cungMayChu(h1: String, h2: String, phanGiai: Boolean): Boolean {
        if (h1.equals(h2, true)) return true
        if (NOI_TAI.matches(h1) && NOI_TAI.matches(h2)) return true
        if (!phanGiai) return false
        // Kiểm lại AR-01: chỉ so IP RIÊNG / máy này. IP công cộng thì nhiều tên miền dùng chung một máy chủ (đo: congviec, tiendo,
        // phaply.scigroup.vn cùng 103.90.224.140) → không coi là cùng máy, chỉ cùng máy khi hai tên giống chữ (đã xét ở trên)
        val rieng = { a: java.net.InetAddress -> a.isSiteLocalAddress || a.isLoopbackAddress || a.isLinkLocalAddress }
        return try {
            val x = java.net.InetAddress.getAllByName(h1).filter(rieng).map { it.hostAddress }.toSet()
            val y = java.net.InetAddress.getAllByName(h2).filter(rieng).map { it.hostAddress }.toSet()
            x.intersect(y).isNotEmpty()
        } catch (_: Exception) { false }
    }
    /** Hai địa chỉ trỏ cùng một máy + cùng cổng (cổng mặc định http 80 / https 443). Kiểm độc lập AQ-02: không chỉ so chuỗi tên máy. */
    fun cungDiaChi(a: String, b: String, phanGiai: Boolean = false): Boolean = try {
        val x = URL(a.trim()); val y = URL(b.trim())
        (if (x.port < 0) x.defaultPort else x.port) == (if (y.port < 0) y.defaultPort else y.port) && cungMayChu(x.host, y.host, phanGiai)
    } catch (_: Exception) { false }

    private fun docLoi(txt: String, ma: Int): String {
        val j = try { JSONObject(txt) } catch (_: Exception) { null }
        return j?.optString("message").orEmpty().ifEmpty { j?.optString("loi").orEmpty() }.ifEmpty { "Main trả lỗi $ma" }
    }

    /** null = đăng nhập được; ngược lại là câu báo lỗi. mk rỗng = thử mật khẩu SCI Công việc đã nhớ (nhiều người dùng chung một mật khẩu). */
    fun dangNhap(c: Context, server: String, email: String, mkNhap: String): String? {
        val goc = server.trim().trimEnd('/')
        if (!Regex("^https?://[^/\\s]+$", RegexOption.IGNORE_CASE).matches(goc)) return "Địa chỉ Main phải dạng http://… hoặc https://…"
        // Gõ nhầm địa chỉ SCI Công việc 3004 vào ô Main: 3004 cũng có cửa đăng nhập nên sẽ «đăng nhập được» rồi hỏi nhầm máy (anh Đại gặp 01/11/2026)
        if (cungDiaChi(goc, Cfg.server(c), phanGiai = true)) return "Đây là địa chỉ SCI Công việc 3004, không phải Main. Trợ lý Main chạy ở cổng khác, thường là 3010" +
            diaChiGoiY(c).let { if (it.isEmpty()) "" else " — thử $it" }
        // Mật khẩu 3004 đã nhớ CHỈ gửi sang Main nằm cùng máy VÀ cùng giao thức với 3004 (kiểm độc lập AQ-03: 3004 https mà Main gõ http
        // cùng tên miền thì mật khẩu đi không mã hoá) — không gửi tới địa chỉ lạ người gõ nhầm
        val cungMay = try {
            val m = URL(goc); val s = URL(Cfg.server(c))
            m.protocol.equals(s.protocol, true) && cungMayChu(m.host, s.host, true)
        } catch (_: Exception) { false }
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
