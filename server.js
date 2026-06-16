const express    = require('express');
const http       = require('http');
const WebSocket  = require('ws');
const pm2        = require('pm2');
const path       = require('path');
const { spawnSync } = require('child_process');

const PORT = 3042;

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

// ── Static files ──────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── PID → port via netstat (captura portas dinâmicas escolhidas em runtime) ───
function buildPidPortMap() {
  const map = {};
  try {
    if (process.platform === 'win32') {
      // spawnSync chama netstat.exe diretamente, sem passar pelo cmd.exe
      const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8', timeout: 5000, windowsHide: true });
      const out = result.stdout || '';
      for (const line of out.split('\n')) {
        const m = line.match(/TCP\s+[\d.*]+:(\d+)\s+[\d.*]+:\S+\s+LISTENING\s+(\d+)/i);
        if (m) {
          const port = parseInt(m[1]);
          const pid  = parseInt(m[2]);
          if (port >= 1024 && !map[pid]) map[pid] = port;
        }
      }
    } else {
      const result = spawnSync('ss', ['-tlnp'], { encoding: 'utf8', timeout: 5000 });
      const out = result.stdout || '';
      for (const line of out.split('\n')) {
        const portMatch = line.match(/:(\d+)\s/);
        const pidMatch  = line.match(/pid=(\d+)/);
        if (portMatch && pidMatch) {
          const port = parseInt(portMatch[1]);
          const pid  = parseInt(pidMatch[1]);
          if (port >= 1024 && !map[pid]) map[pid] = port;
        }
      }
    }
  } catch (_) {}
  return map;
}

// ── Port detection ────────────────────────────────────────────────────────────
function detectPort(proc) {
  const env  = proc.pm2_env?.env || {};
  const args = (proc.pm2_env?.args || []).map(String);

  for (const key of ['PORT', 'port', 'NODE_PORT', 'APP_PORT', 'SERVER_PORT']) {
    const n = parseInt(env[key]);
    if (n >= 1024 && n <= 65535) return n;
  }

  for (let i = 0; i < args.length; i++) {
    const eq = args[i].match(/^--?(?:port|PORT|p)=(\d+)$/);
    if (eq) { const n = parseInt(eq[1]); if (n >= 1024) return n; }

    if (/^--?(?:port|PORT|p)$/.test(args[i]) && args[i + 1]) {
      const n = parseInt(args[i + 1]);
      if (n >= 1024 && n <= 65535) return n;
    }
  }

  for (const arg of args) {
    if (/^\d{4,5}$/.test(arg)) {
      const n = parseInt(arg);
      if (n >= 1024 && n <= 65535) return n;
    }
  }

  return null;
}

// ── PM2 process list ──────────────────────────────────────────────────────────
// Usa a conexão já aberta — sem connect/disconnect por chamada
function getProcesses() {
  return new Promise((resolve, reject) => {
    pm2.list((err, list) => {
      if (err) return reject(err);

      const pidPortMap = buildPidPortMap();

      resolve(list.map((proc) => {
        const env  = proc.pm2_env || {};
        const port = detectPort(proc) ?? pidPortMap[proc.pid] ?? null;

        return {
          id:       proc.pm_id,
          name:     proc.name,
          status:   env.status || 'unknown',
          cpu:      proc.monit?.cpu  ?? 0,
          memory:   proc.monit?.memory ?? 0,
          uptime:   env.pm_uptime ?? null,
          restarts: env.restart_time ?? 0,
          port,
          url: port ? `http://localhost:${port}` : null,
        };
      }));
    });
  });
}

// ── REST ──────────────────────────────────────────────────────────────────────
app.get('/api/processes', async (req, res) => {
  try {
    res.json(await getProcesses());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── WebSocket — push update every 3 s ────────────────────────────────────────
wss.on('connection', (ws) => {
  async function push() {
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(await getProcesses()));
    } catch (_) {}
  }

  push();
  const timer = setInterval(push, 3000);
  ws.on('close', () => clearInterval(timer));
});

// ── Conecta ao daemon PM2 uma única vez e só então sobe o servidor ────────────
pm2.connect((err) => {
  if (err) {
    console.error('Erro ao conectar no PM2:', err.message);
    process.exit(1);
  }

  server.listen(PORT, () =>
    console.log(`PM2 Dashboard → http://localhost:${PORT}`)
  );
});

function shutdown() {
  pm2.disconnect();
  server.close(() => process.exit(0));
  // Força saída se demorar mais de 3s
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
