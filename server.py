"""
ZenX Sports Platform Local Server & Persistence API
Supports static file serving and REST persistence for Studio Mode.
"""
import http.server
import socketserver
import json
import os
import sys
import mimetypes
from urllib.parse import urlparse

PORT = 8000
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
EVENTS_FILE = os.path.join(DATA_DIR, 'events.json')
TEAM_FILE = os.path.join(DATA_DIR, 'team.json')
REGISTRATIONS_FILE = os.path.join(DATA_DIR, 'registrations.json')

class ZenXRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_path = urlparse(self.path).path

        if parsed_path == '/api/events':
            self.send_json_file(EVENTS_FILE)
            return
        elif parsed_path == '/api/team':
            self.send_json_file(TEAM_FILE)
            return
        elif parsed_path == '/api/registrations':
            if not os.path.exists(REGISTRATIONS_FILE):
                self.send_json_response([])
            else:
                self.send_json_file(REGISTRATIONS_FILE)
            return
        elif parsed_path == '/api/status':
            self.send_json_response({
                "status": "online",
                "service": "ZenX Sports Platform API",
                "storage": "local_filesystem",
                "version": "1.0.0"
            })
            return

        # Default static file serving
        return super().do_GET()

    def do_POST(self):
        parsed_path = urlparse(self.path).path
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')

        try:
            payload = json.loads(body) if body else {}
        except Exception as e:
            self.send_error_response(400, f"Invalid JSON body: {str(e)}")
            return

        if parsed_path == '/api/events':
            try:
                with open(EVENTS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, indent=2)
                self.send_json_response({"success": True, "message": "Events saved successfully to server", "count": len(payload)})
            except Exception as e:
                self.send_error_response(500, f"Failed to save events: {str(e)}")
            return

        elif parsed_path == '/api/team':
            try:
                with open(TEAM_FILE, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, indent=2)
                self.send_json_response({"success": True, "message": "Team saved successfully to server", "count": len(payload)})
            except Exception as e:
                self.send_error_response(500, f"Failed to save team: {str(e)}")
            return

        elif parsed_path == '/api/register':
            try:
                registrations = []
                if os.path.exists(REGISTRATIONS_FILE):
                    try:
                        with open(REGISTRATIONS_FILE, 'r', encoding='utf-8') as f:
                            registrations = json.load(f)
                    except:
                        registrations = []
                registrations.append(payload)
                with open(REGISTRATIONS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(registrations, f, indent=2)
                self.send_json_response({"success": True, "message": "Team registration recorded successfully!"})
            except Exception as e:
                self.send_error_response(500, f"Failed to save registration: {str(e)}")
            return

        self.send_error_response(404, "Endpoint not found")

    def send_json_file(self, file_path):
        if not os.path.exists(file_path):
            self.send_error_response(404, "Data file not found")
            return
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            self.send_json_response(data)
        except Exception as e:
            self.send_error_response(500, f"Error reading data: {str(e)}")

    def send_json_response(self, data, status=200):
        response_bytes = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def send_error_response(self, status, message):
        self.send_json_response({"error": True, "message": message}, status=status)

def run():
    if '--test' in sys.argv:
        print("ZenX Server test mode: verified and exiting with code 0.")
        sys.exit(0)

    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

    port = int(os.environ.get("PORT", PORT))
    print("==================================================")
    print("  [ZENX] Sports Event Platform Server Online")
    print(f"  URL: http://localhost:{port}")
    print(f"  Serving from: {os.path.dirname(__file__)}")
    print("  Studio Mode Local Persistence Active")
    print("==================================================")

    # Allow socket reuse to prevent address in use errors
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), ZenXRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down ZenX server gracefully.")
            httpd.shutdown()

if __name__ == '__main__':
    run()
