import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { FractureInput, ClassificationResult, ChatResponse, Clarification, FeedbackRating } from '../types/fracture';
import {
  sendChatMessage,
  classifyFracture,
  createChatSession,
  completeChatSession,
  abandonChatSession,
  submitFeedback as submitFeedbackAPI,
  RateLimitError,
  SessionLimitError,
  DailyQuotaError,
  InputValidationError,
} from '../services/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string; // User-friendly content for display (optional)
  extractedInput?: FractureInput;
  classification?: ClassificationResult;
  confidence?: number;
  clarifications?: Clarification[];
  timestamp: Date;
}

export function useChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedInput, setExtractedInput] = useState<FractureInput | null>(null);
  const [classification, setClassification] = useState<ClassificationResult | null>(null);
  const [clarifications, setClarifications] = useState<Clarification[] | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Use ref for session ID to avoid React state timing issues
  // State updates are batched, so sessionId state won't be available immediately after setSessionId
  const sessionIdRef = useRef<string | null>(null);
  const sessionCreatedRef = useRef(false);

  // Create session on first message (lazy initialization)
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    if (sessionCreatedRef.current) return null; // Already trying to create

    sessionCreatedRef.current = true;
    try {
      const response = await createChatSession();
      sessionIdRef.current = response.session_id;
      return response.session_id;
    } catch (err) {
      console.error('Failed to create chat session:', err);
      sessionCreatedRef.current = false;
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (text: string, displayContent?: string) => {
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    // Ensure session exists
    await ensureSession();

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      displayContent, // User-friendly display content (optional)
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response: ChatResponse = await sendChatMessage(text, sessionIdRef.current || undefined);

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

        // Mark session as complete when we have a classification
        if (sessionIdRef.current) {
          completeChatSession(sessionIdRef.current).catch(console.error);
        }
      }
      // Update clarifications state
      if (response.clarifications && response.clarifications.length > 0) {
        setClarifications(response.clarifications);
      } else {
        setClarifications(null);
      }

      return response;
    } catch (err) {
      let errorMessage: string;
      if (err instanceof RateLimitError) {
        errorMessage = t('chat.errors.rateLimit');
      } else if (err instanceof SessionLimitError) {
        errorMessage = t('chat.errors.sessionLimit');
      } else if (err instanceof DailyQuotaError) {
        errorMessage = t('chat.errors.dailyQuota');
      } else if (err instanceof InputValidationError) {
        // Use the server-provided message which is already localized
        errorMessage = err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = t('chat.errors.generic');
      }
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
  }, [ensureSession, t]);

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
    // Build a technical message that includes the field context for the LLM
    // This helps the LLM understand which field the answer relates to
    const technicalMessage = `For ${field}: ${answer}`;

    // Clear the current clarification since we're answering it
    setClarifications(null);

    // Send the answer as a new message to continue the conversation
    // Display the user-friendly answer, but send the technical message to the API
    await sendMessage(technicalMessage, answer);
  }, [sendMessage]);

  const submitFeedback = useCallback(async (rating: FeedbackRating, comment?: string) => {
    if (!sessionIdRef.current || feedbackSubmitted) return;

    try {
      await submitFeedbackAPI(sessionIdRef.current, { rating, comment });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      throw err;
    }
  }, [feedbackSubmitted]);

  const reset = useCallback(() => {
    // Abandon session if it exists and classification wasn't completed
    if (sessionIdRef.current && !classification) {
      abandonChatSession(sessionIdRef.current).catch(console.error);
    }

    setMessages([]);
    setExtractedInput(null);
    setClassification(null);
    setClarifications(null);
    setError(null);
    sessionIdRef.current = null;
    setFeedbackSubmitted(false);
    sessionCreatedRef.current = false;
  }, [classification]);

  return {
    messages,
    isLoading,
    error,
    extractedInput,
    classification,
    clarifications,
    feedbackSubmitted,
    sendMessage,
    confirmAndClassify,
    editExtractedInput,
    answerClarification,
    submitFeedback,
    reset,
  };
}
