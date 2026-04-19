# Expense Tracker

## Core Features
- 🌙 Dark/Light Theme Toggle  
- User authentication and authorization  
- Budget tracking  
- Expense tracking  

## 🌙 Theme Support
The Expense Tracker now includes a Dark/Light theme toggle, allowing users to switch between themes seamlessly. This feature enhances the user experience by providing a visually comfortable interface for various lighting conditions. The implementation includes:
- **ThemeProvider**: A component that uses React's context API to provide theme settings throughout the application.
- **ThemeContext**: A context provider that holds the current theme state and provides functions to toggle between themes.
- **useTheme hook**: A custom hook for accessing the theme context and the current theme easily from any component.

## Feature Grid
| Feature                      | Description    |
|------------------------------|----------------|
| 🌙 Dark/Light Theme Toggle    | Allows users to switch between dark and light themes. |
| User Authentication           | Secure login/logout options. |
| Budget Tracking               | Track user budgets with visual feedback. |
| Expense Tracking              | Log and categorize expenses effectively. |

## Project Structure
- `src/`
  - `components/`
    - `ThemeProvider.js`
    - `ThemeContext.js`
    - `useTheme.js`
  - `pages/`
  - `styles/`

## Version History
### v2.0.0
- 🎨 Full SaaS Dashboard Redesign - Modern dashboard layout
- 📊 Pie Charts & Budget Progress Bars - Visual spending breakdown
- 🌙 Dark/Light Theme Toggle - Persistent theme preference
- 🔧 Enhanced Dialog System - Improved delete modals with controlled state
