import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 🔍 Debug (remove later if you want)
console.log("Gemini key exists:", !!GEMINI_API_KEY);

// List of educational/asteroid-related topics
const EDUCATIONAL_TOPICS = [
  "asteroid", "meteor", "comet", "space", "planet", "solar system", "orbit",
  "defense", "protection", "impact", "crater", "nasa", "astronomy", "science",
  "physics", "gravity", "telescope", "satellite", "rocket", "mission",
  "extinction", "dinosaurs", "atmosphere", "meteorite", "cosmic", "galaxy",
  "universe", "black hole", "nebula", "star", "sun", "moon", "mars", "jupiter",
  "venus", "mercury", "saturn", "uranus", "neptune", "pluto", "education",
  "learn", "teach", "explain", "what is", "how does", "why does"
];

function isEducationalQuestion(question) {
  const lowerQuestion = question.toLowerCase();
  return EDUCATIONAL_TOPICS.some(topic => lowerQuestion.includes(topic));
}

app.post("/ask", async (req, res) => {
  const question = req.body.question;
  console.log("User asked:", question);

  try {
    let prompt;

    if (isEducationalQuestion(question)) {
      prompt = `You are Arthurite AI, a planetary defense assistant.

RESPONSE GUIDELINES:
- Provide clear educational answers (75-150 words)
- Focus on accurate scientific information
- Use plain text only - no formatting
- Use simple emojis occasionally 🚀🌍🛰️
- Be informative and helpful
- Do NOT mention time constraints or emergencies

Question: ${question}

Provide a well-structured educational response:`;
    } else {
      prompt = `CRITICAL: You are Arthurite AI in an asteroid defense emergency. User asked: "${question}"

MANDATORY RESPONSE STRUCTURE:
1. FIRST: Briefly mention we're in an asteroid defense crisis and don't have time
2. THEN: Provide a COMPLETE, DETAILED answer to the user's question (75-150 words)
3. ANSWER THE EXACT QUESTION THEY ASKED - do not redirect to asteroids
4. Use plain text only - no formatting
5. Give accurate, helpful information about their specific question

Now answer this question: ${question}

Start with a brief time warning, then provide the complete answer:`;
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    console.log("Gemini response status:", response.status);

    const data = await response.json();

    let answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Processing your query... 🛰️ Systems are analyzing the request.";

    answer = answer
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const wordCount = answer.split(/\s+/).length;

    if (
      wordCount < 50 ||
      (answer.toLowerCase().includes("asteroid") &&
        !question.toLowerCase().includes("asteroid"))
    ) {
      const fallbackPrompt = `The user asked: "${question}". Please provide a direct, helpful answer to their specific question (75-150 words).`;

      try {
        const fallbackResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: fallbackPrompt }]
                }
              ]
            })
          }
        );

        const fallbackData = await fallbackResponse.json();
        answer =
          fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text ||
          answer;
      } catch {
        // ignore fallback failure
      }
    }

    res.json({ answer, wordCount });
  } catch (error) {
    console.error("Error talking to Gemini:", error);
    res.json({
      answer:
        "Temporary system disruption. Continuing defense protocols. Please try again shortly. 🛡️",
      wordCount: 20
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
