
const http = require('http');
const { spawn } = require('child_process');

const PORT = 8767;
let kilProcess = null;
let kilBuffer = '';

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const request = JSON.parse(body);
        console.log('[RPC] Requête reçue:', request);

        // Lancer KiloCode si pas déjà fait
        if (!kilProcess) {
          console.log('[RPC] Lancement de KiloCode...');
          kilProcess = spawn('kilo', ['-i', '-m', 'ask', '--auto'], {
            stdio: ['pipe', 'pipe', 'pipe']
          });

          kilProcess.stdout.on('data', (data) => {
            kilBuffer += data.toString();
            console.log('[KiloCode] Réponse:', data.toString().substring(0, 50));
          });
        }

        // Envoyer à KiloCode
        if (kilProcess) {
          const message = JSON.stringify(request.params);
          kilProcess.stdin.write(message + '\n');

          // Attendre la réponse (simulation)
          setTimeout(() => {
            const response = {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                message: 'Réponse de KiloCode pour: ' + request.params.content,
                timestamp: Date.now()
              }
            };
            res.end(JSON.stringify(response));
          }, 2000);
        } else {
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            error: { code: 500, message: 'KiloCode non disponible' }
          }));
        }
      } catch (error) {
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: 400, message: 'JSON invalide' }
        }));
      }
    });
  } else {
    res.end(JSON.stringify({ error: 'Méthode non autorisée' }));
  }
});

server.listen(PORT, () => {
  console.log('[RPC] Serveur.listen sur port', PORT);
});
