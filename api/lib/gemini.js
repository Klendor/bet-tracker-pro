// Gemini AI utilities for bet slip processing
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

export const processWithGemini = async (imageData) => {
  try {
    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, '');

    const requestBody = {
      contents: [{
        parts: [
          {
            text: `Analyze this betting slip image and extract the following information in JSON format:
            
            {
              "teams": "Team A vs Team B (or event description)",
              "sport": "Football/Basketball/Tennis/etc",
              "league": "Premier League/NBA/etc (if visible)",
              "bet_type": "Match Winner/Over Under/Handicap/etc",
              "selection": "Your specific bet selection",
              "odds": "2.50 (decimal format preferred)",
              "stake": "10.00 (just the number)",
              "potential_return": "25.00 (calculated: stake × odds)",
              "bookmaker": "Bet365/William Hill/etc (if visible)",
              "date": "${new Date().toISOString().split('T')[0]}",
              "confidence": "High/Medium/Low (based on image clarity)"
            }
            
            Important notes:
            - Extract exact text when possible
            - Convert odds to decimal format if needed (e.g., 3/2 = 2.50)
            - Calculate potential_return as stake × odds
            - Use "Unknown" for fields not clearly visible
            - Be conservative with confidence rating
            - Focus on the main bet, ignore multiple bets if present`
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
        topK: 32,
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
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON from the response
    let extractedData;
    try {
      // Look for JSON in the response text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If JSON parsing fails, create a fallback object
      extractedData = {
        teams: "Unable to extract",
        sport: "Unknown",
        league: "Unknown",
        bet_type: "Unknown",
        selection: "Unable to extract",
        odds: "1.00",
        stake: "0.00",
        potential_return: "0.00",
        bookmaker: "Unknown",
        date: new Date().toISOString().split('T')[0],
        confidence: "Low"
      };
    }

    // Validate and clean the extracted data
    const cleanedData = {
      teams: String(extractedData.teams || 'Unknown').trim(),
      sport: String(extractedData.sport || 'Unknown').trim(),
      league: String(extractedData.league || 'Unknown').trim(),
      bet_type: String(extractedData.bet_type || 'Unknown').trim(),
      selection: String(extractedData.selection || 'Unknown').trim(),
      odds: String(extractedData.odds || '1.00').replace(/[^\d.]/g, '') || '1.00',
      stake: String(extractedData.stake || '0.00').replace(/[^\d.]/g, '') || '0.00',
      potential_return: String(extractedData.potential_return || '0.00').replace(/[^\d.]/g, '') || '0.00',
      bookmaker: String(extractedData.bookmaker || 'Unknown').trim(),
      date: extractedData.date || new Date().toISOString().split('T')[0],
      confidence: extractedData.confidence || 'Low',
      status: 'pending'
    };

    // Calculate potential return if not provided correctly
    const odds = parseFloat(cleanedData.odds);
    const stake = parseFloat(cleanedData.stake);
    if (odds > 0 && stake > 0) {
      cleanedData.potential_return = (stake * odds).toFixed(2);
    }

    return cleanedData;

  } catch (error) {
    console.error('Gemini processing error:', error);
    throw new Error(`Failed to process bet slip: ${error.message}`);
  }
};