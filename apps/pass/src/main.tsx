import { render } from "preact";
import "./pass.css";
import { App } from "./App";
import { readShareToken } from "./token";

const root = document.getElementById("root");
if (!root) throw new Error("Falta el elemento #root");

render(<App token={readShareToken(window.location.hash)} />, root);
