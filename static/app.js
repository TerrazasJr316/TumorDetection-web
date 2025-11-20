const API_BASE_URL = window.location.origin;

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
    if (!id) return alert("Ingresa un ID");
    fetchData(`/api/image/index/${id}/`);
});

btnRandom.addEventListener('click', () => {
    fetchData(`/api/images/random/1/`, true);
});

async function fetchData(endpoint) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error("Error al cargar datos (ID incorrecto o fallo de red)");
        
        let data = await response.json();
        if (Array.isArray(data)) data = data[0];
        
        renderAllModels(data);
    } catch (error) {
        showError(error.message);
    }
}

function renderAllModels(data) {
    // 1. Mostrar el contenedor
    loading.classList.add('hidden');
    errorMsg.classList.add('hidden');
    resultsArea.classList.remove('hidden');
    patientInfo.classList.remove('hidden');
    
    patientInfo.textContent = `Paciente: ${data.patient_id || 'Desconocido'}`;

    // 2. Actualizar Probabilidades (Scores)
    // Usamos verificaciones de seguridad (?) para evitar el error "Cannot read property"
    const pR50 = data.prediction_resnet50 ? (data.prediction_resnet50['1'] * 100).toFixed(2) + '%' : 'N/A';
    const pAlex = data.prediction_alexnet ? (data.prediction_alexnet['1'] * 100).toFixed(2) + '%' : 'N/A';
    const pR18 = data.prediction_resnet18 ? (data.prediction_resnet18['1'] * 100).toFixed(2) + '%' : 'Pendiente...';

    // Evitamos el error "Set property of null" verificando que el elemento exista
    if(document.getElementById('acc-resnet50')) document.getElementById('acc-resnet50').textContent = `${pR50} Tumor`;
    if(document.getElementById('acc-alexnet')) document.getElementById('acc-alexnet').textContent = `${pAlex} Tumor`;
    if(document.getElementById('acc-resnet18')) document.getElementById('acc-resnet18').textContent = `${pR18} Tumor`;

    // 3. Dibujar Imágenes (Reutilizamos las mismas imágenes de 64x64 para todos los modelos)
    // Fila ResNet50
    drawSet('c-r50', data.mri_image_64x64, data.mask_image_64x64);
    // Fila AlexNet
    drawSet('c-alex', data.mri_image_64x64, data.mask_image_64x64);
    // Fila ResNet18
    drawSet('c-r18', data.mri_image_64x64, data.mask_image_64x64);
}

function drawSet(prefix, mri, mask) {
    const c1 = document.getElementById(`${prefix}-mri`);
    const c2 = document.getElementById(`${prefix}-mask`);
    const c3 = document.getElementById(`${prefix}-overlay`);

    if(c1) drawToCanvas(c1.getContext('2d'), mri, null, 'mri');
    if(c2) drawToCanvas(c2.getContext('2d'), null, mask, 'mask');
    if(c3) drawToCanvas(c3.getContext('2d'), mri, mask, 'overlay');
}

function drawToCanvas(ctx, mriData, maskData, mode) {
    // Ajuste automático de tamaño para que se vea GRANDE y nítido
    const size = mriData ? mriData.length : (maskData ? maskData.length : 64);
    ctx.canvas.width = size;
    ctx.canvas.height = size;

    const imgData = ctx.createImageData(size, size);
    const pixels = imgData.data;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            let gray = 0; let maskVal = 0;

            // Extracción segura de datos
            if (mriData && mriData[y]) {
                gray = Array.isArray(mriData[y][x]) ? mriData[y][x][0] : mriData[y][x];
            }
            if (maskData && maskData[y]) maskVal = maskData[y][x];

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
    errorMsg.classList.add('hidden');
}
function showError(msg) {
    loading.classList.add('hidden');
    errorMsg.classList.remove('hidden');
    errorMsg.textContent = msg;
}