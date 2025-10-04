# 🏪 POS System Backend

A comprehensive Point of Sale (POS) system backend built with Node.js, Express.js, and MongoDB. This system provides a complete business management solution with advanced features for retail operations.

## 🚀 Features

### Core Business Modules
- **User Management** - Authentication, authorization, role-based access control
- **Store Management** - Multi-store support, user assignment, store-specific settings
- **Product Management** - Inventory tracking, pricing, categories, variations
- **Customer Management** - Customer profiles, account management
- **Supplier Management** - Vendor relationships, purchase tracking, ratings

### Sales & Operations
- **POS System** - Register management, transaction processing, session tracking
- **Invoice System** - Sales invoices, payments, QR codes, online payment links
- **Inventory Management** - Real-time stock tracking, low stock alerts, adjustments
- **Quotations** - Quote generation, email proposals, conversion to invoices

### Financial Management
- **Accounts** - Chart of accounts, double-entry bookkeeping
- **Transactions** - Financial transaction processing, reconciliation
- **Reports** - P&L, Balance Sheet, Cash Flow, Sales Analytics

### Human Resources
- **Employee Management** - Employee profiles, hierarchy, performance tracking
- **Attendance** - Check-in/out, breaks, overtime calculation
- **Payroll** - Automated payroll generation, allowances, deductions

### Project Management
- **Projects** - Project lifecycle management, team assignment
- **Tasks** - Task assignment, time tracking, comments, dependencies

### Support System
- **Tickets** - Customer and user support tickets
- **Conversations** - Ticket conversations, SLA management
- **Satisfaction** - Customer feedback and rating system

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express Validator with custom middleware
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan
- **Compression**: Compression middleware

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pos-system/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   # Edit .env file with your configuration
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `env.example`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/pos-system

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=30d

# Email (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment Gateways (Optional)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
PAYPAL_CLIENT_ID=your_paypal_client_id

# SMS Service (Optional)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints
```
POST /api/auth/register     - User registration
POST /api/auth/login        - User login
GET  /api/auth/me          - Get current user
POST /api/auth/refresh     - Refresh token
POST /api/auth/logout      - Logout
```

### Core Business Endpoints

#### Users
```
GET    /api/users           - Get all users
POST   /api/users           - Create user
GET    /api/users/:id       - Get user by ID
PUT    /api/users/:id       - Update user
DELETE /api/users/:id       - Delete user
```

#### Stores
```
GET    /api/stores          - Get all stores
POST   /api/stores          - Create store
GET    /api/stores/:id      - Get store by ID
PUT    /api/stores/:id      - Update store
DELETE /api/stores/:id      - Delete store
```

#### Products
```
GET    /api/products        - Get all products
POST   /api/products        - Create product
GET    /api/products/:id    - Get product by ID
PUT    /api/products/:id    - Update product
DELETE /api/products/:id    - Delete product
```

#### Customers
```
GET    /api/customers       - Get all customers
POST   /api/customers       - Create customer
GET    /api/customers/:id   - Get customer by ID
PUT    /api/customers/:id   - Update customer
DELETE /api/customers/:id   - Delete customer
```

#### Invoices
```
GET    /api/invoices        - Get all invoices
POST   /api/invoices        - Create invoice
GET    /api/invoices/:id    - Get invoice by ID
PUT    /api/invoices/:id    - Update invoice
DELETE /api/invoices/:id    - Delete invoice
```

#### Inventory
```
GET    /api/inventory/movements     - Get stock movements
POST   /api/inventory/movements     - Create stock movement
GET    /api/inventory/levels        - Get inventory levels
GET    /api/inventory/stats         - Get inventory statistics
```

#### POS Operations
```
GET    /api/pos/dashboard           - Get POS dashboard
POST   /api/pos/registers/:id/open  - Open register
POST   /api/pos/registers/:id/close - Close register
POST   /api/pos/transactions        - Create POS transaction
```

#### Reports
```
GET    /api/reports/dashboard       - Get dashboard statistics
GET    /api/reports/sales          - Get sales report
GET    /api/reports/purchases      - Get purchase report
GET    /api/reports/profit-loss    - Get P&L report
GET    /api/reports/balance-sheet  - Get balance sheet
```

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Format

```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Detailed error messages"]
}
```

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **admin** - Full system access
- **manager** - Store management access
- **sales_person** - Sales operations access
- **workshop_employee** - Workshop operations access
- **warehouse_manager** - Warehouse management access
- **warehouse_employee** - Warehouse operations access
- **customer** - Customer portal access

## 📊 Database Schema

### Key Models

- **User** - System users and staff
- **Store** - Business locations
- **Product** - Inventory items
- **Customer** - Customer information
- **Supplier** - Vendor information
- **Invoice** - Sales transactions
- **Transaction** - Financial transactions
- **Account** - Chart of accounts
- **Project** - Project management
- **Task** - Task management
- **Support** - Support tickets

## 🚀 Scripts

```bash
# Development
npm run dev          # Start with nodemon

# Production
npm start           # Start production server

# Testing
npm test           # Run tests
npm run test:watch # Run tests in watch mode

# Code Quality
npm run lint       # Run ESLint
npm run lint:fix   # Fix linting issues

# Database
npm run db:seed    # Seed database with sample data
npm run db:reset   # Reset database
```

## 🔒 Security Features

- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - Request rate limiting
- **Input Validation** - Comprehensive input validation
- **Password Hashing** - bcryptjs for password security
- **JWT Security** - Secure token-based authentication

## 📈 Performance Features

- **Compression** - Response compression
- **Indexing** - Database query optimization
- **Pagination** - Efficient data retrieval
- **Caching** - Response caching strategies

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "User"

# Run tests with coverage
npm run test:coverage
```

## 📝 Logging

The application uses Morgan for HTTP request logging:

- **Development**: Colored console output
- **Production**: Combined log format

## 🚀 Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure production database
4. Set up SSL certificates
5. Configure reverse proxy (nginx)
6. Set up monitoring and logging
7. Configure backup strategies

### Docker Deployment

```bash
# Build image
docker build -t pos-system-backend .

# Run container
docker run -p 5000:5000 --env-file .env pos-system-backend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the API documentation
- Review the code examples

## 🔄 Version History

- **v1.0.0** - Initial release with core POS features
- **v1.1.0** - Added project management and support system
- **v1.2.0** - Enhanced reporting and analytics
- **v1.3.0** - Added comprehensive validation system

---

**Built with ❤️ for modern retail businesses**