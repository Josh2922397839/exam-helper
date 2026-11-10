package com.josh.zing.billing

import android.app.Activity
import android.content.Context
import app.zing.core.billing.PlayAccount
import app.zing.core.billing.PurchaseOutcome
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClient.BillingResponseCode
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.acknowledgePurchase
import com.android.billingclient.api.queryProductDetails
import com.android.billingclient.api.queryPurchasesAsync
import com.josh.zing.data.remote.ApiException
import com.josh.zing.data.remote.OfflineException
import com.josh.zing.data.remote.SessionManager
import com.josh.zing.data.remote.ZingApi
import com.josh.zing.sync.SyncEngine
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** One way to pay for Zing Plus, exactly as Google Play describes it. Prices are Play's own text, never ours. */
data class PlusOffer(val basePlanId: String, val offerToken: String, val price: String, val period: String, val freeTrial: String?)

/**
 * Google Play Billing for Zing Plus.
 *
 * The app never decides that someone has Plus. A purchase is sent to the `play-verify` function, which checks it
 * with Google, records it and acknowledges it; the app then shows what the server says. If the server can't be
 * reached, the purchase stays unacknowledged and is retried on the next start (Google refunds purchases that are
 * never acknowledged, so nobody pays for something they didn't get).
 */
class Billing(
    private val context: Context,
    private val api: ZingApi,
    private val sync: SyncEngine,
    private val sessions: SessionManager,
    private val scope: CoroutineScope,
    val productId: String,
) {
    private val _outcomes = MutableSharedFlow<PurchaseOutcome>(extraBufferCapacity = 4)
    val outcomes: SharedFlow<PurchaseOutcome> = _outcomes
    private var details: ProductDetails? = null
    private var deferredRequested = false

    private val listener = PurchasesUpdatedListener { result, purchases ->
        when (result.responseCode) {
            BillingResponseCode.OK -> if (purchases.isNullOrEmpty()) { if (deferredRequested) _outcomes.tryEmit(PurchaseOutcome.DEFERRED) } else scope.launch { purchases.forEach { _outcomes.emit(process(it)) } }
            else -> _outcomes.tryEmit(outcome(result))
        }
        deferredRequested = false
    }

    private val client: BillingClient by lazy {
        BillingClient.newBuilder(context).setListener(listener)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build()
    }

    private fun outcome(r: BillingResult): PurchaseOutcome = when (r.responseCode) {
        BillingResponseCode.OK -> PurchaseOutcome.SUCCESS
        BillingResponseCode.USER_CANCELED -> PurchaseOutcome.CANCELED
        BillingResponseCode.ITEM_ALREADY_OWNED -> PurchaseOutcome.ALREADY_OWNED
        BillingResponseCode.ITEM_UNAVAILABLE -> PurchaseOutcome.UNAVAILABLE
        BillingResponseCode.BILLING_UNAVAILABLE, BillingResponseCode.FEATURE_NOT_SUPPORTED -> PurchaseOutcome.BILLING_UNAVAILABLE
        BillingResponseCode.NETWORK_ERROR, BillingResponseCode.SERVICE_UNAVAILABLE, BillingResponseCode.SERVICE_DISCONNECTED, BillingResponseCode.SERVICE_TIMEOUT -> PurchaseOutcome.NETWORK
        else -> PurchaseOutcome.FAILED
    }

    private suspend fun connect(): BillingResult? = runCatching {
        if (client.isReady) return@runCatching null
        suspendCancellableCoroutine<BillingResult?> { cont ->
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) { if (cont.isActive) cont.resume(result.takeIf { it.responseCode != BillingResponseCode.OK }) }
                override fun onBillingServiceDisconnected() { /* the library reconnects by itself */ }
            })
        }
    }.getOrElse { BillingResult.newBuilder().setResponseCode(BillingResponseCode.BILLING_UNAVAILABLE).build() }

    /** The plans Google Play offers this student, or why they can't be shown. The rest of the app works either way. */
    suspend fun offers(): Result<List<PlusOffer>> {
        connect()?.let { return Result.failure(BillingProblem(outcome(it))) }
        val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(
            QueryProductDetailsParams.Product.newBuilder().setProductId(productId).setProductType(BillingClient.ProductType.SUBS).build(),
        )).build()
        val result = runCatching { client.queryProductDetails(params) }.getOrElse { return Result.failure(BillingProblem(PurchaseOutcome.BILLING_UNAVAILABLE)) }
        if (result.billingResult.responseCode != BillingResponseCode.OK) return Result.failure(BillingProblem(outcome(result.billingResult)))
        val product = result.productDetailsList?.firstOrNull() ?: return Result.failure(BillingProblem(PurchaseOutcome.UNAVAILABLE))
        details = product
        val offers = product.subscriptionOfferDetails.orEmpty().map { o ->
            val phases = o.pricingPhases.pricingPhaseList
            val paid = phases.lastOrNull { it.priceAmountMicros > 0 } ?: phases.last()
            PlusOffer(o.basePlanId, o.offerToken, paid.formattedPrice, paid.billingPeriod, phases.firstOrNull { it.priceAmountMicros == 0L }?.billingPeriod)
        }
        // one offer per base plan: the one with a free trial if Google offers the student one
        return Result.success(offers.groupBy { it.basePlanId }.map { (_, list) -> list.firstOrNull { it.freeTrial != null } ?: list.first() }.sortedBy { it.period })
    }

    /**
     * Starts Google Play's purchase screen. The account is identified to Google only by a one-way hash.
     * Returns a problem straight away if the screen couldn't be shown; otherwise the result arrives in [outcomes].
     */
    suspend fun buy(activity: Activity, offer: PlusOffer): PurchaseOutcome? {
        val product = details ?: return PurchaseOutcome.UNAVAILABLE
        val userId = sessions.load()?.userId ?: return PurchaseOutcome.FAILED
        val flow = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(offer.offerToken).build()))
            .setObfuscatedAccountId(PlayAccount.obfuscatedId(userId))
        // already subscribed on another plan: switch plans instead of buying a second subscription
        val current = owned().firstOrNull { it.purchaseState == Purchase.PurchaseState.PURCHASED }
        if (current != null) {
            val upgrade = offer.period.contains("Y")
            deferredRequested = !upgrade
            flow.setSubscriptionUpdateParams(
                BillingFlowParams.SubscriptionUpdateParams.newBuilder().setOldPurchaseToken(current.purchaseToken)
                    .setSubscriptionReplacementMode(if (upgrade) BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.CHARGE_PRORATED_PRICE else BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.DEFERRED).build(),
            )
        }
        val result = client.launchBillingFlow(activity, flow.build())
        return if (result.responseCode == BillingResponseCode.OK) null else outcome(result)
    }

    private suspend fun owned(): List<Purchase> {
        if (connect() != null) return emptyList()
        return runCatching { client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()).purchasesList }.getOrDefault(emptyList())
    }

    /** Sends one purchase to the server. Only a purchase the server has recorded is acknowledged. */
    private suspend fun process(purchase: Purchase): PurchaseOutcome {
        if (purchase.purchaseState == Purchase.PurchaseState.PENDING) return PurchaseOutcome.PENDING
        if (purchase.purchaseState != Purchase.PurchaseState.PURCHASED) return PurchaseOutcome.FAILED
        return try {
            val entitlement = api.verifyPurchase(purchase.products.firstOrNull() ?: productId, purchase.purchaseToken)
            sync.storeEntitlement(entitlement)
            // the server acknowledges with Google; this only covers the case where that call was lost
            if (!purchase.isAcknowledged && entitlement.state in setOf("active", "grace", "canceled_active")) {
                runCatching { client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()) }
            }
            if (entitlement.state == "pending") PurchaseOutcome.PENDING else PurchaseOutcome.SUCCESS
        } catch (e: OfflineException) {
            PurchaseOutcome.NETWORK
        } catch (e: ApiException) {
            if (e.notDeployed) PurchaseOutcome.UNAVAILABLE else PurchaseOutcome.FAILED
        }
    }

    /** "Restore purchases", and the check made when the app starts: re-sends what Google says this account owns. */
    suspend fun restore(): PurchaseOutcome {
        val purchases = owned()
        if (purchases.isEmpty()) return PurchaseOutcome.UNAVAILABLE
        val results = purchases.map { process(it) }
        return results.firstOrNull { it == PurchaseOutcome.SUCCESS } ?: results.first()
    }

    /** Google Play's own page for managing or cancelling the subscription. */
    fun manageUrl(): String = "https://play.google.com/store/account/subscriptions?sku=$productId&package=${context.packageName}"

    companion object {
        fun message(o: PurchaseOutcome): String = when (o) {
            PurchaseOutcome.SUCCESS -> "You're on Zing Plus. Thank you!"
            PurchaseOutcome.PENDING -> "Your payment is still being confirmed by Google Play. Plus switches on as soon as it goes through; you don't need to do anything."
            PurchaseOutcome.CANCELED -> "No problem: nothing was charged."
            PurchaseOutcome.ALREADY_OWNED -> "This Google account already has Zing Plus. Tap Restore purchases."
            PurchaseOutcome.UNAVAILABLE -> "Zing Plus isn't available here yet."
            PurchaseOutcome.BILLING_UNAVAILABLE -> "Google Play purchases aren't available on this device. Everything else in Zing still works."
            PurchaseOutcome.NETWORK -> "Couldn't reach Google Play or Zing. Your purchase is safe and will be checked again when you're back online."
            PurchaseOutcome.DEFERRED -> "Your plan will change at the end of the current period."
            PurchaseOutcome.FAILED -> "That didn't go through and you weren't charged. Try again."
        }
    }
}

class BillingProblem(val outcome: PurchaseOutcome) : Exception(Billing.message(outcome))
