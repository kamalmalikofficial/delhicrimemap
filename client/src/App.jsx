
import { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, GeoJSON, Polygon, useMap } from "react-leaflet";

import delhiBoundary from "./data/Delhi_Boundary.json";
import delhiWards from "./data/Delhi_Wards.json";
import WardHeatMap from "./compo/heatmap";

import "./App.css";

// ======================================================
// CONFIG & API SETUP
// ======================================================

// Replace the string below with your actual deployed Render URL once created
const API_URL = import.meta.env.VITE_API_URL || "https://your-render-backend-name.onrender.com/api/crime";

// ======================================================
// UPDATE SCHEDULE
// ======================================================

const LAST_UPDATE = new Date("2026-08-27T08:00:00+05:30");

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const diff = targetDate - new Date();
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
    <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "14px", color: "#00ffff", marginTop: "4px" }}>
      Next update in: {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
    </div>
  );
}

function getNextUpdate() {
  const next = new Date(LAST_UPDATE);
  const now = new Date();

  while (next <= now) {
    next.setDate(next.getDate() + 2);
  }

  next.setHours(8, 0, 0, 0);
  return next;
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
// HELPER COMPONENTS
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
    e.stopPropagation();
    e.preventDefault();
    map.setView(center, zoom, { animate: true });
  };

  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: "61px" }}>
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
          background: "linear-gradient(to right, #00ffff, #00ff00, #ffff00, #ff0000)",
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
  const [nextUpdate, setNextUpdate] = useState(getNextUpdate());
  const [hoveredWard, setHoveredWard] = useState(null);
  const [zoomLevel] = useState(11);

  useEffect(() => {
    let isMounted = true;

    const fetchCrimes = async () => {
      try {
        const res = await axios.get(API_URL, { timeout: 60000 });
        if (isMounted) {
          setCrimes(res.data);
        }
      } catch (err) {
        console.error("Error fetching crime data:", err);
      } finally {
        if (isMounted) {
          setLoading(false); // Unmounts the loading video once backend responds or fails
        }
      }
    };

    fetchCrimes();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextUpdate(getNextUpdate());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleSection = (section) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  const delhiCoords = delhiBoundary.features[0].geometry.coordinates[0].map(
    ([lng, lat]) => [lat, lng]
  );

  const worldMask = [
    [
      [-90, -180],
      [-90, 180],
      [90, 180],
      [90, -180],
    ],
    delhiCoords,
  ];

  return (
    <div className="app">
      {/* SIDEBAR PANEL */}
      <aside className="control-panel">
        <div className="panel-top">
          <div className="title">
            <h1>Delhi Crime Map</h1>
          </div>

          <div className="update-info">
            <div>Last update: {formatDate(LAST_UPDATE)} {formatTime(LAST_UPDATE)}</div>
            <CountdownTimer targetDate={nextUpdate} />
          </div>

          <div className="hover-card">
            <h3>{hoveredWard ? hoveredWard.name : "Hover over for more info !!"}</h3>
            Total Crime: {hoveredWard ? hoveredWard.totalCrimes : crimes.length}
          </div>
        </div>

        <div className="panel-spacer"></div>

        <div className="panel-bottom">
          <AccordionItem
            title="Disclaimer"
            open={openSection === "disclaimer"}
            onClick={() => toggleSection("disclaimer")}
          >
            ⚠️ Data aggregated from public sources. May contain duplicates, inaccuracies, or incomplete information. Locations are approximate. Don't refer for any official purpose.
          </AccordionItem>

          <div className="glowing-line" />

          <AccordionItem
            title="Contact Us"
            open={openSection === "contact"}
            onClick={() => toggleSection("contact")}
          >
            Questions or feedback? <br /> Mail : kamalmalik2006@gmail.com <br /> Github :
          </AccordionItem>
        </div>
      </aside>

      {/* MAP WRAPPER */}
      <main className="map-wrapper" style={{ position: "relative" }}>
        {/* VIDEO LOADING OVERLAY */}
        {loading && (
          <div className="video-loading-overlay">
            <video autoPlay loop muted playsInline preload="auto" className="loading-video">
              <source src="/loading-loop.mp4" type="video/mp4" />
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
          <RecenterButton center={[28.6139, 77.209]} zoom={11} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <Polygon
            positions={worldMask}
            pathOptions={{
              fillColor: "black",
              fillOpacity: 0.4,
              stroke: false,
            }}
          />

          <GeoJSON
            data={delhiBoundary}
            style={{
              color: "red",
              weight: 3,
              dashArray: "4, 6",
              fillOpacity: 0.05,
            }}
          />

          <WardHeatMap
            crimes={crimes}
            wardsGeoJSON={delhiWards}
            setHoveredWard={setHoveredWard}
          />
        </MapContainer>

        {/* LEGEND OVERLAY */}
        <MapLegend />
      </main>
    </div>
  );
}

export default App;