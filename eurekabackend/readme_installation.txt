EurekaBackend - Installation and Configuration Guide

Overview
--------
EurekaBackend is a REST API for managing 3D virtual environments, points of interest (POI),
tour routes and 3D objects. It supports local authentication and SSO via EGI Check-In.

System Requirements
-------------------
- Node.js v18+
- npm v9+
- Database: MySQL/MariaDB

1. Clone the repository
   git clone <your-repo-url>
   cd eurekabackend

2. Install dependencies
   npm install

3. Environment configuration
   Create a .env file in the project root (see .env.example):

   PORT=5000
   JWT_SECRET=<your-long-secret-string>

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=<your-db-password>
   DB_NAME=eureka

   EGI_CLIENT_ID=<your-egi-client-id>
   EGI_CLIENT_SECRET=<your-egi-client-secret>
   EGI_REDIRECT_URI=http://localhost:5173/

   TRELLIS_API_URL=http://localhost:7960

4. Database initialization
   Create an empty database in MariaDB/MySQL:

       mysql -u root -p
       CREATE DATABASE eureka;
       EXIT;

   The application expects the schema to already exist in the target database.

5. Run the server
   npm start          # production
   npm run dev        # development with auto-reload

   The server will be available at: http://localhost:5000

6. Project structure
   eurekabackend/
   ├── server.js              # Entry point
   ├── config/
   │   └── db.js              # Database configuration
   ├── routes/
   │   ├── auth.js            # Authentication (login + EGI)
   │   ├── users.js           # User management
   │   ├── environments.js    # Virtual environments
   │   ├── objects.js         # 3D object instances
   │   ├── env_objects.js     # 3D object library
   │   ├── env_pois.js        # Points of interest
   │   ├── tour_routes.js     # Tour routes
   │   └── tour_stops.js      # Tour stops
   ├── services/
   │   └── trellisQueue.js    # AI 3D generation queue client
   └── uploads/               # Uploaded files (GLB, images, audio)

7. Main API endpoints
   POST  /api/auth/login                   Local login
   GET   /api/auth/egi-login               EGI SSO login
   GET   /api/environments                 List environments
   GET   /api/env_pois?environment_id=X    POIs of an environment
   GET   /api/tour_routes?environment_id=X Routes of an environment
   GET   /api/env_objects                  3D object library
   GET   /uploads/*                        Static files

8. Troubleshooting
   - Access denied (MySQL): check credentials in .env
   - EADDRINUSE: port 5000 already in use, change PORT in .env
