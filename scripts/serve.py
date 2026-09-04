import http.server
import socketserver
import os
import sys
import json
import urllib.parse
from pathlib import Path

DIRECTORY = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(DIRECTORY / "scripts"))

from update_flights import (
    fetch_live_flights_serpapi,
    parse_google_flights_to_catalog,
    fetch_serpapi_account_info,
    update_catalog,
    load_dotenv,
    DATA_FILE
)

load_dotenv()

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/search-flights':
            self.handle_search_flights(parsed.query)
            return
        if parsed.path == '/api/account-info':
            self.handle_account_info()
            return
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/update-flights':
            self.handle_update_flights()
            return
        self.send_error(404, "Endpoint no encontrado")

    def handle_account_info(self):
        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            self.send_json_response({"error": "No API key configured"}, status=500)
            return
        info = fetch_serpapi_account_info(api_key)
        self.send_json_response(info)

    def handle_search_flights(self, query_str):
        qs = urllib.parse.parse_qs(query_str)
        dep = qs.get('dep', ['MEX'])[0]
        arr = qs.get('arr', ['MAD'])[0]
        date = qs.get('date', ['2026-10-16'])[0]
        traveler = qs.get('traveler', ['mario'])[0]
        segment = qs.get('segment', ['transatlantico-inicio'])[0]
        is_joint = qs.get('is_joint', ['false'])[0].lower() in ('true', '1', 'yes')
        return_date = qs.get('return_date', [None])[0]
        return_dest = qs.get('return_dest', ['SPC'])[0]

        api_key = os.getenv("SERPAPI_API_KEY")
        if not api_key:
            self.send_json_response({"error": "SERPAPI_API_KEY no encontrada en el servidor"}, status=500)
            return

        print(f"🔍 [API SEARCH] Solicitud recibida: {dep} ➔ {arr} ({date}) para {traveler} (tramo: {segment})")
        raw_flights = fetch_live_flights_serpapi(api_key, dep, arr, date)
        
        parsed = parse_google_flights_to_catalog(
            raw_flights, traveler, segment, dep, arr, date,
            is_joint=is_joint, return_date=return_date, return_dest=return_dest
        )

        # Si encontramos vuelos, enriquecer el archivo data/flights.json para persistencia inmediata
        if parsed and DATA_FILE.exists():
            try:
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    cat = json.load(f)
                cat.setdefault("flights", {}).update(parsed)
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(cat, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"⚠️ Error al persistir vuelos en catálogo: {e}")

        acc = fetch_serpapi_account_info(api_key)
        self.send_json_response({
            "success": True,
            "dep": dep,
            "arr": arr,
            "date": date,
            "traveler": traveler,
            "segment": segment,
            "count": len(parsed),
            "flights": parsed,
            "quotaRemaining": acc.get("searchesRemaining", 248)
        })

    def handle_update_flights(self):
        try:
            success = update_catalog()
            if success and DATA_FILE.exists():
                with open(DATA_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                self.send_json_response({
                    "success": True,
                    "metadata": data.get("apiMetadata", {}),
                    "totalFlights": len(data.get("flights", {}))
                })
            else:
                self.send_json_response({"success": False, "error": "Fallo al actualizar catálogo"}, status=500)
        except Exception as e:
            self.send_json_response({"success": False, "error": str(e)}, status=500)

    def send_json_response(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Servidor web local activo en http://localhost:{PORT}")
        print(f"Endpoints dinámicos: /api/search-flights, /api/account-info, /api/update-flights")
        httpd.serve_forever()
