import { Close } from "/public/assets/icons"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

export default function Tips() {
    const tipsRef = useRef(null)

    const { contextSafe } = useGSAP({ scope: document.body })

    function removeSelf() {
        tipsRef.current?.remove()
    }

    function handleRemove() {
        gsap.to("#tips", { y: 200, onComplete: removeSelf })
    }

    return (
        <div id="tips" ref={tipsRef}
             className="absolute bottom-4 left-4 w-56 h-16 bg-[#b7b6b3] rounded-lg shadow-blue-200 transition-transform"
        >
            <div className="relative px-6 py-2.5 text-white">
                <p>
                    为了更精确的计算齿宽 <br />
                    建议精确删除多余牙龈
                </p>
                <img src={Close} className="absolute top-2 right-2 w-5 h-5 cursor-pointer" alt="close"
                     onClick={contextSafe(handleRemove)} />
            </div>
        </div>
    )
}
