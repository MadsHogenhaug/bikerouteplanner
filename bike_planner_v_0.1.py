import requests
import configparser
import json
from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

### CONFIGURATION ###
config = configparser.ConfigParser()
config.read('/home/mads/Desktop/bikeplanner/config.ini')

MAPBOX_TOKEN = config['DEFAULT']['MAPBOX_TOKEN']
BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/cycling"
####################

def get_route(start, end):
    """
    Fetch a cycling route from Mapbox Directions API.
    
    :param start: Tuple of (longitude, latitude) for the starting point.
    :param end: Tuple of (longitude, latitude) for the destination.
    :return: JSON response from the Mapbox API.
    """
    coordinates = f"{start[0]},{start[1]};{end[0]},{end[1]}"
    params = {
        "access_token": MAPBOX_TOKEN,
        "geometries": "geojson",
        "overview": "full",
        "steps": "true",
        "alternatives": "true",
        "exclude": "ferry"
    }
    response = requests.get(f"{BASE_URL}/{coordinates}", params=params)
    response.raise_for_status()
    return response.json()

@app.route('/')
def index():
    return render_template('index.html', mapbox_token=MAPBOX_TOKEN)

@app.route('/route', methods=['POST'])
def route():
    data = request.json
    start = data.get('start')  # Expected as [lon, lat]
    end = data.get('end')      # Expected as [lon, lat]
    try:
        route_data = get_route(start, end)
        return jsonify(route_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)