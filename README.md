# 🍛 oota Ai — Intelligent Thali Analyzer

AI-powered nutritional analysis for Indian home-cooked meals. Built to go beyond generic calorie counting by focusing on the specific nutritional profile of regional Indian diets.

![oota Ai Dashboard](https://img.shields.io/badge/Status-Live-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **🔍 Thali-Vision** — Drag & drop meal photos for AI-powered food recognition
- **🍛 Desi Macro-Calculator** — Calculates for Atta Roti, Bajra Rotla, Paratha (not generic "Bread")
- **🧈 Ghee/Oil Slider** — Real-time calorie adjustment based on cooking fat intensity
- **🏔️ Regional Health Profiles** — Personalized targets for North, South, East & West India
- **💍 Health Rings** — Visual progress for Protein Gap, Fiber Status, and Carb Quality
- **📊 Weekly Trends** — Bar charts tracking calories, protein, and fiber over 7 days
- **💧 Water Tracker** — Click-to-fill glass tracker for daily hydration
- **🔥 Activity Heatmap** — Caloric balance vs. activity visualization
- **💡 Smart Swaps** — AI-generated food swap recommendations with calorie savings

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Hosting | Firebase Hosting (GCP) |
| Database | IFCT 2017 JSON (50+ Indian food items) |
| CI/CD | GitHub Actions → Firebase |
| Design | "Organic Tech" — Inter + DM Serif Display |

## 🚀 Quick Start

### Run Locally
```bash
# No build step needed — just serve the files
npx http-server . -p 8080
```
Then open [http://localhost:8080](http://localhost:8080)

### Deploy to GCP (Firebase)

1. **Create a GCP project** named `oota-ai-prod`
2. **Enable Firebase** for the project at [console.firebase.google.com](https://console.firebase.google.com)
3. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
4. **Deploy**:
   ```bash
   firebase deploy --only hosting
   ```

### CI/CD (Auto-Deploy via GitHub)

1. Generate a Firebase service account key:
   ```bash
   firebase init hosting:github
   ```
2. The command will automatically create a GitHub secret `FIREBASE_SERVICE_ACCOUNT`
3. Every push to `main` branch auto-deploys to production

## 📁 Project Structure

```
oota-ai/
├── index.html          # Main page
├── styles.css          # Design system (700+ lines)
├── app.js              # Core logic (400+ lines)
├── data/
│   └── ifct.json       # Indian Food Composition Table (55+ items)
├── firebase.json       # Firebase Hosting config
├── .firebaserc         # Firebase project config
├── .github/
│   └── workflows/
│       └── deploy.yml  # CI/CD pipeline
└── README.md
```

## 🍽️ IFCT Database

Curated from IFCT 2017 (ICMR-NIN) with **55+ Indian food items**:

- **11 Breads**: Roti, Paratha, Naan, Dosa, Idli, Appam, Bajra Rotla, etc.
- **5 Rice**: White, Brown, Millet, Jeera, Biryani
- **9 Dals**: Moong, Toor, Masoor, Urad, Chana, Rajma, Chole, Sambar, Rasam
- **14 Sabzis**: Regional specialties from all 4 zones
- **8 Accompaniments**: Curd, Raita, Pickle, Papad, Chutneys
- **5 Sweets**: Gulab Jamun, Kheer, Payasam, Mishti Doi, Ladoo

## 📱 Responsive

Fully responsive from 480px mobile → 1440px desktop with:
- Mobile bottom navigation bar
- Adaptive grid layouts
- Touch-friendly water tracker

## 📄 License

MIT License — feel free to fork and build upon this.

---

**Built with ❤️ for Indian home cooks**
