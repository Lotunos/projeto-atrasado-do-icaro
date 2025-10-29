const RELATIVE_MODEL_FOLDER = './projetosjavascript/';
let model = null;
let webcam = null;
let labelContainer = null;
let maxPredictions = 0;
let running = false;
let pressingZ = false;

function writeLog(message, isError = false) {
  const logEl = document.getElementById('log');
  const time = new Date().toLocaleTimeString();
  const prefix = isError ? '[ERRO]' : '[INFO]';
  const line = `${time} ${prefix} ${message}\n`;
  if (isError) console.error(line); else console.log(line);
  logEl.textContent += line;
  logEl.scrollTop = logEl.scrollHeight;
  if (isError) logEl.classList.add('error');
}

function showErrorModal(title, err) {
  const modal = document.getElementById('errorBox');
  const details = err?.stack || err?.message || String(err);
  document.getElementById('errorTitle').textContent = title;
  document.getElementById('errorDetails').textContent = details;
  modal.style.display = 'block';
  writeLog(`${title} — ${details}`, true);
}

async function resolveModelUrls() {
  const docBase = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
  const absoluteBase = docBase + RELATIVE_MODEL_FOLDER.replace(/^\.\//, '');
  return {
    modelURL: absoluteBase + 'model.json',
    metadataURL: absoluteBase + 'metadata.json',
  };
}

async function checkAccessible(url) {
  try {
    const head = await fetch(url, { method: 'HEAD' });
    if (head.ok) return true;
    writeLog(`HEAD ${url} retornou ${head.status} ${head.statusText}`, true);
  } catch (err) {
    writeLog(`HEAD falhou para ${url}: ${err}`, true);
  }
  try {
    const get = await fetch(url, { method: 'GET' });
    if (get.ok) return true;
    writeLog(`GET ${url} retornou ${get.status} ${get.statusText}`, true);
  } catch (err) {
    writeLog(`GET falhou para ${url}: ${err}`, true);
    throw err;
  }
  return false;
}

async function initModelImagem() {
  if (running) return;
  running = true;
  writeLog('Iniciando modelo de imagem...');

  if (typeof tmImage === 'undefined') {
    const msg = 'tmImage não está definido. Verifique carregamento das bibliotecas.';
    writeLog(msg, true);
    showErrorModal('Biblioteca ausente', new Error(msg));
    running = false;
    return;
  }

  try {
    const { modelURL, metadataURL } = await resolveModelUrls();
    await checkAccessible(modelURL);
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    writeLog('Modelo de imagem carregado');

    webcam = new tmImage.Webcam(200, 200, true);
    await webcam.setup();
    await webcam.play();

    const webcamContainer = document.getElementById('webcam-container');
    webcamContainer.innerHTML = '';
    webcamContainer.appendChild(webcam.canvas);

    labelContainer = document.getElementById('label-container');
    labelContainer.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
      const div = document.createElement('div');
      div.textContent = '—';
      labelContainer.appendChild(div);
    }

    requestAnimationFrame(loopImagem);
  } catch (err) {
    showErrorModal('Erro ao inicializar modelo de imagem', err);
    running = false;
  }
}

async function loopImagem() {
  if (!running) return;
  webcam.update();
  await predictImagem();
  requestAnimationFrame(loopImagem);
}


async function predictImagem() {
  if (!model || !webcam) return;
  const prediction = await model.predict(webcam.canvas);
  for (let i = 0; i < maxPredictions; i++) {
    const name = prediction[i].className.toLowerCase();
    const prob = prediction[i].probability;
    if (name === 'amarelo' && prob > 0.5 ) {
      pressUp();
      break;
    }
    if (name === 'vermelho' && prob > 0.5 ) {
      pressDown();
      break;
    }
    if (name === 'azul' && prob > 0.5 ) {
      pressLeft();
      break;
    }
    if (name === 'preto' && prob > 0.5 ) {
      pressRight();
      break;
    }
    
    labelContainer.children[i].textContent = `${prediction[i].className}: ${prob.toFixed(2)}`;
  }
}

function pressDown(ms = 250) {
  
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  setTimeout(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
    
  }, ms);
}

function pressUp(ms = 250) {
  
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  setTimeout(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', bubbles: true }));
    
  }, ms);
}

function pressLeft(ms = 250) {
  
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  setTimeout(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', bubbles: true }));
    
  }, ms);
}

function pressRight(ms = 250) {
  
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  setTimeout(() => {
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
    
  }, ms);
}


