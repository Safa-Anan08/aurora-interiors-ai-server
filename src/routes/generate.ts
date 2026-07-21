import { Router, Request, Response } from 'express';

const router = Router();

// Beautiful curated style presets for the mock AI mode
const PRESETS: Record<string, string[]> = {
  scandinavian: [
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80'
  ],
  industrial: [
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
  ],
  bohemian: [
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=1200&q=80'
  ],
  japandi: [
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1617806118233-18e1db207f62?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&w=1200&q=80'
  ],
  minimalist: [
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80'
  ]
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80'
];

router.post('/', async (req: Request, res: Response) => {
  try {
    const { image, style, roomType, customPrompt } = req.body;

    if (!style || !roomType) {
      return res.status(400).json({ error: { message: 'Style and Room Type are required.' } });
    }

    const isMock = process.env.MOCK_AI !== 'false';
    const styleKey = style.toLowerCase();
    
    // Detailed prompt structure
    const promptUsed = `A premium ${style} style design for a ${roomType}. ${customPrompt || 'Warm lighting, realistic materials, detailed interior visualization.'}`;

    // If using real Replicate API
    if (!isMock && process.env.REPLICATE_API_TOKEN) {
      try {
        const Replicate = require('replicate');
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
        
        const output = await replicate.run(
          "stability-ai/sdxl:39ed7e9d4c109033d9f50ade096472f18d368e7307fafe79b4a45a3550fe2cb4",
          { input: { prompt: promptUsed } }
        );

        if (!output || output.length === 0) {
          throw new Error('No image was generated from the AI provider.');
        }

        return res.status(200).json({
          success: true,
          imageUrl: output[0],
          promptUsed,
          style,
          roomType,
          createdAt: new Date().toISOString()
        });
      } catch (apiError: any) {
        console.error('Replicate API Error:', apiError);
        return res.status(500).json({
          error: { message: 'AI generation failed: ' + (apiError.message || 'Unknown API error') }
        });
      }
    }

    // Mock API path: Simulate a delay (e.g. 2.5 seconds) to mimic AI processing
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Choose preset image
    const imagesForStyle = PRESETS[styleKey] || DEFAULT_IMAGES;
    const randomIndex = Math.floor(Math.random() * imagesForStyle.length);
    const selectedImage = imagesForStyle[randomIndex];

    return res.status(200).json({
      success: true,
      imageUrl: selectedImage,
      promptUsed,
      style,
      roomType,
      createdAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error generating design:', error);
    return res.status(500).json({
      error: { message: error.message || 'Error occurred during generation.' }
    });
  }
});

export default router;
