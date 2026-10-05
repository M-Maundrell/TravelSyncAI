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
            const apiKey = process.env.SERPAPI_KEY;

            if (!apiKey) {
                return { status: 500, jsonBody: { error: "SERPAPI_KEY not configured" } };
            }

            const catalog = {};

            for (const route of searchRoutes) {
                const params = {
                    engine: "google_flights",
                    departure_id: route.dep,
                    arrival_id: route.arr,
                    outbound_date: route.date,
                    currency: "MXN",
                    hl: "es",
                    type: "2",
                    api_key: apiKey
                };

                const res = await axios.get("https://serpapi.com/search", { params });
                const bestFlights = res.data.best_flights || [];
                const otherFlights = res.data.other_flights || [];
                const allFlights = [...bestFlights, ...otherFlights];

                allFlights.slice(0, 5).forEach((raw, idx) => {
                    const price = raw.price || 0;
                    const flights = raw.flights || [];
                    if (!flights.length) return;

                    const mainFlight = flights[0];
                    const airlineName = mainFlight.airline || "Aerolínea";
                    const airlineCode = airlineName.toLowerCase().replace(/ /g, "-");
                    const fn = mainFlight.flight_number || "000";
                    
                    const extractTime = (token) => token ? token.split('t')[1].substring(0, 5) : "00:00";
                    const depTime = extractTime(mainFlight.departure_token);
                    const arrTime = extractTime(flights[flights.length - 1].arrival_token);

                    const stops = flights.length - 1;
                    const stopsStr = stops === 0 ? "directo" : `con ${stops} escala(s)`;
                    const fid = `live_${route.segment}_${route.traveler}_${airlineCode}_${fn}_${idx}`;
                    
                    catalog[fid] = {
                        id: fid,
                        traveler: route.traveler,
                        segment: route.segment,
                        title: `${airlineName} (${fn}) · ${stopsStr}`,
                        airline: airlineCode,
                        airlineName: airlineName,
                        price: price,
                        occupancy: 68 + (price % 22),
                        seatsLeft: 3 + (price % 7),
                        aircraft: mainFlight.airplane || "Aeronave Comercial",
                        description: `Vuelo ${stopsStr} operado por ${airlineName} (${route.dep} a ${route.arr}).`,
                        outbound: {
                            route: `${route.dep} ➔ ${route.arr}`,
                            schedule: `${depTime} → ${arrTime}`,
                            flightNumber: fn,
                            date: route.date
                        },
                        class: raw.travel_class || "Turista",
                        bag: true, carry: true, seat: true,
                        direct: stops === 0,
                        googleFlightsUrl: raw.share_link || `https://www.google.com/travel/flights?q=Flights%20from%20${route.dep}%20to%20${route.arr}%20on%20${route.date}`
                    };
                });
            }

            return { jsonBody: catalog };
        } catch (error) {
            context.error(error);
            return { status: 500, jsonBody: { error: error.message } };
        }
    }
});
