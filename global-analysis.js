
// Global Analysis System
let globalAnalysisData = {
    kp: 0,
    wind: 0,
    lightning: 0,
    schumann: 7.83
};

function updateGlobalAnalysis(kp, wind, lightning, schumann) {
    globalAnalysisData = { kp, wind, lightning, schumann };

    // Update metric displays
    document.getElementById('analysis-kp').textContent = kp.toFixed(1);
    document.getElementById('analysis-wind').textContent = wind + ' km/s';
    document.getElementById('analysis-lightning').textContent = lightning + '/min';
    document.getElementById('analysis-schumann').textContent = schumann.toFixed(2) + ' Hz';

    // Analyze each metric
    analyzeKp(kp);
    analyzeWind(wind);
    analyzeLightning(lightning);
    analyzeSchumann(schumann);

    // Update harmonics bars
    updateHarmonicsBars(kp, schumann);

    // Update Schumann Amplitude
    updateSchumannAmplitude(kp, lightning);

    // Generate global conclusion
    generateGlobalConclusion();
}

function analyzeKp(kp) {
    const statusEl = document.getElementById('analysis-kp-status');
    if (kp < 3) {
        statusEl.textContent = 'Calme';
        statusEl.style.background = 'rgba(0, 255, 136, 0.2)';
        statusEl.style.color = '#00ff88';
    } else if (kp < 5) {
        statusEl.textContent = 'Modéré';
        statusEl.style.background = 'rgba(255, 170, 0, 0.2)';
        statusEl.style.color = '#ffaa00';
    } else {
        statusEl.textContent = 'Intense';
        statusEl.style.background = 'rgba(255, 68, 68, 0.2)';
        statusEl.style.color = '#ff4444';
    }
}

function analyzeWind(wind) {
    const statusEl = document.getElementById('analysis-wind-status');
    if (wind < 400) {
        statusEl.textContent = 'Faible';
        statusEl.style.background = 'rgba(0, 255, 136, 0.2)';
        statusEl.style.color = '#00ff88';
    } else if (wind < 600) {
        statusEl.textContent = 'Normal';
        statusEl.style.background = 'rgba(0, 240, 255, 0.2)';
        statusEl.style.color = '#00f0ff';
    } else {
        statusEl.textContent = 'Élevé';
        statusEl.style.background = 'rgba(255, 170, 0, 0.2)';
        statusEl.style.color = '#ffaa00';
    }
}

function analyzeLightning(lightning) {
    const statusEl = document.getElementById('analysis-lightning-status');
    if (lightning < 80) {
        statusEl.textContent = 'Faible';
        statusEl.style.background = 'rgba(0, 255, 136, 0.2)';
        statusEl.style.color = '#00ff88';
    } else if (lightning < 120) {
        statusEl.textContent = 'Normal';
        statusEl.style.background = 'rgba(255, 170, 0, 0.2)';
        statusEl.style.color = '#ffaa00';
    } else {
        statusEl.textContent = 'Intense';
        statusEl.style.background = 'rgba(255, 68, 68, 0.2)';
        statusEl.style.color = '#ff4444';
    }
}

function analyzeSchumann(freq) {
    const statusEl = document.getElementById('analysis-schumann-status');
    if (freq < 7.7) {
        statusEl.textContent = 'Ralentie';
        statusEl.style.background = 'rgba(96, 165, 250, 0.2)';
        statusEl.style.color = '#60a5fa';
    } else if (freq <= 8.0) {
        statusEl.textContent = 'Équilibrée';
        statusEl.style.background = 'rgba(168, 85, 247, 0.2)';
        statusEl.style.color = '#a855f7';
    } else if (freq <= 8.5) {
        statusEl.textContent = 'Accélérée';
        statusEl.style.background = 'rgba(249, 115, 22, 0.2)';
        statusEl.style.color = '#f97316';
    } else {
        statusEl.textContent = 'Intense';
        statusEl.style.background = 'rgba(220, 38, 38, 0.2)';
        statusEl.style.color = '#dc2626';
    }
}

function updateHarmonicsBars(kp, schumannFreq) {
    // Calculate actual frequencies affected by Kp
    // Each harmonic shifts slightly when geomagnetic activity increases
    const f1_base = 7.83;
    const f2_base = 14.3;
    const f3_base = 20.8;

    // Frequency increases with Kp (ionosphere compression)
    const f1_freq = f1_base + (kp * 0.01);  // ~7.83-7.89 Hz
    const f2_freq = f2_base + (kp * 0.02);  // ~14.3-14.42 Hz
    const f3_freq = f3_base + (kp * 0.03);  // ~20.8-20.98 Hz

    // Average frequency
    const avg_freq = (f1_freq + f2_freq + f3_freq) / 3;

    // Calculate bar widths (scale relative to base frequency range)
    // For visualization: base = 0%, max shift = 100%
    const maxShift = 0.20; // Maximum expected shift in Hz
    const f1_percent = ((f1_freq - f1_base) / maxShift) * 100;
    const f2_percent = ((f2_freq - f2_base) / maxShift) * 100;
    const f3_percent = ((f3_freq - f3_base) / maxShift) * 100;
    const avg_percent = ((avg_freq - f1_base) / maxShift) * 100;

    // Update bars
    const f1Bar = document.getElementById('harmonic-bar-f1');
    const f2Bar = document.getElementById('harmonic-bar-f2');
    const f3Bar = document.getElementById('harmonic-bar-f3');

    const f1Value = document.getElementById('harmonic-f1-value');
    const f2Value = document.getElementById('harmonic-f2-value');
    const f3Value = document.getElementById('harmonic-f3-value');

    if (f1Bar) f1Bar.style.width = Math.min(Math.max(f1_percent, 5), 100) + '%';
    if (f2Bar) f2Bar.style.width = Math.min(Math.max(f2_percent, 5), 100) + '%';
    if (f3Bar) f3Bar.style.width = Math.min(Math.max(f3_percent, 5), 100) + '%';

    // Display actual frequencies in Hz
    if (f1Value) f1Value.textContent = f1_freq.toFixed(2) + ' Hz';
    if (f2Value) f2Value.textContent = f2_freq.toFixed(2) + ' Hz';
    if (f3Value) f3Value.textContent = f3_freq.toFixed(2) + ' Hz';

    // Calculate and update average
    const avgBar = document.getElementById('harmonic-bar-avg');
    const avgValue = document.getElementById('harmonic-avg-value');

    if (avgBar) avgBar.style.width = Math.min(Math.max(avg_percent, 5), 100) + '%';
    if (avgValue) avgValue.textContent = avg_freq.toFixed(2) + ' Hz';
}

// Amplitude history for trend tracking
let amplitudeHistory = [];

function updateSchumannAmplitude(kp, lightning) {
    // Calculate amplitude (0-100) based on geomagnetic activity and lightning
    const kpContribution = (kp / 9) * 60;
    const lightningContribution = Math.min((lightning / 200) * 40, 40);
    const amplitude = Math.min(kpContribution + lightningContribution, 100);

    // Store in history (keep last 10 values)
    amplitudeHistory.push(amplitude);
    if (amplitudeHistory.length > 10) amplitudeHistory.shift();

    // Calculate trend
    let trendIcon = '→';
    let trendText = 'Stable';
    let trendColor = '#00f0ff';

    if (amplitudeHistory.length >= 3) {
        const recent = amplitudeHistory.slice(-3);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const diff = amplitude - avg;

        if (diff > 5) {
            trendIcon = '↗️';
            trendText = 'En hausse';
            trendColor = '#ff4444';
        } else if (diff < -5) {
            trendIcon = '↘️';
            trendText = 'En baisse';
            trendColor = '#00ff88';
        }
    }

    // Historical comparison
    const globalAverage = 40;
    let comparison = '';
    let comparisonColor = '#00f0ff';

    if (amplitude > globalAverage + 15) {
        comparison = 'Bien au-dessus de la moyenne';
        comparisonColor = '#ff4444';
    } else if (amplitude > globalAverage + 5) {
        comparison = 'Au-dessus de la moyenne';
        comparisonColor = '#ffaa00';
    } else if (amplitude < globalAverage - 15) {
        comparison = 'Bien en-dessous de la moyenne';
        comparisonColor = '#00ff88';
    } else if (amplitude < globalAverage - 5) {
        comparison = 'En-dessous de la moyenne';
        comparisonColor = '#60a5fa';
    } else {
        comparison = 'Proche de la moyenne';
        comparisonColor = '#00f0ff';
    }

    // Contextual recommendations
    let recommendation = '';
    if (amplitude <= 30) {
        recommendation = 'Moment idéal pour la méditation profonde et la récupération énergétique';
    } else if (amplitude <= 60) {
        recommendation = 'Conditions favorables aux activités normales et à la concentration';
    } else if (amplitude <= 80) {
        recommendation = 'Restez hydratés et prenez des pauses régulières. Certaines personnes peuvent être sensibles';
    } else {
        recommendation = '⚠️ Signal très intense. Privilégiez le repos et limitez les stimuli externes';
    }

    // Update display
    const valueEl = document.getElementById('schumann-amplitude-value');
    const barEl = document.getElementById('amplitude-bar');
    const percentEl = document.getElementById('amplitude-percent');
    const trendEl = document.getElementById('amplitude-trend');
    const comparisonEl = document.getElementById('amplitude-comparison');
    const recommendationEl = document.getElementById('amplitude-recommendation');

    if (valueEl) valueEl.textContent = Math.round(amplitude);
    if (barEl) barEl.style.width = amplitude + '%';
    if (percentEl) percentEl.textContent = Math.round(amplitude);

    if (trendEl) {
        trendEl.innerHTML = `${trendIcon} <strong>${trendText}</strong>`;
        trendEl.style.color = trendColor;
    }

    if (comparisonEl) {
        comparisonEl.textContent = comparison;
        comparisonEl.style.color = comparisonColor;
    }

    if (recommendationEl) recommendationEl.textContent = recommendation;

    // Update historical tracking
    updateAmplitudeHistory(amplitude);
}

// Session tracking
let sessionStartTime = Date.now();
let amplitudeFullHistory = [];

function updateAmplitudeHistory(amplitude) {
    // Store value with timestamp
    amplitudeFullHistory.push({ time: Date.now(), value: amplitude });

    // Keep last 100 points max
    if (amplitudeFullHistory.length > 100) amplitudeFullHistory.shift();

    // Calculate statistics
    const values = amplitudeFullHistory.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    // Update stats display
    document.getElementById('amplitude-min').textContent = Math.round(min);
    document.getElementById('amplitude-avg').textContent = Math.round(avg);
    document.getElementById('amplitude-max').textContent = Math.round(max);

    // Update session duration
    const elapsed = Date.now() - sessionStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('session-duration').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Draw history graph
    drawAmplitudeHistory();

    // Analyze biological effects
    analyzeBiologicalEffects(values, avg);
}

function drawAmplitudeHistory() {
    const canvas = document.getElementById('amplitude-history-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (amplitudeFullHistory.length < 2) return;

    // Draw grid
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw line
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();

    amplitudeFullHistory.forEach((point, i) => {
        const x = (i / (amplitudeFullHistory.length - 1)) * width;
        const y = height - (point.value / 100) * height;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();

    // Gradient fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(0,240,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,240,255,0)');
    ctx.fillStyle = gradient;
    ctx.fill();
}

function analyzeBiologicalEffects(values, avg) {
    const bioEl = document.getElementById('bio-effects-history');
    if (!bioEl || values.length < 3) return;

    let effects = [];

    // Analyze average level
    if (avg < 30) {
        effects.push('✅ <strong>Période propice à la récupération</strong> : Le signal faible favorise le repos profond et la régénération');
    } else if (avg < 50) {
        effects.push('✔️ <strong>Conditions normales</strong> : Environnement équilibré pour les activités quotidiennes');
    } else if (avg < 70) {
        effects.push('⚠️ <strong>Stimulation modérée</strong> : Possibles effets sur la concentration et l\'humeur');
    } else {
        effects.push('🔴 <strong>Signal intense</strong> : Environnement stimulant pouvant affecter le système nerveux');
    }

    // Analyze variability
    const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 15) {
        effects.push('📊 <strong>Forte variabilité</strong> : Les changements rapides peuvent perturber l\'adaptation biologique');
    } else if (stdDev < 5) {
        effects.push('➡️ <strong>Signal stable</strong> : La constance facilite l\'adaptation de l\'organisme');
    }

    // Time exposure
    const duration = (Date.now() - sessionStartTime) / 60000;
    if (duration > 30 && avg > 60) {
        effects.push('⏱️ <strong>Exposition prolongée</strong> : ' + Math.round(duration) + ' min à signal élevé - Prenez des pauses');
    }

    bioEl.innerHTML = effects.join('<br>');
}

function generateGlobalConclusion() {
    const { kp, wind, lightning, schumann } = globalAnalysisData;

    // Determine global status - ALIGNED with bio-character thresholds
    let globalStatus = 'calm';
    let statusText = 'CONDITIONS CALMES';
    let statusClass = 'status-calm';

    // INTENSE only if Kp is truly high (>= 5)
    if (kp >= 5) {
        globalStatus = 'intense';
        statusText = 'CONDITIONS INTENSES';
        statusClass = 'status-intense';
    }
    // ACTIVE if Kp is moderate (3-5) OR high wind/lightning
    else if (kp >= 3 || wind >= 500 || lightning >= 110) {
        globalStatus = 'active';
        statusText = 'CONDITIONS ACTIVES';
        statusClass = 'status-active';
    }

    // Update badge
    const badge = document.getElementById('global-status-badge');
    badge.textContent = statusText;
    badge.className = 'global-status-badge ' + statusClass;

    // Generate analysis text
    let analysisText = '';
    let recommendations = [];

    if (globalStatus === 'calm') {
        analysisText = `Les conditions géomagnétiques sont <strong>calmes</strong> (Kp: ${kp.toFixed(1)}). `;
        analysisText += `Le vent solaire circule à une vitesse <strong>normale</strong> de ${wind} km/s. `;
        analysisText += `L'activité orageuse mondiale génère ${lightning} éclairs par minute, produisant des harmoniques de Schumann à <strong>${schumann} Hz</strong>. `;
        analysisText += `L'ensemble de ces paramètres crée un environnement électromagnétique <strong>propice au bien-être</strong>.`;

        recommendations = [
            'Période idéale pour la méditation et la relaxation profonde',
            'Favorise la régénération cellulaire et le sommeil réparateur',
            'Propice à la créativité et aux activités intellectuelles calmes',
            'Bon moment pour les pratiques de cohérence cardiaque'
        ];
    } else if (globalStatus === 'active') {
        analysisText = `Les conditions géomagnétiques sont <strong>actives</strong> (Kp: ${kp.toFixed(1)}). `;
        analysisText += `Le vent solaire souffle à ${wind} km/s, induisant des <strong>perturbations modérées</strong>. `;
        analysisText += `${lightning} éclairs par minute activent intensément les harmoniques de Schumann (${schumann} Hz). `;
        analysisText += `Ces conditions peuvent <strong>stimuler</strong> certaines personnes tout en en perturbant d'autres.`;

        recommendations = [
            'Soyez à l\'écoute de vos sensations physiques et émotionnelles',
            'Privilégiez les activités créatives et dynamiques',
            'Hydratez-vous bien et faites des pauses régulières',
            'Certaines personnes peuvent ressentir de la fatigue ou de l\'agitation',
            'Favorisez les exercices de mise à la terre (marche pieds nus, nature)'
        ];
    } else {
        analysisText = `<strong>Tempête géomagnétique en cours !</strong> (Kp: ${kp.toFixed(1)}). `;
        analysisText += `Le vent solaire atteint <strong>${wind} km/s</strong>, créant des perturbations significatives. `;
        analysisText += `L'activité orageuse intense (${lightning} éclairs/min) excite fortement les harmoniques (${schumann} Hz). `;
        analysisText += `Ces conditions peuvent avoir des <strong>effets marqués</strong> sur le système nerveux et le bien-être général.`;

        recommendations = [
            '⚠️ Période sensible pour les personnes électro-sensibles',
            'Évitez les décisions importantes et les discussions conflictuelles',
            'Reposez-vous davantage, le sommeil peut être perturbé',
            'Pratiquez des techniques de relaxation (respiration, yoga doux)',
            'Limitez l\'exposition aux écrans et aux champs électromagnétiques',
            'Augmentez votre contact avec la nature pour vous recentrer'
        ];
    }

    // Update DOM
    document.getElementById('global-analysis-text').innerHTML = analysisText;

    const recList = document.getElementById('global-recommendations');
    recList.innerHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
}

// Call this function from updateDashboard
