"use client"

import { useState, useRef, useEffect, useActionState } from "react"
import { useSession } from "next-auth/react"
import { useApp } from "./context"
import { login, signup } from "@/app/actions/auth"
import { useInitiateKyc } from "@/hooks/useTenant"

export function AuthPage() {
  const { state } = useApp()
  const { authStep } = state

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
        background: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      {/* Left brand panel */}
      <div
        style={{
          flex: 1,
          background: "var(--ff-accent)",
          color: "#fff",
          padding: "48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            position: "relative",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "rgba(255,255,255,.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={22}
              height={22}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
              <path d="M9 21v-9h6v9" />
            </svg>
          </div>
          <span
            style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.02em" }}
          >
            FieFind
          </span>
        </div>

        {/* Hero copy */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 440 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".14em",
              opacity: 0.85,
              fontFamily: "var(--font-mono)",
            }}
          >
            Fie · home in Twi
          </div>
          <h1
            style={{
              fontSize: 40,
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: "-.03em",
              margin: "14px 0 16px",
            }}
          >
            Rent in Ghana without the middlemen.
          </h1>
          <p
            style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.92, margin: 0 }}
          >
            Verified landlords. Funds held in escrow until you move in. No
            phantom listings, no predatory agent fees.
          </p>
          <div style={{ display: "flex", gap: 20, marginTop: 32 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>0%</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Agent fees</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,.25)" }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>100%</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>ID-verified</div>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,.25)" }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Escrow</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>Protected</div>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            fontSize: 13,
            opacity: 0.8,
          }}
        >
          Compliant with the Rent Control Department of Ghana
        </div>

        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            right: -80,
            bottom: -80,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 60,
            top: 40,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "rgba(255,255,255,.05)",
          }}
        />
      </div>

      {/* Right form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
          minWidth: 0,
          background: "var(--bg-base)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          {authStep === "login" && <LoginForm />}
          {authStep === "signup" && <SignupForm />}
          {authStep === "verify" && <VerifyForm />}
        </div>
      </div>
    </div>
  )
}

function LoginForm() {
  const { actions } = useApp()
  const { update } = useSession()
  const [state, formAction, pending] = useActionState(login, null)

  useEffect(() => {
    if (state?.success) {
      update().then(() => {
        // AppContent useEffect will pick up the new session and call setSession
      })
    }
  }, [state?.success]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ff-slide-up">
      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 6px",
        }}
      >
        Welcome back
      </h2>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: 15 }}
      >
        Sign in to your FieFind account
      </p>

      <form action={formAction}>
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Email or phone
        </label>
        <input
          name="identifier"
          type="text"
          placeholder="email@example.com or +233…"
          style={inputStyle}
          required
        />

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Password
        </label>
        <input
          name="password"
          type="password"
          placeholder="Your password"
          style={{ ...inputStyle, marginBottom: 8 }}
          required
        />

        <div style={{ textAlign: "right", marginBottom: 20 }}>
          <span
            style={{
              color: "var(--ff-accent)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Forgot password?
          </span>
        </div>

        {state?.error && (
          <div
            style={{
              color: "var(--state-error)",
              fontSize: 13,
              marginBottom: 14,
              padding: "8px 12px",
              background: "rgba(220,38,38,.08)",
              borderRadius: 8,
            }}
          >
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{ ...primaryBtnStyle, opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <Divider />

      <button onClick={actions.goSignup} style={secondaryBtnStyle}>
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          fill="none"
          stroke="var(--ff-accent)"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        Continue with Ghana Card
      </button>

      <p
        style={{
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 14,
          margin: "24px 0 0",
        }}
      >
        New to FieFind?{" "}
        <span
          onClick={actions.goSignup}
          style={{
            color: "var(--ff-accent)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Create an account
        </span>
      </p>
    </div>
  )
}

function SignupForm() {
  const { actions } = useApp()
  const [selectedRole, setSelectedRole] = useState<
    "tenant" | "landlord" | "service_provider"
  >("tenant")
  const [phoneDigits, setPhoneDigits] = useState("")
  const [state, formAction, pending] = useActionState(signup, null)

  useEffect(() => {
    if (state?.success) {
      actions.goVerify()
    }
  }, [state?.success]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="ff-slide-up">
      <h2
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: "-.02em",
          margin: "0 0 6px",
        }}
      >
        Create your account
      </h2>
      <p
        style={{ color: "var(--text-muted)", margin: "0 0 28px", fontSize: 15 }}
      >
        Join thousands renting the honest way
      </p>

      <form action={formAction}>
        {/* Hidden role input keeps the selected role value in sync */}
        <input type="hidden" name="role" value={selectedRole} />
        {/* Hidden combined phone — value is set by the visible inputs below */}
        <input
          type="hidden"
          name="phone"
          value={phoneDigits ? `+233${phoneDigits}` : ""}
        />

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Full name
        </label>
        <input
          name="name"
          type="text"
          placeholder="Ama Darko"
          style={inputStyle}
          required
        />

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Phone number
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "11px 12px",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              background: "var(--bg-subtle)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            +233
          </div>
          <input
            type="tel"
            placeholder="24 123 4567"
            value={phoneDigits}
            onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ""))}
            style={{
              flex: 1,
              padding: "11px 12px",
              border: "1px solid var(--ff-border)",
              borderRadius: 8,
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              font: "inherit",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Email
        </label>
        <input
          name="email"
          type="email"
          placeholder="ama@example.com"
          style={inputStyle}
        />

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Password
        </label>
        <input
          name="password"
          type="password"
          placeholder="At least 8 characters"
          style={inputStyle}
          required
        />

        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          I am a…
        </label>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div
            onClick={() => setSelectedRole("tenant")}
            style={{
              flex: 1,
              border:
                selectedRole === "tenant"
                  ? "2px solid var(--ff-accent)"
                  : "1px solid var(--ff-border)",
              background:
                selectedRole === "tenant"
                  ? "var(--ff-accent-soft)"
                  : "var(--bg-surface)",
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color:
                selectedRole === "tenant"
                  ? "var(--ff-accent-strong)"
                  : "var(--text-muted)",
              cursor: "pointer",
              transition: "all .12s",
            }}
          >
            Tenant
          </div>
          <div
            onClick={() => setSelectedRole("landlord")}
            style={{
              flex: 1,
              border:
                selectedRole === "landlord"
                  ? "2px solid var(--ff-accent)"
                  : "1px solid var(--ff-border)",
              background:
                selectedRole === "landlord"
                  ? "var(--ff-accent-soft)"
                  : "var(--bg-surface)",
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color:
                selectedRole === "landlord"
                  ? "var(--ff-accent-strong)"
                  : "var(--text-muted)",
              cursor: "pointer",
              transition: "all .12s",
            }}
          >
            Landlord
          </div>
          <div
            onClick={() => setSelectedRole("service_provider")}
            style={{
              flex: 1,
              border:
                selectedRole === "service_provider"
                  ? "2px solid var(--ff-accent)"
                  : "1px solid var(--ff-border)",
              background:
                selectedRole === "service_provider"
                  ? "var(--ff-accent-soft)"
                  : "var(--bg-surface)",
              borderRadius: 8,
              padding: 12,
              textAlign: "center",
              fontSize: 14,
              fontWeight: 600,
              color:
                selectedRole === "service_provider"
                  ? "var(--ff-accent-strong)"
                  : "var(--text-muted)",
              cursor: "pointer",
              transition: "all .12s",
            }}
          >
            Service provider
          </div>
        </div>

        {state?.error && (
          <div
            style={{
              color: "var(--state-error)",
              fontSize: 13,
              marginBottom: 14,
              padding: "8px 12px",
              background: "rgba(220,38,38,.08)",
              borderRadius: 8,
            }}
          >
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{ ...primaryBtnStyle, gap: 8, opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Creating account…" : "Continue to verification"}
          {!pending && (
            <svg
              viewBox="0 0 24 24"
              width={18}
              height={18}
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </button>
      </form>

      <p
        style={{
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 14,
          margin: "24px 0 0",
        }}
      >
        Already have an account?{" "}
        <span
          onClick={actions.goLogin}
          style={{
            color: "var(--ff-accent)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign in
        </span>
      </p>
    </div>
  )
}

function VerifyForm() {
  const { update } = useSession()
  const [cardFront, setCardFront] = useState<string | null>(null)
  const [cardBack, setCardBack] = useState<string | null>(null)
  const [selfieImg, setSelfieImg] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [ghanaCardNumber, setGhanaCardNumber] = useState("")

  const kycMutation = useInitiateKyc()

  const allDone = Boolean(
    cardFront && cardBack && selfieImg && ghanaCardNumber.trim()
  )

  function handleVerify() {
    if (!allDone || !cardFront || !selfieImg) return
    kycMutation.mutate(
      {
        ghana_card_number: ghanaCardNumber.trim(),
        id_image_base64: cardFront,
        selfie_image_base64: selfieImg,
      },
      {
        onSuccess: () => {
          update()
          // AppContent useEffect will pick up the authenticated session and call setSession
        },
      }
    )
  }

  return (
    <>
      <div className="ff-slide-up">
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--ff-accent-soft)",
            color: "var(--ff-accent-strong)",
            fontSize: 12,
            fontWeight: 700,
            padding: "6px 12px",
            borderRadius: 999,
            marginBottom: 18,
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: ".08em",
          }}
        >
          Step 2 of 2
        </div>

        <h2
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-.02em",
            margin: "0 0 6px",
          }}
        >
          Verify your identity
        </h2>
        <p
          style={{
            color: "var(--text-muted)",
            margin: "0 0 16px",
            fontSize: 15,
          }}
        >
          We verify every user against the Ghana Card register. This is what
          makes FieFind fraud-proof.
        </p>

        {/* Ghana Card number input */}
        <label
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Ghana Card number
        </label>
        <input
          type="text"
          placeholder="GHA-XXXXXXXXX-X"
          value={ghanaCardNumber}
          onChange={(e) => setGhanaCardNumber(e.target.value.toUpperCase())}
          style={{
            ...inputStyle,
            marginBottom: 16,
            fontFamily: "var(--font-mono)",
            letterSpacing: ".05em",
          }}
        />

        {/* Card upload slots */}
        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <CardSlot
            label="Card front"
            value={cardFront}
            onChange={setCardFront}
          />
          <CardSlot label="Card back" value={cardBack} onChange={setCardBack} />
        </div>

        {/* Selfie row */}
        <div
          onClick={() => setCameraOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 14,
            border: "1px solid var(--ff-border)",
            borderRadius: 10,
            background: "var(--bg-surface)",
            marginBottom: 18,
            cursor: "pointer",
          }}
        >
          {/* Left avatar circle */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              background: "var(--ff-accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {selfieImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selfieImg}
                alt="Selfie"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                width={20}
                height={20}
                fill="none"
                stroke="var(--ff-accent)"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx={12} cy={9} r={3.5} />
                <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
              </svg>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Liveness selfie</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Match your face to your card photo
            </div>
          </div>

          {selfieImg ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 3,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  color: "var(--state-success)",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={15}
                  height={15}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m5 12 5 5L20 7" />
                </svg>
                Captured
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                Retake
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ff-accent)",
              }}
            >
              Tap to capture
            </div>
          )}
        </div>

        {kycMutation.error && (
          <div
            style={{
              color: "var(--state-error)",
              fontSize: 13,
              marginBottom: 14,
              padding: "8px 12px",
              background: "rgba(220,38,38,.08)",
              borderRadius: 8,
            }}
          >
            {(kycMutation.error as Error).message ??
              "Verification failed. Please try again."}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={!allDone || kycMutation.isPending}
          style={{
            ...primaryBtnStyle,
            opacity: allDone && !kycMutation.isPending ? 1 : 0.45,
            cursor:
              allDone && !kycMutation.isPending ? "pointer" : "not-allowed",
          }}
        >
          {kycMutation.isPending ? "Submitting…" : "Verify my identity"}
        </button>
        <p
          style={{
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: 12,
            margin: "16px 0 0",
            lineHeight: 1.5,
          }}
        >
          Your data is encrypted and used only for verification under
          Ghana&apos;s Data Protection Act.
        </p>
      </div>

      {cameraOpen && (
        <CameraModal
          onCapture={(dataUrl) => {
            setSelfieImg(dataUrl)
            setCameraOpen(false)
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  )
}

// ─── CardSlot ────────────────────────────────────────────────────────────────

interface CardSlotProps {
  label: string
  value: string | null
  onChange: (dataUrl: string) => void
}

function CardSlot({ label, value, onChange }: CardSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        flex: 1,
        aspectRatio: "1.6",
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
        cursor: "pointer",
        border: value ? "none" : "1.5px dashed var(--ff-border)",
      }}
      className={value ? undefined : "ph-gradient"}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 999,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Re-upload
          </div>
        </>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: 6,
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="none"
            stroke="var(--ff-accent)"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x={3} y={5} width={18} height={14} rx={2} />
            <circle cx={9} cy={11} r={2} />
            <path d="M14 9h4M14 13h4M6 16h8" />
          </svg>
          {label}
        </div>
      )}
    </div>
  )
}

// ─── CameraModal ──────────────────────────────────────────────────────────────

interface CameraModalProps {
  onCapture: (dataUrl: string) => void
  onClose: () => void
}

function CameraModal({ onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera not available on this connection.")
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        if (!cancelled)
          setError(
            "Camera access denied. Please allow camera permission and try again."
          )
      }
    }

    start()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext("2d")?.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    onCapture(dataUrl)
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "none",
          background: "rgba(255,255,255,0.12)",
          cursor: "pointer",
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
          stroke="#fff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Label */}
      <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>
        Position your face in the oval
      </div>

      {/* Video container */}
      <div
        style={{
          width: 320,
          height: 320,
          borderRadius: 16,
          overflow: "hidden",
          position: "relative",
          background: "#000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {/* Oval face guide */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 180,
            height: 220,
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.75)",
            pointerEvents: "none",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            color: "#fff",
            background: "rgba(220,50,50,0.85)",
            padding: "10px 18px",
            borderRadius: 8,
            fontSize: 13,
            textAlign: "center",
            maxWidth: 300,
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* Capture button */}
      {!error && (
        <button
          onClick={handleCapture}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: "none",
            background: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 4px rgba(255,255,255,0.3)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width={26}
            height={26}
            fill="none"
            stroke="var(--ff-accent)"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
            <circle cx={12} cy={13} r={4} />
          </svg>
        </button>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        margin: "22px 0",
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      <div style={{ flex: 1, height: 1, background: "var(--ff-border)" }} />
      or
      <div style={{ flex: 1, height: 1, background: "var(--ff-border)" }} />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid var(--ff-border)",
  borderRadius: 8,
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  font: "inherit",
  fontSize: 14,
  outline: "none",
  marginBottom: 16,
  boxSizing: "border-box",
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
  padding: 13,
  font: "inherit",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
}

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  background: "var(--bg-surface)",
  color: "var(--text-primary)",
  border: "1px solid var(--ff-border)",
  borderRadius: 8,
  padding: 12,
  font: "inherit",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}
