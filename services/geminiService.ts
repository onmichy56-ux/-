
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Strictly follow the mandatory initialization pattern using process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
你是一名资深的政府部门政策业务与营商环境领域咨询专家。
你的职责是协助用户分析复杂的政策文件，提供深度的行业洞察，并验证互联网上的实时信息。
在回答时，请保持专业、客观、严谨。
用户可能会同时提供多份参考材料，请你在分析时综合考虑各文件之间的关联、差异或冲突。
如果用户要求“逐页逐行”分析，请重点关注文本的细节、法律依据、潜在风险及对企业的影响。
当使用互联网搜索功能时，必须引用可靠的官方数据、新闻或研究报告。
`;

export const analyzeDocument = async (
  documents: { name: string; content: string; type?: string }[],
  userQuery: string,
  useSearch: boolean = false
): Promise<{ text: string; sources?: { title: string; uri: string }[] }> => {
  const modelName = 'gemini-3.1-pro-preview';
  
  const parts: any[] = [];
  let formattedDocsText = '';
  
  for (const doc of documents) {
    if (doc.type === 'application/pdf') {
      // Extract base64 from data URL
      const base64Data = doc.content.split(',')[1];
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data
          }
        });
        formattedDocsText += `文件名: ${doc.name} (PDF附件已提供)\n---\n\n`;
      }
    } else {
      formattedDocsText += `文件名: ${doc.name}\n内容:\n${doc.content}\n---\n\n`;
    }
  }
  
  const promptText = `
  以下是提供给你的多份参考政策材料：
  ${formattedDocsText}
  
  用户当前咨询问题：
  ${userQuery}
  
  请基于上述所有选中的材料（包括附件中的PDF）进行综合分析。如果问题涉及特定文件，请在回答中指明。
  `;
  
  parts.push({ text: promptText });

  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.7,
  };

  if (useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  // Simplified content to a direct string for text-only requests
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config,
  });

  const text = response.text || "未能生成分析结果，请重试。";
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const sources = groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || '参考来源',
    uri: chunk.web?.uri || ''
  })).filter((s: any) => s.uri !== '') || [];

  return { text, sources };
};

export const generateReport = async (
  analysisSummary: string,
  requirements: string,
  documents: { name: string; content: string; type?: string }[] = []
): Promise<string> => {
  const modelName = 'gemini-3.1-pro-preview';
  
  const parts: any[] = [];
  let formattedDocsText = '';
  
  for (const doc of documents) {
    if (doc.type === 'application/pdf') {
      const base64Data = doc.content.split(',')[1];
      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data
          }
        });
        formattedDocsText += `文件名: ${doc.name} (PDF附件已提供)\n---\n\n`;
      }
    } else {
      formattedDocsText += `文件名: ${doc.name}\n内容:\n${doc.content}\n---\n\n`;
    }
  }

  const promptText = `
  基于以下分析概要、提供的原始材料以及用户的特定要求，生成一份正式的咨询分析报告：
  
  提供的原始材料：
  ${formattedDocsText}

  分析概要：
  ${analysisSummary}
  
  报告要求（请严格按照以下要求生成报告内容和结构）：
  ${requirements}
  
  格式：使用标准 Markdown。
  `;
  
  parts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.4,
    },
  });

  return response.text || "报告生成失败。";
};
