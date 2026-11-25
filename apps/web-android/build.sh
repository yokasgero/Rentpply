#!/usr/bin/env bash
# Builds the Rentpply Android app (APK) without Gradle, using the Android build tools directly.
# The app carries a copy of the live site (fetched from rentpply.com) and keeps it up to date itself.
# Needs: JDK 17+, Android build-tools (aapt2, d8, zipalign, apksigner) and an API 34 android.jar.
#   ANDROID_JAR=/path/to/android.jar KEYSTORE=/path/to/release.jks KS_PASS=... ./build.sh
# Keep using the same keystore for every release, or phones will refuse to update the app.
set -euo pipefail
cd "$(dirname "$0")"
BT="${BUILD_TOOLS:-/usr/lib/android-sdk/build-tools/35.0.0}"
JAR="${ANDROID_JAR:?set ANDROID_JAR to an API 34 android.jar}"
KS="${KEYSTORE:?set KEYSTORE to the release keystore}"
PASS="${KS_PASS:?set KS_PASS to the keystore password}"
SRC=src/main
OUT=build
VERSION=$(sed -n 's/.*android:versionName="\([^"]*\)".*/\1/p' "$SRC/AndroidManifest.xml")

rm -rf "$OUT"; mkdir -p "$OUT/classes" "$OUT/dex"
"$BT/aapt2" compile --dir "$SRC/res" -o "$OUT/res.zip"
python3 -I ../fetch-site.py "$OUT/assets/site" "${SITE:-https://rentpply.com}"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest "$SRC/AndroidManifest.xml" "$OUT/res.zip" -A "$OUT/assets" --java "$OUT/gen" --auto-add-overlay
javac --release 11 -nowarn -cp "$JAR" -d "$OUT/classes" $(find "$SRC/java" "$OUT/gen" -name '*.java')
"$BT/d8" --min-api 24 --lib "$JAR" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q -j ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
"$BT/apksigner" sign --ks "$KS" --ks-pass "pass:$PASS" --out "$OUT/Rentpply-$VERSION.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify "$OUT/Rentpply-$VERSION.apk"
echo "Built $OUT/Rentpply-$VERSION.apk"
