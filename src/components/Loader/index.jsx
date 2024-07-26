import gsap from "gsap"

function Loader({ open, duration = .3, onEnd }){
    const loaderRef = useRef()

    useEffect(() => {
        gsap.to(loaderRef.current, {
            opacity: open ? 1 : 0,
            onComplete: () => !open && gsap.to("#loader", {
                opacity: 0,
                onComplete: () => {
                    loaderRef.current?.remove()
                    onEnd && onEnd()
                },
            }),
            duration,
        })
    }, [open])

    return (
        <div id="loader" ref={loaderRef}
             className="loader fixed inset-0 bg-[#131215e6] backdrop-saturate-150 backdrop-blur-lg drop-shadow-md flex justify-center items-center z-50 transition-opacity duration-500">
            <div
                className="w72 h-16 bg-black/75 p-10 backdrop-saturate-150 backdrop-blur-lg drop-shadow-md rounded-md shadow-indigo-500/50 text-white flex justify-center items-center gap-2.5">
                {
                    open ? (
                            <>
                                <span className="rounded-full w-8 h-8 border-4 border-solid border-[#FFFFFF4C] border-t-[#fff] animate-spin" />
                                <span className="animate-pulse"> Models loading ...  </span>
                            </>
                        )
                        : (
                            <>
                                <img src="/assets/icons/Success.svg?url" alt="success" className="w-10 h-10" />
                                <span> Models loaded... </span>
                            </>
                        )
                }
            </div>
        </div>
    )
}

export default memo(Loader)
