package com.aelttecnologia.dizai;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public class BankNotificationListenerService extends NotificationListenerService {

    private static final String TAG = "BankNotifyService";
    private static final String PREFS_NAME = "bank_notifications_queue";
    private static final String KEY_NOTIFICATIONS = "pending_notifications";

    private static final Set<String> ALLOWED_PACKAGES = new HashSet<>(Arrays.asList(
        "com.nu.production",        // Nubank
        "com.picpay",               // PicPay
        "com.itau",                 // Itaú Varejo
        "com.itau.personnalite"     // Itaú Personnalité
    ));

    public static JSONArray getPending(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jsonStr = prefs.getString(KEY_NOTIFICATIONS, "[]");
        try {
            return new JSONArray(jsonStr);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static void removeById(Context context, String id) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        JSONArray current = getPending(context);
        JSONArray updated = new JSONArray();
        for (int i = 0; i < current.length(); i++) {
            JSONObject item = current.optJSONObject(i);
            if (item != null && !id.equals(item.optString("id"))) {
                updated.put(item);
            }
        }
        prefs.edit().putString(KEY_NOTIFICATIONS, updated.toString()).apply();
    }

    public static void clearAll(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_NOTIFICATIONS, "[]").apply();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        super.onNotificationPosted(sbn);
        if (sbn == null) return;

        String pkg = sbn.getPackageName();
        if (pkg == null || !ALLOWED_PACKAGES.contains(pkg)) {
            return;
        }

        Bundle extras = sbn.getNotification().extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence("android.title");
        CharSequence textCs = extras.getCharSequence("android.text");
        CharSequence bigTextCs = extras.getCharSequence("android.bigText");

        String title = titleCs != null ? titleCs.toString() : "";
        String text = textCs != null ? textCs.toString() : "";
        String bigText = bigTextCs != null ? bigTextCs.toString() : "";

        String content = !bigText.trim().isEmpty() ? bigText : text;
        String combined = (title + " " + content).toLowerCase();

        if (!combined.contains("pix") && !combined.contains("transferência") && !combined.contains("transferencia")) {
            return;
        }

        try {
            JSONObject payload = new JSONObject();
            String uuidPart = UUID.randomUUID().toString().replace("-", "");
            if (uuidPart.length() > 6) {
                uuidPart = uuidPart.substring(0, 6);
            }

            payload.put("id", "NOTIF_" + System.currentTimeMillis() + "_" + uuidPart);
            payload.put("packageName", pkg);
            payload.put("title", title);
            payload.put("text", content);
            payload.put("timestamp", sbn.getPostTime());

            saveToQueue(payload);
            BankNotificationPlugin.notifyActiveApp(payload);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao processar notificação bancária", e);
        }
    }

    private void saveToQueue(JSONObject newNotif) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONArray current = getPending(this);

            long now = System.currentTimeMillis();
            for (int i = 0; i < current.length(); i++) {
                JSONObject item = current.optJSONObject(i);
                if (item != null) {
                    if (item.optString("packageName").equals(newNotif.optString("packageName")) &&
                        item.optString("text").equals(newNotif.optString("text")) &&
                        Math.abs(now - item.optLong("timestamp", 0)) < 120000) {
                        return; // Notificação idêntica recebida há menos de 2 minutos
                    }
                }
            }

            JSONArray updated = new JSONArray();
            updated.put(newNotif);
            int maxItems = Math.min(current.length(), 49);
            for (int i = 0; i < maxItems; i++) {
                updated.put(current.get(i));
            }

            prefs.edit().putString(KEY_NOTIFICATIONS, updated.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Erro ao salvar notificação na fila", e);
        }
    }
}
