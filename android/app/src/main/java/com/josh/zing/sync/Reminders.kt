package com.josh.zing.sync

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.zing.core.web.Progress
import com.josh.zing.MainActivity
import com.josh.zing.R
import com.josh.zing.ZingApp
import kotlinx.coroutines.flow.first
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.concurrent.TimeUnit

/**
 * The optional daily study reminder. It only speaks up when reminders are on, notifications are allowed, and the
 * student hasn't studied yet today. The notification says nothing personal.
 */
class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = (applicationContext as? ZingApp)?.container ?: return Result.success()
        if (!container.settings.prefs.first().studyReminders) return Result.success()
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return Result.success()
        if (Progress.dayKey(LocalDate.now()) in container.study.current().days) return Result.success()
        val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(NotificationChannel(CHANNEL, applicationContext.getString(R.string.reminder_channel), NotificationManager.IMPORTANCE_DEFAULT).apply { description = applicationContext.getString(R.string.reminder_channel_description) })
        val open = PendingIntent.getActivity(applicationContext, 0, Intent(applicationContext, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        manager.notify(1, NotificationCompat.Builder(applicationContext, CHANNEL).setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(applicationContext.getString(R.string.reminder_title))
            .setContentText(applicationContext.getString(R.string.reminder_text)).setContentIntent(open).setAutoCancel(true).build())
        return Result.success()
    }

    companion object {
        private const val CHANNEL = "study"
        private const val WORK = "zing-reminder"

        /** Schedules (or cancels) the reminder for about 5 pm each day. */
        fun set(context: Context, on: Boolean) {
            runCatching {
                val wm = WorkManager.getInstance(context)
                if (!on) { wm.cancelUniqueWork(WORK); return }
                val now = LocalDateTime.now()
                var first = now.withHour(17).withMinute(0).withSecond(0)
                if (!first.isAfter(now)) first = first.plusDays(1)
                wm.enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE,
                    PeriodicWorkRequestBuilder<ReminderWorker>(24, TimeUnit.HOURS).setInitialDelay(Duration.between(now, first).toMinutes(), TimeUnit.MINUTES).build())
            }
        }
    }
}
