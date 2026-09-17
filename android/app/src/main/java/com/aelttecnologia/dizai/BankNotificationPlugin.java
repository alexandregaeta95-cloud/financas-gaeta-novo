package com.aelttecnologia.dizai;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Set;

@CapacitorPlugin(name = "BankNotification")
public class BankNotificationPlugin extends Plugin {

    private static BankNotificationPlugin activeInstance = null;

    public static void notifyActiveApp(JSONObject payload) {
        if (activeInstance != null) {
            try {
                JSObject jsObj = new JSObject();
                jsObj.put("id", payload.optString("id"));
                jsObj.put("packageName", payload.optString("packageName"));
                jsObj.put("title", payload.optString("title"));
                jsObj.put("text", payload.optString("text"));
                jsObj.put("timestamp", payload.optLong("timestamp"));

                activeInstance.notifyListeners("onBankNotification", jsObj);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @Override
    public void load() {
        super.load();
        activeInstance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        try {
            Context context = getContext();
            Set<String> enabledListeners = NotificationManagerCompat.getEnabledListenerPackages(context);
            boolean isEnabled = enabledListeners != null && enabledListeners.contains(context.getPackageName());

            JSObject ret = new JSObject();
            ret.put("granted", isEnabled);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao checar permissão: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            } else {
                intent = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Erro ao abrir configurações: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getPendingNotifications(PluginCall call) {
        try {
            Context context = getContext();
            JSONArray jsonArray = BankNotificationListenerService.getPending(context);
            JSArray jsArray = new JSArray();

            for (int i = 0; i < jsonArray.length(); i++) {
                JSONObject item = jsonArray.optJSONObject(i);
                if (item == null) continue;

                JSObject jsObj = new JSObject();
                jsObj.put("id", item.optString("id"));
                jsObj.put("packageName", item.optString("packageName"));
                jsObj.put("title", item.optString("title"));
                jsObj.put("text", item.optString("text"));
                jsObj.put("timestamp", item.optLong("timestamp"));

                jsArray.put(jsObj);
            }

            JSObject ret = new JSObject();
            ret.put("notifications", jsArray);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao buscar notificações: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearNotification(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("ID da notificação é obrigatório");
            return;
        }

        try {
            Context context = getContext();
            BankNotificationListenerService.removeById(context, id);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao remover notificação: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearAllNotifications(PluginCall call) {
        try {
            Context context = getContext();
            BankNotificationListenerService.clearAll(context);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Erro ao limpar notificações: " + e.getMessage());
        }
    }
}
