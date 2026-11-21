# Bhavishya 
Young Builders

Try It : https://bhavishya369.github.io/Bhavishya-Meteor/index.html

## Gemini API

Set `GEMINI_API_KEY` in the hosting service's environment variables. The server
tries models in the order listed by `GEMINI_MODELS`; the default is
`gemini-2.5-flash,gemini-2.0-flash`. On quota, rate-limit, temporary service,
or unavailable-model responses, it cools down that model and tries the next.
The preferred model is retried after its cooldown, so it is selected again
when it becomes available. Set `GEMINI_MODELS` to a comma-separated priority
list if a model is unavailable for your API key or project.
