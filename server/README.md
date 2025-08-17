# Pedal Playground REST API

This REST API provides access to the Pedal Playground database of guitar pedals and pedalboards.

## 🚀 Getting Started

### Prerequisites
- Node.js and npm installed
- SQLite database set up (run `npm run db:setup` and `npm run db:seed`)

### Starting the API Server

```bash
# Start both frontend and API servers
npm start

# Or start just the API server
npm run api

# API will be available at: http://localhost:3001
```

## 📋 API Endpoints

### Health Check

#### `GET /api/health`
Check if the API server is running.

**Response:**
```json
{
  "success": true,
  "message": "Pedal Playground API is running",
  "timestamp": "2025-08-16T17:44:00.000Z",
  "version": "1.0.0"
}
```

---

## 🎸 Pedals API

### Get All Pedals

#### `GET /api/pedals`
Retrieve pedals with optional filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 1000)
- `brand` (string): Filter by brand name (partial match)
- `search` (string): Search in brand and name (partial match)
- `minWidth` (number): Minimum width filter (inches)
- `maxWidth` (number): Maximum width filter (inches)
- `minHeight` (number): Minimum height filter (inches)
- `maxHeight` (number): Maximum height filter (inches)
- `sort` (string): Sort field - `brand`, `name`, `width`, `height`, `created_at` (default: `brand`)
- `order` (string): Sort order - `asc`, `desc` (default: `asc`)

**Examples:**
```bash
# Get first 10 pedals
curl "http://localhost:3001/api/pedals?limit=10"

# Search for Boss pedals
curl "http://localhost:3001/api/pedals?brand=Boss"

# Find compact pedals (under 3" wide)
curl "http://localhost:3001/api/pedals?maxWidth=3"

# Search for fuzz pedals
curl "http://localhost:3001/api/pedals?search=fuzz"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "brand": "Boss",
      "name": "DD-7",
      "width": 2.88,
      "height": 5.13,
      "image": "boss-dd7.png",
      "created_at": "2025-08-16T17:44:00.000Z",
      "updated_at": "2025-08-16T17:44:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 7500,
    "totalPages": 150,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filters": {
    "brand": null,
    "search": null,
    "sort": "brand",
    "order": "asc"
  }
}
```

### Get Pedal by ID

#### `GET /api/pedals/:id`
Retrieve a specific pedal by its ID.

**Example:**
```bash
curl "http://localhost:3001/api/pedals/1"
```

### Get Pedal Brands

#### `GET /api/pedals/brands`
Get list of all unique pedal brands with counts.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "brand": "Boss",
      "count": 156
    },
    {
      "brand": "Strymon",
      "count": 23
    }
  ]
}
```

### Get Pedal Statistics

#### `GET /api/pedals/stats`
Get overall pedal statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPedals": 7500,
    "totalBrands": 485,
    "dimensions": {
      "width": {
        "min": 1.5,
        "max": 12.75,
        "avg": 3.42
      },
      "height": {
        "min": 2.1,
        "max": 8.25,
        "avg": 4.68
      }
    }
  }
}
```

---

## 📋 Pedalboards API

### Get All Pedalboards

#### `GET /api/pedalboards`
Retrieve pedalboards with optional filtering and pagination.

**Query Parameters:** (Same as pedals API)

**Example:**
```bash
# Get Pedaltrain pedalboards
curl "http://localhost:3001/api/pedalboards?brand=Pedaltrain"
```

### Get Pedalboard by ID

#### `GET /api/pedalboards/:id`
Retrieve a specific pedalboard by its ID.

### Get Pedalboard Brands

#### `GET /api/pedalboards/brands`
Get list of all unique pedalboard brands with counts.

### Get Pedalboard Statistics

#### `GET /api/pedalboards/stats`
Get overall pedalboard statistics.

### Get Common Pedalboard Sizes

#### `GET /api/pedalboards/sizes`
Get most common pedalboard dimensions for recommendations.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "width": 24,
      "height": 12.5,
      "count": 8,
      "examples": ["Pedaltrain Classic 2", "Boss BCB-60", "Mono Medium"]
    }
  ]
}
```

---

## 🚨 Error Handling

All endpoints return consistent error responses:

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "status": 400,
    "details": "Additional error details (development only)"
  }
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔧 Development

### Testing the API

```bash
# Test health endpoint
curl http://localhost:3001/api/health

# Test pedals endpoint
curl http://localhost:3001/api/pedals?limit=5

# Test pedalboards endpoint  
curl http://localhost:3001/api/pedalboards?limit=5
```

### CORS Configuration

The API is configured to accept requests from:
- `http://localhost:3000` (browser-sync default)
- `http://127.0.0.1:3000`
- `http://localhost:8080`
- `http://127.0.0.1:8080`

### Database Connection

The API connects to the SQLite database at `database/pedalplayground.db` in read-only mode for safety.

---

## 🚀 Future Enhancements

Planned features for future versions:
- User authentication and authorization
- Favorite pedals/pedalboards
- User-created pedalboard layouts
- Image upload for custom pedals
- Real-time updates via WebSockets
- GraphQL endpoint option