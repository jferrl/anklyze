import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Send,
  Loader2,
  Check,
  Bot,
  User,
  Sparkles,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  ArrowDown,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { useChat, type ChatMessage } from '../hooks/useChat';
import { ClassificationResult as ClassificationResultComponent } from './ClassificationResult';
import { ChatFeedback } from './ChatFeedback';
import type { FractureInput, ClassificationResult, Clarification } from '@/types';

interface ChatPanelProps {
  onClassificationComplete?: (result: ClassificationResult, input: FractureInput) => void;
}

// Minimum characters required for a message
const MIN_INPUT_LENGTH = 10;
// Debounce delay in milliseconds
const DEBOUNCE_DELAY_MS = 1000;

export function ChatPanel({ onClassificationComplete }: ChatPanelProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSubmitTimeRef = useRef<number>(0);

  const {
    messages,
    isLoading,
    extractedInput,
    classification,
    clarifications,
    feedbackSubmitted,
    sendMessage,
    confirmAndClassify,
    answerClarification,
    submitFeedback,
  } = useChat();

  // Check if input meets minimum length requirement
  const inputTooShort = inputValue.trim().length > 0 && inputValue.trim().length < MIN_INPUT_LENGTH;
  const canSubmit = inputValue.trim().length >= MIN_INPUT_LENGTH && !isLoading && !isDebouncing;
  const charCount = inputValue.trim().length;

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle scroll to show/hide scroll button
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setShowScrollButton(!isNearBottom && messages.length > 0);
  }, [messages.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Check debounce timing
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTimeRef.current;
    if (timeSinceLastSubmit < DEBOUNCE_DELAY_MS) {
      setIsDebouncing(true);
      setTimeout(() => setIsDebouncing(false), DEBOUNCE_DELAY_MS - timeSinceLastSubmit);
      return;
    }

    lastSubmitTimeRef.current = now;
    const text = inputValue;
    setInputValue('');
    await sendMessage(text);
  }, [canSubmit, inputValue, sendMessage]);

  const handleConfirm = async () => {
    if (!extractedInput) return;
    const result = await confirmAndClassify(extractedInput);
    if (result && onClassificationComplete) {
      onClassificationComplete(result, extractedInput);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const exampleDescriptions = [
    t('chat.examples.ex1'),
    t('chat.examples.ex2'),
    t('chat.examples.ex3'),
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] w-full max-w-full mx-auto relative">
      {/* Messages Area */}
      <ScrollArea
        className="flex-1 relative"
        ref={scrollAreaRef}
        onScroll={handleScroll}
      >
        <div className="p-2 sm:p-4 space-y-4 min-h-full">
          {messages.length === 0 ? (
            <WelcomeScreen
              examples={exampleDescriptions}
              onSelectExample={setInputValue}
            />
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isFirst={index === 0}
                  isLast={index === messages.length - 1}
                />
              ))}
            </>
          )}

          {isLoading && <TypingIndicator />}

          {/* Clarification Questions */}
          {clarifications && clarifications.length > 0 && !classification && (
            <ClarificationCard
              clarifications={clarifications}
              onAnswer={answerClarification}
              isLoading={isLoading}
            />
          )}

          {/* Extracted Parameters */}
          {extractedInput && !classification && (!clarifications || clarifications.length === 0) && (
            <ExtractedParamsCard
              input={extractedInput}
              confidence={messages[messages.length - 1]?.confidence}
              onConfirm={handleConfirm}
              isLoading={isLoading}
            />
          )}

          {/* Classification Result */}
          {classification && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full overflow-hidden">
              <div className="w-full max-w-full">
                <ClassificationResultComponent result={classification} />
              </div>
              <ChatFeedback onSubmit={submitFeedback} submitted={feedbackSubmitted} />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute bottom-24 right-6 rounded-full shadow-lg glow-sm z-10 animate-in fade-in zoom-in duration-200"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}

      {/* Input Area */}
      <div className="border-t glass p-4">
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.inputPlaceholder')}
              className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[52px] max-h-[150px] shadow-sm transition-shadow focus:shadow-md"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!canSubmit}
              size="icon"
              className="h-[52px] w-[52px] rounded-2xl shadow-sm hover-glow flex-shrink-0"
            >
              {isLoading || isDebouncing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Input hints and character count */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {inputTooShort ? (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400">
                    {t('chat.validation.minLength', { min: MIN_INPUT_LENGTH, current: charCount })}
                  </span>
                </>
              ) : isDebouncing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t('chat.validation.pleaseWait')}</span>
                </>
              ) : (
                <span className="text-muted-foreground/60">
                  {t('chat.inputHint', 'Press Enter to send, Shift+Enter for new line')}
                </span>
              )}
            </div>
            {inputValue.length > 0 && (
              <span className={`text-xs ${charCount < MIN_INPUT_LENGTH ? 'text-amber-500' : 'text-muted-foreground/60'}`}>
                {charCount}/{MIN_INPUT_LENGTH}+
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function WelcomeScreen({
  examples,
  onSelectExample
}: {
  examples: string[];
  onSelectExample: (example: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Animated Icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center glass-card animate-pulse-glow">
          <MessageSquare className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg animate-float">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
        {t('chat.placeholder')}
      </h3>

      <p className="text-sm text-muted-foreground mb-8 text-center max-w-md leading-relaxed">
        {t('chat.examples.title')}
      </p>

      {/* Example Cards with stagger animation */}
      <div className="w-full max-w-lg space-y-3">
        {examples.map((example, i) => (
          <button
            key={example}
            onClick={() => onSelectExample(example)}
            className="w-full text-left p-4 rounded-xl glass-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group card-hover"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300 group-hover:glow-sm">
                <span className="text-sm font-semibold text-primary">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                  "{example}"
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  const { t } = useTranslation();

  return (
    <div className="flex items-start gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 glass-card">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-primary/70 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" />
          </div>
          <span className="text-sm text-muted-foreground">{t('chat.thinking')}</span>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isFirst?: boolean;
  isLast?: boolean;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const displayText = message.displayContent || message.content;

  return (
    <div
      className={`flex items-start gap-3 animate-in fade-in duration-300 ${
        isUser ? 'flex-row-reverse slide-in-from-right-4' : 'slide-in-from-left-4'
      }`}
    >
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground glow-sm'
          : 'bg-gradient-to-br from-primary/20 to-primary/5 glass-card'
      }`}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div
          className={`px-4 py-3 shadow-sm ${
            isUser
              ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-tr-sm'
              : 'glass-card rounded-2xl rounded-tl-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{displayText}</p>
        </div>
        {message.confidence !== undefined && message.confidence > 0 && (
          <div className="flex items-center gap-2 ml-1">
            <Badge
              variant={message.confidence >= 0.7 ? 'default' : 'secondary'}
              className="text-xs px-2 py-0.5"
            >
              {Math.round(message.confidence * 100)}% confidence
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

interface ExtractedParamsCardProps {
  input: FractureInput;
  confidence?: number;
  onConfirm: () => void;
  isLoading: boolean;
}

function ExtractedParamsCard({ input, confidence, onConfirm, isLoading }: ExtractedParamsCardProps) {
  const { t } = useTranslation();

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? t('chat.yes') : t('chat.no');
    return String(value).replace(/_/g, ' ');
  };

  const fields = [
    { key: 'involved_malleoli', label: t('chat.fields.involvedMalleoli') },
    { key: 'posterior_fracture_type', label: t('chat.fields.posteriorType') },
    { key: 'medial_morphology', label: t('chat.fields.medialMorphology') },
    { key: 'fibular_level', label: t('chat.fields.fibularLevel') },
    { key: 'lateral_morphology', label: t('chat.fields.lateralMorphology') },
    { key: 'suprasindesmal_type', label: t('chat.fields.suprasindesmalType') },
  ];

  const activeFields = fields.filter(f => input[f.key as keyof FractureInput] !== undefined);

  return (
    <Card className="overflow-hidden glass-card border-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-accent-vibrant" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center glow-sm">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{t('chat.extractedParams')}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{t('chat.extractedParamsSubtitle', 'Review the detected fracture characteristics')}</p>
            </div>
          </div>
          {confidence !== undefined && (
            <Badge
              variant={confidence >= 0.7 ? 'default' : 'secondary'}
              className="px-3 py-1 text-sm"
            >
              {Math.round(confidence * 100)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {activeFields.map(({ key, label }, index) => (
            <div
              key={key}
              className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-left-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium capitalize text-foreground">
                {formatValue(input[key as keyof FractureInput])}
              </span>
            </div>
          ))}
        </div>

        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full mt-4 h-12 rounded-xl shadow-sm hover-glow text-base"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Check className="h-5 w-5 mr-2" />
          )}
          {t('chat.confirmClassify')}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ClarificationCardProps {
  clarifications: Clarification[];
  onAnswer: (field: string, value: string) => void;
  isLoading: boolean;
}

function ClarificationCard({ clarifications, onAnswer, isLoading }: ClarificationCardProps) {
  const { t } = useTranslation();

  const handleOptionClick = (field: string, option: string) => {
    if (isLoading) return;
    onAnswer(field, option);
  };

  return (
    <Card className="overflow-hidden glass-card border-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{t('chat.clarification.title')}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('chat.clarification.subtitle')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {clarifications.map((clarification, index) => (
          <div
            key={clarification.field}
            className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <p className="text-sm font-medium text-foreground">
              {clarification.question}
            </p>
            <div className="flex flex-wrap gap-2">
              {clarification.options?.map((option, optionIndex) => (
                <Button
                  key={optionIndex}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleOptionClick(clarification.field, option)}
                  className="text-sm h-auto py-2.5 px-4 rounded-xl whitespace-normal text-left justify-start hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-200 hover-glow"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">{t('chat.thinking')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
