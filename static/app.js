const API_BASE_URL = window.location.origin; 
// const API_BASE_URL = 'http://127.0.0.1:8000'; // Descomentar si pruebas local sin whitenoise

const btnSearch = document.getElementById('btn-search');
const btnRandom = document.getElementById('btn-random');
const inputId = document.getElementById('image-id-input');
const resultsArea = document.getElementById('results-area');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('error-msg');
const patientInfo = document.getElementById('patient-info');

// Listeners
btnSearch.addEventListener('click', () => {
    const id = inputId.value;
    if (id === '' || id < 0 || id > 3928) return alert("ID inválido");
    fetchData(`/api/image/index/${id}/`);
});

btnRandom.addEventListener('click', () => {
    fetchData(`/api/images/random/1/`, true);
});

async function fetchData(endpoint, isRandom = false) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error("Error al obtener datos");
        let data = await response.json();
        if (Array.isArray(data)) data = data[0];
        renderAllModels(data);
    } catch (error) {
        showError(error.message);
    }
}

function renderAllModels(data) {
    loading.classList.add('hidden');
    errorMsg.classList.add('hidden');
    resultsArea.classList.remove('hidden');
    patientInfo.classList.remove('hidden');
    patientInfo.textContent = `Paciente: ${data.patient_id}`;

    // 1. Extraer probabilidades
    const probR50 = (data.prediction_resnet50['1'] * 100).toFixed(2);
    const probAlex = (data.prediction_alexnet['1'] * 100).toFixed(2);
    
    // Verificamos si ya existe el parche de ResNet18
    let probR18 = "Pendiente...";
    if (data.prediction_resnet18) {
        probR18 = (data.prediction_resnet18['1'] * 100).toFixed(2);
    }

    document.getElementById('acc-resnet50').textContent = `${probR50}% Tumor`;
    document.getElementById('acc-alexnet').textContent = `${probAlex}% Tumor`;
    // Actualizamos el ID a resnet18
    document.getElementById('acc-resnet18').textContent = `${probR18}% Tumor`;

    // 2. Renderizar (Usamos las mismas imágenes base para todos)
    drawSet('c-r50', data.mri_image_64x64, data.mask_image_64x64);
    drawSet('c-alex', data.mri_image_64x64, data.mask_image_64x64);
    
    // Fila 3: ResNet18
    drawSet('c-r18', data.mri_image_64x64, data.mask_image_64x64);
}

function drawSet(prefix, mri, mask) {
    drawToCanvas(document.getElementById(`${prefix}-mri`).getContext('2d'), mri, null, 'mri');
    drawToCanvas(document.getElementById(`${prefix}-mask`).getContext('2d'), null, mask, 'mask');
    drawToCanvas(document.getElementById(`${prefix}-overlay`).getContext('2d'), mri, mask, 'overlay');
}

function drawToCanvas(ctx, mriData, maskData, mode) {
    const size = mriData ? mriData.length : (maskData ? maskData.length : 64);
    ctx.canvas.width = size;
    ctx.canvas.height = size;

    const imgData = ctx.createImageData(size, size);
    const pixels = imgData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            let gray = 0; let maskVal = 0;

            if (mriData && mriData[y] && mriData[y][x] !== undefined) {
                gray = Array.isArray(mriData[y][x]) ? mriData[y][x][0] : mriData[y][x];
            }
            if (maskData && maskData[y] && maskData[y][x] !== undefined) maskVal = maskData[y][x];

            if (mode === 'mri') {
                pixels[i] = gray; pixels[i+1] = gray; pixels[i+2] = gray; pixels[i+3] = 255;
            } else if (mode === 'mask') {
                const val = maskVal > 127 ? 255 : 0;
                pixels[i] = val; pixels[i+1] = val; pixels[i+2] = val; pixels[i+3] = 255;
            } else if (mode === 'overlay') {
                if (maskVal > 127) {
                    pixels[i] = 255; pixels[i+1] = 0; pixels[i+2] = 0; pixels[i+3] = 255;
                } else {
                    pixels[i] = gray; pixels[i+1] = gray; pixels[i+2] = gray; pixels[i+3] = 255;
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

function showLoading() {
    loading.classList.remove('hidden');
    resultsArea.classList.add('hidden');
}
function showError(msg) {
    loading.classList.add('hidden');
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}