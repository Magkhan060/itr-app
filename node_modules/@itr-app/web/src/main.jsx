import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import App from "./App.jsx";
import { getThemeConfig } from "./theme/tokens.js";
import { useThemeStore } from "./store/index.js";
import "./styles/tailwind.css";

function Root() {
  const mode = useThemeStore((s) => s.mode);

  // Tailwind's darkMode: 'class' strategy reads this — keeps Tailwind utility
  // classes (if any are ever added) in sync with the ANTD algorithm switch.
  // Also set the CSS color-scheme property: without it, some Chromium-based
  // browsers still render native form-control chrome (autofill highlight,
  // focus rings) using light-mode defaults even though every app-rendered
  // color has switched to dark — this is what caused inputs to flash white
  // on the ITR forms.
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
  }, [mode]);

  // There is deliberately only ever ONE ConfigProvider in the whole app
  // (here). Nesting a second ConfigProvider with a different theme further
  // down the tree (e.g. to force a page to stay light) was tried and
  // reverted — ANTD's css-in-js cache emits one CSS rule per
  // component-variant class for the whole document, so two ConfigProviders
  // with different themes collide and only one rule survives, randomly
  // breaking whichever page didn't "win". Every page, including pre-auth
  // ones, must instead read live tokens via theme.useToken() and never
  // hardcode colors, so the single global theme always renders correctly.
  return (
    <ConfigProvider theme={getThemeConfig(mode)}>
      <App />
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>
);
