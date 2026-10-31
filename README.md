# SpendSmart AI — AI-Powered Personal Expense Tracker

A full-stack personal finance application built with React, Node.js, MongoDB, and Google Gemini AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP Client | Axios |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| AI | Google Gemini API |

## Project Structure

```
spendsmart-ai/
├── frontend/          # React + Vite application
├── backend/           # Node.js + Express API
└── README.md
```

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)
- Google Gemini API key (free tier)

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and API keys
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

### 3. Environment Variables

**Backend `.env`:**
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/spendsmart
JWT_SECRET=your_super_secret_jwt_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:5000/api
```

### 4. Get a Gemini API Key (Free)
1. Go to https://aistudio.google.com/
2. Sign in with your Google account
3. Click "Get API Key" → "Create API Key"
4. Copy and paste it into `backend/.env`

## Running the App

- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:5173

## Features
- 🔐 Secure JWT authentication
- 💰 Income & expense tracking
- 📊 Visual charts and dashboard
- 🎯 Budget management with alerts
- 🤖 AI-powered financial insights
- 📅 Monthly reports
- 📱 Responsive design
