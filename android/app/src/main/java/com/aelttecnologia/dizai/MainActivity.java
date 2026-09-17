package com.aelttecnologia.dizai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BankNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}