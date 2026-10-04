#!/usr/bin/env bash
# Builds Headroom for the iOS Simulator as a Release build (the JavaScript is bundled in, so no
# Metro server is needed), then installs and launches it on the booted simulator.
#
#   npm run ios:sim
#
# Running on a real iPhone needs your own Apple ID signing, which only you can set up; see the
# README section "iOS".
set -euo pipefail
cd "$(dirname "$0")/.."

# Homebrew's CocoaPods must win over a stale rbenv `pod` shim, and CocoaPods insists on UTF-8.
# Set here rather than in your shell profile so nothing outside this script changes.
export PATH="/opt/homebrew/bin:$PATH"
export LANG=en_US.UTF-8

SIMULATOR="${SIMULATOR:-iPhone 17 Pro}"
# Outside ios/, which prebuild --clean deletes, so later builds can reuse compiled pods.
DERIVED=.ios-build

# ios/ is generated from app.json + plugins/, exactly like android/, and never edited by hand.
npx expo prebuild --platform ios --clean

WORKSPACE=$(ls -d ios/*.xcworkspace | head -1)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)

# Signed locally ("-", no Apple team needed on the simulator). Without a signature the build
# carries no entitlements, so iOS would never create the App Group the widget reads from.
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=$SIMULATOR" \
  -derivedDataPath "$DERIVED" \
  CODE_SIGN_IDENTITY=- \
  CODE_SIGNING_REQUIRED=NO \
  build | tail -20

APP=$(ls -d "$DERIVED"/Build/Products/Release-iphonesimulator/*.app | head -1)
BUNDLE_ID=$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Info.plist")

xcrun simctl boot "$SIMULATOR" 2>/dev/null || true
xcrun simctl install "$SIMULATOR" "$APP"
xcrun simctl launch "$SIMULATOR" "$BUNDLE_ID"

echo
echo "Built and launched $APP on $SIMULATOR"
