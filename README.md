# 💰 Ancy Expense Tracker

<div align="center">

![React](https://img.shields.io/badge/React-18.0.0-blue?style=for-the-badge&logo=react)
![Firebase](https://img.shields.io/badge/Firebase-9.0.0-orange?style=for-the-badge&logo=firebase)
![PWA](https://img.shields.io/badge/PWA-Ready-green?style=for-the-badge&logo=pwa)
![Vite](https://img.shields.io/badge/Vite-7.0.0-purple?style=for-the-badge&logo=vite)
![Tailwind](https://img.shields.io/badge/Tailwind-3.0.0-38B2AC?style=for-the-badge&logo=tailwind-css)

**A modern, responsive expense tracking Progressive Web App (PWA) built with React, Firebase, and Tailwind CSS.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20App-brightgreen?style=for-the-badge&logo=google-chrome)](https://ancyexpensetracker.web.app)
[![Custom Domain](https://img.shields.io/badge/Custom%20Domain-app.ancy.co.in-blue?style=for-the-badge)](https://app-ancy-co-in.web.app)

</div>

---

## ✨ Features

<div align="center">

| 🚀 **Core Features** | 📱 **PWA Features** | 🔐 **Security** |
|---------------------|-------------------|-----------------|
| • Expense Tracking | • Installable App | • Google Auth |
| • Income Management | • Offline Support | • Secure Data |
| • Category Budgets | • Push Notifications | • Cloud Sync |
| • Visual Analytics | • Native Feel | • Real-time Updates |

</div>

### 🎯 Key Capabilities

- **📊 Smart Analytics** - Beautiful charts and spending insights
- **☁️ Cloud Sync** - Data automatically syncs across all devices
- **📱 Mobile First** - Optimized for mobile and desktop
- **🎨 Modern UI** - Clean design with smooth animations
- **🔄 Real-time** - Instant updates and synchronization
- **📈 Budget Tracking** - Set and monitor category budgets

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
| React 18 | Firebase Auth | Tailwind CSS | Firebase Hosting |
| Vite | Firestore DB | Framer Motion | PWA Ready |
| TypeScript | Real-time Sync | shadcn/ui | Service Worker |

</div>

---

## 📦 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Firebase account

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/ancy-expense-tracker.git
cd ancy-expense-tracker

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
│   └── charts/         # Chart components
├── hooks/              # Custom React hooks
│   ├── useAuth.js      # Authentication hook
│   └── useMonthData.js # Data management hook
├── lib/                # Utilities and configurations
│   ├── firebase.js     # Firebase configuration
│   ├── constants.js    # App constants
│   └── utils.js        # Utility functions
└── assets/             # Static assets
```

---

## 🎨 Features Overview

### 🔐 Authentication
- **Google Sign-in** - Secure authentication with Google
- **User Isolation** - Each user's data is completely isolated
- **Session Management** - Automatic login state management

### 💰 Expense Management
- **Add/Edit/Delete** - Full CRUD operations for expenses
- **Categories** - Custom categories with color coding
- **Budgets** - Set and track category budgets
- **Income Tracking** - Multiple income sources support

### 📊 Analytics
- **Visual Charts** - Beautiful pie charts for spending breakdown
- **Category Analysis** - Detailed spending by category
- **Budget Tracking** - Monitor budget vs actual spending
- **Data Export** - Export expenses to CSV format

### ☁️ Data Sync
- **Real-time Sync** - Instant synchronization across devices
- **Offline Storage** - Works without internet connection
- **Cross-device** - Access data from any device
- **Automatic Backup** - Cloud backup of all data

---

## 🚀 Deployment

The app is automatically deployed to Firebase Hosting:

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy
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
- **Issues**: [GitHub Issues](https://github.com/yourusername/ancy-expense-tracker/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/ancy-expense-tracker/wiki)

---

<div align="center">

**Built with ❤️ using React, Firebase, and Tailwind CSS**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/ancy-expense-tracker?style=social)](https://github.com/yourusername/ancy-expense-tracker)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/ancy-expense-tracker?style=social)](https://github.com/yourusername/ancy-expense-tracker)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/ancy-expense-tracker)](https://github.com/yourusername/ancy-expense-tracker/issues)

</div>
