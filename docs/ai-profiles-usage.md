# AI Profiles Usage Guide

## Overview

AI Profiles allow you to automatically or manually execute AI prompts on your notes using OpenAI or Anthropic Claude.

## Setup

1. **Add API Keys**
   - Go to Settings > AI Configuration
   - Add your OpenAI API key (starts with `sk-`)
   - Or add your Anthropic API key (starts with `sk-ant-`)
   - Keys are encrypted and stored securely

2. **Create AI Profile**
   - Go to Settings > AI Profiles
   - Click "Create New Profile"
   - Fill in:
     - Name: Descriptive name (e.g., "YouTube Summarizer")
     - Tag: Which tag triggers this profile (e.g., #youtube)
     - AI Provider: OpenAI or Claude
     - Model: Select model (GPT-4, Claude 3.5, etc.)
     - System Prompt: AI behavior (e.g., "You are a helpful summarizer")
     - User Prompt: What to do with note (e.g., "Summarize: {note_content}")
     - Trigger Mode: Manual (click button)
     - Output: Append or create new note

## Usage

1. **Create or open a note**
2. **Add content** you want AI to process
3. **Add the tag** associated with your AI profile (e.g., #youtube)
4. **Click "▶ Run: [Profile Name]"** button
5. **Wait** for AI to process (loading indicator shows)
6. **Result** appears based on output behavior:
   - Append: AI response added to note
   - New Note: New note created with AI response

## Prompt Variables

Use these variables in your prompts:
- `{note_title}` - Replaced with note title
- `{note_content}` - Replaced with note content
- `{tags}` - Replaced with comma-separated tags

Example:
```
Summarize this YouTube transcript:

Title: {note_title}
Content: {note_content}
```

## Token Costs

Each execution logs tokens used:
- Check Settings > AI Profiles > View Executions
- OpenAI: ~$0.03 per 1K tokens (GPT-4)
- Anthropic: ~$0.015 per 1K tokens (Claude 3.5)

## Troubleshooting

- **"Invalid API key"**: Check your API key in settings
- **"Rate limit exceeded"**: Wait and try again
- **"Content too large"**: Reduce note size or use cheaper model
- **Button not showing**: Verify tag matches profile and profile is active
