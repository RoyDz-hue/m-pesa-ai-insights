# MTran Android App - Complete Development Guide

This document contains ALL the code and instructions needed to build the native Android app for capturing M-PESA SMS messages and notifications.

---

## Table of Contents
1. [Project Setup](#1-project-setup)
2. [Gradle Dependencies](#2-gradle-dependencies)
3. [AndroidManifest.xml](#3-androidmanifestxml)
4. [Data Models](#4-data-models)
5. [Room Database](#5-room-database)
6. [API Client](#6-api-client)
7. [SMS BroadcastReceiver](#7-sms-broadcastreceiver)
8. [NotificationListenerService](#8-notificationlistenerservice)
9. [Background Sync Service](#9-background-sync-service)
10. [Permission Handler](#10-permission-handler)
11. [Main Activity](#11-main-activity)
12. [Foreground Service](#12-foreground-service)
13. [App Configuration](#13-app-configuration)
14. [API Endpoints Reference](#14-api-endpoints-reference)

---

## 1. Project Setup

### Android Studio Setup
1. Create new project: **Empty Activity**
2. Language: **Kotlin**
3. Minimum SDK: **API 26 (Android 8.0)**
4. Package name: `app.lovable.fdff236544a54e8799396d5741e351a1`

---

## 2. Gradle Dependencies

### build.gradle.kts (Project level)
```kotlin
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.21" apply false
    id("com.google.devtools.ksp") version "1.9.21-1.0.15" apply false
}
```

### build.gradle.kts (App level)
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.devtools.ksp")
}

android {
    namespace = "app.lovable.fdff236544a54e8799396d5741e351a1"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.lovable.fdff236544a54e8799396d5741e351a1"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField("String", "SUPABASE_URL", "\"https://bonpqttgwunghfkgsiul.supabase.co\"")
        buildConfigField("String", "SUPABASE_ANON_KEY", "\"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        viewBinding = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.activity:activity-ktx:1.8.2")
    
    // Room Database
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")
    
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    
    // WorkManager for background sync
    implementation("androidx.work:work-runtime-ktx:2.9.0")
    
    // DataStore for preferences
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    
    // Gson
    implementation("com.google.code.gson:gson:2.10.1")
}
```

---

## 3. AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:name=".MTranApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.MTran"
        android:networkSecurityConfig="@xml/network_security_config"
        tools:targetApi="34">

        <!-- Main Activity -->
        <activity
            android:name=".ui.MainActivity"
            android:exported="true"
            android:theme="@style/Theme.MTran">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- SMS Receiver -->
        <receiver
            android:name=".receivers.MpesaSmsReceiver"
            android:enabled="true"
            android:exported="true"
            android:permission="android.permission.BROADCAST_SMS">
            <intent-filter android:priority="999">
                <action android:name="android.provider.Telephony.SMS_RECEIVED" />
            </intent-filter>
        </receiver>

        <!-- Boot Receiver -->
        <receiver
            android:name=".receivers.BootReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

        <!-- Notification Listener Service -->
        <service
            android:name=".services.MpesaNotificationListenerService"
            android:exported="true"
            android:label="MTran Notification Access"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <!-- Foreground Sync Service -->
        <service
            android:name=".services.SyncForegroundService"
            android:exported="false"
            android:foregroundServiceType="dataSync" />

    </application>

</manifest>
```

### res/xml/network_security_config.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">bonpqttgwunghfkgsiul.supabase.co</domain>
    </domain-config>
</network-security-config>
```

---

## 4. Data Models

### data/models/MpesaTransaction.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.models

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.google.gson.annotations.SerializedName

@Entity(tableName = "mpesa_transactions")
data class MpesaTransaction(
    @PrimaryKey
    val id: String = java.util.UUID.randomUUID().toString(),
    
    @SerializedName("client_id")
    val clientId: String,
    
    @SerializedName("client_tx_id")
    val clientTxId: String,
    
    @SerializedName("raw_message")
    val rawMessage: String,
    
    @SerializedName("transaction_timestamp")
    val transactionTimestamp: Long,
    
    @SerializedName("transaction_type")
    val transactionType: String = "Unknown",
    
    @SerializedName("transaction_code")
    val transactionCode: String? = null,
    
    val amount: Double? = null,
    val balance: Double? = null,
    val sender: String? = null,
    val recipient: String? = null,
    val status: String = "pending_upload",
    
    @SerializedName("ai_metadata")
    val aiMetadata: String = "{}",
    
    @SerializedName("parsed_data")
    val parsedData: String? = null,
    
    // Local tracking fields
    val syncStatus: SyncStatus = SyncStatus.PENDING,
    val retryCount: Int = 0,
    val lastSyncAttempt: Long? = null,
    val createdAt: Long = System.currentTimeMillis()
)

enum class SyncStatus {
    PENDING,
    SYNCING,
    SYNCED,
    FAILED
}

enum class TransactionType {
    Paybill,
    Till,
    SendMoney,
    Withdrawal,
    Deposit,
    Airtime,
    BankToMpesa,
    MpesaToBank,
    Reversal,
    Unknown
}
```

### data/models/MobileClient.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.models

import com.google.gson.annotations.SerializedName

data class MobileClient(
    val id: String? = null,
    
    @SerializedName("device_id")
    val deviceId: String,
    
    @SerializedName("device_name")
    val deviceName: String? = null,
    
    @SerializedName("device_model")
    val deviceModel: String? = null,
    
    @SerializedName("os_version")
    val osVersion: String? = null,
    
    @SerializedName("app_version")
    val appVersion: String? = null,
    
    @SerializedName("is_active")
    val isActive: Boolean = true,
    
    @SerializedName("last_sync_at")
    val lastSyncAt: String? = null
)

data class AuthRequest(
    val action: String,
    
    @SerializedName("device_id")
    val deviceId: String,
    
    @SerializedName("device_name")
    val deviceName: String? = null,
    
    @SerializedName("device_model")
    val deviceModel: String? = null,
    
    @SerializedName("os_version")
    val osVersion: String? = null,
    
    @SerializedName("app_version")
    val appVersion: String? = null,
    
    val signature: String? = null
)

data class AuthResponse(
    val success: Boolean,
    val token: String? = null,
    val clientId: String? = null,
    val message: String? = null
)
```

### data/models/ParsedTransaction.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.models

import com.google.gson.annotations.SerializedName

data class ParsedTransaction(
    @SerializedName("transaction_type")
    val transactionType: String,
    
    @SerializedName("transaction_code")
    val transactionCode: String?,
    
    val amount: Double?,
    val balance: Double?,
    val sender: String?,
    val recipient: String?,
    
    @SerializedName("sender_phone")
    val senderPhone: String?,
    
    @SerializedName("recipient_phone")
    val recipientPhone: String?,
    
    @SerializedName("transaction_date")
    val transactionDate: String?,
    
    @SerializedName("transaction_time")
    val transactionTime: String?,
    
    @SerializedName("transaction_cost")
    val transactionCost: Double?,
    
    @SerializedName("paybill_number")
    val paybillNumber: String?,
    
    @SerializedName("account_number")
    val accountNumber: String?,
    
    @SerializedName("till_number")
    val tillNumber: String?,
    
    @SerializedName("agent_number")
    val agentNumber: String?
)

data class AiMetadata(
    val model: String,
    val version: String,
    
    @SerializedName("prompt_id")
    val promptId: String,
    
    val confidence: Double,
    val tags: List<String> = emptyList(),
    val flags: List<String> = emptyList(),
    val explanation: String? = null
)
```

### data/models/CleanMpesaRequest.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.models

import com.google.gson.annotations.SerializedName

data class CleanMpesaRequest(
    @SerializedName("raw_message")
    val rawMessage: String,
    
    @SerializedName("client_id")
    val clientId: String,
    
    @SerializedName("client_tx_id")
    val clientTxId: String,
    
    @SerializedName("transaction_timestamp")
    val transactionTimestamp: Long
)

data class CleanMpesaResponse(
    val success: Boolean,
    val transaction: TransactionResponse? = null,
    val error: String? = null,
    val duplicate: Boolean = false,
    
    @SerializedName("duplicate_of")
    val duplicateOf: String? = null
)

data class TransactionResponse(
    val id: String,
    
    @SerializedName("transaction_type")
    val transactionType: String,
    
    @SerializedName("transaction_code")
    val transactionCode: String?,
    
    val amount: Double?,
    val balance: Double?,
    val status: String,
    
    @SerializedName("ai_metadata")
    val aiMetadata: AiMetadata?
)
```

---

## 5. Room Database

### data/database/MpesaDatabase.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.MpesaTransaction

@Database(
    entities = [MpesaTransaction::class],
    version = 1,
    exportSchema = false
)
abstract class MpesaDatabase : RoomDatabase() {
    
    abstract fun transactionDao(): TransactionDao
    
    companion object {
        @Volatile
        private var INSTANCE: MpesaDatabase? = null
        
        fun getInstance(context: Context): MpesaDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    MpesaDatabase::class.java,
                    "mpesa_database"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
```

### data/database/TransactionDao.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.database

import androidx.room.*
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.MpesaTransaction
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {
    
    @Query("SELECT * FROM mpesa_transactions ORDER BY createdAt DESC")
    fun getAllTransactions(): Flow<List<MpesaTransaction>>
    
    @Query("SELECT * FROM mpesa_transactions WHERE syncStatus = :status ORDER BY createdAt ASC")
    suspend fun getTransactionsByStatus(status: SyncStatus): List<MpesaTransaction>
    
    @Query("SELECT * FROM mpesa_transactions WHERE syncStatus IN (:statuses) ORDER BY createdAt ASC LIMIT :limit")
    suspend fun getPendingTransactions(
        statuses: List<SyncStatus> = listOf(SyncStatus.PENDING, SyncStatus.FAILED),
        limit: Int = 50
    ): List<MpesaTransaction>
    
    @Query("SELECT * FROM mpesa_transactions WHERE id = :id")
    suspend fun getTransactionById(id: String): MpesaTransaction?
    
    @Query("SELECT * FROM mpesa_transactions WHERE clientTxId = :clientTxId")
    suspend fun getTransactionByClientTxId(clientTxId: String): MpesaTransaction?
    
    @Query("SELECT * FROM mpesa_transactions WHERE rawMessage = :rawMessage LIMIT 1")
    suspend fun getTransactionByRawMessage(rawMessage: String): MpesaTransaction?
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(transaction: MpesaTransaction)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(transactions: List<MpesaTransaction>)
    
    @Update
    suspend fun update(transaction: MpesaTransaction)
    
    @Query("UPDATE mpesa_transactions SET syncStatus = :status, lastSyncAttempt = :timestamp WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: SyncStatus, timestamp: Long = System.currentTimeMillis())
    
    @Query("UPDATE mpesa_transactions SET syncStatus = :status, retryCount = retryCount + 1, lastSyncAttempt = :timestamp WHERE id = :id")
    suspend fun incrementRetryCount(id: String, status: SyncStatus, timestamp: Long = System.currentTimeMillis())
    
    @Delete
    suspend fun delete(transaction: MpesaTransaction)
    
    @Query("DELETE FROM mpesa_transactions WHERE syncStatus = :status AND createdAt < :before")
    suspend fun deleteOldSyncedTransactions(
        status: SyncStatus = SyncStatus.SYNCED,
        before: Long = System.currentTimeMillis() - (30L * 24 * 60 * 60 * 1000) // 30 days
    )
    
    @Query("SELECT COUNT(*) FROM mpesa_transactions WHERE syncStatus = :status")
    suspend fun getCountByStatus(status: SyncStatus): Int
    
    @Query("SELECT COUNT(*) FROM mpesa_transactions")
    suspend fun getTotalCount(): Int
}
```

---

## 6. API Client

### data/api/SupabaseApi.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.api

import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.AuthRequest
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.AuthResponse
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.CleanMpesaRequest
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.CleanMpesaResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

interface SupabaseApi {
    
    @POST("functions/v1/auth-proxy")
    suspend fun authenticate(
        @Body request: AuthRequest,
        @Header("apikey") apiKey: String
    ): Response<AuthResponse>
    
    @POST("functions/v1/clean-mpesa")
    suspend fun processTransaction(
        @Body request: CleanMpesaRequest,
        @Header("apikey") apiKey: String,
        @Header("Authorization") authorization: String
    ): Response<CleanMpesaResponse>
}
```

### data/api/ApiClient.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.api

import app.lovable.fdff236544a54e8799396d5741e351a1.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.SUPABASE_URL + "/")
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val supabaseApi: SupabaseApi = retrofit.create(SupabaseApi::class.java)
    
    fun getAnonKey(): String = BuildConfig.SUPABASE_ANON_KEY
}
```

---

## 7. SMS BroadcastReceiver

### receivers/MpesaSmsReceiver.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import app.lovable.fdff236544a54e8799396d5741e351a1.data.database.MpesaDatabase
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.MpesaTransaction
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.SyncStatus
import app.lovable.fdff236544a54e8799396d5741e351a1.data.repository.AuthRepository
import app.lovable.fdff236544a54e8799396d5741e351a1.services.SyncManager
import app.lovable.fdff236544a54e8799396d5741e351a1.utils.MpesaParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

class MpesaSmsReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "MpesaSmsReceiver"
        
        // M-PESA sender addresses
        private val MPESA_SENDERS = listOf(
            "MPESA",
            "M-PESA",
            "Safaricom",
            "SAFARICOM"
        )
    }
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }
        
        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        
        messages?.forEach { smsMessage ->
            val sender = smsMessage.displayOriginatingAddress ?: smsMessage.originatingAddress
            val body = smsMessage.messageBody
            val timestamp = smsMessage.timestampMillis
            
            Log.d(TAG, "SMS received from: $sender")
            
            // Check if it's from M-PESA
            if (isMpesaMessage(sender)) {
                Log.d(TAG, "M-PESA message detected: ${body.take(50)}...")
                processMessage(context, body, timestamp)
            }
        }
    }
    
    private fun isMpesaMessage(sender: String?): Boolean {
        return sender?.let { s ->
            MPESA_SENDERS.any { mpesaSender ->
                s.contains(mpesaSender, ignoreCase = true)
            }
        } ?: false
    }
    
    private fun processMessage(context: Context, rawMessage: String, timestamp: Long) {
        scope.launch {
            try {
                val database = MpesaDatabase.getInstance(context)
                val authRepository = AuthRepository(context)
                
                // Check for duplicate by raw message
                val existingTransaction = database.transactionDao()
                    .getTransactionByRawMessage(rawMessage)
                
                if (existingTransaction != null) {
                    Log.d(TAG, "Duplicate message detected, skipping")
                    return@launch
                }
                
                // Get client ID
                val clientId = authRepository.getClientId() ?: run {
                    Log.e(TAG, "No client ID found, registering device first")
                    authRepository.registerDevice()
                    authRepository.getClientId() ?: return@launch
                }
                
                // Local pre-parse for quick pattern matching
                val preParsed = MpesaParser.preParse(rawMessage)
                
                // Create transaction
                val transaction = MpesaTransaction(
                    id = UUID.randomUUID().toString(),
                    clientId = clientId,
                    clientTxId = UUID.randomUUID().toString(),
                    rawMessage = rawMessage,
                    transactionTimestamp = timestamp,
                    transactionType = preParsed.transactionType,
                    transactionCode = preParsed.transactionCode,
                    amount = preParsed.amount,
                    balance = preParsed.balance,
                    status = "pending_upload",
                    syncStatus = SyncStatus.PENDING,
                    createdAt = System.currentTimeMillis()
                )
                
                // Save to local database
                database.transactionDao().insert(transaction)
                Log.d(TAG, "Transaction saved locally: ${transaction.id}")
                
                // Trigger sync
                SyncManager.getInstance(context).triggerSync()
                
            } catch (e: Exception) {
                Log.e(TAG, "Error processing M-PESA message", e)
            }
        }
    }
}
```

### receivers/BootReceiver.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import app.lovable.fdff236544a54e8799396d5741e351a1.services.SyncManager

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "BootReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON") {
            Log.d(TAG, "Boot completed, scheduling sync work")
            SyncManager.getInstance(context).schedulePeriodicSync()
        }
    }
}
```

---

## 8. NotificationListenerService

### services/MpesaNotificationListenerService.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.services

import android.app.Notification
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import app.lovable.fdff236544a54e8799396d5741e351a1.data.database.MpesaDatabase
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.MpesaTransaction
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.SyncStatus
import app.lovable.fdff236544a54e8799396d5741e351a1.data.repository.AuthRepository
import app.lovable.fdff236544a54e8799396d5741e351a1.utils.MpesaParser
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.UUID

class MpesaNotificationListenerService : NotificationListenerService() {
    
    companion object {
        private const val TAG = "MpesaNotificationService"
        
        // M-PESA app package names
        private val MPESA_PACKAGES = listOf(
            "com.safaricom.mpesa",
            "com.safaricom.mpesa.lifestyle",
            "com.safaricom"
        )
    }
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        val packageName = sbn.packageName
        
        // Check if notification is from M-PESA app
        if (!isMpesaPackage(packageName)) {
            return
        }
        
        val notification = sbn.notification
        val extras = notification.extras
        
        // Extract notification text
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        
        val fullMessage = buildString {
            if (title.isNotBlank()) append(title).append(" ")
            if (bigText.isNotBlank()) {
                append(bigText)
            } else if (text.isNotBlank()) {
                append(text)
            }
        }.trim()
        
        if (fullMessage.isBlank()) {
            return
        }
        
        // Check if it looks like a transaction notification
        if (MpesaParser.isMpesaTransaction(fullMessage)) {
            Log.d(TAG, "M-PESA notification detected: ${fullMessage.take(50)}...")
            processNotification(fullMessage, sbn.postTime)
        }
    }
    
    private fun isMpesaPackage(packageName: String): Boolean {
        return MPESA_PACKAGES.any { it.equals(packageName, ignoreCase = true) }
    }
    
    private fun processNotification(rawMessage: String, timestamp: Long) {
        scope.launch {
            try {
                val database = MpesaDatabase.getInstance(applicationContext)
                val authRepository = AuthRepository(applicationContext)
                
                // Check for duplicate
                val existingTransaction = database.transactionDao()
                    .getTransactionByRawMessage(rawMessage)
                
                if (existingTransaction != null) {
                    Log.d(TAG, "Duplicate notification detected, skipping")
                    return@launch
                }
                
                // Get client ID
                val clientId = authRepository.getClientId() ?: run {
                    Log.e(TAG, "No client ID found, registering device first")
                    authRepository.registerDevice()
                    authRepository.getClientId() ?: return@launch
                }
                
                // Local pre-parse
                val preParsed = MpesaParser.preParse(rawMessage)
                
                // Create transaction
                val transaction = MpesaTransaction(
                    id = UUID.randomUUID().toString(),
                    clientId = clientId,
                    clientTxId = UUID.randomUUID().toString(),
                    rawMessage = rawMessage,
                    transactionTimestamp = timestamp,
                    transactionType = preParsed.transactionType,
                    transactionCode = preParsed.transactionCode,
                    amount = preParsed.amount,
                    balance = preParsed.balance,
                    status = "pending_upload",
                    syncStatus = SyncStatus.PENDING,
                    createdAt = System.currentTimeMillis()
                )
                
                // Save locally
                database.transactionDao().insert(transaction)
                Log.d(TAG, "Transaction from notification saved: ${transaction.id}")
                
                // Trigger sync
                SyncManager.getInstance(applicationContext).triggerSync()
                
            } catch (e: Exception) {
                Log.e(TAG, "Error processing notification", e)
            }
        }
    }
    
    override fun onNotificationRemoved(sbn: StatusBarNotification) {
        // Not needed for our use case
    }
    
    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "Notification listener connected")
    }
    
    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "Notification listener disconnected")
    }
}
```

---

## 9. Background Sync Service

### services/SyncManager.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.services

import android.content.Context
import android.util.Log
import androidx.work.*
import java.util.concurrent.TimeUnit

class SyncManager private constructor(private val context: Context) {
    
    companion object {
        private const val TAG = "SyncManager"
        private const val SYNC_WORK_NAME = "mpesa_sync_work"
        private const val PERIODIC_SYNC_WORK_NAME = "mpesa_periodic_sync"
        
        @Volatile
        private var INSTANCE: SyncManager? = null
        
        fun getInstance(context: Context): SyncManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: SyncManager(context.applicationContext).also {
                    INSTANCE = it
                }
            }
        }
    }
    
    private val workManager = WorkManager.getInstance(context)
    
    /**
     * Trigger an immediate sync
     */
    fun triggerSync() {
        Log.d(TAG, "Triggering immediate sync")
        
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val syncRequest = OneTimeWorkRequestBuilder<SyncWorker>()
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        
        workManager.enqueueUniqueWork(
            SYNC_WORK_NAME,
            ExistingWorkPolicy.KEEP,
            syncRequest
        )
    }
    
    /**
     * Schedule periodic sync (every 15 minutes)
     */
    fun schedulePeriodicSync() {
        Log.d(TAG, "Scheduling periodic sync")
        
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        
        val periodicSyncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
            15, TimeUnit.MINUTES
        )
            .setConstraints(constraints)
            .setBackoffCriteria(
                BackoffPolicy.EXPONENTIAL,
                WorkRequest.MIN_BACKOFF_MILLIS,
                TimeUnit.MILLISECONDS
            )
            .build()
        
        workManager.enqueueUniquePeriodicWork(
            PERIODIC_SYNC_WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicSyncRequest
        )
    }
    
    /**
     * Cancel all sync work
     */
    fun cancelAllSync() {
        workManager.cancelUniqueWork(SYNC_WORK_NAME)
        workManager.cancelUniqueWork(PERIODIC_SYNC_WORK_NAME)
    }
}
```

### services/SyncWorker.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.services

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import app.lovable.fdff236544a54e8799396d5741e351a1.data.api.ApiClient
import app.lovable.fdff236544a54e8799396d5741e351a1.data.database.MpesaDatabase
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.CleanMpesaRequest
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.SyncStatus
import app.lovable.fdff236544a54e8799396d5741e351a1.data.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SyncWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {
    
    companion object {
        private const val TAG = "SyncWorker"
        private const val MAX_RETRY_COUNT = 5
    }
    
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        Log.d(TAG, "Starting sync work")
        
        val database = MpesaDatabase.getInstance(applicationContext)
        val authRepository = AuthRepository(applicationContext)
        val api = ApiClient.supabaseApi
        val apiKey = ApiClient.getAnonKey()
        
        try {
            // Ensure we have a valid token
            val token = authRepository.getToken() ?: run {
                Log.d(TAG, "No token found, authenticating...")
                authRepository.registerDevice()
                authRepository.getToken()
            }
            
            if (token == null) {
                Log.e(TAG, "Failed to get authentication token")
                return@withContext Result.retry()
            }
            
            // Get pending transactions
            val pendingTransactions = database.transactionDao().getPendingTransactions()
            Log.d(TAG, "Found ${pendingTransactions.size} pending transactions")
            
            if (pendingTransactions.isEmpty()) {
                Log.d(TAG, "No pending transactions to sync")
                return@withContext Result.success()
            }
            
            var successCount = 0
            var failCount = 0
            
            for (transaction in pendingTransactions) {
                // Skip if max retries exceeded
                if (transaction.retryCount >= MAX_RETRY_COUNT) {
                    Log.w(TAG, "Transaction ${transaction.id} exceeded max retries, skipping")
                    continue
                }
                
                // Update status to syncing
                database.transactionDao().updateSyncStatus(transaction.id, SyncStatus.SYNCING)
                
                try {
                    val request = CleanMpesaRequest(
                        rawMessage = transaction.rawMessage,
                        clientId = transaction.clientId,
                        clientTxId = transaction.clientTxId,
                        transactionTimestamp = transaction.transactionTimestamp
                    )
                    
                    val response = api.processTransaction(
                        request = request,
                        apiKey = apiKey,
                        authorization = "Bearer $token"
                    )
                    
                    if (response.isSuccessful && response.body()?.success == true) {
                        // Update local transaction with server response
                        val serverResponse = response.body()!!
                        
                        val updatedTransaction = transaction.copy(
                            status = serverResponse.transaction?.status ?: "uploaded",
                            transactionType = serverResponse.transaction?.transactionType ?: transaction.transactionType,
                            transactionCode = serverResponse.transaction?.transactionCode ?: transaction.transactionCode,
                            amount = serverResponse.transaction?.amount ?: transaction.amount,
                            balance = serverResponse.transaction?.balance ?: transaction.balance,
                            syncStatus = SyncStatus.SYNCED
                        )
                        
                        database.transactionDao().update(updatedTransaction)
                        successCount++
                        Log.d(TAG, "Transaction ${transaction.id} synced successfully")
                        
                    } else if (response.body()?.duplicate == true) {
                        // Mark as synced if it's a duplicate
                        database.transactionDao().updateSyncStatus(transaction.id, SyncStatus.SYNCED)
                        successCount++
                        Log.d(TAG, "Transaction ${transaction.id} is a duplicate, marked as synced")
                        
                    } else {
                        // Increment retry count
                        database.transactionDao().incrementRetryCount(transaction.id, SyncStatus.FAILED)
                        failCount++
                        Log.e(TAG, "Failed to sync transaction ${transaction.id}: ${response.body()?.error}")
                    }
                    
                } catch (e: Exception) {
                    database.transactionDao().incrementRetryCount(transaction.id, SyncStatus.FAILED)
                    failCount++
                    Log.e(TAG, "Error syncing transaction ${transaction.id}", e)
                }
            }
            
            Log.d(TAG, "Sync completed: $successCount success, $failCount failed")
            
            // Clean up old synced transactions
            database.transactionDao().deleteOldSyncedTransactions()
            
            if (failCount > 0 && successCount == 0) {
                Result.retry()
            } else {
                Result.success()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Sync work failed", e)
            Result.retry()
        }
    }
}
```

### services/SyncForegroundService.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.services

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import app.lovable.fdff236544a54e8799396d5741e351a1.R
import app.lovable.fdff236544a54e8799396d5741e351a1.ui.MainActivity

class SyncForegroundService : Service() {
    
    companion object {
        private const val CHANNEL_ID = "mtran_sync_channel"
        private const val NOTIFICATION_ID = 1001
        
        fun start(context: Context) {
            val intent = Intent(context, SyncForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stop(context: Context) {
            val intent = Intent(context, SyncForegroundService::class.java)
            context.stopService(intent)
        }
    }
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        
        // Schedule periodic sync
        SyncManager.getInstance(this).schedulePeriodicSync()
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MTran Sync Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps MTran running to capture M-PESA transactions"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MTran Active")
            .setContentText("Monitoring M-PESA transactions")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
```

---

## 10. Permission Handler

### utils/PermissionHandler.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.utils

import android.Manifest
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

object PermissionHandler {
    
    private const val TAG = "PermissionHandler"
    
    const val REQUEST_CODE_SMS = 1001
    const val REQUEST_CODE_NOTIFICATIONS = 1002
    
    /**
     * Get required SMS permissions
     */
    fun getSmsPermissions(): Array<String> {
        return arrayOf(
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS
        )
    }
    
    /**
     * Check if SMS permissions are granted
     */
    fun hasSmsPermissions(context: Context): Boolean {
        return getSmsPermissions().all { permission ->
            ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED
        }
    }
    
    /**
     * Request SMS permissions
     */
    fun requestSmsPermissions(activity: Activity) {
        Log.d(TAG, "Requesting SMS permissions")
        ActivityCompat.requestPermissions(
            activity,
            getSmsPermissions(),
            REQUEST_CODE_SMS
        )
    }
    
    /**
     * Check if notification permission is granted (Android 13+)
     */
    fun hasNotificationPermission(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }
    
    /**
     * Request notification permission (Android 13+)
     */
    fun requestNotificationPermission(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            Log.d(TAG, "Requesting notification permission")
            ActivityCompat.requestPermissions(
                activity,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_CODE_NOTIFICATIONS
            )
        }
    }
    
    /**
     * Check if notification listener is enabled
     */
    fun isNotificationListenerEnabled(context: Context): Boolean {
        val packageName = context.packageName
        val flat = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )
        
        if (!TextUtils.isEmpty(flat)) {
            val names = flat.split(":").toTypedArray()
            for (name in names) {
                val componentName = ComponentName.unflattenFromString(name)
                if (componentName != null && componentName.packageName == packageName) {
                    return true
                }
            }
        }
        return false
    }
    
    /**
     * Open notification listener settings
     */
    fun openNotificationListenerSettings(context: Context) {
        Log.d(TAG, "Opening notification listener settings")
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }
    
    /**
     * Log permission event
     */
    fun logPermissionEvent(context: Context, permission: String, granted: Boolean) {
        val timestamp = System.currentTimeMillis()
        val event = if (granted) "granted" else "denied"
        Log.i(TAG, "Permission $permission $event at $timestamp")
        
        // You can extend this to store permission events locally or send to server
    }
}
```

---

## 11. Main Activity

### ui/MainActivity.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.ui

import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import app.lovable.fdff236544a54e8799396d5741e351a1.R
import app.lovable.fdff236544a54e8799396d5741e351a1.data.database.MpesaDatabase
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.SyncStatus
import app.lovable.fdff236544a54e8799396d5741e351a1.data.repository.AuthRepository
import app.lovable.fdff236544a54e8799396d5741e351a1.databinding.ActivityMainBinding
import app.lovable.fdff236544a54e8799396d5741e351a1.services.SyncForegroundService
import app.lovable.fdff236544a54e8799396d5741e351a1.services.SyncManager
import app.lovable.fdff236544a54e8799396d5741e351a1.utils.PermissionHandler
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {
    
    companion object {
        private const val TAG = "MainActivity"
    }
    
    private lateinit var binding: ActivityMainBinding
    private lateinit var database: MpesaDatabase
    private lateinit var authRepository: AuthRepository
    private lateinit var transactionAdapter: TransactionAdapter
    
    private val smsPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.all { it.value }
        if (allGranted) {
            Log.d(TAG, "SMS permissions granted")
            PermissionHandler.logPermissionEvent(this, "SMS", true)
            checkNotificationListenerPermission()
        } else {
            Log.w(TAG, "SMS permissions denied")
            PermissionHandler.logPermissionEvent(this, "SMS", false)
            showPermissionDeniedDialog("SMS")
        }
        updatePermissionStatus()
    }
    
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            Log.d(TAG, "Notification permission granted")
            PermissionHandler.logPermissionEvent(this, "Notification", true)
        } else {
            Log.w(TAG, "Notification permission denied")
            PermissionHandler.logPermissionEvent(this, "Notification", false)
        }
        updatePermissionStatus()
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        database = MpesaDatabase.getInstance(this)
        authRepository = AuthRepository(this)
        
        setupUI()
        setupObservers()
        registerDevice()
        checkPermissions()
    }
    
    private fun setupUI() {
        // Setup RecyclerView
        transactionAdapter = TransactionAdapter()
        binding.recyclerViewTransactions.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = transactionAdapter
        }
        
        // Setup buttons
        binding.btnGrantPermissions.setOnClickListener {
            requestAllPermissions()
        }
        
        binding.btnSync.setOnClickListener {
            SyncManager.getInstance(this).triggerSync()
            Toast.makeText(this, "Sync triggered", Toast.LENGTH_SHORT).show()
        }
        
        binding.btnStartService.setOnClickListener {
            SyncForegroundService.start(this)
            Toast.makeText(this, "Service started", Toast.LENGTH_SHORT).show()
        }
        
        binding.btnOpenNotificationSettings.setOnClickListener {
            PermissionHandler.openNotificationListenerSettings(this)
        }
    }
    
    private fun setupObservers() {
        // Observe transactions
        lifecycleScope.launch {
            database.transactionDao().getAllTransactions().collectLatest { transactions ->
                transactionAdapter.submitList(transactions)
                binding.textViewTransactionCount.text = "Transactions: ${transactions.size}"
                
                // Update sync stats
                val pending = transactions.count { it.syncStatus == SyncStatus.PENDING }
                val synced = transactions.count { it.syncStatus == SyncStatus.SYNCED }
                val failed = transactions.count { it.syncStatus == SyncStatus.FAILED }
                
                binding.textViewSyncStatus.text = "Pending: $pending | Synced: $synced | Failed: $failed"
            }
        }
    }
    
    private fun registerDevice() {
        lifecycleScope.launch {
            try {
                val clientId = authRepository.getClientId()
                if (clientId == null) {
                    Log.d(TAG, "Registering device...")
                    val success = authRepository.registerDevice()
                    if (success) {
                        Log.d(TAG, "Device registered successfully")
                        binding.textViewDeviceStatus.text = "Device: Registered"
                    } else {
                        Log.e(TAG, "Failed to register device")
                        binding.textViewDeviceStatus.text = "Device: Registration failed"
                    }
                } else {
                    Log.d(TAG, "Device already registered: $clientId")
                    binding.textViewDeviceStatus.text = "Device: Registered"
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error registering device", e)
                binding.textViewDeviceStatus.text = "Device: Error"
            }
        }
    }
    
    private fun checkPermissions() {
        updatePermissionStatus()
        
        if (!PermissionHandler.hasSmsPermissions(this)) {
            showPermissionExplanationDialog()
        } else {
            checkNotificationListenerPermission()
        }
    }
    
    private fun requestAllPermissions() {
        if (!PermissionHandler.hasSmsPermissions(this)) {
            smsPermissionLauncher.launch(PermissionHandler.getSmsPermissions())
        } else if (!PermissionHandler.hasNotificationPermission(this)) {
            notificationPermissionLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
        } else if (!PermissionHandler.isNotificationListenerEnabled(this)) {
            showNotificationListenerDialog()
        }
    }
    
    private fun checkNotificationListenerPermission() {
        if (!PermissionHandler.isNotificationListenerEnabled(this)) {
            showNotificationListenerDialog()
        } else {
            startMonitoring()
        }
    }
    
    private fun startMonitoring() {
        Log.d(TAG, "Starting monitoring services")
        SyncForegroundService.start(this)
        SyncManager.getInstance(this).schedulePeriodicSync()
    }
    
    private fun updatePermissionStatus() {
        val smsGranted = PermissionHandler.hasSmsPermissions(this)
        val notificationGranted = PermissionHandler.hasNotificationPermission(this)
        val listenerEnabled = PermissionHandler.isNotificationListenerEnabled(this)
        
        binding.textViewSmsPermission.text = if (smsGranted) "SMS: ✓" else "SMS: ✗"
        binding.textViewNotificationPermission.text = if (notificationGranted) "Notifications: ✓" else "Notifications: ✗"
        binding.textViewListenerPermission.text = if (listenerEnabled) "Listener: ✓" else "Listener: ✗"
        
        binding.btnGrantPermissions.visibility = if (smsGranted && notificationGranted && listenerEnabled) {
            View.GONE
        } else {
            View.VISIBLE
        }
        
        binding.btnOpenNotificationSettings.visibility = if (listenerEnabled) {
            View.GONE
        } else {
            View.VISIBLE
        }
    }
    
    private fun showPermissionExplanationDialog() {
        AlertDialog.Builder(this)
            .setTitle("Permissions Required")
            .setMessage(
                "MTran needs the following permissions to capture M-PESA transactions:\n\n" +
                "• SMS Permission: To read M-PESA SMS messages\n" +
                "• Notification Access: To capture M-PESA app notifications\n\n" +
                "Your data is encrypted and stored securely. We only capture M-PESA related messages."
            )
            .setPositiveButton("Grant Permissions") { _, _ ->
                smsPermissionLauncher.launch(PermissionHandler.getSmsPermissions())
            }
            .setNegativeButton("Later", null)
            .show()
    }
    
    private fun showNotificationListenerDialog() {
        AlertDialog.Builder(this)
            .setTitle("Notification Access Required")
            .setMessage(
                "To capture M-PESA app notifications, please enable notification access for MTran.\n\n" +
                "This allows us to capture transaction confirmations from the M-PESA app."
            )
            .setPositiveButton("Open Settings") { _, _ ->
                PermissionHandler.openNotificationListenerSettings(this)
            }
            .setNegativeButton("Later", null)
            .show()
    }
    
    private fun showPermissionDeniedDialog(permissionType: String) {
        AlertDialog.Builder(this)
            .setTitle("Permission Denied")
            .setMessage(
                "$permissionType permission was denied. MTran needs this permission to capture M-PESA transactions.\n\n" +
                "You can grant the permission later from app settings."
            )
            .setPositiveButton("OK", null)
            .show()
    }
    
    override fun onResume() {
        super.onResume()
        updatePermissionStatus()
    }
}
```

### ui/TransactionAdapter.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.MpesaTransaction
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.SyncStatus
import app.lovable.fdff236544a54e8799396d5741e351a1.databinding.ItemTransactionBinding
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class TransactionAdapter : ListAdapter<MpesaTransaction, TransactionAdapter.ViewHolder>(DiffCallback()) {
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemTransactionBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ViewHolder(binding)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
    
    class ViewHolder(
        private val binding: ItemTransactionBinding
    ) : RecyclerView.ViewHolder(binding.root) {
        
        private val dateFormat = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())
        private val currencyFormat = NumberFormat.getCurrencyInstance(Locale("en", "KE"))
        
        fun bind(transaction: MpesaTransaction) {
            binding.apply {
                textViewType.text = transaction.transactionType
                textViewCode.text = transaction.transactionCode ?: "N/A"
                textViewAmount.text = transaction.amount?.let { 
                    currencyFormat.format(it) 
                } ?: "N/A"
                textViewDate.text = dateFormat.format(Date(transaction.transactionTimestamp))
                
                // Sync status indicator
                textViewSyncStatus.text = when (transaction.syncStatus) {
                    SyncStatus.PENDING -> "⏳ Pending"
                    SyncStatus.SYNCING -> "🔄 Syncing"
                    SyncStatus.SYNCED -> "✓ Synced"
                    SyncStatus.FAILED -> "✗ Failed (${transaction.retryCount})"
                }
                
                // Truncated raw message
                textViewMessage.text = transaction.rawMessage.take(100) + 
                    if (transaction.rawMessage.length > 100) "..." else ""
            }
        }
    }
    
    class DiffCallback : DiffUtil.ItemCallback<MpesaTransaction>() {
        override fun areItemsTheSame(oldItem: MpesaTransaction, newItem: MpesaTransaction): Boolean {
            return oldItem.id == newItem.id
        }
        
        override fun areContentsTheSame(oldItem: MpesaTransaction, newItem: MpesaTransaction): Boolean {
            return oldItem == newItem
        }
    }
}
```

---

## 12. Foreground Service

Already included in Section 9 as `SyncForegroundService.kt`

---

## 13. App Configuration

### MTranApplication.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1

import android.app.Application
import app.lovable.fdff236544a54e8799396d5741e351a1.services.SyncManager

class MTranApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize sync manager and schedule periodic sync
        SyncManager.getInstance(this).schedulePeriodicSync()
    }
}
```

### data/repository/AuthRepository.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.data.repository

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import app.lovable.fdff236544a54e8799396d5741e351a1.BuildConfig
import app.lovable.fdff236544a54e8799396d5741e351a1.data.api.ApiClient
import app.lovable.fdff236544a54e8799396d5741e351a1.data.models.AuthRequest
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

class AuthRepository(private val context: Context) {
    
    companion object {
        private const val TAG = "AuthRepository"
        private val KEY_TOKEN = stringPreferencesKey("auth_token")
        private val KEY_CLIENT_ID = stringPreferencesKey("client_id")
        private val KEY_DEVICE_ID = stringPreferencesKey("device_id")
    }
    
    private val api = ApiClient.supabaseApi
    private val apiKey = ApiClient.getAnonKey()
    
    /**
     * Get or generate device ID
     */
    suspend fun getDeviceId(): String {
        val stored = context.dataStore.data.map { it[KEY_DEVICE_ID] }.first()
        if (stored != null) return stored
        
        val deviceId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: java.util.UUID.randomUUID().toString()
        
        context.dataStore.edit { it[KEY_DEVICE_ID] = deviceId }
        return deviceId
    }
    
    /**
     * Get stored token
     */
    suspend fun getToken(): String? {
        return context.dataStore.data.map { it[KEY_TOKEN] }.first()
    }
    
    /**
     * Get stored client ID
     */
    suspend fun getClientId(): String? {
        return context.dataStore.data.map { it[KEY_CLIENT_ID] }.first()
    }
    
    /**
     * Register device with server
     */
    suspend fun registerDevice(): Boolean {
        return try {
            val deviceId = getDeviceId()
            val request = AuthRequest(
                action = "register",
                deviceId = deviceId,
                deviceName = Build.DEVICE,
                deviceModel = "${Build.MANUFACTURER} ${Build.MODEL}",
                osVersion = "Android ${Build.VERSION.RELEASE}",
                appVersion = BuildConfig.VERSION_NAME
            )
            
            val response = api.authenticate(request, apiKey)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                context.dataStore.edit { prefs ->
                    body.token?.let { prefs[KEY_TOKEN] = it }
                    body.clientId?.let { prefs[KEY_CLIENT_ID] = it }
                }
                Log.d(TAG, "Device registered successfully: ${body.clientId}")
                true
            } else {
                Log.e(TAG, "Registration failed: ${response.body()?.message}")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Registration error", e)
            false
        }
    }
    
    /**
     * Authenticate device
     */
    suspend fun authenticate(): Boolean {
        return try {
            val deviceId = getDeviceId()
            val request = AuthRequest(
                action = "authenticate",
                deviceId = deviceId,
                signature = generateSignature(deviceId)
            )
            
            val response = api.authenticate(request, apiKey)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                context.dataStore.edit { prefs ->
                    body.token?.let { prefs[KEY_TOKEN] = it }
                    body.clientId?.let { prefs[KEY_CLIENT_ID] = it }
                }
                Log.d(TAG, "Authentication successful")
                true
            } else {
                Log.e(TAG, "Authentication failed: ${response.body()?.message}")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Authentication error", e)
            false
        }
    }
    
    /**
     * Generate device signature (simplified for demo)
     */
    private fun generateSignature(deviceId: String): String {
        // In production, use proper cryptographic signing
        return "sig_${deviceId.hashCode()}"
    }
    
    /**
     * Clear stored credentials
     */
    suspend fun logout() {
        context.dataStore.edit { prefs ->
            prefs.remove(KEY_TOKEN)
            prefs.remove(KEY_CLIENT_ID)
        }
    }
}
```

### utils/MpesaParser.kt
```kotlin
package app.lovable.fdff236544a54e8799396d5741e351a1.utils

import java.util.regex.Pattern

/**
 * Local M-PESA message parser for quick pre-processing
 * Full parsing is done server-side with AI
 */
object MpesaParser {
    
    // Common M-PESA patterns
    private val TRANSACTION_CODE_PATTERN = Pattern.compile("([A-Z]{2,3}[0-9A-Z]{7,10})")
    private val AMOUNT_PATTERN = Pattern.compile("Ksh([\\d,]+\\.?\\d*)")
    private val BALANCE_PATTERN = Pattern.compile("balance is Ksh([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
    
    // Transaction type patterns
    private val PAYBILL_PATTERN = Pattern.compile("sent to .+ for account", Pattern.CASE_INSENSITIVE)
    private val TILL_PATTERN = Pattern.compile("paid to .+ till", Pattern.CASE_INSENSITIVE)
    private val SEND_MONEY_PATTERN = Pattern.compile("sent to .+ \\d{10}", Pattern.CASE_INSENSITIVE)
    private val WITHDRAWAL_PATTERN = Pattern.compile("withdraw", Pattern.CASE_INSENSITIVE)
    private val DEPOSIT_PATTERN = Pattern.compile("received .+ from", Pattern.CASE_INSENSITIVE)
    private val AIRTIME_PATTERN = Pattern.compile("airtime|bought .+ of airtime", Pattern.CASE_INSENSITIVE)
    private val REVERSAL_PATTERN = Pattern.compile("reversal|reversed", Pattern.CASE_INSENSITIVE)
    private val BANK_TRANSFER_PATTERN = Pattern.compile("bank|account .+ at", Pattern.CASE_INSENSITIVE)
    
    // M-PESA keywords for validation
    private val MPESA_KEYWORDS = listOf(
        "MPESA", "M-PESA", "Safaricom",
        "Confirmed", "Transaction", "Ksh",
        "sent", "received", "paid", "bought",
        "balance", "withdraw", "deposit"
    )
    
    data class PreParsedTransaction(
        val transactionType: String,
        val transactionCode: String?,
        val amount: Double?,
        val balance: Double?
    )
    
    /**
     * Check if message is likely an M-PESA transaction
     */
    fun isMpesaTransaction(message: String): Boolean {
        val lowerMessage = message.lowercase()
        val keywordCount = MPESA_KEYWORDS.count { lowerMessage.contains(it.lowercase()) }
        return keywordCount >= 2
    }
    
    /**
     * Quick local parse for basic info extraction
     * Full parsing is done server-side with AI
     */
    fun preParse(message: String): PreParsedTransaction {
        val transactionCode = extractTransactionCode(message)
        val amount = extractAmount(message)
        val balance = extractBalance(message)
        val transactionType = detectTransactionType(message)
        
        return PreParsedTransaction(
            transactionType = transactionType,
            transactionCode = transactionCode,
            amount = amount,
            balance = balance
        )
    }
    
    private fun extractTransactionCode(message: String): String? {
        val matcher = TRANSACTION_CODE_PATTERN.matcher(message)
        return if (matcher.find()) matcher.group(1) else null
    }
    
    private fun extractAmount(message: String): Double? {
        val matcher = AMOUNT_PATTERN.matcher(message)
        return if (matcher.find()) {
            matcher.group(1)?.replace(",", "")?.toDoubleOrNull()
        } else null
    }
    
    private fun extractBalance(message: String): Double? {
        val matcher = BALANCE_PATTERN.matcher(message)
        return if (matcher.find()) {
            matcher.group(1)?.replace(",", "")?.toDoubleOrNull()
        } else null
    }
    
    private fun detectTransactionType(message: String): String {
        return when {
            REVERSAL_PATTERN.matcher(message).find() -> "Reversal"
            PAYBILL_PATTERN.matcher(message).find() -> "Paybill"
            TILL_PATTERN.matcher(message).find() -> "Till"
            AIRTIME_PATTERN.matcher(message).find() -> "Airtime"
            WITHDRAWAL_PATTERN.matcher(message).find() -> "Withdrawal"
            DEPOSIT_PATTERN.matcher(message).find() -> "Deposit"
            SEND_MONEY_PATTERN.matcher(message).find() -> "SendMoney"
            BANK_TRANSFER_PATTERN.matcher(message).find() -> {
                if (message.contains("to bank", ignoreCase = true)) "MpesaToBank"
                else "BankToMpesa"
            }
            else -> "Unknown"
        }
    }
}
```

---

## 14. API Endpoints Reference

### Base URL
```
https://bonpqttgwunghfkgsiul.supabase.co
```

### Anon Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ
```

### Endpoints

#### 1. Auth Proxy
```
POST /functions/v1/auth-proxy
Headers:
  - apikey: <anon_key>
  - Content-Type: application/json

Actions:
  - register: Register new device
  - authenticate: Authenticate existing device
  - deactivate: Deactivate device

Request Body (register):
{
  "action": "register",
  "device_id": "unique_device_id",
  "device_name": "Device Name",
  "device_model": "Samsung Galaxy S21",
  "os_version": "Android 13",
  "app_version": "1.0.0"
}

Response:
{
  "success": true,
  "token": "jwt_token_here",
  "clientId": "uuid_here"
}
```

#### 2. Clean M-PESA (Process Transaction)
```
POST /functions/v1/clean-mpesa
Headers:
  - apikey: <anon_key>
  - Authorization: Bearer <token>
  - Content-Type: application/json

Request Body:
{
  "raw_message": "SIK3XYABCD Confirmed. Ksh1,500.00...",
  "client_id": "device_client_id",
  "client_tx_id": "local_transaction_uuid",
  "transaction_timestamp": 1702345678000
}

Response:
{
  "success": true,
  "transaction": {
    "id": "uuid",
    "transaction_type": "SendMoney",
    "transaction_code": "SIK3XYABCD",
    "amount": 1500.00,
    "balance": 5000.00,
    "status": "cleaned",
    "ai_metadata": {
      "model": "gemini-2.5-flash",
      "confidence": 0.95,
      "prompt_id": "mpesa_parse_v1"
    }
  }
}
```

#### 3. Detect Fraud
```
POST /functions/v1/detect-fraud
Headers:
  - apikey: <anon_key>
  - Authorization: Bearer <token>
  - Content-Type: application/json

Request Body:
{
  "client_id": "device_client_id"
}

Response:
{
  "success": true,
  "flagged_count": 2,
  "flagged_transactions": [...]
}
```

#### 4. Export Transactions
```
POST /functions/v1/export-transactions
Headers:
  - apikey: <anon_key>
  - Authorization: Bearer <token>
  - Content-Type: application/json

Request Body:
{
  "format": "csv",  // csv, json, excel
  "filters": {
    "status": "cleaned",
    "transaction_type": "SendMoney",
    "date_from": "2024-01-01",
    "date_to": "2024-12-31"
  }
}

Response: File download or JSON data
```

---

## 15. Layout Files

### res/layout/activity_main.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="16dp"
    tools:context=".ui.MainActivity">

    <LinearLayout
        android:id="@+id/layoutStatus"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        app:layout_constraintTop_toTopOf="parent">

        <TextView
            android:id="@+id/textViewDeviceStatus"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Device: Checking..."
            android:textSize="14sp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:layout_marginTop="8dp">

            <TextView
                android:id="@+id/textViewSmsPermission"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="SMS: ?"
                android:textSize="12sp" />

            <TextView
                android:id="@+id/textViewNotificationPermission"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Notifications: ?"
                android:textSize="12sp" />

            <TextView
                android:id="@+id/textViewListenerPermission"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Listener: ?"
                android:textSize="12sp" />

        </LinearLayout>

    </LinearLayout>

    <LinearLayout
        android:id="@+id/layoutButtons"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="16dp"
        app:layout_constraintTop_toBottomOf="@id/layoutStatus">

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btnGrantPermissions"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginEnd="8dp"
            android:text="Grant Permissions"
            style="@style/Widget.Material3.Button.OutlinedButton" />

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btnOpenNotificationSettings"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Notification Settings"
            style="@style/Widget.Material3.Button.OutlinedButton" />

    </LinearLayout>

    <LinearLayout
        android:id="@+id/layoutActions"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="8dp"
        app:layout_constraintTop_toBottomOf="@id/layoutButtons">

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btnSync"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginEnd="8dp"
            android:text="Sync Now" />

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btnStartService"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Start Service" />

    </LinearLayout>

    <TextView
        android:id="@+id/textViewTransactionCount"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:text="Transactions: 0"
        android:textSize="16sp"
        android:textStyle="bold"
        app:layout_constraintTop_toBottomOf="@id/layoutActions"
        app:layout_constraintStart_toStartOf="parent" />

    <TextView
        android:id="@+id/textViewSyncStatus"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="4dp"
        android:text="Pending: 0 | Synced: 0 | Failed: 0"
        android:textSize="12sp"
        app:layout_constraintTop_toBottomOf="@id/textViewTransactionCount"
        app:layout_constraintStart_toStartOf="parent" />

    <androidx.recyclerview.widget.RecyclerView
        android:id="@+id/recyclerViewTransactions"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="16dp"
        app:layout_constraintTop_toBottomOf="@id/textViewSyncStatus"
        app:layout_constraintBottom_toBottomOf="parent"
        tools:listitem="@layout/item_transaction" />

</androidx.constraintlayout.widget.ConstraintLayout>
```

### res/layout/item_transaction.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_marginBottom="8dp"
    app:cardElevation="2dp"
    app:cardCornerRadius="8dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="12dp">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal">

            <TextView
                android:id="@+id/textViewType"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:textSize="14sp"
                android:textStyle="bold"
                android:text="SendMoney" />

            <TextView
                android:id="@+id/textViewAmount"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="14sp"
                android:textStyle="bold"
                android:textColor="@color/design_default_color_primary"
                android:text="Ksh 1,500.00" />

        </LinearLayout>

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:layout_marginTop="4dp">

            <TextView
                android:id="@+id/textViewCode"
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:textSize="12sp"
                android:text="SIK3XYABCD" />

            <TextView
                android:id="@+id/textViewDate"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="12sp"
                android:text="Dec 10, 14:30" />

        </LinearLayout>

        <TextView
            android:id="@+id/textViewMessage"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_marginTop="8dp"
            android:textSize="11sp"
            android:textColor="@android:color/darker_gray"
            android:maxLines="2"
            android:ellipsize="end"
            android:text="SIK3XYABCD Confirmed. Ksh1,500.00 sent to..." />

        <TextView
            android:id="@+id/textViewSyncStatus"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginTop="4dp"
            android:textSize="11sp"
            android:text="✓ Synced" />

    </LinearLayout>

</com.google.android.material.card.MaterialCardView>
```

---

## 16. Resources

### res/values/strings.xml
```xml
<resources>
    <string name="app_name">MTran</string>
</resources>
```

### res/drawable/ic_notification.xml
```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="?attr/colorControlNormal">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM12,20c-4.41,0 -8,-3.59 -8,-8s3.59,-8 8,-8 8,3.59 8,8 -3.59,8 -8,8zM12.31,11.14c-1.77,-0.45 -2.34,-0.94 -2.34,-1.67 0,-0.84 0.79,-1.43 2.1,-1.43 1.38,0 1.9,0.66 1.94,1.64h1.71c-0.05,-1.34 -0.87,-2.57 -2.49,-2.97V5H10.9v1.69c-1.51,0.32 -2.72,1.3 -2.72,2.81 0,1.79 1.49,2.69 3.66,3.21 1.95,0.46 2.34,1.15 2.34,1.87 0,0.53 -0.39,1.39 -2.1,1.39 -1.6,0 -2.23,-0.72 -2.32,-1.64H8.04c0.1,1.7 1.36,2.66 2.86,2.97V19h2.34v-1.67c1.52,-0.29 2.72,-1.16 2.73,-2.77 -0.01,-2.2 -1.9,-2.96 -3.66,-3.42z"/>
</vector>
```

---

## 17. ProGuard Rules

### proguard-rules.pro
```proguard
# Retrofit
-keepattributes Signature
-keepattributes Annotation
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * {
    @retrofit2.http.* <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }

# Gson
-keepattributes Signature
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Data models
-keep class app.lovable.fdff236544a54e8799396d5741e351a1.data.models.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**
```

---

## 18. Quick Start Checklist

1. ☐ Create new Android Studio project
2. ☐ Copy `build.gradle.kts` dependencies
3. ☐ Create `AndroidManifest.xml` with all permissions
4. ☐ Create package structure:
   - `data/models/`
   - `data/database/`
   - `data/api/`
   - `data/repository/`
   - `receivers/`
   - `services/`
   - `utils/`
   - `ui/`
5. ☐ Copy all Kotlin files
6. ☐ Create layout files
7. ☐ Add drawable resources
8. ☐ Create network security config
9. ☐ Build and test on device
10. ☐ Grant SMS and notification permissions
11. ☐ Enable Notification Listener access
12. ☐ Test with M-PESA SMS

---

## Support

Dashboard URL: https://fdff2365-44a5-4e87-9939-6d5741e351a1.lovableproject.com

For issues, check the dashboard's transaction list to verify sync is working.

---

**Generated for MTran M-PESA Monitoring System**
