# VAT Order Processing Test System (Node.js + PostgreSQL + RabbitMQ + Jest)

This project demonstrates a simple end-to-end automated integration test using:

- **PostgreSQL** – stores order data,
- **Node.js Worker** – applies 23% VAT,
- **RabbitMQ** – receives processed data,
- **Jest** – executes the test.

All components run in **Docker containers** to ensure full isolation.

---

## What was implemented and why?

### 1. **Database (PostgreSQL)**

- Stores raw order data (`id`, `amount`, `currency`, `processed` flag).
- Allows automated insertion and selection by the worker.
- Created using a simple `init.sql` executed by the worker on startup.

### 2. **Worker Service (Node.js)**

- Polls unprocessed orders every 500ms.
- Calculates 23% VAT (`amount * 1.23`).
- Sends a JSON message to RabbitMQ with the updated amount.
- Marks the order as processed.

**Why Node.js?**: Lightweight, async I/O fits well for simple ETL-type operations.

### 3. **Message Queue (RabbitMQ)**

- Receives messages from the worker.
- Enables decoupling between processing and consumption.
- Used to verify correct data format via test.

### 4. **Integration Test (Jest)**

- Inserts a test order into the database.
- Waits for the worker to pick it up and send a message.
- Validates the content and structure of the JSON message in RabbitMQ.

**Why Jest?**: Easy to configure, widely used in JavaScript environments.

---

## How to Run

Follow these steps to set up and test the full system locally using Docker:

### 1. Start PostgreSQL and RabbitMQ

```bash
docker compose up -d db rabbit
```

Wait a few seconds until both services are fully up and healthy.

### 2. Build and Start the Worker

```bash
cd worker
npm install  
cd ..
docker compose up -d --build worker
```

This builds the Node.js worker container, installs dependencies, and starts the service.  
The worker will connect to the database, initialize the `orders` table, and start polling for unprocessed orders.

### 3. Install Test Dependencies

In your project root (same level as `docker-compose.yml`), run:

```bash
npm install
```

This installs Jest and other required packages for the integration test.

### 4. Run the Integration Test

```bash
npm test
```

Expected outcome:

- A new test order is inserted into the database.
- The worker processes it, applies 23% VAT, and sends the result to RabbitMQ.
- The test captures and validates the message format and content.

You should see something like:

```
 PASS  tests/integration.test.js
  VAT worker integration
    √ inserts order, worker processes and publishes VAT'ed message (281 ms)     
```

## Clean up

To stop and remove containers:

```bash
docker compose down
```

## Notes

- You can view RabbitMQ dashboard at [http://localhost:15672](http://localhost:15672), login: `guest` / `guest`.
- PostgreSQL is accessible on port `5432`, user: `test`, password: `test`, database: `orders`.

## Summary

This setup validates a full integration flow:

- from DB write,
- through business logic transformation,
- to messaging and test verification.



