// Gemini AI utilities for bet slip processing
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

export const processWithGemini = async (imageData) => {
  try {
    // Remove data:image/png;base64, prefix if present
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const requestBody = {
      contents: [{
        parts: [
          {
            text: `Analyze this betting slip image and extract the following information in JSON format:
            
            {
              "teams": "Team A vs Team B or player names",
              "sport": "sport name (football, basketball, tennis, etc.)",
              "league": "league or tournament name",
              "bet_type": "type of bet (moneyline, spread, total, etc.)",
              "selection": "specific selection made",
              "odds": "betting odds in any format",
              "stake": "bet amount with currency",
              "potential_return": "potential payout amount",
              "bookmaker": "betting site/app name",
              "date": "date in YYYY-MM-DD format if visible",
              "confidence": "High/Medium/Low based on image clarity"
            }
            
            Important:
            - Extract exact text as shown in the image
            - If information is not clearly visible, use empty string ""
            - For odds, preserve the original format (decimal, fractional, American)
            - Be precise with team names and selections
            - Confidence should be High only if all major fields are clearly readable`
          },
          {
            inline_data: {
              mime_type: "image/png",
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 1,
        maxOutputTokens: 1024,
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const textResponse = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from response
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Gemini response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    const requiredFields = ['teams', 'sport', 'bet_type', 'selection', 'odds', 'stake'];
    const missingFields = requiredFields.filter(field => !extractedData[field]);
    
    if (missingFields.length > 0) {
      console.warn('Missing fields in extraction:', missingFields);
    }
    
    // Set default values for missing fields
    return {
      teams: extractedData.teams || '',
      sport: extractedData.sport || '',
      league: extractedData.league || '',
      bet_type: extractedData.bet_type || '',
      selection: extractedData.selection || '',
      odds: extractedData.odds || '',
      stake: extractedData.stake || '',
      potential_return: extractedData.potential_return || '',
      bookmaker: extractedData.bookmaker || '',
      date: extractedData.date || new Date().toISOString().split('T')[0],
      confidence: extractedData.confidence || 'Medium'
    };

  } catch (error) {
    console.error('Gemini processing error:', error);
    throw new Error(`Failed to process bet slip: ${error.message}`);
  }
};