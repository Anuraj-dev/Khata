package in.khata.app;

import android.Manifest;
import android.database.Cursor;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SmsReader",
    permissions = {
        @Permission(strings = { Manifest.permission.READ_SMS }, alias = "readSms")
    }
)
public class SmsPlugin extends Plugin {

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (getPermissionState("readSms") == com.getcapacitor.PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        } else {
            requestPermissionForAlias("readSms", call, "smsPermissionCallback");
        }
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        boolean granted = getPermissionState("readSms") == com.getcapacitor.PermissionState.GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    @PluginMethod
    public void getRecentSms(PluginCall call) {
        int limit = call.getInt("limit", 50);
        long afterTimestamp = call.getLong("afterTimestamp", 0L);

        JSArray messages = new JSArray();

        try {
            Uri inboxUri = Uri.parse("content://sms/inbox");
            String[] projection = { "address", "body", "date" };
            String selection = "date > ?";
            String[] selectionArgs = { String.valueOf(afterTimestamp) };
            String sortOrder = "date DESC LIMIT " + limit;

            Cursor cursor = getContext().getContentResolver().query(
                inboxUri, projection, selection, selectionArgs, sortOrder
            );

            if (cursor != null) {
                int addrIdx = cursor.getColumnIndexOrThrow("address");
                int bodyIdx = cursor.getColumnIndexOrThrow("body");
                int dateIdx = cursor.getColumnIndexOrThrow("date");

                while (cursor.moveToNext()) {
                    JSObject msg = new JSObject();
                    msg.put("sender", cursor.getString(addrIdx));
                    msg.put("body", cursor.getString(bodyIdx));
                    msg.put("timestamp", cursor.getLong(dateIdx));
                    messages.put(msg);
                }
                cursor.close();
            }
        } catch (Exception e) {
            call.reject("Failed to read SMS: " + e.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("messages", messages);
        call.resolve(result);
    }
}
