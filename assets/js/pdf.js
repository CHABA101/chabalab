let pdfDoc = null, pageNum = 1, scale = 1.5;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('pdf-file');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');
const convertBtn = document.getElementById('convert-btn');

dropZone.onclick = () => fileInput.click();
fileInput.onchange = e => loadFile(e.target.files[0]);
dropZone.ondragover = e => e.preventDefault();
dropZone.ondrop = e => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); };

function loadFile(file) {
  if (!file || file.type !== 'application/pdf') return alert('กรุณาเลือกไฟล์ PDF');
  const reader = new FileReader();
  reader.onload = async e => {
    const typedarray = new Uint8Array(e.target.result);
    pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
    document.getElementById('preview-container').classList.remove('hidden');
    convertBtn.classList.remove('hidden');
    renderPage(pageNum);
  };
  reader.readAsArrayBuffer(file);
}

async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const viewport = page.getViewport({ scale });
  canvas.height = viewport.height; canvas.width = viewport.width;
  await page.render({ canvasContext: ctx, viewport }).promise;
  document.getElementById('page-info').textContent = `หน้า ${num}/${pdfDoc.numPages}`;
}

document.getElementById('zoom-in').onclick = () => { scale += 0.5; renderPage(pageNum); };
document.getElementById('zoom-out').onclick = () => { if (scale > 0.5) scale -= 0.5; renderPage(pageNum); };

convertBtn.onclick = async () => {
  convertBtn.classList.add('hidden');
  const zip = new JSZip();
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const vp = page.getViewport({ scale: 2 });
    const c = document.createElement('canvas');
    c.height = vp.height; c.width = vp.width;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    zip.file(`page-${i}.png`, c.toDataURL().split(',')[1], { base64: true });
    const progress = Math.round((i / pdfDoc.numPages) * 100);
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-fill').textContent = progress + '%';
  }
  zip.generateAsync({ type: 'blob' }).then(blob => {
    saveAs(blob, 'converted.zip');
    document.getElementById('result').innerHTML = `<p>ดาวน์โหลดสำเร็จ! ขนาด: ${(blob.size/1024).toFixed(1)} KB</p>`;
    document.getElementById('result').classList.remove('hidden');
  });
};