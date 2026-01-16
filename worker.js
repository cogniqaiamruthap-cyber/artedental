// Universal Cloudflare Worker for Multiple Business Chatbots
// Supports unlimited businesses with Gemini Models
// Model: gemini-1.5-flash (default)

export default {
    async fetch(request, env) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // Only allow POST requests for chat
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }

        try {
            // Get the API key from environment variables
            const GEMINI_API_KEY = env.GEMINI_API_KEY;

            if (!GEMINI_API_KEY) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'API key not configured'
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            // Parse the incoming request
            const body = await request.json();
            let userMessage = body.message || body.prompt || '';
            // Support passing systemPrompt directly from client for generic usage
            const clientSystemPrompt = body.systemPrompt || body.systemInstruction;

            const businessId = body.business || body.businessId || 'dental';
            const model = 'gemma-3-4b-it'; // Updated to exact Gemma 3 4B model

            const history = body.history || [];

            // Extract only the actual customer message (remove system prompt if present)
            if (userMessage.includes('Customer:')) {
                const parts = userMessage.split('Customer:');
                userMessage = parts[parts.length - 1].trim();
            }

            // Version Check for debugging deployment
            if (userMessage.toUpperCase() === 'VERSION_CHECK') {
                return new Response(JSON.stringify({
                    success: true,
                    reply: "VERIFIED: You are running the LATEST Arte Dental Worker (Gemma-3-4B Version).",
                    text: "VERIFIED: You are running the LATEST Arte Dental Worker (Gemma-3-4B Version)."
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            if (!userMessage) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'No message provided'
                }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            // Fallback Business configurations
            const businessConfigs = {
                'dental': {
                    name: "Arte Dental",
                    systemPrompt: `You are the Professional Senior Medical Receptionist for Arte Dental.
Website: www.artedental.co.uk
Location: 85 Bishop Street, Birmingham, B5 6EE, United Kingdom (In Digbeth area, heart of Birmingham city centre; near Bull Ring shopping centre and New Street Station).

SERVICES OFFERED:
- Premier Cosmetic Dentistry: Bespoke luxury treatments including composite bonding (precision-sculpted resin), professional teeth whitening (safe, fast results), smile makeovers, and advanced transformations.
- General Dentistry: High-standard routine care in a patient-focused, luxury environment.
- Speciality: Precision engineering, innovative techniques, and natural-looking results.

BOOKING & FLOW:
- Methods: Phone (+44 7398 243653), email (hello@artedental.co.uk), website contact form, or walk-ins.
- Process: Starts with a personalized consultation to assess needs and create custom plans.
- Note: High-value cosmetic procedures (e.g., full smile redesigns) involve phased scheduling with follow-ups.

KEY ATTRIBUTES:
- Status: Newly opened private practice (Launched August 2025).
- Management: Run by Arte Smiles UK Ltd.
- Team: Award-winning team blending science and art for exceptional experiences.
- Quality: CQC Registered; 5.0/5 rating (83 Google reviews).
- Facility: State-of-the-art facility designed for luxury and comfort.

OPENING HOURS:
- Mon - Thu: 9:00 AM – 6:30 PM
- Fri: 8:30 AM – 5:30 PM
- Sat: 9:00 AM – 2:00 PM
- Sun: Closed

CONTACT INFORMATION:
- Email: hello@artedental.co.uk
- Phone: +44 7398 243653
- Instagram: @artedentaluk
- Facebook: https://www.facebook.com/p/Arte-Dental-61579272582519/

STRICT RESPONSE GUIDELINES:
1. PERSONALITY: Automated Business Assistant for Arte Dental. Professional, clinical, and welcoming.
2. DIRECTNESS: Provide clear summaries of services and location immediately if asked.
3. DOMAIN: ONLY answer questions related to Arte Dental and dentistry.
4. GUARDRAILS: Decline unrelated topics politely.
5. FORMAT: Concise (2-4 sentences). NO asterisks (*). NO emojis.`
                },
                'default': {
                    name: 'Arte Dental Support',
                    systemPrompt: `You are a professional business assistant for Arte Dental in Birmingham. Only answer questions related to the clinic using the provided information. Do not use emojis or asterisks.`
                }
            };

            // Determine the final system prompt:
            let finalSystemPrompt = clientSystemPrompt;
            let businessName = 'Assistant';

            if (!finalSystemPrompt) {
                const config = businessConfigs[businessId] || businessConfigs['default'];
                finalSystemPrompt = config.systemPrompt;
                businessName = config.name;
            }

            // Build conversation contents with ultra-prominent instructions for smaller models
            const contents = [];

            // LAYER 1: Core Persona Injection
            contents.push({
                role: "user",
                parts: [{ text: `CONTEXT & IDENTITY: ${finalSystemPrompt}\n\nIMPORTANT: You must ONLY use the information above. Never use placeholders like [Insert location]. You are based in Birmingham.` }]
            });
            contents.push({
                role: "model",
                parts: [{ text: `Understood. I am the Arte Dental Assistant in Birmingham. I will only use the provided details.` }]
            });

            // Add history
            if (history && history.length > 0) {
                history.slice(-6).forEach(msg => {
                    contents.push({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.text }]
                    });
                });
            }

            // Current message - wrapped in rigid context
            contents.push({
                role: "user",
                parts: [{ text: `User Question: ${userMessage}\n\n(Reminder: Use the Birmingham clinic details provided.)` }]
            });

            // Construct the API request
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

            const apiRequest = {
                contents: contents, // Gemma doesn't always support the official system_instruction field at this endpoint
                generationConfig: {
                    temperature: 0.1,
                    topK: 1,
                    topP: 1,
                    maxOutputTokens: 256,
                }
            };

            // Call the Google AI Studio API
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiRequest),
            });

            const apiData = await apiResponse.json();

            // Handle rate limiting with retry suggestion
            if (apiData?.error?.code === 429) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Rate limit exceeded. Please try again in a moment.',
                    retry: true
                }), {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            // Handle overload errors
            if (apiData?.error?.code === 503) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Service temporarily overloaded. Please retry.',
                    retry: true
                }), {
                    status: 503,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            // Handle overload errors
            if (!GEMINI_API_KEY) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'GEMINI_API_KEY is missing in Cloudflare Environment Variables. Please set it in the Settings tab of your worker.'
                }), {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            // Check for other errors
            if (!apiResponse.ok) {
                console.error('API Error:', apiData);
                const errorDetail = apiData.error?.message || 'Unknown API Error';
                return new Response(JSON.stringify({
                    success: false,
                    error: `Google AI Error: ${errorDetail}`,
                    details: apiData
                }), {
                    status: apiResponse.status,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                });
            }

            // Extract the response text
            let responseText = apiData.candidates?.[0]?.content?.parts?.[0]?.text ||
                'I apologize, but I\'m having trouble generating a response. Please contact us for assistance.';

            // Clean response: remove asterisks and emojis
            responseText = responseText.replace(/\*/g, '');
            // Simple emoji removal regex (matches most common emojis/symbols)
            responseText = responseText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
            responseText = responseText.trim();

            // Return the response in multiple formats for compatibility
            return new Response(JSON.stringify({
                success: true,
                reply: responseText,
                response: responseText,
                message: responseText,
                text: responseText,
                model: model,
                business: businessName
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
            });

        } catch (error) {
            console.error('Worker Error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
            });
        }
    },
};
