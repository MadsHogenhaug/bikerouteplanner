// app/api/routing/route.js
import { NextResponse } from 'next/server';
import axios from 'axios';

const GH_API_KEY = process.env.GRAPHOPPER_API_KEY;  // from .env or your environment
const BASE_URL = 'https://graphhopper.com/api/1/route';

/**
 * Helper function to call GraphHopper's route API.
 */
async function getRoute(points, maxSpeed, customModel) {
  const params = { key: GH_API_KEY };

  const data = {
    points,            // array of [lon, lat] pairs
    calc_points: true,
    profile: 'bike',
    instructions: false,
    points_encoded: false,
    max_speed: maxSpeed,
    'ch.disable': true,
    custom_model: customModel,
  };

  const headers = {
    'Content-Type': 'application/json',
  };

  const response = await axios.post(BASE_URL, data, { params, headers });
  return response.data;
}

/**
 * The POST handler for our Next.js 13 App Router API route.
 * This is called when the frontend does fetch('/api/routing', { method: 'POST', ... }).
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { points, max_speed, custom_model } = body;

    // Basic validation
    if (!points || points.length < 2) {
      return NextResponse.json(
        { error: 'At least a start and end point are required' },
        { status: 400 }
      );
    }

    // Set defaults if not provided
    const maxSpeed = max_speed || 25;
    const cm = custom_model || { priority: [] };

    // Call the helper function to get data from GraphHopper
    const routeData = await getRoute(points, maxSpeed, cm);

    // Return the result as JSON
    return NextResponse.json(routeData);
  } catch (error) {
    console.error('Error in /api/routing POST:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
