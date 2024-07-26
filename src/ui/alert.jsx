import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils.js"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import useTimeout from "@/hooks/useTimeout.js";
import { useEffect } from "react";

const alertVariants = cva(
    "fixed z-10 left-2/4 w-fit rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
    {
        variants: {
            variant: {
                default: "bg-background text-foreground",
                destructive:
                    "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
)

const Alert = forwardRef(({ className, variant, delay = 3000, ...props }, ref) => {
    function hidden() {
        useTimeout(() => gsap.to("div[role='alert']", { visibility: "hidden" }), delay)
    }

    useGSAP(() => gsap.to("div[role='alert']", { y: 100, onComplete: hidden }), { scope: ref })

    return (<div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />)
})
Alert.displayName = "Alert"

const AlertTitle = forwardRef(({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)}        {...props} />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = forwardRef(({ className, ...props }, ref) =>
    (<div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />),
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
