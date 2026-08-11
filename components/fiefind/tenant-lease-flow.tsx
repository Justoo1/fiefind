"use client"

import React, { useState } from "react"
import { useApp } from "./context"
import { useApplyForProperty } from "@/hooks/useTenant"

// ── Shared step progress ────────────────────────────────────────────────────

type StepStatus = "done" | "active" | "pending"

function StepIndicator({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) {
  const stepStatus = (i: number): StepStatus =>
    i < current ? "done" : i === current ? "active" : "pending"

  const circleStyle = (s: StepStatus): React.CSSProperties => ({
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    background:
      s === "done"
        ? "var(--state-success)"
        : s === "active"
          ? "var(--ff-accent)"
          : "var(--bg-subtle)",
    color: s === "pending" ? "var(--text-muted)" : "#fff",
    border: s === "pending" ? "1px solid var(--ff-border)" : "none",
  })

  const textColor = (s: StepStatus) =>
    s === "done"
      ? "var(--state-success)"
      : s === "active"
        ? "var(--ff-accent-strong)"
        : "var(--text-muted)"

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        marginBottom: 28,
      }}
    >
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: textColor(stepStatus(i)),
              fontWeight: i <= current ? 700 : 600,
              fontSize: 13,
            }}
          >
            <span style={circleStyle(stepStatus(i))}>
              {stepStatus(i) === "done" ? (
                <svg
                  viewBox="0 0 24 24"
                  width={14}
                  height={14}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 5 5L20 7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            {label}
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background:
                  i < current ? "var(--ff-accent)" : "var(--ff-border)",
                margin: "0 10px",
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

const STEPS = ["Apply", "Verify", "Sign", "Pay"]

// ── Apply ───────────────────────────────────────────────────────────────────

export function ApplyView() {
  const { state, actions } = useApp()
  const applyMutation = useApplyForProperty()
  const p = state.selectedProperty
  if (!p) return null

  function handleSubmit() {
    applyMutation.mutate(p!.id, {
      onSuccess: () => actions.goBgcheck(),
    })
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 28px 48px" }}>
      <button onClick={actions.closeWalk} style={backBtnStyle}>
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
        Back to listing
      </button>

      <StepIndicator steps={STEPS} current={0} />

      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Apply to rent
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 15 }}
      >
        {p.title} · {p.area} · {p.priceLabel}/mo
      </p>

      <div
        style={{
          border: "1px solid var(--ff-border)",
          borderRadius: 12,
          background: "var(--bg-surface)",
          padding: 22,
          marginBottom: 18,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
          Your details
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px 16px",
          }}
        >
          <Field label="Full name" defaultValue="Ama Darko" />
          <Field label="Ghana Card no." defaultValue="GHA-7•••••••-4" mono />
          <Field label="Occupation" defaultValue="Software Engineer" />
          <Field label="Monthly income" defaultValue="₵9,500" />
          <div style={{ gridColumn: "1 / -1" }}>
            <Field label="Move-in date" defaultValue="01 August 2026" />
          </div>
        </div>
      </div>

      {/* Bgcheck notice */}
      <div
        style={{
          border: "1px solid var(--ff-accent)",
          borderRadius: 12,
          background: "var(--ff-accent-soft)",
          padding: 18,
          marginBottom: 24,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={22}
          height={22}
          fill="none"
          stroke="var(--ff-accent-strong)"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--ff-accent-strong)",
              marginBottom: 3,
            }}
          >
            Mutual background check
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.55,
            }}
          >
            We&apos;ll run a vetted check on landlord{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {p.landlord.name}
            </strong>{" "}
            — and they&apos;ll check you. Both reports are ready before any
            money moves.
          </div>
        </div>
      </div>

      {applyMutation.isError && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 10,
            background: "var(--state-error-soft, #fee2e2)",
            color: "var(--state-error, #ef4444)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {(applyMutation.error as Error)?.message?.includes("409")
            ? "You have already applied to this property."
            : "Something went wrong. Please try again."}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={applyMutation.isPending}
        style={{
          ...primaryBtnStyle,
          opacity: applyMutation.isPending ? 0.7 : 1,
          cursor: applyMutation.isPending ? "not-allowed" : "pointer",
        }}
      >
        {applyMutation.isPending
          ? "Submitting…"
          : "Submit application & run checks"}
        {!applyMutation.isPending && (
          <svg
            viewBox="0 0 24 24"
            width={17}
            height={17}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </div>
  )
}

// ── Background Check ─────────────────────────────────────────────────────────

export function BgCheckView() {
  const { state, actions } = useApp()
  const p = state.selectedProperty
  if (!p) return null

  const tenantChecks = [
    "Ghana Card verified",
    "Employment confirmed",
    "No criminal record",
    "Credit check passed",
  ]
  const landlordChecks = [
    "Ghana Card verified",
    "Property title confirmed",
    "No fraud reports",
    "Tax clearance",
  ]

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 28px 48px" }}>
      <StepIndicator steps={STEPS} current={1} />

      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Background checks complete
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 15 }}
      >
        Both parties have been vetted. Review before signing.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Landlord */}
        <CheckCard
          initials={p.landlord.initials}
          name={p.landlord.name}
          role="Landlord"
          checks={landlordChecks}
          overall="All checks passed"
          color="var(--state-success)"
        />
        {/* Tenant */}
        <CheckCard
          initials="AD"
          name="Ama Darko"
          role="Tenant (you)"
          checks={tenantChecks}
          overall="All checks passed"
          color="var(--state-success)"
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          padding: "16px 18px",
          border: "1px solid var(--ff-border)",
          borderRadius: 12,
          background: "var(--bg-surface)",
          marginBottom: 24,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={22}
          height={22}
          fill="none"
          stroke="var(--ff-accent-strong)"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 2 }}
        >
          <rect x={4} y={11} width={16} height={10} rx={2} />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            Ready to proceed to agreement
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            All background checks have passed. You can now review and sign the
            Rent Control–compliant tenancy agreement. Your payment will only be
            collected after you sign.
          </div>
        </div>
      </div>

      <button onClick={actions.goSign} style={primaryBtnStyle}>
        Review & sign agreement
        <svg
          viewBox="0 0 24 24"
          width={17}
          height={17}
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
  )
}

function CheckCard({
  initials,
  name,
  role,
  checks,
  overall,
  color,
}: {
  initials: string
  name: string
  role: string
  checks: string[]
  overall: string
  color: string
}) {
  return (
    <div
      style={{
        border: "1px solid var(--ff-border)",
        borderRadius: 12,
        background: "var(--bg-surface)",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "var(--ff-accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{role}</div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          fontSize: 13,
        }}
      >
        {checks.map((c) => (
          <div
            key={c}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="var(--state-success)"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
            {c}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid var(--ff-border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 700,
          color,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={15}
          height={15}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        {overall}
      </div>
    </div>
  )
}

// ── Sign Agreement ────────────────────────────────────────────────────────────

export function SignAgreementView() {
  const { state, actions } = useApp()
  const [agreed, setAgreed] = useState(false)
  const p = state.selectedProperty
  if (!p) return null

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 28px 48px" }}>
      <StepIndicator steps={STEPS} current={2} />

      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Tenancy agreement
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 20px", fontSize: 15 }}
      >
        Rent Control–compliant · auto-generated for this lease
      </p>

      {/* Agreement text */}
      <div
        style={{
          border: "1px solid var(--ff-border)",
          borderRadius: 12,
          background: "var(--bg-surface)",
          padding: "28px 32px",
          marginBottom: 20,
          maxHeight: 320,
          overflowY: "auto",
          fontSize: 13,
          lineHeight: 1.7,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            TENANCY AGREEMENT
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: ".06em",
              marginTop: 4,
            }}
          >
            Pursuant to the Rent Act, 1963 (Act 220), Republic of Ghana
          </div>
        </div>
        <p style={{ margin: "0 0 12px" }}>
          THIS AGREEMENT is made between{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {p.landlord.name}
          </strong>{" "}
          (&quot;the Landlord&quot;) and{" "}
          <strong style={{ color: "var(--text-primary)" }}>Ama Darko</strong>{" "}
          (&quot;the Tenant&quot;) in respect of the premises at{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {p.title}, {p.area}, {p.region}
          </strong>
          .
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong style={{ color: "var(--text-primary)" }}>1. Term.</strong> The
          tenancy shall run for twelve (12) calendar months commencing 01 August
          2026.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong style={{ color: "var(--text-primary)" }}>2. Rent.</strong> The
          monthly rent shall be {p.priceLabel}, with a rent advance of{" "}
          {p.advance} held in FieFind escrow and released to the Landlord upon
          confirmed move-in, in compliance with Rent Control limits.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong style={{ color: "var(--text-primary)" }}>3. Deposit.</strong>{" "}
          A refundable security deposit equal to one month&apos;s rent shall be
          held in escrow for the duration of the tenancy.
        </p>
        <p style={{ margin: "0 0 12px" }}>
          <strong style={{ color: "var(--text-primary)" }}>
            4. Maintenance.
          </strong>{" "}
          The Landlord shall keep the premises in good repair; the Tenant may
          log requests via the FieFind verified artisan network.
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: "var(--text-primary)" }}>
            5. Dispute resolution.
          </strong>{" "}
          Disputes shall be referred to the Rent Control Department before any
          court action.
        </p>
      </div>

      {/* Signature blocks */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            border: "1px dashed var(--ff-border)",
            borderRadius: 10,
            padding: 16,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              fontStyle: "italic",
              color: "var(--text-primary)",
              marginBottom: 6,
              fontFamily: "cursive",
            }}
          >
            Ama Darko
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Tenant · signed 24 Jun 2026
          </div>
        </div>
        <div
          style={{
            border: "1px dashed var(--ff-border)",
            borderRadius: 10,
            padding: 16,
            textAlign: "center",
            background: "var(--ff-accent-soft)",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              fontStyle: "italic",
              color: "var(--ff-accent-strong)",
              marginBottom: 6,
              fontFamily: "cursive",
            }}
          >
            {p.landlord.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Landlord · signed 23 Jun 2026
          </div>
        </div>
      </div>

      {/* Agree checkbox */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 14,
          marginBottom: 18,
          cursor: "pointer",
        }}
      >
        <span
          onClick={() => setAgreed((v) => !v)}
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            background: agreed ? "var(--ff-accent)" : "var(--bg-base)",
            border: agreed ? "none" : "2px solid var(--ff-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            cursor: "pointer",
            transition: "background .15s",
          }}
        >
          {agreed && (
            <svg
              viewBox="0 0 24 24"
              width={13}
              height={13}
              fill="none"
              stroke="#fff"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 12 5 5L20 7" />
            </svg>
          )}
        </span>
        I have read and agree to the terms of this tenancy agreement.
      </label>

      <button
        onClick={agreed ? actions.goEscrow : undefined}
        disabled={!agreed}
        style={{
          ...primaryBtnStyle,
          opacity: agreed ? 1 : 0.45,
          cursor: agreed ? "pointer" : "not-allowed",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={17}
          height={17}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4" />
        </svg>
        Sign & continue to secure payment
      </button>
    </div>
  )
}

// ── Escrow Payment ────────────────────────────────────────────────────────────

type PayMethod = "mtn" | "bank" | "tigo"

export function EscrowPaymentView() {
  const { state, actions } = useApp()
  const [payMethod, setPayMethod] = useState<PayMethod>("mtn")
  const p = state.selectedProperty
  if (!p) return null

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 28px 48px" }}>
      <StepIndicator steps={STEPS} current={3} />

      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 4px",
        }}
      >
        Secure payment in escrow
      </h1>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 15 }}
      >
        Your money is held by FieFind and only released to the landlord once you
        confirm move-in.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div>
          {/* Payment methods */}
          <div
            style={{
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
              padding: 22,
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
              Payment method
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* MTN MoMo */}
              <div
                onClick={() => setPayMethod("mtn")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border:
                    payMethod === "mtn"
                      ? "2px solid var(--ff-accent)"
                      : "1px solid var(--ff-border)",
                  background:
                    payMethod === "mtn"
                      ? "var(--ff-accent-soft)"
                      : "transparent",
                  borderRadius: 10,
                  padding: 14,
                  cursor: "pointer",
                  transition: "border .12s, background .12s",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: "#FFCC00",
                    color: "#111",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 11,
                  }}
                >
                  MTN
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    MTN Mobile Money
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    +233 24 ••• 4567
                  </div>
                </div>
                {payMethod === "mtn" && (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--ff-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={12}
                      height={12}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>
                )}
              </div>
              {/* Bank transfer */}
              <div
                onClick={() => setPayMethod("bank")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border:
                    payMethod === "bank"
                      ? "2px solid var(--ff-accent)"
                      : "1px solid var(--ff-border)",
                  background:
                    payMethod === "bank"
                      ? "var(--ff-accent-soft)"
                      : "transparent",
                  borderRadius: 10,
                  padding: 14,
                  cursor: "pointer",
                  transition: "border .12s, background .12s",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: "var(--bg-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    fill="none"
                    stroke="var(--text-muted)"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    Bank transfer
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    GCB · Ecobank · Fidelity
                  </div>
                </div>
                {payMethod === "bank" && (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--ff-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={12}
                      height={12}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>
                )}
              </div>
              {/* AirtelTigo */}
              <div
                onClick={() => setPayMethod("tigo")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border:
                    payMethod === "tigo"
                      ? "2px solid var(--ff-accent)"
                      : "1px solid var(--ff-border)",
                  background:
                    payMethod === "tigo"
                      ? "var(--ff-accent-soft)"
                      : "transparent",
                  borderRadius: 10,
                  padding: 14,
                  cursor: "pointer",
                  transition: "border .12s, background .12s",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: "#ED1C24",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 10,
                  }}
                >
                  Tigo
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    AirtelTigo Money
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Mobile wallet
                  </div>
                </div>
                {payMethod === "tigo" && (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--ff-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={12}
                      height={12}
                      fill="none"
                      stroke="#fff"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Escrow info */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: 16,
              border: "1px solid var(--ff-border)",
              borderRadius: 12,
              background: "var(--bg-surface)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={22}
              height={22}
              fill="none"
              stroke="var(--ff-accent-strong)"
              strokeWidth={1.9}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <rect x={4} y={11} width={16} height={10} rx={2} />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <div
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.55,
              }}
            >
              <strong style={{ color: "var(--text-primary)" }}>
                Escrow protection.
              </strong>{" "}
              Funds stay locked with FieFind. If the property is misrepresented
              or you can&apos;t move in, you&apos;re refunded in full — no
              phantom-property fraud.
            </div>
          </div>
        </div>

        {/* Summary card */}
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
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>
            Payment summary
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 11,
              fontSize: 14,
            }}
          >
            <Row label="First month rent" value={p.priceLabel} />
            <Row label="Security deposit" value={p.priceLabel} />
            <Row label="FieFind service (1%)" value={p.serviceFee} />
            <Row
              label="Agent fee"
              value="₵0.00"
              valueColor="var(--ff-accent-strong)"
            />
            <div
              style={{
                height: 1,
                background: "var(--ff-border)",
                margin: "4px 0",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontWeight: 700 }}>Held in escrow</span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "var(--ff-accent-strong)",
                }}
              >
                {p.escrowTotal}
              </span>
            </div>
          </div>
          <button
            onClick={actions.payNow}
            style={{ ...primaryBtnStyle, marginTop: 18 }}
          >
            <svg
              viewBox="0 0 24 24"
              width={17}
              height={17}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x={4} y={11} width={16} height={10} rx={2} />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Pay & secure {p.escrowTotal}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Success / Paid ────────────────────────────────────────────────────────────

export function PaidView() {
  const { state, actions } = useApp()
  const p = state.selectedProperty
  if (!p) return null

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "0 auto",
        padding: "64px 28px",
        textAlign: "center",
      }}
    >
      <div
        className="ff-scale-in"
        style={{
          width: 84,
          height: 84,
          borderRadius: "50%",
          background: "var(--ff-accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width={42}
          height={42}
          fill="none"
          stroke="var(--ff-accent-strong)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 8px",
        }}
      >
        You&apos;re all set! 🎉
      </h1>
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 16,
          lineHeight: 1.6,
          margin: "0 0 28px",
        }}
      >
        Your payment is safely held in escrow. {p.landlord.name} has been
        notified to prepare{" "}
        <strong style={{ color: "var(--text-primary)" }}>{p.title}</strong> for
        your move-in on{" "}
        <strong style={{ color: "var(--text-primary)" }}>01 August 2026</strong>
        .
      </p>
      <div
        style={{
          border: "1px solid var(--ff-border)",
          borderRadius: 12,
          background: "var(--bg-surface)",
          padding: 20,
          textAlign: "left",
          marginBottom: 24,
        }}
      >
        <Row label="Reference" value="FF-2026-0042" mono />
        <div style={{ marginBottom: 10 }} />
        <Row
          label="Held in escrow"
          value={p.escrowTotal}
          valueColor="var(--ff-accent-strong)"
        />
        <div style={{ marginBottom: 10 }} />
        <Row label="Release condition" value="Confirmed move-in" />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={actions.navLease}
          style={{ flex: 1, ...primaryBtnStyle }}
        >
          View my lease
        </button>
        <button
          onClick={actions.navDiscover}
          style={{
            flex: 1,
            background: "var(--bg-surface)",
            border: "1px solid var(--ff-border)",
            color: "var(--text-primary)",
            borderRadius: 8,
            padding: 13,
            font: "inherit",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Keep browsing
        </button>
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  valueColor,
  mono,
}: {
  label: string
  value: string
  valueColor?: string
  mono?: boolean
}) {
  return (
    <div
      style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span
        style={{
          fontWeight: 600,
          color: valueColor ?? "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
        }}
      >
        {value}
      </span>
    </div>
  )
}

function Field({
  label,
  defaultValue,
  mono,
}: {
  label: string
  defaultValue: string
  mono?: boolean
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        defaultValue={defaultValue}
        style={{
          width: "100%",
          padding: "11px 12px",
          border: "1px solid var(--ff-border)",
          borderRadius: 8,
          background: "var(--bg-base)",
          color: "var(--text-primary)",
          font: "inherit",
          fontSize: 14,
          outline: "none",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          boxSizing: "border-box",
        }}
      />
    </div>
  )
}

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: "var(--ff-accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: 14,
  font: "inherit",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
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
