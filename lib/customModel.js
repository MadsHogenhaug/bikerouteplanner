const toNumber = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function buildCustomModel(prefs) {
  const priority = [
    { if: 'road_class == PRIMARY', multiply_by: toNumber(prefs.primary) ?? 1 },
    { if: 'road_class == SECONDARY', multiply_by: toNumber(prefs.secondary) ?? 1 },
    { if: 'road_class == TERTIARY', multiply_by: toNumber(prefs.tertiary) ?? 1 },
    { if: 'bike_network == MISSING', multiply_by: toNumber(prefs.bikeNetwork) ?? 1 },
  ];

  const surface = toNumber(prefs.surface);
  if (surface !== null) {
    priority.push({ if: 'surface == GRAVEL', multiply_by: surface });
  }

  return { priority };
}
