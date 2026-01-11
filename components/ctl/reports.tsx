"use client"

import { useCTL } from "./ctl-context"
import { Card } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertCircle } from "lucide-react"
import { getUtilizationColor } from "@/lib/utilization-colors"

export default function Reports() {
  const { actualAssignments, proposedAssignments, coils, orders, rmForecasts } = useCTL()

  const calculateMetrics = (assignments: typeof actualAssignments) => {
    const totalScrap = assignments.reduce((sum, a) => sum + a.sideScrap + a.endScrap, 0)
    const totalMaterial = assignments.reduce((sum, a) => {
      const ordersTonnage = orders
        .filter((o) => a.orderIds.includes(o.id))
        .reduce((s, o) => s + (o.quantity * o.weight || 0), 0)
      return sum + ordersTonnage
    }, 0)

    const scrapPercentage = totalMaterial > 0 ? (totalScrap / (totalMaterial + totalScrap)) * 100 : 0
    const totalCoilsUsed = new Set(assignments.map((a) => a.coilId)).size
    const avgUtilization =
      assignments.length > 0 ? assignments.reduce((sum, a) => sum + a.utilization, 0) / assignments.length : 0

    return { totalScrap, scrapPercentage, totalCoilsUsed, avgUtilization, assignments }
  }

  const actualMetrics = calculateMetrics(actualAssignments)
  const proposedMetrics = calculateMetrics(proposedAssignments)

  const utilizationData = [
    ...proposedAssignments.map((a, idx) => ({
      name: `P${idx + 1}`,
      utilization: Number.parseFloat(a.utilization.toFixed(1)),
      type: "Proposed",
    })),
    ...actualAssignments.map((a, idx) => ({
      name: `A${idx + 1}`,
      utilization: Number.parseFloat(a.utilization.toFixed(1)),
      type: "Actual",
    })),
  ]

  return (
    <div className="space-y-6">
      {actualAssignments.length === 0 && proposedAssignments.length === 0 && rmForecasts.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <p>No data available. Run optimization to generate reports.</p>
        </Card>
      ) : (
        <>
          {actualAssignments.length > 0 && proposedAssignments.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h2 className="text-lg font-bold text-blue-900">Actual vs Proposed Comparison</h2>
              <p className="text-sm text-blue-700 mt-1">
                Compare confirmed assignments with the latest optimization proposal
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposedAssignments.length > 0 && (
              <Card className="p-6 border-2 border-blue-200">
                <h3 className="mb-4 text-lg font-semibold text-blue-900">Proposed Assignments</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Total Assignments</span>
                    <span className="text-2xl font-bold text-primary">{proposedMetrics.assignments.length}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Coils Used</span>
                    <span className="text-2xl font-bold text-primary">{proposedMetrics.totalCoilsUsed}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Avg Utilization</span>
                    <span
                      className={`text-2xl font-bold ${getUtilizationColor(proposedMetrics.avgUtilization).textClass}`}
                    >
                      {proposedMetrics.avgUtilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Total Scrap</span>
                    <span className="text-2xl font-bold">{(proposedMetrics.totalScrap / 1000).toFixed(2)} m²</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Scrap %</span>
                    <span className="text-2xl font-bold text-destructive">
                      {proposedMetrics.scrapPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </Card>
            )}

            {actualAssignments.length > 0 && (
              <Card className="p-6 border-2 border-green-200">
                <h3 className="mb-4 text-lg font-semibold text-green-900">Actual Assignments</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Total Assignments</span>
                    <span className="text-2xl font-bold text-green-600">{actualMetrics.assignments.length}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Coils Used</span>
                    <span className="text-2xl font-bold text-green-600">{actualMetrics.totalCoilsUsed}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Avg Utilization</span>
                    <span
                      className={`text-2xl font-bold ${getUtilizationColor(actualMetrics.avgUtilization).textClass}`}
                    >
                      {actualMetrics.avgUtilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="text-sm">Total Scrap</span>
                    <span className="text-2xl font-bold">{(actualMetrics.totalScrap / 1000).toFixed(2)} m²</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Scrap %</span>
                    <span className="text-2xl font-bold text-destructive">
                      {actualMetrics.scrapPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {rmForecasts.length > 0 && (
            <Card className="p-6 border-2 border-orange-200 bg-orange-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="mb-4 text-lg font-semibold text-orange-900">Recommended Raw Material (RM) Forecast</h3>
                  <p className="text-sm text-orange-700 mb-4">
                    The following coils are recommended to fulfill unfulfilled orders:
                  </p>
                  <div className="space-y-4">
                    {rmForecasts.map((forecast, idx) => (
                      <div key={idx} className="bg-white border border-orange-200 rounded-lg p-4">
                        <div className="mb-4 pb-4 border-b-2 border-orange-300">
                          <h4 className="font-semibold text-orange-900 mb-3">Recommended Coil #{idx + 1}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Width</p>
                              <p className="text-lg font-bold text-orange-900">{forecast.recommendedWidth} mm</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Thickness</p>
                              <p className="text-lg font-bold text-orange-900">{forecast.recommendedThickness} mm</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Weight</p>
                              <p className="text-lg font-bold text-orange-900">{forecast.recommendedWeight} tonnes</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Grade</p>
                              <p className="text-lg font-bold text-orange-900">{forecast.grade}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">
                            Required for {forecast.orderDetails?.length || 0} Order(s):
                          </h5>
                          <div className="space-y-2">
                            {forecast.orderDetails?.map((detail, oIdx) => (
                              <div
                                key={oIdx}
                                className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded p-3"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{detail.orderId}</p>
                                  <p className="text-xs text-gray-600">
                                    {detail.quantity} sheet(s) × {detail.requiredWidth}mm × {detail.requiredLength}mm
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-semibold text-orange-900">
                                    {detail.estimatedWeight.toFixed(2)} tonnes
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {proposedAssignments.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Proposed Assignments Detail</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {proposedAssignments.map((assign, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <span className="text-sm font-medium">Assignment {idx + 1}</span>
                    <div className="text-right text-sm">
                      <div className={`font-semibold ${getUtilizationColor(assign.utilization).textClass}`}>
                        Utilization: {assign.utilization.toFixed(1)}% | Scrap:{" "}
                        {((assign.sideScrap + assign.endScrap) / 1000).toFixed(2)}m²
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {actualAssignments.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Actual Assignments Detail</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {actualAssignments.map((assign, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border-b border-border pb-3 last:border-0"
                  >
                    <span className="text-sm font-medium">Assignment {idx + 1}</span>
                    <div className="text-right text-sm">
                      <div className={`font-semibold ${getUtilizationColor(assign.utilization).textClass}`}>
                        Utilization: {assign.utilization.toFixed(1)}% | Scrap:{" "}
                        {((assign.sideScrap + assign.endScrap) / 1000).toFixed(2)}m²
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {utilizationData.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-semibold">Utilization Comparison</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={utilizationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="utilization" fill="oklch(0.488 0.243 264.376)" name="Utilization (%)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
