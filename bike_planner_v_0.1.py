import requests
import configparser
import json
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

### CONFIGURATION ###
config = configparser.ConfigParser()
config.read('config/config.ini')

# Replace the Mapbox token with your Graphhopper API key in your config file
GH_API_KEY = config['DEFAULT']['GRAPHOPPER_API_KEY']
BASE_URL = "https://graphhopper.com/api/1/route"
####################

def get_route(start, end, max_speed, custom_model):
    # Mapbox Geocoder reverses lat/lon order
    start_point = [start[0], start[1]]
    end_point = [end[0], end[1]]

    params = {
        "key": GH_API_KEY
    }

    data = {
        "points": [start_point, end_point],
        "calc_points": True,
        "profile": "bike",
        "instructions": False,
        "points_encoded": False,
        # "algorthim": "alternative_route",
        # "alternative_route.max_paths": 2,
        "max_speed": max_speed,             # use the passed value
        "ch.disable": True,                # Required for custom models
        "custom_model": custom_model       # use the passed value
    }

    headers = {"Content-Type": "application/json"}
    response = requests.post(BASE_URL, params=params, json=data, headers=headers)
    response.raise_for_status()
    
    return response.json()

    
@app.route('/')
def index():
    return render_template('index.html', mapbox_token=config['DEFAULT']['MAPBOX_TOKEN'])


@app.route('/route', methods=['POST'])
def route():
    data = request.json
    start = data.get('start')  # Expected as [lon, lat]
    end = data.get('end')      # Expected as [lon, lat]
    # Get dynamic options from the client (defaulting to your current values)
    max_speed = data.get('max_speed', 25)
    custom_model = data.get('custom_model', {"priority": []})

    try:
        route_data = get_route(start, end, max_speed, custom_model)
        return jsonify(route_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
