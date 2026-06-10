# Demo APK — JS bundle APK icine gomulur (Metro gerekmez). Release build kullanir.
$ErrorActionPreference = "Stop"
$FrontendRoot = Split-Path $PSScriptRoot -Parent
$AndroidDir = Join-Path $FrontendRoot "android"

if (-not (Test-Path (Join-Path $FrontendRoot ".env"))) {
  Write-Warning ".env yok — EXPO_PUBLIC_LUMERIS_API_BASE_URL app.json fallback kullanilir."
}

if (-not (Test-Path $AndroidDir)) {
  Write-Host "android/ yok — prebuild calistiriliyor..."
  Push-Location $FrontendRoot
  npx expo prebuild --platform android
  Pop-Location
}

$JbrCandidates = @(
  "$env:JAVA_HOME",
  "C:\Program Files\Android\Android Studio\jbr",
  "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
)
foreach ($candidate in $JbrCandidates) {
  if ($candidate -and (Test-Path (Join-Path $candidate "bin\java.exe"))) {
    $env:JAVA_HOME = $candidate
    break
  }
}
if (-not $env:JAVA_HOME) {
  Write-Error "JDK bulunamadi. Android Studio kurulu mu? Veya JAVA_HOME ayarla."
}

Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "Release APK derleniyor (JS bundle dahil)..."
Push-Location $AndroidDir
& .\gradlew.bat assembleRelease
Pop-Location

$Apk = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
if (Test-Path $Apk) {
  Write-Host ""
  Write-Host "APK hazir (Metro gerekmez):" -ForegroundColor Green
  Write-Host $Apk
} else {
  Write-Error "APK olusturulamadi. Android Studio: Build > Generate Signed Bundle / APK veya loglari kontrol et."
}
