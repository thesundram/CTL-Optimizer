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
  isPartialAllocation?: boolean
  allocatedWeight?: number
  orderAllocations?: Array<{
    orderId: string
    allocatedWeight: number
    isPartial: boolean
  }>
}

export default function OptimizationEngine() {
  const { coils, orders, lines, setProposedAssignments, proposedAssignments, confirmAssignments, setRMForecasts } =
    useCTL()
  const [loading, setLoading] = useState(false)
  const [optimizationLog, setOptimizationLog] = useState<string[]>([])
  const [optimizationComplete, setOptimizationComplete] = useState(false)
  const [assignmentsConfirmed, setAssignmentsConfirmed] = useState(false)

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

    if (coilConsumption > 100) return null

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

    const orderAllocations = selectedOrders.map((order) => ({
      orderId: order.id,
      allocatedWeight: order.weight,
      isPartial: false,
    }))

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
      isPartialAllocation: false,
      allocatedWeight: totalOrderWeight,
      orderAllocations,
    }
  }

  const groupCompatibleOrders = (orderIds: string[]): string[][] => {
    const groups: string[][] = []
    const remainingOrders = new Set(orderIds)

    const sortedIds = [...orderIds].sort((a, b) => {
      const orderA = orders.find((o) => o.id === a)
      const orderB = orders.find((o) => o.id === b)
      if (!orderA || !orderB) return 0
      if (orderA.priority !== orderB.priority) return orderA.priority - orderB.priority
      if (orderB.width !== orderA.width) return orderB.width - orderA.width
      return orderB.thickness - orderA.thickness
    })

    for (const firstOrderId of sortedIds) {
      if (!remainingOrders.has(firstOrderId)) continue

      const firstOrder = orders.find((o) => o.id === firstOrderId)
      if (!firstOrder) continue

      const currentGroup = [firstOrderId]
      remainingOrders.delete(firstOrderId)

      for (const otherId of Array.from(remainingOrders)) {
        const otherOrder = orders.find((o) => o.id === otherId)
        if (!otherOrder) continue

        if (
          otherOrder.thickness === firstOrder.thickness &&
          otherOrder.grade === firstOrder.grade &&
          otherOrder.product === firstOrder.product &&
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

  const fulfillOrderWithMultipleCoils = (
    order: (typeof orders)[0],
    availableCoils: typeof coils,
    usedCoilCapacity: Map<string, number>,
  ): CuttingPattern[] => {
    const patterns: CuttingPattern[] = []
    let remainingOrderWeight = order.weight

    const compatibleCoils = availableCoils
      .filter((coil) => {
        return (
          coil.grade === order.grade &&
          coil.thickness === order.thickness &&
          coil.product === order.product &&
          coil.width >= order.width
        )
      })
      .map((coil) => {
        const usedCapacity = usedCoilCapacity.get(coil.id) || 0
        const availableCapacity = coil.weight - usedCapacity
        return { coil, availableCapacity }
      })
      .filter((item) => item.availableCapacity > 0)
      .sort((a, b) => b.availableCapacity - a.availableCapacity)

    for (const { coil, availableCapacity } of compatibleCoils) {
      if (remainingOrderWeight <= 0) break

      const compatibleLine = lines.find((line) => {
        return (
          coil.width <= line.maxWidth &&
          coil.width >= line.minWidth &&
          coil.thickness <= line.maxThickness &&
          coil.weight <= line.maxWeight
        )
      })

      if (!compatibleLine) continue

      const allocatedWeight = Math.min(availableCapacity, remainingOrderWeight)
      const currentUsed = usedCoilCapacity.get(coil.id) || 0
      const newUsed = currentUsed + allocatedWeight
      const coilConsumption = (newUsed / coil.weight) * 100
      const coilBalance = 100 - coilConsumption

      usedCoilCapacity.set(coil.id, newUsed)

      const sideScrap = (coil.width - order.width) * order.length * (allocatedWeight / order.weight)
      const utilization = (allocatedWeight / coil.weight) * 100

      patterns.push({
        coilId: coil.id,
        lineId: compatibleLine.id,
        orderIds: [order.id],
        sideScrap,
        endScrap: 0,
        utilization,
        changeoverCost: 100,
        totalScore: utilization * 10 - sideScrap / 1000 - 100,
        coilConsumption,
        coilBalance,
        isPartialAllocation: true,
        allocatedWeight,
        orderAllocations: [
          {
            orderId: order.id,
            allocatedWeight,
            isPartial: remainingOrderWeight > allocatedWeight,
          },
        ],
      })

      remainingOrderWeight -= allocatedWeight
    }

    return patterns
  }

  const allocateOrdersToBalanceCoils = (
    pendingOrderIds: Set<string>,
    usedCoilCapacity: Map<string, number>,
    logs: string[],
  ): { patterns: CuttingPattern[]; fulfilledOrders: string[] } => {
    const patterns: CuttingPattern[] = []
    const fulfilledOrders: string[] = []

    const pendingOrders = orders.filter((o) => pendingOrderIds.has(o.id)).sort((a, b) => a.priority - b.priority)

    logs.push(`Pass 3: Checking ${pendingOrders.length} pending orders against coil balances`)

    for (const order of pendingOrders) {
      let remainingOrderWeight = order.weight
      const orderPatterns: CuttingPattern[] = []

      console.log(`[v0] Pass 3 - Checking order ${order.orderId}:`)
      console.log(
        `[v0]   Order specs: Grade=${order.grade}, Thickness=${order.thickness}, Width=${order.width}, Product=${order.product}, Weight=${order.weight?.toFixed(2)}`,
      )

      // Find all coils with available balance that are compatible
      const coilsWithBalance = coils
        .map((coil) => {
          const usedCapacity = usedCoilCapacity.get(coil.id) || 0
          const availableBalance = coil.weight - usedCapacity
          return { coil, availableBalance, usedCapacity }
        })
        .filter(({ coil, availableBalance }) => {
          const hasBalance = availableBalance > 0
          const gradeMatch = coil.grade === order.grade
          const thicknessMatch = coil.thickness === order.thickness
          const productMatch = coil.product === order.product
          const widthMatch = coil.width >= order.width

          console.log(
            `[v0]   Coil ${coil.coilId}: Balance=${availableBalance.toFixed(2)}MT, Grade=${coil.grade}(${gradeMatch ? "OK" : "FAIL"}), Thickness=${coil.thickness}(${thicknessMatch ? "OK" : "FAIL"}), Product=${coil.product}(${productMatch ? "OK" : "FAIL"}), Width=${coil.width}(${widthMatch ? "OK" : "FAIL"})`,
          )

          return hasBalance && gradeMatch && thicknessMatch && productMatch && widthMatch
        })
        .sort((a, b) => a.availableBalance - b.availableBalance) // Use smaller balances first

      logs.push(`  Order ${order.orderId}: Found ${coilsWithBalance.length} compatible coils with balance`)

      for (const { coil, availableBalance } of coilsWithBalance) {
        if (remainingOrderWeight <= 0) break

        const compatibleLine = lines.find((line) => {
          return (
            coil.width <= line.maxWidth &&
            coil.width >= line.minWidth &&
            coil.thickness <= line.maxThickness &&
            coil.weight <= line.maxWeight
          )
        })

        if (!compatibleLine) {
          console.log(`[v0]   Coil ${coil.coilId}: No compatible line found`)
          continue
        }

        const allocatedWeight = Math.min(availableBalance, remainingOrderWeight)
        const currentUsed = usedCoilCapacity.get(coil.id) || 0
        const newUsed = currentUsed + allocatedWeight
        const coilConsumption = (newUsed / coil.weight) * 100
        const coilBalance = 100 - coilConsumption

        // Update capacity tracking
        usedCoilCapacity.set(coil.id, newUsed)

        const sideScrap = (coil.width - order.width) * order.length * (allocatedWeight / order.weight)
        const utilization = (allocatedWeight / coil.weight) * 100

        console.log(`[v0]   Allocating ${allocatedWeight.toFixed(2)} MT from ${coil.coilId} to ${order.orderId}`)

        orderPatterns.push({
          coilId: coil.id,
          lineId: compatibleLine.id,
          orderIds: [order.id],
          sideScrap,
          endScrap: 0,
          utilization,
          changeoverCost: 100,
          totalScore: utilization * 10 - sideScrap / 1000 - 100,
          coilConsumption,
          coilBalance,
          isPartialAllocation: true,
          allocatedWeight,
          orderAllocations: [
            {
              orderId: order.id,
              allocatedWeight,
              isPartial: remainingOrderWeight > allocatedWeight,
            },
          ],
        })

        remainingOrderWeight -= allocatedWeight
        logs.push(`    Allocated ${allocatedWeight.toFixed(2)} MT from ${coil.coilId} (Balance used)`)
      }

      // Check if order was fulfilled
      if (remainingOrderWeight <= order.weight * 0.01) {
        // 99% fulfilled
        patterns.push(...orderPatterns)
        fulfilledOrders.push(order.id)
        logs.push(`  Order ${order.orderId}: FULFILLED using ${orderPatterns.length} coil balance(s)`)
      } else if (orderPatterns.length > 0) {
        // Partial fulfillment - still add patterns but don't mark as fulfilled
        patterns.push(...orderPatterns)
        const totalAllocated = order.weight - remainingOrderWeight
        logs.push(
          `  Order ${order.orderId}: PARTIAL (${totalAllocated.toFixed(2)}/${order.weight.toFixed(2)} MT allocated)`,
        )
      } else {
        logs.push(`  Order ${order.orderId}: No compatible balance coils found`)
      }
    }

    return { patterns, fulfilledOrders }
  }

  const runOptimization = () => {
    setLoading(true)
    setOptimizationComplete(false)
    setAssignmentsConfirmed(false)
    const logs: string[] = []
    const patterns: CuttingPattern[] = []
    const usedCoilCapacity = new Map<string, number>()

    logs.push(`Starting optimization with ${coils.length} coils and ${orders.length} orders`)

    const remainingOrders = new Set(orders.map((o) => o.id))
    const usedCoils = new Set<string>()

    // --- Pass 1: Group orders and find single coil matches ---
    const orderGroups = groupCompatibleOrders(Array.from(remainingOrders))
    logs.push(`--- Pass 1: Grouped ${orders.length} orders into ${orderGroups.length} compatible groups ---`)

    for (const orderGroup of orderGroups) {
      const groupOrders = orders.filter((o) => orderGroup.includes(o.id))
      if (groupOrders.length === 0) continue

      const maxWidth = Math.max(...groupOrders.map((o) => o.width))
      const commonThickness = groupOrders[0].thickness
      const commonGrade = groupOrders[0].grade
      const commonProduct = groupOrders[0].product
      const totalTonnage = groupOrders.reduce((sum, o) => sum + o.weight, 0)

      let bestPattern: CuttingPattern | null = null
      let bestCoilId: string | null = null

      for (const coil of coils) {
        if (usedCoils.has(coil.id)) continue
        if (coil.thickness !== commonThickness) continue
        if (coil.grade !== commonGrade) continue
        if (coil.product !== commonProduct) continue
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
        const allocatedAmount = bestPattern.allocatedWeight || 0
        usedCoilCapacity.set(bestCoilId, allocatedAmount)
        orderGroup.forEach((id) => remainingOrders.delete(id))

        const coilInfo = coils.find((c) => c.id === bestCoilId)
        console.log(
          `[v0] Pass 1: Coil ${coilInfo?.coilId} - Allocated: ${allocatedAmount.toFixed(2)} MT, Total Weight: ${coilInfo?.weight.toFixed(2)} MT, Balance: ${((coilInfo?.weight || 0) - allocatedAmount).toFixed(2)} MT`,
        )

        logs.push(
          `Group of ${orderGroup.length} orders assigned to coil ${coilInfo?.coilId} with ${bestPattern.utilization.toFixed(1)}% utilization`,
        )
      }
    }

    // --- Pass 2: Multi-coil fulfillment for large orders ---
    if (remainingOrders.size > 0) {
      logs.push(`--- Pass 2: Multi-coil fulfillment for ${remainingOrders.size} remaining orders ---`)

      const unfulfilledOrdersList = orders
        .filter((o) => remainingOrders.has(o.id))
        .sort((a, b) => a.priority - b.priority)

      for (const order of unfulfilledOrdersList) {
        if (!remainingOrders.has(order.id)) continue

        const availableCoils = coils.filter((c) => {
          const usedCapacity = usedCoilCapacity.get(c.id) || 0
          return usedCapacity < c.weight
        })

        const multiCoilPatterns = fulfillOrderWithMultipleCoils(order, availableCoils, usedCoilCapacity)

        if (multiCoilPatterns.length > 0) {
          const totalAllocated = multiCoilPatterns.reduce((sum, p) => sum + (p.allocatedWeight || 0), 0)

          if (totalAllocated >= order.weight * 0.99) {
            patterns.push(...multiCoilPatterns)
            remainingOrders.delete(order.id)

            multiCoilPatterns.forEach((p) => {
              const coil = coils.find((c) => c.id === p.coilId)
              if (coil && (usedCoilCapacity.get(p.coilId) || 0) >= coil.weight * 0.99) {
                usedCoils.add(p.coilId)
              }
            })

            logs.push(
              `Order ${order.orderId} fulfilled using ${multiCoilPatterns.length} coils (${totalAllocated.toFixed(2)} MT allocated)`,
            )
          } else {
            logs.push(
              `Order ${order.orderId}: Partial fulfillment only (${totalAllocated.toFixed(2)}/${order.weight.toFixed(2)} MT)`,
            )
          }
        }
      }
    }

    // --- Pass 3: Allocate pending orders to coil balances ---
    if (remainingOrders.size > 0) {
      logs.push(`--- Pass 3: Allocating ${remainingOrders.size} pending orders to coils with available balance ---`)

      console.log(`[v0] Pass 3 Start - usedCoilCapacity:`)
      coils.forEach((c) => {
        const used = usedCoilCapacity.get(c.id) || 0
        const balance = c.weight - used
        console.log(`[v0]   ${c.coilId}: Used ${used.toFixed(2)} MT, Balance ${balance.toFixed(2)} MT`)
      })

      console.log(`[v0] Pending orders:`)
      orders
        .filter((o) => remainingOrders.has(o.id))
        .forEach((o) => {
          console.log(
            `[v0]   ${o.orderId}: Grade=${o.grade}, Thickness=${o.thickness}, Width=${o.width}, Product=${o.product}, Weight=${o.weight?.toFixed(2)} MT`,
          )
        })

      const { patterns: balancePatterns, fulfilledOrders } = allocateOrdersToBalanceCoils(
        remainingOrders,
        usedCoilCapacity,
        logs,
      )

      if (balancePatterns.length > 0) {
        patterns.push(...balancePatterns)
        fulfilledOrders.forEach((orderId) => {
          remainingOrders.delete(orderId)
        })
        logs.push(`Pass 3 complete: ${fulfilledOrders.length} orders allocated to coil balances`)
      } else {
        logs.push(`Pass 3: No compatible coil balances found for remaining orders`)
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

    const timestamp = Date.now()
    const assignments: Assignment[] = patterns.map((p, idx) => ({
      id: `assign_${timestamp}_${idx}`,
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
      isPartialAllocation: p.isPartialAllocation,
      allocatedWeight: p.allocatedWeight,
      orderAllocations: p.orderAllocations,
    }))

    setProposedAssignments(assignments)
    setOptimizationComplete(true)
    setLoading(false)
  }

  const generateRMForecasts = (unfulfilledOrderIds: Set<string>): RMForecast[] => {
    const forecasts: RMForecast[] = []
    const unfulfilledOrders = orders.filter((o) => unfulfilledOrderIds.has(o.id))

    const groupedBySpec = new Map<string, typeof unfulfilledOrders>()

    unfulfilledOrders.forEach((order) => {
      const key = `${order.thickness}_${order.grade}`
      if (!groupedBySpec.has(key)) {
        groupedBySpec.set(key, [])
      }
      groupedBySpec.get(key)!.push(order)
    })

    groupedBySpec.forEach((groupOrders) => {
      if (!groupOrders || groupOrders.length === 0) return

      const avgWidth = Math.max(...groupOrders.map((o) => o.width ?? 0)) + 20
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

  const handleConfirmAll = () => {
    confirmAssignments()
    setAssignmentsConfirmed(true)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-900">Optimization Engine</h3>
          <Button
            onClick={runOptimization}
            disabled={loading || coils.length === 0 || orders.length === 0}
            className={`w-40 h-10 ${optimizationComplete ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white`}
          >
            <Zap className="w-4 h-4 mr-2" />
            {loading ? "Optimizing..." : optimizationComplete ? "Optimization Done" : "Run Optimization"}
          </Button>
        </div>
        <div>
          <p className="mt-2 text-sm text-muted-foreground">
            Run the optimization algorithm to generate optimal coil-to-line assignments with intelligent order grouping,
            multi-coil fulfillment, and balance utilization
          </p>
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
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Proposed Assignments ({proposedAssignments.length})</h3>
            <Button
              onClick={handleConfirmAll}
              size="sm"
              className={`w-40 h-10 ${assignmentsConfirmed ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} text-white text-xs`}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              {assignmentsConfirmed ? "Confirmed" : "Confirm All"}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {proposedAssignments.map((assignment) => {
              const coil = coils.find((c) => c.id === assignment.coilId)
              const line = lines.find((l) => l.id === assignment.lineId)
              const assignedOrders = orders.filter((o) => assignment.orderIds.includes(o.id))
              return (
                <div
                  key={assignment.id}
                  className={`p-2 border rounded-lg text-xs ${assignment.isPartialAllocation ? "bg-yellow-50 border-yellow-200" : "bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-xs">
                        {coil?.coilId || "N/A"} → {line?.name || "N/A"}
                      </span>
                      {assignment.isPartialAllocation && (
                        <span className="px-1 py-0.5 text-[10px] font-medium bg-yellow-200 text-yellow-800 rounded">
                          Partial
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {assignment.utilization?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground truncate">
                    Orders: {assignedOrders.map((o) => o.orderId).join(", ") || "None"}
                  </div>
                  <div className="mt-1 text-[10px]">
                    <span className="text-green-600">
                      {assignment.coilConsumption?.toFixed(1) || 0}%
                      {assignment.allocatedWeight && ` (${assignment.allocatedWeight.toFixed(2)}MT)`}
                    </span>
                    <span className="mx-1">|</span>
                    <span className="text-blue-600">Bal: {assignment.coilBalance?.toFixed(1) || 0}%</span>
                  </div>
                  {assignment.orderAllocations && assignment.orderAllocations.length > 0 && (
                    <div className="mt-1 text-[10px] text-muted-foreground truncate">
                      {assignment.orderAllocations.map((oa, idx) => {
                        const ord = orders.find((o) => o.id === oa.orderId)
                        return (
                          <span key={idx}>
                            {ord?.orderId}: {oa.allocatedWeight.toFixed(2)}MT{oa.isPartial ? "*" : ""}
                            {idx < assignment.orderAllocations!.length - 1 ? ", " : ""}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
