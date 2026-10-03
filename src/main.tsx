import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { StyleProvider } from "@/context/StyleContext";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
      storageKey="vesadocforge.theme"
    >
      <StyleProvider>
        <App />
      </StyleProvider>
    </ThemeProvider>
  </QueryClientProvider>,
);
