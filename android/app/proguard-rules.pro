# kotlinx.serialization: keep generated serializers for the app's and core's models.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class **$$serializer { *; }
-keepclasseswithmembers class com.josh.zing.** { kotlinx.serialization.KSerializer serializer(...); }
-keepclasseswithmembers class app.zing.core.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class com.josh.zing.**$$serializer { *; }
-keep,includedescriptorclasses class app.zing.core.**$$serializer { *; }
# Credential Manager's Google ID option is created reflectively by the Play services provider.
-if class androidx.credentials.CredentialManager
-keep class androidx.credentials.playservices.** { *; }
