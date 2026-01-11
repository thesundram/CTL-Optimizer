"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useCTL, type Coil } from "./ctl-context"
import { Badge } from "@/components/ui/badge"
import { Trash2, Upload } from "lucide-react"

export default function CoilManager() {
  const { coils, addCoil, bulkImportCoils, deleteCoil } = useCTL()
  const [formData, setFormData] = useState<Omit<Coil, "id">>({
    coilId: "",
    product: "" as any,
    width: 0,
    length: 0,
    thickness: 0,
    weight: 0,
    grade: "",
    status: "available",
  })
  const [uploadError, setUploadError] = useState<string>("")

  const STEEL_DENSITY = 7850 // kg/m³
  const calculateLength = (weight: number, width: number, thickness: number) => {
    if (weight <= 0 || width <= 0 || thickness <= 0) return 0
    // Convert: weight from tonnes to kg, width and thickness from mm to m
    const weightKg = weight * 1000
    const widthM = width / 1000
    const thicknessM = thickness / 1000
    // Formula: Length = Weight / (Density × Width × Thickness)
    // Result in mm: multiply by 1,000,000 to convert from m to mm
    const lengthMm = (weightKg / (STEEL_DENSITY * widthM * thicknessM)) * 1000000
    return Math.round(lengthMm)
  }

  const calculatedLength = calculateLength(formData.weight, formData.width, formData.thickness)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.coilId.trim()) {
      addCoil({
        ...formData,
        length: calculatedLength,
      } as Coil)
      setFormData({
        coilId: "",
        product: "" as any,
        width: 0,
        length: 0,
        thickness: 0,
        weight: 0,
        grade: "",
        status: "available",
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
      const requiredHeaders = ["coilid", "product", "thickness", "width", "weight", "grade"]

      const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h))
      if (missingHeaders.length > 0) {
        setUploadError(
          `Missing required columns: ${missingHeaders.join(", ")}. Required: ${requiredHeaders.join(", ")}`,
        )
        return
      }

      const coilsToImport: Omit<Coil, "id">[] = []
      const validProducts = ["HR", "CR", "GP", "CC", "SS"]

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())

        if (values.length < requiredHeaders.length || !values[0]) continue

        const coilId = values[headers.indexOf("coilid")]
        const product = values[headers.indexOf("product")].toUpperCase()
        const thickness = Number.parseFloat(values[headers.indexOf("thickness")])
        const width = Number.parseInt(values[headers.indexOf("width")])
        const weight = Number.parseFloat(values[headers.indexOf("weight")])
        const grade = values[headers.indexOf("grade")]

        if (!coilId || !validProducts.includes(product) || !thickness || !width || !weight || !grade) {
          console.log("[v0] Skipping row", i, "- Invalid data:", { coilId, product, thickness, width, weight, grade })
          continue
        }

        const length = calculateLength(weight, width, thickness)

        coilsToImport.push({
          coilId,
          product: product as Coil["product"],
          thickness,
          width,
          weight,
          length,
          grade,
          status: "available",
        })
      }

      if (coilsToImport.length === 0) {
        setUploadError("No valid coils found in the CSV file. Check format and try again.")
        return
      }

      bulkImportCoils(coilsToImport)
      setUploadError("")
      if (e.target) {
        e.target.value = ""
      }
      console.log("[v0] Successfully imported", coilsToImport.length, "coils")
    } catch (error) {
      setUploadError("Error reading file: " + (error instanceof Error ? error.message : "Unknown error"))
      console.log("[v0] File upload error:", error)
    }
  }

  const statusColor = {
    available: "bg-green-100 text-green-800",
    allocated: "bg-yellow-100 text-yellow-800",
    used: "bg-blue-100 text-blue-800",
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Add Coil (RM Stock)</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Coil ID</label>
            <Input
              placeholder="e.g., C-001"
              value={formData.coilId}
              onChange={(e) => setFormData({ ...formData, coilId: e.target.value })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Product</label>
            <select
              value={formData.product}
              onChange={(e) => setFormData({ ...formData, product: e.target.value as Coil["product"] })}
              className="h-11 text-base w-full rounded-md border-2 border-blue-400 bg-background px-3 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Product</option>
              <option value="HR">HR (Hot Rolled)</option>
              <option value="CR">CR (Cold Rolled)</option>
              <option value="GP">GP (Galvanized Plain)</option>
              <option value="CC">CC (Coated/Chromated)</option>
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
              onChange={(e) =>
                setFormData({ ...formData, thickness: e.target.value ? Number.parseFloat(e.target.value) : 0 })
              }
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Width (mm)</label>
            <Input
              type="number"
              placeholder="1200"
              value={formData.width || ""}
              onChange={(e) =>
                setFormData({ ...formData, width: e.target.value ? Number.parseInt(e.target.value) : 0 })
              }
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Weight (tonnes)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="15"
              value={formData.weight || ""}
              onChange={(e) =>
                setFormData({ ...formData, weight: e.target.value ? Number.parseFloat(e.target.value) : 0 })
              }
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Length (mm) - Auto Calculated</label>
            <Input
              type="number"
              placeholder="Auto-calculated"
              value={calculatedLength || ""}
              disabled
              className="h-11 text-base bg-blue-50 border-2 border-blue-300 cursor-not-allowed shadow-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">Formula: Weight ÷ (Density × Width × Thickness)</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Grade (e.g., CRCA, HR)</label>
            <Input
              placeholder="e.g., CRCA"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" className="sm:col-span-2">
            Add Coil
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Import Coils (CSV)
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Upload CSV File</label>
            <Input type="file" accept=".csv" onChange={handleFileUpload} />
            <p className="text-xs text-muted-foreground mt-2">
              CSV must have columns: CoilID, Product, Thickness, Width, Weight, Grade
            </p>
          </div>
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{uploadError}</div>
          )}
        </div>
      </Card>

      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">
          Available Coils ({coils.filter((c) => c.status === "available").length})
        </h3>
        {coils.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No coils added yet. Add coils to begin optimization.
          </Card>
        ) : (
          <div className="grid gap-3">
            {coils.map((coil) => (
              <Card key={coil.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{coil.coilId}</h4>
                    <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                      <span>{coil.product}</span>
                      <span>{coil.thickness}mm T</span>
                      <span>{coil.width}mm W</span>
                      <span>{coil.weight}t</span>
                      <span>{coil.length}mm L</span>
                      <span>{coil.grade}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor[coil.status]}>{coil.status}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCoil(coil.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
