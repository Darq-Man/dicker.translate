import net from 'net'
import { Ollama } from 'ollama';

function  fillTemplate(template, values) {
    return template?.replace(/\{(\w+)\}/g, (match, key) => {
        return key in values ? values[key] : match;
    });
};

export function checkOllamaIP(ollamaIP, ollamaPort) {
    console.log(`Check: IP ${ollamaIP}, Port ${ollamaPort}`);
    return fetch(`http://${ollamaIP}:${ollamaPort}/api/tags`).then(res => {
        console.log(`ok: ${res.body}`);
        return res.ok;
    }).catch(err => {
        console.log(`fail: ${err}`);
        return false;
    });
};

export async function getModels(ollama) {
    var ollamaModels = [];

    ollama.list().then(res => {
        for(const cur of res.models) {
            const CurName = cur.name;
            // console.log(CurName);
            if(CurName.includes("translate")) {
                ollamaModels.push(CurName);
            }
        }
    })

    // console.log(`models: ${ollamaModels}`);
    return ollamaModels;
};

export async function sendPrompt(ollama, template, data, model) {
    const Prompt = fillTemplate(template, data);

    const res = await ollama.chat({
        model:model,
        messages: [{role: 'user', content: Prompt}],
    });

    console.log(res);
    return res;
};