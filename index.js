import { spawn } from 'child_process';
import path from 'path';
import fastify from 'fastify';
import fastifyIO from 'fastify-socket.io'
import { processUsage } from './src/pidusage.js';
import * as fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url';
import serverInit from './src/serverInit.js';

let serverInstance = serverInit('server', 'paper-1.19.3-404.jar'); //('server', 'core.jar')

let LOG_CACHE = [];

const webserver = fastify();
webserver.register(fastifyIO);

webserver.register(fastifyStatic, {
  root: path.join(path.dirname(fileURLToPath(import.meta.url)), 'web'),
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
          ['-Xmx1024M', '-Xms1024M', '-jar', path.resolve(path.dirname(fileURLToPath(import.meta.url)), serverInstance.SERVER_JAR), 'nogui'], {
          cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), serverInstance.SERVER_FOLDER),
        });

        isRun = true;

        processUsage(socket, server, 1000);

        server.stdout.on('data', (data) => {
          webserver.io.emit("server-log", data.toString());
          LOG_CACHE.push(data.toString());
        });

        server.on('spawn', (data) => {
          console.log('Server successfully spawned');
        });

        server.on('close', (data) => {
          console.log('CLOSE:', data);
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

webserver.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) throw err
  console.log('Web UI is on port :3000');
})