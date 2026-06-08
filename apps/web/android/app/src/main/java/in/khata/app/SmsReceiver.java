package in.khata.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

// Fires on every incoming SMS — even when the app is closed — so UPI transactions
// auto-log without opening the app. Reassembles the message, then posts it to the
// Convex ingest endpoint authenticated by the per-device secret (written by
// SmsPlugin.configureIngest). The server parses + logs/queues it; this receiver
// stays dumb on purpose (no parsing in Java).
public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "KhataSmsReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(
            SmsPlugin.INGEST_PREFS, Context.MODE_PRIVATE);
        final String deviceSecret = prefs.getString(SmsPlugin.KEY_SECRET, null);
        final String ingestUrl = prefs.getString(SmsPlugin.KEY_URL, null);
        // Not configured yet (signed out / old build) — nothing to do.
        if (deviceSecret == null || ingestUrl == null) return;

        String sender = null;
        long timestamp = System.currentTimeMillis();
        StringBuilder bodyBuilder = new StringBuilder();

        try {
            SmsMessage[] messages = getMessages(intent);
            if (messages == null || messages.length == 0) return;
            for (SmsMessage msg : messages) {
                if (msg == null) continue;
                if (sender == null) {
                    sender = msg.getOriginatingAddress();
                    timestamp = msg.getTimestampMillis();
                }
                bodyBuilder.append(msg.getMessageBody());
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to read SMS: " + e.getMessage());
            return;
        }

        final String body = bodyBuilder.toString();
        if (body.isEmpty()) return;
        final String finalSender = sender == null ? "" : sender;
        final long finalTimestamp = timestamp;

        // Network on a background thread; goAsync keeps the receiver alive until done.
        final PendingResult pending = goAsync();
        new Thread(() -> {
            try {
                int code = post(ingestUrl, deviceSecret, finalSender, body, finalTimestamp);
                // 401 means the server no longer knows this device (account cleared
                // or signed out). Forget the config so we stop posting on every SMS;
                // the app re-registers via SmsPlugin.configureIngest on next launch.
                if (code == 401) {
                    prefs.edit().remove(SmsPlugin.KEY_SECRET).remove(SmsPlugin.KEY_URL).apply();
                }
            } catch (Exception e) {
                Log.w(TAG, "Ingest post failed: " + e.getMessage());
            } finally {
                pending.finish();
            }
        }).start();
    }

    private SmsMessage[] getMessages(Intent intent) {
        // Telephony helper (API 19+) is the reliable path.
        SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (messages != null) return messages;
        // Defensive fallback for odd OEMs.
        Bundle bundle = intent.getExtras();
        if (bundle == null) return null;
        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null) return null;
        String format = bundle.getString("format");
        SmsMessage[] out = new SmsMessage[pdus.length];
        for (int i = 0; i < pdus.length; i++) {
            out[i] = SmsMessage.createFromPdu((byte[]) pdus[i], format);
        }
        return out;
    }

    private int post(String urlStr, String deviceSecret, String sender, String body, long timestamp)
        throws Exception {
        JSONObject json = new JSONObject();
        json.put("deviceSecret", deviceSecret);
        json.put("sender", sender);
        json.put("body", body);
        json.put("timestamp", timestamp);
        byte[] payload = json.toString().getBytes(StandardCharsets.UTF_8);

        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(payload);
            }
            int code = conn.getResponseCode();
            Log.d(TAG, "Ingest response: " + code);
            return code;
        } finally {
            conn.disconnect();
        }
    }
}
