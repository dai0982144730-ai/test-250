import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// KhoÃ¡ kÃ½ báº£n phÃ¡t hÃ nh náº±m NGOÃ€I thÆ° má»¥c dá»± Ã¡n (C:\dev\keys\) â€” khÃ´ng bao giá» Ä‘Æ°a vÃ o git. Máº¥t khoÃ¡ = khÃ´ng cáº­p nháº­t Ä‘Ã¨ Ä‘Æ°á»£c báº£n Ä‘Ã£ cÃ i.
val khoa = Properties().apply {
    val f = file("C:/dev/keys/sci-keystore.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "vn.scigroup.congviec"
    compileSdk = 34

    defaultConfig {
        applicationId = "vn.scigroup.congviec"
        minSdk = 26
        targetSdk = 34
        versionCode = 34
        versionName = "0.1.33"
    }
    signingConfigs {
        create("sci") {
            if (khoa.isNotEmpty()) {
                storeFile = file(khoa.getProperty("storeFile"))
                storePassword = khoa.getProperty("storePassword")
                keyAlias = khoa.getProperty("keyAlias")
                keyPassword = khoa.getProperty("keyPassword")
            }
            // KÃ½ Ä‘á»§ 3 lÆ°á»£c Ä‘á»“: HyperOS / bá»™ cÃ i cá»§a Xiaomi hay tá»« chá»‘i gÃ³i chá»‰ cÃ³ v2 (lá»—i Â«á»©ng dá»¥ng chÆ°a Ä‘Æ°á»£c cÃ i Ä‘áº·tÂ»)
            enableV1Signing = true
            enableV2Signing = true
            enableV3Signing = true
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            isDebuggable = false
            signingConfig = signingConfigs.getByName("sci")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
// Cá»‘ Ã½ KHÃ”NG cÃ³ thÆ° viá»‡n ngoÃ i: Ã­t thá»© Ä‘á»ƒ há»ng, APK nhá».








