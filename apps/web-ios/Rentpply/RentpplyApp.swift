import SwiftUI
import UIKit
import WebKit

/// Rentpply for iPhone (the app that updates itself from the site).
///
/// The screens are the website's own, but they run from a copy kept inside the app (SiteStore), so the app opens
/// instantly and does not wait for the network to draw. An update listener checks rentpply.com every minute while the
/// app is open; when the site changes it downloads only the changed files and switches over at a quiet moment, so the
/// app always looks exactly like the website. The native side adds sharing, printing reports, and handing calls, SMS,
/// email, WhatsApp and other sites to their own apps.
@main
struct RentpplyApp: App {
    var body: some Scene {
        WindowGroup {
            WebScreen()
                .ignoresSafeArea()
                .onOpenURL { url in WebController.shared?.open(link: url) }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { act in
                    if let url = act.webpageURL { WebController.shared?.open(link: url) }
                }
        }
    }
}

struct WebScreen: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebController { WebController() }
    func updateUIViewController(_ controller: WebController, context: Context) {}
}

/// Remembers when the screen was last touched, so updates are never applied under someone's finger.
final class AppWebView: WKWebView {
    var lastTouch = Date.distantPast
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        lastTouch = Date()
        return super.hitTest(point, with: event)
    }
}

final class WebController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    static weak var shared: WebController?
    static let ourHosts: Set<String> = ["rentpply.com", "www.rentpply.com", "app.rentpply.com", "rentpply.pages.dev", "localhost"]
    static let page = UIColor(red: 251/255, green: 248/255, blue: 247/255, alpha: 1)
    static let checkEvery: TimeInterval = 60
    static let quiet: TimeInterval = 15

    private let store = SiteStore()
    private var web: AppWebView!
    private let splash = UIView()
    private var timer: Timer?
    private var backgroundAt: Date?
    private var checking = false

    /// Added to every page: the parts of the site that need the phone, and app behaviour (no pinch zoom, no link previews).
    private static let bridgeJS = """
    (function(){
      if (window.__rpAppBridge) return; window.__rpAppBridge = 1;
      var post = function(m){ try { window.webkit.messageHandlers.rentpply.postMessage(m); } catch (e) {} };
      if (!navigator.share) {
        try { Object.defineProperty(navigator, 'share', { configurable: true, value: function(d){ d = d || {};
          post({ type: 'share', title: String(d.title || ''), text: String(d.text || ''), url: String(d.url || '') });
          return Promise.resolve(); } }); } catch (e) {}
      }
      window.print = function(){ post({ type: 'print', title: document.title || 'Rentpply' }); };
      window.open = function(u){ if (u) { try { post({ type: 'open', url: String(new URL(u, location.href)) }); } catch (e) {} } return null; };
      document.addEventListener('DOMContentLoaded', function(){
        var m = document.querySelector('meta[name=viewport]');
        if (m && !/maximum-scale/.test(m.content)) m.content += ',maximum-scale=1,user-scalable=no';
        var s = document.createElement('style');
        s.textContent = 'a,img,button{-webkit-touch-callout:none}';
        document.head.appendChild(s);
      });
    })();
    """

    /// True while someone is typing or has a sheet open.
    private static let busyJS = "(function(){var a=document.activeElement;return !!(document.querySelector('[aria-modal=\"true\"]')||(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)));})()"

    override func viewDidLoad() {
        super.viewDidLoad()
        WebController.shared = self
        view.backgroundColor = WebController.page

        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.applicationNameForUserAgent = "Mobile/15E148 RentpplyApp/1.0 (iOS)"
        config.setURLSchemeHandler(SiteSchemeHandler(store: store), forURLScheme: SiteStore.scheme)
        let content = WKUserContentController()
        content.addUserScript(WKUserScript(source: WebController.bridgeJS, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        content.add(WeakHandler(self), name: "rentpply")
        config.userContentController = content

        web = AppWebView(frame: view.bounds, configuration: config)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.navigationDelegate = self
        web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        web.allowsLinkPreview = false
        web.isOpaque = false
        web.backgroundColor = WebController.page
        web.scrollView.backgroundColor = WebController.page
        web.scrollView.showsVerticalScrollIndicator = false
        web.scrollView.showsHorizontalScrollIndicator = false
        // The site lays itself out around the notch and home bar (viewport-fit=cover), like the installed web app.
        web.scrollView.contentInsetAdjustmentBehavior = .never
        if #available(iOS 16.4, *) { web.isInspectable = true }
        view.addSubview(web)
        buildSplash()

        web.load(URLRequest(url: SiteStore.start))
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in self?.hideSplash() }

        let nc = NotificationCenter.default
        nc.addObserver(self, selector: #selector(becameActive), name: UIApplication.didBecomeActiveNotification, object: nil)
        nc.addObserver(self, selector: #selector(resignedActive), name: UIApplication.willResignActiveNotification, object: nil)
        nc.addObserver(self, selector: #selector(wentToBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
    }

    // MARK: The update listener

    @objc private func becameActive() {
        // Coming back after a while is a quiet moment: show a version that finished downloading meanwhile.
        if let at = backgroundAt, Date().timeIntervalSince(at) > 60, store.applyPending() { web.reload() }
        backgroundAt = nil
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: WebController.checkEvery, repeats: true) { [weak self] _ in self?.check() }
        check()
    }

    @objc private func resignedActive() { timer?.invalidate(); timer = nil }
    @objc private func wentToBackground() { backgroundAt = Date() }

    private func check() {
        if checking { applyWhenQuiet(); return }
        checking = true
        Task { [weak self] in
            guard let self else { return }
            try? await self.store.checkForUpdate() // offline or mid-deploy: try next time
            await MainActor.run { self.checking = false; self.applyWhenQuiet() }
        }
    }

    /// Shows a downloaded version once nobody is typing, in a sheet, or has touched the screen for a moment.
    private func applyWhenQuiet() {
        guard store.pending != nil, UIApplication.shared.applicationState == .active, presentedViewController == nil else { return }
        let idle = Date().timeIntervalSince(web.lastTouch)
        if idle < WebController.quiet {
            DispatchQueue.main.asyncAfter(deadline: .now() + WebController.quiet - idle + 0.25) { [weak self] in self?.applyWhenQuiet() }
            return
        }
        web.evaluateJavaScript(WebController.busyJS) { [weak self] busy, _ in
            guard let self else { return }
            if (busy as? Bool) == true {
                DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in self?.applyWhenQuiet() }
                return
            }
            if self.store.applyPending() { self.web.reload() }
        }
    }

    /// A shared rentpply.com link (or rentpply://...) opened with the app goes to that page.
    func open(link: URL) {
        var path = link.path
        if link.scheme?.lowercased() == "rentpply" {
            path = "/" + [link.host, link.path.isEmpty ? nil : String(link.path.dropFirst())].compactMap { $0 }.joined(separator: "/")
        } else if !WebController.ourHosts.contains(link.host?.lowercased() ?? "") { return }
        var c = URLComponents(url: SiteStore.start, resolvingAgainstBaseURL: false)!
        c.path = path.isEmpty ? "/" : path
        c.query = link.query
        if let u = c.url { web.load(URLRequest(url: u)) }
    }

    // MARK: Where links go

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.allow); return }
        let scheme = url.scheme?.lowercased() ?? ""
        let mainFrame = action.targetFrame?.isMainFrame ?? true
        if [SiteStore.scheme, "about", "blob", "data"].contains(scheme) {
            if action.targetFrame == nil { webView.load(action.request); decisionHandler(.cancel); return }
            decisionHandler(.allow); return
        }
        if (scheme == "http" || scheme == "https") && !mainFrame { decisionHandler(.allow); return } // maps and street view on a place page
        if (scheme == "http" || scheme == "https") && WebController.ourHosts.contains(url.host?.lowercased() ?? "") {
            open(link: url) // a full rentpply.com link stays in the app
            decisionHandler(.cancel); return
        }
        // Calls, SMS, email, WhatsApp and other sites open in their own apps.
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url {
            if url.scheme == SiteStore.scheme { webView.load(action.request) }
            else if WebController.ourHosts.contains(url.host?.lowercased() ?? "") { open(link: url) }
            else { UIApplication.shared.open(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { hideSplash() }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }

    // MARK: Messages from the page

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "share":
            var items: [Any] = []
            let text = (body["text"] as? String ?? "").trimmingCharacters(in: .whitespaces)
            if !text.isEmpty { items.append(text) }
            if let s = body["url"] as? String, !s.isEmpty, let u = URL(string: s) { items.append(u) }
            if items.isEmpty { return }
            let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            sheet.popoverPresentationController?.sourceView = view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            present(sheet, animated: true)
        case "print":
            let info = UIPrintInfo(dictionary: nil)
            info.jobName = body["title"] as? String ?? "Rentpply"
            info.outputType = .general
            let printer = UIPrintInteractionController.shared
            printer.printInfo = info
            printer.printFormatter = web.viewPrintFormatter()
            printer.present(animated: true) { [weak self] _, _, _ in
                self?.web.evaluateJavaScript("dispatchEvent(new Event('afterprint'))")
            }
        case "open":
            if let s = body["url"] as? String, let u = URL(string: s) { UIApplication.shared.open(u) }
        default: break
        }
    }

    // MARK: Alerts and confirms from the page

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(a, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        a.addTextField { $0.text = defaultText }
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(a.textFields?.first?.text) })
        present(a, animated: true)
    }

    // MARK: Splash

    private func buildSplash() {
        splash.frame = view.bounds
        splash.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        splash.backgroundColor = WebController.page
        let logo = UIImageView(image: UIImage(named: "LaunchLogo"))
        logo.translatesAutoresizingMaskIntoConstraints = false
        splash.addSubview(logo)
        NSLayoutConstraint.activate([
            logo.centerXAnchor.constraint(equalTo: splash.centerXAnchor),
            logo.centerYAnchor.constraint(equalTo: splash.centerYAnchor),
            logo.widthAnchor.constraint(equalToConstant: 120),
            logo.heightAnchor.constraint(equalToConstant: 120),
        ])
        view.addSubview(splash)
    }

    private func hideSplash() {
        guard splash.superview != nil else { return }
        UIView.animate(withDuration: 0.18, animations: { self.splash.alpha = 0 }) { _ in self.splash.removeFromSuperview() }
    }
}

/// Stops the page's message handler from keeping the screen alive forever.
private final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive m: WKScriptMessage) { target?.userContentController(c, didReceive: m) }
}
