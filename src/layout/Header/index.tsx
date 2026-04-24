import { useState, useRef, useEffect } from "react"
import { logger } from "@/utils/logger"
import {
    MoveIcon,
    RectangleHorizontalIcon,
    MousePointer2Icon,
    RotateCcwIcon,
    ArrowLeftIcon,
    FlipVertical2Icon,
    RulerIcon,
    ScissorsIcon,
    SaveIcon,
    HelpCircleIcon,
    CheckCircleIcon,
} from "lucide-react"
import KEY_UP from "@/constants/press-key"
import CLICK_KEY from "@/constants/click-key"
import { CALCULATE_ACTION } from "@/constants/calculate-key"
import Loader from "@/components/Loader"
import { Alert, AlertDescription } from "@/ui/alert"
import { Button } from "@/ui/button"
import { useCoreStore } from "@/stores"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui"

const ALL_KEYS = (Object.values(KEY_UP) as string[]).concat(Object.values(CLICK_KEY) as string[])

interface Tool {
    name: string
    icon: React.ReactNode
    key: string
}

const TOOLS: Tool[] = [
    { name: "移动", icon: <MoveIcon className="w-5 h-5" />, key: "move" },
    { name: "框选", icon: <RectangleHorizontalIcon className="w-5 h-5" />, key: "rectangle" },
    { name: "点选", icon: <MousePointer2Icon className="w-5 h-5" />, key: "point" },
    { name: "重置", icon: <RotateCcwIcon className="w-5 h-5" />, key: "reset" },
    { name: "返回", icon: <ArrowLeftIcon className="w-5 h-5" />, key: "back" },
]

const ARCH_WIDTH_OPTIONS = [
    { label: "上颌尖牙段", action: CALCULATE_ACTION.Sharp },
    { label: "上颌前磨牙段", action: CALCULATE_ACTION.FrontMolar },
    { label: "上颌磨牙段", action: CALCULATE_ACTION.Molar },
]

export default function Header() {
    const { coreMethods } = useCoreStore() ?? {}
    const { handleSelection, handlePolygonSelection, handleEscape, handleReset, handleDelete, handleSpace } =
        coreMethods ?? {}

    const [loading, setLoading] = useState(false)
    const [decreaseDone, setDecreaseDone] = useState(false)
    const [activeToolIndex, setActiveToolIndex] = useState(0)

    // 用 ref 存最新的 coreMethods，避免 stale closure，同时不触发重新注册监听器
    const coreRef = useRef(coreMethods)
    useEffect(() => {
        coreRef.current = coreMethods
    })

    function handleKeyUp(e: KeyboardEvent) {
        const key = e.key
        if (!ALL_KEYS.includes(key)) return
        const core = coreRef.current
        switch (key) {
            case KEY_UP.S:
            case CLICK_KEY.Rectangle:
                core?.handleSelection?.()
                setActiveToolIndex(1)
                break
            case KEY_UP.P:
            case CLICK_KEY.Point:
                core?.handlePolygonSelection?.()
                setActiveToolIndex(2)
                break
            case KEY_UP.Escape:
                core?.handleEscape?.()
                setActiveToolIndex(0)
                break
            case KEY_UP.R:
            case CLICK_KEY.Reset:
                core?.handleReset?.()
                setActiveToolIndex(3)
                break
            case KEY_UP.Delete:
                core?.handleDelete?.()
                break
            case KEY_UP.Space:
                core?.handleSpace?.()
                break
            default:
                break
        }
    }

    function handleToolsClick(idx: number) {
        setActiveToolIndex(idx)
        switch (idx) {
            case 0: handleEscape?.(); break
            case 1: handleSelection?.(); break
            case 2: handlePolygonSelection?.(); break
            case 3: handleReset?.(); break
            default: break
        }
    }

    function handleActionsClick(e: React.MouseEvent) {
        if (e.target === e.currentTarget) return
        const target =
            (e.target as HTMLElement).tagName === "IMG"
                ? (e.target as HTMLElement).parentElement!
                : (e.target as HTMLElement)
        const action = (target as HTMLElement).dataset.action
        if (!action) return

        switch (action) {
            case "overturn":
                coreMethods?.handleTurnover()
                break
            case "decrease":
                coreMethods?.handleDelete()
                setDecreaseDone(true)
                break
            default:
                break
        }
    }

    function handleArchWidthSelect(action: string) {
        logger.debug("arch width action:", action)
    }

    function handleSave() {
        logger.debug("save")
    }

    useEffect(() => {
        setTimeout(() => setLoading(false), 1000)
    }, [])

    useEffect(() => {
        if (!coreMethods) return
        setLoading(false)
        document.body.addEventListener("keyup", handleKeyUp)
        return () => {
            document.body.removeEventListener("keyup", handleKeyUp)
        }
    }, [coreMethods])

    return (
        <>
            <header className="w-full h-20 bg-[#333] text-white flex justify-between select-none">
                <nav id="actions" className="w-1/4 h-full min-w-[320px]">
                    <ul className="flex justify-center h-full *:w-1/4 *:h-full *:text-sm *:flex *:justify-center *:flex-col *:gap-1.5 *:items-center *:cursor-pointer *:transition-colors *:duration-200">
                        {TOOLS.map(({ name, icon, key }, index) => (
                            <li
                                className="min-w-[70px] aria-selected:bg-[#030404]"
                                id={key}
                                key={key}
                                aria-selected={activeToolIndex === index}
                                role="listitem"
                                onClick={() => handleToolsClick(index)}
                            >
                                {icon}
                                <span className="text-xs">{name}</span>
                            </li>
                        ))}
                    </ul>
                </nav>

                <nav id="tools" className="w-3/4 h-full flex justify-end items-center">
                    <ul
                        className="flex justify-end h-full gap-1 *:min-w-[76px] *:text-sm *:flex *:justify-center *:flex-col *:gap-1.5 *:items-center *:cursor-pointer *:aria-selected:bg-[#030404] *:transition-colors *:duration-200"
                        onClick={handleActionsClick}
                    >
                        <li className="h-full px-2" id="overturn" aria-selected="false" role="listitem" data-action="overturn">
                            <FlipVertical2Icon className="w-5 h-5" />
                            <span className="text-xs">上下颌对调</span>
                        </li>

                        <li
                            className="h-full px-2 aria-disabled:opacity-70 aria-disabled:cursor-not-allowed"
                            id="calculate"
                            aria-selected="false"
                            role="listitem"
                            aria-disabled="true"
                        >
                            <Popover>
                                <PopoverTrigger className="flex flex-col items-center gap-1.5 h-full justify-center">
                                    <RulerIcon className="w-5 h-5" />
                                    <span className="text-xs">牙弓宽度</span>
                                </PopoverTrigger>
                                <PopoverContent className="bg-[#333] rounded-xl overflow-hidden shadow-xl z-50">
                                    <ul className="flex">
                                        {ARCH_WIDTH_OPTIONS.map(({ label, action }, idx) => (
                                            <li key={action} className="flex items-center">
                                                {idx > 0 && (
                                                    <span className="w-px h-6 bg-[#ffffff40]" />
                                                )}
                                                <button
                                                    className="px-3 py-2 text-white text-sm hover:bg-black/30 transition-colors whitespace-nowrap"
                                                    onClick={() => handleArchWidthSelect(action)}
                                                >
                                                    {label}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </PopoverContent>
                            </Popover>
                        </li>

                        <li
                            className="h-full px-2 aria-disabled:opacity-70 aria-disabled:cursor-not-allowed"
                            id="measure"
                            aria-selected="false"
                            role="listitem"
                            data-action="measure"
                            aria-disabled="true"
                        >
                            <RulerIcon className="w-5 h-5" />
                            <span className="text-xs">模型测量</span>
                        </li>

                        <li
                            className="h-full px-2"
                            id="decrease"
                            aria-selected="false"
                            role="listitem"
                            data-action="decrease"
                        >
                            <ScissorsIcon className="w-5 h-5" />
                            <span className="text-xs">删减完成</span>
                        </li>

                        <li className="h-full px-2" id="split" aria-selected="false" role="listitem" data-action="split">
                            <ScissorsIcon className="w-5 h-5" />
                            <span className="text-xs">模型分割</span>
                        </li>

                        <li className="flex items-center px-3">
                            <Button
                                variant="blue"
                                size="sm"
                                id="save"
                                disabled={!coreMethods}
                                onClick={handleSave}
                                className="min-w-[80px]"
                            >
                                <SaveIcon className="w-4 h-4" />
                                保存
                            </Button>
                        </li>
                    </ul>

                    <div id="help" className="relative px-4">
                        <Popover>
                            <PopoverTrigger className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors">
                                <HelpCircleIcon className="w-5 h-5 cursor-pointer" />
                            </PopoverTrigger>
                            <PopoverContent side="bottom" align="end" className="w-72 bg-[#4D4D4D] text-white rounded-lg shadow-xl p-4">
                                <p className="text-sm font-medium mb-2">快捷键说明</p>
                                <ul className="space-y-1.5 text-xs text-white/80">
                                    <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">S</kbd> 框选模式</li>
                                    <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">P</kbd> 点选模式</li>
                                    <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">R</kbd> 重置视图</li>
                                    <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">Esc</kbd> 取消选择</li>
                                    <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">Delete</kbd> 删除选中</li>
                                    <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">Space</kbd> 完成多边形选择</li>
                                </ul>
                            </PopoverContent>
                        </Popover>
                    </div>
                </nav>
            </header>

            <Loader open={loading} />

            {decreaseDone && (
                <Alert variant="success">
                    <CheckCircleIcon className="w-4 h-4" />
                    <AlertDescription>删减完成！</AlertDescription>
                </Alert>
            )}
        </>
    )
}
