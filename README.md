# PS Salary - Public Servant Salary API

A modern, fast, and user-friendly web application for exploring Canadian public service salary data. Built with Next.js, HeroUI, and optimized for performance.

## 🚀 Live Demo

**Ready for Vercel Deployment** - Configured for one-click deployment

## ✨ Features

- **🔍 Comprehensive Search**: Browse all Canadian public service classifications
- **💰 Salary Data**: Real-time salary information with step progression
- **🎯 Equivalency Tool**: Compare salary equivalencies across classifications
- **🔄 Deployment Eligibility**: Check deployment eligibility using Treasury Board inter-step increment rules
- **🌙 Dark/Light Mode**: Elegant theme switching with custom Sun/Moon icons
- **📱 Responsive Design**: Optimized for all devices with HeroUI components
- **⚡ High Performance**: ~8s build time with advanced caching
- **🔗 RESTful API**: Complete API endpoints for data integration
- **🛠️ Admin Panel**: Data refresh and management tools

## 🛠️ Technology Stack

- **Framework**: Next.js 13.4.16 with TypeScript 5.1.6
- **UI Library**: HeroUI v2.6.7 with Framer Motion animations
- **Styling**: Tailwind CSS with custom theme system
- **Theme Management**: next-themes with SSR support
- **Icons**: Custom SVG icon system with centralized components
- **Deployment**: Vercel-optimized with custom configuration

## 📦 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/ps-salary.git
cd ps-salary

# Install dependencies (legacy peer deps for HeroUI compatibility)
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**: Link your GitHub repository to Vercel
2. **Automatic Deploy**: Push to main branch triggers deployment
3. **Zero Config**: Uses included `vercel.json` configuration

Manual deployment:

```bash
npm i -g vercel
vercel
```

### Custom Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📡 API Endpoints

### Core Endpoints

- `GET /api/data` - Complete salary dataset
- `GET /api/top` - Top salaries by classification
- `GET /api/scraper` - Data refresh (admin)

### Classification-Specific

- `GET /api/[code]` - Full classification data (e.g., `/api/cs-01`)
- `GET /api/[code]/current` - Current salary steps
- `GET /api/[code]/top` - Top salary for classification
- `GET /api/[code]/[step]` - Specific step salary

### Example Usage

```bash
# Get all data
curl https://your-app.vercel.app/api/data

# Get CS-01 classification
curl https://your-app.vercel.app/api/cs-01

# Get AS-04 top salary
curl https://your-app.vercel.app/api/as-04/top
```

## 🎨 UI Components

### Custom Icon System

```tsx
import { Sun, Moon, Upload, Globe, History, Send, X } from './components/Icons';

// Usage
<Sun className="h-4 w-4" />
<Moon className="h-4 w-4" />
```

### Theme Toggle

Beautiful theme switching with custom icons:

```tsx
import { ThemeToggle } from './components/ThemeToggle';
// Includes smooth transitions and proper SSR handling
```

## ⚡ Performance Features

- **Fast Builds**: ~8 seconds full build, sub-second incremental
- **Smart Caching**: API responses cached for 1 hour
- **Bundle Optimization**: Code splitting and tree shaking
- **Static Generation**: Pre-built pages where possible
- **Memory Efficient**: Optimized data structures and components

## 🔧 Configuration

### Included Configuration Files

- `vercel.json` - Deployment configuration with caching headers
- `.vercelignore` - Optimized build exclusions
- `next.config.js` - Build optimizations and SWC compiler
- `tailwind.config.ts` - Custom design system

### Environment Variables

No environment variables required - works out of the box!

## 📊 Available Classifications

The API includes 107+ public service classifications including:

- **Administrative**: AS, CR, PM, etc.
- **Technical**: CS, IT, EN, etc.
- **Specialized**: MD, EX, EC, etc.
- **Operational**: GT, GS, WP, etc.

[View complete list in the application]

## 🤝 Contributors

- **Author**: Doug Keefe
- **Editor**: Fabrice Ndizihiwe

## 📄 Important Disclaimer

This application is **not affiliated with, endorsed, or sponsored** by the Government of Canada. The information is sourced from publicly available Treasury Board of Canada Secretariat data and provided for educational and informational purposes only.

**Data Source**: [TBS-SCT Canada](https://www.tbs-sct.canada.ca/pubs_pol/hrpubs/coll_agre/rates-taux-eng.asp)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**Built with ❤️ for the Canadian public service community**
