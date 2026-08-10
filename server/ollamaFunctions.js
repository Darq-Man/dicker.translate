import net from 'net'
import { Ollama } from 'ollama';

function  fillTemplate(template, values) {
    return template?.replace(/\{(\w+)\}/g, (match, key) => {
        return key in values ? values[key] : match;
    });
};

export function checkOllamaIP(IP, Port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(Port, IP);
  });
};

export async function getModels(ollama) {
    var ollamaModels = [];

    ollama.list().then(res => {
        for(const cur of res.models) {
            const CurName = cur.name;
            console.log(CurName);
            if(CurName.includes("translate")) {
                ollamaModels.push(CurName);
            }
        }
    })

    console.log(`models: ${ollamaModels}`);
    return ollamaModels;
};

export async function sendPrompt(ollama, template, data, model) {
    const Prompt = fillTemplate(template, data);
    // console.log(template);
    // ollama.chat({
    //     model: model,
    //     messages: [{role: 'user', content: Prompt}],
    // }).then(res => {
    //     console.log(res);
    //     return res;
    // })

    const res = await ollama.chat({
        model:model,
        messages: [{role: 'user', content: Prompt}],
    });

    console.log(res);
    return res;
};