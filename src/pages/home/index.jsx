import Header from "@/layout/Header"
import InfoSide from "@/layout/InfoSide"
import init from "@/core"
import { Card, Loader, Tasks, Tips } from "@/components"
import { useCoreStore, useInfoSideDataStore, useModelsInfoStore } from "@/stores"
import { getAllToothInfo, getDigitalFiles } from "@/apis/common.js"
import { useLocation } from "react-router-dom"

export default function Home() {
    const location = useLocation()
    const planId = location.search.split("planId=")[1]

    const [loading, setLoading] = useState(true)
    const containerRef = useRef(null)
    const { coreMethods, setCoreMethods } = useCoreStore()
    const { setModelsInfo } = useModelsInfoStore()
    const { setInfoSideData } = useInfoSideDataStore()

    async function refresh() {
        const data = await getAllToothInfo(planId).then(({ code, data }) => {
            if (code !== 0) {
                setLoading(false)
                return null
            }
            return data
        }).catch(err => {
            console.log(err)
            setLoading(false)
            return null
        })
        if (!data) return setLoading(false)
        const { results, initial } = data

        if (initial) {
            await getDigitalFiles(planId).then(({ code, data }) => loadFile(data))
        } else {
            setInfoSideData(results)
            await loadSave(results)
        }
        setLoading(false)
    }

    async function loadFile({ mandibleFile, maxillaFile, downFilename, upFilename }) {
        setModelsInfo([{ filename: upFilename, deleted: true }, { filename: downFilename, deleted: true }])
        const modelFileUp = await fetch(maxillaFile).then(res => res.arrayBuffer())
        const modelFileDown = await fetch(mandibleFile).then(res => res.arrayBuffer())
        const fileList = [modelFileDown, modelFileUp]
        await coreMethods.triggerInitScene(fileList)
    }

    async function loadSave(data) {
        const { topFileName, downFileName, topResultVtpUrl, downResultVtpUrl, topWidthGps, downWidthGps } = data
        setModelsInfo([{ filename: topFileName, deleted: true }, { filename: downFileName, deleted: true }])

        const topBuffer = await fetch(downResultVtpUrl).then(res => res.arrayBuffer())
        const downBuffer = await fetch(topResultVtpUrl).then(res => res.arrayBuffer())

        const { triggerInitScene } = coreMethods
        triggerInitScene([topBuffer, downBuffer], "vtp")
        topWidthGps && archWidthLabels("up", topWidthGps)
        downWidthGps && archWidthLabels("down", downWidthGps)
    }

    function archWidthLabels(type = "up", data) {
        const { addToothWidthLabels } = coreMethods
        for (const k in data) {
            const { name, points } = data[k]
            const [p1, p2] = points
            if (p1[0] || p1[1] || p1[2] || p2[0] || p2[1] || p2[2]) {
                addToothWidthLabels(type, k, name, p1, p2)
            }
        }
    }

    useEffect(() => {
        if (!coreMethods) return
        if (planId) {
            refresh()
        }
        setLoading(false)
    }, [coreMethods])

    useEffect(() => {
        const container = containerRef.current
        if (container) {
            const result = init(container)
            setCoreMethods(result)
        }
    }, [])

    return (
        <>
            <Loader open={loading} />
            <Header />
            <div className="w-full h-[calc(100vh-80px)] relative flex justify-between overflow-hidden">
                <div className="relative">
                    <Tasks />
                    <div id="container" className="w-[calc(100vw-384px)] h-full relative"
                         ref={containerRef} onClick={coreMethods?.handleRootClick}
                    />
                </div>
                <Card />
                <Tips />
                <InfoSide />
            </div>
        </>
    )
}
