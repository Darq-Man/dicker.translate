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
  const [config, setConfig] = useState(null);
  const [InLang, setInLang] = useState('');
  const [OutLang, setOutLang] = useState('');

  useEffect(() => {
    socket.on('newText', updateOutputArea);
    async function getConfig() {
      const conf = await socket.emitWithAck('getConfig');
      setConfig(prev => conf);
      setInLang(prev => conf.Languages.DefInLang);
      setOutLang(prev => conf.Languages.DefOutLang);
    }

    if(!config){
      getConfig();
      console.log(config);
    }

  }, [config]);

  if(!config) {
    console.log(config);
    return (
      <div>
        <p>Loading</p>
      </div>
    )
  };

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
    const NewLocal = document.getElementById('LocalizationSelector').value;
    const NewDefInLang = document.getElementById('InputLangSelector').value;
    const NewdefOutLang = document.getElementById('OutputLangSelector').value;

    var newConf = config;
    newConf.Connection.IP = NewIP;
    newConf.Connection.Port = NewPort;
    newConf.Languages.Local = NewLocal;
    newConf.Languages.DefInLang = NewDefInLang;
    newConf.Languages.DefOutLang = NewdefOutLang;

    setConfig(prev => newConf);
    console.log(config);

    sendConfig(config);
  }

  function MainPage() {
    return (
      <div className="MainPage">
        <select 
          className='LangSelector' 
          id='InLang'
          value={InLang}
          onChange={(e) => setInLang(e.target.value)}>
          {LanguageOptions.map(languageOption =>
            <option 
              key={languageOption.tag} 
              value={languageOption.full}
            >{languageOption.full}</option>
          )}
        </select>
        <select 
          className='LangSelector' 
          id='OutLang'
          value={OutLang}
          onChange={(e) => setOutLang(e.target.value)}>
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
    try {
    return (
      <div className='SettingsPage'>
        <div className='SettingsArea'>
          <p className='SectionHeader'>Ollama connection</p>
          <textarea 
            className='InputField'
            id='IPInput'
            placeholder='IP of Ollama server. Leave empty for default (localhost)'
            defaultValue={config.Connection.IP}>
          </textarea>
          <textarea 
            className='InputField'
            id='PortInput'
            placeholder='Port of Ollama on your server. Leave empty for default (11434)'
            defaultValue={config.Connection.Port}>
          </textarea>
          <p className='SectionHeader'>Language preferences</p>
          <p className='SectionSubHeader'>Interface language (work in progress)</p>
          <select className='LangPrefSelector'
            id='LocalizationSelector'
            defaultValue={config.Languages.Local}>
            {LanguageOptions.map(languageOption =>
              <option 
                key={languageOption.tag} 
                value={languageOption.full}
              >{languageOption.full}</option>
            )}
          </select>
          <p className='SectionSubHeader'>Default input language</p>
          <select className='LangPrefSelector'
            id='InputLangSelector'
            defaultValue={config.Languages.DefInLang}>
            {LanguageOptions.map(languageOption =>
              <option 
                key={languageOption.tag} 
                value={languageOption.full}
              >{languageOption.full}</option>
            )}
          </select>
          <p className='SectionSubHeader'>Default output language</p>
          <select className='LangPrefSelector'
            id='OutputLangSelector'
            defaultValue={config.Languages.DefOutLang}>
            {LanguageOptions.map(languageOption =>
              <option 
                key={languageOption.tag} 
                value={languageOption.full}
              >{languageOption.full}</option>
            )}
          </select>
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
  } catch (error) {
    console.log(error);
  }
  }

  return (
    <div className="App">
      <title>Dicker.translate</title>
      <div className="TopBar">
        <div className='LeftPart'>HUI</div>
        <div className='CentralPart'>
          <div className='SiteName'>Dicker.Translate</div>
        </div>
        <div className='RightPart'>
          <button id='SettingsButt'
          onClick={() => ChangePage()}>
            <img src={SettingsIcon} alt='SettingsIcon'></img>
          </button>
        </div>
      </div>
      <div className='MainPart'>
        {page === 'main' ? MainPage() :
        Settings()}
      </div>
    </div>
  );
}

export default App;