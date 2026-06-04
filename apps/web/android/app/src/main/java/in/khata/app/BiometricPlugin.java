package in.khata.app;

import android.os.Handler;
import android.os.Looper;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

// Confirms the user via fingerprint/face, falling back to the device PIN/pattern
// (DEVICE_CREDENTIAL). Used to gate destructive actions like "clear all expenses".
@CapacitorPlugin(name = "Biometric")
public class BiometricPlugin extends Plugin {

    private static final int AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_STRONG
            | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int status = BiometricManager.from(getContext()).canAuthenticate(AUTHENTICATORS);
        JSObject ret = new JSObject();
        ret.put("available", status == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(ret);
    }

    @PluginMethod
    public void authenticate(final PluginCall call) {
        final String title = call.getString("title", "Confirm it's you");
        final String subtitle = call.getString("subtitle", "");

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                try {
                    FragmentActivity activity = (FragmentActivity) getActivity();
                    Executor executor = ContextCompat.getMainExecutor(getContext());

                    BiometricPrompt prompt = new BiometricPrompt(
                        activity,
                        executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                                JSObject ret = new JSObject();
                                ret.put("verified", true);
                                call.resolve(ret);
                            }

                            @Override
                            public void onAuthenticationError(int errorCode, CharSequence errString) {
                                call.reject(errString.toString(), String.valueOf(errorCode));
                            }
                        }
                    );

                    BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                        .setTitle(title)
                        .setSubtitle(subtitle)
                        .setAllowedAuthenticators(AUTHENTICATORS)
                        .build();

                    prompt.authenticate(info);
                } catch (Exception e) {
                    call.reject("Biometric error: " + e.getMessage());
                }
            }
        });
    }
}
