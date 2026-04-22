# Fortiv HireMind

A modern, intelligent hiring management platform built with React, TypeScript, and Supabase. Fortiv HireMind streamlines the recruitment process with AI-powered CV evaluation, project management, and candidate tracking.

## Features

- **Dashboard Overview** - Centralized view of all hiring projects and statistics
- **Project Management** - Create and manage multiple hiring projects
- **CV Evaluator** - AI-powered resume analysis using Google Gemini with weighted criteria scoring
- **Criteria Management** - Build, duplicate, and manage reusable evaluation criteria sets
- **Candidate Tracking** - Detailed candidate profiles with status management
- **n8n Webhook Integration** - Async CV processing pipeline via n8n with database polling
- **Real-time Updates** - Live data synchronization with Supabase
- **Responsive Design** - Optimized for desktop and mobile

## Tech Stack

- **Frontend**: React 19 + TypeScript 6
- **Build Tool**: Vite 8
- **Routing**: React Router DOM 7
- **State Management**: Zustand 5
- **Backend**: Supabase 2
- **AI**: Google Gemini (criteria generation via `VITE_GEMINI_API_KEY`)
- **CV Processing**: n8n webhook pipeline (`VITE_CV_INTAKE_WEBHOOK_URL`)
- **Animations**: Framer Motion 12
- **Icons**: Lucide React
- **Styling**: CSS Modules

## Prerequisites

- Node.js v18+
- npm or yarn
- A [Supabase](https://supabase.com) project
- A [Google Gemini](https://aistudio.google.com) API key
- An n8n instance with a CV intake webhook configured

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Fortiv-Solutions/Fortiv-HireMind.git
   cd Fortiv-HireMind
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GEMINI_API_KEY=your_gemini_api_key
   VITE_CV_INTAKE_WEBHOOK_URL=your_n8n_webhook_url
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── auth/            # Auth provider and protected routes
│   ├── brand/
│   └── layout/
├── data/                # Mock data and constants
├── lib/                 # Third-party configurations (Supabase client)
├── pages/
│   ├── CVEvaluator/     # Criteria management UI
│   ├── Dashboard/       # Project overview
│   ├── HomeOverview/
│   ├── Login/
│   └── ProjectDetail/   # Candidates, evaluations, job posts, settings
├── services/
│   ├── aiCriteriaGenerator.ts  # Gemini-powered criteria generation
│   ├── aiJobDescription.ts
│   ├── cvEvaluation.ts         # Webhook dispatch + DB polling
│   └── hiringProjects.ts       # Supabase CRUD for projects & candidates
├── store/               # Zustand store
└── types/               # TypeScript types (database.ts)
```

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Set up the required tables — refer to `src/types/database.ts` for the full schema
3. Copy your project URL and anon key to `.env`
4. Configure authentication providers as needed

## CV Evaluation Flow

1. A CV file (or existing candidate) is submitted from the UI
2. The file and project/criteria context are sent to the n8n webhook (`VITE_CV_INTAKE_WEBHOOK_URL`)
3. n8n processes the CV asynchronously using AI and writes the result to `cv_evaluations`
4. The frontend polls the database every 3 seconds (up to 2 minutes) until the record appears
5. The completed evaluation is returned and displayed in the UI

## Deployment

```bash
npm run build
```

The production build outputs to `dist/`. Deploy to any static host (Vercel, Netlify, etc.).

## License

Proprietary software owned by Fortiv Solutions.

## Support

Open an issue on GitHub or email support@fortiv-solutions.com.

---

Built by [Fortiv Solutions](https://github.com/Fortiv-Solutions)
