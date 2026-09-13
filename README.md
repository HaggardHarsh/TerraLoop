# ♻️ TerraLoop

**TerraLoop** is an intelligent, AI-powered mobile application designed to help users creatively upcycle, recycle, and sustainably dispose of household items. By scanning an item or simply describing it, TerraLoop provides personalized, actionable recommendations based on your available tools, local waste infrastructure, and living space.

<div align="center">
  <i>Turn trash into treasure and build a better tomorrow.</i>
</div>

## ✨ Features

- **📸 AI Scanner:** Snap a picture or describe an item (e.g., "Empty 2L plastic bottle"). The app uses AI to instantly classify the material, grade its recyclability, and generate creative ideas.
- **🎨 Smart Recommendations:** Get tailored "Upcycle," "Recycle," "Donate," or "Compost" options. The app cross-references your personal toolkit (e.g., scissors, glue gun) and warns you if you're missing required tools.
- **🗄️ Garage:** Save your favorite upcycling ideas to your virtual garage for your next weekend project.
- **🌱 Impact Tracking:** Keep track of the items you've scanned and diverted from landfills. Watch your eco-impact grow over time.
- **🌍 Community:** Discover what other eco-warriors in your area are upcycling and share your own creations.
- **✨ Premium UI:** A stunning, modern glassmorphic interface with fluid animations and responsive carousels for an engaging user experience.

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla JavaScript, CSS (Glassmorphism design system)
- **Mobile Wrapper:** Android WebView (built via Android CLI)
- **Backend:** Node.js, Express
- **Database:** SQLite (local profile & garage storage)
- **AI Integration:** Integration points for Computer Vision and LLM-based recommendation scoring.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [Android SDK & CLI](https://developer.android.com/studio/command-line) (for building the mobile app)

### 1. Start the Backend Server

The backend serves the API endpoints and manages the SQLite database.

```bash
# Clone the repository
git clone https://github.com/HaggardHarsh/TerraLoop.git
cd TerraLoop

# Install dependencies (if a package.json exists) or run directly
# Ensure you have express, multer, sqlite3, etc. installed
npm install

# Start the local server (runs on port 3000 by default)
node server.js
```

### 2. Run the Android App

The mobile application is an Android project wrapping the frontend assets.

```bash
# Navigate to the Android project folder
cd android-app

# Build the debug APK using Gradle wrapper
./gradlew assembleDebug

# Install on a connected emulator or physical device
adb install app/build/outputs/apk/debug/app-debug.apk
```

> **Note:** The Android app expects the backend server to be running locally or at a configured API URL. Ensure your device/emulator can reach the host machine's IP (e.g., `10.0.2.2` for Android emulators).

## 📂 Project Structure

```text
TerraLoop/
├── android-app/            # Android Native Project Wrapper
│   └── app/src/main/assets/# Frontend Source Code
│       ├── index.html      # Main App Structure & UI Views
│       ├── style.css       # Glassmorphism Design System
│       └── app.js          # Core App Logic & API Integration
├── server.js               # Node.js Express Backend
├── terraloop.db            # SQLite Database
└── README.md
```


## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
