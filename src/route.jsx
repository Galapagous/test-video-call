import { createBrowserRouter } from "react-router-dom";
import Homepage from "./pages/home/Homepage";
import Call from "./pages/call/Call";

const router = createBrowserRouter([
    {
        path: '/',
        element: <Homepage/>
    },
    {
        path: '/call',
        element: <Call/>
    },
])

export default router