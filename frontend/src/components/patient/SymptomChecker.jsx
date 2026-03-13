import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, X, Send, AlertTriangle } from 'lucide-react';

export default function SymptomChecker() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const SYSTEM_PROMPT = `You are DocNest's AI Symptom Checker. Your only job is to help users
identify which type of medical specialist they should consult based on
the symptoms they describe.

Always respond in this exact JSON format and nothing else:
{
  "possibleConditions": ["condition 1", "condition 2"],
  "recommendedSpecialty": "Specialty Name",
  "specialtyReason": "One sentence explaining why this specialty",
  "urgencyLevel": "routine" | "soon" | "urgent",
  "urgencyAdvice": "One sentence about how quickly to seek care",
  "disclaimer": "This is not a medical diagnosis. Please consult a doctor."
}

The recommendedSpecialty must be exactly one of these values:
General Medicine, Cardiology, Orthopedics, Neurology, Dermatology,
Pediatrics, Gynecology, General Surgery, ENT, Oncology, Nephrology,
Ophthalmology, Psychiatry, Urology, Endocrinology, Gastroenterology,
Pulmonology.

urgencyLevel rules:
  routine = can wait days to weeks for an appointment
  soon = should see a doctor within 1-3 days
  urgent = should seek care today or go to emergency

Never diagnose definitively. Never recommend specific medications.
Never cause alarm. Be calm, clear, and helpful.
If symptoms are unclear or too vague, ask one clarifying question
instead of guessing — still respond in JSON with:
{
  "clarifyingQuestion": "Your question here"
}
If the user describes a life-threatening emergency (chest pain + sweating,
difficulty breathing, stroke symptoms, severe bleeding), respond with:
{
  "emergency": true,
  "message": "Please call 108 immediately or go to the nearest emergency room."
}`;

  async function callSymptomAI(userMessage) {
    setIsLoading(true);
    setHasError(false);
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMessage, parsed: null }];
    setMessages(newMessages);
    setInputText('');

    // Prepare history for Gemini
    // Gemini roles: 'user' and 'model' (assistant)
    const historyPayload = newMessages.slice(-6).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.parsed ? JSON.stringify(m.parsed) : m.content }]
    }));

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Missing VITE_GEMINI_API_KEY');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: historyPayload,
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API Error:', errorData);
        throw new Error(`API error: ${response.status} ${errorData.error?.message || ''}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      let parsed = null;
      try {
        parsed = JSON.parse(rawText);
      } catch (e) {
        console.warn("Could not parse AI response as JSON", rawText);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: rawText,
        parsed: parsed
      }]);

    } catch (error) {
      console.error(error);
      setHasError(true);
      const errorMsg = error.message.includes('balance') || error.message.includes('429') 
        ? "The AI service is currently busy or out of free credits. Please try again in 1 minute."
        : "Sorry, I couldn't connect right now. Please check the VITE_GEMINI_API_KEY.";

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg,
        parsed: null
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    callSymptomAI(inputText.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderAssistantMessage = (msg, index) => {
    if (!msg.parsed) {
      return (
        <div key={index} className="self-start bg-white border border-[#C8EEE8] rounded-[16px_16px_16px_4px] p-3 max-w-[85%] text-[13px] shadow-sm mb-3">
          {msg.content}
        </div>
      );
    }

    const { parsed } = msg;

    if (parsed.emergency) {
      return (
        <div key={index} className="self-start bg-[#FFF0F0] border border-[#E53E3E] rounded-[16px_16px_16px_4px] p-3 max-w-[85%] text-[13px] shadow-sm mb-3 w-full">
          <div className="flex items-center gap-2 mb-2 text-[#E53E3E]">
            <AlertTriangle size={20} />
            <strong className="text-[14px]">Emergency — Call 108</strong>
          </div>
          <p className="mb-3 text-[#100A50]">{parsed.message}</p>
          <a href="tel:108" className="block text-center bg-[#E53E3E] text-white py-2 rounded-lg font-bold w-full">
            Call 108
          </a>
        </div>
      );
    }

    if (parsed.clarifyingQuestion) {
      return (
        <div key={index} className="self-start bg-white border border-[#C8EEE8] rounded-[16px_16px_16px_4px] p-3 max-w-[85%] text-[13px] shadow-sm mb-3">
          {parsed.clarifyingQuestion}
        </div>
      );
    }

    // Normal structured response
    const urgencyColors = {
      routine: 'bg-green-100 text-green-700',
      soon: 'bg-amber-100 text-amber-700',
      urgent: 'bg-red-100 text-red-700',
    };
    
    const urgencyLabels = {
      routine: 'Routine visit',
      soon: 'See doctor soon',
      urgent: 'Seek care today',
    };

    const colorClass = urgencyColors[parsed.urgencyLevel] || urgencyColors.routine;
    const labelText = urgencyLabels[parsed.urgencyLevel] || 'Routine visit';

    return (
      <div key={index} className="self-start bg-white border border-[#C8EEE8] rounded-[16px_16px_16px_4px] p-3 max-w-[85%] text-[13px] shadow-sm mb-3 w-full">
        {/* Urgency */}
        <div className="mb-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${colorClass} mb-1`}>
            {labelText}
          </span>
          {parsed.urgencyAdvice && <p className="text-[11px] text-gray-500 leading-tight">{parsed.urgencyAdvice}</p>}
        </div>

        {/* Possible Conditions */}
        {parsed.possibleConditions && parsed.possibleConditions.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-gray-400 font-bold mb-1">POSSIBLE CONDITIONS</p>
            <div className="flex flex-wrap gap-1">
              {parsed.possibleConditions.map((cond, i) => (
                <span key={i} className="bg-[#C8EEE8] text-[#100A50] text-[11px] px-2 py-0.5 rounded-full font-medium">
                  {cond}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Specialty */}
        {parsed.recommendedSpecialty && (
          <div className="mb-3">
            <p className="text-[10px] text-gray-400 font-bold mb-1">SEE A SPECIALIST</p>
            <p className="font-bold text-[14px] text-[#100A50] leading-tight">{parsed.recommendedSpecialty}</p>
            {parsed.specialtyReason && <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{parsed.specialtyReason}</p>}
          </div>
        )}

        {/* Action Button */}
        {parsed.recommendedSpecialty && (
          <button 
            onClick={() => {
              setIsOpen(false);
              navigate(`/hospitals?specialty=${encodeURIComponent(parsed.recommendedSpecialty)}`);
            }}
            className="w-full bg-[#6060C0] text-white text-[11px] font-bold py-2 rounded-lg mt-1 mb-3 transition-opacity hover:opacity-90">
            Find this specialist near you
          </button>
        )}

        {/* Disclaimer */}
        {parsed.disclaimer && (
          <p className="text-[9px] text-gray-400 italic leading-tight border-t border-gray-100 pt-2">
            {parsed.disclaimer}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="AI Symptom Checker"
        className={`fixed bottom-[24px] right-[24px] w-[52px] h-[52px] rounded-full bg-[#6060C0] flex items-center justify-center text-white shadow-xl z-[1000] transition-transform hover:scale-105 ${!isOpen ? 'animate-[pulse-scale_3s_ease-in-out_infinite]' : ''}`}
      >
        {isOpen ? <X size={24} /> : <Stethoscope size={24} />}
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-scale {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes typing-dot {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}} />

      {isOpen && (
        <div 
          className="fixed z-[999] bg-white border border-[#C8EEE8] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden w-[360px] h-[480px] bottom-[88px] right-[24px] max-[480px]:w-[calc(100vw-32px)] max-[480px]:right-[16px] max-[480px]:h-[70vh]"
          style={{ animation: 'slide-up 200ms ease-out forwards' }}
        >
          <div className="bg-[#100A50] px-[16px] py-[14px] shrink-0">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-2 text-white">
                <Stethoscope size={16} />
                <span className="font-bold text-[13px]">AI Symptom Checker</span>
              </div>
              <span className="bg-[#4EB0C8] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Beta</span>
            </div>
            <p className="text-[#A8E4DC] text-[10px]">Describe your symptoms — I'll suggest a specialist</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-[#F0FAFA] flex flex-col">
            {messages.length === 0 && (
              <div className="self-start bg-white border border-[#C8EEE8] rounded-[16px_16px_16px_4px] p-[14px] max-w-[85%] text-[13px] shadow-sm mb-3 text-[#100A50]">
                Hello! I'm DocNest's AI Symptom Checker.<br/><br/>
                Tell me what symptoms you're experiencing and I'll suggest which type of doctor you should consult.<br/><br/>
                <span className="text-gray-500 italic">For example: 'I have chest pain and shortness of breath' or 'My knee has been swollen for 3 days'</span>
              </div>
            )}

            {messages.map((msg, idx) => (
              msg.role === 'user' ? (
                <div key={idx} className="self-end bg-[#6060C0] text-white rounded-[16px_16px_4px_16px] px-[14px] py-[10px] max-w-[80%] text-[13px] shadow-sm mb-3">
                  {msg.content}
                </div>
              ) : (
                renderAssistantMessage(msg, idx)
              )
            ))}

            {isLoading && (
              <div className="self-start bg-white border border-[#C8EEE8] rounded-[16px_16px_16px_4px] p-[14px] max-w-[85%] shadow-sm mb-3 flex gap-1 items-center h-[42px]">
                <div className="w-1.5 h-1.5 bg-[#4EB0C8] rounded-full animate-[typing-dot_1.4s_infinite]" style={{ animationDelay: '0s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#4EB0C8] rounded-full animate-[typing-dot_1.4s_infinite]" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1.5 h-1.5 bg-[#4EB0C8] rounded-full animate-[typing-dot_1.4s_infinite]" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-[#C8EEE8] p-[10px_12px] flex gap-[8px] shrink-0">
            <textarea
              className="flex-1 border border-[#C8EEE8] rounded-[12px] px-[12px] py-[8px] text-[13px] resize-none focus:outline-none focus:border-[#4EB0C8]"
              rows={2}
              placeholder="Describe your symptoms..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className="w-[36px] h-[36px] rounded-full bg-[#6060C0] flex items-center justify-center text-white shrink-0 self-end disabled:opacity-50 transition-opacity"
            >
              <Send size={16} className={inputText.trim() && !isLoading ? "-ml-0.5 mt-0.5" : ""} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
