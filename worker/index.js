const { Client } = require('pg')
const amqp = require('amqplib')
const fs = require('fs')

async function main() {
  const db = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
  })
  await db.connect()

  // Run init SQL
  const initSql = fs.readFileSync('./init.sql', 'utf8')
  await db.query(initSql)

  const conn = await amqp.connect(process.env.RABBIT_URL)
  const ch = await conn.createChannel()
  await ch.assertQueue('orders', { durable: false })

  setInterval(async () => {
    const res = await db.query(`SELECT id, amount, currency FROM orders WHERE processed = false`)
    for (const row of res.rows) {
      const withVat = Number(row.amount) * 1.23
      const msg = {
        id: row.id,
        amount: withVat.toFixed(2),
        currency: row.currency
      }
      ch.sendToQueue('orders', Buffer.from(JSON.stringify(msg)))
      await db.query(`UPDATE orders SET processed = true WHERE id = $1`, [row.id])
    }
  }, 500)
}

main().catch(console.error)
