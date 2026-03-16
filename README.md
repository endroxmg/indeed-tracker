# MotionDesk — Indeed Content Creation Tracker

A **Workflow Management & Analytics Tool** for a 2-person Video Editing and Motion Graphics team. Built with React 18, Firebase, and Tailwind CSS.

## Features

- **Kanban Board** — Drag-and-drop ticket management with 5 columns (To Do → Completed)
- **Time Logging** — Weekly grid with color-coded cells, per-designer tracking
- **Dashboard** — Live stat cards, utilization charts, activity feed
- **Reports & MBR** — Date-ranged analytics with PDF export
- **Frame.io Integration** — Auto-sync comments and video metadata
- **Activity Log** — Complete audit trail of every ticket creation, drag, and status change with timestamps and usernames
- **Team Management** — Admin panel for user roles and capacity

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router v6 |
| State | React Context API |
| Database | Firebase Firestore (real-time) |
| Auth | Firebase Auth (Google OAuth) |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable + html2canvas |
| Drag & Drop | @hello-pangea/dnd |
| Icons | lucide-react |
| Deploy | Vercel |

## Setup

### Step 1 — Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Firestore Database** (start in production mode)
4. Enable **Authentication** → Sign-in method → **Google**
5. Copy your Firebase config values

### Step 2 — Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_EMAIL=your_admin_email@gmail.com
```

### Step 3 — Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized origins:
   - `http://localhost:5173`
   - Your Vercel domain (e.g., `https://your-app.vercel.app`)

### Step 4 — Frame.io Token (optional)

1. Go to [Frame.io Developer](https://developer.frame.io/) → Developer Tokens
2. Create a token with read access to assets and comments
3. Add as `FRAMEIO_TOKEN` in Vercel environment variables (server-side only, NOT in `.env`)

### Step 5 — Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

### Step 6 — Deploy to Vercel

1. Push code to GitHub
2. Import repo in [Vercel](https://vercel.com/)
3. Add all `VITE_` env variables in Vercel dashboard
4. Add `FRAMEIO_TOKEN` as a server-side env variable
5. Add your Vercel domain to Firebase Auth → Authorized domains
6. Deploy

### Step 7 — First Login

1. Open the app and sign in with the admin Google account (matching `VITE_ADMIN_EMAIL`)
2. You'll be auto-assigned the **admin** role
3. Go to **Team** → approve other users

## Firestore Security Rules

Deploy the rules from `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

## Project Structure

```
src/
├── App.jsx                 # Root app with routing
├── main.jsx                # Entry point
├── firebase.js             # Firebase config
├── index.css               # Global styles + Tailwind
├── contexts/
│   └── AuthContext.jsx      # Auth state management
├── components/
│   ├── Layout.jsx           # Sidebar + header
│   ├── Toast.jsx            # Notification system
│   ├── Skeleton.jsx         # Loading states
│   ├── GlobalSearch.jsx     # Header search
│   ├── TicketCard.jsx       # Kanban card
│   ├── TicketDetailModal.jsx # Full ticket view
│   ├── CreateTicketModal.jsx # New ticket form
│   └── LogTimeModal.jsx     # Time entry form
├── pages/
│   ├── Dashboard.jsx        # Stats, charts, activity
│   ├── Kanban.jsx           # Drag-and-drop board
│   ├── TimeLog.jsx          # Weekly time grid
│   ├── Reports.jsx          # Analytics + PDF export
│   ├── Team.jsx             # User management
│   ├── Login.jsx            # Google sign-in
│   └── PendingAccess.jsx    # Pending approval
├── services/
│   └── firestoreService.js  # Firestore CRUD
└── utils/
    └── helpers.js           # Utilities, badge colors
api/
└── frameio.js               # Vercel serverless proxy
```

## License

Private — internal use only.
