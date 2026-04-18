import { forwardRef } from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@/lib/utils"

interface ProgressProps extends ProgressPrimitive.Root.Props {
    className?: string
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(({ className, value, ...props }, ref) => (
    <ProgressPrimitive.Root
        ref={ref}
        value={value ?? 0}
        className={cn("relative w-full", className)}
        {...props}
    >
        <ProgressPrimitive.Track className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <ProgressPrimitive.Indicator
                className="h-full bg-primary transition-all data-[complete]:bg-green-500"
                style={{ width: `${value ?? 0}%` }}
            />
        </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
))
Progress.displayName = "Progress"

export { Progress }
