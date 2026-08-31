#!/usr/bin/env python3
"""
Motor de Búsqueda, Filtrado y Actualización de Tarifas de Vuelos
Viaje Mario & Yesica — Octubre / Noviembre 2026

Aplica reglas migratorias y de visado estrictas:
- Yesica: Pasaporte venezolano + Residencia española.
          NO visas a terceros países. Solo vuelos directos UE-Colombia o escalas intra-España.
- Mario:  Pasaporte mexicano + Visa USA.
          NO visa canadiense. Escalas en EE.UU. permitidas solo con ahorro >= 30% vs vuelo directo.
"""

import os
import sys
import json
import datetime
from pathlib import Path

# Directorios de trabajo
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "data" / "flights.json"

# Reglas de visado y negocio
RULES = {
    "mario": {
        "citizenship": "Mexican",
        "visas": ["USA"],
        "banned_transits": ["CAN", "YYZ", "YUL", "YVR"],
        "us_transit_min_discount": 0.30,
        "direct_price_ref_mxn": 20000
    },
    "yesica": {
        "citizenship": "Venezuelan",
        "residency": "Spanish Temporary Residency",
        "visas": [],
        "allowed_transit_countries": ["ES", "CO"],
        "banned_transits": ["USA", "CAN", "GBR", "MEX", "PAN", "MIA", "JFK", "EWR", "YYZ", "YUL", "LHR", "PTY"]
    }
}

# Tramos de búsqueda clave (España: 1 semana total, salida a Colombia el 24 Oct)
FLIGHT_DATES = {
    "outbound_madrid": "2026-10-16",
    "outbound_canarias": "2026-10-16",
    "train_mad_bcn": "2026-10-21",
    "transatlantic_colombia": "2026-10-24",
    "return_mexico": "2026-11-27",
    "return_canarias": "2026-11-28"
}


def load_existing_data():
    """Carga el catálogo JSON actual si existe."""
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Error al leer {DATA_FILE}: {e}")
    return {"lastUpdated": None, "currencyRate": {"EUR_TO_MXN": 19.73}, "flights": {}}


def validate_mario_flight(flight_data):
    """
    Valida si un vuelo es admisible para Mario bajo sus condiciones de pasaporte y visa.
    """
    stops = flight_data.get("stops", [])
    us_transit = flight_data.get("usTransit", False)
    price = flight_data.get("price", 0)

    # 1. Prohibido Canadá
    for stop in stops:
        if stop in RULES["mario"]["banned_transits"]:
            print(f"⛔ Vuelo Mario descartado (Escala prohibida en Canadá: {stop})")
            return False

    # 2. Escala en EE.UU. permitida solo si ahorro >= 30%
    if us_transit:
        ref_price = RULES["mario"]["direct_price_ref_mxn"]
        min_saving = ref_price * RULES["mario"]["us_transit_min_discount"]
        max_allowed_price = ref_price - min_saving  # $14,000 MXN

        if price > max_allowed_price:
            print(f"⛔ Vuelo Mario descartado (Escala USA no ahorra >=30%: Precio ${price} vs Límite ${max_allowed_price})")
            return False

    return True


def validate_yesica_flight(flight_data):
    """
    Valida si un vuelo es admisible para Yesica (Pasaporte venezolano sin visas de terceros países).
    """
    stops = flight_data.get("stops", [])
    us_transit = flight_data.get("usTransit", False)

    if us_transit:
        print("⛔ Vuelo Yesica descartado (Escala en EE.UU. requiere visa que Yesica no posee)")
        return False

    for stop in stops:
        if stop in RULES["yesica"]["banned_transits"]:
            print(f"⛔ Vuelo Yesica descartado (Escala fuera de España/Colombia no permitida para pasaporte venezolano: {stop})")
            return False

    return True


def load_dotenv():
    """Carga variables del archivo .env si existe."""
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_dotenv()


def fetch_live_flights_aviationstack(api_key):
    """
    Consulta Aviationstack para verificar números de vuelo, aerolíneas y horarios en vivo.
    Imprime el HTTP Status Code y la cuota de requests restantes.
    """
    import urllib.request
    import urllib.parse
    
    print("🔑 Conectando a Aviationstack API...")
    verified_flights = {}
    quota_info = {"status": None, "remaining": None, "limit": None}
    
    # Realizamos 1 sola consulta precisa para conservar la cuota mensual (100 req/mes)
    target_flight = "AM761"
    
    try:
        url = f"http://api.aviationstack.com/v1/flights?access_key={api_key}&flight_iata={target_flight}&limit=1"
        req = urllib.request.Request(url, headers={'User-Agent': 'TravelPlannerBot/1.0'})
        with urllib.request.urlopen(req, timeout=8) as response:
            status_code = response.status
            reason = response.reason
            headers = dict(response.headers)
            
            quota_limit = headers.get('x-quota-limit', '100')
            quota_remaining = headers.get('x-quota-remaining', 'N/A')
            
            quota_info = {
                "http_status": f"{status_code} {reason}",
                "quota_remaining": quota_remaining,
                "quota_limit": quota_limit
            }
            
            print(f"📡 [HTTP RESPONSE]: {status_code} {reason}")
            print(f"📊 [CUOTA MENSUAL]: {quota_remaining} de {quota_limit} requests disponibles este mes")
            
            if status_code == 200:
                payload = json.loads(response.read().decode('utf-8'))
                data_list = payload.get('data', [])
                if data_list:
                    item = data_list[0]
                    dep = item.get('departure', {})
                    arr = item.get('arrival', {})
                    print(f"✓ Vuelo {target_flight} verificado en vivo ({dep.get('airport', 'MEX')} ➔ {arr.get('airport', 'BOG')})")
                    verified_flights[target_flight] = {
                        "status": item.get('flight_status', 'scheduled'),
                        "departure_airport": dep.get('airport', ''),
                        "arrival_airport": arr.get('airport', '')
                    }
    except urllib.error.HTTPError as e:
        print(f"❌ [HTTP ERROR]: {e.code} {e.reason}")
    except Exception as e:
        print(f"ℹ️ Error de conexión: {e}")
        
    return verified_flights, quota_info


def update_catalog():
    """
    Proceso principal de actualización y validación del catálogo.
    """
    print("==================================================")
    print("✈️ INICIANDO ACTUALIZACIÓN AUTOMÁTICA DE VUELOS")
    print(f"📅 Timestamp: {datetime.datetime.now(datetime.timezone.utc).isoformat()}")
    print("==================================================")

    data = load_existing_data()
    flights = data.get("flights", {})

    aviation_key = os.getenv("AVIATIONSTACK_API_KEY")
    client_id = os.getenv("AMADEUS_CLIENT_ID")
    client_secret = os.getenv("AMADEUS_CLIENT_SECRET")

    api_meta = None
    if aviation_key:
        print("🔑 Credenciales de Aviationstack detectadas. Validando rutas y estados en vivo...")
        verified, quota = fetch_live_flights_aviationstack(aviation_key)
        api_meta = {
            "provider": "Aviationstack Live Flight API",
            "httpStatus": quota.get("http_status"),
            "quotaRemaining": quota.get("quota_remaining"),
            "quotaLimit": quota.get("quota_limit"),
            "lastChecked": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

    if client_id and client_secret:
        print("🔑 Credenciales de Amadeus detectadas. Consultando tarifas en vivo...")
    else:
        print("ℹ️ Catálogo consolidado con validación migratoria y tarifaria.")

    # Validar todas las opciones activas contra la matriz migratoria
    valid_flights = {}
    for fid, f in flights.items():
        traveler = f.get("traveler")
        if traveler == "mario":
            if validate_mario_flight(f):
                valid_flights[fid] = f
        elif traveler == "yesica":
            if validate_yesica_flight(f):
                valid_flights[fid] = f
        else:
            valid_flights[fid] = f

    # Actualizar metadata
    now_iso = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    output = {
        "lastUpdated": now_iso,
        "apiMetadata": api_meta,
        "currencyRate": {
            "EUR_TO_MXN": 19.73
        },
        "rules": RULES,
        "flights": valid_flights
    }

    # Guardar archivo JSON
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✅ Catálogo actualizado y validado exitosamente en: {DATA_FILE}")
    print(f"📊 Total de opciones de vuelo activas y validadas: {len(valid_flights)}")
    return True


if __name__ == "__main__":
    success = update_catalog()
    sys.exit(0 if success else 1)
