import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';

export type MessagePart = {
  text?: string;
  functionCall?: {
    name: string;
    args: any;
  };
  functionResponse?: {
    name: string;
    response: any;
  };
};

export type Message = {
  role: 'user' | 'model';
  parts: MessagePart[];
};

interface ChatInterfaceProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isGeneratingDesign: boolean;
  onRedesignRequest: (style: string, prompt?: string) => Promise<void>;
}

export function ChatInterface({ messages, setMessages, isGeneratingDesign, onRedesignRequest }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isGeneratingDesign]);

  const sendMessage = async (newMessages: Message[]) => {
    setIsTyping(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      const responseContent = data.response; // { role: 'model', parts: [...] }
      if (!responseContent || !responseContent.parts) return;

      const newModelMsg: Message = { role: 'model', parts: responseContent.parts };
      
      const functionCallPart = responseContent.parts.find((p: any) => p.functionCall);
      
      if (functionCallPart) {
        // Model wants to call a function
        const call = functionCallPart.functionCall;
        
        // Add the model's function call message to the chat
        setMessages((prev) => [...prev, newModelMsg]);

        if (call.name === 'redesignRoom') {
          const { style, prompt } = call.args;
          
          // Trigger redesign
          await onRedesignRequest(style, prompt);
          
          // After redesign finishes, send function response back to model
          const funcResponseMsg: Message = {
            role: 'user', // According to genai SDK, functionResponse is typically sent as user role
            parts: [{
              functionResponse: {
                name: 'redesignRoom',
                response: { status: 'success', message: 'Room has been redesigned successfully.' }
              }
            }]
          };
          
          const updatedMessages = [...newMessages, newModelMsg, funcResponseMsg];
          setMessages(updatedMessages);
          
          // Let the model reply to the function response
          await sendMessage(updatedMessages);
        }
      } else {
        // Normal text response
        setMessages((prev) => [...prev, newModelMsg]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { role: 'user', parts: [{ text: input }] };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInput('');
    
    await sendMessage(newMessages);
  };

  return (
    <div className="flex flex-col h-[500px] border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <h3 className="font-medium text-gray-800">Design Consultant</h3>
        <p className="text-xs text-gray-500">Ask for changes, color recommendations, or shoppable links.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.filter(m => m.parts.some(p => p.text)).map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              {msg.parts.map((part, j) => {
                if (part.text) {
                  return (
                    <div key={j} className={`markdown-body ${msg.role === 'user' ? '!text-white' : ''}`}>
                      <Markdown>{part.text}</Markdown>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-gray-100 rounded-2xl rounded-bl-none px-5 py-4">
               <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isGeneratingDesign ? "Waiting for design to finish..." : "e.g., Make the rug blue..."}
            disabled={isTyping || isGeneratingDesign}
            className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping || isGeneratingDesign}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
