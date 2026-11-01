# 🎮 Campus Clash

### A Real-Time Multiplayer Browser Game

**Campus Clash** is a browser-based multiplayer gaming platform where players can jump into single-player matches or compete with others in real time.

Built with **Next.js, Phaser, Express, Socket.IO, Prisma and PostgreSQL**, the project combines browser-based gameplay with authenticated users, multiplayer rooms, server-authoritative combat and persistent game state.

[![GitHub](https://img.shields.io/badge/GitHub-Pikanshi1%2FCampus__Clash-181717?logo=github)](https://github.com/Pikanshi1/Campus_Clash)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-black?logo=socket.io)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql)

---

## ✨ Features

### 🔐 Authentication & Account Management
- User registration and login.
- JWT-based authentication.
- Protected API routes.
- Socket.IO connection authentication.
- Password reset through email.
- Secure password hashing.

### 🎯 Gaming Experience
- Browser-based gameplay powered by Phaser.
- Single-player game mode.
- Multiplayer gameplay.
- Interactive game interface.
- Player dashboard and progression statistics.

### ⚔️ Real-Time Multiplayer
- Create and join multiplayer rooms.
- Real-time communication using Socket.IO.
- Server-authoritative combat handling.
- Persistent multiplayer room snapshots.
- PostgreSQL-backed game state persistence.

### 🛠️ Backend & Security
- RESTful API using Express.
- Database management with Prisma ORM.
- Configurable CORS for frontend origins.
- Environment-based configuration.
- Password reset email integration.

---

## 🧰 Tech Stack

| Category | Technologies |
|---|---|
| Frontend Framework | Next.js 16 |
| UI Library | React 19 |
| Language | TypeScript |
| Game Engine | Phaser 4 |
| Animations | Framer Motion |
| Styling | Tailwind CSS 4 |
| Icons | Lucide React |
| Backend | Node.js, Express 5 |
| Real-Time Communication | Socket.IO |
| Authentication | JWT, bcryptjs |
| ORM | Prisma 7 |
| Database | PostgreSQL |
| Email Service | Nodemailer |
| Deployment | Vercel, Render |
| Database Hosting | Neon / PostgreSQL |

---

## 🏗️ Architecture

Campus Clash follows a separate frontend and backend architecture.

```text
                 CAMPUS CLASH
                       |
          +------------+------------+
          |                         |
       FRONTEND                  BACKEND
          |                         |
     Next.js + React           Express + Node.js
          |                         |
       Phaser                   REST API
          |                         |
     Game Interface             JWT Auth
          |                         |
          +------ Socket.IO --------+
                                    |
                          Server-side Game Logic
                                    |
                               Prisma ORM
                                    |
                               PostgreSQL
```

### Project Structure

```text
Campus_Clash/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── game/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── game/
│   │   ├── multiplayer/
│   │   ├── play/
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── lib/
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## ⚙️ Getting Started

Follow these instructions to run Campus Clash locally.

### Prerequisites

Make sure you have installed:

- Node.js 20 or newer
- npm
- PostgreSQL database
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Pikanshi1/Campus_Clash.git

cd Campus_Clash
```

### 2. Install Dependencies

Install backend dependencies:

```bash
cd backend
npm ci
```

Install frontend dependencies:

```bash
cd ../frontend
npm ci
```

---

## 🔑 Environment Configuration

### Backend Configuration

Create a `.env` file inside the `backend/` directory.

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require

PORT=5000
HOST=0.0.0.0
NODE_ENV=development

JWT_SECRET=your_long_random_secret

FRONTEND_URL=http://localhost:3000

# SMTP configuration for password reset emails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=no-reply@example.com
```

**Environment variable notes:**

- `DATABASE_URL`: PostgreSQL connection string.
- `JWT_SECRET`: Secret used for JWT signing and verification.
- `FRONTEND_URL`: Allowed frontend origin.
- SMTP variables: Required for password reset email functionality.

Use your actual database and SMTP provider credentials.

### Frontend Configuration

Create `.env.local` inside the `frontend/` directory.

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

This variable specifies the backend API URL.

For production, replace it with your deployed backend URL.

**Important:** Never expose database credentials, JWT secrets or SMTP passwords in frontend environment variables.

---

## 🗄️ Database Setup

Campus Clash uses Prisma ORM with PostgreSQL.

From the `backend/` directory, run:

```bash
npm run db:deploy
```

Generate the Prisma client:

```bash
npx prisma generate
```

Make sure your PostgreSQL database is accessible before running migrations.

---

## 🚀 Running the Application

You need two separate terminals to run both applications.

### Terminal 1: Backend

```bash
cd backend

npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

### Terminal 2: Frontend

```bash
cd frontend

npm run dev
```

Open the application:

```text
http://localhost:3000
```

You can now explore Campus Clash in your browser.

---

## 🧪 Testing & Validation

The project includes backend tests for multiplayer game logic and CORS configuration.

### Backend Tests

```bash
cd backend

npm test
```

### Backend Production Build

```bash
npm run build
```

### Frontend Linting

```bash
cd frontend

npm run lint
```

### Frontend Production Build

```bash
npm run build
```

---

## ☁️ Deployment

The recommended production architecture separates the frontend, backend and database.

| Component | Hosting |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | Neon PostgreSQL |

### Backend — Render

Create a new Render Web Service connected to your GitHub repository.

Configuration:

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm start` |

Configure the following environment variables:

```env
DATABASE_URL=your_production_database_url
JWT_SECRET=your_production_secret
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
HOST=0.0.0.0
```

Also configure the SMTP variables if password reset emails are required.

Run database migrations against the production database:

```bash
npm run db:deploy
```

**Important:** Use a persistent backend service that supports WebSocket connections because multiplayer gameplay relies on Socket.IO.

### Frontend — Vercel

Import the GitHub repository into Vercel.

Configuration:

| Setting | Value |
|---|---|
| Root Directory | `frontend` |
| Framework | Next.js |
| Build Command | `npm run build` |

Add the environment variable:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

After deployment, configure the exact Vercel frontend origin in the backend's `FRONTEND_URL` environment variable.

---

## 🔒 Security Considerations

- Never commit `.env` or `.env.local` files.
- Use strong, unique JWT secrets in production.
- Keep database credentials and SMTP credentials on the backend.
- Configure CORS to allow only trusted frontend origins.
- Authenticate Socket.IO connections.
- Keep production dependencies and database migrations updated.
- Configure database backups and connection pooling.

---

## 👩‍💻 Author

**Pikanshi Mehta**

Third-Year Computer Science Engineering Student  
National Institute of Technology, Hamirpur

Interested in building scalable applications and exploring:

- Full-Stack Development
- Artificial Intelligence & Machine Learning
- Data Structures & Algorithms
- Open Source Development

**GitHub:** [@Pikanshi1](https://github.com/Pikanshi1)

---

## ⭐ Support

If you find Campus Clash interesting, consider giving the repository a star ⭐.

Contributions, suggestions and feedback are welcome!

---

<p align="center">
  <b>Built with passion, code, and a competitive spirit. 🎮</b>
</p>