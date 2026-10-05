import json
import os
import requests
import argparse
from datetime import datetime

def get_serpapi_flights(dep, arr, date_str):
    api_key = os.environ.get("SERPAPI_KEY")
    if not api_key:
        print("No SERPAPI_KEY found")
        return []
        
    params = {
        "engine": "google_flights",
        "departure_id": dep,
        "arrival_id": arr,
        "outbound_date": date_str,
        "currency": "MXN",
        "hl": "es",
        "type": "2",
        "api_key": api_key
    }
    
    try:
        res = requests.get("https://serpapi.com/search", params=params)
        data = res.json()
        return data.get("best_flights", []) + data.get("other_flights", [])
    except Exception as e:
        print(f"Error fetching from SerpAPI: {e}")
        return []

def parse_flight(raw_flight, route, idx):
    try:
        price = raw_flight.get("price", 0)
        flights = raw_flight.get("flights", [])
        if not flights: return None
        
        main_flight = flights[0]
        airline_name = main_flight.get("airline", "Aerolínea")
        airline_code = airline_name.lower().replace(" ", "-")
        fn = main_flight.get("flight_number", "000")
        dep_time = main_flight.get("departure_token", "").split("t")[-1][:5] if main_flight.get("departure_token") else "00:00"
        arr_time = flights[-1].get("arrival_token", "").split("t")[-1][:5] if flights[-1].get("arrival_token") else "00:00"
        
        stops = len(flights) - 1
        stops_str = "directo" if stops == 0 else f"con {stops} escala(s)"
        
        # Generar ID único
        fid = f"live_{route['segment']}_{route['traveler']}_{airline_code}_{fn}_{idx}"
        
        flight_desc = f"Vuelo {stops_str} operado por {airline_name} ({route['dep']} a {route['arr']})."
        
        return {
            "id": fid,
            "traveler": route["traveler"],
            "segment": route["segment"],
            "title": f"{airline_name} ({fn}) · {stops_str.capitalize()}",
            "airline": airline_code,
            "airlineName": airline_name,
            "price": price,
            "occupancy": 68 + (price % 22),
            "seatsLeft": 3 + (price % 7),
            "aircraft": main_flight.get("airplane", "Aeronave Comercial"),
            "description": flight_desc,
            "outbound": {
                "route": f"{route['dep']} ➔ {route['arr']}",
                "schedule": f"{dep_time} → {arr_time}",
                "flightNumber": fn,
                "date": route["date"]
            },
            "class": raw_flight.get("travel_class", "Turista"),
            "bag": True,
            "carry": True,
            "seat": True,
            "direct": stops == 0,
            "googleFlightsUrl": raw_flight.get("share_link") or f"https://www.google.com/travel/flights?q=Flights%20from%20{route['dep']}%20to%20{route['arr']}%20on%20{route['date']}"
        }
    except Exception as e:
        print(f"Error parsing flight: {e}")
        return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--use_request_file", action="store_true")
    args = parser.parse_args()

    search_routes = []
    if args.use_request_file:
        try:
            with open("data/search_request.json", "r") as f:
                search_routes = json.load(f)
        except Exception as e:
            print(f"Could not load search_request.json: {e}")
            return

    if not search_routes:
        print("No routes to search. Exiting.")
        return

    try:
        with open("data/flights.json", "r") as f:
            catalog = json.load(f)
    except:
        catalog = {}

    for route in search_routes:
        print(f"Searching route {route['dep']} to {route['arr']} on {route['date']}...")
        raw_flights = get_serpapi_flights(route["dep"], route["arr"], route["date"])
        print(f"Found {len(raw_flights)} flights.")
        
        for idx, raw in enumerate(raw_flights[:5]): # Take top 5 to keep file small
            parsed = parse_flight(raw, route, idx)
            if parsed:
                catalog[parsed["id"]] = parsed

    with open("data/flights.json", "w") as f:
        json.dump(catalog, f, indent=2)
        print("Updated data/flights.json")

if __name__ == "__main__":
    main()
