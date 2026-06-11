import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import MainWindow from "./components/MainWindow";
import ClipboardOverlay from "./components/ClipboardOverlay";
import { AppProvider } from "./context/AppContext";

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("main"); // Default to main

  useEffect(() => {
    const initWindow = async () => {
      try {
        const currentWindow = getCurrentWindow();
        const label = currentWindow.label;
        console.log("[App] Window label:", label);
        setWindowLabel(label);

        // If it's main window, show it by default
        if (label === "main") {
          await currentWindow.show();
        }
      } catch (e) {
        console.error("[App] Failed to get window:", e);
      }
    };

    initWindow();
  }, []);

  return (
    <AppProvider>
      {windowLabel === "main" && <MainWindow />}
      {windowLabel === "clipboard" && <ClipboardOverlay />}
      {windowLabel !== "main" && windowLabel !== "clipboard" && (
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      )}
    </AppProvider>
  );
}

export default App;
