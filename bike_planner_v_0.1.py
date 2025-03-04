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

def get_route(start, end):
    """
    Fetch a cycling route from the Graphhopper Directions API with a custom model.
    
    :param start: Tuple of (longitude, latitude) for the starting point.
    :param end: Tuple of (longitude, latitude) for the destination.
    :return: JSON response from the Graphhopper API.
    """
    # Mapbox Geocoder reverses lat/lon order
    start_point = [start[0], start[1]]
    end_point = [end[0], end[1]]

    params = {
        "key": GH_API_KEY  # API key as a URL parameter
    }

    data = {
        "points": [start_point, end_point],  # Correct format for GraphHopper API
        "calc_points": True,
        "profile": "bike",
        "instructions": False,
        "points_encoded": False,
        "distance_influence": 15,
        "algorthim": "alternative_route",
        "alternative_route.max_paths": 2,
        "max_speed": 25,
        "ch.disable": True,  # Required for custom models
        "custom_model": {
            "priority": [
                {"if": "road_class == TERTIARY", "multiply_by": "1.0"},
                {"if": "road_class == SECONDARY", "multiply_by": "0.00001"},
                {"if": "road_class == PRIMARY", "multiply_by": "0.00001"},
                # {"if": "bike_network == MISSING", "multiply_by": ".5"}
            ],
            "speed": [
                {"if": "road_class == TERTIARY", "multiply_by": "1.0"},
                {"if": "road_class == SECONDARY", "multiply_by": "0.00001"},
                {"if": "road_class == PRIMARY", "multiply_by": "0.00001"},
                # {"if": "bike_network == MISSING", "multiply_by": ".5"}
            ],
            "distance": [
                {"if": "road_class == TERTIARY", "multiply_by": "1.0"},
                {"if": "road_class == SECONDARY", "multiply_by": "0.00001"},
                {"if": "road_class == PRIMARY", "multiply_by": "0.00001"},
                # {"if": "bike_network == MISSING", "multiply_by": ".5"}
            ]

        }
    }

    headers = {
        "Content-Type": "application/json"
    }

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

    try:
        route_data = get_route(start, end)
        return jsonify(route_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
