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

const LocalOptions = [
  {full: 'English'},
  {full: 'Ukrainian'}
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
  const [ollamaState, setOllamaState] = useState(null);
  const [config, setConfig] = useState(null);
  const [Local, setLocal] = useState(null);
  const [Models, setModels] = useState(null);
  const [InLang, setInLang] = useState('');
  const [OutLang, setOutLang] = useState('');

  async function getOllamaState() {
    const state = await socket.emitWithAck('getOllamaState');
    setOllamaState(prev => state);
  }
  
  async function getConfig() {
    const conf = await socket.emitWithAck('getConfig');
    setConfig(prev => conf);
    setInLang(prev => conf.Languages.DefInLang);
    setOutLang(prev => conf.Languages.DefOutLang);
  }
  
  async function getLocale() {
    const local = await socket.emitWithAck('getLocale');
    setLocal(prev => local);
  }
  
  async function getModels() {
    const models = await socket.emitWithAck('getModels');
    console.log(`models: ${models}`);
    setModels(prev => models);
  }

  useEffect(() => {
    socket.on('newText', (res) => {
      console.log(`test: ${res}`);
      updateOutputArea(res.message.content);
    });

    if(!config){
      getConfig();
      getLocale();
      getModels();
      getOllamaState();
    }

    if(ollamaState === false && page === 'main') {
      flipInputState(true);
      console.log('flipping');
    } else {
      console.log([ollamaState, page])
    }

  }, [config, Local, Models, ollamaState, page]);

  if(!config || !Local || !Models) {
    console.log(config);
    return (
      <div>
        <p>Loading...</p>
      </div>
    )
  };

  async function sendConfig(conf) {
    const newLocal = await socket.emitWithAck('updateConfig', conf);
    console.log(newLocal);
    setLocal(prev => newLocal);
    getOllamaState();
    console.log(`online: ${ollamaState}`);
    if (ollamaState === true) {
      console.log('yes');
      getModels();
    } else {
      setModels([]);
    }
    console.log(`New models: ${Models}`);
    return;
  }

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
    const NewModel = document.getElementById('ModelSelector').value;
    console.log(NewModel);
    const NewLocal = document.getElementById('LocalizationSelector').value;
    const NewDefInLang = document.getElementById('InputLangSelector').value;
    const NewdefOutLang = document.getElementById('OutputLangSelector').value;

    var newConf = config;
    newConf.Connection.IP = NewIP;
    newConf.Connection.Port = NewPort;
    newConf.Connection.Model = !NewModel ? "" : NewModel;
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
          value={Local.Interactions.Translate}
          onClick={() => {sendText().then(result => {
            console.log("Text sent successfully");
          })
        }}>{Local.Interactions.Translate}</button>
      </div>
    )
  }

  function Settings() {
    try {
    return (
      <div className='SettingsPage'>
        <div className='SettingsArea'>
          <p className='SectionHeader'>{Local.Interface.Headers.OllConn}</p>
          <p className='SectionSubHeader'>{Local.Interface.Headers.IPPortDesc}</p>
          <textarea 
            className='InputField'
            id='IPInput'
            placeholder={Local.Interface.Headers.IPPlaceholder}
            defaultValue={config.Connection.IP}>
          </textarea>
          <textarea 
            className='InputField'
            id='PortInput'
            placeholder={Local.Interface.Headers.PortPlaceholder}
            defaultValue={config.Connection.Port}>
          </textarea>
          <p className='SectionSubHeader'>{Local.Interface.Headers.DefModel}</p>
          <select className='LangPrefSelector'
            id='ModelSelector'>
            {Models.map(model => 
              <option
                value={model}
              >{model}</option>
            )}
          </select>
          <p className='SectionHeader'>{Local.Interface.Headers.LangPref}</p>
          <p className='SectionSubHeader'>{Local.Interface.Headers.IntLang}</p>
          <select className='LangPrefSelector'
            id='LocalizationSelector'
            defaultValue={config.Languages.Local}>
            {LocalOptions.map(LocalOption =>
              <option 
                value={LocalOption.full}
              >{LocalOption.full}</option>
            )}
          </select>
          <p className='SectionSubHeader'>{Local.Interface.Headers.DefInLang}</p>
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
          <p className='SectionSubHeader'>{Local.Interface.Headers.DefOutLang}</p>
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
            {Local.Interactions.Save}
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
        <div className='LeftPart'>42</div>
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
      {
        ollamaState !== true ? 
        <div className='ErrorBar'>
            <p>Ollama server unreachable</p>
        </div> :
        <div></div>
      }
      <div className='MainPart'>
        {page === 'main' ? MainPage() :
        Settings()}
      </div>
    </div>
  );
}

export default App;