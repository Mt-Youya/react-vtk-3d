import { Move, Rectangle, Point, Reset, Back } from "/public/assets/icons"
import KEY_UP from "@/constants/press-key.js"
import CLICK_KEY from "@/constants/click-key.js"
import Loader from "@/components/Loader"
import useTimeout from "@/hooks/useTimeout.js"
import { useState } from "react"
import { Alert, AlertDescription } from "@/ui/alert.jsx"
import { useCoreStore } from "@/stores/index.js"

const keys = Object.values(KEY_UP).concat(Object.values(CLICK_KEY))

function Header(){
    const { coreMethods } = useCoreStore() ?? {}

    const { handleSelection, handlePolygonSelection, handleEscape, handleReset, handleDelete, handleSpace } = coreMethods ?? {}

    const [loading, setLoading] = useState(false)
    const [decrease, setDecrease] = useState(false)

    const [tools, setTools] = useState([
        { name: "移动", active: true, icon: Move, key: "move" },
        { name: "框选", active: false, icon: Rectangle, key: "rectangle" },
        { name: "点选", active: false, icon: Point, key: "point" },
        { name: "重置", active: false, icon: Reset, key: "reset" },
        { name: "返回", active: false, icon: Back, key: "back" },
    ])

    const [open, setOpen] = useState(false)

    const inputRef = useRef(null)
    const headerRef = useRef(null)

    function handleKeyUp(e){
        const key = e.key
        if (!keys.includes(key)) return
        switch (key) {
            case KEY_UP.S:
            case CLICK_KEY.Rectangle:
                handleSelection()
                setToolsActive(1)
                return
            case KEY_UP.P:
            case CLICK_KEY.Point:
                handlePolygonSelection()
                setToolsActive(2)
                return
            case KEY_UP.Escape:
                handleEscape()
                setToolsActive(0)
                return
            case KEY_UP.R:
            case CLICK_KEY.Reset:
                handleReset()
                setToolsActive(3)
                return
            case KEY_UP.Delete:
                setOpen(() => true)
                handleDelete()
                setOpen(false)
                return
            case KEY_UP.Space:
                setOpen(() => true)
                handleSpace()
                setOpen(false)
                return
            case KEY_UP.Z:
                if (!e.ctrl) return
                return
            default:
                return
        }
    }

    function setToolsActive(idx){
        for (const tool of tools) {
            tool.active = false
        }
        const stateTools = [...tools]
        stateTools[idx].active = true
        setTools(stateTools)
    }

    function handleToolsClick(idx){
        setToolsActive(idx)

        switch (idx) {
            case 0:
                return handleKeyUp({ key: KEY_UP.Escape })
            case 1:
                return handleKeyUp({ key: KEY_UP.S })
            case 2:
                return handleKeyUp({ key: KEY_UP.P })
            case 3:
                return handleKeyUp({ key: KEY_UP.P })
            default:
                return
        }
    }

    function handleActionsClick(e){
        if (e.target === e.currentTarget) return
        const target = e.target.tagName === "img" ? e.target.parentElement : e.target
        const action = target.dataset.action

        console.log(action)
    }

    function handleSave(){
    }

    useEffect(() => {
        const input = document.createElement("input")
        input.type = "file"
        input.multiple = true
        inputRef.current = input
        useTimeout(() => {
            setLoading(false)
        }, 1000)
    }, [])

    useEffect(() => {
        if (!coreMethods) {
            return
        }
        setLoading(false)
        // headerRef.current.addEventListener("keyup", handleKeyUp)
        document.body.addEventListener("keyup", handleKeyUp)
    }, [coreMethods])

    return (
        <>
            <header ref={headerRef} className="w-full h-20 bg-[#333] text-white flex justify-between select-none">
                <nav id="actions" className="w-1/4 h-full min-w-[320px]">
                    <ul className="flex justify-center align-center h-full *:w-1/4 *:h-full *:text-sm *:flex *:justify-center *:flex-col *:gap-2 *:items-center *:cursor-pointer  *:transition-colors *:duration-200">
                        {tools.map(({ name, active, icon, key }, index) => (
                            <li className="min-w-[70px] aria-selected:bg-[#030404]" id={key} key={key}
                                aria-selected={active}
                                role="listitem" onClick={() => handleToolsClick(index)}
                            >
                                <img src={icon} alt={key} /> {name}
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav id="tools" className="w-1/4 h-full flex justify-end items-center gap-4 ">
                    <ul className="flex justify-center align-center h-full gap-2.5 *:w-1/4 *:min-w-[76px] *:text-sm *:flex *:justify-center *:flex-col *:gap-2 *:items-center *:cursor-pointer *:aria-selected:bg-[#030404] *:transition-colors *:duration-200"
                        onClick={handleActionsClick}>
                        <li className="h-full" id="overturn" aria-selected="false" role="listitem" data-action="overturn">
                            <img src="/assets/icons/Turnover.svg" alt="turnover" role="img" /> 上下颌对调
                        </li>
                        <li className="h-full aria-disabled:opacity-70 aria-disabled:cursor-not-allowed relative z-10"
                            id="calculate" aria-selected="false" role="listitem" data-action="calculate" aria-disabled="true"
                        >
                            <img src="/assets/icons/ToothWidth.svg" alt="tooth-width" role="img" /> 牙弓宽度
                            <ol role="radiogroup"
                                className="hidden absolute top-full -translate-x-1/2 left-1/2 flex bg-[#333] z-10 rounded-xl overflow-hidden transition duration-300 ease-in-out"
                            >
                                <li className="w-24 p-2 aria-selected:bg-black transition-colors duration-300 ease-in-out"
                                    aria-selected="true" data-action="sharp" data-index="0">
                                    上颌尖牙段
                                </li>
                                <span className="w-0.5 -ml-px h-6 block mt-1 bg-[#ffffff90] shadow-md"></span>
                                <li className="w-28 p-2 aria-selected:bg-black transition-colors duration-300 ease-in-out"
                                    aria-selected="false" data-action="front-molar" data-index="1">
                                    上颌前磨牙段
                                </li>
                                <span className="w-0.5 -ml-px h-6 block mt-1 bg-[#ffffff90] shadow-md"></span>
                                <li className="w-24 p-2 aria-selected:bg-black transition-colors duration-300 ease-in-out"
                                    aria-selected="false" data-action="molar" data-index="2">
                                    上颌尖牙段
                                </li>
                            </ol>
                        </li>
                        <li className="h-full aria-disabled:opacity-70 aria-disabled:cursor-not-allowed relative" id="measure"
                            aria-selected="false" role="listitem" data-action="measure" aria-disabled="true">
                            <img src="/assets/icons/Measure.svg" alt="measure" role="img" /> 模型测量
                        </li>
                        <li className="h-full" id="decrease" aria-selected="false" role="listitem" data-action="decrease">
                            <img src="/assets/icons/Decrease.svg" alt="decrease" role="img" /> 删减完成
                        </li>
                        <li className="h-full" id="split" aria-selected="false" role="listitem" data-action="split">
                            <img src="/assets/icons/Split.svg" alt="split" role="img" /> 模型分割
                        </li>
                        <li className="w-32 h-fit py-2 px-3 text-center rounded-lg bg-[#2381FE] min-w-[123px] my-auto aria-disabled:bg-[#7B7B7B] aria-disabled:cursor-not-allowed"
                            id="save" aria-disabled="true" data-action="save" onClick={handleSave}
                        >
                            保存
                        </li>
                    </ul>
                    <div id="help" className="relative">
                        <img src="/assets/icons/Question.svg" className="w-4 h-4 cursor-pointer mr-10 aspect-square" alt="help" />
                        <div
                            className="absolute top-12 right-0 w-96 h-96 z-40 bg-[#4D4D4D] text-white scale-0 aria-expanded:scale-100 origin-[90%_0] transition-transform"
                            aria-expanded="false"
                        >

                        </div>
                    </div>
                </nav>
            </header>
            <Loader open={loading} />
            {decrease && (
                <Alert>
                    <AlertDescription> 删减完成! </AlertDescription>
                </Alert>
            )}
        </>
    )
}

export default Header
