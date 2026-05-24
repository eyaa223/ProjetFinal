import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./Chatbot.css";
import chatbotIcon from "../assets/chat.png";
import { useTranslation } from "react-i18next";

// Messages de bienvenue et textes UI par langue
const UI_TEXTS = {
  fr: {
    welcome: "Bonjour ! Comment puis-je vous aider ?",
    placeholder: "Posez votre question...",
    send: "Envoyer",
    typing: "En train d'écrire...",
    error: "Désolé, je n'ai pas compris.",
    serverError: "Erreur serveur. Réessayez plus tard.",
  },
  en: {
    welcome: "Hello! How can I help you?",
    placeholder: "Ask your question...",
    send: "Send",
    typing: "Typing...",
    error: "Sorry, I didn't understand.",
    serverError: "Server error. Please try again later.",
  },
  ar: {
    welcome: "مرحباً! كيف يمكنني مساعدتك؟",
    placeholder: "اطرح سؤالك...",
    send: "إرسال",
    typing: "جاري الكتابة...",
    error: "عذراً، لم أفهم سؤالك.",
    serverError: "خطأ في الخادم. يرجى المحاولة لاحقاً.",
  },
};

const Chatbot = () => {
  const { i18n } = useTranslation();

  // Langue synchronisée avec la navbar
  const currentLang = i18n.language?.startsWith("ar") ? "ar"
  : i18n.language?.startsWith("en") ? "en"
  : "fr";

  const t = UI_TEXTS[currentLang];
  const isRTL = currentLang === "ar";

  const [messages, setMessages] = useState([
    { type: "bot", text: t.welcome },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Quand la langue change dans la navbar → reset le chat avec le bon message de bienvenue
  useEffect(() => {
    setMessages([{ type: "bot", text: UI_TEXTS[currentLang].welcome }]);
  }, [currentLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const question = input.trim();
    setMessages((prev) => [...prev, { type: "user", text: question }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await axios.post("http://localhost:5000/api/chatbot/ask", {
        question,
        language: currentLang,
      });

      const answer =
        res.data?.answer || t.error;

      setMessages((prev) => [...prev, { type: "bot", text: answer }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: t.serverError },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div
      className={`chatbot-container ${isRTL ? "rtl" : ""}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* ✅ Plus de boutons FR / EN / AR ici — géré par la navbar */}

      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`message-row ${msg.type} ${isRTL ? "rtl" : ""}`}
          >
            {msg.type === "bot" && (
              <img className="bot-avatar" src={chatbotIcon} alt="Bot" />
            )}
            <div className={`message ${msg.type}`}>{msg.text}</div>
          </div>
        ))}

        {isTyping && (
          <div className={`message-row bot ${isRTL ? "rtl" : ""}`}>
            <img className="bot-avatar" src={chatbotIcon} alt="Bot" />
            <div
              className="message bot typing"
              aria-label={t.typing}
            >
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input">
        <input
          type="text"
          placeholder={t.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          dir={isRTL ? "rtl" : "ltr"}
        />
        <button onClick={sendMessage} type="button" aria-label={t.send}>
          {t.send}
        </button>
      </div>
    </div>
  );
};

export default Chatbot;