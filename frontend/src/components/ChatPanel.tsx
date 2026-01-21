import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Check, RotateCcw, Bot, User, Sparkles, MessageSquare, HelpCircle, FlaskConical } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { useChat, type ChatMessage } from '../hooks/useChat';
import { ClassificationResult as ClassificationResultComponent } from './ClassificationResult';
import { ChatFeedback } from './ChatFeedback';
import type { FractureInput, ClassificationResult, Clarification } from '../types/fracture';

interface ChatPanelProps {
  onClassificationComplete?: (result: ClassificationResult, input: FractureInput) => void;
}

export function ChatPanel({ onClassificationComplete }: ChatPanelProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    reset,
  } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const text = inputValue;
    setInputValue('');
    await sendMessage(text);
  };

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
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Experimental Notice */}
      <div className="mx-4 mt-4 mb-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <FlaskConical className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                {t('chat.experimental.badge')}
              </Badge>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {t('chat.experimental.notice')}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 min-h-[400px] max-h-[600px]">
        {messages.length === 0 ? (
          <WelcomeScreen
            examples={exampleDescriptions}
            onSelectExample={setInputValue}
          />
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}

        {isLoading && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Clarification Questions Card */}
      {clarifications && clarifications.length > 0 && !classification && (
        <ClarificationCard
          clarifications={clarifications}
          onAnswer={answerClarification}
          isLoading={isLoading}
        />
      )}

      {/* Extracted Parameters Card */}
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
        <div className="p-4 border-t bg-gradient-to-b from-background to-muted/20 space-y-4">
          <ClassificationResultComponent result={classification} />
          <ChatFeedback onSubmit={submitFeedback} submitted={feedbackSubmitted} />
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-start gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.inputPlaceholder')}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-[11px] text-sm leading-[22px] ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] max-h-[120px] shadow-sm"
            rows={1}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="h-[44px] px-4 rounded-xl shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
          {messages.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              className="h-[44px] px-4 rounded-xl shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
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
    <div className="flex flex-col items-center justify-center py-8 px-4">
      {/* Icon and Title */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <MessageSquare className="w-8 h-8 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t('chat.placeholder')}
      </h3>

      <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
        {t('chat.examples.title')}
      </p>

      {/* Example Cards */}
      <div className="w-full space-y-2">
        {examples.map((example, i) => (
          <button
            key={i}
            onClick={() => onSelectExample(example)}
            className="w-full text-left text-sm p-4 rounded-xl border border-border/50 bg-card hover:bg-accent hover:border-accent transition-all duration-200 group shadow-sm hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <span className="text-xs font-medium text-primary">{i + 1}</span>
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors leading-relaxed">
                "{example}"
              </span>
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
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
          </div>
          <span className="text-sm text-muted-foreground ml-1">{t('chat.thinking')}</span>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-gradient-to-br from-primary/20 to-primary/10'
      }`}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message */}
      <div
        className={`max-w-[75%] px-4 py-3 shadow-sm ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
            : 'bg-muted rounded-2xl rounded-tl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {message.confidence !== undefined && message.confidence > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={message.confidence >= 0.7 ? 'default' : 'secondary'}
              className="text-xs"
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
    <Card className="mx-4 mb-4 overflow-hidden shadow-lg border-0">
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">{t('chat.extractedParams')}</CardTitle>
          </div>
          {confidence !== undefined && (
            <Badge
              variant={confidence >= 0.7 ? 'default' : 'secondary'}
              className="px-3 py-1"
            >
              {Math.round(confidence * 100)}%
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {activeFields.map(({ key, label }) => (
            <div
              key={key}
              className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
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
          className="w-full mt-4 h-11 rounded-xl shadow-sm"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
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
    <Card className="mx-4 mb-4 overflow-hidden shadow-lg border-0">
      {/* Gradient accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <HelpCircle className="w-4 h-4 text-amber-600" />
          </div>
          <CardTitle className="text-base font-semibold">{t('chat.clarification.title')}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t('chat.clarification.subtitle')}
        </p>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {clarifications.map((clarification, index) => (
          <div key={`${clarification.field}-${index}`} className="space-y-2">
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
                  className="text-xs h-auto py-2 px-3 whitespace-normal text-left justify-start hover:bg-primary/10 hover:border-primary/50 transition-colors"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground ml-2">{t('chat.thinking')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
