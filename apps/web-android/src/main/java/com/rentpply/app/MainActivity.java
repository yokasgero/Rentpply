package com.rentpply.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import android.widget.FrameLayout;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Rentpply for Android (the app that updates itself from the site).
 *
 * The screens are the website's own, but they run from a copy kept inside the app (SiteStore), so the
 * app opens instantly and works without waiting for the network. An update listener checks
 * rentpply.com every minute while the app is open; when the site changes it downloads only the changed
 * files and switches over at a quiet moment, so the app always looks exactly like the website.
 * The native side adds what a web view lacks: photo and file uploads (with the camera), location,
 * sharing, printing reports, the back button, and handing calls, SMS, email and WhatsApp to their apps.
 */
public class MainActivity extends Activity {
    static final String HOME = "https://rentpply.com/";
    static final Set<String> OUR_HOSTS = new LinkedHashSet<>(Arrays.asList(
            "rentpply.com", "www.rentpply.com", "app.rentpply.com", "rentpply.pages.dev"));
    static final int REQ_FILES = 1, REQ_LOCATION = 2;

    static final long CHECK_EVERY_MS = 60_000, QUIET_MS = 15_000;

    WebView web;
    SiteStore site;
    final android.os.Handler main = new android.os.Handler(android.os.Looper.getMainLooper());
    final ExecutorService updater = Executors.newSingleThreadExecutor();
    boolean resumed, shown;
    long lastTouch, stoppedAt;
    ValueCallback<Uri[]> fileCallback;
    Uri cameraUri;
    GeolocationPermissions.Callback geoCallback;
    String geoOrigin;

    /** Added to every page: the parts of the site that need the phone (sharing, printing, opening files). */
    static final String BRIDGE_JS = "(function(){if(window.__rpAppBridge)return;window.__rpAppBridge=1;"
            + "var A=window.RentpplyAndroid;if(!A)return;"
            + "if(!navigator.share){try{Object.defineProperty(navigator,'share',{configurable:true,value:function(d){d=d||{};"
            + "A.share(String(d.title||''),String(d.text||''),String(d.url||''));return Promise.resolve();}});}catch(e){}}"
            + "window.print=function(){A.print(document.title||'Rentpply');};"
            + "window.open=function(u){if(u){try{A.open(String(new URL(u,location.href)));}catch(e){}}return null;};"
            + "})();";

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        FrameLayout root = new FrameLayout(this);
        site = new SiteStore(this);
        web = new WebView(this);
        web.setVisibility(View.INVISIBLE); // the splash stays until the first screen has drawn
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOnTouchListener((v, e) -> { lastTouch = System.currentTimeMillis(); return false; });
        web.setBackgroundColor(Color.parseColor("#FBF8F7"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true);
        s.setTextZoom(100); // the same layout as in the phone's browser, whatever the system font size
        s.setUserAgentString(s.getUserAgentString() + " RentpplyApp/1.0 (Android)");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);
        web.addJavascriptInterface(new Bridge(), "RentpplyAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false; // maps and street view inside a place page
                return handOff(req.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript(BRIDGE_JS, null);
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) {
                view.evaluateJavascript(BRIDGE_JS, null);
                if (!shown) main.postDelayed(MainActivity.this::reveal, 120);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return serveLocal(req);
            }
        });
        main.postDelayed(this::reveal, 4000); // never keep the splash longer than this

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                return chooseFiles(cb, params);
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                if (hasLocation()) { cb.invoke(origin, true, false); return; }
                geoCallback = cb; geoOrigin = origin;
                requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION,
                        Manifest.permission.ACCESS_FINE_LOCATION}, REQ_LOCATION);
            }
        });

        web.setDownloadListener((url, ua, disposition, mime, length) -> openOutside(Uri.parse(url)));

        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        if (saved != null && web.restoreState(saved) != null) return;
        web.loadUrl(startUrl(getIntent()));
    }

    void reveal() {
        if (shown) return;
        shown = true;
        web.setVisibility(View.VISIBLE);
        web.setAlpha(0f);
        web.animate().alpha(1f).setDuration(160).start();
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.parseColor("#FBF8F7")));
    }

    // ---------------------------------------------------------------- the site, from the copy in the app

    static final Map<String, String> TYPES = new HashMap<>();
    static {
        TYPES.put("html", "text/html"); TYPES.put("js", "text/javascript"); TYPES.put("mjs", "text/javascript");
        TYPES.put("css", "text/css"); TYPES.put("json", "application/json"); TYPES.put("webmanifest", "application/manifest+json");
        TYPES.put("png", "image/png"); TYPES.put("jpg", "image/jpeg"); TYPES.put("jpeg", "image/jpeg"); TYPES.put("webp", "image/webp");
        TYPES.put("svg", "image/svg+xml"); TYPES.put("ico", "image/x-icon"); TYPES.put("gif", "image/gif");
        TYPES.put("woff2", "font/woff2"); TYPES.put("woff", "font/woff"); TYPES.put("ttf", "font/ttf"); TYPES.put("txt", "text/plain");
    }

    /** Pages, scripts, styles, fonts and pictures of rentpply.com come from the app's copy; data still comes live from the database. */
    WebResourceResponse serveLocal(WebResourceRequest req) {
        Uri u = req.getUrl();
        if (!"GET".equalsIgnoreCase(req.getMethod()) || !"https".equals(u.getScheme())
                || u.getHost() == null || !OUR_HOSTS.contains(u.getHost().toLowerCase(Locale.ROOT))) return null;
        String path = u.getPath() == null ? "" : u.getPath();
        while (path.startsWith("/")) path = path.substring(1);
        String last = path.substring(path.lastIndexOf('/') + 1);
        boolean isPage = path.isEmpty() || !last.contains(".");
        if (isPage) path = "index.html";
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");
        headers.put("Access-Control-Allow-Origin", "*");
        if (path.equals("sw.js")) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new java.io.ByteArrayInputStream(new byte[0]));
        }
        InputStream in = site.open(path);
        if (in == null) return null; // not in the copy: let the network answer
        String ext = path.substring(path.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String type = TYPES.containsKey(ext) ? TYPES.get(ext) : "application/octet-stream";
        boolean text = type.startsWith("text/") || type.contains("json") || type.contains("svg");
        return new WebResourceResponse(type, text ? "utf-8" : null, 200, "OK", headers, in);
    }

    // ---------------------------------------------------------------- the update listener

    final Runnable tick = new Runnable() {
        @Override public void run() {
            if (!resumed) return;
            updater.execute(() -> {
                try { site.checkForUpdate(); } catch (Exception ignored) { } // offline or mid-deploy: try next time
                main.post(MainActivity.this::applyWhenQuiet);
            });
            main.postDelayed(this, CHECK_EVERY_MS);
        }
    };

    final Runnable quietCheck = this::applyWhenQuiet;

    /** Shows a downloaded version once nobody is typing, in a form or sheet, or has touched the screen for a moment. */
    void applyWhenQuiet() {
        main.removeCallbacks(quietCheck);
        if (site.pending() == null || !resumed) return;
        long idle = System.currentTimeMillis() - lastTouch;
        if (idle < QUIET_MS) { main.postDelayed(quietCheck, QUIET_MS - idle + 250); return; }
        web.evaluateJavascript("(function(){var a=document.activeElement;"
                + "return !!(document.querySelector('[aria-modal=\"true\"]')||(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)));})()",
                busy -> {
                    if ("true".equals(busy)) { main.postDelayed(quietCheck, 5_000); return; }
                    if (site.applyPending()) web.reload();
                });
    }

    /** A Rentpply link that opened the app goes to that page; anything else opens the home page. */
    String startUrl(Intent intent) {
        Uri u = intent == null ? null : intent.getData();
        if (u != null && "https".equals(u.getScheme()) && u.getHost() != null && OUR_HOSTS.contains(u.getHost().toLowerCase(Locale.ROOT))) {
            return u.toString();
        }
        return HOME;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getData() != null) web.loadUrl(startUrl(intent));
    }

    /** Rentpply pages stay in the app; calls, SMS, email, WhatsApp and other sites open in their own apps. */
    boolean handOff(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.ROOT);
        String host = u.getHost() == null ? "" : u.getHost().toLowerCase(Locale.ROOT);
        if ((scheme.equals("https") || scheme.equals("http")) && OUR_HOSTS.contains(host)) return false;
        if (scheme.equals("about") || scheme.equals("blob") || scheme.equals("data")) return false;
        openOutside(u);
        return true;
    }

    void openOutside(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.ROOT);
        Intent i;
        if (scheme.equals("tel")) i = new Intent(Intent.ACTION_DIAL, u);
        else if (scheme.equals("sms") || scheme.equals("smsto") || scheme.equals("mailto")) i = new Intent(Intent.ACTION_SENDTO, u);
        else if (scheme.equals("intent")) {
            try { i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME); i.addCategory(Intent.CATEGORY_BROWSABLE); i.setComponent(null); i.setSelector(null); }
            catch (Exception e) { return; }
        } else i = new Intent(Intent.ACTION_VIEW, u);
        try { startActivity(i); } catch (ActivityNotFoundException e) {
            android.widget.Toast.makeText(this, "No app on this phone can open that.", android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    // ---------------------------------------------------------------- photos and files

    boolean chooseFiles(ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams params) {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = cb;
        cameraUri = null;

        List<String> mimes = new ArrayList<>();
        for (String a : params.getAcceptTypes()) {
            for (String part : a.split(",")) {
                String m = mimeFor(part.trim());
                if (m != null && !mimes.contains(m)) mimes.add(m);
            }
        }
        boolean imagesOk = mimes.isEmpty();
        for (String m : mimes) if (m.startsWith("image/")) imagesOk = true;

        Intent camera = null;
        if (imagesOk && Build.VERSION.SDK_INT >= 29) {
            ContentValues v = new ContentValues();
            v.put(MediaStore.Images.Media.DISPLAY_NAME, "rentpply_" + System.currentTimeMillis() + ".jpg");
            v.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
            try {
                cameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            } catch (Exception e) { cameraUri = null; camera = null; }
        }

        Intent pick = new Intent(Intent.ACTION_GET_CONTENT);
        pick.addCategory(Intent.CATEGORY_OPENABLE);
        if (mimes.size() == 1) pick.setType(mimes.get(0));
        else {
            boolean allImages = !mimes.isEmpty();
            for (String m : mimes) if (!m.startsWith("image/")) allImages = false;
            pick.setType(allImages ? "image/*" : "*/*");
            if (!mimes.isEmpty()) pick.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toArray(new String[0]));
        }
        if (params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

        Intent launch;
        if (params.isCaptureEnabled() && camera != null) launch = camera; // "Take a photo of your ID" opens the camera, as in the browser
        else {
            launch = Intent.createChooser(pick, "Choose a file");
            if (camera != null) launch.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
        }
        try { startActivityForResult(launch, REQ_FILES); }
        catch (ActivityNotFoundException e) { fileCallback.onReceiveValue(null); fileCallback = null; return false; }
        return true;
    }

    static String mimeFor(String a) {
        if (a.isEmpty()) return null;
        if (a.contains("/")) return a.toLowerCase(Locale.ROOT);
        switch (a.toLowerCase(Locale.ROOT).replace(".", "")) {
            case "jpg": case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            case "heic": return "image/heic";
            case "pdf": return "application/pdf";
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "mov": return "video/quicktime";
            default: return null;
        }
    }

    @Override
    protected void onActivityResult(int req, int result, Intent data) {
        super.onActivityResult(req, result, data);
        if (req != REQ_FILES || fileCallback == null) return;
        Uri[] picked = null;
        if (result == RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                int n = data.getClipData().getItemCount();
                picked = new Uri[n];
                for (int i = 0; i < n; i++) picked[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                picked = new Uri[]{data.getData()};
            } else if (cameraUri != null) {
                picked = new Uri[]{cameraUri};
            }
        }
        if (cameraUri != null && (picked == null || !cameraUri.equals(picked[0]))) {
            try { getContentResolver().delete(cameraUri, null, null); } catch (Exception ignored) { }
        }
        fileCallback.onReceiveValue(picked);
        fileCallback = null;
        cameraUri = null;
    }

    // ---------------------------------------------------------------- location

    boolean hasLocation() {
        return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] results) {
        super.onRequestPermissionsResult(req, perms, results);
        if (req == REQ_LOCATION && geoCallback != null) {
            geoCallback.invoke(geoOrigin, hasLocation(), false);
            geoCallback = null;
        }
    }

    int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    // ---------------------------------------------------------------- the rest of the phone

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        resumed = false;
        main.removeCallbacks(tick);
        main.removeCallbacks(quietCheck);
        CookieManager.getInstance().flush();
        web.onPause();
    }

    @Override
    protected void onStop() {
        super.onStop();
        stoppedAt = System.currentTimeMillis();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        resumed = true;
        // Coming back after a while is a quiet moment: show a version that finished downloading meanwhile.
        // (Not after a quick trip to the camera, a file picker, the share sheet or the print screen.)
        boolean away = stoppedAt > 0 && System.currentTimeMillis() - stoppedAt > 60_000;
        if (away && fileCallback == null && site.pending() != null && site.applyPending()) web.reload();
        main.removeCallbacks(tick);
        main.post(tick);
    }

    /** Called from the page (see BRIDGE_JS). These run off the main thread, so each hops back onto it. */
    class Bridge {
        @JavascriptInterface
        public void share(String title, String text, String url) {
            runOnUiThread(() -> {
                String body = text == null ? "" : text.trim();
                if (url != null && !url.isEmpty() && !body.contains(url)) body = body.isEmpty() ? url : body + " " + url;
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, body);
                if (title != null && !title.isEmpty()) i.putExtra(Intent.EXTRA_SUBJECT, title);
                startActivity(Intent.createChooser(i, "Share"));
            });
        }

        @JavascriptInterface
        public void print(String title) {
            runOnUiThread(() -> printPage(title));
        }

        @JavascriptInterface
        public void open(String url) {
            runOnUiThread(() -> openOutside(Uri.parse(url)));
        }
    }

    /** The monthly payments report: Android's print screen (print or save as PDF), then the page is told it is done. */
    void printPage(String title) {
        PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
        final PrintDocumentAdapter inner = web.createPrintDocumentAdapter(title);
        PrintDocumentAdapter outer = new PrintDocumentAdapter() {
            @Override public void onStart() { inner.onStart(); }
            @Override public void onLayout(PrintAttributes o, PrintAttributes n, CancellationSignal c, LayoutResultCallback cb, Bundle extras) { inner.onLayout(o, n, c, cb, extras); }
            @Override public void onWrite(PageRange[] pages, ParcelFileDescriptor dest, CancellationSignal c, WriteResultCallback cb) { inner.onWrite(pages, dest, c, cb); }
            @Override public void onFinish() {
                inner.onFinish();
                web.evaluateJavascript("dispatchEvent(new Event('afterprint'))", null);
            }
        };
        pm.print(title, outer, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
    }
}
