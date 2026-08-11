"use client"

import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query"
import type {
  LordListingItem,
  LordAppWithStatus,
  LordLease,
  LordTicket,
  PropertyDocument,
} from "@/components/fiefind/types"
import type { ServiceProvider } from "@/lib/landlord-schemas"
import { updatePropertyDoc } from "@/lib/landlord-store"
import {
  getLordProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  getLordApplications,
  updateApplicationStatus,
  getLordLeases,
  getLordMaintenanceTickets,
  getLordPayments,
  getPropertyDocuments,
  requestUploadUrl,
  createDigitalDocument,
  signDocument,
  listServiceProviders,
  assignArtisan,
  createServiceBooking,
  getServiceBookings,
  respondToServiceBooking,
  updateServiceBookingStatus,
  payForServiceBooking,
  reviewServiceBooking,
} from "@/app/actions/landlord"
import { PaymentOutSchema } from "@/lib/tenant-schemas"
import type { z } from "zod"

type PaymentOut = z.infer<typeof PaymentOutSchema>

// ── Listings — real API ────────────────────────────────────────────────────────

export function useListings() {
  return useQuery<LordListingItem[]>({
    queryKey: ["listings"],
    queryFn: getLordProperties,
  })
}

export function useAddListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<LordListingItem, "id">) => createProperty(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  })
}

export function useUpdateListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: LordListingItem) => updateProperty(item.id, item),
    onMutate: async (item) => {
      await qc.cancelQueries({ queryKey: ["listings"] })
      const previous = qc.getQueryData<LordListingItem[]>(["listings"])
      qc.setQueryData<LordListingItem[]>(
        ["listings"],
        (old) => old?.map((l) => (l.id === item.id ? item : l)) ?? []
      )
      return { previous }
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(["listings"], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  })
}

export function useRemoveListing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProperty(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["listings"] })
      const previous = qc.getQueryData<LordListingItem[]>(["listings"])
      qc.setQueryData<LordListingItem[]>(
        ["listings"],
        (old) => old?.filter((l) => l.id !== id) ?? []
      )
      return { previous }
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(["listings"], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listings"] }),
  })
}

// ── Applications — real API ────────────────────────────────────────────────────

export function useApplications() {
  return useQuery<LordAppWithStatus[]>({
    queryKey: ["lord-apps"],
    queryFn: getLordApplications,
  })
}

export function useSetAppStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: "pending" | "approved" | "declined"
    }) => {
      if (status !== "pending") {
        await updateApplicationStatus(id, status)
      }
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["lord-apps"] })
      const previous = qc.getQueryData<LordAppWithStatus[]>(["lord-apps"])
      qc.setQueryData<LordAppWithStatus[]>(
        ["lord-apps"],
        (old) =>
          old?.map((a) => (a.id === id ? { ...a, appStatus: status } : a)) ?? []
      )
      return { previous }
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) qc.setQueryData(["lord-apps"], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["lord-apps"] }),
  })
}

// ── Leases — real API ──────────────────────────────────────────────────────────

export function useLeases() {
  return useQuery<LordLease[]>({
    queryKey: ["leases"],
    queryFn: getLordLeases,
  })
}

// ── Payments — real API ───────────────────────────────────────────────────────

export function useLordPayments() {
  return useQuery<PaymentOut[]>({
    queryKey: ["lord-payments"],
    queryFn: getLordPayments,
  })
}

// ── Property documents — real API ─────────────────────────────────────────────

export function usePropertyDocs(propertyId: string) {
  return useQuery<PropertyDocument[]>({
    queryKey: ["property-docs", propertyId],
    queryFn: () => getPropertyDocuments(propertyId),
    enabled: !!propertyId,
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      propertyId,
      title,
      file,
      leaseId,
    }: {
      propertyId: string
      title: string
      file: File
      leaseId?: string
    }) => {
      const { url, document } = await requestUploadUrl(
        propertyId,
        title,
        leaseId,
        file.name
      )
      const res = await fetch(url, { method: "PUT", body: file })
      if (!res.ok) throw new Error("R2 upload failed")
      return document
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["property-docs", doc.propertyId] })
    },
  })
}

export function useUpdatePropertyDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string
      updates: Partial<Omit<PropertyDocument, "id">>
    }) => updatePropertyDoc(id, updates),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["property-docs", doc.propertyId] })
      qc.invalidateQueries({ queryKey: ["property-docs-all"] })
    },
  })
}

export function useAddPropertyDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<PropertyDocument, "id">) =>
      createDigitalDocument(data.propertyId, data.title, data.clauses ?? []),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["property-docs", doc.propertyId] })
    },
  })
}

export function useSignDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) => signDocument(docId),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ["property-docs", doc.propertyId] })
    },
  })
}

// ── Tickets — real API ─────────────────────────────────────────────────────────

export function useTickets() {
  return useQuery<LordTicket[]>({
    queryKey: ["tickets"],
    queryFn: getLordMaintenanceTickets,
  })
}

export function useServiceProviders(specialty?: string) {
  return useQuery<ServiceProvider[]>({
    queryKey: ["service-providers", specialty ?? "all"],
    queryFn: () => listServiceProviders(specialty),
  })
}

export function useServiceBookings() {
  return useQuery({
    queryKey: ["service-bookings"],
    queryFn: getServiceBookings,
  })
}

export function useCreateServiceBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createServiceBooking,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-bookings"] }),
  })
}

export function useRespondToServiceBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bookingId,
      accept,
      agreedPricePesewas,
    }: {
      bookingId: string
      accept: boolean
      agreedPricePesewas?: number
    }) => respondToServiceBooking(bookingId, accept, agreedPricePesewas),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-bookings"] }),
  })
}

export function useUpdateServiceBookingStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bookingId,
      status,
    }: {
      bookingId: string
      status: string
    }) => updateServiceBookingStatus(bookingId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-bookings"] }),
  })
}

export function usePayForServiceBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bookingId,
      phoneNumber,
    }: {
      bookingId: string
      phoneNumber: string
    }) => payForServiceBooking(bookingId, phoneNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-bookings"] }),
  })
}

export function useReviewServiceBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      bookingId,
      rating,
      comment,
    }: {
      bookingId: string
      rating: number
      comment?: string
    }) => reviewServiceBooking(bookingId, rating, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-bookings"] })
      qc.invalidateQueries({ queryKey: ["service-providers"] })
    },
  })
}

export function useAssignArtisan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      ticketId,
      artisanId,
    }: {
      ticketId: string
      artisanId: string
    }) => assignArtisan(ticketId, artisanId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  })
}
