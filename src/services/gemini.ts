import axios from 'axios';
import { DesignerState, DesignBoard } from '../routes/chat';
import ProductModel from '../models/Product';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// System instruction prompt to shape Gemini's designer agent persona
const getSystemPrompt = (products: any[]) => `
You are a senior professional interior design architect named Aurora.
Your objective is to conduct a friendly, guided consultation with homeowners to plan their dream rooms.
You must analyze room details and construct a design profile.

Strict Workflow:
- You must ask EXACTLY ONE question at a time.
- Read the user's responses, reason about previous details, and update the "state" object.
- Generate intelligent follow-up questions one by one.
- DO NOT generate the final design proposal until you have collected ALL of the following 15 attributes in the state:
  1. propertyType (House or Apartment)
  2. sqFt (Total square feet)
  3. bedrooms (Number of bedrooms)
  4. familyMembers (Number of family members)
  5. kids (Yes/No and details)
  6. pets (Yes/No and details)
  7. budget (Target budget)
  8. style (Scandinavian, Industrial, Bohemian, Japandi, Minimalist)
  9. colors (Favorite colors)
  10. lighting (Lighting preference)
  11. flooring (Flooring preference)
  12. ceiling (Ceiling preference)
  13. furnitureNeeds (Core furniture needed)
  14. storage (Storage requirements)
  15. naturalLight (Natural light level)

Once all 15 criteria are filled, or if the user explicitly triggers generation (e.g. commands like "generate plan", "generate proposal"), transition to the reasoning phase and generate a complete interior design proposal board.

You must output your response EXACTLY as a JSON object matching this structure:
{
  "content": "Your conversation response to the user, using markdown styling. If you are asking a question, ask exactly one question. If you are generating the proposal, summarize the plan and notify them that the blueprint has been synthesized.",
  "state": {
    "propertyType": "Parsed value or empty string",
    "sqFt": "Parsed value or empty string",
    "bedrooms": "Parsed value or empty string",
    "familyMembers": "Parsed value or empty string",
    "kids": "Parsed value or empty string",
    "pets": "Parsed value or empty string",
    "budget": "Parsed value or empty string",
    "style": "Parsed value or empty string",
    "colors": "Parsed value or empty string",
    "lighting": "Parsed value or empty string",
    "flooring": "Parsed value or empty string",
    "ceiling": "Parsed value or empty string",
    "furnitureNeeds": "Parsed value or empty string",
    "storage": "Parsed value or empty string",
    "naturalLight": "Parsed value or empty string"
  },
  "suggestions": [
    "Option suggestion 1 for quick clicking",
    "Option suggestion 2 for quick clicking",
    "Option suggestion 3 for quick clicking"
  ],
  "proposal": null or {
    "title": "Design Plan Title",
    "summary": "Concept overview summary",
    "completePlan": "A highly detailed, comprehensive interior design plan narrative covering layout zoning and space design.",
    "recommendedFurniture": [
      "Sofa: Specific details",
      "Table: Specific details"
    ],
    "wallColors": [
      { "name": "Color Name 1", "hex": "#HEX" },
      { "name": "Color Name 2", "hex": "#HEX" }
    ],
    "floorTiles": "Detailed flooring/tiles specifications",
    "ceilingDetails": "Detailed ceiling specifications",
    "lightingSuggestions": "Detailed lighting suggestions",
    "curtains": "Detailed curtain/drapery specifications",
    "decorations": "Detailed decor/accents specifications",
    "spacePlanning": "Zoning, pathway, and traffic flow guidelines",
    "furnitureSizes": "Sizing specifications based on room square footage",
    "walkingClearances": "Clearances in inches for paths and corridors",
    "estimatedBudgetBreakdown": "Line item cost estimates matching budget limits",
    "productIds": ["f10000000000000000000001", "f10000000000000000000002"] // Reference valid IDs from the list below
  }
}

The available marketplace product IDs and their details are:
${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price })))}
`;

export async function askGemini(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  currentState: DesignerState
): Promise<{
  content: string;
  state: DesignerState;
  suggestions: string[];
  board?: DesignBoard;
}> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  // Fetch products from MongoDB catalog
  const dbProducts = await ProductModel.find();
  const products = dbProducts.map(p => ({
    id: p._id.toString(),
    name: p.name,
    category: p.category,
    price: p.price,
    description: p.description,
    image: p.image,
    specs: Object.fromEntries(p.specs instanceof Map ? p.specs : new Map()),
    rating: p.rating || 5.0,
    reviewsCount: p.reviewsCount || 0
  }));

  // Format history messages for Gemini v1beta API contents array
  // Roles map: user -> user, assistant -> model
  const contents = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await axios.post(url, {
      contents,
      systemInstruction: {
        parts: [{ text: getSystemPrompt(products) }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7
      }
    });

    const candidateText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Empty response from Gemini API.');
    }

    const parsed = JSON.parse(candidateText);

    // Map recommendation product IDs to complete objects
    let board: DesignBoard | undefined = undefined;
    if (parsed.proposal) {
      const matchedProducts = products.filter(p => parsed.proposal.productIds?.includes(p.id));
      board = {
        title: parsed.proposal.title,
        summary: parsed.proposal.summary,
        completePlan: parsed.proposal.completePlan,
        recommendedFurniture: parsed.proposal.recommendedFurniture,
        wallColors: parsed.proposal.wallColors,
        floorTiles: parsed.proposal.floorTiles,
        ceilingDetails: parsed.proposal.ceilingDetails,
        lightingSuggestions: parsed.proposal.lightingSuggestions,
        curtains: parsed.proposal.curtains,
        decorations: parsed.proposal.decorations,
        spacePlanning: parsed.proposal.spacePlanning,
        furnitureSizes: parsed.proposal.furnitureSizes,
        walkingClearances: parsed.proposal.walkingClearances,
        estimatedBudgetBreakdown: parsed.proposal.estimatedBudgetBreakdown,
        shoppingCatalog: matchedProducts,
        imageUrl: getStylePresetImage(parsed.state.style || currentState.style)
      };
    }

    // Cast the parsed state back
    const state: DesignerState = {
      propertyType: parsed.state.propertyType || currentState.propertyType,
      sqFt: parsed.state.sqFt || currentState.sqFt,
      bedrooms: parsed.state.bedrooms || currentState.bedrooms,
      familyMembers: parsed.state.familyMembers || currentState.familyMembers,
      kids: parsed.state.kids || currentState.kids,
      pets: parsed.state.pets || currentState.pets,
      budget: parsed.state.budget || currentState.budget,
      style: parsed.state.style || currentState.style,
      colors: parsed.state.colors || currentState.colors,
      lighting: parsed.state.lighting || currentState.lighting,
      flooring: parsed.state.flooring || currentState.flooring,
      ceiling: parsed.state.ceiling || currentState.ceiling,
      furnitureNeeds: parsed.state.furnitureNeeds || currentState.furnitureNeeds,
      storage: parsed.state.storage || currentState.storage,
      naturalLight: parsed.state.naturalLight || currentState.naturalLight
    };

    return {
      content: parsed.content,
      state,
      suggestions: parsed.suggestions || [],
      board
    };

  } catch (error: any) {
    console.error('Gemini API connection error:', error.message || error);
    throw error;
  }
}

// Preset style graphics
function getStylePresetImage(style?: string): string {
  const norm = (style || 'minimalist').toLowerCase();
  if (norm.includes('scandi')) return 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80';
  if (norm.includes('industrial')) return 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80';
  if (norm.includes('boho') || norm.includes('bohemian')) return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80';
  if (norm.includes('japandi')) return 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80';
  return 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80';
}
