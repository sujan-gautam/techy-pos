# 🚀 TechyPOS Deployment Guide (Vercel)

This project is now configured for a unified deployment on Vercel.

## 1. Environment Variables
You MUST set the following in your Vercel Project Settings:

### Backend Variables
- `MONGO_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A long random string for auth.
- `NODE_ENV`: Set to `production`.

### Frontend Variables
- `VITE_API_URL`: Set to `/api` (this is the default in the code now).

## 2. Deployment Steps
1. Push this repository to GitHub/GitLab/Bitbucket.
2. Link the repository to a new project in Vercel.
3. Vercel should automatically detect the `vercel.json` in the root.
4. If it asks for build settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `.` (Root)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`

## 3. Important Note on Socket.io
Vercel Serverless Functions have a short timeout and do not support long-lived WebSocket connections natively in the same way a dedicated server does. 
- The notification system will still work via **Polling** (which is implemented in `NotificationDropdown.jsx`).
- Real-time features using `socket.io` might have limitations on Vercel's free tier. 

---
**TechyPOS** - Premium Technical Operations Suite
