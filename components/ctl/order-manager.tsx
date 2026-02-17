"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useCTL, type Order } from "./ctl-context"
import { Badge } from "@/components/ui/badge"
import { Trash2, Upload, Pencil, X, Check } from "lucide-react"

export default function OrderManager() {
  const { orders, addOrder, updateOrder, bulkImportOrders, deleteOrder } = useCTL()
  const [formData, setFormData] = useState<Omit<Order, "id">>({
    orderId: "",
    product: "" as any,
    thickness: 0,
    width: 0,
    length: 0,
    quantity: 0,
    grade: "",
    coilPacketWeight: 0,
    dueDate: "",
    priority: 0,
    weight: 0,
    status: "pending",
  })
  const [uploadError, setUploadError] = useState<string>("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Order>>({})

  const calculateWeight = (width: number, length: number, thickness: number, quantity: number) => {
    const STEEL_DENSITY = 7.85
    const weight = (width * length * thickness * quantity * STEEL_DENSITY) / 1000000000
    return Math.round(weight * 100) / 100
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.orderId.trim()) {
      addOrder(formData as Order)
      setFormData({
        orderId: "",
        product: "" as any,
        thickness: 0,
        width: 0,
        length: 0,
        quantity: 0,
        grade: "",
        coilPacketWeight: 0,
        dueDate: "",
        priority: 0,
        weight: 0,
        status: "pending",
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError("")

    try {
      const text = await file.text()
      const lines = text.trim().split("\n")

      if (lines.length < 2) {
        setUploadError("CSV file must have header and at least one row")
        return
      }

      const headers = lines[0]
        .toLowerCase()
        .split(",")
        .map((h) => h.trim())
      const requiredHeaders = [
        "orderid",
        "product",
        "thickness",
        "width",
        "length",
        "quantity",
        "grade",
        "coilpacketweight",
        "priority",
        "duedate",
      ]

      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
      if (missingHeaders.length > 0) {
        setUploadError(`Missing required columns: ${missingHeaders.join(", ")}`)
        return
      }

      const ordersToImport: Omit<Order, "id">[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        if (values.length < requiredHeaders.length || !values[0]) continue

        const orderId = values[headers.indexOf("orderid")]
        const product = values[headers.indexOf("product")] as Order["product"]
        const thickness = Number.parseFloat(values[headers.indexOf("thickness")])
        const width = Number.parseInt(values[headers.indexOf("width")])
        const length = Number.parseInt(values[headers.indexOf("length")])
        const quantity = Number.parseInt(values[headers.indexOf("quantity")])
        const grade = values[headers.indexOf("grade")]
        const coilPacketWeight = Number.parseFloat(values[headers.indexOf("coilpacketweight")])
        const priority = Number.parseInt(values[headers.indexOf("priority")])
        const dueDate = values[headers.indexOf("duedate")]

        if (!orderId || !product || !thickness || !width || !length || !quantity || !grade || !priority || !dueDate) {
          continue
        }

        const weight = calculateWeight(width, length, thickness, quantity)

        ordersToImport.push({
          orderId,
          product,
          thickness,
          width,
          length,
          quantity,
          grade,
          coilPacketWeight,
          dueDate,
          priority,
          weight,
          status: "pending",
        })
      }

      if (ordersToImport.length === 0) {
        setUploadError("No valid orders found in the CSV file")
        return
      }

      bulkImportOrders(ordersToImport)
      setUploadError("")
      if (e.target) e.target.value = ""
    } catch (error) {
      setUploadError("Error reading file: " + (error instanceof Error ? error.message : "Unknown error"))
    }
  }

  const handleEditClick = (order: Order) => {
    setEditingId(order.id)
    setEditFormData({ ...order })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditFormData({})
  }

  const handleEditSave = () => {
    if (editingId && editFormData) {
      updateOrder(editingId, editFormData)
      setEditingId(null)
      setEditFormData({})
    }
  }

  const statusColor = {
    pending: "bg-gray-100 text-gray-800",
    assigned: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
  }

  const statusLabel = {
    pending: "Pending",
    assigned: "In Process",
    completed: "Complete",
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Add Order (Sales Requirement)</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Order ID</label>
            <Input
              placeholder="e.g., ORD-001"
              value={formData.orderId}
              onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              value={formData.product}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  product: e.target.value as "HR" | "CR" | "GP" | "CC" | "SS",
                })
              }
              className="h-11 text-base w-full px-3 border-2 border-blue-400 rounded-md shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select Product</option>
              <option value="HR">HR (Hot Rolled)</option>
              <option value="CR">CR (Cold Rolled)</option>
              <option value="GP">GP (Galvanized)</option>
              <option value="CC">CC (Color Coated)</option>
              <option value="SS">SS (Stainless Steel)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Thickness (mm)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="2"
              value={formData.thickness || ""}
              onChange={(e) => {
                const thickness = e.target.value ? Number.parseFloat(e.target.value) : 0
                setFormData({
                  ...formData,
                  thickness,
                  weight: calculateWeight(formData.width, formData.length, thickness, formData.quantity),
                })
              }}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Width (mm)</label>
            <Input
              type="number"
              placeholder="1000"
              value={formData.width || ""}
              onChange={(e) => {
                const width = e.target.value ? Number.parseInt(e.target.value) : 0
                setFormData({
                  ...formData,
                  width,
                  weight: calculateWeight(width, formData.length, formData.thickness, formData.quantity),
                })
              }}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Length (mm)</label>
            <Input
              type="number"
              placeholder="2000"
              value={formData.length || ""}
              onChange={(e) => {
                const length = e.target.value ? Number.parseInt(e.target.value) : 0
                setFormData({
                  ...formData,
                  length,
                  weight: calculateWeight(formData.width, length, formData.thickness, formData.quantity),
                })
              }}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Quantity(No of Sheets)</label>
            <Input
              type="number"
              placeholder="50"
              value={formData.quantity || ""}
              onChange={(e) => {
                const quantity = e.target.value ? Number.parseInt(e.target.value) : 0
                setFormData({
                  ...formData,
                  quantity,
                  weight: calculateWeight(formData.width, formData.length, formData.thickness, quantity),
                })
              }}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Grade</label>
            <Input
              placeholder="e.g., CRCA, CRCC, etc."
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Coil/Packet Wt. (Apx) (MT)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.coilPacketWeight || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  coilPacketWeight: e.target.value ? Number.parseFloat(e.target.value) : 0,
                })
              }
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Due Date</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Priority (1=highest)</label>
            <Input
              type="number"
              placeholder="1"
              value={formData.priority || ""}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value ? Number.parseInt(e.target.value) : 0 })
              }
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Order Weight(MT)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="Auto-calculated"
              value={formData.weight || ""}
              disabled
              className="h-11 text-base bg-blue-50 border-2 border-blue-300 cursor-not-allowed shadow-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formula: (Width × Length × Thickness × Quantity × 7.85) / 1,000,000,000
            </p>
          </div>
          <Button type="submit" className="sm:col-span-2">
            Add Order
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Orders (CSV)
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Upload CSV File</label>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            <p className="text-xs text-muted-foreground mt-2">
              CSV must have columns: OrderID, Product, Thickness, Width, Length, Quantity, Grade, CoilPacketWeight,
              Priority, DueDate
            </p>
          </div>
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{uploadError}</div>
          )}
        </div>
      </Card>

      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">
          Orders ({orders.length}) |
          <span className="text-green-600 ml-2">{orders.filter((o) => o.status === "completed").length} Complete</span>{" "}
          |
          <span className="text-yellow-600 ml-2">
            {orders.filter((o) => o.status === "assigned").length} In Process
          </span>{" "}
          |<span className="text-gray-600 ml-2">{orders.filter((o) => o.status === "pending").length} Pending</span>
        </h3>
        {orders.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No orders added yet. Add orders to define production requirements.
          </Card>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => (
              <Card key={order.id} className="p-4">
                {editingId === order.id ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Edit Order: {order.orderId}</h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={handleEditSave} className="bg-green-600 hover:bg-green-700">
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Order ID</label>
                        <Input
                          value={editFormData.orderId || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, orderId: e.target.value })}
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Product</label>
                        <select
                          value={editFormData.product || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              product: e.target.value as "HR" | "CR" | "GP" | "CC" | "SS",
                            })
                          }
                          className="h-9 text-sm w-full px-2 border-2 border-blue-400 rounded-md bg-white"
                        >
                          <option value="">Select</option>
                          <option value="HR">HR</option>
                          <option value="CR">CR</option>
                          <option value="GP">GP</option>
                          <option value="CC">CC</option>
                          <option value="SS">SS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Thickness (mm)</label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editFormData.thickness || ""}
                          onChange={(e) => {
                            const thickness = e.target.value ? Number.parseFloat(e.target.value) : 0
                            setEditFormData({
                              ...editFormData,
                              thickness,
                              weight: calculateWeight(
                                editFormData.width || 0,
                                editFormData.length || 0,
                                thickness,
                                editFormData.quantity || 0,
                              ),
                            })
                          }}
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Width (mm)</label>
                        <Input
                          type="number"
                          value={editFormData.width || ""}
                          onChange={(e) => {
                            const width = e.target.value ? Number.parseInt(e.target.value) : 0
                            setEditFormData({
                              ...editFormData,
                              width,
                              weight: calculateWeight(
                                width,
                                editFormData.length || 0,
                                editFormData.thickness || 0,
                                editFormData.quantity || 0,
                              ),
                            })
                          }}
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Length (mm)</label>
                        <Input
                          type="number"
                          value={editFormData.length || ""}
                          onChange={(e) => {
                            const length = e.target.value ? Number.parseInt(e.target.value) : 0
                            setEditFormData({
                              ...editFormData,
                              length,
                              weight: calculateWeight(
                                editFormData.width || 0,
                                length,
                                editFormData.thickness || 0,
                                editFormData.quantity || 0,
                              ),
                            })
                          }}
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Quantity</label>
                        <Input
                          type="number"
                          value={editFormData.quantity || ""}
                          onChange={(e) => {
                            const quantity = e.target.value ? Number.parseInt(e.target.value) : 0
                            setEditFormData({
                              ...editFormData,
                              quantity,
                              weight: calculateWeight(
                                editFormData.width || 0,
                                editFormData.length || 0,
                                editFormData.thickness || 0,
                                quantity,
                              ),
                            })
                          }}
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Grade</label>
                        <Input
                          value={editFormData.grade || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, grade: e.target.value })}
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Coil/Packet Wt. (MT)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editFormData.coilPacketWeight || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              coilPacketWeight: e.target.value ? Number.parseFloat(e.target.value) : 0,
                            })
                          }
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Due Date</label>
                        <Input
                          type="date"
                          value={editFormData.dueDate || ""}
                          onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Priority</label>
                        <Input
                          type="number"
                          value={editFormData.priority || ""}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              priority: e.target.value ? Number.parseInt(e.target.value) : 0,
                            })
                          }
                          className="h-9 text-sm border-2 border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Weight (MT)</label>
                        <Input
                          type="number"
                          value={editFormData.weight || ""}
                          disabled
                          className="h-9 text-sm bg-blue-50 border-2 border-blue-300"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{order.orderId}</h4>
                        <Badge className="bg-blue-600 text-white">{order.product}</Badge>
                      </div>
                      <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                        <span>{order.thickness}mm T</span>
                        <span>{order.width}mm W</span>
                        <span>{order.length}mm L</span>
                        <span>{order.quantity} sheets</span>
                        <span>Grade: {order.grade}</span>
                        <span>Coil Wt: {order.coilPacketWeight} MT</span>
                        <span>Due: {order.dueDate}</span>
                        <span>P{order.priority}</span>
                        <span>{order.weight} MT</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColor[order.status]}>{statusLabel[order.status]}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(order)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteOrder(order.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
