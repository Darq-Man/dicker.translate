import fs from 'fs';
import path from 'path';
import os from 'os';
import express from 'express';
import cors from 'cors';
import http, { get } from 'http'
import { Server } from 'socket.io';
import { Ollama } from 'ollama';
import { checkOllamaIP, getModels, sendPrompt } from './ollamaFunctions.js'
import { log } from 'console';

//Creating a express server and Socket
const app = express();
const server = http.createServer(app);

app.use(express.json(), cors());
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

//Checking current OS server is running on
const CurrentOS = process.platform;
var ConfigDirectory = '';
var ConfigLocation = 'DickerTranslate.json';
switch (CurrentOS) {
  case 'linux':
    ConfigDirectory = path.join(os.homedir(), '.config/Dicker.Translate');
    ConfigLocation = path.join(ConfigDirectory, ConfigLocation);
    break;

  default:
    // console.log('Doesn\'t work yet');
    break;
}

//Creating config variable
var Config = {
  "Connection": {
    "IP": "localhost",
    "Port": "11434",
    "Model": ""
  },
  "Languages": {
    "Local": "English",
    "DefInLang": "English",
    "DefInLangKey": "(en)",
    "DefOutLang": "Ukrainian",
    "DefOutLangKey": "(uk)"
  }
}

//Working with config file in filesystem
if (!fs.existsSync(ConfigDirectory)) {
  fs.mkdirSync(ConfigDirectory, {recursive: true});
  fs.writeFileSync(ConfigLocation, JSON.stringify(Config));
} else if (!fs.existsSync(ConfigLocation)) {
  fs.writeFileSync(ConfigLocation, JSON.stringify(Config));
} else {
  Config = JSON.parse(fs.readFileSync(ConfigLocation));
}

var ollamaHost = `http://${Config.Connection.IP}:${Config.Connection.Port}`;
console.log(`Ollama host: ${ollamaHost}`);

var isAvailable = false;
checkOllamaIP(Config.Connection.IP, Config.Connection.Port)?.then(res => {
  isAvailable = res;
  console.log(`ollama available: ${res}`);
  console.log(`online: ${isAvailable}`);
});

//Setting up Ollama
const PromptTemplate = `You are a professional {InputLang} {InputLangID} to {OutputLang} {OutputLangID} translator. Your goal is to accurately convey the meaning and nuances of the original {InputLang} text while adhering to {OutputLang} grammar, vocabulary, and cultural sensitivities.
Produce only the {OutputLang} translation, without any additional explanations or commentary. Please translate the following {InputLang} text into {OutputLang}:


{TextToTranslate}`;

var ollama = null;
var models = [];

var ollamaModels = [];
if (isAvailable) {
  ollama = new Ollama({host: ollamaHost});

  console.log('works');
  getModels(ollama).then(res => {
    models = res;
  })
  console.log(`models: ${models}`);
} else {
  console.log('Server offline');
}

//Default set of values for "wake up" prompt
const defaultData = {
  "TextToTranslate": "test",
  "InputLangID": "(en)",
  "InputLang": "English",
  "OutputLangID": "(uk)",
  "OutputLang": "Ukrainian"
}

var ConnectedClients = [];
var Locale = {};

//Setting up Socket actions
io.on('connection', function (socket) {
  //Basic steps for each connected user
  const ClientIP = socket.request.connection.remoteAddress;
  ConnectedClients.push(ClientIP);
  console.log('A user connected from IP ' + ClientIP);
  console.log('Connected devices: ' + ConnectedClients.length);
  // console.log(isAvailable);

  socket.on('getOllamaState', (callback) => {
    (async () => {
      const online = await checkOllamaIP(Config.Connection.IP, Config.Connection.Port);
      isAvailable = online;
      console.log(`1 ${isAvailable}`);
      callback(isAvailable);
    })();
    console.log(`2 ${isAvailable}`)
  });

  //Sending config to client
  socket.on('getConfig', (callback) => {
    callback(Config);
  });

  //Sending chosen locale to client
  socket.on('getLocale', (callback) => {
    const LocaleLocation = './Files/DickerLocals.json';
    Locale = JSON.parse(fs.readFileSync(LocaleLocation));
    const CurLocaleLang = Config.Languages.Local;
    callback(Locale[CurLocaleLang]);
  })

  socket.on('getModels', (callback) => {
    callback(models);
  })

  //Recieving config updates and writing them to config file
  socket.on('updateConfig', (conf, callback) => {
    Config = conf;
    ollamaHost = `http://${Config.Connection.IP}:${Config.Connection.Port}`;
    ollama = new Ollama({host: ollamaHost});
    checkOllamaIP(Config.Connection.IP, Config.Connection.Port).then(res => {
      isAvailable = res;
      if (isAvailable === true) {
        getModels(ollama).then(resModels => {
          models = resModels;
        });
      }
    });
    fs.writeFileSync(ConfigLocation, JSON.stringify(Config));
    console.log(`Config: ${Config}`);
    callback(Locale[Config.Languages.Local]);
  });

  //Recieving data for prompt, forming prompt, 
  //sending it to ollama server and sending 
  //response back to client
  socket.on('sendprompt', (data) => {
      sendPrompt(
        ollama,
        PromptTemplate,
        data, 
        Config.Connection.Model
      ).then(res => {
        // console.log(`server: ${res.message.content }`);
        socket.emit('newText', res);
      });
  });

  //Steps on client disconnection
  socket.on('disconnect', () => {
    const res = ConnectedClients.indexOf(ClientIP);
    ConnectedClients.splice(res, 1);
    console.log('A user from port ' + ClientIP + ' disconnected');
  });
});

//Checking on time till model expire each minute;
//Sending "wake up" prompt if less than a minute left
setInterval(async() => {
  console.log("Check");
  if(ConnectedClients.length > 0 && isAvailable) {
    console.log('fuck');

    ollama.ps().then(res => {
      let dang = false;
      if(res.models.length === 0) {
        dang = true;
        console.log("No models");
      } else {
        const CurDate = new Date();
        const CurMin = CurDate.getMinutes();
        const ExpDate = new Date(res.models[0].expires_at);
        const ExpMin = ExpDate.getMinutes();
        const Diff = ExpDate - CurDate;

        console.log(Diff);

        if(Diff > 0 && Diff < 60000) {
          dang = true;
        } else if(Diff < 0) {
          if(3600000 + Diff < 60000) dang = true;
        }
      }

      if(dang === true) {
        sendPrompt(
          ollama, 
          PromptTemplate, 
          defaultData, 
          Config.Connection.Model
        ).then(res => {
          console.log(res);
        })
      }
    })
  } else {
    console.log([isAvailable, ConnectedClients.length]);
  }
}, 60000);

//Opening port 3001 for listening
server.listen(3001, () => {
  console.log("Server is running on port 3001");
});