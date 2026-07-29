//Import from libraries
const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require("express");
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Ollama } = require("ollama");

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
console.log(CurrentOS);
var ConfigDirectory = '';
var ConfigLocation = 'DickerTranslate.json';
switch (CurrentOS) {
  case 'linux':
    ConfigDirectory = path.join(os.homedir(), '.config/Dicker.Translate');
    ConfigLocation = path.join(ConfigDirectory, ConfigLocation);
    console.log(ConfigLocation);
    break;

  default:
    console.log('Doesn\'t work yet');
    break;
}

//Creating config variable
var Config = {
  "Connection": {
    "IP": "localhost",
    "Port": "11434"
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

//Setting up Ollama
var ollamaHost = `http://${Config.Connection.IP}:${Config.Connection.Port}`;
var ollama = new Ollama({host: ollamaHost});
const PromptTemplate = `You are a professional {InputLang} {InputLangID} to {OutputLang} {OutputLangID} translator. Your goal is to accurately convey the meaning and nuances of the original {InputLang} text while adhering to {OutputLang} grammar, vocabulary, and cultural sensitivities.
Produce only the {OutputLang} translation, without any additional explanations or commentary. Please translate the following {InputLang} text into {OutputLang}:


{TextToTranslate}`;

//Default set of values for "wake up" prompt
const defaultData = {
  "TextToTranslate": "test",
  "InputLangID": "(en)",
  "InputLang": "English",
  "OutputLangID": "(uk)",
  "OutputLang": "Ukrainian"
}

//Function shat fills template with data to form a prompt
function fillTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return key in values ? values[key] : match;
    });
}

var ConnectedClients = [];
var Local = {};

//Setting up Socket actions
io.on('connection', function (socket) {
  //Basic steps for each connected user
  const ClientIP = socket.request.connection.remoteAddress;
  ConnectedClients.push(ClientIP);
  console.log('A user connected from IP ' + ClientIP);
  console.log('Connected devices: ' + ConnectedClients.length);

  //Sending config to client
  socket.on('getConfig', (callback) => {
    callback(Config);
  });

  //Sending chosen locale to client
  socket.on('getLocale', (callback) => {
    const LocaleLocation = './Files/DickerLocals.json';
    Local = JSON.parse(fs.readFileSync(LocaleLocation));
    const CurLocaleLang = Config.Languages.Local;
    callback(Local[CurLocaleLang]);
  })

  //Recieving config updates and writing them to config file
  socket.on('updateConfig', (conf, callback) => {
    Config = conf;
    ollamaHost = `http://${Config.Connection.IP}:${Config.Connection.Port}`;
    ollama = new Ollama({host: ollamaHost});
    fs.writeFileSync(ConfigLocation, JSON.stringify(Config));
    console.log(Config);
    callback(Local[Config.Languages.Local]);
  });

  //Recieving data for prompt, forming prompt, 
  //sending it to ollama server and sending 
  //response back to client
  socket.on('sendprompt', (data) => {
    // console.log(data);
    const Prompt = fillTemplate(PromptTemplate, data)
    // console.log(Prompt);

    ollama.chat({
        model: 'translategemma:4b',
        messages: [{role: 'user', content: Prompt}],
    }).then(res => {
        // console.log(res);
        socket.emit('newText', res.message.content);
    })
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
  if(ConnectedClients.length > 0) {
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
      ollama.chat({
        model: "translategemma:4b",
        messages: [{role: "user", Prompt: fillTemplate(PromptTemplate, defaultData)}]
      }).then(res => {
        console.log(res);
      })
    }
   })
  }
}, 60000);

//Opening port 3001 for listening
server.listen(3001, () => {
  console.log("Server is running on port 3001");
});