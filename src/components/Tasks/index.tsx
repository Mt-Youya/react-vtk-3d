import { useState } from "react"
import { ChevronRightIcon } from "lucide-react"
import { useTaskStatusStore } from "@/stores"

interface Task {
    id: number
    title: string
    progress: number
}

const TASK_LIST: Task[] = [
    { id: 1, title: "高X_2023-07-11_BC01001446544_L", progress: 75 },
    { id: 2, title: "高X_2023-07-11_BC01001446544_R", progress: 80 },
]

const STATUS_LABELS = [undefined, "( 进行中 )", "( 已完成 )"] as const

const CIRCLE_R = 11
const CIRCUMFERENCE = 2 * CIRCLE_R * Math.PI

function CircleProgress({ progress }: { progress: number }) {
    const strokeDasharray = `${(CIRCUMFERENCE * progress) / 100} ${CIRCUMFERENCE}`
    return (
        <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r={CIRCLE_R} strokeWidth="1.5" stroke="#00000040" fill="none" />
            <circle
                cx="12"
                cy="12"
                r={CIRCLE_R}
                strokeWidth="1.5"
                stroke="#949494"
                fill="none"
                className="-rotate-90 origin-center"
                strokeDasharray={strokeDasharray}
                strokeLinecap="round"
            />
            <text x="12" y="16" textAnchor="middle" className="text-[7px]" fill="#c1c1c1">
                {progress}%
            </text>
        </svg>
    )
}

export default function Tasks() {
    const [expanded, setExpanded] = useState(true)
    const { status } = useTaskStatusStore()

    return (
        <div id="tasks" className="absolute right-0 bottom-0 z-10">
            <div className="rounded-md w-64 bg-[#8F8F8F] py-2.5 px-4 overflow-hidden">
                <h2
                    className="cursor-pointer text-white text-left flex justify-between items-center hover:text-gray-200 transition-colors"
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    <p className="flex items-center gap-1">
                        <span>任务列表</span>
                        <span className="text-xs opacity-80">{STATUS_LABELS[status]}</span>
                    </p>
                    <ChevronRightIcon
                        className={`w-4 h-4 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
                    />
                </h2>

                <ul
                    className="overflow-hidden transition-all duration-500"
                    style={{ maxHeight: expanded ? `${TASK_LIST.length * 40}px` : "0px" }}
                >
                    {TASK_LIST.map((task) => (
                        <li className="flex justify-between items-center pt-2 gap-2" key={task.id}>
                            <p className="text-[#C1C1C1] text-xs truncate flex-1">{task.title}</p>
                            <CircleProgress progress={task.progress} />
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
