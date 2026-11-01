package vn.scigroup.congviec

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * XEM TỆP NGAY TRONG APP (không lưu vào Tải xuống): PDF vẽ bằng PdfRenderer của Android, ảnh trả về dạng data URL,
 * docx / xlsx máy chủ đã đổi sẵn HTML (/api/dinh-kem/<id>/xem). Tệp PDF chỉ nằm tạm trong bộ nhớ riêng của app (cache/xem).
 */
object Xem {
    private var pdf: PdfRenderer? = null
    private var fd: ParcelFileDescriptor? = null
    private const val GIOI_HAN_ANH = 15L * 1024 * 1024

    private fun mo(c: Context, tepId: String): HttpURLConnection {
        val h = URL(Cfg.server(c).trimEnd('/') + "/api/dinh-kem/" + URLEncoder.encode(tepId, "UTF-8")).openConnection() as HttpURLConnection
        h.connectTimeout = 15_000
        h.readTimeout = 120_000
        h.setRequestProperty("Cookie", Cfg.cookie(c))
        return h
    }

    private fun loiMay(h: HttpURLConnection, ma: Int): String {
        val txt = try { h.errorStream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "" } catch (_: Exception) { "" }
        val loi = try { JSONObject(txt).optString("loi", "") } catch (_: Exception) { "" }
        return loi.ifEmpty { "Không mở được tệp (lỗi $ma)" }
    }

    /** Tải PDF về cache riêng rồi mở bộ vẽ. Trả {ok, trang, ti:[cao/rộng mỗi trang]} */
    @Synchronized
    fun moPdf(c: Context, tepId: String): JSONObject {
        dongPdf()
        val h = mo(c, tepId)
        try {
            val ma = h.responseCode
            if (ma == 401) throw Api.LoiDangNhap()
            if (ma !in 200..299) return JSONObject().put("ok", false).put("loi", loiMay(h, ma))
            val dir = File(c.cacheDir, "xem").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() }
            val f = File(dir, "xem.pdf")
            f.outputStream().use { o -> h.inputStream.use { it.copyTo(o, 64 * 1024) } }
            fd = ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY)
            val r = PdfRenderer(fd!!)
            pdf = r
            val ti = JSONArray()
            for (i in 0 until r.pageCount) { r.openPage(i).use { p -> ti.put(p.height.toDouble() / p.width) } }
            return JSONObject().put("ok", true).put("trang", r.pageCount).put("ti", ti)
        } catch (e: java.io.IOException) {
            return JSONObject().put("ok", false).put("loi", "Không mở được: " + "mất kết nối mạng")
        } catch (e: SecurityException) {
            return JSONObject().put("ok", false).put("loi", "Tệp PDF có mật khẩu hoặc bị hỏng")
        } finally {
            h.disconnect()
        }
    }

    /** Vẽ một trang (0, 1, 2…) rộng rongPx điểm ảnh → data URL JPEG */
    @Synchronized
    fun trangPdf(n: Int, rongPx: Int): JSONObject {
        val r = pdf ?: return JSONObject().put("ok", false).put("loi", "Chưa mở tệp")
        if (n < 0 || n >= r.pageCount) return JSONObject().put("ok", false).put("loi", "Không có trang này")
        val rong = rongPx.coerceIn(200, 2400)
        r.openPage(n).use { p ->
            val cao = (rong.toLong() * p.height / p.width).toInt().coerceAtLeast(1)
            val bmp = Bitmap.createBitmap(rong, cao, Bitmap.Config.ARGB_8888)
            bmp.eraseColor(Color.WHITE)
            p.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            val o = ByteArrayOutputStream()
            bmp.compress(Bitmap.CompressFormat.JPEG, 85, o)
            bmp.recycle()
            return JSONObject().put("ok", true).put("u", "data:image/jpeg;base64," + Base64.encodeToString(o.toByteArray(), Base64.NO_WRAP))
        }
    }

    @Synchronized
    fun dongPdf() {
        try { pdf?.close() } catch (_: Exception) {}
        try { fd?.close() } catch (_: Exception) {}
        pdf = null
        fd = null
    }

    /** Ảnh → data URL (tối đa 15 MB) */
    fun anh(c: Context, tepId: String): JSONObject {
        val h = mo(c, tepId)
        try {
            val ma = h.responseCode
            if (ma == 401) throw Api.LoiDangNhap()
            if (ma !in 200..299) return JSONObject().put("ok", false).put("loi", loiMay(h, ma))
            if (h.contentLengthLong > GIOI_HAN_ANH) return JSONObject().put("ok", false).put("loi", "Ảnh quá lớn để xem nhanh (trên 15 MB)")
            val mime = (h.contentType ?: "image/jpeg").substringBefore(';')
            val b = h.inputStream.use { it.readBytes() }
            if (b.size > GIOI_HAN_ANH) return JSONObject().put("ok", false).put("loi", "Ảnh quá lớn để xem nhanh (trên 15 MB)")
            return JSONObject().put("ok", true).put("u", "data:$mime;base64," + Base64.encodeToString(b, Base64.NO_WRAP))
        } catch (e: java.io.IOException) {
            return JSONObject().put("ok", false).put("loi", "Không mở được: " + "mất kết nối mạng")
        } finally {
            h.disconnect()
        }
    }
}
