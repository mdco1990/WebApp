# Budget Planner API Documentation

This directory contains the API documentation for the Budget Planner application.

## Accessing the API Documentation

### SwaggerUI (Interactive)
- Admin-only. Requires a logged-in admin session.
- **Local Development (Docker)**: http://localhost:5173/api/
- **Local Development (Direct)**: http://localhost:8082/api/ (when running API locally)
- **Production**: http://instance-agent.subnet05071228.vcn05071228.oraclevcn.com:5173/api/

### OpenAPI Specification
- **YAML Format**: `/docs/swagger.yaml`
- **Via Frontend Proxy**: http://localhost:5173/docs/swagger.yaml
- **Direct Access (Local only)**: http://localhost:8082/docs/swagger.yaml

## Security & Access

### Docker Compose Setup (Recommended)
- API is isolated within Docker network and not published to host
- SQLite Web admin is internal-only and reachable via API reverse proxy at `/db-admin/` (admin-only)
- All local access goes through frontend proxy at port 5173
- Provides secure development environment with proper network isolation

### Local Development Setup
- API runs on 127.0.0.1:8082 (localhost only)
- Direct API access available for debugging and testing
- Use `configs/.env.local` configuration

## API Overview

The Budget Planner API provides comprehensive endpoints for:

### Authentication (`/auth`)
- `POST /auth/login` - User authentication
- `POST /auth/logout` - Session termination
- `POST /auth/register` - User registration

### Health Check
- `GET /healthz` - Service health status

### Financial Data Management (`/api/v1`)

#### Income Sources
- `GET /api/v1/income-sources` - List monthly income sources
- `POST /api/v1/income-sources` - Create new income source
- `PUT /api/v1/income-sources/{id}` - Update income source
- `DELETE /api/v1/income-sources/{id}` - Delete income source

#### Budget Sources
- `GET /api/v1/budget-sources` - List monthly budget categories
- `POST /api/v1/budget-sources` - Create new budget category
- `PUT /api/v1/budget-sources/{id}` - Update budget category
- `DELETE /api/v1/budget-sources/{id}` - Delete budget category

#### Expenses
- `GET /api/v1/expenses` - List monthly expenses
- `POST /api/v1/expenses` - Create new expense
- `DELETE /api/v1/expenses/{id}` - Delete expense

#### Monthly Data
- `GET /api/v1/monthly-data` - Get comprehensive monthly financial data
- `GET /api/v1/summary` - Get monthly summary (legacy)
- `POST /api/v1/salary` - Set monthly salary (legacy)
- `POST /api/v1/budget` - Set monthly budget (legacy)

## Authentication

The API uses two authentication layers:

1. Session Authentication (required):
  - Header: `Authorization: Bearer {session_id}`
  - Obtained from `/auth/login` endpoint

2. API Key (required for `/api/v1`):
  - Header: `X-API-Key: your-secret-api-key`

Admin-only surfaces:
- `/api/` (Swagger UI)
- `/db-admin/` (SQLite Web)

## Data Format

- All monetary amounts are stored and transmitted in **cents** to avoid floating-point precision issues
- Example: `amount_cents: 150000` represents $1,500.00
- Dates follow ISO 8601 format: `"2025-08-08T21:56:13Z"`
- Year/Month parameters: `year=2025&month=8`

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Not Found
- `409` - Conflict (e.g., username already exists)
- `500` - Internal Server Error

## Example Usage

### Login
```bash
curl -X POST http://localhost:8082/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Create Income Source
```bash
curl -X POST http://localhost:8082/api/v1/income-sources \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key" \
  -H "Authorization: Bearer {session_id}" \
  -d '{"name":"Primary Job","year":2025,"month":8,"amount_cents":500000}'
```

### Get Monthly Data
```bash
curl http://localhost:8082/api/v1/monthly-data?year=2025&month=8 \
  -H "X-API-Key: your-secret-api-key" \
  -H "Authorization: Bearer {session_id}"
```

### Access DB Admin (via frontend proxy)
Open http://localhost:5173/db-admin/ in a browser while logged in as an admin user.

## Development

To update the API documentation:

1. Edit `docs/swagger.yaml` with your changes
2. Restart the API service: `docker compose restart api`
3. Documentation will be available at `/api/`

## Frontend Integration

The frontend includes a direct link to the API documentation in the header toolbar (📚 API Docs button) when logged in.
