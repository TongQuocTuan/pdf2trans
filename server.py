"""PDF Translator - local dev server (v1-fixed).

Chi chay tren may nay, khong mo ra LAN.
"""
import http.server
import socketserver
import sys
import webbrowser
import os

PORT = int(os.environ.get("PDF_TRANSLATOR_PORT", "16051"))
# Chi bind localhost - sua P0 trong bao cao: ban cu bind "" = 0.0.0.0.
HOST = "127.0.0.1"
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Giam nguy co MIME-sniffing; file tinh thi khong cache lau.
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):  # gon log, khong spam
        sys.stderr.write("[%s] %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    # ThreadingHTTPServer: nhieu request khong chan nhau nhu TCPServer don luong cu.
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer((HOST, PORT), Handler) as httpd:
        print(f"[*] PDF Translator: http://{HOST}:{PORT} (chi localhost)")
        print("[*] Nhan Ctrl+C de dung.")
        if "--no-browser" not in sys.argv:
            webbrowser.open(f"http://{HOST}:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[-] Server stopped.")
