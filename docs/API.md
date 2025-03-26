# Agent Minder API Documentation

This document provides information about the Agent Minder RESTful API.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Authentication is handled via JWT tokens. To access protected endpoints:

1. Obtain a token via the login endpoint
2. Include the token in the Authorization header of all requests:
   ```
   Authorization: Bearer <your_token>
   ```

## Error Handling

The API uses conventional HTTP response codes to indicate success or failure of a request. Generally:

- 2xx: Success
- 4xx: Client error (invalid request)
- 5xx: Server error

Error responses include a JSON object with the following structure:

```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

## Endpoints

### Agents

#### Get All Agents

```
GET /agents
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10)
- `sort`: Field to sort by (prefix with - for descending order, e.g., -createdAt)
- `status`: Filter by agent status (active, inactive, pending, suspended)
- `search`: Text search on agent fields

Example Response:
```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 1,
    "totalRecords": 2
  },
  "data": [
    {
      "_id": "612f4c90b3e465e5a03c28d1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phoneNumber": "123-456-7890",
      "status": "active",
      "joinDate": "2023-01-15T00:00:00.000Z",
      "commissionRate": 10,
      "specializations": ["Sales", "Marketing"],
      "createdAt": "2023-01-15T00:00:00.000Z",
      "updatedAt": "2023-01-15T00:00:00.000Z"
    },
    {
      "_id": "612f4c90b3e465e5a03c28d2",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "phoneNumber": "987-654-3210",
      "status": "pending",
      "joinDate": "2023-01-20T00:00:00.000Z",
      "commissionRate": 12,
      "specializations": ["Support", "Training"],
      "createdAt": "2023-01-20T00:00:00.000Z",
      "updatedAt": "2023-01-20T00:00:00.000Z"
    }
  ]
}
```

#### Get Agent by ID

```
GET /agents/:id
```

Parameters:
- `id`: Agent ID

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28d1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "123-456-7890",
    "status": "active",
    "joinDate": "2023-01-15T00:00:00.000Z",
    "commissionRate": 10,
    "specializations": ["Sales", "Marketing"],
    "createdAt": "2023-01-15T00:00:00.000Z",
    "updatedAt": "2023-01-15T00:00:00.000Z"
  }
}
```

#### Create Agent

```
POST /agents
```

Request Body:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phoneNumber": "123-456-7890",
  "status": "active",
  "commissionRate": 10,
  "specializations": ["Sales", "Marketing"],
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "ST",
    "zipCode": "12345",
    "country": "USA"
  },
  "bankDetails": {
    "accountName": "John Doe",
    "accountNumber": "1234567890",
    "bankName": "Example Bank",
    "routingNumber": "987654321"
  }
}
```

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28d1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phoneNumber": "123-456-7890",
    "status": "active",
    "joinDate": "2023-03-15T12:30:45.123Z",
    "commissionRate": 10,
    "specializations": ["Sales", "Marketing"],
    "address": {
      "street": "123 Main St",
      "city": "Anytown",
      "state": "ST",
      "zipCode": "12345",
      "country": "USA"
    },
    "bankDetails": {
      "accountName": "John Doe",
      "accountNumber": "1234567890",
      "bankName": "Example Bank",
      "routingNumber": "987654321"
    },
    "createdAt": "2023-03-15T12:30:45.123Z",
    "updatedAt": "2023-03-15T12:30:45.123Z"
  }
}
```

#### Update Agent

```
PUT /agents/:id
```

Parameters:
- `id`: Agent ID

Request Body: Same as Create Agent (all fields are optional for updates)

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28d1",
    "firstName": "John",
    "lastName": "Doe Updated",
    "email": "john.doe@example.com",
    "phoneNumber": "123-456-7890",
    "status": "active",
    "joinDate": "2023-01-15T00:00:00.000Z",
    "commissionRate": 12,
    "specializations": ["Sales", "Marketing", "Training"],
    "createdAt": "2023-01-15T00:00:00.000Z",
    "updatedAt": "2023-03-16T09:15:30.456Z"
  }
}
```

#### Update Agent Status

```
PATCH /agents/:id/status
```

Parameters:
- `id`: Agent ID

Request Body:
```json
{
  "status": "inactive"
}
```

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28d1",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "status": "inactive",
    "updatedAt": "2023-03-16T10:20:15.789Z"
  }
}
```

#### Delete Agent

```
DELETE /agents/:id
```

Parameters:
- `id`: Agent ID

Example Response:
```json
{
  "success": true,
  "data": {}
}
```

#### Get Agent Payments

```
GET /agents/:id/payments
```

Parameters:
- `id`: Agent ID

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10)
- `sort`: Field to sort by (default: -createdAt)

Example Response:
```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "current": 1,
    "limit": 10,
    "total": 1,
    "totalRecords": 2
  },
  "data": [
    {
      "_id": "612f4c90b3e465e5a03c28e1",
      "agent": "612f4c90b3e465e5a03c28d1",
      "amount": 1500,
      "type": "commission",
      "status": "completed",
      "description": "March commission payment",
      "transactionId": "TRX-1234567890",
      "processingDate": "2023-03-05T00:00:00.000Z",
      "createdAt": "2023-03-01T00:00:00.000Z",
      "updatedAt": "2023-03-05T00:00:00.000Z"
    },
    {
      "_id": "612f4c90b3e465e5a03c28e2",
      "agent": "612f4c90b3e465e5a03c28d1",
      "amount": 500,
      "type": "bonus",
      "status": "pending",
      "description": "Performance bonus",
      "createdAt": "2023-03-10T00:00:00.000Z",
      "updatedAt": "2023-03-10T00:00:00.000Z"
    }
  ]
}
```

### Payments

#### Get All Payments

```
GET /payments
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Number of items per page (default: 10)
- `sort`: Field to sort by (default: -createdAt)
- `status`: Filter by payment status
- `type`: Filter by payment type
- `agent`: Filter by agent ID

Example Response: Similar to Get Agent Payments

#### Get Payment by ID

```
GET /payments/:id
```

Parameters:
- `id`: Payment ID

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28e1",
    "agent": {
      "_id": "612f4c90b3e465e5a03c28d1",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com"
    },
    "amount": 1500,
    "type": "commission",
    "status": "completed",
    "description": "March commission payment",
    "transactionId": "TRX-1234567890",
    "processingDate": "2023-03-05T00:00:00.000Z",
    "createdAt": "2023-03-01T00:00:00.000Z",
    "updatedAt": "2023-03-05T00:00:00.000Z"
  }
}
```

#### Create Payment

```
POST /payments
```

Request Body:
```json
{
  "agent": "612f4c90b3e465e5a03c28d1",
  "amount": 1500,
  "type": "commission",
  "description": "March commission payment"
}
```

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28e1",
    "agent": "612f4c90b3e465e5a03c28d1",
    "amount": 1500,
    "type": "commission",
    "status": "pending",
    "description": "March commission payment",
    "createdAt": "2023-03-16T11:25:40.123Z",
    "updatedAt": "2023-03-16T11:25:40.123Z"
  }
}
```

#### Update Payment

```
PUT /payments/:id
```

Parameters:
- `id`: Payment ID

Request Body: Same as Create Payment (except agent and status cannot be changed)

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28e1",
    "agent": "612f4c90b3e465e5a03c28d1",
    "amount": 2000,
    "type": "commission",
    "status": "pending",
    "description": "March commission payment - updated",
    "createdAt": "2023-03-16T11:25:40.123Z",
    "updatedAt": "2023-03-16T12:30:15.456Z"
  }
}
```

#### Update Payment Status

```
PATCH /payments/:id/status
```

Parameters:
- `id`: Payment ID

Request Body:
```json
{
  "status": "completed"
}
```

Example Response:
```json
{
  "success": true,
  "data": {
    "_id": "612f4c90b3e465e5a03c28e1",
    "agent": "612f4c90b3e465e5a03c28d1",
    "amount": 2000,
    "type": "commission",
    "status": "completed",
    "description": "March commission payment - updated",
    "createdAt": "2023-03-16T11:25:40.123Z",
    "updatedAt": "2023-03-16T13:45:20.789Z"
  }
}
```

#### Delete Payment

```
DELETE /payments/:id
```

Parameters:
- `id`: Payment ID

Note: Completed payments cannot be deleted.

Example Response:
```json
{
  "success": true,
  "data": {}
}
```

#### Process Payment

```
POST /payments/:id/process
```

Parameters:
- `id`: Payment ID

Example Response:
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "_id": "612f4c90b3e465e5a03c28e1",
    "agent": "612f4c90b3e465e5a03c28d1",
    "amount": 2000,
    "type": "commission",
    "status": "completed",
    "description": "March commission payment",
    "transactionId": "TRX-1678968720-123",
    "processingDate": "2023-03-16T14:12:00.123Z",
    "createdAt": "2023-03-16T11:25:40.123Z",
    "updatedAt": "2023-03-16T14:12:00.123Z"
  }
}
``` 