# 🚀 ApproveIt – Expense Approval & Management System

ApproveIt is a **full-stack expense submission and approval system** with built-in authentication, role-based access control, real-time currency conversion, and OCR-powered receipt scanning.  


---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT Token Authentication (secure & stateless)  
- Route Protection (frontend & backend)  
- Password Hashing (bcrypt)  
- Token Expiration handling  
- Role-based Access Control  

| Role       | Permissions |
|------------|-------------|
| 👤 Employee | Submit expenses, view own expenses, upload receipts |
| 👨‍💼 Manager | All employee permissions + approve/reject expenses, view team expenses |
| 👑 Admin    | All manager permissions + user management, system configuration, analytics |

---

### 💰 Multi-Currency Support
- 🌍 Supports **170+ currencies**  
- 📈 Real-time rates (live exchange updates)  
- 💱 Automatic currency conversion  
- 📊 Multi-currency analytics  

---

### 📄 OCR Integration
- 📱 Receipt Scanning (via **Tesseract.js**)  
- 🔍 Data Recognition (extract amount & vendor)  
- 📝 Smart Parsing (intelligent expense extraction)  
- 🖼️ Supports **JPG, PNG, PDF**  
- ⚡ Seamless expense submission workflow  

**OCR Workflow:**  
📤 Upload → 🔄 Processing → 📋 Extract → ✏️ Review → 💾 Submit  

---


## ⚙️ Tech Stack

**Frontend:**  
- ⚡ React (Vite)  
- 🎨 TailwindCSS / ShadCN UI  
- 🔄 Axios (API requests)  

**Backend:**  
- 🟢 Node.js + Express  
- 🗄️ MongoDB + Mongoose  
- 🔐 JWT Authentication  
- 📤 Multer (file uploads)  

**Integrations:**  
- 🌍 [REST Countries API](https://restcountries.com/) – Country & currency data  
- 💱 [Exchangerate.host](https://exchangerate.host/) – Currency conversion  
- 📄 [Tesseract.js](https://tesseract.projectnaptha.com/) – OCR for receipts  

---

## 🚀 Getting Started

### 🔧 Prerequisites
- [Node.js](https://nodejs.org/) (v16+)  
- [MongoDB](https://www.mongodb.com/)  

### 📥 Installation

```bash
# Clone the repo
git clone https://github.com/Vrajc/ApproveIt_odoo.git
cd ApproveIt_odoo

# Install dependencies (frontend + backend)
npm install

# Start frontend (Vite dev server)
npm run dev

# Start backend (Express API)
cd server
npm install
npm start


🛡️ Security Features

🔒 JWT-based authentication

🛡️ Encrypted login with bcrypt

🔐 Role-based access control

⏳ Configurable token expiration

📈 Future Enhancements

🔔 Email / Push notifications for approvals


