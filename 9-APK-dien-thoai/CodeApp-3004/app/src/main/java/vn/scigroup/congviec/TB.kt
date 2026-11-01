package vn.scigroup.congviec

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent

/** Kênh + thông báo Android. Bốn kênh để người dùng chỉnh riêng từng loại và để Xiaomi không gộp lẫn vào «thông báo gấp nếp». */
object TB {
    const val K_HOP = "hop"
    const val K_QUAHAN = "quahan"
    const val K_CHUNG = "chung"
    const val K_TT = "trangthai3" // kênh cũ không cho đổi sau khi tạo → kênh mới, TẮT huy hiệu: thông báo cố định không được tính vào số trên biểu tượng (29/10/2026)
    @Volatile private var coDinhCuoi = ""
    @Volatile private var huyHieuCuoi = -1
    const val K_HH = "huyhieu2" // mức MẶC ĐỊNH nhưng im lặng (không âm, không rung) — mức thấp thì Xiaomi không đếm lên biểu tượng
    const val ID_HUYHIEU = 3
    const val ID_CODINH = 1
    const val ID_HETPHIEN = 2
    private val LOAI_DO = setOf("nhac_viec", "nhac_nop", "bi_tra_lai", "qua_han")
    private val LOAI_TEN = mapOf(
        "nhac_viec" to "Ban lãnh đạo nhắc việc", "nhac_nop" to "Nhắc nộp báo cáo", "bi_tra_lai" to "Báo cáo bị trả lại",
        "qua_han" to "Việc quá hạn", "nhac_dong_viec" to "Nhắc bấm Xong việc", "binh_luan" to "Bình luận", "phong_hop" to "Phòng họp",
    )

    fun kenh(c: Context) {
        val nm = c.getSystemService(NotificationManager::class.java)
        try { nm.deleteNotificationChannel("trangthai") } catch (_: Exception) {}
        fun k(id: String, ten: String, muc: Int, mota: String, rung: Boolean, huyHieu: Boolean = true) {
            val ch = NotificationChannel(id, ten, muc)
            ch.description = mota
            if (rung) { ch.enableVibration(true); ch.vibrationPattern = longArrayOf(0, 300, 200, 300); ch.enableLights(true) }
            else { ch.setSound(null, null); ch.enableVibration(false) }
            ch.setShowBadge(huyHieu)
            nm.createNotificationChannel(ch)
        }
        k(K_HOP, "Họp", NotificationManager.IMPORTANCE_HIGH, "Chuẩn bị đi họp, đến giờ họp, lịch họp mới", true)
        k(K_QUAHAN, "Việc quá hạn", NotificationManager.IMPORTANCE_HIGH, "Việc quá hạn, Ban lãnh đạo nhắc việc, báo cáo bị trả lại", true)
        k(K_CHUNG, "Chung", NotificationManager.IMPORTANCE_DEFAULT, "Bình luận và các tin khác", true)
        try { nm.deleteNotificationChannel("huyhieu") } catch (_: Exception) {} // kênh cũ mức THẤP: HyperOS không tính vào số trên biểu tượng
        k(K_HH, "Số trên biểu tượng", NotificationManager.IMPORTANCE_DEFAULT, "Thông báo im lặng chỉ để hiện con số việc/họp chưa xem trên biểu tượng ứng dụng", false)
        try { nm.deleteNotificationChannel("trangthai2") } catch (_: Exception) {}
        k(K_TT, "Trạng thái (luôn hiện)", NotificationManager.IMPORTANCE_LOW, "Dòng cố định «57+11 · cuộc họp sắp tới» — giữ cho ứng dụng không bị hệ thống tắt", false, huyHieu = false)
    }

    /** «8+5»: 8 = chưa đọc đã thấy · 5 = tin mới từ lần mở chuông trước (đúng công thức web, Mr. Đại chốt 29/09) */
    fun chuSo(so: Int, soMoi: Int): String {
        val moi = minOf(soMoi, so)
        val cu = so - moi
        fun gon(n: Int) = if (n > 99) "99+" else n.toString()
        return if (moi > 0) (if (cu > 0) gon(cu) + (if (cu > 99) " " else "") + "+" + gon(moi) else "+" + gon(moi)) else gon(cu)
    }

    fun moApp(c: Context, lienKet: String?): PendingIntent {
        val i = Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (!lienKet.isNullOrEmpty()) i.putExtra("lien_ket", lienKet)
        return PendingIntent.getActivity(c, (lienKet ?: "").hashCode(), i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    fun coDinh(c: Context): Notification {
        val so = Cfg.so(c)
        val now = System.currentTimeMillis()
        val hopChuaXem = HopX.doc(Cfg.hop(c)).count { !it.daXem && HopX.conHien(it, now) }
        val tieuDe = "SCI Công việc 3004 · " + (if (so > 0) TB.chuSo(so, Cfg.soMoi(c)) else "không có thông báo mới") + (if (hopChuaXem > 0) " · $hopChuaXem họp chưa xem" else "")
        val h = HopX.ganNhat(c, now)
        val dong = if (h != null) HopX.chu(h, now) else "Không có cuộc họp sắp tới"
        return Notification.Builder(c, K_TT).setSmallIcon(R.drawable.ic_chuong).setContentTitle(tieuDe).setContentText(dong)
            .setStyle(Notification.BigTextStyle().bigText(dong)).setContentIntent(moApp(c, null)).setOngoing(true).setOnlyAlertOnce(true)
            .setNumber(so + hopChuaXem).setShowWhen(false).setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE).build()
    }

    fun capNhatCoDinh(c: Context) {
        try {
            // chỉ đăng lại khi nội dung đổi: đăng lại mỗi phút làm launcher của Xiaomi chớp tắt con số (29/10/2026)
            val n = coDinh(c)
            val dau = (n.extras.getCharSequence(Notification.EXTRA_TITLE) ?: "").toString() + "|" + (n.extras.getCharSequence(Notification.EXTRA_TEXT) ?: "").toString()
            val nm = c.getSystemService(NotificationManager::class.java)
            if (dau != coDinhCuoi || nm.activeNotifications.none { it.id == ID_CODINH }) { nm.notify(ID_CODINH, n); coDinhCuoi = dau }
        } catch (_: Exception) {}
        huyHieu(c)
    }

    /** Số trên biểu tượng = số chuông chưa đọc (đúng số web, Mr. Đại chốt 01/11/2026). HyperOS không đếm thông báo cố định (ongoing) nên dùng một thông báo THƯỜNG, im lặng, mang số. Hết thì gỡ. */
    fun soHuyHieu(c: Context): Int = Cfg.so(c)

    /** Dựng thông báo mang số; dùng chung cho đăng thật và đăng thử */
    private fun dungHuyHieu(c: Context, so: Int, tieuDe: String): Notification {
        val n = Notification.Builder(c, K_HH).setSmallIcon(R.drawable.ic_chuong).setContentTitle(tieuDe)
            .setContentText("Bấm để mở SCI Công việc 3004").setContentIntent(moApp(c, null)).setNumber(so).setOnlyAlertOnce(true).setShowWhen(false)
            .setBadgeIconType(Notification.BADGE_ICON_NONE).build()
        try { // lối cũ của MIUI: báo thẳng số cho launcher (HyperOS có thể đã bỏ — đo 01/11: không hại)
            val f = n.javaClass.getDeclaredField("extraNotification"); f.isAccessible = true
            val e = f.get(n); e.javaClass.getDeclaredMethod("setMessageCount", Int::class.javaPrimitiveType).invoke(e, so)
        } catch (_: Throwable) { /* máy không có lối này thì thôi */ }
        return n
    }

    private fun ghiKhay(c: Context, nm: NotificationManager, dau: String) {
        // Đo thay vì đoán: ghi số thông báo đang nằm trong khay theo kênh (HyperOS đếm theo khay)
        val khay = nm.activeNotifications.groupBy { it.notification.channelId }.entries.joinToString(", ") { it.key + "=" + it.value.size }
        Nhat.ghi(c, "$dau · khay có ${nm.activeNotifications.size} thông báo ($khay)")
    }

    /**
     * ep = đăng lại dù số không đổi. Đo 01/11/2026 (ảnh Mr. Đại): HyperOS XOÁ huy hiệu khi mở app dù thông báo vẫn nằm trong khay, và
     * notify() cùng mã chỉ là CẬP NHẬT nên launcher không đếm lại → khi ep hoặc số đổi thì GỠ rồi ĐĂNG MỚI để launcher coi là thông báo mới.
     */
    fun huyHieu(c: Context, ep: Boolean = false, lyDo: String = "nhịp") {
        val nm = c.getSystemService(NotificationManager::class.java)
        try {
            val so = soHuyHieu(c)
            val dang = nm.activeNotifications.any { it.id == ID_HUYHIEU }
            if (so <= 0) { if (dang) { nm.cancel(ID_HUYHIEU); ghiKhay(c, nm, "huy hiệu: gỡ (0 chưa đọc, $lyDo)") }; huyHieuCuoi = 0; return }
            if (!ep && so == huyHieuCuoi && dang) return // số không đổi và thông báo còn đó: để yên
            if (dang) nm.cancel(ID_HUYHIEU)
            nm.notify(ID_HUYHIEU, dungHuyHieu(c, so, "$so thông báo chưa đọc"))
            huyHieuCuoi = so
            ghiKhay(c, nm, "huy hiệu: đặt số $so ($lyDo${if (dang) ", gỡ rồi đăng mới" else ", đăng mới"})")
        } catch (e: Exception) { Nhat.ghi(c, "huy hiệu lỗi: ${e.message}") }
    }

    /** «Thử huy hiệu»: đặt số thử lên biểu tượng để Mr. Đại nhìn ngoài màn hình chính; nhịp sau (≤ 60 giây) tự trả về số thật. */
    fun thuHuyHieu(c: Context, so: Int) {
        val nm = c.getSystemService(NotificationManager::class.java)
        try {
            nm.cancel(ID_HUYHIEU)
            nm.notify(ID_HUYHIEU, dungHuyHieu(c, so, "THỬ: đặt số $so lên biểu tượng"))
            huyHieuCuoi = -1 // nhịp sau đăng lại số thật
            ghiKhay(c, nm, "THỬ huy hiệu: đặt số $so")
        } catch (e: Exception) { Nhat.ghi(c, "thử huy hiệu lỗi: ${e.message}") }
    }

    /** Máy có cho app hiện huy hiệu không: kênh «Số trên biểu tượng» còn được phép huy hiệu + app được phép thông báo */
    fun huyHieuDuocPhep(c: Context): Boolean {
        val nm = c.getSystemService(NotificationManager::class.java)
        return nm.areNotificationsEnabled() && (nm.getNotificationChannel(K_HH)?.canShowBadge() ?: false)
    }

    private fun dung(c: Context, kenh: String, id: Int, tieuDe: String, noiDung: String, lienKet: String?, loai: String) {
        val n = Notification.Builder(c, kenh).setSmallIcon(R.drawable.ic_chuong).setContentTitle(tieuDe).setContentText(noiDung)
            .setStyle(Notification.BigTextStyle().bigText(noiDung)).setContentIntent(moApp(c, lienKet)).setAutoCancel(true)
            .setCategory(loai).setWhen(System.currentTimeMillis()).build()
        try { c.getSystemService(NotificationManager::class.java).notify(id, n) } catch (_: Exception) {}
    }

    fun idTin(id: Long): Int = 1000 + (id % 900_000).toInt()

    fun baoTin(c: Context, id: Long, loai: String, noiDung: String, lienKet: String?) {
        val kenh = if (loai in LOAI_DO) K_QUAHAN else K_CHUNG
        dung(c, kenh, idTin(id), LOAI_TEN[loai] ?: "Thông báo", noiDung, lienKet, Notification.CATEGORY_MESSAGE)
        if (id > 0) Cfg.luuTinDaBao(c, Cfg.tinDaBao(c) + id.toString())
    }

    /** kind 3 = lịch họp mới gửi đến · kind 0 = CHUẨN BỊ ĐI ĐẾN CUỘC HỌP (15 phút trước) · 1 = đến giờ họp · 2 = thử */
    fun baoHop(c: Context, hopId: Long, kind: Int, chu: String, lienKet: String?) {
        val tieuDe = when (kind) { 0 -> "CHUẨN BỊ ĐI ĐẾN CUỘC HỌP"; 1 -> "ĐẾN GIỜ HỌP"; 3 -> "LỊCH HỌP MỚI GỬI ĐẾN BẠN"; else -> "Thử thông báo họp" }
        dung(c, K_HOP, 2_000_000 + (hopId % 100_000).toInt() * 10 + kind, tieuDe, chu, lienKet, Notification.CATEGORY_REMINDER)
    }

    fun baoHetPhien(c: Context) {
        dung(c, K_CHUNG, ID_HETPHIEN, "Cần đăng nhập lại", "Phiên đăng nhập đã hết hạn nên không nhận được thông báo. Mở ứng dụng để đăng nhập lại.", null, Notification.CATEGORY_ERROR)
    }
}
