import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import { useOSSStore } from "@/stores"
import { getOSSClient } from "@/apis/OSSClient.js"
import Home from "./pages/home"
import NotFound from "./pages/result/404"
import "./App.css"

function App() {
    const { setClient } = useOSSStore()
    useEffect(() => {
        (async () => {
            const client = await getOSSClient()
            if (client) {
                setClient(client)
            }
        })()
    }, [])
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    )
}

export default App
