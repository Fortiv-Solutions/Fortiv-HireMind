# Fortiv HireMind

A modern, intelligent hiring management platform built with React, TypeScript, and Supabase. Fortiv HireMind streamlines the recruitment process with AI-powered CV evaluation, project management, and candidate tracking.

## 🚀 Features

- **Dashboard Overview** - Centralized view of all hiring projects and statistics
- **Project Management** - Create and manage multiple hiring projects with ease
- **CV Evaluator** - AI-powered resume analysis and candidate evaluation
- **Candidate Tracking** - Detailed candidate profiles with status management
- **Real-time Updates** - Live data synchronization with Supabase
- **Responsive Design** - Optimized for desktop and mobile devices
- **Modern UI** - Clean, intuitive interface with smooth animations

## 🛠️ Tech Stack

- **Frontend Framework**: React 19.2.5
- **Language**: TypeScript 6.0.2
- **Build Tool**: Vite 8.0.9
- **Routing**: React Router DOM 7.14.1
- **State Management**: Zustand 5.0.12
- **Backend**: Supabase 2.104.0
- **Animations**: Framer Motion 12.38.0
- **Icons**: Lucide React 1.8.0
- **Styling**: CSS Modules
- **Linting**: ESLint 9.39.4

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- npm or yarn
- Git

## 🔧 Installation

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
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

## 📜 Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the application for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## 📁 Project Structure

```
Fortiv-HireMind/
├── public/              # Static assets
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/          # Images and media files
│   ├── components/      # Reusable UI components
│   │   ├── brand/
│   │   └── layout/
│   ├── data/            # Mock data and constants
│   ├── lib/             # Third-party library configurations
│   │   └── supabase.ts
│   ├── pages/           # Page components
│   │   ├── CVEvaluator/
│   │   ├── Dashboard/
│   │   ├── HomeOverview/
│   │   ├── Login/
│   │   └── ProjectDetail/
│   ├── services/        # API and business logic
│   ├── store/           # State management (Zustand)
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   ├── main.tsx         # Application entry point
│   └── index.css        # Global styles
├── .env                 # Environment variables
├── .gitignore
├── eslint.config.js     # ESLint configuration
├── index.html           # HTML template
├── package.json
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── README.md
```

## 🔐 Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Set up the required database tables (refer to `src/types/database.ts`)
3. Copy your project URL and anon key to the `.env` file
4. Configure authentication providers as needed

## 🎨 Key Components

### Dashboard
Central hub displaying all hiring projects with statistics and quick actions.

### CV Evaluator
Upload and analyze candidate resumes with AI-powered insights and scoring.

### Project Detail
Manage individual hiring projects, view candidates, and track progress.

### Candidate Drawer
Detailed candidate information with status updates and evaluation history.

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` directory.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Code Style

This project uses ESLint for code quality. Run `npm run lint` before committing.

## 📄 License

This project is proprietary software owned by Fortiv Solutions.

## 👥 Team

Developed by [Fortiv Solutions](https://github.com/Fortiv-Solutions)

## 📧 Support

For support, email support@fortiv-solutions.com or open an issue in the GitHub repository.

## 🔄 Version History

- **v0.0.0** - Initial release
  - Dashboard with project overview
  - CV evaluation system
  - Candidate management
  - Supabase integration

---

Built with ❤️ by Fortiv Solutions
