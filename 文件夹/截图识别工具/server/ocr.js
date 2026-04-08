const { createWorker } = require('tesseract.js');

let workerPromise = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const w = await createWorker('chi_sim+eng', 1, {
        logger: () => {},
      });
      return w;
    })();
  }
  return workerPromise;
}

async function recognizeImage(buffer) {
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(buffer);
  return typeof text === 'string' ? text.trim() : '';
}

async function shutdown() {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}

module.exports = { recognizeImage, shutdown };
