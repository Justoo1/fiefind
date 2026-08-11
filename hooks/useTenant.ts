"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getLeases,
  getPayments,
  initiatePayment,
  getMaintenanceTickets,
  createMaintenanceTicket,
  getKycStatus,
  initiateKyc,
  getPublicProperties,
  applyForProperty,
  getTenantApplications,
  getTenantPropertyDocuments,
  signDocument,
  getServiceProviders,
  createServiceBooking,
  getServiceBookings,
  respondToServiceBooking,
  updateServiceBookingStatus,
  payForServiceBooking,
  reviewServiceBooking,
} from "@/app/actions/tenant"
import type { LeaseOut, ServiceProviderOut } from "@/lib/tenant-schemas"
import type {
  Property,
  TenantApp,
  PropertyDocument,
} from "@/components/fiefind/types"

export function useLeases() {
  return useQuery({
    queryKey: ["tenant-leases"],
    queryFn: getLeases,
  })
}

export function useActiveLeases() {
  const q = useLeases()
  return {
    ...q,
    data: (q.data ?? []).filter((l): l is LeaseOut => l.status === "active"),
  }
}

export function usePayments() {
  return useQuery({
    queryKey: ["tenant-payments"],
    queryFn: getPayments,
  })
}

export function useInitiatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      leaseId,
      amountPesewas,
      phoneNumber,
    }: {
      leaseId: string
      amountPesewas: number
      phoneNumber: string
    }) => initiatePayment(leaseId, amountPesewas, phoneNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-payments"] }),
  })
}

export function useMaintenanceTickets() {
  return useQuery({
    queryKey: ["tenant-maintenance"],
    queryFn: getMaintenanceTickets,
  })
}

export function useCreateMaintenanceTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMaintenanceTicket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-maintenance"] }),
  })
}

export function useKycStatus() {
  return useQuery({
    queryKey: ["tenant-kyc"],
    queryFn: getKycStatus,
  })
}

export function useInitiateKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: initiateKyc,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tenant-kyc"] }),
  })
}

export function usePublicProperties() {
  return useQuery<Property[]>({
    queryKey: ["public-properties"],
    queryFn: getPublicProperties,
  })
}

export function useApplyForProperty() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (propertyId: string) => applyForProperty(propertyId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["tenant-applications"] }),
  })
}

export function useTenantApplications() {
  return useQuery<TenantApp[]>({
    queryKey: ["tenant-applications"],
    queryFn: getTenantApplications,
  })
}

export function useTenantPropertyDocs(propertyId: string) {
  return useQuery<PropertyDocument[]>({
    queryKey: ["tenant-property-docs", propertyId],
    queryFn: () => getTenantPropertyDocuments(propertyId),
    enabled: !!propertyId,
  })
}

export function useSignDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (docId: string) => signDocument(docId),
    onSuccess: (doc) => {
      qc.invalidateQueries({
        queryKey: ["tenant-property-docs", doc.propertyId],
      })
    },
  })
}

export function useServiceProviders(specialty?: string) {
  return useQuery<ServiceProviderOut[]>({
    queryKey: ["service-providers", specialty ?? "all"],
    queryFn: () => getServiceProviders(specialty),
    staleTime: 5 * 60 * 1000,
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
