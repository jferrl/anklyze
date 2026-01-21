import { useState, useCallback } from 'react';
import type { FractureInput, ClassificationResult, ChatResponse, Clarification } from '../types/fracture';
import { sendChatMessage, classifyFracture } from '../services/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  extractedInput?: FractureInput;
  classification?: ClassificationResult;
  confidence?: number;
  clarifications?: Clarification[];
  timestamp: Date;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedInput, setExtractedInput] = useState<FractureInput | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [clarifications, setClarifications] = useState<Clarification[] | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response: ChatResponse = await sendChatMessage(text);

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        extractedInput: response.extracted_input,
        classification: response.classification,
        confidence: response.confidence,
        clarifications: response.clarifications,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Update state based on response
      if (response.extracted_input) {
        setExtractedInput(response.extracted_input);
      }
      if (response.classification) {
        setClassification(response.classification);
        setClarifications(null); // Clear clarifications when we have a classification
      }
      // Update clarifications state
      if (response.clarifications && response.clarifications.length > 0) {
        setClarifications(response.clarifications);
      } else {
        setClarifications(null);
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);

      // Add error message
      const errorAssistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorAssistantMessage]);

      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmAndClassify = useCallback(async (input: FractureInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await classifyFracture(input);
      setClassification(result);

      // Add confirmation message
      const confirmMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Classification confirmed.',
        classification: result,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Classification error';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const editExtractedInput = useCallback((field: keyof FractureInput, value: unknown) => {
    setExtractedInput(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  }, []);

  const answerClarification = useCallback(async (field: string, answer: string) => {
    // Build a message that includes the answer to the clarification
    // This helps the LLM understand the context and continue the classification
    const answerMessage = `For ${field}: ${answer}`;

    // Clear the current clarification since we're answering it
    setClarifications(null);

    // Send the answer as a new message to continue the conversation
    await sendMessage(answerMessage);
  }, [sendMessage]);

  const reset = useCallback(() => {
    setMessages([]);
    setExtractedInput(null);
    setClassification(null);
    setClarifications(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    extractedInput,
    classification,
    clarifications,
    sendMessage,
    confirmAndClassify,
    editExtractedInput,
    answerClarification,
    reset,
  };
}
