package com.josh.zing.data.remote

import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.random.Random

/**
 * Something the server refused. [code] is the server's own code (a Postgres SQLSTATE, a Supabase auth error code or
 * an Edge Function error); [message] is safe to show to a student. Never contains tokens or request bodies.
 */
class ApiException(val code: String, val status: Int, message: String, val data: JsonObject? = null) : IOException(message) {
    /** The database function or Edge Function isn't deployed (the migration hasn't been applied yet). */
    val notDeployed: Boolean get() = code == "PGRST202" || (status == 404 && code in setOf("NOT_FOUND", "404", "function_not_found"))
    val unauthorized: Boolean get() = status == 401 || code == "PGRST301" || code == "PGRST303"
}

/** No connection, a timeout, or the server is having trouble. Worth trying again later. */
class OfflineException(cause: Throwable? = null) : IOException("You're offline. Check your connection and try again.", cause)

data class HttpResult(val status: Int, val body: String, val retryAfter: Long?)

/**
 * The one place HTTP happens. Requests are cancellable, never logged, and only ever go to the configured Supabase
 * project over HTTPS.
 */
class Http(private val client: OkHttpClient = defaultClient()) {
    val json = Json { ignoreUnknownKeys = true; explicitNulls = false; isLenient = true }

    suspend fun send(request: Request): HttpResult = suspendCancellableCoroutine { cont ->
        val call = client.newCall(request)
        cont.invokeOnCancellation { runCatching { call.cancel() } }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) { if (cont.isActive) cont.resumeWithException(OfflineException(e)) }
            override fun onResponse(call: Call, response: Response) {
                val result = runCatching {
                    response.use { r -> HttpResult(r.code, r.body.string(), r.header("Retry-After")?.toLongOrNull()) }
                }
                if (!cont.isActive) return
                result.fold({ cont.resume(it) }, { cont.resumeWithException(OfflineException(it)) })
            }
        })
    }

    /**
     * Sends [build]'s request, trying again (with growing, jittered pauses) when the network fails or the server
     * answers 429 / 5xx. Only used for requests that are safe to repeat.
     */
    suspend fun sendWithRetry(attempts: Int = 3, build: suspend () -> Request): HttpResult {
        var last: IOException? = null
        repeat(attempts) { i ->
            try {
                val r = send(build())
                if (r.status != 429 && r.status < 500) return r
                if (i == attempts - 1) return r
                delay(r.retryAfter?.coerceIn(1, 20)?.times(1000) ?: backoff(i))
            } catch (e: OfflineException) {
                last = e
                if (i < attempts - 1) delay(backoff(i))
            }
        }
        throw last ?: OfflineException()
    }

    private fun backoff(attempt: Int): Long = (400L shl attempt) + Random.nextLong(0, 250)

    fun parse(body: String): JsonElement = if (body.isBlank()) JsonNull else runCatching { json.parseToJsonElement(body) }.getOrDefault(JsonNull)

    companion object {
        val JSON = "application/json; charset=utf-8".toMediaType()
        fun body(e: JsonElement) = e.toString().toRequestBody(JSON)

        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(12, TimeUnit.SECONDS).readTimeout(30, TimeUnit.SECONDS).writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(120, TimeUnit.SECONDS).followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(true)
            .build()

        internal fun str(o: JsonObject?, key: String): String? = (o?.get(key) as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content
    }
}
