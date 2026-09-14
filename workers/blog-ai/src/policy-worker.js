import { formatTechnicalContext } from "./technical-context.js";
import worker from "./worker.js";

function policyAwareAi(ai) {
  if (!ai || typeof ai.run !== "function") return ai;

  return {
    run(model, options = {}) {
      const messages = Array.isArray(options.messages)
        ? options.messages.map((message, index) => {
            if (index !== 0 || message?.role !== "system") return message;
            return {
              ...message,
              content: `${String(message.content || "")}\n\n${formatTechnicalContext()}`,
            };
          })
        : options.messages;

      return ai.run(model, { ...options, messages });
    },
  };
}

export default {
  fetch(request, env, ctx) {
    const wrappedEnv = env?.AI
      ? { ...env, AI: policyAwareAi(env.AI) }
      : env;
    return worker.fetch(request, wrappedEnv, ctx);
  },
};
