import React from "react";
import { Bot, Lock } from "lucide-react";

const ChatBot: React.FC = () => {
  return (
    <div
      className="sticky top-4 bg-gray-800 rounded-3xl p-5 flex flex-col items-center gap-4"
      style={{ height: "calc(97vh - 6rem)" }}
    >
      <div className="text-white font-bold text-lg w-full flex items-center justify-between">
        <span>Assistant</span>
        <span className="text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Lock size={12} /> Coming soon
        </span>
      </div>

      <div className="w-full h-full min-h-[300px] flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          <button
            className="w-full bg-black text-white py-4 rounded-2xl shadow-lg opacity-50 cursor-not-allowed flex items-center justify-center gap-3"
            title="Feature locked — coming soon"
            aria-disabled
            disabled
            onClick={(e) => e.preventDefault()}
          >
            <Bot size={22} />
            <span className="font-semibold">Chat with Inkmity</span>
          </button>

          <div className="w-full text-gray-400 text-sm leading-relaxed text-center">
            This feature is being polished. Stay tuned!
          </div>
        </div>
      </div>

      <div className="mt-auto w-full text-xs text-gray-500 text-center">
        You’ll soon be able to ask for artist suggestions, refine briefs, and
        more.
      </div>
    </div>
  );
};

export default ChatBot;
