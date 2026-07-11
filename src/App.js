import React, { useEffect } from 'react';
import './App.css';
import io from 'socket.io-client';

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
  useEffect(() => {
    socket.on('newText', updateOutputArea);
  })

  return (
    <div className="App">
      <div className="TopBar">
        <p>Dicker.Translate</p>
      </div>
      <div className="MainPart">
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
    </div>
  );
}

export default App;