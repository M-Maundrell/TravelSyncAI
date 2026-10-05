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