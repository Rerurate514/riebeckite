import {
  cliBoolean,
  cliString,
  defineCliCommand,
  definePlugin,
} from "@riebeckite/core";

export function fixtureCli() {
  return definePlugin({
    name: "fixture",
    cli: {
      commands: [
        defineCliCommand({
          id: "echo",
          summary: "Echo a message from the fixture plugin.",
          requiresProject: true,
          supportsJson: true,
          options: [
            cliString("message", {
              description: "Text to echo.",
              valueName: "text",
              required: true,
            }),
            cliBoolean("json", {
              description: "Write machine-readable JSON to stdout.",
            }),
          ],
          async handler(context, input) {
            const message = input.options.message;
            if (!context.json)
              context.output.writeLine(`fixture echo: ${message}`);
            return { json: { message, length: message.length } };
          },
        }),
      ],
    },
  });
}
