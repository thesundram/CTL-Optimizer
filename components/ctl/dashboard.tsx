"use client"

import { useCTL } from "./ctl-context"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getUtilizationColor } from "@/lib/utilization-colors"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function Dashboard() {
  const { coils, orders, lines, proposedAssignments, actualAssignments } = useCTL()

  const allAssignments = [...(proposedAssignments || []), ...(actualAssignments || [])]
  const totalCoilWeight = coils.reduce((sum, c) => sum + c.weight, 0)
  const totalOrderQuantity = orders.reduce((sum, o) => sum + o.quantity, 0)
  const assignedCoils = new Set(allAssignments.map((a) => a.coilId)).size
  const fulfilledOrders = new Set(allAssignments.flatMap((a) => a.orderIds)).size

  const avgUtilization =
    allAssignments.length > 0 ? allAssignments.reduce((sum, a) => sum + a.utilization, 0) / allAssignments.length : 0

  const avgUtilColor = getUtilizationColor(avgUtilization)

  const totalScrap = allAssignments.reduce((sum, a) => sum + a.sideScrap + a.endScrap, 0)

  const coilConsumptionData = allAssignments.map((assign) => {
    const coil = coils.find((c) => c.id === assign.coilId)
    const assignOrders = orders.filter((o) => assign.orderIds.includes(o.id))
    return {
      coilId: coil?.coilId || "Unknown",
      consumption: assign.coilConsumption,
      balance: assign.coilBalance,
      weight: coil?.weight || 0,
      grade: coil?.grade || "",
      thickness: coil?.thickness || 0,
      orders: assignOrders.length,
    }
  })

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
                {fulfilledOrders}/{totalOrderQuantity}
              </div>
            </Card>
            <Card className={`p-4 ${avgUtilColor.bgClass}`}>
              <div className={`text-sm ${avgUtilColor.textClass}`}>Avg Utilization</div>
              <div className={`text-2xl font-bold ${avgUtilColor.textClass}`}>{avgUtilization.toFixed(1)}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Coil-wise Consumption & Balance Analysis</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={coilConsumptionData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="coilId" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} />
                <YAxis label={{ value: "Percentage (%)", angle: -90, position: "insideLeft" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                  labelFormatter={(label) => `Coil: ${label}`}
                />
                <Legend />
                <Bar dataKey="consumption" fill="#22c55e" name="Consumption %" radius={[8, 8, 0, 0]} />
                <Bar dataKey="balance" fill="#ef4444" name="Balance %" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coilConsumptionData.map((data, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{data.coilId}</h3>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div>Weight: {data.weight}t</div>
                        <div>Grade: {data.grade}</div>
                        <div>Thickness: {data.thickness}mm</div>
                        <div>Orders: {data.orders}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <div className="text-2xl font-bold text-green-600">{data.consumption.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Consumption</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-red-600">{data.balance.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Balance</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-red-200">
                    <div className="h-full bg-green-500" style={{ width: `${Math.min(data.consumption, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold">Detailed Assignments</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {allAssignments.map((assign, idx) => {
                const coil = coils.find((c) => c.id === assign.coilId)
                const line = lines.find((l) => l.id === assign.lineId)
                const assignOrders = orders.filter((o) => assign.orderIds.includes(o.id))
                const utilColor = getUtilizationColor(assign.utilization)

                return (
                  <div key={idx} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">
                          {coil?.coilId} → {line?.name}
                        </h3>
                        <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium text-foreground">Coil Specs:</span> {coil?.width}mm W ×{" "}
                            {coil?.thickness}mm T × {coil?.weight}t
                          </div>
                          <div>
                            <span className="font-medium text-foreground">Line Specs:</span> {line?.minWidth}-
                            {line?.maxWidth}mm, Cost: ${line?.cost}/t
                          </div>
                          <div className="mt-2">
                            <span className="font-medium text-foreground">Orders:</span>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {assignOrders.map((o) => (
                                <Badge key={o.id} variant="secondary" className="text-xs">
                                  {o.orderId} ({o.quantity}x)
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="font-medium text-foreground">Scrap Analysis:</span>
                            <div className="mt-1 text-xs">
                              Side: {(assign.sideScrap / 1000).toFixed(2)}m² | End:{" "}
                              {(assign.endScrap / 1000).toFixed(2)}m² | Total:{" "}
                              {((assign.sideScrap + assign.endScrap) / 1000).toFixed(2)}m²
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className={`rounded px-3 py-2 ${utilColor.bgClass}`}>
                          <div className={`text-2xl font-bold ${utilColor.textClass}`}>
                            {assign.utilization.toFixed(1)}%
                          </div>
                          <div className={`text-xs ${utilColor.textClass}`}>Utilization</div>
                        </div>
                        <Badge className="mt-2" variant={assign.status === "confirmed" ? "default" : "secondary"}>
                          {assign.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
