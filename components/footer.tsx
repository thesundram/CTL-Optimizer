export function Footer() {
  return (
    <div className="mt-8 pt-6 border-t border-border/50">
      <p className="text-xs text-center text-muted-foreground">
        © {new Date().getFullYear()} Designed by <span className="font-medium text-foreground">Uttam Innovative Solution Pvt. Ltd.</span>
      </p>
    </div>
  )
}