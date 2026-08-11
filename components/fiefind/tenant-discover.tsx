"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useApp } from "./context"
import { usePublicProperties } from "@/hooks/useTenant"
import type { Property } from "./types"

const MapPanel = dynamic(() => import("./MapPanel").then((m) => m.MapPanel), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      className="ph-gradient"
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        Loading map…
      </span>
    </div>
  ),
})

// Major cities/towns per region — shown in area dropdown even before listings exist there
const REGION_CITIES: Record<string, string[]> = {
  "Greater Accra": [
    "Accra Central",
    "Achimota",
    "Adabraka",
    "Airport",
    "Airport Res.",
    "Ashaiman",
    "Cantonments",
    "Dome",
    "Dzorwulu",
    "East Legon",
    "Kasoa",
    "Labone",
    "Lapaz",
    "Madina",
    "Nungua",
    "Osu",
    "Ridge",
    "Sakumono",
    "Spintex",
    "Teshie",
    "Tema",
    "Tesano",
  ],
  Ashanti: [
    "Kumasi",
    "Ahodwo",
    "Atonsu",
    "Bantama",
    "Bekwai",
    "Ejisu",
    "Juaben",
    "Konongo",
    "Kwadaso",
    "Mampong",
    "Nhyiaeso",
    "Obuasi",
    "Suame",
  ],
  Western: [
    "Takoradi",
    "Sekondi",
    "Tarkwa",
    "Bogoso",
    "Prestea",
    "Axim",
    "Agona Nkwanta",
    "Bibiani",
    "Elubo",
    "Half Assini",
    "Sefwi Wiawso",
  ],
  Central: [
    "Cape Coast",
    "Elmina",
    "Winneba",
    "Kasoa",
    "Agona Swedru",
    "Saltpond",
    "Dunkwa",
    "Mankessim",
  ],
  Eastern: [
    "Koforidua",
    "Nkawkaw",
    "Nsawam",
    "Suhum",
    "Akim Oda",
    "Kibi",
    "Akosombo",
    "Kade",
    "Aburi",
    "Somanya",
  ],
  Volta: [
    "Ho",
    "Hohoe",
    "Keta",
    "Aflao",
    "Sogakope",
    "Denu",
    "Akatsi",
    "Kpando",
    "Jasikan",
  ],
  Northern: [
    "Tamale",
    "Yendi",
    "Savelugu",
    "Tolon",
    "Gushegu",
    "Kpandai",
    "Bimbilla",
  ],
  "Upper East": ["Bolgatanga", "Navrongo", "Bawku", "Zebilla", "Sandema"],
  "Upper West": ["Wa", "Lawra", "Jirapa", "Nandom", "Tumu"],
  Bono: [
    "Sunyani",
    "Berekum",
    "Dormaa Ahenkro",
    "Techiman",
    "Kintampo",
    "Wenchi",
  ],
}

type FilterKey = "all" | "max6mo" | "2beds" | "3dtour"

function advanceMonths(advance: string): number {
  const match = advance.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

function applyAllFilters(
  properties: Property[],
  region: string,
  area: string,
  chip: FilterKey
): Property[] {
  let result = properties
  if (region) result = result.filter((p) => p.region === region)
  if (area) result = result.filter((p) => p.area === area)
  switch (chip) {
    case "max6mo":
      return result.filter((p) => advanceMonths(p.advance) <= 3)
    case "2beds":
      return result.filter((p) => p.beds >= 2)
    default:
      return result
  }
}

function locationHeading(region: string, area: string): string {
  if (area && region) return `${area}, ${region}`
  if (region) return region
  if (area) return area
  return "Ghana"
}

export function DiscoverView() {
  const { actions } = useApp()
  const { data: properties = [], isLoading } = usePublicProperties()
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")
  const [regionFilter, setRegionFilter] = useState("")
  const [areaFilter, setAreaFilter] = useState("")

  // Regions: always from live data (only show regions that have listings)
  const regionOptions = [...new Set(properties.map((p) => p.region))].sort()

  // Areas: when a region is selected, merge curated city list + live listing areas
  // When no region, show only areas from live listings (too many cities to list all)
  const areaOptions = regionFilter
    ? [
        ...new Set([
          ...(REGION_CITIES[regionFilter] ?? []),
          ...properties
            .filter((p) => p.region === regionFilter)
            .map((p) => p.area),
        ]),
      ].sort()
    : [...new Set(properties.map((p) => p.area))].sort()

  const filtered = applyAllFilters(
    properties,
    regionFilter,
    areaFilter,
    activeFilter
  )
  const hasLocationFilter = Boolean(regionFilter || areaFilter)

  function setRegion(r: string) {
    setRegionFilter(r)
    setAreaFilter("") // reset area when region changes
  }

  function clearLocation() {
    setRegionFilter("")
    setAreaFilter("")
  }

  function toggle(key: FilterKey) {
    setActiveFilter((prev) => (prev === key ? "all" : key))
  }

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
      }}
    >
      {/* List panel */}
      <div
        style={{
          width: "52%",
          minWidth: 0,
          overflowY: "auto",
          padding: "24px 28px",
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-.02em",
              margin: 0,
            }}
          >
            Homes in {locationHeading(regionFilter, areaFilter)}
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "4px 0 0",
              fontSize: 14,
            }}
          >
            {isLoading
              ? "Loading…"
              : `${filtered.length} verified listing${filtered.length !== 1 ? "s" : ""}`}{" "}
            · 0% agent fees
          </p>
        </div>

        {/* Location filters */}
        <div
          style={{
            display: "flex",
            gap: 10,
            margin: "18px 0 12px",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <svg
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
              <circle cx={12} cy={10} r={2.5} />
            </svg>
            <select
              value={regionFilter}
              onChange={(e) => setRegion(e.target.value)}
              style={{
                width: "100%",
                appearance: "none",
                background: regionFilter
                  ? "var(--ff-accent-soft)"
                  : "var(--bg-surface)",
                border: regionFilter
                  ? "1.5px solid var(--ff-accent)"
                  : "1px solid var(--ff-border)",
                borderRadius: 8,
                padding: "9px 28px 9px 30px",
                fontSize: 13,
                fontWeight: 600,
                color: regionFilter
                  ? "var(--ff-accent-strong)"
                  : "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option value="">All regions</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <svg
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          <div style={{ position: "relative", flex: 1 }}>
            <svg
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
              viewBox="0 0 24 24"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              style={{
                width: "100%",
                appearance: "none",
                background: areaFilter
                  ? "var(--ff-accent-soft)"
                  : "var(--bg-surface)",
                border: areaFilter
                  ? "1.5px solid var(--ff-accent)"
                  : "1px solid var(--ff-border)",
                borderRadius: 8,
                padding: "9px 28px 9px 30px",
                fontSize: 13,
                fontWeight: 600,
                color: areaFilter
                  ? "var(--ff-accent-strong)"
                  : "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <option value="">All areas / towns</option>
              {areaOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <svg
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                color: "var(--text-muted)",
              }}
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {hasLocationFilter && (
            <button
              onClick={clearLocation}
              title="Clear location filters"
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 8,
                border: "1px solid var(--ff-border)",
                background: "var(--bg-subtle)",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Quick-filter chips */}
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <Chip
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18M7 12h10M11 18h2" />
            </svg>
            All listings
          </Chip>
          <Chip
            active={activeFilter === "max6mo"}
            onClick={() => toggle("max6mo")}
          >
            Max 3mo advance
          </Chip>
          <Chip
            active={activeFilter === "2beds"}
            onClick={() => toggle("2beds")}
          >
            2+ beds
          </Chip>
          <Chip
            active={activeFilter === "3dtour"}
            onClick={() => toggle("3dtour")}
          >
            3D tour
          </Chip>
        </div>

        {/* Property cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="ph-gradient"
                style={{ height: 240, borderRadius: 12 }}
              />
            ))
          ) : filtered.length > 0 ? (
            filtered.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onClick={() => actions.openListing(p)}
              />
            ))
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "48px 0",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              {properties.length === 0
                ? "No listings available yet."
                : "No listings match these filters."}
            </div>
          )}
        </div>
      </div>

      {/* Map panel */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          borderLeft: "1px solid var(--ff-border)",
          overflow: "hidden",
          height: "100%",
        }}
      >
        <MapPanel
          properties={filtered}
          onSelect={(p) => actions.openListing(p)}
          region={regionFilter}
          area={areaFilter}
        />
      </div>
    </div>
  )
}

function navUrl(p: Property): string {
  const validPin = p.pinX >= 4 && p.pinX <= 8 && p.pinY >= -1.5 && p.pinY <= 0.5
  if (validPin) return `https://maps.google.com/maps?q=${p.pinX},${p.pinY}`
  if (p.ghanaPostGps)
    return `https://maps.google.com/maps?q=${encodeURIComponent(p.ghanaPostGps + ", Ghana")}`
  return `https://maps.google.com/maps?q=${encodeURIComponent(p.area + ", " + p.region + ", Ghana")}`
}

function PropertyCard({
  property: p,
  onClick,
}: {
  property: Property
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick()
      }}
      style={{
        width: "100%",
        border: "1px solid var(--ff-border)",
        borderRadius: 12,
        background: "var(--bg-surface)",
        cursor: "pointer",
        textAlign: "left",
        padding: 0,
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        font: "inherit",
        color: "var(--text-primary)",
        transition: "box-shadow .15s",
      }}
    >
      {/* Photo placeholder */}
      <div
        style={{
          position: "relative",
          height: 172,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        className="ph-gradient"
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {p.title}
        </span>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            gap: 6,
          }}
        >
          <VerifiedBadge />
          <TourBadge />
        </div>
      </div>

      {/* Details */}
      <div style={{ padding: "14px 16px 16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div
            style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.01em" }}
          >
            {p.title}
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: "var(--ff-accent-strong)",
              }}
            >
              {p.priceLabel}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              / month
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "var(--text-muted)",
            fontSize: 13,
            margin: "4px 0 12px",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
            <circle cx={12} cy={10} r={2.5} />
          </svg>
          {p.area}
          {p.ghanaPostGps && (
            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "var(--ff-accent-strong)",
                fontWeight: 700,
              }}
            >
              {p.ghanaPostGps}
            </span>
          )}
          <a
            href={navUrl(p)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open in Maps"
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 3,
              color: "var(--ff-accent)",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
              <circle cx={12} cy={10} r={2.5} />
            </svg>
            Navigate
          </a>
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            fontSize: 13,
            fontWeight: 500,
            borderTop: "1px solid var(--ff-border)",
            paddingTop: 12,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "var(--text-muted)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 8h18a2 2 0 0 1 2 2v9M2 4v15M2 17h20M6 8V6" />
            </svg>
            {p.beds} bd
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "var(--text-muted)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22a7 7 0 0 0 7-7c0-4-7-12-7-12S5 11 5 15a7 7 0 0 0 7 7Z" />
            </svg>
            {p.baths} ba
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "var(--text-muted)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={15}
              height={15}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
            {p.sqft} sqft
          </span>
          <span
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "var(--ff-accent-strong)",
              fontWeight: 600,
            }}
          >
            {p.advance} advance
          </span>
        </div>
      </div>
    </div>
  )
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: active ? "var(--ff-accent)" : "var(--bg-surface)",
        color: active ? "#fff" : "var(--text-primary)",
        border: active ? "none" : "1px solid var(--ff-border)",
        borderRadius: 999,
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        font: "inherit",
      }}
    >
      {children}
    </button>
  )
}

export function VerifiedBadge() {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "var(--bg-surface)",
        color: "var(--ff-accent-strong)",
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 8px",
        borderRadius: 6,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={12}
        height={12}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      Verified
    </span>
  )
}

export function TourBadge() {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "rgba(17,24,39,.72)",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        padding: "4px 8px",
        borderRadius: 6,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={12}
        height={12}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 2 9 5v10l-9 5-9-5V7Z" />
        <path d="m3.3 7 8.7 5 8.7-5M12 12v10" />
      </svg>
      3D tour
    </span>
  )
}
