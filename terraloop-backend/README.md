# TerraLoop API (Backend)

**The Waste Intelligence & Context-Aware Upcycling Engine**

TerraLoop API is the backend service powering the TerraLoop ecosystem. It acts as the context-aware intelligence layer, processing material scans, scoring and ranking upcycling projects based on individual user profiles, managing the Digital Garage, serving a community explore feed, routing hazardous items to localized disposal facilities, tracking environmental impact metrics, and triggering push notifications.

To facilitate rapid development and testing, the backend features a **hybrid execution architecture**: it runs out-of-the-box in a zero-configuration **Mock Mode** using in-memory databases and simulated image classifiers, and seamlessly upgrades to **Live Production Mode** when credentials for Firebase Admin SDK and the Google Cloud Vision API are supplied.

---

## Features

### 1. Context-Aware Scan Engine (`/api/scan`)
- Accepts either a text description or a base64-encoded image (via multipart form upload or JSON body).
- In **Live Mode**, integrates with the **Google Cloud Vision API** utilizing Label Detection and Object Localization.
- Maps visual/text labels to predefined materials (e.g., PET Plastic, Cardboard, E-Waste).
- Scores reuse recommendations dynamically against the user's Profile:
  - **Tool Matching**: Penalty applied if the user lacks the required tools for the project.
  - **Space Availability**: Hides garden or balcony projects if the user resides in space-constrained housing.
  - **Compost Accessibility**: Hides composting guides if composting is toggled off.
- Automatically routes hazardous materials or e-waste directly to local facility lookup.

### 2. User Profile Management (`/api/user`)
- Maintains granular user profiles including:
  - Housing type (apartment, house, condo, studio) and available green space (none, balcony, garden, rooftop).
  - Municipal waste setup (number of bins, composting toggle, pickup days).
  - Toolkit inventory (multi-select: scissors, glue gun, hammer, drill, saw, sewing kit, paint, soldering iron).
  - Regional location pincode.
  - Push notification tokens (FCM device registration).

### 3. Digital Garage (`/api/garage`)
- Tracks non-recyclable or hazardous items logged for asynchronous disposal.
- Serves safe handling/containment instructions per material type.
- Allows updating and deletion of items once disposed of.

### 4. Geo-Spatial Facility Routing (`/api/facilities`)
- Matches items requiring specialized disposal to registered facilities.
- Uses a multi-tiered regional lookup hierarchy:
  1. Exact matching on user pincode.
  2. Prefix matching (first 3 digits) to find facilities in the same city/region.
  3. Default fallback to municipal/always-open drop-off sites.

### 5. Community Explore Feed (`/api/posts`)
- Serves community-generated upcycling projects.
- Supports text filtering (by material, title) and category narrowing (Quick Wins, Creative, Functional).
- Standardizes image uploads to Firebase Cloud Storage.
- Implements engagement mechanics (liking, saving, and deduplicated user stories tracking).

### 6. Impact Ledger (`/api/impact`)
- Aggregates user statistics: CO₂ saved, items diverted, projects completed, and active engagement streak.
- Provides a chronological activity log and per-project contribution cards.
- Computes percentage-weighted material consumption bars.

### 7. Notification System (`/api/notifications`)
- Delivers in-app alerts and notifications.
- Ready for integration with **Firebase Cloud Messaging (FCM)** for push alerts when new disposal options are added near the user's location.

---

## Architecture Overview

```mermaid
graph TD
    Client[TerraLoop Client / Web App] -->|HTTPS Requests| ExpressApp[Express.js Server]
    
    %% Middleware & Routes
    ExpressApp --> CORSMiddleware[CORS & Body Parsers]
    ExpressApp --> Router[API Router]
    
    %% Router Division
    Router --> ScanRoute[/api/scan]
    Router --> UserRoute[/api/user]
    Router --> GarageRoute[/api/garage]
    Router --> PostsRoute[/api/posts]
    Router --> FacilitiesRoute[/api/facilities]
    Router --> ImpactRoute[/api/impact]
    Router --> NotifRoute[/api/notifications]

    %% Internal Services
    ScanRoute --> ClassifierService[Classifier Service]
    ScanRoute --> FacilityService[Facility Service]
    GarageRoute --> DB[(Firestore / Mock DB)]
    UserRoute --> DB
    PostsRoute --> DB
    PostsRoute --> Storage[(Cloud Storage / Mock Storage)]
    FacilitiesRoute --> FacilityService
    ImpactRoute --> DB
    NotifRoute --> DB
    NotifRoute --> FCMService[FCM Notification Service]

    %% External APIs
    ClassifierService -->|API Key| CloudVision[Google Cloud Vision API]
    FCMService -->|Service Account| FirebaseFCM[Firebase Cloud Messaging]
```

---

## Directory Structure

```
terraloop-backend/
├── data/
│   ├── facilities.json     # Mock database of recycling & hazardous facilities
│   └── materials.json      # Structured database of materials, upcycling options, and CO2 values
├── middleware/
│   └── errorHandler.js     # Centralised HTTP error handler
├── routes/
│   ├── facilities.js       # Facility routing endpoints
│   ├── garage.js           # Digital Garage CRUD endpoints
│   ├── impact.js           # Impact metrics & activity logging
│   ├── notifications.js    # In-app notifications
│   ├── posts.js            # Explore feed & project upload endpoints
│   ├── scan.js             # Image classification and scoring pipeline
│   └── user.js             # Onboarding user profile endpoints
├── services/
│   ├── classifierService.js# Google Cloud Vision integration & scoring algorithm
│   ├── facilityService.js  # Pincode routing & proximity matching engine
│   └── fcmService.js       # Firebase Cloud Messaging push notifications
├── .env.example            # Environment variables template
├── firebase.js             # Firebase Admin configuration & in-memory Mock SDK
├── package.json            # Node dependencies and npm scripts
└── server.js               # Express application entrypoint
```

---

## API Endpoints

All endpoints require JSON payload formats (where applicable) and optionally request `x-user-id` in the headers.

### Scan API
* **`POST /api/scan`**
  - **Headers**: `x-user-id: <user-id>` (optional, defaults to `'anonymous'`)
  - **Body**: 
    ```json
    { "image": "<base64_string>" } // OR
    { "description": "old cardboard box" }
    ```
  - **Response (Success - Recyclable/Upcyclable)**:
    ```json
    {
      "icon": "🧴",
      "material": "PET Plastic",
      "grade": "Grade 1 · Recyclable",
      "co2SavedPerItem": 0.12,
      "fallback": false,
      "tags": [
        { "text": "PET #1", "cls": "green" }
      ],
      "recommendations": [
        {
          "type": "quick",
          "typeLabel": "⚡ Quick Win",
          "title": "Recycle via Bin",
          "time": "2 min",
          "tools": [],
          "desc": "Rinse, flatten, and place in your recycling bin.",
          "score": 100,
          "toolMatch": true
        }
      ]
    }
    ```
  - **Response (Success - Non-recyclable / Fallback)**:
    ```json
    {
      "icon": "💻",
      "material": "E-Waste",
      "grade": "Hazardous · Drop-off Only",
      "fallback": true,
      "fallbackType": "ewaste",
      "tags": [{ "text": "Toxic", "cls": "red" }],
      "facilityLookup": {
        "found": true,
        "facilities": [
          { "name": "EcoTech E-Waste Hub", "distance": "1.2 km", "hours": "Mon–Sat 10am–5pm" }
        ]
      }
    }
    ```

### User API
* **`POST /api/user/profile`**
  - **Body**:
    ```json
    {
      "userId": "usr_948",
      "housing": "apartment",
      "greenSpace": "balcony",
      "bins": 3,
      "compostAvailable": true,
      "pickupDays": ["Monday", "Thursday"],
      "tools": ["scissors", "glue gun", "paint"],
      "pincode": "110001",
      "fcmToken": "fcm_token_device_uuid"
    }
    ```
  - **Response**: `201 Created` with the saved profile payload.
* **`GET /api/user/:id`**
  - **Response**: User profile data, or `404 Not Found` if user does not exist.

### Digital Garage API
* **`GET /api/garage`**
  - **Headers**: `x-user-id: <user-id>`
  - **Response**: `{ items: Array, count: Number }`
* **`POST /api/garage`**
  - **Headers**: `x-user-id: <user-id>`
  - **Body**: `{ name, material, grade, tags, instructions, fallbackType }`
  - **Response**: `201 Created` with saved item.
* **`PATCH /api/garage/:id`**
  - **Body**: `{ status: "resolved", statusLabel: "Disposed" }`
* **`DELETE /api/garage/:id`**
  - **Response**: `{ success: true }`

### Community Explore Feed API
* **`GET /api/posts`**
  - **Query Params**: `q` (search query string), `type` (`creative` | `quick` | `functional`), `limit` (default: 20)
  - **Response**: `{ posts: Array, total: Number }`
* **`POST /api/posts`** (Supports Multipart Form upload)
  - **Headers**: `x-user-id: <user-id>`
  - **Body**: `title`, `type`, `time`, `tools` (JSON string or array), `sourceMaterial`, `description`, `co2Saved`
  - **Files**: `image` (the post photo)
* **`POST /api/posts/:id/like`**
  - **Headers**: `x-user-id: <user-id>`
  - **Response**: `{ success: true, liked: Boolean }`
* **`GET /api/posts/stories`**
  - **Response**: Deduplicated array of users with active posts.

### Geo-Spatial Lookup API
* **`GET /api/facilities`**
  - **Query Params**: `pincode` (string), `type` (`ewaste` | `hazardous` | `glass` | etc.)
  - **Response**: List of matching facilities.

### Impact Ledger API
* **`GET /api/impact/summary`**
  - **Headers**: `x-user-id: <user-id>`
  - **Response**: `{ co2Saved, itemsDiverted, projectsMade, streak }`
* **`GET /api/impact/activity`**
  - **Headers**: `x-user-id: <user-id>`
  - **Response**: Chronological timeline logs.
* **`GET /api/impact/contributions`**
  - **Headers**: `x-user-id: <user-id>`
* **`GET /api/impact/materials`**
  - **Headers**: `x-user-id: <user-id>`
  - **Response**: `{ bars: [{ label, count, pct }] }`

### Notifications API
* **`GET /api/notifications`**
  - **Headers**: `x-user-id: <user-id>`
  - **Response**: `{ notifications: Array }`
* **`PATCH /api/notifications/:id/read`**
  - **Response**: `{ success: true }`

---

## Configuration & Environment

Create a `.env` file in the root directory. You can copy the template from `.env.example`:

```bash
cp .env.example .env
```

### Config Variables:

| Variable | Description | Default |
|---|---|---|
| `PORT` | Listening port for Express server. | `3000` |
| `NODE_ENV` | App mode. Set to `development` or `production`. | `development` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins allowed to access the API. | `*` (in development) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to Firebase credentials JSON file. | `./firebase-service-account.json` |
| `FIREBASE_PROJECT_ID` | Your active Firebase project identifier. | `None` |
| `FIREBASE_STORAGE_BUCKET` | The GCS bucket used for user-uploaded post media. | `None` |
| `VISION_API_KEY` | Google Cloud Vision API key for image scanning. | `None` (triggers Mock) |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` (packaged with Node.js)

### Installation
1. Clone or navigate to the repository directory:
   ```bash
   cd terraloop-backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```

### Running the Server

#### 1. Mock Mode (Zero-Config Development)
If no `.env` is set, or if `VISION_API_KEY` and the Firebase Service Account are omitted:
- The server will alert you in the console that it is falling back to **Mock Mode**.
- It uses a resilient, mock-in-memory replacement for Firestore, Firebase Auth, and Storage.
- Tapping/uploading scans will cycle through predefined materials in `materials.json` using a mock classifier.
- Local facility routing searches against `facilities.json`.
- **Note**: Storage and data will not persist across server restarts in mock mode.

To run:
```bash
# Start development server with Nodemon (auto-reloads)
npm run dev

# Or start in standard Node execution
npm start
```

#### 2. Live Production Mode
To connect the server to cloud APIs:
1. **Firebase Integration**:
   - Go to your [Firebase Console](https://console.firebase.google.com/).
   - Navigate to **Project Settings** → **Service Accounts** → Click **Generate New Private Key**.
   - Download the generated JSON file and save it in the root backend directory as `firebase-service-account.json` (or set its location in `FIREBASE_SERVICE_ACCOUNT_PATH`).
   - Populate `FIREBASE_PROJECT_ID` and `FIREBASE_STORAGE_BUCKET` in your `.env`.
2. **Google Cloud Vision Integration**:
   - Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
   - Search for **Cloud Vision API** and enable it.
   - Go to **APIs & Services** → **Credentials** → **Create Credentials** → **API Key**.
   - Copy this API key and assign it to `VISION_API_KEY` in `.env`.
3. Set `NODE_ENV=production`.
4. Run the server:
   ```bash
   npm start
   ```

---

## Troubleshooting & Verification

You can verify the API is alive and reachable using the health check endpoint:

```bash
curl http://localhost:3000/health
```

**Expected Response**:
```json
{
  "status": "ok",
  "service": "TerraLoop API",
  "version": "1.0.0",
  "timestamp": "2026-07-01T23:39:31.000Z",
  "environment": "development"
}
```
