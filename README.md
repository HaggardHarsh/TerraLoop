# TerraLoop

**AI-Driven Sustainable Waste Logistics & Upcycling Platform**

TerraLoop is a context-aware waste intelligence app that tells you exactly what to do with something before you throw it away. Point your camera at an item, and TerraLoop identifies the material, checks what tools you own, checks whether a certified disposal facility exists near you, and returns the three most actionable things you can do — ranked by effort and personalized to your living situation.

It is not a generic recycling guide. Every output is filtered through a user profile built at onboarding: your housing type, available green space, toolkit, composting setup, and location. A studio apartment dweller without a drill will never be shown a woodworking project. A user with a balcony will be shown planter ideas. A user with composting enabled will always see composting as the fastest route for organic waste.

When an item has no reuse path — e-waste, hazardous material, shattered glass — the system shifts from recommendation engine to logistics router. It silently checks whether a certified facility exists near the user's pincode and surfaces the result as plain text: name, distance, hours, accepted materials. No map. No friction. If nothing is found, the item is logged to a "Digital Garage" and the user is notified the moment a facility becomes available.

---

## Features

### Onboarding — User Context Profile
A 4-step wizard that builds a deterministic profile used to filter every downstream output.

- **Step 1 — Home**: Housing type (apartment, house, condo, studio) and available green space (none, balcony, garden, rooftop)
- **Step 2 — Waste Infrastructure**: Number of bins, composting availability, municipal pickup days (including a "No pickup service" option)
- **Step 3 — Toolkit**: Multi-select tool inventory (scissors, glue gun, hammer, drill, saw, sewing kit, paint, soldering iron) and household type
- **Step 4 — Location**: Pincode for facility lookup — placed last, after trust is established, with an explicit privacy note

### Scan Engine — AI Inference Pipeline
The primary interface. A large tap-to-scan zone opens the camera/gallery. An `OR` divider separates it from a secondary text description field for when a photo isn't possible.

The pipeline runs in three animated stages:
1. **CV Microservice** (edge model): object detection and material classification
2. **Context Engine**: queries the user's profile — tools, space, composting, location
3. **Recommender**: scores and ranks reuse options against the user's actual constraints

Results are three categorised options:
- ⚡ **Quick Win** — lowest effort, immediate action
- 🎨 **Creative Project** — upcycling with some craft
- 🔧 **Functional Utility** — practical repurposing

Each card shows estimated time, required tools, and whether the user's toolkit is a match.

### Geo-Spatial Fallback — Facility Lookup
Triggered when an item has no reuse path (e-waste, hazardous waste). Runs silently against a local facility database keyed by the user's pincode. Returns a plain-text result card — no map UI — showing facility name, type, distance, and opening hours. If no facility exists within range, the item is logged to the Digital Garage with safe storage instructions.

### Digital Garage — Async Storage State
A holding area for items that can't yet be disposed of. Each entry carries safe containment instructions, current status, and material tags. A live notification panel surfaces event-driven alerts when the facility landscape near the user changes.

### Community — Explore Feed
An Instagram-style explore grid mixing static posts and Reels. Features a Stories row, mixed tall/wide grid layout, hover overlays with stats, toolkit-aware labels (computed against the user's profile), and a live search bar that filters by title or material.

### Impact Ledger
A personal log of real environmental impact. No points, no gamification.

- Animated CO₂ prevented counter
- Items diverted from landfill
- Projects completed and active streak
- Per-project contribution cards showing CO₂ saved and materials diverted
- Material breakdown bars
- Chronological activity log

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic) |
| Styling | Vanilla CSS (custom design system, glassmorphism, CSS animations) |
| Logic | Vanilla JavaScript (ES2020, no frameworks, no build step) |
| Fonts | Inter + JetBrains Mono via Google Fonts |

No npm. No bundler. No runtime dependencies. Open `index.html` in any modern browser.

---

## File Structure

```
terraloop/
├── index.html   # App shell — all view templates and onboarding steps
├── style.css    # Full design system — tokens, components, animations
├── app.js       # All application logic — state, pipeline, rendering
└── README.md    # This file
```

---

## Running It

No install required.

```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

Or drag `index.html` into any browser window.

---

## Onboarding Flow

```
Step 1: Home
  └── Housing type + Green space

Step 2: Waste Infrastructure
  └── Bin count + Composting toggle + Pickup days (or "No service")

Step 3: Toolkit
  └── Available tools (multi-select) + Household type

Step 4: Location
  └── Pincode for facility lookup
       (placed last — trust is established by this point)

→ Profile summary → Launch app
```

---

## Scan Flow

```
User taps camera zone → uploads photo
         OR
User types item description → hits Go
         ↓
[CV Microservice]     — material classification
[Context Engine]      — profile lookup (tools, space, composting, pincode)
[Recommender]         — scores options against constraints
         ↓
IF reuse options exist:
  → 3 ranked cards (Quick Win / Creative / Functional)
     each tagged: time, tools needed, toolkit compatibility

IF no reuse path (e-waste / hazardous):
  → Silent facility lookup by pincode
  → Text result: facility name + distance + hours
     OR safe storage note + item logged to Digital Garage
```

---

## Production Roadmap

| Component | Implementation |
|---|---|
| CV model | TFLite (edge) + Cloud Vision API fallback |
| User profiles | Firebase Firestore or Supabase |
| Auth | Firebase Auth (anonymous → linked) |
| Facility database | Curated dataset + municipal API integrations |
| Geo lookup | Server-side pincode → facility query (no client-side map) |
| Community UGC | Firebase Storage or S3 for images/reels |
| Push notifications | Firebase Cloud Messaging for Garage alerts |
| Recommendation engine | Collaborative filtering trained on scan + completion data |
| Feed algorithm | Profile-weighted ranking by tool match + local proximity |

---

## Design Principles

- **No friction at point of disposal** — the scan result must be immediately actionable
- **Hyper-local by default** — every output filtered to the user's actual context
- **No cognitive overload** — maximum 3 options per scan, each in a distinct category
- **Privacy-first location** — pincode collected last, used only server-side, never surfaced in UI
- **No gamification** — impact shown as real environmental metrics, not abstract points
