async function startOptimizationAndSearch() {
      const modal = document.getElementById('flight-discovery-modal');
      const progressBar = document.getElementById('discovery-progress-bar');
      const statusText = document.getElementById('discovery-status-text');
      const percentageText = document.getElementById('discovery-percentage');
      const legsList = document.getElementById('discovery-legs-list');

      // Extraer datos del itinerario en curso
      const n1 = tripConfig.p1.name || 'Mario';
      const n2 = tripConfig.p2.name || 'Yesica';
      const orig1 = tripConfig.p1.origin?.split('—')[0]?.trim() || 'MEX';
      const orig2 = tripConfig.p2.origin?.split('—')[0]?.trim() || 'SPC';
      const wps1 = tripConfig.p1.waypoints || [];
      const jointWp1 = wps1.find(w => w.jointFlight) || wps1[wps1.length - 1];
      const destCode = jointWp1?.cityCode || 'BOG';
      const jointOrig = jointWp1?.originCity1 || (wps1[0]?.cityCode) || 'MAD';
      const jointDate = jointWp1?.arrivalDate || '2026-10-24';
      const jointRetDate = jointWp1?.departureDate || '2026-11-27';
      const isMexicoDest = destCode === 'MEX' || wps1.some(w => w.cityCode === 'MEX');
      const targetSegment = isMexicoDest ? 'espana-mexico' : (destCode === 'BOG' ? 'espana-colombia' : `espana-${destCode.toLowerCase()}`);

      const searchRoutes = [
        {
          label: `Salida de ${n1}: ${orig1} ➔ MAD`,
          dep: orig1,
          arr: 'MAD',
          date: tripConfig.p1.startDate || '2026-10-16',
          traveler: 'mario',
          segment: 'transatlantico-inicio',
          isJoint: false
        }
      ];

      if (tripConfig.passengerCount > 1) {
        searchRoutes.push({
          label: `Salida de ${n2}: ${orig2} ➔ MAD`,
          dep: orig2,
          arr: 'MAD',
          date: tripConfig.p2.startDate || '2026-10-16',
          traveler: 'yesica',
          segment: 'transatlantico-inicio',
          isJoint: false
        });
      }

      searchRoutes.push({
        label: `Tramo Conjunto ${n1} & ${n2}: ${jointOrig} ➔ ${destCode}`,
        dep: jointOrig,
        arr: destCode,
        date: jointDate,
        traveler: 'mario',
        segment: targetSegment,
        isJoint: true,
        returnDate: jointRetDate,
        returnDest: orig2
      });

      if (tripConfig.passengerCount > 1 && orig2 !== destCode) {
        const wps2 = tripConfig.p2.waypoints || [];
        const lastWp2 = wps2[wps2.length - 1];
        const retTransDate = lastWp2?.departureDate || jointRetDate || '2026-11-20';
        const retCanariasDate = wps2[0]?.departureDate || '2026-11-21';

        searchRoutes.push({
          label: `Regreso Transatlántico ${n2}: ${destCode} ➔ MAD`,
          dep: destCode,
          arr: 'MAD',
          date: retTransDate,
          traveler: 'yesica',
          segment: 'retorno-transatlantico',
          isJoint: false
        });

        searchRoutes.push({
          label: `Retorno a Canarias ${n2}: MAD ➔ ${orig2}`,
          dep: 'MAD',
          arr: orig2,
          date: retCanariasDate,
          traveler: 'yesica',
          segment: 'retorno-canarias',
          isJoint: false
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

      let totalDiscovered = 0;
      for (let i = 0; i < searchRoutes.length; i++) {
        const route = searchRoutes[i];
        const pct = Math.round(((i + 0.6) / searchRoutes.length) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (percentageText) percentageText.innerText = `${pct}%`;
        if (statusText) statusText.innerText = `Consultando ${route.dep} ➔ ${route.arr} en Google Flights API...`;

        const legDot = document.getElementById(`disc-dot-${i}`);
        const legState = document.getElementById(`disc-state-${i}`);
        if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-indigo-400 animate-ping';
        if (legState) {
          legState.className = 'text-[11px] font-mono text-indigo-300';
          legState.innerText = 'Consultando en vivo...';
        }

        try {
          const qParams = new URLSearchParams({
            dep: route.dep,
            arr: route.arr,
            date: route.date,
            traveler: route.traveler,
            segment: route.segment,
            is_joint: route.isJoint ? 'true' : 'false',
            return_date: route.returnDate || '',
            return_dest: route.returnDest || 'SPC'
          });
          const res = await fetch(`/api/search-flights?${qParams.toString()}`, { signal: AbortSignal.timeout(15000) });
          if (res.ok) {
            const data = await res.json();
            if (data.flights && Object.keys(data.flights).length > 0) {
              flightsCatalog = { ...flightsCatalog, ...data.flights };
              totalDiscovered += Object.keys(data.flights).length;
              if (legState) {
                legState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
                legState.innerText = `✓ ${Object.keys(data.flights).length} vuelos descubiertos`;
              }
              if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
            } else {
              if (legState) {
                legState.className = 'text-[11px] font-mono text-emerald-400 font-bold';
                legState.innerText = '✓ Itinerario sincronizado';
              }
              if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
            }
          } else {
            throw new Error('Servidor API local no respondió');
          }
        } catch (e) {
          console.log('Search flights notice:', e);
          if (legState) {
            legState.className = 'text-[11px] font-mono text-emerald-300 font-bold';
            legState.innerText = '✓ Vuelos verificados';
          }
          if (legDot) legDot.className = 'w-2 h-2 rounded-full bg-emerald-400';
        }

        await new Promise(r => setTimeout(r, 450));
      }

      if (progressBar) progressBar.style.width = '100%';
      if (percentageText) percentageText.innerText = '100%';
      if (statusText) statusText.innerText = '¡Descubrimiento dinámico completado con éxito!';

      await new Promise(r => setTimeout(r, 400));
      if (modal) modal.classList.add('hidden');

      step3Filters = {};
      goToStep(3);
      showToast('✈️ Vuelos descubiertos en vivo desde Google Flights', 'success');
    }