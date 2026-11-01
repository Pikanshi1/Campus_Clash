# Campus Clash

Campus Clash is a real-time multiplayer browser game with user authentication,
single-player gameplay, multiplayer rooms, server-side combat, and persistent
room snapshots.

The project is split into two applications:

- `backend/` - Express, Socket.IO, Prisma, and PostgreSQL API/server
- `frontend/` - Next.js, React, Phaser, and the browser UI

## Features

- User registration and login
- JWT-based API and Socket.IO authentication
- Password reset email flow
- Player dashboard and progression statistics
- Single-player game mode
- Multiplayer rooms with server-authoritative combat
- Persistent multiplayer room snapshots in PostgreSQL
- CORS configuration for local and production frontend origins

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL database

## Project setup

Install dependencies for both applications:

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

### Backend environment

Create `backend/.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
JWT_SECRET=replace-with-a-long-random-secret
FRONTEND_URL=http://localhost:3000

# Required only for password reset emails
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=no-reply@example.com
```

Never commit `.env` files or real credentials. The repository ignores local
environment files by default.

Apply database migrations and generate the Prisma client:

```bash
cd backend
npm run db:deploy
npx prisma generate
```

### Frontend environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

`NEXT_PUBLIC_API_URL` must be the public backend URL in production.

## Running locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend in a second terminal:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The backend health endpoint is available at
[http://localhost:5000/api/health](http://localhost:5000/api/health).

## Validation commands

Backend tests:

```bash
cd backend
npm test
```

Backend production build:

```bash
cd backend
npm run build
```

Frontend lint:

```bash
cd frontend
npm run lint
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Deployment

The recommended deployment is:

- Backend: Render Web Service
- Frontend: Vercel
- Database: hosted PostgreSQL, such as Neon

### Deploy the backend to Render

Create a Render Web Service connected to this repository with:

- Root directory: `backend`
- Build command: `npm ci && npm run build`
- Start command: `npm start`

Set these environment variables in Render:

```env
DATABASE_URL=<production PostgreSQL connection string>
JWT_SECRET=<long random production secret>
FRONTEND_URL=https://<your-vercel-domain>
NODE_ENV=production
HOST=0.0.0.0
PORT=<provided by Render, if required by the service>
```

For password reset support, also configure `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, and optionally `SMTP_FROM`.

Run the Prisma migrations against the production database before serving
traffic:

```bash
npm run db:deploy
```

The backend must run as a persistent service because multiplayer gameplay uses
Socket.IO WebSocket connections.

### Deploy the frontend to Vercel

Create a Vercel project connected to this repository with:

- Root directory: `frontend`
- Framework preset: Next.js
- Build command: `npm run build`

Set this Vercel environment variable:

```env
NEXT_PUBLIC_API_URL=https://<your-render-backend-domain>
```

After the Vercel domain is known, set the same domain in the Render
`FRONTEND_URL` variable and redeploy or restart the backend.

### Production checks

After deployment, verify:

1. `https://<your-render-backend-domain>/api/health` returns a successful JSON
   response.
2. The frontend can register and log in.
3. Multiplayer connects through Socket.IO.
4. Password reset works if SMTP is configured.
5. Render logs show no database, CORS, or JWT configuration errors.

## Security notes

- Use a unique, high-entropy `JWT_SECRET` in production.
- Do not expose `DATABASE_URL`, SMTP credentials, or JWT secrets to Vercel.
- Only `NEXT_PUBLIC_API_URL` belongs in the frontend environment.
- Keep `FRONTEND_URL` set to the exact production frontend origin.
- Review database backups and connection pooling settings with the PostgreSQL
  provider before launch.

---

## 👩‍💻 Author

### Pikanshi Mehta

**3rd Year Computer Science Engineering Student — NIT Hamirpur**

Interested in:

- Full-Stack Development
- Artificial Intelligence & Machine Learning
- DSA & Problem Solving
- Open Source
- Building impactful products

---

## ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on
GitHub!

---

> **Build skills. Build ideas. Build your future. 🚀**

