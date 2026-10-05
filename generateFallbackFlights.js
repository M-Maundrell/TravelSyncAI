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