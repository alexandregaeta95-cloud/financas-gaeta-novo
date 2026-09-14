import React, { useRef, useEffect } from "react";
import { VoiceButton } from "./VoiceButton";

export interface VoiceTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement> | { target: { value: string; name?: string } }) => void;
  uppercase?: boolean;
  containerClassName?: string;
  onVoiceInput?: (newVal: string) => void;
  appendMode?: boolean;
}

export const VoiceTextArea = React.forwardRef<HTMLTextAreaElement, VoiceTextAreaProps>(({
  value,
  onChange,
  uppercase = false,
  containerClassName = "",
  className = "",
  placeholder = "",
  disabled = false,
  appendMode = true,
  rows = 3,
  onVoiceInput,
  ...props
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      const MAX_HEIGHT = 180; // limite em pixels, depois disso rola por dentro
      textareaRef.current.style.height = "auto";
      const novaAltura = Math.min(textareaRef.current.scrollHeight, MAX_HEIGHT);
      textareaRef.current.style.height = `${novaAltura}px`;
      textareaRef.current.style.overflowY = textareaRef.current.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
    }
  }, [value]);

  const handleTranscript = (spokenText: string) => {
    let finalSpoken = uppercase ? spokenText.toUpperCase() : spokenText;
    let newValue = finalSpoken;

    if (appendMode && value && value.trim()) {
      newValue = `${value.trim()} ${finalSpoken}`;
    }

    if (uppercase) {
      newValue = newValue.toUpperCase();
    }

    onChange({ target: { value: newValue, name: props.name } });
    if (onVoiceInput) {
      onVoiceInput(newValue);
    }

    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let val = e.target.value;
    if (uppercase) {
      val = val.toUpperCase();
    }
    onChange({ ...e, target: { ...e.target, value: val } });
  };

  return (
    <div className={`relative w-full ${containerClassName}`}>
      <textarea
        ref={(el) => {
          (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
        }}
        rows={rows}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pr-9 overflow-hidden ${uppercase ? "uppercase" : ""} ${className}`}
        {...props}
      />
      <div className="absolute right-2 top-2 z-10">
        <VoiceButton
          onTranscript={handleTranscript}
          uppercase={uppercase}
          disabled={disabled}
          size="sm"
          fieldRef={textareaRef}
        />
      </div>
    </div>
  );
});
