const API_URL = window.location.origin;

const inpId = document.getElementById('inp-id');
const btnRun = document.getElementById('btn-run');
const btnRand = document.getElementById('btn-rand');
const mainDiv = document.getElementById('main-results');
const statusMsg = document.getElementById('status-msg');
const errorBox = document.getElementById('error-box');
const patLbl = document.getElementById('patient-lbl');

btnRun.addEventListener('click', () => {
    if(!inpId.value) return alert("Ingresa ID");
    loadData(`/api/image/index/${inpId.value}/`);
});

btnRand.addEventListener('click', () => loadData(`/api/images/random/1/`));

async function loadData(url) {
    // Reset UI
    statusMsg.classList.remove('hidden');
    mainDiv.classList.add('hidden');
    errorBox.classList.add('hidden');
    patLbl.classList.add('hidden');

    try {
        const res = await fetch(`${API_URL}${url}`);
        if(!res.ok) throw new Error("Error de red o ID no encontrado");
        
        let data = await res.json();
        if(Array.isArray(data)) data = data[0];

        display(data);
    } catch (e) {
        statusMsg.classList.add('hidden');
        errorBox.textContent = e.message;
        errorBox.classList.remove('hidden');
    }
}

function display(data) {
    statusMsg.classList.add('hidden');
    mainDiv.classList.remove('hidden');
    patLbl.classList.remove('hidden');
    patLbl.textContent = `Paciente: ${data.patient_id}`;

    // --- 1. PINTAR PORCENTAJES (Con chequeo de seguridad) ---
    setScore('score-r50', data.prediction_resnet50);
    setScore('score-alex', data.prediction_alexnet);
    setScore('score-r18', data.prediction_resnet18);

    // --- 2. PINTAR IMÁGENES (Usamos la misma imagen base para todos) ---
    // ResNet50
    paintRow('cv-r50', data.mri_image_64x64, data.mask_image_64x64);
    // AlexNet
    paintRow('cv-alex', data.mri_image_64x64, data.mask_image_64x64);
    // ResNet18
    paintRow('cv-r18', data.mri_image_64x64, data.mask_image_64x64);
}

function setScore(elemId, predObj) {
    const el = document.getElementById(elemId);
    if(!el) return; // Seguridad anti-error

    if(predObj) {
        const pct = (predObj['1'] * 100).toFixed(2);
        el.textContent = `${pct}% Tumor`;
        el.style.color = pct > 50 ? '#c0392b' : '#27ae60'; // Rojo si es alto, verde si es bajo
    } else {
        el.textContent = "Pendiente...";
        el.style.color = 'orange';
    }
}

function paintRow(prefix, mri, mask) {
    draw(document.getElementById(`${prefix}-mri`), mri, null, 'mri');
    draw(document.getElementById(`${prefix}-mask`), null, mask, 'mask');
    draw(document.getElementById(`${prefix}-over`), mri, mask, 'over');
}

function draw(canvas, mri, mask, mode) {
    if(!canvas) return;
    const ctx = canvas.getContext('2d');

    // AUTO-AJUSTE DE TAMAÑO INTERNO
    const size = mri ? mri.length : (mask ? mask.length : 64);
    canvas.width = size;
    canvas.height = size;

    const imgData = ctx.createImageData(size, size);
    const px = imgData.data;

    for(let y=0; y<size; y++) {
        for(let x=0; x<size; x++) {
            const i = (y*size + x) * 4;
            let g = 0, m = 0;

            if(mri && mri[y]) g = Array.isArray(mri[y][x]) ? mri[y][x][0] : mri[y][x];
            if(mask && mask[y]) m = mask[y][x];

            if(mode === 'mri') {
                px[i]=g; px[i+1]=g; px[i+2]=g; px[i+3]=255;
            } else if (mode === 'mask') {
                const v = m > 127 ? 255 : 0;
                px[i]=v; px[i+1]=v; px[i+2]=v; px[i+3]=255;
            } else { // overlay
                if(m > 127) {
                    px[i]=255; px[i+1]=0; px[i+2]=0; px[i+3]=255;
                } else {
                    px[i]=g; px[i+1]=g; px[i+2]=g; px[i+3]=255;
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
}