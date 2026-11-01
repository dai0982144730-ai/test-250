package vn.scigroup.congviec

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import org.json.JSONObject

/** Một «nhịp»: hỏi máy chủ số chuông + cuộc họp + tin mới, báo tin mới, đặt lại báo thức họp, cập nhật thông báo cố định. */
object Nhip {
    @Synchronized
    fun chay(c: Context) {
        if (!Cfg.dangNhap(c)) return
        val wl = c.getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sci:nhip")
        wl.acquire(45_000L)
        val t0 = System.currentTimeMillis()
        try {
            val truoc = Cfg.nhipCuoi(c)
            var so = Cfg.so(c)
            var moi = Cfg.soMoi(c)
            try {
                val toi = JSONObject(Api.goi(c, "GET", "/api/toi").noiDung)
                so = toi.optInt("so_thong_bao_chua_doc")
                moi = toi.optInt("so_thong_bao_moi")
                Cfg.luuSo(c, so, moi)
            } catch (e: Api.LoiDangNhap) { throw e } catch (e: Exception) { Nhat.ghi(c, "không hỏi được số chuông: " + (e.message ?: "?")) }
            try {
                val kq = Api.goi(c, "GET", "/api/phong-hop/cua-toi")
                if (kq.ma == 200) {
                    val a = JSONObject(kq.noiDung).optJSONArray("hop")
                    if (a != null) { Cfg.luuHop(c, a.toString()); val ds = HopX.doc(a.toString()); Bao.datHop(c, ds); baoHopMoi(c, ds) }
                }
            } catch (_: Api.LoiMang) { /* mất mạng giữa chừng: giữ danh sách họp cũ, báo thức đã đặt vẫn chạy */ }
            try { baoTinMoi(c) } catch (e: Api.LoiDangNhap) { throw e } catch (e: Exception) { Nhat.ghi(c, "không lấy được tin mới: " + (e.message ?: "?")) }
            Cfg.luuNhip(c, System.currentTimeMillis())
            TB.capNhatCoDinh(c)
            val ms = System.currentTimeMillis() - t0
            val cach = if (truoc > 0) (t0 - truoc) / 1000 else -1
            Nhat.ghi(c, "ok ${ms}ms · so=$so/$moi · cách nhịp trước ${cach}s")
        } catch (e: Api.LoiDangNhap) {
            Cfg.xoaPhien(c)
            TB.huyHieu(c, false, "hết phiên") // số trên biểu tượng không được treo số cũ khi phiên đã chết (so đã về 0 → gỡ thông báo đếm số)
            TB.baoHetPhien(c)
            Nhat.ghi(c, "phiên hết hạn")
        } catch (e: Exception) {
            Nhat.ghi(c, "lỗi: ${e.message}")
        } finally {
            if (wl.isHeld) wl.release()
        }
    }

    /** Cuộc họp mới xuất hiện trong danh sách «họp của tôi» (có người mời / đặt cho tôi) → báo ngay một thông báo riêng. */
    private fun baoHopMoi(c: Context, ds: List<Hop>) {
        val biet = Cfg.hopDaBiet(c)
        val nay = ds.map { it.id.toString() }.toSet()
        if (biet != null) {
            val now = System.currentTimeMillis()
            for (h in ds) if (h.id.toString() !in biet && !h.daXem && HopX.conHien(h, now)) TB.baoHop(c, h.id, 3, HopX.chu(h, now), null)
        }
        Cfg.luuHopDaBiet(c, nay)
    }

    /** Bù tin: tin ở máy chủ không mất, chỉ trễ — mỗi nhịp lấy mọi tin chưa đọc có mã lớn hơn mã đã báo cuối. */
    private fun baoTinMoi(c: Context) {
        val r = JSONObject(Api.goi(c, "GET", "/api/thong-bao?gioi_han=50").noiDung)
        val ds = r.optJSONArray("thong_bao") ?: return
        var max = 0L
        val moi = ArrayList<JSONObject>()
        val cuoi = Cfg.tinCuoi(c)
        // Tin đã đọc ở nơi khác (app, PC, web) thì gỡ khỏi khay. Chỉ gỡ khi danh sách chưa bị cắt ở giới hạn 50.
        if (ds.length() < 50) {
            val chuaDoc = HashSet<String>()
            for (i in 0 until ds.length()) { val t = ds.getJSONObject(i); if (!t.optBoolean("da_doc")) chuaDoc.add(t.optLong("id").toString()) }
            val daBao = Cfg.tinDaBao(c)
            val goRa = daBao.filter { it !in chuaDoc }
            if (goRa.isNotEmpty()) {
                val nm = c.getSystemService(android.app.NotificationManager::class.java)
                for (id in goRa) try { nm.cancel(TB.idTin(id.toLong())) } catch (_: Exception) {}
                Cfg.luuTinDaBao(c, daBao - goRa.toSet())
            }
        }
        for (i in 0 until ds.length()) {
            val t = ds.getJSONObject(i)
            val id = t.optLong("id")
            if (id > max) max = id
            if (cuoi >= 0 && id > cuoi && !t.optBoolean("da_doc")) moi.add(t)
        }
        if (cuoi < 0) { Cfg.luuTinCuoi(c, max); return } // lần đầu: chỉ ghi mốc, không báo dồn tin cũ
        moi.sortBy { it.optLong("id") }
        val hien = moi.takeLast(5)
        if (moi.size > hien.size) TB.baoTin(c, 0, "chung", "Còn ${moi.size - hien.size} thông báo mới khác", null)
        for (t in hien) TB.baoTin(c, t.optLong("id"), t.optString("loai"), t.optString("noi_dung"), t.optString("lien_ket", ""))
        if (max > cuoi) Cfg.luuTinCuoi(c, max)
    }
}

/** LỚP 1: dịch vụ nền tiền cảnh (loại specialUse), hỏi máy chủ 60 giây một lần, kèm thông báo cố định «57+11 · cuộc họp sắp tới». */
class NhipService : Service() {
    @Volatile private var chay = false

    override fun onBind(i: Intent?): IBinder? = null

    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        TB.kenh(this)
        val n = TB.coDinh(this)
        if (Build.VERSION.SDK_INT >= 29) startForeground(TB.ID_CODINH, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE) else startForeground(TB.ID_CODINH, n)
        dangChay = true
        if (!chay) {
            chay = true
            Nhat.ghi(this, "dịch vụ nền bắt đầu")
            Thread {
                while (chay) {
                    try { Nhip.chay(this) } catch (_: Throwable) { }
                    SystemClock.sleep(60_000L)
                }
            }.start()
        }
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        // Vuốt xoá app khỏi đa nhiệm: dặn báo thức cứu hộ bật lại sau ~10 giây
        Bao.datCuuHo(this, 10_000L)
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        chay = false
        dangChay = false
        Nhat.ghi(this, "dịch vụ nền dừng")
        Bao.datCuuHo(this, 15_000L)
        super.onDestroy()
    }

    companion object {
        @Volatile var dangChay = false
        fun bat(c: Context) {
            try { c.startForegroundService(Intent(c, NhipService::class.java)) } catch (e: Throwable) { Nhat.ghi(c, "không bật được dịch vụ nền: ${e.message}") }
        }
    }
}
