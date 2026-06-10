# MongoDB Docker Setup - ITR App

## Status: ✅ Running

### MongoDB Container
- **Name:** itr-app-mongodb
- **Image:** mongo:latest
- **Port:** 27017
- **Database:** itr-app
- **Status:** Persistent volumes configured

### Connection String
```
mongodb://localhost:27017/itr-app
```
(Already configured in `apps/api/.env` as MONGODB_URI)

## Quick Commands

### Start MongoDB
```bash
docker-compose up -d
```

### Stop MongoDB
```bash
docker-compose stop
```

### View Logs
```bash
docker-compose logs mongodb
```

### Access MongoDB Shell
```bash
docker exec -it itr-app-mongodb mongosh mongodb://localhost:27017/itr-app
```

### Remove Container (cleanup)
```bash
docker-compose down
```

## Data Persistence
- MongoDB data is stored in Docker volumes:
  - `itr-app_mongodb_data` - Database files
  - `itr-app_mongodb_config` - Configuration
- Data persists even after stopping/restarting containers

## Verification
Run the following to verify MongoDB is working:
```bash
npm run dev:api
# Should show: ✅ MongoDB connected: localhost
```
