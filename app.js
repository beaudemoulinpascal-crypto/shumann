/* SCHUMANN MONITOR APP - MAIN CONTROLLER */

// --- CONFIGURATION ---
const DATA_SOURCES = {
    tomsk: {
        url: 'https://sosrff.tsu.ru/new/shm.jpg',
        containerId: 'tomsk-container',
        timeId: 'tomsk-last-update'
    }
};

const MAX_GRAPH_POINTS = 60; // 1 hour history

// --- STATE ---
const graphData = {
    labels: [],
    wind: [],
    kp: [],
    schumann: []
};
let graphCanvas, graphCtx;

// --- AUDIO ENGINE ---
let audioCtx = null;
let oscL = null, oscR = null;
let gainNode = null;
let analyser = null;
let isAudioPlaying = false;
let currentAudioMode = null; // 'fixed' or 'live'
let animationId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initCorrelationGraph();
    refreshLiveData();

    // UI Events
    document.getElementById('refresh-data-btn').addEventListener('click', refreshLiveData);
    document.getElementById('toggle-audio-fixed').addEventListener('click', () => toggleAudio('fixed'));
    document.getElementById('toggle-audio-live').addEventListener('click', () => toggleAudio('live'));

    document.getElementById('audio-volume').addEventListener('input', (e) => {
        if (gainNode && isAudioPlaying) {
            gainNode.gain.setTargetAtTime(e.target.value, audioCtx.currentTime, 0.1);
        }
    });

    setInterval(refreshLiveData, 60000);
    setInterval(updateTomskClock, 1000);

    // Lightning activity counter (realistic simulation)
    function updateLightningCounters() {
        // Base activity levels (strikes/minute) with natural variation
        const africa = Math.floor(30 + Math.random() * 25);      // 30-55 strikes/min (very active)
        const america = Math.floor(20 + Math.random() * 20);     // 20-40 strikes/min (active)
        const asia = Math.floor(15 + Math.random() * 20);        // 15-35 strikes/min (active)
        const europe = Math.floor(5 + Math.random() * 15);       // 5-20 strikes/min (moderate)

        // Update DOM elements
        const africaEl = document.getElementById('lightning-africa');
        const americaEl = document.getElementById('lightning-america');
        const asiaEl = document.getElementById('lightning-asia');
        const europeEl = document.getElementById('lightning-europe');

        // Update bars
        const africaBar = document.getElementById('lightning-bar-africa');
        const americaBar = document.getElementById('lightning-bar-america');
        const asiaBar = document.getElementById('lightning-bar-asia');
        const europeBar = document.getElementById('lightning-bar-europe');


        if (africaEl) africaEl.textContent = africa;
        if (americaEl) americaEl.textContent = america;
        if (asiaEl) asiaEl.textContent = asia;
        if (europeEl) europeEl.textContent = europe;

        // Update bars (max 60 strikes/min = 100%)
        const maxStrikes = 60;
        if (africaBar) africaBar.style.width = Math.min((africa / maxStrikes) * 100, 100) + '%';
        if (americaBar) americaBar.style.width = Math.min((america / maxStrikes) * 100, 100) + '%';
        if (asiaBar) asiaBar.style.width = Math.min((asia / maxStrikes) * 100, 100) + '%';
        if (europeBar) europeBar.style.width = Math.min((europe / maxStrikes) * 100, 100) + '%';

        // Update vertical chart bars
        const chartAfrica = document.getElementById('chart-bar-africa');
        const chartAmerica = document.getElementById('chart-bar-america');
        const chartAsia = document.getElementById('chart-bar-asia');
        const chartEurope = document.getElementById('chart-bar-europe');
        const chartGlobal = document.getElementById('chart-bar-global');

        // Update chart values
        const chartValAfrica = document.getElementById('chart-val-africa');
        const chartValAmerica = document.getElementById('chart-val-america');
        const chartValAsia = document.getElementById('chart-val-asia');
        const chartValEurope = document.getElementById('chart-val-europe');
        const chartValGlobal = document.getElementById('chart-val-global');

        const global = africa + america + asia + europe;
        const maxChart = 200; // Max for chart height scaling

        if (chartAfrica) chartAfrica.style.height = Math.min((africa / maxChart) * 100, 100) + '%';
        if (chartAmerica) chartAmerica.style.height = Math.min((america / maxChart) * 100, 100) + '%';
        if (chartAsia) chartAsia.style.height = Math.min((asia / maxChart) * 100, 100) + '%';
        if (chartEurope) chartEurope.style.height = Math.min((europe / maxChart) * 100, 100) + '%';
        if (chartGlobal) chartGlobal.style.height = Math.min((global / maxChart) * 100, 100) + '%';

        if (chartValAfrica) chartValAfrica.textContent = africa;
        if (chartValAmerica) chartValAmerica.textContent = america;
        if (chartValAsia) chartValAsia.textContent = asia;
        if (chartValEurope) chartValEurope.textContent = europe;
        if (chartValGlobal) chartValGlobal.textContent = global;

        console.log('Lightning counters updated:', { africa, america, asia, europe, global });

        // Update Global Analysis with latest lightning data
        if (typeof updateGlobalAnalysis === 'function') {
            // Get latest values from dashboard
            const kpText = document.getElementById('analysis-kp')?.textContent || '0';
            const windText = document.getElementById('analysis-wind')?.textContent || '0 km/s';
            const schumannText = document.getElementById('analysis-schumann')?.textContent || '7.83 Hz';

            const kp = parseFloat(kpText);
            const wind = parseInt(windText);
            const schumann = parseFloat(schumannText);

            if (!isNaN(kp) && !isNaN(wind) && !isNaN(schumann)) {
                updateGlobalAnalysis(kp, wind, global, schumann);
            }
        }
    }

    // Update counters immediately and then every 5 seconds
    updateLightningCounters();
    setInterval(updateLightningCounters, 5000);
    updateTomskClock();
});

function toggleAudio(mode) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        gainNode.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

    const btnFixed = document.getElementById('toggle-audio-fixed');
    const btnLive = document.getElementById('toggle-audio-live');
    const canvas = document.getElementById('viz-canvas');

    if (isAudioPlaying && currentAudioMode === mode) {
        stopAudio();
        return;
    }

    if (isAudioPlaying && currentAudioMode !== mode) {
        stopAudio();
        setTimeout(() => toggleAudio(mode), 300);
        return;
    }

    if (audioCtx.state === 'suspended') audioCtx.resume();

    currentAudioMode = mode;
    const baseFreq = 200;
    let schumann = 7.83;

    if (mode === 'live') {
        const liveEl = document.getElementById('live-freq-val');
        schumann = liveEl ? parseFloat(liveEl.textContent) : 7.83;
    }

    oscL = audioCtx.createOscillator();
    oscR = audioCtx.createOscillator();
    const pannerL = audioCtx.createStereoPanner();
    pannerL.pan.value = -1;
    const pannerR = audioCtx.createStereoPanner();
    pannerR.pan.value = 1;

    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(baseFreq + schumann, audioCtx.currentTime);

    oscL.connect(pannerL).connect(gainNode);
    oscR.connect(pannerR).connect(gainNode);

    oscL.start();
    oscR.start();

    const vol = document.getElementById('audio-volume').value;
    gainNode.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.5);

    isAudioPlaying = true;
    if (mode === 'fixed') {
        const canvasFixed = document.getElementById('viz-canvas-fixed');
        btnFixed.classList.add('active');
        btnFixed.querySelector('.icon').textContent = '⏸';
        if (canvasFixed) canvasFixed.style.display = 'block';
    } else {
        btnLive.classList.add('active');
        btnLive.querySelector('.icon').textContent = '⏸';
        canvas.style.display = 'block';
    }
    startVisualizer(mode);
}

function stopAudio() {
    const btnFixed = document.getElementById('toggle-audio-fixed');
    const btnLive = document.getElementById('toggle-audio-live');
    const canvas = document.getElementById('viz-canvas');

    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    setTimeout(() => {
        if (oscL) { oscL.stop(); oscL.disconnect(); }
        if (oscR) { oscR.stop(); oscR.disconnect(); }
        cancelAnimationFrame(animationId);
        isAudioPlaying = false;
        currentAudioMode = null;
    }, 300);

    btnFixed.classList.remove('active');
    btnFixed.querySelector('.icon').textContent = '🔊';
    btnLive.classList.remove('active');
    btnLive.querySelector('.icon').textContent = '⚡';

    const canvasFixed = document.getElementById('viz-canvas-fixed');
    if (canvasFixed) canvasFixed.style.display = 'none';
    canvas.style.display = 'none';
}

function startVisualizer(mode) {
    const canvasId = (mode === 'fixed') ? 'viz-canvas-fixed' : 'viz-canvas';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
        if (!isAudioPlaying) return;
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            ctx.fillStyle = `rgba(0, 240, 255, ${dataArray[i] / 255 + 0.3})`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
    draw();
}

// --- CORE FUNCTIONS (Unchanged) ---
function refreshLiveData() {
    const btn = document.getElementById('refresh-data-btn');
    if (btn) btn.classList.add('loading');

    // Refresh all configured sources
    Object.keys(DATA_SOURCES).forEach(sourceKey => {
        updateSourceImage(sourceKey);
    });

    fetchSpaceWeather();
    setTimeout(() => { if (btn) btn.classList.remove('loading'); }, 2000);
}

function updateTomskClock() {
    const now = new Date();
    const tomskTime = new Date(now.getTime() + (7 * 3600 * 1000) + (now.getTimezoneOffset() * 60000));
    const h = tomskTime.getHours().toString().padStart(2, '0');
    const m = tomskTime.getMinutes().toString().padStart(2, '0');
    const el = document.getElementById('tomsk-clock');
    if (el) el.textContent = `${h}:${m}`;
}


function updateSourceImage(sourceKey) {
    const source = DATA_SOURCES[sourceKey];
    const container = document.getElementById(source.containerId);
    if (!container) return;

    const spinner = container.querySelector('.loading-spinner');
    const existingImg = container.querySelector('img');
    const errorMsg = container.querySelector('.error-message');

    if (spinner) spinner.style.display = 'block';
    if (errorMsg) errorMsg.style.display = 'none';
    if (existingImg) existingImg.style.opacity = '0.5';

    const img = new Image();
    const separator = source.url.includes('?') ? '&' : '?';
    const cacheBuster = `${separator}t=${Date.now()}`;

    img.onload = () => {
        if (spinner) spinner.style.display = 'none';
        if (existingImg) existingImg.remove();
        img.style.opacity = '0';
        container.appendChild(img);
        setTimeout(() => img.style.opacity = '1', 50);

        const timeEl = document.getElementById(source.timeId);
        if (timeEl) timeEl.textContent = 'Actualisé: ' + new Date().toLocaleTimeString();
    };

    img.onerror = () => {
        // Fallback or skip if first attempt fails
        if (spinner) spinner.style.display = 'none';
        if (existingImg) existingImg.remove();
        if (errorMsg) errorMsg.style.display = 'flex';
    };

    // For scientific sources often blocking hotlinks, sometimes a proxy is better
    // but for now, we try direct access with cache buster
    img.src = source.url + cacheBuster;
}

// --- DATA FETCHING ---
async function fetchSpaceWeather() {
    let kpVal = "--";
    let windVal = "--";
    let isLive = true;

    // 1. Fetch Kp Index
    try {
        const kpProxy = 'https://corsproxy.io/?' + encodeURIComponent('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
        const kpRes = await fetch(kpProxy);
        if (!kpRes.ok) throw new Error('Kp Fetch Error');
        const kpJson = await kpRes.json();
        kpVal = parseFloat(kpJson[kpJson.length - 1][1]);
    } catch (e) {
        console.warn("KP API Error:", e);
        // Keep previous val or show error, but allow Wind to proceed
        isLive = false; // Flag as issue
    }

    // 2. Fetch Solar Wind (Strategy: Try 1-min, fallback to 5-min)
    try {
        let windJson = null;

        // Try 1-minute feed first (Fastest)
        try {
            const windProxy1 = 'https://corsproxy.io/?' + encodeURIComponent('https://services.swpc.noaa.gov/products/solar-wind/plasma-1-minute.json');
            const res1 = await fetch(windProxy1);
            if (res1.ok) windJson = await res1.json();
            if (windJson && windJson.length < 2) windJson = null;
        } catch (e) { console.log("1-min wind failed, trying backup..."); }

        // Fallback to 5-minute if 1-minute failed
        if (!windJson) {
            console.log("Using 5-min backup feed...");
            const windProxy5 = 'https://corsproxy.io/?' + encodeURIComponent('https://services.swpc.noaa.gov/products/solar-wind/plasma-5-minute.json');
            const res5 = await fetch(windProxy5);
            if (!res5.ok) throw new Error('All Wind Sources Failed');
            windJson = await res5.json();
        }

        // Find last VALID wind speed
        let found = false;
        // Search deep (up to 50 points) to be sure
        for (let i = windJson.length - 1; i >= Math.max(0, windJson.length - 50); i--) {
            const row = windJson[i];
            if (row && row[2] && parseFloat(row[2]) > 0) {
                windVal = Math.round(parseFloat(row[2]));

                // DSCOVR ONLINE CHECK
                try {
                    const dataTime = new Date(row[0] + "Z");
                    const delay = Date.now() - dataTime.getTime();
                    const isOnline = delay < 3600000;
                    updateDscovrStatus(isOnline, delay);
                } catch (err) { console.error(err); }

                found = true;
                break;
            }
        }
        if (!found) throw new Error('No valid wind data found in history');

    } catch (e) {
        console.warn("Wind API Error:", e);
        // If wind fails but Kp worked, we are partially live
        if (kpVal !== "--") isLive = true;
        else isLive = false;
    }

    // If both failed, then we might want to simulate or just show "--"
    if (kpVal === "--" && windVal === "--") {
        updateDashboard((2 + Math.random()).toFixed(1), 350, false); // Full Sim fallback
    } else {
        updateDashboard(kpVal, windVal, isLive);
    }

    // Update Forecast (Independent)
    fetchForecast();
}

function updateDashboard(kp, wind, isLive) {
    // Calculate Schumann frequency ONCE to ensure consistency
    const schumannFreq = calculateSchumannFreq(kp);

    // Update all sections with the same data
    updateSectionWidgets('', kp, wind, isLive, schumannFreq);
    updateHarmonicsVisuals(kp, wind);
    updateGraphData(kp, wind, schumannFreq);

    // Update Schumann character
    updateSchumannCharacter(schumannFreq);

    // Update Global Analysis (if function exists)
    if (typeof updateGlobalAnalysis === 'function') {
        // Get lightning total from counters
        const lightningTotal = (
            parseInt(document.getElementById('lightning-africa')?.textContent || 0) +
            parseInt(document.getElementById('lightning-america')?.textContent || 0) +
            parseInt(document.getElementById('lightning-asia')?.textContent || 0) +
            parseInt(document.getElementById('lightning-europe')?.textContent || 0)
        ) || 100; // default if not yet loaded

        updateGlobalAnalysis(parseFloat(kp), parseInt(wind) || 400, lightningTotal, parseFloat(schumannFreq));

        // Update last Kp update time
        const now = new Date();
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const lastKpUpdate = document.getElementById('last-kp-update');
        if (lastKpUpdate) lastKpUpdate.textContent = timeStr;
    }
}

function updateSectionWidgets(suffix, kp, wind, isLive, schumannFreq) {
    const kpEl = document.getElementById('kp-index' + suffix);
    const windEl = document.getElementById('solar-wind' + suffix);
    const statusEl = document.getElementById('kp-status' + suffix);
    const stateEl = document.getElementById('schumann-state' + suffix);
    const freqEl = document.getElementById('schumann-freq-display' + suffix);
    const bioMainEl = document.getElementById('bio-impact' + suffix);
    const bioSubEl = document.getElementById('bio-detail' + suffix);

    if (kpEl) kpEl.textContent = kp;
    if (windEl) {
        windEl.textContent = wind;
        const w = parseFloat(wind);
        if (w >= 700) { windEl.style.color = "#ff4444"; windEl.style.textShadow = "0 0 10px rgba(255, 68, 68, 0.5)"; }
        else if (w >= 500) { windEl.style.color = "#ffaa00"; windEl.style.textShadow = "none"; }
        else { windEl.style.color = "#fff"; windEl.style.textShadow = "none"; }
    }

    const now = new Date().toLocaleTimeString();
    ['kp-update-time', 'wind-update-time', 'status-update-time', 'bio-update-time', 'system-update-time'].forEach(baseId => {
        const el = document.getElementById(baseId + suffix);
        if (el) el.textContent = "MàJ: " + now;
    });

    let statusText = "Calme";
    if (kp >= 4) statusText = "Active";
    if (kp >= 5) statusText = "Tempête";
    if (statusEl) {
        statusEl.textContent = isLive ? "Activité: " + statusText : "(Simulé)";
        statusEl.style.opacity = isLive ? 1 : 0.7;
    }

    // Use the frequency passed from updateDashboard (already calculated once)
    if (freqEl) freqEl.textContent = `Freq: ${schumannFreq} Hz`;

    // Update header frequency only for main section
    if (suffix === '') {
        const liveFreqHeader = document.getElementById('live-freq-val');
        if (liveFreqHeader) liveFreqHeader.textContent = `${schumannFreq} Hz`;
    }


    if (stateEl) {
        const freq = parseFloat(schumannFreq);
        if (freq < 7.7) {
            stateEl.textContent = "Ralentie";
            stateEl.style.color = "#60a5fa";
        }
        else if (freq <= 8.0) {
            stateEl.textContent = "Équilibrée";
            stateEl.style.color = "#a855f7";
        }
        else if (freq <= 8.5) {
            stateEl.textContent = "Accélérée";
            stateEl.style.color = "#f97316";
        }
        else {
            stateEl.textContent = "Intense";
            stateEl.style.color = "#dc2626";
        }
    }

    // Bio Impact Logic
    let bioStatus = "Neutre";
    let bioDetail = "Conditions stables";
    let bioColor = "#ffffff";

    if (kp < 3) {
        bioStatus = "Régénération";
        bioDetail = "Sommeil profond, Ancrage";
        bioColor = "#d4ff00";
    } else if (kp < 5) {
        bioStatus = "Stimulation";
        bioDetail = "Créativité, Rêves actifs";
        bioColor = "#ffeb3b";
    } else {
        bioStatus = "Tension";
        bioDetail = "Fatigue, Anxiété possible";
        bioColor = "#ff4444";
    }

    if (parseFloat(wind) > 600) {
        bioDetail += " + Pression";
    }

    if (bioMainEl) {
        bioMainEl.textContent = bioStatus;
        bioMainEl.style.color = bioColor;
    }
    if (bioSubEl) bioSubEl.textContent = bioDetail;

    // Update bio character in header (only for main section)
    if (suffix === '') {
        updateBioCharacter(bioStatus, kp);
    }
}

function updateBioCharacter(bioStatus, kp) {
    const container = document.querySelector('.bio-character-container');
    const label = document.getElementById('bio-character-label');
    const kpIndicator = document.getElementById('bio-character-kp');

    if (!container || !label) return;

    // Remove all state classes
    container.classList.remove('state-neutre', 'state-regeneration', 'state-stimulation', 'state-tension');

    // Add the appropriate state class
    const stateClass = 'state-' + bioStatus.toLowerCase();
    container.classList.add(stateClass);

    // Update label
    label.textContent = bioStatus;

    // Update Kp value directly
    if (kpIndicator) {
        kpIndicator.textContent = 'Kp: ' + kp;
    }
}

function updateSchumannCharacter(frequency) {
    const container = document.querySelector('.schumann-character-container');
    const label = document.getElementById('schumann-character-label');
    const freqIndicator = document.getElementById('schumann-character-freq');

    if (!container || !label) return;

    // Remove all state classes
    container.classList.remove('state-low', 'state-balanced', 'state-high', 'state-veryhigh');

    // Determine state based on Schumann frequency
    let state = 'balanced';
    let stateLabel = 'Équilibre';
    const freq = parseFloat(frequency);

    if (freq < 7.7) {
        state = 'low';
        stateLabel = 'Ralenti';
    } else if (freq >= 7.7 && freq <= 8.0) {
        state = 'balanced';
        stateLabel = 'Équilibre';
    } else if (freq > 8.0 && freq <= 8.5) {
        state = 'high';
        stateLabel = 'Accéléré';
    } else if (freq > 8.5) {
        state = 'veryhigh';
        stateLabel = 'Intense';
    }

    // Add the appropriate state class
    container.classList.add('state-' + state);

    // Update label
    label.textContent = stateLabel;

    // Update frequency value
    if (freqIndicator) {
        freqIndicator.textContent = frequency + ' Hz';
    }
}

function calculateSchumannFreq(kp) {
    let baseFreq = 7.83;
    let variation = (Math.random() * 0.04) - 0.02;
    if (kp >= 4) variation += (kp - 3) * 0.1;
    return (baseFreq + variation).toFixed(2);
}

function updateHarmonicsVisuals(kp, wind) {
    const k = parseFloat(kp) || 0;
    const w = parseFloat(wind) || 300;

    // Algorithm: Calculate absolute Intensity (v) AND relative Proportion (p)
    let v1 = 70; // Alpha Intensity (0-100)
    let v2 = 20; // Beta Intensity
    let v3 = 10; // Stress Intensity

    if (k >= 4 || w > 500) {
        // Storm: Stress increases, Alpha disturbed but maybe high amplitude noise
        v1 = 50 + Math.random() * 20;
        v2 = 50 + Math.random() * 20;
        v3 = 60 + Math.random() * 25;
    } else {
        // Calm: High Alpha, Low Beta
        v1 = 80 + Math.random() * 10;
        v2 = 25 + Math.random() * 10;
        v3 = 10 + Math.random() * 5;
    }

    // 1. Update BARS (Absolute Intensity)
    const setBar = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.style.width = Math.min(100, Math.max(5, val)) + '%';
    };
    setBar('f1-bar', v1);
    setBar('f2-bar', v2);
    setBar('f3-bar', v3);

    // 2. Update PIE (Relative Proportions)
    const total = v1 + v2 + v3;
    const p1 = (v1 / total) * 100;
    const p2 = (v2 / total) * 100;
    const p3 = (v3 / total) * 100;

    // Text
    const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = Math.round(val) + "%";
    };
    setTxt('val-f1', p1);
    setTxt('val-f2', p2);
    setTxt('val-f3', p3);

    // Conic Gradient
    const pie = document.getElementById('freq-pie');
    if (pie) {
        const stop1 = p1;
        const stop2 = p1 + p2;
        pie.style.background = `conic-gradient(
            #00f0ff 0% ${stop1}%, 
            #ffaa00 ${stop1}% ${stop2}%, 
            #ff4444 ${stop2}% 100%
        )`;
    }
}

// --- GRAPH ENGINE (STANDARD CHRONOLOGICAL: Left=Past, Right=Present) ---

function initCorrelationGraph() {
    graphCanvas = document.getElementById('correlation-canvas');
    if (!graphCanvas) return;
    graphCtx = graphCanvas.getContext('2d');
    const container = graphCanvas.parentElement;
    graphCanvas.width = container.clientWidth || 800;
    graphCanvas.height = container.clientHeight || 250;
    window.addEventListener('resize', () => {
        graphCanvas.width = container.clientWidth;
        graphCanvas.height = container.clientHeight;
        drawGraph();
    });

    // Mouse Interaction for Tooltip
    graphCanvas.addEventListener('mousemove', handleGraphHover);
    graphCanvas.addEventListener('mouseleave', () => {
        const tooltip = document.getElementById('graph-tooltip');
        if (tooltip) tooltip.style.display = 'none';
        drawGraph(); // Clear selection line
    });
}

function handleGraphHover(e) {
    if (graphData.wind.length === 0) return;

    const rect = graphCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const w = graphCanvas.width;
    const count = graphData.wind.length;

    // Find closest index based on X
    // X = (i / (count-1)) * w
    // i = (X / w) * (count-1)
    let index = Math.round((mouseX / w) * (count - 1));
    if (index < 0) index = 0;
    if (index >= count) index = count - 1;

    // Get Data
    const time = graphData.labels[index] || "--:--";
    const wind = graphData.wind[index];
    const kp = graphData.kp[index];
    const schumann = graphData.schumann[index];

    // Update Tooltip
    const tooltip = document.getElementById('graph-tooltip');
    if (tooltip) {
        // Calculate Position
        // Prevent overflow right
        let left = mouseX + 15;
        if (left + 150 > w) left = mouseX - 165;

        tooltip.style.left = left + 'px';
        tooltip.style.top = '10px';
        tooltip.style.display = 'block';

        tooltip.innerHTML = `
            <div class="tooltip-time">${time}</div>
            <div class="tooltip-row" style="color:#ff4444"><span>Vent:</span> <b>${wind} km/s</b></div>
            <div class="tooltip-row" style="color:#ffaa00"><span>Kp:</span> <b>${kp}</b></div>
            <div class="tooltip-row" style="color:#00f0ff"><span>Freq:</span> <b>${schumann} Hz</b></div>
        `;
    }

    // Redraw graph with vertical line
    drawGraph(index);
}

function updateGraphData(kp, wind, freq) {
    if (!graphCtx) return;

    // Use PUSH to add NEWest data at END (Right)
    graphData.wind.push(parseFloat(wind) || 0);
    graphData.kp.push(parseFloat(kp) || 0);
    graphData.schumann.push(parseFloat(freq) || 7.83);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    graphData.labels.push(timeStr);

    // Trim START (Oldest)
    if (graphData.wind.length > MAX_GRAPH_POINTS) {
        graphData.wind.shift();
        graphData.kp.shift();
        graphData.schumann.shift();
        graphData.labels.shift();
    }

    const timeEl = document.getElementById('graph-last-update');
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

    drawGraph();
}

function drawGraph(highlightIndex = -1) {
    if (!graphCtx) return;
    const w = graphCanvas.width;
    const h = graphCanvas.height;

    const paddingBottom = 30;
    const graphH = h - paddingBottom;

    graphCtx.clearRect(0, 0, w, h);

    // Highlight Line
    if (highlightIndex !== -1 && graphData.wind.length > 1) {
        const x = (highlightIndex / (graphData.wind.length - 1)) * w;
        graphCtx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        graphCtx.lineWidth = 1;
        graphCtx.setLineDash([5, 5]);
        graphCtx.beginPath();
        graphCtx.moveTo(x, 0);
        graphCtx.lineTo(x, h - paddingBottom);
        graphCtx.stroke();
        graphCtx.setLineDash([]);

        // Dot interactions
        // We will draw dots on top of lines later or here?
        // Let's draw lines first, then dots?
        // Actually drawing lines is main task.
    }

    // Grid
    graphCtx.strokeStyle = "rgba(255,255,255,0.05)";
    graphCtx.lineWidth = 1;
    graphCtx.beginPath();
    for (let i = 1; i < 4; i++) {
        const y = (graphH / 4) * i;
        graphCtx.moveTo(0, y);
        graphCtx.lineTo(w, y);
    }
    graphCtx.stroke();

    // Draw Axis Label - Dynamic Time X-Axis
    drawXAxis(w, h, 0); // 0 padding adjustment since we passed full canvas dims inside

    // No static text anymore

    const count = graphData.wind.length;
    if (count === 0) return;

    const drawSmoothedSeries = (data, color, minVal, maxVal) => {
        graphCtx.beginPath();
        graphCtx.strokeStyle = color;
        graphCtx.lineWidth = 2;
        graphCtx.lineJoin = 'round';

        if (count === 1) {
            const y = mapY(data[0], minVal, maxVal, graphH);
            graphCtx.moveTo(0, y);
            graphCtx.lineTo(w, y); // Draw default line
            graphCtx.stroke();
            return;
        }

        // DRAW: Left (Old) to Right (New)
        let points = data.map((val, i) => {
            return {
                x: (i / (count - 1)) * w, // Stretch to fit
                y: mapY(val, minVal, maxVal, graphH)
            };
        });

        graphCtx.moveTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const midX = (p0.x + p1.x) / 2;
            graphCtx.bezierCurveTo(midX, p0.y, midX, p1.y, p1.x, p1.y);
        }

        graphCtx.stroke();

        // Dot at END (Right for latest) or Highlighted point
        if (highlightIndex !== -1) {
            // Draw dot at highlighted index
            const hp = points[highlightIndex];
            if (hp) {
                graphCtx.fillStyle = "#fff";
                graphCtx.beginPath();
                graphCtx.arc(hp.x, hp.y, 5, 0, Math.PI * 2);
                graphCtx.fill();
                graphCtx.strokeStyle = color;
                graphCtx.lineWidth = 2;
                graphCtx.stroke();
            }
        } else {
            // Default: Dot at end
            const lastP = points[points.length - 1];
            graphCtx.fillStyle = color;
            graphCtx.beginPath();
            graphCtx.arc(lastP.x, lastP.y, 4, 0, Math.PI * 2);
            graphCtx.fill();
        }

        // Glow
        graphCtx.shadowColor = color;
        graphCtx.shadowBlur = 10;
        graphCtx.stroke();
        graphCtx.shadowBlur = 0;
    };

    drawSmoothedSeries(graphData.wind, '#ff4444', 300, 800);
    drawSmoothedSeries(graphData.kp, '#ffaa00', 0, 9);
    drawSmoothedSeries(graphData.schumann, '#00f0ff', 7.75, 8.05);
}

function drawXAxis(w, h, padding) {
    if (graphData.labels.length < 2) return;

    graphCtx.fillStyle = "rgba(255,255,255,0.4)";
    graphCtx.font = "10px sans-serif";
    graphCtx.textAlign = "center";

    // Draw 5 labels distributed across history
    const count = graphData.labels.length;
    const steps = 5;

    for (let i = 0; i < steps; i++) {
        // Calculate index roughly
        const idx = Math.floor((count - 1) * (i / (steps - 1)));
        if (!graphData.labels[idx]) continue;

        const label = graphData.labels[idx];
        const x = (idx / (count - 1)) * w;

        // Adjust alignment for edges
        if (i === 0) graphCtx.textAlign = "left";
        else if (i === steps - 1) graphCtx.textAlign = "right";
        else graphCtx.textAlign = "center";

        // Draw tick
        graphCtx.strokeStyle = "rgba(255,255,255,0.1)";
        graphCtx.beginPath();
        graphCtx.moveTo(x, h - 25);
        graphCtx.lineTo(x, h - 15);
        graphCtx.stroke();

        // Draw time
        let textX = x;
        if (i === 0) textX = 5;
        if (i === steps - 1) textX = w - 5;

        graphCtx.fillText(label, textX, h - 5);
    }
}

function mapY(val, min, max, h) {
    let norm = (val - min) / (max - min);
    if (norm < 0) norm = 0; if (norm > 1) norm = 1;
    return h - (norm * h * 0.9) - (h * 0.05);
}

// --- FORECAST ENGINE ---
async function fetchForecast() {
    try {
        const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';
        const proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);

        const res = await fetch(proxy);
        const data = await res.json();

        // Data format: [ [time, kp, observed/estimated], ... ]
        // We need to group by day or check entries?
        // Actually this file gives 3-day forecast at 3-hour intervals?
        // No, `noaa-planetary-k-index-forecast.json` might be different.
        // Let's assume standard [time, kp] list.

        // Simpler for demo if structure is complex: Use 3 representative points per day?
        // Let's just grab the next few entries if they are future.

        // NOAA Forecast format is typically:
        // [ "2023-10-27 00:00:00", "3", "observed", "NOAA SWPC" ]
        // We want entries where time > now.

        if (!data || data.length < 2) return;

        // Display Logic: Find Max Kp for Day 1, Day 2, Day 3
        // Actually, let's just show next 3 slots for simplicity or Daily Peaks?
        // Let's show "Max Kp" for Today/Tomorrow.

        // Simplified parsing for stability:
        // Just take last entries? No forecast is future.
        // We will simple-parse: Next 3 entries = T+3h, T+6h, T+9h trend.

        // BETTER: Use "3-day Forecast" text logic
        // But for this JSON, let's just show the immediate Trend.

        const next1 = data[data.length - 3];
        const next2 = data[data.length - 2];
        const next3 = data[data.length - 1];

        // Update DOM
        updateForecastRow('forecast-today', 'Auj (Max)', next1[1]);
        updateForecastRow('forecast-tomorrow', 'Dem (Est)', next2[1]);
        updateForecastRow('forecast-next', 'J+2 (Est)', next3[1]);

    } catch (e) {
        console.warn("Forecast API Error", e);
        const el = document.getElementById('forecast-today');
        if (el) el.textContent = "Prévisions indisponibles";
    }
}

function updateForecastRow(id, label, kp) {
    const el = document.getElementById(id);
    if (!el) return;

    let color = "#fff";
    const k = parseFloat(kp);
    if (k >= 5) color = "#ff4444";
    else if (k >= 4) color = "#ffaa00";
    else color = "#00ff88";

    el.innerHTML = `<span>${label}</span> <span class="forecast-val" style="color:${color}">Kp ${kp}</span>`;
}

function updateDscovrStatus(isOnline, delayMs) {
    const el = document.getElementById('dscovr-status');
    if (!el) return;

    if (isOnline) {
        el.innerHTML = `<span class="sat-dot" style="color:#00ff88"></span>En Ligne`;
        el.style.color = "#00ff88"; // Text color
    } else {
        const delayMin = Math.round(delayMs / 60000);
        el.innerHTML = `<span class="sat-dot" style="color:#ff4444"></span>Hors Ligne (${delayMin}m)`;
        el.style.color = "#ff4444";
    }
}

