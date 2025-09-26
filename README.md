# 💰 Ancy Expense Tracker

<div align="center">

![React](https://img.shields.io/badge/React-19.1.1-blue?style=for-the-badge&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-12.1.0-orange?style=for-the-badge&logo=firebase)
![PWA](https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge&logo=pwa)
![Vite](https://img.shields.io/badge/Vite-7.1.3-purple?style=for-the-badge&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-4.1.12-38B2AC?style=for-the-badge&logo=tailwind-css)

**A modern, feature-rich expense tracking Progressive Web App (PWA) with Multi-Currency Support, Savings Goals, Enhanced Analytics, and Custom Salary Cycles.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20App-brightgreen?style=for-the-badge&logo=google-chrome)](https://ancyexpensetracker.web.app)
[![Custom Domain](https://img.shields.io/badge/Custom%20Domain-app.ancy.co.in-blue?style=for-the-badge)](https://app-ancy-co-in.web.app)
[![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge)](https://github.com/codingwithwinny/expense-tracker/releases/tag/v2.0.0)

</div>

---

## ✨ Features

<div align="center">

| 🌍 **Multi-Currency** | 🎯 **Savings Goals** | 📊 **Enhanced Analytics** | 🔄 **Custom Periods** |
|----------------------|---------------------|---------------------------|----------------------|
| • 15 Major Currencies | • Smart Goal Tracking | • Daily Spending Trends | • Flexible Periods |
| • Auto Formatting | • Progress Visualization | • Category Performance | • Custom Date Ranges |
| • Persistent Settings | • Priority System | • Key Financial Insights | • Period Comparison |
| • Mobile Optimized | • Quick Actions | • Change Indicators | • Data Separation |

</div>

### 🚀 **Core Features**

- **🌍 Multi-Currency Support** - 15 major currencies with automatic formatting
- **💰 Expense Tracking** - Add, edit, delete expenses with categories
- **💵 Income Management** - Track multiple income sources
- **📊 Smart Analytics** - Beautiful charts and spending insights
- **🎯 Savings Goals** - Set and track financial goals with progress bars
- **☁️ Cloud Sync** - Data automatically syncs across all devices
- **📱 Mobile First** - Optimized for mobile and desktop
- **🎨 Modern UI** - Clean design with smooth animations
- **🔄 Real-time** - Instant updates and synchronization
- **📈 Budget Tracking** - Set and monitor category budgets

---

## 🌍 **Multi-Currency Support**

### ✨ **Global Currency Support**
- **15 Major Currencies**: USD, EUR, GBP, INR, CAD, AUD, JPY, CNY, SGD, AED, SAR, BRL, MXN, KRW, THB
- **Proper Symbols**: Each currency displays with correct symbols (₹, $, €, £, ¥, etc.)
- **Locale-Aware Formatting**: Numbers format according to each currency's locale
- **Currency-Specific Limits**: Different maximum amounts for different currencies

### 🎨 **User Experience**
- **Globe Icon Selector**: Easy currency selection with visual flag indicators
- **Popular Currencies**: Quick selection for most common currencies (USD, EUR, GBP, INR, etc.)
- **Full Currency List**: Complete dropdown with all supported currencies
- **Persistent Preferences**: Currency choice saved across sessions
- **Mobile Optimized**: Responsive design that works perfectly on all devices

### 🔧 **Smart Features**
- **Automatic Formatting**: All amounts update when currency changes
- **Currency-Aware Validation**: Error messages use selected currency
- **Export Support**: CSV exports include selected currency information
- **Seamless Switching**: Change currency without losing any data
- **Professional Formatting**: Proper international number formatting

---

## 🎯 **Savings Goals Management**

### ✨ **Smart Goal Tracking**
- **Goal Creation**: Set financial goals with name, target amount, current amount, target date, and priority
- **Progress Visualization**: Visual progress bars and percentage completion
- **Priority System**: High, Medium, Low priority levels with color coding
- **Quick Actions**: Add/withdraw money with simple prompts
- **Smart Status**: Automatic status updates (due soon, overdue, completed)
- **Goal Reminders**: Track deadlines and progress milestones

### 🎨 **User Experience**
- **Visual Progress Bars**: See your progress at a glance
- **Priority Indicators**: Color-coded priority levels
- **Status Badges**: Smart status updates (Due today, Due tomorrow, etc.)
- **Quick Update Buttons**: Easy add/withdraw functionality
- **Responsive Design**: Works perfectly on all devices

---

## 📊 **Phase 2: Enhanced Charts & Analytics**

### 📈 **Advanced Visualizations**
- **Daily Spending Trends**: Line charts showing spending patterns over time
- **Category Performance**: Bar charts comparing spending across categories
- **Key Financial Insights**: Income usage, savings rate, transaction count
- **Period Comparison**: Compare current vs. previous periods
- **Change Indicators**: Visual indicators for spending changes
- **Interactive Charts**: Hover tooltips and smooth animations

### 🔍 **Smart Insights**
- **Spending Patterns**: Identify your spending habits
- **Category Analysis**: See which categories are growing/shrinking
- **Budget Performance**: Track how well you're sticking to budgets
- **Savings Rate**: Monitor your savings percentage
- **Period Trends**: Compare performance across different time periods

---

## 🔄 **Custom Salary Cycles**

### ⏰ **Flexible Period Management**
- **Monthly Periods**: Traditional month-based tracking (January, February, etc.)
- **Custom Periods**: Set custom start and end dates (15th-14th, 25th-24th, etc.)
- **Period Switching**: Seamlessly switch between different periods
- **Data Separation**: Each period maintains separate data
- **Data Integrity**: No data mixing between different periods

### 💡 **Perfect For**
- **Bi-weekly Salary Cycles**: 15th-14th, 25th-24th
- **Weekly Salary Cycles**: Monday-Sunday
- **Custom Pay Periods**: Any start/end date combination
- **Irregular Cycles**: Non-standard payment schedules

---

## 🚀 Live Demo

<div align="center">

**🌐 Web Application**
[ancyexpensetracker.web.app](https://ancyexpensetracker.web.app)

**🎯 Custom Domain**
[app.ancy.co.in](https://app-ancy-co-in.web.app)

</div>

---

## 🛠️ Tech Stack

<div align="center">

| **Frontend** | **Backend** | **Styling** | **Deployment** |
|-------------|------------|-------------|----------------|
| React 19 | Firebase Auth | Tailwind CSS | Firebase Hosting |
| Vite | Firestore DB | Framer Motion | PWA Ready |
| TypeScript | Real-time Sync | shadcn/ui | Service Worker |

</div>

---

## 📦 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/codingwithwinny/expense-tracker.git
cd expense-tracker

# 2. Install dependencies
npm install

# 3. Set up Firebase
# - Create a Firebase project
# - Enable Authentication (Google provider)
# - Enable Firestore Database
# - Copy config to src/lib/firebase.js

# 4. Start development server
npm run dev

# 5. Build for production
npm run build
```

### Firebase Configuration

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Google Authentication
   - Create Firestore Database

2. **Update Configuration**
   ```javascript
   // src/lib/firebase.js
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     // ... other config
   };
   ```

---

## 📱 PWA Features

<div align="center">

| **Feature** | **Description** |
|------------|----------------|
| 📲 **Installable** | Add to home screen on any device |
| 🔌 **Offline Support** | Works without internet connection |
| 🔔 **Push Notifications** | Stay updated with expense reminders |
| ⚡ **Fast Loading** | Optimized for instant startup |
| 🎯 **Native Feel** | Smooth animations and interactions |

</div>

---

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   │   ├── button.jsx
│   │   ├── card.jsx
│   │   ├── dialog.jsx
│   │   ├── input.jsx
│   │   ├── label.jsx
│   │   └── select.jsx
│   ├── AuthButtons.jsx # Authentication components
│   ├── AuthPage.jsx    # Login/Register page
│   ├── CurrencySelector.jsx # Multi-currency selector
│   └── charts/         # Chart components
├── hooks/              # Custom React hooks
│   ├── useAuth.js      # Authentication hook
│   ├── useMonthData.js # Data management hook
│   ├── useDateSelection.js # Date persistence hook
│   └── useCurrency.jsx # Multi-currency management hook
├── lib/                # Utilities and configurations
│   ├── firebase.js     # Firebase configuration
│   ├── constants.js    # App constants
│   ├── currencies.js   # Currency configurations
│   └── utils.js        # Utility functions
└── assets/             # Static assets
```

---

## 🎨 Features Overview

### 🔐 Authentication
- **Google Sign-in** - Secure authentication with Google
- **User Isolation** - Each user's data is completely isolated
- **Session Management** - Automatic login state management

### 🌍 Multi-Currency Support
- **15 Major Currencies** - USD, EUR, GBP, INR, CAD, AUD, JPY, CNY, SGD, AED, SAR, BRL, MXN, KRW, THB
- **Automatic Formatting** - Proper symbols and locale-specific number formatting
- **Persistent Preferences** - Currency choice saved across sessions
- **Mobile Optimized** - Responsive currency selector with touch support
- **Export Integration** - CSV exports include selected currency

### 💰 Expense Management
- **Add/Edit/Delete** - Full CRUD operations for expenses
- **Categories** - Custom categories with color coding
- **Budgets** - Set and track category budgets
- **Income Tracking** - Multiple income sources support

### 🎯 Savings Goals
- **Goal Creation** - Set financial targets with deadlines
- **Progress Tracking** - Visual progress bars and percentages
- **Priority Management** - High, Medium, Low priority levels
- **Quick Updates** - Easy add/withdraw money functionality
- **Smart Reminders** - Deadline tracking and notifications

### 📊 Advanced Analytics
- **Spending Trends** - Daily spending patterns over time
- **Category Analysis** - Detailed spending breakdown by category
- **Period Comparison** - Compare different time periods
- **Financial Insights** - Income usage, savings rate analysis
- **Interactive Charts** - Beautiful visualizations with Recharts

### ☁️ Data Sync
- **Real-time Sync** - Instant synchronization across devices
- **Offline Storage** - Works without internet connection
- **Cross-device** - Access data from any device
- **Automatic Backup** - Cloud backup of all data
- **Period-based Storage** - Separate data for different time periods

---

## 🚀 Deployment

The app is automatically deployed to Firebase Hosting:

```bash
# Build the application
npm run build

# Deploy to Firebase
npm run deploy:firebase

# Deploy to GitHub Pages
npm run deploy
```

### Custom Domain Setup

1. **Add Custom Domain** in Firebase Console
2. **Update DNS Records** as instructed
3. **Deploy Application** to make it live

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** your changes (`git commit -m 'Add some AmazingFeature'`)
4. **Push** to the branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

---

## 📞 Support

- **Email**: support@ancy.co.in
- **Issues**: [GitHub Issues](https://github.com/codingwithwinny/expense-tracker/issues)
- **Documentation**: [Wiki](https://github.com/codingwithwinny/expense-tracker/wiki)

---

## 🔄 Version History

### v2.0.0 - Major Update (Current)
- 🌍 **Multi-Currency Support** - 15 major currencies with automatic formatting
- ✨ **Savings Goals Management** - Complete goal tracking system
- 📊 **Enhanced Charts & Analytics** - Advanced visualizations
- 🔄 **Custom Salary Cycles** - Flexible period management
- 📅 **Persistent Date Selection** - Custom date ranges with memory
- 🎨 **Improved UI/UX** - Smooth animations and better design
- 📱 **Enhanced PWA** - Better offline support and performance
- 🔧 **Firebase Security** - Proper Firestore security rules

### v1.0.0 - Initial Release
- 💰 Basic expense tracking
- 🥧 Simple pie charts
- 💾 Local storage
- 🔐 Basic authentication

---

<div align="center">

**Built with ❤️ using React, Firebase, and Tailwind CSS**

[![GitHub stars](https://img.shields.io/github/stars/codingwithwinny/expense-tracker?style=social)](https://github.com/codingwithwinny/expense-tracker)
[![GitHub forks](https://img.shields.io/badge/github-forks-blue?style=social)](https://github.com/codingwithwinny/expense-tracker)
[![GitHub issues](https://img.shields.io/github/issues/codingwithwinny/expense-tracker)](https://github.com/codingwithwinny/expense-tracker/issues)

**Transform your financial habits with smart insights and goal tracking! 🚀**

</div>
