package vn.scigroup.congviec

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Tệp đính kèm việc (📎): tải lên /api/dinh-kem từng tệp một (đúng như màn web 3004) và tải về để mở. Truyền thẳng luồng, không nạp cả tệp vào bộ nhớ. */
object Tep {
    class Meta(val ten: String, val byte: Long)

    fun meta(c: Context, uri: Uri): Meta {
        var ten = "tep"
        var size = -1L
        c.contentResolver.query(uri, null, null, null, null)?.use {
            if (it.moveToFirst()) {
                val i = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (i >= 0 && !it.isNull(i)) ten = it.getString(i)
                val j = it.getColumnIndex(OpenableColumns.SIZE)
                if (j >= 0 && !it.isNull(j)) size = it.getLong(j)
            }
        }
        return Meta(ten, size)
    }

    /** Một tệp lên máy chủ. Trả {ok, id, ten, kich_thuoc} hoặc {ok:false, ten, loi}. */
    fun taiLen(c: Context, uri: Uri, noi: String, m: Meta): JSONObject {
        val mime = c.contentResolver.getType(uri) ?: "application/octet-stream"
        val bd = "----sci" + System.currentTimeMillis()
        val h = URL(Cfg.server(c).trimEnd('/') + "/api/dinh-kem").openConnection() as HttpURLConnection
        try {
            h.requestMethod = "POST"
            h.doOutput = true
            h.connectTimeout = 15_000
            h.readTimeout = 180_000
            h.setChunkedStreamingMode(64 * 1024)
            h.setRequestProperty("Cookie", Cfg.cookie(c))
            h.setRequestProperty("Accept", "application/json")
            h.setRequestProperty("Content-Type", "multipart/form-data; boundary=$bd")
            h.outputStream.use { o ->
                fun s(t: String) = o.write(t.toByteArray(Charsets.UTF_8))
                s("--$bd\r\nContent-Disposition: form-data; name=\"noi\"\r\n\r\n$noi\r\n")
                s("--$bd\r\nContent-Disposition: form-data; name=\"tep\"; filename=\"${m.ten.replace("\"", "_")}\"\r\nContent-Type: $mime\r\n\r\n")
                c.contentResolver.openInputStream(uri)?.use { it.copyTo(o, 64 * 1024) } ?: throw java.io.IOException("Không đọc được tệp đã chọn")
                s("\r\n--$bd--\r\n")
            }
            val ma = h.responseCode
            val st = if (ma >= 400) h.errorStream else h.inputStream
            val txt = st?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
            if (ma == 401) throw Api.LoiDangNhap()
            val j = try { JSONObject(txt) } catch (_: Exception) { JSONObject() }
            if (ma in 200..299 && j.has("tep")) {
                val t = j.getJSONObject("tep")
                return JSONObject().put("ok", true).put("id", t.getString("id")).put("ten", t.optString("ten_tep", m.ten)).put("kich_thuoc", t.optLong("kich_thuoc", m.byte))
            }
            return JSONObject().put("ok", false).put("ten", m.ten).put("loi", j.optString("loi", if (ma == 404) "Máy chủ này chưa có chức năng kẹp tệp [404 /api/dinh-kem]" else "Lỗi $ma khi tải tệp lên"))
        } catch (e: java.io.IOException) {
            return JSONObject().put("ok", false).put("ten", m.ten).put("loi", "Không tải lên được: " + "mất kết nối mạng")
        } finally {
            h.disconnect()
        }
    }

    /** Tải tệp về thư mục Tải xuống rồi mở bằng ứng dụng của máy. Trả {ok, thongbao}. */
    fun taiVe(c: Context, id: String, ten: String): JSONObject {
        val h = URL(Cfg.server(c).trimEnd('/') + "/api/dinh-kem/" + URLEncoder.encode(id, "UTF-8") + "?tai=1").openConnection() as HttpURLConnection
        try {
            h.connectTimeout = 15_000
            h.readTimeout = 180_000
            h.setRequestProperty("Cookie", Cfg.cookie(c))
            val ma = h.responseCode
            if (ma == 401) throw Api.LoiDangNhap()
            if (ma !in 200..299) {
                val txt = h.errorStream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: ""
                val loi = try { JSONObject(txt).optString("loi", "") } catch (_: Exception) { "" }
                return JSONObject().put("ok", false).put("thongbao", loi.ifEmpty { "Không tải được tệp (lỗi $ma)" })
            }
            val sach = ten.replace(Regex("[\\\\/:*?\"<>|]"), "_").ifEmpty { "tep" }
            val duoi = sach.substringAfterLast('.', "").lowercase()
            val mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(duoi) ?: "application/octet-stream"
            val uri: Uri?
            if (Build.VERSION.SDK_INT >= 29) {
                val v = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, sach)
                    put(MediaStore.Downloads.MIME_TYPE, mime)
                    put(MediaStore.Downloads.RELATIVE_PATH, "Download/SCI Cong viec")
                }
                uri = c.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v)
                if (uri == null) return JSONObject().put("ok", false).put("thongbao", "Máy không cho lưu vào Tải xuống")
                c.contentResolver.openOutputStream(uri)?.use { o -> h.inputStream.use { it.copyTo(o, 64 * 1024) } }
            } else {
                val f = File(c.getExternalFilesDir(null), sach)
                f.outputStream().use { o -> h.inputStream.use { it.copyTo(o, 64 * 1024) } }
                return JSONObject().put("ok", true).put("thongbao", "Đã lưu: " + f.absolutePath)
            }
            return JSONObject().put("ok", true).put("thongbao", "Đã lưu vào Tải xuống/SCI Cong viec").put("uri", uri.toString()).put("mime", mime)
        } catch (e: java.io.IOException) {
            return JSONObject().put("ok", false).put("thongbao", "Không tải được: " + "mất kết nối mạng")
        } finally {
            h.disconnect()
        }
    }
}
