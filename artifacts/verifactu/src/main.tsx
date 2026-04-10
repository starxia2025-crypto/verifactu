import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

declare global {
  interface Window {
    __APP_CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}

const runtimeApiBaseUrl = window.__APP_CONFIG__?.API_BASE_URL?.trim();

if (runtimeApiBaseUrl) {
  setBaseUrl(runtimeApiBaseUrl);
}

setAuthTokenGetter(() => localStorage.getItem("verifactu_token"));

createRoot(document.getElementById("root")!).render(<App />);
