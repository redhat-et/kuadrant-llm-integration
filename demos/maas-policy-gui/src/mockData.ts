import { Team, Model, Policy, Request } from './types';

export const TEAMS: Team[] = [
  { id: 'engineering', name: 'Engineering', color: '#1976d2' },
  { id: 'product', name: 'Product', color: '#388e3c' },
  { id: 'marketing', name: 'Marketing', color: '#f57c00' },
  { id: 'cto', name: 'CTO', color: '#7b1fa2' },
];

export const MODELS: Model[] = [
  { 
    id: 'deepseek-r1-distill-qwen-14b-w4a16', 
    name: 'DeepSeek-R1-Distill-Qwen-14B-W4A16', 
    provider: 'DeepSeek',
    description: 'A 14B parameter language model distilled from DeepSeek-R1 using reasoning data. Fine-tuned from Qwen2.5-14B with 800k curated samples, achieving strong performance on reasoning tasks while maintaining efficiency through knowledge distillation and quantization.'
  },
  { 
    id: 'docling-serve', 
    name: 'Docling Serve', 
    provider: 'IBM',
    description: 'A document conversion service powered by multimodal AI models for extracting text and structure from PDFs and images. Features OCR, layout detection, table structure extraction, formula recognition, and code block processing. Converts to Markdown, JSON, HTML formats with preserved document structure.'
  },
  { 
    id: 'granite-3.3-8b-instruct', 
    name: 'Granite-3.3-8B-Instruct', 
    provider: 'IBM',
    description: 'An 8B parameter model fine-tuned for improved reasoning and instruction-following. Features structured reasoning with <think></think> tags, supports 12+ languages, and delivers significant gains on AlpacaEval-2.0, Arena-Hard, and mathematical/coding benchmarks.'
  },
  { 
    id: 'granite-8b-lab-v1', 
    name: 'Granite-8b-lab-v1', 
    provider: 'IBM',
    description: 'An experimental 8B parameter language model from IBM\'s Granite lab series, designed for research and development in enterprise AI applications. Built on IBM\'s Granite architecture with focus on instruction-following and reasoning capabilities for business use cases.'
  },
  { 
    id: 'granite-vision-3.2-2b', 
    name: 'Granite-Vision-3.2-2b', 
    provider: 'IBM',
    description: 'Granite-Vision-3.2-2b is a compact and efficient vision-language model, specifically designed for visual document understanding, enabling automated content extraction from tables, charts, infographics, plots, diagrams, and more. The model was trained in a meticulously curated instruction-following dataset comprising diverse public datasets and synthetic datasets tailored to support a wide range of document understanding and general image tasks. It was trained by fine-tuning a Granite large language model with both image and text modalities.'
  },
  { 
    id: 'granite-guardian-3.1-2b', 
    name: 'Granite Guardian 3.1 2B', 
    provider: 'IBM',
    description: 'A 2B parameter safety model fine-tuned for risk detection in prompts and responses. Detects harm, bias, jailbreaking, violence, and profanity. Trained on human annotations and red-team data, achieving 0.90 recall on jailbreak detection and outperforming other open-source safety models.'
  },
  { 
    id: 'llama-3.2-3b', 
    name: 'Llama-3.2-3B', 
    provider: 'Meta',
    description: 'A compact 3B parameter multilingual language model from Meta\'s Llama 3.2 series, pretrained on 9T tokens. Optimized for multilingual dialogue, agentic retrieval, and summarization. Uses knowledge distillation from larger Llama models and designed for constrained environments like mobile devices.'
  },
  { 
    id: 'llama-4-scout-17b-16f-w4a16', 
    name: 'Llama-4-Scout-17B-16F-W4A16', 
    provider: 'Meta',
    description: 'A 17B parameter mixture-of-experts (MoE) model with 16 experts from Meta\'s Llama 4 series, pretrained on 40 trillion multimodal tokens. Features native multimodality with early fusion, supports 12+ languages, and fits on single H100 GPU with quantization. Trained through August 2024.'
  },
  { 
    id: 'mistral-small-24b-w8a8', 
    name: 'Mistral-Small-24B-W8A8', 
    provider: 'Mistral AI',
    description: 'A 24B parameter knowledge-dense language model from Mistral, achieving state-of-the-art capabilities comparable to larger models. Supports dozens of languages, 128k context window, native function calling, and JSON output. Quantized with W8A8 for efficient deployment on single RTX 4090 or 32GB MacBook.'
  },
  { 
    id: 'nomic-embed-text-v1.5', 
    name: 'Nomic-Embed-Text-v1.5', 
    provider: 'Nomic AI',
    description: 'A multimodal text embedding model, supporting task instruction prefixes for search, classification, and clustering. Features Matryoshka representation learning for flexible dimensions and aligns with nomic-embed-vision-v1.5 for multimodal embeddings in the same space.'
  },
  { 
    id: 'phi-4', 
    name: 'Phi-4', 
    provider: 'Microsoft',
    description: 'A 14B parameter dense decoder-only transformer model from Microsoft, excelling at reasoning tasks and outperforming larger 70B models on math olympiad problems. Features robust safety post-training, multimodal capabilities, and supports sequences up to 64K tokens. Optimized for educational applications and edge deployment.'
  },
  { 
    id: 'qwen2.5-vl-7b-instruct', 
    name: 'Qwen2.5-VL-7B-Instruct', 
    provider: 'Alibaba',
    description: 'A 7B parameter vision-language model from Alibaba\'s Qwen2.5 series with advanced visual understanding capabilities. Excels at analyzing texts, charts, graphics, and layouts in images, supports video understanding over 1 hour, and enables agentic computer/phone use. Features dynamic resolution and structured output generation.'
  },
  { 
    id: 'stable-diffusion-safety-checker', 
    name: 'Stable Diffusion Safety Checker', 
    provider: 'Stability AI',
    description: 'A safety screening model designed to identify NSFW content in images generated by Stable Diffusion models. Screens outputs against hardcoded not-safe-for-work patterns, helping ensure appropriate content generation in AI applications.'
  },
  { 
    id: 'stablediffusion-xl', 
    name: 'StableDiffusion-XL', 
    provider: 'Stability AI',
    description: 'An advanced text-to-image generation model featuring a 3x larger UNet and dual text encoders (CLIP ViT-L/14 + OpenCLIP ViT-bigG/14). Supports ensemble pipeline with base and refiner models for photorealistic image synthesis, plus SDXL-Turbo variant for single-step real-time generation.'
  },
  { 
    id: 'tinyllama-on-cpu', 
    name: 'TinyLlama on CPU', 
    provider: 'TinyLlama',
    description: 'A compact 1.1B parameter chat model using the same architecture and tokenizer as Llama 2. Trained on UltraChat and UltraFeedback datasets with DPO alignment. Designed for applications with restricted computation and memory footprint, plug-and-play compatible with Llama-based projects.'
  },
];

export const INITIAL_POLICIES: Policy[] = [
  {
    id: 'policy-1',
    name: 'Engineering Access Policy',
    description: 'Allow engineering team access to all models during business hours',
    items: [
      {
        id: 'item-1',
        type: 'team',
        value: 'engineering',
        isApprove: true,
      },
    ],
    requestLimits: {
      tokenLimit: 200000,
      timePeriod: 'hour',
    },
    timeRange: {
      startTime: '09:00',
      endTime: '17:00',
      unlimited: false,
    },
    created: '2024-01-15T10:00:00Z',
    modified: '2024-01-15T10:00:00Z',
  },
  {
    id: 'policy-2',
    name: 'Premium Model Restriction',
    description: 'Restrict access to expensive models for non-CTO teams',
    items: [
      {
        id: 'item-2',
        type: 'model',
        value: 'gpt-4',
        isApprove: false,
      },
      {
        id: 'item-3',
        type: 'model',
        value: 'claude-3-opus',
        isApprove: false,
      },
      {
        id: 'item-4',
        type: 'team',
        value: 'cto',
        isApprove: true,
      },
    ],
    requestLimits: {
      tokenLimit: null,
      timePeriod: 'hour',
    },
    timeRange: {
      startTime: '00:00',
      endTime: '23:59',
      unlimited: true,
    },
    created: '2024-01-16T14:30:00Z',
    modified: '2024-01-16T14:30:00Z',
  },
  {
    id: 'policy-3',
    name: 'Marketing Limited Access',
    description: 'Marketing team can only use basic models with rate limits',
    items: [
      {
        id: 'item-5',
        type: 'team',
        value: 'marketing',
        isApprove: true,
      },
      {
        id: 'item-6',
        type: 'model',
        value: 'gpt-3.5-turbo',
        isApprove: true,
      },
      {
        id: 'item-7',
        type: 'model',
        value: 'mistral-medium',
        isApprove: true,
      },
    ],
    requestLimits: {
      tokenLimit: 20000,
      timePeriod: 'day',
    },
    timeRange: {
      startTime: '08:00',
      endTime: '18:00',
      unlimited: false,
    },
    created: '2024-01-17T09:15:00Z',
    modified: '2024-01-17T09:15:00Z',
  },
];

// Function to generate random requests for the live metrics dashboard
export const generateRandomRequest = (): Request => {
  const teams = TEAMS.map(t => t.id);
  const models = MODELS.map(m => m.id);
  const decisions: ('accept' | 'reject')[] = ['accept', 'reject'];
  
  const randomTeam = teams[Math.floor(Math.random() * teams.length)];
  const randomModel = models[Math.floor(Math.random() * models.length)];
  const randomDecision = decisions[Math.floor(Math.random() * decisions.length)];
  
  return {
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    team: randomTeam,
    model: randomModel,
    timestamp: new Date().toISOString(),
    decision: randomDecision,
    queryText: `Sample query for ${randomModel}`,
    tokens: Math.floor(Math.random() * 1000) + 50,
  };
};