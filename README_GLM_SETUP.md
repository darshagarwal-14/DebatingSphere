# GLM-4.5B Setup Guide

## Overview
The AI Debate Partner app has been updated to use GLM-4.5B model via Zhipu AI API instead of OpenAI models. This provides cost-effective and high-quality debate responses with authentic parliamentary style.

## Setup Instructions

### 1. Get Zhipu AI API Key
1. Visit [Zhipu AI Platform](https://open.bigmodel.cn/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key

### 2. Environment Configuration
Create a `.env` file in the root directory with:

```env
ZHIPU_API_KEY=your_zhipu_api_key_here
```

### 3. Install Dependencies
```bash
cd backend
npm install
```

### 4. Run the Application
```bash
npm run dev
```

## Model Details

- **Model**: GLM-4V-Plus (GLM-4.6B)
- **Provider**: Zhipu AI (智谱AI)
- **API Endpoint**: https://open.bigmodel.cn/api/paas/v4/chat/completions
- **Temperature**: 0.6 (balanced creativity and coherence)
- **Max Tokens**: 500 (sufficient for detailed debate responses)

## Features Maintained

- ✅ Authentic parliamentary debate style
- ✅ JSON response format with points and rebuttals
- ✅ Mock fallback when API key is missing
- ✅ Error handling and quota management
- ✅ All existing debate functionality

## Cost Comparison

- **GLM-4.5B via Zhipu**: ~$0.001-0.002 per 1K tokens
- **OpenAI GPT-4**: ~$0.03 per 1K tokens
- **Savings**: ~93-97% cost reduction

## Troubleshooting

### API Errors
- Verify your ZHIPU_API_KEY is correct
- Check your account balance on Zhipu platform
- Ensure stable internet connection

### Mock Responses
If you see "Mock GLM-4.5B response", it means:
- No API key is configured
- API quota exceeded
- API service temporarily unavailable

The app will continue to function with mock responses for testing.

## Alternative Setup (Local GLM)

For complete privacy and no API costs, you can set up local GLM-4.5B inference using Hugging Face transformers, but this requires:
- 16GB+ RAM
- Python environment
- Model download (~20GB)
- Significantly slower response times

Contact the development team for local setup instructions if needed.
