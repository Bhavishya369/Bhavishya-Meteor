import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// List of educational/asteroid-related topics
const EDUCATIONAL_TOPICS = [
  'asteroid', 'meteor', 'comet', 'space', 'planet', 'solar system', 'orbit',
  'defense', 'protection', 'impact', 'crater', 'nasa', 'astronomy', 'science',
  'physics', 'gravity', 'telescope', 'satellite', 'rocket', 'mission',
  'extinction', 'dinosaurs', 'atmosphere', 'meteorite', 'cosmic', 'galaxy',
  'universe', 'black hole', 'nebula', 'star', 'sun', 'moon', 'mars', 'jupiter',
  'venus', 'mercury', 'saturn', 'uranus', 'neptune', 'pluto', 'education',
  'learn', 'teach', 'explain', 'what is', 'how does', 'why does'
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
      // Educational topics - answer directly
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
      // All other topics - mention time constraint but answer normally
      prompt = `CRITICAL: You are Arthurite AI in an asteroid defense emergency. User asked: "${question}"

MANDATORY RESPONSE STRUCTURE:
1. FIRST: Briefly mention we're in an asteroid defense crisis and don't have time
2. THEN: Provide a COMPLETE, DETAILED answer to the user's question (75-150 words)
3. ANSWER THE EXACT QUESTION THEY ASKED - do not redirect to asteroids
4. Use plain text only - no formatting
5. Give accurate, helpful information about their specific question

EXAMPLE:
User: "Who is IShowSpeed?"
Response: "We're in an asteroid defense crisis, but since you asked: IShowSpeed is a popular YouTuber and streamer known for his high-energy gaming content and entertaining personality. He gained fame through his FIFA gameplay and reaction videos, often featuring loud and energetic commentary that became his trademark style. His real name is Darren Watkins Jr., and he has millions of subscribers across various platforms. 🎮"

Now answer this question: ${question}

Start with a brief time warning, then provide the complete answer:`;
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    console.log("Gemini response status:", response.status);
    const data = await response.json();
    console.log("Full response:", JSON.stringify(data, null, 2));

    let answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 
                 "Processing your query... 🛰️ Systems are analyzing the request.";

    // Clean up response to ensure no formatting
    answer = answer
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '')   // Remove italics
      .replace(/#/g, '')    // Remove headers
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    // Word count check (approximately)
    const wordCount = answer.split(/\s+/).length;
    console.log(`Response word count: ${wordCount}`);
    console.log(`Question type: ${isEducationalQuestion(question) ? 'Educational' : 'Other topic'}`);
    
    // If response is too short or doesn't answer the question, enhance it
    if (wordCount < 50 || (answer.toLowerCase().includes('asteroid') && !question.toLowerCase().includes('asteroid'))) {
      const fallbackPrompt = `The user asked: "${question}". Please provide a direct, helpful answer to their specific question (75-150 words) without mentioning asteroids or planetary defense. Just answer their question normally.`;
      
      try {
        const fallbackResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: fallbackPrompt
                    }
                  ]
                }
              ]
            })
          }
        );
        const fallbackData = await fallbackResponse.json();
        answer = fallbackData?.candidates?.[0]?.content?.parts?.[0]?.text || 
                "We're in an emergency, but I'll answer your question. Please be more specific about what you'd like to know. 🚀";
      } catch (fallbackError) {
        answer = "We're in an asteroid defense crisis, but I'll answer your question. Could you please rephrase or provide more details? 🛡️";
      }
    }

    res.json({ answer, wordCount });
  } catch (error) {
    console.error("Error talking to Gemini:", error);
    res.json({ 
      answer: "Temporary system disruption. Continuing defense protocols. Please rephrase your question if needed. Earth protection remains active. 🛡️",
      wordCount: 20
    });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);