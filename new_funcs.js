function getBlankState() {
  return {
    p1: {},
    p2: {}
  };
}

async function startOptimizationAndSearch() {
  const modal = document.getElementById('flight-discovery-modal');
  const progressBar = document.getElementById('discovery-progress-bar');
  const statusText = document.getElementById('discovery-status-text');
  const percentageText = document.getElementById('discovery-percentage');
  const legsList = document.getElementById('discovery-legs-list');

  const searchRoutes = [];
  
  ['p1', 'p2'].forEach((pKey) => {
    if (pKey === 'p2' && tripConfig.passengerCount < 2) return;
    
    const traveler = tripConfig[pKey];
    const n = traveler.name || (pKey === 'p1' ? 'Pasajero 1' : 'Pasajero 2');
    const orig = traveler.origin?.split('—')[0]?.trim() || '';
    const wps = traveler.waypoints || [];
    
    let currentOrig = orig;
    
    wps.forEach((wp, idx) => {
      const dest = wp.cityCode || 'MAD';
      searchRoutes.push({
        label: `Vuelo de ${n}: ${currentOrig} ➔ ${dest}`,
        dep: currentOrig,
        arr: dest,
        date: idx === 0 ? traveler.startDate : (wps[idx-1].departureDate),
        traveler: pKey,
        segment: `tramo-${idx}`,
        isJoint: wp.jointFlight || false
      });
      currentOrig = dest;
      
      if (wp.isRoundtrip) {
        searchRoutes.push({
          label: `Regreso de ${n}: ${dest} ➔ ${orig}`,
          dep: dest,
          arr: orig,
          date: wp.departureDate,
          traveler: pKey,
          segment: `retorno-${idx}`,
          isJoint: false
        });
      }
    });
  });

  if (modal) {
    modal.classList.remove('hidden');
    if (progressBar) progressBar.style.width = '10%';
    if (percentageText) percentageText.innerText = '10%';
    if (statusText) statusText.innerText = 'Conectando con Google Flights Live API...';
    if (legsList) {
      legsList.innerHTML = searchRoutes.map((r, idx) => `
        <div id="disc-leg-${idx}" class="flex items-center justify-between p-2.5 rounded-xl text-xs" style="background-color: rgba(255, 255, 255, 0.07); border: 1px solid rgba(255, 255, 255, 0.12);">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-slate-500" id="disc-dot-${idx}"></span>
            <span class="font-medium text-slate-200">${r.label} (${r.date})</span>
          </div>
          <span class="text-[11px] font-mono text-slate-400" id="disc-state-${idx}">En espera</span>
        </div>
      `).join('');
    }
  }

  // Simulate API load
  for (let i = 0; i < searchRoutes.length; i++) {
    await new Promise(r => setTimeout(r, 600));
    const pct = Math.round(10 + ((i + 1) / searchRoutes.length) * 80);
    if (progressBar) progressBar.style.width = pct + '%';
    if (percentageText) percentageText.innerText = pct + '%';
    const dot = document.getElementById(`disc-dot-${i}`);
    const st = document.getElementById(`disc-state-${i}`);
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
    if (st) { st.innerText = 'Completado'; st.className = 'text-[11px] font-mono font-bold text-emerald-400'; }
    if (statusText) statusText.innerText = `Buscando: ${searchRoutes[i].label}...`;
  }

  await new Promise(r => setTimeout(r, 600));
  if (progressBar) progressBar.style.width = '100%';
  if (percentageText) percentageText.innerText = '100%';
  if (statusText) statusText.innerText = '¡Búsqueda Completada!';
  await new Promise(r => setTimeout(r, 800));
  if (modal) modal.classList.add('hidden');
  
  if (typeof renderStep3 === 'function') renderStep3();
}

function selectStep3Flight(traveler, stateKey, flightId, isJoint) {
  if (isJoint) {
    state.p1[stateKey] = flightId;
    if (tripConfig.passengerCount > 1) {
      state.p2[stateKey] = flightId;
    }
    showToast('✓ Vuelo Conjunto Sincronizado', 'success');
  } else {
    state[traveler][stateKey] = flightId;
    showToast('✓ Vuelo seleccionado con éxito', 'success');
  }
  if (typeof autoSaveActiveSession === 'function') autoSaveActiveSession();
  if (typeof renderStep3 === 'function') renderStep3();
  if (typeof render === 'function') render();
}

function getSegments(traveler) {
  const pKey = traveler === 'p1' ? 'p1' : 'p2';
  const travelerData = tripConfig[pKey];
  const origCode = travelerData.origin?.split('—')[0]?.trim() || '';
  const wps = travelerData.waypoints || [];
  
  const segments = [];
  let stepCounter = 1;
  let currentOrig = origCode;
  
  wps.forEach((wp, idx) => {
    const destCode = wp.cityCode || 'MAD';
    segments.push({
      key: `tramo-${idx}`, step: String(stepCounter++),
      label: `Tramo ${idx+1}: ${currentOrig} ➔ ${destCode}`,
      type: 'select', segment: `tramo-${idx}`,
      sub: `Llegada: ${wp.arrivalDate}`
    });
    currentOrig = destCode;
    
    if (wp.isRoundtrip) {
      segments.push({
        key: `retorno-${idx}`, step: String(stepCounter++),
        label: `Retorno: ${destCode} ➔ ${origCode}`,
        type: 'select', segment: `retorno-${idx}`,
        sub: `Regreso: ${wp.departureDate}`
      });
    }
  });
  
  return segments;
}
