'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface PropertyMapProps {
  lat: number;
  lng: number;
  title: string;
  /** Sizing/rounding for the map frame; defaults to a 400px rounded card. */
  className?: string;
}

export default function PropertyMap({ lat, lng, title, className }: PropertyMapProps) {
  // Center map on coordinates
  const position: [number, number] = [lat, lng];

  return (
    <div className={className ?? "relative z-0 h-[400px] w-full overflow-hidden rounded-3xl border border-foreground/5 shadow-sm"}>
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <span className="font-medium">{title}</span>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
