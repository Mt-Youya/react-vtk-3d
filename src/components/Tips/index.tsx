import { useRef } from "react"
import { XIcon } from "lucide-react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

export default function Tips() {
    const tipsRef = useRef<HTMLDivElement>(null)

    const { contextSafe } = useGSAP({ scope: document.body })

    function handleRemove() {
        gsap.to("#tips", {
            y: 200,
            opacity: 0,
            duration: 0.3,
            onComplete: () => tipsRef.current?.remove(),
        })
    }

    return (
        <div
            id="tips"
            ref={tipsRef}
            className="absolute bottom-4 left-4 w-56 bg-[#b7b6b3] rounded-lg shadow-lg"
        >
            <div className="relative px-4 py-3 text-white">
                <p className="text-sm leading-relaxed">
                    为了更精确的计算齿宽 <br />
                    建议精确删除多余牙龈
                </p>
                <button
                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                    onClick={contextSafe(handleRemove)}
                    aria-label="关闭提示"
                >
                    <XIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    )
}
