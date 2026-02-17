"use client"

import { useCTL } from "./ctl-context"
import { Card } from "@/components/ui/card"
import { AlertCircle, TrendingUp } from "lucide-react"

export default function RMForecasting() {
  const { rmForecasts, orders, coils, proposedAssignments, actualAssignments } = useCTL()

  const allAssignments =
    actualAssignments && actualAssignments.length > 0 ? actualAssignments : proposedAssignments || []

  const allCoilsWithDetails = coils.map((coil) => {
    const coilAssignments = allAssignments.filter((a) => a.coilId === coil.id)
    const isUnused = coilAssignments.length === 0

    let totalConsumedWeight = 0

    // Aggregate weight from all assignments for this coil
    coilAssignments.forEach((assignment) => {
      let assignmentWeight = 0

      if (typeof assignment.allocatedWeight === "number" && assignment.allocatedWeight > 0) {
        assignmentWeight = assignment.allocatedWeight
      } else if (assignment.orderAllocations && assignment.orderAllocations.length > 0) {
        // Fallback to sum of orderAllocations
        assignmentWeight = assignment.orderAllocations.reduce((sum, oa) => sum + (oa.allocatedWeight || 0), 0)
      } else if (typeof assignment.coilConsumption === "number" && assignment.coilConsumption > 0) {
        // Last resort: use coilConsumption percentage
        assignmentWeight = (assignment.coilConsumption / 100) * coil.weight
      }

      totalConsumedWeight += assignmentWeight
    })

    const cappedConsumedWeight = Math.min(totalConsumedWeight, coil.weight)
    const actualBalanceWeight = Math.max(0, coil.weight - cappedConsumedWeight)
    const actualConsumedPercentage = isUnused ? 0 : (cappedConsumedWeight / coil.weight) * 100
    const actualBalancePercentage = isUnused ? 100 : (actualBalanceWeight / coil.weight) * 100

    const isFullyUsedBy6PercentRule = !isUnused && actualBalancePercentage < 6

    return {
      ...coil,
      isUnused,
      actualConsumedPercentage: Math.min(actualConsumedPercentage, 100),
      actualBalancePercentage: Math.max(actualBalancePercentage, 0),
      consumedWeight: cappedConsumedWeight,
      balanceWeight: actualBalanceWeight,
      status: isUnused ? "Unused" : isFullyUsedBy6PercentRule ? "Fully Used" : "Partial",
      isFullyUsedBy6PercentRule,
    }
  })

  const unusedCoils = allCoilsWithDetails.filter((c) => c.isUnused)
  const partialCoils = allCoilsWithDetails.filter((c) => c.status === "Partial")
  const fullyUsedCoils = allCoilsWithDetails.filter((c) => c.status === "Fully Used")

  if (rmForecasts.length === 0 && coils.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No RM forecasts or coils available. Add coils and run optimization to generate forecasts.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* RM forecasting section */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-bold text-blue-900">Raw Material (RM) Forecasting</h2>
            <p className="text-sm text-blue-700 mt-1">
              {rmForecasts.length} recommended coil(s) to fulfill unfulfilled sales orders
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {rmForecasts.map((forecast, idx) => (
          <Card key={idx} className="p-6 border-2 border-orange-300 bg-orange-50">
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-orange-900">Recommended Coil #{idx + 1}</h3>
                  <p className="text-sm text-orange-700 mt-1">Required to fulfill orders with no matching RM</p>
                </div>
              </div>

              <div className="bg-white border border-orange-200 rounded-lg p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Width</span>
                    <span className="text-xl font-bold text-orange-900 mt-1">{forecast.recommendedWidth}</span>
                    <span className="text-xs text-gray-600 mt-0.5">mm</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Thickness</span>
                    <span className="text-xl font-bold text-orange-900 mt-1">{forecast.recommendedThickness}</span>
                    <span className="text-xs text-gray-600 mt-0.5">mm</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight</span>
                    <span className="text-xl font-bold text-orange-900 mt-1">{forecast.recommendedWeight}</span>
                    <span className="text-xs text-gray-600 mt-0.5">tonnes</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grade</span>
                    <span className="text-xl font-bold text-orange-900 mt-1">{forecast.grade}</span>
                  </div>
                </div>

                <div className="border-t border-orange-200 pt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4">
                    Fulfills {forecast.orderDetails?.length || 0} Sales Order(s):
                  </h4>
                  <div className="space-y-3">
                    {forecast.orderDetails && forecast.orderDetails.length > 0 ? (
                      forecast.orderDetails.map((detail, oIdx) => (
                        <div
                          key={oIdx}
                          className="bg-gradient-to-r from-orange-100 to-orange-50 border border-orange-200 rounded-lg p-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Order ID</p>
                              <p className="text-sm font-bold text-orange-900 mt-1">{detail.orderId}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Sheets Required</p>
                              <p className="text-sm font-bold text-orange-900 mt-1">
                                {detail.quantity} × {detail.requiredWidth}mm × {detail.requiredLength}mm
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-600 uppercase">Estimated Weight</p>
                              <p className="text-sm font-bold text-orange-900 mt-1">
                                {detail.estimatedWeight.toFixed(2)} tonnes
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-600 italic">No order details available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {coils.length > 0 && (
        <>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-green-900">Coils with Available Balance</h2>
                <p className="text-sm text-green-700 mt-1">
                  Total: {coils.length} coil(s) |<span className="text-blue-700"> Unused: {unusedCoils.length}</span> |
                  <span className="text-orange-700"> Partial: {partialCoils.length}</span> |
                  <span className="text-gray-700"> Fully Used: {fullyUsedCoils.length}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-blue-100 border-b border-blue-300 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-blue-900">Coil ID</th>
                  <th className="px-3 py-2 text-left font-semibold text-blue-900">Product</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Grade</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Total Wt (T)</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Consumed (T)</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Balance (T)</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Width (mm)</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Thickness (mm)</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Length (mm)</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Used %</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Balance %</th>
                  <th className="px-3 py-2 text-center font-semibold text-blue-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {allCoilsWithDetails.map((coil, idx) => {
                  const bgColor = coil.isUnused
                    ? idx % 2 === 0
                      ? "bg-blue-50"
                      : "bg-blue-100/50"
                    : coil.status === "Fully Used"
                      ? idx % 2 === 0
                        ? "bg-gray-50"
                        : "bg-gray-100/50"
                      : idx % 2 === 0
                        ? "bg-green-50"
                        : "bg-green-100/50"

                  return (
                    <tr key={idx} className={`border-b ${bgColor} hover:bg-opacity-75`}>
                      <td className="px-3 py-2 font-semibold text-gray-900">{coil.coilId}</td>
                      <td className="px-3 py-2 text-gray-700">{coil.product}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{coil.grade}</td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-900">{coil.weight.toFixed(2)}</td>
                      <td className="px-3 py-2 text-center font-semibold text-green-700">
                        {coil.consumedWeight.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center font-semibold text-orange-600">
                        {coil.balanceWeight.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-700">{coil.width}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{coil.thickness}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{coil.length?.toFixed(0) || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-1.5 w-8 bg-gray-200 rounded overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${Math.min(coil.actualConsumedPercentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-green-700 font-semibold">
                            {coil.actualConsumedPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-1.5 w-8 bg-gray-200 rounded overflow-hidden">
                            <div
                              className={`h-full ${coil.isUnused ? "bg-blue-400" : coil.status === "Fully Used" ? "bg-gray-400" : "bg-red-500"}`}
                              style={{ width: `${Math.min(coil.actualBalancePercentage, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`font-semibold ${coil.isUnused ? "text-blue-700" : coil.status === "Fully Used" ? "text-gray-500" : "text-red-700"}`}
                          >
                            {coil.actualBalancePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {coil.isUnused ? (
                          <span className="inline-block bg-blue-200 text-blue-900 px-2 py-0.5 rounded text-xs font-semibold">
                            Unused
                          </span>
                        ) : coil.status === "Fully Used" ? (
                          <span className="inline-block bg-gray-200 text-gray-900 px-2 py-0.5 rounded text-xs font-semibold">
                            Fully Used
                          </span>
                        ) : (
                          <span className="inline-block bg-orange-200 text-orange-900 px-2 py-0.5 rounded text-xs font-semibold">
                            Partial
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mt-2">
            <p className="text-sm text-yellow-800 font-medium">
              <span className="font-bold">Note:</span> As Balance % is &lt;6%, it is considered as 100% used (Fully Used
              status).
            </p>
          </div>
        </>
      )}

      <Card className="p-6 bg-blue-50 border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">Action Items:</h4>
        <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
          <li>Place purchase orders for recommended coils with specified dimensions</li>
          <li>Ensure grade and thickness match the requirements listed above</li>
          <li>Verify weight and width tolerances with suppliers</li>
          <li>Re-run optimization once new coils arrive to generate assignments</li>
          {coils.length > 0 && (
            <li>Consider allocating available balance coils to future orders with compatible specifications</li>
          )}
        </ul>
      </Card>
    </div>
  )
}
