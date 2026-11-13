#!/usr/bin/env node
import { runCreateRiebeckite } from "../dist/src/index.js";

await runCreateRiebeckite(process.argv.slice(2));
