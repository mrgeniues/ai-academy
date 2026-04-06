import { createRoot } from "react-dom/client";
import "./lib/init-api"; // Initialize API token getter before anything else
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
