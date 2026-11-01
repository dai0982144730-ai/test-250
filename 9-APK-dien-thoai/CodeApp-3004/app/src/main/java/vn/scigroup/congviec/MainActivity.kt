package vn.scigroup.congviec

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONArray
import org.json.JSONObject

/** Vỏ ứng dụng: một WebView chứa giao diện (assets/app) + cầu nối «Android» để gọi API, đăng nhập, mở cài đặt máy. */
class MainActivity : Activity() {
    private lateinit var web: WebView
    @Volatile private var lkCho: String? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        window.statusBarColor = Color.parseColor("#1A1A1A")
        window.navigationBarColor = Color.parseColor("#FFFFFF")
        TB.kenh(this)
        web = WebView(this)
        setContentView(web)
        web.setBackgroundColor(Color.parseColor("#FAF9F7"))
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.addJavascriptInterface(Cau(this, web), "Android")
        web.webViewClient = object : WebViewClient() {
            // Chỉ cho trang trong app; mọi đường dẫn ngoài mở bằng trình duyệt
            override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
                val u = r.url.toString()
                if (u.startsWith("file:///android_asset/")) return false
                Cau(this@MainActivity, web).moWeb(u)
                return true
            }
        }
        web.loadUrl("file:///android_asset/app/index.html")
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
        }
        if (Cfg.dangNhap(this)) {
            NhipService.bat(this)
            Bao.datCuuHo(this)
        }
        xuLyLienKet(intent)
    }

    override fun onNewIntent(i: Intent) {
        super.onNewIntent(i)
        setIntent(i)
        xuLyLienKet(i)
    }

    /** Chống ứng dụng lạ ép app mở địa chỉ tuỳ ý: chỉ nhận đường tương đối, cùng máy chủ đã đăng nhập, hoặc đúng đường họp trực tuyến đã lưu */
    private fun lienKetHopLe(lk: String): Boolean {
        if (lk.startsWith("/") && !lk.startsWith("//")) return true
        if (!lk.startsWith("https://") && !lk.startsWith("http://")) return false
        val host = try { Uri.parse(lk).host } catch (_: Exception) { null } ?: return false
        val may = try { Uri.parse(Cfg.server(this)).host } catch (_: Exception) { null }
        return host == may || HopX.doc(Cfg.hop(this)).any { it.duongDan == lk }
    }

    /** Bấm thông báo → mở đúng việc / cuộc họp trên web (giống PC) */
    private fun xuLyLienKet(i: Intent?) {
        val lk = i?.getStringExtra("lien_ket") ?: return
        i.removeExtra("lien_ket")
        if (!lienKetHopLe(lk)) return
        // Liên kết của máy chủ mình → mở ngay trong app (JS moLienKet); đường họp trực tuyến bên ngoài thì vẫn mở trình duyệt
        var duong = lk
        if (lk.startsWith("http")) {
            val u = Uri.parse(lk)
            val may = try { Uri.parse(Cfg.server(this)).host } catch (_: Exception) { null }
            if (u.host != may) { Cau(this, web).moWeb(lk); return }
            duong = (u.encodedPath ?: "/") + (u.encodedQuery?.let { "?$it" } ?: "")
        }
        lkCho = duong
        web.post { web.evaluateJavascript("window.moLienKet&&window.moLienKet(" + JSONObject.quote(duong) + ")", null) }
    }

    fun lkChoLay(): String? { val x = lkCho; lkCho = null; return x }

    // Rời app (về màn hình chính / tắt): đăng lại con số trên biểu tượng. Mở app làm Xiaomi xoá số; chờ nhịp sau thì không đăng lại vì số không đổi.
    override fun onStop() {
        super.onStop()
        if (Cfg.dangNhap(this)) { val c = applicationContext; Thread { TB.huyHieu(c, true, "rời app") }.start() }
    }

    override fun onResume() {
        super.onResume()
        web.evaluateJavascript("window.__hienLai&&window.__hienLai()", null)
    }

    // ---- kẹp tệp 📎: mở bộ chọn tệp của máy, rồi tải từng tệp lên /api/dinh-kem (có cookie phiên) ----
    private var chonId = 0
    private var chonNoi = ""
    private var chonToiDaByte = 0L

    fun chonTep(id: Int, noi: String, toiDaMb: Int) {
        chonId = id
        chonNoi = noi
        chonToiDaByte = toiDaMb.toLong() * 1024 * 1024
        val i = Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        try { startActivityForResult(i, 77) } catch (_: ActivityNotFoundException) { guiTep(id, "xong", JSONArray().put(JSONObject().put("ok", false).put("ten", "").put("loi", "Máy không có ứng dụng chọn tệp")).toString()) }
    }

    private fun guiTep(id: Int, loai: String, json: String) {
        runOnUiThread { web.evaluateJavascript("window.__tep&&window.__tep($id,'$loai',${JSONObject.quote(json)})", null) }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(req: Int, res: Int, data: Intent?) {
        super.onActivityResult(req, res, data)
        if (req != 77) return
        val id = chonId
        val ds = ArrayList<Uri>()
        if (res == RESULT_OK && data != null) {
            val cd = data.clipData
            if (cd != null) for (k in 0 until cd.itemCount) ds.add(cd.getItemAt(k).uri) else data.data?.let { ds.add(it) }
        }
        if (ds.isEmpty()) { guiTep(id, "xong", "[]"); return }
        val noi = chonNoi
        val toiDa = chonToiDaByte
        Thread {
            val kq = JSONArray()
            for ((k, u) in ds.withIndex()) {
                val m = Tep.meta(this, u)
                guiTep(id, "tien", JSONObject().put("i", k + 1).put("n", ds.size).put("ten", m.ten).toString())
                if (toiDa > 0 && m.byte > toiDa) { kq.put(JSONObject().put("ok", false).put("ten", m.ten).put("loi", "Tệp «${m.ten}» vượt ${toiDa / 1024 / 1024} MB")); continue }
                try { kq.put(Api.voiPhien(this) { Tep.taiLen(this, u, noi, m) }) }
                catch (e: Api.LoiDangNhap) { Cfg.xoaPhien(this); kq.put(JSONObject().put("ok", false).put("ten", m.ten).put("loi", "Phiên đăng nhập đã hết hạn")); break }
                catch (e: Exception) { kq.put(JSONObject().put("ok", false).put("ten", m.ten).put("loi", "Không tải được tệp lên")) }
            }
            guiTep(id, "xong", kq.toString())
        }.start()
    }

    // Nút Back: quay lại trong app; hết chỗ lùi thì CHỈ ẨN app (không thoát) — thoát là dịch vụ nền dễ bị hệ thống dọn
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        web.evaluateJavascript("(window.__quayLai&&window.__quayLai())?'1':'0'") { r -> if (r != "\"1\"") moveTaskToBack(true) }
    }
}

/** Cầu nối JS → Android. Mọi hàm gọi mạng chạy luồng riêng rồi trả kết quả bằng window.__cb(id, mã, chuỗi). */
class Cau(private val a: Activity, private val web: WebView) {
    private fun tra(id: Int, ma: Int, txt: String) {
        a.runOnUiThread { web.evaluateJavascript("window.__cb($id,$ma,${JSONObject.quote(txt)})", null) }
    }

    @JavascriptInterface
    fun api(id: Int, method: String, path: String, body: String) {
        Thread {
            try {
                val kq = Api.goi(a, method, path, if (body.isEmpty()) null else body)
                tra(id, kq.ma, kq.noiDung)
            } catch (e: Api.LoiDangNhap) {
                Cfg.xoaPhien(a)
                tra(id, 401, "{}")
            } catch (e: Exception) {
                tra(id, 0, JSONObject().put("loi", "Không kết nối được máy chủ").toString())
            }
        }.start()
    }

    @JavascriptInterface
    fun dangNhap(id: Int, server: String, email: String, mk: String) {
        Thread {
            val loi = Api.dangNhap(a, server, email, mk)
            if (loi == null) {
                NhipService.bat(a)
                Bao.datCuuHo(a)
                Thread { Nhip.chay(a) }.start()
            }
            tra(id, if (loi == null) 200 else 400, JSONObject().put("loi", loi ?: "").toString())
        }.start()
    }

    @JavascriptInterface
    fun trangThai(): String {
        val o = JSONObject()
        o.put("dangNhap", Cfg.dangNhap(a)).put("server", Cfg.server(a)).put("email", Cfg.email(a)).put("ten", Cfg.ten(a))
        o.put("so", Cfg.so(a)).put("soMoi", Cfg.soMoi(a)).put("hop", JSONArray(Cfg.hop(a)))
        return o.toString()
    }

    /** JS gọi sau khi vừa làm gì đó (đọc tin, xem họp…) để số chuông và thông báo cố định cập nhật ngay */
    @JavascriptInterface
    fun dongBoNgay() { Thread { Nhip.chay(a) }.start() }

    // ---- Trợ lý AI của Main (cổng 3010) — chỉ bản 3004. Kết quả về qua window.__cb(id, mã, chuỗi); mã 401 = cần đăng nhập Main ----
    @JavascriptInterface
    fun mainTrangThai(): String = JSONObject()
        .put("dangNhap", Cfg.cookieMain(a).isNotEmpty() && Cfg.serverMain(a).isNotEmpty())
        .put("server", Cfg.serverMain(a).ifEmpty { TroLyMain.diaChiGoiY(a) })
        .put("email", Cfg.emailMain(a).ifEmpty { Cfg.email(a) })
        .put("coMk3004", Cfg.mk(a) != null)
        .toString()

    @JavascriptInterface
    fun mainDangNhap(id: Int, server: String, email: String, mk: String) {
        Thread {
            val loi = TroLyMain.dangNhap(a, server, email, mk)
            tra(id, if (loi == null) 200 else 400, JSONObject().put("loi", loi ?: "").toString())
        }.start()
    }

    @JavascriptInterface
    fun mainApi(id: Int, method: String, path: String, body: String) {
        // chỉ cho các cửa trợ lý — vỏ không thành đường gọi tuỳ ý vào Main
        if (!TroLyMain.duongDuocGoi(method, path)) { tra(id, 400, JSONObject().put("loi", "Đường không được phép").toString()); return }
        Thread {
            try {
                val kq = TroLyMain.goi(a, method, path, if (body.isEmpty()) null else body)
                tra(id, kq.ma, kq.noiDung)
            } catch (e: TroLyMain.HetPhien) {
                tra(id, 401, "{}")
            } catch (e: Api.LoiMang) {
                tra(id, 0, JSONObject().put("loi", e.message ?: "Không kết nối được Main").toString())
            } catch (e: Exception) {
                tra(id, 0, JSONObject().put("loi", "Không kết nối được Main").toString())
            }
        }.start()
    }

    @JavascriptInterface
    fun mainThoat() { Cfg.quenMain(a) }

    @JavascriptInterface
    fun dangXuat() {
        Cfg.quenMain(a) // bản 3004: đăng xuất app = quên cả phiên + mật khẩu trợ lý Main
        Cfg.xoaMk(a) // bấm Đăng xuất = quên luôn mật khẩu nhớ
        Cfg.xoaPhien(a)
        Bao.huyTatCa(a)
        a.stopService(Intent(a, NhipService::class.java))
        a.getSystemService(NotificationManager::class.java).cancelAll()
    }

    /** JS hỏi: có liên kết thông báo đang chờ mở không (bấm thông báo lúc app chưa chạy) — lấy một lần rồi xoá */
    @JavascriptInterface
    fun lienKetCho(): String = (a as? MainActivity)?.lkChoLay() ?: ""

    @JavascriptInterface
    fun moWeb(url: String) {
        if (!url.startsWith("http://") && !url.startsWith("https://")) return
        a.runOnUiThread { try { a.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) } catch (_: ActivityNotFoundException) {} }
    }

    /** Đường dẫn tương đối của máy chủ (/cong-viec/X → /so-do?viec=X như chuông web) hoặc đường dẫn họp http(s) */
    @JavascriptInterface
    fun moWebTuongDoi(lk: String) {
        if (lk.startsWith("http")) return moWeb(lk)
        if (!lk.startsWith("/") || lk.startsWith("//")) return
        val m = Regex("^/cong-viec/([^/?#]+)").find(lk)
        val duong = if (m != null) "/so-do?viec=" + m.groupValues[1] else lk
        moWeb(Cfg.server(a).trimEnd('/') + duong)
    }

    @JavascriptInterface
    fun chanDoan(): String {
        val pm = a.getSystemService(PowerManager::class.java)
        val nm = a.getSystemService(NotificationManager::class.java)
        val o = JSONObject()
        o.put("may", Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE)
        o.put("pinKhongHanChe", pm.isIgnoringBatteryOptimizations(a.packageName))
        o.put("thongBaoBat", nm.areNotificationsEnabled())
        o.put("kenhHopMuc", nm.getNotificationChannel(TB.K_HOP)?.importance ?: -1)
        o.put("dichVuChay", NhipService.dangChay)
        o.put("nhipCuoi", Cfg.nhipCuoi(a))
        o.put("bayGio", System.currentTimeMillis())
        o.put("huyHieuDuocPhep", TB.huyHieuDuocPhep(a))
        o.put("huyHieuSo", TB.soHuyHieu(a))
        o.put("khaySo", try { nm.activeNotifications.size } catch (_: Exception) { -1 })
        o.put("nhatKy", JSONArray(Nhat.doc(a, 25)))
        if (Build.VERSION.SDK_INT >= 31) o.put("baoThucChinhXac", a.getSystemService(AlarmManager::class.java).canScheduleExactAlarms())
        return o.toString()
    }

    private fun thu(vararg lenh: Intent) {
        a.runOnUiThread {
            for (i in lenh) {
                try { a.startActivity(i); return@runOnUiThread } catch (_: Exception) { /* thử cái kế tiếp */ }
            }
        }
    }

    /** Mở đúng trang cài đặt của máy. Xiaomi mỗi đời mỗi khác → luôn có phương án dự phòng là trang thông tin ứng dụng. */
    @JavascriptInterface
    fun moCaiDat(loai: String) {
        val chiTiet = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + a.packageName))
        when (loai) {
            "pin" -> thu(
                Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + a.packageName)),
                Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS), chiTiet,
            )
            "pin-xiaomi" -> thu(
                Intent().setComponent(ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"))
                    .putExtra("package_name", a.packageName).putExtra("package_label", "SCI Công việc 3004"),
                chiTiet,
            )
            "autostart" -> thu(Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")), chiTiet)
            "thongbao" -> thu(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, a.packageName), chiTiet)
            else -> thu(chiTiet)
        }
    }

    @JavascriptInterface
    fun guiThu() { Bao.datThu(a) }

    /** Phiên bản app đọc từ gói đã cài (versionName · versionCode) — hiện ở ⚙ Cấu hình để quản lý bản (Mr. Đại 01/11/2026) */
    @JavascriptInterface
    fun phienBan(): String = try {
        val pi = a.packageManager.getPackageInfo(a.packageName, 0)
        val code = if (Build.VERSION.SDK_INT >= 28) pi.longVersionCode else @Suppress("DEPRECATION") pi.versionCode.toLong()
        (pi.versionName ?: "?") + " (bản " + code + ")"
    } catch (_: Exception) { "?" }

    /** «Thử huy hiệu»: đặt số thử lên biểu tượng ngay; nhịp sau tự trả về số thật */
    @JavascriptInterface
    fun thuHuyHieu(so: Int) { Thread { TB.thuHuyHieu(a, so) }.start() }

    /** 📎: mở bộ chọn tệp; kết quả về qua window.__tep(id, 'tien'|'xong', json) */
    @JavascriptInterface
    fun chonTep(id: Int, noi: String, toiDaMb: Int) {
        a.runOnUiThread { (a as MainActivity).chonTep(id, noi, toiDaMb) }
    }

    /** XEM trong app: pdfMo → pdfTrang (từng trang, vẽ lười) → pdfDong · anh. Kết quả về qua __cb(id, 200, json) */
    private fun chayXem(id: Int, f: () -> JSONObject) {
        Thread {
            try { tra(id, 200, f().toString()) }
            catch (e: Api.LoiDangNhap) { Cfg.xoaPhien(a); tra(id, 401, "{}") }
            catch (e: Throwable) { tra(id, 200, JSONObject().put("ok", false).put("loi", "Không mở được tệp").toString()) }
        }.start()
    }

    @JavascriptInterface fun pdfMo(id: Int, tepId: String) = chayXem(id) { Api.voiPhien(a) { Xem.moPdf(a, tepId) } }
    @JavascriptInterface fun pdfTrang(id: Int, n: Int, rongPx: Int) = chayXem(id) { Xem.trangPdf(n, rongPx) }
    @JavascriptInterface fun pdfDong() { Xem.dongPdf() }
    @JavascriptInterface fun anhMo(id: Int, tepId: String) = chayXem(id) { Api.voiPhien(a) { Xem.anh(a, tepId) } }

    /** Bấm tên tệp đã kẹp: tải về Tải xuống rồi mở bằng ứng dụng của máy; kết quả về qua __cb(id, 200, {ok, thongbao}) */
    @JavascriptInterface
    fun moTep(id: Int, tepId: String, ten: String) {
        Thread {
            try {
                val kq = Api.voiPhien(a) { Tep.taiVe(a, tepId, ten) }
                if (kq.optBoolean("ok") && kq.has("uri")) {
                    a.runOnUiThread {
                        try {
                            a.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(Uri.parse(kq.getString("uri")), kq.getString("mime")).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
                        } catch (_: Exception) { /* không có ứng dụng mở được: tệp vẫn nằm trong Tải xuống */ }
                    }
                }
                tra(id, 200, kq.toString())
            } catch (e: Api.LoiDangNhap) {
                Cfg.xoaPhien(a)
                tra(id, 401, "{}")
            } catch (e: Exception) {
                tra(id, 200, JSONObject().put("ok", false).put("thongbao", "Không mở được tệp").toString())
            }
        }.start()
    }
}
