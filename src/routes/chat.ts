import { Router, Request, Response } from 'express';
import { PRODUCTS, Product } from './marketplace';
import { askGemini } from '../services/gemini';
import ProductModel from '../models/Product';

const router = Router();

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface DesignerState {
  propertyType?: string;
  sqFt?: string;
  bedrooms?: string;
  familyMembers?: string;
  kids?: string;
  pets?: string;
  budget?: string;
  style?: string;
  colors?: string;
  lighting?: string;
  flooring?: string;
  ceiling?: string;
  furnitureNeeds?: string;
  storage?: string;
  naturalLight?: string;
}

export interface DesignBoard {
  title: string;
  summary: string;
  completePlan: string;
  recommendedFurniture: string[];
  wallColors: { name: string; hex: string }[];
  floorTiles: string;
  ceilingDetails: string;
  lightingSuggestions: string;
  curtains: string;
  decorations: string;
  spacePlanning: string;
  furnitureSizes: string;
  walkingClearances: string;
  estimatedBudgetBreakdown: string;
  shoppingCatalog: Product[];
  imageUrl: string;
}

// Map style names to preset images
const STYLE_IMAGES: Record<string, string> = {
  scandinavian: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
  industrial: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  bohemian: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
  japandi: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
  minimalist: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
};

// Custom Rule-Based & Context-Aware Parser
function parseHistoryForState(messages: Message[]): DesignerState {
  const state: DesignerState = {};

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role !== 'user') continue;

    const userText = msg.content.trim();
    const userTextLower = userText.toLowerCase();

    // Look at assistant message immediately preceding this user message to derive context
    const prevAssistantMsg = i > 0 ? messages[i - 1] : null;
    const prevContent = prevAssistantMsg && prevAssistantMsg.role === 'assistant' ? prevAssistantMsg.content.toLowerCase() : '';

    if (prevContent) {
      const prevContentClean = prevContent.replace(/\*/g, '');
      if (prevContentClean.includes('house or apartment')) {
        state.propertyType = userText;
      } else if (prevContentClean.includes('total square feet') || prevContentClean.includes('sq ft') || prevContentClean.includes('square footage') || prevContentClean.includes('area')) {
        state.sqFt = userText;
      } else if (prevContentClean.includes('bedrooms')) {
        state.bedrooms = userText;
      } else if (prevContentClean.includes('family members')) {
        state.familyMembers = userText;
      } else if (prevContentClean.includes('kids')) {
        state.kids = userText;
      } else if (prevContentClean.includes('pets')) {
        state.pets = userText;
      } else if (prevContentClean.includes('budget')) {
        state.budget = userText;
      } else if (prevContentClean.includes('style')) {
        state.style = userText;
      } else if (prevContentClean.includes('colors')) {
        state.colors = userText;
      } else if (prevContentClean.includes('lighting')) {
        state.lighting = userText;
      } else if (prevContentClean.includes('flooring')) {
        state.flooring = userText;
      } else if (prevContentClean.includes('ceiling')) {
        state.ceiling = userText;
      } else if (prevContentClean.includes('furniture')) {
        state.furnitureNeeds = userText;
      } else if (prevContentClean.includes('storage')) {
        state.storage = userText;
      } else if (prevContentClean.includes('natural light')) {
        state.naturalLight = userText;
      }
    }

    // Keyword checks (fail-safe fallback)
    // Style check
    if (userTextLower.includes('scandinavian') || userTextLower.includes('scandi') || userTextLower.includes('nordic')) {
      state.style = 'Scandinavian';
    } else if (userTextLower.includes('industrial') || userTextLower.includes('loft')) {
      state.style = 'Industrial';
    } else if (userTextLower.includes('bohemian') || userTextLower.includes('boho')) {
      state.style = 'Bohemian';
    } else if (userTextLower.includes('japandi') || userTextLower.includes('wabi-sabi') || userTextLower.includes('wabi sabi')) {
      state.style = 'Japandi';
    } else if (userTextLower.includes('minimalist') || userTextLower.includes('minimal')) {
      state.style = 'Minimalist';
    }

    // Property Type
    if (userTextLower.includes('apartment') || userTextLower.includes('flat') || userTextLower.includes('condo')) {
      state.propertyType = 'Apartment';
    } else if (userTextLower.includes('house') || userTextLower.includes('villa') || userTextLower.includes('home')) {
      state.propertyType = 'House';
    }

    // Kids
    if (userTextLower.includes('no kids') || userTextLower.includes('no children') || userTextLower.includes('don\'t have kids') || userTextLower.includes('do not have kids')) {
      state.kids = 'No';
    } else if (userTextLower.includes('kids') || userTextLower.includes('children') || userTextLower.includes('family with kids') || userTextLower.includes('have kids')) {
      state.kids = 'Yes';
    }

    // Pets
    if (userTextLower.includes('no pets') || userTextLower.includes('no dog') || userTextLower.includes('no cat')) {
      state.pets = 'No';
    } else if (userTextLower.includes('pets') || userTextLower.includes('dog') || userTextLower.includes('cat') || userTextLower.includes('have pet')) {
      state.pets = 'Yes';
    }
  }

  return state;
}

function getHexIdForShortId(idStr: string): string {
  let hexId = '';
  if (idStr.startsWith('f') && !idStr.startsWith('fl')) {
    hexId = `f100000000000000000000${idStr.substring(1).padStart(2, '0')}`;
  } else if (idStr.startsWith('l')) {
    hexId = `1100000000000000000000${idStr.substring(1).padStart(2, '0')}`;
  } else if (idStr.startsWith('fl')) {
    hexId = `f110000000000000000000${idStr.substring(2).padStart(2, '0')}`;
  } else if (idStr.startsWith('p')) {
    hexId = `ba00000000000000000000${idStr.substring(1).padStart(2, '0')}`;
  } else if (idStr.startsWith('d')) {
    hexId = `de00000000000000000000${idStr.substring(1).padStart(2, '0')}`;
  } else {
    hexId = idStr;
  }
  return hexId;
}

// Generate catalog products matching the style
async function getProductsForStyle(style: string | undefined): Promise<Product[]> {
  const normStyle = (style || 'minimalist').toLowerCase();
  
  // Fetch products from MongoDB
  const dbProducts = await ProductModel.find();
  const products: Product[] = dbProducts.map(p => ({
    id: p._id.toString(),
    name: p.name,
    category: p.category as any,
    price: p.price,
    description: p.description,
    image: p.image,
    specs: Object.fromEntries(p.specs instanceof Map ? p.specs : new Map()),
    rating: p.rating || 5,
    reviewsCount: p.reviewsCount || 0
  }));

  // Define hex IDs mapping for each style
  let targetHexIds: string[] = [];
  if (normStyle.includes('japandi')) {
    targetHexIds = [
      'f10000000000000000000001', // f1
      'f10000000000000000000002', // f2
      '110000000000000000000001', // l1
      'f11000000000000000000001', // fl1
      'ba0000000000000000000002', // p2
      'de0000000000000000000002'  // d2
    ];
  } else if (normStyle.includes('scandi') || normStyle.includes('scandinavian')) {
    targetHexIds = [
      'f10000000000000000000001', // f1
      'f10000000000000000000002', // f2
      '110000000000000000000001', // l1
      'f11000000000000000000001', // fl1
      'ba0000000000000000000002', // p2
      'de0000000000000000000001'  // d1
    ];
  } else if (normStyle.includes('industrial')) {
    targetHexIds = [
      'f10000000000000000000003', // f3
      '110000000000000000000002', // l2
      'f11000000000000000000002', // fl2
      'ba0000000000000000000001', // p1
      'de0000000000000000000001'  // d1
    ];
  } else if (normStyle.includes('boho') || normStyle.includes('bohemian')) {
    targetHexIds = [
      'f10000000000000000000001', // f1
      'f10000000000000000000003', // f3
      '110000000000000000000001', // l1
      'f11000000000000000000002', // fl2
      'ba0000000000000000000001', // p1
      'de0000000000000000000001', // d1
      'de0000000000000000000002'  // d2
    ];
  } else {
    targetHexIds = [
      'f10000000000000000000002', // f2
      'f10000000000000000000004', // f4
      '110000000000000000000002', // l2
      'f11000000000000000000001', // fl1
      'ba0000000000000000000002', // p2
      'de0000000000000000000002'  // d2
    ];
  }

  return products.filter(p => targetHexIds.includes(p.id));
}

// Dynamic Mock Agent Proposal Generator
async function generateMockProposal(state: DesignerState): Promise<DesignBoard> {
  const style = state.style || 'Japandi';
  const styleKey = style.toLowerCase();
  const imageUrl = STYLE_IMAGES[styleKey] || STYLE_IMAGES.minimalist;

  // 1. Color Palette derivation
  let colorsList = [
    { name: 'Warm Alabaster', hex: '#F5F5F0' },
    { name: 'Soft Taupe', hex: '#D7CCC8' },
    { name: 'Natural Oak', hex: '#8D6E63' }
  ];
  if (styleKey.includes('industrial')) {
    colorsList = [
      { name: 'Raw Iron', hex: '#374151' },
      { name: 'Weathered Brick', hex: '#C2410C' },
      { name: 'Edison Ember', hex: '#FBBF24' }
    ];
  } else if (styleKey.includes('boho') || styleKey.includes('bohemian')) {
    colorsList = [
      { name: 'Terracotta Rust', hex: '#BF360C' },
      { name: 'Desert Sand', hex: '#E0F2F1' },
      { name: 'Sage Leaf', hex: '#81C784' }
    ];
  } else if (state.colors) {
    // Custom parsed colors
    const colorsText = state.colors.toLowerCase();
    if (colorsText.includes('green') || colorsText.includes('sage')) {
      colorsList = [
        { name: 'Muted Sage', hex: '#8FA89B' },
        { name: 'Soft Beige', hex: '#EAE6DF' },
        { name: 'Oak Bark', hex: '#4A3B32' }
      ];
    } else if (colorsText.includes('blue') || colorsText.includes('slate')) {
      colorsList = [
        { name: 'Slate Blue', hex: '#4A6984' },
        { name: 'Driftwood', hex: '#D7C4B7' },
        { name: 'Parchment', hex: '#F9F6F0' }
      ];
    } else if (colorsText.includes('charcoal') || colorsText.includes('black') || colorsText.includes('dark')) {
      colorsList = [
        { name: 'Moody Charcoal', hex: '#262626' },
        { name: 'Brass Highlight', hex: '#C2A649' },
        { name: 'Pure Chalk', hex: '#FBFBFB' }
      ];
    }
  }

  // 2. Budget Logic
  const isPremium = state.budget?.toLowerCase().includes('50,000') || state.budget?.toLowerCase().includes('premium') || state.budget?.toLowerCase().includes('luxury');
  const isAffordable = state.budget?.toLowerCase().includes('5,000') || state.budget?.toLowerCase().includes('affordable') || state.budget?.toLowerCase().includes('low');
  
  let budgetEstimate = '$15,000 Total Estimated Cost';
  let budgetBreakdown = '• Materials & Paint: $1,500\n• Furniture & Curtains: $8,500\n• Flooring Installation: $2,500\n• Lighting & Fixtures: $1,000\n• Labor & Delivery: $1,500';
  if (isPremium) {
    budgetEstimate = '$55,000 Premium Design Budget';
    budgetBreakdown = '• Custom Architect Millwork & Paint: $12,000\n• Designer Furniture & Drapes: $28,000\n• Underfloor Heated Oak Flooring: $8,000\n• Travertine Stone Pendant Sets: $4,000\n• White-Glove Installation & Styling: $3,000';
  } else if (isAffordable) {
    budgetEstimate = '$4,800 Compact Budget Plan';
    budgetBreakdown = '• DIY Paint & Supplies: $400\n• Modular Storage & Flatpack Furniture: $2,800\n• Self-Adhesive Luxury Plank Overlays: $800\n• Core Track Lighting System: $300\n• Delivery & Self-Assembly: $500';
  }

  // 3. Child & Pet Durability
  const hasKids = state.kids?.toLowerCase().includes('yes') || state.kids?.toLowerCase().includes('have');
  const hasPets = state.pets?.toLowerCase().includes('yes') || state.pets?.toLowerCase().includes('have');
  let safetyAdvice = 'Standard placement profiles applied.';
  if (hasKids || hasPets) {
    safetyAdvice = '• Kid & Pet Protection Activated: Recommending rounded edge furniture, wall-anchored bookcases, and high-performance performance fabrics. Flooring specified has anti-scratch sealants.';
  }

  // 4. Square Footage Calculations for spaces
  const sqFtStr = state.sqFt || '1200';
  const sqFtNum = parseInt(sqFtStr.replace(/\D/g, '')) || 1200;
  let layoutSizes = '• Sofa: 84" max length\n• Coffee Table: 40" diameter round table\n• Desk: 44" compact floating console';
  let spaceClearances = '• Main Traffic Flow: Maintain 36" wide clear corridors.\n• Coffee Table Clearance: Leave 18" between the sofa and coffee table edge.\n• Walkways: Keep at least 24" clearance around secondary accent chairs.';
  if (sqFtNum < 900) {
    layoutSizes = '• Sofa: 72" loveseat (to prevent overcrowding)\n• Coffee Table: 32" nested tables (highly versatile and stackable)\n• Desk: 36" Kyoto floating wall desk';
    spaceClearances = '• Main Traffic Flow: Keep critical corridors at 32" clearance.\n• Coffee Table Clearance: 14" to 16" spacing to maximize walking space.\n• Furniture Spacing: Arrange secondary items flat against walls to open floor visual.';
  } else if (sqFtNum > 1800) {
    layoutSizes = '• Sofa: 110" L-shaped sectional sofa with modular lounge layout\n• Coffee Table: Large 48" solid oak rectangular coffee table\n• Desk: Full 60" executive solid walnut double-pedestal desk';
    spaceClearances = '• Main Traffic Flow: Maintain wide 42" walking avenues.\n• Coffee Table Clearance: Generous 20" spacing for easy transit.\n• Floating Layout: Pull seating away from walls by 18" to create a premium floating spatial island.';
  }

  // Assemble Complete Design Board
  return {
    title: `The Premium ${style} ${state.propertyType || 'Residence'} Plan`,
    summary: `A personalized interior design proposal synthesized for your ${state.bedrooms || 'multi-room'} ${state.propertyType || 'dwelling'} featuring a ${style} design blueprint. Tailored for ${state.familyMembers || 'family'} members, accommodating ${hasKids ? 'children' : 'no kids'} and ${hasPets ? 'pets' : 'no pets'}.`,
    
    completePlan: `### Spatial Layout Overview
This architectural layout optimizes your **${sqFtNum} sq ft** layout. The design is zone-oriented to support both social activities and quiet retreat. By utilizing a **${style}** style framework, we merge visual lightness with practical, functional storage to keep the space clean. 

${hasKids || hasPets ? `#### Durability & Safety Focus\nGiven that the household includes ${hasKids ? 'kids' : ''}${hasKids && hasPets ? ' and ' : ''}${hasPets ? 'pets' : ''}, we have prioritized **highly durable, scratch-resistant materials** and round-cornered furniture configurations to prevent accidents. Fabrics are treated with liquid-repellent coatings.` : ''}

#### Environmental & Visual Design
- **Lighting Dynamics**: The space utilizes ${state.naturalLight || 'natural'} sunlight, which is amplified by light-reflective walls and custom-placed accent lighting.
- **Color Temperature**: A custom palette of **${colorsList.map(c => c.name).join(', ')}** balances warmth with high-end designer aesthetics.`,
    
    recommendedFurniture: [
      `Sofa: Astrid Bouclé Sofa in High-Performance Pet-Friendly fabric`,
      `Coffee Table: Nordic Oak Coffee Table with solid-wood rounded legs`,
      `Accent Chair: Soren Leather Lounge Chair for comfortable seating`,
      `Study Desk: Kyoto Floating Desk to maximize space efficiency`
    ],
    
    wallColors: colorsList,
    
    floorTiles: `${state.flooring || 'Engineered Oak Planks'} — styled with matte anti-scratch satin sealant. Matching floor grout borders.`,
    
    ceilingDetails: `${state.ceiling || 'Dropped Drywall Ceiling'} — integrated with subtle recesses for architectural profile shadow lines.`,
    
    lightingSuggestions: `• Ambient: Solace Travertine Pendants set on dimmers above the dining and kitchen zone.\n• Task: Helios Matte Black Floor Lamp adjacent to the reading lounge.\n• Accent: Warm LED strip backlighting integrated into custom floating shelves.`,
    
    curtains: `Double-layered drapery: sheer linen interior filters harsh UV rays, while heavy organic cotton blackout outer curtains in a neutral color supply insulation and privacy.`,
    
    decorations: `Minimalist ceramic vases, textured abstract plaster paintings, woven organic seagrass floor baskets, and potted fiddle-leaf fig plants to introduce greenery.`,
    
    spacePlanning: `- Zone Allocation: Dedicate the window-facing layout for relaxation and seating to capture sunlight.\n- Office Placement: Anchor workspace nodes in low-traffic corners to enhance focus.\n${safetyAdvice}`,
    
    furnitureSizes: layoutSizes,
    
    walkingClearances: spaceClearances,
    
    estimatedBudgetBreakdown: budgetBreakdown,
    
    shoppingCatalog: await getProductsForStyle(style),
    
    imageUrl: imageUrl
  };
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: { message: 'A non-empty messages array is required.' } });
    }

    // 1. Parse entire context state from history
    const state = parseHistoryForState(messages);
    
    // Call real Gemini API if key is available and mock is disabled
    if (process.env.GEMINI_API_KEY && process.env.MOCK_AI !== 'true') {
      try {
        const response = await askGemini(messages, state);
        return res.status(200).json({
          success: true,
          message: {
            role: 'assistant',
            content: response.content,
            board: response.board
          },
          state: response.state,
          suggestions: response.suggestions,
          createdAt: new Date().toISOString()
        });
      } catch (err: any) {
        console.warn('Gemini AI endpoint failed. Falling back to local designer mock engine:', err.message);
      }
    }

    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    // 2. Check if the user is explicitly requesting a proposal or if all questions are filled
    const userWantsBoard = lastMessage.includes('generate board') || lastMessage.includes('build plan') || 
                           lastMessage.includes('generate proposal') || lastMessage.includes('generate plan') || 
                           lastMessage.includes('proposal') || lastMessage.includes('synthesize');
    
    // Count filled attributes out of 15
    const requiredFields = [
      state.propertyType, state.sqFt, state.bedrooms, state.familyMembers,
      state.kids, state.pets, state.budget, state.style, state.colors,
      state.lighting, state.flooring, state.ceiling, state.furnitureNeeds,
      state.storage, state.naturalLight
    ];
    const filledCount = requiredFields.filter(Boolean).length;
    const isReadyForProposal = filledCount >= 15 || userWantsBoard;

    // Simulate AI reasoning delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Case A: Generate final Board Proposal
    if (isReadyForProposal && state.propertyType) {
      const board = await generateMockProposal(state);
      
      const replyContent = `### Design Concept Prepared! 🎉\n\nI have successfully compiled all **${filledCount} specifications** of your project profile.\n\nUsing our **Agentic Spatial Planner**, I have generated a customized **Interior Design Blueprint** for your **${state.propertyType}**.\n\nBelow is the complete 13-part breakdown, estimated budget, space clearances, and matching products from our shop catalog. You can tweak this layout anytime by typing a refinement below, or download the full report as a PDF!`;

      return res.status(200).json({
        success: true,
        message: {
          role: 'assistant',
          content: replyContent,
          board
        },
        state,
        suggestions: ["Try a different design style", "Make it more kid-friendly", "Tweak color accents"],
        createdAt: new Date().toISOString()
      });
    }

    // Case B: Continue Guided Q&A
    let nextQuestion = '';
    let suggestions: string[] = [];

    if (!state.propertyType) {
      nextQuestion = "Welcome to your virtual interior design studio. Let's begin planning your space!\n\n**House or Apartment?**";
      suggestions = ["House", "Apartment", "Townhouse"];
    } else if (!state.sqFt) {
      nextQuestion = "Great! What is the **total square feet** of the space we are designing?";
      suggestions = ["800 sq ft", "1,500 sq ft", "2,500 sq ft"];
    } else if (!state.bedrooms) {
      nextQuestion = "Understood. How many **bedrooms** are in the layout?";
      suggestions = ["1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4+ Bedrooms"];
    } else if (!state.familyMembers) {
      nextQuestion = "How many **family members** live in this household?";
      suggestions = ["1 Member", "2 Members", "3-4 Members", "5+ Members"];
    } else if (!state.kids) {
      nextQuestion = "Are there any **kids** in the family?";
      suggestions = ["Yes, we have kids", "No kids"];
    } else if (!state.pets) {
      nextQuestion = "Do you have any **pets** (dogs, cats, etc.)?";
      suggestions = ["Yes, we have pets", "No pets"];
    } else if (!state.budget) {
      nextQuestion = "What is your target **budget** for this design and furnishing project?";
      suggestions = ["$5,000 (Affordable)", "$15,000 (Moderate)", "$50,000+ (Premium Luxury)"];
    } else if (!state.style) {
      nextQuestion = "Which **preferred design style** resonates with you?\n\n* **Japandi**: Low-profile, Japanese minimalism + warm Scandi textures.\n* **Scandinavian**: Airy, bright white oak, functional cozy fabrics.\n* **Industrial**: Raw concrete, dark steel frames, exposed brick textures.\n* **Bohemian**: Rattan layers, colorful textiles, lush indoor plants.\n* **Minimalist**: Sleek handleless cabinets, hidden storage, monolithic tones.";
      suggestions = ["Japandi style", "Scandinavian style", "Industrial style", "Bohemian style", "Minimalist style"];
    } else if (!state.colors) {
      nextQuestion = "What are your **favorite colors** or preferred color palettes for the interior?";
      suggestions = ["Sage Green & Warm Earth Tones", "Beige, Cream & Off-White Neutrals", "Charcoal Grey & Moody Matte Black", "Calming Slate Blue & Oak"];
    } else if (!state.lighting) {
      nextQuestion = "What is your **lighting preference**? (e.g., Cozy ambient lighting, bright task lights, decorative statement pendants)";
      suggestions = ["Cozy warm ambient lighting", "Bright functional task lighting", "Architectural hidden LED strips"];
    } else if (!state.flooring) {
      nextQuestion = "What is your **flooring preference**? (e.g., Hardwood planks, stone tiles, plush carpet, polished marble)";
      suggestions = ["Wide Oak Hardwood Planks", "Matte Terrazzo Tiles", "Sleek Polished Marble", "Durable Luxury Vinyl (LVP)"];
    } else if (!state.ceiling) {
      nextQuestion = "What is your **ceiling preference**? (e.g., Flat plaster ceiling, exposed beams, dropped ceiling with LED channels)";
      suggestions = ["Exposed Wooden Beams", "Modern Dropped Ceiling with LED coves", "Simple Flat Matte Plaster"];
    } else if (!state.furnitureNeeds) {
      nextQuestion = "What are your primary **furniture needs**? (e.g., Sectional sofa, large dining table, king bed, study desk)";
      suggestions = ["L-shaped Sectional & Coffee Table", "6-Seater Dining Set & Sideboard", "King Bed & Nightstands"];
    } else if (!state.storage) {
      nextQuestion = "What are your **storage requirements**? (e.g., Maximized built-in cabinets, modular shelving, minimal storage)";
      suggestions = ["Maximized floor-to-ceiling cabinets", "Minimalist open shelving", "Standard closets & dressers"];
    } else if (!state.naturalLight) {
      nextQuestion = "Finally, how is the **natural light** in the space?";
      suggestions = ["Flooded with natural light", "Moderate window lighting", "Low natural light (north facing)"];
    } else {
      nextQuestion = "Excellent. I have compiled all critical specifications for your space. We are ready to construct your custom room render and recommended catalog!\n\nClick **Generate Proposal** below to synthesize your Design Board.";
      suggestions = ["Generate Proposal", "Reset configuration"];
    }

    return res.status(200).json({
      success: true,
      message: {
        role: 'assistant',
        content: nextQuestion
      },
      state,
      suggestions,
      createdAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in agentic chat:', error);
    res.status(500).json({ error: { message: error.message || 'Error processing consultation session.' } });
  }
});

export default router;
export type DesignBoardType = DesignBoard;
