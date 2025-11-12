# Backend Application

Express.js server with TypeScript, Prisma, and Zod validation for game systems.

## Features

- **Express Server**: Modular router structure with middleware
- **Prisma ORM**: SQLite database with Player and PlayerSession models
- **Zod Validation**: Request/response schema validation
- **Player Sessions**: Authentication-free single-player session handling
- **Error Handling**: Graceful error handling with structured responses
- **TypeScript**: Full type safety across the application

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8.6+

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Push database schema
pnpm prisma:push
```

### Development

```bash
# Start development server with hot reload
pnpm dev
```

The server will start on `http://localhost:3000`.

### Build & Start

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

## API Endpoints

### Health Check

**GET** `/api/health`

Returns server health status and database connection.

```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2025-11-12T18:56:25.385Z",
    "uptime": 11,
    "database": "connected"
  }
}
```

### Player Summary

**GET** `/api/players/:playerId/summary`

Fetches or creates a player and returns their summary with active session.

**Parameters:**
- `playerId` (path): Unique player identifier

**Response:**
```json
{
  "success": true,
  "message": "Player summary fetched",
  "data": {
    "id": "player-123",
    "name": "Adventurer-P123",
    "stats": {
      "level": 1,
      "experience": 0,
      "health": {
        "current": 100,
        "max": 100
      },
      "energy": {
        "current": 100,
        "max": 100
      },
      "gold": 0
    },
    "session": {
      "id": "uuid",
      "status": "ACTIVE",
      "lastActiveAt": "2025-11-12T18:56:31.603Z",
      "createdAt": "2025-11-12T18:56:31.603Z",
      "updatedAt": "2025-11-12T18:56:31.603Z"
    },
    "createdAt": "2025-11-12T18:56:31.597Z",
    "updatedAt": "2025-11-12T18:56:31.597Z"
  }
}
```

## Project Structure

```
src/
├── config/          # Configuration management
├── lib/             # Shared libraries (Prisma client)
├── middleware/      # Express middleware
│   ├── error-handler.ts
│   ├── not-found.ts
│   ├── player-context.ts
│   └── validate.ts
├── routes/          # API routes
│   ├── health.routes.ts
│   ├── player.routes.ts
│   └── index.ts
├── schemas/         # Zod validation schemas
│   └── api.ts
├── services/        # Business logic layer
│   └── player.service.ts
├── types/           # TypeScript type definitions
│   └── express.d.ts
├── utils/           # Utility functions
│   ├── async-handler.ts
│   └── errors.ts
├── app.ts           # Express app setup
└── index.ts         # Server entry point
```

## Database

The application uses SQLite via Prisma ORM.

### Models

**Player**
- `id`: String (primary key)
- `name`: String
- `level`: Integer (default: 1)
- `experience`: Integer (default: 0)
- `health`: Integer (default: 100)
- `maxHealth`: Integer (default: 100)
- `energy`: Integer (default: 100)
- `maxEnergy`: Integer (default: 100)
- `gold`: Integer (default: 0)

**PlayerSession**
- `id`: UUID (primary key)
- `playerId`: String (foreign key)
- `status`: String (ACTIVE/COMPLETED)
- `lastActiveAt`: DateTime
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Prisma Commands

```bash
# Generate Prisma client
pnpm prisma:generate

# Push schema changes to database
pnpm prisma:push

# Create a migration
pnpm prisma:migrate

# Open Prisma Studio
pnpm prisma:studio
```

## Error Handling

All errors are handled consistently and return structured JSON responses:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "path": ["field"],
      "message": "Validation error message"
    }
  ]
}
```

Error types:
- **ValidationError** (400): Request validation failed
- **NotFoundError** (404): Resource not found
- **ConflictError** (409): Resource conflict
- **BadRequestError** (400): Invalid request
- **AppError** (500): Internal server error

## Environment Variables

Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="file:./prisma/dev.db"
```

## Session Handling

The backend implements authentication-free session handling:

1. Client requests a player endpoint with a player ID
2. `loadPlayerContext` middleware ensures player exists or creates it
3. Active session is retrieved or created for the player
4. Player and session data are attached to request object
5. Subsequent requests update the session's `lastActiveAt` timestamp

This allows for stateless operation while tracking player activity.
