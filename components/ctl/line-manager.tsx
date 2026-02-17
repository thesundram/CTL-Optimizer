"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useCTL, type CTLLine } from "./ctl-context"
import { Trash2, Pencil, X, Check } from "lucide-react"

export default function LineManager() {
  const { lines, addLine, updateLine, deleteLine } = useCTL()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<CTLLine | null>(null)

  const [formData, setFormData] = useState<Omit<CTLLine, "id">>({
    name: "",
    maxWidth: 0,
    minWidth: 0,
    maxThickness: 0,
    maxWeight: 0,
    speedMpm: 0,
    cost: 0,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      addLine(formData as CTLLine)
      setFormData({
        name: "",
        maxWidth: 0,
        minWidth: 0,
        maxThickness: 0,
        maxWeight: 0,
        speedMpm: 0,
        cost: 0,
      })
    }
  }

  const handleStartEdit = (line: CTLLine) => {
    setEditingId(line.id)
    setEditFormData({ ...line })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditFormData(null)
  }

  const handleSaveEdit = () => {
    if (editFormData && editingId) {
      updateLine(editingId, editFormData)
      setEditingId(null)
      setEditFormData(null)
    }
  }

  const handleDelete = (lineId: string) => {
    if (confirm("Are you sure you want to delete this line?")) {
      deleteLine(lineId)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Add CTL Line</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Line Name (e.g., CTL-01)</label>
            <Input
              placeholder="e.g., CTL-01"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Width (mm)</label>
            <Input
              type="number"
              placeholder="1600"
              value={formData.maxWidth || ""}
              onChange={(e) => setFormData({ ...formData, maxWidth: Number.parseInt(e.target.value) || 0 })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Width (mm)</label>
            <Input
              type="number"
              placeholder="600"
              value={formData.minWidth || ""}
              onChange={(e) => setFormData({ ...formData, minWidth: Number.parseInt(e.target.value) || 0 })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Thickness (mm)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="3"
              value={formData.maxThickness || ""}
              onChange={(e) => setFormData({ ...formData, maxThickness: Number.parseFloat(e.target.value) || 0 })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Weight (tonnes)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="25"
              value={formData.maxWeight || ""}
              onChange={(e) => setFormData({ ...formData, maxWeight: Number.parseFloat(e.target.value) || 0 })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Speed (m/min)</label>
            <Input
              type="number"
              placeholder="100"
              value={formData.speedMpm || ""}
              onChange={(e) => setFormData({ ...formData, speedMpm: Number.parseInt(e.target.value) || 0 })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cost (per tonne)</label>
            <Input
              type="number"
              placeholder="50"
              value={formData.cost || ""}
              onChange={(e) => setFormData({ ...formData, cost: Number.parseInt(e.target.value) || 0 })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" className="sm:col-span-2">
            Add Line
          </Button>
        </form>
      </Card>

      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">CTL Lines ({lines.length})</h3>
        {lines.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No lines defined yet. Add a line to get started.
          </Card>
        ) : (
          lines.map((line) => (
            <Card key={line.id} className="p-4">
              {editingId === line.id && editFormData ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Line Name</label>
                      <Input
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="h-9 text-sm border-2 border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Max Width (mm)</label>
                      <Input
                        type="number"
                        value={editFormData.maxWidth || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, maxWidth: Number.parseInt(e.target.value) || 0 })
                        }
                        className="h-9 text-sm border-2 border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Min Width (mm)</label>
                      <Input
                        type="number"
                        value={editFormData.minWidth || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, minWidth: Number.parseInt(e.target.value) || 0 })
                        }
                        className="h-9 text-sm border-2 border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Max Thickness (mm)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.maxThickness || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, maxThickness: Number.parseFloat(e.target.value) || 0 })
                        }
                        className="h-9 text-sm border-2 border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Max Weight (tonnes)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.maxWeight || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, maxWeight: Number.parseFloat(e.target.value) || 0 })
                        }
                        className="h-9 text-sm border-2 border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Speed (m/min)</label>
                      <Input
                        type="number"
                        value={editFormData.speedMpm || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, speedMpm: Number.parseInt(e.target.value) || 0 })
                        }
                        className="h-9 text-sm border-2 border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Cost (per tonne)</label>
                      <Input
                        type="number"
                        value={editFormData.cost || ""}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, cost: Number.parseInt(e.target.value) || 0 })
                        }
                        className="h-9 text-sm border-2 border-blue-400"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSaveEdit}>
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{line.name}</h4>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        Width: {line.minWidth} - {line.maxWidth} mm
                      </div>
                      <div>Max Thickness: {line.maxThickness} mm</div>
                      <div>Max Weight: {line.maxWeight} tonnes</div>
                      <div>Speed: {line.speedMpm} m/min</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStartEdit(line)}
                      className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(line.id)}
                      className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
