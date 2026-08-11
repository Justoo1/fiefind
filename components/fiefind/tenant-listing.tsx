"use client"

import { useApp } from "./context"
import { VerifiedBadge } from "./tenant-discover"
import type { Property } from "./types"

function navUrl(p: Property): string {
  const validPin = p.pinX >= 4 && p.pinX <= 8 && p.pinY >= -1.5 && p.pinY <= 0.5
  if (validPin) return `https://maps.google.com/maps?q=${p.pinX},${p.pinY}`
  if (p.ghanaPostGps)
    return `https://maps.google.com/maps?q=${encodeURIComponent(p.ghanaPostGps + ", Ghana")}`
  return `https://maps.google.com/maps?q=${encodeURIComponent(p.area + ", " + p.region + ", Ghana")}`
}

function uberUrl(p: Property): string {
  const validPin = p.pinX >= 4 && p.pinX <= 8 && p.pinY >= -1.5 && p.pinY <= 0.5
  if (validPin)
    return `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${p.pinX}&dropoff[longitude]=${p.pinY}`
  const dest = encodeURIComponent(
    p.ghanaPostGps
      ? `${p.ghanaPostGps}, Ghana`
      : `${p.area}, ${p.region}, Ghana`
  )
  return `https://m.uber.com/ul/?action=setPickup&dropoff[formatted_address]=${dest}`
}

export function ListingDetailView() {
  const { state, actions } = useApp()
  const p = state.selectedProperty
  if (!p) return null

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 28px 48px" }}>
      <button onClick={actions.navDiscover} style={backBtnStyle}>
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 6-6 6 6 6" />
        </svg>
        Back to search
      </button>

      {/* Photo grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 10,
          height: 340,
          marginBottom: 24,
        }}
      >
        {/* Main – 3D walkthrough CTA */}
        <button
          onClick={actions.openWalk}
          style={{
            position: "relative",
            border: "none",
            borderRadius: 14,
            overflow: "hidden",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="ph-gradient"
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(17,24,39,.18)",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              color: "#fff",
            }}
          >
            <div
              className="ff-pulse-ring"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(255,255,255,.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={26}
                height={26}
                fill="var(--ff-accent)"
                stroke="none"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                textShadow: "0 1px 3px rgba(0,0,0,.4)",
              }}
            >
              Start 3D walkthrough
            </span>
          </div>
        </button>

        {/* Side thumbnails */}
        <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 10 }}>
          <div
            className="ph-gradient"
            style={{
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Living room
          </div>
          <div
            className="ph-gradient"
            style={{
              position: "relative",
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Kitchen
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(17,24,39,.5)",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              +6 photos
            </div>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 32,
          alignItems: "start",
        }}
      >
        {/* Left col */}
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <VerifiedBadge />
            <span
              style={{
                background: "var(--bg-subtle)",
                color: "var(--text-muted)",
                fontSize: 12,
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 6,
              }}
            >
              {p.type}
            </span>
          </div>

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-.02em",
              margin: "0 0 6px",
            }}
          >
            {p.title}
          </h1>
          {p.streetAddress && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={14}
                height={14}
                fill="none"
                stroke="var(--ff-accent)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              {p.streetAddress}
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-muted)",
              fontSize: 15,
              marginBottom: 10,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
              <circle cx={12} cy={10} r={2.5} />
            </svg>
            {p.area}, {p.region}
            {p.ghanaPostGps && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: 12,
                  background: "var(--bg-subtle)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ff-accent-strong)",
                  fontWeight: 700,
                }}
              >
                {p.ghanaPostGps}
              </span>
            )}
          </div>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 22,
              flexWrap: "wrap",
            }}
          >
            <a
              href={navUrl(p)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-subtle)",
                border: "1px solid var(--ff-border)",
                color: "var(--text-primary)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="var(--ff-accent)"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z" />
                <circle cx={12} cy={10} r={2.5} />
              </svg>
              Open in Maps
            </a>
            <a
              href={uberUrl(p)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "var(--bg-subtle)",
                border: "1px solid var(--ff-border)",
                color: "var(--text-primary)",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx={12} cy={12} r={10} />
                <path d="M12 8v4l3 3" />
              </svg>
              Get a ride (Uber/Bolt)
            </a>
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
            {[
              { val: p.beds, label: "Bedrooms" },
              { val: p.baths, label: "Bathrooms" },
              { val: p.sqft, label: "Sq ft" },
            ].map(({ val, label }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  border: "1px solid var(--ff-border)",
                  borderRadius: 10,
                  padding: 14,
                  textAlign: "center",
                  background: "var(--bg-surface)",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 800 }}>{val}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>
            About this home
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: 15,
              lineHeight: 1.65,
              margin: "0 0 24px",
            }}
          >
            {p.desc}
          </p>

          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
            Amenities
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 24,
            }}
          >
            {p.amenities.map((a) => (
              <div
                key={a}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={16}
                  height={16}
                  fill="none"
                  stroke="var(--ff-accent)"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 5 5L20 7" />
                </svg>
                {a}
              </div>
            ))}
          </div>

          {/* Landlord card */}
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              padding: 18,
              background: "var(--bg-surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--ff-accent)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                {p.landlord.initials}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {p.landlord.name}
                  <svg
                    viewBox="0 0 24 24"
                    width={15}
                    height={15}
                    fill="none"
                    stroke="var(--state-success)"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Verified landlord · {p.landlord.since} · ⭐{" "}
                  {p.landlord.rating}
                </div>
              </div>
              <button
                onClick={actions.startApply}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--ff-border)",
                  color: "var(--text-primary)",
                  borderRadius: 8,
                  padding: "9px 14px",
                  font: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={15}
                  height={15}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                </svg>
                Run background check
              </button>
            </div>
          </div>
        </div>

        {/* Sticky booking card */}
        <div
          style={{
            position: "sticky",
            top: 24,
            border: "1px solid var(--ff-border)",
            borderRadius: 14,
            padding: 22,
            background: "var(--bg-surface)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: 30,
                fontWeight: 800,
                color: "var(--ff-accent-strong)",
              }}
            >
              {p.priceLabel}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>
              / month
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              margin: "18px 0",
              fontSize: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Rent advance</span>
              <span style={{ fontWeight: 600 }}>{p.advance}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Agent fee</span>
              <span
                style={{ fontWeight: 700, color: "var(--ff-accent-strong)" }}
              >
                ₵0 · none
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Held in escrow</span>
              <span style={{ fontWeight: 600 }}>{p.escrowLabel}</span>
            </div>
          </div>
          <button
            onClick={actions.openWalk}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--bg-subtle)",
              border: "1px solid var(--ff-border)",
              color: "var(--text-primary)",
              borderRadius: 8,
              padding: 12,
              font: "inherit",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 2 9 5v10l-9 5-9-5V7Z" />
              <path d="m3.3 7 8.7 5 8.7-5M12 12v10" />
            </svg>
            3D walkthrough
          </button>
          <button
            onClick={actions.startApply}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              background: "var(--ff-accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: 13,
              font: "inherit",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Apply for this lease
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 14,
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x={4} y={11} width={16} height={10} rx={2} />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Secured by FieFind escrow
          </div>
        </div>
      </div>
    </div>
  )
}

const backBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "none",
  border: "none",
  color: "var(--text-muted)",
  font: "inherit",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  marginBottom: 16,
  padding: 0,
}
