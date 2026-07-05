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

const ollama = new Ollama({host: 'http://100.66.202.49:11434'});
const PromptTemplate = `You are a professional {InputLang} {InputLangID} to {OutputLang} {OutputLangID} translator. Your goal is to accurately convey the meaning and nuances of the original {InputLang} text while adhering to {OutputLang} grammar, vocabulary, and cultural sensitivities.
Produce only the {OutputLang} translation, without any additional explanations or commentary. Please translate the following {InputLang} text into {OutputLang}:


{TextToTranslate}`

function fillTemplate(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
        return key in values ? values[key] : match;
    });
}

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('sendtext', (msg) => {
    console.log(msg);
    const servIP = server.address().address;
    response = `${msg} recieved on ${servIP}`;
    io.emit('newText', response);
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
  })

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});


server.listen(3001, () => {
  console.log("Server is running on port 3001");
});