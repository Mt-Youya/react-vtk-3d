import { Accordion, AccordionItem, AccordionContent, AccordionTrigger } from "@/ui/accordion.jsx"

export default function InfoSide(){

    const patientIssues = [
        { label: "牙齿问题", value: "牙齿拥挤 牙齿有间隙" },
        { label: "面型问题", value: "面型凸" },
        { label: "矫治器偏好", value: "隐形矫治器" },
        { label: "其他备注信息", value: "彩色是额是个试试看咔咔咔咔阿" },
    ]

    const tlist = [
        { num: 11, width: 12 },
        { num: 12, width: 12 },
        { num: 13, width: 12 },
        { num: 14, width: 12 },
        { num: 15, width: 12 },
        { num: 16, width: 12 },
        { num: 17, width: 12 },
        { num: NaN, width: NaN },
        { num: 21, width: 12 },
        { num: 22, width: 12 },
        { num: 23, width: 12 },
        { num: 24, width: 12 },
        { num: 25, width: 12 },
        { num: 26, width: 12 },
        { num: 27, width: 12 },
        { num: NaN, width: NaN },
    ]

    const [toothWidthExpanded, setToothWidthExpanded] = useState(false)

    return (
        <Accordion type="single" collapsible className="w-96 p-4">
            <AccordionItem value="item-1">
                <AccordionTrigger>患者信息</AccordionTrigger>
                <AccordionContent>
                    <div className="flex justify-start gap-2.5 px-4">
                        <img src="/assets/icons/Avatar.svg" className="w-16 aspect-square" alt="avatar" />
                        <p className="flex flex-col gap-2.5">
                            <span className="text-lg font-bold"> 茼蒿 </span> <span> 男 · 43岁 </span>
                        </p>
                    </div>
                    <ul className="w-full px-4 py-5">
                        {patientIssues.map(({ value, label }) => (
                            <li className="w-full grid grid-cols-[120px_minmax(220px,_1fr)] mb-2.5 text-left"
                                key={value}>
                                <span> {label}： </span>
                                <span> {value} </span>
                            </li>
                        ))}
                    </ul>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>详细数据</AccordionTrigger>
                <AccordionContent>
                    <ul id="data-content"
                        className="aria-expanded:max-h-[932px] max-h-0 overflow-hidden transition-max-h duration-300 *:text-[#6C6C6C] *:py-2.5 *:px-4 *:border-t-[#E7E7E7F2] *:border-t *:border-solid text-left"
                        aria-expanded="true">
                        <li>
                            <div className="font-bold text-base text-[#030404] my-2">牙弓宽度：</div>
                            <ol>
                                <li> 上颌尖牙段：- mm</li>
                                <li> 上颌前磨牙段： - mm</li>
                                <li> 上颌磨牙段：- mm</li>
                                <br />
                                <li> 下颌尖牙段：- mm</li>
                                <li> 下颌前磨牙段： - mm</li>
                                <li> 下颌磨牙段：- mm</li>
                            </ol>
                        </li>
                        <li>
                            <div className="flex items-center justify-between text-base font-bold text-[#030404] select-none cursor-pointer"
                                 onClick={() => setToothWidthExpanded(!toothWidthExpanded)}>
                                牙齿宽度： <img src="/assets/icons/Arrow-Right.svg?url" alt="arrow"
                                               className="aria-expanded:rotate-90 -rotate-90 transition-transform duration-300 ease-in-out -scale-x-100 w-4 h-4"
                                               aria-expanded={toothWidthExpanded} />
                            </div>
                            <div className="my-2 max-h-[48px] overflow-hidden transition-max-h duration-300">
                                <p>上颌：<span> - </span></p>
                                <p>下颌：<span> - </span></p>
                            </div>
                            <ol className="grid grid-cols-2 text-sm *:grid *:grid-cols-2 *:text-[#6C6C6C] *:py-3 *:border-b-2 *:border-solid *:border-[#F8F8F8] h-0 aria-expanded:h-[400px] overflow-hidden transition-height duration-300 ease-in-out"
                                aria-expanded={toothWidthExpanded}>
                                <li><span>牙号</span> <span>宽度</span></li>
                                <li><span>牙号</span> <span>宽度</span></li>
                                {tlist.map(({ num, width }, idx) => (
                                    <li key={idx}>{isNaN(num) ? null : <><span>#{num} </span> <span>{width}mm</span></>}</li>
                                ))}
                            </ol>
                        </li>
                        <li>
                            <div className="font-bold text-base text-[#030404]">牙弓周长：</div>
                            <p>上颌：<span> - </span></p>
                            <p>下颌：<span> - </span></p>
                        </li>
                        <li>
                            <div className="font-bold text-base text-[#030404]">拥挤度：</div>
                            <div className="data-item-bottom my-2 max-h-[48px] overflow-hidden transition-max-h duration-300">
                                <p>上颌拥挤度：- </p>
                                <p>下颌拥挤度：- </p>
                            </div>
                        </li>
                        <li>
                            <div className="font-bold text-base text-[#030404]">Bolton指数：</div>
                            <div className="data-item-bottom my-2 max-h-[96px] overflow-hidden transition-max-h duration-300">
                                <p>前牙Bolton比：<span> - </span></p>
                                <p>下颌偏大：<span> - </span></p>
                                <p>全牙Bolton比：<span> - </span></p>
                                <p>下颌偏大：<span> - </span></p>
                            </div>
                        </li>
                        <li>
                            <div className="font-bold text-base text-[#030404]">前牙覆合覆盖：</div>
                            <div className="data-item-bottom my-2 max-h-[96px] overflow-hidden transition-max-h duration-300">
                                <p>覆合：-</p>
                                <p>覆盖：-</p>
                            </div>
                        </li>
                        <li>
                            <div className="font-bold text-base text-[#030404]">个别牙覆合覆盖：</div>
                            <div className="data-item-bottom my-2 max-h-[96px] overflow-hidden transition-max-h duration-300">
                                <pre>-</pre>
                            </div>
                        </li>
                    </ul>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}
