export function target (target) {
  return {
    command: function (command) {
      return {
        do: function (consumer) {
          return function (message, sender, sendResponse) {
            return (message?.target === target && message?.command === command) &&
              Promise.resolve(consumer(message?.content, sender, sendResponse));
          };
        }
      };
    }
  };
}
