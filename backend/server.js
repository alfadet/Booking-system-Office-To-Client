const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const connectWithRetry = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      console.log('Database connesso');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS quotes (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          data JSONB NOT NULL
        )
      `);
      console.log('Tabella quotes pronta');
      return;
    } catch (err) {
      retries--;
      console.log(`Database non pronto, riprovo tra 3s... (${retries} tentativi rimasti)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  process.exit(1);
};

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// GET tutti i preventivi
app.get('/api/quotes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM quotes ORDER BY timestamp DESC');
    res.json(rows.map(r => ({ ...r.data, id: r.id, timestamp: r.timestamp })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST salva preventivo
app.post('/api/quotes', async (req, res) => {
  try {
    const quote = req.body;
    await pool.query(
      `INSERT INTO quotes (id, timestamp, data) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET timestamp = $2, data = $3`,
      [quote.id, quote.timestamp, JSON.stringify(quote)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT aggiorna preventivo (es. sconto)
app.put('/api/quotes/:id', async (req, res) => {
  try {
    const quote = req.body;
    await pool.query(
      'UPDATE quotes SET data = $1 WHERE id = $2',
      [JSON.stringify(quote), req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE elimina preventivo
app.delete('/api/quotes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM quotes WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
connectWithRetry().then(() => {
  app.listen(PORT, () => console.log(`Backend attivo sulla porta ${PORT}`));
});
