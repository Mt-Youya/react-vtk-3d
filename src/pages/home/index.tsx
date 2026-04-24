import React, { useRef, useEffect, startTransition } from "react"
import { useSearchParams } from "react-router-dom"
import Header from "@/layout/Header"
import InfoSide from "@/layout/InfoSide"
import init from "@/core"
import { Card, Loader, Tasks, Tips } from "@/components"
import { useCoreStore, useInfoSideDataStore, useModelsInfoStore } from "@/stores"
import { getAllToothInfo, getDigitalFiles } from "@/apis/common"
import type { InfoSideData, ModelFileInfo } from "@/types"

export default function Home() {
    const [searchParams] = useSearchParams()
    const planId = searchParams.get("planId") ?? ""

    const [loading, setLoading] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)
    const { coreMethods, setCoreMethods } = useCoreStore()
    const { setModelsInfo } = useModelsInfoStore()
    const { setInfoSideData } = useInfoSideDataStore()

    async function refresh() {
        const result = await getAllToothInfo(planId).catch((err) => {
            console.error("getAllToothInfo error:", err)
            return null
        })

        if (!result || result.code !== 0) {
            setLoading(false)
            return
        }

        const { results, initial } = result.data

        if (initial) {
            const fileResult = await getDigitalFiles(planId).catch(() => null)
            if (fileResult) await loadFile(fileResult.data)
        } else {
            startTransition(() => {
                setInfoSideData(results)
            })
            await loadSave(results)
        }

        setLoading(false)
    }

    async function loadFile({ mandibleFile, maxillaFile, downFilename, upFilename }: ModelFileInfo) {
        startTransition(() => {
            setModelsInfo([
                { filename: upFilename, deleted: true },
                { filename: downFilename, deleted: true },
            ])
        })

        const [modelFileUp, modelFileDown] = await Promise.all([
            fetch(maxillaFile).then((res) => res.arrayBuffer()),
            fetch(mandibleFile).then((res) => res.arrayBuffer()),
        ])

        await coreMethods!.triggerInitScene([modelFileDown, modelFileUp])
    }

    async function loadSave(data: InfoSideData) {
        const { topFileName, downFileName, topResultVtpUrl, downResultVtpUrl, topWidthGps, downWidthGps } = data

        startTransition(() => {
            setModelsInfo([
                { filename: topFileName, deleted: true },
                { filename: downFileName, deleted: true },
            ])
        })

        const [topBuffer, downBuffer] = await Promise.all([
            fetch(downResultVtpUrl).then((res) => res.arrayBuffer()),
            fetch(topResultVtpUrl).then((res) => res.arrayBuffer()),
        ])

        coreMethods!.triggerInitScene([topBuffer, downBuffer], false, "vtp")
        if (topWidthGps) archWidthLabels("up", topWidthGps)
        if (downWidthGps) archWidthLabels("down", downWidthGps)
    }

    function archWidthLabels(type: "up" | "down", data: InfoSideData["topWidthGps"]) {
        const { addToothWidthLabels } = coreMethods!
        for (const k in data) {
            const { name, points } = data[k]
            const [p1, p2] = points
            if (p1[0] || p1[1] || p1[2] || p2[0] || p2[1] || p2[2]) {
                addToothWidthLabels(type, k, name, p1, p2)
            }
        }
    }

    async function loadDefault() {
        const [upBuffer, downBuffer] = await Promise.all([
            fetch("/assets/models/up.vtp").then((res) => res.arrayBuffer()),
            fetch("/assets/models/down.vtp").then((res) => res.arrayBuffer()),
        ])
        await coreMethods!.triggerInitScene([upBuffer, downBuffer], false, "vtp")
        setLoading(false)
    }

    useEffect(() => {
        if (!coreMethods) return
        if (planId) {
            refresh()
        } else {
            loadDefault()
        }
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
                <div className="relative flex-1">
                    <Tasks />
                    <div
                        id="container"
                        className="w-[calc(100vw-384px)] h-full relative"
                        ref={containerRef}
                        onClick={coreMethods?.handleRootClick as React.MouseEventHandler<HTMLDivElement> | undefined}
                    />
                </div>
                <Card />
                <Tips />
                <InfoSide />
            </div>
        </>
    )
}
