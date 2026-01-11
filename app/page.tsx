"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CoilManager from "@/components/ctl/coil-manager"
import OrderManager from "@/components/ctl/order-manager"
import LineManager from "@/components/ctl/line-manager"
import OptimizationEngine from "@/components/ctl/optimization-engine"
import Dashboard from "@/components/ctl/dashboard"
import RMForecasting from "@/components/ctl/rm-forecasting"
import { CTLProvider } from "@/components/ctl/ctl-context"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <CTLProvider>
      <main className="min-h-screen bg-background">
        <header className="border-b border-border bg-gradient-to-r from-primary to-accent">
          <div className="mx-auto max-w-7xl px-4 py-8">
            <h1 className="text-3xl font-bold text-primary-foreground">CTL-SLITTER (AI Optimizer)</h1>
            <p className="mt-2 text-sm text-primary-foreground/90">by Uttam Innovative Solution Pvt.Ltd.</p>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8">
          <Tabs defaultValue="setup" className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-muted">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="coils">Coils</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="lines">Lines</TabsTrigger>
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="mb-4 text-xl font-semibold text-primary">Welcome to CTL Optimization</h2>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    This system optimizes the assignment of hot-rolled coils (RM stock) to CTL lines while fulfilling
                    sales orders with minimum scrap.
                  </p>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground">Getting Started:</h3>
                    <ol className="list-inside list-decimal space-y-1">
                      <li>Define your CTL lines and their specifications</li>
                      <li>Add available coils (raw material inventory)</li>
                      <li>Input sales orders (sheet requirements)</li>
                      <li>Run the optimization engine</li>
                      <li>Review assignments and scrap analysis</li>
                      <li>Check Forecasting tab for recommended RM purchases</li>
                    </ol>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="coils">
              <CoilManager />
            </TabsContent>

            <TabsContent value="orders">
              <OrderManager />
            </TabsContent>

            <TabsContent value="lines">
              <LineManager />
            </TabsContent>

            <TabsContent value="optimize">
              <OptimizationEngine />
            </TabsContent>

            <TabsContent value="results">
              <Dashboard />
            </TabsContent>

            <TabsContent value="forecasting">
              <RMForecasting />
            </TabsContent>
          </Tabs>
          <Footer />
        </div>
      </main>
    </CTLProvider>
  )
}
