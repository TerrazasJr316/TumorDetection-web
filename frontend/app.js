// CAMBIAR ESTO POR TU URL DE RENDER AL DESPLEGAR
const API_BASE_URL = 'https://tumordetection-mri-web.onrender.com'; 
// const API_BASE_URL = 'http://127.0.0.1:8000'; // Local

const btnSearch = document.getElementById('btn-search');
const btnRandom = document.getElementById('btn-random');
const inputId = document.getElementById('image-id-input');
const resultsArea = document.getElementById('results-area');
const loading = document.getElementById('loading');
const errorMsg = document.getElementById('error-msg');

// Listeners
btnSearch.addEventListener('click', () => {
    const id = inputId.value;
    if (id === '' || id < 0 || id > 3928) {
        showError("Por favor ingresa un ID válido entre 0 y 3928");
        return;
    }
    fetchData(`/api/image/index/${id}/`);
});

btnRandom.addEventListener('click', () => {
    // Pedimos 1 aleatoria. Nota: Usamos el endpoint de "random" pero tomamos el primero
    fetchData(`/api/images/random/1/`, true);
});

async function fetchData(endpoint, isRandom = false) {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error("No se pudo obtener la imagen.");
        
        let data = await response.json();
        // Si es random, la API devuelve un array, tomamos el primero
        if (Array.isArray(data)) data = data[0];

        renderTomas(data);
    } catch (error) {
        showError(error.message);
    }
}

function renderTomas(data) {
    loading.classList.add('hidden');
    errorMsg.classList.add('hidden');
    resultsArea.classList.remove('hidden');

    // Datos del paciente y predicciones
    document.getElementById('patient-id-display').textContent = `Paciente: ${data.patient_id}`;
    
    // Convertir probabilidad a porcentaje
    const resnetVal = (data.prediction_resnet50['1'] * 100).toFixed(2);
    const alexnetVal = (data.prediction_alexnet['1'] * 100).toFixed(2);
    
    document.getElementById('pred-resnet').textContent = `ResNet50: ${resnetVal}% Tumor`;
    document.getElementById('pred-alexnet').textContent = `AlexNet: ${alexnetVal}% Tumor`;

    // Obtener los contextos de los 3 canvas
    const ctxMRI = document.getElementById('canvas-mri').getContext('2d');
    const ctxMask = document.getElementById('canvas-mask').getContext('2d');
    const ctxOverlay = document.getElementById('canvas-overlay').getContext('2d');

    // --- TOMA 1: VISTA GENERAL (Solo MRI) ---
    drawToCanvas(ctxMRI, data.mri_image_64x64, null, 'mri');

    // --- TOMA 2: SOLO TUMOR (Solo Máscara) ---
    drawToCanvas(ctxMask, null, data.mask_image_64x64, 'mask');

    // --- TOMA 3: SUPERPOSICIÓN (MRI + Rojo) ---
    drawToCanvas(ctxOverlay, data.mri_image_64x64, data.mask_image_64x64, 'overlay');
}

function drawToCanvas(ctx, mriData, maskData, mode) {
    const width = 64;
    const height = 64;
    const imgData = ctx.createImageData(width, height);
    const pixels = imgData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            
            let gray = 0;
            let maskVal = 0;

            if (mriData) gray = mriData[y][x];
            if (maskData) maskVal = maskData[y][x];

            if (mode === 'mri') {
                // Escala de grises simple
                pixels[i] = gray;     // R
                pixels[i+1] = gray;   // G
                pixels[i+2] = gray;   // B
                pixels[i+3] = 255;    // Alpha
            } 
            else if (mode === 'mask') {
                // Blanco sobre negro
                const val = maskVal > 127 ? 255 : 0;
                pixels[i] = val;
                pixels[i+1] = val;
                pixels[i+2] = val;
                pixels[i+3] = 255;
            } 
            else if (mode === 'overlay') {
                // Si hay máscara, pintar ROJO, si no, pintar la MRI normal
                if (maskVal > 127) {
                    pixels[i] = 255;  // R (Rojo a tope)
                    pixels[i+1] = 0;  // G
                    pixels[i+2] = 0;  // B
                    pixels[i+3] = 255;
                } else {
                    pixels[i] = gray;
                    pixels[i+1] = gray;
                    pixels[i+2] = gray;
                    pixels[i+3] = 255;
                }
            }
        }
    }
    ctx.putImageData(imgData, 0, 0);
}
// Manejo de errores y carga
function showLoading() {
    loading.classList.remove('hidden');
    resultsArea.classList.add('hidden');
    errorMsg.classList.add('hidden');
}
function showError(msg) {
    loading.classList.add('hidden');
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}