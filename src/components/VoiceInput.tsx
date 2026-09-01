import React, { useRef } from "react";
import { VoiceButton } from "./VoiceButton";

export interface VoiceInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { value: string; name?: string } }) => void;
  uppercase?: boolean;
  containerClassName?: string;
  onVoiceInput?: (newVal: string) => void;
  appendMode?: boolean; // If true and value exists, appends with space; otherwise replaces.
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  value,
  onChange,
  uppercase = false,
  containerClassName = "",
  className = "",
  placeholder = "",
  disabled = false,
  appendMode = false,
  onVoiceInput,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTranscript = (spokenText: string) => {
    let finalSpoken = uppercase ? spokenText.toUpperCase() : spokenText;
    let newValue = finalSpoken;

    if (appendMode && value && value.trim()) {
      newValue = `${value.trim()} ${finalSpoken}`;
    }

    if (uppercase) {
      newValue = newValue.toUpperCase();
    }

    // Trigger synthetic or custom onChange
    onChange({ target: { value: newValue, name: props.name } });
    if (onVoiceInput) {
      onVoiceInput(newValue);
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (uppercase) {
      val = val.toUpperCase();
    }
    onChange({ ...e, target: { ...e.target, value: val } });
  };

  return (
    <div className={`relative flex items-center w-full ${containerClassName}`}>
      <input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pr-9 ${uppercase ? "uppercase" : ""} ${className}`}
        {...props}
      />
      <div className="absolute right-2 flex items-center z-10">
        <VoiceButton
          onTranscript={handleTranscript}
          uppercase={uppercase}
          disabled={disabled}
          size="sm"
          fieldRef={inputRef}
        />
      </div>
    </div>
  );
};
