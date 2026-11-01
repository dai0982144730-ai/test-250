package vn.scigroup.congviec

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * LỚP 2 + 3 của thiết kế «không lỡ thông báo» (THIET-KE-KHONG-LO-THONG-BAO.md):
 *  - Báo thức đặt sẵn cho TỪNG cuộc họp (trước 15 phút + đúng giờ) bằng setAlarmClock: do hệ điều hành giữ, không cần dịch vụ nền sống, không cần mạng.
 *  - Báo thức cứu hộ mỗi ~5 phút: bật lại dịch vụ nền nếu chết và hỏi máy chủ ngay trong receiver (phòng khi không bật lại được dịch vụ).
 */
object Bao {
    private const val MA_CUU_HO = 9001
    private const val MA_THU = 9002
    private const val CUU_HO_MS = 5 * 60_000L

    private fun pi(c: Context, ma: Int, loai: String, extras: Intent.() -> Unit = {}): PendingIntent {
        val i = Intent(c, BaoThucReceiver::class.java).putExtra("loai", loai).apply(extras)
        return PendingIntent.getBroadcast(c, ma, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    /** Đặt lại toàn bộ báo thức họp theo danh sách hiện có. Huỷ báo thức của cuộc đã bị huỷ / đổi giờ. */
    fun datHop(c: Context, ds: List<Hop>) {
        val am = c.getSystemService(AlarmManager::class.java)
        for (m in Cfg.maBaoThuc(c)) am.cancel(pi(c, m.toInt(), "hop"))
        val moi = HashSet<String>()
        val now = System.currentTimeMillis()
        for (h in ds) {
            val bd = try { HopX.batDau(h) } catch (_: Exception) { continue }
            for (kind in 0..1) {
                val luc = if (kind == 0) bd - HopX.PHUT_NHAC_TRUOC * 60_000L else bd
                if (luc <= now + 1_000L) continue
                val ma = ((h.id % 100_000).toInt() * 10 + kind) + 100_000
                val chu = h.tu + " họp " + h.noiDung + " · " + HopX.tenPhong(h.phong)
                val lk = if (h.duongDan.startsWith("http")) h.duongDan else "/phong-hop?ngay=" + h.ngay
                val p = pi(c, ma, "hop") { putExtra("kind", kind); putExtra("id", h.id); putExtra("chu", chu); putExtra("lk", lk) }
                try {
                    am.setAlarmClock(AlarmManager.AlarmClockInfo(luc, TB.moApp(c, null)), p)
                    moi.add(ma.toString())
                } catch (e: Exception) { Nhat.ghi(c, "không đặt được báo thức họp ${h.id}: ${e.message}") }
            }
        }
        Cfg.luuMaBaoThuc(c, moi)
        Nhat.ghi(c, "đặt ${moi.size} báo thức họp")
    }

    /** Đăng xuất: huỷ báo thức họp, cứu hộ, thử — không để máy tự thức hoặc báo họp của người cũ */
    fun huyTatCa(c: Context) {
        val am = c.getSystemService(AlarmManager::class.java)
        for (m in Cfg.maBaoThuc(c)) am.cancel(pi(c, m.toInt(), "hop"))
        am.cancel(pi(c, MA_CUU_HO, "cuuho"))
        am.cancel(pi(c, MA_THU, "thu"))
        Cfg.luuMaBaoThuc(c, emptySet())
    }

    /** Báo thức cứu hộ kế tiếp (không cần quyền báo thức chính xác: chấp nhận lệch vài phút) */
    fun datCuuHo(c: Context, sauMs: Long = CUU_HO_MS) {
        val am = c.getSystemService(AlarmManager::class.java)
        try { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, System.currentTimeMillis() + sauMs, pi(c, MA_CUU_HO, "cuuho")) } catch (_: Exception) {}
    }

    /** «Gửi thông báo thử sau 1 phút»: khoá màn hình rồi chờ — để biết máy có báo được khi tắt màn không */
    fun datThu(c: Context) {
        val am = c.getSystemService(AlarmManager::class.java)
        val luc = System.currentTimeMillis() + 60_000L
        am.setAlarmClock(AlarmManager.AlarmClockInfo(luc, TB.moApp(c, null)), pi(c, MA_THU, "thu"))
        Nhat.ghi(c, "đặt thông báo thử lúc +60 giây")
    }
}

class BaoThucReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        if (!Cfg.dangNhap(c)) { Bao.huyTatCa(c); return } // đã đăng xuất: không báo, không tự đặt lại
        TB.kenh(c)
        when (i.getStringExtra("loai")) {
            "hop" -> {
                val kind = i.getIntExtra("kind", 1)
                TB.baoHop(c, i.getLongExtra("id", 0), kind, i.getStringExtra("chu") ?: "", i.getStringExtra("lk"))
                Nhat.ghi(c, "báo họp kind=$kind id=${i.getLongExtra("id", 0)}")
            }
            "thu" -> {
                TB.baoHop(c, 0, 2, "Nếu anh thấy dòng này khi tắt màn hình thì máy đã cấu hình đúng.", null)
                Nhat.ghi(c, "đã gửi thông báo thử")
            }
            "cuuho" -> Bao.datCuuHo(c)
        }
        // Mọi báo thức đều đánh thức app: bật lại dịch vụ nền nếu chết + hỏi máy chủ ngay (receiver tự hỏi, không phụ thuộc dịch vụ)
        val pr = goAsync()
        Thread {
            try {
                if (Cfg.dangNhap(c)) {
                    NhipService.bat(c)
                    Nhip.chay(c)
                }
            } finally { pr.finish() }
        }.start()
    }
}

class KhoiDongReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        Nhat.ghi(c, "khởi động lại sau: " + (i.action ?: "?"))
        if (!Cfg.dangNhap(c)) return
        TB.kenh(c)
        try { Bao.datHop(c, HopX.doc(Cfg.hop(c))) } catch (e: Exception) { Nhat.ghi(c, "không đặt lại báo thức họp sau khởi động") } // chưa có mạng cũng vẫn báo họp được
        NhipService.bat(c)
        Bao.datCuuHo(c)
        val pr = goAsync()
        Thread { try { Nhip.chay(c) } finally { pr.finish() } }.start()
    }
}
