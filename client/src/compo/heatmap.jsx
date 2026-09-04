/*import React, { useMemo } from "react";
import { GeoJSON, useMap } from "react-leaflet";

/*
  Delhi Crime Ward Heatmap

  - Uses the last 8 days of crimes.
  - Recent crimes contribute more than older crimes.
  - Uses log scaling so high-crime wards don't dominate the whole map.
  - Color palette:
      light yellow -> yellow-green -> green -> dark green -> dark purple
*/

/*const COLOR_STOPS = [
  "#fafabd",
  "#FDE725",
  "#5EC962",
  "#2fbe88",
  "#005a32",
  "#3f007d",
];

function interpolateColor(colors, value) {
  if (value <= 0) return colors[0];
  if (value >= 1) return colors[colors.length - 1];

  const scaled = value * (colors.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;

  const c1 = colors[index];
  const c2 = colors[Math.min(index + 1, colors.length - 1)];

  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);

  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * fraction);
  const g = Math.round(g1 + (g2 - g1) * fraction);
  const b = Math.round(b1 + (b2 - b1) * fraction);

  return `rgb(${r}, ${g}, ${b})`;
}

function HeatMap({ crimes, wardsGeoJSON }) {
  const map = useMap();

  const { wardCounts, wardLogScores, maxLogScore, totalCrimes } = useMemo(() => {
    const counts = {};
    const now = Date.now();
    const MS_IN_A_DAY = 24 * 60 * 60 * 1000;

    if (!crimes?.length) {
      return {
        wardCounts: {},
        wardLogScores: {},
        maxLogScore: 0,
        totalCrimes: 0,
      };
    }

    crimes.forEach((crime) => {
      const rawDate =
        crime.createdAt ||
        crime.publishedAt ||
        crime.timestamp;

      if (!rawDate) return;

      const crimeDate = new Date(rawDate);

      if (isNaN(crimeDate.getTime())) return;

      const daysAgo =
        (now - crimeDate.getTime()) / MS_IN_A_DAY;

      // Only consider the latest 8 days.
      if (daysAgo >= 8 || daysAgo < 0) return;

      const wardNo = String(crime.wardNo || "").trim();

      if (!wardNo) return;

      // Recent crimes get higher weight.
      const weight = 1 - daysAgo / 8;

      counts[wardNo] = (counts[wardNo] || 0) + weight;
    });

    const logScores = {};
    let maxLog = 0;
    let total = 0;

    Object.entries(counts).forEach(([wardNo, count]) => {
      total += count;

      // Log transform:
      // 0 -> 0
      // 1 -> log(2)
      // 10 -> log(11)
      // 100 -> log(101)
      const logScore = Math.log1p(count);

      logScores[wardNo] = logScore;

      if (logScore > maxLog) {
        maxLog = logScore;
      }
    });

    return {
      wardCounts: counts,
      wardLogScores: logScores,
      maxLogScore: maxLog,
      totalCrimes: total,
    };
  }, [crimes]);

  const getColor = (wardNo) => {
    const logScore = wardLogScores[wardNo] || 0;

    if (logScore <= 0 || maxLogScore <= 0) {
      return "#ffffff";
    }

    const normalized =
      logScore / maxLogScore;

    return interpolateColor(
      COLOR_STOPS,
      normalized
    );
  };

  const styleFeature = (feature) => {
    const wardNo = String(
      feature.properties?.Ward_No || ""
    ).trim();

    const score = wardCounts[wardNo] || 0;

    return {
      fillColor: getColor(wardNo),
      fillOpacity: score > 0 ? 0.78 : 0.08,
      color: "transparent",
      weight: 0,
      opacity: 0,
    };
  };

  const onEachFeature = (feature, layer) => {
    const wardNo = String(
      feature.properties?.Ward_No || ""
    ).trim();

    const wardName =
      feature.properties?.Ward_Name ||
      `Ward ${wardNo}`;

    const crimeCount =
      wardCounts[wardNo] || 0;

    const logScore =
      wardLogScores[wardNo] || 0;

    const intensity =
      maxLogScore > 0
        ? logScore / maxLogScore
        : 0;

    let level = "No activity";

    if (intensity > 0.8) level = "Very High";
    else if (intensity > 0.6) level = "High";
    else if (intensity > 0.4) level = "Moderate";
    else if (intensity > 0.2) level = "Low";
    else if (intensity > 0) level = "Very Low";

    layer.bindTooltip(
      `<div style="font-family: sans-serif;">
        <strong>${wardName}</strong><br/>
        Ward: ${wardNo}<br/>
        Weighted crimes: ${crimeCount.toFixed(1)}<br/>
        Intensity: ${level}
      </div>`,
      {
        sticky: true,
      }
    );
  };

  if (!wardsGeoJSON) return null;

  return (
    <>
      <GeoJSON
        key={`${maxLogScore}-${Object.keys(wardCounts).length}`}
        data={wardsGeoJSON}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      <div
        style={{
          position: "absolute",
          bottom: "25px",
          right: "20px",
          zIndex: 1000,
          background: "rgba(255,255,255,0.94)",
          padding: "12px 14px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          width: "220px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            fontSize: "13px",
            marginBottom: "5px",
          }}
        >
          CRIME INTENSITY
        </div>

        <div
          style={{
            fontSize: "11px",
            color: "#555",
            marginBottom: "7px",
          }}
        >
          Last 8 days · log-scaled
        </div>

        <div
          style={{
            height: "14px",
            borderRadius: "4px",
            background: `linear-gradient(to right, ${COLOR_STOPS.join(", ")})`,
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            marginTop: "4px",
          }}
        >
          <span>LOW</span>
          <span>HIGH</span>
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#666",
            marginTop: "6px",
          }}
        >
          Total weighted crimes: {totalCrimes.toFixed(1)}
        </div>
      </div>
    </>
  );
}

export default HeatMap;*/

/*import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// Simple point-in-polygon check to keep generated points strictly inside ward bounds
function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Extract bounding box for faster random sampling
function getBBox(coords) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  return { minLng, maxLng, minLat, maxLat };
}

function HeatMap({ crimes, wardsGeoJSON }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !crimes?.length || !wardsGeoJSON?.features) return;

    // 1. Calculate ward intensity scores
    const counts = {};
    const now = new Date();
    const MS_IN_DAY = 24 * 60 * 60 * 1000;

    crimes.forEach((c) => {
      const rawDate = c.createdAt || c.publishedAt || c.timestamp;
      if (!rawDate) return;
      const daysAgo = (now - new Date(rawDate)) / MS_IN_DAY;
      if (daysAgo >= 8 || daysAgo < 0) return;

      const wardNo = String(c.wardNo || "").trim();
      if (wardNo) {
        counts[wardNo] = (counts[wardNo] || 0) + (1 - daysAgo / 8);
      }
    });

    const heatPoints = [];

    // 2. Scatter heatmap points within each ward based on score
    wardsGeoJSON.features.forEach((feature) => {
      const wardNo = String(feature.properties?.Ward_No || "").trim();
      const score = counts[wardNo] || 0;
      if (score <= 0) return;

      const geom = feature.geometry;
      let rawCoords = [];
      if (geom.type === "Polygon") rawCoords = geom.coordinates[0];
      else if (geom.type === "MultiPolygon") rawCoords = geom.coordinates[0][0];

      if (!rawCoords.length) return;

      const bbox = getBBox(rawCoords);
      const pointsToGenerate = Math.min(60, Math.floor(score * 1200) + 10);
      let added = 0;
      let attempts = 0;

      // Fill polygon geometry with points
      while (added < pointsToGenerate && attempts < 3000) {
        attempts++;
        const rndLat = bbox.minLat + Math.random() * (bbox.maxLat - bbox.minLat);
        const rndLng = bbox.minLng + Math.random() * (bbox.maxLng - bbox.minLng);

        if (pointInPolygon([rndLng, rndLat], rawCoords)) {
          // [lat, lng, intensity]
          heatPoints.push([rndLat, rndLng, 0.45]);
          added++;
        }
      }
    });

    // 3. Render raw Leaflet heat canvas
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 45,
      blur: 18,
      maxZoom: 15,
      max: 1.0,
      gradient: {
        0.2: "blue",
        0.4: "lime",
        0.6: "yellow",
        0.8: "orange",
        1.0: "red"
      }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, crimes, wardsGeoJSON]);

  return null;
}

export default HeatMap;

*/
//version 3
/*
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// Fast point-in-polygon check to keep points strictly within the ward
function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Extract ward bounds
function getBBox(coords) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  return { minLng, maxLng, minLat, maxLat };
}

function HeatMap({ crimes, wardsGeoJSON }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !crimes?.length || !wardsGeoJSON?.features) return;

    const now = new Date();
    const MS_IN_DAY = 24 * 60 * 60 * 1000;

    // 1. Group crime incidents by exact Ward String
    const wardIncidents = {};

    crimes.forEach((c) => {
      const rawDate = c.createdAt || c.publishedAt || c.timestamp;
      if (!rawDate) return;

      const crimeDate = new Date(rawDate);
      if (isNaN(crimeDate.getTime())) return;

      const daysAgo = (now - crimeDate) / MS_IN_DAY;
      if (daysAgo >= 8 || daysAgo < 0) return; // Ignore older than 8 days

      const wardNo = String(c.wardNo || "").trim();
      if (!wardNo) return;

      if (!wardIncidents[wardNo]) wardIncidents[wardNo] = [];
      wardIncidents[wardNo].push(daysAgo);
    });

    const heatPoints = [];

    // 2. Process each Ward Feature in GeoJSON
    wardsGeoJSON.features.forEach((feature) => {
      const wardNo = String(feature.properties?.Ward_No || "").trim();
      const incidentDays = wardIncidents[wardNo];

      if (!incidentDays || incidentDays.length === 0) return;

      // Extract geometry array
      const geom = feature.geometry;
      let rawCoords = [];
      if (geom.type === "Polygon") rawCoords = geom.coordinates[0];
      else if (geom.type === "MultiPolygon") rawCoords = geom.coordinates[0][0];

      if (!rawCoords || rawCoords.length === 0) return;

      const bbox = getBBox(rawCoords);

      // Generate points for every crime in this ward based on its age
      incidentDays.forEach((daysAgo) => {
        // Fresh news (0-2 days): ~60 points (High Density -> Red)
        // Mid news (3-5 days): ~25 points (Medium Density -> Yellow)
        // Old news (6-8 days): ~8 points (Low Density -> Cyan)
        const recencyWeight = Math.max(0, 1 - daysAgo / 8);
        const pointCount = Math.floor(8 + recencyWeight * 52);

        let added = 0;
        let attempts = 0;

        while (added < pointCount && attempts < 300) {
          attempts++;
          const rndLat = bbox.minLat + Math.random() * (bbox.maxLat - bbox.minLat);
          const rndLng = bbox.minLng + Math.random() * (bbox.maxLng - bbox.minLng);

          if (pointInPolygon([rndLng, rndLat], rawCoords)) {
            // [lat, lng, intensity]
            heatPoints.push([rndLat, rndLng, 0.4]); 
            added++;
          }
        }
      });
    });

    if (heatPoints.length === 0) return;

    // 3. Render Canvas Heat Layer with Cyan -> Yellow -> Red gradient
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 22,
      blur: 16,
      maxZoom: 15,
      max: 1.0,
      gradient: {
        0.15: "#00ffff", // Cyan (Sparse / Old news)
        0.4:  "#00ff00", // Green
        0.65: "#ffff00", // Yellow (Mid age)
        1.0:  "#ff0000", // Bright Red (Dense / Fresh news)
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, crimes, wardsGeoJSON]);

  return null;
}

export default HeatMap;
*/
// version 5
/*import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// Fast point-in-polygon check
function pointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Bounding box & area calculation
function getBBoxAndArea(coords) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  const deltaLat = maxLat - minLat;
  const deltaLng = maxLng - minLng;
  // Geometric area factor
  const approxArea = Math.max(0.00005, deltaLat * deltaLng);

  return { minLng, maxLng, minLat, maxLat, approxArea };
}

function HeatMap({ crimes, wardsGeoJSON }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !crimes?.length || !wardsGeoJSON?.features) return;

    const now = new Date();
    const MS_IN_DAY = 24 * 60 * 60 * 1000;

    // 1. Group crime incident recency by Ward String
    const wardIncidents = {};

    crimes.forEach((c) => {
      const rawDate = c.createdAt || c.publishedAt || c.timestamp;
      if (!rawDate) return;

      const crimeDate = new Date(rawDate);
      if (isNaN(crimeDate.getTime())) return;

      const daysAgo = (now - crimeDate) / MS_IN_DAY;
      if (daysAgo >= 8 || daysAgo < 0) return; // Ignore older than 8 days

      const wardNo = String(c.wardNo || "").trim();
      if (!wardNo) return;

      if (!wardIncidents[wardNo]) wardIncidents[wardNo] = [];
      wardIncidents[wardNo].push(daysAgo);
    });

    const heatPoints = [];

    // Reference area (average ward bounding size in Delhi degrees)
    const REFERENCE_AREA = 0.0005;

    // 2. Process Ward Features with Area Scaling
    wardsGeoJSON.features.forEach((feature) => {
      const wardNo = String(feature.properties?.Ward_No || "").trim();
      const incidentDays = wardIncidents[wardNo];

      if (!incidentDays || incidentDays.length === 0) return;

      // Extract geometry coordinates
      const geom = feature.geometry;
      let rawCoords = [];
      if (geom.type === "Polygon") rawCoords = geom.coordinates[0];
      else if (geom.type === "MultiPolygon") rawCoords = geom.coordinates[0][0];

      if (!rawCoords || rawCoords.length === 0) return;

      const { minLng, maxLng, minLat, maxLat, approxArea } = getBBoxAndArea(rawCoords);

      // Area Factor: Larger ward needs proportionally more points to match density
      const areaMultiplier = Math.min(3.5, Math.max(0.5, approxArea / REFERENCE_AREA));

      // Generate scattered heat points per crime incident
      incidentDays.forEach((daysAgo) => {
        const recencyWeight = Math.max(0, 1 - daysAgo / 8);
        
        // Base points per crime scaled by time decay AND ward area
        const basePoints = 6 + recencyWeight * 40;
        const targetPointCount = Math.floor(basePoints * areaMultiplier);

        let added = 0;
        let attempts = 0;

        while (added < targetPointCount && attempts < 350) {
          attempts++;
          const rndLat = minLat + Math.random() * (maxLat - minLat);
          const rndLng = minLng + Math.random() * (maxLng - minLng);

          if (pointInPolygon([rndLng, rndLat], rawCoords)) {
            // [lat, lng, radius intensity]
            heatPoints.push([rndLat, rndLng, 0.45]);
            added++;
          }
        }
      });
    });

    if (heatPoints.length === 0) return;

    // 3. Render Leaflet Canvas Heat Layer
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 26,
      maxZoom: 15,
      max: 1.0,
      gradient: {
        0.15: "#00ffff", // Cyan (Faint / Old news)
        0.4:  "#00ff00", // Green
        0.65: "#ffff00", // Yellow (Mid recency)
        1.0:  "#ff0000", // Deep Red (Fresh news hotspot)
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, crimes, wardsGeoJSON]);

  return null;
}

export default HeatMap;
*/
//ver 5
import { useEffect, useMemo } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

// ======================================================
// HELPERS
// ======================================================

function normalizeWardId(value) {
  if (value === undefined || value === null) return null;

  const str = String(value).trim();

  if (!str) return null;

  return str.replace(/^0+/, "") || "0";
}

function getCrimeWardId(crime) {
  if (!crime) return null;

  return normalizeWardId(
    crime.wardNo ??
      crime.ward_no ??
      crime.ward_id ??
      crime.ward_num ??
      crime.WARD_NO ??
      crime.WARD_NUM ??
      crime.Ward_No ??
      crime.id
  );
}

function getFeatureWardId(feature) {
  const properties = feature?.properties;

  if (!properties) return null;

  return normalizeWardId(
    properties.Ward_No ??
      properties.ward_no ??
      properties.wardNo ??
      properties.WARD_NO ??
      properties.WARD_NUM ??
      properties.ward_num ??
      properties.ward_id ??
      properties.id
  );
}

function getFeatureWardName(feature, wardNo) {
  const properties = feature?.properties;

  return (
    properties?.Ward_Name ??
    properties?.ward_name ??
    properties?.WardName ??
    properties?.wardName ??
    properties?.WARD_NAME ??
    (wardNo ? `Ward ${wardNo}` : "Unknown Ward")
  );
}

function getCrimeDate(crime) {
  return (
    crime?.publishedAt ??
    crime?.createdAt ??
    crime?.timestamp ??
    null
  );
}

function getDaysAgo(crime) {
  const rawDate = getCrimeDate(crime);

  if (!rawDate) return null;

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) return null;

  return (Date.now() - date.getTime()) / (24 * 60 * 60 * 1000);
}

// Fast point-in-polygon check.
// point = [longitude, latitude]
// polygon coordinates = [[longitude, latitude], ...]
function pointInPolygon(point, polygon) {
  const x = point[0];
  const y = point[1];

  let inside = false;

  for (
    let i = 0, j = polygon.length - 1;
    i < polygon.length;
    j = i++
  ) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];

    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersects =
      yi > y !== yj > y &&
      x <
        ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function getBBox(coords) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  coords.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });

  return {
    minLng,
    maxLng,
    minLat,
    maxLat,
  };
}

function getPolygonRings(geometry) {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return geometry.coordinates || [];
  }

  if (geometry.type === "MultiPolygon") {
    return (geometry.coordinates || []).flatMap(
      (polygon) => polygon || []
    );
  }

  return [];
}

function getOuterRing(geometry) {
  const rings = getPolygonRings(geometry);

  if (!rings.length) return null;

  return rings[0];
}

// ======================================================
// CONSTANTS
// ======================================================

const MAX_HEAT_DAYS = 8;

const COLOR_STOPS = [
  "#00ffff",
  "#00ff00",
  "#ffff00",
  "#ff0000",
];

// ======================================================
// COMPONENT
// ======================================================

function HeatMap({
  crimes = [],
  wardsGeoJSON,
  setHoveredWard,
}) {
  const map = useMap();

  // ----------------------------------------------------
  // ALL CRIME COUNTS BY WARD
  // Used by hover/sidebar.
  // ----------------------------------------------------

  const wardTotals = useMemo(() => {
    const totals = {};

    if (!Array.isArray(crimes)) {
      return totals;
    }

    crimes.forEach((crime) => {
      const wardNo = getCrimeWardId(crime);

      if (!wardNo) return;

      totals[wardNo] = (totals[wardNo] || 0) + 1;
    });

    return totals;
  }, [crimes]);

  // ----------------------------------------------------
  // RECENT INCIDENTS BY WARD
  // Used only for the heatmap.
  // ----------------------------------------------------

  const recentWardIncidents = useMemo(() => {
    const incidents = {};

    if (!Array.isArray(crimes)) {
      return incidents;
    }

    crimes.forEach((crime) => {
      const wardNo = getCrimeWardId(crime);
      const daysAgo = getDaysAgo(crime);

      if (!wardNo || daysAgo === null) return;

      // Only last 8 days contribute to heatmap.
      if (daysAgo < 0 || daysAgo >= MAX_HEAT_DAYS) {
        return;
      }

      if (!incidents[wardNo]) {
        incidents[wardNo] = [];
      }

      incidents[wardNo].push(daysAgo);
    });

    return incidents;
  }, [crimes]);

  // ----------------------------------------------------
  // CREATE HEAT LAYER
  // ----------------------------------------------------

  useEffect(() => {
    if (!map || !wardsGeoJSON?.features) {
      return undefined;
    }

    const heatPoints = [];

    wardsGeoJSON.features.forEach((feature) => {
      const wardNo = getFeatureWardId(feature);

      if (!wardNo) return;

      const incidentDays =
        recentWardIncidents[wardNo];

      if (!incidentDays?.length) return;

      const rings = getPolygonRings(feature.geometry);

      if (!rings.length) return;

      // Generate heat points separately for every outer ring.
      rings.forEach((ring) => {
        if (!ring || ring.length < 3) return;

        const bbox = getBBox(ring);

        if (
          !Number.isFinite(bbox.minLng) ||
          !Number.isFinite(bbox.maxLng) ||
          !Number.isFinite(bbox.minLat) ||
          !Number.isFinite(bbox.maxLat)
        ) {
          return;
        }

        incidentDays.forEach((daysAgo) => {
          const recencyWeight = Math.max(
            0,
            1 - daysAgo / MAX_HEAT_DAYS
          );

          // More recent crime = more heat points.
          const pointCount = Math.floor(
            8 + recencyWeight * 42
          );

          let added = 0;
          let attempts = 0;

          while (
            added < pointCount &&
            attempts < 500
          ) {
            attempts++;

            const lng =
              bbox.minLng +
              Math.random() *
                (bbox.maxLng - bbox.minLng);

            const lat =
              bbox.minLat +
              Math.random() *
                (bbox.maxLat - bbox.minLat);

            if (pointInPolygon([lng, lat], ring)) {
              // [latitude, longitude, intensity]
              heatPoints.push([
                lat,
                lng,
                Math.max(0.25, recencyWeight),
              ]);

              added++;
            }
          }
        });
      });
    });

    if (!heatPoints.length) {
      return undefined;
    }

    const heatLayer = L.heatLayer(
      heatPoints,
      {
        radius: 25,
        blur: 18,
        maxZoom: 15,
        max: 1.0,
        minOpacity: 0.18,
        gradient: {
          0.15: COLOR_STOPS[0],
          0.4: COLOR_STOPS[1],
          0.65: COLOR_STOPS[2],
          1.0: COLOR_STOPS[3],
        },
      }
    ).addTo(map);

    return () => {
      if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [
    map,
    wardsGeoJSON,
    recentWardIncidents,
  ]);

  // ----------------------------------------------------
  // WARD HOVER HANDLERS
  // ----------------------------------------------------

  const onEachFeature = (feature, layer) => {
    const wardNo = getFeatureWardId(feature);
    const wardName = getFeatureWardName(
      feature,
      wardNo
    );

    const totalCrimes =
      wardNo ? wardTotals[wardNo] || 0 : 0;

    layer.on({
      mouseover: (event) => {
        const target = event.target;

        target.setStyle({
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.12,
        });

        if (target.bringToFront) {
          target.bringToFront();
        }

        // IMPORTANT:
        // Send wardNo to App as well as the name/count.
        // App uses this ID to filter crimes.
        if (setHoveredWard) {
          setHoveredWard({
            wardNo,
            name: wardName,
            wardName,
            Ward_Name: wardName,
            totalCrimes,
          });
        }
      },

      mouseout: (event) => {
        const target = event.target;

        target.setStyle({
          color: "transparent",
          weight: 0,
          opacity: 0,
          fillOpacity: 0,
        });

        if (setHoveredWard) {
          setHoveredWard(null);
        }
      },
    });
  };

  // ----------------------------------------------------
  // RENDER INTERACTIVE WARD LAYER
  // ----------------------------------------------------

  if (!wardsGeoJSON?.features) {
    return null;
  }

  return (
    <GeoJSON
      key={`interactive-wards-${crimes.length}-${Object.keys(
        wardTotals
      ).length}`}
      data={wardsGeoJSON}
      style={() => ({
        fillColor: "transparent",
        fillOpacity: 0,
        color: "transparent",
        opacity: 0,
        weight: 0,
      })}
      onEachFeature={onEachFeature}
    />
  );
}

export default HeatMap;
