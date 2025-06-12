export default async function handler(req, res) {
  const { task } = req.body;

  if (!task) {
    return res.status(400).json({ 
      error: "No task provided",
      userMessage: "Please enter a task to get suggestions."
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OpenRouter API key not configured");
    return res.status(500).json({ 
      error: "Configuration error",
      userMessage: "Service is temporarily unavailable. Please try again later."
    });
  }

  try {
    const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Referer": "http://localhost:3000",
        "X-Title": "PlanWise Smart Task Planner"
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a smart task planning assistant. Return concise and actionable suggestions for completing tasks in bullet-point format like this:

• Estimated time to complete  
• Task difficulty level  
• Materials needed (if any)  
• Key steps to follow (up to 5 steps)  
• Tips and best practices

Avoid markdown headers like # or ##. Output should be clean bullet points with short phrases.`
          },
          {
            role: "user",
            content: `Please help me plan this task: ${task}`
          }
        ],
        max_tokens: 350,
        temperature: 0.7
      })
    });

    if (!orRes.ok) {
      let errorMessage;
      try {
        const errorData = await orRes.json();
        console.error("OpenRouter Error:", errorData);
        errorMessage = errorData.error?.message || "Failed to fetch suggestion";
      } catch (parseError) {
        const errorText = await orRes.text();
        console.error("OpenRouter Error:", errorText);
        errorMessage = "Failed to fetch suggestion";
      }

      return res.status(orRes.status).json({
        error: errorMessage,
        userMessage: "Unable to generate suggestion at this time. Please try again later."
      });
    }

    const data = await orRes.json();
    let suggestion = data.choices?.[0]?.message?.content || "No suggestion available.";

    return res.status(200).json({
      suggestion,
      metadata: {
        model: data.model,
        timestamp: new Date().toISOString(),
        format: "bullet-points"
      }
    });

  } catch (err) {
    console.error("Unexpected Error:", err);
    return res.status(500).json({
      error: err.message,
      userMessage: "An unexpected error occurred. Please try again later."
    });
  }
}
