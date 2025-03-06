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

def get_route(points, max_speed, custom_model):
    """
    Get a route from GraphHopper with optional via points.

    :param points: A list of coordinates [[lon, lat], [lon, lat], ...]
    :param max_speed: Maximum speed constraint
    :param custom_model: Custom GraphHopper model
    :return: Route JSON response
    """
    params = {
        "key": GH_API_KEY
    }

    data = {
        "points": points,  # List of points including start, via, and end
        "calc_points": True,
        "profile": "bike",
        "instructions": False,
        "points_encoded": False,
        "max_speed": max_speed,  # use the passed value
        "ch.disable": True,  # Required for custom models
        "custom_model": custom_model  # use the passed value
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
    raw_points = data.get('points')  #

    if not raw_points or len(raw_points) < 2:
        return jsonify({"error": "At least a start and end point are required"}), 400


    points = [[point[0], point[1]] for point in raw_points]

    max_speed = data.get('max_speed', 25)
    custom_model = data.get('custom_model', {"priority": []})

    try:
        route_data = get_route(points, max_speed, custom_model)
        return jsonify(route_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
