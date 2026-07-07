import type { Linter } from "eslint";
import { baseConfig } from "./base.js";

export const nodeConfig: Linter.Config[] = [...baseConfig];

export default nodeConfig;
