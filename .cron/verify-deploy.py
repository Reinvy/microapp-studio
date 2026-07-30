#!/usr/bin/env python3
import urllib.request, re

req = urllib.request.Request('https://microapp-studio.vercel.app/', method='HEAD')
resp = urllib.request.urlopen(req, timeout=10)
print(f'Status: HTTP {resp.status}')

req2 = urllib.request.Request('https://microapp-studio.vercel.app/')
resp2 = urllib.request.urlopen(req2, timeout=10)
html = resp2.read().decode()
match = re.search(r'<title>(.*?)</title>', html)
print(f'Title: {match.group(1) if match else "N/A"}')
print('✅ Deployment verified - site is LIVE')
