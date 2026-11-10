package com.josh.zing.auth

import android.app.Activity
import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.josh.zing.BuildConfig

sealed interface GoogleResult {
    data class Token(val idToken: String) : GoogleResult
    data object Cancelled : GoogleResult
    data class Failed(val message: String) : GoogleResult
}

/**
 * Google sign-in through Android's Credential Manager. The ID token is asked for the *web* OAuth client that
 * Supabase's Google provider uses, with a hashed nonce, and is handed straight to Supabase. It is never stored.
 */
object GoogleSignIn {
    /** Hidden until the web client ID is set in gradle.properties (see docs/android/CONFIGURATION.md). */
    val configured: Boolean get() = BuildConfig.GOOGLE_WEB_CLIENT_ID.endsWith(".apps.googleusercontent.com")

    suspend fun idToken(activity: Activity, hashedNonce: String): GoogleResult {
        if (!configured) return GoogleResult.Failed("Google sign-in isn't set up in this build yet.")
        val manager = CredentialManager.create(activity)
        suspend fun ask(request: GetCredentialRequest): GoogleResult {
            val credential = manager.getCredential(activity, request).credential
            return if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                GoogleResult.Token(GoogleIdTokenCredential.createFrom(credential.data).idToken)
            } else {
                GoogleResult.Failed("That wasn't a Google account. Try again.")
            }
        }
        return try {
            try {
                // the account chooser sheet; an account already used with Zing is offered first
                ask(GetCredentialRequest.Builder().addCredentialOption(
                    GetGoogleIdOption.Builder().setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID).setFilterByAuthorizedAccounts(false).setAutoSelectEnabled(false).setNonce(hashedNonce).build(),
                ).build())
            } catch (e: NoCredentialException) {
                // no Google account on the phone yet: the full "Sign in with Google" flow lets the student add one
                ask(GetCredentialRequest.Builder().addCredentialOption(
                    GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID).setNonce(hashedNonce).build(),
                ).build())
            }
        } catch (e: GetCredentialCancellationException) {
            GoogleResult.Cancelled
        } catch (e: GetCredentialException) {
            GoogleResult.Failed("Google sign-in didn't finish. Check that Google Play services is up to date, then try again.")
        } catch (e: IllegalArgumentException) {
            GoogleResult.Failed("Google sign-in didn't finish. Try again.") // a malformed token from the provider
        }
    }

    /** Tells the system this app no longer has a signed-in Google user, so the next sign-in shows the chooser. */
    suspend fun clear(context: Context) {
        runCatching { CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest()) }
    }
}
