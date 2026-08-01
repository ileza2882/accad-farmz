# ACCAD FARMS - Precision Operations Platform

A professional, enterprise-grade Farm Management System designed for **ACCAD FARMS** with multi-department support, structured inventory management, multi-tier vetting workflows, and role-based access control for Executive Directors, Managers, and Staff.

---

## 🚀 Standalone Export & Database Status

This application is **fully exportable** for Google Antigravity, GitHub, Netlify, or local self-hosting.

### 🔒 Database Connection Notice
By default, this exported package is **completely disconnected** from the previous development database (`f5az55ir.us-east.insforge.app`).

- **Standalone Offline Mode**: The app operates with 100% full functionality using client-side persistent LocalStorage (`accad_users_v1`, `accad_reports_v1`). All user logins, inventory logs, vetting workflows, and PDF report generation work out of the box without requiring an external database connection.
- **Connecting a New Database**: If you wish to connect a new InsForge or PostgreSQL database instance, simply set your credentials in `.env`:
  ```env
  VITE_INSFORGE_PROJECT_NAME=your_project_name
  VITE_INSFORGE_URL=https://your-insforge-instance.app
  VITE_INSFORGE_API_KEY=your_api_key
  VITE_DISCONNECT_DATABASE=false
  ```

---

## 🔑 Default Administrator Login Credentials

When launching in standalone mode, use the Executive Director credentials below:

- **Email**: `info@accadfarms.com`
- **Password**: `123456`
- **Role**: Executive Director (Full System Access, Manager Management, Executive Vetting, Data Auditing)

---

## 🛠️ Quick Start & Local Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 📦 Exporting to Google Antigravity / GitHub

1. Click **Export to GitHub** or **Download ZIP** in the AI Studio menu.
2. The code contains clean dependencies, standard Vite + React 19 architecture, and zero hardcoded database dependencies.
3. Import the repository into **Google Antigravity** or your preferred web hosting environment.

---

## 🏛️ System Features & Structure

- **Executive Director Portal**: Executive approval workflows, department manager assignments, systemic PDF summaries, and staff account management.
- **Department Manager Portal**: Tier-1 report vetting, inventory auditing, rejection feedback loops, and staff monitoring.
- **Staff Portal**: Operations inventory entry, submission tracking, and department-specific forms (Cattle, Poultry, Crops, Feed, Security, etc.).
- **Data Export**: Built-in PDF report generator formatted with official ACCAD FARMS headers and metadata.
