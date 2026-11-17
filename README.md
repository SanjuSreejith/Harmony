# 🎵 Musicit - Free Ad-Free YouTube Music Mobile App

A modern, ad-free mobile music player powered by YouTube. Built specifically for mobile devices with **Spotify-like background playback** (continues playing when minimized or screen is locked), lockscreen controls, a **smart preference-based recommendation system**, synchronized lyrics, and a **native Android APK generator**.

---

## 🌟 Key Features

- **🚫 100% Ad-Free Audio Playback**: Unthrottled direct audio stream with range-chunking. Zero YouTube ads (no pre-roll, mid-roll, or banners).
- **📱 Background Playback (Like Spotify)**: Music keeps playing when you minimize the app, switch to other apps, or lock your phone.
- **🔒 Lock Screen & Notification Center Controls**: Full `MediaSession` integration with high-res artwork, track title, artist name, scrub slider, and Previous / Play / Pause / Next buttons.
- **🎯 Smart Recommendation System with Preferences**:
  - Personalize your music taste: Favorite Genres (Pop, Lo-Fi, Hip-Hop, Bollywood, Punjabi, Rock, EDM, R&B, etc.).
  - Favorite Artists (The Weeknd, Coldplay, Taylor Swift, Arijit Singh, etc.).
  - Mood Station (Chill, Workout, Focus/Study, Night Drive, Party, Sleep).
  - Dynamic **"Made For You"**, **"Daily Mix"**, and **"Mood Station"** feeds on the Home screen.
- **🎤 Synchronized Karaoke Lyrics**: Live line-by-line synchronized lyrics that scroll in real time with the song. Tap any lyric line to jump straight to that part of the song!
- **📻 Infinite Radio (Autoplay)**: When your queue ends, Musicit automatically queues related songs so your music never stops.
- **🌙 Sleep Timer**: Set a sleep timer (5m, 15m, 30m, 45m, 60m) that automatically pauses music when you fall asleep.
- **❤️ Liked Songs & Custom Playlists**: Save favorite tracks, create playlists, and jump back into your recent history.
- **📦 Native Android APK**: Ready-to-build Android Capacitor project (`android/`) with foreground service permissions.

---

## 🚀 Quick Start

### 1. Start the Server
```bash
npm start
```
The terminal displays your **Local PC URL**, your **Mobile Network URL**, and an **ASCII QR Code** to scan with your phone!

- **On your PC / Laptop**: [http://localhost:3000](http://localhost:3000)
- **On your Phone (Same Wi-Fi)**: `http://10.128.89.220:3000`

---

## 📱 How to Get the Mobile App on Your Phone

You have two options:

### Option 1: Instant PWA Install (No Download Needed, Works in 10 Seconds)
1. On your phone (connected to same Wi-Fi), open Chrome or Safari.
2. Go to: `http://10.128.89.220:3000` (or scan the QR code).
3. On Android: Tap the **three dots menu (⋮)** > **"Install App"** (or **"Add to Home Screen"**).
4. On iPhone: Tap the **Share icon** > **"Add to Home Screen"**.
5. It runs in standalone fullscreen mode like a native app with background audio and lock screen controls!

---

### Option 2: Build the Native Android APK (.apk)

The complete native Android project is set up in `android/` using **Capacitor**:

#### Method A: Using Android Studio (Local APK)
1. Run:
   ```bash
   npx cap open android
   ```
2. Android Studio will open the `android` project.
3. In the top menu, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. Once built, Android Studio shows a popup: click **locate** to get `app-debug.apk`. Transfer it to your phone and install!

#### Method B: Automated Cloud APK Builder (GitHub Actions)
A pre-configured GitHub Actions workflow is included at `.github/workflows/build-apk.yml`.
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Musicit Mobile App"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. GitHub Actions will automatically compile the APK on Ubuntu cloud runners.
3. Go to the **Actions** tab on your GitHub repository and download the ready-to-install **`Musicit-Android-APK`** directly!
