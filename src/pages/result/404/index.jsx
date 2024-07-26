import { Link } from "react-router-dom"

function NotFound(){
    return (
        <div className="h-full flex justify-center items-center flex-col gap-7 bg-white">
            <div className="flex gap-3">
                <span className="border-r border-solid border-[#292e33] pr-3"> 404  </span>
                <span> Not Found </span>
            </div>
            <div className="rounded p-2 active:bg-[#f1f1f1]">
                <Link
                    replace to="/"
                    className="pb-1 relative text-[#0009] bg-gradient-to-r from-[#92db72] to-[#90ff00] bg-no-repeat bg-[length:0_2px] bg-right-bottom hover:bg-[length:100%_2px]  hover:bg-left-bottom transition-all duration-500"
                >
                    Back Home
                </Link>
            </div>
        </div>
    )
}

export default NotFound
