const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const connectWithRetry = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connesso');
      return;
    } catch {
      retries--;
      console.log(`Database non pronto, riprovo... (${retries} tentativi rimasti)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  process.exit(1);
};

// ─── HEALTH CHECK ───────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── PREVENTIVI ─────────────────────────────────────────────
app.get('/api/quotes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM quotes ORDER BY timestamp DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const { id, timestamp, service, client, payment, calculations, total, discount } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO quotes (id, timestamp, service, client, payment, calculations, total, discount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         service = $3, client = $4, payment = $5,
         calculations = $6, total = $7, discount = $8
       RETURNING *`,
      [id, timestamp, JSON.stringify(service), JSON.stringify(client),
       payment, JSON.stringify(calculations), total || 0, discount || 0]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/quotes/:id', async (req, res) => {
  try {
    const { discount, calculations, total } = req.body;
    await pool.query(
      'UPDATE quotes SET discount = $1, calculations = $2, total = $3 WHERE id = $4',
      [discount || 0, JSON.stringify(calculations), total || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/quotes', async (req, res) => {
  try {
    await pool.query('DELETE FROM quotes');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
connectWithRetry().then(() => {
  app.listen(PORT, () => console.log(`Backend preventivi attivo sulla porta ${PORT}`));
});
