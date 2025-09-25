# 🏪 POS System Frontend

A modern, responsive frontend for the POS System built with Next.js, TypeScript, and Tailwind CSS.

## 🚀 Features

### Core Functionality
- **Modern UI/UX** - Clean, intuitive interface built with Tailwind CSS
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates** - Live data synchronization with React Query
- **Authentication** - Secure JWT-based authentication system
- **Role-based Access** - Granular permissions and access control

### Business Modules
- **Dashboard** - Comprehensive business overview with key metrics
- **User Management** - Complete user administration
- **Store Management** - Multi-store operations and settings
- **Product Management** - Inventory tracking and management
- **Customer Management** - Customer profiles and relationships
- **Invoice System** - Complete invoicing and payment processing
- **POS Operations** - Point of sale transaction processing
- **Inventory Management** - Real-time stock tracking
- **Project Management** - Project and task management
- **Support System** - Customer support ticket management
- **Financial Management** - Accounting and transaction management
- **HRM System** - Employee, attendance, and payroll management
- **Reports & Analytics** - Business intelligence and reporting

### Technical Features
- **TypeScript** - Full type safety and better developer experience
- **React Query** - Powerful data fetching and caching
- **Form Handling** - React Hook Form with validation
- **State Management** - Context API for global state
- **Toast Notifications** - User-friendly feedback system
- **Responsive Charts** - Data visualization with Recharts
- **File Upload** - Drag and drop file handling
- **PDF Generation** - Invoice and report generation
- **QR Code Generation** - For invoices and products
- **Date/Time Handling** - Comprehensive date utilities
- **Search & Filtering** - Advanced data filtering
- **Pagination** - Efficient data pagination
- **Loading States** - Skeleton loading and spinners

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI
- **Icons**: Heroicons
- **State Management**: React Query + Context API
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Notifications**: React Hot Toast
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **PDF Generation**: jsPDF + html2canvas
- **QR Codes**: react-qr-code
- **File Upload**: Built-in file handling
- **Animations**: Framer Motion

## 📦 Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_APP_NAME=POS System
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard page
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── providers.tsx      # App providers
│   ├── components/            # Reusable components
│   │   ├── layout/           # Layout components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── forms/            # Form components
│   │   ├── tables/           # Table components
│   │   ├── modals/           # Modal components
│   │   └── ui/               # UI components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utility functions
│   ├── types/                # TypeScript types
│   └── utils/                # Helper functions
├── public/                   # Static assets
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

## 🎨 UI Components

### Layout Components
- **Layout** - Main application layout
- **Sidebar** - Navigation sidebar with permissions
- **Header** - Top navigation with user menu
- **Breadcrumbs** - Navigation breadcrumbs

### Dashboard Components
- **DashboardStats** - Key metrics cards
- **QuickActions** - Quick action buttons
- **RecentActivity** - Activity feed
- **Charts** - Data visualization

### Form Components
- **FormInput** - Text input with validation
- **FormSelect** - Select dropdown
- **FormDatePicker** - Date picker
- **FormFileUpload** - File upload component
- **FormTextarea** - Textarea input

### Table Components
- **DataTable** - Generic data table
- **TablePagination** - Pagination controls
- **TableFilters** - Filter controls
- **TableActions** - Row action buttons

### Modal Components
- **Modal** - Base modal component
- **ConfirmModal** - Confirmation dialog
- **FormModal** - Modal with form
- **ImageModal** - Image viewer modal

## 🔐 Authentication

The frontend uses JWT-based authentication with the following flow:

1. **Login** - User credentials are sent to backend
2. **Token Storage** - JWT token stored in localStorage
3. **Protected Routes** - Routes are protected based on authentication
4. **Role-based Access** - UI elements shown based on user permissions
5. **Auto-logout** - Automatic logout on token expiration

### Permission System

The app uses a granular permission system:

```typescript
// Check if user has permission
const { hasPermission } = useAuth();
const canCreateUser = hasPermission('users', 'create');

// Check user role
const { hasRole } = useAuth();
const isAdmin = hasRole(['admin']);
```

## 📊 State Management

### React Query
- **Data Fetching** - Server state management
- **Caching** - Intelligent data caching
- **Background Updates** - Automatic data refetching
- **Optimistic Updates** - Immediate UI updates

### Context API
- **Authentication** - User state and auth methods
- **Theme** - Dark/light mode
- **Notifications** - Toast notifications

## 🎯 Key Features

### Dashboard
- Real-time business metrics
- Quick action buttons
- Recent activity feed
- Interactive charts and graphs

### Data Tables
- Sortable columns
- Advanced filtering
- Pagination
- Row selection
- Export functionality

### Forms
- Real-time validation
- Error handling
- Auto-save functionality
- File upload support

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Adaptive layouts
- Optimized performance

## 🚀 Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## 🔧 Configuration

### Tailwind CSS
Custom configuration in `tailwind.config.js`:
- Custom color palette
- Extended spacing
- Custom animations
- Component variants

### Next.js
Configuration in `next.config.js`:
- Image optimization
- API rewrites
- Environment variables
- Performance optimizations

### TypeScript
Strict configuration in `tsconfig.json`:
- Strict type checking
- Path mapping
- Modern ES features
- React optimizations

## 📱 Responsive Breakpoints

```css
/* Mobile First */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

## 🎨 Design System

### Colors
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Error**: Red (#EF4444)
- **Gray**: Multiple shades for text and backgrounds

### Typography
- **Font Family**: Inter (system font stack)
- **Font Sizes**: Tailwind's default scale
- **Font Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Spacing
- **Base Unit**: 4px (0.25rem)
- **Scale**: Tailwind's default spacing scale
- **Components**: Consistent padding and margins

## 🔒 Security Features

- **XSS Protection** - Input sanitization
- **CSRF Protection** - Token-based protection
- **Secure Headers** - Security headers configuration
- **Input Validation** - Client and server-side validation
- **Authentication** - JWT token management
- **Authorization** - Role-based access control

## 📈 Performance Optimizations

- **Code Splitting** - Automatic route-based splitting
- **Image Optimization** - Next.js Image component
- **Lazy Loading** - Component lazy loading
- **Caching** - React Query caching
- **Bundle Analysis** - Bundle size optimization
- **Tree Shaking** - Unused code elimination

## 🧪 Testing

### Testing Strategy
- **Unit Tests** - Component testing with Jest
- **Integration Tests** - API integration testing
- **E2E Tests** - End-to-end testing with Playwright
- **Visual Tests** - Visual regression testing

### Test Structure
```
__tests__/
├── components/     # Component tests
├── pages/         # Page tests
├── utils/         # Utility tests
└── integration/   # Integration tests
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm run start
```

### Environment Variables
Set the following environment variables for production:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_URL` - Frontend URL
- `NODE_ENV=production`

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
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
- Check the documentation
- Review the code examples

---

**Built with ❤️ for modern retail businesses**
