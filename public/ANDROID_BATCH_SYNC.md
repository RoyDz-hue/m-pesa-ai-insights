# MTran Android App - Continuous Batch Sync Guide

## Problem Statement
The app currently sends only ONE batch when clicked, then stops. It should **automatically continue** uploading all batches until every pending transaction is synced.

---

## Solution: Continuous Batch Sync Loop

### Implementation Pattern

```kotlin
class SyncManager(private val context: Context) {
    
    private val batchSize = 50
    private val maxRetries = 3
    private var isSyncing = false
    
    /**
     * Main sync function - runs until ALL pending transactions are uploaded
     */
    suspend fun syncAllPendingTransactions() {
        if (isSyncing) {
            Log.d("SyncManager", "Sync already in progress, skipping")
            return
        }
        
        isSyncing = true
        var totalSynced = 0
        var batchNumber = 0
        
        try {
            while (true) {
                batchNumber++
                
                // Get next batch of pending transactions
                val pendingBatch = transactionDao.getPendingTransactions(limit = batchSize)
                
                if (pendingBatch.isEmpty()) {
                    Log.d("SyncManager", "All transactions synced! Total: $totalSynced")
                    break // EXIT: No more pending transactions
                }
                
                Log.d("SyncManager", "Batch #$batchNumber: Processing ${pendingBatch.size} transactions")
                
                // Upload this batch
                val result = uploadBatch(pendingBatch)
                
                if (result.isSuccess) {
                    // Mark as synced
                    pendingBatch.forEach { tx ->
                        transactionDao.updateStatus(tx.id, SyncStatus.SYNCED)
                    }
                    totalSynced += pendingBatch.size
                    
                    Log.d("SyncManager", "Batch #$batchNumber complete. Progress: $totalSynced synced")
                    
                    // Small delay between batches to avoid overwhelming server
                    delay(500)
                    
                } else {
                    Log.e("SyncManager", "Batch #$batchNumber failed: ${result.error}")
                    
                    // Increment retry count for failed items
                    pendingBatch.forEach { tx ->
                        val newRetryCount = tx.retryCount + 1
                        if (newRetryCount >= maxRetries) {
                            transactionDao.updateStatus(tx.id, SyncStatus.FAILED)
                        } else {
                            transactionDao.updateRetryCount(tx.id, newRetryCount)
                        }
                    }
                    
                    // Exponential backoff on failure
                    delay(2000L * batchNumber.coerceAtMost(4))
                }
            }
        } finally {
            isSyncing = false
        }
    }
    
    private suspend fun uploadBatch(transactions: List<LocalTransaction>): UploadResult {
        val records = transactions.map { tx ->
            mapOf(
                "raw_message" to tx.rawMessage,
                "transaction_timestamp" to tx.timestamp,
                "client_tx_id" to tx.clientTxId
            )
        }
        
        val requestBody = JSONObject().apply {
            put("client_id", getClientId())
            put("records", JSONArray(records))
        }
        
        return try {
            val response = httpClient.post(
                url = "$SUPABASE_URL/functions/v1/clean-mpesa",
                headers = mapOf(
                    "Authorization" to "Bearer $SUPABASE_ANON_KEY",
                    "x-device-token" to getDeviceToken(),
                    "Content-Type" to "application/json"
                ),
                body = requestBody.toString()
            )
            
            if (response.isSuccessful) {
                UploadResult.Success(response.body)
            } else {
                UploadResult.Error(response.code, response.message)
            }
        } catch (e: Exception) {
            UploadResult.Error(-1, e.message ?: "Network error")
        }
    }
}
```

---

## WorkManager Implementation

```kotlin
class TransactionSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {
    
    override suspend fun doWork(): Result {
        val syncManager = SyncManager(applicationContext)
        
        return try {
            syncManager.syncAllPendingTransactions()
            Result.success()
        } catch (e: Exception) {
            Log.e("SyncWorker", "Sync failed", e)
            if (runAttemptCount < 5) {
                Result.retry()
            } else {
                Result.failure()
            }
        }
    }
}

// Schedule periodic sync
fun schedulePeriodicSync(context: Context) {
    val constraints = Constraints.Builder()
        .setRequiredNetworkType(NetworkType.CONNECTED)
        .build()
    
    val syncRequest = PeriodicWorkRequestBuilder<TransactionSyncWorker>(
        15, TimeUnit.MINUTES  // Every 15 minutes
    )
        .setConstraints(constraints)
        .setBackoffCriteria(
            BackoffPolicy.EXPONENTIAL,
            WorkRequest.MIN_BACKOFF_MILLIS,
            TimeUnit.MILLISECONDS
        )
        .build()
    
    WorkManager.getInstance(context)
        .enqueueUniquePeriodicWork(
            "transaction_sync",
            ExistingPeriodicWorkPolicy.KEEP,
            syncRequest
        )
}

// Trigger immediate sync (on app open or manual trigger)
fun triggerImmediateSync(context: Context) {
    val syncRequest = OneTimeWorkRequestBuilder<TransactionSyncWorker>()
        .setConstraints(
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
        )
        .build()
    
    WorkManager.getInstance(context)
        .enqueueUniqueWork(
            "immediate_sync",
            ExistingWorkPolicy.REPLACE,
            syncRequest
        )
}
```

---

## Key Points

### ✅ DO
1. **Loop until empty**: Keep fetching and uploading batches until `getPendingTransactions()` returns empty
2. **Small delays**: Add 500ms delay between batches to prevent rate limiting
3. **Track progress**: Log batch numbers and total synced for debugging
4. **Handle failures gracefully**: Use retry counts and exponential backoff
5. **Use WorkManager**: For reliable background sync even when app is closed
6. **Check connectivity**: Only attempt sync when network is available

### ❌ DON'T
1. Don't stop after first batch
2. Don't sync on main thread
3. Don't ignore duplicate responses (409 = success, mark as synced)
4. Don't retry indefinitely (max 3-5 retries per transaction)

---

## Response Handling

```kotlin
when (response.code) {
    200, 201 -> {
        // Success - mark as SYNCED
        markAsSynced(transaction)
    }
    409 -> {
        // Duplicate - also mark as SYNCED (already in server)
        markAsSynced(transaction)
    }
    401 -> {
        // Invalid token - re-register device
        reRegisterDevice()
    }
    429 -> {
        // Rate limited - wait and retry
        delay(60_000) // Wait 1 minute
    }
    500 -> {
        // Server error - retry with backoff
        incrementRetryCount(transaction)
    }
}
```

---

## Expected Behavior

1. **App Launch**: Trigger immediate sync → uploads ALL pending batches
2. **New SMS**: Add to queue → trigger immediate sync
3. **Background**: WorkManager syncs every 15 minutes
4. **Manual Trigger**: Button press → immediate sync of all pending

The key difference: **NEVER stop after one batch. Always loop until queue is empty.**
