import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS = (process.env.GEMINI_MODELS || "gemini-2.5-flash,gemini-2.0-flash")
  .split(",")
  .map(model => model.trim())
  .filter(Boolean);
const geminiModelCooldowns = new Map();

function getModelCooldownMs(response) {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }
  if (response.status === 404) return 10 * 60 * 1000;
  if (response.status === 503) return 15 * 1000;
  return 60 * 1000;
}

async function generateGeminiText(prompt) {
  if (!GEMINI_API_KEY) {
    const error = new Error("Gemini API key is not configured.");
    error.statusCode = 503;
    throw error;
  }
  if (!GEMINI_MODELS.length) {
    const error = new Error("No Gemini models are configured.");
    error.statusCode = 503;
    throw error;
  }

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    const cooldown = geminiModelCooldowns.get(model);
    if (cooldown && cooldown.until > Date.now()) {
      console.info(`Skipping Gemini model ${model}; it is temporarily unavailable.`);
      continue;
    }

    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        }
      );
    } catch (cause) {
      lastError = new Error(`Gemini request failed for model ${model}.`, { cause });
      lastError.statusCode = 502;
      console.warn(`Gemini request failed for model ${model}.`);
      continue;
    }

    let data;
    try {
      data = await response.json();
    } catch (cause) {
      lastError = new Error(`Gemini returned invalid JSON for model ${model}.`, { cause });
      lastError.statusCode = 502;
      console.warn(`Gemini returned invalid JSON for model ${model}.`);
      continue;
    }

    if (!response.ok) {
      lastError = new Error(`Gemini model ${model} returned status ${response.status}.`);
      lastError.statusCode = response.status;
      console.warn(`Gemini model ${model} returned status ${response.status}.`);
      if ([404, 429, 503].includes(response.status)) {
        geminiModelCooldowns.set(model, {
          until: Date.now() + getModelCooldownMs(response),
          status: response.status
        });
        continue;
      }
      break;
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();
    if (!answer) {
      lastError = new Error(`Gemini model ${model} returned no text.`);
      lastError.statusCode = 502;
      console.warn(`Gemini model ${model} returned no text.`);
      continue;
    }

    geminiModelCooldowns.delete(model);
    console.info(`Gemini generated a response with model ${model}.`);
    return answer;
  }

  if (lastError) {
    const activeCooldowns = GEMINI_MODELS
      .map(model => geminiModelCooldowns.get(model))
      .filter(cooldown => cooldown && cooldown.until > Date.now());
    if (activeCooldowns.length === GEMINI_MODELS.length) {
      lastError.statusCode = activeCooldowns.some(cooldown => cooldown.status === 429)
        ? 429
        : 503;
    }
    throw lastError;
  }

  const error = new Error("No configured Gemini model is currently available.");
  const activeCooldowns = GEMINI_MODELS
    .map(model => geminiModelCooldowns.get(model))
    .filter(cooldown => cooldown && cooldown.until > Date.now());
  error.statusCode = activeCooldowns.some(cooldown => cooldown.status === 429)
    ? 429
    : 503;
  throw error;
}

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
  const question = req.body?.question;
  if (typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "A non-empty question is required." });
  }
  const isToroshiaRequest = /you are toroshia/i.test(question) &&
    question.includes("<chat transcript part>");
  console.info("AI request received.", {
    type: isToroshiaRequest ? "Toroshia" : "general",
    characters: question.length
  });

  try {
    let prompt;

    if (isToroshiaRequest) {
      prompt = question;
    } else if (isEducationalQuestion(question)) {
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

    let answer = await generateGeminiText(prompt);

    answer = answer
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const wordCount = answer.split(/\s+/).length;

    if (
      !isToroshiaRequest &&
      (wordCount < 50 ||
        (answer.toLowerCase().includes("asteroid") &&
          !question.toLowerCase().includes("asteroid")))
    ) {
      const fallbackPrompt = `The user asked: "${question}". Please provide a direct, helpful answer to their specific question (75-150 words).`;

      try {
        answer = await generateGeminiText(fallbackPrompt);
      } catch (fallbackError) {
        console.error("Unable to generate enhanced Gemini response:", fallbackError.message);
      }
    }

    res.json({ answer, wordCount });
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) && error.statusCode >= 400 &&
      error.statusCode < 600 ? error.statusCode : 502;
    console.error("Gemini request failed:", error.message);
    res.status(statusCode).json({
      error: statusCode === 429
        ? "All configured Gemini models are rate-limited or over quota."
        : "Unable to generate an AI response."
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
