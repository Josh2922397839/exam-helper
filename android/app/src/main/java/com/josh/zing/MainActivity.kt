package com.josh.zing

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.josh.zing.ui.AppViewModel
import com.josh.zing.ui.Gate
import com.josh.zing.ui.ZingRoot
import com.josh.zing.ui.components.LocalContainer
import com.josh.zing.ui.theme.ZingTheme

class MainActivity : ComponentActivity() {
    private lateinit var app: AppViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as ZingApp).container
        app = ViewModelProvider(this, viewModelFactory { initializer { AppViewModel(container) } })[AppViewModel::class.java]
        splash.setKeepOnScreenCondition { app.gate.value == Gate.LOADING }
        // a link that started the app (only the first time: a rotation must not open it again)
        if (savedInstanceState == null) app.onLink(intent?.dataString)
        setContent {
            val appearance by app.appearance.collectAsStateWithLifecycle()
            CompositionLocalProvider(LocalContainer provides container) {
                ZingTheme(appearance) { ZingRoot(app) }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        app.onLink(intent.dataString)
    }
}
