package com.duwebs.raagplayer;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioScannerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
