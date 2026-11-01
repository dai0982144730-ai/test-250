package vn.scigroup.congviec

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Cấu hình + trạng thái lưu trong bộ nhớ riêng của app (người khác / app khác không đọc được). */
object Cfg {
    private fun p(c: Context) = c.getSharedPreferences("sci", Context.MODE_PRIVATE)

    fun server(c: Context): String = p(c).getString("server", "") ?: ""
    fun cookie(c: Context): String = p(c).getString("cookie", "") ?: ""
    fun email(c: Context): String = p(c).getString("email", "") ?: ""
    fun ten(c: Context): String = p(c).getString("ten", "") ?: ""
    fun dangNhap(c: Context): Boolean = cookie(c).isNotEmpty() && server(c).isNotEmpty()

    fun luuPhien(c: Context, server: String, email: String, ten: String, cookie: String) {
        p(c).edit().putString("server", server).putString("email", email).putString("ten", ten).putString("cookie", cookie)
            .putLong("tin_cuoi", -1L).apply()
    }

    // ---- Mật khẩu nhớ để TỰ đăng nhập lại khi phiên 8 giờ của máy chủ hết (Mr. Đại chốt 30/10/2026: chỉ đăng nhập một lần) ----
    // Mã hoá AES-GCM, khoá nằm trong Android Keystore của điện thoại (không xuất ra được); chỉ app này giải mã được.
    private const val KHOA_MK = "sci_mk_v1"
    private fun khoaMk(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(KHOA_MK, null) as? SecretKey)?.let { return it }
        val g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        g.init(KeyGenParameterSpec.Builder(KHOA_MK, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
        return g.generateKey()
    }
    private fun maHoa(c: Context, ten: String, mk: String) {
        try {
            val ci = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, khoaMk()) }
            p(c).edit().putString(ten, Base64.encodeToString(ci.iv + ci.doFinal(mk.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)).apply()
        } catch (_: Exception) { /* máy không mã hoá được: không nhớ, vẫn đăng nhập bình thường */ }
    }
    private fun giaiMa(c: Context, ten: String): String? {
        val s = p(c).getString(ten, null) ?: return null
        return try {
            val b = Base64.decode(s, Base64.NO_WRAP)
            val ci = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, khoaMk(), GCMParameterSpec(128, b, 0, 12)) }
            String(ci.doFinal(b, 12, b.size - 12), Charsets.UTF_8)
        } catch (_: Exception) { null }
    }
    fun luuMk(c: Context, mk: String) = maHoa(c, "mk", mk)
    /** null = chưa nhớ, hoặc không giải mã được (vd máy khôi phục từ bản sao lưu — khoá Keystore không theo sang) */
    fun mk(c: Context): String? = giaiMa(c, "mk")
    fun xoaMk(c: Context) { p(c).edit().remove("mk").apply() }

    // ---- Phiên THỨ HAI: trợ lý AI của Main (cổng 3010) — sổ người dùng + cookie riêng của Main (bản 3004, duyệt 01/11/2026) ----
    fun serverMain(c: Context): String = p(c).getString("main_server", "") ?: ""
    fun cookieMain(c: Context): String = p(c).getString("main_cookie", "") ?: ""
    fun emailMain(c: Context): String = p(c).getString("main_email", "") ?: ""
    fun luuPhienMain(c: Context, server: String, email: String, cookie: String) {
        p(c).edit().putString("main_server", server).putString("main_email", email).putString("main_cookie", cookie).apply()
    }
    fun luuMkMain(c: Context, mk: String) = maHoa(c, "main_mk", mk)
    fun mkMain(c: Context): String? = giaiMa(c, "main_mk")
    /** Hết phiên Main: bỏ cookie, nhớ địa chỉ + email để đăng nhập lại nhanh */
    fun xoaPhienMain(c: Context) { p(c).edit().remove("main_cookie").apply() }
    /** Bấm «Thoát trợ lý Main» hoặc Đăng xuất app: quên cả mật khẩu Main */
    fun quenMain(c: Context) { p(c).edit().remove("main_cookie").remove("main_mk").apply() }

    /** Hết phiên / đăng xuất: bỏ cookie nhưng nhớ địa chỉ máy chủ + email để đăng nhập lại cho nhanh (mật khẩu nhớ thì giữ, trừ khi bấm Đăng xuất) */
    fun xoaPhien(c: Context) {
        p(c).edit().remove("cookie").remove("hop").remove("hop_da_biet").putInt("so", 0).putInt("so_moi", 0).apply()
    }

    fun so(c: Context): Int = p(c).getInt("so", 0)
    fun soMoi(c: Context): Int = p(c).getInt("so_moi", 0)
    fun luuSo(c: Context, so: Int, moi: Int) { p(c).edit().putInt("so", so).putInt("so_moi", moi).apply() }

    /** Danh sách cuộc họp lần hỏi gần nhất (mảng JSON) — dùng để vẽ thông báo cố định và đặt báo thức khi chưa có mạng */
    fun hop(c: Context): String = p(c).getString("hop", "[]") ?: "[]"
    fun luuHop(c: Context, json: String) { p(c).edit().putString("hop", json).apply() }

    /** Mã thông báo lớn nhất đã báo; -1 = chưa báo lần nào (lần đầu chỉ ghi mốc, không báo dồn cả đống tin cũ) */
    fun tinCuoi(c: Context): Long = p(c).getLong("tin_cuoi", -1L)
    fun luuTinCuoi(c: Context, v: Long) { p(c).edit().putLong("tin_cuoi", v).apply() }

    /** Mã các thông báo đã đưa lên khay — để gỡ khi tin đã đọc ở nơi khác */
    fun tinDaBao(c: Context): Set<String> = p(c).getStringSet("tin_da_bao", emptySet()) ?: emptySet()
    fun luuTinDaBao(c: Context, s: Set<String>) { p(c).edit().putStringSet("tin_da_bao", s.sortedBy { it.toLongOrNull() ?: 0L }.takeLast(120).toSet()).apply() }

    fun nhipCuoi(c: Context): Long = p(c).getLong("nhip_cuoi", 0L)
    fun luuNhip(c: Context, ms: Long) { p(c).edit().putLong("nhip_cuoi", ms).apply() }

    /** Mã các cuộc họp đã thấy ở lần hỏi trước; null = chưa có lần nào (lần đầu chỉ ghi, không báo dồn) */
    fun hopDaBiet(c: Context): Set<String>? = p(c).getStringSet("hop_da_biet", null)
    fun luuHopDaBiet(c: Context, s: Set<String>) { p(c).edit().putStringSet("hop_da_biet", s).apply() }

    /** Các mã báo thức họp đang đặt (để huỷ trước khi đặt lại) */
    fun maBaoThuc(c: Context): Set<String> = p(c).getStringSet("ma_bao_thuc", emptySet()) ?: emptySet()
    fun luuMaBaoThuc(c: Context, s: Set<String>) { p(c).edit().putStringSet("ma_bao_thuc", s).apply() }
}
