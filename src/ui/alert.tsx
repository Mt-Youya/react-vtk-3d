import { forwardRef, type HTMLAttributes } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import useTimeout from "@/hooks/useTimeout"

const alertVariants = cva(
    "fixed z-10 left-2/4 -translate-x-1/2 w-fit rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
    {
        variants: {
            variant: {
                default: "bg-background text-foreground",
                destructive:
                    "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
                success: "bg-green-50 border-green-200 text-green-800",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
)

interface AlertProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
    delay?: number
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(({ className, variant, delay = 3000, ...props }, ref) => {
    function hidden() {
        useTimeout(() => gsap.to("div[role='alert']", { visibility: "hidden" }), delay)
    }

    useGSAP(
        () => gsap.to("div[role='alert']", { y: 100, onComplete: hidden }),
        { scope: ref as React.RefObject<HTMLElement> },
    )

    return <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
})
Alert.displayName = "Alert"

const AlertTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
    ),
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
    ),
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
