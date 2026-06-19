import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/main.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=171d061e"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("E:/Projects/itr-app/apps/web/src/main.jsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=171d061e"; const React = __vite__cjsImport3_react.__esModule ? __vite__cjsImport3_react.default : __vite__cjsImport3_react;
import __vite__cjsImport4_reactDom_client from "/node_modules/.vite/deps/react-dom_client.js?v=171d061e"; const ReactDOM = __vite__cjsImport4_reactDom_client.__esModule ? __vite__cjsImport4_reactDom_client.default : __vite__cjsImport4_reactDom_client;
import { BrowserRouter } from "/node_modules/.vite/deps/react-router-dom.js?v=171d061e";
import { ConfigProvider } from "/node_modules/.vite/deps/antd.js?v=171d061e";
import App from "/src/App.jsx";
import { getThemeConfig } from "/src/theme/tokens.js";
import { useThemeStore } from "/src/store/index.js";
import "/src/styles/tailwind.css";
function Root() {
  _s();
  const mode = useThemeStore((s) => s.mode);
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode === "dark" ? "dark" : "light";
  }, [mode]);
  return /* @__PURE__ */ jsxDEV(ConfigProvider, { theme: getThemeConfig(mode), children: /* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
    fileName: "E:/Projects/itr-app/apps/web/src/main.jsx",
    lineNumber: 46,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "E:/Projects/itr-app/apps/web/src/main.jsx",
    lineNumber: 45,
    columnNumber: 5
  }, this);
}
_s(Root, "md2TqrlT23wHCEl5SZR3KQxIVY0=", false, function() {
  return [useThemeStore];
});
_c = Root;
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ jsxDEV(React.StrictMode, { children: /* @__PURE__ */ jsxDEV(BrowserRouter, { children: /* @__PURE__ */ jsxDEV(Root, {}, void 0, false, {
    fileName: "E:/Projects/itr-app/apps/web/src/main.jsx",
    lineNumber: 54,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "E:/Projects/itr-app/apps/web/src/main.jsx",
    lineNumber: 53,
    columnNumber: 5
  }, this) }, void 0, false, {
    fileName: "E:/Projects/itr-app/apps/web/src/main.jsx",
    lineNumber: 52,
    columnNumber: 3
  }, this)
);
var _c;
$RefreshReg$(_c, "Root");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("E:/Projects/itr-app/apps/web/src/main.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("E:/Projects/itr-app/apps/web/src/main.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBMEJNOzs7Ozs7Ozs7Ozs7Ozs7OztBQTFCTixPQUFPQSxXQUFXO0FBQ2xCLE9BQU9DLGNBQWM7QUFDckIsU0FBU0MscUJBQXFCO0FBQzlCLFNBQVNDLHNCQUFzQjtBQUMvQixPQUFPQyxTQUFTO0FBQ2hCLFNBQVNDLHNCQUFzQjtBQUMvQixTQUFTQyxxQkFBcUI7QUFDOUIsT0FBTztBQUVQLFNBQVNDLE9BQU87QUFBQUMsS0FBQTtBQUNkLFFBQU1DLE9BQU9ILGNBQWMsQ0FBQ0ksTUFBTUEsRUFBRUQsSUFBSTtBQVN4Q1QsUUFBTVcsVUFBVSxNQUFNO0FBQ3BCQyxhQUFTQyxnQkFBZ0JDLFVBQVVDLE9BQU8sUUFBUU4sU0FBUyxNQUFNO0FBQ2pFRyxhQUFTQyxnQkFBZ0JHLE1BQU1DLGNBQWNSLFNBQVMsU0FBUyxTQUFTO0FBQUEsRUFDMUUsR0FBRyxDQUFDQSxJQUFJLENBQUM7QUFFVCxTQUNFLHVCQUFDLGtCQUFlLE9BQU9KLGVBQWVJLElBQUksR0FDeEMsaUNBQUMsU0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQUksS0FETjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBRUE7QUFFSjtBQUFDRCxHQXBCUUQsTUFBSTtBQUFBLFVBQ0VELGFBQWE7QUFBQTtBQUFBLEtBRG5CQztBQXNCVE4sU0FBU2lCLFdBQVdOLFNBQVNPLGVBQWUsTUFBTSxDQUFDLEVBQUVDO0FBQUFBLEVBQ25ELHVCQUFDLE1BQU0sWUFBTixFQUNDLGlDQUFDLGlCQUNDLGlDQUFDLFVBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFLLEtBRFA7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUVBLEtBSEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUlBO0FBQ0Y7QUFBRSxJQUFBQztBQUFBLGFBQUFBLElBQUEiLCJuYW1lcyI6WyJSZWFjdCIsIlJlYWN0RE9NIiwiQnJvd3NlclJvdXRlciIsIkNvbmZpZ1Byb3ZpZGVyIiwiQXBwIiwiZ2V0VGhlbWVDb25maWciLCJ1c2VUaGVtZVN0b3JlIiwiUm9vdCIsIl9zIiwibW9kZSIsInMiLCJ1c2VFZmZlY3QiLCJkb2N1bWVudCIsImRvY3VtZW50RWxlbWVudCIsImNsYXNzTGlzdCIsInRvZ2dsZSIsInN0eWxlIiwiY29sb3JTY2hlbWUiLCJjcmVhdGVSb290IiwiZ2V0RWxlbWVudEJ5SWQiLCJyZW5kZXIiLCJfYyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJtYWluLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgUmVhY3RET00gZnJvbSBcInJlYWN0LWRvbS9jbGllbnRcIjtcbmltcG9ydCB7IEJyb3dzZXJSb3V0ZXIgfSBmcm9tIFwicmVhY3Qtcm91dGVyLWRvbVwiO1xuaW1wb3J0IHsgQ29uZmlnUHJvdmlkZXIgfSBmcm9tIFwiYW50ZFwiO1xuaW1wb3J0IEFwcCBmcm9tIFwiLi9BcHAuanN4XCI7XG5pbXBvcnQgeyBnZXRUaGVtZUNvbmZpZyB9IGZyb20gXCIuL3RoZW1lL3Rva2Vucy5qc1wiO1xuaW1wb3J0IHsgdXNlVGhlbWVTdG9yZSB9IGZyb20gXCIuL3N0b3JlL2luZGV4LmpzXCI7XG5pbXBvcnQgXCIuL3N0eWxlcy90YWlsd2luZC5jc3NcIjtcblxuZnVuY3Rpb24gUm9vdCgpIHtcbiAgY29uc3QgbW9kZSA9IHVzZVRoZW1lU3RvcmUoKHMpID0+IHMubW9kZSk7XG5cbiAgLy8gVGFpbHdpbmQncyBkYXJrTW9kZTogJ2NsYXNzJyBzdHJhdGVneSByZWFkcyB0aGlzIOKAlCBrZWVwcyBUYWlsd2luZCB1dGlsaXR5XG4gIC8vIGNsYXNzZXMgKGlmIGFueSBhcmUgZXZlciBhZGRlZCkgaW4gc3luYyB3aXRoIHRoZSBBTlREIGFsZ29yaXRobSBzd2l0Y2guXG4gIC8vIEFsc28gc2V0IHRoZSBDU1MgY29sb3Itc2NoZW1lIHByb3BlcnR5OiB3aXRob3V0IGl0LCBzb21lIENocm9taXVtLWJhc2VkXG4gIC8vIGJyb3dzZXJzIHN0aWxsIHJlbmRlciBuYXRpdmUgZm9ybS1jb250cm9sIGNocm9tZSAoYXV0b2ZpbGwgaGlnaGxpZ2h0LFxuICAvLyBmb2N1cyByaW5ncykgdXNpbmcgbGlnaHQtbW9kZSBkZWZhdWx0cyBldmVuIHRob3VnaCBldmVyeSBhcHAtcmVuZGVyZWRcbiAgLy8gY29sb3IgaGFzIHN3aXRjaGVkIHRvIGRhcmsg4oCUIHRoaXMgaXMgd2hhdCBjYXVzZWQgaW5wdXRzIHRvIGZsYXNoIHdoaXRlXG4gIC8vIG9uIHRoZSBJVFIgZm9ybXMuXG4gIFJlYWN0LnVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoXCJkYXJrXCIsIG1vZGUgPT09IFwiZGFya1wiKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuY29sb3JTY2hlbWUgPSBtb2RlID09PSBcImRhcmtcIiA/IFwiZGFya1wiIDogXCJsaWdodFwiO1xuICB9LCBbbW9kZV0pO1xuXG4gIHJldHVybiAoXG4gICAgPENvbmZpZ1Byb3ZpZGVyIHRoZW1lPXtnZXRUaGVtZUNvbmZpZyhtb2RlKX0+XG4gICAgICA8QXBwIC8+XG4gICAgPC9Db25maWdQcm92aWRlcj5cbiAgKTtcbn1cblxuUmVhY3RET00uY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJvb3RcIikpLnJlbmRlcihcbiAgPFJlYWN0LlN0cmljdE1vZGU+XG4gICAgPEJyb3dzZXJSb3V0ZXI+XG4gICAgICA8Um9vdCAvPlxuICAgIDwvQnJvd3NlclJvdXRlcj5cbiAgPC9SZWFjdC5TdHJpY3RNb2RlPlxuKTtcbiJdLCJmaWxlIjoiRTovUHJvamVjdHMvaXRyLWFwcC9hcHBzL3dlYi9zcmMvbWFpbi5qc3gifQ==