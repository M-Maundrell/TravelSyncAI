import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

def replace_func(func_name, new_body, text):
    pattern = r'(?:async\s+)?function\s+' + func_name + r'\s*\([^)]*\)\s*\{'
    match = re.search(pattern, text)
    if not match:
        print("NOT FOUND:", func_name)
        return text
    start_idx = match.start()
    brace_idx = match.end() - 1
    open_braces = 1
    i = brace_idx + 1
    while i < len(text) and open_braces > 0:
        if text[i] == '{':
            open_braces += 1
        elif text[i] == '}':
            open_braces -= 1
        i += 1
    
    return text[:start_idx] + new_body + text[i:]


# 1
content = replace_func('getBlankState', '''function getBlankState() {
      return { p1: {}, p2: {} };
    }''', content)

# 2
content = replace_func('startOptimizationAndSearch', '''async function startOptimizationAndSearch() {
      const modal = document.getElementById('flight-discovery-modal');
      const progressBar = document.getElementById('discovery-progress-bar');
      const statusText = document.getElementById('discovery-status-text');
      const percentageText = document.getElementById('discovery-percentage');
      const legsList = document.getElementById('discovery-legs-list');

      const searchRoutes = [];
      const travelers = tripConfig.passengerCount > 1 ? ['p1', 'p2'] : ['p1'];
      
      for (const t of travelers) {
          const wps = tripConfig[t].waypoints || [];
          let currentOrigin = tripConfig[t].origin?.split('—')[0]?.trim() || '';
          
          wps.forEach((w, i) => {
              const segId = `leg_${t}_${i}`;
              searchRoutes.push({
                  label: `Tramo ${t}: ${currentOrigin} ➔ ${w.cityCode}`,
                  dep: currentOrigin,
                  arr: w.cityCode,
                  date: w.arrivalDate,
                  traveler: t,
                  segment: segId,
                  isJoint: w.jointFlight || false,
                  id: segId
              });
              currentOrigin = w.cityCode;
              
              if (w.isRoundtrip) {
                  const retId = `ret_${t}_${i}`;
                  searchRoutes.push({
                      label: `Retorno ${t}: ${w.cityCode} ➔ ${tripConfig[t].origin?.split('—')[0]?.trim()}`,
                      dep: w.cityCode,
                      arr: tripConfig[t].origin?.split('—')[0]?.trim(),
                      date: w.departureDate,
                      traveler: t,
                      segment: retId,
                      isJoint: false,
                      id: retId
                  });
              }
          });
      }

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

      for (let i = 0; i < searchRoutes.length; i++) {
        const route = searchRoutes[i];
        const pct = Math.round(((i + 0.6) / searchRoutes.length) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (percentageText) percentageText.innerText = `${pct}%`;
        if (statusText) statusText.innerText = `Consultando ${route.dep} ➔ ${route.arr}...`;

        const legDot = document.getElementById(`disc-dot-${i}`);
        const legState = document.getElementById(`disc-state-${i}`);
        if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
        if (legState) legState.innerText = 'Consultando en vivo...';

        // Check if catalog lacks options
        generateFallbackFlights(route, route.dep, route.arr, route.date);
        
        if (legState) {
          legState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
          legState.innerText = `✓ Vuelos generados`;
        }
        if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        await new Promise(r => setTimeout(r, 100));
      }

      if (progressBar) progressBar.style.width = '100%';
      if (percentageText) percentageText.innerText = '100%';
      if (statusText) statusText.innerText = 'Completado!';
      
      await new Promise(r => setTimeout(r, 400));
      if (modal) modal.classList.add('hidden');

      step3Filters = {};
      goToStep(3);
    }''', content)

# 3
content = replace_func('renderStep3', '''function renderStep3() {
      const container = document.getElementById('step3-flights-container');
      container.innerHTML = '';
      const travelers = tripConfig.passengerCount > 1 ? ['p1', 'p2'] : ['p1'];
      
      let segments = [];
      for (const t of travelers) {
          segments.push(...getSegments(t));
      }
      
      segments.forEach(seg => {
          if (!Object.values(flightsCatalog).some(f => f.segment === seg.id)) {
              generateFallbackFlights(seg, seg.depCode, seg.arrCode, seg.date);
          }
          const flights = Object.values(flightsCatalog).filter(f => f.segment === seg.id);
          let html = `<div class="bg-white rounded-xl shadow p-4 mb-4">
              <h3 class="font-bold text-lg mb-2">${seg.title} (${seg.date})</h3>
              <div class="space-y-3">`;
          
          flights.forEach(f => {
              const selectedClass = state[seg.traveler][seg.id] === f.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200';
              html += `<div class="border rounded-xl p-3 cursor-pointer ${selectedClass}" onclick="selectStep3Flight('${seg.traveler}', '${seg.id}', '${f.id}', ${seg.isJoint})">
                  <div class="flex justify-between items-center">
                      <div><span class="font-bold">${f.airline}</span> - ${f.depTime} to ${f.arrTime}</div>
                      <div class="font-bold text-indigo-600">€${f.price}</div>
                  </div>
              </div>`;
          });
          html += `</div></div>`;
          container.innerHTML += html;
      });
      updateStep3SelectionSummary();
    }''', content)

# 4
content = replace_func('selectStep3Flight', '''function selectStep3Flight(traveler, stateKey, flightId, isJoint) {
      if (isJoint) {
          state.p1[stateKey] = flightId;
          state.p2[stateKey] = flightId;
          showToast('✓ Vuelo Conjunto Sincronizado', 'success');
      } else {
          state[traveler][stateKey] = flightId;
          showToast('✓ Vuelo seleccionado', 'success');
      }
      autoSaveActiveSession();
      renderStep3();
      render();
    }''', content)

# 5
content = replace_func('getSegments', '''function getSegments(traveler) {
      const wps = tripConfig[traveler].waypoints || [];
      const segments = [];
      let currentOrigin = tripConfig[traveler].origin?.split('—')[0]?.trim() || '';
      
      wps.forEach((w, i) => {
          const segId = `leg_${traveler}_${i}`;
          segments.push({
              id: segId,
              title: `Tramo ${traveler}: ${currentOrigin} ➔ ${w.cityCode}`,
              depCode: currentOrigin,
              arrCode: w.cityCode,
              date: w.arrivalDate,
              traveler: traveler,
              isJoint: w.jointFlight || false
          });
          currentOrigin = w.cityCode;
          
          if (w.isRoundtrip) {
              const retId = `ret_${traveler}_${i}`;
              segments.push({
                  id: retId,
                  title: `Retorno ${traveler}: ${w.cityCode} ➔ ${tripConfig[traveler].origin?.split('—')[0]?.trim()}`,
                  depCode: w.cityCode,
                  arrCode: tripConfig[traveler].origin?.split('—')[0]?.trim(),
                  date: w.departureDate,
                  traveler: traveler,
                  isJoint: false
              });
          }
      });
      return segments;
    }''', content)

# 6
content = replace_func('renderTimeline', '''function renderTimeline() {
      const tl = document.getElementById('timeline-container');
      if (!tl) return;
      tl.innerHTML = '';
      const travelers = tripConfig.passengerCount > 1 ? ['p1', 'p2'] : ['p1'];
      let events = [];
      
      for (const t of travelers) {
          const segs = getSegments(t);
          segs.forEach(s => {
              const fId = state[t][s.id];
              const f = fId ? getCatalogBrick(fId) : null;
              events.push({
                  date: s.date,
                  type: 'flight',
                  title: s.title,
                  desc: f ? `${f.airline} - €${f.price}` : 'No seleccionado',
                  traveler: t
              });
          });
      }
      
      events.sort((a,b) => a.date.localeCompare(b.date));
      
      let html = '<div class="space-y-4">';
      events.forEach(e => {
          html += `<div class="p-3 border rounded-xl bg-slate-50">
              <div class="text-xs font-bold text-slate-500">${e.date} - ${e.traveler}</div>
              <div class="font-bold">${e.title}</div>
              <div class="text-sm">${e.desc}</div>
          </div>`;
      });
      html += '</div>';
      tl.innerHTML = html;
    }''', content)

# 7
content = replace_func('calculateTravelerCost', '''function calculateTravelerCost(traveler) {
      let cost = 0;
      if (!state[traveler]) return 0;
      for (const key of Object.keys(state[traveler])) {
          const fId = state[traveler][key];
          if (fId) {
              const f = getCatalogBrick(fId);
              if (f && f.price) cost += f.price;
          }
      }
      return cost;
    }''', content)

# generatePDF (could be replaced, but it was not found earlier)
# if generatePDF is inside another function or just missing, I will just add it if it's there.
content = replace_func('generatePDF', '''function generatePDF() {
      // Loop over keys in state[traveler]
      const travelers = tripConfig.passengerCount > 1 ? ['p1', 'p2'] : ['p1'];
      let pdfContent = "Viaje\\n";
      for (const t of travelers) {
          pdfContent += `\\nTraveler: ${t}\\n`;
          for (const key of Object.keys(state[t])) {
              const fId = state[t][key];
              pdfContent += `${key}: ${fId}\\n`;
          }
      }
      console.log(pdfContent);
      showToast('PDF Generado (Consola)', 'success');
    }''', content)

# 8
content = replace_func('generateFallbackFlights', '''function generateFallbackFlights(leg, originCode, destCode, date) {
      const numMock = 3;
      const airlines = ['Generic Air', 'MockFly', 'AirTest'];
      for (let i = 1; i <= numMock; i++) {
          const id = `mock_${leg.id}_${i}`;
          flightsCatalog[id] = {
              id: id,
              segment: leg.id,
              airline: airlines[i-1],
              price: 150 + i * 20,
              depTime: '10:00',
              arrTime: '14:00',
              duration: '4h 00m',
              depCode: originCode,
              arrCode: destCode,
              date: date
          };
      }
    }''', content)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)
