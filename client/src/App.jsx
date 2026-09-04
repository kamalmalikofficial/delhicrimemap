import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polygon,
  useMap,
} from "react-leaflet";

import delhiBoundary from "./data/Delhi_Boundary.json";
import delhiWards from "./data/Delhi_Wards.json";
import WardHeatMap from "./compo/heatmap";

import "./App.css";

// ======================================================
// CONFIG
// ======================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://your-render-backend-name.onrender.com/api/crime";

const BASE_UPDATE_ANCHOR = new Date("2026-08-27T08:00:00+05:30");
const UPDATE_INTERVAL_DAYS = 2;

// ======================================================
// UPDATE SCHEDULE
// ======================================================

function getLastUpdate() {
  const now = new Date();
  let last = new Date(BASE_UPDATE_ANCHOR);

  if (last > now) return last;

  while (true) {
    const next = new Date(last);
    next.setDate(next.getDate() + UPDATE_INTERVAL_DAYS);

    if (next > now) break;
    last = next;
  }

  return last;
}

function getNextUpdate() {
  const next = new Date(getLastUpdate());
  next.setDate(next.getDate() + UPDATE_INTERVAL_DAYS);
  return next;
}

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const diff = targetDate.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ hours, minutes, seconds });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontWeight: "bold",
        fontSize: "14px",
        color: "#00ffff",
        marginTop: "4px",
      }}
    >
      Next update in: {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m{" "}
      {pad(timeLeft.seconds)}s
    </div>
  );
}

function formatDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ======================================================
// WARD HELPERS
// ======================================================

// Every place that handles ward numbers uses this same normalizer.
export function extractWardId(obj) {
  if (!obj) return null;

  const rawId =
    obj.wardNo ??
    obj.ward_no ??
    obj.ward_id ??
    obj.ward_num ??
    obj.WARD_NO ??
    obj.WARD_NUM ??
    obj.Ward_No ??
    obj.id;

  if (rawId === undefined || rawId === null) return null;

  const value = String(rawId).trim();

  if (!value) return null;

  // "005" -> "5"
  return value.replace(/^0+/, "") || "0";
}

// ======================================================
// SMALL UI COMPONENTS
// ======================================================

function AccordionItem({ title, open, onClick, children }) {
  return (
    <div className={`accordion-item ${open ? "accordion-open" : ""}`}>
      <button className="accordion-button" onClick={onClick}>
        <span>{title}</span>
        <span className="accordion-icon">{open ? "−" : "+"}</span>
      </button>

      {open && <div className="accordion-content">{children}</div>}
    </div>
  );
}

function RecenterButton({ center = [28.6139, 77.209], zoom = 11 }) {
  const map = useMap();

  const handleRecenter = (e) => {
    e.preventDefault();
    e.stopPropagation();

    map.setView(center, zoom, { animate: true });
  };

  return (
    <div
      className="leaflet-top leaflet-left"
      style={{ marginTop: "61px" }}
    >
      <div className="leaflet-control leaflet-bar">
        <a
          href="#"
          title="Reset Map View"
          role="button"
          aria-label="Reset Map"
          onClick={handleRecenter}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            textDecoration: "none",
            color: "black",
          }}
        >
          ↺
        </a>
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div
      className="map-legend"
      style={{
        position: "absolute",
        bottom: "20px",
        right: "0px",
        height: "30px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        border: "1px solid #ccc",
        borderRadius: "6px",
        padding: "10px 10px",
        zIndex: 1000,
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        fontFamily: "Arial, sans-serif",
        minWidth: "248px",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "15px",
          borderRadius: "3px",
          background:
            "linear-gradient(to right, #00ffff, #00ff00, #ffff00, #ff0000)",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#555",
          marginTop: "1px",
        }}
      >
        <span>low</span>
        <span>high</span>
      </div>
    </div>
  );
}

// ======================================================
// MAIN APP
// ======================================================

function App() {
  const [crimes, setCrimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openSection, setOpenSection] = useState(null);

  const [lastUpdate, setLastUpdate] = useState(getLastUpdate());
  const [nextUpdate, setNextUpdate] = useState(getNextUpdate());

  const [hoveredWard, setHoveredWard] = useState(null);
  const [zoomLevel] = useState(11);

  // ----------------------------------------------------
  // FETCH CRIMES
  // ----------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const fetchCrimes = async () => {
      try {
        const res = await axios.get(API_URL, {
          timeout: 60000,
        });

        if (!isMounted) return;

        const data = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.crimes)
          ? res.data.crimes
          : [];

        setCrimes(data);
      } catch (err) {
        console.error("Error fetching crime data:", err);

        if (isMounted) {
          setCrimes([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCrimes();

    return () => {
      isMounted = false;
    };
  }, []);

  // ----------------------------------------------------
  // UPDATE TIMER
  // ----------------------------------------------------

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(getLastUpdate());
      setNextUpdate(getNextUpdate());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // ----------------------------------------------------
  // SELECTED WARD
  // ----------------------------------------------------

  const targetWardId = useMemo(
    () => extractWardId(hoveredWard),
    [hoveredWard]
  );

  const hoveredWardCrimes = useMemo(() => {
    if (!targetWardId || !Array.isArray(crimes)) {
      return [];
    }

    return crimes.filter(
      (crime) => extractWardId(crime) === targetWardId
    );
  }, [crimes, targetWardId]);

  const latestCrimes = useMemo(() => {
    return [...hoveredWardCrimes]
      .sort((a, b) => {
        const dateA = new Date(
          a.publishedAt || a.createdAt || a.timestamp || 0
        ).getTime();

        const dateB = new Date(
          b.publishedAt || b.createdAt || b.timestamp || 0
        ).getTime();

        return dateB - dateA;
      })
      .slice(0, 3);
  }, [hoveredWardCrimes]);

  // ----------------------------------------------------
  // UI HELPERS
  // ----------------------------------------------------

  const toggleSection = (section) => {
    setOpenSection((current) =>
      current === section ? null : section
    );
  };

  const delhiCoords = useMemo(() => {
    const geometry = delhiBoundary?.features?.[0]?.geometry;

    if (!geometry) return [];

    if (geometry.type === "Polygon") {
      return (
        geometry.coordinates?.[0]?.map(([lng, lat]) => [
          lat,
          lng,
        ]) || []
      );
    }

    if (geometry.type === "MultiPolygon") {
      return (
        geometry.coordinates?.[0]?.[0]?.map(([lng, lat]) => [
          lat,
          lng,
        ]) || []
      );
    }

    return [];
  }, []);

  const worldMask = useMemo(
    () => [
      [
        [-90, -180],
        [-90, 180],
        [90, 180],
        [90, -180],
      ],
      delhiCoords,
    ],
    [delhiCoords]
  );

  const wardDisplayName = useMemo(() => {
    if (!hoveredWard) {
      return "Hover over for more info !!";
    }

    return (
      hoveredWard.name ||
      hoveredWard.wardName ||
      hoveredWard.Ward_Name ||
      hoveredWard.WARD_NAME ||
      (targetWardId ? `Ward ${targetWardId}` : "Selected Ward")
    );
  }, [hoveredWard, targetWardId]);

  const wardCrimeCount = useMemo(() => {
    if (!hoveredWard) {
      return crimes.length;
    }

    // Prefer the actual filtered records so the sidebar and list
    // always agree with each other.
    return hoveredWardCrimes.length;
  }, [hoveredWard, hoveredWardCrimes.length, crimes.length]);

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="control-panel">
        <div className="panel-top">
          <div className="title">
            <h1>Delhi Crime Map</h1>
          </div>

          <div className="update-info">
            <div>
              Last update: {formatDate(lastUpdate)}{" "}
              {formatTime(lastUpdate)}
            </div>

            <CountdownTimer targetDate={nextUpdate} />
          </div>

          <div className="hover-card">
            <h3>{wardDisplayName}</h3>

            <div>
              {hoveredWard ? "Ward Crimes: " : "Total Crimes: "}
              <strong>{wardCrimeCount}</strong>
            </div>

            <div
              style={{
                marginTop: "10px",
                borderTop: "1px solid rgba(255,255,255,0.2)",
                paddingTop: "8px",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "12px",
                  marginBottom: "6px",
                }}
              >
                Latest 3 Reported Crimes:
              </div>

              {hoveredWard && latestCrimes.length > 0 ? (
                <ol
                  style={{
                    margin: 0,
                    paddingLeft: "18px",
                    fontSize: "12px",
                    textAlign: "left",
                  }}
                >
                  {latestCrimes.map((item, idx) => (
                    <li
                      key={item._id || item.id || item.url || idx}
                      style={{
                        marginBottom: "6px",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#00ffff",
                            textDecoration: "underline",
                          }}
                        >
                          {item.title || "Untitled Incident"}
                        </a>
                      ) : (
                        <span>
                          {item.title || "Untitled Incident"}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <span
                  style={{
                    fontSize: "12px",
                    opacity: 0.7,
                  }}
                >
                  {hoveredWard
                    ? "No crime records in this ward"
                    : "Hover over a ward to see records"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="panel-spacer"></div>

        <div className="panel-bottom">
          <AccordionItem
            title="Disclaimer"
            open={openSection === "disclaimer"}
            onClick={() => toggleSection("disclaimer")}
          >
            ⚠️ Data aggregated from public sources. May contain
            duplicates, inaccuracies, or incomplete information.
            Locations are approximate. Don't refer for any official
            purpose.
          </AccordionItem>

          <div className="glowing-line" />

          <AccordionItem
            title="Contact Us"
            open={openSection === "contact"}
            onClick={() => toggleSection("contact")}
          >
            Questions or feedback? <br />
            Mail : kamalmalik2006@gmail.com <br />
            Github :
          </AccordionItem>
        </div>
      </aside>

      {/* MAP */}
      <main
        className="map-wrapper"
        style={{ position: "relative" }}
      >
        {loading && (
          <div className="video-loading-overlay">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="loading-video"
            >
              <source
                src="/loading-loop.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        )}

        <MapContainer
          center={[28.6139, 77.209]}
          zoom={zoomLevel}
          minZoom={10}
          maxZoom={13}
          boxZoom={false}
          className="map-container"
        >
          <RecenterButton
            center={[28.6139, 77.209]}
            zoom={11}
          />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {worldMask[1].length > 0 && (
            <Polygon
              positions={worldMask}
              pathOptions={{
                fillColor: "black",
                fillOpacity: 0.4,
                stroke: false,
              }}
            />
          )}

          {delhiBoundary && (
            <GeoJSON
              data={delhiBoundary}
              style={{
                color: "red",
                weight: 3,
                dashArray: "4, 6",
                fillOpacity: 0.05,
              }}
            />
          )}

          <WardHeatMap
            crimes={crimes}
            wardsGeoJSON={delhiWards}
            setHoveredWard={setHoveredWard}
          />
        </MapContainer>

        <MapLegend />
      </main>
    </div>
  );
}

export default App;
