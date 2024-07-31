import { Eye, EyeClose } from "/public/assets/icons"
import { useCoreStore, useModelsInfoStore } from "@/stores"

export default function Card() {
    const { coreMethods } = useCoreStore() ?? {}
    const { modelsInfo } = useModelsInfoStore()
    const [views, setViews] = useState([
        { text: "正面视图", selected: true },
        { text: "颌面视图", selected: false },
        { text: "舌侧视图", selected: false },
    ])

    const [models, setModels] = useState([
        { visible: true, selected: true },
        { visible: true, selected: false },
    ])


    function handleEyeClick(event, idx) {
        event.stopPropagation()
        coreMethods.handleTeethVisible(["up", "down"][idx])
        const target = [...models]
        target[idx].visible = !target[idx].visible
        setModels(target)
    }

    function handleViewerTabsClick(index) {
        setViews(prevState => {
            const list = prevState.map(prev => ({ ...prev, selected: false }))
            list[index].selected = true
            return list
        })

        switch (index) {
            case 0:
                return coreMethods.switchView(0)
            case 1:
                return coreMethods.switchView(1, index)
            default:
                return coreMethods.switchView(2)
        }
    }

    function handleModelTab(index) {
        setModels(prevState => {
            if (prevState[index].selected) return prevState
            prevState[index ^ 1].selected = prevState[index].selected
            prevState[index].selected = !prevState[index].selected
            return [...prevState]
        })
    }

    return (
        <div id="card" className="w-1/6 shadow-xl absolute bg-[#FDFDFD] top-10 left-10 rounded-md min-w-[320px]">
            <div className="p-4">
                <h2 className="text-left mb-4 text-lg font-bold text-[#6C6C6C]"> 视图角度 </h2>
                <ul id="viewer-tabs"
                    className="flex flex-1 gap-2.5 h-full [&>li]:rounded-md [&>li]:p-2 [&>li]:text-[#808C99] [&>li]:text-base [&>li]:cursor-pointer [&>li]:transition-colors [&>li]:duration-500 [&>li]:min-w-[80px]">
                    {views.map(({ text, selected }, index) => (
                        <li className="aria-selected:text-[#2381FE] aria-selected:bg-[#E5F4FF]" key={text}
                            aria-selected={selected} onClick={() => handleViewerTabsClick(index)}
                        >
                            {text}
                        </li>
                    ))}
                </ul>
            </div>

            <hr className="w-full h-0.5 bg-[#DAE7FF]" />

            <div className="pb-4">
                <h2 className="text-left p-4 text-lg font-bold text-[#6C6C6C]"> 牙列 </h2>
                <ul id="modelInfo-wrapper"
                    className="*:relative *:w-full *:py-2.5 *:p-5 *:pr-6 *:flex *:items-center *:border-l-4 *:border-transparent *:border-solid *:cursor-pointer *:overflow-hidden *:transition-colors *:duration-500">
                    {models.map(({ visible, selected }, index) => (
                        <li className="aria-selected:bg-[#E5F4FF] aria-selected:border-[#2381FE]" role="listitem"
                            key={index} aria-selected={selected} onClick={() => handleModelTab(index)}
                        >
                            <img src={visible ? Eye : EyeClose} className="w-5 h-5 text-[#909090]" role="img" alt="eye"
                                 onClick={e => handleEyeClick(e, index)} />
                            &emsp;{modelsInfo[index].filename}
                            <span
                                className={`absolute -right-10 top-1 py-1 w-28 scale-75 rotate-45 ${!!modelsInfo[index].deleted ? "bg-[#2381FE]" : "bg-[#646466]"} origin-center text-white text-xs transition-colors duration-300 ease-in-out`}
                            >
                                {modelsInfo[index].deleted ? "已" : "未"}删减
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
