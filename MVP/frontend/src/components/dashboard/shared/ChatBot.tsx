import React from "react";
import { Bot, Lock } from "lucide-react";

const ChatBot: React.FC = () => {
  return (
    <div
      className={[
        "fixed z-[1002] pointer-events-auto",
        "right-4 left-4 md:left-auto",               
      ].join(" ")}
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
        width: "min(400px, calc(100vw - 32px))",      
      }}
    >
      <div
        className="bg-card text-app border border-app rounded-3xl p-5 shadow-2xl flex flex-col gap-4"
        style={{
          height: "420px",                            
          maxHeight: "min(75vh, 520px)",             
        }}
      >
        <div className="text-app font-bold text-lg w-full flex items-center justify-between">
          <span>Assistant</span>
          <span className="text-xs bg-elevated text-subtle px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-app">
            <Lock size={12} /> Coming soon
          </span>
        </div>

        <div className="w-full flex-1 min-h-[160px] flex items-center justify-center">
          <div className="flex flex-col items-center justify-center gap-4 w-full">
            <button
              className={[
                "w-full rounded-2xl shadow-lg opacity-50 cursor-not-allowed",
                "flex items-center justify-center gap-3",
                "bg-app text-app border border-app",
                "h-12",
              ].join(" ")}
              title="Feature locked — coming soon"
              aria-disabled
              disabled
              onClick={(e) => e.preventDefault()}
            >
              <Bot size={22} />
              <span className="font-semibold">Chat with Inkmity</span>
            </button>

            <div className="w-full text-subtle text-sm leading-relaxed text-center">
              This feature is being polished. Stay tuned!
            </div>
          </div>
        </div>

        <div className="mt-auto w-full text-xs text-muted text-center">
          You’ll soon be able to ask for artist suggestions, refine briefs, and more.
        </div>
      </div>
    </div>
  );
};

export default ChatBot;