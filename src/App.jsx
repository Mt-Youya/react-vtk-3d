import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import Home from "./pages/home"
import NotFound from "./pages/result/404"
import "./App.css"

function App() {
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
