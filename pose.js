const RELATIVE_MODEL_FOLDER = './projetojavascript/';
let model = null;
let webcam = null;
let labelContainer = null;
let maxPredictions = 0;
let ctx = null;
let running = false;

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

async function resolveModelUrlsPose() {
  const docBase = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
  const absoluteBase = docBase + RELATIVE_MODEL_FOLDER.replace(/^\.\//, '');
  return {
    modelURL: absoluteBase + 'modelomovimento.json',
    metadataURL: absoluteBase + 'metadatamovimento.json',
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

async function initModelPose() {
  if (running) return;
  running = true;
  writeLog('Iniciando modelo de pose...');

  if (typeof tmPose === 'undefined') {
    const msg = 'tmPose não está definido. Verifique carregamento das bibliotecas.';
    writeLog(msg, true);
    showErrorModal('Biblioteca ausente', new Error(msg));
    running = false;
    return;
  }

  try {
    const { modelURL, metadataURL } = await resolveModelUrlsPose();
    await checkAccessible(modelURL);
    model = await tmPose.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    writeLog('Modelo de pose carregado');

    const size = 200;
    const flip = true;
    webcam = new tmPose.Camera(size, size, flip);
    await webcam.setup();
    await webcam.play();

    const canvas = document.getElementById('canvas');
    canvas.width = size;
    canvas.height = size;
    ctx = canvas.getContext('2d');

    labelContainer = document.getElementById('label-container');
    labelContainer.innerHTML = '';
    for (let i = 0; i < maxPredictions; i++) {
      const div = document.createElement('div');
      div.textContent = '—';
      labelContainer.appendChild(div);
    }

    requestAnimationFrame(loopPose);
  } catch (err) {
    showErrorModal('Erro ao inicializar modelo de pose', err);
    running = false;
  }
}

async function loopPose() {
  if (!running) return;
  webcam.update();
  await predictPose();
  requestAnimationFrame(loopPose);
}

async function predictPose() {
  if (!model || !webcam) return;
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const prediction = await model.predict(posenetOutput);

  for (let i = 0; i < maxPredictions; i++) {
    const name = prediction[i].className;
    const prob = prediction[i].probability;
    labelContainer.children[i].textContent = `${name}: ${prob.toFixed(2)}`;
  }

  drawPose(pose);
}

function drawPose(pose) {
  if (webcam.canvas) {
    ctx.drawImage(webcam.canvas, 0, 0);
    if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
      tmPose.drawSkeleton(pose.keypoints, minPartConfidence, ctx);
    }
  }
}