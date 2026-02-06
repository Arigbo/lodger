'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  zoom?: number;
}

// Component to handle map clicks and marker updates
function MapEvents({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to recenter map when coordinates change externally (e.g., from Sensing)
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function LocationPickerMap({ lat, lng, onChange, zoom = 15 }: LocationPickerMapProps) {
  const position: [number, number] = [lat || 6.5244, lng || 3.3792]; // Default to Lagos if empty
  const [markerPos, setMarkerPos] = useState<[number, number]>(position);

  useEffect(() => {
    if (lat && lng) {
      setMarkerPos([lat, lng]);
    }
  }, [lat, lng]);

  const handleMarkerDrag = (e: any) => {
    const { lat, lng } = e.target.getLatLng();
    setMarkerPos([lat, lng]);
    onChange(lat, lng);
  };

  return (
    <div className="w-full h-[300px] md:h-[400px] rounded-[2rem] overflow-hidden border-2 border-foreground/5 shadow-xl relative z-0">
      <MapContainer 
        center={position} 
        zoom={zoom} 
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <ChangeView center={position} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onChange={(newLat, newLng) => {
          setMarkerPos([newLat, newLng]);
          onChange(newLat, newLng);
        }} />
        <Marker 
          position={markerPos} 
          draggable={true}
          eventHandlers={{
            dragend: handleMarkerDrag,
          }}
        >
        </Marker>
      </MapContainer>
      <div className="absolute bottom-4 left-4 z-[1000] bg-background/80 backdrop-blur-md px-4 py-2 rounded-xl border-2 border-primary/20 shadow-lg">
        <p className="text-[10px] font-black uppercase tracking-widest text-primary">Map Protocol Active</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-1">Click or drag marker to adjust positioning</p>
      </div>
    </div>
  );
}
