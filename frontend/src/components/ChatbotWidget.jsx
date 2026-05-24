import React, { useState } from "react";
import Chatbot from "../pages/Chatbot";
import "./ChatbotWidget.css";

import chatbotIcon from "../assets/chat.png"; // ✅ ton image

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="chatbot-window" role="dialog" aria-label="Chatbot">
          <div className="chatbot-window-header">
            <span>Assistant</span>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="chatbot-window-body">
            <Chatbot />
          </div>
        </div>
      )}

      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le chatbot" : "Ouvrir le chatbot"}
        title={open ? "Fermer" : "Chat"}
      >
        <img className="chatbot-fab-icon" src={chatbotIcon} alt="Chatbot" />
      </button>
    </>
  );
};

export default ChatbotWidget;