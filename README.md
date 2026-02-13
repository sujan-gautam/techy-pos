# Techy Repair Shop POS

A scalable Repair Shop Inventory & Job Management system built with Node.js, MongoDB, and React.

## Features
- **Role-Based Access Control**: Admin, Manager, Technician roles.
- **Inventory Management**: Track parts, stock levels, locations, and low-stock alerts.
- **Job Management**: Create repair jobs, assign technicians, reserve parts, track status.
- **Audit Logs**: Full transaction history for every stock change.
- **Real-time Updates**: WebSockets for instant dashboard updates.
- **Mobile-Friendly UI**: Responsive design with Tailwind CSS.

## Prerequisites
- Node.js (v18+)
- MongoDB (Running locally or cloud URI)

## Installation

1.  **Backend Setup**
    ```bash
    cd backend
    npm install
    # Create .env file based on .env.example (already created .env for dev)
    # Import seed data (optional)
    npm run data:import
    ```

2.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    ```

## Running the App

### Development Mode

1.  Start Backend:
    ```bash
    cd backend
    npm run dev
    ```
    Server runs on `http://localhost:5000`

2.  Start Frontend:
    ```bash
    cd frontend
    npm run dev
    ```
    App runs on `http://localhost:5173`

### Production with Docker

```bash
docker-compose up --build
```

## API Documentation
- Check backend routes in `backend/src/routes`
- Postman collection export (simulated) available via API structure.

## Default Credentials (Seeder)
- **Admin**: admin@example.com / password123
- **Technician**: tech@example.com / password123
