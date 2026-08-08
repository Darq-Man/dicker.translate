import { Ollama } from 'ollama';

export class ollamaFuncs {
    constructor(IP, Port, template){
        this.IP = IP;
        this.Port = Port;
        this.Template = template;

        var ollamaHost = `https://${this.IP}:${this.Port}`;
        this.ollama = new Ollama({host: ollamaHost});
        this.models = [];
    };

    fillTemplate(template, values) {
        return template?.replace(/\{(\w+)\}/g, (match, key) => {
            return key in values ? values[key] : match;
        });
    };

    getModels() {
        var ollamaModels = [];

        this.ollama?.list().then(res => {
          for(const cur of res.models) {
            const CurName = cur.name;
            console.log(CurName);
            if(CurName.includes("translate")) {
              ollamaModels.push(CurName);
            }
          }
          console.log(ollamaModels);
        })

        this.models = ollamaModels;
        console.log(`models: ${this.models}`);
        return ollamaModels;
    };

    sendPrompt(socket, data, model) {
        const Prompt = this.fillTemplate(this.Template, data);
        console.log(data);
        this.ollama?.chat({
            model: model,
            messages: [{role: 'user', content: Prompt}],
        }).then(res => {
            console.log(res);
            return res.message.content;
        })
    };
}