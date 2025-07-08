const { Client } = require('pg')
const amqp = require('amqplib')
const { v4: uuidv4 } = require('uuid')

jest.setTimeout(30000) // allow extra time for integration flow

describe('VAT worker integration', () => {
  let db, conn, ch

  // Setup PostgreSQL and RabbitMQ connection before tests
  beforeAll(async () => {
    db = new Client({
      host: 'localhost',
      port: 5432,
      database: 'orders',
      user: 'test',
      password: 'test',
    })
    await db.connect()

    conn = await amqp.connect('amqp://localhost')
    ch = await conn.createChannel()
    await ch.assertQueue('orders', { durable: false })

    // Ensure queue is empty before test
    await ch.purgeQueue('orders')
  })

  // Clean up all connections after test
  afterAll(async () => {
    if (ch) await ch.close()
    if (conn) await conn.close()
    if (db) await db.end()
  })

  test('inserts order, worker processes and publishes VATed message', async () => {
    const id = uuidv4()
    const initialAmount = 100.00
    const currency = 'EUR'

    // Insert test order into the DB
    await db.query(
      'INSERT INTO orders(id, amount, currency) VALUES($1, $2, $3)',
      [id, initialAmount, currency]
    )

    // Wait for the processed message to arrive in the queue
    const msg = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timed out waiting for message')), 5000)

      ch.consume('orders', m => {
        clearTimeout(timeout)
        const parsed = JSON.parse(m.content.toString())
        console.log('Message received from queue:', parsed)
        resolve(parsed)
      }, { noAck: true })
    })

    // Validate message structure and VAT calculation
    expect(msg).toEqual({
      id,
      amount: (initialAmount * 1.23).toFixed(2),
      currency
    })
  })
})
