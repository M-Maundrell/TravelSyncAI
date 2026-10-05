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