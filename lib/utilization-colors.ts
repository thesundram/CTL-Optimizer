// Utility function to determine color class based on utilization percentage
export function getUtilizationColor(utilization: number): {
  bgClass: string
  textClass: string
  badgeClass: string
} {
  if (utilization >= 95) {
    return {
      bgClass: "bg-green-100",
      textClass: "text-green-700",
      badgeClass: "bg-green-600 text-white",
    }
  } else if (utilization >= 80) {
    return {
      bgClass: "bg-yellow-100",
      textClass: "text-yellow-700",
      badgeClass: "bg-yellow-500 text-white",
    }
  } else {
    return {
      bgClass: "bg-red-100",
      textClass: "text-red-700",
      badgeClass: "bg-red-600 text-white",
    }
  }
}
