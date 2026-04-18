import { useState } from "react"
import { ChevronRightIcon } from "lucide-react"
import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@/ui/accordion"
import { useInfoSideDataStore } from "@/stores"
import type { ArchWidthData, InfoSideData, ToothInfo } from "@/types"
import toothNumData from "./data.json"

const { up, down } = toothNumData as {
    up: Record<string, number>
    down: Record<string, number>
}

const FRONT_TOOTH_NUMS = [1, 2, 3, 9, 10, 11]
const ALL_TOOTH_NUMS = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14]

interface PatientIssue {
    label: string
    value: string
}

interface ToothListItem {
    num: number | undefined
    value: number
}

interface BoltonResult {
    rate: string
    dviations: string
}

const PATIENT_ISSUES: PatientIssue[] = [
    { label: "牙齿问题", value: "牙齿拥挤 牙齿有间隙" },
    { label: "面型问题", value: "面型凸" },
    { label: "矫治器偏好", value: "隐形矫治器" },
    { label: "其他备注信息", value: "彩色是额是个试试看咔咔咔咔阿" },
]

function getToothWidthCount(list: ToothInfo[], conditions: number[]): number {
    return list.reduce(
        (total, item) =>
            conditions.includes(Number(item.num)) ? (total * 100 + item.value * 100) / 100 : total,
        0,
    )
}

function ArchWidthSection({ label, data }: { label: string; data: ArchWidthData | undefined }) {
    if (!data) return null
    const d = data as Record<string, { value?: number }>
    return (
        <>
            <li className="text-sm text-[#6C6C6C]">{label}尖牙段：{d.sharp?.value?.toFixed(2) ?? "-"} mm</li>
            <li className="text-sm text-[#6C6C6C]">{label}前磨牙段：{d.frontMolar?.value?.toFixed(2) ?? "-"} mm</li>
            <li className="text-sm text-[#6C6C6C]">{label}磨牙段：{d.molar?.value?.toFixed(2) ?? "-"} mm</li>
        </>
    )
}

export default function InfoSide() {
    const [toothWidthExpanded, setToothWidthExpanded] = useState(false)
    const { infoSideData } = useInfoSideDataStore()

    const toothList: ToothListItem[] = [
        ...(infoSideData?.topToothList.map((item) => ({
            num: up[String(item.num)],
            value: item.value,
        })) ?? []),
        ...(infoSideData?.downToothList.map((item) => ({
            num: down[String(item.num)],
            value: item.value,
        })) ?? []),
    ]

    const frontBolton: BoltonResult | null = (() => {
        if (!infoSideData) return null
        const dataUpFront = getToothWidthCount(infoSideData.topToothList, FRONT_TOOTH_NUMS)
        const dataDownFront = getToothWidthCount(infoSideData.downToothList, FRONT_TOOTH_NUMS)
        if (dataUpFront === 0) return null
        const bolton = dataDownFront / dataUpFront
        return {
            rate: bolton.toFixed(2),
            dviations: ((bolton - 0.788) * dataUpFront).toFixed(2),
        }
    })()

    const allBolton: BoltonResult | null = (() => {
        if (!infoSideData) return null
        const dataUpAll = getToothWidthCount(infoSideData.topToothList, ALL_TOOTH_NUMS)
        const dataDownAll = getToothWidthCount(infoSideData.downToothList, ALL_TOOTH_NUMS)
        if (dataUpAll === 0) return null
        const bolton = dataDownAll / dataUpAll
        return {
            rate: bolton.toFixed(2),
            dviations: ((bolton - 0.915) * dataUpAll).toFixed(2),
        }
    })()

    const widthGps = infoSideData as (InfoSideData & Record<string, { value?: number }>) | null

    return (
        <Accordion defaultValue={["item-1"]} className="w-96 p-4">
            <AccordionItem value="item-1">
                <AccordionTrigger>患者信息</AccordionTrigger>
                <AccordionContent>
                    <div className="flex justify-start gap-2.5 px-4">
                        <img src="/assets/icons/Avatar.svg" className="w-16 aspect-square" alt="avatar" />
                        <p className="flex flex-col gap-2.5">
                            <span className="text-lg font-bold">茼蒿</span>
                            <span>男 · 43岁</span>
                        </p>
                    </div>
                    <ul className="w-full px-4 py-5">
                        {PATIENT_ISSUES.map(({ value, label }) => (
                            <li
                                className="w-full grid grid-cols-[120px_minmax(220px,_1fr)] mb-2.5 text-left"
                                key={label}
                            >
                                <span>{label}：</span>
                                <span>{value}</span>
                            </li>
                        ))}
                    </ul>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
                <AccordionTrigger>详细数据</AccordionTrigger>
                <AccordionContent>
                    <ul className="*:text-[#6C6C6C] *:py-2.5 *:px-4 *:border-t-[#E7E7E7F2] *:border-t *:border-solid text-left">
                        <li>
                            <div className="font-bold text-base text-[#030404] my-2">牙弓宽度：</div>
                            <ol className="space-y-1">
                                <ArchWidthSection label="上颌" data={widthGps?.topWidthGps as ArchWidthData | undefined} />
                                <br />
                                <ArchWidthSection label="下颌" data={widthGps?.downWidthGps as ArchWidthData | undefined} />
                            </ol>
                        </li>

                        <li>
                            <button
                                className="flex items-center justify-between w-full text-base font-bold text-[#030404] select-none cursor-pointer"
                                onClick={() => setToothWidthExpanded((v) => !v)}
                                aria-expanded={toothWidthExpanded}
                            >
                                牙齿宽度：
                                <ChevronRightIcon
                                    className={`w-4 h-4 transition-transform duration-300 ease-in-out ${toothWidthExpanded ? "rotate-90" : "-rotate-90 scale-y-[-1]"}`}
                                />
                            </button>
                            <div className="my-2 text-sm">
                                上颌总长：<span>{infoSideData?.topTotalToothWidth ?? "-"} mm</span>
                                &nbsp; 下颌总长：<span>{infoSideData?.downTotalToothWidth ?? "-"} mm</span>
                            </div>
                            <ol
                                className="grid grid-cols-2 text-sm overflow-hidden transition-all duration-300 ease-in-out"
                                style={{ maxHeight: toothWidthExpanded ? "400px" : "0px" }}
                            >
                                <li className="grid grid-cols-2 text-[#6C6C6C] py-3 border-b-2 border-solid border-[#F8F8F8]">
                                    <span>牙号</span><span>宽度</span>
                                </li>
                                <li className="grid grid-cols-2 text-[#6C6C6C] py-3 border-b-2 border-solid border-[#F8F8F8]">
                                    <span>牙号</span><span>宽度</span>
                                </li>
                                {toothList.map(({ num, value }, idx) => (
                                    <li key={idx} className="grid grid-cols-2 text-[#6C6C6C] py-3 border-b-2 border-solid border-[#F8F8F8]">
                                        {num !== undefined && !isNaN(num) && (
                                            <>
                                                <span>#{num}</span>
                                                <span>{value}mm</span>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </li>

                        <li>
                            <div className="font-bold text-base text-[#030404]">牙弓周长：</div>
                            <p>上颌：<span>{infoSideData?.topTotalArchLength ?? "-"} mm</span></p>
                            <p>下颌：<span>{infoSideData?.downTotalArchLength ?? "-"} mm</span></p>
                        </li>

                        <li>
                            <div className="font-bold text-base text-[#030404]">拥挤度：</div>
                            <p>上颌拥挤度：{infoSideData?.crowdedUpper ?? "-"}</p>
                            <p>下颌拥挤度：{infoSideData?.crowdedLower ?? "-"}</p>
                        </li>

                        <li>
                            <div className="font-bold text-base text-[#030404]">Bolton指数：</div>
                            <p>前牙Bolton比：<span>{frontBolton?.rate ?? "-"}%</span></p>
                            <p>下颌偏大：<span>{frontBolton?.dviations ?? "-"} mm</span></p>
                            <p>全牙Bolton比：<span>{allBolton?.rate ?? "-"}%</span></p>
                            <p>下颌偏大：<span>{allBolton?.dviations ?? "-"} mm</span></p>
                        </li>

                        <li>
                            <div className="font-bold text-base text-[#030404]">前牙覆合覆盖：</div>
                            <p>覆合：{infoSideData?.teethFgDesc ?? "-"}</p>
                            <p>覆盖：{infoSideData?.teethFhDesc ?? "-"}</p>
                        </li>

                        <li>
                            <div className="font-bold text-base text-[#030404]">个别牙覆合覆盖：</div>
                            <pre className="whitespace-pre-wrap text-sm">{infoSideData?.indCoverOverbiteDesc ?? "-"}</pre>
                        </li>
                    </ul>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}
