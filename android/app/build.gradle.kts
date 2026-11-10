import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.roborazzi)
}

fun prop(name: String): String = (project.findProperty(name) as String?)?.trim().orEmpty()

// Release signing is read from a file that lives OUTSIDE the repository (or from CI secrets). Without it the
// release build is simply left unsigned, so nobody needs a keystore to build or test. See docs/android/RELEASE.md.
val keystoreProps = Properties().apply {
    val path = System.getenv("ZING_KEYSTORE_PROPERTIES") ?: "${System.getProperty("user.home")}/.zing/keystore.properties"
    val file = File(path)
    if (file.isFile) file.inputStream().use { load(it) }
}
val hasUploadKey = listOf("storeFile", "storePassword", "keyAlias", "keyPassword").all { !keystoreProps.getProperty(it).isNullOrBlank() }

android {
    namespace = "com.josh.zing"
    compileSdk = 37

    defaultConfig {
        applicationId = prop("ZING_APPLICATION_ID")
        minSdk = 26
        targetSdk = 36
        versionCode = prop("ZING_VERSION_CODE").toInt()
        versionName = prop("ZING_VERSION_NAME")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "SUPABASE_URL", "\"${prop("ZING_SUPABASE_URL")}\"")
        buildConfigField("String", "SUPABASE_KEY", "\"${prop("ZING_SUPABASE_PUBLISHABLE_KEY")}\"")
        buildConfigField("String", "WEB_HOST", "\"${prop("ZING_WEB_HOST")}\"")
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"${prop("ZING_GOOGLE_WEB_CLIENT_ID")}\"")
        buildConfigField("String", "PLUS_PRODUCT_ID", "\"${prop("ZING_PLUS_PRODUCT_ID")}\"")
        manifestPlaceholders["webHost"] = prop("ZING_WEB_HOST")

        // A service-role or secret key must never be compiled into the app.
        val key = prop("ZING_SUPABASE_PUBLISHABLE_KEY")
        require(!key.startsWith("sb_secret_") && !key.contains("service_role")) {
            "ZING_SUPABASE_PUBLISHABLE_KEY must be the PUBLIC publishable key, never a secret key."
        }
    }

    signingConfigs {
        if (hasUploadKey) {
            create("upload") {
                storeFile = File(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasUploadKey) signingConfig = signingConfigs.getByName("upload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    androidResources {
        localeFilters += listOf("en")
    }

    // The website's pictures (3D icons, avatars, school crests) are bundled straight from its own folder, so the two
    // apps always show the same ones and nothing is copied into the repository twice.
    sourceSets["main"].assets.srcDirs("src/main/assets", "../../assets/img")

    packaging {
        resources.excludes += setOf("/META-INF/{AL2.0,LGPL2.1}", "/META-INF/versions/9/OSGI-INF/MANIFEST.MF")
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
            all {
                it.maxHeapSize = "2g"
                it.systemProperty("robolectric.graphicsMode", "NATIVE")
                // Optional: where Robolectric downloads its Android runtime from (a mirror, for machines that can't
                // reach Maven Central directly). Set zing.robolectricRepo in ~/.gradle/gradle.properties.
                (project.findProperty("zing.robolectricRepo") as String?)?.let { url -> it.systemProperty("robolectric.dependency.repo.url", url) }
            }
        }
    }

    lint {
        abortOnError = true
        checkReleaseBuilds = true
        warningsAsErrors = false
        htmlReport = true
        textReport = true
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        freeCompilerArgs.addAll("-opt-in=kotlin.RequiresOptIn")
    }
}

roborazzi {
    // reference screenshots live with the tests so a change in how a screen looks shows up in review
    outputDir.set(file("src/test/screenshots"))
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
    arg("room.generateKotlin", "true")
}

dependencies {
    implementation(project(":core"))

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)

    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.material3.adaptive.navigation.suite)
    implementation(libs.compose.material.icons)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)

    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.process)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.androidx.work.runtime)
    implementation(libs.androidx.credentials)
    implementation(libs.androidx.credentials.play)
    implementation(libs.googleid)
    implementation(libs.billing)
    implementation(libs.androidx.profileinstaller)
    implementation(libs.okhttp)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)
    implementation(libs.coil.gif)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.junit)
    testImplementation(composeBom)
    testImplementation(libs.compose.ui.test.junit4)
    testImplementation(libs.androidx.room.testing)
    testImplementation(libs.androidx.work.testing)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(libs.roborazzi.junit.rule)
}
