const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const fastify = require("fastify");
const fastifyIO = require("fastify-socket.io");
let pidusage = require('pidusage');

const SERVER_FOLDER = './server';

const JAR = ''; //name of the .jar file in the ./assets folder
const JAR_PATH = `./assets/${JAR}`;
const SERVER_JAR = `${SERVER_FOLDER}/${JAR}`;
const EULA = 'eula.txt';
const EULA_SERVER_PATH = `${SERVER_FOLDER}/${EULA}`;

let LOG_CACHE = [];


if (!fs.existsSync(SERVER_FOLDER)) {
  console.log('Creating a server folder...');
  fs.mkdirSync(SERVER_FOLDER);
}

if (!fs.existsSync(SERVER_JAR)) {
  console.log(`Copying server jar ${JAR}...`);
  fs.copyFileSync(JAR_PATH, SERVER_JAR);
}

if (fs.existsSync(EULA_SERVER_PATH)) {
  fs.readFile(EULA_SERVER_PATH, 'utf8', (err, data) => {
    if (err) {
      return console.log(err);
    }
    if (data.includes('eula=false')) {
      fs.writeFile(EULA_SERVER_PATH, data.replace(/eula=false/g, 'eula=true'), 'utf8', (err) => {
        if (err) return console.log(err);
      });
    }
  });

} else {
  console.log(`Creating EULA file ${EULA}...`);
  fs.writeFileSync(EULA_SERVER_PATH, 'eula=true');
}

const webserver = fastify();
webserver.register(fastifyIO);

webserver.register(require('@fastify/static'), {
  root: path.join(__dirname, 'web'),
});

webserver.ready((err) => {
  if (err) throw err;

  webserver.io.on('connection', (socket) => {
    let isRun = false;

    socket.on('buttons', (butt) => {
      butt = butt.replace(/\s/g, '').toLowerCase();
      if (butt !== 'turnon') {
        webserver.io.emit('serverInfo', 'Server is not started');
      }
    })

    socket.on('command', () => {
      webserver.io.emit('serverInfo', 'Server is not started')
    });

    socket.on("startServer", () => {
      LOG_CACHE = [];
      if (isRun === false) {
        const server = spawn(
          'java',
          ['-Xmx1024M', '-Xms1024M', '-jar', path.resolve(__dirname, SERVER_JAR), 'nogui'], {
          cwd: path.resolve(__dirname, SERVER_FOLDER),
        });

        isRun = true;

        processUsage(socket, server, 1000);

        server.stdout.on('data', (data) => {
          webserver.io.emit("server-log", data.toString());
          LOG_CACHE.push(data.toString());
        });

        server.on('spawn', (data) => {
          console.log('Server successfully spawned');
          // isRun = true;
        });

        server.on('close', (data) => {
          console.log('CLOSE:', data);
          // isRun = false;
        });

        socket.emit("log-cache", LOG_CACHE);

        socket.removeAllListeners('command');
        socket.removeAllListeners('buttons');

        socket.on('command', (cmd) => {
          if (isRun) {
            server.stdin.write(`${cmd}\n`);
          } else {
            webserver.io.emit('serverInfo', 'Server is not started')
          }
        });

        socket.on('buttons', (butt) => {
          butt = butt.replace(/\s/g, '').toLowerCase();
          if (isRun) {
            switch (butt) {
              case 'stop':
                server.stdin.write('stop \n')
                isRun = false;
                LOG_CACHE = [];
                webserver.io.emit('serverInfo', 'Server has been stopped');
                break;
              case 'forcestop':
                isRun = false;
                LOG_CACHE = [];
                server.kill('SIGKILL');
                webserver.io.emit('serverInfo', 'Server is forcibly killed');
                // default:
                break;
            }
          } else {
            webserver.io.emit('serverInfo', 'Server is not running')
          }
        })
      } else {
        webserver.io.emit('serverInfo', 'Server is already running!');
      }
    });
  });
});

const processUsage = async (socket, process, time) => {

  const compute = async (process) => {
    const stats = await pidusage(process.pid);
    socket.emit('pidusage', {
      cpu: `${Math.round(stats.cpu)} %`,
      ram: `${Math.round(stats.memory / 1e+6)} MB/s`,
      uptime: `${stats.elapsed / 1000} s`
    })
  }
    setTimeout(async () => {
      try {
        await compute(process);
        processUsage(socket, process, time);
      } catch (error) {
        socket.emit('pidusage', {cpu: 0, ram: 0, uptime: 0})
      }
    }, time);
}

webserver.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) throw err
  console.log('Web UI is on port :3000');
})