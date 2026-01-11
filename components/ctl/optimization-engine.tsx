"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useCTL, type Assignment, type RMForecast } from "./ctl-context"
import { AlertCircle, Zap, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface CuttingPattern {
  coilId: string
  lineId: string
  orderIds: string[]
  sideScrap: number
  endScrap: number
  utilization: number
  changeoverCost: number
  totalScore: number
  coilConsumption: number
  coilBalance: number
}

export default function OptimizationEngine() {
  const { coils, orders, lines, setProposedAssignments, proposedAssignments, confirmAssignments, setRMForecasts } =
    useCTL()
  const [loading, setLoading] = useState(false)
  const [optimizationLog, setOptimizationLog] = useState<string[]>([])

  const calculateCuttingPattern = (coilId: string, selectedOrderIds: string[]): CuttingPattern | null => {
    const coil = coils.find((c) => c.id === coilId)
    const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id))

    if (!coil || selectedOrders.length === 0) return null

    const compatibleLine = lines.find((line) => {
      return (
        coil.width <= line.maxWidth &&
        coil.width >= line.minWidth &&
        coil.thickness <= line.maxThickness &&
        coil.weight <= line.maxWeight
      )
    })

    if (!compatibleLine) return null

    // Calculate total order weight
    const totalOrderWeight = selectedOrders.reduce((sum, order) => sum + order.weight, 0)

    const allOrdersCompatible = selectedOrders.every((order) => {
      return (
        order.grade === coil.grade &&
        order.thickness === coil.thickness &&
        order.width <= coil.width &&
        order.weight <= coil.weight
      )
    })

    if (!allOrdersCompatible) return null

    const coilConsumption = (totalOrderWeight / coil.weight) * 100
    const coilBalance = 100 - coilConsumption

    if (coilConsumption > 100) return null // Coil insufficient

    const sideScrap = selectedOrders.reduce((sum, order) => {
      return sum + (coil.width - order.width) * order.length
    }, 0)

    const totalOrderLength = selectedOrders.reduce((sum, order) => {
      return sum + order.length * order.quantity
    }, 0)

    const endScrap = Math.max(0, coil.length - totalOrderLength)
    const totalScrap = sideScrap + endScrap
    const totalMaterial = sideScrap + totalOrderLength
    const utilization = totalMaterial > 0 ? (totalOrderLength / totalMaterial) * 100 : 0

    return {
      coilId,
      lineId: compatibleLine.id,
      orderIds: selectedOrderIds,
      sideScrap,
      endScrap,
      utilization,
      changeoverCost: 100,
      totalScore: utilization * 10 - totalScrap / 1000 - 100,
      coilConsumption,
      coilBalance,
    }
  }

  const groupCompatibleOrders = (orderIds: string[]): string[][] => {
    const groups: string[][] = []
    const remainingOrders = new Set(orderIds)

    // Sort by width (descending) and thickness for better grouping
    const sortedIds = [...orderIds].sort((a, b) => {
      const orderA = orders.find((o) => o.id === a)!
      const orderB = orders.find((o) => o.id === b)!
      if (orderB.width !== orderA.width) return orderB.width - orderA.width
      return orderB.thickness - orderA.thickness
    })

    for (const firstOrderId of sortedIds) {
      if (!remainingOrders.has(firstOrderId)) continue

      const firstOrder = orders.find((o) => o.id === firstOrderId)!
      const currentGroup = [firstOrderId]
      remainingOrders.delete(firstOrderId)

      // Try to add compatible orders to this group
      for (const otherId of Array.from(remainingOrders)) {
        const otherOrder = orders.find((o) => o.id === otherId)!

        // Compatible if same thickness, grade, and width within 10mm tolerance
        if (
          otherOrder.thickness === firstOrder.thickness &&
          otherOrder.width <= firstOrder.width + 10 &&
          otherOrder.width >= firstOrder.width - 10
        ) {
          currentGroup.push(otherId)
          remainingOrders.delete(otherId)
        }
      }

      groups.push(currentGroup)
    }

    return groups
  }

  const runOptimization = () => {
    setLoading(true)
    const logs: string[] = []
    const patterns: CuttingPattern[] = []

    logs.push(`Starting optimization with ${coils.length} coils and ${orders.length} orders`)

    const sortedOrders = [...orders].sort((a, b) => a.priority - b.priority)
    const remainingOrders = new Set(orders.map((o) => o.id))
    const usedCoils = new Set<string>()

    const orderGroups = groupCompatibleOrders(Array.from(remainingOrders))
    logs.push(`Grouped ${orders.length} orders into ${orderGroups.length} compatible groups`)

    // For each group, find the best coil
    for (const orderGroup of orderGroups) {
      const groupOrders = orders.filter((o) => orderGroup.includes(o.id))
      const maxWidth = Math.max(...groupOrders.map((o) => o.width))
      const commonThickness = groupOrders[0].thickness
      const totalTonnage = groupOrders.reduce((sum, o) => sum + o.weight, 0)

      let bestPattern: CuttingPattern | null = null
      let bestCoilId: string | null = null

      for (const coil of coils) {
        if (usedCoils.has(coil.id)) continue
        if (coil.thickness !== commonThickness) continue
        if (coil.width < maxWidth) continue
        if (coil.weight < totalTonnage) continue

        const pattern = calculateCuttingPattern(coil.id, orderGroup)
        if (pattern && (!bestPattern || pattern.totalScore > bestPattern.totalScore)) {
          bestPattern = pattern
          bestCoilId = coil.id
        }
      }

      if (bestPattern && bestCoilId) {
        patterns.push(bestPattern)
        usedCoils.add(bestCoilId)
        orderGroup.forEach((id) => remainingOrders.delete(id))
        logs.push(
          `Group of ${orderGroup.length} orders assigned to coil with ${bestPattern.utilization.toFixed(1)}% utilization`,
        )
      } else {
        logs.push(`Group of ${orderGroup.length} orders: No suitable RM found`)
      }
    }

    logs.push(`Optimization complete: ${patterns.length} assignments created`)
    logs.push(`Unfulfilled orders: ${remainingOrders.size}`)

    if (remainingOrders.size > 0) {
      const forecasts = generateRMForecasts(remainingOrders)
      setRMForecasts(forecasts)
      logs.push(`Generated ${forecasts.length} RM forecasts for unfulfilled orders`)
    } else {
      setRMForecasts([])
    }

    setOptimizationLog(logs)

    const assignments: Assignment[] = patterns.map((p, idx) => ({
      id: `assign_${idx}`,
      coilId: p.coilId,
      lineId: p.lineId,
      orderIds: p.orderIds,
      sideScrap: p.sideScrap,
      endScrap: p.endScrap,
      utilization: p.utilization,
      changeoverCost: p.changeoverCost,
      totalScore: p.totalScore,
      status: "proposed",
      coilConsumption: p.coilConsumption,
      coilBalance: p.coilBalance,
    }))

    setProposedAssignments(assignments)
    setLoading(false)
  }

  const generateRMForecasts = (unfulfilledOrderIds: Set<string>): RMForecast[] => {
    const forecasts: RMForecast[] = []
    const unfulfilledOrders = orders.filter((o) => unfulfilledOrderIds.has(o.id))

    // Group unfulfilled orders by thickness and width requirements
    const groupedBySpec = new Map<string, typeof unfulfilledOrders>()

    unfulfilledOrders.forEach((order) => {
      const key = `${order.thickness}_${order.grade}`
      if (!groupedBySpec.has(key)) {
        groupedBySpec.set(key, [])
      }
      groupedBySpec.get(key)!.push(order)
    })

    // Create forecast for each group
    groupedBySpec.forEach((groupOrders) => {
      if (!groupOrders || groupOrders.length === 0) return

      const avgWidth = Math.max(...groupOrders.map((o) => o.width ?? 0)) + 20 // Add margin
      const totalWeight = groupOrders.reduce((sum, o) => {
        const orderWeight = typeof o.weight === "number" && !isNaN(o.weight) ? o.weight : 0
        return sum + orderWeight
      }, 0)

      const orderDetails = groupOrders.map((o) => {
        const orderWeight = typeof o.weight === "number" && !isNaN(o.weight) ? o.weight : 0
        return {
          orderId: o.id,
          requiredWidth: o.width ?? 0,
          requiredLength: o.length ?? 0,
          quantity: o.quantity ?? 1,
          estimatedWeight: orderWeight,
        }
      })

      const thickness = groupOrders[0]?.thickness ?? 0
      const grade = groupOrders[0]?.grade ?? "Standard"
      const recommendedWeight = Math.max(0, totalWeight > 0 ? totalWeight * 1.1 : 0)

      if (!isNaN(recommendedWeight) && isFinite(recommendedWeight)) {
        forecasts.push({
          id: `forecast_${Date.now()}_${Math.random()}`,
          recommendedWidth: Math.max(0, Math.ceil(avgWidth ?? 0)),
          recommendedThickness: Math.max(0, thickness ?? 0),
          recommendedWeight: Math.max(0, Math.ceil(recommendedWeight)),
          unfulfilled: groupOrders.map((o) => o.id),
          quantity: groupOrders.length,
          grade: grade,
          orderDetails,
        })
      }
    })

    return forecasts
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Optimization Engine</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Run the optimization algorithm to generate optimal coil-to-line assignments with intelligent order
              grouping
            </p>
          </div>
          <Button onClick={runOptimization} disabled={loading || coils.length === 0 || orders.length === 0}>
            <Zap className="mr-2 h-4 w-4" />
            {loading ? "Optimizing..." : "Run Optimization"}
          </Button>
        </div>
      </Card>

      {coils.length === 0 || orders.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please add at least one coil and one order before running optimization.</AlertDescription>
        </Alert>
      ) : null}

      {optimizationLog.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 font-semibold">Optimization Log</h3>
          <div className="space-y-2 text-sm font-mono">
            {optimizationLog.map((log, idx) => (
              <div key={idx} className="text-muted-foreground">
                &gt; {log}
              </div>
            ))}
          </div>
        </Card>
      )}

      {proposedAssignments.length > 0 && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Proposed Assignments ({proposedAssignments.length})</h3>
            <Button onClick={confirmAssignments} size="sm">
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm All
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {proposedAssignments.map((pattern, idx) => {
              const coil = coils.find((c) => c.id === pattern.coilId)
              const line = lines.find((l) => l.id === pattern.lineId)
              const utilization =
                typeof pattern.utilization === "number" && isFinite(pattern.utilization) ? pattern.utilization : 0
              const sideScrap =
                typeof pattern.sideScrap === "number" && isFinite(pattern.sideScrap) ? pattern.sideScrap : 0
              const endScrap = typeof pattern.endScrap === "number" && isFinite(pattern.endScrap) ? pattern.endScrap : 0
              const coilConsumption =
                typeof pattern.coilConsumption === "number" && isFinite(pattern.coilConsumption)
                  ? pattern.coilConsumption
                  : 0
              const coilBalance =
                typeof pattern.coilBalance === "number" && isFinite(pattern.coilBalance) ? pattern.coilBalance : 0
              const totalScore =
                typeof pattern.totalScore === "number" && isFinite(pattern.totalScore) ? pattern.totalScore : 0
              return (
                <div key={idx} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {coil?.coilId} → {line?.name}
                      </h4>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>Utilization: {utilization.toFixed(1)}%</div>
                        <div>Side Scrap: {(sideScrap / 1000).toFixed(2)} m²</div>
                        <div>End Scrap: {(endScrap / 1000).toFixed(2)} m²</div>
                        <div>Orders: {pattern.orderIds.length}</div>
                        <div>Coil Consumption: {coilConsumption.toFixed(1)}%</div>
                        <div>Coil Balance: {coilBalance.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{totalScore.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">Score</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
