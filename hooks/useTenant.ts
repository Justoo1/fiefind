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
