#!/usr/bin/env bash
# Builds a signed release APK at android/app/build/outputs/apk/release/app-release.apk
# Install it with:  adb install -r android/app/build/outputs/apk/release/app-release.apk
set -euo pipefail
cd "$(dirname "$0")/.."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

if ! grep -qs HEADROOM_STORE_FILE "$HOME/.gradle/gradle.properties"; then
  echo "WARNING: no release key in ~/.gradle/gradle.properties (see README: 'One-time: create your signing key')."
  echo "         This APK will be debug-signed. Do NOT install it on your phone."
fi

# android/ is generated from app.json + plugins/, so it is never edited by hand.
npx expo prebuild --platform android --clean
(cd android && ./gradlew assembleRelease)

echo
echo "Built android/app/build/outputs/apk/release/app-release.apk"
