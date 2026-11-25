package com.rentpply.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Iterator;

/**
 * The copy of rentpply.com the app runs from.
 *
 * The app ships with the site as it was when the app was built (assets/site). The update listener
 * reads https://rentpply.com/app-manifest.json, downloads only the files that changed into
 * files/site/VERSION, checks every file's SHA-256, and marks that version as ready. The screen
 * switches to it at a quiet moment (see MainActivity), so the app always matches the website.
 */
final class SiteStore {
    static final String ORIGIN = "https://rentpply.com";
    static final String BUNDLED = "bundled";

    private final Context ctx;
    private final SharedPreferences prefs;
    private final File root;
    private final String bundledVersion;

    SiteStore(Context ctx) {
        this.ctx = ctx;
        this.prefs = ctx.getSharedPreferences("site", Context.MODE_PRIVATE);
        this.root = new File(ctx.getFilesDir(), "site");
        String v = BUNDLED;
        try { v = new JSONObject(readAll(ctx.getAssets().open("site/app-manifest.json"))).getString("version"); }
        catch (Exception ignored) { }
        this.bundledVersion = v;
        // A downloaded version that went missing (storage cleared) falls back to the bundled copy.
        String cur = prefs.getString("current", null);
        if (cur != null && !cur.equals(bundledVersion) && !new File(new File(root, cur), "app-manifest.json").exists()) {
            prefs.edit().remove("current").apply();
        }
    }

    synchronized String current() { return prefs.getString("current", bundledVersion); }
    synchronized String pending() { return prefs.getString("pending", null); }

    /** Switches to the downloaded version. Returns true if there was one. */
    synchronized boolean applyPending() {
        String p = pending();
        if (p == null) return false;
        prefs.edit().putString("current", p).remove("pending").apply();
        cleanUp();
        return true;
    }

    /** A file of the version on screen, or null if that version does not have it. */
    InputStream open(String path) {
        String cur = current();
        try {
            if (cur.equals(bundledVersion)) return ctx.getAssets().open("site/" + path);
            File f = new File(new File(root, cur), path);
            return f.isFile() ? new FileInputStream(f) : null;
        } catch (IOException e) {
            return null;
        }
    }

    /** One check for a newer site. Runs on the listener's background thread. */
    void checkForUpdate() throws Exception {
        byte[] raw = download(ORIGIN + "/app-manifest.json?t=" + System.currentTimeMillis());
        JSONObject latest = new JSONObject(new String(raw, "UTF-8"));
        String version = latest.getString("version");
        if (version.equals(current()) || version.equals(pending())) return;

        JSONObject have = currentManifest();
        File tmp = new File(root, ".incoming-" + version);
        deleteTree(tmp);
        JSONObject files = latest.getJSONObject("files");
        for (Iterator<String> it = files.keys(); it.hasNext(); ) {
            String path = it.next();
            if (path.contains("..") || files.getJSONObject(path).optString("src", "").contains("..")) throw new IOException("Bad path in manifest: " + path);
            String sha = files.getJSONObject(path).getString("sha256");
            String src = files.getJSONObject(path).optString("src", path); // the page comes from an untouched copy
            byte[] data = null;
            // Unchanged files are copied from the version already here; only changes are downloaded.
            if (have != null && have.has(path) && sha.equals(have.getJSONObject(path).optString("sha256"))) {
                InputStream in = open(path);
                if (in != null) data = readAllBytes(in);
            }
            if (data == null || !sha.equals(sha256(data))) data = download(ORIGIN + "/" + src + "?v=" + sha.substring(0, 12));
            if (!sha.equals(sha256(data))) throw new IOException(path + " did not match the manifest");
            File dest = new File(tmp, path);
            dest.getParentFile().mkdirs();
            try (OutputStream out = new FileOutputStream(dest)) { out.write(data); }
        }
        try (OutputStream out = new FileOutputStream(new File(tmp, "app-manifest.json"))) { out.write(raw); }
        File done = new File(root, version);
        deleteTree(done);
        if (!tmp.renameTo(done)) throw new IOException("Could not save the new version");
        synchronized (this) { prefs.edit().putString("pending", version).apply(); }
    }

    private JSONObject currentManifest() {
        try (InputStream in = open("app-manifest.json")) {
            return in == null ? null : new JSONObject(readAll(in)).getJSONObject("files");
        } catch (Exception e) {
            return null;
        }
    }

    /** Keeps only the version on screen and the one waiting to be shown. */
    private void cleanUp() {
        File[] dirs = root.listFiles();
        if (dirs == null) return;
        String cur = current(), pen = pending();
        for (File d : dirs) {
            if (d.getName().equals(cur) || d.getName().equals(pen)) continue;
            deleteTree(d);
        }
    }

    static byte[] download(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        c.setRequestProperty("User-Agent", "RentpplyApp/1.0 (Android) updater");
        try {
            if (c.getResponseCode() != 200) throw new IOException(url + " answered " + c.getResponseCode());
            try (InputStream in = c.getInputStream()) { return readAllBytes(in); }
        } finally {
            c.disconnect();
        }
    }

    static String sha256(byte[] data) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(data);
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    static byte[] readAllBytes(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        in.close();
        return out.toByteArray();
    }

    static String readAll(InputStream in) throws IOException { return new String(readAllBytes(in), "UTF-8"); }

    static void deleteTree(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteTree(k);
        f.delete();
    }
}
