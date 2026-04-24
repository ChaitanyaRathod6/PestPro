import React, { useEffect, useRef, useState } from 'react'

// Lightweight Google Maps wrapper. Requires VITE_GOOGLE_MAPS_API_KEY set in Vite env.
export default function GoogleMap({ points = [], height = 360 }) {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) {
      setError('Missing Google Maps API key. Set VITE_GOOGLE_MAPS_API_KEY in .env')
      return
    }

    if (window.google && window.google.maps) {
      initMap()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`
    script.async = true
    script.defer = true
    script.onload = () => initMap()
    script.onerror = () => setError('Failed to load Google Maps script')
    document.head.appendChild(script)

    function initMap() {
      if (!containerRef.current) return
      const bounds = new window.google.maps.LatLngBounds()

      mapRef.current = new window.google.maps.Map(containerRef.current, {
        zoom: 13,
        streetViewControl: false,
        mapTypeControl: false,
      })

      const markers = []

      // Add provided points
      points.forEach((p) => {
        const pos = { lat: p.lat, lng: p.lng }
        const marker = new window.google.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: p.label || '',
        })
        if (p.label) {
          const inf = new window.google.maps.InfoWindow({ content: `<div style="font-family:DM Serif Display, serif">${p.label}</div>` })
          marker.addListener('click', () => inf.open({ anchor: marker, map: mapRef.current }))
        }
        markers.push(marker)
        bounds.extend(pos)
      })

      // Draw route polyline if multiple points
      if (points.length > 1) {
        const path = points.map(p => ({ lat: p.lat, lng: p.lng }))
        new window.google.maps.Polyline({
          path,
          strokeColor: '#1a6b3c',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map: mapRef.current,
        })
      }

      // Try to get user's current position and add marker
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const myPos = { lat: pos.coords.latitude, lng: pos.coords.longitude }
            const myMarker = new window.google.maps.Marker({
              position: myPos,
              map: mapRef.current,
              title: 'Your location',
              icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#2b7e4a', fillOpacity: 1, strokeWeight: 2, strokeColor: '#fff' }
            })
            bounds.extend(myPos)
            mapRef.current.fitBounds(bounds)
          },
          () => {
            if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds)
          }
        )
      } else {
        if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds)
      }
    }

    // cleanup: do not remove script (may be reused)
    return () => {}
  }, [points])

  return (
    <div style={{ height, borderRadius: 8, overflow: 'hidden', background: '#e9eef0' }}>
      {error ? (
        <div style={{ padding: 12, color: '#c0392b' }}>{error}</div>
      ) : (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      )}
    </div>
  )
}
