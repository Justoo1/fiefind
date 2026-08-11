# FieFind Backend

FastAPI Python microservice — owns:
- Background verification logic (Smile ID — Ghana Card + biometric KYC)
- Payment and escrow logic (Hubtel API)
- Database operations for business-critical flows

## System Boundary

This directory is the `backend/` boundary defined in `architecture_context.md`.
The Next.js frontend communicates with this service via authenticated HTTP requests
using a shared secret validated in the FastAPI middleware.

## Setup (Increment 5+)

Python environment, dependencies, and startup instructions will be added when
the FastAPI scaffold is implemented.
