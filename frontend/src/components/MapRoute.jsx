import React from 'react'

// Lightweight SVG route renderer. Expects points: [{lat, lng, label}]
export default function MapRoute({ points = [], height = 260 }) {
  if (!points || points.length === 0) {
    return <div style={{height, borderRadius:10, background:'#e9eef0', display:'flex', alignItems:'center', justifyContent:'center'}}>No route</div>
  }

  // normalize coords to 0..100 range for simple SVG rendering
  const lats = points.map(p => p.lat)
  const lngs = points.map(p => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const pad = 6 // percent padding inside viewBox

  const project = (lat, lng) => {
    const x = maxLng === minLng ? 50 : ((lng - minLng) / (maxLng - minLng)) * (100 - pad * 2) + pad
    const y = maxLat === minLat ? 50 : (1 - (lat - minLat) / (maxLat - minLat)) * (100 - pad * 2) + pad
    return { x, y }
  }

  const coords = points.map(p => project(p.lat, p.lng))

  const path = coords.map(c => `${c.x},${c.y}`).join(' ')

  return (
    <div style={{height, borderRadius:10, overflow:'hidden', background:'#f3f6f4', boxShadow:'0 6px 18px rgba(15,20,15,0.06)'}}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:'100%',height:'100%'}}>
        <defs>
          <linearGradient id="routeGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="#1a6b3c" stopOpacity="1" />
            <stop offset="100%" stopColor="#7fcf9a" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* subtle background */}
        <rect x="0" y="0" width="100" height="100" fill="#e9efec" rx="3" />

        {/* soft shadow line behind route */}
        <polyline points={path} fill="none" stroke="#0b3f26" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.08" />

        {/* route polyline */}
        <polyline points={path} fill="none" stroke="url(#routeGrad)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />

        {/* points and labels */}
        {coords.map((c, i) => (
          <g key={i} transform={`translate(${c.x},${c.y})`}>
            <circle r="3.2" fill="#1a6b3c" stroke="#fff" strokeWidth="0.6" />
            {points[i].label && (
              <text x={6} y={-6} fontSize="3.8" fill="#173925" fontFamily="DM Serif Display, serif">{points[i].label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}
