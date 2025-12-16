
const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = 8768;

app.use(cors());
app.use(express.json());

let kilProcess = null;
let sessionActive = false;

app.post('/api/kilo/start', (req, res) => {
  if (!sessionActive) {
    console.log('[REST] Démarrage de KiloCode...');
    kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';
    kilProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      console.log('[KiloCode] Réponse:', data.toString().substring(0, 50));
    });

    kilProcess.stderr.on('data', (data) => {
      console.log('[KiloCode] Debug:', data.toString().trim());
    });

    sessionActive = true;
    res.json({ status: 'started', message: 'KiloCode démarré' });
  } else {
    res.json({ status: 'active', message: 'KiloCode déjà actif' });
  }
});

app.post('/api/kilo/send', (req, res) => {
  const { message } = req.body;

  if (!sessionActive) {
    return res.status(400).json({ error: 'KiloCode non démarré' });
  }

  console.log('[REST] Envoi message:', message);

  if (kilProcess) {
    const jsonMessage = JSON.stringify({ type: 'user', content: message });
    kilProcess.stdin.write(jsonMessage + '\n');

    // Simulation de réponse
    setTimeout(() => {
      res.json({
        status: 'success',
        response: 'Réponse simulée pour: ' + message,
        timestamp: Date.now()
      });
    }, 2000);
  } else {
    res.status(500).json({ error: 'KiloCode non disponible' });
  }
});

app.get('/api/kilo/status', (req, res) => {
  res.json({
    active: sessionActive,
    uptime: process.uptime(),
    pid: process.pid
  });
});

app.post('/api/kilo/stop', (req, res) => {
  if (kilProcess) {
    kilProcess.kill();
    sessionActive = false;
    console.log('[REST] KiloCode arrêté');
  }
  res.json({ status: 'stopped' });
});

app.listen(PORT, () => {
  console.log('[REST] Serveur.listen sur port', PORT);
});
