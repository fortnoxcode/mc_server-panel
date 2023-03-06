import fs from 'fs'
import { ServerInstance } from './ServerInstance.js';

export default function (servCore, servName) {
  
  let server = new ServerInstance(servCore, servName);

  if (!fs.existsSync(server.SERVER_FOLDER)) {
    console.log('Creating a server folder...');
    fs.mkdirSync(server.SERVER_FOLDER);
  }

  if (!fs.existsSync(server.SERVER_JAR)) {
    console.log(`Copying server jar ${server.JAR}...`);
    fs.copyFileSync(server.JAR_PATH, server.SERVER_JAR);
  }

  if (fs.existsSync(server.EULA_SERVER_PATH)) {
    fs.readFile(server.EULA_SERVER_PATH, 'utf8', (err, data) => {
      if (err) {
        return console.log(err);
      }
      if (data.includes('eula=false')) {
        fs.writeFile(server.EULA_SERVER_PATH, data.replace(/eula=false/g, 'eula=true'), 'utf8', (err) => {
          if (err) return console.log(err);
        });
      }
    });
  } else {
    console.log(`Creating EULA file eula.txt...`);
    fs.writeFileSync(server.EULA_SERVER_PATH, 'eula=true');
  };
  return server;
}
