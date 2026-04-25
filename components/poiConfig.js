const S3_BASE = 'https://tilesets-bikerouteplanner.s3.eu-north-1.amazonaws.com';

const DEFAULT_POINT_PAINT = {
  'circle-radius': 5,
  'circle-stroke-width': 1,
  'circle-stroke-color': '#fff',
};

const DEFAULT_CLUSTER_PAINT = {
  mediumThreshold: 20,
  largeThreshold: 100,
  smallRadius: 15,
  mediumRadius: 20,
  largeRadius: 25,
};

const buildPoi = ({
  id,
  buttonLabel,
  slug,
  sourceLayerName,
  bounds,
  defaultName,
  websiteProp = 'website',
  clusterColors,
  pointColor,
  clusterPaint = {},
  pointPaint = {},
}) => ({
  id,
  buttonLabel,
  sourceId: `${id}-vector-source`,
  clusterLayerId: `${id}-clusters`,
  countLayerId: `${id}-count`,
  pointLayerId: `${id}-points`,
  tileUrlTemplate: `${S3_BASE}/${slug}/{z}/{x}/{y}.pbf`,
  sourceLayerName,
  bounds,
  maxZoom: 14,
  clusterPaint: {
    ...DEFAULT_CLUSTER_PAINT,
    smallColor: clusterColors[0],
    mediumColor: clusterColors[1],
    largeColor: clusterColors[2],
    ...clusterPaint,
  },
  pointPaint: {
    ...DEFAULT_POINT_PAINT,
    'circle-color': pointColor,
    ...pointPaint,
  },
  popupProperties: {
    nameProp: 'name',
    websiteProp,
    defaultName,
  },
});

export const poiConfiguration = [
  buildPoi({
    id: 'shelters',
    buttonLabel: 'Shelters',
    slug: 'dk_shelters',
    sourceLayerName: 'denmark_shelters',
    bounds: [8.134441, 54.582451, 15.111020, 57.704343],
    defaultName: 'Unnamed Shelter',
    clusterColors: ['#FFA500', '#FFD700', '#FF8C00'],
    pointColor: '#FF4500',
  }),
  buildPoi({
    id: 'hotels',
    buttonLabel: 'Hotels',
    slug: 'dk_hotels',
    sourceLayerName: 'denmark_hotels',
    bounds: [8.113837, 54.576042, 15.143804, 57.727772],
    defaultName: 'Unnamed Hotel',
    websiteProp: 'contact:website',
    clusterColors: ['#1E90FF', '#87CEFA', '#4682B4'],
    pointColor: '#4169E1',
    clusterPaint: { mediumThreshold: 15, largeThreshold: 75, smallRadius: 14, mediumRadius: 19, largeRadius: 24 },
    pointPaint: { 'circle-radius': 5.5 },
  }),
];
