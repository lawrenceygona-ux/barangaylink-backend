# BarangayLink Backend API

A secure RESTful backend API for digital barangay governance, resident profiling, document requests, and administrative analytics.

## Tech Stack
* **Runtime**: Node.js & Express.js (v5)
* **Database**: PostgreSQL (Custom `barangay` schema)
* **Authentication**: JWT (JSON Web Tokens) & bcrypt password hashing
* **Security & Utility**: Helmet, CORS, Morgan, dotenv

---

## Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+ recommended)
* [PostgreSQL](https://www.postgresql.org/) (running locally or remote)

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=barangaylink_db
DB_SCHEMA=barangay
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
```

### 3. Database Migration & Seeding
1. Execute the SQL scripts in [`sql`](./sql) in your PostgreSQL database to set up tables, stored procedures, and triggers.
2. Seed initial Administrator and Staff accounts:
   ```bash
   node seedUsers.js
   ```

### 4. Running the Application
```bash
# Install dependencies
npm install

# Start in development mode (with nodemon)
npm run dev

# Start in production mode
npm start
```

---

## API Endpoints

### Health Check
* `GET /api/health` - API server health status

### Authentication (`/api/v1/auth`)
* `POST /register` - Register a resident user account
* `POST /login` - Login with email & password (returns JWT)

### Resident Management (`/api/v1/residents`) *(Staff & Admin)*
* `GET /` - List all residents (supports search, purok filter, archived status)
* `GET /:id` - Get resident profile by ID (includes dynamically calculated age)

### Document Requests (`/api/v1/requests`)
* `POST /` *(Resident)* - Submit a document clearance/certification request
* `GET /` *(Resident / Staff / Admin)* - View document requests
* `PATCH /:id/status` *(Staff / Admin)* - Update request status (Pending, Approved, Rejected, Released)

### Dashboard (`/api/v1/dashboard`) *(Staff & Admin)*
* `GET /` - Summary metrics (total residents, households, pending/approved requests)
