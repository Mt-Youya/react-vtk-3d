import { useState } from "react"
import { ArrowRight } from "/public/assets/icons"

export default function Tasks() {

    const l = 2 * 11 * Math.PI

    const [expanded, setExpanded] = useState(true)

    const taskList = [
        {
            id: 1,
            title: "高X_2023-07-11_BC01001446544_L ",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In euismod, nisi vitae volutpat egestas, nisl nisi aliquet nisi, vitae efficitur nisl nisi euismod.",
            completed: false,
            progress: 75,
        },
        {
            id: 2,
            title: "高X_2023-07-11_BC01001446544_R",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In euismod, nisi vitae volutpat egestas, nisl nisi aliquet nisi, vitae efficitur nisl nisi euismod.",
            completed: false,
            progress: 80,
        },
    ]

    return (
        <div id="tasks" className="absolute right-0 bottom-0 z-10">
            <div className="rounded-md w-64 bg-[#8F8F8F] py-2.5 px-4 overflow-hidden">
                <h2 id="task-title" aria-expanded={expanded}
                    className="cursor-pointer text-white text-left flex justify-between items-center hover:text-gray-800"
                    onClick={() => setExpanded(prevState => !prevState)}
                >
                    <p><span>任务列表</span> <span className="text-xs"> ( 进行中 ) </span></p>
                    <img src={ArrowRight} alt="arrow" className={`w-4 h-4 transition-all duration-150 ${expanded ? "rotate-90" : ""}`} />
                </h2>

                <ul className="aria-expanded:max-h-0 max-h-20 w-full text-[#C1C1C1] text-xs text-left transition-max-height duration-500"
                    aria-expanded={expanded}
                >

                    {taskList.map(task => (
                        <li className="flex justify-between items-center pt-2" key={task.title}>
                            <p> {task.title} </p>
                            <svg className="w-6 h-6 text-white">
                                <circle cx="12" cy="12" r="11" strokeWidth="1" stroke="#00000040" fill="none" />
                                <circle cx="12" cy="12" r="11" strokeWidth="1" stroke="#949494" fill="none"
                                        className="-rotate-90 origin-center transition-stroke-dasharray duration-400 transition-linear transition-stroke"
                                        strokeDasharray={`${l * task.progress / 100} ${l}`} strokeLinecap="round"
                                />
                                <text x="2" y="16" className="text-xs scale-75 origin-center"
                                      fill="#c1c1c1"> {task.progress}%
                                </text>
                            </svg>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
