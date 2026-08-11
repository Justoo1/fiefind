"use client"

import { useState } from "react"
import { useApp } from "./context"
import { WALK_ROOMS } from "./data"

const ROOM_DIMS: Record<string, string> = {
  "Living room": "5.2m × 4.1m · 21.3 m²",
  "Master bedroom": "4.8m × 3.9m · 18.7 m²",
  Kitchen: "3.5m × 2.8m · 9.8 m²",
  Bathroom: "2.4m × 2.0m · 4.8 m²",
  Balcony: "3.6m × 1.4m · 5.0 m²",
}

export function WalkthroughView() {
  const { state, actions } = useApp()
  const { selectedProperty: p, walkRoom, panVal } = state
  const [showDims, setShowDims] = useState(false)
  if (!p) return null

  const currentRoom = WALK_ROOMS[walkRoom]
  const panPct = `${panVal}%`

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0c0f13",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          color: "#fff",
        }}
      >
        <button
          onClick={actions.closeWalk}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "rgba(255,255,255,.12)",
            border: "none",
            color: "#fff",
            borderRadius: 8,
            padding: "9px 14px",
            font: "inherit",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
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
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
          Exit tour
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</div>
          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
              fontFamily: "var(--font-mono)",
            }}
          >
            3D LIVE WALKTHROUGH · {currentRoom.toUpperCase()}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(16,185,129,.16)",
            color: "#34D399",
            borderRadius: 8,
            padding: "9px 13px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          Authenticity confirmed
        </div>
      </div>

      {/* 360° pano area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          margin: "0 20px",
          borderRadius: 14,
        }}
      >
        {/* Simulated panning background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "200%",
            left: `calc(-1 * ${panPct})`,
            background:
              "repeating-linear-gradient(90deg,#161c24 0 80px,#1c2530 80px 160px)",
            transition: "left .15s ease-out",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,.4)",
            }}
          >
            360° PANO · {currentRoom.toUpperCase()}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,.45))",
            pointerEvents: "none",
          }}
        />

        {/* Next-room hotspot */}
        <button
          onClick={() => {
            actions.walkNext()
            setShowDims(false)
          }}
          className="ff-pulse-ring"
          style={{
            position: "absolute",
            left: "62%",
            top: "54%",
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "rgba(255,255,255,.9)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,.4)",
            transform: "translate(-50%,-50%)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="none"
            stroke="var(--ff-accent)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <div
          style={{
            position: "absolute",
            left: "62%",
            top: "calc(54% + 28px)",
            transform: "translateX(-50%)",
            background: "rgba(17,24,39,.8)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 600,
            padding: "4px 9px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          Move to next room
        </div>

        {/* Dimensions hotspot */}
        <button
          onClick={() => setShowDims((v) => !v)}
          style={{
            position: "absolute",
            left: "28%",
            top: "40%",
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "rgba(255,255,255,.85)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,.4)",
            transform: "translate(-50%,-50%)",
            zIndex: 10,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="var(--ff-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8v8M8 12h8" />
          </svg>
        </button>
        {showDims ? (
          <div
            style={{
              position: "absolute",
              left: "28%",
              top: "calc(40% + 28px)",
              transform: "translateX(-50%)",
              background: "rgba(17,24,39,.95)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 600,
              padding: "12px 16px",
              borderRadius: 10,
              whiteSpace: "nowrap",
              zIndex: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  opacity: 0.6,
                  fontSize: 10,
                  letterSpacing: ".08em",
                  textTransform: "uppercase",
                }}
              >
                Room dimensions
              </span>
              <button
                onClick={() => setShowDims(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,.6)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ color: "var(--ff-accent)", fontSize: 14 }}>
              {ROOM_DIMS[currentRoom] ?? "Dimensions unavailable"}
            </div>
          </div>
        ) : (
          <div
            style={{
              position: "absolute",
              left: "28%",
              top: "calc(40% + 24px)",
              transform: "translateX(-50%)",
              background: "rgba(17,24,39,.8)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "4px 9px",
              borderRadius: 6,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            Room dimensions
          </div>
        )}

        {/* Pan slider */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 20,
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(17,24,39,.7)",
            backdropFilter: "blur(8px)",
            padding: "10px 18px",
            borderRadius: 999,
            width: "min(440px, 70%)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="rgba(255,255,255,.7)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 6-6 6 6 6" />
          </svg>
          <input
            type="range"
            min={0}
            max={100}
            value={panVal}
            onChange={(e) => actions.setPan(Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: "var(--ff-accent)",
              cursor: "pointer",
            }}
          />
          <svg
            viewBox="0 0 24 24"
            width={16}
            height={16}
            fill="none"
            stroke="rgba(255,255,255,.7)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </div>
      </div>

      {/* Room tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          overflowX: "auto",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,.5)",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
            flexShrink: 0,
          }}
        >
          Rooms:
        </span>
        {WALK_ROOMS.map((room, i) => (
          <button
            key={room}
            onClick={() => {
              actions.walkTo(i)
              setShowDims(false)
            }}
            style={{
              background:
                i === walkRoom ? "var(--ff-accent)" : "rgba(255,255,255,.12)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 14px",
              font: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {room}
          </button>
        ))}
        <button
          onClick={actions.startApply}
          style={{
            marginLeft: "auto",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "var(--ff-accent)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            font: "inherit",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Apply for this home
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
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  )
}
