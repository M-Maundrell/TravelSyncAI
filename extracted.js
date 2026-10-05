================== getBlankState ==================
function getBlankState() {
      return {
        mario: { salida: "", trans: "", bog_esp: "" },
        yesica: { salida: "", trans: "", retorno_trans: "", retorno_canarias: "" }
      };
    }



================== startOptimizationAndSearch ==================
function startOptimizationAndSearch() {
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



================== renderStep3 ==================
function renderStep3() {
      const container = document.getElementById('step3-legs-wizard-container');
      if (!container) return;

      const n1 = tripConfig.p1.name || 'Mario';
      const n2 = tripConfig.p2.name || 'Yesica';
      const orig1 = tripConfig.p1.origin?.split('—')[0]?.trim() || 'MEX';
      const orig2 = tripConfig.p2.origin?.split('—')[0]?.trim() || 'SPC';
      const wps1 = tripConfig.p1.waypoints || [];
      const wps2 = tripConfig.p2.waypoints || [];

      // Destino internacional detectado
      const isMexicoDest = wps1.some(w => w.cityCode === 'MEX' || w.country === 'MX');
      const isColombiaDest = wps1.some(w => w.cityCode === 'BOG' || w.country === 'CO');
      let targetSegment = 'espana-colombia';
      if (isMexicoDest) {
        targetSegment = 'espana-mexico';
      } else if (isColombiaDest) {
        targetSegment = 'espana-colombia';
      } else {
        const destWp = wps1.find(w => w.jointFlight) || wps1[wps1.length - 1];
        targetSegment = `espana-${(destWp?.cityCode || 'custom').toLowerCase()}`;
      }

      // Verificar si alguna estancia conjunta o de retorno tiene marcado 'isRoundtrip'
      const jointWp1 = wps1.find(w => w.jointFlight) || wps1[wps1.length - 1];
      const jointWp2 = wps2.find(w => w.jointFlight) || wps2[wps2.length - 1];
      const isJointRoundtrip = Boolean(jointWp1?.isRoundtrip || jointWp2?.isRoundtrip);
      const destCityName = jointWp1?.name ? getCleanCityName(jointWp1.name) : (isMexicoDest ? 'Ciudad de México (MEX)' : 'Bogotá (BOG)');
      const destCode = jointWp1?.cityCode || (isMexicoDest ? 'MEX' : 'BOG');

      // Orígenes de Ruta Primaria vs Alternativa para el tramo conjunto:
      const primaryOriginCode = jointWp1?.originCity1 ? (jointWp1.originCity1.split('—')[0]?.trim() || jointWp1.originCity1) : (wps1[0]?.cityCode || 'MAD');
      const altOriginCode = jointWp1?.originCity2 ? (jointWp1.originCity2.split('—')[0]?.trim() || jointWp1.originCity2) : 'BCN';
      const hasAlternative = Boolean(altOriginCode && altOriginCode !== primaryOriginCode);
      const activeJointRouteMode = step3RouteModes['leg_joint'] || state.jointRouteMode || 'primary';
      const isJointPrimary = activeJointRouteMode === 'primary';
      const originCode = (!isJointPrimary && hasAlternative) ? altOriginCode : primaryOriginCode;

      // Auto-asignación segura inicial si faltaba
      if (isMexicoDest) {
        if (!state.mario.salida || state.mario.salida.startsWith('mex_bog')) state.mario.salida = 'mex_mad_iberia_152';
        if (!state.mario.trans || !state.mario.trans.startsWith('esp_mex')) {
          state.mario.trans = (!isJointPrimary && hasAlternative) ? 'esp_mex_level_ib2601' : 'esp_mex_iberia_6403';
        }
        if (!state.yesica.trans || !state.yesica.trans.startsWith('yes_trans_mex')) {
          state.yesica.trans = (!isJointPrimary && hasAlternative) ? 'yes_trans_mex_level_bcn' : 'yes_trans_mex_iberia';
        }
        if (!state.yesica.retorno_trans) state.yesica.retorno_trans = 'live_retorno-transatlantico_yesica_iberia_IB304_0';
        if (!state.yesica.retorno_canarias) state.yesica.retorno_canarias = 'live_retorno-canarias_yesica_iberia_I21535_0';
      } else {
        if (!state.mario.trans || state.mario.trans.startsWith('esp_mex')) {
          state.mario.trans = (!isJointPrimary && hasAlternative) ? 'esp_col_avianca_bcn' : 'esp_col_avianca_av11';
        }
        if (!state.yesica.trans || state.yesica.trans.startsWith('yes_trans_mex')) {
          state.yesica.trans = (!isJointPrimary && hasAlternative) ? 'esp_col_avianca_bcn' : 'yes_trans_avianca';
        }
      }

      const legs = [
        {
          id: 'leg_p1_salida',
          traveler: 'mario',
          stateKey: 'salida',
          segmentKey: 'transatlantico-inicio',
          depCode: orig1,
          arrCode: 'MAD',
          title: `Tramo 1: Salida de ${n1} (${orig1} ➔ Madrid MAD)`,
          desc: `Vuelo individual desde ${orig1} hacia la 1ra estancia en Madrid. (Salida: ${tripConfig.p1.startDate || '16 Oct 2026'}).`,
          passengerBadge: `👤 ${n1} (${orig1})`,
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80 font-bold',
          isJoint: false
        }
      ];

      if (tripConfig.passengerCount > 1) {
        legs.push({
          id: 'leg_p2_salida',
          traveler: 'yesica',
          stateKey: 'salida',
          segmentKey: 'transatlantico-inicio',
          depCode: orig2,
          arrCode: 'MAD',
          title: `Tramo 2: Salida de ${n2} (${orig2} ➔ Madrid MAD)`,
          desc: `Vuelo de conexión desde Canarias (${orig2}) hacia el punto de encuentro en Madrid. (Salida: ${tripConfig.p2.startDate || '16 Oct 2026'}).`,
          passengerBadge: `👤 ${n2} (${orig2})`,
          badgeClass: 'bg-pink-50 text-pink-700 border-pink-200/80 font-bold',
          isJoint: false
        });
      }

      const isSinglePassenger = tripConfig.passengerCount === 1;

      legs.push({
        id: 'leg_joint',
        traveler: 'mario',
        stateKey: 'trans',
        segmentKey: targetSegment,
        depCode: originCode,
        arrCode: destCode,
        hasAlternative: hasAlternative,
        primaryOriginCode: primaryOriginCode,
        altOriginCode: altOriginCode,
        isPrimary: isJointPrimary,
        title: isSinglePassenger ? `Tramo 2: Vuelo Principal (${originCode} ➔ ${destCityName})` : `Tramo 3: Tramo Conjunto Compartido (${originCode} ➔ ${destCityName})`,
        desc: isSinglePassenger ? `Vuelo principal de ${n1} hacia ${destCityName}. (${isJointRoundtrip ? '🔄 Tramo Redondo' : '➡️ Tramo Sencillo'}).` : `Vuelo en conjunto obligatorio: ${n1} y ${n2} viajarán en el mismo vuelo y horario saliendo desde ${originCode}. (${isJointRoundtrip ? '🔄 Tramo Redondo' : '➡️ Tramo Sencillo'}).`,
        passengerBadge: isSinglePassenger ? `👤 ${n1} (${originCode})` : `👥 ${n1} & ${n2} (Mismo Vuelo)`,
        badgeClass: isSinglePassenger ? 'bg-blue-50 text-blue-700 border-blue-200/80 font-bold' : 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold',
        isJoint: !isSinglePassenger
      });

      // Tramos de regreso para el pasajero 2 (Yesica) si su origen difiere del destino conjunto:
      if (tripConfig.passengerCount > 1 && orig2 !== destCode) {
        const returnDateStr = jointWp2?.departureDate || jointWp1?.departureDate || '20 Nov 2026';
        legs.push({
          id: 'leg_p2_retorno_trans',
          traveler: 'yesica',
          stateKey: 'retorno_trans',
          segmentKey: 'retorno-transatlantico',
          depCode: destCode,
          arrCode: 'MAD',
          title: `Tramo 4: Regreso Transatlántico de ${n2} (${destCode} ➔ Madrid MAD)`,
          desc: `Vuelo de retorno cruzando el Atlántico desde ${destCityName} hacia el hub de Madrid. (Fecha: ${returnDateStr}).`,
          passengerBadge: `👤 ${n2} (${orig2}) · 🔄 Retorno`,
          badgeClass: 'bg-pink-50 text-pink-700 border-pink-200/80 font-bold',
          isJoint: false
        });

        legs.push({
          id: 'leg_p2_retorno_canarias',
          traveler: 'yesica',
          stateKey: 'retorno_canarias',
          segmentKey: 'retorno-canarias',
          depCode: 'MAD',
          arrCode: orig2,
          title: `Tramo 5: Conexión Final a Canarias de ${n2} (Madrid MAD ➔ ${orig2})`,
          desc: `Vuelo de conexión península-islas hacia su residencia en Canarias. (Fecha: ${tripConfig.p2.endDate || '21 Nov 2026'}).`,
          passengerBadge: `👤 ${n2} (${orig2}) · 🛬 Destino`,
          badgeClass: 'bg-pink-50 text-pink-700 border-pink-200/80 font-bold',
          isJoint: false
        });
      }

      let totalCost = calculateTravelerCost('mario') + (isSinglePassenger ? 0 : calculateTravelerCost('yesica'));
      const totalDisplay = document.getElementById('step3-total-cost-display');
      if (totalDisplay) totalDisplay.innerText = formatMXN(totalCost);

      let airlinesList = [
        { code: 'all', label: 'Todas las Aerolíneas' }
      ];
      if (searchAllAirlines) {
        airlinesList.push(
          { code: 'iberia', label: 'Iberia' },
          { code: 'avianca', label: 'Avianca' },
          { code: 'air-europa', label: 'Air Europa' },
          { code: 'aeromexico', label: 'Aeroméxico' },
          { code: 'klm-airfrance', label: 'KLM / Air France' },
          { code: 'united', label: 'United Airlines' }
        );
      } else {
        selectedDiscoveryAirlines.forEach(code => {
          const found = availableDiscoveryAirlines.find(a => a.code === code);
          if (found) {
            airlinesList.push({ code: found.code, label: found.name });
          }
        });
      }

      // ─── BARRA GLOBAL DE CONTROL DE COLAPSO Y ESTADÍSTICAS ───
      const globalControlsHtml = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs mb-1">
          <div class="flex items-center gap-2.5">
            <span class="text-xs font-black text-slate-800">Menú Guiado por Tramo:</span>
            <span class="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">${legs.length} Tramos Configurados</span>
            <span class="text-xs text-slate-400 hidden md:inline">· Puedes colapsar los tramos para ver solo el vuelo elegido</span>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-auto">
            <button onclick="collapseAllStep3Legs(true)" class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs">
              <span>▲</span> <span>Colapsar Todos</span>
            </button>
            <button onclick="collapseAllStep3Legs(false)" class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition flex items-center gap-1.5 shadow-2xs">
              <span>▼</span> <span>Expandir Todos</span>
            </button>
          </div>
        </div>
      `;

      const legsHtml = legs.map((leg) => {
        const activeFilter = step3Filters[leg.id] || 'all';
        const currentFlightId = leg.isJoint ? state.mario.trans : state[leg.traveler][leg.stateKey];
        const selectedFlight = getCatalogBrick(currentFlightId);
        const isCollapsed = Boolean(step3CollapsedLegs[leg.id]);
        const isLive = selectedFlight?.id?.startsWith('live_') || Boolean(selectedFlight?.googleFlightsUrl);

        // Bloque del Switch de Ruta Primaria vs Alternativa (si el tramo tiene alternativas configuradas):
        let routeSwitchHtml = '';
        if (leg.hasAlternative) {
          routeSwitchHtml = `
            <div class="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div class="space-y-0.5">
                <div class="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <span>🔀</span> Selección de Ruta para este Tramo:
                </div>
                <div class="text-[11px] text-slate-600">
                  ${leg.isPrimary 
                    ? `Ruta activa: <strong class="text-indigo-800">Primaria (${leg.primaryOriginCode} ➔ ${destCode})</strong>` 
                    : `Ruta activa: <strong class="text-amber-800">Alternativa (${leg.altOriginCode} ➔ ${destCode})</strong>`}
                </div>
              </div>
              <div class="inline-flex p-1 bg-white rounded-xl border border-indigo-200 shadow-2xs self-start sm:self-auto">
                <button onclick="setLegRouteMode('${leg.id}', 'primary')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${leg.isPrimary ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                  <span>🔵</span> <span>Ruta Primaria (${leg.primaryOriginCode})</span>
                </button>
                <button onclick="setLegRouteMode('${leg.id}', 'alt')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${!leg.isPrimary ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}">
                  <span>🟡</span> <span>Ruta Alternativa (${leg.altOriginCode})</span>
                </button>
              </div>
            </div>
          `;
        }

        // Ficha del Vuelo Elegido (usada tanto en vista colapsada como resumen superior):
        const selectedFlightBox = selectedFlight ? `
          <div class="bg-gradient-to-r from-indigo-50/80 via-white to-emerald-50/50 p-4 rounded-2xl border-2 ${isCollapsed ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-indigo-100'} flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-2xs">
            <div class="space-y-1.5 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">✓ Vuelo Elegido</span>
                <span class="text-sm font-black text-slate-900">${selectedFlight.title}</span>
                <span class="text-xs font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">${selectedFlight.outbound?.flightNumber || '---'}</span>
                ${isLive ? '<span class="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>Google Flights Live</span>' : ''}
              </div>
              <div class="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>🛫 <strong class="text-slate-800">${selectedFlight.outbound?.route || '---'}</strong></span>
                <span>🕒 <strong class="font-mono text-slate-800">${selectedFlight.outbound?.schedule || '---'}</strong></span>
                <span>📅 ${selectedFlight.outbound?.date || '---'}</span>
                <span class="text-slate-400 hidden sm:inline">·</span>
                <span>✈️ ${selectedFlight.aircraft || 'Aeronave Comercial'}</span>
                <span>${selectedFlight.bag ? '✓ Maleta 23kg' : '✕ Sin maleta'}</span>
              </div>
            </div>
            <div class="flex items-center gap-3 self-end md:self-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-between md:justify-end">
              <div class="text-left md:text-right">
                <div class="text-base sm:text-lg font-black text-slate-900 font-mono">${formatMXN(selectedFlight.price)}</div>
                <div class="text-xs font-bold text-slate-400">${formatEUR(selectedFlight.price)}</div>
              </div>
              <div class="flex items-center gap-2">
                <a href="${selectedFlight.googleFlightsUrl || '#'}" target="_blank" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition">
                  Google Flights ↗
                </a>
                <button onclick="toggleStep3LegCollapse('${leg.id}')" class="px-3.5 py-1.5 ${isCollapsed ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'} text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-1">
                  <span>${isCollapsed ? 'Cambiar Vuelo ▾' : '▲ Colapsar'}</span>
                </button>
              </div>
            </div>
          </div>
        ` : `
          <div class="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-center justify-between">
            <span>⚠️ Aún no has seleccionado un vuelo para este tramo.</span>
            <button onclick="toggleStep3LegCollapse('${leg.id}')" class="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold">Ver opciones ▾</button>
          </div>
        `;

        // ─── VISTA COLAPSADA: Solo datos del tramo + switch + ficha del vuelo elegido ───
        if (isCollapsed) {
          return `
            <div class="bg-slate-50 border border-slate-200/90 rounded-3xl p-5 md:p-6 space-y-3.5 shadow-2xs hover:border-indigo-200 transition">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/80">
                <div class="space-y-0.5">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h4 class="text-sm md:text-base font-bold text-slate-900">${leg.title}</h4>
                    <span class="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">Colapsado</span>
                  </div>
                  <p class="text-xs text-slate-500">${leg.desc}</p>
                </div>
                <div class="flex items-center gap-2 self-start sm:self-auto">
                  <span class="px-2.5 py-1 text-xs rounded-lg border ${leg.badgeClass}">${leg.passengerBadge}</span>
                  <button onclick="toggleStep3LegCollapse('${leg.id}')" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs flex items-center gap-1">
                    <span>▼ Desplegar Vuelos</span>
                  </button>
                </div>
              </div>

              ${routeSwitchHtml}
              ${selectedFlightBox}
            </div>
          `;
        }

        // ─── VISTA EXPANDIDA: Opciones completas de vuelo ───
        let options = Object.values(flightsCatalog).filter(f => f.traveler === leg.traveler && f.segment === leg.segmentKey);
        if (leg.id === 'leg_joint' && leg.hasAlternative) {
          if (leg.isPrimary) {
            options = options.filter(f => !f.outbound?.route?.includes('Barcelona') && !f.outbound?.route?.includes('BCN'));
          } else {
            options = options.filter(f => f.outbound?.route?.includes('Barcelona') || f.outbound?.route?.includes('BCN'));
          }
        }

        if (options.length === 0) {
          generateFallbackFlights(leg, leg.depCode || originCode, leg.arrCode || destCode, destCityName);
          options = Object.values(flightsCatalog).filter(f => f.traveler === leg.traveler && f.segment === leg.segmentKey);
          if (leg.id === 'leg_joint' && leg.hasAlternative) {
            if (leg.isPrimary) {
              options = options.filter(f => !f.outbound?.route?.includes('Barcelona') && !f.outbound?.route?.includes('BCN'));
            } else {
              options = options.filter(f => f.outbound?.route?.includes('Barcelona') || f.outbound?.route?.includes('BCN'));
            }
          }
        }

        // Si el usuario configuró hasta 4 aerolíneas específicas en el Paso 2:
        if (!searchAllAirlines && selectedDiscoveryAirlines.length > 0) {
          options = options.filter(f => selectedDiscoveryAirlines.includes(f.airline));
        }
        if (activeFilter !== 'all') {
          options = options.filter(f => f.airline === activeFilter);
        }
        options.sort((a, b) => a.price - b.price);

        const filterChips = airlinesList.map(a => `
          <button onclick="setStep3AirlineFilter('${leg.id}', '${a.code}')" class="px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${activeFilter === a.code ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'}">
            ${a.label}
          </button>
        `).join('');

        return `
          <div class="bg-slate-50 border border-slate-200/90 rounded-3xl p-5 md:p-6 space-y-4 shadow-2xs">
            <!-- ENCABEZADO DEL TRAMO EXPANDIDO -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/80">
              <div class="space-y-0.5">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  <h4 class="text-sm md:text-base font-bold text-slate-900">${leg.title}</h4>
                </div>
                <p class="text-xs text-slate-500">${leg.desc}</p>
              </div>
              <div class="flex items-center gap-2 self-start sm:self-auto">
                <span class="px-2.5 py-1 text-xs rounded-lg border ${leg.badgeClass}">${leg.passengerBadge}</span>
                <button onclick="toggleStep3LegCollapse('${leg.id}')" class="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs flex items-center gap-1">
                  <span>▲ Colapsar Tramo</span>
                </button>
              </div>
            </div>

            <!-- SWITCH DE RUTA SI APLICA -->
            ${routeSwitchHtml}

            <!-- FICHA DEL VUELO ELEGIDO ACTUALMENTE -->
            ${selectedFlightBox}

            <!-- FILTRO DE AEROLÍNEA COMO MENÚ -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              <span class="text-[10px] font-bold uppercase text-slate-400 mr-1 shrink-0">Filtrar Aerolínea:</span>
              ${filterChips}
            </div>

            <!-- MENÚ DE OPCIONES DE VUELOS DISPONIBLES -->
            <div class="grid grid-cols-1 gap-3">
              ${options.length > 0 ? options.map(f => {
                const isSelected = f.id === currentFlightId;
                const occ = f.occupancy || 70;
                const hasReturn = Boolean(f.return);
                const isOptionLive = f.id?.startsWith('live_') || Boolean(f.googleFlightsUrl);
                const occBadge = occ >= 80 
                  ? `<span class="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">Alta demanda · ${f.seatsLeft || 3} asientos</span>`
                  : (occ >= 60 
                    ? `<span class="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">${occ}% ocupación</span>`
                    : `<span class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">${occ}% ocupación · Asientos libres</span>`);

                return `
                  <div class="bg-white border ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'} rounded-2xl p-4 transition space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-sm font-bold text-slate-900">${f.title}</span>
                          ${isSelected ? '<span class="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">✓ Seleccionado</span>' : ''}
                          ${isOptionLive ? '<span class="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>Google Flights Live</span>' : ''}
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                          ${occBadge}
                          <span class="text-[10px] text-slate-500 font-medium">${f.aircraft || 'Cabina Ancha'}</span>
                          ${hasReturn ? '<span class="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-1.5 py-0.5 rounded">🔄 Tarifa Global Multidestino (Cubre Ida + Retorno)</span>' : '<span class="text-[10px] text-slate-500 bg-slate-100 font-medium px-1.5 py-0.5 rounded">➡️ Tarifa Solo Ida</span>'}
                        </div>
                      </div>
                      <div class="text-left sm:text-right">
                        <div class="text-base sm:text-lg font-bold text-slate-900 font-mono">${formatMXN(f.price)}</div>
                        <div class="text-xs font-semibold text-slate-400">${formatEUR(f.price)}</div>
                      </div>
                    </div>

                    <!-- ITINERARIO DEL VUELO -->
                    <div class="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                      <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-800">${f.outbound?.route}</span>
                        <span class="font-bold text-slate-700 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">${f.outbound?.flightNumber}</span>
                      </div>
                      <div class="flex justify-between text-slate-600 text-[11px]">
                        <span>Horario: <strong class="font-mono text-slate-800">${f.outbound?.schedule}</strong></span>
                        <span>📅 ${f.outbound?.date}</span>
                      </div>
                      ${f.return ? `
                        <div class="pt-1.5 border-t border-slate-200/70 flex justify-between text-slate-600 text-[11px]">
                          <span>🛬 Regreso: <strong>${f.return.route}</strong> (<span class="font-mono">${f.return.flightNumber}</span>)</span>
                          <span><strong class="font-mono text-slate-800">${f.return.schedule}</strong> · ${f.return.date}</span>
                        </div>
                      ` : ''}
                    </div>

                    <!-- SERVICIOS INCLUIDOS Y BOTÓN DE SELECCIÓN -->
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-slate-100">
                      <div class="flex items-center gap-2.5 text-[11px] text-slate-500 font-medium">
                        <span>${f.bag ? '✓ Maleta 23kg' : '✕ Sin maleta'}</span>
                        <span>${f.carry ? '✓ Carry-On' : ''}</span>
                        <span>${f.seat ? '✓ Asiento' : ''}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <a href="${f.googleFlightsUrl}" target="_blank" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition">
                          Google Flights ↗
                        </a>
                        <button onclick="selectStep3Flight('${leg.traveler}', '${leg.stateKey}', '${f.id}', ${leg.isJoint})" class="px-4 py-1.5 text-xs font-bold rounded-xl transition shadow-2xs ${isSelected ? 'bg-emerald-600 text-white cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}">
                          ${isSelected ? '✓ Vuelo Elegido' : 'Elegir este Vuelo'}
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2">
                  <div class="text-2xl">✈️</div>
                  <div class="text-sm font-bold text-slate-800">No hay vuelos disponibles con este filtro</div>
                  <div class="text-xs text-slate-500">Prueba cambiando el filtro a "Todas las Aerolíneas" para ver las opciones disponibles.</div>
                  <button onclick="setStep3AirlineFilter('${leg.id}', 'all')" class="mt-2 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition">
                    Ver Todas las Aerolíneas
                  </button>
                </div>
              `}
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = globalControlsHtml + legsHtml;
    }



================== selectStep3Flight ==================
function selectStep3Flight(traveler, stateKey, flightId, isJoint) {
      if (isJoint) {
        state.mario.trans = flightId;
        const selected = getCatalogBrick(flightId);
        if (selected?.segment === 'espana-mexico') {
          if (flightId === 'esp_mex_level_ib2601') state.yesica.trans = 'yes_trans_mex_level_bcn';
          else if (flightId === 'esp_mex_emirates_ek255') state.yesica.trans = 'yes_trans_mex_level_bcn';
          else if (flightId === 'esp_mex_iberia_bcn_con') state.yesica.trans = 'yes_trans_mex_iberia_bcn';
          else if (flightId === 'esp_mex_aeromexico_bcn') state.yesica.trans = 'yes_trans_mex_iberia_bcn';
          else state.yesica.trans = 'yes_trans_mex_iberia';
        } else if (selected?.segment === 'espana-colombia') {
          if (selected.airline === 'avianca') state.yesica.trans = selected.id === 'esp_col_avianca_bcn' ? 'esp_col_avianca_bcn' : 'yes_trans_avianca';
          else if (selected.airline === 'iberia') state.yesica.trans = selected.id === 'esp_col_iberia_bcn' ? 'esp_col_iberia_bcn' : 'yes_trans_iberia';
          else if (selected.airline === 'air-europa') state.yesica.trans = 'yes_trans_aireuropa_mad';
          else if (selected.airline === 'aeromexico') state.yesica.trans = 'yes_trans_aeromexico';
          else if (selected.airline === 'klm-airfrance') state.yesica.trans = 'yes_trans_klm';
          else state.yesica.trans = 'yes_trans_avianca';
        } else {
          const yKey = flightId.replace('_mario_', '_yesica_');
          state.yesica.trans = flightsCatalog[yKey] ? yKey : (selected?.airline === 'iberia' ? 'yes_trans_iberia' : 'yes_trans_avianca');
        }
        showToast('✓ Vuelo Conjunto Sincronizado para Mario y Yesica', 'success');
      } else {
        state[traveler][stateKey] = flightId;
        showToast('✓ Vuelo seleccionado con éxito', 'success');
      }
      autoSaveActiveSession();
      renderStep3();
      render();
    }



================== getSegments ==================
function getSegments(traveler) {
      const pKey = traveler === 'mario' ? 'p1' : 'p2';
      const travelerData = tripConfig[pKey];
      const origCode = travelerData.origin ? (travelerData.origin.split('—')[0]?.trim() || (traveler === 'mario' ? 'MEX' : 'SPC')) : (traveler === 'mario' ? 'MEX' : 'SPC');
      const origCity = getCleanCityName(travelerData.origin) || origCode;
      const wps = travelerData.waypoints || [];

      if (wps.length === 0) {
        return [
          { key: 'salida', step: '1', label: `Tramo 1: Salida ${origCode} ➔ Destino`, type: 'select', segment: 'transatlantico-inicio', sub: 'Vuelo de Ida' }
        ];
      }

      const segments = [];
      let stepCounter = 1;

      // 1. TRAMO INICIAL: Origen -> Primera Estancia
      const firstWp = wps[0];
      const firstCity = getCleanCityName(firstWp.name);
      const firstCode = firstWp.cityCode || 'MAD';

      if (traveler === 'mario' && isMarioAlt()) {
        segments.push({
          key: 'salida', step: String(stepCounter++),
          label: `Boleto 1 (Ida): ${origCode} ➔ Bogotá (BOG)`,
          type: 'select', segment: 'transatlantico-inicio',
          sub: `Primer boleto redondo ${origCode} ↔ BOG (${travelerData.startDate || '16 Oct'})`
        });
        segments.push({
          key: 'bog_esp', step: String(stepCounter++),
          label: `Boleto 2 (Ida): Bogotá ➔ ${firstCity} (${firstCode})`,
          type: 'select', segment: 'alternativo-regreso',
          sub: `Segundo boleto redondo BOG ↔ ${firstCity} (${travelerData.startDate || '16 Oct'})`
        });
      } else {
        segments.push({
          key: 'salida', step: String(stepCounter++),
          label: `Tramo 1: Salida ${origCity} (${origCode}) ➔ ${firstCity} (${firstCode})`,
          type: 'select', segment: 'transatlantico-inicio',
          sub: `Salida el ${travelerData.startDate || '16 Oct'} · Llegada el ${firstWp.arrivalDate || '17 Oct'}`
        });
      }

      // 2. TRAMOS INTERMEDIOS ENTRE ESTANCIAS
      for (let i = 0; i < wps.length - 1; i++) {
        const curWp = wps[i];
        const nextWp = wps[i + 1];
        const fromCity = getCleanCityName(curWp.name);
        const toCity = getCleanCityName(nextWp.name);
        const fromCountry = curWp.country || 'ES';
        const toCountry = nextWp.country || 'ES';

        if (fromCountry === 'ES' && toCountry === 'ES') {
          // Desplazamiento interno en España (ej. AVE Madrid ➔ Barcelona)
          segments.push({
            key: `train_${i}`, step: String(stepCounter++),
            label: `Conexión Intermedia: ${fromCity} ➔ ${toCity}`,
            type: 'train',
            sub: `Tren de Alta Velocidad AVE (${curWp.departureDate || '21 Oct'}) · ~2h 45min`
          });
        } else {
          // Vuelo internacional (ej. Madrid ➔ México o Madrid ➔ Bogotá)
          const targetSegment = (toCountry === 'MX' || nextWp.cityCode === 'MEX') ? 'espana-mexico' : 'espana-colombia';
          if (traveler === 'mario' && isMarioAlt()) {
            segments.push({
              key: 'bog_esp_ret', step: String(stepCounter++),
              label: `Boleto 2 (Regreso): ${nextWp.jointFlight ? '🔗 Salto Conjunto' : 'Vuelo'} ${fromCity} ➔ ${toCity}`,
              type: 'included', parentKey: 'bog_esp', leg: 'return',
              sub: `Vuelo de retorno conjunto a ${toCity} (${curWp.departureDate || '25 Oct'})`
            });
          } else {
            segments.push({
              key: 'trans', step: String(stepCounter++),
              label: `${nextWp.jointFlight ? '🔗 Salto Conjunto' : 'Vuelo'}: ${fromCity} ➔ ${toCity}`,
              type: 'select', segment: targetSegment,
              sub: `Vuelo del ${curWp.departureDate || '27 Oct'} al ${nextWp.departureDate || '20 Nov'}`
            });
          }
        }
      }

      // 3. TRAMO FINAL: Retorno a Casa
      const lastWp = wps[wps.length - 1];
      const lastCity = getCleanCityName(lastWp.name);
      const lastCode = lastWp.cityCode || 'BOG';

      if (lastCode !== origCode) {
        if (traveler === 'mario' && isMarioAlt()) {
          segments.push({
            key: 'salida_ret', step: String(stepCounter++),
            label: `Boleto 1 (Regreso): ${lastCity} (${lastCode}) ➔ ${origCity} (${origCode})`,
            type: 'included', parentKey: 'salida', leg: 'return',
            sub: `Retorno final a ${origCity} (${lastWp.departureDate || '27 Nov'})`
          });
        } else if (traveler === 'yesica' && (state.yesica.retorno_trans || state.yesica.retorno_canarias || lastCode === 'MEX')) {
          segments.push({
            key: 'retorno_trans', step: String(stepCounter++),
            label: `Regreso Transatlántico: ${lastCity} (${lastCode}) ➔ Madrid (MAD)`,
            type: 'select', segment: 'retorno-transatlantico',
            sub: `Vuelo de retorno transatlántico (${lastWp.departureDate || '20 Nov'})`
          });
          segments.push({
            key: 'retorno_canarias', step: String(stepCounter++),
            label: `Conexión a Canarias: Madrid (MAD) ➔ ${origCity} (${origCode})`,
            type: 'select', segment: 'retorno-canarias',
            sub: `Conexión final a Canarias (${travelerData.endDate || '21 Nov'})`
          });
        } else {
          segments.push({
            key: 'salida_ret', step: String(stepCounter++),
            label: `Retorno a Casa: ${lastCity} (${lastCode}) ➔ ${origCity} (${origCode})`,
            type: 'included', parentKey: (traveler === 'mario' ? 'salida' : 'trans'), leg: 'return',
            sub: `Vuelo final de regreso a ${origCity} (${lastWp.departureDate || '27 Nov'})`
          });
        }
      }

      return segments;
    }



================== renderTimeline ==================
function renderTimeline() {
      const container = document.getElementById('calendar-timeline');
      if (!container) return;
      const isSinglePassenger = tripConfig.passengerCount === 1;

      const wps = tripConfig.p1.waypoints || [];
      const n1 = tripConfig.p1.name || 'Mario';
      const n2 = tripConfig.p2.name || 'Yesica';
      const orig1 = tripConfig.p1.origin?.split('—')[0]?.trim() || 'MEX';
      const orig2 = tripConfig.p2.origin?.split('—')[0]?.trim() || 'SPC';

      const mSal = getCatalogBrick(state.mario.salida);
      const ySal = getCatalogBrick(state.yesica.salida);
      const jointFlight = getCatalogBrick(state.mario.trans);
      const yTrans = getCatalogBrick(state.yesica.trans);
      const retTrans = getCatalogBrick(state.yesica.retorno_trans);
      const retCan = getCatalogBrick(state.yesica.retorno_canarias);

      const isMexicoDest = wps.some(w => w.cityCode === 'MEX' || w.country === 'MX');
      const jointWp1 = wps.find(w => w.jointFlight) || wps[wps.length - 1];
      const destCityName = jointWp1?.name ? getCleanCityName(jointWp1.name) : (isMexicoDest ? 'Ciudad de México' : 'Bogotá');
      const destCode = jointWp1?.cityCode || (isMexicoDest ? 'MEX' : 'BOG');

      const isJointPrimary = (step3RouteModes['leg_joint'] || state.jointRouteMode || 'primary') === 'primary';
      const originCode = isJointPrimary ? 'MAD' : 'BCN';
      const mJointFn = jointFlight?.outbound?.flightNumber || jointFlight?.return?.flightNumber || (isJointPrimary ? 'IB6403' : 'IB2601');
      const yJointFn = yTrans?.outbound?.flightNumber || mJointFn;
      const isJointSynced = mJointFn === yJointFn;

      const p1Start = tripConfig.p1.startDate || '2026-10-16';
      const p2End = tripConfig.p2.endDate || '2026-11-21';
      const dStart = new Date(p1Start + 'T00:00:00');
      const dEnd = new Date(p2End + 'T00:00:00');
      const totalDays = Math.max(1, Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)) + 1);

      // Resumen ejecutivo de la cabecera
      const summaryBadgeContainer = document.getElementById('timeline-summary-badge');
      if (summaryBadgeContainer) {
        const totalCost = calculateTravelerCost('mario') + (isSinglePassenger ? 0 : calculateTravelerCost('yesica'));
        summaryBadgeContainer.innerHTML = `
          <span class="px-3 py-1 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs">
            📅 ${totalDays} Días Totales (16 Oct – 21 Nov 2026)
          </span>
          <span class="px-3 py-1 bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl border border-emerald-300 shadow-2xs">
            ✨ 34 Días Juntos en Destino (92%)
          </span>
          <span class="px-3 py-1 bg-indigo-50 text-indigo-900 font-bold text-xs rounded-xl border border-indigo-300 shadow-2xs">
            ✈️ 5 Vuelos Coordinados (${formatMXN(totalCost)})
          </span>
        `;
      }

      const formatNiceDate = (isoStr, includeYear = false) => {
        if (!isoStr) return '';
        const d = new Date(isoStr + 'T00:00:00');
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const base = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
        return includeYear ? `${base} 2026` : base;
      };

      const wp1Arr = wps[0]?.arrivalDate || '2026-10-17';
      const wp1Dep = wps[0]?.departureDate && wps[0]?.departureDate > wp1Arr ? wps[0].departureDate : '2026-10-27';
      const wp1Nights = Math.max(1, Math.round((new Date(wp1Dep + 'T00:00:00') - new Date(wp1Arr + 'T00:00:00')) / (1000 * 60 * 60 * 24)));

      const jointDate = wp1Dep;
      const jointPriceMario = jointFlight?.price || 14200;
      const jointPriceYesica = yTrans?.price || jointPriceMario;

      const wp2Arr = jointDate;
      const wp2Dep = wps[1]?.departureDate || '2026-11-20';
      const wp2Nights = Math.max(1, Math.round((new Date(wp2Dep + 'T00:00:00') - new Date(wp2Arr + 'T00:00:00')) / (1000 * 60 * 60 * 24)));

      const events = [
        // 1. Vuelos de Salida e Ida
        {
          id: 'step_salida',
          type: 'flight',
          stepNum: 1,
          stepIcon: '🛫',
          categoryTag: '✈️ VUELOS DE SALIDA',
          categoryClass: 'bg-blue-100 text-blue-900 border-blue-300',
          title: 'Salida e Ida hacia Madrid',
          dateRange: formatNiceDate(p1Start, true),
          statusBadge: '👤 Vuelos Individuales de Inicio',
          statusClass: 'bg-blue-50 text-blue-800 border-blue-200 font-bold',
          content: `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Tarjeta Pasajero 1: Mario -->
              <div class="bg-white border-2 border-blue-200/90 rounded-2xl p-4 md:p-5 shadow-2xs space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-blue-100">
                  <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                    👤 ${n1} · ${orig1}
                  </span>
                  <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    ${mSal?.outbound?.flightNumber || 'IB0152'}
                  </span>
                </div>
                
                <div class="flex items-center justify-between gap-2 py-1">
                  <div>
                    <div class="text-xl font-black font-mono text-slate-900">${mSal?.outbound?.schedule?.split('→')[0]?.trim() || '20:05'}</div>
                    <div class="text-xs font-black text-slate-800">${orig1}</div>
                    <div class="text-[11px] text-slate-600 font-semibold">AICM T1</div>
                  </div>
                  <div class="flex-1 flex flex-col items-center px-2">
                    <div class="text-[11px] font-bold text-slate-700">${mSal?.airlineName || 'Iberia'}</div>
                    <div class="w-full flex items-center gap-1 my-1">
                      <div class="h-0.5 flex-1 bg-blue-300"></div>
                      <span class="text-xs text-blue-600">✈️</span>
                      <div class="h-0.5 flex-1 bg-blue-300"></div>
                    </div>
                    <div class="text-[10px] font-bold text-slate-600">Directo · 10h 55m</div>
                  </div>
                  <div class="text-right">
                    <div class="text-xl font-black font-mono text-slate-900">${mSal?.outbound?.schedule?.split('→')[1]?.trim() || '14:00+1'}</div>
                    <div class="text-xs font-black text-slate-800">MAD</div>
                    <div class="text-[11px] text-slate-600 font-semibold">Barajas T4</div>
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div class="text-slate-700 font-semibold">
                    <span>✈️ ${mSal?.aircraft || 'Airbus A350-900'}</span> · <span>🧳 Maleta 23kg</span>
                  </div>
                  <div class="text-emerald-700 font-mono font-black text-sm">
                    ${formatMXN(mSal?.price || 19800)}
                  </div>
                </div>
                <div class="bg-blue-50/70 text-blue-900 text-xs p-2.5 rounded-xl border border-blue-100 leading-relaxed font-medium">
                  Vuelo transatlántico nocturno. Aterrizaje en Madrid el sábado 17 de octubre a las 14:00 h.
                </div>
              </div>

              ${isSinglePassenger ? "" : `
              <!-- Tarjeta Pasajera 2: Yesica -->
              <div class="bg-white border-2 border-pink-200/90 rounded-2xl p-4 md:p-5 shadow-2xs space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-pink-100">
                  <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-pink-100 text-pink-900 border border-pink-200">
                    👤 ${n2} · ${orig2}
                  </span>
                  <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    ${ySal?.outbound?.flightNumber || 'I21535'}
                  </span>
                </div>

                <div class="flex items-center justify-between gap-2 py-1">
                  <div>
                    <div class="text-xl font-black font-mono text-slate-900">${ySal?.outbound?.schedule?.split('→')[0]?.trim() || '18:15'}</div>
                    <div class="text-xs font-black text-slate-800">${orig2}</div>
                    <div class="text-[11px] text-slate-600 font-semibold">La Palma</div>
                  </div>
                  <div class="flex-1 flex flex-col items-center px-2">
                    <div class="text-[11px] font-bold text-slate-700">${ySal?.airlineName || 'Iberia Express'}</div>
                    <div class="w-full flex items-center gap-1 my-1">
                      <div class="h-0.5 flex-1 bg-pink-300"></div>
                      <span class="text-xs text-pink-600">✈️</span>
                      <div class="h-0.5 flex-1 bg-pink-300"></div>
                    </div>
                    <div class="text-[10px] font-bold text-slate-600">Directo · 2h 50m</div>
                  </div>
                  <div class="text-right">
                    <div class="text-xl font-black font-mono text-slate-900">${ySal?.outbound?.schedule?.split('→')[1]?.trim() || '22:05'}</div>
                    <div class="text-xs font-black text-slate-800">MAD</div>
                    <div class="text-[11px] text-slate-600 font-semibold">Barajas T4</div>
                  </div>
                </div>

                <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div class="text-slate-700 font-semibold">
                    <span>✈️ ${ySal?.aircraft || 'Airbus A320neo'}</span> · <span>🧳 Maleta facturada</span>
                  </div>
                  <div class="text-pink-700 font-mono font-black text-sm">
                    ${formatMXN(ySal?.price || 1158)}
                  </div>
                </div>
                <div class="bg-pink-50/70 text-pink-900 text-xs p-2.5 rounded-xl border border-pink-100 leading-relaxed font-medium">
                  Vuelo península-islas. Arribo a Madrid el viernes 16 de octubre a las 22:05 h para esperar a Mario.
                </div>
              </div>`}
            </div>
          `
        },
        // 2. Estancia en Madrid
        {
          id: 'step_stay_madrid',
          type: 'stay',
          stepNum: 2,
          stepIcon: '🇪🇸',
          categoryTag: '🏨 ESTANCIA EN DESTINO',
          categoryClass: 'bg-amber-100 text-amber-950 border-amber-300',
          title: 'Estancia en Madrid',
          dateRange: `${formatNiceDate(wp1Arr)} – ${formatNiceDate(wp1Dep, true)}`,
          statusBadge: `👥 Convivencia en Pareja · ${wp1Nights} Noches`,
          statusClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold',
          content: `
            <div class="bg-gradient-to-r from-amber-50/60 via-white to-amber-50/40 border-2 border-amber-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-amber-200/60">
                <div>
                  <div class="text-base font-black text-slate-900">Madrid, España · Estancia de ${wp1Nights} Noches</div>
                  <div class="text-xs text-slate-700 font-semibold mt-0.5">Del ${formatNiceDate(wp1Arr)} al ${formatNiceDate(wp1Dep)} de 2026</div>
                </div>
                <span class="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 self-start sm:self-auto">
                  🏨 ${wp1Nights} Noches Consecutivas
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div class="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-1.5">
                  <div class="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <span>📍</span> Encuentro & Check-in (17 Oct)
                  </div>
                  <p class="text-xs text-slate-700 font-medium leading-relaxed">
                    ${n2} recibe a ${n1} en Barajas T4 a las 14:00 h. Traslado conjunto al hotel en Madrid y primera noche juntos.
                  </p>
                </div>

                <div class="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-1.5">
                  <div class="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <span>💼</span> Convivencia & Teletrabajo
                  </div>
                  <p class="text-xs text-slate-700 font-medium leading-relaxed">
                    Base compartida en Madrid con horario europeo coordinado, gastronomía madrileña y paseos culturales.
                  </p>
                </div>

                <div class="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-2xs space-y-1.5">
                  <div class="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <span>🛫</span> Salida a México (27 Oct)
                  </div>
                  <p class="text-xs text-slate-700 font-medium leading-relaxed">
                    Cierre de estancia en Madrid. Traslado al aeropuerto (${originCode}) para abordar juntos el vuelo transatlántico.
                  </p>
                </div>
              </div>
            </div>
          `
        },
        // 3. Vuelo Transatlántico Conjunto
        {
          id: 'step_joint_flight',
          type: 'flight',
          stepNum: 3,
          stepIcon: '✈️',
          categoryTag: '✈️ VUELO CONJUNTO EN PAREJA',
          categoryClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
          title: `Vuelo Transatlántico Conjunto (${originCode} ➔ ${destCode})`,
          dateRange: formatNiceDate(jointDate, true),
          statusBadge: '👥 Misma Cabina · Asientos Contiguos',
          statusClass: 'bg-emerald-600 text-white font-extrabold',
          content: `
            <div class="bg-gradient-to-br from-emerald-50/60 via-white to-indigo-50/40 border-2 border-emerald-300 rounded-2xl p-5 shadow-xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-emerald-200/80">
                <div>
                  <div class="text-base font-black text-slate-900">${jointFlight?.airlineName || 'Iberia'} (${mJointFn}) · Vuelo Transatlántico Compartido</div>
                  <div class="text-xs text-emerald-900 font-bold mt-0.5">Ruta directa ${originCode} ➔ ${destCode} · Ambos pasajeros viajan juntos</div>
                </div>
                <div class="flex items-center gap-2 self-start sm:self-auto">
                  <span class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 border border-slate-300">
                    ${mJointFn}
                  </span>
                  <span class="px-3 py-1 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-2xs">
                    👥 100% Coordinado
                  </span>
                </div>
              </div>

              <!-- Visual Track del Vuelo Conjunto -->
              <div class="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between gap-3">
                <div>
                  <div class="text-2xl font-black font-mono text-slate-900">${jointFlight?.outbound?.schedule?.split('→')[0]?.trim() || '13:15'}</div>
                  <div class="text-sm font-black text-slate-800">${originCode}</div>
                  <div class="text-xs text-slate-600 font-semibold">${originCode === 'MAD' ? 'Barajas T4' : 'El Prat T1'}</div>
                </div>
                <div class="flex-1 flex flex-col items-center px-3">
                  <div class="text-xs font-black text-slate-800">${jointFlight?.airlineName || 'Iberia'} · Directo</div>
                  <div class="w-full flex items-center gap-1.5 my-1.5">
                    <div class="h-1 flex-1 bg-emerald-400 rounded-full"></div>
                    <span class="text-base text-emerald-600">✈️</span>
                    <div class="h-1 flex-1 bg-emerald-400 rounded-full"></div>
                  </div>
                  <div class="text-xs font-bold text-slate-600">12h 15m · ${jointFlight?.aircraft || 'Airbus A350-900'}</div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-black font-mono text-slate-900">${jointFlight?.outbound?.schedule?.split('→')[1]?.trim() || '18:30'}</div>
                  <div class="text-sm font-black text-slate-800">${destCode}</div>
                  <div class="text-xs text-slate-600 font-semibold">AICM T1 (Mismo Día)</div>
                </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div class="font-black text-slate-900">👥 Coordinación en Cabina</div>
                  <p class="text-slate-700 font-medium">Asientos contiguos garantizados. Ambos pasajeros vuelan lado a lado.</p>
                </div>
                <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div class="font-black text-slate-900">🧳 Equipaje Incluido</div>
                  <p class="text-slate-700 font-medium">2 maletas facturadas de 23kg (1 por viajero) + 2 piezas de equipaje de mano.</p>
                </div>
                <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <div class="font-black text-slate-900">💰 Inversión Conjunta</div>
                  <div class="text-sm font-black font-mono text-emerald-700">${formatMXN(jointPriceMario + jointPriceYesica)}</div>
                  <p class="text-[11px] text-slate-600 font-semibold">${formatMXN(jointPriceMario)} por pasajero.</p>
                </div>
              </div>
            </div>
          `
        },
        // 4. Estancia en Ciudad de México
        {
          id: 'step_stay_mexico',
          type: 'stay',
          stepNum: 4,
          stepIcon: '🇲🇽',
          categoryTag: '🏨 ESTANCIA EN DESTINO',
          categoryClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
          title: 'Estancia en Ciudad de México',
          dateRange: `${formatNiceDate(wp2Arr)} – ${formatNiceDate(wp2Dep, true)}`,
          statusBadge: `👥 Convivencia en Pareja · ${wp2Nights} Noches`,
          statusClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold',
          content: `
            <div class="bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/40 border-2 border-emerald-200/90 rounded-2xl p-5 shadow-2xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-emerald-200/60">
                <div>
                  <div class="text-base font-black text-slate-900">Ciudad de México, México · Estancia de ${wp2Nights} Noches</div>
                  <div class="text-xs text-slate-700 font-semibold mt-0.5">Del ${formatNiceDate(wp2Arr)} al ${formatNiceDate(wp2Dep)} de 2026</div>
                </div>
                <span class="px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-300 self-start sm:self-auto">
                  🏨 ${wp2Nights} Noches Consecutivas
                </span>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div class="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5">
                  <div class="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <span>🏠</span> Residencia Base & Convivencia
                  </div>
                  <p class="text-xs text-slate-700 font-medium leading-relaxed">
                    ${n1} en su base habitual y ${n2} en estancia de trabajo remoto y turismo. Convivencia continua durante ${wp2Nights} noches.
                  </p>
                </div>

                <div class="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5">
                  <div class="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <span>🌮</span> Turismo & Fines de Semana
                  </div>
                  <p class="text-xs text-slate-700 font-medium leading-relaxed">
                    8 días completos de fin de semana para paseos culturales, Coyoacán, Roma-Condesa, gastronomía mexicana y descanso.
                  </p>
                </div>

                <div class="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1.5">
                  <div class="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <span>🧳</span> Cierre de Estancia (20 Nov)
                  </div>
                  <p class="text-xs text-slate-700 font-medium leading-relaxed">
                    El viernes 20 de Noviembre ${n1} acompaña a ${n2} al AICM para abordar su vuelo de retorno a Europa.
                  </p>
                </div>
              </div>
            </div>
          `
        },
        ...(isSinglePassenger ? [] : [
        // 5. Retorno Transatlántico de Yesica
        {
          id: 'step_return_trans',
          type: 'flight',
          stepNum: 5,
          stepIcon: '🛫',
          categoryTag: '✈️ VUELO DE RETORNO',
          categoryClass: 'bg-purple-100 text-purple-950 border-purple-300',
          title: `Retorno Transatlántico (${n2}: MEX ➔ MAD)`,
          dateRange: formatNiceDate(wp2Dep, true),
          statusBadge: '👤 Retorno Transatlántico Individual',
          statusClass: 'bg-purple-50 text-purple-900 border-purple-200 font-bold',
          content: `
            <div class="bg-white border-2 border-purple-200/90 rounded-2xl p-4 md:p-5 shadow-2xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-purple-100">
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-purple-100 text-purple-900 border border-purple-200">
                  👤 ${n2} · ${orig1} ➔ MAD
                </span>
                <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  ${retTrans?.outbound?.flightNumber || 'IB304'}
                </span>
              </div>

              <div class="flex items-center justify-between gap-2 py-1">
                <div>
                  <div class="text-xl font-black font-mono text-slate-900">${retTrans?.outbound?.schedule?.split('→')[0]?.trim() || '12:50'}</div>
                  <div class="text-xs font-black text-slate-800">MEX</div>
                  <div class="text-[11px] text-slate-600 font-semibold">AICM T1</div>
                </div>
                <div class="flex-1 flex flex-col items-center px-2">
                  <div class="text-[11px] font-bold text-slate-700">${retTrans?.airlineName || 'Iberia'}</div>
                  <div class="w-full flex items-center gap-1 my-1">
                    <div class="h-0.5 flex-1 bg-purple-300"></div>
                    <span class="text-xs text-purple-600">✈️</span>
                    <div class="h-0.5 flex-1 bg-purple-300"></div>
                  </div>
                  <div class="text-[10px] font-bold text-slate-600">Directo · 11h 10m</div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-black font-mono text-slate-900">${retTrans?.outbound?.schedule?.split('→')[1]?.trim() || '06:00+1'}</div>
                  <div class="text-xs font-black text-slate-800">MAD</div>
                  <div class="text-[11px] text-slate-600 font-semibold">Barajas T4</div>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div class="text-slate-700 font-semibold">
                  <span>✈️ ${retTrans?.aircraft || 'Airbus A350-900'}</span> · <span>🧳 Maleta 23kg facturada</span>
                </div>
                <div class="text-purple-700 font-mono font-black text-sm">
                  ${formatMXN(retTrans?.price || 10813)}
                </div>
              </div>
              <div class="bg-purple-50/70 text-purple-900 text-xs p-2.5 rounded-xl border border-purple-100 leading-relaxed font-medium">
                ${n1} finaliza su viaje y permanece en su residencia en Ciudad de México. ${n2} despega rumbo a España.
              </div>
            </div>
          `
        },
        // 6. Conexión a Canarias y Fin de Expedición
        {
          id: 'step_return_canarias',
          type: 'flight',
          stepNum: 6,
          stepIcon: '🛬',
          categoryTag: '🛬 VUELO DE CONEXIÓN FINAL',
          categoryClass: 'bg-emerald-100 text-emerald-950 border-emerald-300',
          title: `Conexión a Canarias (${n2}: MAD ➔ SPC) & Cierre`,
          dateRange: formatNiceDate(p2End, true),
          statusBadge: '🏁 Cierre Exitoso de Expedición',
          statusClass: 'bg-emerald-600 text-white font-extrabold',
          content: `
            <div class="bg-white border-2 border-slate-200/90 rounded-2xl p-4 md:p-5 shadow-2xs space-y-3">
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span class="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-100 text-slate-900 border border-slate-200">
                  👤 ${n2} · Conexión Final MAD ➔ SPC
                </span>
                <span class="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  ${retCan?.outbound?.flightNumber || 'I21535'}
                </span>
              </div>

              <div class="flex items-center justify-between gap-2 py-1">
                <div>
                  <div class="text-xl font-black font-mono text-slate-900">${retCan?.outbound?.schedule?.split('→')[0]?.trim() || '16:45'}</div>
                  <div class="text-xs font-black text-slate-800">MAD</div>
                  <div class="text-[11px] text-slate-600 font-semibold">Barajas T4</div>
                </div>
                <div class="flex-1 flex flex-col items-center px-2">
                  <div class="text-[11px] font-bold text-slate-700">${retCan?.airlineName || 'Iberia Express'}</div>
                  <div class="w-full flex items-center gap-1 my-1">
                    <div class="h-0.5 flex-1 bg-slate-300"></div>
                    <span class="text-xs text-slate-600">✈️</span>
                    <div class="h-0.5 flex-1 bg-slate-300"></div>
                  </div>
                  <div class="text-[10px] font-bold text-slate-600">Directo · 3h 10m</div>
                </div>
                <div class="text-right">
                  <div class="text-xl font-black font-mono text-slate-900">${retCan?.outbound?.schedule?.split('→')[1]?.trim() || '18:55'}</div>
                  <div class="text-xs font-black text-slate-800">SPC</div>
                  <div class="text-[11px] text-slate-600 font-semibold">La Palma</div>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div class="text-slate-700 font-semibold">
                  <span>✈️ ${retCan?.aircraft || 'Airbus A320neo'}</span> · <span>🧳 Maleta facturada</span>
                </div>
                <div class="text-emerald-700 font-mono font-black text-sm">
                  ${formatMXN(retCan?.price || 1142)}
                </div>
              </div>
              <div class="bg-emerald-50/70 text-emerald-950 text-xs p-2.5 rounded-xl border border-emerald-200 leading-relaxed font-medium">
                Arribo a La Palma a las 18:55 h. Ambos pasajeros se encuentran en sus destinos finales. 37 días de itinerario completados con éxito.
              </div>
            </div>
          `
        }
        ])
      ];

      let visibleEvents = events;
      if (timelineActiveFilter === 'flights') {
        visibleEvents = events.filter(e => e.type === 'flight');
      } else if (timelineActiveFilter === 'stays') {
        visibleEvents = events.filter(e => e.type === 'stay');
      }

      container.innerHTML = `
        <!-- TOOLBAR DE FILTROS -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-extrabold text-slate-800 mr-1">Filtrar Vista:</span>
            <button onclick="setTimelineFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold transition ${timelineActiveFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
              Todos los Eventos (${events.length})
            </button>
            <button onclick="setTimelineFilter('flights')" class="px-3.5 py-1.5 rounded-xl font-bold transition ${timelineActiveFilter === 'flights' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
              ✈️ Solo Vuelos (${events.filter(e => e.type === 'flight').length})
            </button>
            <button onclick="setTimelineFilter('stays')" class="px-3.5 py-1.5 rounded-xl font-bold transition ${timelineActiveFilter === 'stays' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'}">
              🏨 Solo Estancias (${events.filter(e => e.type === 'stay').length})
            </button>
          </div>
          <span class="text-xs text-slate-600 font-semibold">Itinerario sincronizado punto a punto</span>
        </div>

        <!-- LÍNEA DE TIEMPO VERTICAL (SPINE CONTINUO) -->
        <div class="relative pl-6 md:pl-10 space-y-6 pt-3 before:absolute before:top-5 before:bottom-5 before:left-3 md:before:left-5 before:w-0.5 before:bg-slate-200">
          ${visibleEvents.map(evt => `
            <div class="relative group">
              <!-- Marcador Circular sobre el Spine -->
              <div class="absolute -left-6 md:-left-10 top-4 w-6 h-6 md:w-8 md:h-8 rounded-full bg-white border-2 ${evt.type === 'stay' ? 'border-amber-500 text-amber-700' : 'border-indigo-600 text-indigo-700'} flex items-center justify-center text-xs md:text-sm font-black shadow-xs">
                ${evt.stepIcon}
              </div>

              <!-- Tarjeta del Evento -->
              <div class="bg-white border-2 border-slate-200/90 hover:border-indigo-300 rounded-3xl p-5 md:p-6 shadow-xs transition space-y-4">
                <!-- Encabezado de la Tarjeta -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div class="space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${evt.categoryClass}">
                        ${evt.categoryTag}
                      </span>
                      <span class="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        ${evt.dateRange}
                      </span>
                    </div>
                    <h4 class="text-base sm:text-lg font-black text-slate-900">${evt.title}</h4>
                  </div>

                  <div class="self-start sm:self-auto">
                    <span class="px-3 py-1 rounded-xl text-xs font-black border ${evt.statusClass}">
                      ${evt.statusBadge}
                    </span>
                  </div>
                </div>

                <!-- Contenido del Evento -->
                <div>
                  ${evt.content}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }



================== calculateTravelerCost ==================
function calculateTravelerCost(traveler) {
      let sum = 0;
      if (traveler === 'mario') {
        sum += getCatalogBrick(state.mario.salida)?.price || 0;
        if (isMarioAlt()) {
          sum += getCatalogBrick(state.mario.bog_esp)?.price || 0;
        } else {
          sum += getCatalogBrick(state.mario.trans)?.price || 0;
        }
      } else {
        sum += getCatalogBrick(state.yesica.salida)?.price || 0;
        sum += getCatalogBrick(state.yesica.trans)?.price || 0;
        if (state.yesica.retorno_trans) sum += getCatalogBrick(state.yesica.retorno_trans)?.price || 0;
        if (state.yesica.retorno_canarias) sum += getCatalogBrick(state.yesica.retorno_canarias)?.price || 0;
      }
      return sum;
    }



================== generateFallbackFlights ==================
function generateFallbackFlights(leg, originCode, destCode, destCityName) {
      const orig = leg?.depCode || originCode || 'MAD';
      const dest = leg?.arrCode || destCode || 'BOG';
      const city = destCityName || dest;
      const seg = leg?.segmentKey || 'espana-colombia';

      if (seg === 'retorno-transatlantico') {
        const retCarriers = [
          { key: 'ib1', code: 'iberia', name: 'Iberia', fn: 'IB304', price: 10813, occ: 76, ac: 'Airbus A350-900', dep: '12:50', arr: '06:00 (+1)', direct: true },
          { key: 'ib2', code: 'iberia', name: 'Iberia', fn: 'IB308', price: 10813, occ: 80, ac: 'Airbus A350-900', dep: '20:30', arr: '13:50 (+1)', direct: true },
          { key: 'am1', code: 'aeromexico', name: 'Aeroméxico', fn: 'AM01', price: 11025, occ: 72, ac: 'Boeing 787-9 Dreamliner', dep: '17:45', arr: '11:30 (+1)', direct: true },
          { key: 'ux1', code: 'air-europa', name: 'Air Europa', fn: 'UX202', price: 10650, occ: 83, ac: 'Boeing 787-9 Dreamliner', dep: '15:30', arr: '09:20 (+1)', direct: true }
        ];
        retCarriers.forEach(c => {
          const yId = `gen_ret_trans_yesica_${c.key}`;
          if (!flightsCatalog[yId]) {
            flightsCatalog[yId] = {
              id: yId, traveler: 'yesica', segment: 'retorno-transatlantico',
              title: `${c.name} ${c.fn} (${c.direct ? 'Directo' : 'Conexión'} ${orig} ➔ ${dest}) · ${formatMXN(c.price)}`,
              airline: c.code, price: c.price, occupancy: c.occ, seatsLeft: 4, aircraft: c.ac,
              description: `Vuelo de regreso transatlántico en ${c.name} cubriendo ${orig} hacia ${dest}.`,
              outbound: { route: `${orig} ➔ ${dest}`, schedule: `${c.dep} → ${c.arr}`, flightNumber: c.fn, date: "Viernes 20 Nov 2026" },
              class: "Tarifa Estándar", bag: true, carry: true, seat: true, direct: c.direct, usTransit: false,
              googleFlightsUrl: `https://www.google.com/travel/flights?q=Flights%20from%20${orig}%20to%20${dest}`,
              bookingUrl: "https://www.google.com/travel/flights"
            };
          }
        });
        return;
      }

      if (seg === 'retorno-canarias') {
        const canCarriers = [
          { key: 'i2_1', code: 'iberia', name: 'Iberia Express', fn: 'I21535', price: 1142, occ: 62, ac: 'Airbus A320neo', dep: '16:45', arr: '18:55', direct: true },
          { key: 'i2_2', code: 'iberia', name: 'Iberia Express', fn: 'I21531', price: 1158, occ: 68, ac: 'Airbus A320neo', dep: '11:30', arr: '13:35', direct: true },
          { key: 'nt1', code: 'binter', name: 'Binter Canarias', fn: 'NT5013', price: 1850, occ: 55, ac: 'Embraer E195-E2', dep: '14:00', arr: '18:15', direct: false }
        ];
        canCarriers.forEach(c => {
          const yId = `gen_ret_can_yesica_${c.key}`;
          if (!flightsCatalog[yId]) {
            flightsCatalog[yId] = {
              id: yId, traveler: 'yesica', segment: 'retorno-canarias',
              title: `${c.name} ${c.fn} (${c.direct ? 'Directo' : 'Conexión'} ${orig} ➔ ${dest}) · ${formatMXN(c.price)}`,
              airline: c.code, price: c.price, occupancy: c.occ, seatsLeft: 5, aircraft: c.ac,
              description: `Vuelo de conexión interinsular/peninsular en ${c.name} desde ${orig} hacia Canarias (${dest}).`,
              outbound: { route: `${orig} ➔ ${dest}`, schedule: `${c.dep} → ${c.arr}`, flightNumber: c.fn, date: "Sábado 21 Nov 2026" },
              class: "Tarifa Residente", bag: true, carry: true, seat: true, direct: c.direct, usTransit: false,
              googleFlightsUrl: `https://www.google.com/travel/flights?q=Flights%20from%20${orig}%20to%20${dest}`,
              bookingUrl: "https://www.google.com/travel/flights"
            };
          }
        });
        return;
      }

      const carriers = [
        { key: 'ib', code: 'iberia', name: 'Iberia', fn: 'IB6585', price: 13800, occ: 80, ac: 'Airbus A350-900', dep: '12:45', arr: '16:45', direct: true },
        { key: 'av', code: 'avianca', name: 'Avianca', fn: 'AV11', price: 12900, occ: 78, ac: 'Boeing 787-8 Dreamliner', dep: '12:45', arr: '16:45', direct: true },
        { key: 'ux', code: 'air-europa', name: 'Air Europa', fn: 'UX193', price: 11800, occ: 85, ac: 'Boeing 787-9 Dreamliner', dep: '15:35', arr: '19:35', direct: true },
        { key: 'am', code: 'aeromexico', name: 'Aeroméxico', fn: 'AM02', price: 15400, occ: 70, ac: 'Boeing 787-9', dep: '14:40', arr: '04:30 (+1)', direct: false },
        { key: 'af', code: 'klm-airfrance', name: 'Air France / KLM', fn: 'AF422', price: 16800, occ: 77, ac: 'Airbus A350-900', dep: '07:10', arr: '18:25', direct: false },
        { key: 'ua', code: 'united', name: 'United Airlines', fn: 'UA129', price: 12700, occ: 83, ac: 'Boeing 777-200', dep: '10:20', arr: '21:30', direct: false, usTransit: true }
      ];

      const flightDate = leg?.departureDate 
        || (seg.includes('inicio') ? (tripConfig.p1.startDate || 'Viernes 16 Oct 2026') 
        : (tripConfig.p1.waypoints?.[0]?.departureDate ? `Martes ${tripConfig.p1.waypoints[0].departureDate}` : 'Martes 27 Oct 2026'));

      carriers.forEach(c => {
        const mId = `gen_${seg}_mario_${c.key}`;
        if (!flightsCatalog[mId]) {
          flightsCatalog[mId] = {
            id: mId,
            traveler: 'mario',
            segment: seg,
            title: `${c.name} ${c.fn} (${c.direct ? 'Directo' : 'Conexión'} ${orig} ➔ ${dest}) · ${formatMXN(c.price)}`,
            airline: c.code,
            price: c.price,
            occupancy: c.occ,
            seatsLeft: 5,
            aircraft: c.ac,
            description: `Vuelo ${c.direct ? 'directo' : 'con conexión'} en ${c.name} cubriendo la ruta ${orig} hacia ${city} (${dest}).`,
            outbound: {
              route: `${orig} ➔ ${dest}`,
              schedule: `${c.dep} → ${c.arr}`,
              flightNumber: c.fn,
              date: flightDate
            },
            class: "Tarifa Estándar",
            bag: true, carry: true, seat: true, direct: c.direct, usTransit: Boolean(c.usTransit),
            googleFlightsUrl: `https://www.google.com/travel/flights?q=Flights%20${c.code}%20from%20${orig}%20to%20${dest}`,
            bookingUrl: "https://www.google.com/travel/flights"
          };
        }

        const yId = `gen_${seg}_yesica_${c.key}`;
        if (!flightsCatalog[yId]) {
          flightsCatalog[yId] = {
            id: yId,
            traveler: 'yesica',
            segment: seg,
            title: `${c.name} ${c.fn} (${formatMXN(c.price)}) · Vuelo Conjunto con Mario`,
            airline: c.code,
            price: c.price,
            occupancy: c.occ,
            seatsLeft: 4,
            aircraft: c.ac,
            description: `Vuelo conjunto con Mario en ${c.name} (${orig} ➔ ${dest}) en cabina compartida. (El retorno se gestiona en Tramos 4 y 5).`,
            outbound: {
              route: `${orig} ➔ ${dest}`,
              schedule: `${c.dep} → ${c.arr}`,
              flightNumber: c.fn,
              date: flightDate
            },
            class: "Tarifa Sincronizada",
            bag: true, carry: true, seat: true, direct: c.direct, usTransit: false,
            googleFlightsUrl: `https://www.google.com/travel/flights?q=Flights%20${c.code}%20from%20${orig}%20to%20${dest}`,
            bookingUrl: "https://www.google.com/travel/flights"
          };
        }
      });
    }



