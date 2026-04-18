import { lazy, Suspense } from "react"
import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import Loader from "@/components/Loader"
import "./App.css"

const Home = lazy(() => import("./pages/home"))
const NotFound = lazy(() => import("./pages/result/404"))

function App() {
    return (
        <Router>
            <Suspense fallback={<Loader open={true} />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </Router>
    )
}

export default App
