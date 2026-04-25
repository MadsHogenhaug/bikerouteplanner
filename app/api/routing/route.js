import { NextResponse } from 'next/server';

const GH_API_KEY = process.env.GRAPHHOPPER_API_KEY;
const GH_URL = 'https://graphhopper.com/api/1/route';

export async function POST(request) {
  if (!GH_API_KEY) {
    return NextResponse.json({ error: 'Routing API key not configured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { points, custom_model } = body;
  if (!Array.isArray(points) || points.length < 2) {
    return NextResponse.json({ error: 'At least a start and end point are required' }, { status: 400 });
  }

  const payload = {
    points,
    calc_points: true,
    profile: 'bike',
    instructions: false,
    points_encoded: false,
    'ch.disable': true,
    custom_model: custom_model ?? { priority: [] },
  };

  try {
    const response = await fetch(`${GH_URL}?key=${encodeURIComponent(GH_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.message || data?.error || `GraphHopper error (status ${response.status})`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in /api/routing POST:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
