import db from '../config/db.js';

const COLS = {
  fr: { question: 'question', answer: 'answer' },
  en: { question: 'question_en', answer: 'answer_en' },
  ar: { question: 'question_ar', answer: 'answer_ar' }
};

const DEFAULTS = {
  fr: "Désolé, je n'ai pas de réponse pour cette question. Essayez de reformuler.",
  en: "Sorry, I don't have an answer for that question. Please try rephrasing.",
  ar: "عذراً، ليس لدي إجابة على هذا السؤال. يرجى إعادة صياغته."
};

export const askChatbot = async (req, res) => {
  try {
    const { question, language = 'fr' } = req.body;
    
    // 🔹 DEBUG LOGS
    console.log('🔍 [CHATBOT] Requête reçue:', { question, language });

    if (!question?.trim()) {
      return res.status(400).json({ answer: 'Veuillez poser une question.' });
    }

const rawLang = language || 'fr';
const lang = rawLang.startsWith('ar') ? 'ar'
  : rawLang.startsWith('en') ? 'en'
  : 'fr';    const { question: qCol, answer: aCol } = COLS[lang];
    
    console.log(`🔍 [CHATBOT] Recherche dans colonnes: ${qCol} → ${aCol}`);

    // 🔹 1️⃣ Recherche dans la langue demandée
    const searchQuery = `SELECT ${aCol} as answer 
                         FROM chatbot_questions 
                         WHERE ${qCol} LIKE ? AND ${qCol} IS NOT NULL AND ${qCol} != ''
                         LIMIT 1`;

    console.log(`🔍 [CHATBOT] Requête SQL: ${searchQuery}`);
    console.log(`🔍 [CHATBOT] Paramètre: [%${question.trim()}%]`);

    const [results] = await db.execute(searchQuery, [`%${question.trim()}%`]);
    
    console.log(`🔍 [CHATBOT] Résultats trouvés: ${results.length}`, results[0]);

    if (results.length > 0 && results[0].answer) {
      console.log(`✅ [CHATBOT] Réponse trouvée en ${lang}`);
      return res.json({ 
        answer: results[0].answer,
        matchedLang: lang 
      });
    }

    // 🔹 2️⃣ Fallback en français si pas trouvé
    if (lang !== 'fr') {
      console.log(`🔄 [CHATBOT] Fallback: recherche en français...`);
      const [fallback] = await db.execute(
        `SELECT answer FROM chatbot_questions WHERE question LIKE ? AND question IS NOT NULL AND question != '' LIMIT 1`,
        [`%${question.trim()}%`]
      );
      
      if (fallback.length > 0 && fallback[0].answer) {
        console.log(`✅ [CHATBOT] Réponse trouvée en français (fallback)`);
        return res.json({ 
          answer: fallback[0].answer,
          matchedLang: 'fr',
          note: 'Réponse trouvée en français' 
        });
      }
    }

    // 🔹 3️⃣ Aucune correspondance
    console.log(`❌ [CHATBOT] Aucune réponse trouvée`);
    return res.json({ 
      answer: DEFAULTS[lang],
      matchedLang: null 
    });

  } catch (err) {
    console.error('❌ [CHATBOT] Erreur askChatbot:', err);
    res.status(500).json({ answer: 'Erreur serveur. Veuillez réessayer plus tard.' });
  }
};