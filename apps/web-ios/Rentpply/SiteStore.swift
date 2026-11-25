import Foundation
import CryptoKit
import WebKit

/// The copy of rentpply.com the app runs from.
///
/// The app ships with the site as it was when the app was built (the Site folder). The update listener reads
/// https://rentpply.com/app-manifest.json, downloads only the files that changed into Application Support/site/VERSION,
/// checks every file's SHA-256 and marks that version as ready. The screen switches to it at a quiet moment
/// (see WebController), so the app always matches the website.
final class SiteStore {
    static let origin = URL(string: "https://rentpply.com")!
    static let scheme = "rentpply-app"
    static let start = URL(string: "rentpply-app://localhost/")!

    private let defaults = UserDefaults.standard
    private let bundled: URL
    private let root: URL
    private let bundledVersion: String
    private let lock = NSLock()

    init() {
        bundled = Bundle.main.url(forResource: "Site", withExtension: nil) ?? Bundle.main.bundleURL
        root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("site")
        try? FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        bundledVersion = (try? SiteStore.version(of: Data(contentsOf: bundled.appendingPathComponent("app-manifest.json")))) ?? "bundled"
        // A downloaded version that went missing falls back to the bundled copy.
        if let cur = defaults.string(forKey: "site.current"), cur != bundledVersion,
           !FileManager.default.fileExists(atPath: root.appendingPathComponent(cur).appendingPathComponent("app-manifest.json").path) {
            defaults.removeObject(forKey: "site.current")
        }
    }

    var current: String { lock.lock(); defer { lock.unlock() }; return defaults.string(forKey: "site.current") ?? bundledVersion }
    var pending: String? { lock.lock(); defer { lock.unlock() }; return defaults.string(forKey: "site.pending") }

    /// Switches to the downloaded version. Returns true if there was one.
    @discardableResult
    func applyPending() -> Bool {
        lock.lock()
        guard let p = defaults.string(forKey: "site.pending") else { lock.unlock(); return false }
        defaults.set(p, forKey: "site.current")
        defaults.removeObject(forKey: "site.pending")
        lock.unlock()
        cleanUp()
        return true
    }

    /// A file of the version on screen, or nil if that version does not have it.
    func data(for path: String) -> Data? {
        if path.contains("..") { return nil }
        let cur = current
        let base = cur == bundledVersion ? bundled : root.appendingPathComponent(cur)
        return try? Data(contentsOf: base.appendingPathComponent(path))
    }

    /// One check for a newer site.
    func checkForUpdate() async throws {
        let raw = try await download(SiteStore.origin.appendingPathComponent("app-manifest.json"), bust: true)
        guard let latest = try JSONSerialization.jsonObject(with: raw) as? [String: Any],
              let version = latest["version"] as? String,
              let files = latest["files"] as? [String: [String: Any]] else { return }
        if version == current || version == pending { return }

        let have = (data(for: "app-manifest.json").flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] })?["files"] as? [String: [String: Any]]
        let fm = FileManager.default
        let tmp = root.appendingPathComponent(".incoming-" + version)
        try? fm.removeItem(at: tmp)
        for (path, info) in files {
            guard !path.contains(".."), let sha = info["sha256"] as? String else { throw URLError(.cannotParseResponse) }
            var body: Data? = nil
            // Unchanged files are copied from the version already here; only changes are downloaded.
            if let old = have?[path]?["sha256"] as? String, old == sha, let d = data(for: path), SiteStore.sha256(d) == sha { body = d }
            // The site answers /index.html with a redirect to /, so the page itself is fetched from /.
            if body == nil {
                let url = path == "index.html" ? SiteStore.origin.appendingPathComponent("/") : SiteStore.origin.appendingPathComponent(path)
                body = try await download(url, bust: true)
            }
            guard let d = body, SiteStore.sha256(d) == sha else { throw URLError(.cannotDecodeContentData) }
            let dest = tmp.appendingPathComponent(path)
            try fm.createDirectory(at: dest.deletingLastPathComponent(), withIntermediateDirectories: true)
            try d.write(to: dest)
        }
        try raw.write(to: tmp.appendingPathComponent("app-manifest.json"))
        let done = root.appendingPathComponent(version)
        try? fm.removeItem(at: done)
        try fm.moveItem(at: tmp, to: done)
        lock.lock(); defaults.set(version, forKey: "site.pending"); lock.unlock()
    }

    /// Keeps only the version on screen and the one waiting to be shown.
    private func cleanUp() {
        let keep = Set([current, pending].compactMap { $0 })
        for d in (try? FileManager.default.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)) ?? [] where !keep.contains(d.lastPathComponent) {
            try? FileManager.default.removeItem(at: d)
        }
    }

    private func download(_ url: URL, bust: Bool) async throws -> Data {
        var u = url
        if bust, var c = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            c.queryItems = [URLQueryItem(name: "t", value: String(Int(Date().timeIntervalSince1970)))]
            u = c.url ?? url
        }
        var req = URLRequest(url: u, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
        req.setValue("RentpplyApp/1.0 (iOS) updater", forHTTPHeaderField: "User-Agent")
        let (d, resp) = try await URLSession.shared.data(for: req)
        guard (resp as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
        return d
    }

    static func version(of manifest: Data) throws -> String {
        let obj = try JSONSerialization.jsonObject(with: manifest) as? [String: Any]
        return obj?["version"] as? String ?? "bundled"
    }

    static func sha256(_ d: Data) -> String { SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined() }
}

/// Serves rentpply-app://localhost/... from the app's copy of the site. Data still comes live from the database.
final class SiteSchemeHandler: NSObject, WKURLSchemeHandler {
    let store: SiteStore
    init(store: SiteStore) { self.store = store }

    static let types: [String: String] = [
        "html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css", "json": "application/json",
        "webmanifest": "application/manifest+json", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp",
        "svg": "image/svg+xml", "ico": "image/x-icon", "gif": "image/gif", "woff2": "font/woff2", "woff": "font/woff", "ttf": "font/ttf", "txt": "text/plain",
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { task.didFailWithError(URLError(.badURL)); return }
        var path = url.path
        while path.hasPrefix("/") { path.removeFirst() }
        let last = path.split(separator: "/").last.map(String.init) ?? ""
        if path.isEmpty || !last.contains(".") { path = "index.html" } // every screen of the site is index.html
        let ext = (path as NSString).pathExtension.lowercased()
        let type = SiteSchemeHandler.types[ext] ?? "application/octet-stream"
        let body = path == "sw.js" ? nil : store.data(for: path)
        let status = body == nil ? 404 : 200
        let headers = ["Content-Type": type, "Cache-Control": "no-cache", "Access-Control-Allow-Origin": "*",
                       "Content-Length": String(body?.count ?? 0)]
        let resp = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
        task.didReceive(resp)
        task.didReceive(body ?? Data())
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
