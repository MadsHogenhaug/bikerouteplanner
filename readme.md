# Vector Tile Generation and S3 Upload Workflow

This document outlines the steps to generate vector tiles from a GeoJSON file using Tippecanoe and subsequently upload them to an AWS S3 bucket for web map hosting.

## Overview

The process involves two main steps:

1.  **Tile Generation:** Using the `tippecanoe` command-line tool to convert a GeoJSON dataset into a directory structure containing PBF vector tiles, optimized with clustering for lower zoom levels.
2.  **Cloud Upload:** Using the `aws s3 sync` command to synchronize the generated tile directory with an AWS S3 bucket, setting appropriate metadata for web serving.

## Prerequisites

Before you begin, ensure you have the following installed and configured:

1.  **Tippecanoe:** A tool for building vector tilesets from GeoJSON and other data formats.
    *   Installation instructions: [https://github.com/mapbox/tippecanoe#installation](https://github.com/mapbox/tippecanoe#installation)
2.  **AWS CLI:** The AWS Command Line Interface.
    *   Installation instructions: [https://aws.amazon.com/cli/](https://aws.amazon.com/cli/)
    *   Ensure it's configured with appropriate AWS credentials that have permissions to write to the target S3 bucket (`s3:PutObject`, `s3:ListBucket`, etc.). You can configure it using `aws configure`.
3.  **Input Data:** A GeoJSON file containing the features you want to tile.
4.  **AWS S3 Bucket:** An S3 bucket created and accessible via your AWS CLI configuration.

## Steps

### 1. Generate Vector Tiles with Tippecanoe

This step uses the `tippecanoe` command to process your input GeoJSON. It creates vector tiles for zoom levels up to 14 and outputs them into a specified directory. It applies clustering up to zoom level 13.

**Command Structure:**

`tippecanoe [OPTIONS] [INPUT_GEOJSON_FILE]`

**Command to Run:**

Execute the following command in your terminal, replacing the bracketed placeholders with your actual values. Note that this is presented as a single logical command, even if you type it across multiple lines using `\` in your actual terminal:

`tippecanoe -z14 --maximum-zoom=14 -e [YOUR_OUTPUT_DIRECTORY] --drop-rate=1 --cluster-distance=25 --cluster-maxzoom=13 --no-tile-compression [YOUR_INPUT_GEOJSON_FILE.geojson]`

**Explanation of Tippecanoe Flags Used:**

*   `-z14` / `--maximum-zoom=14`: Sets the maximum zoom level to generate tiles for.
*   `-e [YOUR_OUTPUT_DIRECTORY]`: Specifies the output directory for the tiles (`{z}/{x}/{y}.pbf`). **Replace `[YOUR_OUTPUT_DIRECTORY]`**.
*   `--drop-rate=1`: Controls feature dropping at lower zooms (1 = drop minimally).
*   `--cluster-distance=25`: Sets the pixel distance for clustering points.
*   `--cluster-maxzoom=13`: Sets the maximum zoom level where clustering occurs. Above this zoom, points are unclustered.
*   `--no-tile-compression`: Outputs uncompressed PBF tiles. Important if compression is handled later (e.g., by S3/CDN).
*   `[YOUR_INPUT_GEOJSON_FILE.geojson]`: Path to your input GeoJSON. **Replace `[YOUR_INPUT_GEOJSON_FILE.geojson]`**.

**Example Command:**

Here's how the command might look with example values:

`tippecanoe -z14 --maximum-zoom=14 -e ./my_bike_route_tiles --drop-rate=1 --cluster-distance=25 --cluster-maxzoom=13 --no-tile-compression input/bike_routes.geojson`

After running this, you should have a local directory (e.g., `./my_bike_route_tiles`) containing the tile structure.

### 2. Upload Tiles to AWS S3

This step uses the `aws s3 sync` command to upload the generated tile directory to your S3 bucket. It sets appropriate `Content-Type` and `Content-Encoding` metadata headers.

**Command Structure:**

`aws s3 sync [LOCAL_DIRECTORY] [S3_DESTINATION_PATH] [OPTIONS]`

**Command to Run:**

Execute the following command in your terminal, replacing the bracketed placeholders. Again, this is presented as a single logical command:

`aws s3 sync [YOUR_OUTPUT_DIRECTORY] s3://tilesets-bikerouteplanner/[YOUR_S3_TARGET_FOLDER] --content-type "application/vnd.mapbox-vector-tile" --content-encoding "gzip"`

**Explanation of AWS CLI Components Used:**

*   `aws s3 sync`: The command to synchronize directories.
*   `[YOUR_OUTPUT_DIRECTORY]`: The local directory created by Tippecanoe (use the same name as in Step 1). **Replace `[YOUR_OUTPUT_DIRECTORY]`**.
*   `s3://tilesets-bikerouteplanner/[YOUR_S3_TARGET_FOLDER]`: The destination path in S3.
    *   `tilesets-bikerouteplanner`: Your bucket name.
    *   `[YOUR_S3_TARGET_FOLDER]`: The target folder within the bucket. **Replace `[YOUR_S3_TARGET_FOLDER]`**.
*   `--content-type "application/vnd.mapbox-vector-tile"`: Sets the correct MIME type for vector tiles.
*   `--content-encoding "gzip"`: Sets the encoding metadata header. **Important:** This assumes the tiles *will be served* gzipped (e.g., by CloudFront). Since Tippecanoe used `--no-tile-compression`, the files themselves are not gzipped during upload. Adjust this flag or your serving setup accordingly (see Notes).

**Example Command:**

Here's how the command might look with example values:

`aws s3 sync ./my_bike_route_tiles s3://tilesets-bikerouteplanner/bike-routes-v1 --content-type "application/vnd.mapbox-vector-tile" --content-encoding "gzip"`

## Placeholders Summary

Remember to replace these placeholders in the commands:

*   `[YOUR_OUTPUT_DIRECTORY]`: The local directory name for generated tiles (e.g., `my_tiles`).
*   `[YOUR_INPUT_GEOJSON_FILE.geojson]`: The path to your source GeoJSON file (e.g., `data/source.geojson`).
*   `[YOUR_S3_TARGET_FOLDER]`: The target folder name within your S3 bucket (e.g., `project-alpha/tileset-v2`).

## Notes

*   **Alternative Output (`.mbtiles`):** Tippecanoe can output to a single `.mbtiles` file using the `-o output.mbtiles` flag instead of `-e DIR_NAME`. Tools like `mb-util` can extract tiles from an `.mbtiles` file later if needed.
*   **Compression Strategy:** Re-read the note in Step 2 regarding `--content-encoding "gzip"`. Ensure your setup matches this header (e.g., use CloudFront for compression) or remove the flag if serving uncompressed tiles directly from S3.
*   **AWS Costs:** Be mindful of S3 storage and data transfer costs.
*   **Permissions:** Ensure the S3 bucket policy or object ACLs allow public read access if serving tiles to a public web map.