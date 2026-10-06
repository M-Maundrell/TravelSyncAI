const { app } = require('@azure/functions');
const axios = require('axios');

app.http('discoverFlights', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'update-flights',
    handler: async (request, context) => {
        try {
            const body = await request.json();
            const searchRoutes = Array.isArray(body) ? body : [body];
            const apiKey = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY || "933b6c39650bda3ce1215539de1746099f4a0e5995e3a7bb2ed8eaa2c6762642";

            if (!apiKey) {
                return {
                    status: 500,
                    jsonBody: { error: "Clave de API de SerpAPI no configurada en el servidor." }
                };
            }

            const catalog = {};

            function getTimeFromStr(str) {
                if (!str) return "00:00";
                const parts = str.trim().split(' ');
                return parts.length > 1 ? parts[1] : parts[0];
            }

            for (const route of searchRoutes) {
                let depCity = route.dep || 'MEX';
                let arrCity = route.arr || 'MAD';
                if (depCity === arrCity) {
                    arrCity = depCity === 'MEX' ? 'MAD' : 'MEX';
                }

                const params = {
                    engine: "google_flights",
                    departure_id: depCity,
                    arrival_id: arrCity,
                    outbound_date: route.date,
                    currency: "MXN",
                    hl: "es",
                    type: "2",
                    api_key: apiKey
                };

                let res;
                try {
                    res = await axios.get("https://serpapi.com/search", { params, timeout: 25000 });
                } catch (apiErr) {
                    const errMsg = apiErr.response?.data?.error || apiErr.message;
                    context.error(`SerpAPI error for route ${depCity} -> ${arrCity}:`, errMsg);
                    return {
                        status: 502,
                        jsonBody: { error: `Error al consultar Google Flights (${depCity}➔${arrCity}): ${errMsg}` }
                    };
                }

                if (res.data?.error) {
                    context.error(`SerpAPI returned error for route ${depCity} -> ${arrCity}:`, res.data.error);
                    return {
                        status: 502,
                        jsonBody: { error: `Error en Google Flights: ${res.data.error}` }
                    };
                }

                const bestFlights = res.data.best_flights || [];
                const otherFlights = res.data.other_flights || [];
                const allFlights = [...bestFlights, ...otherFlights];

                allFlights.forEach((raw, idx) => {
                    const price = raw.price || 0;
                    const flights = raw.flights || [];
                    if (!flights.length) return;

                    const firstFlight = flights[0];
                    const lastFlight = flights[flights.length - 1];

                    const rawAirline = firstFlight.airline || "Aerolínea";
                    let airlineName = rawAirline;
                    let airlineCode = rawAirline.toLowerCase().replace(/[^a-z0-9]/g, "-");

                    if (airlineCode.includes("aeromexico") || airlineCode.includes("aerom-xico")) {
                        airlineName = "Aeroméxico";
                        airlineCode = "aeromexico";
                    } else if (airlineCode.includes("american")) {
                        airlineName = "American Airlines";
                        airlineCode = "american";
                    } else if (airlineCode.includes("delta")) {
                        airlineName = "Delta Air Lines";
                        airlineCode = "delta";
                    } else if (airlineCode.includes("airfrance") || airlineCode.includes("air-france")) {
                        airlineName = "Air France";
                        airlineCode = "airfrance";
                    } else if (airlineCode.includes("british")) {
                        airlineName = "British Airways";
                        airlineCode = "british-airways";
                    } else if (airlineCode.includes("iberia")) {
                        airlineName = "Iberia";
                        airlineCode = "iberia";
                    } else if (airlineCode.includes("avianca")) {
                        airlineName = "Avianca";
                        airlineCode = "avianca";
                    } else if (airlineCode.includes("europa")) {
                        airlineName = "Air Europa";
                        airlineCode = "air-europa";
                    } else if (airlineCode.includes("klm")) {
                        airlineName = "KLM";
                        airlineCode = "klm";
                    } else if (airlineCode.includes("lufthansa")) {
                        airlineName = "Lufthansa";
                        airlineCode = "lufthansa";
                    }

                    const fn = firstFlight.flight_number || "000";
                    const depTime = getTimeFromStr(firstFlight.departure_airport?.time);
                    const arrTime = getTimeFromStr(lastFlight.arrival_airport?.time);

                    const depAirportDate = (firstFlight.departure_airport?.time || '').split(' ')[0];
                    const arrAirportDate = (lastFlight.arrival_airport?.time || '').split(' ')[0];
                    const isNextDay = lastFlight.overnight || (depAirportDate && arrAirportDate && depAirportDate !== arrAirportDate);
                    const arrTimeDisplay = isNextDay ? `${arrTime} (+1)` : arrTime;

                    const totalMins = raw.total_duration || firstFlight.duration || 0;
                    const durHours = Math.floor(totalMins / 60);
                    const durMins = totalMins % 60;
                    const durStr = durHours > 0 ? `${durHours}h ${durMins}m` : `${durMins}m`;

                    const stops = flights.length - 1;
                    let layoversDetail = [];
                    if (stops > 0) {
                        if (Array.isArray(raw.layovers) && raw.layovers.length > 0) {
                            layoversDetail = raw.layovers.map(l => {
                                const lH = Math.floor((l.duration || 0) / 60);
                                const lM = (l.duration || 0) % 60;
                                const d = lH > 0 ? `${lH}h ${lM}m` : `${lM}m`;
                                return `${l.name || l.id || 'Escala'} (${d})`;
                            });
                        } else {
                            layoversDetail = flights.slice(0, -1).map(f => f.arrival_airport?.name || f.arrival_airport?.id || 'Escala');
                        }
                    }

                    const stopsStr = stops === 0 ? "Directo" : `${stops} escala(s) en ${layoversDetail.join(', ')}`;
                    const airlineLogo = raw.airline_logo || firstFlight.airline_logo || `https://www.gstatic.com/flights/airline_logos/70px/${fn.split(' ')[0] || 'flight'}.png`;

                    const hash = ((firstFlight.flight_number || '') + price).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
                    const occupancy = 68 + (hash % 26);
                    const seatsLeft = 2 + (hash % 7);

                    const safeDateStr = (route.date || '').replace(/[^0-9]/g, '');
                    const fid = `live_${route.segment}_${route.traveler}_${airlineCode}_${fn.replace(/[^a-zA-Z0-9]/g, '')}_${safeDateStr}_${idx}`;

                    const fareClass = firstFlight.travel_class || raw.travel_class || (price > 35000 ? "Tarifa Ejecutiva / Business" : "Tarifa Estándar con Maleta");

                    const ticketAlsoSoldBy = firstFlight.ticket_also_sold_by || [];

                    catalog[fid] = {
                        id: fid,
                        traveler: route.traveler,
                        segment: route.segment,
                        title: `${airlineName} (${fn}) · ${stops === 0 ? 'Directo' : `${stops} escala(s)`} · ${fareClass}`,
                        airline: airlineCode,
                        airlineName: airlineName,
                        airlineLogo: airlineLogo,
                        flightNumber: fn,
                        price: price,
                        occupancy: occupancy,
                        seatsLeft: seatsLeft,
                        aircraft: firstFlight.airplane || "Aeronave Comercial",
                        stopsCount: stops,
                        stops: stopsStr,
                        layovers: layoversDetail,
                        direct: stops === 0,
                        ticketAlsoSoldBy: ticketAlsoSoldBy,
                        description: stops === 0
                            ? `Vuelo directo operado por ${airlineName} (${depCity} a ${arrCity}).`
                            : `Vuelo con ${stops} escala(s) en ${layoversDetail.join(', ')} operado por ${airlineName}.`,
                        outbound: {
                            route: `${depCity} ➔ ${arrCity}`,
                            schedule: `${depTime} → ${arrTimeDisplay} (${durStr})`,
                            depTime: depTime,
                            arrTime: arrTimeDisplay,
                            duration: durStr,
                            flightNumber: fn,
                            date: route.date
                        },
                        class: fareClass,
                        bag: true, carry: true, seat: true,
                        googleFlightsUrl: raw.share_link || `https://www.google.com/travel/flights?q=Flights%20from%20${depCity}%20to%20${arrCity}%20on%20${route.date}`
                    };
                });
            }

            return { jsonBody: catalog };
        } catch (error) {
            context.error("Internal error in discoverFlights:", error);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});
