import Header from "@/layout/Header"
import InfoSide from "@/layout/InfoSide"
import init from "@/core"
import { Card, Loader, Tasks, Tips } from "@/components"
import { useCoreStore, useModelsInfoStore } from "@/stores"
import { getAllToothInfo, getDigitalFiles } from "@/apis/common.js"
import { useLocation } from "react-router-dom"

export default function Home() {
    const location = useLocation()
    const planId = location.search.split("planId=")[1]

    const [loading, setLoading] = useState(true)
    const containerRef = useRef(null)
    const { coreMethods, setCoreMethods } = useCoreStore()
    const { setModelsInfo } = useModelsInfoStore()

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
            await getDigitalFiles(planId).then(async ({ code, data, msg }) => {
                setLoading(false)
                if (code === 0) {
                    if (!data) return setLoading(false)
                    // useTimeout(() => Loading.hide(), 3000)
                    await loadFile(data)
                } else {
                }
            })
        } else {
            await loadSave(results).catch(err => {
                console.log(err)
            })
        }
        setLoading(false)
    }

    function getFileBufferByUrl(url) {
        return fetch(url.split("?")[0]).then(res => res.arrayBuffer())
    }

    async function loadFile({ digitalMandibleFile, digitalMaxillaFile, lowerfileName, upperfileName }) {
        setModelsInfo([lowerfileName, upperfileName])
        const files = [digitalMaxillaFile, digitalMandibleFile]
        const modelFileUp = await getFileBufferByUrl(files[0])
        const modelFileDown = await getFileBufferByUrl(files[1])
        const fileList = [modelFileUp, modelFileDown]
        const result = await Promise.all(fileList.reverse())

        // const Card = this.#getInstance("Card")
        // Card.setModelName([upperfileName, lowerfileName])
        // Card.root.getBoundingClientRect()
        // await coreMethods.triggerInitScene(result)
        const viewUp = coreMethods.getCamera().getViewUp()
        // Card.resetState()
        setLoading(false)
    }

    async function loadSave(data) {

        const {
            topFileName,
            downFileName,
            topResultVtpUrl,
            downResultVtpUrl,
            topWidthGps,
            downWidthGps,
            topTotalToothWidth,
            topTotalArchLength,
            topToothList,
            downTotalToothWidth,
            downTotalArchLength,
            downToothList,
            teethFgDesc,
            teethFhDesc,
            indCoverOverbiteDesc,
            coverValue,
        } = data

        const downUrl = await fetch("/api/getVtpFile?url=down").then(res => res.json()).then(({ url }) => url)
        const topUrl = await fetch("/api/getVtpFile?url=up").then(res => res.json()).then(({ url }) => url)
        const parser = new DOMParser()


        const [down, up] = await Promise.all([getFileBufferByUrl(downUrl), getFileBufferByUrl(topUrl)]).catch(err => {
            console.log("allErr", err)
        })

        const { triggerInitScene } = coreMethods
        triggerInitScene([down, up], "vtp")
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
