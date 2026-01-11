"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useCTL, type CTLLine } from "./ctl-context"
import { Trash2 } from "lucide-react"

export default function LineManager() {
  const { lines, addLine } = useCTL()
  const [formData, setFormData] = useState<Omit<CTLLine, "id">>({
    name: "",
    maxWidth: 1600,
    minWidth: 600,
    maxThickness: 3,
    maxWeight: 25,
    speedMpm: 100,
    cost: 50,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim()) {
      addLine(formData as CTLLine)
      setFormData({
        name: "",
        maxWidth: 1600,
        minWidth: 600,
        maxThickness: 3,
        maxWeight: 25,
        speedMpm: 100,
        cost: 50,
      })
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
              value={formData.maxWidth}
              onChange={(e) => setFormData({ ...formData, maxWidth: Number.parseInt(e.target.value) })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Width (mm)</label>
            <Input
              type="number"
              placeholder="600"
              value={formData.minWidth}
              onChange={(e) => setFormData({ ...formData, minWidth: Number.parseInt(e.target.value) })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Thickness (mm)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="3"
              value={formData.maxThickness}
              onChange={(e) => setFormData({ ...formData, maxThickness: Number.parseFloat(e.target.value) })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Weight (tonnes)</label>
            <Input
              type="number"
              step="0.1"
              placeholder="25"
              value={formData.maxWeight}
              onChange={(e) => setFormData({ ...formData, maxWeight: Number.parseFloat(e.target.value) })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Speed (m/min)</label>
            <Input
              type="number"
              placeholder="100"
              value={formData.speedMpm}
              onChange={(e) => setFormData({ ...formData, speedMpm: Number.parseInt(e.target.value) })}
              className="h-11 text-base border-2 border-blue-400 shadow-md focus:shadow-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Cost (per tonne)</label>
            <Input
              type="number"
              placeholder="50"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number.parseInt(e.target.value) })}
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
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
