# Rentpply apps

| Folder | What it is | Status |
|---|---|---|
| `web-android/` | Android app that runs the site and **updates itself from rentpply.com** | Ready to install |
| `web-ios/` | iPhone app that runs the site and **updates itself from rentpply.com** | Ready to install |
| `native-android/` | Fully native Android app | Being built in stages |
| `native-ios/` | Fully native iPhone app | Being built in stages |

Downloads are on the repository's **Releases** page: <https://github.com/yokasgero/Rentpply/releases>.
The apps are not in the Play Store or App Store yet, so they are installed by hand as described below.

---

## How the self-updating apps work

They are not a browser pointed at the website. Each app carries its own copy of the site's screens
(HTML, scripts, styles, fonts and pictures), so it opens straight away and draws without waiting for
the network. Only the data (places, payments, accounts) comes live from the database, as on the site.

1. Every time the site is published, its build writes `https://rentpply.com/app-manifest.json`: a list
   of every file with its SHA-256 fingerprint and a version number (see `vite.config.ts`).
2. While the app is open, an update listener reads that small file **every minute** (and when the app
   comes back to the front).
3. When the version changes, the app downloads **only the files that changed** in the background,
   checks every file's fingerprint, and keeps the new version ready.
4. It switches to the new version at a quiet moment: nobody has touched the screen for 15 seconds,
   no form is being typed in and no sheet is open, or the next time the app is opened after being away.
   A half-downloaded or damaged update is never shown.

So after a change to the site goes live, every installed app shows it within a minute or two, with no
new download from the user. A new APK or IPA is only needed when the app's own native part changes.

The apps also handle what a web page cannot do alone: choosing photos or taking them with the camera,
"Places near me" (location), the phone's share sheet, printing or saving the monthly payments report as
a PDF, the Android back button, and opening calls, SMS, email, WhatsApp and other sites in their own apps.
Inside the apps the site behaves like the installed app: it opens on sign-in and hides "Install the app".

Not in the apps yet: phone (push) notifications. Notifications still appear under the bell inside the app.

---

## Installing on Android

1. On the phone, open the Releases page and download **Rentpply-x.y.apk** from the latest release.
2. Open the downloaded file. If Android asks, allow your browser or Files app to **install unknown apps**
   (Settings › Apps › Special app access › Install unknown apps).
3. Tap **Install**, then **Open**. Rentpply appears in the app drawer with its own icon.

To update the native part later, install the newer APK over the old one; accounts and sign-in are kept.
Every APK is signed with the same Rentpply key, which is what lets it install over the previous one.

## Installing on iPhone (without the App Store)

The iPhone app is built by GitHub Actions on every change to `apps/web-ios/` and attached to the release
as **Rentpply-x.y.ipa** (unsigned). It is signed with your own Apple ID when you install it:

1. On a computer, install a sideloading tool such as **iloader**, **AltStore** or **Sideloadly**.
2. Connect the iPhone with a USB cable and trust the computer on the phone.
3. In the tool, sign in with an Apple ID and import / install **Rentpply-x.y.ipa**.
4. On the iPhone: Settings › General › VPN & Device Management › tap your Apple ID › **Trust**.
5. If iOS asks, turn on Settings › Privacy & Security › **Developer Mode** and restart.

With a free Apple ID the app must be re-installed every **7 days** (Apple's rule). A paid Apple
Developer account ($99 a year) makes it last a year and is also what the App Store needs later.

---

## Building

### Android (self-updating app)

Needs a JDK (17+), Android build-tools 35 (`aapt2`, `d8`, `zipalign`, `apksigner`), an API 34
`android.jar`, Python 3, and the release keystore (kept outside the repository; never commit it).

```bash
cd apps/web-android
ANDROID_JAR=/path/to/android.jar KEYSTORE=/path/to/release.jks KS_PASS=... ./build.sh
# -> build/Rentpply-1.0.apk, with a copy of the live site inside
```

The version is in `src/main/AndroidManifest.xml` (`versionCode` must go up with every release).

### iPhone (self-updating app)

Pushing a change under `apps/web-ios/` runs `.github/workflows/web-ios.yml` on a macOS runner. It copies
the live site into the app (`apps/fetch-site.py`), generates the Xcode project with XcodeGen and builds an
unsigned `Rentpply.ipa`, available under the run's **Artifacts**. It can also be started by hand from the
Actions tab (Run workflow). The version is in `apps/web-ios/project.yml` (`MARKETING_VERSION`,
`CURRENT_PROJECT_VERSION`).
