package cfd.mediatech.vimore;

import android.Manifest;
import android.content.pm.PackageManager;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private static final int PERMISSIONS_REQUEST_CODE = 100;

	@Override
	public void onCreate(android.os.Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		requestMediaAndLocationPermissions();
	}

	private void requestMediaAndLocationPermissions() {
		if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.M) {
			return;
		}

		String[] permissions = {
			Manifest.permission.CAMERA,
			Manifest.permission.RECORD_AUDIO,
			Manifest.permission.ACCESS_COARSE_LOCATION,
			Manifest.permission.ACCESS_FINE_LOCATION
		};

		boolean needsPermission = false;
		for (String permission : permissions) {
			if (checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
				needsPermission = true;
				break;
			}
		}

		if (needsPermission) {
			ActivityCompat.requestPermissions(this, permissions, PERMISSIONS_REQUEST_CODE);
		}
	}

	@Override
	public void onBackPressed() {
		if (getBridge() != null && getBridge().getWebView().canGoBack()) {
			getBridge().getWebView().goBack();
			return;
		}

		super.onBackPressed();
	}
}
