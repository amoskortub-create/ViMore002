package cfd.mediatech.vimore;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
	private static final int PERMISSIONS_REQUEST_CODE = 100;
	private static final int WEB_PERMISSION_REQUEST_CODE = 101;
	private PermissionRequest pendingWebPermissionRequest;

	@Override
	public void onCreate(android.os.Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		if (getBridge() != null) {
			getBridge().getWebView().getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
			getBridge().getWebView().getSettings().setDomStorageEnabled(true);
			getBridge().getWebView().setWebChromeClient(new ViMoreWebChromeClient(getBridge()));
		}
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

	private class ViMoreWebChromeClient extends BridgeWebChromeClient {
		ViMoreWebChromeClient(com.getcapacitor.Bridge bridge) {
			super(bridge);
		}

		@Override
		public void onPermissionRequest(PermissionRequest request) {
			boolean needsAudio = false;
			boolean needsCamera = false;
			for (String resource : request.getResources()) {
				if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) needsAudio = true;
				if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) needsCamera = true;
			}

			if (!needsAudio && !needsCamera) {
				request.grant(request.getResources());
				return;
			}

			boolean audioGranted = !needsAudio || checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
			boolean cameraGranted = !needsCamera || checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
			if (audioGranted && cameraGranted) {
				request.grant(request.getResources());
				return;
			}

			pendingWebPermissionRequest = request;
			java.util.ArrayList<String> permissions = new java.util.ArrayList<>();
			if (needsAudio) permissions.add(Manifest.permission.RECORD_AUDIO);
			if (needsCamera) permissions.add(Manifest.permission.CAMERA);
			ActivityCompat.requestPermissions(MainActivity.this, permissions.toArray(new String[0]), WEB_PERMISSION_REQUEST_CODE);
		}
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
		if (requestCode == WEB_PERMISSION_REQUEST_CODE && pendingWebPermissionRequest != null) {
			boolean granted = grantResults.length > 0;
			for (int result : grantResults) granted = granted && result == PackageManager.PERMISSION_GRANTED;
			if (granted) pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
			else pendingWebPermissionRequest.deny();
			pendingWebPermissionRequest = null;
			return;
		}
		super.onRequestPermissionsResult(requestCode, permissions, grantResults);
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
