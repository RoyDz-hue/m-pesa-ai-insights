# MTran Android App - Access Credentials & Configuration

## Base Configuration

```kotlin
object MTranConfig {
    const val SUPABASE_URL = "https://bonpqttgwunghfkgsiul.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ"
    const val PROJECT_ID = "bonpqttgwunghfkgsiul"
}
```

---

## Edge Function URLs

| Function | Full URL |
|----------|----------|
| **Auth Proxy** | `https://bonpqttgwunghfkgsiul.supabase.co/functions/v1/auth-proxy` |
| **Clean MPESA** | `https://bonpqttgwunghfkgsiul.supabase.co/functions/v1/clean-mpesa` |

---

## 1. Device Registration

**Endpoint:** `POST https://bonpqttgwunghfkgsiul.supabase.co/functions/v1/auth-proxy`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ
```

**Request Body:**
```json
{
  "action": "register",
  "device_id": "unique-android-device-id",
  "device_name": "Device Name",
  "device_model": "Model",
  "os_version": "13",
  "app_version": "1.0.0"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "device_token": "uuid-from-database",
  "client_id": "uuid-client-id",
  "uploaded_at": "2024-12-13T10:00:00.000Z"
}
```

---

## 2. Transaction Upload (Single)

**Endpoint:** `POST https://bonpqttgwunghfkgsiul.supabase.co/functions/v1/clean-mpesa`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ
x-device-token: <device_token_from_registration>
```

**Request Body:**
```json
{
  "raw_message": "SML1234567 Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 13/12/24 at 10:30 AM. New M-PESA balance is Ksh1,500.00.",
  "transaction_timestamp": 1702459800,
  "client_id": "<client_id_from_registration>",
  "client_tx_id": "unique-uuid-per-transaction"
}
```

---

## 3. Transaction Upload (Batch)

**Endpoint:** `POST https://bonpqttgwunghfkgsiul.supabase.co/functions/v1/clean-mpesa`

**Headers:** (same as single upload)
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ
x-device-token: <device_token_from_registration>
```

**Request Body:**
```json
{
  "client_id": "<client_id_from_registration>",
  "records": [
    {
      "raw_message": "SMS text 1...",
      "transaction_timestamp": 1702459800,
      "client_tx_id": "uuid-1"
    },
    {
      "raw_message": "SMS text 2...",
      "transaction_timestamp": 1702459900,
      "client_tx_id": "uuid-2"
    }
  ]
}
```

---

## Kotlin Implementation Example

```kotlin
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

object EdgeFunctionsClient {
    private val client = OkHttpClient()
    private val JSON = "application/json".toMediaType()
    
    private const val BASE_URL = "https://bonpqttgwunghfkgsiul.supabase.co/functions/v1"
    private const val ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ"
    
    fun registerDevice(
        deviceId: String,
        deviceName: String,
        deviceModel: String,
        osVersion: String,
        appVersion: String
    ): Response {
        val json = JSONObject().apply {
            put("action", "register")
            put("device_id", deviceId)
            put("device_name", deviceName)
            put("device_model", deviceModel)
            put("os_version", osVersion)
            put("app_version", appVersion)
        }
        
        val request = Request.Builder()
            .url("$BASE_URL/auth-proxy")
            .addHeader("Content-Type", "application/json")
            .addHeader("Authorization", "Bearer $ANON_KEY")
            .post(json.toString().toRequestBody(JSON))
            .build()
            
        return client.newCall(request).execute()
    }
    
    fun uploadTransaction(
        deviceToken: String,
        clientId: String,
        rawMessage: String,
        timestamp: Long,
        clientTxId: String
    ): Response {
        val json = JSONObject().apply {
            put("raw_message", rawMessage)
            put("transaction_timestamp", timestamp)
            put("client_id", clientId)
            put("client_tx_id", clientTxId)
        }
        
        val request = Request.Builder()
            .url("$BASE_URL/clean-mpesa")
            .addHeader("Content-Type", "application/json")
            .addHeader("Authorization", "Bearer $ANON_KEY")
            .addHeader("x-device-token", deviceToken)
            .post(json.toString().toRequestBody(JSON))
            .build()
            
        return client.newCall(request).execute()
    }
}
```

---

## Quick Test (cURL)

### Test 1: Register Device
```bash
curl -X POST "https://bonpqttgwunghfkgsiul.supabase.co/functions/v1/auth-proxy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ" \
  -d '{"action":"register","device_id":"test-123","device_name":"Test","device_model":"Test","os_version":"13","app_version":"1.0.0"}'
```

### Test 2: Upload Transaction
```bash
curl -X POST "https://bonpqttgwunghfkgsiul.supabase.co/functions/v1/clean-mpesa" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvbnBxdHRnd3VuZ2hma2dzaXVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MTUyOTMsImV4cCI6MjA4MTA5MTI5M30.8uonDh6tMbrGjv9vQXNqBwZjfN6u17YKQYkO_6J_LgQ" \
  -H "x-device-token: YOUR_DEVICE_TOKEN_HERE" \
  -d '{"raw_message":"SML1234567 Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 13/12/24 at 10:30 AM.","transaction_timestamp":1702459800,"client_id":"YOUR_CLIENT_ID","client_tx_id":"test-tx-123"}'
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check `Authorization` header has `Bearer ` prefix |
| 401 Invalid token | Device not registered or wrong `x-device-token` |
| Network error | Check internet connectivity, use HTTPS |
| CORS error | Only applies to web; Android should work directly |

---

## Response Codes

| Code | Meaning | App Action |
|------|---------|------------|
| 200 | Success | Mark SYNCED |
| 201 | Created | Mark SYNCED |
| 409 | Duplicate | Mark SYNCED (already exists) |
| 401 | Invalid token | Re-register device |
| 500 | Server error | Retry with backoff |
