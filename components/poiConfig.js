// components/poiConfig.js

export const poiConfiguration = [
    {
        id: 'shelters',
        buttonLabel: 'Shelters',
        sourceId: 'shelters-vector-source', 
        clusterLayerId: 'shelters-clusters', 
        countLayerId: 'shelters-count',      
        pointLayerId: 'shelters-points',     
        tileUrlTemplate: "https://tilesets-bikerouteplanner.s3.eu-north-1.amazonaws.com/dk_shelters/{z}/{x}/{y}.pbf", // S3 AWS Path
        sourceLayerName: 'denmark_shelters', // Check Tippecanoe -l flag
        bounds: [8.134441, 54.582451, 15.111020, 57.704343],
        maxZoom: 14,
        clusterPaint: { // MUST exist and have valid properties
            smallColor: '#FFA500', mediumColor: '#FFD700', largeColor: '#FF8C00',
            mediumThreshold: 20, largeThreshold: 100,
            smallRadius: 15, mediumRadius: 20, largeRadius: 25
        },
        pointPaint: { // MUST exist and have valid properties
            'circle-color': '#FF4500', 'circle-radius': 5,
            'circle-stroke-width': 1, 'circle-stroke-color': '#fff'
        },
        popupProperties: { // MUST exist
            nameProp: 'name',         // MUST exist - points to GeoJSON property
            websiteProp: 'website',   // MUST exist - points to GeoJSON property (can be null/missing in data)
            defaultName: 'Unnamed Shelter' // MUST exist - provides fallback string
        }
    },
    {
        id: 'hotels',
        buttonLabel: 'Hotels',
        sourceId: 'hotels-vector-source',   
        clusterLayerId: 'hotels-clusters',  
        countLayerId: 'hotels-count',       
        pointLayerId: 'hotels-points',      
        tileUrlTemplate: "https://tilesets-bikerouteplanner.s3.eu-north-1.amazonaws.com/dk_hotels/{z}/{x}/{y}.pbf", // S3 AWS Path
        sourceLayerName: 'denmark_hotels',  // Check Tippecanoe -l flag
        bounds: [8.113837,54.576042,15.143804,57.727772],
        maxZoom: 14,
        clusterPaint: { // MUST exist and have valid properties
            smallColor: '#1E90FF', mediumColor: '#87CEFA', largeColor: '#4682B4',
            mediumThreshold: 15, largeThreshold: 75,
            smallRadius: 14, mediumRadius: 19, largeRadius: 24
        },
        pointPaint: { // MUST exist and have valid properties
            'circle-color': '#4169E1', 'circle-radius': 5.5,
            'circle-stroke-width': 1, 'circle-stroke-color': '#fff'
        },
        popupProperties: { // MUST exist
            nameProp: 'name',           // MUST exist - points to GeoJSON property
            websiteProp: 'contact:website', // MUST exist - points to GeoJSON property
            defaultName: 'Unnamed Hotel' // MUST exist - provides fallback string
        }
    },
    // ...
];