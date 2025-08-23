# CHANGELOG

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/) and [Keep a Changelog](http://keepachangelog.com/).

## [0.1.0] - 2025-08-15

### New
- **Documentation**: Added comprehensive implementation prompts and plans for Go and React+TypeScript
  - Detailed documentation for AI implementation prompts covering programming paradigms and design patterns
  - Implementation phases including concurrency, functional programming, interface design, and event-driven architecture
  - Guidelines for type-safe state management, advanced component patterns, and performance optimization
  - Integration instructions, testing strategies, and success criteria
- **API**: Added user management APIs for admin including pending users, approval, and rejection
- **Testing**: Setup testing environment with jest-dom for frontend testing
- **UI/UX**: Enhanced design system with refined styles and modern design variables
- **Theme**: Implemented enhanced theme with light and dark modes for improved accessibility
- **Docker**: Added Dockerfiles for API, SQLite Admin, and web services
- **CI/CD**: Added comprehensive GitHub Actions workflows for Go and Web builds
- **Quality**: Enhanced code quality processes with Docker integration and new scripts
- **Components**: Added multiple new React components:
  - Header controls component for navigation and user actions
  - Income breakdown chart component
  - KPI trend chart component for visualizing trends
  - Manual budget daily chart component
  - Outcome breakdown chart component
  - Savings progress chart component
  - Login and registration forms with validation
  - Password modal for changing user passwords
  - User Management and DB Admin components
- **Hooks**: Added custom hooks for budget management and navigation
  - `useBudgetState` for managing predicted budget and savings tracker
  - `useManualBudget` for handling manual budget persistence
  - `useMonthlyData` for fetching and managing monthly budget data
  - `useNavigation` for month navigation and active section tracking
  - `useTheme` for managing dark mode and currency preferences
- **Internationalization**: Added i18n support with English, French, and Spanish translations
- **API Endpoints**: Added endpoint to seed default income and budget sources for specified months

### Changes
- **Refactoring**: Improved code readability and consistency across components
  - Enhanced formatting and indentation in various components
  - Updated placeholder texts and labels for consistent styling and localization
  - Refactored functions and components to use arrow function syntax
  - Improved error handling and user feedback in admin and budget management components
  - Cleaned up unnecessary whitespace and comments
- **Performance**: Refactored chart components to use React.memo and useMemo for optimization
- **Configuration**: Updated Air configuration for improved development experience
- **Makefile**: Adjusted for better build and test commands, including frontend integration
- **Documentation**: Enhanced README with clearer setup instructions and configuration details
- **Localization**: Updated localization keys for better clarity and consistency across languages
- **Components**: Refactored various components for improved structure and performance
- **API Service**: Refactored API service functions to improve error messages and response handling
- **Project Structure**: Refactored for development focus and enhanced documentation

### Fixes
- **Types**: Added client_id to IncomeSource and OutcomeSource for unsaved rows identification
- **Makefile**: Fixed indentation for CSS/Vite lint targets to resolve GNU Make error
- **CI**: Updated golangci-lint action to version 7
- **SonarQube**: Removed conditional check for SONAR_TOKEN in SonarQube job
- **Error Handling**: Enhanced error handling in useAuth and useManualBudget hooks
- **ErrorBoundary**: Updated to suppress console errors in production
- **Test Stability**: Refactored test cases to improve environment variable handling
- **API Documentation**: Expanded to include new secure endpoints for manual budgets and income/budget sources

### Breaks
- None in this version

## Unreleased
---

### New

### Changes

### Fixes

### Breaks
