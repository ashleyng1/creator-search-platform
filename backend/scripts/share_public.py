"""
Expose CreatorFind to the internet using the ngrok Python library (pip install only).

Prerequisites:
  1. Free ngrok account: https://dashboard.ngrok.com/signup
  2. Copy authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
  3. pip install ngrok   (or pip install -r requirements.txt)

Usage:
  set NGROK_AUTHTOKEN=your_token_here
  python scripts/share_public.py

Share the printed https://....ngrok-free.app link with your friend.
"""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex(("127.0.0.1", port)) == 0


def listener_url(listener) -> str:
    url = listener.url() if callable(getattr(listener, "url", None)) else listener.url
    return str(url)


def start_backend() -> None:
    print("Starting backend on port 8000...")
    subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR,
        creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0,
    )
    for _ in range(20):
        if port_in_use(8000):
            return
        time.sleep(0.5)
    raise RuntimeError("Backend did not start on port 8000")


def start_frontend(api_public_url: str) -> None:
    print("Starting frontend on port 3000...")
    env = os.environ.copy()
    env["NEXT_PUBLIC_API_URL"] = api_public_url
    node = FRONTEND_DIR / "node_modules" / "next" / "dist" / "bin" / "next"
    subprocess.Popen(
        [str(node), "dev", "-p", "3000", "-H", "0.0.0.0"],
        cwd=FRONTEND_DIR,
        env=env,
        creationflags=subprocess.CREATE_NEW_CONSOLE if sys.platform == "win32" else 0,
    )
    for _ in range(40):
        if port_in_use(3000):
            return
        time.sleep(0.5)
    raise RuntimeError("Frontend did not start on port 3000")


def main() -> None:
    token = os.environ.get("NGROK_AUTHTOKEN", "").strip()
    if not token:
        print("\nMissing NGROK_AUTHTOKEN")
        print("1. Sign up free: https://dashboard.ngrok.com/signup")
        print("2. Copy token:  https://dashboard.ngrok.com/get-started/your-authtoken")
        print("3. Run:         set NGROK_AUTHTOKEN=your_token_here")
        print("4. Then:        python scripts/share_public.py\n")
        sys.exit(1)

    try:
        import ngrok
    except ImportError:
        print("Install ngrok Python library: pip install ngrok")
        sys.exit(1)

    print("\nCreatorFind — public share via ngrok (Python library)\n")

    if not port_in_use(8000):
        start_backend()
    else:
        print("Backend already running on port 8000")

    print("Opening API tunnel...")
    api_listener = ngrok.forward(8000, authtoken=token)
    api_url = listener_url(api_listener)
    print(f"  API: {api_url}")

    if not port_in_use(3000):
        start_frontend(api_url)
    else:
        print("Frontend already on port 3000 — restart it with:")
        print(f'  set NEXT_PUBLIC_API_URL={api_url}')
        print('  node node_modules/next/dist/bin/next dev -p 3000')

    print("Opening web tunnel...")
    web_listener = ngrok.forward(3000, authtoken=token)
    web_url = listener_url(web_listener)

    print("\n" + "=" * 50)
    print("  SHARE THIS LINK WITH YOUR FRIEND:")
    print(f"  {web_url}")
    print("=" * 50)
    print("\n  Login: demo@brand.com / demo1234")
    print("  (Free ngrok may show a one-time 'Visit Site' click)\n")
    print("  Keep this window open. Press Ctrl+C to stop tunnels.\n")

    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        print("\nStopping tunnels...")
        try:
            ngrok.disconnect()
        except Exception:
            pass
        print("Done.")


if __name__ == "__main__":
    main()
