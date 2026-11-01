package vn.scigroup.congviec

import android.content.Context
import org.json.JSONArray
import java.io.File
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

/** Nhật ký ngắn để chẩn đoán «bị lỡ thông báo» bằng SỐ (giờ, độ trễ, lỗi) — giữ 300 dòng cuối. */
object Nhat {
    private val gio = DateTimeFormatter.ofPattern("dd/MM HH:mm:ss")
    @Synchronized
    fun ghi(c: Context, s: String) {
        try {
            val f = File(c.filesDir, "nhat-ky.txt")
            val dong = (if (f.exists()) f.readLines() else emptyList()) + (ZonedDateTime.now(HopX.VN).format(gio) + "  " + s)
            f.writeText(dong.takeLast(300).joinToString("\n") + "\n")
        } catch (_: Exception) { /* không ghi được thì thôi, không làm hỏng việc chính */ }
    }
    fun doc(c: Context, n: Int): List<String> = try {
        val f = File(c.filesDir, "nhat-ky.txt")
        if (f.exists()) f.readLines().takeLast(n) else emptyList()
    } catch (_: Exception) { emptyList() }
}

data class Hop(val id: Long, val phong: String, val ngay: String, val tu: String, val den: String, val noiDung: String, val duongDan: String, val daXem: Boolean)

/** Cuộc họp: chép đúng logic dòng báo họp của web/PC (thuan.js). Giờ Việt Nam (luật 44). */
object HopX {
    val VN: ZoneId = ZoneId.of("Asia/Ho_Chi_Minh")
    const val PHUT_NHAC_TRUOC = 15L

    fun doc(json: String): List<Hop> {
        val out = ArrayList<Hop>()
        try {
            val a = JSONArray(json)
            for (i in 0 until a.length()) {
                val o = a.getJSONObject(i)
                out.add(Hop(o.optLong("id"), o.optString("phong"), o.optString("ngay"), o.optString("tu"), o.optString("den"), o.optString("noi_dung"), o.optString("duong_dan", ""), o.optBoolean("da_xem")))
            }
        } catch (_: Exception) { /* JSON hỏng → coi như không có họp */ }
        return out
    }

    fun tenPhong(id: String): String {
        val m = Regex("^p([0-9]+)$").find(id)
        return if (m != null) "Phòng họp " + m.groupValues[1] else id
    }

    fun batDau(h: Hop): Long = LocalDate.parse(h.ngay).atTime(LocalTime.parse(h.tu)).atZone(VN).toInstant().toEpochMilli()
    fun ketThuc(h: Hop): Long = LocalDate.parse(h.ngay).atTime(LocalTime.parse(h.den)).atZone(VN).toInstant().toEpochMilli()
    fun conHien(h: Hop, now: Long): Boolean = try { ketThuc(h) > now } catch (_: Exception) { false }

    /** «11:00 họp giao ban · Phòng họp 01» — hôm khác thì kèm «mai» / ngày; đang họp thì có «đang họp: » */
    fun chu(h: Hop, now: Long): String {
        val hn = ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(now), VN).toLocalDate()
        val d = LocalDate.parse(h.ngay)
        val ngay = when {
            d == hn -> ""
            d == hn.plusDays(1) -> "mai "
            else -> "%02d/%02d ".format(d.dayOfMonth, d.monthValue)
        }
        val dang = if (d == hn && batDau(h) <= now) "đang họp: " else ""
        return dang + ngay + h.tu + " họp " + h.noiDung + " · " + tenPhong(h.phong)
    }

    /** Cuộc họp gần nhất còn hiện (chưa kết thúc) */
    fun ganNhat(c: Context, now: Long): Hop? = doc(Cfg.hop(c)).filter { conHien(it, now) }.minByOrNull { batDau(it) }
}
