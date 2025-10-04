PS C:\Users\Asus\ApproveIt> git push origin main
error: src refspec main does not match any
error: failed to push some refs to 'https://github.com/Vrajc/ApproveIt_odoo.git'
PS C:\Users\Asus\ApproveIt> # Check Git status
PS C:\Users\Asus\ApproveIt> git status
On branch master
nothing to commit, working tree clean
PS C:\Users\Asus\ApproveIt> 
PS C:\Users\Asus\ApproveIt> # Check remote URL
PS C:\Users\Asus\ApproveIt> git remote -v
origin  https://github.com/Vrajc/ApproveIt_odoo.git (fetch)
origin  https://github.com/Vrajc/ApproveIt_odoo.git (push)
PS C:\Users\Asus\ApproveIt> 
PS C:\Users\Asus\ApproveIt> # Check current branch
PS C:\Users\Asus\ApproveIt> git branch

ApproveIt/
├── 📁 public/                 # Static assets
├── 📁 src/                    # Frontend source code
│   ├── 📁 components/         # Reusable React components
│   │   ├── FileUpload.jsx     # Drag & drop file upload
│   │   ├── Navbar.jsx         # Navigation component
│   │   └── ProtectedRoute.jsx # Route protection
│   ├── 📁 context/            # React Context providers
│   │   ├── AuthContext.jsx    # Authentication context
│   │   └── CurrencyContext.jsx # Currency management
│   ├── 📁 pages/              # Page components
│   │   ├── Dashboard.jsx      # Main dashboard
│   │   ├── ExpenseSubmission.jsx # Expense form
│   │   ├── ApprovalWorkflow.jsx   # Approval interface
│   │   ├── Login.jsx          # User login
│   │   └── Register.jsx       # User registration
│   └── 📁 utils/              # Utility functions
├── 📁 server/                 # Backend source code
│   ├── 📁 controllers/        # Route controllers
│   ├── 📁 middleware/         # Custom middleware
│   ├── 📁 models/             # MongoDB models
│   ├── 📁 routes/             # API routes
│   └── 📁 uploads/            # File uploads (gitignored)
├── 📄 package.json           # Frontend dependencies
├── 📄 vite.config.js         # Vite configuration
└── 📄 README.md              # This file


📱 Screenshots
🏠 Dashboard
<img alt="Dashboard" src="https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Dashboard+Screenshot">

💰 Expense Submission
<img alt="Expense Submission" src="https://via.placeholder.com/800x400/10B981/FFFFFF?text=Expense+Submission">

✅ Approval Workflow
<img alt="Approval Workflow" src="https://via.placeholder.com/800x400/F59E0B/FFFFFF?text=Approval+Workflow">

📊 Analytics
<img alt="Analytics" src="https://via.placeholder.com/800x400/EF4444/FFFFFF?text=Analytics+Dashboard">

🔐 Authentication & Authorization
User Roles
Role	Permissions
👤 Employee	• Submit expenses<br>• View own expenses<br>• Upload receipts
👨‍💼 Manager	• All Employee permissions<br>• Approve/reject expenses<br>• View team expenses
👑 Admin	• All Manager permissions<br>• User management<br>• System configuration<br>• Analytics access
Security Features
🔒 JWT Token Authentication - Secure, stateless authentication
🛡️ Route Protection - Both frontend and backend route guards
🔐 Password Hashing - bcrypt for secure password storage
⏰ Token Expiration - Configurable token lifetime
🚫 Role-based Access - Fine-grained permission control
💰 Multi-Currency Support
Features
🌍 170+ Currencies - Support for major world currencies
📈 Real-time Rates - Live exchange rate updates
💱 Auto Conversion - Automatic currency conversion
📊 Multi-currency Reports - Analytics in multiple currencies
Supported Currencies
USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, and more!
Implementation
📄 OCR Integration
Tesseract.js OCR Features
📱 Receipt Scanning - Extract text from receipt images
🔍 Data Recognition - Automatic amount and vendor detection
📝 Smart Parsing - Intelligent data extraction
🖼️ Multiple Formats - Support for JPG, PNG, PDF
OCR Workflow
📤 Upload Receipt - Drag & drop or click to upload
🔄 Processing - Tesseract.js processes the image
📋 Data Extraction - Extract relevant expense data
✏️ Review & Edit - User can review and modify extracted data
💾 Submit - Submit expense with extracted data
