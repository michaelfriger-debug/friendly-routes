import { useState } from "react";

interface VoiceInputProps {
  onResult: (text: string) => void;
}

const VoiceInput = ({ onResult }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);

  const startVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("המכשיר לא תומך בדיבור");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "he-IL";
    recognition.interimResults = false;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      console.log("🎤 זוהה:", text);
      onResult(text);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={startVoiceInput}
      className="rounded-xl border border-input bg-background px-3 py-3 text-lg hover:bg-muted/50 active:bg-muted transition-colors"
      title="דבר כתובת"
    >
      {isListening ? "🎤..." : "🎤"}
    </button>
  );
};

export default VoiceInput;
