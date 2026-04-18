import { memo, useRef, useEffect } from "react"
import { CheckCircleIcon } from "lucide-react"
import gsap from "gsap"

interface LoaderProps {
    open: boolean
    duration?: number
    onEnd?: () => void
}

function Loader({ open, duration = 0.3, onEnd }: LoaderProps) {
    const loaderRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = loaderRef.current
        if (!el) return

        gsap.to(el, {
            opacity: open ? 1 : 0,
            duration,
            onComplete: () => {
                if (!open) {
                    gsap.to(el, {
                        opacity: 0,
                        onComplete: () => {
                            el.remove()
                            onEnd?.()
                        },
                    })
                }
            },
        })
    }, [open])

    return (
        <div
            id="loader"
            ref={loaderRef}
            className="fixed inset-0 bg-[#131215e6] backdrop-saturate-150 backdrop-blur-lg flex justify-center items-center z-50"
        >
            <div className="bg-black/75 px-8 py-6 backdrop-blur-lg rounded-lg shadow-xl text-white flex items-center gap-3 min-w-[200px] justify-center">
                {open ? (
                    <>
                        <span className="rounded-full w-7 h-7 border-[3px] border-solid border-[#FFFFFF4C] border-t-white animate-spin shrink-0" />
                        <span className="animate-pulse text-sm">Models loading ...</span>
                    </>
                ) : (
                    <>
                        <CheckCircleIcon className="w-7 h-7 text-green-400 shrink-0" />
                        <span className="text-sm">Models loaded</span>
                    </>
                )}
            </div>
        </div>
    )
}

export default memo(Loader)
