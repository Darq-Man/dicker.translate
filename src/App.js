import React, { useEffect, useState } from 'react';
import './App.css';
import io from 'socket.io-client';
import SettingsIcon from './images/SettingsIconLowRes.png'

const serverURL = `${window.location.protocol}//${window.location.hostname}:3001`;
const socket = io(serverURL);

const inputAreaId = 'inputArea';
const OutputAreaId = 'outputArea';

const LanguageOptions = [
  {full: 'English', tag: '(en)'},
  {full: 'Ukrainian', tag: '(uk)'},
  {full: 'Russian', tag: '(ru)'},
  {full: 'German', tag: '(de)'}
];

function clearOutputField() {
  const inputAreaElem = document.getElementById(inputAreaId);
  const outputAreaElem = document.getElementById(OutputAreaId);
  if (inputAreaElem.value.trim() === '') {
    outputAreaElem.value = '';
    return true;
  } else {
    return false;
  }
}

async function sendText() {
  const res = clearOutputField();
  if (res) return;

  const textAreaElem = document.getElementById(inputAreaId);

  if (!textAreaElem) {
    console.error(`Element with ID ${inputAreaId} not found`);
    return;
  }

  const InputLang = document.getElementById('InLang').value;
  const InputLangID = document.getElementById('InLang').key;
  const OutputLang = document.getElementById('OutLang').value;
  const OutputLangID = document.getElementById('OutLang').key;

  if(InputLang === OutputLang) {
    alert("Languages must be different");
    return;
  };

  const Prompt = textAreaElem.value;
  flipInputState(true);
  socket.emit("sendprompt", {
    TextToTranslate: Prompt, 
    InputLangID: InputLangID, 
    InputLang: InputLang, 
    OutputLangID: OutputLangID, 
    OutputLang: OutputLang
  });
  return;
}

async function sendConfig(conf) {
  socket.emit('updateConfig', conf);
  return;
}

function flipInputState(MustBeReadonly){
  document.getElementById(inputAreaId).className = MustBeReadonly ? "textAreaInactive" : "textArea";
  document.getElementById(inputAreaId).readOnly = MustBeReadonly;
  document.getElementById("sendButt").className = MustBeReadonly ? "sendButtInactive" : "sendButt";
  document.getElementById("sendButt").disabled = MustBeReadonly;
}


function updateOutputArea(text) {
  flipInputState(false);
  const outputAreaElem = document.getElementById(OutputAreaId);

  if (!outputAreaElem) {
    console.error(`Element with ID ${OutputAreaId} not found`);
    return;
  }

  outputAreaElem.value = text;
}

function App() {
  const [page, setPage] = useState('main');
  const [config, setConfig] = useState([]);

  useEffect(() => {
    socket.on('newText', updateOutputArea);
    socket.on('sendConfig', (conf) => {
      setConfig(prev => conf);
      console.log(config);
    });
  })

  function ChangePage() {
    if(page === 'main'){
      setPage(prev => 'settings');
    } else {
      setPage(prev => 'main');
    }
  }

  function SaveConfig() {
    const NewIP = document.getElementById('IPInput').value;
    const NewPort = document.getElementById('PortInput').value;

    var newConf = config;
    newConf[0].Connection.IP = NewIP;
    newConf[0].Connection.Port = NewPort;

    setConfig(prev => newConf);
    console.log(config);

    sendConfig(config);
  }

  function MainPage() {
    return (
      <div className="MainPage">
        <select className='LangSelector' id='InLang'>
          {LanguageOptions.map(languageOption =>
            <option 
              key={languageOption.tag} 
              value={languageOption.full}
            >{languageOption.full}</option>
          )}
        </select>
        <select className='LangSelector' id='OutLang'>
          {LanguageOptions.map(languageOption =>
            <option 
              key={languageOption.tag} 
              value={languageOption.full}
            >{languageOption.full}</option>
          )}
        </select>
        <textarea 
          className='textArea'
          id={inputAreaId} 
          rows="10"/>
        <textarea 
          className='textArea' 
          id={OutputAreaId} 
          rows="10" 
          readOnly></textarea>
        <button 
          className='sendButt' 
          id='sendButt'
          onClick={() => {sendText().then(result => {
            console.log("Text sent successfully");
          })
        }}>TRANSLATE</button>
      </div>
    )
  }

  function Settings() {
    return (
      <div className='SettingsPage'>
        <div className='SettingsArea'>
          <p className='SectionHeader'>Ollama connection</p>
          <textarea 
            className='InputField'
            id='IPInput'
            placeholder='IP of Ollama server. Leave empty for default (localhost)'
            defaultValue={config[0].Connection.IP}>
          </textarea>
          <textarea 
            className='InputField'
            id='PortInput'
            placeholder='Port of Ollama on your server. Leave empty for default (11434)'
            defaultValue={config[0].Connection.Port}>
          </textarea>
        </div>
        <div className='SaveArea'>
          <button 
            className='SaveButton'
            onClick={SaveConfig}>
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="App">
      <title>Dicker.translate</title>
      <div className="TopBar">
        <p>Dicker.Translate</p>
        <button id='SettingsButt'
        onClick={() => ChangePage()}>
          <img src={SettingsIcon} alt='SettingsIcon'></img>
        </button>
      </div>
      <div className='MainPart'>
        {page === 'main' ? MainPage() :
        Settings()}
      </div>
    </div>
  );
}

export default App;