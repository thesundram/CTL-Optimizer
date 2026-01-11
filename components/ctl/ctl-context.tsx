"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface CTLLine {
  id: string
  name: string
  maxWidth: number
  minWidth: number
  maxThickness: number
  maxWeight: number
  speedMpm: number
  cost: number
}

export interface Coil {
  id: string
  coilId: string
  product: "HR" | "CR" | "GP" | "CC" | "SS"
  width: number
  length: number
  thickness: number
  weight: number
  grade: string
  status: "available" | "allocated" | "used"
}

export interface Order {
  id: string
  orderId: string
  product: "HR" | "CR" | "GP" | "CC" | "SS"
  width: number
  length: number
  thickness: number
  quantity: number
  grade: string
  coilPacketWeight: number
  dueDate: string
  priority: number
  weight: number
  status: "pending" | "assigned" | "completed"
}

export interface Assignment {
  id: string
  coilId: string
  lineId: string
  orderIds: string[]
  sideScrap: number
  endScrap: number
  utilization: number
  changeoverCost: number
  totalScore: number
  status: "proposed" | "confirmed" | "completed"
  coilConsumption: number // percentage of coil weight consumed
  coilBalance: number // percentage of coil weight remaining
}

export interface RMForecast {
  id: string
  recommendedWidth: number
  recommendedThickness: number
  recommendedWeight: number
  unfulfilled: string[] // order IDs
  quantity: number
  grade: string
  orderDetails?: Array<{
    orderId: string
    requiredWidth: number
    requiredLength: number
    quantity: number
    estimatedWeight: number
  }>
}

interface CTLContextType {
  lines: CTLLine[]
  coils: Coil[]
  orders: Order[]
  proposedAssignments: Assignment[]
  actualAssignments: Assignment[]
  rmForecasts: RMForecast[]
  addLine: (line: CTLLine) => void
  addCoil: (coil: Coil) => void
  addOrder: (order: Order) => void
  bulkImportCoils: (coils: Omit<Coil, "id">[]) => void
  bulkImportOrders: (orders: Omit<Order, "id">[]) => void
  updateCoilStatus: (coilId: string, status: Coil["status"]) => void
  setProposedAssignments: (assignments: Assignment[]) => void
  setRMForecasts: (forecasts: RMForecast[]) => void
  confirmAssignments: () => void
  clearAssignments: () => void
  deleteCoil: (coilId: string) => void
  deleteOrder: (orderId: string) => void
}

const CTLContext = createContext<CTLContextType | undefined>(undefined)

export function CTLProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CTLLine[]>([])
  const [coils, setCoils] = useState<Coil[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [proposedAssignments, setProposedAssignmentsState] = useState<Assignment[]>([])
  const [actualAssignments, setActualAssignmentsState] = useState<Assignment[]>([])
  const [rmForecasts, setRMForecastsState] = useState<RMForecast[]>([])

  useEffect(() => {
    const savedLines = localStorage.getItem("ctl_lines")
    const savedCoils = localStorage.getItem("ctl_coils")
    const savedOrders = localStorage.getItem("ctl_orders")
    const savedProposed = localStorage.getItem("ctl_proposed_assignments")
    const savedActual = localStorage.getItem("ctl_actual_assignments")
    const savedForecasts = localStorage.getItem("ctl_rm_forecasts")

    if (savedLines) setLines(JSON.parse(savedLines))
    if (savedCoils) setCoils(JSON.parse(savedCoils))
    if (savedOrders) setOrders(JSON.parse(savedOrders))
    if (savedProposed) setProposedAssignmentsState(JSON.parse(savedProposed))
    if (savedActual) setActualAssignmentsState(JSON.parse(savedActual))
    if (savedForecasts) setRMForecastsState(JSON.parse(savedForecasts))
  }, [])

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem("ctl_lines", JSON.stringify(lines))
  }, [lines])

  useEffect(() => {
    localStorage.setItem("ctl_coils", JSON.stringify(coils))
  }, [coils])

  useEffect(() => {
    localStorage.setItem("ctl_orders", JSON.stringify(orders))
  }, [orders])

  useEffect(() => {
    localStorage.setItem("ctl_proposed_assignments", JSON.stringify(proposedAssignments))
  }, [proposedAssignments])

  useEffect(() => {
    localStorage.setItem("ctl_actual_assignments", JSON.stringify(actualAssignments))
  }, [actualAssignments])

  useEffect(() => {
    localStorage.setItem("ctl_rm_forecasts", JSON.stringify(rmForecasts))
  }, [rmForecasts])

  const addLine = (line: CTLLine) => {
    setLines([...lines, { ...line, id: Date.now().toString() }])
  }

  const addCoil = (coil: Coil) => {
    setCoils([...coils, { ...coil, id: Date.now().toString() }])
  }

  const addOrder = (order: Order) => {
    setOrders([...orders, { ...order, id: Date.now().toString() }])
  }

  const bulkImportCoils = (newCoils: Omit<Coil, "id">[]) => {
    const coilsWithIds = newCoils.map((coil) => ({
      ...coil,
      id: Date.now().toString() + Math.random().toString(),
    }))
    setCoils([...coils, ...coilsWithIds])
  }

  const bulkImportOrders = (newOrders: Omit<Order, "id">[]) => {
    const ordersWithIds = newOrders.map((order) => ({
      ...order,
      id: Date.now().toString() + Math.random().toString(),
    }))
    setOrders([...orders, ...ordersWithIds])
  }

  const updateCoilStatus = (coilId: string, status: Coil["status"]) => {
    setCoils(coils.map((c) => (c.id === coilId ? { ...c, status } : c)))
  }

  const setProposedAssignments = (assignments: Assignment[]) => {
    setProposedAssignmentsState(assignments)
  }

  const setRMForecasts = (forecasts: RMForecast[]) => {
    setRMForecastsState(forecasts)
  }

  const confirmAssignments = () => {
    const confirmedAssignments = proposedAssignments.map((a) => ({
      ...a,
      status: "confirmed" as const,
    }))
    setActualAssignmentsState(confirmedAssignments)
    const allocatedCoilIds = new Set(confirmedAssignments.map((a) => a.coilId))
    setCoils(
      coils.map((c) => ({
        ...c,
        status: allocatedCoilIds.has(c.id) ? "used" : c.status,
      })),
    )
  }

  const clearAssignments = () => {
    setProposedAssignmentsState([])
    setActualAssignmentsState([])
    setRMForecastsState([])
    setCoils(coils.map((c) => ({ ...c, status: "available" as const })))
  }

  const deleteCoil = (coilId: string) => {
    setCoils(coils.filter((c) => c.id !== coilId))
  }

  const deleteOrder = (orderId: string) => {
    setOrders(orders.filter((o) => o.id !== orderId))
  }

  return (
    <CTLContext.Provider
      value={{
        lines,
        coils,
        orders,
        proposedAssignments,
        actualAssignments,
        rmForecasts,
        addLine,
        addCoil,
        addOrder,
        bulkImportCoils,
        bulkImportOrders,
        deleteCoil,
        deleteOrder,
        updateCoilStatus,
        setProposedAssignments,
        setRMForecasts,
        confirmAssignments,
        clearAssignments,
      }}
    >
      {children}
    </CTLContext.Provider>
  )
}

export function useCTL() {
  const context = useContext(CTLContext)
  if (!context) {
    throw new Error("useCTL must be used within CTLProvider")
  }
  return context
}
