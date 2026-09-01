import React, { useRef } from "react";
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

export const VoiceTextArea: React.FC<VoiceTextAreaProps> = ({
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
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pr-9 ${uppercase ? "uppercase" : ""} ${className}`}
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
};
