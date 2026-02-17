"use client"

import { useCTL } from "./ctl-context"
import { Card } from "@/components/ui/card"
import { getUtilizationColor } from "@/lib/utilization-colors"

const ORDER_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#6366f1", // indigo
  "#14b8a6", // teal
]

const COIL_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#ef4444", // red
  "#14b8a6", // teal
]

export default function Dashboard() {
  const { coils, orders, lines, proposedAssignments, actualAssignments } = useCTL()

  const allAssignments = actualAssignments.length > 0 ? actualAssignments : proposedAssignments

  const totalCoilWeight = coils.reduce((sum, c) => sum + c.weight, 0)
  const totalOrders = orders.length
  const assignedCoils = new Set(allAssignments.map((a) => a.coilId)).size
  const fulfilledOrders = new Set(allAssignments.flatMap((a) => a.orderIds)).size

  const avgUtilization =
    allAssignments.length > 0 ? allAssignments.reduce((sum, a) => sum + a.utilization, 0) / allAssignments.length : 0

  const avgUtilColor = getUtilizationColor(avgUtilization)

  const totalScrap = allAssignments.reduce((sum, a) => sum + a.sideScrap + a.endScrap, 0)

  const getCoilWiseBreakdown = () => {
    const coilOrderMap: Record<
      string,
      {
        coilId: string
        coilName: string
        coilWeight: number
        coilProduct: string
        coilWidth: number
        coilThickness: number
        coilGrade: string
        orders: { orderId: string; orderName: string; allocatedWeight: number; color: string }[]
      }
    > = {}

    allAssignments.forEach((assign) => {
      const coil = coils.find((c) => c.id === assign.coilId)
      if (!coil) return

      if (!coilOrderMap[assign.coilId]) {
        coilOrderMap[assign.coilId] = {
          coilId: coil.id,
          coilName: coil.coilId,
          coilWeight: coil.weight,
          coilProduct: coil.product,
          coilWidth: coil.width,
          coilThickness: coil.thickness,
          coilGrade: coil.grade,
          orders: [],
        }
      }

      assign.orderIds.forEach((orderId) => {
        const order = orders.find((o) => o.id === orderId)
        if (!order) return

        const orderAllocation = assign.orderAllocations?.find((oa) => oa.orderId === orderId)
        const allocatedWeight = orderAllocation?.allocatedWeight || order.weight || 0

        // Check if order already added to this coil
        const existingOrder = coilOrderMap[assign.coilId].orders.find((o) => o.orderId === orderId)
        if (!existingOrder) {
          coilOrderMap[assign.coilId].orders.push({
            orderId: orderId,
            orderName: order.orderId,
            allocatedWeight: allocatedWeight,
            color: ORDER_COLORS[coilOrderMap[assign.coilId].orders.length % ORDER_COLORS.length],
          })
        } else {
          // Add to existing allocation
          existingOrder.allocatedWeight += allocatedWeight
        }
      })
    })

    return Object.values(coilOrderMap)
  }

  const coilWiseBreakdown = getCoilWiseBreakdown()

  const getMultiCoilOrders = () => {
    const orderCoilMap: Record<
      string,
      {
        orderId: string
        orderWeight: number
        coils: { coilId: string; coilName: string; allocatedWeight: number; color: string }[]
      }
    > = {}

    allAssignments.forEach((assign) => {
      const coil = coils.find((c) => c.id === assign.coilId)
      if (!coil) return

      assign.orderIds.forEach((orderId) => {
        const order = orders.find((o) => o.id === orderId)
        if (!order) return

        if (!orderCoilMap[orderId]) {
          orderCoilMap[orderId] = {
            orderId: order.orderId,
            orderWeight: order.weight || 0,
            coils: [],
          }
        }

        const orderAllocation = assign.orderAllocations?.find((oa) => oa.orderId === orderId)
        const allocatedWeight = orderAllocation?.allocatedWeight || order.weight || 0

        // Check if this coil already added to this order
        const existingCoil = orderCoilMap[orderId].coils.find((c) => c.coilId === coil.id)
        if (!existingCoil) {
          orderCoilMap[orderId].coils.push({
            coilId: coil.id,
            coilName: coil.coilId,
            allocatedWeight: allocatedWeight,
            color: COIL_COLORS[orderCoilMap[orderId].coils.length % COIL_COLORS.length],
          })
        } else {
          existingCoil.allocatedWeight += allocatedWeight
        }
      })
    })

    return Object.values(orderCoilMap).filter((o) => o.coils.length > 1)
  }

  const multiCoilOrders = getMultiCoilOrders()

  return (
    <div className="space-y-6">
      {allAssignments.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No assignments yet. Run optimization to see results.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Assignments</div>
              <div className="text-2xl font-bold">{allAssignments.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Coils Used</div>
              <div className="text-2xl font-bold">{assignedCoils}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Orders Fulfilled</div>
              <div className="text-2xl font-bold">
                {fulfilledOrders}/{totalOrders}
              </div>
            </Card>
            <Card className={`p-4 ${avgUtilColor.bgClass}`}>
              <div className={`text-sm ${avgUtilColor.textClass}`}>Avg Utilization</div>
              <div className={`text-2xl font-bold ${avgUtilColor.textClass}`}>{avgUtilization.toFixed(1)}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Coil-wise Order Allocation</h2>
            <div className="space-y-6">
              {coilWiseBreakdown.map((coilData, idx) => {
                const totalAllocated = coilData.orders.reduce((sum, o) => sum + o.allocatedWeight, 0)
                const consumptionPercentage = (totalAllocated / coilData.coilWeight) * 100
                const remainingPercentage = Math.max(0, 100 - consumptionPercentage)

                const balancePercentage = remainingPercentage > 6 ? remainingPercentage : 0
                const scrapPercentage = remainingPercentage <= 6 ? remainingPercentage : 0

                return (
                  <div key={idx} className="border border-border rounded-lg p-4 bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{coilData.coilName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {coilData.coilProduct} | {coilData.coilWidth}mm × {coilData.coilThickness}mm |{" "}
                          {coilData.coilWeight?.toFixed(3)} MT | Grade: {coilData.coilGrade}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{consumptionPercentage.toFixed(1)}% Used</div>
                        {scrapPercentage > 0 && (
                          <div className="text-sm text-red-600">{scrapPercentage.toFixed(1)}% Scrap</div>
                        )}
                        {balancePercentage > 0 && (
                          <div className="text-sm text-orange-600">{balancePercentage.toFixed(1)}% Un-load</div>
                        )}
                      </div>
                    </div>

                    <div className="relative h-12 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100 flex">
                      {coilData.orders.map((order, orderIdx) => {
                        const percentage = (order.allocatedWeight / coilData.coilWeight) * 100
                        return (
                          <div
                            key={orderIdx}
                            className="h-full flex items-center justify-center text-white text-xs font-bold border-r-2 border-white relative group"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: order.color,
                              minWidth: percentage > 0 ? "40px" : "0",
                            }}
                          >
                            <span className="truncate px-1">{order.orderName}</span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                {order.orderName}: {percentage.toFixed(1)}% ({order.allocatedWeight.toFixed(3)} MT)
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {balancePercentage > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-white text-xs font-bold bg-gray-500 relative group border-r-2 border-white"
                          style={{ width: `${balancePercentage}%`, minWidth: balancePercentage > 0 ? "40px" : "0" }}
                        >
                          <span className="truncate px-1">Un-load</span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                              Un-load: {balancePercentage.toFixed(1)}% (
                              {((coilData.coilWeight * balancePercentage) / 100).toFixed(3)} MT)
                            </div>
                          </div>
                        </div>
                      )}
                      {scrapPercentage > 0 && (
                        <div
                          className="h-full flex items-center justify-center text-white text-xs font-bold bg-red-500 relative group"
                          style={{ width: `${scrapPercentage}%`, minWidth: scrapPercentage > 0 ? "40px" : "0" }}
                        >
                          <span className="truncate px-1">Scrap</span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                              Scrap: {scrapPercentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {coilData.orders.map((order, orderIdx) => {
                        const percentage = (order.allocatedWeight / coilData.coilWeight) * 100
                        return (
                          <div key={orderIdx} className="flex items-center gap-1 text-xs">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: order.color }} />
                            <span className="font-medium">{order.orderName}</span>
                            <span className="text-muted-foreground">({percentage.toFixed(1)}%)</span>
                          </div>
                        )
                      })}
                      {balancePercentage > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <div className="w-3 h-3 rounded bg-gray-500" />
                          <span className="font-medium">Un-load</span>
                          <span className="text-muted-foreground">({balancePercentage.toFixed(1)}%)</span>
                        </div>
                      )}
                      {scrapPercentage > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <div className="w-3 h-3 rounded bg-red-500" />
                          <span className="font-medium">Scrap</span>
                          <span className="text-muted-foreground">({scrapPercentage.toFixed(1)}%)</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {multiCoilOrders.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">Order-wise Coil Allocation</h2>
              <p className="text-sm text-muted-foreground mb-4">Orders fulfilled by multiple coils</p>
              <div className="space-y-6">
                {multiCoilOrders.map((orderData, idx) => {
                  const totalAllocated = orderData.coils.reduce((sum, c) => sum + c.allocatedWeight, 0)
                  const unfulfilledWeight = Math.max(0, orderData.orderWeight - totalAllocated)
                  const unfulfilledPercentage = (unfulfilledWeight / orderData.orderWeight) * 100

                  return (
                    <div key={idx} className="border border-border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{orderData.orderId}</h3>
                          <p className="text-sm text-muted-foreground">
                            Total Order Weight: {orderData.orderWeight.toFixed(3)} MT | Fulfilled by{" "}
                            {orderData.coils.length} coils
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {((totalAllocated / orderData.orderWeight) * 100).toFixed(1)}% Fulfilled
                          </div>
                          {unfulfilledPercentage > 0 && (
                            <div className="text-sm text-orange-600">
                              {unfulfilledPercentage.toFixed(1)}% Unfulfilled
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="relative h-12 rounded-lg overflow-hidden border-2 border-gray-300 bg-gray-100 flex">
                        {orderData.coils.map((coil, coilIdx) => {
                          const percentage = (coil.allocatedWeight / orderData.orderWeight) * 100
                          return (
                            <div
                              key={coilIdx}
                              className="h-full flex items-center justify-center text-white text-xs font-bold border-r-2 border-white relative group"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: coil.color,
                                minWidth: percentage > 0 ? "40px" : "0",
                              }}
                            >
                              <span className="truncate px-1">{coil.coilName}</span>
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                  {coil.coilName}: {percentage.toFixed(1)}% ({coil.allocatedWeight.toFixed(3)} MT)
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        {unfulfilledPercentage > 0 && (
                          <div
                            className="h-full flex items-center justify-center text-white text-xs font-bold bg-gray-400 relative group"
                            style={{
                              width: `${unfulfilledPercentage}%`,
                              minWidth: unfulfilledPercentage > 0 ? "40px" : "0",
                            }}
                          >
                            <span className="truncate px-1">Unfulfilled</span>
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                              <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                Unfulfilled: {unfulfilledPercentage.toFixed(1)}% ({unfulfilledWeight.toFixed(3)} MT)
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {orderData.coils.map((coil, coilIdx) => {
                          const percentage = (coil.allocatedWeight / orderData.orderWeight) * 100
                          return (
                            <div key={coilIdx} className="flex items-center gap-1 text-xs">
                              <div className="w-3 h-3 rounded" style={{ backgroundColor: coil.color }} />
                              <span className="font-medium">{coil.coilName}</span>
                              <span className="text-muted-foreground">
                                ({percentage.toFixed(1)}% - {coil.allocatedWeight.toFixed(3)} MT)
                              </span>
                            </div>
                          )
                        })}
                        {unfulfilledPercentage > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <div className="w-3 h-3 rounded bg-gray-400" />
                            <span className="font-medium">Unfulfilled</span>
                            <span className="text-muted-foreground">
                              ({unfulfilledPercentage.toFixed(1)}% - {unfulfilledWeight.toFixed(3)} MT)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
