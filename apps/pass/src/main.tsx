import { render } from "preact";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Falta el elemento #root");

render(<App />, root);
