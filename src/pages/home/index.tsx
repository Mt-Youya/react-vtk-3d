import React, { useRef, useEffect, startTransition, useState } from "react"
import { useSearchParams } from "react-router-dom"
import Header from "@/layout/Header"
import InfoSide from "@/layout/InfoSide"
import { ToothViewer } from "@/components/ToothViewer"
import type { ToothViewerHandle } from "@/components/ToothViewer"
import { Card, Loader, Tasks, Tips } from "@/components"
import { useInfoSideDataStore, useModelsInfoStore } from "@/stores"
import { getAllToothInfo, getDigitalFiles } from "@/apis/common"
import type { InfoSideData, ModelFileInfo } from "@/types"

export default function Home() {
    const [searchParams] = useSearchParams()
    const planId = searchParams.get("planId") ?? ""

    const [loading, setLoading] = useState(true)
    const viewerRef = useRef<ToothViewerHandle>(null)
    const { setModelsInfo } = useModelsInfoStore()
    const { setInfoSideData } = useInfoSideDataStore()

    function getActions() {
        return viewerRef.current?.getActions() ?? null
    }

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

        await getActions()?.triggerInitScene([modelFileDown, modelFileUp])
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

        await getActions()?.triggerInitScene([topBuffer, downBuffer], false, "vtp")
        if (topWidthGps) archWidthLabels("up", topWidthGps)
        if (downWidthGps) archWidthLabels("down", downWidthGps)
    }

    function archWidthLabels(type: "up" | "down", data: InfoSideData["topWidthGps"]) {
        const actions = getActions()
        if (!actions) return
        for (const k in data) {
            const { name, points } = data[k]
            const [p1, p2] = points
            if (p1[0] || p1[1] || p1[2] || p2[0] || p2[1] || p2[2]) {
                actions.addToothWidthLabels(type, k, name, p1, p2)
            }
        }
    }

    async function loadDefault() {
        // 先拿到原始 STL 文件
        const [upStlRes, downStlRes] = await Promise.all([
            fetch("/assets/models/up.stl"),
            fetch("/assets/models/down.stl"),
        ])
        const [upStlBlob, downStlBlob] = await Promise.all([
            upStlRes.blob(),
            downStlRes.blob(),
        ])

        // 调用分割接口，上下颌分别请求
        const upForm = new FormData()
        upForm.append("file", upStlBlob, "up.stl")
        upForm.append("jaw", "upper")

        const downForm = new FormData()
        downForm.append("file", downStlBlob, "down.stl")
        downForm.append("jaw", "lower")

        const [upBuffer, downBuffer] = await Promise.all([
            fetch("/api/segment-teeth", { method: "POST", body: upForm }).then((res) => res.arrayBuffer()),
            fetch("/api/segment-teeth", { method: "POST", body: downForm }).then((res) => res.arrayBuffer()),
        ])

        await getActions()?.triggerInitScene([downBuffer, upBuffer], true)
        setLoading(false)
    }

    // ToothViewer 挂载后加载数据
    useEffect(() => {
        // 等待 viewerRef 就绪（一帧后）
        const timer = setTimeout(() => {
            if (planId) {
                refresh()
            } else {
                loadDefault()
            }
        }, 100)
        return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <Loader open={loading} />
            <Header />
            <div className="w-full h-[calc(100vh-80px)] relative flex justify-between overflow-hidden">
                <div className="relative flex-1">
                    <Tasks />
                    <ToothViewer
                        ref={viewerRef}
                        className="w-[calc(100vw-384px)] h-full"
                    />
                </div>
                {/* <Card /> */}
                {/* <Tips /> */}
                {/* <InfoSide /> */}
            </div>
        </>
    )
}
