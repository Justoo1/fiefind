"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { Property } from "./types"

// Approximate lat/lng centres — covers all cities in REGION_CITIES in tenant-discover.tsx
const AREA_COORDS: Record<string, [number, number]> = {
  // ── Greater Accra ─────────────────────────────────────────────────────────
  "Accra Central": [5.5502, -0.2174],
  Achimota: [5.6358, -0.2278],
  Adabraka: [5.5614, -0.2072],
  Airport: [5.6036, -0.1731],
  "Airport Res.": [5.6036, -0.1731],
  Ashaiman: [5.696, 0.0245],
  Cantonments: [5.5641, -0.184],
  Dome: [5.6571, -0.2376],
  Dzorwulu: [5.6099, -0.1994],
  "East Legon": [5.6341, -0.1556],
  Kasoa: [5.5319, -0.423],
  Labone: [5.5632, -0.1698],
  Lapaz: [5.6014, -0.2465],
  Madina: [5.6826, -0.168],
  Nungua: [5.5788, -0.0696],
  Osu: [5.5571, -0.1776],
  Ridge: [5.5674, -0.1951],
  Sakumono: [5.5979, -0.0512],
  Spintex: [5.6438, -0.0975],
  Teshie: [5.5755, -0.0962],
  Tema: [5.6698, 0.0166],
  Tesano: [5.5955, -0.2239],
  // ── Ashanti ───────────────────────────────────────────────────────────────
  Kumasi: [6.6885, -1.6244],
  Ahodwo: [6.678, -1.638],
  Atonsu: [6.662, -1.605],
  Bantama: [6.704, -1.63],
  Bekwai: [6.458, -1.578],
  Ejisu: [6.72, -1.472],
  Juaben: [6.781, -1.454],
  Konongo: [6.616, -1.223],
  Kwadaso: [6.695, -1.658],
  Mampong: [7.06, -1.401],
  Nhyiaeso: [6.69, -1.61],
  Obuasi: [6.2038, -1.6756],
  Suame: [6.721, -1.641],
  // ── Western ───────────────────────────────────────────────────────────────
  Takoradi: [4.8974, -1.7557],
  Sekondi: [4.9338, -1.7049],
  Tarkwa: [5.3025, -1.9935],
  Bogoso: [5.5311, -2.0428],
  Prestea: [5.4329, -2.1494],
  Axim: [4.8692, -2.2423],
  "Agona Nkwanta": [4.989, -1.899],
  Bibiani: [6.4656, -2.3289],
  Elubo: [5.0893, -3.138],
  "Half Assini": [5.034, -3.001],
  "Sefwi Wiawso": [6.2088, -2.4889],
  // ── Central ───────────────────────────────────────────────────────────────
  "Cape Coast": [5.1053, -1.2466],
  Elmina: [5.0849, -1.3497],
  Winneba: [5.353, -0.626],
  "Agona Swedru": [5.5347, -0.703],
  Saltpond: [5.203, -1.067],
  Dunkwa: [5.964, -1.781],
  Mankessim: [5.262, -1.01],
  // ── Eastern ───────────────────────────────────────────────────────────────
  Koforidua: [6.094, -0.2592],
  Nkawkaw: [6.559, -0.768],
  Nsawam: [5.804, -0.343],
  Suhum: [6.045, -0.452],
  "Akim Oda": [5.927, -0.99],
  Kibi: [6.16, -0.551],
  Akosombo: [6.294, -0.06],
  Kade: [6.088, -0.836],
  Aburi: [5.8522, -0.1769],
  Somanya: [6.112, -0.016],
  // ── Volta ─────────────────────────────────────────────────────────────────
  Ho: [6.6, 0.47],
  Hohoe: [7.152, 0.476],
  Keta: [5.915, 1.003],
  Aflao: [6.119, 1.184],
  Sogakope: [5.897, 0.594],
  Denu: [6.063, 1.138],
  Akatsi: [6.114, 0.804],
  Kpando: [6.994, 0.301],
  Jasikan: [7.406, 0.234],
  // ── Northern ──────────────────────────────────────────────────────────────
  Tamale: [9.4075, -0.8533],
  Yendi: [9.442, -0.008],
  Savelugu: [9.627, -0.822],
  Tolon: [9.45, -1.048],
  Gushegu: [9.929, -0.292],
  Kpandai: [8.468, -0.006],
  Bimbilla: [9.109, -0.084],
  // ── Upper East ────────────────────────────────────────────────────────────
  Bolgatanga: [10.7871, -0.8554],
  Navrongo: [10.896, -1.091],
  Bawku: [11.058, -0.243],
  Zebilla: [10.894, -0.524],
  Sandema: [10.812, -1.268],
  // ── Upper West ────────────────────────────────────────────────────────────
  Wa: [10.0601, -2.5099],
  Lawra: [10.653, -2.906],
  Jirapa: [10.541, -2.783],
  Nandom: [10.845, -2.755],
  Tumu: [10.887, -1.998],
  // ── Bono ──────────────────────────────────────────────────────────────────
  Sunyani: [7.3349, -2.3318],
  Berekum: [7.452, -2.586],
  "Dormaa Ahenkro": [7.299, -2.845],
  Techiman: [7.591, -1.939],
  Kintampo: [8.057, -1.729],
  Wenchi: [7.747, -2.099],
}

const REGION_COORDS: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  "Greater Accra": { center: [5.6037, -0.187], zoom: 12 },
  Ashanti: { center: [6.6885, -1.6244], zoom: 11 },
  Western: { center: [4.9338, -1.7049], zoom: 10 },
  Central: { center: [5.1053, -1.2466], zoom: 10 },
  Eastern: { center: [6.1, -0.26], zoom: 10 },
  Volta: { center: [6.6, 0.47], zoom: 10 },
  Northern: { center: [9.4075, -0.8533], zoom: 10 },
  "Upper East": { center: [10.7871, -0.8554], zoom: 10 },
  "Upper West": { center: [10.0601, -2.5099], zoom: 10 },
  Bono: { center: [7.3349, -2.3318], zoom: 10 },
}

const ACCRA_CENTRE: [number, number] = [5.6037, -0.187]

function resolveCoords(p: Property): [number, number] {
  if (p.pinX >= 4 && p.pinX <= 8 && p.pinY >= -1.5 && p.pinY <= 0.5) {
    return [p.pinX, p.pinY]
  }
  return AREA_COORDS[p.area] ?? ACCRA_CENTRE
}

function propertyMarker(title: string, price: string) {
  const label = title.length > 22 ? title.slice(0, 21) + "…" : title
  return L.divIcon({
    html: `<div style="position:relative;overflow:visible;width:0;height:0">
      <div style="position:absolute;transform:translate(-50%,-100%);background:#047857;color:#fff;border-radius:9px;padding:6px 11px 5px;box-shadow:0 3px 10px rgba(0,0,0,.32);font-family:Inter,sans-serif;border:2px solid #fff;cursor:pointer;left:0;top:0;text-align:center;min-width:90px;max-width:160px;white-space:nowrap">
        <div style="font-size:11px;font-weight:600;opacity:.88;overflow:hidden;text-overflow:ellipsis;margin-bottom:2px">${label}</div>
        <div style="font-size:13px;font-weight:800;letter-spacing:-.01em">${price}<span style="font-size:10px;font-weight:500;opacity:.8">/mo</span></div>
      </div>
    </div>`,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

// Imperative fly-to controller — must live inside MapContainer to access useMap()
function FlyController({
  region,
  area,
  properties,
}: {
  region: string
  area: string
  properties: Property[]
}) {
  const map = useMap()

  useEffect(() => {
    if (area) {
      if (AREA_COORDS[area]) {
        map.flyTo(AREA_COORDS[area], 14, { duration: 0.8 })
        return
      }
      // Derive centroid from properties that have valid pin coords in this area
      const pins = properties.filter(
        (p) => p.pinX >= 4 && p.pinX <= 8 && p.pinY >= -1.5 && p.pinY <= 0.5
      )
      if (pins.length > 0) {
        const lat = pins.reduce((s, p) => s + p.pinX, 0) / pins.length
        const lng = pins.reduce((s, p) => s + p.pinY, 0) / pins.length
        map.flyTo([lat, lng], 14, { duration: 0.8 })
        return
      }
    }
    if (region && REGION_COORDS[region]) {
      const { center, zoom } = REGION_COORDS[region]
      map.flyTo(center, zoom, { duration: 0.9 })
      return
    }
    map.flyTo(ACCRA_CENTRE, 13, { duration: 0.8 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, area])

  return null
}

interface Props {
  properties: Property[]
  onSelect: (p: Property) => void
  region?: string
  area?: string
}

export function MapPanel({
  properties,
  onSelect,
  region = "",
  area = "",
}: Props) {
  return (
    <MapContainer
      center={ACCRA_CENTRE}
      zoom={13}
      style={{ position: "absolute", inset: 0 }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <FlyController region={region} area={area} properties={properties} />
      {properties.map((p) => {
        const coords = resolveCoords(p)
        return (
          <Marker
            key={p.id}
            position={coords}
            icon={propertyMarker(p.title, p.priceShort)}
            eventHandlers={{ click: () => onSelect(p) }}
          />
        )
      })}
    </MapContainer>
  )
}
