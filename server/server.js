const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require("express");
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { Ollama } = require("ollama");

const app = express();
const server = http.createServer(app);

app.use(express.json(), cors());
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

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

var Config = [
  {
    "Connection": {
      "IP": "localhost",
      "Port": "11434"
    }
  }
]

if (!fs.existsSync(ConfigDirectory)) {
  fs.mkdirSync(ConfigDirectory, {recursive: true});
  fs.writeFileSync(ConfigLocation, JSON.stringify(Config));
} else if (!fs.existsSync(ConfigLocation)) {
  fs.writeFileSync(ConfigLocation, JSON.stringify(Config));
} else {
  Config = JSON.parse(fs.readFileSync(ConfigLocation));
  console.log(Config);
}

var ollamaHost = `http://${Config[0].Connection.IP}:${Config[0].Connection.Port}`;
var ollama = new Ollama({host: ollamaHost});
console.log(ollamaHost);
const PromptTemplate = `You are a professional {InputLang} {InputLangID} to {OutputLang} {OutputLangID} translator. Your goal is to accurately convey the meaning and nuances of the original {InputLang} text while adhering to {OutputLang} grammar, vocabulary, and cultural sensitivities.
Produce only the {OutputLang} translation, without any additional explanations or commentary. Please translate the following {InputLang} text into {OutputLang}:


{TextToTranslate}`;

function fillTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return key in values ? values[key] : match;
    });
}

io.on('connection', function (socket) {
  const ClientIP = socket.request.connection.remoteAddress;
  console.log('A user connected from IP ' + ClientIP);

  socket.emit('sendConfig', Config);

  socket.on('updateConfig', (conf) => {
    Config = conf;
    ollamaHost = `http://${Config[0].Connection.IP}:${Config[0].Connection.Port}`;
    ollama = new Ollama({host: ollamaHost});
    fs.writeFileSync(ConfigLocation, JSON.stringify(Config));
    console.log(Config);
  });

  socket.on('sendprompt', (data) => {
    console.log(data);
    const Prompt = fillTemplate(PromptTemplate, data)
    console.log(Prompt);


    ollama.chat({
        model: 'translategemma:4b',
        messages: [{role: 'user', content: Prompt}],
    }).then(res => {
        console.log(res);
        socket.emit('newText', res.message.content);
    })
  });

  socket.on('disconnect', () => {
    console.log('A user from port ' + ClientIP + ' disconnected');
  });
});


server.listen(3001, () => {
  console.log("Server is running on port 3001");
});